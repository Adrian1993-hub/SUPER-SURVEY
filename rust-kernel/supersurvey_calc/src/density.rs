//! Density utilities — cross-base (API/SG 60/60 °F ↔ ρ15) and cross-temperature
//! (ρ observed @ t ↔ ρ15) conversions, plus parcel blending.
//!
//! This is the correction path that `conversions.rs` deliberately deferred
//! ("Use API MPMS 11.x correction path in later sprint"): mass density and
//! API/SG live on different measurement bases (15 °C vs 60 °F), so bridging
//! them needs the product's own thermal expansion — not a constant factor.
//!
//! Method (equation-exact, consistent with our validated D1250-80 tables):
//! - The same VCF that corrects volumes corrects densities:
//!   `ρ_obs(t) = ρ15 × VCF(ρ15, t)` (mass is invariant).
//! - SG 60/60°F → density in vacuum @ 60 °F:
//!   `ρ60 = SG × WATER_DENSITY_60F` (999.016 kg/m³, API MPMS 11 convention).
//! - API ↔ SG is exact algebra (reused from `conversions`).
//! - The inverse (observed → ρ15) has no closed form; we solve
//!   `x = ρ_obs / VCF(x, t)`
//!   by fixed-point iteration. The map is a strong contraction in-domain
//!   (|d VCF/dρ|·ρ ≪ 1), so it converges in a handful of steps; the iteration
//!   may cross a 54B product-group boundary and still settles on the fixed
//!   point of the final group.
//!
//! Caveats (documented, deliberate):
//! - Printed Table 3/21 conversions of D1250-80 carry internal roundings; the
//!   equation result can differ by 1 unit in the last decimal (same policy as
//!   `astm.rs`).
//! - Blending is volume-weighted at 15 °C (mass-conserving, ideal mixing).
//!   Real blends can shrink slightly; bunker paperwork ignores that, so do we.
//! - Only the FINAL value is rounded; `*_unrounded` fields carry full precision.

use crate::astm::{table_54a_vcf, table_54b_vcf};
use crate::bqs::AstmTable;
use crate::conversions::{api_to_sg, sg_to_api};
use crate::decimal::DecimalValue;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, SystemRoundingRule};
use crate::trace::{CalculationScope, CalculationTrace, TraceStep};
use crate::units::{DensityUnit, TemperatureUnit};
use crate::value::{TemperatureValue, UnitValue};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;

/// Density of pure water at 60 °F in vacuum (kg/m³), API MPMS 11 convention.
pub const WATER_DENSITY_60F_KG_M3: Decimal = dec!(999.016);

/// Fixed-point tolerance in kg/m³ (far below any reported decimal).
const CONVERGENCE_TOLERANCE_KG_M3: Decimal = dec!(0.000000001);
const MAX_ITERATIONS: u32 = 50;

fn vcf_unrounded(
    table: AstmTable,
    rho15_kg_m3: Decimal,
    temperature: &TemperatureValue,
) -> KernelResult<Decimal> {
    let density = UnitValue::new(rho15_kg_m3, DensityUnit::KgPerCubicMeter);
    let computation = match table {
        AstmTable::Table54A => table_54a_vcf(&density, temperature, 4, SystemRoundingRule::HalfUp)?,
        AstmTable::Table54B => table_54b_vcf(&density, temperature, 4, SystemRoundingRule::HalfUp)?,
    };
    Ok(computation.vcf_unrounded)
}

/// ρ observed at `temperature` from ρ15 (both kg/m³): ρ_obs = ρ15 × VCF(ρ15, t).
pub fn observed_density_from_rho15(
    rho15_kg_m3: Decimal,
    temperature: &TemperatureValue,
    table: AstmTable,
) -> KernelResult<Decimal> {
    Ok(rho15_kg_m3 * vcf_unrounded(table, rho15_kg_m3, temperature)?)
}

/// ρ15 (kg/m³) from a density observed at `temperature` (e.g. a lab figure
/// reported @ 20 °C, or a 60 °F base). Fixed-point inversion of the VCF map.
pub fn rho15_from_observed_density(
    rho_observed_kg_m3: Decimal,
    temperature: &TemperatureValue,
    table: AstmTable,
) -> KernelResult<Decimal> {
    if rho_observed_kg_m3 <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Observed density must be positive.",
            "value",
        ));
    }
    let mut x = rho_observed_kg_m3;
    for _ in 0..MAX_ITERATIONS {
        let next = rho_observed_kg_m3 / vcf_unrounded(table, x, temperature)?;
        if (next - x).abs() < CONVERGENCE_TOLERANCE_KG_M3 {
            return Ok(next);
        }
        x = next;
    }
    Err(KernelError::with_field(
        KernelErrorCode::OutOfTableRange,
        format!(
            "rho15 inversion did not converge after {MAX_ITERATIONS} iterations \
             (observed {rho_observed_kg_m3} kg/m3 — input likely at a table boundary)."
        ),
        "value",
    ))
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ApiConversionComputation {
    /// API gravity (unrounded).
    #[serde(with = "rust_decimal::serde::str")]
    pub api: Decimal,
    /// SG 60/60 °F (unrounded).
    #[serde(with = "rust_decimal::serde::str")]
    pub sg60: Decimal,
    /// Density in vacuum @ 60 °F, kg/m³ (unrounded).
    #[serde(with = "rust_decimal::serde::str")]
    pub rho60_kg_m3: Decimal,
    /// Density @ 15 °C, kg/m³ (unrounded).
    #[serde(with = "rust_decimal::serde::str")]
    pub rho15_kg_m3: Decimal,
}

fn temperature_60f() -> TemperatureValue {
    UnitValue::new(dec!(60), TemperatureUnit::Fahrenheit)
}

/// API gravity → ρ15. Route: API → SG 60/60 → ρ60 (× water@60°F) → ρ15
/// (invert VCF at 60 °F).
pub fn rho15_from_api(api: Decimal, table: AstmTable) -> KernelResult<ApiConversionComputation> {
    let sg60 = api_to_sg(api)?;
    if sg60 <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            format!("API {api} implies a non-positive SG."),
            "value",
        ));
    }
    let rho60 = sg60 * WATER_DENSITY_60F_KG_M3;
    let rho15 = rho15_from_observed_density(rho60, &temperature_60f(), table)?;
    Ok(ApiConversionComputation {
        api,
        sg60,
        rho60_kg_m3: rho60,
        rho15_kg_m3: rho15,
    })
}

/// ρ15 → API gravity. Route: ρ15 → ρ60 (× VCF at 60 °F) → SG 60/60 → API.
pub fn api_from_rho15(
    rho15_kg_m3: Decimal,
    table: AstmTable,
) -> KernelResult<ApiConversionComputation> {
    if rho15_kg_m3 <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Density @ 15 C must be positive.",
            "value",
        ));
    }
    let rho60 = observed_density_from_rho15(rho15_kg_m3, &temperature_60f(), table)?;
    let sg60 = rho60 / WATER_DENSITY_60F_KG_M3;
    let api = sg_to_api(sg60)?;
    Ok(ApiConversionComputation {
        api,
        sg60,
        rho60_kg_m3: rho60,
        rho15_kg_m3,
    })
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BlendParcel {
    /// Volume @ 15 °C, m³.
    pub volume_m3: Decimal,
    /// Density @ 15 °C, kg/m³.
    pub rho15_kg_m3: Decimal,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BlendComputation {
    #[serde(with = "rust_decimal::serde::str")]
    pub total_volume_m3: Decimal,
    /// Total mass in vacuum, kg (Σ Vᵢ·ρᵢ).
    #[serde(with = "rust_decimal::serde::str")]
    pub total_mass_kg: Decimal,
    /// Blend density @ 15 °C, kg/m³ (mass / volume — unrounded).
    #[serde(with = "rust_decimal::serde::str")]
    pub rho15_kg_m3: Decimal,
}

/// Volume-weighted blend density at 15 °C (mass-conserving, ideal mixing).
pub fn blend_density(parcels: &[BlendParcel]) -> KernelResult<BlendComputation> {
    if parcels.is_empty() {
        return Err(KernelError::with_field(
            KernelErrorCode::ComparisonInputInvalid,
            "Blend requires at least one parcel.",
            "parcels",
        ));
    }
    let mut total_volume = dec!(0);
    let mut total_mass = dec!(0);
    for (index, parcel) in parcels.iter().enumerate() {
        if parcel.volume_m3 <= dec!(0) {
            return Err(KernelError::with_field(
                KernelErrorCode::NegativeQuantityNotAllowed,
                format!("Parcel {} volume must be positive.", index + 1),
                "parcels",
            ));
        }
        if parcel.rho15_kg_m3 <= dec!(0) {
            return Err(KernelError::with_field(
                KernelErrorCode::NegativeQuantityNotAllowed,
                format!("Parcel {} density must be positive.", index + 1),
                "parcels",
            ));
        }
        total_volume += parcel.volume_m3;
        total_mass += parcel.volume_m3 * parcel.rho15_kg_m3;
    }
    Ok(BlendComputation {
        total_volume_m3: total_volume,
        total_mass_kg: total_mass,
        rho15_kg_m3: total_mass / total_volume,
    })
}

// ---------------------------------------------------------------------------
// DTO boundary (string-in / string-out, same contract style as `bqs`).
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DensityOperation {
    ApiToRho15,
    Rho15ToApi,
    ObservedToRho15,
    Rho15ToObserved,
    Blend,
}

impl FromStr for DensityOperation {
    type Err = KernelError;
    fn from_str(input: &str) -> KernelResult<Self> {
        match input.trim().to_ascii_uppercase().as_str() {
            "API_TO_RHO15" => Ok(Self::ApiToRho15),
            "RHO15_TO_API" => Ok(Self::Rho15ToApi),
            "OBSERVED_TO_RHO15" => Ok(Self::ObservedToRho15),
            "RHO15_TO_OBSERVED" => Ok(Self::Rho15ToObserved),
            "BLEND" => Ok(Self::Blend),
            _ => Err(KernelError::with_field(
                KernelErrorCode::UnsupportedConversion,
                format!("Unsupported density operation: {input}"),
                "operation",
            )),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlendParcelDTO {
    /// Volume @ 15 °C (m³), decimal string.
    pub volume_value: String,
    /// Density @ 15 °C, decimal string in `density15_unit` of the request.
    pub density15_value: String,
}

fn default_density_unit() -> String {
    "KG_L".to_string()
}
fn default_temperature_unit() -> String {
    "C".to_string()
}
fn default_astm_table() -> String {
    "54B".to_string()
}
fn default_scope() -> String {
    "LIVE".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DensityToolRequestDTO {
    /// API_TO_RHO15 | RHO15_TO_API | OBSERVED_TO_RHO15 | RHO15_TO_OBSERVED | BLEND
    pub operation: String,
    /// Principal input: API gravity, or a density in `density15_unit`.
    #[serde(default)]
    pub value: Option<String>,
    /// Unit for density inputs/outputs: KG_L (default) or KG_M3.
    #[serde(default = "default_density_unit")]
    pub density15_unit: String,
    /// Observation temperature (OBSERVED_TO_RHO15 / RHO15_TO_OBSERVED).
    #[serde(default)]
    pub temperature_value: Option<String>,
    #[serde(default = "default_temperature_unit")]
    pub temperature_unit: String,
    #[serde(default = "default_astm_table")]
    pub astm_table: String,
    #[serde(default)]
    pub parcels: Vec<BlendParcelDTO>,
    #[serde(default = "default_scope")]
    pub calculation_scope: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DensityToolResponseDTO {
    pub success: bool,
    pub operation: Option<String>,
    /// API gravity, 1 dp.
    pub api: Option<String>,
    /// SG 60/60 °F, 4 dp.
    pub sg60: Option<String>,
    /// ρ15 in kg/L, 4 dp (worksheet unit).
    pub rho15_kg_l: Option<String>,
    /// ρ15 in kg/m³, 1 dp.
    pub rho15_kg_m3: Option<String>,
    /// ρ15 in kg/m³, unrounded (for chains).
    pub rho15_kg_m3_unrounded: Option<String>,
    /// Observed density (RHO15_TO_OBSERVED) in kg/L, 4 dp.
    pub observed_kg_l: Option<String>,
    /// Blend totals.
    pub total_volume_m3: Option<String>,
    pub total_mt_vacuum: Option<String>,
    pub trace_json: Option<serde_json::Value>,
    pub errors: Option<Vec<KernelError>>,
}

impl DensityToolResponseDTO {
    fn failure(errors: Vec<KernelError>) -> Self {
        Self {
            success: false,
            operation: None,
            api: None,
            sg60: None,
            rho15_kg_l: None,
            rho15_kg_m3: None,
            rho15_kg_m3_unrounded: None,
            observed_kg_l: None,
            total_volume_m3: None,
            total_mt_vacuum: None,
            trace_json: None,
            errors: Some(errors),
        }
    }
}

/// Parse a density string in the request's unit into kg/m³.
fn parse_density_kg_m3(raw: &str, unit: &str, field: &'static str) -> KernelResult<Decimal> {
    let value = DecimalValue::parse(raw, field)?.value;
    let unit = DensityUnit::from_str(unit)?;
    match unit {
        DensityUnit::KgPerCubicMeter => Ok(value),
        DensityUnit::KgPerLitre => Ok(value * dec!(1000)),
        _ => Err(KernelError::with_field(
            KernelErrorCode::UnsupportedConversion,
            "Density utilities take mass density (KG_L or KG_M3); for API use the API operations.",
            "density15_unit",
        )),
    }
}

const ROUND: SystemRoundingRule = SystemRoundingRule::HalfUp;
/// Round and pad to a fixed scale ("0.92" → "0.9200") so the IPC strings are
/// column-stable for the UI and the QA fixtures.
fn fmt(value: Decimal, decimals: u32) -> String {
    let mut rounded = round_decimal(value, decimals, ROUND);
    rounded.rescale(decimals);
    rounded.to_string()
}

impl DensityToolRequestDTO {
    pub fn calculate(&self) -> DensityToolResponseDTO {
        match self.calculate_inner() {
            Ok(response) => response,
            Err(error) => DensityToolResponseDTO::failure(vec![error]),
        }
    }

    fn required_value(&self) -> KernelResult<&str> {
        self.value.as_deref().ok_or_else(|| {
            KernelError::with_field(
                KernelErrorCode::ComparisonInputInvalid,
                "Missing `value` for this operation.",
                "value",
            )
        })
    }

    fn required_temperature(&self) -> KernelResult<TemperatureValue> {
        let raw = self.temperature_value.as_deref().ok_or_else(|| {
            KernelError::with_field(
                KernelErrorCode::ComparisonInputInvalid,
                "Missing `temperature_value` for this operation.",
                "temperature_value",
            )
        })?;
        let value = DecimalValue::parse(raw, "temperature_value")?.value;
        let unit = TemperatureUnit::from_str(&self.temperature_unit)?;
        Ok(UnitValue::new(value, unit))
    }

    fn calculate_inner(&self) -> KernelResult<DensityToolResponseDTO> {
        let operation = DensityOperation::from_str(&self.operation)?;
        let table = AstmTable::from_str(&self.astm_table)?;
        let scope = CalculationScope::from_str(&self.calculation_scope)?;

        let mut response = DensityToolResponseDTO {
            success: true,
            operation: Some(self.operation.trim().to_ascii_uppercase()),
            api: None,
            sg60: None,
            rho15_kg_l: None,
            rho15_kg_m3: None,
            rho15_kg_m3_unrounded: None,
            observed_kg_l: None,
            total_volume_m3: None,
            total_mt_vacuum: None,
            trace_json: None,
            errors: None,
        };
        let mut steps: Vec<TraceStep> = Vec::new();

        match operation {
            DensityOperation::ApiToRho15 => {
                let api = DecimalValue::parse(self.required_value()?, "value")?.value;
                let computation = rho15_from_api(api, table)?;
                response.api = Some(fmt(computation.api, 1));
                response.sg60 = Some(fmt(computation.sg60, 4));
                response.rho15_kg_l = Some(fmt(computation.rho15_kg_m3 / dec!(1000), 4));
                response.rho15_kg_m3 = Some(fmt(computation.rho15_kg_m3, 1));
                response.rho15_kg_m3_unrounded = Some(computation.rho15_kg_m3.to_string());
                steps.push(TraceStep::new(
                    "API -> SG 60/60 -> rho60 -> rho15 (invert VCF @ 60F)",
                    json!({ "api": api.to_string(), "water_60f_kg_m3": WATER_DENSITY_60F_KG_M3.to_string(), "astm_table": self.astm_table }),
                    json!({ "sg60": computation.sg60.to_string(), "rho60_kg_m3": computation.rho60_kg_m3.to_string(), "rho15_kg_m3": computation.rho15_kg_m3.to_string() }),
                ));
            }
            DensityOperation::Rho15ToApi => {
                let rho15 =
                    parse_density_kg_m3(self.required_value()?, &self.density15_unit, "value")?;
                let computation = api_from_rho15(rho15, table)?;
                response.api = Some(fmt(computation.api, 1));
                response.sg60 = Some(fmt(computation.sg60, 4));
                response.rho15_kg_l = Some(fmt(rho15 / dec!(1000), 4));
                response.rho15_kg_m3 = Some(fmt(rho15, 1));
                response.rho15_kg_m3_unrounded = Some(rho15.to_string());
                steps.push(TraceStep::new(
                    "rho15 -> rho60 (x VCF @ 60F) -> SG 60/60 -> API",
                    json!({ "rho15_kg_m3": rho15.to_string(), "water_60f_kg_m3": WATER_DENSITY_60F_KG_M3.to_string(), "astm_table": self.astm_table }),
                    json!({ "rho60_kg_m3": computation.rho60_kg_m3.to_string(), "sg60": computation.sg60.to_string(), "api": computation.api.to_string() }),
                ));
            }
            DensityOperation::ObservedToRho15 => {
                let observed =
                    parse_density_kg_m3(self.required_value()?, &self.density15_unit, "value")?;
                let temperature = self.required_temperature()?;
                let rho15 = rho15_from_observed_density(observed, &temperature, table)?;
                response.rho15_kg_l = Some(fmt(rho15 / dec!(1000), 4));
                response.rho15_kg_m3 = Some(fmt(rho15, 1));
                response.rho15_kg_m3_unrounded = Some(rho15.to_string());
                steps.push(TraceStep::new(
                    "rho_obs(t) -> rho15: solve x = rho_obs / VCF(x, t)",
                    json!({ "rho_observed_kg_m3": observed.to_string(), "temperature": temperature.value.to_string(), "temperature_unit": self.temperature_unit, "astm_table": self.astm_table }),
                    json!({ "rho15_kg_m3": rho15.to_string() }),
                ));
            }
            DensityOperation::Rho15ToObserved => {
                let rho15 =
                    parse_density_kg_m3(self.required_value()?, &self.density15_unit, "value")?;
                let temperature = self.required_temperature()?;
                let observed = observed_density_from_rho15(rho15, &temperature, table)?;
                response.observed_kg_l = Some(fmt(observed / dec!(1000), 4));
                response.rho15_kg_l = Some(fmt(rho15 / dec!(1000), 4));
                response.rho15_kg_m3 = Some(fmt(rho15, 1));
                response.rho15_kg_m3_unrounded = Some(rho15.to_string());
                steps.push(TraceStep::new(
                    "rho15 -> rho_obs(t) = rho15 x VCF(rho15, t)",
                    json!({ "rho15_kg_m3": rho15.to_string(), "temperature": temperature.value.to_string(), "temperature_unit": self.temperature_unit, "astm_table": self.astm_table }),
                    json!({ "rho_observed_kg_m3": observed.to_string() }),
                ));
            }
            DensityOperation::Blend => {
                let parcels = self
                    .parcels
                    .iter()
                    .map(|parcel| {
                        let volume = DecimalValue::parse(&parcel.volume_value, "parcels")?.value;
                        let rho15 = parse_density_kg_m3(
                            &parcel.density15_value,
                            &self.density15_unit,
                            "parcels",
                        )?;
                        Ok(BlendParcel {
                            volume_m3: volume,
                            rho15_kg_m3: rho15,
                        })
                    })
                    .collect::<KernelResult<Vec<_>>>()?;
                let computation = blend_density(&parcels)?;
                response.rho15_kg_l = Some(fmt(computation.rho15_kg_m3 / dec!(1000), 4));
                response.rho15_kg_m3 = Some(fmt(computation.rho15_kg_m3, 1));
                response.rho15_kg_m3_unrounded = Some(computation.rho15_kg_m3.to_string());
                response.total_volume_m3 = Some(fmt(computation.total_volume_m3, 3));
                response.total_mt_vacuum = Some(fmt(computation.total_mass_kg / dec!(1000), 3));
                steps.push(TraceStep::new(
                    "blend rho15 = sum(Vi x rho_i) / sum(Vi) (volume-weighted @ 15C)",
                    json!({ "parcels": self.parcels.len(), "density15_unit": self.density15_unit }),
                    json!({ "total_volume_m3": computation.total_volume_m3.to_string(), "total_mass_kg": computation.total_mass_kg.to_string(), "rho15_kg_m3": computation.rho15_kg_m3.to_string() }),
                ));
            }
        }

        if scope.requires_full_trace() {
            let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
            for step in steps {
                trace.push(step);
            }
            response.trace_json = Some(serde_json::to_value(&trace).unwrap_or(json!(null)));
        }

        Ok(response)
    }
}

//! LPG / NGL **vapour-space correction** for pressurized (and refrigerated)
//! cargo, per **API MPMS Ch. 17.10.2 / EI HM 55** §7.4.3 (Measurement of
//! Cargoes On Board Marine Gas Carriers). In a gas carrier the cargo is liquid
//! plus a vapour space; the custody total is `liquid mass + vapour mass` (the
//! worksheet's "Liq + Vap" / "Volume Manometer" columns — real anchor: client
//! *vessel A*, propane; see docs/research/lpg.md).
//!
//! Vapour density (17.10.2 §7.4.3.2, ideal-gas form; multiply by 1/Z when not
//! near atmospheric):
//!
//! ```text
//! ρv (kg/m³) = (288.15 / (273.15 + T°C)) · (P_bar_abs / 1.01325)
//!              · (Molar Mass / 23.6451) · (1 / Z)
//! ```
//!
//! `23.6451 m³/kmol` is the molar volume of an ideal gas at 15 °C, 1 atm — the
//! exact constant the standard uses (so this reproduces 17.10.2's worked
//! examples cell-for-cell: propane at 1.510 bar / −32.8 °C → 3.332 kg/m³;
//! at 4.700 bar / −0.6 °C → 9.146 kg/m³). Then:
//!
//! ```text
//! vapour mass mv = Vv · ρv          (Vv = total tank volume − liquid volume)
//! total mass     = liquid mass + mv
//! ```
//!
//! The liquid side (CTL by API 11.2.4 / Table 54E = our `costald`, custody by
//! 11.5.3) lives in `costald` / `lpg`. Pure `Decimal`; density computed
//! unrounded, only reported figures rounded. String-in/out DTO for the boundary.

use crate::decimal::DecimalValue;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, SystemRoundingRule};
use crate::trace::{CalculationScope, CalculationTrace, TraceStep};
use crate::units::TemperatureUnit;
use crate::value::TemperatureValue;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;

/// Molar volume of an ideal gas at 15 °C, 1 atm, m³/kmol (API MPMS 17.10.2).
pub const MOLAR_VOLUME_15C_M3_KMOL: Decimal = dec!(23.6451);
/// Reference temperature 15 °C, in kelvin.
pub const REF_TEMP_15C_K: Decimal = dec!(288.15);
/// Standard atmospheric pressure, bar.
pub const STD_ATM_BAR: Decimal = dec!(1.01325);
/// bar per psi.
pub const BAR_PER_PSI: Decimal = dec!(0.06894757293);

/// How the supplied tank pressure is expressed. Gauge units are referred to
/// absolute with the supplied (or standard) atmospheric pressure.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PressureUnit {
    BarAbsolute,
    BarGauge,
    KpaAbsolute,
    KpaGauge,
    PsiAbsolute,
    PsiGauge,
}

impl PressureUnit {
    /// Convert the value to absolute bar, referring gauge units with `atm_bar`.
    pub fn to_bar_abs(self, value: Decimal, atm_bar: Decimal) -> Decimal {
        match self {
            PressureUnit::BarAbsolute => value,
            PressureUnit::BarGauge => value + atm_bar,
            PressureUnit::KpaAbsolute => value / dec!(100),
            PressureUnit::KpaGauge => value / dec!(100) + atm_bar,
            PressureUnit::PsiAbsolute => value * BAR_PER_PSI,
            PressureUnit::PsiGauge => value * BAR_PER_PSI + atm_bar,
        }
    }
}

impl FromStr for PressureUnit {
    type Err = KernelError;
    fn from_str(input: &str) -> KernelResult<Self> {
        match input
            .trim()
            .to_ascii_uppercase()
            .replace([' ', '-', '.'], "_")
            .as_str()
        {
            "BARA" | "BAR_A" | "BAR_ABS" | "BAR" => Ok(PressureUnit::BarAbsolute),
            "BARG" | "BAR_G" | "BAR_GAUGE" => Ok(PressureUnit::BarGauge),
            "KPAA" | "KPA_A" | "KPA_ABS" | "KPA" => Ok(PressureUnit::KpaAbsolute),
            "KPAG" | "KPA_G" | "KPA_GAUGE" => Ok(PressureUnit::KpaGauge),
            "PSIA" | "PSI_A" | "PSI_ABS" => Ok(PressureUnit::PsiAbsolute),
            "PSIG" | "PSI_G" | "PSI" | "PSI_GAUGE" => Ok(PressureUnit::PsiGauge),
            _ => Err(KernelError::with_field(
                KernelErrorCode::InvalidUnit,
                format!("Unsupported pressure unit: {input}"),
                "pressure_unit",
            )),
        }
    }
}

/// Result of a vapour-space correction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LpgVaporResult {
    /// Absolute pressure used, bar.
    #[serde(with = "rust_decimal::serde::str")]
    pub pressure_bar_abs: Decimal,
    /// Vapour density, kg/m³ (unrounded; for chaining).
    #[serde(with = "rust_decimal::serde::str")]
    pub vapor_density_kg_m3: Decimal,
    /// Vapour mass, kg.
    #[serde(with = "rust_decimal::serde::str")]
    pub vapor_mass_kg: Decimal,
    /// Vapour mass, metric tons.
    #[serde(with = "rust_decimal::serde::str")]
    pub vapor_mass_mt: Decimal,
}

/// Vapour mass in a pressurized/refrigerated tank's vapour space (API 17.10.2).
///
/// - `vapor_volume_m3` — vapour-space volume (total tank volume − liquid volume);
/// - `pressure_bar_abs` — absolute tank pressure, bar;
/// - `vapor_temperature` — vapour temperature (°C or °F);
/// - `molar_mass_g_mol` — vapour molar mass (kg/kmol ≡ g/mol; propane 44.097);
/// - `compressibility_z` — vapour Z (1.0 = ideal gas, as the 17.10.2 examples;
///   supply the real Z / EoS value when far from atmospheric).
pub fn lpg_vapor_mass(
    vapor_volume_m3: Decimal,
    pressure_bar_abs: Decimal,
    vapor_temperature: &TemperatureValue,
    molar_mass_g_mol: Decimal,
    compressibility_z: Decimal,
    decimals: u32,
    rounding: SystemRoundingRule,
) -> KernelResult<LpgVaporResult> {
    if vapor_volume_m3 < dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Vapour volume cannot be negative.",
            "vapor_volume_m3",
        ));
    }
    if pressure_bar_abs <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Absolute pressure must be positive.",
            "pressure",
        ));
    }
    if molar_mass_g_mol <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Molar mass must be positive.",
            "molar_mass_g_mol",
        ));
    }
    if compressibility_z <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Compressibility Z must be positive.",
            "compressibility_z",
        ));
    }
    let t_kelvin = vapor_temperature_to_kelvin(vapor_temperature);
    if t_kelvin <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::OutOfTableRange,
            "Vapour temperature must be above absolute zero.",
            "vapor_temperature",
        ));
    }

    // API MPMS 17.10.2 §7.4.3.2:
    // ρv = (288.15/T_K)·(P_bar/1.01325)·(M/23.6451)·(1/Z).
    let density = (REF_TEMP_15C_K / t_kelvin)
        * (pressure_bar_abs / STD_ATM_BAR)
        * (molar_mass_g_mol / MOLAR_VOLUME_15C_M3_KMOL)
        / compressibility_z;
    let mass_kg = vapor_volume_m3 * density;

    Ok(LpgVaporResult {
        pressure_bar_abs,
        vapor_density_kg_m3: density,
        vapor_mass_kg: round_decimal(mass_kg, decimals, rounding),
        vapor_mass_mt: round_decimal(mass_kg / dec!(1000), decimals, rounding),
    })
}

fn vapor_temperature_to_kelvin(temperature: &TemperatureValue) -> Decimal {
    match temperature.unit {
        TemperatureUnit::Celsius => temperature.value + dec!(273.15),
        TemperatureUnit::Fahrenheit => (temperature.value + dec!(459.67)) / dec!(1.8),
    }
}

// ---------------------------------------------------------------------------
// DTO boundary
// ---------------------------------------------------------------------------

fn default_decimals() -> u32 {
    3
}
fn default_z() -> String {
    "1.0".to_string()
}
fn default_scope() -> String {
    "LIVE".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LpgVaporRequestDTO {
    /// Vapour-space volume (total tank volume − liquid volume), m³.
    pub vapor_volume_m3: String,
    /// Tank pressure value (interpreted per `pressure_unit`).
    pub pressure: String,
    /// "PSIG" | "BARG" | "KPA_G" | "BARA" | "PSIA" | "KPA_ABS".
    pub pressure_unit: String,
    /// Vapour temperature.
    pub vapor_temperature: String,
    /// "CELSIUS" | "FAHRENHEIT".
    pub vapor_temperature_unit: String,
    /// Vapour molar mass, kg/kmol (≡ g/mol).
    pub molar_mass_g_mol: String,
    /// Vapour compressibility Z (default 1.0 = ideal gas, per 17.10.2 examples).
    #[serde(default = "default_z")]
    pub compressibility_z: String,
    /// Atmospheric pressure for gauge→absolute referral, bar (default 1.01325).
    #[serde(default)]
    pub atmospheric_bar: Option<String>,
    /// Optional liquid mass (MT) to also report the liquid + vapour total.
    #[serde(default)]
    pub liquid_mass_mt: Option<String>,
    #[serde(default = "default_decimals")]
    pub decimals: u32,
    pub rounding_rule: String,
    #[serde(default = "default_scope")]
    pub calculation_scope: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LpgVaporResponseDTO {
    pub success: bool,
    pub pressure_bar_abs: Option<String>,
    pub vapor_density_kg_m3: Option<String>,
    pub vapor_mass_kg: Option<String>,
    pub vapor_mass_mt: Option<String>,
    pub total_mass_mt: Option<String>,
    pub trace_json: Option<serde_json::Value>,
    pub errors: Option<Vec<KernelError>>,
}

impl LpgVaporRequestDTO {
    pub fn calculate(&self) -> LpgVaporResponseDTO {
        match self.calculate_inner() {
            Ok(r) => r,
            Err(e) => LpgVaporResponseDTO {
                success: false,
                pressure_bar_abs: None,
                vapor_density_kg_m3: None,
                vapor_mass_kg: None,
                vapor_mass_mt: None,
                total_mass_mt: None,
                trace_json: None,
                errors: Some(vec![e]),
            },
        }
    }

    fn calculate_inner(&self) -> KernelResult<LpgVaporResponseDTO> {
        let scope = CalculationScope::from_str(&self.calculation_scope)?;
        let rounding = SystemRoundingRule::from_str(&self.rounding_rule)?;
        let vapor_volume = DecimalValue::parse(&self.vapor_volume_m3, "vapor_volume_m3")?.value;
        let pressure_value = DecimalValue::parse(&self.pressure, "pressure")?.value;
        let pressure_unit = PressureUnit::from_str(&self.pressure_unit)?;
        let temp_value = DecimalValue::parse(&self.vapor_temperature, "vapor_temperature")?.value;
        let temp_unit = TemperatureUnit::from_str(&self.vapor_temperature_unit)?;
        let temperature = TemperatureValue::new(temp_value, temp_unit);
        let molar_mass = DecimalValue::parse(&self.molar_mass_g_mol, "molar_mass_g_mol")?.value;
        let z = DecimalValue::parse(&self.compressibility_z, "compressibility_z")?.value;
        let atm_bar = match &self.atmospheric_bar {
            Some(a) => DecimalValue::parse(a, "atmospheric_bar")?.value,
            None => STD_ATM_BAR,
        };
        let pressure_bar_abs = pressure_unit.to_bar_abs(pressure_value, atm_bar);

        let v = lpg_vapor_mass(
            vapor_volume,
            pressure_bar_abs,
            &temperature,
            molar_mass,
            z,
            self.decimals,
            rounding,
        )?;

        let total_mass_mt = match &self.liquid_mass_mt {
            Some(l) => {
                let liquid = DecimalValue::parse(l, "liquid_mass_mt")?.value;
                Some(round_decimal(liquid + v.vapor_mass_mt, self.decimals, rounding))
            }
            None => None,
        };

        let trace_json = if scope.requires_full_trace() {
            let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
            trace.push(
                TraceStep::new(
                    "LPG vapour correction (API 17.10.2): ρv = (288.15/T)(P/1.01325)(M/23.6451)/Z",
                    json!({
                        "vapor_volume_m3": vapor_volume.to_string(),
                        "pressure_bar_abs": pressure_bar_abs.to_string(),
                        "vapor_T_K": vapor_temperature_to_kelvin(&temperature).to_string(),
                        "molar_mass": molar_mass.to_string(),
                        "Z": z.to_string(),
                    }),
                    json!({
                        "vapor_density_kg_m3": v.vapor_density_kg_m3.to_string(),
                        "vapor_mass_mt": v.vapor_mass_mt.to_string(),
                    }),
                )
                .with_formula(
                    "ρv = (288.15/T_K)(P_bar/1.01325)(M/23.6451)(1/Z) ; mv = Vv·ρv ; total = liquid + mv",
                ),
            );
            Some(serde_json::to_value(&trace).unwrap_or(json!(null)))
        } else {
            None
        };

        Ok(LpgVaporResponseDTO {
            success: true,
            pressure_bar_abs: Some(v.pressure_bar_abs.normalize().to_string()),
            vapor_density_kg_m3: Some(
                round_decimal(v.vapor_density_kg_m3, self.decimals.max(3), rounding)
                    .normalize()
                    .to_string(),
            ),
            vapor_mass_kg: Some(v.vapor_mass_kg.normalize().to_string()),
            vapor_mass_mt: Some(v.vapor_mass_mt.normalize().to_string()),
            total_mass_mt: total_mass_mt.map(|t| t.normalize().to_string()),
            trace_json,
            errors: None,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn celsius(t: Decimal) -> TemperatureValue {
        TemperatureValue::new(t, TemperatureUnit::Celsius)
    }

    fn approx(a: Decimal, b: Decimal, tol: Decimal) -> bool {
        (a - b).abs() <= tol
    }

    #[test]
    fn vapor_density_matches_api_17_10_2_method_a() {
        // API MPMS 17.10.2 Table 5 (Method A), propane tank 1: P=1.510 bar abs,
        // T=-32.8 °C, M=44.097, ideal gas (Z=1) → ρ=3.332 kg/m³; corrected vapour
        // volume 63.790 m³ → vapour mass 0.213 t.
        let v = lpg_vapor_mass(
            dec!(63.790),
            dec!(1.510),
            &celsius(dec!(-32.8)),
            dec!(44.097),
            dec!(1.0),
            3,
            SystemRoundingRule::HalfUp,
        )
        .unwrap();
        assert!(
            approx(v.vapor_density_kg_m3, dec!(3.332), dec!(0.0005)),
            "ρ was {}",
            v.vapor_density_kg_m3
        );
        assert!(
            approx(v.vapor_mass_mt, dec!(0.213), dec!(0.001)),
            "mv was {}",
            v.vapor_mass_mt
        );
    }

    #[test]
    fn vapor_density_matches_api_17_10_2_method_b() {
        // API MPMS 17.10.2 Table 6 (Method B), propane tank 1: P=4.700 bar abs,
        // T=-0.6 °C, M=44.097, ideal gas (Z=1) → ρ=9.146 kg/m³.
        let v = lpg_vapor_mass(
            dec!(1),
            dec!(4.700),
            &celsius(dec!(-0.6)),
            dec!(44.097),
            dec!(1.0),
            6,
            SystemRoundingRule::HalfUp,
        )
        .unwrap();
        assert!(
            approx(v.vapor_density_kg_m3, dec!(9.146), dec!(0.001)),
            "ρ was {}",
            v.vapor_density_kg_m3
        );
    }

    #[test]
    fn compressibility_reduces_density() {
        // Including Z (<1) raises density vs ideal: ρ_real = ρ_ideal / Z.
        let ideal = lpg_vapor_mass(
            dec!(1),
            dec!(4.700),
            &celsius(dec!(-0.6)),
            dec!(44.097),
            dec!(1.0),
            6,
            SystemRoundingRule::HalfUp,
        )
        .unwrap();
        let real = lpg_vapor_mass(
            dec!(1),
            dec!(4.700),
            &celsius(dec!(-0.6)),
            dec!(44.097),
            dec!(0.9),
            6,
            SystemRoundingRule::HalfUp,
        )
        .unwrap();
        assert!(real.vapor_density_kg_m3 > ideal.vapor_density_kg_m3);
    }

    #[test]
    fn psig_referral_and_total_via_dto() {
        // 100 PSIG → 100·0.06894757293 + 1.01325 = 7.908007 bar abs.
        let req = LpgVaporRequestDTO {
            vapor_volume_m3: "50".to_string(),
            pressure: "100".to_string(),
            pressure_unit: "PSIG".to_string(),
            vapor_temperature: "26.85".to_string(),
            vapor_temperature_unit: "CELSIUS".to_string(),
            molar_mass_g_mol: "44.097".to_string(),
            compressibility_z: "0.85".to_string(),
            atmospheric_bar: None,
            liquid_mass_mt: Some("588.203".to_string()),
            decimals: 3,
            rounding_rule: "HALF_UP".to_string(),
            calculation_scope: "EXPORT".to_string(),
        };
        let resp = req.calculate();
        assert!(resp.success);
        assert_eq!(resp.pressure_bar_abs.as_deref(), Some("7.908007293"));
        let total: Decimal = resp.total_mass_mt.unwrap().parse().unwrap();
        assert!(total > dec!(588.203));
        assert!(resp.trace_json.is_some(), "EXPORT scope must carry a trace");
    }

    #[test]
    fn rejects_non_positive_pressure() {
        let r = lpg_vapor_mass(
            dec!(10),
            dec!(0),
            &celsius(dec!(20)),
            dec!(44.097),
            dec!(1.0),
            3,
            SystemRoundingRule::HalfUp,
        );
        assert!(r.is_err());
    }
}

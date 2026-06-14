//! LPG / NGL custody figures — the light-hydrocarbon family (propane, butane,
//! propylene, NGL …). Distinct from the product tables (54/6) in three ways the
//! worksheets make explicit (real anchor: SGS *EPIC MADEIRA*, propane discharge,
//! Vopak Panama — see docs/research/lpg.md):
//!
//! 1. **Temperature correction (CTL/VCF)** uses **API MPMS Ch 11.2.4 (COSTALD,
//!    corresponding-states)** with per-component critical constants — NOT Table 54.
//!    That step is staged separately (see `costald` TODO); this module takes the
//!    already-corrected standard volumes (@15 °C and @60 °F) and assembles the
//!    reported custody units.
//! 2. **Weight in air ← vacuum** uses the **Table 56 (LPG)** vac/air factor by
//!    density band (supplied here as `wcf_air_per_vac`).
//! 3. **Long tons are derived from weight in VACUUM** (`kg_vac / 1016.0469088`),
//!    and **US gallons = US barrels × 42**, barrels/m³ via the legacy ASTM-IP
//!    **Table 1** factor — exactly as the certificate states ("ASTM table 1 used
//!    to calculate Long tons, US Barrels and US Gallons").
//!
//! Pure `Decimal`; string-in/out DTO for the WASM/Tauri boundary.

use crate::decimal::DecimalValue;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, SystemRoundingRule};
use crate::trace::{CalculationScope, CalculationTrace, TraceStep};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;

/// Mass of one long ton, in kg (avoirdupois). LPG long tons are taken from
/// weight in vacuum: `LT = kg_vac / 1016.0469088`.
pub const LONG_TON_KG: Decimal = dec!(1016.0469088);
/// Cubic metres per US barrel (legacy ASTM-IP Table 1 / NIST).
pub const M3_PER_BBL: Decimal = dec!(0.158987294928);
/// US gallons per US barrel.
pub const GAL_PER_BBL: Decimal = dec!(42);

/// Assembled LPG custody figure in every reported unit (one TCV/GSV/NSV column).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LpgCustody {
    pub litres_15: Decimal,
    pub m3_15: Decimal,
    pub mt_vacuum: Decimal,
    pub mt_air: Decimal,
    pub long_tons: Decimal,
    pub bbl_60: Decimal,
    pub gal_60: Decimal,
    pub m3_60: Decimal,
}

/// Assemble an LPG custody figure from the two standard volumes and the density.
///
/// - `m3_15` — liquid volume reduced to 15 °C (m³), the metric custody volume;
/// - `density15_kg_l` — density @ 15 °C (kg/L), **vacuum basis**;
/// - `bbl_60` — the same parcel as US barrels @ 60 °F (from the 60 °F CTL);
/// - `wcf_air_per_vac` — Table 56 (LPG) weight factor: `mt_air = mt_vac · wcf`.
///
/// Weight in vacuum `= m3_15 · density15` (MT); long tons from vacuum kg.
pub fn lpg_custody(
    m3_15: Decimal,
    density15_kg_l: Decimal,
    bbl_60: Decimal,
    wcf_air_per_vac: Decimal,
    decimals: u32,
    rounding: SystemRoundingRule,
) -> LpgCustody {
    let r = |d: Decimal| round_decimal(d, decimals, rounding);
    let mt_vac = m3_15 * density15_kg_l; // m³·(kg/L) = MT
    let mt_air = mt_vac * wcf_air_per_vac;
    let kg_vac = mt_vac * dec!(1000);
    let long_tons = kg_vac / LONG_TON_KG;
    LpgCustody {
        litres_15: r(m3_15 * dec!(1000)),
        m3_15: r(m3_15),
        mt_vacuum: r(mt_vac),
        mt_air: r(mt_air),
        long_tons: r(long_tons),
        bbl_60: r(bbl_60),
        gal_60: r(bbl_60 * GAL_PER_BBL),
        m3_60: r(bbl_60 * M3_PER_BBL),
    }
}

// ---------------------------------------------------------------------------
// DTO boundary
// ---------------------------------------------------------------------------

fn default_decimals() -> u32 {
    3
}
fn default_scope() -> String {
    "LIVE".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LpgCustodyRequestDTO {
    /// Liquid volume reduced to 15 °C (m³).
    pub m3_15: String,
    /// Density @ 15 °C (kg/L), vacuum basis.
    pub density15_kg_l: String,
    /// Same parcel as US barrels @ 60 °F.
    pub bbl_60: String,
    /// Table 56 (LPG) weight factor (air per vacuum, e.g. 0.99769).
    pub wcf_air_per_vac: String,
    #[serde(default = "default_decimals")]
    pub decimals: u32,
    pub rounding_rule: String,
    #[serde(default = "default_scope")]
    pub calculation_scope: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LpgCustodyResponseDTO {
    pub success: bool,
    pub litres_15: Option<String>,
    pub m3_15: Option<String>,
    pub mt_vacuum: Option<String>,
    pub mt_air: Option<String>,
    pub long_tons: Option<String>,
    pub bbl_60: Option<String>,
    pub gal_60: Option<String>,
    pub m3_60: Option<String>,
    pub trace_json: Option<serde_json::Value>,
    pub errors: Option<Vec<KernelError>>,
}

impl LpgCustodyRequestDTO {
    pub fn calculate(&self) -> LpgCustodyResponseDTO {
        match self.calculate_inner() {
            Ok(r) => r,
            Err(e) => LpgCustodyResponseDTO {
                success: false,
                litres_15: None,
                m3_15: None,
                mt_vacuum: None,
                mt_air: None,
                long_tons: None,
                bbl_60: None,
                gal_60: None,
                m3_60: None,
                trace_json: None,
                errors: Some(vec![e]),
            },
        }
    }

    fn calculate_inner(&self) -> KernelResult<LpgCustodyResponseDTO> {
        let scope = CalculationScope::from_str(&self.calculation_scope)?;
        let rounding = SystemRoundingRule::from_str(&self.rounding_rule)?;
        let m3_15 = DecimalValue::parse(&self.m3_15, "m3_15")?.value;
        let density = DecimalValue::parse(&self.density15_kg_l, "density15_kg_l")?.value;
        let bbl_60 = DecimalValue::parse(&self.bbl_60, "bbl_60")?.value;
        let wcf = DecimalValue::parse(&self.wcf_air_per_vac, "wcf_air_per_vac")?.value;
        if density <= dec!(0) {
            return Err(KernelError::with_field(
                KernelErrorCode::NegativeQuantityNotAllowed,
                "Density must be positive.",
                "density15_kg_l",
            ));
        }
        let c = lpg_custody(m3_15, density, bbl_60, wcf, self.decimals, rounding);

        let trace_json = if scope.requires_full_trace() {
            let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
            trace.push(
                TraceStep::new(
                    "LPG custody assembly (API 11.2.4 family): vac=m³·ρ15, LT from vacuum",
                    json!({ "m3_15": m3_15.to_string(), "density15": density.to_string(), "bbl_60": bbl_60.to_string(), "wcf": wcf.to_string() }),
                    json!({ "mt_vacuum": c.mt_vacuum.to_string(), "mt_air": c.mt_air.to_string(), "long_tons": c.long_tons.to_string() }),
                )
                .with_formula("MT_vac = m³@15·ρ15 ;  LT = kg_vac/1016.0469088 ;  gal = bbl·42"),
            );
            Some(serde_json::to_value(&trace).unwrap_or(json!(null)))
        } else {
            None
        };

        Ok(LpgCustodyResponseDTO {
            success: true,
            litres_15: Some(c.litres_15.normalize().to_string()),
            m3_15: Some(c.m3_15.normalize().to_string()),
            mt_vacuum: Some(c.mt_vacuum.normalize().to_string()),
            mt_air: Some(c.mt_air.normalize().to_string()),
            long_tons: Some(c.long_tons.normalize().to_string()),
            bbl_60: Some(c.bbl_60.normalize().to_string()),
            gal_60: Some(c.gal_60.normalize().to_string()),
            m3_60: Some(c.m3_60.normalize().to_string()),
            trace_json,
            errors: None,
        })
    }
}

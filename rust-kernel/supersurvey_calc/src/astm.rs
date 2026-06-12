//! ASTM D1250-80 (metric) petroleum measurement tables, implemented by equation.
//!
//! Implemented:
//! - Table 54B — VCF/CTL for refined products (generalized products, 15 °C base).
//! - Table 54A — VCF/CTL for crude oil (15 °C base).
//! - Table 56  — WCF (weight-in-air factor) from density @ 15 °C.
//!
//! Formula (D1250-80 metric procedure):
//!   VCF = exp( -a15 * dt * (1 + 0.8 * a15 * dt) ),  dt = t - 15 °C
//!   a15 = (K0 + K1 * rho15) / rho15^2,              rho15 in kg/m³
//!
//! Metric K constants are the 1.8x conversion of the published °F constants
//! (per-°C thermal expansion):
//!   Crude (54A):        K0 = 613.97226, K1 = 0
//!   Gasolines:          K0 = 346.42278, K1 = 0.43884   (653.0 <= rho < 770.3)
//!   Transition zone:    a15 = -0.00336312 + 2680.3206 / rho^2 (770.3 <= rho < 787.5)
//!   Jet fuels:          K0 = 594.5418,  K1 = 0          (787.5 <= rho < 838.7)
//!   Fuel oils:          K0 = 186.9696,  K1 = 0.48618    (838.7 <= rho <= 1075.0)
//!
//! Table 56: WCF = rho15 (kg/L) - 0.0011 (air buoyancy band covering marine fuels;
//! the worksheet states the factor explicitly as "(-0.0011)").
//!
//! Policy notes:
//! - Pure `Decimal` arithmetic end to end; `exp` is a bounded Taylor series
//!   (|x| <= 0.35 in-domain, terms iterated until < 1e-22). No `f64` anywhere.
//! - Only the FINAL factor is rounded (default 4 dp, like the field worksheet);
//!   the unrounded value is returned alongside for no-intermediate-rounding chains.
//! - Published-table variance: printed 1980 tables were generated with internal
//!   roundings; equation results can differ by 1 unit in the 4th decimal for some
//!   entries. QA tests assert exact equality where the worksheet agrees and
//!   ±0.0001 elsewhere.
//! - Observed temperature: used AS-IS (`dt = t - 15`). Many field spreadsheets
//!   first snap the observed temperature to the nearest 0.25 °C (`INT(t*4+0.5)/4`)
//!   to emulate a printed-table lookup; that shifts VCF by ~1 in the 4th decimal on
//!   off-quarter temps. DECISION (2026-06): keep the equation on the raw temperature
//!   — it is more precise; we do NOT replicate the quarter-degree snap.
//! - D1250-04 / API 11.1 (2004) revision: planned as a separate, selectable
//!   version (Decision Log: all table versions selectable by the surveyor).

use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, SystemRoundingRule};
use crate::units::{DensityUnit, TemperatureUnit};
use crate::value::{DensityValue, TemperatureValue};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};

/// Default decimals for VCF, matching the BQS field worksheet ("VCF T-54B (4dp)").
pub const DEFAULT_VCF_DECIMALS: u32 = 4;
/// Default decimals for WCF, matching the BQS field worksheet ("WCF (T-56)").
pub const DEFAULT_WCF_DECIMALS: u32 = 4;

/// Air buoyancy correction of Table 56, in t/m³ (≡ kg/L).
const TABLE_56_AIR_CORRECTION: Decimal = dec!(0.0011);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Table54bProductGroup {
    Gasolines,
    TransitionZone,
    JetFuels,
    FuelOils,
}

/// Which edition of the petroleum measurement tables / implementation procedure
/// the surveyor selected (Decision Log: all table versions selectable).
///
/// At ATMOSPHERIC pressure — i.e. tank gauging for bunkers — the 2004 revision
/// (API MPMS 11.1) reproduces the 1980 CTL/VCF for the generalized product
/// groups: the thermal-expansion correlation is shared and the 2004 pressure
/// correction (CTPL) is unity. The edition therefore changes, in our
/// implementation: (a) the VCF output resolution — 1980 prints 4 dp, the 2004
/// procedure specifies 5 — and (b) the recorded provenance. Both editions here
/// run the SAME no-intermediate-rounding equation the 2004 procedure mandates;
/// neither emulates printed-table granularity. The enum also future-proofs for
/// CTPL and edition-specific commodity correlations.
///
/// See docs/research/d1250-80-vs-2004.md.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TableVersion {
    /// ASTM D1250-80 (1980 Petroleum Measurement Tables) — default.
    #[default]
    D1250_1980,
    /// ASTM D1250-04 / API MPMS Ch. 11.1 (2004) — 5 dp CTL, atmospheric.
    D1250_2004,
}

impl TableVersion {
    /// VCF/CTL output decimals per the edition's convention (1980: 4, 2004: 5).
    pub fn default_vcf_decimals(self) -> u32 {
        match self {
            TableVersion::D1250_1980 => 4,
            TableVersion::D1250_2004 => 5,
        }
    }

    /// Stable label for traces, reports and the IPC boundary.
    pub fn label(self) -> &'static str {
        match self {
            TableVersion::D1250_1980 => "D1250_1980",
            TableVersion::D1250_2004 => "D1250_2004",
        }
    }
}

impl std::str::FromStr for TableVersion {
    type Err = KernelError;
    fn from_str(input: &str) -> KernelResult<Self> {
        match input
            .trim()
            .to_ascii_uppercase()
            .replace(['-', ' ', '.'], "_")
            .as_str()
        {
            "" | "D1250_1980" | "D1250_80" | "1980" | "80" | "ASTM_D1250_80" => {
                Ok(TableVersion::D1250_1980)
            }
            "D1250_2004" | "D1250_04" | "2004" | "04" | "API_MPMS_11_1" | "MPMS_11_1"
            | "ASTM_D1250_04" => Ok(TableVersion::D1250_2004),
            _ => Err(KernelError::with_field(
                KernelErrorCode::InvalidUnit,
                format!("Unsupported petroleum-table edition: {input}"),
                "table_version",
            )),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Table54Computation {
    /// Final VCF, rounded to the requested decimals.
    #[serde(with = "rust_decimal::serde::str")]
    pub vcf: Decimal,
    /// Unrounded VCF for no-intermediate-rounding chains.
    #[serde(with = "rust_decimal::serde::str")]
    pub vcf_unrounded: Decimal,
    /// Thermal expansion coefficient at 15 °C (per °C).
    #[serde(with = "rust_decimal::serde::str")]
    pub alpha15: Decimal,
    /// t - 15 °C used in the formula.
    #[serde(with = "rust_decimal::serde::str")]
    pub delta_t: Decimal,
    /// Density normalized to kg/m³.
    #[serde(with = "rust_decimal::serde::str")]
    pub density15_kg_m3: Decimal,
    /// Product group selected by density (54B) — `None` for 54A (crude).
    pub product_group: Option<Table54bProductGroup>,
    /// Petroleum-table edition applied (provenance). `None` until set by the
    /// orchestrator; the bare table functions are edition-agnostic at 1 atm.
    #[serde(default)]
    pub table_version: Option<TableVersion>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Table56Computation {
    /// Final WCF (t/m³ in air), rounded to the requested decimals.
    #[serde(with = "rust_decimal::serde::str")]
    pub wcf: Decimal,
    /// Unrounded WCF.
    #[serde(with = "rust_decimal::serde::str")]
    pub wcf_unrounded: Decimal,
    /// Density normalized to kg/L (t/m³).
    #[serde(with = "rust_decimal::serde::str")]
    pub density15_kg_l: Decimal,
}

/// Table 54B (refined products, metric): VCF from density @ 15 °C and temperature.
pub fn table_54b_vcf(
    density15: &DensityValue,
    temperature: &TemperatureValue,
    vcf_decimals: u32,
    rounding: SystemRoundingRule,
) -> KernelResult<Table54Computation> {
    let rho = density_to_kg_m3(density15)?;
    let group = select_54b_group(rho)?;
    let alpha = match group {
        Table54bProductGroup::Gasolines => alpha_from_k(dec!(346.42278), dec!(0.43884), rho),
        Table54bProductGroup::TransitionZone => dec!(-0.00336312) + dec!(2680.3206) / (rho * rho),
        Table54bProductGroup::JetFuels => alpha_from_k(dec!(594.5418), dec!(0), rho),
        Table54bProductGroup::FuelOils => alpha_from_k(dec!(186.9696), dec!(0.48618), rho),
    };
    let mut computation = vcf_from_alpha(alpha, temperature, rho, vcf_decimals, rounding)?;
    computation.product_group = Some(group);
    Ok(computation)
}

/// Table 54A (crude oil, metric): VCF from density @ 15 °C and temperature.
pub fn table_54a_vcf(
    density15: &DensityValue,
    temperature: &TemperatureValue,
    vcf_decimals: u32,
    rounding: SystemRoundingRule,
) -> KernelResult<Table54Computation> {
    let rho = density_to_kg_m3(density15)?;
    if rho < dec!(610.6) || rho > dec!(1075.0) {
        return Err(KernelError::with_field(
            KernelErrorCode::OutOfTableRange,
            format!("Density {rho} kg/m3 outside Table 54A range 610.6-1075.0."),
            "density15",
        ));
    }
    let alpha = alpha_from_k(dec!(613.97226), dec!(0), rho);
    vcf_from_alpha(alpha, temperature, rho, vcf_decimals, rounding)
}

/// Table 56: WCF (weight in air, t/m³) = density @ 15 °C (kg/L) − 0.0011.
pub fn table_56_wcf(
    density15: &DensityValue,
    wcf_decimals: u32,
    rounding: SystemRoundingRule,
) -> KernelResult<Table56Computation> {
    let rho_kg_l = density_to_kg_m3(density15)? / dec!(1000);
    if rho_kg_l < dec!(0.6100) || rho_kg_l > dec!(1.1640) {
        return Err(KernelError::with_field(
            KernelErrorCode::OutOfTableRange,
            format!("Density {rho_kg_l} kg/L outside supported Table 56 band 0.6100-1.1640."),
            "density15",
        ));
    }
    let wcf_unrounded = rho_kg_l - TABLE_56_AIR_CORRECTION;
    Ok(Table56Computation {
        wcf: round_decimal(wcf_unrounded, wcf_decimals, rounding),
        wcf_unrounded,
        density15_kg_l: rho_kg_l,
    })
}

fn vcf_from_alpha(
    alpha: Decimal,
    temperature: &TemperatureValue,
    rho: Decimal,
    vcf_decimals: u32,
    rounding: SystemRoundingRule,
) -> KernelResult<Table54Computation> {
    let t_celsius = temperature_to_celsius(temperature);
    if t_celsius < dec!(-18.0) || t_celsius > dec!(150.0) {
        return Err(KernelError::with_field(
            KernelErrorCode::OutOfTableRange,
            format!("Temperature {t_celsius} C outside supported Table 54 range -18 to 150 C."),
            "temperature",
        ));
    }
    let delta_t = t_celsius - dec!(15);
    let x = alpha * delta_t;
    let exponent = -(x * (dec!(1) + dec!(0.8) * x));
    let vcf_unrounded = exp_taylor(exponent);
    Ok(Table54Computation {
        vcf: round_decimal(vcf_unrounded, vcf_decimals, rounding),
        vcf_unrounded,
        alpha15: alpha,
        delta_t,
        density15_kg_m3: rho,
        product_group: None,
        table_version: None,
    })
}

fn alpha_from_k(k0: Decimal, k1: Decimal, rho: Decimal) -> Decimal {
    (k0 + k1 * rho) / (rho * rho)
}

fn select_54b_group(rho: Decimal) -> KernelResult<Table54bProductGroup> {
    if rho < dec!(653.0) || rho > dec!(1075.0) {
        return Err(KernelError::with_field(
            KernelErrorCode::OutOfTableRange,
            format!("Density {rho} kg/m3 outside Table 54B range 653.0-1075.0."),
            "density15",
        ));
    }
    Ok(if rho < dec!(770.3) {
        Table54bProductGroup::Gasolines
    } else if rho < dec!(787.5) {
        Table54bProductGroup::TransitionZone
    } else if rho < dec!(838.7) {
        Table54bProductGroup::JetFuels
    } else {
        Table54bProductGroup::FuelOils
    })
}

fn density_to_kg_m3(density: &DensityValue) -> KernelResult<Decimal> {
    let rho = match density.unit {
        DensityUnit::KgPerCubicMeter => density.value,
        DensityUnit::KgPerLitre => density.value * dec!(1000),
        DensityUnit::ApiGravity
        | DensityUnit::RelativeDensity60F60F
        | DensityUnit::SpecificGravity60F60F => {
            return Err(KernelError::with_field(
                KernelErrorCode::UnsupportedConversion,
                "ASTM 54/56 metric tables require density in kg/m3 or kg/L; convert API gravity first.",
                "density15_unit",
            ));
        }
    };
    if rho <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Density @ 15 C must be positive.",
            "density15",
        ));
    }
    Ok(rho)
}

fn temperature_to_celsius(temperature: &TemperatureValue) -> Decimal {
    match temperature.unit {
        TemperatureUnit::Celsius => temperature.value,
        TemperatureUnit::Fahrenheit => (temperature.value - dec!(32)) / dec!(1.8),
    }
}

/// exp(x) by Taylor series for the bounded VCF exponent domain (|x| <= ~0.35).
///
/// Terms are accumulated until below 1e-22, well inside `Decimal`'s 28-digit
/// precision; for |x| <= 0.35 convergence takes < 25 terms. Deterministic and
/// dependency-free by design (official numbers must not depend on float libm).
pub(crate) fn exp_taylor(x: Decimal) -> Decimal {
    let epsilon = dec!(0.0000000000000000000001); // 1e-22
    let mut sum = dec!(1);
    let mut term = dec!(1);
    let mut n = dec!(0);
    for _ in 0..60 {
        n += dec!(1);
        term = term * x / n;
        sum += term;
        if term.abs() < epsilon {
            break;
        }
    }
    sum
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exp_taylor_matches_known_values() {
        // exp(0) = 1, exp(-0.01) ≈ 0.990049833749168, exp(0.1) ≈ 1.105170918075648
        assert_eq!(exp_taylor(dec!(0)), dec!(1));
        let e1 = exp_taylor(dec!(-0.01));
        assert!((e1 - dec!(0.990049833749168)).abs() < dec!(0.000000000001));
        let e2 = exp_taylor(dec!(0.1));
        assert!((e2 - dec!(1.105170918075648)).abs() < dec!(0.000000000001));
    }
}

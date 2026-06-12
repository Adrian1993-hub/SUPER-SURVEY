//! ASTM D1250 / API MPMS 11.1 — **US-customary (Imperial)** petroleum tables,
//! 60 °F base. Table **6A/6B** (VCF) + Table **13** (WCF, metric tons per barrel),
//! by equation. Density is entered as **API gravity @ 60 °F**.
//!
//! Sibling of `astm` (metric 54A/54B/56, 15 °C). Reverse-engineered and validated
//! cell-by-cell against a real SGS imperial BQS worksheet (see
//! docs/research/formato-bqs-imperial-multigrado.md). Same equation form as the
//! metric tables — only the base temperature, the °F K-constants, the API→density
//! route and the WCF (barrels) differ.
//!
//! Pipeline (per the worksheet's hidden columns):
//!   ρ60 = 141.5 × WATER_60F / (API + 131.5)              [kg/m³ @ 60 °F]
//!   t68 = ITS-90 → IPTS-68 correction of the observed temperature
//!   α60 = K0/ρ60² (+ K1/ρ60) (+ additive)                [per °F, group constants]
//!   VCF = exp( −α60·ΔT·(1 + 0.8·α60·ΔT) ),  ΔT = t68 − 60.0068749 °F
//!   WCF13 = ((141.3806986/(API+131.5) − 0.0012172)·8.34540323)/2204.62·42  [MT/bbl]
//!
//! Policy: pure `Decimal`; reuses the bounded `exp` of `astm`. Only the final
//! factor is rounded (5 dp, per the 2004 procedure); `*_unrounded` carried for
//! no-intermediate-rounding chains. Group is selected by API band, matching the
//! worksheet's `IF(API<37.01,…)` ladder.

use crate::astm::exp_taylor;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, SystemRoundingRule};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};

/// Density of water at 60 °F (kg/m³), API MPMS convention.
pub const WATER_60F_KG_M3: Decimal = dec!(999.016);
/// Exact base temperature used by the 60 °F procedure (°F).
pub const BASE_TEMP_F: Decimal = dec!(60.0068749);
/// US barrels per cubic metre (worksheet factor).
pub const BARRELS_PER_CUBIC_METER: Decimal = dec!(6.28981);
pub const DEFAULT_VCF60_DECIMALS: u32 = 5;
pub const DEFAULT_WCF13_DECIMALS: u32 = 5;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Table6bProductGroup {
    FuelOils,
    JetFuels,
    TransitionZone,
    Gasolines,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Table6Computation {
    #[serde(with = "rust_decimal::serde::str")]
    pub vcf: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub vcf_unrounded: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub alpha60: Decimal,
    /// t68 − 60.0068749 (°F).
    #[serde(with = "rust_decimal::serde::str")]
    pub delta_t_f: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub density60_kg_m3: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub api: Decimal,
    /// `None` for 6A (crude).
    pub product_group: Option<Table6bProductGroup>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Table13Computation {
    /// Weight-in-air factor, metric tons per barrel (rounded).
    #[serde(with = "rust_decimal::serde::str")]
    pub wcf: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub wcf_unrounded: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub density60_kg_m3: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub api: Decimal,
}

/// ITS-90 → IPTS-68 correction of an observed temperature (°F in, °F out).
///
/// The printed tables were built on IPTS-68; modern thermometers read ITS-90.
/// The worksheet applies this 8-term polynomial (in observed °C, scaled by 630)
/// before the VCF. The correction is sub-0.02 °C but kept for fidelity.
pub fn its90_to_its68_fahrenheit(temp_f: Decimal) -> Decimal {
    let c = (temp_f - dec!(32)) / dec!(1.8);
    let u = c / dec!(630);
    // Horner: poly = u·(a1 + u·(a2 + … + u·a8))
    let poly = u
        * (dec!(-0.148759)
            + u * (dec!(-0.267408)
                + u * (dec!(1.08076)
                    + u * (dec!(1.269056)
                        + u * (dec!(-4.089591)
                            + u * (dec!(-1.871251)
                                + u * (dec!(7.438081) + u * dec!(-3.536296))))))));
    let t68_c = c - poly;
    t68_c * dec!(1.8) + dec!(32)
}

/// Density @ 60 °F (kg/m³) from API gravity.
pub fn density60_from_api(api: Decimal) -> KernelResult<Decimal> {
    let denom = api + dec!(131.5);
    if denom <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::DivisionByZero,
            format!("API {api} implies a non-positive density."),
            "api",
        ));
    }
    Ok(dec!(141.5) * WATER_60F_KG_M3 / denom)
}

/// API gravity from density @ 60 °F (kg/m³).
pub fn api_from_density60(density60_kg_m3: Decimal) -> KernelResult<Decimal> {
    if density60_kg_m3 <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Density @ 60 F must be positive.",
            "density60",
        ));
    }
    Ok(dec!(141.5) * WATER_60F_KG_M3 / density60_kg_m3 - dec!(131.5))
}

/// 6B product group from API band (worksheet ladder: <37.01 / <48.01 / <52.01).
pub fn select_6b_group(api: Decimal) -> Table6bProductGroup {
    if api < dec!(37.01) {
        Table6bProductGroup::FuelOils
    } else if api < dec!(48.01) {
        Table6bProductGroup::JetFuels
    } else if api < dec!(52.01) {
        Table6bProductGroup::TransitionZone
    } else {
        Table6bProductGroup::Gasolines
    }
}

fn alpha_6b(group: Table6bProductGroup, rho: Decimal) -> Decimal {
    let rho2 = rho * rho;
    match group {
        // K0/ρ² + K1/ρ
        Table6bProductGroup::FuelOils => dec!(103.872) / rho2 + dec!(0.2701) / rho,
        Table6bProductGroup::Gasolines => dec!(192.4571) / rho2 + dec!(0.2438) / rho,
        // K0/ρ²
        Table6bProductGroup::JetFuels => dec!(330.301) / rho2,
        // K0/ρ² + additive constant
        Table6bProductGroup::TransitionZone => dec!(1489.067) / rho2 - dec!(0.0018684),
    }
}

fn vcf60_from_alpha(
    alpha: Decimal,
    api: Decimal,
    rho: Decimal,
    temp_f: Decimal,
    group: Option<Table6bProductGroup>,
    decimals: u32,
    rounding: SystemRoundingRule,
) -> Table6Computation {
    let t68 = its90_to_its68_fahrenheit(temp_f);
    let dt = t68 - BASE_TEMP_F;
    let x = alpha * dt;
    let exponent = -(x * (dec!(1) + dec!(0.8) * x));
    let vcf_unrounded = exp_taylor(exponent);
    Table6Computation {
        vcf: round_decimal(vcf_unrounded, decimals, rounding),
        vcf_unrounded,
        alpha60: alpha,
        delta_t_f: dt,
        density60_kg_m3: rho,
        api,
        product_group: group,
    }
}

/// Table 6B (refined products, 60 °F): VCF from API gravity and observed °F.
pub fn table_6b_vcf(
    api: Decimal,
    temp_f: Decimal,
    decimals: u32,
    rounding: SystemRoundingRule,
) -> KernelResult<Table6Computation> {
    let rho = density60_from_api(api)?;
    let group = select_6b_group(api);
    Ok(vcf60_from_alpha(
        alpha_6b(group, rho),
        api,
        rho,
        temp_f,
        Some(group),
        decimals,
        rounding,
    ))
}

/// Table 6A (crude oil, 60 °F): VCF from API gravity and observed °F.
pub fn table_6a_vcf(
    api: Decimal,
    temp_f: Decimal,
    decimals: u32,
    rounding: SystemRoundingRule,
) -> KernelResult<Table6Computation> {
    let rho = density60_from_api(api)?;
    let alpha = dec!(341.0957) / (rho * rho);
    Ok(vcf60_from_alpha(
        alpha, api, rho, temp_f, None, decimals, rounding,
    ))
}

/// Table 13 (weight, metric tons per barrel, weight in air) from API gravity.
///
/// Replicates the worksheet exactly, including its single intermediate ROUND to
/// 6 dp: `MT/bbl = ROUND((141.3806986/(API+131.5) − 0.0012172)·8.34540323, 6) /
/// 2204.62 · 42`. Air buoyancy is the 0.0012172 term; 8.34540323 = lb/US-gal of
/// water; 2204.62 = lb/MT; 42 = US gal/barrel.
pub fn table_13_wcf(
    api: Decimal,
    decimals: u32,
    rounding: SystemRoundingRule,
) -> KernelResult<Table13Computation> {
    let denom = api + dec!(131.5);
    if denom <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::DivisionByZero,
            format!("API {api} implies a non-positive density."),
            "api",
        ));
    }
    let lb_per_gal = (dec!(141.3806986) / denom - dec!(0.0012172)) * dec!(8.34540323);
    let lb_per_gal_r = round_decimal(lb_per_gal, 6, rounding);
    let wcf_unrounded = lb_per_gal_r / dec!(2204.62) * dec!(42);
    Ok(Table13Computation {
        wcf: round_decimal(wcf_unrounded, decimals, rounding),
        wcf_unrounded,
        density60_kg_m3: density60_from_api(api)?,
        api,
    })
}

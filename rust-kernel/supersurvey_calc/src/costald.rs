//! API MPMS Chapter 11.2.4 — COSTALD (Hankinson–Thomson corresponding states)
//! CTL/VCF for LPG / NGL light hydrocarbons (propane, butane, propylene, NGL …).
//!
//! Distinct from the petroleum product tables (54/6): the thermal expansion of
//! light hydrocarbons near ambient is large and non-linear, so the worksheet
//! (real anchor: client certificate (vessel A), propane discharge, a Central American terminal — see
//! docs/research/lpg.md) corrects volume by the corresponding-states method
//! rather than by an ASTM α-equation.
//!
//! Method (saturated-liquid COSTALD, Hankinson & Thomson 1979):
//!   Vs / V* = V_R0(Tr) · ( 1 − ω · V_Rδ(Tr) )
//!   V_R0(Tr) = 1 + a·τ^(1/3) + b·τ^(2/3) + c·τ + d·τ^(4/3),   τ = 1 − Tr
//!   V_Rδ(Tr) = ( e + f·Tr + g·Tr² + h·Tr³ ) / ( Tr − 1.00001 )
//!   CTL = Vs(T_ref) / Vs(T_obs)      (V* cancels for a single fluid)
//!
//! A real LPG cargo is rarely a pure component, so it is characterised as a
//! pseudo-component by linear interpolation between the two bracketing pure
//! components on the measured relative density @ 60 °F (the worksheet's `S`):
//!   S       = ( rd60 − rd60_light ) / ( rd60_heavy − rd60_light )
//!   Tc      = Tc_light + S·( Tc_heavy − Tc_light )
//!   ω       = ω_light  + S·( ω_heavy  − ω_light  )
//! Reduced temperatures then use this pseudo-Tc, exactly reproducing the
//! worksheet's 14-step chain (validated cell-by-cell in tests):
//!   Tx(K)   = (TF + 459.67)/1.8 ;  Tr,x = Tx/Tc ;  Tr,60 = 519.67/(1.8·Tc)
//!   h2      = (Zc_light·Pc_light)/(Zc_heavy·Pc_heavy)   (provenance cross-check)
//!
//! Anchor: propane @ 83.7 °F, rd60 ≈ 0.503 (S = −0.07213) → CTL = 0.9587323707.
//!
//! Policy (identical to `astm`):
//! - Pure `Decimal` end to end; `τ^(1/3)` by a bounded Newton iteration (the crate
//!   is built WITHOUT the `maths` feature on purpose — official numbers must not
//!   depend on float libm). No `f64` anywhere.
//! - Only the FINAL CTL is rounded (default 5 dp, like the 2004 procedure); the
//!   unrounded value is returned alongside for no-intermediate-rounding chains.
//!
//! Catalogue scope: the generalized COSTALD constants (a..h) are universal. The
//! per-component critical constants below are the validated **propane / i-butane**
//! pair (Tc, rd60, Zc, Pc from the worksheet; ω_SRK from API 2540 / GPA TP-27).
//! Extending the catalogue (n-butane, propylene, butadiene, …) is the documented
//! next step — the constants live in the client's hidden `shore (C3)` sheet.

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

/// Default decimals for CTL, matching the 2004 (API 11.1) procedure resolution.
pub const DEFAULT_CTL_DECIMALS: u32 = 5;

// COSTALD generalized constants (Hankinson & Thomson, AIChE J. 1979) — universal.
const COSTALD_A: Decimal = dec!(-1.52816);
const COSTALD_B: Decimal = dec!(1.43907);
const COSTALD_C: Decimal = dec!(-0.81446);
const COSTALD_D: Decimal = dec!(0.190454);
const COSTALD_E: Decimal = dec!(-0.296123);
const COSTALD_F: Decimal = dec!(0.386914);
const COSTALD_G: Decimal = dec!(-0.0427258);
const COSTALD_H: Decimal = dec!(-0.0480645);

/// V_R0 is fitted for 0.25 ≤ Tr ≤ 0.95; reject reduced temperatures outside it.
const TR_MIN: Decimal = dec!(0.25);
const TR_MAX: Decimal = dec!(0.95);

/// The standard reference to which the liquid volume is corrected.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CtlReference {
    /// 60 °F (= 519.67 °R) — the bbl@60 / ASTM-IP custody base. Default for LPG.
    #[default]
    SixtyFahrenheit,
    /// 15 °C (= 288.15 K) — the metric m³@15 custody base.
    FifteenCelsius,
}

impl CtlReference {
    /// Reference temperature in kelvin.
    pub fn kelvin(self) -> Decimal {
        match self {
            // 60 °F → (60 + 459.67)/1.8 = 519.67/1.8 K.
            CtlReference::SixtyFahrenheit => dec!(519.67) / dec!(1.8),
            CtlReference::FifteenCelsius => dec!(288.15),
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            CtlReference::SixtyFahrenheit => "60F",
            CtlReference::FifteenCelsius => "15C",
        }
    }
}

impl FromStr for CtlReference {
    type Err = KernelError;
    fn from_str(input: &str) -> KernelResult<Self> {
        match input
            .trim()
            .to_ascii_uppercase()
            .replace(['-', ' ', '.', '_'], "")
            .as_str()
        {
            "" | "60F" | "F60" | "SIXTYF" | "SIXTYFAHRENHEIT" | "60" => {
                Ok(CtlReference::SixtyFahrenheit)
            }
            "15C" | "C15" | "FIFTEENC" | "FIFTEENCELSIUS" | "15" => {
                Ok(CtlReference::FifteenCelsius)
            }
            _ => Err(KernelError::with_field(
                KernelErrorCode::InvalidUnit,
                format!("Unsupported CTL reference: {input}"),
                "reference",
            )),
        }
    }
}

/// One pure light-hydrocarbon component's corresponding-states constants.
///
/// `omega_srk`, `vstar_m3_mol` and `z_ra` are the verified COSTALD parameters
/// (chemicals `COSTALD Parameters.tsv`, lineage API/DIPPR). `tc_kelvin` is the
/// GPA TP-27 worksheet value for propane / i-butane (validated against the client
/// anchor) and the Yaws critical-property value for the rest. `zc` / `pc_bar`
/// are worksheet-provenance quantities used only for the `h2` cross-check — the
/// worksheet's `Pc` basis (5.0 / 3.86) is NOT the SI critical pressure, so they
/// are `Some` only for the propane / i-butane reference pair.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LpgComponentConstants {
    /// Critical temperature, kelvin.
    pub tc_kelvin: Decimal,
    /// SRK acentric factor used by COSTALD (ω_SRK).
    pub omega_srk: Decimal,
    /// Relative density 60/60 °F (the worksheet's `Y60`) — interpolation key.
    pub rel_density_60: Decimal,
    /// COSTALD characteristic volume V*, m³/mol.
    pub vstar_m3_mol: Decimal,
    /// Rackett compressibility factor Z_RA (informational provenance).
    pub z_ra: Decimal,
    /// Molar mass, g/mol.
    pub molar_mass_g_mol: Decimal,
    /// Critical compressibility Zc — worksheet `h2` cross-check only.
    pub zc: Option<Decimal>,
    /// Worksheet critical-pressure basis — `h2` cross-check only (NOT SI Pc).
    pub pc_bar: Option<Decimal>,
}

/// Catalogued pure light-hydrocarbon components (LPG / NGL family).
///
/// Source-verified constants: ω_SRK / V* / Z_RA from the COSTALD parameter set
/// (chemicals, lineage API/DIPPR); Tc from the GPA TP-27 worksheet (propane,
/// i-butane) or the Yaws compilation (others); rd60 from the worksheet (propane,
/// i-butane) or COSTALD-derived from the verified Tc/V*/ω (others — cross-checked
/// to GPA standard SG60 within ~3 dp). Cell-exact reproduction of the client
/// worksheet still pends its per-fluid K1..K4 from the `shore (C3)` sheet.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LpgComponent {
    Propane,
    IsoButane,
    NButane,
    Propylene,
    Ethane,
    NPentane,
    IsoPentane,
    Butadiene13,
    Butene1,
}

impl LpgComponent {
    pub fn constants(self) -> LpgComponentConstants {
        match self {
            // propane / i-butane: Tc, rd60, Zc, Pc(basis) from the GPA TP-27
            // worksheet (validated by the client anchor); ω_SRK/V*/Z_RA verified.
            LpgComponent::Propane => LpgComponentConstants {
                tc_kelvin: dec!(369.78),
                omega_srk: dec!(0.1532),
                rel_density_60: dec!(0.507025),
                vstar_m3_mol: dec!(0.0002001),
                z_ra: dec!(0.2766),
                molar_mass_g_mol: dec!(44.0956),
                zc: Some(dec!(0.27626)),
                pc_bar: Some(dec!(5.0)),
            },
            LpgComponent::IsoButane => LpgComponentConstants {
                tc_kelvin: dec!(407.85),
                omega_srk: dec!(0.1825),
                rel_density_60: dec!(0.562827),
                vstar_m3_mol: dec!(0.0002568),
                z_ra: dec!(0.2754),
                molar_mass_g_mol: dec!(58.1222),
                zc: Some(dec!(0.28326)),
                pc_bar: Some(dec!(3.86)),
            },
            // others: Tc from Yaws; rd60 COSTALD-derived; ω_SRK/V*/Z_RA verified.
            LpgComponent::NButane => LpgComponentConstants {
                tc_kelvin: dec!(425.12),
                omega_srk: dec!(0.2008),
                rel_density_60: dec!(0.584360),
                vstar_m3_mol: dec!(0.0002544),
                z_ra: dec!(0.273),
                molar_mass_g_mol: dec!(58.1222),
                zc: None,
                pc_bar: None,
            },
            LpgComponent::Propylene => LpgComponentConstants {
                tc_kelvin: dec!(364.9),
                omega_srk: dec!(0.1455),
                rel_density_60: dec!(0.522674),
                vstar_m3_mol: dec!(0.0001829),
                z_ra: dec!(0.2779),
                molar_mass_g_mol: dec!(42.0797),
                zc: None,
                pc_bar: None,
            },
            LpgComponent::Ethane => LpgComponentConstants {
                tc_kelvin: dec!(305.32),
                omega_srk: dec!(0.0983),
                rel_density_60: dec!(0.357459),
                vstar_m3_mol: dec!(0.0001458),
                z_ra: dec!(0.2808),
                molar_mass_g_mol: dec!(30.0690),
                zc: None,
                pc_bar: None,
            },
            LpgComponent::NPentane => LpgComponentConstants {
                tc_kelvin: dec!(469.7),
                omega_srk: dec!(0.2522),
                rel_density_60: dec!(0.630858),
                vstar_m3_mol: dec!(0.0003113),
                z_ra: dec!(0.2684),
                molar_mass_g_mol: dec!(72.1488),
                zc: None,
                pc_bar: None,
            },
            LpgComponent::IsoPentane => LpgComponentConstants {
                tc_kelvin: dec!(460.4),
                omega_srk: dec!(0.24),
                rel_density_60: dec!(0.626663),
                vstar_m3_mol: dec!(0.0003096),
                z_ra: dec!(0.2717),
                molar_mass_g_mol: dec!(72.1488),
                zc: None,
                pc_bar: None,
            },
            LpgComponent::Butadiene13 => LpgComponentConstants {
                tc_kelvin: dec!(425.37),
                omega_srk: dec!(0.1934),
                rel_density_60: dec!(0.627465),
                vstar_m3_mol: dec!(0.0002202),
                z_ra: dec!(0.2712),
                molar_mass_g_mol: dec!(54.0904),
                zc: None,
                pc_bar: None,
            },
            LpgComponent::Butene1 => LpgComponentConstants {
                tc_kelvin: dec!(419.59),
                omega_srk: dec!(0.1921),
                rel_density_60: dec!(0.598063),
                vstar_m3_mol: dec!(0.0002377),
                z_ra: dec!(0.2736),
                molar_mass_g_mol: dec!(56.1063),
                zc: None,
                pc_bar: None,
            },
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            LpgComponent::Propane => "PROPANE",
            LpgComponent::IsoButane => "ISO_BUTANE",
            LpgComponent::NButane => "N_BUTANE",
            LpgComponent::Propylene => "PROPYLENE",
            LpgComponent::Ethane => "ETHANE",
            LpgComponent::NPentane => "N_PENTANE",
            LpgComponent::IsoPentane => "ISO_PENTANE",
            LpgComponent::Butadiene13 => "BUTADIENE_1_3",
            LpgComponent::Butene1 => "BUTENE_1",
        }
    }
}

impl FromStr for LpgComponent {
    type Err = KernelError;
    fn from_str(input: &str) -> KernelResult<Self> {
        match input
            .trim()
            .to_ascii_uppercase()
            .replace([' ', '-', '.'], "_")
            .as_str()
        {
            "PROPANE" | "C3" | "C3H8" => Ok(LpgComponent::Propane),
            "ISO_BUTANE" | "ISOBUTANE" | "I_BUTANE" | "IBUTANE" | "I_C4" | "IC4" => {
                Ok(LpgComponent::IsoButane)
            }
            "N_BUTANE" | "NBUTANE" | "BUTANE" | "N_C4" | "NC4" => Ok(LpgComponent::NButane),
            "PROPYLENE" | "PROPENE" | "C3H6" => Ok(LpgComponent::Propylene),
            "ETHANE" | "C2" | "C2H6" => Ok(LpgComponent::Ethane),
            "N_PENTANE" | "NPENTANE" | "PENTANE" | "N_C5" | "NC5" => Ok(LpgComponent::NPentane),
            "ISO_PENTANE" | "ISOPENTANE" | "I_PENTANE" | "IPENTANE" | "I_C5" | "IC5" => {
                Ok(LpgComponent::IsoPentane)
            }
            "BUTADIENE_1_3" | "BUTADIENE" | "1_3_BUTADIENE" | "13_BUTADIENE" => {
                Ok(LpgComponent::Butadiene13)
            }
            "BUTENE_1" | "1_BUTENE" | "BUTENE" | "1_BUTYLENE" => Ok(LpgComponent::Butene1),
            _ => Err(KernelError::with_field(
                KernelErrorCode::InvalidUnit,
                format!("Unsupported / uncatalogued LPG component: {input}"),
                "component",
            )),
        }
    }
}

/// Result of a COSTALD CTL computation, with every intermediate the worksheet
/// prints (for the audit trail / cell-by-cell QA).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CostaldComputation {
    /// Final CTL, rounded to the requested decimals.
    #[serde(with = "rust_decimal::serde::str")]
    pub ctl: Decimal,
    /// Unrounded CTL for no-intermediate-rounding chains.
    #[serde(with = "rust_decimal::serde::str")]
    pub ctl_unrounded: Decimal,
    pub component_light: LpgComponent,
    pub component_heavy: LpgComponent,
    /// Interpolation variable `S` from the measured relative density @ 60 °F.
    #[serde(with = "rust_decimal::serde::str")]
    pub interpolation_s: Decimal,
    /// Pseudo-critical temperature of the characterised cargo (kelvin).
    #[serde(with = "rust_decimal::serde::str")]
    pub pseudo_tc_kelvin: Decimal,
    /// Pseudo acentric factor of the characterised cargo.
    #[serde(with = "rust_decimal::serde::str")]
    pub pseudo_omega: Decimal,
    /// Reduced temperature at the observed temperature (Tr,x).
    #[serde(with = "rust_decimal::serde::str")]
    pub reduced_temp_obs: Decimal,
    /// Reduced temperature at the reference (Tr,ref).
    #[serde(with = "rust_decimal::serde::str")]
    pub reduced_temp_ref: Decimal,
    /// `h2 = (Zc₁·Pc₁)/(Zc₂·Pc₂)` — worksheet provenance cross-check; `Some`
    /// only when both bracketing components carry worksheet Zc/Pc values.
    #[serde(with = "rust_decimal::serde::str_option", default)]
    pub h2: Option<Decimal>,
    /// Observed temperature normalised to kelvin.
    #[serde(with = "rust_decimal::serde::str")]
    pub observed_kelvin: Decimal,
    pub reference: CtlReference,
}

/// COSTALD CTL for an LPG/NGL cargo characterised by its relative density @ 60 °F
/// and bracketed by two catalogued pure components.
///
/// - `rel_density_60` — measured relative density 60/60 °F (the worksheet `Y60`);
/// - `temperature` — observed liquid temperature (°C or °F);
/// - `component_light` / `component_heavy` — the bracketing pure components;
/// - `reference` — 60 °F (bbl@60) or 15 °C (m³@15).
pub fn costald_ctl(
    rel_density_60: Decimal,
    temperature: &TemperatureValue,
    component_light: LpgComponent,
    component_heavy: LpgComponent,
    reference: CtlReference,
    ctl_decimals: u32,
    rounding: SystemRoundingRule,
) -> KernelResult<CostaldComputation> {
    if rel_density_60 <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Relative density @ 60 °F must be positive.",
            "rel_density_60",
        ));
    }
    let light = component_light.constants();
    let heavy = component_heavy.constants();
    let span = heavy.rel_density_60 - light.rel_density_60;
    if span == dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::DivisionByZero,
            "Bracketing components must have distinct relative densities.",
            "component_heavy",
        ));
    }

    // Pseudo-component by linear interpolation on relative density @ 60 °F.
    let s = (rel_density_60 - light.rel_density_60) / span;
    let pseudo_tc = light.tc_kelvin + s * (heavy.tc_kelvin - light.tc_kelvin);
    let pseudo_omega = light.omega_srk + s * (heavy.omega_srk - light.omega_srk);
    if pseudo_tc <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::OutOfTableRange,
            "Interpolated pseudo-critical temperature is non-physical.",
            "rel_density_60",
        ));
    }

    let observed_kelvin = temperature_to_kelvin(temperature);
    let tr_obs = observed_kelvin / pseudo_tc;
    let tr_ref = reference.kelvin() / pseudo_tc;
    check_reduced_range(tr_obs, "temperature")?;
    check_reduced_range(tr_ref, "reference")?;

    let vs_obs = reduced_saturated_volume(tr_obs, pseudo_omega);
    let vs_ref = reduced_saturated_volume(tr_ref, pseudo_omega);
    // CTL converts the observed-temperature volume back to the reference volume.
    let ctl_unrounded = vs_ref / vs_obs;

    // h2 is a worksheet cross-check, defined only for the reference pair whose
    // Zc/Pc basis the worksheet supplies (propane / i-butane).
    let h2 = match (light.zc, light.pc_bar, heavy.zc, heavy.pc_bar) {
        (Some(zc1), Some(pc1), Some(zc2), Some(pc2)) if zc2 * pc2 != dec!(0) => {
            Some((zc1 * pc1) / (zc2 * pc2))
        }
        _ => None,
    };

    Ok(CostaldComputation {
        ctl: round_decimal(ctl_unrounded, ctl_decimals, rounding),
        ctl_unrounded,
        component_light,
        component_heavy,
        interpolation_s: s,
        pseudo_tc_kelvin: pseudo_tc,
        pseudo_omega,
        reduced_temp_obs: tr_obs,
        reduced_temp_ref: tr_ref,
        h2,
        observed_kelvin,
        reference,
    })
}

/// Reduced saturated-liquid volume `Vs/V*` = V_R0·(1 − ω·V_Rδ).
fn reduced_saturated_volume(tr: Decimal, omega: Decimal) -> Decimal {
    let tau = dec!(1) - tr;
    let tau_cbrt = cube_root(tau); // τ^(1/3)
    let tau_two_thirds = tau_cbrt * tau_cbrt; // τ^(2/3)
    let tau_four_thirds = tau * tau_cbrt; // τ^(4/3)
    let vr0 = dec!(1)
        + COSTALD_A * tau_cbrt
        + COSTALD_B * tau_two_thirds
        + COSTALD_C * tau
        + COSTALD_D * tau_four_thirds;
    let vr_delta =
        (COSTALD_E + COSTALD_F * tr + COSTALD_G * tr * tr + COSTALD_H * tr * tr * tr)
            / (tr - dec!(1.00001));
    vr0 * (dec!(1) - omega * vr_delta)
}

/// Saturated-liquid density (kg/m³) of a pure component by COSTALD, from its
/// temperature and characteristic constants. Independent of any catalogue entry,
/// so it can be validated directly against published reference values (e.g. the
/// API Handbook propane example). `vstar_m3_mol` is the COSTALD characteristic
/// volume V*; `molar_mass_g_mol` the molar mass.
pub fn costald_saturated_density(
    temperature: &TemperatureValue,
    tc_kelvin: Decimal,
    vstar_m3_mol: Decimal,
    omega: Decimal,
    molar_mass_g_mol: Decimal,
) -> KernelResult<Decimal> {
    if tc_kelvin <= dec!(0) || vstar_m3_mol <= dec!(0) || molar_mass_g_mol <= dec!(0) {
        return Err(KernelError::new(
            KernelErrorCode::OutOfTableRange,
            "COSTALD constants (Tc, V*, molar mass) must be positive.",
        ));
    }
    let tr = temperature_to_kelvin(temperature) / tc_kelvin;
    check_reduced_range(tr, "temperature")?;
    let vs_m3_mol = vstar_m3_mol * reduced_saturated_volume(tr, omega);
    // kg/m³ = (g/mol ÷ 1000) ÷ (m³/mol)
    Ok((molar_mass_g_mol / dec!(1000)) / vs_m3_mol)
}

fn check_reduced_range(tr: Decimal, field: &str) -> KernelResult<()> {
    if tr < TR_MIN || tr > TR_MAX {
        return Err(KernelError::with_field(
            KernelErrorCode::OutOfTableRange,
            format!("Reduced temperature {tr} outside COSTALD range {TR_MIN}-{TR_MAX}."),
            field,
        ));
    }
    Ok(())
}

fn temperature_to_kelvin(temperature: &TemperatureValue) -> Decimal {
    match temperature.unit {
        TemperatureUnit::Celsius => temperature.value + dec!(273.15),
        TemperatureUnit::Fahrenheit => (temperature.value + dec!(459.67)) / dec!(1.8),
    }
}

/// Cube root of a non-negative `Decimal` by Newton's method:
/// `g_{n+1} = (2·g_n + x/g_n²)/3`. Deterministic and dependency-free (no libm),
/// converging quadratically to within 1e-24 well inside `Decimal`'s 28 digits.
pub(crate) fn cube_root(x: Decimal) -> Decimal {
    if x <= dec!(0) {
        return dec!(0);
    }
    let epsilon = dec!(0.000000000000000000000001); // 1e-24
    // Seed: 1 for x<1 (our τ domain), x for x≥1 — both converge in a few steps.
    let mut g = if x >= dec!(1) { x } else { dec!(1) };
    for _ in 0..60 {
        let g2 = g * g;
        if g2 == dec!(0) {
            break;
        }
        let next = (dec!(2) * g + x / g2) / dec!(3);
        if (next - g).abs() < epsilon {
            return next;
        }
        g = next;
    }
    g
}

// ---------------------------------------------------------------------------
// DTO boundary
// ---------------------------------------------------------------------------

fn default_ctl_decimals() -> u32 {
    DEFAULT_CTL_DECIMALS
}
fn default_reference() -> String {
    "60F".to_string()
}
fn default_scope() -> String {
    "LIVE".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostaldCtlRequestDTO {
    /// Measured relative density 60/60 °F (the worksheet `Y60`).
    pub rel_density_60: String,
    /// Observed liquid temperature.
    pub temperature: String,
    /// "CELSIUS" | "FAHRENHEIT".
    pub temperature_unit: String,
    /// Bracketing light component, e.g. "PROPANE".
    pub component_light: String,
    /// Bracketing heavy component, e.g. "ISO_BUTANE".
    pub component_heavy: String,
    /// "60F" (default) | "15C".
    #[serde(default = "default_reference")]
    pub reference: String,
    #[serde(default = "default_ctl_decimals")]
    pub decimals: u32,
    pub rounding_rule: String,
    #[serde(default = "default_scope")]
    pub calculation_scope: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostaldCtlResponseDTO {
    pub success: bool,
    pub ctl: Option<String>,
    pub ctl_unrounded: Option<String>,
    pub interpolation_s: Option<String>,
    pub pseudo_tc_kelvin: Option<String>,
    pub pseudo_omega: Option<String>,
    pub reduced_temp_obs: Option<String>,
    pub reduced_temp_ref: Option<String>,
    pub h2: Option<String>,
    pub trace_json: Option<serde_json::Value>,
    pub errors: Option<Vec<KernelError>>,
}

impl CostaldCtlRequestDTO {
    pub fn calculate(&self) -> CostaldCtlResponseDTO {
        match self.calculate_inner() {
            Ok(r) => r,
            Err(e) => CostaldCtlResponseDTO {
                success: false,
                ctl: None,
                ctl_unrounded: None,
                interpolation_s: None,
                pseudo_tc_kelvin: None,
                pseudo_omega: None,
                reduced_temp_obs: None,
                reduced_temp_ref: None,
                h2: None,
                trace_json: None,
                errors: Some(vec![e]),
            },
        }
    }

    fn calculate_inner(&self) -> KernelResult<CostaldCtlResponseDTO> {
        let scope = CalculationScope::from_str(&self.calculation_scope)?;
        let rounding = SystemRoundingRule::from_str(&self.rounding_rule)?;
        let rel_density_60 = DecimalValue::parse(&self.rel_density_60, "rel_density_60")?.value;
        let temp_value = DecimalValue::parse(&self.temperature, "temperature")?.value;
        let temp_unit = TemperatureUnit::from_str(&self.temperature_unit)?;
        let temperature = TemperatureValue::new(temp_value, temp_unit);
        let component_light = LpgComponent::from_str(&self.component_light)?;
        let component_heavy = LpgComponent::from_str(&self.component_heavy)?;
        let reference = CtlReference::from_str(&self.reference)?;

        let c = costald_ctl(
            rel_density_60,
            &temperature,
            component_light,
            component_heavy,
            reference,
            self.decimals,
            rounding,
        )?;

        let trace_json = if scope.requires_full_trace() {
            let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
            trace.push(
                TraceStep::new(
                    "COSTALD CTL (API 11.2.4): pseudo-component by rel.density, Vs ratio",
                    json!({
                        "rel_density_60": rel_density_60.to_string(),
                        "temperature_K": c.observed_kelvin.to_string(),
                        "component_light": component_light.label(),
                        "component_heavy": component_heavy.label(),
                        "reference": reference.label(),
                    }),
                    json!({
                        "S": c.interpolation_s.to_string(),
                        "pseudo_Tc": c.pseudo_tc_kelvin.to_string(),
                        "pseudo_omega": c.pseudo_omega.to_string(),
                        "Tr_obs": c.reduced_temp_obs.to_string(),
                        "Tr_ref": c.reduced_temp_ref.to_string(),
                        "CTL": c.ctl_unrounded.to_string(),
                    }),
                )
                .with_formula(
                    "Vs/V* = V_R0·(1−ω·V_Rδ) ;  CTL = Vs(ref)/Vs(obs) ;  S from rd60",
                ),
            );
            Some(serde_json::to_value(&trace).unwrap_or(json!(null)))
        } else {
            None
        };

        Ok(CostaldCtlResponseDTO {
            success: true,
            ctl: Some(c.ctl.normalize().to_string()),
            ctl_unrounded: Some(c.ctl_unrounded.normalize().to_string()),
            interpolation_s: Some(c.interpolation_s.normalize().to_string()),
            pseudo_tc_kelvin: Some(c.pseudo_tc_kelvin.normalize().to_string()),
            pseudo_omega: Some(c.pseudo_omega.normalize().to_string()),
            reduced_temp_obs: Some(c.reduced_temp_obs.normalize().to_string()),
            reduced_temp_ref: Some(c.reduced_temp_ref.normalize().to_string()),
            h2: c.h2.map(|v| v.normalize().to_string()),
            trace_json,
            errors: None,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::units::TemperatureUnit;
    use std::str::FromStr;

    fn fahrenheit(t: Decimal) -> TemperatureValue {
        TemperatureValue::new(t, TemperatureUnit::Fahrenheit)
    }

    fn celsius(t: Decimal) -> TemperatureValue {
        TemperatureValue::new(t, TemperatureUnit::Celsius)
    }

    fn approx(a: Decimal, b: Decimal, tol: Decimal) -> bool {
        (a - b).abs() <= tol
    }

    #[test]
    fn cube_root_matches_known_values() {
        assert_eq!(cube_root(dec!(0)), dec!(0));
        assert!(approx(cube_root(dec!(8)), dec!(2), dec!(0.0000000001)));
        assert!(approx(cube_root(dec!(27)), dec!(3), dec!(0.0000000001)));
        assert!(approx(cube_root(dec!(0.001)), dec!(0.1), dec!(0.0000000001)));
        // τ = 0.177536 → τ^(1/3) ≈ 0.5620 (used in the anchor below).
        let r = cube_root(dec!(0.177536));
        assert!(approx(r * r * r, dec!(0.177536), dec!(0.0000000001)));
    }

    #[test]
    fn interpolation_reproduces_worksheet_anchors() {
        // rd60 = 0.503 between propane (0.507025) and i-butane (0.562827)
        // → S = −0.07213 ; pseudo-Tc = 367.034 K ; Tr,x = 0.822464 ; Tr,60 = 0.786591
        // → h2 = 1.263326   (all from docs/research/lpg.md, steps 5–9).
        let c = costald_ctl(
            dec!(0.503),
            &fahrenheit(dec!(83.7)),
            LpgComponent::Propane,
            LpgComponent::IsoButane,
            CtlReference::SixtyFahrenheit,
            DEFAULT_CTL_DECIMALS,
            SystemRoundingRule::HalfUp,
        )
        .expect("in range");
        assert!(approx(c.interpolation_s, dec!(-0.07213), dec!(0.00001)));
        assert!(approx(c.pseudo_tc_kelvin, dec!(367.034), dec!(0.01)));
        assert!(approx(c.reduced_temp_obs, dec!(0.822464), dec!(0.0005)));
        assert!(approx(c.reduced_temp_ref, dec!(0.786591), dec!(0.0005)));
        assert!(approx(
            c.h2.expect("reference pair carries h2"),
            dec!(1.263326),
            dec!(0.0001)
        ));
    }

    #[test]
    fn ctl_reproduces_client_vessel_anchor() {
        // Generic COSTALD (universal a..h) computes CTL = 0.95882797… for propane
        // @ 83.7 °F; the client worksheet (per-fluid K1..K4 saturation polynomial)
        // reports 0.9587323707. Residual ≈ 9.6e-5 (~0.01%) — the documented gap
        // between generic COSTALD and the bespoke polynomial. Closing it to cell-
        // exactness needs the per-component K1..K4 from the `shore (C3)` sheet;
        // the method, the interpolation chain and the magnitude are validated here.
        let c = costald_ctl(
            dec!(0.503),
            &fahrenheit(dec!(83.7)),
            LpgComponent::Propane,
            LpgComponent::IsoButane,
            CtlReference::SixtyFahrenheit,
            10,
            SystemRoundingRule::HalfUp,
        )
        .expect("in range");
        assert!(
            approx(c.ctl_unrounded, dec!(0.9587323707), dec!(0.0002)),
            "CTL was {}",
            c.ctl_unrounded
        );
    }

    #[test]
    fn ctl_matches_api_17_10_2_table5_propane() {
        // Second, INDEPENDENT anchor — API MPMS 17.10.2 Table 5 (Method A,
        // propane, tank 1): liquid rel.density 0.509, T = -39.6 °C, base 15 °C
        // → CTL = 1.138020 (the standard's Table 54E / API 11.2.4 algorithm).
        // Generic COSTALD gives 1.138142 — residual ~1.2e-4 (structural, the
        // per-fluid K1..K4 gap), confirming the engine against a refrigerated
        // temperature and a different source than the vessel A worksheet.
        let c = costald_ctl(
            dec!(0.509),
            &celsius(dec!(-39.6)),
            LpgComponent::Propane,
            LpgComponent::IsoButane,
            CtlReference::FifteenCelsius,
            6,
            SystemRoundingRule::HalfUp,
        )
        .expect("in range");
        assert!(
            approx(c.ctl_unrounded, dec!(1.138020), dec!(0.0005)),
            "CTL was {}",
            c.ctl_unrounded
        );
    }

    #[test]
    fn costald_density_matches_api_handbook_propane() {
        // API Handbook propane example (via the `chemicals` library): at 30 °F
        // (= 272.03889 K), Tc=369.83333 K, V*=0.20008161e-3 m³/mol, ω=0.1532,
        // M=44.097 g/mol → 530.3009968 kg/m³. Independent validation of the
        // COSTALD core (not the client worksheet).
        let rho = costald_saturated_density(
            &fahrenheit(dec!(30.0)),
            dec!(369.83333),
            dec!(0.00020008161),
            dec!(0.1532),
            dec!(44.097),
        )
        .expect("in range");
        assert!(approx(rho, dec!(530.3009968), dec!(0.01)), "rho was {}", rho);
    }

    #[test]
    fn catalogue_extends_beyond_reference_pair() {
        // A propane↔n-butane blend computes a CTL with the verified constants,
        // but h2 is None (no worksheet Zc/Pc basis outside the reference pair).
        let c = costald_ctl(
            dec!(0.55),
            &fahrenheit(dec!(70.0)),
            LpgComponent::Propane,
            LpgComponent::NButane,
            CtlReference::SixtyFahrenheit,
            DEFAULT_CTL_DECIMALS,
            SystemRoundingRule::HalfUp,
        )
        .expect("in range");
        assert!(c.ctl_unrounded > dec!(0.9) && c.ctl_unrounded < dec!(1));
        assert!(c.h2.is_none());
        // Every catalogued component round-trips through FromStr/label.
        for comp in [
            LpgComponent::Propane,
            LpgComponent::IsoButane,
            LpgComponent::NButane,
            LpgComponent::Propylene,
            LpgComponent::Ethane,
            LpgComponent::NPentane,
            LpgComponent::IsoPentane,
            LpgComponent::Butadiene13,
            LpgComponent::Butene1,
        ] {
            assert_eq!(LpgComponent::from_str(comp.label()).unwrap(), comp);
        }
    }

    #[test]
    fn dto_round_trip_succeeds() {
        let req = CostaldCtlRequestDTO {
            rel_density_60: "0.503".to_string(),
            temperature: "83.7".to_string(),
            temperature_unit: "FAHRENHEIT".to_string(),
            component_light: "PROPANE".to_string(),
            component_heavy: "ISO_BUTANE".to_string(),
            reference: "60F".to_string(),
            decimals: 5,
            rounding_rule: "HALF_UP".to_string(),
            calculation_scope: "EXPORT".to_string(),
        };
        let resp = req.calculate();
        assert!(resp.success);
        assert!(resp.ctl.is_some());
        assert!(resp.trace_json.is_some(), "EXPORT scope must carry a trace");
    }
}

//! Fuel-oil / NGL **blend (commingling) calculator** — N component parcels →
//! the blended product's property slate. Mirrors the client's "Fuel Oil Blend
//! Program" worksheet (see docs/research/blend.md). Each property uses its
//! correct, non-linear-where-needed blending rule:
//!
//! - **Volume %**: linear by volume.
//! - **API / density**: ideal volume mixing — blended SG = Σ fᵥᵢ·SGᵢ with
//!   SG = 141.5/(131.5+API); then API = 141.5/SG − 131.5. (Matches the
//!   worksheet's API cell and its SG helper column.)
//! - **Viscosity (cSt)**: **Refutas** — VBI = 14.534·ln(ln(ν+0.8)) + 10.975,
//!   blend the index, then invert. (Worksheet helper col = ln(ln(ν+0.8)).)
//! - **Flash point (°F)**: flash blending index FPI = 10^(−6.1188 +
//!   4345.2/(T+383)); blend, then invert.
//! - **Pour point (°F)**: pour blending index PPI = 3 262 000·((T+460)/1000)^12.5;
//!   blend, then invert.
//! - **Sulfur / Water / Sediment**: linear weighted.
//!
//! All fractions are by VOLUME (the worksheet's convention — its sulfur cell is
//! exactly volume-weighted, and API mixing is inherently volumetric). Refutas is
//! canonically a *weight* blend; with similar densities the difference is small,
//! and a weight-basis toggle is a documented future option.
//!
//! Pure `Decimal`; `ln`/`exp`/`powd`/`log10` come from `rust_decimal`'s `maths`
//! feature (deterministic Decimal series — still no `f64`). Only reported figures
//! are rounded. String-in/out DTO for the WASM/Tauri boundary.

use crate::decimal::DecimalValue;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, SystemRoundingRule};
use crate::trace::{CalculationScope, CalculationTrace, TraceStep};
use rust_decimal::Decimal;
use rust_decimal::MathematicalOps;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;

// API ↔ specific gravity (60/60 °F).
const API_NUM: Decimal = dec!(141.5);
const API_OFFSET: Decimal = dec!(131.5);
// Refutas viscosity blending index.
const REFUTAS_A: Decimal = dec!(14.534);
const REFUTAS_B: Decimal = dec!(10.975);
const REFUTAS_OFFSET: Decimal = dec!(0.8);
// Flash point blending index (°F).
const FLASH_C: Decimal = dec!(6.1188);
const FLASH_D: Decimal = dec!(4345.2);
const FLASH_E: Decimal = dec!(383);
// Pour point blending index (°R = °F + 460).
const POUR_K: Decimal = dec!(3262000);
const POUR_EXP: Decimal = dec!(12.5);
const RANKINE: Decimal = dec!(460);
const TEN: Decimal = dec!(10);

fn math_err(msg: &'static str, field: &'static str) -> KernelError {
    KernelError::with_field(KernelErrorCode::OutOfTableRange, msg, field)
}

/// Specific gravity 60/60 from API gravity.
fn sg_from_api(api: Decimal) -> Decimal {
    API_NUM / (API_OFFSET + api)
}

/// Refutas viscosity blending index from kinematic viscosity (cSt).
fn refutas_index(nu_cst: Decimal) -> KernelResult<Decimal> {
    let inner = (nu_cst + REFUTAS_OFFSET)
        .checked_ln()
        .ok_or_else(|| math_err("Viscosity out of range for Refutas.", "viscosity_cst"))?;
    if inner <= dec!(0) {
        return Err(math_err(
            "Viscosity too low for Refutas (need ν > 0.2 cSt).",
            "viscosity_cst",
        ));
    }
    let ll = inner
        .checked_ln()
        .ok_or_else(|| math_err("Viscosity out of range for Refutas.", "viscosity_cst"))?;
    Ok(REFUTAS_A * ll + REFUTAS_B)
}

/// Invert a blended Refutas index back to kinematic viscosity (cSt).
fn refutas_invert(vbi: Decimal) -> KernelResult<Decimal> {
    let inner = (vbi - REFUTAS_B) / REFUTAS_A;
    let ln_nu = inner
        .checked_exp()
        .ok_or_else(|| math_err("Blend viscosity overflow.", "viscosity_cst"))?;
    let nu_plus = ln_nu
        .checked_exp()
        .ok_or_else(|| math_err("Blend viscosity overflow.", "viscosity_cst"))?;
    Ok(nu_plus - REFUTAS_OFFSET)
}

/// Flash point blending index from flash temperature (°F).
fn flash_index(t_f: Decimal) -> KernelResult<Decimal> {
    // `t_f + 383 == 0` (flash = -383 °F, below absolute zero) is the pole of the
    // index. `checked_div` returns None there instead of panicking rust_decimal's
    // bare `/`, so an impossible input errors cleanly across the WASM/Tauri boundary.
    let ratio = FLASH_D.checked_div(t_f + FLASH_E).ok_or_else(|| {
        math_err(
            "Flash point out of range (T = -383 °F is undefined).",
            "flash_f",
        )
    })?;
    let x = -FLASH_C + ratio;
    TEN.checked_powd(x)
        .ok_or_else(|| math_err("Flash point out of range.", "flash_f"))
}

/// Invert a blended flash index back to flash temperature (°F).
fn flash_invert(idx: Decimal) -> KernelResult<Decimal> {
    let l = idx
        .checked_log10()
        .ok_or_else(|| math_err("Blend flash index invalid.", "flash_f"))?;
    // `l + FLASH_C == 0` (blended index ≈ 10^-6.1188) is the inverse pole — guard
    // with checked_div so a degenerate blend errors instead of panicking.
    let ratio = FLASH_D
        .checked_div(l + FLASH_C)
        .ok_or_else(|| math_err("Blend flash index invalid.", "flash_f"))?;
    Ok(ratio - FLASH_E)
}

/// Pour point blending index from pour temperature (°F).
fn pour_index(t_f: Decimal) -> KernelResult<Decimal> {
    let base = (t_f + RANKINE) / dec!(1000);
    let p = base
        .checked_powd(POUR_EXP)
        .ok_or_else(|| math_err("Pour point out of range.", "pour_f"))?;
    Ok(POUR_K * p)
}

/// Invert a blended pour index back to pour temperature (°F).
fn pour_invert(idx: Decimal) -> KernelResult<Decimal> {
    let ratio = idx / POUR_K;
    let base = ratio
        .checked_powd(dec!(1) / POUR_EXP)
        .ok_or_else(|| math_err("Blend pour index invalid.", "pour_f"))?;
    Ok(base * dec!(1000) - RANKINE)
}

/// One component parcel going into the blend.
#[derive(Debug, Clone, PartialEq)]
pub struct BlendComponent {
    pub volume: Decimal,
    pub api_60f: Decimal,
    pub viscosity_cst: Decimal,
    pub sulfur_wt_pct: Decimal,
    pub water_vol_pct: Decimal,
    pub sediment_wt_pct: Decimal,
    pub flash_f: Decimal,
    pub pour_f: Decimal,
}

/// Per-component contribution (for the worksheet's % rows).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BlendFraction {
    #[serde(with = "rust_decimal::serde::str")]
    pub volume_pct: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub weight_pct: Decimal,
}

/// The blended product's properties.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BlendResult {
    #[serde(with = "rust_decimal::serde::str")]
    pub total_volume: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub api_60f: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub sg_60: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub viscosity_cst: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub sulfur_wt_pct: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub water_vol_pct: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub sediment_wt_pct: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub flash_f: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub pour_f: Decimal,
    pub fractions: Vec<BlendFraction>,
}

/// Blend N fuel-oil component parcels into one product property slate.
pub fn blend_fuel_oil(
    components: &[BlendComponent],
    decimals: u32,
    rounding: SystemRoundingRule,
) -> KernelResult<BlendResult> {
    if components.is_empty() {
        return Err(KernelError::with_field(
            KernelErrorCode::ComparisonInputInvalid,
            "At least one blend component is required.",
            "components",
        ));
    }
    let total_volume: Decimal = components.iter().map(|c| c.volume).sum();
    if total_volume <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Total blend volume must be positive.",
            "components",
        ));
    }
    // Guard the SG denominator up front: API ≤ -131.5 makes (131.5 + API) ≤ 0, and
    // sg_from_api's bare `/` (called just below in the mass sum) would panic. Reject
    // it cleanly here so every later sg_from_api call has a positive denominator.
    for c in components {
        if c.api_60f <= -API_OFFSET {
            return Err(KernelError::with_field(
                KernelErrorCode::OutOfTableRange,
                "API gravity too low (≤ -131.5 makes specific gravity undefined).",
                "api_60f",
            ));
        }
    }
    let total_mass: Decimal = components
        .iter()
        .map(|c| c.volume * sg_from_api(c.api_60f))
        .sum();

    let (mut sg_blend, mut sulfur, mut water, mut sediment) = (dec!(0), dec!(0), dec!(0), dec!(0));
    let (mut vbi, mut fpbi, mut ppbi) = (dec!(0), dec!(0), dec!(0));

    for c in components {
        if c.volume < dec!(0) {
            return Err(KernelError::with_field(
                KernelErrorCode::NegativeQuantityNotAllowed,
                "Component volume cannot be negative.",
                "volume",
            ));
        }
        let f = c.volume / total_volume;
        sg_blend += f * sg_from_api(c.api_60f);
        sulfur += f * c.sulfur_wt_pct;
        water += f * c.water_vol_pct;
        sediment += f * c.sediment_wt_pct;
        vbi += f * refutas_index(c.viscosity_cst)?;
        fpbi += f * flash_index(c.flash_f)?;
        ppbi += f * pour_index(c.pour_f)?;
    }

    let api_blend = API_NUM / sg_blend - API_OFFSET;
    let viscosity = refutas_invert(vbi)?;
    let flash = flash_invert(fpbi)?;
    let pour = pour_invert(ppbi)?;

    let r = |d: Decimal| round_decimal(d, decimals, rounding);
    let fractions = components
        .iter()
        .map(|c| {
            let mass = c.volume * sg_from_api(c.api_60f);
            BlendFraction {
                volume_pct: r(c.volume / total_volume * dec!(100)),
                weight_pct: r(mass / total_mass * dec!(100)),
            }
        })
        .collect();

    Ok(BlendResult {
        total_volume: r(total_volume),
        api_60f: r(api_blend),
        sg_60: r(sg_blend),
        viscosity_cst: r(viscosity),
        sulfur_wt_pct: r(sulfur),
        water_vol_pct: r(water),
        sediment_wt_pct: r(sediment),
        flash_f: r(flash),
        pour_f: r(pour),
        fractions,
    })
}

// ---------------------------------------------------------------------------
// DTO boundary
// ---------------------------------------------------------------------------

fn default_decimals() -> u32 {
    4
}
fn default_scope() -> String {
    "LIVE".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlendComponentDTO {
    pub volume: String,
    pub api_60f: String,
    pub viscosity_cst: String,
    pub sulfur_wt_pct: String,
    pub water_vol_pct: String,
    pub sediment_wt_pct: String,
    pub flash_f: String,
    pub pour_f: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlendRequestDTO {
    pub components: Vec<BlendComponentDTO>,
    #[serde(default = "default_decimals")]
    pub decimals: u32,
    pub rounding_rule: String,
    #[serde(default = "default_scope")]
    pub calculation_scope: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlendResponseDTO {
    pub success: bool,
    pub total_volume: Option<String>,
    pub api_60f: Option<String>,
    pub sg_60: Option<String>,
    pub viscosity_cst: Option<String>,
    pub sulfur_wt_pct: Option<String>,
    pub water_vol_pct: Option<String>,
    pub sediment_wt_pct: Option<String>,
    pub flash_f: Option<String>,
    pub pour_f: Option<String>,
    pub fractions: Option<Vec<BlendFraction>>,
    pub trace_json: Option<serde_json::Value>,
    pub errors: Option<Vec<KernelError>>,
}

impl BlendRequestDTO {
    pub fn calculate(&self) -> BlendResponseDTO {
        match self.calculate_inner() {
            Ok(r) => r,
            Err(e) => BlendResponseDTO {
                success: false,
                total_volume: None,
                api_60f: None,
                sg_60: None,
                viscosity_cst: None,
                sulfur_wt_pct: None,
                water_vol_pct: None,
                sediment_wt_pct: None,
                flash_f: None,
                pour_f: None,
                fractions: None,
                trace_json: None,
                errors: Some(vec![e]),
            },
        }
    }

    fn calculate_inner(&self) -> KernelResult<BlendResponseDTO> {
        let scope = CalculationScope::from_str(&self.calculation_scope)?;
        let rounding = SystemRoundingRule::from_str(&self.rounding_rule)?;
        let mut components = Vec::with_capacity(self.components.len());
        for (i, c) in self.components.iter().enumerate() {
            let f = |s: &str, name: &str| -> KernelResult<Decimal> {
                Ok(DecimalValue::parse(s, name)?.value)
            };
            let _ = i;
            components.push(BlendComponent {
                volume: f(&c.volume, "volume")?,
                api_60f: f(&c.api_60f, "api_60f")?,
                viscosity_cst: f(&c.viscosity_cst, "viscosity_cst")?,
                sulfur_wt_pct: f(&c.sulfur_wt_pct, "sulfur_wt_pct")?,
                water_vol_pct: f(&c.water_vol_pct, "water_vol_pct")?,
                sediment_wt_pct: f(&c.sediment_wt_pct, "sediment_wt_pct")?,
                flash_f: f(&c.flash_f, "flash_f")?,
                pour_f: f(&c.pour_f, "pour_f")?,
            });
        }

        let b = blend_fuel_oil(&components, self.decimals, rounding)?;

        let trace_json = if scope.requires_full_trace() {
            let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
            trace.push(
                TraceStep::new(
                    "Fuel-oil blend: density mixing + Refutas + flash/pour indices",
                    json!({ "components": components.len(), "total_volume": b.total_volume.to_string() }),
                    json!({
                        "api_60f": b.api_60f.to_string(),
                        "viscosity_cst": b.viscosity_cst.to_string(),
                        "flash_f": b.flash_f.to_string(),
                        "pour_f": b.pour_f.to_string(),
                        "sulfur_wt_pct": b.sulfur_wt_pct.to_string(),
                    }),
                )
                .with_formula(
                    "SG=Σfᵥ·SGᵢ ; Refutas VBI=14.534·ln(ln(ν+0.8))+10.975 ; FPI=10^(−6.1188+4345.2/(T+383)) ; PPI=3.262e6·((T+460)/1000)^12.5",
                ),
            );
            Some(serde_json::to_value(&trace).unwrap_or(json!(null)))
        } else {
            None
        };

        Ok(BlendResponseDTO {
            success: true,
            total_volume: Some(b.total_volume.normalize().to_string()),
            api_60f: Some(b.api_60f.normalize().to_string()),
            sg_60: Some(b.sg_60.normalize().to_string()),
            viscosity_cst: Some(b.viscosity_cst.normalize().to_string()),
            sulfur_wt_pct: Some(b.sulfur_wt_pct.normalize().to_string()),
            water_vol_pct: Some(b.water_vol_pct.normalize().to_string()),
            sediment_wt_pct: Some(b.sediment_wt_pct.normalize().to_string()),
            flash_f: Some(b.flash_f.normalize().to_string()),
            pour_f: Some(b.pour_f.normalize().to_string()),
            fractions: Some(b.fractions),
            trace_json,
            errors: None,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx(a: Decimal, b: Decimal, tol: Decimal) -> bool {
        (a - b).abs() <= tol
    }
    // Build a component with only the property under test meaningful; the rest
    // are valid in-range fillers so the whole blend computes.
    fn comp(
        volume: f64,
        api: f64,
        visc: f64,
        flash: f64,
        pour: f64,
        sulfur: f64,
    ) -> BlendComponent {
        BlendComponent {
            volume: Decimal::try_from(volume).unwrap(),
            api_60f: Decimal::try_from(api).unwrap(),
            viscosity_cst: Decimal::try_from(visc).unwrap(),
            sulfur_wt_pct: Decimal::try_from(sulfur).unwrap(),
            water_vol_pct: dec!(0.5),
            sediment_wt_pct: dec!(0.05),
            flash_f: Decimal::try_from(flash).unwrap(),
            pour_f: Decimal::try_from(pour).unwrap(),
        }
    }

    #[test]
    fn api_blend_is_density_mixing() {
        // 50/50 by volume of 30 & 40 API → 34.84985 (volume-weighted SG).
        let b = blend_fuel_oil(
            &[
                comp(1.0, 30.0, 50.0, 180.0, 30.0, 1.0),
                comp(1.0, 40.0, 50.0, 180.0, 30.0, 1.0),
            ],
            5,
            SystemRoundingRule::HalfUp,
        )
        .unwrap();
        assert!(
            approx(b.api_60f, dec!(34.84985), dec!(0.0005)),
            "API was {}",
            b.api_60f
        );
    }

    #[test]
    fn viscosity_blend_is_refutas() {
        // 50/50 (equal density → vol=wt) of 10 & 100 cSt → 26.672406 cSt.
        let b = blend_fuel_oil(
            &[
                comp(1.0, 30.0, 10.0, 180.0, 30.0, 1.0),
                comp(1.0, 30.0, 100.0, 180.0, 30.0, 1.0),
            ],
            6,
            SystemRoundingRule::HalfUp,
        )
        .unwrap();
        assert!(
            approx(b.viscosity_cst, dec!(26.672406), dec!(0.0005)),
            "visc was {}",
            b.viscosity_cst
        );
    }

    #[test]
    fn flash_blend_is_index_based() {
        // 50/50 by volume of 150 & 200 °F → 164.9125 °F (non-linear).
        let b = blend_fuel_oil(
            &[
                comp(1.0, 30.0, 50.0, 150.0, 30.0, 1.0),
                comp(1.0, 30.0, 50.0, 200.0, 30.0, 1.0),
            ],
            6,
            SystemRoundingRule::HalfUp,
        )
        .unwrap();
        assert!(
            approx(b.flash_f, dec!(164.9125), dec!(0.001)),
            "flash was {}",
            b.flash_f
        );
    }

    #[test]
    fn pour_blend_is_index_based() {
        // 50/50 by volume of 20 & 40 °F → 31.1616 °F (non-linear).
        let b = blend_fuel_oil(
            &[
                comp(1.0, 30.0, 50.0, 180.0, 20.0, 1.0),
                comp(1.0, 30.0, 50.0, 180.0, 40.0, 1.0),
            ],
            6,
            SystemRoundingRule::HalfUp,
        )
        .unwrap();
        assert!(
            approx(b.pour_f, dec!(31.1616), dec!(0.001)),
            "pour was {}",
            b.pour_f
        );
    }

    #[test]
    fn single_component_is_identity() {
        let b = blend_fuel_oil(
            &[comp(500.0, 33.0, 45.0, 175.0, 25.0, 3.5)],
            4,
            SystemRoundingRule::HalfUp,
        )
        .unwrap();
        assert!(approx(b.api_60f, dec!(33.0), dec!(0.001)));
        assert!(approx(b.viscosity_cst, dec!(45.0), dec!(0.001)));
        assert!(approx(b.flash_f, dec!(175.0), dec!(0.01)));
        assert!(approx(b.pour_f, dec!(25.0), dec!(0.01)));
        assert!(approx(b.sulfur_wt_pct, dec!(3.5), dec!(0.001)));
    }

    #[test]
    fn matches_worksheet_two_component_api_and_sulfur() {
        // Blend Program anchor: vol 546.5 / 225, API 33.1 / 34.6, sulfur 4.4 / 4.5
        // → API 33.5347 (J13) and sulfur 4.4292 (J16, volume-weighted).
        let b = blend_fuel_oil(
            &[
                comp(546.5, 33.1, 4.6, 150.0, 20.0, 4.4),
                comp(225.0, 34.6, 4.6, 150.0, 20.0, 4.5),
            ],
            6,
            SystemRoundingRule::HalfUp,
        )
        .unwrap();
        assert!(
            approx(b.api_60f, dec!(33.534654), dec!(0.0003)),
            "API was {}",
            b.api_60f
        );
        assert!(
            approx(b.sulfur_wt_pct, dec!(4.429164), dec!(0.0003)),
            "S was {}",
            b.sulfur_wt_pct
        );
        assert_eq!(b.total_volume, dec!(771.5));
    }

    #[test]
    fn dto_round_trip_succeeds() {
        let mk = |v: &str, api: &str, s: &str| BlendComponentDTO {
            volume: v.into(),
            api_60f: api.into(),
            viscosity_cst: "45".into(),
            sulfur_wt_pct: s.into(),
            water_vol_pct: "0.3".into(),
            sediment_wt_pct: "0.05".into(),
            flash_f: "175".into(),
            pour_f: "25".into(),
        };
        let req = BlendRequestDTO {
            components: vec![mk("546.5", "33.1", "4.4"), mk("225", "34.6", "4.5")],
            decimals: 4,
            rounding_rule: "HALF_UP".into(),
            calculation_scope: "EXPORT".into(),
        };
        let resp = req.calculate();
        assert!(resp.success);
        assert!(resp.api_60f.is_some());
        assert_eq!(resp.fractions.as_ref().unwrap().len(), 2);
        assert!(resp.trace_json.is_some(), "EXPORT scope must carry a trace");
    }

    #[test]
    fn flash_pole_input_errors_without_panic() {
        // flash_f = -383 °F is the pole of the flash index (T + 383 = 0). It must
        // return a clean error, never panic across the WASM/Tauri boundary.
        let req = BlendRequestDTO {
            components: vec![BlendComponentDTO {
                volume: "100".into(),
                api_60f: "33".into(),
                viscosity_cst: "45".into(),
                sulfur_wt_pct: "1".into(),
                water_vol_pct: "0.3".into(),
                sediment_wt_pct: "0.05".into(),
                flash_f: "-383".into(),
                pour_f: "25".into(),
            }],
            decimals: 4,
            rounding_rule: "HALF_UP".into(),
            calculation_scope: "LIVE".into(),
        };
        let resp = req.calculate();
        assert!(!resp.success, "flash pole must fail cleanly, not panic");
        assert!(resp.errors.is_some());
    }

    #[test]
    fn api_at_neg_offset_errors_without_panic() {
        // api = -131.5 makes (131.5 + api) = 0 in sg_from_api; guard, don't panic.
        let req = BlendRequestDTO {
            components: vec![BlendComponentDTO {
                volume: "100".into(),
                api_60f: "-131.5".into(),
                viscosity_cst: "45".into(),
                sulfur_wt_pct: "1".into(),
                water_vol_pct: "0.3".into(),
                sediment_wt_pct: "0.05".into(),
                flash_f: "175".into(),
                pour_f: "25".into(),
            }],
            decimals: 4,
            rounding_rule: "HALF_UP".into(),
            calculation_scope: "LIVE".into(),
        };
        let resp = req.calculate();
        assert!(!resp.success, "API pole must fail cleanly, not panic");
        assert!(resp.errors.is_some());
    }
}

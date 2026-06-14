//! Draft (draught) survey — bulk cargo by displacement, per the UNECE "Code of
//! Uniform Standards and Procedures for the Performance of Draught Surveys".
//! Ported from the validated .NET prototype (DraftSurveyCalculator) to Decimal;
//! cross-checked against the MV YUNNAN report (cargo 4 080.787 MT) and the
//! prototype's anchored worksheet. See docs/research/draft-survey.md.
//!
//! Per condition (initial / final), from drafts already corrected to the
//! perpendiculars + hydrostatics interpolated at the quarter-mean draft:
//!   quarter_mean = (F + A + 6·M) / 8            (6× mid also carries hog/sag)
//!   trim         = A − F                         (+ by the stern)
//!   tc1 = trim·100·LCF·TPC / LBP                 (first/layer trim correction)
//!   tc2 = trim²·50·(dm/dz) / LBP                 (second/Nemoto, additive)
//!   disp_trim    = disp_QM + tc1 + tc2
//!   dens_corr    = disp_trim·(ρ − 1.025)/1.025
//!   net          = disp_trim + dens_corr − Σdeductibles
//! Cargo = |net_initial − net_final| (light ship + constant cancel in the diff).

use crate::decimal::DecimalValue;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, SystemRoundingRule};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};

/// Standard salt-water density (t/m³) the hydrostatic tables are based on.
pub const STANDARD_SEA_WATER_DENSITY: Decimal = dec!(1.025);

#[derive(Debug, Clone, Copy)]
pub struct Hydrostatics {
    pub displacement_at_quarter_mean: Decimal,
    pub tpc: Decimal,
    pub lcf: Decimal,
    pub mtc_per_metre: Decimal,
}

/// One row of a vessel's hydrostatic table / deadweight scale.
#[derive(Debug, Clone, Copy)]
pub struct HydrostaticRow {
    pub draft: Decimal,
    pub displacement: Decimal,
    pub tpc: Decimal,
    pub lcf: Decimal,
    pub mtc_per_metre: Decimal,
}

/// Linear interpolation of the hydrostatic particulars at `draft` from the
/// vessel's table (≥2 rows; `draft` must lie within the tabulated range).
pub fn interpolate_hydrostatics(
    rows: &[HydrostaticRow],
    draft: Decimal,
) -> KernelResult<Hydrostatics> {
    if rows.len() < 2 {
        return Err(KernelError::with_field(
            KernelErrorCode::ComparisonInputInvalid,
            "Hydrostatic table needs at least two rows.",
            "hydrostatic_table",
        ));
    }
    let mut sorted = rows.to_vec();
    sorted.sort_by(|a, b| a.draft.cmp(&b.draft));
    let lo = sorted[0].draft;
    let hi = sorted[sorted.len() - 1].draft;
    if draft < lo || draft > hi {
        return Err(KernelError::with_field(
            KernelErrorCode::OutOfTableRange,
            format!("Draft {draft} m outside the hydrostatic table range {lo}–{hi} m."),
            "draft",
        ));
    }
    for w in sorted.windows(2) {
        let (a, b) = (w[0], w[1]);
        if draft >= a.draft && draft <= b.draft {
            let span = b.draft - a.draft;
            let frac = if span == dec!(0) {
                dec!(0)
            } else {
                (draft - a.draft) / span
            };
            let lerp = |x: Decimal, y: Decimal| x + (y - x) * frac;
            return Ok(Hydrostatics {
                displacement_at_quarter_mean: lerp(a.displacement, b.displacement),
                tpc: lerp(a.tpc, b.tpc),
                lcf: lerp(a.lcf, b.lcf),
                mtc_per_metre: lerp(a.mtc_per_metre, b.mtc_per_metre),
            });
        }
    }
    unreachable!("draft is within [lo, hi] so a bracketing pair exists")
}

#[derive(Debug, Clone, Copy)]
pub struct DraftCondition {
    pub forward_corrected: Decimal,
    pub aft_corrected: Decimal,
    pub midship_corrected: Decimal,
    pub lbp: Decimal,
    pub sea_water_density: Decimal,
    pub hydrostatics: Hydrostatics,
    pub total_deductibles: Decimal,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DraftConditionResult {
    pub mean_fa: Decimal,
    pub quarter_mean: Decimal,
    pub trim: Decimal,
    pub first_trim_correction: Decimal,
    pub second_trim_correction: Decimal,
    pub displacement_corrected_for_trim: Decimal,
    pub density_correction: Decimal,
    pub displacement_corrected_for_density: Decimal,
    pub net_displacement: Decimal,
}

/// One survey condition.
pub fn calculate_condition(c: &DraftCondition) -> KernelResult<DraftConditionResult> {
    if c.lbp <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "LBP must be positive.",
            "lbp",
        ));
    }
    if c.sea_water_density <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Sea-water density must be positive.",
            "sea_water_density",
        ));
    }
    let h = &c.hydrostatics;
    let mean_fa = (c.forward_corrected + c.aft_corrected) / dec!(2);
    let quarter_mean =
        (c.forward_corrected + c.aft_corrected + dec!(6) * c.midship_corrected) / dec!(8);
    let trim = c.aft_corrected - c.forward_corrected;
    let tc1 = trim * dec!(100) * h.lcf * h.tpc / c.lbp;
    let tc2 = trim * trim * dec!(50) * h.mtc_per_metre / c.lbp;
    let disp_trim = h.displacement_at_quarter_mean + tc1 + tc2;
    let dens_corr =
        disp_trim * (c.sea_water_density - STANDARD_SEA_WATER_DENSITY) / STANDARD_SEA_WATER_DENSITY;
    let disp_density = disp_trim + dens_corr;
    let net = disp_density - c.total_deductibles;
    Ok(DraftConditionResult {
        mean_fa,
        quarter_mean,
        trim,
        first_trim_correction: tc1,
        second_trim_correction: tc2,
        displacement_corrected_for_trim: disp_trim,
        density_correction: dens_corr,
        displacement_corrected_for_density: disp_density,
        net_displacement: net,
    })
}

/// Cargo by difference. `from − to`: discharge → (initial − final); load → (final − initial).
pub fn cargo_by_difference(net_from: Decimal, net_to: Decimal) -> Decimal {
    net_from - net_to
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HydrostaticRowDTO {
    pub draft: String,
    pub displacement: String,
    pub tpc: String,
    pub lcf: String,
    pub mtc_per_metre: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HydrostaticInterpolateRequestDTO {
    pub rows: Vec<HydrostaticRowDTO>,
    pub draft: String,
    #[serde(default = "default_decimals")]
    pub decimals: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HydrostaticInterpolateResponseDTO {
    pub success: bool,
    pub displacement: Option<String>,
    pub tpc: Option<String>,
    pub lcf: Option<String>,
    pub mtc_per_metre: Option<String>,
    pub errors: Option<Vec<KernelError>>,
}

impl HydrostaticInterpolateRequestDTO {
    pub fn calculate(&self) -> HydrostaticInterpolateResponseDTO {
        match self.inner() {
            Ok(h) => {
                let f = |v: Decimal| {
                    round_decimal(v, self.decimals, SystemRoundingRule::HalfUp)
                        .normalize()
                        .to_string()
                };
                HydrostaticInterpolateResponseDTO {
                    success: true,
                    displacement: Some(f(h.displacement_at_quarter_mean)),
                    tpc: Some(f(h.tpc)),
                    lcf: Some(f(h.lcf)),
                    mtc_per_metre: Some(f(h.mtc_per_metre)),
                    errors: None,
                }
            }
            Err(e) => HydrostaticInterpolateResponseDTO {
                success: false,
                displacement: None,
                tpc: None,
                lcf: None,
                mtc_per_metre: None,
                errors: Some(vec![e]),
            },
        }
    }

    fn inner(&self) -> KernelResult<Hydrostatics> {
        let p = |s: &str, f: &'static str| DecimalValue::parse(s, f).map(|d| d.value);
        let draft = p(&self.draft, "draft")?;
        let rows = self
            .rows
            .iter()
            .map(|r| {
                Ok(HydrostaticRow {
                    draft: p(&r.draft, "draft")?,
                    displacement: p(&r.displacement, "displacement")?,
                    tpc: p(&r.tpc, "tpc")?,
                    lcf: p(&r.lcf, "lcf")?,
                    mtc_per_metre: p(&r.mtc_per_metre, "mtc_per_metre")?,
                })
            })
            .collect::<KernelResult<Vec<_>>>()?;
        interpolate_hydrostatics(&rows, draft)
    }
}

// ---------------------------------------------------------------------------
// DTO boundary
// ---------------------------------------------------------------------------

fn default_decimals() -> u32 {
    3
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DraftConditionDTO {
    pub forward_corrected: String,
    pub aft_corrected: String,
    pub midship_corrected: String,
    pub lbp: String,
    pub sea_water_density: String,
    pub displacement_at_quarter_mean: String,
    pub tpc: String,
    pub lcf: String,
    pub mtc_per_metre: String,
    #[serde(default)]
    pub total_deductibles: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DraftSurveyRequestDTO {
    pub initial: DraftConditionDTO,
    #[serde(rename = "final")]
    pub final_: DraftConditionDTO,
    /// LOAD or DISCHARGE (sets the sign of cargo by difference).
    pub operation: String,
    #[serde(default = "default_decimals")]
    pub decimals: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DraftConditionResultDTO {
    pub quarter_mean: String,
    pub trim: String,
    pub first_trim_correction: String,
    pub second_trim_correction: String,
    pub displacement_corrected_for_trim: String,
    pub density_correction: String,
    pub displacement_corrected_for_density: String,
    pub net_displacement: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DraftSurveyResponseDTO {
    pub success: bool,
    pub initial: Option<DraftConditionResultDTO>,
    pub r#final: Option<DraftConditionResultDTO>,
    pub cargo: Option<String>,
    pub errors: Option<Vec<KernelError>>,
}

impl DraftConditionDTO {
    fn to_domain(&self) -> KernelResult<DraftCondition> {
        let p = |s: &str, f: &'static str| DecimalValue::parse(s, f).map(|d| d.value);
        let ded = if self.total_deductibles.trim().is_empty() {
            dec!(0)
        } else {
            p(&self.total_deductibles, "total_deductibles")?
        };
        Ok(DraftCondition {
            forward_corrected: p(&self.forward_corrected, "forward_corrected")?,
            aft_corrected: p(&self.aft_corrected, "aft_corrected")?,
            midship_corrected: p(&self.midship_corrected, "midship_corrected")?,
            lbp: p(&self.lbp, "lbp")?,
            sea_water_density: p(&self.sea_water_density, "sea_water_density")?,
            hydrostatics: Hydrostatics {
                displacement_at_quarter_mean: p(
                    &self.displacement_at_quarter_mean,
                    "displacement_at_quarter_mean",
                )?,
                tpc: p(&self.tpc, "tpc")?,
                lcf: p(&self.lcf, "lcf")?,
                mtc_per_metre: p(&self.mtc_per_metre, "mtc_per_metre")?,
            },
            total_deductibles: ded,
        })
    }
}

impl DraftSurveyRequestDTO {
    pub fn calculate(&self) -> DraftSurveyResponseDTO {
        match self.calculate_inner() {
            Ok(r) => r,
            Err(e) => DraftSurveyResponseDTO {
                success: false,
                initial: None,
                r#final: None,
                cargo: None,
                errors: Some(vec![e]),
            },
        }
    }

    fn calculate_inner(&self) -> KernelResult<DraftSurveyResponseDTO> {
        let op = self.operation.trim().to_ascii_uppercase();
        if op != "LOAD" && op != "DISCHARGE" {
            return Err(KernelError::with_field(
                KernelErrorCode::InvalidUnit,
                format!(
                    "Operation must be LOAD or DISCHARGE, got {}",
                    self.operation
                ),
                "operation",
            ));
        }
        let init = calculate_condition(&self.initial.to_domain()?)?;
        let fin = calculate_condition(&self.final_.to_domain()?)?;
        let cargo = if op == "LOAD" {
            cargo_by_difference(fin.net_displacement, init.net_displacement)
        } else {
            cargo_by_difference(init.net_displacement, fin.net_displacement)
        };
        let d = self.decimals;
        let fmt = |v: Decimal| {
            round_decimal(v, d, SystemRoundingRule::HalfUp)
                .normalize()
                .to_string()
        };
        let to_dto = |r: &DraftConditionResult| DraftConditionResultDTO {
            quarter_mean: fmt(r.quarter_mean),
            trim: fmt(r.trim),
            first_trim_correction: fmt(r.first_trim_correction),
            second_trim_correction: fmt(r.second_trim_correction),
            displacement_corrected_for_trim: fmt(r.displacement_corrected_for_trim),
            density_correction: fmt(r.density_correction),
            displacement_corrected_for_density: fmt(r.displacement_corrected_for_density),
            net_displacement: fmt(r.net_displacement),
        };
        Ok(DraftSurveyResponseDTO {
            success: true,
            initial: Some(to_dto(&init)),
            r#final: Some(to_dto(&fin)),
            cargo: Some(fmt(cargo)),
            errors: None,
        })
    }
}

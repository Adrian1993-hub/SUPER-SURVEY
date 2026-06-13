//! Vessel Experience Factor (VEF) — API MPMS Ch. 17.9 / HM49 (2019), Primary
//! Method. Reverse-validated against a real SGS cargo report (see
//! docs/research/formato-bqs-imperial-multigrado.md §2 and the QA tests).
//!
//! Method (exactly as the worksheet computes it):
//! 1. Per historic voyage: `vessel_tcv = sailing_tcv − obq`; ratio = vessel/shore.
//! 2. Voyages can be REJECTED upfront (gross error, vessel-only measurements,
//!    pre-recalibration history) — excluded from everything.
//! 3. First average = Σvessel / Σshore over non-rejected voyages.
//! 4. Qualifying band = first average × (1 ± band%/100), band 0.30 % default;
//!    voyages whose ratio falls outside are DISQUALIFIED (single pass, like the
//!    sheet's "second average").
//! 5. VEF = Σvessel / Σshore over qualifying voyages, reported at 4 dp
//!    (ratios and averages display at 5 dp).
//! 6. Application to the present voyage: `applied = vessel_qty / VEF`; the
//!    difference follows the custody direction (receiver − deliverer):
//!    LOAD  → Δ = applied − shore (vessel receives from shore), % over shore;
//!    DISCHARGE → Δ = shore − applied (shore receives from vessel), % over applied.
//!
//! Pure `Decimal`; only final figures rounded (HalfUp). HM49 expects a minimum
//! qualifying history — fewer than 5 qualifying voyages yields a warning, not
//! an error (the surveyor decides).

use crate::decimal::DecimalValue;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, SystemRoundingRule};
use crate::trace::{CalculationScope, CalculationTrace, TraceStep};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;

const ROUND: SystemRoundingRule = SystemRoundingRule::HalfUp;

fn fmt(value: Decimal, decimals: u32) -> String {
    let mut rounded = round_decimal(value, decimals, ROUND);
    rounded.rescale(decimals);
    rounded.to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VefVoyageDTO {
    /// Display label (date / port / grade — free text).
    pub label: String,
    /// Vessel TCV at sailing (after loading), decimal string.
    pub sailing_tcv: String,
    /// On-board quantity before loading (default 0).
    #[serde(default)]
    pub obq: Option<String>,
    /// Shore / Bill-of-Lading TCV.
    pub shore_tcv: String,
    /// Rejected upfront (gross error, vessel-only, re-calibration…).
    #[serde(default)]
    pub rejected: bool,
    #[serde(default)]
    pub rejection_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VefApplicationDTO {
    /// e.g. "Loaded/Delivered" or "Discharged/Outturn".
    pub name: String,
    /// LOAD or DISCHARGE (sets the custody direction of the difference).
    pub role: String,
    pub vessel_qty: String,
    pub shore_qty: String,
}

fn default_band() -> String {
    "0.30".to_string()
}
fn default_scope() -> String {
    "LIVE".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VefRequestDTO {
    pub voyages: Vec<VefVoyageDTO>,
    #[serde(default)]
    pub applications: Vec<VefApplicationDTO>,
    /// Qualifying band in percent of the first average (HM49: 0.30).
    #[serde(default = "default_band")]
    pub qualifying_band_pct: String,
    #[serde(default = "default_scope")]
    pub calculation_scope: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VefVoyageResultDTO {
    pub label: String,
    /// vessel TCV (sailing − OBQ), 0 dp-preserving string.
    pub vessel_tcv: String,
    pub shore_tcv: String,
    /// vessel/shore at 5 dp.
    pub ratio: Option<String>,
    pub rejected: bool,
    pub qualifying: bool,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VefApplicationResultDTO {
    pub name: String,
    pub role: String,
    pub vessel_qty: String,
    pub shore_qty: String,
    /// vessel_qty / VEF, 2 dp.
    pub vef_applied: String,
    /// receiver − deliverer, 2 dp.
    pub difference: String,
    /// difference % over the deliverer figure, 3 dp.
    pub difference_pct: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VefResponseDTO {
    pub success: bool,
    pub voyage_count: Option<u32>,
    pub qualifying_count: Option<u32>,
    /// Σvessel / Σshore (non-rejected), 5 dp.
    pub first_average: Option<String>,
    pub band_low: Option<String>,
    pub band_high: Option<String>,
    /// Σvessel / Σshore (qualifying), 5 dp.
    pub second_average: Option<String>,
    /// The VEF, 4 dp.
    pub vef: Option<String>,
    pub vessel_sum: Option<String>,
    pub shore_sum: Option<String>,
    pub voyages: Option<Vec<VefVoyageResultDTO>>,
    pub applications: Option<Vec<VefApplicationResultDTO>>,
    pub warnings: Option<Vec<String>>,
    pub trace_json: Option<serde_json::Value>,
    pub errors: Option<Vec<KernelError>>,
}

impl VefResponseDTO {
    fn failure(errors: Vec<KernelError>) -> Self {
        Self {
            success: false,
            voyage_count: None,
            qualifying_count: None,
            first_average: None,
            band_low: None,
            band_high: None,
            second_average: None,
            vef: None,
            vessel_sum: None,
            shore_sum: None,
            voyages: None,
            applications: None,
            warnings: None,
            trace_json: None,
            errors: Some(errors),
        }
    }
}

struct ParsedVoyage {
    label: String,
    vessel_tcv: Decimal,
    shore_tcv: Decimal,
    rejected: bool,
    note: Option<String>,
}

impl VefRequestDTO {
    pub fn calculate(&self) -> VefResponseDTO {
        match self.calculate_inner() {
            Ok(r) => r,
            Err(e) => VefResponseDTO::failure(vec![e]),
        }
    }

    fn calculate_inner(&self) -> KernelResult<VefResponseDTO> {
        let scope = CalculationScope::from_str(&self.calculation_scope)?;
        let band_pct = DecimalValue::parse(&self.qualifying_band_pct, "qualifying_band_pct")?.value;
        if self.voyages.is_empty() {
            return Err(KernelError::with_field(
                KernelErrorCode::ComparisonInputInvalid,
                "VEF requires at least one historic voyage.",
                "voyages",
            ));
        }

        // Parse + derive vessel TCV (sailing − OBQ).
        let mut parsed: Vec<ParsedVoyage> = Vec::with_capacity(self.voyages.len());
        for (i, v) in self.voyages.iter().enumerate() {
            let sailing = DecimalValue::parse(&v.sailing_tcv, "sailing_tcv")?.value;
            let obq = match &v.obq {
                Some(raw) if !raw.trim().is_empty() => DecimalValue::parse(raw, "obq")?.value,
                _ => dec!(0),
            };
            let shore = DecimalValue::parse(&v.shore_tcv, "shore_tcv")?.value;
            let vessel = sailing - obq;
            if !v.rejected && (vessel <= dec!(0) || shore <= dec!(0)) {
                return Err(KernelError::with_field(
                    KernelErrorCode::NegativeQuantityNotAllowed,
                    format!(
                        "Voyage {} ({}): vessel/shore TCV must be positive.",
                        i + 1,
                        v.label
                    ),
                    "voyages",
                ));
            }
            parsed.push(ParsedVoyage {
                label: v.label.clone(),
                vessel_tcv: vessel,
                shore_tcv: shore,
                rejected: v.rejected,
                note: v.rejection_reason.clone(),
            });
        }

        // First average over non-rejected voyages (ratio of sums, like the sheet).
        let active: Vec<&ParsedVoyage> = parsed.iter().filter(|p| !p.rejected).collect();
        if active.is_empty() {
            return Err(KernelError::with_field(
                KernelErrorCode::ComparisonInputInvalid,
                "All voyages are rejected — nothing to average.",
                "voyages",
            ));
        }
        let sum = |items: &[&ParsedVoyage]| -> (Decimal, Decimal) {
            items.iter().fold((dec!(0), dec!(0)), |(va, sa), p| {
                (va + p.vessel_tcv, sa + p.shore_tcv)
            })
        };
        let (v1, s1) = sum(&active);
        let first_avg = v1 / s1;
        let band = band_pct / dec!(100);
        let band_low = first_avg * (dec!(1) - band);
        let band_high = first_avg * (dec!(1) + band);

        // Disqualify by ratio outside the band (single pass) → qualifying set.
        let qualifying: Vec<&ParsedVoyage> = active
            .iter()
            .filter(|p| {
                let ratio = p.vessel_tcv / p.shore_tcv;
                ratio >= band_low && ratio <= band_high
            })
            .copied()
            .collect();
        if qualifying.is_empty() {
            return Err(KernelError::with_field(
                KernelErrorCode::ComparisonInputInvalid,
                "No qualifying voyages inside the tolerance band.",
                "voyages",
            ));
        }
        let (v2, s2) = sum(&qualifying);
        let second_avg = v2 / s2;
        let vef_rounded = round_decimal(second_avg, 4, ROUND);

        let mut warnings: Vec<String> = Vec::new();
        if qualifying.len() < 5 {
            warnings.push(format!(
                "Solo {} viaje(s) calificable(s); HM49 recomienda un historial mínimo (≥5) para un VEF fiable.",
                qualifying.len()
            ));
        }

        // Voyage result rows.
        let voyage_rows: Vec<VefVoyageResultDTO> = parsed
            .iter()
            .map(|p| {
                let ratio = if p.rejected {
                    None
                } else {
                    Some(p.vessel_tcv / p.shore_tcv)
                };
                let qualifies = ratio
                    .map(|r| r >= band_low && r <= band_high)
                    .unwrap_or(false);
                let note = if p.rejected {
                    p.note.clone().or_else(|| Some("Rechazado".to_string()))
                } else if !qualifies {
                    Some(format!(
                        "Descalificado: ratio fuera de ±{band_pct}% de la media"
                    ))
                } else {
                    None
                };
                VefVoyageResultDTO {
                    label: p.label.clone(),
                    vessel_tcv: p.vessel_tcv.normalize().to_string(),
                    shore_tcv: p.shore_tcv.normalize().to_string(),
                    ratio: ratio.map(|r| fmt(r, 5)),
                    rejected: p.rejected,
                    qualifying: qualifies,
                    note,
                }
            })
            .collect();

        // Present-voyage applications: applied = vessel / VEF (rounded VEF, as
        // the sheet applies the published 4-dp figure).
        let mut app_rows: Vec<VefApplicationResultDTO> = Vec::new();
        for a in &self.applications {
            let vessel_qty = DecimalValue::parse(&a.vessel_qty, "vessel_qty")?.value;
            let shore_qty = DecimalValue::parse(&a.shore_qty, "shore_qty")?.value;
            let role = a.role.trim().to_ascii_uppercase();
            if role != "LOAD" && role != "DISCHARGE" {
                return Err(KernelError::with_field(
                    KernelErrorCode::InvalidUnit,
                    format!(
                        "Application role must be LOAD or DISCHARGE, got: {}",
                        a.role
                    ),
                    "applications",
                ));
            }
            let applied = round_decimal(vessel_qty / vef_rounded, 2, ROUND);
            // receiver − deliverer; % over the deliverer figure.
            let (difference, deliverer) = if role == "LOAD" {
                (applied - shore_qty, shore_qty)
            } else {
                (shore_qty - applied, applied)
            };
            let pct = if deliverer != dec!(0) {
                difference / deliverer * dec!(100)
            } else {
                dec!(0)
            };
            app_rows.push(VefApplicationResultDTO {
                name: a.name.clone(),
                role,
                vessel_qty: vessel_qty.normalize().to_string(),
                shore_qty: shore_qty.normalize().to_string(),
                vef_applied: fmt(applied, 2),
                difference: fmt(difference, 2),
                difference_pct: fmt(pct, 3),
            });
        }

        let trace_json = if scope.requires_full_trace() {
            let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
            trace.push(TraceStep::new(
                "VEF — API MPMS 17.9 / HM49 (2019) Primary Method",
                json!({
                    "voyages": parsed.len(),
                    "band_pct": band_pct.to_string(),
                }),
                json!({
                    "first_average": first_avg.to_string(),
                    "band": [band_low.to_string(), band_high.to_string()],
                    "qualifying": qualifying.len(),
                    "second_average": second_avg.to_string(),
                    "vef": vef_rounded.to_string(),
                    "vessel_sum": v2.to_string(),
                    "shore_sum": s2.to_string(),
                }),
            ));
            Some(serde_json::to_value(&trace).unwrap_or(json!(null)))
        } else {
            None
        };

        Ok(VefResponseDTO {
            success: true,
            voyage_count: Some(parsed.len() as u32),
            qualifying_count: Some(qualifying.len() as u32),
            first_average: Some(fmt(first_avg, 5)),
            band_low: Some(fmt(band_low, 5)),
            band_high: Some(fmt(band_high, 5)),
            second_average: Some(fmt(second_avg, 5)),
            vef: Some(fmt(vef_rounded, 4)),
            vessel_sum: Some(v2.normalize().to_string()),
            shore_sum: Some(s2.normalize().to_string()),
            voyages: Some(voyage_rows),
            applications: Some(app_rows),
            warnings: if warnings.is_empty() {
                None
            } else {
                Some(warnings)
            },
            trace_json,
            errors: None,
        })
    }
}

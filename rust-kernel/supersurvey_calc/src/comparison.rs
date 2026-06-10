//! Source comparison engine with layered tolerances.
//!
//! Compares custody figures from independent sources of the same operation —
//! e.g. VESSEL_RECEIVED vs BARGE_DELIVERED vs BDN — on the official quantity
//! (weight in air, MT). Each pair is checked against a stack of tolerance layers
//! (ISO baseline + commercial: buyer / supplier / inspection / contract), and the
//! engine recommends a document when a difference exceeds tolerance:
//!
//! - within every layer          -> RecommendedAction::None
//! - exceeds the tightest layer
//!   but within the widest        -> RecommendedAction::IssueNoad
//!   (Notice of Apparent Discrepancy — note it)
//! - exceeds the widest layer     -> RecommendedAction::IssueLop
//!   (Letter of Protest — formal)
//!
//! The recommendation is driven by the largest |Δ%| across all pairs (worst case).
//!
//! Policy:
//! - pure `Decimal`; tolerance flags compare the UNROUNDED |Δ%| against the limit;
//!   displayed Δ, Δ% and margins are rounded only for output;
//! - sources are normalized to one weight unit (default: first source's unit);
//! - this is the official kernel comparison; per-unit display (m³, L, long tons…)
//!   is a presentation concern handled in the UI.

use crate::conversions::convert_weight;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, PrecisionConfiguration};
use crate::trace::{CalculationScope, CalculationTrace, TraceStep};
use crate::units::WeightUnit;
use crate::value::{UnitValue, WeightValue};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use serde_json::json;

/// Decimals for percentage outputs (Δ% and margins).
const PCT_DECIMALS: u32 = 4;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ComparisonSource {
    pub name: String,
    pub quantity: WeightValue,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ToleranceLayer {
    pub name: String,
    #[serde(default)]
    pub basis: String,
    /// Allowed deviation in percent. `0.30` means ±0.30%.
    #[serde(with = "rust_decimal::serde::str")]
    pub limit_pct: Decimal,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LayerResult {
    pub name: String,
    pub basis: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub limit_pct: Decimal,
    pub within: bool,
    /// limit_pct − |Δ%| (positive = room remaining), rounded.
    #[serde(with = "rust_decimal::serde::str")]
    pub margin_pct: Decimal,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PairComparison {
    pub source_a: String,
    pub source_b: String,
    pub value_a: WeightValue,
    pub value_b: WeightValue,
    /// a − b, in the common unit.
    pub delta: WeightValue,
    /// (a − b) / b × 100, rounded.
    #[serde(with = "rust_decimal::serde::str")]
    pub delta_pct: Decimal,
    pub layers: Vec<LayerResult>,
    pub within_all: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RecommendedAction {
    None,
    IssueNoad,
    IssueLop,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ComparisonResult {
    pub unit: WeightUnit,
    pub pairs: Vec<PairComparison>,
    /// True if any pair exceeds any tolerance layer.
    pub exceeded: bool,
    pub recommended_action: RecommendedAction,
    /// Largest |Δ%| across all pairs, rounded (drives the recommendation).
    #[serde(with = "rust_decimal::serde::str")]
    pub worst_delta_pct: Decimal,
    pub trace: Option<CalculationTrace>,
}

/// Compare two or more sources pairwise against layered tolerances.
pub fn compare_sources(
    sources: Vec<ComparisonSource>,
    layers: Vec<ToleranceLayer>,
    target_unit: Option<WeightUnit>,
    precision: PrecisionConfiguration,
    scope: CalculationScope,
) -> KernelResult<ComparisonResult> {
    if sources.len() < 2 {
        return Err(KernelError::with_field(
            KernelErrorCode::ComparisonInputInvalid,
            "Comparison requires at least two sources.",
            "sources",
        ));
    }
    if layers.is_empty() {
        return Err(KernelError::with_field(
            KernelErrorCode::ComparisonInputInvalid,
            "Comparison requires at least one tolerance layer.",
            "tolerance_layers",
        ));
    }
    for layer in &layers {
        if layer.limit_pct < dec!(0) {
            return Err(KernelError::with_field(
                KernelErrorCode::ComparisonInputInvalid,
                format!("Tolerance layer '{}' has a negative limit.", layer.name),
                "tolerance_layers",
            ));
        }
    }

    let unit = target_unit.unwrap_or(sources[0].quantity.unit);

    // Normalize every source to the common unit.
    let normalized: Vec<(String, Decimal)> = sources
        .into_iter()
        .map(|source| {
            let converted = convert_weight(source.quantity, unit)?;
            Ok((source.name, converted.value))
        })
        .collect::<KernelResult<Vec<_>>>()?;

    let min_limit = layers.iter().map(|l| l.limit_pct).min().unwrap();
    let max_limit = layers.iter().map(|l| l.limit_pct).max().unwrap();

    let mut pairs = Vec::new();
    let mut worst_abs_pct = dec!(0);

    for i in 0..normalized.len() {
        for j in (i + 1)..normalized.len() {
            let (name_a, val_a) = (normalized[i].0.clone(), normalized[i].1);
            let (name_b, val_b) = (normalized[j].0.clone(), normalized[j].1);

            if val_b == dec!(0) {
                return Err(KernelError::with_field(
                    KernelErrorCode::DivisionByZero,
                    format!("Cannot compute percentage against zero base source '{name_b}'."),
                    "sources",
                ));
            }

            let delta_raw = val_a - val_b;
            let pct_raw = (delta_raw / val_b) * dec!(100);
            let abs_pct = pct_raw.abs();
            if abs_pct > worst_abs_pct {
                worst_abs_pct = abs_pct;
            }

            let layer_results: Vec<LayerResult> = layers
                .iter()
                .map(|l| LayerResult {
                    name: l.name.clone(),
                    basis: l.basis.clone(),
                    limit_pct: l.limit_pct,
                    within: abs_pct <= l.limit_pct,
                    margin_pct: round_decimal(
                        l.limit_pct - abs_pct,
                        PCT_DECIMALS,
                        precision.rounding_rule,
                    ),
                })
                .collect();
            let within_all = layer_results.iter().all(|r| r.within);

            pairs.push(PairComparison {
                source_a: name_a,
                source_b: name_b,
                value_a: UnitValue::new(
                    round_decimal(val_a, precision.weight_decimals, precision.rounding_rule),
                    unit,
                ),
                value_b: UnitValue::new(
                    round_decimal(val_b, precision.weight_decimals, precision.rounding_rule),
                    unit,
                ),
                delta: UnitValue::new(
                    round_decimal(
                        delta_raw,
                        precision.weight_decimals,
                        precision.rounding_rule,
                    ),
                    unit,
                ),
                delta_pct: round_decimal(pct_raw, PCT_DECIMALS, precision.rounding_rule),
                layers: layer_results,
                within_all,
            });
        }
    }

    let exceeded = worst_abs_pct > min_limit;
    let recommended_action = if worst_abs_pct <= min_limit {
        RecommendedAction::None
    } else if worst_abs_pct <= max_limit {
        RecommendedAction::IssueNoad
    } else {
        RecommendedAction::IssueLop
    };

    let trace = if scope.requires_full_trace() {
        let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
        trace.push(
            TraceStep::new(
                "Compare sources against layered tolerances",
                json!({
                    "unit": unit,
                    "layers": layers,
                    "tightest_limit_pct": min_limit.to_string(),
                    "widest_limit_pct": max_limit.to_string(),
                }),
                json!({
                    "worst_delta_pct": round_decimal(worst_abs_pct, PCT_DECIMALS, precision.rounding_rule).to_string(),
                    "exceeded": exceeded,
                    "recommended_action": recommended_action,
                    "pairs": pairs,
                }),
            )
            .with_formula("Δ% = (A − B) / B × 100"),
        );
        Some(trace)
    } else {
        None
    };

    Ok(ComparisonResult {
        unit,
        pairs,
        exceeded,
        recommended_action,
        worst_delta_pct: round_decimal(worst_abs_pct, PCT_DECIMALS, precision.rounding_rule),
        trace,
    })
}

//! Terminal / ship-to-shore reconciliation — the cargo/terminal custody family.
//!
//! Closes the loading- and discharge-at-terminal flow documented in
//! `docs/research/operaciones-sts-barge-offhire.md` §3 (Barge Tow Loading:
//! *Pipeline Reconciliation · Shore Measurement · Shore Quantity*, "Loaded vs
//! B/L variance −0.411 %"). It is the last ⛔ NEW piece of that family (§5); the
//! TCV engine, S&W, pro-rata, VEF and multi-unit assembler already exist.
//!
//! The flow this module models, exactly as the report lays it out:
//!
//! ```text
//! Shore Measurement   shore tank gauging → movement by difference (|close − open|)
//!        │
//! Pipeline Reconcil.  ± line content change (lines packed/stripped between gauges)
//!        ▼
//! Shore Quantity      = shore movement + signed line adjustment
//!        │
//! Reconciliation      Vessel vs Shore, Vessel vs B/L, Shore vs B/L  → Δ, Δ%, action
//! ```
//!
//! Sign convention for the **line adjustment** (delta = line_after − line_before):
//! - **LOAD** (shore → vessel): product left in the line after loading *left the
//!   shore tanks but never reached the vessel*, so it is **subtracted** from the
//!   shore-delivered figure → `adjustment = −delta`.
//! - **DISCHARGE** (vessel → shore): product now sitting in the line *was
//!   delivered by the vessel even though it has not reached the tank*, so it is
//!   **added** to the shore-received figure → `adjustment = +delta`.
//!
//! Lines full (or empty) at both gauges → `delta = 0` → no adjustment, the common
//! case. Pass an explicit `line_adjustment` to override the rule for an unusual
//! worksheet.
//!
//! Policy (same discipline as the rest of the kernel):
//! - pure `Decimal`; tolerance flags compare the **unrounded** |Δ%| against the
//!   limit; displayed Δ, Δ% and margins are rounded only for output;
//! - **unit-agnostic**: a reconciliation runs in ONE contract unit (MT, bbl or
//!   m³) carried only as a display label — no conversion happens here. Per-unit
//!   display is a presentation concern handled by `figures`/the UI;
//! - reuses `comparison`'s tolerance vocabulary (`ToleranceLayer`,
//!   `RecommendedAction`, layered `None`/`IssueNoad`/`IssueLop`) so the UI renders
//!   a terminal reconciliation identically to a source comparison.

use crate::comparison::{
    ComparisonLayerResultDTO, RecommendedAction, ToleranceLayer, ToleranceLayerDTO,
};
use crate::decimal::DecimalValue;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, SystemRoundingRule};
use crate::trace::{CalculationScope, CalculationTrace, TraceStep};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;

/// Decimals for percentage outputs (Δ% and margins), matching `comparison`.
const PCT_DECIMALS: u32 = 4;

/// π to 27 dp — far beyond survey precision; used only for line-volume geometry.
const PI: Decimal = dec!(3.141592653589793238462643383);

/// Custody-transfer direction at the terminal.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Operation {
    /// Shore tanks deliver to the vessel/barge.
    Load,
    /// Vessel delivers to the shore tanks.
    Discharge,
}

impl FromStr for Operation {
    type Err = KernelError;
    fn from_str(s: &str) -> KernelResult<Self> {
        match s.trim().to_ascii_uppercase().as_str() {
            "LOAD" | "LOADING" => Ok(Operation::Load),
            "DISCHARGE" | "DISCHARGING" => Ok(Operation::Discharge),
            other => Err(KernelError::with_field(
                KernelErrorCode::ComparisonInputInvalid,
                format!("Unknown operation '{other}' (expected LOAD or DISCHARGE)."),
                "operation",
            )),
        }
    }
}

/// Internal volume of a straight pipe run: `V = (π/4)·D²·L`.
///
/// `diameter` and `length` share a unit (e.g. metres) → volume in that unit
/// cubed (m³). Used for line content when no line table is available. No
/// rounding — the caller rounds for display.
pub fn pipe_volume(diameter: Decimal, length: Decimal) -> Decimal {
    // Order keeps full precision: (D·D·L)·π/4.
    diameter * diameter * length * PI / dec!(4)
}

/// Gauged movement by difference between two readings (opening, closing TCVs):
/// `|closing − opening|`. Direction is carried by `Operation`, so the magnitude
/// is what the reconciliation needs.
pub fn by_difference(opening: Decimal, closing: Decimal) -> Decimal {
    (closing - opening).abs()
}

/// Signed line adjustment applied to the shore movement, from the line content
/// before/after (delta = after − before) and the operation. See the module docs
/// for the sign convention.
pub fn line_adjustment(line_before: Decimal, line_after: Decimal, op: Operation) -> Decimal {
    let delta = line_after - line_before;
    match op {
        Operation::Load => -delta,
        Operation::Discharge => delta,
    }
}

/// Shore quantity = shore movement + signed line adjustment.
pub fn shore_quantity(shore_movement: Decimal, line_adj: Decimal) -> Decimal {
    shore_movement + line_adj
}

/// One reconciliation line: `figure` against a `reference`, with Δ, Δ% and the
/// per-layer tolerance verdicts.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct VarianceLine {
    pub label: String,
    pub figure: Decimal,
    pub reference: Decimal,
    /// figure − reference.
    pub delta: Decimal,
    /// (figure − reference) / reference × 100.
    pub delta_pct: Decimal,
    pub layers: Vec<LayerVerdict>,
    pub within_all: bool,
}

/// Verdict of one tolerance layer for one variance line (mirrors
/// `comparison::LayerResult`, kept local to avoid a cross-module struct dep).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LayerVerdict {
    pub name: String,
    pub basis: String,
    pub limit_pct: Decimal,
    pub within: bool,
    /// limit_pct − |Δ%| (positive = room remaining), rounded.
    pub margin_pct: Decimal,
}

/// Full reconciliation result.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Reconciliation {
    pub variances: Vec<VarianceLine>,
    /// Largest |Δ%| across all lines, rounded (drives the recommendation).
    pub worst_delta_pct: Decimal,
    pub exceeded: bool,
    pub recommended_action: RecommendedAction,
}

fn variance_line(
    label: &str,
    figure: Decimal,
    reference: Decimal,
    layers: &[ToleranceLayer],
    rounding: SystemRoundingRule,
) -> KernelResult<(VarianceLine, Decimal)> {
    if reference == dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::DivisionByZero,
            format!("Cannot compute '{label}' percentage against a zero reference."),
            "reference",
        ));
    }
    let delta = figure - reference;
    let pct_raw = delta / reference * dec!(100);
    let abs_pct = pct_raw.abs();
    let verdicts: Vec<LayerVerdict> = layers
        .iter()
        .map(|l| LayerVerdict {
            name: l.name.clone(),
            basis: l.basis.clone(),
            limit_pct: l.limit_pct,
            within: abs_pct <= l.limit_pct,
            margin_pct: round_decimal(l.limit_pct - abs_pct, PCT_DECIMALS, rounding),
        })
        .collect();
    let within_all = verdicts.iter().all(|v| v.within);
    let line = VarianceLine {
        label: label.to_string(),
        figure,
        reference,
        delta,
        delta_pct: round_decimal(pct_raw, PCT_DECIMALS, rounding),
        layers: verdicts,
        within_all,
    };
    Ok((line, abs_pct))
}

/// Reconcile a vessel figure against the shore quantity and (optionally) the
/// Bill of Lading, against layered tolerances. Produces Vessel-vs-Shore (always),
/// and Vessel-vs-B/L and Shore-vs-B/L when a B/L figure is given. The
/// recommendation is driven by the worst |Δ%| — exactly like `comparison`.
pub fn reconcile(
    vessel: Decimal,
    shore: Decimal,
    bl: Option<Decimal>,
    layers: &[ToleranceLayer],
    rounding: SystemRoundingRule,
) -> KernelResult<Reconciliation> {
    if layers.is_empty() {
        return Err(KernelError::with_field(
            KernelErrorCode::ComparisonInputInvalid,
            "Reconciliation requires at least one tolerance layer.",
            "tolerance_layers",
        ));
    }
    for l in layers {
        if l.limit_pct < dec!(0) {
            return Err(KernelError::with_field(
                KernelErrorCode::ComparisonInputInvalid,
                format!("Tolerance layer '{}' has a negative limit.", l.name),
                "tolerance_layers",
            ));
        }
    }

    let mut variances = Vec::new();
    let mut worst = dec!(0);

    // Vessel vs Shore — the classic ship/shore difference (base = shore).
    let (line, abs) = variance_line("Vessel vs Shore", vessel, shore, layers, rounding)?;
    worst = worst.max(abs);
    variances.push(line);

    if let Some(bl) = bl {
        // Vessel vs B/L — e.g. "Loaded vs B/L" (base = B/L).
        let (line, abs) = variance_line("Vessel vs B/L", vessel, bl, layers, rounding)?;
        worst = worst.max(abs);
        variances.push(line);
        // Shore vs B/L (base = B/L).
        let (line, abs) = variance_line("Shore vs B/L", shore, bl, layers, rounding)?;
        worst = worst.max(abs);
        variances.push(line);
    }

    let min_limit = layers.iter().map(|l| l.limit_pct).min().unwrap();
    let max_limit = layers.iter().map(|l| l.limit_pct).max().unwrap();
    let exceeded = worst > min_limit;
    let recommended_action = if worst <= min_limit {
        RecommendedAction::None
    } else if worst <= max_limit {
        RecommendedAction::IssueNoad
    } else {
        RecommendedAction::IssueLop
    };

    Ok(Reconciliation {
        variances,
        worst_delta_pct: round_decimal(worst, PCT_DECIMALS, rounding),
        exceeded,
        recommended_action,
    })
}

// ---------------------------------------------------------------------------
// IPC boundary (string-in / string-out)
// ---------------------------------------------------------------------------

fn default_decimals() -> u32 {
    3
}
fn default_scope() -> String {
    "LIVE".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReconciliationRequestDTO {
    pub operation: String,
    /// Contract unit label (e.g. "MT", "BBL", "M3") — display only.
    #[serde(default)]
    pub unit: String,
    /// Vessel / barge custody figure (loaded or discharged).
    pub vessel_figure: String,

    // --- Shore side: either gauged opening/closing, or a ready shore figure. ---
    #[serde(default)]
    pub shore_opening: Option<String>,
    #[serde(default)]
    pub shore_closing: Option<String>,
    /// Shore movement supplied directly (bypasses opening/closing).
    #[serde(default)]
    pub shore_figure: Option<String>,

    // --- Pipeline reconciliation: line content before/after, or explicit adj. ---
    #[serde(default)]
    pub line_before: Option<String>,
    #[serde(default)]
    pub line_after: Option<String>,
    /// Signed line adjustment supplied directly (bypasses before/after + rule).
    #[serde(default)]
    pub line_adjustment: Option<String>,

    /// Bill of Lading figure (optional).
    #[serde(default)]
    pub bl_figure: Option<String>,

    pub layers: Vec<ToleranceLayerDTO>,
    #[serde(default = "default_decimals")]
    pub decimals: u32,
    pub rounding_rule: String,
    #[serde(default = "default_scope")]
    pub calculation_scope: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VarianceLineDTO {
    pub label: String,
    pub figure: String,
    pub reference: String,
    pub delta: String,
    pub delta_pct: String,
    pub within_all: bool,
    pub layers: Vec<ComparisonLayerResultDTO>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReconciliationResponseDTO {
    pub success: bool,
    pub unit: Option<String>,
    /// Shore movement by difference (present only when opening/closing given).
    pub shore_movement: Option<String>,
    pub line_adjustment: Option<String>,
    pub shore_quantity: Option<String>,
    pub vessel_figure: Option<String>,
    pub bl_figure: Option<String>,
    pub variances: Option<Vec<VarianceLineDTO>>,
    pub worst_delta_pct: Option<String>,
    pub exceeded: Option<bool>,
    pub recommended_action: Option<String>,
    pub trace_json: Option<serde_json::Value>,
    pub errors: Option<Vec<KernelError>>,
}

fn opt_parse(v: &Option<String>, field: &str) -> KernelResult<Option<Decimal>> {
    match v {
        Some(s) if !s.trim().is_empty() => Ok(Some(DecimalValue::parse(s, field)?.value)),
        _ => Ok(None),
    }
}

impl ReconciliationRequestDTO {
    pub fn calculate(&self) -> ReconciliationResponseDTO {
        match self.calculate_inner() {
            Ok(r) => r,
            Err(e) => ReconciliationResponseDTO {
                success: false,
                unit: None,
                shore_movement: None,
                line_adjustment: None,
                shore_quantity: None,
                vessel_figure: None,
                bl_figure: None,
                variances: None,
                worst_delta_pct: None,
                exceeded: None,
                recommended_action: None,
                trace_json: None,
                errors: Some(vec![e]),
            },
        }
    }

    fn calculate_inner(&self) -> KernelResult<ReconciliationResponseDTO> {
        let scope = CalculationScope::from_str(&self.calculation_scope)?;
        let op = Operation::from_str(&self.operation)?;
        let rounding = SystemRoundingRule::from_str(&self.rounding_rule)?;
        let dp = self.decimals;
        let r = |d: Decimal| round_decimal(d, dp, rounding).normalize().to_string();

        let vessel = DecimalValue::parse(&self.vessel_figure, "vessel_figure")?.value;

        // Shore movement: by difference, or supplied directly.
        let opening = opt_parse(&self.shore_opening, "shore_opening")?;
        let closing = opt_parse(&self.shore_closing, "shore_closing")?;
        let direct_shore = opt_parse(&self.shore_figure, "shore_figure")?;
        let (shore_movement, movement_out) = match (opening, closing, direct_shore) {
            (Some(o), Some(c), _) => {
                let m = by_difference(o, c);
                (m, Some(r(m)))
            }
            (_, _, Some(s)) => (s, None),
            _ => {
                return Err(KernelError::with_field(
                    KernelErrorCode::ComparisonInputInvalid,
                    "Provide either shore_opening+shore_closing or shore_figure.",
                    "shore_figure",
                ))
            }
        };

        // Line adjustment: explicit signed value, or before/after + rule.
        let explicit_adj = opt_parse(&self.line_adjustment, "line_adjustment")?;
        let line_adj = match explicit_adj {
            Some(a) => a,
            None => {
                let before = opt_parse(&self.line_before, "line_before")?.unwrap_or(dec!(0));
                let after = opt_parse(&self.line_after, "line_after")?.unwrap_or(dec!(0));
                line_adjustment(before, after, op)
            }
        };

        let shore = shore_quantity(shore_movement, line_adj);
        let bl = opt_parse(&self.bl_figure, "bl_figure")?;

        let layers = self
            .layers
            .iter()
            .map(|l| {
                Ok(ToleranceLayer {
                    name: l.name.clone(),
                    basis: l.basis.clone(),
                    limit_pct: DecimalValue::parse(&l.limit_pct, "limit_pct")?.value,
                })
            })
            .collect::<KernelResult<Vec<_>>>()?;

        let result = reconcile(vessel, shore, bl, &layers, rounding)?;

        let variances: Vec<VarianceLineDTO> = result
            .variances
            .iter()
            .map(|v| VarianceLineDTO {
                label: v.label.clone(),
                figure: r(v.figure),
                reference: r(v.reference),
                delta: r(v.delta),
                delta_pct: v.delta_pct.normalize().to_string(),
                within_all: v.within_all,
                layers: v
                    .layers
                    .iter()
                    .map(|l| ComparisonLayerResultDTO {
                        name: l.name.clone(),
                        basis: l.basis.clone(),
                        limit_pct: l.limit_pct.normalize().to_string(),
                        within: l.within,
                        margin_pct: l.margin_pct.normalize().to_string(),
                    })
                    .collect(),
            })
            .collect();

        let trace_json = if scope.requires_full_trace() {
            let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
            trace.push(
                TraceStep::new(
                    "Terminal reconciliation: shore by difference ± line, vs vessel & B/L",
                    json!({
                        "operation": self.operation,
                        "shore_movement": shore_movement.to_string(),
                        "line_adjustment": line_adj.to_string(),
                        "shore_quantity": shore.to_string(),
                        "vessel_figure": vessel.to_string(),
                        "bl_figure": bl.map(|b| b.to_string()),
                    }),
                    json!({
                        "worst_delta_pct": result.worst_delta_pct.to_string(),
                        "recommended_action": result.recommended_action,
                        "variances": result.variances,
                    }),
                )
                .with_formula("shore = |close−open| ± line ;  Δ% = (figure−ref)/ref × 100"),
            );
            Some(serde_json::to_value(&trace).unwrap_or(json!(null)))
        } else {
            None
        };

        Ok(ReconciliationResponseDTO {
            success: true,
            unit: Some(self.unit.clone()),
            shore_movement: movement_out,
            line_adjustment: Some(r(line_adj)),
            shore_quantity: Some(r(shore)),
            vessel_figure: Some(r(vessel)),
            bl_figure: bl.map(r),
            variances: Some(variances),
            worst_delta_pct: Some(result.worst_delta_pct.normalize().to_string()),
            exceeded: Some(result.exceeded),
            recommended_action: serde_json::to_value(result.recommended_action)
                .ok()
                .and_then(|v| v.as_str().map(str::to_string)),
            trace_json,
            errors: None,
        })
    }
}

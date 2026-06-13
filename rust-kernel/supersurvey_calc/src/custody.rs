//! Custody-transfer helpers shared by cargo operations (STS, barge tow, terminal):
//! - **S&W** (Sediment & Water) deduction: `Net = Gross − Gross·S&W%` — crude oil.
//! - **Pro-rata** apportionment: split a total across parcels (e.g. several Bills
//!   of Lading) proportionally, reconciling the rounding residual so the parts
//!   sum back to the total EXACTLY.
//!
//! Both are pure `Decimal` and validated against a real SGS STS report (see
//! docs/research/operaciones-sts-barge-offhire.md). String-in/out DTOs for the
//! WASM/Tauri boundary.

use crate::decimal::DecimalValue;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, SystemRoundingRule};
use crate::trace::{CalculationScope, CalculationTrace, TraceStep};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;

/// S&W deduction: returns `(sw, net)`. `sw = round(gross·pct/100)`, `net = gross − sw`
/// (matches the worksheet, which rounds the S&W amount then subtracts).
pub fn apply_sw(
    gross: Decimal,
    sw_pct: Decimal,
    decimals: u32,
    rounding: SystemRoundingRule,
) -> (Decimal, Decimal) {
    let sw = round_decimal(gross * sw_pct / dec!(100), decimals, rounding);
    let net = round_decimal(gross - sw, decimals, rounding);
    (sw, net)
}

/// Pro-rata split of `total` across `weights`, summing EXACTLY to `round(total)`.
/// Each share is rounded; the rounding residual is assigned to the largest-weight
/// parcel (least relative distortion).
pub fn apportion(
    total: Decimal,
    weights: &[Decimal],
    decimals: u32,
    rounding: SystemRoundingRule,
) -> KernelResult<Vec<Decimal>> {
    if weights.is_empty() {
        return Err(KernelError::with_field(
            KernelErrorCode::ComparisonInputInvalid,
            "Pro-rata needs at least one parcel.",
            "parcels",
        ));
    }
    let sum_w: Decimal = weights.iter().copied().sum();
    if sum_w <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Sum of parcel weights must be positive.",
            "parcels",
        ));
    }
    let total_r = round_decimal(total, decimals, rounding);
    let mut shares: Vec<Decimal> = weights
        .iter()
        .map(|w| round_decimal(total * *w / sum_w, decimals, rounding))
        .collect();
    let residual = total_r - shares.iter().copied().sum::<Decimal>();
    if residual != dec!(0) {
        // index of the largest weight
        let (idx, _) = weights
            .iter()
            .enumerate()
            .max_by(|a, b| a.1.cmp(b.1))
            .expect("non-empty");
        shares[idx] += residual;
    }
    Ok(shares)
}

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

fn default_decimals() -> u32 {
    3
}
fn default_scope() -> String {
    "LIVE".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwRequestDTO {
    pub gross_value: String,
    /// Sediment & water, percent of volume.
    pub sw_pct: String,
    #[serde(default = "default_decimals")]
    pub decimals: u32,
    pub rounding_rule: String,
    #[serde(default = "default_scope")]
    pub calculation_scope: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwResponseDTO {
    pub success: bool,
    pub gross: Option<String>,
    pub sw: Option<String>,
    pub net: Option<String>,
    pub trace_json: Option<serde_json::Value>,
    pub errors: Option<Vec<KernelError>>,
}

impl SwRequestDTO {
    pub fn calculate(&self) -> SwResponseDTO {
        match self.calculate_inner() {
            Ok(r) => r,
            Err(e) => SwResponseDTO {
                success: false,
                gross: None,
                sw: None,
                net: None,
                trace_json: None,
                errors: Some(vec![e]),
            },
        }
    }

    fn calculate_inner(&self) -> KernelResult<SwResponseDTO> {
        let scope = CalculationScope::from_str(&self.calculation_scope)?;
        let gross = DecimalValue::parse(&self.gross_value, "gross_value")?.value;
        let sw_pct = DecimalValue::parse(&self.sw_pct, "sw_pct")?.value;
        let rounding = SystemRoundingRule::from_str(&self.rounding_rule)?;
        if sw_pct < dec!(0) || sw_pct >= dec!(100) {
            return Err(KernelError::with_field(
                KernelErrorCode::ComparisonInputInvalid,
                "S&W percent must be in [0, 100).",
                "sw_pct",
            ));
        }
        let (sw, net) = apply_sw(gross, sw_pct, self.decimals, rounding);
        let trace_json = if scope.requires_full_trace() {
            let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
            trace.push(TraceStep::new(
                "S&W deduction: net = gross − round(gross·S&W%/100)",
                json!({ "gross": gross.to_string(), "sw_pct": sw_pct.to_string() }),
                json!({ "sw": sw.to_string(), "net": net.to_string() }),
            ));
            Some(serde_json::to_value(&trace).unwrap_or(json!(null)))
        } else {
            None
        };
        Ok(SwResponseDTO {
            success: true,
            gross: Some(
                round_decimal(gross, self.decimals, rounding)
                    .normalize()
                    .to_string(),
            ),
            sw: Some(sw.normalize().to_string()),
            net: Some(net.normalize().to_string()),
            trace_json,
            errors: None,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProRataParcelDTO {
    pub label: String,
    /// Apportionment basis (e.g. each Bill of Lading quantity).
    pub weight: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProRataRequestDTO {
    pub total_value: String,
    pub parcels: Vec<ProRataParcelDTO>,
    #[serde(default = "default_decimals")]
    pub decimals: u32,
    pub rounding_rule: String,
    #[serde(default = "default_scope")]
    pub calculation_scope: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProRataParcelResultDTO {
    pub label: String,
    pub weight: String,
    pub share: String,
    /// Share as percent of the total.
    pub pct: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProRataResponseDTO {
    pub success: bool,
    pub total: Option<String>,
    pub parcels: Option<Vec<ProRataParcelResultDTO>>,
    pub trace_json: Option<serde_json::Value>,
    pub errors: Option<Vec<KernelError>>,
}

impl ProRataRequestDTO {
    pub fn calculate(&self) -> ProRataResponseDTO {
        match self.calculate_inner() {
            Ok(r) => r,
            Err(e) => ProRataResponseDTO {
                success: false,
                total: None,
                parcels: None,
                trace_json: None,
                errors: Some(vec![e]),
            },
        }
    }

    fn calculate_inner(&self) -> KernelResult<ProRataResponseDTO> {
        let scope = CalculationScope::from_str(&self.calculation_scope)?;
        let total = DecimalValue::parse(&self.total_value, "total_value")?.value;
        let rounding = SystemRoundingRule::from_str(&self.rounding_rule)?;
        let weights = self
            .parcels
            .iter()
            .map(|p| DecimalValue::parse(&p.weight, "weight").map(|d| d.value))
            .collect::<KernelResult<Vec<_>>>()?;
        let shares = apportion(total, &weights, self.decimals, rounding)?;
        let total_r = round_decimal(total, self.decimals, rounding);

        let parcels: Vec<ProRataParcelResultDTO> = self
            .parcels
            .iter()
            .zip(weights.iter())
            .zip(shares.iter())
            .map(|((p, w), s)| {
                let pct = if total_r != dec!(0) {
                    round_decimal(*s / total_r * dec!(100), 3, rounding)
                } else {
                    dec!(0)
                };
                ProRataParcelResultDTO {
                    label: p.label.clone(),
                    weight: w.normalize().to_string(),
                    share: s.normalize().to_string(),
                    pct: pct.normalize().to_string(),
                }
            })
            .collect();

        let trace_json = if scope.requires_full_trace() {
            let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
            trace.push(TraceStep::new(
                "Pro-rata: share_i = round(total·w_i/Σw); residual → largest parcel",
                json!({ "total": total.to_string(), "weights": weights.iter().map(|w| w.to_string()).collect::<Vec<_>>() }),
                json!({ "shares": shares.iter().map(|s| s.to_string()).collect::<Vec<_>>() }),
            ));
            Some(serde_json::to_value(&trace).unwrap_or(json!(null)))
        } else {
            None
        };

        Ok(ProRataResponseDTO {
            success: true,
            total: Some(total_r.normalize().to_string()),
            parcels: Some(parcels),
            trace_json,
            errors: None,
        })
    }
}

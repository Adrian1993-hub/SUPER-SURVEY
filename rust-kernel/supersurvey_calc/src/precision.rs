use crate::error::{KernelError, KernelErrorCode, KernelResult};
use rust_decimal::Decimal;
use rust_decimal::RoundingStrategy;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SystemRoundingRule {
    HalfUp,
    HalfEven,
    Truncate,
    AwayFromZero,
    TowardZero,
}

impl FromStr for SystemRoundingRule {
    type Err = KernelError;
    fn from_str(input: &str) -> KernelResult<Self> {
        match input.trim().to_ascii_uppercase().as_str() {
            "HALF_UP" => Ok(SystemRoundingRule::HalfUp),
            "HALF_EVEN" => Ok(SystemRoundingRule::HalfEven),
            "TRUNCATE" => Ok(SystemRoundingRule::Truncate),
            "AWAY_FROM_ZERO" => Ok(SystemRoundingRule::AwayFromZero),
            "TOWARD_ZERO" | "TOWARDS_ZERO" => Ok(SystemRoundingRule::TowardZero),
            _ => Err(KernelError::with_field(
                KernelErrorCode::PrecisionConfigError,
                format!("Unsupported rounding rule: {input}"),
                "rounding_rule",
            )),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PrecisionConfiguration {
    pub intermediate_rounding: bool,
    pub observed_volume_decimals: u32,
    pub standard_volume_decimals: u32,
    pub weight_decimals: u32,
    pub rounding_rule: SystemRoundingRule,
    /// Cross-tank aggregation policy.
    ///
    /// false: total = sum of per-tank reported rounded quantities.
    /// true: total = rounded exact sum of unrounded per-tank quantities.
    #[serde(default)]
    pub aggregate_from_unrounded: bool,
}

impl Default for PrecisionConfiguration {
    fn default() -> Self {
        Self {
            intermediate_rounding: false,
            observed_volume_decimals: 3,
            standard_volume_decimals: 3,
            weight_decimals: 3,
            rounding_rule: SystemRoundingRule::HalfUp,
            aggregate_from_unrounded: false,
        }
    }
}

pub fn round_decimal(value: Decimal, decimals: u32, rule: SystemRoundingRule) -> Decimal {
    let strategy = match rule {
        SystemRoundingRule::HalfUp => RoundingStrategy::MidpointAwayFromZero,
        SystemRoundingRule::HalfEven => RoundingStrategy::MidpointNearestEven,
        SystemRoundingRule::Truncate | SystemRoundingRule::TowardZero => RoundingStrategy::ToZero,
        SystemRoundingRule::AwayFromZero => RoundingStrategy::AwayFromZero,
    };
    value.round_dp_with_strategy(decimals, strategy)
}

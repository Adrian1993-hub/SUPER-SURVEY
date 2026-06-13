//! Tank sampling levels (API MPMS 8.1 / ISO 3170): upper / middle / lower zone
//! sample depths for a vertical tank, from the ullage and the reference gauge
//! height. Validated against a real surveyor worksheet (see the QA tests).
//!
//! Geometry (all depths measured DOWN from the reference point, same datum as
//! the ullage; heights measured UP from the tank bottom):
//!   innage      = rgh − ullage                  (liquid column depth)
//!   upper  dip  = ullage + innage/6             (height above bottom = 5/6·innage)
//!   middle dip  = ullage + innage/2             (height = 1/2·innage)
//!   lower  dip  = ullage + 5·innage/6           (height = 1/6·innage)
//!
//! Pure `Decimal`; the surveyor lowers the sampler to the `*_dip` depths.

use crate::decimal::DecimalValue;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, SystemRoundingRule};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SamplingLevels {
    /// Liquid column depth = rgh − ullage.
    pub innage: Decimal,
    /// Sampler dip depths (from reference / ullage datum).
    pub upper_dip: Decimal,
    pub middle_dip: Decimal,
    pub lower_dip: Decimal,
    /// Heights above tank bottom (for charts).
    pub upper_height: Decimal,
    pub middle_height: Decimal,
    pub lower_height: Decimal,
}

/// Upper/middle/lower sampling levels from reference gauge height and ullage.
pub fn sampling_levels(rgh: Decimal, ullage: Decimal) -> KernelResult<SamplingLevels> {
    if rgh <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Reference gauge height must be positive.",
            "reference_height",
        ));
    }
    if ullage < dec!(0) || ullage > rgh {
        return Err(KernelError::with_field(
            KernelErrorCode::OutOfTableRange,
            format!("Ullage {ullage} must be between 0 and the reference height {rgh}."),
            "ullage",
        ));
    }
    let innage = rgh - ullage;
    let sixth = innage / dec!(6);
    Ok(SamplingLevels {
        innage,
        upper_dip: ullage + sixth,
        middle_dip: ullage + innage / dec!(2),
        lower_dip: ullage + sixth * dec!(5),
        upper_height: innage - sixth,
        middle_height: innage / dec!(2),
        lower_height: sixth,
    })
}

// ---------------------------------------------------------------------------
// DTO boundary
// ---------------------------------------------------------------------------

fn default_decimals() -> u32 {
    3
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SamplingTankDTO {
    pub tank: String,
    /// Reference gauge height (RGH).
    pub reference_height: String,
    pub ullage: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SamplingRequestDTO {
    pub tanks: Vec<SamplingTankDTO>,
    #[serde(default = "default_decimals")]
    pub decimals: u32,
    pub rounding_rule: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SamplingTankResultDTO {
    pub tank: String,
    pub reference_height: String,
    pub ullage: String,
    pub innage: Option<String>,
    pub upper: Option<String>,
    pub middle: Option<String>,
    pub lower: Option<String>,
    /// Heights above bottom (fractions × innage) for charting.
    pub upper_height: Option<String>,
    pub middle_height: Option<String>,
    pub lower_height: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SamplingResponseDTO {
    pub success: bool,
    pub tanks: Option<Vec<SamplingTankResultDTO>>,
    pub errors: Option<Vec<KernelError>>,
}

impl SamplingRequestDTO {
    pub fn calculate(&self) -> SamplingResponseDTO {
        let rounding = match SystemRoundingRule::from_str(&self.rounding_rule) {
            Ok(r) => r,
            Err(e) => {
                return SamplingResponseDTO {
                    success: false,
                    tanks: None,
                    errors: Some(vec![e]),
                }
            }
        };
        let fmt = |v: Decimal| {
            round_decimal(v, self.decimals, rounding)
                .normalize()
                .to_string()
        };
        let mut out = Vec::with_capacity(self.tanks.len());
        for t in &self.tanks {
            // A blank/zero row is skipped gracefully (per-row error, not a hard fail).
            let parsed = (|| -> KernelResult<SamplingLevels> {
                let rgh = DecimalValue::parse(&t.reference_height, "reference_height")?.value;
                let ullage = DecimalValue::parse(&t.ullage, "ullage")?.value;
                sampling_levels(rgh, ullage)
            })();
            match parsed {
                Ok(l) => out.push(SamplingTankResultDTO {
                    tank: t.tank.clone(),
                    reference_height: t.reference_height.clone(),
                    ullage: t.ullage.clone(),
                    innage: Some(fmt(l.innage)),
                    upper: Some(fmt(l.upper_dip)),
                    middle: Some(fmt(l.middle_dip)),
                    lower: Some(fmt(l.lower_dip)),
                    upper_height: Some(fmt(l.upper_height)),
                    middle_height: Some(fmt(l.middle_height)),
                    lower_height: Some(fmt(l.lower_height)),
                    error: None,
                }),
                Err(e) => out.push(SamplingTankResultDTO {
                    tank: t.tank.clone(),
                    reference_height: t.reference_height.clone(),
                    ullage: t.ullage.clone(),
                    innage: None,
                    upper: None,
                    middle: None,
                    lower: None,
                    upper_height: None,
                    middle_height: None,
                    lower_height: None,
                    error: Some(e.message),
                }),
            }
        }
        SamplingResponseDTO {
            success: true,
            tanks: Some(out),
            errors: None,
        }
    }
}

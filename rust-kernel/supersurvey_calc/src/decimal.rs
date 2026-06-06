use crate::error::{KernelError, KernelErrorCode, KernelResult};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DecimalValue {
    #[serde(with = "rust_decimal::serde::str")]
    pub value: Decimal,
}

impl DecimalValue {
    pub fn parse(input: &str, field: &str) -> KernelResult<Self> {
        let cleaned = input.trim();
        if cleaned.is_empty() {
            return Err(KernelError::with_field(
                KernelErrorCode::ParseDecimalError,
                "Numeric value cannot be empty.",
                field,
            ));
        }
        let value = Decimal::from_str(cleaned).map_err(|_| {
            KernelError::with_field(
                KernelErrorCode::ParseDecimalError,
                format!("Invalid decimal value: {input}"),
                field,
            )
        })?;
        Ok(Self { value })
    }

    pub fn from_decimal(value: Decimal) -> Self {
        Self { value }
    }

    pub fn to_plain_string(&self) -> String {
        self.value.normalize().to_string()
    }
}

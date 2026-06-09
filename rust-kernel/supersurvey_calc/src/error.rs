use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum KernelErrorCode {
    ParseDecimalError,
    InvalidUnit,
    InvalidScope,
    PrecisionConfigError,
    IncompatibleUnits,
    NegativeQuantityNotAllowed,
    DivisionByZero,
    MissingRequiredTrace,
    InvalidFeetInches,
    UnsupportedConversion,
    InvalidMovementRole,
    MissingStagePair,
    OutOfTableRange,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct KernelError {
    pub code: KernelErrorCode,
    pub message: String,
    pub field: Option<String>,
}

impl KernelError {
    pub fn new(code: KernelErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            field: None,
        }
    }

    pub fn with_field(
        code: KernelErrorCode,
        message: impl Into<String>,
        field: impl Into<String>,
    ) -> Self {
        Self {
            code,
            message: message.into(),
            field: Some(field.into()),
        }
    }
}

impl Display for KernelError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match &self.field {
            Some(field) => write!(f, "{:?}: {} [{}]", self.code, self.message, field),
            None => write!(f, "{:?}: {}", self.code, self.message),
        }
    }
}

impl std::error::Error for KernelError {}

pub type KernelResult<T> = Result<T, KernelError>;

use crate::units::*;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UnitValue<U> {
    #[serde(with = "rust_decimal::serde::str")]
    pub value: Decimal,
    pub unit: U,
}

impl<U> UnitValue<U> {
    pub fn new(value: Decimal, unit: U) -> Self {
        Self { value, unit }
    }
}

pub type LengthValue = UnitValue<LengthUnit>;
pub type TemperatureValue = UnitValue<TemperatureUnit>;
pub type VolumeValue = UnitValue<VolumeUnit>;
pub type WeightValue = UnitValue<WeightUnit>;
pub type DensityValue = UnitValue<DensityUnit>;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FeetInchesValue {
    #[serde(with = "rust_decimal::serde::str")]
    pub feet: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub inches: Decimal,
}

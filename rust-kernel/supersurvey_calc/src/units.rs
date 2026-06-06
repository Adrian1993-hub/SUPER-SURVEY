use crate::error::{KernelError, KernelErrorCode, KernelResult};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LengthUnit {
    Meters,
    Centimeters,
    Millimeters,
    Feet,
    Inches,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TemperatureUnit {
    Celsius,
    Fahrenheit,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum VolumeUnit {
    CubicMeters,
    Litres,
    UsBarrels,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum WeightUnit {
    Kilograms,
    MetricTons,
    LongTons,
    ShortTons,
    Pounds,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DensityUnit {
    KgPerCubicMeter,
    KgPerLitre,
    ApiGravity,
    RelativeDensity60F60F,
    SpecificGravity60F60F,
}

macro_rules! parse_unit {
    ($impl_for:ty, $field:expr, { $($pattern:pat => $value:expr),+ $(,)? }) => {
        impl FromStr for $impl_for {
            type Err = KernelError;
            fn from_str(input: &str) -> KernelResult<Self> {
                let normalized = input.trim().to_ascii_uppercase().replace('-', "_").replace(' ', "_");
                match normalized.as_str() {
                    $($pattern => Ok($value),)+
                    _ => Err(KernelError::with_field(
                        KernelErrorCode::InvalidUnit,
                        format!("Unsupported unit: {input}"),
                        $field,
                    )),
                }
            }
        }
    };
}

parse_unit!(LengthUnit, "length_unit", {
    "M" | "METER" | "METERS" => LengthUnit::Meters,
    "CM" | "CENTIMETER" | "CENTIMETERS" => LengthUnit::Centimeters,
    "MM" | "MILLIMETER" | "MILLIMETERS" => LengthUnit::Millimeters,
    "FT" | "FOOT" | "FEET" => LengthUnit::Feet,
    "IN" | "INCH" | "INCHES" => LengthUnit::Inches,
});

parse_unit!(TemperatureUnit, "temperature_unit", {
    "C" | "CELSIUS" => TemperatureUnit::Celsius,
    "F" | "FAHRENHEIT" => TemperatureUnit::Fahrenheit,
});

parse_unit!(VolumeUnit, "volume_unit", {
    "M3" | "M_3" | "CUBIC_METER" | "CUBIC_METERS" | "CUBIC_METRES" => VolumeUnit::CubicMeters,
    "L" | "LITER" | "LITERS" | "LITRE" | "LITRES" => VolumeUnit::Litres,
    "BBL" | "BBLS" | "US_BARREL" | "US_BARRELS" => VolumeUnit::UsBarrels,
});

parse_unit!(WeightUnit, "weight_unit", {
    "KG" | "KILOGRAM" | "KILOGRAMS" => WeightUnit::Kilograms,
    "MT" | "METRIC_TON" | "METRIC_TONS" | "METRIC_TONNES" => WeightUnit::MetricTons,
    "LT" | "LONG_TON" | "LONG_TONS" => WeightUnit::LongTons,
    "ST" | "SHORT_TON" | "SHORT_TONS" => WeightUnit::ShortTons,
    "LB" | "LBS" | "POUND" | "POUNDS" => WeightUnit::Pounds,
});

parse_unit!(DensityUnit, "density_unit", {
    "KG_M3" | "KG_PER_M3" | "KG_PER_CUBIC_METER" | "KG_PER_CUBIC_METRE" => DensityUnit::KgPerCubicMeter,
    "KG_L" | "KG_PER_L" | "KG_PER_LITER" | "KG_PER_LITRE" => DensityUnit::KgPerLitre,
    "API" | "API_GRAVITY" => DensityUnit::ApiGravity,
    "RD" | "RELATIVE_DENSITY" | "RELATIVE_DENSITY_60F_60F" => DensityUnit::RelativeDensity60F60F,
    "SG" | "SPECIFIC_GRAVITY" | "SPECIFIC_GRAVITY_60F_60F" => DensityUnit::SpecificGravity60F60F,
});

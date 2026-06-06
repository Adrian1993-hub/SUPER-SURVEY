use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::units::*;
use crate::value::*;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;

// Conversion constants. These are exact definitions where applicable.
const METER_PER_FOOT: Decimal = dec!(0.3048);
const METER_PER_INCH: Decimal = dec!(0.0254);
const LITRES_PER_CUBIC_METER: Decimal = dec!(1000);
const CUBIC_METER_PER_US_BARREL: Decimal = dec!(0.158987294928);
const KG_PER_METRIC_TON: Decimal = dec!(1000);
const KG_PER_LONG_TON: Decimal = dec!(1016.0469088);
const KG_PER_SHORT_TON: Decimal = dec!(907.18474);
const KG_PER_POUND: Decimal = dec!(0.45359237);

pub fn convert_length(input: LengthValue, target_unit: LengthUnit) -> KernelResult<LengthValue> {
    let meters = match input.unit {
        LengthUnit::Meters => input.value,
        LengthUnit::Centimeters => input.value / dec!(100),
        LengthUnit::Millimeters => input.value / dec!(1000),
        LengthUnit::Feet => input.value * METER_PER_FOOT,
        LengthUnit::Inches => input.value * METER_PER_INCH,
    };

    let output = match target_unit {
        LengthUnit::Meters => meters,
        LengthUnit::Centimeters => meters * dec!(100),
        LengthUnit::Millimeters => meters * dec!(1000),
        LengthUnit::Feet => meters / METER_PER_FOOT,
        LengthUnit::Inches => meters / METER_PER_INCH,
    };

    Ok(LengthValue::new(output, target_unit))
}

pub fn feet_inches_to_length(
    input: FeetInchesValue,
    target_unit: LengthUnit,
) -> KernelResult<LengthValue> {
    if input.feet < dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::InvalidFeetInches,
            format!("Invalid feet/inches pair: feet={} must be >= 0", input.feet),
            "feet",
        ));
    }
    if input.inches < dec!(0) || input.inches >= dec!(12) {
        return Err(KernelError::with_field(
            KernelErrorCode::InvalidFeetInches,
            format!(
                "Invalid feet/inches pair: inches={} must be 0..<12",
                input.inches
            ),
            "inches",
        ));
    }
    let total_inches = (input.feet * dec!(12)) + input.inches;
    convert_length(
        LengthValue::new(total_inches, LengthUnit::Inches),
        target_unit,
    )
}

pub fn convert_temperature(
    input: TemperatureValue,
    target_unit: TemperatureUnit,
) -> KernelResult<TemperatureValue> {
    let celsius = match input.unit {
        TemperatureUnit::Celsius => input.value,
        TemperatureUnit::Fahrenheit => (input.value - dec!(32)) * dec!(5) / dec!(9),
    };
    let output = match target_unit {
        TemperatureUnit::Celsius => celsius,
        TemperatureUnit::Fahrenheit => (celsius * dec!(9) / dec!(5)) + dec!(32),
    };
    Ok(TemperatureValue::new(output, target_unit))
}

pub fn convert_volume(input: VolumeValue, target_unit: VolumeUnit) -> KernelResult<VolumeValue> {
    let cubic_meters = match input.unit {
        VolumeUnit::CubicMeters => input.value,
        VolumeUnit::Litres => input.value / LITRES_PER_CUBIC_METER,
        VolumeUnit::UsBarrels => input.value * CUBIC_METER_PER_US_BARREL,
    };
    let output = match target_unit {
        VolumeUnit::CubicMeters => cubic_meters,
        VolumeUnit::Litres => cubic_meters * LITRES_PER_CUBIC_METER,
        VolumeUnit::UsBarrels => cubic_meters / CUBIC_METER_PER_US_BARREL,
    };
    Ok(VolumeValue::new(output, target_unit))
}

pub fn convert_weight(input: WeightValue, target_unit: WeightUnit) -> KernelResult<WeightValue> {
    let kilograms = match input.unit {
        WeightUnit::Kilograms => input.value,
        WeightUnit::MetricTons => input.value * KG_PER_METRIC_TON,
        WeightUnit::LongTons => input.value * KG_PER_LONG_TON,
        WeightUnit::ShortTons => input.value * KG_PER_SHORT_TON,
        WeightUnit::Pounds => input.value * KG_PER_POUND,
    };
    let output = match target_unit {
        WeightUnit::Kilograms => kilograms,
        WeightUnit::MetricTons => kilograms / KG_PER_METRIC_TON,
        WeightUnit::LongTons => kilograms / KG_PER_LONG_TON,
        WeightUnit::ShortTons => kilograms / KG_PER_SHORT_TON,
        WeightUnit::Pounds => kilograms / KG_PER_POUND,
    };
    Ok(WeightValue::new(output, target_unit))
}

/// Density conversion is intentionally conservative in Sprint 1A/1B.
///
/// We do NOT convert mass density (kg/m³, kg/L) to SG/API/RD in this sprint,
/// because that crosses measurement bases: mass density labels such as density @15°C
/// cannot be silently converted to SG 60/60°F without API MPMS temperature correction
/// machinery. That belongs to the later API MPMS 11.x implementation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DensityFamily {
    Mass,
    Gravity,
}

fn density_family(unit: DensityUnit) -> DensityFamily {
    match unit {
        DensityUnit::KgPerCubicMeter | DensityUnit::KgPerLitre => DensityFamily::Mass,
        DensityUnit::ApiGravity
        | DensityUnit::RelativeDensity60F60F
        | DensityUnit::SpecificGravity60F60F => DensityFamily::Gravity,
    }
}

pub fn convert_density(
    input: DensityValue,
    target_unit: DensityUnit,
) -> KernelResult<DensityValue> {
    use DensityUnit::*;

    if density_family(input.unit) != density_family(target_unit) {
        return Err(KernelError::with_field(
            KernelErrorCode::UnsupportedConversion,
            format!(
                "Unsupported density conversion in Sprint 1A/1B: {:?} -> {:?}. Use API MPMS 11.x correction path in later sprint.",
                input.unit, target_unit
            ),
            "density_unit",
        ));
    }

    match density_family(input.unit) {
        DensityFamily::Mass => {
            let kg_per_m3 = match input.unit {
                KgPerCubicMeter => input.value,
                KgPerLitre => input.value * dec!(1000),
                _ => unreachable!(),
            };
            let output = match target_unit {
                KgPerCubicMeter => kg_per_m3,
                KgPerLitre => kg_per_m3 / dec!(1000),
                _ => unreachable!(),
            };
            Ok(DensityValue::new(output, target_unit))
        }
        DensityFamily::Gravity => {
            let sg_60_60 = match input.unit {
                SpecificGravity60F60F | RelativeDensity60F60F => input.value,
                ApiGravity => api_to_sg(input.value)?,
                _ => unreachable!(),
            };
            let output = match target_unit {
                SpecificGravity60F60F | RelativeDensity60F60F => sg_60_60,
                ApiGravity => sg_to_api(sg_60_60)?,
                _ => unreachable!(),
            };
            Ok(DensityValue::new(output, target_unit))
        }
    }
}

/// API <-> SG 60/60°F direct relationship.
/// This helper does not replace API MPMS 11.x temperature/density correction.
pub fn api_to_sg(api: Decimal) -> KernelResult<Decimal> {
    let denom = api + dec!(131.5);
    if denom == dec!(0) {
        return Err(KernelError::new(
            KernelErrorCode::DivisionByZero,
            "API to SG denominator is zero.",
        ));
    }
    Ok(dec!(141.5) / denom)
}

/// SG 60/60°F <-> API direct relationship.
/// This helper does not replace API MPMS 11.x temperature/density correction.
pub fn sg_to_api(sg: Decimal) -> KernelResult<Decimal> {
    if sg == dec!(0) {
        return Err(KernelError::new(
            KernelErrorCode::DivisionByZero,
            "SG to API denominator is zero.",
        ));
    }
    Ok((dec!(141.5) / sg) - dec!(131.5))
}

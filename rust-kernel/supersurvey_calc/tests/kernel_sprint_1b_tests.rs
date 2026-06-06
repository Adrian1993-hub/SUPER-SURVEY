use pretty_assertions::assert_eq;
use rust_decimal::Decimal;
use std::str::FromStr;
use supersurvey_calc::prelude::*;

#[test]
fn valid_dto_mapping_to_domain_should_work() {
    let dto = CalculationRequestDTO {
        job_id: "job-uuid".into(),
        measurement_record_id: "record-uuid".into(),
        calculation_scope: "LIVE".into(),
        tov_value: "14500.650".into(),
        tov_unit: "CUBIC_METERS".into(),
        free_water_value: "10.150".into(),
        free_water_unit: "CUBIC_METERS".into(),
        vcf: "0.99241".into(),
        wcf: "0.85412".into(),
        rounding_rule: "HALF_UP".into(),
        intermediate_rounding: false,
        observed_volume_decimals: 3,
        standard_volume_decimals: 3,
        weight_decimals: 3,
    };
    let (inputs, config, scope) = dto.to_domain_inputs().unwrap();
    assert_eq!(inputs.tov.value, Decimal::from_str("14500.650").unwrap());
    assert_eq!(
        inputs.free_water.value,
        Decimal::from_str("10.150").unwrap()
    );
    assert_eq!(config.rounding_rule, SystemRoundingRule::HalfUp);
    assert_eq!(scope, CalculationScope::Live);
}

#[test]
fn malformed_decimal_should_fail() {
    let dto = CalculationRequestDTO {
        job_id: "job-uuid".into(),
        measurement_record_id: "record-uuid".into(),
        calculation_scope: "LIVE".into(),
        tov_value: "14500.650-CORRUPT".into(),
        tov_unit: "CUBIC_METERS".into(),
        free_water_value: "0".into(),
        free_water_unit: "CUBIC_METERS".into(),
        vcf: "1".into(),
        wcf: "1".into(),
        rounding_rule: "HALF_UP".into(),
        intermediate_rounding: false,
        observed_volume_decimals: 3,
        standard_volume_decimals: 3,
        weight_decimals: 3,
    };
    let err = dto.to_domain_inputs().unwrap_err();
    assert_eq!(err.code, KernelErrorCode::ParseDecimalError);
}

#[test]
fn basic_quantity_chain_live_should_return_no_trace() {
    let dto = CalculationRequestDTO {
        job_id: "job-uuid".into(),
        measurement_record_id: "record-uuid".into(),
        calculation_scope: "LIVE".into(),
        tov_value: "1000.000".into(),
        tov_unit: "CUBIC_METERS".into(),
        free_water_value: "10.000".into(),
        free_water_unit: "CUBIC_METERS".into(),
        vcf: "0.99000".into(),
        wcf: "0.85000".into(),
        rounding_rule: "HALF_UP".into(),
        intermediate_rounding: false,
        observed_volume_decimals: 3,
        standard_volume_decimals: 3,
        weight_decimals: 3,
    };
    let response = dto.calculate();
    assert!(response.success);
    assert_eq!(response.gov_value.as_deref(), Some("990"));
    assert_eq!(response.gsv_value.as_deref(), Some("980.1"));
    assert_eq!(response.weight_air_value.as_deref(), Some("833.085"));
    assert!(response.trace_json.is_none());
}

#[test]
fn basic_quantity_chain_save_should_return_trace() {
    let dto = CalculationRequestDTO {
        job_id: "job-uuid".into(),
        measurement_record_id: "record-uuid".into(),
        calculation_scope: "SAVE".into(),
        tov_value: "1000.000".into(),
        tov_unit: "CUBIC_METERS".into(),
        free_water_value: "10.000".into(),
        free_water_unit: "CUBIC_METERS".into(),
        vcf: "0.99000".into(),
        wcf: "0.85000".into(),
        rounding_rule: "HALF_UP".into(),
        intermediate_rounding: false,
        observed_volume_decimals: 3,
        standard_volume_decimals: 3,
        weight_decimals: 3,
    };
    let response = dto.calculate();
    assert!(response.success);
    assert!(response.trace_json.is_some());
}

#[test]
fn volume_conversion_barrels_to_cubic_meters_should_be_decimal_safe() {
    let bbl = VolumeValue::new(Decimal::from_str("1").unwrap(), VolumeUnit::UsBarrels);
    let m3 = convert_volume(bbl, VolumeUnit::CubicMeters).unwrap();
    assert_eq!(m3.value, Decimal::from_str("0.158987294928").unwrap());
}

#[test]
fn density_mass_family_conversion_should_be_exact() {
    let kg_l = DensityValue::new(Decimal::from_str("0.850").unwrap(), DensityUnit::KgPerLitre);
    let kg_m3 = convert_density(kg_l, DensityUnit::KgPerCubicMeter).unwrap();
    assert_eq!(kg_m3.value, Decimal::from_str("850.000").unwrap());
}

#[test]
fn density_gravity_family_api_sg_roundtrip_should_work() {
    let api = Decimal::from_str("35.0").unwrap();
    let sg = api_to_sg(api).unwrap();
    let api_back = sg_to_api(sg).unwrap();
    assert_eq!(api_back.round_dp(10), api.round_dp(10));
}

#[test]
fn density_mass_to_gravity_should_fail_loudly_until_api_mpms_sprint() {
    let density = DensityValue::new(
        Decimal::from_str("850").unwrap(),
        DensityUnit::KgPerCubicMeter,
    );
    let err = convert_density(density, DensityUnit::SpecificGravity60F60F).unwrap_err();
    assert_eq!(err.code, KernelErrorCode::UnsupportedConversion);
}

#[test]
fn feet_inches_negative_feet_should_fail() {
    let input = FeetInchesValue {
        feet: Decimal::from_str("-1").unwrap(),
        inches: Decimal::from_str("3").unwrap(),
    };
    let err = feet_inches_to_length(input, LengthUnit::Meters).unwrap_err();
    assert_eq!(err.code, KernelErrorCode::InvalidFeetInches);
}

//! End-to-end BQS orchestration tests: surveyor inputs -> worksheet outputs.
//!
//! These feed the exact fields a surveyor types (density @ 15 °C, temperature,
//! table volume, free water, table) and assert the kernel reproduces the real,
//! anonymized BQS worksheet — proving the captured-data path, not just isolated
//! factors. Worksheet multiplies from rounded intermediates, so intermediate
//! rounding is on (the field convention); MT(air) is the official figure.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use supersurvey_calc::prelude::*;

fn worksheet_precision() -> PrecisionConfiguration {
    PrecisionConfiguration {
        intermediate_rounding: true,
        ..PrecisionConfiguration::default()
    }
}

fn tank(
    density: Decimal,
    temp: Decimal,
    tov: Decimal,
    fw: Decimal,
    table: AstmTable,
) -> BqsTankInput {
    BqsTankInput {
        density15: DensityValue::new(density, DensityUnit::KgPerLitre),
        temperature: TemperatureValue::new(temp, TemperatureUnit::Celsius),
        tov: VolumeValue::new(tov, VolumeUnit::CubicMeters),
        free_water: VolumeValue::new(fw, VolumeUnit::CubicMeters),
        table,
        table_version: Default::default(),
    }
}

fn row(density: Decimal, temp: Decimal, tov: Decimal) -> BqsTankResult {
    compute_bqs_tank_row(
        tank(density, temp, tov, dec!(0), AstmTable::Table54B),
        worksheet_precision(),
        CalculationScope::QaTest,
    )
    .expect("row computes")
    .0
}

#[test]
fn aft_bunker_tank_row_matches_worksheet() {
    let r = row(dec!(0.9534), dec!(35.0), dec!(222.680));
    assert_eq!(r.vcf, dec!(0.9856));
    assert_eq!(r.gsv.value, dec!(219.473));
    assert_eq!(r.mt_air.value, dec!(209.004)); // official figure on the sheet
    assert_eq!(r.wcf_air, dec!(0.9523));
    // Vacuum = GSV × ρ15 = 219.473 × 0.9534
    assert_eq!(r.mt_vacuum.value, dec!(209.246));
    assert_eq!(r.product_group, Some(Table54bProductGroup::FuelOils));
}

#[test]
fn service_tank_row_matches_worksheet() {
    let r = row(dec!(0.9534), dec!(92.0), dec!(60.680));
    assert_eq!(r.vcf, dec!(0.9441));
    assert_eq!(r.gsv.value, dec!(57.288));
    assert_eq!(r.mt_air.value, dec!(54.555));
}

#[test]
fn free_water_is_deducted_before_vcf() {
    // TOV 100, FW 5 -> GOV 95, then VCF/MT on 95.
    let r = compute_bqs_tank_row(
        tank(
            dec!(0.9534),
            dec!(35.0),
            dec!(100.0),
            dec!(5.0),
            AstmTable::Table54B,
        ),
        worksheet_precision(),
        CalculationScope::Live,
    )
    .unwrap()
    .0;
    assert_eq!(r.gov.value, dec!(95.000));
    // 95 × 0.9856 = 93.632
    assert_eq!(r.gsv.value, dec!(93.632));
}

#[test]
fn before_receiving_section_totals_match_worksheet() {
    let inputs = vec![
        tank(
            dec!(0.9534),
            dec!(35.0),
            dec!(3.900),
            dec!(0),
            AstmTable::Table54B,
        ),
        tank(
            dec!(0.9534),
            dec!(35.0),
            dec!(3.300),
            dec!(0),
            AstmTable::Table54B,
        ),
        tank(
            dec!(0.9534),
            dec!(30.0),
            dec!(5.570),
            dec!(0),
            AstmTable::Table54B,
        ),
        tank(
            dec!(0.9534),
            dec!(35.0),
            dec!(222.680),
            dec!(0),
            AstmTable::Table54B,
        ),
        tank(
            dec!(0.9534),
            dec!(35.0),
            dec!(4.250),
            dec!(0),
            AstmTable::Table54B,
        ),
        tank(
            dec!(0.9534),
            dec!(35.0),
            dec!(7.640),
            dec!(0),
            AstmTable::Table54B,
        ),
        tank(
            dec!(0.9534),
            dec!(88.0),
            dec!(52.280),
            dec!(0),
            AstmTable::Table54B,
        ),
        tank(
            dec!(0.9534),
            dec!(92.0),
            dec!(60.680),
            dec!(0),
            AstmTable::Table54B,
        ),
    ];
    let section =
        compute_bqs_section(inputs, worksheet_precision(), CalculationScope::Save).unwrap();
    assert_eq!(section.rows.len(), 8);
    assert_eq!(section.total_gov.value, dec!(360.300)); // worksheet TOV/GOV total
                                                        // Worksheet MT total 333.876; 88 C printed-table VCF variance ~0.005 MT.
    assert!((section.total_mt_air.value - dec!(333.876)).abs() <= dec!(0.010));
    assert!(section.trace.is_some());
}

#[test]
fn negative_tov_is_rejected() {
    let err = compute_bqs_tank_row(
        tank(
            dec!(0.9534),
            dec!(35.0),
            dec!(-1.0),
            dec!(0),
            AstmTable::Table54B,
        ),
        worksheet_precision(),
        CalculationScope::Live,
    )
    .unwrap_err();
    assert_eq!(err.code, KernelErrorCode::NegativeQuantityNotAllowed);
}

// ---------- DTO (IPC boundary) ----------

#[test]
fn dto_calculates_row_from_string_inputs() {
    let request = BqsRowRequestDTO {
        calculation_scope: "SAVE".to_string(),
        density15_value: "0.9534".to_string(),
        density15_unit: "KG_PER_LITRE".to_string(),
        temperature_value: "35.0".to_string(),
        temperature_unit: "CELSIUS".to_string(),
        tov_value: "222.680".to_string(),
        tov_unit: "CUBIC_METERS".to_string(),
        free_water_value: "0".to_string(),
        free_water_unit: "CUBIC_METERS".to_string(),
        astm_table: "54B".to_string(),
        table_version: "D1250_80".to_string(),
        rounding_rule: "HALF_UP".to_string(),
        intermediate_rounding: true,
        observed_volume_decimals: 3,
        standard_volume_decimals: 3,
        weight_decimals: 3,
    };
    let response = request.calculate();
    assert!(response.success);
    assert_eq!(response.vcf.as_deref(), Some("0.9856"));
    assert_eq!(response.gsv_value.as_deref(), Some("219.473"));
    assert_eq!(response.mt_air_value.as_deref(), Some("209.004"));
    assert_eq!(response.product_group.as_deref(), Some("FUEL_OILS"));
    assert!(response.trace_json.is_some());
    assert!(response.errors.is_none());
}

#[test]
fn dto_reports_errors_without_panicking() {
    let request = BqsRowRequestDTO {
        calculation_scope: "LIVE".to_string(),
        density15_value: "0.9534".to_string(),
        density15_unit: "KG_PER_LITRE".to_string(),
        temperature_value: "35.0".to_string(),
        temperature_unit: "CELSIUS".to_string(),
        tov_value: "100".to_string(),
        tov_unit: "CUBIC_METERS".to_string(),
        free_water_value: "0".to_string(),
        free_water_unit: "CUBIC_METERS".to_string(),
        astm_table: "NOPE".to_string(),
        table_version: String::new(),
        rounding_rule: "HALF_UP".to_string(),
        intermediate_rounding: true,
        observed_volume_decimals: 3,
        standard_volume_decimals: 3,
        weight_decimals: 3,
    };
    let response = request.calculate();
    assert!(!response.success);
    assert!(response.errors.is_some());
}

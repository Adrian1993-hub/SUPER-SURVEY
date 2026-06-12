//! Petroleum-table EDITION selector (D1250-80 vs D1250-04 / API MPMS 11.1).
//!
//! Honest scope (see docs/research/d1250-80-vs-2004.md): at atmospheric
//! pressure the two editions share the generalized-product correlation, so the
//! UNROUNDED CTL/VCF is identical. What the edition changes here is the OUTPUT
//! resolution (1980: 4 dp, 2004: 5 dp) and the recorded provenance.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use std::str::FromStr;
use supersurvey_calc::astm::TableVersion;
use supersurvey_calc::bqs::BqsRowRequestDTO;

fn request(table_version: &str) -> BqsRowRequestDTO {
    BqsRowRequestDTO {
        calculation_scope: "TRACE_VIEW".into(),
        density15_value: "0.9534".into(),
        density15_unit: "KG_L".into(),
        temperature_value: "35.0".into(),
        temperature_unit: "C".into(),
        tov_value: "222.680".into(),
        tov_unit: "CUBIC_METERS".into(),
        free_water_value: "0".into(),
        free_water_unit: "CUBIC_METERS".into(),
        astm_table: "54B".into(),
        table_version: table_version.into(),
        rounding_rule: "HALF_UP".into(),
        intermediate_rounding: true,
        observed_volume_decimals: 3,
        standard_volume_decimals: 3,
        weight_decimals: 3,
    }
}

#[test]
fn default_edition_is_1980() {
    assert_eq!(TableVersion::default(), TableVersion::D1250_1980);
    assert_eq!(TableVersion::D1250_1980.default_vcf_decimals(), 4);
    assert_eq!(TableVersion::D1250_2004.default_vcf_decimals(), 5);
}

#[test]
fn edition_parser_accepts_aliases() {
    for s in ["", "1980", "80", "D1250_80", "D1250-80", "ASTM D1250 80"] {
        assert_eq!(TableVersion::from_str(s).unwrap(), TableVersion::D1250_1980);
    }
    for s in [
        "2004",
        "04",
        "D1250_04",
        "D1250-04",
        "API MPMS 11.1",
        "api_mpms_11_1",
    ] {
        assert_eq!(TableVersion::from_str(s).unwrap(), TableVersion::D1250_2004);
    }
    assert!(TableVersion::from_str("1999").is_err());
}

/// 1980 prints the VCF at 4 dp; the worksheet anchor is 0.9856.
#[test]
fn edition_1980_vcf_is_4dp() {
    let response = request("D1250_80").calculate();
    assert!(response.success, "errors: {:?}", response.errors);
    assert_eq!(response.vcf.as_deref(), Some("0.9856"));
    assert_eq!(response.table_version.as_deref(), Some("D1250_1980"));
}

/// 2004 keeps the same equation but reports the VCF at 5 dp — so it carries one
/// more significant digit than the 1980 figure (and rounds to it consistently).
#[test]
fn edition_2004_vcf_is_5dp_same_root() {
    let response = request("D1250_04").calculate();
    assert!(response.success, "errors: {:?}", response.errors);
    let vcf = response.vcf.as_deref().expect("vcf");
    assert_eq!(response.table_version.as_deref(), Some("D1250_2004"));
    // 5 decimal places, and rounds back to the 1980 4-dp figure.
    let decimals = vcf.split('.').nth(1).map(str::len).unwrap_or(0);
    assert_eq!(decimals, 5, "2004 VCF should be 5 dp, got {vcf}");
    let v = Decimal::from_str(vcf).unwrap();
    assert!(
        (v - dec!(0.9856)).abs() < dec!(0.00005),
        "2004 VCF {vcf} != 1980 root"
    );
}

/// The default (no edition supplied) behaves as 1980.
#[test]
fn missing_edition_defaults_to_1980() {
    let response = request("").calculate();
    assert!(response.success, "errors: {:?}", response.errors);
    assert_eq!(response.vcf.as_deref(), Some("0.9856"));
    assert_eq!(response.table_version.as_deref(), Some("D1250_1980"));
}

#[test]
fn invalid_edition_fails_cleanly() {
    let response = request("D1250_1999").calculate();
    assert!(!response.success);
    assert!(response.errors.is_some());
}

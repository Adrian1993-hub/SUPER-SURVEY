//! Imperial BQS row orchestrator (DTO) — end-to-end against the client worksheet.

use supersurvey_calc::bqs60::ImperialRowRequestDTO;

fn req(api: &str, temp_c: &str, vol_m3: &str, scope: &str) -> ImperialRowRequestDTO {
    ImperialRowRequestDTO {
        calculation_scope: scope.into(),
        api_value: api.into(),
        temperature_value: temp_c.into(),
        temperature_unit: "CELSIUS".into(),
        volume_value: vol_m3.into(),
        volume_unit: "CUBIC_METERS".into(),
        free_water_value: "0".into(),
        free_water_unit: "CUBIC_METERS".into(),
        astm_table: "6B".into(),
        rounding_rule: "HALF_UP".into(),
        gsv_decimals: 2,
        weight_decimals: 3,
    }
}

/// HFO SETT.: API 15.39, 89 °C, 14.10 m³ → GSV 84.02 bbl, 12.841 MT (sheet).
#[test]
fn imperial_row_matches_worksheet_hfo_settling() {
    let r = req("15.39", "89", "14.10", "SAVE").calculate();
    assert!(r.success, "errors: {:?}", r.errors);
    assert_eq!(r.vcf.as_deref(), Some("0.94733"));
    assert_eq!(r.product_group.as_deref(), Some("FuelOils"));
    assert_eq!(r.gsv_bbl.as_deref(), Some("84.02"));
    assert_eq!(r.wcf13.as_deref(), Some("0.15283"));
    assert_eq!(r.mt_air.as_deref(), Some("12.841"));
    assert!(r.trace_json.is_some(), "SAVE carries a trace");
}

/// OVERFLOW: API 19.95, 40 °C, 7.36 m³ → GSV 45.46 bbl, 6.738 MT.
#[test]
fn imperial_row_matches_worksheet_overflow() {
    let r = req("19.95", "40", "7.36", "LIVE").calculate();
    assert!(r.success, "errors: {:?}", r.errors);
    assert_eq!(r.vcf.as_deref(), Some("0.98192"));
    assert_eq!(r.gsv_bbl.as_deref(), Some("45.46"));
    assert_eq!(r.mt_air.as_deref(), Some("6.738"));
    assert!(r.trace_json.is_none(), "LIVE skips the trace");
}

#[test]
fn imperial_row_rejects_free_water_over_volume() {
    let mut r = req("16.4", "30", "10", "LIVE");
    r.free_water_value = "100".into();
    let out = r.calculate();
    assert!(!out.success);
    assert!(out.errors.is_some());
}

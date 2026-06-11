//! Density utilities QA: cross-base (API ↔ ρ15), cross-temperature
//! (ρ_obs @ t ↔ ρ15) and blending.
//!
//! Anchors are hand-derived from the same D1250-80 equations the kernel
//! implements (see density.rs header for the method and caveats); round-trips
//! must close far below the last reported decimal.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use std::str::FromStr;
use supersurvey_calc::bqs::AstmTable;
use supersurvey_calc::density::*;
use supersurvey_calc::units::TemperatureUnit;
use supersurvey_calc::value::UnitValue;

fn celsius(value: Decimal) -> supersurvey_calc::value::TemperatureValue {
    UnitValue::new(value, TemperatureUnit::Celsius)
}

fn assert_close(actual: Decimal, expected: Decimal, tolerance: Decimal, label: &str) {
    let delta = (actual - expected).abs();
    assert!(
        delta <= tolerance,
        "{label}: |{actual} - {expected}| = {delta} > {tolerance}"
    );
}

// ---------------------------------------------------------------------------
// Cross-temperature: ρ_obs(t) = ρ15 × VCF(ρ15, t) and its inversion.
// ---------------------------------------------------------------------------

/// Worksheet anchor: ρ15 = 953.4 kg/m³ @ 35 °C has VCF 0.9856 (validated BQS
/// sheet). The observed density must therefore be ≈ 953.4 × 0.9856.
#[test]
fn observed_density_matches_worksheet_vcf() {
    let observed =
        observed_density_from_rho15(dec!(953.4), &celsius(dec!(35.0)), AstmTable::Table54B)
            .expect("in-domain");
    // 953.4 × 0.9856 = 939.67 (rounded VCF) — equation VCF is unrounded, so
    // allow the 4th-decimal-of-VCF band: 953.4 × 0.00005 ≈ 0.05.
    assert_close(observed, dec!(939.67), dec!(0.05), "rho_obs @ 35C");
}

/// Lab figure @ 20 °C → ρ15. Hand iteration with the FuelOils constants
/// (K0=186.9696, K1=0.48618) gives ρ15 ≈ 947.43 for ρ20 = 944.0.
#[test]
fn rho15_from_lab_density_at_20c() {
    let rho15 = rho15_from_observed_density(dec!(944.0), &celsius(dec!(20.0)), AstmTable::Table54B)
        .expect("in-domain");
    assert_close(rho15, dec!(947.43), dec!(0.05), "rho15 from rho20");
    // And the round trip closes far below 0.0001 kg/m³.
    let back = observed_density_from_rho15(rho15, &celsius(dec!(20.0)), AstmTable::Table54B)
        .expect("in-domain");
    assert_close(back, dec!(944.0), dec!(0.00001), "round trip rho20");
}

/// At exactly 15 °C the conversion must be the identity (VCF = 1).
#[test]
fn observed_at_15c_is_identity() {
    let observed =
        observed_density_from_rho15(dec!(947.5), &celsius(dec!(15.0)), AstmTable::Table54B)
            .expect("in-domain");
    assert_eq!(observed, dec!(947.5));
    let rho15 = rho15_from_observed_density(dec!(947.5), &celsius(dec!(15.0)), AstmTable::Table54B)
        .expect("in-domain");
    assert_eq!(rho15, dec!(947.5));
}

/// The inversion converges even when the iteration crosses a 54B product
/// group boundary (observed just below 838.7, true ρ15 above it).
#[test]
fn inversion_across_group_boundary_converges() {
    let rho15 = rho15_from_observed_density(dec!(838.0), &celsius(dec!(30.0)), AstmTable::Table54B)
        .expect("in-domain");
    assert!(
        rho15 > dec!(838.7),
        "rho15 {rho15} should cross into FuelOils"
    );
    let back = observed_density_from_rho15(rho15, &celsius(dec!(30.0)), AstmTable::Table54B)
        .expect("in-domain");
    assert_close(
        back,
        dec!(838.0),
        dec!(0.00001),
        "round trip across boundary",
    );
}

#[test]
fn observed_density_rejects_non_positive() {
    assert!(
        rho15_from_observed_density(dec!(0), &celsius(dec!(20.0)), AstmTable::Table54B).is_err()
    );
    assert!(
        rho15_from_observed_density(dec!(-944), &celsius(dec!(20.0)), AstmTable::Table54B).is_err()
    );
}

// ---------------------------------------------------------------------------
// Cross-base: API ↔ ρ15 via SG 60/60 °F and water @ 60 °F.
// ---------------------------------------------------------------------------

/// API 10 ⇒ SG 60/60 = 1 exactly ⇒ ρ60 = 999.016 kg/m³ ⇒ ρ15 slightly higher
/// (oil is denser at 15 °C than at 60 °F = 15.56 °C).
#[test]
fn api_10_is_sg_one() {
    let computation = rho15_from_api(dec!(10), AstmTable::Table54B).expect("in-domain");
    assert_eq!(computation.sg60, dec!(1));
    assert_eq!(computation.rho60_kg_m3, dec!(999.016));
    assert!(
        computation.rho15_kg_m3 > dec!(999.016) && computation.rho15_kg_m3 < dec!(999.8),
        "rho15 {} should sit just above rho60",
        computation.rho15_kg_m3
    );
}

/// Round trip API → ρ15 → API closes to well under 0.01 °API.
#[test]
fn api_round_trip_closes() {
    for api in [dec!(11.35), dec!(20.5), dec!(35.0), dec!(45.2)] {
        let forward = rho15_from_api(api, AstmTable::Table54B).expect("in-domain");
        let back = api_from_rho15(forward.rho15_kg_m3, AstmTable::Table54B).expect("in-domain");
        assert_close(back.api, api, dec!(0.0001), "API round trip");
    }
}

/// Worksheet-adjacent anchor: VLSFO ρ15 = 947.6 kg/m³ ⇒ API ≈ 17.7.
/// (SG60 ≈ 947.28/999.016 ≈ 0.94822 ⇒ API = 141.5/0.94822 − 131.5 ≈ 17.73.)
#[test]
fn vlsfo_api_anchor() {
    let computation = api_from_rho15(dec!(947.6), AstmTable::Table54B).expect("in-domain");
    assert_close(computation.api, dec!(17.73), dec!(0.05), "VLSFO API");
}

// ---------------------------------------------------------------------------
// Blend.
// ---------------------------------------------------------------------------

/// 100 m³ @ 950 + 50 m³ @ 860 ⇒ (95000+43000)/150 = 920 kg/m³ exactly.
#[test]
fn blend_volume_weighted_exact() {
    let computation = blend_density(&[
        BlendParcel {
            volume_m3: dec!(100),
            rho15_kg_m3: dec!(950),
        },
        BlendParcel {
            volume_m3: dec!(50),
            rho15_kg_m3: dec!(860),
        },
    ])
    .expect("valid parcels");
    assert_eq!(computation.total_volume_m3, dec!(150));
    assert_eq!(computation.total_mass_kg, dec!(138000));
    assert_eq!(computation.rho15_kg_m3, dec!(920));
}

#[test]
fn blend_rejects_bad_input() {
    assert!(blend_density(&[]).is_err());
    assert!(blend_density(&[BlendParcel {
        volume_m3: dec!(0),
        rho15_kg_m3: dec!(950),
    }])
    .is_err());
    assert!(blend_density(&[BlendParcel {
        volume_m3: dec!(10),
        rho15_kg_m3: dec!(-1),
    }])
    .is_err());
}

// ---------------------------------------------------------------------------
// DTO boundary.
// ---------------------------------------------------------------------------

#[test]
fn dto_observed_to_rho15_kg_l() {
    let request = DensityToolRequestDTO {
        operation: "OBSERVED_TO_RHO15".into(),
        value: Some("0.9440".into()),
        density15_unit: "KG_L".into(),
        temperature_value: Some("20".into()),
        temperature_unit: "C".into(),
        astm_table: "54B".into(),
        parcels: vec![],
        calculation_scope: "LIVE".into(),
    };
    let response = request.calculate();
    assert!(response.success, "errors: {:?}", response.errors);
    assert_eq!(response.rho15_kg_l.as_deref(), Some("0.9474"));
    assert!(response.trace_json.is_none(), "LIVE skips the full trace");
}

#[test]
fn dto_api_to_rho15_with_trace() {
    let request = DensityToolRequestDTO {
        operation: "API_TO_RHO15".into(),
        value: Some("35".into()),
        density15_unit: "KG_L".into(),
        temperature_value: None,
        temperature_unit: "C".into(),
        astm_table: "54B".into(),
        parcels: vec![],
        calculation_scope: "TRACE_VIEW".into(),
    };
    let response = request.calculate();
    assert!(response.success, "errors: {:?}", response.errors);
    let rho15: Decimal =
        Decimal::from_str(response.rho15_kg_m3_unrounded.as_deref().unwrap()).unwrap();
    // SG60 = 141.5/166.5 ≈ 0.849850; ρ60 ≈ 849.01; ρ15 a bit above.
    assert!(rho15 > dec!(849.0) && rho15 < dec!(850.0), "rho15 {rho15}");
    assert!(response.trace_json.is_some(), "TRACE_VIEW carries a trace");
}

#[test]
fn dto_blend() {
    let request = DensityToolRequestDTO {
        operation: "BLEND".into(),
        value: None,
        density15_unit: "KG_L".into(),
        temperature_value: None,
        temperature_unit: "C".into(),
        astm_table: "54B".into(),
        parcels: vec![
            BlendParcelDTO {
                volume_value: "100".into(),
                density15_value: "0.9500".into(),
            },
            BlendParcelDTO {
                volume_value: "50".into(),
                density15_value: "0.8600".into(),
            },
        ],
        calculation_scope: "LIVE".into(),
    };
    let response = request.calculate();
    assert!(response.success, "errors: {:?}", response.errors);
    assert_eq!(response.rho15_kg_l.as_deref(), Some("0.9200"));
    assert_eq!(response.total_volume_m3.as_deref(), Some("150.000"));
    assert_eq!(response.total_mt_vacuum.as_deref(), Some("138.000"));
}

#[test]
fn dto_missing_value_fails_cleanly() {
    let request = DensityToolRequestDTO {
        operation: "API_TO_RHO15".into(),
        value: None,
        density15_unit: "KG_L".into(),
        temperature_value: None,
        temperature_unit: "C".into(),
        astm_table: "54B".into(),
        parcels: vec![],
        calculation_scope: "LIVE".into(),
    };
    let response = request.calculate();
    assert!(!response.success);
    assert!(response.errors.is_some());
}

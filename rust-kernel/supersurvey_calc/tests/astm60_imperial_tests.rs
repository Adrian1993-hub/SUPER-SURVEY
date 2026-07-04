//! QA for the US-customary 60 °F family (Table 6A/6B VCF + Table 13 WCF).
//!
//! Anchors are the COMPUTED values from a real client imperial BQS worksheet,
//! read out of its hidden calculation columns (Z–AH). The worksheet itself runs
//! the same equations by `EXP(...)`, so the kernel must reproduce them to 5 dp
//! (allowing the documented ±1-in-last-place table variance, since our Decimal
//! engine is more precise than the sheet's f64).
//!
//! See docs/research/formato-bqs-imperial-multigrado.md.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use supersurvey_calc::astm60::*;
use supersurvey_calc::precision::SystemRoundingRule::HalfUp;

fn close(actual: Decimal, expected: Decimal, tol: Decimal, label: &str) {
    let d = (actual - expected).abs();
    assert!(d <= tol, "{label}: |{actual} - {expected}| = {d} > {tol}");
}

fn vcf6b(api: Decimal, temp_f: Decimal) -> Decimal {
    table_6b_vcf(api, temp_f, DEFAULT_VCF60_DECIMALS, HalfUp)
        .unwrap()
        .vcf
}
fn wcf13(api: Decimal) -> Decimal {
    table_13_wcf(api, DEFAULT_WCF13_DECIMALS, HalfUp)
        .unwrap()
        .wcf
}

// ---- VCF Table 6B (fuel oils group, API < 37.01) ------------------------

/// Tank 1S closing: API 16.40 @ 103.64 °F → worksheet VCF 0.98261.
#[test]
fn vcf_6b_tank_1s_closing() {
    close(
        vcf6b(dec!(16.40), dec!(103.64)),
        dec!(0.98261),
        dec!(0.00001),
        "1S",
    );
}

/// Tank 1P closing: API 16.40 @ 103.82 °F → 0.98254.
#[test]
fn vcf_6b_tank_1p_closing() {
    close(
        vcf6b(dec!(16.40), dec!(103.82)),
        dec!(0.98254),
        dec!(0.00001),
        "1P",
    );
}

/// HFO settling: API 15.39 @ 192.20 °F (hot tank) → 0.94733.
#[test]
fn vcf_6b_hfo_settling() {
    close(
        vcf6b(dec!(15.39), dec!(192.20)),
        dec!(0.94733),
        dec!(0.00001),
        "HFO SETT",
    );
}

/// OVERFLOW: API 19.95 @ 104.00 °F → 0.98192.
#[test]
fn vcf_6b_overflow() {
    close(
        vcf6b(dec!(19.95), dec!(104.00)),
        dec!(0.98192),
        dec!(0.00001),
        "OVERFLOW",
    );
}

/// Opening 2P: API 15.39 @ 98.60 °F → 0.98477.
#[test]
fn vcf_6b_2p_opening() {
    close(
        vcf6b(dec!(15.39), dec!(98.60)),
        dec!(0.98477),
        dec!(0.00001),
        "2P",
    );
}

// ---- WCF Table 13 (MT per barrel) ---------------------------------------

#[test]
fn wcf_13_anchors() {
    // From the worksheet's column Q (METRIC TONS factor):
    close(
        wcf13(dec!(15.18)),
        dec!(0.15305),
        dec!(0.00001),
        "WCF 15.18",
    );
    close(
        wcf13(dec!(15.39)),
        dec!(0.15283),
        dec!(0.00001),
        "WCF 15.39",
    );
    close(
        wcf13(dec!(19.95)),
        dec!(0.14822),
        dec!(0.00001),
        "WCF 19.95",
    );
    close(
        wcf13(dec!(16.40)),
        dec!(0.15178),
        dec!(0.00002),
        "WCF 16.40",
    );
}

// ---- End-to-end barrels → MT (matches sheet to 3 dp) --------------------

/// HFO SETT: GOV 88.69 bbl, VCF 0.94733 → GSV 84.02 bbl; × WCF 0.15283 → 12.841 MT.
#[test]
fn end_to_end_hfo_settling_metric_tons() {
    let gov_bbl = dec!(88.69);
    let vcf = vcf6b(dec!(15.39), dec!(192.20));
    let gsv = (gov_bbl * vcf).round_dp(2);
    close(gsv, dec!(84.02), dec!(0.02), "GSV bbl");
    let mt = (gsv * wcf13(dec!(15.39))).round_dp(3);
    close(mt, dec!(12.841), dec!(0.003), "MT");
}

// ---- Group selection by API band ----------------------------------------

#[test]
fn group_selection_by_api_band() {
    assert_eq!(select_6b_group(dec!(16.4)), Table6bProductGroup::FuelOils);
    assert_eq!(select_6b_group(dec!(45.0)), Table6bProductGroup::JetFuels);
    assert_eq!(
        select_6b_group(dec!(50.0)),
        Table6bProductGroup::TransitionZone
    );
    assert_eq!(select_6b_group(dec!(60.0)), Table6bProductGroup::Gasolines);
    // boundaries are exclusive upper (matches IF(API<37.01,…))
    assert_eq!(select_6b_group(dec!(37.01)), Table6bProductGroup::JetFuels);
}

// ---- API ↔ density @ 60 °F round trip -----------------------------------

#[test]
fn api_density60_round_trip() {
    // API 16.4 → ρ60 = 141.5·999.016/147.9 ≈ 955.77 kg/m³
    let rho = density60_from_api(dec!(16.4)).unwrap();
    close(rho, dec!(955.77), dec!(0.02), "rho60");
    let api = api_from_density60(rho).unwrap();
    close(api, dec!(16.4), dec!(0.0001), "api round trip");
}

/// At the 60 °F base the corrected temperature ≈ base and VCF ≈ 1.
#[test]
fn vcf_near_unity_at_base_temp() {
    let v = vcf6b(dec!(16.4), dec!(60.0));
    close(v, dec!(1.0), dec!(0.0001), "VCF at ~60F");
}

#[test]
fn negative_api_density_fails() {
    assert!(density60_from_api(dec!(-131.5)).is_err());
    assert!(table_13_wcf(dec!(-140), DEFAULT_WCF13_DECIMALS, HalfUp).is_err());
}

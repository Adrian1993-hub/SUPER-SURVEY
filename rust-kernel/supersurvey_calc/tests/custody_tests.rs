//! Custody helpers QA — S&W deduction + pro-rata, validated against a real client
//! STS report (KUFRA, S&W 0.761 %).

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use supersurvey_calc::custody::*;
use supersurvey_calc::precision::SystemRoundingRule::HalfUp;

// ---- S&W (Sediment & Water) ---------------------------------------------

/// KUFRA anchor: Gross 725 379.63 bbl @ S&W 0.761 % → S&W 5 520.14, Net 719 859.49.
#[test]
fn sw_anchor_barrels() {
    let (sw, net) = apply_sw(dec!(725379.63), dec!(0.761), 2, HalfUp);
    assert_eq!(sw, dec!(5520.14));
    assert_eq!(net, dec!(719859.49));
}

/// KUFRA anchor in MT: Gross 109 292.949 @ 0.761 %. The sheet shows S&W 831.720 /
/// Net 108 461.229; the equation gives 831.719 / 108 461.230 — a 1-in-last-place
/// difference from the sheet's cross-unit rounding (the bbl figure matches
/// exactly above). Same documented table-variance policy as the ASTM tables.
#[test]
fn sw_anchor_metric_tons() {
    let (sw, net) = apply_sw(dec!(109292.949), dec!(0.761), 3, HalfUp);
    assert!((sw - dec!(831.720)).abs() <= dec!(0.001), "sw {sw}");
    assert!((net - dec!(108461.229)).abs() <= dec!(0.001), "net {net}");
    // and S&W + Net reconcile to gross exactly
    assert_eq!(sw + net, dec!(109292.949));
}

#[test]
fn sw_zero_is_identity() {
    let (sw, net) = apply_sw(dec!(1000), dec!(0), 3, HalfUp);
    assert_eq!(sw, dec!(0));
    assert_eq!(net, dec!(1000));
}

#[test]
fn sw_dto_rejects_out_of_range() {
    let bad = SwRequestDTO {
        gross_value: "1000".into(),
        sw_pct: "150".into(),
        decimals: 3,
        rounding_rule: "HALF_UP".into(),
        calculation_scope: "LIVE".into(),
    };
    assert!(!bad.calculate().success);
}

#[test]
fn sw_dto_with_trace() {
    let req = SwRequestDTO {
        gross_value: "109292.949".into(),
        sw_pct: "0.761".into(),
        decimals: 3,
        rounding_rule: "HALF_UP".into(),
        calculation_scope: "SAVE".into(),
    };
    let r = req.calculate();
    assert!(r.success, "errors: {:?}", r.errors);
    assert_eq!(r.sw.as_deref(), Some("831.719"));
    assert_eq!(r.net.as_deref(), Some("108461.23"));
    assert!(r.trace_json.is_some());
}

// ---- Pro-rata ------------------------------------------------------------

fn sum(v: &[Decimal]) -> Decimal {
    v.iter().copied().sum()
}

#[test]
fn pro_rata_clean_split() {
    let shares = apportion(dec!(1000), &[dec!(600), dec!(400)], 3, HalfUp).unwrap();
    assert_eq!(shares, vec![dec!(600.000), dec!(400.000)]);
}

/// The defining property: rounded shares sum EXACTLY back to the rounded total,
/// even when the proportional split doesn't divide evenly.
#[test]
fn pro_rata_residual_reconciles_to_total() {
    let total = dec!(100.00);
    let shares = apportion(total, &[dec!(1), dec!(1), dec!(1)], 2, HalfUp).unwrap();
    assert_eq!(sum(&shares), dec!(100.00), "shares must sum to total");
    // two at 33.33, one absorbs the +0.01 residual → 33.34
    assert!(shares.contains(&dec!(33.34)));
    assert_eq!(shares.iter().filter(|s| **s == dec!(33.33)).count(), 2);
}

#[test]
fn pro_rata_uneven_weights_sum_exact() {
    let total = dec!(724764.60);
    let shares = apportion(total, &[dec!(363374.95), dec!(363375.00)], 2, HalfUp).unwrap();
    assert_eq!(sum(&shares), dec!(724764.60));
}

#[test]
fn pro_rata_rejects_bad_input() {
    assert!(apportion(dec!(100), &[], 2, HalfUp).is_err());
    assert!(apportion(dec!(100), &[dec!(0), dec!(0)], 2, HalfUp).is_err());
}

#[test]
fn pro_rata_dto_shares_and_pct() {
    let req = ProRataRequestDTO {
        total_value: "1000".into(),
        parcels: vec![
            ProRataParcelDTO {
                label: "BL-1".into(),
                weight: "600".into(),
            },
            ProRataParcelDTO {
                label: "BL-2".into(),
                weight: "400".into(),
            },
        ],
        decimals: 3,
        rounding_rule: "HALF_UP".into(),
        calculation_scope: "LIVE".into(),
    };
    let r = req.calculate();
    assert!(r.success, "errors: {:?}", r.errors);
    let p = r.parcels.unwrap();
    assert_eq!(p[0].share, "600");
    assert_eq!(p[0].pct, "60");
    assert_eq!(p[1].share, "400");
}

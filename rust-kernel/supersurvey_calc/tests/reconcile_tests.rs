//! Terminal / ship-to-shore reconciliation QA.
//!
//! Real anchors from `docs/research/operaciones-sts-barge-offhire.md` §2.2 / §3
//! (Barge Tow Loading, caso real del cliente): the loaded figure by difference
//! (After − OBQ) and the reported "Loaded vs B/L variance −0.411 %". Geometry is
//! checked exactly against clean multiples of π.

use rust_decimal_macros::dec;
use supersurvey_calc::comparison::{RecommendedAction, ToleranceLayer};
use supersurvey_calc::reconcile::*;

fn layer(name: &str, limit: &str) -> ToleranceLayer {
    ToleranceLayer {
        name: name.into(),
        basis: "".into(),
        limit_pct: limit.parse().unwrap(),
    }
}

fn layers() -> Vec<ToleranceLayer> {
    vec![layer("ISO", "0.30"), layer("Contract", "0.50")]
}

// ---- geometry ----

#[test]
fn pipe_volume_exact_pi_multiples() {
    // V = (π/4)·D²·L. D=2,L=1 → π;  D=2,L=2 → 2π. Exact decimal arithmetic.
    assert_eq!(
        pipe_volume(dec!(2), dec!(1)),
        dec!(3.141592653589793238462643383)
    );
    assert_eq!(
        pipe_volume(dec!(2), dec!(2)),
        dec!(6.283185307179586476925286766)
    );
}

// ---- shore measurement by difference (real barge anchors) ----

#[test]
fn by_difference_barge_anchors() {
    // After 6917.32 bbl − OBQ 2409.74 = Loaded 4507.58 bbl.
    assert_eq!(by_difference(dec!(2409.74), dec!(6917.32)), dec!(4507.58));
    // In MT: 925.953 − 321.845 = 604.108.
    assert_eq!(by_difference(dec!(321.845), dec!(925.953)), dec!(604.108));
    // Order-independent (magnitude).
    assert_eq!(by_difference(dec!(6917.32), dec!(2409.74)), dec!(4507.58));
}

// ---- pipeline reconciliation (line adjustment sign convention) ----

#[test]
fn line_adjustment_sign_convention() {
    // Line packed (after > before) by 15.
    assert_eq!(
        line_adjustment(dec!(10), dec!(25), Operation::Load),
        dec!(-15) // LOAD: subtracted from shore-delivered.
    );
    assert_eq!(
        line_adjustment(dec!(10), dec!(25), Operation::Discharge),
        dec!(15) // DISCHARGE: added to shore-received.
    );
    // Lines full (or empty) both gauges → no adjustment.
    assert_eq!(
        line_adjustment(dec!(40), dec!(40), Operation::Load),
        dec!(0)
    );
}

#[test]
fn shore_quantity_applies_line() {
    assert_eq!(shore_quantity(dec!(4520.00), dec!(-12.42)), dec!(4507.58));
    assert_eq!(shore_quantity(dec!(1000), dec!(15)), dec!(1015));
}

// ---- reconciliation ----

#[test]
fn reconcile_reproduces_barge_minus_0_411_pct() {
    // figure 99.589 vs reference 100 → −0.411 % (the barge Loaded-vs-B/L figure).
    let r = reconcile(
        dec!(99.589),
        dec!(100),
        None,
        &layers(),
        supersurvey_calc::precision::SystemRoundingRule::HalfUp,
    )
    .unwrap();
    assert_eq!(r.variances[0].label, "Vessel vs Shore");
    assert_eq!(r.variances[0].delta_pct, dec!(-0.411));
    assert_eq!(r.worst_delta_pct, dec!(0.411));
    // 0.411 exceeds ISO 0.30 but is within Contract 0.50 → NOAD.
    assert_eq!(r.recommended_action, RecommendedAction::IssueNoad);
    assert!(r.exceeded);
}

#[test]
fn reconcile_action_thresholds() {
    let rr = supersurvey_calc::precision::SystemRoundingRule::HalfUp;
    // 0.20 % within every layer → None.
    let none = reconcile(dec!(100.20), dec!(100), None, &layers(), rr).unwrap();
    assert_eq!(none.recommended_action, RecommendedAction::None);
    assert!(!none.exceeded);
    // 0.60 % beyond the widest layer → LOP.
    let lop = reconcile(dec!(100.60), dec!(100), None, &layers(), rr).unwrap();
    assert_eq!(lop.recommended_action, RecommendedAction::IssueLop);
}

#[test]
fn reconcile_with_bl_produces_three_lines() {
    let rr = supersurvey_calc::precision::SystemRoundingRule::HalfUp;
    let r = reconcile(dec!(604.108), dec!(605.0), Some(dec!(606.0)), &layers(), rr).unwrap();
    let labels: Vec<&str> = r.variances.iter().map(|v| v.label.as_str()).collect();
    assert_eq!(labels, ["Vessel vs Shore", "Vessel vs B/L", "Shore vs B/L"]);
}

#[test]
fn reconcile_rejects_empty_layers_and_zero_reference() {
    let rr = supersurvey_calc::precision::SystemRoundingRule::HalfUp;
    assert!(reconcile(dec!(100), dec!(100), None, &[], rr).is_err());
    assert!(reconcile(dec!(100), dec!(0), None, &layers(), rr).is_err());
}

// ---- DTO boundary ----

use supersurvey_calc::comparison::ToleranceLayerDTO;

fn layer_dto(name: &str, limit: &str) -> ToleranceLayerDTO {
    ToleranceLayerDTO {
        name: name.into(),
        basis: "".into(),
        limit_pct: limit.into(),
    }
}

#[test]
fn dto_full_load_with_line_and_bl() {
    // Shore gauged 0 → 4520.00; line packed 0 → 12.42 (LOAD subtracts) →
    // shore quantity 4507.58, matching the vessel loaded figure exactly.
    let req = ReconciliationRequestDTO {
        operation: "LOAD".into(),
        unit: "BBL".into(),
        vessel_figure: "4507.58".into(),
        shore_opening: Some("0".into()),
        shore_closing: Some("4520.00".into()),
        shore_figure: None,
        line_before: Some("0".into()),
        line_after: Some("12.42".into()),
        line_adjustment: None,
        bl_figure: Some("4526.18".into()),
        layers: vec![layer_dto("ISO", "0.30"), layer_dto("Contract", "0.50")],
        decimals: 2,
        rounding_rule: "HALF_UP".into(),
        calculation_scope: "LIVE".into(),
    };
    let r = req.calculate();
    assert!(r.success, "errors: {:?}", r.errors);
    assert_eq!(r.shore_movement.as_deref(), Some("4520"));
    assert_eq!(r.line_adjustment.as_deref(), Some("-12.42"));
    assert_eq!(r.shore_quantity.as_deref(), Some("4507.58"));
    let v = r.variances.unwrap();
    assert_eq!(v.len(), 3);
    // Vessel vs Shore is exact (0.0 %); Vessel vs B/L ≈ −0.411 %.
    assert_eq!(v[0].delta_pct, "0");
    assert_eq!(v[1].delta_pct, "-0.4109");
    // worst 0.4109 → exceeds ISO 0.30, within Contract 0.50 → NOAD.
    assert_eq!(r.recommended_action.as_deref(), Some("ISSUE_NOAD"));
}

#[test]
fn dto_direct_shore_figure_no_bl() {
    let req = ReconciliationRequestDTO {
        operation: "DISCHARGE".into(),
        unit: "MT".into(),
        vessel_figure: "100.20".into(),
        shore_opening: None,
        shore_closing: None,
        shore_figure: Some("100.00".into()),
        line_before: None,
        line_after: None,
        line_adjustment: None,
        bl_figure: None,
        layers: vec![layer_dto("ISO", "0.30"), layer_dto("Contract", "0.50")],
        decimals: 3,
        rounding_rule: "HALF_UP".into(),
        calculation_scope: "LIVE".into(),
    };
    let r = req.calculate();
    assert!(r.success, "errors: {:?}", r.errors);
    assert_eq!(r.shore_movement, None); // not gauged by difference
    assert_eq!(r.shore_quantity.as_deref(), Some("100"));
    assert_eq!(r.recommended_action.as_deref(), Some("NONE")); // 0.20 % within all
}

#[test]
fn dto_rejects_bad_operation_and_missing_shore() {
    let base = |op: &str, shore: Option<&str>| ReconciliationRequestDTO {
        operation: op.into(),
        unit: "MT".into(),
        vessel_figure: "100".into(),
        shore_opening: None,
        shore_closing: None,
        shore_figure: shore.map(|s| s.into()),
        line_before: None,
        line_after: None,
        line_adjustment: None,
        bl_figure: None,
        layers: vec![layer_dto("ISO", "0.30")],
        decimals: 3,
        rounding_rule: "HALF_UP".into(),
        calculation_scope: "LIVE".into(),
    };
    assert!(!base("XYZ", Some("100")).calculate().success); // bad operation
    assert!(!base("LOAD", None).calculate().success); // no shore input
}

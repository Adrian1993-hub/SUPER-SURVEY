//! Tests for the layered-tolerance comparison engine.
//!
//! Figures mirror the SuperSurvey UI demo (Vessel Received vs Barge Delivered vs
//! BDN) so the Rust engine and the front-end agree: vessel = 994.518 MT (air),
//! barge = vessel × 1.00139, bdn = vessel × 1.00531.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use supersurvey_calc::prelude::*;

fn mt(value: Decimal) -> WeightValue {
    WeightValue::new(value, WeightUnit::MetricTons)
}

fn source(name: &str, value: WeightValue) -> ComparisonSource {
    ComparisonSource {
        name: name.to_string(),
        quantity: value,
    }
}

fn layer(name: &str, basis: &str, limit: Decimal) -> ToleranceLayer {
    ToleranceLayer {
        name: name.to_string(),
        basis: basis.to_string(),
        limit_pct: limit,
    }
}

fn demo_sources() -> Vec<ComparisonSource> {
    let vessel = dec!(994.518);
    let barge = vessel * dec!(1.00139);
    let bdn = vessel * dec!(1.00531);
    vec![
        source("VESSEL_RECEIVED", mt(vessel)),
        source("BARGE_DELIVERED", mt(barge)),
        source("BDN", mt(bdn)),
    ]
}

fn find_pair<'a>(result: &'a ComparisonResult, a: &str, b: &str) -> &'a PairComparison {
    result
        .pairs
        .iter()
        .find(|p| p.source_a == a && p.source_b == b)
        .expect("pair present")
}

fn run(layers: Vec<ToleranceLayer>) -> ComparisonResult {
    compare_sources(
        demo_sources(),
        layers,
        None,
        PrecisionConfiguration::default(),
        CalculationScope::Save,
    )
    .expect("comparison runs")
}

#[test]
fn pairwise_math_and_within_flags_match_ui() {
    let result = run(vec![layer("ISO", "ISO 91", dec!(0.30))]);
    assert_eq!(result.pairs.len(), 3);

    // Vessel received is below barge delivered (a shortage) -> negative delta.
    let v_b = find_pair(&result, "VESSEL_RECEIVED", "BARGE_DELIVERED");
    assert!(v_b.delta.value < dec!(0));
    assert!(v_b.delta_pct < dec!(0));
    assert!(
        v_b.within_all,
        "vessel vs barge ~0.139% is within ISO 0.30%"
    );

    // Vessel vs BDN ~0.528% breaches ISO 0.30%.
    let v_bdn = find_pair(&result, "VESSEL_RECEIVED", "BDN");
    assert!(
        !v_bdn.within_all,
        "vessel vs BDN ~0.528% breaches ISO 0.30%"
    );
    assert!(!v_bdn.layers[0].within);

    // Worst |Δ%| is the vessel-vs-BDN pair, ≈ 0.5282%.
    assert!((result.worst_delta_pct - dec!(0.5282)).abs() <= dec!(0.0001));
}

#[test]
fn within_all_layers_recommends_no_action() {
    let result = run(vec![layer("Contrato", "Contrato comprador", dec!(1.00))]);
    assert!(!result.exceeded);
    assert_eq!(result.recommended_action, RecommendedAction::None);
    assert!(result.pairs.iter().all(|p| p.within_all));
}

#[test]
fn breach_between_tightest_and_widest_recommends_noad() {
    // worst ≈ 0.528% : above ISO 0.30, below Contrato 0.60 -> NOAD
    let result = run(vec![
        layer("ISO", "ISO 91", dec!(0.30)),
        layer("Contrato", "Contrato comprador", dec!(0.60)),
    ]);
    assert!(result.exceeded);
    assert_eq!(result.recommended_action, RecommendedAction::IssueNoad);
}

#[test]
fn breach_beyond_widest_layer_recommends_lop() {
    // worst ≈ 0.528% : above the widest (0.50) -> LOP
    let result = run(vec![
        layer("ISO", "ISO 91", dec!(0.30)),
        layer("Contrato", "Contrato comprador", dec!(0.50)),
    ]);
    assert!(result.exceeded);
    assert_eq!(result.recommended_action, RecommendedAction::IssueLop);
}

#[test]
fn normalizes_mixed_units_before_comparing() {
    // Barge reported in kilograms; engine normalizes to MT and matches.
    let vessel = dec!(994.518);
    let barge_mt = vessel * dec!(1.00139);
    let sources = vec![
        source("VESSEL_RECEIVED", mt(vessel)),
        source(
            "BARGE_DELIVERED",
            WeightValue::new(barge_mt * dec!(1000), WeightUnit::Kilograms),
        ),
    ];
    let result = compare_sources(
        sources,
        vec![layer("ISO", "ISO 91", dec!(0.30))],
        Some(WeightUnit::MetricTons),
        PrecisionConfiguration::default(),
        CalculationScope::Save,
    )
    .unwrap();

    let pair = &result.pairs[0];
    assert_eq!(pair.unit_check(), WeightUnit::MetricTons);
    assert_eq!(pair.value_b.value, barge_mt.round_dp(3));
    assert!(pair.within_all);
}

#[test]
fn requires_two_sources_and_a_layer() {
    let one = compare_sources(
        vec![source("ONLY", mt(dec!(100)))],
        vec![layer("ISO", "ISO 91", dec!(0.30))],
        None,
        PrecisionConfiguration::default(),
        CalculationScope::Live,
    );
    assert_eq!(
        one.unwrap_err().code,
        KernelErrorCode::ComparisonInputInvalid
    );

    let no_layers = compare_sources(
        demo_sources(),
        vec![],
        None,
        PrecisionConfiguration::default(),
        CalculationScope::Live,
    );
    assert_eq!(
        no_layers.unwrap_err().code,
        KernelErrorCode::ComparisonInputInvalid
    );
}

#[test]
fn zero_base_source_is_rejected() {
    let sources = vec![
        source("VESSEL_RECEIVED", mt(dec!(100))),
        source("BDN", mt(dec!(0))),
    ];
    let result = compare_sources(
        sources,
        vec![layer("ISO", "ISO 91", dec!(0.30))],
        None,
        PrecisionConfiguration::default(),
        CalculationScope::Live,
    );
    assert_eq!(result.unwrap_err().code, KernelErrorCode::DivisionByZero);
}

#[test]
fn save_scope_returns_trace_live_does_not() {
    let saved = run(vec![layer("ISO", "ISO 91", dec!(0.30))]);
    assert!(saved.trace.is_some());

    let live = compare_sources(
        demo_sources(),
        vec![layer("ISO", "ISO 91", dec!(0.30))],
        None,
        PrecisionConfiguration::default(),
        CalculationScope::Live,
    )
    .unwrap();
    assert!(live.trace.is_none());
}

// Small extension trait to keep the unit assertion readable.
trait PairUnit {
    fn unit_check(&self) -> WeightUnit;
}
impl PairUnit for PairComparison {
    fn unit_check(&self) -> WeightUnit {
        self.value_a.unit
    }
}

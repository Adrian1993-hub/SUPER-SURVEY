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

// ---- DTO (string-in / string-out) boundary ----

fn dto_source(name: &str, value: &str) -> ComparisonSourceDTO {
    ComparisonSourceDTO {
        name: name.into(),
        quantity_value: value.into(),
        quantity_unit: "MT".into(),
    }
}

fn dto_layer(name: &str, limit: &str) -> ToleranceLayerDTO {
    ToleranceLayerDTO {
        name: name.into(),
        basis: String::new(),
        limit_pct: limit.into(),
    }
}

#[test]
fn dto_recommends_lop_when_worst_exceeds_widest_layer() {
    // UI demo numbers: vessel 994.518, barge ×1.00139, bdn ×1.00531.
    let req = ComparisonRequestDTO {
        calculation_scope: "TRACE_VIEW".into(),
        sources: vec![
            dto_source("VESSEL_RECEIVED", "994.518"),
            dto_source("BARGE_DELIVERED", "995.900"),
            dto_source("BDN", "999.799"),
        ],
        layers: vec![dto_layer("ISO", "0.30"), dto_layer("CONTRATO", "0.50")],
        target_unit: Some("MT".into()),
        rounding_rule: "HALF_UP".into(),
        weight_decimals: 3,
    };
    let resp = req.compare();
    assert!(resp.success, "errors: {:?}", resp.errors);
    assert_eq!(resp.recommended_action.as_deref(), Some("ISSUE_LOP"));
    assert_eq!(resp.exceeded, Some(true));
    let pairs = resp.pairs.expect("pairs");
    assert_eq!(pairs.len(), 3);
    let worst: f64 = resp.worst_delta_pct.unwrap().parse().unwrap();
    assert!((0.50..0.60).contains(&worst), "worst={worst}");
    assert!(resp.trace_json.is_some(), "TRACE_VIEW → trace present");
}

#[test]
fn dto_recommends_none_within_all_layers() {
    let req = ComparisonRequestDTO {
        calculation_scope: "LIVE".into(),
        sources: vec![dto_source("A", "1000.000"), dto_source("B", "1000.500")],
        layers: vec![dto_layer("ISO", "0.30"), dto_layer("CONTRATO", "0.50")],
        target_unit: None,
        rounding_rule: "HALF_UP".into(),
        weight_decimals: 3,
    };
    let resp = req.compare();
    assert!(resp.success, "errors: {:?}", resp.errors);
    // 0.5 / 1000.5 ≈ 0.05 % < 0.30 % (tightest) → within all → NONE.
    assert_eq!(resp.recommended_action.as_deref(), Some("NONE"));
    assert_eq!(resp.exceeded, Some(false));
    assert!(resp.trace_json.is_none(), "LIVE → no trace");
}

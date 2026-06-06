use pretty_assertions::assert_eq;
use rust_decimal::Decimal;
use std::str::FromStr;
use supersurvey_calc::prelude::*;

fn d(value: &str) -> Decimal {
    Decimal::from_str(value).unwrap()
}

fn snapshot(gov: &str, gsv: &str, mt_air: &str) -> QuantitySnapshot {
    QuantitySnapshot {
        gov: VolumeValue::new(d(gov), VolumeUnit::CubicMeters),
        gsv: VolumeValue::new(d(gsv), VolumeUnit::CubicMeters),
        weight_air: WeightValue::new(d(mt_air), WeightUnit::MetricTons),
    }
}

fn tank(
    id: &str,
    name: &str,
    opening: QuantitySnapshot,
    closing: QuantitySnapshot,
) -> TankPairedInput {
    TankPairedInput {
        tank_id: id.to_string(),
        tank_name: name.to_string(),
        product_id: Some("product-vlsfo".to_string()),
        opening,
        closing,
    }
}

#[test]
fn receiving_role_uses_closing_minus_opening() {
    let precision = PrecisionConfiguration::default();
    let t = tank(
        "tank-1p",
        "1P",
        snapshot("100.000", "99.000", "84.150"),
        snapshot("120.000", "118.800", "100.980"),
    );
    let result = calculate_tank_movement(t, MovementRole::Receiving, precision).unwrap();
    assert_eq!(result.gov_movement.value, d("20.000"));
    assert_eq!(result.gsv_movement.value, d("19.800"));
    assert_eq!(result.weight_air_movement.value, d("16.830"));
    assert!(result.warnings.is_empty());
}

#[test]
fn delivery_role_uses_opening_minus_closing() {
    let precision = PrecisionConfiguration::default();
    let t = tank(
        "barge-1",
        "B1",
        snapshot("500.000", "495.000", "420.750"),
        snapshot("350.000", "346.500", "294.525"),
    );
    let result = calculate_tank_movement(t, MovementRole::Delivery, precision).unwrap();
    assert_eq!(result.gov_movement.value, d("150.000"));
    assert_eq!(result.gsv_movement.value, d("148.500"));
    assert_eq!(result.weight_air_movement.value, d("126.225"));
    assert!(result.warnings.is_empty());
}

#[test]
fn negative_receiving_movement_returns_warning_not_error() {
    let precision = PrecisionConfiguration::default();
    let t = tank(
        "tank-1s",
        "1S",
        snapshot("100.000", "99.000", "84.150"),
        snapshot("90.000", "89.100", "75.735"),
    );
    let result = calculate_tank_movement(t, MovementRole::Receiving, precision).unwrap();
    assert_eq!(result.gov_movement.value, d("-10.000"));
    assert_eq!(result.warnings.len(), 1);
    assert_eq!(result.warnings[0].code, "NEGATIVE_MOVEMENT");
}

#[test]
fn movement_set_sums_multiple_tanks_and_returns_no_trace_for_live() {
    let precision = PrecisionConfiguration::default();
    let tanks = vec![
        tank(
            "1p",
            "1P",
            snapshot("100.000", "99.000", "84.150"),
            snapshot("120.000", "118.800", "100.980"),
        ),
        tank(
            "1s",
            "1S",
            snapshot("50.000", "49.500", "42.075"),
            snapshot("60.000", "59.400", "50.490"),
        ),
    ];
    let result = calculate_movement_set(
        MovementRole::Receiving,
        tanks,
        precision,
        CalculationScope::Live,
    )
    .unwrap();
    assert_eq!(result.total_gov_movement.value, d("30.000"));
    assert_eq!(result.total_gsv_movement.value, d("29.700"));
    assert_eq!(result.total_weight_air_movement.value, d("25.245"));
    assert!(result.trace.is_none());
}

#[test]
fn movement_set_returns_trace_for_save() {
    let precision = PrecisionConfiguration::default();
    let tanks = vec![tank(
        "1p",
        "1P",
        snapshot("100.000", "99.000", "84.150"),
        snapshot("120.000", "118.800", "100.980"),
    )];
    let result = calculate_movement_set(
        MovementRole::BqsVesselReceiving,
        tanks,
        precision,
        CalculationScope::Save,
    )
    .unwrap();
    assert!(result.trace.is_some());
}

#[test]
fn empty_movement_set_fails() {
    let precision = PrecisionConfiguration::default();
    let err = calculate_movement_set(
        MovementRole::Receiving,
        vec![],
        precision,
        CalculationScope::Live,
    )
    .unwrap_err();
    assert_eq!(err.code, KernelErrorCode::MissingStagePair);
}

#[test]
fn movement_role_parser_accepts_bqs_aliases() {
    assert_eq!(
        MovementRole::from_str("BQS_VESSEL").unwrap(),
        MovementRole::BqsVesselReceiving
    );
    assert_eq!(
        MovementRole::from_str("BQS_BARGE").unwrap(),
        MovementRole::BqsBargeDelivery
    );
}

#[test]
fn aggregation_policy_changes_total_last_decimal() {
    let reported_precision = PrecisionConfiguration::default();
    let exact_precision = PrecisionConfiguration {
        aggregate_from_unrounded: true,
        ..PrecisionConfiguration::default()
    };
    let tanks = || {
        vec![
            tank(
                "1p",
                "1P",
                snapshot("0.000", "0.000", "0.000"),
                snapshot("1.2344", "1.2344", "1.2344"),
            ),
            tank(
                "1s",
                "1S",
                snapshot("0.000", "0.000", "0.000"),
                snapshot("1.2344", "1.2344", "1.2344"),
            ),
        ]
    };

    let reported = calculate_movement_set(
        MovementRole::Receiving,
        tanks(),
        reported_precision,
        CalculationScope::Save,
    )
    .unwrap();
    let exact = calculate_movement_set(
        MovementRole::Receiving,
        tanks(),
        exact_precision,
        CalculationScope::Save,
    )
    .unwrap();

    assert_eq!(reported.total_gsv_movement.value, d("2.468"));
    assert_eq!(exact.total_gsv_movement.value, d("2.469"));
}

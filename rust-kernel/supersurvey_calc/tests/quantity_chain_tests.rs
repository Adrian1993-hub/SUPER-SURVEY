//! `quantity_chain` — the generic TOV → GOV → GSV → weight chain reachable from
//! the IPC boundary (`dto.rs` → `calculate_basic_quantity_chain`). It shipped with
//! ZERO coverage even though it is where the project's blocked decision lives:
//! "no intermediate rounding — round only the final figure" (ULTRAPLAN §2).
//! These tests pin that policy, the free-water unit normalization, the input
//! guards, and the trace contract.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use supersurvey_calc::prelude::*;

fn precision(intermediate_rounding: bool) -> PrecisionConfiguration {
    PrecisionConfiguration {
        intermediate_rounding,
        observed_volume_decimals: 3,
        standard_volume_decimals: 3,
        weight_decimals: 3,
        rounding_rule: SystemRoundingRule::HalfUp,
        aggregate_from_unrounded: false,
    }
}

fn m3(v: Decimal) -> VolumeValue {
    UnitValue::new(v, VolumeUnit::CubicMeters)
}

fn chain(tov: Decimal, fw: VolumeValue, vcf: Decimal, wcf: Decimal) -> QuantityChainInputs {
    QuantityChainInputs {
        tov: m3(tov),
        free_water: fw,
        vcf,
        wcf,
    }
}

/// THE DOCTRINE. Rounding only at the end must not equal rounding at every step,
/// on figures where the difference bites: TOV 100.0005 reports as 100.001 at 3 dp,
/// and that rounded value is what propagates when intermediates are rounded.
#[test]
fn no_intermediate_rounding_carries_the_unrounded_value_forward() {
    let inputs = || chain(dec!(100.0005), m3(dec!(0)), dec!(0.9), dec!(1.0));

    let exact =
        calculate_basic_quantity_chain(inputs(), precision(false), CalculationScope::Live).unwrap();
    let stepped =
        calculate_basic_quantity_chain(inputs(), precision(true), CalculationScope::Live).unwrap();

    // Both REPORT the same rounded GOV…
    assert_eq!(exact.gov.value, dec!(100.001));
    assert_eq!(stepped.gov.value, dec!(100.001));

    // …but the chain diverges: exact carries 100.0005 (→ 90.00045), stepped
    // carries the rounded 100.001 (→ 90.0009).
    assert_eq!(exact.gsv.value, dec!(90.000));
    assert_eq!(stepped.gsv.value, dec!(90.001));
    assert_eq!(exact.weight_air.value, dec!(90.000));
    assert_eq!(stepped.weight_air.value, dec!(90.001));
    assert_ne!(
        exact.weight_air.value, stepped.weight_air.value,
        "the no-intermediate-rounding policy must actually change the final figure"
    );
}

/// Free water given in a different unit must be normalized to the TOV unit
/// before subtracting — 500 L against 10 m³ is 0.5 m³, not 500.
#[test]
fn free_water_is_normalized_to_the_tov_unit() {
    let r = calculate_basic_quantity_chain(
        chain(
            dec!(10),
            UnitValue::new(dec!(500), VolumeUnit::Litres),
            dec!(1),
            dec!(1),
        ),
        precision(false),
        CalculationScope::Live,
    )
    .unwrap();
    assert_eq!(r.gov.value, dec!(9.5));
    assert_eq!(r.gov.unit, VolumeUnit::CubicMeters);
}

/// Free water above TOV would yield a negative GOV — reject, naming the field.
#[test]
fn rejects_free_water_exceeding_tov() {
    let err = calculate_basic_quantity_chain(
        chain(dec!(5), m3(dec!(6)), dec!(1), dec!(1)),
        precision(false),
        CalculationScope::Live,
    )
    .unwrap_err();
    assert_eq!(err.code, KernelErrorCode::NegativeQuantityNotAllowed);
    assert_eq!(err.field.as_deref(), Some("free_water_value"));
}

#[test]
fn rejects_negative_inputs() {
    for inputs in [
        chain(dec!(-1), m3(dec!(0)), dec!(1), dec!(1)),
        chain(dec!(10), m3(dec!(-1)), dec!(1), dec!(1)),
        chain(dec!(10), m3(dec!(0)), dec!(-0.1), dec!(1)),
        chain(dec!(10), m3(dec!(0)), dec!(1), dec!(-0.1)),
    ] {
        let err = calculate_basic_quantity_chain(inputs, precision(false), CalculationScope::Live)
            .unwrap_err();
        assert_eq!(err.code, KernelErrorCode::NegativeQuantityNotAllowed);
    }
}

/// LIVE is the fast path (no trace); anything persisted/exported must carry the
/// full 4-step trace, because the schema CHECK rejects a non-LIVE log without one.
#[test]
fn trace_is_omitted_for_live_and_complete_for_save() {
    let mk = |scope| {
        calculate_basic_quantity_chain(
            chain(dec!(10), m3(dec!(0)), dec!(1), dec!(1)),
            precision(false),
            scope,
        )
        .unwrap()
    };
    assert!(
        mk(CalculationScope::Live).trace.is_none(),
        "LIVE must not carry a trace"
    );
    let trace = mk(CalculationScope::Save)
        .trace
        .expect("SAVE must carry a full trace");
    assert_eq!(trace.steps.len(), 4, "FW normalize + GOV + GSV + weight");
}

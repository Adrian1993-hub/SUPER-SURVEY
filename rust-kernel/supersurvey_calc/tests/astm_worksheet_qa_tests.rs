//! QA anchor tests for ASTM Table 54B (VCF) and Table 56 (WCF).
//!
//! Vectors come from a real, field-signed BQS worksheet (VLSFO bunker survey;
//! vessel/job identifiers anonymized — numbers only). The worksheet displays
//! VCF/WCF at 4 dp and volumes/weights at 3 dp, and multiplies from the ROUNDED
//! intermediate (GSV) — so these tests run the chain with
//! `intermediate_rounding = true` to reproduce it. SuperSurvey's default policy
//! remains no-intermediate-rounding (Decision Log); both are exercised.
//!
//! Published-table variance: equation results can differ from the printed 1980
//! tables by 1 unit in the 4th decimal. Two worksheet entries show that
//! variance; they are asserted within ±0.0001 with the exact equation value
//! pinned alongside.

use pretty_assertions::assert_eq;
use rust_decimal_macros::dec;
use supersurvey_calc::prelude::*;

fn kg_l(value: rust_decimal::Decimal) -> DensityValue {
    DensityValue::new(value, DensityUnit::KgPerLitre)
}

fn celsius(value: rust_decimal::Decimal) -> TemperatureValue {
    TemperatureValue::new(value, TemperatureUnit::Celsius)
}

fn vcf_54b(density: rust_decimal::Decimal, temp: rust_decimal::Decimal) -> rust_decimal::Decimal {
    table_54b_vcf(
        &kg_l(density),
        &celsius(temp),
        DEFAULT_VCF_DECIMALS,
        SystemRoundingRule::HalfUp,
    )
    .expect("54B in range")
    .vcf
}

fn wcf_56(density: rust_decimal::Decimal) -> rust_decimal::Decimal {
    table_56_wcf(
        &kg_l(density),
        DEFAULT_WCF_DECIMALS,
        SystemRoundingRule::HalfUp,
    )
    .expect("56 in range")
    .wcf
}

// ---------- Table 54B vs worksheet ----------

#[test]
fn table_54b_matches_worksheet_fuel_oil_rows_exactly() {
    // Before-receiving section, density 0.9534 kg/L (VLSFO):
    assert_eq!(vcf_54b(dec!(0.9534), dec!(35.0)), dec!(0.9856)); // bunker tanks @ 35 C
    assert_eq!(vcf_54b(dec!(0.9534), dec!(30.0)), dec!(0.9892)); // aft tank @ 30 C
    assert_eq!(vcf_54b(dec!(0.9534), dec!(92.0)), dec!(0.9441)); // service tank @ 92 C
}

#[test]
fn table_54b_within_one_fourth_decimal_of_printed_table_entries() {
    // Worksheet (printed-table lineage) shows 0.9471 @ 88 C / 0.9534 and
    // 0.9892 @ 30.1 C / 0.9476; the pure equation yields 0.9470 / 0.9891.
    let settling = vcf_54b(dec!(0.9534), dec!(88.0));
    assert_eq!(settling, dec!(0.9470));
    assert!((settling - dec!(0.9471)).abs() <= dec!(0.0001));

    let after_fwd = vcf_54b(dec!(0.9476), dec!(30.1));
    assert_eq!(after_fwd, dec!(0.9891));
    assert!((after_fwd - dec!(0.9892)).abs() <= dec!(0.0001));
}

#[test]
fn table_54b_selects_fuel_oil_group_for_vlsfo() {
    let computation = table_54b_vcf(
        &kg_l(dec!(0.9534)),
        &celsius(dec!(35.0)),
        DEFAULT_VCF_DECIMALS,
        SystemRoundingRule::HalfUp,
    )
    .unwrap();
    assert_eq!(
        computation.product_group,
        Some(Table54bProductGroup::FuelOils)
    );
    assert_eq!(computation.density15_kg_m3, dec!(953.4));
    assert_eq!(computation.delta_t, dec!(20.0));
}

#[test]
fn table_54b_rejects_out_of_range_inputs() {
    let low_density = table_54b_vcf(
        &kg_l(dec!(0.500)),
        &celsius(dec!(20)),
        DEFAULT_VCF_DECIMALS,
        SystemRoundingRule::HalfUp,
    );
    assert_eq!(
        low_density.unwrap_err().code,
        KernelErrorCode::OutOfTableRange
    );

    let hot = table_54b_vcf(
        &kg_l(dec!(0.9534)),
        &celsius(dec!(200)),
        DEFAULT_VCF_DECIMALS,
        SystemRoundingRule::HalfUp,
    );
    assert_eq!(hot.unwrap_err().code, KernelErrorCode::OutOfTableRange);

    let api_gravity = table_54b_vcf(
        &DensityValue::new(dec!(35), DensityUnit::ApiGravity),
        &celsius(dec!(20)),
        DEFAULT_VCF_DECIMALS,
        SystemRoundingRule::HalfUp,
    );
    assert_eq!(
        api_gravity.unwrap_err().code,
        KernelErrorCode::UnsupportedConversion
    );
}

// ---------- Table 56 vs worksheet ----------

#[test]
fn table_56_matches_worksheet_wcf_values_exactly() {
    assert_eq!(wcf_56(dec!(0.9534)), dec!(0.9523)); // ship figures, before
    assert_eq!(wcf_56(dec!(0.9476)), dec!(0.9465)); // ship figures, after
    assert_eq!(wcf_56(dec!(0.9477)), dec!(0.9466));
    assert_eq!(wcf_56(dec!(0.9475)), dec!(0.9464)); // supplier density
}

#[test]
fn table_56_rejects_lpg_range_density() {
    let lpg = table_56_wcf(
        &kg_l(dec!(0.5500)),
        DEFAULT_WCF_DECIMALS,
        SystemRoundingRule::HalfUp,
    );
    assert_eq!(lpg.unwrap_err().code, KernelErrorCode::OutOfTableRange);
}

// ---------- Full chain vs worksheet rows (factors computed, not given) ----------

fn worksheet_precision() -> PrecisionConfiguration {
    PrecisionConfiguration {
        // The field worksheet multiplies from the rounded GSV cell.
        intermediate_rounding: true,
        ..PrecisionConfiguration::default()
    }
}

fn run_chain(
    tov: rust_decimal::Decimal,
    density: rust_decimal::Decimal,
    temp: rust_decimal::Decimal,
) -> QuantityChainResult {
    let vcf = vcf_54b(density, temp);
    let wcf = wcf_56(density);
    calculate_basic_quantity_chain(
        QuantityChainInputs {
            tov: VolumeValue::new(tov, VolumeUnit::CubicMeters),
            free_water: VolumeValue::new(dec!(0), VolumeUnit::CubicMeters),
            vcf,
            wcf,
        },
        worksheet_precision(),
        CalculationScope::QaTest,
    )
    .expect("chain computes")
}

#[test]
fn chain_reproduces_worksheet_aft_bunker_tank_row() {
    // TOV 222.680 m3 @ 35.0 C, rho15 0.9534: GSV 219.473, MT(air) 209.004.
    let result = run_chain(dec!(222.680), dec!(0.9534), dec!(35.0));
    assert_eq!(result.gsv.value, dec!(219.473));
    assert_eq!(result.weight_air.value, dec!(209.004));
}

#[test]
fn chain_reproduces_worksheet_service_tank_row() {
    // TOV 60.680 m3 @ 92.0 C, rho15 0.9534: GSV 57.288, MT(air) 54.555.
    let result = run_chain(dec!(60.680), dec!(0.9534), dec!(92.0));
    assert_eq!(result.gsv.value, dec!(57.288));
    assert_eq!(result.weight_air.value, dec!(54.555));
}

#[test]
fn chain_reproduces_worksheet_small_tank_row() {
    // TOV 3.900 m3 @ 35.0 C, rho15 0.9534: GSV 3.844, MT(air) 3.661.
    let result = run_chain(dec!(3.900), dec!(0.9534), dec!(35.0));
    assert_eq!(result.gsv.value, dec!(3.844));
    assert_eq!(result.weight_air.value, dec!(3.661));
}

#[test]
fn quantity_transferred_block_matches_worksheet() {
    // GSV transferred 1050.843 m3 with supplier density 0.9475 kg/L:
    //   MT (vacuum) = GSV x rho15        = 995.674
    //   WCF (T-56)  = 0.9475 - 0.0011    = 0.9464
    //   MT (air)    = GSV x WCF          = 994.518
    let gsv = dec!(1050.843);
    let rho = dec!(0.9475);
    let wcf = wcf_56(rho);
    assert_eq!(wcf, dec!(0.9464));

    let mt_vacuum = round_decimal(gsv * rho, 3, SystemRoundingRule::HalfUp);
    assert_eq!(mt_vacuum, dec!(995.674));

    let mt_air = round_decimal(gsv * wcf, 3, SystemRoundingRule::HalfUp);
    assert_eq!(mt_air, dec!(994.518));
}

#[test]
fn before_receiving_totals_match_worksheet_sum_of_rounded_rows() {
    // The worksheet totals MT by summing the rounded per-tank quantities
    // (aggregate_from_unrounded = false). Eight tanks, rho15 0.9534:
    let rows: [(rust_decimal::Decimal, rust_decimal::Decimal); 8] = [
        (dec!(3.900), dec!(35.0)),   // fwd P
        (dec!(3.300), dec!(35.0)),   // fwd S
        (dec!(5.570), dec!(30.0)),   // aft P
        (dec!(222.680), dec!(35.0)), // aft S
        (dec!(4.250), dec!(35.0)),   // wing
        (dec!(7.640), dec!(35.0)),   // overflow
        (dec!(52.280), dec!(88.0)),  // settling
        (dec!(60.680), dec!(92.0)),  // service
    ];
    let mut total_mt = dec!(0);
    for (tov, temp) in rows {
        total_mt += run_chain(tov, dec!(0.9534), temp).weight_air.value;
    }
    // Worksheet total: 333.876 MT. The two printed-table VCF entries that
    // differ by 1e-4 (88 C row) shift the settling tank by ~0.005 MT.
    assert!(
        (total_mt - dec!(333.876)).abs() <= dec!(0.010),
        "{total_mt}"
    );
}

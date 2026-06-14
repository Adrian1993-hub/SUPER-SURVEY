//! Draft survey QA — anchored to the validated .NET prototype worksheet (vessel
//! anonymized) and cross-checked against the MV YUNNAN report. Hydrostatics are
//! displayed rounded to 3 dp, so net/cargo validate to ~0.5 MT.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use supersurvey_calc::draft::*;

fn close(a: Decimal, b: Decimal, tol: Decimal, label: &str) {
    assert!((a - b).abs() <= tol, "{label}: {a} vs {b} (tol {tol})");
}

fn initial() -> DraftCondition {
    DraftCondition {
        forward_corrected: dec!(4.466),
        aft_corrected: dec!(6.804),
        midship_corrected: dec!(5.553),
        lbp: dec!(175.0),
        sea_water_density: dec!(1.0165),
        hydrostatics: Hydrostatics {
            displacement_at_quarter_mean: dec!(23771.25),
            tpc: dec!(46.2),
            lcf: dec!(-5.448),
            mtc_per_metre: dec!(28.5),
        },
        total_deductibles: dec!(6662.941),
    }
}

fn final_() -> DraftCondition {
    DraftCondition {
        forward_corrected: dec!(4.081),
        aft_corrected: dec!(6.513),
        midship_corrected: dec!(5.217),
        lbp: dec!(175.0),
        sea_water_density: dec!(1.018),
        hydrostatics: Hydrostatics {
            displacement_at_quarter_mean: dec!(22219.995),
            tpc: dec!(45.9),
            lcf: dec!(-5.85775),
            mtc_per_metre: dec!(28.0),
        },
        total_deductibles: dec!(7532.030),
    }
}

#[test]
fn quarter_mean_and_trim() {
    let r = calculate_condition(&initial()).unwrap();
    close(r.quarter_mean, dec!(5.5735), dec!(0.0001), "quarter mean");
    close(r.trim, dec!(2.338), dec!(0.001), "trim");
}

#[test]
fn trim_and_density_corrections() {
    let r = calculate_condition(&initial()).unwrap();
    close(r.second_trim_correction, dec!(44.511), dec!(0.1), "tc2");
    close(
        r.density_correction,
        dec!(-194.708),
        dec!(1),
        "density corr",
    );
}

#[test]
fn net_displacements() {
    let i = calculate_condition(&initial()).unwrap();
    let f = calculate_condition(&final_()).unwrap();
    close(
        i.net_displacement,
        dec!(16621.844),
        dec!(0.5),
        "net initial",
    );
    close(f.net_displacement, dec!(14212.111), dec!(0.5), "net final");
}

#[test]
fn cargo_discharged_by_difference() {
    let i = calculate_condition(&initial()).unwrap();
    let f = calculate_condition(&final_()).unwrap();
    let cargo = cargo_by_difference(i.net_displacement, f.net_displacement);
    close(cargo, dec!(2409.733), dec!(0.5), "cargo");
}

/// MV YUNNAN: cargo = net_initial − net_final (pure difference, no hydrostatics).
#[test]
fn yunnan_cargo_by_difference() {
    let cargo = cargo_by_difference(dec!(33862.480), dec!(29781.693));
    assert_eq!(cargo, dec!(4080.787)); // report: Cargo Discharged 4,080.787 MT
}

#[test]
fn dto_two_conditions_and_cargo() {
    let cond = |f: &str,
                a: &str,
                m: &str,
                rho: &str,
                disp: &str,
                tpc: &str,
                lcf: &str,
                mtc: &str,
                ded: &str| DraftConditionDTO {
        forward_corrected: f.into(),
        aft_corrected: a.into(),
        midship_corrected: m.into(),
        lbp: "175.0".into(),
        sea_water_density: rho.into(),
        displacement_at_quarter_mean: disp.into(),
        tpc: tpc.into(),
        lcf: lcf.into(),
        mtc_per_metre: mtc.into(),
        total_deductibles: ded.into(),
    };
    let req = DraftSurveyRequestDTO {
        initial: cond(
            "4.466", "6.804", "5.553", "1.0165", "23771.25", "46.2", "-5.448", "28.5", "6662.941",
        ),
        final_: cond(
            "4.081",
            "6.513",
            "5.217",
            "1.018",
            "22219.995",
            "45.9",
            "-5.85775",
            "28.0",
            "7532.030",
        ),
        operation: "DISCHARGE".into(),
        decimals: 3,
    };
    let r = req.calculate();
    assert!(r.success, "errors: {:?}", r.errors);
    let cargo: Decimal = r.cargo.unwrap().parse().unwrap();
    close(cargo, dec!(2409.733), dec!(0.5), "dto cargo");
    assert!(r.initial.is_some() && r.r#final.is_some());
}

#[test]
fn dto_rejects_bad_operation() {
    let cond = DraftConditionDTO {
        forward_corrected: "4".into(),
        aft_corrected: "6".into(),
        midship_corrected: "5".into(),
        lbp: "175".into(),
        sea_water_density: "1.025".into(),
        displacement_at_quarter_mean: "20000".into(),
        tpc: "45".into(),
        lcf: "-5".into(),
        mtc_per_metre: "28".into(),
        total_deductibles: "0".into(),
    };
    let req = DraftSurveyRequestDTO {
        initial: cond.clone(),
        final_: cond,
        operation: "XYZ".into(),
        decimals: 3,
    };
    assert!(!req.calculate().success);
}

//! Tank sampling levels QA — validated against a real INTERTEK "Level Sampling
//! Calculations" worksheet.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use supersurvey_calc::sampling::*;

fn close(a: Decimal, b: Decimal, label: &str) {
    assert!((a - b).abs() <= dec!(0.0005), "{label}: {a} vs {b}");
}

/// Tank 1P: RGH 28.77, Ullage 7.5 → Innage 21.27, Upper 11.045, Middle 18.135,
/// Lower 25.225 (worksheet).
#[test]
fn levels_match_worksheet_1p() {
    let l = sampling_levels(dec!(28.77), dec!(7.5)).unwrap();
    close(l.innage, dec!(21.27), "innage");
    close(l.upper_dip, dec!(11.045), "upper");
    close(l.middle_dip, dec!(18.135), "middle");
    close(l.lower_dip, dec!(25.225), "lower");
}

/// Tank 2C: RGH 29.19, Ullage 1.62 → Innage 27.57, Upper 6.215, Middle 15.405,
/// Lower 24.595.
#[test]
fn levels_match_worksheet_2c() {
    let l = sampling_levels(dec!(29.19), dec!(1.62)).unwrap();
    close(l.innage, dec!(27.57), "innage");
    close(l.upper_dip, dec!(6.215), "upper");
    close(l.middle_dip, dec!(15.405), "middle");
    close(l.lower_dip, dec!(24.595), "lower");
}

/// Heights above bottom: upper = 5/6, middle = 1/2, lower = 1/6 of innage.
#[test]
fn heights_are_fractions_of_innage() {
    let l = sampling_levels(dec!(12), dec!(0)).unwrap(); // innage = 12
    assert_eq!(l.upper_height, dec!(10)); // 5/6·12
    assert_eq!(l.middle_height, dec!(6)); // 1/2·12
    assert_eq!(l.lower_height, dec!(2)); // 1/6·12
                                         // dips + heights reconstruct the full column
    assert_eq!(l.upper_dip + l.upper_height, dec!(12));
}

#[test]
fn rejects_bad_geometry() {
    assert!(sampling_levels(dec!(0), dec!(0)).is_err()); // rgh must be positive
    assert!(sampling_levels(dec!(10), dec!(11)).is_err()); // ullage > rgh
    assert!(sampling_levels(dec!(10), dec!(-1)).is_err()); // negative ullage
}

#[test]
fn dto_calculates_and_reports_per_row_errors() {
    let req = SamplingRequestDTO {
        tanks: vec![
            SamplingTankDTO {
                tank: "1P".into(),
                reference_height: "28.77".into(),
                ullage: "7.5".into(),
            },
            SamplingTankDTO {
                tank: "BAD".into(),
                reference_height: "10".into(),
                ullage: "99".into(),
            },
        ],
        decimals: 3,
        rounding_rule: "HALF_UP".into(),
    };
    let r = req.calculate();
    assert!(r.success);
    let tanks = r.tanks.unwrap();
    assert_eq!(tanks[0].upper.as_deref(), Some("11.045"));
    assert_eq!(tanks[0].middle.as_deref(), Some("18.135"));
    assert_eq!(tanks[0].lower.as_deref(), Some("25.225"));
    // the bad row carries an error but does not fail the whole request
    assert!(tanks[1].error.is_some());
    assert!(tanks[1].upper.is_none());
}

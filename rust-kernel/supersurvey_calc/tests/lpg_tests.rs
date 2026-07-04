//! LPG custody-assembly QA — anchored cell-by-cell to the client certificate (vessel A)
//! propane discharge certificate (a Central American terminal, ship figures):
//!   588 203 kg vac / 586 847 kg air / 1 174 058 L @15 / 1 174.058 m³ @15 /
//!   578.912921818 long tons / 7 396.57 US bbl / 310 655.94 US gal @60.
//! (CTL/VCF via API 11.2.4 COSTALD is staged separately — see docs/research/lpg.md.)

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use supersurvey_calc::lpg::*;
use supersurvey_calc::precision::SystemRoundingRule;

fn close(a: Decimal, b: Decimal, tol: Decimal, label: &str) {
    assert!((a - b).abs() <= tol, "{label}: {a} vs {b} (tol {tol})");
}

#[test]
fn propane_custody_matches_certificate() {
    // Ship figures: m³@15 1174.058, ρ15 0.501 kg/L, 7396.57 bbl@60, Table-56 wcf.
    let c = lpg_custody(
        dec!(1174.058),
        dec!(0.501),
        dec!(7396.57),
        dec!(0.99769464),
        3,
        SystemRoundingRule::HalfUp,
    );
    assert_eq!(c.litres_15, dec!(1174058));
    assert_eq!(c.m3_15, dec!(1174.058));
    assert_eq!(c.mt_vacuum, dec!(588.203)); // 1174.058 × 0.501
    assert_eq!(c.mt_air, dec!(586.847)); // vacuum × Table-56 factor
    assert_eq!(c.long_tons, dec!(578.913)); // kg_vac / 1016.0469088
    assert_eq!(c.bbl_60, dec!(7396.57));
    assert_eq!(c.gal_60, dec!(310655.94)); // bbl × 42
    close(c.m3_60, dec!(1175.961), dec!(0.01), "m3@60 via Table 1");
}

#[test]
fn long_ton_factor_is_from_vacuum() {
    // Long tons come from weight in vacuum / 1016.0469088 (standard long ton).
    // From the displayed 588 203 kg this reproduces the certificate's 578.913 LT
    // at the reported 3 dp (the certificate's 578.9129… is from the unrounded kg).
    let lt = dec!(588203) / LONG_TON_KG;
    close(lt, dec!(578.913), dec!(0.001), "LT");
}

#[test]
fn gallons_are_barrels_times_42() {
    assert_eq!(dec!(7396.57) * GAL_PER_BBL, dec!(310655.94));
}

#[test]
fn dto_round_trip_and_units() {
    let req = LpgCustodyRequestDTO {
        m3_15: "1174.058".into(),
        density15_kg_l: "0.501".into(),
        bbl_60: "7396.57".into(),
        wcf_air_per_vac: "0.99769464".into(),
        decimals: 3,
        rounding_rule: "HALF_UP".into(),
        calculation_scope: "LIVE".into(),
    };
    let r = req.calculate();
    assert!(r.success, "errors: {:?}", r.errors);
    assert_eq!(r.mt_vacuum.as_deref(), Some("588.203"));
    assert_eq!(r.long_tons.as_deref(), Some("578.913"));
    assert_eq!(r.gal_60.as_deref(), Some("310655.94"));
    assert_eq!(r.litres_15.as_deref(), Some("1174058"));
}

#[test]
fn dto_rejects_nonpositive_density() {
    let req = LpgCustodyRequestDTO {
        m3_15: "1000".into(),
        density15_kg_l: "0".into(),
        bbl_60: "6000".into(),
        wcf_air_per_vac: "0.9977".into(),
        decimals: 3,
        rounding_rule: "HALF_UP".into(),
        calculation_scope: "LIVE".into(),
    };
    assert!(!req.calculate().success);
}

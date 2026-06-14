//! Multi-unit custody figure QA — validated against a real Intertek "Summary of
//! Quantities" (MOGAS REGULAR shore tank): GSV 4 601.566 m³@15 ⇒ 4 604.787 m³@60
//! ⇒ 28 963.24 bbl@60 ⇒ 1 216 456.08 gal@60.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use supersurvey_calc::bqs::AstmTable;
use supersurvey_calc::density::rho15_from_api;
use supersurvey_calc::figures::*;

fn close(a: Decimal, b: Decimal, tol: Decimal, label: &str) {
    assert!((a - b).abs() <= tol, "{label}: {a} vs {b} (tol {tol})");
}

#[test]
fn intertek_mogas_cross_base_anchor() {
    // density@15 from the sheet's API 62.3 (gasolines band)
    let rho15 = rho15_from_api(dec!(62.3), AstmTable::Table54B)
        .unwrap()
        .rho15_kg_m3;
    let u = expand_units(dec!(4601.566), rho15).unwrap();
    // exact within-base conversions
    close(u.l_15, dec!(4601566), dec!(1), "L@15");
    close(u.gal60, u.bbl60 * dec!(42), dec!(0.001), "gal = bbl·42");
    close(
        u.l_60,
        u.m3_60 * dec!(1000),
        dec!(0.001),
        "L@60 = m³@60·1000",
    );
    // cross-base 15 °C → 60 °F (uses the product's own VCF)
    close(u.m3_60, dec!(4604.787), dec!(0.15), "m³@60");
    close(u.bbl60, dec!(28963.24), dec!(1.0), "bbl@60");
}

/// Mass is invariant: MT(vacuum) = vol15 · ρ15; MT(air) uses the −0.0011 buoyancy.
#[test]
fn weights_from_density() {
    // ρ15 = 900 kg/m³ = 0.9 kg/L; 1000 m³ @15
    let u = expand_units(dec!(1000), dec!(900)).unwrap();
    assert_eq!(u.mt_vac, dec!(900)); // 1000·0.900
    assert_eq!(u.mt_air, dec!(898.9)); // 1000·(0.9−0.0011)
    close(u.lt_air, dec!(884.703), dec!(0.01), "LT"); // 898.9 / 1.0160469088
}

/// NSV = GSV·(1−S&W%); TCV = GSV + free water. Levels scale consistently.
#[test]
fn levels_tcv_gsv_nsv() {
    let f = custody_figure(dec!(1000), dec!(900), dec!(0.5), dec!(2)).unwrap();
    assert_eq!(f.gsv.m3_15, dec!(1000));
    assert_eq!(f.tcv.m3_15, dec!(1002)); // + free water
    assert_eq!(f.nsv.m3_15, dec!(995)); // 1000·(1−0.005)
}

#[test]
fn dto_expands_all_units() {
    let req = CustodyFigureRequestDTO {
        gsv_value: "1000".into(),
        gsv_unit: "M3_15".into(),
        density15_value: "0.9".into(),
        density15_unit: "KG_L".into(),
        sw_pct: Some("0.5".into()),
        free_water_value: None,
    };
    let r = req.calculate();
    assert!(r.success, "errors: {:?}", r.errors);
    let gsv = r.gsv.unwrap();
    assert_eq!(gsv.mt_vac, "900");
    assert_eq!(gsv.mt_air, "898.9");
    assert_eq!(r.nsv.unwrap().m3_15, "995");
}

#[test]
fn dto_accepts_bbl60_input() {
    // Round trip: feed bbl@60, expect m³@15 back close to the Intertek figure.
    let rho15 = rho15_from_api(dec!(62.3), AstmTable::Table54B)
        .unwrap()
        .rho15_kg_m3;
    let req = CustodyFigureRequestDTO {
        gsv_value: "28963.24".into(),
        gsv_unit: "BBL_60".into(),
        density15_value: rho15.to_string(),
        density15_unit: "KG_M3".into(),
        sw_pct: None,
        free_water_value: None,
    };
    let r = req.calculate();
    assert!(r.success, "errors: {:?}", r.errors);
    let m3_15: Decimal = r.gsv.unwrap().m3_15.parse().unwrap();
    close(m3_15, dec!(4601.566), dec!(0.2), "m³@15 from bbl@60");
}

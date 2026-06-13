//! VEF (Vessel Experience Factor) QA — API MPMS 17.9 / HM49 Primary Method.
//!
//! The headline anchor is a constructed but internally-consistent history whose
//! qualifying voyages give Σvessel/Σshore = 0.99930 — the published VEF figure
//! seen on real cargo reports. The other tests pin the rejection/disqualify
//! logic and the application direction (load vs discharge).

use supersurvey_calc::vef::*;

fn voyage(label: &str, sailing: &str, shore: &str) -> VefVoyageDTO {
    VefVoyageDTO {
        label: label.into(),
        sailing_tcv: sailing.into(),
        obq: None,
        shore_tcv: shore.into(),
        rejected: false,
        rejection_reason: None,
    }
}

/// Five voyages at ratio 0.99930, one marginal disqualified by the band, one
/// rejected upfront → VEF 0.9993, exactly the ratio of the qualifying sums.
fn anchor_request() -> VefRequestDTO {
    VefRequestDTO {
        voyages: vec![
            voyage("V1", "99930", "100000"),
            voyage("V2", "119916", "120000"),
            voyage("V3", "79944", "80000"),
            voyage("V4", "89937", "90000"),
            voyage("V5", "109923", "110000"),
            voyage("V6 marginal", "99300", "100000"), // ratio 0.99300 → disqualified
            VefVoyageDTO {
                label: "V7 gross error".into(),
                sailing_tcv: "49000".into(),
                obq: None,
                shore_tcv: "50000".into(),
                rejected: true,
                rejection_reason: Some("Vessel-only measurement".into()),
            },
        ],
        applications: vec![],
        qualifying_band_pct: "0.30".into(),
        calculation_scope: "TRACE_VIEW".into(),
    }
}

#[test]
fn vef_anchor_is_point_nine_nine_nine_three() {
    let r = anchor_request().calculate();
    assert!(r.success, "errors: {:?}", r.errors);
    assert_eq!(r.vef.as_deref(), Some("0.9993"));
    assert_eq!(r.qualifying_count, Some(5));
    assert_eq!(r.voyage_count, Some(7));
    // First average includes V6 (marginal) but not V7 (rejected).
    assert_eq!(r.first_average.as_deref(), Some("0.99825"));
    assert_eq!(r.second_average.as_deref(), Some("0.99930"));
    assert!(r.trace_json.is_some(), "TRACE_VIEW carries a trace");
}

#[test]
fn rejected_and_disqualified_are_flagged() {
    let r = anchor_request().calculate();
    let voyages = r.voyages.unwrap();
    let v6 = voyages.iter().find(|v| v.label == "V6 marginal").unwrap();
    assert!(!v6.rejected && !v6.qualifying, "V6 disqualified by band");
    assert!(v6.note.as_deref().unwrap_or("").contains("Descalificado"));
    let v7 = voyages.iter().find(|v| v.label.starts_with("V7")).unwrap();
    assert!(v7.rejected && v7.ratio.is_none(), "V7 rejected, no ratio");
}

/// OBQ is subtracted from sailing TCV before the ratio.
#[test]
fn obq_is_subtracted_from_sailing() {
    let mut req = VefRequestDTO {
        voyages: vec![VefVoyageDTO {
            label: "with OBQ".into(),
            sailing_tcv: "100500".into(),
            obq: Some("500".into()),
            shore_tcv: "100000".into(),
            rejected: false,
            rejection_reason: None,
        }],
        applications: vec![],
        qualifying_band_pct: "0.30".into(),
        calculation_scope: "LIVE".into(),
    };
    let r = req.calculate();
    assert!(r.success);
    // vessel = 100500 − 500 = 100000 → ratio 1.0000
    assert_eq!(r.vef.as_deref(), Some("1.0000"));
    req.voyages[0].obq = Some("0".into());
    // vessel 100500 / 100000 = 1.005 → VEF 1.0050
    assert_eq!(req.calculate().vef.as_deref(), Some("1.0050"));
}

/// DISCHARGE: applied = vessel/VEF; difference = shore − applied (% over applied).
#[test]
fn application_discharge_direction() {
    let mut req = anchor_request();
    req.applications = vec![VefApplicationDTO {
        name: "Outturn".into(),
        role: "DISCHARGE".into(),
        vessel_qty: "49965".into(), // 49965 / 0.9993 = 50000.00
        shore_qty: "49980".into(),
    }];
    let r = req.calculate();
    let a = &r.applications.unwrap()[0];
    assert_eq!(a.vef_applied, "50000.00");
    assert_eq!(a.difference, "-20.00"); // shore − applied
    assert_eq!(a.difference_pct, "-0.040"); // over applied (50000)
}

/// LOAD: difference = applied − shore (% over shore).
#[test]
fn application_load_direction() {
    let mut req = anchor_request();
    req.applications = vec![VefApplicationDTO {
        name: "Loaded".into(),
        role: "LOAD".into(),
        vessel_qty: "49965".into(), // applied 50000.00
        shore_qty: "50010".into(),
    }];
    let a = &req.calculate().applications.unwrap()[0];
    assert_eq!(a.vef_applied, "50000.00");
    assert_eq!(a.difference, "-10.00"); // applied − shore
    assert_eq!(a.difference_pct, "-0.020"); // over shore (50010)
}

#[test]
fn too_few_qualifying_voyages_warns() {
    let req = VefRequestDTO {
        voyages: vec![voyage("only one", "99930", "100000")],
        applications: vec![],
        qualifying_band_pct: "0.30".into(),
        calculation_scope: "LIVE".into(),
    };
    let r = req.calculate();
    assert!(r.success);
    assert_eq!(r.vef.as_deref(), Some("0.9993"));
    assert!(r.warnings.is_some(), "fewer than 5 qualifying → warning");
}

#[test]
fn empty_or_all_rejected_fail() {
    let empty = VefRequestDTO {
        voyages: vec![],
        applications: vec![],
        qualifying_band_pct: "0.30".into(),
        calculation_scope: "LIVE".into(),
    };
    assert!(!empty.calculate().success);

    let all_rejected = VefRequestDTO {
        voyages: vec![VefVoyageDTO {
            label: "x".into(),
            sailing_tcv: "1".into(),
            obq: None,
            shore_tcv: "1".into(),
            rejected: true,
            rejection_reason: None,
        }],
        applications: vec![],
        qualifying_band_pct: "0.30".into(),
        calculation_scope: "LIVE".into(),
    };
    assert!(!all_rejected.calculate().success);
}

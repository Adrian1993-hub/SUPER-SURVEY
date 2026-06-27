//! WASM bindings: expose the SuperSurvey calc kernel to the browser demo.
//!
//! The same validated Rust math runs in the browser as on the desktop — no ASTM
//! / VCF / WCF logic is ever reimplemented in TypeScript. The desktop additionally
//! persists results via Tauri + SQLite; this module only *computes*.

use supersurvey_calc::blend::BlendRequestDTO;
use supersurvey_calc::bqs::BqsRowRequestDTO;
use supersurvey_calc::bqs60::ImperialRowRequestDTO;
use supersurvey_calc::comparison::ComparisonRequestDTO;
use supersurvey_calc::costald::CostaldCtlRequestDTO;
use supersurvey_calc::custody::{ProRataRequestDTO, SwRequestDTO};
use supersurvey_calc::density::DensityToolRequestDTO;
use supersurvey_calc::draft::{DraftSurveyRequestDTO, HydrostaticInterpolateRequestDTO};
use supersurvey_calc::figures::CustodyFigureRequestDTO;
use supersurvey_calc::lpg::LpgCustodyRequestDTO;
use supersurvey_calc::lpg_vapor::LpgVaporRequestDTO;
use supersurvey_calc::reconcile::ReconciliationRequestDTO;
use supersurvey_calc::sampling::SamplingRequestDTO;
use supersurvey_calc::vef::VefRequestDTO;
use wasm_bindgen::prelude::*;

/// Compute one BQS tank row.
///
/// `request_json` is a JSON-encoded `BqsRowRequestDTO` — the same string-in /
/// string-out contract as the Tauri `calculate_bqs_row` command. Returns a
/// JSON-encoded `BqsRowResponseDTO`. Calculation errors are reported *inside*
/// that response (`success: false`, `errors`); only malformed input JSON
/// produces the fallback envelope below.
#[wasm_bindgen]
pub fn bqs_calculate_row(request_json: &str) -> String {
    match serde_json::from_str::<BqsRowRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// Compare custody figures (e.g. Vessel vs Barge vs BDN) against layered
/// tolerances and recommend a document (NONE / ISSUE_NOAD / ISSUE_LOP).
///
/// `request_json` is a JSON-encoded `ComparisonRequestDTO`; returns a JSON
/// `ComparisonResponseDTO`. Same error convention as `bqs_calculate_row`.
#[wasm_bindgen]
pub fn compare_sources(request_json: &str) -> String {
    match serde_json::from_str::<ComparisonRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.compare())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// Compute one IMPERIAL BQS tank row (US-customary, 60 °F base): API gravity +
/// observed temperature + volume → VCF (Table 6A/6B) / WCF (Table 13) / barrels
/// / metric tons. `request_json` is a JSON `ImperialRowRequestDTO`; returns a
/// JSON `ImperialRowResponseDTO`. Same error convention as `bqs_calculate_row`.
#[wasm_bindgen]
pub fn bqs_calculate_row_imperial(request_json: &str) -> String {
    match serde_json::from_str::<ImperialRowRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// Density utilities: API ↔ ρ15, observed ρ@t ↔ ρ15, parcel blending.
///
/// `request_json` is a JSON-encoded `DensityToolRequestDTO`; returns a JSON
/// `DensityToolResponseDTO`. Same error convention as `bqs_calculate_row`.
#[wasm_bindgen]
pub fn density_tool(request_json: &str) -> String {
    match serde_json::from_str::<DensityToolRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// Vessel Experience Factor (API MPMS 17.9 / HM49): historic voyages → VEF, and
/// apply it to the present voyage. `request_json` is a JSON `VefRequestDTO`;
/// returns a JSON `VefResponseDTO`. Same error convention as `bqs_calculate_row`.
#[wasm_bindgen]
pub fn vef_calculate(request_json: &str) -> String {
    match serde_json::from_str::<VefRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// S&W (Sediment & Water) deduction: gross → (S&W, net). `request_json` is a JSON
/// `SwRequestDTO`; returns a JSON `SwResponseDTO`.
#[wasm_bindgen]
pub fn sw_deduction(request_json: &str) -> String {
    match serde_json::from_str::<SwRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// Pro-rata apportionment of a total across parcels (e.g. Bills of Lading), with
/// exact rounding reconciliation. JSON `ProRataRequestDTO` → `ProRataResponseDTO`.
#[wasm_bindgen]
pub fn pro_rata(request_json: &str) -> String {
    match serde_json::from_str::<ProRataRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// Tank sampling levels (upper/middle/lower) from ullage + reference height.
/// JSON `SamplingRequestDTO` → `SamplingResponseDTO`.
#[wasm_bindgen]
pub fn sampling_levels(request_json: &str) -> String {
    match serde_json::from_str::<SamplingRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// Multi-unit custody figure: one standard volume + density → all units
/// (bbl/gal/m³/L @60 and @15, MT air/vac, LT) at TCV/GSV/NSV. JSON
/// `CustodyFigureRequestDTO` → `CustodyFigureResponseDTO`.
#[wasm_bindgen]
pub fn custody_figure(request_json: &str) -> String {
    match serde_json::from_str::<CustodyFigureRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// Draft (draught) survey — bulk cargo by displacement (two conditions → cargo
/// by difference). JSON `DraftSurveyRequestDTO` → `DraftSurveyResponseDTO`.
#[wasm_bindgen]
pub fn draft_survey(request_json: &str) -> String {
    match serde_json::from_str::<DraftSurveyRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// Interpolate a vessel's hydrostatic table (displacement/TPC/LCF/MTC) at a
/// draft. JSON `HydrostaticInterpolateRequestDTO` → `…ResponseDTO`.
#[wasm_bindgen]
pub fn hydrostatic_interpolate(request_json: &str) -> String {
    match serde_json::from_str::<HydrostaticInterpolateRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// Terminal / ship-to-shore reconciliation — shore tank by difference ± pipeline
/// line content → Shore Quantity, reconciled against the Vessel and B/L figures
/// (Δ, Δ%, None/NOAD/LOP). JSON `ReconciliationRequestDTO` → `…ResponseDTO`.
#[wasm_bindgen]
pub fn reconcile_terminal(request_json: &str) -> String {
    match serde_json::from_str::<ReconciliationRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// LPG / NGL custody figure: standard volumes (@15 °C, @60 °F) + density →
/// every reported unit (L/m³ @15, MT vacuum & air, long tons from vacuum, bbl &
/// gal @60). JSON `LpgCustodyRequestDTO` → `…ResponseDTO`. (CTL/VCF via API
/// 11.2.4 COSTALD is `costald_ctl` below.)
#[wasm_bindgen]
pub fn lpg_custody(request_json: &str) -> String {
    match serde_json::from_str::<LpgCustodyRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// LPG / NGL temperature correction — CTL (VCF) by COSTALD / API MPMS 11.2.4
/// (corresponding states). The cargo is characterised as a pseudo-component
/// between two catalogued pure components by relative density @ 60 °F. JSON
/// `CostaldCtlRequestDTO` → `CostaldCtlResponseDTO`. Same error convention as
/// `bqs_calculate_row`.
#[wasm_bindgen]
pub fn costald_ctl(request_json: &str) -> String {
    match serde_json::from_str::<CostaldCtlRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// LPG / NGL vapour-space correction (API MPMS 17.10.2): vapour mass in the
/// vapour space (ρv = (288.15/T)(P/1.01325)(M/23.6451)/Z) and the liquid +
/// vapour total. JSON `LpgVaporRequestDTO` → `LpgVaporResponseDTO`. Same error
/// convention as `bqs_calculate_row`.
#[wasm_bindgen]
pub fn lpg_vapor_correction(request_json: &str) -> String {
    match serde_json::from_str::<LpgVaporRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// Fuel-oil blend (commingling): N component parcels -> blended property slate
/// (API/density mixing, Refutas viscosity, flash/pour blending indices, linear
/// sulfur/water/sediment). JSON `BlendRequestDTO` -> `BlendResponseDTO`. Same
/// error convention as `bqs_calculate_row`.
#[wasm_bindgen]
pub fn blend_calculate(request_json: &str) -> String {
    match serde_json::from_str::<BlendRequestDTO>(request_json) {
        Ok(req) => serde_json::to_string(&req.calculate())
            .unwrap_or_else(|e| fallback_error(&format!("serialize response failed: {e}"))),
        Err(e) => fallback_error(&format!("invalid request JSON: {e}")),
    }
}

/// Kernel version string (for the UI to show which math built a number).
#[wasm_bindgen]
pub fn kernel_version() -> String {
    supersurvey_calc::KERNEL_VERSION.to_string()
}

fn fallback_error(message: &str) -> String {
    serde_json::json!({
        "success": false,
        "errors": [{ "code": "WASM_BOUNDARY", "message": message }],
    })
    .to_string()
}

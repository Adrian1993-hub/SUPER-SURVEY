//! WASM bindings: expose the SuperSurvey calc kernel to the browser demo.
//!
//! The same validated Rust math runs in the browser as on the desktop — no ASTM
//! / VCF / WCF logic is ever reimplemented in TypeScript. The desktop additionally
//! persists results via Tauri + SQLite; this module only *computes*.

use supersurvey_calc::bqs::BqsRowRequestDTO;
use supersurvey_calc::bqs60::ImperialRowRequestDTO;
use supersurvey_calc::comparison::ComparisonRequestDTO;
use supersurvey_calc::custody::{ProRataRequestDTO, SwRequestDTO};
use supersurvey_calc::density::DensityToolRequestDTO;
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

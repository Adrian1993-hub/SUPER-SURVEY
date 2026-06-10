//! WASM bindings: expose the SuperSurvey calc kernel to the browser demo.
//!
//! The same validated Rust math runs in the browser as on the desktop — no ASTM
//! / VCF / WCF logic is ever reimplemented in TypeScript. The desktop additionally
//! persists results via Tauri + SQLite; this module only *computes*.

use supersurvey_calc::bqs::BqsRowRequestDTO;
use supersurvey_calc::comparison::ComparisonRequestDTO;
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

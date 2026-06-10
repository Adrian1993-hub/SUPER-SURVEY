//! SuperSurvey desktop shell (Tauri v2).
//!
//! Thin IPC boundary: TypeScript sends string-in DTOs, Rust calculates with the
//! official kernel and persists immutable logs to SQLite. The shell carries NO
//! calculation logic of its own — it delegates to `supersurvey_calc` (official
//! math) and `supersurvey_persistence` (storage).
//!
//! Commands:
//! - `calculate_bqs_row`   : pure calc (LIVE/SAVE), returns row + trace.
//! - `save_bqs_calculation`: calc + persist as an append-only calculation_log.

use std::sync::Mutex;
use supersurvey_calc::bqs::{BqsRowRequestDTO, BqsRowResponseDTO};
use supersurvey_persistence::Database;

/// App-wide state: a single SQLite connection guarded by a Mutex
/// (`rusqlite::Connection` is `Send` but not `Sync`).
pub struct AppState {
    pub db: Mutex<Database>,
}

/// Compute one BQS tank row from the surveyor's inputs (no persistence).
#[tauri::command]
fn calculate_bqs_row(request: BqsRowRequestDTO) -> BqsRowResponseDTO {
    request.calculate()
}

/// Compute and persist a BQS row as an immutable calculation log; returns the log id.
#[tauri::command]
fn save_bqs_calculation(
    state: tauri::State<'_, AppState>,
    job_id: String,
    measurement_set_id: Option<String>,
    measurement_record_id: Option<String>,
    request: BqsRowRequestDTO,
) -> Result<String, String> {
    let response = request.calculate();
    if !response.success {
        return Err("calculation failed; not persisted".to_string());
    }
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.append_bqs_calculation(
        &job_id,
        measurement_set_id.as_deref(),
        measurement_record_id.as_deref(),
        env!("CARGO_PKG_VERSION"),
        &request,
        &response,
    )
    .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Offline-first: a local SQLite file next to the app.
    let db = Database::open("supersurvey.db").expect("failed to open SuperSurvey database");

    tauri::Builder::default()
        .manage(AppState { db: Mutex::new(db) })
        .invoke_handler(tauri::generate_handler![
            calculate_bqs_row,
            save_bqs_calculation
        ])
        .run(tauri::generate_context!())
        .expect("error while running SuperSurvey");
}

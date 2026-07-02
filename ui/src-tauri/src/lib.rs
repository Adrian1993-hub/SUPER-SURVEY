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

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use supersurvey_calc::bqs::{BqsRowRequestDTO, BqsRowResponseDTO};
use supersurvey_persistence::{
    CalculationLogRow, Database, JobSummary, MeasurementSetRow, NewJob, NewMeasurementSet,
    NewTankRow,
};

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
        supersurvey_calc::KERNEL_VERSION,
        &request,
        &response,
    )
    .map_err(|e| e.to_string())
}

/// Persist a whole worksheet section: create the job + measurement set, then
/// append one immutable calculation_log per tank row. Each row is recomputed
/// here with the official kernel (the UI cannot supply trusted numbers), so the
/// stored output always matches the stored input + engine version.
#[derive(Debug, Deserialize)]
struct SaveMeasurementArgs {
    job_ref: String,
    operation_family: String,
    operation_type: String,
    report_ref: Option<String>,
    client_ref: Option<String>,
    port_name: Option<String>,
    module_type: String,
    module_title: String,
    role: String,
    movement_sign_rule: String,
    rows: Vec<BqsRowRequestDTO>,
    /// Per-tank VmrTank JSON snapshots (lossless source for hydration on load).
    #[serde(default)]
    tank_snapshots: Vec<String>,
}

#[derive(Debug, Serialize)]
struct SaveMeasurementResult {
    job_id: String,
    measurement_set_id: String,
    saved: usize,
    skipped: usize,
}

#[tauri::command]
fn save_measurement(
    state: tauri::State<'_, AppState>,
    args: SaveMeasurementArgs,
) -> Result<SaveMeasurementResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let job_id = db
        .create_job(&NewJob {
            job_ref: args.job_ref,
            operation_family: args.operation_family,
            operation_type: args.operation_type,
            report_ref: args.report_ref,
            client_ref: args.client_ref,
            port_name: args.port_name,
        })
        .map_err(|e| e.to_string())?;
    let set_id = db
        .create_measurement_set(&NewMeasurementSet {
            job_id: job_id.clone(),
            module_type: args.module_type,
            title: args.module_title,
            role: args.role,
            movement_sign_rule: args.movement_sign_rule,
        })
        .map_err(|e| e.to_string())?;

    // Persist a full per-tank snapshot per row (the lossless source for hydration).
    for (i, snap) in args.tank_snapshots.iter().enumerate() {
        // The real tank name lives inside the VmrTank snapshot (`tanque`). Use it so
        // the denormalized column matches the data; fall back to a positional label
        // only when the snapshot is missing/blank.
        let tank_name = serde_json::from_str::<serde_json::Value>(snap)
            .ok()
            .as_ref()
            .and_then(|v| v.get("tanque"))
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(str::to_string)
            .unwrap_or_else(|| format!("Tank {}", i + 1));
        db.create_tank_row(&NewTankRow {
            measurement_set_id: set_id.clone(),
            tank_name,
            sequence_no: (i + 1) as i64,
            is_non_nominated: false,
            tank_profile_snapshot_json: snap.clone(),
        })
        .map_err(|e| e.to_string())?;
    }

    let mut saved = 0usize;
    let mut skipped = 0usize;
    for req in &args.rows {
        let resp = req.calculate();
        if !resp.success {
            skipped += 1;
            continue;
        }
        db.append_bqs_calculation(
            &job_id,
            Some(&set_id),
            None,
            supersurvey_calc::KERNEL_VERSION,
            req,
            &resp,
        )
        .map_err(|e| e.to_string())?;
        saved += 1;
    }

    Ok(SaveMeasurementResult {
        job_id,
        measurement_set_id: set_id,
        saved,
        skipped,
    })
}

/// List all stored jobs (newest first) for the Trabajos screen.
#[tauri::command]
fn list_jobs(state: tauri::State<'_, AppState>) -> Result<Vec<JobSummary>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_jobs().map_err(|e| e.to_string())
}

/// A loaded job with its measurement sets and active (official) calculation logs.
#[derive(Debug, Serialize)]
struct JobDetail {
    job: JobSummary,
    sets: Vec<MeasurementSetRow>,
    logs: Vec<CalculationLogRow>,
}

/// Load one job (with sets + active calculation logs); `null` if it doesn't exist.
#[tauri::command]
fn load_job_detail(
    state: tauri::State<'_, AppState>,
    job_id: String,
) -> Result<Option<JobDetail>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let job = match db.load_job(&job_id).map_err(|e| e.to_string())? {
        Some(j) => j,
        None => return Ok(None),
    };
    let sets = db
        .list_measurement_sets(&job_id)
        .map_err(|e| e.to_string())?;
    let logs = db
        .list_active_calculation_logs(&job_id)
        .map_err(|e| e.to_string())?;
    Ok(Some(JobDetail { job, sets, logs }))
}

/// Create a new (empty) job; returns its generated id.
#[derive(Debug, Deserialize)]
struct CreateJobArgs {
    job_ref: String,
    operation_family: String,
    operation_type: String,
    report_ref: Option<String>,
    client_ref: Option<String>,
    port_name: Option<String>,
}

#[tauri::command]
fn create_job(state: tauri::State<'_, AppState>, args: CreateJobArgs) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_job(&NewJob {
        job_ref: args.job_ref,
        operation_family: args.operation_family,
        operation_type: args.operation_type,
        report_ref: args.report_ref,
        client_ref: args.client_ref,
        port_name: args.port_name,
    })
    .map_err(|e| e.to_string())
}

/// Tank-row snapshots (VmrTank JSON) of the most recent measurement set for a
/// job — the lossless source the UI parses to rebuild the measurement grid.
#[tauri::command]
fn load_measurement_snapshots(
    state: tauri::State<'_, AppState>,
    job_id: String,
) -> Result<Vec<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let sets = db
        .list_measurement_sets(&job_id)
        .map_err(|e| e.to_string())?;
    let last = match sets.last() {
        Some(s) => s,
        None => return Ok(vec![]),
    };
    let rows = db.list_tank_rows(&last.id).map_err(|e| e.to_string())?;
    Ok(rows
        .into_iter()
        .map(|r| r.tank_profile_snapshot_json)
        .collect())
}

/// Read an optional runtime branding override (brand.json) from the app config
/// dir — restyle colors + product name WITHOUT a rebuild. `null` if absent.
#[tauri::command]
fn read_brand_override(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri::Manager;
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    Ok(std::fs::read_to_string(dir.join("brand.json")).ok())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Offline-first: a local SQLite file next to the app.
    let db = Database::open("supersurvey.db").expect("failed to open SuperSurvey database");

    tauri::Builder::default()
        .manage(AppState { db: Mutex::new(db) })
        .invoke_handler(tauri::generate_handler![
            calculate_bqs_row,
            save_bqs_calculation,
            save_measurement,
            list_jobs,
            load_job_detail,
            create_job,
            load_measurement_snapshots,
            read_brand_override
        ])
        .run(tauri::generate_context!())
        .expect("error while running SuperSurvey");
}

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

mod license;

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

/// Estado de la licencia (`license.key` en el app config dir, junto a
/// brand.json). Gate SUAVE: la UI muestra «Modo evaluación» si no es VALID.
#[tauri::command]
fn license_status(app: tauri::AppHandle) -> Result<license::LicenseInfo, String> {
    use tauri::Manager;
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let json = std::fs::read_to_string(dir.join("license.key")).ok();
    Ok(license::evaluate(json.as_deref()))
}

/// Pasarela ÚNICA de cálculo para el escritorio (anti-RE, F3): la UI llama por
/// nombre y el binario NATIVO ejecuta el kernel — el build desktop no incluye
/// el `.wasm` (la matemática no viaja en un artefacto extraíble). Mismo contrato
/// string-in/string-out que los exports WASM de la demo web; los errores de
/// cálculo van DENTRO de la respuesta (success:false), igual que en WASM.
#[tauri::command]
fn kernel_call(fn_name: String, request_json: String) -> Result<String, String> {
    use supersurvey_calc as calc;
    fn run<T, F>(json: &str, calculate: F) -> Result<String, String>
    where
        T: serde::de::DeserializeOwned,
        F: Fn(&T) -> String,
    {
        let req: T = serde_json::from_str(json).map_err(|e| format!("invalid request JSON: {e}"))?;
        Ok(calculate(&req))
    }
    fn out<R: Serialize>(resp: &R) -> String {
        serde_json::to_string(resp).unwrap_or_else(|e| format!("{{\"success\":false,\"errors\":[{{\"code\":\"IPC_BOUNDARY\",\"message\":\"serialize failed: {e}\"}}]}}"))
    }
    match fn_name.as_str() {
        "bqs_calculate_row" => run(&request_json, |r: &calc::bqs::BqsRowRequestDTO| out(&r.calculate())),
        "bqs_calculate_row_imperial" => run(&request_json, |r: &calc::bqs60::ImperialRowRequestDTO| out(&r.calculate())),
        "compare_sources" => run(&request_json, |r: &calc::comparison::ComparisonRequestDTO| out(&r.compare())),
        "density_tool" => run(&request_json, |r: &calc::density::DensityToolRequestDTO| out(&r.calculate())),
        "vef_calculate" => run(&request_json, |r: &calc::vef::VefRequestDTO| out(&r.calculate())),
        "sw_deduction" => run(&request_json, |r: &calc::custody::SwRequestDTO| out(&r.calculate())),
        "pro_rata" => run(&request_json, |r: &calc::custody::ProRataRequestDTO| out(&r.calculate())),
        "sampling_levels" => run(&request_json, |r: &calc::sampling::SamplingRequestDTO| out(&r.calculate())),
        "custody_figure" => run(&request_json, |r: &calc::figures::CustodyFigureRequestDTO| out(&r.calculate())),
        "draft_survey" => run(&request_json, |r: &calc::draft::DraftSurveyRequestDTO| out(&r.calculate())),
        "hydrostatic_interpolate" => run(&request_json, |r: &calc::draft::HydrostaticInterpolateRequestDTO| out(&r.calculate())),
        "reconcile_terminal" => run(&request_json, |r: &calc::reconcile::ReconciliationRequestDTO| out(&r.calculate())),
        "lng_discharge" => run(&request_json, |r: &calc::lng::LngDischargeRequestDTO| out(&r.calculate())),
        "lpg_custody" => run(&request_json, |r: &calc::lpg::LpgCustodyRequestDTO| out(&r.calculate())),
        "costald_ctl" => run(&request_json, |r: &calc::costald::CostaldCtlRequestDTO| out(&r.calculate())),
        "lpg_vapor_correction" => run(&request_json, |r: &calc::lpg_vapor::LpgVaporRequestDTO| out(&r.calculate())),
        "blend_calculate" => run(&request_json, |r: &calc::blend::BlendRequestDTO| out(&r.calculate())),
        "movement_set_calculate" => run(&request_json, |r: &calc::movement::MovementSetRequestDTO| out(&r.calculate())),
        "kernel_version" => Ok(calc::KERNEL_VERSION.to_string()),
        other => Err(format!("unknown kernel function: {other}")),
    }
}

/// Respaldo automático de la BD: si la versión de la app cambió desde la última
/// ejecución (marcador `last_version.txt`), copia `supersurvey.db` a `backups/`
/// ANTES de abrirla (retención: 3 más recientes). Falla en silencio: un respaldo
/// imposible nunca debe impedir arrancar la app.
fn backup_on_version_change(data_dir: &std::path::Path, db_path: &std::path::Path) {
    const VERSION: &str = env!("CARGO_PKG_VERSION");
    let marker = data_dir.join("last_version.txt");
    let last = std::fs::read_to_string(&marker).unwrap_or_default();
    let last = last.trim();
    if last == VERSION || !db_path.exists() {
        let _ = std::fs::write(&marker, VERSION);
        return;
    }
    let backups = data_dir.join("backups");
    let _ = std::fs::create_dir_all(&backups);
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let from = if last.is_empty() { "prev".to_string() } else { last.replace(['/', '\\'], "_") };
    let dest = backups.join(format!("supersurvey-v{from}-{stamp}.db"));
    if std::fs::copy(db_path, &dest).is_ok() {
        // Retención: conservar solo los 3 respaldos más recientes (el timestamp
        // en el nombre hace que el orden lexicográfico sea cronológico).
        if let Ok(entries) = std::fs::read_dir(&backups) {
            let mut files: Vec<_> = entries
                .flatten()
                .map(|e| e.path())
                .filter(|p| p.extension().is_some_and(|x| x == "db"))
                .collect();
            files.sort();
            while files.len() > 3 {
                let _ = std::fs::remove_file(files.remove(0));
            }
        }
        let _ = std::fs::write(&marker, VERSION);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Offline-first. La BD vive en el APP DATA DIR del usuario (siempre
        // escribible) — nunca en el cwd: instalada en Program Files, el cwd no
        // es escribible y una ruta relativa dispersaría los datos según desde
        // dónde se lance la app.
        .setup(|app| {
            use tauri::Manager;
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("supersurvey.db");
            backup_on_version_change(&data_dir, &db_path);
            let db = Database::open(&db_path)
                .map_err(|e| format!("no se pudo abrir la base de datos en {}: {e}", db_path.display()))?;
            app.manage(AppState { db: Mutex::new(db) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            calculate_bqs_row,
            save_bqs_calculation,
            save_measurement,
            list_jobs,
            load_job_detail,
            create_job,
            load_measurement_snapshots,
            read_brand_override,
            license_status,
            kernel_call
        ])
        .run(tauri::generate_context!())
        .expect("error while running SuperSurvey");
}

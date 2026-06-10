//! SuperSurvey persistence — SQLite repositories over the hardened data model.
//!
//! Offline-first storage for what the surveyor captures and what the kernel
//! computes. The hardened schema (`schema/…_hardened.sql`, 37 tables) is the
//! single source of truth and is embedded verbatim; this crate only adds typed
//! insert/read helpers and a bridge that persists a kernel BQS calculation as an
//! immutable `calculation_logs` row.
//!
//! Policy mirrored from the schema:
//! - UUID `TEXT` ids, generated here;
//! - decimal/official values stored as `TEXT` (parsed elsewhere by `rust_decimal`);
//! - `PRAGMA foreign_keys = ON` on every connection;
//! - `calculation_logs` is append-only: DELETE is blocked and the payload is
//!   immutable (only status transitions allowed) — enforced by schema triggers.

use rusqlite::{params, Connection};
use supersurvey_calc::bqs::{BqsRowRequestDTO, BqsRowResponseDTO};
use uuid::Uuid;

/// The hardened schema, embedded so the binary is self-contained (no file I/O).
pub const SCHEMA_SQL: &str =
    include_str!("../../schema/supersurvey_sqlite_schema_v0_1_3_1_hardened.sql");

pub type Result<T> = rusqlite::Result<T>;

fn new_id() -> String {
    Uuid::new_v4().to_string()
}

/// An open SuperSurvey database (the hardened schema applied, FKs enforced).
pub struct Database {
    conn: Connection,
}

impl Database {
    /// In-memory database — used by tests and ephemeral previews.
    pub fn open_in_memory() -> Result<Self> {
        Self::init(Connection::open_in_memory()?)
    }

    /// File-backed database (created if missing) with the schema applied.
    pub fn open(path: impl AsRef<std::path::Path>) -> Result<Self> {
        Self::init(Connection::open(path)?)
    }

    fn init(conn: Connection) -> Result<Self> {
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        conn.execute_batch(SCHEMA_SQL)?;
        Ok(Self { conn })
    }

    /// Escape hatch for reads/queries not yet wrapped by a repo method.
    pub fn connection(&self) -> &Connection {
        &self.conn
    }

    // ---------------- Jobs ----------------

    pub fn create_job(&self, job: &NewJob) -> Result<String> {
        let id = new_id();
        self.conn.execute(
            "INSERT INTO jobs
               (id, job_ref, report_ref, client_ref, operation_family, operation_type,
                port_name, cover_data_json, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, '{}', datetime('now'), datetime('now'))",
            params![
                id,
                job.job_ref,
                job.report_ref,
                job.client_ref,
                job.operation_family,
                job.operation_type,
                job.port_name,
            ],
        )?;
        Ok(id)
    }

    pub fn job_ref(&self, job_id: &str) -> Result<Option<String>> {
        self.conn
            .query_row("SELECT job_ref FROM jobs WHERE id = ?1", [job_id], |r| {
                r.get(0)
            })
            .map(Some)
            .or_else(|e| match e {
                rusqlite::Error::QueryReturnedNoRows => Ok(None),
                other => Err(other),
            })
    }

    // ---------------- Measurement structure ----------------

    pub fn create_measurement_set(&self, set: &NewMeasurementSet) -> Result<String> {
        let id = new_id();
        self.conn.execute(
            "INSERT INTO measurement_sets
               (id, job_id, module_type, title, role, movement_sign_rule, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'DRAFT', datetime('now'), datetime('now'))",
            params![
                id,
                set.job_id,
                set.module_type,
                set.title,
                set.role,
                set.movement_sign_rule,
            ],
        )?;
        Ok(id)
    }

    pub fn create_tank_row(&self, row: &NewTankRow) -> Result<String> {
        let id = new_id();
        self.conn.execute(
            "INSERT INTO measurement_tank_rows
               (id, measurement_set_id, tank_name, sequence_no, is_non_nominated, tank_profile_snapshot_json)
             VALUES (?1, ?2, ?3, ?4, ?5, '{}')",
            params![
                id,
                row.measurement_set_id,
                row.tank_name,
                row.sequence_no,
                row.is_non_nominated as i64,
            ],
        )?;
        Ok(id)
    }

    pub fn create_measurement_record(&self, record: &NewMeasurementRecord) -> Result<String> {
        let id = new_id();
        self.conn.execute(
            "INSERT INTO measurement_records
               (id, tank_row_id, stage, gauge_value, gauge_unit, gauge_type,
                free_water_volume_value, temperature_average_value, temperature_unit,
                density_value, density_basis, input_status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'DRAFT', datetime('now'), datetime('now'))",
            params![
                id,
                record.tank_row_id,
                record.stage,
                record.gauge_value,
                record.gauge_unit,
                record.gauge_type,
                record.free_water_volume_value,
                record.temperature_average_value,
                record.temperature_unit,
                record.density_value,
                record.density_basis,
            ],
        )?;
        Ok(id)
    }

    // ---------------- Calculation logs (append-only) ----------------

    pub fn append_calculation_log(&self, log: &NewCalculationLog) -> Result<String> {
        let id = new_id();
        self.conn.execute(
            "INSERT INTO calculation_logs
               (id, job_id, measurement_set_id, measurement_record_id, calculation_scope,
                calculation_type, engine_version, input_snapshot_json, method_snapshot_json,
                output_snapshot_json, precision_snapshot_json, trace_json, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'ACTIVE', datetime('now'))",
            params![
                id,
                log.job_id,
                log.measurement_set_id,
                log.measurement_record_id,
                log.calculation_scope,
                log.calculation_type,
                log.engine_version,
                log.input_snapshot_json,
                log.method_snapshot_json,
                log.output_snapshot_json,
                log.precision_snapshot_json,
                log.trace_json,
            ],
        )?;
        Ok(id)
    }

    /// Bridge: persist a kernel BQS row calculation as an immutable log.
    ///
    /// `input_snapshot` = the surveyor's request, `output_snapshot` = the kernel
    /// response, `trace_json` carried through from the response. Non-LIVE scopes
    /// must carry a trace (schema CHECK) — the kernel populates it for SAVE/EXPORT.
    pub fn append_bqs_calculation(
        &self,
        job_id: &str,
        measurement_set_id: Option<&str>,
        measurement_record_id: Option<&str>,
        engine_version: &str,
        request: &BqsRowRequestDTO,
        response: &BqsRowResponseDTO,
    ) -> Result<String> {
        let to_json = |label: &str, value: serde_json::Value| {
            serde_json::to_string(&value).unwrap_or_else(|_| format!("{{\"error\":\"{label}\"}}"))
        };
        let input_snapshot_json = serde_json::to_string(request)
            .unwrap_or_else(|_| "{\"error\":\"request\"}".to_string());
        let output_snapshot_json = serde_json::to_string(response)
            .unwrap_or_else(|_| "{\"error\":\"response\"}".to_string());
        let method_snapshot_json = to_json(
            "method",
            serde_json::json!({ "engine": "bqs", "astm_table": request.astm_table }),
        );
        let precision_snapshot_json = to_json(
            "precision",
            serde_json::json!({
                "rounding_rule": request.rounding_rule,
                "intermediate_rounding": request.intermediate_rounding,
                "observed_volume_decimals": request.observed_volume_decimals,
                "standard_volume_decimals": request.standard_volume_decimals,
                "weight_decimals": request.weight_decimals,
            }),
        );
        let trace_json = response.trace_json.as_ref().map(|t| t.to_string());

        self.append_calculation_log(&NewCalculationLog {
            job_id: job_id.to_string(),
            measurement_set_id: measurement_set_id.map(str::to_string),
            measurement_record_id: measurement_record_id.map(str::to_string),
            calculation_scope: request.calculation_scope.clone(),
            calculation_type: "TANK_QTY".to_string(),
            engine_version: engine_version.to_string(),
            input_snapshot_json,
            method_snapshot_json,
            output_snapshot_json,
            precision_snapshot_json,
            trace_json,
        })
    }

    pub fn count_active_calculation_logs(&self, job_id: &str) -> Result<i64> {
        self.conn.query_row(
            "SELECT count(*) FROM v_active_calculation_logs WHERE job_id = ?1",
            [job_id],
            |r| r.get(0),
        )
    }
}

// ---------------- Input structs (minimal NOT NULL surface) ----------------

#[derive(Debug, Clone, Default)]
pub struct NewJob {
    pub job_ref: String,
    pub operation_family: String,
    pub operation_type: String,
    pub report_ref: Option<String>,
    pub client_ref: Option<String>,
    pub port_name: Option<String>,
}

#[derive(Debug, Clone)]
pub struct NewMeasurementSet {
    pub job_id: String,
    pub module_type: String,
    pub title: String,
    /// DELIVERY | RECEIVING | INVENTORY | REFERENCE | DISPLACEMENT
    pub role: String,
    /// CLOSING_MINUS_OPENING | OPENING_MINUS_CLOSING | CUSTOM
    pub movement_sign_rule: String,
}

#[derive(Debug, Clone)]
pub struct NewTankRow {
    pub measurement_set_id: String,
    pub tank_name: String,
    pub sequence_no: i64,
    pub is_non_nominated: bool,
}

#[derive(Debug, Clone, Default)]
pub struct NewMeasurementRecord {
    pub tank_row_id: String,
    /// OPENING | CLOSING | BEFORE | AFTER | ARRIVAL | DEPARTURE | INITIAL | FINAL
    pub stage: String,
    pub gauge_value: Option<String>,
    pub gauge_unit: Option<String>,
    pub gauge_type: Option<String>,
    pub free_water_volume_value: Option<String>,
    pub temperature_average_value: Option<String>,
    pub temperature_unit: Option<String>,
    pub density_value: Option<String>,
    pub density_basis: Option<String>,
}

#[derive(Debug, Clone)]
pub struct NewCalculationLog {
    pub job_id: String,
    pub measurement_set_id: Option<String>,
    pub measurement_record_id: Option<String>,
    pub calculation_scope: String,
    pub calculation_type: String,
    pub engine_version: String,
    pub input_snapshot_json: String,
    pub method_snapshot_json: String,
    pub output_snapshot_json: String,
    pub precision_snapshot_json: String,
    pub trace_json: Option<String>,
}

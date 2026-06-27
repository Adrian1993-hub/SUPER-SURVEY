//! Persistence tests: schema integrity, the capture→calculate→log flow, the
//! append-only guarantee on calculation_logs, and FK enforcement.

use supersurvey_calc::bqs::BqsRowRequestDTO;
use supersurvey_persistence::*;

fn count(db: &Database, sql: &str) -> i64 {
    db.connection().query_row(sql, [], |r| r.get(0)).unwrap()
}

fn demo_job(db: &Database) -> String {
    db.create_job(&NewJob {
        job_ref: "BQS-DEMO-0142".into(),
        operation_family: "BQS".into(),
        operation_type: "BUNKER_LOADING".into(),
        report_ref: Some("R-0142".into()),
        client_ref: Some("CLIENTE-DEMO".into()),
        port_name: Some("Puerto Demo".into()),
    })
    .unwrap()
}

fn bqs_request() -> BqsRowRequestDTO {
    BqsRowRequestDTO {
        calculation_scope: "SAVE".into(),
        density15_value: "0.9534".into(),
        density15_unit: "KG_PER_LITRE".into(),
        temperature_value: "35.0".into(),
        temperature_unit: "CELSIUS".into(),
        tov_value: "222.680".into(),
        tov_unit: "CUBIC_METERS".into(),
        free_water_value: "0".into(),
        free_water_unit: "CUBIC_METERS".into(),
        astm_table: "54B".into(),
        table_version: "D1250_80".into(),
        rounding_rule: "HALF_UP".into(),
        intermediate_rounding: true,
        observed_volume_decimals: 3,
        standard_volume_decimals: 3,
        weight_decimals: 3,
    }
}

#[test]
fn schema_applies_with_expected_object_counts() {
    let db = Database::open_in_memory().unwrap();
    assert_eq!(
        count(
            &db,
            "select count(*) from sqlite_master where type='table' and name not like 'sqlite_%'"
        ),
        37
    );
    assert_eq!(
        count(&db, "select count(*) from sqlite_master where type='view'"),
        2
    );
    assert_eq!(
        count(
            &db,
            "select count(*) from sqlite_master where type='trigger'"
        ),
        2
    );
    assert_eq!(
        count(
            &db,
            "select count(*) from sqlite_master where type='index' and name not like 'sqlite_%'"
        ),
        24
    );
}

#[test]
fn capture_to_calculation_log_flow_persists() {
    let db = Database::open_in_memory().unwrap();
    let job_id = demo_job(&db);
    assert_eq!(
        db.job_ref(&job_id).unwrap().as_deref(),
        Some("BQS-DEMO-0142")
    );

    let set_id = db
        .create_measurement_set(&NewMeasurementSet {
            job_id: job_id.clone(),
            module_type: "VMR".into(),
            title: "Before receiving".into(),
            role: "RECEIVING".into(),
            movement_sign_rule: "CLOSING_MINUS_OPENING".into(),
        })
        .unwrap();

    let row_id = db
        .create_tank_row(&NewTankRow {
            measurement_set_id: set_id.clone(),
            tank_name: "4 AFT S".into(),
            sequence_no: 1,
            is_non_nominated: false,
            tank_profile_snapshot_json: "{}".into(),
        })
        .unwrap();

    let record_id = db
        .create_measurement_record(&NewMeasurementRecord {
            tank_row_id: row_id,
            stage: "BEFORE".into(),
            gauge_value: Some("6.620".into()),
            gauge_unit: Some("METERS".into()),
            gauge_type: Some("SOUNDING".into()),
            temperature_average_value: Some("35.0".into()),
            temperature_unit: Some("CELSIUS".into()),
            density_value: Some("0.9534".into()),
            density_basis: Some("DENSITY_15C".into()),
            ..Default::default()
        })
        .unwrap();

    // Surveyor inputs -> kernel -> persisted immutable log.
    let request = bqs_request();
    let response = request.calculate();
    assert!(response.success);
    assert_eq!(response.mt_air_value.as_deref(), Some("209.004"));

    let log_id = db
        .append_bqs_calculation(
            &job_id,
            Some(&set_id),
            Some(&record_id),
            "supersurvey_calc-0.1.1",
            &request,
            &response,
        )
        .unwrap();
    assert!(!log_id.is_empty());
    assert_eq!(db.count_active_calculation_logs(&job_id).unwrap(), 1);

    // The persisted output snapshot carries the official figure.
    let stored: String = db
        .connection()
        .query_row(
            "SELECT output_snapshot_json FROM calculation_logs WHERE id = ?1",
            [&log_id],
            |r| r.get(0),
        )
        .unwrap();
    assert!(stored.contains("209.004"));
}

#[test]
fn calculation_logs_are_append_only() {
    let db = Database::open_in_memory().unwrap();
    let job_id = demo_job(&db);
    let request = bqs_request();
    let response = request.calculate();
    let log_id = db
        .append_bqs_calculation(&job_id, None, None, "test", &request, &response)
        .unwrap();

    // DELETE is blocked by trigger.
    let delete = db
        .connection()
        .execute("DELETE FROM calculation_logs WHERE id = ?1", [&log_id]);
    assert!(delete.is_err(), "DELETE must be blocked");

    // Payload UPDATE is blocked by trigger.
    let tamper = db.connection().execute(
        "UPDATE calculation_logs SET output_snapshot_json = '{\"tampered\":true}' WHERE id = ?1",
        [&log_id],
    );
    assert!(tamper.is_err(), "payload UPDATE must be blocked");

    // Status-only transition is allowed.
    let status = db.connection().execute(
        "UPDATE calculation_logs SET status = 'SUPERSEDED' WHERE id = ?1",
        [&log_id],
    );
    assert_eq!(status.unwrap(), 1);
    // No longer ACTIVE.
    assert_eq!(db.count_active_calculation_logs(&job_id).unwrap(), 0);
}

#[test]
fn loads_and_lists_jobs_sets_and_logs() {
    let db = Database::open_in_memory().unwrap();
    let job_id = demo_job(&db);
    let set_id = db
        .create_measurement_set(&NewMeasurementSet {
            job_id: job_id.clone(),
            module_type: "VMR".into(),
            title: "Before receiving".into(),
            role: "RECEIVING".into(),
            movement_sign_rule: "CLOSING_MINUS_OPENING".into(),
        })
        .unwrap();
    let request = bqs_request();
    let response = request.calculate();
    db.append_bqs_calculation(&job_id, Some(&set_id), None, "test", &request, &response)
        .unwrap();

    // list_jobs: the job appears with its active-log count.
    let jobs = db.list_jobs().unwrap();
    assert_eq!(jobs.len(), 1);
    assert_eq!(jobs[0].job_ref, "BQS-DEMO-0142");
    assert_eq!(jobs[0].active_log_count, 1);

    // load_job: by id, and None for a missing id.
    let loaded = db.load_job(&job_id).unwrap().expect("job exists");
    assert_eq!(loaded.port_name.as_deref(), Some("Puerto Demo"));
    assert!(db.load_job("does-not-exist").unwrap().is_none());

    // list_measurement_sets + list_active_calculation_logs round-trip.
    let sets = db.list_measurement_sets(&job_id).unwrap();
    assert_eq!(sets.len(), 1);
    assert_eq!(sets[0].title, "Before receiving");

    let logs = db.list_active_calculation_logs(&job_id).unwrap();
    assert_eq!(logs.len(), 1);
    assert!(logs[0].output_snapshot_json.contains("209.004"));

    // Superseding the log removes it from the active list.
    db.connection()
        .execute(
            "UPDATE calculation_logs SET status = 'SUPERSEDED' WHERE id = ?1",
            [&logs[0].id],
        )
        .unwrap();
    assert_eq!(db.list_active_calculation_logs(&job_id).unwrap().len(), 0);
    assert_eq!(db.list_jobs().unwrap()[0].active_log_count, 0);
}

#[test]
fn tank_row_snapshot_round_trips_for_hydration() {
    let db = Database::open_in_memory().unwrap();
    let job_id = demo_job(&db);
    let set_id = db
        .create_measurement_set(&NewMeasurementSet {
            job_id,
            module_type: "VMR".into(),
            title: "Before receiving".into(),
            role: "RECEIVING".into(),
            movement_sign_rule: "CLOSING_MINUS_OPENING".into(),
        })
        .unwrap();
    let snapshot = r#"{"tanque":"4 AFT S","grade":"VLSFO","densidad15":0.9534,"tov":222.68}"#;
    db.create_tank_row(&NewTankRow {
        measurement_set_id: set_id.clone(),
        tank_name: "4 AFT S".into(),
        sequence_no: 1,
        is_non_nominated: false,
        tank_profile_snapshot_json: snapshot.into(),
    })
    .unwrap();

    // list_tank_rows returns the full snapshot → the UI can rebuild the grid.
    let rows = db.list_tank_rows(&set_id).unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].tank_name, "4 AFT S");
    assert!(!rows[0].is_non_nominated);
    assert!(rows[0].tank_profile_snapshot_json.contains("VLSFO"));
    assert!(rows[0].tank_profile_snapshot_json.contains("222.68"));
}

#[test]
fn foreign_keys_are_enforced() {
    let db = Database::open_in_memory().unwrap();
    let orphan = db.create_measurement_set(&NewMeasurementSet {
        job_id: "does-not-exist".into(),
        module_type: "VMR".into(),
        title: "Orphan".into(),
        role: "RECEIVING".into(),
        movement_sign_rule: "CLOSING_MINUS_OPENING".into(),
    });
    assert!(orphan.is_err(), "FK violation must be rejected");
}

#[test]
fn non_live_log_without_trace_is_rejected_by_schema_check() {
    let db = Database::open_in_memory().unwrap();
    let job_id = demo_job(&db);
    // SAVE scope but no trace -> violates CHECK(scope='LIVE' OR trace_json IS NOT NULL).
    let bad = db.append_calculation_log(&NewCalculationLog {
        job_id,
        measurement_set_id: None,
        measurement_record_id: None,
        calculation_scope: "SAVE".into(),
        calculation_type: "TANK_QTY".into(),
        engine_version: "test".into(),
        input_snapshot_json: "{}".into(),
        method_snapshot_json: "{}".into(),
        output_snapshot_json: "{}".into(),
        precision_snapshot_json: "{}".into(),
        trace_json: None,
    });
    assert!(bad.is_err(), "non-LIVE log without trace must be rejected");
}

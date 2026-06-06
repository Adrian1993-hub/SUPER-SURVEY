-- =============================================================================
-- SuperSurvey — SQLite Data Model v0.1.3.1-HARDENED
-- Offline-first · Tauri + Rust + TypeScript + SQLite
-- =============================================================================
-- Base: v0.1.3-FINAL + hardening review from Codex/Gemini.
-- Objetivo: congelar el Data Model para iniciar Rust Calculation Kernel Sprint 1.
--
-- Decisiones congeladas:
--   - Todos los ids son UUID TEXT generados por Rust.
--   - Valores decimales oficiales se guardan como TEXT y se parsean con rust_decimal.
--   - TypeScript no calcula cantidades oficiales; Rust calcula y devuelve result + trace.
--   - API MPMS 11.1 / ASTM D1250 moderno se implementa algorítmicamente en Rust;
--     no se guardan millones de filas 54A/54B en SQLite.
--   - SQLite guarda tablas que sí cambian por activo o referencia: tank strapping,
--     trim/list correction, hydrostatic tables, LPG lookup cuando aplique.
--   - Calculation logs son inmutables: ACTIVE / SUPERSEDED / VOIDED.
--   - Live Summary usa cache rápido; trace pesado se genera on demand o en save/export.
--   - Excel es salida de primera clase con formula_strategy: STATIC_VALUES / NATIVE_FORMULAS / HYBRID.
--   - PRAGMA foreign_keys = ON en cada conexión.
-- =============================================================================

PRAGMA foreign_keys = ON;

-- =========================
-- 0. Sistema / versionado / identidad           [CORE]
-- =========================
CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inspectors (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    license_no TEXT,
    ifia_no TEXT,
    affiliate TEXT,
    signature_image_path TEXT,
    is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0,1)),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','RETIRED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- =========================
-- 1. Registry de estándares y cálculo           [CORE]
-- =========================
CREATE TABLE IF NOT EXISTS standards_registry (
    id TEXT PRIMARY KEY,
    standard_family TEXT NOT NULL,          -- API, ASTM, ISO, EI, GPA, Internal, Terminal
    standard_code TEXT NOT NULL,            -- API MPMS 11.1, ASTM D1250-19, ISO 13739
    version_label TEXT NOT NULL,            -- 1980, 2004, 2019, terminal revision
    title TEXT,
    source_reference TEXT,
    effective_from TEXT,
    effective_to TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUPERSEDED','DRAFT','RETIRED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(standard_code, version_label)
);

CREATE TABLE IF NOT EXISTS calculation_algorithms (
    id TEXT PRIMARY KEY,
    standard_id TEXT NOT NULL REFERENCES standards_registry(id),
    algorithm_key TEXT NOT NULL,            -- api_mpms_11_1_vcf, tank_table_interp_2d, unit_temp_c_to_f
    calculation_type TEXT NOT NULL,         -- UNIT_CONVERSION, TANK_QTY, VCF, WCF, INTERPOLATION, DRAFT, MOVEMENT
    product_family TEXT,                    -- CRUDE, REFINED_PRODUCT, LPG, WATER, DRY_BULK
    implementation_kind TEXT NOT NULL DEFAULT 'ALGORITHM' CHECK(implementation_kind IN ('ALGORITHM','LOOKUP','HYBRID','MANUAL')),
    input_basis_json TEXT NOT NULL,         -- schema de inputs y unidades
    output_basis_json TEXT NOT NULL,        -- schema de outputs
    coefficient_set_json TEXT,              -- coeficientes/constantes, no filas masivas
    valid_range_json TEXT,                  -- rangos de validación
    implementation_notes TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUPERSEDED','DRAFT','RETIRED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(standard_id, algorithm_key)
);

CREATE TABLE IF NOT EXISTS precision_modes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    intermediate_rounding INTEGER NOT NULL DEFAULT 0 CHECK(intermediate_rounding IN (0,1)),
    rounding_rule TEXT NOT NULL DEFAULT 'HALF_UP' CHECK(rounding_rule IN ('HALF_UP','HALF_EVEN','TRUNCATE','CEILING','FLOOR','INTERNAL_STANDARD')),
    vcf_decimals INTEGER,
    density_decimals INTEGER,
    observed_volume_decimals INTEGER,
    standard_volume_decimals INTEGER,
    weight_decimals INTEGER,
    percent_decimals INTEGER,
    custom_rules_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS calculation_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    profile_type TEXT NOT NULL CHECK(profile_type IN ('SHORE','SHIP','BARGE','LPG','DRAFT','FLOWMETER','GENERAL')),
    standard_id TEXT REFERENCES standards_registry(id),
    algorithm_id TEXT REFERENCES calculation_algorithms(id),
    precision_mode_id TEXT REFERENCES precision_modes(id),
    product_family TEXT,
    observed_volume_unit TEXT,
    standard_volume_unit_1 TEXT,
    standard_volume_unit_2 TEXT,
    weight_unit_1 TEXT,
    weight_unit_2 TEXT,
    weight_unit_3 TEXT,
    gravity_basis TEXT,                      -- DENSITY_15C, API_60F, RD_60_60, SG_60_60
    temperature_unit TEXT,
    gauge_unit TEXT,
    vcf_table_label TEXT,                    -- etiqueta UI/reporte (54B); VCF moderno es algorítmico
    is_locked INTEGER NOT NULL DEFAULT 0 CHECK(is_locked IN (0,1)),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUPERSEDED','DRAFT','RETIRED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tolerance_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scope TEXT,                              -- COMPANY, CLIENT, OPERATION, GENERAL
    description TEXT,
    is_locked INTEGER NOT NULL DEFAULT 0 CHECK(is_locked IN (0,1)),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUPERSEDED','DRAFT','RETIRED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tolerance_rules (
    id TEXT PRIMARY KEY,
    tolerance_profile_id TEXT NOT NULL REFERENCES tolerance_profiles(id) ON DELETE CASCADE,
    comparison_type TEXT NOT NULL,           -- BOL_VS_OUTTURN, BARGE_VS_VESSEL, FLOWMETER_VS_TANK, etc.
    product_family TEXT,
    unit TEXT NOT NULL,                      -- MT, MT_AIR, M3_15C, BBL_60F, %, LT
    threshold_basis TEXT NOT NULL DEFAULT 'PERCENT' CHECK(threshold_basis IN ('PERCENT','ABSOLUTE')),
    warning_threshold TEXT,
    critical_threshold TEXT,
    metadata_json TEXT
);

-- =========================
-- 2. Perfiles: buques, barcazas, terminales      [CORE]
-- =========================
CREATE TABLE IF NOT EXISTS asset_profiles (
    id TEXT PRIMARY KEY,
    asset_type TEXT NOT NULL CHECK(asset_type IN ('VESSEL','BARGE','TERMINAL','SHORE_TANK_GROUP','FLOWMETER_GROUP','LINE_SYSTEM')),
    name TEXT NOT NULL,
    official_id TEXT,                        -- IMO, registro de barcaza, código de terminal
    owner_operator TEXT,
    default_calculation_profile_id TEXT REFERENCES calculation_profiles(id),
    metadata_json TEXT,                      -- LBP, LOA, common signatories, notes, etc.
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUPERSEDED','DRAFT','RETIRED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tank_profiles (
    id TEXT PRIMARY KEY,
    asset_profile_id TEXT NOT NULL REFERENCES asset_profiles(id) ON DELETE CASCADE,
    tank_name TEXT NOT NULL,
    tank_label TEXT,
    sequence_no INTEGER NOT NULL DEFAULT 0,
    default_product_family TEXT,
    default_grade TEXT,
    reference_height_value TEXT,
    reference_height_unit TEXT,
    gauge_unit TEXT,
    gauge_type TEXT,                         -- ULLAGE, INNAGE, SOUNDING
    trim_correction_supported INTEGER NOT NULL DEFAULT 0 CHECK(trim_correction_supported IN (0,1)),
    list_correction_supported INTEGER NOT NULL DEFAULT 0 CHECK(list_correction_supported IN (0,1)),
    metadata_json TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUPERSEDED','DRAFT','RETIRED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(asset_profile_id, tank_name)
);

CREATE TABLE IF NOT EXISTS calibration_tables (
    id TEXT PRIMARY KEY,
    owner_asset_profile_id TEXT REFERENCES asset_profiles(id),
    table_type TEXT NOT NULL CHECK(table_type IN ('TANK_STRAPPING','TRIM_CORRECTION','LIST_CORRECTION','HYDROSTATIC','LPG_LOOKUP','OTHER_LOOKUP')),
    name TEXT NOT NULL,
    version_label TEXT NOT NULL,
    source_document TEXT,
    unit_basis_json TEXT NOT NULL,           -- describe ejes/unidades/resultados
    interpolation_method TEXT NOT NULL DEFAULT 'LINEAR_1D' CHECK(interpolation_method IN ('LINEAR_1D','BILINEAR_2D','TRILINEAR_3D','FOUR_WAY_TRIM','CUSTOM')),
    axis_count INTEGER NOT NULL DEFAULT 1 CHECK(axis_count BETWEEN 1 AND 4),
    metadata_json TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUPERSEDED','DRAFT','RETIRED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- v0.1.3: relación flexible tanque ↔ tablas de calibración.
-- Un tanque puede tener strapping, trim, list, FW table, etc.
CREATE TABLE IF NOT EXISTS tank_profile_calibration_refs (
    id TEXT PRIMARY KEY,
    tank_profile_id TEXT NOT NULL REFERENCES tank_profiles(id) ON DELETE CASCADE,
    calibration_table_id TEXT NOT NULL REFERENCES calibration_tables(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('STRAPPING','TRIM_CORRECTION','LIST_CORRECTION','HYDROSTATIC','FW_TABLE','OTHER')),
    is_default INTEGER NOT NULL DEFAULT 1 CHECK(is_default IN (0,1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(tank_profile_id, calibration_table_id, role)
);

-- v0.1.3: ejes híbridos; axis_num solo para bracketing, axis_text para auditoría decimal.
-- axis_*_num permite bracketing rápido; axis_*_text guarda el valor original/auditable.
CREATE TABLE IF NOT EXISTS calibration_points (
    id TEXT PRIMARY KEY,
    calibration_table_id TEXT NOT NULL REFERENCES calibration_tables(id) ON DELETE CASCADE,
    axis_x_num REAL NOT NULL,
    axis_y_num REAL,
    axis_z_num REAL,
    axis_w_num REAL,                              -- v0.1.3.1: 4th axis for FOUR_WAY_TRIM/CUSTOM tables
    axis_x_text TEXT NOT NULL,
    axis_y_text TEXT,
    axis_z_text TEXT,
    axis_w_text TEXT,                             -- v0.1.3.1: audit/original decimal for 4th axis
    result_value TEXT NOT NULL,
    result_unit TEXT,
    point_order INTEGER DEFAULT 0,
    metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_calibration_points_lookup
ON calibration_points(calibration_table_id, axis_x_num, axis_y_num, axis_z_num, axis_w_num);

-- =========================
-- 3. Jobs / cover master data                    [CORE]
-- =========================
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    job_ref TEXT NOT NULL,
    report_ref TEXT,
    client_ref TEXT,
    operation_family TEXT NOT NULL,          -- BQS, TERMINAL, STS, LPG, DRAFT, INVENTORY, SAMPLING
    operation_type TEXT NOT NULL,            -- BUNKER_LOADING, DISCHARGE, LINE_PUSH, etc.
    report_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(report_status IN ('DRAFT','PRELIMINARY','IN_REVIEW','FINAL','REVISED','VOID')),
    location_name TEXT,
    port_name TEXT,
    berth_or_anchorage TEXT,
    country TEXT,
    commenced_at TEXT,
    completed_at TEXT,
    surveyor_inspector_id TEXT REFERENCES inspectors(id),
    default_calculation_profile_id TEXT REFERENCES calculation_profiles(id),
    default_tolerance_profile_id TEXT REFERENCES tolerance_profiles(id),
    cover_data_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    voided_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_ref ON jobs(job_ref);
CREATE INDEX IF NOT EXISTS idx_jobs_operation ON jobs(operation_family, operation_type);

CREATE TABLE IF NOT EXISTS parties (
    id TEXT PRIMARY KEY,
    party_name TEXT NOT NULL,
    party_type TEXT NOT NULL CHECK(party_type IN ('CLIENT','SUPPLIER','RECEIVER','TERMINAL','VESSEL','BARGE','AGENT','LAB','OTHER')),
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_parties (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    party_id TEXT REFERENCES parties(id),
    role TEXT NOT NULL,                      -- Customer, Terminal Rep, Master, Chief Engineer, Barge Officer
    display_name TEXT NOT NULL,
    signatory_required INTEGER NOT NULL DEFAULT 0 CHECK(signatory_required IN (0,1)),
    signature_label TEXT,
    sequence_no INTEGER DEFAULT 0,
    metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS job_assets (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    asset_profile_id TEXT REFERENCES asset_profiles(id),
    asset_type TEXT NOT NULL CHECK(asset_type IN ('VESSEL','BARGE','TERMINAL','SHORE_TANK','FLOWMETER','LINE','OTHER')),
    role TEXT NOT NULL,                      -- DELIVERY, RECEIVING, REFERENCE, DISPLACEMENT, INVENTORY
    name TEXT NOT NULL,
    official_id TEXT,
    metadata_json TEXT,
    profile_snapshot_json TEXT NOT NULL DEFAULT '{}', -- snapshot operativo del perfil al crear el job
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_products (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    grade_name TEXT,
    product_family TEXT NOT NULL,            -- CRUDE, REFINED_PRODUCT, BUNKER, LPG, WATER, DRY_BULK
    parcel_no TEXT,
    nominated_quantity_value TEXT,
    nominated_quantity_unit TEXT,
    density_basis TEXT,
    density_value TEXT,
    api_value TEXT,
    sg_value TEXT,
    metadata_json TEXT,
    sequence_no INTEGER DEFAULT 0
);

-- =========================
-- 4. Measurement sets y paired measurements      [CORE]
-- =========================
CREATE TABLE IF NOT EXISTS measurement_sets (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    module_type TEXT NOT NULL,               -- VMR, BMR, SHORE_TANK, LINE_PUSH, WATER_DRAW, INVENTORY, LPG_ARRIVAL
    title TEXT NOT NULL,
    source_asset_id TEXT REFERENCES job_assets(id),
    role TEXT NOT NULL CHECK(role IN ('DELIVERY','RECEIVING','INVENTORY','REFERENCE','DISPLACEMENT')),
    job_product_id TEXT REFERENCES job_products(id),
    calculation_profile_id TEXT REFERENCES calculation_profiles(id),
    movement_sign_rule TEXT NOT NULL CHECK(movement_sign_rule IN ('CLOSING_MINUS_OPENING','OPENING_MINUS_CLOSING','CUSTOM')),
    custom_movement_json TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','IN_PROGRESS','COMPLETE','LOCKED','VOID')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_measurement_sets_job ON measurement_sets(job_id);

CREATE TABLE IF NOT EXISTS measurement_tank_rows (
    id TEXT PRIMARY KEY,
    measurement_set_id TEXT NOT NULL REFERENCES measurement_sets(id) ON DELETE CASCADE,
    tank_profile_id TEXT REFERENCES tank_profiles(id),
    tank_name TEXT NOT NULL,
    sequence_no INTEGER NOT NULL DEFAULT 0,
    job_product_id TEXT REFERENCES job_products(id),
    is_non_nominated INTEGER NOT NULL DEFAULT 0 CHECK(is_non_nominated IN (0,1)),
    non_nominated_reason TEXT,
    reference_height_value TEXT,
    reference_height_unit TEXT,
    gauge_unit TEXT,
    gauge_type TEXT,
    calibration_table_id TEXT REFERENCES calibration_tables(id),
    metadata_json TEXT,
    tank_profile_snapshot_json TEXT NOT NULL DEFAULT '{}', -- snapshot operativo del tanque/perfil dentro del job
    UNIQUE(measurement_set_id, tank_name)
);

CREATE TABLE IF NOT EXISTS measurement_records (
    id TEXT PRIMARY KEY,
    tank_row_id TEXT NOT NULL REFERENCES measurement_tank_rows(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK(stage IN ('OPENING','CLOSING','BEFORE','AFTER','ARRIVAL','DEPARTURE','INITIAL','FINAL')),
    -- Inputs capturados por surveyor:
    gauge_value TEXT,
    gauge_unit TEXT,
    gauge_type TEXT,
    gauge_mark TEXT,
    corrected_gauge_value TEXT,
    free_water_gauge_value TEXT,
    free_water_volume_value TEXT,
    temperature_upper_value TEXT,
    temperature_middle_value TEXT,
    temperature_lower_value TEXT,
    temperature_average_value TEXT,
    temperature_unit TEXT,
    density_value TEXT,
    density_basis TEXT,
    api_value TEXT,
    sg_value TEXT,
    -- Cache efímero para velocidad de UI. La verdad oficial está en calculation_logs.
    cached_outputs_json TEXT,
    last_calculation_log_id TEXT,
    input_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(input_status IN ('DRAFT','VALIDATED','OVERRIDDEN','LOCKED','VOID')),
    override_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(tank_row_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_measurement_records_row_stage ON measurement_records(tank_row_id, stage);

-- v0.1.3: cache no oficial consultable para Live Summary sin JSON pesado ni trace por tecla.
CREATE TABLE IF NOT EXISTS measurement_live_cache (
    id TEXT PRIMARY KEY,
    measurement_record_id TEXT NOT NULL UNIQUE REFERENCES measurement_records(id) ON DELETE CASCADE,
    last_calculation_log_id TEXT REFERENCES calculation_logs(id),
    tov_value TEXT,
    fw_value TEXT,
    gov_value TEXT,
    gsv_value TEXT,
    nsv_value TEXT,
    mt_air_value TEXT,
    mt_vac_value TEXT,
    bbl_value TEXT,
    lt_value TEXT,
    vcf_value TEXT,
    wcf_value TEXT,
    cache_status TEXT NOT NULL DEFAULT 'STALE' CHECK(cache_status IN ('FRESH','STALE','INVALID','ERROR')),
    cache_validation_rule TEXT,
    error_message TEXT,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_measurement_live_cache_status ON measurement_live_cache(cache_status);

-- v0.1.3: totales por measurement_set/product para dashboards, comparisons y reports.
CREATE TABLE IF NOT EXISTS measurement_set_summaries (
    id TEXT PRIMARY KEY,
    measurement_set_id TEXT NOT NULL REFERENCES measurement_sets(id) ON DELETE CASCADE,
    job_product_id TEXT REFERENCES job_products(id),
    summary_stage TEXT NOT NULL DEFAULT 'MOVEMENT' CHECK(summary_stage IN ('OPENING','CLOSING','MOVEMENT','ARRIVAL','DEPARTURE','INITIAL','FINAL')),
    total_tov_value TEXT,
    total_fw_value TEXT,
    total_gov_value TEXT,
    total_gsv_value TEXT,
    total_nsv_value TEXT,
    total_mt_air_value TEXT,
    total_mt_vac_value TEXT,
    total_bbl_value TEXT,
    total_lt_value TEXT,
    percent_difference_value TEXT,
    last_calculation_log_id TEXT REFERENCES calculation_logs(id),
    cache_status TEXT NOT NULL DEFAULT 'STALE' CHECK(cache_status IN ('FRESH','STALE','INVALID','ERROR')),
    cache_validation_rule TEXT,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_measurement_set_summaries_unique
ON measurement_set_summaries(measurement_set_id, COALESCE(job_product_id, '__ALL_PRODUCTS__'), summary_stage);

CREATE INDEX IF NOT EXISTS idx_measurement_set_summaries_set ON measurement_set_summaries(measurement_set_id, summary_stage);
CREATE INDEX IF NOT EXISTS idx_measurement_set_summaries_cache ON measurement_set_summaries(cache_status);

-- =========================
-- 5. Calculation logs y audit                    [CORE]
-- =========================
CREATE TABLE IF NOT EXISTS calculation_logs (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    measurement_set_id TEXT REFERENCES measurement_sets(id) ON DELETE CASCADE,
    measurement_record_id TEXT REFERENCES measurement_records(id),
    calculation_scope TEXT NOT NULL CHECK(calculation_scope IN ('LIVE','SAVE','EXPORT','TRACE_VIEW','QA_TEST')),
    calculation_type TEXT NOT NULL,           -- UNIT_CONVERSION, TANK_QTY, MOVEMENT, VCF, WCF, COMPARISON, DRAFT
    engine_version TEXT NOT NULL,
    registry_algorithm_id TEXT REFERENCES calculation_algorithms(id),
    precision_mode_id TEXT REFERENCES precision_modes(id),
    input_snapshot_json TEXT NOT NULL,
    method_snapshot_json TEXT NOT NULL,
    output_snapshot_json TEXT NOT NULL,
    precision_snapshot_json TEXT NOT NULL,
    trace_json TEXT,
    previous_log_id TEXT REFERENCES calculation_logs(id),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUPERSEDED','VOIDED')),
    result_hash TEXT,
    created_by_inspector_id TEXT REFERENCES inspectors(id),
    created_at TEXT NOT NULL,
    CHECK(calculation_scope = 'LIVE' OR trace_json IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_calc_logs_job ON calculation_logs(job_id, status);
CREATE INDEX IF NOT EXISTS idx_calc_logs_record ON calculation_logs(measurement_record_id, status);
CREATE INDEX IF NOT EXISTS idx_calc_logs_set ON calculation_logs(measurement_set_id, status);

-- v0.1.3.1: calculation logs are append-only for official payloads.
-- DELETE is blocked. UPDATE is allowed only for status transitions (ACTIVE/SUPERSEDED/VOIDED).
CREATE TRIGGER IF NOT EXISTS trg_calculation_logs_no_delete
BEFORE DELETE ON calculation_logs
BEGIN
    SELECT RAISE(ABORT, 'calculation_logs are append-only; DELETE is not allowed');
END;

CREATE TRIGGER IF NOT EXISTS trg_calculation_logs_payload_immutable
BEFORE UPDATE ON calculation_logs
WHEN
    OLD.job_id IS NOT NEW.job_id OR
    OLD.measurement_set_id IS NOT NEW.measurement_set_id OR
    OLD.measurement_record_id IS NOT NEW.measurement_record_id OR
    OLD.calculation_scope IS NOT NEW.calculation_scope OR
    OLD.calculation_type IS NOT NEW.calculation_type OR
    OLD.engine_version IS NOT NEW.engine_version OR
    OLD.registry_algorithm_id IS NOT NEW.registry_algorithm_id OR
    OLD.precision_mode_id IS NOT NEW.precision_mode_id OR
    OLD.input_snapshot_json IS NOT NEW.input_snapshot_json OR
    OLD.method_snapshot_json IS NOT NEW.method_snapshot_json OR
    OLD.output_snapshot_json IS NOT NEW.output_snapshot_json OR
    OLD.precision_snapshot_json IS NOT NEW.precision_snapshot_json OR
    OLD.trace_json IS NOT NEW.trace_json OR
    OLD.previous_log_id IS NOT NEW.previous_log_id OR
    OLD.result_hash IS NOT NEW.result_hash OR
    OLD.created_by_inspector_id IS NOT NEW.created_by_inspector_id OR
    OLD.created_at IS NOT NEW.created_at
BEGIN
    SELECT RAISE(ABORT, 'calculation_logs payload is immutable; insert a new log instead');
END;

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    job_id TEXT REFERENCES jobs(id),
    entity_table TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('CREATE','UPDATE','DELETE','VOID','LOCK','UNLOCK','EXPORT','IMPORT','OVERRIDE')),
    old_value_json TEXT,
    new_value_json TEXT,
    reason TEXT,
    inspector_id TEXT REFERENCES inspectors(id),
    user_name TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_job ON audit_log(job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_table, entity_id);

-- =========================
-- 6. Comparison / discrepancy / documents        [SCAFFOLD]
-- =========================
CREATE TABLE IF NOT EXISTS comparison_sets (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    comparison_type TEXT NOT NULL,            -- IN_TRANSIT, BOL_VS_OUTTURN, SHORE_VS_VESSEL, BARGE_VS_VESSEL, FLOWMETER_VS_TANK, BDN_VS_VESSEL
    title TEXT NOT NULL,
    base_quantity_source TEXT NOT NULL,
    compare_quantity_source TEXT NOT NULL,
    tolerance_profile_id TEXT REFERENCES tolerance_profiles(id),
    unit_set_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','COMPLETE','LOCKED','VOID')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comparison_results (
    id TEXT PRIMARY KEY,
    comparison_set_id TEXT NOT NULL REFERENCES comparison_sets(id) ON DELETE CASCADE,
    job_product_id TEXT REFERENCES job_products(id),
    unit TEXT NOT NULL,
    base_value TEXT NOT NULL,
    compare_value TEXT NOT NULL,
    difference_value TEXT NOT NULL,
    difference_percent TEXT,
    status TEXT NOT NULL DEFAULT 'NORMAL' CHECK(status IN ('NORMAL','WARNING','CRITICAL','VOID')),
    applied_tolerance_rule_id TEXT REFERENCES tolerance_rules(id),
    calculation_log_id TEXT REFERENCES calculation_logs(id),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS discrepancy_events (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    comparison_result_id TEXT REFERENCES comparison_results(id),
    severity TEXT NOT NULL CHECK(severity IN ('INFO','WARNING','CRITICAL')),
    event_type TEXT NOT NULL,                 -- POTENTIAL_NOAD, POTENTIAL_LOP, TOLERANCE_EXCEEDED, MISSING_DATA
    printable INTEGER NOT NULL DEFAULT 0 CHECK(printable IN (0,1)),
    message TEXT NOT NULL,
    recommendation TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','ACKNOWLEDGED','RESOLVED','VOID')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generated_documents (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK(document_type IN ('NOAD','LOP','SOF','QUANTITY_CERTIFICATE','SUMMARY','TIME_LOG','OTHER')),
    title TEXT NOT NULL,
    directed_to_party_id TEXT REFERENCES job_parties(id),
    source_discrepancy_event_id TEXT REFERENCES discrepancy_events(id),
    selected_units_json TEXT,
    body_template_key TEXT,
    body_rendered_text TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','IN_REVIEW','FINAL','REVISED','VOID')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- =========================
-- 7. Report templates / packages / exports       [SCAFFOLD]
-- =========================
CREATE TABLE IF NOT EXISTS report_templates (
    id TEXT PRIMARY KEY,
    template_key TEXT NOT NULL UNIQUE,        -- BQS_SUMMARY, VMR, BMR, NOAD, LOP, SOF, LPG_CERTIFICATE
    name TEXT NOT NULL,
    report_family TEXT NOT NULL,              -- BQS, TERMINAL, LPG, STS, DRAFT, COMMON
    description TEXT,
    default_export_types_json TEXT,           -- ["PDF","XLSX"]
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUPERSEDED','DRAFT','RETIRED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_template_versions (
    id TEXT PRIMARY KEY,
    report_template_id TEXT NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    version_label TEXT NOT NULL,
    renderer_type TEXT NOT NULL CHECK(renderer_type IN ('PDF_HTML','XLSX','DOCX','JSON_TECHNICAL')),
    template_path TEXT,
    template_json TEXT,
    formula_strategy TEXT NOT NULL DEFAULT 'STATIC_VALUES' CHECK(formula_strategy IN ('STATIC_VALUES','NATIVE_FORMULAS','HYBRID')),
    compatible_operation_families_json TEXT,
    compatible_operation_types_json TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUPERSEDED','DRAFT','RETIRED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(report_template_id, version_label, renderer_type)
);

CREATE TABLE IF NOT EXISTS report_packages (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','IN_REVIEW','FINAL','REVISED','VOID')),
    package_config_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_sections (
    id TEXT PRIMARY KEY,
    report_package_id TEXT NOT NULL REFERENCES report_packages(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    title TEXT NOT NULL,
    report_template_version_id TEXT REFERENCES report_template_versions(id),
    include_in_pdf INTEGER NOT NULL DEFAULT 1 CHECK(include_in_pdf IN (0,1)),
    include_in_xlsx INTEGER NOT NULL DEFAULT 1 CHECK(include_in_xlsx IN (0,1)),
    sequence_no INTEGER NOT NULL DEFAULT 0,
    source_entity_table TEXT,
    source_entity_id TEXT,
    section_config_json TEXT,
    UNIQUE(report_package_id, section_key)
);

CREATE TABLE IF NOT EXISTS report_exports (
    id TEXT PRIMARY KEY,
    report_package_id TEXT REFERENCES report_packages(id) ON DELETE SET NULL,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    report_template_version_id TEXT REFERENCES report_template_versions(id),
    export_type TEXT NOT NULL CHECK(export_type IN ('PDF','XLSX','HTML_PREVIEW','JSON_TECHNICAL','DOCX')),
    file_path TEXT NOT NULL,
    export_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(export_status IN ('DRAFT','FINAL','REVISED','VOID')),
    renderer_version TEXT NOT NULL,
    formula_strategy TEXT NOT NULL DEFAULT 'STATIC_VALUES' CHECK(formula_strategy IN ('STATIC_VALUES','NATIVE_FORMULAS','HYBRID')),
    export_purpose TEXT NOT NULL DEFAULT 'OFFICIAL' CHECK(export_purpose IN ('OFFICIAL','WORKING','PREVIEW','TECHNICAL')),
    source_model_hash TEXT,
    integrity_hash TEXT,
    hidden_technical_sheet_included INTEGER NOT NULL DEFAULT 0 CHECK(hidden_technical_sheet_included IN (0,1)),
    exported_by_inspector_id TEXT REFERENCES inspectors(id),
    exported_at TEXT NOT NULL,
    remarks TEXT,
    CHECK(export_type != 'XLSX' OR export_purpose != 'OFFICIAL' OR formula_strategy = 'STATIC_VALUES')
);

CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_hash TEXT,
    attachment_type TEXT,                     -- BOL, BDN, PHOTOS, LAB_CERT, TABLE, OTHER
    metadata_json TEXT,
    created_at TEXT NOT NULL
);

-- =========================
-- 8. QA test cases                               [CORE]
-- =========================
CREATE TABLE IF NOT EXISTS qa_test_cases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    test_type TEXT NOT NULL CHECK(test_type IN ('UNIT_CONVERSION','TANK_QTY','VCF','INTERPOLATION','MOVEMENT','REPORT_EXPORT','REGRESSION')),
    registry_algorithm_id TEXT REFERENCES calculation_algorithms(id),
    input_json TEXT NOT NULL,
    expected_output_json TEXT NOT NULL,
    tolerance_json TEXT,
    source_reference TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','DISABLED','SUPERSEDED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- =========================
-- 9. Índices adicionales
-- =========================
CREATE INDEX IF NOT EXISTS idx_job_assets_job_role ON job_assets(job_id, role);
CREATE INDEX IF NOT EXISTS idx_job_products_job ON job_products(job_id);
CREATE INDEX IF NOT EXISTS idx_measurement_rows_set_seq ON measurement_tank_rows(measurement_set_id, sequence_no);
CREATE INDEX IF NOT EXISTS idx_tank_profile_calibration_refs ON tank_profile_calibration_refs(tank_profile_id, role);
CREATE INDEX IF NOT EXISTS idx_comparison_sets_job ON comparison_sets(job_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_events_job_status ON discrepancy_events(job_id, status);
CREATE INDEX IF NOT EXISTS idx_generated_documents_job ON generated_documents(job_id, document_type, status);
CREATE INDEX IF NOT EXISTS idx_report_templates_key ON report_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_report_exports_job ON report_exports(job_id, exported_at);
CREATE INDEX IF NOT EXISTS idx_tolerance_rules_profile ON tolerance_rules(tolerance_profile_id, comparison_type);

-- =========================
-- 10. Vistas útiles para desarrollo/debug
-- =========================
CREATE VIEW IF NOT EXISTS v_active_calculation_logs AS
SELECT *
FROM calculation_logs
WHERE status = 'ACTIVE';

CREATE VIEW IF NOT EXISTS v_measurement_records_with_live_cache AS
SELECT
    mr.id AS measurement_record_id,
    mr.tank_row_id,
    mr.stage,
    mr.gauge_value,
    mr.temperature_average_value,
    mr.density_value,
    mlc.gov_value,
    mlc.gsv_value,
    mlc.mt_air_value,
    mlc.mt_vac_value,
    mlc.bbl_value,
    mlc.cache_status AS live_cache_status,
    mlc.updated_at AS live_cache_updated_at
FROM measurement_records mr
LEFT JOIN measurement_live_cache mlc ON mlc.measurement_record_id = mr.id;

-- =========================
-- 11. Seed mínimo de migración
-- =========================
INSERT OR IGNORE INTO schema_migrations (id, version, applied_at, notes)
VALUES ('migration-supersurvey-v0-1-3-final', '0.1.3-FINAL', datetime('now'), 'SuperSurvey SQLite Schema v0.1.3-FINAL: data model freeze before Rust Calculation Kernel Sprint 1');

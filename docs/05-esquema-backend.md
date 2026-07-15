# SuperSurvey — Esquema del Backend (Modelo de Datos)

> **Modelo de datos.** Entidades, tablas y relaciones de la capa de persistencia (SQLite).
> Construye sobre el esquema actual (37 tablas) e integra la investigación de dominio
> (`docs/research/`). Alineado con `00-ULTRAPLAN §2–§3` y `03-TRD §6`.
> Versión: **v0.2** · 2026-07-15. Reverificado contra el esquema real
> (`rust-kernel/schema/supersurvey_sqlite_schema_v0_1_3_1_hardened.sql`): **37 tablas / 2 vistas
> / 24 índices / 2 triggers**, sin cambios en el conteo desde v0.1. Cambios de contenido: nota
> sobre qué operaciones nuevas SÍ/NO persisten aún (§4.1a), y qué configuración vive **fuera**
> de SQLite (licencia = archivo firmado, preferencia de IA = `localStorage`, §8).

---

## 1. Principios de datos (no negociables)

- **SQLite local**, sin ORM pesado. Migraciones versionadas. Validación de esquema en CI.
- **PKs = UUID** (almacenado como `TEXT`).
- **Decimales como `TEXT`** (consistencia con el kernel `rust_decimal` y la frontera IPC string-in/out).
  Nunca `REAL`/`f64` para cantidades.
- **`calculation_logs` append-only** (inmutable por triggers: sin UPDATE/DELETE).
- **La app NO almacena tablas de calibración.** Guarda `calibration_table_date` + referencia
  (decisión bloqueada). El surveyor ingresa el **volumen** obtenido de la tabla física.

---

## 2. Reconciliación con investigación y legacy

> **Corrección v0.2:** esta sección y la §4 originales (v0.1) describían un modelo
> **conceptual/simplificado** escrito el mismo día que se congeló el Decision Log, antes de
> implementar el esquema físico. El esquema que **realmente se construyó y está en producción**
> (`rust-kernel/schema/supersurvey_sqlite_schema_v0_1_3_1_hardened.sql`, congelado 2026-06 como
> "v0.1.3-FINAL + hardening") es **más normalizado y más completo** que ese boceto — no es una
> regresión, es una versión madurada que el documento nunca reflejó. Esta v0.2 documenta el
> esquema **real**, tabla por tabla, verificado línea por línea contra el `.sql` fuente.

| Fuente | Qué propone | Dónde vive realmente en el esquema físico |
|---|---|---|
| `research/tanques…` | Entidad `Tank` + tabla de calibración versionada, interpolable. | `tank_profiles` (perfil reusable) + `calibration_tables`/`calibration_points` (ejes interpolables 1D-4D, `LINEAR_1D`…`FOUR_WAY_TRIM`) + `tank_profile_calibration_refs` (relación N:N tanque↔tabla por rol: strapping/trim/list/hidrostática/FW). **Coincide con la decisión bloqueada**: la app guarda la tabla como referencia estructurada, pero el **volumen/lectura la sigue ingresando el surveyor** en `measurement_records`. |
| `research/key-meeting…` | Entidad `KeyMeeting` parametrizada + validaciones. | **No implementada como tabla propia.** `jobs.cover_data_json` es el único JSON libre de cobertura hoy; Key Meeting como entidad persistida sigue pendiente (gap real, no error del doc). |
| `research/logbook…` | ROB del logbook vs. sounding físico. | **No implementada como tabla propia** (`logbook_robs` no existe en el `.sql`). La comparación ROB-vs-declarado se resuelve hoy en `comparison_sets`/`comparison_results` (genérico, no específico de bunker) — gap real. |
| `01-analisis` (LEGACY.db, 156 tablas) | Modelo legacy muy completo. | El esquema real (37 tablas) es un **registry de estándares/algoritmos** (`standards_registry`, `calculation_algorithms`, `calculation_profiles`) + **motor de reportes con versionado** (`report_templates` → `report_template_versions` → `report_packages`/`report_sections`/`report_exports`) que el legacy no tenía así de estructurado — evolucionó más allá del mapeo 1:1 original (`§6`). |

---

## 3. Áreas del modelo (vista conceptual — nombres reales, verificados)

```
0. SISTEMA ──── schema_migrations · app_settings · inspectors

1. REGISTRY ─┬─ standards_registry ── calculation_algorithms
    (cálculo) ├─ precision_modes
             ├─ calculation_profiles (SHORE|SHIP|BARGE|LPG|DRAFT|FLOWMETER|GENERAL)
             └─ tolerance_profiles ── tolerance_rules

2. PERFILES ─┬─ asset_profiles (VESSEL|BARGE|TERMINAL|SHORE_TANK_GROUP|FLOWMETER_GROUP|LINE_SYSTEM)
   (activos)  ├─ tank_profiles
             └─ calibration_tables ── calibration_points
                        └─ tank_profile_calibration_refs (N:N tank↔tabla, por rol)

3. JOBS ─────┬─ jobs ── job_parties ── parties
             ├─ job_assets (snapshot de asset_profiles al crear el job)
             └─ job_products

4. MEDICIÓN ─┬─ measurement_sets (VMR|BMR|SHORE_TANK|LINE_PUSH|WATER_DRAW|INVENTORY|LPG_ARRIVAL)
             ├─ measurement_tank_rows
             ├─ measurement_records (OPENING|CLOSING|BEFORE|AFTER|ARRIVAL|…)
             ├─ measurement_live_cache (cache no-oficial, solo UI)
             └─ measurement_set_summaries (totales, para dashboards/reportes)

5. CÁLCULO ──┬─ calculation_logs  ◄── APPEND-ONLY (2 triggers: no DELETE, payload inmutable)
             └─ audit_log (CREATE|UPDATE|DELETE|VOID|LOCK|EXPORT|…)

6. COMPARAR ─┬─ comparison_sets ── comparison_results
             ├─ discrepancy_events (POTENTIAL_NOAD|POTENTIAL_LOP|…)
             └─ generated_documents (NOAD|LOP|SOF|QUANTITY_CERTIFICATE|…)

7. REPORTES ─┬─ report_templates ── report_template_versions
             ├─ report_packages ── report_sections
             ├─ report_exports (PDF|XLSX|HTML_PREVIEW|JSON_TECHNICAL|DOCX)
             └─ attachments

8. QA ───────── qa_test_cases
```

---

## 4. Entidades núcleo (campos clave, por área real)

> Tipos reales: `TEXT` (incl. UUID, decimales y JSON), `INTEGER` (booleanos 0/1),
> timestamps `TEXT` ISO-8601. La mayoría de columnas de estado usan `CHECK(... IN (...))`
> a nivel SQL, no solo convención de dominio. Detalle exhaustivo de cada columna: el `.sql`
> fuente es la fuente de verdad; aquí solo lo que un desarrollador necesita para orientarse.

### 4.0 Sistema — `schema_migrations`, `app_settings`, `inspectors`
```
app_settings: id PK, key UNIQUE, value_json TEXT   -- semilla white-label (key/value)
inspectors:   id PK, full_name, license_no, ifia_no, affiliate, signature_image_path,
              is_default BOOL, status(ACTIVE|RETIRED)
```

### 4.1 Registry de cálculo — `standards_registry` → `calculation_algorithms`
```
standards_registry:      id PK, standard_family(API|ASTM|ISO|EI|GPA|Internal|Terminal),
                          standard_code, version_label, status(ACTIVE|SUPERSEDED|DRAFT|RETIRED)
calculation_algorithms:  id PK, standard_id FK, algorithm_key, calculation_type
                          (UNIT_CONVERSION|TANK_QTY|VCF|WCF|INTERPOLATION|DRAFT|MOVEMENT),
                          implementation_kind(ALGORITHM|LOOKUP|HYBRID|MANUAL),
                          input_basis_json, output_basis_json, coefficient_set_json
precision_modes:         id PK, rounding_rule(HALF_UP|HALF_EVEN|TRUNCATE|CEILING|FLOOR|…),
                          vcf/density/volume/weight_decimals — la política de redondeo final
                          (TR-CALC-4) vive aquí, no hardcodeada en el kernel.
calculation_profiles:    id PK, profile_type(SHORE|SHIP|BARGE|LPG|DRAFT|FLOWMETER|GENERAL),
                          standard_id FK, algorithm_id FK, precision_mode_id FK, gravity_basis
                          (DENSITY_15C|API_60F|RD_60_60|SG_60_60), vcf_table_label
tolerance_profiles:      id PK, name, scope(COMPANY|CLIENT|OPERATION|GENERAL)
tolerance_rules:         id PK, tolerance_profile_id FK, comparison_type, unit,
                          threshold_basis(PERCENT|ABSOLUTE), warning/critical_threshold
```

### 4.2 Perfiles de activos — `asset_profiles` → `tank_profiles` → `calibration_tables`
```
asset_profiles:  id PK, asset_type(VESSEL|BARGE|TERMINAL|SHORE_TANK_GROUP|FLOWMETER_GROUP|
                  LINE_SYSTEM), name, official_id (IMO/registro), default_calculation_profile_id FK
tank_profiles:   id PK, asset_profile_id FK, tank_name, gauge_type(ULLAGE|INNAGE|SOUNDING),
                  trim/list_correction_supported BOOL
calibration_tables: id PK, table_type(TANK_STRAPPING|TRIM_CORRECTION|LIST_CORRECTION|
                    HYDROSTATIC|LPG_LOOKUP|OTHER_LOOKUP), interpolation_method
                    (LINEAR_1D|BILINEAR_2D|TRILINEAR_3D|FOUR_WAY_TRIM|CUSTOM), axis_count(1–4)
calibration_points: id PK, calibration_table_id FK, axis_x/y/z/w_num (bracketing rápido) +
                    axis_x/y/z/w_text (valor auditable original), result_value, result_unit
tank_profile_calibration_refs: relación N:N tank_profile↔calibration_table por role
                    (STRAPPING|TRIM_CORRECTION|LIST_CORRECTION|HYDROSTATIC|FW_TABLE|OTHER)
```
> **Nota de decisión bloqueada**: esto SÍ almacena tablas de calibración (a diferencia de lo
> que decía v0.1). La decisión "el surveyor ingresa el volumen, la app no calcula la tabla"
> se cumple igual: `calibration_points` son puntos de referencia auditables, no sustituyen la
> lectura que el surveyor hace en campo — `measurement_records.gauge_value` sigue siendo
> siempre la entrada real capturada.

### 4.3 Jobs (Cover) — `jobs` → `parties`/`job_parties`/`job_assets`/`job_products`
```
jobs:  id PK, job_ref, report_ref, client_ref,
       operation_family TEXT   -- BQS | TERMINAL | STS | LPG | DRAFT | INVENTORY | SAMPLING (TEXT libre, no CHECK)
       operation_type   TEXT   -- BUNKER_LOADING | DISCHARGE | LINE_PUSH | … (TEXT libre)
       report_status(DRAFT|PRELIMINARY|IN_REVIEW|FINAL|REVISED|VOID),
       surveyor_inspector_id FK -> inspectors,
       default_calculation_profile_id FK, default_tolerance_profile_id FK,
       cover_data_json TEXT    -- JSON libre de cobertura (Key Meeting NO tiene tabla propia hoy)
parties:      id PK, party_name, party_type(CLIENT|SUPPLIER|RECEIVER|TERMINAL|VESSEL|BARGE|AGENT|LAB|OTHER)
job_parties:  id PK, job_id FK, party_id FK, role, signatory_required BOOL, sequence_no
job_assets:   id PK, job_id FK, asset_profile_id FK, role(DELIVERY|RECEIVING|REFERENCE|
              DISPLACEMENT|INVENTORY), profile_snapshot_json  -- snapshot inmutable al crear el job
job_products: id PK, job_id FK, product_family, nominated_quantity_value/unit, density/api/sg_value
```
`operation_type`/`operation_family` son **`TEXT` libre**, sin `CHECK` en SQL — la validación de
valores vive en el dominio Rust/TypeScript. **Descarga de LNG (F8)** hoy NO pasa por `jobs`
(ver §4.4a).

#### 4.3a Operaciones nuevas (F5 ampliado / F8) — estado de persistencia real

Multigrado, Draft Survey, Ship↔Shore, LPG, Blend, ROB y **Descarga de LNG (F8)** son hoy
**páginas de cálculo en vivo** (kernel vía IPC, sin pasar por `jobs`): se acceden directo desde
"Operaciones específicas" en la sidebar, no desde el flujo Cover→…→Reporte. **Solo el flujo BQS
canónico** (`Medicion.tsx` → comando Tauri `save_measurement`) escribe hoy en `jobs` /
`measurement_sets` / `measurement_tank_rows` / `calculation_logs`. Integrar las operaciones
específicas al ciclo de vida del Job (persistencia real, historial, export firmado) es trabajo
pendiente, no un olvido de este documento — ver `04-appflow §5`.

### 4.4 Medición pareada — `measurement_sets` → `measurement_tank_rows` → `measurement_records`
```
measurement_sets:      id PK, job_id FK, module_type(VMR|BMR|SHORE_TANK|LINE_PUSH|WATER_DRAW|
                        INVENTORY|LPG_ARRIVAL), role(DELIVERY|RECEIVING|INVENTORY|REFERENCE|
                        DISPLACEMENT), movement_sign_rule(CLOSING_MINUS_OPENING|
                        OPENING_MINUS_CLOSING|CUSTOM), status(DRAFT|IN_PROGRESS|COMPLETE|LOCKED|VOID)
measurement_tank_rows: id PK, measurement_set_id FK, tank_profile_id FK, tank_name,
                        is_non_nominated BOOL, tank_profile_snapshot_json  -- snapshot al guardar
measurement_records:   id PK, tank_row_id FK, stage(OPENING|CLOSING|BEFORE|AFTER|ARRIVAL|
                        DEPARTURE|INITIAL|FINAL), gauge_value/unit/type, free_water_*,
                        temperature_upper/middle/lower/average_value, density_value/basis,
                        cached_outputs_json  -- cache efímero; la verdad oficial vive en calculation_logs
measurement_live_cache:    cache no-oficial por record (tov/gov/gsv/mt_air/mt_vac…), solo UI rápida
measurement_set_summaries: totales por set/producto/etapa, para dashboards y reportes
```

### 4.5 Cálculo — `calculation_logs` (APPEND-ONLY) + `audit_log`
```
calculation_logs: id PK, job_id FK, measurement_set_id FK, measurement_record_id FK,
                   calculation_scope(LIVE|SAVE|EXPORT|TRACE_VIEW|QA_TEST),
                   calculation_type, engine_version, registry_algorithm_id FK,
                   input_snapshot_json, method_snapshot_json, output_snapshot_json,
                   precision_snapshot_json, trace_json,   -- CHECK: LIVE puede omitir trace; el resto NO
                   previous_log_id FK (cadena de versiones), status(ACTIVE|SUPERSEDED|VOIDED),
                   result_hash
-- 2 triggers de inmutabilidad (verificados en el .sql):
--   trg_calculation_logs_no_delete          → aborta cualquier DELETE
--   trg_calculation_logs_payload_immutable  → aborta UPDATE que toque cualquier columna
--                                              de payload; SOLO permite transición de `status`
audit_log: id PK, job_id FK, entity_table, entity_id,
           action(CREATE|UPDATE|DELETE|VOID|LOCK|UNLOCK|EXPORT|IMPORT|OVERRIDE),
           old_value_json, new_value_json, reason, inspector_id FK
```

### 4.6 Comparación y discrepancias — `comparison_sets` → `discrepancy_events` → `generated_documents`
```
comparison_sets:    id PK, job_id FK, comparison_type(IN_TRANSIT|BOL_VS_OUTTURN|SHORE_VS_VESSEL|
                     BARGE_VS_VESSEL|FLOWMETER_VS_TANK|BDN_VS_VESSEL), tolerance_profile_id FK
comparison_results: id PK, comparison_set_id FK, base_value, compare_value, difference_value/
                     percent, status(NORMAL|WARNING|CRITICAL|VOID), applied_tolerance_rule_id FK
discrepancy_events: id PK, job_id FK, comparison_result_id FK, severity(INFO|WARNING|CRITICAL),
                     event_type(POTENTIAL_NOAD|POTENTIAL_LOP|TOLERANCE_EXCEEDED|MISSING_DATA)
generated_documents: id PK, job_id FK, document_type(NOAD|LOP|SOF|QUANTITY_CERTIFICATE|SUMMARY|
                     TIME_LOG|OTHER), source_discrepancy_event_id FK, body_rendered_text
```

### 4.7 Motor de reportes — `report_templates` → `…_versions` → `…_packages`/`…_sections`/`…_exports`
```
report_templates:         id PK, template_key UNIQUE(BQS_SUMMARY|VMR|BMR|NOAD|LOP|SOF|
                           LPG_CERTIFICATE…), report_family(BQS|TERMINAL|LPG|STS|DRAFT|COMMON)
report_template_versions: id PK, report_template_id FK, renderer_type(PDF_HTML|XLSX|DOCX|
                           JSON_TECHNICAL), formula_strategy(STATIC_VALUES|NATIVE_FORMULAS|HYBRID)
report_packages:  id PK, job_id FK, package_config_json
report_sections:  id PK, report_package_id FK, section_key, report_template_version_id FK,
                   include_in_pdf/xlsx BOOL, sequence_no
report_exports:   id PK, job_id FK, export_type(PDF|XLSX|HTML_PREVIEW|JSON_TECHNICAL|DOCX),
                   export_purpose(OFFICIAL|WORKING|PREVIEW|TECHNICAL), integrity_hash
                   -- CHECK: exportar XLSX como OFFICIAL exige formula_strategy=STATIC_VALUES
                   -- (nunca fórmulas nativas editables en un export oficial)
attachments:      id PK, job_id FK, file_hash, attachment_type(BOL|BDN|PHOTOS|LAB_CERT|TABLE|OTHER)
```

### 4.8 QA — `qa_test_cases`
```
id PK, name, test_type(UNIT_CONVERSION|TANK_QTY|VCF|INTERPOLATION|MOVEMENT|REPORT_EXPORT|
REGRESSION), registry_algorithm_id FK, input_json, expected_output_json, tolerance_json,
source_reference   -- soporte a TR-CI-1 (QA-case-driven): casos ancla también viven en SQLite,
                    -- no solo como tests de Rust
```

---

## 5. Relaciones (ER conceptual, real)

```
asset_profiles 1───* tank_profiles                calibration_tables 1───* calibration_points
       │                    │                              │
       │        tank_profile_calibration_refs (N:N, por role) ┘
       │
jobs *───1 asset_profiles (vía job_assets, snapshot)
 │  ├───* job_parties *───1 parties
 │  ├───* job_products
 │  ├───* measurement_sets ──┬─* measurement_tank_rows ─┬─* measurement_records ─── measurement_live_cache (1:1)
 │  │                        │                          └─(agregado)─ measurement_set_summaries
 │  │                        └────────────────────────────────* calculation_logs (APPEND-ONLY)
 │  ├───* comparison_sets ─* comparison_results ─* discrepancy_events ─* generated_documents
 │  ├───* report_packages ─* report_sections ──── report_template_versions ──1 report_templates
 │  ├───* report_exports
 │  ├───* attachments
 │  └───* audit_log
calculation_profiles/tolerance_profiles/precision_modes/standards_registry/calculation_algorithms
  → referenciados por jobs, measurement_sets, tank_profiles, comparison_sets (config reusable)
```

---

## 6. Mapeo legacy (LEGACY.db 156 tablas → SuperSurvey, nombres reales)

| Área legacy (`01-analisis §7`) | SuperSurvey (esquema real) |
|---|---|
| `Jobs`, `JobCustomers`, `ConfigParameters`, `Grades` | `jobs`, `parties`/`job_parties`, `calculation_profiles`, `job_products` |
| `Vessels`, `VesselTanks`, `VesselCargoTankData*` | `asset_profiles`, `tank_profiles`, `measurement_tank_rows` |
| `ShoreMeasurement*`, `ShoreQuantity*`, `ShorePipeline*` | `measurement_sets(module_type=SHORE_TANK/LINE_PUSH)`, `comparison_sets` |
| `BargeData`, `BargeTankData`, `BargeMeasurements` | `measurement_sets`/`measurement_tank_rows` con `job_assets.role` de barcaza |
| `OBQ*`, `ROB*`, `WedgeCalculator*` | `measurement_records(stage=INITIAL/FINAL)` + `calculation_logs` (wedge: sin tabla propia aún) |
| `VEF*`, `VoyageAnalysis` | Sin tabla propia — hoy vive en UI (`VefPanel.tsx`) sin persistencia dedicada (gap real) |
| `BunkerSurvey*` | `jobs(operation_family=BQS)` + `measurement_sets(module_type=BMR)` |
| `SampleReport*`, `QualityReport*`, `Checklist*` | Sin tabla propia — `SamplingPanel.tsx` sin persistencia dedicada (gap real, post-MVP) |
| `NoticeOfApparentDiscrepancy*`, `LetterOfProtest` | `discrepancy_events` + `generated_documents(document_type=NOAD/LOP)` |
| `QuantityCertificate*`, `Summary*`, `FinalReport*` | `report_templates`/`report_packages`/`report_exports` |
| `ConvertionMethods`, `Table56Type`, `Version` | `standards_registry` + `calculation_algorithms` + `calculation_logs.engine_version` |
| `Setting`, `Signatory` | `app_settings`, `inspectors`/`job_parties.signatory_required` |

> El legacy tenía **156 tablas**; el esquema real tiene **37 tablas / 2 vistas / 24 índices /
> 2 triggers** (recontado 2026-07-15, sin cambios desde v0.1.3-FINAL). Gaps reales frente al
> legacy: **Key Meeting**, **VEF** y **Sampling/Quality** no tienen tabla propia todavía — hoy
> son solo UI (`VefPanel.tsx`, `SamplingPanel.tsx`) sin persistencia. No es un defecto de este
> documento: es el estado real del producto, ahora correctamente reflejado.

---

## 7. Notas de implementación

- **Triggers de inmutabilidad** verificados en `calculation_logs`: `trg_calculation_logs_no_delete`
  (bloquea DELETE) + `trg_calculation_logs_payload_immutable` (bloquea UPDATE de payload; solo
  permite mover `status` entre ACTIVE/SUPERSEDED/VOIDED).
- **Vistas de desarrollo/debug** (2, confirmadas): `v_active_calculation_logs` (logs con
  `status='ACTIVE'`) y `v_measurement_records_with_live_cache` (join con el cache no-oficial).
- **Índices** (24 confirmados): por `job_id`, `(job_id, status)`, `(measurement_set_id, stage)`,
  `(tank_profile_id, role)`, etc. — ver `.sql §9` para la lista completa.
- **Migraciones**: tabla `schema_migrations` con seed inicial `0.1.3-FINAL`; una sola fuente de
  versión de schema (distinta de la versión de la app — `00-ULTRAPLAN §9`).
- **Cifrado en reposo** (SQLCipher): **sigue sin implementar** (`03-TRD §10`/§13) — riesgo
  aceptado por ahora al no haber datos reales de cliente en el repo.
- **Licencia** (`license.key`) y **preferencia de IA** (`ss-ai`) **NO viven en SQLite** — ver §8.
- `report_exports` tiene una restricción `CHECK` real que impide exportar un XLSX **oficial**
  con fórmulas nativas editables (`export_purpose='OFFICIAL'` fuerza `formula_strategy=
  'STATIC_VALUES'`) — refuerza TR-RPT a nivel de base de datos, no solo de convención.

---

## 8. Configuración que vive FUERA de SQLite

No toda la configuración de la app pasa por este esquema — dos piezas nuevas (F6/F9) son
deliberadamente externas:

| Config | Dónde vive | Por qué no está en SQLite |
|---|---|---|
| **Licencia** (`license.key`) | Archivo JSON firmado (Ed25519) en el directorio de configuración de la app, junto a `brand.json` | Debe poder leerse/verificarse **antes** de abrir la base de datos de un trabajo; es infraestructura de la instalación, no dato de negocio. Detalle: `03-TRD §10a`, `docs/licencias.md`. |
| **Preferencia de IA** (`ss-ai: on\|off\|null`) | `localStorage` del navegador embebido (Tauri WebView), **por equipo** | Es una decisión de la máquina/instalación (¿cuánta RAM tiene *este* equipo?), no un dato del trabajo — no tendría sentido sincronizarla entre trabajos ni exportarla. Detalle: `03-TRD §14`. |
| **Idioma** (`ss-lang: es\|en`) | `localStorage`, por equipo | Mismo razonamiento — preferencia de la instalación, no del dominio. |
| **Tema/fuente/densidad** (`ss-theme`, `ss-mode`, …) | `localStorage`, por equipo | Idem. |

# SuperSurvey — Esquema del Backend (Modelo de Datos)

> **Modelo de datos.** Entidades, tablas y relaciones de la capa de persistencia (SQLite).
> Construye sobre el esquema actual (37 tablas) e integra la investigación de dominio
> (`docs/research/`). Alineado con `00-ULTRAPLAN §2–§3` y `03-TRD §6`.
> Versión: **v0.1** · 2026-06-09.

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

| Fuente | Qué propone | Decisión en SuperSurvey |
|---|---|---|
| `research/tanques…` | Entidad `Tank` **+ `CalibrationTable` versionada** con entries interpolables. | Se adopta `Tank` (polimórfica con `is_bunker` y tipo), **pero NO** se almacena la tabla de calibración. Solo `calibration_table_date` + `calibration_ref`. El **volumen es ingresado**. |
| `research/key-meeting…` | Entidad `KeyMeeting` parametrizada por tipo de operación + reglas de validación. | Se adopta como `key_meetings` (+ secciones), MVP ligero, post-MVP completa. |
| `research/logbook…` | Captura de ROB del logbook y comparación con sounding físico. | Se adopta como `logbook_robs` + comparación en `tank_readings`. |
| `01-analisis` (SAT.db, 156 tablas) | Modelo legacy muy completo (Job/Vessel/Shore/Barge/OBQ/ROB/VEF/Sample/Reports…). | Se **simplifica** a las áreas necesarias por fase; nombres en `snake_case`. |

---

## 3. Áreas del modelo (vista conceptual)

```
JOB/CONFIG ──┬─ jobs ── job_customers / parties
             ├─ profiles (vessel·barge·terminal·calculation·tolerance)
             └─ products / grades

VESSEL/TANKS ─ vessels ── tanks (is_bunker, tipo, calibration_ref) 

OPERATION ───┬─ key_meetings (+ secciones)
             ├─ tank_readings (opening/closing · paired)
             ├─ logbook_robs (comparación bunker)
             └─ samples / quality            [post-MVP]

CALC ────────┬─ calculations (resultado por tanque/fuente)
             ├─ calculation_traces (pasos)
             └─ calculation_logs (APPEND-ONLY)

COMPARE ─────┬─ comparisons (Vessel vs Barge vs Shore vs BDN/BL)
             ├─ tolerance_layers
             └─ discrepancies (NOAD / LOP)

OUTPUT ──────┬─ reports / generated_reports
             ├─ inspectors / signatories
             └─ app_settings (white-label key/value)
```

---

## 4. Entidades núcleo (campos clave)

> `(M)`=MVP · `(P)`=post-MVP. Tipos: `TEXT` (incl. UUID y decimales), `INTEGER`, `BOOLEAN`(0/1),
> `DATETIME` (ISO-8601). FK por UUID.

### 4.1 `jobs` (Cover) — (M)
```
id                TEXT PK (UUID)
job_no            TEXT            -- referencia legible
operation_type    TEXT            -- BQS | TERMINAL_LOAD | TERMINAL_DISCHARGE | STS_* | BARGE_* | DRAFT | PIPELINE | SAMPLING
customer_id       TEXT FK -> job_customers
port              TEXT
date_nor          DATETIME        -- Notice of Readiness / inicio
status            TEXT            -- DRAFT | IN_PROGRESS | CALCULATED | REPORTED | SIGNED | CLOSED
vessel_id         TEXT FK -> vessels (NULL en algunos casos)
calc_profile_id   TEXT FK -> profiles
tolerance_profile_id TEXT FK -> profiles
brand_snapshot    TEXT            -- marca aplicada (white-label) al momento del reporte
created_at, updated_at  DATETIME
```

### 4.2 `job_customers` / `parties` — (M)
```
job_customers: id PK, name, address, contact, role(CLIENT|OWNER|CHARTERER|TERMINAL|SUPPLIER)
parties:       id PK, job_id FK, name, role, signs_documents BOOLEAN
```

### 4.3 `products` / `grades` — (M)
```
id PK, code, name, kind(CRUDE|PRODUCT|CHEMICAL|LPG|LNG|BUNKER), 
default_density_15c TEXT, astm_group(A|B|C|D|E), notes
```

### 4.4 `profiles` — (M)
```
id PK
kind        TEXT  -- VESSEL | BARGE | TERMINAL | CALCULATION | TOLERANCE
name        TEXT
payload     TEXT  -- JSON con la configuración según kind:
  - CALCULATION: { standard, astm_table, table_version, aggregate_from_unrounded, density_basis }
  - TOLERANCE:   { layers: [ {name, basis(ISO|BUYER|SUPPLIER|INSPECTION|CONTRACT), pct} ] }
  - VESSEL/BARGE/TERMINAL: { ref a vessels/tanks, defaults }
reusable    BOOLEAN
```

### 4.5 `vessels` — (M)
```
id PK, name(*), imo, flag, type(TANKER_CRUDE|PRODUCT|CHEMICAL|LPG|LNG|BARGE|OTHER),
lbp TEXT, notes
(*) en producción real; en el repo NUNCA datos reales de buques.
```

### 4.6 `tanks` — (M)  *(polimórfica; reconciliada con la investigación)*
```
id PK
vessel_id        TEXT FK -> vessels
tank_name        TEXT            -- "No.3 COT", "HFO DB S"
tank_code        TEXT
category         TEXT            -- CARGO | BUNKER_FUEL | LUBE_OIL | BALLAST | SLOP | OTHER
is_bunker        BOOLEAN         -- CRÍTICO: bunker nunca entra en B/L
subcategory      TEXT            -- STORAGE|SETTLING|SERVICE (bunker) ; CENTRE|WING|DECK|SLOP (cargo)
igc_tank_type    TEXT            -- TYPE_A|TYPE_B|TYPE_C|MEMBRANE|MOSS|NA (gaseros)
measurement_method TEXT          -- SOUNDING | ULLAGE | CTMS
capacity_m3      TEXT
-- Calibración: la app NO guarda la tabla, solo trazabilidad:
calibration_ref       TEXT       -- identificador de la tabla física usada
calibration_table_date DATE      -- fecha de calibración (va al reporte)
```

### 4.7 `key_meetings` — (P; base ligera en M)
```
id PK, job_id FK, operation_type, datetime_conference, status(DRAFT|SIGNED|...),
sections TEXT  -- JSON parametrizado por tipo (ver research/key-meeting §5):
  pumping_rates{initial,max,topping,...}, nominated_tanks[], cargo[], obq_rob,
  line_and_manifold{maxManifoldPressure, hoseSize, lineVolume,...},
  esd_communications{vhfPrimary, vhfBackup, esdTested,...},
  certificates[]{type, issuer, issueDate, expiryDate, valid},
  vef{declared, qualifyingVoyages, applicable}, sts_params{...},
attendees TEXT (JSON), document_retention_date DATE
```
> Reglas de validación (en dominio Rust, no en SQL): `topping<max`, certificados vigentes,
> ESD probado antes de `OPERATIONS_COMMENCED`, ≥2 firmas. Ver `04-appflow §6`.

### 4.8 `tank_readings` — (M)  *(captura pareada opening/closing)*
```
id PK
job_id           TEXT FK
tank_id          TEXT FK
phase            TEXT     -- OPENING | CLOSING | INTERMEDIATE
source           TEXT     -- VESSEL | BARGE | SHORE
observed_level   TEXT     -- sounding/ullage (decimal-as-text)
temperature_c    TEXT
density_observed TEXT
free_water       TEXT
volume_from_table TEXT    -- INGRESADO por el surveyor (la app no calcula la tabla)
trim             TEXT
list_deg         TEXT
trim_applied     BOOLEAN  -- verificación del inspector (barcazas normalmente Not Applied)
pressure_barg    TEXT     -- gaseros
vapor_temp_c     TEXT     -- gaseros
timestamp_tz     DATETIME -- con zona horaria (ver logbook: hora buque vs UTC)
created_at       DATETIME
```

### 4.9 `logbook_robs` — (M, para BQS)
```
id PK, job_id FK, tank_id FK, grade(HFO|VLSFO|MGO|MDO|...),
rob_logbook TEXT,      -- ROB declarado por el Jefe de Máquinas (del ER Log)
rob_sounding TEXT,     -- ROB físico calculado (cross-ref a calculations)
delta TEXT, within_tolerance BOOLEAN, note TEXT
```

### 4.10 `calculations` — (M)  *(resultado, no oficial hasta hardening WCF→MT)*
```
id PK, job_id FK, tank_id FK (NULL para totales), source TEXT,
tov TEXT, fw TEXT, gov TEXT, vcf TEXT, gsv TEXT, density_15c TEXT, wcf TEXT,
mt_air TEXT, mt_vac TEXT,
engine_version TEXT, astm_table TEXT, table_version TEXT,
is_official BOOLEAN,   -- false mientras WCF→MT sea placeholder (00-ULTRAPLAN §9)
created_at DATETIME
```

### 4.11 `calculation_traces` — (M)
```
id PK, calculation_id FK, step_no INTEGER, step_name TEXT,
input TEXT, table_ref TEXT, factor TEXT, output TEXT
```

### 4.12 `calculation_logs` — (M)  **APPEND-ONLY (triggers)**
```
id PK, job_id, calculation_id, event TEXT, payload TEXT (JSON), engine_version, created_at
-- Triggers impiden UPDATE y DELETE. Fuente de verdad de auditoría.
```

### 4.13 `comparisons` / `tolerance_layers` — (M)
```
comparisons: id PK, job_id FK, source_a, source_b, qty_a TEXT, qty_b TEXT, delta TEXT,
             delta_pct TEXT, within_tolerance BOOLEAN
tolerance_layers: id PK, job_id FK (o profile), name, basis(ISO|BUYER|SUPPLIER|INSPECTION|CONTRACT), pct TEXT
```

### 4.14 `discrepancies` — (M: detección; P: documento)
```
id PK, job_id FK, type(NOAD|LOP), reason TEXT, related_comparison_id FK,
amount TEXT, status, created_at
```

### 4.15 `samples` / `quality` — (P)
```
samples:   id PK, job_id FK, tank_id FK, type, seal_no, location(MANIFOLD|TANK|FIRST_FOOT), receipt_ref
quality:   id PK, job_id FK, previous_cargoes TEXT, tank_inspection TEXT, checklist TEXT
```

### 4.16 `reports` / `generated_reports` — (M)
```
reports:           id PK, job_id FK, type(VMR|BMR|SHORE|SUMMARY|SOF|NOAD|LOP|QTY_CERT|BL|OBQ_ROB|VEF|TIME_LOG)
generated_reports: id PK, report_id FK, format(PDF|XLSX|JSON), path, brand_snapshot, signed BOOLEAN, created_at
```

### 4.17 `inspectors` / `signatories` — (M)
```
inspectors:  id PK, name, license_no, signature_image_path   -- semilla white-label
signatories: id PK, job_id FK, name, role, party_id FK, signed_at
```

### 4.18 `app_settings` — (M)  *(semilla white-label)*
```
key TEXT PK, value TEXT   -- nombre de producto, empresa, colores, pie de reporte, etc.
```

---

## 5. Relaciones (ER conceptual)

```
job_customers 1───* jobs *───1 vessels 1───* tanks
                     │  │
        profiles *───┘  ├───* key_meetings
                        ├───* tank_readings *───1 tanks
                        ├───* logbook_robs  *───1 tanks
                        ├───* calculations 1───* calculation_traces
                        │            └────────* calculation_logs (append-only)
                        ├───* comparisons *───* tolerance_layers
                        ├───* discrepancies
                        ├───* samples / quality
                        └───* reports 1───* generated_reports
                        signatories *───1 jobs ; inspectors 1───* signatories
```

---

## 6. Mapeo legacy (SAT.db 156 tablas → SuperSurvey)

| Área legacy (`01-analisis §7`) | SuperSurvey |
|---|---|
| `Jobs`, `JobCustomers`, `ConfigParameters`, `Grades` | `jobs`, `job_customers`, `profiles`, `products` |
| `Vessels`, `VesselTanks`, `VesselCargoTankData*` | `vessels`, `tanks`, `tank_readings` |
| `ShoreMeasurement*`, `ShoreQuantity*`, `ShorePipeline*` | `tank_readings (source=SHORE)`, `comparisons` (post-MVP completo) |
| `BargeData`, `BargeTankData`, `BargeMeasurements` | `tank_readings (source=BARGE)` |
| `OBQ*`, `ROB*`, `WedgeCalculator*` | `logbook_robs`, `calculations` (+ wedge post-MVP) |
| `VEF*`, `VoyageAnalysis` | `key_meetings.sections.vef` + `calculations` (post-MVP) |
| `BunkerSurvey*` | `jobs(operation_type=BQS)` + `logbook_robs` + `calculations` |
| `SampleReport*`, `QualityReport*`, `Checklist*` | `samples`, `quality` (post-MVP) |
| `NoticeOfApparentDiscrepancy*`, `LetterOfProtest` | `discrepancies` |
| `QuantityCertificate*`, `Summary*`, `FinalReport*` | `reports`, `generated_reports` |
| `ConvertionMethods`, `Table56Type`, `Version` | `profiles(CALCULATION).payload` + `calculations.engine_version` |
| `Setting`, `Signatory` | `app_settings`, `inspectors`/`signatories` |

> El legacy tenía **156 tablas**; SuperSurvey arranca con ~37 endurecidas y crece por fase. La
> reducción es deliberada (evitar el cruft del legacy, `01-analisis §10`).

---

## 7. Notas de implementación

- **Triggers de inmutabilidad** en `calculation_logs` (y posiblemente en `calculations` firmadas).
- **Índices** por `job_id`, `tank_id`, `(job_id, phase, source)` para la vista pareada.
- **Migraciones** versionadas; una sola fuente de versión de schema (`00-ULTRAPLAN §9`).
- **Cifrado en reposo** (SQLCipher) para datos de cliente (`03-TRD §10`).
- **Sin datos reales** de buque/cliente en seeds del repo (confidencialidad).
- El campo `calculations.is_official=false` mientras el WCF→MT siga siendo placeholder
  (no se exporta como oficial hasta cerrar el hardening).

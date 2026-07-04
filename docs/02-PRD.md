# SuperSurvey — PRD (Product Requirements Document)

> **Documento de producto.** Define *qué* construimos y *para quién*. El *cómo* técnico está en
> `03-TRD.md`; los flujos en `04-appflow.md`; los datos en `05-esquema-backend.md`; el plan por
> fases en `00-ULTRAPLAN.md`. Alineado con el Decision Log (`00-ULTRAPLAN.md §2`).
> Versión: **v0.1** · 2026-06-09 · Codename interno: `SuperSurvey` (nombre real = white-label).

---

## 1. Visión

**SuperSurvey convierte la medición física del surveyor en cantidad calculada, comparación
defendible y documento firmable — todo offline.**

No reemplaza al surveyor: él sigue midiendo tanques, tomando muestras, verificando líneas y
validando densidades/temperaturas. SuperSurvey hace la parte donde hoy se pierde tiempo y se
cometen errores con Excel / LEGACY / el sistema legacy:

1. **Recibe** datos de campo + externos (BDN, B/L, terminal, logbook).
2. **Calcula** exacto y con trazabilidad (se ve cómo salió cada número).
3. **Compara** fuentes (barge ↔ vessel ↔ shore ↔ BDN/BL).
4. **Detecta** discrepancias y avisa.
5. **Genera** reportes firmables (VMR, BMR, Shore, Summary, SOF, NOAD, LOP) en PDF/XLSX.

Y debe poder **revenderse con otra marca** (white-label) desde el día 1.

---

## 2. Problema

El surveyor de cantidad hoy trabaja con dos malas opciones:

| Herramienta | Dolor |
|---|---|
| **Excel artesanal** | Frágil, sin trazabilidad, errores de fórmula/redondeo, no estandarizado, no firmable de forma defendible. |
| **LEGACY / el sistema legacy** (legacy, ver `01-analisis`) | UI anticuada (~133 pantallas), flujos rígidos, entrada manual intensiva sin validación en vivo, motor de cálculo en DLL nativa **caja negra** (no auditable, atada a Windows x86), curva de aprendizaje alta. |

**Consecuencia:** tiempo perdido, errores, discrepancias mal documentadas y reportes que no
siempre resisten una disputa comercial (NOAD/LOP, P&I, custody transfer).

---

## 3. Usuarios objetivo

| Persona | Descripción | Necesidad principal |
|---|---|---|
| **Surveyor de campo** (primario) | Mide a bordo/tierra/barcaza; ingresa ullages/sondas, T, densidad. | Entrada rápida con validación en vivo; cálculo confiable offline; reporte firmable. |
| **Líder de operaciones / QA** | Revisa, valida y firma; gestiona casos QA. | Trazabilidad total, comparación defendible, detección de discrepancias. |
| **Cliente white-label** (revendedor) | Empresa que despliega el producto con su propia marca. | Rebranding completo (hasta los reportes) sin tocar código. |
| **Partes firmantes** (buque, terminal, cliente) | Reciben y firman los documentos. | Reportes claros, estándar, en su idioma (ES/EN), defendibles. |

---

## 4. Objetivos y métricas de éxito

| # | Objetivo | Métrica |
|---|---|---|
| O1 | **Exactitud normativa** | El cálculo reproduce el número de un reporte real conocido dentro de tolerancia (caso QA ancla). 0 discrepancias inexplicables. |
| O2 | **Trazabilidad** | El 100% de las cantidades se explican paso a paso (trace con UUID + versión del motor). |
| O3 | **Velocidad de campo** | Reducir el tiempo de captura+cálculo+reporte de una operación vs. Excel/LEGACY (objetivo: ≥40% menos). |
| O4 | **Reportes firmables** | Generar VMR/BMR/Shore/Summary/SOF/NOAD/LOP en PDF/XLSX con calidad de impresión. |
| O5 | **Offline real** | Toda la operación (captura→cálculo→reporte) funciona sin red. |
| O6 | **White-label** | Cambiar marca (nombre, logo, colores, pie de reporte) sin recompilar el motor. |
| O7 | **Defendibilidad** | El reporte muestra fuentes, correcciones, tolerancias y discrepancias de forma auditable. |

---

## 5. Alcance (Scope)

### 5.1 Lo que SÍ hace

- **Configuración de trabajo** (Cover/Job): quién, qué, dónde, partes, fechas, tipo de operación.
- **Perfiles reutilizables**: vessel · barge · terminal · cálculo · tolerancia.
- **Key Meeting** (reunión pre-operación) como checklist digital parametrizado por tipo de
  operación (ver `research/key-meeting-pre-transfer.md`).
- **Captura de mediciones pareada** (opening/closing, before/after) en vista horizontal por tanque.
- **Comparación con logbook/ROB** al inicio (medición física vs. cifras declaradas; ver
  `research/logbook-maquinas-surveyor.md`).
- **Motor de cálculo** (volumen→VCF→GSV→densidad/WCF→MT aire y vacío; Draft Survey por
  hidrostáticas) con decimal exacto, sin redondeo intermedio y con trace.
- **Comparación entre fuentes** (Vessel vs Barge vs Shore vs BDN/BL) con tolerancia en capas.
- **Detección de discrepancias** → NOAD / LOP.
- **Reportes y export** (PDF/XLSX/JSON) con branding/tema.
- **Bilingüe ES/EN** (incl. reportes bilingües).

### 5.2 Lo que NO hace (no-goals)

- **No reemplaza al surveyor** (no mide por él; no inventa datos de campo).
- **No gestiona tablas de calibración** de buque/tierra: son externas. El surveyor obtiene el
  volumen de la tabla física y **lo ingresa**; la app solo **registra la fecha/referencia** de la
  tabla usada (trazabilidad). *(Decisión bloqueada — `00-ULTRAPLAN §2`.)*
- **No es cloud/multiusuario en el MVP** (offline-first; sincronización es futuro, fuera de alcance).
- **No hace contabilidad/facturación** ni gestión de flota.
- **No reusa `calcnative.dll`** (caja negra). El motor se reimplementa en Rust desde la norma.

---

## 6. Operaciones soportadas (por fase)

El legacy soporta 17 `OperationType` (ver `01-analisis §4`). SuperSurvey las prioriza así:

| Operación | Fase | Notas |
|---|---|---|
| **BQS — Bunker Quantity Survey** (ROB) | **MVP (F1–F4)** | Caso ancla. Valida kernel + comparison + reporte + white-label de punta a punta. |
| Terminal (Loading / Discharge) | F5 | Reusa el patrón canónico + Shore + Pipeline reconciliation. |
| STS (Ship-to-Ship) | F5 | Mother/Shuttle; Key Meeting STS (fenders, francobordo, clima). |
| Barge-Tow (Loading/Discharge) | F5 | Barcaza ↔ terminal / buque. |
| LPG / Gaseros | F5 | Bifásico (líquido + vapor), presión+temperatura, CTMS (ver `research/tanques…`). |
| **Draft Survey** | F5 | Excepción: cálculo por desplazamiento/hidrostáticas (fórmulas ya validadas en `/reference`). |
| Pipeline Transfer | F5+ | Line displacement / reconciliation. |
| Sampling / Quality | F5+ | Muestreo, previous cargoes, tank inspection, checklist. |
| Rail-Road | Futuro | Baja prioridad. |

---

## 7. Requisitos funcionales (por épica)

> Notación `FR-<épica>-<n>`. Prioridad: **M**=MVP, **P**=Post-MVP.

### 7.1 Job / Cover (FR-JOB)
- **FR-JOB-1 (M):** Crear/editar trabajo con cliente, tipo de operación, producto(s)/grados, partes, fechas, puerto.
- **FR-JOB-2 (M):** Estado del trabajo (Draft → In progress → Calculated → Reported → Signed/Closed).
- **FR-JOB-3 (P):** Duplicar trabajo / plantillas de trabajo.

### 7.2 Perfiles (FR-PRF)
- **FR-PRF-1 (M):** Perfiles reutilizables de **vessel**, **barge**, **terminal**, **cálculo** (norma/estándar) y **tolerancia**.
- **FR-PRF-2 (M):** Perfil de tanques del buque/barcaza con flag `is_bunker` (bunker ≠ carga).
- **FR-PRF-3 (M):** Registrar **fecha/referencia de la tabla de calibración** usada (no la tabla en sí).

### 7.3 Key Meeting (FR-KM)
- **FR-KM-1 (P, base en M):** Checklist de Key Meeting parametrizado por tipo de operación (Ship-Terminal / STS / Barge-Terminal): ratas (initial/max/topping), tanques nominados, grados, OBQ/ROB, line displacement, MAWP/presión, hose sizes, VHF, ESD, certificados, VEF.
- **FR-KM-2 (P):** Reglas de validación (p. ej. `topping < max`, certificados vigentes, ESD probado antes de operar).
- **FR-KM-3 (P):** Firma digital del registro de Key Meeting.

### 7.4 Mediciones (FR-MEA)
- **FR-MEA-1 (M):** Entrada **pareada/horizontal por tanque** (opening/closing, before/after).
- **FR-MEA-2 (M):** Captura de ullage/sondaje, temperatura, densidad observada, agua libre.
- **FR-MEA-3 (M):** Validación en vivo (rangos, faltantes, unidades).
- **FR-MEA-4 (M):** **Comparación con logbook** (ROB declarado vs. sounding físico) con tolerancia y alerta.

### 7.5 Cálculo (FR-CALC)
- **FR-CALC-1 (M):** Cadena canónica: medición → TOV → (−FW) → GOV → ×VCF → GSV → ×densidad/WCF → **MT aire y vacío**.
- **FR-CALC-2 (M):** **Todas las versiones** de tablas ASTM/API (vieja/nueva); el surveyor elige la aplicable.
- **FR-CALC-3 (M):** **Sin redondeo intermedio**; redondear solo el resultado final. Política de agregación configurable.
- **FR-CALC-4 (M):** **Trace** completo por cantidad (cada paso, con versión del motor).
- **FR-CALC-5 (P):** Draft Survey por hidrostáticas; OBQ/ROB/Wedge; VEF/Voyage analysis.

### 7.6 Comparación y discrepancias (FR-CMP)
- **FR-CMP-1 (M):** Suma por fuente y comparación Vessel vs Barge vs Shore vs BDN/BL.
- **FR-CMP-2 (M):** **Tolerancia en capas** configurable (ISO default + comprador/suplidor/inspección/contrato).
- **FR-CMP-3 (M):** Generar **NOAD** y **LOP** cuando se excede tolerancia.

### 7.7 Reportes y export (FR-RPT)
- **FR-RPT-1 (M):** VMR, BMR, Shore, Summary, SOF; (P): NOAD, LOP, Quantity Certificate, B/L, OBQ/ROB, VEF, Time Log.
- **FR-RPT-2 (M):** Export **PDF** y **XLSX** con calidad de impresión; **JSON técnico** (trace).
- **FR-RPT-3 (M):** Branding/tema aplicado **hasta el reporte** (encabezado, pie, logo, metadatos PDF).

### 7.8 White-label e i18n (FR-WL)
- **FR-WL-1 (M):** Marca configurable vía `branding/brand.toml` (nombre, logo, colores, contacto, pie de reporte). Nada hardcodea "SuperSurvey".
- **FR-WL-2 (P):** Sistema de **temas** separado de la marca.
- **FR-WL-3 (M):** Bilingüe **ES/EN** en UI; (P) reportes bilingües.

### 7.9 Auditoría (FR-AUD)
- **FR-AUD-1 (M):** `calculation_logs` **append-only** (inmutable por triggers).
- **FR-AUD-2 (M):** Cada cantidad oficial enlaza a su trace y a las entradas/perfiles usados.

---

## 8. Requisitos no funcionales (resumen; detalle en TRD)

- **Offline-first** total; sin dependencia de red para operar.
- **Decimal exacto** (`rust_decimal`) en todo el cálculo; nunca `f64`.
- **Trazabilidad/auditabilidad** completa.
- **Seguridad incremental** (no al final): `cargo audit`, allowlist/CSP de Tauri, cifrado en
  reposo para datos de cliente, secret-scanning, sin PII en logs. Revisión a fondo en hitos.
- **Multiplataforma** (objetivo Tauri); **rendimiento** fluido en captura por tanque.
- **Bilingüe ES/EN**.

---

## 9. Suposiciones y dependencias

- La doctrina de dominio se apoya en `docs/research/` (logbook, tanques, key meeting) — *borradores
  verificados con fuentes, pendientes de validación del surveyor*.
- El **caso QA ancla de BQS** (Excel real + PDF firmado) es necesario para validar el kernel.
- El desarrollador no compila localmente (bloqueos de admin) → validación por **GitHub Actions**.

---

## 10. Riesgos (ver estrategia en `00-ULTRAPLAN §8`)

1. **Exactitud del motor** → mitigado con QA-case-driven (número real antes de UI).
2. **Sobre-ingeniería de flujos** (error del legacy) → mitigado con doctrina operativa antes que UI.
3. **Pérdida de hilo entre sesiones** → mitigado con `docs/` persistentes y `CONTEXT.md`.
4. **Confidencialidad** → sin datos reales de cliente en el repo; cifrado en reposo en la app.

---

## 11. Roadmap

Resumen en `00-ULTRAPLAN §6` (F0 organización → F1 doctrina+kernel BQS → F2 persistencia+IPC →
F3 UI BQS → F4 reportes+white-label → F5 resto de operaciones → F6 QA+empaque). El **MVP usable**
(BQS de punta a punta, F1–F4) es el foco.

# SuperSurvey — Contexto y Estado (Handoff)

> **Léeme PRIMERO** si retomas el proyecto (humano o IA). Es el resumen vivo para no perder
> el hilo entre sesiones. Mantener actualizado al final de cada sesión.
> Actualizado: **2026-06-10**.

---

## Qué es

App **offline-first** para cálculo, medición, comparación y reportes de *survey*
marítimo/petrolero. Convierte la medición física del surveyor en **cantidad calculada,
comparación defendible y documento firmable**. Alternativa moderna a SAT/OGC. Debe ser
**white-label** (revendible con otra marca). Ver `docs/00-ULTRAPLAN.md`.

## Stack y repo

- **Rust** (kernel de cálculo) + **Tauri** + **TypeScript** (UI) + **SQLite** (persistencia).
- Repo canónico único: **`super-survey`** (el trabajo previo en `Codex-Playroom` ya está
  consolidado aquí; ese repo queda obsoleto).
- Rama de trabajo actual: `claude/laughing-knuth-DLfRf`.

## Mapa del repo (hoy)

```
rust-kernel/supersurvey_calc/   kernel Rust (cálculo decimal + tests)   ← compila verde
rust-kernel/schema/             esquema SQLite endurecido (37 tablas)
rust-kernel/supersurvey_persistence/ repos SQLite (rusqlite) + puente kernel→log inmutable
rust-kernel/supersurvey_wasm/   bindings WASM del kernel (mismo cálculo en el navegador)
scripts/build-wasm.sh           regenera el WASM + glue JS (output commit en ui/src/wasm)
.github/workflows/              CI: kernel + persistencia + wasm + schema + shell Tauri
docs/README.md                  índice de documentación (orden de lectura)
docs/00-ULTRAPLAN.md            plan maestro = plan de implementación (LEER)
docs/CONTEXT.md                 este archivo (handoff)
docs/01-analisis-OGC-InfoPro.md análisis del sistema viejo (OGC/InfoPro)
docs/02-PRD.md                  PRD (requisitos de producto)
docs/03-TRD.md                  TRD (requisitos técnicos)
docs/04-appflow.md              App Flow (flujos punta a punta)
docs/05-esquema-backend.md      Esquema del backend (modelo de datos SQLite)
docs/SUPERSURVEY_COMPILACION_EXTERNA.md  notas de compilación externa (Codex)
docs/operations/01-BQS.md       doctrina BQS v0.1 (borrador, validar vs el caso BQS de referencia)
docs/research/                  investigación de dominio (logbook · tanques · key meeting) — borradores
branding/brand.toml             white-label: nombre/logo/colores del producto (única fuente)
ui/                             frontend React+shadcn (BQS, 3 temas) — Medición calcula en vivo (WASM)
ui/src/lib/kernel.ts            puente UI→kernel WASM (calcula); ui/src/wasm = glue generado
ui/src/lib/useBqsRows.ts        hooks compartidos: calc por fila/totales/transferido (kernel)
ui/src/lib/ipc.ts               puente UI→Tauri (guardar en SQLite) — solo escritorio
ui/src/data/grades.ts           catálogo de grados de combustible (ISO 8217 + comerciales)
ui/src/pages/Utilidades.tsx     utilidades de densidad (API↔ρ15, lab @T, mezcla) — kernel
ui/src/data/rob.ts              datos demo ROB (inventario por grado + ER Log)
ui/src/pages/Reporte.tsx        reporte BQS imprimible (PDF/print + JSON); RobReport.tsx = ROB
ui/src-tauri/                   shell Tauri v2 (persistencia → SQLite) — compila (local + CI)
reference/dotnet-wpf-prototype/ prototipo .NET/WPF + Draft calc validado (SOLO referencia)
.claude/skills/                 skills de desarrollo (grill-me, diagnose)
```

## Qué funciona hoy

- Kernel Rust **compila verde**: `cargo test` (46 tests) ✅, `fmt`/`clippy` limpios, esquema
  SQLite valida (37 tablas / 2 vistas / 24 índices / 2 triggers) — local **y** en GitHub Actions.
- **ASTM D1250-80 métrico por ecuaciones** (`src/astm.rs`): Tabla 54B (VCF productos, 4 grupos),
  54A (crudo) y 56 (WCF aire/vacío), decimal puro (exp Taylor, sin f64), **validadas contra una
  hoja BQS real firmada** (vectores anonimizados en `tests/astm_worksheet_qa_tests.rs`): VCF/WCF
  exactos a 4dp, filas GSV/MT exactas a 3dp, bloque Quantity Transferred exacto.
- **Comparison engine** (`src/comparison.rs`): Vessel vs Barge vs BDN por pares, **tolerancia en
  capas** (ISO + comprador/suplidor/inspección/contrato) y recomendación **None/NOAD/LOP** según
  el peor |Δ%|; normaliza unidades, trace por scope. **DTO string-in/out** (`ComparisonRequestDTO.compare()`)
  expuesto por WASM y **cableado en la pantalla Comparación** (recomienda doc + capas; 10 tests).
- **Orquestador BQS** (`src/bqs.rs`): toma lo que teclea el surveyor (densidad@15, T, volumen de
  tabla, agua libre, tabla 54A/54B) → fila completa (VCF→GOV→GSV→**MT aire y vacío**) + totales de
  sección, reusando `astm`. Incluye **DTO string-in/out** (`BqsRowRequestDTO.calculate()`) listo
  para el comando Tauri. Validado e2e vs hoja real (7 tests).
- **Persistencia SQLite** (`supersurvey_persistence`, rusqlite *bundled*): repos jobs→sets→rows→records
  + **calculation_logs append-only** (triggers verificados) + puente captura→kernel→log inmutable.
  5 tests verdes con **job de CI propio**.
- **Shell Tauri v2** (`ui/src-tauri`, comandos `calculate_bqs_row` / `save_bqs_calculation`):
  **compila verde local Y en CI** (workflow propio `supersurvey-desktop.yml` que instala las libs
  webkit/gtk e iconos placeholder). Era un esqueleto sin compilar; ahora está verificado.
- **Kernel en el navegador (WASM)** (`supersurvey_wasm`): el *mismo* Rust validado compilado a
  wasm32 (exporta `bqs_calculate_row`, `compare_sources`, `kernel_version`); `ui/src/lib/kernel.ts`
  lo invoca. **Medición calcula en vivo** (VCF→GOV→GSV→MT por fila y totales) y **Comparación**
  recomienda **None/NOAD/LOP** en vivo — **sin reimplementar nada de ASTM/tolerancia en TypeScript**.
  Verificado vía Node (gsv 219.473, mt aire 209.004; comparación → ISSUE_LOP a 0.5282%). CI `wasm-kernel`.
- Cálculo decimal con `rust_decimal` en toda la cadena; frontera IPC string-in/string-out.
- `calculation_logs` append-only (inmutable por triggers). Política de densidad "falla fuerte".

## En qué fase estamos

**F1 (kernel BQS validado) cerrada → F2 (persistencia + UI en vivo) — bucle BQS cerrado de punta a punta.**
~60 % del MVP. El kernel valida vs hoja real, persiste, **compila en Tauri (CI)** y **calcula en vivo
en la UI vía WASM**: Medición + Comparación + **Guardado** (escritorio) + **Reporte BQS imprimible (PDF)**
+ **Reporte ROB** (inventario vs ER Log). Falta: utilidades de densidad, firma digital, y el **pase de
diseño (reactbits) al final**.

## Próximos pasos inmediatos

1. **Recibir el caso BQS de referencia** (Excel lleno + PDF del reporte firmado) — caso ancla de BQS.
2. ✅ Doctrina BQS v0.1 escrita (`docs/operations/01-BQS.md`) — falta validar/corregir con el caso real.
3. ✅ **VCF/WCF reales** (54B/54A/56, D1250-80) y ✅ **comparison engine** (tolerancia en capas +
   NOAD/LOP), ambos validados vs hoja real / números de la UI. Falta: versión **D1250-04 seleccionable**.
4. **F2 — cablear captura real:** ✅ DTOs (fila BQS + comparación), ✅ **repos SQLite**, ✅ **shell
   Tauri compila (CI)**, ✅ **kernel WASM**, ✅ **Medición en vivo** (fila + totales + *Quantity
   Transferred* con None/NOAD/LOP), ✅ **Comparación en vivo** y ✅ **Guardado** (`save_measurement`
   + botón *Guardar medición*, **solo escritorio** vía `src/lib/ipc.ts`), ✅ **Reporte BQS imprimible
   (PDF + JSON técnico)** y ✅ **Reporte ROB** (inventario por grado vs ER Log, ±0.5%). Falta:
   **verificar el guardado en un build empacado** (lógica DB testeada; falta correr la GUI);
   cargar/guardar el estado editado por trabajo; extender el cálculo en vivo al resto de pantallas.
5. ✅ **Utilidades de densidad** (`density.rs` + página Utilidades): API↔ρ15 (vía SG60/60 y agua@60°F
   999.016), ρ_obs@T↔ρ15 (inversión de la 54B por punto fijo — cubre lab @20 °C), mezcla ponderada
   por volumen. 14 tests QA. Falta: **versión D1250-04 seleccionable**; luego el **pase de diseño
   (reactbits)** — al final, por ser la capa de interacción (decisión del usuario).
6. Aplicar los **6 fixes de hardening** (Ultraplan §9). Hecho: **toolchain pin ✓**, **WCF→MT (Tabla 56) ✓**. Faltan 4.

## Cómo compilar / probar

- **Local (con Rust):** `cargo test --locked --manifest-path rust-kernel/supersurvey_calc/Cargo.toml`
- **Sin permisos locales (caso de Adrian):** hacer *push* → GitHub Actions corre fmt/clippy/test/schema.

## Lo que necesito del surveyor (Adrian), por operación — empezando por BQS

1. Un **Excel real lleno** (el caso BQS de referencia).
2. El **PDF / foto del reporte final firmado**.
3. **Quién firma** cada documento.
4. Qué datos son **de campo** vs **externos** (BDN, B/L, terminal).
5. Qué **discrepancia** suele generar discusión.
6. El **cálculo que consideras más crítico**.

## Skills de desarrollo instalados

`grill-me` (entrevista adversarial de planes) y `diagnose` (depuración estructurada) en
`.claude/skills/`. Nota: `/plugin` **no funciona en Claude web**; por eso se instalan como
skills de proyecto (persisten en el repo). Pendiente de confirmar con el usuario: `agency`
y `gstack` (ambiguos). **GSD ("Get Shit Done", `gsd-build/get-shit-done`):** su instalador
externo (npx) fue **bloqueado por seguridad**; pendiente de decisión del usuario (autorizar
instalador vs. omitir). Es un sistema grande (~4.7 MB: comandos + agents + hooks).

## Decisiones clave

Ver tabla completa en `docs/00-ULTRAPLAN.md` §2 (Decision Log).

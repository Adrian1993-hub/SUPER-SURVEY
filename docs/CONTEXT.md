# SuperSurvey — Contexto y Estado (Handoff)

> **Léeme PRIMERO** si retomas el proyecto (humano o IA). Es el resumen vivo para no perder
> el hilo entre sesiones. Mantener actualizado al final de cada sesión.
> Actualizado: **2026-06-06**.

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
.github/workflows/              CI: fmt + clippy + test + valida schema
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
reference/dotnet-wpf-prototype/ prototipo .NET/WPF + Draft calc validado (SOLO referencia)
.claude/skills/                 skills de desarrollo (grill-me, diagnose)
```

## Qué funciona hoy

- Kernel Rust **compila verde**: `cargo test` (37 tests) ✅, `fmt`/`clippy` limpios, esquema
  SQLite valida (37 tablas / 2 vistas / 24 índices / 2 triggers) — local **y** en GitHub Actions.
- **ASTM D1250-80 métrico por ecuaciones** (`src/astm.rs`): Tabla 54B (VCF productos, 4 grupos),
  54A (crudo) y 56 (WCF aire/vacío), decimal puro (exp Taylor, sin f64), **validadas contra una
  hoja BQS real firmada** (vectores anonimizados en `tests/astm_worksheet_qa_tests.rs`): VCF/WCF
  exactos a 4dp, filas GSV/MT exactas a 3dp, bloque Quantity Transferred exacto.
- **Comparison engine** (`src/comparison.rs`): Vessel vs Barge vs BDN por pares, **tolerancia en
  capas** (ISO + comprador/suplidor/inspección/contrato) y recomendación **None/NOAD/LOP** según
  el peor |Δ%|; normaliza unidades, trace por scope (8 tests, alineados con los números de la UI).
- Cálculo decimal con `rust_decimal` en toda la cadena; frontera IPC string-in/string-out.
- `calculation_logs` append-only (inmutable por triggers). Política de densidad "falla fuerte".

## En qué fase estamos

**F0 (Organización) casi cerrada → F1 (Doctrina BQS + kernel BQS validado).**
~10 % del sistema completo. El siguiente 20 % (doctrina + kernel validado) quita el riesgo.

## Próximos pasos inmediatos

1. **Recibir el caso BQS de referencia** (Excel lleno + PDF del reporte firmado) — caso ancla de BQS.
2. ✅ Doctrina BQS v0.1 escrita (`docs/operations/01-BQS.md`) — falta validar/corregir con el caso real.
3. ✅ **VCF/WCF reales** (54B/54A/56, D1250-80) y ✅ **comparison engine** (tolerancia en capas +
   NOAD/LOP), ambos validados vs hoja real / números de la UI. Falta: versión **D1250-04 seleccionable**.
4. **F2 — cablear captura real:** comandos Tauri (IPC string-in/out) → kernel → **SQLite**, con las
   validaciones de la investigación. Es la vía para que lo que teclea el surveyor se calcule y persista.
5. Aplicar los **6 fixes de hardening** (Ultraplan §9). Hecho: **toolchain pin ✓**, **WCF→MT (Tabla 56) ✓**. Faltan 4.

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

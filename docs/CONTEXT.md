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
docs/00-ULTRAPLAN.md            plan maestro (LEER)
docs/CONTEXT.md                 este archivo (handoff)
docs/01-analisis-OGC-InfoPro.md análisis del sistema viejo (OGC/InfoPro)
docs/SUPERSURVEY_COMPILACION_EXTERNA.md  notas de compilación externa (Codex)
docs/operations/                doctrina por operación  ← pendiente (empezar por BQS)
reference/dotnet-wpf-prototype/ prototipo .NET/WPF + Draft calc validado (SOLO referencia)
.claude/skills/                 skills de desarrollo (grill-me, diagnose)
```

## Qué funciona hoy

- Kernel Rust **compila verde**: `cargo test` (17 tests) ✅, `fmt`/`clippy` limpios, esquema
  SQLite valida (37 tablas / 2 vistas / 24 índices / 2 triggers) — local **y** en GitHub Actions.
- Cálculo decimal con `rust_decimal` en toda la cadena; frontera IPC string-in/string-out.
- `calculation_logs` append-only (inmutable por triggers). Política de densidad "falla fuerte".

## En qué fase estamos

**F0 (Organización) casi cerrada → F1 (Doctrina BQS + kernel BQS validado).**
~10 % del sistema completo. El siguiente 20 % (doctrina + kernel validado) quita el riesgo.

## Próximos pasos inmediatos

1. **Recibir EQUINOX MELIDA** (Excel lleno + PDF del reporte firmado) — caso ancla de BQS.
2. Escribir **`docs/operations/01-BQS.md`** (doctrina operativa de BQS).
3. Implementar el **cálculo BQS** en Rust validado contra EQUINOX MELIDA.
4. Aplicar los **6 fixes de hardening** del kernel (ver Ultraplan §9).

## Cómo compilar / probar

- **Local (con Rust):** `cargo test --locked --manifest-path rust-kernel/supersurvey_calc/Cargo.toml`
- **Sin permisos locales (caso de Adrian):** hacer *push* → GitHub Actions corre fmt/clippy/test/schema.

## Lo que necesito del surveyor (Adrian), por operación — empezando por BQS

1. Un **Excel real lleno** (EQUINOX MELIDA).
2. El **PDF / foto del reporte final firmado**.
3. **Quién firma** cada documento.
4. Qué datos son **de campo** vs **externos** (BDN, B/L, terminal).
5. Qué **discrepancia** suele generar discusión.
6. El **cálculo que consideras más crítico**.

## Skills de desarrollo instalados

`grill-me` (entrevista adversarial de planes) y `diagnose` (depuración estructurada) en
`.claude/skills/`. Nota: `/plugin` **no funciona en Claude web**; por eso se instalan como
skills de proyecto (persisten en el repo). Pendiente de confirmar con el usuario: `agency`
y `gstack` (ambiguos — varios candidatos).

## Decisiones clave

Ver tabla completa en `docs/00-ULTRAPLAN.md` §2 (Decision Log).

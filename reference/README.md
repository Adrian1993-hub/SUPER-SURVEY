# /reference — Material solo de referencia

> **No es código de producción.** El proyecto usa el stack Rust + Tauri + TypeScript + SQLite
> (ver `docs/00-ULTRAPLAN.md`). Lo que está aquí se conserva únicamente como referencia.

## `dotnet-wpf-prototype/`

Prototipo inicial en **.NET 8 / C#** (dirección antigua WPF). Se descartó al adoptar Rust/Tauri,
pero contiene material **útil para portar**:

- **`DraftSurvey/DraftSurveyCalculator.cs`** — cálculo de *draft survey* (desplazamiento,
  correcciones por trim, densidad, deductibles) con las **fórmulas ya validadas**.
- **`DraftSurveyTests.cs`** — validado contra un reporte real de draft survey (anonimizado)
  (carga descargada = **2409.733 MT**). Estos números esperados deben reproducirse cuando se
  reimplemente Draft Survey en Rust.

Cuando lleguemos a la operación **Draft Survey** (Fase 5), portar estas fórmulas y tests a Rust.

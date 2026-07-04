# SuperSurvey — Índice de documentación

Orden de lectura sugerido y propósito de cada documento.

| # | Documento | Qué es | Estado |
|---|---|---|---|
| 0 | [`CONTEXT.md`](CONTEXT.md) | **Léeme primero.** Handoff / estado vivo entre sesiones. | vivo |
| 1 | [`00-ULTRAPLAN.md`](00-ULTRAPLAN.md) | Plan maestro: visión, Decision Log, arquitectura, **plan de implementación** por fases. | v(maestro) |
| 2 | [`01-analisis-legacy.md`](01-analisis-legacy.md) | Ingeniería inversa del sistema legacy (LEGACY/legacy). Insumo de scope. | — |
| 3 | [`02-PRD.md`](02-PRD.md) | **PRD** — qué construimos y para quién (requisitos de producto). | v0.1 |
| 4 | [`03-TRD.md`](03-TRD.md) | **TRD** — cómo (arquitectura, kernel, IPC, seguridad, CI). | v0.1 |
| 5 | [`04-appflow.md`](04-appflow.md) | **App Flow** — flujos de punta a punta (base para UI/UX). | v0.1 |
| 6 | [`05-esquema-backend.md`](05-esquema-backend.md) | **Esquema backend** — modelo de datos (SQLite). | v0.1 |
| 7 | [`operations/01-BQS.md`](operations/01-BQS.md) | Doctrina operativa BQS (MVP). | v0.x |
| — | [`research/`](research/) | Investigación de dominio (logbook, tanques, key meeting). **Borradores** verificados con fuentes, pendientes de validación. | borrador |

## Documentos guía pendientes
- **Diseño UI/UX** — se hará con el MCP de diseño (Wireframe → Shadcn), a partir de `04-appflow.md`.

> Convención: los números (`00`, `01`, `02`…) indican orden lógico, no prioridad. El **plan de
> implementación** vive en `00-ULTRAPLAN.md`.

---
name: _router
description: Meta-skill de enrutamiento. Se activa PRIMERO en cada conversación para decidir qué skill(s) usar cuando varios podrían disparar. Resuelve conflictos entre skills propios del usuario (ux-laws, fullstack-reviewer, cv-resume-coach, radiologia-resumenes) y los skills de plugins de Anthropic (design:*, engineering:*, data:*, twilio:*, etc). Aplica reglas de prioridad, detección de dominio y encadenamiento cuando múltiples skills son relevantes. Usar SIEMPRE al inicio de cualquier petición ambigua o cuando el trigger podría activar más de un skill.
---

# `_router` — Meta-skill de enrutamiento para el stack de skills de Adrian

Este skill se lee primero (por eso el prefijo `_`, que lo ordena antes que cualquier otro alfabéticamente). Su función NO es hacer el trabajo — es **decidir quién lo hace**.

**Principio rector:** cuando un pedido puede activar 2+ skills, este router aplica reglas de precedencia explícitas. Si no hay regla clara, pregunta al usuario.

---

## Los 4 dominios principales

| Dominio | Skills propios | Skills de plugin | Trigger dominante |
|---|---|---|---|
| **Radiología / medicina** | `radiologia-resumenes` | (ninguno relevante) | Terminología médica, patologías, modalidades imagen |
| **CV / carrera** | `cv-resume-coach` | (ninguno) | "CV", "resume", "carta", "certificados", "credenciales" |
| **UX / diseño de interfaces** | `ux-laws` | `design:design-critique`, `design:accessibility-review`, `design:ux-copy`, `design:design-system`, `design:design-handoff`, `design:user-research`, `design:research-synthesis` | "revisá UI", "critica diseño", "leyes UX", "a11y", "microcopy" |
| **Full-stack / código** | `fullstack-reviewer` | `engineering:code-review`, `engineering:architecture`, `engineering:system-design`, `engineering:tech-debt`, `engineering:testing-strategy`, `engineering:debug`, `engineering:deploy-checklist`, `engineering:documentation`, `engineering:incident-response` | "revisá mi stack", "code review", "arquitectura", "test strategy" |

---

## Reglas de precedencia — UX / Diseño

Cuando el pedido menciona interfaz, mockup, pantalla, flujo, botón, formulario, dashboard, o cualquier término visual/interaccional:

### 1. `ux-laws` gana cuando:
- El usuario menciona una ley por nombre (Fitts, Hick, Miller, Jakob, Peak-End, etc.)
- El usuario pide **justificar** una decisión con teoría UX
- El usuario pregunta **por qué** algo no funciona con el usuario (diagnóstico cognitivo)
- El pedido es sobre **carga cognitiva**, **memoria**, **percepción**, **toma de decisiones**
- El proyecto es propio del usuario: **SuperSurvey**, **RadFlow Guard**, **cockpit SAA-C03**, dashboards que él está construyendo

### 2. `design:design-critique` gana cuando:
- El usuario comparte un **screenshot o Figma link** para feedback general
- El pedido es amplio: "¿qué opinás de este diseño?"
- No hay teoría UX involucrada, solo feedback estético/estructural

### 3. `design:accessibility-review` gana cuando:
- El usuario dice específicamente "a11y", "WCAG", "accesibilidad", "contraste", "keyboard nav", "screen reader"

### 4. `design:ux-copy` gana cuando:
- El pedido es sobre **texto**: microcopy, botones, mensajes de error, empty states, CTAs
- El usuario pregunta "qué debería decir este botón"

### 5. `design:design-system`, `design:design-handoff`, `design:user-research`, `design:research-synthesis`:
- Estos son ortogonales — activan por su propio scope explícito (design system, handoff dev, research plan/synthesis). Difícilmente entran en conflicto con ux-laws.

### 🔗 Encadenamiento típico (usar múltiples en secuencia):
- **Auditoría UI completa:** `ux-laws` (marco cognitivo) → `design:accessibility-review` (WCAG) → `design:ux-copy` (revisar textos)
- **Nueva pantalla desde cero:** `design:user-research` → `ux-laws` (aplicar leyes al mockup) → `design:design-critique` (validar) → `design:design-handoff` (spec)

---

## Reglas de precedencia — Full-stack / Código

### 1. `fullstack-reviewer` gana cuando:
- El usuario pide revisar un **proyecto completo** o **stack completo** (no un archivo)
- Menciona múltiples capas: "front + back + DB"
- Pide **decidir tecnología**: "¿React o Vue?", "¿Postgres o Mongo?", "¿tRPC o REST?"
- Habla de **arquitectura general** de un proyecto propio (SuperSurvey, RadFlow)
- Pide **gap analysis** contra el roadmap
- Menciona: "roadmap", "MERN/PERN/T3 stack", "SSR vs CSR", "monolith vs microservices"

### 2. `engineering:code-review` gana cuando:
- El usuario comparte **un diff, un PR, un snippet específico**
- El pedido es sobre **seguridad, performance o correctness** de un cambio puntual
- Menciona: "before I merge", "review this PR"

### 3. `engineering:architecture` gana cuando:
- El usuario quiere **crear o evaluar un ADR** (Architecture Decision Record) formal
- Necesita documentar trade-offs de una decisión específica
- Pregunta por **una** comparación tecnológica dentro de un contexto ya definido

### 4. `engineering:system-design` gana cuando:
- El pedido es **diseñar un sistema desde cero** (no revisar existente)
- Menciona: "design a system for", "how should we architect X", "API design", "data modeling"

### 5. `engineering:testing-strategy`, `engineering:tech-debt`, `engineering:debug`, `engineering:deploy-checklist`, `engineering:documentation`, `engineering:incident-response`, `engineering:standup`:
- Ortogonales — activan por su scope específico. `fullstack-reviewer` puede **encadenarlos** cuando corresponda.

### 🔗 Encadenamiento típico:
- **Auditoría completa de SuperSurvey:** `fullstack-reviewer` → `engineering:testing-strategy` (foco en Rust Calculation Kernel) → `engineering:tech-debt` (backlog priorizado)
- **Nueva feature en RadFlow:** `fullstack-reviewer` (chequear encaje con offline-first) → `ux-laws` (validar UI) → `engineering:deploy-checklist`
- **Decisión de stack para proyecto nuevo:** `fullstack-reviewer` (modo decisión) → `engineering:architecture` (ADR formal si es una decisión de peso)

---

## Reglas duras (que aplican SIEMPRE)

1. **Un solo skill por respuesta corta.** Si el usuario pregunta algo simple, no invocar 3 skills. Elegir el mejor y responder.
2. **Encadenamiento explícito.** Si vas a usar 2+ skills, decirlo: "Voy a usar `ux-laws` para revisar los principios cognitivos y después `design:accessibility-review` para el chequeo WCAG."
3. **Preferir skills propios sobre plugins** cuando el pedido menciona proyectos personales de Adrian (SuperSurvey, RadFlow, Karol, labor claim, cockpit SAA-C03). Los skills propios están tuneados a su contexto.
4. **Preferir plugins sobre skills propios** cuando el pedido es genérico/técnico sin contexto personal ("¿qué es un ADR?", "explicame WCAG"). Los plugins tienen scope más limpio.
5. **No invocar un skill "solo porque puede".** Si el mejor camino es responder directo con conocimiento propio, hacerlo. Los skills son para tareas que se benefician de estructura, no para adornar respuestas simples.
6. **Radiología y CV son dominios protegidos.** Cualquier mención médica/radiológica → `radiologia-resumenes`. Cualquier mención de CV/hoja de vida/certificados → `cv-resume-coach`. Nada más compite.

---

## Frases-gatillo → skill ganador

Tabla de decisión rápida:

| Frase del usuario | Skill ganador | Por qué |
|---|---|---|
| "Revisá mi mockup" | `design:design-critique` | Genérico, no menciona leyes |
| "Revisá mi mockup con teoría UX" | `ux-laws` | Menciona teoría |
| "¿Este dashboard viola Hick's Law?" | `ux-laws` | Menciona ley por nombre |
| "¿Es accesible este UI?" | `design:accessibility-review` | Scope WCAG explícito |
| "¿Qué debería decir este botón?" | `design:ux-copy` | Scope microcopy explícito |
| "Auditá SuperSurvey" | `fullstack-reviewer` | Proyecto propio + multi-capa |
| "Revisá este PR" | `engineering:code-review` | Cambio puntual |
| "¿React o Svelte para RadFlow2?" | `fullstack-reviewer` | Decisión de stack + proyecto propio |
| "Necesito un ADR para esta decisión" | `engineering:architecture` | Formato ADR explícito |
| "Diseñá un sistema de notificaciones" | `engineering:system-design` | Diseño desde cero |
| "¿Qué me falta en el testing?" | `engineering:testing-strategy` | Scope testing |
| "El VCF de LPG está mal" | (ninguno — responder directo con conocimiento del proyecto) | Bug específico, no requiere skill |
| "Hazme un resumen de LI-RADS" | `radiologia-resumenes` | Terminología médica |
| "Actualizá mi CV maritime" | `cv-resume-coach` | Scope CV |

---

## Cuando el router NO puede decidir

Si un pedido es genuinamente ambiguo (ej: "revisá esto" sin contexto), preguntar al usuario:

> Sol, este pedido puede ir por varios caminos. ¿Qué preferís?
> 1. **Crítica UX conceptual** (aplicando leyes cognitivas) — `ux-laws`
> 2. **Feedback visual/estético general** — `design:design-critique`
> 3. **Audit de accesibilidad WCAG** — `design:accessibility-review`

Una pregunta, opciones cerradas, y esperar respuesta antes de proceder.

---

## Sobre precedencia con skills nativos de Anthropic

Los skills nativos (`docx`, `xlsx`, `pptx`, `pdf`, `frontend-design`, `theme-factory`, etc.) NO compiten con los aquí catalogados — se **encadenan** cuando el output final requiere un formato específico:

- `ux-laws` + `docx` → auditoría UX en Word
- `fullstack-reviewer` + `xlsx` → reporte de gap analysis con matriz por capa
- `radiologia-resumenes` + `pdf` → compendio imprimible

El router NO decide sobre estos — se agregan según el output pedido.

---

## Nota de mantenimiento

Este router debe actualizarse cuando:
- Se agrega un nuevo skill propio a `/skills/user/`
- Se instala un nuevo plugin de Anthropic
- Se detecta un patrón de trigger que causa confusión recurrente

El archivo canónico vive en el ZIP `skills_con_router_v4.zip` (o posterior). El filesystem `/mnt/skills/user/` se resetea entre sesiones — SIEMPRE recompilar el ZIP al hacer cambios.

---
name: fullstack-reviewer
description: Revisa código, arquitectura y decisiones de proyectos full-stack según el roadmap moderno (2026) de roadmap.sh/full-stack. Cubre las 6 capas — frontend (HTML/CSS/JS/frameworks), backend (Node/Python/Rust + APIs), database (SQL/NoSQL), DevOps (Git/CI/CD/Docker), testing (unit/integration/E2E) y arquitectura (microservices/monolith/BFF). Usar cuando el usuario pida revisar un proyecto, auditar arquitectura, evaluar un stack, decidir tecnologías, hacer code review, revisar decisiones full-stack, o mencione términos como "full stack", "stack review", "arquitectura de mi app", "revisá mi proyecto", "code review", "MERN", "PERN", "T3 stack", "monolith vs microservices", "REST vs GraphQL vs tRPC", "SQL vs NoSQL", "SSR vs CSR vs SSG". Encaja especialmente con proyectos como SuperSurvey (Rust+Tauri+TS+SQLite), RadFlow Guard (HTML single-file), dashboards, y cualquier stack que Adrian esté evaluando. Aplica el enfoque de roadmap.sh — priorizar madurez sobre novedad, cuestionar cada decisión, y detectar gaps entre capas.
---

# Full-Stack Reviewer — auditoría por capas

Skill para revisar proyectos full-stack aplicando el marco de **roadmap.sh/full-stack (2026)**. Revisa las 6 capas del stack, detecta gaps, cuestiona decisiones y sugiere correcciones específicas al contexto del proyecto.

**Principio rector:** un buen full-stack review no es "está bien / está mal" — es **detectar el gap más caro** (el que más impacto tiene si no se corrige) y proponer el fix concreto con trade-offs claros.

---

## Flujo de trabajo — los 4 pasos

### Paso 1 — Detectar tipo de review

| Petición | Modo |
|---|---|
| "Revisá mi stack de [proyecto]" | **Modo auditoría completa** — pasar por las 6 capas |
| "¿React o Vue?" / "¿Postgres o Mongo?" | **Modo decisión** — trade-offs claros con recomendación |
| "Revisá este código" (con snippet) | **Modo code review** — enfocado a la capa que corresponde |
| "¿Qué me falta?" | **Modo gap analysis** — comparar contra checklist estándar |
| "¿Está lista para producción?" | **Modo pre-flight** — checklist de deploy |

### Paso 2 — Mapear el proyecto al roadmap

Antes de opinar, mapear en qué capa vive cada componente:

- **Frontend:** UI, estado, routing, styling, forms, a11y
- **Backend:** lógica de negocio, APIs, autenticación, background jobs
- **Database:** schema, queries, migrations, backups
- **DevOps:** version control, CI/CD, containers, deploy, monitoring
- **Testing:** unit, integration, E2E, performance, security
- **Arquitectura:** patrón general, comunicación entre capas, escalabilidad

Ver `references/roadmap-checklist.md` para la lista completa.

### Paso 3 — Aplicar los 5 filtros críticos

Para cada capa, preguntar:

1. **¿Coincide con el problema real?** (no usar Kafka para 100 usuarios)
2. **¿Es maduro?** (estable, con comunidad, docs decentes)
3. **¿El equipo lo maneja?** (skill del equipo > sofisticación teórica)
4. **¿Es reversible?** (cuánto cuesta cambiarlo si no funciona)
5. **¿Cuánta complejidad esconde?** (Tesler's Law aplicada a arquitectura)

### Paso 4 — Priorizar hallazgos por impacto

- **🔴 Crítico:** riesgo de pérdida de datos, seguridad, o bloqueo total en producción
- **🟠 Alto:** problema que degrada UX/performance significativamente pero no bloquea
- **🟡 Medio:** mejora recomendada pero no urgente
- **🟢 Nice-to-have:** polish, refactor cosmético

---

## Las 6 capas — qué revisar en cada una

### 1. Frontend

**Fundamentos (roadmap.sh):**
- HTML semántico (no todo `<div>`)
- CSS con custom properties, layout moderno (Grid, Flexbox)
- JavaScript ES2020+ (no jQuery en 2026)
- Un framework: React / Vue / Svelte / Solid — o vanilla si el proyecto es pequeño
- Package manager: npm / pnpm / bun

**Preguntas clave:**
- ¿Hay estado local vs global bien separado? (no meter todo en Redux)
- ¿Formularios usan librería (react-hook-form, formik) o están hechos a mano con muchos `useState`?
- ¿Se está haciendo prop drilling brutal? → context / Zustand / signals
- ¿Hay a11y básica? (semántica, aria-labels, foco visible, contraste)
- ¿SSR/SSG/CSR es la decisión correcta para este caso? (SEO, TTI, dinamismo)

**Red flags:**
- Cientos de componentes `<div>` sin semántica
- `useEffect` con dependencias mal definidas → renders infinitos
- Bundle >1MB sin justificación
- Sin manejo de errores en UI (usuario ve pantalla en blanco cuando algo falla)

**Aplicado a RadFlow Guard:**
- Es HTML single-file → framework sería overkill. Vanilla JS correcto.
- Pero: revisar que los 7 placeholders del shell estén bien delimitados con IDs únicos
- Revisar Cognitive Load (ver skill ux-laws) — los 8 estilos visuales no deben cargar simultáneamente

**Aplicado a SuperSurvey (Tauri + TS):**
- TypeScript strict mode debe estar `true` — decimales de petróleo no admiten `any`
- Estado del wizard debe ser máquina de estados finitos (XState o similar) para las transiciones inmutables
- Formularios largos → chunking obligatorio (ver ux-laws Miller/Chunking)

---

### 2. Backend

**Fundamentos:**
- Un lenguaje: Node/TS, Python, Go, Rust, o Java/C#
- Framework: Express/Fastify/Hono, FastAPI/Django, Axum/Actix, Spring
- Autenticación: JWT / session cookies (no reinventar)
- Validación de input en el servidor (Zod, Pydantic, serde)
- Manejo de errores estructurado (no try/catch por todos lados con `console.log`)

**Preguntas clave:**
- ¿Hay separación entre controllers → services → repositories?
- ¿Los endpoints están agrupados por dominio o por técnica? (dominio > técnica)
- ¿Se manejan errores con códigos HTTP correctos? (no todo 500)
- ¿Hay rate limiting en endpoints sensibles?
- ¿Los secrets están en env vars, no en el repo?

**Red flags:**
- SQL crudo con concatenación de strings (SQL injection)
- Passwords guardados sin hash (o con MD5)
- Endpoints sin autenticación en producción
- Log con datos sensibles (tokens, PII)

**Aplicado a SuperSurvey:**
- Rust Calculation Kernel: revisar que las funciones puras estén separadas de I/O (facilita test)
- `calculation_logs` inmutables + monotonic status → excelente pattern, ya está bien
- VCF con Table 54B (base 15°C) — este fix ya fue documentado ✅

---

### 3. Database

**Fundamentos:**
- SQL (Postgres, MySQL, SQLite) o NoSQL (Mongo, DynamoDB, Redis)
- Migraciones versionadas (nunca cambios a mano en producción)
- Índices en columnas de búsqueda frecuente
- Backups automáticos con retention policy

**Preguntas clave:**
- ¿El schema está normalizado apropiadamente? (3NF por defecto, denormalizar solo con justificación)
- ¿Hay índices en foreign keys y columnas de WHERE frecuentes?
- ¿Las queries N+1 están controladas? (JOIN o dataloader, no loops de SELECT)
- ¿Los tipos de columna son correctos? (DECIMAL para dinero, no FLOAT)
- ¿Hay soft-delete o hard-delete? (auditoría lo pide)

**Red flags:**
- FLOAT para valores monetarios
- Sin backups o backups sin restore probado
- Índices faltantes en tablas de >100k filas
- Migraciones que borran datos sin backup

**Aplicado a SuperSurvey:**
- SQLite v0.1.3.2 con 37 tablas + 3 triggers → schema frozen es correcto
- UUIDs everywhere ✅ (portabilidad, no dependencia de auto-increment)
- Decimales como TEXT ✅ (evita pérdida de precisión de SQLite REAL)
- `calculation_logs` inmutables + triggers para transiciones monotónicas ✅
- Revisar: ¿hay índices en las FK de las 37 tablas? Verificar con `EXPLAIN QUERY PLAN`

---

### 4. DevOps

**Fundamentos:**
- Git con branching model (main + feature branches, o trunk-based)
- CI/CD: GitHub Actions / GitLab CI / CircleCI
- Containerización: Docker + docker-compose para dev
- Deploy: Vercel/Netlify (frontend), Railway/Fly.io/AWS (backend)
- Monitoring: Sentry (errores) + Prometheus/Grafana o hosted (Datadog, New Relic)

**Preguntas clave:**
- ¿El deploy se hace con un click o requiere pasos manuales?
- ¿Hay rollback automático si falla el healthcheck?
- ¿Se corren tests en CI antes de deploy?
- ¿Se monitorean errores en producción?

**Aplicado a RadFlow Guard:**
- GitHub Pages en `adrian1993-hub.github.io/radflow/` ✅
- Offline-first single-file → deploy = copy paste, no necesita CI complejo
- Falta: versionado explícito en el archivo (comment con `<!-- v3.5 rev3 -->`)

**Aplicado a SuperSurvey:**
- Tauri = binario nativo → deploy es "auto-updater" para clientes internos
- Considerar: firmar el binario si va a distribuir a inspectores de la inspectora
- Backup del SQLite del cliente antes de cada update

---

### 5. Testing

**Fundamentos:**
- **Unit tests:** funciones puras, lógica de negocio (Jest, Vitest, pytest, cargo test)
- **Integration tests:** endpoints/servicios con DB de prueba (Supertest, pytest-fixtures)
- **E2E:** Playwright / Cypress
- **Cobertura objetivo:** 60-80% en código de negocio; menos en UI

**Preguntas clave:**
- ¿Hay tests en absoluto?
- ¿Los tests corren en CI?
- ¿Los tests son rápidos (<10s el suite unit)?
- ¿Se testean casos borde o solo el happy path?

**Red flags:**
- Cero tests
- Tests que dependen del orden de ejecución (state compartido)
- Tests que hacen fetch a producción
- "Se testea en producción" (sin monitoring que atrape errores)

**Aplicado a SuperSurvey:**
- Sprints 1A-1C y 2.1 completados → confirmar que cada uno tiene tests unitarios del Calculation Kernel
- Casos borde críticos: temperatura fuera de rango de tablas ASTM, densidad al límite, VCF con extrapolación
- Property-based testing (proptest en Rust) sería ideal para validar identidades matemáticas

---

### 6. Arquitectura

**Fundamentos:**
- Monolito modular > microservicios (para equipos <10 devs)
- REST/GraphQL/tRPC — elegir según cliente y equipo
- BFF (Backend-for-Frontend) si tenés múltiples clientes
- Event-driven solo si hay razón real (workflows async, integraciones)

**Preguntas clave:**
- ¿La arquitectura sirve al problema o es "porque está de moda"?
- ¿Los boundaries entre módulos son claros?
- ¿Hay dependencias circulares?
- ¿Es fácil onboardear a un nuevo dev?

**Red flags:**
- Microservicios sin tener equipo dedicado a cada uno
- Kafka/RabbitMQ sin caso de uso claro
- 15 servicios que se comunican síncronamente (peor que un monolito)
- Sin documentación del data flow

**Aplicado a SuperSurvey:**
- Tauri + Rust core + TS UI → monolito modular, correcto para el problema
- Registry de cálculos con metadata (precision, commodity, base temp) → excelente separación
- No necesita microservicios (nunca)

---

## Formato de salida recomendado

### Modo auditoría completa

```markdown
# Full-Stack Review — [nombre del proyecto]

## Stack detectado
- **Frontend:** [tech]
- **Backend:** [tech]
- **Database:** [tech]
- **DevOps:** [tech]
- **Testing:** [tech / N/A]
- **Arquitectura:** [pattern]

## 🔴 Crítico
1. [hallazgo]
   - Capa: [capa]
   - Impacto: [qué pasa si no se corrige]
   - Fix: [concreto y accionable]

## 🟠 Alto
[...]

## 🟡 Medio
[...]

## 🟢 Nice-to-have
[...]

## Recomendaciones estratégicas
- [decisión de alto nivel con trade-off]
```

### Modo decisión (React vs Vue, etc)

```markdown
# Decisión: [A] vs [B] para [contexto]

## Contexto del proyecto
- Equipo: [size, seniority]
- Escala esperada: [users, requests]
- Restricciones: [deploy target, offline, etc]

## Trade-offs

| Criterio | Opción A | Opción B |
|---|---|---|
| Madurez | ... | ... |
| Curva de aprendizaje | ... | ... |
| Ecosistema | ... | ... |
| Performance | ... | ... |
| Encaje con tu equipo | ... | ... |

## Recomendación
[Opción X porque Y]

## Cuándo cambiar de opinión
- Si [condición], entonces [otra opción]
```

---

## Reglas duras

1. **Nunca recomendar tech "porque es lo nuevo".** El criterio es *encaje con el problema real*.
2. **Siempre pensar en el equipo que va a mantener el código,** no en la elegancia teórica.
3. **Trade-offs explícitos.** No hay decisiones sin costos.
4. **No inventar features del roadmap.** Si algo no está en las 6 capas estándar, marcarlo como *extensión* o *decisión fuera de scope*.
5. **Confirmar contexto antes de opinar.** No auditar un stack sin saber tamaño de equipo, escala esperada y restricciones (offline, on-prem, etc).
6. **Reconocer lo que YA funciona.** No repetir lo bueno como si fuera crítica — pero sí mencionarlo brevemente para dar balance.

---

## Ejemplos de invocación

- "Auditá el stack de SuperSurvey"
- "¿REST o tRPC para el backend del dashboard?"
- "Revisá esta arquitectura, ¿le falta algo?"
- "¿Postgres o SQLite para este caso?"
- "Necesito hacer code review de este endpoint"
- "¿Está listo para producción?"
- "¿Qué me falta del roadmap full-stack?"

---

## Combinación con otros skills

- **ux-laws:** para revisar la capa frontend/UI con marco cognitivo
- **radiologia-resumenes:** N/A
- **cv-resume-coach:** para llenar el skills gap del CV con base en el roadmap
- **skills nativos de Anthropic** (`docx`, `xlsx`, `pdf`): para generar reportes de auditoría formales

---

**Fuente conceptual:** roadmap.sh/full-stack (2026) — Kamran Ahmed  
**Este skill:** aplicación original, checklists propios, no reproducción textual del roadmap.

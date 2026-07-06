# Roadmap Full-Stack — Checklist detallado por capa (2026)

Basado en roadmap.sh/full-stack. Este checklist se usa para *gap analysis* — el usuario marca qué tiene y qué no, y el skill prioriza los huecos.

---

## Capa 1 — Frontend

### Fundamentos (obligatorio)
- [ ] HTML5 semántico (`<header>`, `<nav>`, `<main>`, `<article>`, `<footer>`)
- [ ] CSS moderno (Grid, Flexbox, custom properties, `clamp()`, `min()/max()`)
- [ ] JavaScript ES2020+ (async/await, optional chaining, nullish coalescing, destructuring)
- [ ] Responsive design (mobile-first, breakpoints razonables)
- [ ] Accessibility básico (WCAG 2.1 AA: contraste, alt text, aria-labels, foco visible, navegación con teclado)

### Framework / library (elegir 1 principal)
- [ ] **React** — dominante, ecosistema enorme, curva media. Combinado con Next.js para SSR/SSG.
- [ ] **Vue 3** — DX excelente, curva suave, con Nuxt para SSR.
- [ ] **Svelte / SvelteKit** — menos boilerplate, compilador inteligente, más simple para proyectos pequeños/medianos.
- [ ] **Solid** — API similar a React con reactividad fina, performance top.
- [ ] **Vanilla** — válido para proyectos pequeños o cuando el bundle importa mucho (RadFlow Guard, por ejemplo).

### State management
- [ ] Local state (useState, ref, signals)
- [ ] Server state (React Query / TanStack Query, SWR)
- [ ] Global client state (Zustand, Jotai, Pinia) — **solo si aplica**
- [ ] Evitar Redux si el proyecto no lo pide (curva y boilerplate altos)

### Styling
- [ ] CSS Modules / vanilla CSS / SCSS
- [ ] Tailwind CSS (utilitario, muy popular en 2026)
- [ ] CSS-in-JS (styled-components, emotion) — cayó en 2025, evitar en proyectos nuevos
- [ ] Component library (shadcn/ui, MUI, Chakra, Ant, Radix)

### Forms
- [ ] React Hook Form / VeeValidate / Felte
- [ ] Zod / Yup para validación (schema-first)
- [ ] Nunca `useState` × 20 para un formulario

### Tooling
- [ ] Bundler (Vite es el estándar; Webpack legacy)
- [ ] Package manager (pnpm > npm > yarn)
- [ ] Linter (ESLint) + Formatter (Prettier / Biome)
- [ ] TypeScript strict mode

### SSR / SSG / CSR — cuándo cuál
| Necesidad | Elegir |
|---|---|
| SEO + contenido dinámico | SSR (Next.js, Nuxt, SvelteKit) |
| SEO + contenido estático | SSG (Astro, Next.js `getStaticProps`, Hugo) |
| App detrás de login, sin SEO | CSR (Vite + React puro) |
| Sitio de contenido puro | Astro / Hugo / Jekyll |
| Desktop app | Tauri, Electron (offline-first, control total) |

---

## Capa 2 — Backend

### Lenguaje (elegir según equipo y problema)
- [ ] **Node.js + TypeScript** — mismo lenguaje que front, ecosistema masivo. Riesgo: rápido de arrancar pero difícil de escalar sin disciplina.
- [ ] **Python (FastAPI, Django)** — excelente para APIs y ML. Django si necesitás admin panel gratis.
- [ ] **Go** — performance, deploy simple (binario), goroutines para concurrencia. Bueno para APIs de alto throughput.
- [ ] **Rust (Axum, Actix)** — máxima performance y seguridad de memoria. Curva alta. Excelente para core de cálculo (SuperSurvey).
- [ ] **Java / Kotlin (Spring)** — enterprise, banca, Android. Verboso pero sólido.
- [ ] **C# (.NET)** — enterprise, gaming, Microsoft stack.
- [ ] **Ruby (Rails)** — productividad extrema para MVPs, ecosystem específico.
- [ ] **PHP (Laravel)** — sigue vivo, muy productivo, ecosystem de hosting barato.

### Framework por lenguaje
- **Node:** Express (legacy pero funcional), Fastify (moderno, rápido), Hono (edge-first), NestJS (opinado, patrón Angular)
- **Python:** FastAPI (moderno, async, type hints), Django (batteries-included), Flask (minimal)
- **Go:** Gin, Echo, Fiber, Chi, stdlib puro
- **Rust:** Axum (Tokio-based), Actix-Web (mature), Rocket (ergonomía)

### API design
- [ ] **REST** — estándar, cache HTTP nativo, público. Usar cuando hay múltiples clientes o consumidores externos.
- [ ] **GraphQL** — clientes complejos con demandas variables. Overkill para APIs simples.
- [ ] **tRPC** — TS end-to-end type safety. Excelente si front y back son mismo repo/equipo. NO para APIs públicas.
- [ ] **gRPC** — servicio-a-servicio, alto throughput, contratos estrictos. No para browser directo.

### Autenticación
- [ ] JWT (stateless) — bueno para APIs, mobile
- [ ] Session cookies (stateful) — bueno para web tradicional, más seguro contra XSS con `HttpOnly`
- [ ] OAuth 2.0 / OIDC (Auth0, Clerk, Supabase Auth, self-hosted) — no reinventar login social
- [ ] Passkeys / WebAuthn — futuro, adoptar cuando el user base lo permita
- [ ] MFA / 2FA para roles admin

### Validación
- [ ] Zod (Node), Pydantic (Python), serde + validator (Rust), class-validator (NestJS)
- [ ] **REGLA:** validar en el servidor SIEMPRE, aunque también valides en el cliente

### Background jobs / async
- [ ] BullMQ, Sidekiq, Celery, RabbitMQ — cuando hay trabajo pesado o retriable
- [ ] Cron / systemd timers para trabajos programados
- [ ] Considerar edge functions (Cloudflare Workers, Vercel Functions) para trabajo ligero

### Rate limiting & security
- [ ] Rate limiting por IP/user (express-rate-limit, redis-based)
- [ ] CORS bien configurado
- [ ] Helmet.js o equivalente para headers de seguridad
- [ ] HTTPS obligatorio (HSTS)
- [ ] Input sanitization contra XSS

---

## Capa 3 — Database

### Elegir tipo
- [ ] **SQL relacional** (Postgres, MySQL, SQLite) — default para datos estructurados con relaciones
- [ ] **NoSQL documento** (Mongo, DynamoDB) — datos con schema flexible, escalado horizontal fácil
- [ ] **Key-value** (Redis, Memcached) — cache, sesiones, colas
- [ ] **Time-series** (InfluxDB, TimescaleDB) — métricas, IoT, monitoring
- [ ] **Vector** (pgvector, Pinecone, Weaviate) — embeddings, búsqueda semántica
- [ ] **Graph** (Neo4j, Dgraph) — relaciones complejas de red

### Elegir el motor SQL
| Necesidad | Elegir |
|---|---|
| Local / desktop / offline-first | SQLite ✅ (SuperSurvey usa esto) |
| Web app general, feature-rich | Postgres (JSON, arrays, extensions, full-text) |
| Compatibilidad legacy, hosting barato | MySQL / MariaDB |
| Escala masiva (billion rows) | Postgres con Citus, o CockroachDB |
| Serverless | Turso (SQLite en edge), PlanetScale (MySQL), Neon (Postgres) |

### Schema & modeling
- [ ] Normalización razonable (3NF por defecto, denormalizar solo con métrica que lo justifique)
- [ ] Nombres consistentes (`snake_case` en columnas, singular en tablas es decisión de equipo)
- [ ] Foreign keys con `ON DELETE` explícito
- [ ] Timestamps `created_at`, `updated_at` en toda tabla
- [ ] Soft delete (`deleted_at`) vs hard delete — decisión por tabla
- [ ] UUIDs vs auto-increment — UUID gana en distribuidos y multi-cliente

### Migraciones
- [ ] Herramienta de migración versionada (Prisma, Drizzle, TypeORM, SQLx, Alembic, Rails migrations)
- [ ] Nunca cambios manuales en producción
- [ ] Migraciones reversibles cuando sea posible
- [ ] Schema snapshot / dump antes de cada release

### Indexing & performance
- [ ] Índices en foreign keys
- [ ] Índices en columnas de `WHERE` frecuente
- [ ] Índices compuestos según patrón de queries
- [ ] `EXPLAIN ANALYZE` / `EXPLAIN QUERY PLAN` (SQLite) para queries lentas
- [ ] Pool de conexiones configurado

### ORM vs SQL crudo
- [ ] **Prisma** — DX excelente, migraciones automáticas, TS type safety
- [ ] **Drizzle** — SQL-like, más ligero que Prisma
- [ ] **TypeORM** — legacy, evitar en proyectos nuevos
- [ ] **SQLx (Rust)** — queries chequeadas en compile time
- [ ] **SQL crudo con prepared statements** — máximo control, requiere disciplina

### Backups & recovery
- [ ] Backups automáticos diarios (mínimo)
- [ ] Retention policy (7 días? 30 días? 1 año?)
- [ ] **Restore probado** (backup que no se pudo restaurar = no hay backup)
- [ ] Backups fuera del mismo servidor / región

---

## Capa 4 — DevOps

### Version control
- [ ] Git (obviamente)
- [ ] Branching model: **trunk-based** (main + feature branches cortos) para equipos pequeños/medianos; GitFlow solo para releases muy formales
- [ ] Conventional commits (opcional pero útil para changelog automático)
- [ ] `.gitignore` bien configurado (no secrets, no `node_modules`, no build artifacts)
- [ ] `README.md` con setup mínimo funcional

### CI/CD
- [ ] Pipeline en cada push/PR
- [ ] Correr tests + linter en CI
- [ ] Deploy automático a staging tras merge a main
- [ ] Deploy a producción con approval manual (o automático si hay confianza + rollback)
- [ ] Herramientas: GitHub Actions (default), GitLab CI, CircleCI, Buildkite

### Containerización
- [ ] Docker + Dockerfile multi-stage
- [ ] docker-compose para dev local (DB + backend + cache)
- [ ] Imágenes de tamaño razonable (<500MB idealmente para backend Node/Python)

### Deploy targets
| Tipo de app | Opciones |
|---|---|
| Frontend estático / SSG | Vercel, Netlify, Cloudflare Pages, GitHub Pages |
| Frontend con SSR | Vercel, Netlify, Cloudflare Workers |
| Backend | Railway, Fly.io, Render, Heroku, AWS ECS/Lambda, GCP Cloud Run |
| Full-stack monorepo | Vercel, Railway, Fly.io |
| Desktop app | Tauri build → GitHub Releases; auto-updater |
| Enterprise on-prem | Docker + Kubernetes / systemd |

### Monitoring & observability
- [ ] Error tracking: Sentry / Bugsnag / Rollbar
- [ ] Uptime monitoring: BetterUptime, UptimeRobot, Pingdom
- [ ] Logs: CloudWatch, Datadog, Loki, or hosted (Axiom, BetterStack)
- [ ] APM (application performance monitoring): Datadog, New Relic, Sentry Performance
- [ ] Alertas configuradas (Slack, email, PagerDuty)

### Secrets management
- [ ] Env vars, nunca en el repo
- [ ] `.env.example` en el repo con placeholders
- [ ] Secrets manager en producción (AWS Secrets Manager, Doppler, Vault, Infisical)
- [ ] Rotación periódica de secrets sensibles

---

## Capa 5 — Testing

### Tipos y proporción sugerida (pirámide clásica)
- **Unit tests:** 70% — funciones puras, lógica de negocio
- **Integration tests:** 20% — endpoints + DB de prueba
- **E2E tests:** 10% — flujos críticos del usuario

### Herramientas por lenguaje
| Lenguaje | Unit | E2E |
|---|---|---|
| JS/TS | Vitest, Jest | Playwright, Cypress |
| Python | pytest | Playwright (Python) |
| Rust | `cargo test` + proptest | Playwright vía FFI |
| Go | `go test` + testify | Playwright vía HTTP |

### Cobertura razonable
- Código de negocio crítico: **80%+**
- Código de infraestructura: **60%+**
- UI: **40–60%** (E2E cubre el resto)
- **Anti-patrón:** perseguir 100% cobertura → tests débiles solo para el número

### Testing avanzado
- [ ] Property-based testing (proptest, hypothesis, fast-check) — excelente para validar identidades matemáticas
- [ ] Snapshot testing para componentes UI
- [ ] Contract testing (Pact) para microservicios
- [ ] Load testing (k6, Locust, Artillery) antes de lanzamientos grandes
- [ ] Security scanning (Snyk, Dependabot, Trivy)

---

## Capa 6 — Arquitectura

### Patrones generales
- [ ] **Monolito modular** — default para equipos <10 devs. Un solo repo, un solo deploy, pero módulos con boundaries claros. Más fácil de mantener que microservicios prematuros.
- [ ] **Microservicios** — solo si tenés equipo por servicio, o servicios con escalado independiente real
- [ ] **Serverless** — funciones aisladas, workflows event-driven, no siempre más barato
- [ ] **JAMstack / static-first** — sitios de contenido, blogs, docs
- [ ] **Edge-first** — apps globales que requieren baja latencia (Cloudflare Workers, Vercel Edge)

### Comunicación entre servicios (si aplica)
- [ ] REST/GraphQL sincrónico — simple, débil bajo carga
- [ ] gRPC — performance, contratos estrictos
- [ ] Event bus (Kafka, RabbitMQ, NATS, SQS) — asíncrono, resiliente, curva alta

### Caching
- [ ] HTTP cache (CDN, Cloudflare)
- [ ] Application cache (Redis, Memcached)
- [ ] Query cache (React Query, SWR en frontend; row-level cache en backend)
- [ ] Reglas: cache invalidation is one of the two hard problems in CS — pensar antes de agregar

### Data flow
- [ ] Diagrama de arquitectura actualizado (aunque sea a mano)
- [ ] Documentación de flujos críticos (login, checkout, cálculo principal)
- [ ] Decisiones documentadas (ADR — Architecture Decision Records)

### Escalabilidad — cuándo pensarla
- **<1000 usuarios:** no pensar en escalabilidad, pensar en velocidad de iteración
- **1k–10k:** empezar a monitorear DB queries, agregar cache básico
- **10k–100k:** replicas de lectura, background jobs asíncronos, revisar N+1
- **>100k:** particionamiento, sharding, considerar CQRS/event sourcing
- **Anti-patrón:** premature optimization — nadie llegó a 100k por casualidad

---

## Gaps críticos comunes por tipo de proyecto

### SaaS multi-tenant
- Autenticación robusta (roles, permisos, teams)
- Aislamiento de datos por tenant (schema-per-tenant, row-level security)
- Billing (Stripe, Paddle, Lemon Squeezy)
- Audit log
- Rate limiting por tenant

### App interna / dashboard
- Auth simple (SSO si empresa lo pide)
- CRUD generation (retool, admin UIs)
- Reporting / export a Excel/PDF
- Menos foco en performance, más en velocidad de features

### Desktop app (Tauri, Electron)
- Auto-updater
- Firma de código para distribución
- Almacenamiento local (SQLite común)
- Sync opcional con backend cloud
- Empaquetado por OS (Windows installer, macOS DMG, Linux AppImage)

### App offline-first (RadFlow, PWA)
- Service Worker + cache strategies
- IndexedDB o SQLite (via wasm)
- Sync cuando hay conexión
- Conflict resolution strategy
- Tests en modo offline

### API pública
- Versionado (v1, v2 en URL o header)
- Documentación (OpenAPI/Swagger, Postman collection)
- Rate limits + tiers
- SDK clients (o al menos ejemplos en 3+ lenguajes)
- SLA + status page

---

## Anti-patrones frecuentes

1. **Microservicios prematuros** — 3 devs con 8 servicios = infierno
2. **Reinventar autenticación** — usar Clerk, Auth0, Supabase Auth
3. **Postgres para todo, incluyendo cache** — Redis existe por una razón
4. **Tests que solo cubren happy path** — el 20% raro es el que rompe producción
5. **Sin monitoring hasta que se rompe** — barato agregarlo temprano, caro debuggearlo tarde
6. **Bundle frontend de 5MB** — Lighthouse existe y es gratis
7. **SQL crudo con string concatenation** — SQL injection en 2026 es inexcusable
8. **Migraciones que corren desde el startup del server** — race condition en producción
9. **Un solo dev sabe cómo desplegar** — bus factor = 1
10. **Copiar código entre proyectos en lugar de crear librería/paquete** — deuda técnica compuesta

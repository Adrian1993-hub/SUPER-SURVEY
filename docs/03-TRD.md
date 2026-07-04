# SuperSurvey — TRD (Technical Requirements Document)

> **Documento técnico.** Define *cómo* se construye lo del `02-PRD.md`. Alineado con el Decision
> Log y los Principios de arquitectura (`00-ULTRAPLAN §2–§3`). Datos en `05-esquema-backend.md`.
> Versión: **v0.1** · 2026-06-09.

---

## 1. Stack (decisión bloqueada)

| Capa | Tecnología | Rol |
|---|---|---|
| **Kernel de cálculo** | **Rust** (`rust_decimal`) | Cálculo oficial puro, sin red, decimal exacto, con trace. |
| **Dominio / persistencia** | **Rust** + **SQLite** | Reglas de negocio, modelos, repositorios. UUID en PKs. |
| **App / IPC** | **Tauri** | Empaqueta el binario, expone comandos al frontend. |
| **UI** | **TypeScript** (React + Shadcn*) | Solo presentación y captura. *(framework UI a confirmar en fase de diseño; Shadcn es la recomendación)* |
| **Branding** | `branding/brand.toml` + capa de tema | White-label. |

> El cálculo oficial vive **solo en Rust**. TypeScript **nunca** calcula cantidades oficiales.

---

## 2. Principios de arquitectura (no negociables)

1. **El cálculo oficial vive SOLO en Rust** (kernel puro, sin red). TS es solo UI.
2. **Decimal exacto** (`rust_decimal`), nunca `f64`. En la **frontera IPC los números viajan como
   strings** (string-in / string-out).
3. **SQLite local**, sin ORM pesado (no Prisma). **UUID** en PKs. **`calculation_logs` inmutable**
   (append-only, protegido por triggers).
4. **Trazabilidad total:** cada cantidad se explica paso a paso (trace con UUID + versión del motor).
5. **QA-case-driven:** cada cálculo tiene un test contra un número real conocido.
6. **PDF / XLSX / JSON** son salidas de primera clase.
7. **Branding y tema desde config:** ningún archivo hardcodea el nombre del producto.

---

## 3. Arquitectura (capas y flujo)

```
┌──────────────────────────────────────────────────────────────┐
│  UI (TypeScript)  — captura, navegación, presentación         │
│     ▲   números como STRING                                   │
│     │   (string-in / string-out)                              │
│  ── Tauri IPC (comandos) ──────────────────────────────────── │
│     │                                                          │
│  App (Rust/Tauri)  — orquesta comandos                        │
│     ├─ Domain (Rust)        reglas, perfiles, operaciones      │
│     ├─ Calc Kernel (Rust)   decimal, VCF/WCF, trace  ← PURO    │
│     └─ Persistence (Rust)   SQLite, repos, migraciones        │
│            │                                                   │
│         SQLite (local)  + calculation_logs (append-only)      │
└──────────────────────────────────────────────────────────────┘
                         │
        Export: PDF · XLSX · JSON técnico (con branding/tema)
```

**Workspace Rust objetivo** (`00-ULTRAPLAN §4`):
```
crates/
  kernel/        # cálculo puro (decimal, ASTM/API, trace) — sin I/O, sin red
  domain/        # entidades, reglas por operación, comparison engine
  persistence/   # SQLite, repositorios, migraciones, validación de schema
  app/           # Tauri: comandos IPC, wiring, branding
ui/              # frontend TypeScript
branding/        # brand.toml + temas
```
> Hoy existe `rust-kernel/supersurvey_calc/` + `rust-kernel/schema/`; se migrará al workspace `crates/`.

---

## 4. Kernel de cálculo (Rust)

### 4.1 Requisitos
- **TR-CALC-1:** Aritmética **decimal** (`rust_decimal`) en toda la cadena. Prohibido `f64` en cálculo oficial.
- **TR-CALC-2:** **Implementar por ecuaciones** (API MPMS Ch. 11.1) VCF/WCF/densidad; **NO** reusar `calcnative.dll`.
- **TR-CALC-3:** Soportar **todas las versiones/revisiones** de tablas ASTM/API (D1250-80 / -04/07/08/19; Tablas 6A/6B/6C/6D/6E, 24, 53/54, 56, 59/60, etc.); el surveyor elige la aplicable. Validar contra valores de `TABLASASTM.xls`. *(Set exacto de versiones: en investigación.)*
- **TR-CALC-4:** **Sin redondeo intermedio**; redondear solo el resultado final. `aggregate_from_unrounded` debe respetarlo y ser **seleccionable** desde el DTO/UI.
- **TR-CALC-5:** **Trace** estructurado por cantidad: cada paso (entrada, tabla/versión, factor, salida) con UUID y versión del motor.
- **TR-CALC-6:** **MT en aire y en vacío** (oficial = aire). Política de densidad "falla fuerte" (sin densidad válida → error, no silencio).
- **TR-CALC-7:** **Draft Survey** por desplazamiento/hidrostáticas (ruta separada; fórmulas validadas en `/reference`).

### 4.2 Cadena canónica (custody transfer)
```
medición (ullage/sounding)
  → volumen de tabla del barco (INGRESADO por el surveyor; la app no calcula la tabla)
  → corrección por trim/list (Applied / Not Applied = verificación del inspector)
  → TOV → (− agua libre / FW) → GOV
  → × VCF (Tabla 54/6 según producto y T) → GSV @ 15 °C/60 °F
  → × densidad / WCF (Tabla 56) → Toneladas Métricas (aire y vacío)
```

### 4.3 Hardening pendiente (auditoría 2026-06-06, `00-ULTRAPLAN §9`)
- [ ] WCF→MT placeholder en `quantity_chain.rs`: derivar/validar unidad de salida (bloquea export oficial).
- [ ] `calculate_movement_set`: validar `product_id` entre tanques (no sumar productos distintos).
- [ ] Unificar `MovementRole` (kernel) vs `movement_sign_rule` (schema); soportar `CUSTOM`.
- [ ] Exponer `aggregate_from_unrounded` en el DTO (hoy fijo en `false`).
- [ ] Unificar versionado (Cargo / lib / schema / seed) a **una sola fuente**.
- [x] CI: toolchain fijado (`rust-toolchain.toml`). Falta caché de dependencias.

---

## 5. Frontera IPC (Tauri)

- **TR-IPC-1:** Comandos Tauri tipados; **números como string** en ambos sentidos.
- **TR-IPC-2:** El frontend envía entradas crudas; el kernel devuelve resultado **+ trace** (string/JSON).
- **TR-IPC-3:** Allowlist de Tauri **mínima** (solo los comandos necesarios); sin APIs de sistema no usadas.
- **TR-IPC-4:** Validación de entrada en el borde Rust (no confiar en el cliente).

---

## 6. Persistencia (SQLite)

- **TR-DB-1:** SQLite local; migraciones versionadas; **sin Prisma**.
- **TR-DB-2:** **UUID** (texto) en PKs; números decimales **como texto** (consistencia con IPC/kernel).
- **TR-DB-3:** `calculation_logs` **append-only**, protegido por **triggers** (no UPDATE/DELETE).
- **TR-DB-4:** Validación de esquema en CI (hoy: 37 tablas / 2 vistas / 24 índices / 2 triggers).
- **TR-DB-5:** La app **no almacena tablas de calibración**; guarda `calibration_table_date` + referencia.
- Detalle de entidades: `05-esquema-backend.md`.

---

## 7. Frontend (TypeScript)

- **TR-UI-1:** Framework SPA (React recomendado) con **Shadcn** como design system (ver fase UI/UX).
- **TR-UI-2:** **Sin lógica de cálculo oficial**; toda cantidad viene del kernel vía IPC.
- **TR-UI-3:** Captura **pareada/horizontal por tanque**; validación en vivo (rangos, faltantes).
- **TR-UI-4:** **Bilingüe ES/EN** (i18n); strings fuera de código.
- **TR-UI-5:** Estado offline; persistencia vía IPC→SQLite (no almacenamiento de verdad en el navegador).

---

## 8. White-label e i18n

- **TR-WL-1:** Única fuente de marca: `branding/brand.toml` (nombre, empresa, logo, colores, contacto, encabezado/pie de reporte, metadatos PDF). Semilla: `app_settings` (key/value) + `inspectors.signature_image_path`.
- **TR-WL-2:** **Tema** separado de la marca (montajes visuales en fase de diseño).
- **TR-WL-3:** El rebranding llega **hasta los reportes** sin tocar código.
- **TR-I18N-1:** ES/EN en UI; (P) `SecondaryReportingLanguage` para reportes bilingües (como el legacy).

---

## 9. Reportes y export

- **TR-RPT-1:** Motor de reportes que rellena plantillas → **PDF / XLSX**; **JSON técnico** con el trace.
- **TR-RPT-2:** Plantillas: VMR, BMR, Shore, Summary, SOF (MVP); NOAD, LOP, Quantity Certificate, B/L, OBQ/ROB, VEF, Time Log (post).
- **TR-RPT-3:** Branding/tema aplicado a encabezado, pie, logo y metadatos del archivo.
- **TR-RPT-4:** Firma electrónica configurable (`UseESignature`, imagen de firma del inspector).

---

## 10. Seguridad (incremental, no al final)

| Cuándo | Control |
|---|---|
| **Cada fase / PR** | `cargo audit` / `cargo deny` (CVEs Rust); `npm audit`; revisar allowlist + **CSP** de Tauri (mínimo privilegio); **secret-scanning**; validación de entrada en el borde Rust. |
| **Datos en reposo** | Datos de cliente/carga son confidenciales → **cifrado SQLite (SQLCipher)**; **sin PII en logs**; sin datos reales en el repo. |
| **Hitos** | Correr `/security-review` sobre el diff. |
| **Antes de distribuir** | Revisión a fondo + pin de dependencias + **firma de binarios** + DevTools deshabilitado en producción. |

Opcional: automatizar `cargo audit` + `npm audit` + secret-scan vía hook/CI (pendiente de decisión del usuario).

---

## 11. Testing y CI

- **TR-CI-1:** **QA-case-driven**: cada cálculo con test contra número real conocido (caso ancla BQS).
- **TR-CI-2:** GitHub Actions: `fmt` + `clippy` + `test` + **validación de schema** (el dev no compila localmente).
- **TR-CI-3:** `rust-toolchain.toml` fijo; añadir caché de dependencias.
- **TR-CI-4:** Sin red en tests del kernel (pureza garantizada).

---

## 12. Requisitos no funcionales (NFR)

| # | NFR | Objetivo |
|---|---|---|
| NFR-1 | Offline-first | 100% de la operación sin red. |
| NFR-2 | Exactitud | Decimal exacto; igualar caso QA real dentro de tolerancia. |
| NFR-3 | Trazabilidad | Trace completo + logs inmutables. |
| NFR-4 | Seguridad | Cifrado en reposo; allowlist mínima; sin PII en logs. |
| NFR-5 | Portabilidad | Tauri multiplataforma; sin atadura a DLL nativa Windows. |
| NFR-6 | Rendimiento | Captura/recalculo fluido por tanque (sin lag perceptible). |
| NFR-7 | Mantenibilidad | Workspace por crates; una sola fuente de versión. |
| NFR-8 | i18n | ES/EN; reportes bilingües (post). |

---

## 13. Decisiones abiertas

- Framework UI exacto (React + Shadcn recomendado) — se cierra en fase UI/UX.
- Set exacto de **versiones de tablas ASTM** a incluir (*en investigación*).
- Estrategia de migraciones SQLite (herramienta) y de cifrado (SQLCipher vs alternativa).
- Automatización de seguridad en CI (pendiente de visto bueno).

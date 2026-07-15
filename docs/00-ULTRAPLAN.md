# SuperSurvey — Ultraplan (Plan Maestro)

> **Documento maestro.** Reemplaza cualquier plan anterior. El prototipo .NET/WPF queda
> únicamente como referencia histórica en `/reference`.
> Última actualización: **2026-06-29** (F0–F5 completas; en F6 — empaque/QA; instaladores v0.1.0 generados).

---

## 1. Objetivo del producto

**SuperSurvey convierte la medición física del surveyor en cantidad calculada, comparación
defendible y documento firmable — todo offline.**

El programa **no reemplaza** al surveyor: él sigue midiendo tanques, tomando muestras,
verificando líneas y validando densidades/temperaturas. El programa hace la parte donde hoy
se pierde tiempo y se cometen errores con Excel/LEGACY/legacy:

1. **Recibe** los datos de campo + los externos (BDN, B/L, terminal).
2. **Calcula** exacto y con trazabilidad (se ve cómo salió cada número).
3. **Compara** las fuentes (barge ↔ vessel ↔ shore ↔ BDN/BL).
4. **Detecta** discrepancias y avisa.
5. **Genera** los reportes firmables (VMR, BMR, Shore, Summary, SOF, NOAD, LOP) en
   **PDF/XLSX bonitos** — los mismos que hoy se imprimen y firman las partes.

Y debe poder **revenderse con otra marca** (white-label).

---

## 2. Decisiones bloqueadas (Decision Log)

| Fecha | Decisión | Estado |
|---|---|---|
| 2026-06-06 | **Stack:** Rust (kernel) + Tauri + TypeScript + SQLite, offline-first | ✅ |
| 2026-06-06 | **Repo canónico único:** `super-survey` (Codex-Playroom consolidado aquí) | ✅ |
| 2026-06-06 | **Operación MVP:** BQS (Bunker Quantity Survey) | ✅ |
| 2026-06-06 | **Motor de cálculo:** reimplementar estándares (API MPMS) en Rust, validados contra casos reales. **NO** reusar `calcnative.dll` (caja negra, no portable, no auditable) | ✅ |
| 2026-06-06 | **Caso QA ancla de BQS:** el caso BQS de referencia | ✅ |
| 2026-06-06 | **White-label desde el día 1** (capa de branding + tema) | ✅ |
| 2026-06-06 | Prototipo .NET/WPF → archivado en `/reference` (solo referencia) | ✅ |
| 2026-06-06 | **Nombre del producto = configurable** vía `branding/brand.toml` (white-label). Codename interno: `SuperSurvey`. Renombrar (p. ej. a `YOLO.EXE`) **no toca el motor** | ✅ |
| 2026-06-06 | **App NO gestiona tablas de calibración** (buque/tierra): son externas. El surveyor obtiene el volumen de la tabla física y **ingresa el volumen**; la app solo **registra la fecha de calibración** de la tabla usada (trazabilidad en el reporte) | ✅ |
| 2026-06-06 | **Tablas de cálculo ASTM/API** (VCF/WCF/densidad): incluir **TODAS las versiones/revisiones** (vieja/nueva, como LEGACY); el surveyor elige la aplicable. Implementar por **ecuaciones (API MPMS 11.1)** y validar vs valores de `TABLASASTM.xls`. *(Versiones: en investigación)* | ✅ |
| 2026-06-06 | **Sin redondeo intermedio:** redondear solo el resultado final (handbook la inspectora p.62). La política de agregación del kernel (`aggregate_from_unrounded`) debe respetarlo | ✅ |
| 2026-06-06 | **Convenciones BQS (surveyor):** densidad única por fuente; calcular **MT aire Y vacío** (oficial = aire); **tolerancia en capas configurable** (ISO default + comprador/suplidor/inspección/contrato); **trim Applied/Not Applied** = verificación del inspector (barcazas normalmente no); incluir bloque **"Quantity Transferred"** | ✅ |
| 2026-07-10 | **Bilingüe ES/EN** (F7): i18n propio, offline, sin dependencias (`LanguageProvider` + diccionario co-localizado + `useT`); español = lengua de origen, inglés = traducción; selector en Configuración. Se **elimina la jerga interna** de la interfaz (kernel/WASM/Rust → «motor de cálculo») | 🔄 |
| 2026-07-10 | **Descarga de LNG** (F8): operación nueva por **energía**. Cálculo **completo** — densidad **RKM** (GIIGNL CTH) *y* GHV/Wobbe (ISO 6976/GPA 2172) **desde composición**. **Página nueva dedicada** «LNG (descarga)» (no se mezcla con LPG). Constantes oficiales **citadas, nunca inventadas** | 🔄 |

---

## 3. Principios de arquitectura (no negociables)

1. **El cálculo oficial vive SOLO en Rust** (kernel puro, sin red). TypeScript es solo UI.
2. **Decimal exacto** (`rust_decimal`), nunca `f64` en el cálculo. En la frontera IPC, los
   números viajan como **strings** (entran y salen como texto).
3. **SQLite local**, sin Prisma. **UUID** en las PKs. **`calculation_logs` inmutable**
   (append-only, protegido por triggers).
4. **Trazabilidad total:** cada cantidad se puede explicar paso a paso (trace con UUID y
   versión del motor).
5. **QA-case-driven:** cada cálculo tiene un test contra un número real conocido.
6. **PDF / XLSX / JSON** son salidas de primera clase.
7. **Branding y tema desde config:** ningún archivo hardcodea el nombre del producto.

---

## 4. Arquitectura (capas y flujo)

```
Cover / Job Setup            (fuente maestra: quién, qué, dónde, partes, fechas)
        ↓
Profiles                     (vessel · barge · terminal · calculation · tolerance) reutilizables
        ↓
Paired Measurements          (opening/closing · before/after en UNA vista horizontal por tanque)
        ↓
Calculation Kernel (Rust)    (volumen → VCF → GSV → densidad/WCF → MT, todo decimal + trace)
        ↓
Live Summary + Comparison    (suma por fuente y compara: barge vs vessel vs BDN/BL)
        ↓
Reports                      (VMR · BMR · Shore · Summary · SOF · NOAD · LOP)
        ↓
Export                       (PDF · XLSX · JSON técnico)  — con branding/tema
```

**Estructura del repo (actual → objetivo):**

```
super-survey/
├─ rust-kernel/
│  ├─ supersurvey_calc/         # kernel de cálculo (Rust, decimal, tests)  [HOY]
│  └─ schema/                   # esquema SQLite endurecido                 [HOY]
├─ .github/workflows/           # CI: fmt + clippy + test + valida schema   [HOY]
├─ docs/                        # plan, doctrina operativa, análisis        [HOY]
├─ reference/                   # prototipo .NET/WPF (solo referencia)      [HOY]
├─ .claude/skills/              # skills de desarrollo (grill-me, diagnose) [HOY]
│  (objetivo →)
├─ crates/                      # workspace Rust: kernel · domain · persistence · app(Tauri)
├─ ui/                          # frontend TypeScript
└─ branding/                    # marca + temas (white-label)
```

---

## 5. Modelo de cálculo BQS (la "columna" horizontal por tanque)

Este es el patrón **canónico** que reutilizan STS y Terminal (con variaciones):

```
medición (ullage/sounding)
   → volumen de tabla del barco (calibración)
   → corrección por trim/list
   → TOV (Total Observed Volume)
   → (− agua libre / FW)
   → GOV (Gross Observed Volume)
   → × VCF (Table 54/6, según producto y T)
   → GSV (Gross Standard Volume @ 15 °C/60 °F)
   → × densidad / WCF
   → Toneladas Métricas (en aire y en vacío)
```

Luego se **suma por fuente** y se **compara**: `Barge Delivered` vs `Vessel Received` vs `BDN`.
Draft Survey es la excepción: ahí el cálculo viene de **desplazamiento/hidrostáticas**, no de
volumen × densidad (ver `/reference` para las fórmulas ya validadas: un draft survey real = 2409.733 MT).

---

## 6. Roadmap por fases (con % y tiempo)

| Fase | Entregable | Estado |
|---|---|---|
| **F0 — Organización** | Consolidar repo, plan maestro, handoff, skills, auditoría | ✅ completa |
| **F1 — Doctrina + Kernel BQS validado** | doctrina BQS + cálculo BQS en Rust validado vs caso real + hardening | ✅ completa (2–3 nits de §9 abiertos) |
| **F2 — Persistencia + Comparison + IPC** | SQLite (crear/listar/guardar/cargar/hidratar) + comparison NOAD/LOP + comandos Tauri | ✅ completa |
| **F3 — UI BQS de punta a punta** | Cover, Profiles, grid pareado, live summary | ✅ completa |
| **F4 — Report engine + white-label** | VMR/BMR/Summary/SOF → PDF/XLSX con branding + branding runtime | ✅ completa |
| **F5 — Resto de operaciones** | Terminal, STS, **LPG** (custody+COSTALD+vapor), Draft, **Blend**, multigrado, VEF, muestreo, ROB | ✅ completa y ampliada |
| **F6 — QA + empaque + marca** | ~152 tests vs casos reales; **instaladores CI** (build v0.1.0 ✅); pase de diseño + licencias + updater + seguridad | ✅ prácticamente completa |
| **F7 — Bilingüe ES/EN** | i18n offline (LanguageProvider + diccionario co-localizado + `useT` + selector en Configuración); `<html lang>` + persistencia `ss-lang` | ✅ **completa** — TODA la interfaz: chrome, Configuración, Dashboard, Utilidades, Trabajos, flujo 7/7, reportes 3/3 (ROB/Smart/LNG) y operaciones (Multigrado, Draft, Ship↔Shore, LPG, Blend, LNG + paneles VEF/Sampling). Verificado con barrido Playwright EN en 8 rutas, 0 errores. Pendiente menor: etiquetas internas de archivos XLSX/JSON exportados |
| **F9 — Asistente IA local (opt-in)** | sidecar Ollama + analizador de equipo (RAM/CPU/disco medidos) + advertencia de consumo; **el usuario decide** en el primer arranque (cambiable en Configuración); chat consultivo con guardarraíl "sin cifras oficiales"; página /asistente + i18n ES/EN | 🔄 **F8.1 PoC implementado** (2026-07-15) — modelo/módulo jamás en el instalador, descarga opt-in (~2–3 GB, phi4-mini sugerido). Pendiente: RAG con citas (sqlite-vec), evaluación con inspectores |
| **F8 — Descarga de LNG** | operación nueva (custody por **energía**): densidad **RKM** (GIIGNL CTH) + GHV (ISO 6976/GPA 2172) + cadena de energía; página + reporte | 🔄 casi — análisis ✅; **cálculo desde composición** (densidad RKM, GHV masa, energía) ✅ 9 anclas vs reporte real (densidad 426.0, masa 65 539 461 kg, neta 3 424 985 MMBtu); **DTO+IPC+WASM+TS** ✅; **página «LNG (descarga)»** (cálculo en vivo) + **reporte imprimible** ✅ — funcional en escritorio. Pendiente: tablas de temperatura GIIGNL `Vi(T)/K1/K2` (densidad auto por T) + Wobbe/GHV-volumen; reconstruir el `.wasm` del demo web; i18n del cuerpo |

- **% del sistema completo hoy:** **~97 %** del plan original (actualizado 2026-07-04; el plan original marcaba ~10 % en el día 0). **F7 (bilingüe)** y **F8 (descarga de LNG)** son **ampliaciones nuevas** pedidas después de cerrar el alcance original — en curso (ver §10).
- **MVP BQS punta a punta (F1–F4):** ✅ hecho. **Resto de operaciones (F5):** ✅ hecho y ampliado.
- **Cierre (F6):** casi completo. Hecho: **§9 cerrado** (`8ac0824`); **pase de diseño** completo con QA visual (matriz 3 estéticas × claro/oscuro, sistema de estado tokenizado, tablas/inputs densos canónicos, flujo guiado con stepper, chrome de reporte compartido, módulo **Configuración** + **Acerca de**); **licencias** Ed25519 (keygen aparte + validación suave); **updater** firmado (config + CI + runbook); **seguridad** (cálculo desktop por IPC sin WASM extraíble, perfil release endurecido, audits) y **limpieza white-label** (rastros OGC/SAT anonimizados); **docs**: guía de usuario, requisitos mínimos medidos, análisis IA offline (F8). **Pendiente real:** publicar el release firmado, firma de código Win/Mac (certificados propios), e integrar el plugin runtime del updater (4 pasos, requieren entorno desktop — `docs/actualizaciones.md`).

---

## 7. White-label (el "camino oculto")

- **Una sola capa de marca** (`branding/`): nombre del producto, empresa, logo, colores,
  encabezado/pie de reporte, metadatos del PDF, datos de contacto.
- **Nada** hardcodea "SuperSurvey"; todo se lee de esa config. "SuperSurvey" es solo el
  **nombre clave interno** de desarrollo.
- **Sistema de temas separado** de la marca (para los montajes visuales que se decidirán en
  la fase de diseño).
- El cambio de marca debe llegar **hasta los reportes** (PDF/XLSX) sin tocar código.
- Semilla ya presente: tabla `app_settings` (key/value) + `inspectors.signature_image_path`
  en el esquema SQLite. Falta construir la capa de config/tema real.

---

## 8. Estrategia anti-riesgo

1. **Kernel validado contra casos reales primero** (la matemática debe dar el número exacto
   de un reporte real antes de construir UI encima).
2. **Doctrina operativa antes que UI** (definir qué hace cada operación y qué documento
   produce, para no construir algo que compila pero no sirve en campo).
3. **Documentos persistentes** (`docs/`) para no perder el hilo entre sesiones de IA.
4. **CI verde por GitHub Actions** (el desarrollador no puede compilar localmente por
   bloqueos de administrador; el repo se valida en la nube).

---

## 9. Hardening pendiente del kernel (de la auditoría 2026-06-06)

- [x] WCF→MT resuelto: Tabla 56 implementada por ecuación (`astm`), unidad derivada (GSV m³ × WCF t/m³ = MT aire; densidad → MT vacío) y validada contra hoja BQS real (2026-06-09).
- [x] `calculate_movement_set` valida `product_id` entre tanques → warning `MIXED_PRODUCT` (commit `8ac0824`).
- [x] `MovementSignRule` unifica el signo (fuente única) con soporte `CUSTOM` explícito; `MovementRole::implied_sign_rule()` las cablea. DTO + export WASM `movement_set_calculate` + wrapper TS (commit `8ac0824`).
- [x] `aggregate_from_unrounded` expuesto en `MovementSetRequestDTO` (commit `8ac0824`).
- [x] Versiones de app/crates unificadas a **0.1.1** (persistence, wasm, src-tauri, tauri.conf, package.json); el esquema SQL conserva su pista propia (versiona la BD, no la app) (commit `8ac0824`).
- [x] `rust-toolchain.toml` en la raíz (pin 1.94.1); caché de cargo ya presente en el workflow de release (commit `8ac0824`).

---

## 10. Estado actual y próximos pasos inmediatos

> **Actualizado 2026-07-10.** F0–F6 completas/casi; en curso dos ampliaciones
> nuevas: **F7 bilingüe ES/EN** y **F8 descarga de LNG**.

**F7 — Bilingüe (en curso).** i18n casero y offline (sin dependencias):
`ui/src/i18n/` con `LanguageProvider` (contexto `{lang, setLang, t}`, persiste
`ss-lang`, sincroniza `<html lang>` + bootstrap anti-flash), diccionario
co-localizado ES/EN partido por área (`dict.ts` núcleo + `dict.flow/operations/
reports.ts`), hook `useT()`. Selector de idioma en Configuración junto a
tema/fuente/densidad. **Traducido y verificado (Playwright, ES↔EN):** barra
lateral, stepper, TopBar, siguiente-paso, barrera de errores, ThemeSwitcher,
badges de estado, **Configuración**, **Dashboard**, **Utilidades**, **Lista de
trabajos**. **Pendiente:** páginas de operación (Cover…Reporte, Multigrado,
Draft, Ship↔Shore, LPG, Blend, ROB) y reportes — por lotes, con clave ausente →
cae a español (nunca rompe).

**F8 — Descarga de LNG (en curso).** Operación nueva: el LNG se factura por
**energía**, calculada desde la composición molar (no medida). Análisis completo
en `docs/research/lng-discharge.md` (método, estándares, fórmulas validadas,
estructura de reporte de ~16 secciones, alcance en 5 fases). **Hecho — F-LNG-1a
(núcleo de cálculo):** `rust-kernel/.../lng.rs` decimal-exacto — masas molares
ISO 6976, densidad **RKM** `D=Σ(Xi·Mi)/[Σ(Xi·Vi)−Xm·C]`, cadena masa→energía
bruta/neta; **6/6 anclas verdes** contra un reporte real (anonimizado).
**Decisiones del usuario:** cálculo **completo** (densidad *y* GHV desde
composición) y **página nueva dedicada** «LNG (descarga)».
**Hecho además:** GHV(masa) + densidad **desde composición** (Hi/Vi del reporte,
citados) — 9 anclas; **DTO+WASM+IPC**, wrapper TS `lngDischarge()`, **página
«LNG (descarga)»** con cálculo en vivo (ruta + sidebar), y **reporte imprimible**
(`LngReport` + `data/lng.ts`). Funcional en escritorio; el demo web muestra aviso
"escritorio" hasta reconstruir el `.wasm`. **Siguiente (refinamientos):** tablas
de temperatura GIIGNL `Vi(T)/K1/K2` (densidad auto por composición+temperatura) +
`Hvi/√bi/Zmix` (Wobbe/GHV-volumen), citadas; reconstruir el `.wasm` del demo;
i18n del cuerpo de las páginas LNG.

**Cierre F6 pendiente (owner):** publicar el Release firmado (crea el tag),
firma de código Win/Mac, e integrar el plugin runtime del updater
(`docs/actualizaciones.md`). Re-disparar el build para incluir los últimos
commits (legibilidad, jargon, bilingüe).

**Auditoría documental 2026-07-15.** A petición del usuario ("actualízalos y
estudia si están bien"), se revisaron y actualizaron **PRD, TRD, App Flow y
Esquema de Backend** contra el código/esquema real (no contra lo que decían
los docs). Hallazgo importante: **`05-esquema-backend.md` describía un
modelo conceptual de v0.1 (2026-06-09) que nunca coincidió con el esquema
físico real** (`supersurvey_sqlite_schema_v0_1_3_1_hardened.sql`) — nombres
de tabla distintos en casi todas las áreas (p. ej. `tank_readings`→
`measurement_records`, `comparisons`→`comparison_results`, `reports`→
`report_templates`/`…_packages`/`…_exports`). Se reescribió §2–§8 de ese
documento verificando cada tabla línea por línea contra el `.sql`. Gaps
reales confirmados (no de los docs, del producto): **Key Meeting, VEF y
Sampling/Quality no tienen tabla propia** — son solo UI sin persistencia
(`VefPanel.tsx`, `SamplingPanel.tsx`). También se corrigió una afirmación
repetida en PRD/TRD/appflow ("la app no guarda tablas de calibración") que
contradecía el esquema real (`calibration_tables`/`calibration_points` sí
persisten, interpolables) — la decisión bloqueada en sí se mantiene: el
surveyor siempre ingresa la lectura de campo.

---

### Historial previo (F6)

> **Actualizado 2026-06-29.** F0–F5 completas; estamos en **F6 (QA + empaque)**.

**Hecho:** kernel decimal-exacto validado — BQS/ASTM D1250, LPG custody + **COSTALD CTL** + corrección de vapor (API 17.10.2), **blend de fuel oil** (Refutas + índices flash/pour), draft survey, ship↔shore, VEF, muestreo, multi-unidad — con **~152 tests** contra casos reales; UI completa del flujo + guía de diseño `/design` + 3 temas; **persistencia** SQLite (escritorio) / localStorage (demo) con crear/listar/guardar/cargar/hidratar; **branding en runtime** (`brand.json` sin recompilar); **empaquetado** — CI de release + config Tauri, con el **primer build de instaladores v0.1.0 exitoso** (borrador de Release listo para publicar).

**Siguiente (cierre F6):**
1. **Publicar** el Release **v0.1.0** (eso crea el tag) tras revisar los instaladores.
2. **Firma de código** (certificados Win/Mac como secrets) + auto-updater (opcional).
3. ~~QA visual~~ ✅ hecho: pase de diseño completo + harness `scripts/screenshot-themes.mjs` (36 capturas × 6 combinaciones + PDF de impresión revisados).
4. ~~Nits de §9~~ ✅ cerrados (ver §9).
5. **COSTALD cell-exact** (hoja `shore C3`) y refinamientos de Blend (cSt↔SFS, propiedades extra).

Ver `docs/CONTEXT.md` para el estado vivo y cómo retomar.

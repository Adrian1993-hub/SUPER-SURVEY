# SuperSurvey — Ultraplan (Plan Maestro)

> **Documento maestro.** Reemplaza cualquier plan anterior. El prototipo .NET/WPF queda
> únicamente como referencia histórica en `/reference`.
> Última actualización: **2026-06-06**.

---

## 1. Objetivo del producto

**SuperSurvey convierte la medición física del surveyor en cantidad calculada, comparación
defendible y documento firmable — todo offline.**

El programa **no reemplaza** al surveyor: él sigue midiendo tanques, tomando muestras,
verificando líneas y validando densidades/temperaturas. El programa hace la parte donde hoy
se pierde tiempo y se cometen errores con Excel/SAT/OGC:

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
| 2026-06-06 | **Motor de cálculo:** reimplementar estándares (API MPMS) en Rust, validados contra casos reales. **NO** reusar `firogcfn.dll` (caja negra, no portable, no auditable) | ✅ |
| 2026-06-06 | **Caso QA ancla de BQS:** EQUINOX MELIDA | ✅ |
| 2026-06-06 | **White-label desde el día 1** (capa de branding + tema) | ✅ |
| 2026-06-06 | Prototipo .NET/WPF → archivado en `/reference` (solo referencia) | ✅ |

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
volumen × densidad (ver `/reference` para las fórmulas ya validadas: MV BELLE PLAINE = 2409.733 MT).

---

## 6. Roadmap por fases (con % y tiempo)

| Fase | Entregable | Estado | Tiempo estimado |
|---|---|---|---|
| **F0 — Organización** | Consolidar repo, plan maestro, handoff, skills, auditoría | 🟡 en curso | — |
| **F1 — Doctrina + Kernel BQS validado** | `docs/operations/01-BQS.md` + cálculo BQS en Rust validado vs EQUINOX MELIDA + 6 fixes de hardening | ⏭️ siguiente | 2–4 sem |
| **F2 — Persistencia + Comparison + IPC** | SQLite cableado, comparison engine, comandos Tauri | ⏳ | 3–5 sem |
| **F3 — UI BQS de punta a punta** | Cover, Profiles, grid pareado, live summary | ⏳ | 4–6 sem |
| **F4 — Report engine + white-label** | VMR/BMR/Summary/SOF → PDF/XLSX con branding | ⏳ | 3–5 sem |
| **F5 — Resto de operaciones** | Terminal, STS, LPG, Draft (reusan el patrón) | ⏳ | 2–4 meses |
| **F6 — QA + empaque + marca** | casos reales, instaladores, branding final | ⏳ | 1–2 meses |

- **% del sistema completo hoy:** ~10 % (base técnica sólida; falta casi toda la operación).
- **MVP usable (BQS de punta a punta, F1–F4):** ~2–3 meses de trabajo iterativo.
- **Sistema amplio y robusto (todas las operaciones):** 6–12 meses.
- El siguiente **20 %** (doctrina + kernel validado) es el que **quita todo el riesgo**.

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

- [ ] WCF→MT es placeholder (`quantity_chain.rs`): derivar/validar la unidad de salida; no exportable como oficial hasta arreglarlo.
- [ ] `calculate_movement_set` no valida `product_id` entre tanques → puede sumar productos distintos. Añadir chequeo (error o warning).
- [ ] `MovementRole` (kernel) vs `movement_sign_rule` (schema) son dos fuentes de verdad. Cablearlas; soportar `CUSTOM`.
- [ ] DTO fija `aggregate_from_unrounded: false` → la política no es seleccionable desde la UI. Exponerla en el DTO.
- [ ] 4 versiones distintas (Cargo 0.1.1 / lib v0.1 / schema v0.1.3.1 / seed 0.1.3-FINAL). Unificar a una sola fuente.
- [ ] CI: fijar toolchain (`rust-toolchain.toml`) + caché de dependencias.

---

## 10. Estado actual y próximos pasos inmediatos

**Hecho hoy:** repo consolidado (kernel Rust + CI), prototipo .NET archivado, skills de dev
instalados, auditoría completa, plan maestro y handoff escritos.

**Siguiente:**
1. Recibir **EQUINOX MELIDA** (Excel lleno + PDF del reporte firmado).
2. Escribir la **doctrina BQS** (`docs/operations/01-BQS.md`).
3. Implementar el **cálculo BQS** en Rust validado contra EQUINOX MELIDA.
4. Aplicar los **6 fixes** de hardening.

Ver `docs/CONTEXT.md` para el estado vivo y cómo retomar.

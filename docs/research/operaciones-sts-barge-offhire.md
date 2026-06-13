# Operaciones STS, Barge Tow y Off‑Hire — análisis de reportes de referencia

> Material extraído de **5 archivos reales aportados por el cliente** (anonimizar números antes de
> usarlos en cualquier salida). Continúa `formato-bqs-imperial-multigrado.md`. Verificado con
> PyMuPDF (PDF), python‑docx/zip (DOCX) y openpyxl **incluyendo hojas/columnas ocultas** (XLSX).
>
> 1. `…STS_Mother_Load_MT_AS_SUWAYQ…pdf` — STS, buque madre **cargando** (crudo), 22 págs.
> 2. `…STS_Mother_Discharge_MT_KUFRA…pdf` — STS, buque madre **descargando** (NAPO crude), 33 págs.
> 3. `…BargeTow_Loading_BARGES…pdf` — carga de **barcaza** (CENTENARIO TRADER, MGO DMA), 16 págs.
> 4. `…BUDVA…OFF_HIRE_CERTIFICATE…docx` — **certificado de off‑hire** (redelivery) — la salida.
> 5. `…Bunker_Survey_OFF_HIRE_MV_SEA_BREEZE…xlsx` — hoja de **off‑hire** (cálculo + certificado).

---

## 1. El patrón común (vuelve a confirmarse)

Todas estas operaciones son **el mismo motor** que ya construimos + una comparación contra otra
referencia:

```
TCV por tanque (ullage→GOV→VCF→GSV→peso)   ← YA: astm / astm60 / bqs / bqs60
   → cifra de custodia (Gross → S&W → Net; OBQ/ROB)   ← NUEVO: S&W, OBQ
   → comparación vs referencia (B/L · Outturn · Shore · Shuttle · Log Book)  ← YA: comparison
   → reparto entre parcelas (Pro‑Rata)   ← NUEVO: apportion
   → VEF/VES   ← YA: vef
   → certificado / reporte multi‑unidad   ← parcialmente (reportes)
```

**Summary multi‑unidad** (todas las operaciones lo usan): cada cifra en **7 unidades** —
`bbl · bbl@60°F · MT(aire) · MT(vacío) · LT(aire) · gal@60°F · m³@15°C` — con `Total/Gross/Net` y
`Variance ±` y `%`. Ya modelamos el concepto (`comparacionUnidades` en `ui/src/data/vmr.ts`); el
kernel ya tiene `convert_volume/convert_weight`. Falta un ensamblador "una TCV → 7 unidades".

**Base de cálculo declarada (barge):** `ASTM D1250-80 - 1, 4, 11, 13, 56; D1250-19 6B` → usan
**ambas ediciones** a la vez (1980 para 1/4/11/13/56 + **2004** para 6B). Refuerza el selector de
edición que ya hicimos.

---

## 2. Conceptos NUEVOS a implementar

### 2.1 S&W (Sediment & Water) — crudo
`Net = Gross × (1 − S&W%/100)`; `S&W = Gross − Net`. Aplica a **todas** las unidades.
**Ancla real (KUFRA, S&W = 0.761 %):** Gross 725 379.63 bbl → Net 719 859.49 bbl; Gross 109 292.949
MT → S&W 831.720 → Net 108 461.229 MT. ✅ verificado.

### 2.2 OBQ / ROB — cantidad a bordo antes/después
`Loaded = Total_after − OBQ_before` (barcaza) y `Discharged = Total_before − ROB_after` (descarga).
Es la misma estructura apertura/cierre que ya tenemos en multigrado.
**Ancla real (barge):** After 6 917.32 bbl − OBQ 2 409.74 = **Loaded 4 507.58 bbl**; en MT
925.953 − 321.845 = **604.108**. ✅ El *Tank Inspection* (OBQ/ROB) es un registro de clingage, no cálculo.

### 2.3 Pro‑Rata — reparto entre parcelas
Cuando hay **varios B/L** (KUFRA: "2 Bill of Lading issued"), el outturn se reparte proporcional a
cada B/L: `parte_i = total × bl_i / Σbl`, con **reconciliación de redondeo** (la última parcela
absorbe el residuo para que Σpartes = total exacto). Pequeño, puro, validable.

### 2.4 VES (Vessel Experience Statement)
Variante del VEF cuando **no hay historial calificable suficiente**: se emite una *declaración* en
vez de un *factor*. Ya lo cubrimos: nuestro `vef.rs` emite **warning** (<5 viajes) — basta etiquetar
la salida como "Statement" en ese caso.

---

## 3. Estructura por operación (secciones del reporte SGS)

### STS Mother **Discharge** (KUFRA, 33 págs) — la más completa
Summary · **Bill of Lading** · Time Log · LOP · Quantity Certificate · **Shuttle Quantity** ·
**OBQ** · Last Three Cargoes · Ullage After Loading · Ship Quantity at Loading · **Ullage Before
Discharge** · **ROB** + ROB Tank Inspection · **Ship Quantity at Discharge** · **Vessel Experience
Statement** · Vessel Cargo Tank Data · Sample · Bunker Survey FO/Diesel · Voyage Analysis ·
**Pro‑Rata Quantities** (×3, por B/L). Compara **B/L vs Outturn** (varianza −0.085 %).

### STS Mother **Load** (AS SUWAYQ, 22 págs)
Summary · Time Log · LOP · Quantity Certificate · **Shuttle Quantity** · Ullage Before Loading ·
**OBQ Tank Inspection** · Previous Cargoes · Non Cargo Tank Report · Ullage After Loading · **Ship
Quantity at Loading** · **VEF** · Sample · Bunker Survey · Voyage Analysis · Certificate of Quantity.

### Barge Tow **Loading** (CENTENARIO TRADER, 16 págs)
Summary · **Bill of Lading Quantity** + Certificate · Time Log · LOP · Quantity Certificate ·
**Pipeline Reconciliation** · **Shore Measurement** + **Shore Quantity** · **OBQ Before Loading** ·
Ullage After Loading · **Barge Quantity Report**. Compara **Loaded vs B/L** (varianza −0.411 %).

### Off‑Hire (SEA BREEZE xlsx + BUDVA cert)
Survey de búnker al **traspaso de charter** (delivery/redelivery). Hojas `VESSEL/BARGE ULLAGE` por
grado (FO, LSFO, MDO, MGO), `Bunker Audit`, `Log Book`, **`CERTIFICADO`**. La salida es un
**Certificate of Off‑Hire Bunkers** (= la BUDVA: VLSFO 923.105 MT, LSMGO 247.448 MT, firmado
Surveyor/Master/Chief Eng). **= nuestro Reporte ROB + un certificado.**

---

## 4. Hallazgos técnicos finos (de las celdas ocultas del off‑hire xlsx)

- La hoja es **bi‑unidad**: un toggle `L11 = 15 | 60` elige base **15 °C (densidad)** o **60 °F (API)**;
  ambos bloques calculan por la **misma ecuación EXP** en columnas ocultas paralelas (Y–AG imperial,
  AK–AS métrico).
- **Breakpoints de densidad de la edición 2004 (métrica)**: fuel oils `≥838.3127`, jet `≥787.5195`,
  transición `≥770.352`, gasolinas `<770.352` (kg/m³ @15). **Difieren** de los de 1980 que usamos en
  `astm.rs` (838.7 / 787.5 / 770.3). → Refinamiento pendiente: nuestro D1250‑04 hoy solo cambia los
  decimales (4→5); para fidelidad 2004 total, el camino métrico debería usar estos breakpoints.
- Rango 54B/6B: densidad 610.6 – 1163.5 kg/m³ (la hoja lista los grupos con sus bandas).

---

## 5. Mapa de reutilización e implicaciones

| Pieza | Estado |
|---|---|
| TCV por tanque (métrico + imperial) | ✅ `astm` / `astm60` / `bqs` / `bqs60` |
| Comparación vs referencia + NOAD/LOP | ✅ `comparison` |
| VEF / VES | ✅ `vef` (VES = caso warning) |
| Apertura/cierre (Loaded = after − before) | ✅ multigrado |
| **S&W (Net = Gross×(1−S&W%))** | ⛔ NUEVO — pequeño |
| **Pro‑Rata (reparto por B/L con reconciliación)** | ⛔ NUEVO — pequeño |
| **OBQ/ROB como cifra de apertura** | 🟡 estructura lista, falta etiqueta/registro |
| **Cifra de custodia multi‑unidad (7 unidades)** | 🟡 conversiones listas, falta ensamblador |
| Plantillas de reporte STS / Barge / Off‑Hire | ⛔ NUEVO — UI |
| Pipeline reconciliation / Shore measurement | ⛔ NUEVO — fase carga/terminal |

**Recomendación:** implementar ya los dos cálculos puros y validables (**S&W** y **Pro‑Rata**) en el
kernel — son la pieza distintiva que falta y los tengo anclados a números reales. Luego, las
plantillas de reporte (STS/Barge/Off‑Hire) sobre el motor existente, y por último pipeline/shore.

---

## 6. Refuerzo: Master Summary, multi-unidad y otra empresa (Intertek) + ISO 13739

Más referencias (2ª tanda) — **AXIOS STAR** aparece en SGS *y* Intertek (misma nave, distinta
empresa): el layout es **universal**.

### 6.1 Master Summary (rollup ejecutivo) — `AXIOS_STAR_MASTER_SUMMARY`
Una página que reconcilia TODO el viaje, multigrado (columnas por grado + TOTAL):
1. **Vessel-to-Shore (load port):** B/L figures vs Vessel loaded → Diff/%, y **Vessel loaded W/VEF**
   → Diff/% (VEF aplicado).
2. **Load port vs Discharge port → IN-TRANSIT VARIANCE** (pérdida en tránsito) + %.
3. **Remaining On Board.**
→ Sección "smart" de alto valor: resume todo apoyándose en cifras ya calculadas (custody + VEF).

### 6.2 Tabla de cantidades multi-unidad + TCV/GSV/NSV — `PAN…Intertek`
Cada cifra en **7 unidades** (bbl, gal@60, m³@60, L@60, m³@15, L@15) y en triplete
**TCV / GSV / NSV** (`NSV = GSV − S&W`). Es el backbone compartido de todos los reportes; el kernel
ya tiene conversiones y S&W → falta un **ensamblador "una cifra → 7 unidades × TCV/GSV/NSV"**.

### 6.3 ISO 13739:2020 (norma) — doctrina, no cálculo
Procedimientos de transferencia de búnker (pre/entrega/post + documentación); referencia ISO 8217
(specs de combustible) e ISO 4268 (temperatura). Sustenta la doctrina BQS y los criterios de
LOP/NOAD. (El PDF es la *preview* iTeh, 15 págs.)

### 6.4 Próximas refinaciones de plantilla (orden sugerido)
1. **Master Summary** como sección del motor (multigrado: B/L→loaded±VEF→in-transit→discharge→ROB).
2. **Tabla multi-unidad (7) × TCV/GSV/NSV** — requiere ensamblador de unidades en el kernel.
3. Exportadores: además de PDF/print, **XLSX** y JSON técnico ya existe.

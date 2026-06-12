# Análisis de formatos de referencia — BQS imperial multigrado + descarga de carga

> Material extraído de **dos archivos reales aportados por el cliente** (anonimizar antes de
> usar números en cualquier salida). Sirve para **generalizar** el kernel/app a formatos que hoy
> no cubrimos. Verificado **celda a celda, incluidas hojas y columnas ocultas**.
>
> 1. `TORM_DAPHNE … BQS … PANEXPORT.xlsm` — BQS SGS, **imperial (barriles/°F/API)**, **multigrado**.
> 2. `… Discharge ELKA DELPHI CHEVRON …pdf` — **descarga de carga** SGS (52 págs, 4 grados).

---

## 1. TORM DAPHNE — BQS imperial, multigrado (el hallazgo grande)

### Estructura del libro (13 hojas; ocultas marcadas)
`PORTADA` · `KEY MEETING` · `VESSEL ULL-1/2/3` · `BARGE ULL-1/2/3` (ULL-3 **ocultas**) ·
`Bunker Audit` · `SAMPLE RECEIPT` · `STATEMENT OF FACT` · `LETTER OF PROTEST` · `Hoja1` (oculta) ·
macros **`vbaProject.bin`**.

**`ULL-1/2/3` = un GRADO cada una, no rondas.** ULL-1=VLSFO, ULL-2=LSMGO, ULL-3=3er grado (vacío).
→ **Multigrado = una hoja de medición por grado y por fuente** (buque/barcaza), cada una con
**apertura + cierre** en la misma hoja, y `Cargado = Cierre − Apertura`.

### Unidades y entrada
- Surveyor entra **m³** por tanque → barriles: `bbl = m³ × 6.28981`.
- Entra **°C** → °F: `°F = °C×1.8 + 32`.
- Entra **API @ 60 °F** por tanque (no densidad@15). Conversor arriba: `API = 141.5/SG − 131.5`.
- Tanques con **grados distintos** en una misma hoja (VLSFO, HFO SETT/SERV, LSHFO SETT/SERV, OVERFLOW).

### Cadena de cálculo (familia US-customary, base 60 °F) — desde las columnas OCULTAS Z–AH
La hoja calcula el VCF **por ecuación** (no por tabla impresa), exactamente nuestra filosofía:

- **Densidad desde API:** `ρ60 = 141.5 × 999.016 / (API + 131.5)` kg/m³ (agua@60°F = **999.016**).
- **Corrección de temperatura a ITS-68** (col. AA, "T-68"): polinomio sobre `(°C)` que ajusta la
  temperatura observada antes del VCF (coeficientes −0.148759, −0.267408, 1.08076, 1.269056,
  −4.089591, −1.871251, 7.438081, −3.536296 sobre `t/630`).
- **VCF Tabla 6B 2004** (col. AD = elige por **bandas de API**):

  | Banda API | Grupo | K0 | K1 / extra |
  |---|---|---|---|
  | `< 37.01` | Fuel oils | 103.872 | +0.2701/ρ |
  | `37.01–48.01` | Jet/keroseno | 330.301 | — |
  | `48.01–52.01` | Transición | 1489.067 | −0.0018684 |
  | `> 52.01` | Gasolinas | 192.4571 | +0.2438/ρ |
  | (crudo 6A, col. AB) | Crude | 341.0957 | — |

  `α = K0/ρ² (+K1/ρ)`, `VCF = EXP(−α·ΔT·(1 + 0.8·α·ΔT))`, **ΔT = T_obs(T-68) − 60.0068749 °F**,
  redondeo **5 dp** (confirma la edición 2004). ρ en kg/m³ desde API.
- **GSV:** `GSV_bbl = ROUND(GOV_bbl × VCF, 2)`.
- **WCF Tabla 13** (peso en aire, MT/bbl):
  `WCF = ROUND( ROUND((141.3806986/(API+131.5) − 0.0012172) × 8.34540323, 6) / 2204.62 × 42, 5)`
  (densidad desde API − boyancia aire 0.0012172; ×8.34540323 lb/gal agua; ÷2204.62 lb/MT; ×42 gal/bbl).
- **MT (aire):** `MT = ROUND(GSV_bbl × WCF, 3)`.
- **MT (vacío):** `MT_vac = MT_aire × factor56` (≈ **1.00115**, VLOOKUP por densidad — Tabla 56).
- **Long tons:** `LT = MT × 0.984206`.

### Anclas de validación (cierre, para tests del kernel 60 °F)
| Tanque | API@60 | T °F | VCF 6B | WCF 13 | GSV bbl | MT |
|---|---|---|---|---|---|---|
| 1S | 16.40 | 103.64 | 0.98261 | 0.15179 | 2542.51 | 385.928 |
| 1P | 16.40 | 103.82 | 0.98254 | — | 1417.94 | 215.229 |
| HFO SETT | 15.39 | 192.20 | 0.94733 | 0.15283 | 84.02 | 12.841 |
| OVERFLOW | 19.95 | 104.00 | 0.98192 | 0.14822 | 45.46 | 6.738 |

### Auditoría / comparación (hoja `Bunker Audit`) — valida nuestros motores
- **Por grado:** `Vessel Received` vs `BDR/BDN` vs `Nominated`, `Difference (MT)`, `% Difference`.
  (VLSFO 0.07 %, LSMGO 0.23 %). → **es nuestro comparison engine** (None/NOAD/LOP).
- **ROB Audit por grado:** `Log Book` vs `ROB Audit` (HSFO, LSFO, MDO, MDO LS, Sludge).
  → **es nuestro Reporte ROB** (Survey vs ER Log).
- PORTADA declara "Calculation Method: **API Standard 2540**" (= API MPMS 11.1 / D1250).

---

## 2. ELKA DELPHI — descarga de carga (familia de operación más amplia)

Informe SGS de **52 páginas**, **multigrado** (MOGAS PREMIUM 95, MOGAS REGULAR 91, ULSD, JET A),
imperial. Sus secciones marcan operaciones **más allá del BQS**:

`Summary Report (Discharge)` por grado · `Time Log` · `Letter of Protest` · `Quantity Certificate`
por grado · **`Pipeline Reconciliation`** · **`Shore Measurement`** · **`Shore Quantity`** ·
`Previous Cargoes` · `Ullage Before Discharge` · **`Slop Report` (arribo/zarpe)** ·
`ROB` + `ROB Tank Inspection` · **`Ship Quantity at Discharge`** · **`Vessel Experience Factor (VEF)`** ·
`Sample Report` · **`Bunker Survey`** (Fuel Oil / Diesel) · **`Sealing Report`**.

Mismo motor ASTM/API/barriles; añade **conciliación buque↔tierra, VEF, pipeline, slops, sellado**.

---

## 3. Implicaciones para SUPER-SURVEY

### Lo que CONFIRMA (vamos bien)
- Cálculo **por ecuación** (no tabla impresa) — idéntico enfoque, incluso el agua@60 °F 999.016 que
  ya usamos en las utilidades de densidad.
- **Edición 2004** real en producción (VCF a 5 dp) — justo lo que acabamos de hacer seleccionable.
- **Comparación** (Received/BDN/Nominated, %dif) y **ROB vs Log Book** — ya implementados.

### Lo NUEVO a generalizar (roadmap)
1. **Familia US-customary base 60 °F**: Tablas **6A/6B** (VCF) + **Tabla 13** (WCF) + entrada por
   **API gravity** + barriles + °F + corrección **ITS-68**. Constantes exactas capturadas arriba;
   validable contra las anclas de TORM DAPHNE. *(El kernel actual es métrico 54A/54B/56.)*
2. **Multigrado** como modelo de primera clase: N grados por trabajo, **una medición por grado/fuente**,
   apertura/cierre, totales **por grado**, y un **audit** que compara por grado.
3. **Aire↔Vacío** por Tabla 56 (factor desde densidad) y **Long Tons** como unidades de salida.
4. (Mayor plazo) **Familia de carga/terminal**: conciliación buque/tierra, **VEF**, pipeline, slops,
   sellado — el formato ELKA DELPHI como guía.

### Recomendación de prioridad
El ítem **#1 (familia 60 °F: 6A/6B/13 + API)** es el de mayor valor y **totalmente validable** (tengo
las ecuaciones, constantes y anclas de las celdas ocultas). Es el siguiente paso natural tras D1250-04.
El **#2 (multigrado)** se apoya en el Reporte ROB ya hecho. El **#4** es una fase aparte.

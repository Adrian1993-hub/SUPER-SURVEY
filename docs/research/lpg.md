# LPG / NGL — análisis de tablas y worksheet real (familia de hidrocarburos ligeros)

> Material del cliente (anonimizar números en cualquier salida). Verificado con `xlrd`/`openpyxl`
> **incluyendo hojas/columnas ocultas**. Cierra la pregunta de versión: *¿son las tablas más
> actuales o de una versión anterior?* → **es una mezcla deliberada** (motor de temperatura
> moderno + tablas de conversión de peso heredadas). Detalle abajo.
>
> Archivos: `LPG_Tablas_58_21_SG…pdf` (tablas impresas 58/21), `TABLASASTM.xls` (suite de tablas
> ASTM con hojas ocultas), `TOOLS_2.xlsx`, y **`SH100756_LPG_EPIC_MADEIRA.xls`** — reporte real
> SGS de descarga de **propano** (+ butano) en Vopak Panamá. Este último es el **ancla**.

---

## 1. Veredicto de versión (lo que pediste verificar)

| Pieza | Norma / versión | ¿Actual? |
|---|---|---|
| **Corrección por temperatura (CTL/VCF)** | **API MPMS Cap. 11.2.4 (COSTALD, estados correspondientes)** — tablas **59/60 "for NGL & LPG liquids"** en forma de **ecuación** (hojas `59E`/`60e`) | ✅ **Vigente** (2007, reafirmada) |
| **Conversión peso↔volumen** (MT/LT/bbl/gal) | **ASTM‑IP Table 1 / 58** ("Metric tons to barrels at 60 °F", densidad 5 dígitos) | 🟡 **Heredada** (linaje 1952/1980; el certificado dice literalmente *"ASTM table 1 used to calculate Long tons, US Barrels and US Gallons"*) |
| **Conversión de densidad** | ASTM Table **3‑21‑51** (API ↔ rel.density 60/60 ↔ densidad 15 °C) | 🟡 Heredada (compatible con 11.1) |
| **Peso en aire ← vacío** | **Table 56 (LPG)** por banda de densidad | ✅ estándar |
| **Componentes puros** | Propileno; **Butadieno‑1,3 `ASTM D1550‑94(2009)`**; **Buteno‑1 `DS4A/API`**; Etileno (Depauw & Stokoe); VCM; Amoníaco; Óxido de propileno; `ASTM D2421‑02(2007)` | 🟡 mezcla de vintages |

**Conclusión:** el **cálculo térmico es el moderno (11.2.4 COSTALD)**; las **conversiones de
unidad de peso son las tablas ASTM‑IP heredadas** (siguen siendo el estándar para ese paso).
No hay que "actualizar" las 58/21 — conviven con el motor 11.2.4 a propósito.

---

## 2. La cadena de cálculo LPG (de la medición al certificado)

```
Sondaje por tanque (ullage, T, presión)              ← gauging (líquido + vapor en presurizados)
  → CTL (VCF) por COSTALD (API 11.2.4)               ← NUEVO: estados correspondientes
        volumen → volumen @15 °C (m³@15)  y  @60 °F (bbl@60)
  → peso en vacío = m³@15 · ρ15(kg/L)                 ← MT vacío
  → peso en aire  = vacío · factor Table 56 (LPG)     ← MT aire
  → long tons     = kg_vacío / 1016.0469088           ← LT desde VACÍO (no aire)
  → US bbl@60 → gal = bbl·42 ; m³↔bbl por Table 1     ← conversiones heredadas
  → comparación buque/tierra (+ Line Capacity) y certificado
```

Notas finas (de celdas ocultas del worksheet real):
- **Presurizado**: hay columnas `PSIG`, `Liq + Vap` y "Volume Manometer" → corrección de vapor para
  propano presurizado (caso del EPIC MADEIRA; el radar D‑2193 falló y se usó respaldo).
- **Line Capacity for Propane = 140.0 gross bbls** → contenido de línea (encaja con `reconcile`).
- Long tons salen de **vacío**, no de aire (a diferencia de algunos formatos de productos).

---

## 3. CTL por COSTALD — API MPMS 11.2.4 (los 14 pasos, extraídos del worksheet)

El worksheet implementa el método de **estados correspondientes (Hankinson‑Thomson / COSTALD)**
interpolando entre dos componentes puros (p. ej. Propano y i‑Butano) por una variable `S`:

```
Step 3  Tx(K) = (TF°F + 459.67) / 1.8
Step 4  Constantes por fluido: Y60°, Zc, Tc(K), Pc, K1..K4
        Propano : Y60=0.507025  Zc=0.27626  Tc=369.78  Pc=5.0   K1=1.96568366933 …
        i‑Butano: Y60=0.562827  Zc=0.28326  Tc=407.85  Pc=3.86  K1=2.0474803441  …
Step 5  Variable de interpolación S          (ej. −0.07213)
Step 6  Tc = Tc,1 + S·(Tc,2 − Tc,1)          (ej. 367.034 K)
Step 7  Tr,x  = Tx / Tc                       (ej. 0.822464)
Step 8  Tr,60 = 519.67 / (1.8 · Tc)           (ej. 0.786591)
Step 9  h2 = (Zc,1·Pc,1) / (Zc,2·Pc,2)        (ej. 1.263326)
Step 10 τ60 = 1 − Tr,60 ; densidad de saturación de cada fluido a 60 °F
Step 11 factor de interpolación X
Step 12 τx  = 1 − Tr,x ; densidad de saturación usando Tr,x
Step 13 CTL = corrección a la temperatura observada
Step 14 CTL (redondeo)                         ← ANCLA: 0.9587323707  (propano @ 83.7 °F)
```

→ La densidad de saturación usa un polinomio por fluido en `τ^(1/3), τ^(2/3), τ` con `K1..K4`
(no las constantes COSTALD genéricas a,b,c,d). **Implementado** en `costald.rs`: COSTALD estándar (constantes universales a..h) + pseudo-componente por densidad relativa @60 °F entre dos componentes puros; reproduce la cadena de interpolación celda a celda y el ancla con **CTL = 0.958828 vs 0.9587323707** (residual ≈ 9.6×10⁻⁵, ~0.01 %). **Pendiente (cell-exact, 10 díg)**: reproducir el polinomio por fluido y
validar contra la rejilla `59E/60e` y el ancla `CTL = 0.95873237`. Las constantes por componente
(Propano, i/n‑Butano, Propileno, …) están en la hoja `shore (C3)` y se catalogarán en el kernel.

---

## 4. Anclas reales (EPIC MADEIRA, propano, *ship figures*)

Certificado SGS (Vopak, descarga propano) — cifras del buque:

| Magnitud | Valor |
|---|---|
| Volumen @15 °C | **1 174.058 m³** = 1 174 058 L |
| Peso vacío | 588 203 kg = **588.203 MT** |
| Peso aire | 586 847 kg = **586.847 MT** |
| Long tons (de vacío) | **578.912921818 LT** |
| US barrels @60 °F | **7 396.57 bbl** |
| US gallons @60 °F | **310 655.94 gal** (= 7 396.57 × 42) |

Relaciones verificadas: `MT_vac = 1174.058 × 0.501`; `LT = kg_vac / 1016.0469088`;
`gal = bbl × 42`; `ρ15 ≈ 0.501 kg/L`. ✅ **Implementadas y validadas celda a celda** en `lpg.rs`
(`propane_custody_matches_certificate`).

---

## 5. Mapa de reutilización e implementación

| Pieza | Estado |
|---|---|
| Ensamblador multi‑unidad LPG (m³/L@15 · MT vac/aire · LT desde vacío · bbl/gal@60) | ✅ `lpg.rs` (validado vs certificado) |
| Conversión densidad (API↔rel.density↔ρ15) | ✅ reutiliza `density.rs` |
| Comparación buque/tierra + Line Capacity | ✅ `reconcile.rs` |
| S&W / pro‑rata / muestreo / VEF | ✅ kernel existente |
| **CTL/VCF por COSTALD (API 11.2.4) + catálogo de componentes** | 🟡 **Implementado (COSTALD estándar)** en `costald.rs` (par Propano/i-Butano validado; residual ≈9.6e-5 vs ancla); cell-exact pendiente de `K1..K4` por componente de `shore (C3)` |
| Corrección de vapor (presurizados) | ⛔ NUEVO (propano/butano presurizado) |
| Plantilla de reporte LPG (Certificate of Quantity) + página UI | 🟡 pendiente (motor y unidades listos) |

**Orden sugerido:** (1) ✅ ensamblador de unidades LPG; (2) **COSTALD CTL + catálogo de
componentes** validado vs rejilla; (3) corrección de vapor; (4) página/plantilla LPG.

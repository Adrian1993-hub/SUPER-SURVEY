# Operación BQS — Bunker Quantity Survey · Doctrina Operativa v0.2

> Parte del **Mapa de Operaciones y Documentos**. Define **QUÉ es** BQS, qué **mide** el
> surveyor, qué **calcula** el programa, qué **compara**, qué **documentos** produce, **quién
> firma** y cuándo se emite **NOAD/LOP/SOF**.
>
> **Estado: v0.2 — basada en un BQS REAL** (campo + reporte emitido, 2 grados VLSFO+LSMGO,
> barge→vessel) **+ análisis de ISO 13739:2020, manual SGS "OGC" Nivel 1 y el set de tablas
> ASTM**. Lo **confirmado** va ✅; lo que falta confirmar, ⚠️. *(Sin datos de cliente embebidos:
> los números reales viven en los vectores QA, fuera de git hasta confirmar privacidad del repo.)*
> Actualizado: 2026-06-06.

---

## 0. En una frase

BQS mide y concilia la cantidad de **combustible (bunkers)** transferido —típicamente de una
**barcaza a un buque**— comparando **lo que la barcaza entregó**, **lo que el buque recibió** y
**lo que dice el BDN**, y deja constancia **firmable** de cualquier discrepancia.
Rige **ISO 13739:2020** (excepto Singapur → SS 600/648). ✅

---

## 1. Definición operacional

Survey de cantidad de bunkers. El surveyor es un tercero independiente que verifica volúmenes,
temperaturas, densidades y agua, calcula las toneladas métricas por las tres fuentes y certifica
la diferencia. **Puede haber varios grados en una misma operación** (el formato real maneja hasta
**3 grados**, cada uno con su propio **Summary + VMR + BMR**). ✅ Variantes:

- **Barge → Vessel** (lo más común). *(MVP)*
- **Shore/terminal → Vessel** (con tanques de tierra / flowmeter).
- **Debunkering**: Vessel → Barge (inverso funcional).

---

## 2. Qué hace físicamente el surveyor (flujo de campo)

**Antes (Opening):** reunión previa (revisa grados, tanques nominados, tasas, BDN previsto) →
**sondea/ullage** los tanques del **buque** (ROB inicial) y de la **barcaza** (con trim/list) →
**temperatura** y **densidad** (o del certificado del supplier) → **agua libre** → verifica
precintos/líneas/válvulas → atestigua/toma **muestras**.

**Durante:** registra eventos en el **Time Log** (NOR, gangway, inspector a bordo, manguera
conectada, inicio, paradas, fin, manguera desconectada, muestras al laboratorio…).

**Después (Closing):** sondea de nuevo **buque** (ROB final) y **barcaza** (final) → repite
T/densidad/agua → calcula y **coteja** las 3 fuentes → si supera tolerancia, **avisa a
OPERATIONS/FOBAS ANTES de firmar el BDN** y evalúa **NOAD/LOP** → recoge **firmas** y emite.

---

## 3. Fuentes de medición

| Fuente | Qué aporta | Cómo |
|---|---|---|
| **Buque (vessel)** | ROB **antes** y **después** por tanque | sondaje/ullage + tablas del buque |
| **Barcaza (barge)** | Cantidad **antes** y **después** por tanque | sondaje/ullage + tablas de la barcaza |
| **BDN** (Bunker Delivery Note) | Cantidad **declarada** por el proveedor | documento externo |
| **(opc.) Shore / flowmeter** | Entrega de tierra | medidor/tablas de tierra |

---

## 4. Datos que se recolectan (por tanque y por fuente)

| Dato | Unidad | Fuente | Notas |
|---|---|---|---|
| Ullage / sondaje (modo **U/S/G**) | mm / m | campo | ullage, sounding o gauge |
| **Volumen del tanque** | m³ / bbl | **el surveyor lo obtiene de la tabla de calibración física e INGRESA el volumen** | la app **NO** almacena la tabla; solo registra la **fecha de calibración** ✅ |
| Trim / List | m / ° | campo | corrección aplicada al volumen |
| Temperatura del producto | °C | campo (API Ch 7) | por tanque |
| **Densidad @ 15 °C** | kg/m³ ó t/m³ | **del SUPPLIER** (barcaza) ✅ | base del VCF y del peso |
| Agua libre (FW) | m³ / mm | campo | se deduce |
| **BDN**: volumen, T, densidad, MT | varias | externo | base de comparación; MT en **vacío**, densidad en **aire** ✅ |
| Muestras / precintos | — | campo (API Ch 8 / ISO 13739) | manifold, goteo continuo |

---

## 5. Cálculo principal — cadena por tanque (✅ confirmada con el caso real)

Campos reales del VMR/BMR, en orden:
```
Tanque → Densidad → Nivel (modo U/S/G) → Temp → TOV
  → (− Free Water) → GOV
  → × VCF (Tabla 54B)            → GSV (@15 °C)
  → × WCF (Tabla 56)             → Toneladas Métricas (AIRE)   [+ vacío]
```

**Fórmulas confirmadas:**
- `GOV = TOV − FW`  (para tanques de buque/barcaza; en la forma SGS general
  `GSV = {[(TOV − FW) × CTSh] ± FRA} × CTL`, los términos CTSh y FRA = 0). ✅
- `GSV = GOV × VCF` — **VCF = Tabla 54B** (densidad@15 + T observada → factor a 15 °C). ✅
- `MT(vacío) = GSV × densidad@15`. ✅
- `MT(aire)  = GSV × WCF`, con **WCF = Tabla 56 ≈ densidad@15 − 0.0011** (flotabilidad del aire;
  confirmado en celda real `=-0.0011`). ✅
- **Densidad de cálculo = la del supplier.** ✅
- **SIN redondeo intermedio**: se redondea **solo el resultado final** (manual SGS p.62). ✅
- **Cifra oficial de la diferencia = MT en AIRE** (las diferencias del Summary se reportan en
  aire). ✅  El BDN declara MT en **vacío** y densidad en **aire**.

**Ambas bases SIEMPRE (✅ tu criterio):** calcular y mostrar **MT en aire** y **MT en vacío**.
La oficial suele ser **aire**, pero hay deals que se liquidan en **vacío**.

**Corrección por trim (✅ tu criterio):** se aplica en **algunos buques sí y otros no** (las
**barcazas normalmente no**). El check **Applied / Not Applied** es la **constancia de que el
inspector verificó** si, según las tablas del tanque, corresponde la corrección — **no** es una
discrepancia.

**Resumen "Quantity Transferred"** (✅ copiar del formato FOBAS): por cada fuente, bloque
compacto de 5 columnas — **Supplier's Density · GSV (M³ @15 °C) · Weight (MT) in Vacuum ·
WCF Tabla 56 · Weight (MT) in Air**. (Glosario del formato: `TOV` = Total Observed Volume;
`GOV` = Gross Observed Volume; `VCF` = Vol. Correction Factor (Tabla 54B); `GSV` = Gross Standard
Volume; `WCF` = Weight Correction Factor (Tabla 56, −0.0011); `MT(Air) = GSV × WCF`.)

**Base de temperatura:** el formato contempla referencia **@15 °C** y opciones **@20 °C** (aire/
vacío) → soportar la base de referencia como parámetro.

**Estándares:** API MPMS Ch 3/7/8/9, **Ch 11.1 (VCF)**, Ch 12.1 (cantidades), **Ch 17.1**
(inspección marina / discrepancias); **ISO 13739:2020** (procedimiento de transferencia).

---

## 6. Comparaciones — el corazón del reporte (✅ confirmado)

- **Vessel Received** = ROB_final − ROB_inicial  (closing − opening, sobre GSV)
- **Barge Delivered** = Barcaza_inicial − Barcaza_final  (opening − closing)
- **BDN** = cifra declarada del proveedor.

Tabla de 3 fuentes (A=BDN, B=Vessel Received, C=Barge Delivered) con: Densidad@15, GSV@15,
MT vacío, WCF(T56), **MT aire**. Diferencias reportadas: **B−A**, **C−A**, **C−B** (MT aire y %).

> **Tolerancia — modelo en capas (✅ tu criterio):** el **default** será el de **ISO 13739**,
> pero **configurable**, porque conviven varias: la del **comprador**, la del **suplidor**, la de
> la **compañía de inspección** (p. ej. el formato real usa ±0.25 %/±5 MT) y la del **contrato**.
> SuperSurvey tendrá **perfiles de tolerancia** y evalúa contra el que aplique.
> *(El umbral numérico exacto de ISO 13739 está en la parte del estándar fuera del extracto → a confirmar.)*

---

## 7. Conjunto de documentos (✅ del Excel real + UI OGC)

**Hojas del field report real:** `CLIENT Cover Page` · `Pre Survey Acknowledgment` ·
`Pre Bunker Information` · **`Summary` / `VMR` / `BMR` por grado (×3)** · `Sample Receipt Form` ·
`Sample Checklist` · `Time Log` · `Statement of Fact` · `SOF for Disputes` ·
`Gauging Tickets OPENING` / `CLOSING` · `Vessel Non Cargo Declaration` ·
`Barge Non Cargo Declaration` · `Receipt of FOBAS Documents`.
**Reportes en la UI OGC (menú):** Time Log, Quality Report, Letter of Protest, NOAD, Quantity
Certificate, Pipeline Data, Pipeline Reconciliation, Delivery/Receipt Measurement & Quantity,
Vessel Cargo Tank Data, Sample Report/Receipt, Bunker Survey, General Notes, Custom Reports.

| Documento | Qué prueba | Firma | Tipo |
|---|---|---|---|
| **Cover / Job Setup** | datos maestros | surveyor | maestro |
| **VMR** (Vessel Measurement Report) | cantidades en el **buque** | Chief Eng. + surveyor | soporte |
| **BMR** (Barge Measurement Report) | cantidades en la **barcaza** | barge officer + surveyor | soporte |
| **Summary** (por grado) | comparación 3 fuentes + diferencia | surveyor + barge officer + vessel rep | **final** |
| **Gauging Ticket** (open/close) | evidencia de sondaje | surveyor | soporte |
| **Sample Receipt / Checklist** | muestras, precintos, distribución | quien recibe | soporte |
| **Time Log** | cronología operacional + tiempos/tasa de bombeo | (no se firma; alimenta el SOF) | soporte |
| **SOF / SOF for Disputes** | declaración formal / protesta | partes | soporte/legal |
| **NOAD** | aviso de discrepancia aparente | surveyor + parte | advertencia |
| **LOP** (Letter of Protest) | protesta formal (ISO 13739 §12.4) | emisor + acuse | protesta/legal |
| **Quantity Certificate** | cantidad certificada | surveyor | certificado |
| **Non Cargo Declaration** (vessel/barge) | ROB/declaración de no-carga | parte | soporte |

---

## 8. Time Log y SOF (y su automatización) — ✅ del caso real

- **Time Log = registro cronológico operacional** (SIEMPRE, todo job). ~16 eventos estándar con
  **Date+Time por grado**; alimenta automáticamente el **tiempo neto de bombeo** y la **tasa
  media (MT/hr)** al Summary. Mandado por **ISO 13739:2020 §11.6 + Anexo Q** (nuevo en 2020).
  - Columnas UI: `Submitted by Terminal/Vessel` (procedencia, para disputas) · `Exclude from
    report` (oculta entradas internas del impreso, p. ej. llamadas a OPERATIONS) · Event ·
    Append to Event · Date · Time · Grade.
- **SOF = narrativa formal** dirigida a una **parte nombrada** (buque o barcaza); se crea **solo
  si hay no-conformidad/disputa**; reserva los derechos del principal. **`SOF for Disputes`**
  añade campos numéricos: *Quantity Stemmed, BDN, Vessel Loaded, Barge Delivered, shortloading,
  dispute qty (= Vessel Loaded − Barge Delivered)*.
- **Diferencia clave:** Time Log = operacional, siempre, alimenta cálculos. SOF = instrumento
  legal, solo en disputa.
- **Auto-generar SOF desde el Time Log (propuesta):** exportar filas con `Exclude=FALSE` como
  narrativa cronológica, etiquetadas "Submitted by [parte]"; **inyectar** las cifras de variación
  del Summary en los campos del SOF de disputas; las llamadas marcadas `Exclude` afloran **solo**
  en el SOF de disputas; los **re-chequeos** (vessel/barge/shore recheck) y **llamadas** se
  inyectan desde un módulo aparte, **disparado cuando la variación ≥ ±5 MT o ±0.25 %**.

**Disparadores de SOF (✅ del Cover real):** rechazo de una parte a presenciar o firmar las
mediciones; **fluctuación extrema de temperatura** antes/después; **movimiento en tanques no
nominados** (posible consumo → reflejar en VMR/BMR); imposibilidad de medir todos los tanques
manualmente aun con **flowmeter**, o de aplicar pasta agua/aceite; **cantidad acordada ≠ nominada**
de forma significativa; **precintos rotos**.

---

## 9. Muestreo (Sampling) — ✅ del caso real + ISO 13739

- **Punto:** **manifold del buque**, **goteo continuo** a *cubitainer* (ISO 13739 **Anexo L**).
- **Botellas del surveyor por grado:** ~5–6 — (1) Vessel, (2) Supplier, (3) Lab análisis
  completo, (3a) Lab parcial (si se pide), (4) Surveyor retained, (5) **MARPOL Anexo VI** —
  **+ 5 del supplier** en el manifold de la barcaza.
- **Precintos:** *cap seal + tag seal* por botella, numerados, tamper-evident (ISO 13739 §3.17);
  los precintos SGS no se entregan a terceros (manual §2.6).
- **"Level Sampling Calculations"** (hoja aparte) = **posicional**, NO calcula masa/volumen:
  da la profundidad del muestreador para spot samples — `Upper = Ullage + Innage/6`,
  `Middle = Ullage + Innage/2`, `Lower = Ullage + 5·Innage/6`.

---

## 10. Warnings / NOAD / LOP

- **Warning (no imprimible):** si una figura supera la **tolerancia** (default **±0.25 % o ±5 MT**,
  configurable). Acción: llamar a OPERATIONS/FOBAS **antes de firmar el BDN**.
- **NOAD** = aviso de **discrepancia aparente** (cantidad/calidad) a las partes.
- **LOP** = **protesta formal** (ISO 13739 **§12.4**). Casos típicos: faltante fuera de tolerancia,
  agua excesiva, **aireación ("cappuccino")**, desacuerdo de T/densidad, **BDN en disputa**,
  negativa a muestrear, precintos rotos.
- ✅ **En SuperSurvey (tu criterio):** cuando una figura **supera la tolerancia**, mostrar una
  **alerta breve** que ofrezca **emitir LOP o SOF**, **pre-llenado** con los datos esenciales
  (referencia, partes/destinatario del Cover, grado, las 3 cantidades, diferencia MT y %,
  fecha/hora) + los **campos a completar**. Se usa la **regla estándar** como guía; las
  **políticas de cada cliente** (unos piden SOF, otros LOP + llamada, otros solo resolver)
  **no se modelan**: las trae el surveyor del nominador (owner/charterer).
- API MPMS **17.1**: registrar/reportar discrepancias a las partes y **resolver antes de zarpar**.

---

## 11. Export individual / 12. Paquete final

- **Individual:** cada documento en **PDF** y **XLSX** (con marca/tema).
- **Paquete final:** un **PDF** (+ XLSX/JSON técnico): Cover → VMR(s) → BMR(s) → Summary(es) →
  Gauging Tickets → Sample Receipt/Checklist → Time Log → SOF/NOAD/LOP (si aplica) →
  Non Cargo Declarations → FOBAS. Es la evidencia archivada.

---

## 13. Decisiones (✅ resueltas con tu criterio · ⏳ pendientes)

1. ✅ **Camino de cálculo canónico:** densidad **única por fuente + precisión completa + SIN
   redondeo intermedio** (redondear solo el final).
2. ✅ **Tolerancia:** **configurable en capas** (default ISO 13739 + comprador/suplidor/compañía
   de inspección/contrato).
3. ✅ **Cifra oficial = MT en aire**, pero **calcular SIEMPRE también vacío** (hay deals en vacío);
   incluir el resumen **"Quantity Transferred"**.
4. ✅ **Trim Applied/Not Applied** = constancia de verificación del inspector (las barcazas
   normalmente **no** llevan corrección).
5. ✅ **NOAD/LOP:** regla estándar; la app solo dispara una **alerta al pasar la tolerancia** que
   ofrece **LOP/SOF pre-llenado** con datos esenciales. Las políticas por cliente no se modelan.
6. ⏳ **En curso (agentes):** versiones de tablas **ASTM** + **sampling** a fondo (muestras por
   parte y su registro en BDN; **muestra compuesta** de crudo → **B/L**; productos claros
   gasolina/jet/DMA).

---

## 14. Mapeo doctrina → kernel (✅ el modelo actual alcanza)

El análisis confirma que **mapea sobre el esquema SQLite actual SIN tablas nuevas**:

| Paso doctrina | Dónde vive | Estado |
|---|---|---|
| VMR/BMR (opening/closing) | `measurement_sets` (4 sets: V-open/close, B-open/close) | ✅ |
| Tanques y lecturas | `measurement_tank_rows` + `measurement_records` | ✅ |
| TOV→GOV→VCF→GSV→WCF→MT | `quantity_chain.rs` | ✅ base; ⚠️ WCF→MT placeholder |
| Totales por set | `measurement_set_summaries` | ✅ |
| Movimiento por tanque/set | `movement.rs` | ✅ base; ⚠️ no valida mismo producto |
| **Comparación 3 fuentes + tolerancia** | `comparison_sets` / `comparison_results` | ❌ falta lógica (comparison engine) |
| Trazabilidad / inmutabilidad | `trace.rs` / `calculation_logs` | ✅ |

**Siguiente en código (Fase 1):** VCF (Tabla 54B) + WCF (Tabla 56) reales por **ecuaciones API
MPMS 11.1**, validados **al dígito** contra los vectores QA; luego el **comparison engine**
(Vessel vs Barge vs BDN con tolerancia ±0.25 %/±5 MT).

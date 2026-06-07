# Análisis funcional y técnico — OGC InfoPro (motor "SAT")

> Documento de ingeniería inversa y descubrimiento. Base para el rediseño moderno.
> Fuente: decompilación de los ensamblados .NET + inspección de la base de datos `SAT.db`.

---

## 1. Resumen ejecutivo

**OGC InfoPro** es la marca/despliegue de **SGS – Oil, Gas & Chemicals** sobre un
producto base cuyo nombre interno es **SAT** (`SAT.exe`). Es una **herramienta de
escritorio para inspección de cantidad y calidad de cargas de petróleo y derivados**
(marine cargo inspection / quantity surveying).

Cubre el ciclo completo de una operación de custodia: configuración del trabajo →
mediciones en buque / tierra / barcaza / línea → cálculo de cantidades con corrección
por temperatura y conversión a peso según múltiples estándares (ASTM D1250 / API MPMS,
IP, GOST, ANP, OIML…) → factores de experiencia del buque (VEF), OBQ/ROB, cuña (wedge)
→ muestreo/calidad → bitácora de tiempos → certificados y reportes finales en Excel/PDF/Word.

La instalación analizada corresponde a un despliegue real de OGC InfoPro
*(datos de la instalación e inspector omitidos por confidencialidad).*

---

## 2. Stack tecnológico

| Capa | Tecnología detectada |
|---|---|
| Runtime | **.NET Framework 4.8** (PE32 x86) |
| UI | **WPF** con **FirstFloor.ModernUI** + **MVVM Light** (GalaSoft) + Xaml.Behaviors |
| Patrón | MVVM con **Rulesets + Engines + Factories** (motor de reglas por tipo de operación) |
| Datos | **Entity Framework 6** sobre **SQLite** (`SAT.db`, 156 tablas) |
| Motor de cálculo | **`firogcfn.dll` (NATIVO C/C++)** — **523 funciones** vía P/Invoke (tablas ASTM/API) |
| Unidades | UnitsNet + `UnitsOfMeasurement.dll` (manejo formal de unidades) |
| Reportes | **Aspose.Cells / Aspose.Words / Aspose.Pdf** — rellena plantillas `.xlsx` y exporta a Excel/PDF/Word |
| Logs | log4net | Mapeo | AutoMapper + ValueInjecter | JSON | Newtonsoft |

**Dato clave:** el corazón del cálculo es **nativo** (`firogcfn.dll`), no .NET. Las 523
funciones P/Invoke son la librería de tablas de medición de petróleo (conversión de
unidades, VCF, densidad, peso, redondeos normativos). El código C# solo **orquesta**
qué función nativa llamar según producto/estándar/operación.

---

## 3. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  UI  (WPF, 133 ViewModels = pantallas)   SAT.exe             │
│  ModernUI + MVVM Light                                       │
├─────────────────────────────────────────────────────────────┤
│  BusinessLogic  (SAT.exe)                                    │
│   • Rulesets.*    → comportamiento por tipo de operación     │
│   • Engines.*     → orquestación de cálculo y UI             │
│   • Factories.*   → fabricación de rulesets                  │
│   • Calculations.* → VCF/densidad/intraconversión por norma  │
├─────────────────────────────────────────────────────────────┤
│  Helpers: FirogcfnImport.cs  ──P/Invoke──►  firogcfn.dll     │
│           CalculationsHelper, TemperatureHelper, LookupTables│
├─────────────────────────────────────────────────────────────┤
│  Datos:  SAT.Data.dll (EF6) ──►  SAT.db (SQLite)            │
│  Reportes: Aspose ──►  ReportLayouts/*.xlsx + Templates/*.xlsx│
└─────────────────────────────────────────────────────────────┘
```

El patrón **Rulesets/Engines/Factories** es la pieza central: la app **cambia los flujos,
las pantallas, los campos visibles y los métodos de cálculo dinámicamente** según el tipo
de operación, el producto, el estándar de medición y la configuración del cliente.
Ejemplos de familias de reglas: `ShipToShipOperation`, `PipelineTransferOperation`,
`RailRoadOperation`, `BargeTowOperation`, `CustodyTransferBasis`, `IntraconversionStandard`,
`TemperatureCorrectionCalculationMethod`, `FloatingRoofCorrection*`, `WedgeCalculator`,
`ProRata`, `VesselQuantity`, `ShoreQuantityUI`, `DataEntryList`, `ScreenTitle`.

---

## 4. Operaciones soportadas (`OperationType`, 17)

| ID | Operación | ID | Operación |
|---|---|---|---|
| 1 | Loading | 10 | STS Mother Load |
| 2 | Barge-Tow Loading | 11 | STS Shuttle Discharge |
| 3 | Discharge | 12 | STS Shuttle Load |
| 4 | Barge-Tow Discharge | 13 | STS Mother (Discharge) * |
| 5 | Pipeline Transfer | 14 | STS Mother (Load) * |
| 6 | Sampling | 15 | STS Shuttle (Discharge) * |
| 7 | Sampling and Analysis | 16 | STS Shuttle (Load) * |
| 8 | Rail - Road | 17 | Bunker Loading |
| 9 | STS Mother Discharge | | |

\* Los IDs 13–16 parecen una segunda generación de las STS (9–12) → **cruft legado** a depurar.

---

## 5. Flujo funcional (ciclo de una operación)

1. **Job / Setup** — se crea el trabajo (`Jobs`), cliente (`JobCustomers`), tipo de
   operación, grados/productos (`Grades`), y configuración (`ConfigParameters` →
   `ConfigShipParameters` / `ConfigShoreParameters` / `ConfigReportParameters`).
2. **Buque (Vessel)** — datos del buque y tanques (`Vessels`, `VesselTanks`),
   `VesselCargoTankData`, ullages/sondas, temperatura, densidad observada.
3. **Tierra (Shore)** — `ShoreMeasurement` (tanques, meters, movimientos),
   `ShoreQuantity`, corrección por techo flotante, `TankShellCorrection`.
4. **Barcaza / Línea** — `BargeMeasurements`, `ShorePipelineData` + `…Reconciliation`.
5. **OBQ / ROB / Wedge** — cantidad a bordo antes de cargar / remanente tras descargar,
   incluyendo fórmula de cuña (`WedgeCalculator`) para volúmenes pequeños.
6. **Cálculo de cantidad** — TOV → GOV → GSV → Peso (aire/vacío) (ver §6).
7. **VEF / Voyage Analysis** — factor de experiencia del buque, mermas in-transit.
8. **Calidad / Muestreo** — `SampleReport`, `SampleReceipt`, `QualityReport`,
   `PreviousCargoes`, `TankInspection`, `Checklist` (inspector).
9. **Discrepancias** — `NoticeOfApparentDiscrepancy` (NOAD), `LetterOfProtest` (LOP).
10. **Reparto** — `ProRata` (TotalBL / Outturn / PartDischarge; Absolute/Percentage).
11. **Bitácora** — `TimeLog` + eventos (statement of facts).
12. **Certificados y reportes** — `QuantityCertificate` (+ por B/L), `BillOfLading`,
    `Summary` (loading/discharge), `FinalReport`, `CustomReports` → Aspose → Excel/PDF/Word.

---

## 6. Motor de cálculo

### 6.1 Estándares soportados (namespaces `BusinessLogic.Calculations`)
- **Volume Correction for Temperature (VCF/CTL):** ASTM D1250 (1952, 1980 Metric 15 °C/20 °C),
  ASTM **D4311** (bitumen, 2015), **D1555** (aromáticos), ANP (Brasil), IP250, STPTC, GOST.
- **Density Correction for Temperature:** ASTM (1980 15 °C, 2008), ANP, **NBR 5992** (Brasil),
  GOST (3900-47/85, 8599-2010), IP250, **OIML R22** (alcohol/etanol).
- **Intraconversions:** GOST (8595-2010, 8599-2003), IP250 (15/20 °C), SNE.

### 6.2 Métodos realmente usados (tabla `ConvertionMethods`)
Predomina **ASTM D1250-08 / -19 — API MPMS Ch. 11.5**, con **Table 6B** (productos
refinados) y **6A** (crudo); y legado **D1250-80** (tablas 1, 4, 11, 13, 56).

### 6.3 `firogcfn.dll` — 523 funciones nativas (catálogo)
- **`tab11*` (299)** → **API MPMS Ch. 11.1 / 11.5** (implementación moderna; variantes
  `…vac` / `…air` para peso en vacío/aire).
- **`tab1*` (99)** → **Table 1**: conversión de unidades (barriles ↔ litros ↔ m³ ↔ galones
  US/Imp ↔ pies³; longitudes cm/ft/in/m/mm).
- **VCF clásicas:** `tab6a/b/c`, `tab24a-e`, `tab54a-e`, `tab59`, `tab60` (sufijos `_80`,
  `_04`, `_07` = versión de la tabla). Series **A**=crudo, **B**=productos, **C**=especiales,
  **D**=lubricantes, **E**=**GLP/NGL**.
- **Densidad / gravedad:** `tab53*` (densidad a 15 °C), `tab23*` (API gravity), `tab5*`.
- **Peso (Table 56):** `tab56_Weight_In_Air_To_Weight_In_Vaccum`,
  `…Vaccum_To_…Air`, `…Kilograms_Per_Cubic_Mtr`, `…Cubic_Mtrs_Per_Tonne`.
- **Otras normas:** `tab_D1555_*` (aromáticos), `tab_D4311_*` (bitumen).
- **Redondeo normativo:** `ROUND`, `roundtohalf`, `roundtoquarter`, `roundtotwo`, `OLDP`.

### 6.4 Pipeline de cantidad (custody transfer)
```
Ullage/Sonda → (tablas de tanque) → TOV
TOV − agua libre (FW) − sedimentos          → GOV (Gross Observed Volume)
GOV × VCF(temp, densidad, norma)            → GSV (Gross Standard Volume @ 15 °C/60 °F)
GSV × densidad @ ref → Peso en aire / vacío  → TM(air), TM(vac), Long Tons, kg…
+ correcciones: techo flotante, shell (CTSh), trim/list, VEF
```
Salidas configurables (`ConvertionUnits`): US Barrels @60 °F, US Gallons @60 °F,
m³ @15/20/60 °F, Litros @15 °C, **Metric Tons (air) / (vac)**, Long Tons, kg, lb.

### 6.5 Productos manejados (`Grades`)
Crudos (LIZA C.O., WTI Midland C.O., Unity Gold C.O.), gasolinas (MOGAS Premium 95 /
Regular 91, AV GAS), destilados (Jet A, ULSD), búnkers (HSFO, VLSFO, LSMGO, MGO/MGO DMA),
**Etanol**.

---

## 7. Modelo de datos (`SAT.db`, 156 tablas — por área)

- **Job/Config:** `Jobs`, `JobCustomers`, `JobHasInputState`, `ConfigParameters`,
  `ConfigShip/Shore/ReportParameters`, `ConfigMovement`, `ConfigShipBunker*`,
  `ConfigMeter*`, `Grades`, `CustomerData`, `Setting`.
- **Buque:** `Vessels`, `VesselTanks`, `VesselCargoTankData*`,
  `VesselQuantityAtLoading/Discharge*` (+ `ManualCorrections`, `Totals`).
- **Tierra:** `ShoreMeasurement*` (Tank/Meter/Movement), `ShoreQuantity*`,
  `ConfigShoreTank`, `ShorePipelineData/Reconciliation*`, `TankShellCorrection…`.
- **Barcaza:** `BargeData`, `BargeTankData`, `BargeTanksState`, `BargeMeasurements`.
- **OBQ/ROB/Wedge/Ullage:** `OBQ*`, `ROB*`, `WedgeCalculator*`,
  `UllageBeforeDischarge`, `UllageAfterLoading`, `IntermediateUllages`.
- **VEF/Voyage:** `VEF*`, `VoyageAnalysis`.
- **Bunker:** `BunkerSurvey*`.
- **Calidad/Muestreo:** `SampleReport*`, `SampleReceipt*`, `QualityReport*`,
  `PreviousCargoes*`, `TankInspection*`, `Checklist*`.
- **Certificados/BoL:** `QuantityCertificate*`, `BillOfLading*`, `ConvertionMethods`,
  `Outturns`, `GradeQuantityAtLoading/Discharge*`.
- **ProRata:** `ProRata*` (+ tipos `Split/Field/Method`).
- **Reportes:** `GeneratedReport`, `FinalReport*`, `CustomReports*`, `Summary*`,
  `Signatory`, `GeneralNotes`, `AttachedDocument`.
- **Bitácora:** `TimeLog*`, `DowTimeLogEventType`.
- **Discrepancias:** `NoticeOfApparentDiscrepancy*`, `LetterOfProtest`, `ReasonOfProtestType`.
- **Referencia/enums:** `OperationType`, `LanguageType`, `DensityUnit*`, `Table56Type`,
  `ReceiverType`, varios `*Type`, `Version`.

---

## 8. Reportes

~40 **ReportLayouts** + ~60 **Custom Report Templates** en `.xlsx`, rellenados con Aspose
y exportados a Excel/PDF/Word. Incluyen: Vessel/Shore/Barge Quantity, OBQ/ROB (+Wedge),
VEF, Voyage/Ocean Loss, Pipeline Reconciliation, Bunker Survey, Quantity Certificate,
Time Log, NOAD, LOP, Summaries, MARPOL Annex II, Wall Wash, plantillas por cliente
(Aramco, Dow, Lyondell), etc. Firma electrónica configurable (`UseESignature`).

---

## 9. Internacionalización y configuración

- **6 idiomas** (`LanguageType`): Inglés (UK), Chino simpl., Francés, Portugués, Español, Ruso.
  Existe `SecondaryReportingLanguageType` → reportes bilingües. Motor `LocalisationEngine`.
- **Config (`Setting`):** separadores de miles/decimales, unidades híbridas, galón imperial,
  visibilidad de campos del B/L, firma electrónica, modo testing, etc.

---

## 10. Fortalezas y puntos de dolor (para el rediseño)

**Fortalezas a conservar**
- Motor de cálculo nativo **probado y normativo** (ASTM/API/IP/GOST/ANP/OIML) → *reutilizable*.
- Modelo de datos muy completo y maduro.
- Multi-norma, multi-idioma, multi-cliente.

**Puntos de dolor (objetivo de la nueva versión)**
- **UI anticuada** (ModernUI ~2014) y densa: **133 pantallas** → curva de aprendizaje alta
  (de ahí los datos de *Training*).
- **Flujos rígidos/complejos:** el motor de Rulesets condiciona pantallas y campos de forma
  poco transparente para el usuario.
- **Entrada manual intensiva** (ullages, temperaturas, densidades por tanque) sin asistentes
  ni validación en tiempo real evidente.
- **Cruft legado** (p. ej. doble juego de operaciones STS 9–12 vs 13–16).
- Acoplamiento a Windows x86 por el motor nativo.

---

## 11. Implicaciones para la nueva versión

- **Plataforma elegida:** escritorio **offline**, UI moderna, **bilingüe ES/EN**.
- **Estrategia de cálculo (decisión clave):** reutilizar `firogcfn.dll` vía wrapper para
  **garantizar números idénticos** a InfoPro, o reimplementar las tablas desde la norma
  (más esfuerzo + validación) si se quiere multiplataforma puro.
- **Rediseño de flujos:** convertir las 133 pantallas en **asistentes guiados por operación**
  (wizard por tipo: Loading / Discharge / STS / Bunker / Pipeline…), con validación en vivo.
- **3 nuevas operaciones** (pendiente de definir con el usuario) — se integran como nuevos
  `OperationType` + sus rulesets/flows.

---

### Apéndice — métricas de la decompilación
- Ensamblados .NET decompilados: `SAT.exe` (1879 .cs), `SAT.Data` (237), `Core` (204),
  `SAT.Core` (51), `SAT.DataUpdate` (22), `DataTableLibrary` (17), `DynamicUnitsTree` (15),
  `EnumHelper` (6), `UnitsOfMeasurement` (19).
- `firogcfn.dll`: nativo, **523** funciones expuestas (P/Invoke en `FirogcfnImport.cs`).
- `SAT.db`: 156 tablas.

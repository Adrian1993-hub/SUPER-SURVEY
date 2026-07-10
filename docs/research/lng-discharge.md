# Descarga de LNG (gas natural licuado) — análisis de cálculo y alcance

> **Estado:** investigación y análisis. NO implementado todavía. Este documento
> define el método, los estándares, las constantes necesarias y el alcance para
> incorporar la **descarga de LNG** como una operación nueva del programa.
>
> **Fuente de verdad usada:** un juego real de documentos de una descarga
> (worksheet de inyección + simulación de composición + reporte final de
> descarga). Aquí se conserva el **método y los números como anclas de
> validación**, anonimizando identidades comerciales (buque, terminal,
> laboratorio, cliente) — mismo criterio white-label que ya se aplicó a las
> anclas COSTALD del kernel.

---

## 1. Por qué la descarga de LNG es "otro tipo de cálculo"

Todo lo que el programa calcula hoy (petróleo/derivados/LPG) es **custodia por
volumen→masa** con corrección por temperatura (CTL/VCF ASTM D1250, COSTALD para
LPG). El producto se factura por **volumen a 15 °C** o por **masa**.

El LNG **no se factura por volumen ni por masa: se factura por ENERGÍA**
(MMBtu/MWh). Y la cantidad no se mide directamente — se **calcula** a partir de:

1. la **composición molar** del gas (cromatografía, GPA 2261 / ISO 8943),
2. la **densidad del líquido** (calculada, no medida) por composición y
   temperatura,
3. el **poder calorífico** (GHV) por composición,
4. el **volumen** transferido (medido por el sistema de custodia del buque, CTS:
   nivel + temperatura + presión por tanque, antes y después),
5. correcciones por **vapor desplazado** y **gas consumido** (BOG a máquinas).

Es un módulo nuevo: densidad multicomponente + energía. El kernel actual no
tiene nada de esto (COSTALD-LPG es líquido/vapor de un producto, no mezcla
multicomponente con energía).

---

## 2. La cadena de determinación (custody transfer de LNG)

Referencia marco: **GIIGNL LNG Custody Transfer Handbook, 6ª ed. (2021)** —
manual de la industria; y **ISO 6976** (poder calorífico, densidad relativa,
Wobbe desde composición). El reporte de referencia usa el equivalente
norteamericano **GPA 2172/2145** para GHV, y cita **ISO 6578** (volúmenes
molares), **ISO 13398** (masa equivalente) e **ISO 8943/GPA 2261**
(muestreo/cromatografía).

```
composición molar (Xi)                    ┐
temperatura del LNG (T)                    ├─► DENSIDAD del líquido  D [kg/m³]
tablas Vi, K1, K2 (por T)                  ┘        (Klosek–McKinley revisado)

composición molar (Xi)                     ┐
tablas Hi, Hvi, Mi, √bi (constantes)       ├─► GHV masa Hm [Btu/lb]  y
                                            ┘    GHV volumen Hv [Btu/scf], Wobbe

volumen antes − volumen después (CTS)  ──► VOLUMEN entregado  V [m³]

MASA        = V × D
ENERGÍA bruta = MASA × Hm       (o Vgas × Hv)
ENERGÍA neta  = bruta − Qr (vapor desplazado) − Qf (BOG a máquinas)
```

---

## 3. Fórmulas exactas (validadas contra el reporte real)

### 3.1 Densidad — Klosek–McKinley revisado (RKM, GIIGNL)

```
        Σ (Xi · Mi)
D  =  ─────────────────────          [kg/m³]
      Σ (Xi · Vi)  −  Xm · C

C  =  K1  +  (K2 − K1) · (XN2 / 0.0425)
```

- `Xi` = fracción molar del componente i (normalizada a Σ = 1).
- `Mi` = masa molar del componente i (kg/kmol).
- `Vi` = volumen molar del componente i a la temperatura T (m³/kmol) — **de tabla**.
- `Xm` = fracción molar de **metano**; `XN2` = fracción molar de **nitrógeno**.
- `K1, K2` = coeficientes de corrección de volumen — **de tabla**, dependen de la
  masa molar de la mezcla y de T.
- Validez: T ≈ 93–133 K, masa molar 16–30 g/mol, N₂ y butano < 5 %.
  Incertidumbre ≈ ±0.1 %.

**Ancla de validación (reporte real, anonimizado):**
composición ≈ CH₄ 97.98 / C₂H₆ 1.78 / C₃H₈ 0.15 / iC₄ 0.03 / nC₄ 0.02 / N₂ 0.04
[mol%], T = −159.3 °C, K1 = 0.000071, K2 = 0.000165 →
masa molar M = Σ(Xi·Mi) = **16.3601 kg/kmol**, Vmix = **0.038474 m³/kmol**,
**D = 426.0 kg/m³**. (Reconciliado con el worked example al 4º decimal.)

### 3.2 Poder calorífico y Wobbe (GPA 2172/2145 ≈ ISO 6976)

```
GHV masa      Hm = Σ(Hi · Xi · Mi) / Σ(Xi · Mi)     [Btu/lb @ 60 °F]
GHV volumen   Hv = Σ(Xi · Hvi)  / Z                 [Btu/scf @ 60/60 °F, 14.696 psia]
compresibilidad  Z = 1 − ( Σ Xi·√bi )²              (factor de suma, gas real)
densidad relativa  dr = M / M_aire   (M_aire = 28.9626)
Wobbe         WI = Hv / √dr
```
- `Hi` = poder calorífico másico del componente (Btu/lb); `Hvi` = volumétrico
  (Btu/scf); `√bi` = factor de suma de compresibilidad del componente — **de tabla**.

**Ancla:** Hm = **23,811 Btu/lb**, Hv = **1,028.63 Btu/scf**, WI = **1,368.63**.

### 3.3 Cantidad y energía

```
V entregado = V_antes − V_después                    [m³ LNG]     (155,928.015 − 2,079.490 = 153,848.5)
MASA bruta  = V × D                                  [kg]         (153,848.5 × 426.0 = 65,539,461)  ✓
ENERGÍA bruta = MASA × Hm × 2.2046 / 10^6            [MMBtu]      (= 3,440,402 MMBtu)              ✓
Qr = energía del vapor desplazado (retorno)          [MMBtu]      (= 14,162)
Qf = energía del BOG consumido por máquinas (GTE+GCU)[MMBtu]      (= 1,255)
ENERGÍA neta = bruta − Qr − Qf                        [MMBtu]      (= 3,424,985)                    ✓
masa neta equivalente = energía neta / Hm  (ISO 13398)[t]         (= 65,245.768 Mton)
```
Todas las igualdades ✓ están reconciliadas exactamente con el reporte real.

---

## 4. Constantes oficiales que hay que cargar (no inventar)

El método es simple; el trabajo real es **cargar las tablas oficiales** con su
fuente citada (doctrina del proyecto: nunca fabricar constantes):

| Tabla | Contenido | Fuente |
|---|---|---|
| `Mi` | masa molar por componente (CH₄…nC₅, N₂, CO₂, iC₄, nC₄, iC₅, C₆⁺) | ISO 6976 / GPA 2145 |
| `Vi(T)` | volumen molar del líquido por componente vs T (93–135 K) | GIIGNL CTH / ISO 6578 |
| `K1(M,T)`, `K2(M,T)` | correcciones de volumen de la mezcla | GIIGNL CTH (RKM) |
| `Hi`, `Hvi` | poder calorífico másico y volumétrico por componente | GPA 2172/2145 / ISO 6976 |
| `√bi` | factor de suma de compresibilidad por componente | GPA 2172 / ISO 6976 |

Estas tablas son públicas (GIIGNL CTH 6ª ed.; ISO 6976:2016). Se transcriben una
vez a datos del kernel con test de ancla; el resto del cálculo es aritmética
exacta decimal, sin redondeos intermedios.

---

## 5. Estructura del reporte (lo que se entrega)

El reporte real de descarga tiene ~16 secciones. El módulo debe poder producir:

1. **Summary of Findings (1 y 2)** — load port / discharge port / intransit
   (boil-off %/día, largo del viaje, ajuste de huso), y las cifras clave:
   volúmenes O.C.T./C.C.T., densidad, GHV masa y volumen, energía bruta/neta,
   vapor desplazado, BOG, masa/volumen equivalente.
2. **LNG Quantity Report** — el cuadro de cantidad→masa→energía.
3. **Composition Calculations** — la hoja con densidad (RKM), GHV, Wobbe, energía
   (idéntica en estructura a §3, "explicable paso a paso" como el resto del kernel).
4. **Certificate of Analysis** — composición.
5. **Custody Transfer Reports (Opening/Closing, Primary/Secondary)** — gauging por
   tanque: nivel, temperatura, presión, volumen; primario y secundario.
6. **BOG Consumption** — gas a máquinas durante la operación.
7. **Statement of Facts** — cronología (NOR, atraque, apertura/cierre de custodia,
   inicio/fin de bombeo, salida).
8. **Observaciones / comentarios**.

Encaja con la plantilla común de operación del programa (TopBar → tarjetas de
entrada → tabla de resultados → veredicto/energía → reporte).

---

## 6. Diferencia con el kernel actual y alcance de implementación

**Nada de esto existe hoy.** Es el nivel 3 de esfuerzo (cálculo nuevo). Piezas:

### Kernel (Rust, decimal-exacto)
- Nuevo módulo `lng.rs`: `lng_density` (RKM), `lng_heating_value` (GHV/Wobbe/Z),
  `lng_energy` (masa→energía bruta/neta con Qr/Qf), todo con `rust_decimal`.
- Tablas de constantes §4 como datos embebidos, con procedencia citada.
- **Tests de ancla** con los números de §3 (densidad 426.0, GHV 23,811 / 1,028.63,
  masa 65,539,461, energía 3,440,402 / neta 3,424,985).
- Nuevo DTO string-in/out (misma fachada que el resto) + `kernel_call` desktop +
  export WASM (o **solo IPC nativo** en escritorio, coherente con la política
  anti-RE: la matemática comercial vive solo en el binario).
- Wrapper TS en `ui/src/lib/kernel.ts` (`lngDischarge(...)`).

### UI (React/TS)
- Página nueva `pages/Lng*` (o extender la de LPG con un modo LNG): entrada de
  **composición** (12–14 componentes, valida Σ=100), **propiedades** (T, presión,
  GHV si se ingresa del lab), **gauging** antes/después (o volúmenes directos),
  **vapor/BOG**; salida: densidad, GHV, Wobbe, masa, energía bruta/neta, masa
  equivalente — con el "trace" explicable.
- Ruta en `App.tsx` (`/trabajo/:id/lng-descarga`), entrada en la sidebar
  («Operaciones específicas»), tipo de operación `LNG_DISCHARGE` (ya existe como
  string en el desplegable; hoy no tiene pantalla propia).
- i18n ES/EN (namespace `lngd.*`) — encaja con el sistema bilingüe ya montado.
- Reporte: plantilla nueva con las secciones de §5, reutilizando `ReportHeader`,
  `.table-dense`, tokens y el pipeline de impresión.

### Datos de referencia (opcional, útil)
- Listas de **unidades de energía** (Btu/MMBtu/MJ/MWh/kWh…), **buques** y
  **terminales** LNG — el worksheet real trae un catálogo genérico de la industria
  (no específico de un cliente). Se puede incluir una versión propia como picklist.

### White-label / seguridad
- Anonimizar toda identidad real (buque, terminal, laboratorio, cliente, personas,
  referencias de cargo, fechas) en código, tests y datos demo → genéricos
  («buque de referencia», «terminal de referencia»), conservando solo los números
  físicos como ancla. Las constantes oficiales sí se citan con su norma.

---

## 7. Fases recomendadas

- **F-LNG-1 — Núcleo de cálculo (kernel):** `lng.rs` + tablas §4 + tests de ancla.
  Entregable verificable sin UI (cargo test verde contra los números reales).
- **F-LNG-2 — Puente:** DTO + IPC/WASM + wrapper TS; un smoke test desde la app.
- **F-LNG-3 — UI de operación:** página de composición+gauging+resultados con trace.
- **F-LNG-4 — Reporte:** plantilla de descarga de LNG (secciones §5) + impresión.
- **F-LNG-5 — Datos de referencia + i18n + pulido + QA visual.**

El riesgo real está en **F-LNG-1** (cargar bien las tablas Vi/K1/K2/Hi/Hvi y
reproducir las anclas). Una vez verde ahí, el resto es el patrón ya conocido del
programa.

---

## 8. Fuentes

- GIIGNL — *LNG Custody Transfer Handbook*, 6ª ed. (2021): método RKM de densidad,
  tablas Vi/K1/K2, cadena de energía. https://giignl.org
- ISO 6976:2016 — *Natural gas — Calculation of calorific values, density, relative
  density and Wobbe indices from composition* (tablas de propiedades por componente).
- GPA 2172 / GPA 2145 — cálculo de GHV, densidad relativa y factor de compresibilidad
  desde composición (usado en el reporte de referencia; equivalente norteamericano de ISO 6976).
- ISO 6578 — volúmenes molares del líquido para corrección de volumen de LNG.
- ISO 13398 — masa/volumen equivalente de LNG.
- ISO 8943 / GPA 2261 — muestreo y cromatografía de la composición.
- Tietz et al. (2017) — *Enhanced Revised Klosek & McKinley (ERKM)*: extensión del
  método a mayores rangos de T y presión (referencia académica; no requerida para
  custody transfer estándar).

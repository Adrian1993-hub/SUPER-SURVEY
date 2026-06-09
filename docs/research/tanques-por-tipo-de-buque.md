> ⚠️ **MATERIAL DE INVESTIGACIÓN — BORRADOR PENDIENTE DE REVISIÓN CONJUNTA**
> No es documento formal ni doctrina aprobada. Insumo para el PRD / AppFlow / modelo de datos.
> Generado por investigación con fuentes web. Revisar y depurar antes de integrar.

---

# Distribución de Tanques a Bordo: Tanques de Máquinas vs. Tanques de Carga — Doctrina Técnica para Software de Survey de Cantidad

**Versión:** Junio 2026 | **Dominio:** Survey marítimo de cantidad | **Idioma:** Español técnico

---

## Tabla de Contenidos

1. [Tanques de Máquinas / Bunker](#1-tanques-de-maquinas--bunker)
2. [Tanques Comerciales de Carga — por Tipo de Buque](#2-tanques-comerciales-de-carga)
3. [Tabla Comparativa por Tipo de Buque](#3-tabla-comparativa)
4. [Implicaciones para el Modelo de Datos](#4-modelo-de-datos)
5. [Fuentes](#5-fuentes)

---

## 1. Tanques de Máquinas / Bunker

### 1.1 Concepto y Distinción Fundamental

Los **tanques de máquinas** (también llamados tanques de bunker, de servicio o de consumo) son los tanques que almacenan y acondicionan el combustible, aceites y otros fluidos operativos para la propulsión y los servicios del buque. **No contienen carga comercial.** Para el surveyor de cantidad, confundirlos con los tanques de carga es un error grave que afecta los estados de cuenta (B/L, NOR, cargo outturn).

La distinción es regulatoria: MARPOL Anexo I Regulación 12A (en vigor desde agosto 2007, aplicable a buques entregados desde agosto de 2010) exige que los tanques de fuel oil con capacidad agregada superior a 600 m³ estén protegidos dentro del doble casco, separando físicamente el espacio de bunker del casco exterior y de los tanques de carga.

---

### 1.2 Tipos y Ubicación Típica

#### A) Cadena del Combustible Pesado (HFO / VLSFO)

| Tanque | Función | Ubicación típica | Capacidad orientativa |
|--------|---------|------------------|----------------------|
| **HFO Storage Tank** (Tanque de almacenamiento) | Recibe el bunker desde el manifold. Primer depósito. | Doble fondo, tanques profundos (deep tanks) o tanques de alas, **fuera** del espacio de máquinas | Cientos a miles de m³ |
| **HFO Settling Tank** (Tanque de decantación) | Decantación por gravedad: agua y sedimentos caen al fondo; el combustible fluye por la parte superior al service tank | Bulkhead del espacio de máquinas, generalmente elevado | ≥ 24 h de consumo a máxima potencia (MCR) |
| **HFO Service Tank** (Tanque de servicio / día) | Suministro directo al motor principal, generadores y caldera. Solo combustible en condiciones de uso | Espacio de máquinas, elevado (por gravedad al purificador/mezclador) | ≥ 8 h de consumo a MCR (requisito SOLAS Reg. II-1/26) |

El ciclo operativo es: **Storage → Settling → Purificadoras → Service → Motor**.

#### B) Combustibles Ligeros (MGO / MDO / Diesel)

| Tanque | Combustible | Posición |
|--------|------------|---------|
| **MDO / MGO Storage Tank** | Marine Diesel Oil o Marine Gas Oil (ISO 8217: DM grades) | Doble fondo o tanques de alas, separados del HFO para evitar mezcla |
| **MDO Service Tank** | MDO listo para uso | Espacio de máquinas, alta |
| **Overflow / Drain Tank** | Recuperación de derrames y drenajes | Espacio de máquinas, bajo |

> **Nota regulatoria:** Desde la entrada en vigor de IMO 2020 (MARPOL Anexo VI), los buques que no utilizan scrubbers deben operar con VLSFO (≤0,5% S) en aguas fuera de ECA o MGO en ECA (≤0,1% S). Esto implica tanques de VLSFO separados o compartidos con HFO, lo que requiere correcta identificación en el survey de ROB.

#### C) Aceites Lubricantes

| Tanque | Función | Ubicación |
|--------|---------|-----------|
| **Lube Oil Sump (Cárter)** | Depósito bajo el motor principal | Fondo del motor, parte del motor mismo |
| **Lube Oil Storage Tank** | Reserva de aceite lubricante | Doble fondo o espacio de máquinas |
| **Lube Oil Daily (Service) Tank** | Suministro diario al motor | Espacio de máquinas, elevado |
| **Cylinder Oil Tank** | Aceite de cilindros (motores 2T) | Espacio de máquinas |
| **Dirty Oil / Sludge Tank** | Sedimentos de purificación y agua contaminada | Fondo del espacio de máquinas |

#### D) Tanques de Servicio del Buque (no propulsión directa, pero tampoco carga)

| Tanque | Contenido | Posición típica |
|--------|-----------|----------------|
| **Ballast Water Tanks** | Agua de mar para estabilidad y escora | Doble fondo, tanques de pique (fore peak, aft peak), tanques de alas |
| **Fresh Water Tanks (FW / DW)** | Agua potable y de lavado | Doble fondo, pique de proa |
| **Slop Tanks** (en tanqueros) | Mezcla agua/aceite de residuos de lavado de tanques | Generalmente los dos últimos tanques de alas a popa (stern-most wing tanks) |
| **Bilge Holding Tank** | Agua de sentinas contaminada con aceite | Espacio de máquinas |

---

### 1.3 Métodos de Medición y Su Importancia para el Surveyor

#### Tipos de Medición

| Método | Descripción | Aplicación típica |
|--------|-------------|-------------------|
| **Sounding (sondeo)** | Se mide desde el fondo del tanque hasta la superficie del líquido. Adecuado para tanques poco llenos (líquido ligero o tanques bajos) | Tanques de doble fondo (ballast, FW, storage) |
| **Ullage** | Se mide desde la superficie del líquido hasta el techo del tanque (espacio vacío). Adecuado para tanques casi llenos (líquido pesado, HFO) | Tanques de servicio y settling de HFO |
| **Sounding pipe manual** | Cinta graduada de latón/acero con plomada, insertada en el tubo de sondeo. Método primario, manual | Universal |
| **Float gauge** | Flotador unido a indicador visual a través de polea | Tanques de máquinas con acceso difícil |
| **Radar de onda guiada** | Pulso microondas en tubo "still pipe", precisión ±1 mm | Tanques de carga en tanqueros modernos |
| **Diferencial de presión** | Sensor en fondo del tanque calcula altura de columna de líquido | Tanques presión, ballast |
| **Capacitancia** | Sensor eléctrico, mide permitividad del líquido | LNG, tanques criogénicos |

#### Por Qué Importa al Surveyor: ROB (Remaining on Board)

El **Bunker ROB Survey** o **Bunker Quantity Survey (BQS)** determina independientemente la cantidad de combustible a bordo. Su importancia:

1. **Al cambio de armador / fletador:** El ROB es un activo valorable; errores en la medición significan pérdida financiera.
2. **Al contratar un nuevo fletamento:** El fletador puede estar pagando o recibiendo compensación por el ROB previo.
3. **MARPOL Anexo VI:** La BDN (Bunker Delivery Note) y el muestreo representativo son obligatorios; el surveyor verifica cantidades contra la BDN.
4. **Investigación de discrepancias:** El surveyor detecta tablas de calibración cuestionables o errores de temperatura.
5. **No confundir con carga:** En un quimiquero, el surveyor debe distinguir qué tanques son de bunker y cuáles son de carga, especialmente si el buque también transporta productos que son combustible (p. ej., gasoil como carga).

**Procedimiento estándar de ROB:**
1. Tomar sondeo/ullage independiente de todos los tanques de bunker.
2. Aplicar corrección de trim y escora (list) con la tabla de calibración del tanque.
3. Aplicar VCF (Volume Correction Factor) con tabla ASTM 54B o 6B según la densidad del combustible y temperatura observada.
4. Convertir a toneladas métricas: `Masa (MT) = Volumen (m³) × VCF × WCF` donde WCF proviene de tabla ASTM 56.
5. Documentar y firmar el ROB Report.

---

## 2. Tanques Comerciales de Carga — por Tipo de Buque

### 2.1 Petroleros de Crudo / VLCC

#### Arreglo de Tanques

Los petroleros de casco doble de crudo suelen seguir una configuración **5 × 3** (o similar):
- **5 filas longitudinales** de tanques (cargos 1 al 5 o más)
- **3 columnas transversales**: Centro (Centre Tank) + Babor Wing + Estribor Wing
- Resultado típico: **15 tanques de carga** + **2 slop tanks** en las alas de popa

**VLCC típico (ejemplo: clase 311,000 DWT):**
- 5 tanques centrales + 5 pares de tanques de alas = 15 tanques de carga
- Capacidad total ~336,000 m³
- 2 slop tanks revestidos (coal tar epoxy)

Los slop tanks reciben los residuos del COW (Crude Oil Washing) y los lavados de tanques. Los buques de 70,000 DWT o más deben tener al menos 2 slop tanks (MARPOL Anexo I, Reg. 29).

#### Sistemas Específicos

**COW (Crude Oil Washing):** Sistema que utiliza el propio crudo descargado como fluido de lavado para eliminar residuos adheridos a mamparos y fondos durante la descarga. Los buques VLCC deben tener COW certificado (MARPOL 78). Las máquinas de lavado giratorias son programables y están instaladas en todos los tanques de carga y slop.

**Sistema de Gas Inerte (IGS):** Obligatorio en tanqueros de más de 20,000 DWT que transportan crudo u otros productos inflamables (SOLAS II-2/4). El IGS introduce gas con menos del 5% de O₂ en los tanques, eliminando el riesgo de explosión. El surveyor debe verificar el estado de inertización antes de medir.

#### Medición en Petroleros de Crudo

| Parámetro | Método |
|-----------|--------|
| **Ullage** | Primario. Medición desde superficie del crudo hasta la cúpula (techo) del tanque. UTI (Ullage/Temperature/Interface) gauge manual o radar fijo |
| **Temperatura** | UTI con sonda de temperatura o sensor de temperatura fijo en múltiples alturas |
| **Interfaz agua/crudo (Free Water)** | Pasta sensible al agua en la cinta del UTI, o sonda de interfaz (water cut meter) |
| **Radar gauging** | Buques modernos: sistema de radar tipo Kongsberg/Emerson con precisión ±1–2 mm |
| **Corrección de trim** | Obligatoria. Se obtiene del Trim Correction Table del Tank Calibration Book |
| **Corrección de escora (list/heel)** | Obligatoria si escora > 0,5° |

**Cadena de cálculo (crude oil survey):**

```
Ullage observado
    → ± Corrección de trim / list  = Ullage corregido
    → Tabla de calibración         = TOV (Total Observed Volume, m³)
    → − Free Water Volume          = GOV (Gross Observed Volume, m³)
    → × VCF (ASTM 54A / tabla T)   = GSV (Gross Standard Volume, m³ @ 15°C)
    → × WCF (densidad @ 15°C)      = Masa en aire (MT)
    → − S&W (Sediment & Water, %)  = NSV (Net Standard Volume) → Carga neta
```

---

### 2.2 Petroleros de Productos Limpios

#### Clasificación por Tamaño

| Clase | DWT típico | Ejemplo de ruta |
|-------|-----------|----------------|
| MR (Medium Range) | 25,000–55,000 | Refinería local a terminales regionales |
| LR1 (Long Range 1) | 55,000–75,000 | Refinería a continente (Panamax) |
| LR2 (Long Range 2) | 75,000–110,000 | Larga distancia, suez-max |

Los product tankers tienen revestimiento epoxy (o zinc) para proteger el acero del contacto con los productos limpios (gasolina, gasoil, jet fuel, nafta). Pueden transportar múltiples grados en una misma travesía gracias a la **segregación de tanques**.

**Número de tanques:** Típicamente 10–20 tanques de carga, con varias segregaciones independientes (líneas de carga/descarga separadas, manifolds independientes).

**Medición:** Similar al crudo, pero usando tablas ASTM series 'B' (petroleum products) en lugar de 'A' (crude oil). La exactitud de temperatura es crítica porque los productos tienen mayor variación volumétrica.

---

### 2.3 Quimiqueros (Chemical Tankers)

#### Clasificación IMO (Código IBC, post-1986)

| Tipo IMO | Peligrosidad | Ubicación de tanques | Cargos típicos |
|----------|-------------|---------------------|----------------|
| **Tipo 1** | Máxima (grave riesgo ambiental y seguridad) | Máxima distancia al casco: min. B/5 desde costado, min. B/15 desde quilla; no menos de 760 mm del forro | Metanol, algunos ácidos, productos muy tóxicos; capítulo 17 IBC con requisito máximo |
| **Tipo 2** | Apreciable | Distancia reducida respecto al tipo 1 | Mayoría de productos químicos peligrosos (aceites vegetales, estireno, benceno, etc.) |
| **Tipo 3** | Moderada | Contención moderada; puede llevar tanques en el casco sin protección máxima | Ácido fosfórico diluido, productos menos peligrosos |

> La mayoría de los quimiqueros en servicio son IMO 2 y 3 (el volumen de cargas IMO 1 es limitado).

#### Materiales de Tanques

| Material / Revestimiento | Características | Cargas compatibles |
|--------------------------|----------------|-------------------|
| **Acero inoxidable 316L** | Resistente a ácidos, fácil limpieza, desorción rápida | Ácido sulfúrico, fosfórico, cloruro de metileno, cargas agresivas, amplísima gama |
| **Epoxy fenólico** | Protege acero naval, cura a alta temp., desorción lenta | Vegetable oils, gasoil, alcohol, muchos productos no ácidos |
| **Epoxy estándar / zinc** | Menor resistencia química | Productos limpios, combustibles no agresivos |
| **Zinc silicato** | Alta resistencia a temperaturas, desorción rápida | Hidrocarburos, xileno, tolueno |

La elección del revestimiento determina el **cargo portfolio** del buque y el **tiempo de limpieza entre cargamentos**, lo que tiene implicaciones directas para el surveyor al verificar la condición del tanque.

#### Estructura Típica de Tanques

- **Muchos tanques pequeños:** Un quimiquero MR puede tener 20–40 tanques de carga independientes
- **Deepwell pumps:** Una bomba por tanque, instalada dentro del propio tanque. Elimina el pumproom tradicional, mejora la segregación y reduce riesgo de contaminación cruzada
- **Deck tanks:** Tanques adicionales en cubierta para cargas que requieren temperatura controlada o no son compatibles con los revestimientos de los tanques de carga
- **Nitrogen (N₂) padding / purging:** Sistema PSA o membrana de N₂ para inertización de tanques con cargas combustibles (O₂ < 5%) o para mantener atmósfera inerte en cargas reactivas al oxígeno

#### Medición en Quimiqueros

| Parámetro | Método |
|-----------|--------|
| **Ullage / sounding** | UTI gauge manual o sensor fijo (capacitancia, radar) por tanque |
| **Temperatura** | Sensor por tanque (algunos tienen calefacción por serpentines para cargas con alto punto de fluidez) |
| **Densidad** | Densímetro o cálculo a partir de especificaciones del producto |
| **VCF** | Tablas ASTM 6B/54B para productos o densidad calculada según la naturaleza del cargo |
| **Segregación** | El surveyor verifica que las líneas estén "positivamente segregadas" (air gap, blind flange, o válvula tipo SUET) antes de verificar cantidades de cargo |
| **Pureza / contaminación** | No es función del quantity surveyor, pero el condition surveyor verifica residuos anteriores |

---

### 2.4 Gaseros (LPG / LNG)

Los gaseros son los más complejos desde el punto de vista de medición por la naturaleza bifásica (líquido + vapor) de la carga y las condiciones criogénicas o de alta presión.

#### 2.4.1 Tipos de Tanques según el Código IGC (IGC Code, SOLAS)

| Tipo | Descripción | Presión diseño | Temperatura | Uso típico |
|------|-------------|---------------|------------|-----------|
| **Tipo A** (prismatic / gravity) | Estructura autoportante de forma prismática, análisis tensional completo. Barrera secundaria completa o parcial. | ≤ 0,7 barg | Hasta −165°C (LNG) | LNG grandes, algunos LPG |
| **Tipo B** (semi-membrane / Moss) | Autoportante esférico (Moss Rosenberg) o prismático optimizado. Barrera secundaria parcial. | ≤ 0,7 barg | −165°C | LNG esférico (Moss), LPG grandes |
| **Tipo C** (pressure vessel) | Recipiente a presión fabricado bajo norma de recipientes, cilíndrico o esférico, autoportante. **No requiere barrera secundaria completa.** | > 2 barg (típico 5–18 barg) | −48°C a +45°C | LPG semirrefrigerado, amoniaco, etileno |
| **Membrana** (GTT NO96 / Mark III) | Membrana delgada (~0,7 mm) de Invar (NO96) o acero inoxidable corrugado (Mark III) apoyada sobre estructura aislante; no autoportante | ~Atmosférico (+ presión de vapor) | −163°C (LNG) | LNG exclusivamente |

**Nota sobre Moss Rosenberg:** Técnicamente es Tipo B. Las esferas son autoportantes y atraviesan la cubierta del buque. Son visibles a distancia como "bolas" sobre el casco.

#### 2.4.2 Tipos de Buques Gaseros

| Categoría | Descripción | Sistema de tanques | Carga típica |
|-----------|------------|-------------------|-------------|
| **Totalmente presurizado** (Fully Pressurized) | Opera a temperatura ambiente, alta presión (8–18 barg). Sin refrigeración. | Tipo C cilíndrico | LPG (propano, butano) pequeños buques |
| **Semirrefrigerado** (Semi-refrigerated) | Combina presión (~5–7 barg) y refrigeración parcial (~−48°C). | Tipo C bilobular o cilíndrico | LPG, NH₃, propileno |
| **Totalmente refrigerado** (Fully Refrigerated) | Opera a presión atmosférica (o muy baja) y temperatura criogénica. | Tipo A o B prismático | LPG grande (−48°C), NH₃ (−33°C) |
| **LNG Carrier** (grande) | Temperatura −163°C, presión casi atmosférica | Membrana (GTT NO96, Mark III) o Moss (Tipo B) | LNG exclusivamente |
| **FSRU / FSU** | Unidades flotantes de regasificación/almacenamiento | Membrana o Tipo C | LNG |

#### 2.4.3 Medición de Cargo en Gaseros: Principios

La medición en gaseros difiere fundamentalmente de los líquidos convencionales porque:
1. El cargo existe en **dos fases simultáneas:** fase líquida (el cargo propiamente dicho) y fase vapor (vapor en el espacio libre del tanque, también cuantificable como masa).
2. Las propiedades (densidad, volumen) dependen fuertemente de **temperatura y presión**.
3. Se utilizan sistemas **CTMS (Cargo Tank Measurement System)** o **CMS (Custody Transfer Measurement System)** certificados por sociedades de clasificación.

**Sensores requeridos por tanque:**

| Parámetro medido | Sensor | Nota |
|-----------------|--------|------|
| **Nivel de líquido** | Capacitancia (tradicional en LNG) o Radar guiado en still pipe | Precisión requerida ±1–2 mm |
| **Temperatura del líquido** | RTD/PT100 en múltiples alturas del tanque | Necesario para calcular densidad |
| **Temperatura del vapor** | RTD en el espacio de vapor | Para calcular densidad del gas |
| **Presión** | Manómetro de presión relativa | Crítico para LNG (presión ~ 0,1–0,3 barg) y LPG (hasta 18 barg) |
| **High/Low level alarm** | Flotador fijo (Fixed Liquid Level Gauge, FLLG) | Alarma de límite, no para custody transfer |

**Cadena de cálculo para LPG (Código ISO 6578, DIN 51650):**

```
Nivel de líquido medido (mm)
    → Tabla de calibración del tanque → Volumen de líquido observado (m³)
    → Temperatura promedio del líquido → Densidad del líquido (kg/m³) [Francis o COSTALD]
    → Masa de líquido = Vol_líquido × Densidad_líquido

Volumen total del tanque (de tabla)
    − Volumen de líquido = Volumen del espacio de vapor (m³)
    → Temperatura vapor + Presión → Densidad del vapor (gas ideal o Pitzer)
    → Masa de vapor = Vol_vapor × Densidad_vapor

MASA TOTAL CARGO = Masa líquido + Masa vapor
```

**Cadena de cálculo para LNG (CTMS, referencia ISO 6578 / GIIGNL Handbook):**

Idéntica en concepto, pero con temperaturas de −163°C y densidades del LNG calculadas según composición (con el NIST REFPROP o tablas GIIGNL). La fase vapor en LNG a baja presión contribuye con menos del 0,5% de la masa total, pero debe incluirse en el custody transfer.

**Documentación de Custody Transfer (LNG):**
- **OCT Report (Opening Custody Transfer):** Niveles, volúmenes, temperaturas, presiones en todos los tanques antes de la operación
- **CCT Report (Closing Custody Transfer):** Mismas mediciones al finalizar
- La cantidad transferida = diferencia entre OCT y CCT

> **Incertidumbre:** Los métodos de cálculo de densidad para mezclas LPG/LNG varían entre operadores (Francis vs. COSTALD vs. REFPROP). El surveyor debe verificar qué método usa el CTMS instalado.

---

## 3. Tabla Comparativa por Tipo de Buque

### 3.1 Características de Tanques de Carga

| Atributo | Petrolero Crudo (VLCC) | Product Tanker (MR/LR) | Quimiquero (IMO 1/2/3) | Gasero LPG | Gasero LNG |
|----------|----------------------|----------------------|----------------------|-----------|----------|
| **N° de tanques de carga (típico)** | 12–18 + 2 slop | 10–20 | 20–40 | 4–8 (Tipo C) / 4–6 (refrigerado) | 4–5 (membrana) / 4–6 (Moss) |
| **Tamaño individual** | 10,000–40,000 m³ | 1,000–5,000 m³ | 200–2,000 m³ | 200–2,000 m³ | 30,000–50,000 m³ |
| **Forma** | Prismática (casco doble) | Prismática | Prismática, cilíndrica en deck | Cilíndrica / bilobular (Tipo C) | Esférica (Moss) / Prismática (membrana) |
| **Material / Revestimiento** | Acero naval (desnudo o tar epoxy en slop) | Epoxy, zinc silicato | SS 316L, epoxy fenólico, zinc | Acero de baja temperatura (LT steel) | Invar (NO96), SS corrugado (Mk III), Al. (Moss) |
| **Presión de operación** | Atmosférica + IGS | Atmosférica | Atmosférica | 5–18 barg (Tipo C presurizado) / ~atm (refrigerado) | ~0,1–0,3 barg (membrana) |
| **Temperatura de operación** | Ambiente (crudo caliente ~40–60°C) | Ambiente o calefactado | Ambiente o calefactado (hasta ~80°C) | −48°C a +45°C | −163°C |
| **Sistema de bombas** | Sumergibles de turbina (pumproom) | Sumergibles / centrífugas | Deepwell (1 por tanque) | Sumergibles criogénicas | Sumergibles criogénicas |
| **Sistema de inertización** | IGS obligatorio (O₂ < 5%) | No siempre obligatorio | N₂ (PSA o membrana) para combustibles/reactivos | N₂ o vapor del propio LPG | Boil-off gas (BOG) del propio LNG |
| **COW** | Sí (obligatorio VLCC) | No | No | No | No |
| **Slop tanks** | Sí (2 mínimo, MARPOL) | Sí (generalmente) | Slop/residue tank o cargado como cargo | N/A | N/A |
| **Método de medición principal** | Ullage (UTI manual o radar) | Ullage (UTI o radar) | Ullage o sounding (UTI o sensor) | Nivel + T + P (CTMS) | Nivel + T + P (CTMS, capacitancia/radar) |
| **Tabla de calibración** | Sí, por tanque (ullage + trim correction) | Sí, por tanque | Sí, por tanque | Sí, con corrección de trim/list limitada (Tipo C cilíndrico tiene poca variación) | Sí, con corrección para forma esférica o membrana |
| **Corrección de trim / list** | Crítica (grandes tanques) | Importante | Variable | Menor impacto (recipiente a presión rígido) | Crítica (grandes tanques prismáticos) |
| **Free water / interfaz** | Sí (water cut / pasta) | Sí | Sí | No significativo (fase separada) | No aplicable |
| **Cálculo de vapor** | No | No | No | Sí (masa vapor en espacio libre) | Sí (BOG cuantificado) |
| **Standard de referencia** | ASTM/IP 6A, 54A, 56; MPMS (API) | ASTM/IP 6B, 54B, 56 | ASTM 6B o propiedades específicas del químico | ISO 6578, DIN 51650, GIIGNL | ISO 6578, GIIGNL Handbook, NIST REFPROP |

---

### 3.2 Tanques de Máquinas vs. Carga: Resumen Comparativo

| Criterio | Tanques de Máquinas / Bunker | Tanques de Carga Comercial |
|----------|-----------------------------|-----------------------------|
| **Propósito** | Operar el buque (propulsión, energía, servicios) | Transportar mercancía por cuenta del fletador/cargador |
| **Contenido** | HFO, VLSFO, MGO, MDO, aceite lubricante, agua, sentinas | Crudo, productos refinados, químicos, LPG, LNG |
| **Regulación principal** | MARPOL Anexo VI (bunker), SOLAS II-1 (servicio) | MARPOL Anexo I (tanqueros crudo/productos), IBC Code (quimiqueros), IGC Code (gaseros) |
| **Survey relevante** | Bunker Quantity Survey (ROB) | Cargo Quantity Survey (loading / outturn) |
| **Impacto en B/L** | No (no son carga) | Sí (determina lo que se factura) |
| **Quién paga error de medición** | Armador / fletador según contrato de fletamento | Cargador / receptor / P&I club |
| **Método de medición estándar** | Sounding/ullage + ASTM 54B/56 | Ullage + ASTM 54A/54B/56 o CTMS (gases) |

---

## 4. Modelo de Datos: Entidad "Tanque" para Software de Survey

Un software de survey de cantidad debe soportar todos los tipos descritos. La entidad **Tank** (Tanque) necesita los siguientes atributos agrupados por categoría:

### 4.1 Identificación y Clasificación

```
Tank {
    tank_id          : UUID (PK)
    vessel_id        : FK → Vessel
    tank_name        : string           // e.g., "No.3 Center Cargo Tank", "HFO Stbd DB"
    tank_code        : string           // código interno (ej. "3C", "HFO-DB-S")
    tank_category    : enum             // CARGO | BUNKER_FUEL | LUBE_OIL | BALLAST |
                                        // FRESH_WATER | SLOP | BILGE | COFFERDAM | OTHER
    tank_subcategory : enum             // Para BUNKER_FUEL: STORAGE | SETTLING | SERVICE | OVERFLOW
                                        // Para CARGO: CENTRE | WING | DECK | SLOP
    cargo_type       : string           // HFO, VLSFO, MGO, MDO, LO, CRUDE, GASOIL, METHANOL,
                                        // LPG_PROPANE, LPG_BUTANE, LNG, NH3, etc.
    imo_ship_type    : enum             // IMO_1 | IMO_2 | IMO_3 | NOT_APPLICABLE
    igc_tank_type    : enum             // TYPE_A | TYPE_B | TYPE_C | MEMBRANE_NO96 |
                                        // MEMBRANE_MARKIII | MOSS | NOT_APPLICABLE
}
```

### 4.2 Atributos Físicos

```
    material         : enum             // MILD_STEEL | SS316L | SS304 | ALUMINIUM | INVAR | OTHER
    coating          : enum             // NONE | COAL_TAR_EPOXY | PHENOLIC_EPOXY | ZINC_SILICATE |
                                        // EPOXY_STANDARD | SS_CLAD | OTHER
    heating_coils    : boolean          // ¿Tiene serpentines de calefacción?
    design_pressure_barg : decimal      // Presión de diseño (barg); 0 para atm
    design_temp_min_degC : decimal      // Temperatura mínima de diseño (°C); −163 para LNG
    design_temp_max_degC : decimal      // Temperatura máxima de diseño (°C)
    capacity_m3      : decimal          // Capacidad máxima (100% lleno)
    position         : enum             // DOUBLE_BOTTOM | WING | DEEP_TANK | DECK | FORE_PEAK |
                                        // AFT_PEAK | ENGINE_ROOM | VOID_SPACE
    frame_from       : integer          // Cuaderna de inicio
    frame_to         : integer          // Cuaderna de fin
    location_ps      : enum             // PORT | STARBOARD | CENTRE | N/A
```

### 4.3 Sistema de Medición

```
    measurement_method : enum           // SOUNDING | ULLAGE | PRESSURE_DIFFERENTIAL |
                                        // CAPACITANCE | RADAR | FLOAT_GAUGE | CTMS
    measurement_reference : enum        // TOP_OF_TANK (ullage) | BOTTOM_OF_TANK (sounding)
    sounding_pipe_id : string           // Identificador del tubo de sondeo/ullage
    sounding_pipe_height_mm : decimal   // Altura del tubo sobre la referencia del tanque
    ullage_datum_mm  : decimal          // Distancia de referencia para ullage (techo interno)
    has_manual_backup : boolean         // ¿Tiene sondeo manual de respaldo?
    sensor_make_model : string          // Fabricante y modelo del sensor (si aplica)
    ctms_certified   : boolean          // ¿Sistema CTMS certificado para custody transfer?
    ctms_class_approval : string        // Sociedad clasificadora que aprobó el CTMS
```

### 4.4 Tabla de Calibración

```
CalibrationTable {
    table_id         : UUID (PK)
    tank_id          : FK → Tank
    table_type       : enum             // SOUNDING | ULLAGE
    units_level      : enum             // MM | CM | M | INCHES
    units_volume     : enum             // M3 | BBL | LITERS | GALLONS
    approval_date    : date
    approved_by      : string           // Sociedad de clasificación o verificador
    trim_range_min_m : decimal          // Rango de trim cubierto por la tabla
    trim_range_max_m : decimal
    list_correction_available : boolean
    entries          : [CalibrationEntry]
}

CalibrationEntry {
    level_value      : decimal          // Valor de sondeo o ullage
    volume_at_even_keel : decimal       // Volumen a quilla recta
    trim_correction_per_m : decimal     // Corrección de volumen por metro de trim
    list_correction  : decimal          // Corrección por escora (si aplica)
}
```

### 4.5 Correcciones y Factores

```
    // Para líquidos convencionales (crudo, productos, bunkers)
    vcf_table_reference : string        // "ASTM 54A", "ASTM 54B", "ASTM 6B", "IP Table 60", etc.
    astm_product_group  : enum          // GROUP_A (crude) | GROUP_B (products) | GROUP_C (lubricants)
    density_at_15c_kg_m3 : decimal      // Densidad de referencia @ 15°C (del producto o BDN)
    temperature_correction_applicable : boolean

    // Para gases (LPG / LNG)
    phase_liquid_calculation : enum     // FRANCIS | COSTALD | NIST_REFPROP | GIIGNL | OTHER
    phase_vapor_calculation  : enum     // IDEAL_GAS | PITZER | NIST_REFPROP | OTHER
    vapor_mass_included_in_total : boolean  // ¿Se incluye la masa de vapor en el total?
    composition_required     : boolean  // ¿Requiere análisis GC para calcular densidad?
    cargo_composition        : JSON     // % molar por componente (C1, C2, C3, iC4, nC4, etc.)
```

### 4.6 Segregación y Compatibilidad

```
    segregation_group : string          // Código o letra de segregación (ej. "SEG-A", "1", "2")
    segregation_type  : enum            // POSITIVE | COMPLETE | PARTIAL | NONE
    // Positive: air gap físico; Complete: válvula ciega; Partial: válvula de cierre
    compatible_cargoes : [string]       // Lista de cargas aceptadas según coating/material
    last_cargo        : string          // Última carga transportada (para cálculo de desorción)
    inert_gas_type    : enum            // NONE | IGS_FLUE_GAS | IGS_INERT_GAS_GENERATOR | N2_PSA |
                                        // N2_MEMBRANE | LPG_VAPOR | LNG_BOG
```

### 4.7 Estado y Operativo (en el contexto del survey)

```
SurveyTankReading {
    reading_id       : UUID (PK)
    survey_id        : FK → Survey
    tank_id          : FK → Tank
    timestamp        : datetime
    trim_m           : decimal          // Trim del buque en el momento de la lectura
    list_deg         : decimal          // Escora en grados
    observed_level_mm : decimal         // Sondeo/ullage observado en mm
    corrected_level_mm : decimal        // Nivel corregido por trim/list
    temperature_degC : decimal          // Temperatura del líquido/cargo
    pressure_barg    : decimal          // Presión (relevante para gases)
    free_water_mm    : decimal          // Lectura de interfaz agua/producto (si aplica)
    tov_m3           : decimal          // Total Observed Volume
    gov_m3           : decimal          // Gross Observed Volume (después de −FW)
    vcf              : decimal          // Volume Correction Factor aplicado
    gsv_m3           : decimal          // Gross Standard Volume @ 15°C
    mass_mt          : decimal          // Masa en toneladas métricas (en aire)
    vapor_mass_mt    : decimal          // Masa de vapor (solo gases)
    total_mass_mt    : decimal          // masa_líquido + masa_vapor
    is_bunker        : boolean          // Flag: ¿es tanque de bunker? (no carga)
    notes            : text
}
```

### 4.8 Consideraciones de Diseño Clave

1. **Polimorfismo por tipo de tanque:** Se recomienda una arquitectura de herencia o discriminador de tipo para que los atributos específicos de gases (composición, vapor, CTMS) no contaminen el schema de tanques convencionales.

2. **Tabla de calibración como objeto separado:** La calibración cambia con el tiempo (recocido de tanques, reparaciones); debe tener versionado con fecha de aprobación.

3. **La corrección de trim/list es obligatoria** para cualquier tanque grande. Para tanques Tipo C cilíndricos de LPG la corrección es mínima (geometría rígida y simétrica), pero no nula.

4. **Bandera `is_bunker`:** Crítica para que el software no incluya tanques de bunker en el cargo tally ni en el B/L.

5. **Compatibilidad de unidades:** El sistema debe soportar m³, BBL (barriles), m.t., LT (long tons), y litros. Las conversiones deben trazarse en el audit trail del survey.

6. **Audit trail:** Cada lectura debe ser inmutable una vez firmada. El modelo debe soportar lecturas preliminares y lecturas finales (endorsed).

---

## 5. Fuentes

Las siguientes fuentes fueron consultadas para este documento. Se indica el dominio y el tipo de contenido:

**Tanques de máquinas y bunker:**
- [Bunkering Arrangement – Ships Business](https://shipsbusiness.com/bunkering-arrangement.html) — Disposición de tanques de bunker, seguridad y sistemas de transferencia
- [Fuel Oil Bunker Transfer System – MarineInfo](https://marineinfo.com/fuel-oil-bunker-transfer-system/) — Sistema de transferencia HFO/MDO
- [Fuel Oil System for Marine Diesel Engine – MachinerySpaces](http://www.machineryspaces.com/fuel-oil-system.html) — Ciclo completo del sistema de combustible (storage → settling → service)
- [Fuel Oil Service Tank – Wärtsilä Encyclopedia](https://www.wartsila.com/encyclopedia/term/fuel-oil-service-tank) — Definición y requisitos de capacidad del service tank
- [A Comprehensive List of Fuel, Diesel and Lube Oil Tanks – Marine Insight](https://www.marineinsight.com/a-comprehensive-list-fuel-diesel-and-lube-oil-tanks-on-a-ship/) — Lista completa de tanques de combustible y aceite
- [List of Important Tanks on a Ship – Marine Insight](https://www.marineinsight.com/tech/list-of-important-and-not-so-famous-tanks-on-a-ship/) — Tanques de servicio (ballast, FW, slop)
- [MARPOL Regulation 12A: Oil Fuel Tank Protection – Steamship Mutual](https://www.steamshipmutual.com/publications/articles/fueltankmarpoli0907) — Protección de doble casco para tanques de bunker
- [Bunker Survey Calculation – Seven Surveyor](https://sevensurveyor.com/bunker-survey-calculation/) — Procedimiento de cálculo de ROB
- [Bunker Survey – Procedure & Calculation – Mascot Maritime](https://mascotmaritime.com/bunker-survey-procedure-calculation/) — Procedimiento independiente de bunker survey
- [Bunker Tank Soundings and Fuel Quantity Calculation – Chief Engineer Log](https://chiefengineerlog.com/2022/07/09/bunker-tanks-soundings-and-fuel-quantity-calculation/) — Cálculo práctico de tonelaje
- [MARPOL Annex VI Bunker Sample Record – VPS Veritas](https://www.vpsveritas.com/sites/default/files/2023-03/vps-marpol-annex-vi-sample-record-l.pdf) — Trazabilidad regulatoria
- [Bunker Delivery Note Disputes – Usebase.io](https://www.usebase.io/bunker-delivery-note/) — BDN y conflictos de cantidad
- [Service Tank Arrangements – IACS / ClassNK (PDF)](https://www.classnk.or.jp/hp/pdf/info_service/iacs_ur_and_ui/ui_sc123_rev.3_corr.1_feb_2022ul.pdf) — Requisito SOLAS sobre service tanks

**Petroleros y medición de cargo líquido:**
- [Slop Tank Overview – ScienceDirect Topics](https://www.sciencedirect.com/topics/engineering/slop-tank) — Función y posición de slop tanks
- [Understanding COW Operation – Marine Insight](https://www.marineinsight.com/guidelines/understanding-crude-oil-washing-operation-on-oil-tanker-ships/) — Lavado con crudo en VLCC
- [VLCC Front Century – Wärtsilä Encyclopedia](https://www.wartsila.com/encyclopedia/term/very-large-crude-carrier-front-century) — Arreglo de tanques en VLCC real
- [Piping Arrangement – Conventional Oil Tanker – Cult of Sea](https://www.cultofsea.com/tanker/piping-arrangement-conventional-oil-tanker-basics/) — Disposición de tuberías en petroleros
- [Measurement of Oil Cargoes & ASTM Tables – Knowledge of Sea](https://knowledgeofsea.com/measurement-of-oil-cargoes-astm-tables/) — Procedimiento completo de survey: TOV, GOV, GSV, VCF
- [Liquid Cargo Measurement: TOV, GSV, FW, S&M – Marine Public](https://www.marinepublic.com/blogs/oil-and-gas/494062-liquid-cargo-measurement-understanding-tov-gsv-fw-s-m) — Definiciones clave del cargo survey
- [Cargo Calculations on Tankers ASTM Tables – MySeatime](https://www.myseatime.com/blog/detail/cargo-calculations-on-tankers-astm-tables) — Aplicación práctica de tablas ASTM
- [Double Bottom Tank Overview – ScienceDirect Topics](https://www.sciencedirect.com/topics/engineering/double-bottom-tank) — Tanques de doble fondo
- [Guide to Ballast Tanks – Marine Insight](https://www.marineinsight.com/naval-architecture/a-guide-to-ballast-tanks-on-ships/) — Arreglo de tanques de lastre
- [Comprehensive Guide to Cargo Tank Coatings – West of England P&I](https://www.westpandi.com/news-and-resources/loss-prevention-bulletins/comprehensive-guide-to-cargo-tank-coatings-for-che/) — Revestimientos en product tankers y quimiqueros
- [The LR2: Clean and Dirty – Teekay](https://www.teekay.com/blog/2014/01/22/the-lr2-clean-and-dirty/) — Versatilidad de product tankers LR2

**Quimiqueros:**
- [Chemical Tanker – Wikipedia](https://en.wikipedia.org/wiki/Chemical_tanker) — Clasificación IMO, materiales, deepwell pumps
- [Ship IMO Types I, II, III – Amarine Blog](https://amarineblog.com/2017/06/18/ship-imo-types/) — Requisitos de posición de tanques por tipo IMO
- [IBC Code – IMO](https://www.imo.org/en/ourwork/safety/pages/ibc-code.aspx) — Código IBC (fuente primaria)
- [IBC Code Overview – IMO (Environment)](https://www.imo.org/en/OurWork/Environment/Pages/IBCCode.aspx) — Aplicación medioambiental del IBC
- [Chemical Tankers – Wärtsilä Encyclopedia](https://www.wartsila.com/encyclopedia/term/chemical-tankers) — Visión general de quimiqueros
- [Deepwell Cargo Pumps – Wärtsilä Encyclopedia](https://www.wartsila.com/encyclopedia/term/deepwell-cargo-pumps) — Bombas deepwell y segregación
- [Svanehoj Deepwell Cargo Pumps (PDF)](https://www.svanehoj.com/media/pfrpctn3/svanehoj_deepwellcargopumps_pc.pdf) — Especificaciones técnicas de bombas deepwell
- [Chemical Tanker Cargo Segregation (PDF)](https://chemicaltankerknowledgebase.com/wp-content/uploads/2020/06/Cargo-Segregation-31.08.18.pdf) — Segregación positiva en quimiqueros
- [Nitrogen Generator for Marine Industry – Atlas Copco](https://www.atlascopco.com/en-ae/compressors/air-compressor-blog/nitrogen-gas-generator-for-marine-industry) — Sistemas de N₂ a bordo

**Gaseros (LPG / LNG):**
- [Tank Types for Liquefied Gas – Sea-man.org](https://sea-man.org/tank-types.html) — Tipos A, B, C, membrana según IGC Code
- [Gas Carrier – Wikipedia](https://en.wikipedia.org/wiki/Gas_carrier) — Clasificación general de gaseros
- [Types of Gas Carriers as per IGC Code – Maritime Page](https://maritimepage.com/types-of-gas-carriers-as-per-igc-code/) — Clasificación técnica
- [LPG & LNG Cargo Containment Systems – Marine Public](https://www.marinepublic.com/blogs/oil-and-gas/110176-lpg-lng-cargo-containment-systems-explained) — Sistemas de contención
- [LNG/LPG Cargo Calculation – Sea-man.org](https://sea-man.org/lng-cargo-calculation.html) — Cálculo de cantidad en gaseros
- [Cargo Calculations on Modern LNG and LPG Tankers – Sea-man.org](https://sea-man.org/cargo-calculations-on-tankers.html) — Procedimientos modernos
- [CTMS Solutions for LNG Carrier – Sea-man.org](https://sea-man.org/ctms-lng.html) — Sistema CTMS en buques LNG
- [LNG CTMS Complete Guide – Marine Public](https://www.marinepublic.com/blogs/oil-and-gas/784733-lng-ctms-complete-custody-transfer-measurement-system-guide) — Guía completa del CTMS
- [LPG Vapor Space Calculations – QuantityWare (PDF)](https://www.quantityware.com/wp-content/uploads/WP_QuantityWare_LPG_Vapor_Space_Calculations.pdf) — Cálculo del espacio de vapor LPG (ISO 6578, DIN 51650)
- [Cargo Calculations on Gas Tankers – Knowledge of Sea](https://knowledgeofsea.com/) — Guía práctica
- [GTT NO96 System – GTT](https://www.gtt.fr/technologies/no96-systems) — Membrana Invar para LNG
- [LNG Carrier – Wikipedia](https://en.wikipedia.org/wiki/LNG_carrier) — Tipos de buques LNG
- [Level Measurement IMO Type C LPG – Emerson](https://www.emerson.com/en-us/automation/measurement-instrumentation/common-applications/level-measurement-for-imo-type-c-tank-single-shell-for-lpg) — Medición de nivel en tanques Tipo C
- [Cargo Tanks on LNG Carriers – VEGA](https://www.vega.com/en/industries/ship-and-yacht-building/shipbuilding/cargo-tanks-on-lng-carriers) — Sensores de nivel/temperatura/presión en LNG

**Sistemas de medición y calibración:**
- [Sounding and Methods of Taking Sounding – Marine Insight](https://www.marineinsight.com/guidelines/sounding-and-different-methods-of-taking-sounding-on-a-ship/) — Métodos de sondeo a bordo
- [Sounding and Ullage Explained – Marinehack](https://marinehack.blogspot.com/2020/10/sounding-and-ullage-explained-for.html) — Conceptos básicos
- [Tank Gauging System – SELMA Control](https://www.selmacontrol.com/tank-gauging-system/) — Sistemas de gauging automático
- [Radar Tank Gauge – Kongsberg Maritime](https://www.kongsberg.com/maritime/products/tank-gauging-and-measurment-systems/radar-based-tank-gauges/radar-tank-gauge-for-slop-tank-still-pipe-solution/) — Radar para slop tanks
- [What Is a Radar Tank Gauging System – MarineANS](https://www.marineans.com/blogs/what-is-a-radar-tank-gauging-system-and-how-does-it-work) — Funcionamiento del radar gauging
- [Sounding Tables – SISTRE Ship Design Software](https://www.sistre-shipdesign-software.com/help/sounding-tables) — Tablas de sondeo en software de diseño naval
- [Tank Calibration / Capacity – SISTRE](https://www.sistre-shipdesign-software.com/help/tank-capacity) — Atributos de calibración de tanques
- [Sounding & Ullage Tables – AMC Piraeus](https://amc.gr/tankCalibration.htm) — Servicios de calibración de tanques
- [Questionable Calibration Tables – Ship & Bunker](https://shipandbunker.com/news/features/bunker-quality-quantity/832658-tricks-of-the-bunker-trade-questionable-tank-calibration-tables) — Fraude por tablas cuestionables
- [PIAS Manual: Sounding with Trim/Heel Effects – SARC](https://www.sarc.nl/images/manuals/pias/htmlEN/sounding.html) — Software naval con corrección de trim/escora
- [Calculation of Oil Tank Volume with Trim – ARMCOL (PDF)](https://armcol.org/wp-content/uploads/2024/08/3186.-Calculation-of-Oil-Tank-Volume-and-report-Generation-system-with-trim-and-list-corrections.pdf) — Generación de reportes con correcciones

---

> **Advertencia sobre incertidumbres:** (1) Las capacidades y número de tanques indicados son valores orientativos; los datos exactos siempre deben obtenerse del Capacity Plan y Trim & Stability Booklet del buque específico. (2) Los métodos de cálculo de densidad para LPG/LNG (Francis, COSTALD, REFPROP) difieren entre operadores y estándares nacionales; el surveyor debe verificar cuál está implementado en el CTMS del buque. (3) La regulación evoluciona: verificar la versión vigente del IBC Code, IGC Code y MARPOL con la sociedad de clasificación o la administración de bandera. (4) No se incluyen datos de buques reales operados por armadores específicos; toda la información es conocimiento técnico general de dominio público.

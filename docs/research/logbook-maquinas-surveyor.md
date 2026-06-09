> ⚠️ **MATERIAL DE INVESTIGACIÓN — BORRADOR PENDIENTE DE REVISIÓN CONJUNTA**
> No es documento formal ni doctrina aprobada. Insumo para el PRD / AppFlow / modelo de datos.
> Generado por investigación con fuentes web + verificación adversarial. Revisar antes de integrar.

---

# El Libro de Máquinas en la Surveying de Cantidad: Doctrina Técnica para SUPER-SURVEY

## Nota sobre fuentes y método

Este documento sintetiza información de regulaciones IMO (MARPOL Anexos I y VI), guidance de clubes P&I, literatura técnica de surveying y estándares de la industria (BIMCO SVD). Los accesos directos a muchos sitios comerciales fueron bloqueados (HTTP 403); por ello, los datos primarios se han extraído de resultados de búsqueda verificados por múltiples fuentes independientes. Donde existe discrepancia entre fuentes, se señala explícitamente.

---

## 1. Los documentos clave: Engine Room Log Book, Oil Record Book, BDN y Noon Report

### 1.1 Engine Room Log Book (Libro de Máquinas)

El **Engine Room Log Book** (ER Log) es el registro operativo diario de todo lo que ocurre en la sala de máquinas. No está mandado por un único instrumento internacional específico, sino que se desprende de las obligaciones generales del Jefe de Máquinas bajo SOLAS (Convenio Internacional para la Seguridad de la Vida Humana en el Mar) y de los requerimientos de compañía (SMS, Safety Management System, según el Código ISM). Es, en términos funcionales, el diario de operaciones del departamento de máquinas.

**Contenido típico del ER Log:**
- Fecha, posición del buque (en puerto, navegando, fondeado)
- Parámetros del motor principal: RPM, carga, temperaturas, presiones
- Parámetros de motores auxiliares/generadores
- **ROB (Remaining On Board) de todos los grados de combustible:** HFO/VLSFO, MDO, MGO — en toneladas métricas
- **Consumo diario de cada grado de combustible**, desglosado por consumidor (propulsión, auxiliares, caldera)
- ROB de aceites lubricantes
- ROB de lodos (sludge) y agua de sentinas (bilge)
- Horas de funcionamiento de maquinaria importante
- Registro de transferencias entre tanques (con cantidades antes y después)
- Operaciones de bunkering (fecha, tipo de combustible, cantidad recibida)
- Averías, incidentes, mantenimiento

**Periodicidad de entradas:** Los watchkeepers (ingenieros de guardia) llenan el logbook cada guardia (cada 4 horas en buques con guardia continua). El Jefe de Máquinas lo contrafirma diariamente. Las lecturas de ROB de combustible y consumo se registran específicamente a las **1200 hrs** (mediodía, hora del buque — ver Sección 4).

**Valor legal:** Es un documento legal que puede ser requerido como evidencia por aseguradoras, inspectores, árbitros y surveyors. No es un documento MARPOL específico, pero registra los datos operativos que alimentan los registros MARPOL y de eficiencia energética (CII/DCS).

**Quién firma:** El oficial de guardia responsable de cada período, con contrafirma del Jefe de Máquinas.

---

### 1.2 Oil Record Book (ORB) — Libro de Registro de Hidrocarburos, MARPOL Anexo I

El **Oil Record Book (ORB)** es un documento **obligatorio por MARPOL Anexo I, Regulación 17** (para todos los buques de 400 GT o más) y **Regulación 36** (para petroleros de 150 GT o más). Es un registro específicamente anti-polución, distinto del ER Log.

**El ORB tiene dos partes:**
- **Parte I — Operaciones en espacios de máquinas (todos los buques):** Registra eventos relacionados con el manejo de hidrocarburos en la sala de máquinas.
- **Parte II — Operaciones de carga/lastre (solo petroleros):** Cubre operaciones de carga de crudo o productos.

**Códigos de operación del ORB Parte I (Regulación 17, MARPOL Anexo I):**

| Código | Operación |
|--------|-----------|
| A | Lastrado o limpieza de tanques de combustible |
| B | Descarga de lastre sucio o agua de limpieza de tanques de combustible |
| C | Recogida, transferencia y eliminación de residuos de aceite (lodos/sludge) |
| D | Descarga no automática por la borda o eliminación de agua de sentinas acumulada en espacios de máquinas |
| E | Descarga automática por la borda o eliminación de agua de sentinas |
| F | Estado del equipo de filtración de hidrocarburos (OWS) |
| G | Descargas accidentales u otras descargas excepcionales de hidrocarburos |
| H | **Aprovisionamiento de combustible (bunkering) o aceite lubricante a granel** |
| I | Procedimientos operativos adicionales y observaciones generales |

**Lo que el ORB NO registra:** El consumo diario de combustible, el ROB diario de los tanques, ni los parámetros de rendimiento de la máquina. Esos datos van en el ER Log. El ORB solo registra **eventos discretos** (una transferencia de lodos, un bunkering, una descarga de sentinas), no el flujo continuo de operación.

**Retención:** 3 años desde la última entrada. Debe estar disponible para inspección por el Estado Rector del Puerto (PSC).

**Firma:** El oficial responsable de la operación firma cada entrada; el Capitán firma cada página completada.

**Incumplimiento:** Las discrepancias entre el ORB y el ER Log son una señal de alerta para los inspectores del PSC y pueden indicar fraude ambiental ("magic pipe").

---

### 1.3 Bunker Delivery Note (BDN) — Nota de Entrega de Combustible

El **BDN** es el documento emitido por el **proveedor de combustible** al momento de cada operación de bunkering. Su base legal es **MARPOL Anexo VI, Regulación 18.5 y Apéndice V**.

**Campos obligatorios del BDN (Apéndice V, MARPOL Anexo VI, según MEPC.182(59) y sus enmiendas):**
- Nombre e IMO del buque receptor
- Nombre, dirección y teléfono del proveedor
- Puerto y fecha de entrega
- Nombre/tipo de combustible y grado
- Cantidad en toneladas métricas
- Densidad a 15°C (kg/m³)
- Contenido de azufre (% m/m)
- **Desde 1 mayo 2024:** Punto de inflamación (flashpoint) específico si es inferior a 70°C, o declaración de que es ≥70°C
- Declaración de conformidad del proveedor con Regulaciones 14 (SOx) y 18 (calidad del combustible)
- Firma del representante del proveedor

**Retención:** 3 años a bordo. Debe ir acompañado de una muestra representativa del combustible tomada continuamente en el manifold del buque.

**Qué NO es el BDN:** No es un registro de consumo; es un documento de suministro. No sustituye al ER Log ni al ORB. Los datos del BDN alimentan los sistemas de reporting de eficiencia energética (IMO DCS, EU MRV).

**Relación con el ORB:** Cuando se registra la operación de bunkering en el ORB bajo **Código H**, la cantidad total del BDN debe coincidir con la cantidad registrada en el ORB. Discrepancias entre BDN y ORB son señales de alerta para PSC.

---

### 1.4 Noon Report (Reporte de Mediodía)

El **Noon Report** es un **informe diario** enviado por el Capitán y/o el Jefe de Máquinas a la compañía armadora/operadora, normalmente compilado a las **1200 hrs hora del buque** (ver Sección 4). No es un documento regulatorio per se en MARPOL, pero es el mecanismo de reporte comercial estándar de la industria.

**Contenido típico del Noon Report:**
- Posición (latitud, longitud)
- Distancia recorrida en las últimas 24 horas
- Velocidad media y RPM
- **Consumo de combustible en las últimas 24 horas, desglosado por tipo:** HFO, VLSFO, MGO, MDO, LNG (según el buque)
- **ROB de cada tipo de combustible en toneladas métricas**
- Condiciones meteorológicas y de mar
- ETA al próximo puerto
- Estado de la carga
- Incidencias significativas

**El Noon Report como fuente de datos para SUPER-SURVEY:** Los datos de ROB y consumo del Noon Report provienen directamente del ER Log, con la misma frecuencia (diaria). El BIMCO/Smart Maritime Council ha publicado un **Standardised Vessel Dataset (SVD)** con más de 100 campos para estandarizar los datos del Noon Report, incluyendo ROB de HFO, LSFO, LSGO/MGO, MDO. Los datos son almacenados internamente en hora local del buque pero **convertidos a UTC para intercambio de datos** (ver Sección 4).

---

### Tabla comparativa de los cuatro documentos

| Característica | ER Log Book | Oil Record Book (ORB) | BDN | Noon Report |
|---|---|---|---|---|
| **Base legal** | SOLAS / ISM Code | MARPOL Anexo I, Reg. 17 | MARPOL Anexo VI, Reg. 18 | Práctica comercial / DCS |
| **Propósito** | Registro operativo de máquinas | Anti-polución: eventos de hidrocarburos | Prueba de suministro de combustible | Reporte diario a armador/operador |
| **Quién lo emite** | Oficiales de guardia / JM | Oficial responsable + Capitán | Proveedor (bunkerer) | Capitán + Jefe de Máquinas |
| **Qué registra** | Todo: parámetros, consumos, ROB, transferencias | Solo eventos MARPOL: bunkering (H), sentinas (A/D/E), lodos (C), accidentes (G) | Detalles del suministro | Resumen diario de operación |
| **ROB diario** | Sí, todos los grados | No (solo en código H: total tras bunkering) | No | Sí, todos los grados |
| **Consumo diario** | Sí | No | No | Sí |
| **Retención mínima** | ISM/compañía (típ. 3 años) | 3 años (MARPOL) | 3 años (MARPOL) | Compañía (típ. 3 meses a 3 años) |
| **Accesible a PSC** | Sí | Sí (obligatorio) | Sí (obligatorio) | No obligatorio para PSC |

---

## 2. Qué datos extrae el surveyor de cantidad del logbook

### 2.1 Datos primarios de ROB

El surveyor de cantidad (bunker surveyor o cargo quantity surveyor en operaciones charter on/off-hire) extrae del ER Log:

1. **ROB de cada grado de combustible en la fecha/hora de inicio de la operación:**
   - HFO (Heavy Fuel Oil, >0.5% S) — también llamado HSFO
   - VLSFO (Very Low Sulphur Fuel Oil, ≤0.5% S) — el grado principal desde IMO 2020
   - MDO (Marine Diesel Oil)
   - MGO (Marine Gas Oil, ≤0.1% S)
   - Aceites lubricantes (LUBE OIL ROB), si aplica al alcance

2. **Historial de consumos diarios** por grado y por consumidor (ME, AE, caldera), generalmente de los últimos días o desde el último bunkering.

3. **Registro del último bunkering:** fecha, puerto, tipo de combustible, cantidad recibida — para verificar el balance.

4. **Transferencias entre tanques** durante el período relevante, con cantidades antes y después.

5. **Consumo acumulado** desde el último bunkering o desde el inicio del viaje.

### 2.2 Cálculo de consumo diario y balance

El balance de combustible que el surveyor verifica sigue la fórmula:

```
ROB_final = ROB_inicial + Bunkering recibido − Consumo total − De-bunkering
```

Este balance debe cuadrar entre:
- Los datos declarados en el ER Log (ROB diario)
- Los datos físicos medidos (soundings de tanques)
- Los BDNs de todos los bunkerings del período

### 2.3 Cómo alimenta el reporting oficial

Los datos del ER Log (a través del Noon Report) alimentan:
- **IMO DCS (MARPOL Anexo VI, Reg. 27):** consumo anual por tipo de combustible y consumidor, reportado a la Administración de bandera. Obligatorio para buques ≥5.000 GT. Desde 2026: desglose mejorado por consumidor (ME, AE, caldera).
- **EU MRV (Reglamento UE 2015/757):** consumo por viaje y anual, con cuatro métodos aceptados: BDN+stocktake (Método A), tank monitoring (Método B), flow meters (Método C), medición directa de emisiones (Método D). El **tank monitoring** usa exactamente las lecturas del ER Sounding Log.
- **CII (Carbon Intensity Indicator, MARPOL Anexo VI, Reg. 28):** calculado sobre la base de los datos DCS.
- **Reporting a armador/operador:** mediante el Noon Report diario.

---

## 3. Procedimiento de comparación: medición inicial (soundings) vs. logbook

### 3.1 Por qué se hace la comparación

Al inicio de cualquier operación de survey (bunkering, on-hire, off-hire, ROB survey), el surveyor realiza **mediciones físicas independientes** de todos los tanques de combustible y las compara con las cifras declaradas en el ER Log. Esta comparación sirve para:

- Verificar que el ER Log refleja fielmente la realidad física de los tanques
- Detectar errores de medición o trascripción en el logbook
- Identificar posibles discrepancias que pudieran indicar consumo no declarado o manipulación
- Establecer una base acordada de ROB al inicio de la operación, con respaldo documental independiente

### 3.2 El procedimiento paso a paso

**Paso 1 — Revisión documental previa:**
El surveyor revisa el ER Log para obtener las cifras de ROB declaradas y el historial de consumos. También comprueba:
- Último BDN: densidad del combustible en cada tanque
- Fecha y hora del último sounding registrado en el logbook
- Historial de transferencias entre tanques

**Paso 2 — Verificación de referencias del tanque:**
El surveyor, trabajando con el Jefe de Máquinas o su representante, comprueba las **tablas de calibración certificadas** de los tanques (Capacity Tables), verificando:
- Número de tanques y su ubicación
- Altura de referencia y profundidad de referencia (reference height)
- Que las tablas son las certificadas y están en vigor

**Paso 3 — Medición física (soundings o ullages):**
El surveyor toma medidas físicas de **todos** los tanques de combustible:
- **Sounding:** profundidad desde la parte superior del tubo de sondeo hasta la superficie del líquido
- **Ullage:** distancia desde el punto de referencia hasta la superficie del líquido (más común en tanques de gran capacidad)
- Se registran temperatura del combustible en el tanque y trim/escora del buque

**Paso 4 — Correcciones:**
Se aplican correcciones a los valores brutos:
- **Corrección por trim y escora:** usando las tablas de corrección del buque
- **Corrección de volumen por temperatura (VCF, Volume Correction Factor):** usando ASTM Table 54B, para convertir el volumen a temperatura observada al volumen a 15°C estándar
- **Factor de corrección de peso (WCF, Weight Correction Factor):** usando ASTM Table 56, convierte volumen estándar a masa

**Fórmula:** `Masa (MT) = Volumen bruto × VCF × WCF`

Donde `WCF ≈ densidad a 15°C − 0.0011` (con variaciones según tablas ASTM)

**Paso 5 — Comparación con el logbook:**
Se confrontan los valores físicos calculados con los valores declarados en el ER Log:

| Fuente | ROB HFO | ROB VLSFO | ROB MGO |
|--------|---------|-----------|---------|
| ER Log (declarado por JM) | XX MT | YY MT | ZZ MT |
| Sounding físico (surveyor) | XX' MT | YY' MT | ZZ' MT |
| Diferencia | Δ₁ | Δ₂ | Δ₃ |

### 3.3 Tolerancias típicas y qué se busca

**Tolerancia estándar de la industria: ±0,5% de la cantidad recibida**
Esta cifra es citada consistentemente por múltiples fuentes de la industria (VPS, MascotMaritime, Britannia P&I, live bunkers). Sin embargo, la tolerancia puede ser mayor o menor según acuerdo comercial.

**Causas de discrepancia aceptables:**
- Diferencias menores en la lectura de la cinta de sondeo (inherente a la medición manual)
- Pequeñas variaciones de temperatura entre la medición del logbook y la del surveyor
- Espuma o sedimento en la superficie del combustible
- Diferencias de trim entre la medición declarada y la del surveyor

**Señales de alerta (discrepancias no aceptables):**
- Diferencia superior al 0,5% sin explicación técnica
- Consumos diarios del logbook inconsistentes con el perfil de la travesía (RPM, distancia, tipo de motor)
- ROB calculado por balance (ROB inicial + bunkering − consumo) no coincide con ROB declarado
- Discrepancias sistemáticas en la misma dirección (siempre "menos" físico que declarado)

### 3.4 Qué pasa si no cuadra

1. **Re-medición:** El surveyor solicita medir nuevamente los tanques con discrepancia, esta vez conjuntamente con el Jefe de Máquinas.

2. **Investigación de causa:** Se revisa si hubo transferencias entre tanques no registradas, si el trim era diferente, si la tabla de calibración utilizada es la correcta.

3. **Nota de Protesta (Letter of Protest):** Si la discrepancia no se resuelve satisfactoriamente, el Jefe de Máquinas o el Capitán emite una Nota de Protesta, registrándola en el ER Log y, si aplica, en el ORB. El surveyor también puede emitir la suya desde la perspectiva del contratante.

4. **Certificado final con reservas:** El Bunker Survey Report se emite indicando la discrepancia, con las cifras del surveyor como las oficialmente registradas para efectos del acuerdo de charter o del contrato de bunkering.

5. **Consecuencias comerciales:** En operaciones on/off-hire, el valor de la diferencia de bunker (al precio pactado) es compensado entre armador y fletador. En casos de compra de combustible, puede haber reclamación al proveedor.

---

## 4. TIMING de las entradas del logbook y del Noon Report: hora local del buque vs. UTC

Este punto es frecuente fuente de confusión. Se explica aquí con precisión.

### 4.1 La práctica real: hora local del buque (Ship's Time / Ship's Mean Time)

**El ER Log y el Noon Report se registran en HORA LOCAL DEL BUQUE, no en UTC.**

La "hora local del buque" (también llamada "Ship's Time", "Ship's Mean Time" o "LT — Local Time" en los registros) es la hora del huso horario en que se encuentra el buque. Esta es la práctica estándar confirmada por múltiples fuentes técnicas de la industria:

- Las lecturas de flowmeters y temperaturas de combustible se registran **diariamente a las 1200 hrs hora media del buque** ("noon ship's meantime").
- El Noon Report es compilado y enviado a las **1200 hrs hora local del buque**.
- Los informes de posición deben ser enviados a las 1200 hrs hora del buque cuando el buque está en el mar o en puerto.

La IMO DCS guidance establece que para el método de tank monitoring, las lecturas deben tomarse **diariamente cuando el buque está en el mar** — sin especificar UTC o hora local, pero la práctica estándar de la industria es a 1200 hrs hora del buque.

El **BIMCO Standardised Vessel Dataset (SVD)** para Noon Reports especifica que las fechas/horas en el dataset son en UTC como estándar de intercambio de datos — pero esto es para la transmisión digital, no el momento en que el barco hace sus registros físicos. La práctica a bordo es siempre hora local del buque; la conversión a UTC ocurre en sistemas shore-side.

### 4.2 Cómo funciona la hora del buque: los cambios de huso

Los buques oceánicos ajustan sus relojes conforme avanzan por las zonas horarias:

- **Navegando hacia el ESTE:** Los relojes se **adelantan** (avance). La distancia entre dos mediodías consecutivos es de **23 horas** en el día del cambio.
- **Navegando hacia el OESTE:** Los relojes se **retrasan** (retardo). La distancia entre dos mediodías es de **25 horas** en el día del cambio.

Por convención náutica, el capitán decide cuándo hacer el cambio — usualmente a medianoche para no afectar las guardias, o fraccionado en varias noches (cambios de 30 min). La regla general es un cambio de 1 hora por cada 15° de longitud cruzada.

### 4.3 Impacto en el cálculo de consumo de 24 horas

**Este es el punto crítico para SUPER-SURVEY:**

El consumo diario reportado en el ER Log y en el Noon Report cubre el período **"de mediodía a mediodía" en hora del buque**. Cuando se produce un cambio de huso, ese período ya no es de exactamente 24 horas:

- **Día de 23 horas (navega hacia el este, relojes adelantados):** El consumo del período mediodía-mediodía será ~4,2% menor de lo esperado para la velocidad/RPM del buque. Si no se corrige, parece que el buque consumió menos.

- **Día de 25 horas (navega hacia el oeste, relojes retrasados):** El consumo del período será ~4,2% mayor de lo esperado. Si no se corrige, parece que el buque consumió más.

Un artículo técnico publicado en We4Sea (referenciado en múltiples fuentes) lo identifica explícitamente: *"The time between noons is based on the time kept by the ship [...] a ship sailing westward gains time [...] the time to the next noon is now 25 hours. Likewise, for a ship sailing eastward the time between the two noons ends up being only 23 hours."* Esto hace que los datos de noon reports **no sean directamente comparables** entre sí sin normalización.

**Implicaciones para el surveyor de cantidad:**

1. Al analizar el historial de consumos del ER Log para verificar el ROB al inicio de una operación, el surveyor debe **identificar si hubo cambios de huso durante el período analizado** y ajustar el consumo esperado en consecuencia.

2. Para un survey de on/off-hire donde se estima el consumo durante la travesía, el **consumo normalizado por hora** es más fiable que el consumo por "día de mediodía a mediodía", especialmente en travesías largas con múltiples cambios de huso.

3. Para IMO DCS y EU MRV, el período de reporte es el **año calendario** (1 enero al 31 diciembre), por lo que los efectos de días de 23/25 horas se promedian y son irrelevantes a escala anual. Pero sí son relevantes para surveys puntuales.

### 4.4 Resolución de la incertidumbre: cuál es la práctica correcta

**⚠ Punto de discrepancia entre fuentes:**
Algunas fuentes (incluyendo una referencia a VoyageX AI) afirman que el Noon Report se compila "a las 1200 UTC". Otras fuentes más técnicas y específicas (EU MRV guidance, sertica.com, y guidance de flowmeters) dicen claramente "1200 hrs ship's meantime". El BIMCO SVD especifica UTC para el campo de timestamp en la transmisión digital.

**La resolución:** La práctica **a bordo** es la hora local del buque (Ship's Mean Time — la del huso horario actual del barco). El Noon Report se elabora y se firma a bordo a las 1200 hrs hora del buque. La **transmisión a tierra** y el almacenamiento en sistemas de fleet management (Sertica, OneOcean, Marine Digital, etc.) típicamente convierten a UTC para permitir comparaciones normalizadas. Por tanto, ambas afirmaciones son correctas en contextos distintos: **la entrada nace en hora local del buque; el dato digital que recibe el armador está en UTC**.

Para SUPER-SURVEY: al importar datos del ER Log o del Noon Report, se debe conocer si el timestamp es hora local del buque o UTC, y si hay cambios de huso en el historial, para calcular correctamente el consumo real acumulado.

---

## 5. Otra información del logbook que NO compete al surveyor de cantidad

El ER Log contiene información que, aunque importante para otras áreas, está fuera del alcance de un surveyor de cantidad:

| Campo del ER Log | Relevante para... | NO relevante para surveyor de cantidad |
|---|---|---|
| Parámetros de temperatura/presión del motor principal | Mantenimiento, Class surveys | ✓ (solo interesan los RPM para validar consumo) |
| Condición del equipo de separación de sentinas (OWS) | PSC / MARPOL Annex I inspections | ✓ |
| Registros de emergencia / ejercicios de incendio | SOLAS / Safety | ✓ |
| Descargas de sentinas y agua de lastre | MARPOL / ORB | ✓ |
| Guardia de navegación, relevos de guardia de puente | STCW | ✓ |
| Condición de la carga (temperatura, ventilación) | Cargo surveyor de calidad | ✓ |
| Mantenimiento de equipos de salvamento | SOLAS | ✓ |
| Registros COLREG / incidentes de navegación | Autoridades marítimas | ✓ |
| Estadísticas de accidentes y lesiones | ISM / P&I | ✓ |
| Consumo de agua potable y agua de lastre | No aplica al bunker | ✓ |

**El surveyor de cantidad se enfoca exclusivamente en:** ROB de combustibles y lubricantes, consumos registrados, transferencias entre tanques, y operaciones de bunkering con sus cantidades y fechas.

---

## Tabla resumen: Qué captura SUPER-SURVEY del logbook

| Dato capturado | Documento fuente | Periodicidad | Uso en SUPER-SURVEY |
|---|---|---|---|
| ROB HFO/VLSFO al inicio de operación | ER Log + sounding físico | Puntual (al inicio del survey) | Base del cálculo de cantidad |
| ROB MGO/MDO al inicio de operación | ER Log + sounding físico | Puntual | Base del cálculo de cantidad |
| Consumo diario por grado de combustible | ER Log (entradas de mediodía) | Diario (noon-to-noon, hora buque) | Verificación del balance de consumo |
| Historial de bunkerings (fecha, cantidad, tipo) | ER Log + BDN + ORB Código H | Por evento | Verificación del balance de suministro |
| Transferencias entre tanques | ER Log | Por evento | Verificación de integridad del balance |
| Densidad del combustible en tanque | BDN (proveedor) + ER Log | Por bunkering | Conversión volumen→masa para el sounding |
| Trim y escora al momento del sounding | ER Log / Bridge Log | Puntual | Aplicación de corrección de calibración |
| Consumo acumulado desde último bunkering | ER Log (cálculo del JM) | Cumulativo | Cross-check del ROB esperado |
| Timestamp de cada lectura (hora buque) | ER Log | Cada entrada | Normalización UTC si aplica |
| Cifras del ORB Código H | ORB Parte I | Por evento de bunkering | Verificación cruzada con BDN |
| BDN: tipo, cantidad, densidad, azufre | BDN (documento separado) | Por bunkering | Verificación de calidad y cantidad recibida |

---

## Fuentes

- [Regulation 17 - Oil Record Book, Part I (Machinery Space Operations) — MARPOL Training Institute](https://www.marpoltraininginstitute.com/MMSKOREAN/MARPOL/Annex_I/r17.htm)
- [RESOLUTION MEPC.312(74) — IMO Guidelines for Electronic Record Books](https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MEPCDocuments/MEPC.312(74).pdf)
- [MEPC.1/Circ.736/Rev.2 — USCG Guidance for Port State Control, ORB](https://www.dco.uscg.mil/Portals/9/DCO%20Documents/5p/CG-5PC/CG-CVC/Marpol/sdoc/MEPC_1_Circ_736_rev_2.pdf)
- [Oil Record Book — Wikipedia](https://en.wikipedia.org/wiki/Oil_record_book)
- [Bunker Delivery Note (BDN) in MARPOL Convention Annex VI — MaritimEducation](https://maritimeducation.com/bunker-delivery-note-bdn-in-marpol-convention-annex-vi/)
- [Bunker Delivery Note: 2025 Essential Guide — VesselChain](https://vesselchain.org/bunker-delivery-note-guide-2025/)
- [Changes to Bunker Delivery Notes, Starting May 2024 — SAFETY4SEA](https://safety4sea.com/changes-to-bunker-delivery-notes-starting-may-2024/)
- [MARPOL Annex VI Appendix V Amendment BDN — Britannia P&I](https://britanniapandi.com/2024/04/latest-amendment-to-marpol-annex-vi-appendix-v/)
- [Appendix V – BDN Information (Regulation 18.5) — IMO Rules](https://www.imorules.com/GUID-44195EB8-3777-4B5D-BDA3-FCBE70A915F3.html)
- [Managing Bunker Quantity Disputes — Britannia P&I (2024)](https://britanniapandi.com/2024/11/managing-bunker-quantity-disputes-essential-practices-and-considerations-for-shipowners-and-operator/)
- [Bunker Survey & Surveyor — Live Bunkers](https://www.livebunkers.com/bunker-survey-surveyor)
- [Bunker Survey — Procedure & Calculation — MascotMaritime](https://mascotmaritime.com/bunker-survey-procedure-calculation/)
- [Bunker Survey: ROB — AB Surveyors](https://ab-surveyors.com/ship-inspection-audits-marine-survey-spain-valencia-spain/bunker-survey-bqs-rob)
- [Quantity Shortage Prevention for Marine Fuels — VPS Veritas](https://www.vpsveritas.com/knowledgecentre/articles/quantity-shortage-prevention-marine-fuels)
- [On-Hire/Off-Hire ROB Bunker Survey — Seahawk Services](https://seahawkservices.com/Services/OnHireorOffHireROBBunkerSurvey.aspx)
- [Bunker Tank Soundings and Fuel Quantity Calculation — Chief Engineer Log](https://chiefengineerlog.com/2022/07/09/bunker-tanks-soundings-and-fuel-quantity-calculation/)
- [Bunker Survey Calculation — Marine Surveyor Information](https://sevensurveyor.com/bunker-survey-calculation/)
- [Bunker Calculation Formula with Example — Marine Site](https://www.marinesite.info/2017/04/bunker-calculation-formula-with-example.html)
- [Entries To Be Made in Ship's Engine Room Logbook — Marine Insight](https://www.marineinsight.com/guidelines/different-entries-to-be-made-in-ships-engine-room-log-book/)
- [Fuel Oil Consumption Calculations for Ships — Marine Insight](https://www.marineinsight.com/guidelines/fuel-oil-consumption-calculations-for-ships-what-seafarers-should-know/)
- [What is Engine Room Log Book — MarineGyaan](https://marinegyaan.com/what-is-engine-room-log-book/)
- [Difference: Official Logbook, Deck and Engine Room Log Book — MEO Class 1](https://meoclass1.wordpress.com/2015/04/28/difference-between-official-logbook-deck-and-engine-room-log-book/)
- [Noon Report on Ship: A Complete Guide — VoyageX AI](https://voyagex.ai/noon-report-on-ship-guide/)
- [Understanding Noon Reports: Essential for Voyage Management — ClearVoyage](https://clearvoyage.com/resources/understanding-noon-reports)
- [What is Noon Report On Ships? — Marine Insight](https://www.marineinsight.com/guidelines/what-is-noon-report-on-ships/)
- [Noon Data Report — IMO Compendium](https://imocompendium.imo.org/public/IMO-Compendium/Current/DS/Noon%20Data%20Report/d11.htm)
- [Standardised Vessel Dataset for Noon Reports — BIMCO/Smart Maritime Council](https://www.bimco.org/news-insights/press-media/press-releases/2024/20240528-smart-maritime-network/)
- [Why Noon-Reports Do Not Work for Fuel Efficiency Assessment — We4Sea](https://www.we4sea.com/blog/why-noon-reports-do-not-work-for-the-assessment-of-fuel-efficiency)
- [The Death of the Noon Report — Maritime Executive](https://maritime-executive.com/editorials/the-death-of-the-noon-report)
- [Nautical Time — Wikipedia](https://en.wikipedia.org/wiki/Nautical_time)
- [Time Zones for Maritime Data Analysts — Medium/Shipping Intel](https://medium.com/shipping-intel/time-zones-for-maritime-data-analysts-b53c3ee3a4c5)
- [IMO DCS User Guidance Rev.5, April 2025 — IMO](https://wwwcdn.imo.org/localresources/en/OurWork/Environment/Documents/DCS_User_Guidance_and_FAQs_Rev.5_April_2025.pdf)
- [EU MRV Regulation (EU) 2015/757 — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2015/757/oj)
- [MARPOL Annex VI: Increased Fuel Oil Data Collection — NorthStandard](https://north-standard.com/insights-and-resources/resources/news/marpol-annex-vi-increased-fuel-oil-data-collection-requirements)
- [Enhanced IMO DCS Reporting & SEEMP Updates — ABS Eagle](https://ww2.eagle.org/en/rules-and-resources/regulatory-updates/enhanced-imo-dcs.html)
- [Guidance on Fuel Monitoring — EU Climate Action (EUETS/MRV)](https://climate.ec.europa.eu/system/files/2017-06/20170517_guidance_fuel_oil_en.pdf)
- [MARPOL Annex VI Record Book — Bahamas Maritime Authority](https://www.bahamasmaritime.com/wp-content/uploads/2023/10/IN011-MARPOL-Annex-VI-Record-Book.pdf)
- [VPS: The Power of Precision Bunker Quantity Surveys — Ship & Bunker](https://shipandbunker.com/news/world/654639-vps-the-power-of-precision-bunker-quantity-surveys)
- [BUNKER DETECTIVE Survey / ROB Survey — MCE Marine Surveyors](https://mceu.nl/survey/intermediate-survey-spot-survey/)

---

*Documento generado para uso interno de SUPER-SURVEY. Conocimiento de dominio público — no incluye datos de buques reales. Revisado junio 2026.*

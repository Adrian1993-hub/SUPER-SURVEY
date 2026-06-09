> ⚠️ **MATERIAL DE INVESTIGACIÓN — BORRADOR PENDIENTE DE REVISIÓN CONJUNTA**
> No es documento formal ni doctrina aprobada. Insumo para el PRD / AppFlow / modelo de datos.
> Generado por investigación con fuentes web + verificación adversarial. Revisar antes de integrar.

---

# La "Key Meeting" / Reunión Pre-Operación en Operaciones de Transferencia Marítima de Carga

## Doctrina Técnica para Software de Survey de Cantidad (SUPER-SURVEY)

---

## 1. Definición, Naturaleza y Base Regulatoria

### 1.1 ¿Qué es la Pre-Transfer Conference?

La **pre-transfer conference** (también denominada pre-cargo meeting, pre-operation meeting o, en el contexto de software de survey, "Key Meeting") es la reunión formal y obligatoria entre los representantes del buque y de la terminal (o del otro buque, en operaciones STS) que se celebra **inmediatamente antes** de iniciar cualquier operación de transferencia de hidrocarburos a granel. Su propósito es formalizar acuerdos operativos, verificar la seguridad conjunta y asegurar que ambas partes comparten el mismo entendimiento del plan de carga/descarga.

La conferencia tiene dos dimensiones inseparables:

1. **Seguridad**: verificación de sistemas contra emergencias, equipos de respuesta, canales de comunicación y sistemas de parada de emergencia.
2. **Operativa/de survey**: acuerdo de parámetros cuantitativos que alimentan directamente los cálculos de cantidad, los registros de survey y la cadena de custodia.

No se debe iniciar el flujo de producto hasta que ambas partes hayan firmado los documentos correspondientes.

### 1.2 Marco Regulatorio

| Instrumento | Tipo | Alcance |
|---|---|---|
| **ISGOTT 6ª Ed. (ICS/OCIMF, 2020)**, Cap. 24–25 | Guía de industria – buque/terminal | Global; buques tanque – terminales. Define el Ship/Shore Safety Checklist (SSSCL) con la pre-transfer conference en Part 5A y los acuerdos en Part 6. |
| **OCIMF SSSCL** (Ship/Shore Safety Checklist) | Checklist bilateral firmado | Parte integrante de ISGOTT 6; retención mínima 3 meses a bordo. |
| **OCIMF/ICS/SIGTTO/CDI STS Transfer Guide, 2ª Ed. (2025)** | Guía de industria – buque/buque | Actualización de 2025; alinea sus checklists STS con ISGOTT v.6; introduce capítulo de factores humanos y comunicación. |
| **33 CFR Part 156** (US Coast Guard) | Regulación federal EE.UU. | Aguas estadounidenses; exige Declaration of Inspection (DOI) firmada por ambos PICs antes de iniciar la transferencia. Define que la transferencia **comienza** en el momento en que los dos PICs se reúnen por primera vez. |
| **WAC 173-180-235** (Washington State) | Regulación estatal EE.UU. | Exige conferencia cara a cara; cubre ESD, condiciones meteorológicas umbrales, idioma común, identificación de guardias de transferencia. |
| **MARPOL Anexo I, Regla 41A / Resolución MEPC** | Convenio IMO | Exige Operations Plan para STS en alta mar; incluye cargo plan y parámetros operativos. |
| **API MPMS Capítulo 17.1** | Estándar de medición | Inspección marina; procedimientos de OBQ/ROB, muestras, líneas. |
| **API MPMS Capítulo 17.9 / EI HM-49** | Estándar de medición | Define el Vessel Experience Factor (VEF); requiere datos sistemáticos de operaciones anteriores. |
| **ISGINTT** (Inland Navigation Tank Barges) | Guía – barcazas fluviales | Variante para operaciones en aguas interiores; simplificada respecto de ISGOTT. |

> **Nota de certeza**: El contenido detallado de ISGOTT 6ª Ed. y el STS Guide 2025 no es de acceso público completo en línea; los items específicos de las partes 5A y 6 del SSSCL han sido verificados mediante extractos y resúmenes citados en múltiples fuentes secundarias de la industria. La estructura general está confirmada; algunos items individuales pueden variar ligeramente entre versiones de terminales o compañías.

---

## 2. Parámetros Operativos Acordados en la Pre-Transfer Conference

La conferencia pre-transferencia captura dos bloques de datos: **seguridad** y **operaciones/cantidad**. Para un software de survey de cantidad, el bloque operativo/cantidad es el más crítico.

### 2.1 Ratas de Bombeo (Pump Rates)

Este es uno de los acuerdos más importantes para la seguridad y para el control de la operación:

| Parámetro | Descripción | Fuente de verificación |
|---|---|---|
| **Initial rate / Slow rate** | Rata baja con la que se inicia la transferencia para verificar integridad de líneas, manifolds y conexiones, y confirmar que el producto va a los tanques correctos. Típicamente 10–20% de la rata máxima. | Pre-loading conference standard practice; ISGOTT cap. 24 |
| **Maximum rate / Bulk rate** | Rata máxima autorizada acordada entre buque y terminal (o entre buques). Limitada por la menor capacidad entre ambas partes. | ISGOTT SSSCL Part 6: "Maximum transfer rates" |
| **Topping-off rate / Reduced rate** | Rata reducida aplicada cuando los tanques están próximos a completarse (últimos 10–15 cm de ullage) para evitar sobrellenados y derrames. | ISGOTT SSSCL Part 6 |
| **Tiempo de reducción de rata** | Tiempo necesario para pasar de rata máxima a rata de topping-off; crítico para planificación de alarmas. | ISGOTT SSSCL Part 6: "Time required for reducing/increasing rate" |
| **Tiempo de parada** | Tiempo entre orden de parada y cese efectivo del flujo. Define quién da la parada final: "Ship Stop" o "Shore Stop". | ISGOTT SSSCL Part 6 |
| **Tiempo de cierre de válvulas automáticas** | Tiempo de cierre de válvulas ESD o automáticas (surge de presión). | ISGOTT SSSCL Part 6: "Closing time of automatic valves" |

### 2.2 Tanques Nominados y Secuencia de Carga/Descarga

| Parámetro | Descripción |
|---|---|
| **Tanques nominados** | Lista de tanques del buque (y barcaza) que recibirán o entregarán cargo; numeración, posición (P/S/C) y capacidad nominal. |
| **Secuencia de llenado/vaciado** | Orden en que se abren/cierran tanques; crítico para estabilidad (GM), trim y esfuerzos estructurales. |
| **Distribución por grado** | Qué tanque recibe qué producto cuando hay carga de múltiples grados (multi-grade / multi-parcel). |
| **Segregación de productos** | Verificación de que las líneas y bombas están adecuadamente segregadas entre grados para evitar contaminación. |

### 2.3 Confirmación de Grados / Productos

| Parámetro | Descripción |
|---|---|
| **Nombre del producto** | Denominación comercial o MARPOL del cargo (ej. VLSFO, crude X, gasoil DMA). |
| **Densidad/API gravity nominal** | Densidad de referencia del producto esperado; usado para cálculos de cantidad. |
| **Temperatura de carga** | Temperatura estimada del producto a cargar/descargar. |
| **Verificación de compatibilidad** | Compatibilidad con tanques (revestimientos), juntas de mangueras y productos previos (ROB/OBQ). |
| **Confirmación de grado vs. documentación** | Cotejo del producto físico con el Bill of Lading, charter party, cargo manifest o nombramiento. |

### 2.4 Datos de OBQ/ROB Esperados

| Parámetro | Descripción |
|---|---|
| **OBQ (On Board Quantity)** | Cantidad de líquido, agua, sedimentos y lodos presentes en los tanques del buque **antes** de iniciar la carga. Se mide y registra antes de que fluya cualquier producto de la terminal. |
| **ROB (Remaining On Board)** | Cantidad que permanece en los tanques del buque **después** de completar la descarga. |
| **Contenido esperado de agua libre** | Agua libre en tanques a descontar del cómputo de cargo. |
| **Sedimentos y agua en suspensión (S&W)** | Estimado de S&W en el OBQ. |

### 2.5 Line Displacement / Line Packing

| Parámetro | Descripción |
|---|---|
| **Line displacement** | Procedimiento para asegurar que las líneas entre buque y terminal (o entre buques) contienen el mismo producto antes y después de la operación. Se realiza desplazando un volumen de cargo igual o ligeramente mayor al volumen calculado de las líneas. |
| **Volumen de línea calculado** | Basado en diámetro interno y longitud de tuberías (barco + brazo de carga/manguera + tuberías de terminal). |
| **Tolerancia** | Si los caudales medidos antes y después de la operación de desplazamiento difieren ≤ 2% del volumen de línea, se considera la línea llena. |
| **¿Hay desplazamiento planificado?** | Pregunta de acuerdo explícita en la conferencia: se confirma si se realizará desplazamiento de líneas. |
| **Parada final: Ship Stop o Shore Stop** | Acuerdo sobre quién da la orden final de parada para gestionar el contenido de línea. |

### 2.6 Vessel Experience Factor (VEF)

El VEF no es un dato que se "acuerda" en la conferencia en tiempo real, pero sí se **documenta y declara** antes de la operación:

| Parámetro | Descripción |
|---|---|
| **VEF declarado** | Ratio histórico buque/shore de los últimos viajes calificantes (mín. 5, típico 10), calculado per API MPMS 17.9 / EI HM-49. |
| **VEF de carga (Load VEF)** | Ratio TCV (Total Calculated Volume) buque / cantidad de Bill of Lading. |
| **VEF de descarga (Discharge VEF)** | Ratio TCV buque / cantidad de outturn (cantidad recibida en destino). |
| **Voyages calificantes** | Aquellos dentro de ±0.3% del promedio de todos los viajes; mínimo 5 para aplicar VEF. |
| **Aplicación en STS** | En transferencias STS, la ausencia de shore figures independientes hace el VEF más difícil de aplicar; se usa con cautela. |

---

## 3. Parámetros Adicionales para Operación Barco–Terminal (Más Extenso)

Las operaciones buque–terminal tienen el mayor número de requerimientos regulatorios y documentales, tanto por las dimensiones de los equipos involucrados como por el marco regulatorio portuario:

### 3.1 Documentación de Certificación de Equipos

| Documento | Descripción | Frecuencia |
|---|---|---|
| **Certificado de prueba de presión de líneas / Hose pressure test certificate** | Prueba hidrostática de las mangueras de transferencia a 1.5× la presión operativa máxima. Requerido por OCIMF y regulaciones USCG (33 CFR 154). | Máximo cada 12 meses (OCIMF STS Hose Guidelines) |
| **Certificado de calibración de equipos de medición** | Certificado de calibración de medidores de flujo (flow meters), instrumentos de ullage/gauging, termómetros y densímetros. | Período definido por el fabricante / autoridad de pesos y medidas local |
| **Certificado de carga de brazos de carga (Loading arm)** | Inspección y test de los brazos articulados de carga (Marine Loading Arms – MLA); registro de operatividad del sistema de desconexión de emergencia (PERC). | Anual o según plan de mantenimiento de terminal |
| **Certificado de calibración de tanques de terminal** | Tablas de calibración actualizadas de los tanques de tierra involucrados. | Según autoridad de metrología local |
| **Certificado USCG / Autoridad de bandera** | Tarjeta de transferencia de la instalación (Facility Response Plan, Certificate of Adequacy). | Varios años según tipo de instalación |

### 3.2 Presión Máxima Permitida en Manifold

| Parámetro | Descripción |
|---|---|
| **Presión máxima en manifold del buque** | MAWP (Maximum Allowable Working Pressure) declarada por el buque; la terminal no debe excederla. Acordado en Part 6 SSSCL. |
| **Presión máxima de la terminal** | Presión máxima que la terminal puede proveer; puede ser el factor limitante. |
| **Presión operativa acordada** | La menor de las dos anteriores; acordada como límite operativo durante la transferencia. |
| **Setpoints de alarma de presión** | Valores a los cuales se activan alarmas de alta presión en buque y terminal. |

### 3.3 Tamaños de Manguera y Manifold (Hose Sizes)

| Parámetro | Descripción |
|---|---|
| **Diámetro nominal de manifold del buque** | Expresado en pulgadas o milímetros; define compatibilidad con la conexión de la terminal. |
| **Diámetro nominal de mangueras / brazos de carga de terminal** | Debe coincidir con el manifold del buque o adaptarse con reductores. |
| **Número y tipo de conexiones** | Número de mangueras/brazos conectados; tipo de brida (ANSI, DIN, etc.). |
| **Número de serie y certificados de mangueras** | Identificación individual de cada manguera; verificación de vigencia de certificado de presión. |
| **Material de manguera** | Compatibilidad con el producto a transferir. |

### 3.4 Checklists de Seguridad y Alerta (ISGOTT SSSCL)

El SSSCL de ISGOTT 6ª Ed. (Cap. 25) comprende las siguientes partes relevantes para la conferencia:

| Parte SSSCL | Contenido | Quién completa |
|---|---|---|
| **Parts 1–4** | Pre-arrival (buque) y post-amarre; condición del buque, amarres, francobordo, calado, inert gas. | Buque, Terminal |
| **Part 5A** | Pre-transfer conference: reunión bilateral; temas de seguridad, equipos, supervisión, señales de emergencia, ESD. | Ambos (presencial) |
| **Part 5B** | Checks pre-transferencia específicos para tanqueros químicos (productos a granel). | Ambos |
| **Part 5C** | Checks pre-transferencia para gas licuado (LPG/LNG). | Ambos |
| **Part 6** | Acuerdos pre-transferencia: todos los parámetros numéricos y operativos acordados (rates, presiones, notice period). | Ambos; debe inicialar cada acuerdo |
| **Parts 7A–7C** | Checks previos al inicio: tanques inertizados, sistema de gas inerte operativo, alarmas probadas; si COW; si limpieza. | Buque |
| **Parts 8–9** | Checks recurrentes durante la operación (cada N horas, según acordado). | Buque y Terminal |

**Items clave de la Part 5A (pre-transfer conference):**

- Comunicaciones buque-terminal establecidas y canal VHF acordado (backup también acordado).
- Sistema ESD buque-terminal probado y operativo; criterios de activación acordados.
- Posiciones de ESD manual (buque y terminal) accesibles y conocidas por ambas partes.
- Procedimientos de respuesta a alarmas acordados.
- Equipos de transferencia en condición segura (aislados, sin presión, drenados).
- Supervisión y guardias adecuadas.
- Restricciones de fuego, fumar, radio (radio silence durante primeras etapas).
- Equipos de lucha contra incendios listos.
- Material de contención de derrames disponible.
- Francobordo y calado monitoreados continuamente; aviso de desconexión de mangueras/brazos.

**Items de la Part 6 (acuerdos pre-transferencia):**

- Período de aviso para maniobra (Notice period for full readiness to manoeuvre).
- Ratas máximas de transferencia (Maximum transfer rates).
- Rata de topping-off (Topping-off rates).
- Tiempo de reducción/aumento de rata.
- Tiempo de cierre de válvulas automáticas.
- Tiempo de parada total; Ship Stop o Shore Stop.
- Presión máxima en manifold.
- Temperatura límite del cargo.
- Parámetros del sistema de retorno de vapores (para operaciones con vapor recovery obligatorio):
  - Capacidad máxima de vapores del sistema de la terminal.
  - Tipos de vapores esperados (cargo actual y anteriores).
  - Presión operativa en tanques de cargo.
  - Setpoints de alarma de alta/baja presión.

### 3.5 Canales de Comunicación (VHF y ESD)

| Parámetro | Descripción |
|---|---|
| **Canal VHF primario** | Canal de trabajo acordado entre buque y terminal (ej. Canal 14, 16 o el designado por la terminal). |
| **Canal VHF de respaldo** | Canal alternativo en caso de fallo del primario. |
| **Señal de emergencia acordada** | Señal sonora, visual o de radio para parada de emergencia no ESD (ej. tres pitidos cortos). |
| **Sistema ESD (Emergency Shutdown)** | Sistema electrónico o neumático de parada de emergencia que interconecta buque y terminal; probado antes de iniciar. |
| **PERC (Emergency Release Coupling)** | Sistema de desconexión de emergencia de los brazos de carga; probado y criterios de activación acordados. |
| **Señales de tráfico del puerto** | Señales del control de tráfico del puerto relevantes para la operación (si aplica). |

### 3.6 Procedimientos ESD

| Aspecto | Descripción |
|---|---|
| **Test de ESD pre-operación** | El sistema ESD integrado buque-terminal debe probarse antes de iniciar el flujo. |
| **Criterios de activación** | Lista acordada de condiciones que activan el ESD automáticamente o manualmente. |
| **Secuencia de ESD** | Orden de cierre de válvulas en buque y terminal; tiempo de respuesta esperado. |
| **Comunicación post-ESD** | Procedimiento de notificación después de una activación de ESD. |

---

## 4. Diferencias Prácticas por Tipo de Operación

### 4.1 Tabla Comparativa General

| Aspecto | Barco–Terminal | Barco–Barcaza (STS) | Barcaza–Terminal |
|---|---|---|---|
| **Marco regulatorio principal** | ISGOTT 6 + regulaciones portuarias + 33 CFR 156 (EE.UU.) | OCIMF/ICS/SIGTTO STS Guide 2025 + ISGOTT 6 + MARPOL Reg. 41A | ISGOTT 6 (adaptado) + 33 CFR 156 + regulaciones locales |
| **Checklist a usar** | ISGOTT SSSCL completo | STS Safety Checklist (6 partes, alineado con ISGOTT 6) | SSSCL simplificado o DOI + checklist barcaza |
| **Personas en la conferencia** | Loading Master (terminal) + Chief Officer o Master (buque) + cargo surveyor | Master o Chief Officer del buque receptor + Master/OIC del buque transferidor + STS Superintendent | Tankerman-PIC (barcaza) + Loading Master-PIC (terminal dock) |
| **Certificados de manguera** | Certificados de brazos de carga de la terminal; mangueras propias del buque si aplica. Vigencia ≤ 12 meses. | OCIMF STS Hose Guidelines: certificados de presión ≤ 12 meses; certificados de prueba disponibles físicamente. | Mangueras de la barcaza + conexiones de la terminal. |
| **Certificados de calibración** | Medidores de flujo de terminal + calibración de tanques de tierra. Exigencia alta. | Calibración de tanques de ambos buques (tablas de sounding/ullage). VEF aplicable. | Calibración de tanques de barcaza + medidores de terminal si aplica. |
| **ESD** | Sistema integrado electrónico (SIL) buque–terminal; test obligatorio antes de iniciar. | Señales acordadas (ej. radio, señales visuales); puede no haber ESD electrónico integrado. | Más parecido a barco–terminal; depende de la infraestructura de la terminal. |
| **VHF** | Canal fijo asignado por autoridad portuaria. | Canal acordado entre los dos buques; puede ser diferente al del puerto. | Canal asignado por la terminal. |
| **Presión de línea** | Crítica: MAWP de buque y terminal acordados. Alarmas calibradas. | Crítica: presión de bombas y líneas STS limitada por mangueras flexibles. | Moderada: presiones de barcaza típicamente menores. |
| **Line displacement** | Sí, siempre que sea posible; acordado en conferencia. | Se realiza si la longitud de manguera lo justifica; acordado en plan de transferencia. | Sí, con las mismas consideraciones que barco–terminal. |
| **VEF aplicable** | Sí; shore figures de medidores o tanques de tierra. | Limitado: sin shore figures independientes; se usan figuras de ambos buques. | Sí, si hay medidores de flujo en la terminal; limitado si no los hay. |
| **Parámetros de vapores** | Obligatorio en terminales con vapour recovery; setpoints acordados. | Raramente aplica; depende de tipo de cargo y equipos disponibles. | Similar a barco–terminal si la terminal tiene recuperación de vapores. |
| **Notice period (aviso de maniobra)** | Crítico para terminales con mucho tráfico; acordado y registrado. | Crítico porque ambos buques deben estar listos para separarse. | Importante para coordinación con piloto y remolcadores. |
| **Complejidad documentaria** | Mayor: certificados de terminal, certificados de buque, DOI, SSSCL, cargo plan. | Media: STS Operations Plan, STS Checklist, cargo plan. | Media-Alta: similar a barco–terminal pero con capacidades de barcaza más limitadas. |
| **Mooring y fenders** | Terminal fija; fenders de terminal. | Ambos buques deben acordar tipo y número de fenders (plan de fondeo/amarre STS). | Barcaza amarra al dock; fenders de terminal o barcaza. |

### 4.2 Barco–Terminal: Lo Más Extenso

Requiere la mayor cantidad de documentación y acuerdos debido a:

- Infraestructura fija de alto valor con sistemas complejos (brazos de carga, medidores de flujo, vapour recovery, PERC).
- Regulaciones portuarias específicas (ISPS, autoridad de puerto, planes de contingencia).
- Mayor capacidad de bombeo que puede generar sobrepresiones.
- Exigencias de metrología legal (custody transfer) más rigurosas.
- Inspectores de ambas partes presentes (independent inspector o cargo surveyor).

### 4.3 Barco–Barcaza (STS): Simplificaciones y Exigencias Propias

**Se simplifica:**
- No hay autoridad portuaria fija que asigne canales; se acuerdan entre los dos buques.
- ESD puede no ser electrónico integrado; se usan señales preacordadas.
- Vapour recovery raramente aplicable.
- Certificados de terminal no aplican; se verifican los de ambos buques.

**Exigencias propias:**
- Plan de amarre STS detallado (tipo de fenders, número, posicionamiento).
- Compatible de francobordo (diferencia máxima de francobordo entre buques).
- Procedimiento de maniobra de aproximación y separación.
- Condiciones meteorológicas umbrales para iniciar/suspender (Beaufort, altura de ola).
- Monitoreo continuo del movimiento relativo de ambos buques.
- STS Superintendent como coordinador externo (recomendado por OCIMF).

### 4.4 Barcaza–Terminal: Posición Intermedia

La barcaza-terminal comparte características de ambas modalidades:
- La terminal aporta la infraestructura fija (mangueras, medidores, ESD), similar a barco–terminal.
- La barcaza tiene capacidades reducidas (bombas menos potentes, sin ESD electrónico sofisticado).
- La declaración DOI es estándar en EE.UU. (33 CFR 156.150).
- El PIC de la terminal es el "Loading Master-PIC"; el de la barcaza es el "Tankerman-PIC".
- Los certificados de calibración de la barcaza son menos complejos que los de un buque tanque de alta mar.
- En EE.UU.: la conferencia debe ser cara a cara (excepción: condiciones meteorológicas que impidan acceso seguro; en ese caso, por radio).

---

## 5. Implicaciones para un Checklist Digital / Modelo de Datos en SUPER-SURVEY

### 5.1 Principios de Diseño del Modelo

Un software de survey de cantidad debe estructurar la Key Meeting como un **documento de operación parametrizado por tipo**, donde:

1. El tipo de operación (Ship–Terminal / Ship–Ship / Barge–Terminal) **activa o desactiva** grupos de campos.
2. Los datos capturados se **vinculan directamente** al informe de survey y a los cálculos de cantidad.
3. La conferencia genera un **registro firmado digitalmente** por ambas partes (equivalente al SSSCL firmado).
4. Cada campo tiene un tipo de dato definido (numérico, booleano, texto libre, lista desplegable, fecha/hora).

### 5.2 Propuesta de Estructura de Datos: Key Meeting

```
KeyMeeting {
  // ---- METADATOS DE LA OPERACIÓN ----
  operationId          : UUID
  operationType        : enum [SHIP_TERMINAL, SHIP_SHIP_STS, BARGE_TERMINAL]
  operationSubtype     : enum [LOADING, DISCHARGING, TRANSHIPMENT]
  port                 : string
  terminalOrVessel     : string
  dateTimeConference   : datetime (ISO 8601)
  attendees            : [
    { role: enum[MASTER|CHIEF_OFFICER|LOADING_MASTER|STS_SUPT|SURVEYOR|TANKERMAN_PIC|...],
      name: string, company: string }
  ]
  referenceDocuments   : [string]  // charter party, nombramiento, cargo manifest

  // ---- IDENTIFICACIÓN DE CARGO ----
  cargo : [
    {
      gradeCode        : string   // API/comercial
      gradeName        : string
      billOfLadingRef  : string
      nominatedQuantity_MT  : number
      nominatedQuantity_M3  : number
      density_kg_m3    : number
      density_api      : number
      loadTemperature_C: number
      vcf              : number   // Volume Correction Factor esperado
      previousCargoInTanks: string  // compatibilidad
    }
  ]

  // ---- TANQUES NOMINADOS ----
  nominatedTanks : [
    {
      tankId           : string   // identificador único del tanque
      tankName         : string   // ej. "1P", "2S", "COT"
      gradeRef         : string   // referencia al cargo anterior
      obqRob_MT        : number   // OBQ (si carga) o ROB esperado (si descarga)
      obqRob_M3        : number
      obqType          : enum [FREE_WATER, SLOPS, CARGO, SLUDGE]
      sequence         : integer  // orden de llenado/vaciado
      highLevelAlarm_pct: number  // % de llenado al cual suena alarma
      maxAllowableFill_pct: number
    }
  ]

  // ---- PARÁMETROS DE BOMBEO ----
  pumpingRates : {
    initialRate_m3h   : number    // rata inicial / slow rate
    maxRate_m3h       : number    // rata máxima acordada
    toppingOffRate_m3h: number    // rata de topping off
    timeToReduceRate_min: number  // tiempo para reducir de max a topping
    timeToStop_min    : number    // tiempo de parada total
    finalStop         : enum [SHIP_STOP, SHORE_STOP]
    timeAutoValveClose_sec: number // cierre de válvulas automáticas
  }

  // ---- LÍNEAS Y MANIFOLD ----
  lineAndManifold : {
    hoseCount           : integer
    hoseDiameter_in     : number    // pulgadas o mm
    manifoldSize_in     : number
    lineVolume_m3       : number    // volumen calculado de líneas buque+shore
    lineDisplacementPlanned: boolean
    linePressurizationPlanned: boolean
    maxManifoldPressure_bar: number
    maxPumpingPressure_bar: number  // MAWP del buque
    vesselMawp_bar      : number
    terminalMaxPressure_bar: number
  }

  // ---- ESD Y COMUNICACIONES ----
  esd_communications : {
    esdSystemLinked     : boolean
    esdTestCompleted    : boolean
    esdTestTime         : datetime
    manualEsdPositions  : [string]  // ubicaciones de ESD manual
    activationCriteria  : [string]
    emergencySignal     : string    // ej. "tres pitidos cortos"
    percAvailable       : boolean   // Para MLA en terminal
    vhfPrimaryChannel   : string
    vhfBackupChannel    : string
    languageOfComm      : string
  }

  // ---- CERTIFICADOS (activo para SHIP_TERMINAL y BARGE_TERMINAL) ----
  certificates : [
    {
      type        : enum [HOSE_PRESSURE_TEST | FLOW_METER_CALIBRATION |
                          SHORE_TANK_CALIBRATION | LOADING_ARM_INSPECTION |
                          VESSEL_GAUGING_CALIBRATION | OTHER]
      issuer      : string
      issueDate   : date
      expiryDate  : date
      referenceNo : string
      valid       : boolean  // calculado: expiryDate > today
    }
  ]

  // ---- VEF (activo para operaciones con shore figures) ----
  vef : {
    vefDeclared     : number    // VEF calculado per API MPMS 17.9
    vefType         : enum [LOAD_VEF, DISCHARGE_VEF]
    qualifyingVoyages: integer
    dateCalculated  : date
    applicable      : boolean
    note            : string    // ej. "no aplica – STS sin shore figures"
  }

  // ---- SISTEMA DE VAPORES (activo para terminales con vapour recovery) ----
  vapourRecovery : {
    systemAvailable     : boolean
    maxVapourCapacity_m3h: number
    cargoVapourType     : string
    tankOperatingPressure_mbar: number
    highPressureAlarm_mbar: number
    lowPressureAlarm_mbar : number
    terminalTripPoints  : string
  }

  // ---- PARÁMETROS STS ESPECÍFICOS (activo solo para SHIP_SHIP_STS) ----
  stsParams : {
    stsOperatorName       : string
    fenderType            : string
    fenderCount           : integer
    mooringArrangement    : string
    freeboard_vessel1_m   : number
    freeboard_vessel2_m   : number
    maxFreeboardDiff_m    : number
    weatherThreshold_bf   : number    // Beaufort máximo para operar
    waveHeightThreshold_m : number
    noticePeriodManoeuvre_min: number
    separationProcedure   : string
    stsSuperintendentPresent: boolean
  }

  // ---- SEGURIDAD Y WATCHKEEPING ----
  safety : {
    smokingAreaDefined    : boolean
    nakedLightProhibition : boolean
    fireEquipmentReady    : boolean
    spillContainmentReady : boolean
    personnelSufficient   : boolean
    watchkeepingAdequate  : boolean
    portAuthorityNotified : boolean
    sspComplied           : boolean   // ISPS Ship Security Plan
    emergencyEscapeRoute  : boolean
  }

  // ---- FIRMAS Y VALIDACIÓN ----
  signatures : [
    { role: string, name: string, signedAt: datetime, signatureData: string }
  ]
  documentRetentionDate : date  // mínimo 3 meses desde la firma (ISGOTT req.)
  status : enum [DRAFT, SIGNED, OPERATIONS_COMMENCED, COMPLETED]
}
```

### 5.3 Tabla de Campos Activos por Tipo de Operación

| Sección / Campo | Ship–Terminal | Ship–Ship (STS) | Barge–Terminal |
|---|:---:|:---:|:---:|
| Cargo (grado, densidad, temperatura) | ✓ | ✓ | ✓ |
| Tanques nominados y secuencia | ✓ | ✓ | ✓ |
| OBQ / ROB | ✓ | ✓ | ✓ |
| Ratas de bombeo (initial, max, topping) | ✓ | ✓ | ✓ |
| Tiempo de cierre de válvulas automáticas | ✓ | Parcial | ✓ |
| MAWP / Presión máxima manifold | ✓ | ✓ | ✓ |
| Diámetro y certificados de mangueras | ✓ | ✓ | ✓ |
| Line displacement / volumen de línea | ✓ | Opcional | ✓ |
| VHF canales (primario y backup) | ✓ | ✓ | ✓ |
| ESD integrado (test, posiciones, criterios) | ✓ | Limitado | ✓ |
| PERC (brazos de carga) | ✓ | No | Posible |
| Certificado de presión de mangueras | ✓ | ✓ | ✓ |
| Calibración de medidores de flujo | ✓ | No | ✓ |
| Calibración de tanques de tierra | ✓ | No | ✓ |
| Calibración de tanques del buque | ✓ | ✓ | ✓ |
| VEF | ✓ | Limitado* | ✓ (si hay medidor) |
| Vapour recovery params | ✓ | No | Ocasional |
| Notice period para maniobra | ✓ | ✓ | ✓ |
| Parámetros STS (fenders, francobordo, tiempo) | No | ✓ | No |
| Condiciones meteorológicas umbrales | Opcional | ✓ | Opcional |
| STS Superintendent | No | Recomendado | No |
| DOI (33 CFR 156.150) – EE.UU. | ✓ | ✓ | ✓ |

\*En STS, el VEF se aplica con limitaciones porque no hay shore figures independientes.

### 5.4 Reglas de Validación Recomendadas para SUPER-SURVEY

1. **`maxRate_m3h >= initialRate_m3h`** — Error si la rata inicial supera la máxima acordada.
2. **`toppingOffRate_m3h < maxRate_m3h`** — Error si la rata de topping es mayor o igual a la máxima.
3. **`vesselMawp_bar AND terminalMaxPressure_bar → maxManifoldPressure_bar = MIN(ambos)`** — La presión acordada nunca puede superar el límite del más restrictivo.
4. **`certificates[].expiryDate > dateTimeConference`** — Alerta si algún certificado está vencido al momento de la conferencia.
5. **`esdTestCompleted = true BEFORE status = OPERATIONS_COMMENCED`** — No se puede iniciar operaciones sin ESD probado.
6. **`signatures.count >= 2`** — Mínimo una firma de cada parte antes de cambiar status a SIGNED.
7. **`lineVolume_m3 > 0 IF lineDisplacementPlanned = true`** — El volumen de línea es obligatorio si se planifica desplazamiento.
8. **`vef.qualifyingVoyages >= 5 IF vef.applicable = true`** — VEF no aplicable con menos de 5 viajes calificantes.
9. **Para STS: `stsParams.freeboard_vessel1_m - freeboard_vessel2_m <= stsParams.maxFreeboardDiff_m`** — Alerta si la diferencia de francobordo supera el límite.
10. **`documentRetentionDate = dateTimeConference + 90 días`** — ISGOTT requiere retención de 3 meses.

---

## 6. Incertidumbres y Marcas de Precaución

- **[INCERTIDUMBRE]** El texto completo del SSSCL de ISGOTT 6ª Ed. (2020) y del STS Transfer Guide 2025 no es de acceso público gratuito. Los items específicos de las Parts 5A y 6 citados en este documento han sido verificados a través de múltiples fuentes secundarias, extractos y resúmenes de la industria, pero la lista completa de los 59 items del SSSCL puede no estar exhaustivamente representada.

- **[INCERTIDUMBRE]** Los valores numéricos concretos (ej. porcentaje exacto de tolerancia de line displacement, número exacto de voyages calificantes para VEF) provienen de fuentes secundarias (blogs especializados, artículos P&I clubs) y no directamente de los estándares API MPMS o ISGOTT. Deben verificarse contra los estándares originales antes de implementar en producción.

- **[VERIFICADO]** La estructura general de la SSSCL (Parts 5A, 5B, 5C, 6, 7A–7C, 8, 9) está confirmada por múltiples fuentes independientes.

- **[VERIFICADO]** Los requisitos de 33 CFR 156.150 (DOI) y WAC 173-180-235 (conferencia cara a cara) están confirmados por textos regulatorios accesibles.

- **[VERIFICADO]** VEF: calculado per API MPMS 17.9 / EI HM-49; mínimo 5 voyages calificantes; tolerancia ±0.3% del promedio.

- **[VERIFICADO]** Certificados de mangueras: vigencia máxima 12 meses per OCIMF STS Hose Guidelines (múltiples fuentes coincidentes).

- La aplicación específica del software BQS de Lloyd's Register mencionada por el usuario no ha podido verificarse públicamente en detalle; los parámetros (ratas de bombeo, tanques a usar, confirmación de grados) son consistentes con la doctrina ISGOTT/OCIMF descrita en este documento.

---

## Fuentes

- [ISGOTT 6th Edition – ICS Publications](https://www.ics-shipping.org/publications/international-safety-guide-for-oil-tankers-and-terminals-isgott-sixth-edition)
- [ISGOTT 6 Ship/Shore Safety Checklists – OCIMF Document Library](https://www.ocimf.org/document-libary/16-isgott-6-ship-shore-checklists/file)
- [OCIMF Document Library – Marine Terminal Information Booklet](https://www.ocimf.org/document-libary/marine-terminal-information-booklet-guidelines-and-recommendations)
- [OCIMF/ICS/SIGTTO STS Transfer Guide 2nd Edition 2025 – ICS Publications](https://www.ics-shipping.org/publications/ship-to-ship-transfer-guide-for-petroleum-chemicals-and-liquefied-gases-second-edition)
- [New OCIMF STS Transfer Guide 2025 – Marine Safety Consultant](https://marine-safety-consultant.ch/ocimf-sts-guide-2025/)
- [Evolving Standards: OCIMF STS Transfer Guide – STS Marine Solutions](https://stsmarinesolutions.com/news/evolving-standards-the-latest-ocimf-sts-transfer-guide)
- [33 CFR § 156.150 – Declaration of Inspection – eCFR](https://www.ecfr.gov/current/title-33/chapter-I/subchapter-O/part-156/subpart-A/section-156.150)
- [33 CFR § 156.120 – Requirements for Transfer – Cornell LII](https://www.law.cornell.edu/cfr/text/33/156.120)
- [WAC 173-180-235 Pretransfer Conference – Washington State Legislature](https://app.leg.wa.gov/WAC/default.aspx?cite=173-180-235)
- [OCIMF Guidelines for STS Hoses – Maritime Cyprus](https://maritimecyprus.com/wp-content/uploads/2021/06/OCIMFguidelines-for-STS-hoses.pdf)
- [VEF – API MPMS Chapter 17.9 / EI HM-49 – Energy Institute](https://www.energyinst.org/technical/publications/topics/hydrocarbon-management/hm-49api-mpms-chapter-17.9-vessel-experience-factor-vef)
- [VEF – Marine Learning Club](https://marinelearningclub.com/how-is-the-vessel-experience-factor-vef-calculated-what-is-it/)
- [VEF – Navarik](https://www.navarik.com/vessel-experience-factor)
- [VEF en STS – UK P&I Club](https://www.ukpandi.com/news-and-resources/news/article/articles/2015/sts-cargo-transfers-vessel-experience-factor-vef/)
- [Line Displacement – Maritime Page](https://maritimepage.com/line-displacement/)
- [Line Packing & Line Displacement – Petroleum Inspector Blog](http://petrolinspector.blogspot.com/2016/04/line-pressing-line-displacement-2-ways_28.html)
- [Line Displacement – HubSE Demurrage Software](https://hubse.com/line-displacement-an-explanation/)
- [Clearing Shore Pipelines – Gard Insights](https://gard.no/insights/clearing-shore-pipelines-final-step-cargo-loading-operations/)
- [Pre-Loading Cargo Handling Procedures – Cult of Sea](https://www.cultofsea.com/tanker/pre-loading-cargo-handling-procedures-oil-tankers/)
- [Tanker Loading Procedures – KnowledgeOfSea](https://knowledgeofsea.com/loading-cargo/)
- [ISGOTT 6 SSSCL vs DOI – UAB Online](https://uab-online.com/news/isgott-6-vs-declaration-of-inspection-key-differences)
- [Ship Shore Safety Checklist 2025 – SSSCL System TankTerminals](https://tankterminals.com/ssscl-system/)
- [Loading Master – Wikipedia](https://en.wikipedia.org/wiki/Loading_master)
- [SIRE 2.0 Question Library Part 2 – Safety4Sea](https://safety4sea.com/wp-content/uploads/2022/01/OCIMF-SIRE-2.0-Question-Library-Part-2-2022_01.pdf)
- [OBQ Report – Mooring Marine Consultancy](https://mooringmarineconsultancy.wordpress.com/tag/obq-report/)
- [OBQ Definition – Law Insider](https://www.lawinsider.com/dictionary/obq)
- [Tanker Terminal Communication Procedures – Marine Public](https://www.marinepublic.com/blogs/oil-and-gas/422784-tanker-terminal-ship-shore-communication-and-procedures)
- [Ship-to-Ship Transfer – Wikipedia](https://en.wikipedia.org/wiki/Ship-to-ship_cargo_transfer)
- [ISGINTT – International Safety Guide for Inland Navigation Tank Barges](https://www.isgintt.org/files/documents/isgintt062010_en.pdf)
- [API MPMS Chapter 17.1 – Guidelines for Marine Inspection](https://www.api.org/~/media/files/publications/whats%20new/17_1%20e6%20pa.pdf)
- [Manifold and First Foot Samples at Load Ports – Gard](https://gard.no/en/insights/importance-manifold-first-foot-samples-at-load-ports/)
- [MARPOL STS Operations Plan – ClassNK](https://www.classnk.or.jp/hp/pdf/tech_info/tech_img/T834e.pdf)

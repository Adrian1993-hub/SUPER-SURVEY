# Operación BQS — Bunker Quantity Survey · Doctrina Operativa v0.1

> Parte del **Mapa de Operaciones y Documentos**. Define **QUÉ es** BQS, qué **mide** el
> surveyor, qué **calcula** el programa, qué **compara**, qué **documentos** produce, **quién
> firma** y cuándo se emite **NOAD/LOP/SOF**.
>
> **Estado: v0.1 — borrador para VALIDAR contra el caso real EQUINOX MELIDA.**
> Las **suposiciones** llevan ⚠️ y deben confirmarse. Actualizado: 2026-06-06.

---

## 0. En una frase

BQS mide y concilia la cantidad de **combustible (bunkers)** transferido —típicamente de una
**barcaza a un buque**— comparando **lo que la barcaza entregó**, **lo que el buque recibió** y
**lo que dice el BDN**, y deja constancia **firmable** de cualquier discrepancia.

---

## 1. Definición operacional

Survey de cantidad de bunkers en una operación de *bunkering*. El surveyor es un tercero
independiente que verifica volúmenes, temperaturas, densidades y agua, calcula las toneladas
métricas por las tres fuentes y certifica la diferencia. Variantes:

- **Barge → Vessel** (lo más común). *(MVP)*
- **Shore/terminal → Vessel** (con tanques de tierra / flowmeter).
- **Debunkering**: Vessel → Barge (inverso funcional).

---

## 2. Qué hace físicamente el surveyor (flujo de campo)

**Antes de transferir (Opening):**
1. Asiste a la reunión previa; revisa BDN previsto, calidad, plan.
2. **Sondea/ullage** todos los tanques de bunker del **buque** (ROB inicial) y de la **barcaza**
   (cantidad inicial), incluyendo trim/list.
3. Mide **temperatura** y toma **densidad** (o la toma del certificado).
4. Comprueba **agua libre** (pasta detectora / corte de agua).
5. Verifica precintos de la barcaza, líneas llenas/vacías, válvulas.
6. Toma/atestigua **muestras** (precintadas, distribuidas).

**Durante:** registra eventos para el SOF (mangueras conectadas, inicio, paradas, fin).

**Después (Closing):**
7. Sondea de nuevo **buque** (ROB final) y **barcaza** (cantidad final).
8. Repite temperatura / densidad / agua.
9. Calcula y **cotejа** las tres fuentes; si hay discrepancia, emite **NOAD/LOP**.
10. Recoge **firmas** y emite reportes.

---

## 3. Fuentes de medición

| Fuente | Qué aporta | Cómo |
|---|---|---|
| **Buque (vessel)** | ROB **antes** y **después** por tanque | sondaje/ullage + tablas del buque |
| **Barcaza (barge)** | Cantidad **antes** y **después** por tanque | sondaje/ullage + tablas de la barcaza |
| **BDN** (Bunker Delivery Note) | Cantidad declarada por el proveedor | documento externo |
| **(opc.) Shore / flowmeter** | Entrega de tierra | medidor/tablas de tierra |

---

## 4. Datos que se recolectan (por tanque y por fuente)

| Dato | Unidad | Fuente | Notas |
|---|---|---|---|
| Ullage / sondaje | mm / m | campo | seco o por interfaz |
| Tabla de calibración → volumen | m³ / bbl | tabla del buque/barcaza | por tanque |
| Trim / List | m / ° | campo | corrección por tabla |
| Temperatura del producto | °C | campo (API Ch 7) | media o por tanque |
| **Densidad @ 15 °C (vacío)** | kg/m³ ó t/m³ | certificado / medida (API Ch 9, ISO 3675/12185) | base del VCF y del peso |
| Agua libre (FW) | m³ / mm | campo (pasta / corte) | se deduce |
| Volumen de tablas | m³ | calibración | TOV |
| **BDN**: volumen, T, densidad, MT | varias | externo | base de comparación |
| Calidad / muestras | — | externo / campo (API Ch 8) | precintos, recibos |

---

## 5. Cálculo principal — cadena horizontal por tanque

```
Ullage/Sondaje
  → Volumen de tabla (calibración del tanque)
  → (corrección por Trim / List)
  → TOV  (Total Observed Volume, a T observada)
  → (− Agua libre FW)
  → GOV  (Gross Observed Volume, a T observada)
  → × VCF  (Volume Correction Factor, API MPMS Ch 11.1 / ASTM D1250)
  → GSV  (Gross Standard Volume @ 15 °C / 60 °F)
  → × Densidad@15 (vac)  ó  × WCF (Tabla 56)
  → Toneladas Métricas   (en VACÍO y en AIRE)
```

**Estándares aplicables:** API MPMS Ch 3 (gauging), Ch 7 (temperatura), Ch 8 (muestreo),
Ch 9 (densidad), **Ch 11.1 (VCF)**, Ch 12.1 (cálculo de cantidades), **Ch 17.1** (inspección
marina y manejo de discrepancias).

**Fórmulas clave:**
- `GOV = TOV − FW`
- `GSV = GOV × VCF` — VCF según producto y temperatura. ⚠️ **Confirmar tabla**: para fueles
  generalizados suele ser **Tabla 54B** (métrico, densidad@15) / **6B** (API@60°F).
- **Masa (vacío):** `MT_vac = GSV(m³) × densidad15(t/m³)`
- **Peso en aire:** `MT_aire = GSV × WCF`, con `WCF ≈ densidad15 − 0.0011` (t/m³) ó Tabla 56.
- ⚠️ **Convención de venta:** confirmar si el BDN/contrato usa **MT en aire** o **MT en vacío**
  (los bunkers suelen comerciarse en MT; hay que fijar cuál es la oficial del reporte).
- ⚠️ **Redondeo / decimales:** confirmar reglas (p. ej. VCF a 4 decimales, MT a 3) con el Excel real.

---

## 6. Comparaciones (el corazón del reporte)

- **Vessel Received** = ROB_buque_final − ROB_buque_inicial  (closing − opening)
- **Barge Delivered** = Barcaza_inicial − Barcaza_final  (opening − closing)
- **BDN** = cifra declarada por el proveedor.

| Comparación | Qué detecta |
|---|---|
| Barge Delivered **vs** BDN | si la barcaza entregó lo que factura |
| Vessel Received **vs** Barge Delivered | la **diferencia de survey** (la discusión típica) |
| Vessel Received **vs** BDN | faltante/sobrante respecto a lo facturado |

Cada comparación muestra **diferencia absoluta (MT)** y **% **, y se marca contra **tolerancia**.

---

## 7. Documentos / reportes (matriz)

| Documento | Qué prueba | Quién lo usa | Cuándo se imprime | Firma | Jala del Cover | Jala de mediciones | Tipo |
|---|---|---|---|---|---|---|---|
| **Cover / Job Setup** | datos maestros del trabajo | todos | al iniciar | surveyor | — | — | maestro |
| **VMR** (Vessel Measurement Report) | cantidades medidas en el **buque** | buque, cliente | opening y closing | Chief Eng. + surveyor | sí | tanques buque | soporte |
| **BMR** (Barge Measurement Report) | cantidades medidas en la **barcaza** | barcaza, cliente | opening y closing | barge rep + surveyor | sí | tanques barcaza | soporte |
| **Summary** | comparación de las 3 fuentes + diferencia | todas las partes | al cierre | partes + surveyor | sí | totales | **final** |
| **Gauging Ticket** | evidencia de sondaje por tanque | soporte | en sitio | surveyor | parcial | sondajes | soporte |
| **Sample Receipt** | muestras tomadas/entregadas/precintos | laboratorio, partes | al muestrear | quien recibe | parcial | muestras | soporte |
| **SOF** (Statement of Facts) | cronología de eventos | todas las partes | al cierre | partes | sí (partes/fechas) | tiempos | soporte/legal |
| **NOAD** (Notice of Apparent Discrepancy) | aviso de discrepancia aparente | partes | cuando > tolerancia | surveyor + parte | sí (a quién va) | la diferencia | advertencia |
| **LOP** (Letter of Protest) | protesta formal | parte que protesta | ante condición/desacuerdo | emisor + receptor | sí (a quién va) | dato en disputa | protesta/legal |

> ⚠️ Confirmar contra EQUINOX MELIDA: nombres exactos, qué reportes existen, su orden y su look.

---

## 8. Firmas necesarias

- **VMR**: Jefe de Máquinas (Chief Engineer) del buque + surveyor.
- **BMR**: representante de la barcaza + surveyor.
- **Summary / SOF**: ambas partes + surveyor.
- **NOAD / LOP**: emisor + acuse de la contraparte (a veces "*signed under protest*").

> El destinatario (a quién va dirigida la carta) se **autollena desde el Cover** con un panel de selección.

---

## 9. Warnings / NOAD / LOP (reglas, defaults configurables)

- **Warning** si `|Vessel Received − Barge Delivered|` o `|… − BDN|` supera la **tolerancia**.
  ⚠️ Default propuesto: **0.5 %** (configurable por perfil/cliente).
- **NOAD** cuando hay discrepancia **aparente** de cantidad o calidad notable a las partes.
- **LOP** (protesta formal) en casos como: faltante fuera de tolerancia, **agua excesiva**,
  sospecha de **aireación ("cappuccino effect")**, desacuerdo de temperatura/densidad, cifras
  del **BDN en disputa**, negativa a muestrear, precintos rotos.
- API MPMS **17.1**: las discrepancias deben **registrarse y reportarse** a las partes (vía LOP
  o aviso de discrepancia) y **resolverse antes de que el buque zarpe**.

---

## 10. Export individual

Cada documento exportable por separado en **PDF** y **XLSX** (con marca/tema). Útil para
entregar al buque, a la barcaza o al cliente por separado.

## 11. Paquete final

Un solo **PDF** (y XLSX/JSON técnico) que reúne: Cover → VMR(s) → BMR(s) → Summary → Gauging
Tickets → Sample Receipts → SOF → NOAD/LOP (si aplica). Es lo que se archiva como evidencia.

---

## 12. Decisiones a confirmar (⚠️) y qué necesito de EQUINOX MELIDA

1. **Convención de peso:** ¿MT en **aire** o en **vacío** para la cifra oficial?
2. **Tabla VCF** exacta (54B/6B u otra) y de dónde sale la **densidad@15** (certificado vs medida).
3. **Reglas de redondeo** (decimales de VCF, volumen, MT) — para reproducir el Excel al dígito.
4. **Tolerancia** por defecto y por cliente.
5. **Lista exacta de reportes** y su **diseño** (para el report engine).
6. **Quién firma** cada documento en tu práctica real.

**Del caso EQUINOX MELIDA necesito:** el **Excel lleno (.xls)** + el **PDF/foto del reporte
firmado**. Súbelos a `docs/qa-cases/bqs-equinox-melida/` (o adjúntalos) y los uso para validar
el cálculo **al dígito** y modelar los reportes.

---

## 13. Mapeo doctrina → kernel (qué debe exponer el cálculo)

El kernel actual ya cubre parte de esta cadena (a endurecer):

| Paso doctrina | Dónde vive hoy | Estado |
|---|---|---|
| TOV → (−FW) → GOV → ×VCF → GSV → ×WCF → Weight | `rust-kernel/.../quantity_chain.rs` | ✅ base; ⚠️ WCF→MT es placeholder |
| opening/closing → movimiento por tanque y por set | `.../movement.rs` | ✅ base; ⚠️ no valida mismo producto |
| Comparación entre fuentes (Vessel/Barge/BDN) | — | ❌ falta (comparison engine) |
| Tolerancia → warning/NOAD/LOP | esquema `tolerance_*` | ❌ falta lógica |
| Trazabilidad por paso | `.../trace.rs` | ✅ |
| Persistencia inmutable | esquema `calculation_logs` | ✅ |

**Siguiente en código (Fase 1):** cerrar VCF/WCF reales (API 11.1) + el **comparison engine**
(Vessel vs Barge vs BDN con tolerancia), validados contra EQUINOX MELIDA.

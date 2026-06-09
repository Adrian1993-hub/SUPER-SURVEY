# SuperSurvey — App Flow

> **Flujos de la aplicación.** Cómo se mueve el usuario de principio a fin. Base para el diseño
> UI/UX (que se hará con el MCP de diseño). Alineado con `02-PRD.md` y `00-ULTRAPLAN §4–§5`.
> Versión: **v0.1** · 2026-06-09.

---

## 1. Mapa de navegación (alto nivel)

```
[Inicio / Lista de trabajos]
        │  crear / abrir
        ▼
[Cover · Job Setup] ──► [Perfiles] ──► [Key Meeting] ──► [Mediciones] ──► [Cálculo + Trace]
        │                                                                      │
        │                                                                      ▼
        │                                                            [Comparación de fuentes]
        │                                                                      │
        │                                                                      ▼
        │                                                          [Discrepancias: NOAD/LOP]
        │                                                                      │
        ▼                                                                      ▼
[Ajustes / Branding]                                              [Reportes] ──► [Export PDF/XLSX/JSON]
```

---

## 2. Ciclo de vida de un trabajo (estados)

```
Draft ──► In Progress ──► Calculated ──► Reported ──► Signed / Closed
  │            │              │              │
  └─ editable  └─ captura     └─ kernel ok   └─ PDF/XLSX generados
```
- El estado controla qué es editable y qué acciones se ofrecen.
- Al pasar a **Calculated**, el kernel produce cantidades + trace (inmutable en `calculation_logs`).
- **Signed/Closed** congela el trabajo (solo lectura / export).

---

## 3. Flujo canónico (todas las operaciones comparten esta espina)

1. **Cover / Job Setup** — fuente maestra: cliente, tipo de operación, producto(s)/grados, partes, puerto, fechas.
2. **Perfiles** — seleccionar/crear vessel · barge · terminal · perfil de **cálculo** (norma/estándar) · perfil de **tolerancia**. Aquí se definen los tanques (con flag `is_bunker`) y se registra la **fecha/referencia de la tabla de calibración** usada.
3. **Key Meeting** — checklist pre-operación parametrizado por tipo (ver §6).
4. **Mediciones (Opening / Before)** — captura pareada por tanque; para BQS, **comparación con logbook/ROB**.
5. **Operación en curso** — (según tipo) seguimiento; intermediate ullages si aplica.
6. **Mediciones (Closing / After)** — captura final por tanque.
7. **Cálculo + Trace** — el kernel calcula TOV→GOV→GSV→MT (aire/vacío); cada número explicable.
8. **Comparación** — suma por fuente y compara Vessel vs Barge vs Shore vs BDN/BL con tolerancia en capas.
9. **Discrepancias** — si excede tolerancia → NOAD / LOP.
10. **Reportes** — VMR/BMR/Shore/Summary/SOF (+ otros) con branding.
11. **Export** — PDF / XLSX / JSON técnico. Firma.

---

## 4. Flujo BQS (MVP) — paso a paso

```
1. Cover
   └─ Cliente, "Bunker Quantity Survey", buque, grados (HSFO/VLSFO/MGO…), fecha, puerto, partes.

2. Perfiles
   ├─ Vessel profile (o barcaza): lista de tanques de bunker (is_bunker = true).
   ├─ Calculation profile: norma/estándar + versión de tabla ASTM aplicable.
   └─ Tolerance profile: ISO default + capas (comprador/suplidor/inspección/contrato).
       └─ Registrar fecha/ref de la tabla de calibración usada.

3. Key Meeting (ligero para bunker; ver §6)
   └─ Confirmar grados, tanques a usar, ratas, ROB esperado.

4. Medición inicial (Opening / Before)
   ├─ Por tanque: sounding/ullage, temperatura, densidad observada, agua libre.
   ├─ Ingresar VOLUMEN de la tabla (la app no calcula la tabla).
   └─ COMPARAR vs logbook (ROB declarado por el Jefe de Máquinas)  ◄── clave
       └─ Si Δ > tolerancia (~0.5%): alerta → re-medición / nota.

5. (Transferencia de bunker si aplica)

6. Medición final (Closing / After) — misma captura por tanque.

7. Cálculo (kernel Rust)
   └─ TOV → (−FW) → GOV → ×VCF → GSV → ×densidad/WCF → MT aire y vacío + TRACE.

8. Comparación
   └─ Vessel Received vs Barge Delivered vs BDN  → diferencias vs tolerancia.

9. Discrepancias → NOAD / LOP si corresponde.

10. Reporte → BMR (Bunker) / Summary → PDF/XLSX con branding → Firma.
```

**Bloques especiales BQS** (`00-ULTRAPLAN §2`): densidad única por fuente; MT aire **y** vacío
(oficial = aire); trim **Applied/Not Applied** (barcazas normalmente Not Applied); bloque
**"Quantity Transferred"**.

---

## 5. Variaciones por tipo de operación

| Operación | Qué cambia respecto a la espina canónica |
|---|---|
| **Terminal (Load/Discharge)** | + medición **Shore** (tanques de tierra, meters), techo flotante, shell correction, **Pipeline reconciliation**, line displacement. Key Meeting **extenso** (certificados, ESD, MAWP, hose sizes). |
| **STS (Ship-to-Ship)** | Dos buques (Mother/Shuttle). Key Meeting STS: fenders, francobordo, clima, STS Superintendent. VEF limitado (sin shore figures). |
| **Barge-Tow** | Barcaza ↔ buque/terminal; trim normalmente Not Applied. |
| **LPG / Gaseros** | Carga **bifásica** (líquido + vapor): captura nivel + **presión + temperatura**; la **masa de vapor cuenta**; CTMS (ver `research/tanques-por-tipo-de-buque.md`). |
| **Draft Survey** | **No** usa volumen×densidad: cálculo por **desplazamiento/hidrostáticas** (drafts F/M/A, correcciones, deductibles). Ruta de kernel separada. |
| **Pipeline / Sampling** | Reconciliation de línea / muestreo + calidad (previous cargoes, tank inspection, checklist). |

---

## 6. Sub-flujo: Key Meeting (parametrizado)

```
Seleccionar tipo de operación  ──►  se activan/desactivan secciones
        │
        ├─ Comunes: cargo (grado, densidad, T), tanques nominados + secuencia, OBQ/ROB,
        │            ratas (initial/max/topping), MAWP, hose sizes, VHF (primario+backup).
        ├─ Ship–Terminal / Barge–Terminal: + certificados (presión de línea, calibración meters/
        │            tanques tierra), ESD integrado + test, PERC, line displacement, vapour recovery.
        └─ STS: + fenders, francobordo (Δ máx), umbral de clima, STS Superintendent. ESD limitado.
        │
        ▼
Validaciones (topping<max; cert. vigentes; ESD probado antes de operar; firmas ≥ 2)
        ▼
Firma digital del registro  ──►  queda enlazado al trabajo
```
Detalle de campos: `research/key-meeting-pre-transfer.md §5`.

---

## 7. Sub-flujo: captura de mediciones (vista pareada)

```
Una FILA por tanque, columnas horizontales:
[ Tanque | Opening sounding/ullage | T | densidad | FW | Vol(tabla) | … | Closing … ]
        │
        ├─ Validación en vivo: rango plausible, faltantes, unidades, monotonicidad.
        ├─ Bunker: columna extra "ROB logbook" + Δ con alerta de tolerancia.
        └─ Recalcule en vivo (kernel) muestra TOV/GOV/GSV/MT por tanque + total por fuente.
```

---

## 8. Sub-flujo: comparación y discrepancias

```
Totales por fuente (Vessel / Barge / Shore / BDN-BL)
        ▼
Δ entre fuentes  vs  Tolerancia en capas (ISO + comprador/suplidor/inspección/contrato)
        ├─ Dentro de tolerancia  ──► OK (se documenta igual)
        └─ Fuera de tolerancia   ──► proponer NOAD / LOP (con motivo) ──► al reporte
```

---

## 9. Sub-flujo: reporte, firma y export

```
Elegir reporte(s) (VMR/BMR/Shore/Summary/SOF/…)
        ▼
Render con branding/tema (logo, encabezado/pie, metadatos)
        ▼
Previsualizar  ──►  Firmar (firma electrónica configurable)
        ▼
Export: PDF · XLSX · JSON técnico (trace)  ──►  estado del trabajo = Reported/Signed
```

---

## 10. Flujos de error / validación (transversales)

- **Entrada inválida** (rango/unidad/faltante) → bloqueo en vivo en la celda, sin avanzar.
- **Sin densidad válida** → el kernel **falla fuerte** (no produce cantidad oficial).
- **Discrepancia logbook/ROB > tolerancia** → alerta, sugiere re-medición.
- **Cálculo no exportable** (p. ej. WCF→MT placeholder pendiente) → se marca "no oficial" hasta resolver hardening (`03-TRD §4.3`).
- **Trabajo Signed/Closed** → solo lectura; cambios requieren clonar/reabrir (auditado).

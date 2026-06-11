# Investigación — Grados de combustible marino (catálogo)

> Para implementar bien el dato **"Grade"** que teclea el surveyor: cuántos grados hay,
> sus rangos de densidad, y cómo se relacionan con el cálculo ASTM. Datos genéricos del
> dominio (ISO 8217 + nombres comerciales); **no** hay datos de clientes aquí.
> Fuente del catálogo en código: `ui/src/data/grades.ts`.

## Cómo se nombran los combustibles marinos

Hay **dos ejes** que en la práctica se mezclan:

1. **Grado técnico (ISO 8217)** — la norma define familias por destilado/residual:
   - **Destilados (DM):** `DMX`, `DMA`, `DMZ`, `DMB`.
   - **Residuales (RM):** `RMA 10`, `RMB 30`, `RMD 80`, `RME 180`, `RMG 180/380/500/700`, `RMK 380/500/700`.
2. **Nombre comercial por azufre** (lo que más se ve en BDN/operación tras IMO 2020):
   - **HSFO** (High Sulphur Fuel Oil, ≤3.5 % S) — residual, requiere scrubber.
   - **VLSFO** (Very Low Sulphur, ≤0.50 % S) — residual/híbrido, el "IMO 2020".
   - **ULSFO** (Ultra Low Sulphur, ≤0.10 % S) — para zonas **ECA/SECA**.
   - **LSMGO** (Low Sulphur Marine Gas Oil, ≤0.10 % S) — destilado.
   - **MGO / MDO** — destilados (gas oil / diesel oil).

Por eso el catálogo incluye **ambos**: los comerciales (lo común) y los grados ISO (para añadir).

## Rangos de densidad @ 15 °C (kg/L)

Límites **máximos** de la norma ISO 8217 y rangos **típicos** observados en puerto:

| Combustible | Tipo | ISO 8217 | S máx | Densidad típica | Máx norma |
|---|---|---|---|---|---|
| VLSFO | residual | ~RMG 380 | 0.50 % | 0.920 – 0.970 | 0.991 |
| HSFO | residual | RMG/RMK | 3.50 % | ~0.985 | 0.991 (RMG) / 1.010 (RMK) |
| ULSFO | residual/híbrido | RM (ECA) | 0.10 % | variable, < VLSFO | 0.991 |
| LSMGO | destilado | DMA | 0.10 % | ~0.857 | 0.890 |
| MGO | destilado | DMA | — | 0.820 – 0.890 | 0.890 |
| MDO | destilado | DMB | — | 0.860 – 0.900 | 0.900 |
| DMX | destilado | DMX | — | 0.800 – 0.860 | 0.860 |
| RMK 500 | residual | RMK | — | ~1.000 | 1.010 |

(El surveyor **siempre introduce la densidad medida real**; estos rangos sirven para el
selector y para avisar de valores fuera de rango, no para sustituir la medición.)

## Relación con el cálculo (ASTM D1250-80, Tabla 54B)

El VCF **no** depende del nombre del grado sino de la **densidad@15**. El kernel elige el
grupo 54B por densidad (kg/m³):

| Grupo 54B | Banda densidad (kg/m³) | Combustibles marinos que caen aquí |
|---|---|---|
| Gasolines | 653.0 – 770.3 | (naftas; no bunker) |
| Transition | 770.3 – 787.5 | — |
| Jet/Kerosene | 787.5 – 838.7 | destilados muy ligeros (DMX, MGO ligero) |
| **Fuel Oils** | **838.7 – 1075.0** | **casi todo el bunker** (VLSFO/HSFO/ULSFO/MDO y MGO ≥ 0.8387) |

**Implicación:** prácticamente todos los grados marinos (densidad ≥ 0.8387 kg/L) usan el
grupo **Fuel Oils** (K0=186.9696, K1=0.4862). Por eso las hojas de campo que "fijan" esas
constantes para todos los grados suelen acertar — y nuestro kernel, que elige por densidad,
coincide. Solo los destilados muy ligeros (< 0.8387) caen en *Jet fuels*, y ahí el kernel
es **más correcto** que una hoja que fije Fuel Oils.

> Crudo → **Tabla 54A** (otro juego de constantes). En el catálogo, `CRUDE` marca `astmTable: 54A`.

## Decisión de implementación

- Catálogo en `ui/src/data/grades.ts`: **comunes** (`common: true`) en el selector por
  defecto; el resto disponible para añadir. El campo Grade sigue siendo **texto libre**
  (datalist), así que se puede teclear cualquier grado nuevo.
- A futuro: gestionar el catálogo desde ajustes (white-label) y validar densidad vs. rango
  del grado elegido.

## Fuentes

- [ISO 8217 specifications — Seven Ocean Bunkering](https://sevenoceanbunkering.com/guides/iso-8217-specifications/)
- [ISO Petroleum Marine Fuels — DieselNet](https://dieselnet.com/standards/inter/fuel_marine.php)
- [VLSFO/ULSFO properties study — MDPI J. Mar. Sci. Eng.](https://www.mdpi.com/2077-1312/10/12/1828)
- [Bunker fuel terminology — Bunker Index](https://bunkerindex.com/articles/article.php?a=21675)

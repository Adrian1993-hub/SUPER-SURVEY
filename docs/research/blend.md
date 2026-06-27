# Blend (commingling) — Fuel Oil Blend Program (worksheet del cliente)

> Material del cliente (`Blend_Program.xls`, hoja `Blend`, 38×16). Mezcla hasta
> **8 parcelas** por volumen → slate de propiedades del producto. Las columnas
> B‑I son inputs por componente (datos dummy 4.6); **K‑P son los índices de
> mezcla**; **J = blend**. Implementado en `blend.rs` (decimal‑exacto).

## 1. Reglas de mezcla (analizadas + investigadas)

| Propiedad | Regla | Fórmula | Verificación |
|---|---|---|---|
| Volumen % | lineal por volumen | `vᵢ/Σv` | B12 ✓ |
| **API / densidad** (`**`) | mezcla de densidades (volumétrica) | `SG=Σfᵥᵢ·SGᵢ`, `SG=141.5/(131.5+API)`, `API=141.5/SG−131.5` | **J13=33.5347 ✓** (col K = SG) |
| **Viscosidad** cSt (`*`) | **Refutas** (índice doble‑log) | `VBI=14.534·ln(ln(ν+0.8))+10.975` → mezclar → invertir | col L = `ln(ln(ν+0.8))` ✓ |
| **Flash** °F | índice de mezcla (no lineal) | `FPI=10^(−6.1188+4345.2/(T+383))` → mezclar → invertir | inverso confirma 4345.2 / 6.1188 |
| **Pour** °F | índice de mezcla (no lineal) | `PPI=3 262 000·((T+460)/1000)^12.5` → mezclar → invertir | exp 12.5 (cotejar vs hoja) |
| Azufre / Agua / Sed | lineal ponderado (por volumen) | `Σfᵥᵢ·xᵢ` | **J16=4.429164 ✓** (volumen) |
| BTU / Heat comb. | aproximación | ASTM **D4868 / D240** | nota de la hoja |
| cSt↔SFS | conversión | ASTM **D2161** | (converter de la hoja) |

Todas las fracciones son **por volumen** (convención de la hoja: el azufre cuadra
exacto volumétrico y la mezcla de densidades es inherentemente volumétrica).
Refutas es canónicamente *por peso*; con densidades similares la diferencia es
mínima — un toggle peso/volumen queda como opción futura.

## 2. Anclas de validación (en `blend.rs` tests)

- **API** 30/40 API 50/50 vol → **34.84985** ; worksheet vol 546.5/225, API 33.1/34.6 → **33.5347** (= J13).
- **Refutas** 10/100 cSt 50/50 → **26.672406** cSt.
- **Flash** 150/200 °F 50/50 → **164.9125** °F (no lineal).
- **Pour** 20/40 °F 50/50 → **31.1616** °F (no lineal).
- **Azufre** 4.4/4.5 (546.5/225) → **4.429164** (= J16).
- Identidad de 1 componente: devuelve sus propias propiedades.

## 3. Implementación

- `blend.rs`: `blend_fuel_oil(components, decimals, rounding) → BlendResult`
  (total vol, API, SG, visc cSt, azufre, agua, sed, flash, pour, fracciones
  vol%/peso%). `ln`/`exp`/`powd`/`log10` vía feature `maths` de `rust_decimal`
  (decimal‑determinista, sin `f64`). DTO string‑in/out + traza EXPORT.
- **Pendiente / refinamientos**: cotejar exponente pour (12.5) y constantes
  flash contra las celdas de fórmula de la hoja; conversor cSt↔SFS (ASTM D2161);
  propiedades extra (ash, CCR, asfaltenos, V/Al/Si/Na — lineales); manejo de
  propiedad ausente por componente (renormalizar fracciones); BTU (D4868/D240).

## 4. Fuentes

Refutas: [lube‑media PDF](https://www.lube-media.com/wp-content/uploads/2017/11/Lube-Tech093-ViscosityBlendingEquations.pdf) ·
Flash: [Brewiki](https://www.brewiki.org/refinery-distillation/flash-point-blending.html) ·
Pour: [PSU FSC432](https://courses.ems.psu.edu/fsc432/content/pour-point-blending).

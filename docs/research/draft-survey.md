# Draft Survey (granel) + reconciliación de tierra — análisis MV YUNNAN

> De 4 archivos reales (MV YUNNAN, POTASH, descarga en Balboa): `Master Template.docx`,
> `INITIAL_DS.pdf`, el cálculo `…YUNNAN….xlsx` y el `DS_REPORT.pdf`. Anonimizar antes de usar números.
> Es una **operación nueva**: cantidad de carga por **desplazamiento** (calados), no por tanques.

## 1. Qué es
Draft survey = se determina la carga (granel seco: potasa, maíz, etc.) por la **diferencia de
desplazamiento** del buque entre el inicial y el final, descontando pesos no‑carga (bunkers, lastre,
agua). La "parte de tierra" es el **conteo por báscula de camiones** que reciben la descarga; se
concilia DS vs B/L vs báscula.

## 2. Método de cálculo (del DS_REPORT, con anclas YUNNAN)
Por cada condición (inicial/final), a partir de **6 calados** (proa/medio/popa × babor/estribor):

1. **Mean of Means** (cuarto de medias) de los calados corregidos a perpendiculares.
   - Ej. final: Mid mean 7.714, Mean of Means 7.719; Apparent Trim (stern) 0.175 m; LBM 157.800 m.
2. **Displacement** a ese calado, interpolado de las **tablas hidrostáticas del buque** (en `Hoja1`,
   7294 fórmulas = la tabla específica del barco) → con TPC, LCF, MTC.
3. **1ª corrección por trim** = `Trim·LCF·TPC·100 / LBM` (ej. final 0.274).
4. **2ª corrección por trim** = `Trim²·(ΔMTC)·50 / LBM` (usa `dm/dz`=47.285, `mtc@QM-0.5m`=601.685; ej. 0.514).
5. **Displacement corrected for Trim** (ej. 34,190.167).
6. **Corrección por densidad** = `Disp·(ρ_real − ρ_tabla)/ρ_tabla` (ρ 1.0150 → −333.562).
7. **Displacement corrected for Density** (ej. 33,856.605).
8. **Pesos no‑carga (deductibles)**: Fuel Oil, Diesel Oil, Lube Oil, Fresh Water, Ballast, Others.
   Total final 4,074.912 (inicial 4,079.463).
9. **Net Displacement** = `Disp(densidad) − ΣNo‑carga` → inicial 33,862.480, final 29,781.693.
10. **Cargo = Net Disp inicial − Net Disp final** = 33,862.480 − 29,781.693 = **4,080.787 MT** ✅
    (B/L 4,080 → +0.787 / +0.02 %).

Verificaciones cruzadas del reporte:
- `Apparent cargo on board = Net Disp − Light Ship − Constant` = 33,862.480 − 9,440.070 − 362.000 = 24,060.410 ✅
- `Apparent Overage/(Shortage) = Apparent − Manifested` = 24,060.410 − 24,080.000 = −19.590 ✅

## 3. La parte de TIERRA (lo que el cliente resaltó) — `CONT_TOTAL`
Control de despacho **camión por camión** (101 viajes): nº, inspector, camión/remolque, fecha,
entrada/salida, factura, **bodega**. Totaliza por bodega (BOD#1..#5) y reconcilia:
- **B/L** 4,080 vs **Despachado** 4,064.16 → DIF −15.84 MT; % retirado por bodega; saldo pendiente.
- Conversión a TM/KG/Q(quintales 22.0462)/LBS por bodega y promedio por viaje (~39–41 MT/viaje).
- **Shore Scale Quantity = 4,064.160 MT** (suma de básculas).

## 4. Reconciliación final (DS_REPORT p3/p5)
- **Draft Survey (DS)**: 4,080.787 MT.
- **Shore Scale (tierra)**: 4,064.160 MT.
- **Diferencia DS vs báscula**: 16.627 MT.
- Certificado de peso: la cantidad oficial = **DS figure** (báscula como referencia).

## 5. Implicaciones para SUPER-SURVEY
**Operación nueva `draft-survey`** (granel) — distinta del cálculo volumétrico (ASTM). Piezas:
1. **Kernel `draft.rs`** (NUEVO): mean-of-means, 1ª/2ª corrección de trim, corrección de densidad,
   deductibles, Net Displacement, cargo por diferencia. **Hay un cálculo Draft validado en el
   prototipo .NET/WPF** (`reference/dotnet-wpf-prototype`) → portar y validar contra YUNNAN (4,080.787).
2. **Modelo de tablas hidrostáticas por buque** (Displacement/TPC/LCF/MTC vs calado) — dato específico
   del barco que el surveyor carga; interpolación en el kernel.
3. **Parte de tierra**: tally por camión → shore quantity (suma + conciliación por bodega).
4. **Plantilla de reporte** draft-survey: condición inicial/final, deductibles, Net Disp, cargo, y la
   reconciliación DS vs B/L vs báscula (encaja en el motor `SmartReport` como secciones nuevas).

**Recomendación:** portar el `draft.rs` desde el prototipo .NET (ya validado) y anclar a YUNNAN; luego
el tally de tierra y la plantilla. Es autocontenido y de alto valor (operación de granel completa).

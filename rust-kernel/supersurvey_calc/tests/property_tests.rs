//! Property-based tests (proptest) para el kernel de cálculo.
//!
//! Las 177 pruebas por anclas fijan PUNTOS conocidos; estas fijan IDENTIDADES
//! matemáticas que deben valer para TODO el dominio (no solo los puntos medidos):
//! round-trips de conversión, monotonicidad físico-química, y la media ponderada
//! de un blend acotada por sus extremos. Un caso borde entre anclas que rompiera
//! una de estas identidades saldría aquí.
//!
//! Tolerancia: los round-trips pasan por constantes decimales exactas y una
//! división, así que el error es del orden de la precisión de `Decimal` (~1e-24).
//! Comparamos con holgura RELATIVA de 1e-10 — imposible de alcanzar por el
//! redondeo de `Decimal`, pero cualquier bug real (error de factor/unidad) la
//! excede por órdenes de magnitud.

use proptest::prelude::*;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use supersurvey_calc::prelude::*;

/// Igualdad aproximada con holgura relativa (1e-10 · max(1, |b|)).
fn approx(a: Decimal, b: Decimal) -> bool {
    let diff = (a - b).abs();
    let scale = b.abs().max(Decimal::ONE);
    diff <= scale * dec!(0.0000000001)
}

fn d(x: f64) -> Decimal {
    Decimal::try_from(x).expect("finite bounded f64 → Decimal")
}

// ---------------------------------------------------------------------------
// Round-trips de conversión de unidades: convertir ida y vuelta = identidad.
// ---------------------------------------------------------------------------

proptest! {
    #[test]
    fn length_roundtrip_m_ft(v in 0.001f64..100_000.0) {
        let m = LengthValue::new(d(v), LengthUnit::Meters);
        let ft = convert_length(m.clone(), LengthUnit::Feet).unwrap();
        let back = convert_length(ft, LengthUnit::Meters).unwrap();
        prop_assert!(approx(back.value, m.value), "m→ft→m: {} vs {}", back.value, m.value);
    }

    #[test]
    fn volume_roundtrip_m3_bbl(v in 0.001f64..1_000_000.0) {
        let m3 = VolumeValue::new(d(v), VolumeUnit::CubicMeters);
        let bbl = convert_volume(m3.clone(), VolumeUnit::UsBarrels).unwrap();
        let back = convert_volume(bbl, VolumeUnit::CubicMeters).unwrap();
        prop_assert!(approx(back.value, m3.value), "m³→bbl→m³: {} vs {}", back.value, m3.value);
    }

    #[test]
    fn weight_roundtrip_kg_lb(v in 0.001f64..10_000_000.0) {
        let kg = WeightValue::new(d(v), WeightUnit::Kilograms);
        let lb = convert_weight(kg.clone(), WeightUnit::Pounds).unwrap();
        let back = convert_weight(lb, WeightUnit::Kilograms).unwrap();
        prop_assert!(approx(back.value, kg.value), "kg→lb→kg: {} vs {}", back.value, kg.value);
    }

    #[test]
    fn temperature_roundtrip_c_f(v in -100.0f64..500.0) {
        let c = TemperatureValue::new(d(v), TemperatureUnit::Celsius);
        let f = convert_temperature(c.clone(), TemperatureUnit::Fahrenheit).unwrap();
        let back = convert_temperature(f, TemperatureUnit::Celsius).unwrap();
        prop_assert!(approx(back.value, c.value), "C→F→C: {} vs {}", back.value, c.value);
    }

    #[test]
    fn density_mass_roundtrip_m3_litre(v in 100.0f64..1_500.0) {
        let a = DensityValue::new(d(v), DensityUnit::KgPerCubicMeter);
        let b = convert_density(a.clone(), DensityUnit::KgPerLitre).unwrap();
        let back = convert_density(b, DensityUnit::KgPerCubicMeter).unwrap();
        prop_assert!(approx(back.value, a.value), "kg/m³→kg/L→kg/m³: {} vs {}", back.value, a.value);
    }
}

// ---------------------------------------------------------------------------
// Gravedad API ↔ SG 60/60: round-trip y monotonicidad física.
// ---------------------------------------------------------------------------

proptest! {
    #[test]
    fn api_sg_roundtrip(api in 5.0f64..80.0) {
        let a = d(api);
        let sg = api_to_sg(a).unwrap();
        let back = sg_to_api(sg).unwrap();
        prop_assert!(approx(back, a), "API→SG→API: {} vs {}", back, a);
    }

    /// Más grados API = producto más liviano = menor SG. Estrictamente decreciente.
    #[test]
    fn api_to_sg_is_strictly_decreasing(a1 in 5.0f64..80.0, a2 in 5.0f64..80.0) {
        prop_assume!((a1 - a2).abs() > 0.01); // dos API distinguibles
        let (lo, hi) = if a1 < a2 { (d(a1), d(a2)) } else { (d(a2), d(a1)) };
        let sg_lo = api_to_sg(lo).unwrap();
        let sg_hi = api_to_sg(hi).unwrap();
        prop_assert!(sg_lo > sg_hi, "API {} SG {} debería ser > API {} SG {}", lo, sg_lo, hi, sg_hi);
    }
}

// ---------------------------------------------------------------------------
// Blend: la densidad mezclada es una media ponderada por volumen.
// ---------------------------------------------------------------------------

fn parcels_strategy() -> impl Strategy<Value = Vec<(f64, f64)>> {
    // (volumen m³ > 0, densidad kg/m³ en rango de productos de petróleo)
    prop::collection::vec((1.0f64..50_000.0, 600.0f64..1_100.0), 1..8)
}

proptest! {
    /// La densidad del blend cae SIEMPRE entre la mínima y la máxima de las
    /// parcelas (propiedad de cualquier media ponderada). Holgura absoluta
    /// diminuta por el redondeo de la división final.
    #[test]
    fn blend_density_within_parcel_extremes(raw in parcels_strategy()) {
        let parcels: Vec<BlendParcel> = raw.iter()
            .map(|&(v, r)| BlendParcel { volume_m3: d(v), rho15_kg_m3: d(r) })
            .collect();
        let min_rho = parcels.iter().map(|p| p.rho15_kg_m3).min().unwrap();
        let max_rho = parcels.iter().map(|p| p.rho15_kg_m3).max().unwrap();

        let blend = blend_density(&parcels).unwrap();
        let slack = dec!(0.000001);
        prop_assert!(blend.rho15_kg_m3 >= min_rho - slack, "blend {} < min {}", blend.rho15_kg_m3, min_rho);
        prop_assert!(blend.rho15_kg_m3 <= max_rho + slack, "blend {} > max {}", blend.rho15_kg_m3, max_rho);
    }

    /// El volumen total del blend es la suma EXACTA de los volúmenes (sin holgura).
    #[test]
    fn blend_total_volume_is_exact_sum(raw in parcels_strategy()) {
        let parcels: Vec<BlendParcel> = raw.iter()
            .map(|&(v, r)| BlendParcel { volume_m3: d(v), rho15_kg_m3: d(r) })
            .collect();
        let expected: Decimal = parcels.iter().map(|p| p.volume_m3).sum();
        let blend = blend_density(&parcels).unwrap();
        prop_assert_eq!(blend.total_volume_m3, expected);
    }

    /// Consistencia interna: densidad_blend × volumen_total ≈ masa_total.
    #[test]
    fn blend_mass_equals_density_times_volume(raw in parcels_strategy()) {
        let parcels: Vec<BlendParcel> = raw.iter()
            .map(|&(v, r)| BlendParcel { volume_m3: d(v), rho15_kg_m3: d(r) })
            .collect();
        let blend = blend_density(&parcels).unwrap();
        let recomputed = blend.rho15_kg_m3 * blend.total_volume_m3;
        prop_assert!(approx(recomputed, blend.total_mass_kg),
            "ρ×V {} vs masa {}", recomputed, blend.total_mass_kg);
    }

    /// Un blend de parcelas con densidad idéntica devuelve esa densidad.
    #[test]
    fn blend_of_identical_density_is_that_density(
        rho in 600.0f64..1_100.0,
        vols in prop::collection::vec(1.0f64..50_000.0, 1..8),
    ) {
        let r = d(rho);
        let parcels: Vec<BlendParcel> = vols.iter()
            .map(|&v| BlendParcel { volume_m3: d(v), rho15_kg_m3: r })
            .collect();
        let blend = blend_density(&parcels).unwrap();
        prop_assert!(approx(blend.rho15_kg_m3, r), "blend {} vs ρ {}", blend.rho15_kg_m3, r);
    }
}

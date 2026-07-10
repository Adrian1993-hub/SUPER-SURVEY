//! LNG (liquefied natural gas) custody transfer — quantity & energy.
//!
//! LNG is NOT traded by volume or by mass: it is traded by **energy** (MMBtu /
//! MWh). The delivered quantity is *calculated* from the molar composition, not
//! measured directly. This is a different family from the petroleum tables
//! (ASTM D1250) and from COSTALD-for-LPG.
//!
//! Chain (see docs/research/lng-discharge.md):
//!   composition (Xi) + temperature ─► DENSITY  D            (revised Klosek–McKinley)
//!   composition (Xi)               ─► GHV mass Hm, GHV vol Hv, Wobbe  (ISO 6976 / GPA 2172)
//!   volume before − after (CTS)    ─► VOLUME delivered  V
//!   MASS   = V · D
//!   ENERGY gross = MASS · Hm ;  ENERGY net = gross − Qr (vapor displaced) − Qf (BOG to machines)
//!
//! Method — revised Klosek–McKinley (RKM), GIIGNL LNG Custody Transfer Handbook:
//!   D = Σ(Xi·Mi) / [ Σ(Xi·Vi) − Xm·C ]
//!   C = K1 + (K2 − K1)·(XN2 / 0.0425)
//! where Vi (molar volume of the pure liquid at T), K1 and K2 are read from the
//! handbook tables by temperature and mixture molar mass. Uncertainty ≈ ±0.1 %
//! for T ≈ 93–133 K, molar mass 16–30, N₂/butane < 5 %.
//!
//! Policy (identical to `astm`/`costald`): pure `Decimal` end to end, no `f64`,
//! no `maths` feature — official numbers must not depend on a float libm. Only
//! final figures are rounded by the caller; intermediates stay full-precision.
//!
//! Anchor: a real LNG discharge (reference vessel, a Central American terminal —
//! anonymized) with composition CH₄ 97.98 / C₂ 1.78 / C₃ 0.15 / iC₄ 0.03 /
//! nC₄ 0.02 / N₂ 0.04 [mol%] at −159.3 °C, K1 = 0.000071, K2 = 0.000165 gives
//! molar mass 16.3601 kg/kmol and DENSITY 426.0 kg/m³; delivered volume
//! 153 848.5 m³ → mass 65 539 461 kg; gross energy 3 440 402 MMBtu, net
//! 3 424 985 MMBtu (all reconciled cell-by-cell in the tests below).
//!
//! Scope of THIS module: the calculation core is complete and anchor-tested —
//! molar mass from composition, RKM density from the mixture sums, and the
//! mass/energy chain. Turning a raw composition + temperature into Σ(Xi·Vi), K1
//! and K2 requires transcribing the GIIGNL Vi(T)/K1/K2 tables (and the ISO 6976
//! Hi/Hvi/√bi tables for GHV-from-composition); that data step is tracked
//! separately (F-LNG-1b) and must cite its source — never fabricated.

use crate::error::{KernelError, KernelErrorCode, KernelResult};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;

/// Nitrogen reference mole fraction in the RKM correction (GIIGNL RKM).
const RKM_N2_REF: Decimal = dec!(0.0425);

/// Pounds per kilogram (exact avoirdupois: 1 kg = 2.2046226218 lb). The GIIGNL
/// worksheet commonly rounds this to 2.2046; the caller passes the factor so a
/// report can reproduce its contractual convention exactly.
pub const LB_PER_KG: Decimal = dec!(2.2046226218);

// ---------------------------------------------------------------------------
// Component molar masses Mi (kg/kmol) — ISO 6976:2016, Table (also GPA 2145).
// These are physical constants; they are cited, never invented.
// ---------------------------------------------------------------------------
const M_METHANE: Decimal = dec!(16.04246);
const M_ETHANE: Decimal = dec!(30.06904);
const M_PROPANE: Decimal = dec!(44.09562);
const M_ISO_BUTANE: Decimal = dec!(58.1222);
const M_N_BUTANE: Decimal = dec!(58.1222);
const M_ISO_PENTANE: Decimal = dec!(72.14878);
const M_N_PENTANE: Decimal = dec!(72.14878);
const M_NEO_PENTANE: Decimal = dec!(72.14878);
const M_HEXANE_PLUS: Decimal = dec!(86.17536);
const M_NITROGEN: Decimal = dec!(28.0134);
const M_CARBON_DIOXIDE: Decimal = dec!(44.0095);
const M_OXYGEN: Decimal = dec!(31.9988);

/// LNG molar composition. Values may be given as percentages (Σ ≈ 100) or as
/// fractions (Σ ≈ 1); they are normalized to fractions internally, so either
/// convention is accepted. Components absent from a cargo are simply zero.
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct LngComposition {
    pub methane: Decimal,
    pub ethane: Decimal,
    pub propane: Decimal,
    pub iso_butane: Decimal,
    pub n_butane: Decimal,
    pub iso_pentane: Decimal,
    pub n_pentane: Decimal,
    pub neo_pentane: Decimal,
    pub hexane_plus: Decimal,
    pub nitrogen: Decimal,
    pub carbon_dioxide: Decimal,
    pub oxygen: Decimal,
}

impl LngComposition {
    /// (component molar mass, raw mole value) pairs, in report order.
    fn pairs(&self) -> [(Decimal, Decimal); 12] {
        [
            (M_METHANE, self.methane),
            (M_ETHANE, self.ethane),
            (M_PROPANE, self.propane),
            (M_ISO_BUTANE, self.iso_butane),
            (M_N_BUTANE, self.n_butane),
            (M_ISO_PENTANE, self.iso_pentane),
            (M_N_PENTANE, self.n_pentane),
            (M_NEO_PENTANE, self.neo_pentane),
            (M_HEXANE_PLUS, self.hexane_plus),
            (M_NITROGEN, self.nitrogen),
            (M_CARBON_DIOXIDE, self.carbon_dioxide),
            (M_OXYGEN, self.oxygen),
        ]
    }

    /// Sum of the raw mole values (100 for a % basis, 1 for a fraction basis).
    pub fn total(&self) -> Decimal {
        self.pairs().iter().map(|(_, x)| *x).sum()
    }

    /// Mixture molar mass M = Σ(Xi·Mi) [kg/kmol], with Xi normalized to Σ = 1.
    /// Errors if the composition is empty (nothing to normalize).
    pub fn molar_mass(&self) -> KernelResult<Decimal> {
        let total = self.total();
        if total.is_zero() {
            return Err(KernelError::with_field(
                KernelErrorCode::ComparisonInputInvalid,
                "LNG composition is empty (all components zero)",
                "composition",
            ));
        }
        let weighted: Decimal = self.pairs().iter().map(|(mi, x)| *mi * *x).sum();
        Ok(weighted / total)
    }

    /// Normalized methane mole fraction (0..1).
    pub fn methane_fraction(&self) -> KernelResult<Decimal> {
        self.normalized(self.methane)
    }

    /// Normalized nitrogen mole fraction (0..1).
    pub fn nitrogen_fraction(&self) -> KernelResult<Decimal> {
        self.normalized(self.nitrogen)
    }

    fn normalized(&self, x: Decimal) -> KernelResult<Decimal> {
        let total = self.total();
        if total.is_zero() {
            return Err(KernelError::with_field(
                KernelErrorCode::ComparisonInputInvalid,
                "LNG composition is empty (all components zero)",
                "composition",
            ));
        }
        Ok(x / total)
    }
}

/// Revised Klosek–McKinley density from the already-summed mixture terms.
///
/// This is the exact RKM arithmetic core:
///   C     = K1 + (K2 − K1)·(XN2 / 0.0425)
///   Vmix  = Σ(Xi·Vi) − Xm·C
///   D     = Σ(Xi·Mi) / Vmix                      [kg/m³]
///
/// `sum_xi_vi`, `k1` and `k2` come from the GIIGNL handbook tables at the
/// cargo temperature (the from-composition lookup is F-LNG-1b). Keeping this
/// core separate lets the formula be validated independently of the tables.
pub fn rkm_density_from_sums(
    sum_xi_mi: Decimal,
    sum_xi_vi: Decimal,
    x_methane: Decimal,
    x_nitrogen: Decimal,
    k1: Decimal,
    k2: Decimal,
) -> KernelResult<Decimal> {
    let c = k1 + (k2 - k1) * (x_nitrogen / RKM_N2_REF);
    let vmix = sum_xi_vi - x_methane * c;
    if vmix.is_zero() {
        return Err(KernelError::with_field(
            KernelErrorCode::DivisionByZero,
            "RKM molar volume evaluated to zero",
            "sum_xi_vi",
        ));
    }
    Ok(sum_xi_mi / vmix)
}

/// Gross mass delivered [kg] = volume [m³] · density [kg/m³].
pub fn gross_mass_kg(volume_m3: Decimal, density_kg_m3: Decimal) -> Decimal {
    volume_m3 * density_kg_m3
}

/// Gross energy [MMBtu] = mass [kg] · lb/kg · GHV(mass) [Btu/lb] / 1e6.
pub fn gross_energy_mmbtu(mass_kg: Decimal, ghv_mass_btu_lb: Decimal, lb_per_kg: Decimal) -> Decimal {
    mass_kg * lb_per_kg * ghv_mass_btu_lb / dec!(1000000)
}

/// Net energy delivered = gross − vapor displaced (Qr) − BOG to machines (Qf).
pub fn net_energy(gross: Decimal, vapor_displaced: Decimal, machine_gas: Decimal) -> Decimal {
    gross - vapor_displaced - machine_gas
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Composition of the reference discharge, in mol% (Σ = 100).
    fn reference_composition() -> LngComposition {
        LngComposition {
            methane: dec!(97.98),
            ethane: dec!(1.78),
            propane: dec!(0.15),
            iso_butane: dec!(0.03),
            n_butane: dec!(0.02),
            nitrogen: dec!(0.04),
            ..Default::default()
        }
    }

    fn approx(a: Decimal, b: Decimal, tol: Decimal) {
        let d = (a - b).abs();
        assert!(d <= tol, "expected {b}, got {a} (|Δ|={d} > {tol})");
    }

    #[test]
    fn molar_mass_matches_reference() {
        // Reference report molar mass Σ(Xi·Mi) = 16.3601 kg/kmol.
        let m = reference_composition().molar_mass().unwrap();
        approx(m, dec!(16.3601), dec!(0.001));
    }

    #[test]
    fn rkm_density_matches_reference() {
        // Report: Σ(Xi·Vi) = 0.038476, K1 = 0.000071, K2 = 0.000165,
        // Xm = 0.9798, XN2 = 0.0004 → DENSITY 426.0 kg/m³.
        let d = rkm_density_from_sums(
            dec!(16.3601),
            dec!(0.038476),
            dec!(0.9798),
            dec!(0.0004),
            dec!(0.000071),
            dec!(0.000165),
        )
        .unwrap();
        approx(d, dec!(426.0), dec!(0.1));
    }

    #[test]
    fn gross_mass_is_exact() {
        // 153 848.5 m³ × 426.0 kg/m³ = 65 539 461 kg (exact in the report).
        let m = gross_mass_kg(dec!(153848.5), dec!(426.0));
        assert_eq!(m, dec!(65539461.0));
    }

    #[test]
    fn gross_energy_matches_reference() {
        // mass 65 539 461 kg, Hm 23 811 Btu/lb → ≈ 3 440 402 MMBtu.
        // (Exact repro needs the unrounded density/Hm; the report's rounded
        // inputs land within ~0.005 %.)
        let e = gross_energy_mmbtu(dec!(65539461), dec!(23811), dec!(2.2046));
        approx(e, dec!(3440402), dec!(200));
    }

    #[test]
    fn net_energy_is_exact() {
        // gross 3 440 402 − Qr 14 162 − Qf 1 255 = 3 424 985 MMBtu.
        let n = net_energy(dec!(3440402), dec!(14162), dec!(1255));
        assert_eq!(n, dec!(3424985));
    }

    #[test]
    fn empty_composition_errors() {
        assert!(LngComposition::default().molar_mass().is_err());
    }
}

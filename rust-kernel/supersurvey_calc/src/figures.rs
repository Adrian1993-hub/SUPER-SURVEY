//! Multi-unit custody figure assembler — the shared "Summary of Quantities"
//! backbone used by every cargo report (inspectoras internacionales): one standard volume +
//! density expanded into all the reported units, at the TCV / GSV / NSV levels.
//!
//! Units per level: bbl@60 · gal@60 · m³@60 · L@60 · m³@15 · L@15 · MT(air) ·
//! MT(vacuum) · LT(air).
//!
//! Method (mass is the invariant; the 15 °C↔60 °F volume bridge reuses the
//! product's own thermal correction via `density`):
//!   mass_vac = vol15 · ρ15
//!   ρ60      = ρ15 · VCF(ρ15, 60 °F)            (density module)
//!   vol60    = mass_vac / ρ60
//!   MT_air   = vol15 · (ρ15[kg/L] − 0.0011)     (Table 56 air buoyancy)
//!   bbl@60 = vol60 / 0.158987294928 ; gal@60 = bbl·42 ; LT = MT / 1.0160469088
//!
//! Levels:  TCV = GSV + free water ;  NSV = GSV · (1 − S&W%).
//! Pure `Decimal`; validated against a real Intertek Summary of Quantities.

use crate::bqs::AstmTable;
use crate::decimal::DecimalValue;
use crate::density::observed_density_from_rho15;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, SystemRoundingRule};
use crate::units::TemperatureUnit;
use crate::value::UnitValue;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};

const M3_PER_BBL: Decimal = dec!(0.158987294928);
const GAL_PER_BBL: Decimal = dec!(42);
const LT_PER_MT: Decimal = dec!(1.0160469088);
const AIR_CORRECTION: Decimal = dec!(0.0011);

/// One quantity expressed in every reported unit.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnitSet {
    pub bbl60: Decimal,
    pub gal60: Decimal,
    pub m3_60: Decimal,
    pub l_60: Decimal,
    pub m3_15: Decimal,
    pub l_15: Decimal,
    pub mt_air: Decimal,
    pub mt_vac: Decimal,
    pub lt_air: Decimal,
}

/// Expand a standard volume @15 °C (m³) + density@15 (kg/m³) into all units.
pub fn expand_units(vol15_m3: Decimal, density15_kg_m3: Decimal) -> KernelResult<UnitSet> {
    if density15_kg_m3 <= dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Density @15 must be positive.",
            "density15",
        ));
    }
    let mass_vac_kg = vol15_m3 * density15_kg_m3;
    let temp60 = UnitValue::new(dec!(60), TemperatureUnit::Fahrenheit);
    let density60 = observed_density_from_rho15(density15_kg_m3, &temp60, AstmTable::Table54B)?;
    let vol60_m3 = if density60 > dec!(0) {
        mass_vac_kg / density60
    } else {
        dec!(0)
    };
    let density15_kg_l = density15_kg_m3 / dec!(1000);
    let mt_air = vol15_m3 * (density15_kg_l - AIR_CORRECTION);
    Ok(UnitSet {
        bbl60: vol60_m3 / M3_PER_BBL,
        gal60: vol60_m3 / M3_PER_BBL * GAL_PER_BBL,
        m3_60: vol60_m3,
        l_60: vol60_m3 * dec!(1000),
        m3_15: vol15_m3,
        l_15: vol15_m3 * dec!(1000),
        mt_air,
        mt_vac: mass_vac_kg / dec!(1000),
        lt_air: mt_air / LT_PER_MT,
    })
}

/// TCV / GSV / NSV custody figure.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CustodyFigure {
    pub tcv: UnitSet,
    pub gsv: UnitSet,
    pub nsv: UnitSet,
}

/// Build the three-level figure from GSV@15 (m³), density@15 (kg/m³), the S&W
/// percent and any free water (m³ @15) for TCV.
pub fn custody_figure(
    gsv15_m3: Decimal,
    density15_kg_m3: Decimal,
    sw_pct: Decimal,
    free_water15_m3: Decimal,
) -> KernelResult<CustodyFigure> {
    let tcv15 = gsv15_m3 + free_water15_m3;
    let nsv15 = gsv15_m3 * (dec!(1) - sw_pct / dec!(100));
    Ok(CustodyFigure {
        tcv: expand_units(tcv15, density15_kg_m3)?,
        gsv: expand_units(gsv15_m3, density15_kg_m3)?,
        nsv: expand_units(nsv15, density15_kg_m3)?,
    })
}

// ---------------------------------------------------------------------------
// DTO boundary
// ---------------------------------------------------------------------------

fn default_density_unit() -> String {
    "KG_L".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustodyFigureRequestDTO {
    /// GSV at the standard base (m³ @15 °C, unless `gsv_unit` says BBL_60).
    pub gsv_value: String,
    /// M3_15 (default) or BBL_60.
    #[serde(default)]
    pub gsv_unit: String,
    pub density15_value: String,
    #[serde(default = "default_density_unit")]
    pub density15_unit: String,
    #[serde(default)]
    pub sw_pct: Option<String>,
    #[serde(default)]
    pub free_water_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitSetDTO {
    pub bbl60: String,
    pub gal60: String,
    pub m3_60: String,
    pub l_60: String,
    pub m3_15: String,
    pub l_15: String,
    pub mt_air: String,
    pub mt_vac: String,
    pub lt_air: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustodyFigureResponseDTO {
    pub success: bool,
    pub tcv: Option<UnitSetDTO>,
    pub gsv: Option<UnitSetDTO>,
    pub nsv: Option<UnitSetDTO>,
    pub errors: Option<Vec<KernelError>>,
}

fn set_to_dto(s: &UnitSet) -> UnitSetDTO {
    // Volumes 3 dp, big litre counts 0 dp, weights 3 dp — matches the reports.
    let v3 = |x: Decimal| {
        round_decimal(x, 3, SystemRoundingRule::HalfUp)
            .normalize()
            .to_string()
    };
    let v2 = |x: Decimal| {
        round_decimal(x, 2, SystemRoundingRule::HalfUp)
            .normalize()
            .to_string()
    };
    let v0 = |x: Decimal| {
        round_decimal(x, 0, SystemRoundingRule::HalfUp)
            .normalize()
            .to_string()
    };
    UnitSetDTO {
        bbl60: v2(s.bbl60),
        gal60: v2(s.gal60),
        m3_60: v3(s.m3_60),
        l_60: v0(s.l_60),
        m3_15: v3(s.m3_15),
        l_15: v0(s.l_15),
        mt_air: v3(s.mt_air),
        mt_vac: v3(s.mt_vac),
        lt_air: v3(s.lt_air),
    }
}

impl CustodyFigureRequestDTO {
    pub fn calculate(&self) -> CustodyFigureResponseDTO {
        match self.calculate_inner() {
            Ok(f) => CustodyFigureResponseDTO {
                success: true,
                tcv: Some(set_to_dto(&f.tcv)),
                gsv: Some(set_to_dto(&f.gsv)),
                nsv: Some(set_to_dto(&f.nsv)),
                errors: None,
            },
            Err(e) => CustodyFigureResponseDTO {
                success: false,
                tcv: None,
                gsv: None,
                nsv: None,
                errors: Some(vec![e]),
            },
        }
    }

    fn calculate_inner(&self) -> KernelResult<CustodyFigure> {
        let gsv_in = DecimalValue::parse(&self.gsv_value, "gsv_value")?.value;
        let density_raw = DecimalValue::parse(&self.density15_value, "density15_value")?.value;
        let density15_kg_m3 = match self.density15_unit.trim().to_ascii_uppercase().as_str() {
            "" | "KG_L" | "KG_PER_L" => density_raw * dec!(1000),
            "KG_M3" | "KG_PER_M3" => density_raw,
            other => {
                return Err(KernelError::with_field(
                    KernelErrorCode::UnsupportedConversion,
                    format!("Density unit must be KG_L or KG_M3 here, got {other}."),
                    "density15_unit",
                ))
            }
        };
        // Normalize GSV input to m³ @15.
        let gsv15_m3 = match self.gsv_unit.trim().to_ascii_uppercase().as_str() {
            "" | "M3_15" | "M3" => gsv_in,
            "BBL_60" | "BBL" => {
                // bbl@60 → m³@60 → mass → m³@15
                let vol60 = gsv_in * M3_PER_BBL;
                let temp60 = UnitValue::new(dec!(60), TemperatureUnit::Fahrenheit);
                let density60 =
                    observed_density_from_rho15(density15_kg_m3, &temp60, AstmTable::Table54B)?;
                let mass = vol60 * density60;
                mass / density15_kg_m3
            }
            other => {
                return Err(KernelError::with_field(
                    KernelErrorCode::UnsupportedConversion,
                    format!("GSV unit must be M3_15 or BBL_60, got {other}."),
                    "gsv_unit",
                ))
            }
        };
        let sw_pct = match &self.sw_pct {
            Some(s) if !s.trim().is_empty() => DecimalValue::parse(s, "sw_pct")?.value,
            _ => dec!(0),
        };
        let fw = match &self.free_water_value {
            Some(s) if !s.trim().is_empty() => DecimalValue::parse(s, "free_water_value")?.value,
            _ => dec!(0),
        };
        custody_figure(gsv15_m3, density15_kg_m3, sw_pct, fw)
    }
}

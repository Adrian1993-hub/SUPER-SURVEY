//! Imperial (60 °F) BQS row orchestrator: surveyor inputs (API gravity, observed
//! temperature, volume) → fully calculated tank row, mirroring `bqs` for the
//! US-customary family. String-in / string-out DTO for the WASM/Tauri boundary.
//!
//! Chain (matches the SGS imperial worksheet):
//!   GOV_bbl = volume_bbl − free_water_bbl
//!   GSV_bbl = round(GOV_bbl × VCF_6B, 2)
//!   MT_air  = round(GSV_bbl × WCF_13, 3)
//!   MT_vac  = round(GSV_bbl / 6.28981 × ρ60 / 1000, 3)   (weight in vacuum)

use crate::astm60::{
    table_13_wcf, table_6a_vcf, table_6b_vcf, Table6Computation, BARRELS_PER_CUBIC_METER,
    DEFAULT_VCF60_DECIMALS, DEFAULT_WCF13_DECIMALS,
};
use crate::decimal::DecimalValue;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, SystemRoundingRule};
use crate::trace::{CalculationScope, CalculationTrace, TraceStep};
use crate::units::{TemperatureUnit, VolumeUnit};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;

/// Cubic metres per barrel (reciprocal of the worksheet's bbl/m³).
const CUBIC_METER_PER_BARREL: Decimal = dec!(0.158987294928);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImperialTable {
    /// Table 6A — crude oil.
    Table6A,
    /// Table 6B — generalized refined products (default).
    Table6B,
}

impl FromStr for ImperialTable {
    type Err = KernelError;
    fn from_str(input: &str) -> KernelResult<Self> {
        match input
            .trim()
            .to_ascii_uppercase()
            .replace([' ', '-'], "_")
            .as_str()
        {
            "" | "6B" | "TABLE_6B" | "ASTM_6B" | "T6B" => Ok(ImperialTable::Table6B),
            "6A" | "TABLE_6A" | "ASTM_6A" | "T6A" => Ok(ImperialTable::Table6A),
            _ => Err(KernelError::with_field(
                KernelErrorCode::InvalidUnit,
                format!("Unsupported imperial table: {input}"),
                "astm_table",
            )),
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ImperialRowRequestDTO {
    pub calculation_scope: String,
    /// API gravity @ 60 °F.
    pub api_value: String,
    pub temperature_value: String,
    /// CELSIUS or FAHRENHEIT.
    pub temperature_unit: String,
    pub volume_value: String,
    /// CUBIC_METERS or US_BARRELS.
    pub volume_unit: String,
    pub free_water_value: String,
    pub free_water_unit: String,
    /// 6A or 6B (default 6B).
    #[serde(default)]
    pub astm_table: String,
    pub rounding_rule: String,
    #[serde(default = "default_gsv_decimals")]
    pub gsv_decimals: u32,
    #[serde(default = "default_weight_decimals")]
    pub weight_decimals: u32,
}

fn default_gsv_decimals() -> u32 {
    2
}
fn default_weight_decimals() -> u32 {
    3
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImperialRowResponseDTO {
    pub success: bool,
    pub vcf: Option<String>,
    pub product_group: Option<String>,
    pub temp68_f: Option<String>,
    pub density60_kg_m3: Option<String>,
    pub gov_bbl: Option<String>,
    pub gsv_bbl: Option<String>,
    pub wcf13: Option<String>,
    pub mt_air: Option<String>,
    pub mt_vacuum: Option<String>,
    pub trace_json: Option<serde_json::Value>,
    pub errors: Option<Vec<KernelError>>,
}

impl ImperialRowResponseDTO {
    fn failure(errors: Vec<KernelError>) -> Self {
        Self {
            success: false,
            vcf: None,
            product_group: None,
            temp68_f: None,
            density60_kg_m3: None,
            gov_bbl: None,
            gsv_bbl: None,
            wcf13: None,
            mt_air: None,
            mt_vacuum: None,
            trace_json: None,
            errors: Some(errors),
        }
    }
}

fn to_fahrenheit(value: Decimal, unit: TemperatureUnit) -> Decimal {
    match unit {
        TemperatureUnit::Fahrenheit => value,
        TemperatureUnit::Celsius => value * dec!(1.8) + dec!(32),
    }
}

fn to_barrels(value: Decimal, unit: VolumeUnit) -> KernelResult<Decimal> {
    match unit {
        VolumeUnit::UsBarrels => Ok(value),
        VolumeUnit::CubicMeters => Ok(value * BARRELS_PER_CUBIC_METER),
        VolumeUnit::Litres => Ok(value / dec!(1000) * BARRELS_PER_CUBIC_METER),
    }
}

impl ImperialRowRequestDTO {
    pub fn calculate(&self) -> ImperialRowResponseDTO {
        match self.calculate_inner() {
            Ok(r) => r,
            Err(e) => ImperialRowResponseDTO::failure(vec![e]),
        }
    }

    fn calculate_inner(&self) -> KernelResult<ImperialRowResponseDTO> {
        let scope = CalculationScope::from_str(&self.calculation_scope)?;
        let api = DecimalValue::parse(&self.api_value, "api_value")?.value;
        let temp = DecimalValue::parse(&self.temperature_value, "temperature_value")?.value;
        let temp_unit = TemperatureUnit::from_str(&self.temperature_unit)?;
        let vol = DecimalValue::parse(&self.volume_value, "volume_value")?.value;
        let vol_unit = VolumeUnit::from_str(&self.volume_unit)?;
        let fw = DecimalValue::parse(&self.free_water_value, "free_water_value")?.value;
        let fw_unit = VolumeUnit::from_str(&self.free_water_unit)?;
        let table = ImperialTable::from_str(&self.astm_table)?;
        let rounding = SystemRoundingRule::from_str(&self.rounding_rule)?;

        if vol < dec!(0) || fw < dec!(0) {
            return Err(KernelError::with_field(
                KernelErrorCode::NegativeQuantityNotAllowed,
                "Volume and free water must be non-negative.",
                "volume_value",
            ));
        }

        let temp_f = to_fahrenheit(temp, temp_unit);
        let gov_bbl = to_barrels(vol, vol_unit)? - to_barrels(fw, fw_unit)?;
        if gov_bbl < dec!(0) {
            return Err(KernelError::with_field(
                KernelErrorCode::NegativeQuantityNotAllowed,
                "GOV cannot be negative: free water exceeds volume.",
                "free_water_value",
            ));
        }

        let vcf: Table6Computation = match table {
            ImperialTable::Table6A => table_6a_vcf(api, temp_f, DEFAULT_VCF60_DECIMALS, rounding)?,
            ImperialTable::Table6B => table_6b_vcf(api, temp_f, DEFAULT_VCF60_DECIMALS, rounding)?,
        };
        let wcf = table_13_wcf(api, DEFAULT_WCF13_DECIMALS, rounding)?;

        let gsv_bbl = round_decimal(gov_bbl * vcf.vcf, self.gsv_decimals, rounding);
        let mt_air = round_decimal(gsv_bbl * wcf.wcf, self.weight_decimals, rounding);
        let mt_vacuum = round_decimal(
            gsv_bbl * CUBIC_METER_PER_BARREL * vcf.density60_kg_m3 / dec!(1000),
            self.weight_decimals,
            rounding,
        );

        let trace_json = if scope.requires_full_trace() {
            let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
            trace.push(TraceStep::new(
                "Imperial BQS tank row (60 F, Table 6B/6A + 13)",
                json!({
                    "api": api.to_string(),
                    "temperature_f": temp_f.to_string(),
                    "gov_bbl": gov_bbl.to_string(),
                    "astm_table": if matches!(table, ImperialTable::Table6A) {"6A"} else {"6B"},
                }),
                json!({
                    "temp68_f": vcf.delta_t_f.to_string(),
                    "vcf": vcf.vcf.to_string(),
                    "density60_kg_m3": vcf.density60_kg_m3.to_string(),
                    "wcf13": wcf.wcf.to_string(),
                    "gsv_bbl": gsv_bbl.to_string(),
                    "mt_air": mt_air.to_string(),
                    "mt_vacuum": mt_vacuum.to_string(),
                }),
            ));
            Some(serde_json::to_value(&trace).unwrap_or(json!(null)))
        } else {
            None
        };

        Ok(ImperialRowResponseDTO {
            success: true,
            vcf: Some(vcf.vcf.normalize().to_string()),
            product_group: vcf
                .product_group
                .and_then(|g| serde_json::to_value(g).ok())
                .and_then(|v| v.as_str().map(str::to_string)),
            temp68_f: Some((vcf.delta_t_f + dec!(60.0068749)).to_string()),
            density60_kg_m3: Some(vcf.density60_kg_m3.round_dp(2).to_string()),
            gov_bbl: Some(gsv_to_str(gov_bbl)),
            gsv_bbl: Some(gsv_bbl.normalize().to_string()),
            wcf13: Some(wcf.wcf.normalize().to_string()),
            mt_air: Some(mt_air.normalize().to_string()),
            mt_vacuum: Some(mt_vacuum.normalize().to_string()),
            trace_json,
            errors: None,
        })
    }
}

fn gsv_to_str(v: Decimal) -> String {
    v.round_dp(3).normalize().to_string()
}

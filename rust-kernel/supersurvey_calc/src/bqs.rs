//! BQS orchestration: surveyor inputs -> fully calculated tank row + section totals.
//!
//! This is the bridge between what the surveyor types (density @ 15 °C,
//! temperature, the volume read off the vessel's calibration table, free water,
//! and which ASTM table applies) and the official numbers. It composes the
//! `astm` factors (54A/54B VCF, 56 WCF) with the quantity chain and adds weight
//! in **vacuum** (GSV × density) alongside weight in **air** (GSV × WCF56).
//!
//! App policy (Decision Log): the app does NOT manage calibration tables — the
//! surveyor enters the table volume (already trim/list corrected). So TOV is an
//! input here; we compute GOV = TOV − FW, then VCF, GSV and both weights.
//!
//! `BqsRowRequestDTO`/`BqsRowResponseDTO` are the string-in/string-out IPC
//! boundary for the future Tauri command (mirrors `dto::CalculationRequestDTO`).

use crate::astm::{
    table_54a_vcf, table_54b_vcf, table_56_wcf, Table54Computation, Table54bProductGroup,
    TableVersion, DEFAULT_WCF_DECIMALS,
};
use crate::conversions::convert_volume;
use crate::decimal::DecimalValue;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, PrecisionConfiguration, SystemRoundingRule};
use crate::trace::{CalculationScope, CalculationTrace, TraceStep};
use crate::units::{DensityUnit, TemperatureUnit, VolumeUnit, WeightUnit};
use crate::value::{DensityValue, TemperatureValue, UnitValue, VolumeValue, WeightValue};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AstmTable {
    /// Table 54A — crude oil.
    Table54A,
    /// Table 54B — generalized refined products (bunkers).
    Table54B,
}

impl FromStr for AstmTable {
    type Err = KernelError;
    fn from_str(input: &str) -> KernelResult<Self> {
        match input
            .trim()
            .to_ascii_uppercase()
            .replace([' ', '-'], "_")
            .as_str()
        {
            "54A" | "TABLE_54A" | "ASTM_54A" | "T54A" => Ok(AstmTable::Table54A),
            "54B" | "TABLE_54B" | "ASTM_54B" | "T54B" => Ok(AstmTable::Table54B),
            _ => Err(KernelError::with_field(
                KernelErrorCode::InvalidUnit,
                format!("Unsupported ASTM table selection: {input}"),
                "astm_table",
            )),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BqsTankInput {
    pub density15: DensityValue,
    pub temperature: TemperatureValue,
    /// Volume read from the vessel's calibration table (TOV; trim/list applied).
    pub tov: VolumeValue,
    pub free_water: VolumeValue,
    pub table: AstmTable,
    /// Petroleum-table edition (D1250-80 default, D1250-04 = 5 dp VCF).
    #[serde(default)]
    pub table_version: TableVersion,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BqsTankResult {
    #[serde(with = "rust_decimal::serde::str")]
    pub vcf: Decimal,
    pub product_group: Option<Table54bProductGroup>,
    #[serde(default)]
    pub table_version: Option<TableVersion>,
    pub gov: VolumeValue,
    pub gsv: VolumeValue,
    /// Table 56 weight-in-air factor (t/m³).
    #[serde(with = "rust_decimal::serde::str")]
    pub wcf_air: Decimal,
    pub mt_air: WeightValue,
    pub mt_vacuum: WeightValue,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BqsSectionResult {
    pub rows: Vec<BqsTankResult>,
    pub total_gov: VolumeValue,
    pub total_gsv: VolumeValue,
    pub total_mt_air: WeightValue,
    pub total_mt_vacuum: WeightValue,
    pub trace: Option<CalculationTrace>,
}

fn vcf_for(input: &BqsTankInput, rounding: SystemRoundingRule) -> KernelResult<Table54Computation> {
    // The edition sets the VCF output resolution (1980: 4 dp, 2004: 5 dp); the
    // underlying equation is shared at atmospheric pressure (see astm::TableVersion).
    let vcf_decimals = input.table_version.default_vcf_decimals();
    let mut computation = match input.table {
        AstmTable::Table54A => {
            table_54a_vcf(&input.density15, &input.temperature, vcf_decimals, rounding)?
        }
        AstmTable::Table54B => {
            table_54b_vcf(&input.density15, &input.temperature, vcf_decimals, rounding)?
        }
    };
    computation.table_version = Some(input.table_version);
    Ok(computation)
}

/// Compute one BQS tank row from the surveyor's inputs.
pub fn compute_bqs_tank_row(
    input: BqsTankInput,
    precision: PrecisionConfiguration,
    scope: CalculationScope,
) -> KernelResult<(BqsTankResult, Option<CalculationTrace>)> {
    if input.tov.value < dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "TOV cannot be negative.",
            "tov",
        ));
    }
    if input.free_water.value < dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Free water cannot be negative.",
            "free_water",
        ));
    }

    let vcf_comp = vcf_for(&input, precision.rounding_rule)?;
    let wcf_comp = table_56_wcf(
        &input.density15,
        DEFAULT_WCF_DECIMALS,
        precision.rounding_rule,
    )?;

    let vcf_basis = if precision.intermediate_rounding {
        vcf_comp.vcf
    } else {
        vcf_comp.vcf_unrounded
    };
    let wcf_air_basis = if precision.intermediate_rounding {
        wcf_comp.wcf
    } else {
        wcf_comp.wcf_unrounded
    };
    let density_kg_l = wcf_comp.density15_kg_l;

    let fw = convert_volume(input.free_water.clone(), input.tov.unit)?;
    let gov_raw = input.tov.value - fw.value;
    if gov_raw < dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "GOV cannot be negative: free water exceeds TOV.",
            "free_water",
        ));
    }
    let gov_rounded = round_decimal(
        gov_raw,
        precision.observed_volume_decimals,
        precision.rounding_rule,
    );
    let gov_basis = if precision.intermediate_rounding {
        gov_rounded
    } else {
        gov_raw
    };

    let gsv_raw = gov_basis * vcf_basis;
    let gsv_rounded = round_decimal(
        gsv_raw,
        precision.standard_volume_decimals,
        precision.rounding_rule,
    );
    let gsv_basis = if precision.intermediate_rounding {
        gsv_rounded
    } else {
        gsv_raw
    };

    let mt_air_value = round_decimal(
        gsv_basis * wcf_air_basis,
        precision.weight_decimals,
        precision.rounding_rule,
    );
    let mt_vacuum_value = round_decimal(
        gsv_basis * density_kg_l,
        precision.weight_decimals,
        precision.rounding_rule,
    );

    let result = BqsTankResult {
        vcf: vcf_comp.vcf,
        product_group: vcf_comp.product_group,
        table_version: vcf_comp.table_version,
        gov: UnitValue::new(gov_rounded, input.tov.unit),
        gsv: UnitValue::new(gsv_rounded, input.tov.unit),
        wcf_air: wcf_comp.wcf,
        mt_air: UnitValue::new(mt_air_value, WeightUnit::MetricTons),
        mt_vacuum: UnitValue::new(mt_vacuum_value, WeightUnit::MetricTons),
    };

    let trace = if scope.requires_full_trace() {
        let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
        trace.push(
            TraceStep::new(
                "BQS tank row",
                json!({
                    "density15": input.density15,
                    "temperature": input.temperature,
                    "tov": input.tov,
                    "free_water": input.free_water,
                    "table": input.table,
                    "table_version": input.table_version.label(),
                    "intermediate_rounding": precision.intermediate_rounding,
                }),
                json!({
                    "vcf": result.vcf.to_string(),
                    "gov": result.gov,
                    "gsv": result.gsv,
                    "wcf_air": result.wcf_air.to_string(),
                    "mt_air": result.mt_air,
                    "mt_vacuum": result.mt_vacuum,
                }),
            )
            .with_formula("GOV=TOV-FW; GSV=GOV*VCF; MT(air)=GSV*WCF56; MT(vac)=GSV*rho15"),
        );
        Some(trace)
    } else {
        None
    };

    Ok((result, trace))
}

/// Compute a whole BQS section (e.g. Before/After receiving): per-tank rows plus
/// totals. Totals are the sum of the per-row reported (rounded) quantities, which
/// is how the field worksheet totals each section.
pub fn compute_bqs_section(
    inputs: Vec<BqsTankInput>,
    precision: PrecisionConfiguration,
    scope: CalculationScope,
) -> KernelResult<BqsSectionResult> {
    if inputs.is_empty() {
        return Err(KernelError::with_field(
            KernelErrorCode::ComparisonInputInvalid,
            "A BQS section needs at least one tank.",
            "inputs",
        ));
    }
    let unit = inputs[0].tov.unit;

    let mut rows = Vec::with_capacity(inputs.len());
    let mut total_gov = dec!(0);
    let mut total_gsv = dec!(0);
    let mut total_mt_air = dec!(0);
    let mut total_mt_vac = dec!(0);

    for input in inputs {
        if input.tov.unit != unit {
            return Err(KernelError::with_field(
                KernelErrorCode::IncompatibleUnits,
                "All tanks in a section must share the same volume unit.",
                "tov_unit",
            ));
        }
        // Rows themselves don't carry per-row trace; the section trace summarizes.
        let (row, _) = compute_bqs_tank_row(input, precision.clone(), CalculationScope::Live)?;
        total_gov += row.gov.value;
        total_gsv += row.gsv.value;
        total_mt_air += row.mt_air.value;
        total_mt_vac += row.mt_vacuum.value;
        rows.push(row);
    }

    let trace = if scope.requires_full_trace() {
        let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
        trace.push(TraceStep::new(
            "BQS section totals (sum of reported rows)",
            json!({ "tank_count": rows.len(), "aggregation": "SUM_OF_REPORTED" }),
            json!({
                "total_gov": total_gov.to_string(),
                "total_gsv": total_gsv.to_string(),
                "total_mt_air": total_mt_air.to_string(),
                "total_mt_vacuum": total_mt_vac.to_string(),
            }),
        ));
        Some(trace)
    } else {
        None
    };

    Ok(BqsSectionResult {
        rows,
        total_gov: UnitValue::new(total_gov, unit),
        total_gsv: UnitValue::new(total_gsv, unit),
        total_mt_air: UnitValue::new(total_mt_air, WeightUnit::MetricTons),
        total_mt_vacuum: UnitValue::new(total_mt_vac, WeightUnit::MetricTons),
        trace,
    })
}

// ---------------- IPC boundary (string-in / string-out) ----------------

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct BqsRowRequestDTO {
    pub calculation_scope: String,
    pub density15_value: String,
    pub density15_unit: String,
    pub temperature_value: String,
    pub temperature_unit: String,
    pub tov_value: String,
    pub tov_unit: String,
    pub free_water_value: String,
    pub free_water_unit: String,
    pub astm_table: String,
    /// Petroleum-table edition: "D1250_80" (default) or "D1250_04".
    #[serde(default)]
    pub table_version: String,
    pub rounding_rule: String,
    pub intermediate_rounding: bool,
    pub observed_volume_decimals: u32,
    pub standard_volume_decimals: u32,
    pub weight_decimals: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BqsRowResponseDTO {
    pub success: bool,
    pub vcf: Option<String>,
    pub product_group: Option<String>,
    pub table_version: Option<String>,
    pub gov_value: Option<String>,
    pub gsv_value: Option<String>,
    pub volume_unit: Option<String>,
    pub wcf_air: Option<String>,
    pub mt_air_value: Option<String>,
    pub mt_vacuum_value: Option<String>,
    pub trace_json: Option<serde_json::Value>,
    pub errors: Option<Vec<KernelError>>,
}

impl BqsRowRequestDTO {
    fn to_domain(&self) -> KernelResult<(BqsTankInput, PrecisionConfiguration, CalculationScope)> {
        let scope = CalculationScope::from_str(&self.calculation_scope)?;
        let density = DecimalValue::parse(&self.density15_value, "density15_value")?.value;
        let temperature = DecimalValue::parse(&self.temperature_value, "temperature_value")?.value;
        let tov = DecimalValue::parse(&self.tov_value, "tov_value")?.value;
        let fw = DecimalValue::parse(&self.free_water_value, "free_water_value")?.value;

        let density_unit = DensityUnit::from_str(&self.density15_unit)?;
        let temperature_unit = TemperatureUnit::from_str(&self.temperature_unit)?;
        let tov_unit = VolumeUnit::from_str(&self.tov_unit)?;
        let fw_unit = VolumeUnit::from_str(&self.free_water_unit)?;
        let table = AstmTable::from_str(&self.astm_table)?;
        let table_version = TableVersion::from_str(&self.table_version)?;
        let rounding_rule = SystemRoundingRule::from_str(&self.rounding_rule)?;

        let input = BqsTankInput {
            density15: UnitValue::new(density, density_unit),
            temperature: UnitValue::new(temperature, temperature_unit),
            tov: UnitValue::new(tov, tov_unit),
            free_water: UnitValue::new(fw, fw_unit),
            table,
            table_version,
        };
        let precision = PrecisionConfiguration {
            intermediate_rounding: self.intermediate_rounding,
            observed_volume_decimals: self.observed_volume_decimals,
            standard_volume_decimals: self.standard_volume_decimals,
            weight_decimals: self.weight_decimals,
            aggregate_from_unrounded: false,
            rounding_rule,
        };
        Ok((input, precision, scope))
    }

    pub fn calculate(&self) -> BqsRowResponseDTO {
        match self
            .to_domain()
            .and_then(|(input, precision, scope)| compute_bqs_tank_row(input, precision, scope))
        {
            Ok((row, trace)) => BqsRowResponseDTO {
                success: true,
                vcf: Some(row.vcf.normalize().to_string()),
                product_group: row
                    .product_group
                    .and_then(|g| serde_json::to_value(g).ok())
                    .and_then(|v| v.as_str().map(str::to_string)),
                table_version: row.table_version.map(|v| v.label().to_string()),
                gov_value: Some(row.gov.value.normalize().to_string()),
                gsv_value: Some(row.gsv.value.normalize().to_string()),
                volume_unit: Some(format!("{:?}", row.gsv.unit).to_ascii_uppercase()),
                wcf_air: Some(row.wcf_air.normalize().to_string()),
                mt_air_value: Some(row.mt_air.value.normalize().to_string()),
                mt_vacuum_value: Some(row.mt_vacuum.value.normalize().to_string()),
                trace_json: trace.and_then(|t| serde_json::to_value(t).ok()),
                errors: None,
            },
            Err(err) => BqsRowResponseDTO {
                success: false,
                vcf: None,
                product_group: None,
                table_version: None,
                gov_value: None,
                gsv_value: None,
                volume_unit: None,
                wcf_air: None,
                mt_air_value: None,
                mt_vacuum_value: None,
                trace_json: None,
                errors: Some(vec![err]),
            },
        }
    }
}

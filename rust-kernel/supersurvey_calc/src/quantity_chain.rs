use crate::conversions::convert_volume;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, PrecisionConfiguration};
use crate::trace::{CalculationScope, CalculationTrace, TraceStep};
use crate::units::WeightUnit;
use crate::value::{UnitValue, VolumeValue, WeightValue};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct QuantityChainInputs {
    pub tov: VolumeValue,
    pub free_water: VolumeValue,
    pub vcf: Decimal,
    /// Weight factor in metric tons per unit of GSV. Official source: ASTM
    /// Table 56 (`astm::table_56_wcf`, t/m³ in air); GSV m³ × WCF = MT (air).
    /// Pass density @ 15 °C (t/m³) instead to obtain MT in vacuum.
    pub wcf: Decimal,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QuantityChainResult {
    pub gov: VolumeValue,
    pub gsv: VolumeValue,
    pub weight_air: WeightValue,
    pub trace: Option<CalculationTrace>,
}

pub fn calculate_basic_quantity_chain(
    inputs: QuantityChainInputs,
    precision: PrecisionConfiguration,
    scope: CalculationScope,
) -> KernelResult<QuantityChainResult> {
    if inputs.tov.value < dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "TOV cannot be negative.",
            "tov_value",
        ));
    }
    if inputs.free_water.value < dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "Free water cannot be negative.",
            "free_water_value",
        ));
    }
    if inputs.vcf < dec!(0) || inputs.wcf < dec!(0) {
        return Err(KernelError::new(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "VCF/WCF cannot be negative.",
        ));
    }

    let free_water_in_tov_unit = convert_volume(inputs.free_water.clone(), inputs.tov.unit)?;
    let raw_gov = inputs.tov.value - free_water_in_tov_unit.value;
    if raw_gov < dec!(0) {
        return Err(KernelError::with_field(
            KernelErrorCode::NegativeQuantityNotAllowed,
            "GOV cannot be negative: free water exceeds TOV.",
            "free_water_value",
        ));
    }

    let gov_value = round_decimal(
        raw_gov,
        precision.observed_volume_decimals,
        precision.rounding_rule,
    );
    let gov = UnitValue::new(gov_value, inputs.tov.unit);

    let gsv_unrounded = if precision.intermediate_rounding {
        gov.value
    } else {
        raw_gov
    } * inputs.vcf;
    let gsv_value = round_decimal(
        gsv_unrounded,
        precision.standard_volume_decimals,
        precision.rounding_rule,
    );
    let gsv = UnitValue::new(gsv_value, inputs.tov.unit);

    let weight_unrounded = if precision.intermediate_rounding {
        gsv.value
    } else {
        gsv_unrounded
    } * inputs.wcf;
    let weight_air_value = round_decimal(
        weight_unrounded,
        precision.weight_decimals,
        precision.rounding_rule,
    );
    let weight_air = UnitValue::new(weight_air_value, WeightUnit::MetricTons);

    let trace = if scope.requires_full_trace() {
        let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
        trace.push(TraceStep::new(
            "Normalize free water unit",
            json!({"free_water": inputs.free_water, "target_unit": inputs.tov.unit}),
            json!({"free_water_normalized": free_water_in_tov_unit}),
        ));
        trace.push(
            TraceStep::new(
                "Calculate GOV",
                json!({"tov": inputs.tov, "free_water": free_water_in_tov_unit}),
                json!({"gov_unrounded": raw_gov.to_string(), "gov": gov}),
            )
            .with_formula("GOV = TOV - FW"),
        );
        trace.push(TraceStep::new(
            "Calculate GSV",
            json!({"gov_basis": if precision.intermediate_rounding { gov.value.to_string() } else { raw_gov.to_string() }, "vcf": inputs.vcf.to_string()}),
            json!({"gsv_unrounded": gsv_unrounded.to_string(), "gsv": gsv}),
        ).with_formula("GSV = GOV x VCF"));
        trace.push(TraceStep::new(
            "Calculate Weight Air",
            json!({"gsv_basis": if precision.intermediate_rounding { gsv.value.to_string() } else { gsv_unrounded.to_string() }, "wcf": inputs.wcf.to_string()}),
            json!({"weight_unrounded": weight_unrounded.to_string(), "weight_air": weight_air}),
        ).with_formula("Weight Air = GSV x WCF"));
        Some(trace)
    } else {
        None
    };

    Ok(QuantityChainResult {
        gov,
        gsv,
        weight_air,
        trace,
    })
}

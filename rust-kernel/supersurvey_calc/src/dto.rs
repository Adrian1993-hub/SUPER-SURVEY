use crate::decimal::DecimalValue;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{PrecisionConfiguration, SystemRoundingRule};
use crate::quantity_chain::{
    calculate_basic_quantity_chain, QuantityChainInputs, QuantityChainResult,
};
use crate::trace::CalculationScope;
use crate::units::VolumeUnit;
use crate::value::UnitValue;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CalculationRequestDTO {
    pub job_id: String,
    pub measurement_record_id: String,
    pub calculation_scope: String,
    pub tov_value: String,
    pub tov_unit: String,
    pub free_water_value: String,
    pub free_water_unit: String,
    pub vcf: String,
    pub wcf: String,
    pub rounding_rule: String,
    pub intermediate_rounding: bool,
    pub observed_volume_decimals: u32,
    pub standard_volume_decimals: u32,
    pub weight_decimals: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalculationResponseDTO {
    pub success: bool,
    pub gov_value: Option<String>,
    pub gov_unit: Option<String>,
    pub gsv_value: Option<String>,
    pub gsv_unit: Option<String>,
    pub weight_air_value: Option<String>,
    pub weight_air_unit: Option<String>,
    pub cache_status: String,
    pub trace_json: Option<serde_json::Value>,
    pub errors: Option<Vec<KernelError>>,
}

impl CalculationRequestDTO {
    pub fn to_domain_inputs(
        &self,
    ) -> KernelResult<(
        QuantityChainInputs,
        PrecisionConfiguration,
        CalculationScope,
    )> {
        let scope = CalculationScope::from_str(&self.calculation_scope)?;
        let tov_dec = DecimalValue::parse(&self.tov_value, "tov_value")?.value;
        let fw_dec = DecimalValue::parse(&self.free_water_value, "free_water_value")?.value;
        let vcf_dec = DecimalValue::parse(&self.vcf, "vcf")?.value;
        let wcf_dec = DecimalValue::parse(&self.wcf, "wcf")?.value;

        let tov_unit = VolumeUnit::from_str(&self.tov_unit).map_err(|_| {
            KernelError::with_field(
                KernelErrorCode::InvalidUnit,
                "Unsupported TOV volume unit.",
                "tov_unit",
            )
        })?;
        let fw_unit = VolumeUnit::from_str(&self.free_water_unit).map_err(|_| {
            KernelError::with_field(
                KernelErrorCode::InvalidUnit,
                "Unsupported free water volume unit.",
                "free_water_unit",
            )
        })?;
        let rounding_rule = SystemRoundingRule::from_str(&self.rounding_rule)?;

        let domain_inputs = QuantityChainInputs {
            tov: UnitValue::new(tov_dec, tov_unit),
            free_water: UnitValue::new(fw_dec, fw_unit),
            vcf: vcf_dec,
            wcf: wcf_dec,
        };
        let precision_config = PrecisionConfiguration {
            intermediate_rounding: self.intermediate_rounding,
            observed_volume_decimals: self.observed_volume_decimals,
            standard_volume_decimals: self.standard_volume_decimals,
            weight_decimals: self.weight_decimals,
            aggregate_from_unrounded: false,
            rounding_rule,
        };
        Ok((domain_inputs, precision_config, scope))
    }

    pub fn calculate(&self) -> CalculationResponseDTO {
        match self
            .to_domain_inputs()
            .and_then(|(inputs, precision, scope)| {
                calculate_basic_quantity_chain(inputs, precision, scope)
            }) {
            Ok(result) => CalculationResponseDTO::from_result(result),
            Err(err) => CalculationResponseDTO {
                success: false,
                gov_value: None,
                gov_unit: None,
                gsv_value: None,
                gsv_unit: None,
                weight_air_value: None,
                weight_air_unit: None,
                cache_status: "ERROR".to_string(),
                trace_json: None,
                errors: Some(vec![err]),
            },
        }
    }
}

impl CalculationResponseDTO {
    pub fn from_result(result: QuantityChainResult) -> Self {
        Self {
            success: true,
            gov_value: Some(result.gov.value.normalize().to_string()),
            gov_unit: Some(format!("{:?}", result.gov.unit).to_ascii_uppercase()),
            gsv_value: Some(result.gsv.value.normalize().to_string()),
            gsv_unit: Some(format!("{:?}", result.gsv.unit).to_ascii_uppercase()),
            weight_air_value: Some(result.weight_air.value.normalize().to_string()),
            weight_air_unit: Some("METRIC_TONS".to_string()),
            cache_status: "FRESH".to_string(),
            trace_json: result.trace.and_then(|t| serde_json::to_value(t).ok()),
            errors: None,
        }
    }
}

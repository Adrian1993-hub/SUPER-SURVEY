use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, PrecisionConfiguration};
use crate::trace::{CalculationScope, CalculationTrace, TraceStep};
use crate::units::{VolumeUnit, WeightUnit};
use crate::value::{UnitValue, VolumeValue, WeightValue};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::str::FromStr;

/// Operation role controls the sign convention for paired measurements.
///
/// Receiving-like operations report `closing - opening`.
/// Delivery-like operations report `opening - closing`.
///
/// This is the kernel-level expression of the SuperSurvey rule:
/// opening/before and closing/after live in one paired measurement set.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MovementRole {
    Receiving,
    Delivery,
    Inventory,
    DebunkeringDelivery,
    BqsVesselReceiving,
    BqsBargeDelivery,
    TerminalReceiving,
    TerminalDelivery,
}

impl MovementRole {
    pub fn sign_multiplier(self) -> Decimal {
        match self {
            MovementRole::Receiving
            | MovementRole::Inventory
            | MovementRole::BqsVesselReceiving
            | MovementRole::TerminalReceiving => dec!(1),
            MovementRole::Delivery
            | MovementRole::DebunkeringDelivery
            | MovementRole::BqsBargeDelivery
            | MovementRole::TerminalDelivery => dec!(-1),
        }
    }

    pub fn formula_label(self) -> &'static str {
        match self.sign_multiplier() {
            x if x == dec!(1) => "Movement = Closing - Opening",
            _ => "Movement = Opening - Closing",
        }
    }
}

impl FromStr for MovementRole {
    type Err = KernelError;

    fn from_str(input: &str) -> KernelResult<Self> {
        let normalized = input.trim().to_ascii_uppercase().replace(['-', ' '], "_");
        match normalized.as_str() {
            "RECEIVING" => Ok(MovementRole::Receiving),
            "DELIVERY" => Ok(MovementRole::Delivery),
            "INVENTORY" => Ok(MovementRole::Inventory),
            "DEBUNKERING_DELIVERY" | "DEBUNKERING" => Ok(MovementRole::DebunkeringDelivery),
            "BQS_VESSEL_RECEIVING" | "BQS_VESSEL" => Ok(MovementRole::BqsVesselReceiving),
            "BQS_BARGE_DELIVERY" | "BQS_BARGE" => Ok(MovementRole::BqsBargeDelivery),
            "TERMINAL_RECEIVING" => Ok(MovementRole::TerminalReceiving),
            "TERMINAL_DELIVERY" => Ok(MovementRole::TerminalDelivery),
            _ => Err(KernelError::with_field(
                KernelErrorCode::InvalidMovementRole,
                format!("Unsupported movement role: {input}"),
                "movement_role",
            )),
        }
    }
}

/// Stage naming is kept explicit because the UI/report language varies by operation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MeasurementStage {
    Opening,
    Closing,
    Before,
    After,
    Initial,
    Final,
    Arrival,
    Departure,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct QuantitySnapshot {
    pub gov: VolumeValue,
    pub gsv: VolumeValue,
    pub weight_air: WeightValue,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TankPairedInput {
    pub tank_id: String,
    pub tank_name: String,
    pub product_id: Option<String>,
    pub opening: QuantitySnapshot,
    pub closing: QuantitySnapshot,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MovementWarning {
    pub code: String,
    pub message: String,
    pub tank_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TankMovementResult {
    pub tank_id: String,
    pub tank_name: String,
    pub product_id: Option<String>,
    pub gov_movement: VolumeValue,
    pub gsv_movement: VolumeValue,
    pub weight_air_movement: WeightValue,
    pub warnings: Vec<MovementWarning>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MovementSetResult {
    pub role: MovementRole,
    pub tank_results: Vec<TankMovementResult>,
    pub total_gov_movement: VolumeValue,
    pub total_gsv_movement: VolumeValue,
    pub total_weight_air_movement: WeightValue,
    pub warnings: Vec<MovementWarning>,
    pub trace: Option<CalculationTrace>,
}

fn ensure_same_volume_unit(a: VolumeUnit, b: VolumeUnit, field: &str) -> KernelResult<()> {
    if a != b {
        return Err(KernelError::with_field(
            KernelErrorCode::IncompatibleUnits,
            format!(
                "Incompatible volume units for movement aggregation: {:?} vs {:?}",
                a, b
            ),
            field,
        ));
    }
    Ok(())
}

fn ensure_same_weight_unit(a: WeightUnit, b: WeightUnit, field: &str) -> KernelResult<()> {
    if a != b {
        return Err(KernelError::with_field(
            KernelErrorCode::IncompatibleUnits,
            format!(
                "Incompatible weight units for movement aggregation: {:?} vs {:?}",
                a, b
            ),
            field,
        ));
    }
    Ok(())
}

fn signed_difference(opening: Decimal, closing: Decimal, role: MovementRole) -> Decimal {
    if role.sign_multiplier() == dec!(1) {
        closing - opening
    } else {
        opening - closing
    }
}

pub fn calculate_tank_movement(
    input: TankPairedInput,
    role: MovementRole,
    precision: PrecisionConfiguration,
) -> KernelResult<TankMovementResult> {
    ensure_same_volume_unit(input.opening.gov.unit, input.closing.gov.unit, "gov_unit")?;
    ensure_same_volume_unit(input.opening.gsv.unit, input.closing.gsv.unit, "gsv_unit")?;
    ensure_same_weight_unit(
        input.opening.weight_air.unit,
        input.closing.weight_air.unit,
        "weight_air_unit",
    )?;

    let gov_raw = signed_difference(input.opening.gov.value, input.closing.gov.value, role);
    let gsv_raw = signed_difference(input.opening.gsv.value, input.closing.gsv.value, role);
    let weight_raw = signed_difference(
        input.opening.weight_air.value,
        input.closing.weight_air.value,
        role,
    );

    let gov_value = round_decimal(
        gov_raw,
        precision.observed_volume_decimals,
        precision.rounding_rule,
    );
    let gsv_value = round_decimal(
        gsv_raw,
        precision.standard_volume_decimals,
        precision.rounding_rule,
    );
    let weight_value = round_decimal(
        weight_raw,
        precision.weight_decimals,
        precision.rounding_rule,
    );

    let mut warnings = Vec::new();
    if gov_value < dec!(0) || gsv_value < dec!(0) || weight_value < dec!(0) {
        warnings.push(MovementWarning {
            code: "NEGATIVE_MOVEMENT".to_string(),
            message: format!(
                "Calculated movement is negative for role {:?}; review opening/closing values or source role.",
                role
            ),
            tank_id: Some(input.tank_id.clone()),
        });
    }

    Ok(TankMovementResult {
        tank_id: input.tank_id,
        tank_name: input.tank_name,
        product_id: input.product_id,
        gov_movement: UnitValue::new(gov_value, input.opening.gov.unit),
        gsv_movement: UnitValue::new(gsv_value, input.opening.gsv.unit),
        weight_air_movement: UnitValue::new(weight_value, input.opening.weight_air.unit),
        warnings,
    })
}

pub fn calculate_movement_set(
    role: MovementRole,
    tanks: Vec<TankPairedInput>,
    precision: PrecisionConfiguration,
    scope: CalculationScope,
) -> KernelResult<MovementSetResult> {
    if tanks.is_empty() {
        return Err(KernelError::new(
            KernelErrorCode::MissingStagePair,
            "Movement set requires at least one paired tank.",
        ));
    }

    let first_gov_unit = tanks[0].opening.gov.unit;
    let first_gsv_unit = tanks[0].opening.gsv.unit;
    let first_weight_unit = tanks[0].opening.weight_air.unit;

    let mut tank_results = Vec::with_capacity(tanks.len());
    let mut warnings = Vec::new();
    let mut total_gov_rounded = dec!(0);
    let mut total_gsv_rounded = dec!(0);
    let mut total_weight_rounded = dec!(0);
    let mut total_gov_unrounded = dec!(0);
    let mut total_gsv_unrounded = dec!(0);
    let mut total_weight_unrounded = dec!(0);

    for tank in tanks {
        ensure_same_volume_unit(first_gov_unit, tank.opening.gov.unit, "set_gov_unit")?;
        ensure_same_volume_unit(first_gsv_unit, tank.opening.gsv.unit, "set_gsv_unit")?;
        ensure_same_weight_unit(
            first_weight_unit,
            tank.opening.weight_air.unit,
            "set_weight_air_unit",
        )?;

        let gov_raw = signed_difference(tank.opening.gov.value, tank.closing.gov.value, role);
        let gsv_raw = signed_difference(tank.opening.gsv.value, tank.closing.gsv.value, role);
        let weight_raw = signed_difference(
            tank.opening.weight_air.value,
            tank.closing.weight_air.value,
            role,
        );
        total_gov_unrounded += gov_raw;
        total_gsv_unrounded += gsv_raw;
        total_weight_unrounded += weight_raw;

        let tank_result = calculate_tank_movement(tank, role, precision.clone())?;
        total_gov_rounded += tank_result.gov_movement.value;
        total_gsv_rounded += tank_result.gsv_movement.value;
        total_weight_rounded += tank_result.weight_air_movement.value;
        warnings.extend(tank_result.warnings.clone());
        tank_results.push(tank_result);
    }

    let (gov_source, gsv_source, weight_source) = if precision.aggregate_from_unrounded {
        (
            total_gov_unrounded,
            total_gsv_unrounded,
            total_weight_unrounded,
        )
    } else {
        (total_gov_rounded, total_gsv_rounded, total_weight_rounded)
    };

    let total_gov_value = round_decimal(
        gov_source,
        precision.observed_volume_decimals,
        precision.rounding_rule,
    );
    let total_gsv_value = round_decimal(
        gsv_source,
        precision.standard_volume_decimals,
        precision.rounding_rule,
    );
    let total_weight_value = round_decimal(
        weight_source,
        precision.weight_decimals,
        precision.rounding_rule,
    );

    let trace = if scope.requires_full_trace() {
        let mut trace = CalculationTrace::new(scope, env!("CARGO_PKG_VERSION"));
        trace.push(TraceStep::new(
            "Aggregate paired tank movement",
            json!({
                "role": role,
                "formula": role.formula_label(),
                "tank_count": tank_results.len(),
                "aggregation_policy": if precision.aggregate_from_unrounded { "ROUND_OF_EXACT_SUM" } else { "SUM_OF_REPORTED" },
                "precision": precision,
            }),
            json!({
                "total_gov": total_gov_value.to_string(),
                "total_gsv": total_gsv_value.to_string(),
                "total_weight_air": total_weight_value.to_string(),
                "warnings": warnings,
            }),
        ).with_formula(role.formula_label()));
        Some(trace)
    } else {
        None
    };

    Ok(MovementSetResult {
        role,
        tank_results,
        total_gov_movement: UnitValue::new(total_gov_value, first_gov_unit),
        total_gsv_movement: UnitValue::new(total_gsv_value, first_gsv_unit),
        total_weight_air_movement: UnitValue::new(total_weight_value, first_weight_unit),
        warnings,
        trace,
    })
}

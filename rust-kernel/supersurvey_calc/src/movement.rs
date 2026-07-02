use crate::decimal::DecimalValue;
use crate::error::{KernelError, KernelErrorCode, KernelResult};
use crate::precision::{round_decimal, PrecisionConfiguration, SystemRoundingRule};
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

    /// The role's sign convention expressed as the unified [`MovementSignRule`].
    /// This ties the operation-typed role to the persisted `movement_sign_rule`
    /// vocabulary, so the sign has one source of truth rather than two.
    pub fn implied_sign_rule(self) -> MovementSignRule {
        if self.sign_multiplier() == dec!(1) {
            MovementSignRule::ClosingMinusOpening
        } else {
            MovementSignRule::OpeningMinusClosing
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

/// The **signing convention** of a paired movement — the single source of truth
/// for the direction of a delta. Either derived from a [`MovementRole`]
/// ([`MovementRole::implied_sign_rule`]) or set explicitly from the persisted
/// `movement_sign_rule` column (`CLOSING_MINUS_OPENING | OPENING_MINUS_CLOSING |
/// CUSTOM`). `Custom` carries no fixed ±1 — the caller must supply the multiplier.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MovementSignRule {
    ClosingMinusOpening,
    OpeningMinusClosing,
    Custom,
}

impl FromStr for MovementSignRule {
    type Err = KernelError;

    fn from_str(input: &str) -> KernelResult<Self> {
        let normalized = input.trim().to_ascii_uppercase().replace(['-', ' '], "_");
        match normalized.as_str() {
            "CLOSING_MINUS_OPENING" => Ok(MovementSignRule::ClosingMinusOpening),
            "OPENING_MINUS_CLOSING" => Ok(MovementSignRule::OpeningMinusClosing),
            "CUSTOM" => Ok(MovementSignRule::Custom),
            _ => Err(KernelError::with_field(
                KernelErrorCode::InvalidMovementRole,
                format!("Unsupported movement sign rule: {input}"),
                "movement_sign_rule",
            )),
        }
    }
}

/// Resolve a sign rule to a concrete ±1 multiplier applied as `sign·(closing −
/// opening)`. `custom_sign` is required (and only consulted) for `Custom`;
/// anything but +1/−1 there is rejected rather than guessed, so a CUSTOM set can
/// never silently pick a direction.
fn resolve_sign(rule: MovementSignRule, custom_sign: Option<Decimal>) -> KernelResult<Decimal> {
    match rule {
        MovementSignRule::ClosingMinusOpening => Ok(dec!(1)),
        MovementSignRule::OpeningMinusClosing => Ok(dec!(-1)),
        MovementSignRule::Custom => match custom_sign {
            Some(m) if m == dec!(1) || m == dec!(-1) => Ok(m),
            _ => Err(KernelError::with_field(
                KernelErrorCode::InvalidMovementRole,
                "CUSTOM sign rule requires an explicit custom_sign of +1 or -1.",
                "custom_sign",
            )),
        },
    }
}

/// Human-readable formula for a resolved sign multiplier.
fn sign_formula_label(sign: Decimal) -> &'static str {
    if sign == dec!(1) {
        "Movement = Closing - Opening"
    } else {
        "Movement = Opening - Closing"
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
    /// Operation role, when the set was computed from one (`None` for a pure
    /// sign-rule / CUSTOM call).
    pub role: Option<MovementRole>,
    /// The signing convention actually applied (always present).
    pub sign_rule: MovementSignRule,
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

fn signed_difference(opening: Decimal, closing: Decimal, sign: Decimal) -> Decimal {
    sign * (closing - opening)
}

/// Core per-tank movement on an already-resolved sign multiplier (+1 →
/// closing−opening, −1 → opening−closing).
fn tank_movement_signed(
    input: TankPairedInput,
    sign: Decimal,
    precision: &PrecisionConfiguration,
) -> KernelResult<TankMovementResult> {
    ensure_same_volume_unit(input.opening.gov.unit, input.closing.gov.unit, "gov_unit")?;
    ensure_same_volume_unit(input.opening.gsv.unit, input.closing.gsv.unit, "gsv_unit")?;
    ensure_same_weight_unit(
        input.opening.weight_air.unit,
        input.closing.weight_air.unit,
        "weight_air_unit",
    )?;

    let gov_raw = signed_difference(input.opening.gov.value, input.closing.gov.value, sign);
    let gsv_raw = signed_difference(input.opening.gsv.value, input.closing.gsv.value, sign);
    let weight_raw = signed_difference(
        input.opening.weight_air.value,
        input.closing.weight_air.value,
        sign,
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
                "Calculated movement is negative ({}); review opening/closing values or the sign convention.",
                sign_formula_label(sign)
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

/// Compute one paired tank movement under an operation role.
pub fn calculate_tank_movement(
    input: TankPairedInput,
    role: MovementRole,
    precision: PrecisionConfiguration,
) -> KernelResult<TankMovementResult> {
    tank_movement_signed(input, role.sign_multiplier(), &precision)
}

/// Core aggregation over a resolved sign multiplier. `role` is optional trace
/// context; `sign_rule` is recorded on the result so a stored set shows exactly
/// which convention produced its totals.
fn movement_set_core(
    sign: Decimal,
    sign_rule: MovementSignRule,
    role: Option<MovementRole>,
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
    // §9a: the product the set opened with (first non-null). A later tank naming a
    // different product gets a soft MIXED_PRODUCT warning — aggregating distinct
    // grades into one movement is almost always a data-entry mistake.
    let first_product = tanks.iter().find_map(|t| t.product_id.clone());

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

        if let (Some(first), Some(this)) = (&first_product, &tank.product_id) {
            if first != this {
                warnings.push(MovementWarning {
                    code: "MIXED_PRODUCT".to_string(),
                    message: format!(
                        "Tank {} carries product '{}' but the set opened with '{}'; the movement aggregates mixed products.",
                        tank.tank_id, this, first
                    ),
                    tank_id: Some(tank.tank_id.clone()),
                });
            }
        }

        let gov_raw = signed_difference(tank.opening.gov.value, tank.closing.gov.value, sign);
        let gsv_raw = signed_difference(tank.opening.gsv.value, tank.closing.gsv.value, sign);
        let weight_raw = signed_difference(
            tank.opening.weight_air.value,
            tank.closing.weight_air.value,
            sign,
        );
        total_gov_unrounded += gov_raw;
        total_gsv_unrounded += gsv_raw;
        total_weight_unrounded += weight_raw;

        let tank_result = tank_movement_signed(tank, sign, &precision)?;
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
                "sign_rule": sign_rule,
                "formula": sign_formula_label(sign),
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
        ).with_formula(sign_formula_label(sign)));
        Some(trace)
    } else {
        None
    };

    Ok(MovementSetResult {
        role,
        sign_rule,
        tank_results,
        total_gov_movement: UnitValue::new(total_gov_value, first_gov_unit),
        total_gsv_movement: UnitValue::new(total_gsv_value, first_gsv_unit),
        total_weight_air_movement: UnitValue::new(total_weight_value, first_weight_unit),
        warnings,
        trace,
    })
}

/// Aggregate a movement set under an operation role (back-compatible entry point).
/// The role fixes both the sign and the reported convention.
pub fn calculate_movement_set(
    role: MovementRole,
    tanks: Vec<TankPairedInput>,
    precision: PrecisionConfiguration,
    scope: CalculationScope,
) -> KernelResult<MovementSetResult> {
    movement_set_core(
        role.sign_multiplier(),
        role.implied_sign_rule(),
        Some(role),
        tanks,
        precision,
        scope,
    )
}

// ---------------- IPC boundary (string-in / string-out) ----------------

fn default_scope_movement() -> String {
    "LIVE".to_string()
}

/// One stage's quantities for a tank (GOV / GSV / weight-in-air), as strings.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovementSnapshotDTO {
    pub gov: String,
    pub gsv: String,
    pub weight_air: String,
}

/// One paired tank (opening + closing) for a movement set.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovementTankDTO {
    pub tank_id: String,
    pub tank_name: String,
    #[serde(default)]
    pub product_id: Option<String>,
    pub opening: MovementSnapshotDTO,
    pub closing: MovementSnapshotDTO,
}

/// Movement-set request. The **sign comes from `movement_sign_rule`** (the single
/// source of truth): `CLOSING_MINUS_OPENING | OPENING_MINUS_CLOSING | CUSTOM`.
/// `role` is optional reporting context only. GOV/GSV share `volume_unit`; weight
/// uses `weight_unit`. Per-quantity decimals default to 3 when omitted.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovementSetRequestDTO {
    pub tanks: Vec<MovementTankDTO>,
    pub volume_unit: String,
    pub weight_unit: String,
    pub movement_sign_rule: String,
    /// Required iff `movement_sign_rule == CUSTOM`: "1" or "-1".
    #[serde(default)]
    pub custom_sign: Option<String>,
    /// Optional operation-role label (context/reporting; not the sign source).
    #[serde(default)]
    pub role: Option<String>,
    pub rounding_rule: String,
    #[serde(default)]
    pub intermediate_rounding: bool,
    #[serde(default)]
    pub observed_volume_decimals: Option<u32>,
    #[serde(default)]
    pub standard_volume_decimals: Option<u32>,
    #[serde(default)]
    pub weight_decimals: Option<u32>,
    /// Cross-tank aggregation policy (§9c): false = sum of reported rounded rows;
    /// true = rounded exact sum of unrounded rows.
    #[serde(default)]
    pub aggregate_from_unrounded: bool,
    #[serde(default = "default_scope_movement")]
    pub calculation_scope: String,
}

/// Per-tank movement result (string-out).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovementTankResultDTO {
    pub tank_id: String,
    pub tank_name: String,
    pub product_id: Option<String>,
    pub gov_movement: String,
    pub gsv_movement: String,
    pub weight_air_movement: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MovementSetResponseDTO {
    pub success: bool,
    pub sign_rule: Option<String>,
    pub total_gov_movement: Option<String>,
    pub total_gsv_movement: Option<String>,
    pub total_weight_air_movement: Option<String>,
    pub volume_unit: Option<String>,
    pub weight_unit: Option<String>,
    pub tanks: Option<Vec<MovementTankResultDTO>>,
    pub warnings: Option<Vec<MovementWarning>>,
    pub trace_json: Option<serde_json::Value>,
    pub errors: Option<Vec<KernelError>>,
}

impl MovementSetRequestDTO {
    pub fn calculate(&self) -> MovementSetResponseDTO {
        match self.calculate_inner() {
            Ok(r) => r,
            Err(e) => MovementSetResponseDTO {
                success: false,
                sign_rule: None,
                total_gov_movement: None,
                total_gsv_movement: None,
                total_weight_air_movement: None,
                volume_unit: None,
                weight_unit: None,
                tanks: None,
                warnings: None,
                trace_json: None,
                errors: Some(vec![e]),
            },
        }
    }

    fn calculate_inner(&self) -> KernelResult<MovementSetResponseDTO> {
        let scope = CalculationScope::from_str(&self.calculation_scope)?;
        let rounding = SystemRoundingRule::from_str(&self.rounding_rule)?;
        let vol_unit = VolumeUnit::from_str(&self.volume_unit)?;
        let wt_unit = WeightUnit::from_str(&self.weight_unit)?;

        // §9b: the sign rule is authoritative; role (if any) is only context.
        let sign_rule = MovementSignRule::from_str(&self.movement_sign_rule)?;
        let custom_sign = match &self.custom_sign {
            Some(s) => Some(DecimalValue::parse(s, "custom_sign")?.value),
            None => None,
        };
        let sign = resolve_sign(sign_rule, custom_sign)?;
        let role = match &self.role {
            Some(s) if !s.trim().is_empty() => Some(MovementRole::from_str(s)?),
            _ => None,
        };

        let precision = PrecisionConfiguration {
            intermediate_rounding: self.intermediate_rounding,
            observed_volume_decimals: self.observed_volume_decimals.unwrap_or(3),
            standard_volume_decimals: self.standard_volume_decimals.unwrap_or(3),
            weight_decimals: self.weight_decimals.unwrap_or(3),
            rounding_rule: rounding,
            aggregate_from_unrounded: self.aggregate_from_unrounded,
        };

        let mut tanks = Vec::with_capacity(self.tanks.len());
        for t in &self.tanks {
            let parse_snap = |s: &MovementSnapshotDTO| -> KernelResult<QuantitySnapshot> {
                Ok(QuantitySnapshot {
                    gov: VolumeValue::new(DecimalValue::parse(&s.gov, "gov")?.value, vol_unit),
                    gsv: VolumeValue::new(DecimalValue::parse(&s.gsv, "gsv")?.value, vol_unit),
                    weight_air: WeightValue::new(
                        DecimalValue::parse(&s.weight_air, "weight_air")?.value,
                        wt_unit,
                    ),
                })
            };
            tanks.push(TankPairedInput {
                tank_id: t.tank_id.clone(),
                tank_name: t.tank_name.clone(),
                product_id: t.product_id.clone(),
                opening: parse_snap(&t.opening)?,
                closing: parse_snap(&t.closing)?,
            });
        }

        let result = movement_set_core(sign, sign_rule, role, tanks, precision, scope)?;

        let trace_json = result
            .trace
            .as_ref()
            .map(|t| serde_json::to_value(t).unwrap_or(json!(null)));
        let sign_rule_label = serde_json::to_value(result.sign_rule)
            .ok()
            .and_then(|v| v.as_str().map(str::to_string));

        Ok(MovementSetResponseDTO {
            success: true,
            sign_rule: sign_rule_label,
            total_gov_movement: Some(result.total_gov_movement.value.normalize().to_string()),
            total_gsv_movement: Some(result.total_gsv_movement.value.normalize().to_string()),
            total_weight_air_movement: Some(
                result
                    .total_weight_air_movement
                    .value
                    .normalize()
                    .to_string(),
            ),
            volume_unit: Some(self.volume_unit.clone()),
            weight_unit: Some(self.weight_unit.clone()),
            tanks: Some(
                result
                    .tank_results
                    .iter()
                    .map(|r| MovementTankResultDTO {
                        tank_id: r.tank_id.clone(),
                        tank_name: r.tank_name.clone(),
                        product_id: r.product_id.clone(),
                        gov_movement: r.gov_movement.value.normalize().to_string(),
                        gsv_movement: r.gsv_movement.value.normalize().to_string(),
                        weight_air_movement: r.weight_air_movement.value.normalize().to_string(),
                    })
                    .collect(),
            ),
            warnings: Some(result.warnings.clone()),
            trace_json,
            errors: None,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn snap(gov: &str, gsv: &str, w: &str) -> MovementSnapshotDTO {
        MovementSnapshotDTO {
            gov: gov.into(),
            gsv: gsv.into(),
            weight_air: w.into(),
        }
    }
    fn tank_dto(
        id: &str,
        product: Option<&str>,
        o: MovementSnapshotDTO,
        c: MovementSnapshotDTO,
    ) -> MovementTankDTO {
        MovementTankDTO {
            tank_id: id.into(),
            tank_name: id.into(),
            product_id: product.map(str::to_string),
            opening: o,
            closing: c,
        }
    }
    fn base_req(
        tanks: Vec<MovementTankDTO>,
        rule: &str,
        custom: Option<&str>,
    ) -> MovementSetRequestDTO {
        MovementSetRequestDTO {
            tanks,
            volume_unit: "M3".into(),
            weight_unit: "MT".into(),
            movement_sign_rule: rule.into(),
            custom_sign: custom.map(str::to_string),
            role: None,
            rounding_rule: "HALF_UP".into(),
            intermediate_rounding: false,
            observed_volume_decimals: Some(3),
            standard_volume_decimals: Some(3),
            weight_decimals: Some(3),
            aggregate_from_unrounded: false,
            calculation_scope: "LIVE".into(),
        }
    }

    #[test]
    fn implied_sign_rule_matches_role_direction() {
        assert_eq!(
            MovementRole::Receiving.implied_sign_rule(),
            MovementSignRule::ClosingMinusOpening
        );
        assert_eq!(
            MovementRole::Delivery.implied_sign_rule(),
            MovementSignRule::OpeningMinusClosing
        );
    }

    #[test]
    fn dto_closing_minus_opening_matches_role_path() {
        let t = tank_dto(
            "1p",
            Some("vlsfo"),
            snap("100", "99", "84"),
            snap("120", "118.8", "100.8"),
        );
        let resp = base_req(vec![t], "CLOSING_MINUS_OPENING", None).calculate();
        assert!(resp.success, "{:?}", resp.errors);
        assert_eq!(resp.total_gov_movement.as_deref(), Some("20"));
        assert_eq!(resp.sign_rule.as_deref(), Some("CLOSING_MINUS_OPENING"));
    }

    #[test]
    fn dto_custom_sign_negates() {
        let t = tank_dto(
            "1p",
            None,
            snap("100", "99", "84"),
            snap("120", "118.8", "100.8"),
        );
        // custom_sign = -1 → opening − closing → −20
        let resp = base_req(vec![t], "CUSTOM", Some("-1")).calculate();
        assert!(resp.success, "{:?}", resp.errors);
        assert_eq!(resp.total_gov_movement.as_deref(), Some("-20"));
        assert_eq!(resp.sign_rule.as_deref(), Some("CUSTOM"));
    }

    #[test]
    fn dto_custom_without_sign_errors() {
        let t = tank_dto(
            "1p",
            None,
            snap("100", "99", "84"),
            snap("120", "118.8", "100.8"),
        );
        let resp = base_req(vec![t], "CUSTOM", None).calculate();
        assert!(!resp.success);
        assert_eq!(
            resp.errors.as_ref().unwrap()[0].field.as_deref(),
            Some("custom_sign")
        );
    }

    #[test]
    fn dto_mixed_product_warns() {
        let a = tank_dto(
            "1p",
            Some("vlsfo"),
            snap("0", "0", "0"),
            snap("10", "10", "8"),
        );
        let b = tank_dto("2p", Some("mgo"), snap("0", "0", "0"), snap("5", "5", "4"));
        let resp = base_req(vec![a, b], "CLOSING_MINUS_OPENING", None).calculate();
        assert!(resp.success, "{:?}", resp.errors);
        let warns = resp.warnings.unwrap();
        assert!(
            warns.iter().any(|w| w.code == "MIXED_PRODUCT"),
            "expected MIXED_PRODUCT, got {warns:?}"
        );
    }

    #[test]
    fn dto_aggregate_from_unrounded_changes_last_decimal() {
        let mk = || {
            vec![
                tank_dto(
                    "1p",
                    None,
                    snap("0", "0", "0"),
                    snap("1.2344", "1.2344", "1.2344"),
                ),
                tank_dto(
                    "1s",
                    None,
                    snap("0", "0", "0"),
                    snap("1.2344", "1.2344", "1.2344"),
                ),
            ]
        };
        let reported = base_req(mk(), "CLOSING_MINUS_OPENING", None);
        let mut exact = base_req(mk(), "CLOSING_MINUS_OPENING", None);
        exact.aggregate_from_unrounded = true;
        assert_eq!(
            reported.calculate().total_gsv_movement.as_deref(),
            Some("2.468")
        );
        assert_eq!(
            exact.calculate().total_gsv_movement.as_deref(),
            Some("2.469")
        );
    }
}

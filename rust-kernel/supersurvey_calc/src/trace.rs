use crate::error::{KernelError, KernelErrorCode, KernelResult};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::str::FromStr;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CalculationScope {
    Live,
    Save,
    Export,
    QaTest,
    TraceView,
}

impl CalculationScope {
    pub fn requires_full_trace(&self) -> bool {
        !matches!(self, CalculationScope::Live)
    }
}

impl FromStr for CalculationScope {
    type Err = KernelError;
    fn from_str(input: &str) -> KernelResult<Self> {
        match input.trim().to_ascii_uppercase().as_str() {
            "LIVE" => Ok(CalculationScope::Live),
            "SAVE" => Ok(CalculationScope::Save),
            "EXPORT" => Ok(CalculationScope::Export),
            "QA_TEST" => Ok(CalculationScope::QaTest),
            "TRACE_VIEW" => Ok(CalculationScope::TraceView),
            _ => Err(KernelError::with_field(
                KernelErrorCode::InvalidScope,
                format!("Unsupported calculation scope: {input}"),
                "calculation_scope",
            )),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TraceStep {
    pub step_id: String,
    pub label: String,
    pub formula: Option<String>,
    pub inputs_json: Value,
    pub output_json: Value,
    pub notes: Option<String>,
}

impl TraceStep {
    pub fn new(label: impl Into<String>, inputs_json: Value, output_json: Value) -> Self {
        Self {
            step_id: Uuid::new_v4().to_string(),
            label: label.into(),
            formula: None,
            inputs_json,
            output_json,
            notes: None,
        }
    }

    pub fn with_formula(mut self, formula: impl Into<String>) -> Self {
        self.formula = Some(formula.into());
        self
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CalculationTrace {
    pub trace_id: String,
    pub calculation_scope: CalculationScope,
    pub engine_version: String,
    pub steps: Vec<TraceStep>,
}

impl CalculationTrace {
    pub fn new(calculation_scope: CalculationScope, engine_version: impl Into<String>) -> Self {
        Self {
            trace_id: Uuid::new_v4().to_string(),
            calculation_scope,
            engine_version: engine_version.into(),
            steps: Vec::new(),
        }
    }

    pub fn push(&mut self, step: TraceStep) {
        self.steps.push(step);
    }
}

pub fn enforce_trace_policy(
    scope: CalculationScope,
    trace: Option<&CalculationTrace>,
) -> KernelResult<()> {
    if scope.requires_full_trace() && trace.map(|t| t.steps.is_empty()).unwrap_or(true) {
        return Err(KernelError::new(
            KernelErrorCode::MissingRequiredTrace,
            format!("Full trace is required for scope {:?}", scope),
        ));
    }
    Ok(())
}

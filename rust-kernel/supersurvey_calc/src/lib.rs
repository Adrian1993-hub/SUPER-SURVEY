//! SuperSurvey Calculation Kernel v0.1 — Sprint 1C.
//!
//! Scope:
//! - strict DTO boundary for Tauri/TypeScript IPC payloads;
//! - decimal-safe unit conversions;
//! - basic quantity chain: TOV - FW = GOV; GOV * VCF = GSV; GSV * WCF = Weight Air;
//! - paired movement aggregation: opening/closing and delivery/receiving sign conventions;
//! - trace generation for SAVE/EXPORT/QA_TEST/TRACE_VIEW;
//! - ASTM D1250-80 metric tables by equation: 54A/54B VCF + 56 WCF (`astm`),
//!   validated against a real BQS worksheet (see tests); D1250-04 revision pending;
//! - source comparison engine with layered tolerances + NOAD/LOP recommendation
//!   (`comparison`: Vessel vs Barge vs BDN on weight in air);
//! - no tank calibration interpolation yet.
//!
//! Important policy:
//! - TypeScript sends numeric values as strings only;
//! - Rust parses to Decimal and performs official calculations;
//! - LIVE calculations may return compact/no trace;
//! - SAVE/EXPORT/QA_TEST/TRACE_VIEW must return full trace.

pub mod astm;
pub mod comparison;
pub mod conversions;
pub mod decimal;
pub mod dto;
pub mod error;
pub mod movement;
pub mod precision;
pub mod quantity_chain;
pub mod trace;
pub mod units;
pub mod value;

pub mod prelude {
    pub use crate::astm::*;
    pub use crate::comparison::*;
    pub use crate::conversions::*;
    pub use crate::decimal::*;
    pub use crate::dto::*;
    pub use crate::error::*;
    pub use crate::movement::*;
    pub use crate::precision::*;
    pub use crate::quantity_chain::*;
    pub use crate::trace::*;
    pub use crate::units::*;
    pub use crate::value::*;
    pub use rust_decimal::Decimal;
}

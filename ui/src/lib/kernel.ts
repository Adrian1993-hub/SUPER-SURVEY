// Single source of truth for calculations in the UI: the SAME Rust calc kernel
// (supersurvey_calc) compiled to WASM. No ASTM / VCF / WCF math is ever
// reimplemented in TypeScript — both the browser demo and the desktop app run
// these exact, worksheet-validated equations. (On the desktop, *persisting* a
// result additionally goes through Tauri + SQLite; that lives in ./ipc.ts.)
//
// The generated glue in ../wasm/ is committed, so `npm run build` needs no Rust
// toolchain. Regenerate it with scripts/build-wasm.sh when the kernel changes.

import init, { bqs_calculate_row, compare_sources, kernel_version } from '../wasm/supersurvey_wasm.js'
import wasmUrl from '../wasm/supersurvey_wasm_bg.wasm?url'

let ready: Promise<void> | null = null
function ensureReady(): Promise<void> {
  if (!ready) ready = init({ module_or_path: wasmUrl }).then(() => undefined)
  return ready
}

/** Friendly inputs for one BQS tank row. Defaults mirror the SAT worksheet. */
export interface BqsRowInput {
  density15: number // kg/L @ 15 °C
  temperature: number // °C
  tov: number // m³ (table volume, trim/list already applied)
  freeWater?: number // m³
  table?: '54A' | '54B'
  scope?: 'LIVE' | 'TRACE_VIEW' | 'SAVE'
  intermediateRounding?: boolean
  observedVolumeDecimals?: number
  standardVolumeDecimals?: number
  weightDecimals?: number
  roundingRule?: 'HALF_UP' | 'HALF_EVEN'
}

/** Calculated row (string-decimals, parsed to Decimal only inside Rust). */
export interface BqsRowResult {
  success: boolean
  vcf?: string
  productGroup?: string
  gov?: string
  gsv?: string
  volumeUnit?: string
  wcfAir?: string
  mtAir?: string
  mtVacuum?: string
  trace?: unknown
  errors?: { code?: string; message?: string }[]
}

/** Build the kernel's string-in DTO from friendly inputs (also used by ./ipc save). */
export function bqsRowRequest(i: BqsRowInput) {
  return {
    calculation_scope: i.scope ?? 'LIVE',
    density15_value: String(i.density15),
    density15_unit: 'KG_PER_L',
    temperature_value: String(i.temperature),
    temperature_unit: 'CELSIUS',
    tov_value: String(i.tov),
    tov_unit: 'CUBIC_METERS',
    free_water_value: String(i.freeWater ?? 0),
    free_water_unit: 'CUBIC_METERS',
    astm_table: i.table ?? '54B',
    rounding_rule: i.roundingRule ?? 'HALF_UP',
    intermediate_rounding: i.intermediateRounding ?? true,
    observed_volume_decimals: i.observedVolumeDecimals ?? 3,
    standard_volume_decimals: i.standardVolumeDecimals ?? 3,
    weight_decimals: i.weightDecimals ?? 3,
  }
}

interface RawResponse {
  success: boolean
  vcf?: string
  product_group?: string
  gov_value?: string
  gsv_value?: string
  volume_unit?: string
  wcf_air?: string
  mt_air_value?: string
  mt_vacuum_value?: string
  trace_json?: unknown
  errors?: { code?: string; message?: string }[]
}

/** Compute one BQS tank row with the WASM kernel. */
export async function calcBqsRow(input: BqsRowInput): Promise<BqsRowResult> {
  await ensureReady()
  const raw = bqs_calculate_row(JSON.stringify(bqsRowRequest(input)))
  const r = JSON.parse(raw) as RawResponse
  return {
    success: r.success,
    vcf: r.vcf,
    productGroup: r.product_group,
    gov: r.gov_value,
    gsv: r.gsv_value,
    volumeUnit: r.volume_unit,
    wcfAir: r.wcf_air,
    mtAir: r.mt_air_value,
    mtVacuum: r.mt_vacuum_value,
    trace: r.trace_json,
    errors: r.errors,
  }
}

let cachedVersion: string | null = null
/** The calc kernel version (the math, not the UI). */
export async function kernelVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion
  await ensureReady()
  cachedVersion = kernel_version()
  return cachedVersion
}

// ---- Source comparison (Vessel vs Barge vs BDN -> NONE / NOAD / LOP) ----

export type RecommendedAction = 'NONE' | 'ISSUE_NOAD' | 'ISSUE_LOP'

export interface ComparisonSourceInput {
  name: string
  quantity: number
  unit?: string // weight unit; default MT
}
export interface ToleranceLayerInput {
  name: string
  basis?: string
  limitPct: number // e.g. 0.30 means ±0.30 %
}
export interface CompareInput {
  sources: ComparisonSourceInput[]
  layers: ToleranceLayerInput[]
  targetUnit?: string
  scope?: 'LIVE' | 'TRACE_VIEW'
  weightDecimals?: number
  roundingRule?: 'HALF_UP' | 'HALF_EVEN'
}

export interface ComparisonLayerResult {
  name: string
  basis: string
  limitPct: string
  within: boolean
  marginPct: string
}
export interface ComparisonPair {
  sourceA: string
  sourceB: string
  valueA: string
  valueB: string
  delta: string
  deltaPct: string
  withinAll: boolean
  layers: ComparisonLayerResult[]
}
export interface ComparisonResult {
  success: boolean
  unit?: string
  recommendedAction?: RecommendedAction
  worstDeltaPct?: string
  exceeded?: boolean
  pairs?: ComparisonPair[]
  trace?: unknown
  errors?: { code?: string; message?: string }[]
}

interface RawCompareLayer {
  name: string
  basis: string
  limit_pct: string
  within: boolean
  margin_pct: string
}
interface RawComparePair {
  source_a: string
  source_b: string
  value_a: string
  value_b: string
  delta: string
  delta_pct: string
  within_all: boolean
  layers: RawCompareLayer[]
}
interface RawCompareResponse {
  success: boolean
  unit?: string
  recommended_action?: RecommendedAction
  worst_delta_pct?: string
  exceeded?: boolean
  pairs?: RawComparePair[]
  trace_json?: unknown
  errors?: { code?: string; message?: string }[]
}

/** Compare custody figures with the kernel; returns NONE / NOAD / LOP. */
export async function compareSources(input: CompareInput): Promise<ComparisonResult> {
  await ensureReady()
  const req = {
    calculation_scope: input.scope ?? 'LIVE',
    sources: input.sources.map((s) => ({
      name: s.name,
      quantity_value: String(s.quantity),
      quantity_unit: s.unit ?? 'MT',
    })),
    layers: input.layers.map((l) => ({ name: l.name, basis: l.basis ?? '', limit_pct: String(l.limitPct) })),
    target_unit: input.targetUnit ?? 'MT',
    rounding_rule: input.roundingRule ?? 'HALF_UP',
    weight_decimals: input.weightDecimals ?? 3,
  }
  const r = JSON.parse(compare_sources(JSON.stringify(req))) as RawCompareResponse
  return {
    success: r.success,
    unit: r.unit,
    recommendedAction: r.recommended_action,
    worstDeltaPct: r.worst_delta_pct,
    exceeded: r.exceeded,
    pairs: r.pairs?.map((p) => ({
      sourceA: p.source_a,
      sourceB: p.source_b,
      valueA: p.value_a,
      valueB: p.value_b,
      delta: p.delta,
      deltaPct: p.delta_pct,
      withinAll: p.within_all,
      layers: p.layers.map((l) => ({
        name: l.name,
        basis: l.basis,
        limitPct: l.limit_pct,
        within: l.within,
        marginPct: l.margin_pct,
      })),
    })),
    trace: r.trace_json,
    errors: r.errors,
  }
}

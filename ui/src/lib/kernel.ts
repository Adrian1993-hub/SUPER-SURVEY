// Single source of truth for calculations in the UI: the SAME Rust calc kernel
// (supersurvey_calc) compiled to WASM. No ASTM / VCF / WCF math is ever
// reimplemented in TypeScript — both the browser demo and the desktop app run
// these exact, worksheet-validated equations. (On the desktop, *persisting* a
// result additionally goes through Tauri + SQLite; that lives in ./ipc.ts.)
//
// The generated glue in ../wasm/ is committed, so `npm run build` needs no Rust
// toolchain. Regenerate it with scripts/build-wasm.sh when the kernel changes.

import init, { bqs_calculate_row, bqs_calculate_row_imperial, compare_sources, density_tool, vef_calculate, sw_deduction, pro_rata, sampling_levels, custody_figure, draft_survey, hydrostatic_interpolate, kernel_version } from '../wasm/supersurvey_wasm.js'
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
  /** Edición de tablas: D1250-80 (def., VCF 4 dp) o D1250-04 (API MPMS 11.1, 5 dp). */
  tableVersion?: 'D1250_80' | 'D1250_04'
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
  tableVersion?: string
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
    table_version: i.tableVersion ?? 'D1250_80',
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
  table_version?: string
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
    tableVersion: r.table_version,
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

// ---- Imperial BQS row (US-customary 60 °F: API + barrels + Tables 6A/6B/13) ----

/** Friendly inputs for one imperial tank row. */
export interface ImperialRowInput {
  api: number // API gravity @ 60 °F
  temperature: number
  temperatureUnit?: 'CELSIUS' | 'FAHRENHEIT' // default CELSIUS
  volume: number
  volumeUnit?: 'CUBIC_METERS' | 'US_BARRELS' // default CUBIC_METERS
  freeWater?: number
  table?: '6A' | '6B'
  scope?: 'LIVE' | 'TRACE_VIEW' | 'SAVE'
}

export interface ImperialRowResult {
  success: boolean
  vcf?: string
  productGroup?: string
  temp68F?: string
  density60?: string
  govBbl?: string
  gsvBbl?: string
  wcf13?: string
  mtAir?: string
  mtVacuum?: string
  trace?: unknown
  errors?: { code?: string; message?: string }[]
}

interface RawImperialResponse {
  success: boolean
  vcf?: string
  product_group?: string
  temp68_f?: string
  density60_kg_m3?: string
  gov_bbl?: string
  gsv_bbl?: string
  wcf13?: string
  mt_air?: string
  mt_vacuum?: string
  trace_json?: unknown
  errors?: { code?: string; message?: string }[]
}

/** Compute one imperial (60 °F) BQS tank row with the WASM kernel. */
export async function calcImperialRow(input: ImperialRowInput): Promise<ImperialRowResult> {
  await ensureReady()
  const req = {
    calculation_scope: input.scope ?? 'LIVE',
    api_value: String(input.api),
    temperature_value: String(input.temperature),
    temperature_unit: input.temperatureUnit ?? 'CELSIUS',
    volume_value: String(input.volume),
    volume_unit: input.volumeUnit ?? 'CUBIC_METERS',
    free_water_value: String(input.freeWater ?? 0),
    free_water_unit: input.volumeUnit ?? 'CUBIC_METERS',
    astm_table: input.table ?? '6B',
    rounding_rule: 'HALF_UP',
    gsv_decimals: 2,
    weight_decimals: 3,
  }
  const r = JSON.parse(bqs_calculate_row_imperial(JSON.stringify(req))) as RawImperialResponse
  return {
    success: r.success,
    vcf: r.vcf,
    productGroup: r.product_group,
    temp68F: r.temp68_f,
    density60: r.density60_kg_m3,
    govBbl: r.gov_bbl,
    gsvBbl: r.gsv_bbl,
    wcf13: r.wcf13,
    mtAir: r.mt_air,
    mtVacuum: r.mt_vacuum,
    trace: r.trace_json,
    errors: r.errors,
  }
}

// ---- Vessel Experience Factor (API MPMS 17.9 / HM49) --------------------

export interface VefVoyageInput {
  label: string
  sailingTcv: number
  obq?: number
  shoreTcv: number
  rejected?: boolean
  rejectionReason?: string
}
export interface VefApplicationInput {
  name: string
  role: 'LOAD' | 'DISCHARGE'
  vesselQty: number
  shoreQty: number
}
export interface VefInput {
  voyages: VefVoyageInput[]
  applications?: VefApplicationInput[]
  qualifyingBandPct?: number // default 0.30
  scope?: 'LIVE' | 'TRACE_VIEW' | 'SAVE'
}

export interface VefVoyageResult {
  label: string
  vesselTcv: string
  shoreTcv: string
  ratio?: string
  rejected: boolean
  qualifying: boolean
  note?: string
}
export interface VefApplicationResult {
  name: string
  role: string
  vesselQty: string
  shoreQty: string
  vefApplied: string
  difference: string
  differencePct: string
}
export interface VefResult {
  success: boolean
  voyageCount?: number
  qualifyingCount?: number
  firstAverage?: string
  bandLow?: string
  bandHigh?: string
  secondAverage?: string
  vef?: string
  voyages?: VefVoyageResult[]
  applications?: VefApplicationResult[]
  warnings?: string[]
  trace?: unknown
  errors?: { code?: string; message?: string }[]
}

interface RawVefResponse {
  success: boolean
  voyage_count?: number
  qualifying_count?: number
  first_average?: string
  band_low?: string
  band_high?: string
  second_average?: string
  vef?: string
  voyages?: {
    label: string
    vessel_tcv: string
    shore_tcv: string
    ratio?: string
    rejected: boolean
    qualifying: boolean
    note?: string
  }[]
  applications?: {
    name: string
    role: string
    vessel_qty: string
    shore_qty: string
    vef_applied: string
    difference: string
    difference_pct: string
  }[]
  warnings?: string[]
  trace_json?: unknown
  errors?: { code?: string; message?: string }[]
}

/** Compute a Vessel Experience Factor (and apply it) with the WASM kernel. */
export async function calcVef(input: VefInput): Promise<VefResult> {
  await ensureReady()
  const req = {
    voyages: input.voyages.map((v) => ({
      label: v.label,
      sailing_tcv: String(v.sailingTcv),
      obq: v.obq !== undefined ? String(v.obq) : undefined,
      shore_tcv: String(v.shoreTcv),
      rejected: v.rejected ?? false,
      rejection_reason: v.rejectionReason,
    })),
    applications: (input.applications ?? []).map((a) => ({
      name: a.name,
      role: a.role,
      vessel_qty: String(a.vesselQty),
      shore_qty: String(a.shoreQty),
    })),
    qualifying_band_pct: String(input.qualifyingBandPct ?? 0.3),
    calculation_scope: input.scope ?? 'LIVE',
  }
  const r = JSON.parse(vef_calculate(JSON.stringify(req))) as RawVefResponse
  return {
    success: r.success,
    voyageCount: r.voyage_count,
    qualifyingCount: r.qualifying_count,
    firstAverage: r.first_average,
    bandLow: r.band_low,
    bandHigh: r.band_high,
    secondAverage: r.second_average,
    vef: r.vef,
    voyages: r.voyages?.map((v) => ({
      label: v.label,
      vesselTcv: v.vessel_tcv,
      shoreTcv: v.shore_tcv,
      ratio: v.ratio,
      rejected: v.rejected,
      qualifying: v.qualifying,
      note: v.note,
    })),
    applications: r.applications?.map((a) => ({
      name: a.name,
      role: a.role,
      vesselQty: a.vessel_qty,
      shoreQty: a.shore_qty,
      vefApplied: a.vef_applied,
      difference: a.difference,
      differencePct: a.difference_pct,
    })),
    warnings: r.warnings,
    trace: r.trace_json,
    errors: r.errors,
  }
}

// ---- Custody helpers: S&W deduction + pro-rata --------------------------

export interface SwResult {
  success: boolean
  gross?: string
  sw?: string
  net?: string
  errors?: { code?: string; message?: string }[]
}

/** S&W deduction (crude): gross → S&W + net via the kernel. */
export async function swDeduction(grossValue: number, swPct: number, decimals = 3): Promise<SwResult> {
  await ensureReady()
  const req = { gross_value: String(grossValue), sw_pct: String(swPct), decimals, rounding_rule: 'HALF_UP', calculation_scope: 'LIVE' }
  const r = JSON.parse(sw_deduction(JSON.stringify(req))) as { success: boolean; gross?: string; sw?: string; net?: string; errors?: { code?: string; message?: string }[] }
  return { success: r.success, gross: r.gross, sw: r.sw, net: r.net, errors: r.errors }
}

export interface ProRataParcelResult {
  label: string
  weight: string
  share: string
  pct: string
}
export interface ProRataResult {
  success: boolean
  total?: string
  parcels?: ProRataParcelResult[]
  errors?: { code?: string; message?: string }[]
}

/** Pro-rata split of a total across labelled parcels (sums exactly to total). */
export async function proRata(total: number, parcels: { label: string; weight: number }[], decimals = 3): Promise<ProRataResult> {
  await ensureReady()
  const req = {
    total_value: String(total),
    parcels: parcels.map((p) => ({ label: p.label, weight: String(p.weight) })),
    decimals,
    rounding_rule: 'HALF_UP',
    calculation_scope: 'LIVE',
  }
  const r = JSON.parse(pro_rata(JSON.stringify(req))) as {
    success: boolean
    total?: string
    parcels?: ProRataParcelResult[]
    errors?: { code?: string; message?: string }[]
  }
  return { success: r.success, total: r.total, parcels: r.parcels, errors: r.errors }
}

// ---- Tank sampling levels (upper / middle / lower) ----------------------

export interface SamplingTankInput {
  tank: string
  referenceHeight: number
  ullage: number
}
export interface SamplingTankResult {
  tank: string
  referenceHeight: string
  ullage: string
  innage?: string
  upper?: string
  middle?: string
  lower?: string
  upperHeight?: string
  middleHeight?: string
  lowerHeight?: string
  error?: string
}
export interface SamplingResult {
  success: boolean
  tanks?: SamplingTankResult[]
  errors?: { code?: string; message?: string }[]
}

/** Upper/middle/lower sampling dip levels for a set of tanks (kernel). */
export async function samplingLevels(tanks: SamplingTankInput[], decimals = 3): Promise<SamplingResult> {
  await ensureReady()
  const req = {
    tanks: tanks.map((t) => ({ tank: t.tank, reference_height: String(t.referenceHeight), ullage: String(t.ullage) })),
    decimals,
    rounding_rule: 'HALF_UP',
  }
  const r = JSON.parse(sampling_levels(JSON.stringify(req))) as {
    success: boolean
    tanks?: {
      tank: string; reference_height: string; ullage: string
      innage?: string; upper?: string; middle?: string; lower?: string
      upper_height?: string; middle_height?: string; lower_height?: string; error?: string
    }[]
    errors?: { code?: string; message?: string }[]
  }
  return {
    success: r.success,
    tanks: r.tanks?.map((t) => ({
      tank: t.tank,
      referenceHeight: t.reference_height,
      ullage: t.ullage,
      innage: t.innage,
      upper: t.upper,
      middle: t.middle,
      lower: t.lower,
      upperHeight: t.upper_height,
      middleHeight: t.middle_height,
      lowerHeight: t.lower_height,
      error: t.error,
    })),
    errors: r.errors,
  }
}

// ---- Multi-unit custody figure (bbl/gal/m³/L @60,@15 + MT/LT, TCV/GSV/NSV) ----

export interface UnitSet {
  bbl60: string
  gal60: string
  m3_60: string
  l_60: string
  m3_15: string
  l_15: string
  mt_air: string
  mt_vac: string
  lt_air: string
}
export interface CustodyFigureResult {
  success: boolean
  tcv?: UnitSet
  gsv?: UnitSet
  nsv?: UnitSet
  errors?: { code?: string; message?: string }[]
}

export interface CustodyFigureInput {
  /** GSV at the standard base. */
  gsv: number
  /** 'M3_15' (default) or 'BBL_60'. */
  gsvUnit?: 'M3_15' | 'BBL_60'
  density15: number
  density15Unit?: 'KG_L' | 'KG_M3'
  swPct?: number
  freeWater?: number
}

/** Expand one standard volume into all reported units (TCV/GSV/NSV) via the kernel. */
export async function custodyFigure(input: CustodyFigureInput): Promise<CustodyFigureResult> {
  await ensureReady()
  const req = {
    gsv_value: String(input.gsv),
    gsv_unit: input.gsvUnit ?? 'M3_15',
    density15_value: String(input.density15),
    density15_unit: input.density15Unit ?? 'KG_L',
    sw_pct: input.swPct !== undefined ? String(input.swPct) : undefined,
    free_water_value: input.freeWater !== undefined ? String(input.freeWater) : undefined,
  }
  const r = JSON.parse(custody_figure(JSON.stringify(req))) as CustodyFigureResult
  return r
}

// ---- Draft survey (bulk cargo by displacement) --------------------------

export interface DraftConditionInput {
  forward: number
  aft: number
  midship: number
  lbp: number
  density: number
  displacementQM: number
  tpc: number
  lcf: number
  mtcPerMetre: number
  deductibles?: number
}
export interface DraftConditionResult {
  quarterMean: string
  trim: string
  firstTrimCorrection: string
  secondTrimCorrection: string
  displacementCorrectedForTrim: string
  densityCorrection: string
  displacementCorrectedForDensity: string
  netDisplacement: string
}
export interface DraftSurveyResult {
  success: boolean
  initial?: DraftConditionResult
  final?: DraftConditionResult
  cargo?: string
  errors?: { code?: string; message?: string }[]
}

const draftDto = (c: DraftConditionInput) => ({
  forward_corrected: String(c.forward),
  aft_corrected: String(c.aft),
  midship_corrected: String(c.midship),
  lbp: String(c.lbp),
  sea_water_density: String(c.density),
  displacement_at_quarter_mean: String(c.displacementQM),
  tpc: String(c.tpc),
  lcf: String(c.lcf),
  mtc_per_metre: String(c.mtcPerMetre),
  total_deductibles: String(c.deductibles ?? 0),
})

interface RawDraftCond {
  quarter_mean: string; trim: string; first_trim_correction: string; second_trim_correction: string
  displacement_corrected_for_trim: string; density_correction: string
  displacement_corrected_for_density: string; net_displacement: string
}
const fromDraftCond = (r?: RawDraftCond): DraftConditionResult | undefined =>
  r && {
    quarterMean: r.quarter_mean,
    trim: r.trim,
    firstTrimCorrection: r.first_trim_correction,
    secondTrimCorrection: r.second_trim_correction,
    displacementCorrectedForTrim: r.displacement_corrected_for_trim,
    densityCorrection: r.density_correction,
    displacementCorrectedForDensity: r.displacement_corrected_for_density,
    netDisplacement: r.net_displacement,
  }

/** Draft survey: two conditions → per-condition results + cargo by difference. */
export async function draftSurvey(initial: DraftConditionInput, final: DraftConditionInput, operation: 'LOAD' | 'DISCHARGE'): Promise<DraftSurveyResult> {
  await ensureReady()
  const req = { initial: draftDto(initial), final: draftDto(final), operation, decimals: 3 }
  const r = JSON.parse(draft_survey(JSON.stringify(req))) as {
    success: boolean; initial?: RawDraftCond; final?: RawDraftCond; cargo?: string; errors?: { code?: string; message?: string }[]
  }
  return { success: r.success, initial: fromDraftCond(r.initial), final: fromDraftCond(r.final), cargo: r.cargo, errors: r.errors }
}

export interface HydrostaticRowInput {
  draft: number
  displacement: number
  tpc: number
  lcf: number
  mtcPerMetre: number
}
export interface HydrostaticInterpolation {
  success: boolean
  displacement?: string
  tpc?: string
  lcf?: string
  mtcPerMetre?: string
  errors?: { code?: string; message?: string }[]
}

/** Interpolate a vessel's hydrostatic table at a draft (kernel). */
export async function hydrostaticInterpolate(rows: HydrostaticRowInput[], draft: number): Promise<HydrostaticInterpolation> {
  await ensureReady()
  const req = {
    rows: rows.map((r) => ({ draft: String(r.draft), displacement: String(r.displacement), tpc: String(r.tpc), lcf: String(r.lcf), mtc_per_metre: String(r.mtcPerMetre) })),
    draft: String(draft),
    decimals: 3,
  }
  const r = JSON.parse(hydrostatic_interpolate(JSON.stringify(req))) as {
    success: boolean; displacement?: string; tpc?: string; lcf?: string; mtc_per_metre?: string; errors?: { code?: string; message?: string }[]
  }
  return { success: r.success, displacement: r.displacement, tpc: r.tpc, lcf: r.lcf, mtcPerMetre: r.mtc_per_metre, errors: r.errors }
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

// ---- Density utilities (API <-> rho15, observed rho@t <-> rho15, blend) ----

export type DensityOperation = 'API_TO_RHO15' | 'RHO15_TO_API' | 'OBSERVED_TO_RHO15' | 'RHO15_TO_OBSERVED' | 'BLEND'

export interface DensityToolInput {
  operation: DensityOperation
  /** API gravity o densidad (kg/L) según la operación. */
  value?: number
  /** Temperatura de observación (°C) para las operaciones OBSERVED/RHO15_TO_OBSERVED. */
  temperature?: number
  table?: '54A' | '54B'
  /** Parcelas para BLEND: volumen m³ @15 °C + densidad kg/L @15 °C. */
  parcels?: { volume: number; density15: number }[]
  scope?: 'LIVE' | 'TRACE_VIEW'
}

export interface DensityToolResult {
  success: boolean
  operation?: string
  api?: string
  sg60?: string
  rho15KgL?: string
  rho15KgM3?: string
  observedKgL?: string
  totalVolumeM3?: string
  totalMtVacuum?: string
  trace?: unknown
  errors?: { code?: string; message?: string }[]
}

interface RawDensityResponse {
  success: boolean
  operation?: string
  api?: string
  sg60?: string
  rho15_kg_l?: string
  rho15_kg_m3?: string
  observed_kg_l?: string
  total_volume_m3?: string
  total_mt_vacuum?: string
  trace_json?: unknown
  errors?: { code?: string; message?: string }[]
}

/** Density conversions/blending via the kernel (no math in TS). */
export async function densityTool(input: DensityToolInput): Promise<DensityToolResult> {
  await ensureReady()
  const req = {
    operation: input.operation,
    value: input.value !== undefined ? String(input.value) : undefined,
    density15_unit: 'KG_L',
    temperature_value: input.temperature !== undefined ? String(input.temperature) : undefined,
    temperature_unit: 'CELSIUS',
    astm_table: input.table ?? '54B',
    parcels: (input.parcels ?? []).map((p) => ({
      volume_value: String(p.volume),
      density15_value: String(p.density15),
    })),
    calculation_scope: input.scope ?? 'LIVE',
  }
  const r = JSON.parse(density_tool(JSON.stringify(req))) as RawDensityResponse
  return {
    success: r.success,
    operation: r.operation,
    api: r.api,
    sg60: r.sg60,
    rho15KgL: r.rho15_kg_l,
    rho15KgM3: r.rho15_kg_m3,
    observedKgL: r.observed_kg_l,
    totalVolumeM3: r.total_volume_m3,
    totalMtVacuum: r.total_mt_vacuum,
    trace: r.trace_json,
    errors: r.errors,
  }
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

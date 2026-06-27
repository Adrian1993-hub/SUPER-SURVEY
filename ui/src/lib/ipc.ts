// Desktop bridge (Tauri). Calculation runs everywhere via WASM (./kernel);
// PERSISTENCE needs SQLite, which only exists in the packaged desktop app — so
// these calls are gated on the Tauri runtime and throw a clear message in the
// browser demo. Inside Tauri the row is recomputed by the native kernel before
// it is written, so a stored number is always traceable to its inputs.

import { bqsRowRequest, type BqsRowInput } from './kernel'

/** True when running inside the Tauri desktop shell (not the browser demo). */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isDesktop()) {
    throw new Error('Esta acción requiere la app de escritorio SuperSurvey (almacenamiento local).')
  }
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(cmd, args)
}

export interface SaveMeasurementInput {
  jobRef: string
  moduleTitle: string
  rows: BqsRowInput[]
  operationFamily?: string
  operationType?: string
  reportRef?: string | null
  clientRef?: string | null
  portName?: string | null
  moduleType?: string
  role?: string
  movementSignRule?: string
}

export interface SaveMeasurementResult {
  jobId: string
  measurementSetId: string
  saved: number
  skipped: number
}

/** Persist a worksheet section (job + set + one append-only log per row). */
export async function saveMeasurement(input: SaveMeasurementInput): Promise<SaveMeasurementResult> {
  // snake_case throughout: Tauri only converts the top-level arg key, serde
  // deserializes the nested structs by their (snake_case) field names.
  const args = {
    job_ref: input.jobRef,
    operation_family: input.operationFamily ?? 'BQS',
    operation_type: input.operationType ?? 'BUNKER_LOADING',
    report_ref: input.reportRef ?? null,
    client_ref: input.clientRef ?? null,
    port_name: input.portName ?? null,
    module_type: input.moduleType ?? 'VMR',
    module_title: input.moduleTitle,
    role: input.role ?? 'RECEIVING',
    movement_sign_rule: input.movementSignRule ?? 'CLOSING_MINUS_OPENING',
    rows: input.rows.map((r) => bqsRowRequest({ ...r, scope: 'SAVE' })),
  }
  const res = await invoke<{
    job_id: string
    measurement_set_id: string
    saved: number
    skipped: number
  }>('save_measurement', { args })
  return {
    jobId: res.job_id,
    measurementSetId: res.measurement_set_id,
    saved: res.saved,
    skipped: res.skipped,
  }
}

// ---- Load (desktop SQLite reads) ----------------------------------------

export interface StoredJob {
  id: string
  jobRef: string
  operationFamily: string
  operationType: string
  portName: string | null
  reportRef: string | null
  clientRef: string | null
  createdAt: string
  updatedAt: string
  activeLogCount: number
}
export interface StoredMeasurementSet {
  id: string
  moduleType: string
  title: string
  role: string
  status: string
  createdAt: string
}
export interface StoredCalcLog {
  id: string
  measurementSetId: string | null
  calculationType: string
  calculationScope: string
  engineVersion: string
  inputSnapshotJson: string
  outputSnapshotJson: string
  createdAt: string
}
export interface JobDetail {
  job: StoredJob
  sets: StoredMeasurementSet[]
  logs: StoredCalcLog[]
}

interface RawJob {
  id: string
  job_ref: string
  operation_family: string
  operation_type: string
  port_name: string | null
  report_ref: string | null
  client_ref: string | null
  created_at: string
  updated_at: string
  active_log_count: number
}
const fromRawJob = (r: RawJob): StoredJob => ({
  id: r.id,
  jobRef: r.job_ref,
  operationFamily: r.operation_family,
  operationType: r.operation_type,
  portName: r.port_name,
  reportRef: r.report_ref,
  clientRef: r.client_ref,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  activeLogCount: r.active_log_count,
})

/** Stored jobs (desktop SQLite); empty array in the browser demo (no storage). */
export async function listStoredJobs(): Promise<StoredJob[]> {
  if (!isDesktop()) return []
  const rows = await invoke<RawJob[]>('list_jobs')
  return rows.map(fromRawJob)
}

/** Load one stored job with its sets + official (active) calc logs; null in browser. */
export async function loadJobDetail(jobId: string): Promise<JobDetail | null> {
  if (!isDesktop()) return null
  const d = await invoke<{
    job: RawJob
    sets: { id: string; module_type: string; title: string; role: string; status: string; created_at: string }[]
    logs: {
      id: string; measurement_set_id: string | null; calculation_type: string; calculation_scope: string
      engine_version: string; input_snapshot_json: string; output_snapshot_json: string; created_at: string
    }[]
  } | null>('load_job_detail', { jobId })
  if (!d) return null
  return {
    job: fromRawJob(d.job),
    sets: d.sets.map((s) => ({ id: s.id, moduleType: s.module_type, title: s.title, role: s.role, status: s.status, createdAt: s.created_at })),
    logs: d.logs.map((l) => ({
      id: l.id,
      measurementSetId: l.measurement_set_id,
      calculationType: l.calculation_type,
      calculationScope: l.calculation_scope,
      engineVersion: l.engine_version,
      inputSnapshotJson: l.input_snapshot_json,
      outputSnapshotJson: l.output_snapshot_json,
      createdAt: l.created_at,
    })),
  }
}

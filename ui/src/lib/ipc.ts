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

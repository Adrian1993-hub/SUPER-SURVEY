// Desktop bridge (Tauri). Calculation runs everywhere via WASM (./kernel);
// PERSISTENCE needs SQLite, which only exists in the packaged desktop app — so
// these calls are gated on the Tauri runtime and throw a clear message in the
// browser demo. Inside Tauri the row is recomputed by the native kernel before
// it is written, so a stored number is always traceable to its inputs.

import { bqsRowRequest, type BqsRowInput } from './kernel'
import { listLocalJobs, createLocalJob, type NewLocalJob } from './localJobs'

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
  /** Per-tank VmrTank JSON snapshots, for lossless hydration on reload. */
  tankSnapshots?: string[]
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
    tank_snapshots: input.tankSnapshots ?? [],
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

/** Stored jobs — SQLite on desktop, localStorage in the browser demo. */
export async function listStoredJobs(): Promise<StoredJob[]> {
  if (!isDesktop()) return listLocalJobs()
  const rows = await invoke<RawJob[]>('list_jobs')
  return rows.map(fromRawJob)
}

/** Create a new job; returns its id — SQLite on desktop, localStorage in browser. */
export async function createJob(input: NewLocalJob): Promise<string> {
  if (!isDesktop()) return createLocalJob(input).id
  const args = {
    job_ref: input.jobRef,
    operation_family: input.operationFamily,
    operation_type: input.operationType,
    report_ref: input.reportRef ?? null,
    client_ref: input.clientRef ?? null,
    port_name: input.portName ?? null,
  }
  return invoke<string>('create_job', { args })
}

/** Tank-row snapshots (VmrTank JSON) of a saved job's latest set; [] in the browser. */
export async function loadMeasurementSnapshots(jobId: string): Promise<string[]> {
  if (!isDesktop()) return []
  return invoke<string[]>('load_measurement_snapshots', { jobId })
}

// ---- Actualizaciones -----------------------------------------------------

export interface UpdateCheck {
  /** web | uptodate | available | unavailable */
  state: 'web' | 'uptodate' | 'available' | 'unavailable'
  version?: string
  notes?: string
  message?: string
  /** Presente si state==='available': descarga, instala y reinicia. */
  run?: () => Promise<void>
}

/** Busca una actualización (escritorio). Usa el plugin updater de Tauri si está
 *  presente en el build empaquetado; el import va marcado @vite-ignore para no
 *  romper el bundle actual y encenderse solo cuando el plugin exista. */
export async function checkForUpdates(): Promise<UpdateCheck> {
  if (!isDesktop()) return { state: 'web' }
  try {
    // Especificadores en variable: tsc no los resuelve estáticamente (los
    // plugins aún no están en node_modules) y vite no los pre-empaqueta; se
    // resuelven en runtime dentro de la app empaquetada con el plugin instalado.
    const updaterMod = '@tauri-apps/plugin-updater'
    const processMod = '@tauri-apps/plugin-process'
    const updater = (await import(/* @vite-ignore */ updaterMod)) as {
      check: () => Promise<null | { version: string; body?: string; downloadAndInstall: () => Promise<void> }>
    }
    const update = await updater.check()
    if (!update) return { state: 'uptodate' }
    return {
      state: 'available',
      version: update.version,
      notes: update.body ?? undefined,
      run: async () => {
        await update.downloadAndInstall()
        const proc = (await import(/* @vite-ignore */ processMod)) as { relaunch: () => Promise<void> }
        await proc.relaunch()
      },
    }
  } catch (e) {
    return { state: 'unavailable', message: String(e) }
  }
}

// ---- Licencia (gate suave) -----------------------------------------------

export interface LicenseInfo {
  /** VALID | EXPIRED | INVALID_SIGNATURE | MALFORMED | MISSING | DEMO_WEB */
  status: string
  client?: string | null
  expires?: string | null
}

/** Estado de licencia del escritorio; en el navegador siempre DEMO_WEB. */
export async function licenseStatus(): Promise<LicenseInfo> {
  if (!isDesktop()) return { status: 'DEMO_WEB' }
  try {
    return await invoke<LicenseInfo>('license_status')
  } catch {
    return { status: 'MISSING' }
  }
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

// ---- Asistente IA opcional (F8.1) ------------------------------------------
// Sidecar Ollama local (http://127.0.0.1:11434) vía comandos Rust — la webview
// nunca sale de sí misma (CSP intacta). SOLO escritorio; el navegador demo
// devuelve estados "no disponible" sin lanzar.

export interface AiSystemCheck {
  totalMemMb: number
  availableMemMb: number
  cpuCores: number
  diskFreeMb: number
}

/** Análisis del equipo (RAM/CPU/disco medidos) para decidir si puede correr IA. */
export async function aiSystemCheck(): Promise<AiSystemCheck | null> {
  if (!isDesktop()) return null
  const raw = await invoke<string>('system_ai_check')
  const j = JSON.parse(raw) as { total_mem_mb: number; available_mem_mb: number; cpu_cores: number; disk_free_mb: number }
  return { totalMemMb: j.total_mem_mb, availableMemMb: j.available_mem_mb, cpuCores: j.cpu_cores, diskFreeMb: j.disk_free_mb }
}

export interface AiStatus {
  running: boolean
  models: string[]
}

/** ¿Está el sidecar Ollama corriendo y con qué modelos? */
export async function aiStatus(): Promise<AiStatus> {
  if (!isDesktop()) return { running: false, models: [] }
  try {
    const raw = await invoke<string>('ai_status')
    return JSON.parse(raw) as AiStatus
  } catch {
    return { running: false, models: [] }
  }
}

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Chat con el modelo local (guardarraíl aplicado en Rust). */
export async function aiChat(model: string, messages: AiMessage[]): Promise<string> {
  const raw = await invoke<string>('ai_chat', { model, messagesJson: JSON.stringify(messages) })
  return (JSON.parse(raw) as { content: string }).content
}

/** Descarga un modelo vía Ollama (GBs; puede tardar varios minutos). */
export async function aiPullModel(model: string): Promise<void> {
  await invoke<string>('ai_pull_model', { model })
}

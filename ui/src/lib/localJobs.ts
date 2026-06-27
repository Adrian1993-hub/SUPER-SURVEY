// Browser-side job list (localStorage). On the desktop app, jobs live in the
// SQLite store (ipc.ts); in the browser demo there is no SQLite, so "Nuevo
// trabajo" persists here instead — same `StoredJob` shape, so the UI is uniform.

import type { StoredJob } from './ipc'

const KEY = 'ss-local-jobs'

export interface NewLocalJob {
  jobRef: string
  operationFamily: string
  operationType: string
  clientRef?: string | null
  portName?: string | null
  reportRef?: string | null
}

export function listLocalJobs(): StoredJob[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as StoredJob[]
    }
  } catch {
    /* corrupt/unavailable → empty */
  }
  return []
}

export function createLocalJob(input: NewLocalJob): StoredJob {
  const now = new Date().toISOString()
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `local-${Date.now()}`
  const job: StoredJob = {
    id,
    jobRef: input.jobRef,
    operationFamily: input.operationFamily,
    operationType: input.operationType,
    portName: input.portName ?? null,
    reportRef: input.reportRef ?? null,
    clientRef: input.clientRef ?? null,
    createdAt: now,
    updatedAt: now,
    activeLogCount: 0,
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KEY, JSON.stringify([job, ...listLocalJobs()]))
    }
  } catch {
    /* quota/unavailable → in-memory only this session */
  }
  return job
}

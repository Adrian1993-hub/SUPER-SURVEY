// Estado de MEDICIÓN compartido por trabajo: lo que el surveyor edita en la
// pantalla de Medición vive aquí (no en un useState local), de modo que el
// Reporte BQS refleje exactamente lo medido. Sembrado desde el demo VMR.
//
// Persistencia del ESTADO DE TRABAJO (borrador): autosave a localStorage e
// hidratación al cargar, así las ediciones sobreviven una recarga (offline-first
// en navegador y webview de Tauri). Esto es distinto del registro OFICIAL
// (append-only) que el escritorio guarda en SQLite vía `ipc.ts`.

import { createContext, useContext, useEffect, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import { vmrData, type VmrTank } from '../data/vmr'

const clone = (a: VmrTank[]) => a.map((t) => ({ ...t }))

const KEY_BEFORE = 'ss-measurement-before'
const KEY_AFTER = 'ss-measurement-after'

function load(key: string, fallback: VmrTank[]): VmrTank[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as VmrTank[]
    }
  } catch {
    /* storage corrupto/no disponible → usa la semilla demo */
  }
  return fallback
}

function persist(key: string, value: VmrTank[]) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* cuota/no disponible → ignorar (la app sigue en memoria) */
  }
}

interface JobMeasurement {
  before: VmrTank[]
  after: VmrTank[]
  setBefore: Dispatch<SetStateAction<VmrTank[]>>
  setAfter: Dispatch<SetStateAction<VmrTank[]>>
  /** Descartar el borrador local y re-sembrar desde el demo VMR. */
  reset: () => void
}

const Ctx = createContext<JobMeasurement | null>(null)

export function JobMeasurementProvider({ children }: { children: ReactNode }) {
  const [before, setBefore] = useState<VmrTank[]>(() => load(KEY_BEFORE, clone(vmrData.before.tanques)))
  const [after, setAfter] = useState<VmrTank[]>(() => load(KEY_AFTER, clone(vmrData.after.tanques)))

  // Autosave: cada edición de medición persiste, sobreviviendo a una recarga.
  useEffect(() => persist(KEY_BEFORE, before), [before])
  useEffect(() => persist(KEY_AFTER, after), [after])

  const reset = () => {
    setBefore(clone(vmrData.before.tanques))
    setAfter(clone(vmrData.after.tanques))
  }

  return <Ctx.Provider value={{ before, after, setBefore, setAfter, reset }}>{children}</Ctx.Provider>
}

export function useJobMeasurement(): JobMeasurement {
  const v = useContext(Ctx)
  if (!v) throw new Error('useJobMeasurement must be used within JobMeasurementProvider')
  return v
}

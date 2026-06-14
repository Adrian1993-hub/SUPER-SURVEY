// Estado de MEDICIÓN compartido por trabajo: lo que el surveyor edita en la
// pantalla de Medición vive aquí (no en un useState local), de modo que el
// Reporte BQS refleje exactamente lo medido. Sembrado desde el demo VMR.
// (Un solo trabajo activo en la demo; la persistencia por id llega con SQLite.)

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import { vmrData, type VmrTank } from '../data/vmr'

const clone = (a: VmrTank[]) => a.map((t) => ({ ...t }))

interface JobMeasurement {
  before: VmrTank[]
  after: VmrTank[]
  setBefore: Dispatch<SetStateAction<VmrTank[]>>
  setAfter: Dispatch<SetStateAction<VmrTank[]>>
}

const Ctx = createContext<JobMeasurement | null>(null)

export function JobMeasurementProvider({ children }: { children: ReactNode }) {
  const [before, setBefore] = useState<VmrTank[]>(() => clone(vmrData.before.tanques))
  const [after, setAfter] = useState<VmrTank[]>(() => clone(vmrData.after.tanques))
  return <Ctx.Provider value={{ before, after, setBefore, setAfter }}>{children}</Ctx.Provider>
}

export function useJobMeasurement(): JobMeasurement {
  const v = useContext(Ctx)
  if (!v) throw new Error('useJobMeasurement must be used within JobMeasurementProvider')
  return v
}

import type { AiSystemCheck } from './ipc'

// Decisión del usuario sobre la IA local, POR EQUIPO (localStorage):
//   'on'  = activada · 'off' = rechazada · null = aún no decidió (se pregunta
//   en el primer arranque de escritorio). Cambiable en Configuración/Asistente.

const KEY = 'ss-ai'

export type AiPref = 'on' | 'off' | null

export function getAiPref(): AiPref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'on' || v === 'off' ? v : null
  } catch {
    return null
  }
}

export function setAiPref(v: 'on' | 'off') {
  try {
    localStorage.setItem(KEY, v)
  } catch {
    /* ignore */
  }
}

/** Modelo sugerido para el primer uso (3.8B, licencia MIT — ver análisis). */
export const AI_DEFAULT_MODEL = 'phi4-mini'

export type AiVerdict = 'ok' | 'tight' | 'no'

/** Veredicto del analizador: umbrales de docs/requisitos-minimos.md (tier IA).
 *  ok ≥ ~15 GB de RAM total · tight ≥ ~7.5 GB · no < 7.5 GB. El disco (<3 GB
 *  libres) degrada a 'no' porque el modelo no cabría. */
export function aiVerdict(c: AiSystemCheck): AiVerdict {
  if (c.diskFreeMb < 3000) return 'no'
  if (c.totalMemMb >= 15000) return 'ok'
  if (c.totalMemMb >= 7500) return 'tight'
  return 'no'
}

export const fmtGb = (mb: number) => `${(mb / 1024).toFixed(1)} GB`

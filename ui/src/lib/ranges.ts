// Rangos plausibles por campo de medición. Es una AYUDA de captura (avisa de
// entradas físicamente improbables — típicamente errores de dedo o de punto
// decimal), NO un bloqueo: el kernel sigue siendo la autoridad y falla fuerte
// ante entradas realmente inválidas. No altera ningún cálculo.

export type RangeField = 'density15' | 'temp' | 'freeWater' | 'tov'

export interface FieldRange {
  min: number
  max: number
  unit: string
}

/** Bandas plausibles para productos de petróleo (generosas: buscan atrapar
 *  errores gruesos como 9.534 o 0.09534, no discutir el cuarto decimal). */
export const FIELD_RANGES: Record<RangeField, FieldRange> = {
  // Gasolinas ~0.72 → crudo/fueloil pesado ~1.05; agua = 1.0. Banda 0.5–1.15.
  density15: { min: 0.5, max: 1.15, unit: 'kg/L' },
  // Bunker caliente (HFO) puede rondar 60–70 °C; banda −20 a 120 °C.
  temp: { min: -20, max: 120, unit: '°C' },
  // Agua libre: no negativa (cota superior sana para atrapar signos/typos).
  freeWater: { min: 0, max: 100000, unit: 'm³' },
  // TOV: no negativo (cota superior amplia; solo atrapa negativos/absurdos).
  tov: { min: 0, max: 1000000, unit: 'm³' },
}

export interface RangeVerdict {
  ok: boolean
  /** Límite violado, o null si está dentro de rango. */
  bound: 'min' | 'max' | null
  /** Cuánto excede el límite más cercano (en unidades del campo). */
  overBy: number
  /** Ese exceso como % del límite (el "qué tan fuera de rango"). */
  pct: number
}

const OK: RangeVerdict = { ok: true, bound: null, overBy: 0, pct: 0 }

/** Evalúa un valor contra su banda. `0`/vacío se trata como «no ingresado» (no
 *  molesta con celdas en blanco). Devuelve cuánto y en qué % excede el límite. */
export function checkRange(field: RangeField, value: number): RangeVerdict {
  if (!Number.isFinite(value) || value === 0) return OK
  const r = FIELD_RANGES[field]
  if (value < r.min) {
    const overBy = r.min - value
    return { ok: false, bound: 'min', overBy, pct: r.min !== 0 ? (overBy / Math.abs(r.min)) * 100 : 0 }
  }
  if (value > r.max) {
    const overBy = value - r.max
    return { ok: false, bound: 'max', overBy, pct: r.max !== 0 ? (overBy / Math.abs(r.max)) * 100 : 0 }
  }
  return OK
}

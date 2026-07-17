// Formato numérico regional del surveyor. El separador decimal se **configura de
// antemano** (Configuración → Formato de números): coma o punto. Esto NO toca
// nunca el cálculo: los números viajan al kernel como `String(number)` (siempre
// punto, independiente del locale); este módulo solo afecta ENTRADA (parseo) y
// PRESENTACIÓN (formato) en la UI.

import { useSyncExternalStore } from 'react'

export type DecimalSep = 'dot' | 'comma'

const KEY = 'ss-decimal'
const subs = new Set<() => void>()

function readInitial(): DecimalSep {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null
    if (v === 'dot' || v === 'comma') return v
  } catch {
    /* almacenamiento no disponible → default */
  }
  return 'dot' // punto por defecto (comportamiento actual; p. ej. Panamá/EE. UU.)
}

let currentSep: DecimalSep = readInitial()

export function getDecimalSep(): DecimalSep {
  return currentSep
}

/** Fija el separador decimal (persiste + notifica a los componentes suscritos). */
export function setDecimalSep(sep: DecimalSep): void {
  if (sep === currentSep) return
  currentSep = sep
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, sep)
  } catch {
    /* cuota/no disponible → solo en memoria */
  }
  subs.forEach((cb) => cb())
}

function subscribe(cb: () => void): () => void {
  subs.add(cb)
  return () => {
    subs.delete(cb)
  }
}

/** Hook reactivo: re-renderiza cuando cambia el separador (sin Provider). */
export function useDecimalSep(): DecimalSep {
  return useSyncExternalStore(subscribe, getDecimalSep, getDecimalSep)
}

/** Parseo decimal consciente del separador configurado y tolerante (Postel's Law):
 *  - punto-modo: `.` es decimal; `,` se trata como miles (1,234.56 → 1234.56).
 *    Si NO hay punto pero sí coma, la coma se interpreta como decimal (0,95 → 0.95),
 *    conservando la tolerancia previa — sin regresión.
 *  - coma-modo: espejo (`,` decimal, `.` miles; 1.234,56 → 1234.56; 0.95 → 0.95).
 *  Devuelve 0 para entradas no numéricas (mismo contrato que antes). */
export function parseDec(s: string): number {
  if (typeof s !== 'string') return 0
  const t = s.trim()
  if (t === '') return 0
  let norm: string
  if (currentSep === 'comma') {
    norm = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  } else {
    norm = t.includes('.') ? t.replace(/,/g, '') : t.replace(',', '.')
  }
  const n = parseFloat(norm)
  return Number.isFinite(n) ? n : 0
}

/** Formatea un número para MOSTRAR con el separador configurado (solo display —
 *  nunca alimenta el kernel). Sin agrupación de miles, igual que la UI actual. */
export function formatDec(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return ''
  const s = n.toFixed(decimals)
  return currentSep === 'comma' ? s.replace('.', ',') : s
}

/** Como `formatDec` pero con la precisión NATURAL del número (sin ceros de
 *  relleno) — para mostrar en celdas EDITABLES lo que el usuario tecleó, con su
 *  separador. `0` → cadena vacía (celda en blanco, no «0»). */
export function formatDecNatural(n: number): string {
  if (!Number.isFinite(n) || n === 0) return ''
  const s = String(n)
  return currentSep === 'comma' ? s.replace('.', ',') : s
}

// Catálogo de grados de combustible marino (ISO 8217 + nombres comerciales por azufre).
// Densidades en kg/L @ 15 °C. Son rangos típicos / límites de norma: el surveyor SIEMPRE
// introduce la densidad medida real; esto solo alimenta el selector y avisos de rango.
// Extensible: añade entradas aquí, o escribe un grado libre en la hoja (el campo es texto).
// Ver docs/research/marine-fuel-grades.md.

export type FuelCategory = 'residual' | 'distillate'

export interface FuelGrade {
  code: string // etiqueta corta en la hoja (p.ej. 'VLSFO')
  name: string
  category: FuelCategory
  iso8217?: string
  sulphurMaxPct?: number | null
  /** kg/L @ 15 °C */
  density15: { min: number; max: number; typical: number }
  astmTable: '54A' | '54B'
  common: boolean // se muestra por defecto en el selector
  note?: string
}

export const fuelGrades: FuelGrade[] = [
  // --- Residuales (heavy fuel oil) — lo común tras IMO 2020 ---
  { code: 'VLSFO', name: 'Very Low Sulphur Fuel Oil', category: 'residual', iso8217: '~RMG 380', sulphurMaxPct: 0.5, density15: { min: 0.9, max: 0.991, typical: 0.945 }, astmTable: '54B', common: true, note: 'IMO 2020 ≤0.50% S' },
  { code: 'HSFO', name: 'High Sulphur Fuel Oil', category: 'residual', iso8217: 'RMG/RMK 380', sulphurMaxPct: 3.5, density15: { min: 0.96, max: 1.01, typical: 0.985 }, astmTable: '54B', common: true, note: 'Requiere scrubber' },
  { code: 'ULSFO', name: 'Ultra Low Sulphur Fuel Oil', category: 'residual', iso8217: 'RM (ECA)', sulphurMaxPct: 0.1, density15: { min: 0.86, max: 0.991, typical: 0.935 }, astmTable: '54B', common: true, note: 'Zonas ECA/SECA' },
  { code: 'LSFO', name: 'Low Sulphur Fuel Oil', category: 'residual', iso8217: 'RMG', sulphurMaxPct: 0.5, density15: { min: 0.9, max: 0.991, typical: 0.945 }, astmTable: '54B', common: false },
  // --- Destilados (marine gas / diesel oil) ---
  { code: 'LSMGO', name: 'Low Sulphur Marine Gas Oil', category: 'distillate', iso8217: 'DMA', sulphurMaxPct: 0.1, density15: { min: 0.82, max: 0.89, typical: 0.86 }, astmTable: '54B', common: true, note: '≤0.10% S (ECA / atraque)' },
  { code: 'MGO', name: 'Marine Gas Oil', category: 'distillate', iso8217: 'DMA', sulphurMaxPct: null, density15: { min: 0.82, max: 0.89, typical: 0.855 }, astmTable: '54B', common: true },
  { code: 'MDO', name: 'Marine Diesel Oil', category: 'distillate', iso8217: 'DMB', sulphurMaxPct: null, density15: { min: 0.86, max: 0.9, typical: 0.88 }, astmTable: '54B', common: true, note: 'Destilado + residual ligero' },
  // --- Grados ISO 8217 explícitos (añadir si se cotiza por grado) ---
  { code: 'DMX', name: 'Distillate DMX', category: 'distillate', iso8217: 'DMX', sulphurMaxPct: null, density15: { min: 0.8, max: 0.86, typical: 0.83 }, astmTable: '54B', common: false, note: 'Ligero (emergencia)' },
  { code: 'DMZ', name: 'Distillate DMZ', category: 'distillate', iso8217: 'DMZ', sulphurMaxPct: null, density15: { min: 0.82, max: 0.89, typical: 0.86 }, astmTable: '54B', common: false },
  { code: 'RMA 10', name: 'Residual RMA 10', category: 'residual', iso8217: 'RMA 10', sulphurMaxPct: null, density15: { min: 0.9, max: 0.92, typical: 0.91 }, astmTable: '54B', common: false },
  { code: 'RMB 30', name: 'Residual RMB 30', category: 'residual', iso8217: 'RMB 30', sulphurMaxPct: null, density15: { min: 0.92, max: 0.96, typical: 0.945 }, astmTable: '54B', common: false },
  { code: 'RMD 80', name: 'Residual RMD 80', category: 'residual', iso8217: 'RMD 80', sulphurMaxPct: null, density15: { min: 0.94, max: 0.975, typical: 0.965 }, astmTable: '54B', common: false },
  { code: 'RME 180', name: 'Residual RME 180', category: 'residual', iso8217: 'RME 180', sulphurMaxPct: null, density15: { min: 0.96, max: 0.991, typical: 0.985 }, astmTable: '54B', common: false },
  { code: 'RMG 380', name: 'Residual RMG 380', category: 'residual', iso8217: 'RMG 380', sulphurMaxPct: null, density15: { min: 0.96, max: 0.991, typical: 0.985 }, astmTable: '54B', common: false },
  { code: 'RMK 500', name: 'Residual RMK 500', category: 'residual', iso8217: 'RMK 500', sulphurMaxPct: null, density15: { min: 0.991, max: 1.01, typical: 1.0 }, astmTable: '54B', common: false },
  // --- Crudo → Tabla 54A ---
  { code: 'CRUDE', name: 'Crude Oil', category: 'residual', iso8217: undefined, sulphurMaxPct: null, density15: { min: 0.8, max: 1.075, typical: 0.87 }, astmTable: '54A', common: false, note: 'Carga de crudo → Tabla 54A' },
]

export const commonGrades = fuelGrades.filter((g) => g.common)

export function findGrade(code: string): FuelGrade | undefined {
  const c = code.trim().toUpperCase()
  return fuelGrades.find((g) => g.code.toUpperCase() === c)
}

/** ¿La densidad@15 (kg/L) cae fuera del rango del grado? (null si grado desconocido) */
export function densityOutOfRange(code: string, density15: number): boolean | null {
  const g = findGrade(code)
  if (!g || !density15) return null
  return density15 < g.density15.min || density15 > g.density15.max
}

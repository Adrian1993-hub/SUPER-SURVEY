import type { Entry } from './types'

// Traducciones de las páginas de operación específicas y sus paneles:
// Multigrado (imp.), Draft Survey, Buque↔Tierra, LPG, Blend, y los paneles
// VefPanel / SamplingPanel. Espacios de nombres: multigrado.*, draft.*,
// shipshore.*, lpg.*, blend.*, vef.*, sampling.*
export const opsDict = {} satisfies Record<string, Entry>

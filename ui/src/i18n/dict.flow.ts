import type { Entry } from './types'

// Traducciones de las 7 páginas del flujo principal de un trabajo:
// Cover, Perfiles, Key Meeting, Medición, Cálculo (trace), Comparación, Reporte.
// Espacios de nombres por página: cover.*, perfiles.*, keymeeting.*, medicion.*,
// calculo.*, comparacion.*, reporte.*  — más flowShared.* para lo común.
export const flowDict = {} satisfies Record<string, Entry>

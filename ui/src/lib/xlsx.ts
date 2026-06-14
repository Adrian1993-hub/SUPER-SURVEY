// Exportación a XLSX (SheetJS) — offline, en el navegador y en Tauri. Las
// plantillas arman hojas como matrices (AOA) y aquí se vuelcan a un .xlsx real.
// No hay cálculo aquí: las cifras ya vienen del kernel.

export interface SheetSpec {
  name: string
  rows: (string | number | null)[][]
}

/** Construye y descarga un workbook con una o varias hojas. SheetJS se carga
 *  de forma diferida (solo al exportar) para no inflar el bundle principal. */
export async function downloadWorkbook(filename: string, sheets: SheetSpec[]): Promise<void> {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows.map((r) => r.map((c) => (c == null ? '' : c))))
    // Excel limita el nombre de hoja a 31 chars y prohíbe algunos símbolos.
    const safe = s.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Hoja'
    XLSX.utils.book_append_sheet(wb, ws, safe)
  }
  XLSX.writeFile(wb, filename)
}

// Datos DEMO ficticios para un BQS IMPERIAL MULTIGRADO (estilo SGS): una sección
// de medición por GRADO, en unidades US (API @60°F, °C de campo, m³). Cada grado
// se calcula y totaliza por separado. NO son datos reales.
// Inspirado en el formato analizado en docs/research/formato-bqs-imperial-multigrado.md.

export interface ImpTank {
  tank: string
  api: number // API gravity @ 60 °F
  tempC: number // temperatura observada (°C)
  volumeM3: number // TOV (m³)
  freeWaterM3?: number
}

export interface ImpGrade {
  grade: string
  label: string
  /** ROB declarado en el Libro de Máquinas (MT) para el cross-check, si aplica. */
  logbookMt?: number
  tanks: ImpTank[]
}

export interface MultigradeData {
  header: {
    referencia: string
    buque: string
    barcaza: string
    puerto: string
    surveyor: string
    fecha: string
  }
  grades: ImpGrade[]
}

export const multigradeDemo: MultigradeData = {
  header: {
    referencia: 'BQS IMP DEMO-24-10957',
    buque: 'MT DEMO-IMP',
    barcaza: 'BARCAZA DEMO',
    puerto: 'Fondeadero Demo',
    surveyor: 'Surveyor Demo',
    fecha: '29-nov-2024',
  },
  grades: [
    {
      grade: 'VLSFO',
      label: 'VLSFO — Tabla 6B (fuel oils)',
      tanks: [
        { tank: '1S', api: 16.4, tempC: 39.8, volumeM3: 411.38 },
        { tank: '1P', api: 16.4, tempC: 39.9, volumeM3: 229.44 },
        { tank: '2P', api: 15.39, tempC: 37.0, volumeM3: 119.38 },
        { tank: 'HFO SETT.', api: 15.39, tempC: 89.0, volumeM3: 14.1 },
        { tank: 'OVERFLOW', api: 19.95, tempC: 40.0, volumeM3: 7.36 },
      ],
    },
    {
      grade: 'LSMGO',
      label: 'LSMGO — Tabla 6B (jet/destilado)',
      tanks: [
        { tank: 'MGO STBD', api: 34.0, tempC: 28.0, volumeM3: 70.0 },
        { tank: 'MGO PORT', api: 34.0, tempC: 28.0, volumeM3: 64.0 },
      ],
    },
  ],
}

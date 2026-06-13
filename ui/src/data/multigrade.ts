// Datos DEMO para un BQS IMPERIAL MULTIGRADO (estilo SGS): por GRADO, una
// medición de APERTURA y una de CIERRE (Loaded = cierre − apertura), más las
// cifras de auditoría (Nominado / BDN). Unidades US: API @60 °F, °C de campo, m³.
//
// El grado VLSFO es el CASO DE VALIDACIÓN: replica tanque a tanque la hoja SGS
// analizada (docs/research/formato-bqs-imperial-multigrado.md) con nombres
// anonimizados — el kernel debe reproducir Loaded ≈ 590.874 MT (hoja real).
// LSMGO es demo libre. NO son datos de clientes.

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
  /** Cantidad nominada (MT) — referencia comercial. */
  nominatedMt: number
  /** Cantidad del BDN/BDR (MT) — la cifra de custodia a comparar. */
  bdnMt: number
  opening: ImpTank[]
  closing: ImpTank[]
}

export interface MultigradeData {
  header: {
    referencia: string
    buque: string
    barcaza: string
    puerto: string
    surveyor: string
    fecha: string
    metodo: string
  }
  grades: ImpGrade[]
}

export const multigradeDemo: MultigradeData = {
  header: {
    referencia: 'BQS IMP DEMO-0957',
    buque: 'MT DEMO-IMP',
    barcaza: 'BARCAZA DEMO',
    puerto: 'Fondeadero Demo',
    surveyor: 'Surveyor Demo',
    fecha: '29-nov-2024',
    metodo: 'API Standard 2540 (Tablas 6B/13, 60 °F)',
  },
  grades: [
    {
      grade: 'VLSFO',
      label: 'VLSFO — Tabla 6B (fuel oils)',
      nominatedMt: 595.0,
      bdnMt: 590.46,
      // Caso de validación: misma física que la hoja SGS (8 tanques).
      opening: [
        { tank: '1S', api: 15.18, tempC: 29.0, volumeM3: 10.48 },
        { tank: '1P', api: 12.55, tempC: 39.0, volumeM3: 0.3 },
        { tank: '2P', api: 15.39, tempC: 37.0, volumeM3: 119.38 },
        { tank: 'HFO SETT.', api: 15.39, tempC: 89.0, volumeM3: 14.1 },
        { tank: 'HFO SERV.', api: 15.39, tempC: 85.0, volumeM3: 7.3 },
        { tank: 'LSHFO SETT.', api: 15.18, tempC: 67.0, volumeM3: 27.92 },
        { tank: 'LSHFO SERV.', api: 15.18, tempC: 75.0, volumeM3: 34.98 },
        { tank: 'OVERFLOW', api: 19.95, tempC: 40.0, volumeM3: 7.36 },
      ],
      closing: [
        { tank: '1S', api: 16.4, tempC: 39.8, volumeM3: 411.38 },
        { tank: '1P', api: 16.4, tempC: 39.9, volumeM3: 229.44 },
        { tank: '2P', api: 15.39, tempC: 37.0, volumeM3: 119.38 },
        { tank: 'HFO SETT.', api: 15.39, tempC: 89.0, volumeM3: 14.1 },
        { tank: 'HFO SERV.', api: 15.39, tempC: 85.0, volumeM3: 7.3 },
        { tank: 'LSHFO SETT.', api: 15.18, tempC: 67.0, volumeM3: 27.92 },
        { tank: 'LSHFO SERV.', api: 15.18, tempC: 75.0, volumeM3: 34.98 },
        { tank: 'OVERFLOW', api: 19.95, tempC: 40.0, volumeM3: 7.36 },
      ],
    },
    {
      grade: 'LSMGO',
      label: 'LSMGO — Tabla 6B (destilado)',
      nominatedMt: 250.0,
      bdnMt: 249.8,
      opening: [
        { tank: 'MGO STBD', api: 34.0, tempC: 28.0, volumeM3: 5.2 },
        { tank: 'MGO PORT', api: 34.0, tempC: 28.0, volumeM3: 4.1 },
      ],
      closing: [
        { tank: 'MGO STBD', api: 34.0, tempC: 28.5, volumeM3: 156.4 },
        { tank: 'MGO PORT', api: 34.0, tempC: 28.4, volumeM3: 148.9 },
      ],
    },
  ],
}

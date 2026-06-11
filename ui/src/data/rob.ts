// Datos DEMO ficticios para un survey de ROB (Remaining On Board) — inventario
// de búnker por grado + cifras declaradas en el Libro de Máquinas (ER Log).
// NO son datos reales. El surveyor mide físicamente cada tanque; el kernel
// calcula MT; se compara contra el ROB declarado (tolerancia ±0.5% industria).
// Ver docs/research/logbook-maquinas-surveyor.md.

import type { VmrTank } from './vmr'

export interface RobGrade {
  grade: string
  label: string
  /** Densidad@15 del grado (del BDN); por defecto en cada tanque. */
  densidad15: number
  /** ROB declarado por el Jefe de Máquinas en el ER Log (MT, aire). */
  logbookMt: number
  tanks: VmrTank[]
}

export interface RobData {
  header: {
    referencia: string
    buque: string
    puerto: string
    surveyor: string
    surveyType: string
    fecha: string
    seaCondition: string
  }
  grades: RobGrade[]
}

// Constructor breve: el surveyor solo teclea densidad/temp/TOV; el resto lo
// recalcula el kernel (los seeds gov/gsv/mt son solo el flash previo).
const t = (tanque: string, dens: number, temp: number, tov: number, grade: string): VmrTank => ({
  tanque,
  nominado: true,
  grade,
  densidad15: dens,
  tablesRefHeight: 0,
  measRefHeight: 0,
  level: 0,
  usg: 'S',
  temp,
  tov,
  freeWaterLevel: 0,
  freeWaterVol: 0,
  gov: tov,
  vcf: 0.99,
  gsv: tov * 0.99,
  wcf56: dens - 0.0011,
  mt: tov * 0.99 * (dens - 0.0011),
})

export const robData: RobData = {
  header: {
    referencia: 'ROB DEMO-0207',
    buque: 'MT DEMO-02',
    puerto: 'Puerto Demo',
    surveyor: 'Surveyor Demo',
    surveyType: 'ON-HIRE ROB SURVEY',
    fecha: '07-feb-2026',
    seaCondition: 'CALM - WAVE HEIGHT 0 - 0.1M (alongside)',
  },
  grades: [
    {
      grade: 'VLSFO',
      label: 'VLSFO (HFO ≤0.50% S)',
      densidad15: 0.9476,
      logbookMt: 806.0, // ≈ survey → dentro de tolerancia
      tanks: [
        t('4 FWD P', 0.9476, 30.3, 200.8, 'VLSFO'),
        t('4 FWD S', 0.9476, 30.1, 202.4, 'VLSFO'),
        t('5 S', 0.9476, 35.0, 458.9, 'VLSFO'),
      ],
    },
    {
      grade: 'MGO',
      label: 'MGO (≤0.10% S)',
      densidad15: 0.854,
      logbookMt: 118.0, // ER Log declara de más → discrepancia (LOP)
      tanks: [
        t('MGO STBD', 0.854, 28.0, 70.0, 'MGO'),
        t('MGO PORT', 0.854, 28.0, 64.0, 'MGO'),
      ],
    },
    {
      grade: 'MDO',
      label: 'MDO',
      densidad15: 0.88,
      logbookMt: 41.0, // pequeña diferencia → aviso (NOAD)
      tanks: [t('MDO TK', 0.88, 30.0, 47.0, 'MDO')],
    },
  ],
}

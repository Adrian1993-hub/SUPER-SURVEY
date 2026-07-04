// Datos DEMO ficticios para la hoja VMR (Vessel Measurement Report) estilo hoja legacy del cliente
// y para el panel de comparación multi-unidad. NO son datos reales de clientes/buques.
// Los nombres de tanque (4 FWD P, SETTLING, etc.) son genéricos del dominio.

export type USG = 'S' | 'U' | 'G'

export interface VmrTank {
  tanque: string
  nominado: boolean
  grade: string
  densidad15: number
  tablesRefHeight: number
  measRefHeight: number
  level: number
  usg: USG
  temp: number
  tov: number
  freeWaterLevel: number
  freeWaterVol: number
  gov: number
  vcf: number
  gsv: number
  wcf56: number
  mt: number
}

export interface VmrSectionData {
  draftFore: number
  draftAft: number
  trim: number
  list: number
  trimApplied: boolean
  tanques: VmrTank[]
  totals: { densidad: number; temp: number; tov: number; gov: number; vcf: number; gsv: number; wcf56: number; mt: number }
}

export interface VmrData {
  header: {
    referencia: string
    buque: string
    barcaza: string
    puerto: string
    surveyor: string
    surveyType: string
    fecha: string
    seaCondition: string
    suppliersDensity: number
  }
  before: VmrSectionData
  after: VmrSectionData
  transferred: { suppliersDensity: number; gsv: number; mtVac: number; wcf56: number; mtAir: number }
}

export const vmrData: VmrData = {
  header: {
    referencia: 'BQS DEMO-0142',
    buque: 'MT DEMO-01',
    barcaza: 'BARCAZA DEMO',
    puerto: 'Puerto Demo',
    surveyor: 'Surveyor Demo',
    surveyType: 'BQS SURVEY',
    fecha: '28-ene-2026',
    seaCondition: 'SLIGHT - WAVE HEIGHT 0.5 - 1.25M',
    suppliersDensity: 0.9475,
  },
  before: {
    draftFore: 6.7,
    draftAft: 8.4,
    trim: -1.7,
    list: 0.0,
    trimApplied: true,
    tanques: [
      { tanque: '4 FWD P', nominado: true, grade: 'VLSFO', densidad15: 0.9534, tablesRefHeight: 13.25, measRefHeight: 13.25, level: 0.13, usg: 'S', temp: 35.0, tov: 3.9, freeWaterLevel: 0, freeWaterVol: 0, gov: 3.9, vcf: 0.9856, gsv: 3.844, wcf56: 0.9523, mt: 3.661 },
      { tanque: '4 FWD S', nominado: true, grade: 'VLSFO', densidad15: 0.9534, tablesRefHeight: 13.25, measRefHeight: 13.26, level: 0.11, usg: 'S', temp: 35.0, tov: 3.3, freeWaterLevel: 0, freeWaterVol: 0, gov: 3.3, vcf: 0.9856, gsv: 3.252, wcf56: 0.9523, mt: 3.097 },
      { tanque: '4 AFT P', nominado: false, grade: 'VLSFO', densidad15: 0.9534, tablesRefHeight: 13.25, measRefHeight: 13.25, level: 0.19, usg: 'S', temp: 30.0, tov: 5.57, freeWaterLevel: 0, freeWaterVol: 0, gov: 5.57, vcf: 0.9892, gsv: 5.51, wcf56: 0.9523, mt: 5.247 },
      { tanque: '4 AFT S', nominado: true, grade: 'VLSFO', densidad15: 0.9534, tablesRefHeight: 13.25, measRefHeight: 13.24, level: 6.62, usg: 'S', temp: 35.0, tov: 222.68, freeWaterLevel: 0, freeWaterVol: 0, gov: 222.68, vcf: 0.9856, gsv: 219.473, wcf56: 0.9523, mt: 209.004 },
      { tanque: '5 S', nominado: true, grade: 'VLSFO', densidad15: 0.9534, tablesRefHeight: 15.9, measRefHeight: 15.9, level: 0.12, usg: 'S', temp: 35.0, tov: 4.25, freeWaterLevel: 0, freeWaterVol: 0, gov: 4.25, vcf: 0.9856, gsv: 4.189, wcf56: 0.9523, mt: 3.989 },
      { tanque: 'OVERFLOW', nominado: false, grade: 'VLSFO', densidad15: 0.9534, tablesRefHeight: 4.97, measRefHeight: 4.97, level: 0.81, usg: 'S', temp: 35.0, tov: 7.64, freeWaterLevel: 0, freeWaterVol: 0, gov: 7.64, vcf: 0.9856, gsv: 7.53, wcf56: 0.9523, mt: 7.171 },
      { tanque: 'SETTLING', nominado: false, grade: 'VLSFO', densidad15: 0.9534, tablesRefHeight: 8.26, measRefHeight: 8.26, level: 6.21, usg: 'S', temp: 88.0, tov: 52.28, freeWaterLevel: 0, freeWaterVol: 0, gov: 52.28, vcf: 0.9471, gsv: 49.514, wcf56: 0.9523, mt: 47.152 },
      { tanque: 'SERVICE', nominado: false, grade: 'VLSFO', densidad15: 0.9534, tablesRefHeight: 8.26, measRefHeight: 8.26, level: 7.61, usg: 'S', temp: 92.0, tov: 60.68, freeWaterLevel: 0, freeWaterVol: 0, gov: 60.68, vcf: 0.9441, gsv: 57.288, wcf56: 0.9523, mt: 54.555 },
    ],
    totals: { densidad: 0.9534, temp: 35.0, tov: 360.3, gov: 360.3, vcf: 0.9761, gsv: 350.6, wcf56: 0.9523, mt: 333.876 },
  },
  after: {
    draftFore: 5.1,
    draftAft: 8.1,
    trim: -3.0,
    list: 0.0,
    trimApplied: true,
    tanques: [
      { tanque: '4 FWD P', nominado: true, grade: 'VLSFO', densidad15: 0.9476, tablesRefHeight: 13.25, measRefHeight: 13.25, level: 6.7, usg: 'S', temp: 30.3, tov: 200.8, freeWaterLevel: 0, freeWaterVol: 0, gov: 200.8, vcf: 0.9892, gsv: 198.631, wcf56: 0.9465, mt: 188.0 },
      { tanque: '4 FWD S', nominado: true, grade: 'VLSFO', densidad15: 0.9476, tablesRefHeight: 13.25, measRefHeight: 13.26, level: 6.65, usg: 'S', temp: 30.1, tov: 202.4, freeWaterLevel: 0, freeWaterVol: 0, gov: 202.4, vcf: 0.9892, gsv: 200.214, wcf56: 0.9465, mt: 189.502 },
      { tanque: '4 AFT P', nominado: false, grade: 'VLSFO', densidad15: 0.9477, tablesRefHeight: 13.25, measRefHeight: 13.25, level: 6.75, usg: 'S', temp: 30.1, tov: 218.1, freeWaterLevel: 0, freeWaterVol: 0, gov: 218.1, vcf: 0.9892, gsv: 215.745, wcf56: 0.9466, mt: 204.214 },
      { tanque: '4 AFT S', nominado: true, grade: 'VLSFO', densidad15: 0.9534, tablesRefHeight: 13.25, measRefHeight: 13.24, level: 6.63, usg: 'S', temp: 30.2, tov: 222.68, freeWaterLevel: 0, freeWaterVol: 0, gov: 222.68, vcf: 0.9892, gsv: 220.275, wcf56: 0.9523, mt: 209.768 },
      { tanque: '5 S', nominado: true, grade: 'VLSFO', densidad15: 0.9476, tablesRefHeight: 15.9, measRefHeight: 15.9, level: 7.75, usg: 'S', temp: 35.0, tov: 458.9, freeWaterLevel: 0, freeWaterVol: 0, gov: 458.9, vcf: 0.9855, gsv: 452.246, wcf56: 0.9465, mt: 428.03 },
      { tanque: 'OVERFLOW', nominado: false, grade: 'VLSFO', densidad15: 0.9534, tablesRefHeight: 4.97, measRefHeight: 4.97, level: 0.81, usg: 'S', temp: 35.0, tov: 7.64, freeWaterLevel: 0, freeWaterVol: 0, gov: 7.64, vcf: 0.9856, gsv: 7.53, wcf56: 0.9523, mt: 7.171 },
      { tanque: 'SETTLING', nominado: false, grade: 'VLSFO', densidad15: 0.9534, tablesRefHeight: 8.26, measRefHeight: 8.26, level: 6.21, usg: 'S', temp: 88.0, tov: 52.28, freeWaterLevel: 0, freeWaterVol: 0, gov: 52.28, vcf: 0.9471, gsv: 49.514, wcf56: 0.9523, mt: 47.152 },
      { tanque: 'SERVICE', nominado: false, grade: 'VLSFO', densidad15: 0.9534, tablesRefHeight: 8.26, measRefHeight: 8.26, level: 7.61, usg: 'S', temp: 92.0, tov: 60.68, freeWaterLevel: 0, freeWaterVol: 0, gov: 60.68, vcf: 0.9441, gsv: 57.288, wcf56: 0.9523, mt: 54.555 },
    ],
    totals: { densidad: 0.9488, temp: 32.2, tov: 1423.48, gov: 1423.48, vcf: 0.9774, gsv: 1401.443, wcf56: 0.9494, mt: 1328.399 },
  },
  transferred: { suppliersDensity: 0.9475, gsv: 1050.843, mtVac: 995.674, wcf56: 0.9464, mtAir: 994.518 },
}

// ---- Comparación multi-unidad (recibido vs entregado) ----
// vessel = recibido por el buque; barge/bdn derivados por factores constantes
// para que el Δ% sea consistente en todas las unidades.

export interface UnitRow {
  unidad: string
  sufijo: string
  decimals: number
  vessel: number
}

export const BARGE_FACTOR = 1.00139
export const BDN_FACTOR = 1.00531

export const comparacionUnidades: UnitRow[] = [
  { unidad: 'M³ (observado)', sufijo: 'm³', decimals: 3, vessel: 1063.18 },
  { unidad: 'M³ @ 15 °C (GSV)', sufijo: 'm³', decimals: 3, vessel: 1050.843 },
  { unidad: 'M³ @ 60 °F', sufijo: 'm³', decimals: 3, vessel: 1050.62 },
  { unidad: 'MT (aire)', sufijo: 'MT', decimals: 3, vessel: 994.518 },
  { unidad: 'MT (vacío)', sufijo: 'MT', decimals: 3, vessel: 995.674 },
  { unidad: 'Long Tons', sufijo: 'LT', decimals: 3, vessel: 978.81 },
  { unidad: 'Litros @ 15 °C', sufijo: 'L', decimals: 0, vessel: 1050843 },
]

export const TOLERANCIA_PCT = 0.3 // ISO default (tightest layer)

// Tolerancia en capas para el motor de comparación del kernel.
// El kernel recomienda: dentro de todas → ninguna; supera la más estricta pero
// no la más amplia → NOAD; supera la más amplia → LOP.
export const toleranceLayers = [
  { name: 'ISO 91', basis: 'estándar', limitPct: 0.3 },
  { name: 'Inspección', basis: 'inspección', limitPct: 0.4 },
  { name: 'Contrato', basis: 'comercial', limitPct: 0.5 },
]

// Datos compartidos para los documentos de discrepancia (SOF / NOAD / LOP)
export const discrepanciaInfo = {
  operacion: 'BQS — Bunker Quantity Survey',
  buque: 'MT DEMO-01',
  barcaza: 'BARCAZA DEMO',
  puerto: 'Puerto Demo',
  fecha: '28-ene-2026',
  surveyor: 'Surveyor Demo',
  grado: 'VLSFO',
}

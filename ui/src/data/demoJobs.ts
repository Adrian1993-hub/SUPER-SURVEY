// Datos DEMO ficticios para el mockup de UI. NO son datos reales de clientes/buques.
// Nombres genéricos a propósito (MT DEMO-01, Cliente Demo S.A., Puerto Demo).

export interface Job {
  id: string
  numero: string
  cliente: string
  operacion: string
  buque: string
  puerto: string
  fecha: string
  estado: 'Borrador' | 'En progreso' | 'Calculado' | 'Reportado' | 'Firmado'
}

export interface TankMeasurement {
  tanque: string
  apertura: { sondaje: number; temperatura: number; densidad: number; aguaLibre: number; volTabla: number }
  cierre: { sondaje: number; temperatura: number; densidad: number; aguaLibre: number; volTabla: number }
  robLogbook: number
  delta: number
  fueraTolerance: boolean
}

export interface MedicionData {
  tanques: TankMeasurement[]
  totales: { tov: number; gov: number; gsv: number; mtAire: number; mtVacio: number }
}

export interface ComparacionSource {
  nombre: string
  total: number
}

export interface ComparacionPair {
  comparacion: string
  totalA: number
  totalB: number
  delta: number
  deltaPorcentaje: number
  dentroTolerancia: boolean
}

export interface ComparacionData {
  fuentes: ComparacionSource[]
  comparaciones: ComparacionPair[]
}

export const jobs: Job[] = [
  { id: '1', numero: 'BQS-2026-0142', cliente: 'Cliente Demo S.A.', operacion: 'BQS', buque: 'MT DEMO-01', puerto: 'Puerto Demo', fecha: '15/01/2026', estado: 'En progreso' },
  { id: '2', numero: 'BQS-2026-0141', cliente: 'Naviera Demo Ltda.', operacion: 'BQS', buque: 'MT DEMO-02', puerto: 'Terminal Demo Norte', fecha: '14/01/2026', estado: 'Firmado' },
  { id: '3', numero: 'BQS-2026-0140', cliente: 'Comercial Demo', operacion: 'BQS', buque: 'MV DEMO-03', puerto: 'Puerto Demo', fecha: '13/01/2026', estado: 'Reportado' },
  { id: '4', numero: 'BQS-2026-0139', cliente: 'Cliente Demo S.A.', operacion: 'BQS', buque: 'MT DEMO-04', puerto: 'Terminal Demo Sur', fecha: '12/01/2026', estado: 'Calculado' },
  { id: '5', numero: 'BQS-2026-0138', cliente: 'Naviera Demo Ltda.', operacion: 'BQS', buque: 'MT DEMO-05', puerto: 'Puerto Demo', fecha: '11/01/2026', estado: 'En progreso' },
  { id: '6', numero: 'BQS-2026-0137', cliente: 'Comercial Demo', operacion: 'BQS', buque: 'MV DEMO-06', puerto: 'Terminal Demo Norte', fecha: '10/01/2026', estado: 'Borrador' },
]

export function getJob(id: string | undefined): Job {
  return jobs.find((j) => j.id === id) ?? jobs[0]
}

export const medicionData: Record<string, MedicionData> = {
  '1': {
    tanques: [
      { tanque: 'Tanque 1P', apertura: { sondaje: 9.45, temperatura: 32.5, densidad: 965.2, aguaLibre: 0.02, volTabla: 245.8 }, cierre: { sondaje: 8.12, temperatura: 31.8, densidad: 966.1, aguaLibre: 0.01, volTabla: 210.3 }, robLogbook: 210.5, delta: -0.2, fueraTolerance: false },
      { tanque: 'Tanque 1S', apertura: { sondaje: 9.52, temperatura: 33.1, densidad: 964.8, aguaLibre: 0.03, volTabla: 247.2 }, cierre: { sondaje: 8.18, temperatura: 32.2, densidad: 965.9, aguaLibre: 0.02, volTabla: 212.1 }, robLogbook: 212.3, delta: -0.2, fueraTolerance: false },
      { tanque: 'Tanque 2P', apertura: { sondaje: 10.21, temperatura: 35.2, densidad: 963.5, aguaLibre: 0.01, volTabla: 312.5 }, cierre: { sondaje: 8.95, temperatura: 34.8, densidad: 964.2, aguaLibre: 0.01, volTabla: 274.8 }, robLogbook: 275.1, delta: -0.3, fueraTolerance: false },
      { tanque: 'Tanque 2S', apertura: { sondaje: 10.18, temperatura: 35.5, densidad: 963.2, aguaLibre: 0.02, volTabla: 311.8 }, cierre: { sondaje: 8.92, temperatura: 35.1, densidad: 963.9, aguaLibre: 0.01, volTabla: 273.5 }, robLogbook: 278.2, delta: -4.7, fueraTolerance: true },
      { tanque: 'Tanque 3P', apertura: { sondaje: 11.35, temperatura: 38.2, densidad: 961.8, aguaLibre: 0.0, volTabla: 428.6 }, cierre: { sondaje: 10.12, temperatura: 37.5, densidad: 962.5, aguaLibre: 0.0, volTabla: 382.4 }, robLogbook: 382.1, delta: 0.3, fueraTolerance: false },
      { tanque: 'Tanque 3S', apertura: { sondaje: 11.42, temperatura: 38.5, densidad: 961.5, aguaLibre: 0.01, volTabla: 430.2 }, cierre: { sondaje: 10.18, temperatura: 37.8, densidad: 962.2, aguaLibre: 0.0, volTabla: 384.1 }, robLogbook: 384.5, delta: -0.4, fueraTolerance: false },
    ],
    totales: { tov: 1737.2, gov: 1736.8, gsv: 1735.5, mtAire: 1672.8, mtVacio: 1671.2 },
  },
}

export const comparacionData: Record<string, ComparacionData> = {
  '1': {
    fuentes: [
      { nombre: 'Vessel Received', total: 498.21 },
      { nombre: 'Barge Delivered', total: 500.05 },
      { nombre: 'BDN', total: 501.0 },
    ],
    comparaciones: [
      { comparacion: 'Vessel Received vs Barge Delivered', totalA: 498.21, totalB: 500.05, delta: -1.84, deltaPorcentaje: -0.37, dentroTolerancia: true },
      { comparacion: 'Vessel Received vs BDN', totalA: 498.21, totalB: 501.0, delta: -2.79, deltaPorcentaje: -0.56, dentroTolerancia: false },
      { comparacion: 'Barge Delivered vs BDN', totalA: 500.05, totalB: 501.0, delta: -0.95, deltaPorcentaje: -0.19, dentroTolerancia: true },
    ],
  },
}

// ---- Datos adicionales para las pantallas Cover / Perfiles / Key Meeting / Cálculo / Reporte ----

export interface Parte {
  nombre: string
  rol: string
  firma: boolean
}
export interface JobDetails {
  cliente: string
  tipoOperacion: string
  buque: string
  puerto: string
  fechaNor: string
  grados: string[]
  partes: Parte[]
}
export const jobDetails: Record<string, JobDetails> = {
  '1': {
    cliente: 'Cliente Demo S.A.',
    tipoOperacion: 'BQS — Bunker Quantity Survey',
    buque: 'MT DEMO-01',
    puerto: 'Puerto Demo',
    fechaNor: '2026-01-15 08:30 (hora buque)',
    grados: ['HSFO', 'VLSFO', 'MGO'],
    partes: [
      { nombre: 'Cliente Demo S.A.', rol: 'Cliente', firma: true },
      { nombre: 'Naviera Demo Ltda.', rol: 'Armador', firma: true },
      { nombre: 'BunkerCo Demo', rol: 'Suplidor', firma: true },
      { nombre: 'Surveyor Demo', rol: 'Inspector', firma: true },
    ],
  },
}

export interface TankProfile {
  nombre: string
  capacidad: number
  esBunker: boolean
}
export interface ToleranceLayer {
  capa: string
  base: string
  pct: number
}
export interface ProfileData {
  tanques: TankProfile[]
  calculo: { estandar: string; tabla: string; version: string; agregarNoRedondeado: boolean; baseDensidad: string }
  tolerancia: ToleranceLayer[]
  calibracion: { fecha: string; ref: string }
}
export const profileData: Record<string, ProfileData> = {
  '1': {
    tanques: [
      { nombre: 'Tanque 1P', capacidad: 280.0, esBunker: true },
      { nombre: 'Tanque 1S', capacidad: 280.0, esBunker: true },
      { nombre: 'Tanque 2P', capacidad: 350.0, esBunker: true },
      { nombre: 'Tanque 2S', capacidad: 350.0, esBunker: true },
      { nombre: 'Tanque 3P', capacidad: 460.0, esBunker: true },
      { nombre: 'Tanque 3S', capacidad: 460.0, esBunker: true },
    ],
    calculo: {
      estandar: 'ASTM D1250-04 / API MPMS 11.1',
      tabla: 'Tabla 54B (productos)',
      version: '2004',
      agregarNoRedondeado: true,
      baseDensidad: 'Densidad observada → @15 °C',
    },
    tolerancia: [
      { capa: 'ISO', base: 'ISO 91 (default)', pct: 0.3 },
      { capa: 'Comprador', base: 'Contrato comprador', pct: 0.5 },
      { capa: 'Suplidor', base: 'BDN suplidor', pct: 0.5 },
      { capa: 'Inspección', base: 'Estándar inspección', pct: 0.5 },
    ],
    calibracion: { fecha: '2024-08-12', ref: 'Tabla de calibración del astillero (cert. clase)' },
  },
}

export interface KeyMeetingItem {
  item: string
  ok: boolean
}
export interface KeyMeetingData {
  gradosConfirmados: string[]
  tanquesNominados: string[]
  ratas: { inicial: number; maxima: number; topping: number }
  robEsperado: number
  canalVhf: string
  items: KeyMeetingItem[]
}
export const keyMeetingData: Record<string, KeyMeetingData> = {
  '1': {
    gradosConfirmados: ['HSFO', 'VLSFO', 'MGO'],
    tanquesNominados: ['1P', '1S', '2P', '2S', '3P', '3S'],
    ratas: { inicial: 150, maxima: 600, topping: 120 },
    robEsperado: 1737.0,
    canalVhf: 'Canal 12 (backup 14)',
    items: [
      { item: 'Grados y densidades confirmados', ok: true },
      { item: 'Tanques nominados acordados', ok: true },
      { item: 'Ratas de bombeo acordadas (inicial / máx / topping)', ok: true },
      { item: 'ROB esperado confirmado vs logbook', ok: true },
      { item: 'Canal VHF primario y backup', ok: true },
      { item: 'Procedimiento de parada de emergencia revisado', ok: false },
    ],
  },
}

export interface TraceStep {
  paso: string
  detalle: string
  valor: string
}
export interface CalcTraceData {
  tanque: string
  engineVersion: string
  tablaAstm: string
  pasos: TraceStep[]
}
export const calcTraceData: Record<string, CalcTraceData> = {
  '1': {
    tanque: 'Tanque 1P · Cierre',
    engineVersion: 'kernel v0.1.0',
    tablaAstm: 'ASTM 54B / 56',
    pasos: [
      { paso: 'Medición (sondaje)', detalle: 'Sondaje 8.12 m @ 31.8 °C', valor: '8.12 m' },
      { paso: 'Volumen de tabla', detalle: 'Tabla de calibración del tanque (ingresado por el surveyor)', valor: '210.30 m³' },
      { paso: 'Corrección trim/list', detalle: 'Trim Aplicado', valor: '−0.05 m³' },
      { paso: 'TOV', detalle: 'Total Observed Volume', valor: '210.25 m³' },
      { paso: '− Agua libre (FW)', detalle: '0.01 m³', valor: '210.24 m³' },
      { paso: 'GOV', detalle: 'Gross Observed Volume', valor: '210.24 m³' },
      { paso: '× VCF (Tabla 54B)', detalle: 'VCF 0.99850 @ 31.8 °C', valor: '209.92 m³' },
      { paso: 'GSV @ 15 °C', detalle: 'Gross Standard Volume', valor: '209.92 m³' },
      { paso: '× densidad / WCF (Tabla 56)', detalle: 'ρ₁₅ 0.96610 · WCF 0.96500', valor: '—' },
      { paso: 'MT (aire)', detalle: 'Masa en aire (oficial)', valor: '202.57 MT' },
      { paso: 'MT (vacío)', detalle: 'Masa en vacío', valor: '202.80 MT' },
    ],
  },
}

export interface ReportData {
  titulo: string
  cantidades: { concepto: string; valor: string }[]
}
export const reportData: Record<string, ReportData> = {
  '1': {
    titulo: 'Bunker Survey Report (BMR)',
    cantidades: [
      { concepto: 'TOV — Total Observed Volume', valor: '1 737.2 m³' },
      { concepto: 'GOV — Gross Observed Volume', valor: '1 736.8 m³' },
      { concepto: 'GSV @ 15 °C', valor: '1 735.5 m³' },
      { concepto: 'MT (aire) — oficial', valor: '1 672.8 MT' },
      { concepto: 'MT (vacío)', valor: '1 671.2 MT' },
      { concepto: 'Quantity Transferred (Vessel Received)', valor: '498.21 MT' },
    ],
  },
}

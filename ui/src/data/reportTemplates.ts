// Plantillas INTELIGENTES de reporte: un descriptor declarativo por operación que
// dice QUÉ secciones lleva y con qué datos. Un único renderer (pages/SmartReport)
// arma el documento a partir de secciones reutilizables, y TODO el cálculo lo hace
// el kernel WASM (métrico 54B o imperial 6A/6B según la operación). Añadir una
// operación = añadir un descriptor aquí, no escribir una página nueva.
// Datos DEMO ficticios. Ver docs/research/operaciones-sts-barge-offhire.md.

export type UnitSystem = 'metric' | 'imperial'

/** Una sección del reporte (orden = orden de render). */
export type SectionKind =
  | 'meta' // cabecera buque/puerto/fecha
  | 'gradeInventory' // tabla de tanques por grado (cálculo en vivo)
  | 'custodySummary' // comparación de dos cifras (Received vs referencia) + Δ/%
  | 'swDeduction' // Gross → S&W → Net (crudo)
  | 'proRata' // reparto entre B/L
  | 'vef' // Vessel Experience Factor
  | 'certificate' // certificado (off-hire / cantidad)
  | 'signatures'
  | 'notes'

export interface TemplateTank {
  tank: string
  /** métrico: densidad@15 kg/L */
  densidad15?: number
  /** imperial: API @60°F */
  api?: number
  temp: number // °C
  tov: number // m³ (TOV)
  freeWater?: number
}

export interface TemplateGrade {
  grade: string
  label: string
  /** Etapa de apertura (OBQ / ROB previo). Si está, loaded = closing − opening. */
  opening?: TemplateTank[]
  /** Etapa principal (o cierre). */
  tanks: TemplateTank[]
  /** Cifra de referencia para la comparación de custodia. */
  referenceMt?: number
  referenceLabel?: string
}

export interface OperationTemplate {
  id: string
  title: string
  subtitle: string
  unitSystem: UnitSystem
  sections: SectionKind[]
  header: {
    referencia: string
    buque: string
    contraparte: string // barcaza / shuttle / shore / terminal
    puerto: string
    surveyor: string
    fecha: string
    metodo: string
    cliente?: string
  }
  grades: TemplateGrade[]
  /** Deducción S&W (crudo) en % de volumen. */
  swPct?: number
  /** Reparto pro-rata (varios B/L). */
  proRata?: { label: string; parcels: { label: string; weight: number }[] }
  certificate?: { kind: 'OFF_HIRE' | 'QUANTITY'; consignee: string; subject: string }
}

// --- Descriptores demo (3 operaciones, un solo motor) ----------------------

const offHire: OperationTemplate = {
  id: 'off-hire',
  title: 'Certificate of Off-Hire Bunkers',
  subtitle: 'Charter re-delivery bunker survey',
  unitSystem: 'metric',
  sections: ['meta', 'gradeInventory', 'custodySummary', 'certificate', 'signatures', 'notes'],
  header: {
    referencia: 'OFF-HIRE DEMO-6626',
    buque: 'MV DEMO-OFFHIRE',
    contraparte: 'ER Log Book',
    puerto: 'Santo Tomás, Demo',
    surveyor: 'Surveyor Demo',
    fecha: '27-abr-2026',
    metodo: 'ASTM D1250 (54B/56, 15 °C)',
    cliente: 'Charterer Demo',
  },
  grades: [
    {
      grade: 'VLSFO',
      label: 'VLSFO',
      tanks: [
        { tank: '1 FOT', densidad15: 0.9534, temp: 39, tov: 0.873 },
        { tank: '2 FOT P', densidad15: 0.9534, temp: 37, tov: 210.478 },
        { tank: '2 FOT S', densidad15: 0.9534, temp: 33, tov: 142.4 },
      ],
      referenceMt: 322.0,
      referenceLabel: 'ER Log Book',
    },
    {
      grade: 'LSMGO',
      label: 'LSMGO',
      tanks: [
        { tank: 'MGO P', densidad15: 0.854, temp: 30, tov: 150.0 },
        { tank: 'MGO S', densidad15: 0.854, temp: 30, tov: 158.0 },
      ],
      referenceMt: 262.0,
      referenceLabel: 'ER Log Book',
    },
  ],
  certificate: {
    kind: 'OFF_HIRE',
    consignee: 'BARSKA PLOVIDBA (Demo)',
    subject: 'Off-Hire Bunker Survey',
  },
}

const bargeTow: OperationTemplate = {
  id: 'barge-tow',
  title: 'Barge Tow — Loading Report',
  subtitle: 'Shore → barge custody transfer',
  unitSystem: 'imperial',
  sections: ['meta', 'gradeInventory', 'custodySummary', 'vef', 'signatures', 'notes'],
  header: {
    referencia: 'BARGE DEMO-0650',
    buque: 'BARGE CENTENARIO (demo)',
    contraparte: 'Shore (B/L)',
    puerto: 'PATSA, Demo',
    surveyor: 'Surveyor Demo',
    fecha: '06-sep-2024',
    metodo: 'ASTM D1250-80 (1,4,11,13,56) + D1250-19 (6B)',
    cliente: 'Receiver Demo',
  },
  grades: [
    {
      grade: 'MGO DMA',
      label: 'MGO DMA',
      // OBQ antes de cargar:
      opening: [{ tank: 'CARGO P', api: 34.28, temp: 27, tov: 200.0 }],
      // total a bordo después:
      tanks: [{ tank: 'CARGO P', api: 34.28, temp: 29, tov: 707.427 }],
      referenceMt: 605.481,
      referenceLabel: 'Bill of Lading',
    },
  ],
  certificate: { kind: 'QUANTITY', consignee: 'Receiver Demo', subject: 'Loaded Quantity' },
}

const stsDischarge: OperationTemplate = {
  id: 'sts-discharge',
  title: 'STS Mother — Discharge Report',
  subtitle: 'Mother vessel → shuttle (crude oil)',
  unitSystem: 'imperial',
  sections: ['meta', 'gradeInventory', 'swDeduction', 'custodySummary', 'proRata', 'vef', 'signatures', 'notes'],
  header: {
    referencia: 'STS DEMO-0754',
    buque: 'MT DEMO-MOTHER',
    contraparte: 'Outturn (shuttle)',
    puerto: 'Balboa Anchorage, Demo',
    surveyor: 'Surveyor Demo',
    fecha: '12-oct-2024',
    metodo: 'ASTM D1250 (6A/6B/13, 60 °F)',
    cliente: 'UNIPEC Demo',
  },
  grades: [
    {
      grade: 'NAPO CRUDE',
      label: 'NAPO Crude Oil (API 17.5)',
      tanks: [
        { tank: '1C', api: 17.5, temp: 35, tov: 8000.0 },
        { tank: '2C', api: 17.5, temp: 35.6, tov: 7500.0 },
      ],
      referenceMt: 107566.545,
      referenceLabel: 'Bill of Lading',
    },
  ],
  swPct: 0.761,
  proRata: {
    label: 'Reparto por Bill of Lading',
    parcels: [
      { label: 'B/L #1', weight: 363374.95 },
      { label: 'B/L #2', weight: 363375.0 },
    ],
  },
  certificate: { kind: 'QUANTITY', consignee: 'UNIPEC Demo', subject: 'Outturn Quantity' },
}

export const operationTemplates: Record<string, OperationTemplate> = {
  'off-hire': offHire,
  'barge-tow': bargeTow,
  'sts-discharge': stsDischarge,
}

export const templateList = Object.values(operationTemplates)

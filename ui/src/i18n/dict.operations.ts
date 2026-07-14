import type { Entry } from './types'

// Traducciones de las páginas de operación específicas y sus paneles:
// Multigrado (imp.), Draft Survey, Buque↔Tierra, LPG, Blend, LNG (cuerpo), y
// los paneles VefPanel / SamplingPanel. Espacios de nombres: multigrado.*,
// draft.*, shipshore.*, lpg.*, blend.*, lngd.*, vef.*, sampling.* — más
// opsShared.* para lo común. Estándares/unidades/tokens (API MPMS, TCV, RGH,
// Upper/Middle/Lower, MMBtu…) se mantienen tal cual.
export const opsDict = {
  // ---- Compartido ---------------------------------------------------------
  'opsShared.remove': { es: 'Quitar', en: 'Remove' },
  'opsShared.status': { es: 'Estado', en: 'Status' },

  // ---- VefPanel (vef.*) ---------------------------------------------------
  'vef.colVoyage': { es: 'Viaje', en: 'Voyage' },
  'vef.stateRejected': { es: 'Rechazado', en: 'Rejected' },
  'vef.stateQualifies': { es: 'Califica', en: 'Qualifies' },
  'vef.stateDisqualified': { es: 'Descalificado', en: 'Disqualified' },
  'vef.reactivate': { es: 'Reactivar viaje', en: 'Reactivate voyage' },
  'vef.reject': { es: 'Rechazar viaje (error grueso)', en: 'Reject voyage (gross error)' },
  'vef.addVoyage': { es: 'Añadir viaje', en: 'Add voyage' },
  'vef.firstAverage': { es: '1ª media (Σv/Σs)', en: '1st average (Σv/Σs)' },
  'vef.band': { es: 'Banda ±0.30%', en: 'Band ±0.30%' },
  'vef.qualifyingVoyages': { es: 'Viajes que califican', en: 'Qualifying voyages' },
  'vef.applicationTitle': { es: 'Aplicación al viaje actual (descarga)', en: 'Application to the current voyage (discharge)' },
  'vef.withinExpected': { es: 'dentro de lo esperado', en: 'within expectations' },
  'vef.review': { es: 'revisar', en: 'review' },
  'vef.note': {
    es: 'Vessel TCV = sailing − OBQ. La 1ª media incluye todos los viajes salvo los rechazados; los que caen fuera de ±0.30% se descalifican; el VEF es Σvessel/Σshore de los que califican (4 dp). Aplicación: ship × (1/VEF) comparado con el outturn de tierra. Todo lo calcula el motor de cálculo (HM49). Datos de demostración.',
    en: 'Vessel TCV = sailing − OBQ. The 1st average includes every voyage except rejected ones; those outside ±0.30% are disqualified; the VEF is Σvessel/Σshore of the qualifying voyages (4 dp). Application: ship × (1/VEF) compared against the shore outturn. All computed by the calculation engine (HM49). Demonstration data.',
  },

  // ---- SamplingPanel (sampling.*) ----------------------------------------
  'sampling.title': { es: 'Niveles de muestreo (Upper / Middle / Lower)', en: 'Sampling levels (Upper / Middle / Lower)' },
  'sampling.addTank': { es: 'Añadir tanque', en: 'Add tank' },
  'sampling.noData': { es: 'Sin datos', en: 'No data' },
  'sampling.surface': { es: 'superficie', en: 'surface' },
  'sampling.tankN': { es: 'Tanque {name}', en: 'Tank {name}' },
  'sampling.tank': { es: 'Tanque', en: 'Tank' },
  'sampling.note': {
    es: 'Innage = RGH − Ullage; cotas (dip desde referencia): Upper = Ullage + Innage/6, Middle = Ullage + Innage/2, Lower = Ullage + 5·Innage/6 (zonas superior/media/inferior). Calculado por el motor de cálculo; clic en una fila para ver su tanque.',
    en: 'Innage = RGH − Ullage; marks (dip from reference): Upper = Ullage + Innage/6, Middle = Ullage + Innage/2, Lower = Ullage + 5·Innage/6 (upper/middle/lower zones). Computed by the calculation engine; click a row to view its tank.',
  },

  // ---- LNG descarga, cuerpo (lngd.*) --------------------------------------
  'lngd.introPre': { es: 'Custody de LNG por ', en: 'LNG custody by ' },
  'lngd.introEnergy': { es: 'energía', en: 'energy' },
  'lngd.introPost': { es: ': composición → densidad y GHV → masa → energía neta.', en: ': composition → density & GHV → mass → net energy.' },
  'lngd.molarComposition': { es: 'Composición molar', en: 'Molar composition' },
  'lngd.component': { es: 'Componente', en: 'Component' },
  'lngd.excl': { es: 'excl.', en: 'excl.' },
  'lngd.co2Note': {
    es: 'CO₂ y O₂ se excluyen de la base de densidad del líquido (GIIGNL). La suma debe dar 100 %.',
    en: 'CO₂ and O₂ are excluded from the liquid density basis (GIIGNL). The sum must equal 100%.',
  },
  'lngd.densityQty': { es: 'Densidad y cantidad', en: 'Density and quantity' },
  'lngd.lngDensity': { es: 'Densidad del LNG', en: 'LNG density' },
  'lngd.computeRkm': { es: 'Calcular (RKM)', en: 'Compute (RKM)' },
  'lngd.enterCts': { es: 'Ingresar (CTS)', en: 'Enter (CTS)' },
  'lngd.volBefore': { es: 'Volumen antes O.C.T. (m³)', en: 'Volume before O.C.T. (m³)' },
  'lngd.volAfter': { es: 'Volumen después C.C.T. (m³)', en: 'Volume after C.C.T. (m³)' },
  'lngd.vaporQr': { es: 'Vapor desplazado Qr (MMBtu)', en: 'Vapor displaced Qr (MMBtu)' },
  'lngd.machineQf': { es: 'Gas a máquinas Qf (MMBtu)', en: 'Machine gas Qf (MMBtu)' },
  'lngd.qtyEnergyTitle': { es: 'Cantidad y energía entregada', en: 'Quantity and energy delivered' },
  'lngd.desktopOnly': {
    es: 'El cálculo de descarga de LNG se ejecuta en la app de escritorio (el demo del navegador aún no incluye este módulo del motor).',
    en: 'The LNG discharge calculation runs in the desktop app (the browser demo does not include this engine module yet).',
  },
  'lngd.molarMass': { es: 'Masa molar', en: 'Molar mass' },
  'lngd.vaporPlusMachines': { es: 'Vapor + máquinas', en: 'Vapor + machines' },
  'lngd.note': {
    es: 'Densidad por Klosek–McKinley revisado (GIIGNL); GHV masa Σ(Hi·Xi·Mi)/Σ(Xi·Mi) (GPA 2172/ISO 6976); energía neta = bruta − vapor desplazado (Qr) − gas a máquinas (Qf). El auto-lookup de Vi por temperatura llega con las tablas GIIGNL. Datos de demostración.',
    en: 'Density by revised Klosek–McKinley (GIIGNL); GHV mass Σ(Hi·Xi·Mi)/Σ(Xi·Mi) (GPA 2172/ISO 6976); net energy = gross − vapor displaced (Qr) − machine gas (Qf). Automatic Vi lookup by temperature arrives with the GIIGNL tables. Demonstration data.',
  },
  'lngd.nextLabel': { es: 'Reporte de descarga', en: 'Discharge report' },
  'lngd.nextHint': {
    es: 'Genera el documento de custody de LNG por energía (imprimible / PDF).',
    en: 'Generate the LNG custody-by-energy document (printable / PDF).',
  },
  // Componentes (nombres visibles; fórmulas idénticas)
  'lngd.comp.methane': { es: 'Metano (CH₄)', en: 'Methane (CH₄)' },
  'lngd.comp.ethane': { es: 'Etano (C₂H₆)', en: 'Ethane (C₂H₆)' },
  'lngd.comp.propane': { es: 'Propano (C₃H₈)', en: 'Propane (C₃H₈)' },
  'lngd.comp.isoButane': { es: 'iso-Butano', en: 'iso-Butane' },
  'lngd.comp.nButane': { es: 'n-Butano', en: 'n-Butane' },
  'lngd.comp.isoPentane': { es: 'iso-Pentano', en: 'iso-Pentane' },
  'lngd.comp.nPentane': { es: 'n-Pentano', en: 'n-Pentane' },
  'lngd.comp.neoPentane': { es: 'neo-Pentano', en: 'neo-Pentane' },
  'lngd.comp.hexanePlus': { es: 'Hexano +', en: 'Hexane +' },
  'lngd.comp.nitrogen': { es: 'Nitrógeno (N₂)', en: 'Nitrogen (N₂)' },
  'lngd.comp.co2': { es: 'CO₂', en: 'CO₂' },
  'lngd.comp.o2': { es: 'O₂', en: 'O₂' },
} satisfies Record<string, Entry>

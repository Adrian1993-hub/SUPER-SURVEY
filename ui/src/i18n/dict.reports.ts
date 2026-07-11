import type { Entry } from './types'

// Traducciones de las páginas de reporte/salida: Reporte ROB (RobReport),
// SmartReport (renderer de plantillas) y el reporte de descarga de LNG
// (LngReport), más lo compartido de encabezados/firmas/pies de reporte.
// Espacios de nombres: rob.*, smart.*, lngrep.* y report.* (compartido).
// Estándares (ASTM/API/GIIGNL/ISO), unidades y tokens (VCF/GSV/O.C.T.…) se
// mantienen tal cual; solo se traduce la prosa humana.
export const reportsDict = {
  // ---- Compartido entre reportes (report.*) ------------------------------
  'report.verdict.compliant': { es: 'Conforme', en: 'Compliant' },
  'report.verdict.lop': { es: 'LOP', en: 'LOP' },
  'report.verdict.noad': { es: 'NOAD', en: 'NOAD' },
  'report.pdfPrint': { es: 'PDF / Imprimir', en: 'PDF / Print' },

  // Columnas comunes de tablas
  'report.col.tank': { es: 'Tanque', en: 'Tank' },
  'report.col.mtAir': { es: 'MT (aire)', en: 'MT (air)' },
  'report.col.grade': { es: 'Grado', en: 'Grade' },
  'report.col.verdict': { es: 'Veredicto', en: 'Verdict' },

  // Etiquetas de cabecera (meta) comunes
  'report.meta.vessel': { es: 'Buque', en: 'Vessel' },
  'report.meta.surveyor': { es: 'Surveyor', en: 'Surveyor' },
  'report.meta.port': { es: 'Puerto', en: 'Port' },
  'report.meta.date': { es: 'Fecha', en: 'Date' },
  'report.meta.client': { es: 'Cliente', en: 'Client' },
  'report.meta.method': { es: 'Método', en: 'Method' },
  'report.meta.counterparty': { es: 'Contraparte', en: 'Counterparty' },
  'report.meta.reference': { es: 'Referencia', en: 'Reference' },
  'report.meta.engine': { es: 'Motor de cálculo', en: 'Calculation engine' },
  'report.meta.surveyType': { es: 'Tipo de survey', en: 'Survey type' },
  'report.meta.data': { es: 'Datos', en: 'Data' },
  'report.meta.demoValue': { es: 'demostración (ficticios)', en: 'demonstration (fictitious)' },

  // Firmas
  'report.sig.surveyor': { es: 'Surveyor', en: 'Surveyor' },
  'report.sig.chiefEngineer': { es: 'Jefe de Máquinas', en: 'Chief Engineer' },
  'report.sig.master': { es: 'Capitán', en: 'Master' },
  'report.sig.vesselRep': { es: 'Representante del buque', en: 'Vessel Representative' },
  'report.sig.terminalRep': { es: 'Representante de la terminal', en: 'Terminal Representative' },

  // Pie de reporte
  'report.footer.calcBy': { es: 'Calculado por SuperSurvey · motor de cálculo', en: 'Calculated by SuperSurvey · calculation engine' },
  'report.footer.demoDoc': { es: 'documento de demostración con datos ficticios', en: 'demonstration document with fictitious data' },

  // ---- Reporte ROB (rob.*) -----------------------------------------------
  'rob.title': { es: 'Reporte ROB', en: 'ROB Report' },
  'rob.printView': { es: 'Reporte ROB — vista de impresión', en: 'ROB Report — print view' },
  'rob.jsonTechnical': { es: 'JSON técnico', en: 'Technical JSON' },
  'rob.doc.title': { es: 'Reporte de ROB (Remaining On Board)', en: 'Remaining On Board (ROB) Survey' },
  'rob.doc.subtitle': { es: 'Inventario de búnker vs Libro de Máquinas', en: 'Bunker inventory vs Engine Room Log' },
  'rob.meta.seaCondition': { es: 'Estado del mar', en: 'Sea condition' },
  'rob.grade.within': { es: 'Dentro de tolerancia', en: 'Within tolerance' },
  'rob.grade.issueLop': { es: 'Discrepancia > tolerancia — emitir LOP', en: 'Discrepancy > tolerance — issue LOP' },
  'rob.grade.noad': { es: 'Discrepancia aparente — NOAD', en: 'Apparent discrepancy — NOAD' },
  'rob.tol.okPre': {
    es: 'Todos los grados dentro de las capas de tolerancia',
    en: 'All grades within the tolerance layers',
  },
  'rob.tol.okPost': { es: 'ROB del survey aceptado como base.', en: 'Survey ROB accepted as the basis.' },
  'rob.tol.badLop': {
    es: 'Al menos un grado excede la tolerancia: se emite Letter of Protest (LOP).',
    en: 'At least one grade exceeds tolerance: a Letter of Protest (LOP) is issued.',
  },
  'rob.tol.badNoad': {
    es: 'Al menos un grado excede la tolerancia: se notifica discrepancia aparente (NOAD).',
    en: 'At least one grade exceeds tolerance: an apparent discrepancy is notified (NOAD).',
  },
  'rob.tol.badPost': {
    es: 'Las cifras del surveyor son las oficiales para el acuerdo de charter.',
    en: "The surveyor's figures are the official ones for the charter agreement.",
  },
  'rob.footer.comparison': {
    es: 'comparación ROB vs ER Log (tolerancia industria ±0.5%)',
    en: 'ROB vs ER Log comparison (industry tolerance ±0.5%)',
  },
  'rob.xlsx.sheetSummary': { es: 'Resumen ROB', en: 'ROB Summary' },
  'rob.xlsx.sheetTanks': { es: 'Tanques {grade}', en: 'Tanks {grade}' },

  // ---- SmartReport (smart.*) ---------------------------------------------
  'smart.smartTemplate': { es: 'plantilla inteligente', en: 'smart template' },
  'smart.inventoryByGrade': { es: 'Inventario por grado', en: 'Inventory by grade' },
  'smart.grandTotal': { es: 'Total general', en: 'Grand total' },
  'smart.gradeTotalOnBoard': { es: '{label} — total a bordo', en: '{label} — total on board' },
  'smart.gradeObq': { es: '{label} — OBQ (antes)', en: '{label} — OBQ (before)' },
  'smart.totalOnBoard': { es: 'Total a bordo', en: 'Total on board' },
  'smart.loadedFormula': { es: 'Loaded = a bordo − OBQ: ', en: 'Loaded = on board − OBQ: ' },
  'smart.custodySummary.title': { es: 'Resumen de custodia (MT aire)', en: 'Custody summary (MT air)' },
  'smart.custodySummary.verdictNote': {
    es: 'Veredicto por capas de tolerancia del motor de cálculo (ISO/inspección/contrato).',
    en: "Verdict by the calculation engine's tolerance layers (ISO/inspection/contract).",
  },
  'smart.sw.title': { es: 'Deducción S&W ({pct}%) — crudo', en: 'S&W deduction ({pct}%) — crude' },
  'smart.sw.note': {
    es: 'Calculado por el motor de cálculo (custodia).',
    en: 'Computed by the calculation engine (custody).',
  },
  'smart.proRata.colParcel': { es: 'Parcela', en: 'Parcel' },
  'smart.proRata.colWeight': { es: 'Peso (B/L)', en: 'Weight (B/L)' },
  'smart.proRata.colShare': { es: 'Parte (MT)', en: 'Share (MT)' },
  'smart.proRata.note': {
    es: 'Reparto proporcional con reconciliación exacta de redondeo (motor de cálculo).',
    en: 'Proportional allocation with exact rounding reconciliation (calculation engine).',
  },
  'smart.cert.titleOffHire': { es: 'Certificado de búnker (off-hire)', en: 'Bunker certificate (off-hire)' },
  'smart.cert.titleQty': { es: 'Certificado de cantidad', en: 'Quantity certificate' },
  'smart.cert.offHire.a': { es: 'Se certifica que el buque ', en: 'It is hereby certified that the vessel ' },
  'smart.cert.offHire.b': {
    es: ' fue inspeccionado en {puerto} el {fecha}. Las cantidades de búnker a bordo al momento de la inspección, consignadas a ',
    en: ' was inspected at {puerto} on {fecha}. The bunker quantities on board at the time of inspection, consigned to ',
  },
  'smart.cert.offHire.c': { es: ', son:', en: ', are:' },
  'smart.cert.qty.a': { es: 'Se certifica la cantidad de ', en: 'The quantity of ' },
  'smart.cert.qty.b': { es: ' para ', en: ' is hereby certified for ' },
  'smart.cert.qty.c': {
    es: ' en {puerto} ({fecha}), consignada a ',
    en: ' at {puerto} ({fecha}), consigned to ',
  },
  'smart.cert.qty.d': { es: ':', en: ':' },
  'smart.cert.disclaimer': {
    es: 'Este survey se realizó sin perjuicio de las partes.',
    en: 'This survey was carried out without prejudice to the parties.',
  },
  'smart.qty.title': { es: 'Resumen de cantidades (multi-unidad)', en: 'Quantity summary (multi-unit)' },
  'smart.qty.note': {
    es: 'Una sola cifra estándar expandida a todas las unidades por el motor de cálculo (masa invariante; el cruce 15 °C↔60 °F usa el VCF del producto). NSV = GSV − S&W; TCV = GSV + agua libre.',
    en: "A single standard figure expanded to all units by the calculation engine (invariant mass; the 15 °C↔60 °F crossover uses the product's VCF). NSV = GSV − S&W; TCV = GSV + free water.",
  },
  'smart.master.title': {
    es: 'Master Summary — reconciliación de viaje ({unit})',
    en: 'Master Summary — voyage reconciliation ({unit})',
  },
  'smart.master.note': {
    es: 'B/L → cargado (±VEF) → en tránsito (carga vs descarga). Δ y % por el motor de comparación.',
    en: 'B/L → loaded (±VEF) → in transit (load vs discharge). Δ and % by the comparison engine.',
  },
  // Encabezados de columnas multi-unidad (solo la prosa «aire» cambia)
  'smart.unit.bbl60': { es: 'bbl @60', en: 'bbl @60' },
  'smart.unit.gal60': { es: 'gal @60', en: 'gal @60' },
  'smart.unit.m360': { es: 'm³ @60', en: 'm³ @60' },
  'smart.unit.l60': { es: 'L @60', en: 'L @60' },
  'smart.unit.m315': { es: 'm³ @15', en: 'm³ @15' },
  'smart.unit.l15': { es: 'L @15', en: 'L @15' },
  'smart.unit.mtAir': { es: 'MT aire', en: 'MT air' },
  'smart.unit.mtVac': { es: 'MT vac', en: 'MT vac' },
  'smart.unit.ltAir': { es: 'LT aire', en: 'LT air' },
  'smart.xlsx.sheetSummary': { es: 'Resumen', en: 'Summary' },
  'smart.xlsx.sheetQuantities': { es: 'Cantidades', en: 'Quantities' },
  'smart.xlsx.colLevel': { es: 'Nivel', en: 'Level' },
  'smart.xlsx.colReferenceMt': { es: 'Referencia MT', en: 'Reference MT' },

  // ---- Reporte de descarga de LNG (lngrep.*) -----------------------------
  'lngrep.printView': {
    es: 'Reporte de descarga de LNG — vista de impresión',
    en: 'LNG Discharge Report — print view',
  },
  'lngrep.doc.title': { es: 'Reporte de descarga de LNG', en: 'LNG Discharge Report' },
  'lngrep.doc.subtitle': {
    es: 'Transferencia de custodia por energía · GIIGNL / ISO 6976',
    en: 'Custody transfer by energy · GIIGNL / ISO 6976',
  },
  'lngrep.meta.terminalPort': { es: 'Terminal / Puerto', en: 'Terminal / Port' },
  'lngrep.meta.voyage': { es: 'Viaje', en: 'Voyage' },
  'lngrep.meta.loadPort': { es: 'Puerto de carga', en: 'Load port' },
  'lngrep.meta.lngTemp': { es: 'Temp. del LNG', en: 'LNG temp.' },
  'lngrep.summary.title': { es: 'Resumen — cantidad y energía', en: 'Summary — quantity and energy' },
  'lngrep.fig.density': { es: 'Densidad', en: 'Density' },
  'lngrep.fig.volDelivered': { es: 'Volumen entregado', en: 'Delivered volume' },
  'lngrep.fig.grossMass': { es: 'Masa bruta', en: 'Gross mass' },
  'lngrep.fig.ghvMass': { es: 'GHV (masa)', en: 'GHV (mass)' },
  'lngrep.fig.grossEnergy': { es: 'Energía bruta', en: 'Gross energy' },
  'lngrep.fig.vaporDisplaced': { es: 'Vapor desplazado', en: 'Displaced vapor' },
  'lngrep.fig.machineGas': { es: 'Gas a máquinas', en: 'Gas to engines' },
  'lngrep.fig.netEnergy': { es: 'Energía neta', en: 'Net energy' },
  'lngrep.summary.netMassEq': { es: 'Masa neta equivalente', en: 'Equivalent net mass' },
  'lngrep.summary.ghvVolume': { es: 'GHV volumen', en: 'GHV volume' },
  'lngrep.composition.title': { es: 'Composición molar (certificado)', en: 'Molar composition (certificate)' },
  'lngrep.composition.component': { es: 'Componente', en: 'Component' },
  'lngrep.method.title': { es: 'Método (explicable)', en: 'Method (explainable)' },
  'lngrep.method.s1': {
    es: 'Densidad del líquido por Klosek–McKinley revisado (GIIGNL) desde composición y temperatura → {v} kg/m³.',
    en: 'Liquid density by revised Klosek–McKinley (GIIGNL) from composition and temperature → {v} kg/m³.',
  },
  'lngrep.method.s2': {
    es: 'GHV (masa) = Σ(Hi·Xi·Mi)/Σ(Xi·Mi) (GPA 2172 / ISO 6976) → {v} Btu/lb.',
    en: 'GHV (mass) = Σ(Hi·Xi·Mi)/Σ(Xi·Mi) (GPA 2172 / ISO 6976) → {v} Btu/lb.',
  },
  'lngrep.method.s3': {
    es: 'Volumen entregado = O.C.T. {a} − C.C.T. {b} = {c} m³.',
    en: 'Delivered volume = O.C.T. {a} − C.C.T. {b} = {c} m³.',
  },
  'lngrep.method.s4': {
    es: 'Masa = V × densidad → {v} kg; Energía bruta = masa × GHV × 2.2046.',
    en: 'Mass = V × density → {v} kg; Gross energy = mass × GHV × 2.2046.',
  },
  'lngrep.method.s5': {
    es: 'Energía neta = bruta − vapor desplazado (Qr) − gas a máquinas (Qf) → {v} MMBtu.',
    en: 'Net energy = gross − displaced vapor (Qr) − gas to engines (Qf) → {v} MMBtu.',
  },
  'lngrep.footer.custody': { es: 'custody de LNG por energía', en: 'LNG custody by energy' },
  'lngrep.footer.demoRef': {
    es: 'documento de demostración con datos de referencia anonimizados.',
    en: 'demonstration document with anonymized reference data.',
  },
} satisfies Record<string, Entry>

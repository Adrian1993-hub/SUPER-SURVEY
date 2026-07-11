// Caso de referencia (ANONIMIZADO) para el reporte de descarga de LNG. Las
// cifras son las del kernel validado (docs/research/lng-discharge.md): densidad
// 426.0 kg/m³, masa 65 539 461 kg, energía neta 3 424 985 MMBtu — sin ninguna
// identidad comercial real (buque/terminal/laboratorio/cliente genéricos).

export interface LngReportComponent {
  name: string
  pct: number
}

export const lngReportDemo = {
  meta: {
    referencia: 'MOU-DEMO-3',
    fecha: '08/07/2026',
    buque: 'Buque de referencia (LNG)',
    terminal: 'Terminal de referencia',
    voyage: 'DEMO-094',
    cliente: 'Cliente Demo',
    loadPort: 'Puerto de carga (referencia)',
  },
  composition: [
    { name: 'Metano (CH₄)', pct: 97.98 },
    { name: 'Etano (C₂H₆)', pct: 1.78 },
    { name: 'Propano (C₃H₈)', pct: 0.15 },
    { name: 'iso-Butano', pct: 0.03 },
    { name: 'n-Butano', pct: 0.02 },
    { name: 'Nitrógeno (N₂)', pct: 0.04 },
  ] as LngReportComponent[],
  quality: {
    tempC: -159.3,
    density: 426.0,
    ghvMass: 23811, // Btu/lb @ 60 °F
    ghvVolume: 1028.63, // Btu/scf @ 60/60 °F, 14.696 psia (gas real)
    wobbe: 1368.63,
  },
  quantity: {
    volBefore: 155928.015, // O.C.T. m³
    volAfter: 2079.49, // C.C.T. m³
    volDelivered: 153848.5, // m³
    grossMass: 65539461, // kg
    grossEnergy: 3440402, // MMBtu @ 60 °F
    vaporDisplaced: 14162, // Qr, MMBtu
    machineGas: 1255, // Qf, MMBtu
    netEnergy: 3424985, // MMBtu @ 60 °F
    netMassEq: 65245.768, // t (ISO 13398)
  },
  sof: [
    { label: 'Notice of Readiness tendered', at: '07/07/2026 06:00' },
    { label: 'Atraque completado', at: '07/07/2026 09:20' },
    { label: 'Apertura de custodia (O.C.T.)', at: '07/07/2026 12:46' },
    { label: 'Inicio de bombeo (1ª bomba)', at: '07/07/2026 15:35' },
    { label: 'Fin de operación', at: '08/07/2026 06:49' },
    { label: 'Cierre de custodia (C.C.T.)', at: '08/07/2026 08:24' },
  ],
}

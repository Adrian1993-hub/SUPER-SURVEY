// Diccionario bilingüe (ES/EN). Cada clave lleva sus dos idiomas juntos para
// evitar que se desincronicen. El español es la lengua de origen del producto;
// el inglés es la traducción. Claves con notación por puntos agrupadas por zona
// de la interfaz. Interpolación con {variable} (ver LanguageProvider).
//
// Cobertura por lotes: este archivo empieza por el "chrome" persistente (barra
// lateral, stepper, TopBar, siguiente-paso) y Configuración; las páginas de
// operación se van sumando en lotes posteriores. Cualquier clave ausente cae al
// texto español y, en último término, a la propia clave — nunca rompe.

export type Lang = 'es' | 'en'
type Entry = { es: string; en: string }

export const dict = {
  // ---- Común -------------------------------------------------------------
  'app.name': { es: 'SuperSurvey', en: 'SuperSurvey' },
  'common.continue': { es: 'Continuar', en: 'Continue' },
  'common.add': { es: 'Añadir', en: 'Add' },
  'common.remove': { es: 'Quitar', en: 'Remove' },
  'common.offline': { es: 'Offline', en: 'Offline' },
  'common.save': { es: 'Guardar', en: 'Save' },
  'common.cancel': { es: 'Cancelar', en: 'Cancel' },
  'common.loading': { es: 'Cargando…', en: 'Loading…' },
  'common.status': { es: 'Estado', en: 'Status' },

  // ---- Estados del trabajo (claves de datos ES; solo cambia la etiqueta) --
  'status.borrador': { es: 'Borrador', en: 'Draft' },
  'status.enProgreso': { es: 'En progreso', en: 'In progress' },
  'status.calculado': { es: 'Calculado', en: 'Calculated' },
  'status.reportado': { es: 'Reportado', en: 'Reported' },
  'status.firmado': { es: 'Firmado', en: 'Signed' },

  // ---- Navegación (barra lateral) ---------------------------------------
  'nav.general': { es: 'General', en: 'General' },
  'nav.dashboard': { es: 'Dashboard', en: 'Dashboard' },
  'nav.jobs': { es: 'Trabajos', en: 'Jobs' },
  'nav.tools': { es: 'Utilidades', en: 'Tools' },
  'nav.settings': { es: 'Configuración', en: 'Settings' },
  'nav.designGuide': { es: 'Guía de diseño', en: 'Design guide' },
  'nav.jobFlow': { es: 'Flujo del trabajo', en: 'Job flow' },
  'nav.specificOps': { es: 'Operaciones específicas', en: 'Specific operations' },
  'sidebar.footerDemo': { es: 'Demo (white-label)', en: 'Demo (white-label)' },

  // ---- Dashboard ---------------------------------------------------------
  'dash.welcome': { es: 'Bienvenido a', en: 'Welcome to' },
  'dash.tagline': {
    es: 'Medición → cantidad calculada → comparación defendible → documento firmable. Todo offline.',
    en: 'Measurement → calculated quantity → defensible comparison → signable document. All offline.',
  },
  'dash.viewJobs': { es: 'Ver trabajos', en: 'View jobs' },
  'dash.kpiActive': { es: 'Trabajos activos', en: 'Active jobs' },
  'dash.kpiMt': { es: 'MT calculadas (últ.)', en: 'MT calculated (latest)' },
  'dash.kpiDiscrep': { es: 'Discrepancias abiertas', en: 'Open discrepancies' },
  'dash.kpiSigned': { es: 'Trabajos firmados', en: 'Signed jobs' },
  'dash.qtyBySource': { es: 'Cantidad por fuente', en: 'Quantity by source' },
  'dash.tolerance': { es: 'Tolerancia', en: 'Tolerance' },
  'dash.outOfTol': { es: '{n} fuera de tolerancia', en: '{n} out of tolerance' },
  'dash.within': { es: 'dentro', en: 'within' },
  'dash.fillByTank': { es: 'Llenado por tanque (cierre)', en: 'Fill by tank (closing)' },
  'dash.recentJobs': { es: 'Trabajos recientes', en: 'Recent jobs' },

  // ---- Operaciones específicas ------------------------------------------
  'op.multigrade': { es: 'Multigrado (imp.)', en: 'Multigrade (imp.)' },
  'op.draft': { es: 'Draft Survey', en: 'Draft Survey' },
  'op.shipShore': { es: 'Buque ↔ Tierra', en: 'Ship ↔ Shore' },
  'op.lpg': { es: 'LPG (gaseros)', en: 'LPG (gas carriers)' },
  'op.blend': { es: 'Blend', en: 'Blend' },
  'op.rob': { es: 'Reporte ROB', en: 'ROB Report' },
  'op.templates': { es: 'Plantillas', en: 'Templates' },

  // ---- Flujo principal (stepper) ----------------------------------------
  'flow.cover': { es: 'Cover', en: 'Cover' },
  'flow.perfiles': { es: 'Perfiles', en: 'Profiles' },
  'flow.keyMeeting': { es: 'Key Meeting', en: 'Key Meeting' },
  'flow.medicion': { es: 'Medición', en: 'Measurement' },
  'flow.calculo': { es: 'Cálculo', en: 'Calculation' },
  'flow.comparacion': { es: 'Comparación', en: 'Comparison' },
  'flow.reporte': { es: 'Reporte', en: 'Report' },
  'stepper.aria': { es: 'Progreso del trabajo', en: 'Job progress' },

  // ---- Lista de trabajos -------------------------------------------------
  'jobs.title': { es: 'Lista de trabajos', en: 'Job list' },
  'jobs.new': { es: 'Nuevo trabajo', en: 'New job' },
  'jobs.create': { es: 'Crear trabajo', en: 'Create job' },
  'jobs.creating': { es: 'Creando…', en: 'Creating…' },
  'jobs.ref': { es: 'Referencia', en: 'Reference' },
  'jobs.operation': { es: 'Operación', en: 'Operation' },
  'jobs.port': { es: 'Puerto', en: 'Port' },
  'jobs.date': { es: 'Fecha', en: 'Date' },
  'jobs.created': { es: 'Creado', en: 'Created' },
  'jobs.calcs': { es: 'Cálculos', en: 'Calculations' },
  'jobs.colNumRef': { es: 'Nº / Ref', en: 'No. / Ref' },
  'jobs.savedDesktop': { es: 'Se guarda en SQLite local (escritorio).', en: 'Saved to local SQLite (desktop).' },
  'jobs.savedWeb': { es: 'Se guarda en este navegador (demo).', en: 'Saved in this browser (demo).' },
  'jobs.emptyTitle': { es: 'Aún no hay trabajos guardados', en: 'No saved jobs yet' },
  'jobs.emptyDesktop': {
    es: 'Crea un trabajo nuevo arriba o guarda una medición: quedará en la base SQLite local de este equipo.',
    en: "Create a new job above or save a measurement: it will be stored in this computer's local SQLite database.",
  },
  'jobs.emptyWeb': {
    es: 'Crea un trabajo nuevo arriba; en el navegador demo se guarda localmente. La app de escritorio usa SQLite.',
    en: 'Create a new job above; in the demo browser it is saved locally. The desktop app uses SQLite.',
  },
  'jobs.savedHeader': { es: 'Trabajos guardados', en: 'Saved jobs' },
  'jobs.savedSqlite': { es: '(SQLite local)', en: '(local SQLite)' },
  'jobs.savedBrowser': { es: '(este navegador)', en: '(this browser)' },
  'jobs.demoJobs': { es: 'Trabajos de ejemplo (demo)', en: 'Example jobs (demo)' },

  // ---- Utilidades (herramientas de densidad) ----------------------------
  'tools.intro': {
    es: 'Conversiones de densidad del surveyor — método por ecuación, documentado y trazable (sin tablas impresas fijas).',
    en: 'Surveyor density conversions — equation-based method, documented and traceable (no fixed printed tables).',
  },
  'tools.invert': { es: 'Invertir dirección', en: 'Invert direction' },
  'tools.api.title': { es: 'API ↔ densidad @15 °C', en: 'API ↔ density @15 °C' },
  'tools.api.inputRho': { es: 'Densidad @15 °C (kg/L)', en: 'Density @15 °C (kg/L)' },
  'tools.api.inputApi': { es: 'API gravity @60 °F', en: 'API gravity @60 °F' },
  'tools.api.note': {
    es: 'Vía SG 60/60 °F y agua @60 °F = 999.016 kg/m³ (convención API MPMS); el salto 60 °F→15 °C usa la expansión térmica del propio producto (ecuación 54B).',
    en: "Via SG 60/60 °F and water @60 °F = 999.016 kg/m³ (API MPMS convention); the 60 °F→15 °C step uses the product's own thermal expansion (equation 54B).",
  },
  'tools.lab.title': { es: 'Densidad de laboratorio (ρ @ T ↔ ρ15)', en: 'Laboratory density (ρ @ T ↔ ρ15)' },
  'tools.lab.inputRho15': { es: 'ρ15 (kg/L)', en: 'ρ15 (kg/L)' },
  'tools.lab.inputObserved': { es: 'ρ observada (kg/L)', en: 'observed ρ (kg/L)' },
  'tools.lab.tempLabel': { es: 'T observación (°C)', en: 'observation T (°C)' },
  'tools.lab.observedAt': { es: 'ρ observada @ {temp} °C', en: 'observed ρ @ {temp} °C' },
  'tools.lab.note': {
    es: 'Para certificados de laboratorio reportados a 20 °C (u otra T): el motor de cálculo resuelve ρ15 invirtiendo ρ_obs = ρ15 × VCF(ρ15, T) — la misma 54B de la hoja, sin factores fijos.',
    en: 'For lab certificates reported at 20 °C (or another T): the calculation engine solves ρ15 by inverting ρ_obs = ρ15 × VCF(ρ15, T) — the same 54B from the worksheet, with no fixed factors.',
  },
  'tools.blend.title': { es: 'Densidad de mezcla (ROB + recibido)', en: 'Blend density (ROB + received)' },
  'tools.blend.parcel': { es: 'Parcela', en: 'Parcel' },
  'tools.blend.volume': { es: 'Volumen @15 °C (m³)', en: 'Volume @15 °C (m³)' },
  'tools.blend.rho15': { es: 'ρ15 (kg/L)', en: 'ρ15 (kg/L)' },
  'tools.blend.removeParcel': { es: 'Quitar parcela', en: 'Remove parcel' },
  'tools.blend.addParcel': { es: 'Añadir parcela', en: 'Add parcel' },
  'tools.blend.outRho': { es: 'ρ15 mezcla', en: 'blend ρ15' },
  'tools.blend.outVolume': { es: 'Volumen total', en: 'Total volume' },
  'tools.blend.outMt': { es: 'MT (vacío)', en: 'MT (vacuum)' },
  'tools.blend.note': {
    es: 'Ponderada por volumen @15 °C (conserva la masa; mezcla ideal — el papeleo de búnker ignora la contracción real). Útil para la densidad resultante tras recibir sobre un remanente.',
    en: 'Volume-weighted @15 °C (conserves mass; ideal blend — bunker paperwork ignores real contraction). Useful for the resulting density after receiving onto a remnant.',
  },

  // ---- TopBar ------------------------------------------------------------
  'topbar.number': { es: 'Nº', en: 'No.' },
  'topbar.vessel': { es: 'Buque', en: 'Vessel' },
  'topbar.client': { es: 'Cliente', en: 'Client' },
  'topbar.demoData': { es: 'Datos demo', en: 'Demo data' },
  'topbar.demoDataTitle': {
    es: 'Este trabajo es un ejemplo con datos ficticios',
    en: 'This job is an example with fictitious data',
  },

  // ---- Licencia ----------------------------------------------------------
  'license.evalMode': { es: 'Modo evaluación', en: 'Evaluation mode' },
  'license.expired': { es: 'Licencia vencida', en: 'License expired' },
  'license.invalid': { es: 'Licencia inválida', en: 'Invalid license' },
  'license.statusTitle': { es: 'Estado de licencia: {status}', en: 'License status: {status}' },

  // ---- Barra siguiente-paso ---------------------------------------------
  'nextstep.continueTo': { es: 'Continuar a {label}', en: 'Continue to {label}' },

  // ---- Barrera de errores (ErrorBoundary) -------------------------------
  'error.title': { es: 'Algo salió mal en la interfaz', en: 'Something went wrong in the interface' },
  'error.body': {
    es: 'Tus datos están a salvo: la medición en curso se autoguarda en este equipo y los cálculos oficiales quedan en la base local. Recarga para continuar.',
    en: 'Your data is safe: the current measurement is auto-saved on this computer and official calculations are kept in the local database. Reload to continue.',
  },
  'error.techDetail': { es: 'Detalle técnico', en: 'Technical detail' },
  'error.reload': { es: 'Recargar la aplicación', en: 'Reload the application' },

  // ---- Configuración: Apariencia ----------------------------------------
  'settings.title': { es: 'Configuración', en: 'Settings' },
  'settings.appearance': { es: 'Apariencia', en: 'Appearance' },
  'settings.appearanceDesc': {
    es: 'Se aplica al instante y se recuerda en este equipo.',
    en: 'Applies instantly and is remembered on this computer.',
  },
  'settings.theme': { es: 'Tema', en: 'Theme' },
  'settings.mode': { es: 'Modo', en: 'Mode' },
  'settings.light': { es: 'Claro', en: 'Light' },
  'settings.dark': { es: 'Oscuro', en: 'Dark' },
  'settings.toLight': { es: 'Cambiar a modo claro', en: 'Switch to light mode' },
  'settings.toDark': { es: 'Cambiar a modo oscuro', en: 'Switch to dark mode' },
  'settings.font': { es: 'Fuente', en: 'Font' },
  'settings.density': { es: 'Densidad de tablas', en: 'Table density' },
  'settings.language': { es: 'Idioma', en: 'Language' },
  'settings.languageDesc': {
    es: 'Idioma de la interfaz. Los estándares técnicos (ASTM, API, unidades) se mantienen.',
    en: 'Interface language. Technical standards (ASTM, API, units) are kept as-is.',
  },
  'settings.windowMemory': {
    es: 'La app de escritorio recuerda además el tamaño y la posición de la ventana entre sesiones.',
    en: 'The desktop app also remembers window size and position between sessions.',
  },

  // ---- Temas / Fuentes / Densidades (etiquetas) -------------------------
  'theme.ocean.label': { es: 'Océano', en: 'Ocean' },
  'theme.ocean.desc': { es: 'Azul→teal, aire y claridad.', en: 'Blue→teal, airy and clear.' },
  'theme.control-room.label': { es: 'Control-room', en: 'Control room' },
  'theme.control-room.desc': { es: 'Navy + cian, sala de control.', en: 'Navy + cyan, control room.' },
  'theme.industrial.label': { es: 'Industrial', en: 'Industrial' },
  'theme.industrial.desc': { es: 'Acero sobrio, esquinas marcadas.', en: 'Sober steel, sharp corners.' },
  'font.geist.label': { es: 'Geist', en: 'Geist' },
  'font.geist.desc': { es: 'Fuente del producto (incluida, offline).', en: 'Product font (bundled, offline).' },
  'font.system.label': { es: 'Sistema', en: 'System' },
  'font.system.desc': { es: 'La fuente nativa del sistema operativo.', en: "The operating system's native font." },
  'density.comfortable.label': { es: 'Cómoda', en: 'Comfortable' },
  'density.comfortable.desc': { es: 'Espaciado estándar.', en: 'Standard spacing.' },
  'density.compact.label': { es: 'Compacta', en: 'Compact' },
  'density.compact.desc': { es: 'Tablas y celdas más densas.', en: 'Denser tables and cells.' },

  // ---- Configuración: Actualizaciones -----------------------------------
  'updates.title': { es: 'Actualizaciones', en: 'Updates' },
  'updates.desc': {
    es: 'Offline-first: el chequeo nunca es obligatorio; la app funciona sin red.',
    en: 'Offline-first: checking is never required; the app works without a network.',
  },
  'updates.check': { es: 'Buscar actualizaciones', en: 'Check for updates' },
  'updates.channel': { es: 'Canal: GitHub Releases (estable)', en: 'Channel: GitHub Releases (stable)' },
  'updates.web': {
    es: 'Estás en la demo del navegador. Las actualizaciones se gestionan en la app de escritorio.',
    en: "You're in the browser demo. Updates are managed in the desktop app.",
  },
  'updates.uptodate': { es: 'Estás en la última versión.', en: "You're on the latest version." },
  'updates.unavailable': {
    es: 'Comprobación no disponible en esta compilación (se habilita en la app empaquetada firmada). Ver la guía de actualización más abajo.',
    en: 'Update check unavailable in this build (enabled in the signed packaged app). See the update guide below.',
  },
  'updates.available': { es: 'Actualización disponible: v{version}', en: 'Update available: v{version}' },
  'updates.install': { es: 'Descargar e instalar', en: 'Download and install' },
  'updates.installing': { es: 'Instalando…', en: 'Installing…' },

  // ---- Configuración: Acerca de -----------------------------------------
  'about.title': { es: 'Acerca de SuperSurvey', en: 'About SuperSurvey' },
  'about.tagline': {
    es: 'Inspección de cantidad de carga y búnker — offline-first, decimal-exacta.',
    en: 'Cargo and bunker quantity survey — offline-first, decimal-exact.',
  },
  'about.appVersion': { es: 'Versión de la app', en: 'App version' },
  'about.engine': { es: 'Motor de cálculo', en: 'Calculation engine' },
  'about.license': { es: 'Licencia', en: 'License' },
  'about.standards': { es: 'Estándares', en: 'Standards' },
  'about.privacy': { es: 'Privacidad', en: 'Privacy' },
  'about.privacyValue': {
    es: 'Sin telemetría · datos en SQLite local',
    en: 'No telemetry · data in local SQLite',
  },
  'about.engineNote': {
    es: 'Todas las cifras oficiales las produce el motor de cálculo (decimal exacto, sin redondeos intermedios no documentados) y quedan trazables paso a paso.',
    en: 'All official figures are produced by the calculation engine (decimal-exact, with no undocumented intermediate rounding) and remain traceable step by step.',
  },
  'about.docsNote': {
    es: 'Guía de usuario, licencias, actualizaciones y requisitos: carpeta',
    en: 'User guide, licenses, updates and requirements: folder',
  },
} satisfies Record<string, Entry>

export type TKey = keyof typeof dict

// Tipos compartidos del i18n, en su propio archivo para que dict.ts y los
// módulos por área (dict.flow.ts, dict.operations.ts, dict.reports.ts) los
// importen sin ciclos de importación.
export type Lang = 'es' | 'en'
export type Entry = { es: string; en: string }

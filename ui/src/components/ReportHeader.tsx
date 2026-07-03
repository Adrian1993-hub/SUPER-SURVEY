import { Ship } from 'lucide-react'

// Cabecera de marca ÚNICA para todos los documentos imprimibles (Reporte,
// SmartReport, ROB…): un solo punto de contacto white-label. El nombre corto se
// puede sobreescribir por props (a futuro: brand.json).

/** Franja de marca del documento: logo + nombre + referencia/fecha. */
export function ReportBrandBar({
  referencia,
  fecha,
  brandName = 'SuperSurvey',
  brandTagline = 'Empresa Demo · marca configurable',
}: {
  referencia: string
  fecha: string
  brandName?: string
  brandTagline?: string
}) {
  return (
    <div className="flex items-center justify-between border-b bg-muted px-8 py-5 print:bg-transparent">
      <div className="flex items-center gap-3">
        <div className="bg-brand-gradient flex h-10 w-10 items-center justify-center rounded-md">
          <Ship className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="text-lg font-bold">{brandName}</div>
          <div className="text-xs text-muted-foreground">{brandTagline}</div>
        </div>
      </div>
      <div className="text-right text-xs text-muted-foreground">
        <div className="font-mono font-semibold">{referencia}</div>
        <div>{fecha}</div>
      </div>
    </div>
  )
}

/** Título centrado del documento (bajo la franja de marca). */
export function ReportTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="text-center">
      <h1 className="text-xl font-bold uppercase tracking-wide">{title}</h1>
      {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
    </header>
  )
}

/** Bloque de firma estándar de los documentos. */
export function ReportSignature({ label }: { label: string }) {
  return (
    <div>
      <div className="h-12 border-b" />
      <div className="mt-1 text-center text-muted-foreground">{label}</div>
    </div>
  )
}

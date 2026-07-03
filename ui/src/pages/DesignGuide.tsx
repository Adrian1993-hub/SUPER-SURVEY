import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { cn } from '@/lib/utils'
import {
  Ship, Gauge, Calculator, Scale, FileCheck2, PenLine,
  ClipboardList, Users, CheckCircle2, AlertTriangle, OctagonAlert,
  ChevronRight, Waves, Palette, Type, FileSpreadsheet, FileText,
} from 'lucide-react'

// Guía de diseño VIVA, dentro de la app: usa los MISMOS tokens (data-theme ×
// data-mode) y el ThemeSwitcher real, así que refleja exactamente las 3 estéticas
// (océano, control-room, industrial) en claro y oscuro, y sirve de referencia
// para el pase de diseño / presentación.

const lbl = 'text-[11px] uppercase tracking-wide text-muted-foreground'

function Section({ eyebrow, title, desc, children }: { eyebrow: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">{eyebrow}</div>
        <h2 className="mt-1 text-xl font-bold tracking-tight">{title}</h2>
        {desc && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </section>
  )
}

type Status = 'ok' | 'noad' | 'lop'
const STATUS: Record<Status, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: 'OK · dentro de tolerancia', cls: 'status-ok', Icon: CheckCircle2 },
  noad: { label: 'NOAD · discrepancia aparente', cls: 'status-warn', Icon: AlertTriangle },
  lop: { label: 'LOP · carta de protesta', cls: 'status-bad', Icon: OctagonAlert },
}
function Chip({ kind }: { kind: Status }) {
  const s = STATUS[kind]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', s.cls)}>
      <s.Icon className="h-3.5 w-3.5" /> {s.label}
    </span>
  )
}

const FLOW = [
  { icon: ClipboardList, label: 'Trabajo', sub: 'crear / seleccionar' },
  { icon: Users, label: 'Setup', sub: 'Cover · Perfiles · Key Meeting' },
  { icon: Gauge, label: 'Medición', sub: 'Tanques · LPG · Draft · Buque↔Tierra' },
  { icon: Calculator, label: 'Cálculo + Trace', sub: 'ASTM / COSTALD' },
  { icon: Scale, label: 'Comparación', sub: 'tolerancia → NOAD / LOP' },
  { icon: FileCheck2, label: 'Reporte', sub: 'PDF · XLSX' },
  { icon: PenLine, label: 'Firma', sub: 'surveyor · master' },
]

function Stepper() {
  const [active, setActive] = useState(2)
  return (
    <Card className="card-hover">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-stretch gap-2">
          {FLOW.map((s, i) => {
            const state = i < active ? 'done' : i === active ? 'active' : 'todo'
            return (
              <div key={s.label} className="flex flex-1 min-w-[120px] items-stretch gap-2">
                <button
                  onClick={() => setActive(i)}
                  className={cn(
                    'flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-all',
                    state === 'active' && 'border-brand bg-brand/5 shadow-sm',
                    state === 'done' && 'status-ok',
                    state === 'todo' && 'border-border bg-muted/40 opacity-80 hover:opacity-100',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                      state === 'active' && 'bg-brand text-brand-foreground',
                      state === 'done' && 'bg-success text-success-foreground',
                      state === 'todo' && 'bg-muted text-muted-foreground',
                    )}>
                      {state === 'done' ? <CheckCircle2 className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                    </span>
                    <span className="text-sm font-semibold">{s.label}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{s.sub}</span>
                </button>
                {i < FLOW.length - 1 && <ChevronRight className="hidden self-center text-muted-foreground/40 md:block h-4 w-4" />}
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          El paso activo se resalta y los completados quedan en verde — el siguiente paso es siempre evidente.
          Cada pantalla guía al surveyor por el flujo más lógico, de la medición a un documento firmable.
        </p>
      </CardContent>
    </Card>
  )
}

const TOKENS: { name: string; varName: string; note: string }[] = [
  { name: 'background', varName: '--background', note: 'fondo' },
  { name: 'card', varName: '--card', note: 'superficie' },
  { name: 'muted', varName: '--muted', note: 'sutil' },
  { name: 'border', varName: '--border', note: 'borde' },
  { name: 'primary', varName: '--primary', note: 'acción' },
  { name: 'secondary', varName: '--secondary', note: 'estructura' },
  { name: 'accent', varName: '--accent', note: 'énfasis' },
  { name: 'brand', varName: '--brand', note: 'marca' },
  { name: 'brand-2', varName: '--brand-2', note: 'marca 2' },
  { name: 'destructive', varName: '--destructive', note: 'peligro' },
  { name: 'success', varName: '--success', note: 'OK / conforme' },
  { name: 'warning', varName: '--warning', note: 'atención / NOAD' },
  { name: 'danger', varName: '--danger', note: 'fuera de tolerancia / LOP' },
]
function Swatch({ name, varName, note }: { name: string; varName: string; note: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="h-12 w-full" style={{ background: `var(${varName})` }} />
      <div className="bg-card p-2">
        <div className="text-xs font-semibold">{name}</div>
        <div className="font-mono text-[10px] text-muted-foreground">{varName} · {note}</div>
      </div>
    </div>
  )
}

const TANKS = [
  ['1P', 'VLSFO', '0.9234', '31.5', '250.120', '249.880', '0.97891', '244.610', '0.99850', '226.104'],
  ['2S', 'VLSFO', '0.9234', '31.2', '180.040', '179.910', '0.97910', '176.150', '0.99850', '162.752'],
  ['3C', 'LSMGO', '0.8631', '30.8', '95.220', '95.150', '0.98140', '93.380', '0.99860', '80.520'],
]
const CUSTODY = [
  ['US bbl @60', '1,538.42', '1,531.07', '1,519.34'],
  ['m³ @15', '244.610', '243.440', '241.575'],
  ['MT (air)', '226.104', '225.020', '223.300'],
  ['MT (vac)', '226.612', '225.527', '223.802'],
  ['Long tons', '222.640', '221.572', '219.880'],
]
// Grid canónico: .table-dense (index.css) — la guía documenta la clase como canon.
const th = 'cell-grey th-caps'
const td = ''
const tdL = 'cell-l'

export function DesignGuide() {
  return (
    <div className="flex h-full flex-col">
      <TopBar title="Guía de diseño" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl space-y-12">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Palette className="h-5 w-5 text-brand" /> Sistema de diseño — vivo (3 temas)
            </h2>
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
            </div>
          </div>

          {/* Hero */}
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
              <Waves className="h-3.5 w-3.5 text-brand" /> Survey de cantidad marino/petrolero · white-label
            </span>
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight md:text-4xl">
              Un flujo <span className="text-brand-gradient">evidente</span> y un número <span className="text-brand">confiable</span>.
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Referencia viva de la presentación: tokens, tipografía, componentes densos en datos y el flujo guiado.
              Cambia el tema arriba a la derecha — todo se actualiza con el <code className="font-mono text-xs">data-theme</code> real de la app.
            </p>
          </div>

          <Section eyebrow="Flujo guiado" title="El surveyor siempre sabe el siguiente paso" desc="De crear el trabajo a un documento firmable; el diseño señala el camino más lógico.">
            <Stepper />
          </Section>

          <Section eyebrow="Tokens" title="Color y temas" desc="Tokens semánticos shadcn + marca; cambian en vivo con el tema activo. Estados del dominio: OK / NOAD / LOP.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {TOKENS.map((t) => <Swatch key={t.name} {...t} />)}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip kind="ok" /><Chip kind="noad" /><Chip kind="lop" />
            </div>
          </Section>

          <Section eyebrow="Tokens" title="Tipografía" desc="Geist para texto; Geist Mono con cifras tabulares para toda magnitud medida.">
            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-end justify-between border-b border-border pb-3">
                  <span className="text-3xl font-bold tracking-tight">Aa Survey</span>
                  <span className="text-xs text-muted-foreground">Geist · heading</span>
                </div>
                <div className="flex items-end justify-between border-b border-border pb-3">
                  <span className="font-mono text-2xl font-semibold tabular-nums">588.203 MT · 7,396.57 bbl</span>
                  <span className="text-xs text-muted-foreground">Geist Mono · tabular-nums</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground"><Type className="h-4 w-4" /> caption 12 · body 14 · subtitle 16 · title 18</div>
              </CardContent>
            </Card>
          </Section>

          <Section eyebrow="Librería" title="Componentes" desc="Botones, campos, pestañas y chips de estado — con los tokens del tema activo.">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide">Acciones y campos</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button>Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className={lbl}>Densidad @15 (kg/L)</span>
                      <input defaultValue="0.9234" className="rounded-md border border-input bg-transparent px-2 py-1.5 text-right font-mono text-sm tabular-nums outline-none focus:ring-2 focus:ring-ring" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className={lbl}>Tabla</span>
                      <select className="rounded-md border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring">
                        <option>D1250-80</option><option>D1250-04</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex gap-1 border-b border-border">
                    {['Medición', 'Cálculo', 'Comparación'].map((t, i) => (
                      <span key={t} className={cn('px-3 py-1.5 text-sm', i === 0 ? 'border-b-2 border-brand font-semibold' : 'text-muted-foreground')}>{t}</span>
                    ))}
                  </div>
                  <Button className="gap-2 bg-brand-gradient text-brand-foreground"><FileSpreadsheet className="h-4 w-4" /> Exportar XLSX</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide">Callouts de tolerancia</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="status-ok flex items-start gap-2 rounded-md border p-3 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /><span>Diferencias dentro de tolerancia (ISO ±0.30% · Contrato ±0.50%). Sin documento.</span>
                  </div>
                  <div className="status-warn flex items-start gap-2 rounded-md border p-3 text-sm text-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" /><span>El peor |Δ%| excede la capa estricta → se notifica NOAD.</span>
                  </div>
                  <div className="status-bad flex items-start gap-2 rounded-md border p-3 text-sm text-foreground">
                    <OctagonAlert className="mt-0.5 h-4 w-4 text-danger" /><span>Δ% &gt; capa más amplia → Letter of Protest (LOP).</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Section>

          <Section eyebrow="Datos" title="Tablas densas en datos" desc="El núcleo del survey: medición por tanque y cifra de custodia multi-unidad.">
            <div className="grid gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="mb-2 text-sm font-semibold">Medición por tanque (ullage → GOV → VCF → GSV → MT)</div>
                  <div className="overflow-x-auto">
                    <table className="table-dense w-full border-collapse">
                      <thead><tr>{['Tanque', 'Grado', 'Dens@15', 'T °C', 'TOV', 'GOV', 'VCF', 'GSV@15', 'WCF', 'MT aire'].map((h, i) => <th key={h} className={cn(th, i > 1 && 'text-right', i <= 1 && 'text-left')}>{h}</th>)}</tr></thead>
                      <tbody>
                        {TANKS.map((r) => (
                          <tr key={r[0]}>
                            <td className={tdL}>{r[0]}</td><td className={tdL}>{r[1]}</td>
                            {r.slice(2).map((c, i) => <td key={i} className={cn(td, i === 7 && 'font-semibold')}>{c}</td>)}
                          </tr>
                        ))}
                        <tr className="bg-muted font-semibold">
                          <td className={tdL} colSpan={4}>Totales</td>
                          <td className={td}>525.310</td><td className={td}>524.940</td><td className={td}>—</td>
                          <td className={td}>514.140</td><td className={td}>—</td><td className={td}>469.376</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="mb-2 text-sm font-semibold">Cifra de custodia · multi-unidad</div>
                  <div className="overflow-x-auto">
                    <table className="table-dense w-full border-collapse">
                      <thead><tr><th className={cn(th, 'text-left')}>Unidad</th>{['TCV', 'GSV', 'NSV'].map((h) => <th key={h} className={cn(th, 'text-right')}>{h}</th>)}</tr></thead>
                      <tbody>
                        {CUSTODY.map((r) => (
                          <tr key={r[0]}><td className={tdL}>{r[0]}</td>{r.slice(1).map((c, i) => <td key={i} className={td}>{c}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Section>

          <Section eyebrow="Salida" title="Reporte y firma" desc="Documento limpio, listo para PDF/impresión; la marca (logo/colores) sale de brand.toml.">
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-border bg-muted/50 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-gradient flex h-8 w-8 items-center justify-center rounded-md"><Ship className="h-4 w-4 text-white" /></span>
                    <span className="text-sm font-bold">SuperSurvey</span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">BQS-2026-0142</span>
                </div>
                <div className="grid gap-5 p-5 md:grid-cols-[1.3fr_1fr]">
                  <div className="space-y-3">
                    <div className="text-center"><div className="text-base font-bold uppercase tracking-wide">Vessel Measurement Report</div></div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
                      <Meta k="Buque" v="MT EXAMPLE" /><Meta k="Surveyor" v="R. Moreno" />
                      <Meta k="Puerto" v="Balboa" /><Meta k="Fecha" v="2026-06-14" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Kpi label="GSV @15" value="514.140" unit="m³" /><Kpi label="MT aire" value="469.376" unit="MT" accent /><Kpi label="Δ vs Barge" value="−0.18" unit="%" />
                    </div>
                  </div>
                  <div className="flex flex-col justify-between gap-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bloque de firma</div>
                    {['Surveyor', 'Master / Chief Eng.'].map((r) => (
                      <div key={r}><div className="h-9 border-b border-foreground/40" /><div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><PenLine className="h-3 w-3" /> {r}</div></div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>

          <footer className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
            Guía de diseño viva · tokens reales (<code className="font-mono">data-theme × data-mode</code>) · white-label (identidad de fábrica: brand.toml · colores en runtime: brand.json)
          </footer>
        </div>
      </main>
    </div>
  )
}

function Meta({ k, v }: { k: string; v: string }) {
  return <div className="flex gap-2"><span className="text-muted-foreground">{k}:</span><span className="font-medium">{v}</span></div>
}
function Kpi({ label, value, unit, accent }: { label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-xl font-bold tabular-nums">
        <span className={accent ? 'text-brand' : ''}>{value}</span> <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { samplingLevels, type SamplingTankResult } from '../lib/kernel'
import { Beaker, Plus, Trash2 } from 'lucide-react'
import { parseDec } from '../lib/num'

// Calculador de niveles de muestreo (API MPMS 8.1 / ISO 3170): a partir de la
// altura de referencia (RGH) y el ullage de cada tanque, el kernel da las cotas
// Upper/Middle/Lower donde baja el muestreador. Pensado para usarse al cargar
// los ullages iniciales de una descarga o al final de un STS. El gráfico muestra
// el nivel de producto y los tres puntos de muestreo. Datos demo editables.

export interface SamplingSeedTank {
  tank: string
  referenceHeight: number
  ullage: number
}

const DEMO: SamplingSeedTank[] = [
  { tank: '1P', referenceHeight: 28.77, ullage: 7.5 },
  { tank: '2C', referenceHeight: 29.19, ullage: 1.62 },
  { tank: '3S', referenceHeight: 28.771, ullage: 1.6 },
]

// Grid canónico: .table-dense (index.css); solo modificadores por celda.
const th = ''
const thL = 'cell-l'
const tdGrey = 'cell-grey'

function NumCell({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <td className="border border-border p-0">
      <input
        type="number"
        step={0.001}
        value={value}
        onChange={(e) => onChange(parseDec(e.target.value))}
        className="w-20 bg-transparent px-1.5 py-1 text-right font-mono text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring"
      />
    </td>
  )
}

/** SVG sección del tanque: producto + cotas Upper/Middle/Lower. */
function TankChart({ r }: { r: SamplingTankResult }) {
  const rgh = Number(r.referenceHeight)
  const ullage = Number(r.ullage)
  const num = (s?: string) => (s ? Number(s) : NaN)
  const dips = { Upper: num(r.upper), Middle: num(r.middle), Lower: num(r.lower) }
  if (!isFinite(rgh) || rgh <= 0 || r.error) {
    return <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">{r.error ?? 'Sin datos'}</div>
  }
  const W = 220
  const H = 240
  const padTop = 18
  const padBot = 18
  const usable = H - padTop - padBot
  const tankW = 96
  const x0 = 64
  const y = (depth: number) => padTop + (depth / rgh) * usable // depth from reference (top)
  const surfaceY = y(ullage)
  const bottomY = y(rgh)
  const markers: { label: string; depth: number; color: string }[] = [
    { label: 'U', depth: dips.Upper, color: 'var(--success)' },
    { label: 'M', depth: dips.Middle, color: 'var(--warning)' },
    { label: 'L', depth: dips.Lower, color: 'var(--danger)' },
  ]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[260px] w-full">
      {/* tanque */}
      <rect x={x0} y={padTop} width={tankW} height={usable} rx="4" className="fill-muted/30 stroke-border" strokeWidth="1.5" />
      {/* producto (de la superficie al fondo) */}
      <rect x={x0} y={surfaceY} width={tankW} height={bottomY - surfaceY} className="fill-brand/25" />
      <line x1={x0} y1={surfaceY} x2={x0 + tankW} y2={surfaceY} className="stroke-brand" strokeWidth="2" />
      {/* etiqueta superficie / ullage */}
      <text x={x0 + tankW + 6} y={surfaceY + 3} className="fill-current text-[8px]">
        superficie
      </text>
      <text x={x0 - 6} y={padTop + 8} textAnchor="end" className="fill-muted-foreground text-[8px]">
        ref 0
      </text>
      <text x={x0 - 6} y={bottomY} textAnchor="end" className="fill-muted-foreground text-[8px]">
        {rgh.toFixed(2)}
      </text>
      {/* cinta de sondeo */}
      <line x1={x0 + tankW / 2} y1={padTop} x2={x0 + tankW / 2} y2={markers.reduce((m, k) => Math.max(m, y(k.depth)), surfaceY)} className="stroke-muted-foreground/50" strokeDasharray="2 2" />
      {/* marcadores Upper/Middle/Lower */}
      {markers.map((m) =>
        isFinite(m.depth) ? (
          <g key={m.label}>
            <line x1={x0} y1={y(m.depth)} x2={x0 + tankW} y2={y(m.depth)} stroke={m.color} strokeWidth="1.5" />
            <circle cx={x0 + tankW / 2} cy={y(m.depth)} r="3.5" fill={m.color} />
            <text x={x0 + tankW + 6} y={y(m.depth) + 3} className="text-[8px]" fill={m.color}>
              {m.label} {m.depth.toFixed(2)}
            </text>
          </g>
        ) : null,
      )}
    </svg>
  )
}

export function SamplingPanel({ seed = DEMO, title = 'Niveles de muestreo (Upper / Middle / Lower)' }: { seed?: SamplingSeedTank[]; title?: string }) {
  const [rows, setRows] = useState<SamplingSeedTank[]>(seed.map((s) => ({ ...s })))
  const [res, setRes] = useState<SamplingTankResult[]>([])
  const [sel, setSel] = useState(0)

  useEffect(() => {
    let cancelled = false
    samplingLevels(rows, 3)
      .then((r) => !cancelled && setRes(r.tanks ?? []))
      .catch(() => !cancelled && setRes([]))
    return () => {
      cancelled = true
    }
  }, [rows])

  const update = (i: number, patch: Partial<SamplingSeedTank>) => setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const selected = useMemo(() => res[sel], [res, sel])

  return (
    <Card className="print:break-inside-avoid">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Beaker className="h-4 w-4 text-brand" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <div className="overflow-x-auto">
            <table className="table-dense w-full border-collapse">
              <thead>
                <tr>
                  <th className={thL}>Tanque</th>
                  <th className={th}>RGH</th>
                  <th className={th}>Ullage</th>
                  <th className={th}>Innage</th>
                  <th className={th}>Upper</th>
                  <th className={th}>Middle</th>
                  <th className={th}>Lower</th>
                  <th className="border border-border" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const c = res[i]
                  return (
                    <tr key={i} className={i === sel ? 'ring-1 ring-inset ring-brand/40' : ''} onClick={() => setSel(i)}>
                      <td className="border border-border p-0">
                        <input
                          value={row.tank}
                          onChange={(e) => update(i, { tank: e.target.value })}
                          className="w-16 bg-transparent px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring"
                        />
                      </td>
                      <NumCell value={row.referenceHeight} onChange={(n) => update(i, { referenceHeight: n })} />
                      <NumCell value={row.ullage} onChange={(n) => update(i, { ullage: n })} />
                      <td className={tdGrey}>{c?.innage ?? '—'}</td>
                      <td className={`${tdGrey} text-success`}>{c?.upper ?? '—'}</td>
                      <td className={`${tdGrey} text-warning`}>{c?.middle ?? '—'}</td>
                      <td className={`${tdGrey} text-danger`}>{c?.lower ?? '—'}</td>
                      <td className="border border-border text-center">
                        <button onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))} title="Quitar" className="text-muted-foreground hover:text-danger">
                          <Trash2 className="mx-auto h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-1 print:hidden"
              onClick={() => setRows((p) => [...p, { tank: `T${p.length + 1}`, referenceHeight: 0, ullage: 0 }])}
            >
              <Plus className="h-3.5 w-3.5" /> Añadir tanque
            </Button>
          </div>
          <div className="rounded-lg border bg-card p-2 print:break-inside-avoid">
            <div className="mb-1 text-center text-xs font-medium text-muted-foreground">{selected ? `Tanque ${selected.tank}` : 'Tanque'}</div>
            {selected ? <TankChart r={selected} /> : <div className="h-[260px]" />}
            <div className="mt-1 flex justify-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Upper</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Middle</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-danger" /> Lower</span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Innage = RGH − Ullage; cotas (dip desde referencia): Upper = Ullage + Innage/6, Middle = Ullage + Innage/2, Lower =
          Ullage + 5·Innage/6 (zonas superior/media/inferior). Calculado por el motor de cálculo; clic en una fila para ver su tanque.
        </p>
      </CardContent>
    </Card>
  )
}

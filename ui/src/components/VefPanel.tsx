import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { calcVef, type VefResult, type VefVoyageInput } from '../lib/kernel'
import { Gauge, Plus, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { parseDec } from '../lib/num'

// Vessel Experience Factor (API MPMS 17.9 / HM49) — parte de la operación de
// carga/descarga multigrado. Historial de viajes editable; el VEF y su
// aplicación al viaje actual los calcula el kernel WASM. Datos demo ficticios
// (el set da 0.9993, el caso de validación del kernel).

// Grid canónico: .table-dense (index.css); solo modificadores por celda.
const th = ''
const thL = 'cell-l'
const td = ''
const tdL = 'cell-l'

interface Row {
  label: string
  sailingTcv: number
  obq: number
  shoreTcv: number
  rejected: boolean
}

const demoVoyages: Row[] = [
  { label: 'V-1', sailingTcv: 99930, obq: 0, shoreTcv: 100000, rejected: false },
  { label: 'V-2', sailingTcv: 119916, obq: 0, shoreTcv: 120000, rejected: false },
  { label: 'V-3', sailingTcv: 79944, obq: 0, shoreTcv: 80000, rejected: false },
  { label: 'V-4', sailingTcv: 89937, obq: 0, shoreTcv: 90000, rejected: false },
  { label: 'V-5', sailingTcv: 109923, obq: 0, shoreTcv: 110000, rejected: false },
  { label: 'V-6', sailingTcv: 99300, obq: 0, shoreTcv: 100000, rejected: false },
  { label: 'V-7', sailingTcv: 49000, obq: 0, shoreTcv: 50000, rejected: true },
]

function Num({ value, onChange, w = 'w-24' }: { value: number; onChange: (n: number) => void; w?: string }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseDec(e.target.value))}
      className={`${w} bg-transparent px-1.5 py-1 text-right font-mono text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring`}
    />
  )
}

export function VefPanel() {
  const [rows, setRows] = useState<Row[]>(demoVoyages.map((r) => ({ ...r })))
  // Viaje actual al que se aplica el VEF (descarga de crudo).
  const [vesselQty, setVesselQty] = useState(49965)
  const [shoreQty, setShoreQty] = useState(49980)
  const [res, setRes] = useState<VefResult | null>(null)

  useEffect(() => {
    const voyages: VefVoyageInput[] = rows.map((r) => ({
      label: r.label,
      sailingTcv: r.sailingTcv,
      obq: r.obq,
      shoreTcv: r.shoreTcv,
      rejected: r.rejected,
    }))
    let cancelled = false
    calcVef({
      voyages,
      applications: [{ name: 'Outturn (viaje actual)', role: 'DISCHARGE', vesselQty, shoreQty }],
      qualifyingBandPct: 0.3,
    })
      .then((r) => !cancelled && setRes(r))
      .catch(() => !cancelled && setRes(null))
    return () => {
      cancelled = true
    }
  }, [rows, vesselQty, shoreQty])

  const update = (i: number, patch: Partial<Row>) => setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const app = res?.applications?.[0]

  return (
    <Card className="print:break-inside-avoid">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4 text-brand" /> Vessel Experience Factor (VEF) · API MPMS 17.9 / HM49
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="table-dense w-full border-collapse">
            <thead>
              <tr>
                <th className={thL}>Viaje</th>
                <th className={th}>Sailing TCV</th>
                <th className={th}>OBQ</th>
                <th className={th}>Vessel TCV</th>
                <th className={th}>Shore/B-L TCV</th>
                <th className={th}>Ratio</th>
                <th className={thL}>Estado</th>
                <th className={thL}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const vr = res?.voyages?.[i]
                const state = r.rejected
                  ? { label: 'Rechazado', cls: 'text-muted-foreground line-through' }
                  : vr?.qualifying
                    ? { label: 'Califica', cls: 'text-success' }
                    : { label: 'Descalificado', cls: 'text-warning' }
                return (
                  <tr key={i}>
                    <td className="border border-border p-0">
                      <input
                        value={r.label}
                        onChange={(e) => update(i, { label: e.target.value })}
                        className="w-16 bg-transparent px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring"
                      />
                    </td>
                    <td className="border border-border p-0 text-right">
                      <Num value={r.sailingTcv} onChange={(n) => update(i, { sailingTcv: n })} />
                    </td>
                    <td className="border border-border p-0 text-right">
                      <Num value={r.obq} onChange={(n) => update(i, { obq: n })} w="w-16" />
                    </td>
                    <td className={`${td} bg-muted/50`}>{vr?.vesselTcv ?? '—'}</td>
                    <td className="border border-border p-0 text-right">
                      <Num value={r.shoreTcv} onChange={(n) => update(i, { shoreTcv: n })} />
                    </td>
                    <td className={`${td} bg-muted/50`}>{vr?.ratio ?? '—'}</td>
                    <td className={`${tdL} ${state.cls}`}>{state.label}</td>
                    <td className="border border-border text-center">
                      <button
                        onClick={() => update(i, { rejected: !r.rejected })}
                        title={r.rejected ? 'Reactivar viaje' : 'Rechazar viaje (error grueso)'}
                        className="px-1 text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        {r.rejected ? '↺' : '⊘'}
                      </button>
                      <button
                        onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
                        title="Quitar"
                        className="px-1 text-muted-foreground hover:text-danger"
                      >
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
            className="mt-2 gap-1"
            onClick={() => setRows((p) => [...p, { label: `V-${p.length + 1}`, sailingTcv: 0, obq: 0, shoreTcv: 0, rejected: false }])}
          >
            <Plus className="h-3.5 w-3.5" /> Añadir viaje
          </Button>
        </div>

        {/* Resultado VEF */}
        <div className="grid gap-x-8 gap-y-2 rounded-lg border bg-muted/40 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4 print:bg-transparent">
          <div>
            <div className="text-xs text-muted-foreground">1ª media (Σv/Σs)</div>
            <div className="font-mono tabular-nums">{res?.firstAverage ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Banda ±0.30%</div>
            <div className="font-mono text-[11px] tabular-nums">
              {res?.bandLow ?? '—'} … {res?.bandHigh ?? '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Viajes que califican</div>
            <div className="font-mono tabular-nums">
              {res?.qualifyingCount ?? '—'} / {res?.voyageCount ?? '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">VEF</div>
            <div className="font-mono text-lg font-bold tabular-nums text-brand">{res?.vef ?? '—'}</div>
          </div>
        </div>

        {res?.warnings?.length ? (
          <p className="flex items-center gap-1.5 text-xs text-warning">
            <AlertTriangle className="h-3.5 w-3.5" /> {res.warnings[0]}
          </p>
        ) : null}

        {/* Aplicación al viaje actual */}
        <div>
          <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Aplicación al viaje actual (descarga)</h4>
          <div className="flex flex-wrap items-end gap-4 text-sm">
            <label className="text-xs text-muted-foreground">
              Ship figure (TCV)
              <div className="mt-0.5 rounded-md border border-input">
                <Num value={vesselQty} onChange={setVesselQty} w="w-28" />
              </div>
            </label>
            <label className="text-xs text-muted-foreground">
              Shore outturn (TCV)
              <div className="mt-0.5 rounded-md border border-input">
                <Num value={shoreQty} onChange={setShoreQty} w="w-28" />
              </div>
            </label>
            <div>
              <div className="text-xs text-muted-foreground">Ship × (1/VEF)</div>
              <div className="font-mono font-semibold tabular-nums">{app?.vefApplied ?? '—'}</div>
            </div>
            <div className={Number(app?.difference) === 0 ? '' : 'text-warning'}>
              <div className="text-xs text-muted-foreground">Δ vs outturn</div>
              <div className="font-mono font-semibold tabular-nums">
                {app ? `${Number(app.difference) > 0 ? '+' : ''}${app.difference} (${app.differencePct}%)` : '—'}
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {app && Math.abs(Number(app.differencePct)) <= 0.3 ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" /> dentro de lo esperado
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" /> revisar
                </>
              )}
            </span>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Vessel TCV = sailing − OBQ. La 1ª media incluye todos los viajes salvo los rechazados; los que caen fuera de ±0.30% se
          descalifican; el VEF es Σvessel/Σshore de los que califican (4 dp). Aplicación: <em>ship × (1/VEF)</em> comparado con el
          outturn de tierra. Todo lo calcula el kernel (HM49). Datos de demostración.
        </p>
      </CardContent>
    </Card>
  )
}

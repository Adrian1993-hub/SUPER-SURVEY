import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { reconcileTerminal, kernelVersion, type ReconciliationResult, type TerminalOperation } from '../lib/kernel'
import { Cpu, FileText, Factory, Ship, Spline, Scale } from 'lucide-react'

// Conciliación buque↔tierra (terminal/cargo). Todo lo calcula el kernel WASM:
// medición de tierra por diferencia (|cierre − apertura|) ± contenido de línea
// (pipeline reconciliation) → Cantidad de tierra; se concilia contra la cifra del
// buque y el B/L → Δ, Δ% y recomendación None/NOAD/LOP. Anclado al reporte real
// de Barge Tow Loading (caso real de remolque de barcazas): Loaded vs B/L = −0.411 %.

// Formulario denso canónico: .input-dense (index.css).
const lbl = 'text-[11px] text-muted-foreground'
const inp = 'input-dense'

function Field({ label, value, onChange, step = 0.001, disabled }: { label: string; value: number; onChange: (n: number) => void; step?: number; disabled?: boolean }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className={lbl}>{label}</span>
      <input type="number" step={step} value={Number.isFinite(value) ? value : 0} disabled={disabled} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className={`${inp} ${disabled ? 'opacity-40' : ''}`} />
    </label>
  )
}

const ACTION: Record<string, { text: string; cls: string }> = {
  NONE: { text: 'Sin acción — dentro de tolerancia', cls: 'status-ok' },
  ISSUE_NOAD: { text: 'NOAD — nota de discrepancia aparente', cls: 'status-warn' },
  ISSUE_LOP: { text: 'LOP — carta de protesta (formal)', cls: 'status-bad' },
}

export function ShipShore() {
  const [operation, setOperation] = useState<TerminalOperation>('LOAD')
  const [unit, setUnit] = useState<'MT' | 'BBL' | 'M3'>('BBL')
  const [vessel, setVessel] = useState(4507.58)
  const [shoreMode, setShoreMode] = useState<'gauged' | 'direct'>('gauged')
  const [shoreOpening, setShoreOpening] = useState(0)
  const [shoreClosing, setShoreClosing] = useState(4520.0)
  const [shoreDirect, setShoreDirect] = useState(4507.58)
  const [lineBefore, setLineBefore] = useState(0)
  const [lineAfter, setLineAfter] = useState(12.42)
  const [bl, setBl] = useState(4526.18)
  const [isoLimit, setIsoLimit] = useState(0.3)
  const [contractLimit, setContractLimit] = useState(0.5)
  const [res, setRes] = useState<ReconciliationResult | null>(null)
  const [kver, setKver] = useState('')

  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])

  useEffect(() => {
    let cancelled = false
    reconcileTerminal({
      operation,
      unit,
      vesselFigure: vessel,
      shoreOpening: shoreMode === 'gauged' ? shoreOpening : undefined,
      shoreClosing: shoreMode === 'gauged' ? shoreClosing : undefined,
      shoreFigure: shoreMode === 'direct' ? shoreDirect : undefined,
      lineBefore,
      lineAfter,
      blFigure: bl > 0 ? bl : undefined,
      layers: [
        { name: 'ISO / línea base', limitPct: isoLimit },
        { name: 'Contrato', limitPct: contractLimit },
      ],
      decimals: 3,
    })
      .then((r) => !cancelled && setRes(r))
      .catch(() => !cancelled && setRes(null))
    return () => {
      cancelled = true
    }
  }, [operation, unit, vessel, shoreMode, shoreOpening, shoreClosing, shoreDirect, lineBefore, lineAfter, bl, isoLimit, contractLimit])

  const action = res?.success && res.recommendedAction ? ACTION[res.recommendedAction] : null

  return (
    <div className="flex h-full flex-col print:block print:h-auto">
      <TopBar title="Conciliación Buque ↔ Tierra" />
      <main className="flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Factory className="h-5 w-5 text-brand" /> Conciliación buque ↔ tierra (terminal · pipeline)
            </h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Operación
                <select value={operation} onChange={(e) => setOperation(e.target.value as TerminalOperation)} className="rounded-md border border-input bg-transparent px-2 py-1 text-xs">
                  <option value="LOAD">Carga (tierra → buque)</option>
                  <option value="DISCHARGE">Descarga (buque → tierra)</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Unidad
                <select value={unit} onChange={(e) => setUnit(e.target.value as 'MT' | 'BBL' | 'M3')} className="rounded-md border border-input bg-transparent px-2 py-1 text-xs">
                  <option value="BBL">bbl</option>
                  <option value="MT">MT</option>
                  <option value="M3">m³</option>
                </select>
              </label>
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
              <span className="inline-flex items-center gap-1.5 status-ok rounded-full border px-2.5 py-1 text-xs font-medium">
                <Cpu className="h-3.5 w-3.5" /> Kernel {kver ? `v${kver}` : '…'} · WASM
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Buque */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide"><Ship className="h-4 w-4 text-brand" /> Cifra del buque</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Field label={`Cifra buque (${unit}) — ${operation === 'LOAD' ? 'cargado' : 'descargado'}`} value={vessel} onChange={setVessel} />
                <p className={lbl}>Vessel loaded / discharged (TCV→GSV→NSV), opcionalmente con VEF aplicado.</p>
              </CardContent>
            </Card>

            {/* Tierra — Shore Measurement */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide"><Factory className="h-4 w-4 text-brand" /> Medición de tierra</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-1 text-[11px]">
                  {(['gauged', 'direct'] as const).map((m) => (
                    <button key={m} onClick={() => setShoreMode(m)} className={`rounded px-2 py-0.5 ${shoreMode === m ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {m === 'gauged' ? 'Por diferencia' : 'Cifra directa'}
                    </button>
                  ))}
                </div>
                {shoreMode === 'gauged' ? (
                  <>
                    <Field label={`Tanque tierra apertura (${unit})`} value={shoreOpening} onChange={setShoreOpening} />
                    <Field label={`Tanque tierra cierre (${unit})`} value={shoreClosing} onChange={setShoreClosing} />
                  </>
                ) : (
                  <Field label={`Cifra de tierra (${unit})`} value={shoreDirect} onChange={setShoreDirect} />
                )}
              </CardContent>
            </Card>

            {/* Pipeline + B/L */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide"><Spline className="h-4 w-4 text-brand" /> Línea (pipeline) · B/L</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Field label={`Contenido de línea antes (${unit})`} value={lineBefore} onChange={setLineBefore} />
                <Field label={`Contenido de línea después (${unit})`} value={lineAfter} onChange={setLineAfter} />
                <Field label={`Bill of Lading (${unit}) — 0 = omitir`} value={bl} onChange={setBl} />
              </CardContent>
            </Card>
          </div>

          {/* Shore Quantity (medición → pipeline → cantidad) */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide">Pipeline Reconciliation → Shore Quantity</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-x-10 gap-y-3">
              <div>
                <div className={lbl}>Movimiento de tierra |cierre − apertura| ({unit})</div>
                <div className="font-mono text-lg font-semibold tabular-nums">{res?.shoreMovement ?? (shoreMode === 'direct' ? '(directa)' : '—')}</div>
              </div>
              <div>
                <div className={lbl}>Ajuste de línea ({unit}) — {operation === 'LOAD' ? 'resta' : 'suma'}</div>
                <div className="font-mono text-lg font-semibold tabular-nums">{res?.lineAdjustment ?? '—'}</div>
              </div>
              <div>
                <div className={lbl}>Shore Quantity ({unit})</div>
                <div className="font-mono text-2xl font-bold tabular-nums text-brand">{res?.shoreQuantity ?? '—'}</div>
              </div>
            </CardContent>
          </Card>

          {/* Tolerancias */}
          <Card className="print:hidden">
            <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide">Capas de tolerancia (±%)</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <Field label="ISO / línea base (±%)" value={isoLimit} onChange={setIsoLimit} step={0.01} />
              <Field label="Contrato (±%)" value={contractLimit} onChange={setContractLimit} step={0.01} />
              <p className={`${lbl} max-w-md`}>La recomendación la dirige el peor |Δ%|: dentro de todas → sin acción; supera la más estricta → NOAD; supera la más amplia → LOP.</p>
            </CardContent>
          </Card>

          {/* Reconciliación */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4 text-brand" /> Reconciliación</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <table className="table-dense w-full border-collapse">
                <thead>
                  <tr>
                    <th className="cell-l th-caps">Comparación</th>
                    <th className="th-caps">Figura</th>
                    <th className="th-caps">Referencia</th>
                    <th className="th-caps">Δ</th>
                    <th className="th-caps">Δ%</th>
                    <th className="th-caps text-center">Tol.</th>
                  </tr>
                </thead>
                <tbody>
                  {res?.variances?.map((v) => (
                    <tr key={v.label}>
                      <td className="cell-l">{v.label}</td>
                      <td>{v.figure}</td>
                      <td>{v.reference}</td>
                      <td>{v.delta}</td>
                      <td className={`font-semibold ${v.withinAll ? '' : 'text-warning'}`}>{v.deltaPct} %</td>
                      <td className={`text-center font-semibold ${v.withinAll ? 'text-success' : 'text-danger'}`}>{v.withinAll ? '✓' : '✗'}</td>
                    </tr>
                  )) ?? (
                    <tr><td colSpan={6} className="cell-l py-2 text-center text-muted-foreground">—</td></tr>
                  )}
                </tbody>
              </table>

              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <div className={lbl}>Peor Δ%</div>
                  <div className="font-mono text-xl font-bold tabular-nums">{res?.worstDeltaPct ?? '—'} %</div>
                </div>
                {action && <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${action.cls}`}>{action.text}</span>}
              </div>

              {res && !res.success && <p className="text-sm text-danger">{res.errors?.[0]?.message}</p>}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            <strong>Shore Quantity = |cierre − apertura| ± contenido de línea</strong> (carga: resta lo que quedó en la línea; descarga: suma lo
            entregado que aún está en la línea). <strong>Δ% = (figura − referencia)/referencia × 100</strong>; Buque vs Tierra (base = tierra),
            Buque/Tierra vs B/L (base = B/L). Mismo motor de tolerancia que Comparación (None/NOAD/LOP). Anclado al reporte real de Barge Tow
            Loading (Loaded vs B/L = −0.411 %). Todo el cálculo en el kernel Rust/WASM.
          </p>
        </div>
      </main>
    </div>
  )
}

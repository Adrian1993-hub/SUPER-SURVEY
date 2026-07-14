import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { reconcileTerminal, kernelVersion, type ReconciliationResult, type TerminalOperation } from '../lib/kernel'
import { Cpu, FileText, Factory, Ship, Spline, Scale } from 'lucide-react'
import { parseDec } from '../lib/num'
import { useT } from '../i18n/LanguageProvider'
import type { TKey } from '../i18n/dict'

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
      <input type="number" step={step} value={Number.isFinite(value) ? value : 0} disabled={disabled} onChange={(e) => onChange(parseDec(e.target.value))} className={`${inp} ${disabled ? 'opacity-40' : ''}`} />
    </label>
  )
}

const ACTION: Record<string, { textKey: TKey; cls: string }> = {
  NONE: { textKey: 'shipshore.actionNone', cls: 'status-ok' },
  ISSUE_NOAD: { textKey: 'shipshore.actionNoad', cls: 'status-warn' },
  ISSUE_LOP: { textKey: 'shipshore.actionLop', cls: 'status-bad' },
}

export function ShipShore() {
  const t = useT()
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
      <TopBar title={t('shipshore.title')} />
      <main className="flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Factory className="h-5 w-5 text-brand" /> {t('shipshore.heading')}
            </h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {t('draft.operation')}
                <select value={operation} onChange={(e) => setOperation(e.target.value as TerminalOperation)} className="rounded-md border border-input bg-transparent px-2 py-1 text-xs">
                  <option value="LOAD">{t('shipshore.opLoad')}</option>
                  <option value="DISCHARGE">{t('shipshore.opDischarge')}</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {t('shipshore.unit')}
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
                <Cpu className="h-3.5 w-3.5" /> {t('flowShared.engine')}{kver ? ` · v${kver}` : ''}
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Buque */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide"><Ship className="h-4 w-4 text-brand" /> {t('shipshore.vesselFigure')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Field label={operation === 'LOAD' ? t('shipshore.vesselFigureLoaded', { unit }) : t('shipshore.vesselFigureDischarged', { unit })} value={vessel} onChange={setVessel} />
                <p className={lbl}>{t('shipshore.vesselNote')}</p>
              </CardContent>
            </Card>

            {/* Tierra — Shore Measurement */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide"><Factory className="h-4 w-4 text-brand" /> {t('shipshore.shoreMeasurement')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-1 text-[11px]">
                  {(['gauged', 'direct'] as const).map((m) => (
                    <button key={m} onClick={() => setShoreMode(m)} className={`rounded px-2 py-0.5 ${shoreMode === m ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {m === 'gauged' ? t('shipshore.byDifference') : t('shipshore.directFigure')}
                    </button>
                  ))}
                </div>
                {shoreMode === 'gauged' ? (
                  <>
                    <Field label={t('shipshore.shoreOpening', { unit })} value={shoreOpening} onChange={setShoreOpening} />
                    <Field label={t('shipshore.shoreClosing', { unit })} value={shoreClosing} onChange={setShoreClosing} />
                  </>
                ) : (
                  <Field label={t('shipshore.shoreFigure', { unit })} value={shoreDirect} onChange={setShoreDirect} />
                )}
              </CardContent>
            </Card>

            {/* Pipeline + B/L */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide"><Spline className="h-4 w-4 text-brand" /> {t('shipshore.lineBl')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Field label={t('shipshore.lineBefore', { unit })} value={lineBefore} onChange={setLineBefore} />
                <Field label={t('shipshore.lineAfter', { unit })} value={lineAfter} onChange={setLineAfter} />
                <Field label={t('shipshore.blSkip', { unit })} value={bl} onChange={setBl} />
              </CardContent>
            </Card>
          </div>

          {/* Shore Quantity (medición → pipeline → cantidad) */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide">Pipeline Reconciliation → Shore Quantity</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-x-10 gap-y-3">
              <div>
                <div className={lbl}>{t('shipshore.shoreMovement', { unit })}</div>
                <div className="font-mono text-lg font-semibold tabular-nums">{res?.shoreMovement ?? (shoreMode === 'direct' ? t('shipshore.direct') : '—')}</div>
              </div>
              <div>
                <div className={lbl}>{operation === 'LOAD' ? t('shipshore.lineAdjSubtract', { unit }) : t('shipshore.lineAdjAdd', { unit })}</div>
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
            <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide">{t('shipshore.toleranceLayers')}</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <Field label={t('shipshore.isoBaseline')} value={isoLimit} onChange={setIsoLimit} step={0.01} />
              <Field label={t('shipshore.contract')} value={contractLimit} onChange={setContractLimit} step={0.01} />
              <p className={`${lbl} max-w-md`}>{t('shipshore.tolNote')}</p>
            </CardContent>
          </Card>

          {/* Reconciliación */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4 text-brand" /> {t('shipshore.reconciliation')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <table className="table-dense w-full border-collapse">
                <thead>
                  <tr>
                    <th className="cell-l th-caps">{t('shipshore.colComparison')}</th>
                    <th className="th-caps">{t('shipshore.colFigure')}</th>
                    <th className="th-caps">{t('shipshore.colReference')}</th>
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
                  <div className={lbl}>{t('shipshore.worstDelta')}</div>
                  <div className="font-mono text-xl font-bold tabular-nums">{res?.worstDeltaPct ?? '—'} %</div>
                </div>
                {action && <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${action.cls}`}>{t(action.textKey)}</span>}
              </div>

              {res && !res.success && <p className="text-sm text-danger">{res.errors?.[0]?.message}</p>}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            <strong>{t('shipshore.noteFormula')}</strong>{t('shipshore.noteMid')}<strong>{t('shipshore.noteDelta')}</strong>{t('shipshore.notePost')}
          </p>
        </div>
      </main>
    </div>
  )
}

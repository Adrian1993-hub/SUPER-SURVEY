import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { draftSurvey, hydrostaticInterpolate, kernelVersion, type DraftConditionInput, type DraftSurveyResult, type HydrostaticRowInput } from '../lib/kernel'
import { Cpu, Anchor, FileText, Ship, TableProperties } from 'lucide-react'
import { parseDec } from '../lib/num'
import { useT } from '../i18n/LanguageProvider'
import type { TKey } from '../i18n/dict'

// Parse CSV "draft,displacement,tpc,lcf,mtc" (una fila por línea).
function parseHydroTable(csv: string): HydrostaticRowInput[] {
  return csv
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^draft/i.test(l))
    .map((l) => l.split(/[,;\t]+/).map((x) => parseFloat(x.trim())))
    .filter((p) => p.length >= 5 && p.every((n) => isFinite(n)))
    .map((p) => ({ draft: p[0], displacement: p[1], tpc: p[2], lcf: p[3], mtcPerMetre: p[4] }))
}

// Draft survey (granel) por desplazamiento — todo lo calcula el kernel WASM
// (port del cálculo .NET validado, UNECE). Dos condiciones (inicial/final) →
// Net Displacement por diferencia = carga; reconciliación con la báscula de
// tierra (suma de camiones). Datos demo del worksheet anclado.

const initialSeed: DraftConditionInput = { forward: 4.466, aft: 6.804, midship: 5.553, lbp: 175, density: 1.0165, displacementQM: 23771.25, tpc: 46.2, lcf: -5.448, mtcPerMetre: 28.5, deductibles: 6662.941 }
const finalSeed: DraftConditionInput = { forward: 4.081, aft: 6.513, midship: 5.217, lbp: 175, density: 1.018, displacementQM: 22219.995, tpc: 45.9, lcf: -5.85775, mtcPerMetre: 28.0, deductibles: 7532.03 }

const FIELDS: { key: keyof DraftConditionInput; labelKey: TKey; step?: number }[] = [
  { key: 'forward', labelKey: 'draft.f.forward', step: 0.001 },
  { key: 'aft', labelKey: 'draft.f.aft', step: 0.001 },
  { key: 'midship', labelKey: 'draft.f.midship', step: 0.001 },
  { key: 'lbp', labelKey: 'draft.f.lbp', step: 0.1 },
  { key: 'density', labelKey: 'draft.f.density', step: 0.0001 },
  { key: 'displacementQM', labelKey: 'draft.f.dispQM', step: 0.001 },
  { key: 'tpc', labelKey: 'draft.f.tpc', step: 0.01 },
  { key: 'lcf', labelKey: 'draft.f.lcf', step: 0.001 },
  { key: 'mtcPerMetre', labelKey: 'draft.f.mtc', step: 0.001 },
  { key: 'deductibles', labelKey: 'draft.f.deductibles', step: 0.001 },
]

// Formulario denso canónico: .input-dense (index.css).
const lbl = 'text-[11px] text-muted-foreground'
const inp = 'input-dense'

function ConditionForm({ title, c, onChange }: { title: string; c: DraftConditionInput; onChange: (c: DraftConditionInput) => void }) {
  const t = useT()
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-0.5">
            <span className={lbl}>{t(f.labelKey)}</span>
            <input
              type="number"
              step={f.step ?? 0.001}
              value={c[f.key] ?? 0}
              onChange={(e) => onChange({ ...c, [f.key]: parseDec(e.target.value) })}
              className={inp}
            />
          </label>
        ))}
      </CardContent>
    </Card>
  )
}

function ResultRows({ r }: { r: DraftSurveyResult['initial'] }) {
  const t = useT()
  const rows: [string, string | undefined][] = [
    [t('draft.r.quarterMean'), r?.quarterMean],
    [t('draft.r.trim'), r?.trim],
    [t('draft.r.firstTrim'), r?.firstTrimCorrection],
    [t('draft.r.secondTrim'), r?.secondTrimCorrection],
    [t('draft.r.dispTrim'), r?.displacementCorrectedForTrim],
    [t('draft.r.densityCorr'), r?.densityCorrection],
    [t('draft.r.dispDensity'), r?.displacementCorrectedForDensity],
    ['Net Displacement', r?.netDisplacement],
  ]
  return (
    <table className="table-dense w-full border-collapse">
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={k} className={i === rows.length - 1 ? 'bg-muted font-semibold' : ''}>
            <td className="cell-l text-muted-foreground">{k}</td>
            <td>{v ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function DraftSurvey() {
  const t = useT()
  const [initial, setInitial] = useState(initialSeed)
  const [final, setFinal] = useState(finalSeed)
  const [operation, setOperation] = useState<'LOAD' | 'DISCHARGE'>('DISCHARGE')
  const [shoreScale, setShoreScale] = useState(4064.16)
  const [res, setRes] = useState<DraftSurveyResult | null>(null)
  const [kver, setKver] = useState('')
  const [csv, setCsv] = useState({ initial: '', final: '' })
  const [hint, setHint] = useState('')

  async function interpolateInto(which: 'initial' | 'final') {
    const qm = which === 'initial' ? res?.initial?.quarterMean : res?.final?.quarterMean
    const rows = parseHydroTable(csv[which])
    if (!qm || rows.length < 2) {
      setHint(t('draft.hintRows'))
      return
    }
    const r = await hydrostaticInterpolate(rows, Number(qm))
    if (!r.success) {
      setHint(r.errors?.[0]?.message ?? t('draft.hintRange'))
      return
    }
    const patch = { displacementQM: Number(r.displacement), tpc: Number(r.tpc), lcf: Number(r.lcf), mtcPerMetre: Number(r.mtcPerMetre) }
    if (which === 'initial') setInitial((c) => ({ ...c, ...patch }))
    else setFinal((c) => ({ ...c, ...patch }))
    setHint(t('draft.hintOk', { qm: String(qm), disp: String(r.displacement) }))
  }

  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])
  useEffect(() => {
    let cancelled = false
    draftSurvey(initial, final, operation)
      .then((r) => !cancelled && setRes(r))
      .catch(() => !cancelled && setRes(null))
    return () => {
      cancelled = true
    }
  }, [initial, final, operation])

  const cargo = res?.success ? Number(res.cargo) : NaN
  const diffShore = isFinite(cargo) && shoreScale ? cargo - shoreScale : NaN

  return (
    <div className="flex h-full flex-col print:block print:h-auto">
      <TopBar title={t('draft.title')} />
      <main className="flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Anchor className="h-5 w-5 text-brand" /> {t('draft.heading')}
            </h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {t('draft.operation')}
                <select value={operation} onChange={(e) => setOperation(e.target.value as 'LOAD' | 'DISCHARGE')} className="rounded-md border border-input bg-transparent px-2 py-1 text-xs">
                  <option value="DISCHARGE">{t('draft.discharge')}</option>
                  <option value="LOAD">{t('draft.load')}</option>
                </select>
              </label>
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
              <span className="inline-flex items-center gap-1.5 status-ok rounded-full border px-2.5 py-1 text-xs font-medium">
                <Cpu className="h-3.5 w-3.5" /> {t('flowShared.engine')} · UNECE{kver ? ` · v${kver}` : ''}
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ConditionForm title={t('draft.initialCondition')} c={initial} onChange={setInitial} />
            <ConditionForm title={t('draft.finalCondition')} c={final} onChange={setFinal} />
          </div>

          {/* Tabla hidrostática opcional: pega la del buque y el kernel interpola */}
          <Card className="print:hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide">
                <TableProperties className="h-4 w-4 text-brand" /> {t('draft.hydroTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              {(['initial', 'final'] as const).map((which) => (
                <div key={which} className="flex flex-col gap-1">
                  <span className={lbl}>{which === 'initial' ? t('draft.csvInitial') : t('draft.csvFinal')}</span>
                  <textarea
                    rows={3}
                    value={csv[which]}
                    onChange={(e) => setCsv((s) => ({ ...s, [which]: e.target.value }))}
                    placeholder={'5.0,20000,45,-5,28\n6.0,24600,46,-5.5,28.5'}
                    className="w-full rounded-md border border-input bg-transparent px-2 py-1 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <Button variant="outline" size="sm" className="self-start" onClick={() => void interpolateInto(which)}>
                    {which === 'initial' ? t('draft.interpolateInitial') : t('draft.interpolateFinal')}
                  </Button>
                </div>
              ))}
              {hint && <p className="text-[11px] text-muted-foreground lg:col-span-2">{hint}</p>}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide">{t('draft.initialResult')}</CardTitle></CardHeader>
              <CardContent><ResultRows r={res?.initial} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide">{t('draft.finalResult')}</CardTitle></CardHeader>
              <CardContent><ResultRows r={res?.final} /></CardContent>
            </Card>
          </div>

          {/* Carga + reconciliación con tierra */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Ship className="h-4 w-4 text-brand" /> {t('draft.cargoRecon')}</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-x-10 gap-y-3">
              <div>
                <div className={lbl}>{t('draft.cargoByDs')}</div>
                <div className="font-mono text-2xl font-bold tabular-nums text-brand">{isFinite(cargo) ? cargo.toFixed(3) : '—'}</div>
              </div>
              <label className="flex flex-col gap-0.5">
                <span className={lbl}>{t('draft.shoreScale')}</span>
                <input type="number" step={0.001} value={shoreScale} onChange={(e) => setShoreScale(parseDec(e.target.value))} className={`${inp} w-40`} />
              </label>
              <div>
                <div className={lbl}>{t('draft.diffShore')}</div>
                <div className={`font-mono text-lg font-semibold tabular-nums ${Math.abs(diffShore) > 0 ? 'text-warning' : ''}`}>{isFinite(diffShore) ? `${diffShore > 0 ? '+' : ''}${diffShore.toFixed(3)}` : '—'}</div>
              </div>
              {res && !res.success && <p className="text-sm text-danger">{res.errors?.[0]?.message}</p>}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            {t('draft.notePre')}<strong>{t('draft.noteCargo')}</strong>{t('draft.notePost')}
          </p>
        </div>
      </main>
    </div>
  )
}

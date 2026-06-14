import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { draftSurvey, hydrostaticInterpolate, kernelVersion, type DraftConditionInput, type DraftSurveyResult, type HydrostaticRowInput } from '../lib/kernel'
import { Cpu, Anchor, FileText, Ship, TableProperties } from 'lucide-react'

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

const FIELDS: { key: keyof DraftConditionInput; label: string; step?: number }[] = [
  { key: 'forward', label: 'Calado proa (m)', step: 0.001 },
  { key: 'aft', label: 'Calado popa (m)', step: 0.001 },
  { key: 'midship', label: 'Calado medio (m)', step: 0.001 },
  { key: 'lbp', label: 'LBP (m)', step: 0.1 },
  { key: 'density', label: 'Densidad agua (t/m³)', step: 0.0001 },
  { key: 'displacementQM', label: 'Desplazam. @cuarto-medio (MT)', step: 0.001 },
  { key: 'tpc', label: 'TPC', step: 0.01 },
  { key: 'lcf', label: 'LCF (m, proa = −)', step: 0.001 },
  { key: 'mtcPerMetre', label: 'dm/dz (ΔMTC por m)', step: 0.001 },
  { key: 'deductibles', label: 'Pesos no-carga Σ (MT)', step: 0.001 },
]

const lbl = 'text-[11px] text-muted-foreground'
const inp = 'w-full rounded-md border border-input bg-transparent px-2 py-1 text-right font-mono text-[12px] tabular-nums focus:outline-none focus:ring-1 focus:ring-ring'

function ConditionForm({ title, c, onChange }: { title: string; c: DraftConditionInput; onChange: (c: DraftConditionInput) => void }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm uppercase tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-0.5">
            <span className={lbl}>{f.label}</span>
            <input
              type="number"
              step={f.step ?? 0.001}
              value={c[f.key] ?? 0}
              onChange={(e) => onChange({ ...c, [f.key]: parseFloat(e.target.value) || 0 })}
              className={inp}
            />
          </label>
        ))}
      </CardContent>
    </Card>
  )
}

function ResultRows({ r }: { r: DraftSurveyResult['initial'] }) {
  const rows: [string, string | undefined][] = [
    ['Cuarto-medio (m)', r?.quarterMean],
    ['Trim (m)', r?.trim],
    ['1ª corr. trim', r?.firstTrimCorrection],
    ['2ª corr. trim', r?.secondTrimCorrection],
    ['Disp. corr. trim', r?.displacementCorrectedForTrim],
    ['Corr. densidad', r?.densityCorrection],
    ['Disp. corr. densidad', r?.displacementCorrectedForDensity],
    ['Net Displacement', r?.netDisplacement],
  ]
  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={k} className={i === rows.length - 1 ? 'bg-muted font-semibold' : ''}>
            <td className="border border-border px-1.5 py-1 text-left text-[11px] text-muted-foreground">{k}</td>
            <td className="border border-border px-1.5 py-1 text-right font-mono text-[11px] tabular-nums">{v ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function DraftSurvey() {
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
      setHint('Pega ≥2 filas (draft,desplazam.,TPC,LCF,MTC) y asegúrate de tener calados válidos.')
      return
    }
    const r = await hydrostaticInterpolate(rows, Number(qm))
    if (!r.success) {
      setHint(r.errors?.[0]?.message ?? 'No se pudo interpolar (¿calado fuera de rango?).')
      return
    }
    const patch = { displacementQM: Number(r.displacement), tpc: Number(r.tpc), lcf: Number(r.lcf), mtcPerMetre: Number(r.mtcPerMetre) }
    if (which === 'initial') setInitial((c) => ({ ...c, ...patch }))
    else setFinal((c) => ({ ...c, ...patch }))
    setHint(`Interpolado @cuarto-medio ${qm} m → desplazamiento ${r.displacement} MT.`)
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
      <TopBar title="Draft Survey" />
      <main className="flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Anchor className="h-5 w-5 text-brand" /> Draft Survey (granel) — carga por desplazamiento
            </h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Operación
                <select value={operation} onChange={(e) => setOperation(e.target.value as 'LOAD' | 'DISCHARGE')} className="rounded-md border border-input bg-transparent px-2 py-1 text-xs">
                  <option value="DISCHARGE">Descarga</option>
                  <option value="LOAD">Carga</option>
                </select>
              </label>
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
                <Cpu className="h-3.5 w-3.5" /> Kernel {kver ? `v${kver}` : '…'} · UNECE · WASM
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ConditionForm title="Condición inicial" c={initial} onChange={setInitial} />
            <ConditionForm title="Condición final" c={final} onChange={setFinal} />
          </div>

          {/* Tabla hidrostática opcional: pega la del buque y el kernel interpola */}
          <Card className="print:hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide">
                <TableProperties className="h-4 w-4 text-brand" /> Tabla hidrostática (opcional) — interpola al cuarto-medio
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 lg:grid-cols-2">
              {(['initial', 'final'] as const).map((which) => (
                <div key={which} className="flex flex-col gap-1">
                  <span className={lbl}>{which === 'initial' ? 'Inicial' : 'Final'} — CSV: draft,desplazam.,TPC,LCF,MTC</span>
                  <textarea
                    rows={3}
                    value={csv[which]}
                    onChange={(e) => setCsv((s) => ({ ...s, [which]: e.target.value }))}
                    placeholder={'5.0,20000,45,-5,28\n6.0,24600,46,-5.5,28.5'}
                    className="w-full rounded-md border border-input bg-transparent px-2 py-1 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <Button variant="outline" size="sm" className="self-start" onClick={() => void interpolateInto(which)}>
                    Interpolar {which === 'initial' ? 'inicial' : 'final'} @cuarto-medio
                  </Button>
                </div>
              ))}
              {hint && <p className="text-[11px] text-muted-foreground lg:col-span-2">{hint}</p>}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide">Resultado inicial</CardTitle></CardHeader>
              <CardContent><ResultRows r={res?.initial} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wide">Resultado final</CardTitle></CardHeader>
              <CardContent><ResultRows r={res?.final} /></CardContent>
            </Card>
          </div>

          {/* Carga + reconciliación con tierra */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Ship className="h-4 w-4 text-brand" /> Carga y reconciliación</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-x-10 gap-y-3">
              <div>
                <div className={lbl}>Carga por draft survey (MT)</div>
                <div className="font-mono text-2xl font-bold tabular-nums text-brand">{isFinite(cargo) ? cargo.toFixed(3) : '—'}</div>
              </div>
              <label className="flex flex-col gap-0.5">
                <span className={lbl}>Báscula de tierra (MT) — Σ camiones</span>
                <input type="number" step={0.001} value={shoreScale} onChange={(e) => setShoreScale(parseFloat(e.target.value) || 0)} className={`${inp} w-40`} />
              </label>
              <div>
                <div className={lbl}>Diferencia DS − báscula (MT)</div>
                <div className={`font-mono text-lg font-semibold tabular-nums ${Math.abs(diffShore) > 0 ? 'text-amber-600' : ''}`}>{isFinite(diffShore) ? `${diffShore > 0 ? '+' : ''}${diffShore.toFixed(3)}` : '—'}</div>
              </div>
              {res && !res.success && <p className="text-sm text-red-500">{res.errors?.[0]?.message}</p>}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Cuarto-medio = (proa + popa + 6·medio)/8; 1ª corr. = trim·100·LCF·TPC/LBP; 2ª corr. = trim²·50·(dm/dz)/LBP; corr. densidad
            a 1.025; Net = disp(densidad) − Σno-carga; <strong>carga = |Net inicial − Net final|</strong>. Port del cálculo .NET
            validado (UNECE), anclado a un worksheet real. La báscula de tierra es la suma del control por camión.
          </p>
        </div>
      </main>
    </div>
  )
}

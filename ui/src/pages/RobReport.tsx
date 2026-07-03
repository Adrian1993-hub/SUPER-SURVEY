import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { getJob } from '../data/demoJobs'
import { toleranceLayers } from '../data/vmr'
import { robData, type RobGrade } from '../data/rob'
import { compareSources, kernelVersion, type ComparisonResult } from '../lib/kernel'
import { sectionTotals, useComputedRows } from '../lib/useBqsRows'
import { downloadWorkbook, type SheetSpec } from '../lib/xlsx'
import { Ship, FileText, FileSpreadsheet, Braces, CheckCircle2, AlertTriangle } from 'lucide-react'

// Reporte ROB (Remaining On Board): inventario de búnker por grado calculado por
// el kernel (misma matemática que BQS) y comparado, grado a grado, contra el ROB
// declarado en el Libro de Máquinas (ER Log). Tolerancia ±0.5% (estándar de la
// industria) modelada por las capas del kernel → Conforme / NOAD / LOP.
// Datos DEMO ficticios. Ver docs/research/logbook-maquinas-surveyor.md.

const f3 = (n: number) => n.toFixed(3)
const f4 = (n: number) => n.toFixed(4)

// Grid canónico: .table-dense (index.css); solo modificadores por celda.
const th = 'cell-l th-caps'
const td = ''
const tdL = 'cell-l'

interface GradeResult {
  surveyMt: number
  action: ComparisonResult['recommendedAction']
  delta?: string
  deltaPct?: string
}

function verdictStyle(action: ComparisonResult['recommendedAction']) {
  if (action === 'ISSUE_LOP') return { text: 'text-danger', chip: 'status-bad', label: 'LOP' }
  if (action === 'ISSUE_NOAD') return { text: 'text-warning', chip: 'status-warn', label: 'NOAD' }
  return { text: 'text-success', chip: 'status-ok', label: 'Conforme' }
}

function GradeBlock({ g, onResult }: { g: RobGrade; onResult: (grade: string, r: GradeResult) => void }) {
  const calc = useComputedRows(g.tanks)
  const tot = sectionTotals(g.tanks, calc)
  const surveyMt = tot.mt

  const [cmp, setCmp] = useState<ComparisonResult | null>(null)
  useEffect(() => {
    let cancelled = false
    compareSources({
      sources: [
        { name: 'Survey', quantity: surveyMt },
        { name: 'ER Log', quantity: g.logbookMt },
      ],
      layers: toleranceLayers,
      scope: 'LIVE',
    })
      .then((r) => !cancelled && setCmp(r))
      .catch(() => !cancelled && setCmp(null))
    return () => {
      cancelled = true
    }
  }, [surveyMt, g.logbookMt])

  const action = cmp?.recommendedAction ?? 'NONE'
  const pair = cmp?.pairs?.[0]
  const v = verdictStyle(action)

  useEffect(() => {
    onResult(g.grade, { surveyMt, action, delta: pair?.delta, deltaPct: pair?.deltaPct })
  }, [g.grade, surveyMt, action, pair?.delta, pair?.deltaPct, onResult])

  return (
    <section className="print:break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide">{g.label}</h3>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${v.chip}`}>{v.label}</span>
      </div>
      <table className="table-dense mt-2 w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Tanque</th>
            <th className={`${th} text-right`}>Dens@15</th>
            <th className={`${th} text-right`}>Temp °C</th>
            <th className={`${th} text-right`}>TOV m³</th>
            <th className={`${th} text-right`}>GOV m³</th>
            <th className={`${th} text-right`}>VCF</th>
            <th className={`${th} text-right`}>GSV@15 m³</th>
            <th className={`${th} text-right`}>WCF 56</th>
            <th className={`${th} text-right`}>MT (aire)</th>
          </tr>
        </thead>
        <tbody>
          {g.tanks.map((t, i) => {
            const c = calc[i]
            return (
              <tr key={t.tanque + i}>
                <td className={tdL}>{t.tanque}</td>
                <td className={td}>{f4(t.densidad15)}</td>
                <td className={td}>{t.temp.toFixed(1)}</td>
                <td className={td}>{f3(t.tov)}</td>
                <td className={td}>{f3(c ? c.gov : t.gov)}</td>
                <td className={td}>{f4(c ? c.vcf : t.vcf)}</td>
                <td className={td}>{f3(c ? c.gsv : t.gsv)}</td>
                <td className={td}>{f4(c ? c.wcf56 : t.wcf56)}</td>
                <td className={`${td} font-semibold`}>{f3(c ? c.mt : t.mt)}</td>
              </tr>
            )
          })}
          <tr className="bg-muted font-semibold">
            <td className={tdL} colSpan={3}>
              Survey ROB
            </td>
            <td className={td}>{f3(tot.tov)}</td>
            <td className={td}>{f3(tot.gov)}</td>
            <td className={td}>{f4(tot.vcf)}</td>
            <td className={td}>{f3(tot.gsv)}</td>
            <td className={td}>{f4(tot.wcf)}</td>
            <td className={td}>{f3(surveyMt)}</td>
          </tr>
        </tbody>
      </table>

      {/* Survey vs ER Log */}
      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span>
          <span className="text-muted-foreground">Survey: </span>
          <span className="font-mono font-semibold tabular-nums">{f3(surveyMt)} MT</span>
        </span>
        <span>
          <span className="text-muted-foreground">ER Log: </span>
          <span className="font-mono tabular-nums">{f3(g.logbookMt)} MT</span>
        </span>
        <span className={v.text}>
          <span className="text-muted-foreground">Δ: </span>
          <span className="font-mono font-semibold tabular-nums">
            {pair ? `${Number(pair.delta) > 0 ? '+' : ''}${pair.delta} MT (${Number(pair.deltaPct) > 0 ? '+' : ''}${pair.deltaPct}%)` : '—'}
          </span>
        </span>
        <span className={`flex items-center gap-1 font-medium ${v.text}`}>
          {action === 'NONE' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {action === 'NONE'
            ? 'Dentro de tolerancia'
            : action === 'ISSUE_LOP'
              ? 'Discrepancia > tolerancia — emitir LOP'
              : 'Discrepancia aparente — NOAD'}
        </span>
      </div>
    </section>
  )
}

export function RobReport() {
  const { id } = useParams<{ id: string }>()
  const job = getJob(id || '1')
  const h = robData.header

  const [results, setResults] = useState<Record<string, GradeResult>>({})
  const onResult = useCallback((grade: string, r: GradeResult) => {
    setResults((s) => (s[grade]?.surveyMt === r.surveyMt && s[grade]?.action === r.action ? s : { ...s, [grade]: r }))
  }, [])

  const grandSurvey = robData.grades.reduce((a, g) => a + (results[g.grade]?.surveyMt ?? 0), 0)
  const grandLog = robData.grades.reduce((a, g) => a + g.logbookMt, 0)
  const grandDeltaPct = grandLog > 0 ? ((grandSurvey - grandLog) / grandLog) * 100 : 0
  const worstAction = robData.grades.some((g) => results[g.grade]?.action === 'ISSUE_LOP')
    ? 'ISSUE_LOP'
    : robData.grades.some((g) => results[g.grade]?.action === 'ISSUE_NOAD')
      ? 'ISSUE_NOAD'
      : 'NONE'

  const [kver, setKver] = useState('')
  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])

  function exportJson() {
    const payload = {
      report_type: 'ROB_INVENTORY',
      demo_data: true,
      generated_at: new Date().toISOString(),
      kernel_version: kver || null,
      header: h,
      tolerance_layers: toleranceLayers,
      grades: robData.grades.map((g) => ({
        grade: g.grade,
        logbook_mt: g.logbookMt,
        survey_mt: results[g.grade]?.surveyMt ?? null,
        delta_mt: results[g.grade]?.delta ?? null,
        delta_pct: results[g.grade]?.deltaPct ?? null,
        verdict: results[g.grade]?.action ?? null,
        tanks: g.tanks.map((t) => ({ tank: t.tanque, density15: t.densidad15, temp_c: t.temp, tov_m3: t.tov })),
      })),
      totals: { survey_mt: grandSurvey, logbook_mt: grandLog, delta_pct: grandDeltaPct },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${h.referencia.replace(/\s+/g, '_')}_tecnico.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportXlsx() {
    const lbl = (a?: ComparisonResult['recommendedAction']) => (a ? verdictStyle(a).label : '')
    const summary: (string | number | null)[][] = [
      ['Grado', 'Survey ROB (MT)', 'ER Log (MT)', 'Δ (MT)', 'Δ%', 'Veredicto'],
      ...robData.grades.map((g) => {
        const r = results[g.grade]
        return [g.label, r?.surveyMt ?? '', g.logbookMt, r?.delta ?? '', r?.deltaPct ? `${r.deltaPct}%` : '', lbl(r?.action)]
      }),
      [],
      ['TOTAL', grandSurvey, grandLog, '', `${grandDeltaPct.toFixed(3)}%`, lbl(worstAction as ComparisonResult['recommendedAction'])],
    ]
    const sheets: SheetSpec[] = [
      {
        name: 'Meta',
        rows: [
          ['SuperSurvey', 'Remaining On Board (ROB) Survey'],
          ['Referencia', h.referencia], ['Buque', h.buque], ['Surveyor', h.surveyor], ['Puerto', h.puerto],
          ['Tipo de survey', h.surveyType], ['Fecha', h.fecha], ['Kernel', kver || ''], ['Datos', 'demostración (ficticios)'],
        ],
      },
      { name: 'Resumen ROB', rows: summary },
      ...robData.grades.map((g) => ({
        name: `Tanques ${g.grade}`,
        rows: [['Tanque', 'Dens@15', 'Temp °C', 'TOV m³'], ...g.tanks.map((t) => [t.tanque, t.densidad15, t.temp, t.tov] as (string | number | null)[])],
      })),
    ]
    await downloadWorkbook(`${h.referencia.replace(/\s+/g, '_')}_ROB.xlsx`, sheets)
  }

  const gv = verdictStyle(worstAction as ComparisonResult['recommendedAction'])

  return (
    <div className="flex h-full flex-col print:block print:h-auto">
      <TopBar title="Reporte ROB" activeJob={job} />

      <main className="flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
        <div className="mx-auto max-w-4xl space-y-4 print:max-w-none print:space-y-0">
          {/* Acciones (no se imprimen) */}
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <h2 className="text-lg font-semibold">Reporte ROB — vista de impresión</h2>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <FileText className="h-4 w-4" /> PDF / Imprimir
              </Button>
              <Button variant="outline" className="gap-2" onClick={exportJson}>
                <Braces className="h-4 w-4" /> JSON técnico
              </Button>
              <Button variant="outline" className="gap-2" onClick={exportXlsx}>
                <FileSpreadsheet className="h-4 w-4" /> XLSX
              </Button>
            </div>
          </div>

          {/* Documento */}
          <article className="overflow-hidden rounded-xl border bg-card shadow-sm print:rounded-none print:border-0 print:shadow-none">
            <div className="flex items-center justify-between border-b bg-muted px-8 py-5 print:bg-transparent">
              <div className="flex items-center gap-3">
                <div className="bg-brand-gradient flex h-10 w-10 items-center justify-center rounded-md">
                  <Ship className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold">SuperSurvey</div>
                  <div className="text-xs text-muted-foreground">Empresa Demo · marca configurable</div>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div className="font-mono font-semibold">{h.referencia}</div>
                <div>{h.fecha}</div>
              </div>
            </div>

            <div className="space-y-6 px-8 py-6">
              <header className="text-center">
                <h1 className="text-xl font-bold uppercase tracking-wide">Remaining On Board (ROB) Survey</h1>
                <div className="text-sm text-muted-foreground">Bunker inventory vs Engine Room Log</div>
              </header>

              <div className="grid gap-x-10 gap-y-1 text-sm sm:grid-cols-2 print:grid-cols-2">
                <Meta k="Buque" v={h.buque} />
                <Meta k="Surveyor" v={h.surveyor} />
                <Meta k="Puerto" v={h.puerto} />
                <Meta k="Tipo de survey" v={h.surveyType} />
                <Meta k="Fecha" v={h.fecha} />
                <Meta k="Estado del mar" v={h.seaCondition} />
              </div>

              {/* Resumen ROB total */}
              <div className="grid grid-cols-3 gap-4 rounded-lg border bg-muted/40 p-4 text-center print:bg-transparent">
                <Summary k="Survey ROB total" v={`${f3(grandSurvey)} MT`} />
                <Summary k="ER Log total" v={`${f3(grandLog)} MT`} />
                <Summary k="Δ total" v={`${grandDeltaPct > 0 ? '+' : ''}${grandDeltaPct.toFixed(3)} %`} cls={gv.text} />
              </div>

              {robData.grades.map((g) => (
                <GradeBlock key={g.grade} g={g} onResult={onResult} />
              ))}

              <section className="flex items-start gap-2 text-sm print:break-inside-avoid">
                {worstAction === 'NONE' ? (
                  <>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>
                      Todos los grados dentro de las capas de tolerancia (
                      {toleranceLayers.map((l) => `${l.name} ±${l.limitPct}%`).join(' · ')}). ROB del survey aceptado como base.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${gv.text}`} />
                    <span>
                      Al menos un grado excede la tolerancia: se {worstAction === 'ISSUE_LOP' ? 'emite Letter of Protest (LOP)' : 'notifica discrepancia aparente (NOAD)'}.
                      Las cifras del surveyor son las oficiales para el acuerdo de charter.
                    </span>
                  </>
                )}
              </section>

              {/* Firmas */}
              <section className="grid grid-cols-2 gap-6 pt-4 text-sm print:break-inside-avoid">
                <Signature label="Surveyor" />
                <Signature label="Chief Engineer" />
              </section>

              <footer className="border-t pt-3 text-center text-[10px] text-muted-foreground">
                Calculado por SuperSurvey · kernel ASTM D1250-80 {kver ? `v${kver}` : ''} · comparación ROB vs ER Log
                (tolerancia industria ±0.5%) · documento de demostración con datos ficticios
              </footer>
            </div>
          </article>
        </div>
      </main>
    </div>
  )
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-40 shrink-0 text-muted-foreground">{k}:</span>
      <span className="font-medium">{v}</span>
    </div>
  )
}

function Summary({ k, v, cls }: { k: string; v: string; cls?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className={`mt-0.5 font-mono text-lg font-bold tabular-nums ${cls ?? ''}`}>{v}</div>
    </div>
  )
}

function Signature({ label }: { label: string }) {
  return (
    <div>
      <div className="h-12 border-b" />
      <div className="mt-1 text-center text-muted-foreground">{label}</div>
    </div>
  )
}

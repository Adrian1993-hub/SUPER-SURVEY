import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { VefPanel } from '../components/VefPanel'
import { SamplingPanel } from '../components/SamplingPanel'
import { ReportBrandBar, ReportTitle, ReportSignature } from '../components/ReportHeader'
import { operationTemplates, type OperationTemplate, type TemplateGrade, type TemplateTank } from '../data/reportTemplates'
import { toleranceLayers, type VmrTank } from '../data/vmr'
import { compareSources, swDeduction, proRata, custodyFigure, kernelVersion, type ComparisonResult, type ImperialRowInput, type SwResult, type ProRataResult, type CustodyFigureResult, type UnitSet } from '../lib/kernel'
import { useComputedRows, useImperialRows, type CalcFields, type ImperialCalcFields } from '../lib/useBqsRows'
import { downloadWorkbook, type SheetSpec } from '../lib/xlsx'
import { FileText, Braces, Layers, FileSpreadsheet } from 'lucide-react'

// Renderer ÚNICO de plantillas inteligentes: lee el descriptor de la operación
// (data/reportTemplates), arma las secciones declaradas y deja que el kernel WASM
// calcule todo (métrico 54B o imperial 6A/6B según unitSystem). Nada de matemática
// en TypeScript.

const f3 = (n: number) => (isFinite(n) ? n.toFixed(3) : '—')
const f4 = (n: number) => (isFinite(n) ? n.toFixed(4) : '—')
// Grid canónico: .table-dense (index.css) define borde/padding/tipografía;
// aquí solo quedan los modificadores por celda.
const th = 'th-caps'
const thL = 'cell-l th-caps'
const td = ''
const tdL = 'cell-l'

function verdict(action: ComparisonResult['recommendedAction']) {
  if (action === 'ISSUE_LOP') return { cls: 'text-danger', label: 'LOP' }
  if (action === 'ISSUE_NOAD') return { cls: 'text-warning', label: 'NOAD' }
  return { cls: 'text-success', label: 'Conforme' }
}

const toVmr = (t: TemplateTank): VmrTank => ({
  tanque: t.tank, nominado: true, grade: '', densidad15: t.densidad15 ?? 0, tablesRefHeight: 0, measRefHeight: 0,
  level: 0, usg: 'S', temp: t.temp, tov: t.tov, freeWaterLevel: 0, freeWaterVol: t.freeWater ?? 0,
  gov: 0, vcf: 0, gsv: 0, wcf56: 0, mt: 0,
})
const toImp = (t: TemplateTank): ImperialRowInput => ({
  api: t.api ?? 0, temperature: t.temp, temperatureUnit: 'CELSIUS', volume: t.tov, volumeUnit: 'CUBIC_METERS', freeWater: t.freeWater ?? 0, table: '6B',
})

// ---- Grade inventory blocks (metric / imperial), lift MT up --------------

function MetricGrade({ g, onMt }: { g: TemplateGrade; onMt: (grade: string, mt: number) => void }) {
  const calc = useComputedRows(g.tanks.map(toVmr))
  const mt = calc.reduce((a, c: CalcFields | null) => a + (c ? c.mt : 0), 0)
  useEffect(() => onMt(g.grade, mt), [g.grade, mt, onMt])
  return (
    <GradeTable
      label={g.label}
      head={['Tanque', 'Dens@15', 'Temp °C', 'TOV m³', 'GSV@15 m³', 'WCF56', 'MT (aire)']}
      rows={g.tanks.map((t, i) => {
        const c = calc[i]
        return [t.tank, f4(t.densidad15 ?? 0), t.temp.toFixed(1), f3(t.tov), c ? f3(c.gsv) : '—', c ? f4(c.wcf56) : '—', c ? f3(c.mt) : '—']
      })}
      totalMt={mt}
    />
  )
}

function ImperialGrade({ g, onMt }: { g: TemplateGrade; onMt: (grade: string, mt: number) => void }) {
  const closing = useImperialRows(g.tanks.map(toImp))
  const opening = useImperialRows((g.opening ?? []).map(toImp))
  const sum = (rows: (ImperialCalcFields | null)[]) => rows.reduce((a, c) => a + (c ? c.mtAir : 0), 0)
  const closeMt = sum(closing)
  const openMt = g.opening ? sum(opening) : 0
  const mt = closeMt - openMt // loaded = closing − opening (OBQ)
  useEffect(() => onMt(g.grade, mt), [g.grade, mt, onMt])
  return (
    <div className="space-y-2">
      <GradeTable
        label={g.opening ? `${g.label} — total a bordo` : g.label}
        head={['Tanque', 'API@60', 'Temp °C', 'TOV m³', 'GSV bbl', 'VCF 6B', 'MT (aire)']}
        rows={g.tanks.map((t, i) => {
          const c = closing[i]
          return [t.tank, (t.api ?? 0).toFixed(2), t.temp.toFixed(1), f3(t.tov), c ? c.gsvBbl.toFixed(2) : '—', c ? c.vcf.toFixed(5) : '—', c ? f3(c.mtAir) : '—']
        })}
        totalMt={closeMt}
        totalLabel={g.opening ? 'Total a bordo' : undefined}
      />
      {g.opening && (
        <>
          <GradeTable
            label={`${g.label} — OBQ (antes)`}
            head={['Tanque', 'API@60', 'Temp °C', 'TOV m³', 'GSV bbl', 'VCF 6B', 'MT (aire)']}
            rows={g.opening.map((t, i) => {
              const c = opening[i]
              return [t.tank, (t.api ?? 0).toFixed(2), t.temp.toFixed(1), f3(t.tov), c ? c.gsvBbl.toFixed(2) : '—', c ? c.vcf.toFixed(5) : '—', c ? f3(c.mtAir) : '—']
            })}
            totalMt={openMt}
            totalLabel="OBQ"
          />
          <div className="rounded-md border bg-brand/10 px-3 py-1.5 text-sm">
            <span className="text-muted-foreground">Loaded = a bordo − OBQ: </span>
            <span className="font-mono font-bold tabular-nums text-brand">{f3(mt)} MT</span>
          </div>
        </>
      )}
    </div>
  )
}

function GradeTable({ label, head, rows, totalMt, totalLabel = 'Total' }: { label: string; head: string[]; rows: string[][]; totalMt: number; totalLabel?: string }) {
  return (
    <div className="print:break-inside-avoid">
      <h4 className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Layers className="h-3.5 w-3.5" /> {label}
      </h4>
      <table className="table-dense w-full border-collapse">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className={i === 0 ? thL : th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={j === 0 ? tdL : j === r.length - 1 ? `${td} bg-muted/50 font-semibold` : `${td} bg-muted/50`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-muted font-semibold">
            <td className={tdL} colSpan={head.length - 1}>
              {totalLabel}
            </td>
            <td className={td}>{f3(totalMt)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ---- Sections that consume the lifted per-grade MT -----------------------

function CustodySummary({ tpl, mtByGrade }: { tpl: OperationTemplate; mtByGrade: Record<string, number> }) {
  const [cmps, setCmps] = useState<Record<string, ComparisonResult | null>>({})
  useEffect(() => {
    let cancelled = false
    Promise.all(
      tpl.grades.map(async (g) => {
        const survey = mtByGrade[g.grade] ?? 0
        if (!g.referenceMt || !survey) return [g.grade, null] as const
        const r = await compareSources({
          sources: [
            { name: 'Survey', quantity: survey },
            { name: g.referenceLabel ?? 'Referencia', quantity: g.referenceMt },
          ],
          layers: toleranceLayers,
          scope: 'LIVE',
        }).catch(() => null)
        return [g.grade, r] as const
      }),
    ).then((entries) => {
      if (!cancelled) setCmps(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [tpl, mtByGrade])

  return (
    <Section title="Resumen de custodia (MT aire)">
      <table className="table-dense w-full border-collapse">
        <thead>
          <tr>
            <th className={thL}>Grado</th>
            <th className={th}>Survey</th>
            <th className={th}>Referencia</th>
            <th className={th}>Δ MT</th>
            <th className={th}>Δ%</th>
            <th className={thL}>Veredicto</th>
          </tr>
        </thead>
        <tbody>
          {tpl.grades.map((g) => {
            const survey = mtByGrade[g.grade] ?? 0
            const p = cmps[g.grade]?.pairs?.[0]
            const v = verdict(cmps[g.grade]?.recommendedAction ?? 'NONE')
            return (
              <tr key={g.grade}>
                <td className={tdL}>{g.grade}</td>
                <td className={`${td} font-semibold`}>{f3(survey)}</td>
                <td className={td}>{g.referenceMt != null ? f3(g.referenceMt) : '—'}</td>
                <td className={td}>{p?.delta ?? '—'}</td>
                <td className={td}>{p ? `${p.deltaPct}%` : '—'}</td>
                <td className={`${tdL} font-medium ${v.cls}`}>{g.referenceMt != null ? v.label : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Referencia: {tpl.grades[0]?.referenceLabel ?? '—'}. Veredicto por capas de tolerancia del kernel (ISO/inspección/contrato).
      </p>
    </Section>
  )
}

function SwSection({ grossMt, swPct }: { grossMt: number; swPct: number }) {
  const [res, setRes] = useState<SwResult | null>(null)
  useEffect(() => {
    let cancelled = false
    swDeduction(grossMt, swPct, 3)
      .then((r) => !cancelled && setRes(r))
      .catch(() => !cancelled && setRes(null))
    return () => {
      cancelled = true
    }
  }, [grossMt, swPct])
  return (
    <Section title={`Deducción S&W (${swPct}%) — crudo`}>
      <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
        <Fig k="Gross (MT)" v={res?.gross} />
        <Fig k="S&W (MT)" v={res?.sw} />
        <Fig k="Net (MT)" v={res?.net} highlight />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Net = Gross − round(Gross × S&W%). Calculado por el kernel (custody).</p>
    </Section>
  )
}

function ProRataSection({ total, spec }: { total: number; spec: NonNullable<OperationTemplate['proRata']> }) {
  const [res, setRes] = useState<ProRataResult | null>(null)
  useEffect(() => {
    let cancelled = false
    proRata(total, spec.parcels, 3)
      .then((r) => !cancelled && setRes(r))
      .catch(() => !cancelled && setRes(null))
    return () => {
      cancelled = true
    }
  }, [total, spec])
  return (
    <Section title={spec.label}>
      <table className="table-dense w-full border-collapse">
        <thead>
          <tr>
            <th className={thL}>Parcela</th>
            <th className={th}>Peso (B/L)</th>
            <th className={th}>Parte (MT)</th>
            <th className={th}>%</th>
          </tr>
        </thead>
        <tbody>
          {(res?.parcels ?? spec.parcels.map((p) => ({ label: p.label, weight: String(p.weight), share: '—', pct: '—' }))).map((p, i) => (
            <tr key={i}>
              <td className={tdL}>{p.label}</td>
              <td className={td}>{p.weight}</td>
              <td className={`${td} font-semibold`}>{p.share}</td>
              <td className={td}>{p.pct === '—' ? '—' : `${p.pct}%`}</td>
            </tr>
          ))}
          <tr className="bg-muted font-semibold">
            <td className={tdL} colSpan={2}>
              Total
            </td>
            <td className={td}>{res?.total ?? f3(total)}</td>
            <td className={td}></td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-muted-foreground">Reparto proporcional con reconciliación exacta de redondeo (kernel).</p>
    </Section>
  )
}

function Certificate({ tpl, mtByGrade }: { tpl: OperationTemplate; mtByGrade: Record<string, number> }) {
  const c = tpl.certificate!
  return (
    <Section title={c.kind === 'OFF_HIRE' ? 'Certificado de búnker (off-hire)' : 'Certificado de cantidad'} avoidBreak>
      <p className="text-sm leading-relaxed">
        {c.kind === 'OFF_HIRE' ? (
          <>
            Se certifica que el buque <strong>{tpl.header.buque}</strong> fue inspeccionado en {tpl.header.puerto} el{' '}
            {tpl.header.fecha}. Las cantidades de búnker a bordo al momento de la inspección, consignadas a{' '}
            <strong>{c.consignee}</strong>, son:
          </>
        ) : (
          <>
            Se certifica la cantidad de <strong>{c.subject.toLowerCase()}</strong> para <strong>{tpl.header.buque}</strong> en{' '}
            {tpl.header.puerto} ({tpl.header.fecha}), consignada a <strong>{c.consignee}</strong>:
          </>
        )}
      </p>
      <table className="table-dense mt-2 w-72 border-collapse">
        <tbody>
          {tpl.grades.map((g) => (
            <tr key={g.grade}>
              <td className={tdL}>{g.label}</td>
              <td className={`${td} font-semibold`}>{f3(mtByGrade[g.grade] ?? 0)}</td>
              <td className={tdL}>MT</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Este survey se realizó sin perjuicio de las partes. {tpl.header.metodo}.
      </p>
    </Section>
  )
}

// ---- Quantity table (multi-unit × TCV/GSV/NSV) --------------------------

const UNIT_COLS: [string, keyof UnitSet][] = [
  ['bbl @60', 'bbl60'],
  ['gal @60', 'gal60'],
  ['m³ @60', 'm3_60'],
  ['L @60', 'l_60'],
  ['m³ @15', 'm3_15'],
  ['L @15', 'l_15'],
  ['MT aire', 'mt_air'],
  ['MT vac', 'mt_vac'],
  ['LT aire', 'lt_air'],
]

function QuantityTable({ tpl }: { tpl: OperationTemplate }) {
  const figs = useMemo(() => tpl.summaryFigures ?? [], [tpl])
  const [res, setRes] = useState<Record<string, CustodyFigureResult>>({})
  useEffect(() => {
    let cancelled = false
    Promise.all(
      figs.map(async (f) => {
        const r = await custodyFigure({
          gsv: f.gsv,
          gsvUnit: f.gsvUnit,
          density15: f.density15,
          density15Unit: f.density15Unit,
          swPct: f.swPct,
        }).catch(() => null)
        return [f.grade, r] as const
      }),
    ).then((e) => {
      if (!cancelled) setRes(Object.fromEntries(e.filter((x): x is [string, CustodyFigureResult] => !!x[1])))
    })
    return () => {
      cancelled = true
    }
  }, [figs])

  return (
    <Section title="Resumen de cantidades (multi-unidad)">
      <div className="space-y-4">
        {figs.map((f) => {
          const r = res[f.grade]
          const levels: [string, UnitSet | undefined][] = [
            ['TCV', r?.tcv],
            ['GSV', r?.gsv],
            ['NSV', r?.nsv],
          ]
          return (
            <div key={f.grade} className="print:break-inside-avoid">
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{f.label}</h4>
              <div className="overflow-x-auto">
                <table className="table-dense w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={thL}></th>
                      {UNIT_COLS.map(([h]) => (
                        <th key={h} className={th}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map(([name, set]) => (
                      <tr key={name} className={name === 'GSV' ? 'bg-muted/40 font-semibold' : ''}>
                        <td className={tdL}>{name}</td>
                        {UNIT_COLS.map(([, key]) => (
                          <td key={key} className={td}>
                            {set ? set[key] : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Una sola cifra estándar expandida a todas las unidades por el kernel (masa invariante; el cruce 15 °C↔60 °F usa el VCF del
        producto). NSV = GSV − S&W; TCV = GSV + agua libre.
      </p>
    </Section>
  )
}

// ---- Master Summary (voyage rollup) -------------------------------------

interface Pair {
  delta?: string
  deltaPct?: string
}

function MasterSummary({ tpl }: { tpl: OperationTemplate }) {
  const v = tpl.voyage
  const cols = useMemo(() => {
    if (!v) return []
    const sum = (pick: (g: NonNullable<OperationTemplate['voyage']>['grades'][number]) => number | undefined) =>
      v.grades.reduce((a, g) => a + (pick(g) ?? 0), 0)
    const total = {
      grade: 'TOTAL',
      bl: sum((g) => g.bl),
      loaded: sum((g) => g.loaded),
      loadedVef: sum((g) => g.loadedVef),
      atDischarge: sum((g) => g.atDischarge),
      rob: sum((g) => g.rob),
    }
    return [...v.grades, total]
  }, [v])

  const [pairs, setPairs] = useState<Record<string, Pair>>({})
  useEffect(() => {
    if (!v) return
    let cancelled = false
    const cmp = async (a: number, b: number) => {
      const r = await compareSources({
        sources: [
          { name: 'A', quantity: a },
          { name: 'B', quantity: b },
        ],
        layers: toleranceLayers,
        scope: 'LIVE',
      }).catch(() => null)
      const p = r?.pairs?.[0]
      return { delta: p?.delta, deltaPct: p?.deltaPct } as Pair
    }
    Promise.all(
      cols.flatMap((g) => [
        cmp(g.loaded, g.bl).then((p) => [`${g.grade}:load`, p] as const),
        g.loadedVef != null ? cmp(g.loadedVef, g.bl).then((p) => [`${g.grade}:vef`, p] as const) : Promise.resolve([`${g.grade}:vef`, {} as Pair] as const),
        g.atDischarge != null ? cmp(g.atDischarge, g.loaded).then((p) => [`${g.grade}:transit`, p] as const) : Promise.resolve([`${g.grade}:transit`, {} as Pair] as const),
      ]),
    ).then((e) => {
      if (!cancelled) setPairs(Object.fromEntries(e))
    })
    return () => {
      cancelled = true
    }
  }, [v, cols])

  if (!v) return null
  const f3v = (n?: number) => (n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  const cell = (key: string, field: keyof Pair) => pairs[key]?.[field] ?? '—'

  return (
    <Section title={`Master Summary — reconciliación de viaje (${v.unit})`}>
      <div className="overflow-x-auto">
        <table className="table-dense w-full border-collapse">
          <thead>
            <tr>
              <th className={thL}>Concepto</th>
              {cols.map((g) => (
                <th key={g.grade} className={`${th} ${g.grade === 'TOTAL' ? 'bg-muted/40' : ''}`}>
                  {g.grade}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="Bill of Lading" cols={cols} val={(g) => f3v(g.bl)} />
            <Row label="Vessel loaded" cols={cols} val={(g) => f3v(g.loaded)} bold />
            <Row label="Δ vs B/L" cols={cols} val={(g) => cell(`${g.grade}:load`, 'delta')} muted />
            <Row label="% vs B/L" cols={cols} val={(g) => pct(cell(`${g.grade}:load`, 'deltaPct'))} muted />
            <Row label="Loaded w/ VEF" cols={cols} val={(g) => (g.loadedVef != null ? f3v(g.loadedVef) : '—')} />
            <Row label="Δ (VEF) vs B/L" cols={cols} val={(g) => cell(`${g.grade}:vef`, 'delta')} muted />
            <Row label="% (VEF) vs B/L" cols={cols} val={(g) => pct(cell(`${g.grade}:vef`, 'deltaPct'))} muted />
            <Row label="At discharge" cols={cols} val={(g) => (g.atDischarge != null ? f3v(g.atDischarge) : '—')} />
            <Row label="In-transit Δ" cols={cols} val={(g) => cell(`${g.grade}:transit`, 'delta')} muted />
            <Row label="In-transit %" cols={cols} val={(g) => pct(cell(`${g.grade}:transit`, 'deltaPct'))} muted />
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        B/L → cargado (±VEF) → en tránsito (carga vs descarga). Δ y % por el motor de comparación del kernel.
      </p>
    </Section>
  )
}

function pct(s: string) {
  return s === '—' ? '—' : `${s}%`
}
type VoyG = NonNullable<OperationTemplate['voyage']>['grades'][number] & { grade: string }
function Row({ label, cols, val, bold, muted }: { label: string; cols: VoyG[]; val: (g: VoyG) => string; bold?: boolean; muted?: boolean }) {
  return (
    <tr className={bold ? 'font-semibold' : ''}>
      <td className={`${tdL} ${muted ? 'text-muted-foreground' : ''}`}>{label}</td>
      {cols.map((g) => (
        <td key={g.grade} className={`${td} ${g.grade === 'TOTAL' ? 'bg-muted/40 font-semibold' : ''}`}>
          {val(g)}
        </td>
      ))}
    </tr>
  )
}

function Section({ title, children, avoidBreak }: { title: string; children: ReactNode; avoidBreak?: boolean }) {
  return (
    <section className={avoidBreak ? 'print:break-inside-avoid' : ''}>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">{title}</h3>
      {children}
    </section>
  )
}
function Fig({ k, v, highlight }: { k: string; v?: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className={`font-mono tabular-nums ${highlight ? 'text-lg font-bold text-brand' : 'font-semibold'}`}>{v ?? '—'}</div>
    </div>
  )
}

export function SmartReport() {
  const { op } = useParams<{ op: string }>()
  const tpl = op ? operationTemplates[op] : undefined
  const [mtByGrade, setMtByGrade] = useState<Record<string, number>>({})
  const onMt = useCallback((grade: string, mt: number) => {
    setMtByGrade((s) => (s[grade] === mt ? s : { ...s, [grade]: mt }))
  }, [])
  const grandMt = useMemo(() => Object.values(mtByGrade).reduce((a, b) => a + b, 0), [mtByGrade])

  const [kver, setKver] = useState('')
  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])

  if (!tpl) return <Navigate to="/" replace />

  async function exportXlsx() {
    const t = tpl!
    const sheets: SheetSpec[] = []
    // Hoja 1 — datos generales + cifras por grado
    const meta: (string | number | null)[][] = [
      ['SuperSurvey', t.title],
      ['Referencia', t.header.referencia],
      ['Buque', t.header.buque],
      ['Contraparte', t.header.contraparte],
      ['Puerto', t.header.puerto],
      ['Fecha', t.header.fecha],
      ['Método', t.header.metodo],
      [],
    ]
    if (t.grades.length) {
      meta.push(['Grado', 'Survey MT', 'Referencia MT'])
      for (const g of t.grades) meta.push([g.grade, mtByGrade[g.grade] ?? '', g.referenceMt ?? ''])
      meta.push(['TOTAL', grandMt])
    }
    sheets.push({ name: 'Resumen', rows: meta })

    // Hoja 2 — tabla multi-unidad (si aplica): TCV/GSV/NSV por grado
    if (t.summaryFigures?.length) {
      const rows: (string | number | null)[][] = [['Grado', 'Nivel', ...UNIT_COLS.map(([h]) => h)]]
      for (const f of t.summaryFigures) {
        const r = await custodyFigure({ gsv: f.gsv, gsvUnit: f.gsvUnit, density15: f.density15, density15Unit: f.density15Unit, swPct: f.swPct }).catch(() => null)
        const levels: [string, UnitSet | undefined][] = [
          ['TCV', r?.tcv],
          ['GSV', r?.gsv],
          ['NSV', r?.nsv],
        ]
        for (const [name, set] of levels) rows.push([f.label, name, ...UNIT_COLS.map(([, k]) => (set ? set[k] : ''))])
      }
      sheets.push({ name: 'Cantidades', rows })
    }

    // Hoja 3 — Master Summary (si aplica)
    if (t.voyage) {
      const g = t.voyage.grades
      const rows: (string | number | null)[][] = [
        [`Master Summary (${t.voyage.unit})`],
        ['Grado', ...g.map((x) => x.grade), 'TOTAL'],
        ['Bill of Lading', ...g.map((x) => x.bl), g.reduce((a, x) => a + x.bl, 0)],
        ['Vessel loaded', ...g.map((x) => x.loaded), g.reduce((a, x) => a + x.loaded, 0)],
        ['Loaded w/ VEF', ...g.map((x) => x.loadedVef ?? ''), g.reduce((a, x) => a + (x.loadedVef ?? 0), 0)],
        ['At discharge', ...g.map((x) => x.atDischarge ?? ''), g.reduce((a, x) => a + (x.atDischarge ?? 0), 0)],
        ['ROB', ...g.map((x) => x.rob ?? ''), g.reduce((a, x) => a + (x.rob ?? 0), 0)],
      ]
      sheets.push({ name: 'Master Summary', rows })
    }

    await downloadWorkbook(`${t.header.referencia.replace(/\s+/g, '_')}.xlsx`, sheets)
  }

  function exportJson() {
    const t = tpl!
    const payload = {
      report_type: t.id,
      demo_data: true,
      generated_at: new Date().toISOString(),
      kernel_version: kver || null,
      header: t.header,
      grades: t.grades.map((g) => ({ grade: g.grade, survey_mt: mtByGrade[g.grade] ?? null, reference_mt: g.referenceMt ?? null })),
      total_mt: grandMt,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${t.header.referencia.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col print:block print:h-auto">
      <TopBar title={tpl.title} />
      <main className="flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
        <div className="mx-auto max-w-4xl space-y-5 print:max-w-none print:space-y-4">
          {/* Acciones */}
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div>
              <h2 className="text-lg font-semibold">{tpl.title}</h2>
              <p className="text-sm text-muted-foreground">{tpl.subtitle} · plantilla inteligente</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {Object.values(operationTemplates).map((o) => (
                <Link
                  key={o.id}
                  to={`/trabajo/1/reporte/${o.id}`}
                  className={`rounded-full border px-2.5 py-1 text-xs ${o.id === tpl.id ? 'border-brand bg-brand/10 text-brand' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {o.id}
                </Link>
              ))}
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
              <Button variant="outline" className="gap-2" onClick={exportJson}>
                <Braces className="h-4 w-4" /> JSON
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => void exportXlsx()}>
                <FileSpreadsheet className="h-4 w-4" /> XLSX
              </Button>
            </div>
          </div>

          <article className="overflow-hidden rounded-xl border bg-card shadow-sm print:rounded-none print:border-0 print:shadow-none">
            <ReportBrandBar referencia={tpl.header.referencia} fecha={tpl.header.fecha} />

            <div className="space-y-6 px-8 py-6">
              <ReportTitle title={tpl.title} subtitle={tpl.subtitle} />

              {tpl.sections.map((kind) => {
                switch (kind) {
                  case 'meta':
                    return (
                      <div key="meta" className="grid gap-x-10 gap-y-1 text-sm sm:grid-cols-2 print:grid-cols-2">
                        <Meta k="Buque" v={tpl.header.buque} />
                        <Meta k="Surveyor" v={tpl.header.surveyor} />
                        <Meta k="Contraparte" v={tpl.header.contraparte} />
                        <Meta k="Cliente" v={tpl.header.cliente ?? '—'} />
                        <Meta k="Puerto" v={tpl.header.puerto} />
                        <Meta k="Método" v={tpl.header.metodo} />
                      </div>
                    )
                  case 'gradeInventory':
                    return (
                      <Section key="inv" title="Inventario por grado">
                        <div className="space-y-4">
                          {tpl.grades.map((g) =>
                            tpl.unitSystem === 'metric' ? (
                              <MetricGrade key={g.grade} g={g} onMt={onMt} />
                            ) : (
                              <ImperialGrade key={g.grade} g={g} onMt={onMt} />
                            ),
                          )}
                          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm print:bg-transparent">
                            <span className="text-muted-foreground">Total general: </span>
                            <span className="font-mono text-base font-bold tabular-nums">{f3(grandMt)} MT</span>
                          </div>
                        </div>
                      </Section>
                    )
                  case 'sampling':
                    return (
                      <div key="samp">
                        <SamplingPanel />
                      </div>
                    )
                  case 'quantityTable':
                    return <QuantityTable key="qty" tpl={tpl} />
                  case 'masterSummary':
                    return <MasterSummary key="master" tpl={tpl} />
                  case 'custodySummary':
                    return <CustodySummary key="cust" tpl={tpl} mtByGrade={mtByGrade} />
                  case 'swDeduction':
                    return <SwSection key="sw" grossMt={grandMt} swPct={tpl.swPct ?? 0} />
                  case 'proRata':
                    return tpl.proRata ? <ProRataSection key="pr" total={grandMt} spec={tpl.proRata} /> : null
                  case 'vef':
                    return (
                      <div key="vef">
                        <VefPanel />
                      </div>
                    )
                  case 'certificate':
                    return tpl.certificate ? <Certificate key="cert" tpl={tpl} mtByGrade={mtByGrade} /> : null
                  case 'signatures':
                    return (
                      <section key="sig" className="grid grid-cols-3 gap-6 pt-4 text-sm print:break-inside-avoid">
                        <ReportSignature label="Surveyor" />
                        <ReportSignature label="Master / Capitán" />
                        <ReportSignature label="Chief Engineer" />
                      </section>
                    )
                  case 'notes':
                    return (
                      <footer key="notes" className="border-t pt-3 text-center text-[10px] text-muted-foreground">
                        Calculado por SuperSurvey · kernel {kver ? `v${kver}` : ''} · {tpl.header.metodo} · documento de demostración con
                        datos ficticios
                      </footer>
                    )
                  default:
                    return null
                }
              })}
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
      <span className="w-32 shrink-0 text-muted-foreground">{k}:</span>
      <span className="font-medium">{v}</span>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { toleranceLayers } from '../data/vmr'
import { multigradeDemo, type ImpGrade, type ImpTank } from '../data/multigrade'
import { compareSources, kernelVersion, type ComparisonResult, type ImperialRowInput } from '../lib/kernel'
import { useImperialRows, type ImperialCalcFields } from '../lib/useBqsRows'
import { VefPanel } from '../components/VefPanel'
import { SamplingPanel } from '../components/SamplingPanel'
import { Cpu, Layers, Droplets, AlertTriangle, CheckCircle2, FileText, Braces } from 'lucide-react'
import { parseDec } from '../lib/num'
import { useT } from '../i18n/LanguageProvider'
import type { TKey } from '../i18n/dict'

type Translate = (key: TKey, vars?: Record<string, string | number>) => string

// BQS IMPERIAL MULTIGRADO completo (estilo inspectora internacional): por GRADO, apertura + cierre
// (Loaded = cierre − apertura) y AUDIT (Received vs BDN, veredicto del kernel;
// Nominado como referencia). Unidades US: API @60 °F, barriles, Tablas 6B/13.
// TODO cálculo por fila y todo veredicto sale del kernel WASM — nada en TS,
// que solo suma/resta totales para display (igual que la hoja).

const f2 = (n: number) => n.toFixed(2)
const f3 = (n: number) => n.toFixed(3)
const f5 = (n: number) => n.toFixed(5)

// Grid canónico: .table-dense (index.css); solo modificadores por celda.
const th = ''
const thL = 'cell-l'
const td = ''
const tdL = 'cell-l'
const tdGrey = 'cell-grey'

function NumCell({ value, onChange, step = 0.01 }: { value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <td className="border border-border p-0">
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseDec(e.target.value))}
        className="w-full bg-transparent px-1.5 py-1 text-right font-mono text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring"
      />
    </td>
  )
}

function toRows(tanks: ImpTank[]): ImperialRowInput[] {
  return tanks.map((t) => ({
    api: t.api,
    temperature: t.tempC,
    temperatureUnit: 'CELSIUS',
    volume: t.volumeM3,
    volumeUnit: 'CUBIC_METERS',
    freeWater: t.freeWaterM3 ?? 0,
    table: '6B',
  }))
}

interface SectionTotals {
  gsvBbl: number
  mtAir: number
  mtVac: number
}

function totalsOf(calc: (ImperialCalcFields | null)[]): SectionTotals {
  const sum = (pick: (c: ImperialCalcFields) => number) => calc.reduce((a, c) => a + (c ? pick(c) : 0), 0)
  return { gsvBbl: sum((c) => c.gsvBbl), mtAir: sum((c) => c.mtAir), mtVac: sum((c) => c.mtVacuum) }
}

function SectionTable({
  title,
  tanks,
  calc,
  onUpdate,
}: {
  title: string
  tanks: ImpTank[]
  calc: (ImperialCalcFields | null)[]
  onUpdate: (i: number, patch: Partial<ImpTank>) => void
}) {
  const t = useT()
  const tot = totalsOf(calc)
  return (
    <div>
      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <table className="table-dense w-full border-collapse">
        <thead>
          <tr>
            <th className={thL}>{t('report.col.tank')}</th>
            <th className={th}>API@60</th>
            <th className={th}>Temp °C</th>
            <th className={th}>TOV m³</th>
            <th className={th}>GOV bbl</th>
            <th className={th}>VCF 6B</th>
            <th className={th}>GSV bbl</th>
            <th className={th}>WCF 13</th>
            <th className={th}>{t('report.col.mtAir')}</th>
          </tr>
        </thead>
        <tbody>
          {tanks.map((tk, i) => {
            const c = calc[i]
            return (
              <tr key={tk.tank + i}>
                <td className={tdL}>{tk.tank}</td>
                <NumCell value={tk.api} onChange={(n) => onUpdate(i, { api: n })} />
                <NumCell value={tk.tempC} onChange={(n) => onUpdate(i, { tempC: n })} step={0.1} />
                <NumCell value={tk.volumeM3} onChange={(n) => onUpdate(i, { volumeM3: n })} step={0.001} />
                <td className={tdGrey}>{c ? f3(c.govBbl) : '—'}</td>
                <td className={tdGrey}>{c ? f5(c.vcf) : '—'}</td>
                <td className={tdGrey}>{c ? f2(c.gsvBbl) : '—'}</td>
                <td className={tdGrey}>{c ? f5(c.wcf13) : '—'}</td>
                <td className={`${tdGrey} font-semibold`}>{c ? f3(c.mtAir) : '—'}</td>
              </tr>
            )
          })}
          <tr className="bg-muted font-semibold">
            <td className={tdL} colSpan={6}>
              Total
            </td>
            <td className={td}>{f2(tot.gsvBbl)}</td>
            <td className={td}></td>
            <td className={td}>{f3(tot.mtAir)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

interface GradeAudit {
  loadedMt: number
  action: ComparisonResult['recommendedAction']
  deltaBdn?: string
  deltaBdnPct?: string
  deltaNom?: string
  deltaNomPct?: string
}

function verdict(action: ComparisonResult['recommendedAction'], t: Translate) {
  if (action === 'ISSUE_LOP') return { cls: 'text-danger', chip: 'status-bad', label: 'LOP' }
  if (action === 'ISSUE_NOAD') return { cls: 'text-warning', chip: 'status-warn', label: 'NOAD' }
  return { cls: 'text-success', chip: 'status-ok', label: t('report.verdict.compliant') }
}

function GradeSection({
  g,
  onUpdate,
  onAudit,
}: {
  g: ImpGrade
  onUpdate: (section: 'opening' | 'closing', i: number, patch: Partial<ImpTank>) => void
  onAudit: (grade: string, a: GradeAudit) => void
}) {
  const t = useT()
  const openCalc = useImperialRows(toRows(g.opening))
  const closeCalc = useImperialRows(toRows(g.closing))
  const openTot = totalsOf(openCalc)
  const closeTot = totalsOf(closeCalc)
  // Loaded = cierre − apertura (resta de totales, como la hoja real del cliente).
  const loaded = {
    gsvBbl: closeTot.gsvBbl - openTot.gsvBbl,
    mtAir: closeTot.mtAir - openTot.mtAir,
    mtVac: closeTot.mtVac - openTot.mtVac,
  }

  // Veredicto de custodia: Received vs BDN (motor del kernel, capas ISO).
  const [cmpBdn, setCmpBdn] = useState<ComparisonResult | null>(null)
  // Referencia comercial: Received vs Nominado (solo display, sin veredicto).
  const [cmpNom, setCmpNom] = useState<ComparisonResult | null>(null)
  useEffect(() => {
    let cancelled = false
    compareSources({
      sources: [
        { name: 'Vessel Received', quantity: loaded.mtAir },
        { name: 'BDN', quantity: g.bdnMt },
      ],
      layers: toleranceLayers,
      scope: 'LIVE',
    })
      .then((r) => !cancelled && setCmpBdn(r))
      .catch(() => !cancelled && setCmpBdn(null))
    compareSources({
      sources: [
        { name: 'Vessel Received', quantity: loaded.mtAir },
        { name: 'Nominated', quantity: g.nominatedMt },
      ],
      layers: toleranceLayers,
      scope: 'LIVE',
    })
      .then((r) => !cancelled && setCmpNom(r))
      .catch(() => !cancelled && setCmpNom(null))
    return () => {
      cancelled = true
    }
  }, [loaded.mtAir, g.bdnMt, g.nominatedMt])

  const action = cmpBdn?.recommendedAction ?? 'NONE'
  const pairBdn = cmpBdn?.pairs?.[0]
  const pairNom = cmpNom?.pairs?.[0]
  const v = verdict(action, t)

  useEffect(() => {
    onAudit(g.grade, {
      loadedMt: loaded.mtAir,
      action,
      deltaBdn: pairBdn?.delta,
      deltaBdnPct: pairBdn?.deltaPct,
      deltaNom: pairNom?.delta,
      deltaNomPct: pairNom?.deltaPct,
    })
  }, [g.grade, loaded.mtAir, action, pairBdn?.delta, pairBdn?.deltaPct, pairNom?.delta, pairNom?.deltaPct, onAudit])

  return (
    <Card className="print:break-inside-avoid print:rounded-none print:border-0 print:shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-brand" /> {g.label}
          </span>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${v.chip}`}>{v.label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto">
        <SectionTable title={t('multigrado.opening')} tanks={g.opening} calc={openCalc} onUpdate={(i, p) => onUpdate('opening', i, p)} />
        <SectionTable title={t('multigrado.closing')} tanks={g.closing} calc={closeCalc} onUpdate={(i, p) => onUpdate('closing', i, p)} />

        {/* Loaded + audit del grado */}
        <div className="rounded-lg border bg-muted/40 p-3 print:bg-transparent">
          <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Loaded — GSV bbl @60 °F</div>
              <div className="font-mono font-bold tabular-nums">{f2(loaded.gsvBbl)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('multigrado.loadedMtAir')}</div>
              <div className="font-mono text-lg font-bold tabular-nums text-brand">{f3(loaded.mtAir)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">BDN / BDR</div>
              <div className="font-mono tabular-nums">{f3(g.bdnMt)} MT</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('multigrado.nominated')}</div>
              <div className="font-mono tabular-nums">{f3(g.nominatedMt)} MT</div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className={v.cls}>
              <span className="text-muted-foreground">Δ vs BDN: </span>
              <span className="font-mono font-semibold tabular-nums">
                {pairBdn ? `${Number(pairBdn.delta) > 0 ? '+' : ''}${pairBdn.delta} MT (${Number(pairBdn.deltaPct) > 0 ? '+' : ''}${pairBdn.deltaPct}%)` : '—'}
              </span>
            </span>
            <span>
              <span className="text-muted-foreground">{t('multigrado.deltaVsNom')}</span>
              <span className="font-mono tabular-nums">
                {pairNom ? `${Number(pairNom.delta) > 0 ? '+' : ''}${pairNom.delta} MT (${Number(pairNom.deltaPct) > 0 ? '+' : ''}${pairNom.deltaPct}%)` : '—'}
              </span>
            </span>
            <span className={`flex items-center gap-1 font-medium ${v.cls}`}>
              {action === 'NONE' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {action === 'NONE' ? t('rob.grade.within') : action === 'ISSUE_LOP' ? t('multigrado.outTolLop') : t('rob.grade.noad')}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const clone = (d: typeof multigradeDemo) => ({
  ...d,
  grades: d.grades.map((g) => ({
    ...g,
    opening: g.opening.map((t) => ({ ...t })),
    closing: g.closing.map((t) => ({ ...t })),
  })),
})

export function MedicionMultigrado() {
  const t = useT()
  const [data, setData] = useState(() => clone(multigradeDemo))
  const h = data.header

  const updateTank = (gi: number) => (section: 'opening' | 'closing', i: number, patch: Partial<ImpTank>) =>
    setData((d) => ({
      ...d,
      grades: d.grades.map((g, idx) =>
        idx === gi ? { ...g, [section]: g[section].map((t, ti) => (ti === i ? { ...t, ...patch } : t)) } : g,
      ),
    }))

  const [audits, setAudits] = useState<Record<string, GradeAudit>>({})
  const onAudit = useCallback((grade: string, a: GradeAudit) => {
    setAudits((s) => {
      const prev = s[grade]
      if (prev && prev.loadedMt === a.loadedMt && prev.action === a.action && prev.deltaBdn === a.deltaBdn) return s
      return { ...s, [grade]: a }
    })
  }, [])

  const grandLoaded = data.grades.reduce((a, g) => a + (audits[g.grade]?.loadedMt ?? 0), 0)
  const grandBdn = data.grades.reduce((a, g) => a + g.bdnMt, 0)
  const worst = data.grades.some((g) => audits[g.grade]?.action === 'ISSUE_LOP')
    ? 'ISSUE_LOP'
    : data.grades.some((g) => audits[g.grade]?.action === 'ISSUE_NOAD')
      ? 'ISSUE_NOAD'
      : 'NONE'
  const gv = verdict(worst as ComparisonResult['recommendedAction'], t)

  const [kver, setKver] = useState('')
  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])

  function exportJson() {
    const payload = {
      report_type: 'BQS_IMPERIAL_MULTIGRADE',
      demo_data: true,
      generated_at: new Date().toISOString(),
      engine_version: kver || null,
      method: h.metodo,
      header: h,
      tolerance_layers: toleranceLayers,
      grades: data.grades.map((g) => ({
        grade: g.grade,
        nominated_mt: g.nominatedMt,
        bdn_mt: g.bdnMt,
        loaded_mt: audits[g.grade]?.loadedMt ?? null,
        delta_bdn_mt: audits[g.grade]?.deltaBdn ?? null,
        delta_bdn_pct: audits[g.grade]?.deltaBdnPct ?? null,
        verdict: audits[g.grade]?.action ?? null,
        opening: g.opening,
        closing: g.closing,
      })),
      totals: { loaded_mt: grandLoaded, bdn_mt: grandBdn },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${h.referencia.replace(/\s+/g, '_')}_tecnico.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col print:block print:h-auto">
      <TopBar title={t('multigrado.title')} />
      <main className="flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
        <div className="mx-auto max-w-[1400px] space-y-5 print:max-w-none">
          <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Layers className="h-5 w-5 text-brand" /> {t('multigrado.heading')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {h.buque} · {h.barcaza} · {h.puerto} · {h.fecha} · ref. {h.referencia} · {h.metodo}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <FileText className="h-4 w-4" /> {t('report.pdfPrint')}
              </Button>
              <Button variant="outline" className="gap-2" onClick={exportJson}>
                <Braces className="h-4 w-4" /> {t('rob.jsonTechnical')}
              </Button>
              <span className="inline-flex shrink-0 items-center gap-1.5 status-ok rounded-full border px-2.5 py-1 text-xs font-medium">
                <Cpu className="h-3.5 w-3.5" /> {t('multigrado.engineChip')}{kver ? ` · v${kver}` : ''}
              </span>
            </div>
          </div>

          {/* Audit resumen (estilo Bunker Audit) */}
          <Card className="print:rounded-none print:border-0 print:shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base uppercase tracking-wide">{t('multigrado.auditTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="table-dense w-full border-collapse">
                <thead>
                  <tr>
                    <th className={thL}>{t('report.col.grade')}</th>
                    <th className={th}>{t('multigrado.nominatedMt')}</th>
                    <th className={th}>BDN MT</th>
                    <th className={th}>Received MT</th>
                    <th className={th}>Δ vs BDN</th>
                    <th className={th}>Δ% vs BDN</th>
                    <th className={thL}>{t('report.col.verdict')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.grades.map((g) => {
                    const a = audits[g.grade]
                    const av = verdict(a?.action ?? 'NONE', t)
                    return (
                      <tr key={g.grade}>
                        <td className={tdL}>{g.grade}</td>
                        <td className={td}>{f3(g.nominatedMt)}</td>
                        <td className={td}>{f3(g.bdnMt)}</td>
                        <td className={`${td} font-semibold`}>{a ? f3(a.loadedMt) : '—'}</td>
                        <td className={td}>{a?.deltaBdn ?? '—'}</td>
                        <td className={td}>{a?.deltaBdnPct ? `${a.deltaBdnPct}%` : '—'}</td>
                        <td className={`${tdL} font-medium ${av.cls}`}>{av.label}</td>
                      </tr>
                    )
                  })}
                  <tr className="bg-muted font-semibold">
                    <td className={tdL}>TOTAL</td>
                    <td className={td}>{f3(data.grades.reduce((a, g) => a + g.nominatedMt, 0))}</td>
                    <td className={td}>{f3(grandBdn)}</td>
                    <td className={td}>{f3(grandLoaded)}</td>
                    <td className={td} colSpan={2}></td>
                    <td className={`${tdL} font-medium ${gv.cls}`}>{gv.label}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {data.grades.map((g, gi) => (
            <GradeSection key={g.grade} g={g} onUpdate={updateTank(gi)} onAudit={onAudit} />
          ))}

          <SamplingPanel />

          <VefPanel />

          <p className="text-xs text-muted-foreground print:hidden">
            {t('multigrado.notePre')}<span className="rounded bg-muted/50 px-1">{t('multigrado.noteGrey')}</span>{t('multigrado.notePost')}
          </p>
        </div>
      </main>
    </div>
  )
}

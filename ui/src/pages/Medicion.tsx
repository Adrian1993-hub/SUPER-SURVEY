import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { JobStepper } from '../components/Stepper'
import { NextStepBar } from '../components/NextStepBar'
import { getJob } from '../data/demoJobs'
import { vmrData, BARGE_FACTOR, BDN_FACTOR, TOLERANCIA_PCT, toleranceLayers, type VmrTank } from '../data/vmr'
import { commonGrades, densityOutOfRange } from '../data/grades'
import { compareSources, kernelVersion, type ComparisonResult } from '../lib/kernel'
import { isDesktop, saveMeasurement } from '../lib/ipc'
import { useJobMeasurement } from '../lib/jobStore'
import { sectionTotals, useComputedRows, useTransferred, type CalcFields, type TableVersion } from '../lib/useBqsRows'
import { ArrowUp, ArrowDown, Minus, Plus, Trash2, AlertTriangle, CheckCircle2, FileText, Cpu, Save, RotateCcw } from 'lucide-react'
import { parseDec, formatDec, formatDecNatural, useDecimalSep } from '../lib/num'
import { checkRange, FIELD_RANGES, type RangeField } from '../lib/ranges'
import { useT } from '../i18n/LanguageProvider'

const blankTank = (): VmrTank => ({
  tanque: 'NUEVO', nominado: false, grade: 'VLSFO', densidad15: 0, tablesRefHeight: 0, measRefHeight: 0,
  level: 0, usg: 'S', temp: 0, tov: 0, freeWaterLevel: 0, freeWaterVol: 0, gov: 0, vcf: 0, gsv: 0, wcf56: 0, mt: 0,
})

// celdas
// Grid canónico: .table-dense (index.css); solo modificadores por celda.
const thBase = ''
const tdDisp = ''
const tdGrey = 'cell-grey'

/** Título de aviso cuando un valor sale de su banda plausible: dice cuánto y en
 *  qué % excede (el «qué tan fuera de rango»). */
function rangeTitle(t: ReturnType<typeof useT>, field: RangeField, value: number): string | undefined {
  const v = checkRange(field, value)
  if (v.ok) return undefined
  const r = FIELD_RANGES[field]
  return t('medicion.rangeOor', {
    min: formatDecNatural(r.min) || '0',
    max: formatDecNatural(r.max),
    unit: r.unit,
    dir: v.bound === 'max' ? t('medicion.rangeAbove') : t('medicion.rangeBelow'),
    pct: v.pct.toFixed(1),
  })
}

/** Input decimal consciente del separador configurado: mantiene el texto crudo
 *  mientras se edita (permite teclear «0,» o «-»), lo formatea con el separador
 *  al perder el foco, y parsea con parseDec (coma o punto). Aviso de rango
 *  opcional (borde rojo + tooltip con el exceso). Nunca toca el kernel. */
function DecimalInput({
  value,
  onChange,
  range,
  className,
}: {
  value: number
  onChange: (n: number) => void
  range?: RangeField
  className: string
}) {
  useDecimalSep() // re-render al cambiar el separador
  const t = useT()
  const [draft, setDraft] = useState<string | null>(null)
  const bad = range ? !checkRange(range, value).ok : false
  return (
    <input
      inputMode="decimal"
      value={draft ?? formatDecNatural(value)}
      onFocus={() => setDraft(formatDecNatural(value))}
      onChange={(e) => {
        setDraft(e.target.value)
        onChange(parseDec(e.target.value))
      }}
      onBlur={() => setDraft(null)}
      aria-invalid={bad || undefined}
      title={range ? rangeTitle(t, range, value) : undefined}
      className={`${className} ${bad ? 'text-danger ring-1 ring-danger' : ''}`}
    />
  )
}

function NumCell({ value, onChange, range }: { value: number; onChange: (n: number) => void; step?: number; range?: RangeField }) {
  return (
    <td className="border border-border p-0">
      <DecimalInput
        value={value}
        onChange={onChange}
        range={range}
        className="w-full bg-transparent px-1.5 py-1 text-right font-mono text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring"
      />
    </td>
  )
}

function DeltaArrow({ prev, curr }: { prev?: number; curr: number }) {
  if (prev === undefined || Math.abs(curr - prev) < 1e-9)
    return <Minus className="h-3 w-3 shrink-0 text-muted-foreground" />
  return curr > prev ? (
    <ArrowUp className="h-3 w-3 shrink-0 text-success" />
  ) : (
    <ArrowDown className="h-3 w-3 shrink-0 text-danger" />
  )
}

interface SectionProps {
  title: string
  drafts: { draftFore: number; draftAft: number; trim: number; list: number; trimApplied: boolean }
  tanks: VmrTank[]
  prev?: VmrTank[] // para flechas (solo cierre)
  calc: (CalcFields | null)[]
  onUpdate: (i: number, patch: Partial<VmrTank>) => void
  onRemove: (i: number) => void
  onAdd: () => void
}

function Section({ title, drafts, tanks, prev, calc, onUpdate, onRemove, onAdd }: SectionProps) {
  const t = useT()
  useDecimalSep() // re-render de las celdas al cambiar el separador
  const tot = sectionTotals(tanks, calc)

  // "Impacto" de validación: celdas fuera de banda plausible (densidad, temp) y
  // el peor exceso — aviso, no bloqueo (el kernel sigue siendo la autoridad).
  const oor = tanks.flatMap((tk) => {
    const out: number[] = []
    const d = checkRange('density15', tk.densidad15)
    if (!d.ok) out.push(d.pct)
    const tm = checkRange('temp', tk.temp)
    if (!tm.ok) out.push(tm.pct)
    return out
  })
  const worstPct = oor.length ? Math.max(...oor) : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base uppercase tracking-wide">{title}</CardTitle>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span><span className="text-muted-foreground">{t('flowShared.draftFore')} </span><span className="font-mono">{formatDec(drafts.draftFore, 2)}</span></span>
            <span><span className="text-muted-foreground">{t('medicion.draftAft')} </span><span className="font-mono">{formatDec(drafts.draftAft, 2)}</span></span>
            <span><span className="text-muted-foreground">Trim </span><span className="font-mono">{formatDec(drafts.trim, 2)}</span></span>
            <span><span className="text-muted-foreground">List </span><span className="font-mono">{formatDec(drafts.list, 2)}</span></span>
            <span className="rounded bg-brand/15 px-2 py-0.5 font-medium text-brand">Trim {drafts.trimApplied ? t('flowShared.applied') : t('flowShared.notApplied')}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {oor.length > 0 && (
          <div className="status-warn mb-3 flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
            <span>{t('medicion.rangeSummary', { n: oor.length, pct: worstPct.toFixed(1) })}</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="table-dense w-full border-collapse">
            <thead>
              <tr>
                <th className={`${thBase} text-left`}>{t('flowShared.tank')}</th>
                <th className={thBase}>Nom</th>
                <th className={`${thBase} text-left`}>{t('flowShared.grade')}</th>
                <th className={`${thBase} text-right`}>Dens@15</th>
                <th className={`${thBase} text-right`}>Tbl Ref</th>
                <th className={`${thBase} text-right`}>Med Ref</th>
                <th className={`${thBase} text-right`}>Level</th>
                <th className={thBase}>U/S/G</th>
                <th className={`${thBase} text-right`}>Temp °C</th>
                <th className={`${thBase} text-right`}>TOV m³</th>
                <th className={`${thBase} text-right`}>FW Lvl</th>
                <th className={`${thBase} text-right`}>FW m³</th>
                <th className={`${thBase} text-right`}>GOV m³</th>
                <th className={`${thBase} text-right`}>VCF 54B</th>
                <th className={`${thBase} text-right`}>GSV@15</th>
                <th className={`${thBase} text-right`}>WCF 56</th>
                <th className={`${thBase} text-right`}>MT</th>
                <th className={thBase}></th>
              </tr>
            </thead>
            <tbody>
              {tanks.map((tk, i) => {
                const p = prev?.[i]
                const c = calc[i]
                const oor = densityOutOfRange(tk.grade, tk.densidad15)
                return (
                  <tr key={i}>
                    <td className="border border-border p-0">
                      <input value={tk.tanque} onChange={(e) => onUpdate(i, { tanque: e.target.value })} className="w-24 bg-transparent px-1.5 py-1 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring" />
                    </td>
                    <td className="border border-border text-center">
                      <input type="checkbox" checked={tk.nominado} onChange={(e) => onUpdate(i, { nominado: e.target.checked })} className="h-3.5 w-3.5" />
                    </td>
                    <td className="border border-border p-0">
                      <input
                        list="fuel-grades"
                        value={tk.grade}
                        onChange={(e) => onUpdate(i, { grade: e.target.value })}
                        title={oor ? t('medicion.densityOor', { d: tk.densidad15, g: tk.grade }) : undefined}
                        className={`w-16 bg-transparent px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring ${oor ? 'text-warning ring-1 ring-warning' : ''}`}
                      />
                    </td>
                    <NumCell value={tk.densidad15} onChange={(n) => onUpdate(i, { densidad15: n })} step={0.0001} range="density15" />
                    <NumCell value={tk.tablesRefHeight} onChange={(n) => onUpdate(i, { tablesRefHeight: n })} />
                    <NumCell value={tk.measRefHeight} onChange={(n) => onUpdate(i, { measRefHeight: n })} />
                    <NumCell value={tk.level} onChange={(n) => onUpdate(i, { level: n })} />
                    <td className="border border-border p-0 text-center">
                      <select value={tk.usg} onChange={(e) => onUpdate(i, { usg: e.target.value as VmrTank['usg'] })} className="w-full bg-transparent px-1 py-1 text-center text-[11px] focus:outline-none">
                        <option>S</option><option>U</option><option>G</option>
                      </select>
                    </td>
                    {/* Temp con flecha en cierre */}
                    <td className="border border-border p-0">
                      <div className="flex items-center justify-end gap-1 pr-1">
                        <DecimalInput value={tk.temp} onChange={(n) => onUpdate(i, { temp: n })} range="temp" className="w-12 bg-transparent py-1 text-right font-mono text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring" />
                        {prev && <DeltaArrow prev={p?.temp} curr={tk.temp} />}
                      </div>
                    </td>
                    {/* TOV (grey) con flecha en cierre */}
                    <td className={tdGrey}>
                      <div className="flex items-center justify-end gap-1">
                        {prev && <DeltaArrow prev={p?.tov} curr={tk.tov} />}
                        {formatDec(tk.tov, 3)}
                      </div>
                    </td>
                    <NumCell value={tk.freeWaterLevel} onChange={(n) => onUpdate(i, { freeWaterLevel: n })} />
                    <td className={tdGrey}>{formatDec(tk.freeWaterVol, 3)}</td>
                    <td className={tdGrey}>{formatDec(c ? c.gov : tk.gov, 3)}</td>
                    <td className={tdGrey}>{formatDec(c ? c.vcf : tk.vcf, 4)}</td>
                    <td className={tdGrey}>{formatDec(c ? c.gsv : tk.gsv, 3)}</td>
                    <td className={tdGrey}>{formatDec(c ? c.wcf56 : tk.wcf56, 4)}</td>
                    <td className={`${tdGrey} font-semibold`}>{formatDec(c ? c.mt : tk.mt, 3)}</td>
                    <td className="border border-border text-center">
                      <button onClick={() => onRemove(i)} title={t('medicion.removeTank')} className="text-muted-foreground hover:text-danger">
                        <Trash2 className="mx-auto h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {/* Totales */}
              <tr className="bg-muted font-semibold">
                <td className={`${thBase} text-left`}>{t('flowShared.totals')}</td>
                <td className={thBase}></td>
                <td className={thBase}></td>
                <td className={tdDisp}>{formatDec(tot.densidad, 4)}</td>
                <td className={thBase}></td>
                <td className={thBase}></td>
                <td className={thBase}></td>
                <td className={thBase}></td>
                <td className={tdDisp}>{formatDec(tot.temp, 1)}</td>
                <td className={tdDisp}>{formatDec(tot.tov, 3)}</td>
                <td className={thBase}></td>
                <td className={thBase}></td>
                <td className={tdDisp}>{formatDec(tot.gov, 3)}</td>
                <td className={tdDisp}>{formatDec(tot.vcf, 4)}</td>
                <td className={tdDisp}>{formatDec(tot.gsv, 3)}</td>
                <td className={tdDisp}>{formatDec(tot.wcf, 4)}</td>
                <td className={tdDisp}>{formatDec(tot.mt, 3)}</td>
                <td className={thBase}></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" /> {t('medicion.addTank')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function Medicion() {
  const { id } = useParams<{ id: string }>()
  const t = useT()
  useDecimalSep() // re-render de los indicadores al cambiar el separador
  const job = getJob(id || '1')
  const h = vmrData.header
  // Estado compartido por trabajo: editar aquí se refleja en el Reporte.
  const { before, after, setBefore, setAfter, reset } = useJobMeasurement()
  const [edition, setEdition] = useState<TableVersion>('D1250_80')
  const beforeCalc = useComputedRows(before, edition)
  const afterCalc = useComputedRows(after, edition)

  const [kver, setKver] = useState('')
  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])

  const updateBefore = (i: number, patch: Partial<VmrTank>) => setBefore((p) => p.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  const updateAfter = (i: number, patch: Partial<VmrTank>) => setAfter((p) => p.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  const addTank = () => { setBefore((p) => [...p, blankTank()]); setAfter((p) => [...p, blankTank()]) }
  const removeTank = (i: number) => { setBefore((p) => p.filter((_, idx) => idx !== i)); setAfter((p) => p.filter((_, idx) => idx !== i)) }

  const navigate = useNavigate()

  // Quantity Transferred EN VIVO: ΔGSV (after − before, totales del kernel) ×
  // densidad del suplidor, calculado por el kernel (una llamada a 15 °C).
  const deltaGsv = sectionTotals(after, afterCalc).gsv - sectionTotals(before, beforeCalc).gsv
  const transferred = useTransferred(deltaGsv, h.suppliersDensity, edition)
  // Forma única para la UI; seed demo como fallback hasta que el kernel responda.
  const tr = {
    suppliersDensity: h.suppliersDensity,
    gsv: transferred?.gsv ?? vmrData.transferred.gsv,
    mtVac: transferred?.mtVac ?? vmrData.transferred.mtVac,
    wcf56: transferred?.wcf ?? vmrData.transferred.wcf56,
    mtAir: transferred?.mtAir ?? vmrData.transferred.mtAir,
  }

  // Alerta de discrepancia (en MT aire) por el MISMO motor del kernel que la
  // pantalla Comparación: recibido (buque) vs barcaza vs BDN → None/NOAD/LOP.
  const [cmp, setCmp] = useState<ComparisonResult | null>(null)
  useEffect(() => {
    let cancelled = false
    compareSources({
      sources: [
        { name: 'Vessel Received', quantity: tr.mtAir },
        { name: 'Barge Delivered', quantity: tr.mtAir * BARGE_FACTOR },
        { name: 'BDN', quantity: tr.mtAir * BDN_FACTOR },
      ],
      layers: toleranceLayers,
      scope: 'LIVE',
    })
      .then((r) => !cancelled && setCmp(r))
      .catch(() => !cancelled && setCmp(null))
    return () => {
      cancelled = true
    }
  }, [tr.mtAir])
  const action = cmp?.recommendedAction ?? 'NONE'
  const excedidas = (cmp?.pairs ?? []).filter((p) => !p.withinAll)

  // Guardado (solo escritorio): persiste la sección "after receiving" (con un
  // calculation_log inmutable por tanque) Y la sección "opening/before" (solo
  // snapshots), de modo que reabrir el trabajo restaura AMBAS rejillas sin
  // pérdida. Las cifras oficiales salen solo del "after".
  const desktop = isDesktop()
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  async function onSave() {
    setSaving(true)
    setSaveMsg('')
    try {
      const rows = after.map((t) => ({
        density15: t.densidad15,
        temperature: t.temp,
        tov: t.tov,
        freeWater: t.freeWaterVol,
        table: (t.grade.trim().toUpperCase() === 'CRUDE' ? '54A' : '54B') as '54A' | '54B',
        tableVersion: edition,
      }))
      const res = await saveMeasurement({
        jobRef: h.referencia,
        moduleTitle: `${h.surveyType} — ${h.buque}`,
        portName: h.puerto,
        rows,
        tankSnapshots: after.map((t) => JSON.stringify(t)),
        beforeTankSnapshots: before.map((t) => JSON.stringify(t)),
      })
      setSaveMsg(
        t('medicion.saveOk', {
          saved: res.saved,
          skipped: res.skipped ? t('medicion.saveSkipped', { n: res.skipped }) : '',
          id: res.measurementSetId.slice(0, 8),
        }),
      )
    } catch (e) {
      setSaveMsg((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t('medicion.title')} activeJob={job} />
      <JobStepper />

      <main className="flex-1 overflow-auto p-6">
        {/* Sugerencias de grado (comunes); el campo sigue siendo texto libre */}
        <datalist id="fuel-grades">
          {commonGrades.map((g) => (
            <option key={g.code} value={g.code}>
              {g.name}
            </option>
          ))}
        </datalist>
        <div className="mx-auto max-w-[1600px] space-y-5">
          {/* Barra de acciones */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t('medicion.sheet')}</h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title={t('flowShared.tablesTitle')}>
                {t('flowShared.tables')}
                <select
                  value={edition}
                  onChange={(e) => setEdition(e.target.value as TableVersion)}
                  className="rounded-md border border-input bg-transparent px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="D1250_80">D1250-80 (VCF 4 dp)</option>
                  <option value="D1250_04">D1250-04 · API MPMS 11.1 (5 dp)</option>
                </select>
              </label>
              {saveMsg && <span className="text-sm text-muted-foreground">{saveMsg}</span>}
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm(t('medicion.discardConfirm'))) reset()
                }}
                title={t('medicion.resetTitle')}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" /> {t('medicion.reset')}
              </Button>
              <Button
                onClick={onSave}
                disabled={saving || !desktop}
                title={desktop ? t('medicion.saveTitleDesktop') : t('medicion.saveTitleWeb')}
                className="gap-2"
              >
                <Save className="h-4 w-4" /> {saving ? t('medicion.saving') : t('medicion.saveBtn')}
              </Button>
            </div>
          </div>
          {!desktop && (
            <p className="-mt-2 text-xs text-muted-foreground">
              {t('medicion.webNotePre')}<strong>{t('medicion.webNoteStrong')}</strong>{t('medicion.webNotePost')}
            </p>
          )}

          {/* Encabezado de la hoja */}
          <Card>
            <CardContent className="p-5">
              <div className="grid gap-x-8 gap-y-1.5 text-sm md:grid-cols-2">
                <Field label={t('flowShared.reference')} value={h.referencia} />
                <Field label={t('flowShared.surveyor')} value={h.surveyor} />
                <Field label={t('flowShared.vessel')} value={h.buque} />
                <Field label={t('medicion.surveyType')} value={h.surveyType} />
                <Field label={t('flowShared.barge')} value={h.barcaza} />
                <Field label={t('flowShared.date')} value={h.fecha} />
                <Field label={t('flowShared.port')} value={h.puerto} />
                <Field label={t('medicion.seaCondition')} value={h.seaCondition} />
              </div>
              <div className="mt-4 flex items-center gap-2 border-t pt-3 text-sm">
                <span className="text-muted-foreground">{t('medicion.supplierDensityAt15')}</span>
                <span className="rounded bg-brand/15 px-2 py-0.5 font-mono font-semibold text-brand">{formatDec(h.suppliersDensity, 4)} kg/L</span>
                <span className="text-xs text-muted-foreground">{t('medicion.useAfterReceiving')}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {t('medicion.cellsPre')}<span className="rounded bg-muted/50 px-1">{t('medicion.cellsGrey')}</span>{t('medicion.cellsMid')}<ArrowUp className="inline h-3 w-3 text-success" />/<ArrowDown className="inline h-3 w-3 text-danger" />{t('medicion.cellsPost')}
            </p>
            <span className="status-ok inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
              <Cpu className="h-3.5 w-3.5" /> {t('flowShared.engine')} · ASTM {edition === 'D1250_04' ? 'D1250-04' : 'D1250-80'}{kver ? ` · v${kver}` : ''}
            </span>
          </div>

          <Section title={t('flowShared.beforeReceiving')} drafts={vmrData.before} tanks={before} calc={beforeCalc} onUpdate={updateBefore} onRemove={removeTank} onAdd={addTank} />

          <Section title={t('flowShared.afterReceiving')} drafts={vmrData.after} tanks={after} prev={before} calc={afterCalc} onUpdate={updateAfter} onRemove={removeTank} onAdd={addTank} />

          {/* Quantity Transferred */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base uppercase tracking-wide">{t('flowShared.quantityTransferred')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Stat label={t('flowShared.supplierDensity')} value={formatDec(tr.suppliersDensity, 4)} unit="kg/L" />
                <Stat label={t('medicion.statGsv')} value={formatDec(tr.gsv, 3)} unit="m³" />
                <Stat label={t('medicion.statMtVac')} value={formatDec(tr.mtVac, 3)} unit="MT" />
                <Stat label={t('medicion.statWcf')} value={formatDec(tr.wcf56, 4)} unit="" />
                <Stat label={t('medicion.statMtAir')} value={formatDec(tr.mtAir, 3)} unit="MT" highlight />
              </div>

              {action !== 'NONE' ? (
                <div
                  className={`mt-5 rounded-lg border p-4 text-foreground ${
                    action === 'ISSUE_LOP' ? 'status-bad' : 'status-warn'
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 font-semibold ${
                      action === 'ISSUE_LOP' ? 'text-danger' : 'text-warning'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {action === 'ISSUE_LOP' ? t('medicion.discOverLop') : t('medicion.discApparentNoad')}
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {excedidas.map((p) => (
                      <li key={`${p.sourceA}-${p.sourceB}`}>
                        <span className="text-muted-foreground">
                          {p.sourceA} vs {p.sourceB}:{' '}
                        </span>
                        <span className="font-mono tabular-nums">
                          {Number(p.delta) > 0 ? '+' : ''}
                          {p.delta} MT ({Number(p.deltaPct) > 0 ? '+' : ''}
                          {p.deltaPct}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div
                    className={`mt-2 text-sm font-medium ${
                      action === 'ISSUE_LOP' ? 'text-danger' : 'text-warning'
                    }`}
                  >
                    {action === 'ISSUE_LOP' ? t('medicion.recIssueLop') : t('medicion.recNotifyNoad')}
                  </div>
                  <Button
                    onClick={() => navigate(`/trabajo/${id || '1'}/comparacion`)}
                    className={`mt-3 gap-2 hover:brightness-110 ${
                      action === 'ISSUE_LOP'
                        ? 'bg-danger text-danger-foreground'
                        : 'bg-warning text-warning-foreground'
                    }`}
                  >
                    <FileText className="h-4 w-4" /> {action === 'ISSUE_LOP' ? t('medicion.genLop') : t('medicion.viewComparison')}
                  </Button>
                </div>
              ) : (
                <div className="status-ok mt-5 flex items-center gap-2 rounded-lg border p-3 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" /> {t('medicion.allWithinTol', { pct: TOLERANCIA_PCT })}
                </div>
              )}
            </CardContent>
          </Card>

          <NextStepBar
            to={`/trabajo/${id || '1'}/calculo`}
            label={t('medicion.nextLabel')}
            hint={t('medicion.nextHint')}
          />
        </div>
      </main>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function Stat({ label, value, unit, highlight }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'bg-brand/10 border-brand/30' : ''}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold tabular-nums">
        {value} {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
      </div>
    </div>
  )
}

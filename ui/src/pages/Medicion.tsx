import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { getJob } from '../data/demoJobs'
import { vmrData, BARGE_FACTOR, BDN_FACTOR, TOLERANCIA_PCT, toleranceLayers, type VmrTank } from '../data/vmr'
import { commonGrades, densityOutOfRange } from '../data/grades'
import { compareSources, kernelVersion, type ComparisonResult } from '../lib/kernel'
import { isDesktop, saveMeasurement } from '../lib/ipc'
import { useJobMeasurement } from '../lib/jobStore'
import { sectionTotals, useComputedRows, useTransferred, type CalcFields, type TableVersion } from '../lib/useBqsRows'
import { ArrowUp, ArrowDown, Minus, Plus, Trash2, AlertTriangle, CheckCircle2, FileText, Cpu, Save, RotateCcw } from 'lucide-react'

const blankTank = (): VmrTank => ({
  tanque: 'NUEVO', nominado: false, grade: 'VLSFO', densidad15: 0, tablesRefHeight: 0, measRefHeight: 0,
  level: 0, usg: 'S', temp: 0, tov: 0, freeWaterLevel: 0, freeWaterVol: 0, gov: 0, vcf: 0, gsv: 0, wcf56: 0, mt: 0,
})

// celdas
// Grid canónico: .table-dense (index.css); solo modificadores por celda.
const thBase = ''
const tdDisp = ''
const tdGrey = 'cell-grey'

function NumCell({ value, onChange, step = 0.001 }: { value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <td className="border border-border p-0">
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
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
  const tot = sectionTotals(tanks, calc)
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base uppercase tracking-wide">{title}</CardTitle>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span><span className="text-muted-foreground">Calado proa </span><span className="font-mono">{drafts.draftFore.toFixed(2)}</span></span>
            <span><span className="text-muted-foreground">Calado popa </span><span className="font-mono">{drafts.draftAft.toFixed(2)}</span></span>
            <span><span className="text-muted-foreground">Trim </span><span className="font-mono">{drafts.trim.toFixed(2)}</span></span>
            <span><span className="text-muted-foreground">List </span><span className="font-mono">{drafts.list.toFixed(2)}</span></span>
            <span className="rounded bg-brand/15 px-2 py-0.5 font-medium text-brand">Trim {drafts.trimApplied ? 'aplicado' : 'no aplicado'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="table-dense w-full border-collapse">
            <thead>
              <tr>
                <th className={`${thBase} text-left`}>Tanque</th>
                <th className={thBase}>Nom</th>
                <th className={`${thBase} text-left`}>Grado</th>
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
              {tanks.map((t, i) => {
                const p = prev?.[i]
                const c = calc[i]
                const oor = densityOutOfRange(t.grade, t.densidad15)
                return (
                  <tr key={i}>
                    <td className="border border-border p-0">
                      <input value={t.tanque} onChange={(e) => onUpdate(i, { tanque: e.target.value })} className="w-24 bg-transparent px-1.5 py-1 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring" />
                    </td>
                    <td className="border border-border text-center">
                      <input type="checkbox" checked={t.nominado} onChange={(e) => onUpdate(i, { nominado: e.target.checked })} className="h-3.5 w-3.5" />
                    </td>
                    <td className="border border-border p-0">
                      <input
                        list="fuel-grades"
                        value={t.grade}
                        onChange={(e) => onUpdate(i, { grade: e.target.value })}
                        title={oor ? `Densidad ${t.densidad15} kg/L fuera del rango típico de ${t.grade}` : undefined}
                        className={`w-16 bg-transparent px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring ${oor ? 'text-warning ring-1 ring-warning' : ''}`}
                      />
                    </td>
                    <NumCell value={t.densidad15} onChange={(n) => onUpdate(i, { densidad15: n })} step={0.0001} />
                    <NumCell value={t.tablesRefHeight} onChange={(n) => onUpdate(i, { tablesRefHeight: n })} />
                    <NumCell value={t.measRefHeight} onChange={(n) => onUpdate(i, { measRefHeight: n })} />
                    <NumCell value={t.level} onChange={(n) => onUpdate(i, { level: n })} />
                    <td className="border border-border p-0 text-center">
                      <select value={t.usg} onChange={(e) => onUpdate(i, { usg: e.target.value as VmrTank['usg'] })} className="w-full bg-transparent px-1 py-1 text-center text-[11px] focus:outline-none">
                        <option>S</option><option>U</option><option>G</option>
                      </select>
                    </td>
                    {/* Temp con flecha en cierre */}
                    <td className="border border-border p-0">
                      <div className="flex items-center justify-end gap-1 pr-1">
                        <input type="number" step={0.1} value={t.temp} onChange={(e) => onUpdate(i, { temp: parseFloat(e.target.value) || 0 })} className="w-12 bg-transparent py-1 text-right font-mono text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring" />
                        {prev && <DeltaArrow prev={p?.temp} curr={t.temp} />}
                      </div>
                    </td>
                    {/* TOV (grey) con flecha en cierre */}
                    <td className={tdGrey}>
                      <div className="flex items-center justify-end gap-1">
                        {prev && <DeltaArrow prev={p?.tov} curr={t.tov} />}
                        {t.tov.toFixed(3)}
                      </div>
                    </td>
                    <NumCell value={t.freeWaterLevel} onChange={(n) => onUpdate(i, { freeWaterLevel: n })} />
                    <td className={tdGrey}>{t.freeWaterVol.toFixed(3)}</td>
                    <td className={tdGrey}>{(c ? c.gov : t.gov).toFixed(3)}</td>
                    <td className={tdGrey}>{(c ? c.vcf : t.vcf).toFixed(4)}</td>
                    <td className={tdGrey}>{(c ? c.gsv : t.gsv).toFixed(3)}</td>
                    <td className={tdGrey}>{(c ? c.wcf56 : t.wcf56).toFixed(4)}</td>
                    <td className={`${tdGrey} font-semibold`}>{(c ? c.mt : t.mt).toFixed(3)}</td>
                    <td className="border border-border text-center">
                      <button onClick={() => onRemove(i)} title="Quitar tanque" className="text-muted-foreground hover:text-danger">
                        <Trash2 className="mx-auto h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {/* Totales */}
              <tr className="bg-muted font-semibold">
                <td className={`${thBase} text-left`}>Totales</td>
                <td className={thBase}></td>
                <td className={thBase}></td>
                <td className={tdDisp}>{tot.densidad.toFixed(4)}</td>
                <td className={thBase}></td>
                <td className={thBase}></td>
                <td className={thBase}></td>
                <td className={thBase}></td>
                <td className={tdDisp}>{tot.temp.toFixed(1)}</td>
                <td className={tdDisp}>{tot.tov.toFixed(3)}</td>
                <td className={thBase}></td>
                <td className={thBase}></td>
                <td className={tdDisp}>{tot.gov.toFixed(3)}</td>
                <td className={tdDisp}>{tot.vcf.toFixed(4)}</td>
                <td className={tdDisp}>{tot.gsv.toFixed(3)}</td>
                <td className={tdDisp}>{tot.wcf.toFixed(4)}</td>
                <td className={tdDisp}>{tot.mt.toFixed(3)}</td>
                <td className={thBase}></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" /> Agregar tanque
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function Medicion() {
  const { id } = useParams<{ id: string }>()
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

  // Guardado (solo escritorio): persiste la sección "after receiving" como un
  // measurement set + un calculation_log inmutable por tanque.
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
      })
      setSaveMsg(`Guardado: ${res.saved} filas${res.skipped ? ` (${res.skipped} omitidas)` : ''} · set ${res.measurementSetId.slice(0, 8)}…`)
    } catch (e) {
      setSaveMsg((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Medición" activeJob={job} />

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
            <h2 className="text-lg font-semibold">Hoja de medición</h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Edición de las tablas de medición de petróleo">
                Tablas
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
                  if (window.confirm('¿Descartar el borrador local de medición y re-sembrar desde el demo?')) reset()
                }}
                title="Descartar el borrador guardado en este navegador y re-sembrar desde el demo"
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" /> Restablecer
              </Button>
              <Button
                onClick={onSave}
                disabled={saving || !desktop}
                title={desktop ? 'Guardar en SQLite local (registro inmutable)' : 'La persistencia está disponible en la app de escritorio'}
                className="gap-2"
              >
                <Save className="h-4 w-4" /> {saving ? 'Guardando…' : 'Guardar medición'}
              </Button>
            </div>
          </div>
          {!desktop && (
            <p className="-mt-2 text-xs text-muted-foreground">
              El cálculo es en vivo aquí; el <strong>guardado</strong> (SQLite) está disponible en la app de escritorio.
            </p>
          )}

          {/* Encabezado de la hoja */}
          <Card>
            <CardContent className="p-5">
              <div className="grid gap-x-8 gap-y-1.5 text-sm md:grid-cols-2">
                <Field label="Referencia" value={h.referencia} />
                <Field label="Surveyor" value={h.surveyor} />
                <Field label="Buque" value={h.buque} />
                <Field label="Survey Type" value={h.surveyType} />
                <Field label="Barcaza" value={h.barcaza} />
                <Field label="Fecha" value={h.fecha} />
                <Field label="Puerto" value={h.puerto} />
                <Field label="Sea Condition" value={h.seaCondition} />
              </div>
              <div className="mt-4 flex items-center gap-2 border-t pt-3 text-sm">
                <span className="text-muted-foreground">Densidad del suplidor @ 15 °C:</span>
                <span className="rounded bg-brand/15 px-2 py-0.5 font-mono font-semibold text-brand">{h.suppliersDensity.toFixed(4)} kg/L</span>
                <span className="text-xs text-muted-foreground">(usar para cálculo después de recibir)</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Celdas <span className="rounded bg-muted/50 px-1">grises</span> = calculadas en vivo por el kernel. Celdas blancas = entrada del
              surveyor. En el cierre, las flechas <ArrowUp className="inline h-3 w-3 text-success" />/<ArrowDown className="inline h-3 w-3 text-danger" /> marcan
              cambios de volumen y temperatura vs. apertura (solo referencia del inspector, no salen en el reporte).
            </p>
            <span className="status-ok inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
              <Cpu className="h-3.5 w-3.5" /> Kernel ASTM {kver ? `v${kver}` : '…'} · {edition === 'D1250_04' ? 'D1250-04' : 'D1250-80'} · WASM
            </span>
          </div>

          <Section title="Before receiving" drafts={vmrData.before} tanks={before} calc={beforeCalc} onUpdate={updateBefore} onRemove={removeTank} onAdd={addTank} />

          <Section title="After receiving" drafts={vmrData.after} tanks={after} prev={before} calc={afterCalc} onUpdate={updateAfter} onRemove={removeTank} onAdd={addTank} />

          {/* Quantity Transferred */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base uppercase tracking-wide">Quantity transferred</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Stat label="Densidad suplidor" value={tr.suppliersDensity.toFixed(4)} unit="kg/L" />
                <Stat label="Gross Standard Vol @15°C" value={tr.gsv.toFixed(3)} unit="m³" />
                <Stat label="Peso (MT) en vacío" value={tr.mtVac.toFixed(3)} unit="MT" />
                <Stat label="WCF Tabla 56" value={tr.wcf56.toFixed(4)} unit="" />
                <Stat label="Peso (MT) en aire" value={tr.mtAir.toFixed(3)} unit="MT" highlight />
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
                    {action === 'ISSUE_LOP'
                      ? 'Discrepancia sobre tolerancia — LOP'
                      : 'Discrepancia aparente — NOAD'}
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
                    {action === 'ISSUE_LOP'
                      ? 'Se recomienda emitir una Letter of Protest (LOP).'
                      : 'Se recomienda notificar la discrepancia (NOAD).'}
                  </div>
                  <Button
                    onClick={() => navigate(`/trabajo/${id || '1'}/comparacion`)}
                    className={`mt-3 gap-2 hover:brightness-110 ${
                      action === 'ISSUE_LOP'
                        ? 'bg-danger text-danger-foreground'
                        : 'bg-warning text-warning-foreground'
                    }`}
                  >
                    <FileText className="h-4 w-4" /> {action === 'ISSUE_LOP' ? 'Generar LOP' : 'Ver comparación'}
                  </Button>
                </div>
              ) : (
                <div className="status-ok mt-5 flex items-center gap-2 rounded-lg border p-3 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" /> Todas las diferencias dentro de tolerancia (±{TOLERANCIA_PCT}% ISO) — no se requiere LOP.
                </div>
              )}
            </CardContent>
          </Card>
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

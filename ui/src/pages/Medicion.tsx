import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { getJob } from '../data/demoJobs'
import { vmrData, comparacionUnidades, BARGE_FACTOR, BDN_FACTOR, TOLERANCIA_PCT, type VmrTank } from '../data/vmr'
import { commonGrades, densityOutOfRange } from '../data/grades'
import { calcBqsRow, kernelVersion } from '../lib/kernel'
import { ArrowUp, ArrowDown, Minus, Plus, Trash2, AlertTriangle, CheckCircle2, FileText, Cpu } from 'lucide-react'

const clone = (arr: VmrTank[]) => arr.map((t) => ({ ...t }))
const blankTank = (): VmrTank => ({
  tanque: 'NUEVO', nominado: false, grade: 'VLSFO', densidad15: 0, tablesRefHeight: 0, measRefHeight: 0,
  level: 0, usg: 'S', temp: 0, tov: 0, freeWaterLevel: 0, freeWaterVol: 0, gov: 0, vcf: 0, gsv: 0, wcf56: 0, mt: 0,
})
const numOf = (s?: string) => (s == null ? NaN : Number(s))

// Kernel-computed fields for one tank row (everything the surveyor does NOT type).
interface CalcFields {
  gov: number
  vcf: number
  gsv: number
  wcf56: number
  mt: number
  mtVac: number
}

// Recompute every row through the WASM calc kernel whenever a calc-relevant input
// changes. Same validated Rust math as the desktop — no formulas live in TS.
function useComputedRows(tanks: VmrTank[]): (CalcFields | null)[] {
  const [calc, setCalc] = useState<(CalcFields | null)[]>([])
  const key = JSON.stringify(tanks.map((t) => [t.densidad15, t.temp, t.tov, t.freeWaterVol]))
  useEffect(() => {
    let cancelled = false
    Promise.all(
      tanks.map((t) =>
        calcBqsRow({ density15: t.densidad15, temperature: t.temp, tov: t.tov, freeWater: t.freeWaterVol })
          .then((r): CalcFields | null =>
            r.success
              ? { gov: numOf(r.gov), vcf: numOf(r.vcf), gsv: numOf(r.gsv), wcf56: numOf(r.wcfAir), mt: numOf(r.mtAir), mtVac: numOf(r.mtVacuum) }
              : null,
          )
          .catch(() => null),
      ),
    ).then((res) => {
      if (!cancelled) setCalc(res)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return calc
}

// Section totals from live values (falling back to the row's seed value until the
// kernel answers). VCF/WCF totals are the defensible aggregates (ΣGSV/ΣGOV,
// ΣMT/ΣGSV); density & temp are GOV-weighted means (display only).
function sectionTotals(tanks: VmrTank[], calc: (CalcFields | null)[]) {
  let tov = 0, gov = 0, gsv = 0, mt = 0, dW = 0, tW = 0
  tanks.forEach((t, i) => {
    const c = calc[i]
    const rGov = c ? c.gov : t.gov
    tov += t.tov
    gov += rGov
    gsv += c ? c.gsv : t.gsv
    mt += c ? c.mt : t.mt
    dW += t.densidad15 * rGov
    tW += t.temp * rGov
  })
  return {
    tov,
    gov,
    gsv,
    mt,
    vcf: gov > 0 ? gsv / gov : 0,
    wcf: gsv > 0 ? mt / gsv : 0,
    densidad: gov > 0 ? dW / gov : 0,
    temp: gov > 0 ? tW / gov : 0,
  }
}

// celdas
const thBase = 'border border-border px-1.5 py-1 text-[10px] font-medium text-muted-foreground'
const tdDisp = 'border border-border px-1.5 py-1 text-right font-mono text-[11px] tabular-nums'
const tdGrey = `${tdDisp} bg-muted/50`

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
    <ArrowUp className="h-3 w-3 shrink-0 text-emerald-500" />
  ) : (
    <ArrowDown className="h-3 w-3 shrink-0 text-red-500" />
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
          <table className="w-full border-collapse">
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
                      <input type="checkbox" checked={t.nominado} onChange={(e) => onUpdate(i, { nominado: e.target.checked })} className="h-3.5 w-3.5 accent-slate-700" />
                    </td>
                    <td className="border border-border p-0">
                      <input
                        list="fuel-grades"
                        value={t.grade}
                        onChange={(e) => onUpdate(i, { grade: e.target.value })}
                        title={oor ? `Densidad ${t.densidad15} kg/L fuera del rango típico de ${t.grade}` : undefined}
                        className={`w-16 bg-transparent px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring ${oor ? 'text-amber-600 ring-1 ring-amber-400/60' : ''}`}
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
                      <button onClick={() => onRemove(i)} title="Quitar tanque" className="text-muted-foreground hover:text-red-500">
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
  const [before, setBefore] = useState<VmrTank[]>(clone(vmrData.before.tanques))
  const [after, setAfter] = useState<VmrTank[]>(clone(vmrData.after.tanques))
  const beforeCalc = useComputedRows(before)
  const afterCalc = useComputedRows(after)

  const [kver, setKver] = useState('')
  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])

  const updateBefore = (i: number, patch: Partial<VmrTank>) => setBefore((p) => p.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  const updateAfter = (i: number, patch: Partial<VmrTank>) => setAfter((p) => p.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  const addTank = () => { setBefore((p) => [...p, blankTank()]); setAfter((p) => [...p, blankTank()]) }
  const removeTank = (i: number) => { setBefore((p) => p.filter((_, idx) => idx !== i)); setAfter((p) => p.filter((_, idx) => idx !== i)) }

  const navigate = useNavigate()
  const tr = vmrData.transferred

  // Alerta de discrepancia (en MT aire) para el bloque Quantity Transferred
  const vRec = comparacionUnidades.find((x) => x.unidad === 'MT (aire)')!.vessel
  const pares = [
    { nombre: 'Vessel Received vs Barge Delivered', a: vRec, b: vRec * BARGE_FACTOR },
    { nombre: 'Vessel Received vs BDN', a: vRec, b: vRec * BDN_FACTOR },
    { nombre: 'Barge Delivered vs BDN', a: vRec * BARGE_FACTOR, b: vRec * BDN_FACTOR },
  ].map((p) => {
    const delta = p.a - p.b
    const pct = (delta / p.b) * 100
    return { ...p, delta, pct, dentro: Math.abs(pct) <= TOLERANCIA_PCT }
  })
  const excedidas = pares.filter((p) => !p.dentro)

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
              surveyor. En el cierre, las flechas <ArrowUp className="inline h-3 w-3 text-emerald-500" />/<ArrowDown className="inline h-3 w-3 text-red-500" /> marcan
              cambios de volumen y temperatura vs. apertura (solo referencia del inspector, no salen en el reporte).
            </p>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
              <Cpu className="h-3.5 w-3.5" /> Kernel ASTM {kver ? `v${kver}` : '…'} · WASM
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

              {excedidas.length > 0 ? (
                <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <div className="flex items-center gap-2 font-semibold text-red-600">
                    <AlertTriangle className="h-4 w-4" /> Discrepancia sobre tolerancia (±{TOLERANCIA_PCT}%)
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {excedidas.map((p) => (
                      <li key={p.nombre}>
                        <span className="text-muted-foreground">{p.nombre}: </span>
                        <span className="font-mono tabular-nums">
                          {p.delta > 0 ? '+' : ''}{p.delta.toFixed(3)} MT ({p.pct > 0 ? '+' : ''}{p.pct.toFixed(3)}%)
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 text-sm font-medium text-red-600">Se recomienda emitir una Letter of Protest (LOP).</div>
                  <Button
                    onClick={() => navigate(`/trabajo/${id || '1'}/comparacion`)}
                    className="mt-3 gap-2 bg-red-600 text-white hover:brightness-110"
                  >
                    <FileText className="h-4 w-4" /> Generar LOP
                  </Button>
                </div>
              ) : (
                <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Todas las diferencias dentro de tolerancia (±{TOLERANCIA_PCT}%) — no se requiere LOP.
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

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import {
  lpgCustody,
  costaldCtl,
  lpgVaporCorrection,
  kernelVersion,
  type LpgCustodyResult,
  type CostaldCtlResult,
  type LpgVaporResult,
  type LpgComponent,
  type PressureUnit,
} from '../lib/kernel'
import { Cpu, FileText, Droplets, Wind, Scale, Thermometer, PenLine } from 'lucide-react'
import { parseDec } from '../lib/num'
import { useT } from '../i18n/LanguageProvider'

// Certificate of Quantity (LPG / NGL gas carriers). Everything is computed by the
// Rust calc kernel (WASM): liquid custody assembly (lpg_custody) + COSTALD CTL
// (API 11.2.4, costald_ctl) + vapour-space correction (API 17.10.2,
// lpg_vapor_correction). Total = liquid mass + vapour mass. Defaults are anchored
// to real documents — liquid to the client propane certificate (vessel A)
// (588.203 MT vac), vapour to API MPMS 17.10.2 Table 6 (ρv = 9.146 kg/m³).

// Formulario denso canónico: .input-dense/.label-dense (index.css).
const lbl = 'text-[11px] text-muted-foreground'
const inp = 'input-dense'
const txt = 'input-dense text-left font-sans'
const sel = 'input-dense w-auto text-left font-sans'

function Field({ label, value, onChange, step = 0.001 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className={lbl}>{label}</span>
      <input type="number" step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(parseDec(e.target.value))} className={inp} />
    </label>
  )
}
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className={lbl}>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={txt} />
    </label>
  )
}

const COMPONENTS: LpgComponent[] = ['PROPANE', 'ISO_BUTANE', 'N_BUTANE', 'PROPYLENE', 'ETHANE', 'N_PENTANE', 'ISO_PENTANE', 'BUTADIENE_1_3', 'BUTENE_1']
const PRESSURE_UNITS: PressureUnit[] = ['BARA', 'BARG', 'PSIG', 'PSIA', 'KPA_ABS', 'KPA_G']
const compLabel = (c: string) => c.replace(/_/g, ' ').toLowerCase().replace(/^./, (s) => s.toUpperCase())

export function Lpg() {
  const t = useT()
  // Certificate header (free text)
  const [vessel, setVessel] = useState('MT DEMO-LPG')
  const [cargoName, setCargoName] = useState('Propane (C3)')
  const [port, setPort] = useState('Terminal Demo, Panamá')
  const [docDate, setDocDate] = useState('2026-06-14')
  const [surveyor, setSurveyor] = useState('')

  // Liquid custody (lpg_custody)
  const [m315, setM315] = useState(1174.058)
  const [density15, setDensity15] = useState(0.501)
  const [bbl60, setBbl60] = useState(7396.57)
  const [wcf, setWcf] = useState(0.99769464)

  // COSTALD CTL (costald_ctl)
  const [relDens60, setRelDens60] = useState(0.503)
  const [liqTemp, setLiqTemp] = useState(83.7)
  const [liqTempUnit, setLiqTempUnit] = useState<'CELSIUS' | 'FAHRENHEIT'>('FAHRENHEIT')
  const [compLight, setCompLight] = useState<LpgComponent>('PROPANE')
  const [compHeavy, setCompHeavy] = useState<LpgComponent>('ISO_BUTANE')
  const [ctlRef, setCtlRef] = useState<'60F' | '15C'>('60F')

  // Vapour-space correction (lpg_vapor_correction)
  const [vaporVol, setVaporVol] = useState(62.844)
  const [pressure, setPressure] = useState(4.7)
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>('BARA')
  const [vaporTemp, setVaporTemp] = useState(-0.6)
  const [molarMass, setMolarMass] = useState(44.097)
  const [z, setZ] = useState(1.0)

  const [liquid, setLiquid] = useState<LpgCustodyResult | null>(null)
  const [ctl, setCtl] = useState<CostaldCtlResult | null>(null)
  const [vapor, setVapor] = useState<LpgVaporResult | null>(null)
  const [kver, setKver] = useState('')

  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])

  // Liquid custody + COSTALD CTL
  useEffect(() => {
    let cancelled = false
    lpgCustody({ m3_15: m315, density15, bbl60, wcfAirPerVac: wcf })
      .then((r) => !cancelled && setLiquid(r))
      .catch(() => !cancelled && setLiquid(null))
    costaldCtl({ relDensity60: relDens60, temperature: liqTemp, temperatureUnit: liqTempUnit, componentLight: compLight, componentHeavy: compHeavy, reference: ctlRef })
      .then((r) => !cancelled && setCtl(r))
      .catch(() => !cancelled && setCtl(null))
    return () => {
      cancelled = true
    }
  }, [m315, density15, bbl60, wcf, relDens60, liqTemp, liqTempUnit, compLight, compHeavy, ctlRef])

  // Vapour correction — depends on liquid MT (vacuum) for the liquid + vapour total
  useEffect(() => {
    let cancelled = false
    const liquidMt = liquid?.mtVacuum ? parseFloat(liquid.mtVacuum) : undefined
    lpgVaporCorrection({ vaporVolume: vaporVol, pressure, pressureUnit, vaporTemperature: vaporTemp, molarMass, z, liquidMassMt: liquidMt })
      .then((r) => !cancelled && setVapor(r))
      .catch(() => !cancelled && setVapor(null))
    return () => {
      cancelled = true
    }
  }, [vaporVol, pressure, pressureUnit, vaporTemp, molarMass, z, liquid?.mtVacuum])

  const liquidRows: [string, string | undefined][] = [
    ['Volume @ 15 °C (m³)', liquid?.m3_15],
    ['Litres @ 15 °C', liquid?.litres15],
    ['Mass in vacuum (MT)', liquid?.mtVacuum],
    ['Mass in air (MT)', liquid?.mtAir],
    ['Long tons (from vacuum)', liquid?.longTons],
    ['US barrels @ 60 °F', liquid?.bbl60],
    ['US gallons @ 60 °F', liquid?.gal60],
    ['Volume @ 60 °F (m³)', liquid?.m3_60],
  ]

  return (
    <div className="flex h-full flex-col print:block print:h-auto">
      <TopBar title="Certificate of Quantity — LPG" />
      <main className="flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
        <div className="mx-auto max-w-5xl space-y-5">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Droplets className="h-5 w-5 text-brand" /> {t('lpg.heading')}
            </h2>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
              <span className="inline-flex items-center gap-1.5 status-ok rounded-full border px-2.5 py-1 text-xs font-medium">
                <Cpu className="h-3.5 w-3.5" /> {t('flowShared.engine')}{kver ? ` · v${kver}` : ''}
              </span>
            </div>
          </div>

          {/* Inputs */}
          <div className="grid gap-4 lg:grid-cols-3 print:hidden">
            {/* Liquid custody */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide"><Droplets className="h-4 w-4 text-brand" /> {t('lpg.liquidCustody')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Field label={t('lpg.vol15')} value={m315} onChange={setM315} />
                <Field label={t('lpg.density15')} value={density15} onChange={setDensity15} step={0.0001} />
                <Field label="US barrels @ 60 °F" value={bbl60} onChange={setBbl60} step={0.01} />
                <Field label={t('lpg.wcfFactor')} value={wcf} onChange={setWcf} step={0.00000001} />
              </CardContent>
            </Card>

            {/* COSTALD CTL */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide"><Thermometer className="h-4 w-4 text-brand" /> {t('lpg.ctlTitle')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Field label={t('lpg.relDens')} value={relDens60} onChange={setRelDens60} step={0.0001} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label={t('lpg.liqTemp', { u: liqTempUnit === 'CELSIUS' ? '°C' : '°F' })} value={liqTemp} onChange={setLiqTemp} step={0.1} />
                  <label className="flex flex-col gap-0.5">
                    <span className={lbl}>{t('lpg.tempUnit')}</span>
                    <select value={liqTempUnit} onChange={(e) => setLiqTempUnit(e.target.value as 'CELSIUS' | 'FAHRENHEIT')} className={sel}>
                      <option value="FAHRENHEIT">°F</option>
                      <option value="CELSIUS">°C</option>
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-0.5">
                    <span className={lbl}>{t('lpg.compLight')}</span>
                    <select value={compLight} onChange={(e) => setCompLight(e.target.value as LpgComponent)} className={sel}>
                      {COMPONENTS.map((c) => <option key={c} value={c}>{compLabel(c)}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className={lbl}>{t('lpg.compHeavy')}</span>
                    <select value={compHeavy} onChange={(e) => setCompHeavy(e.target.value as LpgComponent)} className={sel}>
                      {COMPONENTS.map((c) => <option key={c} value={c}>{compLabel(c)}</option>)}
                    </select>
                  </label>
                </div>
                <label className="flex flex-col gap-0.5">
                  <span className={lbl}>{t('lpg.ctlRef')}</span>
                  <select value={ctlRef} onChange={(e) => setCtlRef(e.target.value as '60F' | '15C')} className={sel}>
                    <option value="60F">60 °F (bbl@60)</option>
                    <option value="15C">15 °C (m³@15)</option>
                  </select>
                </label>
              </CardContent>
            </Card>

            {/* Vapour */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide"><Wind className="h-4 w-4 text-brand" /> {t('lpg.vaporTitle')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Field label={t('lpg.vaporVol')} value={vaporVol} onChange={setVaporVol} step={0.001} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label={t('lpg.pressure')} value={pressure} onChange={setPressure} step={0.001} />
                  <label className="flex flex-col gap-0.5">
                    <span className={lbl}>{t('lpg.pressureUnit')}</span>
                    <select value={pressureUnit} onChange={(e) => setPressureUnit(e.target.value as PressureUnit)} className={sel}>
                      {PRESSURE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </label>
                </div>
                <Field label={t('lpg.vaporTemp')} value={vaporTemp} onChange={setVaporTemp} step={0.1} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label={t('lpg.molarMass')} value={molarMass} onChange={setMolarMass} step={0.001} />
                  <Field label={t('lpg.z')} value={z} onChange={setZ} step={0.001} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ===== Certificate ===== */}
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="border-b border-border">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-gradient flex h-9 w-9 items-center justify-center rounded-lg"><Droplets className="h-5 w-5 text-white" /></div>
                  <div>
                    <CardTitle className="text-base uppercase tracking-wide">Certificate of Quantity — LPG</CardTitle>
                    <div className="text-[11px] text-muted-foreground">Liquid + vapour · gas carrier · API MPMS 17.10.2</div>
                  </div>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">SuperSurvey · white-label</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              {/* Header fields */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 print:grid-cols-3">
                <TextField label={t('flowShared.vessel')} value={vessel} onChange={setVessel} />
                <TextField label={t('lpg.product')} value={cargoName} onChange={setCargoName} />
                <TextField label={t('flowShared.port')} value={port} onChange={setPort} />
                <TextField label={t('flowShared.date')} value={docDate} onChange={setDocDate} />
                <TextField label={t('flowShared.surveyor')} value={surveyor} onChange={setSurveyor} />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {/* Liquid figure */}
                <div>
                  <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><Droplets className="h-4 w-4 text-brand" /> Liquid figure</div>
                  <table className="table-dense w-full border-collapse">
                    <tbody>
                      {liquidRows.map(([k, v]) => (
                        <tr key={k}>
                          <td className="cell-l">{k}</td>
                          <td className="font-semibold">{v ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {liquid && !liquid.success && <p className="mt-1 text-[11px] text-danger">{liquid.errors?.[0]?.message}</p>}
                </div>

                {/* CTL + Vapour */}
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><Thermometer className="h-4 w-4 text-brand" /> Liquid CTL (COSTALD)</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                      <Meta k={`CTL → ${ctlRef}`} v={ctl?.ctl} strong />
                      <Meta k="Interp. S" v={ctl?.interpolationS} />
                      <Meta k="Pseudo-Tc (K)" v={ctl?.pseudoTcKelvin} />
                      <Meta k="Pseudo-ω" v={ctl?.pseudoOmega} />
                    </div>
                    {ctl && !ctl.success && <p className="mt-1 text-[11px] text-danger">{ctl.errors?.[0]?.message}</p>}
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><Wind className="h-4 w-4 text-brand" /> Vapour figure</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                      <Meta k="Pressure (bar abs)" v={vapor?.pressureBarAbs} />
                      <Meta k="Vapour density (kg/m³)" v={vapor?.vaporDensityKgM3} />
                      <Meta k="Vapour mass (MT)" v={vapor?.vaporMassMt} strong />
                    </div>
                    {vapor && !vapor.success && <p className="mt-1 text-[11px] text-danger">{vapor.errors?.[0]?.message}</p>}
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-brand/30 bg-brand/5 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Scale className="h-4 w-4 text-brand" /> Total custody (liquid + vapour)</div>
                <div className="flex flex-wrap gap-x-8 gap-y-1">
                  <div><div className={lbl}>Liquid (MT vac)</div><div className="font-mono text-base font-semibold tabular-nums">{liquid?.mtVacuum ?? '—'}</div></div>
                  <div><div className={lbl}>Vapour (MT)</div><div className="font-mono text-base font-semibold tabular-nums">{vapor?.vaporMassMt ?? '—'}</div></div>
                  <div><div className={lbl}>Total (MT vac)</div><div className="font-mono text-2xl font-bold tabular-nums text-brand">{vapor?.totalMassMt ?? '—'}</div></div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-4">
                {['Surveyor', 'Master / Chief Engineer'].map((r) => (
                  <div key={r}>
                    <div className="h-10 border-b border-foreground/40" />
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><PenLine className="h-3 w-3" /> {r}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            {t('lpg.notePre')}<strong>{t('lpg.noteLiquid')}</strong>{t('lpg.noteLiquidPost')}
            <strong>{t('lpg.noteCtl')}</strong>{t('lpg.noteAnd')}<strong>{t('lpg.noteVapor')}</strong>
            {t('lpg.noteFormula')}<strong>{t('lpg.noteTotal')}</strong>{t('lpg.notePost')}<em>{t('lpg.noteVesselA')}</em>{t('lpg.noteEnd')}
          </p>
        </div>
      </main>
    </div>
  )
}

/** Los intermedios del kernel llegan con precisión decimal completa (20+
 *  dígitos); para DISPLAY se recortan a 8 significativos — el valor exacto
 *  queda en el title (hover) y en el JSON técnico. */
function fmtMeta(v?: string): string | undefined {
  if (v === undefined) return undefined
  const n = Number(v)
  if (!Number.isFinite(n)) return v
  return String(parseFloat(n.toPrecision(8)))
}

function Meta({ k, v, strong }: { k: string; v?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="whitespace-nowrap text-muted-foreground">{k}</span>
      <span
        title={v}
        className={`truncate font-mono tabular-nums ${strong ? 'text-sm font-bold text-brand' : 'font-medium'}`}
      >
        {fmtMeta(v) ?? '—'}
      </span>
    </div>
  )
}

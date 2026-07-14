import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { StatusChip } from '../components/ui/status'
import { TopBar } from '../components/TopBar'
import { NextStepBar } from '../components/NextStepBar'
import { getJob } from '../data/demoJobs'
import { useParams } from 'react-router-dom'
import { lngDischarge, kernelVersion, type LngDischargeResult, type LngComposition, type LngMolarVolumes } from '../lib/kernel'
import { parseDec } from '../lib/num'
import { useT } from '../i18n/LanguageProvider'
import type { TKey } from '../i18n/dict'
import { Flame, Cpu, AlertTriangle } from 'lucide-react'

// Descarga de LNG — custody por ENERGÍA (GIIGNL / ISO 6976). La composición molar
// da la masa molar y el GHV (mass); la densidad sale del método revisado de
// Klosek–McKinley (RKM) o se ingresa de la CTS del buque; con los volúmenes
// antes/después se obtienen masa y energía bruta/neta. Todo lo calcula el motor
// decimal (kernel). Datos demo = un caso real anonimizado (densidad 426.0 kg/m³,
// energía neta 3 424 985 MMBtu).

type CompKey = keyof LngComposition
type ViKey = keyof LngMolarVolumes

const COMPONENTS: { key: CompKey; labelKey: TKey; vi: ViKey | null }[] = [
  { key: 'methane', labelKey: 'lngd.comp.methane', vi: 'methane' },
  { key: 'ethane', labelKey: 'lngd.comp.ethane', vi: 'ethane' },
  { key: 'propane', labelKey: 'lngd.comp.propane', vi: 'propane' },
  { key: 'isoButane', labelKey: 'lngd.comp.isoButane', vi: 'isoButane' },
  { key: 'nButane', labelKey: 'lngd.comp.nButane', vi: 'nButane' },
  { key: 'isoPentane', labelKey: 'lngd.comp.isoPentane', vi: 'isoPentane' },
  { key: 'nPentane', labelKey: 'lngd.comp.nPentane', vi: 'nPentane' },
  { key: 'neoPentane', labelKey: 'lngd.comp.neoPentane', vi: 'neoPentane' },
  { key: 'hexanePlus', labelKey: 'lngd.comp.hexanePlus', vi: 'hexanePlus' },
  { key: 'nitrogen', labelKey: 'lngd.comp.nitrogen', vi: 'nitrogen' },
  { key: 'carbonDioxide', labelKey: 'lngd.comp.co2', vi: null },
  { key: 'oxygen', labelKey: 'lngd.comp.o2', vi: null },
]

// Caso de referencia (anonimizado) — composición mol%.
const DEMO_COMP: LngComposition = { methane: 97.98, ethane: 1.78, propane: 0.15, isoButane: 0.03, nButane: 0.02, nitrogen: 0.04 }
// Vi por componente (m³/kmol) a −159.3 °C, del reporte de referencia (GIIGNL/ISO 6578).
const DEMO_VI: LngMolarVolumes = { methane: 0.038242, ethane: 0.048001, propane: 0.06256, isoButane: 0.078423, nButane: 0.076943, nitrogen: 0.047499 }

const numCls = 'input-dense w-full px-2 py-1 text-right font-mono text-[11px] tabular-nums'

function NumInput({ value, onChange, step = 0.001 }: { value: number; onChange: (n: number) => void; step?: number }) {
  return <input type="number" step={step} value={value} onChange={(e) => onChange(parseDec(e.target.value))} className={numCls} />
}

/** Una cifra de salida con etiqueta y unidad. */
function Out({ label, value, unit, big }: { label: string; value?: string; unit?: string; big?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-mono tabular-nums ${big ? 'text-lg font-bold text-brand' : 'text-sm font-semibold'}`}>
        {value ?? '—'}
        {value && unit ? <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">{unit}</span> : null}
      </div>
    </div>
  )
}

export function LngDescarga() {
  const { id } = useParams<{ id: string }>()
  const job = getJob(id || '1')
  const t = useT()

  const [comp, setComp] = useState<LngComposition>({ ...DEMO_COMP })
  const [mode, setMode] = useState<'entered' | 'rkm'>('rkm')
  const [density, setDensity] = useState(426.0)
  const [vi, setVi] = useState<LngMolarVolumes>({ ...DEMO_VI })
  const [k1, setK1] = useState(0.000071)
  const [k2, setK2] = useState(0.000165)
  const [volBefore, setVolBefore] = useState(155928.015)
  const [volAfter, setVolAfter] = useState(2079.49)
  const [qr, setQr] = useState(14162)
  const [qf, setQf] = useState(1255)
  const [res, setRes] = useState<LngDischargeResult | null>(null)
  const [kver, setKver] = useState('')

  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])

  const sum = useMemo(() => COMPONENTS.reduce((a, c) => a + (comp[c.key] ?? 0), 0), [comp])
  const sumOk = Math.abs(sum - 100) < 0.01

  useEffect(() => {
    let cancelled = false
    lngDischarge({
      composition: comp,
      density: mode === 'entered' ? density : undefined,
      molarVolumes: mode === 'rkm' ? vi : undefined,
      k1: mode === 'rkm' ? k1 : undefined,
      k2: mode === 'rkm' ? k2 : undefined,
      volumeBefore: volBefore,
      volumeAfter: volAfter,
      vaporDisplaced: qr,
      machineGas: qf,
    })
      .then((r) => !cancelled && setRes(r))
      .catch(() => !cancelled && setRes(null))
    return () => {
      cancelled = true
    }
  }, [comp, mode, density, vi, k1, k2, volBefore, volAfter, qr, qf])

  const setCompVal = (k: CompKey, n: number) => setComp((p) => ({ ...p, [k]: n }))
  const setViVal = (k: ViKey, n: number) => setVi((p) => ({ ...p, [k]: n }))
  const desktopOnly = res?.errors?.some((e) => e.code === 'DESKTOP_ONLY')

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t('op.lngDischarge')} activeJob={job} />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flame className="h-4 w-4 text-brand" /> {t('lngd.introPre')}<strong>{t('lngd.introEnergy')}</strong>{t('lngd.introPost')}
            </p>
            <span className="inline-flex shrink-0 items-center gap-1.5 status-ok rounded-full border px-2.5 py-1 text-xs font-medium">
              <Cpu className="h-3.5 w-3.5" /> {t('flowShared.engine')} · GIIGNL · ISO 6976{kver ? ` · v${kver}` : ''}
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            {/* Composición */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span>{t('lngd.molarComposition')}</span>
                  <StatusChip tone={sumOk ? 'ok' : 'warn'}>Σ {sum.toFixed(2)} %</StatusChip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="table-dense w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="cell-l">{t('lngd.component')}</th>
                      <th>mol %</th>
                      {mode === 'rkm' && <th>Vi (m³/kmol)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPONENTS.map((c) => (
                      <tr key={c.key}>
                        <td className="cell-l">{t(c.labelKey)}</td>
                        <td className="border border-border p-0">
                          <NumInput value={comp[c.key] ?? 0} onChange={(n) => setCompVal(c.key, n)} step={0.01} />
                        </td>
                        {mode === 'rkm' && (
                          <td className="border border-border p-0">
                            {c.vi ? (
                              <NumInput value={vi[c.vi] ?? 0} onChange={(n) => setViVal(c.vi as ViKey, n)} step={0.0001} />
                            ) : (
                              <span className="block px-2 py-1 text-center text-[10px] text-muted-foreground">{t('lngd.excl')}</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{t('lngd.co2Note')}</p>
              </CardContent>
            </Card>

            {/* Densidad + cantidad */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('lngd.densityQty')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('lngd.lngDensity')}</div>
                  <div className="mb-2 flex gap-2">
                    {(['rkm', 'entered'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        aria-pressed={mode === m}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                          mode === m ? 'border-brand bg-brand/5 text-brand' : 'border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {m === 'rkm' ? t('lngd.computeRkm') : t('lngd.enterCts')}
                      </button>
                    ))}
                  </div>
                  {mode === 'entered' ? (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      ρ (kg/m³)
                      <div className="w-28 rounded-md border border-input">
                        <NumInput value={density} onChange={setDensity} step={0.1} />
                      </div>
                    </label>
                  ) : (
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <label className="flex items-center gap-1.5">
                        K1
                        <div className="w-24 rounded-md border border-input">
                          <NumInput value={k1} onChange={setK1} step={0.000001} />
                        </div>
                      </label>
                      <label className="flex items-center gap-1.5">
                        K2
                        <div className="w-24 rounded-md border border-input">
                          <NumInput value={k2} onChange={setK2} step={0.000001} />
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-muted-foreground">
                    {t('lngd.volBefore')}
                    <div className="mt-0.5 rounded-md border border-input">
                      <NumInput value={volBefore} onChange={setVolBefore} step={0.001} />
                    </div>
                  </label>
                  <label className="text-xs text-muted-foreground">
                    {t('lngd.volAfter')}
                    <div className="mt-0.5 rounded-md border border-input">
                      <NumInput value={volAfter} onChange={setVolAfter} step={0.001} />
                    </div>
                  </label>
                  <label className="text-xs text-muted-foreground">
                    {t('lngd.vaporQr')}
                    <div className="mt-0.5 rounded-md border border-input">
                      <NumInput value={qr} onChange={setQr} step={1} />
                    </div>
                  </label>
                  <label className="text-xs text-muted-foreground">
                    {t('lngd.machineQf')}
                    <div className="mt-0.5 rounded-md border border-input">
                      <NumInput value={qf} onChange={setQf} step={1} />
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resultados */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('lngd.qtyEnergyTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              {desktopOnly ? (
                <p className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning" /> {t('lngd.desktopOnly')}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  <Out label={t('lngd.molarMass')} value={res?.molarMass} unit="kg/kmol" />
                  <Out label={t('lngrep.fig.ghvMass')} value={res?.ghvMass} unit="Btu/lb" />
                  <Out label={t('lngrep.fig.density')} value={res?.density} unit="kg/m³" />
                  <Out label={t('lngrep.fig.volDelivered')} value={res?.volumeDelivered} unit="m³" />
                  <Out label={t('lngrep.fig.grossMass')} value={res?.grossMass} unit="kg" />
                  <Out label={t('lngrep.fig.grossEnergy')} value={res?.grossEnergy} unit="MMBtu" />
                  <Out label={t('lngd.vaporPlusMachines')} value={res ? String(Number(res.vaporDisplaced) + Number(res.machineGas)) : undefined} unit="MMBtu" />
                  <Out label={t('lngrep.fig.netEnergy')} value={res?.netEnergy} unit="MMBtu" big />
                </div>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t('lngd.note')}</p>
            </CardContent>
          </Card>

          <NextStepBar
            to={`/trabajo/${id || '1'}/lng-descarga/reporte`}
            label={t('lngd.nextLabel')}
            hint={t('lngd.nextHint')}
          />
        </div>
      </main>
    </div>
  )
}

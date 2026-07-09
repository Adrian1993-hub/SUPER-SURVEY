import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { densityTool, kernelVersion, type DensityToolResult } from '../lib/kernel'
import { ArrowLeftRight, Beaker, Droplets, Layers, Plus, Trash2, Cpu } from 'lucide-react'
import { useT } from '../i18n/LanguageProvider'

// Utilidades de densidad del surveyor — TODO calcula el kernel WASM (método
// documentado en rust-kernel/.../density.rs): API↔ρ15 vía SG60/60 y agua@60°F
// (999.016 kg/m³), ρ_obs@T↔ρ15 invirtiendo la propia ecuación 54B/54A, y
// mezcla ponderada por volumen @15 °C. Nada de fórmulas en TypeScript.

// Formulario denso canónico (.input-dense en index.css); aquí algo más alto.
const inputCls = 'input-dense px-3 py-1.5 text-sm'

function Num({ value, onChange, step = 0.0001 }: { value: string; onChange: (s: string) => void; step?: number }) {
  return <input type="number" step={step} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
}

function Out({ label, value, unit, highlight }: { label: string; value?: string; unit?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${highlight ? 'border-brand/40 bg-brand/10' : 'bg-muted/40'}`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`font-mono text-sm font-semibold tabular-nums ${highlight ? 'text-brand' : ''}`}>
        {value ?? '—'}
        {value && unit ? <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">{unit}</span> : null}
      </div>
    </div>
  )
}

function ErrorNote({ r }: { r: DensityToolResult | null }) {
  if (!r || r.success || !r.errors?.length) return null
  return <p className="mt-2 text-xs text-danger">{r.errors[0].message}</p>
}

// --- Tarjeta 1: API ↔ ρ15 -------------------------------------------------

function ApiCard() {
  const t = useT()
  const [toApi, setToApi] = useState(false) // false: API→ρ15, true: ρ15→API
  const [value, setValue] = useState('17.7')
  const [res, setRes] = useState<DensityToolResult | null>(null)

  useEffect(() => {
    const n = parseFloat(value)
    if (!isFinite(n)) return setRes(null)
    let cancelled = false
    densityTool({ operation: toApi ? 'RHO15_TO_API' : 'API_TO_RHO15', value: n })
      .then((r) => !cancelled && setRes(r))
      .catch(() => !cancelled && setRes(null))
    return () => {
      cancelled = true
    }
  }, [value, toApi])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Droplets className="h-4 w-4 text-brand" /> {t('tools.api.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">{toApi ? t('tools.api.inputRho') : t('tools.api.inputApi')}</label>
            <Num value={value} onChange={setValue} step={toApi ? 0.0001 : 0.1} />
          </div>
          <Button
            variant="outline"
            size="icon"
            title={t('tools.invert')}
            onClick={() => {
              // al invertir, arrastra el resultado como nueva entrada si existe
              const next = toApi ? res?.api : res?.rho15KgL
              setToApi(!toApi)
              if (next) setValue(next)
            }}
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {toApi ? (
            <>
              <Out label="API gravity" value={res?.success ? res.api : undefined} highlight />
              <Out label="SG 60/60 °F" value={res?.success ? res.sg60 : undefined} />
              <Out label="ρ15" value={res?.success ? res.rho15KgM3 : undefined} unit="kg/m³" />
            </>
          ) : (
            <>
              <Out label="ρ15" value={res?.success ? res.rho15KgL : undefined} unit="kg/L" highlight />
              <Out label="ρ15" value={res?.success ? res.rho15KgM3 : undefined} unit="kg/m³" />
              <Out label="SG 60/60 °F" value={res?.success ? res.sg60 : undefined} />
            </>
          )}
        </div>
        <ErrorNote r={res} />
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t('tools.api.note')}</p>
      </CardContent>
    </Card>
  )
}

// --- Tarjeta 2: ρ observada @ T → ρ15 --------------------------------------

function LabCard() {
  const t = useT()
  const [toObserved, setToObserved] = useState(false) // false: obs→ρ15
  const [value, setValue] = useState('0.9440')
  const [temp, setTemp] = useState('20')
  const [res, setRes] = useState<DensityToolResult | null>(null)

  useEffect(() => {
    const n = parseFloat(value)
    const tC = parseFloat(temp)
    if (!isFinite(n) || !isFinite(tC)) return setRes(null)
    let cancelled = false
    densityTool({ operation: toObserved ? 'RHO15_TO_OBSERVED' : 'OBSERVED_TO_RHO15', value: n, temperature: tC })
      .then((r) => !cancelled && setRes(r))
      .catch(() => !cancelled && setRes(null))
    return () => {
      cancelled = true
    }
  }, [value, temp, toObserved])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Beaker className="h-4 w-4 text-brand" /> {t('tools.lab.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">{toObserved ? t('tools.lab.inputRho15') : t('tools.lab.inputObserved')}</label>
            <Num value={value} onChange={setValue} />
          </div>
          <div className="w-28">
            <label className="text-xs text-muted-foreground">{t('tools.lab.tempLabel')}</label>
            <Num value={temp} onChange={setTemp} step={0.25} />
          </div>
          <Button
            variant="outline"
            size="icon"
            title={t('tools.invert')}
            onClick={() => {
              const next = toObserved ? res?.observedKgL : res?.rho15KgL
              setToObserved(!toObserved)
              if (next) setValue(next)
            }}
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {toObserved ? (
            <Out label={t('tools.lab.observedAt', { temp: temp || '—' })} value={res?.success ? res.observedKgL : undefined} unit="kg/L" highlight />
          ) : (
            <Out label="ρ15" value={res?.success ? res.rho15KgL : undefined} unit="kg/L" highlight />
          )}
          <Out label="ρ15" value={res?.success ? res.rho15KgM3 : undefined} unit="kg/m³" />
        </div>
        <ErrorNote r={res} />
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t('tools.lab.note')}</p>
      </CardContent>
    </Card>
  )
}

// --- Tarjeta 3: mezcla (blend) ----------------------------------------------

interface ParcelRow {
  volume: string
  density15: string
}

function BlendCard() {
  const t = useT()
  const [rows, setRows] = useState<ParcelRow[]>([
    { volume: '350.600', density15: '0.9534' },
    { volume: '1050.843', density15: '0.9475' },
  ])
  const [res, setRes] = useState<DensityToolResult | null>(null)

  useEffect(() => {
    const parcels = rows
      .map((r) => ({ volume: parseFloat(r.volume), density15: parseFloat(r.density15) }))
      .filter((p) => isFinite(p.volume) && isFinite(p.density15) && p.volume > 0 && p.density15 > 0)
    if (parcels.length === 0) return setRes(null)
    let cancelled = false
    densityTool({ operation: 'BLEND', parcels })
      .then((r) => !cancelled && setRes(r))
      .catch(() => !cancelled && setRes(null))
    return () => {
      cancelled = true
    }
  }, [rows])

  const update = (i: number, patch: Partial<ParcelRow>) => setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4 text-brand" /> {t('tools.blend.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="pb-1">{t('tools.blend.parcel')}</th>
              <th className="pb-1 text-right">{t('tools.blend.volume')}</th>
              <th className="pb-1 text-right">{t('tools.blend.rho15')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="py-1 pr-2 text-sm text-muted-foreground">#{i + 1}</td>
                <td className="py-1 pr-2">
                  <Num value={r.volume} onChange={(v) => update(i, { volume: v })} step={0.001} />
                </td>
                <td className="py-1 pr-2">
                  <Num value={r.density15} onChange={(v) => update(i, { density15: v })} />
                </td>
                <td className="py-1 text-center">
                  <button
                    onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
                    title={t('tools.blend.removeParcel')}
                    className="text-muted-foreground hover:text-danger"
                    disabled={rows.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => setRows((p) => [...p, { volume: '', density15: '' }])}>
          <Plus className="h-3.5 w-3.5" /> {t('tools.blend.addParcel')}
        </Button>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Out label={t('tools.blend.outRho')} value={res?.success ? res.rho15KgL : undefined} unit="kg/L" highlight />
          <Out label={t('tools.blend.outVolume')} value={res?.success ? res.totalVolumeM3 : undefined} unit="m³" />
          <Out label={t('tools.blend.outMt')} value={res?.success ? res.totalMtVacuum : undefined} unit="MT" />
        </div>
        <ErrorNote r={res} />
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{t('tools.blend.note')}</p>
      </CardContent>
    </Card>
  )
}

export function Utilidades() {
  const t = useT()
  const [kver, setKver] = useState('')
  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t('nav.tools')} />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{t('tools.intro')}</p>
            <span className="inline-flex shrink-0 items-center gap-1.5 status-ok rounded-full border px-2.5 py-1 text-xs font-medium">
              <Cpu className="h-3.5 w-3.5" /> {t('about.engine')} · ASTM{kver ? ` · v${kver}` : ''}
            </span>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <ApiCard />
            <LabCard />
          </div>
          <BlendCard />
        </div>
      </main>
    </div>
  )
}

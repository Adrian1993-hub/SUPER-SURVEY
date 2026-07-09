import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { densityTool, kernelVersion, type DensityToolResult } from '../lib/kernel'
import { ArrowLeftRight, Beaker, Droplets, Layers, Plus, Trash2, Cpu } from 'lucide-react'

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
          <Droplets className="h-4 w-4 text-brand" /> API ↔ densidad @15 °C
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">{toApi ? 'Densidad @15 °C (kg/L)' : 'API gravity @60 °F'}</label>
            <Num value={value} onChange={setValue} step={toApi ? 0.0001 : 0.1} />
          </div>
          <Button
            variant="outline"
            size="icon"
            title="Invertir dirección"
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
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Vía SG 60/60 °F y agua @60 °F = 999.016 kg/m³ (convención API MPMS); el salto 60 °F→15 °C usa la expansión térmica del
          propio producto (ecuación 54B).
        </p>
      </CardContent>
    </Card>
  )
}

// --- Tarjeta 2: ρ observada @ T → ρ15 --------------------------------------

function LabCard() {
  const [toObserved, setToObserved] = useState(false) // false: obs→ρ15
  const [value, setValue] = useState('0.9440')
  const [temp, setTemp] = useState('20')
  const [res, setRes] = useState<DensityToolResult | null>(null)

  useEffect(() => {
    const n = parseFloat(value)
    const t = parseFloat(temp)
    if (!isFinite(n) || !isFinite(t)) return setRes(null)
    let cancelled = false
    densityTool({ operation: toObserved ? 'RHO15_TO_OBSERVED' : 'OBSERVED_TO_RHO15', value: n, temperature: t })
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
          <Beaker className="h-4 w-4 text-brand" /> Densidad de laboratorio (ρ @ T ↔ ρ15)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">{toObserved ? 'ρ15 (kg/L)' : 'ρ observada (kg/L)'}</label>
            <Num value={value} onChange={setValue} />
          </div>
          <div className="w-28">
            <label className="text-xs text-muted-foreground">T observación (°C)</label>
            <Num value={temp} onChange={setTemp} step={0.25} />
          </div>
          <Button
            variant="outline"
            size="icon"
            title="Invertir dirección"
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
            <Out label={`ρ observada @ ${temp || '—'} °C`} value={res?.success ? res.observedKgL : undefined} unit="kg/L" highlight />
          ) : (
            <Out label="ρ15" value={res?.success ? res.rho15KgL : undefined} unit="kg/L" highlight />
          )}
          <Out label="ρ15" value={res?.success ? res.rho15KgM3 : undefined} unit="kg/m³" />
        </div>
        <ErrorNote r={res} />
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Para certificados de laboratorio reportados a 20 °C (u otra T): el motor de cálculo resuelve ρ15 invirtiendo ρ_obs = ρ15 ×
          VCF(ρ15, T) — la misma 54B de la hoja, sin factores fijos.
        </p>
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
          <Layers className="h-4 w-4 text-brand" /> Densidad de mezcla (ROB + recibido)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="pb-1">Parcela</th>
              <th className="pb-1 text-right">Volumen @15 °C (m³)</th>
              <th className="pb-1 text-right">ρ15 (kg/L)</th>
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
                    title="Quitar parcela"
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
          <Plus className="h-3.5 w-3.5" /> Añadir parcela
        </Button>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Out label="ρ15 mezcla" value={res?.success ? res.rho15KgL : undefined} unit="kg/L" highlight />
          <Out label="Volumen total" value={res?.success ? res.totalVolumeM3 : undefined} unit="m³" />
          <Out label="MT (vacío)" value={res?.success ? res.totalMtVacuum : undefined} unit="MT" />
        </div>
        <ErrorNote r={res} />
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Ponderada por volumen @15 °C (conserva la masa; mezcla ideal — el papeleo de búnker ignora la contracción real). Útil
          para la densidad resultante tras recibir sobre un remanente.
        </p>
      </CardContent>
    </Card>
  )
}

export function Utilidades() {
  const [kver, setKver] = useState('')
  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Utilidades" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Conversiones de densidad del surveyor — método por ecuación, documentado y trazable (sin tablas impresas fijas).
            </p>
            <span className="inline-flex shrink-0 items-center gap-1.5 status-ok rounded-full border px-2.5 py-1 text-xs font-medium">
              <Cpu className="h-3.5 w-3.5" /> Motor de cálculo · ASTM{kver ? ` · v${kver}` : ''}
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

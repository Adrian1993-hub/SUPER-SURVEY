import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { blendFuelOil, kernelVersion, type BlendComponentInput, type BlendResult } from '../lib/kernel'
import { Cpu, FileText, Beaker, Plus, Trash2, Scale } from 'lucide-react'

// Fuel-oil blend (commingling). Todo lo calcula el kernel WASM (blend.rs):
// API por mezcla de densidades, viscosidad por Refutas, flash/pour por índices
// de mezcla no lineales, azufre/agua/sed lineales. Defaults anclados al
// worksheet del cliente (vol 546.5/225, API 33.1/34.6 → 33.5347; S 4.4/4.5 → 4.4292).

type Row = BlendComponentInput

const DEFAULTS: Row[] = [
  { volume: 546.5, api60f: 33.1, viscosityCst: 380, sulfurWtPct: 4.4, waterVolPct: 0.3, sedimentWtPct: 0.05, flashF: 150, pourF: 10 },
  { volume: 225, api60f: 34.6, viscosityCst: 180, sulfurWtPct: 4.5, waterVolPct: 0.2, sedimentWtPct: 0.05, flashF: 160, pourF: 15 },
]

const FIELDS: { key: keyof Row; label: string; step: number }[] = [
  { key: 'volume', label: 'Vol m³', step: 0.001 },
  { key: 'api60f', label: 'API @60', step: 0.1 },
  { key: 'viscosityCst', label: 'Visc cSt', step: 0.1 },
  { key: 'sulfurWtPct', label: 'S wt%', step: 0.01 },
  { key: 'waterVolPct', label: 'H₂O v%', step: 0.01 },
  { key: 'sedimentWtPct', label: 'Sed w%', step: 0.01 },
  { key: 'flashF', label: 'Flash °F', step: 1 },
  { key: 'pourF', label: 'Pour °F', step: 1 },
]

// Formulario denso canónico: .input-dense (index.css); aquí un punto más compacto.
const inp = 'input-dense text-[11px]'
const lbl = 'text-[11px] text-muted-foreground'

export function Blend() {
  const [rows, setRows] = useState<Row[]>(DEFAULTS)
  const [res, setRes] = useState<BlendResult | null>(null)
  const [kver, setKver] = useState('')

  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])

  useEffect(() => {
    let cancelled = false
    blendFuelOil(rows)
      .then((r) => !cancelled && setRes(r))
      .catch(() => !cancelled && setRes(null))
    return () => {
      cancelled = true
    }
  }, [rows])

  const set = (i: number, key: keyof Row, v: number) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: v } : r)))
  const addRow = () => setRows((rs) => (rs.length < 8 ? [...rs, { ...DEFAULTS[0], volume: 0 }] : rs))
  const delRow = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs))

  const out: [string, string | undefined, string][] = [
    ['API @ 60 °F', res?.api60f, ''],
    ['SG 60/60', res?.sg60, ''],
    ['Viscosidad', res?.viscosityCst, 'cSt'],
    ['Azufre', res?.sulfurWtPct, 'wt%'],
    ['Agua', res?.waterVolPct, 'vol%'],
    ['Sedimento', res?.sedimentWtPct, 'wt%'],
    ['Flash', res?.flashF, '°F'],
    ['Pour', res?.pourF, '°F'],
  ]

  return (
    <div className="flex h-full flex-col print:block print:h-auto">
      <TopBar title="Blend — mezcla de fuel oil" />
      <main className="flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
        <div className="mx-auto max-w-5xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Beaker className="h-5 w-5 text-brand" /> Blend (commingling) — hasta 8 componentes
            </h2>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
              <span className="inline-flex items-center gap-1.5 status-ok rounded-full border px-2.5 py-1 text-xs font-medium">
                <Cpu className="h-3.5 w-3.5" /> Kernel {kver ? `v${kver}` : '…'} · WASM
              </span>
            </div>
          </div>

          {/* Component inputs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm uppercase tracking-wide">Componentes</CardTitle>
              <Button variant="outline" className="h-7 gap-1.5 px-2 text-xs print:hidden" onClick={addRow} disabled={rows.length >= 8}>
                <Plus className="h-3.5 w-3.5" /> Añadir
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="table-dense w-full border-collapse">
                <thead>
                  <tr>
                    <th className="cell-l th-caps">#</th>
                    {FIELDS.map((f) => (
                      <th key={f.key} className="th-caps">{f.label}</th>
                    ))}
                    <th className="th-caps">Vol% / Peso%</th>
                    <th className="print:hidden" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td className="cell-l font-semibold text-muted-foreground">({i + 1})</td>
                      {FIELDS.map((f) => (
                        <td key={f.key} className="px-1 py-1">
                          <input
                            type="number"
                            step={f.step}
                            value={Number.isFinite(row[f.key]) ? row[f.key] : 0}
                            onChange={(e) => set(i, f.key, parseFloat(e.target.value) || 0)}
                            className={inp}
                          />
                        </td>
                      ))}
                      <td className="px-1.5 py-1 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                        {res?.fractions?.[i] ? `${res.fractions[i].volumePct} / ${res.fractions[i].weightPct}` : '—'}
                      </td>
                      <td className="px-1 py-1 text-center print:hidden">
                        <button onClick={() => delRow(i)} disabled={rows.length <= 1} className="text-muted-foreground hover:text-danger disabled:opacity-30" title="Quitar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Blended product */}
          <Card className="print:border-0 print:shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4 text-brand" /> Producto resultante (blend)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
                <div>
                  <div className={lbl}>Volumen total (m³)</div>
                  <div className="font-mono text-2xl font-bold tabular-nums text-brand">{res?.totalVolume ?? '—'}</div>
                </div>
                {out.map(([k, v, u]) => (
                  <div key={k}>
                    <div className={lbl}>{k}</div>
                    <div className="font-mono text-lg font-semibold tabular-nums">{v ?? '—'}{u && <span className="ml-1 text-xs font-normal text-muted-foreground">{u}</span>}</div>
                  </div>
                ))}
              </div>
              {res && !res.success && <p className="text-sm text-danger">{res.errors?.[0]?.message}</p>}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Reglas de mezcla en el kernel Rust/WASM: <strong>API</strong> por mezcla de densidades (SG=141.5/(131.5+API)),
            <strong> viscosidad por Refutas</strong> (14.534·ln(ln(ν+0.8))+10.975), <strong>flash/pour por índices de mezcla</strong>
            no lineales, y azufre/agua/sedimento lineales por volumen. Anclado al <em>Fuel Oil Blend Program</em> real
            (vol 546.5/225, API 33.1/34.6 → 33.5347; azufre 4.4/4.5 → 4.4292). Refutas es canónicamente por peso; aquí por volumen
            (convención de la hoja). Conversor cSt↔SFS y propiedades extra: pendientes.
          </p>
        </div>
      </main>
    </div>
  )
}

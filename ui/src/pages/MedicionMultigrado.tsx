import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { TopBar } from '../components/TopBar'
import { multigradeDemo, type ImpGrade } from '../data/multigrade'
import { kernelVersion, type ImperialRowInput } from '../lib/kernel'
import { useImperialRows, type ImperialCalcFields } from '../lib/useBqsRows'
import { Cpu, Layers, Droplets } from 'lucide-react'

// BQS IMPERIAL MULTIGRADO: una sección de medición por GRADO, en unidades US
// (API @60 °F, barriles, Tablas 6A/6B + 13). TODO lo calcula el kernel WASM
// (mismo Rust validado contra el worksheet SGS de referencia) — nada en TS.

const f2 = (n: number) => n.toFixed(2)
const f3 = (n: number) => n.toFixed(3)
const f5 = (n: number) => n.toFixed(5)

const th = 'border border-border px-1.5 py-1 text-right text-[10px] font-medium text-muted-foreground'
const thL = 'border border-border px-1.5 py-1 text-left text-[10px] font-medium text-muted-foreground'
const td = 'border border-border px-1.5 py-1 text-right font-mono text-[11px] tabular-nums'
const tdL = 'border border-border px-1.5 py-1 text-left text-[11px]'
const tdGrey = `${td} bg-muted/50`

function gradeRows(g: ImpGrade): ImperialRowInput[] {
  return g.tanks.map((t) => ({
    api: t.api,
    temperature: t.tempC,
    temperatureUnit: 'CELSIUS',
    volume: t.volumeM3,
    volumeUnit: 'CUBIC_METERS',
    freeWater: t.freeWaterM3 ?? 0,
    table: '6B',
  }))
}

function GradeSection({ g, onTotal }: { g: ImpGrade; onTotal: (grade: string, mt: number) => void }) {
  const calc = useImperialRows(gradeRows(g))
  const sum = (pick: (c: ImperialCalcFields) => number) => calc.reduce((a, c) => a + (c ? pick(c) : 0), 0)
  const totGsv = sum((c) => c.gsvBbl)
  const totMt = sum((c) => c.mtAir)
  const totMtVac = sum((c) => c.mtVacuum)

  useEffect(() => {
    onTotal(g.grade, totMt)
  }, [g.grade, totMt, onTotal])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Droplets className="h-4 w-4 text-brand" /> {g.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thL}>Tanque</th>
              <th className={th}>API@60</th>
              <th className={th}>Temp °C</th>
              <th className={th}>TOV m³</th>
              <th className={th}>GOV bbl</th>
              <th className={th}>VCF 6B</th>
              <th className={th}>GSV bbl</th>
              <th className={th}>WCF 13</th>
              <th className={th}>MT (aire)</th>
            </tr>
          </thead>
          <tbody>
            {g.tanks.map((t, i) => {
              const c = calc[i]
              return (
                <tr key={t.tank + i}>
                  <td className={tdL}>{t.tank}</td>
                  <td className={td}>{f2(t.api)}</td>
                  <td className={td}>{f2(t.tempC)}</td>
                  <td className={td}>{f3(t.volumeM3)}</td>
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
                Total {g.grade}
              </td>
              <td className={td}>{f2(totGsv)}</td>
              <td className={td}></td>
              <td className={td}>{f3(totMt)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Peso en vacío (Tabla 56): <span className="font-mono tabular-nums">{f3(totMtVac)}</span> MT · grupo por banda de API.
        </p>
      </CardContent>
    </Card>
  )
}

export function MedicionMultigrado() {
  const h = multigradeDemo.header
  const [totals, setTotals] = useState<Record<string, number>>({})
  const onTotal = (grade: string, mt: number) => setTotals((s) => (s[grade] === mt ? s : { ...s, [grade]: mt }))
  const grand = Object.values(totals).reduce((a, b) => a + b, 0)

  const [kver, setKver] = useState('')
  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Multigrado (imperial)" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-[1400px] space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Layers className="h-5 w-5 text-brand" /> BQS imperial · una hoja por grado
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {h.buque} · {h.barcaza} · {h.puerto} · {h.fecha} · ref. {h.referencia}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
              <Cpu className="h-3.5 w-3.5" /> Kernel {kver ? `v${kver}` : '…'} · 60 °F · Tablas 6A/6B/13 · WASM
            </span>
          </div>

          {/* Resumen por grado */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-2 py-4">
              {multigradeDemo.grades.map((g) => (
                <div key={g.grade}>
                  <div className="text-xs text-muted-foreground">{g.grade} — MT (aire)</div>
                  <div className="font-mono text-lg font-bold tabular-nums text-brand">{f3(totals[g.grade] ?? 0)}</div>
                </div>
              ))}
              <div className="ml-auto">
                <div className="text-xs text-muted-foreground">Total general</div>
                <div className="font-mono text-lg font-bold tabular-nums">{f3(grand)} MT</div>
              </div>
            </CardContent>
          </Card>

          {multigradeDemo.grades.map((g) => (
            <GradeSection key={g.grade} g={g} onTotal={onTotal} />
          ))}

          <p className="text-xs text-muted-foreground">
            Celdas <span className="rounded bg-muted/50 px-1">grises</span> = calculadas por el kernel imperial (API→densidad@60,
            corrección ITS-68, VCF Tabla 6B por banda de API, WCF Tabla 13 → MT/barril). Validado contra el worksheet SGS de
            referencia. Datos de demostración ficticios.
          </p>
        </div>
      </main>
    </div>
  )
}

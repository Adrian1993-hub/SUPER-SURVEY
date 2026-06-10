import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Select } from '../components/ui/select'
import { TopBar } from '../components/TopBar'
import { getJob } from '../data/demoJobs'
import { comparacionUnidades, BARGE_FACTOR, BDN_FACTOR, TOLERANCIA_PCT, toleranceLayers, discrepanciaInfo } from '../data/vmr'
import { compareSources, type ComparisonResult, type RecommendedAction } from '../lib/kernel'
import { CheckCircle2, AlertTriangle, FileText, PenLine, ShieldAlert, Cpu } from 'lucide-react'

const toneBox: Record<string, string> = {
  red: 'border-red-500/30 bg-red-500/10 text-red-600',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
}

function recommendation(action: RecommendedAction, worst: number) {
  const w = worst.toFixed(4)
  switch (action) {
    case 'ISSUE_LOP':
      return {
        tab: 'lop',
        tone: 'red',
        icon: ShieldAlert,
        title: 'Excede tolerancia — emitir LOP',
        desc: `El peor |Δ%| (${w}%) supera la capa más amplia. Se recomienda una Letter of Protest.`,
      }
    case 'ISSUE_NOAD':
      return {
        tab: 'noad',
        tone: 'amber',
        icon: AlertTriangle,
        title: 'Discrepancia aparente — NOAD',
        desc: `El peor |Δ%| (${w}%) supera la capa más estricta pero no la más amplia. Notifíquese (NOAD).`,
      }
    default:
      return {
        tab: 'sof',
        tone: 'emerald',
        icon: CheckCircle2,
        title: 'Dentro de tolerancia',
        desc: `El peor |Δ%| (${w}%) está dentro de todas las capas. No se requiere documento de discrepancia.`,
      }
  }
}

export function Comparacion() {
  const { id } = useParams<{ id: string }>()
  const job = getJob(id || '1')
  const [unitIdx, setUnitIdx] = useState(3) // MT (aire) por defecto
  const [cmp, setCmp] = useState<ComparisonResult | null>(null)

  // Comparación canónica en MT (aire) por el kernel. Los valores demo son
  // proporcionales, así que el Δ% es el mismo en cualquier unidad → se calcula
  // una vez y se reutiliza para todas las unidades del selector.
  const vesselMtAir =
    comparacionUnidades.find((x) => x.unidad.startsWith('MT (aire'))?.vessel ?? comparacionUnidades[3].vessel
  useEffect(() => {
    let cancelled = false
    compareSources({
      sources: [
        { name: 'VESSEL_RECEIVED', quantity: vesselMtAir },
        { name: 'BARGE_DELIVERED', quantity: vesselMtAir * BARGE_FACTOR },
        { name: 'BDN', quantity: vesselMtAir * BDN_FACTOR },
      ],
      layers: toleranceLayers,
      scope: 'LIVE',
    })
      .then((r) => {
        if (!cancelled) setCmp(r)
      })
      .catch(() => {
        if (!cancelled) setCmp(null)
      })
    return () => {
      cancelled = true
    }
  }, [vesselMtAir])

  const u = comparacionUnidades[unitIdx]
  const vessel = u.vessel
  const barge = u.vessel * BARGE_FACTOR
  const bdn = u.vessel * BDN_FACTOR
  const fmt = (n: number) =>
    n.toLocaleString('es-ES', { minimumFractionDigits: u.decimals, maximumFractionDigits: u.decimals })

  // Pares mostrados en la unidad elegida; Δ% y "dentro" vienen del kernel.
  const kp = cmp?.pairs ?? []
  const pares = [
    { nombre: 'Vessel Received vs Barge Delivered', a: vessel, b: barge, k: kp[0] },
    { nombre: 'Vessel Received vs BDN', a: vessel, b: bdn, k: kp[1] },
    { nombre: 'Barge Delivered vs BDN', a: barge, b: bdn, k: kp[2] },
  ].map((p) => {
    const delta = p.a - p.b
    const pct = p.k ? Number(p.k.deltaPct) : (delta / p.b) * 100
    const dentro = p.k ? p.k.withinAll : Math.abs(pct) <= TOLERANCIA_PCT
    return { ...p, delta, pct, dentro }
  })

  const fuentes = [
    { nombre: 'Vessel Received', total: vessel, highlight: true },
    { nombre: 'Barge Delivered', total: barge, highlight: false },
    { nombre: 'BDN', total: bdn, highlight: false },
  ]

  const action: RecommendedAction = cmp?.recommendedAction ?? 'NONE'
  const worst = cmp?.worstDeltaPct ? Number(cmp.worstDeltaPct) : Math.max(...pares.map((p) => Math.abs(p.pct)))
  const rec = recommendation(action, worst)
  const RecIcon = rec.icon
  const worstLayers = cmp?.pairs?.[1]?.layers ?? [] // capas del peor par (vessel vs BDN)
  const main = pares[0]

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Comparación" activeJob={job} />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Recomendación del kernel (None / NOAD / LOP) */}
          <div className={`flex items-start gap-3 rounded-xl border p-4 ${toneBox[rec.tone]}`}>
            <RecIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold">{rec.title}</div>
              <div className="text-sm opacity-90">{rec.desc}</div>
              {worstLayers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {worstLayers.map((l) => (
                    <span
                      key={l.name}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                        l.within
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                          : 'border-red-500/30 bg-red-500/10 text-red-600'
                      }`}
                    >
                      {l.name} ±{Number(l.limitPct)}% {l.within ? '✓' : '✗'}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-current px-2 py-0.5 text-xs opacity-80">
              <Cpu className="h-3 w-3" /> kernel
            </span>
          </div>

          {/* Ventanita: selector de unidad + comparación recibido vs entregado */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Cantidades recibidas vs entregadas</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Unidad:</span>
                  <div className="w-52">
                    <Select value={unitIdx} onChange={(e) => setUnitIdx(Number(e.target.value))} className="w-full">
                      {comparacionUnidades.map((unit, i) => (
                        <option key={unit.unidad} value={i}>
                          {unit.unidad}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                {fuentes.map((f) => (
                  <div
                    key={f.nombre}
                    className={`rounded-lg border p-4 ${f.highlight ? 'border-brand/30 bg-brand/10' : ''}`}
                  >
                    <div className="text-sm text-muted-foreground">{f.nombre}</div>
                    <div className="mt-1 font-mono text-2xl font-bold tabular-nums">
                      {fmt(f.total)} <span className="text-base font-medium text-muted-foreground">{u.sufijo}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comparación</TableHead>
                    <TableHead className="text-right">A ({u.sufijo})</TableHead>
                    <TableHead className="text-right">B ({u.sufijo})</TableHead>
                    <TableHead className="text-right">Δ ({u.sufijo})</TableHead>
                    <TableHead className="text-right">Δ%</TableHead>
                    <TableHead>ISO ±{TOLERANCIA_PCT}%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pares.map((p) => (
                    <TableRow key={p.nombre}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{fmt(p.a)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{fmt(p.b)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {p.delta > 0 ? '+' : ''}
                        {fmt(p.delta)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {p.pct > 0 ? '+' : ''}
                        {p.pct.toFixed(3)}%
                      </TableCell>
                      <TableCell>
                        {p.dentro ? (
                          <Badge className="gap-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> Dentro
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1.5">
                            <AlertTriangle className="h-3 w-3" /> Fuera
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Documentos de discrepancia: mismo dato, distinto formato */}
          <Card>
            <CardHeader>
              <CardTitle>Documento de discrepancia</CardTitle>
              <p className="text-sm text-muted-foreground">
                Statement of Fact, NOAD y LOP comparten los mismos datos; cambia el formato y el tono. La pestaña
                recomendada por el kernel está marcada.
              </p>
            </CardHeader>
            <CardContent>
              {/* key={rec.tab} remonta las pestañas para abrir la recomendada al cargar */}
              <Tabs key={rec.tab} defaultValue={rec.tab}>
                <TabsList>
                  <TabsTrigger value="sof">Statement of Fact{rec.tab === 'sof' && ' ★'}</TabsTrigger>
                  <TabsTrigger value="noad">NOAD{rec.tab === 'noad' && ' ★'}</TabsTrigger>
                  <TabsTrigger value="lop">LOP{rec.tab === 'lop' && ' ★'}</TabsTrigger>
                </TabsList>

                <TabsContent value="sof">
                  <DocBody
                    titulo="STATEMENT OF FACT"
                    intro={`Por la presente se dejan constancia de los hechos de la operación ${discrepanciaInfo.operacion} a bordo del ${discrepanciaInfo.buque}, desde ${discrepanciaInfo.barcaza}, en ${discrepanciaInfo.puerto} el ${discrepanciaInfo.fecha}. Las cantidades medidas se detallan a continuación.`}
                    main={main}
                    unit={u}
                    fmt={fmt}
                  />
                </TabsContent>
                <TabsContent value="noad">
                  <DocBody
                    titulo="NOTICE OF APPARENT DISCREPANCY (NOAD)"
                    intro={`Se notifica una aparente discrepancia entre la cantidad entregada por la barcaza (${discrepanciaInfo.barcaza}) y la recibida por el buque (${discrepanciaInfo.buque}) en la operación de ${discrepanciaInfo.grado}. Se solicita acuse de recibo de la diferencia indicada.`}
                    main={main}
                    unit={u}
                    fmt={fmt}
                  />
                </TabsContent>
                <TabsContent value="lop">
                  <DocBody
                    titulo="LETTER OF PROTEST (LOP)"
                    intro={`Por la presente protestamos formalmente la diferencia observada entre la cantidad entregada y la recibida en la operación a bordo del ${discrepanciaInfo.buque} en ${discrepanciaInfo.puerto}, sin perjuicio de derechos posteriores.`}
                    main={main}
                    unit={u}
                    fmt={fmt}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

interface MainPair {
  a: number
  b: number
  delta: number
  pct: number
}

function DocBody({
  titulo,
  intro,
  main,
  unit,
  fmt,
}: {
  titulo: string
  intro: string
  main: MainPair
  unit: { sufijo: string }
  fmt: (n: number) => string
}) {
  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      <div className="text-center">
        <div className="text-lg font-bold tracking-wide">{titulo}</div>
        <div className="text-xs text-muted-foreground">SuperSurvey · Empresa Demo (marca configurable)</div>
      </div>
      <p className="text-sm leading-relaxed">{intro}</p>

      <Table>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Barge Delivered</TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {fmt(main.b)} {unit.sufijo}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Vessel Received</TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {fmt(main.a)} {unit.sufijo}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-semibold">Diferencia</TableCell>
            <TableCell className="text-right font-mono font-semibold tabular-nums">
              {main.delta > 0 ? '+' : ''}
              {fmt(main.delta)} {unit.sufijo} ({main.pct > 0 ? '+' : ''}
              {main.pct.toFixed(3)}%)
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div className="grid grid-cols-2 gap-8 pt-4 text-sm">
        <div>
          <div className="h-10 border-b" />
          <div className="mt-1 text-muted-foreground">Surveyor</div>
        </div>
        <div>
          <div className="h-10 border-b" />
          <div className="mt-1 text-muted-foreground">Por el buque / barcaza</div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" /> Exportar PDF
        </Button>
        <Button className="gap-2 bg-brand text-brand-foreground hover:brightness-110">
          <PenLine className="h-4 w-4" /> Firmar
        </Button>
      </div>
    </div>
  )
}

import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { StatusChip } from '../components/ui/status'
import { TopBar } from '../components/TopBar'
import { getJob, calcTraceData } from '../data/demoJobs'

export function CalculoTrace() {
  const { id } = useParams<{ id: string }>()
  const jobId = id || '1'
  const job = getJob(jobId)
  const c = calcTraceData[jobId] ?? calcTraceData['1']

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Cálculo + Trace" activeJob={job} />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone="neutral">{c.tanque}</StatusChip>
            <Badge variant="outline">{c.engineVersion}</Badge>
            <Badge variant="outline">Tablas {c.tablaAstm}</Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cadena de cálculo explicable</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-0">
                {c.pasos.map((s, i) => (
                  <li key={i} className="flex gap-4 pb-5 last:pb-0">
                    <div className="flex flex-col items-center">
                      <div className="bg-brand-gradient flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                        {i + 1}
                      </div>
                      {i < c.pasos.length - 1 && <div className="mt-1 w-px flex-1 bg-border" />}
                    </div>
                    <div className="flex flex-1 items-start justify-between gap-4 pt-0.5">
                      <div>
                        <div className="font-medium">{s.paso}</div>
                        <div className="text-sm text-muted-foreground">{s.detalle}</div>
                      </div>
                      <div className="whitespace-nowrap pt-0.5 font-mono text-sm font-semibold tabular-nums">
                        {s.valor}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Cada cantidad oficial será explicable paso a paso por el kernel (Rust, decimal exacto, sin
            redondeo intermedio). Valores mostrados: demo ilustrativo.
          </p>
        </div>
      </main>
    </div>
  )
}

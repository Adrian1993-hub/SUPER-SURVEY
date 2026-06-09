import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { getJob, comparacionData } from '../data/demoJobs'
import { CheckCircle2, AlertTriangle, FileText } from 'lucide-react'

export function Comparacion() {
  const { id } = useParams<{ id: string }>()
  const jobId = id || '1'
  const job = getJob(jobId)
  const data = comparacionData[jobId] || comparacionData['1']

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Comparación" activeJob={job} />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {data.fuentes.map((fuente) => (
              <Card key={fuente.nombre}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{fuente.nombre}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-2xl font-bold tabular-nums">
                    {fuente.total.toFixed(2)} <span className="text-lg text-muted-foreground">MT</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Análisis de diferencias</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comparación</TableHead>
                    <TableHead className="text-right">Total A<br /><span className="text-xs font-normal text-muted-foreground">(MT)</span></TableHead>
                    <TableHead className="text-right">Total B<br /><span className="text-xs font-normal text-muted-foreground">(MT)</span></TableHead>
                    <TableHead className="text-right">Δ<br /><span className="text-xs font-normal text-muted-foreground">(MT)</span></TableHead>
                    <TableHead className="text-right">Δ%</TableHead>
                    <TableHead>Dentro de tolerancia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.comparaciones.map((comp) => (
                    <TableRow key={comp.comparacion}>
                      <TableCell className="font-medium">{comp.comparacion}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{comp.totalA.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{comp.totalB.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{comp.delta > 0 ? '+' : ''}{comp.delta.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{comp.deltaPorcentaje > 0 ? '+' : ''}{comp.deltaPorcentaje.toFixed(2)}%</TableCell>
                      <TableCell>
                        {comp.dentroTolerancia ? (
                          <Badge className="gap-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            Dentro de tolerancia
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1.5">
                            <AlertTriangle className="h-3 w-3" />
                            Fuera de tolerancia
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Generar LOP
            </Button>
            <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
              <FileText className="h-4 w-4" />
              Generar NOAD
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

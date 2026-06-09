import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import { Badge } from '../components/ui/badge'
import { Toggle } from '../components/ui/toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip'
import { TopBar } from '../components/TopBar'
import { getJob, medicionData } from '../data/demoJobs'
import { AlertTriangle } from 'lucide-react'

export function Medicion() {
  const { id } = useParams<{ id: string }>()
  const jobId = id || '1'
  const job = getJob(jobId)
  const data = medicionData[jobId] || medicionData['1']
  const [trimAplicado, setTrimAplicado] = useState(true)

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Medición" activeJob={job} />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-[1600px]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Medición por tanque</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Trim:</span>
                  <Toggle
                    pressed={trimAplicado}
                    onPressedChange={setTrimAplicado}
                    className="data-[state=on]:bg-blue-600 data-[state=on]:text-white"
                  >
                    {trimAplicado ? 'Aplicado' : 'No aplicado'}
                  </Toggle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead rowSpan={2} className="border-r">Tanque</TableHead>
                      <TableHead colSpan={5} className="border-r text-center">Apertura</TableHead>
                      <TableHead colSpan={5} className="border-r text-center">Cierre</TableHead>
                      <TableHead rowSpan={2} className="border-r text-right">
                        ROB logbook<br />
                        <span className="text-xs font-normal text-muted-foreground">(m³)</span>
                      </TableHead>
                      <TableHead rowSpan={2} className="text-right">
                        Δ<br />
                        <span className="text-xs font-normal text-muted-foreground">(m³)</span>
                      </TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead className="text-right">Sondaje<br /><span className="text-xs font-normal text-muted-foreground">(m)</span></TableHead>
                      <TableHead className="text-right">T<br /><span className="text-xs font-normal text-muted-foreground">(°C)</span></TableHead>
                      <TableHead className="text-right">Densidad<br /><span className="text-xs font-normal text-muted-foreground">(kg/m³)</span></TableHead>
                      <TableHead className="text-right">Agua libre<br /><span className="text-xs font-normal text-muted-foreground">(m³)</span></TableHead>
                      <TableHead className="border-r text-right">Vol. tabla<br /><span className="text-xs font-normal text-muted-foreground">(m³)</span></TableHead>
                      <TableHead className="text-right">Sondaje<br /><span className="text-xs font-normal text-muted-foreground">(m)</span></TableHead>
                      <TableHead className="text-right">T<br /><span className="text-xs font-normal text-muted-foreground">(°C)</span></TableHead>
                      <TableHead className="text-right">Densidad<br /><span className="text-xs font-normal text-muted-foreground">(kg/m³)</span></TableHead>
                      <TableHead className="text-right">Agua libre<br /><span className="text-xs font-normal text-muted-foreground">(m³)</span></TableHead>
                      <TableHead className="border-r text-right">Vol. tabla<br /><span className="text-xs font-normal text-muted-foreground">(m³)</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.tanques.map((tanque) => (
                      <TableRow key={tanque.tanque}>
                        <TableCell className="border-r font-medium">{tanque.tanque}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{tanque.apertura.sondaje.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{tanque.apertura.temperatura.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{tanque.apertura.densidad.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{tanque.apertura.aguaLibre.toFixed(2)}</TableCell>
                        <TableCell className="border-r text-right font-mono tabular-nums">{tanque.apertura.volTabla.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{tanque.cierre.sondaje.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{tanque.cierre.temperatura.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{tanque.cierre.densidad.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{tanque.cierre.aguaLibre.toFixed(2)}</TableCell>
                        <TableCell className="border-r text-right font-mono tabular-nums">{tanque.cierre.volTabla.toFixed(1)}</TableCell>
                        <TableCell className="border-r text-right font-mono tabular-nums">{tanque.robLogbook.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {tanque.fueraTolerance ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {tanque.delta > 0 ? '+' : ''}
                                  {tanque.delta.toFixed(1)}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>Fuera de tolerancia: Δ excede ±0.5%</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">
                              {tanque.delta > 0 ? '+' : ''}
                              {tanque.delta.toFixed(1)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-slate-50">
                      <TableCell colSpan={2} className="font-medium">TOV</TableCell>
                      <TableCell className="text-right font-mono font-bold tabular-nums">{data.totales.tov.toFixed(1)} m³</TableCell>
                      <TableCell colSpan={2} className="font-medium">GOV</TableCell>
                      <TableCell className="text-right font-mono font-bold tabular-nums">{data.totales.gov.toFixed(1)} m³</TableCell>
                      <TableCell colSpan={2} className="font-medium">GSV</TableCell>
                      <TableCell className="text-right font-mono font-bold tabular-nums">{data.totales.gsv.toFixed(1)} m³</TableCell>
                      <TableCell colSpan={2} className="font-medium">MT (aire)</TableCell>
                      <TableCell className="text-right font-mono font-bold tabular-nums">{data.totales.mtAire.toFixed(1)} MT</TableCell>
                      <TableCell className="font-medium">MT (vacío)</TableCell>
                      <TableCell className="text-right font-mono font-bold tabular-nums">{data.totales.mtVacio.toFixed(1)} MT</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

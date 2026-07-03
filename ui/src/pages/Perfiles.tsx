import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Checkbox } from '../components/ui/checkbox'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { Toggle } from '../components/ui/toggle'
import { TopBar } from '../components/TopBar'
import { JobStepper } from '../components/Stepper'
import { NextStepBar } from '../components/NextStepBar'
import { getJob, profileData } from '../data/demoJobs'

export function Perfiles() {
  const { id } = useParams<{ id: string }>()
  const jobId = id || '1'
  const job = getJob(jobId)
  const p = profileData[jobId] ?? profileData['1']
  const [aggUnrounded, setAggUnrounded] = useState(p.calculo.agregarNoRedondeado)

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Perfiles" activeJob={job} />
      <JobStepper />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          <Tabs defaultValue="buque">
            <TabsList>
              <TabsTrigger value="buque">Buque / Tanques</TabsTrigger>
              <TabsTrigger value="calculo">Cálculo</TabsTrigger>
              <TabsTrigger value="tolerancia">Tolerancia</TabsTrigger>
            </TabsList>

            <TabsContent value="buque">
              <Card>
                <CardHeader>
                  <CardTitle>Tanques del buque</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanque</TableHead>
                        <TableHead className="text-right">Capacidad (m³)</TableHead>
                        <TableHead className="w-[120px] text-center">Es bunker</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.tanques.map((t) => (
                        <TableRow key={t.nombre}>
                          <TableCell className="font-medium">{t.nombre}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{t.capacidad.toFixed(1)}</TableCell>
                          <TableCell className="text-center">
                            <Checkbox defaultChecked={t.esBunker} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Fecha de calibración de la tabla</Label>
                      <Input defaultValue={p.calibracion.fecha} />
                    </div>
                    <div className="space-y-2">
                      <Label>Referencia de la tabla</Label>
                      <Input defaultValue={p.calibracion.ref} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    La app no almacena la tabla de calibración: el surveyor ingresa el volumen y se
                    registra solo la fecha/referencia (trazabilidad).
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calculo">
              <Card>
                <CardHeader>
                  <CardTitle>Perfil de cálculo</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Estándar</Label>
                    <Select defaultValue={p.calculo.estandar}>
                      <option>{p.calculo.estandar}</option>
                      <option>ASTM D1250-19 / API MPMS 11.1</option>
                      <option>ASTM D1250-80 (legado)</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tabla / versión</Label>
                    <Select defaultValue={p.calculo.tabla}>
                      <option>{p.calculo.tabla}</option>
                      <option>Tabla 6B</option>
                      <option>Tabla 54A (crudo)</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Base de densidad</Label>
                    <Input defaultValue={p.calculo.baseDensidad} />
                  </div>
                  <div className="space-y-2">
                    <Label>Agregar desde no redondeado</Label>
                    <div>
                      <Toggle
                        pressed={aggUnrounded}
                        onPressedChange={setAggUnrounded}
                        className="data-[state=on]:bg-brand data-[state=on]:text-brand-foreground"
                      >
                        {aggUnrounded ? 'Activado' : 'Desactivado'}
                      </Toggle>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tolerancia">
              <Card>
                <CardHeader>
                  <CardTitle>Capas de tolerancia</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Capa</TableHead>
                        <TableHead>Base</TableHead>
                        <TableHead className="w-[120px] text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.tolerancia.map((l) => (
                        <TableRow key={l.capa}>
                          <TableCell className="font-medium">{l.capa}</TableCell>
                          <TableCell className="text-muted-foreground">{l.base}</TableCell>
                          <TableCell className="text-right">
                            <Input defaultValue={l.pct.toFixed(2)} className="ml-auto w-20 text-right font-mono" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          <NextStepBar
            to={`/trabajo/${id || '1'}/key-meeting`}
            label="Key Meeting"
            hint="Perfiles del buque, parámetros de cálculo y capas de tolerancia definidos."
          />
        </div>
      </main>
    </div>
  )
}

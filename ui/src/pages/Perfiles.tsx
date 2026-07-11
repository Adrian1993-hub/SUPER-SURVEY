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
import { useT } from '../i18n/LanguageProvider'

export function Perfiles() {
  const { id } = useParams<{ id: string }>()
  const t = useT()
  const jobId = id || '1'
  const job = getJob(jobId)
  const p = profileData[jobId] ?? profileData['1']
  const [aggUnrounded, setAggUnrounded] = useState(p.calculo.agregarNoRedondeado)

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t('perfiles.title')} activeJob={job} />
      <JobStepper />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          <Tabs defaultValue="buque">
            <TabsList>
              <TabsTrigger value="buque">{t('perfiles.tabVessel')}</TabsTrigger>
              <TabsTrigger value="calculo">{t('perfiles.tabCalc')}</TabsTrigger>
              <TabsTrigger value="tolerancia">{t('perfiles.tabTolerance')}</TabsTrigger>
            </TabsList>

            <TabsContent value="buque">
              <Card>
                <CardHeader>
                  <CardTitle>{t('perfiles.vesselTanks')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('flowShared.tank')}</TableHead>
                        <TableHead className="text-right">{t('perfiles.capacity')}</TableHead>
                        <TableHead className="w-[120px] text-center">{t('perfiles.isBunker')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.tanques.map((tk) => (
                        <TableRow key={tk.nombre}>
                          <TableCell className="font-medium">{tk.nombre}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">{tk.capacidad.toFixed(1)}</TableCell>
                          <TableCell className="text-center">
                            <Checkbox defaultChecked={tk.esBunker} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t('perfiles.calibDate')}</Label>
                      <Input defaultValue={p.calibracion.fecha} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('perfiles.tableRef')}</Label>
                      <Input defaultValue={p.calibracion.ref} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('perfiles.calibNote')}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calculo">
              <Card>
                <CardHeader>
                  <CardTitle>{t('perfiles.calcProfile')}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('perfiles.standard')}</Label>
                    <Select defaultValue={p.calculo.estandar}>
                      <option>{p.calculo.estandar}</option>
                      <option>ASTM D1250-19 / API MPMS 11.1</option>
                      <option>{t('perfiles.standardLegacy')}</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('perfiles.tableVersion')}</Label>
                    <Select defaultValue={p.calculo.tabla}>
                      <option>{p.calculo.tabla}</option>
                      <option>{t('perfiles.table6b')}</option>
                      <option>{t('perfiles.table54a')}</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('perfiles.densityBase')}</Label>
                    <Input defaultValue={p.calculo.baseDensidad} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('perfiles.aggUnrounded')}</Label>
                    <div>
                      <Toggle
                        pressed={aggUnrounded}
                        onPressedChange={setAggUnrounded}
                        className="data-[state=on]:bg-brand data-[state=on]:text-brand-foreground"
                      >
                        {aggUnrounded ? t('perfiles.enabled') : t('perfiles.disabled')}
                      </Toggle>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tolerancia">
              <Card>
                <CardHeader>
                  <CardTitle>{t('perfiles.toleranceLayers')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('perfiles.layer')}</TableHead>
                        <TableHead>{t('perfiles.base')}</TableHead>
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
            label={t('perfiles.nextLabel')}
            hint={t('perfiles.nextHint')}
          />
        </div>
      </main>
    </div>
  )
}

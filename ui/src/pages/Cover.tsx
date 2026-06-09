import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select } from '../components/ui/select'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Checkbox } from '../components/ui/checkbox'
import { TopBar } from '../components/TopBar'
import { getJob, jobDetails } from '../data/demoJobs'
import { ArrowRight } from 'lucide-react'

export function Cover() {
  const { id } = useParams<{ id: string }>()
  const jobId = id || '1'
  const job = getJob(jobId)
  const d = jobDetails[jobId] ?? jobDetails['1']
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Cover / Configuración" activeJob={job} />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos del trabajo</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input defaultValue={d.cliente} />
              </div>
              <div className="space-y-2">
                <Label>Tipo de operación</Label>
                <Select defaultValue="BQS">
                  <option value="BQS">BQS — Bunker Quantity Survey</option>
                  <option value="TERMINAL">Terminal (Load / Discharge)</option>
                  <option value="STS">STS (Ship-to-Ship)</option>
                  <option value="DRAFT">Draft Survey</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Buque</Label>
                <Input defaultValue={d.buque} />
              </div>
              <div className="space-y-2">
                <Label>Puerto</Label>
                <Input defaultValue={d.puerto} />
              </div>
              <div className="space-y-2">
                <Label>Fecha NOR</Label>
                <Input defaultValue={d.fechaNor} />
              </div>
              <div className="space-y-2">
                <Label>Grados</Label>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {d.grados.map((g) => (
                    <Badge key={g} className="border border-blue-200 bg-blue-50 text-blue-700">
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Partes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="w-[160px] text-center">Firma documentos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.partes.map((p) => (
                    <TableRow key={p.nombre}>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell>{p.rol}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox defaultChecked={p.firma} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => navigate(`/trabajo/${jobId}/perfiles`)}
              className="gap-2 bg-brand text-brand-foreground hover:brightness-110"
            >
              Guardar y continuar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

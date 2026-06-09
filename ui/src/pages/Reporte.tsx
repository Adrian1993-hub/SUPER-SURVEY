import { useParams } from 'react-router-dom'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Separator } from '../components/ui/separator'
import { Table, TableBody, TableCell, TableRow } from '../components/ui/table'
import { TopBar } from '../components/TopBar'
import { getJob, reportData } from '../data/demoJobs'
import { Ship, FileText, FileSpreadsheet, Braces, PenLine } from 'lucide-react'

export function Reporte() {
  const { id } = useParams<{ id: string }>()
  const jobId = id || '1'
  const job = getJob(jobId)
  const r = reportData[jobId] ?? reportData['1']

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Reporte" activeJob={job} />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <Card className="overflow-hidden">
            {/* Encabezado con marca (white-label) */}
            <div className="flex items-center justify-between border-b bg-slate-50 px-8 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-700">
                  <Ship className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="text-lg font-bold">SuperSurvey</div>
                  <div className="text-xs text-muted-foreground">Empresa Demo · marca configurable</div>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div className="font-mono">{job.numero}</div>
                <div>{job.fecha}</div>
              </div>
            </div>

            <CardContent className="px-8 py-6">
              <h2 className="text-xl font-bold">{r.titulo}</h2>
              <div className="mt-1 text-sm text-muted-foreground">
                {job.buque} · {job.cliente} · {job.puerto}
              </div>

              <Separator className="my-5" />

              <Table>
                <TableBody>
                  {r.cantidades.map((q) => (
                    <TableRow key={q.concepto}>
                      <TableCell className="font-medium">{q.concepto}</TableCell>
                      <TableCell className="text-right font-mono font-semibold tabular-nums">{q.valor}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-5" />

              <div className="grid grid-cols-2 gap-8 pt-4 text-sm">
                <div>
                  <div className="h-10 border-b" />
                  <div className="mt-1 text-muted-foreground">Inspector</div>
                </div>
                <div>
                  <div className="h-10 border-b" />
                  <div className="mt-1 text-muted-foreground">Por el buque / terminal</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              XLSX
            </Button>
            <Button variant="outline" className="gap-2">
              <Braces className="h-4 w-4" />
              JSON técnico
            </Button>
            <Button className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
              <PenLine className="h-4 w-4" />
              Firmar
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

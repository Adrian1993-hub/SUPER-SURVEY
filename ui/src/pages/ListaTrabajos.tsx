import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { EstadoBadge } from '../components/EstadoBadge'
import { TopBar } from '../components/TopBar'
import { jobs } from '../data/demoJobs'
import { Plus, ChevronRight } from 'lucide-react'

export function ListaTrabajos() {
  const navigate = useNavigate()
  const handleRowClick = (jobId: string) => {
    navigate(`/trabajo/${jobId}/cover`)
  }
  return (
    <div className="flex h-full flex-col">
      <TopBar title="Lista de trabajos" />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Lista de trabajos</h1>
            <Button className="bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Nuevo trabajo
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px] text-right font-mono">Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="w-[100px]">Operación</TableHead>
                  <TableHead>Buque</TableHead>
                  <TableHead>Puerto</TableHead>
                  <TableHead className="w-[120px] text-right font-mono">Fecha</TableHead>
                  <TableHead className="w-[140px]">Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="cursor-pointer" onClick={() => handleRowClick(job.id)}>
                    <TableCell className="text-right font-mono tabular-nums">{job.numero}</TableCell>
                    <TableCell className="font-medium">{job.cliente}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{job.operacion}</span>
                        <span className="text-xs text-muted-foreground">Bunker Quantity Survey</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{job.buque}</TableCell>
                    <TableCell>{job.puerto}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{job.fecha}</TableCell>
                    <TableCell>
                      <EstadoBadge estado={job.estado} />
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>
    </div>
  )
}

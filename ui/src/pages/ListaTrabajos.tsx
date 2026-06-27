import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { EstadoBadge } from '../components/EstadoBadge'
import { TopBar } from '../components/TopBar'
import { jobs } from '../data/demoJobs'
import { listStoredJobs, type StoredJob } from '../lib/ipc'
import { Plus, ChevronRight, Database } from 'lucide-react'

export function ListaTrabajos() {
  const navigate = useNavigate()
  const [stored, setStored] = useState<StoredJob[]>([])

  // Stored jobs come from the desktop SQLite store; in the browser demo this is
  // an empty list (persistence requires the packaged app), so nothing changes.
  useEffect(() => {
    listStoredJobs()
      .then(setStored)
      .catch(() => setStored([]))
  }, [])

  const handleRowClick = (jobId: string) => navigate(`/trabajo/${jobId}/cover`)

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Lista de trabajos" />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Lista de trabajos</h1>
            <Button className="bg-brand text-brand-foreground hover:brightness-110">
              <Plus className="h-4 w-4" />
              Nuevo trabajo
            </Button>
          </div>

          {stored.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Database className="h-4 w-4 text-brand" /> Trabajos guardados (almacenamiento local · SQLite)
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right font-mono">Nº / Ref</TableHead>
                      <TableHead className="w-[140px]">Operación</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Puerto</TableHead>
                      <TableHead className="w-[120px] text-right font-mono">Creado</TableHead>
                      <TableHead className="w-[110px] text-right font-mono">Cálculos</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stored.map((j) => (
                      <TableRow key={j.id} className="cursor-pointer" onClick={() => handleRowClick(j.id)}>
                        <TableCell className="text-right font-mono tabular-nums">{j.jobRef}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{j.operationFamily}</span>
                            <span className="text-xs text-muted-foreground">{j.operationType}</span>
                          </div>
                        </TableCell>
                        <TableCell>{j.clientRef ?? '—'}</TableCell>
                        <TableCell>{j.portName ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{j.createdAt.slice(0, 10)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{j.activeLogCount}</TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          <div>
            {stored.length > 0 && <div className="mb-2 text-sm font-semibold text-muted-foreground">Trabajos de ejemplo (demo)</div>}
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
        </div>
      </main>
    </div>
  )
}

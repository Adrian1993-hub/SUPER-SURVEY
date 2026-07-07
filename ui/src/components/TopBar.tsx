import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FlaskConical, KeyRound, WifiOff } from 'lucide-react'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { StatusChip } from './ui/status'
import { ThemeSwitcher } from './ThemeSwitcher'
import { licenseStatus, isDesktop } from '../lib/ipc'
import { jobs, type Job } from '../data/demoJobs'

interface TopBarProps {
  title: string
  activeJob?: Job
}

/** Chip de licencia (gate SUAVE): solo aparece en escritorio cuando la licencia
 *  no es válida — licenciado correctamente = interfaz limpia. */
function LicenseChip() {
  const [status, setStatus] = useState<string | null>(null)
  useEffect(() => {
    if (!isDesktop()) return
    licenseStatus().then((l) => setStatus(l.status)).catch(() => setStatus(null))
  }, [])
  if (!status || status === 'VALID' || status === 'DEMO_WEB') return null
  const label =
    status === 'EXPIRED' ? 'Licencia vencida' : status === 'MISSING' ? 'Modo evaluación' : 'Licencia inválida'
  return (
    <Badge variant="outline" className="status-warn gap-1.5" title={`Estado de licencia: ${status}`}>
      <KeyRound className="h-3 w-3" />
      {label}
    </Badge>
  )
}

/** Chip «Datos demo» (Paradox of the Active User): visible solo cuando la ruta
 *  apunta a uno de los trabajos de EJEMPLO — evita confundir cifras ficticias
 *  con un trabajo real. Los trabajos guardados (UUID) no lo muestran. */
function DemoChip() {
  const { pathname } = useLocation()
  const id = pathname.match(/\/trabajo\/([^/]+)/)?.[1]
  if (!id || !jobs.some((j) => j.id === id)) return null
  return (
    <StatusChip tone="info" title="Este trabajo es un ejemplo con datos ficticios">
      <FlaskConical className="h-3 w-3" /> Datos demo
    </StatusChip>
  )
}

export function TopBar({ title, activeJob }: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b bg-background/80 px-6 backdrop-blur print:hidden">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-medium">{title}</h2>
        <DemoChip />
      </div>

      <div className="flex items-center gap-4">
        {activeJob && (
          <>
            <div className="hidden items-center gap-3 text-sm xl:flex">
              <span className="text-muted-foreground">Nº</span>
              <span className="font-mono font-medium">{activeJob.numero}</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">Buque</span>
              <span className="font-medium">{activeJob.buque}</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">Cliente</span>
              <span className="max-w-[180px] truncate font-medium">{activeJob.cliente}</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}
        <ThemeSwitcher />
        <LicenseChip />
        <Badge variant="outline" className="status-warn gap-1.5">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
      </div>
    </header>
  )
}

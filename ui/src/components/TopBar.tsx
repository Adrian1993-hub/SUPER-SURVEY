import { WifiOff } from 'lucide-react'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import type { Job } from '../data/demoJobs'

interface TopBarProps {
  title: string
  activeJob?: Job
}

export function TopBar({ title, activeJob }: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b bg-background px-6">
      <h2 className="text-lg font-medium">{title}</h2>

      <div className="flex items-center gap-4">
        {activeJob && (
          <>
            <div className="hidden items-center gap-3 text-sm lg:flex">
              <span className="text-muted-foreground">Nº</span>
              <span className="font-mono font-medium">{activeJob.numero}</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">Buque</span>
              <span className="font-medium">{activeJob.buque}</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">Cliente</span>
              <span className="max-w-[200px] truncate font-medium">{activeJob.cliente}</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-muted-foreground">Puerto</span>
              <span className="max-w-[150px] truncate font-medium">{activeJob.puerto}</span>
            </div>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}
        <Badge variant="outline" className="gap-1.5 border-amber-300 bg-amber-50 text-amber-700">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
      </div>
    </header>
  )
}

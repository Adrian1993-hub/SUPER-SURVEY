import { WifiOff } from 'lucide-react'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { ThemeSwitcher } from './ThemeSwitcher'
import type { Job } from '../data/demoJobs'

interface TopBarProps {
  title: string
  activeJob?: Job
}

export function TopBar({ title, activeJob }: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b bg-background/80 px-6 backdrop-blur print:hidden">
      <h2 className="text-lg font-medium">{title}</h2>

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
        <Badge variant="outline" className="gap-1.5 border-amber-400/50 bg-amber-400/10 text-amber-500">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
      </div>
    </header>
  )
}

import { Badge } from './ui/badge'
import type { Job } from '../data/demoJobs'

interface EstadoBadgeProps {
  estado: Job['estado']
}

export function EstadoBadge({ estado }: EstadoBadgeProps) {
  const variants: Record<Job['estado'], { variant: 'default' | 'secondary' | 'outline'; className?: string }> = {
    Borrador: { variant: 'outline', className: 'border-slate-300 text-slate-600' },
    'En progreso': { variant: 'default', className: 'bg-blue-50 text-blue-700 border-blue-200 border' },
    Calculado: { variant: 'default', className: 'bg-amber-50 text-amber-700 border-amber-200 border' },
    Reportado: { variant: 'secondary' },
    Firmado: { variant: 'default', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 border' },
  }
  const config = variants[estado]
  return (
    <Badge variant={config.variant} className={config.className}>
      {estado}
    </Badge>
  )
}

import { StatusChip, type StatusTone } from './ui/status'
import type { Job } from '../data/demoJobs'

interface EstadoBadgeProps {
  estado: Job['estado']
}

// Estados del trabajo → tono semántico (tokens por tema/modo, no paleta fija).
const TONES: Record<Job['estado'], StatusTone> = {
  Borrador: 'neutral',
  'En progreso': 'info',
  Calculado: 'warn',
  Reportado: 'info',
  Firmado: 'ok',
}

export function EstadoBadge({ estado }: EstadoBadgeProps) {
  return <StatusChip tone={TONES[estado]}>{estado}</StatusChip>
}

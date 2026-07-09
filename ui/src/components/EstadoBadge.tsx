import { StatusChip, type StatusTone } from './ui/status'
import type { Job } from '../data/demoJobs'
import { useT } from '../i18n/LanguageProvider'
import type { TKey } from '../i18n/dict'

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

// El valor de `estado` es la clave de datos (en español); la etiqueta visible se
// traduce. Así las comparaciones por estado siguen intactas.
const LABELS: Record<Job['estado'], TKey> = {
  Borrador: 'status.borrador',
  'En progreso': 'status.enProgreso',
  Calculado: 'status.calculado',
  Reportado: 'status.reportado',
  Firmado: 'status.firmado',
}

export function EstadoBadge({ estado }: EstadoBadgeProps) {
  const t = useT()
  return <StatusChip tone={TONES[estado]}>{t(LABELS[estado])}</StatusChip>
}

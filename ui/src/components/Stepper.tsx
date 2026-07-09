import { Link, useLocation } from 'react-router-dom'
import {
  Calculator,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Gauge,
  Scale,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n/LanguageProvider'
import type { TKey } from '@/i18n/dict'

/** El flujo principal de un trabajo, en orden. Única fuente para el stepper y
 *  la numeración de la sidebar — si cambia el flujo, cambia aquí. La etiqueta se
 *  resuelve por i18n (tkey); `label` queda como respaldo en español. */
export const JOB_FLOW: { path: string; label: string; tkey: TKey; icon: LucideIcon }[] = [
  { path: 'cover', label: 'Cover', tkey: 'flow.cover', icon: ClipboardList },
  { path: 'perfiles', label: 'Perfiles', tkey: 'flow.perfiles', icon: SlidersHorizontal },
  { path: 'key-meeting', label: 'Key Meeting', tkey: 'flow.keyMeeting', icon: Users },
  { path: 'medicion', label: 'Medición', tkey: 'flow.medicion', icon: Gauge },
  { path: 'calculo', label: 'Cálculo', tkey: 'flow.calculo', icon: Calculator },
  { path: 'comparacion', label: 'Comparación', tkey: 'flow.comparacion', icon: Scale },
  { path: 'reporte', label: 'Reporte', tkey: 'flow.reporte', icon: FileCheck2 },
]

/** Stepper compacto del trabajo: se renderiza bajo el TopBar en las 7 etapas del
 *  flujo principal. Deriva hecho/activo del ORDEN DE RUTA (sin máquina de
 *  estados): los pasos anteriores al actual se muestran como completados. */
export function JobStepper() {
  const location = useLocation()
  const t = useT()
  const m = location.pathname.match(/\/trabajo\/([^/]+)\/([^/]+)/)
  if (!m) return null
  const [, jobId, stage] = m
  const current = JOB_FLOW.findIndex((s) => s.path === stage)
  if (current < 0) return null

  return (
    <nav
      aria-label={t('stepper.aria')}
      className="flex shrink-0 items-center gap-1 overflow-x-auto border-b bg-background/60 px-6 py-2 print:hidden"
    >
      {JOB_FLOW.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo'
        return (
          <div key={s.path} className="flex items-center gap-1">
            {i > 0 && <span className="h-px w-3 shrink-0 bg-border" aria-hidden />}
            <Link
              to={`/trabajo/${jobId}/${s.path}`}
              aria-current={state === 'active' ? 'step' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                state === 'active' && 'border-brand bg-brand/10 text-brand',
                state === 'done' && 'status-ok',
                state === 'todo' && 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="flex h-4 w-4 items-center justify-center">
                {state === 'done' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
              </span>
              <span className="hidden sm:inline">
                {i + 1}. {s.label}
              </span>
              <span className="sm:hidden">{i + 1}</span>
            </Link>
          </div>
        )
      })}
    </nav>
  )
}

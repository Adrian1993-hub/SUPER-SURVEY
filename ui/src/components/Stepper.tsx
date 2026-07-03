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

/** El flujo principal de un trabajo, en orden. Única fuente para el stepper y
 *  la numeración de la sidebar — si cambia el flujo, cambia aquí. */
export const JOB_FLOW: { path: string; label: string; icon: LucideIcon }[] = [
  { path: 'cover', label: 'Cover', icon: ClipboardList },
  { path: 'perfiles', label: 'Perfiles', icon: SlidersHorizontal },
  { path: 'key-meeting', label: 'Key Meeting', icon: Users },
  { path: 'medicion', label: 'Medición', icon: Gauge },
  { path: 'calculo', label: 'Cálculo', icon: Calculator },
  { path: 'comparacion', label: 'Comparación', icon: Scale },
  { path: 'reporte', label: 'Reporte', icon: FileCheck2 },
]

/** Stepper compacto del trabajo: se renderiza bajo el TopBar en las 7 etapas del
 *  flujo principal. Deriva hecho/activo del ORDEN DE RUTA (sin máquina de
 *  estados): los pasos anteriores al actual se muestran como completados. */
export function JobStepper() {
  const location = useLocation()
  const m = location.pathname.match(/\/trabajo\/([^/]+)\/([^/]+)/)
  if (!m) return null
  const [, jobId, stage] = m
  const current = JOB_FLOW.findIndex((s) => s.path === stage)
  if (current < 0) return null

  return (
    <nav
      aria-label="Progreso del trabajo"
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

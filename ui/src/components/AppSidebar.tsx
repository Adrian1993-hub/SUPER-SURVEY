import { NavLink, useLocation } from 'react-router-dom'
import {
  Ship,
  LayoutDashboard,
  FileText,
  ClipboardList,
  SlidersHorizontal,
  Users,
  Gauge,
  Calculator,
  Scale,
  FileCheck2,
  Fuel,
  FlaskConical,
  Layers,
  FileStack,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const itemBase = 'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors'
const itemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    itemBase,
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
  )

export function AppSidebar() {
  const location = useLocation()
  const match = location.pathname.match(/\/trabajo\/([^/]+)/)
  const jobId = match?.[1] ?? '1'

  const etapas = [
    { to: `/trabajo/${jobId}/cover`, label: 'Cover', icon: ClipboardList },
    { to: `/trabajo/${jobId}/perfiles`, label: 'Perfiles', icon: SlidersHorizontal },
    { to: `/trabajo/${jobId}/key-meeting`, label: 'Key Meeting', icon: Users },
    { to: `/trabajo/${jobId}/medicion`, label: 'Medición', icon: Gauge },
    { to: `/trabajo/${jobId}/multigrado`, label: 'Multigrado (imp.)', icon: Layers },
    { to: `/trabajo/${jobId}/calculo`, label: 'Cálculo + Trace', icon: Calculator },
    { to: `/trabajo/${jobId}/comparacion`, label: 'Comparación', icon: Scale },
    { to: `/trabajo/${jobId}/reporte`, label: 'Reporte', icon: FileCheck2 },
    { to: `/trabajo/${jobId}/reporte/off-hire`, label: 'Plantillas', icon: FileStack },
    { to: `/trabajo/${jobId}/rob`, label: 'Reporte ROB', icon: Fuel },
  ]

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar print:hidden">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-4">
        <div className="bg-brand-gradient flex h-9 w-9 items-center justify-center rounded-lg shadow-lg">
          <Ship className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-sidebar-foreground">SuperSurvey</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-1 px-3 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/50">
          General
        </div>
        <div className="flex flex-col gap-0.5">
          <NavLink to="/" end className={itemClass}>
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/trabajos" className={itemClass}>
            <FileText className="h-4 w-4" />
            <span>Trabajos</span>
          </NavLink>
          <NavLink to="/utilidades" className={itemClass}>
            <FlaskConical className="h-4 w-4" />
            <span>Utilidades</span>
          </NavLink>
        </div>

        <div className="mb-1 mt-5 px-3 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/50">
          Trabajo activo
        </div>
        <div className="flex flex-col gap-0.5">
          {etapas.map((e) => (
            <NavLink key={e.to} to={e.to} className={itemClass}>
              <e.icon className="h-4 w-4" />
              <span>{e.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="border-t border-sidebar-border px-6 py-3 text-xs text-sidebar-foreground/50">
        v0.1.0 · Demo (white-label)
      </div>
    </aside>
  )
}

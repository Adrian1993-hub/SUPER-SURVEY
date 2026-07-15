import { NavLink, useLocation } from 'react-router-dom'
import {
  Ship,
  LayoutDashboard,
  FileText,
  FlaskConical,
  Fuel,
  Layers,
  FileStack,
  Anchor,
  Factory,
  Droplets,
  Beaker,
  Flame,
  Bot,
  Palette,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { JOB_FLOW } from './Stepper'
import { useT } from '@/i18n/LanguageProvider'
import type { TKey } from '@/i18n/dict'

const itemBase = 'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors'
const itemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    itemBase,
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
  )

function GroupLabel({ children }: { children: string }) {
  return (
    <div className="mb-1 mt-5 px-3 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/50 first:mt-0">
      {children}
    </div>
  )
}

export function AppSidebar() {
  const location = useLocation()
  const t = useT()
  const match = location.pathname.match(/\/trabajo\/([^/]+)/)
  const jobId = match?.[1] ?? '1'

  // Operaciones específicas (fuera del flujo principal numerado).
  const operaciones: { to: string; tkey: TKey; icon: typeof Layers }[] = [
    { to: `/trabajo/${jobId}/multigrado`, tkey: 'op.multigrade', icon: Layers },
    { to: `/trabajo/${jobId}/draft`, tkey: 'op.draft', icon: Anchor },
    { to: `/trabajo/${jobId}/ship-shore`, tkey: 'op.shipShore', icon: Factory },
    { to: `/trabajo/${jobId}/lpg`, tkey: 'op.lpg', icon: Droplets },
    { to: `/trabajo/${jobId}/lng-descarga`, tkey: 'op.lngDischarge', icon: Flame },
    { to: `/trabajo/${jobId}/blend`, tkey: 'op.blend', icon: Beaker },
    { to: `/trabajo/${jobId}/rob`, tkey: 'op.rob', icon: Fuel },
    { to: `/trabajo/${jobId}/reporte/off-hire`, tkey: 'op.templates', icon: FileStack },
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
        <GroupLabel>{t('nav.general')}</GroupLabel>
        <div className="flex flex-col gap-0.5">
          <NavLink to="/" end className={itemClass}>
            <LayoutDashboard className="h-4 w-4" />
            <span>{t('nav.dashboard')}</span>
          </NavLink>
          <NavLink to="/trabajos" className={itemClass}>
            <FileText className="h-4 w-4" />
            <span>{t('nav.jobs')}</span>
          </NavLink>
          <NavLink to="/utilidades" className={itemClass}>
            <FlaskConical className="h-4 w-4" />
            <span>{t('nav.tools')}</span>
          </NavLink>
          <NavLink to="/asistente" className={itemClass}>
            <Bot className="h-4 w-4" />
            <span>{t('nav.assistant')}</span>
          </NavLink>
          <NavLink to="/configuracion" className={itemClass}>
            <Settings className="h-4 w-4" />
            <span>{t('nav.settings')}</span>
          </NavLink>
          <NavLink to="/design" className={itemClass}>
            <Palette className="h-4 w-4" />
            <span>{t('nav.designGuide')}</span>
          </NavLink>
        </div>

        {/* Flujo principal numerado — mismo orden que el JobStepper (JOB_FLOW). */}
        <GroupLabel>{t('nav.jobFlow')}</GroupLabel>
        <div className="flex flex-col gap-0.5">
          {JOB_FLOW.map((e, i) => (
            <NavLink key={e.path} to={`/trabajo/${jobId}/${e.path}`} className={itemClass}>
              <e.icon className="h-4 w-4" />
              <span>
                <span className="mr-1.5 font-mono text-[11px] text-sidebar-foreground/50">{i + 1}.</span>
                {t(e.tkey)}
              </span>
            </NavLink>
          ))}
        </div>

        <GroupLabel>{t('nav.specificOps')}</GroupLabel>
        <div className="flex flex-col gap-0.5">
          {operaciones.map((e) => (
            <NavLink key={e.to} to={e.to} className={itemClass}>
              <e.icon className="h-4 w-4" />
              <span>{t(e.tkey)}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="border-t border-sidebar-border px-6 py-3 text-xs text-sidebar-foreground/50">
        v0.1.1 · {t('sidebar.footerDemo')}
      </div>
    </aside>
  )
}

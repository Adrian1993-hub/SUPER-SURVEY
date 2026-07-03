import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** Estado vacío estándar: icono + mensaje + acción sugerida. */
export function EmptyState({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon: LucideIcon
  title: string
  desc?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/50" />
      <p className="text-sm font-medium">{title}</p>
      {desc && <p className="max-w-sm text-xs text-muted-foreground">{desc}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

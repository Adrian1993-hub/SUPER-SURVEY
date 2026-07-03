import * as React from 'react'
import { cn } from '@/lib/utils'

/** Tono semántico del dominio: OK / atención (NOAD) / fuera de tolerancia (LOP)
 *  / informativo / neutro. Los colores salen de los tokens --success/--warning/
 *  --danger/--brand, correctos en claro, oscuro e impresión. */
export type StatusTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral'

export const statusToneClass: Record<StatusTone, string> = {
  ok: 'status-ok',
  warn: 'status-warn',
  bad: 'status-bad',
  info: 'status-info',
  neutral: 'status-neutral',
}

export interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone
}

/** Chip de estado compacto (pill) para veredictos y estados de trabajo. */
export function StatusChip({ tone, className, children, ...props }: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
        statusToneClass[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

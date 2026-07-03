import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from './ui/button'
import { cn } from '@/lib/utils'

/** Barra «siguiente paso» al pie de cada etapa del flujo: el usuario nunca tiene
 *  que volver a la sidebar para saber qué sigue. */
export function NextStepBar({
  to,
  label,
  hint,
}: {
  to: string
  label: string
  hint?: string
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4 print:hidden">
      <p className="text-xs text-muted-foreground">{hint ?? ''}</p>
      <Link to={to} className={cn(buttonVariants(), 'gap-2')} aria-label={`Continuar a ${label}`}>
        Continuar → {label} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

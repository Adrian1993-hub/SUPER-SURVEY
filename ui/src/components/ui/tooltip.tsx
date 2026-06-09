import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Lightweight CSS-only tooltip (no radix). Pattern:
 *   <Tooltip><TooltipTrigger>…</TooltipTrigger><TooltipContent>…</TooltipContent></Tooltip>
 * Content shows on hover/focus of the wrapping Tooltip.
 */
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function Tooltip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('group relative inline-flex', className)}>{children}</span>
}

export const TooltipTrigger = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span ref={ref} tabIndex={0} className={cn('inline-flex outline-none', className)} {...props} />
))
TooltipTrigger.displayName = 'TooltipTrigger'

export function TooltipContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      role="tooltip"
      className={cn(
        'pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
        className,
      )}
    >
      {children}
    </span>
  )
}

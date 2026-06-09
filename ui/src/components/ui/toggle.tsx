import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  pressed?: boolean
  onPressedChange?: (pressed: boolean) => void
}

/** Minimal toggle. Exposes data-state="on|off" so callers can style via data-[state=on]:* */
export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, pressed = false, onPressedChange, onClick, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={pressed}
      data-state={pressed ? 'on' : 'off'}
      onClick={(e) => {
        onPressedChange?.(!pressed)
        onClick?.(e)
      }}
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    />
  ),
)
Toggle.displayName = 'Toggle'

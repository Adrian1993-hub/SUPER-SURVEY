import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function FillBar({ pct, gradient = false, className }: { pct: number; gradient?: boolean; className?: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className={cn('h-full rounded-full', gradient ? 'bg-brand-gradient' : 'bg-brand')}
        style={{
          width: mounted ? `${Math.min(100, Math.max(0, pct))}%` : '0%',
          transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
    </div>
  )
}

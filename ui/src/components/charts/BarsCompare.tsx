import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface Item {
  label: string
  value: number
  highlight?: boolean
}

export function BarsCompare({ items, unit = 'MT' }: { items: Item[]; unit?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="space-y-4">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{it.label}</span>
            <span className="font-mono font-medium tabular-nums">
              {it.value.toFixed(2)} {unit}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full rounded-full', it.highlight ? 'bg-brand-gradient' : 'bg-brand')}
              style={{
                width: mounted ? `${(it.value / max) * 100}%` : '0%',
                transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

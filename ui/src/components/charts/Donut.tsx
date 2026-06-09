import { useEffect, useState } from 'react'

interface Props {
  /** Fracción 0..1 */
  value: number
  size?: number
  stroke?: number
  label?: string
  sublabel?: string
  color?: string
}

export function Donut({ value, size = 132, stroke = 12, label, sublabel, color = 'var(--brand)' }: Props) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [offset, setOffset] = useState(c)

  useEffect(() => {
    const clamped = Math.min(1, Math.max(0, value))
    const id = requestAnimationFrame(() => setOffset(c * (1 - clamped)))
    return () => cancelAnimationFrame(id)
  }, [c, value])

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        {label && <span className="text-2xl font-bold tabular-nums">{label}</span>}
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  )
}

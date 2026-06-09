import { THEMES, useTheme } from '../theme/ThemeProvider'
import { cn } from '@/lib/utils'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTheme(t.id)}
          title={t.label}
          aria-pressed={theme === t.id}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
            theme === t.id
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span
            className="h-3 w-3 rounded-full ring-1 ring-black/20"
            style={{ backgroundImage: t.swatch }}
          />
          <span className="hidden md:inline">{t.label}</span>
        </button>
      ))}
    </div>
  )
}

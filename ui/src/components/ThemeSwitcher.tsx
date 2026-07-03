import { Moon, Sun } from 'lucide-react'
import { THEMES, useTheme } from '../theme/ThemeProvider'
import { cn } from '@/lib/utils'

export function ThemeSwitcher() {
  const { theme, mode, setTheme, setMode } = useTheme()
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
      <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
      <button
        type="button"
        onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
        title={mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        aria-pressed={mode === 'light'}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        {mode === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

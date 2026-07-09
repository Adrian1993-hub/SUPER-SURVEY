import { Moon, Sun } from 'lucide-react'
import { THEMES, useTheme } from '../theme/ThemeProvider'
import { cn } from '@/lib/utils'
import { useT } from '@/i18n/LanguageProvider'

export function ThemeSwitcher() {
  const { theme, mode, setTheme, setMode } = useTheme()
  const t = useT()
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
      {THEMES.map((sw) => (
        <button
          key={sw.id}
          type="button"
          onClick={() => setTheme(sw.id)}
          title={t(`theme.${sw.id}.label`)}
          aria-pressed={theme === sw.id}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
            theme === sw.id
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <span
            className="h-3 w-3 rounded-full ring-1 ring-black/20"
            style={{ backgroundImage: sw.swatch }}
          />
          <span className="hidden md:inline">{t(`theme.${sw.id}.label`)}</span>
        </button>
      ))}
      <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
      <button
        type="button"
        onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
        title={mode === 'dark' ? t('settings.toLight') : t('settings.toDark')}
        aria-pressed={mode === 'light'}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        {mode === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

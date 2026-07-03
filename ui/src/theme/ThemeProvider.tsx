import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeId = 'ocean' | 'control-room' | 'industrial'
export type ModeId = 'light' | 'dark'

export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'ocean', label: 'Océano', swatch: 'linear-gradient(135deg,#2563eb,#14b8a6)' },
  { id: 'control-room', label: 'Control-room', swatch: 'linear-gradient(135deg,#0b2740,#22d3ee)' },
  { id: 'industrial', label: 'Industrial', swatch: 'linear-gradient(135deg,#0b2233,#3b7a8c)' },
]

const THEME_KEY = 'ss-theme'
const MODE_KEY = 'ss-mode'

interface ThemeCtxValue {
  theme: ThemeId
  mode: ModeId
  setTheme: (t: ThemeId) => void
  setMode: (m: ModeId) => void
}
const ThemeCtx = createContext<ThemeCtxValue | null>(null)

// El bootstrap de index.html ya fijó ambos atributos antes de pintar (con la
// migración de instalaciones previas: ocean→light, resto→dark); aquí solo se leen.
function readInitialTheme(): ThemeId {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme') as ThemeId | null
    if (attr === 'ocean' || attr === 'control-room' || attr === 'industrial') return attr
  }
  return 'control-room'
}

function readInitialMode(): ModeId {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-mode')
    if (attr === 'light' || attr === 'dark') return attr
  }
  return 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(readInitialTheme)
  const [mode, setMode] = useState<ModeId>(readInitialMode)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-mode', mode)
    try {
      localStorage.setItem(THEME_KEY, theme)
      localStorage.setItem(MODE_KEY, mode)
    } catch {
      /* ignore */
    }
  }, [theme, mode])

  return <ThemeCtx.Provider value={{ theme, mode, setTheme, setMode }}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}

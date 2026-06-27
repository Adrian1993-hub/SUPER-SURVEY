import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeId = 'ocean' | 'control-room' | 'industrial'

export const THEMES: { id: ThemeId; label: string; swatch: string }[] = [
  { id: 'ocean', label: 'Océano', swatch: 'linear-gradient(135deg,#2563eb,#14b8a6)' },
  { id: 'control-room', label: 'Control-room', swatch: 'linear-gradient(135deg,#0b2740,#22d3ee)' },
  { id: 'industrial', label: 'Industrial', swatch: 'linear-gradient(135deg,#0b2233,#3b7a8c)' },
]

const STORAGE_KEY = 'ss-theme'

interface ThemeCtxValue {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
}
const ThemeCtx = createContext<ThemeCtxValue | null>(null)

function readInitial(): ThemeId {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme') as ThemeId | null
    if (attr === 'ocean' || attr === 'control-room' || attr === 'industrial') return attr
  }
  return 'control-room'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(readInitial)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}

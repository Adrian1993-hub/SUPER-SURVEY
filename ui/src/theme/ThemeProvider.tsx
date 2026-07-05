import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemeId = 'ocean' | 'control-room' | 'industrial'
export type ModeId = 'light' | 'dark'
export type FontId = 'geist' | 'system'
export type DensityId = 'comfortable' | 'compact'

export const THEMES: { id: ThemeId; label: string; swatch: string; desc: string }[] = [
  { id: 'ocean', label: 'Océano', swatch: 'linear-gradient(135deg,#2563eb,#14b8a6)', desc: 'Azul→teal, aire y claridad.' },
  { id: 'control-room', label: 'Control-room', swatch: 'linear-gradient(135deg,#0b2740,#22d3ee)', desc: 'Navy + cian, sala de control.' },
  { id: 'industrial', label: 'Industrial', swatch: 'linear-gradient(135deg,#0b2233,#3b7a8c)', desc: 'Acero sobrio, esquinas marcadas.' },
]

export const FONTS: { id: FontId; label: string; desc: string }[] = [
  { id: 'geist', label: 'Geist', desc: 'Fuente del producto (incluida, offline).' },
  { id: 'system', label: 'Sistema', desc: 'La fuente nativa del sistema operativo.' },
]

export const DENSITIES: { id: DensityId; label: string; desc: string }[] = [
  { id: 'comfortable', label: 'Cómoda', desc: 'Espaciado estándar.' },
  { id: 'compact', label: 'Compacta', desc: 'Tablas y celdas más densas.' },
]

const K = { theme: 'ss-theme', mode: 'ss-mode', font: 'ss-font', density: 'ss-density' }

interface ThemeCtxValue {
  theme: ThemeId
  mode: ModeId
  font: FontId
  density: DensityId
  setTheme: (t: ThemeId) => void
  setMode: (m: ModeId) => void
  setFont: (f: FontId) => void
  setDensity: (d: DensityId) => void
}
const ThemeCtx = createContext<ThemeCtxValue | null>(null)

// El bootstrap de index.html ya fijó los data-attributes antes de pintar (con la
// migración de instalaciones previas); aquí solo se leen del DOM.
function attr<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  if (typeof document !== 'undefined') {
    const v = document.documentElement.getAttribute(name)
    if (v && (allowed as readonly string[]).includes(v)) return v as T
  }
  return fallback
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>(() => attr('data-theme', ['ocean', 'control-room', 'industrial'] as const, 'control-room'))
  const [mode, setMode] = useState<ModeId>(() => attr('data-mode', ['light', 'dark'] as const, 'dark'))
  const [font, setFont] = useState<FontId>(() => attr('data-font', ['geist', 'system'] as const, 'geist'))
  const [density, setDensity] = useState<DensityId>(() => attr('data-density', ['comfortable', 'compact'] as const, 'comfortable'))

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.setAttribute('data-mode', mode)
    root.setAttribute('data-font', font)
    root.setAttribute('data-density', density)
    try {
      localStorage.setItem(K.theme, theme)
      localStorage.setItem(K.mode, mode)
      localStorage.setItem(K.font, font)
      localStorage.setItem(K.density, density)
    } catch {
      /* ignore */
    }
  }, [theme, mode, font, density])

  return (
    <ThemeCtx.Provider value={{ theme, mode, font, density, setTheme, setMode, setFont, setDensity }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}

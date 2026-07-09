import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { dict, type Lang, type TKey } from './dict'

// i18n casero, offline-first y sin dependencias: un provider con el idioma
// activo (persistido en localStorage 'ss-lang'), un diccionario co-localizado
// (dict.ts) y una función t(clave, vars?). Ligero a propósito — la app es
// offline y no queremos arrastrar una librería de i18n con carga dinámica de
// catálogos ni pesos extra.

const KEY = 'ss-lang'

export const LANGS: Lang[] = ['es', 'en']
// Endónimos: cada idioma se muestra en su propia lengua (convención estándar).
export const LANG_LABELS: Record<Lang, string> = { es: 'Español', en: 'English' }

/** Idioma efectivo leído de localStorage (o del navegador). Sirve tanto para el
 *  estado inicial del provider como para consumidores fuera de React (p. ej. la
 *  barrera de errores, que es una clase y no puede usar hooks). */
export function currentLang(): Lang {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'es' || stored === 'en') return stored
    const nav = typeof navigator !== 'undefined' ? navigator.language?.toLowerCase() : ''
    if (nav && nav.startsWith('en')) return 'en'
  } catch {
    /* ignore */
  }
  return 'es'
}

type Vars = Record<string, string | number>

/** Sustituye {clave} por su valor; deja intactos los marcadores sin variable. */
function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`))
}

interface LangCtxValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TKey, vars?: Vars) => string
}
const LangCtx = createContext<LangCtxValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(currentLang)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, lang)
    } catch {
      /* ignore */
    }
    if (typeof document !== 'undefined') document.documentElement.setAttribute('lang', lang)
  }, [lang])

  const t = useCallback(
    (key: TKey, vars?: Vars) => {
      const entry = dict[key]
      const s = entry ? (entry[lang] ?? entry.es) : (key as string)
      return interpolate(s, vars)
    },
    [lang],
  )

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>
}

export function useI18n() {
  const ctx = useContext(LangCtx)
  if (!ctx) throw new Error('useI18n must be used within <LanguageProvider>')
  return ctx
}

/** Atajo para el caso común: `const t = useT()`. */
export function useT() {
  return useI18n().t
}

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { dict } from '../i18n/dict'
import { currentLang } from '../i18n/LanguageProvider'

// Barrera de errores raíz: un throw en render ya NO deja la pantalla en blanco
// (el peor mensaje posible para un inspector a bordo). Muestra un aviso claro
// con el detalle técnico plegado y un botón de recarga. Los datos están a
// salvo: la medición en curso se autoguarda localmente y lo oficial vive en
// SQLite (append-only).

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SuperSurvey] error de interfaz no capturado:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    // Clase → sin hooks: se lee el idioma directo de localStorage y se toman las
    // cadenas del diccionario (sin depender del contexto, que podría ser parte
    // del fallo que estamos capturando).
    const lang = currentLang()
    const s = (k: 'error.title' | 'error.body' | 'error.techDetail' | 'error.reload') => dict[k][lang]
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-6 text-foreground">
        <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-bold">{s('error.title')}</h1>
          <p className="text-sm text-muted-foreground">{s('error.body')}</p>
          <details className="rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium">{s('error.techDetail')}</summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono">
              {String(this.state.error?.stack ?? this.state.error)}
            </pre>
          </details>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {s('error.reload')}
          </button>
        </div>
      </div>
    )
  }
}

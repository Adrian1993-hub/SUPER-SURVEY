import { Loader2 } from 'lucide-react'
import { useT } from '../i18n/LanguageProvider'

/** Fallback de Suspense mientras se descarga el chunk de una página (code-split
 *  por ruta). Deliberadamente mínimo: no importa nada de las páginas, así que su
 *  propio peso es despreciable y el shell (sidebar) ya está visible alrededor. */
export function PageFallback() {
  const t = useT()
  return (
    <div className="flex flex-1 items-center justify-center p-10 text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      <span className="text-sm">{t('common.loading')}</span>
    </div>
  )
}

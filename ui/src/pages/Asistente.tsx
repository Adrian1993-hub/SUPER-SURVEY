import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { StatusChip } from '../components/ui/status'
import { TopBar } from '../components/TopBar'
import { AiDecisionCard } from '../components/AiSetupDialog'
import { isDesktop, aiStatus, aiChat, aiPullModel, type AiMessage } from '../lib/ipc'
import { getAiPref, setAiPref, AI_DEFAULT_MODEL } from '../lib/aiPrefs'
import { useT } from '../i18n/LanguageProvider'
import { Bot, Send, RefreshCw, Download, ShieldAlert, Monitor } from 'lucide-react'

// Asistente IA local (F8.1 PoC): chat contra el sidecar Ollama vía comandos
// Rust. Consultivo por doctrina — el guardarraíl vive en el system prompt del
// backend; aquí además se muestra el disclaimer permanente. Todo offline.

export function Asistente() {
  const t = useT()
  const desktop = isDesktop()
  const [pref, setPref] = useState(getAiPref())
  const [running, setRunning] = useState<boolean | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState('')
  const [pulling, setPulling] = useState(false)
  const [msgs, setMsgs] = useState<AiMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  async function refresh() {
    setError('')
    const s = await aiStatus()
    setRunning(s.running)
    setModels(s.models)
    if (s.models.length && !s.models.includes(model)) setModel(s.models[0])
  }

  useEffect(() => {
    if (desktop && pref === 'on') void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop, pref])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, busy])

  async function pull() {
    setPulling(true)
    setError('')
    try {
      await aiPullModel(AI_DEFAULT_MODEL)
      await refresh()
    } catch (e) {
      setError((e as Error).message ?? String(e))
    } finally {
      setPulling(false)
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || busy || !model) return
    setError('')
    const next: AiMessage[] = [...msgs, { role: 'user', content: text }]
    setMsgs(next)
    setInput('')
    setBusy(true)
    try {
      const reply = await aiChat(model, next)
      setMsgs((m) => [...m, { role: 'assistant', content: reply }])
    } catch (e) {
      setError((e as Error).message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t('ai.title')} />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto flex h-full max-w-3xl flex-col gap-4">
          {/* Disclaimer permanente (doctrina) */}
          <p className="status-warn flex items-start gap-2 rounded-md border p-2.5 text-xs">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {t('ai.disclaimer')}
          </p>

          {!desktop ? (
            <Card>
              <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                <Monitor className="h-5 w-5 shrink-0 text-brand" /> {t('ai.desktopOnly')}
              </CardContent>
            </Card>
          ) : pref !== 'on' ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bot className="h-4 w-4 text-brand" /> {pref === 'off' ? t('ai.disabledTitle') : t('ai.setupTitle')}
                </CardTitle>
                {pref === 'off' && <p className="text-xs text-muted-foreground">{t('ai.disabledBody')}</p>}
              </CardHeader>
              <CardContent>
                <AiDecisionCard onDecided={(v) => setPref(v)} />
              </CardContent>
            </Card>
          ) : running === false ? (
            <Card>
              <CardContent className="space-y-3 p-6">
                <p className="text-sm text-muted-foreground">{t('ai.ollamaMissing')}</p>
                <Button variant="outline" className="gap-2" onClick={() => void refresh()}>
                  <RefreshCw className="h-4 w-4" /> {t('ai.recheck')}
                </Button>
              </CardContent>
            </Card>
          ) : running && models.length === 0 ? (
            <Card>
              <CardContent className="space-y-3 p-6">
                <p className="text-sm text-muted-foreground">{t('ai.noModels')}</p>
                <Button onClick={() => void pull()} disabled={pulling} className="gap-2">
                  <Download className={`h-4 w-4 ${pulling ? 'animate-pulse' : ''}`} />
                  {pulling ? t('ai.pulling') : t('ai.pullModel', { model: AI_DEFAULT_MODEL })}
                </Button>
                {error && <p className="text-xs text-danger">{t('ai.error', { msg: error })}</p>}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Barra de estado del runtime */}
              <div className="flex flex-wrap items-center gap-3">
                <StatusChip tone="ok">{t('ai.ollamaOn')}</StatusChip>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {t('ai.model')}
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="rounded-md border border-input bg-transparent px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {models.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() => { setAiPref('off'); setPref('off') }}
                  className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  {t('ai.disable')}
                </button>
              </div>

              {/* Conversación */}
              <Card className="flex min-h-[340px] flex-1 flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                  {msgs.map((m, i) => (
                    <div
                      key={i}
                      className={`max-w-[85%] whitespace-pre-wrap rounded-lg border px-3 py-2 text-sm leading-relaxed ${
                        m.role === 'user' ? 'self-end border-brand/30 bg-brand/10' : 'self-start bg-muted/40'
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                  {busy && <div className="self-start text-xs text-muted-foreground">{t('ai.thinking')}</div>}
                  {error && <p className="text-xs text-danger">{t('ai.error', { msg: error })}</p>}
                  <div ref={endRef} />
                </CardContent>
              </Card>

              {/* Entrada */}
              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void send()
                    }
                  }}
                  placeholder={t('ai.inputPlaceholder')}
                  className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button onClick={() => void send()} disabled={busy || !input.trim()} className="gap-2">
                  <Send className="h-4 w-4" /> {t('ai.send')}
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

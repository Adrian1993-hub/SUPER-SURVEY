import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { isDesktop, aiSystemCheck, type AiSystemCheck } from '../lib/ipc'
import { getAiPref, setAiPref, aiVerdict, fmtGb, type AiVerdict } from '../lib/aiPrefs'
import { useT } from '../i18n/LanguageProvider'
import { Bot, Cpu, HardDrive, MemoryStick, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

// Primer arranque (solo escritorio): pregunta si activar la IA local, con la
// ADVERTENCIA de consumo de memoria y el ANALIZADOR del equipo (RAM/CPU/disco
// medidos). EL USUARIO DECIDE; la decisión queda por equipo (ss-ai) y se puede
// cambiar en Configuración. El modelo jamás se descarga sin este consentimiento.

function VerdictBanner({ v }: { v: AiVerdict }) {
  const t = useT()
  if (v === 'ok')
    return (
      <p className="status-ok flex items-start gap-2 rounded-md border p-2.5 text-sm">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {t('ai.verdictOk')}
      </p>
    )
  if (v === 'tight')
    return (
      <p className="status-warn flex items-start gap-2 rounded-md border p-2.5 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {t('ai.verdictTight')}
      </p>
    )
  return (
    <p className="status-bad flex items-start gap-2 rounded-md border p-2.5 text-sm">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {t('ai.verdictNo')}
    </p>
  )
}

/** Tarjeta reutilizable: analizador + advertencia + decisión. */
export function AiDecisionCard({ onDecided }: { onDecided?: (v: 'on' | 'off') => void }) {
  const t = useT()
  const navigate = useNavigate()
  const [check, setCheck] = useState<AiSystemCheck | null>(null)

  useEffect(() => {
    aiSystemCheck().then(setCheck).catch(() => setCheck(null))
  }, [])

  const v = check ? aiVerdict(check) : null

  const decide = (val: 'on' | 'off') => {
    setAiPref(val)
    onDecided?.(val)
    if (val === 'on') navigate('/asistente')
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('ai.setupIntro')}</p>

      <p className="status-warn flex items-start gap-2 rounded-md border p-2.5 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {t('ai.memWarning')}
      </p>

      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('ai.analyzer')}</div>
        {check ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat icon={MemoryStick} k={t('ai.ramTotal')} v={fmtGb(check.totalMemMb)} />
              <Stat icon={MemoryStick} k={t('ai.ramAvail')} v={fmtGb(check.availableMemMb)} />
              <Stat icon={Cpu} k={t('ai.cores')} v={String(check.cpuCores)} />
              <Stat icon={HardDrive} k={t('ai.diskFree')} v={fmtGb(check.diskFreeMb)} />
            </div>
            <div className="mt-2">{v && <VerdictBanner v={v} />}</div>
            {check.diskFreeMb < 3000 && <p className="mt-1 text-xs text-danger">{t('ai.verdictDisk')}</p>}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => decide('on')} disabled={v === 'no'} className="gap-2 bg-brand text-brand-foreground hover:brightness-110">
          <Bot className="h-4 w-4" /> {t('ai.enable')}
        </Button>
        <Button variant="outline" onClick={() => decide('off')}>
          {t('ai.skip')}
        </Button>
        <span className="text-xs text-muted-foreground">{t('ai.changeLater')}</span>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, k, v }: { icon: typeof Cpu; k: string; v: string }) {
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {k}
      </div>
      <div className="font-mono text-sm font-semibold tabular-nums">{v}</div>
    </div>
  )
}

/** Modal de primer arranque: solo escritorio y solo si aún no hay decisión. */
export function AiSetupDialog() {
  const t = useT()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (isDesktop() && getAiPref() === null) setOpen(true)
  }, [])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg space-y-4 rounded-xl border bg-card p-6 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Bot className="h-5 w-5 text-brand" /> {t('ai.setupTitle')}
        </h2>
        <AiDecisionCard onDecided={() => setOpen(false)} />
      </div>
    </div>
  )
}

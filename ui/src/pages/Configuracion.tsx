import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { StatusChip } from '../components/ui/status'
import { TopBar } from '../components/TopBar'
import {
  THEMES,
  FONTS,
  DENSITIES,
  useTheme,
  type ThemeId,
  type FontId,
  type DensityId,
} from '../theme/ThemeProvider'
import { Link } from 'react-router-dom'
import { kernelVersion } from '../lib/kernel'
import { licenseStatus, checkForUpdates, isDesktop, type UpdateCheck } from '../lib/ipc'
import { getAiPref } from '../lib/aiPrefs'
import { useT, useI18n, LANGS, LANG_LABELS } from '../i18n/LanguageProvider'
import {
  Palette,
  Sun,
  Moon,
  Type,
  Rows3,
  RefreshCw,
  Info,
  ShieldCheck,
  BookOpen,
  Cpu,
  Check,
  Languages,
  Bot,
} from 'lucide-react'

/** Fila de opciones tipo "segmented cards": una tarjeta por opción, activa resaltada. */
function OptionCards<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string; desc: string; swatch?: string }[]
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((o) => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-all ${
              active ? 'border-brand bg-brand/5 shadow-sm' : 'border-border hover:border-brand/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{o.label}</span>
              {o.swatch ? (
                <span className="h-4 w-6 rounded ring-1 ring-black/20" style={{ backgroundImage: o.swatch }} />
              ) : active ? (
                <Check className="h-4 w-4 text-brand" />
              ) : null}
            </div>
            <span className="text-[11px] leading-snug text-muted-foreground">{o.desc}</span>
          </button>
        )
      })}
    </div>
  )
}

function Section({ icon: Icon, title, desc, children }: { icon: typeof Palette; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-brand" /> {title}
        </CardTitle>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

// ---- Actualizaciones ------------------------------------------------------

function UpdatesCard() {
  const t = useT()
  const [check, setCheck] = useState<UpdateCheck | null>(null)
  const [busy, setBusy] = useState(false)
  const [installing, setInstalling] = useState(false)

  async function onCheck() {
    setBusy(true)
    setCheck(await checkForUpdates())
    setBusy(false)
  }

  return (
    <Section icon={RefreshCw} title={t('updates.title')} desc={t('updates.desc')}>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onCheck} disabled={busy || installing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> {t('updates.check')}
        </Button>
        <span className="text-xs text-muted-foreground">{t('updates.channel')}</span>
      </div>

      {check?.state === 'web' && <p className="text-xs text-muted-foreground">{t('updates.web')}</p>}
      {check?.state === 'uptodate' && (
        <div className="status-ok flex items-center gap-2 rounded-md border p-2 text-sm">
          <Check className="h-4 w-4" /> {t('updates.uptodate')}
        </div>
      )}
      {check?.state === 'unavailable' && <p className="text-xs text-muted-foreground">{t('updates.unavailable')}</p>}
      {check?.state === 'available' && (
        <div className="status-info space-y-2 rounded-md border p-3 text-sm">
          <div className="font-medium">{t('updates.available', { version: check.version ?? '' })}</div>
          {check.notes && <p className="text-xs text-muted-foreground">{check.notes}</p>}
          <Button
            size="sm"
            disabled={installing}
            onClick={async () => {
              setInstalling(true)
              try {
                await check.run?.()
              } finally {
                setInstalling(false)
              }
            }}
          >
            {installing ? t('updates.installing') : t('updates.install')}
          </Button>
        </div>
      )}
    </Section>
  )
}

// ---- Asistente IA -----------------------------------------------------------

function AiCard() {
  const t = useT()
  const pref = getAiPref()
  const label = pref === 'on' ? t('ai.statusOn') : pref === 'off' ? t('ai.statusOff') : t('ai.statusUndecided')
  const tone = pref === 'on' ? 'ok' : pref === 'off' ? 'neutral' : 'info'
  return (
    <Section icon={Bot} title={t('ai.title')} desc={t('ai.settingsDesc')}>
      <div className="flex flex-wrap items-center gap-3">
        <StatusChip tone={tone}>{label}</StatusChip>
        <Link to="/asistente" className="text-sm text-brand underline-offset-2 hover:underline">
          {t('ai.openAssistant')} →
        </Link>
      </div>
      <p className="text-[11px] text-muted-foreground">{t('ai.disclaimer')}</p>
    </Section>
  )
}

// ---- Acerca de ------------------------------------------------------------

function AboutCard() {
  const t = useT()
  const [kver, setKver] = useState('')
  const [lic, setLic] = useState<string>('—')
  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
    licenseStatus().then((l) => setLic(l.status)).catch(() => setLic('—'))
  }, [])

  const row = (k: string, v: React.ReactNode) => (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  )

  return (
    <Section icon={Info} title={t('about.title')}>
      <div className="flex items-center gap-3">
        <div className="bg-brand-gradient flex h-11 w-11 items-center justify-center rounded-lg shadow">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <div>
          <div className="text-lg font-bold">SuperSurvey</div>
          <div className="text-xs text-muted-foreground">{t('about.tagline')}</div>
        </div>
      </div>

      <div className="text-sm">
        {row(t('about.appVersion'), <span className="font-mono">v{__APP_VERSION__}</span>)}
        {row(t('about.engine'), <span className="font-mono">{kver ? `v${kver}` : '…'}</span>)}
        {row(t('about.license'), <StatusChip tone={lic === 'VALID' ? 'ok' : lic === 'DEMO_WEB' ? 'info' : 'warn'}>{lic}</StatusChip>)}
        {row(t('about.standards'), 'ASTM D1250 · API MPMS · COSTALD 11.2.4')}
        {row(t('about.privacy'), t('about.privacyValue'))}
      </div>

      <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Cpu className="h-4 w-4 shrink-0 text-brand" />
        {t('about.engineNote')}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" /> {t('about.docsNote')}{' '}
          <code className="font-mono">docs/</code>.
        </span>
      </div>
    </Section>
  )
}

// ---- Página ---------------------------------------------------------------

export function Configuracion() {
  const { theme, mode, font, density, setTheme, setMode, setFont, setDensity } = useTheme()
  const { lang, setLang } = useI18n()
  const t = useT()

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t('settings.title')} />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <Section icon={Palette} title={t('settings.appearance')} desc={t('settings.appearanceDesc')}>
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Languages className="h-3.5 w-3.5" /> {t('settings.language')}
              </div>
              <div className="flex gap-2">
                {LANGS.map((lg) => (
                  <button
                    key={lg}
                    type="button"
                    onClick={() => setLang(lg)}
                    aria-pressed={lang === lg}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      lang === lg ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/40'
                    }`}
                  >
                    {LANG_LABELS[lg]}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{t('settings.languageDesc')}</p>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('settings.theme')}</div>
              <OptionCards
                value={theme}
                onChange={(v: ThemeId) => setTheme(v)}
                options={THEMES.map((th) => ({
                  id: th.id,
                  label: t(`theme.${th.id}.label`),
                  desc: t(`theme.${th.id}.desc`),
                  swatch: th.swatch,
                }))}
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('settings.mode')}</div>
              <div className="flex gap-2">
                {(['light', 'dark'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      mode === m ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/40'
                    }`}
                  >
                    {m === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {m === 'light' ? t('settings.light') : t('settings.dark')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Type className="h-3.5 w-3.5" /> {t('settings.font')}
              </div>
              <OptionCards
                value={font}
                onChange={(f: FontId) => setFont(f)}
                options={FONTS.map((f) => ({ id: f.id, label: t(`font.${f.id}.label`), desc: t(`font.${f.id}.desc`) }))}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Rows3 className="h-3.5 w-3.5" /> {t('settings.density')}
              </div>
              <OptionCards
                value={density}
                onChange={(d: DensityId) => setDensity(d)}
                options={DENSITIES.map((d) => ({ id: d.id, label: t(`density.${d.id}.label`), desc: t(`density.${d.id}.desc`) }))}
              />
            </div>

            {isDesktop() && <p className="text-[11px] text-muted-foreground">{t('settings.windowMemory')}</p>}
          </Section>

          <AiCard />
          <UpdatesCard />
          <AboutCard />
        </div>
      </main>
    </div>
  )
}

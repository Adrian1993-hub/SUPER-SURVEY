import { useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { StatusChip } from '../components/ui/status'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { JobStepper } from '../components/Stepper'
import { NextStepBar } from '../components/NextStepBar'
import { getJob, keyMeetingData } from '../data/demoJobs'
import { useT } from '../i18n/LanguageProvider'
import { CheckCircle2, AlertTriangle, PenLine } from 'lucide-react'

function Rata({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-mono text-2xl font-bold tabular-nums">
          {value} <span className="text-base text-muted-foreground">m³/h</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function KeyMeeting() {
  const { id } = useParams<{ id: string }>()
  const t = useT()
  const jobId = id || '1'
  const job = getJob(jobId)
  const k = keyMeetingData[jobId] ?? keyMeetingData['1']

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t('keymeeting.title')} activeJob={job} />
      <JobStepper />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Rata label={t('keymeeting.rateInitial')} value={k.ratas.inicial} />
            <Rata label={t('keymeeting.rateMax')} value={k.ratas.maxima} />
            <Rata label={t('keymeeting.rateTopping')} value={k.ratas.topping} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('keymeeting.agreements')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('keymeeting.grades')}</span>
                {k.gradosConfirmados.map((g) => (
                  <StatusChip key={g} tone="info">{g}</StatusChip>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('keymeeting.nominatedTanks')}</span>
                {k.tanquesNominados.map((tn) => (
                  <Badge key={tn} variant="outline">{tn}</Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('keymeeting.expectedRob')}</span>
                  <span className="font-mono font-medium tabular-nums">{k.robEsperado.toFixed(1)} m³</span>
                </div>
                <div>
                  <span className="text-muted-foreground">VHF: </span>
                  <span className="font-medium">{k.canalVhf}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('keymeeting.checklist')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {k.items.map((it) => (
                <div key={it.item} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                  {it.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                  )}
                  <span className={it.ok ? '' : 'text-muted-foreground'}>{it.item}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button className="gap-2 bg-brand text-brand-foreground hover:brightness-110">
              <PenLine className="h-4 w-4" />
              {t('keymeeting.signMinutes')}
            </Button>
          </div>
          <NextStepBar
            to={`/trabajo/${id || '1'}/medicion`}
            label={t('keymeeting.nextLabel')}
            hint={t('keymeeting.nextHint')}
          />
        </div>
      </main>
    </div>
  )
}

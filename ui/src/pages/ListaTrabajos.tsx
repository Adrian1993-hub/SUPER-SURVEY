import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { EstadoBadge } from '../components/EstadoBadge'
import { StatusChip } from '../components/ui/status'
import { TopBar } from '../components/TopBar'
import { jobs } from '../data/demoJobs'
import { listStoredJobs, createJob, isDesktop, loadMeasurementSections, setJobCompleted, type StoredJob } from '../lib/ipc'
import { useJobMeasurement } from '../lib/jobStore'
import { type VmrTank } from '../data/vmr'
import { EmptyState } from '../components/EmptyState'
import { useT } from '../i18n/LanguageProvider'
import { Plus, ChevronRight, Database, X, CheckCircle2, RotateCcw } from 'lucide-react'

const OP_TYPES = ['BUNKER_LOADING', 'BUNKER_DELIVERY', 'CARGO_LOADING', 'CARGO_DISCHARGE', 'LPG_DISCHARGE', 'BLEND']
const inputCls = 'w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring'

export function ListaTrabajos() {
  const navigate = useNavigate()
  const t = useT()
  const [stored, setStored] = useState<StoredJob[]>([])
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ jobRef: '', operationType: 'BUNKER_LOADING', clientRef: '', portName: '' })
  const { setBefore, setAfter } = useJobMeasurement()

  const reload = () =>
    listStoredJobs()
      .then(setStored)
      .catch(() => setStored([]))

  useEffect(() => {
    reload()
  }, [])

  const handleRowClick = (jobId: string) => navigate(`/trabajo/${jobId}/cover`)
  const setField = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // Abrir un trabajo guardado: hidrata AMBAS rejillas (apertura + después) desde
  // los snapshots (escritorio/SQLite), de modo que reabrir para corregir una
  // comparación no pierde lo medido. En el navegador no hay snapshots y se
  // conserva el borrador local; luego navega al trabajo.
  async function openStoredJob(j: StoredJob) {
    try {
      const { before, after } = await loadMeasurementSections(j.id)
      if (before.length > 0) setBefore(before.map((s) => JSON.parse(s) as VmrTank))
      if (after.length > 0) setAfter(after.map((s) => JSON.parse(s) as VmrTank))
    } catch {
      /* si falla la carga, navegamos igual */
    }
    navigate(`/trabajo/${j.id}/cover`)
  }

  // Marcar/desmarcar "finalizada" sin bloquear la edición: el trabajo sigue
  // abierto para correcciones; el estado queda visible y los cálculos guardados
  // (append-only) registran cualquier cambio posterior.
  async function toggleFinished(e: MouseEvent, j: StoredJob) {
    e.stopPropagation()
    const next = !j.completedAt
    if (next && !window.confirm(t('jobs.finishConfirm'))) return
    try {
      await setJobCompleted(j.id, next)
      await reload()
    } catch (err) {
      window.alert((err as Error).message)
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!form.jobRef.trim()) return
    setBusy(true)
    try {
      const id = await createJob({
        jobRef: form.jobRef.trim(),
        operationFamily: 'BQS',
        operationType: form.operationType,
        clientRef: form.clientRef.trim() || null,
        portName: form.portName.trim() || null,
      })
      await reload()
      navigate(`/trabajo/${id}/cover`)
    } catch (err) {
      window.alert((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar title={t('jobs.title')} />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">{t('jobs.title')}</h1>
            <Button onClick={() => setShowForm((s) => !s)} className="bg-brand text-brand-foreground hover:brightness-110">
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? t('common.cancel') : t('jobs.new')}
            </Button>
          </div>

          {showForm && (
            <Card>
              <form onSubmit={onCreate} className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">{t('jobs.ref')} *</span>
                  <input autoFocus value={form.jobRef} onChange={(e) => setField('jobRef', e.target.value)} placeholder="BQS-2026-0143" className={inputCls} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">{t('jobs.operation')}</span>
                  <select value={form.operationType} onChange={(e) => setField('operationType', e.target.value)} className={inputCls}>
                    {OP_TYPES.map((op) => (
                      <option key={op} value={op}>{op.replace(/_/g, ' ').toLowerCase()}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">{t('topbar.client')}</span>
                  <input value={form.clientRef} onChange={(e) => setField('clientRef', e.target.value)} placeholder={t('topbar.client')} className={inputCls} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground">{t('jobs.port')}</span>
                  <input value={form.portName} onChange={(e) => setField('portName', e.target.value)} placeholder={t('jobs.port')} className={inputCls} />
                </label>
                <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
                  <Button type="submit" disabled={busy || !form.jobRef.trim()} className="gap-2">
                    <Plus className="h-4 w-4" /> {busy ? t('jobs.creating') : t('jobs.create')}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {isDesktop() ? t('jobs.savedDesktop') : t('jobs.savedWeb')}
                  </span>
                </div>
              </form>
            </Card>
          )}

          {stored.length === 0 && (
            <EmptyState
              icon={Database}
              title={t('jobs.emptyTitle')}
              desc={isDesktop() ? t('jobs.emptyDesktop') : t('jobs.emptyWeb')}
            />
          )}

          {stored.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Database className="h-4 w-4 text-brand" /> {t('jobs.savedHeader')} {isDesktop() ? t('jobs.savedSqlite') : t('jobs.savedBrowser')}
              </div>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right font-mono">{t('jobs.colNumRef')}</TableHead>
                      <TableHead className="w-[140px]">{t('jobs.operation')}</TableHead>
                      <TableHead>{t('topbar.client')}</TableHead>
                      <TableHead>{t('jobs.port')}</TableHead>
                      <TableHead className="w-[120px] text-right font-mono">{t('jobs.created')}</TableHead>
                      <TableHead className="w-[110px] text-right font-mono">{t('jobs.calcs')}</TableHead>
                      <TableHead className="w-[130px]">{t('common.status')}</TableHead>
                      <TableHead className="w-[150px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stored.map((j) => (
                      <TableRow key={j.id} className="cursor-pointer" onClick={() => openStoredJob(j)}>
                        <TableCell className="text-right font-mono tabular-nums">{j.jobRef}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{j.operationFamily}</span>
                            <span className="text-xs text-muted-foreground">{j.operationType}</span>
                          </div>
                        </TableCell>
                        <TableCell>{j.clientRef ?? '—'}</TableCell>
                        <TableCell>{j.portName ?? '—'}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{j.createdAt.slice(0, 10)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{j.activeLogCount}</TableCell>
                        <TableCell>
                          {j.completedAt ? (
                            <StatusChip tone="ok" title={t('jobs.finishedOn', { date: j.completedAt.slice(0, 10) })}>
                              <CheckCircle2 className="h-3 w-3" /> {t('jobs.finished')}
                            </StatusChip>
                          ) : (
                            <StatusChip tone="info">{t('jobs.inProgress')}</StatusChip>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => toggleFinished(e, j)}
                              title={j.completedAt ? t('jobs.reopenTitle') : t('jobs.finishTitle')}
                              className="inline-flex items-center gap-1 rounded-md border border-input px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                            >
                              {j.completedAt ? <RotateCcw className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                              {j.completedAt ? t('jobs.reopen') : t('jobs.markFinished')}
                            </button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          <div>
            {stored.length > 0 && <div className="mb-2 text-sm font-semibold text-muted-foreground">{t('jobs.demoJobs')}</div>}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px] text-right font-mono">{t('topbar.number')}</TableHead>
                    <TableHead>{t('topbar.client')}</TableHead>
                    <TableHead className="w-[100px]">{t('jobs.operation')}</TableHead>
                    <TableHead>{t('topbar.vessel')}</TableHead>
                    <TableHead>{t('jobs.port')}</TableHead>
                    <TableHead className="w-[120px] text-right font-mono">{t('jobs.date')}</TableHead>
                    <TableHead className="w-[140px]">{t('common.status')}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id} className="cursor-pointer" onClick={() => handleRowClick(job.id)}>
                      <TableCell className="text-right font-mono tabular-nums">{job.numero}</TableCell>
                      <TableCell className="font-medium">{job.cliente}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{job.operacion}</span>
                          <span className="text-xs text-muted-foreground">Bunker Quantity Survey</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{job.buque}</TableCell>
                      <TableCell>{job.puerto}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{job.fecha}</TableCell>
                      <TableCell>
                        <EstadoBadge estado={job.estado} />
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

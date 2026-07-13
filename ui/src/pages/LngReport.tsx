import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { ReportBrandBar, ReportTitle, ReportSignature } from '../components/ReportHeader'
import { getJob } from '../data/demoJobs'
import { lngReportDemo } from '../data/lng'
import { kernelVersion } from '../lib/kernel'
import { useT } from '../i18n/LanguageProvider'
import { FileText } from 'lucide-react'

// Reporte de descarga de LNG (custody por energía, GIIGNL / ISO 6976) — vista de
// impresión. Cifras del caso de referencia validado por el kernel
// (docs/research/lng-discharge.md), anonimizado. La página «LNG (descarga)» hace
// el cálculo en vivo; este documento presenta el resultado en formato de reporte.

const grp = (n: number, dp = 0) => n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 py-1">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  )
}

function Fig({ k, v, unit, big }: { k: string; v: string; unit?: string; big?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-center print:bg-transparent">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</div>
      <div className={`font-mono tabular-nums ${big ? 'text-lg font-bold text-brand' : 'text-sm font-semibold'}`}>
        {v}
        {unit && <span className="ml-1 font-sans text-xs font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  )
}

export function LngReport() {
  const { id } = useParams<{ id: string }>()
  const job = getJob(id || '1')
  const t = useT()
  const [kver, setKver] = useState('')
  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])

  const d = lngReportDemo
  const q = d.quantity
  const ql = d.quality

  return (
    <div className="flex h-full flex-col print:block print:h-auto">
      <TopBar title={t('op.lngDischarge')} activeJob={job} />

      <main className="flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
        <div className="mx-auto max-w-4xl space-y-4 print:max-w-none print:space-y-0">
          {/* Acciones (no se imprimen) */}
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <h2 className="text-lg font-semibold">{t('lngrep.printView')}</h2>
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <FileText className="h-4 w-4" /> {t('report.pdfPrint')}
            </Button>
          </div>

          {/* Documento */}
          <article className="overflow-hidden rounded-xl border bg-card shadow-sm print:rounded-none print:border-0 print:shadow-none">
            <ReportBrandBar referencia={d.meta.referencia} fecha={d.meta.fecha} />

            <div className="space-y-6 px-8 py-6">
              <ReportTitle title={t('lngrep.doc.title')} subtitle={t('lngrep.doc.subtitle')} />

              <div className="grid gap-x-10 gap-y-1 text-sm sm:grid-cols-2 print:grid-cols-2">
                <Meta k={t('report.meta.vessel')} v={d.meta.buque} />
                <Meta k={t('lngrep.meta.terminalPort')} v={d.meta.terminal} />
                <Meta k={t('report.meta.client')} v={d.meta.cliente} />
                <Meta k={t('lngrep.meta.voyage')} v={d.meta.voyage} />
                <Meta k={t('lngrep.meta.loadPort')} v={d.meta.loadPort} />
                <Meta k={t('lngrep.meta.lngTemp')} v={`${grp(ql.tempC, 1)} °C`} />
              </div>

              {/* Cifras clave */}
              <section className="print:break-inside-avoid">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">{t('lngrep.summary.title')}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Fig k={t('lngrep.fig.density')} v={grp(ql.density, 1)} unit="kg/m³" />
                  <Fig k={t('lngrep.fig.volDelivered')} v={grp(q.volDelivered, 1)} unit="m³" />
                  <Fig k={t('lngrep.fig.grossMass')} v={grp(q.grossMass)} unit="kg" />
                  <Fig k={t('lngrep.fig.ghvMass')} v={grp(ql.ghvMass)} unit="Btu/lb" />
                  <Fig k={t('lngrep.fig.grossEnergy')} v={grp(q.grossEnergy)} unit="MMBtu" />
                  <Fig k={t('lngrep.fig.vaporDisplaced')} v={grp(q.vaporDisplaced)} unit="MMBtu" />
                  <Fig k={t('lngrep.fig.machineGas')} v={grp(q.machineGas)} unit="MMBtu" />
                  <Fig k={t('lngrep.fig.netEnergy')} v={grp(q.netEnergy)} unit="MMBtu" big />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t('lngrep.summary.netMassEq')} {grp(q.netMassEq, 3)} t (ISO 13398) · {t('lngrep.summary.ghvVolume')} {grp(ql.ghvVolume, 2)} Btu/scf · Wobbe{' '}
                  {grp(ql.wobbe, 2)} Btu/scf.
                </p>
              </section>

              {/* Composición */}
              <section className="print:break-inside-avoid">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">{t('lngrep.composition.title')}</h3>
                <table className="table-dense w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="cell-l th-caps">{t('lngrep.composition.component')}</th>
                      <th className="th-caps">mol %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.composition.map((c) => (
                      <tr key={c.name}>
                        <td className="cell-l">{c.name}</td>
                        <td>{grp(c.pct, 2)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td className="cell-l">{t('flowShared.totals')}</td>
                      <td>{grp(d.composition.reduce((a, c) => a + c.pct, 0), 2)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              {/* Cadena de cálculo */}
              <section className="print:break-inside-avoid text-sm">
                <h3 className="mb-1 text-sm font-bold uppercase tracking-wide">{t('lngrep.method.title')}</h3>
                <ol className="ml-4 list-decimal space-y-0.5 text-muted-foreground">
                  <li>{t('lngrep.method.s1', { v: grp(ql.density, 1) })}</li>
                  <li>{t('lngrep.method.s2', { v: grp(ql.ghvMass) })}</li>
                  <li>{t('lngrep.method.s3', { a: grp(q.volBefore, 3), b: grp(q.volAfter, 3), c: grp(q.volDelivered, 1) })}</li>
                  <li>{t('lngrep.method.s4', { v: grp(q.grossMass) })}</li>
                  <li>{t('lngrep.method.s5', { v: grp(q.netEnergy) })}</li>
                </ol>
              </section>

              {/* Statement of Facts */}
              <section className="print:break-inside-avoid">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">Statement of Facts</h3>
                <table className="table-dense w-full border-collapse">
                  <tbody>
                    {d.sof.map((s) => (
                      <tr key={s.label}>
                        <td className="cell-l">{s.label}</td>
                        <td className="text-right font-mono tabular-nums">{s.at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              {/* Firmas */}
              <section className="grid grid-cols-3 gap-6 pt-4 text-sm print:break-inside-avoid">
                <ReportSignature label={t('report.sig.vesselRep')} />
                <ReportSignature label={t('report.sig.terminalRep')} />
                <ReportSignature label={t('report.sig.surveyor')} />
              </section>

              <footer className="border-t pt-3 text-center text-[10px] text-muted-foreground">
                {t('report.footer.calcBy')} (GIIGNL CTH · ISO 6976){kver ? ` v${kver}` : ''} · {t('lngrep.footer.custody')} · {t('lngrep.footer.demoRef')}
              </footer>
            </div>
          </article>
        </div>
      </main>
    </div>
  )
}

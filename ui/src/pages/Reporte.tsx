import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { TopBar } from '../components/TopBar'
import { JobStepper } from '../components/Stepper'
import { NextStepBar } from '../components/NextStepBar'
import { ReportBrandBar, ReportTitle, ReportSignature } from '../components/ReportHeader'
import { getJob } from '../data/demoJobs'
import { vmrData, BARGE_FACTOR, BDN_FACTOR, toleranceLayers, type VmrSectionData } from '../data/vmr'
import { compareSources, kernelVersion, type ComparisonResult } from '../lib/kernel'
import { sectionTotals, useComputedRows, useTransferred, type CalcFields, type TableVersion } from '../lib/useBqsRows'
import { useJobMeasurement } from '../lib/jobStore'
import { downloadWorkbook, type SheetSpec } from '../lib/xlsx'
import { FileText, FileSpreadsheet, Braces, PenLine, CheckCircle2, AlertTriangle } from 'lucide-react'

// Reporte BQS imprimible: TODA cifra sale del kernel WASM (misma matemática
// validada que Medición). PDF = imprimir del webview (offline, navegador y
// Tauri). Fuente de datos: el seed demo de la hoja — compartir el estado
// editado de Medición llega con la carga/guardado por trabajo (persistencia).
// Las flechas ▲▼ de Medición son referencia del inspector y NO aparecen aquí.

const f3 = (n: number) => n.toFixed(3)
const f4 = (n: number) => n.toFixed(4)

// Grid canónico: .table-dense (index.css) define borde/padding/tipografía;
// aquí solo quedan los modificadores por celda.
const th = 'cell-l th-caps'
const td = ''
const tdL = 'cell-l'

function SectionTable({ title, section, calc }: { title: string; section: VmrSectionData; calc: (CalcFields | null)[] }) {
  const tot = sectionTotals(section.tanques, calc)
  return (
    <section className="print:break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
        <div className="text-[11px] text-muted-foreground">
          Calado proa <span className="font-mono">{section.draftFore.toFixed(2)}</span> · popa{' '}
          <span className="font-mono">{section.draftAft.toFixed(2)}</span> · trim{' '}
          <span className="font-mono">{section.trim.toFixed(2)}</span> · list{' '}
          <span className="font-mono">{section.list.toFixed(2)}</span> · trim {section.trimApplied ? 'aplicado' : 'no aplicado'}
        </div>
      </div>
      <table className="table-dense mt-2 w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>Tanque</th>
            <th className={th}>Grado</th>
            <th className={`${th} text-right`}>Dens@15</th>
            <th className={`${th} text-right`}>Temp °C</th>
            <th className={`${th} text-right`}>TOV m³</th>
            <th className={`${th} text-right`}>GOV m³</th>
            <th className={`${th} text-right`}>VCF 54B</th>
            <th className={`${th} text-right`}>GSV@15 m³</th>
            <th className={`${th} text-right`}>WCF 56</th>
            <th className={`${th} text-right`}>MT (aire)</th>
          </tr>
        </thead>
        <tbody>
          {section.tanques.map((t, i) => {
            const c = calc[i]
            return (
              <tr key={t.tanque + i}>
                <td className={tdL}>{t.tanque}</td>
                <td className={tdL}>{t.grade}</td>
                <td className={td}>{f4(t.densidad15)}</td>
                <td className={td}>{t.temp.toFixed(1)}</td>
                <td className={td}>{f3(t.tov)}</td>
                <td className={td}>{f3(c ? c.gov : t.gov)}</td>
                <td className={td}>{f4(c ? c.vcf : t.vcf)}</td>
                <td className={td}>{f3(c ? c.gsv : t.gsv)}</td>
                <td className={td}>{f4(c ? c.wcf56 : t.wcf56)}</td>
                <td className={`${td} font-semibold`}>{f3(c ? c.mt : t.mt)}</td>
              </tr>
            )
          })}
          <tr className="bg-muted font-semibold">
            <td className={tdL} colSpan={4}>
              Totales
            </td>
            <td className={td}>{f3(tot.tov)}</td>
            <td className={td}>{f3(tot.gov)}</td>
            <td className={td}>{f4(tot.vcf)}</td>
            <td className={td}>{f3(tot.gsv)}</td>
            <td className={td}>{f4(tot.wcf)}</td>
            <td className={td}>{f3(tot.mt)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

export function Reporte() {
  const { id } = useParams<{ id: string }>()
  const job = getJob(id || '1')
  const h = vmrData.header
  // Mismas mediciones que editó el surveyor en Medición (estado compartido).
  const { before, after } = useJobMeasurement()
  const beforeSection: VmrSectionData = { ...vmrData.before, tanques: before }
  const afterSection: VmrSectionData = { ...vmrData.after, tanques: after }

  const [edition, setEdition] = useState<TableVersion>('D1250_80')
  const beforeCalc = useComputedRows(before, edition)
  const afterCalc = useComputedRows(after, edition)
  const totBefore = sectionTotals(before, beforeCalc)
  const totAfter = sectionTotals(after, afterCalc)
  const transferred = useTransferred(totAfter.gsv - totBefore.gsv, h.suppliersDensity, edition)
  const editionLabel = edition === 'D1250_04' ? 'D1250-04 · API MPMS 11.1' : 'D1250-80'
  const mtAir = transferred?.mtAir ?? vmrData.transferred.mtAir

  const [cmp, setCmp] = useState<ComparisonResult | null>(null)
  useEffect(() => {
    let cancelled = false
    compareSources({
      sources: [
        { name: 'Vessel Received', quantity: mtAir },
        { name: 'Barge Delivered', quantity: mtAir * BARGE_FACTOR },
        { name: 'BDN', quantity: mtAir * BDN_FACTOR },
      ],
      layers: toleranceLayers,
      scope: 'LIVE',
    })
      .then((r) => !cancelled && setCmp(r))
      .catch(() => !cancelled && setCmp(null))
    return () => {
      cancelled = true
    }
  }, [mtAir])

  const [kver, setKver] = useState('')
  useEffect(() => {
    kernelVersion().then(setKver).catch(() => setKver(''))
  }, [])

  const action = cmp?.recommendedAction ?? 'NONE'

  function exportJson() {
    const payload = {
      report_type: 'BQS_VMR',
      demo_data: true, // datos ficticios de demostración
      generated_at: new Date().toISOString(),
      kernel_version: kver || null,
      table_version: edition,
      header: h,
      sections: {
        before: { tanks: before, calc: beforeCalc, totals: totBefore },
        after: { tanks: after, calc: afterCalc, totals: totAfter },
      },
      quantity_transferred: transferred,
      comparison: cmp,
      tolerance_layers: toleranceLayers,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${h.referencia.replace(/\s+/g, '_')}_tecnico.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportXlsx() {
    const sectionRows = (tanks: typeof before, calc: (CalcFields | null)[]): (string | number | null)[][] => {
      const head = ['Tanque', 'Grado', 'Dens@15', 'Temp °C', 'TOV m³', 'GOV m³', 'VCF 54B', 'GSV@15 m³', 'WCF 56', 'MT (aire)']
      const body = tanks.map((t, i) => {
        const c = calc[i]
        return [t.tanque, t.grade, t.densidad15, t.temp, t.tov, c ? c.gov : t.gov, c ? c.vcf : t.vcf, c ? c.gsv : t.gsv, c ? c.wcf56 : t.wcf56, c ? c.mt : t.mt]
      })
      const tot = sectionTotals(tanks, calc)
      body.push(['Totales', '', '', '', tot.tov, tot.gov, tot.vcf, tot.gsv, tot.wcf, tot.mt])
      return [head, ...body]
    }
    const sheets: SheetSpec[] = [
      {
        name: 'Meta',
        rows: [
          ['SuperSurvey', 'Bunker Quantity Survey'],
          ['Referencia', h.referencia], ['Buque', h.buque], ['Surveyor', h.surveyor], ['Barcaza', h.barcaza],
          ['Tipo de survey', h.surveyType], ['Puerto', h.puerto], ['Fecha', h.fecha], ['Estado del mar', h.seaCondition],
          ['Densidad suplidor @15 °C (kg/L)', h.suppliersDensity], ['Edición tablas', editionLabel], ['Kernel', kver || ''],
          ['Datos', 'demostración (ficticios)'],
        ],
      },
      { name: 'Before receiving', rows: sectionRows(before, beforeCalc) },
      { name: 'After receiving', rows: sectionRows(after, afterCalc) },
      {
        name: 'Quantity transferred',
        rows: [
          ['GSV @15 °C (Δ after − before) m³', 'Densidad suplidor kg/L', 'WCF 56', 'MT (vacío)', 'MT (aire)'],
          [transferred ? transferred.gsv : '', h.suppliersDensity, transferred ? transferred.wcf : '', transferred ? transferred.mtVac : '', transferred ? transferred.mtAir : ''],
        ],
      },
      {
        name: 'Comparacion',
        rows: [
          ['Par', 'A', 'B', 'Δ MT', 'Δ%', 'Resultado'],
          ...(cmp?.pairs ?? []).map((p) => [`${p.sourceA} vs ${p.sourceB}`, p.valueA, p.valueB, p.delta, `${p.deltaPct}%`, p.withinAll ? 'Dentro de tolerancia' : 'Fuera de tolerancia']),
          [],
          ['Recomendación', action, 'Peor |Δ%|', cmp?.worstDeltaPct ?? ''],
        ],
      },
    ]
    await downloadWorkbook(`${h.referencia.replace(/\s+/g, '_')}.xlsx`, sheets)
  }

  return (
    <div className="flex h-full flex-col print:block print:h-auto">
      <TopBar title="Reporte" activeJob={job} />
      <JobStepper />

      <main className="flex-1 overflow-auto p-6 print:overflow-visible print:p-0">
        <div className="mx-auto max-w-4xl space-y-4 print:max-w-none print:space-y-0">
          {/* Acciones (no se imprimen) */}
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <h2 className="text-lg font-semibold">Reporte BQS — vista de impresión</h2>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Edición de las tablas de medición de petróleo">
                Tablas
                <select
                  value={edition}
                  onChange={(e) => setEdition(e.target.value as TableVersion)}
                  className="rounded-md border border-input bg-transparent px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="D1250_80">D1250-80 (4 dp)</option>
                  <option value="D1250_04">D1250-04 (5 dp)</option>
                </select>
              </label>
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <FileText className="h-4 w-4" /> PDF / Imprimir
              </Button>
              <Button variant="outline" className="gap-2" onClick={exportJson}>
                <Braces className="h-4 w-4" /> JSON técnico
              </Button>
              <Button variant="outline" className="gap-2" onClick={exportXlsx}>
                <FileSpreadsheet className="h-4 w-4" /> XLSX
              </Button>
              <Button className="gap-2 bg-brand text-brand-foreground hover:brightness-110" disabled title="La firma digital llega con la fase de firma">
                <PenLine className="h-4 w-4" /> Firmar
              </Button>
            </div>
          </div>

          {/* Documento */}
          <article className="overflow-hidden rounded-xl border bg-card shadow-sm print:rounded-none print:border-0 print:shadow-none">
            {/* Marca (white-label) */}
            <ReportBrandBar referencia={h.referencia} fecha={h.fecha} />

            <div className="space-y-6 px-8 py-6">
              <ReportTitle title="Bunker Quantity Survey" subtitle="Vessel Measurement Report" />

              {/* Meta */}
              <div className="grid gap-x-10 gap-y-1 text-sm sm:grid-cols-2 print:grid-cols-2">
                <Meta k="Buque" v={h.buque} />
                <Meta k="Surveyor" v={h.surveyor} />
                <Meta k="Barcaza" v={h.barcaza} />
                <Meta k="Tipo de survey" v={h.surveyType} />
                <Meta k="Puerto" v={h.puerto} />
                <Meta k="Fecha" v={h.fecha} />
                <Meta k="Estado del mar" v={h.seaCondition} />
                <Meta k="Densidad suplidor @15 °C" v={`${f4(h.suppliersDensity)} kg/L`} />
              </div>

              <SectionTable title="Before receiving" section={beforeSection} calc={beforeCalc} />
              <SectionTable title="After receiving" section={afterSection} calc={afterCalc} />

              {/* Quantity transferred */}
              <section className="print:break-inside-avoid">
                <h3 className="text-sm font-bold uppercase tracking-wide">Quantity transferred</h3>
                <table className="table-dense mt-2 w-full border-collapse">
                  <tbody>
                    <tr>
                      <th className={th}>GSV @15 °C (Δ after − before)</th>
                      <th className={th}>Densidad suplidor</th>
                      <th className={th}>WCF Tabla 56</th>
                      <th className={th}>MT (vacío)</th>
                      <th className={th}>MT (aire)</th>
                    </tr>
                    <tr>
                      <td className={td}>{transferred ? f3(transferred.gsv) : '—'} m³</td>
                      <td className={td}>{f4(h.suppliersDensity)} kg/L</td>
                      <td className={td}>{transferred ? f4(transferred.wcf) : '—'}</td>
                      <td className={td}>{transferred ? f3(transferred.mtVac) : '—'} MT</td>
                      <td className={`${td} bg-muted font-bold`}>{transferred ? f3(transferred.mtAir) : '—'} MT</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              {/* Comparación de fuentes */}
              <section className="print:break-inside-avoid">
                <h3 className="text-sm font-bold uppercase tracking-wide">Comparación de fuentes (MT aire)</h3>
                <table className="table-dense mt-2 w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Par</th>
                      <th className={`${th} text-right`}>A</th>
                      <th className={`${th} text-right`}>B</th>
                      <th className={`${th} text-right`}>Δ MT</th>
                      <th className={`${th} text-right`}>Δ%</th>
                      <th className={th}>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cmp?.pairs ?? []).map((p) => (
                      <tr key={`${p.sourceA}-${p.sourceB}`}>
                        <td className={tdL}>
                          {p.sourceA} vs {p.sourceB}
                        </td>
                        <td className={td}>{p.valueA}</td>
                        <td className={td}>{p.valueB}</td>
                        <td className={td}>{p.delta}</td>
                        <td className={td}>{p.deltaPct}%</td>
                        <td className={tdL}>{p.withinAll ? 'Dentro de tolerancia' : 'Fuera de tolerancia'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex items-start gap-2 text-sm">
                  {action === 'NONE' ? (
                    <>
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>
                        Todas las diferencias dentro de las capas de tolerancia (
                        {toleranceLayers.map((l) => `${l.name} ±${l.limitPct}%`).join(' · ')}). No se requiere documento de
                        discrepancia.
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${action === 'ISSUE_LOP' ? 'text-danger' : 'text-warning'}`} />
                      <span>
                        El peor |Δ%| ({cmp?.worstDeltaPct}%) excede {action === 'ISSUE_LOP' ? 'la capa más amplia' : 'la capa más estricta'} de
                        tolerancia — se {action === 'ISSUE_LOP' ? 'emite Letter of Protest (LOP)' : 'notifica discrepancia aparente (NOAD)'}, adjunta a este
                        reporte.
                      </span>
                    </>
                  )}
                </div>
              </section>

              {/* Observaciones */}
              <section className="print:break-inside-avoid">
                <h3 className="text-sm font-bold uppercase tracking-wide">Observaciones</h3>
                <div className="mt-2 h-14 rounded border border-dashed print:rounded-none" />
              </section>

              {/* Firmas */}
              <section className="grid grid-cols-3 gap-6 pt-4 text-sm print:break-inside-avoid">
                <ReportSignature label="Surveyor" />
                <ReportSignature label="Master / Chief Engineer" />
                <ReportSignature label="Por la barcaza" />
              </section>

              <footer className="border-t pt-3 text-center text-[10px] text-muted-foreground">
                Calculado por SuperSurvey · kernel ASTM {editionLabel} {kver ? `v${kver}` : ''} (sin redondeos intermedios no
                documentados) · documento de demostración con datos ficticios
              </footer>
            </div>
          </article>

          <NextStepBar
            to="/trabajos"
            label="Trabajos"
            hint="Imprime o exporta el reporte y ciérralo con las firmas; el trabajo queda en la lista."
          />
        </div>
      </main>
    </div>
  )
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-44 shrink-0 text-muted-foreground">{k}:</span>
      <span className="font-medium">{v}</span>
    </div>
  )
}


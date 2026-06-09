import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { EstadoBadge } from '../components/EstadoBadge'
import { TopBar } from '../components/TopBar'
import { AnimatedNumber } from '../components/charts/AnimatedNumber'
import { Donut } from '../components/charts/Donut'
import { BarsCompare } from '../components/charts/BarsCompare'
import { FillBar } from '../components/charts/FillBar'
import { jobs, comparacionData, medicionData, profileData } from '../data/demoJobs'
import { Briefcase, Gauge, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'

export function Dashboard() {
  const navigate = useNavigate()
  const activos = jobs.filter((j) => j.estado === 'En progreso').length
  const firmados = jobs.filter((j) => j.estado === 'Firmado').length
  const comp = comparacionData['1']
  const discrepancias = comp.comparaciones.filter((c) => !c.dentroTolerancia).length
  const dentro = comp.comparaciones.filter((c) => c.dentroTolerancia).length
  const mt = medicionData['1'].totales.mtAire
  const tanques = medicionData['1'].tanques
  const caps = profileData['1'].tanques

  const kpis = [
    { label: 'Trabajos activos', value: activos, decimals: 0, unit: '', icon: Briefcase },
    { label: 'MT calculadas (últ.)', value: mt, decimals: 1, unit: 'MT', icon: Gauge },
    { label: 'Discrepancias abiertas', value: discrepancias, decimals: 0, unit: '', icon: AlertTriangle },
    { label: 'Trabajos firmados', value: firmados, decimals: 0, unit: '', icon: CheckCircle2 },
  ]

  return (
    <div className="flex h-full flex-col">
      <TopBar title="Dashboard" />

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Hero */}
          <div className="bg-brand-gradient relative animate-rise overflow-hidden rounded-xl p-6 text-white shadow-lg">
            <div className="relative z-10">
              <div className="text-sm opacity-80">Bienvenido a</div>
              <h1 className="text-3xl font-bold tracking-tight">SuperSurvey</h1>
              <p className="mt-1 max-w-xl text-sm opacity-90">
                Medición → cantidad calculada → comparación defendible → documento firmable. Todo offline.
              </p>
              <Link
                to="/trabajos"
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-white/15 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/25"
              >
                Ver trabajos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <Gauge className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 opacity-10" />
          </div>

          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k, i) => (
              <Card key={k.label} className="card-hover animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <div className="text-sm text-muted-foreground">{k.label}</div>
                    <div className="mt-1 text-2xl font-bold tabular-nums">
                      <AnimatedNumber value={k.value} decimals={k.decimals} />
                      {k.unit && <span className="ml-1 text-base font-medium text-muted-foreground">{k.unit}</span>}
                    </div>
                  </div>
                  <div className="bg-brand-gradient flex h-11 w-11 items-center justify-center rounded-lg text-white">
                    <k.icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="animate-rise lg:col-span-2">
              <CardHeader>
                <CardTitle>Cantidad por fuente · {jobs[0].numero}</CardTitle>
              </CardHeader>
              <CardContent>
                <BarsCompare items={comp.fuentes.map((f, i) => ({ label: f.nombre, value: f.total, highlight: i === 0 }))} />
              </CardContent>
            </Card>
            <Card className="animate-rise">
              <CardHeader>
                <CardTitle>Tolerancia</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-2">
                <Donut value={dentro / comp.comparaciones.length} label={`${dentro}/${comp.comparaciones.length}`} sublabel="dentro" />
                <div className="text-sm text-muted-foreground">{discrepancias} fuera de tolerancia</div>
              </CardContent>
            </Card>
          </div>

          {/* Tanques + recientes */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="animate-rise">
              <CardHeader>
                <CardTitle>Llenado por tanque (cierre)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tanques.map((t, i) => {
                  const cap = caps[i]?.capacidad ?? 100
                  const pct = (t.cierre.volTabla / cap) * 100
                  return (
                    <div key={t.tanque}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-muted-foreground">{t.tanque}</span>
                        <span className="font-mono tabular-nums">
                          {t.cierre.volTabla.toFixed(1)} / {cap.toFixed(0)} m³
                        </span>
                      </div>
                      <FillBar pct={pct} gradient={t.fueraTolerance} />
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="animate-rise">
              <CardHeader>
                <CardTitle>Trabajos recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Buque</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.slice(0, 5).map((j) => (
                      <TableRow key={j.id} className="cursor-pointer" onClick={() => navigate(`/trabajo/${j.id}/cover`)}>
                        <TableCell className="font-mono tabular-nums">{j.numero}</TableCell>
                        <TableCell>{j.buque}</TableCell>
                        <TableCell>
                          <EstadoBadge estado={j.estado} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

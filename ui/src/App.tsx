import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { TooltipProvider } from './components/ui/tooltip'
import { JobMeasurementProvider } from './lib/jobStore'
import { AppSidebar } from './components/AppSidebar'
import { AiSetupDialog } from './components/AiSetupDialog'
import { PageFallback } from './components/PageFallback'
// Dashboard (landing) va EAGER para no mostrar fallback en el primer paint.
import { Dashboard } from './pages/Dashboard'

// El resto se carga por ruta (code-splitting): cada página es su propio chunk que
// baja al navegar, no en el bundle inicial. Las páginas exportan por NOMBRE, así
// que adaptamos a `default` — que es lo que espera React.lazy.
const lazyPage = <M extends Record<string, React.ComponentType<unknown>>>(
  loader: () => Promise<M>,
  name: keyof M,
) => lazy(() => loader().then((m) => ({ default: m[name] })))

const ListaTrabajos = lazyPage(() => import('./pages/ListaTrabajos'), 'ListaTrabajos')
const Cover = lazyPage(() => import('./pages/Cover'), 'Cover')
const Perfiles = lazyPage(() => import('./pages/Perfiles'), 'Perfiles')
const KeyMeeting = lazyPage(() => import('./pages/KeyMeeting'), 'KeyMeeting')
const Medicion = lazyPage(() => import('./pages/Medicion'), 'Medicion')
const CalculoTrace = lazyPage(() => import('./pages/CalculoTrace'), 'CalculoTrace')
const Comparacion = lazyPage(() => import('./pages/Comparacion'), 'Comparacion')
const Reporte = lazyPage(() => import('./pages/Reporte'), 'Reporte')
const RobReport = lazyPage(() => import('./pages/RobReport'), 'RobReport')
const MedicionMultigrado = lazyPage(() => import('./pages/MedicionMultigrado'), 'MedicionMultigrado')
const SmartReport = lazyPage(() => import('./pages/SmartReport'), 'SmartReport')
const DraftSurvey = lazyPage(() => import('./pages/DraftSurvey'), 'DraftSurvey')
const ShipShore = lazyPage(() => import('./pages/ShipShore'), 'ShipShore')
const Lpg = lazyPage(() => import('./pages/Lpg'), 'Lpg')
const LngDescarga = lazyPage(() => import('./pages/LngDescarga'), 'LngDescarga')
const LngReport = lazyPage(() => import('./pages/LngReport'), 'LngReport')
const Blend = lazyPage(() => import('./pages/Blend'), 'Blend')
const Utilidades = lazyPage(() => import('./pages/Utilidades'), 'Utilidades')
const Asistente = lazyPage(() => import('./pages/Asistente'), 'Asistente')
const Configuracion = lazyPage(() => import('./pages/Configuracion'), 'Configuracion')
const DesignGuide = lazyPage(() => import('./pages/DesignGuide'), 'DesignGuide')

function AppShell() {
  const location = useLocation()
  return (
    // key = pathname → re-monta y dispara la animación de entrada en cada navegación.
    <div key={location.pathname} className="flex flex-1 animate-fade flex-col overflow-hidden print:block print:overflow-visible">
      <Suspense fallback={<PageFallback />}>
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trabajos" element={<ListaTrabajos />} />
        <Route path="/utilidades" element={<Utilidades />} />
        <Route path="/asistente" element={<Asistente />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="/design" element={<DesignGuide />} />
        <Route path="/trabajo/:id/cover" element={<Cover />} />
        <Route path="/trabajo/:id/perfiles" element={<Perfiles />} />
        <Route path="/trabajo/:id/key-meeting" element={<KeyMeeting />} />
        <Route path="/trabajo/:id/medicion" element={<Medicion />} />
        <Route path="/trabajo/:id/calculo" element={<CalculoTrace />} />
        <Route path="/trabajo/:id/comparacion" element={<Comparacion />} />
        <Route path="/trabajo/:id/reporte" element={<Reporte />} />
        <Route path="/trabajo/:id/reporte/:op" element={<SmartReport />} />
        <Route path="/trabajo/:id/rob" element={<RobReport />} />
        <Route path="/trabajo/:id/multigrado" element={<MedicionMultigrado />} />
        <Route path="/trabajo/:id/draft" element={<DraftSurvey />} />
        <Route path="/trabajo/:id/ship-shore" element={<ShipShore />} />
        <Route path="/trabajo/:id/lpg" element={<Lpg />} />
        <Route path="/trabajo/:id/lng-descarga" element={<LngDescarga />} />
        <Route path="/trabajo/:id/lng-descarga/reporte" element={<LngReport />} />
        <Route path="/trabajo/:id/blend" element={<Blend />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </div>
  )
}

export function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        {/* Provider fuera del AppShell (que se re-monta por ruta) → la medición
            editada sobrevive al navegar Medición → Reporte. */}
        <JobMeasurementProvider>
          <div className="flex h-screen w-full overflow-hidden bg-background text-foreground print:block print:h-auto print:overflow-visible">
            <AppSidebar />
            <AppShell />
          </div>
          {/* Primer arranque (escritorio): decisión del usuario sobre la IA local */}
          <AiSetupDialog />
        </JobMeasurementProvider>
      </BrowserRouter>
    </TooltipProvider>
  )
}

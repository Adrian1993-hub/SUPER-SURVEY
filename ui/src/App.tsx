import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { TooltipProvider } from './components/ui/tooltip'
import { JobMeasurementProvider } from './lib/jobStore'
import { AppSidebar } from './components/AppSidebar'
import { Dashboard } from './pages/Dashboard'
import { ListaTrabajos } from './pages/ListaTrabajos'
import { Cover } from './pages/Cover'
import { Perfiles } from './pages/Perfiles'
import { KeyMeeting } from './pages/KeyMeeting'
import { Medicion } from './pages/Medicion'
import { CalculoTrace } from './pages/CalculoTrace'
import { Comparacion } from './pages/Comparacion'
import { Reporte } from './pages/Reporte'
import { RobReport } from './pages/RobReport'
import { MedicionMultigrado } from './pages/MedicionMultigrado'
import { SmartReport } from './pages/SmartReport'
import { DraftSurvey } from './pages/DraftSurvey'
import { ShipShore } from './pages/ShipShore'
import { Lpg } from './pages/Lpg'
import { Blend } from './pages/Blend'
import { Utilidades } from './pages/Utilidades'
import { Configuracion } from './pages/Configuracion'
import { DesignGuide } from './pages/DesignGuide'

function AppShell() {
  const location = useLocation()
  return (
    // key = pathname → re-monta y dispara la animación de entrada en cada navegación.
    <div key={location.pathname} className="flex flex-1 animate-fade flex-col overflow-hidden print:block print:overflow-visible">
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trabajos" element={<ListaTrabajos />} />
        <Route path="/utilidades" element={<Utilidades />} />
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
        <Route path="/trabajo/:id/blend" element={<Blend />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
        </JobMeasurementProvider>
      </BrowserRouter>
    </TooltipProvider>
  )
}

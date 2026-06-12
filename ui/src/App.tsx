import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { TooltipProvider } from './components/ui/tooltip'
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
import { Utilidades } from './pages/Utilidades'

function AppShell() {
  const location = useLocation()
  return (
    // key = pathname → re-monta y dispara la animación de entrada en cada navegación.
    <div key={location.pathname} className="flex flex-1 animate-fade flex-col overflow-hidden print:block print:overflow-visible">
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/trabajos" element={<ListaTrabajos />} />
        <Route path="/utilidades" element={<Utilidades />} />
        <Route path="/trabajo/:id/cover" element={<Cover />} />
        <Route path="/trabajo/:id/perfiles" element={<Perfiles />} />
        <Route path="/trabajo/:id/key-meeting" element={<KeyMeeting />} />
        <Route path="/trabajo/:id/medicion" element={<Medicion />} />
        <Route path="/trabajo/:id/calculo" element={<CalculoTrace />} />
        <Route path="/trabajo/:id/comparacion" element={<Comparacion />} />
        <Route path="/trabajo/:id/reporte" element={<Reporte />} />
        <Route path="/trabajo/:id/rob" element={<RobReport />} />
        <Route path="/trabajo/:id/multigrado" element={<MedicionMultigrado />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <div className="flex h-screen w-full overflow-hidden bg-background text-foreground print:block print:h-auto print:overflow-visible">
          <AppSidebar />
          <AppShell />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  )
}

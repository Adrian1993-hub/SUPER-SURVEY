import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TooltipProvider } from './components/ui/tooltip'
import { AppSidebar } from './components/AppSidebar'
import { ListaTrabajos } from './pages/ListaTrabajos'
import { Cover } from './pages/Cover'
import { Perfiles } from './pages/Perfiles'
import { KeyMeeting } from './pages/KeyMeeting'
import { Medicion } from './pages/Medicion'
import { CalculoTrace } from './pages/CalculoTrace'
import { Comparacion } from './pages/Comparacion'
import { Reporte } from './pages/Reporte'

export function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
          <AppSidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Routes>
              <Route path="/" element={<ListaTrabajos />} />
              <Route path="/trabajo/:id/cover" element={<Cover />} />
              <Route path="/trabajo/:id/perfiles" element={<Perfiles />} />
              <Route path="/trabajo/:id/key-meeting" element={<KeyMeeting />} />
              <Route path="/trabajo/:id/medicion" element={<Medicion />} />
              <Route path="/trabajo/:id/calculo" element={<CalculoTrace />} />
              <Route path="/trabajo/:id/comparacion" element={<Comparacion />} />
              <Route path="/trabajo/:id/reporte" element={<Reporte />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  )
}

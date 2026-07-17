import { describe, it, expect } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { JobMeasurementProvider, useJobMeasurement } from './jobStore'
import { vmrData } from '../data/vmr'

// Sonda: expone las longitudes y el primer TOV, y un botón que edita el primer
// tanque de "before" (para verificar autosave + rehidratación).
function Probe() {
  const { before, after, setBefore } = useJobMeasurement()
  return (
    <div>
      <span data-testid="before-len">{before.length}</span>
      <span data-testid="after-len">{after.length}</span>
      <span data-testid="before-0-tov">{before[0]?.tov ?? ''}</span>
      <button onClick={() => setBefore((p) => p.map((t, i) => (i === 0 ? { ...t, tov: 999.5 } : t)))}>edit</button>
    </div>
  )
}

describe('jobStore — autosave/restore round-trip', () => {
  it('siembra desde los datos demo cuando localStorage está vacío', () => {
    render(
      <JobMeasurementProvider>
        <Probe />
      </JobMeasurementProvider>,
    )
    expect(screen.getByTestId('before-len').textContent).toBe(String(vmrData.before.tanques.length))
    expect(screen.getByTestId('after-len').textContent).toBe(String(vmrData.after.tanques.length))
  })

  it('persiste una edición a localStorage y la rehidrata en un provider nuevo', () => {
    const { unmount } = render(
      <JobMeasurementProvider>
        <Probe />
      </JobMeasurementProvider>,
    )
    act(() => {
      screen.getByText('edit').click()
    })

    // Autosave (useEffect) → localStorage con el valor editado.
    const raw = localStorage.getItem('ss-measurement-before')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw as string)[0].tov).toBe(999.5)

    // Un provider nuevo (recarga) hidrata desde localStorage, no desde el demo.
    unmount()
    render(
      <JobMeasurementProvider>
        <Probe />
      </JobMeasurementProvider>,
    )
    expect(screen.getByTestId('before-0-tov').textContent).toBe('999.5')
  })
})

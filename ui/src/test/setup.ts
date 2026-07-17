// Setup global de los tests: limpia el DOM montado y el localStorage entre casos
// para que cada test parta de un estado limpio (importante para jobStore y el
// separador decimal, que persisten en localStorage).
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  try {
    localStorage.clear()
  } catch {
    /* jsdom sin storage → nada que limpiar */
  }
})

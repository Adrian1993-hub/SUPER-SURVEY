import { describe, it, expect, beforeEach } from 'vitest'
import { parseDec, formatDec, formatDecNatural, getDecimalSep, setDecimalSep } from './num'

// El separador es estado de módulo (persiste en localStorage); resetear a 'dot'
// (default) antes de cada caso para aislarlos.
beforeEach(() => setDecimalSep('dot'))

describe('parseDec — modo punto (default)', () => {
  it('parsea un decimal normal', () => expect(parseDec('0.9534')).toBe(0.9534))
  it('es retrocompatible con coma-como-decimal (sin regresión)', () => expect(parseDec('0,9534')).toBe(0.9534))
  it('trata la coma como separador de miles', () => expect(parseDec('1,234.56')).toBe(1234.56))
  it('devuelve 0 para cadena vacía', () => expect(parseDec('')).toBe(0))
  it('devuelve 0 para no-numérico', () => expect(parseDec('abc')).toBe(0))
  it('preserva la precisión de un TOV típico', () => expect(parseDec('222.680')).toBe(222.68))
})

describe('parseDec — modo coma', () => {
  beforeEach(() => setDecimalSep('comma'))
  it('parsea la coma como decimal', () => expect(parseDec('0,9534')).toBe(0.9534))
  it('trata el punto como separador de miles', () => expect(parseDec('1.234,56')).toBe(1234.56))
  it('tolera punto decimal cuando no hay coma', () => expect(parseDec('0.95')).toBe(0.95))
})

describe('INVARIANTE del kernel: String(n) siempre usa punto', () => {
  it('String(n) es punto incluso en modo coma (así serializa kernel.ts)', () => {
    setDecimalSep('comma')
    // kernel.ts hace `String(i.density15)` — debe ser independiente del separador.
    expect(String(0.9534)).toBe('0.9534')
    expect(String(1234.56)).toBe('1234.56')
  })
})

describe('formatDec / formatDecNatural (solo display)', () => {
  it('formatDec usa punto por defecto', () => expect(formatDec(0.9534, 4)).toBe('0.9534'))
  it('formatDec usa coma cuando se configura', () => {
    setDecimalSep('comma')
    expect(formatDec(0.9534, 4)).toBe('0,9534')
  })
  it('formatDec respeta los decimales pedidos', () => expect(formatDec(1, 3)).toBe('1.000'))
  it('formatDecNatural no rellena ceros', () => expect(formatDecNatural(0.95)).toBe('0.95'))
  it('formatDecNatural: 0 → vacío (celda en blanco)', () => expect(formatDecNatural(0)).toBe(''))
  it('formatDecNatural usa coma cuando se configura', () => {
    setDecimalSep('comma')
    expect(formatDecNatural(0.95)).toBe('0,95')
  })
})

describe('setDecimalSep / getDecimalSep', () => {
  it('persiste el separador en localStorage', () => {
    setDecimalSep('comma')
    expect(getDecimalSep()).toBe('comma')
    expect(localStorage.getItem('ss-decimal')).toBe('comma')
  })
})

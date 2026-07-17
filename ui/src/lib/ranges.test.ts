import { describe, it, expect } from 'vitest'
import { checkRange, FIELD_RANGES } from './ranges'

describe('checkRange — dentro de banda', () => {
  it('densidad típica de VLSFO es válida', () => expect(checkRange('density15', 0.95).ok).toBe(true))
  it('temperatura de bunker caliente es válida', () => expect(checkRange('temp', 60).ok).toBe(true))
  it('0/vacío se trata como «no ingresado» (no molesta)', () => {
    expect(checkRange('density15', 0).ok).toBe(true)
    expect(checkRange('temp', 0).ok).toBe(true)
  })
})

describe('checkRange — fuera de banda (atrapa errores de dedo)', () => {
  it('marca densidad bajo el mínimo (error de punto decimal 0.09534)', () => {
    const v = checkRange('density15', 0.09534)
    expect(v.ok).toBe(false)
    expect(v.bound).toBe('min')
    expect(v.overBy).toBeCloseTo(FIELD_RANGES.density15.min - 0.09534, 5)
    expect(v.pct).toBeGreaterThan(0)
  })
  it('marca densidad sobre el máximo (9.534)', () => {
    const v = checkRange('density15', 9.534)
    expect(v.ok).toBe(false)
    expect(v.bound).toBe('max')
  })
  it('marca temperatura absurda por confusión de unidad', () => {
    const v = checkRange('temp', 350)
    expect(v.ok).toBe(false)
    expect(v.bound).toBe('max')
  })
  it('el % es el exceso relativo al límite (240 °C = 100% sobre 120)', () => {
    const v = checkRange('temp', 2 * FIELD_RANGES.temp.max)
    expect(v.pct).toBeCloseTo(100, 6)
  })
})

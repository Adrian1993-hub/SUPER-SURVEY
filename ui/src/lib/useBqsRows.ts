// Hooks compartidos Medición/Reporte: TODA cifra gris sale del kernel WASM
// (mismo Rust validado que el escritorio). Aquí no se reimplementa ASTM.

import { useEffect, useState } from 'react'
import type { VmrTank } from '../data/vmr'
import { calcBqsRow } from './kernel'

const numOf = (s?: string) => (s == null ? NaN : Number(s))

/** Campos calculados por el kernel para una fila (lo que el surveyor NO teclea). */
export interface CalcFields {
  gov: number
  vcf: number
  gsv: number
  wcf56: number
  mt: number
  mtVac: number
}

/** Recalcula cada fila vía kernel cuando cambia un input relevante. */
export function useComputedRows(tanks: VmrTank[]): (CalcFields | null)[] {
  const [calc, setCalc] = useState<(CalcFields | null)[]>([])
  const key = JSON.stringify(tanks.map((t) => [t.densidad15, t.temp, t.tov, t.freeWaterVol]))
  useEffect(() => {
    let cancelled = false
    Promise.all(
      tanks.map((t) =>
        calcBqsRow({ density15: t.densidad15, temperature: t.temp, tov: t.tov, freeWater: t.freeWaterVol })
          .then((r): CalcFields | null =>
            r.success
              ? { gov: numOf(r.gov), vcf: numOf(r.vcf), gsv: numOf(r.gsv), wcf56: numOf(r.wcfAir), mt: numOf(r.mtAir), mtVac: numOf(r.mtVacuum) }
              : null,
          )
          .catch(() => null),
      ),
    ).then((res) => {
      if (!cancelled) setCalc(res)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return calc
}

/**
 * Totales de sección desde los valores vivos (con fallback al seed de la fila
 * hasta que el kernel responda). VCF/WCF totales = agregados defendibles
 * (ΣGSV/ΣGOV, ΣMT/ΣGSV); densidad y temperatura = medias ponderadas por GOV
 * (solo display).
 */
export function sectionTotals(tanks: VmrTank[], calc: (CalcFields | null)[]) {
  let tov = 0,
    gov = 0,
    gsv = 0,
    mt = 0,
    dW = 0,
    tW = 0
  tanks.forEach((t, i) => {
    const c = calc[i]
    const rGov = c ? c.gov : t.gov
    tov += t.tov
    gov += rGov
    gsv += c ? c.gsv : t.gsv
    mt += c ? c.mt : t.mt
    dW += t.densidad15 * rGov
    tW += t.temp * rGov
  })
  return {
    tov,
    gov,
    gsv,
    mt,
    vcf: gov > 0 ? gsv / gov : 0,
    wcf: gsv > 0 ? mt / gsv : 0,
    densidad: gov > 0 ? dW / gov : 0,
    temp: gov > 0 ? tW / gov : 0,
  }
}

export interface TransferredFigures {
  /** ΔGSV (after − before), m³ @15 °C — con signo. */
  gsv: number
  mtAir: number
  mtVac: number
  /** WCF Tabla 56 de la densidad del suplidor. */
  wcf: number
}

/**
 * Bloque Quantity Transferred de la hoja: MT = ΔGSV × densidad del SUPLIDOR
 * (vacío) y × WCF56 (aire). Se calcula con UNA llamada al kernel a 15 °C:
 * dt=0 → VCF=1 → GSV=TOV=|ΔGSV|, y el kernel aplica ρ y Tabla 56 con el
 * redondeo oficial (3 dp half-up) — idéntico a la hoja firmada.
 */
export function useTransferred(deltaGsv: number, supplierDensity: number): TransferredFigures | null {
  const [out, setOut] = useState<TransferredFigures | null>(null)
  useEffect(() => {
    let cancelled = false
    const magnitude = Math.abs(deltaGsv)
    const sign = deltaGsv < 0 ? -1 : 1
    if (!supplierDensity || !isFinite(magnitude)) {
      setOut(null)
      return
    }
    calcBqsRow({ density15: supplierDensity, temperature: 15, tov: magnitude })
      .then((r) => {
        if (cancelled) return
        if (!r.success) {
          setOut(null)
          return
        }
        setOut({
          gsv: sign * numOf(r.gsv),
          mtAir: sign * numOf(r.mtAir),
          mtVac: sign * numOf(r.mtVacuum),
          wcf: numOf(r.wcfAir),
        })
      })
      .catch(() => {
        if (!cancelled) setOut(null)
      })
    return () => {
      cancelled = true
    }
  }, [deltaGsv, supplierDensity])
  return out
}

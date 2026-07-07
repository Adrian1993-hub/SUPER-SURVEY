/** Parseo decimal tolerante (Postel's Law): acepta coma o punto como separador
 *  — un inspector que teclea `0,9534` no debe obtener 0. Devuelve 0 para
 *  entradas no numéricas (mismo contrato que los handlers previos). */
export function parseDec(s: string): number {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

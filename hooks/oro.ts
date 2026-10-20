// El oro del gremio: cuánto cuesta cada misión según el precio de la API.
// Con un plan de suscripción no se paga por token; estos montos sirven para
// comparar clases y ver cuánto ahorra el Código.

import type { GremioUsage } from '../types'

/** Precio en dólares por millón de tokens. */
type Price = { input: number; output: number; cacheRead: number; cacheWrite: number }

// Tabla de precios de la API (octubre de 2026). La escritura en caché se
// estima en 1,25 veces la entrada, el valor de la caché de 5 minutos.
const PRICES: Array<[RegExp, Price]> = [
  [/fable|mythos/i, { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 }],
  [/opus[-_ ]5[-_.]5/i, { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 }],
  [/opus/i, { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 }],
  [/sonnet[-_ ]4/i, { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 }],
  [/sonnet/i, { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 }],
  [/haiku[-_ ]5/i, { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 }],
  [/haiku/i, { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 }],
]

export function priceOf(model: string): Price | null {
  for (const [re, price] of PRICES) if (re.test(model)) return price
  return null
}

/** Lo que costó un uso con un modelo, en dólares; 0 si no se conoce el precio. */
export function costOf(model: string, u: GremioUsage): number {
  const p = priceOf(model)
  if (!p) return 0
  return (u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite) / 1_000_000
}

export function usageFrom(u: {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}): GremioUsage {
  return {
    input: u.input_tokens,
    output: u.output_tokens,
    cacheRead: u.cache_read_input_tokens,
    cacheWrite: u.cache_creation_input_tokens,
  }
}

export function addUsage(a: GremioUsage | null, b: GremioUsage): GremioUsage {
  if (!a) return b
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheRead: a.cacheRead + b.cacheRead,
    cacheWrite: a.cacheWrite + b.cacheWrite,
  }
}

export function totalTokens(u: GremioUsage): number {
  return u.input + u.output + u.cacheRead + u.cacheWrite
}

/** "US$0,042", con coma decimal. */
export function usd(n: number): string {
  const abs = Math.abs(n)
  if (abs > 0 && abs < 0.001) return 'menos de US$0,001'
  const text = abs.toFixed(abs < 1 ? 3 : 2).replace('.', ',')
  return `US$${text}`
}

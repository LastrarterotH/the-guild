// Las celdas de un Raster: carácter y dos colores, codificadas como las quiere
// el motor. Sin dependencias, para que sprites.ts y tema.ts lo compartan.

/** Deja el color de la terminal. */
export const DEFAULT_COLOR = 0x01000000

/** Una celda: su carácter y sus dos colores (DEFAULT_COLOR deja el de la terminal). */
export type Cell = { ch: string; fg: number; bg: number }

/** Codifica celdas (por filas) como las quiere un Raster. */
export function encodeCells(cells: readonly Cell[]): string {
  const words = new Uint32Array(cells.length * 3)
  cells.forEach((c, i) => {
    words[i * 3] = c.ch.codePointAt(0) ?? 0x20
    words[i * 3 + 1] = c.fg
    words[i * 3 + 2] = c.bg
  })
  return base64(new Uint8Array(words.buffer))
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function base64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0)
    out += B64[(n >> 18) & 63]
    out += B64[(n >> 12) & 63]
    out += b === undefined ? '=' : B64[(n >> 6) & 63]
    out += c === undefined ? '=' : B64[n & 63]
  }
  return out
}

// El aspecto de la Matrix que no son figuras: la lluvia digital que cae sobre
// el panel, con sus verdes.

import { DEFAULT_COLOR, encodeCells } from './celdas'

// La lluvia de la Matrix: una línea de katakana de media anchura y dígitos,
// distinta en cada columna y que cambia con el reloj del panel.
// Solo caracteres de una celda: katakana de media anchura (U+FF71…), dígitos y signos ASCII.
const RAIN = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789Z:=*+-<>|'

/** `width` caracteres de lluvia para el cuadro `frame` (vacíos donde no cae nada). */
export function rain(width: number, frame: number): string {
  let out = ''
  for (let x = 0; x < width; x++) {
    // Un ruido barato y fijo por columna y cuadro.
    const n = (Math.imul(x + 1, 2654435761) ^ Math.imul(Math.floor(frame / 3) + 1, 40503)) >>> 0
    out += n % 7 < 4 ? ' ' : (RAIN[n % RAIN.length] ?? ' ')
  }
  return out
}

// Los verdes de la lluvia, de la cabeza de la gota (casi blanca) a la cola.
const DROP = [0xd8ffd8, 0x5cff7a, 0x00ff41, 0x00c232, 0x008f11, 0x005f0b, 0x003b00]

/**
 * La lluvia como celdas de un Raster de `columns`×`rows`: en cada columna cae
 * una gota a su ritmo, con la cabeza clara y la cola que se apaga. Cambia en
 * cada cuadro, así que se dibuja con `$.ui.blit`, sin redibujar el panel.
 */
export function rainCells(columns: number, rows: number, frame: number): string {
  const cells = []
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const seed = (Math.imul(x + 1, 2654435761) >>> 0) % 1000
      const speed = 2 + (seed % 3) // cuadros por fila: 2 rápida, 4 lenta
      const length = 3 + (seed % 5)
      const period = rows + length + 6 + (seed % 12)
      const head = Math.floor((frame + seed * 7) / speed) % period
      const dist = head - y
      const glyph = RAIN[((x * 31 + y * 7 + Math.floor(frame / (4 + (seed % 4)))) * 13 + seed) % RAIN.length] ?? ' '
      if (dist < 0 || dist >= length) cells.push({ ch: ' ', fg: DEFAULT_COLOR, bg: DEFAULT_COLOR })
      else cells.push({ ch: glyph, fg: DROP[Math.min(DROP.length - 1, Math.floor((dist / length) * DROP.length))] ?? 0x00ff41, bg: DEFAULT_COLOR })
    }
  return encodeCells(cells)
}

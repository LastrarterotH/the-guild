// Pinta los sprites del gremio tal como los dibuja la terminal (celdas 1:2,
// cuadrantes, dos colores por celda) y los guarda como PNG para revisarlos.
// Uso: node tools/ver-sprites.mjs [ruta/a/sprites.ts] [salida.png] [escala]
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const [, , spritesArg = 'hooks/sprites.ts', outArg = '.vista/sprites.png', scaleArg = '2'] = process.argv
const { spriteCells, CELLS } = await import(pathToFileURL(resolve(spritesArg)).href)
const QUAD = [' ', '▘', '▝', '▀', '▖', '▌', '▞', '▛', '▗', '▚', '▐', '▜', '▄', '▙', '▟', '█']
const K = Number(scaleArg)
const CW = 8 * K
const CH = 16 * K
const BANDS = [[0x1e, 0x1f, 0x29], [0xf4, 0xf1, 0xea]]
const CLASSES = ['maestro', 'archimago', 'mago', 'bardo', 'picaro']
// Cada fila: una clase en grande (y cansada), chica, caminando, mini, mini desteñida (taberna) y caída.
const items = [['big', 'quieto'], ['big', 'cansado'], ['big', 'durmiendo'], ['small', 'quieto'], ['small', 'marcha'], ['mini', 'quieto'], ['mini', 'quieto', true], ['small', 'caido']]
const gap = 2
const rowCols = items.reduce((s, [z]) => s + CELLS[z].columns + gap, gap)
const rowRows = CELLS.big.rows + 1
const W = rowCols * CW
const H = CLASSES.length * rowRows * CH * 2
const img = Buffer.alloc(W * H * 3)
const decode = (b64, n) => {
  const b = Buffer.from(b64, 'base64')
  const w = new Uint32Array(b.buffer, b.byteOffset, n * 3)
  return Array.from({ length: n }, (_, i) => ({ ch: String.fromCodePoint(w[i * 3]), fg: w[i * 3 + 1], bg: w[i * 3 + 2] }))
}
CLASSES.forEach((cls, ci) => {
  BANDS.forEach((bg, bi) => {
    const top = (bi * CLASSES.length + ci) * rowRows
    for (let y = top * CH; y < (top + rowRows) * CH; y++) for (let x = 0; x < W; x++) img.set(bg, (y * W + x) * 3)
    const rgb = c => (c === 0x01000000 ? bg : [(c >> 16) & 255, (c >> 8) & 255, c & 255])
    let ox = gap
    for (const [size, pose, faded] of items) {
      const { columns, rows } = CELLS[size]
      const cells = decode(spriteCells(cls, pose, 1, size, faded === true), columns * rows)
      const oy = top + (CELLS.big.rows - rows)
      cells.forEach((cell, i) => {
        const cx = ox + (i % columns)
        const cy = oy + Math.floor(i / columns)
        const mask = QUAD.indexOf(cell.ch)
        for (let y = 0; y < CH; y++)
          for (let x = 0; x < CW; x++) {
            const q = (y < CH / 2 ? 0 : 2) + (x < CW / 2 ? 0 : 1)
            img.set(rgb(mask > 0 && (mask >> q) & 1 ? cell.fg : cell.bg), ((cy * CH + y) * W + cx * CW + x) * 3)
          }
      })
      ox += columns + gap
    }
  })
})
const ppm = outArg.replace(/\.png$/, '.ppm')
writeFileSync(ppm, Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), img]))
execFileSync('sips', ['-s', 'format', 'png', ppm, '--out', outArg], { stdio: 'ignore' })
console.log(outArg)

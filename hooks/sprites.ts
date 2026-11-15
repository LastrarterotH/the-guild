// Pixel art de los programas de la Matrix: las figuras están en
// sprites-matrix.ts; aquí, los nombres y colores de cada clase y el paso a
// celdas. Cada celda de la terminal guarda 2x2 píxeles con los caracteres de
// cuadrante (▘▝▀▖...). El relleno va como color de fondo para que el
// interlineado de la terminal no deje rayas.

import type { GremioClass } from '../types'
import { DEFAULT_COLOR, base64 } from './celdas'
import { tr } from './i18n'
import { matrixGrid } from './sprites-matrix'

export type Pose = 'quieto' | 'marcha' | 'parpadeo' | 'caido' | 'cansado' | 'durmiendo'
export type Size = 'big' | 'small' | 'mini'

type Px = number | null
export type Grid = Px[][]

const TERMINAL_DEFAULT = DEFAULT_COLOR

/** Color de cada clase para los textos del panel: fósforo verde, con un color propio por programa. */
export const CLASS_COLOR: Record<GremioClass, string> = {
  maestro: '#00ff41',
  archimago: '#e8e8f0',
  mago: '#f4a261',
  bardo: '#8fe3a0',
  picaro: '#ff4d4d',
}

export const CLASS_LABEL: Record<GremioClass, string> = {
  get maestro() {
    return tr('Arquitecto', 'Architect')
  },
  get archimago() {
    return tr('Neo', 'Neo')
  },
  get mago() {
    return tr('Oráculo', 'Oracle')
  },
  get bardo() {
    return tr('Agente', 'Agent')
  },
  get picaro() {
    return tr('Centinela', 'Sentinel')
  },
}

export const CLASS_PLURAL: Record<GremioClass, string> = {
  get maestro() {
    return tr('Arquitectos', 'Architects')
  },
  get archimago() {
    return tr('Elegidos', 'the Ones')
  },
  get mago() {
    return tr('Oráculos', 'Oracles')
  },
  get bardo() {
    return tr('Agentes', 'Agents')
  },
  get picaro() {
    return tr('Centinelas', 'Sentinels')
  },
}

/** La versión de cada programa, para la ficha. */
export const CLASS_LEVEL: Record<GremioClass, string> = {
  get maestro() {
    return tr('fuente', 'source')
  },
  archimago: 'v6.0',
  mago: 'v2.0',
  bardo: 'v1.0',
  picaro: 'v0.9',
}

export const CELLS: Record<Size, { columns: number; rows: number }> = {
  big: { columns: 18, rows: 10 },
  small: { columns: 9, rows: 5 },
  mini: { columns: 5, rows: 3 },
}

const QUAD = [' ', '▘', '▝', '▀', '▖', '▌', '▞', '▛', '▗', '▚', '▐', '▜', '▄', '▙', '▟', '█']

/** Pasa la grilla de píxeles a las celdas de un Raster. */
export function toCells(g: Grid): string {
  const rows = Math.floor(g.length / 2)
  const columns = Math.floor((g[0]?.length ?? 0) / 2)
  const words = new Uint32Array(columns * rows * 3)

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < columns; cx++) {
      const top = g[cy * 2] ?? []
      const bottom = g[cy * 2 + 1] ?? []
      const px: Px[] = [top[cx * 2] ?? null, top[cx * 2 + 1] ?? null, bottom[cx * 2] ?? null, bottom[cx * 2 + 1] ?? null]

      // Una celda pinta dos colores: se quedan los dos más usados.
      const counts = new Map<number, number>()
      for (const p of px) counts.set(p ?? -1, (counts.get(p ?? -1) ?? 0) + 1)
      const kept = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k)
        .slice(0, 2)

      // El color de fondo cubre la celda entera, también el interlineado de la
      // terminal; el carácter no. Por eso el relleno va de fondo y el carácter
      // pinta solo el detalle (un ojo, un borde).
      let fg = TERMINAL_DEFAULT
      let bg = TERMINAL_DEFAULT
      let ink = -2
      const [a, b] = kept
      if (a === undefined || (a === -1 && b === undefined)) {
        ink = -2
      } else if (b === undefined) {
        bg = a
      } else if (a === -1 || b === -1) {
        ink = a === -1 ? b : a
        fg = ink
      } else {
        bg = a
        fg = b
        ink = b
      }

      let mask = 0
      px.forEach((p, i) => {
        if ((p ?? -1) === ink) mask |= 1 << i
      })

      const at = (cy * columns + cx) * 3
      words[at] = (QUAD[mask] ?? ' ').codePointAt(0) ?? 0x20
      words[at + 1] = fg
      words[at + 2] = bg
    }
  }
  return base64(new Uint8Array(words.buffer))
}

const cache = new Map<string, string>()

/** La grilla de píxeles de un sprite (sin pasar a celdas). */
export function spriteGrid(cls: GremioClass, pose: Pose, frame: number, size: Size): Grid {
  return matrixGrid(cls, pose, frame, size)
}

// Desteñido: cada color se mezcla con un gris medio, que se apaga igual sobre
// fondo oscuro y claro (la terminal no tiene transparencia).
const FADE_TO = 0x7a7e8a
const FADE = 0.6

function fade(c: number): number {
  const mix = (shift: number) => {
    const a = (c >> shift) & 255
    const b = (FADE_TO >> shift) & 255
    return Math.round(a * (1 - FADE) + b * FADE) << shift
  }
  return mix(16) | mix(8) | mix(0)
}

/** Las celdas de un sprite, guardadas para no recalcularlas en cada cuadro; `faded`, desteñido (en reposo). */
export function spriteCells(cls: GremioClass, pose: Pose, frame: number, size: Size, faded = false): string {
  const id = `${cls}|${pose}|${frame % 2}|${size}|${faded ? 'f' : ''}`
  const hit = cache.get(id)
  if (hit) return hit
  const g = spriteGrid(cls, pose, frame, size)
  const cells = toCells(faded ? g.map(row => row.map(c => (c === null ? null : fade(c)))) : g)
  cache.set(id, cells)
  return cells
}

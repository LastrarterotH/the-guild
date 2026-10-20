// Pixel art de Clawd y sus aventureros. Cada celda de la terminal guarda 2x2
// píxeles con los caracteres de cuadrante (▘▝▀▖...), igual que el Clawd del
// arranque. El relleno va como color de fondo para que el interlineado de la
// terminal no deje rayas.

import type { GremioClass } from '../types'
import { tr } from './i18n'

export type Pose = 'quieto' | 'marcha' | 'parpadeo' | 'caido' | 'cansado' | 'durmiendo'
export type Size = 'big' | 'small' | 'mini'

type Px = number | null
export type Grid = Px[][]

const TERMINAL_DEFAULT = 0x01000000

const BODY = 0xd97757
const BODY_DOWN = 0x7d8491
const EYE = 0x1b1b26
const GOLD = 0xf4c542
const RUBY = 0xef476f
const SAPPHIRE = 0x4cc9f0
const BEARD = 0xf1f1f1
const VIOLET = 0x9b5de5
const BLUE = 0x3a86ff
const GREEN = 0x2bb673
const FEATHER = 0xef476f
const COWL = 0x8d99ae
const GLOW = 0xffd166
const GOLD_LIGHT = 0xfff3b0
const GOLD_DARK = 0xb8862b
const RUBY_DARK = 0xa8324f
const PEARL = 0xf7f3e8
const SPARK = 0xffffff
const SWEAT = 0x8fd3ff
const SNORE = 0xc7d7ff

// Cada vestimenta se dibuja con letras, una por píxel ('.' deja lo que hay).
// Cada bloque de 2x2 píxeles (una celda de la terminal) lleva a lo más dos
// colores, contando el vacío: por eso los brillos y sombras van por celdas.
const INK: Record<string, number> = {
  // Oro y gemas (la corona; estrellas y hebillas).
  Y: GOLD, L: GOLD_LIGHT, D: GOLD_DARK, R: RUBY, r: RUBY_DARK, S: SAPPHIRE, P: PEARL, W: SPARK,
  // Archimago: violeta en tres tonos y la barba con su sombra.
  V: VIOLET, v: 0xc39bff, u: 0x6a3db8, w: 0xc4c4d4,
  // Mago: azul en tres tonos.
  B: BLUE, b: 0x8cbcff, n: 0x1f55c4,
  // Bardo: verde en tres tonos y la pluma con su punta clara.
  G: GREEN, g: 0x7ee0ad, d: 0x17784a, F: FEATHER, f: 0xff9cb5,
  // Pícaro: gris en tres tonos y el pañuelo verde azulado (claro arriba).
  C: COWL, c: 0xbcc5d6, k: 0x5c6678, K: 0x4a4462, T: 0x2a9d8f, t: 0x5fc4b8,
}

// La vestimenta de cada clase: `small` sobre el sprite normal (18x10) y `big`
// al doble de detalle sobre el grande (36x20). La corona va centrada.
const OUTFIT: Record<GremioClass, { small: readonly string[]; big: readonly string[] }> = {
  maestro: {
    // Cinco puntas con perlas, brillo, sombra, un rubí y dos zafiros.
    small: ['....YY....', 'Y..YYYY..Y', 'LYYYYYYYYD', 'LYSYRRYSYD'],
    big: [
      '.......YY.......',
      '..PP..YYYY..PP..',
      '..LY..LYYD..YD..',
      '.LLYYYLYYDYYYDD.',
      'LYWSYYWRRRYYWSYD',
      'LYSSYYRRRrYYSSYD',
      'LLYYYYYYYYYYYYYD',
      'DDDDDDDDDDDDDDDD',
    ],
  },
  archimago: {
    // Sombrero alto con estrellas y cinta de oro; barba larga con sombra.
    small: [
      '........vV........',
      '......vvVVuu......',
      '.....vvVVYVVuu....',
      '..vvvvVVVVVVVVuu..',
      '..................',
      '..................',
      '......WWWWWW......',
      '.......WWWWw......',
      '........WW........',
    ],
    big: [
      '................vVVu................',
      '................vVVu................',
      '..............vvVVVVuu..............',
      '..............vvVYVVuu..............',
      '............vvVVVVVYVVuu............',
      '............vvVVVVYVVVuu............',
      '..........YYYYYYYYYYYYYYYY..........',
      '..vvvvvvvvVVVVVVVVVVVVVVVVuuuuuuuu..',
      '....................................',
      '....................................',
      '....................................',
      '....................................',
      '............WWWWWWWWWWWW............',
      '............WWWWWWWWWWww............',
      '............WWWWWWWWwwww............',
      '..............WWWWWWww..............',
      '..............WWWWwwww..............',
      '................WWww................',
    ],
  },
  mago: {
    // Sombrero con la punta doblada, una estrella y cinta dorada.
    small: ['..........bBnn....', '........bbBBn.....', '......bbBBYBnn....', '..bbbbBBBBBBBBnn..'],
    big: [
      '..........................nnnn......',
      '......................bbBBnn........',
      '....................bbBBBBnn........',
      '..................bbBBBBBBn.........',
      '................bbBBBYBBBBnn........',
      '..............bbBBBBYBBBBBnn........',
      '............YYYYYYYYYYYYYYYY........',
      '....bbbbbbbbBBBBBBBBBBBBBBBBnnnn....',
    ],
  },
  bardo: {
    // Gorra con hebilla dorada y una pluma roja que sube en diagonal.
    small: ['............ff....', '...........FFf....', '.....gGGGGGdFF....', '...gggGGGYGGddd...'],
    big: [
      '.............................f......',
      '...........................Fff......',
      '..........................FFF.......',
      '.........................FFF........',
      '............ggGGGGGGGGddFF..........',
      '..........ggGGGGGGGGGGdddd..........',
      '........ddddddddddYYdddddddd........',
      '......ggggggGGGGGGGGGGGGGGdddd......',
    ],
  },
  picaro: {
    // Capucha subida que enmarca la cara y un pañuelo verde azulado sobre la boca,
    // anudado al costado: pícaro, pero con los ojos de Clawd.
    small: [
      '......ccCCkk......',
      '....ccCCCCCCkk....',
      '...cCCCCCCCCCCk...',
      '...cCCCCCCCCCCk...',
      '...c..........k...',
      '...c..........k...',
      '....tttttttttt.T..',
      '....TTTTTTTTTT.T..',
    ],
    big: [
      '....................................',
      '....................................',
      '..............ccCCCCkk..............',
      '............ccCCCCCCCCkk............',
      '..........ccCCCCCCCCCCCCkk..........',
      '........ccCCCCCCCCCCCCCCCCkk........',
      '......ccCCCCCCCCCCCCCCCCCCCCkk......',
      '......ccCCCCCCCCCCCCCCCCCCCCkk......',
      '......cc....................kk......',
      '......cc....................kk......',
      '......cc....................kk......',
      '......cc....................kk......',
      '........tttttttttttttttttttttttt....',
      '........TTTTTTTTTTTTTTTTTTTTTTTT....',
      '................................TT..',
      '................................T...',
    ],
  },
}

/** Color de cada clase para los textos del panel. */
export const CLASS_COLOR: Record<GremioClass, string> = {
  maestro: '#f4c542',
  archimago: '#b47cff',
  mago: '#5b9bff',
  bardo: '#3ddc97',
  picaro: '#c9ccd6',
}

export const CLASS_LABEL: Record<GremioClass, string> = {
  get maestro() {
    return tr('Gran Maestre', 'Grand Master')
  },
  get archimago() {
    return tr('Archimago', 'Archmage')
  },
  get mago() {
    return tr('Mago', 'Mage')
  },
  get bardo() {
    return tr('Bardo', 'Bard')
  },
  get picaro() {
    return tr('Pícaro', 'Rogue')
  },
}

export const CLASS_PLURAL: Record<GremioClass, string> = {
  get maestro() {
    return tr('Grandes Maestres', 'Grand Masters')
  },
  get archimago() {
    return tr('Archimagos', 'Archmages')
  },
  get mago() {
    return tr('Magos', 'Mages')
  },
  get bardo() {
    return tr('Bardos', 'Bards')
  },
  get picaro() {
    return tr('Pícaros', 'Rogues')
  },
}

/** Nivel de D&D de cada clase, para la ficha. */
export const CLASS_LEVEL: Record<GremioClass, string> = {
  get maestro() {
    return tr('DM', 'DM')
  },
  get archimago() {
    return tr('Nv. 20', 'Lv. 20')
  },
  get mago() {
    return tr('Nv. 15', 'Lv. 15')
  },
  get bardo() {
    return tr('Nv. 10', 'Lv. 10')
  },
  get picaro() {
    return tr('Nv. 5', 'Lv. 5')
  },
}

export const CELLS: Record<Size, { columns: number; rows: number }> = {
  big: { columns: 18, rows: 10 },
  small: { columns: 9, rows: 5 },
  mini: { columns: 5, rows: 3 },
}

function blank(w: number, h: number): Grid {
  return Array.from({ length: h }, () => Array<Px>(w).fill(null))
}

function run(g: Grid, y: number, x0: number, x1: number, c: number): void {
  const row = g[y]
  if (!row) return
  for (let x = x0; x <= x1; x++) row[x] = c
}

function dot(g: Grid, x: number, y: number, c: number): void {
  const row = g[y]
  if (row) row[x] = c
}

/** Pinta un dibujo de letras centrado, desde la fila de arriba. */
function art(g: Grid, rows: readonly string[]): void {
  const x0 = Math.floor(((g[0]?.length ?? 0) - (rows[0]?.length ?? 0)) / 2)
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const c = INK[ch]
      if (c !== undefined) dot(g, x0 + x, y, c)
    }),
  )
}

/** El cuerpo de Clawd en una pose (18x10), sin vestimenta ni ojos. */
function body(pose: Pose, frame: number): Grid {
  const g = blank(18, 10)
  const isDown = pose === 'caido'
  const color = isDown ? BODY_DOWN : BODY
  const isStep = pose === 'marcha' && frame % 2 === 1
  const isWalking = pose === 'marcha'

  run(g, 4, 3, 14, color)
  run(g, 5, 3, 14, color)
  run(g, 6, 3, 14, color)
  run(g, 7, 3, 14, color)
  // Al marchar los brazos se balancean en contra: uno arriba, el otro abajo.
  run(g, isWalking && isStep ? 7 : 6, 1, 2, color)
  run(g, isWalking && !isStep ? 7 : 6, 15, 16, color)
  const legs = isDown ? [] : isStep ? [3, 5, 12, 14] : [4, 6, 11, 13]
  for (const x of legs) dot(g, x, 8, color)
  return g
}

/** Los ojos, a escala `k` (1 en el normal, 2 en el grande); el pícaro los tiene brillantes. */
function eyes(g: Grid, cls: GremioClass, pose: Pose, k: number): void {
  if (pose === 'parpadeo' || (pose === 'durmiendo' && k === 1)) return
  const eye = EYE
  // Cansado (y dormido): en el grande, los párpados caen hasta la mitad del ojo.
  const from = (pose === 'cansado' || pose === 'durmiendo') && k > 1 ? k - 1 : 0
  for (const [x, y] of [
    [5, 5],
    [12, 5],
  ] as const)
    for (let dy = from; dy < k; dy++) for (let dx = 0; dx < k; dx++) dot(g, x * k + dx, y * k + dy, eye)
  // Y una gotita de sudor en la frente.
  if (pose === 'cansado' && k > 1) {
    dot(g, 27, 8, SWEAT)
    dot(g, 26, 9, SWEAT)
    dot(g, 27, 9, SWEAT)
  }
  // Dormido: una «z» arriba, a la derecha de la corona.
  if (pose === 'durmiendo' && k > 1) {
    for (let x = 30; x <= 35; x++) dot(g, x, 1, SNORE)
    for (const [x, y] of [
      [34, 2],
      [35, 2],
      [32, 3],
      [33, 3],
      [30, 4],
      [31, 4],
    ] as const)
      dot(g, x, y, SNORE)
    for (let x = 30; x <= 35; x++) dot(g, x, 5, SNORE)
  }
}

/** Clawd vestido de su clase, en una pose y un cuadro de animación (18x10). */
function small(cls: GremioClass, pose: Pose, frame: number): Grid {
  const g = body(pose, frame)
  art(g, OUTFIT[cls].small)
  eyes(g, cls, pose, 1)
  return g
}

/** El grande (36x20): el cuerpo al doble y la vestimenta con el doble de detalle. */
function big(cls: GremioClass, pose: Pose, frame: number): Grid {
  const g = scale2(body(pose, frame))
  art(g, OUTFIT[cls].big)
  eyes(g, cls, pose, 2)
  return g
}

/** La versión mini (10x6), para cuando hay muchos en el campo. */
function mini(cls: GremioClass, pose: Pose, frame: number): Grid {
  const g = blank(10, 6)
  const isDown = pose === 'caido'
  const body = isDown ? BODY_DOWN : BODY
  const isStep = pose === 'marcha' && frame % 2 === 1

  run(g, 2, 1, 8, body)
  run(g, 3, 1, 8, body)
  run(g, 4, 0, 9, body)
  const legs = isDown ? [] : isStep ? [1, 3, 6, 8] : [2, 4, 5, 7]
  for (const x of legs) dot(g, x, 5, body)

  switch (cls) {
    case 'maestro':
      dot(g, 2, 0, GOLD)
      run(g, 0, 4, 5, GOLD)
      dot(g, 7, 0, GOLD)
      run(g, 1, 2, 7, GOLD)
      break
    case 'archimago':
      run(g, 0, 4, 5, GOLD)
      run(g, 1, 1, 8, VIOLET)
      break
    case 'mago':
      run(g, 0, 5, 6, BLUE)
      run(g, 1, 1, 8, BLUE)
      break
    case 'bardo':
      run(g, 1, 2, 7, GREEN)
      run(g, 0, 8, 8, FEATHER)
      run(g, 1, 8, 8, FEATHER)
      break
    case 'picaro': // capucha que enmarca la cara
      art(g, ['..CCCCCC..', '.CCCCCCCC.', '.C......C.', '.C......C.'])
      break
  }
  const eye = EYE
  if (pose !== 'parpadeo') {
    dot(g, 3, 3, eye)
    dot(g, 6, 3, eye)
  }
  return g
}

function scale2(g: Grid): Grid {
  return g.flatMap(row => {
    const wide = row.flatMap(px => [px, px])
    return [wide, [...wide]]
  })
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

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64(bytes: Uint8Array): string {
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

const cache = new Map<string, string>()

/** La grilla de píxeles de un sprite (sin pasar a celdas). */
export function spriteGrid(cls: GremioClass, pose: Pose, frame: number, size: Size): Grid {
  return size === 'mini' ? mini(cls, pose, frame) : size === 'big' ? big(cls, pose, frame) : small(cls, pose, frame)
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

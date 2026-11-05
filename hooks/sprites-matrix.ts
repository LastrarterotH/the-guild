// Pixel art del tema Matrix: el Arquitecto y sus programas. Mismas reglas que
// sprites.ts: cada celda de la terminal son 2x2 píxeles con a lo más dos colores
// (contando el vacío), así que todo se dibuja por bloques de dos.

import type { GremioClass } from '../types'
import type { Grid, Pose, Size } from './sprites'

type Px = number | null

const INK: Record<string, number> = {
  h: 0x15151c, // pelo oscuro
  H: 0xf7f7f7, // pelo blanco (el Arquitecto)
  q: 0x9a9aa5, // pelo gris (el Oráculo)
  s: 0xe8c39e, // piel clara
  p: 0xf0d9c0, // piel pálida (Neo)
  S: 0x8d5a3b, // piel oscura (el Oráculo)
  e: 0x15151c, // ojo
  g: 0x0a0a0f, // lentes oscuros
  x: 0x3a3a3a, // lentes redondos
  w: 0xf4f4f8, // camisa blanca
  t: 0x2a2f3a, // corbata
  k: 0x1d2430, // traje oscuro (los Agentes)
  l: 0xb9bcc8, // traje claro (el Arquitecto)
  n: 0x2b2b38, // abrigo de Neo
  K: 0x44445a, // camisa de Neo
  o: 0x3f7f7f, // chaleco del Oráculo
  c: 0x2d4f4f, // vestido del Oráculo
  d: 0x0a0a0f, // zapatos
  m: 0x8d99ae, // metal
  M: 0x5c6678, // metal en sombra (tentáculos)
  b: 0xbcc5d6, // metal con brillo
  r: 0xff2d2d, // ojo rojo
  R: 0x8a1c1c, // ojo rojo apagado
  // Solo en los grandes (36x20):
  i: 0xcfe6ff, // cristal de los lentes (reflejo de pantallas)
  z: 0xc9a07a, // sombra de la piel (nariz, boca)
  u: 0xdcdde6, // brillo del traje claro
  L: 0x8e92a2, // sombra del traje claro
  a: 0x2f3a4d, // brillo del traje oscuro
  J: 0x121820, // sombra del traje oscuro
  N: 0x3b3b4c, // brillo del abrigo de Neo
  j: 0x1a1a24, // sombra del abrigo de Neo
  O: 0x6fa8a8, // brillo del chaleco del Oráculo
  C: 0x1f3a3a, // sombra del chaleco del Oráculo
}

const SWEAT = 0x8fd3ff
const SNORE = 0xc7d7ff
const DOWN_TO = 0x7d8491

type Figure = {
  /** El grande (36x20) con el doble de detalle: 18 filas de arriba y los pies. */
  big: readonly string[]
  bigFeet: readonly [readonly string[], readonly string[]]
  /** Al cerrar los ojos, qué letra reemplaza a cuál. */
  shut: Readonly<Record<string, string>>
  /** Las ocho filas de arriba (18 de ancho). */
  body: readonly string[]
  /** Las dos filas de abajo, quieto y dando el paso. */
  feet: readonly [readonly string[], readonly string[]]
  /** La versión mini (10x6), quieto y dando el paso. */
  mini: readonly [readonly string[], readonly string[]]
}

type Human = {
  hair: string
  skin: string
  glasses: 'round' | 'wide' | 'small' | 'none'
  beard: boolean
  /** Traje: brillo, color y sombra. */
  hi: string
  suit: string
  sd: string
  shirt: string
  tie: string
}

/**
 * Una figura humana grande (36x20): cabeza de 9 filas (pelo, lentes, nariz y
 * barba), cuello, torso de 7 con solapas, camisa y corbata, brazos con manos,
 * y piernas con zapatos. La corbata va en las columnas 17-18 (el centro): una
 * celda admite dos colores, así que puede cruzar el borde de un bloque.
 */
function human(o: Human): Pick<Figure, 'big' | 'bigFeet'> {
  const { hair: h, skin: s, hi, suit: l, sd, shirt: w, tie: t } = o
  const pad = (row: string) => {
    const left = Math.floor((36 - row.length) / 2)
    return `${'.'.repeat(left)}${row}${'.'.repeat(36 - left - row.length)}`
  }
  const eyes =
    o.glasses === 'round'
      ? [`${s}${s}xxxx${s}${s}xxxx`, `${s}${s}xeix${s}${s}xiex`]
      : o.glasses === 'wide'
        ? [`${s}${s}gggggggggg`, `${s}${s}gggggggggg`]
        : o.glasses === 'small'
          ? [`${s}${s}gggg${s}${s}gggg`, `${s}${s}gggg${s}${s}gggg`]
          : [s.repeat(12), `${s}${s}${s}e${s}${s}${s}${s}e${s}${s}${s}`]
  const chin = o.beard
    ? [`${h}${h}${s.repeat(4)}zz${s}${s}${h}${h}`, h.repeat(12), `..${h.repeat(8)}..`]
    : [`${s.repeat(6)}zz${s.repeat(4)}`, `${s.repeat(5)}zzzz${s.repeat(3)}`, `..${s}${s}${s.repeat(4)}${s}${s}..`]
  const neck = o.beard ? `....${h}${h}${h}${h}....` : `....${s}${s}${s}${s}....`
  const head = [
    pad(h.repeat(8)),
    pad(h.repeat(12)),
    pad(`${h}${h}${s.repeat(8)}${h}${h}`),
    pad(`${h}${h}${s.repeat(8)}${h}${h}`),
    pad(eyes[0] ?? ''),
    pad(eyes[1] ?? ''),
    pad(chin[0] ?? ''),
    pad(chin[1] ?? ''),
    pad(neck),
  ]
  const torso = [
    pad(`${hi}${hi}${l}${l}${w.repeat(8)}${l}${l}${sd}${sd}`),
    pad(`${hi.repeat(4)}${l}${l}${w}${w}${w}${t}${t}${w}${w}${w}${l}${l}${sd.repeat(4)}`),
    pad(`${hi}${hi}${l.repeat(6)}${w}${t}${t}${w}${l.repeat(6)}${sd}${sd}`),
    pad(`${hi}${hi}${l.repeat(7)}${t}${t}${l.repeat(7)}${sd}${sd}`),
    pad(`${hi}${hi}${l.repeat(7)}${t}${t}${l.repeat(7)}${sd}${sd}`),
    pad(`${s}${s}${l.repeat(14)}${sd}${sd}${s}${s}`),
    pad(`${s}${s}${l.repeat(14)}${sd}${sd}${s}${s}`),
  ]
  const legs = (at: number) => `${'.'.repeat(at)}${l}${l}${sd}${sd}${'.'.repeat(36 - 2 * at - 8)}${l}${l}${sd}${sd}${'.'.repeat(at)}`
  const shoes = (at: number) => `${'.'.repeat(at)}dddd${'.'.repeat(36 - 2 * at - 8)}dddd${'.'.repeat(at)}`
  const feet0 = [legs(12), legs(12), shoes(12)]
  const feet1 = [legs(10), legs(10), shoes(10)]
  return { big: [...head, ...torso, ...feet0.slice(0, 1)], bigFeet: [feet0.slice(1), feet1.slice(1)] }
}

const FIGURE: Record<GremioClass, Figure> = {
  // El Arquitecto: pelo y barba blancos, lentes redondos, traje claro y corbata.
  maestro: {
    ...human({ hair: 'H', skin: 's', glasses: 'round', beard: true, hi: 'u', suit: 'l', sd: 'L', shirt: 'w', tie: 't' }),
    shut: { e: 'i' },
    body: [
      '......HHHHHH......',
      '......HHHHHH......',
      '......xxssxx......',
      '......HHssHH......',
      '....llllwwllll....',
      '....llllwtllll....',
      '..llllllwtllllll..',
      '..llllllttllllll..',
    ],
    feet: [
      ['..ss..ll....llss..', '......dd....dd....'],
      ['..ss..ll....llss..', '....dd........dd..'],
    ],
    mini: [
      ['....HH....', '....xx....', '..llwwll..', '..llwwll..', '..llllll..', '...l..l...'],
      ['....HH....', '....xx....', '..llwwll..', '..llwwll..', '..llllll..', '..l....l..'],
    ],
  },
  // Neo: abrigo largo oscuro, lentes pequeños, piel pálida.
  archimago: {
    ...human({ hair: 'h', skin: 'p', glasses: 'small', beard: false, hi: 'N', suit: 'n', sd: 'j', shirt: 'K', tie: 'K' }),
    shut: {},
    body: [
      '......hhhhhh......',
      '......hhhhhh......',
      '......gggggg......',
      '......pppppp......',
      '....nnnnKKnnnn....',
      '....nnnnKKnnnn....',
      '..nnnnnnKKnnnnnn..',
      '..nnnnnnnnnnnnnn..',
    ],
    feet: [
      ['..pp..nnnnnnnnpp..', '......dd....dd....'],
      ['..pp..nnnnnnnnpp..', '....dd........dd..'],
    ],
    mini: [
      ['....hh....', '....gg....', '..nnKKnn..', '..nnKKnn..', '..nnnnnn..', '...n..n...'],
      ['....hh....', '....gg....', '..nnKKnn..', '..nnKKnn..', '..nnnnnn..', '..n....n..'],
    ],
  },
  // El Oráculo: pelo gris, chaleco verde azulado, vestido oscuro.
  mago: {
    ...human({ hair: 'q', skin: 'S', glasses: 'none', beard: false, hi: 'O', suit: 'o', sd: 'C', shirt: 'c', tie: 'c' }),
    shut: { e: 'S' },
    body: [
      '......qqqqqq......',
      '......qqqqqq......',
      '......SeSSeS......',
      '......SSSSSS......',
      '....ooooccoooo....',
      '....ooooccoooo....',
      '..oooooooooooooo..',
      '..oooooooooooooo..',
    ],
    feet: [
      ['..SS..ccccccccSS..', '......dd....dd....'],
      ['..SS..ccccccccSS..', '....dd........dd..'],
    ],
    mini: [
      ['....qq....', '....SS....', '..ooccoo..', '..ooccoo..', '..cccccc..', '...c..c...'],
      ['....qq....', '....SS....', '..ooccoo..', '..ooccoo..', '..cccccc..', '..c....c..'],
    ],
  },
  // El Agente: traje oscuro, camisa blanca, corbata y lentes oscuros.
  bardo: {
    ...human({ hair: 'h', skin: 's', glasses: 'wide', beard: false, hi: 'a', suit: 'k', sd: 'J', shirt: 'w', tie: 't' }),
    shut: {},
    body: [
      '......hhhhhh......',
      '......hhhhhh......',
      '......gggggg......',
      '......ssssss......',
      '....kkkkwwkkkk....',
      '....kkkkwtkkkk....',
      '..kkkkkkwtkkkkkk..',
      '..kkkkkkttkkkkkk..',
    ],
    feet: [
      ['..ss..kk....kkss..', '......dd....dd....'],
      ['..ss..kk....kkss..', '....dd........dd..'],
    ],
    mini: [
      ['....hh....', '....gg....', '..kkwwkk..', '..kkwwkk..', '..kkkkkk..', '...k..k...'],
      ['....hh....', '....gg....', '..kkwwkk..', '..kkwwkk..', '..kkkkkk..', '..k....k..'],
    ],
  },
  // El Centinela: cúpula de metal con ojos rojos y tentáculos que se mueven.
  picaro: {
    big: [
      '..............bbbbmmmm..............',
      '............bbbbmmmmmmmm............',
      '..........bbbbmmmmmmmmmmMM..........',
      '..........bbmmmmmmmmmmmmMM..........',
      '........bbmmrrmmrrmmrrmmMMMM........',
      '........bbmmrrmmrrmmrrmmMMMM........',
      '........mmmmmmmmmmmmmmmmMMMM........',
      '........mmmmmmmmmmmmmmmmMMMM........',
      '..........mmmmmmmmmmmmmmMM..........',
      '............mmmmmmmmmmMM............',
      '..............MMMMMMMM..............',
      '............MM..MM..MM..MM..........',
      '..........MM..MM....MM..MM..........',
      '..........MM..MM....MM..MM..........',
      '........MM....MM....MM....MM........',
      '........MM....MM....MM....MM........',
      '........MM..MM........MM..MM........',
      '........MM..MM........MM..MM........',
    ],
    bigFeet: [
      ['......MM..MM..........MM..MM........', '......MM..MM..........MM..MM........'],
      ['..........MM..MM....MM..MM..........', '..........MM..MM....MM..MM..........'],
    ],
    shut: { r: 'R' },
    body: [
      '......bbmmmm......',
      '....bbmmmmmmMM....',
      '....mmrrmmrrMM....',
      '....mmmmmmmmMM....',
      '....mmmmmmmmMM....',
      '......mmmmMM......',
      '....MM..MM..MM....',
      '....MM..MM..MM....',
    ],
    feet: [
      ['..MM....MM....MM..', '..MM....MM....MM..'],
      ['....MM..MM..MM....', '....MM..MM..MM....'],
    ],
    mini: [
      ['..mmmmmm..', '..mmrrmm..', '...mmmm...', '...mmmm...', '..MM..MM..', '..MM..MM..'],
      ['..mmmmmm..', '..mmrrmm..', '...mmmm...', '...mmmm...', '...MMMM...', '..MM..MM..'],
    ],
  },
}

function blank(w: number, h: number): Grid {
  return Array.from({ length: h }, () => Array<Px>(w).fill(null))
}

/** Pinta las filas de letras desde arriba a la izquierda; `shut` reemplaza letras (ojos cerrados). */
function paint(g: Grid, rows: readonly string[], y0: number, shut: Readonly<Record<string, string>>): void {
  rows.forEach((row, dy) =>
    [...row].forEach((ch, x) => {
      const c = INK[shut[ch] ?? ch]
      if (c === undefined) return
      const line = g[y0 + dy]
      if (line) line[x] = c
    }),
  )
}

/** Caído: todo se apaga hacia un gris. */
function grayed(g: Grid): Grid {
  const mix = (c: number) => {
    const ch = (shift: number) => Math.round((((c >> shift) & 255) * 3 + ((DOWN_TO >> shift) & 255) * 7) / 10) << shift
    return ch(16) | ch(8) | ch(0)
  }
  return g.map(row => row.map(c => (c === null ? null : mix(c))))
}

function dot(g: Grid, x: number, y: number, c: number): void {
  const row = g[y]
  if (row) row[x] = c
}

/** El sprite de una clase de la Matrix, en una pose, un cuadro y un tamaño. */
export function matrixGrid(cls: GremioClass, pose: Pose, frame: number, size: Size): Grid {
  const fig = FIGURE[cls]
  const step = pose === 'marcha' && frame % 2 === 1 ? 1 : 0
  const shut = pose === 'parpadeo' || pose === 'durmiendo' ? fig.shut : {}
  let g: Grid
  if (size === 'mini') {
    g = blank(10, 6)
    paint(g, fig.mini[step], 0, shut)
  } else if (size === 'big') {
    g = blank(36, 20)
    paint(g, fig.big, 0, shut)
    paint(g, fig.bigFeet[step], 18, shut)
  } else {
    g = blank(18, 10)
    paint(g, fig.body, 0, shut)
    paint(g, fig.feet[step], 8, shut)
  }
  if (pose === 'caido') return grayed(g)
  if (size === 'big' && pose === 'cansado') {
    dot(g, 27, 8, SWEAT)
    dot(g, 26, 9, SWEAT)
    dot(g, 27, 9, SWEAT)
  }
  if (size === 'big' && pose === 'durmiendo') {
    for (let x = 30; x <= 35; x++) dot(g, x, 1, SNORE)
    for (const [x, y] of [[34, 2], [35, 2], [32, 3], [33, 3], [30, 4], [31, 4]] as const) dot(g, x, y, SNORE)
    for (let x = 30; x <= 35; x++) dot(g, x, 5, SNORE)
  }
  return g
}

// Las naves de Zion: en el tema Matrix cada sesión se llama como una nave de la
// flota (la Nabucodonosor, la Logos, la Osiris…). El nombre sale del id de la
// sesión, así que es el mismo cada vez que se abre; si otra sesión viva ya lo
// lleva, se toma el siguiente libre.

/** La flota de Zion, por las películas. */
export const SHIPS = [
  'Nabucodonosor',
  'Logos',
  'Osiris',
  'Vigilante',
  'Ícaro',
  'Gnosis',
  'Caduceo',
  'Mjolnir',
  'Brahma',
  'Ganesha',
  'Novalis',
  'Vishnu',
  'Mnemosyne',
] as const

/** Un número estable (FNV-1a) a partir de un texto. */
function hash(text: string): number {
  let h = 0x811c9dc5
  for (const ch of text) {
    h ^= ch.codePointAt(0) ?? 0
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/** La nave de una sesión: la que le toca por su id, o la siguiente libre si ya la lleva otra. */
export function shipFor(key: string, taken: readonly string[] = []): string {
  const start = hash(key) % SHIPS.length
  for (let i = 0; i < SHIPS.length; i++) {
    const ship = SHIPS[(start + i) % SHIPS.length] as string
    if (!taken.includes(ship)) return ship
  }
  // Más sesiones que naves: la que le toca, con un número de refuerzo.
  const ship = SHIPS[start] as string
  const n = taken.filter(t => t === ship || t.startsWith(`${ship} `)).length + 1
  return `${ship} ${n}`
}

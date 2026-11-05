// El tema: la narrativa con que se cuenta lo mismo. «guild» es la de siempre
// (Clawd, el Gran Maestre y sus aventureros). «matrix» recuenta todo dentro de
// la Matrix: el Arquitecto envía programas (Centinela, Agente, Oráculo y Neo).
// El tema no cambia la mecánica: solo el glosario, los dibujos, los colores y
// los sonidos. Se elige con `/guild theme matrix` y se recuerda entre sesiones.

import type { Lang } from './i18n'

export type Theme = 'guild' | 'matrix'

let current: Theme = 'guild'

/** El tema con que se cuenta la sesión ahora. */
export function theme(): Theme {
  return current
}

/** Cambia el tema de esta sesión. */
export function setTheme(next: Theme): void {
  current = next
}

/** Lo que pide `/guild theme <x>`: un tema, o null si no se entiende. */
export function themeChoice(text: string): Theme | null {
  const t = text.trim().toLowerCase()
  if (/^(matrix|the matrix|la matrix)$/.test(t)) return 'matrix'
  if (/^(guild|gremio|clawd|clásico|clasico|classic|default|normal)$/.test(t)) return 'guild'
  return null
}

type Rule = [RegExp, string]

/** Una palabra suelta, en minúscula y con mayúscula inicial (los bordes entienden tildes: `\b` no). */
function word(from: string, to: string): Rule[] {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const whole = (w: string) => new RegExp(`(?<![\\p{L}\\p{N}])${w}(?![\\p{L}\\p{N}])`, 'gu')
  return [
    [whole(from), to],
    [whole(cap(from)), cap(to)],
  ]
}

/** Una frase tal cual (sin variar mayúsculas). */
function phrase(from: string, to: string): Rule[] {
  return [[new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to]]
}

// Los iconos cambian igual en los dos idiomas.
const ICONS: Rule[] = [
  [/🪙/g, '🔋'],
  [/🧭/g, '🔌'],
  [/💰/g, '💾'],
  [/🏰/g, '🌐'],
  [/🔔/g, '☎️'],
  [/👑/g, '🖥️'],
  [/🍺/g, '⬜'],
  [/📖/g, '🧾'],
]

// Primero las frases largas, después las palabras sueltas: así «Código del
// Gremio» no se vuelve «Código del Matrix» por el camino.
const ES: Rule[] = [
  ...phrase('Gremio de Clawd', 'Matrix del Arquitecto'),
  ...phrase('Código del Gremio', 'Código de la Matrix'),
  ...phrase('Gremio abierto', 'Matrix abierta'),
  ...phrase('Gremio cerrado', 'Matrix cerrada'),
  ...phrase('Tesoro del gremio', 'Energía de la Matrix'),
  ...phrase('Del oro gastado', 'De la energía gastada'),
  ...phrase('a Clawd', 'al Arquitecto'),
  ...phrase('A Clawd', 'Al Arquitecto'),
  ...phrase('de Clawd', 'del Arquitecto'),
  ...phrase('De Clawd', 'Del Arquitecto'),
  ...phrase('Clawd', 'el Arquitecto'),
  ...phrase('del gremio', 'de la Matrix'),
  ...phrase('al gremio', 'a la Matrix'),
  ...phrase('el gremio', 'la Matrix'),
  ...phrase('El gremio', 'La Matrix'),
  ...word('gremio', 'Matrix'),
  ...phrase('Grandes Maestres', 'Arquitectos'),
  ...phrase('GRAN MAESTRE', 'ARQUITECTO'),
  ...phrase('Gran Maestre', 'Arquitecto'),
  ...phrase('a un Archimago', 'a Neo'),
  ...phrase('un Archimago', 'Neo'),
  ...phrase('Archimagos', 'Elegidos'),
  ...phrase('Archimago', 'Neo'),
  ...word('magos', 'oráculos'),
  ...word('mago', 'oráculo'),
  ...word('bardos', 'agentes'),
  ...word('bardo', 'agente'),
  ...word('pícaros', 'centinelas'),
  ...word('pícaro', 'centinela'),
  ...word('aventureros', 'programas'),
  ...word('aventurero', 'programa'),
  ...word('aventurera', 'programa'),
  ...phrase('en misión', 'conectado'),
  ...word('misiones', 'conexiones'),
  ...word('misión', 'conexión'),
  ...phrase('del botín', 'de la descarga'),
  ...phrase('al botín', 'a la descarga'),
  ...phrase('el botín', 'la descarga'),
  ...phrase('El botín', 'La descarga'),
  ...word('botín', 'descarga'),
  ...phrase('a la taberna', 'al Constructo'),
  ...phrase('de la taberna', 'del Constructo'),
  ...phrase('la taberna', 'el Constructo'),
  ...phrase('La taberna', 'El Constructo'),
  ...word('taberna', 'Constructo'),
  ...phrase('del reino', 'de la Red'),
  ...phrase('al reino', 'a la Red'),
  ...phrase('el reino', 'la Red'),
  ...phrase('El reino', 'La Red'),
  ...word('reino', 'Red'),
  ...word('vida', 'señal'),
  ...word('monedas', 'baterías'),
  ...word('moneda', 'batería'),
  ...word('oro', 'energía'),
  ...phrase('la bolsa', 'la celda'),
  ...phrase('La bolsa', 'La celda'),
  ...word('bolsa', 'celda'),
  ...phrase('el cofre', 'la reserva'),
  ...phrase('El cofre', 'La reserva'),
  ...word('cofre', 'reserva'),
  ...phrase('una siesta', 'un déjà vu'),
  ...word('siesta', 'déjà vu'),
  ...phrase('envió a', 'conectó a'),
  ...phrase('enviar a', 'conectar a'),
  ...phrase('enviado por', 'conectado por'),
  ...phrase('No enviarlo', 'No conectarlo'),
  ...phrase('enviarlo', 'conectarlo'),
  ...word('volvieron', 'se desconectaron'),
  ...word('volvió', 'se desconectó'),
  ...phrase('¿Lo autorizas?', '¿Píldora roja? (sí = lo autorizas)'),
  ...ICONS,
]

const EN: Rule[] = [
  ...phrase("Clawd's Guild", "the Architect's Matrix"),
  ...phrase("Clawd's", "the Architect's"),
  ...phrase('Clawd', 'the Architect'),
  ...phrase('Guild Code', 'Matrix Code'),
  ...phrase('Guild treasury', 'Matrix power'),
  ...word('guild', 'Matrix'),
  ...phrase('Grand Masters', 'Architects'),
  ...phrase('GRAND MASTER', 'ARCHITECT'),
  ...phrase('Grand Master', 'Architect'),
  ...phrase('an Archmage', 'Neo'),
  ...phrase('Archmages', 'the Ones'),
  ...phrase('Archmage', 'Neo'),
  ...phrase('a Mage', 'an Oracle'),
  ...word('mages', 'oracles'),
  ...word('mage', 'oracle'),
  ...word('bards', 'agents'),
  ...word('bard', 'agent'),
  ...word('rogues', 'sentinels'),
  ...word('rogue', 'sentinel'),
  ...word('adventurers', 'programs'),
  ...word('adventurer', 'program'),
  ...phrase('on a quest', 'jacked in'),
  ...word('quests', 'connections'),
  ...word('quest', 'connection'),
  ...word('loot', 'download'),
  ...word('tavern', 'Construct'),
  ...word('realm', 'Network'),
  ...phrase('HP', 'signal'),
  ...word('coins', 'batteries'),
  ...word('coin', 'battery'),
  ...word('gold', 'energy'),
  ...word('purse', 'cell'),
  ...word('chest', 'reserve'),
  ...word('nap', 'déjà vu'),
  ...phrase('sent by', 'jacked in by'),
  ...word('sent', 'jacked in'),
  ...word('sends', 'jacks in'),
  ...word('send', 'jack in'),
  ...phrase('came back', 'unplugged'),
  ...phrase('Do you approve?', 'Red pill? (yes = approve)'),
  ...ICONS,
]

// «Clawd» siempre iba con mayúscula; «el Arquitecto» la lleva solo al principio
// del texto, tras un icono o tras un punto: «🔔 El Arquitecto terminó».
const CAPITALIZE = /(^|[\p{Extended_Pictographic}\uFE0F]\s+|[.!?]\s+)(el Arquitecto|the Architect)/gu

/** El mismo texto contado en otro tema (hoy, solo «matrix» cambia algo). */
export function recastAs(text: string, lang: Lang, to: Theme): string {
  if (to !== 'matrix') return text
  let out = text
  for (const [re, rep] of lang === 'en' ? EN : ES) out = out.replace(re, rep)
  return out.replace(CAPITALIZE, (_m, lead: string, art: string) => `${lead}${art.charAt(0).toUpperCase()}${art.slice(1)}`)
}

/** El texto contado en el tema actual. */
export function recast(text: string, lang: Lang): string {
  return recastAs(text, lang, current)
}

// La lluvia de la Matrix: una línea de katakana de media anchura y dígitos,
// distinta en cada columna y que cambia con el reloj del panel.
const RAIN = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789Z:・=*+-<>¦|'

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

// El Código del Gremio: qué modelo va a cada misión, con qué esfuerzo, con qué
// permisos y con qué largo de informe.

import type { GremioClass, GremioEffort, GremioTask } from '../types'

export type Alias = 'haiku' | 'sonnet' | 'opus'

export type Plan = {
  /** El tipo de misión: decide la clase de partida. */
  task: GremioTask
  alias: Alias
  /** Por qué, en pocas palabras, para la ficha y la orden del día. */
  why: string
  /** Un explorador no edita ni crea archivos. */
  isReadOnly: boolean
  /** Largo máximo del informe final, en palabras. */
  words: number
  /** Cuánto piensa el modelo: buscar pide poco, diseñar pide mucho. */
  effort: GremioEffort
}

const HEAVY =
  /(dise[ñn]|arquitect|planific|depur|debug|causa ra[ií]z|root cause|audit|seguridad|security|refactor|migra|revisi[oó]n cr[ií]tica|critical review|demuestr|prove|optimiz)/i
// Los imperativos con pronombre llevan tilde (corrígelo, edítalo), así que
// cada raíz acepta la vocal con o sin ella.
const WRITES =
  /(impl[eé]ment|escr[ií]b|ed[ií]t|cr[eé][aá]|modif[ií]c|corr[ií]g|arr[eé]gl|red[aá]ct|trad[uú]c|gen[eé]r[aá]|constr[uú]y|\bwrite|\bfix|\bbuild|translat|refactor)/i
const LIGHT =
  /(busc|b[uú]squ|encuentr|identific|localiz|\blist|enumer|cuenta|cont[aá]r|verific|comprueb|cheque|clasific|extra[eé]|\bfind|search|locate|identify|\bcheck|classif|\bcount|look ?up|d[oó]nde est|which file|qu[eé] archivo)/i

/** Lo que el Código haría con una misión, mirando su descripción y el comienzo del encargo. */
export function plan(description: string, prompt: string): Plan {
  const text = `${description}\n${prompt.slice(0, 240)}`
  if (HEAVY.test(text)) {
    return planFor('disenar', true)
  }
  if (LIGHT.test(text) && !WRITES.test(text)) {
    return planFor('identificar', false)
  }
  return planFor('investigar', true)
}

/** El plan para un tipo de misión; `writes` dice si necesita tocar archivos. */
export function planFor(task: GremioTask, writes: boolean): Plan {
  if (task === 'disenar') {
    return { task, alias: 'opus', why: 'tarea de diseño o análisis profundo', isReadOnly: false, words: 800, effort: 'high' }
  }
  if (task === 'identificar') {
    return { task, alias: 'haiku', why: 'tarea de identificar o buscar', isReadOnly: !writes, words: 200, effort: 'low' }
  }
  return { task, alias: 'sonnet', why: 'tarea de investigar, resumir o implementar', isReadOnly: false, words: 500, effort: 'medium' }
}

const CLASS_ALIAS: Partial<Record<GremioClass, Alias>> = { picaro: 'haiku', bardo: 'sonnet', mago: 'opus' }
const ALIAS_CLASS: Record<Alias, GremioClass> = { haiku: 'picaro', sonnet: 'bardo', opus: 'mago' }

/** Sube un plan a otra clase (cuando la experiencia lo pide). */
export function raise(p: Plan, cls: GremioClass): Plan {
  const alias = CLASS_ALIAS[cls] ?? p.alias
  return {
    ...p,
    alias,
    isReadOnly: alias === 'haiku' && p.isReadOnly,
    effort: alias === 'opus' ? 'high' : alias === 'sonnet' ? 'medium' : 'low',
    words: alias === 'opus' ? 800 : alias === 'sonnet' ? 500 : 200,
  }
}

export function classOfAlias(alias: Alias): GremioClass {
  return ALIAS_CLASS[alias]
}

export function isFable(model: string | undefined): boolean {
  return model !== undefined && /fable|mythos/i.test(model)
}

/** El alias de un modelo dado como alias o id completo. */
export function aliasOf(model: string): Alias | 'fable' | null {
  const m = model.toLowerCase()
  if (m.includes('fable') || m.includes('mythos')) return 'fable'
  if (m.includes('opus')) return 'opus'
  if (m.includes('sonnet')) return 'sonnet'
  if (m.includes('haiku')) return 'haiku'
  return null
}

const SETS_LENGTH = /(m[aá]ximo|hasta|no m[aá]s de|max(imum)?|at most|under)\s+(de\s+)?\d+\s+(palabras|words)/i

/** El encargo ya dice cuánto debe medir el informe. */
export function setsLength(prompt: string): boolean {
  return SETS_LENGTH.test(prompt)
}

/** Las reglas que se suman al final del encargo: la misión acotada. */
export function brief(p: Plan, prompt: string): string {
  const lines = ['[Misión acotada · Gremio de Clawd]', '- Haz solo lo que pide la misión; no explores de más.']
  if (p.isReadOnly) lines.push('- Solo lectura: no edites ni crees archivos; informa y quien te envió decide.')
  if (!setsLength(prompt)) lines.push(`- Informe final: máximo ${p.words} palabras, directo, con rutas o fuentes exactas.`)
  lines.push('- Si algo no se puede confirmar, dilo en vez de suponer.')
  return `\n\n${lines.join('\n')}`
}

/** El esfuerzo que corresponde a cada modelo, cuando lo eligió Clawd. */
export function effortFor(alias: Alias | 'fable' | null): GremioEffort {
  if (alias === 'haiku') return 'low'
  if (alias === 'sonnet') return 'medium'
  return 'high'
}

/** El Código que lee Clawd, el Gran Maestre (el modelo de la sesión principal). */
export const DOCTRINE = `# Código del Gremio (mod "gremio")

Cuando delegues trabajo con la herramienta Agent, elige siempre el parámetro \`model\` según la tarea; el mod fija el esfuerzo de cada uno:
- haiku (Pícaro, esfuerzo bajo): identificar, buscar, localizar, listar, clasificar o verificar un dato. Misión breve; el mod la deja en solo lectura.
- sonnet (Bardo, esfuerzo medio): investigar, resumir, implementar algo acotado, escribir o traducir.
- opus (Mago, esfuerzo alto): diseño, arquitectura, depuración difícil, revisión crítica o de seguridad.
- fable (Archimago): solo si la tarea de verdad lo exige; el mod le pide permiso a la persona antes de enviarlo.

Dale a cada agente una misión acotada: objetivo, dónde mirar, qué devolver y un largo máximo de informe. No uses forks (copias con toda la conversación) para tareas livianas. En \`description\` pon la tarea en pocas palabras: la persona la ve en su panel.

Si un aventurero que acaba de volver trabajó en lo mismo que la nueva tarea, retómalo con SendMessage (to: su id) en vez de enviar uno nuevo: conserva su memoria y no hay que explicarle todo otra vez. Al empezar cada turno el gremio te dice quiénes se pueden retomar.`

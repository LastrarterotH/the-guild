// El Código del Gremio: qué modelo va a cada misión, con qué esfuerzo, con qué
// permisos y con qué largo de informe.

import type { GremioClass, GremioEffort, GremioTask } from '../types'
import { tr } from './i18n'

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
  /(dise[ñn]|\bdesign|architect|arquitect|\bplanning|planific|depur|debug|causa ra[ií]z|root cause|audit|seguridad|security|refactor|migra|revisi[oó]n cr[ií]tica|critical review|demuestr|prove|optimiz)/i
// Los imperativos con pronombre llevan tilde (corrígelo, edítalo), así que
// cada raíz acepta la vocal con o sin ella.
const WRITES =
  /(impl[eé]ment|escr[ií]b|ed[ií]t|cr[eé][aá]|modif[ií]c|corr[ií]g|arr[eé]gl|red[aá]ct|trad[uú]c|gen[eé]r[aá]|constr[uú]y|\bwrite|\bfix|\bbuild|translat|refactor|\bmodify|\bdraft)/i
const LIGHT =
  /(busc|b[uú]squ|encuentr|identific|localiz|\blist|enumer|cuenta|cont[aá]r|verific|comprueb|cheque|clasific|extra[eé]|\bfind|search|locate|\bverify|enumerate|extract|where is|identify|\bcheck|classif|\bcount|look ?up|d[oó]nde est|which file|qu[eé] archivo)/i

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
    return { task, alias: 'opus', why: tr('tarea de diseño o análisis profundo', 'design or deep analysis task'), isReadOnly: false, words: 800, effort: 'high' }
  }
  if (task === 'identificar') {
    return { task, alias: 'haiku', why: tr('tarea de identificar o buscar', 'identify or search task'), isReadOnly: !writes, words: 200, effort: 'low' }
  }
  return { task, alias: 'sonnet', why: tr('tarea de investigar, resumir o implementar', 'research, summarize or implement task'), isReadOnly: false, words: 500, effort: 'medium' }
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
  const lines = [
    tr('[Misión acotada · Gremio de Clawd]', "[Scoped quest · Clawd's Guild]"),
    tr('- Haz solo lo que pide la misión; no explores de más.', '- Do only what the quest asks; do not explore more than needed.'),
  ]
  if (p.isReadOnly) {
    lines.push(
      tr(
        '- Solo lectura: no edites ni crees archivos; informa y quien te envió decide.',
        '- Read-only: do not edit or create files; report back and whoever sent you decides.',
      ),
    )
  }
  if (!setsLength(prompt)) {
    lines.push(
      tr(
        `- Informe final: máximo ${p.words} palabras, directo, con rutas o fuentes exactas.`,
        `- Final report: at most ${p.words} words, direct, with exact paths or sources.`,
      ),
    )
  }
  lines.push(tr('- Si algo no se puede confirmar, dilo en vez de suponer.', '- If something cannot be confirmed, say so instead of assuming.'))
  return `\n\n${lines.join('\n')}`
}

/** El esfuerzo que corresponde a cada modelo, cuando lo eligió Clawd. */
export function effortFor(alias: Alias | 'fable' | null): GremioEffort {
  if (alias === 'haiku') return 'low'
  if (alias === 'sonnet') return 'medium'
  return 'high'
}

/** El Código que lee Clawd, el Gran Maestre (el modelo de la sesión principal). */
export const DOCTRINE = `# Código del Gremio (mod "guild")

Cuando delegues trabajo con la herramienta Agent, elige siempre el parámetro \`model\` según la tarea; el mod fija el esfuerzo de cada uno:
- haiku (Pícaro, esfuerzo bajo): identificar, buscar, localizar, listar, clasificar o verificar un dato. Misión breve; el mod la deja en solo lectura.
- sonnet (Bardo, esfuerzo medio): investigar, resumir, implementar algo acotado, escribir o traducir.
- opus (Mago, esfuerzo alto): diseño, arquitectura, depuración difícil, revisión crítica o de seguridad.
- fable (Archimago): solo si la tarea de verdad lo exige; el mod le pide permiso a la persona antes de enviarlo.

Dale a cada agente una misión acotada: objetivo, dónde mirar, qué devolver y un largo máximo de informe. No uses forks (copias con toda la conversación) para tareas livianas. En \`description\` pon la tarea en pocas palabras: la persona la ve en su panel.

Si un aventurero que acaba de volver trabajó en lo mismo que la nueva tarea, retómalo con SendMessage (to: su id) en vez de enviar uno nuevo: conserva su memoria y no hay que explicarle todo otra vez. Al empezar cada turno el gremio te dice quiénes se pueden retomar.`


const DOCTRINE_EN = `# Guild Code (mod "guild")

When you delegate work with the Agent tool, always pick the \`model\` parameter according to the task; the mod sets each one's effort:
- haiku (Rogue, low effort): identify, search, locate, list, classify or verify a fact. Short quest; the mod makes it read-only.
- sonnet (Bard, medium effort): research, summarize, implement something scoped, write or translate.
- opus (Mage, high effort): design, architecture, hard debugging, critical or security review.
- fable (Archmage): only if the task truly demands it; the mod asks the person for permission before sending it.

Give each agent a scoped quest: goal, where to look, what to return and a maximum report length. Do not use forks (copies with the whole conversation) for light tasks. In \`description\` put the task in a few words: the person sees it in their panel.

If an adventurer who just came back worked on the same thing as the new task, resume it with SendMessage (to: its id) instead of sending a new one: it keeps its memory and you do not have to explain everything again. At the start of each turn the guild tells you who can be resumed.`

/** El Código en el idioma de la sesión (el que se inyecta al modelo). */
export function doctrineText(): string {
  return tr(DOCTRINE, DOCTRINE_EN)
}

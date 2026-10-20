// La experiencia del gremio: cómo le fue a cada clase en cada tipo de misión.
// Se guarda entre sesiones. Si una clase falla seguido en un tipo de misión, la
// próxima parecida sube a la clase siguiente.

import type { GremioClass, GremioTask } from '../types'

/** Por "tipo|clase", las últimas misiones: de quién fueron y si salieron bien. */
export type Xp = Record<string, Array<{ id: string; ok: boolean }>>

const KEEP = 8
const LADDER: GremioClass[] = ['picaro', 'bardo', 'mago']

const TASK_WORD: Record<GremioTask, string> = {
  identificar: 'identificar o buscar',
  investigar: 'investigar o implementar',
  disenar: 'diseño o análisis profundo',
}

export function taskWord(task: GremioTask): string {
  return TASK_WORD[task]
}

function keyOf(task: GremioTask, cls: GremioClass): string {
  return `${task}|${cls}`
}

/** Anota cómo salió una misión. */
export function record(xp: Xp, task: GremioTask, cls: GremioClass, id: string, ok: boolean): Xp {
  const key = keyOf(task, cls)
  const list = (xp[key] ?? []).filter(r => r.id !== id)
  return { ...xp, [key]: [...list, { id, ok }].slice(-KEEP) }
}

/** Cambia el resultado de una misión ya anotada (tu calificación manda). */
export function flip(xp: Xp, id: string, ok: boolean): Xp {
  const next: Xp = {}
  for (const [key, list] of Object.entries(xp)) next[key] = list.map(r => (r.id === id ? { ...r, ok } : r))
  return next
}

/** Si a una clase le va mal en un tipo de misión, la clase que debería ir en su lugar. */
export function promote(xp: Xp, task: GremioTask, cls: GremioClass): { cls: GremioClass; why: string } | null {
  const at = LADDER.indexOf(cls)
  if (at < 0 || at === LADDER.length - 1) return null
  const list = xp[keyOf(task, cls)] ?? []
  const bad = list.filter(r => !r.ok).length
  if (bad < 2 || bad / list.length < 0.4) return null
  const up = LADDER[at + 1]
  if (!up) return null
  return { cls: up, why: `fallaron ${bad} de sus últimas ${list.length} misiones de ${TASK_WORD[task]}` }
}

/** Cómo le va a una clase en un tipo de misión, para la ficha. */
export function recordOf(xp: Xp, task: GremioTask, cls: GremioClass): { good: number; total: number } {
  const list = xp[keyOf(task, cls)] ?? []
  return { good: list.filter(r => r.ok).length, total: list.length }
}

/** Lee la respuesta del clasificador: {"tipo": "...", "escribe": true|false}. */
export function parseVerdict(text: string): { task: GremioTask; writes: boolean } | null {
  const tipo = /"tipo"\s*:\s*"(identificar|investigar|disenar|diseñar)"/i.exec(text)?.[1]?.toLowerCase()
  if (!tipo) return null
  const task: GremioTask = tipo === 'diseñar' ? 'disenar' : (tipo as GremioTask)
  const writes = /"escribe"\s*:\s*true/i.test(text)
  return { task, writes }
}

export const CLASSIFIER_SYSTEM =
  'Clasificas misiones para un gremio de agentes de IA. Respondes solo con un JSON de una línea, sin explicación.'

export function classifierPrompt(description: string, prompt: string): string {
  return `Misión: «${description}»
Encargo (comienzo): «${prompt.slice(0, 600)}»

Responde exactamente con {"tipo": "identificar" | "investigar" | "disenar", "escribe": true | false}
- identificar: buscar, localizar, listar, verificar un dato, clasificar.
- investigar: investigar, resumir, escribir o traducir textos, implementar algo acotado.
- disenar: diseño, arquitectura, depuración difícil, revisión crítica o de seguridad.
- escribe: true solo si la misión necesita crear o editar archivos.`
}

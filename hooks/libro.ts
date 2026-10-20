// Lo que el libro cuenta de la cuota del plan. La cuota es de la cuenta, no de
// la sesión: si cada sesión abierta sumara lo que sube, con cuatro abiertas se
// contaría cuatro veces. Por eso se guarda, por ventana, el porcentaje más bajo
// y el más alto que vio cualquier sesión, y se suma la diferencia.

import type { GremioBook } from '../types'

/** Por ventana (la hora en que se rellena, redondeada a 10 min): [más bajo, más alto]. */
export type Seen = Record<string, [number, number]>

/** Ventanas que se recuerdan por tipo; las más viejas pasan a la base. */
const KEEP = { five: 60, week: 20 }

/** La ventana, por su hora de relleno redondeada (la API la informa con segundos de diferencia). */
export function windowKey(resetsAt: string): string | null {
  const at = Date.parse(resetsAt)
  return Number.isFinite(at) ? String(Math.round(at / 600_000)) : null
}

function see(seen: Seen, key: string, percent: number): Seen {
  const cur = seen[key]
  if (cur && percent >= cur[0] && percent <= cur[1]) return seen
  return { ...seen, [key]: cur ? [Math.min(cur[0], percent), Math.max(cur[1], percent)] : [percent, percent] }
}

function spent(seen: Seen): number {
  return Object.values(seen).reduce((sum, [lo, hi]) => sum + Math.max(0, hi - lo), 0)
}

/** Deja solo las `keep` ventanas más recientes; lo de las demás pasa a `base`. */
function trim(seen: Seen, keep: number): { seen: Seen; dropped: number } {
  const keys = Object.keys(seen).sort((a, b) => Number(a) - Number(b))
  if (keys.length <= keep) return { seen, dropped: 0 }
  const next: Seen = {}
  let dropped = 0
  keys.forEach((k, i) => {
    const v = seen[k]
    if (!v) return
    if (i < keys.length - keep) dropped += Math.max(0, v[1] - v[0])
    else next[k] = v
  })
  return { seen: next, dropped }
}

type Reading = { percent: number; resetsAt: string | null } | undefined

function absorbOne(seen: Seen | undefined, base: number, legacy: number, r: Reading, keep: number) {
  // La primera vez, lo contado a la antigua queda como base.
  let start = seen ? base : legacy
  let next = seen ?? {}
  const key = r?.resetsAt ? windowKey(r.resetsAt) : null
  if (r && key) next = see(next, key, r.percent)
  const t = trim(next, keep)
  start += t.dropped
  return { seen: t.seen, base: start, points: start + spent(t.seen), isSame: seen !== undefined && t.seen === seen }
}

/** Suma al libro una lectura de las ventanas; devuelve el mismo libro si no cambió nada. */
export function absorbQuota(b: GremioBook, five: Reading, week: Reading): GremioBook {
  const f = absorbOne(b.fiveSeen, b.fiveBase ?? 0, b.fivePoints, five, KEEP.five)
  const w = absorbOne(b.weekSeen, b.weekBase ?? 0, b.weekPoints, week, KEEP.week)
  if (f.isSame && w.isSame) return b
  return { ...b, fiveSeen: f.seen, fiveBase: f.base, fivePoints: f.points, weekSeen: w.seen, weekBase: w.base, weekPoints: w.points }
}

/** Días que el libro recuerda el gasto por proyecto. */
const PROJECT_DAYS = 8

/** Suma un gasto (dólares de la API, estimado) a un proyecto en un día (AAAA-MM-DD). */
export function addProjectSpend(b: GremioBook, day: string, project: string, usd: number): GremioBook {
  if (!(usd > 0)) return b
  const days = { ...(b.projects ?? {}) }
  const today = { ...(days[day] ?? {}) }
  today[project] = (today[project] ?? 0) + usd
  days[day] = today
  const keep = Object.keys(days).sort().slice(-PROJECT_DAYS)
  return { ...b, projects: Object.fromEntries(keep.map(k => [k, days[k] ?? {}])) }
}

/** La parte de cada proyecto en esos días, de mayor a menor; los chicos se juntan en «otros». */
export function projectShares(b: GremioBook, days: readonly string[], top = 4): Array<{ project: string; share: number }> {
  const sum: Record<string, number> = {}
  for (const d of days) for (const [p, usd] of Object.entries(b.projects?.[d] ?? {})) sum[p] = (sum[p] ?? 0) + usd
  const total = Object.values(sum).reduce((a, v) => a + v, 0)
  if (total <= 0) return []
  const sorted = Object.entries(sum)
    .map(([project, usd]) => ({ project, share: (usd / total) * 100 }))
    .sort((a, b2) => b2.share - a.share)
  if (sorted.length <= top + 1) return sorted
  const rest = sorted.slice(top).reduce((a, v) => a + v.share, 0)
  return [...sorted.slice(0, top), { project: 'otros', share: rest }]
}

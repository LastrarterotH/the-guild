// La cuota del plan: las ventanas de 5 horas y de 7 días que informa la API
// en cada respuesta, el ritmo de consumo y si alcanza hasta el reinicio.

import type { GremioQuota } from '../types'
import { tr } from './i18n'

export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

export const EMPTY_QUOTA: GremioQuota = { windows: [], samples: [], sessionFive: 0, sessionWeek: 0 }

const KEEP = 240

const KIND_LABEL: Record<string, () => string> = {
  five_hour: () => '5 h',
  seven_day: () => tr('7 días', '7 days'),
  seven_day_opus: () => tr('7 días Opus', '7 days Opus'),
  seven_day_sonnet: () => tr('7 días Sonnet', '7 days Sonnet'),
}

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind]?.() ?? kind.replace(/_/g, ' ')
}

/** Cuánto subió una ventana desde la lectura anterior; si se reinició, cuenta desde cero. */
function rise(prev: { percent: number } | undefined, cur: Limit | undefined): number {
  if (!prev || !cur) return 0
  if (cur.percentUsed < prev.percent - 0.5) return cur.percentUsed
  return Math.max(0, cur.percentUsed - prev.percent)
}

/** Suma una lectura nueva: actualiza las ventanas, la muestra y lo consumido en la sesión. */
export function absorb(q: GremioQuota, limits: readonly Limit[], at: number): { quota: GremioQuota; five: number; week: number } {
  if (limits.length === 0) return { quota: q, five: 0, week: 0 }
  const prevOf = (kind: string) => q.windows.find(w => w.kind === kind)
  const curOf = (kind: string) => limits.find(l => l.kind === kind)
  const five = rise(prevOf('five_hour'), curOf('five_hour'))
  const week = rise(prevOf('seven_day'), curOf('seven_day'))
  const nowFive = curOf('five_hour')?.percentUsed
  const prevFive = prevOf('five_hour')?.percent
  // Si la ventana de 5 h se reinició, el ritmo se mide de nuevo.
  const isReset = nowFive !== undefined && prevFive !== undefined && nowFive < prevFive - 0.5
  const samples = nowFive === undefined ? q.samples : [...(isReset ? [] : q.samples), { at, five: nowFive }].slice(-KEEP)
  return {
    quota: {
      windows: limits.map(l => ({ kind: l.kind, percent: l.percentUsed, resetsAt: l.resetsAt ?? null })),
      samples,
      sessionFive: q.sessionFive + five,
      sessionWeek: q.sessionWeek + week,
    },
    five,
    week,
  }
}

/** Puntos de la ventana de 5 h por hora, medidos en la última hora; null con menos de 10 minutos. */
export function ratePerHour(q: GremioQuota, now: number): number | null {
  const recent = q.samples.filter(s => now - s.at <= 60 * 60 * 1000)
  const first = recent[0]
  const last = recent[recent.length - 1]
  if (!first || !last) return null
  const hours = (last.at - first.at) / 3_600_000
  if (hours < 10 / 60) return null
  return Math.max(0, (last.five - first.five) / hours)
}

/** Si al ritmo actual alcanza la ventana de 5 h hasta que se reinicie. */
export function forecast(q: GremioQuota, now: number): { isEnough: boolean; msToFull: number; msToReset: number } | null {
  const w = q.windows.find(x => x.kind === 'five_hour')
  const rate = ratePerHour(q, now)
  if (!w || !w.resetsAt || rate === null || rate < 0.05) return null
  const msToReset = Date.parse(w.resetsAt) - now
  if (!Number.isFinite(msToReset)) return null
  const msToFull = ((100 - w.percent) / rate) * 3_600_000
  return { isEnough: msToFull >= msToReset, msToFull, msToReset }
}

/** "4,2%" con coma decimal; "menos de 0,1%" para lo muy chico. */
export function pctText(n: number): string {
  if (n > 0 && n < 0.05) return tr('menos de 0,1%', 'less than 0.1%')
  return tr(`${n.toFixed(1).replace('.', ',').replace(/,0$/, '')}%`, `${n.toFixed(1).replace(/\.0$/, '')}%`)
}

/** Monedas con un decimal: "3,8"; "menos de 0,1" para lo muy chico. 1 moneda = 1% de la cuota. */
export function coinText(n: number): string {
  if (n > 0 && n < 0.05) return tr('menos de 0,1', 'less than 0.1')
  return tr(n.toFixed(1).replace('.', ',').replace(/,0$/, ''), n.toFixed(1).replace(/\.0$/, ''))
}

/** "2 h 10 min", "45 min", "3 d 4 h". */
export function span(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h ${min % 60} min`
  return `${Math.floor(h / 24)} d ${h % 24} h`
}

/** Una barra de la ventana: ▮ lo usado, ▯ lo libre. */
export function bar(percent: number, width: number): string {
  const full = Math.max(0, Math.min(width, Math.round((percent / 100) * width)))
  return '▮'.repeat(full) + '▯'.repeat(width - full)
}

export function barColor(percent: number): string {
  return percent >= 80 ? '#ef476f' : percent >= 50 ? '#ffd166' : '#3ddc97'
}

// El mapa de la Red: las naves vivas como árbol (con sus programas), los
// enlaces entre sesiones, las sesiones que colaboran en la misma carpeta, los
// choques (dos sesiones editando el mismo archivo) y la línea de tiempo del
// turno. Todo puro: recibe los latidos y devuelve líneas de texto ya cortadas.

import type { GremioCrewMember, GremioHero, GremioRealmEntry, GremioTalk } from '../types'
import { cut } from './describe'
import { PHASE_ICON, stripIcon } from './fase'
import type { Phase } from './fase'
import { tr } from './i18n'
import { nameOf, REALM_ICON, TALK_MS } from './reino'

/** Los archivos editados que cuentan para un choque: los de los últimos 10 minutos. */
export const EDIT_WINDOW_MS = 10 * 60_000
/** Cuántos archivos editados viajan en el latido. */
export const EDITS_MAX = 12
/** Cuántos programas viajan en el latido. */
export const CREW_MAX = 8

type Entry = GremioRealmEntry

// ── Lo que viaja en el latido ───────────────────────────────────────────────

/** La tripulación en curso, compacta para el latido (hasta 8, el objetivo cortado). */
export function crewOf(list: readonly GremioHero[], phaseFor: (u: GremioHero) => Phase | null): GremioCrewMember[] {
  return list
    .filter(u => u.status === 'running')
    .sort((a, b) => a.startedAt - b.startedAt)
    .slice(0, CREW_MAX)
    .map(u => ({
      id: u.id,
      name: u.name,
      cls: u.cls,
      phase: phaseFor(u),
      goal: cut(u.description, 32),
      parent: u.parentId,
      ...(u.workflow ? { wf: u.workflow } : {}),
    }))
}

/** Los archivos editados en los últimos 10 minutos, sin repetir, los más nuevos primero (hasta 12). */
export function recentEdits(edits: ReadonlyArray<{ path: string; at: number }>, now: number): Array<{ path: string; at: number }> {
  const latest = new Map<string, number>()
  for (const e of edits) if (now - e.at < EDIT_WINDOW_MS && e.at > (latest.get(e.path) ?? -1)) latest.set(e.path, e.at)
  return [...latest]
    .map(([path, at]) => ({ path, at }))
    .sort((a, b) => b.at - a.at)
    .slice(0, EDITS_MAX)
}

/** El asunto de un mensaje: su `summary` o la primera línea con texto, cortado. */
export function subjectOf(summary: unknown, message: unknown): string {
  const s = typeof summary === 'string' ? summary.trim() : ''
  const first = typeof message === 'string' ? (message.split('\n').find(l => l.trim()) ?? '') : ''
  return cut(s || first, 40).replace(/\s+…$/, '…')
}

/** Suma un mensaje a otra sesión: cuenta los que siguen frescos y guarda el asunto del último. */
export function addTalk(list: readonly GremioTalk[], to: string, subject: string, at: number): GremioTalk[] {
  const name = to.slice(0, 32)
  const prev = list.find(t => t.to === name && at - t.at < TALK_MS)
  const rest = list.filter(t => t.to !== name && at - t.at < TALK_MS)
  return [...rest, { to: name, at, count: (prev?.count ?? (prev ? 1 : 0)) + 1, ...(subject ? { subject } : {}) }]
}

// ── Enlaces, choques y resumen ──────────────────────────────────────────────

/**
 * Si el `to` de un SendMessage nombra a esta sesión: su id (o el comienzo de
 * su id, de 8 caracteres o más), su nombre o su nave, sin importar mayúsculas.
 */
export function matches(to: string, e: Pick<Entry, 'key' | 'label' | 'ship'>): boolean {
  const t = to.trim().toLowerCase()
  if (!t) return false
  const names = [e.key, e.label, nameOf(e)].map(n => (n ?? '').toLowerCase())
  return names.includes(t) || (t.length >= 8 && e.key.toLowerCase().startsWith(t))
}

export type Link = { a: string; b: string; dir: '→' | '←' | '⇄'; count: number; subject: string | null; at: number }

/**
 * Los enlaces entre sesiones vivas: por cada par que se escribió hace poco, la
 * dirección vista desde `a` (→ de a hacia b, ← de b hacia a, ⇄ las dos), cuántos
 * mensajes, el asunto del último y cuándo. `a` es la sesión `first` si está en
 * el par (la propia), si no, la de nombre menor.
 */
export function linksOf(entries: readonly Entry[], now: number, first: string | null = null): Link[] {
  type Half = { count: number; subject: string | null; at: number }
  const halves = new Map<string, Half>()
  for (const from of entries)
    for (const t of from.talking ?? []) {
      if (now - t.at >= TALK_MS) continue
      const to = entries.find(e => e.key !== from.key && matches(t.to, e))
      if (!to) continue
      const id = `${from.key}>${to.key}`
      const cur = halves.get(id)
      const count = (cur?.count ?? 0) + (t.count ?? 1)
      const isNewer = !cur || t.at >= cur.at
      halves.set(id, { count, subject: isNewer ? (t.subject ?? null) : cur.subject, at: isNewer ? t.at : cur.at })
    }
  const links: Link[] = []
  const done = new Set<string>()
  for (const id of halves.keys()) {
    const [x = '', y = ''] = id.split('>')
    const pair = [x, y].sort().join('|')
    if (done.has(pair)) continue
    done.add(pair)
    const ex = entries.find(e => e.key === x)
    const ey = entries.find(e => e.key === y)
    if (!ex || !ey) continue
    const aFirst = x === first || (y !== first && nameOf(ex).localeCompare(nameOf(ey)) <= 0)
    const [a, b] = aFirst ? [x, y] : [y, x]
    const out = halves.get(`${a}>${b}`)
    const back = halves.get(`${b}>${a}`)
    const last = !back || (out && out.at >= back.at) ? out : back
    links.push({
      a,
      b,
      dir: out && back ? '⇄' : out ? '→' : '←',
      count: (out?.count ?? 0) + (back?.count ?? 0),
      subject: last?.subject ?? null,
      at: last?.at ?? now,
    })
  }
  return links.sort((p, q) => q.at - p.at)
}

export type Clash = { a: string; b: string; file: string }

/** Dos sesiones vivas que editaron el mismo archivo en los últimos 10 minutos (un choque por par y archivo). */
export function clashesOf(entries: readonly Entry[], now: number): Clash[] {
  const out: Clash[] = []
  const sorted = [...entries].sort((p, q) => p.key.localeCompare(q.key))
  sorted.forEach((x, i) => {
    const mine = new Set(recentEdits(x.edits ?? [], now).map(e => e.path))
    for (const y of sorted.slice(i + 1))
      for (const e of recentEdits(y.edits ?? [], now)) if (mine.has(e.path)) out.push({ a: x.key, b: y.key, file: e.path })
  })
  return out
}

function base(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path
}

/** "⚠ Logos y Osiris editan el mismo archivo: tema.ts". */
export function clashText(c: Clash, nameFor: (key: string) => string): string {
  return tr(
    `⚠ ${nameFor(c.a)} y ${nameFor(c.b)} editan el mismo archivo: ${base(c.file)}`,
    `⚠ ${nameFor(c.a)} and ${nameFor(c.b)} are editing the same file: ${base(c.file)}`,
  )
}

/** "3 naves · 1 te necesita · 1 enlace · ⚠ 1 choque". */
export function summaryText(s: { ships: number; asking: number; links: number; clashes: number }): string {
  const parts = [s.ships === 1 ? tr('1 nave', '1 ship') : tr(`${s.ships} naves`, `${s.ships} ships`)]
  if (s.asking > 0) parts.push(s.asking === 1 ? tr('1 te necesita', '1 needs you') : tr(`${s.asking} te necesitan`, `${s.asking} need you`))
  if (s.links > 0) parts.push(s.links === 1 ? tr('1 enlace', '1 link') : tr(`${s.links} enlaces`, `${s.links} links`))
  if (s.clashes > 0) parts.push(s.clashes === 1 ? tr('⚠ 1 choque', '⚠ 1 clash') : tr(`⚠ ${s.clashes} choques`, `⚠ ${s.clashes} clashes`))
  return parts.join(' · ')
}

// ── El árbol ────────────────────────────────────────────────────────────────

/** Cuántas columnas ocupa un texto en la terminal (los emoji y el katakana ancho cuentan dos). */
export function columns(text: string): number {
  let n = 0
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0
    if (c === 0xfe0f || c === 0x200d || (c >= 0x300 && c < 0x370)) continue
    n += /\p{Extended_Pictographic}/u.test(ch) && c > 0x2bff ? 2 : (c >= 0x1100 && c <= 0x115f) || (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) || (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe4f) || (c >= 0xff00 && c <= 0xff60) || (c >= 0xffe0 && c <= 0xffe6) ? 2 : 1
  }
  return n
}

/** El texto cortado a `width` columnas, con "…" si no cabe. */
export function fit(text: string, width: number): string {
  if (columns(text) <= width) return text
  let out = ''
  for (const ch of text) {
    if (columns(out + ch) > width - 1) break
    out += ch
  }
  return out + '…'
}

export type MapLine = {
  text: string
  /** Una nave: al tocarla se abre su detalle. */
  key?: string
  /** El botón para ir a esa sesión (la clave de la nave). */
  go?: string
  tone?: 'warn' | 'ask' | 'own' | 'dim'
}

type Node = { text: string; key?: string; go?: string; tone?: MapLine['tone']; children: Node[] }

function folderOf(e: Entry): string | null {
  return e.folder ? base(e.folder) : null
}

/** La línea de una nave: "🖥 Logos (recetario) ⏳ 📝 edita a.ts · 🔋 4". */
export function shipText(e: Entry): string {
  const folder = folderOf(e)
  const isWorking = e.state === 'working' || e.state === 'asking'
  const phase = (e.phase ?? null) as Phase | null
  const step = isWorking && e.doing ? (phase && PHASE_ICON[phase] ? `${PHASE_ICON[phase]} ${stripIcon(e.doing)}` : e.doing) : ''
  const coins = typeof e.coins === 'number' && e.coins >= 0.5 ? ` · 🔋 ${Math.round(e.coins)}` : ''
  return `🖥 ${nameOf(e)}${folder ? ` (${folder})` : ''} ${REALM_ICON[e.state]}${step ? ` ${step}` : ''}${coins}`
}

/** La línea de un programa en el mapa: "Centinela 1 🔎 buscar el logo". */
export function memberText(m: GremioCrewMember): string {
  const phase = m.phase as Phase | null
  return `${m.name} ${phase && PHASE_ICON[phase] ? PHASE_ICON[phase] : '·'} ${m.goal}`
}

/** Los programas de una nave como ramas: los de un Workflow juntos, cada uno bajo quien lo conectó. */
export function crewNodes(crew: readonly GremioCrewMember[]): Node[] {
  const ids = new Set(crew.map(m => m.id))
  const node = (m: GremioCrewMember): Node => ({ text: memberText(m), children: crew.filter(k => k.parent === m.id).map(node) })
  const top = crew.filter(m => !m.parent || !ids.has(m.parent))
  const loose = top.filter(m => !m.wf).map(node)
  const flows = new Map<string, GremioCrewMember[]>()
  for (const m of top.filter(k => k.wf)) flows.set(m.wf ?? '', [...(flows.get(m.wf ?? '') ?? []), m])
  const grouped = [...flows.values()].map(list => ({
    text: tr(`🔗 flujo de trabajo · ${list.length}`, `🔗 workflow · ${list.length}`),
    children: list.map(node),
  }))
  return [...loose, ...grouped]
}

function render(n: Node, prefix: string, isLast: boolean, isRoot: boolean, out: MapLine[], width: number, extra: (n: Node, childPrefix: string) => MapLine[]): void {
  const lead = isRoot ? '' : `${prefix}${isLast ? '└─ ' : '├─ '}`
  out.push({ text: fit(lead + n.text, width), ...(n.key ? { key: n.key } : {}), ...(n.tone ? { tone: n.tone } : {}) })
  const childPrefix = isRoot ? '' : `${prefix}${isLast ? '   ' : '│  '}`
  out.push(...extra(n, childPrefix))
  n.children.forEach((c, i) => render(c, childPrefix, i === n.children.length - 1, false, out, width, extra))
}

/**
 * El mapa entero, ya cortado a `width`: arriba los choques (lo que más importa),
 * después las naves (agrupadas por carpeta cuando dos o más trabajan en la misma,
 * con sus programas debajo) y al final los enlaces. `entries` llega con la
 * propia primero; `picked` es la nave con el detalle abierto.
 */
export function mapLines(o: {
  entries: readonly Entry[]
  ownKey: string | null
  now: number
  width: number
  picked?: string | null
  detail?: (e: Entry) => string[]
}): MapLine[] {
  const { entries, ownKey, now, width } = o
  const nameFor = (key: string) => {
    const e = entries.find(x => x.key === key)
    return e ? nameOf(e) : key
  }
  const out: MapLine[] = clashesOf(entries, now).map(c => ({ text: fit(clashText(c, nameFor), width), tone: 'warn' as const }))
  const shipNode = (e: Entry): Node => ({
    text: shipText(e),
    key: e.key,
    tone: e.key === ownKey ? 'own' : e.state === 'asking' ? 'ask' : e.state === 'idle' ? 'dim' : undefined,
    children: crewNodes(e.crew ?? []),
  })
  // Las que comparten carpeta van juntas, en el orden en que llegaron.
  const count = new Map<string, number>()
  for (const e of entries) {
    const f = e.folder ?? ''
    if (f) count.set(f, (count.get(f) ?? 0) + 1)
  }
  const roots: Node[] = []
  const seen = new Set<string>()
  for (const e of entries) {
    const f = e.folder ?? ''
    if (f && (count.get(f) ?? 0) >= 2) {
      if (seen.has(f)) continue
      seen.add(f)
      roots.push({ text: `📁 ${base(f)}`, children: entries.filter(x => x.folder === f).map(shipNode) })
    } else roots.push(shipNode(e))
  }
  const extra = (n: Node, childPrefix: string): MapLine[] => {
    if (!n.key || n.key !== o.picked) return []
    const e = entries.find(x => x.key === n.key)
    if (!e) return []
    const pad = `${childPrefix}${n.children.length > 0 ? '│  ' : '   '}  `
    const lines: MapLine[] = (o.detail?.(e) ?? []).map(line => ({ text: fit(pad + line, width), tone: 'dim' as const }))
    if (e.key !== ownKey) lines.push({ text: pad, go: e.key })
    return lines
  }
  for (const r of roots) render(r, '', true, true, out, width, extra)
  for (const l of linksOf(entries, now, ownKey)) {
    const subject = l.subject ? ` · "${l.subject}"` : ''
    const ago = shortAgo(now - l.at)
    out.push({ text: fit(`💬 ${nameFor(l.a)} ${l.dir} ${nameFor(l.b)} · ${l.count}${subject} · ${ago}`, width), tone: 'dim' })
  }
  return out
}

function shortAgo(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000))
  if (m < 1) return tr('ahora', 'now')
  if (m < 60) return tr(`hace ${m} min`, `${m} min ago`)
  return tr(`hace ${Math.floor(m / 60)} h`, `${Math.floor(m / 60)} h ago`)
}

// ── La línea de tiempo del turno ────────────────────────────────────────────

function hhmm(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function span(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s} s`
  const m = Math.round(s / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`
}

/** Los programas de este turno: cuándo salió cada uno, cuándo volvió y cuánto tardó ("…" si sigue conectado). */
export function timelineLines(list: readonly GremioHero[], since: number | null, now: number, width: number): string[] {
  if (since === null) return []
  return list
    .map(u => ({ u, start: u.roundStartedAt ?? u.startedAt }))
    .filter(x => x.start >= since)
    .sort((a, b) => a.start - b.start)
    .map(({ u, start }) => {
      const end = u.status === 'running' ? null : u.endedAt
      return fit(`${u.name} ${hhmm(start)} → ${end === null ? '…' : hhmm(end)} · ${span((end ?? now) - start)}`, width)
    })
}

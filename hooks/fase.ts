// Qué está haciendo cada programa, en claro: la fase en una palabra (deducida
// de sus últimas herramientas), el paso sin ruido, los conectores en lenguaje
// humano, el cierre al desconectarse y el aviso de trabajo duplicado. Todo
// puro: el registro de herramientas va en el estado de cada uno.

import { cut, firstSentence } from './describe'
export { connectorText, serverName } from './describe'
import { tr } from './i18n'

import type { GremioKind } from '../types'

/** Lo que fue una herramienta, para deducir la fase. */
export type Kind = GremioKind

export type Phase = 'investigating' | 'writing' | 'testing' | 'running' | 'connector' | 'delegating' | 'permission' | 'waiting' | 'idle'

/** Una búsqueda (Grep, Glob, WebSearch) y cuándo se hizo. */
export type Search = { q: string; at: number }
/** Un archivo editado y cuándo. */
export type Edit = { path: string; at: number }

/** Lo que se anota de cada programa (y del Arquitecto) al usar herramientas. */
export type Track = { kinds?: Kind[]; reads?: string[]; searches?: Search[]; edits?: Edit[] }

export const PHASE_ICON: Record<Phase, string> = {
  investigating: '🔎',
  writing: '📝',
  testing: '🧪',
  running: '💻',
  connector: '📡',
  delegating: '🔗',
  permission: '⏸',
  waiting: '⏳',
  idle: '💤',
}

/** La fase en una palabra (o casi). */
export function phaseWord(p: Phase): string {
  switch (p) {
    case 'investigating':
      return tr('investigando', 'investigating')
    case 'writing':
      return tr('escribiendo', 'writing')
    case 'testing':
      return tr('probando', 'testing')
    case 'running':
      return tr('ejecutando', 'running')
    case 'connector':
      return tr('con un conector', 'using a connector')
    case 'delegating':
      return tr('delegando', 'delegating')
    case 'permission':
      return tr('esperando permiso', 'waiting for permission')
    case 'waiting':
      return tr('esperando a otro programa', 'waiting for another program')
    case 'idle':
      return tr('quieto', 'idle')
  }
}

const READ = new Set(['Read', 'Grep', 'Glob', 'WebSearch', 'WebFetch'])
const WRITE = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit'])
const DELEGATE = new Set(['Agent', 'Workflow'])
/** Un comando que prueba, compila o revisa. */
const TEST = /\b(tests?|spec|jest|vitest|pytest|mocha|bun test|build|lint|eslint|prettier --check|tsc|typecheck|type-check|check\.sh|validate|cargo (test|build|check)|go (test|build|vet)|make)\b/i

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

/** Qué clase de herramienta es, para la fase. */
export function toolKind(tool: string, input: Record<string, unknown>): Kind {
  if (READ.has(tool)) return 'read'
  if (WRITE.has(tool)) return 'write'
  if (DELEGATE.has(tool)) return 'delegate'
  if (tool.startsWith('mcp__')) return 'mcp'
  if (tool === 'Bash') return TEST.test(`${str(input.command)} ${str(input.description)}`) ? 'test' : 'run'
  return 'other'
}

const KIND_PHASE: Record<Exclude<Kind, 'other'>, Phase> = {
  read: 'investigating',
  write: 'writing',
  test: 'testing',
  run: 'running',
  mcp: 'connector',
  delegate: 'delegating',
}

/**
 * La fase de un programa: primero lo que lo detiene (un permiso, otro programa,
 * la quietud) y si no, la clase de herramienta que más pesa entre las últimas
 * seis (las más recientes pesan más). null si todavía no hizo nada.
 */
export function phaseOf(s: { kinds?: readonly Kind[]; isAsking?: boolean; isWaiting?: boolean; isQuiet?: boolean }): Phase | null {
  if (s.isAsking) return 'permission'
  if (s.isWaiting) return 'waiting'
  if (s.isQuiet) return 'idle'
  const last = (s.kinds ?? []).slice(-6)
  const score = new Map<Phase, number>()
  last.forEach((k, i) => {
    if (k === 'other') return
    const p = KIND_PHASE[k]
    score.set(p, (score.get(p) ?? 0) + i + 1)
  })
  let best: Phase | null = null
  let top = 0
  for (const [p, n] of score) if (n > top) [best, top] = [p, n]
  return best
}

/** El paso sin su ícono de herramienta ("🧾 lee a.ts" pasa a "lee a.ts"), para ponerle el de la fase. */
export function stripIcon(text: string): string {
  return text.replace(/^[\p{Extended_Pictographic}️‍✗]+\s*/u, '')
}

/** El paso con el ícono de la fase delante (si se sabe), o tal cual. */
export function stepWithPhase(phase: Phase | null, doing: string): string {
  return phase ? `${PHASE_ICON[phase]} ${stripIcon(doing)}` : doing
}

function base(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path
}

/** "tocó 3 archivos: a.ts, b.ts, c.ts…"; null si no tocó ninguno. */
export function touchedText(edits: readonly Edit[] | undefined): string | null {
  const files = [...new Set((edits ?? []).map(e => e.path))]
  if (files.length === 0) return null
  const names = files.slice(0, 3).map(base).join(', ') + (files.length > 3 ? '…' : '')
  return files.length === 1 ? tr(`tocó 1 archivo: ${names}`, `touched 1 file: ${names}`) : tr(`tocó ${files.length} archivos: ${names}`, `touched ${files.length} files: ${names}`)
}

/** El cierre en una línea al desconectarse: qué trajo y qué archivos tocó. null si no hay nada que decir. */
export function closingLine(report: string | null | undefined, edits: readonly Edit[] | undefined): string | null {
  const said = report ? firstSentence(report, 60) : ''
  const touched = touchedText(edits)
  const parts = [said ? `"${said}"` : null, touched].filter((p): p is string => p !== null)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** Anota una herramienta en el registro de quien la usó (devuelve una copia). */
export function record<T extends Track>(t: T, tool: string, input: Record<string, unknown>, at: number): T {
  const kind = toolKind(tool, input)
  const next: T = { ...t, kinds: [...(t.kinds ?? []), kind].slice(-6) }
  const path = str(input.file_path) || str(input.notebook_path)
  if (kind === 'read' && path) next.reads = [...(t.reads ?? []).filter(p => p !== path), path].slice(-30)
  const q = tool === 'Grep' || tool === 'Glob' ? str(input.pattern) : tool === 'WebSearch' ? str(input.query) : ''
  if (q.trim()) next.searches = [...(t.searches ?? []), { q: cut(q, 80), at }].slice(-8)
  if (kind === 'write' && path) next.edits = [...(t.edits ?? []).filter(e => e.path !== path), { path, at }].slice(-30)
  return next
}

/** Cuánto pueden distar dos búsquedas iguales para contar como trabajo duplicado. */
export const SAME_SEARCH_MS = 2 * 60_000

/**
 * Si dos programas revisan lo mismo: los archivos leídos en común (si son 3 o
 * más) o la búsqueda que hicieron los dos con menos de 2 minutos de diferencia.
 * null si no coinciden.
 */
export function overlap(a: Track, b: Track): string[] | null {
  const theirs = new Set(b.reads ?? [])
  const common = (a.reads ?? []).filter(p => theirs.has(p))
  if (common.length >= 3) return common.map(base)
  const norm = (q: string) => q.trim().toLowerCase()
  for (const s of a.searches ?? [])
    for (const o of b.searches ?? []) if (norm(s.q) === norm(o.q) && Math.abs(s.at - o.at) <= SAME_SEARCH_MS) return [`"${s.q}"`]
  return null
}

/** La nota del Registro cuando dos programas revisan lo mismo. */
export function duplicateNote(a: string, b: string, what: readonly string[]): string {
  const list = what.slice(0, 3).join(', ') + (what.length > 3 ? '…' : '')
  return tr(`⚠ ${a} y ${b} revisan lo mismo: ${list}`, `⚠ ${a} and ${b} are checking the same thing: ${list}`)
}

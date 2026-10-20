// El reino: las otras sesiones abiertas con gremio y en qué está cada una.
// Cada sesión deja su «latido» en el almacén compartido (reino.<id>) y lee los
// de las demás; uno sin latir hace más de 3 minutos se da por cerrado.

import type { GremioRealmEntry, GremioRealmState } from '../types'
import { tr } from './i18n'

/** Un latido más viejo que esto ya no cuenta (la sesión se cerró o se colgó). */
export const REALM_FRESH_MS = 3 * 60_000
/** Más viejo que esto se borra del almacén. */
export const REALM_FORGET_MS = 6 * 60 * 60_000
/** Una sesión que terminó hace menos de esto aparece como «terminó»; después, tranquila. */
const READY_MS = 60 * 60_000

export const REALM_ICON: Record<GremioRealmState, string> = { asking: '❓', napping: '😴', working: '⏳', ready: '✅', idle: '💤' }

/** Las que más te necesitan primero: las que preguntan, las que terminaron, las que trabajan. */
const ORDER: Record<GremioRealmState, number> = { asking: 0, ready: 1, working: 2, napping: 3, idle: 4 }

export function stateOf(s: {
  isAsking: boolean
  isNapping?: boolean
  isBusy: boolean
  running: number
  lastEnd: number | null
  now: number
}): GremioRealmState {
  if (s.isAsking) return 'asking'
  if (s.isNapping) return 'napping'
  if (s.isBusy || s.running > 0) return 'working'
  if (s.lastEnd !== null && s.now - s.lastEnd < READY_MS) return 'ready'
  return 'idle'
}

function minutes(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000))
  if (m < 1) return tr('recién', 'just now')
  if (m < 60) return tr(`hace ${m} min`, `${m} min ago`)
  return tr(`hace ${Math.floor(m / 60)} h`, `${Math.floor(m / 60)} h ago`)
}

/** «te pide algo · hace 2 min», «trabajando · 2 en misión», «terminó hace 12 min», «tranquila». */
export function realmWord(e: GremioRealmEntry, now: number): string {
  if (e.state === 'asking') return tr(`te pide algo · ${minutes(now - e.since)}`, `needs you · ${minutes(now - e.since)}`)
  if (e.state === 'napping') return tr(`durmiendo la siesta · ${minutes(now - e.since)}`, `taking a nap · ${minutes(now - e.since)}`)
  if (e.state === 'working') return e.running > 0
      ? tr(`trabajando · ${e.running} en misión`, `working · ${e.running} on quests`)
      : tr('trabajando', 'working')
  if (e.state === 'ready') return tr(`terminó ${minutes(now - e.since)}`, `finished ${minutes(now - e.since)}`)
  return tr('tranquila', 'quiet')
}

/** Las otras sesiones vigentes, en el orden en que te necesitan. */
export function others(entries: readonly GremioRealmEntry[], ownKey: string, now: number): GremioRealmEntry[] {
  return entries
    .filter(e => e.key !== ownKey && !e.closed && now - e.at < REALM_FRESH_MS)
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.label.localeCompare(b.label))
}

/** El nombre por la carpeta, salvo que sea la carpeta de inicio (ahí no dice nada). */
export function labelFromCwd(cwd: string, home: string | null): string | null {
  const clean = cwd.replace(/\/+$/, '')
  if (!clean || clean === home?.replace(/\/+$/, '')) return null
  return clean.split('/').pop() || null
}

/** Un nombre corto de respaldo, desde el primer pedido: sus primeras palabras con letras. */
export function labelFromPrompt(text: string): string {
  const words = text
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 3)
  const name = words.join(' ') || tr('sesión', 'session')
  return name.charAt(0).toUpperCase() + name.slice(1, 24)
}

/** Limpia lo que Haiku devuelve como nombre: sin comillas, punto final ni saltos. */
export function cleanLabel(text: string): string | null {
  const name = text
    .split('\n')[0]
    ?.replace(/^["«'“\s]+|["»'”.\s]+$/g, '')
    .trim()
  return name && name.length <= 32 ? name : null
}

/**
 * Los primeros pedidos de verdad de una conversación (hasta tres), desde el
 * comienzo de su archivo (JSONL): mensajes de la persona que no sean avisos del
 * sistema. Si la sesión continúa otra, el resumen sirve igual.
 */
export function firstUserTexts(jsonl: string, max = 3): string[] {
  const found: string[] = []
  for (const line of jsonl.split('\n')) {
    if (found.length >= max) break
    if (!line.includes('"type":"user"')) continue
    let entry: { type?: string; isMeta?: boolean; message?: { content?: unknown } }
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    if (entry.type !== 'user' || entry.isMeta) continue
    const content = entry.message?.content
    const parts =
      typeof content === 'string'
        ? [content]
        : Array.isArray(content)
          ? content.filter(c => c && typeof c === 'object' && c.type === 'text').map(c => String(c.text ?? ''))
          : []
    const text = parts.map(p => p.trim()).find(p => p.length > 0 && !p.startsWith('<'))
    if (text) found.push(text.slice(0, 300))
  }
  return found
}

/**
 * La parte de la jornada de una sesión, en monedas: lo que subió la cuota
 * mientras las sesiones con gremio la miraban (más alto menos más bajo visto)
 * se reparte según lo que gastó cada una en esa misma ventana. null si no hay
 * con qué repartir.
 */
export function coinsOf(
  own: { key: string; cost: number; windowKey: string | null },
  entries: readonly GremioRealmEntry[],
  seen: [number, number] | undefined,
): number | null {
  if (!own.windowKey || !seen) return null
  const rise = Math.max(0, seen[1] - seen[0])
  const total = entries
    .filter(e => e.key !== own.key && e.windowKey === own.windowKey)
    .reduce((sum, e) => sum + (e.cost ?? 0), own.cost)
  return total > 0 ? (rise * own.cost) / total : null
}

/** «ahora», «3 min», «2 h»: cuánto lleva en su estado. */
export function shortSince(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000))
  if (m < 1) return tr('ahora', 'now')
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h`
}

/** Una fila del reino abierto: estado, nombre, hace cuánto, vida, parte de la jornada y lo pendiente. */
export function realmRow(e: GremioRealmEntry, now: number, isOwn: boolean): string {
  const name = `${isOwn ? '● ' : ''}${e.label}`.slice(0, 16).padEnd(16)
  const parts = [
    `${REALM_ICON[e.state]} ${name}`,
    shortSince(now - e.since).padStart(6),
    e.life !== null ? `♥ ${Math.round(e.life)}`.padEnd(5) : '     ',
    typeof e.coins === 'number' ? `🪙 ${Math.round(e.coins)}`.padEnd(5) : '     ',
    e.running > 0 ? `🧭 ${e.running}` : (e.unread ?? 0) > 0 ? `💰 ${e.unread}` : '',
  ]
  return parts.join('  ').trimEnd()
}

/** Lo que se ve al tocar una fila: qué te pide (o lo último que pasó) y su carpeta. */
export function realmDetail(e: GremioRealmEntry, home: string | null): string[] {
  const lines: string[] = []
  if (e.ask) lines.push(e.ask)
  else if (e.last) lines.push(tr(`lo último: ${e.last}`, `last: ${e.last}`))
  if (e.folder) lines.push(`📁 ${home && e.folder.startsWith(home) ? `~${e.folder.slice(home.length)}` : e.folder}`)
  return lines
}

/** La línea cerrada: cada sesión con su icono; la vida si está baja y cuánto lleva preguntando. */
export function realmSummary(e: GremioRealmEntry, now: number): string {
  const extra = e.state === 'asking' ? ` ${shortSince(now - e.since)}` : e.life !== null && e.life <= 20 ? ` ♥ ${Math.round(e.life)}` : ''
  return `${e.label} ${REALM_ICON[e.state]}${extra}`
}

/** Sube por los procesos padres y anota cada terminal que encuentra (la pestaña es una de ellas). */
export const TTY_SCRIPT =
  'p=$PPID; for i in 1 2 3 4 5 6 7 8 9 10; do t=$(ps -o tty= -p "$p" | tr -d " "); case "$t" in ""|"??") ;; *) echo "$t";; esac; p=$(ps -o ppid= -p "$p" | tr -d " "); if [ -z "$p" ] || [ "$p" = 1 ]; then exit 0; fi; done'

/** Una cadena para AppleScript, entre comillas. */
function asText(t: string): string {
  return `"${t.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/** La condición de AppleScript que reconoce la pestaña de una sesión: su terminal o su título. */
function tabTest(ttys: readonly string[], title: string | null): string {
  const tests: string[] = []
  if (ttys.length > 0) tests.push(`({${ttys.map(t => asText(`/dev/${t.replace(/[^a-z0-9]/gi, '')}`)).join(', ')}} contains (tty of t))`)
  if (title) tests.push(`((custom title of t) ends with ${asText(title)})`)
  return tests.length > 0 ? tests.join(' or ') : 'false'
}

/** Lo que Terminal.app tiene que hacer para mostrar la pestaña de una sesión (por terminal o por título). */
export function focusScript(ttys: readonly string[], title: string | null = null): string {
  return [
    'tell application "Terminal"',
    '  repeat with w in windows',
    '    repeat with t in tabs of w',
    `      if ${tabTest(ttys, title)} then`,
    '        set selected of t to true',
    '        set index of w to 1',
    '        activate',
    '        return "ok"',
    '      end if',
    '    end repeat',
    '  end repeat',
    '  return "no"',
    'end tell',
  ].join('\n')
}

/** Marca la pestaña de una sesión con un aviso delante de su título («🔔 Recetario»). */
export function markScript(title: string, mark: string): string {
  return [
    'tell application "Terminal"',
    '  repeat with w in windows',
    '    repeat with t in tabs of w',
    `      if (custom title of t) ends with ${asText(title)} then`,
    `        set custom title of t to ${asText(`${mark} ${title}`)}`,
    '        return "ok"',
    '      end if',
    '    end repeat',
    '  end repeat',
    '  return "no"',
    'end tell',
  ].join('\n')
}

/** El título que Claude Code le puso a la sesión (el de su pestaña), el último que aparece en su archivo. */
export function lastTitle(jsonl: string): string | null {
  let found: string | null = null
  for (const m of jsonl.matchAll(/"(customTitle|aiTitle)":"((?:[^"\\]|\\.)*)"/g)) {
    try {
      found = JSON.parse(`"${m[2]}"`)
    } catch {
      found = m[2] ?? null
    }
  }
  return found ? found.trim().slice(0, 40) || null : null
}

/** Las terminales que devolvió el script, sin repetir: «ttys004»… */
export function cleanTtys(text: string): string[] {
  return [...new Set(text.split(/\s+/).filter(t => /^ttys?\d+$/.test(t)))]
}

/** Una notificación de macOS, sin sonido (osascript «display notification»). */
export function notifyScript(title: string, text: string): string {
  const q = (t: string) => t.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `display notification "${q(text)}" with title "${q(title)}"`
}

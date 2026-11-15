// Traduce lo que hace cada agente a frases cortas en español.

import type { GremioClass } from '../types'
import { tr } from './i18n'

export function cut(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function fileName(path: unknown): string {
  const p = str(path)
  return p.split('/').filter(Boolean).pop() ?? p
}

function host(url: unknown): string {
  const u = str(url)
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return cut(u, 30)
  }
}

/** Qué está haciendo un agente cuando usa una herramienta, con su ícono. */
export function describeTool(tool: string, input: Record<string, unknown>): string {
  switch (tool) {
    case 'Read':
      return tr(`🧾 lee ${fileName(input.file_path)}`, `🧾 reads ${fileName(input.file_path)}`)
    case 'Edit':
    case 'MultiEdit':
      return tr(`📝 edita ${fileName(input.file_path)}`, `📝 edits ${fileName(input.file_path)}`)
    case 'Write':
      return tr(`📝 escribe ${fileName(input.file_path)}`, `📝 writes ${fileName(input.file_path)}`)
    case 'NotebookEdit':
      return tr(`📝 edita ${fileName(input.notebook_path)}`, `📝 edits ${fileName(input.notebook_path)}`)
    case 'Bash': {
      const what = str(input.description) || str(input.command)
      return `💻 ${cut(what, 48)}`
    }
    case 'Grep':
      return tr(`🔎 busca "${cut(str(input.pattern), 28)}"`, `🔎 searches "${cut(str(input.pattern), 28)}"`)
    case 'Glob':
      return tr(`🔎 busca ${cut(str(input.pattern), 28)}`, `🔎 searches ${cut(str(input.pattern), 28)}`)
    case 'WebSearch':
      return tr(`🌐 busca: ${cut(str(input.query), 36)}`, `🌐 searches: ${cut(str(input.query), 36)}`)
    case 'WebFetch':
      return tr(`🌐 lee ${host(input.url)}`, `🌐 reads ${host(input.url)}`)
    case 'Agent':
      return tr(`📜 encarga: ${cut(str(input.description), 36)}`, `📜 assigns: ${cut(str(input.description), 36)}`)
    case 'Skill':
      return tr(`🧰 habilidad ${str(input.skill)}`, `🧰 skill ${str(input.skill)}`)
    case 'AskUserQuestion':
      return tr('❓ te pregunta algo', '❓ asks you something')
    case 'TodoWrite':
    case 'TaskCreate':
    case 'TaskUpdate':
      return tr('📋 ordena tareas', '📋 sorts tasks')
    case 'ToolSearch':
      return tr('🧰 busca herramientas', '🧰 looks for tools')
    case 'Workflow':
      return tr('🌐 orquesta un flujo de programas', '🌐 orchestrates a workflow')
  }
  const connector = connectorText(tool)
  if (connector) return `📡 ${connector}`
  return tr(`🧰 usa ${tool}`, `🧰 uses ${tool}`)
}

const READ_VERBS = new Set(['search', 'list', 'get', 'read', 'fetch', 'query', 'find', 'view', 'describe', 'download', 'lookup', 'retrieve', 'check', 'export'])
const WRITE_VERBS = new Set([
  'create',
  'send',
  'update',
  'delete',
  'add',
  'reply',
  'remove',
  'set',
  'move',
  'post',
  'upload',
  'edit',
  'write',
  'apply',
  'mark',
  'label',
  'trash',
  'publish',
  'forward',
  'merge',
  'archive',
])

/** El nombre limpio de un servidor MCP: "claude_ai_Google_Drive" pasa a "Google Drive". */
export function serverName(server: string): string {
  return server
    .replace(/^claude_ai_/, '')
    .replace(/^plugin_[^_]+_/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
}

/** Un conector en lenguaje humano: "consulta Gmail", "escribe en ClickUp", "usa Notion". null si no es un conector. */
export function connectorText(tool: string): string | null {
  if (!tool.startsWith('mcp__')) return null
  const [, server = '', name = ''] = tool.split('__')
  const who = serverName(server) || server
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const own = new Set([squash(who), ...who.split(' ').map(squash)])
  const words = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .map(w => w.toLowerCase())
    .filter(w => w && !own.has(w) && w !== 'mcp')
  const verb = words[0] ?? ''
  if (READ_VERBS.has(verb)) return tr(`consulta ${who}`, `queries ${who}`)
  if (WRITE_VERBS.has(verb)) return tr(`escribe en ${who}`, `writes to ${who}`)
  return tr(`usa ${who}`, `uses ${who}`)
}


/** "claude-haiku-5-5" pasa a "Haiku 5.5"; un alias como "haiku" a "Haiku". */
export function modelName(id: string): string {
  const m = /(fable|mythos|opus|sonnet|haiku)(?:[-_ ](\d+))?(?:[-_.](\d+))?/i.exec(id)
  if (!m) return id || tr('modelo desconocido', 'unknown model')
  const family = (m[1] ?? '').toLowerCase()
  const version = m[2] ? (m[3] ? `${m[2]}.${m[3]}` : m[2]) : ''
  return `${family[0]?.toUpperCase() ?? ''}${family.slice(1)}${version ? ' ' + version : ''}`
}

/** La clase sale del modelo: la vestimenta dice qué modelo trabaja. */
export function classOf(model: string): Exclude<GremioClass, 'maestro'> {
  const m = model.toLowerCase()
  if (m.includes('fable') || m.includes('mythos')) return 'archimago'
  if (m.includes('opus')) return 'mago'
  if (m.includes('haiku')) return 'picaro'
  return 'bardo'
}

export function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 10) return tr('ahora', 'now')
  if (s < 60) return tr(`hace ${s} s`, `${s} s ago`)
  const m = Math.round(s / 60)
  if (m < 60) return tr(`hace ${m} min`, `${m} min ago`)
  return tr(`hace ${Math.round(m / 60)} h`, `${Math.round(m / 60)} h ago`)
}

export function duration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  return `${m} min ${s % 60} s`
}

export function tokens(n: number): string {
  if (n < 1000) return `${n} tokens`
  if (n < 1_000_000) return tr(`${(n / 1000).toFixed(1).replace('.', ',')} mil tokens`, `${(n / 1000).toFixed(1)}k tokens`)
  return tr(`${(n / 1_000_000).toFixed(2).replace('.', ',')} M tokens`, `${(n / 1_000_000).toFixed(2)}M tokens`)
}

/** La primera frase de un informe, sin formato de Markdown, corta para un bocadillo. */
export function firstSentence(text: string, max = 40): string {
  const plain = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#+ .*$/gm, ' ')
    .replace(/^[>*\-\s]+/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const end = plain.search(/[.!?:](\s|$)/)
  const sentence = end > 0 ? plain.slice(0, end + 1) : plain
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence
}

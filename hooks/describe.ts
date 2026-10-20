// Traduce lo que hace cada agente a frases cortas en español.

import type { GremioClass } from '../types'

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
      return `📖 lee ${fileName(input.file_path)}`
    case 'Edit':
    case 'MultiEdit':
      return `📝 edita ${fileName(input.file_path)}`
    case 'Write':
      return `📝 escribe ${fileName(input.file_path)}`
    case 'NotebookEdit':
      return `📝 edita ${fileName(input.notebook_path)}`
    case 'Bash': {
      const what = str(input.description) || str(input.command)
      return `💻 ${cut(what, 48)}`
    }
    case 'Grep':
      return `🔎 busca "${cut(str(input.pattern), 28)}"`
    case 'Glob':
      return `🔎 busca ${cut(str(input.pattern), 28)}`
    case 'WebSearch':
      return `🌐 busca: ${cut(str(input.query), 36)}`
    case 'WebFetch':
      return `🌐 lee ${host(input.url)}`
    case 'Agent':
      return `📜 encarga: ${cut(str(input.description), 36)}`
    case 'Skill':
      return `🧰 habilidad ${str(input.skill)}`
    case 'AskUserQuestion':
      return '❓ te pregunta algo'
    case 'TodoWrite':
    case 'TaskCreate':
    case 'TaskUpdate':
      return '📋 ordena tareas'
    case 'ToolSearch':
      return '🧰 busca herramientas'
    case 'Workflow':
      return '🏰 convoca una hueste'
  }
  if (tool.startsWith('mcp__')) {
    const [, server = '', name = ''] = tool.split('__')
    const who = server.replace(/^claude_ai_/, '').replace(/^plugin_[^_]+_/, '').replace(/_/g, ' ')
    return `📡 ${who}: ${name.replace(/[_-]/g, ' ')}`
  }
  return `🧰 usa ${tool}`
}

/** "claude-haiku-5-5" pasa a "Haiku 5.5"; un alias como "haiku" a "Haiku". */
export function modelName(id: string): string {
  const m = /(fable|mythos|opus|sonnet|haiku)(?:[-_ ](\d+))?(?:[-_.](\d+))?/i.exec(id)
  if (!m) return id || 'modelo desconocido'
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
  if (s < 10) return 'ahora'
  if (s < 60) return `hace ${s} s`
  const m = Math.round(s / 60)
  if (m < 60) return `hace ${m} min`
  return `hace ${Math.round(m / 60)} h`
}

export function duration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  return `${m} min ${s % 60} s`
}

export function tokens(n: number): string {
  if (n < 1000) return `${n} tokens`
  if (n < 1_000_000) return `${(n / 1000).toFixed(1).replace('.', ',')} mil tokens`
  return `${(n / 1_000_000).toFixed(2).replace('.', ',')} M tokens`
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

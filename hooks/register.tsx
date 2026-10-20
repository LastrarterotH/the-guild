// El Gremio de Clawd. Clawd es el Gran Maestre (la sesión principal) y
// cada agente es un aventurero cuya clase dice qué modelo usa. El Código del
// Gremio elige modelo y esfuerzo de cada misión, la acota y pide permiso para
// el Archimago (Fable). Cada clase suena distinto al volver. La tesorería
// cuenta el oro de cada misión y la experiencia sube de clase las misiones que
// una clase viene fallando.

import { atom, read, update } from 'claude-code'
import type { AgentSpawnInput, EngineInterface, Register } from 'claude-code'

import type {
  GremioBook,
  GremioContext,
  GremioRealmEntry,
  GremioClass,
  GremioClassStats,
  GremioEffort,
  GremioHero,
  GremioLogEntry,
  GremioMaster,
  GremioTask,
  GremioTreasury,
} from '../types'
import { absorb, coinText, EMPTY_QUOTA, forecast, kindLabel, pctText, ratePerHour, span } from './cuota'
import type { Limit } from './cuota'
import { epithet } from './apodos'
import { absorbQuota, addProjectSpend, projectShares, windowKey } from './libro'
import {
  REALM_FORGET_MS,
  REALM_FRESH_MS,
  TTY_SCRIPT,
  cleanLabel,
  cleanTtys,
  focusScript,
  notifyScript,
  coinsOf,
  firstUserTexts,
  lastTitle,
  markScript,
  labelFromCwd,
  labelFromPrompt,
  others as otherSessions,
  realmDetail,
  realmRow,
  realmSummary,
  shortSince,
  stateOf,
} from './reino'
import { ago, classOf, cut, describeTool, duration, firstSentence, modelName, tokens } from './describe'
import { aliasOf, brief, classOfAlias, doctrineText, effortFor, isFable, plan, planFor, raise, setsLength } from './doctrine'
import { CLASSIFIER_SYSTEM, classifierPrompt, flip, parseVerdict, promote, record, taskWord } from './experiencia'
import type { Xp } from './experiencia'
import { addUsage, costOf, totalTokens, usageFrom } from './oro'
import { CELLS, CLASS_COLOR, CLASS_LABEL, CLASS_LEVEL, CLASS_PLURAL, spriteCells } from './sprites'
import type { Pose, Size } from './sprites'
import { lang, langChoice, langFrom, setLang, tr } from './i18n'
import type { Lang } from './i18n'
import { OLD_STORE, pickImport } from './migrar'

const PANE = 'guild'
// El pergamino: el botín completo en un panel aparte.
const SCROLL = 'guild-scroll'
const SLOT = 15
const MINI = 10
const GOLD = CLASS_COLOR.maestro
const RED = '#ef476f'
// Bajo esta vida (contexto libre, %) Clawd se cansa y avisa.
const LOW_LIFE = 20
// Cuánto se queda en el campo un aventurero que vuelve, antes de entrar a la taberna.
const RETURN_MS = 6000
// Sin acciones ni herramientas en curso por este tiempo, un aventurero se ve «quieto».
const QUIET_MS = 5 * 60 * 1000
const idle = () => tr('esperando una nueva misión', 'waiting for a new quest')
// Lo que quedó guardado como «quieto» puede estar en cualquiera de los dos idiomas.
const isIdle = (doing: string) => doing === 'esperando una nueva misión' || doing === 'waiting for a new quest'
// «un Mago» / «an Archmage».
const aOrAn = (word: string) => (/^[AEIOU]/i.test(word) ? `an ${word}` : `a ${word}`)

const EFFORT_WORD: Record<GremioEffort, string> = {
  get low() {
    return tr('bajo', 'low')
  },
  get medium() {
    return tr('medio', 'medium')
  },
  get high() {
    return tr('alto', 'high')
  },
  get xhigh() {
    return tr('muy alto', 'very high')
  },
  get max() {
    return tr('máximo', 'max')
  },
}

const CLASS_SHORT: Record<GremioClass, string> = {
  get maestro() {
    return tr('Maestre', 'Master')
  },
  get archimago() {
    return tr('Archi', 'Archi')
  },
  get mago() {
    return tr('Mago', 'Mage')
  },
  get bardo() {
    return tr('Bardo', 'Bard')
  },
  get picaro() {
    return tr('Pícaro', 'Rogue')
  },
}

const RESTING: GremioMaster = {
  get doing() {
    return idle()
  },
  isBusy: false, model: '',
  actionCount: 0,
  actions: [],
}
const EMPTY_TREASURY: GremioTreasury = { masterCost: 0, masterTokens: 0, heroesCost: 0, codeCost: 0, saved: 0 }
const EMPTY_BOOK: GremioBook = {
  missions: 0,
  good: 0,
  bad: 0,
  cost: 0,
  saved: 0,
  masterCost: 0,
  codeCost: 0,
  byClass: {},
  fivePoints: 0,
  weekPoints: 0,
}
const CLASSIFIER = 'claude-haiku-5-5'

const heroes = atom({ plugin: 'guild', key: 'heroes' } as const, [] as GremioHero[])
const master = atom({ plugin: 'guild', key: 'master' } as const, RESTING)
const selected = atom({ plugin: 'guild', key: 'selected' } as const, null as string | null)
const log = atom({ plugin: 'guild', key: 'log' } as const, [] as GremioLogEntry[])
const counters = atom({ plugin: 'guild', key: 'counters' } as const, {} as Record<string, number>)
const doctrine = atom({ plugin: 'guild', key: 'doctrine' } as const, true)
const sound = atom({ plugin: 'guild', key: 'sound' } as const, true)
const expanded = atom({ plugin: 'guild', key: 'expanded' } as const, null as string | null)
const treasury = atom({ plugin: 'guild', key: 'treasury' } as const, EMPTY_TREASURY)
const book = atom({ plugin: 'guild', key: 'book' } as const, EMPTY_BOOK)
const bookOpen = atom({ plugin: 'guild', key: 'bookOpen' } as const, false)
const purseOpen = atom({ plugin: 'guild', key: 'purseOpen' } as const, null as string | null)
const lifeOpen = atom({ plugin: 'guild', key: 'lifeOpen' } as const, false)
const lifeWarned = atom({ plugin: 'guild', key: 'lifeWarned' } as const, false)
const cardMore = atom({ plugin: 'guild', key: 'cardMore' } as const, false)
const chronicleOpen = atom({ plugin: 'guild', key: 'chronicleOpen' } as const, false)
const tavernOpen = atom({ plugin: 'guild', key: 'tavernOpen' } as const, false)
const day = atom({ plugin: 'guild', key: 'day' } as const, '')
const realm = atom({ plugin: 'guild', key: 'realm' } as const, [] as GremioRealmEntry[])
const realmOpen = atom({ plugin: 'guild', key: 'realmOpen' } as const, false)
const scrollHero = atom({ plugin: 'guild', key: 'scrollHero' } as const, null as string | null)
const realmPicked = atom({ plugin: 'guild', key: 'realmPicked' } as const, null as string | null)
const label = atom({ plugin: 'guild', key: 'label' } as const, '')
const spend = atom({ plugin: 'guild', key: 'spend' } as const, { key: '', cost: 0 })
const labelSource = atom({ plugin: 'guild', key: 'labelSource' } as const, '' as '' | 'manual' | 'title' | 'folder' | 'transcript' | 'prompt')
const quota = atom({ plugin: 'guild', key: 'quota' } as const, EMPTY_QUOTA)

const WRITE_TOOLS = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit'])
// Herramientas que esperan tu respuesta.
const QUESTION_TOOLS = new Set(['AskUserQuestion', 'ExitPlanMode'])
const SOUNDS = ['maestro', 'archimago', 'mago', 'bardo', 'picaro', 'caido'] as const
type SoundName = (typeof SOUNDS)[number]

// Hostes (workflows) a las que ya autorizaste el Archimago: se pregunta una vez.
const fableRuns = new Set<string>()

// Lo que el panel tiene dibujado, para animarlo sin redibujar todo.
type SpriteState = 'busy' | 'idle' | 'down' | 'tired' | 'asleep'
type Drawn = { cls: GremioClass; state: SpriteState; size: Size; faded: boolean }
let drawn = new Map<string, Drawn>()
let frame = 0
// Herramientas en curso por aventurero (contador: pueden ir varias a la vez).
const inFlight = new Map<string, number>()
// Si hay alguien en misión, el panel se redibuja cada ~15 s (tiempos y «quieto»).
let hasRunning = false
// Cuadros en que termina la vuelta de un aventurero (para redibujar).
let returnRedraws: number[] = []
// Los agentes que el motor todavía tiene (para «Ver su conversación» y «retomar»), guardados.
let listedAgents = new Set<string>()
// El último aviso de «retomar» que se mandó (si no cambió, no se repite).
let lastResumeSig: string | null = null
// El reino: el id de esta sesión, lo que te está preguntando (por llamada) y el último latido.
let sessionKey: string | null = null
let sessionFolder: string | null = null
let sessionHome: string | null = null
let sessionTtys: string[] = []
// El archivo de la conversación (para leer su título) y lo último que sonó aquí.
let transcriptPath: string | null = null
let lastBell: { at: number; icon: string; text: string } | null = null
const asks = new Map<string, number>()
let lastBeat = 0
let lastBeatSig = ''
// Un permiso que te están mostrando (el diálogo de verdad): se cierra cuando la llamada sigue.
let permissionAt: number | null = null
// Qué te pide, para el reino: «te hace una pregunta», «te pide aprobar un plan», «te pide permiso: Bash».
let askWhat: string | null = null
// La pregunta ya avisada por macOS (por su hora de inicio), para avisar una sola vez.
let notifiedAsk: number | null = null
let isPaneUp = false

function poseFor(state: SpriteState): Pose {
  return state === 'busy' ? 'marcha' : state === 'down' ? 'caido' : state === 'tired' ? 'cansado' : state === 'asleep' ? 'durmiendo' : 'quieto'
}

function tick($: EngineInterface): void {
  if (!isPaneUp || drawn.size === 0) return
  frame += 1
  if (hasRunning && frame % 38 === 0) $.ui.invalidate('ui.render')
  // Al terminar la vuelta de un aventurero, entra a la taberna.
  if (returnRedraws.some(f => f <= frame)) {
    returnRedraws = returnRedraws.filter(f => f > frame)
    $.ui.invalidate('ui.render')
  }
  if (frame % 150 === 0) void closeDay($).catch(() => undefined)
  for (const [key, d] of drawn) {
    let pose: Pose | null = null
    if (d.state === 'busy') pose = 'marcha'
    // Clawd en reposo parpadea de vez en cuando.
    else if ((d.state === 'idle' || d.state === 'tired') && d.cls === 'maestro' && frame % 12 === 0) pose = 'parpadeo'
    else if ((d.state === 'idle' || d.state === 'tired') && d.cls === 'maestro' && frame % 12 === 1) pose = poseFor(d.state)
    if (!pose) continue
    void $.ui.blit({ requestId: PANE, key, cells: spriteCells(d.cls, pose, frame, d.size, d.faded) }).catch(() => undefined)
  }
}

// La melodía de Clawd suena cada vez que termina: va más baja que el resto.
const GAIN: Partial<Record<SoundName, number>> = { maestro: 0.7 }

function play($: EngineInterface, name: SoundName): void {
  void $.audio.play({ asset: `sounds/${name}.wav` }, { gain: GAIN[name] ?? 1 }).catch(() => undefined)
}

async function chime($: EngineInterface, name: SoundName): Promise<void> {
  if (await read($, sound)) play($, name)
}

async function note($: EngineInterface, text: string, heroId?: string): Promise<void> {
  const at = await $.clock.now()
  await update($, log, list => [...list, heroId ? { at, text, heroId } : { at, text }].slice(-40))
}

/** La línea de estado, para cuando el panel está cerrado: vida · bolsa · en misión · Código apagado. */
function statusText(life: number | null, purse: number | null, running: number, isCode: boolean, asking: readonly string[] = []): string | undefined {
  const parts = [
    life === null ? null : `♥ ${Math.round(life)}`,
    purse === null ? null : `🪙 ${Math.round(purse)}`,
    running > 0 ? `🧭 ${running}` : null,
    isCode ? null : tr('📜✗ sin Código', '📜✗ no Code'),
    asking.length > 0 ? `❓ ${asking.join(', ')}` : null,
  ].filter((p): p is string => p !== null)
  return parts.length > 0 ? parts.join(' · ') : undefined
}

async function refreshStatus($: EngineInterface): Promise<void> {
  const [list, dm, q, isCode, kingdom] = await Promise.all([read($, heroes), read($, master), read($, quota), read($, doctrine), read($, realm)])
  const running = list.filter(u => u.status === 'running').length
  const ctx = dm.context ?? null
  const life = ctx && ctx.percent !== null ? Math.max(0, 100 - ctx.percent) : null
  const five = q.windows.find(w => w.kind === 'five_hour')
  const nowMs = await $.clock.now()
  const asking = otherSessions(kingdom, sessionKey ?? '', nowMs).filter(k => k.state === 'asking').map(k => k.label)
  $.ui.status(statusText(life, five ? Math.max(0, 100 - five.percent) : null, running, isCode, asking))
  await beat($)
}

/** La ventana de 5 h en curso, por su hora de relleno; null si todavía no se sabe. */
async function currentWindow($: EngineInterface): Promise<string | null> {
  const five = (await read($, quota)).windows.find(w => w.kind === 'five_hour')
  return five?.resetsAt ? windowKey(five.resetsAt) : null
}

/** Suma un gasto (dólares de la API, estimado) a lo de esta sesión en la ventana en curso. */
async function addSpend($: EngineInterface, usd: number): Promise<void> {
  if (!(usd > 0)) return
  const key = (await currentWindow($)) ?? ''
  await update($, spend, cur => (cur.key === key ? { key, cost: cur.cost + usd } : { key, cost: usd }))
  // Y al libro, por proyecto y día.
  try {
    const project = (await read($, label)) || tr('sin nombre', 'unnamed')
    const today = dayOf(await $.clock.now())
    await bumpBook($, b => addProjectSpend(b, today, project, usd))
  } catch {
    // El libro no se pudo guardar; la sesión sigue.
  }
}

/** La parte de la jornada de esta sesión, en monedas; null si no hay con qué repartir. */
async function ownCoins($: EngineInterface): Promise<number | null> {
  const key = await currentWindow($)
  const [mine, kingdom, b] = await Promise.all([read($, spend), read($, realm), read($, book)])
  return coinsOf({ key: sessionKey ?? '', cost: mine.key === key ? mine.cost : 0, windowKey: key }, kingdom, key ? b.fiveSeen?.[key] : undefined)
}

/** Lo que esta sesión les cuenta a las demás. */
async function ownEntry($: EngineInterface): Promise<GremioRealmEntry | null> {
  if (!sessionKey) return null
  const [dm, list, name] = await Promise.all([read($, master), read($, heroes), read($, label)])
  const now = await $.clock.now()
  // Un permiso anotado que nunca se cerró (una consulta que no llegó a correr) se olvida.
  for (const [id, at] of asks) if (now - at > 30 * 60_000) asks.delete(id)
  const running = list.filter(u => u.status === 'running').length
  const lastEnd = dm.lastTurnEndAt ?? null
  if (permissionAt !== null && now - permissionAt > 30 * 60_000) permissionAt = null
  const askSince = [...asks.values(), ...(permissionAt !== null ? [permissionAt] : [])]
  const state = stateOf({ isAsking: askSince.length > 0, isNapping: dm.napping === true, isBusy: dm.isBusy, running, lastEnd, now })
  const since =
    state === 'asking'
      ? Math.min(...askSince)
      : state === 'napping'
        ? (dm.napStartedAt ?? now)
        : state === 'working'
          ? (dm.turnStartedAt ?? now)
          : (lastEnd ?? now)
  const ctx = dm.context ?? null
  const life = ctx && ctx.percent !== null ? Math.max(0, 100 - ctx.percent) : null
  const key = await currentWindow($)
  const mine = await read($, spend)
  const events = await read($, log)
  return {
    key: sessionKey,
    label: name || tr('sesión', 'session'),
    state,
    since,
    running,
    life,
    at: now,
    windowKey: key ?? undefined,
    cost: mine.key === key ? mine.cost : 0,
    coins: await ownCoins($),
    unread: list.filter(u => u.status === 'done' && !u.seenAt).length,
    ask: state === 'asking' ? (askWhat ?? tr('te pide algo', 'needs you')) : null,
    last: events.at(-1)?.text ?? null,
    folder: sessionFolder,
    ttys: sessionTtys,
    bell: lastBell,
  }
}

/** El latido: se escribe al cambiar de estado y, si no, a lo más cada minuto. */
async function beat($: EngineInterface, force = false): Promise<void> {
  try {
    if (!force && (await $.clock.now()) - lastBeat < 15_000) return
    const own = await ownEntry($)
    if (!own) return
    const sig = `${own.state}|${own.running}|${own.label}|${own.since}`
    await notifyIfWaiting($, own)
    if (!force && sig === lastBeatSig && own.at - lastBeat < 60_000) return
    lastBeatSig = sig
    lastBeat = own.at
    await serial(() => $.store.set(`reino.${own.key}`, own))
  } catch {
    // Sin almacén, el reino no se ve; el gremio sigue.
  }
}

/** Trae al frente la pestaña de Terminal de otra sesión. */
async function goTo($: EngineInterface, entry: GremioRealmEntry): Promise<void> {
  try {
    const r = await $.process.run(['osascript', '-e', focusScript(entry.ttys ?? [], entry.label)], { timeoutMs: 5000 })
    if (r.stdout.trim() !== 'ok') $.ui.toast(tr(`No encontré la pestaña de ${entry.label} en Terminal`, `Couldn't find the tab for ${entry.label} in Terminal`))
  } catch {
    $.ui.toast(tr('No pude pedirle a Terminal que cambie de pestaña', "Couldn't ask Terminal to switch tabs"))
  }
}

/** Refresca qué agentes tiene todavía el motor (para abrir su conversación o retomarlos). */
async function refreshAgents($: EngineInterface): Promise<void> {
  try {
    listedAgents = new Set((await $.agent.list()).map(a => a.id))
  } catch {
    // Se queda la lista anterior.
  }
}

/** Si esta sesión lleva más de un minuto esperando tu respuesta, avisa por macOS (una vez por pregunta). */
async function notifyIfWaiting($: EngineInterface, own: GremioRealmEntry): Promise<void> {
  if (own.state !== 'asking') {
    notifiedAsk = null
    return
  }
  if (notifiedAsk === own.since || own.at - own.since < 60_000) return
  notifiedAsk = own.since
  try {
    await $.process.run(['osascript', '-e', notifyScript(`${tr('Gremio', 'Guild')} · ${own.label}`, `${own.label} ${own.ask ?? tr('te pide algo', 'needs you')}`)], {
      timeoutMs: 5000,
    })
  } catch {
    // Sin aviso; el reino lo sigue mostrando.
  }
}

/** Lee los latidos de las demás sesiones y olvida los muy viejos. */
async function readRealm($: EngineInterface): Promise<void> {
  try {
    const now = await $.clock.now()
    const keys = (await $.store.keys()).filter(k => k.startsWith('reino.') && k !== `reino.${sessionKey}`)
    const values = await Promise.all(keys.map(k => $.store.get(k) as Promise<GremioRealmEntry | undefined>))
    const entries: GremioRealmEntry[] = []
    values.forEach((v, i) => {
      if (!v || typeof v.at !== 'number') return
      const k = keys[i]
      if (now - v.at > REALM_FORGET_MS && k) void serial(() => $.store.delete(k)).catch(() => undefined)
      else entries.push(v)
    })
    // Se guardan todas (las cerradas siguen contando en el reparto de la jornada);
    // la vista filtra las vigentes. Se compara sin la hora del latido.
    const next = entries.sort((a, b) => a.key.localeCompare(b.key))
    const cur = await read($, realm)
    const shape = (list: readonly GremioRealmEntry[]) => JSON.stringify(list.map(({ at: _at, ...rest }) => ({ ...rest, fresh: now - _at < REALM_FRESH_MS })))
    if (shape(cur) !== shape(next)) {
      await update($, realm, () => next)
      await refreshStatus($)
    }
  } catch {
    // Sin almacén, el reino no se ve.
  }
}

/** El nombre de una sesión en la carpeta de inicio: Haiku lo saca de su primer pedido. */
/** Haiku nombra la sesión en 1 a 3 palabras a partir de su primer pedido; null si no responde. */
async function askName($: EngineInterface, text: string): Promise<string | null> {
  try {
    const r = await $.model.complete({
      model: CLASSIFIER,
      system: tr(
        'Nombras sesiones de trabajo. Respondes solo el nombre, de 1 a 3 palabras, sin comillas ni punto.',
        'You name work sessions. Reply with the name only, 1 to 3 words, in English, no quotes or period.',
      ),
      prompt: tr(
        `Primeros pedidos de la sesión:\n${text.slice(0, 1000)}\n\n¿Cómo se llama esta sesión? (el tema o el proyecto en que más se trabaja)`,
        `First requests of the session:\n${text.slice(0, 1000)}\n\nWhat is this session called? (the topic or project most worked on) Answer in English.`,
      ),
      maxTokens: 12,
      timeoutMs: 6000,
    })
    const spent = costOf(CLASSIFIER, usageFrom(r.usage))
    await update($, treasury, t => ({ ...t, codeCost: t.codeCost + spent }))
    await addSpend($, spent)
    return r.isAnswered ? cleanLabel(r.text) : null
  } catch {
    return null
  }
}

/** Si no hay otro nombre mejor, uno desde el primer pedido que ve esta sesión. */
async function nameSession($: EngineInterface, text: string): Promise<void> {
  if (await read($, label)) return
  await update($, label, () => labelFromPrompt(text))
  await update($, labelSource, () => 'prompt')
  const name = await askName($, text)
  if (name && (await read($, labelSource)) === 'prompt') await update($, label, () => name)
  await beat($, true)
}

/** El archivo de esta conversación (se busca una vez). */
async function findTranscript($: EngineInterface): Promise<string | null> {
  if (transcriptPath || !sessionKey) return transcriptPath
  const home = (await $.env.get('HOME')) ?? ''
  const found = await $.process.run(['find', `${home}/.claude/projects`, '-maxdepth', '2', '-name', `${sessionKey}.jsonl`], {
    timeoutMs: 5000,
  })
  transcriptPath = found.stdout.split('\n')[0]?.trim() || null
  return transcriptPath
}

/** El nombre de la sesión = el título que Claude Code le puso a su pestaña (salvo que lo hayas puesto tú). */
async function refreshTitle($: EngineInterface): Promise<boolean> {
  try {
    if ((await read($, labelSource)) === 'manual') return false
    const path = await findTranscript($)
    if (!path) return false
    const tail = await $.process.run(['tail', '-c', '600000', path], { timeoutMs: 5000 })
    const title = lastTitle(tail.stdout)
    if (!title) return false
    if ((await read($, label)) !== title) {
      await update($, label, () => title)
      await update($, labelSource, () => 'title')
      await beat($, true)
    }
    return true
  } catch {
    return false
  }
}

/** Lo que sonó (y quién): lo ven las demás sesiones, marca la pestaña si terminó Clawd y avisa por macOS si tardó. */
async function ring($: EngineInterface, icon: string, text: string, isMain: boolean, turnMs = 0): Promise<void> {
  try {
    lastBell = { at: await $.clock.now(), icon, text }
    await beat($, true)
    if (!isMain) return
    const name = (await read($, label)) || null
    if (name) await $.process.run(['osascript', '-e', markScript(name, icon)], { timeoutMs: 5000 })
    if (turnMs >= 20_000) await $.process.run(['osascript', '-e', notifyScript(`${tr('Gremio', 'Guild')} · ${name ?? tr('sesión', 'session')}`, text)], { timeoutMs: 5000 })
  } catch {
    // Sin marca ni aviso; el sonido ya sonó.
  }
}

/** El nombre desde el primer pedido real de la conversación (sirve también al retomarla). */
async function nameFromTranscript($: EngineInterface): Promise<void> {
  try {
    if (!sessionKey) return
    const source = await read($, labelSource)
    if (source === 'manual' || source === 'title' || source === 'folder' || source === 'transcript') return
    const path = await findTranscript($)
    if (!path) return
    const head = await $.process.run(['head', '-c', '400000', path], { timeoutMs: 5000 })
    const asked = firstUserTexts(head.stdout)
    if (asked.length === 0) return
    const text = asked.map((t, i) => `${i + 1}. ${t}`).join('\n')
    const name = (await askName($, text)) ?? labelFromPrompt(text)
    if ((await read($, labelSource)) === 'manual') return
    await update($, label, () => name)
    await update($, labelSource, () => 'transcript')
    await beat($, true)
  } catch {
    // Queda el nombre que haya.
  }
}

/** Los aventureros que volvieron hace poco y el motor todavía tiene: se pueden retomar con su memoria. */
async function resumable($: EngineInterface): Promise<{ block: string; sig: string } | null> {
  if (!(await read($, doctrine))) return null
  const now = await $.clock.now()
  await refreshAgents($)
  const listed = listedAgents
  const fresh = (await read($, heroes))
    .filter(u => u.status === 'done' && u.endedAt !== null && now - u.endedAt < 30 * 60_000 && listed.has(u.id))
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
    .filter((u, i, all) => all.findIndex(x => x.name === u.name) === i)
    .slice(0, 4)
  if (fresh.length === 0) return null
  const lines = fresh.map(
    u =>
      tr(
        `- ${u.name}${u.epithet ? `, ${u.epithet}` : ''} (${aliasOf(u.modelId) ?? u.model} · id ${u.id}): «${u.description}», volvió ${ago(now - (u.endedAt ?? now))}`,
        `- ${u.name}${u.epithet ? `, ${u.epithet}` : ''} (${aliasOf(u.modelId) ?? u.model} · id ${u.id}): "${u.description}", came back ${ago(now - (u.endedAt ?? now))}`,
      ),
  )
  const block = [
    tr(
      '[Gremio] Aventureros en la taberna que puedes retomar con su memoria (SendMessage, to: su id) si lo nuevo sigue lo que hicieron; si es otra cosa, envía uno nuevo:',
      '[Guild] Adventurers in the tavern you can resume with their memory (SendMessage, to: their id) if the new work continues what they did; if it is something else, send a new one:',
    ),
    ...lines,
  ].join('\n')
  return { block, sig: fresh.map(u => u.id).join(',') }
}

// Lo que apagaste (sonido, Código) y el idioma que elegiste se recuerdan entre sesiones.
type Settings = { sound: boolean; doctrine: boolean; language?: Lang }

async function savedSettings($: EngineInterface): Promise<Partial<Settings>> {
  const saved = await $.store.get('ajustes')
  return typeof saved === 'object' && saved !== null ? (saved as Partial<Settings>) : {}
}

async function saveSettings($: EngineInterface): Promise<void> {
  try {
    const next: Settings = { ...(await savedSettings($)), sound: await read($, sound), doctrine: await read($, doctrine) }
    await $.store.set('ajustes', next)
  } catch {
    // No se pudo guardar; vale para esta sesión.
  }
}

async function loadSettings($: EngineInterface): Promise<void> {
  try {
    const saved = (await $.store.get('ajustes')) as Partial<Settings> | undefined
    if (typeof saved?.sound === 'boolean') await update($, sound, () => saved.sound as boolean)
    if (typeof saved?.doctrine === 'boolean') await update($, doctrine, () => saved.doctrine as boolean)
  } catch {
    // Sin ajustes guardados todavía.
  }
}

/** El idioma de la sesión: el que elegiste con `/guild language`, o el de Claude Code, o el del sistema. */
async function pickLanguage($: EngineInterface): Promise<void> {
  try {
    const chosen = (await savedSettings($)).language
    if (chosen === 'es' || chosen === 'en') {
      setLang(chosen)
      return
    }
    const rows = await $.config.list().catch(() => [])
    const value = rows.find(r => r.key === 'language')?.value
    const locales = await Promise.all([
      $.env.get('LC_ALL').catch(() => undefined),
      $.env.get('LC_MESSAGES').catch(() => undefined),
      $.env.get('LANG').catch(() => undefined),
    ])
    setLang(langFrom(typeof value === 'string' ? value : null, locales))
  } catch {
    // Queda el idioma que había.
  }
}

/** Guarda el idioma elegido; null vuelve a seguir a Claude Code. */
async function saveLanguage($: EngineInterface, choice: Lang | null): Promise<void> {
  try {
    const { language: _old, ...rest } = await savedSettings($)
    await $.store.set('ajustes', choice ? { ...rest, language: choice } : rest)
  } catch {
    // Vale para esta sesión.
  }
}

/**
 * El plugin se llamaba «gremio»: la primera vez que corre como «guild» trae del
 * almacén viejo el libro, la experiencia y los ajustes (una sola vez).
 */
async function importOldStore($: EngineInterface): Promise<void> {
  try {
    if (await $.store.get('migrado')) return
    if (!(await $.store.keys()).includes('libro')) {
      const home = (await $.env.get('HOME')) ?? ''
      const config = (await $.env.get('CLAUDE_CONFIG_DIR')) || `${home}/.claude`
      const found = await $.process.run(['find', `${config}/plugins/store`, '-maxdepth', '1', '-name', 'gremio_*.json'], { timeoutMs: 5000 })
      const files = found.stdout
        .split('\n')
        .map(f => f.trim())
        .filter(f => OLD_STORE.test(f.split('/').pop() ?? ''))
      const stores = await Promise.all(
        files.map(f =>
          $.process
            .run(['cat', f], { timeoutMs: 5000 })
            .then(r => JSON.parse(r.stdout) as unknown)
            .catch(() => null),
        ),
      )
      for (const [key, value] of Object.entries(pickImport(stores))) await $.store.set(key, value as never)
    }
    await $.store.set('migrado', true)
  } catch {
    // Sin historia vieja que traer.
  }
}

function patchHero(id: string, fn: (u: GremioHero) => GremioHero) {
  return (list: GremioHero[]) => list.map(u => (u.id === id ? fn(u) : u))
}

// El libro y la experiencia se guardan entre sesiones.
function asBook(value: unknown): GremioBook {
  return value && typeof value === 'object' ? { ...EMPTY_BOOK, ...(value as Partial<GremioBook>) } : EMPTY_BOOK
}

// Las escrituras del almacén van en fila: dos eventos a la vez (una misión que
// vuelve y una lectura de cuota) podían leer el mismo libro y pisarse.
let storeQueue: Promise<unknown> = Promise.resolve()

function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = storeQueue.then(fn, fn)
  storeQueue = run.catch(() => undefined)
  return run
}

async function bumpBook($: EngineInterface, fn: (b: GremioBook) => GremioBook): Promise<void> {
  const next = await serial(async () => {
    const cur = asBook(await $.store.get('libro'))
    const changed = fn(cur)
    if (changed !== cur) await $.store.set('libro', changed)
    return changed
  })
  const shown = await read($, book)
  if (JSON.stringify(shown) !== JSON.stringify(next)) await update($, book, () => next)
}

async function bumpXp($: EngineInterface, fn: (xp: Xp) => Xp): Promise<{ before: Xp; after: Xp }> {
  return serial(async () => {
    const before = await loadXp($)
    const after = fn(before)
    await $.store.set('experiencia', after)
    return { before, after }
  })
}

function bumpClass(b: GremioBook, cls: GremioClass, d: Partial<GremioClassStats>): GremioBook {
  const cur = b.byClass[cls] ?? { missions: 0, good: 0, bad: 0, cost: 0, tokens: 0 }
  const next: GremioClassStats = {
    missions: cur.missions + (d.missions ?? 0),
    good: cur.good + (d.good ?? 0),
    bad: cur.bad + (d.bad ?? 0),
    cost: cur.cost + (d.cost ?? 0),
    tokens: cur.tokens + (d.tokens ?? 0),
  }
  return { ...b, byClass: { ...b.byClass, [cls]: next } }
}

async function loadXp($: EngineInterface): Promise<Xp> {
  try {
    const value = await $.store.get('experiencia')
    return value && typeof value === 'object' ? (value as Xp) : {}
  } catch {
    // Sin experiencia guardada, el Código decide solo con el tipo de misión.
    return {}
  }
}

/** El Código le pregunta a Haiku qué tipo de misión es; null si no responde. */
async function classify($: EngineInterface, description: string, prompt: string): Promise<{ task: GremioTask; writes: boolean } | null> {
  try {
    const r = await $.model.complete({
      model: CLASSIFIER,
      system: CLASSIFIER_SYSTEM,
      prompt: classifierPrompt(description, prompt),
      maxTokens: 60,
      timeoutMs: 3000,
    })
    const spent = costOf(CLASSIFIER, usageFrom(r.usage))
    await update($, treasury, t => ({ ...t, codeCost: t.codeCost + spent }))
    await addSpend($, spent)
    await bumpBook($, b => ({ ...b, codeCost: b.codeCost + spent }))
    return r.isAnswered ? parseVerdict(r.text) : null
  } catch {
    return null
  }
}

/** Tu calificación del botín: corrige la experiencia y el libro. */
async function rateLoot($: EngineInterface, id: string, verdict: 'up' | 'down'): Promise<void> {
  const hero = (await read($, heroes)).find(x => x.id === id)
  // Se califica una sola vez.
  if (!hero || hero.status === 'running' || hero.status === 'aborted' || hero.rating !== null) return
  const wasOk = hero.rating === 'up' ? true : hero.rating === 'down' ? false : hero.status === 'done'
  const isOk = verdict === 'up'
  await update(
    $,
    heroes,
    patchHero(id, x => ({ ...x, rating: verdict })),
  )
  if (wasOk !== isOk) {
    if (hero.task) {
      const task = hero.task
      const xp = await bumpXp($, x => flip(x, id, isOk))
      await notePromotion($, task, hero.cls, xp)
    }
    const d = isOk ? { good: 1, bad: -1 } : { good: -1, bad: 1 }
    await bumpBook($, b => bumpClass({ ...b, good: b.good + d.good, bad: b.bad + d.bad }, hero.cls, d))
  }
  await note(
    $,
    tr(
      `${isOk ? '👍' : '👎'} Calificaste el botín de ${hero.name}: ${isOk ? 'bueno' : 'malo'}`,
      `${isOk ? '👍' : '👎'} You rated ${hero.name}'s loot: ${isOk ? 'good' : 'bad'}`,
    ),
    hero.id,
  )
}

/** La fecha local de un instante: AAAA-MM-DD. */
function dayOf(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Los últimos `n` días (AAAA-MM-DD), hoy incluido. */
function lastDays(now: number, n: number): string[] {
  return Array.from({ length: n }, (_, i) => dayOf(now - i * 86_400_000))
}

/** A medianoche termina la jornada: los que no están en misión se van a casa y la numeración vuelve a 1. */
async function closeDay($: EngineInterface): Promise<void> {
  const today = dayOf(await $.clock.now())
  const was = await read($, day)
  if (was === today) return
  await update($, day, () => today)
  if (!was) return
  const list = await read($, heroes)
  const stay = list.filter(u => u.status === 'running')
  const gone = list.filter(u => u.status !== 'running')
  if (gone.length === 0) return
  const back = gone.filter(u => u.status === 'done').length
  await update($, heroes, () => stay)
  await update($, counters, () => {
    const next: Record<string, number> = {}
    for (const u of stay) next[u.cls] = Math.max(next[u.cls] ?? 0, Number(u.name.split(' ').pop()) || 0)
    return next
  })
  await update($, selected, cur => (cur && cur !== 'maestro' && !stay.some(u => u.id === cur) ? null : cur))
  await update($, tavernOpen, () => false)
  await note(
    $,
    tr(
      `🌙 Fin de la jornada: ${gone.length} ${gone.length === 1 ? 'misión' : 'misiones'}, ${back} con botín. Todos se fueron a casa.`,
      `🌙 End of the day: ${gone.length} ${gone.length === 1 ? 'quest' : 'quests'}, ${back} with loot. Everyone went home.`,
    ),
  )
}

/** Si la experiencia acaba de hacer que el Código suba una clase, lo cuenta en la crónica. */
async function notePromotion($: EngineInterface, task: GremioTask, cls: GremioClass, xp: { before: Xp; after: Xp }): Promise<void> {
  const was = promote(xp.before, task, cls)
  const now = promote(xp.after, task, cls)
  if (now && !was)
    await note(
      $,
      tr(
        `🛑 Los ${CLASS_PLURAL[cls]} ${now.why}: la próxima va con un ${CLASS_LABEL[now.cls]}`,
        `🛑 ${CLASS_PLURAL[cls]} ${now.why}: the next one goes with ${aOrAn(CLASS_LABEL[now.cls])}`,
      ),
    )
  else if (was && !now)
    await note(
      $,
      tr(
        `✓ Los ${CLASS_PLURAL[cls]} se recuperaron en ${taskWord(task)}: vuelven a ir ellos`,
        `✓ ${CLASS_PLURAL[cls]} recovered at ${taskWord(task)}: they go again`,
      ),
    )
}

/** Guarda lo lleno del contexto: la vida de Clawd. */
async function absorbContext($: EngineInterface, c: { window: number; tokens?: number; percent?: number }): Promise<void> {
  const context: GremioContext = { percent: c.percent ?? null, tokens: c.tokens ?? null, window: c.window }
  const was = (await read($, master)).context
  if (was && was.percent === context.percent && was.tokens === context.tokens && was.window === context.window) return
  await update($, master, m => ({ ...m, context }))
  await refreshStatus($)
  // Un aviso por bajada: se vuelve a armar cuando la vida sube de 30 (tras /compact o /clear).
  if (context.percent === null) return
  const life = Math.max(0, 100 - context.percent)
  const wasWarned = await read($, lifeWarned)
  if (life <= LOW_LIFE && !wasWarned) {
    await update($, lifeWarned, () => true)
    $.ui.toast(
      tr(
        `💤 A Clawd le queda poca vida (${Math.round(life)} %): un /compact lo deja como nuevo.`,
        `💤 Clawd is low on HP (${Math.round(life)} %): a /compact leaves Clawd good as new.`,
      ),
    )
    await note($, tr(`💤 A Clawd le queda poca vida (${Math.round(life)} %)`, `💤 Clawd is low on HP (${Math.round(life)} %)`))
  } else if (life > LOW_LIFE + 10 && wasWarned) {
    await update($, lifeWarned, () => false)
  }
}

/** "320 k", "1 M", "1,2 M". */
function tokensText(n: number): string {
  if (n >= 1_000_000) {
    const m = (n / 1_000_000).toFixed(1).replace(/\.0$/, '')
    return `${tr(m.replace('.', ','), m)} M`
  }
  if (n >= 1000) return `${Math.round(n / 1000)} k`
  return String(n)
}

/**
 * Si al ritmo de la última media hora (o más) la bolsa de la jornada se acaba
 * antes de rellenarse, avisa una vez por ventana; el aviso se guarda para que
 * las demás sesiones abiertas no lo repitan.
 */
// Las ventanas ya avisadas en esta sesión (por si el almacén falla).
const warnedWindows = new Set<string>()

async function warnPurse($: EngineInterface, now: number): Promise<void> {
  const q = await read($, quota)
  const w = q.windows.find(x => x.kind === 'five_hour')
  const fc = forecast(q, now)
  const recent = q.samples.filter(x => now - x.at <= 60 * 60 * 1000)
  const measured = recent.length > 1 ? (recent[recent.length - 1]?.at ?? 0) - (recent[0]?.at ?? 0) : 0
  if (!w || !w.resetsAt || !fc || fc.isEnough || measured < 20 * 60 * 1000) return
  const resetsAt = w.resetsAt
  if (warnedWindows.has(resetsAt)) return
  warnedWindows.add(resetsAt)
  try {
    const isNew = await serial(async () => {
      if ((await $.store.get('avisoBolsa')) === resetsAt) return false
      await $.store.set('avisoBolsa', resetsAt)
      return true
    })
    if (!isNew) return
  } catch {
    // Sin almacén: avisa igual, una vez en esta sesión.
  }
  $.ui.toast(
    tr(
      `🪙 A este ritmo la bolsa de la jornada se acaba en ${span(fc.msToFull)}, antes de rellenarse.`,
      `🪙 At this pace the shift purse runs out in ${span(fc.msToFull)}, before it refills.`,
    ),
  )
  await note($, tr(`🪙 La bolsa se acaba en ${span(fc.msToFull)} a este ritmo`, `🪙 The purse runs out in ${span(fc.msToFull)} at this pace`))
}

/** Suma una lectura de las ventanas del plan y anota en el libro lo consumido. */
async function absorbLimits($: EngineInterface, limits: readonly Limit[]): Promise<void> {
  if (limits.length === 0) return
  const at = await $.clock.now()
  await update($, quota, cur => absorb(cur, limits, at).quota)
  await refreshStatus($)
  await warnPurse($, at)
  try {
    const fiveNow = limits.find(l => l.kind === 'five_hour')
    const weekNow = limits.find(l => l.kind === 'seven_day')
    const reading = (l: Limit | undefined) => (l ? { percent: l.percentUsed, resetsAt: l.resetsAt ?? null } : undefined)
    await bumpBook($, b => absorbQuota(b, reading(fiveNow), reading(weekNow)))
  } catch {
    // El libro no se pudo guardar; la sesión sigue.
  }
}

/** Reparte los puntos de cuota según el peso de cada uno (estimado: el costo de su modelo). */
function shareOf(weight: number, t: GremioTreasury, points: number): number {
  const total = t.masterCost + t.heroesCost + t.codeCost
  return total > 0 ? (weight / total) * points : 0
}

function pct(good: number, total: number): string {
  return total > 0 ? `${Math.round((good / total) * 100)}%` : '·'
}

async function openPane($: EngineInterface) {
  return $.ui.open({ id: PANE, title: tr('Gremio de Clawd', "Clawd's Guild") })
}

/** Te pregunta antes de enviar a un Archimago (Fable). */
async function askFable($: EngineInterface, e: AgentSpawnInput): Promise<'yes' | 'opus' | string> {
  const run = e.workflow?.runId
  if (run && fableRuns.has(run)) return 'yes'
  let answer = ''
  const optOpus = tr('Mejor un Mago (Opus)', 'A Mage (Opus) instead')
  const optYes = tr('Autorizar Archimago', 'Approve Archmage')
  const optNo = tr('No enviarlo', 'Do not send')
  try {
    answer = await $.ui.ask(
      tr(
        `Clawd quiere enviar a un Archimago (Fable, el modelo más poderoso y el más caro) para: «${cut(e.description || e.prompt, 70)}». ¿Lo autorizas?`,
        `Clawd wants to send an Archmage (Fable, the most powerful and most expensive model) for: "${cut(e.description || e.prompt, 70)}". Do you approve?`,
      ),
      // La opción segura va primero, por si el cuadro se responde solo cuando no estás.
      { header: tr('Archimago', 'Archmage'), options: [optOpus, optYes, optNo] },
    )
  } catch {
    answer = optNo
  }
  if (answer === optYes) {
    if (run) fableRuns.add(run)
    return 'yes'
  }
  if (answer === optOpus) return 'opus'
  return answer
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await importOldStore($)
    await pickLanguage($)
    // «/guild» para todos; «/gremio» también, para quien habla español.
    for (const name of lang() === 'es' ? ['guild', 'gremio'] : ['guild']) {
      await $.command.register({
        name,
        description: tr(
          'Abre el Gremio de Clawd: el Gran Maestre y sus aventureros en vivo ("sonidos" los toca todos, "cuentas" muestra la cuota del plan, "idioma en" lo pasa a inglés)',
          'Opens Clawd\'s Guild: the Grand Master and their adventurers live ("sounds" plays them all, "accounts" shows the plan quota, "language es" switches to Spanish)',
        ),
      })
    }
    $.clock.every(400, () => tick($))
    try {
      const saved = asBook(await $.store.get('libro'))
      await update($, book, () => saved)
    } catch {
      // Sin libro guardado todavía.
    }
    await loadSettings($)
    // El texto de «quieto» que haya quedado guardado se pone en el idioma de la sesión.
    await update($, master, m => (isIdle(m.doing) ? { ...m, doing: idle() } : m))
    await closeDay($)
    // El reino: quién es esta sesión y cómo se llama (la carpeta, salvo la de inicio).
    try {
      sessionKey = await $.session.id()
      // La raíz del proyecto (donde partió); un cd de la terminal no la mueve.
      sessionFolder = await $.session.root().catch(() => e.cwd)
      sessionHome = (await $.env.get('HOME')) ?? null
      sessionTtys = await $.process
        .run(['/bin/sh', '-c', TTY_SCRIPT], { timeoutMs: 3000 })
        .then(r => cleanTtys(r.stdout))
        .catch(() => [])
      const byFolder = labelFromCwd(sessionFolder, sessionHome)
      const source = await read($, labelSource)
      if (byFolder && source !== 'manual' && source !== 'title') {
        await update($, label, () => byFolder)
        await update($, labelSource, () => 'folder')
      } else {
        // Un nombre por carpeta que ya no corresponde (tomado de un cd) se rehace.
        if (source === 'folder') {
          await update($, label, () => '')
          await update($, labelSource, () => '')
        }
        void refreshTitle($).then(ok => (ok ? undefined : nameFromTranscript($)))
      }
    } catch {
      // Sin id, esta sesión no aparece en el reino.
    }
    await refreshStatus($)
    await beat($, true)
    await readRealm($)
    await refreshAgents($)
    $.clock.every(5_000, () => void readRealm($))
    $.clock.every(20_000, () => void Promise.all([beat($), refreshAgents($)]))
    $.clock.every(60_000, () => void refreshTitle($))
    // Un saludo según la hora, solo al abrir la sesión (no al recargar el mod).
    if ((await read($, log)).length === 0) {
      const hour = new Date(await $.clock.now()).getHours()
      await note(
        $,
        hour >= 5 && hour < 12
          ? tr('🌅 Buenos días: Clawd abre el gremio', '🌅 Good morning: Clawd opens the guild')
          : hour >= 12 && hour < 20
            ? tr('🌞 Buenas tardes: Clawd abre el gremio', '🌞 Good afternoon: Clawd opens the guild')
            : tr('🌙 Buenas noches: Clawd abre el gremio', '🌙 Good evening: Clawd opens the guild'),
      )
    }
    // La cuota del plan: una lectura ahora y otra cada minuto (es gratis).
    const readQuota = () =>
      $.session
        .usage()
        .then(async u => {
          await absorbContext($, u.context)
          await absorbLimits($, u.rateLimits)
        })
        .catch(() => undefined)
    await readQuota()
    $.clock.every(60_000, () => void readQuota())
    void openPane($)
    return next(e)
  })

  for (const command of ['guild', 'gremio'] as const) on('command.run', { command }, async ($, e) => {
    const rename = /^\s*(?:nombre|name)\s+(.+)$/i.exec(e.args)
    if (rename) {
      const name = rename[1]?.trim().slice(0, 32) ?? ''
      await update($, label, () => name)
      await update($, labelSource, () => 'manual')
      await beat($, true)
      return { text: tr(`En el reino, esta sesión se llama «${name}».`, `In the realm, this session is called "${name}".`) }
    }
    const language = /^\s*(?:idioma|language|lang)\b\s*(.*)$/i.exec(e.args)
    if (language) {
      const choice = langChoice(language[1] ?? '')
      if (!choice) {
        return {
          text: tr(
            'Idiomas: `/guild idioma es`, `/guild idioma en` o `/guild idioma auto` (sigue a Claude Code).',
            'Languages: `/guild language en`, `/guild language es` or `/guild language auto` (follows Claude Code).',
          ),
        }
      }
      await saveLanguage($, choice === 'auto' ? null : choice)
      await pickLanguage($)
      await update($, master, m => (isIdle(m.doing) ? { ...m, doing: idle() } : m))
      $.ui.invalidate('prompt.section')
      $.ui.invalidate('ui.render')
      await refreshStatus($)
      return {
        text:
          choice === 'auto'
            ? tr('El gremio vuelve a seguir el idioma de Claude Code.', "The guild follows Claude Code's language again.")
            : tr('El gremio ahora habla español.', 'The guild now speaks English.'),
      }
    }
    if (/cerrar|close/i.test(e.args)) {
      await $.ui.close({ id: PANE })
      return { text: tr('Gremio cerrado.', 'Guild closed.') }
    }
    if (/sonido|sound/i.test(e.args)) {
      SOUNDS.forEach((name, i) => {
        $.clock.after(i * 2600, () => play($, name))
      })
      return {
        text: tr(
          'Sonando en orden: Gran Maestre (marimba), Archimago, Mago, Bardo, Pícaro y la trompeta triste de cuando algo falla.',
          'Playing in order: Grand Master (marimba), Archmage, Mage, Bard, Rogue and the sad trumpet for when something fails.',
        ),
      }
    }
    if (/cuenta|cuota|oro|libro|account|quota|gold|ledger/i.test(e.args)) {
      const t = await read($, treasury)
      const q = await read($, quota)
      const b = asBook(await $.store.get('libro'))
      const party = await read($, heroes)
      const now = await $.clock.now()
      const dm = await read($, master)
      const pts = (await ownCoins($)) ?? q.sessionFive
      const order: GremioClass[] = ['archimago', 'mago', 'bardo', 'picaro']
      const purseName = (kind: string) =>
        kind === 'five_hour'
          ? tr('Bolsa de la jornada', 'Shift purse')
          : kind === 'seven_day'
            ? tr('Cofre de la semana', 'Weekly chest')
            : tr(`Cofre (${kindLabel(kind)})`, `Chest (${kindLabel(kind)})`)
      const windows = q.windows.map(
        w =>
          tr(
            `- ${purseName(w.kind)}: quedan ${coinText(Math.max(0, 100 - w.percent))} de 100 monedas${w.resetsAt ? `, se rellena en ${span(Date.parse(w.resetsAt) - now)}` : ''}`,
            `- ${purseName(w.kind)}: ${coinText(Math.max(0, 100 - w.percent))} of 100 coins left${w.resetsAt ? `, refills in ${span(Date.parse(w.resetsAt) - now)}` : ''}`,
          ),
      )
      const rate = ratePerHour(q, now)
      const fc = forecast(q, now)
      const split = order
        .map(cls => [cls, party.filter(x => x.cls === cls).reduce((sum, x) => sum + (x.cost ?? 0), 0)] as const)
        .filter(([, w]) => w > 0)
        .map(([cls, w]) => tr(`los ${CLASS_PLURAL[cls]} ${coinText(shareOf(w, t, pts))}`, `${CLASS_PLURAL[cls]} ${coinText(shareOf(w, t, pts))}`))
      const bookTotal = b.cost + b.masterCost + b.codeCost
      const rows = order
        .filter(cls => b.byClass[cls])
        .map(cls => {
          const c = b.byClass[cls] as GremioClassStats
          return `| ${CLASS_LABEL[cls]} | ${c.missions} | ${pct(c.good, c.good + c.bad)} | ${bookTotal > 0 ? pctText((c.cost / bookTotal) * 100) : '·'} |`
        })
      const cheap = dm.model
        ? tr(`solo ${CLASS_PLURAL[classOf(dm.model)]}`, `only ${CLASS_PLURAL[classOf(dm.model)]}`)
        : tr('puros aventureros caros', 'only expensive adventurers')
      const text = [
        tr('**💰 Tesoro del gremio** (tu cuota del plan: 1 moneda = 1%)', '**💰 Guild treasury** (your plan quota: 1 coin = 1%)'),
        ...(windows.length > 0 ? windows : [tr('- La bolsa aparece con la próxima respuesta del modelo.', "- The purse shows up with the model's next reply.")]),
        tr(
          `- ${rate === null ? 'Midiendo el gasto por hora' : `Gastas ${coinText(rate)} monedas por hora`}${fc ? (fc.isEnough ? ', te alcanzan hasta que se rellene la bolsa' : `; a este ritmo la bolsa se vacía en ${span(fc.msToFull)}, antes de rellenarse`) : ''}`,
          `- ${rate === null ? 'Measuring spend per hour' : `You spend ${coinText(rate)} coins per hour`}${fc ? (fc.isEnough ? ', enough to last until the purse refills' : `; at this pace the purse empties in ${span(fc.msToFull)}, before it refills`) : ''}`,
        ),
        '',
        tr(
          `**Esta jornada** el gremio gastó ${coinText(pts)} monedas: Clawd ${coinText(shareOf(t.masterCost, t, pts))}${split.length > 0 ? `, ${split.join(', ')}` : ''}`,
          `**This shift** the guild spent ${coinText(pts)} coins: Clawd ${coinText(shareOf(t.masterCost, t, pts))}${split.length > 0 ? `, ${split.join(', ')}` : ''}`,
        ),
        ...(t.saved > 0 && pts > 0
          ? [
              tr(
                `- El Código te ahorró ≈ ${coinText(shareOf(t.saved, t, pts))} monedas frente a mandar ${cheap}`,
                `- The Code saved you ≈ ${coinText(shareOf(t.saved, t, pts))} coins versus sending ${cheap}`,
              ),
            ]
          : []),
        tr(
          '_El reparto entre Clawd y los aventureros es estimado, según el peso de cada modelo._',
          "_The split between Clawd and the adventurers is an estimate, based on each model's weight._",
        ),
        '',
        tr('**📕 Libro del gremio** (todas las sesiones)', '**📕 Guild ledger** (all sessions)'),
        tr(
          `- ${b.missions} ${b.missions === 1 ? 'misión' : 'misiones'} · buen botín ${pct(b.good, b.good + b.bad)} · ${coinText(b.fivePoints)} monedas de jornada gastadas`,
          `- ${b.missions} ${b.missions === 1 ? 'quest' : 'quests'} · good loot ${pct(b.good, b.good + b.bad)} · ${coinText(b.fivePoints)} shift coins spent`,
        ),
        ...(rows.length > 0
          ? [
              '',
              tr('| Clase | Misiones | Buen botín | Parte del oro |', '| Class | Quests | Good loot | Share of gold |'),
              '|---|---|---|---|',
              ...rows,
            ]
          : []),
      ].join('\n')
      return { text }
    }
    const opened = await openPane($)
    return {
      text: opened.isPlaced
        ? tr('Gremio abierto.', 'Guild opened.')
        : tr(`El gremio espera lugar en pantalla: ${opened.reason}`, `The guild is waiting for room on screen: ${opened.reason}`),
    }
  })

  // Cada vez que una ventana del plan se mueve, la cuota se actualiza.
  on('session.measure', async ($, e, next) => {
    try {
      await absorbContext($, e.context)
      await absorbLimits($, e.rateLimits)
    } catch {
      // Sin cambio.
    }
    return next(e)
  })

  on('ui.close', { id: PANE }, ($, e, next) => {
    isPaneUp = false
    drawn = new Map()
    return next(e)
  })

  // Clawd, el Gran Maestre: la sesión principal.
  on('turn.start', async ($, e, next) => {
    try {
      if (e.agentId === undefined) {
        const at = await $.clock.now()
        await update($, master, m => ({ ...m, isBusy: true, doing: tr('🧠 pensando', '🧠 thinking'), turnStartedAt: at, turnActions: 0 }))
        await beat($, true)
      } else {
        const id = e.agentId
        await update(
          $,
          heroes,
          patchHero(id, u => ({
            ...u,
            status: 'running',
            doing: (u.round ?? 1) > 1 ? tr('📨 leyendo tu mensaje', '📨 reading your message') : tr('📜 leyendo la misión', '📜 reading the quest'),
            endedAt: null,
          })),
        )
      }
    } catch {
      // El gremio nunca frena el trabajo.
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    try {
      if (e.agentId === undefined) {
        const model = e.usage?.model
        const at = await $.clock.now()
        await update($, master, m => ({
          ...m,
          isBusy: false,
          doing: idle(),
          model: model ?? m.model,
          lastTurnMs: m.turnStartedAt ? at - m.turnStartedAt : (m.lastTurnMs ?? null),
          lastTurnEndAt: at,
        }))
        permissionAt = null
        await beat($, true)
        // Melodía si terminó bien; trompeta triste si falló; nada si lo interrumpiste.
        if (e.reason === 'answer') await chime($, 'maestro')
        else if (e.reason !== 'aborted') await chime($, 'caido')
        const turnMs = e.durationMs ?? 0
        if (e.reason === 'answer') await ring($, '🔔', tr('Clawd terminó', 'Clawd finished'), true, turnMs)
        else if (e.reason !== 'aborted') await ring($, '🩹', tr('Clawd tuvo un problema', 'Clawd hit a problem'), true, turnMs)
        if (e.usage) {
          const used = usageFrom(e.usage)
          const spent = costOf(e.usage.model, used)
          await update($, treasury, t => ({ ...t, masterCost: t.masterCost + spent, masterTokens: t.masterTokens + totalTokens(used) }))
          await addSpend($, spent)
          try {
            await bumpBook($, b => ({ ...b, masterCost: b.masterCost + spent }))
          } catch {
            // El libro no se pudo guardar; la sesión sigue.
          }
        }
      } else {
        const id = e.agentId
        const at = await $.clock.now()
        const used = e.usage ? usageFrom(e.usage) : null
        const status = e.reason === 'answer' ? 'done' : e.reason === 'aborted' ? 'aborted' : 'failed'
        const hero = (await read($, heroes)).find(one => one.id === id)
        if (hero) {
          const spent = used ? costOf(e.usage?.model || hero.modelId, used) : 0
          const saved = used ? costOf(hero.baseline, used) - spent : 0
          await update(
            $,
            heroes,
            patchHero(id, one => ({
              ...one,
              status,
              endedAt: at,
              tokens: used === null ? one.tokens : (one.tokens ?? 0) + totalTokens(used),
              usage: used === null ? one.usage : addUsage(one.usage, used),
              cost: (one.cost ?? 0) + spent,
              saved: (one.saved ?? 0) + saved,
              report: e.answer ? cut(e.answer, 600) : one.report,
              reportFull: e.answer ? e.answer.slice(0, 20_000) : (one.reportFull ?? null),
              doing:
                status === 'done'
                  ? tr('💰 volvió con el botín', '💰 came back with the loot')
                  : status === 'aborted'
                    ? tr('🚪 abandonó la misión', '🚪 left the quest')
                    : tr('🩹 volvió herido', '🩹 came back wounded'),
            })),
          )
          const verb =
            status === 'done'
              ? tr('volvió con el botín', 'came back with the loot')
              : status === 'aborted'
                ? tr('abandonó la misión', 'left the quest')
                : tr('volvió herido', 'came back wounded')
          const icon = status === 'done' ? '💰' : status === 'aborted' ? '🚪' : '🩹'
          // Se queda unos segundos en el campo con su botín antes de entrar a la taberna.
          returnRedraws.push(frame + Math.ceil((RETURN_MS + 200) / 400))
          await refreshAgents($)
          await note($, `${icon} ${hero.name} ${verb} · ${duration(at - (hero.roundStartedAt ?? hero.startedAt))}`, hero.id)
          if (status === 'done') await chime($, hero.cls)
          if (status === 'failed') await chime($, 'caido')
          if (status === 'done') await ring($, '💰', tr(`${hero.name} volvió con el botín`, `${hero.name} came back with the loot`), false)
          if (status === 'failed') await ring($, '🩹', tr(`${hero.name} volvió herido`, `${hero.name} came back wounded`), false)
          await refreshStatus($)
          await update($, treasury, t => ({ ...t, heroesCost: t.heroesCost + spent, saved: t.saved + saved }))
          await addSpend($, spent)
          const isCounted = status !== 'aborted'
          const isOk = status === 'done'
          try {
            await bumpBook($, b =>
              bumpClass(
                {
                  ...b,
                  missions: b.missions + (isCounted ? 1 : 0),
                  good: b.good + (isCounted && isOk ? 1 : 0),
                  bad: b.bad + (isCounted && !isOk ? 1 : 0),
                  cost: b.cost + spent,
                  saved: b.saved + saved,
                },
                hero.cls,
                {
                  missions: isCounted ? 1 : 0,
                  good: isCounted && isOk ? 1 : 0,
                  bad: isCounted && !isOk ? 1 : 0,
                  cost: spent,
                  tokens: used ? totalTokens(used) : 0,
                },
              ),
            )
            if (isCounted && hero.task) {
              const task = hero.task
              const xp = await bumpXp($, x => record(x, task, hero.cls, hero.id, isOk))
              await notePromotion($, task, hero.cls, xp)
            }
          } catch {
            // El libro no se pudo guardar; la sesión sigue.
          }
        }
      }
    } catch {
      // El gremio nunca frena el trabajo.
    }
    return next(e)
  })

  // Cada agente que nace pasa por el Código y queda como aventurero nuevo.
  on('agent.spawn', async ($, e, next) => {
    let input = e
    let choice = e.model ? tr(`lo eligió Clawd (${e.model})`, `chosen by Clawd (${e.model})`) : tr('heredado de quien lo envió', 'inherited from whoever sent it')
    let isReadOnly = false
    let briefWords: number | null = null
    let effort: GremioEffort | null = null
    let task: GremioTask | null = null
    let promoted: string | null = null
    const isNew = e.resume === undefined && e.isTeammate === undefined
    const isOn = isNew && (await read($, doctrine))

    if (isOn) {
      let p = plan(e.description, e.prompt)
      // Haiku dice qué tipo de misión es; si no responde, quedan las palabras clave.
      if (!e.fork && e.workflow === undefined) {
        const verdict = await classify($, e.description, e.prompt)
        if (verdict) p = planFor(verdict.task, verdict.writes)
      }
      task = p.task
      if (e.fork && p.alias === 'haiku') {
        await note($, tr(`🛑 El Código frenó un clon para algo liviano: ${cut(e.description, 40)}`, `🛑 The Code stopped a clone for a light task: ${cut(e.description, 40)}`))
        return {
          deny: tr(
            'Código del Gremio: para una tarea liviana no se envía un fork con toda la conversación. Envía un agente nuevo (sin fork) con una misión breve y model: "haiku".',
            'Guild Code: for a light task, do not send a fork with the whole conversation. Send a new agent (no fork) with a short quest and model: "haiku".',
          ),
        }
      }
      if (!e.fork) {
        if (e.model === undefined) {
          // La experiencia: si a esta clase le va mal en este tipo de misión, sube una.
          const from = classOfAlias(p.alias)
          const up = promote(await loadXp($), p.task, from)
          if (up) {
            promoted = tr(
              `Los ${CLASS_PLURAL[from]} ${up.why}: el Código mandó un ${CLASS_LABEL[up.cls]}`,
              `${CLASS_PLURAL[from]} ${up.why}: the Code sent ${aOrAn(CLASS_LABEL[up.cls])}`,
            )
            p = raise(p, up.cls)
          }
          input = { ...input, model: p.alias }
          choice = up
            ? tr(`lo asignó el Código por experiencia: ${p.why}`, `assigned by the Code from experience: ${p.why}`)
            : tr(`lo asignó el Código: ${p.why}`, `assigned by the Code: ${p.why}`)
        } else if (!isFable(e.model)) {
          choice =
            aliasOf(e.model) === p.alias
              ? tr(`lo eligió Clawd (${p.why})`, `chosen by Clawd (${p.why})`)
              : tr(`lo eligió Clawd (el Código sugería ${p.alias})`, `chosen by Clawd (the Code suggested ${p.alias})`)
        }
        const alias = aliasOf(input.model ?? '')
        isReadOnly = p.isReadOnly && alias === 'haiku'
        effort = alias === 'haiku' ? 'low' : p.alias === 'opus' ? 'high' : effortFor(alias)
        briefWords = setsLength(e.prompt) ? null : p.words
        input = { ...input, prompt: e.prompt + brief({ ...p, isReadOnly }, e.prompt) }
      }
    }

    // El Archimago (Fable) siempre pasa por ti, con el Código encendido o apagado.
    const wanted = e.fork ? e.parentModel : (input.model ?? e.parentModel)
    // También los teammates: un envío nuevo de Fable nunca pasa sin preguntar.
    if (e.resume === undefined && isFable(wanted)) {
      const verdict = await askFable($, e)
      if (verdict === 'yes') {
        choice = tr('Archimago autorizado por ti', 'Archmage approved by you')
        if (isOn && !e.fork) effort = 'high'
      } else if (verdict === 'opus' && !e.fork) {
        input = { ...input, model: 'opus' }
        choice = tr('pediste un Mago (Opus) en vez del Archimago', 'you asked for a Mage (Opus) instead of the Archmage')
        if (isOn) effort = 'high'
      } else {
        await note($, tr(`🚫 No autorizaste al Archimago: ${cut(e.description || e.prompt, 40)}`, `🚫 You did not approve the Archmage: ${cut(e.description || e.prompt, 40)}`))
        return {
          deny:
            verdict === 'opus'
              ? tr(
                  'La persona prefiere Opus, pero un fork siempre usa el modelo de la sesión principal. Envía un agente nuevo con model: "opus".',
                  'The person prefers Opus, but a fork always uses the main session model. Send a new agent with model: "opus".',
                )
              : tr(
                  `La persona no autorizó usar Fable${verdict && verdict !== 'No enviarlo' ? ` (respondió: "${cut(verdict, 120)}")` : ''}. No se envió el agente; usa opus o sonnet, o pregúntale.`,
                  `The person did not approve using Fable${verdict && verdict !== 'Do not send' ? ` (they replied: "${cut(verdict, 120)}")` : ''}. The agent was not sent; use opus or sonnet, or ask them.`,
                ),
        }
      }
    }

    const started = await next(input)
    try {
      const resumedId = e.resume?.agentId ?? ('agentId' in started ? started.agentId : undefined)
      const known = e.resume ? (await read($, heroes)).find(u => u.id === resumedId) : undefined
      if (known && resumedId) {
        const at = await $.clock.now()
        const round = (known.round ?? 1) + 1
        const message = e.prompt.trim() ? cut(e.prompt, 240) : null
        await update(
          $,
          heroes,
          patchHero(resumedId, u => ({
            ...u,
            status: 'running',
            endedAt: null,
            round,
            roundStartedAt: at,
            lastMessage: message ?? u.lastMessage ?? null,
            doing: tr('📨 leyendo tu mensaje', '📨 reading your message'),
          })),
        )
        const boss = (await read($, heroes)).find(u => u.id === known.parentId)
        await note(
          $,
          tr(
            `📨 ${boss ? boss.name : 'Clawd'} le escribió de nuevo a ${known.name}${message ? `: ${cut(message, 40)}` : ''}`,
            `📨 ${boss ? boss.name : 'Clawd'} wrote to ${known.name} again${message ? `: ${cut(message, 40)}` : ''}`,
          ),
          known.id,
        )
        await refreshStatus($)
      } else if ('agentId' in started && started.agentId) {
        const resolved = started.model || input.model || e.parentModel
        const cls = classOf(resolved)
        await closeDay($)
        // El plantel del día: sale el aventurero libre de número más bajo; si no hay, uno nuevo.
        const roster = (await read($, heroes)).filter(u => u.cls === cls && u.id !== started.agentId)
        const latest = new Map<string, GremioHero>()
        for (const u of [...roster].sort((a, b) => a.startedAt - b.startedAt)) latest.set(u.name, u)
        const numberOf = (name: string) => Number(name.split(' ').pop()) || 0
        const free = [...latest.values()].filter(u => u.status !== 'running').sort((a, b) => numberOf(a.name) - numberOf(b.name))[0]
        let n = 1
        if (free) n = numberOf(free.name)
        else
          await update($, counters, c => {
            n = Math.max(c[cls] ?? 0, ...[...latest.keys()].map(numberOf)) + 1
            return { ...c, [cls]: n }
          })
        const at = await $.clock.now()
        const baseline = (await read($, master)).model || e.parentModel
        const hero: GremioHero = {
          id: started.agentId,
          parentId: e.parentAgentId ?? null,
          name: `${CLASS_LABEL[cls]} ${n}`,
          epithet: free?.epithet ?? epithet(cls, e.description, e.prompt),
          cls,
          model: modelName(resolved),
          modelId: resolved,
          baseline,
          task,
          promoted,
          usage: null,
          cost: null,
          saved: null,
          rating: null,
          modelChoice: choice,
          effort,
          isReadOnly,
          briefWords,
          description: cut(e.description || tr('sin descripción', 'no description'), 80),
          mission: cut(e.prompt, 700),
          kind: e.subagentType,
          isBackground: e.background,
          status: 'running',
          doing: tr('🥾 en camino', '🥾 on the way'),
          actions: [],
          actionCount: 0,
          startedAt: at,
          endedAt: null,
          tokens: null,
          report: null,
        }
        await update($, heroes, list => [...list.filter(u => u.id !== hero.id), hero].slice(-80))
        await refreshAgents($)
        const boss = (await read($, heroes)).find(u => u.id === hero.parentId)
        await note(
          $,
          tr(
            `🧭 ${boss ? boss.name : 'Clawd'} envió a ${hero.name}, ${hero.epithet}: ${hero.description}`,
            `🧭 ${boss ? boss.name : 'Clawd'} sent ${hero.name}, ${hero.epithet}: ${hero.description}`,
          ),
          hero.id,
        )
        if (promoted) await note($, `⬆ ${promoted}`)
        if (!e.parentAgentId) {
          await update($, master, m => ({
            ...m,
            doing: tr(`📜 envió a ${hero.name}`, `📜 sent ${hero.name}`),
            model: m.model || e.parentModel,
            actionCount: m.actionCount + 1,
            turnActions: (m.turnActions ?? 0) + 1,
          }))
        }
        await refreshStatus($)
      }
    } catch {
      // El gremio nunca frena el trabajo.
    }
    return started
  }).catch(($, e, next) =>
    // Si algo falla antes de enviar: el agente sale igual, salvo que pidiera Fable.
    next.called || !isFable(e.fork ? e.parentModel : (e.model ?? e.parentModel))
      ? next(e)
      : {
          deny: tr(
            'El Gremio no pudo pedirle permiso a la persona para usar Fable; no se envió el agente.',
            'The Guild could not ask the person for permission to use Fable; the agent was not sent.',
          ),
        },
  )

  // Cada aventurero piensa con el esfuerzo que le asignó Clawd.
  on('turn.step', async function* ($, e, next) {
    let input = e
    try {
      if (e.agentId !== undefined && e.effort !== undefined) {
        const hero = (await read($, heroes)).find(u => u.id === e.agentId)
        if (hero?.effort && hero.effort !== e.effort) input = { ...e, effort: hero.effort }
      }
    } catch {
      // Sin cambio de esfuerzo.
    }
    return yield* next(input)
  })

  // El Código entra en las instrucciones de Clawd.
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    try {
      if (await read($, doctrine)) {
        return { sections: [...composed.sections, { id: 'guild:code', text: doctrineText(), scope: 'session' as const }] }
      }
    } catch {
      // Sin Código, el prompt queda como estaba.
    }
    return composed
  })

  // Lo que cada uno va haciendo. Se deja fuera la herramienta Agent: los
  // envíos se cuentan en agent.spawn.
  on('tool.call', { tool: /^(?!Agent$)/ }, async ($, e, next) => {
    try {
      const input = e as unknown as Record<string, unknown>
      const tool = String(input.tool)
      const text = describeTool(tool, input)
      if (e.agentId === undefined) {
        await update($, master, m => ({
          ...m,
          doing: text,
          actionCount: m.actionCount + 1,
          turnActions: (m.turnActions ?? 0) + 1,
          actions: [...m.actions, text].slice(-8),
        }))
      } else {
        const id = e.agentId
        const hero = (await read($, heroes)).find(u => u.id === id)
        if (hero?.isReadOnly && WRITE_TOOLS.has(tool)) {
          await note($, tr(`🛑 El Código frenó a ${hero.name}: su misión es de solo lectura`, `🛑 The Code stopped ${hero.name}: its quest is read-only`), hero.id)
          return {
            deny: tr(
              'Código del Gremio: esta misión es de solo lectura. No edites ni crees archivos; informa lo que encontraste y quien te envió decidirá los cambios.',
              'Guild Code: this quest is read-only. Do not edit or create files; report what you found and whoever sent you will decide on the changes.',
            ),
          }
        }
        const at = await $.clock.now()
        await update(
          $,
          heroes,
          patchHero(id, u => ({
            ...u,
            doing: text,
            lastActionAt: at,
            actionCount: u.actionCount + 1,
            actions: [...u.actions, text].slice(-8),
          })),
        )
      }
    } catch {
      // El gremio nunca frena el trabajo.
    }
    // Una pregunta o un plan que espera tu respuesta: el reino lo muestra como ❓.
    const callId = e.tool_use_id
    const isQuestion = QUESTION_TOOLS.has(String(e.tool))
    if (isQuestion && callId) {
      asks.set(callId, await $.clock.now())
      askWhat =
        String(e.tool) === 'ExitPlanMode'
          ? tr('te pide aprobar un plan', 'asks you to approve a plan')
          : tr('te hace una pregunta', 'has a question')
      await beat($, true)
    }
    // Mientras corre una herramienta, el aventurero no está quieto.
    const agentId = e.agentId
    if (agentId !== undefined) inFlight.set(agentId, (inFlight.get(agentId) ?? 0) + 1)
    try {
      return await next(e)
    } finally {
      if (agentId !== undefined) inFlight.set(agentId, Math.max(0, (inFlight.get(agentId) ?? 1) - 1))
      const wasAsking = (callId !== undefined && asks.delete(callId)) || permissionAt !== null
      permissionAt = null
      if (asks.size === 0) askWhat = null
      if (wasAsking) void beat($, true)
    }
  })

  // Un diálogo de permiso que de verdad se te muestra: ❓ hasta que la llamada siga.
  // (La decisión «ask» de tool.check no sirve: en modo automático decide el clasificador.)
  on('classic.PermissionRequest', async ($, e, next) => {
    try {
      permissionAt = await $.clock.now()
      askWhat = tr(`te pide permiso: ${e.tool_name}`, `asks permission: ${e.tool_name}`)
      await beat($, true)
    } catch {
      // El reino no se entera; el permiso sigue igual.
    }
    return next(e)
  })

  // Al empezar cada turno, Clawd sabe a quién puede retomar con su memoria y la
  // sesión toma su nombre del primer pedido (si está en la carpeta de inicio).
  on('prompt.submit', async ($, e, next) => {
    try {
      if (!e.isMeta && !e.command) {
        if (!(await read($, label))) void nameSession($, e.text)
        const found = e.turnId ? null : await resumable($)
        if (found && found.sig !== lastResumeSig) {
          lastResumeSig = found.sig
          return next({ ...e, context: [...(e.context ?? []), found.block] })
        }
        if (!found && !e.turnId) lastResumeSig = null
      }
    } catch {
      // Sin aviso, el turno sigue igual.
    }
    return next(e)
  })

  // El pergamino: el botín completo de un aventurero, con su formato, en un panel aparte.
  on('ui.render', { component: 'Pane', requestId: SCROLL }, async ($, e) => {
    const [id, list] = await Promise.all([read($, scrollHero), read($, heroes)])
    const hero = id ? list.find(u => u.id === id) : undefined
    const { Box, Text, Button, Markdown } = $.ui.resolve(e)
    if (!hero) return <Text dimColor>{tr('No hay botín que mostrar.', 'No loot to show.')}</Text>
    const text = hero.reportFull ?? hero.report ?? ''
    return (
      <Box flexDirection="column" gap={1}>
        <Text>
          <Text bold color={CLASS_COLOR[hero.cls]}>
            📜 {hero.name}
            {hero.epithet ? `, ${hero.epithet}` : ''}
          </Text>
          <Text dimColor> · {hero.description}</Text>
        </Text>
        {e.surface === 'terminal' ? <Markdown text={text} /> : <Text>{text}</Text>}
        <Box gap={2}>
          <Button
            key="pergamino-copiar"
            onPress={async () => {
              const r = await $.ui.copy({ text, surface: e.surface })
              $.ui.toast(
                r.isCopied
                  ? tr(`📋 Copiaste el botín de ${hero.name}`, `📋 You copied ${hero.name}'s loot`)
                  : tr('No pude copiarlo al portapapeles', "Couldn't copy it to the clipboard"),
              )
            }}
          >
            {tr('📋 Copiar', '📋 Copy')}
          </Button>
          <Button key="pergamino-cerrar" onPress={() => $.ui.close({ id: SCROLL })}>
            {tr('Cerrar', 'Close')}
          </Button>
        </Box>
      </Box>
    )
  })

  // La siesta: cuando la conversación se resume (sola al llenarse, o con /compact),
  // Clawd duerme mientras tanto y despierta con la vida llena.
  on('session.compact', async ($, e, next) => {
    const isNap = e.agentId === undefined && e.trigger !== 'precompute'
    if (!isNap) return next(e)
    let before: number | null = null
    let window = 0
    try {
      const dm = await read($, master)
      const ctx = dm.context ?? null
      before = ctx && ctx.percent !== null ? Math.max(0, 100 - ctx.percent) : null
      window = ctx?.window ?? 0
      const at = await $.clock.now()
      await update($, master, m => ({ ...m, napping: true, napStartedAt: at, doing: tr('😴 durmiendo una siesta…', '😴 taking a nap…') }))
      await beat($, true)
    } catch {
      // La siesta no se dibuja; el resumen sigue igual.
    }
    let after: number | null = null
    try {
      const r = await next(e)
      if ('tokensAfter' in r && typeof r.tokensAfter === 'number' && window > 0) {
        after = Math.max(0, 100 - (r.tokensAfter / window) * 100)
        await absorbContext($, { window, tokens: r.tokensAfter, percent: Math.round((r.tokensAfter / window) * 100) })
      }
      return r
    } finally {
      try {
        await update($, master, m => ({ ...m, napping: false, napStartedAt: null, doing: tr('🌅 recién despierto', '🌅 just woke up') }))
        await note(
          $,
          before !== null && after !== null
            ? tr(
                `🌅 Clawd despertó de su siesta: la vida pasó de ${Math.round(before)} % a ${Math.round(after)} %`,
                `🌅 Clawd woke up from a nap: HP went from ${Math.round(before)} % to ${Math.round(after)} %`,
              )
            : tr('🌅 Clawd despertó de su siesta: la conversación quedó resumida', '🌅 Clawd woke up from a nap: the conversation was summarized'),
        )
        await beat($, true)
      } catch {
        // Nada que dibujar.
      }
    }
  })

  // Un /clear empieza una campaña nueva.
  on('session.end', async ($, e, next) => {
    // Al cerrar la sesión, deja de aparecer en el reino de las demás.
    if (e.reason !== 'clear' && sessionKey) {
      try {
        const own = await ownEntry($)
        if (own) await serial(() => $.store.set(`reino.${own.key}`, { ...own, state: 'idle', closed: true }))
      } catch {
        // Su latido se apagará solo.
      }
    }
    if (e.reason === 'clear') {
      try {
        await update($, heroes, () => [])
        await update($, log, () => [])
        await update($, counters, () => ({}))
        await update($, selected, () => null)
        await update($, expanded, () => null)
        await update($, master, m => ({ ...RESTING, model: m.model }))
        await update($, treasury, () => EMPTY_TREASURY)
        await update($, quota, q => ({ ...q, sessionFive: 0, sessionWeek: 0 }))
        $.ui.status(undefined)
      } catch {
        // nada
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const [
      party,
      dm,
      picked,
      events,
      isCode,
      isSound,
      openClass,
      gold,
      ledger,
      isBookOpen,
      plan5,
      openPurse,
      isLifeOpen,
      isMore,
      isChronicleOpen,
      isTavernOpen,
      kingdom,
      isRealmOpen,
      mySpend,
      pickedRealm,
    ] = await Promise.all([
      read($, heroes),
      read($, master),
      read($, selected),
      read($, log),
      read($, doctrine),
      read($, sound),
      read($, expanded),
      read($, treasury),
      read($, book),
      read($, bookOpen),
      read($, quota),
      read($, purseOpen),
      read($, lifeOpen),
      read($, cardMore),
      read($, chronicleOpen),
      read($, tavernOpen),
      read($, realm),
      read($, realmOpen),
      read($, spend),
      read($, realmPicked),
    ])
    const now = await $.clock.now()

    if (e.surface !== 'terminal') {
      const { Box, Text } = $.ui.resolve(e)
      return (
        <Box flexDirection="column">
          <Text>
            {tr('Gran Maestre', 'Grand Master')}: {isIdle(dm.doing) ? idle() : dm.doing}
          </Text>
          {party.map(u => (
            <Text>
              {u.name} ({u.model}): {u.doing}
            </Text>
          ))}
        </Box>
      )
    }

    const { Box, Text, Button, Raster } = $.ui.resolve(e)
    isPaneUp = true
    const nextDrawn = new Map<string, Drawn>()
    const cols = Math.max(20, e.props.bodyColumns)
    const isCompact = e.props.placement === 'inline'
    const isNarrow = cols < 44
    const viewing = e.props.view.agentId
    const byId = new Map(party.map(u => [u.id, u]))
    const select = async (id: string) => {
      await update($, cardMore, () => false)
      await update($, selected, cur => (cur === id ? null : id))
      const at = await $.clock.now()
      await update($, heroes, patchHero(id, u => (u.status === 'done' && !u.seenAt ? { ...u, seenAt: at } : u)))
      await beat($)
    }

    const sprite = (key: string, cls: GremioClass, state: SpriteState, size: Size, faded = false) => {
      nextDrawn.set(key, { cls, state, size, faded })
      const box = CELLS[size]
      return <Raster key={key} columns={box.columns} rows={box.rows} cells={spriteCells(cls, poseFor(state), frame, size, faded)} />
    }
    const shortName = (u: GremioHero) => `${CLASS_SHORT[u.cls]} ${u.name.split(' ').pop() ?? ''}`

    // Los que acaban de volver se quedan unos segundos en el campo con su botín.
    const isBack = (u: GremioHero) => u.status !== 'running' && u.endedAt !== null && now - u.endedAt < RETURN_MS
    const active = party.filter(u => u.status === 'running' || isBack(u)).sort((a, b) => a.startedAt - b.startedAt)
    // En la taberna, cada aventurero una vez (su última misión), salvo que esté en otra.
    const busyNames = new Set(active.map(u => u.name))
    const resting = [
      ...new Map(
        party
          .filter(u => u.status !== 'running' && !isBack(u) && !busyNames.has(u.name))
          .sort((a, b) => (a.endedAt ?? 0) - (b.endedAt ?? 0))
          .map(u => [u.name, u] as const),
      ).values(),
    ].sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
    const fullPerRow = Math.max(1, Math.floor(cols / SLOT))
    const miniPerRow = Math.max(1, Math.floor(cols / MINI))
    // Zoom: pocos se ven enteros, un grupo en mini, una hueste por clase.
    const level =
      active.length <= fullPerRow * (isCompact ? 1 : 2) ? 'full' : active.length <= miniPerRow * (isCompact ? 2 : 3) ? 'mini' : 'hueste'

    const running = active.filter(u => u.status === 'running').length
    hasRunning = running > 0
    // Quieto: en misión, sin herramienta en curso y sin acciones hace rato.
    const doingOf = (u: GremioHero) => {
      // Al volver, muestra en un bocadillo la primera frase de lo que trajo.
      if (u.status === 'done' && u.report && u.endedAt !== null && now - u.endedAt < RETURN_MS) return `💬 ${firstSentence(u.report)}`
      const since = now - (u.lastActionAt ?? u.roundStartedAt ?? u.startedAt)
      const isQuiet = u.status === 'running' && (inFlight.get(u.id) ?? 0) === 0 && since > QUIET_MS
      return isQuiet ? tr(`💤 quieto hace ${Math.floor(since / 60_000)} min`, `💤 idle for ${Math.floor(since / 60_000)} min`) : u.doing
    }
    const says = !dm.isBusy && running > 0 ? tr('esperando a sus aventureros', 'waiting for the adventurers') : isIdle(dm.doing) ? idle() : dm.doing

    // El Gran Maestre: su ficha de personaje, con datos de la sesión.
    // Vida = el contexto que le queda; Turno = lo que lleva; Grupo = sus aventureros.
    const ctx = dm.context ?? null
    const life = ctx && ctx.percent !== null ? Math.max(0, 100 - ctx.percent) : null
    const hearts = life === null ? 0 : life > 0 ? Math.max(1, Math.round(life / 10)) : 0
    const turnMs = dm.isBusy && dm.turnStartedAt ? now - dm.turnStartedAt : (dm.lastTurnMs ?? null)
    const turnActs = dm.turnActions ?? 0
    const acts = `${turnActs} ${turnActs === 1 ? tr('acción', 'action') : tr('acciones', 'actions')}`
    const label = (text: string) => <Text color={GOLD}>{text.padEnd(8)}</Text>
    const lifeLine = (
      <Button plain key="vida" onPress={() => update($, lifeOpen, isOpen => !isOpen)}>
        <Text>
          <Text dimColor>{isLifeOpen ? '▾ ' : '▸ '}</Text>
          {label(tr('Vida', 'HP'))}
          {life === null ? (
            <Text dimColor>{tr('se mide con la próxima respuesta', 'measured on the next reply')}</Text>
          ) : (
            <Text>
              <Text color={RED}>{'♥ '.repeat(hearts)}</Text>
              <Text dimColor>{'· '.repeat(10 - hearts)}</Text>
              <Text bold color={life <= LOW_LIFE ? RED : GOLD}>
                {' '}
                {Math.round(life)}
              </Text>
            </Text>
          )}
        </Text>
      </Button>
    )
    const lifeDetail =
      isLifeOpen && ctx ? (
        <Box flexDirection="column" marginLeft={4}>
          <Text dimColor>
            {ctx.tokens !== null
              ? tr(`Contexto: ${tokensText(ctx.tokens)} de ${tokensText(ctx.window)} tokens`, `Context: ${tokensText(ctx.tokens)} of ${tokensText(ctx.window)} tokens`)
              : tr(`Contexto de ${tokensText(ctx.window)} tokens`, `Context of ${tokensText(ctx.window)} tokens`)}
          </Text>
          <Text dimColor>{tr('Cada ♥ es el 10 % · al vaciarse, la conversación se resume para seguir', 'Each ♥ is 10 % · when empty, the conversation is summarized to go on')}</Text>
        </Box>
      ) : null
    const turnLine =
      turnMs === null ? null : (
        <Text>
          <Text dimColor>{'  '}</Text>
          {label(dm.isBusy ? tr('Turno', 'Turn') : tr('Último', 'Last'))}
          <Text dimColor={!dm.isBusy}>
            {duration(turnMs)} · {acts}
          </Text>
        </Text>
      )
    // Hoy: misiones del día, las que volvieron con botín y las que no leíste (tocar abre la primera).
    const withLoot = party.filter(u => u.status === 'done')
    const unread = withLoot.filter(u => !u.seenAt).sort((a, b) => (a.endedAt ?? 0) - (b.endedAt ?? 0))
    const partyLine =
      party.length === 0 ? null : (
        <Button plain key="hoy" onPress={() => (unread[0] ? select(unread[0].id) : undefined)}>
          <Text>
            <Text dimColor>{'  '}</Text>
            {label(tr('Hoy', 'Today'))}
            <Text>
              {party.length} {party.length === 1 ? tr('misión', 'quest') : tr('misiones', 'quests')}
            </Text>
            {withLoot.length > 0 ? <Text dimColor>
                {' '}
                · {withLoot.length} {tr('con botín', 'with loot')}
              </Text> : null}
            {unread.length > 0 ? <Text color={GOLD}>
                {' '}
                · {unread.length} {tr('sin leer', 'unread')}
              </Text> : null}
          </Text>
        </Button>
      )
    const toggles = (
      <Box gap={2}>
        <Button
          plain
          key="sonido"
          onPress={async () => {
            await update($, sound, isOn => !isOn)
            await saveSettings($)
          }}
        >
          <Text dimColor={!isSound}>{isSound ? '🔊' : '🔇'}</Text>
        </Button>
        <Button
          plain
          key="doctrina"
          onPress={async () => {
            await update($, doctrine, isOn => !isOn)
            await saveSettings($)
            await refreshStatus($)
            await note(
              $,
              isCode
                ? tr('📜 Apagaste el Código: Clawd envía sin reglas', '📜 You turned the Code off: Clawd sends with no rules')
                : tr('📜 Encendiste el Código del Gremio', '📜 You turned the Guild Code on'),
            )
          }}
        >
          <Text color={isCode ? undefined : RED}>{isCode ? '📜' : '📜✗'}</Text>
        </Button>
      </Box>
    )
    const masterBlock = (
      <Box
        flexDirection={isNarrow ? 'column' : 'row'}
        alignItems={isNarrow ? 'center' : 'flex-start'}
        gap={2}
        borderStyle="round"
        borderColor={GOLD}
        paddingX={1}
      >
        {sprite('maestro', 'maestro', dm.napping ? 'asleep' : dm.isBusy ? 'busy' : life !== null && life <= LOW_LIFE ? 'tired' : 'idle', isCompact || isNarrow ? 'small' : 'big')}
        <Box flexDirection="column" flexShrink={1}>
          <Box gap={2}>
            <Button plain key="sel-maestro" onPress={() => select('maestro')}>
              <Text bold color={GOLD}>
                {picked === 'maestro' ? '▾ ' : ''}👑 {tr('GRAN MAESTRE', 'GRAND MASTER')}
              </Text>
            </Button>
            {toggles}
          </Box>
          <Text dimColor>
            Clawd · {dm.model ? modelName(dm.model) : tr('sesión principal', 'main session')}
          </Text>
          <Text>{tr(`«${says}»`, `“${says}”`)}</Text>
          <Box flexDirection="column" marginTop={1}>
            {lifeLine}
            {lifeDetail}
            {turnLine}
            {partyLine}
          </Box>
        </Box>
      </Box>
    )

    // El tesoro del gremio: una línea por bolsa, con 🪙 y lo que queda.
    // Tocar una bolsa abre su detalle; el libro es un botón junto al título.
    // Lo que gastó esta sesión en la jornada: su parte de lo que subió la cuota (con varias sesiones, repartido).
    const nowWindow = (() => {
      const w = plan5.windows.find(x => x.kind === 'five_hour')
      return w?.resetsAt ? windowKey(w.resetsAt) : null
    })()
    const myCoins = coinsOf(
      { key: sessionKey ?? '', cost: mySpend.key === nowWindow ? mySpend.cost : 0, windowKey: nowWindow },
      kingdom,
      nowWindow ? ledger.fiveSeen?.[nowWindow] : undefined,
    )
    const pts = myCoins ?? plan5.sessionFive
    const coinsPerPurse = cols >= 36 ? 10 : 5
    const isRoomy = cols >= 50
    const five = plan5.windows.find(w => w.kind === 'five_hour')
    const week = plan5.windows.find(w => w.kind === 'seven_day')
    const others = plan5.windows.filter(w => w.kind !== 'five_hour' && w.kind !== 'seven_day')
    const rate = ratePerHour(plan5, now)
    const fc = forecast(plan5, now)
    const isShort = fc !== null && !fc.isEnough
    const classOrder: GremioClass[] = ['archimago', 'mago', 'bardo', 'picaro']
    const split = classOrder
      .map(cls => [cls, party.filter(x => x.cls === cls).reduce((sum, x) => sum + (x.cost ?? 0), 0)] as const)
      .filter(([, w]) => w > 0)
      .map(([cls, w]) => `${CLASS_PLURAL[cls]} ${coinText(shareOf(w, gold, pts))}`)
    const savedPts = gold.saved > 0 ? shareOf(gold.saved, gold, pts) : 0
    const cheap = dm.model
      ? tr(`solo ${CLASS_PLURAL[classOf(dm.model)]}`, `only ${CLASS_PLURAL[classOf(dm.model)]}`)
      : tr('puros aventureros caros', 'only expensive adventurers')
    const refill = (w: { resetsAt: string | null }) => (w.resetsAt ? span(Date.parse(w.resetsAt) - now) : null)
    const togglePurse = (kind: string) => update($, purseOpen, cur => (cur === kind ? null : kind))

    const purseLine = (w: { kind: string; percent: number; resetsAt: string | null }, label: string) => {
      const left = Math.max(0, 100 - w.percent)
      const filled = left > 0 ? Math.max(1, Math.round(left / (100 / coinsPerPurse))) : 0
      const when = refill(w)
      const isWarn = w.kind === 'five_hour' && isShort
      return (
        <Button plain key={`bolsa-${w.kind}`} onPress={() => togglePurse(w.kind)}>
          <Text>
            <Text dimColor>{openPurse === w.kind ? '▾ ' : '▸ '}</Text>
            <Text color={GOLD}>{label.padEnd(8)}</Text>
            {'🪙'.repeat(filled)}
            <Text dimColor>{'· '.repeat(coinsPerPurse - filled)}</Text>
            <Text bold color={left <= 20 ? RED : GOLD}>
              {' '}
              {Math.round(left)}
            </Text>
            {isWarn && fc ? (
              <Text color={RED}>{tr(`  se acaba en ${span(fc.msToFull)}`, `  runs out in ${span(fc.msToFull)}`)}</Text>
            ) : isRoomy && when ? (
              <Text dimColor>{`  ↻ ${when}`}</Text>
            ) : null}
          </Text>
        </Button>
      )
    }
    type Line = string | { good: string } | null
    const detail = (lines: Line[]) => (
      <Box flexDirection="column" marginLeft={4}>
        {lines.map(l =>
          l === null ? null : typeof l === 'string' ? <Text dimColor>{l}</Text> : <Text color={CLASS_COLOR.bardo}>{l.good}</Text>,
        )}
      </Box>
    )
    const fiveWhen = five ? refill(five) : null
    const fiveDetail =
      five && openPurse === 'five_hour'
        ? detail([
            (!isRoomy || isShort) && fiveWhen ? tr(`↻ se rellena en ${fiveWhen}`, `↻ refills in ${fiveWhen}`) : null,
            rate === null
              ? tr('Midiendo cuánto gastas por hora…', 'Measuring how much you spend per hour…')
              : tr(
                  `Gastas ${coinText(rate)} por hora${fc ? (fc.isEnough ? ' · te alcanza' : ` · se acaba en ${span(fc.msToFull)}`) : ''}`,
                  `You spend ${coinText(rate)} per hour${fc ? (fc.isEnough ? ' · enough' : ` · runs out in ${span(fc.msToFull)}`) : ''}`,
                ),
            pts > 0
              ? tr(
                  `Esta sesión gastó ${coinText(pts)}${gold.masterCost + gold.heroesCost > 0 ? `: Clawd ${coinText(shareOf(gold.masterCost, gold, pts))}${split.map(s => ` · ${s}`).join('')}` : ''}`,
                  `This session spent ${coinText(pts)}${gold.masterCost + gold.heroesCost > 0 ? `: Clawd ${coinText(shareOf(gold.masterCost, gold, pts))}${split.map(s => ` · ${s}`).join('')}` : ''}`,
                )
              : null,
            savedPts >= 0.05 ? { good: tr(`El Código te ahorró ≈ ${coinText(savedPts)} frente a mandar ${cheap}`, `The Code saved you ≈ ${coinText(savedPts)} versus sending ${cheap}`) } : null,
            tr('Cada 🪙 son 10 monedas (10 % del plan)', 'Each 🪙 is 10 coins (10 % of the plan)'),
          ])
        : null
    const weekWhen = week ? refill(week) : null
    const weekDetail =
      week && openPurse === 'seven_day'
        ? detail([
            !isRoomy && weekWhen ? tr(`↻ se rellena en ${weekWhen}`, `↻ refills in ${weekWhen}`) : null,
            plan5.sessionWeek > 0 ? tr(`Esta sesión gastó ${coinText(plan5.sessionWeek)}`, `This session spent ${coinText(plan5.sessionWeek)}`) : null,
            ...others.map(o => tr(`${kindLabel(o.kind)}: quedan ${Math.round(Math.max(0, 100 - o.percent))}`, `${kindLabel(o.kind)}: ${Math.round(Math.max(0, 100 - o.percent))} left`)),
            tr('Cada 🪙 son 10 monedas (10 % del plan)', 'Each 🪙 is 10 coins (10 % of the plan)'),
          ])
        : null

    const quotaBlock = (
      <Box flexDirection="column">
        <Box gap={2}>
          <Text>
            💰{' '}
            <Text bold color={GOLD}>
              {tr('Tesoro del gremio', 'Guild treasury')}
            </Text>
          </Text>
          <Button plain key="libro" onPress={() => update($, bookOpen, isOpen => !isOpen)}>
            <Text color={isBookOpen ? GOLD : undefined}>
              {tr('📕 Libro', '📕 Ledger')} {isBookOpen ? '▾' : '▸'}
            </Text>
          </Button>
        </Box>
        {plan5.windows.length === 0 ? (
          <Text dimColor>{tr('Las monedas aparecen con la próxima respuesta.', 'Coins show up with the next reply.')}</Text>
        ) : (
          <Box flexDirection="column">
            {five && purseLine(five, tr('Jornada', 'Shift'))}
            {fiveDetail}
            {week && purseLine(week, tr('Semana', 'Week'))}
            {weekDetail}
          </Box>
        )}
      </Box>
    )

    // El reino: todas las sesiones con gremio, las que te necesitan primero.
    const realmNow = otherSessions(kingdom, sessionKey ?? '', now)
    const me = isRealmOpen ? await ownEntry($) : null
    const allRealm = me ? [...realmNow.filter(r => r.state === 'asking'), me, ...realmNow.filter(r => r.state !== 'asking')] : realmNow
    const realmBlock =
      realmNow.length === 0 ? null : (
        <Box flexDirection="column">
          <Button plain key="reino" onPress={() => update($, realmOpen, isOpen => !isOpen)}>
            <Text wrap="truncate-end">
              <Text color={GOLD}>{tr('🏰 Reino', '🏰 Realm')}</Text>
              <Text dimColor> {isRealmOpen ? '▾' : '▸'} </Text>
              {realmNow.map((r, i) => (
                <Text color={r.state === 'asking' ? GOLD : undefined} dimColor={r.state === 'idle'}>
                  {i > 0 ? ' · ' : ''}
                  {realmSummary(r, now)}
                </Text>
              ))}
            </Text>
          </Button>
          {isRealmOpen &&
            allRealm.map(r => (
              <Box flexDirection="column">
                <Button plain key={`reino-${r.key}`} onPress={() => update($, realmPicked, cur => (cur === r.key ? null : r.key))}>
                  <Text wrap="truncate-end" color={r.state === 'asking' ? GOLD : undefined} dimColor={r.state === 'idle'}>
                    {'  '}
                    {realmRow(r, now, r.key === me?.key)}
                  </Text>
                </Button>
                {pickedRealm === r.key &&
                  realmDetail(r, sessionHome).map(line => (
                    <Text dimColor wrap="truncate-end">
                      {'      '}
                      {line}
                    </Text>
                  ))}
                {pickedRealm === r.key && r.key !== me?.key ? (
                  <Box marginLeft={6}>
                    <Button key={`ir-${r.key}`} onPress={() => goTo($, r)}>
                      {tr('🚪 Ir a la sesión', '🚪 Go to session')}
                    </Button>
                  </Box>
                ) : null}
              </Box>
            ))}
        </Box>
      )
    // Lo que sonó en otras sesiones hace poco: dónde y quién (tocar lleva a esa pestaña).
    const bells = realmNow
      .filter(r => r.bell && now - r.bell.at < 2 * 60_000)
      .sort((a, b) => (b.bell?.at ?? 0) - (a.bell?.at ?? 0))
      .slice(0, 3)
    const bellBanner =
      bells.length === 0 ? null : (
        <Box flexDirection="column">
          {bells.map(r => (
            <Button plain key={`ir-sono-${r.key}`} onPress={() => goTo($, r)}>
              <Text wrap="truncate-end">
                <Text color={GOLD}>
                  {r.bell?.icon} {r.label}
                </Text>
                <Text>
                  {' '}
                  · {r.bell?.text}
                </Text>
                <Text dimColor> · {shortSince(now - (r.bell?.at ?? now))} · {tr('🚪 ir', '🚪 go')}</Text>
              </Text>
            </Button>
          ))}
        </Box>
      )
    // Si otra sesión te pregunta algo, se avisa arriba de todo.
    const askingNow = realmNow.filter(r => r.state === 'asking')
    const askBanner =
      askingNow.length === 0 ? null : (
        <Box flexDirection="column">
          {askingNow.map(r => (
            <Button plain key={`ir-pide-${r.key}`} onPress={() => goTo($, r)}>
              <Text color={GOLD} wrap="truncate-end">
                ❓ {r.label} {r.ask ?? tr('te pide algo', 'needs you')} · {shortSince(now - r.since)}
                <Text dimColor> · {tr('🚪 ir', '🚪 go')}</Text>
              </Text>
            </Button>
          ))}
        </Box>
      )

    // Por proyecto: la parte de cada uno en el gasto (de mayor a menor).
    const projectLine = (title: string, days: readonly string[]) => {
      const shares = projectShares(ledger, days)
      if (shares.length === 0) return null
      return (
        <Text wrap="wrap">
          <Text color={GOLD}>🪙 {title}: </Text>
          {shares.map((p, i) => (
            <Text dimColor={p.project === 'otros'}>
              {i > 0 ? ' · ' : ''}
              {p.project === 'otros' ? tr('otros', 'others') : p.project} {pctText(p.share)}
            </Text>
          ))}
        </Text>
      )
    }

    const bookTotal = ledger.cost + ledger.masterCost + ledger.codeCost
    const shareText = (w: number) => (bookTotal > 0 ? pctText((w / bookTotal) * 100) : '·')
    const ledgerBlock = !isBookOpen ? null : (
      <Box flexDirection="column" borderStyle="round" borderColor={GOLD} paddingX={1}>
        <Text bold color={GOLD}>
          {tr('📕 Libro del gremio', '📕 Guild ledger')} <Text dimColor>{tr('(todas las sesiones)', '(all sessions)')}</Text>
        </Text>
        <Text dimColor>
          {ledger.missions} {ledger.missions === 1 ? tr('misión', 'quest') : tr('misiones', 'quests')} · {tr('buen botín', 'good loot')}{' '}
          {pct(ledger.good, ledger.good + ledger.bad)} · {coinText(ledger.fivePoints)} {tr('monedas de jornada gastadas', 'shift coins spent')}
        </Text>
        <Text dimColor>
          {tr('Del oro gastado: Clawd', 'Of the gold spent: Clawd')} {shareText(ledger.masterCost)} · {tr('los aventureros', 'the adventurers')}{' '}
          {shareText(ledger.cost)} · {tr('el Código', 'the Code')} {shareText(ledger.codeCost)}
        </Text>
        {projectLine(tr('Hoy', 'Today'), [dayOf(now)])}
        {projectLine(tr('Semana', 'Week'), lastDays(now, 7))}
        <Text bold color={GOLD}>
          {tr('Clase', 'Class').padEnd(11)}
          {tr('Misiones', 'Quests').padStart(9)}
          {tr('Botín', 'Loot').padStart(8)}
          {tr('Oro', 'Gold').padStart(10)}
        </Text>
        {classOrder.map(cls => {
          const c = ledger.byClass[cls]
          return (
            <Text color={CLASS_COLOR[cls]}>
              {CLASS_LABEL[cls].padEnd(11)}
              {String(c?.missions ?? 0).padStart(9)}
              {(c ? pct(c.good, c.good + c.bad) : '·').padStart(8)}
              {(c ? shareText(c.cost) : '·').padStart(10)}
            </Text>
          )
        })}
        <Text dimColor>{tr('Califica el botín en la ficha de cada aventurero: el Código aprende de eso.', "Rate the loot on each adventurer's sheet: the Code learns from it.")}</Text>
      </Box>
    )

    // Cuánto lleva la ronda en curso de un aventurero (o cuánto duró).
    const roundMs = (u: GremioHero) => (u.endedAt ?? now) - (u.roundStartedAt ?? u.startedAt)
    const roundTag = (u: GremioHero) => ((u.round ?? 1) > 1 ? tr(` · ronda ${u.round}`, ` · round ${u.round}`) : '')

    const slot = (u: GremioHero) => (
      <Box flexDirection="column" alignItems="center" width={SLOT}>
        <Box height={2} width={SLOT - 1} overflow="hidden">
          <Text wrap="wrap">{doingOf(u)}</Text>
        </Box>
        {sprite(`u-${u.id}`, u.cls, u.status === 'running' ? 'busy' : u.status === 'done' ? 'idle' : 'down', 'small')}
        <Button plain key={`sel-${u.id}`} onPress={() => select(u.id)}>
          <Text bold color={CLASS_COLOR[u.cls]}>
            {picked === u.id ? '▾ ' : ''}
            {u.name}
          </Text>
        </Button>
        <Text dimColor>
          ⏳ {duration(roundMs(u))}
          {roundTag(u)}
        </Text>
      </Box>
    )

    const miniSlot = (u: GremioHero) => (
      <Box flexDirection="column" alignItems="center" width={MINI}>
        {sprite(`m-${u.id}`, u.cls, 'busy', 'mini')}
        <Button plain key={`sel-${u.id}`} onPress={() => select(u.id)}>
          <Text color={CLASS_COLOR[u.cls]}>
            {picked === u.id ? '▾' : ''}
            {shortName(u)}
          </Text>
        </Button>
      </Box>
    )

    const grid = (list: GremioHero[], cell: (u: GremioHero) => ReturnType<typeof slot>) => (
      <Box flexDirection="row" flexWrap="wrap">
        {list.map(u => cell(u))}
      </Box>
    )

    const fieldTitle = (
      <Text color={GOLD}>
        {tr('🧭 En misión', '🧭 On quest')} <Text dimColor>· {running}</Text>
      </Text>
    )
    let fieldBlock
    if (active.length === 0) {
      fieldBlock = <Text dimColor>{tr('🧭 Nadie en misión', '🧭 No one on a quest')}</Text>
    } else if (level === 'full') {
      // Los que envió Clawd arriba; cada grupo bajo quien lo envió.
      const ids = new Set(active.map(u => u.id))
      const top = active.filter(u => u.parentId === null || !ids.has(u.parentId))
      const parties = active.map(lead => ({ lead, kids: active.filter(u => u.parentId === lead.id) })).filter(p => p.kids.length > 0)
      fieldBlock = (
        <Box flexDirection="column">
          {fieldTitle}
          {grid(top, slot)}
          {parties.map(p => (
            <Box flexDirection="column">
              <Text color={CLASS_COLOR[p.lead.cls]}>{tr(`↳ Grupo de ${p.lead.name}`, `↳ Party of ${p.lead.name}`)}</Text>
              {grid(p.kids, slot)}
            </Box>
          ))}
        </Box>
      )
    } else if (level === 'mini') {
      fieldBlock = (
        <Box flexDirection="column">
          {fieldTitle}
          {grid(active, miniSlot)}
        </Box>
      )
    } else {
      // Una hueste: una fila por clase, que se abre en lista.
      const order: GremioClass[] = ['archimago', 'mago', 'bardo', 'picaro']
      fieldBlock = (
        <Box flexDirection="column">
          {fieldTitle}
          {order
            .filter(cls => active.some(u => u.cls === cls))
            .map(cls => {
              const list = active.filter(u => u.cls === cls)
              const isOpen = openClass === cls
              return (
                <Box flexDirection="column">
                  <Box gap={1} alignItems="center">
                    {sprite(`hueste-${cls}`, cls, 'busy', 'mini')}
                    <Button plain key={`hueste-${cls}`} onPress={() => update($, expanded, cur => (cur === cls ? null : cls))}>
                      <Text bold color={CLASS_COLOR[cls]}>
                        {isOpen ? '▾' : '▸'} {CLASS_PLURAL[cls]} ×{list.length}
                      </Text>
                    </Button>
                    <Text color={CLASS_COLOR[cls]}>{'▮'.repeat(Math.min(list.length, Math.max(4, cols - 32)))}</Text>
                  </Box>
                  {isOpen &&
                    list.map(u => (
                      <Button plain key={`sel-${u.id}`} onPress={() => select(u.id)}>
                        <Text color={CLASS_COLOR[u.cls]}>
                          {picked === u.id ? '▾ ' : '  '}
                          {u.name}
                        </Text>{' '}
                        <Text dimColor>{cut(doingOf(u), Math.max(10, cols - 18))}</Text>
                      </Button>
                    ))}
                </Box>
              )
            })}
        </Box>
      )
    }

    // La taberna: los que ya volvieron, en mini.
    const tavernRoom = miniPerRow
    const tavern =
      resting.length === 0 ? null : (
        <Box flexDirection="column">
          <Text color={GOLD}>
            {tr('🍺 Taberna', '🍺 Tavern')} <Text dimColor>· {resting.length}</Text>
          </Text>
          <Box flexDirection="row" flexWrap="wrap">
            {(isTavernOpen ? resting : resting.slice(0, tavernRoom)).map(u => (
              <Box flexDirection="column" alignItems="center" width={MINI}>
                {sprite(`t-${u.id}`, u.cls, u.status === 'done' ? 'idle' : 'down', 'mini', true)}
                <Button plain key={`sel-${u.id}`} onPress={() => select(u.id)}>
                  <Text color={CLASS_COLOR[u.cls]}>
                    {picked === u.id ? '▾' : ''}
                    {shortName(u)}
                    <Text color={u.status === 'done' ? CLASS_COLOR.bardo : RED}>
                      {u.status === 'done' ? ' ✓' : u.status === 'aborted' ? ' –' : ' ✗'}
                    </Text>
                  </Text>
                </Button>
              </Box>
            ))}
          </Box>
          {resting.length > tavernRoom && (
            <Button plain key="taberna-mas" onPress={() => update($, tavernOpen, isOpen => !isOpen)}>
              <Text dimColor>{isTavernOpen ? tr('▾ menos', '▾ less') : tr(`▸ +${resting.length - tavernRoom} más`, `▸ +${resting.length - tavernRoom} more`)}</Text>
            </Button>
          )}
        </Box>
      )

    // La ficha del elegido: lo esencial a la vista, el resto en «Más».
    let card = null
    const hero = picked && picked !== 'maestro' ? byId.get(picked) : undefined
    const closeButton = (
      <Button key="cerrar" onPress={() => update($, selected, () => null)}>
        {tr('Cerrar', 'Close')}
      </Button>
    )
    if (picked === 'maestro') {
      card = (
        <Box flexDirection="column" borderStyle="round" borderColor={GOLD} paddingX={1}>
          <Text bold color={GOLD}>
            👑 {tr('Gran Maestre', 'Grand Master')} · {dm.isBusy ? tr('trabajando', 'working') : tr('en reposo', 'resting')}
          </Text>
          <Text dimColor>
            {tr(`${dm.actionCount} acciones en la sesión`, `${dm.actionCount} actions in the session`)} · {party.length}{' '}
            {party.length === 1 ? tr('misión encargada', 'quest assigned') : tr('misiones encargadas', 'quests assigned')}
          </Text>
          {dm.actions.slice(-5).map(a => (
            <Text dimColor wrap="truncate-end">
              {'  '}
              {a}
            </Text>
          ))}
          <Box marginTop={1} gap={2}>
            {viewing !== undefined && (
              <Button key="volver" variant="primary" onPress={() => $.ui.view({})}>
                {tr('Volver a la conversación principal', 'Back to the main conversation')}
              </Button>
            )}
            {closeButton}
          </Box>
        </Box>
      )
    } else if (hero) {
      const parent = hero.parentId ? byId.get(hero.parentId) : undefined
      const state =
        hero.status === 'running'
          ? tr('en misión', 'on a quest')
          : hero.status === 'done'
            ? tr('en la taberna', 'in the tavern')
            : hero.status === 'aborted'
              ? tr('abandonó', 'left')
              : tr('herido', 'wounded')
      const share = hero.cost !== null && pts > 0 ? shareOf(hero.cost, gold, pts) : null
      const pose: SpriteState = hero.status === 'running' ? 'busy' : hero.status === 'done' ? 'idle' : 'down'
      // Solo se puede abrir la conversación de un agente que el motor todavía lista.
      const canView = listedAgents.has(hero.id)
      card = (
        <Box
          flexDirection={isNarrow ? 'column' : 'row'}
          alignItems={isNarrow ? 'center' : 'flex-start'}
          gap={2}
          borderStyle="round"
          borderColor={CLASS_COLOR[hero.cls]}
          paddingX={1}
        >
          {sprite(`ficha-${hero.id}`, hero.cls, pose, isCompact || isNarrow ? 'small' : 'big')}
          <Box flexDirection="column" flexShrink={1}>
            <Text bold color={CLASS_COLOR[hero.cls]}>
              {hero.name}
              {hero.epithet ? `, ${hero.epithet}` : ''} · {hero.model} · {state}
              {roundTag(hero)}
            </Text>
            <Text>📜 {hero.description}</Text>
          {(() => {
            const today = party.filter(x => x.name === hero.name)
            if (today.length < 2) return null
            const back = today.filter(x => x.status === 'done').length
            return (
              <Text dimColor>
                {tr('Hoy', 'Today')}: {today.length} {tr('misiones', 'quests')} · {back} {tr('con botín', 'with loot')}
              </Text>
            )
          })()}
            {hero.status === 'running' || hero.report === null ? (
              <Text>
                <Text dimColor>{tr('Ahora: ', 'Now: ')}</Text>
                {doingOf(hero)}
              </Text>
            ) : (
              <Text>💰 {cut(hero.report, isMore ? 600 : 160)}</Text>
            )}
            <Text dimColor>
              ⏳ {duration(roundMs(hero))}
            {hero.actionCount > 0 ? ` · ${hero.actionCount} ${hero.actionCount === 1 ? tr('acción', 'action') : tr('acciones', 'actions')}` : ''}
              {share !== null ? ` · 🪙 ${coinText(share)}` : ''}
            </Text>
            {isMore && (
              <Box flexDirection="column" marginTop={1}>
                <Text dimColor>
                  {CLASS_LEVEL[hero.cls]} · {tr('enviado por', 'sent by')} {parent ? parent.name : 'Clawd'} · {hero.kind}
                  {hero.isBackground ? tr(' · en segundo plano', ' · in the background') : ''}
                </Text>
                <Text dimColor>
                  {tr('Modelo: ', 'Model: ')}{hero.modelChoice}
                  {hero.task ? tr(` · tipo: ${taskWord(hero.task)}`, ` · type: ${taskWord(hero.task)}`) : ''}
                </Text>
                {hero.promoted !== null && <Text color={CLASS_COLOR[hero.cls]}>⬆ {hero.promoted}</Text>}
                <Text dimColor>
                  {tr('Esfuerzo: ', 'Effort: ')}
                  {hero.effort ? EFFORT_WORD[hero.effort] : tr('el de la sesión', "the session's")}
                  {tr(' · Permisos: ', ' · Permissions: ')}
                  {hero.isReadOnly ? tr('solo lectura', 'read-only') : tr('completos', 'full')}
                  {hero.briefWords !== null ? tr(` · informe de máx. ${hero.briefWords} palabras`, ` · report of max ${hero.briefWords} words`) : ''}
                </Text>
                {hero.tokens !== null && <Text dimColor>{tokens(hero.tokens)}</Text>}
                {hero.saved !== null && Math.abs(hero.saved) > 0 && pts > 0 && (
                  <Text color={hero.saved > 0 ? CLASS_COLOR.bardo : RED}>
                    🪙 {hero.saved > 0 ? tr('Ahorró', 'Saved') : tr('Costó', 'Cost')} ≈ {coinText(shareOf(Math.abs(hero.saved), gold, pts))}
                    {hero.saved > 0 ? tr(' frente a un ', ' vs ') : tr(' más que un ', ' more than ')}
                    {tr(CLASS_LABEL[classOf(hero.baseline)], aOrAn(CLASS_LABEL[classOf(hero.baseline)]))}
                  </Text>
                )}
                {hero.lastMessage ? <Text dimColor>
                    {tr('📨 Último mensaje: ', '📨 Last message: ')}
                    {cut(hero.lastMessage, 200)}
                  </Text> : null}
                {hero.actions.slice(-5).map(a => (
                  <Text dimColor wrap="truncate-end">
                    {'  '}
                    {a}
                  </Text>
                ))}
                <Text dimColor>
                  {tr('Encargo: ', 'Brief: ')}
                  {cut(hero.mission, 240)}
                </Text>
              </Box>
            )}
            {(hero.status === 'done' || hero.status === 'failed') &&
              (hero.rating === null ? (
                <Box gap={2} marginTop={1}>
                  <Text dimColor>{tr('¿Te sirvió lo que trajo?', 'Was the loot useful?')}</Text>
                  <Button key="bueno" onPress={() => rateLoot($, hero.id, 'up')}>
                    👍
                  </Button>
                  <Button key="malo" onPress={() => rateLoot($, hero.id, 'down')}>
                    👎
                  </Button>
                </Box>
              ) : (
                <Box marginTop={1}>
                  <Text dimColor>
                    {hero.rating === 'up' ? tr('👍 Te sirvió', '👍 It helped') : tr('👎 No te sirvió', "👎 It didn't help")}
                    {tr(' · el Código lo anotó para elegir mejor la próxima vez', ' · the Code noted it to choose better next time')}
                  </Text>
                </Box>
              ))}
            <Box marginTop={1} gap={2}>
              {viewing === hero.id ? (
                <Button key="volver" variant="primary" onPress={() => $.ui.view({})}>
                  {tr('Volver a la conversación principal', 'Back to the main conversation')}
                </Button>
              ) : !canView ? null : (
                <Button
                  key="ver"
                  variant="primary"
                  onPress={async () => {
                    const r = await $.ui.view({ agentId: hero.id })
                    if ('deny' in r && r.deny) $.ui.toast(tr(`No pude abrir su conversación: ${r.deny}`, `Couldn't open its conversation: ${r.deny}`))
                  }}
                >
                  {tr('Ver su conversación', 'View conversation')}
                </Button>
              )}
              {hero.report !== null && (
              <Button
                key="pergamino"
                onPress={async () => {
                  await update($, scrollHero, () => hero.id)
                  await $.ui.open({ id: SCROLL, title: tr(`📜 Botín de ${hero.name}`, `📜 ${hero.name}'s loot`) })
                }}
              >
                {tr('📜 Pergamino', '📜 Scroll')}
              </Button>
            )}
            {hero.report !== null && (
              <Button
                key="copiar"
                onPress={async () => {
                  const r = await $.ui.copy({ text: hero.report ?? '', surface: e.surface })
                  $.ui.toast(
                    r.isCopied
                      ? tr(`📋 Copiaste el botín de ${hero.name}`, `📋 You copied ${hero.name}'s loot`)
                      : tr('No pude copiarlo al portapapeles', "Couldn't copy it to the clipboard"),
                  )
                }}
              >
                {tr('📋 Copiar botín', '📋 Copy loot')}
              </Button>
            )}
            <Button key="mas" onPress={() => update($, cardMore, isOn => !isOn)}>
                {isMore ? tr('▾ Menos', '▾ Less') : tr('▸ Más', '▸ More')}
              </Button>
              {closeButton}
            </Box>
          </Box>
        </Box>
      )
    }

    // La crónica: las últimas líneas; al tocar el título, más.
    const chronicle =
      events.length === 0 ? null : (
        <Box flexDirection="column">
          <Button plain key="cronica" onPress={() => update($, chronicleOpen, isOpen => !isOpen)}>
            <Text color={GOLD}>
              {tr('📖 Crónica', '📖 Chronicle')} <Text dimColor>{isChronicleOpen ? '▾' : '▸'}</Text>
            </Text>
          </Button>
          {events
            .slice(isChronicleOpen ? -12 : isCompact ? -2 : -3)
            .reverse()
            .map((l, i) =>
              l.heroId && byId.has(l.heroId) ? (
                <Button plain key={`cronica-${l.at}-${i}`} onPress={() => select(l.heroId ?? '')}>
                  <Text dimColor wrap="truncate-end">
                    {ago(now - l.at)} · {l.text}
                  </Text>
                </Button>
              ) : (
                <Text dimColor wrap="truncate-end">
                  {ago(now - l.at)} · {l.text}
                </Text>
              ),
            )}
        </Box>
      )

    const viewingHero = viewing !== undefined ? byId.get(viewing) : undefined

    const tree = (
      <Box flexDirection="column" gap={1}>
        {viewingHero && (
          <Box gap={1}>
            <Text color={CLASS_COLOR[viewingHero.cls]}>{tr(`Estás viendo a ${viewingHero.name}.`, `You are viewing ${viewingHero.name}.`)}</Text>
            <Button key="volver-banner" onPress={() => $.ui.view({})}>
              {tr('Volver a la conversación principal', 'Back to the main conversation')}
            </Button>
          </Box>
        )}
        {askBanner}
        {bellBanner}
        {masterBlock}
        {quotaBlock}
        {ledgerBlock}
        {realmBlock}
        <Text dimColor>{'─'.repeat(Math.min(cols, 60))}</Text>
        {fieldBlock}
        {tavern}
        {card}
        {chronicle}
      </Box>
    )

    drawn = nextDrawn
    return tree
  })
}

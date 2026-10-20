import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { epithet } from '../hooks/apodos'
import { absorbQuota, addProjectSpend, projectShares } from '../hooks/libro'
import { coinsOf, firstUserTexts, lastTitle } from '../hooks/reino'
import { classOf, describeTool, firstSentence, modelName } from '../hooks/describe'
import { plan } from '../hooks/doctrine'
import { langChoice, langFrom, setLang } from '../hooks/i18n'
import { OLD_STORE, pickImport } from '../hooks/migrar'
import { CELLS, spriteCells, spriteGrid } from '../hooks/sprites'

const PANE = {
  component: 'Pane',
  requestId: 'guild',
  props: {
    title: 'Gremio de Clawd',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 80 },
    view: {},
  },
} as const

const SPAWN = {
  tool_use_id: 'tu1',
  prompt: 'Encuentra dónde se define el logo y dime la ruta.',
  description: 'buscar el logo',
  subagentType: 'Explore',
  provider: { plugin: 'engine', tier: 'core' },
  model: 'haiku',
  parentModel: 'claude-opus-5-5',
  background: false,
  fork: false,
} as const

const USAGE = { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

test('un aventurero aparece con su clase, su ficha, vuelve a la taberna y suena', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  const played: string[] = []
  on('audio.play', (_, e) => {
    if ('asset' in e.clip && e.clip.asset) played.push(e.clip.asset)
    return { value: undefined }
  })
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'a1' }))
  on('agent.list', () => ({ value: [{ id: 'a1', description: '', type: 'Explore', status: 'running' }] }) as never)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  await $.agent.spawn(SPAWN)
  await $.turn.start({ text: SPAWN.prompt, turnId: 't1', agentId: 'a1' })

  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect((await ui.find({ key: 'sel-a1' }))?.text).toContain('Pícaro 1')
  expect(await ui.find({ type: 'Raster', key: 'u-a1' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /envió a Pícaro 1/ })).toBeDefined()

  await ui.press({ key: 'sel-a1' })
  expect(await ui.find({ key: 'ver' })).toBeDefined()
  // Lo técnico (nivel, esfuerzo) queda en «Más».
  expect(await ui.find({ type: 'Text', text: /Nv\. 5/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Esfuerzo:/ })).toBeUndefined()
  await ui.press({ key: 'mas' })
  expect(await ui.find({ type: 'Text', text: /^Nv\. 5 · enviado por Clawd/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Esfuerzo: bajo · Permisos: solo lectura/ })).toBeDefined()

  await $.turn.complete({
    answer: 'Está en src/theme.ts',
    durationMs: 1200,
    isAborted: false,
    turnId: 't1',
    agentId: 'a1',
    reason: 'answer',
    usage: { model: 'claude-haiku-5-5', ...USAGE },
  })
  expect(await ui.find({ type: 'Text', text: /volvió con el botín/ })).toBeDefined()
  // Primero se queda unos segundos en el campo con su botín; después entra a la taberna.
  expect(await ui.find({ type: 'Raster', key: 'u-a1' })).toBeDefined()
  await clock.advance(6500)
  await ui.redraw()
  expect(await ui.find({ type: 'Raster', key: 't-a1' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1,2 mil tokens/ })).toBeDefined()
  expect(played).toContain('sounds/picaro.wav')
  await ui.unmount()
})

test('el Maestro: melodía si termina bien, trompeta triste si falla, nada si se interrumpe o se silencia', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  const played: string[] = []
  on('audio.play', (_, e) => {
    if ('asset' in e.clip && e.clip.asset) played.push(e.clip.asset)
    return { value: undefined }
  })
  on('turn.complete', (_, e) => ({ text: e.answer }))
  const done = { answer: 'listo', durationMs: 900, isAborted: false, turnId: 'm1', reason: 'answer' } as const
  await $.turn.complete(done)
  expect(played).toEqual(['sounds/maestro.wav'])

  await $.turn.complete({ ...done, turnId: 'm2', reason: 'error' })
  expect(played).toEqual(['sounds/maestro.wav', 'sounds/caido.wav'])
  await $.turn.complete({ ...done, turnId: 'm3', reason: 'aborted', isAborted: true })
  expect(played).toEqual(['sounds/maestro.wav', 'sounds/caido.wav'])

  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  await ui.press({ key: 'sonido' })
  await $.turn.complete({ ...done, turnId: 'm4' })
  expect(played).toEqual(['sounds/maestro.wav', 'sounds/caido.wav'])
  await ui.unmount()
})

test('cada aventurero piensa con el esfuerzo que le asignó el Maestro', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  let effort: unknown
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'e1' }))
  on('turn.step', async function* (_, e) {
    effort = e.effort
    return { turnId: e.turnId, index: e.index, answer: 'ok', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  await $.agent.spawn(SPAWN)
  const steps = $.turn.step({ turnId: 't1', index: 0, model: 'claude-haiku-5-5', effort: 'medium', messageCount: 1, agentId: 'e1' })
  for await (const _ of steps) {
    // nada que leer
  }
  expect(effort).toBe('low')
})

test('lo que hace la sesión principal se ve en el Maestro', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('tool.call', () => ({ result: 'ok' }))
  await $.tool.call({ tool: 'Bash', command: 'ls', description: 'listando la carpeta' })
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: /listando la carpeta/ })).toBeDefined()
  expect(await ui.find({ type: 'Raster', key: 'maestro' })).toBeDefined()
  await ui.unmount()
})

test('con muchos en misión el panel pasa a mini y luego a hueste', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  let n = 0
  on('agent.spawn', () => {
    n += 1
    return { model: n % 2 ? 'claude-haiku-5-5' : 'claude-sonnet-5-5', agentId: `h${n}` }
  })
  for (let i = 0; i < 9; i++) await $.agent.spawn({ ...SPAWN, tool_use_id: `tu${i}` })
  let ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Raster', key: 'm-h1' })).toBeDefined()
  expect(await ui.find({ type: 'Raster', key: 'u-h1' })).toBeUndefined()
  await ui.unmount()

  for (let i = 9; i < 24; i++) await $.agent.spawn({ ...SPAWN, tool_use_id: `tu${i}` })
  ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: /Pícaros ×12/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Bardos ×12/ })).toBeDefined()
  await ui.press({ key: 'hueste-picaro' })
  expect(await ui.find({ key: 'sel-h1' })).toBeDefined()
  await ui.unmount()
})

test('el Código asigna el modelo y acota la misión', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  let seen: { model?: string; prompt: string } = { prompt: '' }
  on('agent.spawn', (_, e) => {
    seen = { model: e.model, prompt: e.prompt }
    return { model: 'claude-sonnet-5-5', agentId: 'b1' }
  })
  const { model: _drop, ...noModel } = SPAWN
  await $.agent.spawn({ ...noModel, description: 'resumir el documento', prompt: 'Resume este documento en cinco puntos.' })
  expect(seen.model).toBe('sonnet')
  expect(seen.prompt).toContain('[Misión acotada · Gremio de Clawd]')
  expect(seen.prompt).toContain('máximo 500 palabras')
})

test('un clon con toda la conversación para algo liviano se frena', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  let spawned = 0
  on('agent.spawn', () => {
    spawned += 1
    return { model: 'claude-opus-5-5', agentId: 'c1' }
  })
  const r = await $.agent.spawn({ ...SPAWN, fork: true, subagentType: 'fork' })
  expect(spawned).toBe(0)
  expect('deny' in r && r.deny).toContain('fork')
})

test('el Archimago pide permiso y respeta la respuesta', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  let asked = 0
  on('tool.call', { tool: 'AskUserQuestion' }, (_, e) => {
    asked += 1
    const questions = (e as unknown as { questions: Array<{ question: string }> }).questions
    const q = questions[0]?.question ?? ''
    return { result: { questions, answers: { [q]: 'Mejor un Mago (Opus)' } } }
  })
  let seen: string | undefined
  on('agent.spawn', (_, e) => {
    seen = e.model
    return { model: 'claude-opus-5-5', agentId: 'f1' }
  })
  await $.agent.spawn({ ...SPAWN, description: 'diseñar la arquitectura', prompt: 'Diseña la arquitectura del sistema.', model: 'fable' })
  expect(asked).toBe(1)
  expect(seen).toBe('opus')
})

test('un teammate con Fable también pide permiso', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  let asked = 0
  on('tool.call', { tool: 'AskUserQuestion' }, (_, e) => {
    asked += 1
    const questions = (e as unknown as { questions: Array<{ question: string }> }).questions
    const q = questions[0]?.question ?? ''
    return { result: { questions, answers: { [q]: 'No enviarlo' } } }
  })
  let spawned = 0
  on('agent.spawn', () => {
    spawned += 1
    return { model: 'claude-fable-5-1', agentId: 't1' }
  })
  const r = await $.agent.spawn({ ...SPAWN, description: 'revisar el diseño', prompt: 'Revisa el diseño.', model: 'fable', isTeammate: true } as never)
  expect(asked).toBe(1)
  expect(spawned).toBe(0)
  expect('deny' in r && r.deny).toContain('Fable')
})

test('con el Código apagado el Maestro envía sin reglas', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  let seen: { model?: string; prompt: string } = { prompt: '' }
  on('agent.spawn', (_, e) => {
    seen = { model: e.model, prompt: e.prompt }
    return { model: 'claude-opus-5-5', agentId: 'd1' }
  })
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  await ui.press({ key: 'doctrina' })
  expect((await ui.find({ key: 'doctrina' }))?.text).toBe('📜✗')
  const { model: _drop, ...noModel } = SPAWN
  await $.agent.spawn(noModel)
  expect(seen.model).toBe(undefined)
  expect(seen.prompt).not.toContain('[Misión acotada')
  await ui.unmount()
})

test('el Código entra en las instrucciones del Maestro', async ($, on) => {
  on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'hola', scope: 'shared' }] }))
  const r = await $.prompt.compose({
    model: 'claude-opus-5-5',
    promptModel: 'claude-opus-5-5',
    surfaces: ['terminal'],
    tools: [],
    outputStyle: null,
    traits: [],
  })
  expect(r.sections.map(s => s.id)).toContain('guild:code')
})

test('fuera de la terminal dibuja una versión de texto', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('tool.call', () => ({ result: 'ok' }))
  await $.tool.call({ tool: 'Read', file_path: '/a/b.md' })
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'desktop', ...PANE })
  expect(await ui.find({ type: 'Text', text: /Gran Maestre: 📖 lee b\.md/ })).toBeDefined()
  await ui.unmount()
})

test('clases, modelos, Código y frases', () => {
  expect(classOf('claude-haiku-5-5')).toBe('picaro')
  expect(classOf('claude-sonnet-5-5')).toBe('bardo')
  expect(classOf('claude-opus-5-5')).toBe('mago')
  expect(classOf('claude-fable-5-1')).toBe('archimago')
  expect(modelName('claude-opus-5-5')).toBe('Opus 5.5')
  expect(describeTool('mcp__claude_ai_Gmail__search_threads', {})).toBe('📡 Gmail: search threads')
  expect(plan('buscar el logo', 'Encuentra dónde está el logo').effort).toBe('low')
  expect(plan('arreglar el bug', 'Corrige el error del login').alias).toBe('sonnet')
  expect(plan('diseñar la arquitectura', 'Diseña el sistema de pagos').effort).toBe('high')
  expect(plan('buscar y corregir', 'Busca el error y corrígelo').alias).toBe('sonnet')
})

test('los sprites tienen el tamaño de su Raster', () => {
  const bytes = (cells: string) => (cells.length / 4) * 3 - (cells.endsWith('==') ? 2 : cells.endsWith('=') ? 1 : 0)
  for (const size of ['big', 'small', 'mini'] as const) {
    expect(bytes(spriteCells('picaro', 'marcha', 1, size))).toBe(CELLS[size].columns * CELLS[size].rows * 12)
  }
})

const HAIKU_USAGE = { model: 'claude-haiku-5-5', input_tokens: 200_000, output_tokens: 20_000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }

const T0 = 1_000_000_000_000
const iso = (ms: number) => new Date(ms).toISOString()
const OPUS_USAGE = { model: 'claude-opus-5-5', input_tokens: 100_000, output_tokens: 5_000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
const measure = (five: number, week: number) => ({
  context: { window: 1_000_000 },
  rateLimits: [
    { kind: 'five_hour', percentUsed: five, resetsAt: iso(T0 + 2 * 3_600_000) },
    { kind: 'seven_day', percentUsed: week, resetsAt: iso(T0 + 3 * 86_400_000) },
  ],
  changed: ['rateLimits' as const],
})

test('la cuota del plan se reparte entre el Maestro y los aventureros', async ($, on) => {
  const clock = mock.clock(on, { now: T0 })
  mock.store(on)
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'o1' }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  await $.session.measure(measure(10, 5))
  await $.agent.spawn(SPAWN)
  await $.turn.complete({ answer: 'listo', durationMs: 900, isAborted: false, turnId: 't1', agentId: 'o1', reason: 'answer', usage: HAIKU_USAGE })
  await $.turn.complete({ answer: 'listo', durationMs: 900, isAborted: false, turnId: 'm1', reason: 'answer', usage: OPUS_USAGE })
  await clock.advance(30 * 60_000)
  await $.session.measure(measure(14, 6))

  // Pesos: Maestro 0,50 y Pícaro 0,03 (precio equivalente). La sesión consumió 4 puntos de 5 h.
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  // Cerrado: una línea por bolsa, con sus 🪙, lo que queda y cuándo se rellena.
  expect((await ui.find({ key: 'bolsa-five_hour' }))?.text).toBe('▸ Jornada 🪙🪙🪙🪙🪙🪙🪙🪙🪙·  86  ↻ 1 h 30 min')
  expect((await ui.find({ key: 'bolsa-seven_day' }))?.text).toBe('▸ Semana  🪙🪙🪙🪙🪙🪙🪙🪙🪙·  94  ↻ 2 d 23 h')
  expect(await ui.find({ type: 'Text', text: /Gastas/ })).toBeUndefined()
  expect(await ui.find({ type: 'Raster', key: 'bolsa-five_hour' })).toBeUndefined()
  // Al tocar la jornada se abre su detalle.
  await ui.press({ key: 'bolsa-five_hour' })
  expect((await ui.find({ key: 'bolsa-five_hour' }))?.text).toMatch(/^▾ Jornada/)
  expect(await ui.find({ type: 'Text', text: /^Gastas 8 por hora · te alcanza$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Esta sesión gastó 4: Clawd 3,8 · Pícaros 0,2$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /El Código te ahorró ≈ 8,8 frente a mandar solo Magos/ })).toBeDefined()
  // Abrir la semana cierra la jornada.
  await ui.press({ key: 'bolsa-seven_day' })
  expect(await ui.find({ type: 'Text', text: /^Gastas/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^Esta sesión gastó 1$/ })).toBeDefined()
  expect((await ui.find({ key: 'libro' }))?.text).toBe('📕 Libro ▸')
  await ui.press({ key: 'libro' })
  expect((await ui.find({ key: 'libro' }))?.text).toBe('📕 Libro ▾')
  expect(await ui.find({ type: 'Text', text: /1 misión · buen botín 100% · 4 monedas de jornada gastadas/ })).toBeDefined()
  await ui.press({ key: 'sel-o1' })
  expect(await ui.find({ type: 'Text', text: /· 🪙 0,2$/ })).toBeDefined()
  await ui.unmount()
})

test('si el ritmo no alcanza, el panel avisa a qué hora llegarías al 100%', async ($, on) => {
  const clock = mock.clock(on, { now: T0 })
  mock.store(on)
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await $.session.measure(measure(60, 20))
  await clock.advance(20 * 60_000)
  await $.session.measure(measure(80, 22))
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  // El aviso se ve sin abrir nada: reemplaza al reloj de la línea.
  expect((await ui.find({ key: 'bolsa-five_hour' }))?.text).toBe('▸ Jornada 🪙🪙· · · · · · · ·  20  se acaba en 20 min')
  await ui.press({ key: 'bolsa-five_hour' })
  expect(await ui.find({ type: 'Text', text: /^↻ se rellena en 1 h 40 min$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Gastas 60 por hora · se acaba en 20 min$/ })).toBeDefined()
  await ui.unmount()
})

test('tu calificación corrige el libro y la experiencia', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'r1' }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  await $.agent.spawn(SPAWN)
  await $.turn.complete({ answer: 'listo', durationMs: 900, isAborted: false, turnId: 't1', agentId: 'r1', reason: 'answer', usage: HAIKU_USAGE })
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  await ui.press({ key: 'sel-r1' })
  await ui.press({ key: 'malo' })
  await ui.press({ key: 'libro' })
  expect(await ui.find({ type: 'Text', text: /1 misión · buen botín 0%/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Calificaste el botín de Pícaro 1: malo/ })).toBeDefined()
  // Se califica una sola vez: después queda el resultado y no hay botones.
  expect(await ui.find({ key: 'bueno' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^👎 No te sirvió · el Código lo anotó/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /1 misión · buen botín 0%/ })).toBeDefined()
  await ui.unmount()
})

test('si los Pícaros vienen fallando, el Código sube la misión a Bardo', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on, {
    experiencia: {
      'identificar|picaro': [
        { id: 'x1', ok: false },
        { id: 'x2', ok: true },
        { id: 'x3', ok: false },
      ],
    },
  })
  let seen: string | undefined
  on('agent.spawn', (_, e) => {
    seen = e.model
    return { model: 'claude-sonnet-5-5', agentId: 'p1' }
  })
  const { model: _drop, ...noModel } = SPAWN
  await $.agent.spawn(noModel)
  expect(seen).toBe('sonnet')
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: /Los Pícaros fallaron 2 de sus últimas 3 misiones/ })).toBeDefined()
  await ui.unmount()
})

test('Haiku clasifica la misión cuando responde', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  let asked = 0
  on('model.complete', () => {
    asked += 1
    return {
      value: {
        isAnswered: true,
        text: '{"tipo": "disenar", "escribe": true}',
        usage: { input_tokens: 300, output_tokens: 20, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      },
    }
  })
  let seen: string | undefined
  on('agent.spawn', (_, e) => {
    seen = e.model
    return { model: 'claude-opus-5-5', agentId: 'k1' }
  })
  const { model: _drop, ...noModel } = SPAWN
  await $.agent.spawn(noModel)
  expect(asked).toBe(1)
  expect(seen).toBe('opus')
})

test('/gremio cuentas resume la tesorería y el libro', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'c9' }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  await $.agent.spawn(SPAWN)
  await $.turn.complete({ answer: 'listo', durationMs: 900, isAborted: false, turnId: 't1', agentId: 'c9', reason: 'answer', usage: HAIKU_USAGE })
  const r = await $.command.run({
    command: 'gremio',
    args: 'cuentas',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 },
  })
  const text = 'text' in r ? String(r.text) : ''
  expect(text).toContain('**💰 Tesoro del gremio**')
  expect(text).toContain('| Pícaro | 1 | 100% | 100% |')
})

test('la ficha del Maestro: vida = contexto, turno, grupo y ajustes con iconos', async ($, on) => {
  const clock = mock.clock(on, { now: T0 })
  mock.store(on)
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('tool.call', () => ({ result: 'ok' }))
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'f1' }))
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect((await ui.find({ key: 'vida' }))?.text).toBe('▸ Vida    se mide con la próxima respuesta')
  expect(await ui.find({ type: 'Text', text: /tranquilo|siempre con tu permiso|Código:/ })).toBeUndefined()

  await $.session.measure({ ...measure(10, 5), context: { window: 1_000_000, tokens: 320_000, percent: 32 }, changed: ['context', 'rateLimits'] })
  expect((await ui.find({ key: 'vida' }))?.text).toBe('▸ Vida    ♥ ♥ ♥ ♥ ♥ ♥ ♥ · · ·  68')
  await ui.press({ key: 'vida' })
  expect(await ui.find({ type: 'Text', text: /^Contexto: 320 k de 1 M tokens$/ })).toBeDefined()

  await $.turn.start({ turnId: 'm1' } as never)
  await $.tool.call({ tool: 'Bash', command: 'ls', description: 'mirando' })
  await clock.advance(90_000)
  await $.tool.call({ tool: 'Bash', command: 'ls', description: 'mirando otra vez' })
  expect(await ui.find({ type: 'Text', text: /^  Turno   1 min 30 s · 2 acciones$/ })).toBeDefined()
  await $.agent.spawn(SPAWN)
  expect((await ui.find({ key: 'hoy' }))?.text).toBe('  Hoy     1 misión')

  expect((await ui.find({ key: 'sonido' }))?.text).toBe('🔊')
  await ui.press({ key: 'sonido' })
  expect((await ui.find({ key: 'sonido' }))?.text).toBe('🔇')
  expect((await ui.find({ key: 'doctrina' }))?.text).toBe('📜')
  await ui.unmount()
})

test('un aventurero retomado vuelve a salir con su nombre, en otra ronda', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  let n = 0
  on('agent.spawn', (_, e) => {
    if (e.resume) return { model: 'claude-haiku-5-5', agentId: e.resume.agentId }
    n += 1
    return { model: 'claude-haiku-5-5', agentId: `r${n}` }
  })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  await $.agent.spawn(SPAWN)
  await $.turn.complete({ answer: 'listo', durationMs: 900, isAborted: false, turnId: 't1', agentId: 'r1', reason: 'answer', usage: HAIKU_USAGE })
  await clock.advance(60_000)
  await $.agent.spawn({ ...SPAWN, prompt: 'Ahora busca también el favicon.', resume: { agentId: 'r1' } })
  await clock.advance(20_000)

  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect((await ui.find({ key: 'sel-r1' }))?.text).toContain('Pícaro 1')
  expect(await ui.find({ type: 'Raster', key: 'u-r1' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^⏳ 20 s · ronda 2$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /📨 Clawd le escribió de nuevo a Pícaro 1: Ahora busca también el favicon\./ })).toBeDefined()
  await ui.press({ key: 'sel-r1' })
  await ui.press({ key: 'mas' })
  expect(await ui.find({ type: 'Text', text: /📨 Último mensaje: Ahora busca también el favicon\./ })).toBeDefined()
  // El siguiente nuevo sigue la cuenta: el retomado no gastó un número.
  await $.agent.spawn({ ...SPAWN, tool_use_id: 'tu2' })
  expect((await ui.find({ key: 'sel-r2' }))?.text).toContain('Pícaro 2')
  await ui.unmount()
})

test('la crónica muestra las últimas tres y se abre al tocarla', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  let n = 0
  on('agent.spawn', () => {
    n += 1
    return { model: 'claude-haiku-5-5', agentId: `c${n}` }
  })
  for (let i = 0; i < 5; i++) await $.agent.spawn({ ...SPAWN, tool_use_id: `tu${i}`, description: `misión ${i + 1}` })
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect((await ui.find({ key: 'cronica' }))?.text).toBe('📖 Crónica ▸')
  expect(await ui.find({ type: 'Text', text: /🧭 Clawd envió a Pícaro 5, el Rastreador: misión 5$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /misión 2$/ })).toBeUndefined()
  await ui.press({ key: 'cronica' })
  expect(await ui.find({ type: 'Text', text: /misión 2$/ })).toBeDefined()
  await ui.unmount()
})

test('cada celda de cada sprite lleva a lo más dos colores', () => {
  const bad: string[] = []
  for (const cls of ['maestro', 'archimago', 'mago', 'bardo', 'picaro'] as const)
    for (const pose of ['quieto', 'marcha', 'parpadeo', 'caido'] as const)
      for (const frame of [0, 1])
        for (const size of ['big', 'small', 'mini'] as const) {
          const g = spriteGrid(cls, pose, frame, size)
          for (let y = 0; y < g.length; y += 2)
            for (let x = 0; x < (g[0]?.length ?? 0); x += 2) {
              const colors = new Set([g[y]?.[x], g[y]?.[x + 1], g[y + 1]?.[x], g[y + 1]?.[x + 1]].map(c => c ?? -1))
              if (colors.size > 2) bad.push(`${cls} ${pose} ${size} (${x},${y})`)
            }
        }
  expect([...new Set(bad)]).toEqual([])
})

test('el ruteo del Código queda fijo para las misiones tipo', () => {
  const cases: Array<[string, string, string, string, boolean]> = [
    ['buscar el logo', 'Encuentra dónde se define el logo', 'haiku', 'low', true],
    ['listar los sonidos', 'Lista los archivos de sounds/', 'haiku', 'low', true],
    ['verificar la versión', 'Verifica qué versión tiene el plugin', 'haiku', 'low', true],
    ['buscar y corregir', 'Busca el error y corrígelo', 'sonnet', 'medium', false],
    ['investigar la API', 'Investiga cómo funciona la API de cuotas y resume', 'sonnet', 'medium', false],
    ['traducir el README', 'Traduce el README al inglés', 'sonnet', 'medium', false],
    ['diseñar la arquitectura', 'Diseña el sistema de pagos', 'opus', 'high', false],
    ['revisión de seguridad', 'Haz una auditoría de seguridad del login', 'opus', 'high', false],
    ['depurar el cuelgue', 'Depura por qué se cuelga al arrancar', 'opus', 'high', false],
  ]
  for (const [description, prompt, alias, effort, isReadOnly] of cases) {
    const p = plan(description, prompt)
    expect(`${description}: ${p.alias} ${p.effort} ${p.isReadOnly}`).toBe(`${description}: ${alias} ${effort} ${isReadOnly}`)
  }
})

/** Ancho en columnas de la terminal: los emoji ocupan dos. */
function columnsOf(text: string): number {
  let n = 0
  for (const ch of text) n += /\p{Extended_Pictographic}/u.test(ch) ? 2 : ch === '️' ? 0 : 1
  return n
}

test('el panel se dibuja a 40, 60 y 110 columnas sin que las líneas fijas se salgan', async ($, on) => {
  const clock = mock.clock(on, { now: T0 })
  mock.store(on)
  let n = 0
  on('agent.spawn', () => {
    n += 1
    return { model: 'claude-haiku-5-5', agentId: `w${n}` }
  })
  on('agent.list', () => ({ value: [{ id: 'w1', description: '', type: 'Explore', status: 'completed' }] }) as never)
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await $.session.measure({ ...measure(28, 6), context: { window: 1_000_000, tokens: 320_000, percent: 32 }, changed: ['context', 'rateLimits'] })
  await $.agent.spawn(SPAWN)
  await $.agent.spawn({ ...SPAWN, tool_use_id: 'tu2', description: 'investigar la API de cuotas' })
  await clock.advance(60_000)
  await $.turn.complete({ answer: 'Está en src/theme.ts', durationMs: 900, isAborted: false, turnId: 't1', agentId: 'w1', reason: 'answer', usage: HAIKU_USAGE })
  for (const cols of [40, 60, 110]) {
    const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE, props: { ...PANE.props, bodyColumns: cols } })
    if (cols === 40) {
      await ui.press({ key: 'libro' })
      await ui.press({ key: 'cronica' })
      await ui.press({ key: 'sel-w1' })
      await ui.press({ key: 'mas' })
    }
    // Las líneas de una sola fila (bolsas, vida) caben en el ancho.
    for (const key of ['bolsa-five_hour', 'bolsa-seven_day', 'vida']) {
      const text = (await ui.find({ key }))?.text ?? ''
      expect(`${cols}: ${key} ${columnsOf(text) <= cols}`).toBe(`${cols}: ${key} true`)
    }
    expect(await ui.find({ key: 'ver' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Encargo:/ })).toBeDefined()
    await ui.unmount()
  }
})

test('lo que apagaste se recuerda en la sesión siguiente y la línea de estado lo dice', async ($, on) => {
  mock.clock(on, { now: T0 })
  mock.store(on, { ajustes: { sound: false, doctrine: false } })
  claudeIn(on, 'Español')
  const shown: Array<string | undefined> = []
  on('ui.status', (_, e) => {
    shown.push(e.text)
    return { value: undefined }
  })
  on('command.register', () => ({ value: undefined }) as never)
  on('session.usage', () => ({
    value: {
      startedAt: T0,
      context: { window: 1_000_000, tokens: 320_000, percent: 32 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 28, resetsAt: iso(T0 + 3_600_000) }],
    },
  }))
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('session.start', (_, e) => e as never)
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await $.session.start({ cwd: '/x', surface: 'terminal', isInteractive: true } as never)
  expect(shown.at(-1)).toBe('♥ 68 · 🪙 72 · 📜✗ sin Código')
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect((await ui.find({ key: 'sonido' }))?.text).toBe('🔇')
  expect((await ui.find({ key: 'doctrina' }))?.text).toBe('📜✗')
  expect(await ui.find({ type: 'Text', text: /Clawd abre el gremio$/ })).toBeDefined()
  await ui.press({ key: 'doctrina' })
  expect(shown.at(-1)).toBe('♥ 68 · 🪙 72')
  await ui.unmount()
})

test('con poca vida Clawd avisa una sola vez y se rearma tras un /compact', async ($, on) => {
  mock.clock(on, { now: T0 })
  mock.store(on)
  const toasts: string[] = []
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('session.measure', (_, e) => ({ changed: e.changed }))
  const ctx = (percent: number) => ({ ...measure(10, 5), context: { window: 1_000_000, tokens: percent * 10_000, percent }, changed: ['context' as const] })
  await $.session.measure(ctx(70))
  await $.session.measure(ctx(82))
  await $.session.measure(ctx(85))
  expect(toasts).toEqual(['💤 A Clawd le queda poca vida (18 %): un /compact lo deja como nuevo.'])
  await $.session.measure(ctx(40))
  await $.session.measure(ctx(90))
  expect(toasts).toHaveLength(2)
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: /💤 A Clawd le queda poca vida \(10 %\)/ })).toBeDefined()
  await ui.unmount()
})

test('la bolsa avisa una vez por ventana si el ritmo no alcanza, y el botín se copia', async ($, on) => {
  const clock = mock.clock(on, { now: T0 })
  mock.store(on)
  const toasts: string[] = []
  on('ui.toast', (_, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  let copied = ''
  on('ui.copy', (_, e) => {
    copied = e.text
    return { value: { isCopied: true } }
  })
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'p1' }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  await $.session.measure(measure(40, 20))
  await clock.advance(10 * 60_000)
  await $.session.measure(measure(50, 21))
  expect(toasts).toEqual([])
  await clock.advance(15 * 60_000)
  await $.session.measure(measure(65, 22))
  await clock.advance(5 * 60_000)
  await $.session.measure(measure(70, 22))
  expect(toasts).toHaveLength(1)
  expect(toasts[0]).toMatch(/^🪙 A este ritmo la bolsa de la jornada se acaba en/)

  await $.agent.spawn(SPAWN)
  await $.turn.complete({ answer: 'Está en src/theme.ts', durationMs: 900, isAborted: false, turnId: 't1', agentId: 'p1', reason: 'answer', usage: HAIKU_USAGE })
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  await ui.press({ key: 'sel-p1' })
  await ui.press({ key: 'copiar' })
  expect(copied).toBe('Está en src/theme.ts')
  expect(toasts.at(-1)).toBe('📋 Copiaste el botín de Pícaro 1')
  await ui.unmount()
})

test('los apodos salen de la misión, sin modelo', () => {
  expect(epithet('picaro', 'buscar el logo', 'Encuentra dónde se define')).toBe('el Rastreador')
  expect(epithet('bardo', 'arreglar el login', 'Corrige el error')).toBe('el Sanador')
  expect(epithet('mago', 'diseñar la arquitectura', 'Diseña el sistema')).toBe('el Arquitecto')
  expect(epithet('bardo', 'resumir el documento', 'Resume en cinco puntos')).toBe('el Cronista')
  expect(epithet('picaro', 'tarea', 'hazlo')).toBe('el Sigiloso')
})

test('el libro cuenta la cuota una vez aunque la lean varias sesiones', () => {
  const r = (percent: number) => ({ percent, resetsAt: '2026-10-19T07:30:00.000Z' })
  // Libro viejo: lo contado antes queda como base.
  const old = { missions: 0, good: 0, bad: 0, cost: 0, saved: 0, masterCost: 0, codeCost: 0, byClass: {}, fivePoints: 17, weekPoints: 5 }
  let b = absorbQuota(old, r(10), undefined)
  expect(b.fivePoints).toBe(17)
  // Dos sesiones informan la misma ventana: suma la diferencia una sola vez.
  b = absorbQuota(b, r(30), undefined)
  b = absorbQuota(b, r(30), undefined)
  b = absorbQuota(b, { percent: 25, resetsAt: '2026-10-19T07:30:12.000Z' }, undefined)
  expect(b.fivePoints).toBe(37)
  // Sin cambios, devuelve el mismo libro (no se reescribe el almacén).
  expect(absorbQuota(b, r(20), undefined)).toBe(b)
  // Una ventana nueva cuenta desde lo que se vio primero.
  b = absorbQuota(b, { percent: 2, resetsAt: '2026-10-19T12:30:00.000Z' }, undefined)
  b = absorbQuota(b, { percent: 9, resetsAt: '2026-10-19T12:30:00.000Z' }, undefined)
  expect(b.fivePoints).toBe(44)
})

test('cuando el Código sube de clase por la experiencia, la crónica lo cuenta', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on, { experiencia: { 'identificar|picaro': [{ id: 'x1', ok: false }, { id: 'x2', ok: true }] } })
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'f9' }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  await $.agent.spawn(SPAWN)
  await $.turn.complete({ answer: '', durationMs: 900, isAborted: false, turnId: 't1', agentId: 'f9', reason: 'error' as never, usage: HAIKU_USAGE })
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  await ui.press({ key: 'cronica' })
  expect(await ui.find({ type: 'Text', text: /🛑 Los Pícaros fallaron 2 de sus últimas 3 misiones de identificar o buscar: la próxima va con un Bardo/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /🩹 Pícaro 1 volvió herido/ })).toBeDefined()
  await ui.unmount()
})

test('un aventurero sin acciones hace 5 min se ve quieto; la crónica abre su ficha; la taberna se abre entera', async ($, on) => {
  const clock = mock.clock(on, { now: T0 })
  mock.store(on)
  let n = 0
  on('agent.spawn', () => {
    n += 1
    return { model: 'claude-haiku-5-5', agentId: `q${n}` }
  })
  on('agent.list', () => ({ value: [{ id: 'q1', description: '', type: 'Explore', status: 'running' }] }) as never)
  on('tool.call', () => ({ result: 'ok' }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  await $.agent.spawn(SPAWN)
  await $.tool.call({ tool: 'Bash', command: 'ls', description: 'mirando', agentId: 'q1' } as never)
  await clock.advance(6 * 60_000)
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: /^💤 quieto hace 6 min$/ })).toBeDefined()
  // La línea de la crónica de un aventurero abre su ficha.
  const line = (await ui.findAll({ type: 'Button' })).find(b => String(b.key ?? '').startsWith('cronica-'))
  expect(line).toBeDefined()
  await ui.press({ key: String(line?.key) })
  expect(await ui.find({ key: 'ver' })).toBeDefined()
  await ui.unmount()

  // Muchos de vuelta: «+N más» abre la taberna entera.
  for (let i = 0; i < 12; i++) await $.agent.spawn({ ...SPAWN, tool_use_id: `tq${i}` })
  for (let i = 2; i <= 13; i++)
    await $.turn.complete({ answer: 'listo', durationMs: 900, isAborted: false, turnId: `t${i}`, agentId: `q${i}`, reason: 'answer', usage: HAIKU_USAGE })
  await clock.advance(6500)
  const ui2 = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect((await ui2.find({ key: 'taberna-mas' }))?.text).toMatch(/^▸ \+\d+ más$/)
  const inTavern = async () => (await ui2.findAll({ type: 'Raster' })).filter(r => String(r.key ?? '').startsWith('t-')).length
  expect(await inTavern()).toBe(6)
  await ui2.press({ key: 'taberna-mas' })
  expect(await inTavern()).toBe(12)
  await ui2.unmount()
})

test('si el motor ya no tiene la conversación de un aventurero, no se ofrece abrirla', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  mock.store(on)
  on('agent.spawn', () => ({ model: 'claude-opus-5-5', agentId: 'viejo' }))
  on('agent.list', () => ({ value: [] }) as never)
  on('turn.complete', (_, e) => ({ text: e.answer }))
  await $.agent.spawn(SPAWN)
  await $.turn.complete({ answer: 'listo', durationMs: 900, isAborted: false, turnId: 't1', agentId: 'viejo', reason: 'answer', usage: OPUS_USAGE })
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  await ui.press({ key: 'sel-viejo' })
  expect(await ui.find({ key: 'cerrar' })).toBeDefined()
  expect(await ui.find({ key: 'ver' })).toBeUndefined()
  await ui.unmount()
})

test('el plantel del día: sale el mismo aventurero si está libre; en la taberna, desteñido y una vez', async ($, on) => {
  const clock = mock.clock(on, { now: T0 })
  mock.store(on)
  let n = 0
  on('agent.spawn', () => {
    n += 1
    return { model: 'claude-haiku-5-5', agentId: `pl${n}` }
  })
  on('agent.list', () => ({ value: [] }) as never)
  on('turn.complete', (_, e) => ({ text: e.answer }))
  const done = (id: string) =>
    $.turn.complete({ answer: 'listo', durationMs: 900, isAborted: false, turnId: `t-${id}`, agentId: id, reason: 'answer', usage: HAIKU_USAGE })
  await $.agent.spawn(SPAWN)
  await done('pl1')
  await $.agent.spawn({ ...SPAWN, tool_use_id: 'tu2', description: 'arreglar el login' })
  await $.agent.spawn({ ...SPAWN, tool_use_id: 'tu3' })
  let ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  // Pícaro 1 vuelve a salir (con su apodo de la primera vez); como está ocupado, el siguiente es Pícaro 2.
  expect((await ui.find({ key: 'sel-pl2' }))?.text).toContain('Pícaro 1')
  expect((await ui.find({ key: 'sel-pl3' }))?.text).toContain('Pícaro 2')
  expect(await ui.find({ type: 'Raster', key: 't-pl1' })).toBeUndefined()
  await ui.unmount()
  await done('pl2')
  await done('pl3')
  await clock.advance(6500)
  ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  const tavern = (await ui.findAll({ type: 'Raster' })).filter(r => String(r.key ?? '').startsWith('t-'))
  expect(tavern.map(r => r.key).sort()).toEqual(['t-pl2', 't-pl3'])
  expect((tavern[0]?.props as { cells?: string }).cells).toBe(spriteCells('picaro', 'quieto', 0, 'mini', true))
  await ui.press({ key: 'sel-pl2' })
  expect(await ui.find({ type: 'Text', text: /^Hoy: 2 misiones · 2 con botín$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Pícaro 1, el Rastreador/ })).toBeDefined()
  await ui.unmount()
})

test('a medianoche todos se van a casa y la numeración vuelve a 1', async ($, on) => {
  const clock = mock.clock(on, { now: T0 })
  mock.store(on)
  let n = 0
  on('agent.spawn', () => {
    n += 1
    return { model: 'claude-haiku-5-5', agentId: `md${n}` }
  })
  on('turn.complete', (_, e) => ({ text: e.answer }))
  await $.agent.spawn(SPAWN)
  await $.agent.spawn({ ...SPAWN, tool_use_id: 'tu2' })
  await $.turn.complete({ answer: 'listo', durationMs: 900, isAborted: false, turnId: 't1', agentId: 'md1', reason: 'answer', usage: HAIKU_USAGE })
  await $.turn.complete({ answer: 'listo', durationMs: 900, isAborted: false, turnId: 't2', agentId: 'md2', reason: 'answer', usage: HAIKU_USAGE })
  await clock.advance(24 * 3_600_000)
  await $.agent.spawn({ ...SPAWN, tool_use_id: 'tu3' })
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: /🌙 Fin de la jornada: 2 misiones, 2 con botín\. Todos se fueron a casa\./ })).toBeDefined()
  expect((await ui.find({ key: 'sel-md3' }))?.text).toContain('Pícaro 1')
  expect(await ui.find({ type: 'Raster', key: 't-md1' })).toBeUndefined()
  expect(await ui.find({ type: 'Raster', key: 't-md2' })).toBeUndefined()
  await ui.unmount()
})

/** Lo mínimo para arrancar una sesión de gremio en una prueba. */
/** Claude Code con su ajuste de idioma (Language) en `value`. */
function claudeIn(on: On, value: string) {
  on('config.list', () => ({ value: [{ key: 'language', label: 'Language', kind: 'text', value, provider: { plugin: 'engine', tier: 'core' }, isLocked: false }] }) as never)
}

function startMocks(on: On, id: string) {
  on('command.register', () => ({ value: undefined }) as never)
  claudeIn(on, 'Español')
  on('session.usage', () => ({ value: { startedAt: T0, context: { window: 1_000_000, tokens: 320_000, percent: 32 }, rateLimits: [] } }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('session.start', (_, e) => e as never)
  on('session.id', () => ({ value: id }) as never)
  on('session.measure', (_, e) => ({ changed: e.changed }))
}

test('el reino: las otras sesiones aparecen con su estado y la que pregunta va a la línea de estado', async ($, on) => {
  mock.clock(on, { now: T0 })
  mock.env(on, { HOME: '/Users/ana' })
  mock.store(on, {
    'reino.otra': { key: 'otra', label: 'huerto', state: 'asking', since: T0 - 2 * 60_000, running: 0, life: 70, at: T0 - 10_000, ask: 'te pide permiso: Bash', folder: '/Users/ana/Code/huerto', coins: 8 },
    'reino.faro': { key: 'faro', label: 'faro', state: 'working', since: T0 - 60_000, running: 2, life: 50, at: T0 - 20_000 },
    'reino.vieja': { key: 'vieja', label: 'vieja', state: 'ready', since: T0 - 9 * 60_000, running: 0, life: 90, at: T0 - 10 * 60_000 },
  })
  const shown: Array<string | undefined> = []
  on('ui.status', (_, e) => {
    shown.push(e.text)
    return { value: undefined }
  })
  startMocks(on, 'propia')
  await $.session.start({ cwd: '/Users/ana/Code/gremio', surface: 'terminal', isInteractive: true } as never)
  expect(shown.at(-1)).toBe('♥ 68 · ❓ huerto')
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  // La que pregunta primero; la que no late hace 10 min no aparece.
  expect((await ui.find({ key: 'reino' }))?.text).toBe('🏰 Reino ▸ huerto ❓ 2 min · faro ⏳')
  // Arriba de todo, el aviso de la que te pregunta.
  expect(await ui.find({ type: 'Text', text: /^❓ huerto te pide permiso: Bash · 2 min · 🚪 ir$/ })).toBeDefined()
  await ui.press({ key: 'reino' })
  // Abierto: una fila por sesión, la propia marcada con ●, las que te necesitan primero.
  const rows = (await ui.findAll({ type: 'Button' })).filter(b => String(b.key ?? '').startsWith('reino-')).map(b => b.text)
  expect(rows).toHaveLength(3)
  expect(rows[0]).toMatch(/^  ❓ huerto\s+2 min  ♥ 70   🪙 8$/)
  expect(rows[1]).toMatch(/^  💤 ● gremio\s+ahora  ♥ 68/)
  expect(rows[2]).toMatch(/^  ⏳ faro\s+1 min  ♥ 50\s+🧭 2$/)
  // Al tocar una fila: qué te pide y su carpeta.
  await ui.press({ key: 'reino-otra' })
  expect(await ui.find({ type: 'Text', text: /^      te pide permiso: Bash$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^      📁 ~\/Code\/huerto$/ })).toBeDefined()
  await ui.unmount()
})

test('al empezar un turno, Clawd sabe a quién puede retomar con su memoria', async ($, on) => {
  const clock = mock.clock(on, { now: T0 })
  mock.store(on)
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'mem1' }))
  on('agent.list', () => ({ value: [{ id: 'mem1', description: 'buscar el logo', type: 'Explore', status: 'completed' }] }) as never)
  on('turn.complete', (_, e) => ({ text: e.answer }))
  let context: readonly string[] = []
  on('prompt.submit', (_, e) => {
    context = e.context ?? []
    return { text: e.text, context: e.context }
  })
  on('model.complete', () => ({ value: { isAnswered: true, text: 'Logo del sitio', usage: USAGE } }) as never)
  await $.agent.spawn(SPAWN)
  await $.turn.complete({ answer: 'Está en src/theme.ts', durationMs: 900, isAborted: false, turnId: 't1', agentId: 'mem1', reason: 'answer', usage: HAIKU_USAGE })
  await clock.advance(3 * 60_000)
  await $.prompt.submit({ text: 'Ahora cambia el color del logo', origin: { kind: 'composer' } } as never)
  expect(context.at(-1)).toContain('[Gremio] Aventureros en la taberna que puedes retomar con su memoria')
  expect(context.at(-1)).toContain('- Pícaro 1, el Rastreador (haiku · id mem1): «buscar el logo», volvió hace 3 min')
  // El mismo aviso no se repite en el turno siguiente (ya quedó en la conversación).
  await clock.advance(60_000)
  await $.prompt.submit({ text: 'Y el tamaño', origin: { kind: 'composer' } } as never)
  expect(context).toEqual([])
  // Pasada la media hora, ya no se sugiere.
  await clock.advance(40 * 60_000)
  await $.prompt.submit({ text: 'Otra cosa', origin: { kind: 'composer' } } as never)
  expect(context).toEqual([])
})

test('el reino se nombra con los primeros pedidos reales de la conversación', () => {
  const lines = [
    { type: 'user', isMeta: true, message: { content: 'aviso' } },
    { type: 'user', message: { content: [{ type: 'text', text: '<local-command-caveat>…</local-command-caveat>' }] } },
    { type: 'assistant', message: { content: 'hola' } },
    { type: 'user', message: { content: 'ahora, elimina clawdito' } },
    { type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } },
    { type: 'user', message: { content: [{ type: 'text', text: 'Trabajemos sobre Gremio?' }] } },
    { type: 'user', message: { content: 'Lo primero, el tesoro' } },
    { type: 'user', message: { content: 'esto ya no cuenta' } },
  ].map(l => JSON.stringify(l))
  expect(firstUserTexts(lines.join('\n'))).toEqual(['ahora, elimina clawdito', 'Trabajemos sobre Gremio?', 'Lo primero, el tesoro'])
})

test('/gremio nombre le pone nombre a la sesión en el reino', async ($, on) => {
  mock.clock(on, { now: T0 })
  mock.store(on)
  const r = await $.command.run({ command: 'gremio', args: 'nombre X-Ray', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
  expect('text' in r ? String(r.text) : '').toBe('En el reino, esta sesión se llama «X-Ray».')
})

test('la jornada se reparte entre sesiones según lo que gastó cada una', () => {
  const others = [
    { key: 'b', label: 'B', state: 'working' as const, since: 0, running: 0, life: null, at: 0, windowKey: 'w1', cost: 3 },
    { key: 'c', label: 'C', state: 'idle' as const, since: 0, running: 0, life: null, at: 0, windowKey: 'w0', cost: 9, closed: true },
  ]
  // Subió 20 puntos en la ventana w1; esta gastó 1 y la otra 3: le tocan 5.
  expect(coinsOf({ key: 'a', cost: 1, windowKey: 'w1' }, others, [10, 30])).toBe(5)
  // Sola en su ventana, le toca todo; sin gasto o sin lectura, no se sabe.
  expect(coinsOf({ key: 'a', cost: 1, windowKey: 'w0x' }, others, [10, 30])).toBe(20)
  expect(coinsOf({ key: 'a', cost: 0, windowKey: 'w2' }, [], [10, 30])).toBeNull()
  expect(coinsOf({ key: 'a', cost: 1, windowKey: 'w1' }, others, undefined)).toBeNull()
})

test('«Hoy» cuenta las misiones, el botín y lo sin leer; tocarlo abre el primero sin leer', async ($, on) => {
  const clock = mock.clock(on, { now: T0 })
  mock.store(on)
  let n = 0
  on('agent.spawn', () => {
    n += 1
    return { model: 'claude-haiku-5-5', agentId: `h${n}` }
  })
  on('agent.list', () => ({ value: [] }) as never)
  on('turn.complete', (_, e) => ({ text: e.answer }))
  await $.agent.spawn(SPAWN)
  await $.agent.spawn({ ...SPAWN, tool_use_id: 'tu2' })
  await $.agent.spawn({ ...SPAWN, tool_use_id: 'tu3' })
  await $.turn.complete({ answer: 'uno', durationMs: 900, isAborted: false, turnId: 't1', agentId: 'h1', reason: 'answer', usage: HAIKU_USAGE })
  await clock.advance(1000)
  await $.turn.complete({ answer: 'dos', durationMs: 900, isAborted: false, turnId: 't2', agentId: 'h2', reason: 'answer', usage: HAIKU_USAGE })
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect((await ui.find({ key: 'hoy' }))?.text).toBe('  Hoy     3 misiones · 2 con botín · 2 sin leer')
  await ui.press({ key: 'hoy' })
  expect(await ui.find({ type: 'Text', text: /^💰 uno$/ })).toBeDefined()
  expect((await ui.find({ key: 'hoy' }))?.text).toBe('  Hoy     3 misiones · 2 con botín · 1 sin leer')
  await ui.unmount()
})

test('el nombre del reino sale de la raíz de la sesión, no de la carpeta a la que se movió', async ($, on) => {
  mock.clock(on, { now: T0 })
  mock.env(on, { HOME: '/Users/ana' })
  mock.store(on, { 'reino.otra': { key: 'otra', label: 'huerto', state: 'idle', since: T0, running: 0, life: null, at: T0 - 1000 } })
  startMocks(on, 'propia')
  on('session.root', () => ({ value: '/Users/ana/Code/faro' }) as never)
  await $.session.start({ cwd: '/Users/ana/.claude/projects/-Users-ana/memory', surface: 'terminal', isInteractive: true } as never)
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  await ui.press({ key: 'reino' })
  const rows = (await ui.findAll({ type: 'Button' })).filter(b => String(b.key ?? '').startsWith('reino-')).map(b => b.text)
  expect(rows.some(r => /● faro/.test(r))).toBe(true)
  expect(rows.some(r => /memory/.test(r))).toBe(false)
  await ui.unmount()
})

test('la siesta: mientras se resume la conversación Clawd duerme, y despierta con la vida llena', async ($, on) => {
  mock.clock(on, { now: T0 })
  mock.store(on)
  on('session.measure', (_, e) => ({ changed: e.changed }))
  let release: () => void = () => undefined
  on('session.compact', () => new Promise(done => (release = () => done({ messages: [{ role: 'user', text: 'Resumen de la conversación', toolUses: [] }], tokensBefore: 734_000, tokensAfter: 80_000 }))) as never)
  await $.session.measure({ ...measure(10, 5), context: { window: 1_000_000, tokens: 734_000, percent: 73 }, changed: ['context'] })
  const napping = $.session.compact({ trigger: 'auto', messages: [{ role: 'user', text: 'hola', toolUses: [] }] } as never)
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  // El resumen arranca un instante después: se espera a que Clawd se duerma.
  const asleep = { type: 'Text' as const, text: /«😴 durmiendo una siesta…»/ }
  for (let i = 0; i < 50 && !(await ui.find(asleep)); i++) await ui.redraw()
  expect(await ui.find(asleep)).toBeDefined()
  expect((await ui.find({ type: 'Raster', key: 'maestro' }))?.props).toMatchObject({ cells: spriteCells('maestro', 'durmiendo', 0, 'big') })
  release()
  await napping
  await ui.redraw()
  expect(await ui.find({ type: 'Text', text: /🌅 Clawd despertó de su siesta: la vida pasó de 27 % a 92 %/ })).toBeDefined()
  expect((await ui.find({ key: 'vida' }))?.text).toMatch(/ 92$/)
  await ui.unmount()
})

test('ir a la sesión: el reino le pide a Terminal la pestaña de esa sesión', async ($, on) => {
  mock.clock(on, { now: T0 })
  mock.env(on, { HOME: '/Users/ana' })
  mock.store(on, {
    'reino.otra': { key: 'otra', label: 'Recetario', state: 'asking', since: T0 - 60_000, running: 0, life: 70, at: T0 - 5000, ask: 'te hace una pregunta', ttys: ['ttys001', 'ttys004'] },
  })
  const runs: string[][] = []
  on('process.run', (_, e) => {
    runs.push([...e.argv])
    return { value: { exitCode: 0, stdout: e.argv[0] === 'osascript' ? 'ok\n' : '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  startMocks(on, 'propia')
  await $.session.start({ cwd: '/Users/ana/Code/gremio', surface: 'terminal', isInteractive: true } as never)
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  // El aviso de arriba lleva a la sesión que pregunta.
  expect((await ui.find({ key: 'ir-pide-otra' }))?.text).toBe('❓ Recetario te hace una pregunta · 1 min · 🚪 ir')
  await ui.press({ key: 'ir-pide-otra' })
  const osa = runs.find(r => r[0] === 'osascript')
  expect(osa?.[2]).toContain('if ({"/dev/ttys001", "/dev/ttys004"} contains (tty of t)) or ((custom title of t) ends with "Recetario") then')
  // Y desde el reino abierto, en el detalle de su fila.
  await ui.press({ key: 'reino' })
  await ui.press({ key: 'reino-otra' })
  expect(await ui.find({ key: 'ir-otra' })).toBeDefined()
  await ui.unmount()
})

test('el bocadillo: la primera frase del botín, sin Markdown y corta', async ($, on) => {
  expect(firstSentence('## Resultado\n\nEl logo está en **src/theme.ts**, línea 12. Además…')).toBe('El logo está en src/theme.ts, línea 12.')
  expect(firstSentence('Encontré tres archivos que definen colores y ninguno es el del logo principal')).toBe('Encontré tres archivos que definen colo…')
  mock.clock(on, { now: T0 })
  mock.store(on)
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'bo1' }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  await $.agent.spawn(SPAWN)
  await $.turn.complete({ answer: 'Está en src/theme.ts. Lo demás no importa.', durationMs: 900, isAborted: false, turnId: 't1', agentId: 'bo1', reason: 'answer', usage: HAIKU_USAGE })
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  expect(await ui.find({ type: 'Text', text: /^💬 Está en src\/theme\.ts\.$/ })).toBeDefined()
  await ui.unmount()
})

test('el pergamino: el botín completo, con formato, en un panel aparte', async ($, on) => {
  mock.clock(on, { now: T0 })
  mock.store(on)
  on('agent.spawn', () => ({ model: 'claude-sonnet-5-5', agentId: 'pg1' }))
  on('agent.list', () => ({ value: [] }) as never)
  on('turn.complete', (_, e) => ({ text: e.answer }))
  let opened = ''
  on('ui.open', (_, e) => {
    opened = `${e.id}|${e.title}`
    return { value: { isPlaced: true } } as never
  })
  const long = `## Hallazgos\n\n${'Una línea larga del informe. '.repeat(40)}\n\n- uno\n- dos`
  await $.agent.spawn({ ...SPAWN, model: 'sonnet' })
  await $.turn.complete({ answer: long, durationMs: 900, isAborted: false, turnId: 't1', agentId: 'pg1', reason: 'answer', usage: HAIKU_USAGE })
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  await ui.press({ key: 'sel-pg1' })
  await ui.press({ key: 'pergamino' })
  expect(opened).toBe('guild-scroll|📜 Botín de Bardo 1')
  await ui.unmount()
  const scroll = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE, requestId: 'guild-scroll' })
  const md = await scroll.find({ type: 'Markdown' })
  expect((md?.props as { text?: string }).text).toBe(long)
  expect(await scroll.find({ key: 'pergamino-copiar' })).toBeDefined()
  await scroll.unmount()
})

test('el libro reparte el gasto por proyecto, hoy y en la semana', () => {
  const empty = { missions: 0, good: 0, bad: 0, cost: 0, saved: 0, masterCost: 0, codeCost: 0, byClass: {}, fivePoints: 0, weekPoints: 0 }
  let b = addProjectSpend(empty, '2026-10-19', 'Bitácora', 3)
  b = addProjectSpend(b, '2026-10-19', 'X-Ray', 1)
  b = addProjectSpend(b, '2026-10-18', 'Recetario', 4)
  expect(projectShares(b, ['2026-10-19'])).toEqual([
    { project: 'Bitácora', share: 75 },
    { project: 'X-Ray', share: 25 },
  ])
  expect(projectShares(b, ['2026-10-19', '2026-10-18']).map(p => p.project)).toEqual(['Recetario', 'Bitácora', 'X-Ray'])
  // Con muchos proyectos, los chicos se juntan en «otros»; el libro guarda 8 días.
  for (let i = 0; i < 6; i++) b = addProjectSpend(b, '2026-10-19', `p${i}`, 0.1)
  expect(projectShares(b, ['2026-10-19']).at(-1)?.project).toBe('otros')
  for (let d = 1; d <= 9; d++) b = addProjectSpend(b, `2026-10-0${d}`, 'viejo', 1)
  expect(Object.keys(b.projects ?? {})).toHaveLength(8)
})

test('si esta sesión lleva un minuto esperando tu respuesta, avisa por macOS una sola vez', async ($, on) => {
  const clock = mock.clock(on, { now: T0 })
  mock.env(on, { HOME: '/Users/ana' })
  mock.store(on)
  const runs: string[][] = []
  on('process.run', (_, e) => {
    runs.push([...e.argv])
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  // La pregunta queda abierta (nadie la responde).
  on('tool.call', () => new Promise(() => undefined) as never)
  startMocks(on, 'propia')
  await $.session.start({ cwd: '/Users/ana/Code/bitacora', surface: 'terminal', isInteractive: true } as never)
  void $.tool.call({ tool: 'AskUserQuestion', tool_use_id: 'q1', questions: [] } as never)
  await clock.advance(30_000)
  const notes = () => runs.filter(r => r[0] === 'osascript' && String(r[2]).startsWith('display notification'))
  expect(notes()).toHaveLength(0)
  await clock.advance(60_000)
  expect(notes()).toHaveLength(1)
  expect(notes()[0]?.[2]).toBe('display notification "bitacora te hace una pregunta" with title "Gremio · bitacora"')
  await clock.advance(120_000)
  expect(notes()).toHaveLength(1)
})

test('el nombre de la sesión es el título de su pestaña (el último que puso Claude Code)', () => {
  const lines = [
    '{"type":"ai-title","aiTitle":"Eliminación de clawdito","sessionId":"x"}',
    '{"type":"user","message":{"content":"hola"}}',
    '{"type":"ai-title","aiTitle":"Mod \\"gremio\\" y el reino","sessionId":"x"}',
  ].join('\n')
  expect(lastTitle(lines)).toBe('Mod "gremio" y el reino')
  expect(lastTitle(lines + '\n{"type":"custom-title","customTitle":"Gremio"}')).toBe('Gremio')
  expect(lastTitle('{"type":"user"}')).toBeNull()
})

test('lo que suena se ve: la pestaña se marca, macOS avisa y las demás sesiones lo muestran', async ($, on) => {
  const clock = mock.clock(on, { now: T0 })
  mock.env(on, { HOME: '/Users/ana' })
  mock.store(on, {
    'reino.otra': { key: 'otra', label: 'Recetario', state: 'ready', since: T0 - 5000, running: 0, life: 70, at: T0 - 1000, bell: { at: T0 - 5000, icon: '🔔', text: 'Clawd terminó' } },
  })
  const runs: string[][] = []
  on('process.run', (_, e) => {
    runs.push([...e.argv])
    const out = e.argv[0] === 'find' ? '/x/propia.jsonl\n' : e.argv[0] === 'tail' ? '{"type":"ai-title","aiTitle":"Bitácora"}\n' : 'ok\n'
    return { value: { exitCode: 0, stdout: out, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  startMocks(on, 'propia')
  await $.session.start({ cwd: '/Users/ana', surface: 'terminal', isInteractive: true } as never)
  // Lo que sonó en otra sesión aparece arriba, con dónde y quién.
  const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
  for (let i = 0; i < 30 && !(await ui.find({ key: 'ir-sono-otra' })); i++) await ui.redraw()
  expect((await ui.find({ key: 'ir-sono-otra' }))?.text).toBe('🔔 Recetario · Clawd terminó · 5 s · 🚪 ir'.replace('5 s', 'ahora'))
  await ui.unmount()
  // Cuando Clawd termina un turno largo aquí: marca su pestaña y avisa por macOS.
  await $.turn.start({ turnId: 'm1' } as never)
  await clock.advance(30_000)
  await $.turn.complete({ answer: 'listo', durationMs: 30_000, isAborted: false, turnId: 'm1', reason: 'answer', usage: OPUS_USAGE })
  const osa = runs.filter(r => r[0] === 'osascript').map(r => String(r[2]))
  expect(osa.some(t => t.includes('if (custom title of t) ends with "Bitácora" then') && t.includes('set custom title of t to "🔔 Bitácora"'))).toBe(true)
  expect(osa.some(t => t === 'display notification "Clawd terminó" with title "Gremio · Bitácora"')).toBe(true)
})

test('el idioma sigue a Claude Code, luego al sistema y si no, inglés', async () => {
  expect(langFrom('Español')).toBe('es')
  expect(langFrom('spanish')).toBe('es')
  expect(langFrom('English')).toBe('en')
  expect(langFrom('Français', ['es_CL.UTF-8'])).toBe('en')
  expect(langFrom('', ['C.UTF-8', 'es_CL.UTF-8'])).toBe('es')
  expect(langFrom(null, ['en_US.UTF-8'])).toBe('en')
  expect(langFrom(undefined, [undefined, 'POSIX'])).toBe('en')
  expect(langChoice('ES')).toBe('es')
  expect(langChoice('inglés')).toBe('en')
  expect(langChoice('auto')).toBe('auto')
  expect(langChoice('klingon')).toBeNull()
})

test('al cambiar de nombre se trae la historia del almacén viejo, sin los latidos del reino', async () => {
  const chico = { libro: { missions: 2 }, ajustes: { sound: true } }
  const grande = { libro: { missions: 40 }, experiencia: { 'identificar|picaro': [] }, 'reino.x': { key: 'x' }, ajustes: { sound: false } }
  expect(pickImport([chico, grande, null, 'basura'])).toEqual({ libro: { missions: 40 }, experiencia: { 'identificar|picaro': [] }, ajustes: { sound: false } })
  expect(pickImport([])).toEqual({})
  expect(OLD_STORE.test('gremio_inline-0900d49006a7.json')).toBe(true)
  expect(OLD_STORE.test('guild_inline-1.json')).toBe(false)
})

/** Un almacén en memoria que la prueba puede mirar. */
function memoryStore(on: On, initial: Record<string, unknown> = {}): Map<string, unknown> {
  const data = new Map<string, unknown>(Object.entries(initial))
  on('store.get', (_, e) => ({ value: data.get(e.key) }) as never)
  on('store.set', (_, e) => {
    data.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as never
  })
  on('store.delete', (_, e) => {
    data.delete(e.key)
    return { value: undefined } as never
  })
  on('store.keys', () => ({ value: [...data.keys()] }) as never)
  return data
}

/** Arranca una sesión con Claude Code en `language` y anota los comandos que registra. */
async function startIn($: Engine, on: On, language: string): Promise<string[]> {
  const registered: string[] = []
  on('command.register', (_, e) => {
    registered.push((e as unknown as { name: string }).name)
    return { value: undefined } as never
  })
  claudeIn(on, language)
  on('session.usage', () => ({ value: { startedAt: T0, context: { window: 1_000_000, tokens: 320_000, percent: 32 }, rateLimits: [] } }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  on('session.start', (_, e) => e as never)
  on('session.id', () => ({ value: 'propia' }) as never)
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await $.session.start({ cwd: '/Users/ana/Code/recetario', surface: 'terminal', isInteractive: true } as never)
  return registered
}

const textOf = (r: unknown) => (typeof r === 'object' && r !== null && 'text' in r ? String((r as { text: unknown }).text) : '')

test('en inglés: con Claude Code en English el gremio habla inglés', async ($, on) => {
  try {
    mock.clock(on, { now: T0 })
    mock.env(on, { HOME: '/Users/ana' })
    memoryStore(on)
    on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'e1' }))
    on('prompt.compose', () => ({ sections: [{ id: 'intro', text: 'hi', scope: 'shared' }] }))
    on('ui.status', () => ({ value: undefined }))
    const registered = await startIn($, on, 'English')
    // Solo «/guild»: «/gremio» se ofrece a quien habla español.
    expect(registered).toEqual(['guild'])
    // Una misión en inglés también va a un Pícaro (palabras clave en inglés).
    await $.agent.spawn({ ...SPAWN, description: 'find the logo', prompt: 'Find where the logo is defined and tell me the path.', model: undefined } as never)
    const ui = await $.ui.mount({ plugin: 'guild', surface: 'terminal', ...PANE })
    expect((await ui.find({ key: 'sel-e1' }))?.text).toContain('Rogue 1')
    expect(await ui.find({ type: 'Text', text: /sent Rogue 1, the / })).toBeDefined()
    await ui.press({ key: 'sel-e1' })
    await ui.press({ key: 'mas' })
    expect(await ui.find({ type: 'Text', text: /^Lv\. 5/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Effort: low · Permissions: read-only/ })).toBeDefined()
    await ui.unmount()
    // El Código que lee el modelo, también en inglés.
    const p = await $.prompt.compose({ model: 'claude-opus-5-5', promptModel: 'claude-opus-5-5', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [] })
    expect(p.sections.find(s => s.id === 'guild:code')?.text).toContain('# Guild Code')
    const r = await $.command.run({ command: 'guild', args: 'accounts', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
    expect(textOf(r)).toContain('**💰 Guild treasury**')
  } finally {
    setLang('es')
  }
})

test('/guild language cambia el idioma, lo recuerda y «auto» vuelve a seguir a Claude Code', async ($, on) => {
  try {
    mock.clock(on, { now: T0 })
    mock.env(on, { HOME: '/Users/ana' })
    const store = memoryStore(on)
    const registered = await startIn($, on, 'Español')
    expect(registered).toEqual(['guild', 'gremio'])
    const run = (args: string) => $.command.run({ command: 'gremio', args, origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } })
    expect(textOf(await run('language en'))).toBe('The guild now speaks English.')
    expect(store.get('ajustes')).toMatchObject({ language: 'en' })
    expect(textOf(await run('cuentas'))).toContain('**💰 Guild treasury**')
    expect(textOf(await run('idioma es'))).toBe('El gremio ahora habla español.')
    expect(textOf(await run('language auto'))).toBe('El gremio vuelve a seguir el idioma de Claude Code.')
    expect(store.get('ajustes') as Record<string, unknown>).not.toHaveProperty('language')
    expect(textOf(await run('idioma klingon'))).toContain('/guild idioma es')
  } finally {
    setLang('es')
  }
})

test('la primera vez como guild trae el libro y los ajustes del almacén de gremio, una sola vez', async ($, on) => {
  mock.clock(on, { now: T0 })
  mock.env(on, { HOME: '/Users/ana' })
  const store = memoryStore(on)
  const runs: string[][] = []
  on('process.run', (_, e) => {
    runs.push([...e.argv])
    const old = { libro: { missions: 7, good: 6, bad: 1, cost: 1, saved: 0, masterCost: 2, codeCost: 0, byClass: {}, fivePoints: 0, weekPoints: 0 }, ajustes: { sound: false, doctrine: true }, 'reino.x': { key: 'x' } }
    const stdout = e.argv[0] === 'find' ? '/Users/ana/.claude/plugins/store/gremio_inline-1.json\n' : e.argv[0] === 'cat' ? JSON.stringify(old) : ''
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  startMocks(on, 'propia')
  await $.session.start({ cwd: '/Users/ana/Code/recetario', surface: 'terminal', isInteractive: true } as never)
  expect(runs.find(r => r[0] === 'find')?.[1]).toBe('/Users/ana/.claude/plugins/store')
  expect(store.get('libro')).toMatchObject({ missions: 7 })
  expect(store.get('ajustes')).toMatchObject({ sound: false })
  expect(store.get('reino.x')).toBeUndefined()
  expect(store.get('migrado')).toBe(true)
  // La segunda sesión ya no busca.
  const finds = runs.filter(r => r[0] === 'find' && r[1]?.endsWith('/plugins/store')).length
  await $.session.start({ cwd: '/Users/ana/Code/recetario', surface: 'terminal', isInteractive: true } as never)
  expect(runs.filter(r => r[0] === 'find' && r[1]?.endsWith('/plugins/store')).length).toBe(finds)
})

// Genera los sonidos del Operador en sounds/*.wav, sin dependencias.
// Uso: node tools/sonidos.mjs
// Cada programa tiene timbre y ritmo propios, para reconocerlo de oído:
//   maestro    el teléfono que suena, suave (el Arquitecto terminó)
//   archimago  el tiempo bala: un barrido que sube y un destello (Neo)
//   mago       la cucharita contra la taza (el Oráculo)
//   bardo      el auricular: dos pitidos digitales (el Agente)
//   picaro     el zumbido mecánico grave (el Centinela)
//   caido      estática y un tono que cae (falla)

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SR = 22050
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'sounds')

const hz = name => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name)
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]
  const semis = base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12
  return 440 * 2 ** ((semis - 69) / 12)
}

function track(seconds) {
  return new Float32Array(Math.ceil(seconds * SR))
}

function add(buf, at, samples) {
  const start = Math.round(at * SR)
  for (let i = 0; i < samples.length && start + i < buf.length; i++) buf[start + i] += samples[i]
}

// Campana: parciales inarmónicos que se apagan a ritmos distintos.
function bell(freq, dur, amp = 0.5) {
  const n = Math.round(dur * SR)
  const s = new Float32Array(n)
  const parts = [
    [1, 1, 2.2],
    [2.76, 0.5, 3.5],
    [5.4, 0.25, 5],
    [8.93, 0.12, 7],
  ]
  for (let i = 0; i < n; i++) {
    const t = i / SR
    let v = 0
    for (const [r, a, d] of parts) v += a * Math.sin(2 * Math.PI * freq * r * t) * Math.exp(-t * d)
    s[i] = v * amp * Math.min(1, t / 0.003)
  }
  return s
}

// Onda cuadrada corta: la moneda de los juegos.
function square(freq, dur, amp = 0.25) {
  const n = Math.round(dur * SR)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const env = Math.min(1, (dur - t) / 0.02)
    s[i] = (Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1) * amp * env
  }
  return s
}


// Ruido blanco con envolvente.
function noise(dur, amp = 0.3, decay = 6) {
  const n = Math.round(dur * SR)
  const s = new Float32Array(n)
  let seed = 11
  for (let i = 0; i < n; i++) {
    seed = (seed * 16807) % 2147483647
    const t = i / SR
    s[i] = ((seed / 2147483647) * 2 - 1) * amp * Math.exp(-t * decay)
  }
  return s
}

// Seno con barrido de frecuencia (de `from` a `to`).
function sweep(from, to, dur, amp = 0.4) {
  const n = Math.round(dur * SR)
  const s = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const f = from * (to / from) ** (t / dur)
    phase += f / SR
    const env = Math.min(1, t / 0.02) * Math.min(1, (dur - t) / 0.08)
    s[i] = (Math.sin(2 * Math.PI * phase) + 0.3 * Math.sin(4 * Math.PI * phase)) * env * amp
  }
  return s
}

// Timbre de teléfono: dos senos cercanos, temblando a 20 Hz.
function ring(dur, amp = 0.35) {
  const n = Math.round(dur * SR)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const trem = 0.55 + 0.45 * Math.sin(2 * Math.PI * 20 * t)
    const env = Math.min(1, t / 0.03) * Math.min(1, (dur - t) / 0.1)
    s[i] = (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 480 * t)) * 0.5 * trem * env * amp
  }
  return s
}

// Sierra grave con un poco de ruido: una máquina que ronronea.
function thrum(freq, dur, amp = 0.4) {
  const n = Math.round(dur * SR)
  const s = new Float32Array(n)
  let seed = 5
  for (let i = 0; i < n; i++) {
    seed = (seed * 16807) % 2147483647
    const t = i / SR
    const saw = 2 * ((t * freq) % 1) - 1
    const env = Math.min(1, t / 0.05) * Math.exp(-t * 2.5)
    s[i] = (saw * 0.7 + ((seed / 2147483647) * 2 - 1) * 0.3) * env * amp
  }
  return s
}

const sounds = {
  maestro() {
    const b = track(1.2)
    add(b, 0.0, ring(0.45, 0.3))
    add(b, 0.6, ring(0.45, 0.22))
    return b
  },
  archimago() {
    const b = track(1.4)
    add(b, 0.0, sweep(160, 1400, 0.7, 0.35))
    add(b, 0.62, bell(hz('E7'), 0.8, 0.25))
    add(b, 0.62, bell(hz('B6'), 0.7, 0.18))
    return b
  },
  mago() {
    const b = track(1.0)
    add(b, 0.0, bell(hz('E6'), 0.5, 0.4))
    add(b, 0.18, bell(hz('G6'), 0.8, 0.38))
    return b
  },
  bardo() {
    const b = track(0.5)
    add(b, 0.0, square(1760, 0.06, 0.18))
    add(b, 0.12, square(2349, 0.06, 0.18))
    return b
  },
  picaro() {
    const b = track(0.8)
    add(b, 0.0, thrum(62, 0.75, 0.5))
    add(b, 0.0, noise(0.12, 0.2, 25))
    return b
  },
  caido() {
    const b = track(1.1)
    for (let i = 0; i < 6; i++) add(b, i * 0.09, noise(0.05, 0.35, 40))
    add(b, 0.2, sweep(600, 90, 0.8, 0.3))
    return b
  },
}

function wav(samples) {
  let peak = 0
  for (const v of samples) peak = Math.max(peak, Math.abs(v))
  const gain = peak > 0 ? 0.7 / peak : 1
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * gain)) * 32767), i * 2))
  const head = Buffer.alloc(44)
  head.write('RIFF', 0)
  head.writeUInt32LE(36 + data.length, 4)
  head.write('WAVEfmt ', 8)
  head.writeUInt32LE(16, 16)
  head.writeUInt16LE(1, 20)
  head.writeUInt16LE(1, 22)
  head.writeUInt32LE(SR, 24)
  head.writeUInt32LE(SR * 2, 28)
  head.writeUInt16LE(2, 32)
  head.writeUInt16LE(16, 34)
  head.write('data', 36)
  head.writeUInt32LE(data.length, 40)
  return Buffer.concat([head, data])
}

mkdirSync(OUT, { recursive: true })
for (const [name, make] of Object.entries(sounds)) {
  const file = join(OUT, `${name}.wav`)
  writeFileSync(file, wav(make()))
  console.log(file)
}

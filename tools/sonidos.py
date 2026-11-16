#!/usr/bin/env python3
"""Los sonidos del mod: la línea fija, el teléfono que te saca de la Matrix.

Uso: python3 tools/sonidos.py   (necesita numpy; escribe en sounds/)

Todo sintetizado con senos y ruido filtrado (nada de ondas cuadradas ni ruido
blanco crudo), con envolventes lentas, registro medio y un poco de sala.
"""
import sys, os, wave
import numpy as np

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sounds')
SR = 44100
rng = np.random.default_rng(7)


def t(dur):
    return np.arange(round(dur * SR)) / SR


def env(n, attack=0.008, release=0.08):
    e = np.ones(n)
    a, r = min(n, round(attack * SR)), min(n, round(release * SR))
    e[:a] = np.linspace(0, 1, a)
    e[n - r:] *= np.linspace(1, 0, r)
    return e


def tone(freq, dur, amp=0.3, decay=0.0, harm=0.0, attack=0.008, release=0.08):
    x = t(dur)
    s = np.sin(2 * np.pi * freq * x) + harm * np.sin(4 * np.pi * freq * x)
    if decay:
        s *= np.exp(-x * decay)
    return s * env(len(x), attack, release) * amp


def lowpass(s, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    out = np.empty_like(s)
    y = 0.0
    for i, v in enumerate(s):
        y = (1 - a) * v + a * y
        out[i] = y
    return out


def thump(freq, dur=0.09, amp=0.5, cutoff=900):
    """Un golpe sordo: ruido filtrado más un seno grave que cae."""
    x = t(dur)
    body = np.sin(2 * np.pi * freq * x * (1 - 0.3 * x / dur)) * np.exp(-x * 45)
    click = lowpass(rng.uniform(-1, 1, len(x)), cutoff) * np.exp(-x * 90)
    return (body * 0.8 + click * 0.9) * amp


def bell_ring(dur, amp=0.3):
    """Timbre de teléfono antiguo oído desde otra pieza: martillo a 22 golpes por segundo."""
    n = round(dur * SR)
    s = np.zeros(n)
    step = SR // 22
    x = t(0.12)
    hit = (np.sin(2 * np.pi * 660 * x) + 0.6 * np.sin(2 * np.pi * 990 * x) + 0.25 * np.sin(2 * np.pi * 1485 * x)) * np.exp(-x * 30)
    for start in range(0, n, step):
        end = min(n, start + len(hit))
        s[start:end] += hit[: end - start]
    return lowpass(s, 1800) * env(n, 0.01, 0.12) * amp


def mix(length, parts):
    b = np.zeros(round(length * SR))
    for at, s in parts:
        i = round(at * SR)
        end = min(len(b), i + len(s))
        b[i:end] += s[: end - i]
    return b


def room(s, wet=0.22):
    """Sala chica: cuatro ecos cortos que se apagan."""
    out = s.copy()
    for delay, gain in ((0.031, 0.5), (0.047, 0.4), (0.071, 0.3), (0.113, 0.2)):
        d = round(delay * SR)
        out[d:] += s[:-d] * gain * wet
    return out


def dial(a, b, dur, amp=0.22):
    return tone(a, dur, amp, attack=0.012, release=0.05) + tone(b, dur, amp, attack=0.012, release=0.05)


# Timbre antiguo cuando termina el Arquitecto, auricular para el Centinela, tonos de
# marcado para Agente y Oráculo, la línea que conecta para Neo y un tono neutro si algo falla.
SOUNDS = {
    'maestro': (1.5, [(0.0, bell_ring(0.42, 0.3)), (0.62, bell_ring(0.42, 0.26))]),
    'picaro': (0.4, [(0.0, thump(170, 0.08, 0.5)), (0.11, thump(130, 0.09, 0.4))]),
    'bardo': (0.7, [(0.0, dial(350, 440, 0.13)), (0.2, dial(392, 494, 0.16))]),
    'mago': (0.9, [(0.0, dial(350, 440, 0.12)), (0.17, dial(392, 494, 0.12)), (0.34, dial(440, 554, 0.22))]),
    'archimago': (1.4, [(0.0, tone(350, 0.9, 0.16, attack=0.3, release=0.3)), (0.0, tone(440, 0.9, 0.16, attack=0.3, release=0.3)),
                        (0.25, tone(525, 0.75, 0.14, attack=0.3, release=0.3)), (0.95, thump(160, 0.08, 0.45))]),
    'caido': (0.9, [(0.0, dial(300, 378, 0.16, 0.2)), (0.3, dial(300, 378, 0.16, 0.16))]),
}

PEAK = 0.3
os.makedirs(OUT, exist_ok=True)
for sound, (length, parts) in SOUNDS.items():
    s = room(mix(length, parts))
    fade = round(0.15 * SR)
    s[-fade:] *= np.linspace(1, 0, fade)
    s = s / max(1e-9, np.abs(s).max()) * PEAK
    with wave.open(os.path.join(OUT, sound + '.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((s * 32767).astype('<i2').tobytes())
    print(sound, f'{length} s')

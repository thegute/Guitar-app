// A small synthesized drum kit and grooves for jamming. Everything is generated, no samples.
import { audio, out } from './engine'

type Voice = 'kick' | 'snare' | 'hat' | 'open' | 'rim' | 'ride' | 'ghost' | 'clap'
/** One bar of 4/4: [beat position, voice, level 0..1] */
type Hit = [number, Voice, number]

let noise: AudioBuffer | null = null
function noiseBuf(ctx: AudioContext) {
  if (!noise || noise.sampleRate !== ctx.sampleRate) {
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noise
}

function env(ctx: AudioContext, g: GainNode, when: number, peak: number, decay: number) {
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + 0.002)
  g.gain.exponentialRampToValueAtTime(0.0001, when + decay)
}

function noiseHit(ctx: AudioContext, dest: AudioNode, when: number, type: BiquadFilterType, freq: number, q: number, peak: number, decay: number) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf(ctx)
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = ctx.createGain()
  src.connect(f).connect(g).connect(dest)
  env(ctx, g, when, peak, decay)
  src.start(when, Math.random() * 0.5)
  src.stop(when + decay + 0.05)
}

function tone(ctx: AudioContext, dest: AudioNode, when: number, f0: number, f1: number, sweep: number, peak: number, decay: number, type: OscillatorType = 'sine') {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f0, when)
  o.frequency.exponentialRampToValueAtTime(f1, when + sweep)
  const g = ctx.createGain()
  o.connect(g).connect(dest)
  env(ctx, g, when, peak, decay)
  o.start(when)
  o.stop(when + decay + 0.05)
}

export function playDrum(voice: Voice, when: number, level = 1, dest?: AudioNode) {
  const ctx = audio()
  const d = dest ?? out()
  switch (voice) {
    case 'kick':
      tone(ctx, d, when, 150, 42, 0.11, 1.0 * level, 0.42)
      tone(ctx, d, when, 1200, 300, 0.01, 0.12 * level, 0.02, 'triangle') // beater click
      break
    case 'snare':
      noiseHit(ctx, d, when, 'highpass', 1400, 0.7, 0.55 * level, 0.2)
      tone(ctx, d, when, 230, 170, 0.05, 0.35 * level, 0.12, 'triangle')
      break
    case 'ghost':
      noiseHit(ctx, d, when, 'highpass', 1800, 0.7, 0.14 * level, 0.08)
      break
    case 'clap':
      for (let k = 0; k < 3; k++) noiseHit(ctx, d, when + k * 0.011, 'bandpass', 1500, 1.2, 0.4 * level, 0.09 + k * 0.03)
      break
    case 'hat':
      noiseHit(ctx, d, when, 'highpass', 8000, 0.9, 0.22 * level, 0.045)
      break
    case 'open':
      noiseHit(ctx, d, when, 'highpass', 7000, 0.9, 0.2 * level, 0.28)
      break
    case 'ride':
      noiseHit(ctx, d, when, 'bandpass', 6000, 1.4, 0.16 * level, 0.5)
      tone(ctx, d, when, 3200, 3100, 0.2, 0.025 * level, 0.45, 'square')
      break
    case 'rim':
      noiseHit(ctx, d, when, 'bandpass', 1900, 5, 0.6 * level, 0.035)
      tone(ctx, d, when, 820, 780, 0.03, 0.18 * level, 0.04, 'triangle')
      break
  }
}

const e8 = (v: Voice, lvl = 0.7): Hit[] => [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(b => [b, v, b % 1 === 0 ? lvl : lvl * 0.7])
const e16 = (v: Voice, lvl = 0.5): Hit[] => Array.from({ length: 16 }, (_, i) => [i / 4, v, i % 4 === 0 ? lvl : i % 2 === 0 ? lvl * 0.75 : lvl * 0.5] as Hit)
const sw = (v: Voice, lvl = 0.6): Hit[] => [0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3].map((b, i) => [b, v, i % 2 ? lvl * 0.6 : lvl])

export const GROOVES: { id: string; label: string; hits: Hit[] }[] = [
  { id: 'rock', label: 'Rock', hits: [[0, 'kick', 1], [2, 'kick', 1], [2.5, 'kick', 0.7], [1, 'snare', 1], [3, 'snare', 1], ...e8('hat')] },
  { id: 'pop', label: 'Pop', hits: [[0, 'kick', 1], [1.5, 'kick', 0.8], [2, 'kick', 0.9], [1, 'snare', 1], [3, 'snare', 1], ...e8('hat', 0.6)] },
  { id: 'halftime', label: 'Half-time ballad', hits: [[0, 'kick', 1], [1.75, 'kick', 0.6], [2, 'snare', 1], [2.5, 'kick', 0.7], ...e8('hat', 0.5)] },
  { id: 'disco', label: 'Four on the floor', hits: [[0, 'kick', 1], [1, 'kick', 1], [2, 'kick', 1], [3, 'kick', 1], [1, 'clap', 0.9], [3, 'clap', 0.9], [0.5, 'open', 0.7], [1.5, 'open', 0.7], [2.5, 'open', 0.7], [3.5, 'open', 0.7]] },
  { id: 'punk', label: 'Punk', hits: [[0, 'kick', 1], [0.5, 'kick', 0.8], [1, 'snare', 1], [2, 'kick', 1], [2.5, 'kick', 0.8], [3, 'snare', 1], ...e8('hat', 0.8)] },
  { id: 'metal', label: 'Metal double kick', hits: [...e16('kick', 0.75), [1, 'snare', 1], [3, 'snare', 1], [0, 'ride', 0.8], [1, 'ride', 0.6], [2, 'ride', 0.8], [3, 'ride', 0.6]] },
  { id: 'shuffle', label: 'Blues shuffle', hits: [[0, 'kick', 1], [2, 'kick', 0.9], [1, 'snare', 1], [3, 'snare', 1], ...sw('hat', 0.6)] },
  { id: 'swing', label: 'Jazz swing', hits: [[0, 'ride', 0.8], [1, 'ride', 0.8], [5 / 3, 'ride', 0.5], [2, 'ride', 0.8], [3, 'ride', 0.8], [11 / 3, 'ride', 0.5], [1, 'hat', 0.5], [3, 'hat', 0.5], [0, 'kick', 0.25], [2, 'kick', 0.25], [8 / 3, 'ghost', 0.6]] },
  { id: 'bossa', label: 'Bossa nova', hits: [[0, 'kick', 0.8], [1.5, 'kick', 0.6], [2, 'kick', 0.8], [3.5, 'kick', 0.6], [0, 'rim', 0.8], [0.75, 'rim', 0.8], [1.5, 'rim', 0.8], [2.5, 'rim', 0.8], [3, 'rim', 0.8], ...e8('hat', 0.35)] },
  { id: 'funk', label: 'Funk', hits: [[0, 'kick', 1], [0.75, 'kick', 0.7], [2.5, 'kick', 0.9], [1, 'snare', 1], [3, 'snare', 1], [1.75, 'ghost', 1], [2.25, 'ghost', 1], [3.75, 'ghost', 1], ...e16('hat', 0.45)] },
  { id: 'hiphop', label: 'Lo-fi hip-hop', hits: [[0, 'kick', 1], [1.6, 'kick', 0.6], [2.5, 'kick', 0.85], [1, 'snare', 0.9], [3, 'snare', 0.9], [0, 'hat', 0.5], [0.58, 'hat', 0.35], [1, 'hat', 0.5], [1.58, 'hat', 0.35], [2, 'hat', 0.5], [2.58, 'hat', 0.35], [3, 'hat', 0.5], [3.58, 'hat', 0.35]] },
  { id: 'reggae', label: 'Reggae one drop', hits: [[2, 'kick', 1], [2, 'rim', 1], ...sw('hat', 0.4)] },
  { id: 'train', label: 'Country train beat', hits: [[0, 'kick', 1], [2, 'kick', 1], ...e16('ghost', 1).map(([b, , l]) => [b, 'ghost', l] as Hit), [1, 'snare', 0.8], [3, 'snare', 0.8]] },
]

/** Schedule one bar of a groove starting at `when`. Hits are clipped to `beats` (for half bars). */
export function playGrooveBar(id: string, when: number, spb: number, level: number, dest?: AudioNode, beats = 4, fromBeat = 0) {
  const g = GROOVES.find(x => x.id === id)
  if (!g) return
  for (const [b, v, l] of g.hits) {
    if (b < fromBeat || b >= fromBeat + beats) continue
    playDrum(v, when + (b - fromBeat) * spb, l * level, dest)
  }
}

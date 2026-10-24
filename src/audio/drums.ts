// Drums for jamming: a recorded acoustic kit (AVL Drumkits by Glen MacArthur, CC BY-SA 3.0: Pearl and Ludwig drums,
// Sabian and Zildjian cymbals, 2-5 velocity layers each) with grooves, fills and crashes. A small synthesized kit plays
// until the recordings have loaded (and if they can't load).
import { audio, out } from './engine'

export type Voice = 'kick' | 'snare' | 'hat' | 'open' | 'rim' | 'ride' | 'ghost' | 'clap' | 'pedal' | 'bell' | 'crash'
  | 'tom1' | 'tom2' | 'tom3' | 'tamb' | 'cowbell' | 'shaker' | 'roto1' | 'roto2' | 'roto3'
/** One bar of 4/4: [beat position, voice, level 0..1] */
export type Hit = [number, Voice, number]
/** Which recorded drum plays the kick, snare and ride for a groove. */
interface Kit { kick: 'kick' | 'kickbig' | 'kickmetal'; snare: 'snare' | 'snaretight'; ride: 'ride' | 'ridejazz' }
const KIT: Kit = { kick: 'kick', snare: 'snare', ride: 'ride' }
type Fill = 'rock' | 'metal' | 'reggae' | 'jazz' | 'funk' | 'none'

// ---------- synthesized fallback ----------
let noise: AudioBuffer | null = null
function noiseBuf(ctx: AudioContext) {
  if (!noise || noise.sampleRate !== ctx.sampleRate) {
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noise
}

function env(g: GainNode, when: number, peak: number, decay: number) {
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
  env(g, when, peak, decay)
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
  env(g, when, peak, decay)
  o.start(when)
  o.stop(when + decay + 0.05)
}

function synthDrum(voice: Voice, when: number, level: number, d: AudioNode) {
  const ctx = audio()
  switch (voice) {
    case 'kick':
      tone(ctx, d, when, 150, 42, 0.11, 1.0 * level, 0.42)
      tone(ctx, d, when, 1200, 300, 0.01, 0.12 * level, 0.02, 'triangle')
      break
    case 'snare': case 'clap':
      noiseHit(ctx, d, when, 'highpass', 1400, 0.7, 0.55 * level, 0.2)
      tone(ctx, d, when, 230, 170, 0.05, 0.35 * level, 0.12, 'triangle')
      break
    case 'ghost':
      noiseHit(ctx, d, when, 'highpass', 1800, 0.7, 0.14 * level, 0.08)
      break
    case 'hat': case 'pedal': case 'shaker': case 'tamb':
      noiseHit(ctx, d, when, 'highpass', 8000, 0.9, 0.22 * level, 0.045)
      break
    case 'open': case 'crash':
      noiseHit(ctx, d, when, 'highpass', 7000, 0.9, 0.2 * level, voice === 'crash' ? 0.9 : 0.28)
      break
    case 'ride': case 'bell':
      noiseHit(ctx, d, when, 'bandpass', 6000, 1.4, 0.16 * level, 0.5)
      tone(ctx, d, when, 3200, 3100, 0.2, 0.025 * level, 0.45, 'square')
      break
    case 'rim': case 'cowbell':
      noiseHit(ctx, d, when, 'bandpass', 1900, 5, 0.6 * level, 0.035)
      tone(ctx, d, when, 820, 780, 0.03, 0.18 * level, 0.04, 'triangle')
      break
    default: { // toms
      const f = { tom1: 220, tom2: 165, tom3: 110, roto1: 330, roto2: 260, roto3: 200 }[voice as string] ?? 160
      tone(ctx, d, when, f * 1.4, f, 0.08, 0.7 * level, 0.35)
    }
  }
}

// ---------- the recorded kit ----------
interface Layer { buf: AudioBuffer; off: number }
let kit: Map<string, Layer[]> | null = null
let kitLoading: Promise<void> | null = null

/** Load the recorded kit (about 700 KB). Until it's ready the synth kit plays. */
export function loadKit(): Promise<void> {
  if (kit) return Promise.resolve()
  kitLoading ??= (async () => {
    const ctx = audio()
    const index = (await (await fetch('samples/drums/index.json')).json()) as Record<string, string[]>
    const m = new Map<string, Layer[]>()
    await Promise.all(Object.entries(index).map(async ([piece, files]) => {
      const layers = await Promise.all(files.map(async f => {
        const buf = await ctx.decodeAudioData(await (await fetch(`samples/drums/${f}`)).arrayBuffer())
        // skip any decoder padding in front of the hit
        const d = buf.getChannelData(0)
        const lim = Math.min(d.length, Math.floor(buf.sampleRate * 0.1))
        let pk = 0
        for (let i = 0; i < lim; i++) pk = Math.max(pk, Math.abs(d[i]))
        let i = 0
        while (i < lim && Math.abs(d[i]) < pk * 0.05) i++
        return { buf, off: Math.max(0, i - 24) / buf.sampleRate }
      }))
      m.set(piece, layers)
    }))
    kit = m
  })().catch(() => { kitLoading = null })
  return kitLoading
}
export const kitLoaded = () => !!kit

/** How loud each drum sits in the mix. */
const VOICE_GAIN: Partial<Record<Voice, number>> = {
  kick: 1.0, snare: 0.85, ghost: 0.85, hat: 0.7, pedal: 0.6, open: 0.6, rim: 0.75, ride: 0.6, bell: 0.55, crash: 0.55,
  tom1: 0.8, tom2: 0.8, tom3: 0.85, clap: 0.7, tamb: 0.45, cowbell: 0.45, shaker: 0.5, roto1: 0.7, roto2: 0.7, roto3: 0.75,
}
let openHat: { g: GainNode; t: number } | null = null

export function playDrum(voice: Voice, when: number, level = 1, dest?: AudioNode, kitChoice: Partial<Kit> = {}, mix = 1) {
  const d = dest ?? out()
  if (!kit) {
    void loadKit()
    synthDrum(voice, when, level * 0.6 * mix, d)
    return
  }
  const k = { ...KIT, ...kitChoice }
  const piece = voice === 'kick' ? k.kick : voice === 'snare' || voice === 'ghost' ? k.snare : voice === 'ride' ? k.ride : voice
  const layers = kit.get(piece)
  if (!layers?.length) { synthDrum(voice, when, level, d); return }
  const lv = Math.max(0.05, Math.min(1, voice === 'ghost' ? level * 0.35 : level))
  // velocity picks the layer (soft to loud), with a neighbour now and then so repeats don't sound machine-gunned
  let li = Math.round(lv * (layers.length - 1))
  if (layers.length > 2 && Math.random() < 0.3) li = Math.max(0, Math.min(layers.length - 1, li + (Math.random() < 0.5 ? -1 : 1)))
  const L = layers[li]
  const ctx = audio()
  const src = ctx.createBufferSource()
  src.buffer = L.buf
  // tiny pitch and level differences between hits, like a real drummer
  src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.016
  const g = ctx.createGain()
  g.gain.value = (VOICE_GAIN[voice] ?? 0.7) * Math.pow(lv, 0.9) * (0.94 + Math.random() * 0.12) * mix
  src.connect(g).connect(d)
  const t = Math.max(when, ctx.currentTime)
  src.start(t, L.off)
  // a closed hi-hat (stick or pedal) chokes the open one
  if (voice === 'open') openHat = { g, t }
  else if ((voice === 'hat' || voice === 'pedal') && openHat && openHat.t < t) {
    try { openHat.g.gain.setTargetAtTime(0, t, 0.012) } catch { /* noop */ }
    openHat = null
  }
}

const e8 = (v: Voice, lvl = 0.7): Hit[] => [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(b => [b, v, b % 1 === 0 ? lvl : lvl * 0.7])
const e16 = (v: Voice, lvl = 0.5): Hit[] => Array.from({ length: 16 }, (_, i) => [i / 4, v, i % 4 === 0 ? lvl : i % 2 === 0 ? lvl * 0.75 : lvl * 0.5] as Hit)
const sw = (v: Voice, lvl = 0.6): Hit[] => [0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3].map((b, i) => [b, v, i % 2 ? lvl * 0.6 : lvl])
const q = (v: Voice, lvl = 0.8, accent = 1): Hit[] => [0, 1, 2, 3].map(b => [b, v, b === 0 ? lvl * accent : lvl])

export interface Groove { id: string; label: string; hits: Hit[]; kit?: Partial<Kit>; fill: Fill; crash?: boolean; tight?: boolean; /** mix level (busy grooves sit lower) */ level?: number }
export const GROOVES: Groove[] = [
  { id: 'rock', label: 'Rock', fill: 'rock', crash: true, hits: [[0, 'kick', 1], [2, 'kick', 1], [2.5, 'kick', 0.7], [1, 'snare', 1], [3, 'snare', 1], ...e8('hat')] },
  { id: 'pop', label: 'Pop', fill: 'rock', crash: true, kit: { snare: 'snaretight' }, hits: [[0, 'kick', 1], [1.5, 'kick', 0.8], [2, 'kick', 0.9], [1, 'snare', 1], [3, 'snare', 1], ...e8('hat', 0.6)] },
  { id: 'halftime', label: 'Half-time ballad', fill: 'rock', crash: true, kit: { kick: 'kickbig' }, hits: [[0, 'kick', 1], [1.75, 'kick', 0.6], [2, 'snare', 1], [2.5, 'kick', 0.7], ...e8('hat', 0.5)] },
  { id: 'disco', label: 'Four on the floor', fill: 'funk', crash: true, kit: { snare: 'snaretight' }, hits: [[0, 'kick', 1], [1, 'kick', 1], [2, 'kick', 1], [3, 'kick', 1], [1, 'clap', 0.8], [1, 'snare', 0.7], [3, 'clap', 0.8], [3, 'snare', 0.7], [0, 'hat', 0.5], [1, 'hat', 0.5], [2, 'hat', 0.5], [3, 'hat', 0.5], [0.5, 'open', 0.7], [1.5, 'open', 0.7], [2.5, 'open', 0.7], [3.5, 'open', 0.7]] },
  { id: 'punk', label: 'Punk', fill: 'rock', crash: true, hits: [[0, 'kick', 1], [0.5, 'kick', 0.8], [1, 'snare', 1], [2, 'kick', 1], [2.5, 'kick', 0.8], [3, 'snare', 1], ...e8('hat', 0.8)] },
  { id: 'metal', level: 0.55, label: 'Metal double kick', fill: 'metal', crash: true, tight: true, kit: { kick: 'kickmetal' }, hits: [...e16('kick', 0.85).map(([b, v, l]) => [b, v, 0.7 + l * 0.3] as Hit), [1, 'snare', 1], [3, 'snare', 1], [0, 'crash', 0.75], [1, 'bell', 0.7], [2, 'bell', 0.75], [3, 'bell', 0.7]] },
  { id: 'gallop', level: 0.6, label: 'Metal gallop', fill: 'metal', crash: true, tight: true, kit: { kick: 'kickmetal' }, hits: [...[0, 1, 2, 3].flatMap(b => [[b, 'kick', 0.95], [b + 0.5, 'kick', 0.8], [b + 0.75, 'kick', 0.8]] as Hit[]), [1, 'snare', 1], [3, 'snare', 1], ...q('ride', 0.75, 1.1)] },
  { id: 'thrash', level: 0.6, label: 'Thrash (skank beat)', fill: 'metal', crash: true, tight: true, kit: { kick: 'kickmetal' }, hits: [...[0, 1, 2, 3].flatMap(b => [[b, 'kick', 0.95], [b + 0.5, 'snare', 0.9]] as Hit[]), [0, 'crash', 0.8], [1, 'ride', 0.7], [2, 'crash', 0.6], [3, 'ride', 0.7]] },
  { id: 'breakdown', level: 0.65, label: 'Metal breakdown (half-time)', fill: 'metal', crash: true, tight: true, kit: { kick: 'kickmetal' }, hits: [[0, 'kick', 1], [0.5, 'kick', 0.9], [0.75, 'kick', 0.9], [1.5, 'kick', 0.9], [2, 'snare', 1], [2.75, 'kick', 0.9], [3.25, 'kick', 0.85], [3.5, 'kick', 0.9], ...q('crash', 0.55, 1.2)] },
  { id: 'shuffle', label: 'Blues shuffle', fill: 'jazz', crash: true, hits: [[0, 'kick', 1], [2, 'kick', 0.9], [1, 'snare', 1], [3, 'snare', 1], ...sw('hat', 0.6)] },
  { id: 'swing', level: 1.6, label: 'Jazz swing', fill: 'jazz', kit: { ride: 'ridejazz' }, hits: [[0, 'ride', 0.8], [1, 'ride', 0.8], [5 / 3, 'ride', 0.5], [2, 'ride', 0.8], [3, 'ride', 0.8], [11 / 3, 'ride', 0.5], [1, 'pedal', 0.6], [3, 'pedal', 0.6], [0, 'kick', 0.25], [2, 'kick', 0.25], [8 / 3, 'ghost', 0.6]] },
  { id: 'bossa', level: 1.3, label: 'Bossa nova', fill: 'none', hits: [[0, 'kick', 0.8], [1.5, 'kick', 0.6], [2, 'kick', 0.8], [3.5, 'kick', 0.6], [0, 'rim', 0.8], [0.75, 'rim', 0.8], [1.5, 'rim', 0.8], [2.5, 'rim', 0.8], [3, 'rim', 0.8], ...e8('shaker', 0.55)] },
  { id: 'funk', label: 'Funk', fill: 'funk', crash: true, kit: { snare: 'snaretight' }, hits: [[0, 'kick', 1], [0.75, 'kick', 0.7], [2.5, 'kick', 0.9], [1, 'snare', 1], [3, 'snare', 1], [1.75, 'ghost', 1], [2.25, 'ghost', 1], [3.75, 'ghost', 1], ...e16('hat', 0.45), [3.5, 'open', 0.5]] },
  { id: 'hiphop', level: 1.1, label: 'Lo-fi hip-hop', fill: 'none', kit: { kick: 'kickbig', snare: 'snaretight' }, hits: [[0, 'kick', 1], [1.6, 'kick', 0.6], [2.5, 'kick', 0.85], [1, 'snare', 0.9], [3, 'snare', 0.9], [0, 'hat', 0.5], [0.58, 'hat', 0.35], [1, 'hat', 0.5], [1.58, 'hat', 0.35], [2, 'hat', 0.5], [2.58, 'hat', 0.35], [3, 'hat', 0.5], [3.58, 'hat', 0.35]] },
  { id: 'reggae', level: 1.5, label: 'Reggae one drop', fill: 'reggae', kit: { kick: 'kickbig' }, hits: [[2, 'kick', 1], [2, 'rim', 1], ...sw('hat', 0.4), [3 + 2 / 3, 'open', 0.35]] },
  { id: 'rockers', level: 1.25, label: 'Reggae rockers', fill: 'reggae', kit: { kick: 'kickbig' }, hits: [...q('kick', 0.9), [1, 'rim', 1], [3, 'rim', 1], ...sw('hat', 0.45)] },
  { id: 'steppers', level: 1.2, label: 'Reggae steppers', fill: 'reggae', kit: { kick: 'kickbig' }, hits: [...q('kick', 0.95), [2, 'rim', 1], ...e16('hat', 0.4)] },
  { id: 'train', label: 'Country train beat', fill: 'rock', hits: [[0, 'kick', 1], [2, 'kick', 1], ...e16('ghost', 1), [1, 'snare', 0.8], [3, 'snare', 0.8]] },
]
const grooveOf = (id: string) => GROOVES.find(x => x.id === id)

/** The last beat of a phrase: a fill that leads into the next bar. */
const FILLS: Record<Fill, Hit[]> = {
  rock: [[3, 'tom1', 0.85], [3.25, 'tom1', 0.75], [3.5, 'tom2', 0.85], [3.75, 'tom3', 0.95], [3, 'kick', 0.8]],
  metal: [[3, 'snare', 0.9], [3.25, 'tom1', 0.85], [3.5, 'tom2', 0.9], [3.75, 'tom3', 1], ...[0, 0.25, 0.5, 0.75].map(x => [3 + x, 'kick', 0.85] as Hit)],
  reggae: [[3, 'roto1', 0.8], [3.25, 'roto1', 0.65], [3.5, 'roto2', 0.8], [3.75, 'roto3', 0.9], [2 + 2 / 3, 'roto2', 0.5]],
  jazz: [[3, 'snare', 0.55], [3 + 1 / 3, 'snare', 0.4], [3 + 2 / 3, 'snare', 0.7], [3, 'ride', 0.6]],
  funk: [[3, 'snare', 0.9], [3.25, 'ghost', 0.8], [3.5, 'snare', 0.9], [3.75, 'tom1', 0.8], [3, 'kick', 0.8], [3.5, 'open', 0.5]],
  none: [],
}

export interface BarOpts { fill?: boolean; crash?: boolean }

/** Schedule one bar of a groove starting at `when`. Hits are clipped to `beats` (for half bars). */
export function playGrooveBar(id: string, when: number, spb: number, level: number, dest?: AudioNode, beats = 4, fromBeat = 0, opts: BarOpts = {}) {
  const g = grooveOf(id)
  if (!g) return
  let hits = g.hits
  if (opts.fill && g.fill !== 'none' && beats >= 4) {
    // the fill replaces the last beat (the jazz ride keeps going under it)
    hits = [...(g.fill === 'jazz' ? hits : hits.filter(([b]) => b < 3)), ...FILLS[g.fill]]
  }
  if (opts.crash && g.crash) {
    hits = [...hits.filter(([b, v]) => !(b === 0 && (v === 'hat' || v === 'ride' || v === 'bell' || v === 'open' || v === 'crash'))), [0, 'crash', 0.9]]
  }
  const jitter = g.tight ? 0.0012 : 0.004
  for (const [b, v, l] of hits) {
    if (b < fromBeat || b >= fromBeat + beats) continue
    const human = b === 0 ? 0 : (Math.random() - 0.5) * jitter
    playDrum(v, when + (b - fromBeat) * spb + human, l * level, dest, g.kit, g.level ?? 1)
  }
}


// Drums for jamming. Kits: a recorded acoustic kit (AVL Drumkits by Glen MacArthur, CC BY-SA 3.0: Pearl and Ludwig
// drums, Sabian and Zildjian cymbals, 2-5 velocity layers each) in four set-ups, the same recordings run through a
// 60s/70s or a dusty lo-fi chain, and two drum machines synthesized here in the style of the classic 808 and 909.
// Hand percussion (congas, bongos, cajón, claves, guiro, brushes, finger snaps) is synthesized too. Grooves pick a
// kit; Jam can swap it. A small live-synthesized kit plays until a kit is ready (and if the recordings can't load).
import { audio, out } from './engine'

export type Voice = 'kick' | 'snare' | 'hat' | 'open' | 'rim' | 'ride' | 'ghost' | 'clap' | 'pedal' | 'bell' | 'crash'
  | 'tom1' | 'tom2' | 'tom3' | 'tamb' | 'cowbell' | 'shaker' | 'roto1' | 'roto2' | 'roto3'
  | 'conga' | 'congalo' | 'bongo' | 'bongolo' | 'cajon' | 'cajonslap' | 'clave' | 'guiro' | 'snap' | 'brush' | 'brushtap' | 'agogo'
/** One bar of 4/4: [beat position, voice, level 0..1] */
export type Hit = [number, Voice, number]
/** Which recording plays the kick, snare and ride in a recorded kit. */
export interface Pieces { kick: 'kick' | 'kickbig' | 'kickmetal'; snare: 'snare' | 'snaretight'; ride: 'ride' | 'ridejazz' }
const PIECES: Pieces = { kick: 'kick', snare: 'snare', ride: 'ride' }
type Fill = 'rock' | 'metal' | 'reggae' | 'jazz' | 'funk' | 'latin' | 'machine' | 'none'

export type KitId = 'studio' | 'rock' | 'metal' | 'jazz' | 'vintage' | 'lofi' | '808' | '909'
export const KITS: { id: KitId; label: string; hint: string; synth?: boolean; process?: 'vintage' | 'lofi'; pieces?: Partial<Pieces> }[] = [
  { id: 'studio', label: 'Studio kit', hint: 'A recorded acoustic kit: Pearl drums, Sabian cymbals.' },
  { id: 'rock', label: 'Big rock kit', hint: 'The 26-inch Ludwig kick and an open snare: big and roomy.', pieces: { kick: 'kickbig' } },
  { id: 'metal', label: 'Metal kit', hint: 'A tight, clicky kick for fast double bass and a cracking snare.', pieces: { kick: 'kickmetal', snare: 'snaretight' } },
  { id: 'jazz', label: 'Jazz kit', hint: 'A dark 24-inch ride and a soft kick.', pieces: { ride: 'ridejazz' } },
  { id: 'vintage', label: '60s / 70s kit', hint: 'Warm and a bit muffled, like an old soul or reggae record.', process: 'vintage', pieces: { kick: 'kickbig' } },
  { id: 'lofi', label: 'Lo-fi (dusty)', hint: 'Crunchy, dull and gritty, like a sampled old record.', process: 'lofi', pieces: { snare: 'snaretight' } },
  { id: '808', label: '808 drum machine', hint: 'The booming kick, snappy clap and crisp hats of hip-hop and trap.', synth: true },
  { id: '909', label: '909 drum machine', hint: 'Punchy house and techno drums.', synth: true },
]
export const kitInfo = (id: string) => KITS.find(k => k.id === id) ?? KITS[0]
/** A kit, with recorded pieces swapped if asked. */
export interface KitSel { kit?: KitId; pieces?: Partial<Pieces> }

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
  if (PERC.has(voice)) { percLive(ctx, voice, when, level, d); return }
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

// ---------- percussion and drum machines, synthesized ----------
const PERC = new Set<Voice>(['conga', 'congalo', 'bongo', 'bongolo', 'cajon', 'cajonslap', 'clave', 'guiro', 'snap', 'brush', 'brushtap', 'agogo'])

/** Build one drum sound on a (usually offline) audio context. */
type Ctx = BaseAudioContext
function osc(ctx: Ctx, d: AudioNode, t: number, type: OscillatorType, f0: number, f1: number, sweep: number, peak: number, decay: number, attack = 0.001) {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f0, t)
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + sweep)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  o.connect(g).connect(d)
  o.start(t)
  o.stop(t + attack + decay + 0.05)
}
function nz(ctx: Ctx, d: AudioNode, t: number, filters: [BiquadFilterType, number, number][], peak: number, decay: number, attack = 0.001) {
  const src = ctx.createBufferSource()
  const len = Math.ceil(ctx.sampleRate * (attack + decay + 0.1))
  const b = ctx.createBuffer(1, len, ctx.sampleRate)
  const x = b.getChannelData(0)
  for (let i = 0; i < len; i++) x[i] = Math.random() * 2 - 1
  src.buffer = b
  let node: AudioNode = src
  for (const [type, f, q] of filters) { const bq = ctx.createBiquadFilter(); bq.type = type; bq.frequency.value = f; bq.Q.value = q; node.connect(bq); node = bq }
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  node.connect(g).connect(d)
  src.start(t)
}
/** The metallic hi-hat tone of analog drum machines: six square waves at clashing pitches. */
function metal(ctx: Ctx, d: AudioNode, t: number, peak: number, decay: number, hp = 7000) {
  const sum = ctx.createGain()
  sum.gain.value = 1 / 6
  for (const r of [2, 3, 4.16, 5.43, 6.79, 8.21]) {
    const o = ctx.createOscillator()
    o.type = 'square'
    o.frequency.value = 40 * r * 4.5
    o.connect(sum)
    o.start(t)
    o.stop(t + decay + 0.1)
  }
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 10000; bp.Q.value = 0.8
  const hpF = ctx.createBiquadFilter(); hpF.type = 'highpass'; hpF.frequency.value = hp
  const g = ctx.createGain()
  // the filters leave only the top of the tone, so it needs a lift to sit with the kick and snare
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak * 3.2, t + 0.001)
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
  sum.connect(bp).connect(hpF).connect(g).connect(d)
}
function drive(ctx: Ctx, d: AudioNode, amount: number): AudioNode {
  const ws = ctx.createWaveShaper()
  const c = new Float32Array(1024)
  for (let i = 0; i < c.length; i++) { const x = (i / (c.length - 1)) * 2 - 1; c[i] = Math.tanh(x * amount) / Math.tanh(amount) }
  ws.curve = c
  ws.connect(d)
  return ws
}

/** Hand percussion and brushes (any kit). */
function percVoice(ctx: Ctx, v: Voice, t: number, lv: number, d: AudioNode) {
  switch (v) {
    case 'conga': osc(ctx, d, t, 'sine', 360, 315, 0.04, 0.9 * lv, 0.22); nz(ctx, d, t, [['bandpass', 1400, 1.2]], 0.35 * lv, 0.03); break
    case 'congalo': osc(ctx, d, t, 'sine', 245, 210, 0.05, 0.95 * lv, 0.3); nz(ctx, d, t, [['bandpass', 1100, 1.2]], 0.3 * lv, 0.03); break
    case 'bongo': osc(ctx, d, t, 'sine', 560, 500, 0.03, 0.8 * lv, 0.12); nz(ctx, d, t, [['bandpass', 2500, 1.5]], 0.3 * lv, 0.02); break
    case 'bongolo': osc(ctx, d, t, 'sine', 410, 370, 0.03, 0.85 * lv, 0.15); nz(ctx, d, t, [['bandpass', 2000, 1.5]], 0.28 * lv, 0.02); break
    case 'cajon': osc(ctx, d, t, 'sine', 120, 62, 0.06, 1.0 * lv, 0.22); nz(ctx, d, t, [['lowpass', 500, 0.7]], 0.45 * lv, 0.05); break
    case 'cajonslap': nz(ctx, d, t, [['bandpass', 2300, 1.3]], 0.75 * lv, 0.06); nz(ctx, d, t, [['highpass', 3500, 0.7]], 0.4 * lv, 0.14); osc(ctx, d, t, 'triangle', 330, 260, 0.03, 0.3 * lv, 0.05); break
    case 'clave': osc(ctx, d, t, 'sine', 2500, 2450, 0.02, 0.8 * lv, 0.05); break
    case 'agogo': osc(ctx, d, t, 'square', 880, 875, 0.05, 0.25 * lv, 0.18); osc(ctx, d, t, 'sine', 1320, 1318, 0.05, 0.25 * lv, 0.15); break
    case 'snap': nz(ctx, d, t, [['bandpass', 2600, 2.5]], 0.9 * lv, 0.025); osc(ctx, d, t, 'sine', 1800, 1200, 0.01, 0.2 * lv, 0.015); break
    case 'brush': nz(ctx, d, t, [['bandpass', 3200, 0.6], ['highpass', 900, 0.7]], 0.45 * lv, 0.32, 0.06); break
    case 'brushtap': nz(ctx, d, t, [['bandpass', 2600, 0.8]], 0.7 * lv, 0.08, 0.004); break
    case 'guiro': {
      // a scrape: quick ticks of filtered noise
      for (let k = 0; k < 9; k++) nz(ctx, d, t + k * 0.018, [['bandpass', 3400, 2]], 0.45 * lv * (0.6 + 0.4 * Math.sin((k / 8) * Math.PI)), 0.012)
      break
    }
  }
}
function percLive(ctx: AudioContext, v: Voice, when: number, level: number, d: AudioNode) { percVoice(ctx, v, Math.max(when, ctx.currentTime), level, d) }

/** The drum machines (808 and 909 style), one hit of each drum. */
function machineVoice(ctx: Ctx, kit: '808' | '909', v: Voice, t: number, lv: number, d: AudioNode) {
  const is808 = kit === '808'
  switch (v) {
    case 'kick': {
      const dd = drive(ctx, d, is808 ? 1.6 : 2.4)
      if (is808) osc(ctx, dd, t, 'sine', 150, 46, 0.09, 1.0 * lv, 0.75)
      else { osc(ctx, dd, t, 'sine', 210, 52, 0.035, 1.0 * lv, 0.33); nz(ctx, d, t, [['lowpass', 5000, 0.7]], 0.35 * lv, 0.008) }
      break
    }
    case 'snare': case 'ghost': {
      const g = v === 'ghost' ? 0.35 : 1
      osc(ctx, d, t, 'triangle', is808 ? 185 : 200, is808 ? 170 : 175, 0.05, 0.55 * lv * g, 0.11)
      osc(ctx, d, t, 'sine', is808 ? 330 : 345, 320, 0.05, 0.35 * lv * g, 0.08)
      nz(ctx, d, t, is808 ? [['highpass', 1800, 0.7]] : [['highpass', 1000, 0.7], ['lowpass', 8000, 0.7]], (is808 ? 0.45 : 0.6) * lv * g, is808 ? 0.17 : 0.22)
      break
    }
    case 'clap': {
      for (const k of [0, 0.011, 0.022]) nz(ctx, d, t + k, [['bandpass', is808 ? 1150 : 1400, 1.4]], 0.7 * lv, 0.009)
      nz(ctx, d, t + 0.03, [['bandpass', is808 ? 1150 : 1400, 1.1]], 0.55 * lv, is808 ? 0.16 : 0.2)
      break
    }
    case 'rim': osc(ctx, d, t, 'sine', 1700, 1650, 0.01, 0.6 * lv, 0.03); nz(ctx, d, t, [['bandpass', 3000, 3]], 0.3 * lv, 0.015); break
    case 'hat': metal(ctx, d, t, 0.55 * lv, 0.055); nz(ctx, d, t, [['highpass', 9000, 0.7]], (is808 ? 0.18 : 0.3) * lv, 0.04); break
    case 'pedal': metal(ctx, d, t, 0.35 * lv, 0.035); break
    case 'open': metal(ctx, d, t, 0.45 * lv, is808 ? 0.42 : 0.38); nz(ctx, d, t, [['highpass', 8500, 0.7]], (is808 ? 0.14 : 0.24) * lv, 0.35); break
    case 'ride': metal(ctx, d, t, 0.3 * lv, 1.4, 5000); nz(ctx, d, t, [['bandpass', 7000, 1.5]], 0.12 * lv, 1.0); break
    case 'bell': metal(ctx, d, t, 0.35 * lv, 0.9, 4000); osc(ctx, d, t, 'square', 1480, 1478, 0.1, 0.06 * lv, 0.6); break
    case 'crash': metal(ctx, d, t, 0.35 * lv, 1.6, 5000); nz(ctx, d, t, [['highpass', 6000, 0.7]], 0.4 * lv, 1.4); break
    case 'cowbell': {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2640; bp.Q.value = 1; bp.connect(d)
      osc(ctx, bp, t, 'square', 540, 540, 0.1, 0.6 * lv, 0.25); osc(ctx, bp, t, 'square', 800, 800, 0.1, 0.6 * lv, 0.25)
      break
    }
    case 'shaker': case 'tamb': nz(ctx, d, t, [['highpass', 6500, 0.7]], 0.45 * lv, v === 'tamb' ? 0.12 : 0.06, 0.012); if (v === 'tamb') metal(ctx, d, t, 0.15 * lv, 0.12, 8000); break
    default: { // toms
      const f = { tom1: 260, tom2: 190, tom3: 130, roto1: 400, roto2: 320, roto3: 250 }[v as string] ?? 180
      osc(ctx, d, t, 'sine', f * 1.35, f, is808 ? 0.12 : 0.06, 0.9 * lv, is808 ? 0.45 : 0.3)
      if (!is808) nz(ctx, d, t, [['bandpass', f * 6, 1]], 0.15 * lv, 0.03)
    }
  }
}

const MACHINE_VOICES: Voice[] = ['kick', 'snare', 'ghost', 'clap', 'rim', 'hat', 'pedal', 'open', 'ride', 'bell', 'crash', 'cowbell', 'shaker', 'tamb', 'tom1', 'tom2', 'tom3', 'roto1', 'roto2', 'roto3']
const PERC_VOICES = [...PERC]
const LEN: Partial<Record<Voice, number>> = { kick: 0.9, ride: 1.6, crash: 1.8, bell: 1.0, open: 0.5, brush: 0.45 }

/** Render sounds into buffers once (cheap to play, the same as the recordings). */
async function render(make: (ctx: Ctx, t: number, d: AudioNode) => void, secs: number): Promise<AudioBuffer> {
  const sr = 44100
  const ctx = new OfflineAudioContext(1, Math.ceil(secs * sr), sr)
  make(ctx, 0.002, ctx.destination)
  return ctx.startRendering()
}

/** Run recorded drums through an old-gear chain (60s/70s or lo-fi). */
async function processed(buf: AudioBuffer, how: 'vintage' | 'lofi'): Promise<AudioBuffer> {
  const sr = how === 'lofi' ? 16000 : buf.sampleRate
  const ctx = new OfflineAudioContext(1, Math.ceil(buf.duration * sr), sr)
  const src = ctx.createBufferSource()
  src.buffer = buf
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = how === 'lofi' ? 90 : 60
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = how === 'lofi' ? 4600 : 7000; lp.Q.value = 0.5
  const warm = ctx.createBiquadFilter(); warm.type = 'peaking'; warm.frequency.value = how === 'lofi' ? 300 : 220; warm.gain.value = how === 'lofi' ? 4 : 3
  const ws = ctx.createWaveShaper()
  const c = new Float32Array(2048)
  const amt = how === 'lofi' ? 2.6 : 1.5
  for (let i = 0; i < c.length; i++) {
    const x = (i / (c.length - 1)) * 2 - 1
    let y = Math.tanh(x * amt) / Math.tanh(amt)
    if (how === 'lofi') y = Math.round(y * 48) / 48 // fewer levels: the grit of an old sampler
    c[i] = y
  }
  ws.curve = c
  const g = ctx.createGain(); g.gain.value = how === 'lofi' ? 0.8 : 0.9
  src.connect(hp).connect(lp).connect(warm).connect(ws).connect(g).connect(ctx.destination)
  src.start()
  return ctx.startRendering()
}

// ---------- the kits ----------
interface Layer { buf: AudioBuffer; off: number }
type Bank = Map<string, Layer[]>
let base: Bank | null = null
let baseLoading: Promise<void> | null = null
const banks = new Map<KitId, Bank>()
const preparing = new Map<KitId, Promise<void>>()
let perc: Bank | null = null
let percLoading: Promise<void> | null = null

/** Load the recorded kit (about 700 KB). Until it's ready the live synth kit plays. */
function loadBase(): Promise<void> {
  if (base) return Promise.resolve()
  baseLoading ??= (async () => {
    const ctx = audio()
    const index = (await (await fetch('samples/drums/index.json')).json()) as Record<string, string[]>
    const m: Bank = new Map()
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
    base = m
  })().catch(() => { baseLoading = null })
  return baseLoading
}
function loadPerc(): Promise<void> {
  if (perc) return Promise.resolve()
  percLoading ??= (async () => {
    const m: Bank = new Map()
    await Promise.all(PERC_VOICES.map(async v => {
      const layers = await Promise.all([0.55, 1].map(async lv => ({ buf: await render((c, t, d) => percVoice(c, v, t, lv, d), LEN[v] ?? 0.45), off: 0 })))
      m.set(v, layers)
    }))
    perc = m
  })().catch(() => { percLoading = null })
  return percLoading
}

/** Get a kit ready to play (recordings fetched, or sounds rendered). Until then the live synth kit plays. */
export function prepareKit(id: KitId = 'studio'): Promise<void> {
  if (banks.has(id)) return Promise.resolve()
  let p = preparing.get(id)
  if (!p) {
    const info = kitInfo(id)
    p = (async () => {
      void loadPerc()
      if (info.synth) {
        const m: Bank = new Map()
        await Promise.all(MACHINE_VOICES.map(async v => {
          const layers = await Promise.all([0.6, 1].map(async lv => ({ buf: await render((c, t, d) => machineVoice(c, id as '808' | '909', v, t, lv, d), LEN[v] ?? 0.6), off: 0 })))
          m.set(v, layers)
        }))
        banks.set(id, m)
        return
      }
      await loadBase()
      if (!base) throw new Error('no kit')
      if (!info.process) { banks.set(id, base); return }
      const m: Bank = new Map()
      await Promise.all([...base.entries()].map(async ([piece, layers]) => {
        m.set(piece, await Promise.all(layers.map(async L => ({ buf: await processed(L.buf, info.process!), off: L.off }))))
      }))
      banks.set(id, m)
    })().catch(() => { preparing.delete(id) })
    preparing.set(id, p)
  }
  return p
}
/** The recorded kit and the percussion (what most grooves need). */
export function loadKit(id: KitId = 'studio'): Promise<void> {
  return Promise.all([prepareKit(id), loadPerc()]).then(() => {})
}
export const kitLoaded = (id: KitId = 'studio') => banks.has(id) && !!perc

/** How loud each drum sits in the mix. */
const VOICE_GAIN: Partial<Record<Voice, number>> = {
  kick: 1.0, snare: 0.85, ghost: 0.85, hat: 0.7, pedal: 0.6, open: 0.6, rim: 0.75, ride: 0.6, bell: 0.55, crash: 0.55,
  tom1: 0.8, tom2: 0.8, tom3: 0.85, clap: 0.7, tamb: 0.45, cowbell: 0.45, shaker: 0.5, roto1: 0.7, roto2: 0.7, roto3: 0.75,
  conga: 0.95, congalo: 1.0, bongo: 0.85, bongolo: 0.9, cajon: 1.1, cajonslap: 1.0, clave: 0.7, guiro: 0.7, snap: 0.85, brush: 0.75, brushtap: 0.8, agogo: 0.6,
}
let openHat: { g: GainNode; t: number } | null = null

/** Play one drum. `sel` picks the kit (a kit id, or a kit with recorded pieces swapped). */
export function playDrum(voice: Voice, when: number, level = 1, dest?: AudioNode, sel: KitSel | KitId = {}, mix = 1) {
  const d = dest ?? out()
  const s: KitSel = typeof sel === 'string' ? { kit: sel } : sel
  const id = s.kit ?? 'studio'
  const isPerc = PERC.has(voice)
  const bank = isPerc ? perc : banks.get(id)
  if (!bank) {
    void (isPerc ? loadPerc() : prepareKit(id))
    synthDrum(voice, when, level * 0.6 * mix, d)
    return
  }
  const info = kitInfo(id)
  const k = { ...PIECES, ...info.pieces, ...s.pieces }
  const piece = isPerc || info.synth ? voice : voice === 'kick' ? k.kick : voice === 'snare' || voice === 'ghost' ? k.snare : voice === 'ride' ? k.ride : voice
  const layers = bank.get(piece)
  if (!layers?.length) { synthDrum(voice, when, level, d); return }
  const lv = Math.max(0.05, Math.min(1, voice === 'ghost' && !info.synth ? level * 0.35 : level))
  // velocity picks the layer (soft to loud), with a neighbour now and then so repeats don't sound machine-gunned
  let li = Math.round(lv * (layers.length - 1))
  if (layers.length > 2 && Math.random() < 0.3) li = Math.max(0, Math.min(layers.length - 1, li + (Math.random() < 0.5 ? -1 : 1)))
  const L = layers[li]
  const ctx = audio()
  const src = ctx.createBufferSource()
  src.buffer = L.buf
  // tiny pitch and level differences between hits, like a real drummer (machines stay exact)
  src.playbackRate.value = info.synth && !isPerc ? 1 : 1 + (Math.random() - 0.5) * 0.016
  const g = ctx.createGain()
  g.gain.value = (VOICE_GAIN[voice] ?? 0.7) * Math.pow(lv, 0.9) * (info.synth ? 1 : 0.94 + Math.random() * 0.12) * mix * (info.synth && !isPerc ? 0.9 : 1)
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

export interface Groove {
  id: string; label: string; hits: Hit[]; fill: Fill; crash?: boolean; tight?: boolean
  /** the kit it sounds best on, and recorded pieces to swap in */
  kit?: KitId; pieces?: Partial<Pieces>
  /** mix level (busy grooves sit lower) */
  level?: number
  /** how it's grouped in the menu */
  group?: string
}
const e8x = (v: Voice, lvl = 0.6, swing = 0.5): Hit[] => [0, 1, 2, 3].flatMap(b => [[b, v, lvl], [b + swing, v, lvl * 0.65]] as Hit[])
const trip = (v: Voice, lvl = 0.45): Hit[] => Array.from({ length: 12 }, (_, i) => [i / 3, v, i % 3 === 0 ? lvl : lvl * 0.6] as Hit)

export const GROOVE_GROUPS = ['Rock and pop', 'Heavy', 'Blues, jazz and soul', 'Hip-hop and electronic', 'Reggae and island', 'Latin and world', 'Acoustic']
export const GROOVES: Groove[] = [
  // ── rock and pop
  { id: 'rock', group: 'Rock and pop', label: 'Rock', kit: 'rock', fill: 'rock', crash: true, hits: [[0, 'kick', 1], [2, 'kick', 1], [2.5, 'kick', 0.7], [1, 'snare', 1], [3, 'snare', 1], ...e8('hat')] },
  { id: 'pop', group: 'Rock and pop', label: 'Pop', kit: 'studio', pieces: { snare: 'snaretight' }, fill: 'rock', crash: true, hits: [[0, 'kick', 1], [1.5, 'kick', 0.8], [2, 'kick', 0.9], [1, 'snare', 1], [3, 'snare', 1], ...e8('hat', 0.6)] },
  { id: 'halftime', group: 'Rock and pop', label: 'Half-time ballad', kit: 'rock', fill: 'rock', crash: true, hits: [[0, 'kick', 1], [1.75, 'kick', 0.6], [2, 'snare', 1], [2.5, 'kick', 0.7], ...e8('hat', 0.5)] },
  { id: 'punk', group: 'Rock and pop', label: 'Punk', kit: 'rock', fill: 'rock', crash: true, hits: [[0, 'kick', 1], [0.5, 'kick', 0.8], [1, 'snare', 1], [2, 'kick', 1], [2.5, 'kick', 0.8], [3, 'snare', 1], ...e8('hat', 0.8)] },
  { id: 'motorik', group: 'Rock and pop', label: 'Indie / motorik', kit: 'vintage', fill: 'rock', crash: true, hits: [[0, 'kick', 1], [0.5, 'kick', 0.7], [2, 'kick', 1], [2.5, 'kick', 0.7], [1, 'snare', 0.9], [3, 'snare', 0.9], ...e8('hat', 0.55)] },
  { id: 'disco', group: 'Rock and pop', label: 'Four on the floor (disco)', kit: 'studio', pieces: { snare: 'snaretight' }, fill: 'funk', crash: true, hits: [[0, 'kick', 1], [1, 'kick', 1], [2, 'kick', 1], [3, 'kick', 1], [1, 'clap', 0.8], [1, 'snare', 0.7], [3, 'clap', 0.8], [3, 'snare', 0.7], [0, 'hat', 0.5], [1, 'hat', 0.5], [2, 'hat', 0.5], [3, 'hat', 0.5], [0.5, 'open', 0.7], [1.5, 'open', 0.7], [2.5, 'open', 0.7], [3.5, 'open', 0.7]] },
  { id: 'sixeight', group: 'Rock and pop', label: '6/8 ballad (triplet feel)', kit: 'studio', fill: 'rock', crash: true, hits: [[0, 'kick', 1], [2 + 2 / 3, 'kick', 0.6], [1, 'snare', 0.85], [3, 'snare', 0.9], ...trip('hat', 0.45)] },
  { id: 'train', group: 'Rock and pop', label: 'Country train beat', kit: 'vintage', fill: 'rock', hits: [[0, 'kick', 1], [2, 'kick', 1], ...e16('ghost', 1), [1, 'snare', 0.8], [3, 'snare', 0.8]] },
  { id: 'dnb', group: 'Rock and pop', label: 'Drum & bass (fast breakbeat)', kit: 'studio', pieces: { snare: 'snaretight' }, tight: true, fill: 'funk', crash: true, level: 0.85, hits: [[0, 'kick', 1], [2.5, 'kick', 0.9], [1, 'snare', 1], [3, 'snare', 1], [1.75, 'ghost', 0.8], [3.75, 'ghost', 0.7], ...e8('hat', 0.5), [3.5, 'open', 0.45]] },
  // ── heavy
  { id: 'metal', group: 'Heavy', level: 0.55, label: 'Metal double kick', kit: 'metal', fill: 'metal', crash: true, tight: true, hits: [...e16('kick', 0.85).map(([b, v, l]) => [b, v, 0.7 + l * 0.3] as Hit), [1, 'snare', 1], [3, 'snare', 1], [0, 'crash', 0.75], [1, 'bell', 0.7], [2, 'bell', 0.75], [3, 'bell', 0.7]] },
  { id: 'gallop', group: 'Heavy', level: 0.6, label: 'Metal gallop', kit: 'metal', fill: 'metal', crash: true, tight: true, hits: [...[0, 1, 2, 3].flatMap(b => [[b, 'kick', 0.95], [b + 0.5, 'kick', 0.8], [b + 0.75, 'kick', 0.8]] as Hit[]), [1, 'snare', 1], [3, 'snare', 1], ...q('ride', 0.75, 1.1)] },
  { id: 'thrash', group: 'Heavy', level: 0.6, label: 'Thrash (skank beat)', kit: 'metal', fill: 'metal', crash: true, tight: true, hits: [...[0, 1, 2, 3].flatMap(b => [[b, 'kick', 0.95], [b + 0.5, 'snare', 0.9]] as Hit[]), [0, 'crash', 0.8], [1, 'ride', 0.7], [2, 'crash', 0.6], [3, 'ride', 0.7]] },
  { id: 'breakdown', group: 'Heavy', level: 0.65, label: 'Metal breakdown (half-time)', kit: 'metal', fill: 'metal', crash: true, tight: true, hits: [[0, 'kick', 1], [0.5, 'kick', 0.9], [0.75, 'kick', 0.9], [1.5, 'kick', 0.9], [2, 'snare', 1], [2.75, 'kick', 0.9], [3.25, 'kick', 0.85], [3.5, 'kick', 0.9], ...q('crash', 0.55, 1.2)] },
  { id: 'blast', group: 'Heavy', level: 0.5, label: 'Blast beat', kit: 'metal', fill: 'metal', crash: true, tight: true, hits: [...[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].flatMap(b => [[b, 'kick', 0.9], [b + 0.25, 'snare', 0.8]] as Hit[]), ...q('ride', 0.6), [0, 'crash', 0.8]] },
  { id: 'djent', group: 'Heavy', level: 0.6, label: 'Prog / djent (syncopated)', kit: 'metal', fill: 'metal', crash: true, tight: true, hits: [[0, 'kick', 1], [0.75, 'kick', 0.9], [1.5, 'kick', 0.9], [2.25, 'kick', 0.9], [3, 'kick', 0.9], [3.5, 'kick', 0.8], [1, 'snare', 1], [3, 'snare', 1], ...e8('bell', 0.55), [0, 'crash', 0.6]] },
  // ── blues, jazz and soul
  { id: 'shuffle', group: 'Blues, jazz and soul', label: 'Blues shuffle', kit: 'vintage', fill: 'jazz', crash: true, hits: [[0, 'kick', 1], [2, 'kick', 0.9], [1, 'snare', 1], [3, 'snare', 1], ...sw('hat', 0.6)] },
  { id: 'purdie', group: 'Blues, jazz and soul', label: 'Half-time shuffle', kit: 'vintage', fill: 'jazz', crash: true, hits: [[0, 'kick', 1], [1 + 2 / 3, 'kick', 0.6], [2 + 2 / 3, 'kick', 0.7], [2, 'snare', 1], [1 / 3 + 1, 'ghost', 0.6], [2 / 3 + 3, 'ghost', 0.6], [1 / 3 + 3, 'ghost', 0.5], ...sw('hat', 0.55)] },
  { id: 'swing', group: 'Blues, jazz and soul', level: 1.6, label: 'Jazz swing', kit: 'jazz', fill: 'jazz', hits: [[0, 'ride', 0.8], [1, 'ride', 0.8], [5 / 3, 'ride', 0.5], [2, 'ride', 0.8], [3, 'ride', 0.8], [11 / 3, 'ride', 0.5], [1, 'pedal', 0.6], [3, 'pedal', 0.6], [0, 'kick', 0.25], [2, 'kick', 0.25], [8 / 3, 'ghost', 0.6]] },
  { id: 'brushes', group: 'Blues, jazz and soul', level: 1.4, label: 'Jazz brushes (ballad)', kit: 'jazz', fill: 'none', hits: [[0, 'brush', 0.8], [2, 'brush', 0.8], [1, 'brushtap', 0.7], [3, 'brushtap', 0.75], [1, 'pedal', 0.45], [3, 'pedal', 0.45], [0, 'kick', 0.2], [2, 'kick', 0.2], [5 / 3, 'brushtap', 0.35], [11 / 3, 'brushtap', 0.35]] },
  { id: 'motown', group: 'Blues, jazz and soul', label: 'Motown / soul', kit: 'vintage', fill: 'funk', crash: true, hits: [[0, 'kick', 1], [1.5, 'kick', 0.6], [2, 'kick', 0.9], [3.5, 'kick', 0.6], [0, 'snare', 0.55], [1, 'snare', 0.95], [2, 'snare', 0.55], [3, 'snare', 0.95], [1, 'tamb', 0.8], [3, 'tamb', 0.8], ...e8('hat', 0.4)] },
  { id: 'funk', group: 'Blues, jazz and soul', label: 'Funk', kit: 'studio', pieces: { snare: 'snaretight' }, fill: 'funk', crash: true, hits: [[0, 'kick', 1], [0.75, 'kick', 0.7], [2.5, 'kick', 0.9], [1, 'snare', 1], [3, 'snare', 1], [1.75, 'ghost', 1], [2.25, 'ghost', 1], [3.75, 'ghost', 1], ...e16('hat', 0.45), [3.5, 'open', 0.5]] },
  { id: 'afrobeat', group: 'Blues, jazz and soul', label: 'Afrobeat', kit: 'vintage', fill: 'funk', crash: true, level: 0.9, hits: [[0, 'kick', 1], [0.75, 'kick', 0.6], [1.5, 'kick', 0.8], [2.5, 'kick', 0.9], [3.25, 'kick', 0.6], [1, 'snare', 0.9], [3, 'snare', 0.9], [2.75, 'ghost', 0.8], ...e16('hat', 0.4), [0.5, 'open', 0.45], [2.5, 'open', 0.45], [0, 'cowbell', 0.4], [1.5, 'cowbell', 0.35], [3, 'cowbell', 0.4]] },
  // ── hip-hop and electronic
  { id: 'hiphop', group: 'Hip-hop and electronic', level: 1.1, label: 'Lo-fi hip-hop', kit: 'lofi', pieces: { kick: 'kickbig' }, fill: 'none', hits: [[0, 'kick', 1], [1.6, 'kick', 0.6], [2.5, 'kick', 0.85], [1, 'snare', 0.9], [3, 'snare', 0.9], [0, 'hat', 0.5], [0.58, 'hat', 0.35], [1, 'hat', 0.5], [1.58, 'hat', 0.35], [2, 'hat', 0.5], [2.58, 'hat', 0.35], [3, 'hat', 0.5], [3.58, 'hat', 0.35]] },
  { id: 'boombap', group: 'Hip-hop and electronic', label: 'Boom bap (90s hip-hop)', kit: 'lofi', pieces: { kick: 'kickbig' }, fill: 'none', hits: [[0, 'kick', 1], [1.75, 'kick', 0.7], [2.5, 'kick', 0.9], [1, 'snare', 1], [3, 'snare', 1], ...e8x('hat', 0.55, 0.58)] },
  { id: 'trap', group: 'Hip-hop and electronic', label: 'Trap', kit: '808', fill: 'machine', level: 0.9, hits: [[0, 'kick', 1], [1.5, 'kick', 0.8], [2.75, 'kick', 0.85], [2, 'clap', 1], [2, 'snare', 0.5], ...e8('hat', 0.55), [1.25, 'hat', 0.4], [1.75, 'hat', 0.45], [1.875, 'hat', 0.35], [3.25, 'hat', 0.4], [3.625, 'hat', 0.4], [3.75, 'hat', 0.45], [3.875, 'hat', 0.5], [3.5, 'open', 0.4]] },
  { id: 'house', group: 'Hip-hop and electronic', label: 'House / dance', kit: '909', fill: 'machine', crash: true, level: 0.85, hits: [...q('kick', 1), [1, 'clap', 0.85], [3, 'clap', 0.85], ...e16('hat', 0.3), [0.5, 'open', 0.6], [1.5, 'open', 0.6], [2.5, 'open', 0.6], [3.5, 'open', 0.6]] },
  { id: 'synthpop', group: 'Hip-hop and electronic', label: '80s synth-pop', kit: '808', fill: 'machine', crash: true, hits: [[0, 'kick', 1], [2, 'kick', 1], [2.5, 'kick', 0.8], [1, 'snare', 0.9], [1, 'clap', 0.7], [3, 'snare', 0.9], [3, 'clap', 0.7], ...e8('hat', 0.5), [3.5, 'cowbell', 0.35]] },
  { id: 'reggaeton', group: 'Hip-hop and electronic', label: 'Reggaeton / dembow', kit: '808', fill: 'machine', hits: [...q('kick', 1), [0.75, 'snare', 0.85], [1.5, 'snare', 0.85], [2.75, 'snare', 0.85], [3.5, 'snare', 0.85], ...e8('hat', 0.4)] },
  // ── reggae and island
  { id: 'reggae', group: 'Reggae and island', level: 1.5, label: 'Reggae one drop', kit: 'vintage', fill: 'reggae', hits: [[2, 'kick', 1], [2, 'rim', 1], ...sw('hat', 0.4), [3 + 2 / 3, 'open', 0.35]] },
  { id: 'rockers', group: 'Reggae and island', level: 1.25, label: 'Reggae rockers', kit: 'vintage', fill: 'reggae', hits: [...q('kick', 0.9), [1, 'rim', 1], [3, 'rim', 1], ...sw('hat', 0.45)] },
  { id: 'steppers', group: 'Reggae and island', level: 1.2, label: 'Reggae steppers', kit: 'vintage', fill: 'reggae', hits: [...q('kick', 0.95), [2, 'rim', 1], ...e16('hat', 0.4)] },
  { id: 'island', group: 'Reggae and island', level: 1.2, label: 'Island reggae (Jawaiian)', kit: 'studio', fill: 'reggae', hits: [[2, 'kick', 1], [2, 'rim', 0.9], [0, 'kick', 0.5], ...e16('shaker', 0.45), [1.5, 'conga', 0.6], [3.5, 'conga', 0.6], [3.75, 'congalo', 0.5], ...sw('hat', 0.3)] },
  // ── Latin and world
  { id: 'bossa', group: 'Latin and world', level: 1.3, label: 'Bossa nova', kit: 'jazz', fill: 'none', hits: [[0, 'kick', 0.8], [1.5, 'kick', 0.6], [2, 'kick', 0.8], [3.5, 'kick', 0.6], [0, 'rim', 0.8], [0.75, 'rim', 0.8], [1.5, 'rim', 0.8], [2.5, 'rim', 0.8], [3, 'rim', 0.8], ...e8('shaker', 0.55)] },
  { id: 'samba', group: 'Latin and world', level: 0.9, label: 'Samba', kit: 'studio', fill: 'latin', crash: true, hits: [[1, 'tom3', 1], [3, 'tom3', 1], [0, 'tom3', 0.45], [2, 'tom3', 0.45], [0, 'kick', 0.6], [2, 'kick', 0.6], ...e16('shaker', 0.45), [0, 'rim', 0.7], [0.5, 'rim', 0.6], [0.75, 'rim', 0.7], [1.25, 'rim', 0.6], [1.5, 'rim', 0.7], [2, 'rim', 0.7], [2.5, 'rim', 0.6], [2.75, 'rim', 0.7], [3.25, 'rim', 0.6], [3.5, 'rim', 0.7], [0, 'agogo', 0.5], [0.75, 'agogo', 0.4], [2, 'agogo', 0.5], [2.5, 'agogo', 0.4]] },
  { id: 'rumba', group: 'Latin and world', level: 1.1, label: 'Rumba / flamenco (cajón and palmas)', kit: 'studio', fill: 'latin', hits: [[0, 'cajon', 1], [1.5, 'cajon', 0.7], [2, 'cajon', 0.9], [1, 'cajonslap', 0.9], [3, 'cajonslap', 0.95], [3.5, 'cajonslap', 0.6], [0.5, 'clap', 0.6], [1.5, 'clap', 0.6], [2.5, 'clap', 0.6], [3.5, 'clap', 0.6], ...e8('shaker', 0.3)] },
  { id: 'cumbia', group: 'Latin and world', level: 1.1, label: 'Cumbia', kit: 'studio', fill: 'latin', hits: [[0, 'kick', 0.9], [2, 'kick', 0.9], ...[0, 1, 2, 3].map(b => [b + 0.5, 'guiro', 0.7] as Hit), ...[0, 1, 2, 3].map(b => [b, 'shaker', 0.45] as Hit), [1, 'conga', 0.7], [1.5, 'congalo', 0.6], [3, 'conga', 0.7], [3.5, 'congalo', 0.6], [1, 'rim', 0.5], [3, 'rim', 0.5]] },
  { id: 'clave', group: 'Latin and world', level: 1.1, label: 'Son clave and congas (salsa)', kit: 'studio', fill: 'latin', hits: [[0, 'clave', 0.9], [0.75, 'clave', 0.9], [1.5, 'clave', 0.9], [2.5, 'clave', 0.9], [3, 'clave', 0.9], [0.5, 'conga', 0.6], [1.5, 'conga', 0.5], [2, 'congalo', 0.8], [2.5, 'congalo', 0.8], [3.5, 'conga', 0.6], [0, 'bongo', 0.5], [1, 'bongolo', 0.45], [2, 'bongo', 0.5], [3, 'bongolo', 0.45], [1.5, 'kick', 0.5], [3.5, 'kick', 0.5], ...[0, 1, 2, 3].map(b => [b, 'cowbell', 0.4] as Hit)] },
  // ── acoustic
  { id: 'cajon', group: 'Acoustic', level: 1.15, label: 'Cajón (acoustic)', kit: 'studio', fill: 'latin', hits: [[0, 'cajon', 1], [2, 'cajon', 0.85], [2.5, 'cajon', 0.6], [1, 'cajonslap', 0.9], [3, 'cajonslap', 0.9], ...e8('shaker', 0.35)] },
  { id: 'brushfolk', group: 'Acoustic', level: 1.2, label: 'Brushes and shaker (folk)', kit: 'jazz', fill: 'none', hits: [[0, 'kick', 0.5], [2, 'kick', 0.45], [1, 'brushtap', 0.8], [3, 'brushtap', 0.8], ...e8('shaker', 0.4)] },
  { id: 'snaps', group: 'Acoustic', level: 1.0, label: 'Finger snaps and stomps', kit: 'studio', fill: 'none', hits: [[0, 'kick', 0.7], [2, 'kick', 0.65], [1, 'snap', 0.85], [3, 'snap', 0.85]] },
]
export const grooveOf = (id: string) => GROOVES.find(x => x.id === id)

/** The last beat of a phrase: a fill that leads into the next bar. */
const FILLS: Record<Fill, Hit[]> = {
  rock: [[3, 'tom1', 0.85], [3.25, 'tom1', 0.75], [3.5, 'tom2', 0.85], [3.75, 'tom3', 0.95], [3, 'kick', 0.8]],
  metal: [[3, 'snare', 0.9], [3.25, 'tom1', 0.85], [3.5, 'tom2', 0.9], [3.75, 'tom3', 1], ...[0, 0.25, 0.5, 0.75].map(x => [3 + x, 'kick', 0.85] as Hit)],
  reggae: [[3, 'roto1', 0.8], [3.25, 'roto1', 0.65], [3.5, 'roto2', 0.8], [3.75, 'roto3', 0.9], [2 + 2 / 3, 'roto2', 0.5]],
  jazz: [[3, 'snare', 0.55], [3 + 1 / 3, 'snare', 0.4], [3 + 2 / 3, 'snare', 0.7], [3, 'ride', 0.6]],
  funk: [[3, 'snare', 0.9], [3.25, 'ghost', 0.8], [3.5, 'snare', 0.9], [3.75, 'tom1', 0.8], [3, 'kick', 0.8], [3.5, 'open', 0.5]],
  latin: [[3, 'conga', 0.8], [3.25, 'conga', 0.7], [3.5, 'congalo', 0.8], [3.75, 'congalo', 0.9], [3, 'kick', 0.6]],
  machine: [[3, 'snare', 0.7], [3.25, 'snare', 0.75], [3.5, 'snare', 0.8], [3.625, 'snare', 0.85], [3.75, 'snare', 0.9], [3.875, 'snare', 1], [3, 'kick', 0.9]],
  none: [],
}

export interface BarOpts { fill?: boolean; crash?: boolean; /** play it on another kit */ kit?: KitId }

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
  const machine = kitInfo(opts.kit ?? g.kit ?? 'studio').synth
  const jitter = machine ? 0 : g.tight ? 0.0012 : 0.004
  for (const [b, v, l] of hits) {
    if (b < fromBeat || b >= fromBeat + beats) continue
    const human = b === 0 ? 0 : (Math.random() - 0.5) * jitter
    playDrum(v, when + (b - fromBeat) * spb + human, l * level, dest, opts.kit ? { kit: opts.kit } : { kit: g.kit, pieces: g.pieces }, g.level ?? 1)
  }
}


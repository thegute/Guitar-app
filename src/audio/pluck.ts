// Plucked-string synthesis (Karplus–Strong with fractional-delay tuning).
import { audio, out } from './engine'
import { midiToFreq } from '../theory/notes'

const cache = new Map<string, AudioBuffer>()

function render(ctx: BaseAudioContext, midi: number, bright: number): AudioBuffer {
  const sr = ctx.sampleRate
  const f = midiToFreq(midi)
  const dur = Math.max(1.4, 3.2 - (midi - 40) * 0.04)
  const n = Math.floor(sr * dur)
  const buf = ctx.createBuffer(1, n, sr)
  const y = buf.getChannelData(0)
  // loop delay = p (integer) + 0.5 (averaging filter) + allpass fraction
  const period = sr / f
  let p = Math.floor(period - 0.5)
  let frac = period - 0.5 - p
  if (frac < 0.1) {
    p -= 1
    frac += 1
  }
  const C = (1 - frac) / (1 + frac)
  // decay so every string rings for roughly the same musical time
  const t60 = Math.max(0.9, 3.5 - (midi - 40) * 0.07)
  const rho = Math.pow(10, (-3 * period) / (sr * t60))
  const line = new Float32Array(p)
  // excitation: filtered noise, brightness controls the pick
  let lp = 0
  for (let i = 0; i < p; i++) {
    const w = Math.random() * 2 - 1
    lp = lp + bright * (w - lp)
    line[i] = lp
  }
  // pluck position comb (about 1/5 along the string)
  const pick = Math.max(1, Math.floor(p / 5))
  const exc = Float32Array.from(line)
  for (let i = 0; i < p; i++) line[i] = exc[i] - 0.6 * exc[(i + pick) % p]
  let idx = 0
  let apX1 = 0
  let apY1 = 0
  for (let i = 0; i < n; i++) {
    const cur = line[idx]
    const nxt = line[(idx + 1) % p]
    const avg = 0.5 * (cur + nxt)
    const ap = C * avg + apX1 - C * apY1
    apX1 = avg
    apY1 = ap
    line[idx] = ap * rho
    y[i] = cur
    idx = (idx + 1) % p
  }
  // gentle attack and normalise
  let peak = 0
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(y[i]))
  const g = peak > 0 ? 0.6 / peak : 1
  for (let i = 0; i < n; i++) y[i] *= g * (i < 64 ? i / 64 : 1)
  return buf
}

function bufferFor(midi: number, bright = 0.55) {
  const ctx = audio()
  const key = `${midi}:${bright}`
  let b = cache.get(key)
  if (!b) {
    b = render(ctx, midi, bright)
    cache.set(key, b)
  }
  return b
}

// ---------- recorded instrument sounds ----------
export type SoundId = 'acoustic' | 'electric' | 'nylon' | 'synth'
const SOUND_KEY = 'kg:sound'
interface Bank { notes: number[]; buffers: Map<number, AudioBuffer> }
const banks = new Map<SoundId, Bank>()
const loading = new Map<SoundId, Promise<void>>()
const soundListeners = new Set<() => void>()

export function soundChoice(): 'auto' | SoundId {
  try { return (JSON.parse(localStorage.getItem(SOUND_KEY) ?? '"auto"') as 'auto' | SoundId) || 'auto' } catch { return 'auto' }
}
export function setSoundChoice(c: 'auto' | SoundId) {
  try { localStorage.setItem(SOUND_KEY, JSON.stringify(c)) } catch { /* storage unavailable */ }
  void loadSound(activeSound())
  soundListeners.forEach(f => f())
}
export function onSoundChange(f: () => void) { soundListeners.add(f); return () => { soundListeners.delete(f) } }
/** The sound in use: your choice, or steel-string acoustic for guitar and nylon for ukulele. */
export function activeSound(): SoundId {
  const c = soundChoice()
  if (c !== 'auto') return c
  try {
    const inst = (JSON.parse(localStorage.getItem('kg:instrument') ?? '{}') as { id?: string }).id
    return inst === 'tenor' || inst === 'baritone' ? 'nylon' : 'acoustic'
  } catch { return 'acoustic' }
}
/** Load a recorded sound (a few hundred KB, bundled with the app). Until it has loaded, notes use the synth. */
export function loadSound(id: SoundId): Promise<void> {
  if (id === 'synth' || banks.has(id)) return Promise.resolve()
  let p = loading.get(id)
  if (!p) {
    p = (async () => {
      const ctx = audio()
      const index = (await (await fetch(`samples/${id}/index.json`)).json()) as Record<string, string>
      const buffers = new Map<number, AudioBuffer>()
      await Promise.all(Object.entries(index).map(async ([m, file]) => {
        const data = await (await fetch(`samples/${id}/${file}`)).arrayBuffer()
        buffers.set(Number(m), await ctx.decodeAudioData(data))
      }))
      banks.set(id, { notes: [...buffers.keys()].sort((a, b) => a - b), buffers })
    })().catch(() => { loading.delete(id) })
    loading.set(id, p)
  }
  return p
}

function sampleNote(bank: Bank, midi: number, when: number, gain: number, dest?: AudioNode) {
  const ctx = audio()
  let best = bank.notes[0]
  for (const n of bank.notes) if (Math.abs(n - midi) < Math.abs(best - midi)) best = n
  const src = ctx.createBufferSource()
  src.buffer = bank.buffers.get(best)!
  src.playbackRate.value = Math.pow(2, (midi - best) / 12)
  const g = ctx.createGain()
  g.gain.value = gain * 1.3
  src.connect(g).connect(dest ?? out())
  const t = when || ctx.currentTime
  src.start(t)
  return { stop: (at?: number) => { try { g.gain.setTargetAtTime(0, at ?? ctx.currentTime, 0.04) } catch { /* noop */ } } }
}

export function playNote(midi: number, when = 0, gain = 0.8, dest?: AudioNode) {
  const id = activeSound()
  const bank = banks.get(id)
  if (bank) return sampleNote(bank, midi, when, gain, dest)
  if (id !== 'synth') void loadSound(id)
  const ctx = audio()
  const src = ctx.createBufferSource()
  src.buffer = bufferFor(midi)
  const g = ctx.createGain()
  g.gain.value = gain
  src.connect(g).connect(dest ?? out())
  const t = when || ctx.currentTime
  src.start(t)
  return { stop: (at?: number) => { try { g.gain.setTargetAtTime(0, at ?? ctx.currentTime, 0.03) } catch { /* noop */ } } }
}

/** Strum notes (low to high for a downstroke). */
export function strum(midis: number[], when = 0, opts: { up?: boolean; spread?: number; gain?: number; dest?: AudioNode } = {}) {
  const ctx = audio()
  const t0 = when || ctx.currentTime + 0.01
  const order = opts.up ? [...midis].reverse() : midis
  const spread = opts.spread ?? 0.018
  const notes = order.map((m, i) => playNote(m, t0 + i * spread, (opts.gain ?? 0.7) * (opts.up ? 0.75 : 1), opts.dest))
  return { stop: (at?: number) => notes.forEach(n => n.stop(at)) }
}

/** Warm the cache for a set of notes so the first strum doesn't stutter. */
export function preload(midis: number[]) {
  for (const m of midis) bufferFor(m)
}

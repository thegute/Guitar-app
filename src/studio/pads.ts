// Pads that can play anything: the kit's drum (as before), a sound you recorded (Sample mode), a slice of a riff,
// an instrument note or chord (piano, choir, 808 sub, horns…) or a file from your phone. Each pad has its own
// settings: pitch, volume, reverse, how it plays (one shot / only while held / loops while held), fades and a choke
// group (a pad cuts off the others in its group, like a closed hi-hat stopping the open one).
// Pure helpers here (trimming, slicing, finding a recording's note); the sound is made in padPlay.ts.
import type { Voice } from '../audio/drums'
import { onsetEnvelope } from './loops'

/** A pad: one of the kit's drums, or one of your 32 own pads (u1…u32: bank A = u1…u16, bank B = u17…u32). */
export type PadId = Voice | `u${number}`
export const USER_PADS: PadId[] = Array.from({ length: 32 }, (_, i) => `u${i + 1}` as PadId)
export const BANKS = { A: USER_PADS.slice(0, 16), B: USER_PADS.slice(16) } as const
export type BankId = keyof typeof BANKS
/** "A 3", "B 12": a pad's bank and number for messages */
export const padName = (p: string) => { const n = Number(p.slice(1)); return n > 16 ? `B ${n - 16}` : `A ${n}` }
export const isUserPad = (p: string): boolean => /^u\d+$/.test(p)

export type PadSrc = 'kit' | 'rec' | 'file' | 'note' | 'chord'
export type PadMode = 'oneshot' | 'hold' | 'loop'
export interface PadFile { uri: string; name: string }
export interface PadDef {
  src: PadSrc
  name?: string
  /** rec: the recording's id (padSamples.ts); a chopped riff's slices share one recording */
  sample?: string
  file?: PadFile
  /** note / chord: the instrument and the note (chord: its root) */
  inst?: string
  midi?: number
  ivs?: number[]
  /** rec / file: where the sound starts and ends, in seconds */
  start?: number
  end?: number
  /** the note a recording is (found when it's recorded): Keys mode plays it up and down from here */
  root?: number
  /** semitones up or down (any amount in between: the pitch dial) */
  pitch?: number
  /** tape = pitch and speed together (a record sped up or slowed down); keep = the same length at any pitch */
  pitchMode?: 'tape' | 'keep'
  /** keep mode: keep a voice natural (no cartoon voice) */
  natural?: boolean
  /** Keys mode: semitones from the pad's own pitch (always tape, on top of the dial) */
  keyShift?: number
  vol?: number
  reverse?: boolean
  mode?: PadMode
  /** seconds */
  fadeIn?: number
  fadeOut?: number
  /** 0 = none, 1–4 */
  choke?: number
  /** note / chord pads in the step grid: how long they ring, in 16ths */
  len?: number
}

/** Anything changed from how the kit plays this drum? (Untouched kit pads keep the old, exact path.) */
export function isPlain(d: PadDef | undefined): boolean {
  return !d || (d.src === 'kit' && !d.pitch && !d.reverse && (d.vol ?? 1) === 1 && (d.mode ?? 'oneshot') === 'oneshot' && !d.fadeIn && !d.fadeOut && !d.choke)
}

/** Where the sound is in a recording: from just before the first loud moment to the end of the last one. */
export function trimSilence(x: Float32Array, sr: number, rel = 0.06): { start: number; end: number } {
  let peak = 0
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]))
  if (peak < 0.004) return { start: 0, end: x.length / sr }
  const blk = Math.max(1, Math.round(sr * 0.005))
  const th = Math.max(0.003, peak * rel)
  let first = -1, last = -1
  for (let i = 0; i < x.length; i += blk) {
    let m = 0
    for (let k = i; k < Math.min(x.length, i + blk); k++) m = Math.max(m, Math.abs(x[k]))
    if (m >= th) { if (first < 0) first = i; last = i + blk }
  }
  if (first < 0) return { start: 0, end: x.length / sr }
  // a little room before the attack, a little tail after
  const start = Math.max(0, first - Math.round(sr * 0.012))
  const end = Math.min(x.length, last + Math.round(sr * 0.06))
  return { start: start / sr, end: end / sr }
}

/** A riff cut into notes: each slice starts at a picked note (onset) and runs to the next one. At most `max`. */
export function sliceAtOnsets(x: Float32Array, sr: number, max = 16, minGap = 0.09): { start: number; end: number }[] {
  const hop = 0.005
  const env = onsetEnvelope(x, sr, hop)
  if (!env.length) return []
  let top = 0
  for (const v of env) top = Math.max(top, v)
  if (top <= 0) return []
  const th = top * 0.18
  const gap = Math.round(minGap / hop)
  // a pick stands out from what's around it (two notes ringing together make small ripples that aren't picks)
  const w = Math.round(0.15 / hop)
  const pre = new Float64Array(env.length + 1)
  for (let i = 0; i < env.length; i++) pre[i + 1] = pre[i] + env[i]
  const local = (i: number) => { const a = Math.max(0, i - w), b = Math.min(env.length, i + w + 1); return (pre[b] - pre[a]) / (b - a) }
  const picks: number[] = []
  for (let i = 1; i < env.length - 1; i++) {
    if (env[i] < th || env[i] < env[i - 1] || env[i] < env[i + 1] || env[i] < local(i) * 4) continue
    if (picks.length && i - picks[picks.length - 1] < gap) {
      // two peaks close together: keep the stronger
      if (env[i] > env[picks[picks.length - 1]]) picks[picks.length - 1] = i
      continue
    }
    picks.push(i)
  }
  // too many: keep the strongest, in order
  const keep = picks.length > max ? [...picks].sort((a, b) => env[b] - env[a]).slice(0, max).sort((a, b) => a - b) : picks
  const dur = x.length / sr
  return keep.map((p, k) => {
    const start = Math.max(0, p * hop - 0.01)
    const end = k + 1 < keep.length ? Math.max(start + 0.03, keep[k + 1] * hop - 0.01) : dur
    return { start, end: Math.min(dur, end) }
  })
}

/** The note a short recording sings or plays (autocorrelation on its loudest part), as MIDI; null if no clear pitch. */
export function detectRoot(x: Float32Array, sr: number): number | null {
  const n = Math.min(x.length, Math.round(sr * 0.25))
  if (n < sr * 0.04) return null
  // the loudest 250 ms
  let best = 0, bestE = -1
  const step = Math.round(sr * 0.02)
  for (let i = 0; i + n <= x.length; i += step) {
    let e = 0
    for (let k = i; k < i + n; k += 4) e += x[k] * x[k]
    if (e > bestE) { bestE = e; best = i }
  }
  const w = x.subarray(best, best + n)
  const minLag = Math.floor(sr / 1000), maxLag = Math.min(Math.floor(sr / 50), n >> 1)
  let r0 = 0
  for (let i = 0; i < n; i++) r0 += w[i] * w[i]
  if (r0 <= 1e-6) return null
  let lag = -1, peak = 0
  const r = new Float32Array(maxLag + 2)
  for (let L = minLag; L <= maxLag + 1; L++) {
    let s = 0
    for (let i = 0; i + L < n; i++) s += w[i] * w[i + L]
    r[L] = s / r0
  }
  // the first strong peak (avoids picking an octave below)
  for (let L = minLag + 1; L <= maxLag; L++) {
    if (r[L] > 0.5 && r[L] >= r[L - 1] && r[L] >= r[L + 1]) { lag = L; peak = r[L]; break }
  }
  if (lag < 0 || peak < 0.5) return null
  // refine between samples
  const a = r[lag - 1], b = r[lag], c = r[lag + 1]
  const d = (a - c) / (2 * (a - 2 * b + c) || 1)
  const f = sr / (lag + (Number.isFinite(d) ? d : 0))
  return Math.round(69 + 12 * Math.log2(f / 440))
}

/** Reverse a recording (a copy). */
export function reversed(x: Float32Array): Float32Array {
  const out = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) out[i] = x[x.length - 1 - i]
  return out
}

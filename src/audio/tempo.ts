// Tempo (BPM), beat grid and time signature from sound, and the tempo of a tab with no tempo written on it.
//   onsets      spectral flux every 10 ms: how much new sound starts (log-compressed, so quiet picking counts)
//   tempo       autocorrelation of the onsets over 40–240 BPM, weighted towards common tempos, then refined to a
//               tenth of a BPM by lining a beat comb up with the whole recording
//   beats       dynamic-programming beat tracker (beats where onsets are strong, evenly spaced)
//   meter       which beats are accented (2, 3, 4, 5 or 7 per bar) and whether beats split in two or three (6/8, 12/8)
//   alignTab    where a tab's notes line up with a recording (video sync without tapping)
//   loopTempo   a recorded loop's tempo from its length + onsets (it's a whole number of beats)
//   guessTabTempo  a pasted tab: a likely tempo from how busy its rhythm is
// Pure maths (no Web Audio), so it runs on decoded files, captured sound and in tests.
import { FFT } from './noteDetect'

export const HOP_SEC = 0.01

/** Onset strength every 10 ms. */
export function onsets(x: Float32Array, sr: number): Float32Array {
  const hop = Math.max(1, Math.round(sr * HOP_SEC))
  const n = 1 << Math.round(Math.log2(sr * 0.046)) // ~46 ms window
  const fft = new FFT(n)
  const win = new Float32Array(n)
  for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
  const frames = Math.max(0, Math.floor((x.length - n) / hop) + 1)
  const out = new Float32Array(frames)
  const half = n / 2
  // up to ~8 kHz is where picking and drums show
  const top = Math.min(half, Math.round((8000 * n) / sr))
  let prev = new Float32Array(top)
  const cur = new Float32Array(top)
  const re = new Float32Array(n), im = new Float32Array(n)
  for (let f = 0; f < frames; f++) {
    const o = f * hop
    for (let i = 0; i < n; i++) { re[i] = x[o + i] * win[i]; im[i] = 0 }
    fft.run(re, im)
    let s = 0
    for (let k = 1; k < top; k++) {
      const m = Math.log1p(100 * Math.hypot(re[k], im[k]))
      cur[k] = m
      const d = m - prev[k]
      if (d > 0) s += d
    }
    out[f] = f ? s : 0
    prev = cur.slice()
  }
  // a frame peaks as soon as the attack enters its window: move each frame to where the attack really was
  const shift = Math.max(0, Math.round((n / sr - 0.006) / HOP_SEC))
  // take away the slow trend (a centred moving average over ~0.4 s) and keep what sticks up
  const w = 20
  const pre = new Float64Array(frames + 1)
  for (let i = 0; i < frames; i++) pre[i + 1] = pre[i] + out[i]
  const res = new Float32Array(frames)
  for (let i = 0; i < frames; i++) {
    const lo = Math.max(0, i - w), hi = Math.min(frames, i + w + 1)
    const v = out[i] - (pre[hi] - pre[lo]) / (hi - lo)
    if (v > 0 && i + shift < frames) res[i + shift] = v
  }
  let mx = 0
  for (let i = 0; i < frames; i++) if (res[i] > mx) mx = res[i]
  if (mx > 0) for (let i = 0; i < frames; i++) res[i] /= mx
  return res
}

export interface TempoGuess {
  /** quarter-note BPM */
  bpm: number
  /** 0..1: how clear the beat was */
  confidence: number
  /** half / double tempo, the usual mix-ups */
  alts: number[]
}

/** A tempo prior: log-normal around 110 BPM (most songs sit 70–160). */
const prior = (bpm: number) => Math.exp(-0.5 * Math.pow(Math.log2(bpm / 110) / 0.9, 2))

/** Tempo from an onset envelope. */
export function tempoFromOnsets(raw: Float32Array, o: { min?: number; max?: number; hop?: number } = {}): TempoGuess | null {
  const hop = o.hop ?? HOP_SEC
  const min = o.min ?? 40, max = o.max ?? 240
  // onset peaks are one frame wide: widen them so a beat period that isn't a whole number of frames still lines up
  const env = smooth(raw, 2)
  const n = env.length
  if (n < 2 / hop) return null
  const lagMin = Math.max(2, Math.floor(60 / max / hop)), lagMax = Math.min(n - 1, Math.ceil(60 / min / hop))
  const ac = new Float32Array(lagMax + 2)
  let e0 = 0
  for (let i = 0; i < n; i++) e0 += env[i] * env[i]
  if (e0 < 1e-9) return null
  for (let L = 1; L <= Math.min(lagMax * 4, n - 1) && L < ac.length; L++) {
    let s = 0
    for (let i = L; i < n; i++) s += env[i] * env[i - L]
    ac[L] = s / (n - L) / (e0 / n)
  }
  // longer lags (for the harmonics)
  const acAt = (L: number) => {
    if (L < ac.length) return ac[L]
    if (L >= n - 1) return 0
    let s = 0
    for (let i = L; i < n; i++) s += env[i] * env[i - L]
    return s / (n - L) / (e0 / n)
  }
  // score each lag: itself plus its multiples (a real beat repeats), weighted by the prior
  let best = -1, bestL = 0
  const score = new Float32Array(lagMax + 1)
  for (let L = lagMin; L <= lagMax; L++) {
    const v = acAt(L) + 0.5 * acAt(2 * L) + 0.33 * acAt(3 * L) + 0.25 * acAt(4 * L)
    score[L] = v * prior(60 / (L * hop))
    if (score[L] > best) { best = score[L]; bestL = L }
  }
  if (!bestL) return null
  // candidates: the strongest few peaks, and each at half and double
  const peaks: number[] = []
  for (let L = lagMin + 1; L < lagMax; L++) if (score[L] > score[L - 1] && score[L] >= score[L + 1]) peaks.push(L)
  peaks.sort((x, y) => score[y] - score[x])
  const cands = new Set<number>()
  for (const L of peaks.slice(0, 6)) {
    const a = score[L - 1], b = score[L], c = score[L + 1]
    const den = a - 2 * b + c
    const frac = den < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den)) : 0
    const bp = 60 / ((L + frac) * hop)
    for (const r of [1, 0.5, 2]) if (bp * r >= min && bp * r <= max) cands.add(Math.round(bp * r * 10) / 10)
  }
  // the beat is where notes land most strongly, at a likely tempo; if the half-way points are about as strong as
  // the beats, the real beat is twice as fast (a backbeat: kick on 1 and 3, snare on 2 and 4)
  const total = env.reduce((x, y) => x + y, 0) / n
  const level = (b: number) => {
    const { on, mid } = grid(env, 60 / b / hop)
    const split = mid > on * 0.8 && b * 2 <= max ? 0.85 : 1
    return (on / (total + 1e-9)) * Math.sqrt(prior(b)) * split
  }
  let bpm = 0, bestLevel = -1
  for (const b of cands) { const v = level(b); if (v > bestLevel) { bestLevel = v; bpm = b } }
  bpm = refine(env, bpm, hop)
  // confidence: how far the winner stands above the average lag
  let mean = 0
  for (let L = lagMin; L <= lagMax; L++) mean += score[L]
  mean /= lagMax - lagMin + 1
  const confidence = Math.max(0, Math.min(1, (best - mean) / (best + 1e-9)))
  return { bpm: Math.round(bpm * 10) / 10, confidence, alts: [bpm / 2, bpm * 2, bpm * 1.5, (bpm * 2) / 3].filter(x => x >= min && x <= max).map(x => Math.round(x * 10) / 10) }
}

/** Gaussian smoothing (sigma in frames). */
export function smooth(x: Float32Array, sigma: number): Float32Array {
  const r = Math.ceil(sigma * 2.5)
  const k: number[] = []
  let sum = 0
  for (let i = -r; i <= r; i++) { const v = Math.exp(-0.5 * (i / sigma) ** 2); k.push(v); sum += v }
  const out = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) {
    let s = 0
    for (let j = -r; j <= r; j++) { const q = i + j; if (q >= 0 && q < x.length) s += x[q] * k[j + r] }
    out[i] = s / sum
  }
  return out
}

/** How strongly the onsets fall on a grid of this period (frames), at its best phase: the mean onset on the grid. */
function comb(env: Float32Array, P: number): number { return grid(env, P).on }
/** The mean onset on the grid at its best phase (`on`) and half way between (`mid`). */
function grid(env: Float32Array, P: number): { on: number; mid: number } {
  const n = env.length
  const at = (t: number) => { const i = Math.floor(t), f = t - i; return i + 1 < n ? env[i] * (1 - f) + env[i + 1] * f : 0 }
  let best = { on: 0, mid: 0 }
  const phases = Math.ceil(P)
  for (let ph = 0; ph < phases; ph++) {
    let s = 0, m = 0, k = 0
    for (let t = ph; t < n - 1; t += P, k++) { s += at(t); m += at(t + P / 2) }
    if (k && s / k > best.on) best = { on: s / k, mid: m / k }
  }
  return best
}

/** Line a beat comb up with the whole recording to get the tempo to a tenth of a BPM. */
function refine(env: Float32Array, bpm: number, hop: number): number {
  let best = bpm, bestS = -1
  for (let d = -0.04; d <= 0.04 + 1e-9; d += 0.002) {
    const b = bpm * (1 + d)
    const s = comb(env, 60 / b / hop)
    if (s > bestS) { bestS = s; best = b }
  }
  return best
}

/** Beat times (seconds) at about this tempo: a dynamic-programming beat tracker (beats on strong onsets, evenly spaced). */
export function trackBeats(env: Float32Array, bpm: number, hop = HOP_SEC, tight = 100): number[] {
  const n = env.length
  const P = 60 / bpm / hop
  if (n < P * 2) return []
  const score = new Float32Array(n)
  const back = new Int32Array(n).fill(-1)
  const lo = Math.round(P / 2), hi = Math.round(P * 2)
  for (let i = 0; i < n; i++) {
    let bestV = 0, bestJ = -1
    for (let j = i - hi; j <= i - lo; j++) {
      if (j < 0) continue
      const r = Math.log((i - j) / P)
      const v = score[j] - tight * r * r * 0.01
      if (v > bestV || bestJ < 0) { bestV = v; bestJ = j }
    }
    score[i] = env[i] + (bestJ >= 0 ? Math.max(0, bestV) : 0)
    back[i] = bestV > 0 ? bestJ : -1
  }
  // end on the best beat in the last period
  let end = n - 1, bestEnd = -1
  for (let i = Math.max(0, n - Math.round(P)); i < n; i++) if (score[i] > bestEnd) { bestEnd = score[i]; end = i }
  const beats: number[] = []
  for (let i = end; i >= 0; i = back[i]) { beats.push(i * hop); if (back[i] < 0) break }
  return beats.reverse()
}

export interface MeterGuess { num: number; den: number; confidence: number; /** index of the first downbeat in the beats */ downbeat: number }

/** Time signature from the beats: which beats are accented, and whether beats split in two or three. */
export function guessMeter(env: Float32Array, beats: number[], hop = HOP_SEC): MeterGuess {
  if (beats.length < 8) return { num: 4, den: 4, confidence: 0, downbeat: 0 }
  const at = (t: number) => { const i = Math.round(t / hop); let m = 0; for (let k = i - 2; k <= i + 2; k++) if (k >= 0 && k < env.length && env[k] > m) m = env[k]; return m }
  const acc = beats.map(at)
  const mean = acc.reduce((a, b) => a + b, 0) / acc.length || 1
  let best = { num: 4, s: -Infinity, ph: 0 }
  for (const g of [2, 3, 4, 5, 7]) {
    for (let ph = 0; ph < g; ph++) {
      let on = 0, cOn = 0, off = 0, cOff = 0
      acc.forEach((v, i) => { if ((i - ph + g * 100) % g === 0) { on += v; cOn++ } else { off += v; cOff++ } })
      if (!cOn || !cOff) continue
      // contrast of the downbeat over the others; 4 (and 2) are the usual, so the others need a clearer accent
      const s = (on / cOn - off / cOff) / mean - (g === 4 ? 0 : g === 2 || g === 3 ? 0.05 : 0.15)
      if (s > best.s) best = { num: g, s, ph }
    }
  }
  // 2 and 4 look alike: call it 4 unless the accent repeats every other beat much more strongly
  let num = best.num === 2 ? 4 : best.num
  // beats split in three (6/8, 12/8)?
  let two = 0, three = 0
  for (let i = 0; i + 1 < beats.length; i++) {
    const d = beats[i + 1] - beats[i]
    two += at(beats[i] + d / 2)
    three += (at(beats[i] + d / 3) + at(beats[i] + (2 * d) / 3)) / 2
  }
  let den = 4
  if (three > two * 1.25 && (num === 4 || num === 2 || num === 3)) { den = 8; num = num === 3 ? 9 : num === 4 ? 12 : 6 }
  return { num, den, confidence: Math.max(0, Math.min(1, best.s)), downbeat: best.ph }
}

export interface Analysis { bpm: number; confidence: number; alts: number[]; beats: number[]; meter: MeterGuess; /** seconds of the first downbeat */ firstDownbeat: number }

/** Everything at once from a recording (mono samples). Compound meters give the quarter-note BPM (6/8 at ♩. = 60 → 90). */
export function analyse(x: Float32Array, sr: number): Analysis | null {
  const env = onsets(x, sr)
  const g = tempoFromOnsets(env)
  if (!g) return null
  const beats = trackBeats(env, g.bpm)
  const meter = guessMeter(env, beats)
  const firstDownbeat = beats[meter.downbeat] ?? beats[0] ?? 0
  return { ...g, beats, meter, firstDownbeat }
}

/**
 * Where a tab lines up with a recording: the video time of beat 0 (offset) and the recording's tempo, found by sliding
 * the tab's note starts along the onsets. `noteSecs` = seconds of each note from beat 0 at `bpm`.
 */
export function alignTab(env: Float32Array, noteSecs: number[], bpm: number, o: { hop?: number; spread?: number; maxOffset?: number } = {}): { offset: number; bpm: number; score: number } | null {
  const hop = o.hop ?? HOP_SEC
  const notes = noteSecs.filter(s => s >= 0).slice(0, 160)
  if (notes.length < 4 || env.length < 50) return null
  // smear the onsets a little so near misses still count
  const sm = new Float32Array(env.length)
  for (let i = 0; i < env.length; i++) sm[i] = Math.max(env[i], 0.7 * (env[i - 1] ?? 0), 0.7 * (env[i + 1] ?? 0), 0.4 * (env[i - 2] ?? 0), 0.4 * (env[i + 2] ?? 0))
  const spread = o.spread ?? 0.06
  const maxOff = Math.min(env.length * hop, o.maxOffset ?? env.length * hop)
  let best = { offset: 0, bpm, score: -1 }
  for (let d = -spread; d <= spread + 1e-9; d += 0.005) {
    const r = 1 / (1 + d)
    const ts = notes.map(s => s * r)
    const last = ts[ts.length - 1]
    for (let off = 0; off * hop <= maxOff; off++) {
      let s = 0, k = 0
      for (const t of ts) {
        const i = off + Math.round(t / hop)
        if (i >= sm.length) break
        s += sm[i]; k++
      }
      if (k < Math.min(notes.length, 4)) break
      const v = s / notes.length
      if (v > best.score) best = { offset: off * hop, bpm: bpm * (1 + d), score: v }
      void last
    }
  }
  return best.score > 0 ? { offset: Math.round(best.offset * 1000) / 1000, bpm: Math.round(best.bpm * 10) / 10, score: best.score } : null
}

/** A recorded loop is a whole number of beats long: the tempo from its length that best matches its onsets. */
export function loopTempo(x: Float32Array, sr: number): { bpm: number; beats: number } | null {
  const dur = x.length / sr
  if (dur < 0.8) return null
  const g = tempoFromOnsets(onsets(x, sr))
  let best: { bpm: number; beats: number; err: number } | null = null
  for (let beats = 2; beats <= 64; beats++) {
    const bpm = (60 * beats) / dur
    if (bpm < 50 || bpm > 200) continue
    // whole bars are much more likely than odd beats
    const shape = beats % 4 === 0 ? 0 : beats % 3 === 0 ? 0.04 : beats % 2 === 0 ? 0.08 : 0.15
    // near a tempo heard in it (or a related one), at a likely tempo, in whole bars
    const heard = g ? Math.min(...[g.bpm, ...g.alts].map(t => Math.abs(Math.log2(bpm / t)))) : 0
    const err = heard + shape + 0.15 * Math.abs(Math.log2(bpm / 105))
    if (!best || err < best.err) best = { bpm, beats, err }
  }
  return best ? { bpm: Math.round(best.bpm * 10) / 10, beats: best.beats } : null
}

/** A tab with no tempo: a likely one from its busiest common note length (16ths → steady, whole notes → ballad). */
export function guessTabTempo(durs: number[]): number {
  const notes = durs.filter(d => d > 0)
  if (!notes.length) return 90
  const count = new Map<number, number>()
  for (const d of notes) { const k = Math.round(d * 8) / 8; count.set(k, (count.get(k) ?? 0) + 1) }
  const common = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0]
  if (common <= 0.17) return 72 // 32nds and sextuplets: a slow, busy line
  if (common <= 0.26) return 90 // 16ths
  if (common <= 0.34) return 100 // triplets
  if (common <= 0.55) return 110 // 8ths
  if (common <= 1.05) return 100 // quarters
  return 80 // half and whole notes: a ballad or a chord chart
}

/** Tap tempo: the median gap of the last taps (needs 4+). */
export function tapBpm(taps: number[]): number | null {
  const ts = taps.slice(-9)
  if (ts.length < 4) return null
  const gaps = ts.slice(1).map((t, i) => t - ts[i]).sort((a, b) => a - b)
  const g = gaps[Math.floor(gaps.length / 2)]
  return g > 0 ? Math.round(60000 / g) : null
}

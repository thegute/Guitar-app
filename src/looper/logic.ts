// The 4-track looper's maths (no audio here, so it can be tested): where each track is in its own cycle, how long a
// loop closed by hand becomes, how an overdub that ran several times round folds into one loop, the lead track's
// loudness curve that dips the others (auto-ducking), the first free loop setting the tempo, and waveform peaks.

/** Lengths a loop can be, as multiples of the beat's length. */
export const MULTS = [1, 2, 4, 8] as const
export type Mult = (typeof MULTS)[number]

/** Where a track is in its cycle at absolute bar `bar` (fractional), for a track `len` bars long starting on `origin`. */
export function phaseBars(bar: number, origin: number, len: number): number {
  return (((bar - origin) % len) + len) % len
}

/** The first cycle start at or after bar `bar` (bar numbers count from the transport's start). */
export function nextCycleBar(bar: number, origin: number, len: number): number {
  const p = phaseBars(bar, origin, len)
  return p < 1e-9 ? bar : bar + (len - p)
}

/**
 * The bar a command pressed now acts on: the next bar line, or the one just gone when you pressed a hair late
 * (within `graceSec`: the input keeps what it heard, so the take can still start exactly on that beat 1).
 */
export function armBar(bar: number, barDur: number, graceSec = 0.12): number {
  const f = Math.floor(bar + 1e-9)
  return (bar - f) * barDur <= graceSec ? f : f + 1
}

/**
 * A loop closed by hand ("Auto" length): the allowed length (base × 1, 2, 4 or 8 bars) nearest to what was played.
 * When you close a little early it records on to that length; a little late, it ends there. Never shorter than 1 base.
 */
export function autoLength(playedBars: number, base: number): number {
  const opts = MULTS.map(m => m * base)
  let best = opts[0]
  for (const o of opts) if (Math.abs(Math.log(o / Math.max(0.01, playedBars))) < Math.abs(Math.log(best / Math.max(0.01, playedBars)))) best = o
  return best
}

/**
 * An overdub that started at `phase0` (samples into the loop) and ran `x.length` samples, folded into one loop
 * `len` samples long: every time round adds on top, like a real looper.
 */
export function foldTake(x: Float32Array, len: number, phase0: number): Float32Array {
  const out = new Float32Array(len)
  const p = ((Math.round(phase0) % len) + len) % len
  for (let k = 0; k < x.length; k++) out[(p + k) % len] += x[k]
  return out
}

/** Sum takes (all the same length) into the loop you hear; peaks kept under control with a soft limit. */
export function mixTakes(takes: Float32Array[], len: number): Float32Array {
  const out = new Float32Array(len)
  for (const t of takes) for (let i = 0; i < Math.min(len, t.length); i++) out[i] += t[i]
  for (let i = 0; i < len; i++) { const v = out[i]; if (Math.abs(v) > 0.8) out[i] = Math.sign(v) * (0.8 + 0.19 * Math.tanh((Math.abs(v) - 0.8) / 0.19)) }
  return out
}

/**
 * Smooth the join where the loop goes round: what you played just after the loop's end (`after`, recorded past it)
 * is crossfaded into its start, so the end flows into the start with no click or gap.
 */
export function smoothSeam(x: Float32Array, after: Float32Array): Float32Array {
  const n = Math.min(after.length, x.length >> 3)
  if (n < 2) return x
  const out = x.slice()
  for (let i = 0; i < n; i++) { const a = (1 - Math.cos((Math.PI * i) / n)) / 2; out[i] = x[i] * a + after[i] * (1 - a) }
  return out
}

/**
 * Auto-ducking: how much the other tracks dip while the lead plays. One value per `stepSec` of the lead loop:
 * 1 = full volume, down to 1 − depth when the lead is at its loudest. Fast to dip (20 ms), slower to come back (250 ms).
 */
export function duckCurve(x: Float32Array, sr: number, depth = 0.35, stepSec = 0.02): Float32Array {
  const hop = Math.max(1, Math.round(sr * stepSec))
  const n = Math.max(1, Math.floor(x.length / hop))
  const env = new Float32Array(n)
  for (let i = 0; i < n; i++) { let s = 0; for (let k = i * hop; k < Math.min(x.length, (i + 1) * hop); k++) s += x[k] * x[k]; env[i] = Math.sqrt(s / hop) }
  const sorted = Array.from(env).sort((a, b) => a - b)
  const top = sorted[Math.floor(sorted.length * 0.9)] || 0
  const floor = sorted[Math.floor(sorted.length * 0.2)] || 0
  const out = new Float32Array(n)
  if (top < 1e-4) { out.fill(1); return out }
  const up = 1 - Math.exp(-stepSec / 0.02), down = 1 - Math.exp(-stepSec / 0.25)
  let g = 0
  for (let pass = 0; pass < 2; pass++) {
    // twice round, so the start of the loop already knows how the end left it
    for (let i = 0; i < n; i++) {
      const lvl = Math.max(0, Math.min(1, (env[i] - floor) / Math.max(1e-6, top - floor)))
      g += (lvl - g) * (lvl > g ? up : down)
      if (pass === 1) out[i] = 1 - depth * g
    }
  }
  return out
}

/** The first loop, played freely, sets the tempo: whole bars that fit exactly in it (beats from the pulse heard in it). */
export function tempoFromLoop(secs: number, heardBeats: number | null, bpmNow: number): { bpm: number; bars: number } {
  const fit = (bars: number) => (bars * 4 * 60) / secs
  if (heardBeats && heardBeats % 4 === 0) {
    const bars = heardBeats / 4
    const bpm = fit(bars)
    if (bpm >= 40 && bpm <= 240) return { bpm, bars }
  }
  // no clear pulse: the bar count (1, 2, 4, 8) that keeps the tempo nearest to the one you had
  let best = { bpm: fit(1), bars: 1 }
  for (const bars of [1, 2, 4, 8]) {
    const bpm = fit(bars)
    if (bpm < 40 || bpm > 240) continue
    if (Math.abs(Math.log(bpm / bpmNow)) < Math.abs(Math.log(best.bpm / bpmNow)) || best.bpm < 40 || best.bpm > 240) best = { bpm, bars }
  }
  return best
}

/** Peaks for drawing a waveform (`n` bars of the picture, 0..1). */
export function peaks(x: Float32Array, n = 120): Float32Array {
  const out = new Float32Array(n)
  const per = Math.max(1, Math.floor(x.length / n))
  let top = 0
  for (let i = 0; i < n; i++) {
    let m = 0
    for (let k = i * per; k < Math.min(x.length, (i + 1) * per); k += 3) m = Math.max(m, Math.abs(x[k]))
    out[i] = m
    top = Math.max(top, m)
  }
  if (top > 0) for (let i = 0; i < n; i++) out[i] /= top
  return out
}

/** Equal pieces of a loop, cut on the beat grid (for "Chop onto pads" by beats). */
export function equalSlices(lenSecs: number, pieces: number): { start: number; end: number }[] {
  return Array.from({ length: pieces }, (_, i) => ({ start: (lenSecs * i) / pieces, end: (lenSecs * (i + 1)) / pieces }))
}

// Playing or talking? Tells guitar playing apart from speech and singing, so "Find the chords" only writes down
// music. What it listens for:
// - a picked note starts sharply and fades; a voice swells in and holds;
// - a guitar note sits on one pitch, then jumps to the next; speech slides about all the time, singing glides
//   and wobbles (vibrato);
// - speech is full of hiss ("s", "t", "ch"): noisy, not tonal.
import { FFT } from './noteDetect'

export type Heard = 'quiet' | 'playing' | 'talking' | 'singing'
export interface GateFrame {
  t: number
  /** RMS level of the frame */
  level: number
  /** pitch (fractional MIDI) when there's a clear one */
  midi: number | null
  /** how noise-like the upper spectrum is, 0 (pure tones) .. 1 (hiss) */
  flatness: number
  /** a sharp attack starts here */
  onset: boolean
}

const QUIET = 0.004

/** Level, upper-band flatness and spectral flux of one frame of samples. */
export class FrameFeatures {
  private fft: FFT
  private win: Float32Array
  private re: Float32Array
  private im: Float32Array
  private prev: Float32Array | null = null
  private fluxes: number[] = []
  private levels: number[] = []
  private since = 99
  constructor(private sr: number, private n = 2048) {
    this.fft = new FFT(n)
    this.win = new Float32Array(n)
    for (let i = 0; i < n; i++) this.win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
    this.re = new Float32Array(n)
    this.im = new Float32Array(n)
  }
  run(x: Float32Array): { level: number; flatness: number; onset: boolean } {
    const n = this.n, off = Math.max(0, x.length - n)
    let s = 0
    for (let i = 0; i < n; i++) { const v = x[off + i] ?? 0; s += v * v; this.re[i] = v * this.win[i]; this.im[i] = 0 }
    const level = Math.sqrt(s / n)
    this.fft.run(this.re, this.im)
    const binHz = this.sr / n
    const mag = new Float32Array(n / 2)
    for (let i = 0; i < n / 2; i++) mag[i] = Math.hypot(this.re[i], this.im[i])
    // flatness of 1.5–8 kHz: geometric mean over arithmetic mean of power
    const lo = Math.floor(1500 / binHz), hi = Math.min(n / 2 - 1, Math.floor(8000 / binHz))
    let logSum = 0, sum = 0, k = 0
    for (let i = lo; i <= hi; i++) { const p = mag[i] * mag[i] + 1e-12; logSum += Math.log(p); sum += p; k++ }
    const flatness = k ? Math.exp(logSum / k) / (sum / k) : 0
    // spectral flux (log magnitude rises) from 80 Hz to 5 kHz
    let flux = 0
    const a = Math.floor(80 / binHz), b = Math.floor(5000 / binHz)
    if (this.prev) for (let i = a; i < b; i++) { const d = Math.log1p(40 * mag[i]) - Math.log1p(40 * this.prev[i]); if (d > 0) flux += d }
    this.prev = mag
    const med = this.fluxes.length ? [...this.fluxes].sort((p, q) => p - q)[Math.floor(this.fluxes.length / 2)] : flux
    const floor = this.levels.length ? Math.min(...this.levels) : level
    // one attack is one onset: nothing new for the next few frames
    this.since++
    const rising = level > (this.levels[this.levels.length - 1] ?? 0) * 1.15
    const onset = this.since > 3 && level > QUIET && rising && ((flux > med * 2.2 && flux > 4) || level > floor * 1.8)
    if (onset) this.since = 0
    this.fluxes.push(flux); if (this.fluxes.length > 25) this.fluxes.shift()
    this.levels.push(level); if (this.levels.length > 4) this.levels.shift()
    return { level, flatness, onset }
  }
}

/** Decides, over the last second or so, whether it's hearing playing, talking, singing or nothing. */
export class VoiceGate {
  state: Heard = 'quiet'
  private frames: GateFrame[] = []
  private pending: Heard = 'quiet'
  private run = 0
  constructor(private window = 1.2) {}

  push(f: GateFrame): Heard {
    this.frames.push(f)
    while (this.frames.length && f.t - this.frames[0].t > this.window) this.frames.shift()
    const raw = this.classify()
    // change state only after it's held for a few frames (no flicker)
    if (raw === this.pending) this.run++
    else { this.pending = raw; this.run = 1 }
    // back to "playing" after a voice takes longer: a few guitar-like frames in a sentence don't count
    const need = raw === 'quiet' ? 4 : raw === 'playing' ? (this.state === 'talking' || this.state === 'singing' ? 7 : 2) : 4
    if (this.run >= need) this.state = raw
    return this.state
  }

  /** The numbers behind the decision (for tests and the debug readout). */
  features() {
    const fr = this.frames
    const loud = fr.filter(x => x.level > QUIET)
    let stable = 0, glide = 0, voiced = 0
    // how long the voiced stretches last: sung notes are long, spoken syllables short
    const runs: number[] = []
    let runStart = -1
    for (let i = 0; i <= fr.length; i++) {
      const v = i < fr.length && fr[i].midi !== null && fr[i].level > QUIET
      if (v && runStart < 0) runStart = i
      if (!v && runStart >= 0) { runs.push(fr[i - 1].t - fr[runStart].t); runStart = -1 }
    }
    for (let i = 1; i < fr.length; i++) {
      const a = fr[i - 1].midi, b = fr[i].midi
      if (a === null || b === null || fr[i].level <= QUIET) continue
      voiced++
      const d = Math.abs(b - a)
      if (d < 0.2) stable++
      else if (d < 1.5 && !fr[i].onset) glide++
    }
    const noisy = loud.filter(x => x.flatness > 0.3 && (x.midi === null || x.flatness > 0.45)).length
    const secs = Math.max(0.2, (fr[fr.length - 1]?.t ?? 0) - (fr[0]?.t ?? 0))
    const onsets = fr.filter(x => x.onset).length
    // does the sound fade after each attack (plucked) or hold steady (a voice)?
    let fades = 0, holds = 0
    for (let i = 0; i < fr.length; i++) {
      if (!fr[i].onset) continue
      const after = fr.slice(i, i + 9).filter(x => x.level > QUIET)
      if (after.length < 6) continue
      const peak = Math.max(...after.slice(0, 3).map(x => x.level))
      const end = after[after.length - 1].level
      if (end < peak * 0.72) fades++
      else holds++
    }
    return {
      loudFrac: fr.length ? loud.length / fr.length : 0,
      noisyFrac: loud.length ? noisy / loud.length : 0,
      glideFrac: stable + glide ? glide / (stable + glide) : 0,
      voicedFrac: loud.length ? voiced / loud.length : 0,
      onsetRate: onsets / secs,
      longestRun: runs.length ? Math.max(...runs) : 0,
      fades, holds,
    }
  }

  private classify(): Heard {
    const f = this.features()
    if (f.loudFrac < 0.25) return 'quiet'
    // a sung note: a long voiced stretch that wavers (vibrato, glides) and doesn't fade like a pluck
    if (f.longestRun > 0.45 && f.glideFrac > 0.15 && f.fades === 0 && f.noisyFrac < 0.35) return 'singing'
    if (f.noisyFrac > 0.22 || (f.glideFrac > 0.42 && f.voicedFrac > 0.25)) return 'talking'
    // a voice holding notes: glides or vibrato, and no plucked attacks that fade
    if (f.glideFrac > 0.2 && f.fades === 0 && f.voicedFrac > 0.4) return 'singing'
    if (f.holds > f.fades && f.glideFrac > 0.12 && f.voicedFrac > 0.4) return 'singing'
    return 'playing'
  }
}

/** Should a note heard between these frames be kept? A pluck: a sharp start, a steady pitch, a fading level. */
export function pluckLike(frames: { level: number; midi: number | null; onset: boolean }[], attacked = false): boolean {
  if (frames.length < 2) return false
  const started = attacked || frames.slice(0, 3).some(f => f.onset)
  const ms = frames.slice(Math.min(2, frames.length - 1)).map(f => f.midi).filter((m): m is number => m !== null)
  const spread = ms.length ? Math.max(...ms) - Math.min(...ms) : 0
  const levels = frames.map(f => f.level)
  const peakAt = levels.indexOf(Math.max(...levels))
  const decays = frames.length < 5 || peakAt <= Math.max(1, Math.floor(frames.length * 0.4))
  return started && spread < 0.6 && decays
}

// The tuner's pitch: McLeod pitch (pitchy) on a filtered signal, then a steadier reading over time. Pure: no DOM,
// so tests can feed it synthetic strings.
//   - a new note shows at once; small wobbles are averaged (median of the last quarter second, then smoothed)
//   - the first moment of a pluck runs sharp: readings in the first 60 ms after a jump are left out
//   - a low string that reads an octave high for a moment (its 2nd harmonic is louder) keeps its octave
//   - with a string picked, readings fold to the octave nearest that string
import { PitchDetector } from 'pitchy'

export interface RawPitch { freq: number; clarity: number; level: number }

/** One reading from a block of samples (null freq when there's no clear note). */
export function rawPitch(det: PitchDetector<Float32Array>, buf: Float32Array, sampleRate: number): RawPitch {
  let sum = 0
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
  const rms = Math.sqrt(sum / buf.length)
  const level = Math.min(1, rms * 6)
  const [freq, clarity] = det.findPitch(buf, sampleRate)
  if (rms < 0.0025 || clarity < 0.9 || !(freq > 50 && freq < 1600)) return { freq: 0, clarity, level }
  return { freq, clarity, level }
}

export const freqToMidiA = (f: number, a4 = 440) => 69 + 12 * Math.log2(f / a4)

export interface Steady {
  /** fractional MIDI note, A4 as set */
  midi: number
  /** cents from the nearest note (or from the picked string), to 0.1 */
  cents: number
  /** the note the cents are measured from */
  note: number
  freq: number
  /** readings agree within a few cents */
  stable: boolean
}

export class TunerSmoother {
  private hist: { t: number; m: number }[] = []
  private est: number | null = null
  private since = 0
  private lastSeen = -1
  private octaveRun = 0
  a4 = 440
  /** a picked string (MIDI note), or null for automatic */
  target: number | null = null

  reset() { this.hist = []; this.est = null; this.octaveRun = 0 }

  /** `t` in seconds. Returns the steady reading, or null when nothing has been heard for a moment. */
  push(t: number, freq: number, clarity = 1): Steady | null {
    if (!freq) {
      if (this.lastSeen >= 0 && t - this.lastSeen > 0.9) this.reset()
      return this.current()
    }
    this.lastSeen = t
    let m = freqToMidiA(freq, this.a4)
    // with a string picked, fold to the octave closest to it
    if (this.target !== null) while (Math.abs(m - this.target) > 6.5) m += m > this.target ? -12 : 12
    const cur = this.est
    if (cur !== null && Math.abs(Math.abs(m - cur) - 12) < 0.6) {
      // a sudden octave: believe it only once it holds (about a third of a second)
      this.octaveRun++
      if (this.octaveRun < 20) m -= Math.sign(m - cur) * 12
    } else this.octaveRun = 0
    if (cur === null || Math.abs(m - cur) > 0.6) {
      // a new note: start over, and skip the sharp first moment of the pluck
      this.hist = []
      this.est = m
      this.since = t
      return this.current()
    }
    if (t - this.since < 0.06) return this.current()
    // only clean readings refine the estimate (a fading string in a noisy room gets less clear)
    if (clarity < 0.96 && this.hist.length >= 3) return this.current()
    this.hist.push({ t, m })
    // a held string: average over more readings for a steadier number; a moving one (a turning peg): follow quickly
    const h = this.hist
    const mean = (a: { m: number }[]) => a.reduce((s, x) => s + x.m, 0) / a.length
    const moving = h.length >= 8 && Math.abs(mean(h.slice(-4)) - mean(h.slice(-8, -4))) > 0.04
    const span = moving ? 0.2 : 0.5
    while (this.hist.length && t - this.hist[0].t > span) this.hist.shift()
    const sorted = this.hist.map(h => h.m).sort((a, b) => a - b)
    const k = sorted.length >> 2
    const mid = sorted.slice(k, sorted.length - k)
    const avg = mid.reduce((a, b) => a + b, 0) / mid.length
    this.est = cur + (moving ? 0.4 : 0.2) * (avg - cur)
    return this.current()
  }

  private current(): Steady | null {
    if (this.est === null) return null
    const m = this.est
    const note = this.target ?? Math.round(m)
    const cents = Math.round((m - note) * 1000) / 10
    const recent = this.hist.slice(-8).map(h => h.m)
    const spread = recent.length >= 5 ? (Math.max(...recent) - Math.min(...recent)) * 100 : Infinity
    return { midi: m, cents, note, freq: this.a4 * Math.pow(2, (m - 69) / 12), stable: spread < 8 }
  }
}

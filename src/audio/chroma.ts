// Hears which notes are in a strummed chord: after each strum it sums the spectrum into the 12 note names
// ("chroma") so a quiz can check you played, say, an A minor and not an A major.
import { audio } from './engine'
import { openInput, type OpenedInput } from './input'
import { gear, kindOf } from './gear'

/** Add one spectrum frame into 12 pitch-class weights (C..B). */
export function addChroma(spec: Float32Array, binHz: number, acc: number[]) {
  for (let i = Math.floor(70 / binHz); i < Math.min(spec.length, Math.floor(1400 / binHz)); i++) {
    const db = spec[i]
    if (db < -75) continue
    const mag = Math.pow(10, db / 20)
    const midi = 69 + 12 * Math.log2((i * binHz) / 440)
    const near = Math.round(midi)
    const off = Math.abs(midi - near)
    if (off > 0.35) continue
    // lower notes get a little extra weight; harmonics of bass notes pile up higher anyway
    acc[((near % 12) + 12) % 12] += mag * (1 - off * 2) * (midi < 60 ? 1.2 : 1)
  }
}

/**
 * Peak-only guitar chroma + dedicated low-register bass chroma (75–280 Hz).
 * Filters out room blur and rolls off high 3rd harmonics (> 680 Hz) so an 8th-fret C barre chord
 * doesn't falsely look like G major, and measures the true bass root to separate Am vs C.
 */
export function addGuitarChordChroma(spec: Float32Array, binHz: number, acc: number[], bassAcc: number[]) {
  const loBin = Math.max(2, Math.floor(72 / binHz))
  const hiBin = Math.min(spec.length - 3, Math.floor(1150 / binHz))
  let lowestStrongPeak = false

  for (let i = loBin; i < hiBin; i++) {
    const db = spec[i]
    if (db < -68) continue
    // Local spectral peak only (rejects broadband noise & acoustic body resonance)
    if (db < spec[i - 1] || db < spec[i + 1]) continue
    const localFloor = (spec[i - 2] + spec[i + 2]) * 0.5
    if (db - localFloor < 4.5) continue

    const freq = i * binHz
    const midi = 69 + 12 * Math.log2(freq / 440)
    const near = Math.round(midi)
    const off = Math.abs(midi - near)
    if (off > 0.32) continue

    const pcIdx = ((near % 12) + 12) % 12
    const mag = Math.pow(10, db / 20) * (1 - off * 2.2)

    // Roll off high overtones (> 680 Hz) so 3rd harmonics of C/G strings can't mimic a V chord
    const regWeight = freq < 360 ? 1.25 : freq < 680 ? 0.85 : 0.32
    acc[pcIdx] += mag * regWeight

    // Dedicated low-register bass root accumulator (guitar low E2=82Hz up to C#4=277Hz)
    if (freq <= 285) {
      const bassBoost = !lowestStrongPeak && db > -54 ? 1.8 : 1.0
      if (bassBoost > 1) lowestStrongPeak = true
      bassAcc[pcIdx] += mag * bassBoost
    }
  }
}

export class ChromaListener {
  /** called once per strum with 12 weights (C..B) normalised to sum 1, plus optional low-register bass weights */
  onChord?: (chroma: number[], bass?: number[]) => void
  onLevel?: (level: number) => void
  input: OpenedInput | null = null
  private analyser: AnalyserNode | null = null
  private raf = 0
  private spec = new Float32Array(8192)
  private time = new Float32Array(2048)
  private acc: number[] | null = null
  private bassAcc: number[] | null = null
  private accFrames = 0
  private startAt = 0
  private recent: number[] = []
  private lastOnset = 0
  /** loudness needed to count as a strum (from your gear setup) */
  gate = 1

  async start() {
    const ctx = audio()
    await ctx.resume()
    this.input = await openInput()
    this.gate = gear(kindOf(this.input.external)).gate
    const src = ctx.createMediaStreamSource(this.input.stream)
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 16384
    this.analyser.smoothingTimeConstant = 0
    src.connect(this.analyser)
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      this.tick(ctx)
    }
    loop()
  }
  stop() {
    cancelAnimationFrame(this.raf)
    this.input?.stream.getTracks().forEach(t => t.stop())
    this.input = null
    this.analyser = null
  }

  private tick(ctx: AudioContext) {
    const a = this.analyser
    if (!a) return
    a.getFloatTimeDomainData(this.time)
    let s = 0
    for (let i = this.time.length - 1024; i < this.time.length; i++) s += this.time[i] * this.time[i]
    const level = Math.sqrt(s / 1024)
    this.onLevel?.(level)
    const min = this.recent.length ? Math.min(...this.recent) : level
    this.recent.push(level)
    if (this.recent.length > 6) this.recent.shift()
    const now = ctx.currentTime
    if (!this.acc && level > Math.max(0.004, 0.012 * this.gate) && level > min * 2 && now - this.lastOnset > 0.5) {
      this.lastOnset = now
      this.acc = new Array(12).fill(0)
      this.bassAcc = new Array(12).fill(0)
      this.accFrames = 0
      this.startAt = now
    }
    if (!this.acc || !this.bassAcc) return
    // skip the pick noise, then listen for ~0.68 s
    if (now - this.startAt < 0.08) return
    a.getFloatFrequencyData(this.spec)
    addGuitarChordChroma(this.spec, ctx.sampleRate / a.fftSize, this.acc, this.bassAcc)
    this.accFrames++
    if (now - this.startAt > 0.72) {
      const total = this.acc.reduce((x, y) => x + y, 0)
      if (total > 1e-6) {
        const bTotal = this.bassAcc.reduce((x, y) => x + y, 0)
        const normChroma = this.acc.map(v => v / total)
        const normBass = bTotal > 1e-6 ? this.bassAcc.map(v => v / bTotal) : undefined
        this.onChord?.(normChroma, normBass)
      }
      this.acc = null
      this.bassAcc = null
    }
  }
}

/** How well a heard chroma matches a set of chord tones (0..1), compared with similar chords. */
/** `ease` (0–1) loosens the check for a chord you've told Play it misjudged ("I played it right"). */
export function chordMatch(chroma: number[], tones: number[], ease = 0): { ok: boolean; score: number } {
  const score = tones.reduce((a, t) => a + chroma[t % 12], 0)
  // every chord tone should be clearly present
  const weakest = Math.min(...tones.map(t => chroma[t % 12]))
  const outside = chroma.map((v, i) => (tones.includes(i) ? 0 : v)).sort((a, b) => b - a)[0]
  const ok = score > 0.5 - 0.1 * ease && weakest > 0.04 - 0.015 * ease && weakest > outside * (0.45 - 0.15 * ease)
  return { ok, score }
}

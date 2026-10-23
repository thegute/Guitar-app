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

export class ChromaListener {
  /** called once per strum with 12 weights (C..B), normalised to sum 1 */
  onChord?: (chroma: number[]) => void
  onLevel?: (level: number) => void
  input: OpenedInput | null = null
  private analyser: AnalyserNode | null = null
  private raf = 0
  private spec = new Float32Array(8192)
  private time = new Float32Array(2048)
  private acc: number[] | null = null
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
      this.accFrames = 0
      this.startAt = now
    }
    if (!this.acc) return
    // skip the pick noise, then listen for ~0.7 s
    if (now - this.startAt < 0.08) return
    a.getFloatFrequencyData(this.spec)
    addChroma(this.spec, ctx.sampleRate / a.fftSize, this.acc)
    this.accFrames++
    if (now - this.startAt > 0.75) {
      const total = this.acc.reduce((x, y) => x + y, 0) || 1
      this.onChord?.(this.acc.map(v => v / total))
      this.acc = null
    }
  }
}

/** How well a heard chroma matches a set of chord tones (0..1), compared with similar chords. */
export function chordMatch(chroma: number[], tones: number[]): { ok: boolean; score: number } {
  const score = tones.reduce((a, t) => a + chroma[t % 12], 0)
  // every chord tone should be clearly present
  const weakest = Math.min(...tones.map(t => chroma[t % 12]))
  const outside = chroma.map((v, i) => (tones.includes(i) ? 0 : v)).sort((a, b) => b - a)[0]
  const ok = score > 0.5 && weakest > 0.04 && weakest > outside * 0.45
  return { ok, score }
}

// Microphone pitch detection (McLeod pitch method via pitchy).
import { PitchDetector } from 'pitchy'
import { audio } from './engine'
import { openInput, type OpenedInput } from './input'
import { rawPitch, type RawPitch } from './tunerPitch'

export interface PitchReading {
  freq: number
  clarity: number
  /** input level, 0..1 */
  level: number
}

export class PitchTracker {
  private stream: MediaStream | null = null
  private analyser: AnalyserNode | null = null
  private raf = 0
  private buf: Float32Array<ArrayBuffer> = new Float32Array(4096)
  private detector = PitchDetector.forFloat32Array(4096)
  onReading?: (r: PitchReading | null) => void
  input: OpenedInput | null = null

  /** `filter`: keep 60–1400 Hz only (the tuner: less rumble and hiss, steadier readings) */
  constructor(private opts: { filter?: boolean; raw?: boolean } = {}) {}
  /** the raw readings, unthresholded (the tuner smooths them itself) */
  onRaw?: (r: RawPitch, t: number) => void

  async start() {
    const ctx = audio()
    this.input = await openInput()
    this.stream = this.input.stream
    const src = ctx.createMediaStreamSource(this.stream)
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 4096
    if (this.opts.filter) {
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 60; hp.Q.value = 0.6
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.6
      src.connect(hp).connect(lp).connect(this.analyser)
    } else src.connect(this.analyser)
    if (this.opts.raw) {
      const loop = () => {
        this.raf = requestAnimationFrame(loop)
        if (!this.analyser) return
        this.analyser.getFloatTimeDomainData(this.buf)
        this.onRaw?.(rawPitch(this.detector, this.buf, ctx.sampleRate), ctx.currentTime)
      }
      loop()
      return
    }
    this.detector.minVolumeDecibels = -50
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      if (!this.analyser) return
      this.analyser.getFloatTimeDomainData(this.buf)
      let sum = 0
      for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i]
      const level = Math.min(1, Math.sqrt(sum / this.buf.length) * 6)
      const [freq, clarity] = this.detector.findPitch(this.buf, ctx.sampleRate)
      if (clarity > 0.88 && freq > 55 && freq < 1500) this.onReading?.({ freq, clarity, level })
      else this.onReading?.(level > 0.02 ? { freq: 0, clarity, level } : null)
    }
    loop()
  }

  stop() {
    cancelAnimationFrame(this.raf)
    this.stream?.getTracks().forEach(t => t.stop())
    this.stream = null
    this.analyser = null
  }
}

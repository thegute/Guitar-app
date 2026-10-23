// Microphone pitch detection (McLeod pitch method via pitchy).
import { PitchDetector } from 'pitchy'
import { audio } from './engine'

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

  async start() {
    const ctx = audio()
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
    const src = ctx.createMediaStreamSource(this.stream)
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 4096
    src.connect(this.analyser)
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

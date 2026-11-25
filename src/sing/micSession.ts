// Shared live Vocal Mic Session with:
//  - Continuous VocalTracker (~30 fps pitch, vibrato, breath hiss, tone/resonance, smart diagnostics)
//  - Built-in 15-second "Dashcam" Vocal Mirror rolling audio buffer (1-tap "Hear Me Back" anytime!)
//  - Clean cleanup on unmount & zero interference with guitar's noteDetect.ts
import { audio } from '../audio/engine'
import { openInput, type OpenedInput } from '../audio/input'
import { VocalTracker, type VocalFrame } from './vocalEngine'
import { addVocalSeconds, getSingProfile } from './profile'

export interface MirrorSnapshot {
  samples: Float32Array
  sr: number
  /** recorded pitch contour alongside the clip */
  trail: { t: number; midi: number | null; target: number | null }[]
  duration: number
}

export class VocalMicSession {
  private input: OpenedInput | null = null
  private src: MediaStreamAudioSourceNode | null = null
  private analyser: AnalyserNode | null = null
  private proc: ScriptProcessorNode | null = null
  private silentGain: GainNode | null = null
  private tracker: VocalTracker | null = null
  private buf = new Float32Array(2048)
  private raf = 0
  private active = false
  private startT = 0
  private lastStatT = 0

  // 15-second circular "Dashcam" audio tape for instant Vocal Mirror replay
  private sr = 48000
  private tape: Float32Array | null = null
  private tapeWrite = 0
  private tapeTotal = 0
  private trail: { t: number; midi: number | null; target: number | null }[] = []

  targetMidi: number | null = null
  onFrame?: (f: VocalFrame) => void
  onError?: (msg: string) => void

  get running() { return this.active }
  get inputLabel() { return this.input?.label ?? 'Microphone' }

  async start(): Promise<boolean> {
    if (this.active) return true
    try {
      const ctx = audio()
      if (ctx.state === 'suspended') await ctx.resume()
      const opened = await openInput()
      this.input = opened
      this.sr = ctx.sampleRate
      this.tape = new Float32Array(this.sr * 15)
      this.tapeWrite = 0
      this.tapeTotal = 0
      this.trail = []

      const prof = getSingProfile()
      const tracker = new VocalTracker(this.sr, 2048)
      tracker.comfortHigh = prof.comfortHigh
      tracker.passaggioMidi = prof.passaggioMidi
      this.tracker = tracker

      const src = ctx.createMediaStreamSource(opened.stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0
      src.connect(analyser)

      // Lightweight rolling dashcam capture into circular tape
      if (typeof ctx.createScriptProcessor === 'function') {
        const proc = ctx.createScriptProcessor(2048, 1, 1)
        const silent = ctx.createGain()
        silent.gain.value = 0
        proc.onaudioprocess = ev => {
          if (!this.active || !this.tape) return
          const ch = ev.inputBuffer.getChannelData(0)
          const L = this.tape.length
          for (let i = 0; i < ch.length; i++) {
            this.tape[this.tapeWrite] = ch[i]
            this.tapeWrite = (this.tapeWrite + 1) % L
            this.tapeTotal++
          }
        }
        src.connect(proc)
        proc.connect(silent)
        silent.connect(ctx.destination)
        this.proc = proc
        this.silentGain = silent
      }

      this.src = src
      this.analyser = analyser
      this.active = true
      this.startT = performance.now() / 1000
      this.lastStatT = this.startT
      this.loop()
      return true
    } catch (e) {
      this.onError?.(e instanceof Error ? e.message : 'Could not open the microphone.')
      return false
    }
  }

  stop() {
    this.active = false
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0 }
    try { this.proc?.disconnect() } catch { /* ignore */ }
    try { this.silentGain?.disconnect() } catch { /* ignore */ }
    try { this.analyser?.disconnect() } catch { /* ignore */ }
    try { this.src?.disconnect() } catch { /* ignore */ }
    this.input?.stream.getTracks().forEach(t => t.stop())
    this.proc = null
    this.silentGain = null
    this.analyser = null
    this.src = null
    this.input = null
  }

  /** Grab the last `seconds` (up to 15s) from the Dashcam Vocal Mirror buffer! */
  captureLast(seconds = 8): MirrorSnapshot | null {
    if (!this.tape || this.tapeTotal < this.sr * 0.4) return null
    const want = Math.min(this.tapeTotal, this.tape.length, Math.round(seconds * this.sr))
    const out = new Float32Array(want)
    const L = this.tape.length
    const start = (this.tapeWrite - want + L) % L
    for (let i = 0; i < want; i++) out[i] = this.tape[(start + i) % L]
    const dur = want / this.sr
    const nowT = performance.now() / 1000 - this.startT
    const minT = nowT - dur
    const trail = this.trail
      .filter(p => p.t >= minT)
      .map(p => ({ t: Math.max(0, p.t - minT), midi: p.midi, target: p.target }))
    return { samples: out, sr: this.sr, trail, duration: dur }
  }

  private loop = () => {
    if (!this.active || !this.analyser || !this.tracker) return
    this.analyser.getFloatTimeDomainData(this.buf)
    const now = performance.now() / 1000
    const relT = now - this.startT
    const frame = this.tracker.process(this.buf, relT, this.targetMidi)

    // Keep last 15s of pitch trail synced with dashcam tape
    this.trail.push({ t: relT, midi: frame.centerMidi ?? frame.midi, target: this.targetMidi })
    while (this.trail.length && relT - this.trail[0].t > 15.5) this.trail.shift()

    // Count active singing seconds toward Vocal Health Guard
    if (frame.midi !== null && now - this.lastStatT >= 3) {
      addVocalSeconds(3)
      this.lastStatT = now
    }

    this.onFrame?.(frame)
    this.raf = requestAnimationFrame(this.loop)
  }
}

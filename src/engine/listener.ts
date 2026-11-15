// Shared note listener with isolated per-consumer configurations and smart speaker-bleed suppression
// (Engine Week Part 2, notes/ENGINE-WEEK.md + Safeguards #2 & #3 + Upgrades #3 & #4).
//
// - One hardware capture pipeline (`SharedCaptureHub`: `openInput` + `kg-capture` AudioWorklet + rolling audio tape)
//   feeds isolated `ListenerSession`s (`acquireListener(id, config)`).
// - Safeguard #3: Each consumer (`play`, `target-notes`, `call-response`, `improv-coach`, `quiz`, `ear-trainer`,
//   `tools`, `gear-setup`, `looper`) owns a strictly isolated configuration (`strictOctave`, `chords`, `autoGate`,
//   `gate`, `allowSinging`, `rollingClipSeconds`, `suppressBleed`, `expect`) that can never leak to another screen.
// - Safeguard #2 + Upgrade #4: On the phone mic profile (`kindOf(external) === 'mic'`), the detector queries
//   `backingNotesAt(ctxTime, latencySec)` from `src/engine/clock.ts` to suppress KGuitar's own backing/guide bleed
//   while still accepting fresh pick attacks from the player's guitar on those same notes. On `usb` and `pedal`
//   profiles (direct guitar input), bleed suppression is completely bypassed.
import { audio } from '../audio/engine'
import { openInput, type OpenedInput } from '../audio/input'
import { gear, kindOf, latencyMs, type InputKind } from '../audio/gear'
import { addChroma } from '../audio/chroma'
import { NoteDetector, type DetectedNote } from '../audio/noteDetect'
import { backingNotesAt } from './clock'

export interface ListenerNoteEvent {
  midi: number
  time: number
  /** true when triggered by a fresh pick attack, false for a legato change (hammer-on, slide) */
  attack: boolean
  expected?: boolean
  conf?: number
}

export interface ListenerConfig {
  strictOctave?: boolean
  chords?: boolean
  autoGate?: boolean
  gate?: number
  allowSinging?: boolean
  rollingClipSeconds?: number
  /** Suppress KGuitar's own scheduled backing/guide bleed on the phone mic (default true; always bypassed on USB/pedal). */
  suppressBleed?: boolean
  expectNow?: number[]
  expectNext?: number[]
}

/** Default rolling audio tape length (seconds) for Coach replay/comparison. */
export const DEFAULT_TAPE_SECONDS = 20

/** Cut a slice `[from, to]` (in AudioContext seconds) from a circular sample tape. */
export function cutListenerTape(
  tape: Float32Array | null,
  taped: number,
  sr: number,
  t0: number,
  from: number,
  to: number,
): { x: Float32Array; sr: number } | null {
  if (!tape || !taped) return null
  const oldest = Math.max(0, taped - tape.length)
  const a = Math.max(oldest, Math.round((from - t0) * sr))
  const b = Math.min(taped, Math.round((to - t0) * sr))
  if (b - a < sr * 0.1) return null
  const x = new Float32Array(b - a)
  for (let i = a; i < b; i++) x[i - a] = tape[i % tape.length]
  return { x, sr }
}

const CAPTURE_WORKLET_CODE = `
class KGCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(512); this.n = 0 }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i]
        if (this.n === 512) {
          this.port.postMessage({ f: currentFrame + i + 1 - 512, d: this.buf }, [this.buf.buffer])
          this.buf = new Float32Array(512)
          this.n = 0
        }
      }
    }
    return true
  }
}
registerProcessor('kg-capture', KGCapture)
`

let captureWorkletReady: Promise<void> | null = null

/**
 * Shared hardware capture hub: opens the microphone / USB interface once while one or more `ListenerSession`s are
 * active, maintains the rolling tape and optional wide FFT analyser for chord strums, and fans out sample blocks
 * to each active session's isolated detector.
 */
class SharedCaptureHub {
  input: OpenedInput | null = null
  stream: MediaStream | null = null
  sr = 44100
  t0 = -1
  tape: Float32Array | null = null
  taped = 0
  private nodes: AudioNode[] = []
  private wide: AnalyserNode | null = null
  private spec = new Float32Array(8192)
  private sessions = new Set<ListenerSession>()
  private starting: Promise<void> | null = null

  async attach(session: ListenerSession): Promise<void> {
    this.sessions.add(session)
    if (!this.input) {
      this.starting ??= this.openHardware().finally(() => { this.starting = null })
      try {
        await this.starting
      } catch (err) {
        this.sessions.delete(session)
        throw err
      }
    }
    if (session.chords && !this.wide && this.nodes[0]) {
      this.ensureWideAnalyser()
    }
  }

  detach(session: ListenerSession) {
    this.sessions.delete(session)
    if (this.sessions.size === 0) {
      this.closeHardware()
    }
  }

  ensureWideAnalyser(): AnalyserNode | null {
    if (this.wide) return this.wide
    const src = this.nodes[0]
    if (!src) return null
    const ctx = audio()
    this.wide = ctx.createAnalyser()
    this.wide.fftSize = 16384
    this.wide.smoothingTimeConstant = 0
    src.connect(this.wide)
    return this.wide
  }

  readSpectrum(): { spec: Float32Array; binHz: number } | null {
    const w = this.ensureWideAnalyser()
    if (!w) return null
    w.getFloatFrequencyData(this.spec)
    return { spec: this.spec, binHz: this.sr / w.fftSize }
  }

  private async openHardware() {
    const ctx = audio()
    this.input = await openInput()
    this.stream = this.input.stream
    this.sr = ctx.sampleRate
    this.t0 = -1
    this.tape = new Float32Array(Math.round(ctx.sampleRate * DEFAULT_TAPE_SECONDS))
    this.taped = 0

    const src = ctx.createMediaStreamSource(this.stream)
    const sink = ctx.createGain()
    sink.gain.value = 0
    sink.connect(ctx.destination)

    const feed = (frame: number, d: Float32Array) => {
      if (this.t0 < 0) this.t0 = frame / this.sr
      const tp = this.tape
      if (tp) {
        const w = this.taped % tp.length
        if (w + d.length <= tp.length) tp.set(d, w)
        else {
          const k = tp.length - w
          tp.set(d.subarray(0, k), w)
          tp.set(d.subarray(k), 0)
        }
      }
      const chunkStartTime = this.t0 + this.taped / this.sr
      this.taped += d.length
      for (const s of this.sessions) {
        s._receiveSamples(d, chunkStartTime, this.sr)
      }
    }

    if (ctx.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      captureWorkletReady ??= ctx.audioWorklet.addModule(
        URL.createObjectURL(new Blob([CAPTURE_WORKLET_CODE], { type: 'application/javascript' })),
      )
      await captureWorkletReady
      const n = new AudioWorkletNode(ctx, 'kg-capture', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        channelCountMode: 'explicit',
        outputChannelCount: [1],
      })
      n.port.onmessage = e => feed(e.data.f as number, e.data.d as Float32Array)
      src.connect(n)
      n.connect(sink)
      this.nodes = [src, n, sink]
    } else {
      const sp = ctx.createScriptProcessor(1024, 1, 1)
      sp.onaudioprocess = e => {
        const d = new Float32Array(e.inputBuffer.getChannelData(0))
        feed(Math.round(e.playbackTime * ctx.sampleRate) - d.length, d)
      }
      src.connect(sp)
      sp.connect(sink)
      this.nodes = [src, sp, sink]
    }
  }

  private closeHardware() {
    for (const n of this.nodes) {
      try { n.disconnect() } catch { /* already disconnected */ }
    }
    if (this.nodes[1] && 'port' in this.nodes[1]) {
      (this.nodes[1] as AudioWorkletNode).port.onmessage = null
    }
    this.nodes = []
    this.wide = null
    this.stream?.getTracks().forEach(t => t.stop())
    this.stream = null
    this.input = null
    this.tape = null
    this.taped = 0
    this.t0 = -1
  }
}

const hub = new SharedCaptureHub()
const activeByConsumer = new Map<string, ListenerSession>()

/**
 * Isolated per-consumer listener session. Config changes (`strictOctave`, `gate`, `autoGate`, `chords`, `expect`,
 * `suppressBleed`) apply strictly to this session and never leak into any other consumer.
 */
export class ListenerSession {
  readonly consumerId: string
  onNote?: (e: ListenerNoteEvent) => void
  onFrame?: (f: { midi: number | null; level: number }) => void
  onOnset?: (time: number) => void
  onChord?: (chroma: number[], onsetTime: number) => void

  private cfg: Required<ListenerConfig>
  private det: NoteDetector | null = null
  private sessionT0 = -1
  private chromaAcc: { acc: number[]; at: number } | null = null
  private raf = 0
  private running = false

  constructor(consumerId = 'default', config: ListenerConfig = {}) {
    this.consumerId = consumerId
    this.cfg = {
      strictOctave: config.strictOctave ?? false,
      chords: config.chords ?? false,
      autoGate: config.autoGate ?? true,
      gate: config.gate ?? 1,
      allowSinging: config.allowSinging ?? false,
      rollingClipSeconds: config.rollingClipSeconds ?? DEFAULT_TAPE_SECONDS,
      suppressBleed: config.suppressBleed ?? true,
      expectNow: [...(config.expectNow ?? [])],
      expectNext: [...(config.expectNext ?? [])],
    }
  }

  /** Isolated config snapshot for inspection and tests. */
  getConfig(): Readonly<Required<ListenerConfig>> {
    return {
      ...this.cfg,
      expectNow: [...this.cfg.expectNow],
      expectNext: [...this.cfg.expectNext],
    }
  }

  get chords() { return this.cfg.chords }
  set chords(v: boolean) {
    this.cfg.chords = v
    if (this.running && v) {
      hub.ensureWideAnalyser()
      this.startChordLoop()
    }
  }

  get autoGate() { return this.cfg.autoGate }
  set autoGate(v: boolean) {
    this.cfg.autoGate = v
    if (v && this.input) {
      this.gate = gear(kindOf(this.input.external)).gate
    }
  }

  get gate() { return this.cfg.gate }
  set gate(g: number) {
    this.cfg.gate = g
    if (this.det) this.det.gate = g
  }

  get strictOctave() { return this.cfg.strictOctave }
  set strictOctave(v: boolean) {
    this.cfg.strictOctave = v
    if (this.det) this.det.strictOctave = v
  }

  get suppressBleed() { return this.cfg.suppressBleed }
  set suppressBleed(v: boolean) { this.cfg.suppressBleed = v }

  get allowSinging() { return this.cfg.allowSinging }
  set allowSinging(v: boolean) { this.cfg.allowSinging = v }

  get input(): OpenedInput | null { return hub.input }
  get mediaStream(): MediaStream | null { return hub.stream }
  get external(): boolean { return !!hub.input?.external }
  get inputKind(): InputKind { return kindOf(this.external) }

  /** Calibrated latency in milliseconds for the currently active input profile (`mic`, `usb`, or `pedal`). */
  latencyMs(): number {
    return latencyMs(this.inputKind)
  }

  /** Calibrated latency in seconds for the currently active input profile (`mic`, `usb`, or `pedal`). */
  latencySec(): number {
    return this.latencyMs() / 1000
  }

  get heardUntil(): number {
    return hub.t0 + hub.taped / hub.sr
  }

  expect(now: number[], next: number[] = []) {
    this.cfg.expectNow = [...now]
    this.cfg.expectNext = [...next]
    this.det?.expect(this.cfg.expectNow, this.cfg.expectNext)
  }

  clip(from: number, to: number): { x: Float32Array; sr: number } | null {
    return cutListenerTape(hub.tape, hub.taped, hub.sr, hub.t0, from, to)
  }

  /** Build or configure an isolated `NoteDetector` bound to this session's settings and smart bleed suppression. */
  createDetector(sampleRate: number, baseAudioTime = 0): NoteDetector {
    const det = new NoteDetector(sampleRate)
    det.gate = this.cfg.gate
    det.strictOctave = this.cfg.strictOctave
    det.expect(this.cfg.expectNow, this.cfg.expectNext)
    det.bleedAt = (detTime: number) => {
      // Safeguard #2: Bleed suppression ONLY runs on the phone mic ('mic'), NEVER on USB/pedal direct guitar inputs
      if (!this.cfg.suppressBleed || this.inputKind !== 'mic') return []
      const t0 = this.sessionT0 >= 0 ? this.sessionT0 : baseAudioTime
      return backingNotesAt(t0 + detTime, latencyMs('mic') / 1000)
    }
    const at = (t: number) => (this.sessionT0 >= 0 ? this.sessionT0 : baseAudioTime) + t
    det.onNote = (e: DetectedNote) => {
      this.onNote?.({ midi: e.midi, time: at(e.time), attack: e.attack, expected: e.expected, conf: e.conf })
    }
    det.onOnset = (t: number) => {
      const onsetAt = at(t)
      this.onOnset?.(onsetAt)
      if (this.cfg.chords) this.chromaAcc = { acc: new Array(12).fill(0), at: onsetAt }
    }
    det.onFrame = f => this.onFrame?.(f)
    this.det = det
    return det
  }

  async start() {
    this.sessionT0 = -1
    await hub.attach(this)
    if (this.cfg.autoGate && hub.input) {
      this.cfg.gate = gear(kindOf(hub.input.external)).gate
    }
    this.createDetector(hub.sr, Math.max(0, hub.t0))
    this.running = true
    activeByConsumer.set(this.consumerId, this)
    if (this.cfg.chords) this.startChordLoop()
  }

  stop() {
    this.running = false
    if (this.raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.raf)
    this.raf = 0
    this.chromaAcc = null
    this.det = null
    if (activeByConsumer.get(this.consumerId) === this) {
      activeByConsumer.delete(this.consumerId)
    }
    hub.detach(this)
  }

  /** Internal: called by `SharedCaptureHub` for each 512-sample audio block. */
  _receiveSamples(d: Float32Array, chunkStartTime: number, sr: number) {
    if (!this.running) return
    if (!this.det) this.createDetector(sr, chunkStartTime)
    if (this.sessionT0 < 0) this.sessionT0 = chunkStartTime - this.det!.time
    this.det!.push(d)
  }

  private startChordLoop() {
    if (this.raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.raf)
    if (typeof requestAnimationFrame !== 'function') return
    const loop = () => {
      if (!this.running || !this.cfg.chords) return
      this.raf = requestAnimationFrame(loop)
      this.chordTick()
    }
    this.raf = requestAnimationFrame(loop)
  }

  private chordTick() {
    if (!this.chromaAcc) return
    const now = audio().currentTime
    if (now - this.chromaAcc.at > 0.06) {
      const sp = hub.readSpectrum()
      if (sp) addChroma(sp.spec, sp.binHz, this.chromaAcc.acc)
    }
    if (now - this.chromaAcc.at > 0.42) {
      const total = this.chromaAcc.acc.reduce((x, y) => x + y, 0)
      const at = this.chromaAcc.at
      const acc = this.chromaAcc.acc
      this.chromaAcc = null
      if (total > 0) this.onChord?.(acc.map(v => v / total), at)
    }
  }
}

/**
 * Acquire an isolated listener session for a specific feature/screen (`play`, `target-notes`, `call-response`,
 * `improv-coach`, `quiz`, `ear-trainer`, `tools`, `gear-setup`, `looper`).
 * If a previous session with the same `consumerId` was still open, it is stopped first.
 */
export function acquireListener(consumerId: string, config?: ListenerConfig): ListenerSession {
  const prev = activeByConsumer.get(consumerId)
  if (prev) prev.stop()
  return new ListenerSession(consumerId, config)
}

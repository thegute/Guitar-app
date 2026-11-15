// Records your playing from the mic or a USB amp, sample-accurately against the audio clock,
// so a take can be looped in time with the backing track.
import { audio } from './engine'
import { openInput, type OpenedInput } from './input'
import { playClick } from './metronome'

const WORKLET = `
class KgRecorder extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(2048); this.n = 0; this.start = 0; this.on = true;
    this.port.onmessage = e => { if (e.data === 'stop') this.on = false } }
  process(inputs) {
    const ch = inputs[0]
    if (ch && ch[0]) {
      const a = ch[0], b = ch[1]
      if (this.n === 0) this.start = currentFrame
      for (let i = 0; i < a.length; i++) {
        this.buf[this.n++] = b ? (a[i] + b[i]) * 0.5 : a[i]
        if (this.n === this.buf.length) { this.port.postMessage({ f: this.start, d: this.buf }, [this.buf.buffer]); this.buf = new Float32Array(2048); this.n = 0; this.start = currentFrame + i + 1 }
      }
    }
    return this.on
  }
}
registerProcessor('kg-recorder', KgRecorder)
`

let moduleReady: Promise<void> | null = null

interface Chunk { f: number; d: Float32Array }

export class InputRecorder {
  input: OpenedInput | null = null
  private node: AudioNode | null = null
  private src: MediaStreamAudioSourceNode | null = null
  private sink: GainNode | null = null
  private chunks: Chunk[] = []
  private waiters: { endFrame: number; resolve: () => void }[] = []
  lastFrame = 0
  /** recent input level, 0..1 */
  level = 0

  get open() { return !!this.node }

  async start() {
    if (this.node) return
    const ctx = audio()
    await ctx.resume()
    this.input = await openInput()
    this.src = ctx.createMediaStreamSource(this.input.stream)
    this.sink = ctx.createGain()
    this.sink.gain.value = 0
    this.sink.connect(ctx.destination)
    const onChunk = (c: Chunk) => {
      this.chunks.push(c)
      this.lastFrame = c.f + c.d.length
      let peak = 0
      for (let i = 0; i < c.d.length; i += 4) peak = Math.max(peak, Math.abs(c.d[i]))
      this.level = this.level * 0.7 + peak * 0.3
      // keep about 3 minutes (the looper's longest overdub)
      const keepFrom = this.lastFrame - ctx.sampleRate * 180
      while (this.chunks.length && this.chunks[0].f + this.chunks[0].d.length < keepFrom) this.chunks.shift()
      this.waiters = this.waiters.filter(w => (this.lastFrame >= w.endFrame ? (w.resolve(), false) : true))
    }
    if (ctx.audioWorklet) {
      if (!moduleReady) moduleReady = ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' })))
      await moduleReady
      const n = new AudioWorkletNode(ctx, 'kg-recorder', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' })
      n.port.onmessage = e => onChunk(e.data as Chunk)
      this.node = n
    } else {
      // older engines: ScriptProcessor, stamped with its playback time
      const sp = ctx.createScriptProcessor(2048, 1, 1)
      sp.onaudioprocess = e => {
        const d = new Float32Array(e.inputBuffer.getChannelData(0))
        onChunk({ f: Math.round(e.playbackTime * ctx.sampleRate) - d.length, d })
      }
      this.node = sp
    }
    this.src.connect(this.node)
    this.node.connect(this.sink)
  }

  stop() {
    if (this.node instanceof AudioWorkletNode) this.node.port.postMessage('stop')
    this.node?.disconnect()
    this.src?.disconnect()
    this.sink?.disconnect()
    this.input?.stream.getTracks().forEach(t => t.stop())
    this.node = null
    this.src = null
    this.sink = null
    this.input = null
    this.chunks = []
    this.waiters.forEach(w => w.resolve())
    this.waiters = []
  }

  /** Samples from context time t0 for dur seconds. Waits until they have been captured. */
  async capture(t0: number, dur: number, signal?: { cancelled: boolean }): Promise<Float32Array> {
    const ctx = audio()
    const sr = ctx.sampleRate
    const startF = Math.round(t0 * sr)
    const len = Math.round(dur * sr)
    const endF = startF + len
    if (this.lastFrame < endF) await new Promise<void>(resolve => this.waiters.push({ endFrame: endF, resolve }))
    if (signal?.cancelled) throw new Error('cancelled')
    const out = new Float32Array(len)
    for (const c of this.chunks) {
      const a = Math.max(startF, c.f)
      const b = Math.min(endF, c.f + c.d.length)
      for (let f = a; f < b; f++) out[f - startF] = c.d[f - c.f]
    }
    return out
  }
}

/** Turn a recorded take into a loopable buffer: gentle level normalising and tiny fades at the edges. */
export function makeLayerBuffer(samples: Float32Array): AudioBuffer {
  const ctx = audio()
  let peak = 0
  for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]))
  const gain = peak > 0.001 ? Math.min(6, 0.8 / peak) : 1
  const buf = ctx.createBuffer(1, samples.length, ctx.sampleRate)
  const d = buf.getChannelData(0)
  const fade = Math.min(Math.round(ctx.sampleRate * 0.004), samples.length >> 2)
  for (let i = 0; i < samples.length; i++) {
    let g = gain
    if (i < fade) g *= i / fade
    else if (i > samples.length - fade) g *= (samples.length - i) / fade
    d[i] = samples[i] * g
  }
  return buf
}

export type CalibrationMethod = 'loopback' | 'strum'

export interface CalibrationResult {
  ok: boolean
  latencyMs: number | null
  spreadMs: number | null
  method: CalibrationMethod
  hits: number
  total: number
  reason?: 'no-signal' | 'inconsistent' | 'late-signal'
  message: string
}

/**
 * Pure analyser for the phone-mic speaker loopback check (Safeguard #1).
 * Looks for crisp click spikes within 500 ms of each scheduled click and verifies tight hardware consistency.
 * Never fails silently: returns a clear diagnostic reason and plain-English explanation when no clean spike is found.
 */
export function analyseLoopbackSamples(
  samples: Float32Array,
  sr: number,
  from: number,
  clicks: number[],
): CalibrationResult {
  const total = clicks.length
  const hopSec = 0.001
  const hop = Math.max(1, Math.round(sr * hopSec))
  const dt = hop / sr
  const win = hop * 2
  const env: number[] = []
  for (let i = 0; i + win <= samples.length; i += hop) {
    let s = 0
    for (let k = 0; k < win; k++) s += samples[i + k] * samples[i + k]
    env.push(Math.sqrt(s / win))
  }
  const quietFrames = Math.max(4, Math.min(env.length, Math.round(0.2 / dt)))
  const baseSorted = [...env.slice(0, quietFrames)].sort((a, b) => a - b)
  const base = baseSorted[Math.floor(baseSorted.length / 2)] ?? 0.001
  let peak = 0
  for (let i = 0; i < env.length; i++) if (env[i] > peak) peak = env[i]
  const thr = Math.max(base * 5.5, peak * 0.18, 0.003)

  const offsetsMs: number[] = []
  let lateSpikes = 0
  let firstClickFound = false
  for (let idx = 0; idx < clicks.length; idx++) {
    const c = clicks[idx]
    const nextC = clicks[idx + 1] ?? Infinity
    const a = Math.round((c - from + 0.002) / dt)
    const b = Math.round((Math.min(c + 0.5, nextC - 0.005) - from) / dt)
    const bLate = Math.round((Math.min(c + 0.8, nextC - 0.005) - from) / dt)
    let found = false
    for (let i = Math.max(3, a); i < Math.min(b, env.length); i++) {
      if (env[i] > thr && env[i] > env[i - 3] * 2.4) {
        offsetsMs.push((i * dt + from - c) * 1000)
        found = true
        if (idx === 0) firstClickFound = true
        break
      }
    }
    if (!found) {
      for (let i = Math.max(3, b); i < Math.min(bLate, env.length); i++) {
        if (env[i] > thr && env[i] > env[i - 3] * 2.4) {
          lateSpikes++
          break
        }
      }
    }
  }

  // Also check if the entire click train was delayed by > 500 ms (so click 0 missed before click 1,
  // and the last click's echo arrived > 500 ms after the last scheduled click).
  const lastC = clicks[clicks.length - 1] ?? 0
  const postLateA = Math.round((lastC - from + 0.5) / dt)
  const postLateB = Math.round((lastC - from + 0.85) / dt)
  let postLastSpike = false
  for (let i = Math.max(3, postLateA); i < Math.min(postLateB, env.length); i++) {
    if (env[i] > thr && env[i] > env[i - 3] * 2.4) {
      postLastSpike = true
      break
    }
  }

  if ((!firstClickFound && postLastSpike) || (offsetsMs.length < 4 && lateSpikes >= 2)) {
    return {
      ok: false,
      latencyMs: null,
      spreadMs: null,
      method: 'loopback',
      hits: 0,
      total,
      reason: 'late-signal',
      message:
        'Clicks arrived more than 500 ms late (likely Bluetooth speaker/headphones delay). Unplug or disconnect Bluetooth for the speaker check, or switch to the 8-click strum check.',
    }
  }

  if (offsetsMs.length < 4) {
    return {
      ok: false,
      latencyMs: null,
      spreadMs: null,
      method: 'loopback',
      hits: offsetsMs.length,
      total,
      reason: 'no-signal',
      message:
        offsetsMs.length === 0
          ? "The microphone didn't hear the clicks from the speaker within half a second. Turn your phone's volume up and unplug headphones, or switch to the 8-click strum check."
          : `Only caught ${offsetsMs.length} of ${total} clicks clearly. Turn the speaker volume up a little and stay quiet, or switch to the 8-click strum check.`,
    }
  }

  const sorted = [...offsetsMs].sort((a, b) => a - b)
  const trimmed = sorted.length >= 5 ? sorted.slice(1, -1) : sorted
  const med = trimmed[Math.floor(trimmed.length / 2)]
  const devs = trimmed.map(x => Math.abs(x - med)).sort((a, b) => a - b)
  const spreadMs = Math.max(1, Math.round(devs[Math.floor(devs.length / 2)] ?? 0))

  if (spreadMs > 25) {
    return {
      ok: false,
      latencyMs: null,
      spreadMs,
      method: 'loopback',
      hits: offsetsMs.length,
      total,
      reason: 'inconsistent',
      message: `Heard background noise instead of steady speaker clicks (±${spreadMs} ms spread). Turn the speaker volume up in a quiet room, or switch to the 8-click strum check.`,
    }
  }

  const latencyMs = Math.round(Math.max(0, Math.min(500, med)))
  return {
    ok: true,
    latencyMs,
    spreadMs,
    method: 'loopback',
    hits: offsetsMs.length,
    total,
    message: `Measured ${latencyMs} ms (±${spreadMs} ms across ${offsetsMs.length}/${total} speaker clicks).`,
  }
}

/**
 * Pure analyser for the 8-click muted-strum play-along check (Pocket Master / USB interface / headphones, Upgrade #5).
 * Drops lowest & highest outliers and computes both median round-trip latency and consistency spread (±ms).
 */
export function analyseStrumSamples(
  samples: Float32Array,
  sr: number,
  from: number,
  clicks: number[],
): CalibrationResult {
  const total = clicks.length
  const hopSec = 0.0025
  const hop = Math.max(1, Math.round(sr * hopSec))
  const dt = hop / sr
  const win = hop * 2
  const env: number[] = []
  for (let i = 0; i + win <= samples.length; i += hop) {
    let s = 0
    for (let k = 0; k < win; k++) s += samples[i + k] * samples[i + k]
    env.push(Math.sqrt(s / win))
  }
  const quietFrames = Math.max(4, Math.min(env.length, Math.round(0.25 / dt)))
  const baseSorted = [...env.slice(0, quietFrames)].sort((a, b) => a - b)
  const base = baseSorted[Math.floor(baseSorted.length / 2)] ?? 0.001
  let peak = 0
  for (let i = 0; i < env.length; i++) if (env[i] > peak) peak = env[i]
  const thr = Math.max(base * 5.5, peak * 0.15, 0.003)

  const offsetsMs: number[] = []
  for (const c of clicks) {
    const a = Math.round((c - from - 0.05) / dt)
    const b = Math.round((c - from + 0.45) / dt)
    for (let i = Math.max(4, a); i < Math.min(b, env.length); i++) {
      if (env[i] > thr && env[i] > env[i - 4] * 2.4) {
        offsetsMs.push((i * dt + from - c) * 1000)
        break
      }
    }
  }

  if (offsetsMs.length < 4) {
    return {
      ok: false,
      latencyMs: null,
      spreadMs: null,
      method: 'strum',
      hits: offsetsMs.length,
      total,
      reason: 'no-signal',
      message:
        offsetsMs.length === 0
          ? "Didn't catch your muted strums. Strum firmly across the muted strings right on each of the 8 clicks after the 4-beat count-in."
          : `Only caught ${offsetsMs.length} of ${total} strums clearly. Try once more with slightly firmer muted strums on each click.`,
    }
  }

  const sorted = [...offsetsMs].sort((a, b) => a - b)
  const trimmed = sorted.length >= 5 ? sorted.slice(1, -1) : sorted
  const med = trimmed[Math.floor(trimmed.length / 2)]
  const devs = trimmed.map(x => Math.abs(x - med)).sort((a, b) => a - b)
  const spreadMs = Math.max(1, Math.round(devs[Math.floor(devs.length / 2)] ?? 0))
  const latencyMs = Math.round(Math.max(0, Math.min(500, med)))

  return {
    ok: true,
    latencyMs,
    spreadMs,
    method: 'strum',
    hits: offsetsMs.length,
    total,
    message: `Measured ${latencyMs} ms (±${spreadMs} ms consistency across ${offsetsMs.length}/${total} strums).`,
  }
}

export interface CalibrateTimingOpts {
  /** Override calibration route ('loopback' speaker-to-mic vs 'strum' 4-beat count-in + 8 muted strums). */
  method?: CalibrationMethod
  /** Called on each count-in beat ('count-in', 0..3, 4) and each measurement click ('click', 0..N-1, N). */
  onPhase?: (phase: 'count-in' | 'click', index: number, total: number) => void
  /** Legacy callback invoked for each measurement click (0..N-1). */
  onClick?: (i: number) => void
}

/**
 * Calibrate round-trip timing for the active gear profile:
 * - `'loopback'` (default on phone mic): plays 6 crisp clicks and measures the speaker-to-mic delay within 500 ms.
 *   Never fails silently (Safeguard #1).
 * - `'strum'` (default on USB / Pocket Master / wireless, or 1-tap fallback with headphones): plays a 4-beat
 *   count-in first so you lock into the groove, then records 8 muted strums on 8 clicks (Upgrade #5).
 */
export async function calibrateTiming(
  rec: InputRecorder,
  opts: CalibrateTimingOpts = {},
): Promise<CalibrationResult> {
  const ctx = audio()
  const method: CalibrationMethod = opts.method ?? (rec.input?.external ? 'strum' : 'loopback')

  if (method === 'loopback') {
    const gap = 0.48
    const count = 6
    const t0 = ctx.currentTime + 0.45
    const clicks = Array.from({ length: count }, (_, i) => t0 + i * gap)
    clicks.forEach((t, i) => {
      playClick(t, 'wood', i === 0 ? 'accent' : 'beat', 0.95)
      setTimeout(() => {
        opts.onPhase?.('click', i, count)
        opts.onClick?.(i)
      }, Math.max(0, (t - ctx.currentTime) * 1000))
    })
    const from = t0 - 0.25
    const samples = await rec.capture(from, 0.25 + count * gap + 0.55)
    return analyseLoopbackSamples(samples, ctx.sampleRate, from, clicks)
  }

  // 'strum' route: 4-beat count-in first, then 8 target clicks in the same groove
  const gap = 0.55
  const countIn = 4
  const total = 8
  const tCountIn = ctx.currentTime + 0.35
  for (let i = 0; i < countIn; i++) {
    const t = tCountIn + i * gap
    playClick(t, 'wood', i === 0 ? 'accent' : 'beat', 0.85)
    setTimeout(() => opts.onPhase?.('count-in', i, countIn), Math.max(0, (t - ctx.currentTime) * 1000))
  }
  const t0 = tCountIn + countIn * gap
  const clicks = Array.from({ length: total }, (_, i) => t0 + i * gap)
  clicks.forEach((t, i) => {
    playClick(t, 'wood', i === 0 ? 'accent' : 'beat', 0.92)
    setTimeout(() => {
      opts.onPhase?.('click', i, total)
      opts.onClick?.(i)
    }, Math.max(0, (t - ctx.currentTime) * 1000))
  })
  const from = t0 - 0.3
  const samples = await rec.capture(from, 0.3 + total * gap + 0.5)
  return analyseStrumSamples(samples, ctx.sampleRate, from, clicks)
}

/**
 * Measure the round-trip delay (sound out → your ears and hands → back in).
 * Returns milliseconds, or null when no clean measurement was captured.
 */
export async function measureLatency(
  rec: InputRecorder,
  onClick?: (i: number) => void,
  opts?: Omit<CalibrateTimingOpts, 'onClick'>,
): Promise<number | null> {
  const res = await calibrateTiming(rec, { ...opts, onClick })
  return res.ok ? res.latencyMs : null
}

/** A first guess at the delay before you calibrate. */
export function defaultLatencyMs() {
  const ctx = audio()
  const outL = (ctx as AudioContext & { outputLatency?: number }).outputLatency || ctx.baseLatency || 0.02
  return Math.round((outL + 0.03) * 1000)
}


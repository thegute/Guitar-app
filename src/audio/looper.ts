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
      // keep about 90 seconds
      const keepFrom = this.lastFrame - ctx.sampleRate * 90
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

/**
 * Measure the round-trip delay (sound out → your ears and hands → back in). Plays 8 clicks; with the phone mic
 * it can hear the clicks itself, with a USB amp you play a muted strum on each click. Returns milliseconds, or null.
 */
export async function measureLatency(rec: InputRecorder, onClick?: (i: number) => void): Promise<number | null> {
  const ctx = audio()
  const gap = 0.6
  const t0 = ctx.currentTime + 0.6
  const clicks = Array.from({ length: 8 }, (_, i) => t0 + i * gap)
  clicks.forEach((t, i) => {
    playClick(t, 'wood', i === 0 ? 'accent' : 'beat', 0.9)
    setTimeout(() => onClick?.(i), Math.max(0, (t - ctx.currentTime) * 1000))
  })
  const from = t0 - 0.3
  const samples = await rec.capture(from, 0.3 + clicks.length * gap + 0.4)
  const sr = ctx.sampleRate
  const hop = Math.round(sr * 0.0025)
  const win = hop * 2
  const env: number[] = []
  for (let i = 0; i + win < samples.length; i += hop) {
    let s = 0
    for (let k = 0; k < win; k++) s += samples[i + k] * samples[i + k]
    env.push(Math.sqrt(s / win))
  }
  const base = [...env.slice(0, Math.round(0.25 / 0.0025))].sort((a, b) => a - b)[Math.floor(0.25 / 0.0025 / 2)] ?? 0.001
  const peak = Math.max(...env)
  const thr = Math.max(base * 6, peak * 0.15, 0.003)
  const offsets: number[] = []
  for (const c of clicks) {
    const a = Math.round((c - from - 0.05) / 0.0025)
    const b = Math.round((c - from + 0.45) / 0.0025)
    for (let i = Math.max(4, a); i < Math.min(b, env.length); i++) {
      if (env[i] > thr && env[i] > env[i - 4] * 2.5) {
        offsets.push(i * 0.0025 + from - c)
        break
      }
    }
  }
  if (offsets.length < 4) return null
  offsets.sort((a, b) => a - b)
  const med = offsets[Math.floor(offsets.length / 2)]
  return Math.round(Math.max(0, Math.min(0.5, med)) * 1000)
}

/** A first guess at the delay before you calibrate. */
export function defaultLatencyMs() {
  const ctx = audio()
  const outL = (ctx as AudioContext & { outputLatency?: number }).outputLatency || ctx.baseLatency || 0.02
  return Math.round((outL + 0.03) * 1000)
}

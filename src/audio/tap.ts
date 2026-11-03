// Records what the app itself plays (a mix bus), in stereo, stamped against the audio clock: used to bounce the
// beat into one loop or pad, and to export it as WAV files. Your guitar input is never in here.
import { audio } from './engine'

const WORKLET = `
class KgTap extends AudioWorkletProcessor {
  constructor() { super(); this.l = new Float32Array(2048); this.r = new Float32Array(2048); this.n = 0; this.start = 0; this.on = true;
    this.port.onmessage = e => { if (e.data === 'stop') this.on = false } }
  process(inputs) {
    const ch = inputs[0]
    if (ch && ch[0]) {
      const a = ch[0], b = ch[1] || ch[0]
      if (this.n === 0) this.start = currentFrame
      for (let i = 0; i < a.length; i++) {
        this.l[this.n] = a[i]; this.r[this.n] = b[i]; this.n++
        if (this.n === this.l.length) { this.port.postMessage({ f: this.start, l: this.l, r: this.r }, [this.l.buffer, this.r.buffer]); this.l = new Float32Array(2048); this.r = new Float32Array(2048); this.n = 0; this.start = currentFrame + i + 1 }
      }
    }
    return this.on
  }
}
registerProcessor('kg-tap', KgTap)
`
let ready: Promise<void> | null = null
interface Chunk { f: number; l: Float32Array; r: Float32Array }

export class TapRecorder {
  private node: AudioNode | null = null
  private sink: GainNode | null = null
  private chunks: Chunk[] = []
  private last = 0
  private waiters: { end: number; resolve: () => void }[] = []
  /** Start listening to a node (it keeps playing to wherever it already goes). */
  async start(src: AudioNode) {
    const ctx = audio()
    this.sink = ctx.createGain()
    this.sink.gain.value = 0
    this.sink.connect(ctx.destination)
    const onChunk = (c: Chunk) => {
      this.chunks.push(c)
      this.last = c.f + c.l.length
      this.waiters = this.waiters.filter(w => (this.last >= w.end ? (w.resolve(), false) : true))
    }
    if (ctx.audioWorklet) {
      if (!ready) ready = ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' })))
      await ready
      const n = new AudioWorkletNode(ctx, 'kg-tap', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2, channelCountMode: 'explicit' })
      n.port.onmessage = e => onChunk(e.data as Chunk)
      this.node = n
    } else {
      const sp = ctx.createScriptProcessor(2048, 2, 2)
      sp.onaudioprocess = e => {
        const l = new Float32Array(e.inputBuffer.getChannelData(0)), r = new Float32Array(e.inputBuffer.getChannelData(e.inputBuffer.numberOfChannels > 1 ? 1 : 0))
        onChunk({ f: Math.round(e.playbackTime * ctx.sampleRate) - l.length, l, r })
      }
      this.node = sp
    }
    src.connect(this.node)
    this.node.connect(this.sink)
  }
  /** Stereo samples from context time t0 for dur seconds (waits until they're in). */
  async capture(t0: number, dur: number, signal?: { cancelled: boolean }): Promise<{ l: Float32Array; r: Float32Array }> {
    const sr = audio().sampleRate
    const a = Math.round(t0 * sr), len = Math.round(dur * sr), b = a + len
    if (this.last < b) await new Promise<void>(resolve => this.waiters.push({ end: b, resolve }))
    if (signal?.cancelled) throw new Error('cancelled')
    const l = new Float32Array(len), r = new Float32Array(len)
    for (const c of this.chunks) {
      const s = Math.max(a, c.f), e = Math.min(b, c.f + c.l.length)
      for (let f = s; f < e; f++) { l[f - a] = c.l[f - c.f]; r[f - a] = c.r[f - c.f] }
    }
    return { l, r }
  }
  stop() {
    if (this.node instanceof AudioWorkletNode) this.node.port.postMessage('stop')
    try { this.node?.disconnect() } catch { /* noop */ }
    try { this.sink?.disconnect() } catch { /* noop */ }
    this.node = null
    this.sink = null
    this.chunks = []
    this.waiters.forEach(w => w.resolve())
    this.waiters = []
  }
}

/** 16-bit WAV file from one or two channels. */
export function encodeWav(chs: Float32Array[], sr: number): Blob {
  const n = chs[0].length, nc = chs.length
  const buf = new ArrayBuffer(44 + n * nc * 2)
  const v = new DataView(buf)
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  w(0, 'RIFF'); v.setUint32(4, 36 + n * nc * 2, true); w(8, 'WAVE'); w(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nc, true); v.setUint32(24, sr, true)
  v.setUint32(28, sr * nc * 2, true); v.setUint16(32, nc * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * nc * 2, true)
  let o = 44
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) { const x = Math.max(-1, Math.min(1, chs[c][i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2 }
  return new Blob([buf], { type: 'audio/wav' })
}

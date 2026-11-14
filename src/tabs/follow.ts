// Turns the microphone (or USB amp) into a stream of "note played" events, and follows a tab with them.
// The sound is captured sample by sample (AudioWorklet) and analysed by NoteDetector (src/audio/noteDetect.ts).
import { audio } from '../audio/engine'
import { openInput, type OpenedInput } from '../audio/input'
import { gear, kindOf } from '../audio/gear'
import { addChroma } from '../audio/chroma'
import { NoteDetector } from '../audio/noteDetect'
import { accepted } from './bends'

export interface NoteEvent {
  midi: number
  time: number
  /** true when triggered by a fresh pick attack, false for a legato change (hammer-on, slide) */
  attack: boolean
}

const CAPTURE = `
class KGCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(512); this.n = 0 }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i]
        if (this.n === 512) { this.port.postMessage({ f: currentFrame + i + 1 - 512, d: this.buf }, [this.buf.buffer]); this.buf = new Float32Array(512); this.n = 0 }
      }
    }
    return true
  }
}
registerProcessor('kg-capture', KGCapture)
`
let captureReady: Promise<void> | null = null

/**
 * Listens and reports each note played: pick attacks (even the same note again) and legato changes
 * (hammer-ons, pull-offs, slides). Tell it what the tab wants next with expect(): it checks for those notes first,
 * which is much more reliable with distortion, room noise or strings ringing on.
 */
export class NoteListener {
  onNote?: (e: NoteEvent) => void
  onFrame?: (f: { midi: number | null; level: number }) => void
  /** every pick or strum attack, with its audio-clock time (before input latency is taken off) */
  onOnset?: (time: number) => void
  /** with chords = true: after each strum, the 12 note-name weights of what rang (for strum-along) */
  onChord?: (chroma: number[], onsetTime: number) => void
  chords = false
  /** take the sensitivity from your gear setup for this input (set false to control gate yourself) */
  autoGate = true
  input: OpenedInput | null = null
  private det: NoteDetector | null = null
  private gateV = 1
  private strict = false
  private want: [number[], number[]] = [[], []]
  private t0 = -1
  private stream: MediaStream | null = null
  private nodes: AudioNode[] = []
  private wide: AnalyserNode | null = null
  private spec = new Float32Array(8192)
  private chroma: { acc: number[]; at: number } | null = null
  private raf = 0

  private tape: Float32Array | null = null
  private taped = 0
  private sr = 44100
  /** What was played between two moments (audio-clock seconds, like the times of note events), cut from the last
   *  TAPE_SECONDS the listener keeps in memory. Null when that stretch is gone (too long ago) or nothing was heard. */
  clip(from: number, to: number): { x: Float32Array; sr: number } | null {
    return cutTape(this.tape, this.taped, this.sr, this.t0, from, to)
  }
  /** the audio-clock time of the newest sound heard */
  get heardUntil() { return this.t0 + this.taped / this.sr }
  /** the open input while listening (so a recording can share it) */
  get mediaStream() { return this.stream }
  /** loudness needed to count as a note: lower = more sensitive */
  get gate() { return this.gateV }
  set gate(g: number) { this.gateV = g; if (this.det) this.det.gate = g }
  /** only the exact octave counts */
  get strictOctave() { return this.strict }
  set strictOctave(v: boolean) { this.strict = v; if (this.det) this.det.strictOctave = v }
  /** the notes wanted now (and the step after, in case one is missed) */
  expect(now: number[], next: number[] = []) { this.want = [now, next]; this.det?.expect(now, next) }

  async start() {
    const ctx = audio()
    this.input = await openInput()
    this.stream = this.input.stream
    if (this.autoGate) this.gateV = gear(kindOf(this.input.external)).gate
    const det = new NoteDetector(ctx.sampleRate)
    det.gate = this.gateV
    det.strictOctave = this.strict
    det.expect(...this.want)
    const at = (t: number) => this.t0 + t
    det.onNote = e => this.onNote?.({ midi: e.midi, time: at(e.time), attack: e.attack })
    det.onOnset = t => {
      this.onOnset?.(at(t))
      if (this.wide) this.chroma = { acc: new Array(12).fill(0), at: at(t) }
    }
    det.onFrame = f => this.onFrame?.(f)
    this.det = det
    const src = ctx.createMediaStreamSource(this.stream)
    const sink = ctx.createGain()
    sink.gain.value = 0
    sink.connect(ctx.destination)
    this.sr = ctx.sampleRate
    this.tape = new Float32Array(Math.round(ctx.sampleRate * TAPE_SECONDS))
    this.taped = 0
    const feed = (frame: number, d: Float32Array) => {
      if (this.t0 < 0) this.t0 = frame / ctx.sampleRate - det.time
      det.push(d)
      // the last few seconds of what was played, for the coach to listen back to
      const tp = this.tape!, w = this.taped % tp.length
      if (w + d.length <= tp.length) tp.set(d, w)
      else { const k = tp.length - w; tp.set(d.subarray(0, k), w); tp.set(d.subarray(k), 0) }
      this.taped += d.length
    }
    if (ctx.audioWorklet && typeof AudioWorkletNode !== 'undefined') {
      captureReady ??= ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([CAPTURE], { type: 'application/javascript' })))
      await captureReady
      const n = new AudioWorkletNode(ctx, 'kg-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: 'explicit', outputChannelCount: [1] })
      n.port.onmessage = e => feed(e.data.f as number, e.data.d as Float32Array)
      src.connect(n)
      n.connect(sink)
      this.nodes = [src, n, sink]
    } else {
      // older engines
      const sp = ctx.createScriptProcessor(1024, 1, 1)
      sp.onaudioprocess = e => { const d = new Float32Array(e.inputBuffer.getChannelData(0)); feed(Math.round(e.playbackTime * ctx.sampleRate) - d.length, d) }
      src.connect(sp)
      sp.connect(sink)
      this.nodes = [src, sp, sink]
    }
    if (this.chords) {
      this.wide = ctx.createAnalyser()
      this.wide.fftSize = 16384
      this.wide.smoothingTimeConstant = 0
      src.connect(this.wide)
      const loop = () => {
        this.raf = requestAnimationFrame(loop)
        this.chordTick(ctx)
      }
      loop()
    }
  }

  stop() {
    cancelAnimationFrame(this.raf)
    for (const n of this.nodes) { try { n.disconnect() } catch { /* already gone */ } }
    if (this.nodes[1] && 'port' in this.nodes[1]) (this.nodes[1] as AudioWorkletNode).port.onmessage = null
    this.nodes = []
    this.stream?.getTracks().forEach(t => t.stop())
    this.stream = null
    this.wide = null
    this.det = null
    this.tape = null
  }

  /** the input kind (phone mic or USB) once started */
  get external() { return !!this.input?.external }

  /** strum-along: sum the spectrum for ~0.4 s after each strum */
  private chordTick(ctx: AudioContext) {
    if (!this.wide || !this.chroma) return
    const now = ctx.currentTime
    if (now - this.chroma.at > 0.06) {
      this.wide.getFloatFrequencyData(this.spec)
      addChroma(this.spec, ctx.sampleRate / this.wide.fftSize, this.chroma.acc)
    }
    if (now - this.chroma.at > 0.42) {
      const total = this.chroma.acc.reduce((x, y) => x + y, 0)
      const at = this.chroma.at
      const acc = this.chroma.acc
      this.chroma = null
      if (total > 0) this.onChord?.(acc.map(v => v / total), at)
    }
  }
}

/** how much of what was played the listener keeps (seconds) */
export const TAPE_SECONDS = 20

/** A stretch of a ring tape: `taped` samples written so far (the newest at index (taped − 1) mod length), sample 0 at
 *  time t0. Clamped to what the tape still holds; null when less than a tenth of a second is left. */
export function cutTape(tape: Float32Array | null, taped: number, sr: number, t0: number, from: number, to: number): { x: Float32Array; sr: number } | null {
  if (!tape || !taped) return null
  const oldest = Math.max(0, taped - tape.length)
  const a = Math.max(oldest, Math.round((from - t0) * sr)), b = Math.min(taped, Math.round((to - t0) * sr))
  if (b - a < sr * 0.1) return null
  const x = new Float32Array(b - a)
  for (let i = a; i < b; i++) x[i - a] = tape[i % tape.length]
  return { x, sr }
}

/** seconds after a bent note is hit in which a stray reading isn't called a wrong note */
export const BEND_GRACE = 1

export interface FollowStep {
  midis: number[]
  /** pitches a bend on this step passes through and lands on (tabs/bends.ts): they count as the note too */
  also?: number[]
  /** a strummed chord (3+ different notes): followed by listening to the whole chord, not single notes */
  chord?: boolean
}

export type FollowResult = { kind: 'hit'; step: number; skipped: number } | { kind: 'miss'; heard: number; expected: number[] } | { kind: 'done' }
  /** the note just played, still being bent (its pitch on the way up or back down): nothing new */
  | { kind: 'bend' }

/** Matches played notes to the tab, step by step. Pitch classes match in any octave by default
 *  (phone mics often hear a low string an octave up). */
export function matchNote(steps: FollowStep[], idx: number, midi: number, strictOctave = false, sinceHit = Infinity): FollowResult {
  if (idx >= steps.length) return { kind: 'done' }
  const same = (a: number, b: number) => (strictOctave ? a === b : ((a - b) % 12 + 12) % 12 === 0)
  for (let look = 0; look <= 2 && idx + look < steps.length; look++) {
    // look ahead one or two steps in case a note was missed, but only accept that when it is unambiguous
    if (accepted(steps[idx + look]).some(m => same(m, midi))) {
      if (look > 0 && steps.slice(idx, idx + look).some(st => accepted(st).some(m => same(m, midi)))) continue
      return { kind: 'hit', step: idx + look, skipped: look }
    }
  }
  // right after a bent note (sinceHit: seconds since it was hit) the string's pitch is on the move and anything may be
  // read off it for a moment: its own pitches on the way always count as the bend, anything else for a second
  if (idx > 0 && steps[idx - 1].also?.length && (sinceHit < BEND_GRACE || accepted(steps[idx - 1]).some(m => same(m, midi)))) return { kind: 'bend' }
  return { kind: 'miss', heard: midi, expected: steps[idx].midis }
}

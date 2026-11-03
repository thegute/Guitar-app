// Performance effects over the whole beat (and the looper): pick one, then drag a finger around the square.
//   Filter  — left closes a low-pass (muffled, far away), right opens a high-pass (thin, radio); up = more resonance
//   Echo    — a tempo echo thrown on what's playing; left→right = 1/8, 3/16, 1/4; up = more repeats
//   Reverb  — a big room thrown on it; up = more
//   Stutter — repeats the slice under your finger (snapped to the beat); left→right = 1/4 down to 1/32
//   Crush   — lo-fi bit crush; left→right = fewer bits; up = more of it
//   Gate    — chops the sound on and off in 16ths; up = deeper
// Let go and it goes back to normal (echo and reverb tails ring out), unless Latch is on.
import { audio } from '../audio/engine'

export type FxKind = 'filter' | 'echo' | 'reverb' | 'stutter' | 'crush' | 'gate'
export const FX: { id: FxKind; label: string; x: string; y: string }[] = [
  { id: 'filter', label: 'Filter', x: '← muffled · thin →', y: 'resonance' },
  { id: 'echo', label: 'Echo', x: '1/8 · 3/16 · 1/4', y: 'repeats' },
  { id: 'reverb', label: 'Reverb', x: '', y: 'amount' },
  { id: 'stutter', label: 'Stutter', x: '1/4 → 1/32', y: 'level' },
  { id: 'crush', label: 'Crush', x: '← gentle · harsh →', y: 'amount' },
  { id: 'gate', label: 'Gate', x: '1/8 · 1/16 · 1/32', y: 'depth' },
]

function room(ctx: AudioContext) {
  const len = Math.floor(ctx.sampleRate * 3.2)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) }
  const c = ctx.createConvolver()
  c.buffer = buf
  return c
}
function crushCurve(bits: number) {
  const n = 4096, c = new Float32Array(n), q = Math.pow(2, bits)
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.round(x * q) / q }
  return c
}

/** Pure: what the x/y position means for each effect (for tests and the screen's labels). */
export function fxParams(kind: FxKind, x: number, y: number, stepDur: number) {
  x = Math.max(0, Math.min(1, x)); y = Math.max(0, Math.min(1, y))
  switch (kind) {
    case 'filter': return x < 0.5 ? { type: 'lowpass' as const, freq: 120 * Math.pow(18000 / 120, x * 2), q: 0.7 + y * 14 } : { type: 'highpass' as const, freq: 20 * Math.pow(6000 / 20, (x - 0.5) * 2), q: 0.7 + y * 14 }
    case 'echo': return { time: stepDur * [2, 3, 4][Math.min(2, Math.floor(x * 3))], feedback: 0.25 + y * 0.6, wet: 0.7 }
    case 'reverb': return { send: 0.3 + y * 1.4 }
    case 'stutter': return { slice: stepDur * [4, 2, 1, 0.5][Math.min(3, Math.floor(x * 4))], level: 0.5 + y * 0.5 }
    case 'crush': return { bits: Math.round(10 - x * 8), mix: 0.4 + y * 0.6 }
    case 'gate': return { rate: [2, 1, 0.5][Math.min(2, Math.floor(x * 3))] * stepDur, depth: 0.4 + y * 0.6 }
  }
}

export class PerformFx {
  readonly input: GainNode
  private dry: GainNode
  private filt: BiquadFilterNode
  private crush: WaveShaperNode
  private crushWet: GainNode
  private crushDry: GainNode
  private gate: GainNode
  private echoIn: GainNode
  private echo: DelayNode
  private echoFb: GainNode
  private revIn: GainNode
  private stIn: GainNode
  private st: DelayNode
  private stFb: GainNode
  private stOut: GainNode
  private gateTimer: ReturnType<typeof setInterval> | null = null
  kind: FxKind | null = null
  constructor(dest: AudioNode, private clock: () => { stepDur: number; t0: number; playing: boolean }) {
    const ctx = audio()
    this.input = ctx.createGain()
    this.filt = ctx.createBiquadFilter(); this.filt.type = 'allpass'
    this.crush = ctx.createWaveShaper(); this.crush.curve = crushCurve(10)
    this.crushWet = ctx.createGain(); this.crushWet.gain.value = 0
    this.crushDry = ctx.createGain()
    this.gate = ctx.createGain()
    this.dry = ctx.createGain()
    // dry chain: filter → (crush mix) → gate → dry → out
    this.input.connect(this.filt)
    this.filt.connect(this.crushDry).connect(this.gate)
    this.filt.connect(this.crush).connect(this.crushWet).connect(this.gate)
    this.gate.connect(this.dry).connect(dest)
    // echo send
    this.echoIn = ctx.createGain(); this.echoIn.gain.value = 0
    this.echo = ctx.createDelay(2); this.echoFb = ctx.createGain(); this.echoFb.gain.value = 0.4
    this.input.connect(this.echoIn).connect(this.echo)
    this.echo.connect(this.echoFb).connect(this.echo)
    this.echo.connect(dest)
    // reverb send
    this.revIn = ctx.createGain(); this.revIn.gain.value = 0
    const rv = room(ctx)
    this.input.connect(this.revIn).connect(rv).connect(dest)
    // stutter: capture a slice, then loop it
    this.stIn = ctx.createGain(); this.stIn.gain.value = 0
    this.st = ctx.createDelay(2); this.stFb = ctx.createGain(); this.stFb.gain.value = 0
    this.stOut = ctx.createGain(); this.stOut.gain.value = 0
    this.input.connect(this.stIn).connect(this.st)
    this.st.connect(this.stFb).connect(this.st)
    this.st.connect(this.stOut).connect(dest)
  }
  /** The next 16th on the beat's grid (now if the beat isn't playing). */
  private nextStep(at: number) {
    const c = this.clock()
    if (!c.playing) return at + 0.01
    const n = Math.ceil((at - c.t0) / c.stepDur - 0.02)
    return c.t0 + n * c.stepDur
  }
  engage(kind: FxKind, x: number, y: number) {
    if (this.kind && this.kind !== kind) this.release()
    this.kind = kind
    const ctx = audio(), now = ctx.currentTime
    const { stepDur } = this.clock()
    if (kind === 'stutter') {
      const p = fxParams('stutter', x, y, stepDur) as { slice: number; level: number }
      const t = this.nextStep(now)
      this.st.delayTime.setValueAtTime(p.slice, now)
      // record one slice, then loop it in place of the music
      this.stIn.gain.setValueAtTime(1, t)
      this.stIn.gain.setValueAtTime(0, t + p.slice)
      this.stFb.gain.setValueAtTime(0, t)
      this.stFb.gain.setValueAtTime(1, t + p.slice)
      this.stOut.gain.setValueAtTime(0, t)
      this.stOut.gain.setValueAtTime(p.level, t + p.slice)
      this.dry.gain.setValueAtTime(1, now)
      this.dry.gain.setValueAtTime(0, t + p.slice)
      return
    }
    if (kind === 'gate') this.startGate(x, y)
    this.move(x, y)
  }
  move(x: number, y: number) {
    const k = this.kind
    if (!k) return
    const ctx = audio(), now = ctx.currentTime
    const { stepDur } = this.clock()
    if (k === 'filter') {
      const p = fxParams('filter', x, y, stepDur) as { type: BiquadFilterType; freq: number; q: number }
      if (this.filt.type !== p.type) this.filt.type = p.type
      this.filt.frequency.setTargetAtTime(p.freq, now, 0.02)
      this.filt.Q.setTargetAtTime(p.q, now, 0.03)
    } else if (k === 'echo') {
      const p = fxParams('echo', x, y, stepDur) as { time: number; feedback: number; wet: number }
      this.echo.delayTime.setTargetAtTime(p.time, now, 0.05)
      this.echoFb.gain.setTargetAtTime(p.feedback, now, 0.03)
      this.echoIn.gain.setTargetAtTime(p.wet, now, 0.01)
    } else if (k === 'reverb') {
      const p = fxParams('reverb', x, y, stepDur) as { send: number }
      this.revIn.gain.setTargetAtTime(p.send, now, 0.02)
    } else if (k === 'crush') {
      const p = fxParams('crush', x, y, stepDur) as { bits: number; mix: number }
      this.crush.curve = crushCurve(p.bits)
      this.crushWet.gain.setTargetAtTime(p.mix, now, 0.02)
      this.crushDry.gain.setTargetAtTime(1 - p.mix * 0.8, now, 0.02)
    } else if (k === 'gate') {
      this.gateOpts = fxParams('gate', x, y, stepDur) as { rate: number; depth: number }
    }
  }
  private gateOpts = { rate: 0.1, depth: 0.8 }
  private startGate(x: number, y: number) {
    this.gateOpts = fxParams('gate', x, y, this.clock().stepDur) as { rate: number; depth: number }
    let next = this.nextStep(audio().currentTime)
    const tick = () => {
      const ctx = audio()
      while (next < ctx.currentTime + 0.1) {
        const { rate, depth } = this.gateOpts
        this.gate.gain.setValueAtTime(1, next)
        this.gate.gain.setValueAtTime(1 - depth, next + rate / 2)
        next += rate
      }
    }
    tick()
    this.gateTimer = setInterval(tick, 25)
  }
  /** Back to normal (tails of echo and reverb ring out). */
  release() {
    const ctx = audio(), now = ctx.currentTime
    const k = this.kind
    this.kind = null
    if (this.gateTimer) { clearInterval(this.gateTimer); this.gateTimer = null }
    this.gate.gain.cancelScheduledValues(now); this.gate.gain.setTargetAtTime(1, now, 0.01)
    if (k === 'filter') { this.filt.frequency.setTargetAtTime(k === 'filter' && this.filt.type === 'lowpass' ? 20000 : 10, now, 0.04); setTimeout(() => { if (this.kind !== 'filter') this.filt.type = 'allpass' }, 250) }
    this.echoIn.gain.setTargetAtTime(0, now, 0.02)
    this.revIn.gain.setTargetAtTime(0, now, 0.05)
    this.crushWet.gain.setTargetAtTime(0, now, 0.02); this.crushDry.gain.setTargetAtTime(1, now, 0.02)
    for (const g of [this.stIn.gain, this.stFb.gain, this.stOut.gain, this.dry.gain]) g.cancelScheduledValues(now)
    this.stIn.gain.setValueAtTime(0, now); this.stFb.gain.setTargetAtTime(0, now, 0.01); this.stOut.gain.setTargetAtTime(0, now, 0.01)
    this.dry.gain.setTargetAtTime(1, now, 0.01)
  }
}

// Sample-accurate metronome: a lookahead scheduler on the AudioContext clock.
import { audio, out } from './engine'

export type Accent = 0 | 1 | 2 // muted, normal, accented
export type ClickSound = 'click' | 'wood' | 'beep'

export interface Tick {
  time: number
  beat: number
  sub: number
  bar: number
}

export class Metronome {
  bpm = 100
  beatsPerBar = 4
  /** sub-clicks per beat: 1 quarter, 2 eighths, 3 triplets, 4 sixteenths */
  subdivision = 1
  accents: Accent[] = [2, 1, 1, 1]
  sound: ClickSound = 'click'
  volume = 0.9
  /** speed trainer */
  trainer = { on: false, step: 5, everyBars: 4, max: 160 }
  running = false
  onTick?: (t: Tick) => void
  onBpm?: (bpm: number) => void

  private next = 0
  private beat = 0
  private sub = 0
  private bar = 0
  private timer: ReturnType<typeof setInterval> | null = null
  /** recent scheduled ticks, read by the UI to animate in time with the audio */
  ticks: Tick[] = []

  start(at?: number) {
    const ctx = audio()
    this.running = true
    this.beat = 0
    this.sub = 0
    this.bar = 0
    this.next = at ?? ctx.currentTime + 0.08
    this.timer = setInterval(() => this.schedule(), 20)
    this.schedule()
  }
  stop() {
    this.running = false
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.ticks = []
  }

  private schedule() {
    const ctx = audio()
    while (this.next < ctx.currentTime + 0.12) {
      const t: Tick = { time: this.next, beat: this.beat, sub: this.sub, bar: this.bar }
      this.click(t)
      this.ticks.push(t)
      if (this.ticks.length > 32) this.ticks.shift()
      this.onTick?.(t)
      const secPerSub = 60 / this.bpm / this.subdivision
      this.next += secPerSub
      this.sub++
      if (this.sub >= this.subdivision) {
        this.sub = 0
        this.beat++
        if (this.beat >= this.beatsPerBar) {
          this.beat = 0
          this.bar++
          if (this.trainer.on && this.bar % this.trainer.everyBars === 0 && this.bpm < this.trainer.max) {
            this.bpm = Math.min(this.trainer.max, this.bpm + this.trainer.step)
            this.onBpm?.(this.bpm)
          }
        }
      }
    }
  }

  /** The tick currently sounding (for visuals). */
  current(): Tick | null {
    const now = audio().currentTime
    let cur: Tick | null = null
    for (const t of this.ticks) if (t.time <= now) cur = t
    return cur
  }

  private click(t: Tick) {
    const accent = this.accents[t.beat] ?? 1
    if (t.sub === 0 && accent === 0) return
    const level = t.sub > 0 ? 0.35 : accent === 2 ? 1 : 0.6
    playClick(t.time, this.sound, t.sub > 0 ? 'sub' : accent === 2 ? 'accent' : 'beat', level * this.volume)
  }
}

export function playClick(when: number, sound: ClickSound, kind: 'accent' | 'beat' | 'sub', level: number, dest?: AudioNode) {
  const ctx = audio()
  const g = ctx.createGain()
  g.connect(dest ?? out())
  const pitch = { accent: 1, beat: 0.75, sub: 0.6 }[kind]
  if (sound === 'beep') {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = 880 * (kind === 'accent' ? 2 : kind === 'beat' ? 1.5 : 1)
    o.connect(g)
    g.gain.setValueAtTime(0, when)
    g.gain.linearRampToValueAtTime(level * 0.5, when + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.08)
    o.start(when)
    o.stop(when + 0.1)
    return
  }
  // noise-based click / woodblock
  const len = Math.floor(ctx.sampleRate * 0.05)
  const b = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * (sound === 'wood' ? 0.12 : 0.05)))
  const src = ctx.createBufferSource()
  src.buffer = b
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = (sound === 'wood' ? 1800 : 3200) * pitch
  bp.Q.value = sound === 'wood' ? 6 : 2
  src.connect(bp).connect(g)
  g.gain.setValueAtTime(level * (sound === 'wood' ? 2.2 : 1.4), when)
  src.start(when)
}

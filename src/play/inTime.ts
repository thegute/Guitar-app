// "Play in time": the tab scrolls at tempo (with a click, or following a synced YouTube video) and every note
// you play is judged early / on time / late. Includes the speed trainer for looped sections.
import { audio } from '../audio/engine'
import { playClick } from '../audio/metronome'
import { playNote } from '../audio/pluck'
import { playable, type FlatStep } from '../tabs/model'

export interface TimedStep {
  flat: number
  /** start, in beats (quarter notes) from the start of the song */
  beat: number
  dur: number
  midis: number[]
  /** three or more notes: judged as a strum (chord) rather than by single pitch */
  chord: boolean
}

/** Lay the tab out on a beat timeline. */
export function timeline(flat: FlatStep[]): { steps: TimedStep[]; total: number; beatOf: number[] } {
  const steps: TimedStep[] = []
  const beatOf: number[] = []
  let b = 0
  flat.forEach((f, i) => {
    beatOf.push(b)
    const ns = playable(f.step)
    if (ns.length) steps.push({ flat: i, beat: b, dur: f.step.dur, midis: ns.map(n => n.midi), chord: new Set(ns.map(n => n.midi % 12)).size >= 3 })
    b += f.step.dur
  })
  return { steps, total: b, beatOf }
}

export type Judgement = 'perfect' | 'good' | 'early' | 'late'
/** How far off counts as what (ms). Loose enough for a phone mic, tight enough to mean something. */
export function judge(errMs: number, slackMs = 0): Judgement {
  const a = Math.abs(errMs)
  if (a <= 45 + slackMs) return 'perfect'
  if (a <= 90 + slackMs) return 'good'
  return errMs < 0 ? 'early' : 'late'
}

export interface RunStats { total: number; hit: number; onTime: number; early: number; late: number; missed: number; meanErr: number; score: number }
/** Score a run (or one pass of a loop): notes on time count fully, early/late notes half. */
export function scoreRun(results: (Judgement | 'miss' | undefined)[], errs: number[]): RunStats {
  const total = results.length
  let hit = 0, onTime = 0, early = 0, late = 0, missed = 0
  for (const r of results) {
    if (!r || r === 'miss') { missed++; continue }
    hit++
    if (r === 'perfect' || r === 'good') onTime++
    else if (r === 'early') early++
    else late++
  }
  const meanErr = errs.length ? Math.round(errs.reduce((a, b) => a + b, 0) / errs.length) : 0
  const score = total ? Math.round(((onTime + 0.5 * (early + late)) / total) * 100) : 0
  return { total, hit, onTime, early, late, missed, meanErr, score }
}

/** Speed trainer: after a pass, the next speed (fraction of full tempo). */
export function nextSpeed(cur: number, score: number, opts: { step: number; target: number; pass: number }) {
  if (score >= opts.pass) return Math.min(opts.target, Math.round((cur + opts.step) * 100) / 100)
  return cur
}

/** Where the music is now, in beats. */
export interface Clock {
  /** beat position at an audio-clock time (seconds); null while stopped/paused */
  beatAt(ctxTime: number): number | null
  /** seconds per beat right now (for converting timing errors to ms) */
  spb(): number
  stop(): void
}

/** The app's own clock: count-in, then steady beats, looping [fromBeat, toBeat) if asked. Clicks optional. */
export class InternalClock implements Clock {
  private t0 = 0
  private spbNow: number
  private timer: ReturnType<typeof setInterval> | null = null
  private nextClick = 0
  private guideNext = 0
  private stopped = false
  passes = 0
  constructor(
    private fromBeat: number,
    private toBeat: number,
    bpm: number,
    private opts: { loop: boolean; click: boolean; countIn: number; guide?: { steps: TimedStep[]; flat: FlatStep[] }; onWrap?: () => number | void },
  ) {
    this.spbNow = 60 / bpm
    const ctx = audio()
    this.t0 = ctx.currentTime + 0.15 + opts.countIn * this.spbNow
    // count-in clicks
    for (let i = 0; i < opts.countIn; i++) playClick(this.t0 - (opts.countIn - i) * this.spbNow, 'wood', i === 0 ? 'accent' : 'beat', 0.9)
    this.nextClick = Math.ceil(fromBeat)
    this.guideNext = 0
    this.timer = setInterval(() => this.schedule(), 40)
    this.schedule()
  }
  private len() { return this.toBeat - this.fromBeat }
  /** absolute audio time of beat b within the current pass */
  private timeOf(b: number) { return this.t0 + (b - this.fromBeat) * this.spbNow }
  private schedule() {
    if (this.stopped) return
    const ctx = audio()
    const horizon = ctx.currentTime + 0.25
    // wrap: start the next pass (maybe at a new tempo)
    while (this.opts.loop && this.timeOf(this.toBeat) <= horizon) {
      const wrapAt = this.timeOf(this.toBeat)
      const newBpm = this.opts.onWrap?.()
      this.passes++
      if (typeof newBpm === 'number' && newBpm > 0) this.spbNow = 60 / newBpm
      this.t0 = wrapAt
      this.nextClick = Math.ceil(this.fromBeat)
      this.guideNext = 0
    }
    if (this.opts.click) {
      while (this.nextClick < this.toBeat && this.timeOf(this.nextClick) <= horizon) {
        const t = this.timeOf(this.nextClick)
        if (t >= ctx.currentTime - 0.01) playClick(t, 'wood', Math.round(this.nextClick) % 4 === 0 ? 'accent' : 'beat', 0.55)
        this.nextClick++
      }
    }
    const g = this.opts.guide
    if (g) {
      const inRange = g.steps.filter(s => s.beat >= this.fromBeat && s.beat < this.toBeat)
      while (this.guideNext < inRange.length && this.timeOf(inRange[this.guideNext].beat) <= horizon) {
        const s = inRange[this.guideNext]
        const t = this.timeOf(s.beat)
        if (t >= ctx.currentTime - 0.01) s.midis.forEach((m, k) => playNote(m, t + (s.chord ? k * 0.012 : 0), s.chord ? 0.3 : 0.4))
        this.guideNext++
      }
    }
  }
  beatAt(ctxTime: number) {
    if (this.stopped) return null
    const b = this.fromBeat + (ctxTime - this.t0) / this.spbNow
    return b
  }
  spb() { return this.spbNow }
  stop() {
    this.stopped = true
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }
}

export interface VideoApi {
  time(): number
  playing(): boolean
  rate(): number
  play(): void
  pause(): void
  seek(t: number): void
}
export interface VideoSync { offset: number; bpm: number }

/** Follows a YouTube video that has been synced to the tab (offset = video time of beat 0, bpm of the recording). */
export class VideoClock implements Clock {
  private ctxRef = 0
  private vRef = 0
  private timer: ReturnType<typeof setInterval>
  constructor(private api: VideoApi, private sync: VideoSync) {
    this.sample()
    this.timer = setInterval(() => this.sample(), 100)
  }
  private sample() {
    const v = this.api.time()
    const now = audio().currentTime
    // getCurrentTime() can lag a little: only take readings that move forward
    if (v !== this.vRef || !this.api.playing()) { this.vRef = v; this.ctxRef = now }
  }
  beatAt(ctxTime: number) {
    if (!this.api.playing()) return null
    const v = this.vRef + (ctxTime - this.ctxRef) * this.api.rate()
    return ((v - this.sync.offset) * this.sync.bpm) / 60
  }
  spb() { return 60 / (this.sync.bpm * this.api.rate()) }
  stop() { clearInterval(this.timer) }
}

/**
 * Judge a played note (or strum) against the timeline. Returns the step it belongs to and the timing error in ms,
 * or null if nothing expected is close enough. `taken` holds steps already judged.
 */
export function matchTimed(
  steps: TimedStep[], beat: number, spb: number,
  played: { midi?: number; chordOk?: (midis: number[]) => boolean },
  taken: Set<number>, strictOctave = false, windowMs = 220,
): { step: number; errMs: number } | null {
  const win = Math.max(windowMs / 1000 / spb, 0.3)
  let best: { step: number; errMs: number } | null = null
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    if (s.beat > beat + win) break
    if (s.beat < beat - win || taken.has(i)) continue
    // strummed chords are judged by what rang out (all their notes), single notes by pitch
    const ok = s.chord ? !!played.chordOk && played.chordOk(s.midis)
      : played.midi !== undefined && s.midis.some(m => (strictOctave ? m === played.midi : (m - played.midi!) % 12 === 0))
    if (!ok) continue
    const errMs = (beat - s.beat) * spb * 1000
    if (!best || Math.abs(errMs) < Math.abs(best.errMs)) best = { step: i, errMs }
  }
  return best
}

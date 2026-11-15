// Shared master clock, lookahead scheduler, app speed, musical count-in, and scheduled backing-note registry
// (Engine Week Part 1, notes/ENGINE-WEEK.md + notes/AUDIO-ENGINE.md).
//
// - One lookahead scheduler (250 ms horizon) driven by the audio thread (`kg-master` AudioWorklet pulse every ~20 ms)
//   with a 20 ms timer safety net so main-thread UI work or tab renders never cause beat jitter.
// - `BeatTimelineClock`: unified beat <-> audio-time conversion supporting loop ranges, speed multiplier (`speed`),
//   meter, swing, and Guitar Pro variable `TempoMap` changes, with phase-locked `setBpm` / `setSpeed`.
// - Musical count-in (`planCountIn` / `scheduleCountIn`): automatically expands to 2 bars at fast tempos (>= 130 BPM)
//   when `autoTwoBars` is enabled, and subdivides the last two beats ("1 - 2 - 3 & 4 &") on swung / compound grooves.
// - Scheduled backing-note registry (`recordBackingNote` / `backingNotesAt`): records every note or chord KGuitar's
//   own backing/guide schedules so the shared listener (Part 2) can suppress speaker bleed on the phone mic without
//   deafening the player's own pick attacks on those same notes.
import { TempoMap } from '../play/tempoMap'

/** Unified lookahead window (seconds) for all transports so busy UI frames never cause late beats. */
export const LOOKAHEAD_SEC = 0.25
/** Scheduler wake-up interval (ms) when the audio worklet pulse is not yet running. */
export const SCHEDULER_INTERVAL_MS = 20

export type ClockSource = 'play' | 'tab' | 'jam' | 'beat' | 'metronome'

export interface SharedClockState {
  bpm: number
  /** Playback speed multiplier (0.25 .. 1.5, default 1). Effective tempo = bpm * speed. */
  speed: number
  meter: number
  swing: number
  groove: string
  playing: boolean
  source: ClockSource | null
}

const SPEED_KEY = 'kg:appSpeed'

function loadSavedSpeed(): number {
  try {
    const raw = localStorage.getItem(SPEED_KEY)
    if (raw !== null) {
      const v = Number(raw)
      if (Number.isFinite(v) && v >= 0.25 && v <= 1.5) return Math.round(v * 100) / 100
    }
  } catch { /* storage unavailable */ }
  return 1
}

const state: SharedClockState = {
  bpm: 100,
  speed: loadSavedSpeed(),
  meter: 4,
  swing: 0,
  groove: '',
  playing: false,
  source: null,
}

const stateListeners = new Set<(s: SharedClockState) => void>()

export function getClockState(): Readonly<SharedClockState> {
  return state
}

export function getAppSpeed(): number {
  return state.speed
}

export function setAppSpeed(speed: number) {
  const clamped = Math.max(0.25, Math.min(1.5, Math.round(speed * 100) / 100))
  state.speed = clamped
  try { localStorage.setItem(SPEED_KEY, String(clamped)) } catch { /* ignore */ }
  notifyState()
}

export function updateClockState(patch: Partial<SharedClockState>) {
  Object.assign(state, patch)
  if (patch.speed !== undefined) {
    const clamped = Math.max(0.25, Math.min(1.5, Math.round(patch.speed * 100) / 100))
    state.speed = clamped
  }
  notifyState()
}

export function onClockState(fn: (s: SharedClockState) => void): () => void {
  stateListeners.add(fn)
  return () => { stateListeners.delete(fn) }
}

function notifyState() {
  const snap = { ...state }
  stateListeners.forEach(fn => { try { fn(snap) } catch { /* noop */ } })
}

// ---------------------------------------------------------------------------------------------------------------------
// Audio-thread pulse + 250 ms lookahead scheduler

type SchedulerFn = (now: number, horizon: number) => void
const schedulers = new Set<SchedulerFn>()
let fallbackTimer: ReturnType<typeof setInterval> | null = null
let clockProvider: (() => number) | null = null

/** Register how the shared scheduler reads `AudioContext.currentTime` (wired by `audio/engine.ts`). */
export function setClockTimeProvider(fn: () => number) {
  clockProvider = fn
}

function nowTime(): number {
  return clockProvider ? clockProvider() : performance.now() / 1000
}

function pumpSchedulers(now = nowTime()) {
  if (!schedulers.size) return
  const horizon = now + LOOKAHEAD_SEC
  for (const fn of [...schedulers]) {
    try { fn(now, horizon) } catch { /* keep other transports running */ }
  }
}

/** Called from `kg-master` AudioWorklet port message (~50×/s on the audio thread) to drive all active transports. */
export function notifyAudioPulse(ctxTime: number) {
  pumpSchedulers(ctxTime)
}

/** Subscribe a transport's lookahead schedule loop to the shared audio-thread pulse + 20 ms timer safety net. */
export function subscribeScheduler(fn: SchedulerFn, runImmediately = true): () => void {
  schedulers.add(fn)
  if (!fallbackTimer) {
    fallbackTimer = setInterval(() => pumpSchedulers(), SCHEDULER_INTERVAL_MS)
  }
  if (runImmediately) {
    const now = nowTime()
    try { fn(now, now + LOOKAHEAD_SEC) } catch { /* noop */ }
  }
  return () => {
    schedulers.delete(fn)
    if (!schedulers.size && fallbackTimer) {
      clearInterval(fallbackTimer)
      fallbackTimer = null
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Unified BeatTimelineClock (supports TempoMap, loop [fromBeat, toBeat), speed multiplier, meter, swing)

export interface BeatClockOpts {
  fromBeat?: number
  toBeat?: number
  /** Base tempo in BPM (before `speed` multiplier). */
  bpm: number
  /** Playback speed multiplier (default 1). Effective tempo = bpm * speed. */
  speed?: number
  /** Start audio time of `fromBeat` (after any count-in). */
  t0: number
  tempo?: TempoMap
  meter?: number
  swing?: number
}

export class BeatTimelineClock {
  fromBeat: number
  toBeat: number
  bpm: number
  speed: number
  t0: number
  readonly map: TempoMap
  meter: number
  swing: number
  /** Seconds multiplier relative to `map.base`: `map.base / (bpm * speed)`. */
  private k: number
  private spbNow: number

  constructor(opts: BeatClockOpts) {
    this.fromBeat = opts.fromBeat ?? 0
    this.toBeat = opts.toBeat ?? Infinity
    this.bpm = Math.max(20, opts.bpm)
    this.speed = Math.max(0.2, Math.min(2, opts.speed ?? 1))
    this.t0 = opts.t0
    this.map = opts.tempo ?? new TempoMap(this.bpm)
    this.meter = opts.meter ?? 4
    this.swing = opts.swing ?? 0
    const effBpm = this.bpm * this.speed
    this.k = this.map.base / effBpm
    this.spbNow = this.map.spbAt(this.fromBeat, effBpm)
  }

  /** Effective BPM at `beat` (accounting for both `TempoMap` changes and `speed`). */
  effectiveBpm(beat = this.fromBeat): number {
    return (this.map.bpmAt(beat) * this.bpm * this.speed) / this.map.base
  }

  /** Seconds per beat at the current or given beat. */
  spb(beat?: number): number {
    if (beat === undefined) return this.spbNow
    return this.map.spbAt(Math.max(this.fromBeat, beat)) * this.k
  }

  /** Absolute audio time of `beat` within the current pass. */
  timeOf(beat: number): number {
    if (beat < this.fromBeat) {
      const spb0 = this.map.spbAt(this.fromBeat) * this.k
      return this.t0 + (beat - this.fromBeat) * spb0
    }
    return this.t0 + (this.map.sec(beat) - this.map.sec(this.fromBeat)) * this.k
  }

  /** Beat position at `ctxTime` (below `fromBeat` during count-in). Updates `spbNow`. */
  beatAt(ctxTime: number): number {
    const dt = (ctxTime - this.t0) / this.k
    const b = dt < 0
      ? this.fromBeat + (dt * this.map.bpmAt(this.fromBeat)) / 60
      : this.map.beat(this.map.sec(this.fromBeat) + dt)
    this.spbNow = this.map.spbAt(Math.max(this.fromBeat, b)) * this.k
    return b
  }

  /** Change base BPM while preserving the exact beat position at `ctxTime`. */
  setBpm(bpm: number, ctxTime?: number) {
    const nextBpm = Math.max(20, bpm)
    if (ctxTime !== undefined) {
      const curBeat = this.beatAt(ctxTime)
      this.bpm = nextBpm
      this.k = this.map.base / (this.bpm * this.speed)
      this.spbNow = this.map.spbAt(Math.max(this.fromBeat, curBeat)) * this.k
      if (curBeat < this.fromBeat) {
        this.t0 = ctxTime - (curBeat - this.fromBeat) * this.spbNow
      } else {
        this.t0 = ctxTime - (this.map.sec(curBeat) - this.map.sec(this.fromBeat)) * this.k
      }
      return
    }
    this.bpm = nextBpm
    this.k = this.map.base / (this.bpm * this.speed)
    this.spbNow = this.map.spbAt(this.fromBeat) * this.k
  }

  /** Change speed multiplier while preserving the exact beat position at `ctxTime`. */
  setSpeed(speed: number, ctxTime?: number) {
    const nextSpeed = Math.max(0.2, Math.min(2, speed))
    if (ctxTime !== undefined) {
      const curBeat = this.beatAt(ctxTime)
      this.speed = nextSpeed
      this.k = this.map.base / (this.bpm * this.speed)
      this.spbNow = this.map.spbAt(Math.max(this.fromBeat, curBeat)) * this.k
      if (curBeat < this.fromBeat) {
        this.t0 = ctxTime - (curBeat - this.fromBeat) * this.spbNow
      } else {
        this.t0 = ctxTime - (this.map.sec(curBeat) - this.map.sec(this.fromBeat)) * this.k
      }
      return
    }
    this.speed = nextSpeed
    this.k = this.map.base / (this.bpm * this.speed)
    this.spbNow = this.map.spbAt(this.fromBeat) * this.k
  }

  /** Advance `t0` to `timeOf(toBeat)` for sample-accurate loop wrapping, optionally applying a new effective BPM. */
  wrap(newEffectiveBpm?: number) {
    const wrapAt = this.timeOf(this.toBeat)
    if (typeof newEffectiveBpm === 'number' && newEffectiveBpm > 0) {
      this.k = this.map.base / newEffectiveBpm
    }
    this.t0 = wrapAt
    this.spbNow = this.map.spbAt(this.fromBeat) * this.k
    return wrapAt
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Musical, Tempo-Aware & Groove-Aware Count-In (Upgrade #2)

export interface CountInClick {
  /** Beat offset from the start of the count-in (0 .. totalBeats). */
  offsetBeats: number
  /** Time offset in seconds from the start of the count-in. */
  offsetSec: number
  kind: 'accent' | 'beat' | 'sub'
  level: number
  /** 1-based beat number within the bar (1..meter) for main beats, or 0 for subdivision clicks. */
  countNumber: number
}

export interface CountInPlan {
  totalBeats: number
  durationSec: number
  spb: number
  swung: boolean
  subdivided: boolean
  clicks: CountInClick[]
}

/** True when the groove, swing setting, or meter has a swung / shuffle / compound feel. */
export function isSwungGroove(groove = '', swing = 0, meter = 4): boolean {
  if (swing > 0.05 || meter === 6) return true
  return /shuffle|blues|boogie|swing|jazz|gospel|triplet|6\/8|compound|slowblues|island|waltz/i.test(groove)
}

/**
 * How many beats of count-in to give:
 * - If `autoTwoBars` is true and the effective BPM is fast (>= 130 BPM), a 1-bar request automatically becomes 2 bars
 *   so the player has ~3.4 s instead of ~1.7 s to get their hands on the neck.
 */
export function countInBeatsFor(bpm: number, meter = 4, requestedBeats?: number, autoTwoBars = false): number {
  const barBeats = Math.max(1, meter)
  if (requestedBeats !== undefined) {
    if (requestedBeats <= 0) return 0
    if (autoTwoBars && bpm >= 130 && requestedBeats <= barBeats) return barBeats * 2
    return requestedBeats
  }
  return bpm >= 130 ? barBeats * 2 : barBeats
}

/**
 * Plan a musical count-in:
 * - Main beats get accented bar downbeats (`accent`) and normal beats (`beat`).
 * - On swung/compound grooves (or when `subdivideLastTwo` is true), the final two beats before the music starts
 *   include a lighter `'sub'` click on the `'&'` (`1 - 2 - 3 & 4 &`) so the player locks right into the pocket.
 */
export function planCountIn(opts: {
  beats?: number
  bpm: number
  meter?: number
  groove?: string
  swing?: number
  autoTwoBars?: boolean
  subdivideLastTwo?: boolean
}): CountInPlan {
  const meter = Math.max(1, opts.meter ?? 4)
  const bpm = Math.max(20, opts.bpm)
  const spb = 60 / bpm
  const totalBeats = countInBeatsFor(bpm, meter, opts.beats, opts.autoTwoBars)
  const swung = isSwungGroove(opts.groove, opts.swing, meter)
  const subdivide = (opts.subdivideLastTwo ?? swung) && totalBeats >= 2
  const subRatio = (opts.swing && opts.swing > 0.05) ? Math.min(0.75, 0.5 + opts.swing) : swung ? 2 / 3 : 0.5
  const clicks: CountInClick[] = []

  for (let k = 0; k < totalBeats; k++) {
    const inBar = k % meter
    const isDownbeat = inBar === 0
    clicks.push({
      offsetBeats: k,
      offsetSec: k * spb,
      kind: isDownbeat ? 'accent' : 'beat',
      level: isDownbeat ? 0.92 : 0.78,
      countNumber: inBar + 1,
    })
    if (subdivide && k >= totalBeats - 2) {
      const subBeat = k + subRatio
      clicks.push({
        offsetBeats: subBeat,
        offsetSec: subBeat * spb,
        kind: 'sub',
        level: 0.42,
        countNumber: 0,
      })
    }
  }

  return {
    totalBeats,
    durationSec: totalBeats * spb,
    spb,
    swung,
    subdivided: subdivide,
    clicks,
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Scheduled Backing Note Registry (powers Task 2's Smart Bleed Suppression on the phone mic)

export interface ScheduledBackingNote {
  /** AudioContext time when KGuitar scheduled the note to sound. */
  when: number
  /** Duration in seconds that the backing note rings strongly in the room. */
  dur: number
  /** MIDI pitches sounded by this backing event. */
  midis: number[]
  /** Linear gain (0..1.5) of the backing event. */
  gain: number
  /** Source role ('backing' for Jam/band/tab playback, 'guide' for Play in-time guide). */
  role: 'backing' | 'guide'
}

const MAX_SCHEDULED = 320
const scheduledNotes: ScheduledBackingNote[] = []

/**
 * Record a note or chord scheduled by KGuitar's own synth/sampler/backing so the shared listener knows what is
 * coming out of the device speakers at `when + micLatency`.
 */
export function recordBackingNote(
  when: number,
  midis: number[],
  gain = 0.7,
  dur = 0.55,
  role: 'backing' | 'guide' = 'backing',
) {
  if (!midis.length || gain <= 0.01) return
  // Prune old entries more than 4 seconds before `when`
  const cutoff = when - 4
  while (scheduledNotes.length > 0 && scheduledNotes[0].when + scheduledNotes[0].dur < cutoff) {
    scheduledNotes.shift()
  }
  // Merge if an event at almost the exact same timestamp (~4 ms) and role was just added (e.g. multi-string strum)
  const last = scheduledNotes[scheduledNotes.length - 1]
  if (last && last.role === role && Math.abs(last.when - when) <= 0.018) {
    for (const m of midis) if (!last.midis.includes(m)) last.midis.push(m)
    last.gain = Math.max(last.gain, gain)
    last.dur = Math.max(last.dur, dur)
    return
  }
  scheduledNotes.push({ when, dur: Math.max(0.12, dur), midis: [...midis], gain, role })
  if (scheduledNotes.length > MAX_SCHEDULED) {
    scheduledNotes.splice(0, scheduledNotes.length - MAX_SCHEDULED)
  }
}

/** Clear scheduled backing notes (e.g. when playback stops). */
export function clearBackingNotes(fromTime = -Infinity) {
  for (let i = scheduledNotes.length - 1; i >= 0; i--) {
    if (scheduledNotes[i].when >= fromTime) scheduledNotes.splice(i, 1)
  }
}

export interface ActiveBleedNote {
  midi: number
  /** Expected acoustic bleed strength (0..1) at the microphone right now. */
  strength: number
  /** Seconds since the backing note's acoustic onset arrived at the mic (<= 0.045 means the backing's own attack is happening now). */
  ageSec: number
  role: 'backing' | 'guide'
}

/**
 * Query which backing/guide notes are acoustically arriving at the phone mic at `ctxTime`, shifted by `latencySec`
 * (the speaker -> air -> mic round-trip delay).
 */
export function backingNotesAt(ctxTime: number, latencySec = 0.045): ActiveBleedNote[] {
  const out = new Map<number, ActiveBleedNote>()
  for (let i = 0; i < scheduledNotes.length; i++) {
    const ev = scheduledNotes[i]
    const arrival = ev.when + latencySec
    const age = ctxTime - arrival
    // Allow 25 ms pre-arrival margin for latency jitter and up to `ev.dur` decay tail
    if (age < -0.025 || age > ev.dur) continue
    // Acoustic envelope of a plucked backing note: strong in the first 70 ms, then exponential decay
    const env = age < 0 ? 0.65 : age < 0.07 ? 1.0 : Math.exp(-(age - 0.07) / Math.max(0.18, ev.dur * 0.45))
    const strength = Math.min(1, ev.gain * env)
    if (strength < 0.04) continue
    for (const m of ev.midis) {
      const prev = out.get(m)
      if (!prev || strength > prev.strength) {
        out.set(m, { midi: m, strength, ageSec: age, role: ev.role })
      }
    }
  }
  return [...out.values()]
}

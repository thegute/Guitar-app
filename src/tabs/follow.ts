// Turns the microphone into a stream of "note played" events, and follows a tab with them.
import { PitchDetector } from 'pitchy'
import { audio } from '../audio/engine'
import { freqToMidi } from '../theory/notes'
import { openInput, type OpenedInput } from '../audio/input'

export interface NoteEvent {
  midi: number
  time: number
  /** true when triggered by a fresh pick attack, false for a legato change (hammer-on, slide) */
  attack: boolean
}

/**
 * Listens to the mic and reports each new note:
 *  - a pick attack (a sudden rise in volume) followed by a stable pitch, or
 *  - a change to a new stable pitch while the string is still ringing (hammer-ons, pull-offs, slides).
 */
export class NoteListener {
  onNote?: (e: NoteEvent) => void
  onFrame?: (f: { midi: number | null; level: number }) => void
  private stream: MediaStream | null = null
  private analyser: AnalyserNode | null = null
  private raf = 0
  private buf = new Float32Array(4096)
  private det = PitchDetector.forFloat32Array(4096)
  private levels: number[] = []
  private lastOnset = -1
  private pendingAttack = 0 // frames left to find a pitch after an attack
  private lastEmitted: number | null = null
  private lastEmitTime = -1
  private candidate: number | null = null
  private candidateFrames = 0
  private noise = 0.004
  /** loudness needed to count as a note: lower = more sensitive */
  gate = 1
  /** how much louder than a moment ago a pick attack must be (distorted electric guitar is compressed, so less) */
  private onsetRatio = 1.7
  input: OpenedInput | null = null

  async start() {
    const ctx = audio()
    this.input = await openInput()
    this.stream = this.input.stream
    this.onsetRatio = this.input.external ? 1.35 : 1.7
    const src = ctx.createMediaStreamSource(this.stream)
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 4096
    src.connect(this.analyser)
    this.det.minVolumeDecibels = -55
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      this.tick(ctx)
    }
    loop()
  }

  stop() {
    cancelAnimationFrame(this.raf)
    this.stream?.getTracks().forEach(t => t.stop())
    this.stream = null
    this.analyser = null
  }

  private tick(ctx: AudioContext) {
    if (!this.analyser) return
    this.analyser.getFloatTimeDomainData(this.buf)
    const now = ctx.currentTime
    // level of the most recent ~20 ms (sharp enough to see pick attacks)
    let s = 0
    for (let i = this.buf.length - 1024; i < this.buf.length; i++) s += this.buf[i] * this.buf[i]
    const level = Math.sqrt(s / 1024)
    if (level < this.noise * 1.5) this.noise = this.noise * 0.98 + level * 0.02 // track the room's noise floor
    const recentMin = this.levels.length ? Math.min(...this.levels) : level
    this.levels.push(level)
    if (this.levels.length > 5) this.levels.shift()

    const loud = level > Math.max(0.006 * this.gate, this.noise * 3 * this.gate)
    if (loud && level > recentMin * this.onsetRatio && now - this.lastOnset > 0.08) {
      this.lastOnset = now
      this.pendingAttack = 8
      this.candidate = null
      this.candidateFrames = 0
    }

    const [freq, clarity] = this.det.findPitch(this.buf, ctx.sampleRate)
    let midi: number | null = null
    if (loud && clarity > 0.88 && freq > 60 && freq < 1400) midi = Math.round(freqToMidi(freq))
    this.onFrame?.({ midi, level })

    if (!loud) {
      if (level < this.noise * 2) this.lastEmitted = null
      this.pendingAttack = Math.max(0, this.pendingAttack - 1)
      return
    }
    if (midi === null) {
      this.pendingAttack = Math.max(0, this.pendingAttack - 1)
      return
    }
    if (midi === this.candidate) this.candidateFrames++
    else {
      this.candidate = midi
      this.candidateFrames = 1
    }
    const stable = this.candidateFrames >= 2
    if (!stable) {
      this.pendingAttack = Math.max(0, this.pendingAttack - 1)
      return
    }
    if (this.pendingAttack > 0) {
      this.emit(midi, now, true)
      this.pendingAttack = 0
    } else if (midi !== this.lastEmitted && now - this.lastEmitTime > 0.06 && this.candidateFrames >= 3) {
      this.emit(midi, now, false)
    }
  }

  private emit(midi: number, time: number, attack: boolean) {
    this.lastEmitted = midi
    this.lastEmitTime = time
    this.onNote?.({ midi, time, attack })
  }
}

export interface FollowStep {
  midis: number[]
}

export type FollowResult = { kind: 'hit'; step: number; skipped: number } | { kind: 'miss'; heard: number; expected: number[] } | { kind: 'done' }

/** Matches played notes to the tab, step by step. Pitch classes match in any octave by default
 *  (phone mics often hear a low string an octave up). */
export function matchNote(steps: FollowStep[], idx: number, midi: number, strictOctave = false): FollowResult {
  if (idx >= steps.length) return { kind: 'done' }
  const same = (a: number, b: number) => (strictOctave ? a === b : ((a - b) % 12 + 12) % 12 === 0)
  for (let look = 0; look <= 2 && idx + look < steps.length; look++) {
    // look ahead one or two steps in case a note was missed, but only accept that when it is unambiguous
    if (steps[idx + look].midis.some(m => same(m, midi))) {
      if (look > 0 && steps.slice(idx, idx + look).some(st => st.midis.some(m => same(m, midi)))) continue
      return { kind: 'hit', step: idx + look, skipped: look }
    }
  }
  return { kind: 'miss', heard: midi, expected: steps[idx].midis }
}

// Vocal-Coach Piano & Soft Formant "Ooh" Harmony Guide Voice + Swiftscales-style Pro Workout Patterns.
import { audio, catBus } from '../audio/engine'
import { liveSound, quietSound } from '../audio/stopAll'
import { recordBackingNote } from '../engine/clock'
import { midiToHz } from './vocalEngine'

export interface WorkoutPattern {
  id: string
  name: string
  category: 'sovt' | 'warmup' | 'bridge' | 'agility' | 'harmony' | 'cooldown'
  syllable: string
  cue: string
  /** semitone offsets from the pattern's root */
  steps: number[]
  /** beat duration of each step */
  beats: number[]
  defaultBpm: number
  /** optional simultaneous lead line offset (for harmony drills) */
  leadSteps?: number[]
}

export const WORKOUT_PATTERNS: WorkoutPattern[] = [
  {
    id: 'sovt-5tone',
    name: 'Lip-Trill 5-Tone Glide',
    category: 'sovt',
    syllable: 'Brrr (Lip Trill)',
    cue: 'Loose lips, gentle steady air — zero throat push.',
    steps: [0, 2, 4, 5, 7, 5, 4, 2, 0],
    beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5],
    defaultBpm: 96,
  },
  {
    id: 'hum-siren',
    name: 'NG Hum Octave Siren',
    category: 'sovt',
    syllable: 'NG (like "sing")',
    cue: 'Feel buzzing behind your nose; let volume thin smoothly at the top.',
    steps: [0, 4, 7, 12, 7, 4, 0],
    beats: [0.75, 0.5, 0.5, 1.25, 0.5, 0.5, 1.5],
    defaultBpm: 88,
  },
  {
    id: 'five-vowels',
    name: '5-Tone Vowel Align (Mee-May-Mah)',
    category: 'warmup',
    syllable: 'Mee · May · Mah · Moh · Moo',
    cue: 'Keep jaw relaxed and tall; match brightness across all 5 vowels.',
    steps: [0, 2, 4, 5, 7, 5, 4, 2, 0],
    beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5],
    defaultBpm: 92,
  },
  {
    id: 'triad-arpeggio',
    name: 'Major Triad Precision',
    category: 'warmup',
    syllable: 'Lah · Lah · Lah',
    cue: 'Imagine the jump in your head before singing — no flat scooping!',
    steps: [0, 4, 7, 4, 0],
    beats: [0.75, 0.75, 1, 0.75, 1.25],
    defaultBpm: 86,
  },
  {
    id: 'passaggio-bridge',
    name: 'Passaggio Mix Bridge (1-5-8-5-1)',
    category: 'bridge',
    syllable: 'Mum / Gee / Nay',
    cue: 'Lighten chest weight 2 notes BEFORE your vocal break.',
    steps: [0, 7, 12, 7, 0],
    beats: [0.75, 0.75, 1.5, 0.75, 1.25],
    defaultBpm: 82,
  },
  {
    id: 'nay-mix-ladder',
    name: 'Bratty "Nay" Mix Zip',
    category: 'bridge',
    syllable: 'Nay · Nay · Nay',
    cue: 'Slight forward twang keeps vocal cords zipped cleanly through the break.',
    steps: [0, 4, 7, 12, 11, 9, 7, 5, 4, 2, 0],
    beats: [0.5, 0.5, 0.5, 0.75, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 1.2],
    defaultBpm: 96,
  },
  {
    id: 'head-owl',
    name: 'Head-Voice Owl Descent',
    category: 'warmup',
    syllable: 'Hoo · Hoo · Hoo',
    cue: 'Start light and clear at the top (no breathy hiss), glide gently down.',
    steps: [12, 11, 9, 7, 5, 4, 2, 0],
    beats: [1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5],
    defaultBpm: 88,
  },
  {
    id: 'pentatonic-run',
    name: 'Pentatonic Agility Run',
    category: 'agility',
    syllable: 'Doo · Bee · Dah',
    cue: 'Start slow (70 BPM) so every note is crisp, then climb tempo.',
    steps: [0, 2, 4, 7, 9, 7, 4, 2, 0],
    beats: [0.35, 0.35, 0.35, 0.35, 0.6, 0.35, 0.35, 0.35, 1.2],
    defaultBpm: 90,
  },
  {
    id: 'harmony-3rd-lock',
    name: 'Lower 3rd Harmony Lock',
    category: 'harmony',
    syllable: 'Ooh (Hold Lower 3rd!)',
    cue: 'Coach plays the higher lead — hold YOUR lower harmony steady against it!',
    steps: [0, 2, 4, 2, 0],
    leadSteps: [4, 5, 7, 5, 4],
    beats: [1.5, 1, 1.5, 1, 2],
    defaultBpm: 80,
  },
  {
    id: 'cooldown-hum',
    name: 'Vocal Cool-Down Descent',
    category: 'cooldown',
    syllable: 'Mmm (Soft Hum)',
    cue: 'Gentle sighing hum downward — resets vocal cords after singing.',
    steps: [7, 5, 4, 2, 0],
    beats: [0.75, 0.75, 0.75, 0.75, 2],
    defaultBpm: 76,
  },
]

/** Play a clean, warm electric/grand piano note through KGuitar's keys bus. */
export function playCoachPiano(midi: number, durationSec = 0.8, volume = 0.38, when?: number) {
  const ctx = audio()
  const t0 = when ?? ctx.currentTime + 0.01
  const hz = midiToHz(midi)
  const out = catBus('keys').input

  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(volume, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.38), t0 + Math.min(0.45, durationSec * 0.6))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec + 0.08)

  const filt = ctx.createBiquadFilter()
  filt.type = 'lowpass'
  filt.frequency.setValueAtTime(Math.min(4800, hz * 7), t0)
  filt.frequency.exponentialRampToValueAtTime(Math.min(1800, hz * 3.2), t0 + durationSec)

  const o1 = ctx.createOscillator()
  o1.type = 'triangle'
  o1.frequency.setValueAtTime(hz, t0)

  const o2 = ctx.createOscillator()
  o2.type = 'sine'
  o2.frequency.setValueAtTime(hz * 2, t0)
  const g2 = ctx.createGain()
  g2.gain.value = 0.22

  o1.connect(filt)
  o2.connect(g2).connect(filt)
  filt.connect(g).connect(out)

  o1.start(t0)
  o2.start(t0)
  o1.stop(t0 + durationSec + 0.1)
  o2.stop(t0 + durationSec + 0.1)

  recordBackingNote(t0, [midi], volume, durationSec, 'guide')
}

/** Play a soft, formant-filtered "Ooh" vocal guide tone (great for Harmony Mode!). */
export function playVocalGuideTone(midi: number, durationSec = 0.6, volume = 0.28, when?: number) {
  const ctx = audio()
  const t0 = when ?? ctx.currentTime + 0.01
  const hz = midiToHz(midi)
  const out = catBus('voice').input

  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(hz, t0)

  // Warm "Ooh" dual vocal formants (360 Hz + 860 Hz)
  const f1 = ctx.createBiquadFilter()
  f1.type = 'bandpass'
  f1.frequency.value = 360
  f1.Q.value = 3.2

  const f2 = ctx.createBiquadFilter()
  f2.type = 'bandpass'
  f2.frequency.value = 860
  f2.Q.value = 4.2

  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(volume, t0 + 0.045)
  g.gain.setValueAtTime(volume * 0.9, t0 + Math.max(0.06, durationSec - 0.07))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec + 0.06)

  const g2 = ctx.createGain()
  g2.gain.value = 0.55

  osc.connect(f1).connect(g)
  osc.connect(f2).connect(g2).connect(g)
  g.connect(out)

  osc.start(t0)
  osc.stop(t0 + durationSec + 0.08)

  recordBackingNote(t0, [midi], volume, durationSec, 'guide')
}

/** Play a quick 3-note chord arpeggio (for Pocket Pitch Pipe & Ear-First root reference). */
export function playChordCue(rootMidi: number, minor = false, volume = 0.3) {
  const ctx = audio()
  const t0 = ctx.currentTime + 0.02
  const notes = [rootMidi, rootMidi + (minor ? 3 : 4), rootMidi + 7]
  notes.forEach((m, i) => playCoachPiano(m, 0.9, volume, t0 + i * 0.06))
}

export interface WorkoutRunnerState {
  running: boolean
  rootMidi: number
  stepIndex: number
  targetMidi: number | null
  leadMidi: number | null
  rep: number
  totalReps: number
}

/**
 * Interactive Swiftscales-style piano workout runner that walks up and down your personal vocal range.
 */
export class PianoWorkoutRunner {
  private timers: number[] = []
  private _running = false
  onStep?: (s: WorkoutRunnerState) => void
  onDone?: () => void

  get running() { return this._running }

  start(opts: {
    pattern: WorkoutPattern
    lowRoot: number
    highRoot: number
    bpm: number
    /** true = walk up then back down */
    upAndDown?: boolean
    /** play harmony guide voice alongside piano */
    useVocalGuide?: boolean
  }) {
    this.stop()
    this._running = true
    const { pattern, bpm, upAndDown = true, useVocalGuide = false } = opts
    const maxSpan = Math.max(...pattern.steps)
    const minSpan = Math.min(...pattern.steps)
    const startRoot = Math.max(36, opts.lowRoot - minSpan)
    const endRoot = Math.max(startRoot, opts.highRoot - maxSpan)
    const roots: number[] = []
    for (let r = startRoot; r <= endRoot; r++) roots.push(r)
    if (upAndDown && roots.length > 1) {
      for (let r = endRoot - 1; r >= startRoot; r--) roots.push(r)
    }
    const beatMs = (60 / Math.max(48, Math.min(180, bpm))) * 1000
    let cursorMs = 50

    liveSound(this, `Vocal Coach: ${pattern.name}`)

    roots.forEach((rootMidi, repIdx) => {
      // Quick chord cue before each transposition
      const cueT = cursorMs
      this.timers.push(window.setTimeout(() => {
        if (!this._running) return
        playChordCue(rootMidi, false, 0.22)
      }, cueT))
      cursorMs += Math.round(beatMs * 1.1)

      pattern.steps.forEach((semi, idx) => {
        const durMs = Math.round((pattern.beats[idx] ?? 0.5) * beatMs)
        const targetMidi = rootMidi + semi
        const leadMidi = pattern.leadSteps ? rootMidi + pattern.leadSteps[idx] : null
        const at = cursorMs
        this.timers.push(window.setTimeout(() => {
          if (!this._running) return
          if (leadMidi !== null) {
            // Harmony drill: piano plays lead clearly, soft vocal guide plays YOUR harmony
            playCoachPiano(leadMidi, durMs / 1000, 0.34)
            if (useVocalGuide) playVocalGuideTone(targetMidi, durMs / 1000, 0.24)
          } else {
            playCoachPiano(targetMidi, durMs / 1000, 0.34)
            if (useVocalGuide) playVocalGuideTone(targetMidi, durMs / 1000, 0.16)
          }
          this.onStep?.({
            running: true,
            rootMidi,
            stepIndex: idx,
            targetMidi,
            leadMidi,
            rep: repIdx + 1,
            totalReps: roots.length,
          })
        }, at))
        cursorMs += durMs
      })
      cursorMs += Math.round(beatMs * 0.6)
    })

    this.timers.push(window.setTimeout(() => {
      if (!this._running) return
      this.stop()
      this.onDone?.()
    }, cursorMs + 100))
  }

  stop() {
    this._running = false
    this.timers.forEach(id => clearTimeout(id))
    this.timers = []
    quietSound(this)
    this.onStep?.({
      running: false,
      rootMidi: 60,
      stepIndex: -1,
      targetMidi: null,
      leadMidi: null,
      rep: 0,
      totalReps: 0,
    })
  }
}

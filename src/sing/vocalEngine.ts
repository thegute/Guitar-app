// Dedicated continuous Vocal Pitch, Vibrato, Breath, Tone & Song Melody Engine.
// Kept strictly separate from `src/audio/noteDetect.ts` so guitar follow-along accuracy is untouched.
import { PitchDetector } from 'pitchy'
import { FFT } from '../audio/noteDetect'

export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const

export function midiToNoteName(midi: number): string {
  const r = Math.round(midi)
  const pc = ((r % 12) + 12) % 12
  const oct = Math.floor(r / 12) - 1
  return `${NOTE_NAMES[pc]}${oct}`
}

export function midiToHz(midi: number, a4 = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12)
}

export function hzToMidi(hz: number, a4 = 440): number {
  return 69 + 12 * Math.log2(hz / a4)
}

export interface VibratoInfo {
  active: boolean
  /** oscillation rate in Hz (healthy natural vibrato is ~4.8–7.4 Hz) */
  rateHz: number
  /** peak-to-center extent in cents */
  depthCents: number
  /** mean center pitch in fractional MIDI (used so natural vibrato is rewarded, not penalized) */
  centerMidi: number
  quality: 'none' | 'smooth' | 'wide' | 'tremolo'
}

export interface ToneInfo {
  /** 0 (very breathy/airy) .. 1 (clear, focused vocal fold closure) */
  clarity: number
  /** 0 (dark/swallowed) .. 0.5 (balanced) .. 1 (bright/ringy in the mask) */
  brightness: number
  /** 0..1 energy in the 2.2–3.8 kHz "singer's formant" ring band */
  ring: number
  label: 'Airy' | 'Warm' | 'Balanced' | 'Bright Ring' | 'Quiet'
}

export type DiagnosticFlag =
  | 'scoop'      // started >28¢ flat and slid up into the pitch
  | 'sag'        // pitch sagged >22¢ flat near the end of a held note (breath support)
  | 'strain'     // sharp (>22¢) near/above upper comfort range
  | 'crack'      // sudden jitter/flip near passaggio break
  | 'vibrato'    // smooth natural vibrato detected (positive!)

export interface VocalFrame {
  t: number
  /** instantaneous fractional MIDI (or null if unvoiced / quiet) */
  midi: number | null
  /** vibrato-aware center pitch in fractional MIDI (equals midi when straight tone) */
  centerMidi: number | null
  hz: number
  /** 0..1 normalized loudness */
  level: number
  /** dB SPL-ish relative level (-60..0) */
  db: number
  /** pitchy clarity 0..1 */
  pitchClarity: number
  /** unvoiced hiss energy 0..1 (for "sss" breathing support drills) */
  hiss: number
  vibrato: VibratoInfo
  tone: ToneInfo
  flags: DiagnosticFlag[]
}

export interface MelodyNote {
  /** start time in seconds */
  t0: number
  /** end time in seconds */
  t1: number
  /** target MIDI note (integer or quarter-tone smoothed) */
  midi: number
  /** optional lyric word/syllable */
  lyric?: string
}

export interface HardSpot {
  label: string
  reason: 'high' | 'leap' | 'fast'
  t0: number
  t1: number
  peakMidi: number
}

export interface SongChord {
  t0: number
  t1: number
  /** root pitch class 0..11 (C..B) */
  root: number
  minor: boolean
  name: string
}

export interface CapoAdvice {
  keyRoot: number
  keyMinor: boolean
  keyName: string
  capo: number
  /** easy open guitar shapes to play with that capo */
  shapes: string[]
}

export interface ExtractedSongAnalysis {
  notes: MelodyNote[]
  contour: { t: number; midi: number | null }[]
  minMidi: number
  maxMidi: number
  tessituraLow: number
  tessituraHigh: number
  hardSpots: HardSpot[]
  keyRoot: number
  keyMinor: boolean
  chords: SongChord[]
  duration: number
}

/**
 * Real-time continuous vocal tracker with octave-jump guard, vibrato-aware center pitch,
 * tone/resonance analysis, unvoiced hiss detection (for breath drills), and smart coaching diagnostics.
 */
export class VocalTracker {
  private det: PitchDetector<Float32Array>
  private fft: FFT
  private win: Float32Array
  private re: Float32Array
  private im: Float32Array
  private sr: number
  private n: number
  private hist: { t: number; m: number; lvl: number }[] = []
  private lastMidi: number | null = null
  private octaveRun = 0
  private noteStartT = 0
  private noteStartMidi: number | null = null
  private notePeakMidi = 0
  private hissHist: number[] = []
  /** singer's upper comfort MIDI (used to detect tension-sharp near the top) */
  comfortHigh = 67
  /** singer's passaggio break MIDI (used to spot vocal-break jitter) */
  passaggioMidi = 63
  /** minimum & maximum plausible singing Hz */
  minHz = 65   // C2
  maxHz = 1250 // Eb6

  constructor(sampleRate = 48000, frameSize = 2048) {
    this.sr = sampleRate
    this.n = frameSize
    this.det = PitchDetector.forFloat32Array(frameSize)
    this.fft = new FFT(frameSize)
    this.win = new Float32Array(frameSize)
    for (let i = 0; i < frameSize; i++) this.win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frameSize - 1))
    this.re = new Float32Array(frameSize)
    this.im = new Float32Array(frameSize)
  }

  reset() {
    this.hist = []
    this.lastMidi = null
    this.octaveRun = 0
    this.noteStartT = 0
    this.noteStartMidi = null
    this.hissHist = []
  }

  /** Analyze one audio buffer (`length >= frameSize`) at timestamp `t` (seconds). */
  process(buf: Float32Array, t: number, targetMidi: number | null = null): VocalFrame {
    const n = this.n
    const slice = buf.length === n ? buf : buf.subarray(Math.max(0, buf.length - n))
    let sumSq = 0
    for (let i = 0; i < n; i++) {
      const v = slice[i] ?? 0
      sumSq += v * v
      this.re[i] = v * this.win[i]
      this.im[i] = 0
    }
    const rms = Math.sqrt(sumSq / n)
    const level = Math.min(1, rms * 5.5)
    const db = rms > 1e-6 ? Math.max(-60, 20 * Math.log10(rms)) : -60

    // Spectrum for tone/resonance, ring (singer's formant 2.2-3.8 kHz), and unvoiced hiss (3.5-8 kHz)
    this.fft.run(this.re, this.im)
    const binHz = this.sr / n
    let lowE = 0, midE = 0, ringE = 0, hissE = 0, totE = 1e-12
    const maxBin = Math.min(n / 2 - 1, Math.floor(8500 / binHz))
    for (let i = 1; i <= maxBin; i++) {
      const p = this.re[i] * this.re[i] + this.im[i] * this.im[i]
      const f = i * binHz
      totE += p
      if (f < 500) lowE += p
      else if (f < 2200) midE += p
      else if (f <= 3800) ringE += p
      if (f >= 3200 && f <= 8000) hissE += p
    }
    const ring = Math.min(1, (ringE / totE) * 4.5)
    const brightness = Math.min(1, ((midE * 0.65 + ringE * 1.9 + hissE * 0.4) / totE) * 1.45)

    // Pitch detection (McLeod Pitch Method via pitchy)
    const [rawHz, rawClarity] = this.det.findPitch(slice, this.sr)
    const voiced = rms >= 0.0045 && rawClarity >= 0.78 && rawHz >= this.minHz && rawHz <= this.maxHz

    // Unvoiced hiss energy ("sss" breathing exercises: high energy above 3.2 kHz, low pitch clarity)
    const hissRaw = !voiced && rms >= 0.004 && hissE / totE > 0.35 ? Math.min(1, rms * 8) : 0
    this.hissHist.push(hissRaw)
    if (this.hissHist.length > 20) this.hissHist.shift()

    let midi: number | null = null
    if (voiced) {
      let m = hzToMidi(rawHz)
      // Octave-jump protection (fixes classic low-voice octave doubling glitch!)
      if (this.lastMidi !== null && Math.abs(Math.abs(m - this.lastMidi) - 12) < 1.1) {
        this.octaveRun++
        if (this.octaveRun < 6) m -= Math.sign(m - this.lastMidi) * 12
      } else {
        this.octaveRun = 0
      }
      // Subtle smoothing against single-frame spikes unless genuine leap
      if (this.lastMidi !== null && Math.abs(m - this.lastMidi) < 0.75) {
        m = this.lastMidi * 0.35 + m * 0.65
      }
      midi = m
      // Track start of new sung note for onset/scoop & sustain/sag diagnostics
      if (this.lastMidi === null || Math.abs(m - this.lastMidi) > 1.35) {
        this.noteStartT = t
        this.noteStartMidi = m
        this.notePeakMidi = m
      } else if (m > this.notePeakMidi) {
        this.notePeakMidi = m
      }
      this.lastMidi = m
      this.hist.push({ t, m, lvl: level })
    } else if (this.hist.length && t - this.hist[this.hist.length - 1].t > 0.25) {
      this.lastMidi = null
      this.noteStartMidi = null
    }
    while (this.hist.length && t - this.hist[0].t > 0.72) this.hist.shift()

    const vibrato = this.analyzeVibrato(midi)
    const centerMidi = midi === null ? null : vibrato.active ? vibrato.centerMidi : midi

    const clarity = voiced ? Math.max(0, Math.min(1, (rawClarity - 0.62) / 0.36)) : 0
    const tone: ToneInfo = {
      clarity,
      brightness,
      ring,
      label: !voiced
        ? 'Quiet'
        : clarity < 0.42
          ? 'Airy'
          : ring > 0.42 || brightness > 0.66
            ? 'Bright Ring'
            : brightness < 0.28
              ? 'Warm'
              : 'Balanced',
    }

    const flags = this.diagnose(t, midi, centerMidi, targetMidi, vibrato)
    return {
      t,
      midi,
      centerMidi,
      hz: voiced && midi !== null ? midiToHz(midi) : 0,
      level,
      db,
      pitchClarity: voiced ? rawClarity : 0,
      hiss: hissRaw,
      vibrato,
      tone,
      flags,
    }
  }

  /** Steadiness of an unvoiced "sss" breath hiss over the last ~0.5s (0..1). */
  hissSteadiness(): number {
    const active = this.hissHist.filter(v => v > 0.08)
    if (active.length < 6) return 0
    const mean = active.reduce((a, b) => a + b, 0) / active.length
    const variance = active.reduce((s, v) => s + (v - mean) * (v - mean), 0) / active.length
    const cv = Math.sqrt(variance) / (mean || 1)
    return Math.max(0, Math.min(1, 1 - cv * 1.6))
  }

  private analyzeVibrato(curMidi: number | null): VibratoInfo {
    const empty: VibratoInfo = { active: false, rateHz: 0, depthCents: 0, centerMidi: curMidi ?? 0, quality: 'none' }
    if (curMidi === null || this.hist.length < 12) return empty
    // Use continuous stretch from the tail where pitch stays within ±2.2 semitones
    const seg: { t: number; m: number }[] = []
    for (let i = this.hist.length - 1; i >= 0; i--) {
      if (seg.length && Math.abs(this.hist[i].m - seg[seg.length - 1].m) > 1.6) break
      seg.push(this.hist[i])
    }
    seg.reverse()
    if (seg.length < 10) return empty
    const span = seg[seg.length - 1].t - seg[0].t
    if (span < 0.32) return empty

    const mean = seg.reduce((s, p) => s + p.m, 0) / seg.length
    // Count zero-crossings around mean to estimate oscillation rate
    let crossings = 0
    let maxDev = 0
    let prevSign = 0
    for (const p of seg) {
      const d = p.m - mean
      if (Math.abs(d) > maxDev) maxDev = Math.abs(d)
      const s = d > 0.08 ? 1 : d < -0.08 ? -1 : 0
      if (s !== 0) {
        if (prevSign !== 0 && s !== prevSign) crossings++
        prevSign = s
      }
    }
    const rateHz = crossings / (2 * span)
    const depthCents = Math.round(maxDev * 100)
    const active = crossings >= 3 && rateHz >= 3.8 && rateHz <= 9.2 && depthCents >= 20 && depthCents <= 180
    if (!active) return { ...empty, centerMidi: mean }
    const quality: VibratoInfo['quality'] =
      rateHz >= 4.6 && rateHz <= 7.4 && depthCents >= 22 && depthCents <= 115
        ? 'smooth'
        : depthCents > 115
          ? 'wide'
          : 'tremolo'
    return { active: true, rateHz: Math.round(rateHz * 10) / 10, depthCents, centerMidi: mean, quality }
  }

  private diagnose(
    t: number,
    midi: number | null,
    centerMidi: number | null,
    targetMidi: number | null,
    vib: VibratoInfo,
  ): DiagnosticFlag[] {
    const out: DiagnosticFlag[] = []
    if (midi === null || centerMidi === null) return out
    if (vib.active && vib.quality === 'smooth') out.push('vibrato')

    const noteAge = t - this.noteStartT
    // 1. Flat scoop on attack: started >30¢ below settled pitch and rose up into it within 0.45s
    if (this.noteStartMidi !== null && noteAge >= 0.16 && noteAge <= 0.65) {
      const ref = targetMidi ?? centerMidi
      if (ref - this.noteStartMidi > 0.32 && Math.abs(centerMidi - ref) < 0.35) {
        out.push('scoop')
      }
    }

    // 2. Breath sag: held >0.75s and pitch dropped >22¢ below peak or target in tail
    if (noteAge > 0.75 && this.hist.length >= 10) {
      const tail = this.hist.slice(-5).reduce((s, x) => s + x.m, 0) / 5
      const early = this.hist.slice(0, Math.min(5, this.hist.length)).reduce((s, x) => s + x.m, 0) / Math.min(5, this.hist.length)
      if (early - tail > 0.24 && (!targetMidi || targetMidi - tail > 0.22)) {
        out.push('sag')
      }
    }

    // 3. Tension-sharp near upper ceiling
    if (targetMidi !== null && targetMidi >= this.comfortHigh - 2 && centerMidi - targetMidi > 0.25) {
      out.push('strain')
    }

    // 4. Passaggio crack / sudden flip near vocal break zone
    if (Math.abs(midi - this.passaggioMidi) <= 2.5 && this.hist.length >= 4) {
      const a = this.hist[this.hist.length - 1].m
      const b = this.hist[this.hist.length - 2].m
      const c = this.hist[this.hist.length - 3].m
      if (Math.abs(a - b) > 1.2 && Math.abs(b - c) > 1.2) {
        out.push('crack')
      }
    }
    return out
  }
}

/**
 * Evaluate pitch accuracy in cents, respecting natural vibrato (scores by center pitch when smooth vibrato is active).
 */
export function pitchErrorCents(frame: VocalFrame, targetMidi: number): number | null {
  const m = frame.centerMidi ?? frame.midi
  if (m === null) return null
  return Math.round((m - targetMidi) * 100)
}

/**
 * Offline melody extractor for an isolated vocal stem (or mono vocal clip).
 * Scans in 40ms hops, removes octave glitches, quantizes into clean MelodyNotes,
 * computes song vocal range + tessitura, and identifies the 3 hardest spots for auto-looping.
 */
export function extractVocalMelody(mono: Float32Array, sr: number): Omit<ExtractedSongAnalysis, 'keyRoot' | 'keyMinor' | 'chords'> {
  const frameSize = 2048
  const hop = Math.max(256, Math.round(sr * 0.04)) // 40ms hop
  const det = PitchDetector.forFloat32Array(frameSize)
  const contour: { t: number; midi: number | null }[] = []
  const voicedMidis: number[] = []
  let prevMidi: number | null = null

  for (let i = 0; i + frameSize <= mono.length; i += hop) {
    const seg = mono.subarray(i, i + frameSize)
    let sum = 0
    for (let k = 0; k < frameSize; k++) sum += seg[k] * seg[k]
    const rms = Math.sqrt(sum / frameSize)
    const t = i / sr
    if (rms < 0.012) {
      contour.push({ t, midi: null })
      continue
    }
    const [hz, clarity] = det.findPitch(seg, sr)
    if (clarity >= 0.76 && hz >= 75 && hz <= 1150) {
      let m = hzToMidi(hz)
      if (prevMidi !== null && Math.abs(Math.abs(m - prevMidi) - 12) < 1.2) {
        m -= Math.sign(m - prevMidi) * 12
      }
      prevMidi = m
      contour.push({ t, midi: m })
      voicedMidis.push(m)
    } else {
      contour.push({ t, midi: null })
    }
  }

  // Median-filter 3-frame window on voiced points to clean single-frame outliers
  const clean = contour.map((p, i) => {
    if (p.midi === null) return p
    const vals = [contour[i - 1]?.midi, p.midi, contour[i + 1]?.midi].filter((v): v is number => v !== null && v !== undefined)
    vals.sort((a, b) => a - b)
    return { t: p.t, midi: vals[vals.length >> 1] }
  })

  // Segment into clean MelodyNotes (min duration 120ms, merge same rounded MIDI across tiny <80ms gaps)
  const notes: MelodyNote[] = []
  let curMidi: number | null = null
  let curT0 = 0
  let curT1 = 0
  const flush = () => {
    if (curMidi !== null && curT1 - curT0 >= 0.12) {
      notes.push({ t0: Math.round(curT0 * 100) / 100, t1: Math.round(curT1 * 100) / 100, midi: curMidi })
    }
    curMidi = null
  }
  const hopSec = hop / sr
  for (const p of clean) {
    if (p.midi === null) {
      if (curMidi !== null && p.t - curT1 > 0.09) flush()
      continue
    }
    const r = Math.round(p.midi)
    if (curMidi === null) {
      curMidi = r
      curT0 = p.t
      curT1 = p.t + hopSec
    } else if (r === curMidi) {
      curT1 = p.t + hopSec
    } else {
      flush()
      curMidi = r
      curT0 = p.t
      curT1 = p.t + hopSec
    }
  }
  flush()

  // Compute range & tessitura (10th–90th percentile of sung notes)
  const sorted = [...voicedMidis].sort((a, b) => a - b)
  const minMidi = sorted.length ? Math.round(sorted[Math.floor(sorted.length * 0.02)]) : 52
  const maxMidi = sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.98))]) : 67
  const tessituraLow = sorted.length ? Math.round(sorted[Math.floor(sorted.length * 0.15)]) : minMidi
  const tessituraHigh = sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.85))]) : maxMidi

  // Auto-detect up to 3 Hard Spots for instant Tough-Spot Loops
  const hardSpots: HardSpot[] = []
  const dur = mono.length / sr
  if (notes.length >= 2) {
    // 1. Highest note peak
    let peak = notes[0]
    for (const n of notes) if (n.midi > peak.midi) peak = n
    hardSpots.push({
      label: `High Peak (${midiToNoteName(peak.midi)})`,
      reason: 'high',
      t0: Math.max(0, peak.t0 - 1.5),
      t1: Math.min(dur, peak.t1 + 1.8),
      peakMidi: peak.midi,
    })

    // 2. Biggest melodic leap
    let bestLeap = 0, leapIdx = -1
    for (let i = 1; i < notes.length; i++) {
      if (notes[i].t0 - notes[i - 1].t1 < 0.8) {
        const d = Math.abs(notes[i].midi - notes[i - 1].midi)
        if (d > bestLeap) { bestLeap = d; leapIdx = i }
      }
    }
    if (leapIdx > 0 && bestLeap >= 5) {
      const a = notes[leapIdx - 1], b = notes[leapIdx]
      hardSpots.push({
        label: `Big Leap (${midiToNoteName(a.midi)} → ${midiToNoteName(b.midi)})`,
        reason: 'leap',
        t0: Math.max(0, a.t0 - 1.2),
        t1: Math.min(dur, b.t1 + 1.8),
        peakMidi: Math.max(a.midi, b.midi),
      })
    }

    // 3. Fastest vocal run (most note changes inside a 2.5s window)
    let bestDensity = 0, denseT = 0, densePeak = maxMidi
    for (let i = 0; i < notes.length; i++) {
      let count = 0, pk = notes[i].midi
      for (let j = i; j < notes.length && notes[j].t0 - notes[i].t0 <= 2.5; j++) {
        count++
        if (notes[j].midi > pk) pk = notes[j].midi
      }
      if (count > bestDensity) { bestDensity = count; denseT = notes[i].t0; densePeak = pk }
    }
    if (bestDensity >= 6) {
      hardSpots.push({
        label: `Fast Phrase (${bestDensity} notes)`,
        reason: 'fast',
        t0: Math.max(0, denseT - 0.8),
        t1: Math.min(dur, denseT + 3.2),
        peakMidi: densePeak,
      })
    }
  }

  return { notes, contour, minMidi, maxMidi, tessituraLow, tessituraHigh, hardSpots, duration: dur }
}

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

/** Compute simple 12-bin chroma over a window of mono audio using our radix-2 FFT. */
function windowChroma(mono: Float32Array, start: number, sr: number, fft: FFT, win: Float32Array, re: Float32Array, im: Float32Array): number[] {
  const n = fft.n
  for (let i = 0; i < n; i++) {
    re[i] = (mono[start + i] ?? 0) * win[i]
    im[i] = 0
  }
  fft.run(re, im)
  const acc = new Array<number>(12).fill(0)
  const binHz = sr / n
  const lo = Math.max(2, Math.floor(75 / binHz))
  const hi = Math.min(n / 2 - 1, Math.floor(1400 / binHz))
  for (let i = lo; i <= hi; i++) {
    const mag = Math.hypot(re[i], im[i])
    if (mag < 1e-4) continue
    const midi = hzToMidi(i * binHz)
    const near = Math.round(midi)
    const off = Math.abs(midi - near)
    if (off > 0.35) continue
    acc[((near % 12) + 12) % 12] += mag * (1 - off * 2)
  }
  return acc
}

/** Detect song key (root + major/minor) and 2-second chord timeline from a backing track or full mix. */
export function detectSongKeyAndChords(mono: Float32Array, sr: number): { keyRoot: number; keyMinor: boolean; chords: SongChord[] } {
  const n = 4096
  const fft = new FFT(n)
  const win = new Float32Array(n)
  for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))
  const re = new Float32Array(n), im = new Float32Array(n)

  const totalChroma = new Array<number>(12).fill(0)
  const stepSec = 2.0
  const stepSamp = Math.max(n, Math.round(sr * stepSec))
  const chords: SongChord[] = []

  for (let pos = 0; pos + n <= mono.length; pos += stepSamp) {
    // Average 2 frames inside each 2s block
    const c1 = windowChroma(mono, pos, sr, fft, win, re, im)
    const c2 = pos + (stepSamp >> 1) + n <= mono.length ? windowChroma(mono, pos + (stepSamp >> 1), sr, fft, win, re, im) : c1
    const c = c1.map((v, k) => v + c2[k])
    for (let k = 0; k < 12; k++) totalChroma[k] += c[k]

    // Match best major/minor triad
    let bestScore = -1, bestRoot = 0, bestMinor = false
    for (let r = 0; r < 12; r++) {
      const maj = c[r] * 1.2 + c[(r + 4) % 12] + c[(r + 7) % 12] - c[(r + 3) % 12] * 0.4
      if (maj > bestScore) { bestScore = maj; bestRoot = r; bestMinor = false }
      const min = c[r] * 1.2 + c[(r + 3) % 12] + c[(r + 7) % 12] - c[(r + 4) % 12] * 0.4
      if (min > bestScore) { bestScore = min; bestRoot = r; bestMinor = true }
    }
    const t0 = Math.round((pos / sr) * 100) / 100
    const t1 = Math.round(Math.min(mono.length / sr, (pos + stepSamp) / sr) * 100) / 100
    const name = `${NOTE_NAMES[bestRoot]}${bestMinor ? 'm' : ''}`
    const prev = chords[chords.length - 1]
    if (prev && prev.name === name) prev.t1 = t1
    else chords.push({ t0, t1, root: bestRoot, minor: bestMinor, name })
  }

  // Krumhansl-Schmuckler key correlation
  let bestKey = 0, bestMinor = false, bestCorr = -Infinity
  for (let r = 0; r < 12; r++) {
    let sm = 0, sn = 0
    for (let k = 0; k < 12; k++) {
      const v = totalChroma[(r + k) % 12]
      sm += v * MAJOR_PROFILE[k]
      sn += v * MINOR_PROFILE[k]
    }
    if (sm > bestCorr) { bestCorr = sm; bestKey = r; bestMinor = false }
    if (sn > bestCorr) { bestCorr = sn; bestKey = r; bestMinor = true }
  }
  return { keyRoot: bestKey, keyMinor: bestMinor, chords }
}

/**
 * Given a song key + user semitone shift, recommend the easiest Guitar Capo fret (0–7)
 * and open-chord family (G, C, D, A, E / Em, Am, Dm) so you can sing AND strum comfortably!
 */
export function recommendCapoForKey(origKeyRoot: number, keyMinor: boolean, shiftSemis: number): CapoAdvice {
  const targetRoot = (((origKeyRoot + shiftSemis) % 12) + 12) % 12
  const keyName = `${NOTE_NAMES[targetRoot]}${keyMinor ? 'm' : ''}`
  // Guitar-friendly open major keys: G (7), C (0), D (2), A (9), E (4)
  // Guitar-friendly open minor keys: Em (4), Am (9), Dm (2)
  const friendly = keyMinor
    ? [
        { root: 4, shapes: ['Em', 'C', 'G', 'D'] },
        { root: 9, shapes: ['Am', 'F', 'C', 'G'] },
        { root: 2, shapes: ['Dm', 'Bb', 'F', 'C'] },
      ]
    : [
        { root: 7, shapes: ['G', 'Em', 'C', 'D'] },
        { root: 0, shapes: ['C', 'Am', 'F', 'G'] },
        { root: 2, shapes: ['D', 'Bm', 'G', 'A'] },
        { root: 9, shapes: ['A', 'F#m', 'D', 'E'] },
        { root: 4, shapes: ['E', 'C#m', 'A', 'B'] },
      ]

  let bestCapo = 0
  let bestShapes = friendly[0].shapes
  let bestScore = Infinity
  for (let idx = 0; idx < friendly.length; idx++) {
    const f = friendly[idx]
    const capo = (((targetRoot - f.root) % 12) + 12) % 12
    if (capo <= 7) {
      // Slightly prefer lower capo frets and G/C/Em/Am shapes
      const score = capo * 1.15 + idx * 0.45
      if (score < bestScore) {
        bestScore = score
        bestCapo = capo
        bestShapes = f.shapes
      }
    }
  }
  return { keyRoot: targetRoot, keyMinor, keyName, capo: bestCapo, shapes: bestShapes }
}

/** Shift a SongChord list by `semis` semitones (for Mode A: transposed guitar chord display). */
export function shiftChords(chords: SongChord[], semis: number): SongChord[] {
  if (!semis) return chords
  return chords.map(c => {
    const root = (((c.root + semis) % 12) + 12) % 12
    return { ...c, root, name: `${NOTE_NAMES[root]}${c.minor ? 'm' : ''}` }
  })
}

/** Compute the recommended semitone shift so a song's vocal range sits comfortably in the singer's Voice Profile. */
export function recommendedKeyShift(
  songMin: number,
  songMax: number,
  comfortLow: number,
  comfortHigh: number,
): { semis: number; reason: string } {
  const songCenter = (songMin + songMax) / 2
  const userCenter = (comfortLow + comfortHigh) / 2
  // Prioritize keeping songMax <= comfortHigh + 1 while staying as close to original key as possible
  let semis = Math.round(userCenter - songCenter)
  if (songMax + semis > comfortHigh + 1) {
    semis = Math.round(comfortHigh - songMax)
  }
  if (songMin + semis < comfortLow - 2) {
    semis = Math.round(userCenter - songCenter)
  }
  semis = Math.max(-12, Math.min(12, semis))
  const reason =
    semis === 0
      ? 'Original key already fits your comfortable range!'
      : semis < 0
        ? `Lower ${Math.abs(semis)} semitone${Math.abs(semis) === 1 ? '' : 's'} so the high notes sit comfortably without strain.`
        : `Raise ${semis} semitone${semis === 1 ? '' : 's'} so the low notes stay rich and clear.`
  return { semis, reason }
}

// Deep Audio-Visual Alignment & Render-and-Compare ("Analysis-by-Synthesis") Referee for Riff Scanner.
// Used on YouTube Shorts, Full YouTube Tab Videos, and any video-backed tab scan:
//  1. Extracts a 25 fps (40 ms hop) 12-bin chroma + harmonic-salience + onset-flux timeline from the real audio.
//  2. Synthesizes each tab step's expected guitar harmonic chroma profile (fundamental + harmonics 2..5).
//  3. Auto-detects Tuning & Capo (Standard, Drop D, Eb, D Standard, Open G, Capos 1–7) by comparing the
//     synthesized tab profile against the real audio.
//  4. Runs banded Dynamic Time Warping (DTW) to lock every printed tab step to its exact millisecond in the
//     real recording (eliminating crude 400 ms linear drift!).
//  5. Runs Render-and-Compare bar/note verification: tests visual runner-up fret candidates (`alts` + common
//     OCR confusions 3↔8, 5↔6, 1↔7, 0↔9) by comparing each candidate's synthesized harmonic salience against
//     the real audio at the exact DTW-aligned timestamp!
import { FFT } from '../audio/noteDetect'
import { hearing, type Hearing } from './hear'
import type { Song, SongNote, SongStep } from '../tabs/model'

const FFT_N = 4096
const HOP_SEC = 0.04 // 25 fps audio analysis grid
const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12)

export interface AudioFrame {
  t: number
  /** L2-normalized 12-bin chroma (C=0..B=11) */
  chroma: Float32Array
  /** Normalized spectral energy (0..1) */
  energy: number
  /** Positive spectral flux (onset strength) */
  flux: number
}

export interface AudioTimeline {
  frames: AudioFrame[]
  hopSec: number
  duration: number
}

/** Extract a 25 fps chroma + onset-flux timeline from mono audio using KGuitar's own FFT. */
export function buildAudioTimeline(x: Float32Array, sr: number, hopSec = HOP_SEC): AudioTimeline {
  const fft = new FFT(FFT_N)
  const win = new Float32Array(FFT_N)
  for (let i = 0; i < FFT_N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_N - 1))

  const hop = Math.max(256, Math.round(sr * hopSec))
  const frames: AudioFrame[] = []
  let prevMag: Float32Array | null = null
  let maxEnergy = 1e-9

  // Precompute bin -> pitch-class weights for guitar range (E1..E6, ~41 Hz..1400 Hz)
  const half = FFT_N / 2
  const binPc = new Int8Array(half).fill(-1)
  const binWt = new Float32Array(half)
  for (let k = 1; k < half; k++) {
    const f = (k * sr) / FFT_N
    if (f < 55 || f > 2400) continue
    const midi = 69 + 12 * Math.log2(f / 440)
    const nearest = Math.round(midi)
    const err = Math.abs(midi - nearest)
    if (err < 0.38) {
      binPc[k] = ((nearest % 12) + 12) % 12
      // Slight gentle rolloff above 1200 Hz so fundamentals carry slightly more weight than bright overtones
      binWt[k] = Math.cos(err * Math.PI) * (f > 1200 ? 0.6 : 1)
    }
  }

  const re = new Float32Array(FFT_N)
  const im = new Float32Array(FFT_N)

  for (let pos = 0; pos + FFT_N <= x.length; pos += hop) {
    let e = 0
    for (let i = 0; i < FFT_N; i++) {
      const s = x[pos + i] * win[i]
      re[i] = s
      im[i] = 0
      e += s * s
    }
    fft.run(re, im)
    const chroma = new Float32Array(12)
    const mag = new Float32Array(half)
    let flux = 0
    for (let k = 1; k < half; k++) {
      const m = Math.hypot(re[k], im[k])
      mag[k] = m
      if (prevMag && m > prevMag[k]) flux += m - prevMag[k]
      const pc = binPc[k]
      if (pc >= 0) chroma[pc] += m * binWt[k]
    }
    prevMag = mag

    let norm = 0
    for (let p = 0; p < 12; p++) norm += chroma[p] * chroma[p]
    norm = Math.sqrt(norm)
    if (norm > 1e-8) {
      for (let p = 0; p < 12; p++) chroma[p] /= norm
    }
    const rms = Math.sqrt(e / FFT_N)
    if (rms > maxEnergy) maxEnergy = rms
    frames.push({ t: (pos + FFT_N * 0.25) / sr, chroma, energy: rms, flux })
  }

  for (const fr of frames) fr.energy /= maxEnergy
  return { frames, hopSec, duration: x.length / sr }
}

/** Synthesize the expected L2-normalized 12-bin guitar chroma vector for a set of notes (with guitar harmonics 1..4). */
export function synthesizeStepChroma(notes: { string: number; fret: number; tech?: string }[], tuning: number[], capo = 0): Float32Array {
  const chroma = new Float32Array(12)
  // Harmonic semitone offsets: fundamental (0), octave (+12 -> 0), fifth (+19 -> +7), 2nd oct (+24 -> 0), major 3rd (+28 -> +4)
  const HARMONICS: [number, number][] = [
    [0, 1.0],
    [7, 0.32],
    [4, 0.14],
  ]
  for (const n of notes) {
    if (n.tech === 'x') continue
    const openMidi = tuning[n.string]
    if (openMidi === undefined) continue
    const midi = openMidi + capo + n.fret
    for (const [semi, wt] of HARMONICS) {
      const pc = (((midi + semi) % 12) + 12) % 12
      chroma[pc] += wt
    }
  }
  let norm = 0
  for (let p = 0; p < 12; p++) norm += chroma[p] * chroma[p]
  norm = Math.sqrt(norm)
  if (norm > 1e-8) {
    for (let p = 0; p < 12; p++) chroma[p] /= norm
  }
  return chroma
}

function chromaDot(a: Float32Array, b: Float32Array): number {
  let s = 0
  for (let i = 0; i < 12; i++) s += a[i] * b[i]
  return s
}

export interface TuningCandidate {
  label: string
  tuning: number[]
  capo: number
}

export function candidateTunings(baseTuning: number[]): TuningCandidate[] {
  const isStd6 = baseTuning.length === 6 && baseTuning.join(',') === '40,45,50,55,59,64'
  const out: TuningCandidate[] = [{ label: 'Standard', tuning: [...baseTuning], capo: 0 }]
  if (!isStd6) return out
  out.push(
    { label: 'Drop D', tuning: [38, 45, 50, 55, 59, 64], capo: 0 },
    { label: 'Eb Standard (-1)', tuning: [39, 44, 49, 54, 58, 63], capo: 0 },
    { label: 'D Standard (-2)', tuning: [38, 43, 48, 53, 57, 62], capo: 0 },
    { label: 'Drop C#', tuning: [37, 44, 49, 54, 58, 63], capo: 0 },
    { label: 'Open G', tuning: [38, 43, 50, 55, 59, 62], capo: 0 },
  )
  for (let capo = 1; capo <= 7; capo++) {
    out.push({ label: `Capo ${capo}`, tuning: [...baseTuning], capo })
  }
  return out
}

export interface DtwAlignment {
  /** Aligned audio timestamp (seconds) for each active note step */
  stepTimes: number[]
  /** Per-step chroma cosine match score (0..1) */
  stepScores: number[]
  /** Mean match score across all steps (0..1) */
  meanScore: number
}

/**
 * Banded Dynamic Time Warping (DTW) aligning a sequence of note steps (with synthesized guitar chroma)
 * directly to the recording's 25 fps chroma timeline.
 * Allows leading/trailing silence (talking before/after playing) via free start/end boundaries!
 */
export function dtwAlignSteps(
  steps: { notes: { string: number; fret: number; tech?: string }[]; dur: number }[],
  timeline: AudioTimeline,
  tuning: number[],
  capo = 0,
): DtwAlignment {
  const N = steps.length
  const M = timeline.frames.length
  if (N === 0 || M === 0) return { stepTimes: [], stepScores: [], meanScore: 0 }

  // Synthesize expected chroma for every step
  const syn = steps.map(s => synthesizeStepChroma(s.notes, tuning, capo))

  // Compute DP table: dp[i * M + j] = best cumulative similarity ending with step i aligned to audio frame j
  // Allowed transitions:
  //   (i, j-1) -> (i, j) : sustain same step across consecutive audio frames (slight sustain weight)
  //   (i-1, j-1) -> (i, j) : advance to next step cleanly
  //   (i-1, j-2) -> (i, j) : step skips 1 fast transition frame
  // Free start: step 0 can start at any frame j in the first 35% of the recording (handles intro talking!)
  const NEG = -1e9
  const dp = new Float32Array(N * M).fill(NEG)
  const back = new Int32Array(N * M).fill(-1)

  const maxStart = Math.min(M - 1, Math.max(12, Math.floor(M * 0.4)))
  for (let j = 0; j <= maxStart; j++) {
    const fr = timeline.frames[j]
    const sim = fr.energy > 0.04 ? chromaDot(syn[0], fr.chroma) : 0
    dp[j] = sim
  }

  for (let i = 0; i < N; i++) {
    const rowOff = i * M
    const prevRowOff = (i - 1) * M
    for (let j = 1; j < M; j++) {
      const fr = timeline.frames[j]
      const sim = fr.energy > 0.04 ? chromaDot(syn[i], fr.chroma) : 0.05
      let best = dp[rowOff + j]
      let bp = back[rowOff + j]

      // Sustain step i on frame j (small decay so it prefers advancing when the next note hits)
      const stay = dp[rowOff + j - 1] + sim * 0.35 - 0.015
      if (stay > best) {
        best = stay
        bp = rowOff + j - 1
      }

      if (i > 0) {
        // Advance from step i-1 at j-1, j-2, or j-3 (supports fast 16th runs and held notes alike)
        for (const dj of [1, 2, 3]) {
          if (j - dj < 0) continue
          const prev = dp[prevRowOff + j - dj]
          if (prev <= NEG * 0.5) continue
          // Slight onset bonus when a new step lands on an audio flux spike
          const onsetBoost = Math.min(0.18, fr.flux * 0.008)
          const cand = prev + sim + onsetBoost
          if (cand > best) {
            best = cand
            bp = prevRowOff + j - dj
          }
        }
      }

      dp[rowOff + j] = best
      back[rowOff + j] = bp
    }
  }

  // Pick best end frame for final step N-1 (free trailing silence / outro talking)
  const lastRow = (N - 1) * M
  let bestJ = M - 1
  let bestVal = NEG
  for (let j = Math.max(0, Math.floor(M * 0.15)); j < M; j++) {
    if (dp[lastRow + j] > bestVal) {
      bestVal = dp[lastRow + j]
      bestJ = j
    }
  }

  // Backtrack to find the earliest (onset) frame assigned to each step i
  const stepFrame = new Int32Array(N).fill(0)
  let cur = lastRow + bestJ
  while (cur >= 0) {
    const i = Math.floor(cur / M)
    const j = cur % M
    stepFrame[i] = j // keeps overwriting backward so we land on the exact onset frame of step i!
    const prev = back[cur]
    if (prev < 0 || prev === cur) break
    cur = prev
  }

  const stepTimes: number[] = []
  const stepScores: number[] = []
  let sum = 0
  for (let i = 0; i < N; i++) {
    const j = Math.max(0, Math.min(M - 1, stepFrame[i]))
    stepTimes.push(timeline.frames[j].t)
    const sc = chromaDot(syn[i], timeline.frames[j].chroma)
    stepScores.push(sc)
    sum += sc
  }

  return {
    stepTimes,
    stepScores,
    meanScore: N ? sum / N : 0,
  }
}

/** Auto-detect best Tuning + Capo by comparing synthesized tab chroma against the real recording via DTW. */
export function detectTuningAndCapoViaAudio(
  steps: { notes: { string: number; fret: number; tech?: string }[]; dur: number }[],
  timeline: AudioTimeline,
  baseTuning: number[],
): { best: TuningCandidate; alignment: DtwAlignment; gainOverBase: number } {
  const sampleSteps = steps.slice(0, Math.min(steps.length, 48))
  const cands = candidateTunings(baseTuning)
  let baseScore = 0
  let bestCand = cands[0]
  let bestAlign = dtwAlignSteps(sampleSteps, timeline, cands[0].tuning, cands[0].capo)
  baseScore = bestAlign.meanScore

  for (let i = 1; i < cands.length; i++) {
    const c = cands[i]
    const al = dtwAlignSteps(sampleSteps, timeline, c.tuning, c.capo)
    // Require a clear improvement (+0.09 cosine similarity) over standard tuning so distorted/full-band mixes never false-switch
    if (al.meanScore > bestAlign.meanScore + (bestCand === cands[0] ? 0.09 : 0.015)) {
      bestCand = c
      bestAlign = al
    }
  }

  // Run full alignment on all steps using the winning tuning & capo
  const fullAlign = sampleSteps.length === steps.length
    ? bestAlign
    : dtwAlignSteps(steps, timeline, bestCand.tuning, bestCand.capo)

  return {
    best: bestCand,
    alignment: fullAlign,
    gainOverBase: bestAlign.meanScore - baseScore,
  }
}

/** Common OCR/visual digit confusions on blurry/small guitar tabs */
const OCR_CONFUSIONS: Record<number, number[]> = {
  0: [9, 6, 8],
  1: [7, 4],
  2: [3, 7],
  3: [8, 2, 5],
  4: [1, 9],
  5: [6, 3, 8],
  6: [5, 8, 0],
  7: [1, 2],
  8: [3, 6, 9, 0],
  9: [0, 8, 4],
  10: [12, 16, 18],
  11: [17, 14],
  12: [13, 10],
  13: [18, 12, 15],
  15: [16, 13],
  16: [15, 18],
  17: [11, 12],
  18: [13, 16],
}

export interface PolishSummary {
  tuningLabel: string
  capo: number
  tuningChanged: boolean
  notesCorrected: number
  notesConfirmed: number
  meanMatch: number
  /** 0-based bar indices where visual reading and audio still disagreed (< 0.42 match) */
  weakBars: number[]
}

/**
 * Full Render-and-Compare ("Analysis-by-Synthesis") Audio Verification Pass on a visually read Song:
 *  1. Builds 25 fps audio chroma timeline
 *  2. Auto-detects Tuning & Capo (Standard, Drop D, Eb, D Std, Open G, Capos 1–7)
 *  3. Locks every note step to its exact audio millisecond via DTW
 *  4. For every unsure or weak-scoring note, tests its visual runner-up frets (`alts` + OCR confusions)
 *     against the real audio's harmonic salience at that exact millisecond and picks the winner!
 */
export function renderAndCompareSong(
  song: Song,
  x: Float32Array,
  sr: number,
  opts: { allowTuningSwitch?: boolean } = {},
): PolishSummary {
  const track = song.tracks[0]
  if (!track || !x.length) {
    return { tuningLabel: 'Standard', capo: track?.capo ?? 0, tuningChanged: false, notesCorrected: 0, notesConfirmed: 0, meanMatch: 0, weakBars: [] }
  }

  // Collect all note-bearing steps with their bar index
  const flat: { barIdx: number; step: SongStep }[] = []
  track.bars.forEach((b, barIdx) => {
    for (const st of b.steps) {
      if (st.notes.length) flat.push({ barIdx, step: st })
    }
  })
  if (flat.length < 4) {
    return { tuningLabel: 'Standard', capo: track.capo ?? 0, tuningChanged: false, notesCorrected: 0, notesConfirmed: 0, meanMatch: 0, weakBars: [] }
  }

  const timeline = buildAudioTimeline(x, sr)
  if (timeline.frames.length < 8) {
    return { tuningLabel: 'Standard', capo: track.capo ?? 0, tuningChanged: false, notesCorrected: 0, notesConfirmed: 0, meanMatch: 0, weakBars: [] }
  }

  const baseTuning = track.tuning
  const detected = opts.allowTuningSwitch !== false
    ? detectTuningAndCapoViaAudio(flat.map(f => f.step), timeline, baseTuning)
    : {
        best: { label: 'Standard', tuning: [...baseTuning], capo: track.capo ?? 0 },
        alignment: dtwAlignSteps(flat.map(f => f.step), timeline, baseTuning, track.capo ?? 0),
        gainOverBase: 0,
      }

  const { best, alignment } = detected
  const tuningChanged = best.tuning.join(',') !== baseTuning.join(',') || best.capo !== (track.capo ?? 0)
  if (tuningChanged && alignment.meanScore >= 0.62) {
    track.tuning = [...best.tuning]
    track.capo = best.capo
    for (const { step } of flat) {
      for (const n of step.notes) {
        if (track.tuning[n.string] !== undefined) n.midi = track.tuning[n.string] + best.capo + n.fret
      }
    }
  }

  // Only run note-level audio swaps when DTW alignment actually locked onto the recording (avoids corrupting clean tabs on noisy mixes)
  const strongAlign = alignment.meanScore >= 0.65
  const okAlign = alignment.meanScore >= 0.45

  // Build exact harmonic salience oracle (fundamental + overtones) for note-level Render-and-Compare
  const at: Hearing = hearing(x, sr)
  const salAt = (t: number, midi: number) => {
    // Check tiny ±30 ms window around the DTW onset so pick transient never hides the ringing pitch
    let bestS = 0
    for (const dt of [0, 0.03, -0.02, 0.06]) {
      const f = at(t + dt)
      if (f) bestS = Math.max(bestS, f(midi))
    }
    return bestS
  }

  let notesCorrected = 0
  let notesConfirmed = 0
  const barScores = new Map<number, number[]>()

  flat.forEach(({ barIdx, step }, idx) => {
    const t = alignment.stepTimes[idx]
    const sc = alignment.stepScores[idx]
    barScores.set(barIdx, [...(barScores.get(barIdx) ?? []), sc])
    if (!okAlign) return

    // Compute loudest guitar-range reference at this moment
    let peakRef = 1e-9
    const f0 = at(t + 0.02) ?? at(t)
    if (f0) {
      for (let m = 38; m <= 88; m++) peakRef = Math.max(peakRef, f0(m))
    }

    for (const n of step.notes as (SongNote & { unsure?: boolean; alts?: number[] })[]) {
      if (n.tech === 'x') continue
      const openMidi = track.tuning[n.string]
      if (openMidi === undefined) continue
      const capo = track.capo ?? 0
      const curMidi = openMidi + capo + n.fret
      const curSal = salAt(t, curMidi) / peakRef

      // If audio strongly confirms an unsure digit, clear the amber ring!
      if (n.unsure && curSal >= 0.55) {
        delete n.unsure
        notesConfirmed++
        continue
      }

      // Guardrail: NEVER touch a high-confidence visual digit on noisy/distorted backing tracks!
      // Only consider overriding a confident digit when DTW locked strongly, current note is practically silent (<0.12),
      // and a genuine neural-net runner-up (`n.alts`) is overwhelmingly loud.
      if (!n.unsure) {
        if (!strongAlign || curSal >= 0.12 || !(n.alts?.length)) continue
      }

      const candidateFrets = new Set<number>()
      for (const a of n.alts ?? []) if (a >= 0 && a <= 24 && a !== n.fret) candidateFrets.add(a)
      if (n.unsure) {
        for (const c of OCR_CONFUSIONS[n.fret] ?? []) if (c >= 0 && c <= 24 && c !== n.fret) candidateFrets.add(c)
      }
      if (!candidateFrets.size) continue

      let bestFret = n.fret
      let bestSal = curSal
      for (const cand of candidateFrets) {
        const s = salAt(t, openMidi + capo + cand) / peakRef
        // Strict margin: unsure notes need +0.14 & >= 0.50; confident visual notes need +0.45 & >= 0.68!
        const margin = n.unsure ? 0.14 : 0.45
        const floor = n.unsure ? 0.50 : 0.68
        if (s > bestSal + margin && s >= floor) {
          bestSal = s
          bestFret = cand
        }
      }

      if (bestFret !== n.fret) {
        n.fret = bestFret
        n.midi = openMidi + capo + bestFret
        delete n.unsure
        notesCorrected++
      }
    }
  })

  const weakBars: number[] = []
  for (const [bIdx, scores] of barScores.entries()) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    if (avg < 0.42) weakBars.push(bIdx)
  }

  return {
    tuningLabel: tuningChanged && alignment.meanScore >= 0.62 ? best.label : 'Standard',
    capo: track.capo ?? 0,
    tuningChanged: tuningChanged && alignment.meanScore >= 0.62,
    notesCorrected,
    notesConfirmed,
    meanMatch: alignment.meanScore,
    weakBars,
  }
}

export { midiHz }

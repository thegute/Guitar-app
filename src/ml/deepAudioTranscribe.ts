// Deep Accuracy Audio-to-Tab Signal Processing & Ensemble Helpers (for Riff Scanner Deep Mode):
//  1. Harmonic Overtone Ghost Suppressor (+12 / +19 semitones on bright/distorted electric guitars)
//  2. Two-Model Ensemble Merger (Guitar CRNN + Spotify Basic Pitch + Gemini Chord/Key Context)
//  3. Render-and-Compare Acoustic Salience Filter (drops hallucinated notes with near-zero acoustic support)
//  4. Low-Note Tuning Floor Detector (auto-detects Drop D / Eb Standard from transcribed pitch range)
import type { Note } from './post'
import { hearing } from '../scan/hear'
import { chordInfo } from '../tabs/harmony'

/**
 * Suppress electric/acoustic guitar harmonic ghosts:
 * Overdriven guitars blast loud 2nd (+12 semitones) and 3rd (+19 semitones) harmonics.
 * If a quieter note starts within ±35 ms of a louder root note 12 or 19 semitones lower
 * (and ends at or before the root + 50 ms), suppress it as a harmonic overtone.
 */
export function suppressHarmonicGhosts(notes: Note[]): Note[] {
  if (notes.length < 2) return notes
  const sorted = [...notes].sort((a, b) => a.start - b.start || a.midi - b.midi)
  const drop = new Set<number>()

  for (let i = 0; i < sorted.length; i++) {
    const hi = sorted[i]
    for (let j = 0; j < sorted.length; j++) {
      if (i === j || drop.has(j)) continue
      const lo = sorted[j]
      const diff = hi.midi - lo.midi
      if (diff !== 12 && diff !== 19) continue
      if (Math.abs(hi.start - lo.start) > 0.038) continue
      // Only suppress if the upper harmonic is noticeably quieter and doesn't ring independently well past the root
      const velRatio = hi.velocity / Math.max(0.05, lo.velocity)
      const hiDur = hi.end - hi.start
      const loDur = lo.end - lo.start
      if (velRatio < (diff === 19 ? 0.82 : 0.72) && hi.end <= lo.end + 0.06 && hiDur <= loDur + 0.06) {
        drop.add(i)
        break
      }
    }
  }
  return sorted.filter((_, idx) => !drop.has(idx))
}

/**
 * Ensemble Merger combining the high-res Guitar CRNN model with Spotify Basic Pitch + optional Gemini chord map:
 * - Notes heard by BOTH models (same MIDI within ±65 ms) get boosted confidence/velocity.
 * - Ultra-weak single-model micro-blips that clash with the bar's detected chord are pruned.
 * - Strong Basic Pitch notes (>= 0.52 velocity) missed by CRNN in quiet passages are recovered.
 */
export function ensembleAudioNotes(
  crnnNotes: Note[],
  bpNotes: Note[],
  chordTimes?: { t: number; name: string }[],
): Note[] {
  if (!crnnNotes.length) return bpNotes
  if (!bpNotes.length) return crnnNotes

  const chordPcsAt = (t: number): Set<number> | null => {
    if (!chordTimes?.length) return null
    let active: string | null = null
    for (const c of chordTimes) {
      if (c.t <= t + 0.15) active = c.name
      else break
    }
    if (!active) return null
    const info = chordInfo(active)
    return info ? new Set(info.pcs) : null
  }

  const usedBp = new Set<number>()
  const out: Note[] = []

  for (const cn of crnnNotes) {
    // Check if Basic Pitch agrees on this exact pitch within ±65 ms
    let matchIdx = -1
    let bestDt = Infinity
    for (let j = 0; j < bpNotes.length; j++) {
      if (usedBp.has(j)) continue
      const bn = bpNotes[j]
      if (bn.midi !== cn.midi) continue
      const dt = Math.abs(bn.start - cn.start)
      if (dt <= 0.065 && dt < bestDt) {
        bestDt = dt
        matchIdx = j
      }
    }

    if (matchIdx >= 0) {
      usedBp.add(matchIdx)
      const bn = bpNotes[matchIdx]
      out.push({
        ...cn,
        // Both models agree: boost confidence and keep technique tag if present
        velocity: Math.min(1, Math.max(cn.velocity, bn.velocity) * 1.18),
        tech: cn.tech ?? bn.tech,
      })
    } else {
      // Single-model CRNN note: drop only if ultra-weak micro-blip clashing with the bar's chord
      const dur = cn.end - cn.start
      const pcs = chordPcsAt(cn.start)
      const inChord = !pcs || pcs.has(((cn.midi % 12) + 12) % 12)
      if (cn.velocity < 0.24 && dur < 0.075 && !inChord) continue
      out.push(cn)
    }
  }

  // Recover strong Basic Pitch notes that CRNN missed (only when no other note on same MIDI overlaps)
  for (let j = 0; j < bpNotes.length; j++) {
    if (usedBp.has(j)) continue
    const bn = bpNotes[j]
    const dur = bn.end - bn.start
    if (bn.velocity < 0.54 || dur < 0.09) continue
    const clash = out.some(n => n.midi === bn.midi && Math.abs(n.start - bn.start) < 0.12)
    if (clash) continue
    const pcs = chordPcsAt(bn.start)
    if (pcs && !pcs.has(((bn.midi % 12) + 12) % 12) && bn.velocity < 0.68) continue
    out.push({ ...bn, velocity: bn.velocity * 0.9 })
  }

  return out.sort((a, b) => a.start - b.start || a.midi - b.midi)
}

/**
 * Render-and-Compare Acoustic Salience Filter:
 * Verifies every transcribed note against the isolated guitar audio's real harmonic spectrum at its timestamp,
 * pruning hallucinated ghost blips whose real acoustic salience is near zero (< 0.11 of peak).
 */
export function filterByAcousticSalience(notes: Note[], x: Float32Array, sr: number): Note[] {
  if (!notes.length || !x.length) return notes
  const at = hearing(x, sr)
  const kept: Note[] = []

  for (const n of notes) {
    // High-confidence notes pass straight through
    if (n.velocity >= 0.62 && n.end - n.start >= 0.12) {
      kept.push(n)
      continue
    }
    const f = at(n.start + 0.015) ?? at(n.start)
    if (!f) {
      kept.push(n)
      continue
    }
    let peak = 1e-9
    for (let m = 38; m <= 88; m++) peak = Math.max(peak, f(m))
    const rel = f(n.midi) / peak
    if (rel >= 0.11) kept.push(n)
  }
  return kept
}

/**
 * Inspect the transcribed low-note pitch floor to detect Drop D or Eb Standard automatically
 * when scanning standard 6-string guitar audio.
 */
export function detectAudioTuning(notes: Note[], baseTuning: number[]): { tuning: number[]; label?: string } {
  if (baseTuning.length !== 6 || baseTuning.join(',') !== '40,45,50,55,59,64' || notes.length < 10) {
    return { tuning: baseTuning }
  }
  let countD2 = 0
  let countEb2 = 0
  let countE2 = 0
  for (const n of notes) {
    if (n.midi === 38) countD2++
    else if (n.midi === 39) countEb2++
    else if (n.midi === 40) countE2++
  }
  if (countD2 >= 3 && countEb2 <= 1) {
    return { tuning: [38, 45, 50, 55, 59, 64], label: 'Drop D' }
  }
  if (countEb2 >= 3 && countE2 === 0 && countD2 === 0) {
    return { tuning: [39, 44, 49, 54, 58, 63], label: 'Eb Standard' }
  }
  return { tuning: baseTuning }
}

// Smart Auto-Harmony Engine (Mode B: Sing great with the ORIGINAL recording without straining!).
// Uses diatonic scale degrees, detected chord tones on strong beats, smooth voice-leading,
// and the singer's own Voice Range Profile so the harmony sounds rich AND feels effortless to sing.
import type { MelodyNote, SongChord } from './vocalEngine'

export type HarmonyMode = 'off' | 'lower3' | 'baritone' | 'upper3' | 'autoFit'

export const HARMONY_LABELS: Record<HarmonyMode, { name: string; short: string; desc: string }> = {
  off: { name: 'Lead Melody', short: 'Lead', desc: 'Sing the main vocal line (shift key if needed).' },
  lower3: { name: 'Lower 3rd', short: 'Harm −3rd', desc: 'Classic rock/folk harmony 3–4 semitones below lead — drops high choruses smoothly.' },
  baritone: { name: 'Baritone Anchor', short: 'Baritone', desc: 'Rich lower 5th/6th harmony — ideal when singing along with high tenor or female vocals.' },
  upper3: { name: 'Upper 3rd', short: 'Harm +3rd', desc: 'Bright soaring harmony above the lead melody — lifts low songs and choruses.' },
  autoFit: { name: 'Smart Auto-Fit', short: 'Auto Harm', desc: 'Picks the best chord-tone harmony inside YOUR comfortable range with smooth steps.' },
}

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10]

function scalePitchClasses(keyRoot: number, keyMinor: boolean): number[] {
  const pat = keyMinor ? MINOR_SCALE : MAJOR_SCALE
  return pat.map(i => (keyRoot + i) % 12)
}

/** All diatonic MIDI notes inside [lo, hi] for a given key. */
function diatonicPool(keyRoot: number, keyMinor: boolean, lo = 36, hi = 96): number[] {
  const pcs = new Set(scalePitchClasses(keyRoot, keyMinor))
  const out: number[] = []
  for (let m = lo; m <= hi; m++) {
    if (pcs.has(((m % 12) + 12) % 12)) out.push(m)
  }
  return out
}

/** Find chord active at time `t`, if any. */
function chordAt(chords: SongChord[], t: number): SongChord | null {
  for (const c of chords) {
    if (t >= c.t0 - 0.05 && t <= c.t1 + 0.05) return c
  }
  return null
}

/** Chord tone pitch classes for a triad (root, 3rd, 5th). */
function chordTones(c: SongChord): Set<number> {
  return new Set([c.root % 12, (c.root + (c.minor ? 3 : 4)) % 12, (c.root + 7) % 12])
}

/** Step N diatonic scale degrees up (+steps) or down (-steps) from a melody note. */
function diatonicShift(midi: number, steps: number, pool: number[]): number {
  // Find nearest index in pool
  let idx = 0, bestD = Infinity
  for (let i = 0; i < pool.length; i++) {
    const d = Math.abs(pool[i] - midi)
    if (d < bestD) { bestD = d; idx = i }
  }
  const target = Math.max(0, Math.min(pool.length - 1, idx + steps))
  return pool[target]
}

export interface HarmonyResult {
  notes: MelodyNote[]
  mode: HarmonyMode
  /** 0..100% of harmony notes sitting comfortably inside [comfortLow, comfortHigh] */
  rangeFitPct: number
  minMidi: number
  maxMidi: number
}

/**
 * Generate a musical, singable vocal harmony track from a song's lead melody + chords + key + user vocal range.
 */
export function buildHarmonyLine(
  lead: MelodyNote[],
  opts: {
    mode: HarmonyMode
    keyRoot: number
    keyMinor: boolean
    chords?: SongChord[]
    comfortLow?: number
    comfortHigh?: number
  },
): HarmonyResult {
  const comfortLow = opts.comfortLow ?? 48
  const comfortHigh = opts.comfortHigh ?? 67
  if (opts.mode === 'off' || !lead.length) {
    const midis = lead.map(n => n.midi)
    const fit = lead.length ? Math.round((lead.filter(n => n.midi >= comfortLow && n.midi <= comfortHigh).length / lead.length) * 100) : 100
    return {
      notes: lead,
      mode: 'off',
      rangeFitPct: fit,
      minMidi: midis.length ? Math.min(...midis) : comfortLow,
      maxMidi: midis.length ? Math.max(...midis) : comfortHigh,
    }
  }

  const pool = diatonicPool(opts.keyRoot, opts.keyMinor, 36, 96)
  const chords = opts.chords ?? []
  const out: MelodyNote[] = []
  let prevHarm: number | null = null

  for (const n of lead) {
    const activeChord = chordAt(chords, (n.t0 + n.t1) / 2)
    const cTones = activeChord ? chordTones(activeChord) : null
    const isStrong = n.t1 - n.t0 >= 0.32
    let h: number

    if (opts.mode === 'lower3') {
      h = diatonicShift(n.midi, -2, pool) // 2 scale steps down = diatonic 3rd below
      if (isStrong && cTones && !cTones.has(((h % 12) + 12) % 12)) {
        // Nudge by ±1 scale step to lock onto an unused chord tone below lead
        const down = diatonicShift(n.midi, -3, pool)
        const up = diatonicShift(n.midi, -1, pool)
        if (cTones.has(((down % 12) + 12) % 12)) h = down
        else if (cTones.has(((up % 12) + 12) % 12) && n.midi - up >= 2) h = up
      }
    } else if (opts.mode === 'upper3') {
      h = diatonicShift(n.midi, 2, pool) // diatonic 3rd above
      if (isStrong && cTones && !cTones.has(((h % 12) + 12) % 12)) {
        const up = diatonicShift(n.midi, 3, pool)
        const down = diatonicShift(n.midi, 1, pool)
        if (cTones.has(((up % 12) + 12) % 12)) h = up
        else if (cTones.has(((down % 12) + 12) % 12) && down - n.midi >= 2) h = down
      }
    } else if (opts.mode === 'baritone') {
      // Prefer lower 5th/6th (4 or 5 scale steps below), keeping rich separation from lead
      const cands = [diatonicShift(n.midi, -4, pool), diatonicShift(n.midi, -5, pool), diatonicShift(n.midi, -2, pool)]
      h = pickBestCandidate(cands, n.midi, cTones, comfortLow, comfortHigh, prevHarm)
    } else {
      // 'autoFit': pick the best non-unison harmony note inside [comfortLow, comfortHigh]
      // Prefer chord tones on strong beats + smooth stepwise voice leading from prevHarm
      const cands: number[] = []
      for (const step of [-2, -4, -5, -7, 2, -3, 4]) {
        const cand = diatonicShift(n.midi, step, pool)
        if (cand !== n.midi && Math.abs(cand - n.midi) >= 2 && Math.abs(cand - n.midi) <= 14) {
          cands.push(cand)
        }
      }
      // Also allow octave below if lead is way above user's ceiling
      if (n.midi > comfortHigh + 3) cands.push(n.midi - 12)
      h = pickBestCandidate(cands, n.midi, cTones, comfortLow, comfortHigh, prevHarm)
    }

    prevHarm = h
    out.push({ ...n, midi: h })
  }

  const inRange = out.filter(n => n.midi >= comfortLow && n.midi <= comfortHigh).length
  const midis = out.map(n => n.midi)
  return {
    notes: out,
    mode: opts.mode,
    rangeFitPct: Math.round((inRange / out.length) * 100),
    minMidi: Math.min(...midis),
    maxMidi: Math.max(...midis),
  }
}

function pickBestCandidate(
  cands: number[],
  leadMidi: number,
  cTones: Set<number> | null,
  lo: number,
  hi: number,
  prev: number | null,
): number {
  let best = cands[0] ?? leadMidi - 3
  let bestScore = -Infinity
  const center = (lo + hi) / 2
  for (const c of cands) {
    let score = 0
    // Strong reward for being comfortably inside singer's Voice Range Profile
    if (c >= lo && c <= hi) score += 25
    else score -= Math.min(Math.abs(c - lo), Math.abs(c - hi)) * 6

    // Prefer consonant intervals (3rds=3/4, 5th=7, 6ths=8/9, octave=12)
    const iv = Math.abs(leadMidi - c) % 12
    if (iv === 3 || iv === 4) score += 14
    else if (iv === 8 || iv === 9) score += 12
    else if (iv === 7) score += 10
    else if (iv === 0) score += 4
    else if (iv === 1 || iv === 2 || iv === 6 || iv === 11) score -= 12

    // Chord tone alignment
    if (cTones && cTones.has(((c % 12) + 12) % 12)) score += 12

    // Smooth voice leading from previous harmony note
    if (prev !== null) {
      const leap = Math.abs(c - prev)
      if (leap <= 3) score += 8
      else if (leap <= 5) score += 3
      else score -= (leap - 5) * 2
    } else {
      score -= Math.abs(c - center) * 0.4
    }

    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }
  return best
}

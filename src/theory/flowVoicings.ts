// Voicing selector for Chord Path (Open / Easy, Movable Barre, and 3-String Triads: Top 3, Mid 3, Low 3)
// with guaranteed 1–2–3–4 finger numbers, barre bars, and automatic Triad inversion labels.
import type { Instrument } from '../instrument'
import type { Voicing } from './chords'
import { shapesFor } from './shapes'
import { parseChordQual } from './harmonicFlow'

export type FlowVoicingStyle = 'open' | 'barre' | 'triad-top' | 'triad-mid' | 'triad-low'

export const FLOW_VOICING_STYLES: { id: FlowVoicingStyle; label: string; short: string; hint: string }[] = [
  { id: 'open', label: 'Open / Easy', short: 'Open', hint: 'Standard open & lowest-fret chord shapes' },
  { id: 'barre', label: 'Barre Chords', short: 'Barre', hint: 'Movable CAGED E-shape & A-shape barre grips' },
  { id: 'triad-top', label: 'Triad · Top 3 (G–B–e)', short: 'Top 3', hint: 'Bright 3-string lead/funk triads on strings 3–2–1' },
  { id: 'triad-mid', label: 'Triad · Mid 3 (D–G–B)', short: 'Mid 3', hint: 'Warm 3-string rhythm triads on strings 4–3–2' },
  { id: 'triad-low', label: 'Triad · Low 3 (A–D–G)', short: 'Low 3', hint: 'Punchy low-mid triads on strings 5–4–3' },
]

export interface FlowVoicingResult {
  voicing: Voicing
  inversion?: 'Root' | '1st' | '2nd'
}

/** Assign ergonomic 1–2–3–4 finger numbers when a generated voicing doesn't already include them. */
function assignFingers(frets: number[], barres: number[]): number[] {
  const positive = frets.filter(f => f > 0)
  if (!positive.length) return frets.map(() => 0)
  const minF = Math.min(...positive)
  const hasBarre = barres.length > 0
  const barreFret = hasBarre ? barres[0] : -1
  // Group distinct fretted spots above minF cleanly to fingers 1..4
  return frets.map(f => {
    if (f <= 0) return 0
    if (hasBarre && f === barreFret) return 1
    const off = f - minF
    if (hasBarre) return Math.min(4, Math.max(2, off + 1))
    return Math.min(4, Math.max(1, off + 1))
  })
}

/** Build a movable E-shape or A-shape guitar barre voicing for any chord quality at frets 1–9. */
function buildFallbackBarre(rootPc: number, qual: string, inst: Instrument): Voicing | null {
  if (inst.strings < 6) return null
  const eRoot = ((rootPc - (inst.midis[0] % 12)) + 12) % 12 || 12 // 1..12
  const aRoot = ((rootPc - (inst.midis[1] % 12)) + 12) % 12 || 12 // 1..12
  // Pick whichever movable root (E-string or A-string) sits lower & more comfortable (prefer frets 1..8)
  const useE = eRoot <= aRoot && eRoot <= 9
  const r = useE ? eRoot : aRoot

  let frets: number[]
  let fingers: number[]
  if (useE) {
    if (qual === 'm') {
      frets = [r, r + 2, r + 2, r, r, r]
      fingers = [1, 3, 4, 1, 1, 1]
    } else if (qual === '7') {
      frets = [r, r + 2, r, r + 1, r, r]
      fingers = [1, 3, 1, 2, 1, 1]
    } else if (qual === 'm7') {
      frets = [r, r + 2, r, r, r, r]
      fingers = [1, 3, 1, 1, 1, 1]
    } else if (qual === 'maj7') {
      frets = [r, -1, r + 1, r + 1, r, -1]
      fingers = [1, 0, 3, 4, 2, 0]
    } else if (qual === 'dim') {
      frets = [r, r + 1, r + 2, r + 1, -1, -1]
      fingers = [1, 2, 4, 3, 0, 0]
    } else {
      frets = [r, r + 2, r + 2, r + 1, r, r]
      fingers = [1, 3, 4, 2, 1, 1]
    }
  } else {
    if (qual === 'm') {
      frets = [-1, r, r + 2, r + 2, r + 1, r]
      fingers = [0, 1, 3, 4, 2, 1]
    } else if (qual === '7') {
      frets = [-1, r, r + 2, r, r + 2, r]
      fingers = [0, 1, 3, 1, 4, 1]
    } else if (qual === 'm7') {
      frets = [-1, r, r + 2, r, r + 1, r]
      fingers = [0, 1, 3, 1, 2, 1]
    } else if (qual === 'maj7') {
      frets = [-1, r, r + 2, r + 1, r + 2, r]
      fingers = [0, 1, 3, 2, 4, 1]
    } else if (qual === 'dim') {
      frets = [-1, r, r + 1, r + 2, r + 1, -1]
      fingers = [0, 1, 2, 4, 3, 0]
    } else {
      frets = [-1, r, r + 2, r + 2, r + 2, r]
      fingers = [0, 1, 3, 3, 3, 1]
    }
  }

  const played = frets.filter(f => f >= 0)
  const midi = frets.map((f, s) => (f >= 0 ? inst.midis[s] + f : -1)).filter(m => m >= 0)
  const barres = qual === 'dim' || (useE && qual === 'maj7') ? [] : [r]
  return { frets, fingers, barres, baseFret: Math.max(1, Math.min(...played)), midi }
}

/** Build a tight, ergonomic 3-string triad on strings [s0, s1, s2] near `anchorFret` with 1–2–3–4 fingers & inversion! */
function buildTriadVoicing(
  rootPc: number,
  qual: string,
  inst: Instrument,
  style: 'triad-top' | 'triad-mid' | 'triad-low',
  anchorFret = 5,
): FlowVoicingResult | null {
  const nStr = inst.strings
  const strs = nStr >= 6
    ? (style === 'triad-top' ? [3, 4, 5] : style === 'triad-mid' ? [2, 3, 4] : [1, 2, 3])
    : style === 'triad-top'
      ? [nStr - 3, nStr - 2, nStr - 1]
      : [0, 1, 2]
  if (strs.some(s => s < 0 || s >= nStr)) return null

  const thirdIv = qual === 'm' || qual === 'm7' || qual === 'dim' ? 3 : qual === 'sus4' ? 5 : 4
  const fifthIv = qual === 'dim' ? 6 : 7
  const thirdPc = (rootPc + thirdIv) % 12
  const fifthPc = (rootPc + fifthIv) % 12
  const triadPcs = [rootPc, thirdPc, fifthPc]

  const candidates = strs.map(s => {
    const fs: number[] = []
    for (let f = 0; f <= 13; f++) {
      if (triadPcs.includes((inst.midis[s] + f) % 12)) fs.push(f)
    }
    return fs
  })

  let best: { combo: [number, number, number]; score: number } | null = null
  for (const f0 of candidates[0]) {
    for (const f1 of candidates[1]) {
      for (const f2 of candidates[2]) {
        const combo: [number, number, number] = [f0, f1, f2]
        const pcs = combo.map((f, i) => (inst.midis[strs[i]] + f) % 12)
        if (new Set(pcs).size !== 3) continue
        const fretted = combo.filter(f => f > 0)
        const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0
        if (span > 3) continue
        const avg = combo.reduce((a, b) => a + b, 0) / 3
        // Prefer tightest grip close to the middle of the neck (voice-led around anchorFret!)
        const score = -span * 5 - Math.abs(avg - anchorFret) * 1.4
        if (!best || score > best.score) best = { combo, score }
      }
    }
  }
  if (!best) return null

  const frets = Array.from({ length: nStr }, () => -1)
  strs.forEach((s, i) => { frets[s] = best!.combo[i] })
  const positive = best.combo.filter(f => f > 0)
  const baseFret = positive.length && Math.max(...positive) > 4 ? Math.min(...positive) : 1
  const minF = positive.length ? Math.min(...positive) : 0
  // Detect mini-barre when 2+ triad strings share the lowest fret
  const sameMinCount = best.combo.filter(f => f > 0 && f === minF).length
  const barres = sameMinCount >= 2 ? [minF] : []
  const fingers = assignFingers(frets, barres)
  const midi = frets.map((f, s) => (f >= 0 ? inst.midis[s] + f : -1)).filter(m => m >= 0)
  const bassPc = (inst.midis[strs[0]] + best.combo[0]) % 12
  const inversion: FlowVoicingResult['inversion'] = bassPc === rootPc ? 'Root' : bassPc === thirdPc ? '1st' : '2nd'

  return {
    voicing: { frets, fingers, barres, baseFret, midi },
    inversion,
  }
}

/** Resolve the requested voicing style (Open, Barre, or 3-string Triad) for any Chord Path chord symbol. */
export function voicingForFlowChord(
  symbol: string,
  inst: Instrument,
  style: FlowVoicingStyle,
  anchorFret = 5,
): FlowVoicingResult | null {
  const m = symbol.trim().match(/^([A-G][#b]?)(.*)$/)
  if (!m) return null
  const parsed = parseChordQual(symbol)
  const rootPc = parsed?.rootPc ?? 0
  const qual = parsed?.qual ?? ''

  if (style === 'triad-top' || style === 'triad-mid' || style === 'triad-low') {
    const tri = buildTriadVoicing(rootPc, qual, inst, style, anchorFret)
    if (tri) return tri
  }

  const type = qual === '' ? '' : qual === 'm' ? 'm' : qual
  const all = shapesFor({ root: m[1], type }, inst)

  if (style === 'barre') {
    // Prefer an authentic movable barre chord (barres present, no open strings, comfortable frets 1–9)
    const barreHit = all.find(v => v.barres.length > 0 && v.frets.every(f => f !== 0) && v.baseFret <= 9)
      ?? all.find(v => v.barres.length > 0 && v.baseFret <= 10)
    if (barreHit) {
      const fingers = barreHit.fingers.some(x => x > 0) ? barreHit.fingers : assignFingers(barreHit.frets, barreHit.barres)
      return { voicing: { ...barreHit, fingers } }
    }
    const fb = buildFallbackBarre(rootPc, qual, inst)
    if (fb) return { voicing: fb }
  }

  const base = all[0]
  if (!base) return null
  const fingers = base.fingers.some(x => x > 0) ? base.fingers : assignFingers(base.frets, base.barres)
  return { voicing: { ...base, fingers } }
}

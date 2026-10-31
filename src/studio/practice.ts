// Practise over a beat: which chord each bar of the beat plays (read from its parts, so it follows your piano roll),
// and the other way round, a beat made from a Jam progression. Pure, so it's tested.
import { rowsFromGroove, newId, STEPS_PER_BAR, type Beat, type PNote, type Track } from './beat'
import { chordNotes, instr } from './sounds'
import { SHARPS, FLATS, keyPrefersFlats, pc } from '../theory/notes'
import type { KitId } from '../audio/drums'

const TEMPLATES: { suffix: string; ivs: number[] }[] = [
  { suffix: '', ivs: [0, 4, 7] }, { suffix: 'm', ivs: [0, 3, 7] }, { suffix: '7', ivs: [0, 4, 7, 10] }, { suffix: 'maj7', ivs: [0, 4, 7, 11] },
  { suffix: 'm7', ivs: [0, 3, 7, 10] }, { suffix: 'dim', ivs: [0, 3, 6] }, { suffix: 'm7b5', ivs: [0, 3, 6, 10] }, { suffix: 'sus2', ivs: [0, 2, 7] },
  { suffix: 'sus4', ivs: [0, 5, 7] }, { suffix: '5', ivs: [0, 7] }, { suffix: 'add9', ivs: [0, 2, 4, 7] }, { suffix: 'aug', ivs: [0, 4, 8] },
]

export interface BarChord { name: string; root: number; pcs: number[] }

/** The chord a set of weighted pitch classes spells best (bass note = a strong hint for the root). */
export function guessChord(weights: number[], bassPc: number | null, flats: boolean): BarChord | null {
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return null
  let best: { score: number; root: number; t: typeof TEMPLATES[number] } | null = null
  for (let root = 0; root < 12; root++) {
    for (const t of TEMPLATES) {
      const pcs = t.ivs.map(i => (root + i) % 12)
      let hit = 0
      for (const p of pcs) hit += weights[p]
      // every chord tone should be there (a missing 3rd/5th costs), notes outside the chord cost
      const missing = pcs.filter(p => weights[p] <= 0).length
      const outside = total - hit
      let score = hit - outside * 0.9 - missing * total * 0.22 - (t.ivs.length - 3) * total * 0.03
      if (bassPc === root) score += total * 0.35
      else if (bassPc !== null && !pcs.includes(bassPc)) score -= total * 0.1
      if (t.suffix === '5' && weights[(root + 3) % 12] + weights[(root + 4) % 12] > 0) score -= total
      if (!best || score > best.score) best = { score, root, t }
    }
  }
  if (!best) return null
  return { name: (flats ? FLATS : SHARPS)[best.root] + best.t.suffix, root: best.root, pcs: best.t.ivs.map(i => (best!.root + i) % 12) }
}

/** The chord each bar of the beat plays, from its chord parts (bass parts only hint the root). */
export function beatChords(b: Beat): (BarChord | null)[] {
  const flats = keyPrefersFlats(b.key, b.minor)
  const out: (BarChord | null)[] = []
  for (let bar = 0; bar < b.bars; bar++) {
    const s0 = bar * STEPS_PER_BAR, s1 = s0 + STEPS_PER_BAR
    const w = Array(12).fill(0) as number[]
    let bass: { m: number; at: number } | null = null
    for (const t of b.tracks) {
      if (t.mute) continue
      const isBass = instr(t.inst).group === 'Bass'
      for (const n of t.notes) {
        const a = Math.max(s0, n.s), e = Math.min(s1, n.s + n.l)
        if (e <= a) continue
        if (isBass) { if (!bass || n.s < bass.at || (n.s === bass.at && n.m < bass.m)) bass = { m: n.m, at: n.s } ; continue }
        w[n.m % 12] += (e - a) * n.v
      }
    }
    // a bass line alone still says something
    if (!w.some(x => x > 0) && bass) w[bass.m % 12] = 1
    out.push(guessChord(w, bass ? bass.m % 12 : null, flats))
  }
  return out
}

/** The scales that fit a key, best first (what Practice offers). */
export function scalesFor(minor: boolean): string[] {
  return minor ? ['minor pentatonic', 'minor blues', 'aeolian', 'dorian', 'harmonic minor'] : ['major pentatonic', 'major', 'major blues', 'mixolydian', 'lydian']
}

// ── a beat from a Jam progression
export interface JamChord { root: string; ivs: number[]; beats: number }
/** Drums from the Jam's groove, a chord part and a bass part on the Jam's chords (each chord as long as in Jam). */
export function beatFromJam(o: { chords: JamChord[]; bpm: number; key: string; minor: boolean; groove: string; kit: KitId; keys?: string }): Beat {
  const beatsPerBar = 4
  const totalBeats = o.chords.reduce((a, c) => a + c.beats, 0)
  const raw = Math.max(1, Math.ceil(totalBeats / beatsPerBar))
  const bars = ([1, 2, 4, 8] as const).find(n => n >= raw) ?? 8
  const n = bars * STEPS_PER_BAR
  const chordNs: PNote[] = []
  const bassNs: PNote[] = []
  let s = 0
  // repeat the progression to fill the bars
  while (s < n) {
    for (const c of o.chords) {
      if (s >= n) break
      const len = Math.min(n - s, Math.max(1, Math.round(c.beats * 4)))
      const r = pc(c.root)
      // chords between F3 and E4, bass between E1 and D#2
      const root = 48 + r + (r < 5 ? 12 : 0)
      for (const m of chordNotes(root, c.ivs, 'close')) chordNs.push({ s, l: len, m, v: 0.65 })
      bassNs.push({ s, l: Math.min(len, 8), m: 28 + ((r - 4 + 12) % 12), v: 0.85 })
      if (len >= 12) bassNs.push({ s: s + 8, l: len - 8, m: 28 + ((r - 4 + 12) % 12) + 7, v: 0.75 })
      s += len
    }
  }
  const tracks: Track[] = [
    { id: newId(), inst: o.keys ?? 'epiano', notes: chordNs, vol: 0.6, space: 0.25 },
    { id: newId(), inst: 'bass', notes: bassNs, vol: 0.8, space: 0.03 },
  ]
  return { name: `Jam in ${o.key}${o.minor ? 'm' : ''}`, bpm: o.bpm, bars, swing: 0, kit: o.kit, rows: rowsFromGroove(o.groove, bars), tracks, key: o.key, minor: o.minor, drumVol: 0.9 }
}

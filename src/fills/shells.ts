// Fills between chords, part 1: the chord shells. A small triad on the top three strings (G B e) for every chord, in
// the three inversions; which finger holds which note; and the "free" notes around each shell that a spare finger
// can reach (the sus2 / sus4 / 6 / 9 neighbours that fills are made of). Standard tuning, strings 0 = low E.
import { chordInfo } from '../tabs/harmony'

export const STD = [40, 45, 50, 55, 59, 64]
/** the shell strings: G, B, e */
export const TOP = [3, 4, 5]

export interface ShellNote { string: number; fret: number; midi: number; /** R, 3, b3, 5 … */ role: string; finger: number }
export interface Shell {
  chord: string
  root: number
  minor: boolean
  notes: ShellNote[]
  /** lowest and highest fret used */
  lo: number
  hi: number
  /** which chord tone is on top (the melody note): 'R' | '3' | 'b3' | '5' */
  top: string
}
/** a note a free finger can add next to a shell note on the same string */
export interface Free {
  string: number
  fret: number
  midi: number
  /** the shell note it leans into */
  to: ShellNote
  /** what it is against the chord: 2, 4, 6, 9, b7 … */
  role: string
  /** how it gets into the chord tone: hammer up into it, pull off down into it, or slide up into it */
  move: 'hammer' | 'pull' | 'slide'
}

const ROLE: Record<number, string> = { 0: 'R', 1: 'b9', 2: '9', 3: 'b3', 4: '3', 5: '4', 6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7' }
export const roleOf = (root: number, midi: number) => ROLE[((midi - root) % 12 + 12) % 12]

/** The triad's three pitch classes and whether it's minor (7ths and extensions are left off: shells are triads). */
export function triadOf(chord: string): { root: number; pcs: number[]; minor: boolean } | null {
  const c = chordInfo(chord)
  if (!c) return null
  const minor = c.third !== null && (c.third - c.root + 12) % 12 === 3
  const third = c.third ?? (c.root + 4) % 12
  const fifth = c.pcs.find(p => [6, 7, 8].includes((p - c.root + 12) % 12)) ?? (c.root + 7) % 12
  return { root: c.root, pcs: [c.root, third, fifth], minor }
}

/** Fingers for a shell: the lowest fret takes the index, one finger per fret above it. */
function fingers(frets: number[]): number[] {
  const played = frets.filter(f => f > 0)
  const base = played.length ? Math.min(...played) : 0
  return frets.map(f => (f === 0 ? 0 : Math.min(4, f - base + 1)))
}

/** Every triad shape on G B e for this chord (each string one chord tone, all three tones, within a 4-fret span),
 *  lowest first, frets 0–17. */
export function shellsFor(chord: string, tuning = STD): Shell[] {
  const t = triadOf(chord)
  if (!t) return []
  const out: Shell[] = []
  for (let a = 0; a <= 17; a++) for (let b = 0; b <= 17; b++) for (let c = 0; c <= 17; c++) {
    const frets = [a, b, c]
    const midis = TOP.map((s, i) => tuning[s] + frets[i])
    const pcs = midis.map(m => m % 12)
    if (!t.pcs.every(p => pcs.includes(p)) || !pcs.every(p => t.pcs.includes(p))) continue
    const played = frets.filter(f => f > 0)
    if (played.length && Math.max(...played) - Math.min(...played) > 3) continue
    // an open string with a high fret beside it is not a hand shape
    if (frets.some(f => f === 0) && Math.max(...frets) > 4) continue
    const fg = fingers(frets)
    const notes = TOP.map((s, i) => ({ string: s, fret: frets[i], midi: midis[i], role: roleOf(t.root, midis[i]), finger: fg[i] }))
    out.push({ chord, root: t.root, minor: t.minor, notes, lo: Math.min(...frets), hi: Math.max(...frets), top: notes[2].role })
  }
  return out.sort((x, y) => x.lo - y.lo || x.hi - y.hi)
}

/** The notes a free finger can add around a shell. Major chords lean on the major scale's 2, 4 and 6; minor chords on
 *  the minor pentatonic's 4 and b7 and the 9. Each one is on a shell note's string, 1–2 frets away. */
export function freeNotes(sh: Shell): Free[] {
  const out: Free[] = []
  const good = sh.minor ? ['9', '4', 'b7', '11'] : ['9', '4', '6']
  for (const n of sh.notes) {
    for (const d of [-2, -1, 1, 2]) {
      const fret = n.fret + d
      if (fret < 0 || fret > 19) continue
      const midi = n.midi + d
      const role = roleOf(sh.root, midi)
      const r = role === '9' ? '9' : role
      if (!good.includes(r)) continue
      // a lower neighbour hammers up into the chord tone (or slides, from 2 frets); an upper one pulls off down to it
      const move: Free['move'] = d < 0 ? 'hammer' : 'pull'
      out.push({ string: n.string, fret, midi, to: n, role: r, move })
      if (d === -2 && n.fret >= 2) out.push({ string: n.string, fret, midi, to: n, role: r, move: 'slide' })
    }
  }
  // the sus moves first (they sound most like the chord breathing), then 6 / b7, then 9
  const rank = (f: Free) => (f.role === '4' || (f.role === '9' && (f.to.role === '3' || f.to.role === 'b3')) ? 0 : f.role === '6' || f.role === 'b7' ? 1 : 2) + (f.move === 'slide' ? 0.5 : 0)
  return out.sort((a, b) => rank(a) - rank(b))
}

/** A set of shells for a progression that sit close together (a "window" of the neck, Daniel Seriff style): for each
 *  chord the shape nearest the last one, starting from the window that keeps the whole progression smallest. */
export function shellPath(chords: string[], tuning = STD, around?: number): Shell[] {
  const all = chords.map(c => shellsFor(c, tuning))
  if (all.some(a => !a.length)) return []
  let best: Shell[] = [], cost = Infinity
  for (const first of all[0]) {
    if (around !== undefined && Math.abs(first.lo - around) > 4) continue
    const path = [first]
    let c = 0
    for (let i = 1; i < all.length; i++) {
      const prev = path[i - 1]
      const pick = all[i].reduce((a, b) => (move(prev, b) < move(prev, a) ? b : a))
      c += move(prev, pick)
      path.push(pick)
    }
    // a little weight for staying low on the neck (easier to hear and to hold) and away from open strings
    c += first.lo * 0.15 + path.filter(s => s.lo === 0).length * 1.5
    if (c < cost) { cost = c; best = path }
  }
  return best
}
/** how far the hand moves from one shell to the next (frets, summed over the three strings) */
export const move = (a: Shell, b: Shell) => a.notes.reduce((s, n, i) => s + Math.abs(n.fret - b.notes[i].fret), 0)

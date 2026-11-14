// Call and response: KGuitar plays a short phrase, you play it back on the guitar. It starts with two notes in one
// pentatonic box and grows to longer phrases, leaps, the major scale, and finally real licks from the licks library
// (that last step is transcribing by ear). Pure logic: making phrases and checking what you played.
import { LICKS } from '../licks/library'
import { bendOf, parseLick } from '../licks/notation'

export interface CrLevel { id: number; title: string; tip: string; notes: [number, number]; scale: 'minpent' | 'major' | 'lick'; leap: number; anyStart: boolean; lickLevel?: number }
export const CR_LEVELS: CrLevel[] = [
  { id: 1, title: 'Two notes', tip: 'The first note is always home (the root). Is the second one higher or lower, and how far?', notes: [2, 2], scale: 'minpent', leap: 1, anyStart: false },
  { id: 2, title: 'Three notes', tip: 'Still starting on home. Sing it back first, then find it.', notes: [3, 3], scale: 'minpent', leap: 2, anyStart: false },
  { id: 3, title: 'Four notes, any start', tip: 'Now it can start anywhere in the box. Find the first note, then follow the shape.', notes: [4, 4], scale: 'minpent', leap: 2, anyStart: true },
  { id: 4, title: 'The major scale', tip: 'Five notes from the major scale, with a few leaps. Listen for steps (next note) and skips.', notes: [5, 5], scale: 'major', leap: 3, anyStart: true },
  { id: 5, title: 'Lick starts', tip: 'The first notes of real licks. Bends: play the note it bends up to, or bend it.', notes: [4, 6], scale: 'lick', leap: 0, anyStart: true, lickLevel: 1 },
  { id: 6, title: 'Whole licks', tip: 'Transcribing by ear: whole short licks. Take it a few notes at a time, and slow it down.', notes: [5, 8], scale: 'lick', leap: 0, anyStart: true, lickLevel: 2 },
]

export interface Phrase {
  /** the notes (midi), in order */
  notes: number[]
  /** each note's length in beats */
  durs: number[]
  /** other pitches that count for a note (a bend: the fretted note as well as where it bends to) */
  also?: (number[] | undefined)[]
  /** home (midi of the root) */
  root: number
  /** where to play it: frets from..from+3 (a lick: its own span) */
  from: number
  /** a lick's name, when it's one */
  lick?: string
}

const STD = [40, 45, 50, 55, 59, 64]
const SCALES = { minpent: [0, 3, 5, 7, 10], major: [0, 2, 4, 5, 7, 9, 11] }
const PCS: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }

/** A small seeded random (the same seed makes the same phrase). */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

/** The box: the root on the low E string (frets from..from+3) and the scale notes on every string there. */
export function boxFor(key: string, scale: 'minpent' | 'major', tuning = STD): { from: number; pool: number[]; root: number } {
  const k = PCS[key] ?? 9
  let from = (k - tuning[0] % 12 + 12) % 12
  if (scale === 'major') from = Math.max(0, from - 1)
  if (from > 9) from -= 12
  if (from < 0) from += 12
  const pcs = SCALES[scale].map(x => (x + k) % 12)
  const set = new Set<number>()
  for (const open of tuning) for (let f = Math.max(0, from - (scale === 'major' ? 0 : 0)); f <= from + 3; f++) if (pcs.includes((open + f) % 12)) set.add(open + f)
  const pool = [...set].sort((a, b) => a - b)
  // home: the root in the middle of the box (on the D or G string), so phrases can go up and down
  const roots = pool.filter(m => m % 12 === k)
  const root = roots[Math.min(roots.length - 1, 1)] ?? pool[0]
  return { from, pool, root }
}

export function makePhrase(level: CrLevel, key: string, seed: number, tuning = STD): Phrase {
  const r = rng(seed)
  const n = level.notes[0] + Math.floor(r() * (level.notes[1] - level.notes[0] + 1))
  if (level.scale === 'lick') return lickPhrase(level, n, r, tuning)
  const { from, pool, root } = boxFor(key, level.scale, tuning)
  let i = pool.indexOf(root)
  if (level.anyStart) i = Math.max(0, Math.min(pool.length - 1, i + Math.round((r() - 0.5) * 6)))
  const notes = [pool[i]]
  while (notes.length < n) {
    let step = 0
    while (step === 0) step = Math.round((r() * 2 - 1) * level.leap)
    // turn back at the edges of the box
    if (i + step < 0 || i + step >= pool.length) step = -step
    i = Math.max(0, Math.min(pool.length - 1, i + step))
    notes.push(pool[i])
  }
  // even notes, the last one longer
  const durs = notes.map((_, j) => (j === notes.length - 1 ? 2 : n <= 3 ? 1 : 0.5 + (r() < 0.3 ? 0.5 : 0)))
  return { notes, durs, root, from }
}

function lickPhrase(level: CrLevel, n: number, r: () => number, tuning: number[]): Phrase {
  const pool = LICKS.filter(l => l.level <= (level.lickLevel ?? 1) && (l.kind === 'lick' || l.kind === 'run' || l.kind === 'ending'))
  for (let tries = 0; tries < 40; tries++) {
    const l = pool[Math.floor(r() * pool.length)]
    if (!l) break
    const ev = parseLick(l.tab).events.filter(e => e.notes.length === 1 && e.notes[0].tech !== 'x' && !/r/.test((e.notes[0].tech ?? '').replace('harm', '')))
    if (ev.length < level.notes[0]) continue
    const take = ev.slice(0, Math.min(n, ev.length))
    const notes: number[] = [], durs: number[] = [], also: (number[] | undefined)[] = []
    for (const e of take) {
      const nt = e.notes[0], m = tuning[nt.string] + nt.fret, b = bendOf(nt.tech)
      notes.push(m + b); durs.push(Math.max(0.25, e.dur)); also.push(b ? Array.from({ length: b }, (_, k) => m + k) : undefined)
    }
    const k = PCS[l.ref] ?? 9
    const roots = [40, 45, 50, 55, 59, 64, 69].map(o => o - (o % 12) + k).filter(x => x >= 45)
    return { notes, durs, also, root: roots[1] ?? 57, from: Math.max(0, Math.min(...take.map(e => e.notes[0].fret)) ), lick: l.name }
  }
  return makePhrase({ ...CR_LEVELS[3] }, 'G', Math.floor(r() * 1e6), tuning)
}

export type Mark = 'ok' | 'wrong' | 'missing'
/** What you played against the phrase: each note right (in the same octave, or any octave when `anyOctave`), wrong
 *  or missing; `first` is the first one that went wrong, for "you played D, it was C". */
export function compare(p: Phrase, got: number[], anyOctave = true): { ok: boolean; marks: Mark[]; first?: { i: number; want: number; got?: number } } {
  const same = (want: number, i: number, m: number) => {
    const alts = [want, ...(p.also?.[i] ?? [])]
    return alts.some(a => (anyOctave ? (a - m) % 12 === 0 : a === m))
  }
  const marks: Mark[] = p.notes.map((w, i) => (i >= got.length ? 'missing' : same(w, i, got[i]) ? 'ok' : 'wrong'))
  const fi = marks.findIndex(m => m !== 'ok')
  return { ok: fi < 0, marks, ...(fi >= 0 ? { first: { i: fi, want: p.notes[fi], got: got[fi] } } : {}) }
}

/** A round's stars: 8 phrases, first-try right. */
export const roundStars = (right: number, of: number) => (right >= of ? 3 : right >= of * 0.75 ? 2 : right >= of * 0.5 ? 1 : 0)

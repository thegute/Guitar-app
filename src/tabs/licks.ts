// A lick generator: short practice licks in a chosen style, built from that style's vocabulary (its scale,
// stock moves, rhythms and techniques), in any key, 1–4 bars long, at three difficulty levels.
// Moves are written as semitones above the key note, so every lick works in every key and is then placed on
// the neck in one hand position (with hammer-ons, pull-offs and slides kept on one string).
import { pc, SHARPS, FLATS, keyPrefersFlats } from '../theory/notes'
import type { Song, SongBar, SongNote, SongStep } from './model'

export type LickGenre = 'bluegrass' | 'rock' | 'progmetal' | 'metal' | 'folk' | 'country'
type N = [number, number, string?] // [semitones from the key note, length in beats, technique]
interface Genre { id: LickGenre; label: string; feel: string; minor: boolean; bpm: number; cells: N[][]; endings: N[][]; low?: boolean; scale: number[] }

const e = 0.5, s = 0.25, t3 = 1 / 3
export const LICK_GENRES: Genre[] = [
  {
    id: 'bluegrass', label: 'Bluegrass', minor: false, bpm: 110, scale: [0, 2, 3, 4, 7, 9],
    feel: 'Steady eighth notes from the major pentatonic, the flat-3rd-to-3rd hammer-on and open strings. Alternate pick: down on the beat, up in between.',
    cells: [
      [[0, e], [2, e], [3, e], [4, e, 'h']], [[7, e], [4, e], [2, e], [0, e]], [[-5, e], [-3, e], [0, e], [2, e]],
      [[4, e], [2, e], [0, e], [-3, e]], [[0, e], [7, e], [12, e], [0, e]], [[3, e], [4, e, 'h'], [7, e], [9, e]],
      [[9, e], [7, e], [4, e], [2, e]], [[-3, e], [0, e], [3, e], [4, e, 'h']], [[2, e], [4, e], [7, e], [4, e]],
    ],
    endings: [[[4, e], [2, e], [0, 1]], [[3, e], [4, e, 'h'], [0, 1]], [[2, e], [3, e], [4, e, 'h'], [0, e]]],
  },
  {
    id: 'rock', label: 'Rock', minor: true, bpm: 92, scale: [0, 3, 5, 7, 10],
    feel: 'Minor pentatonic box licks: bends, pull-offs, triplet repeats and the blue note. Add vibrato to the long notes.',
    cells: [
      [[12, e], [10, e], [7, 1]], [[5, 1, 'b'], [3, e], [0, e]], [[12, t3], [10, t3], [7, t3], [12, t3], [10, t3], [7, t3]],
      [[3, e], [5, e], [6, e], [5, e]], [[7, e], [10, e], [12, e], [15, e]], [[10, e], [12, e, 'h'], [10, e, 'p'], [7, e]],
      [[15, 1.5, 'b'], [12, e]], [[12, e], [15, e], [12, e], [10, e]], [[7, e], [5, e], [3, e], [0, e]],
    ],
    endings: [[[3, e], [0, 1.5, '~']], [[5, e], [3, e, 'p'], [0, 1, '~']], [[10, e], [7, e], [0, 1, '~']]],
  },
  {
    id: 'progmetal', label: 'Prog metal', minor: true, bpm: 96, scale: [0, 2, 3, 5, 7, 8, 11],
    feel: 'Odd note groupings, legato runs, string skipping and harmonic-minor or diminished colours. Count the groups of 5 and 3 out loud at first.',
    cells: [
      [[0, s], [3, s], [7, s], [11, s], [12, s], [11, s], [7, s], [3, s]],
      [[12, s], [14, s, 'h'], [15, s, 'h'], [14, s, 'p'], [12, s, 'p'], [11, s], [12, s, 'h'], [14, s, 'h']],
      [[0, s], [12, s], [7, s], [15, s], [3, s], [14, s], [8, s], [12, s]],
      [[0, s], [3, s], [6, s], [9, s], [12, s], [9, s], [6, s], [3, s]],
      [[7, s], [8, s], [11, s], [12, s], [14, s], [12, s], [11, s], [8, s]],
      [[15, e], [14, s], [12, s], [11, e], [8, e]],
    ],
    endings: [[[11, e], [12, 1.5, '~']], [[8, s], [7, s], [5, s], [3, s], [2, e], [0, e]]],
  },
  {
    id: 'metal', label: 'Metal', minor: true, bpm: 120, low: true, scale: [0, 1, 3, 5, 7, 8, 10],
    feel: 'Palm-muted chugs on the low root (PM) against notes from the phrygian and harmonic minor scales: gallops, pedal-point runs and tremolo picking. Keep the picking hand tight.',
    cells: [
      [[0, e, 'PM'], [0, s, 'PM'], [0, s, 'PM'], [1, e], [0, e, 'PM']],
      [[0, s, 'PM'], [3, s], [0, s, 'PM'], [5, s], [0, s, 'PM'], [7, s], [0, s, 'PM'], [8, s]],
      [[7, s], [7, s], [7, s], [7, s], [8, s], [8, s], [8, s], [8, s]],
      [[0, e, 'PM'], [0, e, 'PM'], [1, e], [0, e, 'PM']],
      [[0, s, 'PM'], [0, s, 'PM'], [6, e], [0, s, 'PM'], [0, s, 'PM'], [5, e]],
      [[0, s, 'PM'], [0, s, 'PM'], [0, s, 'PM'], [0, s, 'PM'], [3, e], [1, e]],
    ],
    endings: [[[0, e, 'PM'], [0, e, 'PM'], [1, e], [0, e]], [[7, e], [8, e], [1, e], [0, e]]],
  },
  {
    id: 'folk', label: 'Folk', minor: false, bpm: 88, scale: [0, 2, 4, 5, 7, 9, 11],
    feel: 'Hammer-ons and pull-offs around the chord, sweet 3rds and open strings. Let the notes ring into each other.',
    cells: [
      [[0, e], [2, e, 'h'], [4, 1]], [[7, e], [5, e], [4, e], [2, e]], [[5, e], [4, e, 'p'], [2, e], [0, e]],
      [[0, e], [4, e], [2, e], [5, e]], [[9, 1], [7, e], [4, e]], [[4, e], [5, e], [7, e], [9, e]], [[2, e], [4, e, 'h'], [7, 1]],
    ],
    endings: [[[4, e], [2, e], [0, 1]], [[2, e], [0, e, 'p'], [0, 1]]],
  },
  {
    id: 'country', label: 'Country', minor: false, bpm: 100, scale: [0, 2, 3, 4, 7, 9],
    feel: 'Chicken-pickin\' snaps, the major 6th, steel-guitar style bends and the flat-3rd-to-3rd move. Hybrid pick if you can (pick plus middle finger).',
    cells: [
      [[9, s], [7, s], [4, e], [3, s], [4, s, 'h'], [0, e]], [[2, 1, 'b'], [4, e], [0, e]], [[7, e], [9, e], [12, e], [9, e]],
      [[16, e], [14, e], [12, e], [9, e]], [[-3, e], [0, e], [2, e], [3, s], [4, s, 'h']], [[12, e], [9, e], [7, e], [4, e]],
      [[9, e, 'b'], [7, e], [4, e], [2, e]],
    ],
    endings: [[[2, e], [3, s], [4, s, 'h'], [0, 1]], [[9, e], [7, e], [0, 1]]],
  },
]
export const lickGenre = (id: string) => LICK_GENRES.find(g => g.id === id) ?? LICK_GENRES[1]
export type LickLevel = 1 | 2 | 3

function rng(seed: number) {
  let a = seed >>> 0 || 1
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

/** Easy level: slow fast notes down (sixteenths → eighths, triplets → eighths), keeping the first two beats. */
function easier(cell: N[]): N[] {
  const out: N[] = []
  let t = 0
  for (const [st, d, tech] of cell) {
    const nd = d < 0.5 ? 0.5 : d
    if (t + nd > 2) break
    out.push([st, nd, tech])
    t += nd
  }
  if (t < 2 && out.length) out[out.length - 1] = [out[out.length - 1][0], out[out.length - 1][1] + 2 - t, out[out.length - 1][2]]
  return out
}

/** Where to play: the key note on the lowest string (fret 0–11) sets the hand position. */
function anchor(tuning: number[], rootPc: number) {
  const low = Math.min(...tuning)
  const s = tuning.indexOf(low)
  let fret = ((rootPc - low) % 12 + 12) % 12
  return { low: low + fret, fret, string: s }
}

function placeLick(notes: { midi: number; tech?: string }[], tuning: number[], near: number) {
  const out: { string: number; fret: number }[] = []
  let prev: { string: number; fret: number } | null = null
  for (const n of notes) {
    const cands: { string: number; fret: number }[] = []
    tuning.forEach((open, si) => { const f = n.midi - open; if (f >= 0 && f <= 22) cands.push({ string: si, fret: f }) })
    let best: { string: number; fret: number } | null = null
    // legato (hammer-on, pull-off) and bends stay on the string they started on
    if (prev && n.tech && ['h', 'p'].includes(n.tech)) best = cands.find(c => c.string === prev!.string && Math.abs(c.fret - prev!.fret) <= 5) ?? null
    if (!best) {
      const cost = (c: { string: number; fret: number }) =>
        Math.abs(c.fret - (prev ? prev.fret : near)) * 1.1 + (prev ? Math.abs(c.string - prev.string) * 0.5 : 0) +
        Math.max(0, c.fret - (near + 4)) * 2.5 + Math.max(0, near - 1 - c.fret) * (c.fret === 0 ? 0.6 : 2.5)
      best = cands.sort((a, b) => cost(a) - cost(b))[0] ?? null
    }
    if (best) { out.push(best); prev = best } else out.push({ string: -1, fret: -1 })
  }
  return out
}

export interface LickOptions { genre: LickGenre; root: string; bars: 1 | 2 | 4; level: LickLevel; seed: number }

/** A new lick as a song (one track), ready for Play. */
export function makeLick(o: LickOptions, tuning: number[]): Song {
  const g = lickGenre(o.genre)
  const r = rng(o.seed)
  const rootPc = pc(o.root)
  const a = anchor(tuning, rootPc)
  // metal works on the low root; the others an octave up, in the box around the key note
  const base = g.low ? a.low : a.low + 12
  const near = a.fret
  const beats = o.bars * 4
  const cells: N[][] = []
  let used = 0
  let last = -1
  while (used < beats - 2) {
    let k = Math.floor(r() * g.cells.length)
    if (k === last && g.cells.length > 1) k = (k + 1) % g.cells.length
    last = k
    let cell = g.cells[k]
    if (o.level === 1) cell = easier(cell)
    // hard: sometimes shift a cell an octave up for range
    if (o.level === 3 && !g.low && r() < 0.3) cell = cell.map(([st, d, tc]) => [st + 12, d, tc] as N)
    cells.push(cell)
    used += cell.reduce((x, n) => x + n[1], 0)
  }
  let end = g.endings[Math.floor(r() * g.endings.length)]
  if (o.level === 1) end = easier(end)
  cells.push(end)
  const flatNotes: { at: number; dur: number; midi: number; tech?: string }[] = []
  let t = 0
  for (const c of cells) for (const [st, d, tech] of c) { flatNotes.push({ at: t, dur: d, midi: base + st, tech }); t += d }
  const pos = placeLick(flatNotes, tuning, near)
  const total = Math.ceil(t / 4 - 1e-9) * 4
  const bars: SongBar[] = []
  for (let b0 = 0; b0 < total; b0 += 4) {
    const steps: SongStep[] = []
    flatNotes.forEach((n, i) => {
      if (n.at < b0 - 1e-9 || n.at >= b0 + 4 - 1e-9) return
      const p = pos[i]
      const notes: SongNote[] = p.string >= 0 ? [{ string: p.string, fret: p.fret, midi: n.midi, ...(n.tech && n.tech !== 'PM' ? { tech: n.tech } : {}), ...(n.tech === 'PM' ? { tech: 'PM' } : {}) }] : []
      steps.push({ notes, dur: Math.round(Math.min(n.dur, b0 + 4 - n.at) * 1000) / 1000 })
    })
    const filled = steps.reduce((x, st) => x + st.dur, 0)
    if (filled < 4 - 1e-6) steps.push({ notes: [], dur: Math.round((4 - filled) * 1000) / 1000 })
    bars.push({ steps })
  }
  const flats = keyPrefersFlats(o.root, g.minor)
  const keyName = (flats ? FLATS : SHARPS)[rootPc] + (g.minor ? 'm' : '')
  const bpm = Math.round(g.bpm * (o.level === 1 ? 0.75 : o.level === 3 ? 1.15 : 1))
  return { title: `${g.label} lick in ${keyName}`, tempo: bpm, tracks: [{ name: `${g.label} lick`, tuning, capo: 0, bars }] }
}

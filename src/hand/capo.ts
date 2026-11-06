// Smart capo for chord sheets: the capo fret that turns the song's chords into the easiest open shapes (fewest
// barre chords), the way guitarists capo a song in Eb to play it with C, F and G shapes. Applying it keeps the
// song's real key: capo k plus shapes k semitones lower sound the same.
import { chordShapes, generateShapes, type Instrument } from '../instrument'
import { parseSymbol } from '../theory/chords'
import { pc, pcName } from '../theory/notes'
import type { SongTrack } from '../tabs/model'
import { shapeNotes } from '../tabs/chordSheet'

/** "Eb7/G" moved down `k` semitones → "D7/F#" (sharps or flats to suit the new root). */
export function transposeChord(name: string, k: number): string {
  const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(name.trim())
  if (!m) return name
  const flats = /b/.test(m[1]) && k % 12 === 0
  const up = (r: string) => pcName((((pc(r) - k) % 12) + 12) % 12, flats)
  return `${up(m[1])}${m[2]}${m[3] ? `/${up(m[3])}` : ''}`
}

/** How hard a chord shape is: 0 open shape, 1 a barre or no open strings low down, 2 hard (wide or high barre). */
export function shapeEffort(name: string, inst: Instrument): number {
  const { root, suffix } = parseSymbol(name)
  const v = chordShapes(root, suffix, inst)[0] ?? generateShapes(root, suffix, inst.midis, 1)[0]
  if (!v) return 2
  const played = v.frets.filter(f => f >= 0)
  const fretted = played.filter(f => f > 0)
  if (!fretted.length) return 0
  const lo = Math.min(...fretted), hi = Math.max(...fretted)
  const open = played.includes(0)
  const barre = fretted.filter(f => f === lo).length >= 3 && !open
  if (barre) return lo >= 5 || hi - lo > 3 ? 2 : 1.5
  // an open-position shape (open strings ringing, frets 1–3) is the easy kind
  if (open && hi <= 3) return 0
  if (open) return 0.5
  return 1 // a closed shape: every string fretted
}

export interface CapoIdea { capo: number; shapes: string[]; effort: number; effortNow: number }

/** The capo (0–7 on top of the song's own) that gives the easiest shapes for these chords. */
export function bestCapo(chords: string[], inst: Instrument): CapoIdea {
  const uniq = [...new Set(chords.filter(Boolean))]
  const cost = (k: number) => uniq.reduce((t, c) => t + shapeEffort(transposeChord(c, k), inst), 0) + k * 0.05
  let best = 0, bestCost = cost(0)
  for (let k = 1; k <= 7; k++) { const c = cost(k); if (c < bestCost - 0.4) { best = k; bestCost = c } }
  return { capo: best, shapes: uniq.map(c => transposeChord(c, best)), effort: bestCost, effortNow: cost(0) }
}

/** The chord-sheet track with `k` more frets of capo and the shapes to match. */
export function capoTrack(track: SongTrack, k: number, inst: Instrument): SongTrack {
  if (!k) return track
  const capo = track.capo + k
  return {
    ...track,
    capo,
    bars: track.bars.map(b => ({
      steps: b.steps.map(st => (st.chord ? { ...st, chord: transposeChord(st.chord, k), notes: shapeNotes(transposeChord(st.chord, k), inst, capo) } : st)),
    })),
  }
}

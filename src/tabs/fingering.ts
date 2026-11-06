// Where to play a melody on the neck: each note gets a string and fret from the hand brain (hand/engine.ts), set up
// the way folk melodies and fiddle tunes are taught: first position with open strings, moving up only when a note
// is out of reach, and staying in a position once there.
import { placeAndFinger } from '../hand/engine'
import { handSize, scaleFor } from '../hand/neck'

export interface Placed { string: number; fret: number; midi: number }

const MAX_FRET = 15

/** Fingering for a line of single notes (null = rest) on an instrument tuned to `tuning` (MIDI, lowest string first). */
export function fingerMelody(midis: (number | null)[], tuning: number[], opts: { maxFret?: number; minFret?: number } = {}): (Placed | null)[] {
  const maxFret = opts.maxFret ?? MAX_FRET
  const steps = midis.map(m => ({ midis: m === null ? [] : [m], dur: 1 }))
  const minFret = opts.minFret ?? 0
  const res = placeAndFinger(steps, { scale: scaleFor(tuning.length), size: handSize(), tuning, maxFret, minFret, open: 0.8, level: 2, low: 0.04, warm: 0, ...(minFret > 0 ? { zone: [minFret, maxFret] as [number, number] } : {}) })
  return midis.map((m, i) => {
    const n = res.notes[i]?.[0]
    if (m === null) return null
    // a note the instrument can't reach is left out
    return n && n.fret <= maxFret ? { string: n.string, fret: n.fret, midi: m } : null
  })
}

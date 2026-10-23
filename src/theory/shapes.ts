// Chord shapes for progression chords (Jam, Travis/arpeggio tabs, chord melody), falling back to a simpler
// chord when a fancy one has no shape on this instrument.
import { chordShapes, type Instrument } from '../instrument'
import type { Voicing } from './chords'

const FALLBACK: Record<string, string[]> = {
  '13': ['9', '7'], m11: ['m9', 'm7'], maj9: ['maj7', 'major'], '69': ['6', 'major'], madd9: ['minor'], '7b9': ['7'],
  m9: ['m7'], '9': ['7'], add9: ['major'], sus2: ['major'], '7sus4': ['sus4', '7'], m7b5: ['dim'], dim7: ['dim'],
}
/** Shapes for a chord given as root + engine type ('' major, 'm', '7', 'maj7' …). */
export function shapesFor(c: { root: string; type: string }, inst: Instrument): Voicing[] {
  const suffix = c.type === '' ? 'major' : c.type === 'm' ? 'minor' : c.type
  for (const s of [suffix, ...(FALLBACK[suffix] ?? [])]) {
    const v = chordShapes(c.root, s, inst)
    if (v.length) return v
  }
  return []
}

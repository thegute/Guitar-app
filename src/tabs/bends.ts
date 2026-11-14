// Bent notes for the listeners: a bend starts on the fretted note and slides up to its target (a release comes back
// down), so every semitone on the way is the right note, not a wrong one.
import { bendOf } from '../licks/notation'

/** The extra pitches (MIDI) a step's bends pass through and land on: for each bent note, every semitone above the
 *  fretted note up to the bend's target (b½ = 1, b = 2, b1½ = 3). Empty when nothing is bent. */
export function bendAlso(notes: { midi: number; tech?: string }[]): number[] {
  const out: number[] = []
  for (const n of notes) {
    const up = Math.ceil(bendOf(n.tech))
    for (let k = 1; k <= up; k++) if (!out.includes(n.midi + k)) out.push(n.midi + k)
  }
  return out
}

/** every pitch a step accepts: its notes and what their bends pass through */
export const accepted = (s: { midis: number[]; also?: number[] } | undefined): number[] => (!s ? [] : s.also?.length ? [...s.midis, ...s.also] : s.midis)

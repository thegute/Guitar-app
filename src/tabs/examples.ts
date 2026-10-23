import { parseTextTab } from './textTab'
import { fromTextTab } from './model'
import type { SongDoc } from './library'

// Built-in practice tabs (public-domain melodies and generic exercises, arranged for this app).
// Written as note lists and turned into ordinary text tab so they also exercise the text parser.

type Step = [number, number][] // [string (0 = low E), fret][]

function ascii(title: string, bars: Step[][], chords: string[] = []): string {
  const names = ['E', 'A', 'D', 'G', 'B', 'e']
  const rows = names.map(n => n + '|')
  let chordLine = ''
  bars.forEach((bar, bi) => {
    if (chords[bi]) chordLine = chordLine.padEnd(rows[0].length + 1) + chords[bi] + ' '
    for (const step of bar) {
      const w = Math.max(...step.map(([, f]) => String(f).length))
      for (let s = 0; s < 6; s++) {
        const hit = step.find(([str]) => str === s)
        rows[s] += '-' + (hit ? String(hit[1]).padEnd(w, '-') : '-'.repeat(w))
      }
    }
    for (let s = 0; s < 6; s++) rows[s] += '-|'
  })
  return title + '\n' + (chordLine.trim() ? chordLine.trimEnd() + '\n' : '') + rows.reverse().join('\n')
}

const n = (s: number, f: number): Step => [[s, f]]

// Ode to Joy in C (melody on the top two strings)
const E4 = n(5, 0), F4 = n(5, 1), G4 = n(5, 3), D4 = n(4, 3), C4 = n(4, 1)
const ode = ascii('Ode to Joy (Beethoven)', [
  [E4, E4, F4, G4], [G4, F4, E4, D4], [C4, C4, D4, E4], [E4, D4, D4],
  [E4, E4, F4, G4], [G4, F4, E4, D4], [C4, C4, D4, E4], [D4, C4, C4],
], ['C', 'G', 'C', 'G', 'C', 'G', 'C', 'C'])

// A minor pentatonic, box 1 (5th position), up and back down
const up: Step[] = [n(0, 5), n(0, 8), n(1, 5), n(1, 7), n(2, 5), n(2, 7), n(3, 5), n(3, 7), n(4, 5), n(4, 8), n(5, 5), n(5, 8)]
const pent = ascii('A minor pentatonic, box 1', [up.slice(0, 6), up.slice(6), up.slice().reverse().slice(0, 6), up.slice().reverse().slice(6)], ['Am'])

// Greensleeves (traditional), open position in A minor
const A3 = n(3, 2), B3 = n(4, 0), Cn = n(4, 1), Dn = n(4, 3), En = n(5, 0), Fn = n(5, 1), G3 = n(3, 0), Gs3 = n(3, 1), E3 = n(2, 2)
const green = ascii('Greensleeves (traditional)', [
  [A3], [Cn, Dn], [En, Fn, En], [Dn, B3, G3], [A3, B3, Cn], [A3, A3, Gs3], [A3, B3, Gs3], [E3, A3],
], ['Am', 'Am', 'C', 'G', 'Am', 'E', 'E', 'Am'])

// Boogie shuffle riff in A (two-note power shapes)
const pair = (low: number, f: number): Step => [[low, 0], [low + 1, f]]
const blues = ascii('Blues shuffle riff in A', [
  [pair(1, 2), pair(1, 2), pair(1, 4), pair(1, 4), pair(1, 2), pair(1, 2), pair(1, 4), pair(1, 4)],
  [pair(1, 2), pair(1, 2), pair(1, 4), pair(1, 4), pair(1, 2), pair(1, 2), pair(1, 4), pair(1, 4)],
  [pair(0, 2), pair(0, 2), pair(0, 4), pair(0, 4), pair(0, 2), pair(0, 2), pair(0, 4), pair(0, 4)],
  [pair(1, 2), pair(1, 2), pair(1, 4), pair(1, 4), pair(1, 2), pair(1, 2), pair(1, 4), pair(1, 4)],
], ['A7', 'A7', 'D7', 'A7'])

export const EXAMPLES: { id: string; title: string; text: string }[] = [
  { id: 'ode', title: 'Ode to Joy (Beethoven)', text: ode },
  { id: 'green', title: 'Greensleeves (traditional)', text: green },
  { id: 'pent', title: 'A minor pentatonic, box 1', text: pent },
  { id: 'blues', title: 'Blues shuffle riff in A', text: blues },
]

/** An example as a song you can open (stored with a fixed id so it is never duplicated). */
export function exampleDoc(id: string): SongDoc {
  const ex = EXAMPLES.find(e => e.id === id) ?? EXAMPLES[0]
  const song = fromTextTab(parseTextTab(ex.text, ex.title)!)
  song.title = ex.title
  return { id: 'ex-' + ex.id, title: ex.title, source: 'example', song, updated: Date.now() }
}

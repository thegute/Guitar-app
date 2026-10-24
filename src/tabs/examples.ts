import { parseTextTab } from './textTab'
import { parseChordSheet } from './chordSheet'
import { current } from '../instrument'
import { fromTextTab } from './model'
import type { SongDoc } from './library'

// Built-in practice tabs (public-domain melodies and generic exercises, arranged for this app).
// Written as note lists and turned into ordinary text tab so they also exercise the text parser.

type Step = [number, number][] // [string (0 = low E), fret][]

function ascii(title: string, bars: Step[][], chords: string[] = [], names = ['E', 'A', 'D', 'G', 'B', 'e']): string {
  const rows = names.map(n => n + '|')
  let chordLine = ''
  bars.forEach((bar, bi) => {
    if (chords[bi]) chordLine = chordLine.padEnd(rows[0].length + 1) + chords[bi] + ' '
    for (const step of bar) {
      const w = Math.max(...step.map(([, f]) => String(f).length))
      for (let s = 0; s < names.length; s++) {
        const hit = step.find(([str]) => str === s)
        rows[s] += '-' + (hit ? String(hit[1]).padEnd(w, '-') : '-'.repeat(w))
      }
    }
    for (let s = 0; s < names.length; s++) rows[s] += '-|'
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

// ---------- ukulele (strings: 0 = G, 1 = C, 2 = E, 3 = A) ----------
const U = ['G', 'C', 'E', 'A']
const uC4 = n(1, 0), uD4 = n(1, 2), uE4 = n(2, 0), uF4 = n(2, 1), uG4 = n(2, 3), uA4 = n(3, 0), uB4 = n(3, 2), uC5 = n(3, 3)
const ukeOde = ascii('Ode to Joy (ukulele)', [
  [uE4, uE4, uF4, uG4], [uG4, uF4, uE4, uD4], [uC4, uC4, uD4, uE4], [uE4, uD4, uD4],
  [uE4, uE4, uF4, uG4], [uG4, uF4, uE4, uD4], [uC4, uC4, uD4, uE4], [uD4, uC4, uC4],
], ['C', 'G', 'C', 'G', 'C', 'G', 'C', 'C'], U)
const ukeScale = ascii('C major scale (ukulele)', [[uC4, uD4, uE4, uF4], [uG4, uA4, uB4, uC5], [uC5, uB4, uA4, uG4], [uF4, uE4, uD4, uC4]], ['C'], U)
const ukeTwinkle = ascii('Twinkle Twinkle Little Star (traditional, ukulele)', [
  [uC4, uC4, uG4, uG4], [uA4, uA4, uG4], [uF4, uF4, uE4, uE4], [uD4, uD4, uC4],
], ['C', 'F C', 'F C', 'G C'].map(c => c.split(' ')[0]), U)
const shape = (frets: number[]): Step => frets.map((f, s) => [s, f] as [number, number])
const uC = shape([0, 0, 0, 3]), uAm = shape([2, 0, 0, 0]), uF = shape([2, 0, 1, 0]), uG = shape([0, 2, 3, 2])
const ukeStrum = ascii('Strum along: C – Am – F – G (ukulele)', [[uC, uC, uC, uC], [uAm, uAm, uAm, uAm], [uF, uF, uF, uF], [uG, uG, uG, uG]], ['C', 'Am', 'F', 'G'], U)

// ---------- baritone (D G B E = the top four guitar strings) ----------
const B = ['D', 'G', 'B', 'e']
const down2 = (bars: Step[][]) => bars.map(b => b.map(st => st.map(([s, f]) => [s - 2, f] as [number, number])))
const bariOde = ascii('Ode to Joy (baritone)', down2([
  [E4, E4, F4, G4], [G4, F4, E4, D4], [C4, C4, D4, E4], [E4, D4, D4],
  [E4, E4, F4, G4], [G4, F4, E4, D4], [C4, C4, D4, E4], [D4, C4, C4],
]), ['C', 'G', 'C', 'G', 'C', 'G', 'C', 'C'], B)
const bariGreen = ascii('Greensleeves (traditional, baritone)', down2([
  [A3], [Cn, Dn], [En, Fn, En], [Dn, B3, G3], [A3, B3, Cn], [A3, A3, Gs3], [A3, B3, Gs3], [E3, A3],
]), ['Am', 'Am', 'C', 'G', 'Am', 'E', 'E', 'Am'], B)
const bG = shape([0, 0, 0, 3]), bEm = shape([2, 0, 0, 0]), bC = shape([2, 0, 1, 0]), bD = shape([0, 2, 3, 2])
const bariStrum = ascii('Strum along: G – Em – C – D (baritone)', [[bG, bG, bG, bG], [bEm, bEm, bEm, bEm], [bC, bC, bC, bC], [bD, bD, bD, bD]], ['G', 'Em', 'C', 'D'], B)

// a chord sheet (chords over the words) for strum-along; works on any instrument. Words: John Newton, 1779 (public domain)
const grace = `Amazing Grace (traditional)

[Verse]
G              G7          C           G
Amazing grace, how sweet the sound
G                           D
That saved a wretch like me
G            G7          C          G
I once was lost, but now am found
G          D           G
Was blind, but now I see`

// the real rhythm of the melodies, in beats per note, bar by bar (the text tab only has even spacing)
const q4 = [1, 1, 1, 1]
const odeRhythm = [q4, q4, q4, [1.5, 0.5, 2], q4, q4, q4, [1.5, 0.5, 2]]
const greenRhythm = [[1], [2, 1], [1.5, 0.5, 1], [1, 1, 1], [1.5, 0.5, 1], [1, 1, 1], [1.5, 0.5, 1], [1, 2]]
const twinkleRhythm = [q4, [1, 1, 2], q4, [1, 1, 2]]

export type ExampleFor = 'guitar' | 'tenor' | 'baritone' | 'any'
export const EXAMPLES: { id: string; title: string; text: string; for: ExampleFor; rhythm?: number[][]; meter?: number }[] = [
  { id: 'ode', title: 'Ode to Joy (Beethoven)', text: ode, for: 'guitar', rhythm: odeRhythm },
  { id: 'green', title: 'Greensleeves (traditional)', text: green, for: 'guitar', rhythm: greenRhythm, meter: 3 },
  { id: 'pent', title: 'A minor pentatonic, box 1', text: pent, for: 'guitar', meter: 3 },
  { id: 'blues', title: 'Blues shuffle riff in A', text: blues, for: 'guitar' },
  { id: 'uke-ode', title: 'Ode to Joy (ukulele)', text: ukeOde, for: 'tenor', rhythm: odeRhythm },
  { id: 'uke-twinkle', title: 'Twinkle Twinkle (ukulele)', text: ukeTwinkle, for: 'tenor', rhythm: twinkleRhythm },
  { id: 'uke-scale', title: 'C major scale (ukulele)', text: ukeScale, for: 'tenor', rhythm: [q4, q4, q4, q4] },
  { id: 'uke-strum', title: 'Strum along: C–Am–F–G (ukulele)', text: ukeStrum, for: 'tenor', rhythm: [q4, q4, q4, q4] },
  { id: 'bari-ode', title: 'Ode to Joy (baritone)', text: bariOde, for: 'baritone', rhythm: odeRhythm },
  { id: 'bari-green', title: 'Greensleeves (baritone)', text: bariGreen, for: 'baritone', rhythm: greenRhythm, meter: 3 },
  { id: 'bari-strum', title: 'Strum along: G–Em–C–D (baritone)', text: bariStrum, for: 'baritone', rhythm: [q4, q4, q4, q4] },
  { id: 'grace', title: 'Amazing Grace (chord sheet, strum along)', text: grace, for: 'any' },
]

/** An example as a song you can open (stored with a fixed id so it is never duplicated). */
/** The saved id of an example (chord sheets are made separately for each instrument). */
export function exampleId(id: string, instId: string) {
  const ex = EXAMPLES.find(e => e.id === id)
  return ex?.for === 'any' ? `ex-${id}-${instId}` : `ex-${id}`
}

export function exampleDoc(id: string, tuning?: string[]): SongDoc {
  const ex = EXAMPLES.find(e => e.id === id) ?? EXAMPLES[0]
  if (ex.for === 'any') {
    const inst = current()
    const song = parseChordSheet(ex.text, ex.title, inst)!
    song.title = ex.title
    return { id: exampleId(ex.id, inst.id), title: ex.title, source: 'example', inst: inst.id, song, updated: Date.now() }
  }
  const fallback = tuning && tuning.length === (ex.for === 'guitar' ? 6 : 4) ? tuning : undefined
  const song = fromTextTab(parseTextTab(ex.text, ex.title, fallback)!)
  song.title = ex.title
  if (ex.meter) song.meter = ex.meter
  if (ex.rhythm) song.tracks[0].bars.forEach((bar, bi) => {
    const r = ex.rhythm![bi]
    if (r && r.length === bar.steps.length) bar.steps.forEach((st, si) => { st.dur = r[si] })
  })
  return { id: 'ex-' + ex.id, title: ex.title, source: 'example', inst: ex.for, song, updated: Date.now() }
}

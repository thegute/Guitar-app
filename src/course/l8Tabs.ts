// Level 8 (Modes and beyond): tabs for every lesson. Lines are written as pitches and placed by the hand brain
// (lineSong in l6Tabs); chord vamps are walks with grips checked note by note (low E first):
//   Am7 x02010 · D xx0232 · G 320003 · F 133211 · G/F 1x0003 · Em 022000 · Am x02210
// The lesson's Key menu moves all of them like a capo.
import type { Song } from '../tabs/model'
import { walk } from './l5Tabs'
import { inWindow, lineSong } from './l6Tabs'

const mod = (n: number) => ((n % 12) + 12) % 12

// the scales of Level 8, as semitones from the root
export const MODE = {
  lydian: [0, 2, 4, 6, 7, 9, 11], ionian: [0, 2, 4, 5, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11], phrygianDominant: [0, 1, 4, 5, 7, 8, 10], melodicMinor: [0, 2, 3, 5, 7, 9, 11],
  lydianDominant: [0, 2, 4, 6, 7, 9, 10], altered: [0, 1, 3, 4, 6, 8, 10], wholeTone: [0, 2, 4, 6, 8, 10],
  halfWhole: [0, 1, 3, 4, 6, 7, 9, 10], wholeHalf: [0, 2, 3, 5, 6, 8, 9, 11],
} as const

/** scale-degree names (♭2, ♯4, ♭6 …), the way modes are spoken about; the altered scale and the symmetric ones use chord names */
const DEG: Record<number, string> = { 0: 'R', 1: '♭2', 2: '2', 3: '♭3', 4: '3', 5: '4', 6: '♯4', 7: '5', 8: '♭6', 9: '6', 10: '♭7', 11: '7' }
const CHORDY: Record<number, string> = { 0: 'R', 1: '♭9', 2: '9', 3: '♯9', 4: '3', 5: '11', 6: '♯11', 7: '5', 8: '♭13', 9: '13', 10: '♭7', 11: '7' }
type Mark = { s: number; f: number; label: string; role: 'root' | 'chord' | 'scale' | 'target' | 'next' }

/** A mode in one window (frets lo–hi on guitar; a nearby window elsewhere), labelled by degree, with the notes that give
 *  the mode its colour (`colour`, semitones from the root) highlighted. */
export function modeMarks(tuning: number[], root: number, ivs: readonly number[], lo: number, hi: number, colour: number[] = [], chordy = false): Mark[] {
  const guitar = tuning.length === 6 && tuning[0] === 40
  let [a, b] = [lo, hi]
  if (!guitar) {
    // the first window from the nut that holds every note of the scale
    for (let s = 0; s < 10; s++) { const ns = inWindow(tuning, ivs.map(i => mod(root + i)), s, s + 4); if (new Set(ns.map(n => mod(n.midi))).size === ivs.length) { a = s; b = s + 4; break } }
  }
  return inWindow(tuning, ivs.map(i => mod(root + i)), a, b).map(n => {
    const iv = mod(n.midi - root)
    return { s: n.string, f: n.fret, label: (chordy ? CHORDY : DEG)[iv], role: iv === 0 ? 'root' : colour.includes(iv) ? 'target' : 'scale' }
  })
}

type Ev = [number | null, number, string?, string?]
/** up an octave and back down in eighths (8 + 7 notes and a rest = two bars) */
function upDown(root: number, ivs: readonly number[], label: string): Ev[] {
  const up = [...ivs, 12].map(i => root + i)
  const down = up.slice(0, -1).reverse()
  const evs: Ev[] = [...up, ...down].map((m, i) => [m, 0.5, i === 0 ? label : undefined])
  const used = (up.length + down.length) * 0.5
  if (used % 4) evs.push([null, 4 - (used % 4)])
  return evs
}

// ---- 1 · what modes are: one root, seven colours ----
export const modesParallelTab = (t: number[]): Song => lineSong(t, 'Seven modes on one root (C), brightest to darkest: listen for the note that changes', [
  ...upDown(48, MODE.lydian, 'C Lydian (♯4)'), ...upDown(48, MODE.ionian, 'C Ionian (major)'), ...upDown(48, MODE.mixolydian, 'C Mixolydian (♭7)'),
  ...upDown(48, MODE.dorian, 'C Dorian (♭3, ♮6)'), ...upDown(48, MODE.aeolian, 'C Aeolian (♭6)'), ...upDown(48, MODE.phrygian, 'C Phrygian (♭2)'),
  ...upDown(48, MODE.locrian, 'C Locrian (♭5)'),
], 80, 1, 5)

// ---- 2 · Dorian and Mixolydian ----
export const dorianTab = (t: number[]): Song => lineSong(t, 'A Dorian over Am7 – D: the F♯ (the ♮6) is the colour, and the 3rd of D', [
  [57, 0.5, 'Am7'], [60, 0.5], [64, 0.5], [67, 0.5], [66, 1], [64, 1],
  [62, 0.5], [60, 0.5], [57, 1], [null, 2],
  [66, 0.5, 'D'], [69, 0.5], [66, 0.5], [64, 0.5], [62, 1], [57, 1],
  [59, 0.5], [60, 0.5], [62, 0.5], [64, 0.5], [66, 2],
  [69, 0.5, 'Am7'], [67, 0.5], [66, 0.5], [64, 0.5], [66, 1], [69, 1],
  [67, 0.5], [64, 0.5], [60, 1], [57, 2],
  [62, 0.5, 'D'], [66, 0.5], [69, 0.5], [71, 0.5], [69, 1], [66, 1],
  [64, 0.5], [62, 0.5], [60, 0.5], [59, 0.5], [57, 2],
], 84, 4, 9)
export const mixoTab = (t: number[]): Song => lineSong(t, 'G Mixolydian over G – F: the F (the ♭7) is the colour, and the root of the F chord', [
  [55, 0.5, 'G'], [59, 0.5], [62, 0.5], [65, 0.5], [64, 1], [62, 1],
  [59, 0.5], [60, 0.5], [62, 2], [null, 1],
  [65, 0.5, 'F'], [64, 0.5], [60, 0.5], [57, 0.5], [60, 1], [65, 1],
  [64, 0.5], [62, 0.5], [59, 0.5], [57, 0.5], [55, 2],
  [67, 0.5, 'G'], [65, 0.5], [62, 0.5], [59, 0.5], [62, 1], [65, 1],
  [67, 1], [64, 1], [62, 2],
  [60, 0.5, 'F'], [65, 0.5], [69, 0.5], [65, 0.5], [64, 1], [60, 1],
  [62, 0.5], [59, 0.5], [57, 0.5], [59, 0.5], [55, 2],
], 92, 2, 7)

// ---- 3 · Lydian, Phrygian, Locrian ----
export const lydPhryTab = (t: number[]): Song => lineSong(t, 'F Lydian over F – G/F (B is the ♯4), E Phrygian over Em – F (F is the ♭2), B Locrian over Bm7♭5 – C', [
  [53, 0.5, 'F'], [57, 0.5], [60, 0.5], [64, 0.5], [65, 1], [64, 1],
  [59, 0.5, 'G/F'], [62, 0.5], [55, 0.5], [59, 0.5], [62, 1], [59, 1],
  [60, 0.5, 'F'], [59, 0.5], [57, 0.5], [55, 0.5], [53, 2],
  [52, 0.5, 'Em'], [53, 0.5], [55, 0.5], [53, 0.5], [52, 2],
  [53, 0.5, 'F'], [57, 0.5], [60, 0.5], [57, 0.5], [53, 1], [52, 1],
  [64, 0.5, 'Em'], [62, 0.5], [60, 0.5], [59, 0.5], [55, 0.5], [53, 0.5], [52, 1],
  [47, 0.5, 'Bm7♭5'], [50, 0.5], [53, 0.5], [57, 0.5], [59, 1], [57, 1],
  [55, 0.5, 'C'], [53, 0.5], [52, 0.5], [50, 0.5], [48, 2],
], 80)

// ---- 4 · modal vamps ----
const Am7 = [-1, 0, 2, 0, 1, 0], D = [-1, -1, 0, 2, 3, 2], Gc = [3, 2, 0, 0, 0, 3], F = [1, 3, 3, 2, 1, 1], GoverF = [1, -1, 0, 0, 0, 3]
const Em = [0, 2, 2, 0, 0, 0], Am = [-1, 0, 2, 2, 1, 0]
export const vampsTab = (t: number[]): Song => walk(t, 'Five modal vamps: Dorian Am7 – D, Mixolydian G – F, Lydian F – G/F, Phrygian Em – F, Aeolian Am – F – G', [
  [9, 'm7', Am7], [2, 'maj', D], [9, 'm7', Am7], [2, 'maj', D],
  [7, 'maj', Gc], [5, 'maj', F], [7, 'maj', Gc], [5, 'maj', F],
  [5, 'maj', F], [7, 'maj', GoverF, 5], [5, 'maj', F], [7, 'maj', GoverF, 5],
  [4, 'min', Em], [5, 'maj', F], [4, 'min', Em], [5, 'maj', F],
  [9, 'min', Am], [5, 'maj', F], [7, 'maj', Gc], [9, 'min', Am],
], 84)

// ---- 5 · harmonic minor and Phrygian dominant ----
export const phrygDomTab = (t: number[]): Song => lineSong(t, 'E Phrygian dominant (A harmonic minor from E): a low pedal riff over E, then up through E7 into Am', [
  [40, 0.5, 'E'], [41, 0.5], [44, 0.5], [45, 0.5], [47, 0.5], [45, 0.5], [44, 0.5], [41, 0.5],
  [40, 0.5], [41, 0.5], [40, 0.5], [44, 0.5], [40, 0.5], [45, 0.5], [44, 0.5], [41, 0.5],
  [52, 0.5, 'E7'], [53, 0.5], [56, 0.5], [57, 0.5], [59, 0.5], [60, 0.5], [62, 0.5], [64, 0.5],
  [62, 0.5, 'Am'], [60, 0.5], [59, 0.5], [56, 0.5], [57, 2],
], 96, 0, 4)

// ---- 6 · melodic minor, Lydian dominant and altered ----
export const melMinorTab = (t: number[]): Song => lineSong(t, 'A melodic minor over Am(maj7), D Lydian dominant over D7♯11, G altered over G7alt into Cmaj7', [
  ...upDown(57, MODE.melodicMinor, 'Am(maj7)'),
  [62, 0.5, 'D7♯11'], [66, 0.5], [68, 0.5], [69, 0.5], [72, 0.5], [69, 0.5], [68, 0.5], [66, 0.5],
  [64, 0.5], [62, 0.5], [60, 0.5], [64, 0.5], [62, 2],
  [67, 0.5, 'G7alt'], [65, 0.5], [63, 0.5], [61, 0.5], [59, 0.5], [58, 0.5], [56, 0.5], [55, 0.5],
  [60, 0.5, 'Cmaj7'], [64, 0.5], [67, 0.5], [71, 0.5], [72, 2],
], 84)

// ---- 7 · whole-tone and diminished ----
export const symmetricTab = (t: number[]): Song => lineSong(t, 'Whole-tone over G7♯5, half-whole diminished over G7♭9, and Bdim7 into C', [
  [55, 0.5, 'G7♯5'], [57, 0.5], [59, 0.5], [61, 0.5], [63, 0.5], [65, 0.5], [67, 1],
  [65, 0.5], [63, 0.5], [61, 0.5], [59, 0.5], [57, 0.5], [55, 0.5], [null, 1],
  [64, 2, 'C'], [60, 2],
  [55, 0.5, 'G7♭9'], [56, 0.5], [58, 0.5], [59, 0.5], [61, 0.5], [62, 0.5], [64, 0.5], [65, 0.5],
  [67, 0.5], [65, 0.5], [64, 0.5], [62, 0.5], [61, 0.5], [59, 0.5], [58, 0.5], [56, 0.5],
  [64, 2, 'C'], [60, 2],
  [59, 0.5, 'Bdim7'], [62, 0.5], [65, 0.5], [68, 0.5], [71, 0.5], [68, 0.5], [65, 0.5], [62, 0.5],
  [60, 4, 'C'],
], 84)

// ---- 8 · what to play over any chord: a ii – V – I, plain then coloured ----
export const chordScaleTab = (t: number[]): Song => lineSong(t, 'ii – V – I in C twice: D Dorian, G Mixolydian, C major; then G altered and C Lydian for colour', [
  [62, 0.5, 'Dm7'], [65, 0.5], [69, 0.5], [72, 0.5], [71, 0.5], [69, 0.5], [65, 0.5], [64, 0.5],
  [67, 0.5, 'G7'], [71, 0.5], [74, 0.5], [72, 0.5], [71, 0.5], [69, 0.5], [67, 0.5], [65, 0.5],
  [64, 1, 'Cmaj7'], [67, 0.5], [71, 0.5], [72, 2],
  [62, 0.5, 'Dm7'], [64, 0.5], [65, 0.5], [69, 0.5], [71, 1], [69, 1],
  [68, 0.5, 'G7alt'], [70, 0.5], [71, 0.5], [73, 0.5], [75, 0.5], [73, 0.5], [71, 0.5], [68, 0.5],
  [67, 0.5, 'Cmaj7♯11'], [66, 0.5], [64, 0.5], [71, 0.5], [72, 2],
], 84)

// ---- 9 · triad pairs and upper structures ----
export const triadPairTab = (t: number[]): Song => lineSong(t, 'C and D triads woven over Am7 – D (A Dorian), then D and A♭ triads on top of C7 (upper structures)', [
  [60, 0.5, 'Am7'], [64, 0.5], [67, 0.5], [62, 0.5], [66, 0.5], [69, 0.5], [64, 0.5], [67, 0.5],
  [72, 0.5], [69, 0.5], [66, 0.5], [67, 0.5], [64, 0.5], [62, 0.5], [60, 1],
  [69, 0.5, 'D'], [66, 0.5], [62, 0.5], [67, 0.5], [64, 0.5], [60, 0.5], [62, 1],
  [64, 2, 'Am7'], [57, 2],
  [62, 0.5, 'C13♯11 (D over C7)'], [66, 0.5], [69, 0.5], [74, 0.5], [69, 0.5], [66, 0.5], [62, 1],
  [68, 0.5, 'C7♯5♯9 (A♭ over C7)'], [72, 0.5], [75, 0.5], [72, 0.5], [68, 0.5], [63, 0.5], [60, 1],
  [65, 2, 'F'], [69, 2],
], 84)

export const L8_TABS = { modesParallelTab, dorianTab, mixoTab, lydPhryTab, vampsTab, phrygDomTab, melMinorTab, symmetricTab, chordScaleTab, triadPairTab }

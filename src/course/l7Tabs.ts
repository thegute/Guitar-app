// Level 7 (harmony in depth): chord walks for every lesson (each chord held, then picked low to high), with checked
// open and barre grips on guitar and worked-out voicings on other tunings. Lines of single notes use lineSong (l6Tabs).
import type { Song } from '../tabs/model'
import { walk, type G } from './l5Tabs'
import { lineSong } from './l6Tabs'

// grips, low E first (-1 = muted): each one checked note by note
const C = [-1, 3, 2, 0, 1, 0], F = [1, 3, 3, 2, 1, 1], Gch = [3, 2, 0, 0, 0, 3], G7 = [3, 2, 0, 0, 0, 1]
const Am = [-1, 0, 2, 2, 1, 0], Dm = [-1, -1, 0, 2, 3, 1], Em = [0, 2, 2, 0, 0, 0], E7 = [0, 2, 0, 1, 0, 0]
const A7 = [-1, 0, 2, 0, 2, 0], D7 = [-1, -1, 0, 2, 1, 2], C7 = [-1, 3, 2, 3, 1, 0], B7 = [-1, 2, 1, 2, 0, 2]
const D = [-1, -1, 0, 2, 3, 2], E = [0, 2, 2, 1, 0, 0], A = [-1, 0, 2, 2, 2, 0], Bm = [-1, 2, 4, 4, 3, 2], Fsm = [2, 4, 4, 2, 2, 2]
const Fm = [1, 3, 3, 1, 1, 1], Ab = [4, 6, 6, 5, 4, 4], Bb = [-1, 1, 3, 3, 3, 1], Eb = [-1, 6, 8, 8, 8, 6]
const Cmaj7 = [-1, 3, 2, 0, 0, 0], Am7 = [-1, 0, 2, 0, 1, 0], Dm7 = [-1, -1, 0, 2, 1, 1], Em7 = [0, 2, 0, 0, 0, 0], Fmaj7 = [-1, -1, 3, 2, 1, 0]
const E7b9 = [0, 2, 0, 1, 3, 1]
// shells (root, 3rd, 7th) for the jazz moves
const sDm7 = [-1, 5, 3, 5, -1, -1], sG7 = [3, -1, 3, 4, -1, -1], sCmaj7 = [-1, 3, 2, 4, -1, -1], sDb7 = [-1, 4, 3, 4, -1, -1], sEb7 = [-1, 6, 5, 6, -1, -1], sA7 = [5, -1, 5, 6, -1, -1]
const Cs7 = [-1, 4, 5, 3, 5, -1], Ds7 = [-1, 6, 7, 5, 7, -1], Fs7 = [2, -1, 1, 2, 1, -1], CoverG = [3, 3, 2, 0, 1, 0]

// ---- 1 · cadences ----
export const cadencesTab = (t: number[]): Song => walk(t, 'Four endings in C: authentic (G7 – C), half (… – G), deceptive (G7 – Am), plagal (F – C)', [
  [0, 'maj', C], [5, 'maj', F], [7, 'dom7', G7], [0, 'maj', C],
  [0, 'maj', C], [9, 'min', Am], [5, 'maj', F], [7, 'maj', Gch],
  [0, 'maj', C], [5, 'maj', F], [7, 'dom7', G7], [9, 'min', Am],
  [0, 'maj', C], [5, 'maj', F], [0, 'maj', C], [0, 'maj', C],
], 76)

// ---- 2 · harmonic and melodic minor ----
export const minorVTab = (t: number[]): Song => walk(t, 'A minor with the borrowed V: Am – Dm – Em (natural) vs E7 and E7♭9 (harmonic minor)', [
  [9, 'min', Am], [2, 'min', Dm], [4, 'min', Em], [9, 'min', Am],
  [9, 'min', Am], [2, 'min', Dm], [4, 'dom7', E7], [9, 'min', Am],
  [9, 'min', Am], [2, 'min', Dm], [4, 'dom7b9', E7b9], [9, 'min', Am],
], 72)
export const minorScalesTab = (t: number[]): Song => lineSong(t, 'A natural, harmonic and melodic minor, up and back (listen to the 6th and 7th)', [
  [57, 0.5, 'Am (natural minor)'], [59, 0.5], [60, 0.5], [62, 0.5], [64, 0.5], [65, 0.5], [67, 0.5], [69, 0.5], [67, 0.5], [65, 0.5], [64, 0.5], [62, 0.5], [60, 0.5], [59, 0.5], [57, 1],
  [57, 0.5, 'E7 (harmonic minor)'], [59, 0.5], [60, 0.5], [62, 0.5], [64, 0.5], [65, 0.5], [68, 0.5], [69, 0.5], [68, 0.5], [65, 0.5], [64, 0.5], [62, 0.5], [60, 0.5], [59, 0.5], [57, 1],
  [57, 0.5, 'Am (melodic minor, up)'], [59, 0.5], [60, 0.5], [62, 0.5], [64, 0.5], [66, 0.5], [68, 0.5], [69, 0.5], [67, 0.5, 'down: natural'], [65, 0.5], [64, 0.5], [62, 0.5], [60, 0.5], [59, 0.5], [57, 1],
], 76, 4, 9)

// ---- 3 · secondary dominants ----
export const secDomTab = (t: number[]): Song => walk(t, 'Secondary dominants in C: A7 → Dm, E7 → Am, D7 → G, C7 → F, B7 → Em', [
  [0, 'maj', C], [9, 'dom7', A7], [2, 'min', Dm], [7, 'dom7', G7],
  [0, 'maj', C], [4, 'dom7', E7], [9, 'min', Am], [9, 'min', Am],
  [0, 'maj', C], [2, 'dom7', D7], [7, 'maj', Gch], [7, 'maj', Gch],
  [0, 'maj', C], [0, 'dom7', C7], [5, 'maj', F], [5, 'maj', F],
  [0, 'maj', C], [11, 'dom7', B7], [4, 'min', Em], [4, 'min', Em],
], 76)

// ---- 4 · borrowed chords ----
export const borrowedTab = (t: number[]): Song => walk(t, 'Borrowed from C minor: C – Fm – C, C – A♭ – B♭ – C, C – B♭ – F – C, C – E♭ – F – C', [
  [0, 'maj', C], [5, 'maj', F], [5, 'min', Fm], [0, 'maj', C],
  [0, 'maj', C], [8, 'maj', Ab], [10, 'maj', Bb], [0, 'maj', C],
  [0, 'maj', C], [10, 'maj', Bb], [5, 'maj', F], [0, 'maj', C],
  [0, 'maj', C], [3, 'maj', Eb], [5, 'maj', F], [0, 'maj', C],
], 76)

// ---- 5 · key changes ----
export const keyChangeTab = (t: number[]): Song => walk(t, 'Two key changes: C to G through the pivot Am, then a direct lift from C to D', [
  [0, 'maj', C], [5, 'maj', F], [9, 'min', Am, undefined, 'Am (vi in C = ii in G)'], [2, 'dom7', D7],
  [7, 'maj', Gch], [4, 'min', Em], [0, 'maj', C], [2, 'dom7', D7],
  [7, 'maj', Gch], [0, 'maj', C], [7, 'dom7', G7], [0, 'maj', C],
  [9, 'dom7', A7, undefined, 'A7 (V of the new key)'], [2, 'maj', D], [7, 'maj', Gch], [9, 'dom7', A7],
  [2, 'maj', D], [2, 'maj', D],
], 76)

// ---- 6 · diatonic substitution and reharmonization ----
export const reharmTab = (t: number[]): Song => walk(t, 'One tune, four harmonies: C F G C → C Am Dm G7 → with 7ths → with secondary dominants', [
  [0, 'maj', C], [5, 'maj', F], [7, 'maj', Gch], [0, 'maj', C],
  [0, 'maj', C], [9, 'min', Am], [2, 'min', Dm], [7, 'dom7', G7],
  [0, 'maj7', Cmaj7], [9, 'm7', Am7], [2, 'm7', Dm7], [7, 'dom7', G7],
  [0, 'maj7', Cmaj7], [4, 'dom7', E7], [9, 'm7', Am7], [2, 'dom7', D7],
  [2, 'm7', Dm7], [7, 'dom7', G7], [0, 'maj7', Cmaj7], [5, 'maj7', Fmaj7],
  [4, 'm7', Em7], [9, 'm7', Am7], [2, 'm7', Dm7], [0, 'maj7', Cmaj7],
], 76)

// ---- 7 · tritone subs and passing diminished ----
export const tritoneTab = (t: number[]): Song => walk(t, 'Tritone subs and passing diminished: D♭7 for G7, E♭7 for A7, then C♯dim7 and D♯dim7 walking up', [
  [2, 'm7', sDm7], [7, 'dom7', sG7], [0, 'maj7', sCmaj7], [0, 'maj7', sCmaj7],
  [2, 'm7', sDm7], [1, 'dom7', sDb7, undefined, 'D♭7 (for G7)'], [0, 'maj7', sCmaj7], [0, 'maj7', sCmaj7],
  [0, 'maj7', sCmaj7], [9, 'dom7', sA7], [2, 'm7', sDm7], [7, 'dom7', sG7],
  [0, 'maj7', sCmaj7], [3, 'dom7', sEb7, undefined, 'E♭7 (for A7)'], [2, 'm7', sDm7], [1, 'dom7', sDb7, undefined, 'D♭7 (for G7)'],
  [0, 'maj', C], [1, 'dim7', Cs7, undefined, 'C♯dim7'], [2, 'm7', Dm7], [3, 'dim7', Ds7, undefined, 'D♯dim7'],
  [4, 'm7', Em7], [5, 'maj', F], [6, 'dim7', Fs7, undefined, 'F♯dim7'], [0, 'maj', CoverG, 7],
], 72)

// ---- 8 · analysing real songs (traditional / public domain) ----
export const analysisTab = (t: number[]): Song => walk(t, 'Two traditional pieces to analyse: a minor-key folk song (Am C D F / Am C E) and the Canon progression in D', [
  [9, 'min', Am], [0, 'maj', C], [2, 'maj', D], [5, 'maj', F],
  [9, 'min', Am], [0, 'maj', C], [4, 'maj', E], [4, 'maj', E],
  [9, 'min', Am], [0, 'maj', C], [2, 'maj', D], [5, 'maj', F],
  [9, 'min', Am], [4, 'maj', E], [9, 'min', Am], [9, 'min', Am],
  [2, 'maj', D], [9, 'maj', A], [11, 'min', Bm], [6, 'min', Fsm, undefined, 'F♯m'],
  [7, 'maj', Gch], [2, 'maj', D], [7, 'maj', Gch], [9, 'maj', A],
], 76)

export const L7_TABS = { cadencesTab, minorVTab, minorScalesTab, secDomTab, borrowedTab, keyChangeTab, reharmTab, tritoneTab, analysisTab }
export type { G }

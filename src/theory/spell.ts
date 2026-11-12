// Spelling notes the way musicians write them: every scale uses each letter once (D major has F#, not Gb; F major has
// Bb, not A#), and an interval like "b3 of D" is named from the 3rd letter (F), not just counted in frets.
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11]
const ACC: Record<number, string> = { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: '##' }

export const MAJOR_SEMIS = [0, 2, 4, 5, 7, 9, 11]
export const NAT_MINOR_SEMIS = [0, 2, 3, 5, 7, 8, 10]
/** keys a guitarist meets, in circle order (sharps, then flats); minors by their usual spelling */
export const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']
export const MINOR_KEYS = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D', 'G', 'C', 'F', 'Bb', 'Eb']

/** pitch class of a written note: C = 0 … B = 11, accidentals included (B# = 0, Cb = 11) */
export function pcOf(name: string): number {
  const L = LETTERS.indexOf(name[0].toUpperCase() as typeof LETTERS[number])
  if (L < 0) return NaN
  let p = LETTER_PC[L]
  for (const ch of name.slice(1)) p += ch === '#' ? 1 : ch === 'b' ? -1 : 0
  return ((p % 12) + 12) % 12
}

/** The note `semis` above `tonic`, written with the letter `steps` letters up (0 = the same letter). */
export function noteAt(tonic: string, steps: number, semis: number): string {
  const L0 = LETTERS.indexOf(tonic[0].toUpperCase() as typeof LETTERS[number])
  const letter = LETTERS[(L0 + steps) % 7]
  const want = (pcOf(tonic) + semis) % 12
  let d = want - LETTER_PC[LETTERS.indexOf(letter)]
  d = ((d + 18) % 12) - 6
  return letter + (ACC[d] ?? (d > 0 ? '#'.repeat(d) : 'b'.repeat(-d)))
}

/** A 7-note scale spelled from its tonic: one of each letter. */
export const spellScale = (tonic: string, semis = MAJOR_SEMIS) => semis.map((s, i) => noteAt(tonic, i, s))

/** Interval names by scale degree (major-scale based): '1', 'b2', '2', '#2', 'b3', '3', '4', '#4', 'b5', '5', '#5', 'b6', '6', 'bb7', 'b7', '7' */
export function interval(tonic: string, name: string): string {
  const m = /^(bb|b|#)?([1-7])$/.exec(name)
  if (!m) throw new Error(`interval ${name}`)
  const deg = Number(m[2]) - 1
  const shift = m[1] === 'bb' ? -2 : m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0
  return noteAt(tonic, deg, MAJOR_SEMIS[deg] + shift)
}

/** The seven chords of a key, with Roman numerals (major key: I ii iii IV V vi vii°; minor: i ii° III iv v VI VII). */
export function keyChords(tonic: string, minor = false): { numeral: string; chord: string; quality: '' | 'm' | 'dim' }[] {
  const notes = spellScale(tonic, minor ? NAT_MINOR_SEMIS : MAJOR_SEMIS)
  const q: ('' | 'm' | 'dim')[] = minor ? ['m', 'dim', '', 'm', 'm', '', ''] : ['', 'm', 'm', '', '', 'm', 'dim']
  const R = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
  return notes.map((n, i) => ({ numeral: q[i] === '' ? R[i] : q[i] === 'm' ? R[i].toLowerCase() : `${R[i].toLowerCase()}°`, chord: n + q[i], quality: q[i] }))
}

/** The relative minor of a major key (its 6th note), and the relative major of a minor key (its b3). */
export const relativeMinor = (major: string) => noteAt(major, 5, 9)
export const relativeMajor = (minor: string) => noteAt(minor, 2, 3)

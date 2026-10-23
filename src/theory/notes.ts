// Core note utilities shared by every screen.

export const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

/** The 12 keys as players usually name them. */
export const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export function pc(note: string): number {
  const m = /^([A-Ga-g])([#b]*)/.exec(note)
  if (!m) return 0
  let v = LETTER_PC[m[1].toUpperCase()]
  for (const ch of m[2]) v += ch === '#' ? 1 : -1
  return ((v % 12) + 12) % 12
}

export function midiToFreq(m: number, a4 = 440) {
  return a4 * Math.pow(2, (m - 69) / 12)
}
export function freqToMidi(f: number, a4 = 440) {
  return 69 + 12 * Math.log2(f / a4)
}
export function noteToMidi(n: string): number {
  const m = /^([A-Ga-g][#b]*)(-?\d+)$/.exec(n)
  if (!m) return 60
  return pc(m[1]) + 12 * (parseInt(m[2], 10) + 1)
}
export function midiName(m: number, flats = false) {
  const names = flats ? FLATS : SHARPS
  return names[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1)
}
/** Pitch-class name, spelled with flats in flat keys. */
export function pcName(p: number, preferFlats: boolean) {
  return (preferFlats ? FLATS : SHARPS)[((p % 12) + 12) % 12]
}
export function keyPrefersFlats(root: string, minor = false) {
  const flatMajor = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']
  const flatMinor = ['D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab']
  if (root.includes('b')) return true
  if (root.includes('#')) return false
  return minor ? flatMinor.includes(root) : flatMajor.includes(root)
}

/** Interval label from root (in semitones) as players read them. */
export const INTERVAL_LABELS = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7']

export interface Tuning {
  id: string
  name: string
  notes: string[] // low to high
}
export const TUNINGS: Tuning[] = [
  { id: 'standard', name: 'Standard', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { id: 'halfdown', name: 'Half step down', notes: ['D#2', 'G#2', 'C#3', 'F#3', 'A#3', 'D#4'] },
  { id: 'dropd', name: 'Drop D', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
  { id: 'dadgad', name: 'DADGAD', notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
  { id: 'openg', name: 'Open G', notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
  { id: 'opend', name: 'Open D', notes: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'] },
  { id: 'dropc', name: 'Drop C', notes: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'] },
]
export const STANDARD = TUNINGS[0]

/** Spell notes the way guitarists read them (Cb -> B, E# -> F, double accidentals simplified). */
export function friendly(n: string) {
  const map: Record<string, string> = { Cb: 'B', Fb: 'E', 'E#': 'F', 'B#': 'C' }
  if (map[n]) return map[n]
  if (/##|bb/.test(n)) return SHARPS[pc(n)]
  return n
}

export function stringMidis(t: Tuning) {
  return t.notes.map(noteToMidi)
}

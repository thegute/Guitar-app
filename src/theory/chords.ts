// Chord shapes from the open chords-db dataset (MIT), plus generated power chords.
import guitar from '@tombatossals/chords-db/lib/guitar.json'
import { pc, SHARPS } from './notes'

export interface Voicing {
  /** absolute fret per string, low E first; -1 = muted, 0 = open */
  frets: number[]
  fingers: number[]
  /** absolute fret numbers that are barred */
  barres: number[]
  baseFret: number
  midi: number[]
}

interface DbPosition {
  frets: number[]
  fingers: number[]
  baseFret: number
  barres: number[]
  midi: number[]
  capo?: boolean
}
interface DbChord {
  key: string
  suffix: string
  positions: DbPosition[]
}
const db = guitar as unknown as { chords: Record<string, DbChord[]>; suffixes: string[] }

const DB_KEY: Record<string, string> = {
  C: 'C', 'B#': 'C', 'C#': 'Csharp', Db: 'Csharp', D: 'D', 'D#': 'Eb', Eb: 'Eb', E: 'E', Fb: 'E',
  F: 'F', 'E#': 'F', 'F#': 'Fsharp', Gb: 'Fsharp', G: 'G', 'G#': 'Ab', Ab: 'Ab', A: 'A',
  'A#': 'Bb', Bb: 'Bb', B: 'B', Cb: 'B',
}

/** Chord types shown in the library, grouped the way players think about them. */
export const CHORD_GROUPS: { name: string; types: { suffix: string; label: string }[] }[] = [
  {
    name: 'Basic',
    types: [
      { suffix: 'major', label: 'Major' },
      { suffix: 'minor', label: 'Minor' },
      { suffix: '5', label: 'Power (5)' },
      { suffix: '7', label: '7' },
      { suffix: 'maj7', label: 'maj7' },
      { suffix: 'm7', label: 'm7' },
      { suffix: 'sus2', label: 'sus2' },
      { suffix: 'sus4', label: 'sus4' },
      { suffix: 'add9', label: 'add9' },
      { suffix: 'madd9', label: 'm(add9)' },
    ],
  },
  {
    name: 'Extended',
    types: [
      { suffix: '6', label: '6' },
      { suffix: 'm6', label: 'm6' },
      { suffix: '69', label: '6/9' },
      { suffix: 'm69', label: 'm6/9' },
      { suffix: '9', label: '9' },
      { suffix: 'maj9', label: 'maj9' },
      { suffix: 'm9', label: 'm9' },
      { suffix: '11', label: '11' },
      { suffix: 'm11', label: 'm11' },
      { suffix: 'maj11', label: 'maj11' },
      { suffix: '13', label: '13' },
      { suffix: 'maj13', label: 'maj13' },
      { suffix: '7sus4', label: '7sus4' },
    ],
  },
  {
    name: 'Tension',
    types: [
      { suffix: 'dim', label: 'dim' },
      { suffix: 'dim7', label: 'dim7' },
      { suffix: 'm7b5', label: 'm7b5 (ø)' },
      { suffix: 'aug', label: 'aug' },
      { suffix: 'aug7', label: '7#5' },
      { suffix: '7b5', label: '7b5' },
      { suffix: '7b9', label: '7b9' },
      { suffix: '7#9', label: '7#9' },
      { suffix: 'alt', label: 'alt' },
      { suffix: '9#11', label: '9#11' },
      { suffix: 'maj7#5', label: 'maj7#5' },
      { suffix: 'mmaj7', label: 'm(maj7)' },
    ],
  },
]

/** What each chord type is built from, for the info panel. */
export const SUFFIX_FORMULA: Record<string, string> = {
  major: 'R 3 5', minor: 'R b3 5', '5': 'R 5', '7': 'R 3 5 b7', maj7: 'R 3 5 7', m7: 'R b3 5 b7',
  sus2: 'R 2 5', sus4: 'R 4 5', add9: 'R 3 5 9', madd9: 'R b3 5 9', '6': 'R 3 5 6', m6: 'R b3 5 6',
  '69': 'R 3 5 6 9', m69: 'R b3 5 6 9', '9': 'R 3 5 b7 9', maj9: 'R 3 5 7 9', m9: 'R b3 5 b7 9',
  '11': 'R 5 b7 9 11', m11: 'R b3 5 b7 9 11', maj11: 'R 3 5 7 9 11', '13': 'R 3 5 b7 9 13',
  maj13: 'R 3 5 7 9 13', '7sus4': 'R 4 5 b7', dim: 'R b3 b5', dim7: 'R b3 b5 bb7',
  m7b5: 'R b3 b5 b7', aug: 'R 3 #5', aug7: 'R 3 #5 b7', '7b5': 'R 3 b5 b7', '7b9': 'R 3 5 b7 b9',
  '7#9': 'R 3 5 b7 #9', alt: 'R 3 b7 + altered 5/9', '9#11': 'R 3 5 b7 9 #11', 'maj7#5': 'R 3 #5 7',
  mmaj7: 'R b3 5 7',
}

export function suffixLabel(suffix: string) {
  for (const g of CHORD_GROUPS) for (const t of g.types) if (t.suffix === suffix) return t.label
  return suffix
}
/** Compact chord symbol, e.g. ("A","minor") -> "Am". */
export function chordSymbol(root: string, suffix: string) {
  const map: Record<string, string> = { major: '', minor: 'm', aug7: '7#5', mmaj7: 'm(maj7)', m7b5: 'm7b5', madd9: 'm(add9)' }
  return root + (suffix in map ? map[suffix] : suffix)
}

function powerChords(root: string): Voicing[] {
  const p = pc(root)
  const out: Voicing[] = []
  // root on low E (E=4) and on A (A=9)
  const f6 = (p - 4 + 12) % 12
  const f5 = (p - 9 + 12) % 12
  const mk = (s: 6 | 5, f: number): Voicing => {
    const frets = [-1, -1, -1, -1, -1, -1]
    const base = s === 6 ? 0 : 1
    frets[base] = f
    frets[base + 1] = f + 2
    frets[base + 2] = f + 2
    const open = s === 6 ? 40 : 45
    return {
      frets,
      fingers: frets.map((x, i) => (x < 0 ? 0 : i === base ? 1 : i === base + 1 ? 3 : 4)),
      barres: [],
      baseFret: Math.max(1, f),
      midi: [open + f, open + f + 7, open + f + 12],
    }
  }
  out.push(mk(6, f6), mk(5, f5))
  if (f6 + 12 <= 15) out.push(mk(6, f6 + 12))
  if (f5 + 12 <= 15) out.push(mk(5, f5 + 12))
  return out.sort((a, b) => a.baseFret - b.baseFret)
}

/** All voicings for a chord, absolute frets. */
export function voicings(root: string, suffix: string): Voicing[] {
  if (suffix === '5') return powerChords(root)
  const list = db.chords[DB_KEY[root] ?? root]
  const ch = list?.find(c => c.suffix === suffix)
  if (!ch) return []
  return ch.positions.map(p => {
    const abs = p.frets.map(f => (f <= 0 ? f : f + p.baseFret - 1))
    return {
      frets: abs,
      fingers: p.fingers,
      barres: p.barres.map(b => b + p.baseFret - 1),
      baseFret: p.baseFret,
      midi: p.midi,
    }
  })
}

/** Turn a symbol from the theory engine (e.g. "Bm7b5", "FMaj7", "G#dim") into root + library suffix. */
export function parseSymbol(sym: string): { root: string; suffix: string } {
  const m = /^([A-G][#b]?)(.*)$/.exec(sym.trim())
  if (!m) return { root: 'C', suffix: 'major' }
  const root = m[1]
  const t = m[2].replace(/\/.*$/, '')
  const map: Record<string, string> = {
    '': 'major', M: 'major', maj: 'major', m: 'minor', min: 'minor', '-': 'minor',
    Maj7: 'maj7', M7: 'maj7', maj7: 'maj7', '^7': 'maj7', m7: 'm7', '-7': 'm7', '7': '7',
    dim: 'dim', o: 'dim', dim7: 'dim7', o7: 'dim7', m7b5: 'm7b5', 'ø': 'm7b5', 'ø7': 'm7b5',
    aug: 'aug', '+': 'aug', '7#5': 'aug7', aug7: 'aug7', sus2: 'sus2', sus4: 'sus4', sus: 'sus4',
    '7sus4': '7sus4', '6': '6', m6: 'm6', '69': '69', '6/9': '69', m69: 'm69', '9': '9', m9: 'm9',
    Maj9: 'maj9', maj9: 'maj9', M9: 'maj9', '11': '11', m11: 'm11', '13': '13', Maj13: 'maj13',
    maj13: 'maj13', add9: 'add9', madd9: 'madd9', 'm(add9)': 'madd9', '7b9': '7b9', '7#9': '7#9',
    '7b5': '7b5', mMaj7: 'mmaj7', 'm(maj7)': 'mmaj7', '5': '5', alt: 'alt', '7alt': 'alt',
  }
  return { root, suffix: map[t] ?? 'major' }
}

/** Pick the most comfortable voicing near a fret (open chords first by default). */
export function bestVoicing(root: string, suffix: string, nearFret = 0): Voicing | null {
  const v = voicings(root, suffix)
  if (!v.length) return null
  return v.slice().sort((a, b) => Math.abs(a.baseFret - nearFret) - Math.abs(b.baseFret - nearFret))[0]
}

export function rootName(p: number) {
  return SHARPS[p]
}

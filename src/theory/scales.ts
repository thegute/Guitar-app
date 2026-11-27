import { Scale } from 'tonal'
import { pc, friendly, INTERVAL_LABELS, SHARPS, FLATS, keyPrefersFlats } from './notes'

export interface ScaleDef {
  id: string // tonal scale name or custom id
  label: string
  group: string
  feel: string
}

export const SCALES: ScaleDef[] = [
  { id: 'major pentatonic', label: 'Major pentatonic', group: 'Pentatonic & blues', feel: 'Bright, safe over major chords, country and pop leads' },
  { id: 'minor pentatonic', label: 'Minor pentatonic', group: 'Pentatonic & blues', feel: 'The rock and blues workhorse' },
  { id: 'minor blues', label: 'Blues (minor)', group: 'Pentatonic & blues', feel: 'Minor pentatonic plus the b5 blue note' },
  { id: 'major blues', label: 'Blues (major)', group: 'Pentatonic & blues', feel: 'Major pentatonic plus the b3 for a sweet-and-sour bend' },
  { id: 'minor hexatonic', label: 'Minor hexatonic (1 2 b3 4 5 b7)', group: 'Hexatonic (Melodic)', feel: 'Minor pentatonic + the singing 9th/2nd (drops the clashing b6) — lush rock ballads, neo-soul & fusion' },
  { id: 'hexatonic blues', label: 'Hexatonic blues (+ b5)', group: 'Hexatonic (Melodic)', feel: 'Minor hexatonic plus the gritty b5 blue note for soulful melodic lines' },
  { id: 'major hexatonic', label: 'Major hexatonic (1 2 3 4 5 6)', group: 'Hexatonic (Melodic)', feel: 'Sweet vocal major sound (major pentatonic + 4th, without the sharp 7th pull)' },
  { id: 'major', label: 'Major (Ionian)', group: 'Modes', feel: 'Happy, resolved' },
  { id: 'dorian', label: 'Dorian', group: 'Modes', feel: 'Minor with a hopeful 6th: funk, Santana, soul' },
  { id: 'phrygian', label: 'Phrygian', group: 'Modes', feel: 'Dark, Spanish flavour from the b2' },
  { id: 'lydian', label: 'Lydian', group: 'Modes', feel: 'Dreamy, floating #4' },
  { id: 'mixolydian', label: 'Mixolydian', group: 'Modes', feel: 'Major with a bluesy b7: rock and jam bands' },
  { id: 'aeolian', label: 'Natural minor (Aeolian)', group: 'Modes', feel: 'Sad, epic, most minor-key songs' },
  { id: 'locrian', label: 'Locrian', group: 'Modes', feel: 'Unstable, for half-diminished chords' },
  { id: 'harmonic minor', label: 'Harmonic minor', group: 'Minor colours', feel: 'Classical, neoclassical metal, strong pull to the root' },
  { id: 'melodic minor', label: 'Melodic minor', group: 'Minor colours', feel: 'Jazz minor, smooth and modern' },
  { id: 'phrygian dominant', label: 'Phrygian dominant', group: 'Minor colours', feel: 'Middle Eastern and flamenco, over the V7 in minor' },
  { id: 'altered', label: 'Altered', group: 'Jazz', feel: 'Maximum tension over altered dominant chords' },
  { id: 'lydian dominant', label: 'Lydian dominant', group: 'Jazz', feel: 'Over 7#11 and non-resolving dominants' },
  { id: 'bebop', label: 'Bebop dominant', group: 'Jazz', feel: 'Mixolydian with a passing major 7th' },
  { id: 'half-whole diminished', label: 'Diminished (half-whole)', group: 'Jazz', feel: 'Over 7b9 chords' },
  { id: 'whole tone', label: 'Whole tone', group: 'Jazz', feel: 'Floating, over 7#5 chords' },
  { id: 'hungarian minor', label: 'Hungarian minor', group: 'Exotic', feel: 'Dramatic, gypsy jazz and metal' },
  { id: 'double harmonic major', label: 'Double harmonic', group: 'Exotic', feel: 'Arabic and Byzantine sound' },
  { id: 'hirajoshi', label: 'Hirajoshi', group: 'Exotic', feel: 'Japanese pentatonic' },
]

/** Custom scales not directly named in tonal (semitones + guitarist interval labels). */
const CUSTOM_SCALES: Record<string, { semis: number[]; labels: string[] }> = {
  'minor hexatonic': { semis: [0, 2, 3, 5, 7, 10], labels: ['R', '2', 'b3', '4', '5', 'b7'] },
  'hexatonic blues': { semis: [0, 2, 3, 5, 6, 7, 10], labels: ['R', '2', 'b3', '4', 'b5', '5', 'b7'] },
  'major hexatonic': { semis: [0, 2, 4, 5, 7, 9], labels: ['R', '2', '3', '4', '5', '6'] },
}

/** Characteristic colour note(s) that give each scale/mode its signature emotional flavor. */
export interface ModeColorNote {
  semis: number[]
  label: string
  why: string
}

export const MODE_COLOR_NOTES: Record<string, ModeColorNote> = {
  'minor hexatonic': { semis: [2], label: '2 / 9th', why: 'The singing 9th turns basic minor pentatonic into vocal, emotional melodies.' },
  'hexatonic blues': { semis: [2, 6], label: '2 & b5', why: 'Blend the sweet 9th with the gritty b5 blue note.' },
  'major hexatonic': { semis: [5], label: '4th', why: 'Adds lyrical movement to major pentatonic without harsh half-step clashes.' },
  'minor blues': { semis: [6], label: 'b5 blue note', why: 'The signature blues tension note — bend or slide through it.' },
  'major blues': { semis: [3], label: 'b3 blue note', why: 'Slide or curl the b3 into the major 3rd for instant sweet-and-sour soul.' },
  'major': { semis: [4, 11], label: '3 & 7', why: 'Bright major 3rd and uplifting major 7th.' },
  'dorian': { semis: [9], label: 'Natural 6th', why: 'The bright major 6th over a minor chord gives Dorian its smooth Santana/fusion lift.' },
  'phrygian': { semis: [1], label: 'b2', why: 'A half-step above the root creates instant dark, Spanish/metal tension.' },
  'lydian': { semis: [6], label: '#4', why: 'The dreamy raised 4th makes Lydian float like a film score.' },
  'mixolydian': { semis: [10], label: 'b7', why: 'Major chord + bluesy b7 = classic rock, funk & jam-band attitude.' },
  'aeolian': { semis: [8], label: 'b6', why: 'The aching b6 gives natural minor its dramatic, emotional pull.' },
  'locrian': { semis: [1, 6], label: 'b2 & b5', why: 'Dark tritone (b5) and b2 over half-diminished chords.' },
  'harmonic minor': { semis: [11], label: 'Major 7th', why: 'Strong classical/neoclassical pull straight back into the minor root.' },
  'melodic minor': { semis: [9, 11], label: '6 & maj7', why: 'Sleek minor-major jazz/fusion color.' },
}

/** Roy Ziv's Pentatonic Trick: play a shifted Minor Pentatonic shape over the root to unlock instant modal colour! */
export interface PentatonicTrick {
  shiftSemis: number // semitones above the mode's root for the shifted minor pentatonic
  quality: 'minor' | 'major'
  tip: string
  colorNotes: string
}

export const PENTATONIC_TRICKS: Record<string, PentatonicTrick> = {
  'dorian': {
    shiftSemis: 2,
    quality: 'minor',
    tip: 'Play Minor Pentatonic 2 frets UP (a whole step above the root) to hit the 2nd, 4th, 6th & root effortlessly!',
    colorNotes: 'Highlights 2, 4, 6, 9',
  },
  'lydian': {
    shiftSemis: 11,
    quality: 'minor',
    tip: 'Play Minor Pentatonic 1 fret DOWN (on the maj7) to bring out the dreamy #4, 6th, 9th & maj7 automatically!',
    colorNotes: 'Highlights #4, 6, 7, 9',
  },
  'mixolydian': {
    shiftSemis: 7,
    quality: 'minor',
    tip: 'Play Minor Pentatonic on the 5th (7 frets up / 5 down) to highlight the bluesy b7, 9th & 4th over a dominant groove!',
    colorNotes: 'Highlights 5, b7, 9, 4',
  },
  'aeolian': {
    shiftSemis: 7,
    quality: 'minor',
    tip: 'Play Minor Pentatonic on the 5th (or Major Pentatonic on the b6) to weave the emotional 9th & b6 into minor solos!',
    colorNotes: 'Highlights 2/9, 4, 5, b6',
  },
  'major': {
    shiftSemis: 4,
    quality: 'minor',
    tip: 'Play Minor Pentatonic on the 3rd (4 frets up) for a sleek, vocal major-7th sound!',
    colorNotes: 'Highlights 3, 5, 6, 7, 9',
  },
  'minor hexatonic': {
    shiftSemis: 7,
    quality: 'minor',
    tip: 'Overlap Minor Pentatonic on the root with the 9th (2 frets up) — every box gets instant melodic vocal phrasing!',
    colorNotes: 'Highlights singing 9th + 4th + 5th',
  },
}

/** Nested triads & 7th arpeggios built purely from Minor Hexatonic (1 2 b3 4 5 b7) — Roy Ziv's Intermediate/Advanced secret! */
export interface NestedArpeggio {
  symbol: string
  roman: string
  rootPc: number
  pcs: number[]
  feel: string
}

export function hexatonicArpeggios(root: string): NestedArpeggio[] {
  const r = pc(root)
  const names = keyPrefersFlats(root) ? FLATS : SHARPS
  const nm = (offset: number) => names[(r + offset) % 12]
  return [
    { symbol: `${nm(0)}m7`, roman: 'i7', rootPc: r, pcs: [r, (r + 3) % 12, (r + 7) % 12, (r + 10) % 12], feel: 'Home minor 7th anchor' },
    { symbol: `${nm(3)}6`, roman: 'bIII6', rootPc: (r + 3) % 12, pcs: [(r + 3) % 12, (r + 7) % 12, (r + 10) % 12, r], feel: 'Warm major-6th lift' },
    { symbol: `${nm(7)}m7`, roman: 'v7', rootPc: (r + 7) % 12, pcs: [(r + 7) % 12, (r + 10) % 12, (r + 2) % 12, (r + 5) % 12], feel: 'Singing upper-structure 9th & 11th!' },
    { symbol: `${nm(10)}`, roman: 'bVII', rootPc: (r + 10) % 12, pcs: [(r + 10) % 12, (r + 2) % 12, (r + 5) % 12], feel: 'Heroic melodic triad highlighting the 9th!' },
  ]
}

/** Paul Davids' "B.B. King Box" — 5 magical notes on the top 3 strings centred around the root on the B string! */
export function bbKingBoxInfo(rootPc: number, tuning: number[]): { centerFret: number; match: (midi: number, s: number, f: number) => boolean } {
  // Find root on B string (string index n-2, typically 4 on 6-string guitar) between frets 5 and 15
  const n = tuning.length
  const bStr = Math.max(0, n - 2)
  const bOpen = tuning[bStr] ?? 59
  let centerFret = (rootPc - (bOpen % 12) + 12) % 12
  if (centerFret < 5) centerFret += 12
  // B.B. King box notes: root (0), 2 (2), b3 (3), 3 (4), 5 (7), 6 (9) on top 3 strings around centerFret - 1 .. centerFret + 3
  const allowedPcs = new Set([0, 2, 3, 4, 7, 9].map(o => (rootPc + o) % 12))
  return {
    centerFret,
    match: (midi, s, f) =>
      s >= Math.max(0, n - 3) &&
      f >= Math.max(1, centerFret - 1) &&
      f <= centerFret + 3 &&
      allowedPcs.has(((midi % 12) + 12) % 12),
  }
}

/** "minor pentatonic", "minor blues", "natural minor (aeolian)" … for running text */
export const scaleName = (id: string) => scaleById(id).label.toLowerCase().replace(/^blues \((minor|major)\)$/, '$1 blues')
export function scaleById(id: string) {
  return SCALES.find(s => s.id === id) ?? { id, label: id.replace(/^\w/, c => c.toUpperCase()), group: 'Other', feel: '' }
}

export interface ScaleInfo {
  notes: string[]
  pcs: number[]
  /** interval label per pitch class (relative to root) */
  labels: Map<number, string>
}

const SEMI_TO_DEGREE: Record<string, string> = {}

export function scaleInfo(root: string, id: string): ScaleInfo {
  const r = pc(root)
  const custom = CUSTOM_SCALES[id]
  if (custom) {
    const names = keyPrefersFlats(root) ? FLATS : SHARPS
    const pcs = custom.semis.map(o => (r + o) % 12)
    const notes = pcs.map(p => names[p])
    const labels = new Map<number, string>()
    pcs.forEach((p, i) => labels.set(p, custom.labels[i]))
    return { notes, pcs, labels }
  }
  const s = Scale.get(`${root} ${id}`)
  const notes = (s.notes.length ? s.notes : Scale.get(`C ${id}`).notes).map(friendly)
  const pcs = notes.map(pc)
  const labels = new Map<number, string>()
  s.intervals.forEach((iv, i) => {
    labels.set(pcs[i], intervalLabel(iv, (pcs[i] - r + 12) % 12))
  })
  return { notes, pcs, labels }
}

/** Turn tonal interval names ("3M", "5d", "4A") into guitarist labels (3, b5, #4). */
export function intervalLabel(iv: string, semis: number): string {
  if (SEMI_TO_DEGREE[iv]) return SEMI_TO_DEGREE[iv]
  const m = /^(\d+)([PMmdA]+)$/.exec(iv)
  if (!m) return INTERVAL_LABELS[semis]
  const num = parseInt(m[1], 10)
  const q = m[2]
  const deg = num === 1 || num === 8 ? 'R' : String(((num - 1) % 7) + 1)
  if (deg === 'R') return 'R'
  const perfect = ['1', '4', '5'].includes(deg)
  let acc = ''
  if (q === 'm') acc = 'b'
  else if (q === 'd') acc = perfect ? 'b' : 'bb'
  else if (q === 'A') acc = '#'
  else if (q === 'dd') acc = 'bb'
  return acc + deg
}

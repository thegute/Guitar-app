import { Scale } from 'tonal'
import { pc, friendly, INTERVAL_LABELS } from './notes'

export interface ScaleDef {
  id: string // tonal scale name
  label: string
  group: string
  feel: string
}

export const SCALES: ScaleDef[] = [
  { id: 'major pentatonic', label: 'Major pentatonic', group: 'Pentatonic & blues', feel: 'Bright, safe over major chords, country and pop leads' },
  { id: 'minor pentatonic', label: 'Minor pentatonic', group: 'Pentatonic & blues', feel: 'The rock and blues workhorse' },
  { id: 'minor blues', label: 'Blues (minor)', group: 'Pentatonic & blues', feel: 'Minor pentatonic plus the b5 blue note' },
  { id: 'major blues', label: 'Blues (major)', group: 'Pentatonic & blues', feel: 'Major pentatonic plus the b3 for a sweet-and-sour bend' },
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
  const s = Scale.get(`${root} ${id}`)
  const notes = (s.notes.length ? s.notes : Scale.get(`C ${id}`).notes).map(friendly)
  const r = pc(root)
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

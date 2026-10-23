// Chord-progression engine: famous progressions, a theory-driven randomizer,
// and scale recommendations for the whole progression and for each chord.
import { Chord, Note } from 'tonal'
import { pc, keyPrefersFlats, FLATS, SHARPS } from './notes'

export type ModeId = 'major' | 'minor' | 'dorian' | 'mixolydian' | 'phrygian' | 'lydian' | 'harmonic'
export type Flavor = 'triads' | 'sevenths' | 'extended'
export type Style = 'any' | 'pop' | 'rock' | 'blues' | 'jazz' | 'folk' | 'sad' | 'epic' | 'funk' | 'latin'

export const MODES: { id: ModeId; label: string; scale: string }[] = [
  { id: 'major', label: 'Major', scale: 'major' },
  { id: 'minor', label: 'Minor', scale: 'aeolian' },
  { id: 'dorian', label: 'Dorian', scale: 'dorian' },
  { id: 'mixolydian', label: 'Mixolydian', scale: 'mixolydian' },
  { id: 'phrygian', label: 'Phrygian', scale: 'phrygian' },
  { id: 'lydian', label: 'Lydian', scale: 'lydian' },
  { id: 'harmonic', label: 'Harmonic minor', scale: 'harmonic minor' },
]

export const STYLES: { id: Style; label: string }[] = [
  { id: 'any', label: 'Anything' },
  { id: 'pop', label: 'Pop' },
  { id: 'rock', label: 'Rock' },
  { id: 'blues', label: 'Blues' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'folk', label: 'Folk / country' },
  { id: 'sad', label: 'Sad' },
  { id: 'epic', label: 'Epic' },
  { id: 'funk', label: 'Funk / soul' },
  { id: 'latin', label: 'Latin / flamenco' },
]

/**
 * A chord written relative to the key: semitones above the tonic + chord type.
 * Types: '' major, 'm' minor, 'dim', '7', 'maj7', 'm7', 'm7b5', 'dim7', '9', 'm9', 'maj9', '6', 'sus4', 'sus2', '13', 'm11', 'add9', '7b9'
 */
export interface RelChord {
  semi: number
  type: string
}
export interface ProgChord extends RelChord {
  symbol: string // e.g. "Am7"
  root: string // e.g. "A"
  roman: string // e.g. "vi7"
  borrowed?: boolean
}

// ---------- diatonic harmony ----------
const MODE_STEPS: Record<ModeId, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
}

function qualityFromSemis(third: number, fifth: number, seventh?: number): string {
  const tri = third === 4 && fifth === 7 ? '' : third === 3 && fifth === 7 ? 'm' : third === 3 && fifth === 6 ? 'dim' : third === 4 && fifth === 8 ? 'aug' : ''
  if (seventh === undefined) return tri
  if (tri === '' && seventh === 11) return 'maj7'
  if (tri === '' && seventh === 10) return '7'
  if (tri === 'm' && seventh === 10) return 'm7'
  if (tri === 'm' && seventh === 11) return 'mmaj7'
  if (tri === 'dim' && seventh === 10) return 'm7b5'
  if (tri === 'dim' && seventh === 9) return 'dim7'
  if (tri === 'aug') return 'maj7#5'
  return tri
}

/** Diatonic chord on scale degree (0-based) of a mode. */
export function diatonic(mode: ModeId, degree: number, sevenths: boolean): RelChord {
  const s = MODE_STEPS[mode]
  const at = (i: number) => (s[(degree + i) % 7] - s[degree] + 12) % 12
  return { semi: s[degree], type: qualityFromSemis(at(2), at(4), sevenths ? at(6) : undefined) }
}

// ---------- roman numerals ----------
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
function romanFor(mode: ModeId, c: RelChord): string {
  // find the degree whose step matches; otherwise label with b/# relative to major
  const steps = MODE_STEPS[mode]
  let deg = steps.indexOf(c.semi)
  let acc = ''
  if (deg < 0) {
    const maj = MODE_STEPS.major
    deg = maj.indexOf(c.semi)
    if (deg < 0) {
      deg = maj.indexOf(c.semi + 1)
      acc = 'b'
      if (deg < 0) {
        deg = maj.indexOf(c.semi - 1)
        acc = '#'
      }
    }
  } else {
    // write chromatic alterations relative to major so "bVII" reads correctly in minor keys
    const majStep = MODE_STEPS.major[deg]
    if (majStep - c.semi === 1) acc = 'b'
    else if (c.semi - majStep === 1) acc = '#'
  }
  const minorish = /^(m|dim|m7b5|dim7)/.test(c.type) && !c.type.startsWith('maj')
  let n = NUMERALS[Math.max(0, deg)]
  if (minorish) n = n.toLowerCase()
  const suffix =
    c.type === 'dim' ? '°' : c.type === 'dim7' ? '°7' : c.type === 'm7b5' ? 'ø7' : c.type === 'm' ? '' : c.type.replace(/^m(?!aj)/, '')
  return acc + n + suffix
}

function spell(tonic: string, mode: ModeId, c: RelChord): ProgChord {
  const flats = keyPrefersFlats(tonic, ['minor', 'dorian', 'phrygian', 'harmonic'].includes(mode))
  const p = (pc(tonic) + c.semi) % 12
  const root = (flats ? FLATS : SHARPS)[p]
  const type = c.type
  const symbol = root + type
  const inMode = isDiatonic(mode, c)
  return { ...c, root, symbol, roman: romanFor(mode, c), borrowed: !inMode }
}

function isDiatonic(mode: ModeId, c: RelChord): boolean {
  const steps = MODE_STEPS[mode]
  const deg = steps.indexOf(c.semi)
  if (deg < 0) return false
  const tri = diatonic(mode, deg, false).type
  const sev = diatonic(mode, deg, true).type
  const base = c.type
  if (base === tri || base === sev) return true
  // colour tones that keep the chord's function
  const ext: Record<string, string[]> = {
    '': ['6', 'add9', 'sus2', 'sus4', 'maj9', '69', 'maj7'],
    m: ['m9', 'm11', 'm6', 'm7', 'sus2', 'sus4', 'madd9'],
    dim: ['m7b5', 'dim7'],
  }
  if (tri === '' && sev === '7' && ['9', '13', '7sus4', 'sus4', '6', 'add9'].includes(base)) return true
  return (ext[tri] ?? []).includes(base)
}

// ---------- famous progressions ----------
interface Template {
  name: string
  modes: ModeId[]
  styles: Style[]
  chords: [number, string][] // [semitones from tonic, type]
  note?: string
}
const T = (name: string, modes: ModeId[], styles: Style[], chords: [number, string][], note?: string): Template => ({ name, modes, styles, chords, note })

export const TEMPLATES: Template[] = [
  T('Four-chord pop (I–V–vi–IV)', ['major'], ['pop', 'rock', 'any'], [[0, ''], [7, ''], [9, 'm'], [5, '']], 'Countless hits use this loop.'),
  T('Sensitive (vi–IV–I–V)', ['major'], ['pop', 'sad', 'epic'], [[9, 'm'], [5, ''], [0, ''], [7, '']]),
  T('Three-chord rock (I–IV–V)', ['major'], ['rock', 'folk', 'blues'], [[0, ''], [5, ''], [7, ''], [5, '']]),
  T("'50s doo-wop (I–vi–IV–V)", ['major'], ['pop', 'folk'], [[0, ''], [9, 'm'], [5, ''], [7, '']]),
  T('Royal road (IV–V–iii–vi)', ['major'], ['pop', 'epic'], [[5, 'maj7'], [7, '7'], [4, 'm7'], [9, 'm']], 'A staple of J-pop and anime themes.'),
  T('Canon (I–V–vi–iii–IV–I–IV–V)', ['major'], ['pop', 'folk', 'epic'], [[0, ''], [7, ''], [9, 'm'], [4, 'm'], [5, ''], [0, ''], [5, ''], [7, '']]),
  T('Jazz ii–V–I', ['major'], ['jazz'], [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']]),
  T('Jazz turnaround (I–vi–ii–V)', ['major'], ['jazz', 'pop'], [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7']]),
  T('Rhythm changes A (I–VI7–ii–V)', ['major'], ['jazz'], [[0, 'maj7'], [9, '7'], [2, 'm7'], [7, '7']]),
  T('Mixolydian rock (I–bVII–IV–I)', ['mixolydian', 'major'], ['rock', 'folk'], [[0, ''], [10, ''], [5, ''], [0, '']], 'The bVII gives that classic-rock swagger.'),
  T('Plagal rock (I–IV–I–bVII)', ['mixolydian'], ['rock'], [[0, ''], [5, ''], [0, ''], [10, '']]),
  T('Aeolian rock (i–bVII–bVI–bVII)', ['minor'], ['rock', 'epic'], [[0, 'm'], [10, ''], [8, ''], [10, '']]),
  T('Epic minor (i–bVI–bIII–bVII)', ['minor'], ['epic', 'sad', 'pop'], [[0, 'm'], [8, ''], [3, ''], [10, '']]),
  T('Andalusian cadence (i–bVII–bVI–V)', ['minor', 'harmonic', 'phrygian'], ['latin', 'epic', 'rock'], [[0, 'm'], [10, ''], [8, ''], [7, '']], 'Flamenco and surf rock descend this way.'),
  T('Minor ii–V–i', ['minor', 'harmonic'], ['jazz', 'sad'], [[2, 'm7b5'], [7, '7'], [0, 'm7'], [0, 'm7']]),
  T('Minor blues-rock (i–iv–v)', ['minor'], ['blues', 'rock', 'sad'], [[0, 'm'], [5, 'm'], [7, 'm'], [0, 'm']]),
  T('Dorian vamp (i–IV)', ['dorian'], ['funk', 'rock', 'latin'], [[0, 'm7'], [5, '7'], [0, 'm7'], [5, '7']], 'Think "Oye Como Va" and "Evil Ways".'),
  T('Dorian soul (i–ii)', ['dorian'], ['funk', 'jazz'], [[0, 'm9'], [2, 'm7'], [0, 'm9'], [2, 'm7']]),
  T('Phrygian riff (i–bII)', ['phrygian'], ['latin', 'epic', 'rock'], [[0, 'm'], [1, ''], [0, 'm'], [1, '']], 'Metal and flamenco love the half-step b2.'),
  T('Lydian float (I–II)', ['lydian'], ['epic', 'pop'], [[0, ''], [2, ''], [0, 'maj7'], [2, '']], 'Film scores use this for wonder.'),
  T('Sad borrowed iv (I–IV–iv–I)', ['major'], ['sad', 'pop', 'folk'], [[0, ''], [5, ''], [5, 'm'], [0, '']], 'The minor iv is the bittersweet chord.'),
  T('Folk (I–IV–I–V)', ['major'], ['folk'], [[0, ''], [5, ''], [0, ''], [7, '']]),
  T('Country (I–V–IV–I with II)', ['major'], ['folk'], [[0, ''], [2, ''], [5, ''], [0, '']]),
  T('Funk vamp (I7–IV7)', ['mixolydian'], ['funk', 'blues'], [[0, '9'], [5, '9'], [0, '9'], [5, '9']]),
  T('Harmonic minor drama (i–iv–V–i)', ['harmonic', 'minor'], ['epic', 'latin', 'sad'], [[0, 'm'], [5, 'm'], [7, '7'], [0, 'm']]),
  T('Hopeful minor (vi–IV–V–I)', ['major'], ['pop', 'epic'], [[9, 'm'], [5, ''], [7, ''], [0, '']]),
  T('Axis creep (I–iii–IV–iv)', ['major'], ['sad', 'pop', 'rock'], [[0, ''], [4, 'm'], [5, ''], [5, 'm']]),
]

export const BLUES_12: [number, string][] = [
  [0, '7'], [5, '7'], [0, '7'], [0, '7'],
  [5, '7'], [5, '7'], [0, '7'], [0, '7'],
  [7, '7'], [5, '7'], [0, '7'], [7, '7'],
]
export const MINOR_BLUES_12: [number, string][] = [
  [0, 'm7'], [5, 'm7'], [0, 'm7'], [0, 'm7'],
  [5, 'm7'], [5, 'm7'], [0, 'm7'], [0, 'm7'],
  [8, '7'], [7, '7'], [0, 'm7'], [7, '7'],
]

export interface Suggestion {
  name: string
  note?: string
  chords: ProgChord[]
}

export function suggestions(tonic: string, mode: ModeId, style: Style, flavor: Flavor): Suggestion[] {
  const out: Suggestion[] = []
  const fit = TEMPLATES.filter(t => t.modes.includes(mode) && (style === 'any' || t.styles.includes(style)))
  const loose = TEMPLATES.filter(t => t.modes.includes(mode) && !fit.includes(t))
  for (const t of [...fit, ...loose].slice(0, 10)) {
    out.push({ name: t.name, note: t.note, chords: t.chords.map(([s, ty]) => spell(tonic, mode, applyFlavor({ semi: s, type: ty }, flavor, mode))) })
  }
  if (style === 'blues' || style === 'any' || style === 'rock') {
    const twelve = mode === 'minor' || mode === 'dorian' ? MINOR_BLUES_12 : BLUES_12
    out.unshift({
      name: mode === 'minor' || mode === 'dorian' ? '12-bar minor blues' : '12-bar blues',
      note: 'One chord per bar. The backbone of blues, rock and roll and jam sessions.',
      chords: twelve.map(([s, ty]) => spell(tonic, mode, { semi: s, type: ty })),
    })
  }
  return out
}

// ---------- flavour (triads / sevenths / extended) ----------
function applyFlavor(c: RelChord, flavor: Flavor, mode: ModeId): RelChord {
  const tri = c.type
  if (flavor === 'triads') {
    if (['maj7', '6', 'add9', 'maj9', '69'].includes(tri)) return { ...c, type: '' }
    if (['m7', 'm9', 'm11', 'm6', 'madd9'].includes(tri)) return { ...c, type: 'm' }
    if (['9', '13'].includes(tri)) return { ...c, type: '7' }
    return c
  }
  // the 7th quality a chord would naturally take
  const seventhOf = (): string => {
    const steps = MODE_STEPS[mode]
    const deg = steps.indexOf(c.semi)
    if (deg >= 0) {
      const d = diatonic(mode, deg, false).type
      if (d === tri) return diatonic(mode, deg, true).type
    }
    if (tri === '') return c.semi === 7 || c.semi === 2 || c.semi === 4 || c.semi === 9 ? '7' : 'maj7'
    if (tri === 'm') return 'm7'
    if (tri === 'dim') return 'm7b5'
    return tri
  }
  let t = ['', 'm', 'dim'].includes(tri) ? seventhOf() : tri
  if (flavor === 'extended') {
    const ext: Record<string, string> = { maj7: 'maj9', m7: 'm9', '7': '9', m7b5: 'm7b5', '': 'add9', m: 'm9' }
    t = ext[t] ?? t
  }
  return { ...c, type: t }
}

// ---------- randomizer ----------
type Fn = 'T' | 'S' | 'D'
interface Cand {
  c: RelChord
  fn: Fn
  weight: number
  borrowed?: boolean
}

/** The chord palette for a mode: diatonic chords with harmonic function, plus tasteful borrowed chords. */
function palette(mode: ModeId, style: Style, spice: number): Cand[] {
  const d = (deg: number, fn: Fn, w: number): Cand => ({ c: diatonic(mode, deg, false), fn, weight: w })
  const b = (semi: number, type: string, fn: Fn, w: number): Cand => ({ c: { semi, type }, fn, weight: w * spice, borrowed: true })
  let p: Cand[]
  switch (mode) {
    case 'major':
      p = [d(0, 'T', 3), d(1, 'S', 1.6), d(2, 'T', 0.8), d(3, 'S', 2.6), d(4, 'D', 2.6), d(5, 'T', 2.2), d(6, 'D', 0.25),
        b(10, '', 'S', 1.0), b(5, 'm', 'S', 0.9), b(8, '', 'S', 0.7), b(2, '', 'D', 0.6), b(4, '', 'D', 0.4), b(3, '', 'S', 0.35)]
      break
    case 'minor':
      p = [d(0, 'T', 3), d(2, 'T', 1.6), d(3, 'S', 2.2), d(4, 'D', 1.0), d(5, 'S', 2.4), d(6, 'D', 2.2), d(1, 'S', 0.3),
        b(7, '', 'D', 1.3), b(7, '7', 'D', 0.6), b(5, '', 'S', 0.5), b(1, '', 'S', 0.4)]
      break
    case 'dorian':
      p = [d(0, 'T', 3), d(1, 'S', 1.6), d(2, 'T', 1.0), d(3, 'S', 2.8), d(4, 'D', 1.4), d(6, 'D', 1.6), d(5, 'S', 0.3),
        b(8, '', 'S', 0.5), b(7, '', 'D', 0.4)]
      break
    case 'mixolydian':
      p = [d(0, 'T', 3), d(3, 'S', 2.6), d(6, 'D', 2.6), d(4, 'D', 1.0), d(1, 'S', 1.2), d(5, 'T', 0.8), d(2, 'S', 0.2),
        b(7, '', 'D', 0.7), b(8, '', 'S', 0.4)]
      break
    case 'phrygian':
      p = [d(0, 'T', 3), d(1, 'S', 2.8), d(2, 'T', 1.2), d(6, 'D', 2.0), d(3, 'S', 1.6), d(5, 'S', 1.4), b(7, '', 'D', 0.8)]
      break
    case 'lydian':
      p = [d(0, 'T', 3), d(1, 'S', 2.8), d(4, 'D', 1.4), d(6, 'T', 1.0), d(2, 'T', 1.0), d(5, 'T', 1.0), b(10, '', 'S', 0.4)]
      break
    case 'harmonic':
      p = [d(0, 'T', 3), d(3, 'S', 2.4), d(4, 'D', 2.8), d(5, 'S', 2.0), d(1, 'S', 1.2), d(2, 'T', 0.4), d(6, 'D', 0.6),
        b(10, '', 'D', 0.6), b(3, '', 'T', 0.6)]
      break
  }
  // style colouring
  for (const k of p) {
    const s = k.c.semi
    if (style === 'rock' && (s === 10 || s === 8 || s === 5)) k.weight *= 1.4
    if (style === 'sad' && (k.c.type === 'm' || (k.borrowed && s === 5))) k.weight *= 1.4
    if (style === 'epic' && (s === 8 || s === 10 || s === 3)) k.weight *= 1.5
    if (style === 'pop' && k.borrowed) k.weight *= 0.6
    if (style === 'jazz' && (s === 2 || s === 7 || s === 9)) k.weight *= 1.5
    if (style === 'folk' && k.borrowed) k.weight *= 0.4
    if (style === 'latin' && (s === 7 || s === 8 || s === 1)) k.weight *= 1.4
    if (style === 'blues' && ['', '7'].includes(k.c.type) && [0, 5, 7, 10].includes(s)) k.weight *= 1.6
    if (style === 'funk' && [0, 5, 10, 2].includes(s)) k.weight *= 1.3
    if (k.c.type === 'dim') k.weight *= 0.5
  }
  return p.filter(k => k.weight > 0.01)
}

// How strongly one function pulls to the next (tonic -> subdominant -> dominant -> tonic).
const FN_FLOW: Record<Fn, Record<Fn, number>> = {
  T: { T: 0.7, S: 1.6, D: 1.1 },
  S: { T: 0.9, S: 0.6, D: 1.7 },
  D: { T: 2.2, S: 0.6, D: 0.35 },
}

const TYPE_TONES = new Map<string, number[]>()
function typeTones(type: string): number[] {
  let t = TYPE_TONES.get(type)
  if (!t) {
    t = Chord.get('C' + type).intervals.map(iv => Note.chroma(Note.transpose('C', iv)) ?? 0)
    TYPE_TONES.set(type, t)
  }
  return t
}
function commonTones(a: RelChord, b: RelChord) {
  let n = 0
  const A = typeTones(a.type).map(x => (x + a.semi) % 12)
  for (const x of typeTones(b.type)) if (A.includes((x + b.semi) % 12)) n++
  return n
}

function rootMotionScore(a: RelChord, b: RelChord) {
  const d = (b.semi - a.semi + 12) % 12
  // strong root motion: down a fifth / up a fourth (5), down a third (8/9), up a step (2)
  return ({ 5: 1.5, 7: 1.15, 8: 1.15, 9: 1.15, 2: 1.1, 10: 1.1, 3: 0.95, 4: 0.95, 1: 0.8, 11: 0.8, 6: 0.5, 0: 0.2 } as Record<number, number>)[d] ?? 1
}

function transition(a: Cand, b: Cand) {
  if (a.c.semi === b.c.semi && a.c.type === b.c.type) return 0.05
  return FN_FLOW[a.fn][b.fn] * rootMotionScore(a.c, b.c) * (1 + 0.15 * commonTones(a.c, b.c)) * b.weight
}

function pick<T>(items: T[], weights: number[], rnd: () => number) {
  const total = weights.reduce((x, y) => x + y, 0)
  let r = rnd() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

export interface RandomOpts {
  tonic: string
  mode: ModeId
  style: Style
  flavor: Flavor
  length: 4 | 8
  /** 0 = only diatonic chords, 1 = normal, 2 = adventurous */
  spice: number
  /** chords to keep in place (index -> chord) */
  locked?: (RelChord | null)[]
  seed?: number
  /** a progression key to avoid repeating (semi+type joined by commas) */
  avoid?: string
}

function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 1_000_000) / 1_000_000
  }
}

/**
 * Generate many candidate progressions by walking the harmonic-function graph,
 * score them for strong motion, smooth voice leading, variety and a loop that
 * resolves back home, then pick one of the best at random.
 */
export function randomProgression(o: RandomOpts): ProgChord[] {
  const rnd = rng(o.seed ?? Math.floor(Math.random() * 1e9))
  const pal = palette(o.mode, o.style, o.spice <= 0 ? 0 : o.spice === 1 ? 1 : 1.8)
  const tonicCand = pal.find(k => k.c.semi === 0 && k.fn === 'T')!
  const locked = o.locked ?? []
  const find = (rc: RelChord) => pal.find(k => k.c.semi === rc.semi && k.c.type.replace(/7|9|maj|6|add|sus\d|11|13/g, '') === rc.type.replace(/7|9|maj|6|add|sus\d|11|13/g, '')) ?? { c: rc, fn: 'S' as Fn, weight: 1 }

  const scored: { seq: Cand[]; score: number }[] = []
  for (let trial = 0; trial < 500; trial++) {
    const seq: Cand[] = []
    for (let i = 0; i < o.length; i++) {
      const lk = locked[i]
      if (lk) {
        seq.push(find(lk))
        continue
      }
      if (i === 0) {
        // mostly start at home; pop sometimes starts on vi, epic on bVI
        const starts = pal.filter(k => k.c.semi === 0 || (o.style === 'pop' && k.c.semi === 9) || (o.style === 'epic' && k.c.semi === 8) || (o.style === 'sad' && k.c.semi === 9))
        seq.push(pick(starts, starts.map(k => (k.c.semi === 0 ? 3 : 1)), rnd))
        continue
      }
      const prev = seq[i - 1]
      const opts = pal.filter(k => !(k.c.semi === prev.c.semi && k.c.type === prev.c.type))
      seq.push(pick(opts, opts.map(k => transition(prev, k)), rnd))
    }
    // score
    let s = 0
    for (let i = 1; i < seq.length; i++) s += Math.log(transition(seq[i - 1], seq[i]) + 1e-3)
    const loop = transition(seq[seq.length - 1], seq[0])
    s += 1.5 * Math.log(loop + 1e-3)
    const distinct = new Set(seq.map(k => k.c.semi + k.c.type)).size
    s += distinct >= 3 ? 1.2 : -3
    if (o.length === 8 && distinct < 4) s -= 1.5
    if (!seq.some(k => k.fn === 'D') && o.mode !== 'dorian' && o.mode !== 'lydian') s -= 0.8
    const borrowed = seq.filter(k => k.borrowed).length
    if (o.spice === 0 && borrowed) s -= 10
    if (borrowed > (o.length === 8 ? 2 : 1)) s -= 2
    if (seq[0] !== tonicCand && seq.includes(tonicCand) === false) s -= 1.5
    // avoid A-B-A-B unless 4 bars
    if (o.length === 8 && seq.slice(0, 4).every((k, i) => k === seq[i + 4])) s -= 0.5
    scored.push({ seq, score: s })
  }
  // keep each distinct progression once, then pick among the good ones with a soft preference for the best
  const uniq = new Map<string, { seq: Cand[]; score: number }>()
  for (const c of scored) {
    const k = c.seq.map(x => x.c.semi + x.c.type).join(',')
    if (k === o.avoid) continue
    const prev = uniq.get(k)
    if (!prev || prev.score < c.score) uniq.set(k, c)
  }
  const pool = [...uniq.values()].sort((a, b) => b.score - a.score).slice(0, 60)
  const best = pool[0]?.score ?? 0
  const chosen = (pool.length ? pick(pool, pool.map(c => Math.exp((c.score - best) / 1.6)), rnd) : scored[0]).seq
  return chosen.map((k, i) => {
    const lk = locked[i]
    const c = lk ?? applyFlavor(k.c, o.flavor, o.mode)
    const pcd = spell(o.tonic, o.mode, c)
    return { ...pcd, borrowed: pcd.borrowed || !!k.borrowed }
  })
}

// ---------- scales for a progression ----------
export interface ScaleTip {
  root: string
  scale: string // tonal id
  why: string
}

export function scalesForProgression(tonic: string, mode: ModeId, chords: ProgChord[], style: Style): ScaleTip[] {
  const tips: ScaleTip[] = []
  const modeScale = MODES.find(m => m.id === mode)!.scale
  const flats = keyPrefersFlats(tonic, mode !== 'major' && mode !== 'mixolydian' && mode !== 'lydian')
  const name = (semi: number) => (flats ? FLATS : SHARPS)[(pc(tonic) + semi) % 12]
  const allBlues = chords.length > 0 && chords.every(c => c.type === '7' || c.type === '9')
  const minorish = ['minor', 'dorian', 'phrygian', 'harmonic'].includes(mode)
  tips.push({ root: tonic, scale: modeScale, why: 'Every note fits every diatonic chord. Your home base.' })
  if (minorish) {
    tips.push({ root: tonic, scale: 'minor pentatonic', why: 'Five safe notes with no clashes, great for riffs and solos.' })
    if (style === 'blues' || style === 'rock') tips.push({ root: tonic, scale: 'minor blues', why: 'Adds the b5 blue note for grit.' })
  } else {
    tips.push({ root: tonic, scale: 'major pentatonic', why: 'Five sweet, safe notes. Bends sound great.' })
    tips.push({ root: name(9), scale: 'minor pentatonic', why: `The relative minor pentatonic: same notes as ${tonic} major pentatonic, different home.` })
  }
  if (allBlues || style === 'blues') {
    tips.push({ root: tonic, scale: 'minor blues', why: 'Over dominant 7 blues changes, the minor blues sound is the classic choice.' })
    tips.push({ root: tonic, scale: 'mixolydian', why: 'Follows the 7th chords for a jazzier, more melodic sound.' })
  }
  if (chords.some(c => c.semi === 7 && (c.type === '' || c.type.startsWith('7')) && minorish)) {
    tips.push({ root: tonic, scale: 'harmonic minor', why: 'The major V chord in a minor key wants the raised 7th; use this over that chord.' })
  }
  if (mode === 'dorian') tips.push({ root: tonic, scale: 'dorian', why: 'Lean on the natural 6th: it is the Dorian sound.' })
  if (mode === 'mixolydian') tips.push({ root: tonic, scale: 'mixolydian', why: 'Hit the b7 over the I chord.' })
  // unique by root+scale
  const seen = new Set<string>()
  return tips.filter(t => (seen.has(t.root + t.scale) ? false : (seen.add(t.root + t.scale), true)))
}

/** Best scale over one chord in the context of the key (chord-scale theory). */
export function scaleForChord(tonic: string, mode: ModeId, c: ProgChord): ScaleTip {
  if (mode === 'harmonic') {
    if (c.semi === 0 && c.type.startsWith('m')) return { root: c.root, scale: 'harmonic minor', why: `Home chord: ${c.root} harmonic minor, with its raised 7th leading back to the root.` }
    if (c.semi === 7 && !c.type.startsWith('m')) return { root: c.root, scale: 'phrygian dominant', why: `The V chord: ${c.root} phrygian dominant matches the key's raised 7th.` }
    mode = 'minor'
  }
  if (['minor', 'dorian', 'phrygian'].includes(mode) && c.semi === 7 && !c.type.startsWith('m') && !c.type.startsWith('dim'))
    return { root: c.root, scale: 'phrygian dominant', why: `A major V chord in a minor key: ${c.root} phrygian dominant hits its raised 7th, the note that pulls home.` }
  const steps = MODE_STEPS[mode]
  const deg = steps.indexOf(c.semi)
  const modeNames = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian']
  if (deg >= 0 && isDiatonic(mode, c)) {
    // rotate the parent major scale to land on this degree
    const parentOffset: Record<ModeId, number> = { major: 0, dorian: 1, phrygian: 2, lydian: 3, mixolydian: 4, minor: 5, harmonic: 5 }
    const idx = (parentOffset[mode] + deg) % 7
    const m = modeNames[idx] === 'ionian' ? 'major' : modeNames[idx]
    return { root: c.root, scale: m, why: `Chord ${c.roman}: play ${c.root} ${m}, which uses the same notes as the key.` }
  }
  // borrowed / altered chords: ask tonal for compatible scales
  const options = Chord.chordScales(c.symbol.replace('maj7', 'maj7'))
  const pref = ['mixolydian', 'lydian dominant', 'major', 'dorian', 'aeolian', 'phrygian dominant', 'locrian', 'altered', 'lydian', 'minor pentatonic', 'major pentatonic']
  const best = pref.find(p => options.includes(p)) ?? options[0] ?? (c.type.startsWith('m') ? 'dorian' : 'mixolydian')
  return { root: c.root, scale: best, why: `${c.roman} is borrowed from outside the key, so switch to ${c.root} ${best} while it plays.` }
}

/** Chord tones as pitch classes (for highlighting targets on the fretboard). */
export function chordPcs(symbol: string): number[] {
  const ch = Chord.get(symbol)
  if (ch.empty) return []
  return ch.notes.map(n => Note.chroma(n) ?? 0)
}


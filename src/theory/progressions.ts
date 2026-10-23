// Chord-progression engine: famous progressions, a theory-driven randomizer with many options,
// and scale recommendations for the whole progression and for each chord.
import { Chord, Note } from 'tonal'
import { pc, keyPrefersFlats, FLATS, SHARPS } from './notes'

export type ModeId = 'major' | 'minor' | 'dorian' | 'mixolydian' | 'phrygian' | 'lydian' | 'harmonic'
export type Flavor = 'auto' | 'triads' | 'power' | 'sevenths' | 'extended' | 'sus' | 'jazzy'
export type Style =
  | 'any' | 'pop' | 'rock' | 'classic' | 'punk' | 'metal' | 'grunge' | 'indie' | 'blues' | 'jazz' | 'bossa'
  | 'neosoul' | 'funk' | 'gospel' | 'folk' | 'country' | 'reggae' | 'latin' | 'lofi' | 'epic' | 'sad' | 'happy'
export type Fn = 'T' | 'S' | 'D'
export type Ending = 'loop' | 'cadence' | 'turnaround' | 'open'

export const MODES: { id: ModeId; label: string; scale: string; feel: string }[] = [
  { id: 'major', label: 'Major', scale: 'major', feel: 'Bright and settled' },
  { id: 'minor', label: 'Minor', scale: 'aeolian', feel: 'Dark, sad or serious' },
  { id: 'dorian', label: 'Dorian', scale: 'dorian', feel: 'Minor but hopeful: funk, soul, Santana' },
  { id: 'mixolydian', label: 'Mixolydian', scale: 'mixolydian', feel: 'Major with a bluesy edge: classic rock' },
  { id: 'phrygian', label: 'Phrygian', scale: 'phrygian', feel: 'Dark and Spanish: metal, flamenco' },
  { id: 'lydian', label: 'Lydian', scale: 'lydian', feel: 'Dreamy and floating: film music' },
  { id: 'harmonic', label: 'Harmonic minor', scale: 'harmonic minor', feel: 'Dramatic minor with a strong pull home' },
]

export const STYLES: { id: Style; label: string }[] = [
  { id: 'any', label: 'Anything' },
  { id: 'pop', label: 'Pop' },
  { id: 'rock', label: 'Rock' },
  { id: 'classic', label: 'Classic rock' },
  { id: 'punk', label: 'Punk / pop-punk' },
  { id: 'metal', label: 'Metal' },
  { id: 'grunge', label: 'Grunge / alt' },
  { id: 'indie', label: 'Indie / dream pop' },
  { id: 'blues', label: 'Blues' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'bossa', label: 'Bossa nova' },
  { id: 'neosoul', label: 'Neo-soul / R&B' },
  { id: 'funk', label: 'Funk' },
  { id: 'gospel', label: 'Gospel' },
  { id: 'folk', label: 'Folk' },
  { id: 'country', label: 'Country' },
  { id: 'reggae', label: 'Reggae' },
  { id: 'latin', label: 'Latin / flamenco' },
  { id: 'lofi', label: 'Lo-fi / chill' },
  { id: 'epic', label: 'Cinematic / epic' },
  { id: 'sad', label: 'Sad / emotional' },
  { id: 'happy', label: 'Happy / uplifting' },
]

export const FLAVORS: { id: Flavor; label: string; hint: string }[] = [
  { id: 'auto', label: 'Match the style', hint: 'Picks the chord colour the style usually uses' },
  { id: 'triads', label: 'Simple', hint: 'Plain major and minor chords' },
  { id: 'power', label: 'Power chords', hint: 'Root and fifth only: rock, punk, metal' },
  { id: 'sus', label: 'Open & airy', hint: 'sus2, sus4 and add9 chords that ring' },
  { id: 'sevenths', label: '7th chords', hint: 'maj7, m7 and 7: smoother and richer' },
  { id: 'extended', label: 'Lush (9ths)', hint: '9th chords for soul and funk' },
  { id: 'jazzy', label: 'Jazzy', hint: '9ths, 13ths, 6/9s and tension on the dominant' },
]

export const ENDINGS: { id: Ending; label: string; hint: string }[] = [
  { id: 'loop', label: 'Loops smoothly', hint: 'The last chord leads back to the first' },
  { id: 'cadence', label: 'Resolves home', hint: 'Ends with a strong V → I' },
  { id: 'turnaround', label: 'Turnaround', hint: 'Ends on the V chord, itching to start again' },
  { id: 'open', label: 'Unresolved', hint: 'Ends somewhere other than home, like a question' },
]

export const SPICE = [
  { id: 0, label: 'In key only', hint: 'Only chords from the key' },
  { id: 1, label: 'A little spice', hint: 'Now and then a chord borrowed from the parallel key' },
  { id: 2, label: 'Adventurous', hint: 'Borrowed chords and secondary dominants' },
  { id: 3, label: 'Wild', hint: 'Plus tritone subs, passing diminished chords and chromatic mediants' },
]

/** What each style usually sounds like: default chord colour, strum, drum groove and tempo. */
export const STYLE_DEFAULTS: Record<Style, { flavor: Exclude<Flavor, 'auto'>; strum: string; drums: string; bpm: number; mode?: ModeId }> = {
  any: { flavor: 'triads', strum: 'pop', drums: 'pop', bpm: 92 },
  pop: { flavor: 'triads', strum: 'pop', drums: 'pop', bpm: 100 },
  rock: { flavor: 'triads', strum: 'eighths', drums: 'rock', bpm: 112 },
  classic: { flavor: 'triads', strum: 'eighths', drums: 'rock', bpm: 116, mode: 'mixolydian' },
  punk: { flavor: 'power', strum: 'punk', drums: 'punk', bpm: 168 },
  metal: { flavor: 'power', strum: 'chug', drums: 'metal', bpm: 140, mode: 'minor' },
  grunge: { flavor: 'power', strum: 'eighths', drums: 'halftime', bpm: 98 },
  indie: { flavor: 'sus', strum: 'arpeggio', drums: 'pop', bpm: 104 },
  blues: { flavor: 'sevenths', strum: 'shuffle', drums: 'shuffle', bpm: 84 },
  jazz: { flavor: 'jazzy', strum: 'comp', drums: 'swing', bpm: 128 },
  bossa: { flavor: 'jazzy', strum: 'bossa', drums: 'bossa', bpm: 132 },
  neosoul: { flavor: 'jazzy', strum: 'arpeggio', drums: 'hiphop', bpm: 76 },
  funk: { flavor: 'extended', strum: 'funk', drums: 'funk', bpm: 100, mode: 'dorian' },
  gospel: { flavor: 'sevenths', strum: 'quarters', drums: 'halftime', bpm: 76 },
  folk: { flavor: 'triads', strum: 'travis', drums: 'off', bpm: 100 },
  country: { flavor: 'triads', strum: 'country', drums: 'train', bpm: 112 },
  reggae: { flavor: 'triads', strum: 'reggae', drums: 'reggae', bpm: 78 },
  latin: { flavor: 'triads', strum: 'rumba', drums: 'bossa', bpm: 104, mode: 'harmonic' },
  lofi: { flavor: 'jazzy', strum: 'arpeggio', drums: 'hiphop', bpm: 74 },
  epic: { flavor: 'sus', strum: 'half', drums: 'halftime', bpm: 82, mode: 'minor' },
  sad: { flavor: 'sus', strum: 'arpeggio', drums: 'halftime', bpm: 70 },
  happy: { flavor: 'triads', strum: 'pop', drums: 'disco', bpm: 120 },
}

/**
 * A chord written relative to the key: semitones above the tonic + chord type
 * ('' major, 'm', '5', '7', 'maj7', 'm7', 'm7b5', 'dim', 'dim7', 'sus2', 'sus4', '7sus4', 'add9', 'madd9',
 *  '6', '69', '9', 'maj9', 'm9', 'm11', '13', '7b9').
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
  fn?: Fn
  /** why this chord is here (borrowed, secondary dominant ...) */
  why?: string
  /** length in beats (4 = one bar) */
  beats?: number
}

// ---------- diatonic harmony ----------
export const MODE_STEPS: Record<ModeId, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
}
const MINORISH: ModeId[] = ['minor', 'dorian', 'phrygian', 'harmonic']

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

const TYPE_TONES = new Map<string, number[]>()
/** Pitch classes of a chord type built on C. */
export function typeTones(type: string): number[] {
  let t = TYPE_TONES.get(type)
  if (!t) {
    const ty = type === '69' ? '6/9' : type
    t = Chord.get('C' + ty).intervals.map(iv => Note.chroma(Note.transpose('C', iv)) ?? 0)
    if (!t.length) t = [0, 4, 7]
    TYPE_TONES.set(type, t)
  }
  return t
}
function tonesOf(c: RelChord) {
  return typeTones(c.type).map(x => (x + c.semi) % 12)
}

export function isDiatonic(mode: ModeId, c: RelChord): boolean {
  const steps = MODE_STEPS[mode]
  return steps.includes(c.semi % 12) && tonesOf(c).every(p => steps.includes(p))
}

// ---------- roman numerals ----------
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
export function romanFor(mode: ModeId, c: RelChord): string {
  const maj = MODE_STEPS.major
  let deg = maj.indexOf(c.semi)
  let acc = ''
  if (deg < 0) {
    // non-major degrees are written as flats (bIII, bVI, bVII), except the raised 4th
    if (c.semi === 6 && mode === 'lydian') { deg = 3; acc = '#' } else { deg = maj.indexOf(c.semi + 1); acc = 'b' }
  }
  const minorish = /^(m|dim)/.test(c.type) && !c.type.startsWith('maj')
  let n = NUMERALS[Math.max(0, deg)]
  if (minorish) n = n.toLowerCase()
  const suffix =
    c.type === 'dim' ? '°' : c.type === 'dim7' ? '°7' : c.type === 'm7b5' ? 'ø7' : c.type === 'm' ? '' :
      c.type === '69' ? '6/9' : c.type.replace(/^m(?!aj)/, '')
  return acc + n + suffix
}

export function displayType(type: string) {
  return type === '69' ? '6/9' : type === 'madd9' ? 'm(add9)' : type
}

export function spell(tonic: string, mode: ModeId, c: RelChord & { fn?: Fn; why?: string; roman?: string }): ProgChord {
  const roman = c.roman ?? romanFor(mode, c)
  // borrowed flat degrees (bVII, bVI, bIII) are spelled with flats even in sharp keys: Bb, not A#
  const flats = /^b/.test(roman) ? true : /^#/.test(roman) ? false : keyPrefersFlats(tonic, MINORISH.includes(mode))
  const p = (pc(tonic) + c.semi) % 12
  const root = (flats ? FLATS : SHARPS)[p]
  return {
    semi: c.semi, type: c.type, root, symbol: root + displayType(c.type),
    roman, borrowed: !isDiatonic(mode, c), fn: c.fn, why: c.why,
  }
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
  T('Four-chord pop (I–V–vi–IV)', ['major'], ['pop', 'rock', 'punk', 'happy', 'any'], [[0, ''], [7, ''], [9, 'm'], [5, '']], 'Countless hits use this loop.'),
  T('Sensitive (vi–IV–I–V)', ['major'], ['pop', 'sad', 'epic', 'indie'], [[9, 'm'], [5, ''], [0, ''], [7, '']]),
  T('Three-chord rock (I–IV–V–IV)', ['major'], ['rock', 'classic', 'folk', 'punk', 'happy'], [[0, ''], [5, ''], [7, ''], [5, '']]),
  T("'50s doo-wop (I–vi–IV–V)", ['major'], ['pop', 'folk', 'happy'], [[0, ''], [9, 'm'], [5, ''], [7, '']]),
  T('Royal road (IV–V–iii–vi)', ['major'], ['pop', 'epic', 'lofi'], [[5, 'maj7'], [7, '7'], [4, 'm7'], [9, 'm']], 'A staple of J-pop and anime themes.'),
  T('Canon (I–V–vi–iii–IV–I–IV–V)', ['major'], ['pop', 'folk', 'epic'], [[0, ''], [7, ''], [9, 'm'], [4, 'm'], [5, ''], [0, ''], [5, ''], [7, '']]),
  T('Hopeful minor (vi–IV–V–I)', ['major'], ['pop', 'epic', 'happy'], [[9, 'm'], [5, ''], [7, ''], [0, '']]),
  T('Axis with a twist (I–iii–IV–iv)', ['major'], ['sad', 'pop', 'rock', 'indie'], [[0, ''], [4, 'm'], [5, ''], [5, 'm']], 'The borrowed minor iv makes it bittersweet.'),
  T('Bittersweet (I–IV–iv–I)', ['major'], ['sad', 'pop', 'folk', 'gospel'], [[0, ''], [5, ''], [5, 'm'], [0, '']], 'The minor iv is the bittersweet chord.'),
  T('Cinematic lift (I–III–IV–iv)', ['major'], ['epic', 'indie', 'sad'], [[0, ''], [4, ''], [5, ''], [5, 'm']], 'The major III is a chromatic mediant: instant film-score feeling.'),
  T('Dreamy vamp (Imaj7–IVmaj7)', ['major', 'lydian'], ['indie', 'lofi', 'neosoul'], [[0, 'maj7'], [5, 'maj7'], [0, 'maj7'], [5, 'maj7']]),
  T('Indie climb (I–iii–vi–IV)', ['major'], ['indie', 'pop'], [[0, ''], [4, 'm'], [9, 'm'], [5, '']]),
  T('Punk drive (I–IV–vi–V)', ['major'], ['punk', 'rock'], [[0, '5'], [5, '5'], [9, '5'], [7, '5']]),
  T('Happy bounce (I–V–IV–V)', ['major'], ['happy', 'reggae', 'country'], [[0, ''], [7, ''], [5, ''], [7, '']]),
  T('Jazz ii–V–I', ['major'], ['jazz', 'bossa'], [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']]),
  T('Jazz turnaround (I–vi–ii–V)', ['major'], ['jazz', 'pop', 'gospel'], [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7']]),
  T('Rhythm changes A (I–VI7–ii–V)', ['major'], ['jazz'], [[0, 'maj7'], [9, '7'], [2, 'm7'], [7, '7']], 'The VI7 is a secondary dominant pulling to ii.'),
  T('Long turnaround (iii–vi–ii–V)', ['major'], ['jazz', 'bossa', 'gospel'], [[4, 'm7'], [9, '7'], [2, 'm7'], [7, '7']]),
  T('Bossa lift (Imaj7–II7–ii7–bII7)', ['major'], ['bossa', 'jazz'], [[0, 'maj7'], [2, '7'], [2, 'm7'], [1, '7']], 'II7 is a secondary dominant; bII7 is a tritone substitute for V7.'),
  T('Neo-soul descent (IVmaj7–iii7–ii7–Imaj7)', ['major'], ['neosoul', 'lofi', 'jazz'], [[5, 'maj7'], [4, 'm7'], [2, 'm7'], [0, 'maj7']]),
  T('Lo-fi loop (ii9–V13–Imaj9–vi9)', ['major'], ['lofi', 'neosoul', 'jazz'], [[2, 'm9'], [7, '13'], [0, 'maj9'], [9, 'm9']]),
  T('Gospel lift (I–I7–IV–iv)', ['major'], ['gospel', 'sad', 'neosoul'], [[0, ''], [0, '7'], [5, ''], [5, 'm']], 'I7 points to IV; the minor iv sighs back home.'),
  T('Gospel walk-up (I–iii–IV–#iv°7)', ['major'], ['gospel', 'jazz'], [[0, ''], [4, 'm7'], [5, ''], [6, 'dim7']], 'The #iv°7 is a passing chord that climbs into I or V.'),
  T('Mixolydian rock (I–bVII–IV–I)', ['mixolydian', 'major'], ['rock', 'classic', 'folk'], [[0, ''], [10, ''], [5, ''], [0, '']], 'The bVII gives that classic-rock swagger.'),
  T('Plagal rock (I–IV–I–bVII)', ['mixolydian'], ['rock', 'classic'], [[0, ''], [5, ''], [0, ''], [10, '']]),
  T('Classic rock riff (I–bIII–IV–I)', ['major', 'mixolydian'], ['classic', 'rock', 'grunge', 'blues'], [[0, ''], [3, ''], [5, ''], [0, '']], 'Borrowed bIII: big, bluesy power-chord rock.'),
  T('Grunge power (I5–bIII5–IV5–bVI5)', ['major', 'minor'], ['grunge', 'punk', 'metal'], [[0, '5'], [3, '5'], [5, '5'], [8, '5']]),
  T('Aeolian rock (i–bVII–bVI–bVII)', ['minor'], ['rock', 'epic', 'metal'], [[0, 'm'], [10, ''], [8, ''], [10, '']]),
  T('Epic minor (i–bVI–bIII–bVII)', ['minor'], ['epic', 'sad', 'pop', 'metal'], [[0, 'm'], [8, ''], [3, ''], [10, '']]),
  T('Metal gallop (i–bVI–bVII–i)', ['minor', 'phrygian'], ['metal', 'epic'], [[0, '5'], [8, '5'], [10, '5'], [0, '5']]),
  T('Andalusian cadence (i–bVII–bVI–V)', ['minor', 'harmonic', 'phrygian'], ['latin', 'epic', 'rock'], [[0, 'm'], [10, ''], [8, ''], [7, '']], 'Flamenco and surf rock descend this way.'),
  T('Minor ii–V–i', ['minor', 'harmonic'], ['jazz', 'sad', 'bossa'], [[2, 'm7b5'], [7, '7'], [0, 'm7'], [0, 'm7']]),
  T('Minor blues-rock (i–iv–v–i)', ['minor'], ['blues', 'rock', 'sad'], [[0, 'm'], [5, 'm'], [7, 'm'], [0, 'm']]),
  T('Sad loop (i–VI–III–VII)', ['minor'], ['sad', 'pop', 'epic'], [[0, 'm'], [8, ''], [3, ''], [10, '']]),
  T('Dorian vamp (i–IV)', ['dorian'], ['funk', 'rock', 'latin'], [[0, 'm7'], [5, '7'], [0, 'm7'], [5, '7']], 'The major IV is the Dorian sound.'),
  T('Dorian soul (i–ii)', ['dorian'], ['funk', 'jazz', 'neosoul'], [[0, 'm9'], [2, 'm7'], [0, 'm9'], [2, 'm7']]),
  T('One-chord funk (i9)', ['dorian', 'mixolydian'], ['funk'], [[0, 'm9'], [0, 'm9'], [0, 'm9'], [5, '9']], 'Funk lives on one chord and the groove.'),
  T('Phrygian riff (i–bII)', ['phrygian'], ['latin', 'epic', 'metal'], [[0, 'm'], [1, ''], [0, 'm'], [1, '']], 'Metal and flamenco love the half-step b2.'),
  T('Flamenco vamp (I–bII–I–bII)', ['phrygian', 'harmonic'], ['latin'], [[0, ''], [1, ''], [0, ''], [1, '']], 'Phrygian dominant: the major I with a b2 above it.'),
  T('Lydian float (I–II)', ['lydian'], ['epic', 'indie'], [[0, ''], [2, ''], [0, 'maj7'], [2, '']], 'Film scores use this for wonder.'),
  T('Folk (I–IV–I–V)', ['major'], ['folk', 'country'], [[0, ''], [5, ''], [0, ''], [7, '']]),
  T('Country (I–II–IV–I)', ['major'], ['country', 'folk'], [[0, ''], [2, ''], [5, ''], [0, '']], 'The major II is a secondary dominant (V of V).'),
  T('Country two-step (I–I7–IV–V)', ['major'], ['country'], [[0, ''], [0, '7'], [5, ''], [7, '']]),
  T('Reggae lift (I–IV–V–IV)', ['major'], ['reggae', 'happy'], [[0, ''], [5, ''], [7, ''], [5, '']]),
  T('Reggae minor (i–iv)', ['minor', 'dorian'], ['reggae'], [[0, 'm'], [5, 'm'], [0, 'm'], [5, 'm']]),
  T('Funk vamp (I9–IV9)', ['mixolydian'], ['funk', 'blues'], [[0, '9'], [5, '9'], [0, '9'], [5, '9']]),
  T('Harmonic minor drama (i–iv–V–i)', ['harmonic', 'minor'], ['epic', 'latin', 'sad', 'metal'], [[0, 'm'], [5, 'm'], [7, '7'], [0, 'm']]),
]

export const BLUES_12: [number, string][] = [
  [0, '7'], [5, '7'], [0, '7'], [0, '7'],
  [5, '7'], [5, '7'], [0, '7'], [0, '7'],
  [7, '7'], [5, '7'], [0, '7'], [7, '7'],
]
export const BLUES_12_SLOW: [number, string][] = [
  [0, '7'], [0, '7'], [0, '7'], [0, '7'],
  [5, '7'], [5, '7'], [0, '7'], [0, '7'],
  [7, '7'], [5, '7'], [0, '7'], [7, '7'],
]
export const BLUES_8: [number, string][] = [[0, '7'], [7, '7'], [5, '7'], [5, '7'], [0, '7'], [7, '7'], [0, '7'], [7, '7']]
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

const FN_OF: Record<number, Fn> = { 0: 'T', 2: 'S', 3: 'T', 4: 'T', 5: 'S', 7: 'D', 8: 'S', 9: 'T', 10: 'D', 11: 'D', 1: 'S', 6: 'D' }

export function suggestions(tonic: string, mode: ModeId, style: Style, flavor: Exclude<Flavor, 'auto'>): Suggestion[] {
  const out: Suggestion[] = []
  const fit = TEMPLATES.filter(t => t.modes.includes(mode) && (style === 'any' || t.styles.includes(style)))
  const loose = TEMPLATES.filter(t => t.modes.includes(mode) && !fit.includes(t))
  const mk = (s: number, ty: string, colour = true) => spell(tonic, mode, { ...(colour ? applyFlavor({ semi: s, type: ty }, flavor, mode) : { semi: s, type: ty }), fn: FN_OF[s] })
  for (const t of [...fit, ...loose].slice(0, 14)) {
    out.push({ name: t.name, note: t.note, chords: t.chords.map(([s, ty]) => mk(s, ty, !['5', 'dim7'].includes(ty) && !(flavor === 'triads' && /7|9|13/.test(ty)))) })
  }
  if (['blues', 'any', 'rock', 'classic', 'country', 'jazz', 'funk'].includes(style)) {
    const minor = mode === 'minor' || mode === 'dorian'
    const blues = (name: string, rows: [number, string][], note: string) =>
      out.unshift({ name, note, chords: rows.map(([s, ty]) => ({ ...spell(tonic, mode, { semi: s, type: ty, fn: FN_OF[s] }), beats: 4 })) })
    if (!minor) blues('8-bar blues', BLUES_8, 'A shorter blues form: I–V–IV–IV–I–V–I–V.')
    blues(minor ? '12-bar minor blues' : '12-bar blues (quick change)', minor ? MINOR_BLUES_12 : BLUES_12, 'One chord per bar. The backbone of blues, rock and roll and jam sessions.')
    if (!minor) blues('12-bar blues (slow change)', BLUES_12_SLOW, 'Four bars of the I chord before moving to IV.')
  }
  return out
}

// ---------- chord colour ----------
export function resolveFlavor(flavor: Flavor, style: Style): Exclude<Flavor, 'auto'> {
  return flavor === 'auto' ? STYLE_DEFAULTS[style].flavor : flavor
}

/** Turn a basic chord (triad) into the chosen colour, keeping its job in the progression. */
export function applyFlavor(c: RelChord, flavor: Exclude<Flavor, 'auto'>, mode: ModeId, next?: RelChord): RelChord {
  const tri = c.type
  const base = /^(m|dim)/.test(tri) && !tri.startsWith('maj') ? (tri.startsWith('dim') || tri === 'm7b5' ? 'dim' : 'm') : tri === '5' ? '5' : ''
  if (['dim7', '7b9', '13'].includes(tri)) return c // already deliberate
  switch (flavor) {
    case 'triads':
      if (['maj7', '6', 'add9', 'maj9', '69', 'sus2'].includes(tri)) return { ...c, type: '' }
      if (['m7', 'm9', 'm11', 'm6', 'madd9'].includes(tri)) return { ...c, type: 'm' }
      if (['9'].includes(tri)) return { ...c, type: '7' }
      return c
    case 'power':
      return { ...c, type: '5' }
    case 'sus': {
      if (base === 'dim') return { ...c, type: 'm7b5' }
      if (tri === '7') return { ...c, type: '7sus4' }
      if (base === 'm') return { ...c, type: c.semi === 0 ? 'madd9' : 'm7' }
      if (c.semi === 7 || c.semi === 10) return { ...c, type: 'sus4' }
      if (c.semi === 5 || c.semi === 8) return { ...c, type: 'sus2' }
      return { ...c, type: 'add9' }
    }
    case 'sevenths':
    case 'extended':
    case 'jazzy': {
      let t = tri
      if (['', 'm', 'dim', '5', 'sus2', 'sus4', 'add9'].includes(tri)) {
        const steps = MODE_STEPS[mode]
        const deg = steps.indexOf(c.semi)
        const asTri = tri === '5' || tri.startsWith('sus') || tri === 'add9' ? '' : tri
        if (deg >= 0 && diatonic(mode, deg, false).type === asTri) t = diatonic(mode, deg, true).type
        else if (asTri === 'm') t = 'm7'
        else if (asTri === 'dim') t = 'm7b5'
        else t = c.semi === 7 || c.semi === 2 || c.semi === 4 || c.semi === 9 || c.semi === 10 ? '7' : 'maj7'
        if (t === 'mmaj7') t = 'm7'
      }
      if (flavor === 'sevenths') return { ...c, type: t }
      // extensions only where the key has those notes (an Em9 in C major would add an F#)
      const wasDiatonic = isDiatonic(mode, { semi: c.semi, type: t })
      const keep = (x: string) => (!wasDiatonic || isDiatonic(mode, { semi: c.semi, type: x }) ? { ...c, type: x } : { ...c, type: t })
      if (flavor === 'extended') return keep(({ maj7: 'maj9', m7: 'm9', '7': '9' } as Record<string, string>)[t] ?? t)
      // jazzy: tensions that depend on where the chord goes next
      if (t === '7') {
        const resolvesToMinor = next && (next.semi - c.semi + 12) % 12 === 5 && /^m/.test(next.type) && !next.type.startsWith('maj')
        return resolvesToMinor && !wasDiatonic ? { ...c, type: '7b9' } : keep('13')
      }
      if (t === 'maj7') return keep(c.semi === 0 ? '69' : 'maj9')
      if (t === 'm7') {
        const k = keep(c.semi === 0 && MINORISH.includes(mode) ? 'm11' : 'm9')
        return k.type === 'm7' ? keep('m11') : k
      }
      return { ...c, type: t }
    }
  }
  return c
}

// ---------- randomizer ----------
interface Cand {
  c: RelChord
  fn: Fn
  weight: number
  borrowed?: boolean
  why?: string
  roman?: string
}

const PARALLEL = (mode: ModeId) => (MINORISH.includes(mode) ? 'the parallel major key' : 'the parallel minor key')

/** The chord palette for a mode: diatonic chords with harmonic function, plus tasteful borrowed chords. */
function palette(mode: ModeId, style: Style, spice: number): Cand[] {
  const d = (deg: number, fn: Fn, w: number): Cand => ({ c: diatonic(mode, deg, false), fn, weight: w })
  const sp = spice <= 0 ? 0 : spice === 1 ? 1 : spice === 2 ? 1.8 : 2.4
  const b = (semi: number, type: string, fn: Fn, w: number, why?: string): Cand => ({ c: { semi, type }, fn, weight: w * sp, borrowed: true, why: why ?? `Borrowed from ${PARALLEL(mode)}.` })
  let p: Cand[]
  switch (mode) {
    case 'major':
      p = [d(0, 'T', 3), d(1, 'S', 1.6), d(2, 'T', 0.8), d(3, 'S', 2.6), d(4, 'D', 2.6), d(5, 'T', 2.2), d(6, 'D', 0.25),
        b(10, '', 'S', 1.0, 'bVII is borrowed from minor / Mixolydian: a rock favourite.'), b(5, 'm', 'S', 0.9, 'The minor iv is borrowed from the minor key: instant bittersweet.'),
        b(8, '', 'S', 0.7, 'bVI is borrowed from the minor key: big and dramatic.'), b(2, '', 'D', 0.6, 'The major II is the V of V: it pushes toward V.'),
        b(4, '', 'D', 0.4, 'The major III is the V of vi: it pulls toward vi.'), b(3, '', 'S', 0.35, 'bIII is borrowed from the minor key: classic-rock grit.')]
      break
    case 'minor':
      p = [d(0, 'T', 3), d(2, 'T', 1.6), d(3, 'S', 2.2), d(4, 'D', 1.0), d(5, 'S', 2.4), d(6, 'D', 2.2), d(1, 'S', 0.3),
        b(7, '', 'D', 1.3, 'The major V comes from harmonic minor: its raised 7th pulls hard back home.'), b(7, '7', 'D', 0.6, 'V7 from harmonic minor: the strongest pull home.'),
        b(5, '', 'S', 0.5, 'The major IV is borrowed from Dorian: a hopeful lift.'), b(1, '', 'S', 0.4, 'The bII (Neapolitan) is a dark, dramatic colour from Phrygian.')]
      break
    case 'dorian':
      p = [d(0, 'T', 3), d(1, 'S', 1.6), d(2, 'T', 1.0), d(3, 'S', 2.8), d(4, 'D', 1.4), d(6, 'D', 1.6), d(5, 'S', 0.3),
        b(8, '', 'S', 0.5), b(7, '', 'D', 0.4, 'A major V borrowed from harmonic minor.')]
      break
    case 'mixolydian':
      p = [d(0, 'T', 3), d(3, 'S', 2.6), d(6, 'D', 2.6), d(4, 'D', 1.0), d(1, 'S', 1.2), d(5, 'T', 0.8), d(2, 'S', 0.2),
        b(7, '', 'D', 0.7, 'A major V borrowed from the major key.'), b(8, '', 'S', 0.4), b(3, '', 'S', 0.4, 'bIII borrowed from minor: bluesy rock.')]
      break
    case 'phrygian':
      p = [d(0, 'T', 3), d(1, 'S', 2.8), d(2, 'T', 1.2), d(6, 'D', 2.0), d(3, 'S', 1.6), d(5, 'S', 1.4), b(7, '', 'D', 0.8, 'A major V borrowed from harmonic minor.'), b(0, '', 'T', 0.6, 'A major I: the Phrygian dominant (flamenco) sound.')]
      break
    case 'lydian':
      p = [d(0, 'T', 3), d(1, 'S', 2.8), d(4, 'D', 1.4), d(6, 'T', 1.0), d(2, 'T', 1.0), d(5, 'T', 1.0), b(10, '', 'S', 0.4)]
      break
    case 'harmonic':
      p = [d(0, 'T', 3), d(3, 'S', 2.4), d(4, 'D', 2.8), d(5, 'S', 2.0), d(1, 'S', 1.2), d(2, 'T', 0.4), d(6, 'D', 0.6),
        b(10, '', 'D', 0.6, 'bVII borrowed from natural minor.'), b(3, '', 'T', 0.6, 'bIII from natural minor.')]
      break
  }
  const has = (k: Cand, ...semis: number[]) => semis.includes(k.c.semi)
  for (const k of p) {
    const t = k.c.type
    switch (style) {
      case 'rock': if (has(k, 10, 8, 5)) k.weight *= 1.4; break
      case 'classic': if (has(k, 10, 3, 5)) k.weight *= 1.5; break
      case 'punk': case 'happy': if (has(k, 0, 5, 7, 9) && !k.borrowed) k.weight *= 1.4; if (k.borrowed) k.weight *= 0.5; break
      case 'metal': if (has(k, 8, 10, 1)) k.weight *= 1.6; if (t === 'dim') k.weight *= 0.2; break
      case 'grunge': if (has(k, 3, 8, 10, 5)) k.weight *= 1.5; break
      case 'indie': case 'lofi': if (has(k, 4, 9, 5, 2)) k.weight *= 1.4; break
      case 'blues': if (['', '7'].includes(t) && has(k, 0, 5, 7, 10)) k.weight *= 1.6; break
      case 'jazz': case 'bossa': case 'neosoul': if (has(k, 2, 7, 9, 4)) k.weight *= 1.5; break
      case 'gospel': if (has(k, 5, 9, 2, 4) || (k.borrowed && has(k, 5))) k.weight *= 1.4; break
      case 'funk': if (has(k, 0, 5, 10, 2)) k.weight *= 1.3; break
      case 'folk': case 'country': if (has(k, 0, 5, 7)) k.weight *= 1.4; if (k.borrowed && !(style === 'country' && has(k, 2))) k.weight *= 0.4; break
      case 'reggae': if (has(k, 0, 5, 7, 2)) k.weight *= 1.4; break
      case 'latin': if (has(k, 7, 8, 1)) k.weight *= 1.5; break
      case 'epic': if (has(k, 8, 10, 3)) k.weight *= 1.6; break
      case 'sad': if (t === 'm' || (k.borrowed && has(k, 5))) k.weight *= 1.4; break
      case 'pop': if (k.borrowed) k.weight *= 0.6; break
    }
    if (style === 'happy' && t === 'm') k.weight *= 0.8
    if (t === 'dim') k.weight *= 0.5
  }
  return p.filter(k => k.weight > 0.01)
}

// How strongly one function pulls to the next (tonic -> subdominant -> dominant -> tonic).
const FN_FLOW: Record<Fn, Record<Fn, number>> = {
  T: { T: 0.7, S: 1.6, D: 1.1 },
  S: { T: 0.9, S: 0.6, D: 1.7 },
  D: { T: 2.2, S: 0.6, D: 0.35 },
}

function commonTones(a: RelChord, b: RelChord) {
  const A = tonesOf(a)
  return tonesOf(b).filter(x => A.includes(x)).length
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

function pick<X>(items: X[], weights: number[], rnd: () => number) {
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
  /** number of chords */
  count: number
  /** 0 = in key only … 3 = wild */
  spice: number
  start?: 'home' | 'any'
  ending?: Ending
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

interface PhraseOpts {
  len: number
  startAt: 'home' | 'any' | 'sub'
  ending: Ending
  loopTo?: Cand
}

/** Walk the harmonic-function graph many times and keep a good phrase. */
function phrase(pal: Cand[], o: RandomOpts, p: PhraseOpts, rnd: () => number, trials = 400): Cand[][] {
  const tonic = pal.find(k => k.c.semi === 0 && k.fn === 'T')!
  const out: { seq: Cand[]; score: number }[] = []
  for (let trial = 0; trial < trials; trial++) {
    const seq: Cand[] = []
    for (let i = 0; i < p.len; i++) {
      if (i === 0) {
        let starts: Cand[]
        if (p.startAt === 'home') starts = [tonic]
        else if (p.startAt === 'sub') starts = pal.filter(k => k.fn === 'S' || (k.fn === 'T' && k.c.semi !== 0))
        else starts = pal.filter(k => k.c.semi === 0 || (['pop', 'sad', 'indie'].includes(o.style) && k.c.semi === 9) || (o.style === 'epic' && k.c.semi === 8) || k.fn === 'S')
        seq.push(pick(starts, starts.map(k => (k.c.semi === 0 ? 3 : 1) * k.weight), rnd))
        continue
      }
      const prev = seq[i - 1]
      let opts = pal.filter(k => !(k.c.semi === prev.c.semi && k.c.type === prev.c.type))
      const last = i === p.len - 1
      if (last && p.ending === 'cadence') opts = [tonic]
      else if (last && p.ending === 'turnaround') opts = opts.filter(k => k.fn === 'D')
      else if (last && p.ending === 'open') opts = opts.filter(k => k.c.semi !== 0)
      else if (i === p.len - 2 && p.ending === 'cadence') opts = opts.filter(k => k.fn === 'D' || (k.fn === 'S' && k.c.semi === 5))
      if (!opts.length) opts = pal.filter(k => k !== prev)
      seq.push(pick(opts, opts.map(k => transition(prev, k)), rnd))
    }
    let s = 0
    for (let i = 1; i < seq.length; i++) s += Math.log(transition(seq[i - 1], seq[i]) + 1e-3)
    if (p.ending === 'loop' || p.ending === 'turnaround') s += 1.5 * Math.log(transition(seq[seq.length - 1], p.loopTo ?? seq[0]) + 1e-3)
    const distinct = new Set(seq.map(k => k.c.semi + k.c.type)).size
    s += distinct >= Math.min(3, p.len) ? 1.2 : -3
    if (p.len >= 8 && distinct < 4) s -= 1.5
    if (!seq.some(k => k.fn === 'D') && o.mode !== 'dorian' && o.mode !== 'lydian' && p.len >= 4) s -= 0.8
    const borrowed = seq.filter(k => k.borrowed).length
    if (o.spice === 0 && borrowed) s -= 10
    if (borrowed > Math.max(1, Math.round(p.len / 4) * (o.spice >= 2 ? 2 : 1))) s -= 2
    if (p.startAt === 'any' && !seq.includes(tonic)) s -= 1.5
    if (p.len === 8 && seq.slice(0, 4).every((k, i) => k === seq[i + 4])) s -= 0.5
    out.push({ seq, score: s })
  }
  const uniq = new Map<string, { seq: Cand[]; score: number }>()
  for (const c of out) {
    const k = c.seq.map(x => x.c.semi + x.c.type).join(',')
    const prev = uniq.get(k)
    if (!prev || prev.score < c.score) uniq.set(k, c)
  }
  return [...uniq.values()].sort((a, b) => b.score - a.score).slice(0, 60).map(x => x.seq)
}

function choose(pool: Cand[][], rnd: () => number, avoid?: string, scoreOf?: (s: Cand[]) => number): Cand[] {
  const keyed = pool.filter(s => s.map(x => x.c.semi + x.c.type).join(',') !== avoid)
  const list = keyed.length ? keyed : pool
  const w = list.map((s, i) => Math.exp(-i / 12) * (scoreOf ? scoreOf(s) : 1))
  return pick(list, w, rnd)
}

/** Spice: secondary dominants, tritone substitutions, passing diminished chords, chromatic mediants. */
function addColour(seq: Cand[], o: RandomOpts, rnd: () => number, locked: boolean[]): Cand[] {
  if (o.spice < 2) return seq
  const out = seq.map(k => ({ ...k, c: { ...k.c } }))
  const jazzy = ['jazz', 'bossa', 'neosoul', 'gospel', 'lofi'].includes(o.style)
  const n = out.length
  // keep the chords that give the progression its shape: the opening home chord and a planned ending
  const ending = o.ending ?? 'loop'
  locked = locked.map((l, i) => l || (i === 0 && (o.start ?? 'home') === 'home') || (i === n - 1 && (ending === 'cadence' || ending === 'open')) || (i === n - 2 && ending === 'cadence'))
  const secProb = (o.spice === 2 ? 0.2 : 0.3) * (jazzy ? 1.6 : 1) * (['punk', 'metal', 'grunge', 'reggae'].includes(o.style) ? 0.3 : 1)
  for (let i = 0; i < n; i++) {
    if (locked[i]) continue
    const target = out[(i + 1) % n]
    if (target.c.semi === 0 || /dim|m7b5/.test(target.c.type) || target.c.semi === out[i].c.semi) continue
    if (rnd() < secProb) {
      const semi = (target.c.semi + 7) % 12
      out[i] = { c: { semi, type: '7' }, fn: 'D', weight: 1, borrowed: true, roman: `V7/${romanFor(o.mode, { semi: target.c.semi, type: target.c.type.replace(/7|9|11|13/g, '') })}`, why: 'Secondary dominant: the V7 of the next chord, borrowed so it pulls into it.' }
    }
  }
  if (o.spice >= 3 || jazzy) {
    for (let i = 0; i < n; i++) {
      if (locked[i]) continue
      const k = out[i]
      const next = out[(i + 1) % n]
      if (k.c.type === '7' && (next.c.semi - k.c.semi + 12) % 12 === 5 && rnd() < (o.spice >= 3 ? 0.35 : 0.2)) {
        out[i] = { ...k, c: { semi: (k.c.semi + 6) % 12, type: '7' }, borrowed: true, roman: undefined, why: 'Tritone substitution: a 7th chord a tritone away from the V, sliding down a half step into the next chord.' }
      }
    }
  }
  if (o.spice >= 3) {
    for (let i = 1; i < n; i++) {
      if (locked[i]) continue
      const prev = out[i - 1]
      const next = out[(i + 1) % n]
      // passing diminished: a repeated chord becomes a dim7 that climbs into the next chord
      if (prev.c.semi === out[i].c.semi && prev.c.type === out[i].c.type && (next.c.semi - prev.c.semi + 12) % 12 === 2 && rnd() < 0.6) {
        out[i] = { c: { semi: (next.c.semi + 11) % 12, type: 'dim7' }, fn: 'D', weight: 1, borrowed: true, why: 'Passing diminished chord: it climbs a half step into the next chord.' }
        continue
      }
      // chromatic mediant: turn a minor iii or vi into a major chord for a cinematic lift
      if (['epic', 'indie', 'sad', 'any', 'pop'].includes(o.style) && /^m($|7|9)/.test(out[i].c.type) && [4, 9].includes(out[i].c.semi) && rnd() < 0.3) {
        out[i] = { ...out[i], c: { semi: out[i].c.semi, type: '' }, borrowed: true, roman: undefined, why: 'Chromatic mediant: a major chord where the key expects minor, for a sudden, cinematic lift.' }
      }
    }
  }
  return out
}

/**
 * Generate a progression. Short ones are a single phrase; 12 and 16 chords are built from phrases
 * (A B A' and A A' B A') so they sound like a song section rather than a random walk.
 */
export function randomProgression(o: RandomOpts): ProgChord[] {
  const rnd = rng(o.seed ?? Math.floor(Math.random() * 1e9))
  const pal = palette(o.mode, o.style, o.spice)
  const tonic = pal.find(k => k.c.semi === 0 && k.fn === 'T')!
  const lockedIn = o.locked ?? []
  const start = o.start ?? 'home'
  const ending = o.ending ?? 'loop'
  const flavor = resolveFlavor(o.flavor, o.style)
  const n = o.count
  let seq: Cand[]
  if (n <= 8) {
    seq = choose(phrase(pal, o, { len: n, startAt: start, ending }, rnd), rnd, o.avoid)
  } else {
    const P = n === 12 ? 4 : n / 4
    const A = choose(phrase(pal, o, { len: P, startAt: start, ending: 'turnaround' }, rnd, 300), rnd)
    const B = choose(phrase(pal, o, { len: P, startAt: 'sub', ending: 'turnaround', loopTo: A[0] }, rnd, 300), rnd)
    const end = choose(phrase(pal, o, { len: 2, startAt: 'any', ending, loopTo: A[0] }, rnd, 120), rnd)
    const Aend = [...A.slice(0, P - 2), ...end]
    seq = n === 12 ? [...A, ...B, ...Aend] : [...A, ...A, ...B, ...Aend]
    if (n === 16) {
      // vary the second A so it doesn't feel copy-pasted
      const alt = pal.filter(k => k.fn === seq[P + P - 1].fn && k !== seq[P + P - 1])
      if (alt.length) seq[2 * P - 1] = pick(alt, alt.map(k => k.weight), rnd)
    }
  }
  // locked chords stay where they are
  const lockMask = Array.from({ length: n }, (_, i) => !!lockedIn[i])
  seq = seq.map((k, i) => {
    const lk = lockedIn[i]
    return lk ? { c: lk, fn: FN_OF[lk.semi] ?? 'S', weight: 1 } : k
  })
  if (start === 'home' && !lockMask[0]) seq[0] = tonic
  seq = addColour(seq, o, rnd, lockMask)
  return seq.map((k, i) => {
    const lk = lockedIn[i]
    if (lk) return spell(o.tonic, o.mode, { ...(lk as ProgChord), fn: (lk as ProgChord).fn })
    const next = seq[(i + 1) % n].c
    const keepType = ['dim7', '7b9', '13'].includes(k.c.type) || (k.why?.startsWith('Secondary') && flavor === 'triads') || (k.why?.startsWith('Tritone') && flavor === 'triads')
    let c = keepType ? k.c : applyFlavor(k.c, flavor, o.mode, next)
    // blues runs on dominant 7th chords: I7, IV7, V7 (not maj7) — that's the blues sound, not a borrowed chord
    let bluesy = false
    if (o.style === 'blues' && ['sevenths', 'extended', 'jazzy'].includes(flavor) && [0, 5, 7, 10].includes(c.semi) && /^(maj7|maj9|69|6|7|9|13|)$/.test(c.type) && !k.borrowed) {
      c = { ...c, type: flavor === 'sevenths' ? '7' : '9' }
      bluesy = true
    }
    const out = spell(o.tonic, o.mode, { ...c, fn: k.fn, why: k.why ?? (bluesy ? 'Blues uses dominant 7th chords on every main chord: that bluesy rub is the sound.' : undefined), roman: k.roman ? k.roman.replace(/^V7/, `V${displayType(c.type)}`) : undefined })
    return bluesy ? { ...out, borrowed: false } : out
  })
}

/** Swap one chord for another that does the same job (same function), keeping the rest. */
export function swapChord(prog: ProgChord[], i: number, o: Omit<RandomOpts, 'count' | 'locked'>): ProgChord {
  const pal = palette(o.mode, o.style, Math.max(1, o.spice))
  const cur = prog[i]
  const prev = prog[(i - 1 + prog.length) % prog.length]
  const next = prog[(i + 1) % prog.length]
  const fn = cur.fn ?? FN_OF[cur.semi] ?? 'S'
  let opts = pal.filter(k => !(k.c.semi === cur.semi) && !(k.c.semi === prev.semi && i > 0))
  const same = opts.filter(k => k.fn === fn)
  if (same.length >= 2) opts = same
  const asCand = (c: ProgChord): Cand => ({ c: { semi: c.semi, type: c.type }, fn: c.fn ?? 'S', weight: 1 })
  const w = opts.map(k => transition(asCand(prev), k) * transition(k, asCand(next)) + 0.01)
  const k = pick(opts, w, Math.random)
  const flavor = resolveFlavor(o.flavor, o.style)
  return { ...spell(o.tonic, o.mode, { ...applyFlavor(k.c, flavor, o.mode, next), fn: k.fn, why: k.why }), beats: cur.beats }
}

export const FN_LABEL: Record<Fn, string> = {
  T: 'Home (tonic): feels at rest',
  S: 'Moving away (subdominant): builds motion',
  D: 'Tension (dominant): wants to resolve home',
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
  const flats = keyPrefersFlats(tonic, MINORISH.includes(mode))
  const name = (semi: number) => (flats ? FLATS : SHARPS)[(pc(tonic) + semi) % 12]
  const allBlues = chords.length > 0 && chords.every(c => /^(7|9|13)$/.test(c.type))
  const minorish = MINORISH.includes(mode)
  tips.push({ root: tonic, scale: modeScale, why: 'Every note fits every chord from the key. Your home base.' })
  if (minorish) {
    tips.push({ root: tonic, scale: 'minor pentatonic', why: 'Five safe notes with no clashes, great for riffs and solos.' })
    if (['blues', 'rock', 'classic', 'grunge', 'metal'].includes(style)) tips.push({ root: tonic, scale: 'minor blues', why: 'Adds the b5 blue note for grit.' })
  } else {
    tips.push({ root: tonic, scale: 'major pentatonic', why: 'Five sweet, safe notes. Bends sound great.' })
    tips.push({ root: name(9), scale: 'minor pentatonic', why: `The relative minor pentatonic: same notes as ${tonic} major pentatonic, different home.` })
  }
  if (allBlues || style === 'blues') {
    tips.push({ root: tonic, scale: 'minor blues', why: 'Over dominant 7 blues changes, the minor blues sound is the classic choice.' })
    tips.push({ root: tonic, scale: 'major blues', why: 'Major pentatonic plus the b3: sweeter, country-blues phrasing.' })
    tips.push({ root: tonic, scale: 'mixolydian', why: 'Follows the 7th chords for a jazzier, more melodic sound.' })
  }
  if (chords.some(c => c.semi === 7 && (c.type === '' || /^7|^13|^9/.test(c.type)) && minorish)) {
    tips.push({ root: tonic, scale: 'harmonic minor', why: 'The major V chord in a minor key wants the raised 7th; use this over that chord.' })
  }
  if (chords.some(c => c.borrowed)) tips.push({ root: tonic, scale: minorish ? 'minor pentatonic' : 'major pentatonic', why: 'The progression borrows chords from outside the key: the pentatonic avoids most clashes, or follow each chord (below).' })
  if (mode === 'dorian') tips.push({ root: tonic, scale: 'dorian', why: 'Lean on the natural 6th: it is the Dorian sound.' })
  if (mode === 'mixolydian') tips.push({ root: tonic, scale: 'mixolydian', why: 'Hit the b7 over the I chord.' })
  if (['jazz', 'bossa', 'neosoul', 'lofi'].includes(style)) tips.push({ root: tonic, scale: minorish ? 'melodic minor' : 'bebop', why: minorish ? 'Jazz minor: smooth over minor ii–V–i changes.' : 'Bebop: the major scale with a passing note, so chord tones land on the beat.' })
  const seen = new Set<string>()
  return tips.filter(t => (seen.has(t.root + t.scale) ? false : (seen.add(t.root + t.scale), true)))
}

/** Best scale over one chord in the context of the key (chord-scale theory). */
export function scaleForChord(tonic: string, mode: ModeId, c: ProgChord): ScaleTip {
  if (c.type === '5') {
    const minorish = MINORISH.includes(mode)
    return { root: c.root, scale: minorish ? 'minor pentatonic' : 'major pentatonic', why: `${c.symbol} is a power chord (no 3rd), so either works; ${c.root} ${minorish ? 'minor' : 'major'} pentatonic matches the key's mood.` }
  }
  if (c.type === 'dim7') return { root: c.root, scale: 'whole-half diminished', why: `${c.symbol} is a passing diminished chord: the diminished scale fits it exactly, or just hit its chord tones.` }
  if (mode === 'harmonic') {
    if (c.semi === 0 && c.type.startsWith('m')) return { root: c.root, scale: 'harmonic minor', why: `Home chord: ${c.root} harmonic minor, with its raised 7th leading back to the root.` }
    if (c.semi === 7 && !c.type.startsWith('m')) return { root: c.root, scale: 'phrygian dominant', why: `The V chord: ${c.root} phrygian dominant matches the key's raised 7th.` }
    mode = 'minor'
  }
  if (MINORISH.includes(mode) && c.semi === 7 && !c.type.startsWith('m') && !c.type.startsWith('dim'))
    return { root: c.root, scale: 'phrygian dominant', why: `A major V chord in a minor key: ${c.root} phrygian dominant hits its raised 7th, the note that pulls home.` }
  if (c.why?.startsWith('Secondary'))
    return { root: c.root, scale: /b9/.test(c.type) ? 'phrygian dominant' : 'mixolydian', why: `${c.symbol} is a secondary dominant: play ${c.root} ${/b9/.test(c.type) ? 'phrygian dominant' : 'mixolydian'} (its 3rd is the note that leads into the next chord).` }
  if (c.why?.startsWith('Tritone')) return { root: c.root, scale: 'lydian dominant', why: `${c.symbol} is a tritone substitute: ${c.root} lydian dominant is the classic jazz choice.` }
  const steps = MODE_STEPS[mode]
  const deg = steps.indexOf(c.semi)
  const modeNames = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian']
  if (deg >= 0 && isDiatonic(mode, c)) {
    const parentOffset: Record<ModeId, number> = { major: 0, dorian: 1, phrygian: 2, lydian: 3, mixolydian: 4, minor: 5, harmonic: 5 }
    const idx = (parentOffset[mode] + deg) % 7
    const m = modeNames[idx] === 'ionian' ? 'major' : modeNames[idx]
    return { root: c.root, scale: m, why: `Chord ${c.roman}: play ${c.root} ${m}, which uses the same notes as the key.` }
  }
  const options = Chord.chordScales(c.symbol.replace('6/9', '69'))
  const pref = ['mixolydian', 'lydian dominant', 'major', 'lydian', 'dorian', 'aeolian', 'phrygian dominant', 'locrian', 'altered', 'minor pentatonic', 'major pentatonic']
  const best = pref.find(p => options.includes(p)) ?? options[0] ?? (c.type.startsWith('m') ? 'dorian' : 'mixolydian')
  return { root: c.root, scale: best, why: `${c.roman} comes from outside the key, so switch to ${c.root} ${best} while it plays.` }
}

/** Chord tones as pitch classes (for highlighting targets on the fretboard). */
export function chordPcs(symbol: string): number[] {
  const ch = Chord.get(symbol)
  if (ch.empty) return []
  return ch.notes.map(n => Note.chroma(n) ?? 0)
}
/** Chord tones from key-relative data (works for every type this engine makes). */
export function progChordPcs(tonic: string, c: RelChord): number[] {
  return typeTones(c.type).map(x => (x + c.semi + pc(tonic)) % 12)
}

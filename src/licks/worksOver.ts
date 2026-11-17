// "Works over…" progression & groove tagging for EVERY lick in the library and EVERY exercise in catalog.ts,
// plus live progression matching for JamScreen ("Licks & riffs that fit this groove") and library filters.
import type { ProgChord, ModeId, Style } from '../theory/progressions'
import { lickById, type LickDef } from './library'
import { lickStyle } from './styles'
import { placeFor } from './generator'

export type WorksOverId =
  | 'blues12'
  | 'minor'
  | 'major'
  | 'iiVI'
  | 'dominant'
  | 'acoustic'
  | 'island'
  | 'heavy'
  | 'warmup'

export interface WorksOverTag {
  id: WorksOverId
  label: string
  short: string
  examples: string
}

export const WORKS_OVER_TAGS: WorksOverTag[] = [
  { id: 'blues12', label: '12-bar blues (I7–IV7–V7)', short: '12-bar blues', examples: 'A7 – D7 – E7, slow blues, shuffle' },
  { id: 'minor', label: 'Minor jam (i–♭VII–♭VI)', short: 'Minor groove', examples: 'Am – G – F, Em – C – D, Dorian vamps' },
  { id: 'major', label: 'Pop / rock (I–V–vi–IV)', short: 'Major pop / rock', examples: 'G – D – Em – C, C – G – Am – F' },
  { id: 'iiVI', label: 'Jazz & soul ii–V–I', short: 'ii–V–I / maj7', examples: 'Am7 – D7 – Gmaj7, Cmaj9 – Am9' },
  { id: 'dominant', label: 'Dom7 / funk vamp (I7–IV7)', short: 'Dom7 / funk vamp', examples: 'E9, A7–D7, chicken pickin\' grooves' },
  { id: 'acoustic', label: 'Acoustic & country (I–IV–V)', short: 'Acoustic / roots', examples: 'G – C – D, bluegrass, folk, campfire' },
  { id: 'island', label: 'Island & reggae groove', short: 'Reggae / island', examples: 'Am – G skank, C – F – G slack key' },
  { id: 'heavy', label: 'Heavy / power-chord (I5–♭III5)', short: 'Heavy / metal', examples: 'E5 – G5 – A5, palm-mute & odd meter' },
  { id: 'warmup', label: 'Technique (fits any groove)', short: 'Any key / technique', examples: 'Warm-ups, scales, picking & speed drills' },
]

const TAG_MAP = new Map(WORKS_OVER_TAGS.map(t => [t.id, t]))
export const worksOverInfo = (id: WorksOverId) => TAG_MAP.get(id)!

const uniq = (list: WorksOverId[]): WorksOverId[] => [...new Set(list)]

/** Every lick gets 1–3 musical progression tags describing the chords/grooves it sits best over. */
export function worksOverForLick(l: LickDef): WorksOverId[] {
  const st = lickStyle(l.style)
  const minor = l.minor ?? st.minor
  const chord = l.chord ?? ''
  const out: WorksOverId[] = []

  switch (l.style) {
    case 'blues':
      out.push('blues12', 'dominant')
      if (minor) out.push('minor')
      break
    case 'rock':
      if (l.minor === false || /\bA\b/.test(chord)) out.push('major', 'dominant', 'blues12')
      else if (/7/.test(chord)) out.push('blues12', 'dominant', 'minor')
      else out.push('minor', 'heavy', 'blues12')
      break
    case 'altrock':
      out.push(minor ? 'minor' : 'major', minor ? 'major' : 'acoustic')
      break
    case 'metal':
    case 'progmetal':
      out.push('heavy', 'minor')
      break
    case 'mathrock':
      out.push(minor ? 'minor' : 'major', 'acoustic')
      break
    case 'progclean':
      out.push('major', 'iiVI')
      break
    case 'jazz':
      if (/m7.*7|maj7|ii/i.test(chord) || l.name.toLowerCase().includes('ii–v')) out.push('iiVI', 'major')
      else if (/7/.test(chord) && !/maj7|m7/.test(chord)) out.push('iiVI', 'blues12', 'dominant')
      else if (minor || /m6|m7/.test(chord)) out.push('iiVI', 'minor')
      else out.push('iiVI', 'major')
      break
    case 'mayer':
      out.push(minor ? 'blues12' : 'major', 'dominant', 'blues12')
      break
    case 'popsoul':
      if (/9|chop|funk/i.test(chord + ' ' + l.name)) out.push('dominant', 'major', 'iiVI')
      else out.push(minor ? 'minor' : 'major', 'iiVI')
      break
    case 'neosoul':
      out.push(minor ? 'minor' : 'major', 'iiVI')
      break
    case 'funk':
      out.push('dominant', minor ? 'minor' : 'blues12')
      break
    case 'hawaiian':
      out.push('island', 'acoustic', 'major')
      break
    case 'reggaerock':
      out.push('island', minor ? 'minor' : 'major')
      break
    case 'bluegrass':
    case 'folk':
      out.push('acoustic', minor ? 'minor' : 'major')
      break
    case 'billy':
      out.push('acoustic', minor ? 'minor' : 'major', 'dominant')
      break
    case 'acoustic':
      out.push('acoustic', minor ? 'minor' : 'major')
      break
    case 'country':
      out.push('acoustic', 'dominant', 'major')
      break
    case 'fingerstyle':
      out.push('acoustic', minor ? 'minor' : 'major')
      break
    default:
      out.push(minor ? 'minor' : 'major')
  }

  if (/maj7|maj9|m9/i.test(chord) && !out.includes('iiVI')) out.push('iiVI')
  if (/(^|[^a-z])([A-G][#b]?)(7|9|13)\b/.test(chord) && !out.includes('dominant')) out.push('dominant')
  if (!out.length) out.push('major')
  return uniq(out)
}

/** Every exercise gets 1–3 progression/groove tags (delegates lick exercises directly to worksOverForLick). */
export function worksOverForExercise(ex: { type: string; name: string; minor?: boolean; chord?: string; lick?: string }): WorksOverId[] {
  if (ex.lick) {
    const l = lickById(ex.lick)
    if (l) return worksOverForLick(l)
  }
  const n = ex.name.toLowerCase()
  const c = ex.chord ?? ''
  switch (ex.type) {
    case 'warmup':
    case 'picking':
    case 'legato':
    case 'neck':
      return ['warmup', ex.minor ? 'minor' : 'major']
    case 'bends':
      return ['blues12', 'minor', 'dominant']
    case 'tapping':
      return ['heavy', ex.minor ? 'minor' : 'major']
    case 'rhythm':
      if (/5\/4|7\/4|djent|odd|gallop|metal/.test(n)) return ['heavy', 'minor']
      return ['warmup', 'dominant', 'major']
    case 'scales':
    case 'sequences':
    case 'intervals':
      if (/pentatonic|blues/.test(n)) return ex.minor ? ['minor', 'blues12'] : ['major', 'acoustic', 'dominant']
      if (/dorian/.test(n)) return ['minor', 'dominant', 'iiVI']
      if (/mixolydian/.test(n)) return ['dominant', 'blues12']
      if (/harmonic|phrygian|locrian|diminished/.test(n)) return ['heavy', 'minor']
      return ex.minor ? ['minor', 'warmup'] : ['major', 'acoustic', 'warmup']
    case 'arpeggios':
    case 'changes':
      if (/ii.?v|maj7|jazz|guide tone/.test(n + ' ' + c)) return ['iiVI', 'dominant', 'major']
      if (/blues|dom7|\b7\b/.test(n + ' ' + c)) return ['blues12', 'dominant']
      return ex.minor ? ['minor', 'iiVI'] : ['major', 'iiVI']
    case 'triads':
      return ex.minor ? ['minor', 'major'] : ['major', 'acoustic', 'iiVI']
    case 'chords':
    case 'strumming':
    case 'barre':
      if (/reggae|island|skank/.test(n)) return ['island', 'major']
      if (/blues|\b7\b/.test(n + ' ' + c)) return ['blues12', 'dominant']
      return ex.minor ? ['minor', 'acoustic'] : ['major', 'acoustic']
    case 'power':
      return ['heavy', 'minor']
    case 'fingerstyle':
    case 'melodic':
      return ex.minor ? ['minor', 'acoustic'] : ['acoustic', 'major']
    default:
      if (ex.type.startsWith('lick:')) return ['major']
      return ['warmup']
  }
}

export function worksOverSummary(tags: WorksOverId[], max = 2): string {
  return tags.slice(0, max).map(id => TAG_MAP.get(id)?.short ?? id).join(' · ')
}

export interface JamProfile {
  tonic: string
  minor: boolean
  mode: ModeId
  style: Style
  tags: WorksOverId[]
  chordSymbols: string[]
}

/** Infer which progression tags fit a chord progression + style (works live inside Jam or from persisted Jam state). */
export function jamProfile(prog: ProgChord[], tonic: string, mode: ModeId, style: Style): JamProfile {
  const minor = mode === 'minor' || mode === 'dorian' || mode === 'phrygian' || mode === 'harmonic'
  const symbols = prog.map(c => c.symbol)
  const tags: WorksOverId[] = []
  const domCount = symbols.filter(s => /^[A-G][#b]?(7|9|13)$/.test(s)).length
  const maj7Count = symbols.filter(s => /maj7|maj9/.test(s)).length
  const m7Count = symbols.filter(s => /m7|m9/.test(s)).length
  const powerCount = symbols.filter(s => /5$/.test(s)).length

  if (style === 'blues' || (domCount >= 2 && !minor)) tags.push('blues12', 'dominant')
  if (style === 'jazz' || style === 'bossa' || style === 'neosoul' || style === 'lofi' || (maj7Count >= 1 && m7Count >= 1)) tags.push('iiVI')
  if (style === 'funk' || style === 'funkpop' || style === 'motown' || mode === 'mixolydian' || domCount >= 1) tags.push('dominant')
  if (style === 'reggae' || style === 'reggaerock' || style === 'island' || style === 'slackkey') tags.push('island')
  if (style === 'bluegrass' || style === 'folk' || style === 'country' || style === 'acoustic' || style === 'fingerstyle') tags.push('acoustic')
  if (style === 'metal' || style === 'progmetal' || style === 'punk' || mode === 'phrygian' || mode === 'harmonic' || powerCount >= 2) tags.push('heavy')
  if (minor || style === 'rock' || style === 'grunge' || style === 'sad') tags.push('minor')
  if (!minor) tags.push('major')

  if (!tags.length) tags.push(minor ? 'minor' : 'major')
  return { tonic, minor, mode, style, tags: uniq(tags), chordSymbols: symbols }
}

/** Read Jam's current saved progression from localStorage so Learn libraries can filter by "Fits my Jam chords". */
export function currentJamProfile(): JamProfile | null {
  try {
    const rawProg = localStorage.getItem('kg:jamProg')
    const tonic = JSON.parse(localStorage.getItem('kg:progKey') ?? '"G"') as string
    const mode = JSON.parse(localStorage.getItem('kg:progMode') ?? '"major"') as ModeId
    const style = JSON.parse(localStorage.getItem('kg:progStyle') ?? '"any"') as Style
    const prog = rawProg ? (JSON.parse(rawProg) as ProgChord[]) : []
    return jamProfile(prog, tonic || 'G', mode || 'major', style || 'any')
  } catch {
    return null
  }
}

const STYLE_AFFINITY: Partial<Record<Style, string[]>> = {
  blues: ['blues', 'mayer', 'rock'],
  bluesrock: ['blues', 'rock', 'mayer'],
  rock: ['rock', 'blues', 'altrock'],
  classic: ['rock', 'blues'],
  metal: ['metal', 'progmetal', 'rock'],
  progmetal: ['progmetal', 'metal', 'progclean'],
  punk: ['rock', 'metal', 'altrock'],
  grunge: ['altrock', 'rock', 'metal'],
  indie: ['altrock', 'mathrock', 'acoustic'],
  jazz: ['jazz', 'neosoul', 'popsoul'],
  bossa: ['jazz', 'neosoul'],
  neosoul: ['neosoul', 'mayer', 'popsoul', 'jazz'],
  funk: ['funk', 'popsoul', 'neosoul'],
  funkpop: ['funk', 'popsoul', 'neosoul'],
  pop: ['popsoul', 'mayer', 'acoustic'],
  popballad: ['popsoul', 'mayer', 'acoustic', 'fingerstyle'],
  motown: ['popsoul', 'funk', 'neosoul'],
  reggae: ['reggaerock', 'hawaiian'],
  reggaerock: ['reggaerock', 'hawaiian'],
  island: ['hawaiian', 'reggaerock'],
  slackkey: ['hawaiian', 'fingerstyle'],
  bluegrass: ['bluegrass', 'billy', 'country'],
  country: ['country', 'bluegrass', 'acoustic'],
  folk: ['folk', 'acoustic', 'fingerstyle'],
  acoustic: ['acoustic', 'folk', 'fingerstyle', 'mayer'],
  fingerstyle: ['fingerstyle', 'folk', 'acoustic'],
  mathrock: ['mathrock', 'progclean', 'altrock'],
  progclean: ['progclean', 'mathrock', 'neosoul'],
}

/** Score how well a lick fits a Jam progression (> 0 means it fits; higher is better). */
export function lickMatchScore(l: LickDef, jam: JamProfile): number {
  if (!placeFor(l, jam.tonic)) return 0
  const st = lickStyle(l.style)
  const lMinor = l.minor ?? st.minor
  const tags = worksOverForLick(l)
  const overlap = tags.filter(t => jam.tags.includes(t)).length
  // minor pentatonic blues/rock licks work over blues dominant7 progressions in a major key too
  const bluesCross = !jam.minor && lMinor && (jam.tags.includes('blues12') || jam.tags.includes('dominant')) && (l.style === 'blues' || l.style === 'rock')
  const modeOk = lMinor === jam.minor || bluesCross
  if (!modeOk && overlap === 0) return 0

  let score = overlap * 10
  if (lMinor === jam.minor) score += 12
  else if (bluesCross) score += 7
  const aff = STYLE_AFFINITY[jam.style]
  if (aff) {
    const idx = aff.indexOf(l.style)
    if (idx === 0) score += 20
    else if (idx > 0) score += 10
  }
  if (l.id.startsWith('cl-')) score += 6
  if (l.must) score += 3
  return score
}

export function exerciseMatchesWorksOver(
  ex: { type: string; name: string; minor?: boolean; chord?: string; lick?: string },
  filter: 'all' | 'jam' | WorksOverId,
  jam: JamProfile | null,
): boolean {
  if (filter === 'all') return true
  const tags = worksOverForExercise(ex)
  if (filter === 'jam') {
    if (!jam) return true
    if (ex.lick) {
      const l = lickById(ex.lick)
      if (l) return lickMatchScore(l, jam) > 0
    }
    return tags.some(t => jam.tags.includes(t))
  }
  return tags.includes(filter)
}

/** Return top matching licks sorted by musical fit for Jam's live groove. */
export function matchingLicksForJam(all: LickDef[], jam: JamProfile, limit = 16): LickDef[] {
  return all
    .map(l => ({ l, s: lickMatchScore(l, jam) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || a.l.level - b.l.level)
    .slice(0, limit)
    .map(x => x.l)
}

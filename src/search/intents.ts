// Questions that carry a value: a chord ("G7", "c sharp minor chord"), a scale ("A minor pentatonic", "dorian in D"),
// a tuning ("drop D"), a tempo ("metronome 90", "6/8") or a jam ("blues in A", "reggae backing track"). Each becomes
// a result that opens the right tool already set up. Pure: no DOM.
import { KEYS } from '../theory/notes'
import { scaleById } from '../theory/scales'
import { chordSymbol, SUFFIX_FORMULA } from '../theory/chords'
import { STYLES, STYLE_DEFAULTS, type ModeId, type Style } from '../theory/progressions'
import type { InstrumentDef } from '../instrument'
import { words } from './text'
import type { JamPage, Result } from './types'

const LETTER: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }
export const keyName = (letter: string, acc: string) => KEYS[(LETTER[letter] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + 12) % 12]

/** Chord types as people write them (lower case). */
const SUFFIX: Record<string, string> = {
  '': 'major', maj: 'major', major: 'major', m: 'minor', min: 'minor', mi: 'minor', minor: 'minor',
  '5': '5', '7': '7', dom7: '7', maj7: 'maj7', ma7: 'maj7', m7: 'm7', min7: 'm7', mi7: 'm7',
  sus2: 'sus2', sus4: 'sus4', sus: 'sus4', add9: 'add9', add2: 'add9', madd9: 'madd9', minadd9: 'madd9',
  '6': '6', m6: 'm6', min6: 'm6', '69': '69', '6/9': '69', m69: 'm69', 'm6/9': 'm69',
  '9': '9', maj9: 'maj9', m9: 'm9', min9: 'm9', '11': '11', m11: 'm11', maj11: 'maj11', '13': '13', maj13: 'maj13',
  '7sus4': '7sus4', '7sus': '7sus4', dim: 'dim', dim7: 'dim7', m7b5: 'm7b5', min7b5: 'm7b5',
  aug: 'aug', '+': 'aug', aug7: 'aug7', '7#5': 'aug7', '+7': 'aug7', '7+': 'aug7', '7b5': '7b5', '7b9': '7b9', '7#9': '7#9',
  alt: 'alt', '7alt': 'alt', '9#11': '9#11', 'maj7#5': 'maj7#5', mmaj7: 'mmaj7', minmaj7: 'mmaj7', 'm/maj7': 'mmaj7',
}
/** Chord types said in words, after the root ("minor seven", "sus four", "power chord"). Longest first. */
const QUAL: [string, string][] = ([
  ['minor seven flat five', 'm7b5'], ['minor seventh flat five', 'm7b5'], ['half diminished', 'm7b5'], ['minor major seven', 'mmaj7'],
  ['minor add nine', 'madd9'], ['minor add 9', 'madd9'], ['seven sharp nine', '7#9'], ['7 sharp 9', '7#9'], ['seven flat nine', '7b9'],
  ['7 flat 9', '7b9'], ['seven sus four', '7sus4'], ['7 sus 4', '7sus4'], ['seven sus', '7sus4'], ['diminished seven', 'dim7'],
  ['diminished seventh', 'dim7'], ['diminished 7', 'dim7'], ['dim 7', 'dim7'], ['major seven', 'maj7'], ['major seventh', 'maj7'],
  ['major 7', 'maj7'], ['maj 7', 'maj7'], ['major nine', 'maj9'], ['major 9', 'maj9'], ['minor seven', 'm7'], ['minor seventh', 'm7'],
  ['minor 7', 'm7'], ['min 7', 'm7'], ['m 7', 'm7'], ['minor six', 'm6'], ['minor sixth', 'm6'], ['minor 6', 'm6'], ['minor nine', 'm9'],
  ['minor 9', 'm9'], ['dominant seven', '7'], ['dominant seventh', '7'], ['dominant 7', '7'], ['suspended two', 'sus2'],
  ['suspended second', 'sus2'], ['sus two', 'sus2'], ['sus 2', 'sus2'], ['suspended 2', 'sus2'], ['suspended four', 'sus4'],
  ['suspended fourth', 'sus4'], ['sus four', 'sus4'], ['sus 4', 'sus4'], ['suspended 4', 'sus4'], ['add nine', 'add9'], ['add 9', 'add9'],
  ['six nine', '69'], ['power chord', '5'], ['power', '5'], ['major', 'major'], ['maj', 'major'], ['minor', 'minor'], ['min', 'minor'],
  ['m', 'minor'], ['dominant', '7'], ['seven', '7'], ['seventh', '7'], ['diminished', 'dim'], ['dim', 'dim'], ['augmented', 'aug'],
  ['aug', 'aug'], ['suspended', 'sus4'], ['sus', 'sus4'], ['six', '6'], ['sixth', '6'], ['nine', '9'], ['ninth', '9'],
  ['eleven', '11'], ['eleventh', '11'], ['thirteen', '13'], ['thirteenth', '13'],
] as [string, string][]).map(([p, s]) => [p, s] as [string, string]).sort((a, b) => b[0].split(' ').length - a[0].split(' ').length)

/** Scale names as people say them → SCALES ids. Longest first. */
const SCALE_ALIAS: [string, string][] = ([
  ['minor pentatonic', 'minor pentatonic'], ['pentatonic minor', 'minor pentatonic'], ['major pentatonic', 'major pentatonic'],
  ['pentatonic major', 'major pentatonic'], ['pentatonic', 'minor pentatonic'], ['minor blues', 'minor blues'], ['major blues', 'major blues'],
  ['blues scale', 'minor blues'], ['blues', 'minor blues'], ['major scale', 'major'], ['ionian', 'major'], ['natural minor', 'aeolian'],
  ['aeolian', 'aeolian'], ['minor scale', 'aeolian'], ['dorian', 'dorian'], ['phrygian dominant', 'phrygian dominant'],
  ['spanish phrygian', 'phrygian dominant'], ['phrygian', 'phrygian'], ['lydian dominant', 'lydian dominant'], ['lydian', 'lydian'],
  ['mixolydian', 'mixolydian'], ['locrian', 'locrian'], ['harmonic minor', 'harmonic minor'], ['melodic minor', 'melodic minor'],
  ['jazz minor', 'melodic minor'], ['super locrian', 'altered'], ['altered', 'altered'], ['bebop', 'bebop'],
  ['diminished scale', 'half-whole diminished'], ['half whole', 'half-whole diminished'], ['whole tone', 'whole tone'],
  ['hungarian minor', 'hungarian minor'], ['gypsy', 'hungarian minor'], ['double harmonic', 'double harmonic major'],
  ['arabic', 'double harmonic major'], ['byzantine', 'double harmonic major'], ['hirajoshi', 'hirajoshi'], ['japanese', 'hirajoshi'],
] as [string, string][]).sort((a, b) => b[0].split(' ').length - a[0].split(' ').length)
/** Names that only ever mean a scale (unlike "blues" or "minor"). */
const SURE_SCALE = new Set(['minor pentatonic', 'major pentatonic', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian', 'harmonic minor',
  'melodic minor', 'phrygian dominant', 'lydian dominant', 'altered', 'bebop', 'half-whole diminished', 'whole tone', 'hungarian minor',
  'double harmonic major', 'hirajoshi'])
/** Scales that are also Jam modes. */
const SCALE_MODE: Record<string, ModeId> = { major: 'major', aeolian: 'minor', dorian: 'dorian', mixolydian: 'mixolydian', phrygian: 'phrygian', lydian: 'lydian', 'harmonic minor': 'harmonic' }

const STYLE_ALIAS: [string, Style][] = ([
  ['classic rock', 'classic'], ['pop punk', 'punk'], ['heavy metal', 'metal'], ['dream pop', 'indie'], ['bossa nova', 'bossa'],
  ['neo soul', 'neosoul'], ['r and b', 'neosoul'], ['lo fi', 'lofi'], ['twelve bar', 'blues'], ['12 bar', 'blues'],
  ['pop', 'pop'], ['rock', 'rock'], ['punk', 'punk'], ['metal', 'metal'], ['grunge', 'grunge'], ['alternative', 'grunge'], ['alt', 'grunge'],
  ['indie', 'indie'], ['blues', 'blues'], ['bluesy', 'blues'], ['jazz', 'jazz'], ['jazzy', 'jazz'], ['bossa', 'bossa'], ['samba', 'bossa'],
  ['soul', 'neosoul'], ['rnb', 'neosoul'], ['funk', 'funk'], ['funky', 'funk'], ['gospel', 'gospel'], ['church', 'gospel'], ['folk', 'folk'],
  ['country', 'country'], ['reggae', 'reggae'], ['ska', 'reggae'], ['latin', 'latin'], ['flamenco', 'latin'], ['rumba', 'latin'],
  ['lofi', 'lofi'], ['chill', 'lofi'], ['chillhop', 'lofi'], ['cinematic', 'epic'], ['epic', 'epic'], ['film', 'epic'], ['sad', 'sad'],
  ['emotional', 'sad'], ['melancholy', 'sad'], ['happy', 'happy'], ['uplifting', 'happy'], ['upbeat', 'happy'],
  ['fingerstyle', 'fingerstyle'], ['melodic fingerstyle', 'fingerstyle'], ['cirillo', 'fingerstyle'], ['marco cirillo', 'fingerstyle'],
  ['hip hop', 'hiphop'], ['hiphop', 'hiphop'], ['boom bap', 'hiphop'], ['rap', 'hiphop'], ['trap', 'trap'], ['808', 'trap'],
  ['house', 'dance'], ['dance', 'dance'], ['edm', 'dance'], ['techno', 'dance'], ['motown', 'motown'], ['classic soul', 'motown'],
  ['afrobeat', 'afrobeat'], ['afrobeats', 'afrobeat'], ['reggaeton', 'reggaeton'], ['dembow', 'reggaeton'], ['latin pop', 'reggaeton'],
  ['salsa', 'salsa'], ['son', 'salsa'], ['jawaiian', 'island'], ['island reggae', 'island'], ['hawaiian reggae', 'island'],
] as [string, Style][]).sort((a, b) => b[0].split(' ').length - a[0].split(' ').length)

const TUNING_ALIAS: Record<string, string[]> = {
  standard: ['standard tuning', 'eadgbe', 'e standard'], halfdown: ['half step down', 'eb standard', 'e flat standard', 'eb tuning', 'e flat tuning', 'd# standard', 'half step tuning'],
  dropd: ['drop d', 'dropd'], dadgad: ['dadgad'], openg: ['open g'], opend: ['open d'], dropc: ['drop c', 'dropc'],
  'tenor-high': ['high g', 'reentrant', 're entrant', 'gcea'], 'tenor-low': ['low g'], bari: ['dgbe', 'baritone standard', 'standard baritone'],
  'bari-high': ['high d'],
}
const SIGS = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '12/8']

const CHORD_WORDS = new Set(['chord', 'chords', 'shape', 'shapes', 'voicing', 'voicings', 'grip', 'fingering', 'diagram', 'strum'])
const SCALE_WORDS = new Set(['scale', 'scales', 'mode', 'modes'])
const JAM_WORDS = new Set(['jam', 'jams', 'jamming', 'backing', 'progression', 'progressions', 'band', 'groove', 'accompaniment', 'improvise', 'solo', 'soloing'])
const TEMPO_WORDS = new Set(['bpm', 'metronome', 'click', 'tempo', 'beat', 'beats', 'tick', 'pulse'])
const TUNE_WORDS = new Set(['tuning', 'tune', 'tuner', 'tuned', 'tunings', 'retune'])

interface Root { root: string; at: number; end: number; strong: boolean }
/** A root note at word i: "g", "c#", "bb", "c sharp", "b flat". */
function rootAt(ws: string[], i: number): Root | null {
  const m = /^([a-g])(#|b)?$/.exec(ws[i] ?? '')
  if (!m) return null
  let acc = m[2] ?? '', end = i + 1
  if (!acc && (ws[i + 1] === 'sharp' || ws[i + 1] === '#')) { acc = '#'; end++ }
  else if (!acc && ws[i + 1] === 'flat') { acc = 'b'; end++ }
  return { root: keyName(m[1], acc), at: i, end, strong: !!acc }
}
/** A chord symbol in one word: "g7", "f#m", "bbmaj7", "c#m7b5". */
function symbolAt(ws: string[], i: number): { root: string; suffix: string } | null {
  const m = /^([a-g])(#|b)?(.+)$/.exec(ws[i] ?? '')
  if (!m) return null
  const suffix = SUFFIX[m[3]]
  return suffix ? { root: keyName(m[1], m[2] ?? ''), suffix } : null
}
/** Chord type words starting at word i ("minor seven" → m7). */
function qualAt(ws: string[], i: number): { suffix: string; end: number } | null {
  for (const [p, s] of QUAL) {
    const pw = p.split(' ')
    if (pw.every((w, k) => ws[i + k] === w)) return { suffix: s, end: i + pw.length }
  }
  return null
}
function phraseAt<T>(ws: string[], list: [string, T][]): { value: T; at: number; end: number; phrase: string } | null {
  for (let i = 0; i < ws.length; i++) {
    for (const [p, v] of list) {
      const pw = p.split(' ')
      if (pw.every((w, k) => ws[i + k] === w)) return { value: v, at: i, end: i + pw.length, phrase: p }
    }
  }
  return null
}

const chordTitle = (root: string, suffix: string) => `${chordSymbol(root, suffix)} chord`
const scaleTitle = (root: string | undefined, id: string) => `${root ? root + ' ' : ''}${scaleById(id).label.toLowerCase().replace(/^blues \((minor|major)\)$/, '$1 blues')} scale`
const modeLabel = (m: ModeId) => (m === 'harmonic' ? 'harmonic minor' : m === 'major' ? 'major' : m === 'minor' ? 'minor' : m)

/** Results for the values in a question. `inst` decides which tunings exist. */
export function intents(query: string, inst: InstrumentDef): Result[] {
  const ws = words(query)
  if (!ws.length) return []
  const has = (set: Set<string>) => ws.some(w => set.has(w))
  const chordCtx = has(CHORD_WORDS)
  const scaleCtx = has(SCALE_WORDS)
  const tempoCtx = has(TEMPO_WORDS)
  const tuneCtx = has(TUNE_WORDS)
  const jamCtx = has(JAM_WORDS) || /\b(backing track|play along|chord progression|twelve bar|12 bar)\b/.test(ws.join(' '))
  const songCtx = ws.some(w => w === 'song' || w === 'songs' || w === 'songbook')
  const out: Result[] = []
  const add = (r: Omit<Result, 'id'> & { id?: string }) => { if (!out.some(o => o.title === r.title)) out.push({ id: r.id ?? `i:${r.kind}:${r.title}`, ...r }) }

  // ---- tuning ("drop d", "open g tuning", "half step down")
  const joined = ' ' + ws.join(' ') + ' '
  for (const t of inst.tunings) {
    const aliases = [...(TUNING_ALIAS[t.id] ?? []), t.name.toLowerCase()]
    const hit = aliases.find(a => joined.includes(' ' + a + ' '))
    if (!hit) continue
    const ambiguous = hit === 'standard' || hit === 'low g' || hit === 'high g' || hit === 'high d'
    if (chordCtx && /^open/.test(hit)) continue
    const notes = t.notes.map(n => n.replace(/\d/g, '')).join(' ')
    add({ kind: 'tuning', title: `Tune to ${t.name}`, where: 'Tools → Tuner', text: `Sets your ${inst.noun} to ${t.name} (${notes}) and opens the tuner. The whole app follows the new tuning.`, target: { tuning: t.id }, score: tuneCtx || !ambiguous ? 96 : 70 })
  }

  // ---- tempo ("metronome 90", "120 bpm", "click in 6/8")
  const num = ws.map(w => (/^\d{2,3}$/.test(w) ? Number(w) : NaN)).find(n => n >= 20 && n <= 300)
  const sig = ws.find(w => SIGS.includes(w))
  if ((num && (tempoCtx || ws.length <= 2 && ws.includes('bpm'))) || (sig && !jamCtx)) {
    if (!jamCtx) {
      const title = num && sig ? `Metronome at ${num} bpm in ${sig}` : num ? `Metronome at ${num} bpm` : `Metronome in ${sig}`
      add({ kind: 'metronome', title, where: 'Tools → Tempo', text: 'Opens the metronome set to that. Tap Start; tap a beat light to change its accent.', target: { metronome: { bpm: num, sig } }, score: 95 })
    }
  }

  // ---- scale ("a minor pentatonic", "dorian in d", "e blues scale")
  const sc = phraseAt(ws, SCALE_ALIAS)
  let scaleRoot: Root | null = null
  if (sc) {
    // the root before the name ("a minor pentatonic"), or after it ("pentatonic in a", "dorian d")
    for (let back = 1; back <= 3 && !scaleRoot; back++) { const r = rootAt(ws, sc.at - back); if (r && r.end === sc.at) scaleRoot = r }
    if (!scaleRoot) { const after = ws[sc.end] === 'in' || ws[sc.end] === 'of' ? sc.end + 1 : sc.end; scaleRoot = rootAt(ws, after) }
    let id = sc.value
    // "pentatonic in a minor" / "a major … pentatonic"
    if (sc.phrase === 'pentatonic' && ws.includes('major')) id = 'major pentatonic'
    if (sc.phrase === 'blues' && ws.includes('major')) id = 'major blues'
    const sure = SURE_SCALE.has(id) || scaleCtx || sc.phrase === 'blues scale' || sc.phrase === 'major scale' || sc.phrase === 'minor scale' || sc.phrase === 'natural minor'
    if (!jamCtx || scaleCtx) {
      const info = scaleById(id)
      add({ kind: 'scale', title: scaleTitle(scaleRoot?.root, id), where: 'Tools → Scales', text: `${info.feel ? info.feel + '. ' : ''}The whole neck, or one position at a time.`, target: { scale: { root: scaleRoot?.root, scale: id } }, score: sure ? 96 : 66 })
    }
  }

  // ---- chord ("g7", "c sharp minor chord", "how do i play an e chord")
  const chordHits: { root: string; suffix: string; score: number }[] = []
  for (let i = 0; i < ws.length; i++) {
    const sym = symbolAt(ws, i)
    if (sym && sym.suffix !== 'major') {
      // "am" is also an English word: only a chord when the question is short or about chords
      if (ws[i] === 'am' && !chordCtx && ws.length > 2) continue
      // "a minor pentatonic": the scale took it
      if (sc && scaleRoot && scaleRoot.at === i) continue
      chordHits.push({ ...sym, score: chordCtx || ws.length <= 3 ? 97 : 82 })
      continue
    }
    const r = rootAt(ws, i)
    if (!r) continue
    if (sc && scaleRoot && scaleRoot.at === i) continue
    const q = qualAt(ws, r.end)
    const isArticle = ws[i] === 'a' && !r.strong
    if (q) {
      if (isArticle && !['major', 'minor', 'm', '7', 'm7', 'maj7', 'sus2', 'sus4', 'dim', 'aug', '5'].includes(q.suffix)) continue
      if (isArticle && q.suffix === '5' && !chordCtx) continue
      // "a minor" with jam or scale words around is a key, handled below
      const plain = q.suffix === 'major' || q.suffix === 'minor'
      chordHits.push({ root: r.root, suffix: q.suffix, score: chordCtx ? 97 : plain ? (jamCtx || scaleCtx || songCtx ? 55 : 88) : 90 })
      i = q.end - 1
      continue
    }
    // a bare root: a chord only next to a chord word ("g chord", "chord of e", "an a chord")
    const near = CHORD_WORDS.has(ws[r.end] ?? '') || (CHORD_WORDS.has(ws[i - 1] ?? '') || ws[i - 1] === 'of' && CHORD_WORDS.has(ws[i - 2] ?? ''))
    if (!near) continue
    if (isArticle && !['an', 'the'].includes(ws[i - 1] ?? '') && ws.length > 2) continue
    chordHits.push({ root: r.root, suffix: 'major', score: isArticle ? 72 : 94 })
  }
  for (const c of chordHits.slice(0, 3)) {
    add({ kind: 'chord', title: chordTitle(c.root, c.suffix), where: 'Tools → Chords', text: `Shapes for ${chordSymbol(c.root, c.suffix)} (${SUFFIX_FORMULA[c.suffix] ?? c.suffix}). Tap a shape to hear it.`, target: { chord: { root: c.root, suffix: c.suffix } }, score: c.score })
  }
  // "a minor" on its own: also offer the scale and a jam in that key
  const plainKey = chordHits.find(c => (c.suffix === 'major' || c.suffix === 'minor') && c.score >= 55)
  if (plainKey && !sc && !chordCtx) {
    const id = plainKey.suffix === 'minor' ? 'aeolian' : 'major'
    add({ kind: 'scale', title: scaleTitle(plainKey.root, id), where: 'Tools → Scales', text: `${scaleById(id).feel}. The whole neck, or one position at a time.`, target: { scale: { root: plainKey.root, scale: id } }, score: scaleCtx ? 96 : 78 })
  }

  // ---- jam ("blues in a", "reggae backing track", "jam in e minor", "sad chord progression")
  const st = phraseAt(ws, STYLE_ALIAS)
  // genre words next to "song(s)" mean the songbook, not a jam
  if (jamCtx || (st && !songCtx && !(st.value === 'blues' && sc && scaleCtx))) {
    let key: string | undefined, mode: ModeId | undefined
    const kIdx = ws.findIndex((w, i) => (w === 'in' || w === 'of') && rootAt(ws, i + 1))
    const kr = kIdx >= 0 ? rootAt(ws, kIdx + 1) : null
    const symKey = ws.map((_, i) => symbolAt(ws, i)).find(s => s && (s.suffix === 'minor' || s.suffix === 'major') && (jamCtx || st))
    if (kr) {
      key = kr.root
      const q = qualAt(ws, kr.end)
      if (q?.suffix === 'minor') mode = 'minor'
      else if (q?.suffix === 'major') mode = 'major'
    } else if (symKey) { key = symKey.root; mode = symKey.suffix === 'minor' ? 'minor' : 'major' }
    else if (plainKey) { key = plainKey.root; mode = plainKey.suffix === 'minor' ? 'minor' : 'major' }
    if (sc && SCALE_MODE[sc.value] && sc.phrase !== 'blues') mode = SCALE_MODE[sc.value]
    if (!key && scaleRoot) key = scaleRoot.root
    const style = st?.value
    // a bare "solo" or "jam" is a feature, not a new progression: it needs a style or a key
    if (!style && !key) return out
    const page: JamPage = ws.some(w => w === 'solo' || w === 'soloing' || w === 'improvise') ? 'solo' : 'jam'
    const bpm = num && (tempoCtx || jamCtx) ? num : undefined
    const styleLabel = style ? STYLES.find(s => s.id === style)!.label.toLowerCase() : ''
    const keyLabel = key ? ` in ${key}${mode && mode !== 'major' ? ' ' + modeLabel(mode) : ''}` : ''
    const title = `Jam: ${style ? styleLabel : mode && !key ? modeLabel(mode) : 'a new'} progression${keyLabel}`.replace('Jam: a new progression in', 'Jam: a progression in')
    const extra = style ? `${STYLE_DEFAULTS[style].bpm} bpm, ${STYLES.find(s => s.id === style)!.label} drums, bass and guitar` : 'drums and bass'
    add({ kind: 'jam', title, where: page === 'solo' ? 'Jam → Solo over it' : 'Jam', text: `Makes a new chord progression to play over, with ${extra}. Tap Play loop to start.`, target: { jam: { key, mode, style, bpm, page } }, score: jamCtx ? 94 : style ? 72 : 60 })
  }
  return out
}

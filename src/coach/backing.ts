// Coach-made backing tracks: "you've been playing this — improvise over a band in the same key and style". The style
// comes from what you asked for ("metal chugs"), the song (its band style, low tunings, palm-muted power chords), or
// your style path; the key from the song's notes. Jam makes the chords, strum or chugs, bass and drums.
import type { Song } from '../tabs/model'
import type { KeyGuess } from '../tabs/keyDetect'
import { STYLE_DEFAULTS, STYLES, type ModeId, type Style } from '../theory/progressions'
import { guessBandStyle } from '../audio/band'
import type { JamTarget } from '../search/types'

/** your style path → the Jam style that backs it */
export const PATH_STYLE: Record<string, Style> = {
  flatpick: 'bluegrass', songwriter: 'acoustic', reggae: 'reggaerock', bluesrock: 'bluesrock', popsoul: 'funkpop',
  prog: 'progmetal', slackkey: 'slackkey', classical: 'classical', fingerstyle: 'fingerstyle',
}

/** words you might say → a style ("metal chugs", "something bluesy", "a reggae groove") */
const WORDS: [RegExp, Style][] = [
  [/djent|prog ?metal/i, 'progmetal'], [/metal|chug|heavy|thrash|riff/i, 'metal'], [/blues ?rock|neo.?soul/i, 'bluesrock'], [/blues/i, 'blues'],
  [/reggae ?rock/i, 'reggaerock'], [/reggae|skank|dub/i, 'reggae'], [/bluegrass|flatpick/i, 'bluegrass'], [/slack ?key|hawaiian/i, 'slackkey'],
  [/funk/i, 'funkpop'], [/jazz/i, 'jazz'], [/country/i, 'country'], [/punk/i, 'punk'], [/classical|nylon/i, 'classical'],
  [/fingerstyle|finger.?picking/i, 'fingerstyle'], [/acoustic|singer.?songwriter|folk/i, 'acoustic'], [/ballad|slow/i, 'popballad'],
  [/math ?rock/i, 'mathrock'], [/prog/i, 'progclean'], [/rock/i, 'rock'], [/pop/i, 'pop'], [/lo.?fi|chill/i, 'lofi'],
]
export function styleFromWords(text: string): Style | undefined {
  for (const [re, s] of WORDS) if (re.test(text)) return s
  return undefined
}

/** What the song itself sounds like it wants: a low tuning or palm-muted power chords mean metal or rock. */
export function styleFromSong(song: Song, title = '', artist = '', picked?: string): { style: Style; why: string } {
  const tr = song.tracks[0]
  const low = tr ? Math.min(...tr.tuning) : 40
  let pm = 0, power = 0, notes = 0
  for (const bar of tr?.bars ?? []) for (const s of bar.steps) {
    if (!s.notes.length) continue
    notes++
    if (s.notes.some(n => /pm/i.test(n.tech ?? ''))) pm++
    const m = s.notes.map(n => n.midi).sort((a, b) => a - b)
    if (m.length >= 2 && m.length <= 3 && m[1] - m[0] === 7) power++
  }
  const words = `${title} ${artist}`
  const named = styleFromWords(words)
  if (named && named !== 'pop' && named !== 'rock') return { style: named, why: `it's ${STYLES.find(x => x.id === named)?.label.toLowerCase()}` }
  if (low < 40) return { style: (song.tempo ?? 120) < 110 ? 'progmetal' : 'metal', why: 'the song is in a low tuning' }
  if (notes && (pm + power) / notes > 0.25) return { style: (song.tempo ?? 120) >= 120 || pm > power ? 'metal' : 'rock', why: 'the song is full of palm-muted power chords' }
  if (picked && STYLES.some(x => x.id === picked)) return { style: picked as Style, why: 'it matches the band style you picked for this song' }
  const g = guessBandStyle(song, title, artist)
  return { style: g, why: 'that fits the song' }
}

export interface BackingPlan extends Required<Pick<JamTarget, 'key' | 'mode' | 'style' | 'bpm'>> {
  /** what the coach says */
  text: string
  /** the scale to solo with */
  scale: string
}

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const PCS: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }
const relMinor = (root: string) => NAMES[((PCS[root] ?? 0) + 9) % 12]
const MINORISH: ModeId[] = ['minor', 'dorian', 'phrygian', 'harmonic']
/** Put the plan together. `asked` = what you said, if anything; `path` = your style path's id, if any. */
export function backingFor(o: { song?: Song; title?: string; artist?: string; picked?: string; key?: KeyGuess | null; asked?: string; path?: string; speed?: number }): BackingPlan {
  let style: Style, why: string
  const said = o.asked ? styleFromWords(o.asked) : undefined
  if (said) { style = said; why = 'you asked for it' }
  else if (o.song) ({ style, why } = styleFromSong(o.song, o.title, o.artist, o.picked))
  else if (o.path && PATH_STYLE[o.path]) { style = PATH_STYLE[o.path]; why = 'it\'s your style path' }
  else { style = 'rock'; why = 'a good all-round groove' }
  // the song's style path wins over a plain guess
  if (!said && o.path && PATH_STYLE[o.path] && /fits the song/.test(why)) { style = PATH_STYLE[o.path]; why = 'it\'s your style path' }
  const d = STYLE_DEFAULTS[style]
  let root = o.key?.root ?? (d.mode && MINORISH.includes(d.mode) ? 'E' : 'G')
  let minor = o.key ? o.key.minor : !!d.mode && MINORISH.includes(d.mode)
  // metal over a major-key song: its relative minor (the same notes, the dark side of them)
  let rel = ''
  if (!minor && (style === 'metal' || style === 'progmetal')) { const r = relMinor(root); rel = ` (the same notes as ${root} major)`; root = r; minor = true }
  // a minor song keeps the style's own minor colour (prog metal → minor, funk → dorian); a major one goes major or mixolydian
  let mode: ModeId = minor ? (d.mode && MINORISH.includes(d.mode) ? d.mode : 'minor') : (d.mode && !MINORISH.includes(d.mode) ? d.mode : 'major')
  if (!minor && (style === 'blues' || style === 'bluesrock')) mode = 'mixolydian'
  // the song's own tempo at the speed you've been playing it, kept to the style's range
  const songBpm = o.song?.tempo ? o.song.tempo * (o.speed ?? 1) : 0
  const bpm = Math.round(songBpm ? Math.max(d.bpm * 0.6, Math.min(d.bpm * 1.3, songBpm)) : d.bpm)
  const scale = minor
    ? (style === 'metal' || style === 'progmetal' ? `${root} natural minor (or ${root} minor pentatonic)` : mode === 'dorian' ? `${root} dorian` : `${root} minor pentatonic`)
    : mode === 'mixolydian' ? `${root} major and minor pentatonic mixed` : `${root} major pentatonic`
  const label = STYLES.find(x => x.id === style)?.label ?? style
  const text = `${label} backing in ${root} ${minor ? 'minor' : 'major'}${rel} at ${bpm} BPM (${why}). Solo with ${scale}; change the speed in Jam any time.`
  return { key: root, mode, style, bpm, text, scale }
}

// Chord sheets (chords written above lyrics, the most common way songs are shared online) → a song you can
// strum along to: one chord per bar, shown with its shape on your instrument, with the lyrics underneath.
import { chordShapes, generateShapes, type Instrument } from '../instrument'
import { parseSymbol } from '../theory/chords'
import type { Song, SongStep } from './model'

const CHORD_RE = /^[A-G][#b]?(?:maj|min|m|M|dim|aug|sus|add|°|ø|\+|-)?[0-9]*(?:(?:maj|sus|add|b|#|\+|-)?[0-9]+)*(?:\([^)]*\))?(?:\/[A-G][#b]?)?$/
const SECTION_RE = /^\s*[[(]?\s*(intro|verse|pre-?chorus|chorus|bridge|outro|solo|interlude|instrumental|refrain|hook|coda|ending|break)\b[^\]\n]*[\])]?\s*:?\s*$/i

function chordTokens(line: string): { col: number; name: string }[] | null {
  const out: { col: number; name: string }[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    const tok = m[0].replace(/^[(|]+|[)|]+$/g, '')
    if (!tok || tok === '|' || tok === '/' || tok === '%' || /^x\d+$/i.test(tok) || tok === '-') continue
    if (!CHORD_RE.test(tok)) return null
    out.push({ col: m.index, name: tok })
  }
  return out.length ? out : null
}

function clean(text: string) {
  return text
    .replace(/\[ch\](.*?)\[\/ch\]/g, '$1')
    .replace(/\[\/?tab\]/gi, '')
    .replace(/\t/g, '    ')
}

/** The shape to show and listen for: the first (most common) shape on this instrument. */
export function shapeNotes(name: string, inst: Instrument, capo: number) {
  const { root, suffix } = parseSymbol(name)
  const v = chordShapes(root, suffix, inst)[0] ?? generateShapes(root, suffix, inst.midis, 1)[0] ?? generateShapes(root, 'major', inst.midis, 1)[0]
  if (!v) return []
  return v.frets
    .map((f, s) => (f < 0 ? null : { string: s, fret: f, midi: inst.midis[s] + capo + f }))
    .filter((n): n is { string: number; fret: number; midi: number } => !!n)
}

export function parseChordSheet(text: string, title: string, inst: Instrument, beatsPerChord = 4): Song | null {
  const lines = clean(text).split(/\r?\n/)
  const capoM = /capo[^0-9\n]{0,12}(\d{1,2})/i.exec(text)
  const capo = capoM ? Math.min(12, parseInt(capoM[1], 10)) : 0
  const steps: SongStep[] = []
  let section: string | undefined
  let chordsSeen = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    if (SECTION_RE.test(line)) { section = line.trim().replace(/^[[(]|[\])]:?$|:$/g, '').trim(); continue }
    const toks = chordTokens(line)
    if (!toks) continue
    // the lyric line right under the chords (if the next line isn't chords too)
    const next = lines[i + 1] ?? ''
    const lyric = next.trim() && !chordTokens(next) && !SECTION_RE.test(next) ? next : ''
    // a chord sits over the syllable where it changes: split the words at the start of that word
    const wordStart = (col: number) => { let c = Math.min(col, lyric.length); while (c > 0 && c < lyric.length && lyric[c - 1] !== ' ' && lyric[c] !== ' ') c--; return c }
    toks.forEach((t, k) => {
      const from = k === 0 ? 0 : wordStart(t.col)
      const end = k + 1 < toks.length ? wordStart(toks[k + 1].col) : lyric.length
      let words = lyric ? lyric.slice(from, Math.max(from, end)).trim() : ''
      if (words.length > 40) words = words.slice(0, 38) + '…'
      steps.push({ dur: beatsPerChord, chord: t.name, notes: shapeNotes(t.name, inst, capo), ...(words ? { lyric: words } : {}), ...(section ? { section } : {}) })
      section = undefined
      chordsSeen++
    })
    if (lyric) i++
  }
  if (chordsSeen < 3) return null
  const firstTitle = lines.find(l => l.trim() && !chordTokens(l) && !SECTION_RE.test(l) && !/capo|tuning|key:/i.test(l))?.trim()
  return {
    title: title !== 'Pasted tab' ? title : firstTitle && firstTitle.length < 60 ? firstTitle : title,
    tempo: 90,
    tracks: [{ name: 'Chords', tuning: inst.midis, capo, bars: steps.map(s => ({ steps: [s] })) }],
  }
}

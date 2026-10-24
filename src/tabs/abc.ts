// A small reader for ABC, the plain-text notation folk and fiddle tunes are shared in (abcnotation.com, The Session,
// the Traditional Tune Archive). Enough of it for the songbook: header (M: L: K: Q:), notes with accidentals and
// octaves, lengths (2, /2, 3/2, >, <), rests, ties, triplets, chord names in quotes, bar lines, repeats and
// first/second endings. Grace notes, decorations and slurs are skipped.

export interface AbcNote {
  /** MIDI pitch as written (C = middle C = 60), or null for a rest */
  midi: number | null
  /** length in quarter notes */
  dur: number
  chord?: string
}
export interface AbcTune {
  bars: AbcNote[][]
  /** beats (quarter notes) in a full bar */
  meter: number
  /** quarter notes per minute if the tune says (Q:) */
  tempo?: number
  key: string
}

const LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const ORDER_SHARPS = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
// how many sharps (+) or flats (−) each major key has
const MAJOR: Record<string, number> = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7 }
const MODE_SHIFT: Record<string, number> = { maj: 0, ion: 0, mix: -1, dor: -2, aeo: -3, min: -3, m: -3, phr: -4, loc: -5, lyd: 1 }

/** Accidentals of a key signature like "G", "Ador", "A mixolydian", "Em", "Bb". */
export function keySignature(k: string): Record<string, number> {
  const m = /^\s*([A-G])([#b]?)\s*([A-Za-z]*)/.exec(k)
  const out: Record<string, number> = {}
  if (!m) return out
  const tonic = m[1] + m[2]
  const mode = m[3].toLowerCase().slice(0, 3) || 'maj'
  const shift = MODE_SHIFT[mode] ?? (m[3].toLowerCase().startsWith('m') ? -3 : 0)
  // the major key with the same notes: this tonic's major key moved round the circle of fifths by the mode
  const base = MAJOR[tonic] ?? (tonic === 'G#' ? 8 : tonic === 'D#' ? 9 : tonic === 'A#' ? 10 : 0)
  const n = Math.max(-7, Math.min(7, base + shift))
  if (n > 0) for (const l of ORDER_SHARPS.slice(0, n)) out[l] = 1
  if (n < 0) for (const l of [...ORDER_SHARPS].reverse().slice(0, -n)) out[l] = -1
  return out
}

function frac(s: string): number {
  const m = /^(\d+)\/(\d+)$/.exec(s)
  return m ? Number(m[1]) / Number(m[2]) : Number(s)
}

/** Read one tune. Repeats and endings are played out in order, so the bars come back as heard. */
export function parseAbc(text: string): AbcTune {
  let unit = 0.5 // L:1/8 → an eighth = half a quarter
  let meter = 4
  let tempo: number | undefined
  let key = 'C'
  const body: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/%.*$/, '')
    const h = /^([A-Za-z]):\s*(.*)$/.exec(line.trim())
    if (h && !/^\|/.test(line.trim())) {
      const [, f, v] = h
      if (f === 'L') unit = frac(v.trim()) * 4
      else if (f === 'M') meter = v.trim() === 'C' || v.trim() === 'C|' ? 4 : (() => { const [a, b] = v.trim().split('/').map(Number); return a && b ? (a * 4) / b : 4 })()
      else if (f === 'Q') { const q = /(\d+)\s*$/.exec(v); const bt = /(\d+)\/(\d+)\s*=/.exec(v); if (q) tempo = Number(q[1]) * (bt ? (Number(bt[1]) / Number(bt[2])) * 4 : 1) }
      else if (f === 'K') key = v.trim()
      continue
    }
    if (line.trim()) body.push(line)
  }
  const sig = keySignature(key)
  type Bar = { notes: AbcNote[]; start?: boolean; end?: boolean; ending?: number }
  let ending = 0
  const bars: Bar[] = []
  let cur: Bar = { notes: [] }
  let acc: Record<string, number> = {}
  let pendingChord: string | undefined
  let tuplet: { left: number; scale: number } | null = null
  let tie = false
  let lastBroken = 0
  const src = body.join(' ')
  let last: AbcNote | null = null
  const pushBar = () => {
    if (ending) cur.ending = ending
    if (cur.notes.length || cur.end || cur.start) bars.push(cur)
    cur = { notes: [] }
    acc = {}
  }
  let i = 0
  while (i < src.length) {
    const c = src[i]
    // chord name
    if (c === '"') {
      const j = src.indexOf('"', i + 1)
      const name = src.slice(i + 1, j < 0 ? undefined : j).trim()
      if (/^[A-G]/.test(name)) pendingChord = name.split(/\s|\(/)[0]
      i = j < 0 ? src.length : j + 1
      continue
    }
    // grace notes, decorations
    if (c === '{') { const j = src.indexOf('}', i); i = j < 0 ? src.length : j + 1; continue }
    if (c === '!' || c === '+') { const j = src.indexOf(c, i + 1); i = j < 0 ? src.length : j + 1; continue }
    // bar lines, repeats, endings
    if (c === '|' || c === ':' || (c === '[' && /\d/.test(src[i + 1] ?? ''))) {
      let tok = ''
      while (i < src.length && /[|:\]\[]/.test(src[i]) && !(src[i] === '[' && /[A-Ga-gz]/.test(src[i + 1] ?? ''))) tok += src[i++]
      const num = /^(\d)/.exec(src.slice(i))
      if (tok.includes('|') || tok.includes(':')) {
        const end = tok.startsWith(':') || tok.includes(':|') || tok.includes('::')
        if (end) cur.end = true
        pushBar()
        // an ending lasts until the repeat sign (1st) or a double bar / new section (2nd)
        if (end || tok.includes('||') || tok.includes(']') || tok.endsWith(':')) ending = 0
        if (tok.endsWith(':') || tok.includes('|:') || tok.includes('::')) cur.start = true
      }
      if (num && (tok.endsWith('[') || tok.endsWith('|'))) { ending = Number(num[1]); i += 1; while (src[i] === ',' || /\d/.test(src[i] ?? '')) i++ }
      continue
    }
    if (c === '(' && /\d/.test(src[i + 1] ?? '')) { const n = Number(src[i + 1]); tuplet = { left: n, scale: n === 3 ? 2 / 3 : n === 2 ? 3 / 2 : n === 4 ? 3 / 4 : 2 / n }; i += 2; continue }
    if (c === '-') { tie = true; i++; continue }
    if (c === '>' || c === '<') { lastBroken = c === '>' ? 1 : -1; i++; continue }
    const m = /^([_^=]*)([A-Ga-gz])([,']*)(\d*\/*\d*)/.exec(src.slice(i))
    if (!m) { i++; continue }
    i += m[0].length
    const [, accs, letter, oct, len] = m
    let dur = 1
    if (len) {
      const lm = /^(\d*)(\/*)(\d*)$/.exec(len)!
      const num = lm[1] ? Number(lm[1]) : 1
      const den = lm[3] ? Number(lm[3]) : lm[2] ? 2 ** lm[2].length : 1
      dur = num / den
    }
    dur *= unit
    if (tuplet) { dur *= tuplet.scale; if (--tuplet.left <= 0) tuplet = null }
    // broken rhythm: a>b = dotted then short
    const prev = cur.notes[cur.notes.length - 1]
    if (lastBroken && prev) {
      const half = dur / 2
      if (lastBroken > 0) { prev.dur += half; dur -= half } else { prev.dur -= prev.dur / 2; dur += half }
      lastBroken = 0
    }
    let midi: number | null = null
    if (letter !== 'z') {
      const L = letter.toUpperCase()
      let n = 60 + LETTERS[L] + (letter === L ? 0 : 12)
      for (const o of oct) n += o === ',' ? -12 : 12
      let a: number
      if (accs) { a = accs.includes('^') ? accs.length : accs.includes('_') ? -accs.length : 0; acc[L + n] = a }
      else a = acc[L + n] ?? sig[L] ?? 0
      midi = n + a
    }
    // a tie inside the bar makes one longer note; across the bar line the held part shows as a rest (don't pick again)
    if (tie && prev && prev.midi === midi) { prev.dur += dur; tie = false; continue }
    const held: boolean = tie && !prev && midi !== null && (last as AbcNote | null)?.midi === midi
    tie = false
    const note: AbcNote = { midi: held ? null : midi, dur, ...(pendingChord ? { chord: pendingChord } : {}) }
    cur.notes.push(note)
    last = held ? last : note
    pendingChord = undefined
  }
  pushBar()

  // play out repeats and endings: bars since the last repeat start are held until we know whether they repeat
  const out: AbcNote[][] = []
  let pending: Bar[] = []
  let k = 0
  while (k < bars.length) {
    const b = bars[k]
    if (b.start) { for (const s of pending) out.push(s.notes); pending = [] }
    pending.push(b)
    if (b.end) {
      // the section twice: first time with ending 1 (if any), then without it, then the second ending
      for (const s of pending) if (!s.ending || s.ending === 1) out.push(s.notes)
      for (const s of pending) if (!s.ending) out.push(s.notes)
      pending = []
      let j = k + 1
      while (j < bars.length && bars[j].ending === 2) { out.push(bars[j].notes); j++ }
      k = j
      continue
    }
    k++
  }
  for (const s of pending) if (!s.ending || s.ending === 1) out.push(s.notes)
  return { bars: out.filter(b => b.length), meter, tempo, key }
}

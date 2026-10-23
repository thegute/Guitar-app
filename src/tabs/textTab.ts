// Parser for plain-text (ASCII) guitar tabs, as found on most tab sites, e.g.
//
//   Am            C
//   e|-----0-----|-----0-----|
//   B|---1---1---|---1---1---|
//   G|-2-------2-|-0-------0-|  ...
//
// Reads tuning from the string names, two-digit frets, bar lines, techniques (h p / \ b ~ x),
// chord names written above the tab, and rough rhythm from the spacing between notes.
import { noteToMidi } from '../theory/notes'

export interface TabNote {
  /** 0 = lowest string */
  string: number
  fret: number
  tech?: string
}
export interface TabStep {
  notes: TabNote[]
  chord?: string
  /** spacing in text columns to the next step (used to estimate rhythm) */
  cols?: number
}
export interface TextTabSong {
  title: string
  /** low to high, e.g. ['E2','A2','D3','G3','B3','E4'] */
  tuning: string[]
  bars: TabStep[][]
}

const STD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
const TAB_CHARS = /^[\s\-–—0-9|hpbrsx/\\~().^*<>=vt:PMHT[\]]*$/i
const CHORD_RE = /^[A-G][#b]?(?:maj|min|m|M|dim|aug|sus|add|°|ø|\+|-)?[0-9]*(?:(?:maj|sus|add|b|#|\+|-)?[0-9]+)*(?:\([^)]*\))?(?:\/[A-G][#b]?)?$/

function looksLikeTabLine(line: string) {
  const body = line.replace(/^\s*[A-Ga-g][#b]?\s*[|:]?/, '')
  if (body.length < 4) return false
  const dashes = (body.match(/[-–—]/g) ?? []).length
  return dashes >= body.length * 0.35 && TAB_CHARS.test(body)
}

/** A line made only of chord names (and spaces / bar marks). */
function chordLine(line: string): { col: number; name: string }[] | null {
  const out: { col: number; name: string }[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    const tok = m[0].replace(/^\(|\)$/g, '')
    if (tok === '|' || tok === '/' || tok === '%') continue
    if (!CHORD_RE.test(tok)) return null
    out.push({ col: m.index, name: tok })
  }
  return out.length ? out : null
}

/** Work out the tuning from the string letters at the start of each line (low string last in text). */
function tuningFromLabels(labels: string[]): string[] {
  const lo = labels.slice().reverse().map(l => l.replace(/[^A-Ga-g#b]/g, ''))
  if (lo.length !== 6 || lo.some(l => !l)) return STD
  const up = lo.map(l => l[0].toUpperCase() + l.slice(1))
  const std = ['E', 'A', 'D', 'G', 'B', 'E']
  if (up.every((n, i) => n === std[i])) return STD
  // keep standard octaves, but follow the written note names (drop D, DADGAD, open G ...)
  const out: string[] = []
  const pcs: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  const pcOf = (n: string) => (pcs[n[0]] + (n.includes('#') ? 1 : n.includes('b') && n.length > 1 ? -1 : 0) + 12) % 12
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  for (let i = 0; i < 6; i++) {
    const ref = noteToMidi(STD[i])
    let best = ref
    for (let m = ref - 6; m <= ref + 2; m++) if ((m % 12 + 12) % 12 === pcOf(up[i])) { best = m; break }
    out.push(names[best % 12] + (Math.floor(best / 12) - 1))
  }
  return out
}

/** Remove markup used by some tab sites ([tab], [ch]Am[/ch]). */
function clean(text: string) {
  return text
    .replace(/\[ch\](.*?)\[\/ch\]/g, '$1')
    .replace(/\[\/?(tab|verse|chorus|intro|outro|bridge|solo)[^\]]*\]/gi, '')
    .replace(/\t/g, '    ')
}

export function parseTextTab(text: string, title = 'Pasted tab'): TextTabSong | null {
  const lines = clean(text).split(/\r?\n/)
  const bars: TabStep[][] = []
  let tuning: string[] | null = null
  const firstTitle = lines.find(l => l.trim() && !looksLikeTabLine(l) && !chordLine(l))?.trim()
  for (let i = 0; i <= lines.length - 6; i++) {
    const group = lines.slice(i, i + 6)
    if (!group.every(looksLikeTabLine)) continue
    // chord names above this group (directly above, or one blank line up)
    let chords: { col: number; name: string }[] | null = null
    for (let k = i - 1; k >= Math.max(0, i - 2); k--) {
      if (!lines[k].trim()) continue
      chords = chordLine(lines[k])
      break
    }
    const prefixes = group.map(l => /^\s*([A-Ga-g][#b]?)?\s*[|:]?/.exec(l)![0])
    const labels = group.map(l => /^\s*([A-Ga-g][#b]?)/.exec(l)?.[1] ?? '')
    if (!tuning) tuning = tuningFromLabels(labels)
    const start = Math.max(...prefixes.map(p => p.length))
    const rows = group.map(l => l.slice(start))
    const width = Math.max(...rows.map(r => r.length))
    const chordAt = new Map<number, string>()
    for (const ch of chords ?? []) chordAt.set(Math.max(0, ch.col - start), ch.name)
    const pendingChords = [...chordAt.entries()].sort((a, b) => a[0] - b[0])
    let bar: TabStep[] = []
    let lastCol = -1
    let c = 0
    const closeStep = (col: number) => {
      const prev = bar[bar.length - 1]
      if (prev && lastCol >= 0) prev.cols = col - lastCol
    }
    while (c < width) {
      // bar line: a '|' in most rows at this column
      const pipes = rows.filter(r => r[c] === '|').length
      if (pipes >= 4) {
        closeStep(c)
        if (bar.length) bars.push(bar)
        bar = []
        lastCol = -1
        c++
        continue
      }
      const notes: TabNote[] = []
      let consumed = 1
      for (let r = 0; r < 6; r++) {
        const ch = rows[r][c]
        const prev = rows[r][c - 1]
        const isDigit = ch && /[0-9]/.test(ch) && !(prev && /[0-9]/.test(prev))
        const isDead = ch === 'x' || ch === 'X'
        if (!isDigit && !isDead) continue
        let num = ch
        let len = 1
        if (isDigit && rows[r][c + 1] && /[0-9]/.test(rows[r][c + 1])) {
          const two = parseInt(ch + rows[r][c + 1], 10)
          if (two <= 24) { num = ch + rows[r][c + 1]; len = 2 }
        }
        consumed = Math.max(consumed, len)
        const after = rows[r][c + len]
        let tech: string | undefined
        if (isDead) tech = 'x'
        else if (after && /[hpbr/\\~s]/i.test(after)) tech = after.toLowerCase() === 's' ? '/' : after.toLowerCase()
        // row 0 in the text is the highest string
        notes.push({ string: 5 - r, fret: isDead ? 0 : parseInt(num, 10), tech })
      }
      if (notes.length) {
        closeStep(c)
        const step: TabStep = { notes: notes.sort((a, b) => a.string - b.string) }
        // chord written at or before this column (and after the previous step)
        while (pendingChords.length && pendingChords[0][0] <= c + consumed - 1) step.chord = pendingChords.shift()![1]
        bar.push(step)
        lastCol = c
      }
      c += consumed
    }
    closeStep(width)
    if (bar.length) bars.push(bar)
    i += 5
  }
  if (!bars.length) return null
  return { title: firstTitle && firstTitle.length < 60 ? firstTitle : title, tuning: tuning ?? STD, bars }
}

/** Guess note lengths from text spacing: the most common gap is taken as an eighth note. */
export function stepDurations(song: TextTabSong): number[][] {
  const gaps = song.bars.flat().map(s => s.cols ?? 0).filter(g => g > 0)
  const counts = new Map<number, number>()
  for (const g of gaps) counts.set(g, (counts.get(g) ?? 0) + 1)
  const unit = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 2
  const snap = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]
  return song.bars.map(bar =>
    bar.map(s => {
      const raw = ((s.cols ?? unit) / unit) * 0.5
      return snap.reduce((a, b) => (Math.abs(b - raw) < Math.abs(a - raw) ? b : a))
    }),
  )
}

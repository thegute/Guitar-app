// A book page's scanned (OCR) text, made readable. Most of the owner's books are scans: the computer reads plain
// paragraphs well, but turns printed music, tab and diagrams into junk ("Ty { i [", "7 2 6 a 6 5 3", "= = + 2 5 = 4 :").
// Each line is checked; runs of junk lines become one "figure" marker (the real page shows it), and a page that is
// mostly junk is called a picture page. The full text still goes to search and the teacher.

export type PagePart = { kind: 'text'; text: string } | { kind: 'figure'; lines: number }
export interface PageView { parts: PagePart[]; picture: boolean; junk: number; lines: number }

const SHORT = new Set(['a', 'i', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is', 'it', 'me', 'my', 'no', 'of',
  'on', 'or', 'so', 'to', 'up', 'us', 'we', 'am', 'oh'])
const CHORD = /^[A-G][#b♯♭]?(?:m|maj|min|dim|aug|sus|add|M)?\d{0,2}(?:\/[A-G][#b]?)?[.,;:)]?$/
const WORD = /^[("'“‘]?[A-Za-z][a-z'’]+(?:-[a-z]+)?[.,;:!?)"'”’]*$/
const NUM = /^[(]?\d+(?:[.,:]\d+)?[A-Za-z]?[.,;:)]?$/
const SYMBOL = /[=_|{}[\]<>@£€¢*#~^\\§°]/g

/** Is this OCR line junk (music, tab or a diagram read as letters)? */
export function junkLine(line: string): boolean {
  const l = line.trim()
  if (!l) return false
  const toks = l.split(/\s+/)
  const sym = (l.match(SYMBOL) ?? []).length + (l.match(/[—–-]{2,}/g) ?? []).join('').length * 0.5
  if (sym / l.length > 0.22) return true
  let good = 0, neutral = 0
  for (const t of toks) {
    const bare = t.replace(/^[("'“‘]+|[.,;:!?)"'”’]+$/g, '')
    if (CHORD.test(t)) { good++; continue }
    if (NUM.test(t) || /^[-–—•·]$/.test(t)) { neutral++; continue }
    if (WORD.test(t) && /[aeiouy]/i.test(bare) && (bare.length >= 3 || SHORT.has(bare.toLowerCase()))) { good++; continue }
    if (SHORT.has(bare.toLowerCase())) { good++; continue }
  }
  const counted = toks.length - neutral
  // a row of numbers and single letters (tab digits): junk when it's long
  if (toks.length >= 4 && neutral / toks.length >= 0.6) return true
  if (counted <= 0) return false
  return good / counted < 0.5
}

/** The page split into readable text and figure markers. */
export function pageView(text: string): PageView {
  const raw = text.replace(/\r/g, '').split('\n')
  const parts: PagePart[] = []
  let junk = 0, lines = 0, buf: string[] = []
  const flush = () => { if (buf.length) { parts.push({ kind: 'text', text: buf.join('\n').replace(/\n{3,}/g, '\n\n').trim() }); buf = [] } }
  for (const line of raw) {
    if (!line.trim()) { buf.push(''); continue }
    lines++
    if (junkLine(line)) {
      junk++
      flush()
      const last = parts[parts.length - 1]
      if (last?.kind === 'figure') last.lines++
      else parts.push({ kind: 'figure', lines: 1 })
    } else buf.push(line)
  }
  flush()
  const kept = parts.filter(p => p.kind === 'text').map(p => (p as { text: string }).text).join(' ').replace(/\s+/g, ' ').length
  const picture = lines === 0 || junk / lines > 0.4 || kept < 60
  return { parts: parts.filter(p => p.kind === 'figure' || (p as { text: string }).text), picture, junk, lines }
}

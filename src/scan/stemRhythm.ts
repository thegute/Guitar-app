// Note lengths from the rhythm printed under a tab staff, read from a tab software PDF's shapes (Guitar Pro / Songsterr
// style "rhythm under the tab"):
//   stem only → quarter; each beam level (or flag) at the stem's end halves it (eighth, sixteenth, 32nd);
//   a dot beside the stem → × 1.5; a small "3" under a beamed group → × 2/3 (triplets);
//   no stem → a half or a whole, from the room it has.
// Rests are drawn in the staff; the time the notes leave over in the bar is theirs.
import type { PdfShape } from '../tabs/pdfTab'

type Staff = { lines: number[]; gap: number; left: number; right: number }
interface Marks {
  stems: { cx: number; y0: number; y1: number }[]
  beams: { x0: number; x1: number; y: number }[]
  flags: { x0: number; x1: number; y0: number; y1: number }[]
  dots: { cx: number; cy: number }[]
  rests: { cx: number; cy: number; h: number; w: number; sh: PdfShape }[]
  threes: { cx: number; cy: number; sh: PdfShape }[]
}
const cache = new WeakMap<Staff, Marks>()

const pts = (s: PdfShape) => s.polys.reduce((a, p) => a + p.length / 2, 0)

function marks(shapes: PdfShape[], st: Staff): Marks {
  const hit = cache.get(st)
  if (hit) return hit
  const top = st.lines[0], bot = st.lines[st.lines.length - 1], g = st.gap
  const m: Marks = { stems: [], beams: [], flags: [], dots: [], rests: [], threes: [] }
  for (const s of shapes) {
    if (s.kind !== 'fill' || s.x1 < st.left || s.x0 > st.right) continue
    const w = s.x1 - s.x0, h = s.y1 - s.y0, cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2
    if (cy > top && cy < bot) {
      // in the staff: maybe a rest (checked against rest shapes later); dots beside rests too
      if (h > g * 0.3 && h < g * 3 && w < g * 1.6) m.rests.push({ cx, cy, h, w, sh: s })
      else if (w > 0.5 && w < g * 0.4 && h > 0.5 && h < g * 0.4) m.dots.push({ cx, cy })
      continue
    }
    if (s.y0 < bot || s.y0 > bot + g * 5) continue
    if (w < 1.0 && h > g * 0.9 && h < g * 2.6) m.stems.push({ cx, y0: s.y0, y1: s.y1 })
    else if (h > 0.6 && h < 2 && w > 1.5 && pts(s) <= 5) m.beams.push({ x0: s.x0, x1: s.x1, y: cy })
    else if (w > 1.5 && w < g && h > g && h < g * 3) m.flags.push({ x0: s.x0, x1: s.x1, y0: s.y0, y1: s.y1 })
    else if (w > 0.5 && w < 1.6 && h > 0.5 && h < 1.6) m.dots.push({ cx, cy })
    else if (h > g * 0.4 && h < g * 0.9 && w < g * 0.8) m.threes.push({ cx, cy, sh: s })
  }
  cache.set(st, m)
  return m
}

/** Lengths (in quarter notes) for the columns at `xs` in the bar x0…x1, and the rests between them; null when the bar has
 *  no rhythm marks under it (the layout then works from the spacing). */
export function rhythmFromStems(shapes: PdfShape[], st: Staff, xs: number[], x0: number, x1: number, beats: number, isThree: (sh: PdfShape) => boolean = () => false, restKind: (sh: PdfShape) => number | null = () => null): { durs: number[]; rests: { x: number; dur: number }[] } | null {
  const m = marks(shapes, st)
  const g = st.gap
  const inBar = m.stems.filter(s => s.cx > x0 && s.cx < x1)
  if (!inBar.length) return null
  // the beam levels sit this far apart (the gap between the main beam and the next)
  const durs: number[] = []
  let missing = 0
  for (const x of xs) {
    const stem = inBar.reduce<typeof inBar[number] | null>((b, s) => (Math.abs(s.cx - x) < g * 0.7 && (!b || Math.abs(s.cx - x) < Math.abs(b.cx - x)) ? s : b), null)
    if (!stem) { durs.push(0); missing++; continue }
    const levels = new Set<number>()
    for (const b of m.beams) {
      if (stem.cx < b.x0 - 0.4 || stem.cx > b.x1 + 0.4) continue
      if (b.y < stem.y0 + (stem.y1 - stem.y0) * 0.3 || b.y > stem.y1 + 1.5) continue
      levels.add(Math.round(b.y * 2))
    }
    let n = levels.size
    if (!n) {
      // a single note's flags hang off the stem's end
      const fl = m.flags.filter(f => f.x0 < stem.cx + 1 && f.x1 > stem.cx - 0.5 && f.y1 > stem.y0 && f.y0 < stem.y1 + 2)
      if (fl.length) {
        const tall = Math.max(...fl.map(f => f.y1 - f.y0))
        n = fl.length > 1 ? fl.length : tall > g * 2.4 ? 2 : 1
      }
    }
    let d = 1 / 2 ** n
    if (m.dots.some(t => t.cx > stem.cx + 0.3 && t.cx < stem.cx + g * 0.9 && t.cy > stem.y0 && t.cy < stem.y1 + 2)) d *= 1.5
    durs.push(d)
  }
  // triplets: a small "3" under a beamed group makes each of its notes 2/3
  for (const t of m.threes) {
    // just under a beam, and really a 3 (not a letter of the next part's marks)
    const beam = m.beams.find(b => t.cx > b.x0 - 1 && t.cx < b.x1 + 1 && t.cy > b.y && t.cy < b.y + g * 1.6)
    if (!beam || !isThree(t.sh)) continue
    xs.forEach((x, k) => { if (durs[k] && x > beam.x0 - g * 0.7 && x < beam.x1 + g * 0.7) durs[k] = durs[k] * 2 / 3 })
  }
  const used = durs.reduce((a, b) => a + b, 0)
  // columns with no stem (halves / wholes): they share what's left after the rests
  // rests: shapes in the staff that look like a rest (whole … 32nd), a dot beside one makes it 1.5×
  const RL = [4, 2, 1, 0.5, 0.25, 0.125]
  const rests: { x: number; dur: number; whole: boolean }[] = []
  for (const r of m.rests) {
    if (r.cx < x0 + g * 0.5 || r.cx > x1 - g * 0.3) continue
    const k = restKind(r.sh)
    if (k === null) continue
    let dur = RL[k]
    if (m.dots.some(t => t.cx > r.cx && t.cx < r.cx + r.w / 2 + g * 0.8 && Math.abs(t.cy - r.cy) < g * 1.2)) dur *= 1.5
    rests.push({ x: r.cx, dur, whole: k === 0 })
  }
  let left = beats - used
  let restOut = rests.map(r => ({ x: r.x, dur: r.whole ? Math.max(0, beats - used) : r.dur }))
  const restSum = restOut.reduce((a, r) => a + r.dur, 0)
  if (missing) {
    const share = (left - restSum) / missing
    if (share <= 0) return null
    for (let k = 0; k < durs.length; k++) if (!durs[k]) durs[k] = share
    left -= share * missing
  }
  // the rests take the rest of the bar (their own shapes only say roughly how long)
  if (restOut.length) {
    if (Math.abs(left - restSum) > 1e-6) {
      if (left <= 0) restOut = []
      else { const k = left / restSum; restOut = restOut.map(r => ({ ...r, dur: r.dur * k })) }
    }
  } else if (left > 1e-6 && durs.length) {
    // time left with no rest drawn (a tied-over note, a missed mark): give it to the last note
    durs[durs.length - 1] += left
  }
  return { durs, rests: restOut }
}

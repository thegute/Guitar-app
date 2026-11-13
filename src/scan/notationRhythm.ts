// Note lengths from the standard notation printed above a tab staff (books like the Tony Rice and Flatpicking Essentials
// books: notes on a five-line staff, the tab under it). Notation software writes the note heads, flags, dots, rests and
// tuplet numbers as music-font characters (SMuFL code points, PdfGlyph), and draws stems and beams as lines and shapes.
// Each tab column takes its length from the note head right above it:
//   whole / half / black head → 4 / 2 / 1 beats; each beam (or flag) on a black note's stem halves it; a dot → × 1.5;
//   a "3" over a beamed group → × 2/3; small (grace) heads take a little time from the note after them.
import type { PdfGlyph, PdfShape } from '../tabs/pdfTab'

type Staff = { lines: number[]; gap: number; left: number; right: number }

const HEADS: Record<number, number> = { 0xe0a0: 8, 0xe0a2: 4, 0xe0a3: 2, 0xe0a4: 1, 0xe0a9: 1, 0xe0b8: 1, 0xe0b9: 1 } // breve, whole, half, black, x, slashes
const FLAG_LEVEL = (cp: number) => (cp >= 0xe240 && cp <= 0xe24f ? Math.floor((cp - 0xe240) / 2) + 1 : 0) // 8th up/down = 1, 16th = 2 …
const isDot = (cp: number) => cp === 0xe1e7
const REST: Record<number, number> = { 0xe4e2: 8, 0xe4e3: 4, 0xe4e4: 2, 0xe4e5: 1, 0xe4e6: 0.5, 0xe4e7: 0.25, 0xe4e8: 0.125, 0xe4e9: 0.0625 }
const isThree = (cp: number) => cp === 0xe883

interface Line { x: number; y0: number; y1: number }

/** stems: vertical strokes or thin filled boxes */
function verticals(shapes: PdfShape[], y0: number, y1: number): Line[] {
  const out: Line[] = []
  for (const s of shapes) {
    if (s.y1 < y0 || s.y0 > y1) continue
    if (s.kind === 'fill' && s.x1 - s.x0 < 1.2 && s.y1 - s.y0 > 4) { out.push({ x: (s.x0 + s.x1) / 2, y0: s.y0, y1: s.y1 }); continue }
    if (s.kind !== 'stroke') continue
    for (const pl of s.polys) for (let i = 0; i + 3 < pl.length; i += 2) {
      if (Math.abs(pl[i + 2] - pl[i]) < 0.2 && Math.abs(pl[i + 3] - pl[i + 1]) > 4) out.push({ x: (pl[i] + pl[i + 2]) / 2, y0: Math.min(pl[i + 1], pl[i + 3]), y1: Math.max(pl[i + 1], pl[i + 3]) })
    }
  }
  return out
}

/** where a filled shape (a beam: a slanted box) crosses the vertical line x: its top and bottom there, or null */
function spanAt(s: PdfShape, x: number): [number, number] | null {
  let lo = Infinity, hi = -Infinity
  for (const pl of s.polys) {
    const n = pl.length / 2
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const ax = pl[2 * i], ay = pl[2 * i + 1], bx = pl[2 * j], by = pl[2 * j + 1]
      if ((ax - x) * (bx - x) > 0 || ax === bx) continue
      const y = ay + (x - ax) / (bx - ax) * (by - ay)
      lo = Math.min(lo, y); hi = Math.max(hi, y)
    }
  }
  return lo <= hi ? [lo, hi] : null
}

/** Lengths for the tab columns at `xs` (page units) in the bar x0…x1, from the notation above the tab staff; null when
 *  there's no notation above it (or a column has no note head over it). */
export function rhythmFromNotation(shapes: PdfShape[], glyphs: PdfGlyph[], st: Staff, prevBottom: number, xs: number[], x0: number, x1: number, beats: number): { durs: number[]; rests: { x: number; dur: number }[] } | null {
  const top = st.lines[0]
  const yLo = Math.max(prevBottom + st.gap, top - st.gap * 16), yHi = top - st.gap * 0.3
  const here = glyphs.filter(g => g.y > yLo && g.y < yHi && g.x > x0 - st.gap && g.x < x1 + st.gap)
  const heads = here.filter(g => HEADS[g.cp] !== undefined)
  if (!heads.length) return null
  const sizes = heads.map(h => h.size).sort((a, b) => a - b)
  const size = sizes[Math.floor(sizes.length / 2)]
  const sp = size / 4 // one staff space
  const headW = 1.18 * sp
  const stems = verticals(shapes, yLo - sp * 4, yHi + sp)
  const beams = shapes.filter(s => s.kind === 'fill' && !s.blank && s.x1 - s.x0 > sp * 1.2 && s.y0 > yLo - sp * 6 && s.y1 < yHi + sp * 2 && s.polys.length === 1 && s.polys[0].length <= 12)
  /** one note (a head, or a chord of heads at one place): its length, whether it's a grace note, its beam */
  const measure = (hs: PdfGlyph[]): { d: number; small: boolean; beam: PdfShape | null } => {
    const h = hs.reduce((a2, b2) => (HEADS[b2.cp] < HEADS[a2.cp] ? b2 : a2)) // in a chord, the shortest head
    const small = h.size < size * 0.8
    let d = HEADS[h.cp]
    let mainBeam: PdfShape | null = null
    if (d <= 1) {
      const hy0 = Math.min(...hs.map(q => q.y)), hy1 = Math.max(...hs.map(q => q.y))
      // the stem: at the head's right edge (stem up) or left edge (stem down), running from the heads
      const stem = stems.find(v => (Math.abs(v.x - (h.x + headW * (small ? 0.75 : 1))) < sp * 0.5 || Math.abs(v.x - h.x) < sp * 0.5) && v.y0 < hy1 + sp && v.y1 > hy0 - sp)
      if (stem) {
        const up = Math.abs(stem.y0 - hy0) > Math.abs(stem.y1 - hy1) // the end farther from the heads
        const end = up ? stem.y0 : stem.y1
        let n = 0
        for (const bm of beams) {
          const sp2 = spanAt(bm, stem.x)
          if (!sp2) continue
          if (sp2[1] - sp2[0] > sp * 1.2) continue // not a beam (too thick here)
          // beams stack from the stem's end inward, about 3/4 of a space apart
          const dist = up ? sp2[0] - end : end - sp2[1]
          if (dist > -sp * 0.4 && dist < sp * 3.2) { n++; if (!mainBeam || Math.abs(dist) < sp * 0.5) mainBeam = bm }
        }
        const flag = here.find(g => FLAG_LEVEL(g.cp) && Math.abs(g.x - stem.x) < sp * 1.2 && Math.abs(g.y - end) < sp * 3.5)
        if (flag) n = Math.max(n, FLAG_LEVEL(flag.cp))
        d = 1 / 2 ** n
      }
    }
    // a dot just right of the head
    if (here.some(g => isDot(g.cp) && g.x > h.x + headW * 0.8 && g.x < h.x + headW + sp * 2.2 && Math.abs(g.y - h.y) < sp * 0.8)) d *= 1.5
    return { d, small, beam: mainBeam }
  }
  const near = (h: PdfGlyph, x: number) => Math.abs(h.x + headW / 2 - x) < Math.max(sp * 1.4, st.gap * 0.7)
  const durs: number[] = []
  const grace: boolean[] = []
  const beamOf: (PdfShape | null)[] = []
  const used = new Set<PdfGlyph>()
  for (const x of xs) {
    const hs = heads.filter(h => near(h, x))
    if (!hs.length) return null // a tab number with no note above it: can't read this bar's rhythm
    hs.forEach(h => used.add(h))
    const m = measure(hs)
    durs.push(m.d); grace.push(m.small); beamOf.push(m.beam)
  }
  // note heads with no tab number under them: the second half of a tied note (the tab only prints the first). Their
  // time belongs to the tab note before them.
  const loose = heads.filter(h => !used.has(h) && h.x > x0 && h.x < x1 && h.size >= size * 0.8)
  const places: PdfGlyph[][] = []
  for (const h of loose.sort((p, q) => p.x - q.x)) {
    const pl = places.find(q => Math.abs(q[0].x - h.x) < sp * 0.6)
    if (pl) pl.push(h); else places.push([h])
  }
  for (const pl of places) {
    const cx = pl[0].x + headW / 2
    let k = -1
    xs.forEach((x, j) => { if (x < cx) k = j })
    if (k >= 0) { const m = measure(pl); durs[k] += m.d; if (m.beam && !beamOf[k]) beamOf[k] = m.beam }
  }
  // triplets written as a plain (often italic) "3" with a bracket: horizontal lines left and right of it at its height;
  // the notes under the bracket are 2/3 (a "3" of a bar number has no bracket)
  const hlines: { y: number; a: number; b: number }[] = []
  for (const s2 of shapes) {
    if (s2.kind !== 'stroke' || s2.y1 < yLo || s2.y0 > yHi) continue
    for (const pl of s2.polys) for (let i = 0; i + 3 < pl.length; i += 2) {
      // a bracket arm: mostly level (it may follow the slant of the notes), short
      const dx = Math.abs(pl[i + 2] - pl[i]), dy = Math.abs(pl[i + 3] - pl[i + 1])
      if (dy < dx * 0.4 && dx > sp * 0.5 && dx < sp * 12) hlines.push({ y: (pl[i + 1] + pl[i + 3]) / 2, a: Math.min(pl[i], pl[i + 2]), b: Math.max(pl[i], pl[i + 2]) })
    }
  }
  const headX = xs.map(x => x)
  for (const t of glyphs.filter(g => (g.cp === 0x33 || g.cp === 0x36) && g.x > x0 - sp && g.x < x1 && g.y > yLo && g.y < top - st.gap * 0.8)) {
    const mid = t.x + (t.w || t.size * 0.5) / 2, cy = t.y - t.size * 0.35
    // the bracket's arms: short level lines on both sides, at the number's height (staff lines are far longer)
    const near = hlines.filter(l => Math.abs(l.y - cy) < t.size * 0.6)
    const left = near.filter(l => l.b < mid && mid - l.b < t.size * 1.2), right = near.filter(l => l.a > mid && l.a - mid < t.size * 1.2)
    if (!left.length || !right.length) continue
    const a = Math.min(...left.map(l => l.a)) - sp * 0.3, b = Math.max(...right.map(l => l.b)) + sp * 0.3
    const k = t.cp === 0x36 ? 4 / 6 : 2 / 3
    headX.forEach((x, j) => { if (x > a && x < b) durs[j] *= k })
  }
  // triplets: a 3 near a beam makes the notes on that beam 2/3
  for (const t of here.filter(g => isThree(g.cp))) {
    const b = beams.find(q => t.x > q.x0 - sp && t.x < q.x1 + sp && Math.min(Math.abs(t.y - q.y0), Math.abs(t.y - q.y1)) < sp * 3)
    if (!b) continue
    beamOf.forEach((q, k) => { if (q === b) durs[k] *= 2 / 3 })
  }
  // grace notes: a sixteenth taken from the next note
  for (let k = 0; k < durs.length; k++) if (grace[k]) {
    const next = durs.findIndex((d, j) => j > k && !grace[j])
    const take = Math.min(0.125, next >= 0 ? durs[next] / 4 : 0.125)
    durs[k] = take
    if (next >= 0) durs[next] -= take
  }
  const rests = here.filter(g => REST[g.cp] !== undefined && g.x > x0 && g.x < x1).map(r => {
    let d = REST[r.cp]
    if (r.cp === 0xe4e3 && durs.length === 0) d = beats // a whole rest fills any bar
    if (here.some(g => isDot(g.cp) && g.x > r.x && g.x < r.x + sp * 3 && Math.abs(g.y - r.y) < sp * 2)) d *= 1.5
    return { x: r.x + sp * 0.6, dur: d }
  })
  return { durs, rests }
}

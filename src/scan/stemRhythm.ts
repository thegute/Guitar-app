// Note lengths from the rhythm printed under a tab staff, read from a tab software PDF's shapes (Guitar Pro / Songsterr
// style "rhythm under the tab"):
//   stem only → quarter; each beam level (or flag) at the stem's end halves it (eighth, sixteenth, 32nd);
//   a dot beside the stem → × 1.5; a small "3" under a beamed group → × 2/3 (triplets);
//   no stem → a half or a whole, from the room it has.
// Rests are drawn in the staff; the time the notes leave over in the bar is theirs.
import type { PdfShape } from '../tabs/pdfTab'

type Staff = { lines: number[]; gap: number; left: number; right: number; /** where the next staff down begins: marks below it are that staff's */ limit?: number }
interface Marks {
  stems: { cx: number; y0: number; y1: number }[]
  beams: { x0: number; x1: number; y: number }[]
  flags: { x0: number; x1: number; y0: number; y1: number; sh: PdfShape }[]
  dots: { cx: number; cy: number }[]
  rests: { cx: number; cy: number; h: number; w: number; sh: PdfShape }[]
  threes: { cx: number; cy: number; sh: PdfShape }[]
}
const cache = new WeakMap<Staff, Marks>()

const pts = (s: PdfShape) => s.polys.reduce((a, p) => a + p.length / 2, 0)

/** short level strokes under the staff: the arms of tuplet brackets */
const armCache = new WeakMap<Staff, { y: number; a: number; b: number }[]>()
function bracketArms(shapes: PdfShape[], st: Staff) {
  const hit = armCache.get(st)
  if (hit) return hit
  const bot = st.lines[st.lines.length - 1], g = st.gap
  const out: { y: number; a: number; b: number }[] = []
  for (const s of shapes) {
    if (s.kind !== 'stroke' || s.y0 < bot || s.y1 > bot + g * 6 || s.x1 < st.left || s.x0 > st.right) continue
    for (const pl of s.polys) for (let i = 0; i + 3 < pl.length; i += 2) {
      const dx = Math.abs(pl[i + 2] - pl[i]), dy = Math.abs(pl[i + 3] - pl[i + 1])
      if (dy < dx * 0.3 && dx > g * 0.4 && dx < g * 12) out.push({ y: (pl[i + 1] + pl[i + 3]) / 2, a: Math.min(pl[i], pl[i + 2]), b: Math.max(pl[i], pl[i + 2]) })
    }
  }
  armCache.set(st, out)
  return out
}

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
    // a 16th's second hook can start just above the bottom line (Guitar Pro stacks one hook shape per level)
    if (s.y0 < bot && s.y0 > bot - g * 0.8 && s.y1 > bot + g * 0.5 && w > 1.5 && w < g && h > g && h < g * 3) { m.flags.push({ x0: s.x0, x1: s.x1, y0: s.y0, y1: s.y1, sh: s }); continue }
    if (s.y0 < bot || s.y0 > bot + g * 5 || (st.limit !== undefined && s.y1 > st.limit - g * 0.6)) continue
    if (w < 1.0 && h > g * 0.5 && h < g * 2.6) m.stems.push({ cx, y0: s.y0, y1: s.y1 })
    else if (h > 0.6 && h < 2 && w > 1.5 && pts(s) <= 5) m.beams.push({ x0: s.x0, x1: s.x1, y: cy })
    else if (w > 1.5 && w < g && h > g && h < g * 3) m.flags.push({ x0: s.x0, x1: s.x1, y0: s.y0, y1: s.y1, sh: s })
    else if (w > 0.5 && w < 1.6 && h > 0.5 && h < 1.6) m.dots.push({ cx, cy })
    else if (h > g * 0.4 && h < g * 0.9 && w < g * 0.8) m.threes.push({ cx, cy, sh: s })
  }
  cache.set(st, m)
  return m
}

/** Lengths (in quarter notes) for the columns at `xs` in the bar x0…x1, and the rests between them; null when the bar has
 *  no rhythm marks under it (the layout then works from the spacing). */
export function rhythmFromStems(shapes: PdfShape[], st: Staff, xs: number[], x0: number, x1: number, beats: number, tuplet: (sh: PdfShape) => number | null = () => null, restKind: (sh: PdfShape) => number | null = () => null): { durs: number[]; rests: { x: number; dur: number }[]; grace?: boolean[] } | null {
  const m = marks(shapes, st)
  const g = st.gap
  const inBar = m.stems.filter(s => s.cx > x0 && s.cx < x1)
  if (!inBar.length) return null
  // a stem with no number over it is a held (tied) note: the number is left out, or printed in brackets "(6)" (tie
  // destinations aren't read as notes). It keeps its own length as a silent step, so the notes around it keep theirs.
  const held = inBar.filter(s => !xs.some(x => Math.abs(s.cx - x) < g * 0.7)).map(s => s.cx)
  const nCols = xs.length
  xs = [...xs, ...held]
  // a half note has a stem about half as long as the others (Guitar Pro's rhythm under the tab)
  const hs = m.stems.map(s => s.y1 - s.y0).sort((a, b) => a - b)
  // (a page of nothing but half notes has only short stems: a full stem is at least about 1¼ line gaps)
  const fullStem = Math.max(hs[Math.floor(hs.length * 0.75)], g * 1.25)
  // the beam levels sit this far apart (the gap between the main beam and the next)
  const durs: number[] = []
  let missing = 0
  const stemAt = (x: number) => inBar.reduce<typeof inBar[number] | null>((b, s) => (Math.abs(s.cx - x) < g * 0.7 && (!b || Math.abs(s.cx - x) < Math.abs(b.cx - x)) ? s : b), null)
  // a grace note: a (small) number with no stem, just before a note that has one. It counts for nothing in the bar;
  // played, it takes a 32nd from the step before it (Guitar Pro's way), so the bar still adds up.
  const grace = xs.map((x, k) => k < nCols && !stemAt(x) && xs.some((y, j) => j !== k && y > x && y - x < g * 4 && !!stemAt(y)))
  for (const [k, x] of xs.entries()) {
    const stem = stemAt(x)
    if (grace[k]) { durs.push(0); continue }
    if (!stem) { durs.push(0); missing++; continue }
    if (stem.y1 - stem.y0 < fullStem * 0.7) {
      let d2 = 2
      if (m.dots.some(t => t.cx > stem.cx + 0.3 && t.cx < stem.cx + g * 0.9 && t.cy > stem.y0 - 2 && t.cy < stem.y1 + 2)) d2 *= 1.5
      durs.push(d2)
      continue
    }
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
        .filter((f, i, a) => a.findIndex(q => Math.abs(q.y0 - f.y0) < 0.3 && Math.abs(q.x0 - f.x0) < 0.3) === i)
      if (fl.length) {
        const tall = Math.max(...fl.map(f => f.y1 - f.y0))
        n = fl.length > 1 ? fl.length : tall > g * 2.4 ? 2 : 1
      }
    }
    let d = 1 / 2 ** n
    if (m.dots.some(t => t.cx > stem.cx + 0.3 && t.cx < stem.cx + g * 0.9 && t.cy > stem.y0 && t.cy < stem.y1 + 2)) d *= 1.5
    durs.push(d)
  }
  // tuplets: a small 3 (or 5, 6, 7 …) under a beamed group or a bracket: n notes in the time of the power of two below n.
  // Only where the bar is too long without it, and only if it brings the bar closer (a stray number can't break a bar).
  const brackets = bracketArms(shapes, st)
  const restGuess = m.rests.filter(r => r.cx > x0 + g * 0.5 && r.cx < x1 - g * 0.3).reduce((a, r) => { const k = restKind(r.sh); return a + (k === null ? 0 : [4, 2, 1, 0.5, 0.25, 0.125][k]) }, 0)
  for (const t of m.threes) {
    if (t.cx < x0 || t.cx > x1) continue
    const n = tuplet(t.sh)
    if (!n) continue
    let strong = false
    const ratio = 2 ** Math.floor(Math.log2(n)) / n
    let a = -Infinity, b = Infinity
    // a bracket round the number says exactly which notes (it can be shorter than the beam: "4 5 4" of a run of 16ths)
    const arms = brackets.filter(l => Math.abs(l.y - t.cy) < g * 0.8)
    const left = arms.filter(l => l.b < t.cx && t.cx - l.b < g * 2), right = arms.filter(l => l.a > t.cx && l.a - t.cx < g * 2)
    const beam = m.beams.find(bm => t.cx > bm.x0 - 1 && t.cx < bm.x1 + 1 && t.cy > bm.y && t.cy < bm.y + g * 1.6)
    if (left.length && right.length) {
      a = Math.min(...left.map(l => l.a)) - g * 0.3; b = Math.max(...right.map(l => l.b)) + g * 0.3
      strong = true // a number inside a bracket is a tuplet
    } else if (beam) { a = beam.x0 - g * 0.7; b = beam.x1 + g * 0.7 }
    else continue
    // a beamed group whose note count is the tuplet's number is one too
    if (!strong && beam && xs.filter(x => x > a && x < b).length === n) strong = true
    const cols = xs.map((x, k) => (durs[k] && x > a && x < b ? k : -1)).filter(k => k >= 0)
    if (!cols.length) continue
    if (strong) { cols.forEach(k => { durs[k] *= ratio }); continue }
    const before = durs.reduce((p, q) => p + q, 0) + restGuess
    if (before <= beats + 1e-6) continue
    const after = before - cols.reduce((p, k) => p + durs[k], 0) * (1 - ratio)
    if (Math.abs(after - beats) < Math.abs(before - beats) - 1e-6) cols.forEach(k => { durs[k] *= ratio })
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
    const last = xs.reduce((b, x, k) => (x > xs[b] ? k : b), 0)
    durs[last] += left
  }
  // the held stems go back out as silent steps (exact lengths, not shares of what's left)
  const heldOut = held.map((x, k) => ({ x, dur: durs[nCols + k] }))
  const restsAll = [...restOut, ...heldOut]
  // grace notes take their 32nd from whatever sounds before them (a note, a rest, a held note), else from the note after
  for (const [k, isG] of grace.entries()) {
    if (!isG) continue
    type It = { x: number; get: () => number; set: (d: number) => void }
    const items: It[] = [
      ...xs.slice(0, nCols).map((x, j) => ({ x, get: () => durs[j], set: (d: number) => { durs[j] = d } })).filter((_, j) => !grace[j]),
      ...restsAll.map(r => ({ x: r.x, get: () => r.dur, set: (d: number) => { r.dur = d } })),
    ]
    const x = xs[k]
    // two or three grace notes before one note (a rake "x x 7") share the 32nd
    const nextMain = Math.min(...xs.slice(0, nCols).filter((y, j) => !grace[j] && y > x))
    const prevMain = Math.max(-Infinity, ...xs.slice(0, nCols).filter((y, j) => !grace[j] && y < x))
    const GR = 0.125 / xs.slice(0, nCols).filter((y, j) => grace[j] && y > prevMain && y < nextMain).length
    const before = items.filter(it => it.x < x && it.get() > GR + 1e-6).sort((a, b) => b.x - a.x)[0]
    const after = items.filter(it => it.x > x && it.get() > GR + 1e-6).sort((a, b) => a.x - b.x)[0]
    const from = before ?? after
    if (from) { from.set(from.get() - GR); durs[k] = GR }
  }
  return { durs: durs.slice(0, nCols), rests: restsAll, ...(grace.some(Boolean) ? { grace: grace.slice(0, nCols) } : {}) }
}

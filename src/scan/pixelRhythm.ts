// Note lengths from the rhythm marks printed under a tab staff, read from a PICTURE (a screenshot, a scan, a book photo,
// a video frame): the same marks the PDF shape reader uses (stemRhythm.ts), found in the pixels.
//   stem under a column → a quarter; each beam / flag level at its end halves it; a short stem → a half note;
//   a dot beside the stem's end → × 1.5. Columns with no stem share what's left of the bar.
// Returns null when the bar has no rhythm marks (most text tabs): the layout then works from the spacing.
import type { Gray } from './image'

export interface PixStaff { lines: number[]; gap: number; left: number; right: number; limit?: number }

export function pixelRhythm(g: Gray, st: PixStaff, xs: number[], x0: number, x1: number, beats: number, th: number): { durs: number[] } | null {
  const gap = st.gap
  const bot = Math.max(...st.lines)
  const yA = Math.round(bot + gap * 0.25), yB = Math.round(Math.min(g.h - 1, bot + gap * 4.5, (st.limit ?? Infinity) - gap * 0.6))
  if (yB - yA < gap) return null
  const ink = (x: number, y: number) => x >= 0 && x < g.w && y >= 0 && y < g.h && g.px[y * g.w + x] < th
  // the longest vertical ink run in this column inside the rhythm row
  const run = (x: number): [number, number] | null => {
    let best: [number, number] | null = null, s = -1
    for (let y = yA; y <= yB + 1; y++) {
      const on = y <= yB && ink(x, y)
      if (on && s < 0) s = y
      if (!on && s >= 0) { if (!best || y - s > best[1] - best[0]) best = [s, y - 1]; s = -1 }
    }
    return best
  }
  type Stem = { x: number; y0: number; y1: number }
  const stemAt = (x: number): Stem | null => {
    let best: Stem | null = null
    const r0 = Math.max(1, Math.round(gap * 0.6))
    for (let dx = -r0; dx <= r0; dx++) {
      const xx = Math.round(x + dx)
      const r = run(xx)
      if (!r || r[1] - r[0] < gap * 0.45) continue
      // a stem is thin: the columns two pixels either side are mostly paper along it
      const mid = Math.round((r[0] + r[1]) / 2)
      if (ink(xx - 3, mid) && ink(xx + 3, mid)) continue
      if (!best || r[1] - r[0] > best.y1 - best.y0 || (r[1] - r[0] === best.y1 - best.y0 && Math.abs(dx) < Math.abs(best.x - x))) best = { x: xx, y0: r[0], y1: r[1] }
    }
    return best
  }
  const stems = xs.map(stemAt)
  const found = stems.filter((s): s is Stem => !!s)
  if (found.length < Math.max(1, xs.length * 0.6)) return null
  const lens = found.map(s => s.y1 - s.y0).sort((a, b) => a - b)
  const full = lens[Math.floor(lens.length * 0.75)]
  // beam / flag levels at a stem's lower end: horizontal ink bands reaching out from the stem
  const levels = (s: Stem) => {
    let n = 0, inBand = false
    const reach = Math.max(3, Math.round(gap * 0.45))
    for (let y = s.y1 + 1; y >= s.y1 - gap * 1.6; y--) {
      const side = (dir: number) => { let k = 0; for (let d = 2; d <= reach; d++) if (ink(s.x + dir * d, y)) k++; return k >= reach - 2 }
      const band = side(1) || side(-1)
      if (band && !inBand) n++
      inBand = band
    }
    return Math.min(4, n)
  }
  const dotted = (s: Stem) => {
    for (let dx = Math.round(gap * 0.3); dx <= gap * 0.9; dx++) for (let dy = -Math.round(gap * 0.5); dy <= gap * 0.3; dy++) {
      const x = s.x + dx, y = s.y1 + dy
      // a small round blob: ink here, paper a little further out all round
      if (ink(x, y) && !ink(x + 3, y) && !ink(x, y - 3) && !ink(x, y + 3) && !ink(x - 3, y)) return true
    }
    return false
  }
  const durs: number[] = []
  let missing = 0
  for (const s of stems) {
    if (!s) { durs.push(0); missing++; continue }
    let d = s.y1 - s.y0 < full * 0.7 ? 2 : 1 / 2 ** levels(s)
    if (dotted(s)) d *= 1.5
    durs.push(d)
  }
  const used = durs.reduce((a, b) => a + b, 0)
  if (missing) {
    const share = (beats - used) / missing
    if (share <= 0) return null
    for (let k = 0; k < durs.length; k++) if (!durs[k]) durs[k] = share
  } else if (used < beats - 1e-6 && durs.length) durs[durs.length - 1] += beats - used // rests aren't read from pictures yet
  void x0; void x1
  return { durs }
}

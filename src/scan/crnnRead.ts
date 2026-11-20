// The trained picture reader (tab_crnn): each tab staff in a picture is straightened onto fixed rows (string s on row
// 42 + 15·s of a 160-pixel strip, s = 0 the top line), the network reads every column of it at once (which string has
// which fret, bar lines, rests, note lengths, pick strokes), and the columns go through the same layout code as the other
// readers (`assemble`). Note lengths are then made to add up per bar: the most likely set of lengths whose sum is the
// bar, with the spacing on the page as a tie-breaker (a constrained Viterbi). Numbers the network wasn't sure of keep
// their amber ring.
import { deskew, findStrips, type Gray, type Strip } from './image'
import { assemble, type Num, type ReadSystem, type TabReading } from './tabRead'
import { referee, type Hearing } from './hear'

export const FRAME_H = 160, FRAME_GAP = 15, FRAME_TOP = 42, SLOTS = 6, STEP = 4
const NFRET = 27
const TUPS = [0, 3, 5, 6, 7]
const DUR = [4, 2, 1, 0.5, 0.25, 0.125]

/** what the network gives back for one strip (T = W / 4 steps) */
export interface CrnnOut { T: number; heat: Float32Array; off: Float32Array; frets: Float32Array; dur: Float32Array; dots: Float32Array; tup: Float32Array; grace: Float32Array; stroke: Float32Array }
export type CrnnRun = (strip: Float32Array, W: number) => Promise<CrnnOut>

/** A staff's lines, followed across the picture (a page photo bends them): y of line k at x, k = 0 the top line. */
export function followLines(g: Gray, st: Strip, nStr: number): ((x: number) => number)[] {
  const ys = [...st.lines].sort((a, b) => a - b).slice(0, nStr)
  const gap = (ys[ys.length - 1] - ys[0]) / Math.max(1, nStr - 1)
  const N = 16
  const w = st.right - st.left
  return ys.map(y0 => {
    const pts: [number, number][] = []
    for (let k = 0; k < N; k++) {
      const a = Math.round(st.left + (w * k) / N), b = Math.round(st.left + (w * (k + 1)) / N)
      let best = -1, by = y0
      for (let y = Math.round(y0 - gap * 0.3); y <= Math.round(y0 + gap * 0.3); y++) {
        if (y < 0 || y >= g.h) continue
        let n = 0
        for (let x = a; x < b; x++) if (g.px[y * g.w + x] < 0.55) n++
        if (n > best) { best = n; by = y }
      }
      // a line runs through most of the slice; a slice full of numbers or a gap in the line says nothing
      if (best > (b - a) * 0.5) pts.push([(a + b) / 2, by])
    }
    return fitCubic(pts, y0, st.left, w)
  })
}

/** least-squares cubic through the points (outliers over 2 px dropped once); a flat line when there are too few */
function fitCubic(pts: [number, number][], y0: number, x0: number, w: number): (x: number) => number {
  const solve = (P: [number, number][]) => {
    const deg = P.length >= 8 ? 3 : P.length >= 4 ? 1 : 0
    if (deg === 0) { const m = P.length ? P.reduce((a, p) => a + p[1], 0) / P.length : y0; return [m] }
    const n = deg + 1
    const A = Array.from({ length: n }, () => new Float64Array(n + 1))
    for (const [x, y] of P) {
      const u = (x - x0) / w
      const pw = Array.from({ length: n }, (_, i) => u ** i)
      for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) A[i][j] += pw[i] * pw[j]; A[i][n] += pw[i] * y }
    }
    for (let i = 0; i < n; i++) {
      let p = i
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r
      ;[A[i], A[p]] = [A[p], A[i]]
      if (Math.abs(A[i][i]) < 1e-9) return [y0]
      for (let r = 0; r < n; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c <= n; c++) A[r][c] -= f * A[i][c] }
    }
    return A.map((row, i) => row[n] / row[i])
  }
  const at = (c: number[], x: number) => { const u = (x - x0) / w; return c.reduce((a, k, i) => a + k * u ** i, 0) }
  let c = solve(pts)
  const keep = pts.filter(p => Math.abs(at(c, p[0]) - p[1]) <= 2)
  if (keep.length >= 4 && keep.length < pts.length) c = solve(keep)
  return x => at(c, x)
}

/** The staff straightened into the reader's frame. `toPage` turns a frame x back into the picture's x. */
export function straighten(g: Gray, st: Strip, nStr: number): { px: Float32Array; W: number; gap: number; toPage: (u: number) => number; lines: ((x: number) => number)[] } {
  const lines = followLines(g, st, nStr)
  const gap = (lines[nStr - 1]((st.left + st.right) / 2) - lines[0]((st.left + st.right) / 2)) / Math.max(1, nStr - 1)
  const k = gap / FRAME_GAP // picture pixels per frame pixel
  const x0 = st.left - gap * 1.2
  const W = Math.ceil(((st.right - st.left + gap * 2.4) / k) / 16) * 16
  const px = new Float32Array(FRAME_H * W).fill(1)
  const ys = new Float64Array(nStr)
  for (let u = 0; u < W; u++) {
    const x = x0 + u * k
    for (let s = 0; s < nStr; s++) ys[s] = lines[s](Math.min(st.right, Math.max(st.left, x)))
    const lg = (ys[nStr - 1] - ys[0]) / Math.max(1, nStr - 1)
    for (let v = 0; v < FRAME_H; v++) {
      const sv = (v - FRAME_TOP) / FRAME_GAP // which line (fractional)
      let y: number
      if (sv <= 0) y = ys[0] + sv * lg
      else if (sv >= nStr - 1) y = ys[nStr - 1] + (sv - (nStr - 1)) * lg
      else { const i = Math.floor(sv); y = ys[i] + (ys[i + 1] - ys[i]) * (sv - i) }
      px[v * W + u] = sample(g, x, y)
    }
  }
  return { px, W, gap, toPage: u => x0 + u * k, lines }
}

function sample(g: Gray, x: number, y: number): number {
  if (x < 0 || y < 0 || x > g.w - 1 || y > g.h - 1) return 1
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi
  const i = yi * g.w + xi
  const a = g.px[i], b = g.px[Math.min(i + 1, g.px.length - 1)], c = g.px[Math.min(i + g.w, g.px.length - 1)], d = g.px[Math.min(i + g.w + 1, g.px.length - 1)]
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
}

const sig = (v: number) => 1 / (1 + Math.exp(-v))
function softmaxAt(a: Float32Array, C: number, T: number, t: number, base = 0): number[] {
  let m = -Infinity
  for (let c = 0; c < C; c++) m = Math.max(m, a[base + c * T + t])
  const e = Array.from({ length: C }, (_, c) => Math.exp(a[base + c * T + t] - m))
  const s = e.reduce((p, q) => p + q, 0)
  return e.map(v => v / s)
}

/** a length choice: quarters, probability, and (when known) the note value and tuplet it came from */
export type Len = { d: number; p: number; b?: number; t?: number }

export interface CrnnCol {
  u: number; t: number; kind: 'note' | 'bar' | 'rest'; p: number
  frets: { slot: number; fret: number; dead: boolean; sure: number; tech?: string; /** the next likeliest readings (for the audio referee) */ alts: { fret: number; dead: boolean; p: number }[] }[]
  /** length options, most likely first: quarters and probability */
  lens: Len[]
  printed: number // probability that a rhythm is printed under it
  grace: boolean; stroke: 0 | 1 | 2
}

/** Visually confusable fret pairs on blurred/compressed video frames (included in alts for the audio referee and note fixer). */
const VISUAL_TWINS: Record<number, number[]> = {
  0: [9, 8, 6],
  1: [7, 4, 11],
  2: [3, 7, 12],
  3: [8, 5, 2],
  4: [1, 9, 14],
  5: [6, 8, 3],
  6: [8, 5, 0],
  7: [1, 2, 17],
  8: [6, 3, 0, 9],
  9: [0, 8, 4],
  10: [12, 18, 19],
  11: [14, 17, 1],
  12: [10, 13, 15],
  13: [18, 15, 12],
  14: [11, 19, 4],
  15: [16, 18, 13],
  16: [18, 15],
  17: [11, 7, 19],
  18: [16, 13, 10],
  19: [10, 18, 14],
}

/** Peaks of the column heat maps → columns, with the string heads read at each. */
export function decode(o: CrnnOut, nStr: number, thresh = 0.45): CrnnCol[] {
  const T = o.T
  const cols: CrnnCol[] = []
  for (let k = 0; k < 3; k++) {
    for (let t = 0; t < T; t++) {
      const v = sig(o.heat[k * T + t])
      if (v < thresh || (t > 0 && sig(o.heat[k * T + t - 1]) > v) || (t + 1 < T && sig(o.heat[k * T + t + 1]) >= v)) continue
      const kind = (['note', 'bar', 'rest'] as const)[k]
      const col: CrnnCol = { u: STEP * (t + 0.5 + o.off[t]), t, kind, p: v, frets: [], lens: [], printed: 0, grace: false, stroke: 0 }
      if (kind !== 'bar') {
        if (kind === 'note') for (let s = 0; s < Math.min(nStr, SLOTS); s++) {
          const pr = softmaxAt(o.frets, NFRET, T, t, s * NFRET * T)
          const order = pr.map((p, i) => [p, i] as const).sort((a, b) => b[0] - a[0])
          const [p1, c1] = order[0], p2 = order[1][0]
          if (c1 === 0) continue
          const topFret = c1 === 26 ? 0 : c1 - 1
          const dead = c1 === 26
          // amber ring: top choice under 0.82, or the runner-up close behind
          const alts = order.slice(0, 3).filter(([, c]) => c > 0).map(([p, c]) => ({ fret: c === 26 ? 0 : c - 1, dead: c === 26, p }))
          if (!dead) {
            const minTwinP = p1 < 0.85 ? 0.008 : 0.02
            for (const tw of VISUAL_TWINS[topFret] ?? []) {
              const tp = pr[tw + 1] ?? 0
              if (tp >= minTwinP && !alts.some(a => !a.dead && a.fret === tw)) alts.push({ fret: tw, dead: false, p: Math.max(tp, 0.02) })
              if (alts.length >= 5) break
            }
          }
          col.frets.push({ slot: s, fret: topFret, dead, sure: p1 >= 0.82 && p1 - p2 >= 0.35 ? 1 : 0, alts })
        }
        const pd = softmaxAt(o.dur, 7, T, t), pdot = softmaxAt(o.dots, 3, T, t), ptup = softmaxAt(o.tup, TUPS.length, T, t)
        col.printed = 1 - pd[6]
        const opts: Len[] = []
        for (let b = 0; b < 6; b++) for (let dt = 0; dt < 3; dt++) for (let tu = 0; tu < TUPS.length; tu++) {
          const p = pd[b] * pdot[dt] * ptup[tu]
          if (p < 1e-4) continue
          let d = DUR[b] * (dt === 1 ? 1.5 : dt === 2 ? 1.75 : 1)
          if (TUPS[tu]) d *= 2 ** Math.floor(Math.log2(TUPS[tu])) / TUPS[tu]
          opts.push({ d, p, b, t: TUPS[tu] })
        }
        col.lens = opts.sort((a, b) => b.p - a.p).slice(0, 8)
        col.grace = softmaxAt(o.grace, 2, T, t)[1] > 0.5
        const ps = softmaxAt(o.stroke, 3, T, t)
        col.stroke = (ps[1] > 0.5 ? 1 : ps[2] > 0.5 ? 2 : 0) as 0 | 1 | 2
      }
      if (kind === 'note' && !col.frets.length) continue
      cols.push(col)
    }
  }
  // a note and a rest found at the same place: keep the stronger
  cols.sort((a, b) => a.u - b.u)
  return cols.filter((c, i) => !(c.kind === 'rest' && cols.some((d, j) => j !== i && d.kind === 'note' && Math.abs(d.u - c.u) < STEP * 1.5 && d.p >= c.p)))
}

/** Filter out playhead/cursor-bar phantom chords and tie-curve phantom notes, and recover slide / hammer-on / pull-off
 *  techniques (`h`, `p`, `/`, `\`) between consecutive notes on the same string from the straightened 160px strip. */
export function detectStripTechAndClean(cols: CrnnCol[], sv: { px: Float32Array; W: number }, nStr: number): CrnnCol[] {
  const { px, W } = sv
  const at = (x: number, y: number) => (x >= 0 && x < W && y >= 0 && y < FRAME_H ? px[y * W + x] : 1)
  const cleaned: CrnnCol[] = []
  for (const c of cols) {
    if (c.kind !== 'note') { cleaned.push(c); continue }
    const u = Math.round(c.u)
    // 1. Playhead / cursor bar phantom chord: 4+ unsure notes stacked where a thin vertical line crosses inter-string midpoints
    if (c.frets.length >= Math.min(4, nStr - 1) && c.frets.filter(f => !f.sure).length * 2 >= c.frets.length) {
      let midDark = 0, sideLight = 0
      for (let s = 0; s < nStr - 1; s++) {
        const my = FRAME_TOP + s * FRAME_GAP + Math.round(FRAME_GAP / 2)
        const cDark = Math.min(at(u - 1, my), at(u, my), at(u + 1, my))
        const sVal = (at(u - 5, my) + at(u + 5, my)) * 0.5
        if (cDark < 0.58) midDark++
        if (sVal - cDark > 0.18) sideLight++
      }
      if (midDark >= nStr - 2 && sideLight >= nStr - 2) continue
    }
    // 2. Long tie / slur curve phantom single note: very low confidence note where one side of the string line has no digit stroke
    const keptFrets = c.frets.filter(f => {
      const topP = f.alts[0]?.p ?? 1
      if (f.sure || topP >= 0.58) return true
      const y0 = FRAME_TOP + f.slot * FRAME_GAP
      let paper = 0
      for (let dx = -6; dx <= 6; dx += 2) paper = Math.max(paper, at(u + dx, y0 - 7), at(u + dx, y0 + 7))
      let minAbove = 1, minBelow = 1
      for (let dx = -4; dx <= 4; dx++) {
        for (let dy = -5; dy <= -2; dy++) minAbove = Math.min(minAbove, at(u + dx, y0 + dy))
        for (let dy = 2; dy <= 5; dy++) minBelow = Math.min(minBelow, at(u + dx, y0 + dy))
      }
      // A real digit crosses both above and below the string line; a tie arc or bare line sits on only one side
      return minAbove < paper - 0.12 && minBelow < paper - 0.12
    })
    if (!keptFrets.length) continue
    cleaned.push({ ...c, frets: keptFrets.map(f => ({ ...f })) })
  }
  // 3. Recover slide (/ or \) and hammer-on / pull-off (h or p) marks between consecutive notes on the same string
  const noteCols = cleaned.filter(c => c.kind === 'note')
  for (let i = 0; i + 1 < noteCols.length; i++) {
    const c1 = noteCols[i], c2 = noteCols[i + 1]
    const du = c2.u - c1.u
    if (du < 10 || du > 76) continue
    const xa = Math.round(c1.u + 5), xb = Math.round(c2.u - 5), span = xb - xa
    if (span < 4) continue
    const mid = xa + Math.floor(span / 2)
    for (const f1 of c1.frets) {
      if (f1.dead || f1.tech) continue
      const f2 = c2.frets.find(f => f.slot === f1.slot)
      if (!f2 || f2.dead || f2.fret === f1.fret) continue
      const y0 = FRAME_TOP + f1.slot * FRAME_GAP
      let paper = 0
      for (let x = xa; x <= xb; x++) paper = Math.max(paper, at(x, y0 - 7), at(x, y0 + 7))
      const inkTh = paper - 0.15
      let lAbove = 0, lBelow = 0, rAbove = 0, rBelow = 0, lN = 0, rN = 0
      for (let x = xa; x <= xb; x++) {
        const upMin = Math.min(at(x, y0 - 4), at(x, y0 - 3), at(x, y0 - 2))
        const dnMin = Math.min(at(x, y0 + 2), at(x, y0 + 3), at(x, y0 + 4))
        if (x < mid) { lN++; if (upMin < inkTh) lAbove++; if (dnMin < inkTh) lBelow++ }
        else { rN++; if (upMin < inkTh) rAbove++; if (dnMin < inkTh) rBelow++ }
      }
      if (!lN || !rN) continue
      const la = lAbove / lN, lb = lBelow / lN, ra = rAbove / rN, rb = rBelow / rN
      // Diagonal slide stroke crosses from below-to-above or above-to-below between the two digits
      const diagUp = lb >= 0.45 && ra >= 0.45 && la < 0.25 && rb < 0.25
      const diagDn = la >= 0.45 && rb >= 0.45 && lb < 0.25 && ra < 0.25
      if (diagUp || diagDn) {
        f1.tech = f2.fret > f1.fret ? '/' : '\\'
        continue
      }
      // Slur arc (h / p): continuous ink on ONE side (y0 ± 3..6) while the outer boundary (y0 ± 9) is clean paper
      if (Math.abs(f2.fret - f1.fret) <= 5) {
        for (const dir of [-1, 1] as const) {
          let arcHits = 0, outHits = 0
          for (let x = xa; x <= xb; x++) {
            const arcMin = Math.min(at(x, y0 + dir * 3), at(x, y0 + dir * 4), at(x, y0 + dir * 5), at(x, y0 + dir * 6))
            const oppMin = Math.min(at(x, y0 - dir * 3), at(x, y0 - dir * 4), at(x, y0 - dir * 5))
            if (arcMin < inkTh && oppMin >= inkTh) arcHits++
            if (at(x, y0 + dir * 9) < paper - 0.1) outHits++
          }
          if (arcHits >= span * 0.68 && outHits <= span * 0.15) {
            f1.tech = f2.fret > f1.fret ? 'h' : 'p'
            break
          }
        }
      }
    }
  }
  return cleaned
}

/** The lengths of a bar's columns that add up to `beats`: most likely by the network, nudged by the spacing (a longer
 *  note gets more room, about as length^0.65). Null when nothing fits. */
export function fitBar(cols: { u: number; lens: Len[] }[], beats: number, x1: number, lambda = 0.6): number[] | null {
  if (!cols.length) return null
  const Q = 48 // units per quarter (32nds, triplets, quintuplets aside from 5/7 approximated)
  const goal = Math.round(beats * Q)
  // the page's room per (length^0.65), from the network's first choices
  const gaps = cols.map((c, i) => (i + 1 < cols.length ? cols[i + 1].u : x1) - c.u)
  const ks = cols.map((c, i) => gaps[i] / Math.max(0.05, c.lens[0]?.d ?? 1) ** 0.65).sort((a, b) => a - b)
  const g = ks[Math.floor(ks.length / 2)] || 1
  // the state is (time so far, the choice made for the column before): a run of notes of the same value is all in the
  // tuplet or none of it (a 6 over sixteenths covers all six), so changing tuplet between them costs
  type Cell = { cost: number; prev: string; pick: number }
  let layer = new Map<string, Cell>([['0:-1', { cost: 0, prev: '', pick: -1 }]])
  const back: Map<string, Cell>[] = []
  cols.forEach((c, i) => {
    const next = new Map<string, Cell>()
    const last = i === cols.length - 1
    for (const [key, cell] of layer) {
      const [sumS, pk] = key.split(':')
      const sum = Number(sumS), po = Number(pk) >= 0 ? cols[i - 1].lens[Number(pk)] : null
      c.lens.forEach((o, k) => {
        const q = Math.round(o.d * Q)
        const s2 = sum + q
        if (s2 > goal || q <= 0) return
        const room = last ? 0 : lambda * Math.abs(Math.log(Math.max(1e-3, gaps[i]) / (g * o.d ** 0.65)))
        const split = po && po.b !== undefined && po.b === o.b && (po.t ?? 0) !== (o.t ?? 0) ? 1.2 : 0
        const cost = cell.cost - Math.log(o.p + 1e-6) + room + split
        const nk = `${s2}:${k}`
        const was = next.get(nk)
        if (!was || cost < was.cost) next.set(nk, { cost, prev: key, pick: k })
      })
    }
    back.push(next)
    layer = next
  })
  let endKey = '', best = Infinity
  for (const [key, cell] of layer) if (key.startsWith(`${goal}:`) && cell.cost < best) { best = cell.cost; endKey = key }
  if (!endKey) return null
  const out: number[] = []
  let key = endKey
  for (let i = cols.length - 1; i >= 0; i--) {
    const cell = back[i].get(key)!
    out.unshift(cols[i].lens[cell.pick].d)
    key = cell.prev
  }
  return out
}

function cropCols(g: Gray, a: number, b: number): Gray {
  const w = b - a, px = new Float32Array(w * g.h)
  for (let y = 0; y < g.h; y++) px.set(g.px.subarray(y * g.w + a, y * g.w + b), y * w)
  return { w, h: g.h, px }
}

/** Read every tab staff in the picture with the network. */
export async function readTabCrnn(g: Gray, run: CrnnRun, opts: {
  strings?: number; beats?: number
  /** a video's sound, to settle numbers the picture leaves in doubt: `when` = the time a point of this picture is played
   *  (from the playhead), `tuning` = MIDI of each string, lowest first, with any capo */
  hear?: { at: Hearing; when: (x: number) => number | null; tuning: number[] }
  /** for the scanner lab (tools/scan-lab): each straightened piece the reader saw, its raw columns (frame x = u) and how
   *  frame x maps back to the picture. Reading is unchanged. */
  onPiece?: (piece: { px: Float32Array; W: number; nStr: number; cols: CrnnCol[]; toPage: (u: number) => number; xOffset: number }) => void
} = {}): Promise<TabReading> {
  const nStr = opts.strings ?? 6
  g = deskew(g).g // a crooked photo: level its lines first
  const systems: ReadSystem[] = []
  const sysBars: number[][] = []
  const nums: Num[] = []
  type Col = CrnnCol & { x: number }
  const found: { cols: Col[]; gap: number }[] = []
  // a very wide picture (a scrolling video stitched into one long strip) is looked at in overlapping windows: its staff
  // lines can break between stretches, drift up or down, and the staff finder wants a picture of ordinary proportions.
  // The same staff seen in several windows (matched by height) becomes one system.
  const win = g.w > g.h * 8 ? g.h * 6 : g.w, wov = Math.round(win * 0.15)
  // each window: [from, to, keep from, keep to] (a window keeps the columns between the middles of its overlaps)
  const wins: [number, number, number, number][] = []
  for (let a = 0; a < g.w; a += win - wov) { wins.push([a, Math.min(g.w, a + win), 0, 0]); if (a + win >= g.w) break }
  wins.forEach((w, k) => { w[2] = k === 0 ? -Infinity : w[0] + wov / 2; w[3] = k === wins.length - 1 ? Infinity : w[1] - wov / 2 })
  const multi = wins.length > 1
  const rows: { top: number; ls: number[]; gap: number; left: number; right: number; cols: Col[] }[] = []
  // the staff where it has already been found, carried into a stretch where the staff finder sees none
  const carried = (w: number) => rows.map(r => ({ top: Math.max(0, Math.round(r.ls[0] - r.gap * 2.6)), bottom: Math.min(g.h - 1, Math.round(r.ls[r.ls.length - 1] + r.gap * 1.8)), left: 0, right: w - 1, lines: r.ls }))
  const later: [number, number, number, number][] = []
  for (let pass = 0; pass < 2; pass++) {
    if (pass === 1) { if (!rows.length) break; wins.push(...later) }
  while (wins.length) {
    const [wa, wb, wlo, whi] = wins.shift()!
    const sub = wa === 0 && wb === g.w ? g : cropCols(g, wa, wb)
    let fs = pass === 0 ? findStrips(sub, [nStr]) : []
    // no staff in a long window: its lines may drift up or down a little across it (a stitched video, a phone photo of
    // a wide page) so no one row of pixels holds a whole line. Look again in two overlapping halves.
    if (!fs.length && pass === 0 && multi && wb - wa > g.h * 1.6) {
      const mid = Math.round((wa + wb) / 2), o = Math.round((wb - wa) * 0.08)
      wins.unshift([wa, mid + o, wlo, Math.min(whi, mid)], [mid - o, wb, Math.max(wlo, mid), whi])
      continue
    }
    // a stretch of a long strip where the staff finder sees no staff (long ties, a chord with brackets, a gap in the
    // lines): the staff runs on at the height it had either side of it (from the far side too, on the second pass)
    if (!fs.length && multi) {
      if (!rows.length) { later.push([wa, wb, wlo, whi]); continue }
      fs = carried(sub.w)
    }
    // a staff found in only part of a long window: the rest of the window is looked at again on its own
    if (multi && fs.length) {
      const L = Math.min(...fs.map(f => f.left)), R = Math.max(...fs.map(f => f.right)), edge = g.h * 0.6
      if (L > edge) wins.unshift([wa, wa + L + Math.round(edge / 2), wlo, Math.min(whi, wa + L)])
      if (sub.w - 1 - R > edge) wins.unshift([wa + R - Math.round(edge / 2), wb, Math.max(wlo, wa + R), whi])
    }
    for (const st of fs) {
      // a long stretch is read in overlapping pieces too, each straightened on its own; each keeps its middle part
      const ls = [...st.lines].sort((p, q) => p - q)
      const gap0 = (ls[ls.length - 1] - ls[0]) / Math.max(1, ls.length - 1)
      const piece = gap0 * 72, ov = gap0 * 10
      const cuts: [number, number][] = []
      if (st.right - st.left <= piece * 1.25) cuts.push([st.left, st.right])
      else for (let a = st.left; a < st.right; a += piece - ov) { cuts.push([a, Math.min(st.right, a + piece)]); if (a + piece >= st.right) break }
      const cols: Col[] = []
      let gap = gap0
      for (const [k, [a, b]] of cuts.entries()) {
        const sv = straighten(sub, { ...st, left: a, right: b }, nStr)
        if (k === 0) gap = sv.gap
        const lo = k === 0 ? -Infinity : a + ov / 2, hi = k === cuts.length - 1 ? Infinity : b - ov / 2
        const rawCols = detectStripTechAndClean(decode(await run(sv.px, sv.W), nStr), sv, nStr)
        opts.onPiece?.({ px: sv.px, W: sv.W, nStr, cols: rawCols, toPage: sv.toPage, xOffset: wa })
        for (const c of rawCols) {
          const x = sv.toPage(c.u)
          if (x >= lo && x < hi && x + wa >= wlo && x + wa < whi) cols.push({ ...c, x: x + wa })
        }
      }
      const row = rows.find(r => Math.abs(r.top - ls[0]) < gap * 1.5)
      if (row) { row.cols.push(...cols); row.left = Math.min(row.left, st.left + wa); row.right = Math.max(row.right, st.right + wa) }
      else rows.push({ top: ls[0], ls, gap, left: st.left + wa, right: st.right + wa, cols })
    }
  }
  }
  rows.sort((p, q) => p.top - q.top)
  for (const r of rows) {
    // 1. String names ("E B G D A E") at the start of a staff look like a full chord of unsure numbers: drop them.
    // 2. Vertical "T A B" clef letters at the very left margin (within ~1.1× gap of r.left, before the first real bar/note)
    //    can emit a lone phantom digit (often B:1 or G:1) — drop low-margin clef phantoms right on the left edge.
    const cols = r.cols.sort((p, q) => p.x - q.x).filter(c => {
      if (c.kind !== 'note') return true
      if (c.x < r.left + r.gap * 2.5 && c.frets.length >= nStr - 1 && c.frets.filter(f => !f.sure).length * 2 >= c.frets.length) return false
      if (c.x < r.left + r.gap * 1.15 && c.frets.length === 1 && (!c.frets[0].sure || c.frets[0].fret === 1) && c.p < 0.78) return false
      return true
    })
    const si = systems.length
    systems.push({ lines: [...r.ls].reverse(), gap: r.gap, left: r.left, right: r.right, bars: [] }) // low string first
    sysBars.push(cols.filter(c => c.kind === 'bar').map(c => c.x))
    for (const c of cols) if (c.kind === 'note') {
      // numbers in doubt (or moderately confident with visual twins): the note heard when the playhead was over this column settles them
      const checkAudio = opts.hear && c.frets.some(f => (!f.sure || (f.alts[0]?.p ?? 1) < 0.95) && f.alts.length > 1)
      const t = checkAudio ? opts.hear!.when(c.x) : null
      const sal = t !== null && t !== undefined ? opts.hear!.at(t) : null
      for (const f of c.frets) {
        let { fret, dead, sure, tech } = f
        const string = nStr - 1 - f.slot
        const base = opts.hear?.tuning[string]
        if (sal && f.alts.length > 1 && base !== undefined) {
          const opt = f.alts.map(a => ({ midi: a.dead ? null : base + a.fret, p: a.p }))
          const s = opt.map(o => (o.midi === null ? 0 : sal(o.midi))), top = Math.max(...s, 1e-9)
          if (!sure) {
            const k = referee(opt, sal)
            fret = f.alts[k].fret; dead = f.alts[k].dead
            // the sound clearly backs it: no amber ring
            if (s[k] / top > 0.92 && s.every((v, i) => i === k || v / top < 0.55)) sure = 1
          } else if ((f.alts[0]?.p ?? 1) < 0.95 && top > 0.25 && s[0] / top < 0.15) {
            // The network was fairly sure (0.82..0.95), but the audio has zero support for its top pick and strong support for a visual twin
            const k = referee(opt, sal)
            if (k > 0 && s[k] / top > 0.82 && f.alts[k].p >= 0.03) {
              fret = f.alts[k].fret; dead = f.alts[k].dead; sure = 0
            } else if ((f.alts[0]?.p ?? 1) < 0.90 && s[0] < 0.05) {
              sure = 0
            }
          }
        }
        const altFrets = f.alts.filter(a => !a.dead && a.fret !== fret).map(a => a.fret)
        nums.push({
          sys: si,
          string,
          x: c.x,
          fret,
          sure,
          ...(dead ? { dead: true } : {}),
          ...(tech ? { tech } : {}),
          ...(altFrets.length ? { alts: altFrets } : {}),
        })
      }
    }
    found.push({ cols, gap: r.gap })
  }
  // the time signature isn't read by the network: the commonest bar length its first choices add up to
  const sums = new Map<number, number>()
  found.forEach(f => {
    const xb = [-Infinity, ...f.cols.filter(c => c.kind === 'bar').map(c => c.x), Infinity]
    for (let i = 0; i + 1 < xb.length; i++) {
      const here = f.cols.filter(c => c.kind !== 'bar' && !c.grace && c.x > xb[i] && c.x < xb[i + 1])
      if (here.length < 2 || here.some(c => c.printed < 0.5)) continue
      const sum = Math.round(here.reduce((a, c) => a + (c.lens[0]?.d ?? 0), 0) * 8) / 8
      if (sum >= 1 && sum <= 12) sums.set(sum, (sums.get(sum) ?? 0) + 1)
    }
  })
  const voted = [...sums].sort((a, b) => b[1] - a[1])[0]?.[0]
  // a bar line the network missed (thin and blurred in a small video): a stretch between two bar lines whose note
  // lengths add up to two or more whole bars is split where each bar's worth runs out
  const meter = opts.beats ?? voted
  if (meter) found.forEach((f, si) => {
    const xb = [-Infinity, ...sysBars[si], Infinity]
    const add: number[] = []
    for (let i = 0; i + 1 < xb.length; i++) {
      const here = f.cols.filter(c => c.kind !== 'bar' && !c.grace && c.x > xb[i] && c.x < xb[i + 1])
      if (here.length < 3 || here.filter(c => c.printed < 0.5).length > here.length * 0.2) continue
      const sum = here.reduce((a, c) => a + (c.lens[0]?.d ?? 0), 0)
      const k = Math.round(sum / meter)
      if (k < 2 || Math.abs(sum - k * meter) > meter * 0.2) continue
      let acc = 0, next = meter
      for (let j = 0; j + 1 < here.length; j++) {
        acc += here[j].lens[0]?.d ?? 0
        // where a bar's worth runs out (or the nearest step past it, when a length or two was misread)
        if (acc >= next - 1e-3) { add.push((here[j].x + here[j + 1].x) / 2); next += meter }
      }
    }
    if (add.length) sysBars[si] = [...sysBars[si], ...add].sort((a, b) => a - b)
  })
  return assemble(systems, sysBars, nums, {
    clef: false,
    ...(opts.beats ? { beats: opts.beats } : voted ? { beats: voted } : {}),
    durations: (si, xs, x0, x1, beats) => {
      const f = found[si]
      const here = f.cols.filter(c => c.kind !== 'bar' && c.x > x0 && c.x < x1)
      // no rhythm printed under this bar: let the spacing decide
      if (!here.length || here.reduce((a, c) => a + c.printed, 0) / here.length < 0.5) return null
      const mains = here.filter(c => !c.grace)
      // the network's first choices, when they make a whole bar (of this time signature, or of another when every
      // column is sure: the time signature can change), else the likeliest set that does
      const first = mains.map(c => c.lens[0]?.d ?? 0)
      const fsum = first.reduce((a, b) => a + b, 0)
      const allSure = mains.every(c => (c.lens[0]?.p ?? 0) > 0.9)
      // far off (a bar line missed or seen twice): squeezing the notes into one bar would make them all wrong, so the
      // network's own lengths stand
      const farOff = Math.abs(fsum - beats) > beats * 0.25
      const lens = Math.abs(fsum - beats) < 1e-3 || farOff || (allSure && fsum > 0) ? first : fitBar(mains.map(c => ({ u: c.x, lens: c.lens })), beats, x1) ?? first
      if (!lens.every(d => d > 0)) return null
      // each note column of the layout gets the length of the network column nearest it; rests come back as rests
      const durOf = new Map<Col, number>()
      mains.forEach((c, i) => durOf.set(c, lens[i]))
      const near = (x: number) => here.reduce<Col | null>((b, c) => (Math.abs(c.x - x) < f.gap * 0.7 && (!b || Math.abs(c.x - x) < Math.abs(b.x - x)) ? c : b), null)
      const used = new Set<Col>()
      const durs = xs.map(x => { const c = near(x); if (!c) return 0; used.add(c); return c.grace ? 0.125 : durOf.get(c) ?? 0 })
      if (durs.some(d => d === 0)) return null
      const rests = mains.filter(c => !used.has(c)).map(c => ({ x: c.x, dur: durOf.get(c)! }))
      return { durs, rests, grace: xs.map(x => !!near(x)?.grace) }
    },
  })
}

/** A strip's timeline (playhead x → seconds) as a lookup: the time a point of the strip was played, or null outside it. */
export function timeOf(tl: { x: number; t: number }[]): (x: number) => number | null {
  // keep the points in time order whose x keeps growing (the playhead only moves on)
  const pts: { x: number; t: number }[] = []
  for (const p of [...tl].sort((a, b) => a.t - b.t)) if (!pts.length || p.x > pts[pts.length - 1].x) pts.push(p)
  return x => {
    if (pts.length < 2 || x < pts[0].x || x > pts[pts.length - 1].x) return null
    let i = 1
    while (pts[i].x < x) i++
    const a = pts[i - 1], b = pts[i]
    return a.t + ((x - a.x) / Math.max(1e-6, b.x - a.x)) * (b.t - a.t)
  }
}

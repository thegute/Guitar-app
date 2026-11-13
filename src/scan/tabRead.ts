// KGuitar's own tab-picture reader (owner 2026-11-12: the AI reader got a book tab wrong: wrong strings AND wrong frets).
// It reads a printed tab the way a person does, with no AI:
//   1. find each six-line (or four-line) tab staff, and its bar lines;
//   2. take the staff lines out, keeping the digits that sit on them;
//   3. every mark that sits ON a line is a fret number: the line it sits on is the string (exact, never guessed);
//   4. read each digit by comparing it with printed digits (src/scan/digitTemplates.ts, many book fonts), then again with the
//      page's own digits (each book uses one font: the page teaches the reader its style);
//   5. numbers in one column are played together; a bar's columns get their lengths from how the page spaces them, fitted so
//      the bar adds up (a first bar that is short is a pickup);
//   6. every number keeps how sure the reader was, so the app can glow the unsure ones.
// Pure functions on a grey picture (Gray from scan/image.ts), so they run the same in the app and in tests.
import { findStrips, type Gray } from './image'
import { TEMPLATES_B64, TEMPLATE_COUNT, TEMPLATE_W as TW, TEMPLATE_H as TH } from './digitTemplates'

export interface ReadNote { string: number; fret: number; x: number; sure: number; dead?: boolean }
export interface ReadStep { x: number; notes: ReadNote[]; dur: number }
export interface ReadBar { steps: ReadStep[]; beats: number; x0: number; x1: number }
export interface ReadSystem { lines: number[]; gap: number; left: number; right: number; bars: ReadBar[]; /** which part (Guitar 1, 2 …) when a system stacks several staves; 0 when there is one */ part?: number; partName?: string }
export interface TabReading { systems: ReadSystem[]; unsure: number; notes: number; meter: number }

export interface Comp { x0: number; x1: number; y0: number; y1: number; n: number }

// ---------- digit templates ----------
let TPL: { d: number; v: Float32Array }[] | null = null
function templates() {
  if (TPL) return TPL
  const raw = typeof atob === 'function' ? Uint8Array.from(atob(TEMPLATES_B64), c => c.charCodeAt(0)) : new Uint8Array(Buffer.from(TEMPLATES_B64, 'base64'))
  const n = TEMPLATE_COUNT, sz = TW * TH
  TPL = []
  for (let i = 0; i < n; i++) {
    const v = new Float32Array(sz)
    for (let k = 0; k < sz; k++) v[k] = raw[n + i * sz + k] / 255
    TPL.push({ d: raw[i], v: centre(v) })
  }
  return TPL
}
/** zero mean, unit length (so comparing is a correlation) */
export function centre(v: Float32Array): Float32Array {
  let m = 0
  for (const x of v) m += x
  m /= v.length
  let s = 0
  const o = new Float32Array(v.length)
  for (let i = 0; i < v.length; i++) { o[i] = v[i] - m; s += o[i] * o[i] }
  s = Math.sqrt(s) || 1
  for (let i = 0; i < v.length; i++) o[i] /= s
  return o
}
const dot = (a: Float32Array, b: Float32Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s }

/** One digit's ink (1 = ink) cut out and scaled into the template grid the same way the templates were made. */
export function normDigit(ink: Float32Array, w: number, h: number): Float32Array {
  const s = Math.min(TW / w, TH / h)
  const nw = Math.max(1, Math.round(w * s)), nh = Math.max(1, Math.round(h * s))
  const ox = Math.floor((TW - nw) / 2), oy = Math.floor((TH - nh) / 2)
  const out = new Float32Array(TW * TH)
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    // area average of the source pixels under this cell (bilinear-ish downscale)
    const sx0 = (x / nw) * w, sx1 = ((x + 1) / nw) * w, sy0 = (y / nh) * h, sy1 = ((y + 1) / nh) * h
    let acc = 0, wt = 0
    for (let yy = Math.floor(sy0); yy < Math.ceil(sy1); yy++) for (let xx = Math.floor(sx0); xx < Math.ceil(sx1); xx++) {
      const fx = Math.min(xx + 1, sx1) - Math.max(xx, sx0), fy = Math.min(yy + 1, sy1) - Math.max(yy, sy0)
      if (fx <= 0 || fy <= 0) continue
      acc += ink[Math.min(h - 1, yy) * w + Math.min(w - 1, xx)] * fx * fy; wt += fx * fy
    }
    out[(oy + y) * TW + ox + x] = wt ? acc / wt : 0
  }
  return out
}

/** classes: the digits 0–9 and 10 = X (a dead note) */
const NCLS = 11
export const DEAD = 10
/** Best digit for a normalised glyph: per digit the best match over all templates; `sure` = margin over the runner-up. */
export function classify(v: Float32Array, extra?: Map<number, Float32Array[]>, skip?: Float32Array, set: 'tab' | 'sig' | 'rest' = 'tab'): { d: number; score: number; sure: number; all: Float32Array } {
  const c = centre(v)
  const best = new Float32Array(NCLS).fill(-1)
  // 'tab': fret digits and X; 'sig': the engraved time-signature digits (stored as 20–29); 'rest': rests (40–45 → 0–5)
  const base = set === 'sig' ? 20 : set === 'rest' ? 40 : 0
  for (const t of templates()) {
    const d = t.d - base
    if (d < 0 || d >= NCLS || (set === 'tab' && t.d >= 20) || (set === 'sig' && t.d >= 40) || (set === 'rest' && d > 5)) continue
    const s = dot(c, t.v); if (s > best[d]) best[d] = s
  }
  if (extra) for (const [d, vs] of extra) for (const t of vs) { if (t === skip) continue; const s = dot(c, t) * 1.04; if (s > best[d]) best[d] = s }
  let d = 0
  for (let k = 1; k < NCLS; k++) if (best[k] > best[d]) d = k
  let second = -1
  for (let k = 0; k < NCLS; k++) if (k !== d && best[k] > second) second = best[k]
  return { d, score: best[d], sure: best[d] - second, all: best }
}

// ---------- the picture ----------
function otsu(g: Gray): number {
  const hist = new Float64Array(64)
  for (const v of g.px) hist[Math.min(63, Math.floor(v * 64))]++
  const n = g.px.length
  let sum = 0
  for (let i = 0; i < 64; i++) sum += i * hist[i]
  let sumB = 0, wB = 0, best = 0, th = 32
  for (let i = 0; i < 64; i++) {
    wB += hist[i]; if (!wB) continue
    const wF = n - wB; if (!wF) break
    sumB += i * hist[i]
    const mB = sumB / wB, mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) ** 2
    if (between > best) { best = between; th = i }
  }
  return (th + 0.5) / 64
}

/** Ink mask of one staff's area (1 = ink), with the staff lines and bar lines taken out where nothing crosses them. */
function staffInk(g: Gray, top: number, bottom: number, left: number, right: number, lines: number[], bars: number[], th: number) {
  const w = right - left + 1, h = bottom - top + 1
  const ink = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) ink[y * w + x] = g.px[(top + y) * g.w + left + x] < th ? 1 : 0
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? ink[y * w + x] : 0)
  // line thickness: dark rows around each line's centre
  // the line band: rows around each line that are greyer than paper along most of the staff (anti-aliased lines are
  // half-grey on a scan, so a softer threshold than the ink one)
  const soft = Math.min(0.9, th + 0.22)
  const greyRow = (y: number) => { let c = 0, n = 0; for (let x = 0; x < w; x += 2) { n++; if (g.px[(top + y) * g.w + left + x] < soft) c++ } return c / n }
  for (const ly of lines) {
    const cy = ly - top
    let t0 = cy, t1 = cy
    while (t0 > cy - 4 && greyRow(t0 - 1) > 0.5) t0--
    while (t1 < cy + 4 && greyRow(t1 + 1) > 0.5) t1++
    for (let y = t0; y <= t1; y++) for (let x = 0; x < w; x++) if (!ink[y * w + x] && g.px[(top + y) * g.w + left + x] < soft) ink[y * w + x] = 1
    for (let x = 0; x < w; x++) {
      // keep the line pixels where a digit's stroke goes through (ink just above or just below the line)
      const above = at(x, t0 - 1) || at(x, t0 - 2), below = at(x, t1 + 1) || at(x, t1 + 2)
      if (above && below) continue
      if (above || below) {
        // a stroke that only touches one side: keep only if it carries on across (a digit's bowl), else it's the line
        const side = above ? t0 - 1 : t1 + 1
        if (at(x - 1, side) || at(x + 1, side)) continue
      }
      for (let y = t0; y <= t1; y++) ink[y * w + x] = 0
    }
  }
  for (const bx of bars) {
    const cx = bx - left
    for (let x = cx - 2; x <= cx + 2; x++) {
      if (x < 0 || x >= w) continue
      for (let y = lines[lines.length - 1] - top - 2; y <= lines[0] - top + 2; y++) {
        if (y < 0 || y >= h) continue
        if (at(x - 3, y) || at(x + 3, y)) continue
        ink[y * w + x] = 0
      }
    }
  }
  return { ink, w, h }
}

/** Taking a staff line out can cut a number in two where its stroke crosses the line (a blurred scan, a slanting stroke):
 *  pieces just above and just below one line, side by side, are one mark again, and the stroke is put back across the
 *  line where both pieces have ink. */
function rejoin(cs: Comp[], ink: Uint8Array, w: number, g: Gray, top: number, left: number, lines: number[], gap: number, th: number): Comp[] {
  const soft = Math.min(0.9, th + 0.22)
  const out = cs.slice()
  for (let pass = 0; pass < 2; pass++) {
    let changed = false
    for (let i = 0; i < out.length; i++) for (let j = 0; j < out.length; j++) {
      if (i === j) continue
      const a = out[i], b = out[j]
      if (!a || !b || b.y0 < a.y1 - 3 || b.y0 <= a.y0 + 2 || b.y1 <= a.y1 + 2) continue // a above b (they may share a row)
      const between = Math.max(0, b.y0 - a.y1 - 1)
      if (between > Math.max(3, gap * 0.22)) continue
      const ov = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + 1
      if (ov < Math.min(a.x1 - a.x0 + 1, b.x1 - b.x0 + 1) * 0.5) continue
      // the cut is where a staff line runs, and the whole stays the size of one number
      const ly = lines.map(l => l - top).find(l => l >= a.y1 - 2 && l <= b.y0 + 2)
      if (ly === undefined) continue
      const y0 = a.y0, y1 = b.y1
      if (y1 - y0 + 1 > gap * 1.25) continue
      // put the stroke back: columns where a's last rows and b's first rows both have ink (±1 pixel)
      const has = (x: number, y: number) => x >= 0 && x < w && ink[y * w + x] === 1
      for (let x = Math.max(a.x0, b.x0) - 1; x <= Math.min(a.x1, b.x1) + 1; x++) {
        const up = has(x - 1, a.y1) || has(x, a.y1) || has(x + 1, a.y1)
        const dn = has(x - 1, b.y0) || has(x, b.y0) || has(x + 1, b.y0)
        if (!up || !dn) continue
        for (let y = a.y1 + 1; y < b.y0; y++) if (g.px[(top + y) * g.w + left + x] < soft) ink[y * w + x] = 1
      }
      out[i] = { x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0, y1, n: a.n + b.n + between }
      out[j] = undefined as unknown as Comp
      changed = true
    }
    // tiny bits left in the cut (a pixel or two of the stroke) belong to the mark around them
    for (let i = 0; i < out.length; i++) {
      const c = out[i]
      if (!c || c.n > 6) continue
      const host = out.findIndex((d, k) => d && k !== i && d.n > 6 && c.x0 >= d.x0 - 1 && c.x1 <= d.x1 + 1 && c.y0 >= d.y0 - 1 && c.y1 <= d.y1 + 1)
      if (host >= 0) { out[host] = { ...out[host], n: out[host].n + c.n }; out[i] = undefined as unknown as Comp; changed = true }
    }
    if (!changed) break
  }
  return out.filter(Boolean)
}

export function components(ink: Uint8Array, w: number, h: number): Comp[] {
  const seen = new Uint8Array(w * h)
  const out: Comp[] = []
  const stack: number[] = []
  for (let i = 0; i < w * h; i++) {
    if (!ink[i] || seen[i]) continue
    let x0 = w, x1 = 0, y0 = h, y1 = 0, n = 0
    stack.push(i); seen[i] = 1
    while (stack.length) {
      const p = stack.pop()!, x = p % w, y = (p - x) / w
      n++
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
        const q = yy * w + xx
        if (ink[q] && !seen[q]) { seen[q] = 1; stack.push(q) }
      }
    }
    out.push({ x0, x1, y0, y1, n })
  }
  return out
}

/** Bar lines: thin vertical ink running the full height of the staff. */
function findBars(g: Gray, lines: number[], left: number, right: number, th: number, gap: number): number[] {
  const yTop = lines[lines.length - 1], yBot = lines[0]
  const xs: number[] = []
  for (let x = left; x <= right; x++) {
    let dark = 0
    for (let y = yTop; y <= yBot; y++) if (g.px[y * g.w + x] < th) dark++
    if (dark / (yBot - yTop + 1) < 0.92) continue
    // thin: the columns a little to each side are mostly paper between the lines
    let side = 0
    for (let y = yTop + 2; y <= yBot - 2; y++) {
      const a = x - Math.max(3, Math.round(gap * 0.35)), b = x + Math.max(3, Math.round(gap * 0.35))
      if (a >= 0 && g.px[y * g.w + a] < th) side++
      if (b < g.w && g.px[y * g.w + b] < th) side++
    }
    if (side / (2 * (yBot - yTop - 3)) > 0.5) continue
    if (xs.length && x - xs[xs.length - 1] <= Math.max(3, gap * 0.4)) { xs[xs.length - 1] = x; continue }
    xs.push(x)
  }
  return xs
}

// ---------- rhythm from spacing ----------
const DURS = [0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1, 1.5, 2, 3, 4]
/** Lengths for a bar's columns from the gaps between them, so they add up to `beats`. Engravers give longer notes more
 *  room but not in proportion (about duration^0.6), so the gaps are bent back before snapping to note lengths. */
export function fitRhythm(gaps: number[], beats: number): number[] { return fitRhythmCost(gaps, beats).durs }
export function fitRhythmCost(gaps: number[], beats: number): { durs: number[]; cost: number } {
  const n = gaps.length
  if (!n) return { durs: [], cost: 0 }
  const raw = gaps.map(g => Math.pow(Math.max(g, 1e-3), 1 / 0.65))
  const tot = raw.reduce((a, b) => a + b, 0)
  const want = raw.map(r => (r / tot) * beats)
  // best snap that sums to beats: DP over (index, sum in 1/12 beats)
  const U = 12, T = Math.round(beats * U)
  const units = DURS.map(d => Math.round(d * U))
  let cost = new Map<number, { c: number; prev: number[] }>([[0, { c: 0, prev: [] }]])
  for (let i = 0; i < n; i++) {
    const next = new Map<number, { c: number; prev: number[] }>()
    for (const [s, v] of cost) for (let k = 0; k < units.length; k++) {
      const s2 = s + units[k]
      if (s2 > T) continue
      // triplet lengths cost a little more (choose them only when the spacing clearly asks)
      const c = v.c + Math.abs(Math.log(DURS[k] / Math.max(want[i], 0.05))) + (units[k] % 3 && units[k] % 4 ? 0.12 : 0)
      const cur = next.get(s2)
      if (!cur || c < cur.c) next.set(s2, { c, prev: [...v.prev, k] })
    }
    cost = next
  }
  const end = cost.get(T)
  if (end) return { durs: end.prev.map(k => DURS[k]), cost: end.c / n }
  // can't add up exactly (odd spacing): plain proportions, rounded to 16ths
  return { durs: want.map(x => Math.max(0.25, Math.round(x * 4) / 4)), cost: 9 }
}

// ---------- the reader ----------
type ReadOpts = { strings?: number; beats?: number; noScale?: boolean; debug?: (d: { sys: number; ink: Uint8Array; w: number; h: number; top: number; left: number; comps: Comp[]; raw: Comp[] }) => void }

/** The picture made k times bigger (bilinear): small print reads far better once its numbers are ~20 pixels tall. */
function enlarge(g: Gray, k: number): Gray {
  const w = Math.round(g.w * k), h = Math.round(g.h * k)
  const px = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const sy = Math.min(g.h - 1, Math.max(0, (y + 0.5) / k - 0.5)), y0 = Math.floor(sy), y1 = Math.min(g.h - 1, y0 + 1), fy = sy - y0
    for (let x = 0; x < w; x++) {
      const sx = Math.min(g.w - 1, Math.max(0, (x + 0.5) / k - 0.5)), x0 = Math.floor(sx), x1 = Math.min(g.w - 1, x0 + 1), fx = sx - x0
      const a = g.px[y0 * g.w + x0] * (1 - fx) + g.px[y0 * g.w + x1] * fx, b = g.px[y1 * g.w + x0] * (1 - fx) + g.px[y1 * g.w + x1] * fx
      px[y * w + x] = a * (1 - fy) + b * fy
    }
  }
  return { w, h, px }
}

export function readTab(g: Gray, opts: ReadOpts = {}): TabReading {
  const nStr = opts.strings ?? 6
  // small print (string lines under 16 pixels apart, numbers under ~10 pixels tall): read an enlarged copy, then put the positions back to this size
  if (!opts.noScale) {
    const st = findStrips(g, [nStr])
    if (st.length) {
      const gaps = st.map(x => (Math.max(...x.lines) - Math.min(...x.lines)) / (nStr - 1)).sort((a, b) => a - b)
      const gp = gaps[Math.floor(gaps.length / 2)]
      if (gp < 16) {
        const k = Math.min(3, 24 / gp)
        const r = readTab(enlarge(g, k), { ...opts, noScale: true })
        for (const s of r.systems) {
          s.lines = s.lines.map(y => y / k); s.gap /= k; s.left /= k; s.right /= k
          for (const b of s.bars) { b.x0 /= k; b.x1 /= k; for (const st2 of b.steps) { st2.x /= k; for (const n of st2.notes) n.x /= k } }
        }
        return r
      }
    }
  }
  const th = Math.min(0.62, Math.max(0.35, otsu(g)))
  const strips = findStrips(g, [nStr])
  const systems: ReadSystem[] = []
  type Cand = { sys: number; string: number; x: number; v: Float32Array; parts: number; h: number; cls?: ReturnType<typeof classify> }
  const cands: Cand[] = []
  const sysBars: number[][] = []
  const found: { si: number; comps: Comp[]; onLine: number[]; ink: Uint8Array; w: number; left: number }[] = []
  for (const st of strips) {
    const lines = [...st.lines].sort((a, b) => b - a) // lines[0] = the lowest line on the page = the lowest string
    const gap = (lines[0] - lines[lines.length - 1]) / (nStr - 1)
    const left = st.left, right = st.right
    const bars = findBars(g, lines, left, right, th, gap)
    const top = Math.max(0, Math.round(lines[lines.length - 1] - gap * 0.75)), bottom = Math.min(g.h - 1, Math.round(lines[0] + gap * 0.75))
    const { ink, w, h } = staffInk(g, top, bottom, left, right, lines, bars, th)
    // numbers stacked on neighbouring strings can touch (a 3 on the G right over a 0 on the D): cut a tall mark between the
    // lines it spans
    const raw: Comp[] = []
    for (const c of rejoin(components(ink, w, h), ink, w, g, top, left, lines, gap, th)) {
      const ch = c.y1 - c.y0 + 1
      if (ch <= gap * 1.25) { raw.push(c); continue }
      if (ch > gap * 3.4 || c.x1 - c.x0 + 1 > gap * 1.1) continue // stacked digits span 2–3 strings; longer = a thick bar line
      if (c.n > 0.72 * ch * (c.x1 - c.x0 + 1)) continue // a solid stroke (the thick line of a repeat sign), not digits
      const inside = lines.map(l => l - top).filter(l => l > c.y0 - gap * 0.3 && l < c.y1 + gap * 0.3).sort((a, b) => a - b)
      const cuts = inside.slice(1).map((l, k) => Math.round((l + inside[k]) / 2))
      let y0 = c.y0
      for (const cut of [...cuts, c.y1 + 1]) {
        let bx0 = w, bx1 = -1, by0 = h, by1 = -1, n = 0
        for (let y = y0; y < cut; y++) for (let x = c.x0; x <= c.x1; x++) if (ink[y * w + x]) { n++; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y }
        if (n) raw.push({ x0: bx0, x1: bx1, y0: by0, y1: by1, n })
        y0 = cut
      }
    }
    const comps = raw.filter(c => {
      const ch = c.y1 - c.y0 + 1, cw = c.x1 - c.x0 + 1
      return ch >= gap * 0.42 && ch <= gap * 1.25 && cw <= gap * 1.1 && c.n >= 6
    })
    opts.debug?.({ sys: systems.length, ink, w, h, top, left, comps, raw })
    // which line each mark sits on
    const onLine = comps.map(c => {
      const cy = top + (c.y0 + c.y1) / 2
      let best = -1, bd = Infinity
      lines.forEach((ly, i) => { const d = Math.abs(cy - ly); if (d < bd) { bd = d; best = i } })
      return bd <= gap * 0.42 ? best : -1
    })
    found.push({ si: systems.length, comps, onLine, ink, w, left })
    systems.push({ lines, gap, left, right, bars: [] })
    sysBars.push(bars)
  }
  // the page's number height (one font per page): the commonest height of the marks on the lines. Marks much taller are
  // time signatures, brackets round tied notes "(12)", or digits run into a tie or slide line; much shorter = dots, ticks
  const hist = new Map<number, number>()
  for (const f of found) f.comps.forEach((c, i) => { if (f.onLine[i] >= 0) { const hh = c.y1 - c.y0 + 1; for (const d of [-1, 0, 1]) hist.set(hh + d, (hist.get(hh + d) ?? 0) + (d ? 1 : 2)) } })
  let Hd = 0, hb = 0
  for (const [hh, n] of hist) if (n > hb || (n === hb && hh > Hd)) { hb = n; Hd = hh }
  if (hb < 16) Hd = 0 // too few marks to tell: no height check
  const kind = (c: Comp): 'digit' | 'bracket' | 'other' => {
    if (!Hd) return 'digit'
    const hh = c.y1 - c.y0 + 1, ww = c.x1 - c.x0 + 1
    if (hh >= Hd * 0.72 && hh <= Hd * 1.14) return 'digit'
    if (hh > Hd * 1.14 && hh <= Hd * 1.8 && ww <= Hd * 0.42) return 'bracket'
    return 'other'
  }
  for (const { si, comps, onLine, ink, w, left } of found) {
    // marks on the same line side by side make one number (12, 10 …); brackets round a number are stepped over
    const used = new Set<number>()
    const kinds = comps.map(kind)
    const order = comps.map((_, i) => i).filter(i => kinds[i] === 'digit').sort((a, b) => comps[a].x0 - comps[b].x0)
    for (const i of order) {
      if (used.has(i) || onLine[i] < 0) continue
      const group = [i]
      used.add(i)
      for (const j of order) {
        if (used.has(j) || onLine[j] !== onLine[i]) continue
        const last = comps[group[group.length - 1]]
        const hh = last.y1 - last.y0 + 1
        if (comps[j].x0 > last.x1 && comps[j].x0 - last.x1 <= Math.max(2, (Hd || hh) * 0.5) && Math.abs((comps[j].y1 - comps[j].y0) - (last.y1 - last.y0)) <= hh * 0.3) { group.push(j); used.add(j) }
      }
      if (group.length > 2) continue // three digits on a string isn't a fret number
      for (const k of group) {
        const c = comps[k], cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1
        const cut = new Float32Array(cw * ch)
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) cut[y * cw + x] = ink[(c.y0 + y) * w + c.x0 + x]
        cands.push({ sys: si, string: onLine[i], x: left + (c.x0 + c.x1) / 2, v: normDigit(cut, cw, ch), parts: group.length > 1 ? (k === group[0] ? 1 : 2) : 0, h: ch })
      }
    }
  }
  // pass 1 with the book fonts, pass 2 with the page's own digits (the sure ones teach the rest)
  for (const c of cands) c.cls = classify(c.v)
  const mine = new Map<number, Float32Array[]>()
  const own = new Map<Cand, Float32Array>() // a mark never teaches itself (else it would always match perfectly)
  for (const c of cands) if ((c.cls!.score > 0.72 && c.cls!.sure > 0.08) || (c.cls!.score > 0.6 && c.cls!.sure > 0.12)) { // a clear winner teaches even when the book fonts fit it loosely (small print)
    const l = mine.get(c.cls!.d) ?? []
    if (l.length < 24) { const t = centre(c.v); l.push(t); own.set(c, t) }
    mine.set(c.cls!.d, l)
  }
  if (mine.size >= 3) for (const c of cands) {
    // the page's digits can outvote the book fonts; when the fonts were torn between two digits, keep the doubt
    const first = c.cls!
    c.cls = classify(c.v, mine, own.get(c))
    if (first.d !== c.cls.d || first.sure < 0.03) c.cls = { ...c.cls, sure: Math.min(c.cls.sure, first.sure + 0.03) }
  }
  // a printed page's numbers all look alike: a mark that matches much worse than the page's usual is a symbol (a rest, a
  // fingering mark, a letter), not a fret number. Marks a little worse than usual are kept but marked unsure.
  const scores = cands.map(c => c.cls!.score).sort((a, b) => a - b)
  const usual = scores.length >= 12 ? scores[Math.floor(scores.length / 2)] : 0.75
  const floor = Math.max(0.5, usual - 0.25), doubt = usual - 0.2
  for (const c of cands) if (c.cls!.score < doubt && c.cls!.score >= floor) c.cls = { ...c.cls!, sure: Math.min(c.cls!.sure, 0.03) }
  // join the parts of two-digit numbers, drop marks that aren't digits (letters, ties, dots)
  const nums: Num[] = []
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i]
    if (c.cls!.score < floor) continue
    if (c.parts === 1 && cands[i + 1]?.parts === 2) {
      const d = cands[i + 1]
      if (d.cls!.score < floor) continue
      const fret = c.cls!.d * 10 + d.cls!.d
      if (c.cls!.d !== DEAD && d.cls!.d !== DEAD && fret <= 24) nums.push({ sys: c.sys, string: c.string, x: (c.x + d.x) / 2, fret, sure: Math.min(c.cls!.sure, d.cls!.sure, c.cls!.score - floor, d.cls!.score - floor) })
      i++
      continue
    }
    if (c.parts === 2) continue
    const dead = c.cls!.d === DEAD
    nums.push({ sys: c.sys, string: c.string, x: c.x, fret: dead ? 0 : c.cls!.d, sure: Math.min(c.cls!.sure, c.cls!.score - floor), ...(dead ? { dead } : {}) })
  }
  return assemble(systems, sysBars, nums, opts)
}

/** A number read on a string line: which staff, which string (0 = lowest), where across, the fret, how sure. */
export type Num = { sys: number; string: number; x: number; fret: number; sure: number; dead?: boolean }
export interface AssembleOpts {
  beats?: number
  /** a printed time signature in force at this point of a staff (beats per bar, in quarter notes) */
  meterAt?: (sys: number, x: number) => number | undefined
  /** note lengths read from the page itself (rhythm stems under the staff): one per step, plus the rests between them;
   *  null to work them out from the spacing */
  durations?: (sys: number, xs: number[], x0: number, x1: number) => { durs: number[]; rests?: { x: number; dur: number }[] } | null
  /** skip the clef area at the start of each staff (pictures: the TAB letters can look like digits) */
  clef?: boolean
}

/** Staves, their bar lines and the numbers on them → bars of columns with note lengths (shared by the picture reader and
 *  the PDF shape reader). */
export function assemble(systems: ReadSystem[], sysBars: number[][], nums: Num[], opts: AssembleOpts = {}): TabReading {
  let unsure = 0, count = 0
  let median = 0
  const widths: number[] = []
  systems.forEach((s, si) => {
    const edges = [s.left, ...sysBars[si], s.right].filter((x, i, a) => i === 0 || x - a[i - 1] > s.gap * 1.5)
    for (let b = 0; b + 1 < edges.length; b++) widths.push(edges[b + 1] - edges[b])
  })
  median = widths.length ? widths.slice().sort((a, b) => a - b)[Math.floor(widths.length / 2)] : 1
  // how far after a bar line its first note usually sits (to measure a first bar without its clef area)
  const leads: number[] = []
  systems.forEach((s, si) => {
    const edges = [s.left, ...sysBars[si], s.right]
    const xs = nums.filter(n => n.sys === si).map(n => n.x)
    for (let b = 1; b + 1 < edges.length; b++) { const f = xs.filter(x => x > edges[b] && x < edges[b + 1]); if (f.length) leads.push(Math.min(...f) - edges[b]) }
  })
  const lead = leads.length ? leads.sort((a, b) => a - b)[Math.floor(leads.length / 2)] : 0
  // the bars and their columns
  type Raw = { si: number; x0: number; x1: number; steps: ReadStep[]; first: boolean }
  const raws: Raw[] = []
  let firstBar = true
  systems.forEach((s, si) => {
    const mineN = nums.filter(n => n.sys === si).sort((a, b) => a.x - b.x)
    const edges = [s.left, ...sysBars[si], s.right].filter((x, i, a) => i === 0 || x - a[i - 1] > s.gap * 1.5)
    for (let b = 0; b + 1 < edges.length; b++) {
      const x0 = edges[b], x1 = edges[b + 1]
      // the first bar of each staff starts with the TAB clef (its letters can look like digits): notes never sit that close
      const from = b === 0 && opts.clef !== false ? s.left + s.gap * 3 : x0 + 1
      const inBar = mineN.filter(n => n.x > from && n.x < x1 - 1)
      if (!inBar.length && (b === 0 || x1 - x0 < s.gap * 3)) continue
      const steps: ReadStep[] = []
      const tol = s.gap * 0.55
      for (const n of inBar) {
        let st = steps.find(q => Math.abs(q.x - n.x) <= tol)
        if (!st) { st = { x: n.x, notes: [], dur: 1 }; steps.push(st) }
        // one note per string per column: keep the surer reading
        const same = st.notes.findIndex(m => m.string === n.string)
        const note: ReadNote = { string: n.string, fret: n.fret, x: n.x, sure: n.sure, ...(n.dead ? { dead: true } : {}) }
        if (same >= 0) { if (st.notes[same].sure < n.sure) st.notes[same] = note } else st.notes.push(note)
      }
      steps.sort((a, b) => a.x - b.x)
      raws.push({ si, x0, x1, steps, first: firstBar })
      firstBar = false
    }
  })
  // the room after a bar's last note is shorter than a full slot (the bar line comes early): learn by how much from bars
  // whose notes are evenly spaced
  const ks: number[] = []
  for (const r of raws) {
    if (r.steps.length < 3) continue
    const g = r.steps.slice(1).map((st, k) => st.x - r.steps[k].x)
    const m = g.reduce((a, b) => a + b, 0) / g.length
    if (g.some(x => Math.abs(x - m) > m * 0.12)) continue
    const tail = r.x1 - r.steps[r.steps.length - 1].x
    // a longer last note (a half after quarters) leaves more room: only bars whose bar line comes at or before a full slot
    if (tail > 2 && tail <= m * 1.05) ks.push(m / tail)
  }
  const kTail = ks.length ? ks.sort((a, b) => a - b)[Math.floor(ks.length / 2)] : 1.12
  const gapsOf = (r: Raw) => r.steps.map((st, k) => (k + 1 < r.steps.length ? r.steps[k + 1].x - st.x : (r.x1 - st.x) * kTail))
  // a short first bar is a pickup; the time signature: the beats per bar that fit the page's bars best, 4/4 or 3/4 (2/4 spaces exactly like 4/4 in eighths: only a printed time signature could tell them apart)
  const full = raws.filter(r => !r.first && r.steps.length)
  let meter = opts.beats ?? 4
  if (!opts.beats && full.length) {
    let best = Infinity
    for (const m of [4, 3]) {
      const c = full.reduce((a, r) => a + fitRhythmCost(gapsOf(r), m).cost, 0) / full.length + (m === 4 ? 0 : 0.03)
      if (c < best) { best = c; meter = m }
    }
  }
  for (const r of raws) {
    const s = systems[r.si]
    let beats = opts.meterAt?.(r.si, (r.x0 + r.x1) / 2) ?? meter
    const span = r.steps.length ? r.x1 - Math.max(r.x0, r.steps[0].x - lead) : r.x1 - r.x0
    if (r.first && span < median * 0.85) beats = Math.max(1, Math.min(meter - 1, Math.round(meter * span / median)))
    const given = r.steps.length ? opts.durations?.(r.si, r.steps.map(st => st.x), r.x0, r.x1) : null
    if (given && given.durs.length === r.steps.length) {
      given.durs.forEach((d, k) => { r.steps[k].dur = d })
      // a first bar read from printed rhythm is as long as its notes and rests (a pickup, or a full bar)
      if (r.first) { const sum = given.durs.reduce((a, b) => a + b, 0) + (given.rests ?? []).reduce((a, b) => a + b.dur, 0); beats = Math.min(opts.meterAt?.(r.si, (r.x0 + r.x1) / 2) ?? meter, Math.round(sum * 48) / 48) }
      // rests read from the page become silent steps in their place
      for (const rs of given.rests ?? []) if (rs.dur > 0) r.steps.push({ x: rs.x, notes: [], dur: rs.dur })
      r.steps.sort((a, b) => a.x - b.x)
    } else if (r.steps.length) fitRhythm(gapsOf(r), beats).forEach((d, k) => { r.steps[k].dur = d })
    for (const st of r.steps) for (const n of st.notes) { count++; if (n.sure < 0.06) unsure++ }
    s.bars.push({ steps: r.steps, beats, x0: r.x0, x1: r.x1 })
  }
  return { systems, unsure, notes: count, meter }
}

/** The reading as an ASCII tab (for checking it and for the existing text-tab path): high e on top. */
export function readingToText(r: TabReading, names = ['E', 'A', 'D', 'G', 'B', 'e']): string {
  const out: string[] = []
  for (const s of r.systems) {
    const rows = names.map(n => n.padEnd(2) + '|')
    for (const bar of s.bars) {
      for (const st of bar.steps) {
        const cell = Math.max(2, ...st.notes.map(n => String(n.fret).length)) + Math.max(0, Math.round(st.dur * 4) - 1)
        for (let k = 0; k < names.length; k++) {
          const n = st.notes.find(m => m.string === k)
          const t = n ? (n.dead ? 'x' : String(n.fret)) : ''
          rows[k] += '-' + t + '-'.repeat(Math.max(0, cell - t.length))
        }
      }
      for (let k = 0; k < names.length; k++) rows[k] += '-|'
    }
    out.push(rows.reverse().join('\n'))
  }
  return out.join('\n\n')
}

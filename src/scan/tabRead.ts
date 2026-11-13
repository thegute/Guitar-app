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

export interface ReadNote { string: number; fret: number; x: number; sure: number }
export interface ReadStep { x: number; notes: ReadNote[]; dur: number }
export interface ReadBar { steps: ReadStep[]; beats: number; x0: number; x1: number }
export interface ReadSystem { lines: number[]; gap: number; left: number; right: number; bars: ReadBar[] }
export interface TabReading { systems: ReadSystem[]; unsure: number; notes: number }

interface Comp { x0: number; x1: number; y0: number; y1: number; n: number }

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
function centre(v: Float32Array): Float32Array {
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
function normDigit(ink: Float32Array, w: number, h: number): Float32Array {
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

/** Best digit for a normalised glyph: per digit the best match over all templates; `sure` = margin over the runner-up. */
function classify(v: Float32Array, extra?: Map<number, Float32Array[]>): { d: number; score: number; sure: number } {
  const c = centre(v)
  const best = new Float32Array(10).fill(-1)
  for (const t of templates()) { const s = dot(c, t.v); if (s > best[t.d]) best[t.d] = s }
  if (extra) for (const [d, vs] of extra) for (const t of vs) { const s = dot(c, t) * 1.04; if (s > best[d]) best[d] = s }
  let d = 0
  for (let k = 1; k < 10; k++) if (best[k] > best[d]) d = k
  let second = -1
  for (let k = 0; k < 10; k++) if (k !== d && best[k] > second) second = best[k]
  return { d, score: best[d], sure: best[d] - second }
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

function components(ink: Uint8Array, w: number, h: number): Comp[] {
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
export function fitRhythm(gaps: number[], beats: number): number[] {
  const n = gaps.length
  if (!n) return []
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
  if (end) return end.prev.map(k => DURS[k])
  // can't add up exactly (odd spacing): plain proportions, rounded to 16ths
  return want.map(x => Math.max(0.25, Math.round(x * 4) / 4))
}

// ---------- the reader ----------
export function readTab(g: Gray, opts: { strings?: number; beats?: number } = {}): TabReading {
  const nStr = opts.strings ?? 6
  const th = Math.min(0.62, Math.max(0.35, otsu(g)))
  const strips = findStrips(g, [nStr])
  const systems: ReadSystem[] = []
  type Cand = { sys: number; string: number; x: number; v: Float32Array; parts: number; h: number; cls?: ReturnType<typeof classify> }
  const cands: Cand[] = []
  const sysBars: number[][] = []
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
    for (const c of components(ink, w, h)) {
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
    // which line each mark sits on
    const onLine = comps.map(c => {
      const cy = top + (c.y0 + c.y1) / 2
      let best = -1, bd = Infinity
      lines.forEach((ly, i) => { const d = Math.abs(cy - ly); if (d < bd) { bd = d; best = i } })
      return bd <= gap * 0.42 ? best : -1
    })
    // marks on the same line side by side make one number (12, 10 …)
    const used = new Set<number>()
    const order = comps.map((_, i) => i).sort((a, b) => comps[a].x0 - comps[b].x0)
    const si = systems.length
    for (const i of order) {
      if (used.has(i) || onLine[i] < 0) continue
      const group = [i]
      used.add(i)
      for (const j of order) {
        if (used.has(j) || onLine[j] !== onLine[i]) continue
        const last = comps[group[group.length - 1]]
        const hh = last.y1 - last.y0 + 1
        if (comps[j].x0 > last.x1 && comps[j].x0 - last.x1 <= Math.max(2, hh * 0.32) && Math.abs((comps[j].y1 - comps[j].y0) - (last.y1 - last.y0)) <= hh * 0.3) { group.push(j); used.add(j) }
      }
      if (group.length > 2) continue // three digits on a string isn't a fret number
      for (const k of group) {
        const c = comps[k], cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1
        const cut = new Float32Array(cw * ch)
        for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) cut[y * cw + x] = ink[(c.y0 + y) * w + c.x0 + x]
        cands.push({ sys: si, string: onLine[i], x: left + (c.x0 + c.x1) / 2, v: normDigit(cut, cw, ch), parts: group.length > 1 ? (k === group[0] ? 1 : 2) : 0, h: ch })
      }
    }
    systems.push({ lines, gap, left, right, bars: [] })
    sysBars.push(bars)
  }
  // pass 1 with the book fonts, pass 2 with the page's own digits (the sure ones teach the rest)
  for (const c of cands) c.cls = classify(c.v)
  const mine = new Map<number, Float32Array[]>()
  for (const c of cands) if (c.cls!.score > 0.72 && c.cls!.sure > 0.08) {
    const l = mine.get(c.cls!.d) ?? []
    if (l.length < 24) l.push(centre(c.v))
    mine.set(c.cls!.d, l)
  }
  if (mine.size >= 3) for (const c of cands) c.cls = classify(c.v, mine)
  // join the parts of two-digit numbers, drop marks that aren't digits (letters, ties, dots)
  type Num = { sys: number; string: number; x: number; fret: number; sure: number }
  const nums: Num[] = []
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i]
    if (c.cls!.score < 0.5) continue
    if (c.parts === 1 && cands[i + 1]?.parts === 2) {
      const d = cands[i + 1]
      if (d.cls!.score < 0.5) continue
      const fret = c.cls!.d * 10 + d.cls!.d
      if (fret <= 24) nums.push({ sys: c.sys, string: c.string, x: (c.x + d.x) / 2, fret, sure: Math.min(c.cls!.sure, d.cls!.sure, c.cls!.score - 0.5, d.cls!.score - 0.5) })
      i++
      continue
    }
    if (c.parts === 2) continue
    nums.push({ sys: c.sys, string: c.string, x: c.x, fret: c.cls!.d, sure: Math.min(c.cls!.sure, c.cls!.score - 0.5) })
  }
  // columns and bars
  let unsure = 0, count = 0
  let median = 0
  const widths: number[] = []
  systems.forEach((s, si) => {
    const edges = [s.left, ...sysBars[si], s.right].filter((x, i, a) => i === 0 || x - a[i - 1] > s.gap * 1.5)
    for (let b = 0; b + 1 < edges.length; b++) widths.push(edges[b + 1] - edges[b])
  })
  median = widths.length ? widths.slice().sort((a, b) => a - b)[Math.floor(widths.length / 2)] : 1
  let firstBar = true
  // how far after a bar line its first note usually sits (to measure a first bar without its clef area)
  const leads: number[] = []
  systems.forEach((s, si) => {
    const edges = [s.left, ...sysBars[si], s.right]
    const xs = nums.filter(n => n.sys === si).map(n => n.x)
    for (let b = 1; b + 1 < edges.length; b++) { const f = xs.filter(x => x > edges[b] && x < edges[b + 1]); if (f.length) leads.push(Math.min(...f) - edges[b]) }
  })
  const lead = leads.length ? leads.sort((a, b) => a - b)[Math.floor(leads.length / 2)] : 0
  systems.forEach((s, si) => {
    const mineN = nums.filter(n => n.sys === si).sort((a, b) => a.x - b.x)
    const edges = [s.left, ...sysBars[si], s.right].filter((x, i, a) => i === 0 || x - a[i - 1] > s.gap * 1.5)
    for (let b = 0; b + 1 < edges.length; b++) {
      const x0 = edges[b], x1 = edges[b + 1]
      // the first bar of each staff starts with the TAB clef (its letters can look like digits): notes never sit that close
      const from = b === 0 ? s.left + s.gap * 3 : x0 + 1
      const inBar = mineN.filter(n => n.x > from && n.x < x1 - 1)
      if (!inBar.length && (b === 0 || x1 - x0 < s.gap * 3)) continue // the clef area before the first bar line
      const steps: ReadStep[] = []
      const tol = s.gap * 0.55
      for (const n of inBar) {
        let st = steps.find(q => Math.abs(q.x - n.x) <= tol)
        if (!st) { st = { x: n.x, notes: [], dur: 1 }; steps.push(st) }
        // one note per string per column: keep the surer reading
        const same = st.notes.findIndex(m => m.string === n.string)
        const note = { string: n.string, fret: n.fret, x: n.x, sure: n.sure }
        if (same >= 0) { if (st.notes[same].sure < n.sure) st.notes[same] = note } else st.notes.push(note)
      }
      steps.sort((a, b) => a.x - b.x)
      let beats = opts.beats ?? 4
      // a short first bar is a pickup: as many beats as its share of a full bar
      const span = steps.length ? x1 - Math.max(x0, steps[0].x - lead) : x1 - x0
      if (firstBar && span < median * 0.85) beats = Math.max(1, Math.min(beats - 1, Math.round(beats * span / median)))
      firstBar = false
      if (steps.length) {
        const start = x0 + s.gap * 0.6
        const gaps = steps.map((st, k) => (k + 1 < steps.length ? steps[k + 1].x : x1) - st.x)
        gaps[0] += Math.max(0, steps[0].x - start) * 0 // notes are placed from the bar's start; the lead-in isn't a length
        fitRhythm(gaps, beats).forEach((d, k) => { steps[k].dur = d })
      }
      for (const st of steps) for (const n of st.notes) { count++; if (n.sure < 0.06) unsure++ }
      s.bars.push({ steps, beats, x0, x1 })
    }
  })
  return { systems, unsure, notes: count }
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
          const t = n ? String(n.fret) : ''
          rows[k] += '-' + t + '-'.repeat(Math.max(0, cell - t.length))
        }
      }
      for (let k = 0; k < names.length; k++) rows[k] += '-|'
    }
    out.push(rows.reverse().join('\n'))
  }
  return out.join('\n\n')
}

// Reading a tab PDF made by tab software (Guitar Pro, Songsterr, Sheet Happens books …) from its drawn shapes, not from a
// picture of the page. Such a PDF draws every fret number, staff line, bar line, rest and rhythm stem as an exact shape, so:
//   - the staff lines and bar lines are exact (no guessing where a line is);
//   - every number is its own shape, never touching a slide line or a tie (those are separate shapes), and identical
//     numbers are identical shapes, so each different shape is read once, large and sharp, and all its copies agree;
//   - the string is the line the number is centred on;
//   - printed time signatures (4/4 → 3/4 mid-song) set each bar's length;
//   - the rhythm stems and beams under the staff give each column's length (rhythm.ts), the spacing only when there are none.
// Pure functions on PdfShape lists (tabs/pdfTab.ts readPdf collects them), so they run the same in the app and in tests.
import type { PdfGlyph, PdfShape, PdfText, PdfMark } from '../tabs/pdfTab'
import { tuningFromText, type TuningFound } from './tuningText'
import { assemble, classify, components, normDigit, DEAD, type Num, type ReadSystem, type TabReading } from './tabRead'
import { rhythmFromStems } from './stemRhythm'
import { rhythmFromNotation } from './notationRhythm'

/** a text item's middle height (its y is the baseline, y up) */
const t2y = (t: PdfText) => t.y + t.h * 0.35
const K = 4 // page units → reading units (so 1 unit ≈ a pixel at 288 dpi; the shared layout code thinks in pixels)

interface Seg { a: number; b: number; at: number }

/** Fill a shape's outline into a small grey grid (1 = ink): even-odd or non-zero, sampled 4× per pixel row. */
export function rasterShape(sh: Pick<PdfShape, 'polys' | 'x0' | 'y0' | 'x1' | 'y1' | 'evenOdd'>, px: number): { ink: Float32Array; w: number; h: number } {
  const sw = sh.x1 - sh.x0, shh = sh.y1 - sh.y0
  const s = px / Math.max(shh, sw * 0.6, 1e-6)
  const w = Math.max(1, Math.ceil(sw * s) + 2), h = Math.max(1, Math.ceil(shh * s) + 2)
  const ink = new Float32Array(w * h)
  const edges: [number, number, number, number, number][] = [] // x0 y0 x1 y1 dir
  for (const pl of sh.polys) {
    const n = pl.length / 2
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const x0 = (pl[2 * i] - sh.x0) * s + 1, y0 = (pl[2 * i + 1] - sh.y0) * s + 1, x1 = (pl[2 * j] - sh.x0) * s + 1, y1 = (pl[2 * j + 1] - sh.y0) * s + 1
      if (y0 !== y1) edges.push(y0 < y1 ? [x0, y0, x1, y1, 1] : [x1, y1, x0, y0, -1])
    }
  }
  const SUB = 4
  for (let y = 0; y < h; y++) for (let sub = 0; sub < SUB; sub++) {
    const yy = y + (sub + 0.5) / SUB
    const xs: [number, number][] = []
    for (const e of edges) if (yy >= e[1] && yy < e[3]) xs.push([e[0] + (yy - e[1]) / (e[3] - e[1]) * (e[2] - e[0]), e[4]])
    xs.sort((a, b) => a[0] - b[0])
    let wind = 0
    for (let k = 0; k + 1 < xs.length; k++) {
      wind = sh.evenOdd ? wind ^ 1 : wind + xs[k][1]
      if (!wind) continue
      const a = Math.max(0, xs[k][0]), b = Math.min(w, xs[k + 1][0])
      for (let x = Math.floor(a); x < Math.ceil(b); x++) {
        const cover = Math.min(x + 1, b) - Math.max(x, a)
        if (cover > 0) ink[y * w + x] += cover / SUB
      }
    }
  }
  for (let i = 0; i < ink.length; i++) ink[i] = Math.min(1, ink[i])
  return { ink, w, h }
}

/** The digits in a shape, left to right (one shape can hold "10", or be a single "7"), each with how well it matched and
 *  where its middle is, measured from the shape's left edge (identical shapes share one reading). */
export function readGlyph(sh: PdfShape, set: 'tab' | 'sig' = 'tab'): { d: number; score: number; sure: number; all: Float32Array; x: number }[] {
  const { ink, w, h } = rasterShape(sh, 40)
  const bin = new Uint8Array(w * h)
  for (let i = 0; i < ink.length; i++) bin[i] = ink[i] > 0.5 ? 1 : 0
  const parts = components(bin, w, h).filter(c => c.n >= 8).sort((a, b) => a.x0 - b.x0)
  // pieces of one digit stacked or overlapping in x (the dot of nothing, broken outlines) join up: digits sit side by side
  const groups: typeof parts[] = []
  for (const c of parts) {
    const g = groups[groups.length - 1]
    if (g && c.x0 <= Math.max(...g.map(q => q.x1)) - 1) g.push(c)
    else groups.push([c])
  }
  const s = (sh.x1 - sh.x0) / Math.max(1, w - 2)
  return groups.map(g => {
    const x0 = Math.min(...g.map(c => c.x0)), x1 = Math.max(...g.map(c => c.x1)), y0 = Math.min(...g.map(c => c.y0)), y1 = Math.max(...g.map(c => c.y1))
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1
    const cut = new Float32Array(cw * ch)
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) cut[y * cw + x] = bin[(y0 + y) * w + x0 + x]
    return { ...classify(normDigit(cut, cw, ch), undefined, undefined, set), x: ((x0 + x1) / 2 - 1) * s } // x from the shape's left edge
  })
}

/** Is this shape a rest, and which (0 whole, 1 half, 2 quarter, 3 eighth, 4 sixteenth, 5 32nd)? Whole and half rests are
 *  plain boxes, the rest are matched to engraved rest shapes. */
const restCache = new Map<string, number | null>()
function restKind(sh: PdfShape): number | null {
  if (restCache.has(sh.sig)) return restCache.get(sh.sig)!
  const w = sh.x1 - sh.x0, h = sh.y1 - sh.y0
  let k: number | null = null
  const box = sh.polys.length === 1 && sh.polys[0].length <= 10
  if (box && w > h * 1.4) k = 1 // a box: a half (or whole) rest; the bar's room decides which
  else if (!box) {
    const { ink, w: rw, h: rh } = rasterShape(sh, 40)
    const c = classify(normDigit(ink, rw, rh), undefined, undefined, 'rest')
    if (c.score > 0.72 && c.d >= 2) k = c.d
  }
  restCache.set(sh.sig, k)
  return k
}

/** Staves of `nStr` evenly spaced horizontal lines (strokes, or thin filled boxes), with their extent. */
export function findStaves(shapes: PdfShape[], nStr: number) {
  const hs: Seg[] = []
  for (const sh of shapes) {
    const w = sh.x1 - sh.x0, h = sh.y1 - sh.y0
    if (sh.kind === 'fill' && h < 1.2 && h > 0.05 && w > 12) { hs.push({ a: sh.x0, b: sh.x1, at: (sh.y0 + sh.y1) / 2 }); continue }
    if (sh.kind !== 'stroke') continue
    for (const pl of sh.polys) for (let i = 0; i + 3 < pl.length; i += 2) {
      const dx = pl[i + 2] - pl[i], dy = pl[i + 3] - pl[i + 1]
      if (Math.abs(dy) < 0.15 && Math.abs(dx) > 3) hs.push({ a: Math.min(pl[i], pl[i + 2]), b: Math.max(pl[i], pl[i + 2]), at: (pl[i + 1] + pl[i + 3]) / 2 })
    }
  }
  // rows: segments at the same height, long in total
  const rows: { y: number; a: number; b: number; len: number }[] = []
  for (const sg of hs.sort((p, q) => p.at - q.at)) {
    const r = rows[rows.length - 1]
    if (r && Math.abs(r.y - sg.at) < 0.3) { r.a = Math.min(r.a, sg.a); r.b = Math.max(r.b, sg.b); r.len += sg.b - sg.a }
    else rows.push({ y: sg.at, a: sg.a, b: sg.b, len: sg.b - sg.a })
  }
  const long = rows.filter(r => r.len > 60)
  const staves: { lines: number[]; gap: number; left: number; right: number }[] = []
  for (let i = 0; i + nStr - 1 < long.length; i++) {
    const run = long.slice(i, i + nStr)
    const d = run.slice(1).map((r, k) => r.y - run[k].y)
    const g = d.reduce((x, y) => x + y, 0) / d.length
    if (g < 2.5 || g > 16 || d.some(x => Math.abs(x - g) > g * 0.06)) continue
    // the rows overlap across (one staff, not lines from two columns of a page)
    const left = Math.max(...run.map(r => r.a)), right = Math.min(...run.map(r => r.b))
    if (right - left < 60) continue
    // a line just outside at the same spacing means this is part of a bigger staff
    const before = long[i - 1], after = long[i + nStr]
    if ((before && Math.abs(run[0].y - before.y - g) < g * 0.06) || (after && Math.abs(after.y - run[nStr - 1].y - g) < g * 0.06)) continue
    staves.push({ lines: run.map(r => r.y), gap: g, left: Math.min(...run.map(r => r.a)), right: Math.max(...run.map(r => r.b)) })
    i += nStr - 1
  }
  return staves
}

/** Bar lines: vertical strokes (or thin filled boxes) spanning a staff. */
function findBars(shapes: PdfShape[], st: { lines: number[]; gap: number; left: number; right: number }) {
  const top = st.lines[0], bot = st.lines[st.lines.length - 1]
  const xs: number[] = []
  const add = (x: number, y0: number, y1: number) => {
    if (x < st.left - 1 || x > st.right + 1) return
    if (y0 <= top + st.gap * 0.2 && y1 >= bot - st.gap * 0.2 && y1 - y0 < (bot - top) * 3) xs.push(x)
  }
  for (const sh of shapes) {
    const w = sh.x1 - sh.x0
    if (sh.kind === 'fill' && w < 1.6 && sh.y1 - sh.y0 > st.gap * 3) { add((sh.x0 + sh.x1) / 2, sh.y0, sh.y1); continue }
    if (sh.kind !== 'stroke') continue
    for (const pl of sh.polys) for (let i = 0; i + 3 < pl.length; i += 2) {
      if (Math.abs(pl[i + 2] - pl[i]) < 0.15) add((pl[i] + pl[i + 2]) / 2, Math.min(pl[i + 1], pl[i + 3]), Math.max(pl[i + 1], pl[i + 3]))
    }
  }
  xs.sort((a, b) => a - b)
  const out: number[] = []
  for (const x of xs) if (!out.length || x - out[out.length - 1] > st.gap * 0.8) out.push(x); else out[out.length - 1] = x
  return out
}

export interface VectorReading extends TabReading {
  /** time signatures printed in the staves, in order: from this staff and x on, `beats` quarter notes a bar */
  meters: { sys: number; x: number; beats: number; sig: [number, number] }[]
  /** how many columns got their length from the printed rhythm (stems / beams), not the spacing */
  rhythmRead: number
  /** the tuning / capo / tempo the page prints (string names left of the staff, "E♭ A♭ D♭ …", "Drop D", "Capo 3", "♩ = 130") */
  tuning?: TuningFound
}

/** Read the tab on one page's shapes. Null when the page has no tab staff with numbers. */
export function readVectorTab(all: PdfShape[], opts: { strings?: number; texts?: PdfText[]; height?: number; glyphs?: PdfGlyph[]; /** small pictures (♭ / ♯ signs drawn as images) */ pdfMarks?: PdfMark[]; /** the time signature in force from the page before */ startMeter?: { beats: number; sig: [number, number] } } = {}): VectorReading | null {
  const nStr = opts.strings ?? 6
  // paper-coloured boxes aren't ink; a shape drawn twice in the same place (some PDFs do) counts once
  const seenAt = new Set<string>()
  const shapes = all.filter(s => {
    if (s.blank) return false
    const k = `${s.kind}${s.sig}@${Math.round(s.x0 * 10)},${Math.round(s.y0 * 10)}`
    if (seenAt.has(k)) return false
    seenAt.add(k)
    return true
  })
  let staves = findStaves(shapes, nStr)
  if (!staves.length) return null
  const fills = shapes.filter(s => s.kind === 'fill')
  // which glyph shapes sit on which staff
  type G = { sh: PdfShape; si: number; line: number; h: number }
  const onLines: G[] = []
  const sigs: { si: number; sh: PdfShape }[] = []
  staves.forEach((st, si) => {
    const top = st.lines[0], bot = st.lines[nStr - 1]
    for (const sh of fills) {
      const w = sh.x1 - sh.x0, h = sh.y1 - sh.y0, cy = (sh.y0 + sh.y1) / 2
      if (sh.x1 < st.left || sh.x0 > st.right || cy < top - st.gap || cy > bot + st.gap) continue
      if (w > st.gap * 3 || h < st.gap * 0.35) continue
      // a time signature digit: about two string spaces tall, inside the staff
      if (h > st.gap * 1.3 && h < st.gap * 2.6 && w < st.gap * 2.2 && cy > top && cy < bot) { sigs.push({ si, sh }); continue }
      if (h > st.gap * 1.25) continue
      let line = -1, bd = Infinity
      st.lines.forEach((ly, k) => { const d = Math.abs(cy - ly); if (d < bd) { bd = d; line = k } })
      if (bd > st.gap * 0.3) continue
      onLines.push({ sh, si, line: nStr - 1 - line, h }) // lines[0] is the top line = the highest string
    }
  })
  // the page's number height: the commonest height; brackets "(12)", rests and letters are taller or shorter
  const hist = new Map<number, number>()
  for (const g of onLines) { const k = Math.round(g.h * 10); hist.set(k, (hist.get(k) ?? 0) + 1) }
  let Hd = 0, hb = 0
  for (const [k, n] of hist) if (n > hb) { hb = n; Hd = k / 10 }
  // numbers in brackets "(11)" are taller: a ghost note, or the end of a tie (sorted out below)
  const digits = onLines.filter(g => !Hd || (g.h >= Hd * 0.8 && g.h <= Hd * 1.6))
  // read each different shape once; copies of a shape share its reading
  const cache = new Map<string, ReturnType<typeof readGlyph>>()
  const nums: Num[] = []
  type Part = { si: number; string: number; x: number; x0: number; x1: number; d: number; score: number; sure: number; paren?: boolean }
  const parts: Part[] = []
  const seen = new Set<string>()
  for (const g of digits) {
    // some PDFs draw a number twice in the same place (fill, then again for a halo): read it once
    const at = `${g.sh.sig}@${Math.round(g.sh.x0 * 10)},${Math.round(g.sh.y0 * 10)}`
    if (seen.has(at)) continue
    seen.add(at)
    let r = cache.get(g.sh.sig)
    if (!r) { r = readGlyph(g.sh); cache.set(g.sh.sig, r) }
    // a natural harmonic "<7>" / "<12>": the angle brackets are the poor matches at both ends
    const tall = !!Hd && g.h > Hd * 1.12
    const ends = r.length >= 3 ? Math.max(r[0].score, r[r.length - 1].score) : 1, mid = r.length >= 3 ? Math.min(...r.slice(1, -1).map(q => q.score)) : 0
    if (r.length >= 3 && (tall ? ends < 0.8 && ends < mid - 0.15 : r[0].score < 0.6 && r[r.length - 1].score < 0.6 && mid >= 0.75)) r = r.slice(1, -1)
    else if (tall) continue // something taller than a number that isn't one in brackets
    const n = r.length
    r.forEach(p => { const x = g.sh.x0 + p.x; parts.push({ si: g.si, string: g.line, x, x0: n === 1 ? g.sh.x0 : x - Hd * 0.3, x1: n === 1 ? g.sh.x1 : x + Hd * 0.3, d: p.d, score: p.score, sure: p.sure, ...(tall ? { paren: true } : {}) }) })
    if (r.length > 2) parts.splice(parts.length - r.length, r.length) // three digits on one string isn't a fret
  }
  // digits side by side on one string make one number (1 + 0 = 10)
  parts.sort((a, b) => a.si - b.si || a.string - b.string || a.x - b.x)
  for (let i = 0; i < parts.length; i++) {
    const a = parts[i], b = parts[i + 1]
    if (a.score < 0.5) continue
    if (b && b.si === a.si && b.string === a.string && b.x0 - a.x1 < Hd * 0.45 && b.score >= 0.5 && a.d !== DEAD && b.d !== DEAD) {
      const fret = a.d * 10 + b.d
      if (fret <= 30) nums.push({ sys: a.si, string: a.string, x: (a.x + b.x) / 2 * K, fret, sure: Math.min(a.sure, b.sure, a.score - 0.5, b.score - 0.5), ...(a.paren ? { paren: true } : {}) })
      i++
      continue
    }
    nums.push({ sys: a.si, string: a.string, x: a.x * K, fret: a.d === DEAD ? 0 : a.d, sure: Math.min(a.sure, a.score - 0.5), ...(a.d === DEAD ? { dead: true } : {}), ...(a.paren ? { paren: true } : {}) })
  }
  // a number in brackets is the end of a tie when the note before it on that string is the same fret (it's held, not
  // picked: left out, its stem keeps the time); otherwise it's a ghost note, played softly. At the start of a staff the
  // note it's tied from is on the staff before: a bracket there is taken as a held note.
  {
    const byStr = new Map<string, Num[]>()
    for (const n of nums) { const k = `${n.sys}:${n.string}`; (byStr.get(k) ?? byStr.set(k, []).get(k)!).push(n) }
    const drop = new Set<Num>()
    for (const list of byStr.values()) {
      list.sort((a, b) => a.x - b.x)
      list.forEach((n, i) => {
        if (!n.paren) return
        const prev = list[i - 1]
        if (prev ? prev.fret === n.fret && !prev.dead : !nums.some(m => m.sys === n.sys && m.x < n.x - staves[n.sys].gap * K)) drop.add(n)
      })
    }
    if (drop.size) for (let i = nums.length - 1; i >= 0; i--) if (drop.has(nums[i])) nums.splice(i, 1)
    for (const n of nums) delete n.paren
  }
  // numbers printed as real text (InDesign / Finale books like the Tony Rice book): the value is known exactly, only the
  // string comes from where it sits. Character by character when the page gives them (a text run can hold "3 4" or "10")
  const digitGlyphs = (opts.glyphs ?? []).filter(g => (g.cp >= 0x30 && g.cp <= 0x39) || g.cp === 0x78 || g.cp === 0x58)
  if (digitGlyphs.length) {
    staves.forEach((st, si) => {
      const top = st.lines[0], bot = st.lines[nStr - 1]
      type D = { x: number; w: number; ch: string; line: number }
      const ds: D[] = []
      for (const g of digitGlyphs) {
        if (g.size > st.gap * 2.2 || g.x < st.left + st.gap * 0.3 || g.x > st.right) continue
        const cy = g.y - g.size * 0.35
        if (cy < top - st.gap * 0.5 || cy > bot + st.gap * 0.5) continue
        let line = -1, bd = Infinity
        st.lines.forEach((ly, k) => { const d = Math.abs(cy - ly); if (d < bd) { bd = d; line = k } })
        if (bd > st.gap * 0.42) continue
        ds.push({ x: g.x, w: g.w || g.size * 0.5, ch: String.fromCodePoint(g.cp), line })
      }
      ds.sort((a, b) => a.line - b.line || a.x - b.x)
      for (let i = 0; i < ds.length; i++) {
        let txt = ds[i].ch, x1 = ds[i].x + ds[i].w
        // digits touching on one line are one number ("10", "12")
        while (ds[i + 1] && ds[i + 1].line === ds[i].line && ds[i + 1].x - x1 < ds[i].w * 0.35 && /\d/.test(ds[i + 1].ch) && /^\d$/.test(txt) && Number(txt + ds[i + 1].ch) <= 24) { i++; txt += ds[i].ch; x1 = ds[i].x + ds[i].w }
        const dead = /x/i.test(txt)
        const fret = dead ? 0 : Number(txt)
        if (!dead && (!(fret >= 0) || fret > 30)) continue
        const start = ds.find(q => q.line === ds[i].line && q.x + q.w <= x1 + 0.01 && q.x >= x1 - txt.length * ds[i].w - 0.5)?.x ?? ds[i].x
        nums.push({ sys: si, string: nStr - 1 - ds[i].line, x: ((start + x1) / 2) * K, fret, sure: 1, ...(dead ? { dead: true } : {}) })
      }
    })
  } else if (opts.texts && opts.height) {
    const H = opts.height
    staves.forEach((st, si) => {
      const top = st.lines[0], bot = st.lines[nStr - 1]
      for (const t of opts.texts!) {
        const m = /^\(?(\d{1,2}|[xX])\)?$/.exec(t.str.trim())
        if (!m || t.h > st.gap * 2.2 || t.x < st.left + st.gap * 0.5 || t.x > st.right) continue
        // the digits' middle: a little above the baseline (about a third of the font size)
        const cy = H - t.y - t.h * 0.33
        if (cy < top - st.gap * 0.5 || cy > bot + st.gap * 0.5) continue
        let line = -1, bd = Infinity
        st.lines.forEach((ly, k) => { const d = Math.abs(cy - ly); if (d < bd) { bd = d; line = k } })
        if (bd > st.gap * 0.42) continue
        const dead = /x/i.test(m[1])
        const fret = dead ? 0 : Number(m[1])
        if (fret > 30) continue
        const x = (t.x + (t.w || t.h * 0.5 * t.str.trim().length) / 2) * K
        if (nums.some(n => n.sys === si && n.string === nStr - 1 - line && Math.abs(n.x - x) < st.gap * K * 0.4)) continue
        nums.push({ sys: si, string: nStr - 1 - line, x, fret, sure: 1, ...(dead ? { dead: true } : {}) })
      }
    })
  }
  if (!nums.length) return null
  // a "staff" with no numbers on it isn't a tab staff (five notation lines plus a ledger line can look like six): drop it
  const keep = staves.map((_, i) => nums.some(n => n.sys === i))
  if (keep.some(k => !k)) {
    const idx: number[] = []
    let j = 0
    keep.forEach((k, i) => { idx[i] = k ? j++ : -1 })
    staves = staves.filter((_, i) => keep[i])
    for (const n of nums) n.sys = idx[n.sys]
    for (let i = sigs.length - 1; i >= 0; i--) { if (idx[sigs[i].si] < 0) sigs.splice(i, 1); else sigs[i].si = idx[sigs[i].si] }
  }
  // printed time signatures: a top and a bottom digit at the same place
  const meters: VectorReading['meters'] = []
  const used = new Set<number>()
  sigs.forEach((a, i) => {
    if (used.has(i)) return
    const j = sigs.findIndex((b, k) => k !== i && !used.has(k) && b.si === a.si && Math.abs((b.sh.x0 + b.sh.x1) - (a.sh.x0 + a.sh.x1)) / 2 < staves[a.si].gap && b.sh.y0 > a.sh.y0 + staves[a.si].gap)
    if (j < 0) return
    used.add(i); used.add(j)
    // a time signature can only be so many things: the bottom is 2, 4, 8 or 16, the top 1–15. Pick the best of those.
    const topD = readGlyph(a.sh, 'sig'), botD = readGlyph(sigs[j].sh, 'sig')
    const pick = (g: ReturnType<typeof readGlyph>[number], allowed: number[]) => allowed.reduce((b, d) => (g.all[d] > g.all[b] ? d : b), allowed[0])
    const den = botD.length === 2 ? 16 : botD.length === 1 ? pick(botD[0], [2, 4, 8]) : 0
    const num = topD.length === 2 ? 10 + pick(topD[1], [0, 1, 2, 3, 4, 5]) : topD.length === 1 ? pick(topD[0], [1, 2, 3, 4, 5, 6, 7, 8, 9]) : 0
    if (!num || !den) return
    meters.push({ sys: a.si, x: (a.sh.x0 + a.sh.x1) / 2 * K, beats: num * 4 / den, sig: [num, den] })
  })
  // time signatures printed as text (Songsterr): two big numbers inside a staff, one above the other
  if (opts.texts && opts.height) {
    const H = opts.height
    const big = opts.texts.filter(t => /^\d{1,2}$/.test(t.str.trim()))
    staves.forEach((st, si) => {
      const top = st.lines[0], bot = st.lines[nStr - 1], mid = (top + bot) / 2
      const here = big.filter(t => t.h > st.gap * 1.5 && t.x > st.left - st.gap && t.x < st.right && H - t.y > top && H - t.y - t.h * 0.7 < bot)
      for (const a of here) {
        const ya = H - t2y(a)
        if (ya > mid) continue
        const b = here.find(t => t !== a && Math.abs(t.x - a.x) < st.gap && H - t2y(t) > mid)
        const num = Number(a.str), den = b ? Number(b.str) : 0
        if (b && num > 0 && num < 16 && [2, 4, 8, 16].includes(den)) meters.push({ sys: si, x: (a.x + a.w / 2) * K, beats: num * 4 / den, sig: [num, den] })
      }
    })
  }
  // time signatures in a notation staff above the tab (music-font digits U+E080–E089, one above the other)
  if (opts.glyphs?.length) {
    const ts = opts.glyphs.filter(g => g.cp >= 0xe080 && g.cp <= 0xe089)
    staves.forEach((st, si) => {
      const lo = si ? staves[si - 1].lines[nStr - 1] : 0
      const mine = ts.filter(g => g.y > lo && g.y < st.lines[0])
      for (const a of mine) {
        const b = mine.find(q => q !== a && Math.abs(q.x - a.x) < a.size * 0.3 && q.y > a.y + a.size * 0.15 && q.y < a.y + a.size * 0.7)
        if (!b) continue
        const num = a.cp - 0xe080, den = b.cp - 0xe080
        if (num > 0 && [2, 4, 8].includes(den) && !meters.some(m => m.sys === si && Math.abs(m.x - a.x * K) < st.gap * K * 2)) meters.push({ sys: si, x: a.x * K, beats: num * 4 / den, sig: [num, den] })
      }
    })
  }
  meters.sort((a, b) => a.sys - b.sys || a.x - b.x)
  // which system each staff is in (Guitar 1 / 2 / 3 stacked are one system): a time signature applies from its place
  // in its own staff, and to every staff of the systems after it
  const groupOf: number[] = []
  const meterAt = (sys: number, x: number) => {
    let m: number | undefined = opts.startMeter?.beats
    for (const t of meters) if ((groupOf[t.sys] ?? t.sys) < (groupOf[sys] ?? sys) || (t.sys === sys && t.x <= x)) m = t.beats
    return m
  }
  const systems: ReadSystem[] = staves.map(st => ({ lines: [...st.lines].reverse().map(y => y * K), gap: st.gap * K, left: st.left * K, right: st.right * K, bars: [] }))
  const barXs = staves.map(st => findBars(shapes, st))
  const sysBars = barXs.map(xs => xs.map(x => x * K))
  // staves stacked in one system (Guitar 1 / 2 / 3 over each other): each is its own part
  const vlines: { x: number; y0: number; y1: number }[] = []
  for (const sh of shapes) {
    if (sh.kind === 'fill' && sh.x1 - sh.x0 < 1.6 && sh.y1 - sh.y0 > 20) { vlines.push({ x: (sh.x0 + sh.x1) / 2, y0: sh.y0, y1: sh.y1 }); continue }
    if (sh.kind !== 'stroke') continue
    for (const pl of sh.polys) for (let k = 0; k + 3 < pl.length; k += 2) if (Math.abs(pl[k + 2] - pl[k]) < 0.15 && Math.abs(pl[k + 3] - pl[k + 1]) > 20) vlines.push({ x: pl[k], y0: Math.min(pl[k + 1], pl[k + 3]), y1: Math.max(pl[k + 1], pl[k + 3]) })
  }
  let part = 0
  staves.forEach((st, i) => {
    const p = staves[i - 1]
    // stacked staves are joined by the system's line down the left edge (or bar lines running through both)
    const same = !!p && Math.abs(p.left - st.left) < 1.5 && vlines.some(v => Math.abs(v.x - st.left) < 2 && v.y0 <= p.lines[0] + 0.5 && v.y1 >= st.lines[nStr - 1] - 0.5)
    part = same ? part + 1 : 0
    groupOf[i] = i === 0 ? 0 : groupOf[i - 1] + (same ? 0 : 1)
    systems[i].part = part
    // the part's name printed beside it ("Guitar 2"), when it's text
    const nm = opts.texts?.find(t => /^(guitar|gtr|bass|rhythm|lead|acoustic|electric)\b/i.test(t.str.trim()) && t.x < st.left + st.gap && Math.abs((opts.height ?? 0) - t.y - (st.lines[0] + st.lines[nStr - 1]) / 2) < st.gap * 4)
    if (nm) systems[i].partName = nm.str.trim()
  })
  let rhythmRead = 0
  // a staff's rhythm marks end where the next staff begins
  staves.forEach((st, i) => { (st as { limit?: number }).limit = staves[i + 1]?.lines[0] })
  const r = assemble(systems, sysBars, nums, {
    clef: false, // the TAB letters are never read as numbers here (shapes are sized, text is text)
    meterAt,
    // bars before the page's first time signature keep the one from the page before (4/4 when unknown)
    beats: opts.startMeter?.beats ?? (meters[0] && meters[0].sys === 0 && meters[0].x < (staves[0].left + staves[0].gap * 8) * K ? meters[0].beats : 4),
    durations: (si, xs, x0, x1) => {
      const d = rhythmFromStems(shapes, staves[si], xs.map(x => x / K), x0 / K, x1 / K, meterAt(si, (x0 + x1) / 2) ?? 4, sh => { const r = readGlyph(sh); return r.length === 1 && [3, 5, 6, 7, 9].includes(r[0].d) && r[0].score > 0.75 ? r[0].d : r.length === 2 && r[0].d === 1 && r[0].score > 0.75 && r[1].score > 0.75 ? 10 + r[1].d : null }, restKind)
      const n = d ?? (opts.glyphs?.length ? rhythmFromNotation(shapes, opts.glyphs, staves[si], si ? staves[si - 1].lines[nStr - 1] : 0, xs.map(x => x / K), x0 / K, x1 / K, meterAt(si, (x0 + x1) / 2) ?? 4) : null)
      if (!n) return null
      rhythmRead += n.durs.length
      return { durs: n.durs, rests: n.rests.map(r => ({ x: r.x * K, dur: r.dur })), ...((n as { grace?: boolean[] }).grace ? { grace: (n as { grace?: boolean[] }).grace } : {}) }
    },
  })
  const tuning = opts.texts && opts.height ? tuningFromText(opts.texts, opts.height, staves, nStr, opts.pdfMarks) : undefined
  // pick / strum directions: ⊓ (down) and V (up) printed over or under each note (SMuFL down-bow / up-bow), each given
  // to the nearest column of the staff below it
  if (opts.glyphs?.length) {
    const marks = opts.glyphs.filter(g => g.cp >= 0xe610 && g.cp <= 0xe613)
    r.systems.forEach((s, si) => {
      const st = staves[si], lo = si ? staves[si - 1].lines[nStr - 1] : 0
      const steps = s.bars.flatMap(b => b.steps).filter(q => q.notes.length)
      for (const m of marks) {
        if (m.y <= lo || m.y > st.lines[0] + st.gap * 0.5) continue
        const cx = (m.x + (m.w || m.size * 0.3) / 2) * K
        const near = steps.reduce<typeof steps[number] | null>((b, q) => (Math.abs(q.x - cx) < st.gap * K * 1.2 && (!b || Math.abs(q.x - cx) < Math.abs(b.x - cx)) ? q : b), null)
        if (near) near.stroke = m.cp === 0xe610 || m.cp === 0xe611 ? 'down' : 'up'
      }
    })
  }
  return { ...r, meters, rhythmRead, ...(tuning ? { tuning } : {}) }
}

// Tabs from PDF files. Three kinds of PDF turn up:
//  1. text tabs printed to PDF (e|---3---|): the text is in the file, laid out in columns → rebuilt line by line
//  2. Guitar Pro / Songsterr / MuseScore prints: the six staff lines and bar lines are drawn, the fret numbers are
//     text sitting on the lines → each number goes to the string whose line it sits on, in order across the page
//  3. scanned pages (just pictures): nothing to read as text → the pages are turned into pictures for the AI reader
// The layout work is pure (pdfItemsToText, staffTabs) so it can be tested without a PDF.

export interface PdfText { str: string; x: number; y: number; w: number; h: number }
/** a drawn line: horizontal (y1 = y2) or vertical (x1 = x2), in page units, y up */
export interface PdfLine { x1: number; y1: number; x2: number; y2: number }
/** `pictures`: how much of the page is covered by pictures (0–1): a scanned book, or tab printed as an image. */
export interface PdfPage { texts: PdfText[]; lines: PdfLine[]; width: number; height: number; pictures?: number; shapes?: PdfShape[]; glyphs?: PdfGlyph[]; marks?: PdfMark[] }
/** a small picture on the page (y down), e.g. a ♭ drawn as an image beside a tuning's note names; `sign` when it reads as one */
export interface PdfMark { x0: number; y0: number; x1: number; y1: number; sign?: 'flat' | 'sharp' }
/** One character placed on the page: music-font characters (SMuFL code points U+E000–U+F8FF: note heads, flags, rests,
 *  dots, tuplet numbers, time signatures …) and the digits, x and brackets tabs are written with; its origin (baseline) in
 *  page units (y DOWN) and font size. Notation software (Finale, Dorico,
 *  MuseScore, InDesign books) writes the notes this way. */
export interface PdfGlyph { cp: number; x: number; y: number; size: number; /** advance width (page units) */ w?: number }
/** A drawn shape (tab software draws its numbers, rests and stems as shapes, not text): its outline as polygons (curves
 *  flattened), in page units with y DOWN (like a picture), its box, and a key that is the same for identical shapes. */
export interface PdfShape { kind: 'fill' | 'stroke'; evenOdd?: boolean; polys: number[][]; x0: number; y0: number; x1: number; y1: number; sig: string; width?: number; /** paper-coloured (a white box behind a number that breaks the staff line): not ink */ blank?: true }

const median = (a: number[]) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }

/** Text of a page as it looks: items on the same row joined, spaced into columns (monospace tabs keep lining up). */
export function pdfItemsToText(texts: PdfText[]): string {
  const items = texts.filter(t => t.str.length)
  if (!items.length) return ''
  const cw = median(items.filter(t => t.str.trim().length && t.w > 0).map(t => t.w / t.str.length)) || 5
  const hh = median(items.map(t => t.h)) || 10
  // rows: by baseline, top of the page first
  const rows: PdfText[][] = []
  for (const t of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find(r => Math.abs(r[0].y - t.y) < hh * 0.4)
    if (row) row.push(t)
    else rows.push([t])
  }
  rows.sort((a, b) => b[0].y - a[0].y)
  const left = Math.min(...items.map(t => t.x))
  const out: string[] = []
  let lastY: number | null = null
  for (const r of rows) {
    r.sort((a, b) => a.x - b.x)
    // a blank line where there's a big gap (between systems)
    if (lastY !== null && lastY - r[0].y > hh * 2.2) out.push('')
    lastY = r[0].y
    let line = ''
    for (const t of r) {
      const col = Math.max(0, Math.round((t.x - left) / cw))
      if (col > line.length) line += ' '.repeat(col - line.length)
      else if (line.length && col < line.length && !line.endsWith(' ') && !/^[-|]/.test(t.str)) line += ' '
      line += t.str
    }
    out.push(line.replace(/\s+$/, ''))
  }
  return out.join('\n')
}

/** Staves on a page: groups of `n` long, evenly spaced horizontal lines. Returns each staff's line heights, top first. */
export function findStaves(lines: PdfLine[], width: number, n: number): { ys: number[]; x0: number; x1: number }[] {
  const hor = lines.filter(l => Math.abs(l.y1 - l.y2) < 0.5 && Math.abs(l.x2 - l.x1) > width * 0.25)
  // one entry per distinct height (a line drawn in pieces counts once), with its extent
  const rows: { y: number; x0: number; x1: number }[] = []
  for (const l of hor) {
    const y = (l.y1 + l.y2) / 2, a = Math.min(l.x1, l.x2), b = Math.max(l.x1, l.x2)
    const r = rows.find(r => Math.abs(r.y - y) < 0.6)
    if (r) { r.x0 = Math.min(r.x0, a); r.x1 = Math.max(r.x1, b) } else rows.push({ y, x0: a, x1: b })
  }
  rows.sort((a, b) => b.y - a.y)
  const staves: { ys: number[]; x0: number; x1: number }[] = []
  for (let i = 0; i + n <= rows.length; ) {
    const g = rows.slice(i, i + n)
    const gaps = g.slice(1).map((r, k) => g[k].y - r.y)
    const s = median(gaps)
    const even = s > 2 && gaps.every(d => Math.abs(d - s) < Math.max(0.6, s * 0.12))
    const lined = g.every(r => Math.abs(r.x0 - g[0].x0) < 6 && Math.abs(r.x1 - g[0].x1) < 6)
    if (even && lined) { staves.push({ ys: g.map(r => r.y), x0: g[0].x0, x1: g[0].x1 }); i += n } else i++
  }
  return staves
}

const NOTE = /^\(?(\d{1,2}|[xX])\)?$/

/** ASCII tab rebuilt from staves with numbers on their lines (Guitar Pro style prints). Empty when there are none. */
export function staffTabs(pages: PdfPage[], names: string[]): string {
  return staffScan(pages, names).text
}
/** The staves found and the tab written from them. `staves` with no notes = the numbers are drawn, not text (a
 *  Songsterr print draws its fret numbers as shapes): only a picture reader can read those. */
export function staffScan(pages: PdfPage[], names: string[]): { text: string; staves: number; notes: number; bars: number } {
  const n = names.length
  const systems: string[] = []
  let nStaves = 0, nNotes = 0, nBars = 0
  for (const p of pages) {
    const staves = findStaves(p.lines, p.width, n)
    nStaves += staves.length
    for (const st of staves) {
      const s = (st.ys[0] - st.ys[n - 1]) / (n - 1)
      // bar lines: vertical lines that span the staff
      const bars = p.lines.filter(l => Math.abs(l.x1 - l.x2) < 0.6 && Math.min(l.y1, l.y2) <= st.ys[n - 1] + 1 && Math.max(l.y1, l.y2) >= st.ys[0] - 1)
        .map(l => l.x1).filter(x => x > st.x0 + 4 && x < st.x1 - 2).sort((a, b) => a - b)
        .filter((x, i, a) => i === 0 || x - a[i - 1] > 3)
      nBars += bars.length + 1
      // fret numbers sitting on this staff's lines (their middle is about 0.35 of their height above the baseline)
      const notes: { x: number; str: number; t: string }[] = []
      for (const t of p.texts) {
        const v = t.str.trim()
        if (!NOTE.test(v)) continue
        // a time signature's big digits (4 over 4 at the start) are not fret numbers: fret numbers are about one line
        // gap tall, a time signature spans the staff
        if (t.h > s * 1.6) continue
        const cy = t.y + t.h * 0.35
        if (cy > st.ys[0] + s * 0.5 || cy < st.ys[n - 1] - s * 0.5 || t.x < st.x0 - 2 || t.x > st.x1 + 2) continue
        const str = Math.round((st.ys[0] - cy) / s)
        if (str < 0 || str >= n || Math.abs(st.ys[str] - cy) > s * 0.45) continue
        notes.push({ x: t.x + t.w / 2, str, t: v.replace(/[()]/g, '').toLowerCase() })
      }
      if (!notes.length) continue
      nNotes += notes.length
      // columns: notes struck together share an x
      const xs = [...notes].sort((a, b) => a.x - b.x)
      const cols: { x: number; notes: typeof notes }[] = []
      const tol = Math.max(2, s * 0.45)
      for (const nn of xs) {
        const c = cols[cols.length - 1]
        if (c && Math.abs(c.x - nn.x) < tol) c.notes.push(nn)
        else cols.push({ x: nn.x, notes: [nn] })
      }
      const events = [...cols.map(c => ({ x: c.x, col: c })), ...bars.map(x => ({ x, col: null }))].sort((a, b) => a.x - b.x)
      const rows = names.map(nm => `${nm}|`)
      // the space before each note follows the space on the page (the tab reader turns spacing into rhythm)
      const unit = Math.max(2, median(cols.slice(1).map((c, i) => c.x - cols[i].x).filter(d => d > tol)) / 2 || s)
      let prevX = st.x0
      for (const ev of events) {
        const gap = Math.max(1, Math.min(8, Math.round((ev.x - prevX) / unit)))
        prevX = ev.x
        if (!ev.col) { for (let k = 0; k < n; k++) rows[k] += '-'.repeat(Math.min(gap, 2)) + '|'; continue }
        const w = Math.max(...ev.col.notes.map(x => x.t.length))
        for (let k = 0; k < n; k++) {
          // rows are written high string first; string 0 here is the top line (the highest string)
          const hit = ev.col.notes.find(x => x.str === k)
          rows[k] += '-'.repeat(gap) + (hit ? hit.t.padEnd(w, '-') : '-'.repeat(w))
        }
      }
      systems.push(rows.map(r => (r.endsWith('|') ? r : r + '--|')).join('\n'))
    }
  }
  // a handful of numbers over many bars is not a tab (a stray time signature or bar number): nothing was read
  if (nNotes < Math.max(2, nBars * 0.5)) return { text: '', staves: nStaves, notes: nNotes, bars: nBars }
  return { text: systems.join('\n\n'), staves: nStaves, notes: nNotes, bars: nBars }
}

// ---------- reading the PDF (pdf.js, loaded only when a PDF is opened) ----------
type M = [number, number, number, number, number, number]
const mul = (a: M, b: M): M => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]]
const ap = (m: M, x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]

async function pdfjs() {
  const lib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // the worker is bundled by Vite as a plain .js file (the Android app's web server doesn't know .mjs)
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined' && !lib.GlobalWorkerOptions.workerPort) {
    lib.GlobalWorkerOptions.workerPort = new Worker(new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url), { type: 'module' })
  }
  return lib
}

type PdfImg = { width: number; height: number; kind?: number; data?: Uint8Array | Uint8ClampedArray; bitmap?: CanvasImageSource }
/** An image the page painted (pdf.js keeps it under its id once the drawing list is made). */
function objOf(page: { objs: { get: (id: string, cb?: (v: unknown) => void) => unknown }; commonObjs?: { get: (id: string, cb?: (v: unknown) => void) => unknown } }, id: string): Promise<PdfImg | null> {
  const store = id.startsWith('g_') && page.commonObjs ? page.commonObjs : page.objs
  return new Promise(res => {
    const t = setTimeout(() => res(null), 500)
    try { store.get(id, v => { clearTimeout(t); res((v as PdfImg) ?? null) }) } catch { clearTimeout(t); res(null) }
  })
}
/** ♭ or ♯ from a little picture of one: a flat's top right is empty (one stem on the left, a bowl at the bottom); a sharp
 *  has ink there (two stems, two bars). */
function signOf(img: PdfImg): 'flat' | 'sharp' | null {
  const { width: w, height: h } = img
  let ink: (x: number, y: number) => boolean
  if (img.data) {
    const d = img.data, n = d.length / (w * h)
    ink = (x, y) => { const i = (y * w + x) * n; return n >= 4 ? d[i + 3] > 128 && d[i] + d[i + 1] + d[i + 2] < 384 : n === 3 ? d[i] + d[i + 1] + d[i + 2] < 384 : d[i] < 128 }
    if (img.kind === 1) { const row = Math.ceil(w / 8); ink = (x, y) => !((d[y * row + (x >> 3)] >> (7 - (x & 7))) & 1) }
  } else if (img.bitmap && typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(w, h), x2 = c.getContext('2d')!
    x2.fillStyle = '#fff'; x2.fillRect(0, 0, w, h); x2.drawImage(img.bitmap, 0, 0)
    const d = x2.getImageData(0, 0, w, h).data
    ink = (x, y) => { const i = (y * w + x) * 4; return d[i] + d[i + 1] + d[i + 2] < 384 }
  } else return null
  let all = 0, tr = 0, bl = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ink(x, y)) { all++; if (y < h * 0.4 && x > w * 0.5) tr++; if (y > h * 0.6 && x < w * 0.4) bl++ }
  if (all < 8) return null
  return tr < all * 0.04 ? 'flat' : tr > all * 0.1 ? 'sharp' : null
}

/** Text and drawn lines of every page (up to 30 pages). */
/** Read pages `from`…`to` (a book: only the pages you picked; at most 30 at a time). */
export async function readPdf(bytes: Uint8Array, from = 1, to = from + 29): Promise<PdfPage[]> {
  const lib = await pdfjs()
  const doc = await lib.getDocument({ data: bytes.slice(), isEvalSupported: false, disableFontFace: true }).promise
  const out: PdfPage[] = []
  const OPS = lib.OPS
  const first = Math.max(1, Math.min(doc.numPages, Math.round(from)))
  for (let i = first; i <= Math.min(doc.numPages, Math.round(to), first + 29); i++) {
    const page = await doc.getPage(i)
    const view = page.view as number[]
    const tc = await page.getTextContent()
    const texts: PdfText[] = []
    for (const it of tc.items as { str?: string; transform?: number[]; width?: number; height?: number }[]) {
      if (!it.str || !it.transform) continue
      const h = it.height || Math.hypot(it.transform[2], it.transform[3]) || 10
      texts.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width ?? 0, h })
    }
    const lines: PdfLine[] = []
    const shapes: PdfShape[] = []
    const glyphs: PdfGlyph[] = []
    const marks: (PdfMark & { id?: string })[] = []
    let lineW = 1
    let pictures = 0
    try {
      const ol = await page.getOperatorList()
      let ctm: M = [1, 0, 0, 1, 0, 0]
      const stack: M[] = []
      const wStack: number[] = []
      const cStack: number[] = []
      let fillLum = 0
      let tm: M = [1, 0, 0, 1, 0, 0], lm: M = [1, 0, 0, 1, 0, 0], fSize = 1, lead = 0, cSp = 0, wSp = 0, hSc = 1, rise = 0
      // the clipping box in force (page units, y down): drawing outside it isn't on the page. Some books draw every staff
      // line of the page several times, each copy clipped to one system.
      let clipBox: [number, number, number, number] | null = null
      const clipStack: ([number, number, number, number] | null)[] = []
      // a fill colour (pdf.js gives 0–255 numbers, or "#rrggbb") → how light it is, 0 black … 1 white
      const lum = (a: unknown): number => {
        const v = a as Record<number, number> | string | string[]
        if (typeof v === 'string' || (Array.isArray(v) && typeof v[0] === 'string')) {
          const h = (typeof v === 'string' ? v : v[0]).replace('#', '')
          const n = parseInt(h, 16)
          return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255
        }
        const r = Number(v[0] ?? 0), g = Number(v[1] ?? 0), b = Number(v[2] ?? 0), k = r > 1 || g > 1 || b > 1 ? 255 : 1
        return (r * 0.299 + g * 0.587 + b * 0.114) / k
      }
      for (let k = 0; k < ol.fnArray.length; k++) {
        const fn = ol.fnArray[k], args = ol.argsArray[k] as unknown[]
        if (fn === OPS.save) { stack.push(ctm); wStack.push(lineW); cStack.push(fillLum); clipStack.push(clipBox) }
        else if (fn === OPS.restore) { ctm = stack.pop() ?? ctm; lineW = wStack.pop() ?? lineW; fillLum = cStack.pop() ?? fillLum; clipBox = clipStack.length ? clipStack.pop()! : clipBox }
        else if (fn === OPS.setFillRGBColor) fillLum = lum(args)
        else if (fn === OPS.setFillGray) fillLum = Number((args as number[])[0] ?? 0)
        else if (fn === OPS.setFillCMYKColor) { const [c, m, y, kk] = (args as number[]).map(Number); fillLum = (1 - Math.min(1, c + kk)) * 0.3 + (1 - Math.min(1, m + kk)) * 0.59 + (1 - Math.min(1, y + kk)) * 0.11 }
        else if (fn === OPS.transform) ctm = mul(ctm, args as M)
        else if (fn === OPS.paintFormXObjectBegin) { stack.push(ctm); wStack.push(lineW); clipStack.push(clipBox); { const fm = args[0] as ArrayLike<number> | null; if (fm && fm.length === 6) ctm = mul(ctm, Array.from(fm) as M) } }
        else if (fn === OPS.paintFormXObjectEnd) { ctm = stack.pop() ?? ctm; lineW = wStack.pop() ?? lineW; clipBox = clipStack.length ? clipStack.pop()! : clipBox }
        // text state, to place music-font characters (note heads, flags, rests …) exactly
        else if (fn === OPS.beginText) { tm = [1, 0, 0, 1, 0, 0]; lm = [1, 0, 0, 1, 0, 0] }
        else if (fn === OPS.setFont) fSize = Number((args as unknown[])[1]) || 1
        else if (fn === OPS.setTextMatrix) { tm = (args as number[]).slice(0, 6) as M; lm = tm }
        else if (fn === OPS.moveText) { lm = mul(lm, [1, 0, 0, 1, (args as number[])[0], (args as number[])[1]]); tm = lm }
        else if (fn === OPS.setLeadingMoveText) { lead = -(args as number[])[1]; lm = mul(lm, [1, 0, 0, 1, (args as number[])[0], (args as number[])[1]]); tm = lm }
        else if (fn === OPS.setLeading) lead = (args as number[])[0]
        else if (fn === OPS.nextLine) { lm = mul(lm, [1, 0, 0, 1, 0, -lead]); tm = lm }
        else if (fn === OPS.setCharSpacing) cSp = (args as number[])[0]
        else if (fn === OPS.setWordSpacing) wSp = (args as number[])[0]
        else if (fn === OPS.setHScale) hSc = (args as number[])[0] / 100
        else if (fn === OPS.setTextRise) rise = (args as number[])[0]
        else if (fn === OPS.showText && glyphs.length < 20000) {
          for (const gl of (args as unknown[])[0] as (number | { unicode?: string; width?: number; isSpace?: boolean })[]) {
            if (typeof gl === 'number') { tm = mul(tm, [1, 0, 0, 1, -gl / 1000 * fSize * hSc, 0]); continue }
            const cp = gl.unicode ? gl.unicode.codePointAt(0) ?? 0 : 0
            // music-font characters, and the digits / x / brackets a tab writes its frets with
            if ((cp >= 0xe000 && cp <= 0xf8ff) || (cp >= 0x30 && cp <= 0x39) || cp === 0x78 || cp === 0x58 || cp === 0x28 || cp === 0x29) {
              const m = mul(ctm, tm)
              const [gx, gy] = ap(m, 0, rise)
              const gyd = view[3] - gy
              // outside the clipping box it isn't on the page (a clipped copy of the music)
              if (!clipBox || (gx >= clipBox[0] - 0.5 && gx <= clipBox[2] + 0.5 && gyd >= clipBox[1] - 0.5 && gyd <= clipBox[3] + fSize))
                glyphs.push({ cp, x: gx, y: gyd, size: fSize * Math.hypot(m[2], m[3]), w: (gl.width ?? 0) / 1000 * fSize * hSc * Math.hypot(m[0], m[1]) })
            }
            const adv = ((gl.width ?? 0) / 1000 * fSize + cSp + (gl.isSpace ? wSp : 0)) * hSc
            tm = mul(tm, [1, 0, 0, 1, adv, 0])
          }
        }
        else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageMaskXObject) {
          // an image fills the unit square under the current transform: its area on the page
          pictures += Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]) / Math.max(1, (view[2] - view[0]) * (view[3] - view[1]))
          // a small one (a sign the size of a letter): keep where it is, to read later
          const [ax, ay] = ap(ctm, 0, 0), [bx, by] = ap(ctm, 1, 1)
          const mw = Math.abs(bx - ax), mh = Math.abs(by - ay)
          if (mw < 30 && mh < 30 && mw > 1 && mh > 1 && marks.length < 2000) marks.push({ x0: Math.min(ax, bx), x1: Math.max(ax, bx), y0: view[3] - Math.max(ay, by), y1: view[3] - Math.min(ay, by), ...(fn === OPS.paintImageXObject && typeof args[0] === 'string' ? { id: args[0] as string } : {}) })
        }
        else if (fn === OPS.setLineWidth) lineW = (args as number[])[0]
        else if (fn === OPS.constructPath) {
          const ops = args[0] as number[], co = args[1] as number[]
          // the shape itself (for the shape reader): what follows says whether it's filled or stroked
          const next = ol.fnArray[k + 1]
          if (next === OPS.clip || next === OPS.eoClip) {
            // a clipping path: its box (y down), cut down to the box already in force
            let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity
            const H0 = view[3]
            let q = 0
            const pt = (x: number, y: number) => { const [a, b] = ap(ctm, x, y); bx0 = Math.min(bx0, a); bx1 = Math.max(bx1, a); by0 = Math.min(by0, H0 - b); by1 = Math.max(by1, H0 - b) }
            for (const op of ops) {
              if (op === OPS.rectangle) { const [x, y, w, h] = co.slice(q, q + 4); pt(x, y); pt(x + w, y + h); q += 4 }
              else { const n = op === OPS.moveTo || op === OPS.lineTo ? 2 : op === OPS.curveTo ? 6 : op === OPS.curveTo2 || op === OPS.curveTo3 ? 4 : 0; for (let t = 0; t < n; t += 2) pt(co[q + t], co[q + t + 1]); q += n }
            }
            if (bx0 <= bx1) clipBox = clipBox ? [Math.max(clipBox[0], bx0), Math.max(clipBox[1], by0), Math.min(clipBox[2], bx1), Math.min(clipBox[3], by1)] : [bx0, by0, bx1, by1]
          }
          const fillKind = next === OPS.fill || next === OPS.eoFill || next === OPS.fillStroke || next === OPS.eoFillStroke || next === OPS.closeFillStroke || next === OPS.closeEOFillStroke
          const strokeKind = next === OPS.stroke || next === OPS.closeStroke
          if ((fillKind || strokeKind) && shapes.length < 20000) {
            const H = view[3]
            const P = (x: number, y: number) => { const [a, b] = ap(ctm, x, y); return [a, H - b] }
            const polys: number[][] = []
            let cur: number[] = [], px = 0, py = 0, sx = 0, sy = 0, q = 0
            const bez = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
              for (let t = 1; t <= 8; t++) {
                const u = t / 8, v = 1 - u
                const x = v * v * v * px + 3 * v * v * u * x1 + 3 * v * u * u * x2 + u * u * u * x3, y = v * v * v * py + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y3
                cur.push(...P(x, y))
              }
              px = x3; py = y3
            }
            for (const op of ops) {
              if (op === OPS.moveTo) { if (cur.length > 2) polys.push(cur); px = sx = co[q]; py = sy = co[q + 1]; cur = [...P(px, py)]; q += 2 }
              else if (op === OPS.lineTo) { px = co[q]; py = co[q + 1]; cur.push(...P(px, py)); q += 2 }
              else if (op === OPS.curveTo) { bez(co[q], co[q + 1], co[q + 2], co[q + 3], co[q + 4], co[q + 5]); q += 6 }
              else if (op === OPS.curveTo2) { bez(px, py, co[q], co[q + 1], co[q + 2], co[q + 3]); q += 4 }
              else if (op === OPS.curveTo3) { bez(co[q], co[q + 1], co[q + 2], co[q + 3], co[q + 2], co[q + 3]); q += 4 }
              else if (op === OPS.rectangle) {
                if (cur.length > 2) polys.push(cur)
                const [x, y, w, h] = co.slice(q, q + 4); q += 4
                polys.push([...P(x, y), ...P(x + w, y), ...P(x + w, y + h), ...P(x, y + h)]); cur = []
                px = sx = x; py = sy = y
              } else if (op === OPS.closePath) { if (cur.length > 2) { cur.push(cur[0], cur[1]); polys.push(cur) } cur = []; px = sx; py = sy }
            }
            if (cur.length > 2) polys.push(cur)
            // cut to the clipping box: a stroke's straight pieces are trimmed, a filled shape outside it is dropped
            if (clipBox && polys.length && !(globalThis as { __NOCLIP?: boolean }).__NOCLIP) {
              const [cx0, cy0, cx1, cy1] = clipBox
              if (strokeKind) {
                const cut: number[][] = []
                for (const pl of polys) for (let t = 0; t + 3 < pl.length; t += 2) {
                  let ax = pl[t], ay = pl[t + 1], bx = pl[t + 2], by = pl[t + 3]
                  // Liang–Barsky
                  let u0 = 0, u1 = 1
                  const dx = bx - ax, dy = by - ay
                  const ok = ([[-dx, ax - cx0], [dx, cx1 - ax], [-dy, ay - cy0], [dy, cy1 - ay]] as [number, number][]).every(([p2, q2]) => {
                    if (Math.abs(p2) < 1e-9) return q2 >= -0.01
                    const r = q2 / p2
                    if (p2 < 0) { if (r > u1) return false; if (r > u0) u0 = r } else { if (r < u0) return false; if (r < u1) u1 = r }
                    return true
                  })
                  if (!ok || u1 - u0 < 1e-6) continue
                  const nx0 = ax + dx * u0, ny0 = ay + dy * u0
                  bx = ax + dx * u1; by = ay + dy * u1; ax = nx0; ay = ny0
                  cut.push([ax, ay, bx, by])
                }
                polys.length = 0
                polys.push(...cut)
              } else {
                let fx0 = Infinity, fy0 = Infinity, fx1 = -Infinity, fy1 = -Infinity
                for (const pl of polys) for (let t = 0; t < pl.length; t += 2) { fx0 = Math.min(fx0, pl[t]); fx1 = Math.max(fx1, pl[t]); fy0 = Math.min(fy0, pl[t + 1]); fy1 = Math.max(fy1, pl[t + 1]) }
                if (fx1 < cx0 || fx0 > cx1 || fy1 < cy0 || fy0 > cy1) polys.length = 0
              }
            }
            if (polys.length) {
              let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
              for (const pl of polys) for (let t = 0; t < pl.length; t += 2) { x0 = Math.min(x0, pl[t]); x1 = Math.max(x1, pl[t]); y0 = Math.min(y0, pl[t + 1]); y1 = Math.max(y1, pl[t + 1]) }
              // identical shapes (every "7" in the book) get the same key: the outline relative to its own corner
              const sig = polys.map(pl => pl.map((v, t) => Math.round((v - (t % 2 ? y0 : x0)) * 20)).join(',')).join('|')
              shapes.push({ kind: fillKind ? 'fill' : 'stroke', ...(fillKind && !strokeKind && fillLum > 0.85 && next !== OPS.fillStroke ? { blank: true as const } : {}), ...(next === OPS.eoFill || next === OPS.eoFillStroke || next === OPS.closeEOFillStroke ? { evenOdd: true } : {}), polys, x0, y0, x1, y1, sig, ...(strokeKind ? { width: lineW * Math.hypot(ctm[0], ctm[1]) } : {}) })
            }
          }
          let j = 0, cx = 0, cy = 0
          for (const op of ops) {
            if (op === OPS.moveTo) { [cx, cy] = [co[j], co[j + 1]]; j += 2 }
            else if (op === OPS.lineTo) {
              const [x1, y1] = ap(ctm, cx, cy), [x2, y2] = ap(ctm, co[j], co[j + 1])
              lines.push({ x1, y1, x2, y2 }); [cx, cy] = [co[j], co[j + 1]]; j += 2
            } else if (op === OPS.rectangle) {
              const [x, y, w, h] = co.slice(j, j + 4); j += 4
              const [ax, ay] = ap(ctm, x, y), [bx, by] = ap(ctm, x + w, y + h)
              const dw = Math.abs(bx - ax), dh = Math.abs(by - ay)
              if (dh < 1.5 && dw > dh) lines.push({ x1: Math.min(ax, bx), y1: (ay + by) / 2, x2: Math.max(ax, bx), y2: (ay + by) / 2 })
              else if (dw < 1.5 && dh > dw) lines.push({ x1: (ax + bx) / 2, y1: Math.min(ay, by), x2: (ax + bx) / 2, y2: Math.max(ay, by) })
            } else if (op === OPS.curveTo) j += 6
            else if (op === OPS.curveTo2 || op === OPS.curveTo3) j += 4
          }
        }
      }
    } catch { /* no drawings: text only */ }
    // read the small pictures that sit right after a capital letter (a tuning's "D♭ A♭ …" with the flats drawn as images)
    const H = view[3]
    for (const mk of marks) {
      if (!mk.id) continue
      const letter = texts.some(t => /^[A-G]$/.test(t.str.trim()) && mk.x0 - (t.x + (t.w || t.h * 0.6)) < t.h * 0.6 && mk.x0 >= t.x + (t.w || 0) * 0.5 && Math.abs((H - t.y) - mk.y1) < t.h * 0.8)
      if (!letter) continue
      const img = await objOf(page, mk.id)
      if (img) { const sg = signOf(img); if (sg) mk.sign = sg }
    }
    out.push({ texts, lines, width: view[2] - view[0], height: view[3] - view[1], pictures: Math.min(1, pictures), shapes, glyphs, ...(marks.length ? { marks: marks.map(({ id: _id, ...m }) => m) } : {}) })
  }
  return out
}

/** Pages as pictures (PNG, base64) for the picture readers (KGuitar's own, then the AI): scanned PDFs, Songsterr prints.
 *  Scale 3 = about 216 dpi: tab numbers come out ~20 pixels tall, which the own reader reads best. */
export async function pdfPictures(bytes: Uint8Array, max = 6, from = 1, scale = 3): Promise<{ name: string; mime: string; b64: string; url: string }[]> {
  const lib = await pdfjs()
  const doc = await lib.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise
  const out: { name: string; mime: string; b64: string; url: string }[] = []
  const first = Math.max(1, Math.min(doc.numPages, Math.round(from)))
  for (let i = first; i <= Math.min(doc.numPages, first + max - 1); i++) {
    const page = await doc.getPage(i)
    const vp = page.getViewport({ scale })
    const c = document.createElement('canvas')
    c.width = Math.round(vp.width); c.height = Math.round(vp.height)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
    await page.render({ canvasContext: ctx, viewport: vp }).promise
    const url = c.toDataURL('image/png')
    out.push({ name: `page-${i}.png`, mime: 'image/png', b64: url.split(',')[1], url })
  }
  return out
}

/** How many pages (a book asks which pages to read). */
export async function pdfPageCount(bytes: Uint8Array): Promise<number> {
  const lib = await pdfjs()
  const doc = await lib.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise
  return doc.numPages
}

/** The tab on these pages is pictures (a scan, or tab printed as an image): the picture reader reads it, from page `from`. */
export class ScannedPdf extends Error {
  /** `songsterr`: the PDF was printed from Songsterr ("Artist - Song"): the song itself can come straight from Songsterr */
  constructor(public bytes: Uint8Array, public from = 1, public count = 6, public songsterr?: string) { super('This PDF is scanned pictures, not text') }
}

/** The text to read a tab or chord sheet from: Guitar Pro style staves first, then the page text as laid out. */
export function pdfTabText(pages: PdfPage[], names: string[]): { staff: string; text: string; drawn: boolean; songsterr: boolean } {
  const sc = staffScan(pages, names)
  const text = pages.map(p => pdfItemsToText(p.texts)).join('\n\n')
  // tab staves on the page but their numbers aren't text: drawn as shapes (Songsterr's prints do this)
  const drawn = !sc.text && sc.staves >= Math.max(1, pages.length)
  return { staff: sc.text, text, drawn, songsterr: /songsterr/i.test(text) }
}

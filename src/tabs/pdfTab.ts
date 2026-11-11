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
export interface PdfPage { texts: PdfText[]; lines: PdfLine[]; width: number; height: number; pictures?: number }

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
  const n = names.length
  const systems: string[] = []
  for (const p of pages) {
    const staves = findStaves(p.lines, p.width, n)
    for (const st of staves) {
      const s = (st.ys[0] - st.ys[n - 1]) / (n - 1)
      // fret numbers sitting on this staff's lines (their middle is about 0.35 of their height above the baseline)
      const notes: { x: number; str: number; t: string }[] = []
      for (const t of p.texts) {
        const v = t.str.trim()
        if (!NOTE.test(v)) continue
        const cy = t.y + t.h * 0.35
        if (cy > st.ys[0] + s * 0.5 || cy < st.ys[n - 1] - s * 0.5 || t.x < st.x0 - 2 || t.x > st.x1 + 2) continue
        const str = Math.round((st.ys[0] - cy) / s)
        if (str < 0 || str >= n || Math.abs(st.ys[str] - cy) > s * 0.45) continue
        notes.push({ x: t.x + t.w / 2, str, t: v.replace(/[()]/g, '').toLowerCase() })
      }
      if (!notes.length) continue
      // bar lines: vertical lines that span the staff
      const bars = p.lines.filter(l => Math.abs(l.x1 - l.x2) < 0.6 && Math.min(l.y1, l.y2) <= st.ys[n - 1] + 1 && Math.max(l.y1, l.y2) >= st.ys[0] - 1)
        .map(l => l.x1).filter(x => x > st.x0 + 4 && x < st.x1 - 2).sort((a, b) => a - b)
        .filter((x, i, a) => i === 0 || x - a[i - 1] > 3)
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
  return systems.join('\n\n')
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
    let pictures = 0
    try {
      const ol = await page.getOperatorList()
      let ctm: M = [1, 0, 0, 1, 0, 0]
      const stack: M[] = []
      for (let k = 0; k < ol.fnArray.length; k++) {
        const fn = ol.fnArray[k], args = ol.argsArray[k] as unknown[]
        if (fn === OPS.save) stack.push(ctm)
        else if (fn === OPS.restore) ctm = stack.pop() ?? ctm
        else if (fn === OPS.transform) ctm = mul(ctm, args as M)
        else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageMaskXObject) {
          // an image fills the unit square under the current transform: its area on the page
          pictures += Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2]) / Math.max(1, (view[2] - view[0]) * (view[3] - view[1]))
        }
        else if (fn === OPS.constructPath) {
          const ops = args[0] as number[], co = args[1] as number[]
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
    out.push({ texts, lines, width: view[2] - view[0], height: view[3] - view[1], pictures: Math.min(1, pictures) })
  }
  return out
}

/** Pages as pictures (PNG, base64) for the AI tab reader: for scanned PDFs. */
export async function pdfPictures(bytes: Uint8Array, max = 6, from = 1, scale = 2): Promise<{ name: string; mime: string; b64: string; url: string }[]> {
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
export class ScannedPdf extends Error { constructor(public bytes: Uint8Array, public from = 1, public count = 6) { super('This PDF is scanned pictures, not text') } }

/** The text to read a tab or chord sheet from: Guitar Pro style staves first, then the page text as laid out. */
export function pdfTabText(pages: PdfPage[], names: string[]): { staff: string; text: string } {
  return { staff: staffTabs(pages, names), text: pages.map(p => pdfItemsToText(p.texts)).join('\n\n') }
}

// Real tab pages for training the picture reader, labelled by the PDF shape reader (which reads them exactly): for each
// page, every tab staff's lines, bar lines and columns (frets per string, note length, grace, pick stroke), in page
// points (y down). crop.py then cuts each staff out of a picture of the page into the reader's frame.
//
// Build: npx esbuild tools/scanner-train/realstrips.ts --bundle --platform=node --format=esm --external:pdfjs-dist \
//          --outfile=node_modules/.tmp/realstrips.mjs
// Run:   node node_modules/.tmp/realstrips.mjs <book.pdf> <first page> <last page> <out.json> [rhythm=below|none]
//   rhythm=none: the book prints its rhythm in notation above the tab (Tony Rice), so the strips carry no rhythm labels
import { readFileSync, writeFileSync } from 'node:fs'
import { readPdf } from '../../src/tabs/pdfTab'
import { readVectorTab } from '../../src/scan/vectorTab'

const [pdf, a, b, out, rhythm = 'below'] = process.argv.slice(2)
const K = 4
const DUR = [4, 2, 1, 0.5, 0.25, 0.125]
/** a length in quarters → (base 0 whole … 5 32nd, dots, tuplet), the simplest that fits exactly */
function durClass(d: number): { dur: number; dots: number; tup: number } | null {
  for (const tup of [0, 3, 6, 5, 7]) for (const dots of [0, 1, 2]) for (let k = 0; k < DUR.length; k++) {
    let v = DUR[k] * (dots === 1 ? 1.5 : dots === 2 ? 1.75 : 1)
    if (tup) v *= 2 ** Math.floor(Math.log2(tup)) / tup
    if (Math.abs(v - d) < 1e-4) return { dur: k, dots, tup }
  }
  return null
}

type Col = { x: number; kind: 'note' | 'rest' | 'bar'; frets: Record<number, number | 'x'>; dur: number | null; dots: number; tup: number; grace: number; stroke: number }
const pagesOut: { page: number; width: number; height: number; staves: { lines: number[]; gap: number; left: number; right: number; nstr: number; cols: Col[]; rhythmRead: boolean }[] }[] = []
let start: { beats: number; sig: [number, number] } | undefined
const first = Number(a), last = Number(b)
for (let p0 = first; p0 <= last; p0 += 30) {
  const pages = await readPdf(new Uint8Array(readFileSync(pdf)), p0, Math.min(last, p0 + 29))
  pages.forEach((pg, i) => {
    const r = readVectorTab(pg.shapes ?? [], { texts: pg.texts, height: pg.height, glyphs: pg.glyphs, pdfMarks: pg.marks, startMeter: start })
    const lm = r?.meters[r.meters.length - 1]
    if (lm) start = { beats: lm.beats, sig: lm.sig }
    if (!r || r.notes < 4) return
    const staves = r.systems.map(s => {
      const nstr = s.lines.length
      // ReadSystem lines run low string → high; the frame's slot 0 is the TOP line (highest string)
      const lines = [...s.lines].reverse().map(y => y / K)
      const cols: Col[] = []
      // a bar adds up to its time signature only when its lengths were read right: otherwise its lengths aren't labels
      for (const bar of s.bars) {
        const sum = bar.steps.reduce((x, st) => x + st.dur, 0)
        const good = rhythm !== 'none' && Math.abs(sum - bar.beats) < 1e-3
        for (const st of bar.steps) {
          const c = good ? durClass(st.dur) : null
          const frets: Col['frets'] = {}
          for (const n of st.notes) frets[nstr - 1 - n.string] = n.dead ? 'x' : n.fret
          cols.push({ x: st.x / K, kind: st.notes.length ? 'note' : 'rest', frets, dur: st.grace ? null : c?.dur ?? null, dots: c?.dots ?? 0, tup: c?.tup ?? 0, grace: st.grace ? 1 : 0, stroke: st.stroke === 'down' ? 1 : st.stroke === 'up' ? 2 : 0 })
        }
        if (bar.x1 < s.right - 2) cols.push({ x: bar.x1 / K, kind: 'bar', frets: {}, dur: null, dots: 0, tup: 0, grace: 0, stroke: 0 })
      }
      return { lines, gap: s.gap / K, left: s.left / K, right: s.right / K, nstr, cols, rhythmRead: rhythm !== 'none' }
    })
    pagesOut.push({ page: p0 + i, width: pg.width, height: pg.height, staves })
  })
}
writeFileSync(out, JSON.stringify(pagesOut))
console.log(`${pagesOut.length} pages, ${pagesOut.reduce((x, p) => x + p.staves.length, 0)} staves → ${out}`)

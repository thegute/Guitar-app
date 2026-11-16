import './test-env'
// The Riff Scanner's picture maths on drawn test pictures: finding tab staves (light and dark, small and large,
// two staves, a 4-string uke tab, video noise), contrast, and how far a scrolling tab moved between frames.
import { strict as assert } from 'node:assert'
import { looksLikeTab, writtenTempo } from '../src/scan/read'
import { songFromScan } from '../src/scan/RiffScanner'
import { current } from '../src/instrument'
import { findStrips, playheadCols, playheadX, profile, sameFrame, shiftBetween, stretchContrast, sharpen, toGray, type Gray } from '../src/scan/image'
import { Stitcher } from '../src/scan/pictures'

let checks = 0
const ok = (c: boolean, m: string) => { checks++; assert.ok(c, m) }
let seed = 11
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

function canvas(w: number, h: number, bg: number): Gray { return { w, h, px: new Float32Array(w * h).fill(bg) } }
function rect(g: Gray, x0: number, y0: number, w: number, h: number, v: number) {
  for (let y = Math.max(0, y0); y < Math.min(g.h, y0 + h); y++) for (let x = Math.max(0, x0); x < Math.min(g.w, x0 + w); x++) g.px[y * g.w + x] = v
}
/** a tab staff: lines, a bar line, digits (blobs) sitting on lines with the line cleared around them, chord name above */
function staff(g: Gray, x0: number, y0: number, width: number, gap: number, n: number, ink: number, bg: number, notes: [number, number][]) {
  for (let s = 0; s < n; s++) rect(g, x0, y0 + s * gap, width, 1, ink)
  rect(g, x0, y0, 1, gap * (n - 1), ink)
  for (const [x, s] of notes) {
    const dw = Math.max(3, Math.round(gap * 0.55)), dh = Math.max(4, Math.round(gap * 0.8))
    rect(g, x0 + x - 1, y0 + s * gap - dh / 2 - 1, dw + 2, dh + 2, bg)
    rect(g, x0 + x, y0 + s * gap - dh / 2, dw, dh, ink)
  }
  rect(g, x0 + 10, y0 - gap * 2, gap * 2, Math.round(gap * 0.9), ink) // a chord name
}
const noise = (g: Gray, a: number) => { for (let i = 0; i < g.px.length; i++) g.px[i] = Math.max(0, Math.min(1, g.px[i] + (rnd() - 0.5) * a)) }

const notes = (count: number, width: number, n = 6): [number, number][] => Array.from({ length: count }, (_, i) => [Math.round(20 + (i * (width - 40)) / count), i % n])

// light page, one staff in the middle of a video frame
{
  const g = canvas(640, 360, 0.95)
  staff(g, 40, 150, 560, 10, 6, 0.1, 0.95, notes(14, 560))
  noise(g, 0.06)
  const s = findStrips(g)
  ok(s.length === 1 && Math.abs(s[0].lines[0] - 150) <= 1 && s[0].lines.length === 6, `light staff found (${JSON.stringify(s.map(x => x.lines))})`)
  ok(s[0].top <= 150 - 20 && s[0].bottom >= 200 && s[0].left <= 40 && s[0].right >= 590, `box holds the chord names and the whole staff (${s[0].top}-${s[0].bottom}, ${s[0].left}-${s[0].right})`)
}
// dark video tab (white on black), small: 6 px between strings
{
  const g = canvas(480, 270, 0.08)
  staff(g, 20, 190, 440, 6, 6, 0.92, 0.08, notes(18, 440))
  noise(g, 0.05)
  const s = findStrips(g)
  ok(s.length === 1 && s[0].lines.length === 6 && Math.abs(s[0].lines[0] - 190) <= 1, `small dark staff found (${JSON.stringify(s.map(x => x.lines))})`)
}
// two staves on a page, plus a 4-string uke staff
{
  const g = canvas(800, 600, 1)
  staff(g, 30, 80, 740, 12, 6, 0, 1, notes(16, 740))
  staff(g, 30, 260, 740, 12, 6, 0, 1, notes(20, 740))
  staff(g, 30, 460, 740, 14, 4, 0, 1, notes(12, 740, 4))
  const s = findStrips(g)
  ok(s.length === 3 && s[0].lines.length === 6 && s[1].lines.length === 6 && s[2].lines.length === 4, `two guitar staves and a uke staff (${s.map(x => x.lines.length).join(',')})`)
}
// no tab: a face-cam frame with text
{
  const g = canvas(400, 300, 0.5)
  for (let i = 0; i < 40; i++) rect(g, Math.round(rnd() * 380), Math.round(rnd() * 280), 20, 12, rnd())
  noise(g, 0.2)
  ok(findStrips(g).length === 0, 'no staff in a picture without one')
}
// contrast and sharpening keep values in range and flip dark pictures
{
  const g = canvas(100, 40, 0.1)
  staff(g, 5, 10, 90, 4, 6, 0.7, 0.1, notes(5, 90))
  const c = stretchContrast(g)
  ok(c.px[0] > 0.9, `dark picture comes out light (${c.px[0].toFixed(2)})`)
  const sh = sharpen(c)
  ok(sh.px.every(v => v >= 0 && v <= 1), 'sharpened values stay 0..1')
}
// scrolling: frame b is frame a moved 137 px to the left, with new notes coming in
{
  const W = 900, a = canvas(W, 80, 1), b = canvas(W, 80, 1)
  const long = canvas(W + 300, 80, 1)
  staff(long, 0, 15, W + 300, 10, 6, 0, 1, Array.from({ length: 40 }, (_, i): [number, number] => [15 + i * 29 + Math.round(rnd() * 8), Math.floor(rnd() * 6)]))
  for (let y = 0; y < 80; y++) for (let x = 0; x < W; x++) { a.px[y * W + x] = long.px[y * long.w + x]; b.px[y * W + x] = long.px[y * long.w + x + 137] }
  const sh = shiftBetween(profile(a), profile(b))
  ok(!!sh && Math.abs(sh.dx - 137) <= 1, `scroll of 137 px found (${sh?.dx}, match ${sh?.match.toFixed(2)})`)
  ok(sameFrame(a, a) && !sameFrame(a, b), 'same frame vs moved frame')
}
// what the AI sends back
{
  const t = `Tempo: 96
    G               C
e|-----3-----|-----0-----|
B|---0---0---|---1---1---|
G|-0-------0-|-0-------0-|
D|-----------|-2---------|
A|-----------|-3---------|
E|-3---------|-----------|
   D D U U D U`
  ok(looksLikeTab(t) && !looksLikeTab('NO TAB') && !looksLikeTab('I cannot see a tab here.'), 'looksLikeTab')
  ok(writtenTempo(t) === 96 && writtenTempo('no tempo') === null, 'written tempo')
  const d = songFromScan(t, 'Scan', current())!
  ok(!!d && d.song.tempo === 96 && d.song.tempoFrom === 'file', `scan → song at the written tempo (${d?.song.tempo})`)
  const notes = d.song.tracks[0].bars.flatMap(b => b.steps.flatMap(st => st.notes.map(n => `${n.string}:${n.fret}`)))
  ok(notes.slice(0, 3).join(' ') === '0:3 3:0 4:0' && notes.length === 13, `scanned notes ${notes.join(' ')}`)
  ok(d.song.tracks[0].bars[0].steps.some(st => st.chord === 'G'), 'chord names kept')
}
// a top line crowded with two-digit numbers ("—11—12—14—12—"): the staff is still found
{
  const g = canvas(1100, 300, 1)
  for (let s = 0; s < 6; s++) rect(g, 80, 100 + s * 30, 1000, 2, 0)
  for (let i = 0; i < 9; i++) { const x = 100 + i * 110; rect(g, x - 4, 88, 48, 26, 1); rect(g, x, 90, 18, 22, 0); rect(g, x + 22, 90, 18, 22, 0) }
  for (let i = 0; i < 8; i++) { const x = 150 + i * 115; rect(g, x - 4, 118, 48, 26, 1); rect(g, x, 120, 18, 22, 0); rect(g, x + 22, 120, 18, 22, 0) }
  const st = findStrips(g, [6])
  ok(st.length === 1 && st[0].lines.length === 6, `staff with crowded top lines found (${JSON.stringify(st.map(x => x.lines))})`)
}
// (the stitcher also makes PNG pieces for the AI reader: a canvas that draws nothing will do here)
;(globalThis as any).document ??= { createElement: () => ({ getContext: () => ({ createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} }), toDataURL: () => 'data:image/png;base64,' }) }
// a tab that moves on a page at a time, each page showing the end of the last one again, with a blank margin at both
// sides of the box: one strip, nothing lost under the margins
{
  const W = 1000, H = 120, mar = 40
  const long = canvas(3000, H, 1)
  const ns: [number, number][] = Array.from({ length: 90 }, (_, i) => [20 + i * 32 + Math.round(rnd() * 6), Math.floor(rnd() * 6)])
  staff(long, 0, 30, 3000, 12, 6, 0, 1, ns)
  const page = (x0: number) => {
    const f = canvas(W, H, 1)
    for (let y = 0; y < H; y++) for (let x = mar; x < W - mar; x++) f.px[y * W + x] = long.px[y * long.w + x0 + x]
    return f
  }
  const st = new Stitcher()
  for (const x0 of [0, 600, 1200, 1800]) for (let k = 0; k < 3; k++) st.addGray(page(x0))
  st.finish()
  ok(st.strips.length === 1 && st.scrolled, `pages that overlap become one strip (${st.strips.length} strips: ${st.trace.join(' ')})`)
  const s0 = st.strips[0]
  // no blank margin painted over the middle of the strip: every column between the first and last page's edges has its lines
  let blank = 0
  for (let x = mar; x < s0.w - mar; x++) if (s0.px[(30 + 12 * 5) * s0.w + x] > 0.5 && s0.px[(30 + 12 * 4) * s0.w + x] > 0.5) blank++
  ok(blank < 30, `no blank stripes where the pages meet (${blank} columns)`)
  // a new page with other music on it: a new strip
  const other = canvas(3000, H, 1)
  staff(other, 0, 30, 3000, 12, 6, 0, 1, Array.from({ length: 90 }, (_, i): [number, number] => [20 + i * 32 + Math.round(rnd() * 6), Math.floor(rnd() * 6)]))
  const st2 = new Stitcher()
  for (let k = 0; k < 3; k++) st2.addGray(page(0))
  const f2 = canvas(W, H, 1)
  for (let y = 0; y < H; y++) for (let x = mar; x < W - mar; x++) f2.px[y * W + x] = other.px[y * other.w + x]
  for (let k = 0; k < 3; k++) st2.addGray(f2)
  st2.finish()
  ok(st2.strips.length === 2, `a page of other music is a new strip (${st2.strips.length}: ${st2.trace.join(" ")})`)
}
// missing-line comb recovery: a 6-string video staff where 2 interior lines (strings 2 and 4) are washed out by H.264 compression
{
  const g = canvas(800, 240, 0.96)
  for (let s = 0; s < 6; s++) {
    // strings 1 and 3 are very faint (0.86 on 0.96 paper); the other 4 are normal (0.15)
    const ink = s === 1 || s === 3 ? 0.85 : 0.15
    rect(g, 40, 80 + s * 14, 720, 1, ink)
  }
  const st = findStrips(g, [6])
  ok(st.length === 1 && st[0].lines.length === 6, `comb-grid recovers all 6 lines even when 2 interior lines are faint (${JSON.stringify(st.map(x => x.lines))})`)
  ok(st[0].lines.every((y, s) => Math.abs(y - (80 + s * 14)) <= 1), `reconstructed line heights match 80 + 14·s (${st[0].lines.join(',')})`)
}
// colored playhead detection and playhead-masked composition in Stitcher
{
  const W = 500, H = 120
  const makeRgbFrame = (cursorX: number): Gray => {
    const rgba = new Uint8ClampedArray(W * H * 4).fill(245)
    // 6 dark staff lines at y = 25 + 10*s
    for (let s = 0; s < 6; s++) {
      const y = 25 + s * 10
      for (let x = 20; x < W - 20; x++) {
        const i = (y * W + x) * 4
        rgba[i] = 25; rgba[i + 1] = 25; rgba[i + 2] = 25; rgba[i + 3] = 255
      }
    }
    // green Songsterr-style playhead bar (3px wide, bright green: luma ~0.58 so grey threshold alone misses it, but RGB chroma catches it)
    for (let y = 18; y <= 82; y++) {
      for (let x = cursorX - 1; x <= cursorX + 1; x++) {
        const i = (y * W + x) * 4
        rgba[i] = 30; rgba[i + 1] = 215; rgba[i + 2] = 60; rgba[i + 3] = 255
      }
    }
    return toGray(rgba, W, H)
  }
  const f1 = makeRgbFrame(120), f2 = makeRgbFrame(220), f3 = makeRgbFrame(320)
  ok(Math.abs((playheadX(f1) ?? -1) - 120) <= 2, `colored playhead detected at x=120 (got ${playheadX(f1)})`)
  ok(playheadCols(f2)[220] === 1 && playheadCols(f2)[100] === 0, 'playheadCols masks the cursor column')
  const st = new Stitcher()
  st.addGray(f1, 1.0)
  st.addGray(f2, 2.0)
  st.addGray(f3, 3.0)
  st.finish()
  ok(st.timelines.length === 1 && st.timelines[0].length === 3, `Stitcher recorded 3 playhead timeline points (${JSON.stringify(st.timelines)})`)
  // In the composed strip, the green playhead at x=120 (which had mid-grey luma ~0.58 between lines) is replaced by clean paper (> 0.9) from the other frames!
  const composedMid = st.strips[0].px[30 * W + 120]
  ok(composedMid > 0.9, `Stitcher masked out the playhead column in composed strip (pixel at x=120 between lines = ${composedMid.toFixed(2)})`)
}
// 3px-gap compact staff detection (e.g., 16:9 YouTube video inside a portrait phone screen grab)
{
  const g = canvas(400, 120, 0.08)
  staff(g, 20, 60, 340, 3, 6, 0.92, 0.08, notes(12, 340))
  const s = findStrips(g, [6])
  ok(s.length === 1 && s[0].lines.length === 6, `compact 3px-gap staff found (${JSON.stringify(s.map(x => x.lines))})`)
}
// parseWatched: markdown bold headers and multi-system blank lines preserved
{
  const { parseWatched } = await import('../src/scan/link')
  const w1 = parseWatched('**SOURCE:** screen\n**TEMPO:** 112 BPM\n**TIME:** 4/4\n**KEY:** G\n**CHORDS:** G C D\n**TAB:**\ne|-0-2-3-|\nB|-3-----|\nG|-------|\nD|-------|\nA|-------|\nE|-------|')
  ok(w1.source === 'screen' && w1.tempo === 112 && w1.chords.length === 3 && looksLikeTab(w1.tab), 'parseWatched handles markdown bold headers')
  const w2 = parseWatched('SOURCE: screen\nTEMPO: 100\n\ne|-0-|\nB|-1-|\nG|-0-|\nD|-2-|\nA|-3-|\nE|---|\n\ne|-3-|\nB|-0-|\nG|-0-|\nD|-0-|\nA|-2-|\nE|-3-|')
  ok(w2.tab.includes('\n\n') && songFromScan(w2.tab, 'Multi', current())!.song.tracks[0].bars.length >= 2, 'parseWatched keeps blank lines between multiple tab systems')
}
// songTabText: high string ("e |") on top, low string ("E |") on bottom, round-trips with stringNames(inst)
{
  const { songTabText } = await import('../src/scan/tabReadSong')
  const { stringNames } = await import('../src/tabs/importer')
  const inst = current()
  const names = stringNames(inst)
  const doc = songFromScan('e|-0-2-|\nB|-----|\nG|-----|\nD|-----|\nA|-----|\nE|-3---|', 'Order check', inst)!
  const txt = songTabText(doc.song, names)
  const lines = txt.split('\n')
  ok(lines[0].startsWith('e |') && lines[0].includes('0') && lines[0].includes('2'), `songTabText puts high e notes on top ("${lines[0]}")`)
  ok(lines[5].startsWith('E |') && lines[5].includes('3'), `songTabText puts low E notes on bottom ("${lines[5]}")`)
}
console.log(`scan image: ${checks} checks, 0 failed`)

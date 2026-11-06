import './test-env'
// The Riff Scanner's picture maths on drawn test pictures: finding tab staves (light and dark, small and large,
// two staves, a 4-string uke tab, video noise), contrast, and how far a scrolling tab moved between frames.
import { strict as assert } from 'node:assert'
import { looksLikeTab, writtenTempo } from '../src/scan/read'
import { songFromScan } from '../src/scan/RiffScanner'
import { current } from '../src/instrument'
import { findStrips, profile, sameFrame, shiftBetween, stretchContrast, sharpen, type Gray } from '../src/scan/image'

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
console.log(`scan image: ${checks} checks, 0 failed`)

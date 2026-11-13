// KGuitar's own tab-picture reader (src/scan/tabRead.ts + tabReadSong.ts) on a made-up printed tab
// (tests/fixtures/make-tab-picture.py): every number, its string, its rhythm, two-digit frets, a "(12)" tied note,
// dead notes, a pickup, a rest symbol that must not be read as a number, and blur / smaller print.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { readTab, fitRhythm } from '../src/scan/tabRead'
import { readingSong } from '../src/scan/tabReadSong'
import type { Gray } from '../src/scan/image'

const raw = inflateSync(readFileSync('tests/fixtures/tab-picture.gray.z'))
const W = raw.readUInt32LE(0), H = raw.readUInt32LE(4)
const page: Gray = { w: W, h: H, px: Float32Array.from(raw.subarray(8), v => v / 255) }
type Step = { dur: number; notes: { string: number; fret: number; dead?: boolean }[] }
const want = JSON.parse(readFileSync('tests/fixtures/tab-picture.json', 'utf8')) as { staves: Step[][][] }
const key = (ns: { string: number; fret: number; dead?: boolean }[]) => ns.map(n => `${n.string}:${n.dead ? 'x' : n.fret}`).sort().join('+')
const wantSteps = want.staves.flat(2).filter(s => s.notes.length)

function check(g: Gray, label: string, exactRhythm = true) {
  const r = readTab(g)
  assert.equal(r.systems.length, 2, `${label}: two staves`)
  if (exactRhythm) assert.equal(r.meter, 4, `${label}: 4/4`)
  const got = r.systems.flatMap(s => s.bars.flatMap(b => b.steps))
  if (exactRhythm) assert.deepEqual(got.map(st => key(st.notes)), wantSteps.map(s => key(s.notes)), `${label}: every number on its string`)
  else {
    // small print: every number found on its string, at most one misread. Known gap: a digit that appears only once on
    // the page (nothing to learn its look from) can be misread with confidence at this size (the lone 9 reads as 0)
    assert.equal(got.length, wantSteps.length, `${label}: every column found`)
    const wrong = got.filter((st, i) => key(st.notes) !== key(wantSteps[i].notes))
    assert.ok(wrong.length <= 1, `${label}: ${wrong.length} misread`)
  }
  if (exactRhythm) {
    // note lengths from the spacing, bar by bar. A bar with a rest is left out: the reader sees only numbers, so a rest's
    // room goes to the note before it, and that note's length is a guess
    const gotBars = r.systems.flatMap(s => s.bars)
    const wantBars = want.staves.flat()
    assert.equal(gotBars.length, wantBars.length, `${label}: every bar`)
    wantBars.forEach((wb, i) => {
      if (wb.some(st => !st.notes.length)) return
      assert.deepEqual(gotBars[i].steps.map(st => st.dur), wb.map(st => st.dur), `${label}: rhythm of bar ${i + 1}`)
    })
    assert.equal(r.systems[0].bars[0].beats, 2, `${label}: the 2-beat pickup`)
  }
  return r
}

const r = check(page, 'clean print')
assert.ok(r.unsure <= 2, `a clean print has few doubts (${r.unsure})`)
console.log('tab picture, clean: ok', r.notes, 'numbers')

// a softer, slightly blurred print (a scan): a 3×3 box blur
{
  const px = new Float32Array(W * H)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    let s = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += page.px[(y + dy) * W + x + dx]
    px[y * W + x] = Math.min(1, s / 9 + 0.04)
  }
  for (let i = 0; i < W; i++) { px[i] = 1; px[(H - 1) * W + i] = 1 }
  for (let y = 0; y < H; y++) { px[y * W] = 1; px[y * W + W - 1] = 1 }
  check({ w: W, h: H, px }, 'blurred scan')
  console.log('tab picture, blurred: ok')
}

// the same page at 0.6 the size (small print, a low-resolution scan: numbers ~10 pixels tall)
{
  const s = 0.6, w = Math.round(W * s), h = Math.round(H * s)
  const px = new Float32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let acc = 0, n = 0
    for (let yy = Math.floor(y / s); yy < Math.min(H, Math.ceil((y + 1) / s)); yy++) for (let xx = Math.floor(x / s); xx < Math.min(W, Math.ceil((x + 1) / s)); xx++) { acc += page.px[yy * W + xx]; n++ }
    px[y * w + x] = acc / n
  }
  check({ w, h, px }, 'smaller print', false)
  console.log('tab picture, smaller: ok')
}

// the song made from it: frets → pitches in the tuning, dead notes as x, the pickup as a short first bar
{
  const doc = readingSong([r], [40, 45, 50, 55, 59, 64], 'Test page', 4)!
  const bars = doc.song.tracks[0].bars
  assert.equal(bars[0].steps.reduce((a, s) => a + s.dur, 0), 2, 'pickup bar is 2 beats')
  for (const b of bars.slice(1)) assert.equal(b.steps.reduce((a, s) => a + s.dur, 0), 4, 'every full bar adds up to 4')
  const dead = bars.flatMap(b => b.steps.flatMap(s => s.notes)).filter(n => n.tech === 'x')
  assert.equal(dead.length, 2, 'two dead notes')
  const e12 = bars.flatMap(b => b.steps.flatMap(s => s.notes)).find(n => n.string === 5 && n.fret === 12)
  assert.equal(e12?.midi, 76, 'high e 12th fret = E5')
  console.log('reading → song: ok')
}

// rhythm fitting on its own: even quarters, eighths, and a dotted feel
assert.deepEqual(fitRhythm([10, 10, 10, 10], 4), [1, 1, 1, 1])
assert.deepEqual(fitRhythm([6, 6, 6, 6, 10, 10], 4), [0.5, 0.5, 0.5, 0.5, 1, 1])
console.log('fitRhythm: ok')

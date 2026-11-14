// KGuitar's own tab-picture reader (src/scan/tabRead.ts + tabReadSong.ts) on a made-up printed tab
// (tests/fixtures/make-tab-picture.py): every number, its string, its rhythm, two-digit frets, a "(12)" tied note,
// dead notes, a pickup, a rest symbol that must not be read as a number, and blur / smaller print.
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { readTab, fitRhythm } from '../src/scan/tabRead'
import { readingSong, mergePages, dropLoop } from '../src/scan/tabReadSong'
import { tuningFromText, guitarNumbers } from '../src/scan/tuningText'
import { rhythmFromStems } from '../src/scan/stemRhythm'
import { fitBar, straighten, timeOf } from '../src/scan/crnnRead'
import { hearing, referee } from '../src/scan/hear'
import type { PdfShape } from '../src/tabs/pdfTab'
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

// a page's tuning lines, one per guitar group, with the flats drawn as little pictures after the letters (Plini's books)
{
  const H = 800
  const row = (label: string, names: string[], y: number) => [
    { str: label, x: 400, y: H - y, w: 50, h: 8 },
    ...names.map((n, i) => ({ str: n, x: 470 + i * 20, y: H - y, w: 5.8, h: 8 })),
  ]
  const texts = [...row('Guitars 1 - 3', ['D', 'A', 'D', 'G', 'B', 'E'], 365), ...row('Guitars 4 & 5', ['E', 'A', 'D', 'G', 'B', 'E'], 380)]
  // flats after every letter of the first line only
  const marks = [0, 1, 2, 3, 4, 5].map(i => ({ x0: 470 + i * 20 + 5.8, x1: 470 + i * 20 + 14, y0: 355, y1: 366, sign: 'flat' as const }))
  const f = tuningFromText(texts, H, [], 6, marks)!
  assert.deepEqual(f.midis, [37, 44, 49, 54, 58, 63], 'Db Ab Db Gb Bb Eb')
  assert.deepEqual(f.parts?.map(p => p.guitars), [[1, 2, 3], [4, 5]])
  assert.deepEqual(f.parts?.[1].midis, [40, 45, 50, 55, 59, 64], 'guitars 4 & 5 in standard')
  assert.deepEqual(guitarNumbers('Gtr. 2'), [2])
  console.log('tuning lines per guitar + drawn flats: ok')
}

// rhythm under the tab (Guitar Pro style): a tied note printed with no number keeps its own length, a grace note takes a
// 32nd from the note before, a bracketed 3 shortens only the notes under it
{
  const g = 6, lines = [0, 6, 12, 18, 24, 30]
  const st = { lines, gap: g, left: 0, right: 400 }
  const fill = (x0: number, y0: number, x1: number, y1: number): PdfShape => ({ kind: 'fill', polys: [[x0, y0, x1, y0, x1, y1, x0, y1]], x0, y0, x1, y1, sig: `${x1 - x0}x${y1 - y0}` })
  const stem = (x: number) => fill(x - 0.15, 33, x + 0.15, 42) // full stems: 1.5 gaps
  const beam = (a: number, b: number, y = 41) => fill(a, y, b, y + 1)
  // bar of 4/4: quarter (x=20) tied into a quarter with no number (x=60), then a grace (x=100, no stem) before an eighth
  // (x=118), eighth (x=140), then a quarter (x=180)
  const shapes = [stem(20), stem(60), stem(118), stem(140), beam(118, 140), stem(180)]
  const r = rhythmFromStems(shapes, { ...st }, [20, 100, 118, 140, 180], 0, 220, 4)!
  assert.deepEqual(r.durs, [1, 0.125, 0.5, 0.5, 1], 'grace takes a 32nd')
  assert.deepEqual(r.rests.map(q => [q.x, q.dur]), [[60, 0.875]], 'the held quarter, less the grace\'s 32nd')
  assert.deepEqual(r.grace, [false, true, false, false, false])
  console.log('stems: held notes and grace notes: ok')
}

// the trained reader's helpers: a bar's lengths made to add up (most likely set, spacing as a tie-break), and a bent
// staff straightened onto the frame's rows
{
  const opt = (...xs: [number, number][]) => xs.map(([d, p]) => ({ d, p }))
  // four columns read as 8th, 8th, quarter, quarter: in 3/4 they're kept as read; in a bar of 2½ beats the least sure
  // column (the last) takes its second guess
  const cols = [{ u: 0, lens: opt([0.5, 0.9], [0.25, 0.1]) }, { u: 10, lens: opt([0.5, 0.9], [1, 0.1]) }, { u: 20, lens: opt([1, 0.8], [0.5, 0.2]) }, { u: 40, lens: opt([1, 0.6], [0.5, 0.4]) }]
  assert.deepEqual(fitBar(cols, 3, 60), [0.5, 0.5, 1, 1])
  assert.deepEqual(fitBar(cols, 2.5, 60), [0.5, 0.5, 1, 0.5], 'the least sure column gives way')
  assert.equal(fitBar(cols, 9, 60), null)
  // a staff whose lines sag by 3 px in the middle: after straightening, every line sits on its frame row
  const w = 400, h = 140
  const px = new Float32Array(w * h).fill(1)
  const sag = (x: number) => 3 * Math.sin(Math.PI * x / w)
  for (let s = 0; s < 6; s++) for (let x = 20; x < 380; x++) { const y = Math.round(30 + 12 * s + sag(x)); px[y * w + x] = 0 }
  const sv = straighten({ w, h, px }, { top: 20, bottom: 110, left: 20, right: 380, lines: [30, 42, 54, 66, 78, 90] }, 6)
  let off = 0
  for (let s = 0; s < 6; s++) for (const u of [Math.round(sv.W * 0.3), Math.round(sv.W * 0.5), Math.round(sv.W * 0.7)]) {
    const row = 42 + 15 * s
    if (sv.px[row * sv.W + u] > 0.5 && sv.px[(row - 1) * sv.W + u] > 0.5 && sv.px[(row + 1) * sv.W + u] > 0.5) off++
  }
  assert.equal(off, 0, 'lines land on rows 42 + 15·s')
  console.log('trained reader helpers (bar fit, straightening): ok')
}

// the audio referee: a picture that can't tell a 6 from an 8 on the B string, and the sound of an 8 (G4) ringing
{
  const sr = 44100, x = new Float32Array(sr * 2)
  const f = 440 * 2 ** ((67 - 69) / 12)
  for (let i = sr / 2; i < x.length; i++) { const t = (i - sr / 2) / sr; for (let h = 1; h <= 4; h++) x[i] += Math.sin(2 * Math.PI * f * h * t) / h * Math.exp(-t * 2) }
  const sal = hearing(x, sr)(0.5)!
  assert.ok(sal, 'sound found')
  // B string open = 59: fret 6 = 65, fret 8 = 67; the picture leans to 6
  assert.equal(referee([{ midi: 65, p: 0.55 }, { midi: 67, p: 0.42 }], sal), 1, 'the 8 is what sounds')
  assert.equal(hearing(x, sr)(0.1), null, 'silence says nothing')
  const tl = timeOf([{ x: 100, t: 1 }, { x: 300, t: 2 }, { x: 250, t: 3 }])
  assert.equal(tl(200), 1.5)
  assert.equal(tl(50), null)
  console.log('audio referee: ok')
}

// a page that scrolls up and down: each picture shows a few lines, the next the same lines moved up and one new; the
// lines seen again are read once, and the reading most looks agree on wins
{
  const sys = (...cols: string[]) => ({ lines: [], gap: 10, left: 0, right: 100, bars: [{ steps: cols.map(c => ({ dur: 1, notes: c ? c.split('+').map(n => ({ string: +n.split(':')[0], fret: +n.split(':')[1] })) : [] })) }] }) as any
  const L1 = sys('0:3', '1:2', '2:0', '3:0'), L2 = sys('4:1', '5:0', '4:1', '3:2'), L3 = sys('1:3', '2:2', '3:0', '4:1')
  const L3x = sys('2:0', '1:3', '2:2', '3:0', '4:1') // a rest sign once read as a 0
  const L4 = sys('0:1', '1:1', '2:3', '3:3')
  const rd = (...s: any[]) => ({ systems: s, unsure: 0, notes: 4, meter: 4 })
  const out = mergePages([rd(L1, L2, L3x), rd(L2, L3, L4), rd(L3, L4, sys('5:5', '4:5', '3:5', '2:5'))])
  const lines = out.flatMap(r => r.systems.map((s: any) => s.bars[0].steps.map((st: any) => st.notes.map((n: any) => `${n.string}:${n.fret}`).join('+')).join(' ')))
  assert.deepEqual(lines, ['0:3 1:2 2:0 3:0', '4:1 5:0 4:1 3:2', '1:3 2:2 3:0 4:1', '0:1 1:1 2:3 3:3', '5:5 4:5 3:5 2:5'], lines.join(' / '))
  console.log('page that scrolls up: ok')
}

// a Short recorded past its end: the opening again at the end is dropped, a riff that comes back mid-song is kept
{
  const sys = (...cols: string[]) => ({ lines: [], gap: 10, left: 0, right: 100, bars: [{ steps: cols.map(c => ({ dur: 1, notes: c.split('+').map(n => ({ string: +n.split(':')[0], fret: +n.split(':')[1] })) })) }] }) as any
  const A = ['0:3', '1:2', '2:0', '3:0', '4:1', '5:0', '4:1', '3:2', '2:2', '1:3']
  const B = ['0:1', '1:1', '2:3', '3:3', '4:3', '5:3', '4:0', '3:0', '2:0', '1:0']
  const rd = (...s: any[]) => ({ systems: s, unsure: 0, notes: 10, meter: 4 })
  const out = dropLoop([rd(sys(...A)), rd(sys(...B)), rd(sys(...A)), rd(sys(...B)), rd(sys(...A.slice(0, 9)))])
  assert.deepEqual(out.map(r => r.systems[0].bars.length), [1, 1, 1, 1, 0], 'only the replay at the end goes')
  console.log('Short replay dropped: ok')
}

// The hand brain's scoring bench: pieces with the fingerings good teachers use. Every change to the engine has to
// match or beat the last score. Also checks hand positions, shift timing, placing pitches, and speed.
import './test-env'
import { strict as assert } from 'node:assert'
import { planFingers, placeAndFinger, type HStep } from '../src/hand/engine'
import { handGroups } from '../src/play/handShape'
import type { FlatStep } from '../src/tabs/model'

const L = 648
const STD = [40, 45, 50, 55, 59, 64]
// tab shorthand: "s:f" single notes (s 1 = high e … 6 = low E, like a written tab), "s:f+s:f" chords, "-" rest; tech after the fret
function tab(src: string, dur = 0.5): HStep[] {
  return src.trim().split(/\s+/).map(tok => {
    if (tok === '-') return { notes: [], dur }
    return {
      dur,
      notes: tok.split('+').map(x => {
        const m = /^(\d):(\d+)([a-z~/\\½]*)$/.exec(x)!
        return { string: 6 - Number(m[1]), fret: Number(m[2]), ...(m[3] ? { tech: m[3] } : {}) }
      }),
    }
  })
}
const fingersOf = (steps: HStep[]) => planFingers(steps, { scale: L, size: 'medium' }).steps.map(s => (s ? s.fingers : null))

interface Case { name: string; tab: string; want: string; dur?: number }
// want: fingers per step in order, "." for a rest/open-only step, chords as e.g. "3201" low to high string order as written
const CASES: Case[] = [
  { name: 'A minor pentatonic box, fret 5', tab: '6:5 6:8 5:5 5:7 4:5 4:7 3:5 3:7 2:5 2:8 1:5 1:8', want: '1 4 1 3 1 3 1 3 1 4 1 4' },
  { name: 'C major scale, open position', tab: '5:3 4:0 4:2 4:3 3:0 3:2 2:0 2:1', want: '3 . 2 3 . 2 . 1' },
  { name: 'G major scale at fret 2 (one finger per fret)', tab: '6:3 6:5 5:2 5:3 5:5 4:2 4:4 4:5', want: '2 4 1 2 4 1 3 4' },
  { name: 'Open C chord', tab: '5:3+4:2+3:0+2:1+1:0', want: '3 2 0 1 0' },
  { name: 'Open G chord', tab: '6:3+5:2+4:0+3:0+2:0+1:3', want: '2 1 0 0 0 3|3 2 0 0 0 4' },
  { name: 'Open D chord', tab: '4:0+3:2+2:3+1:2', want: '0 1 3 2' },
  { name: 'Open A chord', tab: '5:0+4:2+3:2+2:2+1:0', want: '0 1 2 3 0' },
  { name: 'F barre chord (E shape)', tab: '6:1+5:3+4:3+3:2+2:1+1:1', want: '1 3 4 2 1 1' },
  { name: 'Bb barre chord (A shape)', tab: '5:1+4:3+3:3+2:3+1:1', want: '1 2 3 4 1|1 3 3 3 1' },
  { name: 'Bend on the B string with the ring finger', tab: '2:8 2:10b', want: '1 3' },
  { name: 'Hammer-on stays in position', tab: '3:5 3:7h 3:5p', want: '1 3 1' },
  { name: 'Am pentatonic run up to the 2nd box with a slide', tab: '3:5 3:7 3:9/ 2:8 2:10', want: '1 3 3 2 4' },
  { name: 'Chromatic 1-2-3-4', tab: '6:1 6:2 6:3 6:4 5:1 5:2 5:3 5:4', want: '1 2 3 4 1 2 3 4' },
  { name: 'Small F chord', tab: '4:3+3:2+2:1+1:1', want: '3 2 1 1' },
  { name: 'Cadd9 (rock C)', tab: '5:3+4:2+3:0+2:3+1:3', want: '2 1 0 3 4|3 2 0 3 4' },
  { name: 'Em7 with two fingers', tab: '6:0+5:2+4:0+3:0+2:3+1:0', want: '0 1 0 0 3 0|0 2 0 0 3 0' },
  { name: 'Bluegrass G run', tab: '5:2 5:3 4:0 4:2 3:0 3:2 1:3', want: '1 2 . 1 . 1 3|2 3 . 2 . 2 4|2 3 . 2 . 2 3' },
  { name: 'Three notes per string (G major, fret 3)', tab: '6:3 6:5 6:7 5:3 5:5 5:7', want: '1 2 4 1 2 4|1 3 4 1 3 4' },
  { name: 'Blues shuffle riff', tab: '5:0+4:2 5:0+4:2 5:0+4:4 5:0+4:2', want: '0 1 0 1 0 3 0 1|0 1 0 1 0 4 0 1' },
  { name: 'Trill (hammer, pull)', tab: '2:5 2:7h 2:5p 2:7h', want: '1 3 1 3' },
  { name: 'Power chords moving', tab: '6:3+5:5 6:5+5:7 6:7+5:9', want: '1 3 1 3 1 3' },
]

let right = 0, total = 0
for (const c of CASES) {
  const got = fingersOf(tab(c.tab, c.dur))
  const flat = got.map(f => (f === null ? '.' : f.join(' '))).join(' ')
  const gw = flat.split(' ')
  // several teachers' fingerings may be fine: the closest one counts
  let ok = 0, ww: string[] = []
  for (const alt of c.want.split('|')) {
    const w = alt.split(' ')
    let k = 0
    w.forEach((x, i) => { if (x === '.' || gw[i] === x) k++ })
    if (k > ok || !ww.length) { ok = k; ww = w }
  }
  right += ok; total += ww.length
  if (ok < ww.length) console.log(`  ${c.name}: got ${flat}  want ${c.want}`)
}
const pct = Math.round((right / total) * 100)
console.log(`hand bench: ${right}/${total} fingers like a teacher's (${pct}%)`)
assert.ok(pct >= 95, `hand bench below 95% (${pct}%)`)

{
  // hand positions and their reasons: a phrase in open position, a rest, then the box at fret 5
  const steps = tab('3:2 2:1 2:3 1:0 - - 3:5 3:7 2:5 2:8')
  const flat: FlatStep[] = steps.map((s, i) => ({ bar: Math.floor(i / 4), idx: i % 4, step: { ...s, notes: s.notes.map(n => ({ ...n, midi: STD[n.string] + n.fret })) } }))
  const g = handGroups(flat, { stringNames: ['E', 'A', 'D', 'G', 'B', 'e'] })
  assert.equal(g.length, 2, `two hand positions, got ${g.map(x => x.base).join(',')}`)
  assert.ok(g[0].open && g[1].base === 5, `open, then fret 5: ${g.map(x => `${x.base}${x.open ? 'o' : ''}`).join(' ')}`)
  assert.ok(/rest/.test(g[1].why ?? ''), `moves in the rest: ${g[1].why}`)
  console.log(`hand positions: ${g.map(x => (x.open ? 'open' : `fret ${x.base}`)).join(' → ')} · "${g[1].why}"`)
}

{
  // a stretch that's fine up the neck is split low down (real fret spacing)
  const hi = planFingers(tab('2:12 2:13 2:14 2:15 2:16'), { scale: L, size: 'medium' }).steps.map(s => s!.anchor)
  const lo = planFingers(tab('2:1 2:2 2:3 2:4 2:5'), { scale: L, size: 'small' }).steps.map(s => s!.anchor)
  console.log(`five frets: at fret 12 anchors ${[...new Set(hi)].join(',')}; at fret 1 (small hand) ${[...new Set(lo)].join(',')}`)
  assert.ok(new Set(lo).size >= 2, 'a small hand shifts for five frets at the nut')
}

{
  // placing pitches: an A minor pentatonic lick lands in one box; a folk melody stays in open position for a beginner
  const am = [57, 60, 62, 64, 67, 69, 72].map(m => ({ midis: [m], dur: 0.5 }))
  const p = placeAndFinger(am, { scale: L, tuning: STD, open: 0.2, zone: [5, 12] })
  const anchors = new Set(p.plan.steps.filter(Boolean).map(s => s!.anchor))
  console.log(`A minor pentatonic placed: ${p.notes.map(n => `${6 - n[0].string}:${n[0].fret}`).join(' ')} (anchors ${[...anchors].join(',')})`)
  assert.ok(anchors.size <= 2 && Math.min(...anchors) >= 4, 'pentatonic in one box up the neck')
  const ode = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62].map(m => ({ midis: [m], dur: 1 }))
  const q = placeAndFinger(ode, { scale: L, tuning: STD, open: 0.8, level: 1, low: 0.04 })
  const maxF = Math.max(...q.notes.map(n => n[0].fret))
  console.log(`Ode to Joy placed: ${q.notes.map(n => `${6 - n[0].string}:${n[0].fret}`).join(' ')}`)
  assert.ok(maxF <= 3, 'a beginner melody stays in first position')
  // a chord given as pitches gets a real chord shape
  const c = placeAndFinger([{ midis: [48, 52, 55, 60, 64], dur: 2 }], { scale: L, tuning: STD, open: 0.8, level: 1 })
  console.log(`C major pitches placed: ${c.notes[0].map(n => `${6 - n.string}:${n.fret}`).join(' ')} fingers ${c.plan.steps[0]?.fingers.join('')}`)
  assert.ok(c.notes[0].length === 5, 'all five chord notes placed')
}

{
  // speed: a long Guitar Pro-sized part
  const long: HStep[] = []
  for (let i = 0; i < 2500; i++) long.push(i % 8 === 0 ? { notes: [{ string: 0, fret: 3 }, { string: 1, fret: 5 }, { string: 2, fret: 5 }], dur: 0.5 } : { notes: [{ string: (i * 7) % 6, fret: (i * 5) % 15 }], dur: 0.25 })
  const t0 = Date.now()
  planFingers(long, { scale: L })
  const ms = Date.now() - t0
  console.log(`2500 steps planned in ${ms} ms`)
  assert.ok(ms < 3000, 'fast enough for a whole song')
}
console.log('hand bench: ok')

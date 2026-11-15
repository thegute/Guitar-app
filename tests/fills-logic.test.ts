// Fills between chords: shells, free notes, walks into the next chord and the workshop's nine step tabs, in every key.
import './test-env'
import { strict as assert } from 'node:assert'
import { shellsFor, shellPath, freeNotes, triadOf } from '../src/fills/shells'
import { workshop, walkTo, fillStepOf, FILL_LEARN, melodicPart, connectedPart } from '../src/fills/make'
import { courseLesson } from '../src/course'

// shells: three notes of the triad on G B e, within four frets
for (const c of ['G', 'Em', 'C', 'D', 'Bb', 'F#m', 'Ab']) {
  const t = triadOf(c)!
  const ss = shellsFor(c)
  assert.ok(ss.length >= 3, `${c}: at least three shapes`)
  for (const s of ss) {
    assert.deepEqual(new Set(s.notes.map(n => n.midi % 12)), new Set(t.pcs), `${c} shell is the triad`)
    const fr = s.notes.map(n => n.fret).filter(f => f > 0)
    assert.ok(!fr.length || Math.max(...fr) - Math.min(...fr) <= 3)
  }
}
const p = shellPath(['G', 'Em', 'C', 'D'])
assert.deepEqual(p.map(s => s.notes.map(n => n.fret).join('')), ['433', '453', '553', '232'], 'the G–Em–C–D shells sit together at frets 2–5')
const fr = freeNotes(p[0])
assert.ok(fr.some(f => f.role === '9' && f.to.role === '3' && f.move === 'hammer'), 'G: the sus2 hammer into the 3rd')
assert.ok(fr.some(f => f.role === '4' && f.to.role === '3' && f.move === 'pull'), 'G: the sus4 pull-off into the 3rd')
// a walk ends a scale step from the landing note and never passes through it
for (let i = 0; i < 4; i++) {
  const a = p[i], b = p[(i + 1) % 4]
  for (const n of [2, 3]) {
    const w = walkTo(a.notes[2], b.notes[2], n, 7, false)
    const STD = [40, 45, 50, 55, 59, 64]
    const m = w.map(x => STD[x.string] + x.fret)
    assert.equal(m.length, n)
    assert.ok(Math.abs(m[m.length - 1] - b.notes[2].midi) <= 2 && m[m.length - 1] !== b.notes[2].midi, `approach is a step away (${m} → ${b.notes[2].midi})`)
    assert.ok(!m.includes(b.notes[2].midi), 'never on the landing note early')
    assert.equal(new Set(m).size, n, 'no repeated notes')
  }
}
// every key and progression: nine steps, full bars, playable frets, chord names on bar starts, the band behind it
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const PROGS: [number, boolean][][] = [[[0, false], [9, true], [5, false], [7, false]], [[0, false], [0, false], [5, false], [5, false]], [[9, true], [5, false], [0, false], [7, false]], [[0, false], [4, true], [5, false], [7, false]]]
let checked = 0
for (let k = 0; k < 12; k++) for (const pr of PROGS) {
  const chords = pr.map(([s, m]) => NAMES[(k + s) % 12] + (m ? 'm' : ''))
  for (const style of ['mayer', 'asato'] as const) {
  const ws = workshop({ chords, key: NAMES[k], bpm: 70, style })
  assert.equal(ws.steps.length, 9, chords.join(' '))
  for (const st of ws.steps) {
    const bars = st.song.tracks[0].bars
    assert.equal(bars.length, 8)
    assert.ok(st.song.backing)
    bars.forEach((b, i) => {
      assert.ok(Math.abs(b.steps.reduce((a, x) => a + x.dur, 0) - 4) < 1e-6, `${st.id} bar ${i} is 4 beats`)
      assert.equal(b.steps[0].chord, chords[i % 4], `${st.id} bar ${i} names its chord`)
      for (const x of b.steps) for (const n of x.notes) { assert.ok(n.fret >= 0 && n.fret <= 19, `${st.id} fret ${n.fret}`); assert.ok(n.string >= 3) }
    })
    checked++
    assert.ok(FILL_LEARN[st.id], `${style}: ${st.id} has its idea`)
  }
  }
}
// the ideas and their links
for (const [id, l] of Object.entries(FILL_LEARN)) { assert.ok(l.idea.length > 120, id); for (const ls of l.lessons) assert.ok(courseLesson(ls), `${id}: lesson ${ls}`) }
assert.equal(fillStepOf('fills:mayer:G:G-Em-C-D:sixths')?.id, 'sixths'); assert.equal(fillStepOf('ex-ode'), null)
// longer melodies: 4, 6, 8 bars in every key, full bars, end on the home chord, no note played twice in a row, close to the hand
let mel = 0
for (let k = 0; k < 12; k++) for (const pr of PROGS) for (const bars of [4, 6, 8] as const) for (const seed of [1, 2, 3, 4]) {
  const chords = pr.map(([s, m]) => NAMES[(k + s) % 12] + (m ? 'm' : ''))
  const song = melodicPart({ chords, key: NAMES[k], bpm: 70, style: seed % 2 ? 'asato' : 'mayer' }, bars, seed)!
  const bs = song.tracks[0].bars
  assert.equal(bs.length, bars)
  bs.forEach((b, i) => {
    assert.ok(Math.abs(b.steps.reduce((a, x) => a + x.dur, 0) - 4) < 1e-6, 'full bar')
    const single = b.steps.filter(x => x.notes.length === 1).map(x => x.notes[0].midi)
    for (let j = 1; j < single.length; j++) assert.notEqual(single[j], single[j - 1], `${chords} ${bars} seed ${seed} bar ${i}: repeated note`)
    const shellFrets = b.steps[0].notes.map(n => n.fret)
    for (const x of b.steps) for (const n of x.notes) assert.ok(Math.abs(n.fret - Math.max(...shellFrets)) <= 6, `bar ${i}: fret ${n.fret} far from the shape`)
  })
  assert.equal(bs[bars - 1].steps[0].chord, NAMES[k], 'ends on the home chord')
  mel++
}
// connected parts (Asato): never a full strum before the last bar, starts on a two-note hint, full bars, ends home
for (let k = 0; k < 12; k++) for (const pr of PROGS) for (const bars of [4, 6, 8]) for (const seed of [1, 2, 3]) {
  const chords = pr.map(([s, m]) => NAMES[(k + s) % 12] + (m ? 'm' : ''))
  const bs = connectedPart({ chords, key: NAMES[k], bpm: 70, style: 'asato' }, bars, seed)!.tracks[0].bars
  assert.equal(bs.length, bars)
  bs.forEach((b, i) => {
    assert.ok(Math.abs(b.steps.reduce((a, x) => a + x.dur, 0) - 4) < 1e-6, 'full bar')
    if (i < bars - 1) { assert.ok(b.steps.every(x => x.notes.length <= 2), 'no full chords'); assert.equal(b.steps[0].notes.length, 2, 'a two-note hint on 1') }
    for (const x of b.steps) for (const n of x.notes) assert.ok(n.fret >= 0 && n.fret <= 19)
  })
  assert.equal(bs[bars - 1].steps[0].chord, NAMES[k])
  mel++
}
assert.equal(fillStepOf('fills:mayer:G:G-Em-C-D:melody-4-7')?.id, 'melody')
console.log(`fills: ok (${checked} step tabs in 12 keys, ${mel} melodies)`)

// metal: chug riffs with lead fills, every key and progression
import { metalWorkshop, metalRiff, METAL_KEYS, METAL_PROGS } from '../src/fills/metal'
{
  let n = 0
  for (const key of METAL_KEYS) for (const p of METAL_PROGS) {
    const w = metalWorkshop({ key, prog: p.chords, bpm: 110 })
    assert.equal(w.steps.length, 10)
    for (const st of w.steps) {
      assert.ok(FILL_LEARN[st.id], `metal ${st.id} has its idea`)
      assert.equal(st.song.tracks[0].program, 30)
      for (const b of st.song.tracks[0].bars) {
        assert.ok(Math.abs(b.steps.reduce((a, x) => a + x.dur, 0) - 4) < 1e-6, `${key} ${st.id} full bar`)
        for (const x of b.steps) for (const nn of x.notes) assert.ok(nn.fret >= 0 && nn.fret <= 17, `${key} ${st.id} fret ${nn.fret}`)
      }
      n++
    }
    for (const bars of [4, 6, 8]) for (const seed of [1, 2, 3]) {
      const r = metalRiff({ key, prog: p.chords, bpm: 110 }, bars, seed)
      assert.equal(r.tracks[0].bars.length, bars)
      for (const b of r.tracks[0].bars) assert.ok(Math.abs(b.steps.reduce((a, x) => a + x.dur, 0) - 4) < 1e-6)
    }
  }
  assert.equal(fillStepOf('fills:metal:E:i-vi-vii:m-gallop')?.id, 'm-gallop'); assert.equal(fillStepOf('fills:metal:E:i-vi-vii:riff-4-2')?.id, 'riff')
  console.log(`metal: ok (${n} step tabs)`)
}

// the workshop you're on: next step, the Practice button, the coach's fill advice
import { saveCurrentFills, nextFills } from '../src/fills/current'
import { recordRun } from '../src/play/songStats'
import { fillAdvice } from '../src/coach/advice'
import { flatten } from '../src/tabs/model'
import { findTrouble } from '../src/coach/trouble'
import { handGroups } from '../src/play/handShape'
{
  localStorage.removeItem('kg:fills:current')
  assert.equal(nextFills(), null)
  const ws = workshop({ chords: ['G', 'Em', 'C', 'D'], key: 'G', bpm: 70, style: 'mayer' })
  const steps = ws.steps.map(s => ({ id: s.id, title: s.title, docId: `fills:mayer:G:G-Em-C-D:${s.id}` }))
  saveCurrentFills({ style: 'mayer', label: 'John Mayer soul fills over G Em C D', steps })
  let nf = nextFills()!
  assert.equal(nf.started, false); assert.deepEqual(nf.target, { go: { tool: 'fills' } })
  recordRun(steps[0].docId, { title: 's', inst: 'guitar' }, { score: 95, mode: 'wait', speed: 1, full: true }, { miss: {}, hit: {} })
  recordRun(steps[1].docId, { title: 's', inst: 'guitar' }, { score: 60, mode: 'wait', speed: 1, full: true }, { miss: {}, hit: {} })
  nf = nextFills()!
  assert.ok(nf.started); assert.match(nf.title, /Know the notes/); assert.match(nf.why, /60%/)
  assert.deepEqual(nf.target, { go: { song: steps[1].docId, loop: null } })
  // the coach: a late landing after a fill, and trouble inside a fill
  const two = ws.steps.find(s => s.id === 'two')!.song
  const flat = flatten(two.tracks[0])
  const groups = handGroups(flat, two.tracks[0].tuning)
  const states = new Uint8Array(flat.length).fill(1)
  // bar 2's chord (after bar 1's fill) late, and the fill before it too
  const b2 = flat.findIndex(f => f.bar === 1 && f.step.chord)
  states[b2] = 2; states[b2 - 1] = 2; states[b2 - 2] = 2
  const t = findTrouble({ states, flat, groups, mode: 'wait' })!
  const adv = fillAdvice(t, flat, 'wait', 1)
  assert.ok(adv, 'fill advice'); assert.match(adv!.fix, /fill/)
  console.log('fills current + coach: ok')
}

// bluegrass, Chet Atkins, Plini, Matteo Mancuso
import { style2Workshop, style2Part, STYLE2 } from '../src/fills/styles2'
{
  let n = 0
  for (const style of ['bluegrass', 'atkins', 'plini', 'mancuso'] as const) for (const key of STYLE2[style].keys) for (const p of STYLE2[style].progs) {
    const w = style2Workshop({ style, key, prog: p.chords, bpm: 90 })
    assert.ok(w.steps.length >= 6, `${style} steps`)
    for (const st of w.steps) {
      assert.ok(FILL_LEARN[st.id], `${style}: ${st.id} has its idea`)
      st.song.tracks[0].bars.forEach((b, i) => {
        assert.ok(Math.abs(b.steps.reduce((a, x) => a + x.dur, 0) - 4) < 1e-6, `${style} ${key} ${st.id} bar ${i} full`)
        assert.ok(b.steps[0].chord, `${style} ${st.id} bar ${i} names its chord`)
        for (const x of b.steps) for (const nn of x.notes) assert.ok(nn.fret >= 0 && nn.fret <= 19 && nn.string >= 0 && nn.string <= 5, `${style} ${key} ${st.id} ${nn.string}:${nn.fret}`)
      })
      n++
    }
    for (const bars of [4, 6, 8]) assert.equal(style2Part({ style, key, prog: p.chords, bpm: 90 }, bars, 3).tracks[0].bars.length, bars)
  }
  console.log(`four more styles: ok (${n} step tabs)`)
}

// Fills between chords: shells, free notes, walks into the next chord and the workshop's nine step tabs, in every key.
import './test-env'
import { strict as assert } from 'node:assert'
import { shellsFor, shellPath, freeNotes, triadOf } from '../src/fills/shells'
import { workshop, walkTo, fillStepOf, FILL_LEARN, melodicPart } from '../src/fills/make'
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
  const ws = workshop({ chords, key: NAMES[k], bpm: 70, style: 'mayer' })
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
  }
}
// the ideas and their links
for (const [id, l] of Object.entries(FILL_LEARN)) { assert.ok(l.idea.length > 120, id); for (const ls of l.lessons) assert.ok(courseLesson(ls), `${id}: lesson ${ls}`) }
assert.equal(fillStepOf('fills:mayer:G:G-Em-C-D:sixths')?.id, 'sixths'); assert.equal(fillStepOf('ex-ode'), null)
// longer melodies: 4, 6, 8 bars in every key, full bars, end on the home chord, no note played twice in a row, close to the hand
let mel = 0
for (let k = 0; k < 12; k++) for (const pr of PROGS) for (const bars of [4, 6, 8] as const) for (const seed of [1, 2, 3, 4]) {
  const chords = pr.map(([s, m]) => NAMES[(k + s) % 12] + (m ? 'm' : ''))
  const song = melodicPart({ chords, key: NAMES[k], bpm: 70, style: 'mayer' }, bars, seed)!
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
assert.equal(fillStepOf('fills:mayer:G:G-Em-C-D:melody-4-7')?.id, 'melody')
console.log(`fills: ok (${checked} step tabs in 12 keys, ${mel} melodies)`)

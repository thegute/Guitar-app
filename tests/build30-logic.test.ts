import './test-env'
import { strict as assert } from 'node:assert'
import { countUse, usageRows, untouched, clearUsage, KNOWN } from '../src/usage'

clearUsage()
countUse('screen:play'); countUse('screen:play'); countUse('tool:tuner'); countUse('btn:play:Hear it')
const rows = usageRows()
assert.equal(rows[0].id, 'screen:play'); assert.equal(rows[0].n, 2); assert.equal(rows[0].label, 'Play')
assert.ok(rows.find(r => r.id === 'btn:play:Hear it')?.label.includes('Hear it'))
const cold = untouched(30).map(r => r.id)
assert.ok(!cold.includes('screen:play') && cold.includes('screen:songs'))
assert.equal(untouched(30).length, Object.keys(KNOWN).length - 2)
console.log('usage: ok')

// ---- Practice button planner
import { practicePlan, spread } from '../src/sessions/practice'
import { recordRun } from '../src/play/songStats'
import { current } from '../src/instrument'
{
  for (const total of [10, 20, 30]) for (const ks of [['warm', 'song'], ['warm', 'plan', 'fix', 'song'], ['warm', 'fix', 'song']] as const) {
    const m = spread([...ks], total)
    assert.equal(m.reduce((a, b) => a + b, 0), total, `spread ${ks} ${total}`)
    assert.ok(m.every(x => x >= 2))
  }
  const inst = current()
  // nothing known yet: warm-up and a songbook pick
  let p = await practicePlan(inst, 20)
  assert.deepEqual(p.parts.map(x => x.kind), ['warm', 'song'])
  assert.ok(/songbook/i.test(p.parts[1].title))
  assert.equal(p.session.steps.reduce((a, s) => a + s.minutes, 0), 20)
  // a song played lately with bars 4–5 going wrong, and the Zero to Hero plan set up
  const now = Date.now()
  for (let i = 0; i < 3; i++) recordRun('song-a', { title: 'Song A', inst: 'guitar' }, { score: 60, mode: 'wait', speed: 1, full: true }, { miss: { 4: 3, 5: 2 }, hit: { 1: 5, 2: 5, 4: 1 } }, now - 3600e3)
  localStorage.setItem('kg:z2h', JSON.stringify({ phase: 1, since: now - 8 * 864e5, placed: true, ticks: [] }))
  p = await practicePlan(inst, 20, now)
  assert.deepEqual(p.parts.map(x => x.kind), ['warm', 'plan', 'fix', 'song'])
  const fix = p.session.steps[2].target as { go: { song: string; loop: { from: number; to: number }; speed: number } }
  assert.equal(fix.go.song, 'song-a'); assert.deepEqual(fix.go.loop, { from: 4, to: 5 }); assert.equal(fix.go.speed, 0.7)
  assert.ok(/bars 5–6 of Song A/.test(p.parts[2].title), p.parts[2].title)
  // 10 minutes leaves the plan step out
  p = await practicePlan(inst, 10, now)
  assert.ok(!p.parts.some(x => x.kind === 'plan'))
  assert.equal(p.session.steps.reduce((a, s) => a + s.minutes, 0), 10)
  // a learned song due for review comes first in the song slot
  for (let i = 0; i < 2; i++) recordRun('song-b', { title: 'Song B', inst: 'guitar' }, { score: 95, mode: 'time', speed: 1, full: true }, { miss: {}, hit: { 0: 9 } }, now - 10 * 864e5)
  p = await practicePlan(inst, 20, now)
  const song = p.parts.find(x => x.kind === 'song')!
  assert.ok(/Song B/.test(song.title), song.title)
  assert.equal((p.session.steps.at(-1)!.target as { go: { loop: null } }).go.loop, null)
  console.log('practice plan: ok')
}

// ---- report card
import { barMistakes, makeReport } from '../src/play/report'
{
  // bars 0..3, 4 notes each; bar 2 has 3 mistakes, bar 3 one
  const states = [1,1,1,1, 1,1,1,1, 2,3,2,1, 2,1,1,1]
  const m = barMistakes(states, i => Math.floor(i / 4), 'wait')
  assert.equal(m.get(2), 3); assert.equal(m.get(3), 1)
  let r = makeReport({ score: 75, mode: 'wait', speed: 1, mistakes: m, before: [{ at: 0, score: 60, mode: 'wait', speed: 1, full: true }], best: 80 })
  assert.deepEqual(r.bars, [2, 3]); assert.deepEqual(r.loop, { from: 2, to: 3 }); assert.equal(r.next.kind, 'loop'); assert.equal(r.prev, 60)
  assert.equal(r.next.label, 'Loop bars 3–4')
  r = makeReport({ score: 70, mode: 'time', speed: 1, mistakes: barMistakes(states, i => Math.floor(i / 4), 'time'), before: [], best: 0 })
  assert.equal(r.next.speed, 0.7); assert.ok(/at 70%/.test(r.next.label)); assert.equal(r.prev, undefined)
  // early/late count half in time mode: bar 3's single early note isn't a trouble bar
  assert.deepEqual(r.bars, [2])
  r = makeReport({ score: 92, mode: 'wait', speed: 1, mistakes: new Map([[1, 1]]), before: [], best: 0 })
  assert.equal(r.next.kind, 'intime')
  r = makeReport({ score: 95, mode: 'time', speed: 0.75, mistakes: new Map(), before: [], best: 0 })
  assert.equal(r.next.kind, 'faster'); assert.equal(r.next.speed, 0.85)
  r = makeReport({ score: 95, mode: 'time', speed: 1, mistakes: new Map(), before: [], best: 0 })
  assert.equal(r.next.kind, 'learned')
  console.log('report card: ok')
}

// ---- I played it right
import { teachNote, teachChord, taughtAlias, chordEase, taughtCount, forgetTaught, meantNote } from '../src/play/taught'
import { chordMatch } from '../src/audio/chroma'
{
  assert.equal(meantNote([64, 67], 68), 67)
  assert.equal(taughtAlias('mic', [64], 65), null)
  teachNote('mic', 64, 65)
  assert.equal(taughtAlias('mic', [64], 65), 64)
  assert.equal(taughtAlias('usb', [64], 65), null, 'the amp has its own')
  assert.equal(taughtAlias('mic', [60], 65), null, 'only where that note is wanted')
  // a weak 3rd: normally rejected, accepted once corrected a few times
  const chroma = new Array(12).fill(0); chroma[0] = 0.5; chroma[4] = 0.06; chroma[7] = 0.4; chroma[2] = 0.15
  assert.equal(chordMatch(chroma, [0, 4, 7]).ok, false)
  for (let i = 0; i < 3; i++) teachChord('mic', [60, 64, 67])
  assert.equal(chordEase('mic', [48, 52, 55]), 1)
  assert.equal(chordMatch(chroma, [0, 4, 7], 1).ok, true)
  assert.equal(taughtCount('mic'), 2)
  forgetTaught('mic'); assert.equal(taughtCount('mic'), 0)
  console.log('played it right: ok')
}

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

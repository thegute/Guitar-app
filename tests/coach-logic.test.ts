// The coach (AI teacher): bends count as right, the listener's tape, finding the trouble bar, the advice.
import './test-env'
import { strict as assert } from 'node:assert'
import { bendAlso, accepted } from '../src/tabs/bends'
import { matchNote, cutTape, type FollowStep } from '../src/tabs/follow'
import { matchTimed, timeline } from '../src/play/inTime'

// ---- bends: the fretted note, the target and everything between count; strays right after a bend aren't "wrong"
{
  assert.deepEqual(bendAlso([{ midi: 62, tech: 'b' }]), [63, 64])
  assert.deepEqual(bendAlso([{ midi: 62, tech: 'b½' }]), [63])
  assert.deepEqual(bendAlso([{ midi: 62, tech: 'b1½' }]), [63, 64, 65])
  assert.deepEqual(bendAlso([{ midi: 62, tech: 'h' }, { midi: 60 }]), [])
  const steps: FollowStep[] = [{ midis: [62], also: [63, 64] }, { midis: [60] }, { midis: [67] }]
  assert.deepEqual(accepted(steps[0]), [62, 63, 64])
  assert.equal(matchNote(steps, 0, 64).kind, 'hit', 'the bent pitch counts as the note')
  assert.equal(matchNote(steps, 1, 64).kind, 'bend', 'still bending after the hit: nothing new')
  assert.equal(matchNote(steps, 1, 71, false, 0.4).kind, 'bend', 'a stray reading right after a bend is let go')
  assert.equal(matchNote(steps, 1, 71, false, 2).kind, 'miss', 'later it is a wrong note again')
  assert.equal(matchNote(steps, 2, 71, false, 0.2).kind, 'miss', 'no bend before: a wrong note')
  const flat = [{ bar: 0, idx: 0, step: { dur: 1, notes: [{ string: 3, fret: 7, midi: 62, tech: 'b' }] } }, { bar: 0, idx: 1, step: { dur: 1, notes: [{ string: 3, fret: 5, midi: 60 }] } }]
  const tl = timeline(flat as never)
  assert.deepEqual(tl.steps[0].also, [63, 64])
  assert.ok(matchTimed(tl.steps, 0, 0.5, { midi: 64 }, new Set()), 'in time: the bent pitch is the note')
  console.log('bends: ok')
}
// ---- the listener's tape: the last stretch of what was played, by audio-clock time
{
  const sr = 1000, tape = new Float32Array(5 * sr)
  let taped = 0
  const push = (n: number) => { for (let i = 0; i < n; i++) { tape[taped % tape.length] = taped; taped++ } }
  push(3000)
  const a = cutTape(tape, taped, sr, 10, 11, 12)!
  assert.equal(a.x.length, 1000); assert.equal(a.x[0], 1000); assert.equal(a.x[999], 1999)
  push(6000) // 9 s in all: the first 4 s are gone
  const b = cutTape(tape, taped, sr, 10, 12, 16)!
  assert.equal(b.x[0], 4000, 'clamped to what the tape still holds'); assert.equal(b.x[b.x.length - 1], 5999)
  assert.equal(cutTape(tape, taped, sr, 10, 11, 12), null, 'too long ago')
  assert.equal(cutTape(tape, taped, sr, 10, 30, 31), null, 'not played yet')
  console.log('listener tape: ok')
}

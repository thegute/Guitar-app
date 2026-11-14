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

// ---- finding the trouble bar and the built-in coach's advice
import { barFacts, findTrouble, MissStreak } from '../src/coach/trouble'
import { ruleAdvice, stringName, forVoice } from '../src/coach/advice'
import { coachPrompt, parseCoach } from '../src/coach/listen'
import { handGroups } from '../src/play/handShape'
{
  const T = [40, 45, 50, 55, 59, 64]
  const n = (string: number, fret: number, tech?: string) => ({ string, fret, midi: T[string] + fret, ...(tech ? { tech } : {}) })
  // bar 1: open position; bar 2: up at fret 7 (a shift); bar 3: back, with a string jump
  const bars = [
    [n(4, 1), n(4, 3), n(3, 2), n(3, 0)],
    [n(4, 8), n(4, 10), n(3, 7), n(3, 9)],
    [n(4, 1), n(1, 3), n(4, 1), n(1, 3)],
  ]
  const flat = bars.flatMap((b, bi) => b.map((x, si) => ({ bar: bi, idx: si, step: { dur: 1, notes: [x] } })))
  const groups = handGroups(flat as never)
  assert.ok(groups.length >= 2, 'the hand moves at least once')
  // wait mode: bar 2's first two notes missed
  const states = [1, 1, 1, 1, 2, 3, 1, 1, 1, 1, 1, 1]
  const facts = barFacts({ states, flat: flat as never, groups, mode: 'wait' })
  assert.deepEqual(facts.map(b => b.pct), [100, 50, 100])
  const t = findTrouble({ states, flat: flat as never, groups, mode: 'wait' })!
  assert.equal(t.bar, 1); assert.equal(t.kind, 'shift'); assert.equal(t.spot.fret, 8)
  assert.deepEqual(t.loop, { from: 0, to: 1 }, 'the loop takes in the bar the hand comes from')
  assert.ok(t.shift && t.shift.to > t.shift.from)
  const adv = ruleAdvice(t, { tuning: T, mode: 'wait', speed: 1 })
  assert.match(adv.fix, /Bar 2/); assert.match(adv.fix, /fret 8/); assert.match(adv.fix, /B string/)
  assert.equal(adv.primary, 'shift'); assert.ok(!/[%*#]/.test(adv.spoken), 'spoken words have no symbols')
  assert.ok(adv.spoken.split(/[.!?]/).filter(x => x.trim()).length <= 5)
  // a string jump
  const t2 = findTrouble({ states: [1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1, 2], flat: flat as never, groups, mode: 'wait' })!
  assert.equal(t2.bar, 2); assert.equal(t2.kind, 'jump'); assert.match(ruleAdvice(t2, { tuning: T, mode: 'wait', speed: 1 }).fix, /A string/)
  // in time: all there but early → rushing
  const errOf = new Map([[0, -70], [1, -80], [2, -65], [3, -75]])
  const t3 = findTrouble({ states: [2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1], flat: flat as never, groups, mode: 'time', errOf })!
  assert.equal(t3.kind, 'rush'); assert.equal(t3.facts.early, 4); assert.equal(t3.pct, 50)
  assert.deepEqual(t3.good, { from: 1, to: 2 })
  assert.match(ruleAdvice(t3, { tuning: T, mode: 'time', speed: 1 }).spoken, /Bars 2 to 3 were clean/)
  // a clean pass: no trouble
  assert.equal(findTrouble({ states: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], flat: flat as never, groups, mode: 'wait' }), null)
  // names and voice text
  assert.equal(stringName(T, 0), 'low E'); assert.equal(stringName(T, 5), 'high E'); assert.equal(stringName(T, 2), 'D')
  assert.equal(stringName([38, 43, 50, 55, 59, 62], 2), 'middle D')
  assert.equal(forVoice('Loop **bars 2–3** at 70%'), 'Loop bars 2 to 3 at 70 percent')
  // the AI coach: the prompt carries the tab and the numbers; its answer is read, a bad one refused
  const ctx = { title: 'Test tune', inst: 'guitar', tuning: T, mode: 'wait' as const, speed: 1, flat: flat as never, groups }
  const prompt = coachPrompt(t, ctx, adv)
  assert.match(prompt, /bar 2: B string fret 8/); assert.match(prompt, /2 of 4 notes right first time/)
  const ai = parseCoach('```json\n{"good":"Bar 1 was steady.","fix":"Bar 2: land your index on the B string, fret 8, before the beat.","drill":"Loop bars 1–2 slowly.","heard":"The G string buzzes at fret 7.","spoken":"Bar one was steady. In bar two, get your index finger to fret eight a little sooner."}\n```', adv)!
  assert.equal(ai.from, 'ai'); assert.match(ai.heard!, /buzz/); assert.equal(ai.kind, 'shift')
  assert.equal(parseCoach('Sure! Here is my advice: slow down.', adv), null)
  assert.equal(parseCoach('{"good":"x"}', adv), null)
  // three misses in a row on one bar
  const ms = new MissStreak(3)
  assert.equal(ms.miss(4), false); assert.equal(ms.miss(4), false); assert.equal(ms.miss(4), true); assert.equal(ms.stuck, 4)
  ms.clear(4); assert.equal(ms.stuck, -1)
  assert.equal(ms.miss(1), false); assert.equal(ms.miss(2), false); assert.equal(ms.miss(2), false); assert.equal(ms.miss(2), true)
  console.log('trouble bar + advice: ok')
}

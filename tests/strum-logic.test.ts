// The strum engine (Stage 3): timing, order, velocity shape, humanising.
import { strict as assert } from 'node:assert'
import { strumNotes, strumSpeed } from '../src/engine/strumLogic'
let n = 0
const ok = (c: unknown, m: string) => { n++; assert.ok(c, m) }
let seed = 1
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
const G = [43, 47, 50, 55, 59, 67]
const exact = strumNotes(G, { vel: 90, human: 0 })
ok(exact[0].midi === 43 && exact[0].offset === 0, 'a downstroke starts on the lowest string, exactly on time')
ok(exact.map(x => x.midi).join() === G.join(), 'down: low to high')
ok(exact.map(x => x.string).join() === '0,1,2,3,4,5', 'six notes sit on strings 0–5')
const D = strumSpeed(90)
ok(Math.abs(exact[5].offset - D) < 1e-9, `the pick crosses all six in the strum time (${(D * 1000).toFixed(0)} ms)`)
const gaps = exact.slice(1).map((x, i) => x.offset - exact[i].offset)
ok(gaps[0] > gaps[4], 'the wrist accelerates: later gaps are shorter')
ok(exact[0].vel > exact[5].vel && exact[5].vel >= Math.round(90 * 0.78) - 1, 'first string loudest, last ~78%')
const up = strumNotes(G.slice(-4), { up: true, vel: 90, human: 0 })
ok(up[0].midi === 67 && up[0].string === 5, 'an upstroke starts on the high string')
ok(strumSpeed(120) < strumSpeed(60), 'harder strums are faster')
ok(strumNotes([45, 52, 57, 60, 64], { human: 0 })[0].string === 1, 'a five-string chord starts on the A string')
// humanising: different every time, but never early and never wild
const runs = Array.from({ length: 200 }, () => strumNotes(G, { vel: 90, rnd }))
ok(new Set(runs.map(r => r[5].offset.toFixed(4))).size > 50, 'no two strums the same')
ok(runs.every(r => r[0].offset === 0 && r.every(x => x.offset >= 0 && x.offset < 0.07)), 'first string on the beat, all within 70 ms')
ok(runs.every(r => r.every((x, i) => i === 0 || x.offset >= r[i - 1].offset)), 'strings in order')
const missed = runs.filter(r => r[5].vel < 50).length
ok(missed > 5 && missed < 60, `the far string is now and then barely caught (${missed}/200)`)
ok(strumNotes(G, { speed: 0.006 * 5, human: 0 })[5].offset < 0.031, 'an explicit speed (a fast chuck) is kept')
console.log(`strum logic: ${n} checks, 0 failed`)

// Beat maker sampling extras: banks, mic effect "Synth" (pitch following), the pitch finder, loop tempo matching.
import './test-env'
import { strict as assert } from 'node:assert'
import { BANKS, USER_PADS, padName } from '../src/studio/pads'
import { applyMicFx, framePitch } from '../src/studio/micFx'
import { matchTempo } from '../src/studio/loops'

let checks = 0
const ok = (c: boolean, m: string) => { checks++; assert.ok(c, m) }
const SR = 44100

ok(USER_PADS.length === 32 && BANKS.A.length === 16 && BANKS.B.length === 16 && BANKS.B[0] === 'u17', 'two banks of 16 pads')
ok(padName('u3') === 'A 3' && padName('u20') === 'B 4', 'pads named by bank')

// the pitch finder
for (const f of [98, 220, 440, 659]) {
  const x = new Float32Array(4096)
  for (let i = 0; i < x.length; i++) x[i] = Math.sin(2 * Math.PI * f * i / SR) + 0.5 * Math.sin(4 * Math.PI * f * i / SR) + 0.3 * Math.sin(6 * Math.PI * f * i / SR)
  const p = framePitch(x, 0, 2048, SR)
  ok(Math.abs(1200 * Math.log2(p / f)) < 30, `pitch of ${f} Hz: ${p.toFixed(1)}`)
}
let seed = 9
const noise = new Float32Array(4096).map(() => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5 })
ok(framePitch(noise, 0, 2048, SR) === 0, 'noise has no pitch')

// Synth: a sung-like line (220 → 330 Hz) comes out as a synth line on the same notes
await (async () => {
  const x = new Float32Array(SR * 2)
  for (let i = 0; i < x.length; i++) { const f = i < SR ? 220 : 330; x[i] = 0.4 * (Math.sin(2 * Math.PI * f * i / SR) + 0.6 * Math.sin(4 * Math.PI * f * i / SR)) }
  const y = await applyMicFx(x, SR, 'synth')
  ok(y.length === x.length, 'Synth keeps the length')
  const p1 = framePitch(y, Math.round(SR * 0.5), 2048, SR), p2 = framePitch(y, Math.round(SR * 1.5), 2048, SR)
  ok(Math.abs(1200 * Math.log2(p1 / 220)) < 40 && Math.abs(1200 * Math.log2(p2 / 330)) < 40, `Synth follows the notes: ${p1.toFixed(0)} then ${p2.toFixed(0)} Hz`)
  let peak = 0
  for (const v of y) peak = Math.max(peak, Math.abs(v))
  ok(peak > 0.05, 'Synth is heard')
})()

// loop tempo: a 2-bar loop at 96 BPM stretched to a 90 BPM beat
{
  const bpm = 96, beats = 8, len = Math.round(beats * 60 / bpm * SR)
  const x = new Float32Array(len)
  for (let b = 0; b < beats * 2; b++) { const a = Math.round(b * 30 / bpm * SR); for (let i = 0; i < 2000 && a + i < len; i++) x[a + i] += Math.sin(i * 0.3) * Math.exp(-i / 300) * (b % 4 === 0 ? 1 : 0.5) }
  const m = matchTempo(x, SR, 90)
  ok(!!m && Math.abs(m.srcBpm - 96) < 1 && m.beats === 8, `the loop's own tempo: ${m?.srcBpm} BPM, ${m?.beats} beats`)
  ok(!!m?.samples && Math.abs(m.samples.length - Math.round(8 * 60 / 90 * SR)) < 2, 'stretched to 8 beats at 90')
  const far = matchTempo(x, SR, 60)
  ok(!!far && !far.samples, 'too far (60 vs 96) is not stretched')
}
console.log(`sampler extras: ${checks} checks, 0 failed`)

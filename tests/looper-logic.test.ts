// The 4-track looper's maths: cycle phase, arming on the bar line (with a grace for a late press), Auto length,
// overdub folding, the seam crossfade, ducking, the first free loop setting the tempo, lengths on offer.
import { armBar, autoLength, duckCurve, equalSlices, foldTake, lengths, mixTakes, nextCycleBar, peaks, phaseBars, smoothSeam, tempoFromLoop } from '../src/looper/logic'

let checks = 0, failed = 0
const ok = (c: boolean, m: string) => { checks++; if (!c) { failed++; console.log('  FAIL', m) } }
const near = (a: number, b: number, e = 1e-9) => Math.abs(a - b) <= e

// phase in a track's own cycle
ok(near(phaseBars(5, 1, 4), 0), 'bar 5 of a 4-bar loop that started on bar 1 is its start')
ok(near(phaseBars(6.5, 1, 4), 1.5), 'one and a half bars in')
ok(near(phaseBars(-1, 0, 4), 3), 'before the start wraps round')
ok(near(nextCycleBar(6.5, 1, 4), 9), 'next cycle starts on bar 9')
ok(near(nextCycleBar(9, 1, 4), 9), 'on a cycle start: that one')

// arming: the next bar line, or the one just gone for a late press
ok(armBar(3.5, 2) === 4, 'mid-bar → next bar')
ok(armBar(3.03, 2) === 3, '60 ms late → that bar (grace)')
ok(armBar(3.2, 2) === 4, '400 ms late → next bar')
ok(armBar(3, 2) === 3, 'exactly on the bar line → that bar')

// lengths and Auto
ok(lengths(1).join() === '1,2,4,8', `1-bar beat: ${lengths(1)}`)
ok(lengths(4).join() === '1,2,4,8,16,32', `4-bar beat: ${lengths(4)}`)
ok(autoLength(1.9, 1) === 2, 'closed a little early → 2 bars')
ok(autoLength(2.2, 1) === 2, 'closed a little late → 2 bars')
ok(autoLength(3.1, 1) === 4, '3.1 bars → 4')
ok(autoLength(14, 4) === 16, '14 bars over a 4-bar beat → 16')
ok(autoLength(0.4, 4) === 1, 'very short → 1 bar')

// overdub folding: two times round adds twice; phase lines up
{
  const len = 8
  const x = Float32Array.from({ length: 16 }, (_, i) => i + 1)
  const f = foldTake(x, len, 3)
  ok(f[3] === 1 + 9, `first sample lands at the phase it started (${f[3]})`)
  ok(f[2] === 8 + 16, `wraps round (${f[2]})`)
  const short = foldTake(Float32Array.from([1, 1]), 4, 6)
  ok(short[2] === 1 && short[3] === 1 && short[0] === 0, 'phase past the end wraps')
}
// mixing keeps peaks soft-limited
{
  const m = mixTakes([new Float32Array(4).fill(0.7), new Float32Array(4).fill(0.7)], 4)
  ok(m[0] < 1 && m[0] > 0.8, `soft limit (${m[0].toFixed(3)})`)
}
// seam: the start becomes the continuation of the end
{
  const x = new Float32Array(1000).fill(0)
  const after = new Float32Array(100).fill(1)
  const y = smoothSeam(x, after)
  ok(near(y[0], 1, 1e-6) && y[99] < 0.01 && y[500] === 0, `crossfade (${y[0].toFixed(3)}, ${y[99].toFixed(4)})`)
}
// ducking: dips while the lead plays, recovers in the gaps
{
  const sr = 1000
  const x = new Float32Array(4 * sr)
  for (let i = 0; i < sr; i++) x[i] = Math.sin(i) * 0.5
  for (let i = 2 * sr; i < 3 * sr; i++) x[i] = Math.sin(i) * 0.5
  const c = duckCurve(x, sr, 0.35, 0.02)
  ok(c[25] < 0.7, `dips while playing (${c[25].toFixed(2)})`)
  ok(c[95] > 0.9, `back up in the gap (${c[95].toFixed(2)})`)
  ok(duckCurve(new Float32Array(1000), 1000).every(v => v === 1), 'silence: no dip')
}
// the first free loop sets the tempo
{
  const a = tempoFromLoop(4, 8, 100)
  ok(a.bars === 2 && near(a.bpm, 120), `4 s with 8 beats heard → 2 bars at 120 (${JSON.stringify(a)})`)
  const b = tempoFromLoop(2.5, null, 90)
  ok(b.bars === 1 && near(b.bpm, 96), `2.5 s, no pulse, near 90 → 1 bar at 96 (${JSON.stringify(b)})`)
  const c = tempoFromLoop(9.6, 12, 100)
  ok(c.bpm >= 40 && c.bpm <= 240 && near((c.bars * 240) / c.bpm, 9.6, 1e-6), `odd beat count still fits whole bars (${JSON.stringify(c)})`)
}
// peaks and equal slices
ok(peaks(Float32Array.from([0, 0.5, -1, 0.25]), 2)[1] === 1, 'peaks are normalised')
ok(equalSlices(4, 4)[3].start === 3 && equalSlices(4, 4)[3].end === 4, 'equal slices')

console.log(`looper logic: ${checks} checks, ${failed} failed`)
if (failed) process.exit(1)

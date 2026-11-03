import './test-env'
import { strict as assert } from 'node:assert'
import { trimSilence, sliceAtOnsets, detectRoot, reversed, isPlain } from '../src/studio/pads'

const sr = 44100
/** plucked notes: decaying sines starting at the given times */
function plucks(times: number[], midis: number[], dur = 3) {
  const x = new Float32Array(Math.round(sr * dur))
  times.forEach((t, k) => {
    const f = 440 * Math.pow(2, (midis[k] - 69) / 12)
    const i0 = Math.round(t * sr)
    for (let i = i0; i < x.length; i++) { const tt = (i - i0) / sr; x[i] += 0.6 * Math.exp(-tt * 4) * Math.sin(2 * Math.PI * f * tt) }
  })
  return x
}
{
  // silence, a sound from 0.5 s to ~1.3 s, silence
  const x = plucks([0.5], [57], 2.5)
  const c = trimSilence(x, sr)
  assert.ok(c.start > 0.45 && c.start < 0.5, `start ${c.start}`)
  assert.ok(c.end > 1.0 && c.end < 2.5, `end ${c.end}`)
  assert.deepEqual(trimSilence(new Float32Array(1000), sr), { start: 0, end: 1000 / sr })
  // a riff of 5 notes is cut into 5 slices at the right places
  const t = [0.2, 0.6, 1.0, 1.35, 1.9]
  const r = plucks(t, [64, 67, 69, 67, 64])
  const s = sliceAtOnsets(r, sr)
  assert.equal(s.length, 5, JSON.stringify(s))
  s.forEach((sl, i) => assert.ok(Math.abs(sl.start + 0.01 - t[i]) < 0.03, `slice ${i} at ${sl.start}`))
  assert.equal(sliceAtOnsets(r, sr, 3).length, 3)
  // the note of a recording
  assert.equal(detectRoot(plucks([0], [57], 1), sr), 57)
  assert.equal(detectRoot(plucks([0], [64], 1), sr), 64)
  assert.equal(detectRoot(plucks([0], [45], 1), sr), 45)
  // noise has no note
  const n = new Float32Array(sr); for (let i = 0; i < n.length; i++) n[i] = Math.random() - 0.5
  assert.equal(detectRoot(n, sr), null)
  assert.deepEqual([...reversed(new Float32Array([1, 2, 3]))], [3, 2, 1])
  assert.equal(isPlain(undefined), true); assert.equal(isPlain({ src: 'kit' }), true); assert.equal(isPlain({ src: 'kit', pitch: 2 }), false); assert.equal(isPlain({ src: 'rec' }), false)
  console.log('pads: ok')
}

// ---- effects pad mapping
import { fxParams } from '../src/studio/fx'
{
  const sd = 0.125
  const f0 = fxParams('filter', 0, 0, sd) as { type: string; freq: number }, f1 = fxParams('filter', 1, 1, sd) as { type: string; freq: number; q: number }
  assert.equal(f0.type, 'lowpass'); assert.ok(f0.freq < 150); assert.equal(f1.type, 'highpass'); assert.ok(f1.freq > 5000 && f1.q > 10)
  assert.equal((fxParams('stutter', 0, 0, sd) as { slice: number }).slice, 0.5)
  assert.equal((fxParams('stutter', 1, 0, sd) as { slice: number }).slice, 0.0625)
  assert.equal((fxParams('echo', 0.5, 0, sd) as { time: number }).time, 0.375)
  assert.ok((fxParams('crush', 1, 1, sd) as { bits: number }).bits <= 2)
  console.log('effects pad: ok')
}

// ---- parts A–D and the song chain
import { STARTERS, switchPart, partsMade, playOrder, beatInPart, setBars, deletePart, curPart } from '../src/studio/beat'
{
  let b = STARTERS.find(s => s.id === 'pop')!.make()
  assert.deepEqual(partsMade(b), ['A'])
  const kicksA = b.rows.find(r => r.voice === 'kick')!.steps.join()
  b = switchPart(b, 'B')           // B starts as a copy of A
  assert.equal(curPart(b), 'B'); assert.deepEqual(partsMade(b), ['A', 'B'])
  b = { ...b, rows: b.rows.map(r => (r.voice === 'kick' ? { ...r, steps: r.steps.map(() => 0) } : r)) }   // change B
  assert.equal(beatInPart(b, 'A').rows.find(r => r.voice === 'kick')!.steps.join(), kicksA, 'A kept')
  b = switchPart(b, 'A')
  assert.equal(b.rows.find(r => r.voice === 'kick')!.steps.join(), kicksA)
  assert.ok(beatInPart(b, 'B').rows.find(r => r.voice === 'kick')!.steps.every(v => v === 0), 'B kept its change')
  // the song plays only when on, and only parts that exist
  b = { ...b, chain: ['A', 'A', 'B', 'C', 'A'] }
  assert.deepEqual(playOrder(b), ['A'])
  b = { ...b, chainOn: true }
  assert.deepEqual(playOrder(b), ['A', 'A', 'B', 'A'])
  // bars change every part
  b = setBars(b, 8)
  assert.equal(beatInPart(b, 'B').rows[0].steps.length, 128)
  b = deletePart(b, 'B')
  assert.deepEqual(partsMade(b), ['A']); assert.deepEqual(b.chain, ['A', 'A', 'C', 'A'])
  // an empty new part
  const e = switchPart(b, 'C', 'empty')
  assert.ok(e.rows.every(r => r.steps.every(v => v === 0)) && e.tracks.every(t => t.notes.length === 0))
  console.log('parts and song: ok')
}

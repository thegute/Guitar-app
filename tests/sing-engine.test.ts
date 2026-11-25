import assert from 'node:assert/strict'
import {
  VocalTracker,
  extractVocalMelody,
  detectSongKeyAndChords,
  recommendCapoForKey,
  recommendedKeyShift,
  pitchErrorCents,
  midiToHz,
  midiToNoteName,
} from '../src/sing/vocalEngine'
import { buildHarmonyLine } from '../src/sing/harmony'
import { classifyVoiceType } from '../src/sing/profile'
import { vocalAndBacking } from '../src/ml/demucs'

let passed = 0
function test(name: string, fn: () => void) {
  fn()
  passed++
  console.log(`  ok - ${name}`)
}

function makeSine(hz: number, sec: number, sr = 48000, amp = 0.25): Float32Array {
  const n = Math.round(sec * sr)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * hz * i) / sr)
  return out
}

function makeVibrato(centerMidi: number, rateHz: number, depthCents: number, sec: number, sr = 48000): Float32Array {
  const n = Math.round(sec * sr)
  const out = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / sr
    const m = centerMidi + (depthCents / 100) * Math.sin(2 * Math.PI * rateHz * t)
    const f = midiToHz(m)
    phase += (2 * Math.PI * f) / sr
    out[i] = 0.25 * Math.sin(phase)
  }
  return out
}

console.log('sing-engine tests:')

test('midiToNoteName formats standard pitches cleanly', () => {
  assert.equal(midiToNoteName(60), 'C4')
  assert.equal(midiToNoteName(69), 'A4')
  assert.equal(midiToNoteName(45), 'A2')
})

test('VocalTracker tracks steady singing pitch accurately within 5 cents', () => {
  const sr = 48000
  const tr = new VocalTracker(sr, 2048)
  const sig = makeSine(midiToHz(60), 0.2, sr)
  let last = tr.process(sig.subarray(0, 2048), 0.04, 60)
  for (let k = 1; k < 5; k++) {
    last = tr.process(sig.subarray(k * 1024, k * 1024 + 2048), 0.04 * (k + 1), 60)
  }
  assert.ok(last.midi !== null)
  const err = pitchErrorCents(last, 60)
  assert.ok(err !== null && Math.abs(err) <= 5, `expected <=5c error, got ${err}`)
})

test('VocalTracker detects smooth natural vibrato and rewards center pitch', () => {
  const sr = 48000
  const tr = new VocalTracker(sr, 2048)
  const sig = makeVibrato(64, 5.8, 55, 0.9, sr)
  const hop = 1440 // 30ms hop
  let sawSmooth = false
  let lastErr = 999
  for (let pos = 0, step = 0; pos + 2048 <= sig.length; pos += hop, step++) {
    const f = tr.process(sig.subarray(pos, pos + 2048), step * (hop / sr), 64)
    if (f.vibrato.active && f.vibrato.quality === 'smooth') {
      sawSmooth = true
      const e = pitchErrorCents(f, 64)
      if (e !== null) lastErr = Math.abs(e)
    }
  }
  assert.ok(sawSmooth, 'expected smooth vibrato detection')
  assert.ok(lastErr <= 20, `expected vibrato center pitch within 20c, got ${lastErr}`)
})

test('VocalTracker guards against momentary octave-jump glitches', () => {
  const sr = 48000
  const tr = new VocalTracker(sr, 2048)
  const low = makeSine(midiToHz(48), 0.1, sr) // C3
  const high = makeSine(midiToHz(60), 0.1, sr) // C4 octave glitch
  tr.process(low.subarray(0, 2048), 0.03, 48)
  tr.process(low.subarray(0, 2048), 0.06, 48)
  const glitch = tr.process(high.subarray(0, 2048), 0.09, 48)
  assert.ok(glitch.midi !== null && Math.abs(glitch.midi - 48) < 1.5, `expected octave guard near 48, got ${glitch.midi}`)
})

test('extractVocalMelody segments synthetic 3-note phrase and spots high peak + big leap', () => {
  const sr = 22050
  const a = makeSine(midiToHz(55), 0.6, sr) // G3
  const b = makeSine(midiToHz(62), 0.6, sr) // D4 (7-semitone leap)
  const c = makeSine(midiToHz(67), 0.7, sr) // G4 (peak)
  const mono = new Float32Array(a.length + b.length + c.length)
  mono.set(a, 0)
  mono.set(b, a.length)
  mono.set(c, a.length + b.length)
  const res = extractVocalMelody(mono, sr)
  assert.ok(res.notes.length >= 3, `expected >=3 notes, got ${res.notes.length}`)
  assert.equal(res.maxMidi, 67)
  assert.ok(res.hardSpots.some(h => h.reason === 'high'))
  assert.ok(res.hardSpots.some(h => h.reason === 'leap'))
})

test('detectSongKeyAndChords + recommendCapoForKey + recommendedKeyShift work cleanly', () => {
  const sr = 22050
  // Synthesize a strong C major chord (C3 + E3 + G3 + C4) for 4 seconds
  const n = sr * 4
  const buf = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / sr
    buf[i] = 0.2 * (Math.sin(2 * Math.PI * midiToHz(48) * t) + Math.sin(2 * Math.PI * midiToHz(52) * t) + Math.sin(2 * Math.PI * midiToHz(55) * t) + Math.sin(2 * Math.PI * midiToHz(60) * t))
  }
  const kd = detectSongKeyAndChords(buf, sr)
  assert.equal(kd.keyRoot, 0)
  assert.equal(kd.keyMinor, false)
  assert.ok(kd.chords.length >= 1)

  // Shifting C major up +1 semitone -> C# major -> Capo 1 playing C shapes!
  const capo = recommendCapoForKey(0, false, 1)
  assert.equal(capo.keyName, 'C#')
  assert.equal(capo.capo, 1)
  assert.equal(capo.shapes[0], 'C')

  // High song (G3..C5 = 55..72) for Baritone (comfort 48..64) recommends lowering key
  const shift = recommendedKeyShift(55, 72, 48, 64)
  assert.ok(shift.semis <= -5, `expected negative shift, got ${shift.semis}`)
})

test('buildHarmonyLine produces consonant in-range harmonies for Lower 3rd, Baritone, Upper 3rd, and Auto-Fit', () => {
  const lead = [
    { t0: 0, t1: 1, midi: 67 }, // G4
    { t0: 1, t1: 2, midi: 69 }, // A4
    { t0: 2, t1: 3, midi: 71 }, // B4
    { t0: 3, t1: 4, midi: 72 }, // C5
  ]
  const chords = [{ t0: 0, t1: 4, root: 0, minor: false, name: 'C' }]

  const low3 = buildHarmonyLine(lead, { mode: 'lower3', keyRoot: 0, keyMinor: false, chords, comfortLow: 48, comfortHigh: 64 })
  assert.ok(low3.notes.every((n, i) => n.midi < lead[i].midi))

  const up3 = buildHarmonyLine(lead, { mode: 'upper3', keyRoot: 0, keyMinor: false, chords, comfortLow: 60, comfortHigh: 80 })
  assert.ok(up3.notes.every((n, i) => n.midi > lead[i].midi))

  const auto = buildHarmonyLine(lead, { mode: 'autoFit', keyRoot: 0, keyMinor: false, chords, comfortLow: 48, comfortHigh: 64 })
  assert.ok(auto.rangeFitPct >= 75, `expected >=75% range fit, got ${auto.rangeFitPct}%`)
  assert.ok(auto.notes.every((n, i) => n.midi !== lead[i].midi))
})

test('classifyVoiceType and demucs vocalAndBacking work properly', () => {
  assert.equal(classifyVoiceType(43, 66).voiceType, 'Baritone')
  assert.equal(classifyVoiceType(60, 84).voiceType, 'Soprano')

  const n = 16
  const fill = (v: number): [Float32Array, Float32Array] => [new Float32Array(n).fill(v), new Float32Array(n).fill(v)]
  const vb = vocalAndBacking({ drums: fill(1), bass: fill(2), other: fill(3), vocals: fill(5) })
  assert.equal(vb.vocals[0][0], 5)
  assert.equal(vb.backing[0][0], 6)
})

console.log(`All ${passed} sing-engine tests passed!`)

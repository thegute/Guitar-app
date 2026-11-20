import assert from 'node:assert/strict'
import {
  buildAudioTimeline,
  dtwAlignSteps,
  renderAndCompareSong,
} from '../src/scan/deepAudioAlign'
import {
  detectAudioTuning,
  ensembleAudioNotes,
  filterByAcousticSalience,
  suppressHarmonicGhosts,
} from '../src/ml/deepAudioTranscribe'
import { joinNoteChunks, NOTE, noteChunks, type Note, type NoteOut } from '../src/ml/post'
import type { Song } from '../src/tabs/model'

/** Synthesize a realistic plucked guitar waveform (fundamental + harmonics 2..4 + exponential decay). */
function synthGuitarSequence(
  events: { t: number; dur: number; midis: number[]; amp?: number }[],
  totalSec: number,
  sr = 22050,
): Float32Array {
  const x = new Float32Array(Math.ceil(totalSec * sr))
  for (const ev of events) {
    const start = Math.round(ev.t * sr)
    const len = Math.round(ev.dur * sr)
    const amp = ev.amp ?? 0.5
    for (const midi of ev.midis) {
      const f0 = 440 * 2 ** ((midi - 69) / 12)
      for (let i = 0; i < len && start + i < x.length; i++) {
        const sec = i / sr
        const env = Math.min(1, sec / 0.008) * Math.exp(-sec * 3.2)
        const s =
          Math.sin(2 * Math.PI * f0 * sec) * 1.0 +
          Math.sin(2 * Math.PI * f0 * 2 * sec) * 0.45 +
          Math.sin(2 * Math.PI * f0 * 3 * sec) * 0.25 +
          Math.sin(2 * Math.PI * f0 * 4 * sec) * 0.12
        x[start + i] += s * env * amp
      }
    }
  }
  return x
}

const STD = [40, 45, 50, 55, 59, 64]

// 1. DTW Millisecond Audio-to-Tab Alignment (with 0.6s leading silence!)
{
  const trueTimes = [0.6, 1.0, 1.4, 1.8, 2.2, 2.6]
  const frets = [0, 3, 5, 7, 5, 3]
  const events = frets.map((f, i) => ({ t: trueTimes[i], dur: 0.36, midis: [STD[0] + f] }))
  const x = synthGuitarSequence(events, 3.4, 22050)
  const tl = buildAudioTimeline(x, 22050)
  const steps = frets.map(f => ({ notes: [{ string: 0, fret: f }], dur: 1 }))
  const align = dtwAlignSteps(steps, tl, STD, 0)
  assert.equal(align.stepTimes.length, frets.length)
  assert.ok(align.meanScore > 0.7, `Expected strong DTW chroma score, got ${align.meanScore}`)
  for (let i = 0; i < frets.length; i++) {
    const err = Math.abs(align.stepTimes[i] - trueTimes[i])
    assert.ok(err < 0.16, `Step ${i} aligned to ${align.stepTimes[i].toFixed(2)}s vs true ${trueTimes[i]}s`)
  }
}

// 2. Render-and-Compare: Fix a misread blurry fret (8 -> 3) using the real recording!
{
  const fretsTrue = [0, 3, 5, 3, 7, 5, 3, 0]
  const events = fretsTrue.map((f, i) => ({ t: 0.3 + i * 0.35, dur: 0.32, midis: [STD[0] + f] }))
  const x = synthGuitarSequence(events, 3.6, 22050)

  // Deliberately corrupt note index 3: printed as fret 8 (unsure, alt 3) instead of true fret 3!
  const song: Song = {
    title: 'Test Riff',
    tempo: 120,
    tracks: [
      {
        name: 'Guitar',
        tuning: [...STD],
        capo: 0,
        bars: [
          {
            steps: fretsTrue.map((f, i) => ({
              dur: 0.5,
              notes: [
                i === 3
                  ? ({ string: 0, fret: 8, midi: STD[0] + 8, unsure: true, alts: [3] } as never)
                  : { string: 0, fret: f, midi: STD[0] + f },
              ],
            })),
          },
        ],
      },
    ],
  }

  const pol = renderAndCompareSong(song, x, 22050, { allowTuningSwitch: false })
  const fixedNote = song.tracks[0].bars[0].steps[3].notes[0] as { fret: number; unsure?: boolean }
  assert.equal(fixedNote.fret, 3, `Expected Render-and-Compare to correct fret 8 -> 3, got ${fixedNote.fret}`)
  assert.equal(fixedNote.unsure, undefined)
  assert.ok(pol.notesCorrected >= 1)
}

// 3. Render-and-Compare: Auto-detect Capo 2 when Short plays +2 semitones above printed frets!
{
  const frets = [0, 2, 4, 5, 4, 2, 0, 5]
  const events = frets.map((f, i) => ({ t: 0.25 + i * 0.32, dur: 0.3, midis: [STD[1] + 2 + f] })) // Capo 2!
  const x = synthGuitarSequence(events, 3.2, 22050)
  const song: Song = {
    title: 'Capo 2 Short',
    tempo: 120,
    tracks: [
      {
        name: 'Guitar',
        tuning: [...STD],
        capo: 0,
        bars: [{ steps: frets.map(f => ({ dur: 0.5, notes: [{ string: 1, fret: f, midi: STD[1] + f }] })) }],
      },
    ],
  }
  const pol = renderAndCompareSong(song, x, 22050)
  assert.equal(pol.capo, 2, `Expected Capo 2 detected, got ${pol.tuningLabel} capo=${pol.capo}`)
  assert.equal(song.tracks[0].capo, 2)
}

// 4. Harmonic Overtone Ghost Suppressor (+12 / +19 semitones)
{
  const notes: Note[] = [
    { start: 1.0, end: 1.5, midi: 45, velocity: 0.85 }, // real A2
    { start: 1.01, end: 1.48, midi: 57, velocity: 0.42 }, // +12 harmonic ghost -> DROP
    { start: 1.01, end: 1.45, midi: 64, velocity: 0.35 }, // +19 harmonic ghost -> DROP
    { start: 2.0, end: 2.5, midi: 45, velocity: 0.8 }, // real A2
    { start: 2.01, end: 2.5, midi: 57, velocity: 0.78 }, // real loud octave double-stop -> KEEP
  ]
  const clean = suppressHarmonicGhosts(notes)
  assert.equal(clean.length, 3)
  assert.deepEqual(clean.map(n => n.midi), [45, 45, 57])
}

// 5. Ensemble Merger + Acoustic Salience Filter + Drop D Auto-Detection
{
  const crnn: Note[] = [
    { start: 0.5, end: 0.9, midi: 38, velocity: 0.7 }, // D2
    { start: 1.0, end: 1.04, midi: 61, velocity: 0.18 }, // weak out-of-chord micro-blip -> PRUNE
  ]
  const bp: Note[] = [
    { start: 0.52, end: 0.9, midi: 38, velocity: 0.65 }, // agrees with CRNN -> BOOST
    { start: 1.5, end: 1.9, midi: 45, velocity: 0.62 }, // strong A2 missed by CRNN -> RECOVER
  ]
  const merged = ensembleAudioNotes(crnn, bp, [{ t: 0, name: 'D' }])
  assert.equal(merged.length, 2)
  assert.ok(merged[0].velocity > 0.75)
  assert.equal(merged[1].midi, 45)

  // Drop D floor detection
  const dropDNotes: Note[] = Array.from({ length: 12 }, (_, i) => ({
    start: i * 0.25,
    end: i * 0.25 + 0.2,
    midi: i % 3 === 0 ? 38 : 45,
    velocity: 0.7,
  }))
  const det = detectAudioTuning(dropDNotes, STD)
  assert.equal(det.label, 'Drop D')
  assert.equal(det.tuning[0], 38)

  // Acoustic salience filter keeps real sounding notes and drops silent ghosts
  const x = synthGuitarSequence([{ t: 0.2, dur: 0.4, midis: [45] }], 1.0, 22050)
  const filtered = filterByAcousticSalience(
    [
      { start: 0.2, end: 0.5, midi: 45, velocity: 0.5 }, // real A2 -> KEEP
      { start: 0.2, end: 0.3, midi: 67, velocity: 0.3 }, // silent ghost G4 -> DROP
    ],
    x,
    22050,
  )
  assert.deepEqual(filtered.map(n => n.midi), [45])
}

// 6. 50% Overlapping Chunk Averaging (`noteChunks` + `joinNoteChunks` with step = 80000)
{
  const step = NOTE.chunk / 2
  const starts = noteChunks(NOTE.chunk * 2, step)
  assert.equal(starts.length, 3)
  const mkOut = (val: number): NoteOut => ({
    onset: new Float32Array(NOTE.frames * NOTE.keys).fill(val),
    offset: new Float32Array(NOTE.frames * NOTE.keys).fill(0),
    frame: new Float32Array(NOTE.frames * NOTE.keys).fill(val),
    velocity: new Float32Array(NOTE.frames * NOTE.keys).fill(0.5),
  })
  const joined = joinNoteChunks([mkOut(0.8), mkOut(0.8), mkOut(0.8)], 2000, step)
  assert.ok(Math.abs(joined.onset[500 * NOTE.keys] - 0.8) < 1e-4)
}

console.log('deep scanner (DTW, Render-and-Compare, Capo/Tuning, Ensemble, Ghosts, 50% Overlap): ok')

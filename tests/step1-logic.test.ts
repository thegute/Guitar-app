// Blueprint Step 1 logic: playing a tab in your tuning or without its capo, Smart capo for chord sheets, the
// new slack key tunings, and (added as they land) layers, voice leading and play-the-changes targets.
import './test-env'
import { strict as assert } from 'node:assert'
import { adaptTrack } from '../src/hand/adapt'
import { bestCapo, capoTrack, transposeChord } from '../src/hand/capo'
import { flatten, type SongTrack } from '../src/tabs/model'
import { INSTRUMENTS, type Instrument } from '../src/instrument'
import { TUNINGS, noteToMidi } from '../src/theory/notes'
import { layerSpots } from '../src/theory/layers'

let checks = 0
const ok = (c: boolean, m: string) => { checks++; assert.ok(c, m) }
const STD = [40, 45, 50, 55, 59, 64], DROPD = [38, 45, 50, 55, 59, 64]
const tr = (tuning: number[], capo: number, notes: [number, number][]): SongTrack => ({
  name: 't', tuning, capo, bars: [{ steps: notes.map(([s, f]) => ({ dur: 1, notes: [{ string: s, fret: f, midi: tuning[s] + capo + f }] })) }],
})

{
  // Drop D riff → Standard: the low D can't be played, so it goes up an octave; low-string notes move
  const a = adaptTrack(tr(DROPD, 0, [[0, 0], [0, 3], [0, 5], [1, 0]]), STD)
  const f = flatten(a.track).map(x => x.step.notes[0])
  ok(f[0].midi === 50, `low D an octave up (${f[0].midi})`)
  ok(f[1].midi === 41 && f[1].string === 0 && f[1].fret === 1, `F on the low E string fret 1 (${f[1].string}:${f[1].fret})`)
  ok(f[2].midi === 43 && f[2].fret === 3, 'G at fret 3')
  ok(a.changes.some(c => /octave up/.test(c)) && a.changes.some(c => /2 frets lower/.test(c)), `changes explained: ${a.changes.join(' / ')}`)
  // Standard → Drop D: low-string notes 2 frets higher
  const b = adaptTrack(tr(STD, 0, [[0, 0], [0, 3]]), DROPD)
  ok(flatten(b.track).map(x => x.step.notes[0].fret).join() === '2,5', 'standard → drop D: +2 on the low string')
  // without the capo
  const c = adaptTrack(tr(STD, 2, [[1, 0], [2, 2]]), STD, false)
  const cf = flatten(c.track).map(x => x.step.notes[0])
  ok(c.track.capo === 0 && cf[0].fret === 2 && cf[1].fret === 4 && cf[0].midi === 47, 'no capo: frets +2, same pitches')
  console.log(`adapt: ${a.changes.join('; ')}`)
}

{
  ok(transposeChord('Eb', 3) === 'C' && transposeChord('Bb7/D', 3) === 'G7/B' && transposeChord('Cm', 3) === 'Am', 'chord names move down')
  const guitar = INSTRUMENTS.guitar
  const t = guitar.tunings[0]
  const inst = { ...guitar, tuning: t, midis: t.notes.map(noteToMidi) } as unknown as Instrument
  const idea = bestCapo(['Eb', 'Ab', 'Bb', 'Cm', 'Eb', 'Bb'], inst)
  console.log(`smart capo for Eb Ab Bb Cm: capo ${idea.capo} → ${idea.shapes.join(' ')} (effort ${idea.effortNow.toFixed(1)} → ${idea.effort.toFixed(1)})`)
  ok(idea.capo > 0 && idea.effort < idea.effortNow - 1, 'a capo makes Eb-key chords easier')
  const already = bestCapo(['G', 'C', 'D', 'Em'], inst)
  ok(already.capo === 0, `open chords need no capo (${already.capo})`)
  const track: SongTrack = { name: 'c', tuning: inst.midis, capo: 0, bars: ['Eb', 'Ab'].map(c => ({ steps: [{ dur: 4, chord: c, notes: [] }] })) }
  const moved = capoTrack(track, idea.capo, inst)
  const st = moved.bars[0].steps[0]
  ok(moved.capo === idea.capo && st.notes.length >= 3 && st.notes.every(n => n.midi === inst.midis[n.string] + idea.capo + n.fret), 'capo shapes keep their pitches')
  const pcs = new Set(st.notes.map(n => n.midi % 12))
  ok(pcs.has(3) && pcs.has(7) && pcs.has(10), `the Eb chord still sounds Eb (${[...pcs].join(',')})`)
}

{
  // slack key tunings
  const ids = TUNINGS.map(t => t.id)
  for (const id of ['openg', 'cwahine', 'gwahine', 'leonardc', 'maunaloa', 'dropd', 'opend']) ok(ids.includes(id), `tuning ${id}`)
  const mid = (id: string) => TUNINGS.find(t => t.id === id)!.notes.map(noteToMidi).join(',')
  ok(mid('gwahine') === '38,43,50,54,59,62', 'G wahine D G D F# B D')
  ok(mid('leonardc') === '36,43,52,55,59,64', "Leonard's C: C G E G B E")
  ok(mid('maunaloa') === '36,43,48,55,57,64', 'C Mauna Loa: C G C G A E')
}
{
  // the 5-layer neck: C major, E shape (fret 8)
  const guitar = INSTRUMENTS.guitar
  const t = guitar.tunings[0]
  const inst = { ...guitar, tuning: t, midis: t.notes.map(noteToMidi) } as unknown as Instrument
  const all = new Set(['caged', 'triads', 'penta', 'bridge', 'free'] as const)
  const L = layerSpots({ rootPc: 0, minor: false, inst, shape: 'E', layers: new Set(all), mode: 'ionian' })
  const by = (layer: string) => [...L.spots.values()].filter(x => x.layer === layer)
  ok(L.shape?.letter === 'E' && L.shape.lo === 8, `E shape at fret 8 (${L.shape?.lo})`)
  ok(by('caged').length === 6, `six shape notes (${by('caged').length})`)
  ok(by('caged').every(x => [0, 4, 7].includes(x.midi % 12)), 'shape notes are C E G')
  ok(by('bridge').every(x => [5, 11].includes(x.midi % 12)) && by('bridge').length >= 3, `Ionian bridge notes are F and B (${by('bridge').map(x => x.label).join(' ')})`)
  ok(by('penta').every(x => [0, 2, 4, 7, 9].includes(x.midi % 12)), 'pentatonic box notes')
  ok(by('free').length >= 3 && by('free').every(x => ['9', '4', '6', 'b7', '7'].includes(x.label)), `free-finger notes (${by('free').map(x => x.label).join(' ')})`)
  // Lydian swaps F for F#
  const ly = layerSpots({ rootPc: 0, minor: false, inst, shape: 'E', layers: new Set(['bridge'] as const), mode: 'lydian' })
  ok([...ly.spots.values()].some(x => x.midi % 12 === 6) && ![...ly.spots.values()].some(x => x.midi % 12 === 5), 'Lydian: #4 instead of 4')
  // three notes per string
  const np = layerSpots({ rootPc: 9, minor: true, inst, shape: 'E', layers: new Set(), mode: 'dorian', nps: true })
  const perString = [0, 1, 2, 3, 4, 5].map(s => np.path.filter(p => p.s === s).length)
  ok(perString.every(n => n === 3), `3 notes on every string (${perString.join(',')})`)
  ok(np.path[0].midi % 12 === 9 && np.path.every((p, i) => i === 0 || p.midi > np.path[i - 1].midi), 'the path rises from the root')
  const spans = [0, 1, 2, 3, 4, 5].map(s => { const fs = np.path.filter(p => p.s === s).map(p => p.f); return Math.max(...fs) - Math.min(...fs) })
  ok(spans.every(d => d <= 5), `each string's three notes fit the hand (${spans.join(',')})`)
  console.log(`layers: E shape C, bridge ${by('bridge').map(x => x.label).join(' ')}, free ${by('free').map(x => x.label).join(' ')}, 3nps A dorian ${np.path.map(p => p.f).join(' ')}`)
}
console.log(`step 1 logic: ${checks} checks, 0 failed`)

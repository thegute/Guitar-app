import './test-env'
// Practice-tab library: every exercise builds, fits the instrument and spells the right notes.
import { buildExercise, scalePosition, EX_SCALES, EX_ARPS, EX_LICKS, EX_SEQUENCES, EX_WARMUPS, ESSENTIALS } from '../src/tabs/exercises'
import {
  RHYTHM_FEELS, SCALE_PATTERNS, STRETCH_SHAPES,
  bestBpmFor, planBurstSteps, recordBestBpm, removeLabDrill,
  rhythmLabSong, saveLabDrill, savedLabDrills, scaleBuilderSong, stretchRackSong,
} from '../src/exercises/drillLab'
import { INSTRUMENTS, current as currentInst, generateShapes } from '../src/instrument'
import { practicePlan } from '../src/sessions/practice'
import { noteToMidi, pc } from '../src/theory/notes'
import { Scale } from 'tonal'

let fails = 0
const bad = (m: string) => { fails++; if (fails < 30) console.log('FAIL', m) }
const eq = (name: string, got: unknown, want: unknown) => { if (JSON.stringify(got) !== JSON.stringify(want)) bad(`${name}\n   got  ${JSON.stringify(got)}\n   want ${JSON.stringify(want)}`) }

const guitar = INSTRUMENTS.guitar.tunings[0].notes.map(noteToMidi)
// A minor pentatonic box 1 = the classic 5th-position shape
eq('A min pent box 1', scalePosition(guitar, 9, Scale.get('A minor pentatonic').notes.map(pc), 0).map(p => `${p.string}:${p.fret}`), ['0:5', '0:8', '1:5', '1:7', '2:5', '2:7', '3:5', '3:7', '4:5', '4:8', '5:5', '5:8'])
eq('A min pent box 2', scalePosition(guitar, 9, Scale.get('A minor pentatonic').notes.map(pc), 1).map(p => `${p.string}:${p.fret}`), ['0:8', '0:10', '1:7', '1:10', '2:7', '2:10', '3:7', '3:9', '4:8', '4:10', '5:8', '5:10'])
eq('G major 3nps pos 1', scalePosition(guitar, 7, Scale.get('G major').notes.map(pc), 0).map(p => p.fret), [3, 5, 7, 3, 5, 7, 4, 5, 7, 4, 5, 7, 5, 7, 8, 5, 7, 8])

let built = 0
for (const inst of Object.values(INSTRUMENTS)) for (const t of inst.tunings) {
  const tuning = t.notes.map(noteToMidi)
  const specs = [
    ...EX_SCALES.flatMap(s => [-1, 0, 2].map(p => ({ kind: 'scale' as const, root: 'E', type: s.id, position: p }))),
    ...EX_SEQUENCES.map(s => ({ kind: 'sequence' as const, root: 'G', type: s.id, position: 0, scale: 'major' })),
    ...EX_ARPS.map(a => ({ kind: 'arpeggio' as const, root: 'C', type: a.id, position: -1 })),
    ...EX_LICKS.map(l => ({ kind: 'lick' as const, root: 'A', type: l.id, position: 0 })),
    ...EX_WARMUPS.map(w => ({ kind: 'warmup' as const, root: 'A', type: w.id, position: 0 })),
    ...ESSENTIALS.map(e => e.spec),
  ]
  for (const spec of specs) {
    const song = buildExercise(spec, tuning)
    built++
    const tr = song.tracks[0]
    const notes = tr.bars.flatMap(b => b.steps.flatMap(s => s.notes))
    if (notes.length < 4) bad(`${inst.id}/${t.id} ${spec.kind} ${spec.type}: only ${notes.length} notes`)
    for (const n of notes) {
      if (n.fret < 0 || n.fret > 22) bad(`${inst.id}/${t.id} ${spec.kind} ${spec.type}: fret ${n.fret}`)
      if (n.midi !== tuning[n.string] + n.fret) bad(`${inst.id}/${t.id} ${spec.kind} ${spec.type}: midi mismatch`)
    }
    if (spec.kind === 'scale') {
      const pcs = Scale.get(`${spec.root} ${spec.type}`).notes.map(pc)
      if (notes.some(n => !pcs.includes(n.midi % 12))) bad(`${inst.id} ${spec.type}: note outside the scale`)
    }
  }
}
console.log('exercises built:', built)
// baritone / ukulele chord search finds sensible shapes
const bari = INSTRUMENTS.baritone.tunings[0].notes.map(noteToMidi)
eq('baritone G shape', generateShapes('G', 'major', bari)[0]?.frets, [0, 0, 0, 3])
const tenor = INSTRUMENTS.tenor.tunings[0].notes.map(noteToMidi)
eq('tenor C shape', generateShapes('C', 'major', tenor)[0]?.frets, [0, 0, 0, 3])

// Drill Lab: Scale builder, Stretch rack, Rhythm lab, Burst mode
let labChecks = 0
function checkLabSong(tag: string, s: ReturnType<typeof scaleBuilderSong>, tuning: number[], expectedMeter = 4) {
  labChecks++
  if (!s) { bad(`${tag}: returned null`); return }
  const tr = s.song.tracks[0]
  if (!tr.bars.length) bad(`${tag}: no bars`)
  tr.bars.forEach((b, bi) => {
    const len = b.steps.reduce((a, st) => a + st.dur, 0)
    if (Math.abs(len - expectedMeter) > 0.01) bad(`${tag}: bar ${bi + 1} len ${len} != ${expectedMeter}`)
    for (const st of b.steps) for (const n of st.notes) {
      if (n.fret < 0 || n.fret > 22) bad(`${tag}: fret ${n.fret} out of 0..22`)
      if (n.midi !== tuning[n.string] + n.fret) bad(`${tag}: midi mismatch`)
    }
  })
}

for (const tuning of [guitar, bari, tenor]) {
  for (const layout of ['position', '3nps', 'oneString'] as const) {
    for (const pat of SCALE_PATTERNS) {
      checkLabSong(`scale ${layout}/${pat.id}`, scaleBuilderSong({ root: 'A', scale: 'harmonic minor', position: 0, layout, pattern: pat.id, sub: '16', bpm: 80 }, tuning), tuning)
    }
  }
  for (const sh of STRETCH_SHAPES) {
    for (const mode of ['across', 'descend', 'anchor'] as const) {
      for (const legato of [false, true]) {
        checkLabSong(`stretch ${sh.id}/${mode}/${legato}`, stretchRackSong({ startFret: 5, shape: sh.id, mode, legato, bpm: 66 }, tuning), tuning)
      }
    }
  }
  for (const meter of [3, 4, 5, 7] as const) {
    for (const feel of RHYTHM_FEELS) {
      checkLabSong(`rhythm ${meter}/4 ${feel.id}`, rhythmLabSong({ meter, sub: '16', feel: feel.id, root: 'E', bars: 2, bpm: 80 }, tuning), tuning, meter)
    }
  }
}

const burst = planBurstSteps(100, { on: true, stepBpm: 10, steps: 4, reps: 2, restBars: 1 })
eq('burst count', burst.length, 8)
eq('burst bpms', burst.map(b => b.bpm), [100, 100, 110, 110, 120, 120, 130, 130])
eq('burst restBeforeBars', burst.map(b => b.restBeforeBars), [0, 0, 1, 0, 1, 0, 1, 0])
const capped = planBurstSteps(230, { on: true, stepBpm: 15, steps: 3, reps: 1, restBars: 2 })
eq('burst cap 240', capped.map(b => b.bpm), [230, 240, 240])
eq('burst rest 2 bars', capped.map(b => b.restBeforeBars), [0, 2, 2])

localStorage.clear()
eq('best initially null', bestBpmFor('WU-1', 'mic'), null)
eq('record new best 110', recordBestBpm('WU-1', 110, 'mic'), true)
eq('record slower 105 ignored', recordBestBpm('WU-1', 105, 'mic'), false)
eq('best stayed 110', bestBpmFor('WU-1', 'mic'), 110)
eq('pedal isolated from mic', bestBpmFor('WU-1', 'pedal'), null)
eq('record pedal best 120', recordBestBpm('WU-1', 120, 'pedal'), true)
eq('pedal best 120', bestBpmFor('WU-1', 'pedal'), 120)

const savedList = saveLabDrill({
  id: 'lab:rhythm:guitar:std:7:odd:16:E:2',
  title: 'Rhythm lab · 7/4 Odd meter (E)',
  mode: 'rhythm',
  docId: 'lab:rhythm:guitar:std:7:odd:16:E:2',
  bpm: 92,
  params: { rhMeter: 7, rhFeel: 'odd', rhSub: '16', rhRoot: 'E', rhBars: 2, rhBpm: 92 },
})
eq('saved lab count', savedList.length, 1)
eq('saved lab reload', savedLabDrills()[0].title, 'Rhythm lab · 7/4 Odd meter (E)')
const planWithLab = await practicePlan(currentInst(), 20)
eq('practicePlan includes drill step', planWithLab.parts.some(p => p.kind === 'drill' && p.title.includes('7/4 Odd meter')), true)
eq('remove saved lab', removeLabDrill('lab:rhythm:guitar:std:7:odd:16:E:2').length, 0)
localStorage.clear()
console.log('drill lab checks:', labChecks)

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

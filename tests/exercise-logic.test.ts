// Practice-tab library: every exercise builds, fits the instrument and spells the right notes.
import { buildExercise, scalePosition, EX_SCALES, EX_ARPS, EX_LICKS, EX_SEQUENCES, EX_WARMUPS, ESSENTIALS } from '../src/tabs/exercises'
import { INSTRUMENTS } from '../src/instrument'
import { noteToMidi, pc } from '../src/theory/notes'
import { Scale } from 'tonal'
import { generateShapes } from '../src/instrument'

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
console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

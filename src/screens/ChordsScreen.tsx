import { useMemo, useState } from 'react'
import { Chord } from 'tonal'
import { CHORD_GROUPS, SUFFIX_FORMULA, chordSymbol } from '../theory/chords'
import { chordShapes, useInstrument } from '../instrument'
import { ChordDiagram } from '../components/ChordDiagram'
import { Fretboard } from '../components/Fretboard'
import { Chips, KeyPicker, usePersist } from '../components/Controls'
import { strum } from '../audio/pluck'
import { pc, friendly, INTERVAL_LABELS } from '../theory/notes'

const TONAL_SUFFIX: Record<string, string> = {
  major: '', minor: 'm', '5': '5', aug7: '7#5', mmaj7: 'mMaj7', alt: '7alt', '69': '6/9', m69: 'm6/9', '9#11': '9#11',
}

export function ChordsScreen() {
  const [root, setRoot] = usePersist('chordRoot', 'C')
  const [suffix, setSuffix] = usePersist('chordSuffix', 'major')
  const [group, setGroup] = useState(() => CHORD_GROUPS.find(g => g.types.some(t => t.suffix === suffix))?.name ?? 'Basic')
  const [sel, setSel] = useState(0)
  const [labels, setLabels] = usePersist<'notes' | 'intervals'>('chordLabels', 'intervals')
  const inst = useInstrument()
  const vs = useMemo(() => chordShapes(root, suffix, inst), [root, suffix, inst])
  const v = vs[Math.min(sel, vs.length - 1)]
  const name = chordSymbol(root, suffix)
  const tonal = Chord.get(root + (TONAL_SUFFIX[suffix] ?? suffix))
  const notes = tonal.empty ? [] : tonal.notes.map(friendly)
  const r = pc(root)
  const pcs = new Set(notes.map(pc))
  const tuning = inst.midis

  function play(i: number) {
    setSel(i)
    const vv = vs[i]
    if (vv) strum(vv.frets.map((f, s) => (f < 0 ? -1 : tuning[s] + f)).filter(m => m > 0))
  }

  return (
    <div className="stack">
      <h1>Chords{inst.isUke ? <span className="muted small"> · {inst.label}</span> : null}</h1>
      <KeyPicker value={root} onChange={k => { setRoot(k); setSel(0) }} label="Root note" />
      <Chips label="Chord family" items={CHORD_GROUPS.map(g => ({ id: g.name, label: g.name }))} value={group} onChange={setGroup} />
      <Chips label="Chord type" wrap items={CHORD_GROUPS.find(g => g.name === group)!.types.map(t => ({ id: t.suffix, label: t.label }))} value={suffix} onChange={s => { setSuffix(s); setSel(0) }} />

      <div className="split">
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="readout" style={{ fontSize: 56 }}>{name}</div>
            <div className="small muted" style={{ textAlign: 'right' }}>
              <div>{SUFFIX_FORMULA[suffix] ?? ''}</div>
              <div>{notes.join(' ')}</div>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>{vs.length} shapes. Tap a shape to hear it.</p>
          <div className="row" style={{ flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 6 }}>
            {vs.map((vv, i) => (
              <ChordDiagram key={i} voicing={vv} active={i === sel} onClick={() => play(i)} />
            ))}
            {vs.length === 0 && <p className="muted">No shapes for this chord yet.</p>}
          </div>
        </div>
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Every {name} note on the neck</h3>
            <Chips label="Labels" items={[{ id: 'intervals', label: 'Intervals' }, { id: 'notes', label: 'Notes' }]} value={labels} onChange={setLabels} />
          </div>
          <p className="small muted" style={{ margin: '6px 0 10px' }}>Gold dots show the shape you picked. Red is the root.</p>
          <Fretboard
            tuning={inst.midis}
            markFor={(midi, s, f) => {
              const p = midi % 12
              if (!pcs.has(p)) return null
              const inShape = v && v.frets[s] === f
              const label = labels === 'notes' ? notes.find(n => pc(n) === p) ?? '' : INTERVAL_LABELS[(p - r + 12) % 12]
              if (inShape) return { label, role: p === r ? 'root' : 'chord' }
              return { label, role: p === r ? 'root' : 'ghost' }
            }}
            onTap={midi => strum([midi])}
          />
        </div>
      </div>
    </div>
  )
}

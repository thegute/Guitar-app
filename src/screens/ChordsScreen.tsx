import { useMemo, useState } from 'react'
import { Chord } from 'tonal'
import { CHORD_GROUPS, SUFFIX_FORMULA, chordSymbol } from '../theory/chords'
import { chordShapes, useInstrument } from '../instrument'
import { ChordDiagram } from '../components/ChordDiagram'
import { Fretboard } from '../components/Fretboard'
import { Chips, KeyPicker, usePersist } from '../components/Controls'
import { strum } from '../audio/pluck'
import { pc, pcName, friendly, INTERVAL_LABELS } from '../theory/notes'
import { Zoomable } from '../components/Zoomable'
import { ChordExtras } from '../components/ChordExtras'
import { useScreenInfo } from '../assistant/screen'
import { Win, WinArea } from '../components/Win'
import { LayerNeck } from '../components/LayerNeck'
import { VoiceLeadNeck } from '../components/VoiceLeadNeck'

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
  useScreenInfo('chords', {
    label: `Tools → Chords: ${name}${vs.length ? ` (shape ${Math.min(sel, vs.length - 1) + 1} of ${vs.length})` : ''}`,
    summary: `In Tools → Chords looking at ${name} on ${inst.label.toLowerCase()} (${inst.tuning.name}). Notes: ${notes.join(' ') || '?'}. ${v ? `Shape ${Math.min(sel, vs.length - 1) + 1} of ${vs.length}: frets low to high string ${v.frets.map(f => (f < 0 ? 'x' : f)).join(' ')}${v.barres.length ? `, barre at fret ${v.barres.join(', ')}` : ''}.` : 'No shape for this chord on this instrument.'} Labels show ${labels}.`,
  })

  function play(i: number) {
    setSel(i)
    const vv = vs[i]
    if (vv) strum(vv.frets.map((f, s) => (f < 0 ? -1 : tuning[s] + f)).filter(m => m > 0))
  }

  return (
    <div className="stack">
      <h1>Chords{inst.isUke ? <span className="muted small"> · {inst.label}</span> : null}</h1>
      <WinArea area="chords" className="win-cols">
      <Win id="pick" title="Pick a chord" className="panel" bodyClass="stack" resizable={false}>
      <KeyPicker value={root} onChange={k => { setRoot(k); setSel(0) }} label="Root note" />
      <Chips label="Chord family" items={CHORD_GROUPS.map(g => ({ id: g.name, label: g.name }))} value={group} onChange={setGroup} />
      <Chips label="Chord type" wrap items={CHORD_GROUPS.find(g => g.name === group)!.types.map(t => ({ id: t.suffix, label: t.label }))} value={suffix} onChange={s => { setSuffix(s); setSel(0) }} />
      </Win>

        <Win id="shapes" title="Shapes" className="panel">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="readout" style={{ fontSize: 56 }}>{name}</div>
            <div className="small muted" style={{ textAlign: 'right' }}>
              <div>{SUFFIX_FORMULA[suffix] ?? ''}</div>
              <div>{notes.join(' ')}</div>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>{vs.length} shapes. Tap a shape to hear it.</p>
          <Zoomable id="chordShapes" max={2.5}>
            <div className="row" style={{ flexWrap: 'wrap', paddingBottom: 6 }}>
              {vs.map((vv, i) => (
                <ChordDiagram key={i} voicing={vv} active={i === sel} onClick={() => play(i)} />
              ))}
              {vs.length === 0 && <p className="muted">No shapes for this chord yet.</p>}
            </div>
          </Zoomable>
        </Win>
        <Win id="neck" title={`Every ${name} note on the neck`} className="panel">
          <div className="row" style={{ justifyContent: 'flex-end' }}>
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
        </Win>
        <Win id="layers" title={`${name}: the 5-layer neck`} className="panel" hint="Pick a shape, then switch the layers on and off: the shape, the triads inside it, the pentatonic box around it, the two notes that make it a full mode, and the notes a free finger can add (the violet ones: tap one to hear the chord with that hammer-on).">
          <LayerNeck rootPc={r} minor={/^m(?!aj)|^minor|dim|m7b5/.test(suffix)} inst={inst} where="chords" noLinks={['chord']} />
        </Win>
        <Win id="voice" title={`Voice leading from ${name}`} className="panel" hint="Pick a chord to move to: the shapes are chosen so your hand barely moves. Gold rings = notes both chords share (keep that finger down); gold arrows = the 3rds and 7ths moving.">
          <VoiceFrom name={name} root={root} minor={/^m(?!aj)|^minor/.test(suffix)} tuning={inst.midis} flats={/b/.test(root)} />
        </Win>
      <ChordExtras root={root} suffix={suffix} voicing={v} />
      </WinArea>
    </div>
  )
}

/** The usual next chords from this one (IV, V, vi, ii in its key; for minor: iv, v, bVI, bVII), as voice-led moves. */
function VoiceFrom({ name, root, minor, tuning, flats }: { name: string; root: string; minor: boolean; tuning: number[]; flats: boolean }) {
  const r = pc(root)
  const nm = (iv: number, q: string) => pcName((r + iv) % 12, flats) + q
  const nexts = minor ? [nm(5, 'm'), nm(7, ''), nm(8, ''), nm(10, ''), nm(7, '7')] : [nm(5, ''), nm(7, ''), nm(9, 'm'), nm(2, 'm'), nm(7, '7')]
  const [to, setTo] = useState(nexts[0])
  const target = nexts.includes(to) ? to : nexts[0]
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="chips" role="group" aria-label="Move to">
        {nexts.map(n => <button key={n} className="chip" aria-pressed={n === target} onClick={() => setTo(n)}>{name} → {n}</button>)}
      </div>
      <VoiceLeadNeck chords={[name, target]} tuning={tuning} where="chords" steppable={false} flats={flats} />
    </div>
  )
}

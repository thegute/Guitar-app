import { useEffect, useMemo, useState } from 'react'
import { Scale, Chord } from 'tonal'
import { SCALES, scaleById, scaleInfo } from '../theory/scales'
import { Fretboard } from '../components/Fretboard'
import { Chips, Field, KeyPicker, usePersist } from '../components/Controls'
import { playNote } from '../audio/pluck'
import { audio } from '../audio/engine'
import { pc, noteToMidi } from '../theory/notes'

const POSITIONS = [
  { id: 'all', label: 'Whole neck', from: 0, to: 15 },
  { id: 'p1', label: 'Frets 0–4', from: 0, to: 4 },
  { id: 'p2', label: '2–6', from: 2, to: 6 },
  { id: 'p3', label: '4–8', from: 4, to: 8 },
  { id: 'p4', label: '5–9', from: 5, to: 9 },
  { id: 'p5', label: '7–11', from: 7, to: 11 },
  { id: 'p6', label: '9–13', from: 9, to: 13 },
  { id: 'p7', label: '12–16', from: 12, to: 16 },
]

export function ScalesScreen({ initial }: { initial?: { root: string; scale: string } }) {
  const [root, setRoot] = usePersist('scaleRoot', initial?.root ?? 'A')
  const [scale, setScale] = usePersist('scaleId', initial?.scale ?? 'minor pentatonic')
  const [pos, setPos] = usePersist('scalePos', 'all')
  const [labels, setLabels] = usePersist<'intervals' | 'notes'>('scaleLabels', 'intervals')
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (initial) { setRoot(initial.root); setScale(initial.scale); setPos('all') }
  }, [initial, setRoot, setScale, setPos])
  const info = useMemo(() => scaleInfo(root, scale), [root, scale])
  const def = scaleById(scale)
  const p = POSITIONS.find(x => x.id === pos) ?? POSITIONS[0]
  const r = pc(root)
  const set = new Set(info.pcs)
  const groups = [...new Set(SCALES.map(s => s.group))]

  // chords built from this scale (only for 7-note scales)
  const chords = useMemo(() => {
    const notes = Scale.get(`${root} ${scale}`).notes
    if (notes.length !== 7) return []
    return notes.map((n, i) => {
      const tri = [notes[i], notes[(i + 2) % 7], notes[(i + 4) % 7]]
      const d = Chord.detect(tri)[0] ?? n
      return d.replace('M', '').replace(/^([A-G][#b]?)m$/, '$1m')
    })
  }, [root, scale])

  function playScale() {
    if (playing) return
    setPlaying(true)
    const ctx = audio()
    const base = noteToMidi(root + '3')
    const steps = [...info.pcs.map(x => base + ((x - r + 12) % 12)), base + 12]
    steps.sort((a, b) => a - b)
    const seq = [...steps, ...steps.slice(0, -1).reverse()]
    seq.forEach((m, i) => playNote(m, ctx.currentTime + 0.05 + i * 0.22, 0.7))
    setTimeout(() => setPlaying(false), seq.length * 220 + 300)
  }

  return (
    <div className="stack">
      <h1>Scales</h1>
      <KeyPicker value={root} onChange={setRoot} label="Root note" />
      <div className="row">
        <Field label="Scale">
          <select className="select" value={scale} onChange={e => setScale(e.target.value)} style={{ minWidth: 240 }}>
            {groups.map(g => (
              <optgroup key={g} label={g}>
                {SCALES.filter(s => s.group === g).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>
        <button className="btn" onClick={playScale} disabled={playing} style={{ alignSelf: 'end' }}>{playing ? 'Playing…' : 'Hear it'}</button>
      </div>
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="readout" style={{ fontSize: 40 }}>{root} {def.label}</div>
          <div className="small muted">{info.notes.join(' ')}</div>
        </div>
        {def.feel && <p className="muted small" style={{ marginTop: 6 }}>{def.feel}</p>}
        <div className="row" style={{ justifyContent: 'space-between', margin: '10px 0' }}>
          <Chips label="Position" items={POSITIONS.map(x => ({ id: x.id, label: x.label }))} value={pos} onChange={setPos} />
          <Chips label="Labels" items={[{ id: 'intervals', label: 'Intervals' }, { id: 'notes', label: 'Notes' }]} value={labels} onChange={setLabels} />
        </div>
        <Fretboard
          fromFret={p.from === 0 ? 0 : p.from - 1}
          toFret={p.id === 'all' ? 15 : p.to}
          markFor={(midi, s, f) => {
            const q = midi % 12
            if (!set.has(q)) return null
            if (p.id !== 'all' && (f < p.from || f > p.to)) return null
            const label = labels === 'notes' ? info.notes[info.pcs.indexOf(q)] : info.labels.get(q) ?? ''
            return { label, role: q === r ? 'root' : 'scale' }
          }}
          onTap={midi => playNote(midi)}
        />
        <p className="small muted" style={{ marginTop: 8 }}>Tap any dot to hear that note. Red dots are the root.</p>
      </div>
      {chords.length > 0 && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Chords that come from this scale</h3>
          <div className="row">
            {chords.map((c, i) => (
              <span key={i} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="muted small">{['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][i]}</span>
                <b style={{ fontFamily: 'var(--display)', fontSize: 18 }}>{c}</b>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

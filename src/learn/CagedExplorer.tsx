// CAGED explorer: the five shapes of any chord linked up the neck, and what lives inside each shape
// (its arpeggio, its pentatonic box, its scale and its triads).
import { useMemo } from 'react'
import { Scale } from 'tonal'
import { Fretboard, type Mark } from '../components/Fretboard'
import { ChordDiagram } from '../components/ChordDiagram'
import { Chips, KeyPicker, usePersist } from '../components/Controls'
import { strum } from '../audio/pluck'
import { audio } from '../audio/engine'
import { pc, SHARPS } from '../theory/notes'
import type { Instrument } from '../instrument'
import { cagedShapes, shapeWindow } from './caged'
import { usePracticeTimer } from './progress'

type Overlay = 'chord' | 'arp' | 'penta' | 'scale' | 'triads'
const IV = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7']

export function CagedExplorer({ inst, onExit, onQuiz }: { inst: Instrument; onExit: () => void; onQuiz: (id: string) => void }) {
  const [root, setRoot] = usePersist('cagedRoot', 'C')
  const [minor, setMinor] = usePersist('cagedMinor', false)
  const [sel, setSel] = usePersist<string>('cagedShape', 'all')
  const [overlay, setOverlay] = usePersist<Overlay>('cagedOverlay', 'chord')
  usePracticeTimer('caged', true, false)
  const r = pc(root)
  const shapes = useMemo(() => cagedShapes(r, minor, inst), [r, minor, inst])
  const shape = shapes.find(s => s.letter === sel) ?? null
  const chordPcs = [r, (r + (minor ? 3 : 4)) % 12, (r + 7) % 12]
  const pentaPcs = Scale.get(`${SHARPS[r]} ${minor ? 'minor pentatonic' : 'major pentatonic'}`).notes.map(pc)
  const scalePcs = Scale.get(`${SHARPS[r]} ${minor ? 'aeolian' : 'major'}`).notes.map(pc)
  const sys = inst.shapeSystem.join('')

  const inShape = (s: number, f: number, sh = shape) => !!sh && sh.frets[s] === f
  const inWindow = (f: number, sh = shape) => { if (!sh) return false; const [a, b] = shapeWindow(sh); return f >= a && f <= b }
  const triadSpots = useMemo(() => {
    if (!shape) return new Set<string>()
    const set = new Set<string>()
    const [a, b] = shapeWindow(shape)
    for (let lo = 0; lo + 2 < inst.strings; lo++) {
      const strs = [lo, lo + 1, lo + 2]
      const opts = strs.map(s => { const fs: number[] = []; for (let f = a; f <= b; f++) if (chordPcs.includes((inst.midis[s] + f) % 12)) fs.push(f); return fs })
      for (const x of opts[0]) for (const y of opts[1]) for (const z of opts[2]) {
        const fr = [x, y, z]
        if (new Set(fr.map((f, i) => (inst.midis[strs[i]] + f) % 12)).size === 3 && Math.max(...fr) - Math.min(...fr) <= 4) fr.forEach((f, i) => set.add(`${strs[i]}-${f}`))
      }
    }
    return set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, inst, r, minor])

  const markFor = (midi: number, s: number, f: number): Mark | null => {
    const p = midi % 12
    const label = IV[(p - r + 12) % 12]
    if (sel === 'all') {
      const owner = shapes.find(sh => sh.frets[s] === f)
      if (!owner) return null
      return { label: owner.letter, role: p === r ? 'root' : 'chord' }
    }
    if (!shape) return null
    if (overlay === 'chord') return inShape(s, f) ? { label, role: p === r ? 'root' : 'chord' } : chordPcs.includes(p) && inWindow(f) ? { label, role: 'ghost' } : null
    if (overlay === 'arp') return chordPcs.includes(p) && inWindow(f) ? { label, role: p === r ? 'root' : 'chord' } : null
    if (overlay === 'penta') return pentaPcs.includes(p) && inWindow(f) ? { label, role: p === r ? 'root' : chordPcs.includes(p) ? 'chord' : 'scale' } : null
    if (overlay === 'scale') return scalePcs.includes(p) && inWindow(f) ? { label, role: p === r ? 'root' : chordPcs.includes(p) ? 'chord' : 'scale' } : null
    return triadSpots.has(`${s}-${f}`) ? { label, role: p === r ? 'root' : 'chord' } : null
  }

  function hear(sh = shape) {
    if (!sh) return
    const ctx = audio()
    void ctx.resume()
    strum(sh.frets.map((f, s) => (f < 0 ? -1 : inst.midis[s] + f)).filter(m => m > 0), ctx.currentTime + 0.02)
  }
  const name = SHARPS[r] + (minor ? 'm' : '')
  const voicing = shape ? { frets: shape.frets, fingers: shape.frets.map(() => 0), barres: [], baseFret: Math.max(1, shape.lo), midi: [] } : null

  const SHAPE_TIPS: Record<string, string> = {
    C: `Comes from the open C chord. ${inst.id === 'tenor' ? 'Root on the A string.' : 'Root on the A string, under your ring finger, with another root on the B string.'}`,
    A: `Comes from the open A chord. ${inst.id === 'tenor' ? 'Root on the G string.' : 'Root on the A string; the A-shape barre chord.'}`,
    G: `Comes from the open G chord. ${inst.id === 'tenor' ? 'Root on the E string.' : 'Roots on both E strings; a big stretch, often played partially.'}`,
    E: 'Comes from the open E chord: the classic E-shape barre with the root on the low E.',
    F: 'Comes from the open F chord on ukulele, with the root on the E string.',
    D: `Comes from the open D chord. ${inst.id === 'tenor' ? 'Root on the C string.' : 'Root on the D string; great for high, bright voicings.'}`,
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← Back</button>
        <button className="btn sm" onClick={() => onQuiz('caged-name')}>Quiz me</button>
      </div>
      <h2 style={{ margin: 0 }}>{sys} explorer</h2>
      <p className="small muted" style={{ margin: 0 }}>
        The five open-chord shapes ({inst.shapeSystem.join(', ')}) can be moved up the neck to play any chord. Placed one after another they cover the
        whole fretboard, always in the order {sys}, and each one hands over to the next on shared notes. Learn the shapes and you can play any chord
        (and its scale and arpeggio) anywhere on the neck.
      </p>
      <div className="panel stack">
        <KeyPicker value={root} onChange={setRoot} label="Chord root" />
        <Chips label="Quality" items={[{ id: 'maj', label: 'Major' }, { id: 'min', label: 'Minor' }]} value={minor ? 'min' : 'maj'} onChange={v => setMinor(v === 'min')} />
        <Chips label="Shape" items={[{ id: 'all', label: 'All five' }, ...shapes.map(s => ({ id: s.letter, label: `${s.letter} shape · fret ${s.lo}` }))]} value={sel} onChange={setSel} />
        {sel !== 'all' && (
          <Chips label="Show" items={[{ id: 'chord', label: 'Chord' }, { id: 'arp', label: 'Arpeggio' }, { id: 'penta', label: minor ? 'Minor pentatonic' : 'Major pentatonic' }, { id: 'scale', label: minor ? 'Natural minor' : 'Major scale' }, { id: 'triads', label: 'Triads' }]} value={overlay} onChange={setOverlay} />
        )}
        <Fretboard tuning={inst.midis} fromFret={0} toFret={16} markFor={markFor} onTap={m => { const ctx = audio(); strum([m], ctx.currentTime + 0.01) }} />
        {sel === 'all' ? (
          <p className="small muted" style={{ margin: 0 }}>
            Each dot is labelled with its shape. Red dots are the root ({name}). Notice how each shape shares notes with the next one: that's how they link up.
          </p>
        ) : shape && (
          <div className="caged-detail">
            {voicing && <ChordDiagram name={`${name} · ${shape.letter} shape`} voicing={voicing} onClick={() => hear()} size={0.95} />}
            <div className="stack" style={{ gap: 6 }}>
              <p className="small" style={{ margin: 0 }}><b>{shape.letter} shape, frets {shape.lo}–{shape.hi}.</b> {SHAPE_TIPS[shape.letter]}</p>
              <p className="small muted" style={{ margin: 0 }}>
                {overlay === 'arp' && 'The arpeggio is the chord played one note at a time, in this position. Use it to target chord tones in a solo.'}
                {overlay === 'penta' && `The ${minor ? 'minor' : 'major'} pentatonic box that sits inside this shape. Amber notes are the chord tones: land on them.`}
                {overlay === 'scale' && `The full ${minor ? 'natural minor' : 'major'} scale around this shape: every melody in the key fits here.`}
                {overlay === 'triads' && 'The three-note triads hidden inside the shape, on each set of three strings. Great for rhythm parts and fills.'}
                {overlay === 'chord' && 'Faded dots are other chord tones nearby you can add or swap in.'}
              </p>
              <div className="row">
                <button className="btn sm" onClick={() => hear()}>▶ Hear it</button>
                <button className="btn sm" onClick={() => setSel(shapes[(shapes.indexOf(shape) + 1) % shapes.length].letter)}>Next shape up →</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="panel stack">
        <h3 style={{ margin: 0 }}>Practise it</h3>
        <div className="row">
          <button className="btn" onClick={() => onQuiz('caged-name')}>Which shape is this?</button>
          <button className="btn" onClick={() => onQuiz('caged-where')}>Play it with this shape</button>
          <button className="btn" onClick={() => onQuiz('caged-order')}>The order up the neck</button>
        </div>
        <p className="small muted" style={{ margin: 0 }}>Try this on your {inst.noun}: play {name} in all five shapes going up the neck, then back down. Then do it with a different chord every day.</p>
      </div>
    </div>
  )
}

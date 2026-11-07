// The 5-layer neck for one chord: pick a shape (C A G E D, or the instrument's own), switch layers on and off
// (Shape · Triads · Pentatonic · Mode notes · Free fingers), choose the mode, show 3 notes per string, hold a soft
// chord drone under it, tap any note to hear it (a free-finger note plays the chord, then the hammer-on), and jump
// to the same chord or scale in the other tools. Used in the CAGED explorer, Scales & chords, Chord peek (pinned)
// and Tools → Chords / Scales.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Fretboard, type Mark } from './Fretboard'
import { Chips, usePersist } from './Controls'
import { Ico } from './Icon'
import { KEYS } from '../theory/notes'
import { LAYERS, MODES, doubleStops, layerSpots, type LayerId, type ModeId } from '../theory/layers'
import { cagedShapes } from '../learn/caged'
import type { Instrument } from '../instrument'
import { playNote, strum } from '../audio/pluck'
import { audio } from '../audio/engine'
import { Drone } from '../audio/drone'
import { SHARPS } from '../theory/notes'
import { launch } from '../search/launch'
import { learnGo } from '../nav'

interface Props {
  rootPc: number
  minor: boolean
  inst: Instrument
  /** remembered settings are shared; the chosen shape is remembered per place */
  where: string
  /** a shape to start in (e.g. the one nearest your hand) */
  preferShape?: string
  /** the shape is chosen outside (the CAGED explorer's own chips): no shape chips here */
  shape?: string
  /** smaller neck (peek bubble) */
  compact?: boolean
  /** hide the jump-to chips (inside the tool they'd link to) */
  noLinks?: ('caged' | 'chord' | 'scale' | 'licks')[]
}

const drone = new Drone()

export function LayerNeck({ rootPc, minor, inst, where, preferShape, compact, noLinks = [], shape: fixedShape }: Props) {
  const shapes = useMemo(() => cagedShapes(rootPc, minor, inst), [rootPc, minor, inst])
  const [shapeSel, setShapeSel] = usePersist<string>(`layerShape:${where}`, preferShape ?? '')
  const shape = fixedShape ?? shapes.find(s => s.letter === shapeSel)?.letter ?? (shapes.some(s => s.letter === preferShape) ? preferShape : shapes[0]?.letter)
  const [on, setOn] = usePersist<LayerId[]>('layers', ['caged', 'triads', 'free'])
  const [modeMaj, setModeMaj] = usePersist<ModeId>('layerModeMaj', 'ionian')
  const [modeMin, setModeMin] = usePersist<ModeId>('layerModeMin', 'aeolian')
  const [nps, setNps] = usePersist('layerNps', false)
  const [dsOn, setDsOn] = usePersist('layerDoubles', false)
  const [dsKind, setDsKind] = usePersist<'3rds' | '4ths' | '6ths'>('layerDoubleKind', '3rds')
  const [dsSel, setDsSel] = useState(-1)
  const [droning, setDroning] = useState(false)
  const mode = minor ? modeMin : modeMaj
  const set = useMemo(() => layerSpots({ rootPc, minor, inst, shape, layers: new Set(on), mode, nps }), [rootPc, minor, inst, shape, on, mode, nps])
  // the drone follows the chord while it's on, and stops when you leave
  const last = useRef({ rootPc, minor })
  useEffect(() => {
    if (droning && (last.current.rootPc !== rootPc || last.current.minor !== minor)) drone.start(36 + rootPc, [minor ? 3 : 4])
    last.current = { rootPc, minor }
  }, [rootPc, minor, droning])
  useEffect(() => () => { drone.stop() }, [])
  const doubles = useMemo(() => (dsOn ? doubleStops({ rootPc, minor, tuning: inst.midis, window: set.window }).filter(d => d.kind === dsKind) : []), [dsOn, dsKind, rootPc, minor, inst.midis, set.window])
  useEffect(() => setDsSel(-1), [doubles])
  const strNames = inst.midis.map((m, i) => { const n = SHARPS[m % 12]; return i === inst.midis.length - 1 && inst.midis.filter(x => x % 12 === m % 12).length > 1 ? n.toLowerCase() : n })
  const pathKeys = useMemo(() => new Map(set.path.map((p, i) => [`${p.s}-${p.f}`, i + 1])), [set.path])
  const markFor = (_m: number, s: number, f: number): Mark | null => {
    const d = doubles[dsSel]
    if (d && ((d.lo.s === s && d.lo.f === f) || (d.hi.s === s && d.hi.f === f))) return { label: d.kind[0], role: 'target' }
    const sp = set.spots.get(`${s}-${f}`)
    const step = pathKeys.get(`${s}-${f}`)
    if (sp) return { label: sp.label, role: sp.role }
    if (step) { const p = set.path[step - 1]; return { label: p.label, role: p.role === 'root' ? 'root' : 'pass' } }
    return null
  }
  const [what, setWhat] = useState('')
  const tap = (midi: number, s: number, f: number) => {
    const ctx = audio()
    void ctx.resume()
    const sp = set.spots.get(`${s}-${f}`)
    if (sp?.layer === 'free' && set.shape) {
      // the chord, then the free finger's note: what it sounds like in a song
      const notes = set.shape.frets.map((x, i) => (x < 0 ? -1 : inst.midis[i] + x)).filter(m => m > 0)
      strum(notes, ctx.currentTime + 0.02)
      playNote(midi, ctx.currentTime + 0.55, 0.9)
    } else playNote(midi, ctx.currentTime + 0.02, 0.9)
    setWhat(sp?.what ?? `${sp?.label ?? ''} ${SHARPS[midi % 12]}`.trim())
  }
  const toggle = (id: LayerId) => setOn(on.includes(id) ? on.filter(x => x !== id) : [...on, id])
  const lo = Math.max(0, Math.min(set.window[0], ...set.path.map(p => p.f)) - 1)
  const hi = Math.max(set.window[1], ...set.path.map(p => p.f)) + 1
  const name = SHARPS[rootPc] + (minor ? 'm' : '')
  const scaleName = (MODES[minor ? 'min' : 'maj'].find(m => m.id === mode)?.id ?? 'ionian')
  return (
    <div className={`layer-neck stack${compact ? ' compact' : ''}`} style={{ gap: 8 }} data-testid="layer-neck">
      {shapes.length > 1 && !fixedShape && (
        <Chips label="Shape" items={shapes.map(s => ({ id: s.letter, label: `${s.letter} shape · fret ${Math.max(1, s.lo)}` }))} value={shape ?? ''} onChange={setShapeSel} wrap />
      )}
      <div className="layer-toggles" role="group" aria-label="Layers">
        {LAYERS.map(l => (
          <button key={l.id} className={`chip layer-chip lay-${l.id}`} aria-pressed={on.includes(l.id)} onClick={() => toggle(l.id)} title={l.what}>{l.label}</button>
        ))}
        <button className="chip layer-chip" aria-pressed={nps} onClick={() => setNps(!nps)} title="The whole mode, three notes per string, from the shape's root">3 per string</button>
        <button className="chip layer-chip" aria-pressed={dsOn} onClick={() => setDsOn(!dsOn)} title="Two notes at once around the shape: 3rds, 4ths and 6ths (Hendrix, Mayer, soul)" data-testid="ds-toggle">Double-stops</button>
      </div>
      {dsOn && (
        <div className="stack" style={{ gap: 4 }} data-testid="double-stops">
          <Chips label="Double-stops" items={[{ id: '3rds', label: '3rds (Mayer, soul)' }, { id: '4ths', label: '4ths (Hendrix)' }, { id: '6ths', label: '6ths (skip a string)' }]} value={dsKind} onChange={v => setDsKind(v as '3rds' | '4ths' | '6ths')} wrap />
          <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
            {doubles.length ? doubles.slice(0, 18).map((d, i) => (
              <button key={i} className={`chip${dsSel === i ? ' on' : ''}`} aria-pressed={dsSel === i} onClick={() => {
                setDsSel(i)
                const ctx = audio(); void ctx.resume()
                playNote(d.lo.midi, ctx.currentTime + 0.02, 0.85); playNote(d.hi.midi, ctx.currentTime + 0.02, 0.85)
                setWhat(d.what)
              }}>{strNames[d.lo.s]}{d.lo.f} + {strNames[d.hi.s]}{d.hi.f}</button>
            )) : <span className="small muted">None of these around this shape: try another kind or shape.</span>}
          </div>
        </div>
      )}
      {(on.includes('bridge') || nps) && (
        <Chips label="Mode" items={MODES[minor ? 'min' : 'maj'].map(m => ({ id: m.id, label: m.label }))} value={mode} onChange={v => (minor ? setModeMin(v) : setModeMaj(v))} wrap />
      )}
      <Fretboard tuning={inst.midis} fromFret={lo} toFret={Math.min(22, Math.max(hi, lo + 5))} markFor={markFor} onTap={tap} zoomId={`layers-${where}`} compact={compact} />
      <p className="small muted" style={{ margin: 0 }} role="status">{what || (set.shape ? `${name}, ${set.shape.letter} shape. Tap any note to hear it; a violet one plays the chord and then the hammer-on.` : `${name}.`)}</p>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <button className={`btn sm${droning ? ' on' : ''}`} aria-pressed={droning} onClick={() => { if (droning) { drone.stop(); setDroning(false) } else { drone.start(36 + rootPc, [minor ? 3 : 4]); setDroning(true) } }} data-testid="drone">
          <Ico n={droning ? 'stop' : 'sound'} /> {droning ? 'Stop drone' : `Drone ${name}`}
        </button>
        {!noLinks.includes('caged') && <button className="btn sm ghost" onClick={() => { put('cagedRoot', SHARPS[rootPc]); put('cagedMinor', minor); learnGo({ tool: 'caged' }) }}>CAGED explorer</button>}
        {!noLinks.includes('chord') && <button className="btn sm ghost" onClick={() => launch({ chord: { root: SHARPS[rootPc], suffix: minor ? 'minor' : 'major' } })}>{name} in Chords</button>}
        {!noLinks.includes('licks') && <button className="btn sm ghost" onClick={() => { put('lickWantKey', { root: KEYS[rootPc], minor }); learnGo({ licks: '' }) }} data-testid="licks-over">Licks over {name}</button>}
        {!noLinks.includes('scale') && <button className="btn sm ghost" onClick={() => launch({ scale: { root: SHARPS[rootPc], scale: scaleName === 'ionian' ? 'major' : scaleName } })}>{scaleLabel(minor, mode)} in Scales</button>}
      </div>
      <div className="layer-legend small" aria-hidden>
        <i className="lg-root" />root <i className="lg-chord" />chord <i className="lg-triad" />triad <i className="lg-scale" />pentatonic <i className="lg-pass" />mode note <i className="lg-embel" />free finger
      </div>
    </div>
  )
}

const put = (k: string, v: unknown) => { try { localStorage.setItem('kg:' + k, JSON.stringify(v)) } catch { /* storage unavailable */ } }
function scaleLabel(minor: boolean, mode: ModeId) {
  const m = MODES[minor ? 'min' : 'maj'].find(x => x.id === mode)
  return (m?.label ?? 'Major').replace(/ \(.*\)$/, '')
}

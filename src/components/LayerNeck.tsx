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
  /** sleek floating-card chrome: slim single-row dropdown bar + collapsible Options drawer */
  floating?: boolean
  /** hide the jump-to chips (inside the tool they'd link to) */
  noLinks?: ('caged' | 'chord' | 'scale' | 'licks')[]
}

const drone = new Drone()

const LAYER_PRESETS: { id: string; label: string; layers: LayerId[]; nps?: boolean }[] = [
  { id: 'lead', label: 'Lead (Penta + Chord)', layers: ['caged', 'penta'] },
  { id: 'triads', label: 'Triads Only', layers: ['triads'] },
  { id: 'mode', label: 'Full Mode', layers: ['caged', 'penta', 'bridge'] },
  { id: 'embel', label: 'Chord + Free Fingers', layers: ['caged', 'triads', 'free'] },
  { id: 'all', label: 'All 5 Layers', layers: ['caged', 'triads', 'penta', 'bridge', 'free'] },
]

export function LayerNeck({ rootPc, minor, inst, where, preferShape, compact, floating, noLinks = [], shape: fixedShape }: Props) {
  const shapes = useMemo(() => cagedShapes(rootPc, minor, inst), [rootPc, minor, inst])
  const [shapeSel, setShapeSel] = usePersist<string>(`layerShape:${where}`, preferShape ?? '')
  const [wholeNeck, setWholeNeck] = usePersist<boolean>(`layerWhole:${where}`, false)
  const shape = fixedShape ?? shapes.find(s => s.letter === shapeSel)?.letter ?? (shapes.some(s => s.letter === preferShape) ? preferShape : shapes[0]?.letter)
  const [on, setOn] = usePersist<LayerId[]>('layers', ['caged', 'triads', 'free'])
  const [modeMaj, setModeMaj] = usePersist<ModeId>('layerModeMaj', 'ionian')
  const [modeMin, setModeMin] = usePersist<ModeId>('layerModeMin', 'aeolian')
  const [nps, setNps] = usePersist('layerNps', false)
  const [dsOn, setDsOn] = usePersist('layerDoubles', false)
  const [flowOn, setFlowOn] = usePersist('layerFlow', false)
  const [dsKind, setDsKind] = usePersist<'3rds' | '4ths' | '6ths'>('layerDoubleKind', '3rds')
  const [dsSel, setDsSel] = useState(-1)
  const [droning, setDroning] = useState(false)
  const [optsOpen, setOptsOpen] = useState(false)
  const [prevCh, setPrevCh] = useState<{ rootPc: number; minor: boolean } | null>(null)
  const mode = minor ? modeMin : modeMaj
  const set = useMemo(
    () => layerSpots({ rootPc, minor, inst, shape, layers: new Set(on), mode, nps, window: wholeNeck ? [0, 15] : undefined }),
    [rootPc, minor, inst, shape, on, mode, nps, wholeNeck],
  )
  // track previous chord for Flow (Anchor vs Moving notes) & keep drone following
  const last = useRef({ rootPc, minor })
  useEffect(() => {
    if (last.current.rootPc !== rootPc || last.current.minor !== minor) {
      setPrevCh({ rootPc: last.current.rootPc, minor: last.current.minor })
      if (droning) drone.start(36 + rootPc, [minor ? 3 : 4])
      last.current = { rootPc, minor }
    }
  }, [rootPc, minor, droning])
  useEffect(() => () => { drone.stop() }, [])

  // Flow voice-leading pitch classes (Anchor = shared chord tones, Moving = new chord tones)
  const flowInfo = useMemo(() => {
    if (!flowOn || !prevCh) return null
    const curPcs = [rootPc, (rootPc + (minor ? 3 : 4)) % 12, (rootPc + 7) % 12]
    const prevPcs = [prevCh.rootPc, (prevCh.rootPc + (prevCh.minor ? 3 : 4)) % 12, (prevCh.rootPc + 7) % 12]
    const anchors = new Set(curPcs.filter(p => prevPcs.includes(p)))
    const moving = new Set(curPcs.filter(p => !prevPcs.includes(p)))
    return { curPcs, prevPcs, anchors, moving, prevName: SHARPS[prevCh.rootPc] + (prevCh.minor ? 'm' : '') }
  }, [flowOn, prevCh, rootPc, minor])

  const doubles = useMemo(() => (dsOn ? doubleStops({ rootPc, minor, tuning: inst.midis, window: set.window }).filter(d => d.kind === dsKind) : []), [dsOn, dsKind, rootPc, minor, inst.midis, set.window])
  useEffect(() => setDsSel(-1), [doubles])
  const strNames = inst.midis.map((m, i) => { const n = SHARPS[m % 12]; return i === inst.midis.length - 1 && inst.midis.filter(x => x % 12 === m % 12).length > 1 ? n.toLowerCase() : n })
  const pathKeys = useMemo(() => new Map(set.path.map((p, i) => [`${p.s}-${p.f}`, i + 1])), [set.path])
  const lo = wholeNeck ? 0 : Math.max(0, Math.min(set.window[0], ...set.path.map(p => p.f)) - 1)
  const hi = wholeNeck ? 15 : Math.max(set.window[1], ...set.path.map(p => p.f)) + 1

  const flowArrows = useMemo(() => {
    if (!flowInfo) return undefined
    const arr: { s1: number; f1: number; s2: number; f2: number; kind?: 'guide' | 'move' | 'look' }[] = []
    for (let s = 0; s < inst.midis.length; s++) {
      for (let f = lo; f <= hi; f++) {
        const p = (inst.midis[s] + f) % 12
        if (!flowInfo.moving.has(p)) continue
        for (const d of [-1, 1, -2, 2]) {
          const pf = f - d
          if (pf >= lo && pf <= hi && flowInfo.prevPcs.includes((inst.midis[s] + pf) % 12) && !flowInfo.anchors.has((inst.midis[s] + pf) % 12)) {
            arr.push({ s1: s, f1: pf, s2: s, f2: f, kind: Math.abs(d) === 1 ? 'guide' : 'move' })
            break
          }
        }
      }
    }
    return arr.slice(0, 6)
  }, [flowInfo, inst.midis, lo, hi])

  const markFor = (m: number, s: number, f: number): Mark | null => {
    const d = doubles[dsSel]
    if (d && ((d.lo.s === s && d.lo.f === f) || (d.hi.s === s && d.hi.f === f))) return { label: d.kind[0], role: 'target' }
    const sp = set.spots.get(`${s}-${f}`)
    const step = pathKeys.get(`${s}-${f}`)
    if (flowInfo && sp && (sp.role === 'root' || sp.role === 'chord' || sp.role === 'triad')) {
      const p = m % 12
      if (flowInfo.anchors.has(p)) return { label: sp.label, role: 'common' }
      if (flowInfo.moving.has(p)) return { label: sp.label, role: 'next' }
    }
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
  const name = SHARPS[rootPc] + (minor ? 'm' : '')
  const scaleName = (MODES[minor ? 'min' : 'maj'].find(m => m.id === mode)?.id ?? 'ionian')
  const activePreset = LAYER_PRESETS.find(p => p.layers.length === on.length && p.layers.every(l => on.includes(l)))?.id ?? ''
  const toggleDrone = () => {
    if (droning) { drone.stop(); setDroning(false) }
    else { drone.start(36 + rootPc, [minor ? 3 : 4]); setDroning(true) }
  }

  if (floating) {
    return (
      <div className="layer-neck floating stack" style={{ gap: 5 }} data-testid="layer-neck">
        <div className="ln-float-bar">
          <div className="seg ln-seg" role="group" aria-label="Neck range">
            <button aria-pressed={!wholeNeck} onClick={() => setWholeNeck(false)} data-testid="layer-range-box">Box</button>
            <button aria-pressed={wholeNeck} onClick={() => setWholeNeck(true)} data-testid="layer-range-whole">Neck</button>
          </div>
          {!wholeNeck && shapes.length > 1 && !fixedShape && (
            <select
              className="select sm ln-sel"
              value={shape ?? ''}
              onChange={e => setShapeSel(e.target.value)}
              aria-label="CAGED shape"
              data-testid="layer-shape-select"
            >
              {shapes.map(s => <option key={s.letter} value={s.letter}>{s.letter} · f{Math.max(1, s.lo)}</option>)}
            </select>
          )}
          <select
            className="select sm ln-sel"
            value={activePreset}
            onChange={e => {
              const p = LAYER_PRESETS.find(x => x.id === e.target.value)
              if (p) setOn([...p.layers])
            }}
            aria-label="Layer preset"
            data-testid="layer-preset-select"
          >
            <option value="">Custom ({on.length})</option>
            {LAYER_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <button
            className={`btn sm ln-btn${droning ? ' on' : ''}`}
            aria-pressed={droning}
            onClick={toggleDrone}
            title={droning ? `Stop ${name} drone` : `Hold ${name} chord drone`}
            aria-label={droning ? 'Stop drone' : `Drone ${name}`}
            data-testid="drone"
          >
            <Ico n={droning ? 'stop' : 'sound'} />
          </button>
          <button
            className={`btn sm ln-btn${optsOpen ? ' on' : ''}`}
            aria-expanded={optsOpen}
            onClick={() => setOptsOpen(v => !v)}
            data-testid="layer-float-opts"
          >
            Options {optsOpen ? '▴' : '▾'}
          </button>
        </div>

        {optsOpen && (
          <div className="ln-float-drawer stack" style={{ gap: 6 }} data-testid="layer-float-drawer">
            <div className="layer-toggles ln-mini-toggles" role="group" aria-label="Layers">
              {LAYERS.map(l => (
                <button key={l.id} className={`chip layer-chip lay-${l.id}`} aria-pressed={on.includes(l.id)} onClick={() => toggle(l.id)} title={l.what}>{l.label}</button>
              ))}
              <button className="chip layer-chip" aria-pressed={nps} onClick={() => setNps(!nps)} title="Three notes per string">3/str</button>
              <button className="chip layer-chip" aria-pressed={dsOn} onClick={() => setDsOn(!dsOn)} title="3rds, 4ths and 6ths double-stops" data-testid="ds-toggle">Doubles</button>
              <button className="chip layer-chip" aria-pressed={flowOn} onClick={() => setFlowOn(!flowOn)} title="Voice-leading Flow (Anchor vs Moving)" data-testid="flow-toggle">Flow</button>
            </div>
            {(on.includes('bridge') || nps) && (
              <label className="row small" style={{ gap: 6, alignItems: 'center' }}>
                <span className="muted">Mode</span>
                <select className="select sm ln-sel" value={mode} onChange={e => (minor ? setModeMin(e.target.value as ModeId) : setModeMaj(e.target.value as ModeId))} aria-label="Mode">
                  {MODES[minor ? 'min' : 'maj'].map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </label>
            )}
            {dsOn && (
              <div className="stack" style={{ gap: 4 }} data-testid="double-stops">
                <div className="row" style={{ gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="small muted">Double-stops:</span>
                  {(['3rds', '4ths', '6ths'] as const).map(k => (
                    <button key={k} className={`chip${dsKind === k ? ' on' : ''}`} aria-pressed={dsKind === k} onClick={() => setDsKind(k)}>{k}</button>
                  ))}
                </div>
                <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                  {doubles.length ? doubles.slice(0, 12).map((d, i) => (
                    <button key={i} className={`chip${dsSel === i ? ' on' : ''}`} aria-pressed={dsSel === i} onClick={() => {
                      setDsSel(i)
                      const ctx = audio(); void ctx.resume()
                      playNote(d.lo.midi, ctx.currentTime + 0.02, 0.85); playNote(d.hi.midi, ctx.currentTime + 0.02, 0.85)
                      setWhat(d.what)
                    }}>{strNames[d.lo.s]}{d.lo.f}+{strNames[d.hi.s]}{d.hi.f}</button>
                  )) : <span className="small muted">None around this shape.</span>}
                </div>
              </div>
            )}
            <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
              {!noLinks.includes('caged') && <button className="btn sm ghost ln-btn" onClick={() => { put('cagedRoot', SHARPS[rootPc]); put('cagedMinor', minor); learnGo({ tool: 'caged' }) }}>CAGED</button>}
              {!noLinks.includes('chord') && <button className="btn sm ghost ln-btn" onClick={() => launch({ chord: { root: SHARPS[rootPc], suffix: minor ? 'minor' : 'major' } })}>Chords</button>}
              {!noLinks.includes('licks') && <button className="btn sm ghost ln-btn" onClick={() => { put('lickWantKey', { root: KEYS[rootPc], minor }); learnGo({ licks: '' }) }} data-testid="licks-over">Licks</button>}
              {!noLinks.includes('scale') && <button className="btn sm ghost ln-btn" onClick={() => launch({ scale: { root: SHARPS[rootPc], scale: scaleName === 'ionian' ? 'major' : scaleName } })}>Scales</button>}
            </div>
            <div className="layer-legend small" style={{ display: 'flex' }} aria-hidden>
              <i className="lg-root" />root <i className="lg-chord" />chord <i className="lg-triad" />triad <i className="lg-scale" />penta <i className="lg-pass" />mode <i className="lg-embel" />free
            </div>
          </div>
        )}

        <Fretboard tuning={inst.midis} fromFret={lo} toFret={Math.min(22, Math.max(hi, lo + 5))} markFor={markFor} onTap={tap} arrows={flowArrows} zoomId={`layers-${where}`} compact={compact} />

        {(what || flowOn) && (
          <div className="small muted" style={{ fontSize: 11, lineHeight: 1.3 }} role="status">
            {flowOn && flowInfo
              ? <><b>{flowInfo.prevName} → {name}:</b> Anchor ({[...flowInfo.anchors].map(p => SHARPS[p]).join(', ') || 'none'}) · Move ({[...flowInfo.moving].map(p => SHARPS[p]).join(', ')})</>
              : what}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`layer-neck stack${compact ? ' compact' : ''}`} style={{ gap: 8 }} data-testid="layer-neck">
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="seg" role="group" aria-label="Neck range">
          <button aria-pressed={!wholeNeck} onClick={() => setWholeNeck(false)} data-testid="layer-range-box">CAGED Box</button>
          <button aria-pressed={wholeNeck} onClick={() => setWholeNeck(true)} data-testid="layer-range-whole">Whole Neck (0–15)</button>
        </div>
        <select
          className="select sm"
          style={{ width: 'auto' }}
          value={activePreset}
          onChange={e => {
            const p = LAYER_PRESETS.find(x => x.id === e.target.value)
            if (p) setOn([...p.layers])
          }}
          aria-label="Layer preset"
          data-testid="layer-preset-select"
        >
          <option value="">Preset: Custom</option>
          {LAYER_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>
      {!wholeNeck && shapes.length > 1 && !fixedShape && (
        <Chips label="Shape" items={shapes.map(s => ({ id: s.letter, label: `${s.letter} shape · fret ${Math.max(1, s.lo)}` }))} value={shape ?? ''} onChange={setShapeSel} wrap />
      )}
      <div className="layer-toggles" role="group" aria-label="Layers">
        {LAYERS.map(l => (
          <button key={l.id} className={`chip layer-chip lay-${l.id}`} aria-pressed={on.includes(l.id)} onClick={() => toggle(l.id)} title={l.what}>{l.label}</button>
        ))}
        <button className="chip layer-chip" aria-pressed={nps} onClick={() => setNps(!nps)} title="The whole mode, three notes per string, from the shape's root">3 per string</button>
        <button className="chip layer-chip" aria-pressed={dsOn} onClick={() => setDsOn(!dsOn)} title="Two notes at once around the shape: 3rds, 4ths and 6ths (Hendrix, Mayer, soul)" data-testid="ds-toggle">Double-stops</button>
        <button className="chip layer-chip" aria-pressed={flowOn} onClick={() => setFlowOn(!flowOn)} title="Voice-leading Flow: highlights Anchor notes (stay put) vs Moving notes when chords change" data-testid="flow-toggle">Flow</button>
      </div>
      {flowOn && (
        <div className="small muted" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.28)', borderRadius: 8, padding: '4px 8px' }}>
          {flowInfo
            ? <><b>{flowInfo.prevName} → {name}:</b> Anchor ({[...flowInfo.anchors].map(p => SHARPS[p]).join(', ') || 'none'}) stay put · Moving ({[...flowInfo.moving].map(p => SHARPS[p]).join(', ')}) shift 1–2 frets.</>
            : <>Flow ready — change chords (via Circle, Pocket Band, or Play) to see Anchor vs. Moving notes.</>}
        </div>
      )}
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
      <Fretboard tuning={inst.midis} fromFret={lo} toFret={Math.min(22, Math.max(hi, lo + 5))} markFor={markFor} onTap={tap} arrows={flowArrows} zoomId={`layers-${where}`} compact={compact} />
      <p className="small muted" style={{ margin: 0 }} role="status">{what || (set.shape ? `${name}, ${set.shape.letter} shape. Tap any note to hear it; a violet one plays the chord and then the hammer-on.` : `${name}.`)}</p>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <button className={`btn sm${droning ? ' on' : ''}`} aria-pressed={droning} onClick={toggleDrone} data-testid="drone">
          <Ico n={droning ? 'stop' : 'sound'} /> {droning ? 'Stop drone' : `Drone ${name}`}
        </button>
        {!noLinks.includes('caged') && <button className="btn sm ghost" onClick={() => { put('cagedRoot', SHARPS[rootPc]); put('cagedMinor', minor); learnGo({ tool: 'caged' }) }}>CAGED explorer</button>}
        {!noLinks.includes('chord') && <button className="btn sm ghost" onClick={() => launch({ chord: { root: SHARPS[rootPc], suffix: minor ? 'minor' : 'major' } })}>{name} in Chords</button>}
        {!noLinks.includes('licks') && <button className="btn sm ghost" onClick={() => { put('lickWantKey', { root: KEYS[rootPc], minor }); learnGo({ licks: '' }) }} data-testid="licks-over">Licks over {name}</button>}
        {!noLinks.includes('scale') && <button className="btn sm ghost" onClick={() => launch({ scale: { root: SHARPS[rootPc], scale: scaleName === 'ionian' ? 'major' : scaleName } })}>{scaleLabel(minor, mode)} in Scales</button>}
      </div>
      <div className="layer-legend small" aria-hidden>
        <i className="lg-root" />root <i className="lg-chord" />chord <i className="lg-triad" />triad <i className="lg-scale" />pentatonic <i className="lg-pass" />mode note <i className="lg-embel" />free finger{flowOn && <> · <b>Flow:</b> gold+green = anchor, green = moving</>}
      </div>
    </div>
  )
}

const put = (k: string, v: unknown) => { try { localStorage.setItem('kg:' + k, JSON.stringify(v)) } catch { /* storage unavailable */ } }
function scaleLabel(minor: boolean, mode: ModeId) {
  const m = MODES[minor ? 'min' : 'maj'].find(x => x.id === mode)
  return (m?.label ?? 'Major').replace(/ \(.*\)$/, '')
}

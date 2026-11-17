// Interactive Drill Lab in Learn → Exercises → Make your own:
//   - Scale builder: any key, scale, position/3NPS/one-string layout, sequence pattern, subdivision
//   - Stretch rack: progressive finger-span shapes across strings, descending toward the nut, or anchored
//   - Rhythm lab: odd meters (5/4, 7/4, 3/4, 4/4) and Metal/Prog picking grids with palm mutes & accents
import { useMemo, useState } from 'react'
import { useInstrument } from '../instrument'
import { EX_SCALES } from '../tabs/exercises'
import { saveSong, type SongDoc } from '../tabs/library'
import { Chips, KeyPicker, usePersist } from '../components/Controls'
import { Preview } from '../components/ProgressionTabs'
import { rig } from '../audio/rig'
import {
  RHYTHM_FEELS, SCALE_PATTERNS, STRETCH_SHAPES, SUBS,
  bestBpmFor, removeLabDrill, rhythmLabSong, saveLabDrill, savedLabDrills, scaleBuilderSong, stretchRackSong,
  type RhythmFeel, type SavedLabDrill, type ScaleLayout, type ScalePattern, type StretchMode, type StretchShape, type SubId,
} from './drillLab'

type LabMode = 'scale' | 'stretch' | 'rhythm'

export function DrillLabPanel({ onOpen }: { onOpen: (d: SongDoc) => void }) {
  const inst = useInstrument()
  const [mode, setMode] = usePersist<LabMode>('dl:mode', 'scale')

  // Scale builder state
  const [scRoot, setScRoot] = usePersist('dl:sc:root', 'A')
  const [scaleId, setScaleId] = usePersist('dl:sc:id', 'minor pentatonic')
  const [layout, setLayout] = usePersist<ScaleLayout>('dl:sc:layout', '3nps')
  const [pos, setPos] = usePersist<number>('dl:sc:pos', 0)
  const [pattern, setPattern] = usePersist<ScalePattern>('dl:sc:pat', 'fours')
  const [scSub, setScSub] = usePersist<SubId>('dl:sc:sub', '16')
  const [scBpm, setScBpm] = usePersist('dl:sc:bpm', 80)

  // Stretch rack state
  const [stFret, setStFret] = usePersist('dl:st:fret', 5)
  const [stShape, setStShape] = usePersist<StretchShape>('dl:st:shape', '124')
  const [stMode, setStMode] = usePersist<StretchMode>('dl:st:mode', 'across')
  const [stLegato, setStLegato] = usePersist('dl:st:legato', false)
  const [stBpm, setStBpm] = usePersist('dl:st:bpm', 66)

  // Rhythm lab state
  const [rhMeter, setRhMeter] = usePersist<3 | 4 | 5 | 7>('dl:rh:meter', 7)
  const [rhFeel, setRhFeel] = usePersist<RhythmFeel>('dl:rh:feel', 'odd')
  const [rhSub, setRhSub] = usePersist<SubId>('dl:rh:sub', '16')
  const [rhRoot, setRhRoot] = usePersist('dl:rh:root', 'E')
  const [rhBars, setRhBars] = usePersist<2 | 4>('dl:rh:bars', 2)
  const [rhBpm, setRhBpm] = usePersist('dl:rh:bpm', 80)

  const [saved, setSaved] = useState<SavedLabDrill[]>(() => savedLabDrills())
  const [saveMsg, setSaveMsg] = useState('')

  const scaleDef = EX_SCALES.find(s => s.id === scaleId) ?? EX_SCALES[0]
  const maxPos = /pentatonic|blues/.test(scaleDef.id) ? 5 : 7
  const safePos = pos >= maxPos ? 0 : pos

  const built = useMemo(() => {
    if (mode === 'scale') {
      const res = scaleBuilderSong({ root: scRoot, scale: scaleDef.id, position: safePos, layout, pattern, sub: scSub, bpm: scBpm }, inst.midis)
      if (!res) return null
      const doc: SongDoc = {
        id: `lab:scale:${inst.id}:${inst.tuning.id}:${scRoot}:${scaleDef.id}:${layout}:${safePos}:${pattern}:${scSub}`,
        title: res.title,
        source: 'lesson',
        inst: inst.id,
        key: { root: scRoot, minor: res.minor },
        song: res.song,
        updated: Date.now(),
      }
      return { doc, minor: res.minor, bpm: scBpm }
    }
    if (mode === 'stretch') {
      const res = stretchRackSong({ startFret: stFret, shape: stShape, mode: stMode, legato: stLegato, bpm: stBpm }, inst.midis)
      if (!res) return null
      const doc: SongDoc = {
        id: `lab:stretch:${inst.id}:${inst.tuning.id}:${stShape}:${stFret}:${stMode}:${stLegato ? 1 : 0}`,
        title: res.title,
        source: 'lesson',
        inst: inst.id,
        song: res.song,
        updated: Date.now(),
      }
      return { doc, minor: false, bpm: stBpm }
    }
    const res = rhythmLabSong({ meter: rhMeter, sub: rhSub, feel: rhFeel, root: rhRoot, bars: rhBars, bpm: rhBpm }, inst.midis)
    if (!res) return null
    const doc: SongDoc = {
      id: `lab:rhythm:${inst.id}:${inst.tuning.id}:${rhMeter}:${rhFeel}:${rhSub}:${rhRoot}:${rhBars}`,
      title: res.title,
      source: 'lesson',
      inst: inst.id,
      key: { root: rhRoot, minor: true },
      song: res.song,
      updated: Date.now(),
    }
    return { doc, minor: true, bpm: rhBpm }
  }, [mode, inst, scRoot, scaleDef.id, layout, safePos, pattern, scSub, scBpm, stFret, stShape, stMode, stLegato, stBpm, rhMeter, rhSub, rhFeel, rhRoot, rhBars, rhBpm])

  const inputKind = rig() === 'pedal' ? 'pedal' : 'mic'
  const best = built ? bestBpmFor(built.doc.id, inputKind) : null

  async function saveCurrentPreset() {
    if (!built) return
    const params: Record<string, string | number | boolean> = mode === 'scale'
      ? { scRoot, scaleId: scaleDef.id, layout, pos: safePos, pattern, scSub, scBpm }
      : mode === 'stretch'
        ? { stFret, stShape, stMode, stLegato, stBpm }
        : { rhMeter, rhFeel, rhSub, rhRoot, rhBars, rhBpm }
    try { await saveSong(built.doc) } catch { /* saved list still works */ }
    setSaved(saveLabDrill({ id: built.doc.id, title: built.doc.title, mode, docId: built.doc.id, bpm: built.bpm, params }))
    setSaveMsg('Saved! Added to your presets and Today\'s practice.')
  }

  function applyPreset(p: SavedLabDrill) {
    setMode(p.mode)
    if (p.mode === 'scale') {
      setScRoot(String(p.params.scRoot ?? 'A'))
      setScaleId(String(p.params.scaleId ?? 'minor pentatonic'))
      setLayout((p.params.layout as ScaleLayout) ?? '3nps')
      setPos(Number(p.params.pos ?? 0))
      setPattern((p.params.pattern as ScalePattern) ?? 'fours')
      setScSub((p.params.scSub as SubId) ?? '16')
      setScBpm(Number(p.params.scBpm ?? 80))
    } else if (p.mode === 'stretch') {
      setStFret(Number(p.params.stFret ?? 5))
      setStShape((p.params.stShape as StretchShape) ?? '124')
      setStMode((p.params.stMode as StretchMode) ?? 'across')
      setStLegato(Boolean(p.params.stLegato))
      setStBpm(Number(p.params.stBpm ?? 66))
    } else {
      setRhMeter((Number(p.params.rhMeter ?? 7) as 3 | 4 | 5 | 7))
      setRhFeel((p.params.rhFeel as RhythmFeel) ?? 'odd')
      setRhSub((p.params.rhSub as SubId) ?? '16')
      setRhRoot(String(p.params.rhRoot ?? 'E'))
      setRhBars((Number(p.params.rhBars ?? 2) as 2 | 4))
      setRhBpm(Number(p.params.rhBpm ?? 80))
    }
    setSaveMsg('')
  }

  return (
    <div className="stack" style={{ gap: 10 }} data-testid="drill-lab">
      <div className="seg" role="group" aria-label="Drill builder mode">
        {([['scale', 'Scale builder'], ['stretch', 'Stretch rack'], ['rhythm', 'Rhythm lab']] as const).map(([id, label]) => (
          <button key={id} aria-pressed={mode === id} onClick={() => { setMode(id); setSaveMsg('') }}>{label}</button>
        ))}
      </div>

      {saved.length > 0 && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }} data-testid="drill-lab-saved">
          <span className="small muted">Saved:</span>
          {saved.map(p => (
            <span key={p.id} className="row" style={{ gap: 2 }}>
              <button className={`chip${built?.doc.id === p.id ? ' on' : ''}`} aria-pressed={built?.doc.id === p.id} onClick={() => applyPreset(p)}>{p.title.replace(/^(Scale|Stretch|Rhythm) lab · /, '')}</button>
              <button className="btn icon-btn" aria-label={`Remove ${p.title}`} onClick={() => setSaved(removeLabDrill(p.id))} style={{ minHeight: 28, minWidth: 28, padding: '0 6px' }}>✕</button>
            </span>
          ))}
        </div>
      )}

      {mode === 'scale' && (
        <div className="stack" style={{ gap: 8 }}>
          <KeyPicker value={scRoot} onChange={setScRoot} />
          <div className="ex-lab-grid">
            <label className="field">
              <span>Scale</span>
              <select className="select" value={scaleDef.id} onChange={e => setScaleId(e.target.value)}>
                {EX_SCALES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Sequence</span>
              <select className="select" value={pattern} onChange={e => setPattern(e.target.value as ScalePattern)}>
                {SCALE_PATTERNS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Subdivision</span>
              <select className="select" value={scSub} onChange={e => setScSub(e.target.value as SubId)}>
                {SUBS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Chips label="Layout" items={[
              { id: '3nps' as ScaleLayout, label: '3 per string' },
              { id: 'position' as ScaleLayout, label: 'Box position' },
              { id: 'oneString' as ScaleLayout, label: '1 string' },
            ]} value={layout} onChange={setLayout} />
            {layout !== 'oneString' && (
              <label className="field" style={{ minWidth: 130 }}>
                <span>Position</span>
                <select className="select" value={safePos} onChange={e => setPos(Number(e.target.value))}>
                  {Array.from({ length: maxPos }, (_, i) => <option key={i} value={i}>Position {i + 1}</option>)}
                  <option value={-1}>All positions</option>
                </select>
              </label>
            )}
          </div>
          <label className="field ex-tempo">
            <span>Tempo: <b>{scBpm}</b> BPM</span>
            <input type="range" min={40} max={200} step={2} value={scBpm} onChange={e => setScBpm(Number(e.target.value))} />
          </label>
        </div>
      )}

      {mode === 'stretch' && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="ex-lab-grid">
            <label className="field">
              <span>Stretch shape</span>
              <select className="select" value={stShape} onChange={e => setStShape(e.target.value as StretchShape)}>
                {STRETCH_SHAPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Mode</span>
              <select className="select" value={stMode} onChange={e => setStMode(e.target.value as StretchMode)}>
                <option value="across">Across strings</option>
                <option value="descend">Step toward the nut</option>
                <option value="anchor">Anchored adjacent pairs</option>
              </select>
            </label>
            <label className="field">
              <span>Start fret: <b>{stFret}</b></span>
              <input type="range" min={1} max={12} step={1} value={stFret} onChange={e => setStFret(Number(e.target.value))} />
            </label>
          </div>
          <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="ex-check"><input type="checkbox" checked={stLegato} onChange={e => setStLegato(e.target.checked)} /> Hammer-ons ascending, pull-offs descending</label>
            <label className="field ex-tempo" style={{ flex: '1 1 180px' }}>
              <span>Tempo: <b>{stBpm}</b> BPM</span>
              <input type="range" min={40} max={140} step={2} value={stBpm} onChange={e => setStBpm(Number(e.target.value))} />
            </label>
          </div>
        </div>
      )}

      {mode === 'rhythm' && (
        <div className="stack" style={{ gap: 8 }}>
          <KeyPicker label="Root note" value={rhRoot} onChange={setRhRoot} />
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Chips label="Meter" items={[
              { id: 4 as const, label: '4/4' },
              { id: 3 as const, label: '3/4' },
              { id: 5 as const, label: '5/4' },
              { id: 7 as const, label: '7/4' },
            ]} value={rhMeter} onChange={setRhMeter} />
            <Chips label="Bars" items={[{ id: 2 as const, label: '2 bars' }, { id: 4 as const, label: '4 bars' }]} value={rhBars} onChange={setRhBars} />
          </div>
          <div className="ex-lab-grid">
            <label className="field">
              <span>Feel</span>
              <select className="select" value={rhFeel} onChange={e => setRhFeel(e.target.value as RhythmFeel)}>
                {RHYTHM_FEELS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </label>
            {(rhFeel === 'straight' || rhFeel === 'tap') && (
              <label className="field">
                <span>Subdivision</span>
                <select className="select" value={rhSub} onChange={e => setRhSub(e.target.value as SubId)}>
                  {SUBS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
            )}
            <label className="field ex-tempo">
              <span>Tempo: <b>{rhBpm}</b> BPM</span>
              <input type="range" min={45} max={180} step={2} value={rhBpm} onChange={e => setRhBpm(Number(e.target.value))} />
            </label>
          </div>
        </div>
      )}

      {built ? (
        <>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn primary" onClick={() => onOpen(built.doc)}>Open in Play</button>
            <button className="btn" onClick={() => void saveCurrentPreset()} data-testid="drill-lab-save">★ Save preset</button>
            {best && <span className="small muted">Best: {best} BPM</span>}
          </div>
          {saveMsg && <p className="small muted" role="status" style={{ margin: 0 }}>{saveMsg}</p>}
          <Preview doc={built.doc} minor={built.minor} />
        </>
      ) : (
        <p className="notice small" style={{ margin: 0 }}>That combination doesn't fit on this instrument's range. Try another key or position.</p>
      )}
    </div>
  )
}

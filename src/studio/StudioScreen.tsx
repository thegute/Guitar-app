// The beat maker: finger-drum on lit pads (several fingers at once), play chords on a keyboard with a chord helper,
// record loops that lock to the beat (by foot with a pedal), and practise guitar over what you made. Edit mode has the
// step grid, the piano roll and the mix. One clock runs it all (transport.ts); hits recorded while ● is on snap to
// the grid. Inner Fold screen: pads and keys side by side. Half-folded: the grid on top, pads on the bottom half.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { audio } from '../audio/engine'
import { KITS, kitInfo, prepareKit, type KitId, type Voice } from '../audio/drums'
import { InputRecorder } from '../audio/looper'
import { kindOf, latencyMs } from '../audio/gear'
import { usePersist } from '../components/Controls'
import { Fold } from '../components/Fold'
import { Win, WinArea } from '../components/Win'
import { Fretboard } from '../components/Fretboard'
import { TabView } from '../components/TabView'
import { HandGuide } from '../components/HandGuide'
import { usePedals, type PedalAction } from '../controls/pedals'
import { useFoldPosture } from '../play/fold'
import { useInstrument } from '../instrument'
import { exerciseCatalog } from '../exercises/catalog'
import { FLATS, KEYS, SHARPS, keyPrefersFlats, pc } from '../theory/notes'
import { scaleById, scaleInfo } from '../theory/scales'
import { askAssistant } from '../assistant/bus'
import {
  PADS, STARTERS, deleteStored, loadBeat, newId, onBeatChange, padsFor, saveBeat, savedBeats, setBars, storeBeat, totalSteps, voiceLabel,
  PATTERNS, patternLayer, type Beat, type DrumLayer, type PNote, type Pattern, type Track,
} from './beat'
import { CHORD_TYPES, INSTRS, INSTR_GROUPS, chordNotes, instr, keyChord, loadInstr, type Voicing } from './sounds'
import { StudioTransport, type LoopLayer } from './transport'
import { deleteLoop, fitToBars, gridOffset, levelLoop, loopsFor, rotate, saveLoop } from './loops'
import { beatChords, scalesFor } from './practice'
import { guessPads, loadMyPads, loadSample, mySounds, mySoundsAvailable, pickSoundFolder, saveMySounds, type MySounds } from './mySounds'

type SetBeat = (f: Beat | ((b: Beat) => Beat), remember?: boolean) => void
const QUANT: { id: number; label: string }[] = [{ id: 1, label: '1/16' }, { id: 2, label: '1/8' }, { id: 4, label: '1/4' }, { id: 0, label: 'Off' }]
const noteName = (m: number, flats: boolean) => (flats ? FLATS : SHARPS)[m % 12] + (Math.floor(m / 12) - 1)
/** The speaker's own delay (what a finger hears late): taken off hits recorded on the pads and keys. */
const outLatency = () => { const c = audio() as AudioContext & { outputLatency?: number }; return (c.outputLatency || 0) + (c.baseLatency || 0.01) }
/** Restart a CSS animation without a forced layout: switch between two classes that run the same keyframes. */
function flash(el: Element, cls: string) {
  const b = cls + '-b'
  if (el.classList.contains(cls)) { el.classList.remove(cls); el.classList.add(b) } else { el.classList.remove(b); el.classList.add(cls) }
}
const useStep = (t: StudioTransport) => useSyncExternalStore(f => t.onStep(f), () => t.step)

export function StudioScreen({ active }: { active: boolean }) {
  const [beat, setBeatRaw] = useState<Beat>(() => loadBeat())
  const [view, setView] = usePersist<'pads' | 'keys'>('studioTableView', 'pads')
  const [playing, setPlaying] = useState(false)
  const [recording, setRecording] = useState(false)
  const [quant, setQuant] = usePersist('studioQuant', 1)
  const [msg, setMsg] = useState('')
  const [settings, setSettings] = usePersist('studioSettings', false)
  const [width, setWidth] = useState(400)
  const box = useRef<HTMLDivElement>(null)
  const posture = useFoldPosture()
  const t = useRef<StudioTransport | null>(null)
  const tr = () => (t.current ??= new StudioTransport(beat))
  const history = useRef<Beat[]>([])

  const setBeat: SetBeat = useCallback((next, remember = true) => {
    setBeatRaw(prev => {
      const b = typeof next === 'function' ? next(prev) : next
      if (remember && b !== prev) { history.current.push(prev); if (history.current.length > 40) history.current.shift() }
      return b
    })
  }, [])
  useEffect(() => { tr().setBeat(beat); const id = setTimeout(() => saveBeat(beat), 300); return () => clearTimeout(id) }, [beat]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => onBeatChange(b => setBeat(b)), [setBeat])
  useEffect(() => { void prepareKit(beat.kit) }, [beat.kit])
  useEffect(() => () => t.current?.stop(), [])
  useEffect(() => { if (!active && t.current?.playing) { t.current.stop(); setPlaying(false); setRecording(false) } }, [active])
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  // your own pad sounds (phone)
  const [mine, setMine] = useState<MySounds>(mySounds)
  useEffect(() => { void loadMyPads(mine).then(m => { tr().custom = m }) }, [mine]) // eslint-disable-line react-hooks/exhaustive-deps

  const play = (countIn = 0) => { void audio().resume(); tr().start(countIn); setPlaying(true) }
  const stop = () => { loops.cancel(); t.current?.stop(); setPlaying(false); setRecording(false) }
  const toggleRecord = () => {
    take.current = null
    if (recording) { setRecording(false); setMsg(''); return }
    setRecording(true)
    if (!tr().playing) play(4)
    setMsg('Recording: each time round the loop, what you play on the pads becomes a new layer, snapped to the grid. Keys go into the piano roll.')
  }
  // pads recorded with ● go into a new drum layer each time round the loop, so you build a beat loop by loop
  const take = useRef<{ id: string; pass: number; hits: number } | null>(null)
  const recordHit = (voice: Voice, vel: number) => {
    const s = recStep()
    const x = t.current
    if (s === null || !x) return
    const pass = Math.floor((audio().currentTime - outLatency() - x.t0 + x.stepDur / 2) / x.loopDur)
    let tk = take.current
    const fresh = !tk || (tk.pass !== pass && tk.hits > 0)
    if (fresh) tk = take.current = { id: newId(), pass, hits: 0 }
    tk!.pass = pass
    tk!.hits++
    const id = tk!.id
    setBeat(b => {
      const n = totalSteps(b)
      const layers = b.layers ?? []
      const L = layers.find(l => l.id === id) ?? { id, label: `Take ${layers.filter(l => l.label.startsWith('Take')).length + 1}`, rows: [] }
      const rows = L.rows.some(r => r.voice === voice) ? L.rows : [...L.rows, { voice, steps: Array(n).fill(0) }]
      const next = { ...L, rows: rows.map(r => (r.voice === voice ? { ...r, steps: r.steps.map((v, i) => (i === s ? Math.max(v, vel) : v)) } : r)) }
      return { ...b, layers: layers.some(l => l.id === id) ? layers.map(l => (l.id === id ? next : l)) : [...layers, next] }
    }, fresh)
  }
  const undo = () => { const p = history.current.pop(); if (p) setBeat(p, false) }
  /** The step a hit made right now belongs to (snapped to the grid), or null when not recording. */
  const recStep = (): number | null => {
    const x = t.current
    if (!recording || !x?.playing) return null
    const n = totalSteps(beat)
    const pos = x.position(audio().currentTime - outLatency())
    if (!quant) return Math.floor(pos) % n
    return (Math.round(pos / quant) * quant) % n
  }

  const loops = useLoops(tr(), beat, setBeat, play)
  // foot pedal: press = record the next loop, the other pedal = undo the last loop, hold = stop (or plain start/stop)
  const [pedalMode, setPedalMode] = usePersist<'loop' | 'play'>('studioPedal', 'loop')
  usePedals({
    startStop: () => { if (pedalMode === 'loop') loops.record(); else if (tr().playing) stop(); else play(0) },
    record: () => loops.record(),
    restart: () => { if (pedalMode === 'loop') loops.undo(); else if (tr().playing) play(0) },
    hold: (a: PedalAction) => { if (a === 'startStop' || a === 'record') stop() },
  })

  const wide = width >= 720
  const flats = keyPrefersFlats(beat.key, beat.minor)
  const header = (
    <Win id="top" title="Controls" className="panel st-top" bodyClass="">
      <div className="st-transport">
        <button className={`btn primary st-play${playing ? ' on' : ''}`} onClick={() => (playing ? stop() : play())} aria-label={playing ? 'Stop' : 'Play'}>{playing ? '■' : '▶'}</button>
        <button className={`btn st-rec${recording ? ' on' : ''}`} onClick={toggleRecord} aria-pressed={recording} aria-label="Record what you play into the beat">●</button>
        <BeatLight t={tr()} playing={playing} />
        <Tempo bpm={beat.bpm} onChange={bpm => setBeat(b => ({ ...b, bpm }))} />
        <span className="st-spacer" />
        <button className="btn sm" onClick={undo} disabled={!history.current.length} aria-label="Undo">↶</button>
        <button className="btn sm" onClick={() => askAssistant(`Give me ideas for my beat "${beat.name}"`, 'beat')}>✨ Ideas</button>
      </div>
      <div className="st-row">
        <label className="field st-field"><span>Start from</span>
          <select className="select" value="" onChange={e => { const s = STARTERS.find(x => x.id === e.target.value); if (s) { setBeat(s.make()); setMsg(`${s.label}: press ▶, then change anything.`) } }}>
            <option value="">A style…</option>
            {STARTERS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="field st-field"><span>Drum kit</span>
          <select className="select" value={beat.kit} onChange={e => setBeat(b => ({ ...b, kit: e.target.value as KitId }))} title={kitInfo(beat.kit).hint}>
            {KITS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </label>
        <button className="btn sm st-more" aria-expanded={settings} onClick={() => setSettings(!settings)}>{settings ? 'Fewer settings' : 'Key, bars, save…'}</button>
      </div>
      {settings && (
        <>
          <div className="st-row">
            <label className="field st-field"><span>Key</span>
              <select className="select" value={`${beat.key}${beat.minor ? 'm' : ''}`} onChange={e => { const v = e.target.value; setBeat(b => ({ ...b, key: v.replace('m', ''), minor: v.endsWith('m') })) }}>
                {KEYS.flatMap(k => [k, k + 'm']).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label className="field st-field"><span>Bars</span>
              <span className="seg st-bars" role="group" aria-label="Bars">
                {([1, 2, 4, 8] as const).map(n => <button key={n} aria-pressed={beat.bars === n} onClick={() => setBeat(b => setBars(b, n))}>{n}</button>)}
              </span>
            </label>
            <label className="field st-field st-swing"><span>Swing {Math.round((beat.swing / 0.33) * 100)}%</span>
              <input type="range" min={0} max={0.33} step={0.01} value={beat.swing} onChange={e => setBeat(b => ({ ...b, swing: Number(e.target.value) }), false)} />
            </label>
            <label className="field st-field"><span>Recording snaps to</span>
              <select className="select" value={quant} onChange={e => setQuant(Number(e.target.value))}>
                {QUANT.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
              </select>
            </label>
          </div>
          <SaveRow beat={beat} setBeat={b => { setBeat(b); setMsg(`Opened "${b.name}".`) }} />
        </>
      )}
      {msg && <p className="small muted" style={{ margin: 0 }} role="status">{msg}</p>}
    </Win>
  )

  const pads = <Pads t={tr()} beat={beat} setBeat={setBeat} recordHit={recordHit} mine={mine} setMine={setMine} />
  const keys = <Keys t={tr()} beat={beat} setBeat={setBeat} recStep={recStep} quant={quant} />
  const tabletop = active && posture.tabletop

  return (
    <div className="stack studio" style={{ gap: 10 }} ref={box}>
      <WinArea area="studio" className={`st-wins${wide ? ' wide' : ''}`} defaultHidden={['steps', 'roll', 'mix', 'practice']}>
        {header}
        {pads}
        <Win id="layers" title="Drum layers" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}><Layers beat={beat} setBeat={setBeat} /></Win>
        {keys}
        <Looper t={tr()} beat={beat} loops={loops} playing={playing} play={play} pedalMode={pedalMode} setPedalMode={setPedalMode} />
        <Win id="steps" title="Step grid" className="panel"><Steps beat={beat} setBeat={setBeat} t={tr()} /></Win>
        <Roll t={tr()} beat={beat} setBeat={setBeat} />
        <Mix t={tr()} beat={beat} setBeat={setBeat} />
        <Practice t={tr()} beat={beat} flats={flats} />
      </WinArea>
      {tabletop && (
        <div className="st-table" style={{ gridTemplateRows: `${posture.top}px ${posture.hinge}px 1fr` }} role="region" aria-label="Beat maker, half-folded">
          <div className="st-table-top">
            <div className="st-transport">
              <button className={`btn primary st-play${playing ? ' on' : ''}`} onClick={() => (playing ? stop() : play())} aria-label={playing ? 'Stop' : 'Play'}>{playing ? '■' : '▶'}</button>
              <button className={`btn st-rec${recording ? ' on' : ''}`} onClick={toggleRecord} aria-pressed={recording} aria-label="Record what you play into the beat">●</button>
              <BeatLight t={tr()} playing={playing} />
              <Tempo bpm={beat.bpm} onChange={bpm => setBeat(b => ({ ...b, bpm }))} />
              <span className="st-spacer" />
              <div className="seg" role="group" aria-label="Bottom half">
                <button aria-pressed={view === 'pads'} onClick={() => setView('pads')}>Pads</button>
                <button aria-pressed={view === 'keys'} onClick={() => setView('keys')}>Keys</button>
              </div>
            </div>
            <Steps beat={beat} setBeat={setBeat} t={tr()} compact />
          </div>
          <div aria-hidden />
          <div className="st-table-bottom">{view === 'keys' ? keys : pads}</div>
        </div>
      )}
    </div>
  )
}

// ───────────────────────── the beat light: count-in numbers, then a flash on every beat (bar 1 brighter)
function BeatLight({ t, playing, big = false, label }: { t: StudioTransport; playing: boolean; big?: boolean; label?: string }) {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const d = el.current
    if (!d) return
    const b = d.querySelector('b')!
    if (!playing) { d.dataset.state = 'off'; b.textContent = label ?? ''; return }
    let raf = 0, last = ''
    const tick = () => {
      const now = audio().currentTime
      const spb = 60 / t.beat.bpm
      let state: string, text: string
      if (now < t.t0) { state = 'count'; text = String(Math.ceil((t.t0 - now) / spb - 0.001)) }
      else {
        const pos = t.position(now)
        const beat = Math.floor(pos / 4)
        state = pos / 4 - beat < 0.28 ? (beat % 4 === 0 ? 'one' : 'beat') : 'idle'
        text = label ?? `${Math.floor(beat / 4) + 1}.${(beat % 4) + 1}`
      }
      if (state + text !== last) { d.dataset.state = state; b.textContent = text; last = state + text }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, t, label])
  return <div ref={el} className={`st-light${big ? ' big' : ''}`} data-state="off" aria-hidden><b /></div>
}

// ───────────────────────── tempo with tap
function Tempo({ bpm, onChange }: { bpm: number; onChange: (b: number) => void }) {
  const taps = useRef<number[]>([])
  const set = (b: number) => onChange(Math.max(40, Math.min(220, Math.round(b))))
  return (
    <div className="st-tempo" role="group" aria-label="Tempo">
      <button className="btn sm" onClick={() => set(bpm - 1)} aria-label="Slower">−</button>
      <input className="input" inputMode="numeric" value={bpm} onChange={e => { const v = Number(e.target.value); if (v >= 40 && v <= 220) set(v) }} aria-label="Beats per minute" />
      <button className="btn sm" onClick={() => set(bpm + 1)} aria-label="Faster">+</button>
      <button className="btn sm" onPointerDown={() => {
        const now = performance.now()
        taps.current = [...taps.current.filter(x => now - x < 2500), now].slice(-6)
        if (taps.current.length >= 3) { const d = (taps.current[taps.current.length - 1] - taps.current[0]) / (taps.current.length - 1); set(60000 / d) }
      }}>Tap</button>
    </div>
  )
}

// ───────────────────────── name / save / open
function SaveRow({ beat, setBeat }: { beat: Beat; setBeat: (b: Beat) => void }) {
  const [list, setList] = useState(savedBeats)
  const [name, setName] = useState(beat.name)
  useEffect(() => setName(beat.name), [beat.name])
  return (
    <div className="st-row">
      <label className="field st-field"><span>Name</span>
        <input className="input" value={name} onChange={e => setName(e.target.value)} onBlur={() => name.trim() && name.trim() !== beat.name && setBeat({ ...beat, name: name.trim() })} />
      </label>
      <button className="btn sm" onClick={() => { const b = { ...beat, name: name.trim() || beat.name }; storeBeat(b); setList(savedBeats()) }}>Save</button>
      {list.length > 0 && (
        <label className="field st-field"><span>My beats</span>
          <select className="select" value="" onChange={e => { const b = list.find(x => x.name === e.target.value); if (b) setBeat(b) }}>
            <option value="">Open…</option>
            {list.map(b => <option key={b.name} value={b.name}>{b.name} ({b.bpm} BPM)</option>)}
          </select>
        </label>
      )}
      {list.some(b => b.name === beat.name) && <button className="btn sm ghost" onClick={() => { deleteStored(beat.name); setList(savedBeats()) }}>Delete saved</button>}
    </div>
  )
}

// ───────────────────────── pads (finger drumming)
const PAD_HUE: Partial<Record<Voice, number>> = { kick: 0, snare: 28, clap: 45, rim: 60, ghost: 28, hat: 180, open: 195, pedal: 170, crash: 210, ride: 225, bell: 240, china: 255, splash: 215, tom1: 300, tom2: 310, tom3: 320, impact: 350, riser: 270, snap: 140 }
const MAIN: Voice[] = ['kick', 'snare', 'hat']
function Pads({ t, beat, recordHit, mine, setMine }: { t: StudioTransport; beat: Beat; setBeat: SetBeat; recordHit: (v: Voice, vel: number) => void; mine: MySounds; setMine: (m: MySounds) => void }) {
  const [page, setPage] = usePersist<'kit' | 'perc'>('studioPadPage', 'kit')
  const [repeat, setRepeat] = usePersist<number>('studioRepeat', 0)
  const [size, setSize] = usePersist<'s' | 'm' | 'l'>('studioPadSize', 'm')
  // the three you use most come first, as big pads with room between them
  const voices = page === 'kit' ? [...MAIN, ...padsFor(beat.kit).filter(v => !MAIN.includes(v))] : PADS.perc
  const grid = useRef<HTMLDivElement>(null)
  const repeats = useRef(new Map<number, ReturnType<typeof setInterval>>())
  const rows = useRef(beat.rows)
  rows.current = beat.rows
  // light up the pads the beat plays, straight on the page (no redraw of the screen on every step)
  useEffect(() => t.onStep(step => {
    const el = grid.current
    if (!el || step < 0) return
    for (const r of rows.current) {
      if (r.mute || !(r.steps[step] > 0)) continue
      const pad = el.querySelector(`[data-voice="${r.voice}"]`)
      if (pad) flash(pad, 'lit')
    }
  }), [t])
  const down = (e: React.PointerEvent<HTMLButtonElement>, voice: Voice) => {
    e.preventDefault()
    // the sound first, before anything else
    const r = e.currentTarget.getBoundingClientRect()
    const vel = e.pressure > 0 && e.pressure !== 0.5 ? Math.max(0.35, Math.min(1, e.pressure * 1.4)) : 0.55 + 0.45 * Math.min(1, Math.max(0, (r.bottom - e.clientY) / r.height))
    t.hit(voice, vel)
    flash(e.currentTarget, 'hit')
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    recordHit(voice, vel)
    if (repeat > 0) {
      // note repeat: keeps hitting on the grid while you hold the pad (in time with the beat when it's running)
      const every = t.stepDur * repeat
      const ctx = audio()
      let next = t.playing ? t.t0 + Math.ceil((ctx.currentTime - t.t0) / every) * every : ctx.currentTime + every
      const id = setInterval(() => { while (next < ctx.currentTime + 0.05) { t.hit(voice, vel * 0.85); next += every } }, 10)
      repeats.current.set(e.pointerId, id)
    }
  }
  const up = (e: React.PointerEvent<HTMLButtonElement>) => {
    const id = repeats.current.get(e.pointerId)
    if (id) { clearInterval(id); repeats.current.delete(e.pointerId) }
  }
  useEffect(() => () => repeats.current.forEach(clearInterval), [])
  return (
    <Win id="pads" title="Drum pads" className="panel st-padpanel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div className="seg" role="group" aria-label="Pad page">
          <button aria-pressed={page === 'kit'} onClick={() => setPage('kit')}>Drums</button>
          <button aria-pressed={page === 'perc'} onClick={() => setPage('perc')}>Percussion</button>
        </div>
        <div className="seg" role="group" aria-label="Pad size">
          {(['s', 'm', 'l'] as const).map(z => <button key={z} aria-pressed={size === z} onClick={() => setSize(z)}>{z === 's' ? 'Small' : z === 'm' ? 'Medium' : 'Big'}</button>)}
        </div>
        <label className="field st-field st-inline"><span>Hold to repeat</span>
          <select className="select sm" value={repeat} onChange={e => setRepeat(Number(e.target.value))}>
            <option value={0}>Off</option><option value={4}>1/4</option><option value={2}>1/8</option><option value={1}>1/16</option><option value={0.5}>1/32</option>
          </select>
        </label>
      </div>
      <div className={`st-pads size-${size}`} ref={grid}>
        {voices.map(v => (
          <button key={v} data-voice={v} className={`st-pad${page === 'kit' && MAIN.includes(v) ? ' big' : ''}${mine.map[v] ? ' mine' : ''}`} style={{ ['--h' as string]: String(PAD_HUE[v] ?? 120) }}
            onPointerDown={e => down(e, v)} onPointerUp={up} onPointerCancel={up} onContextMenu={e => e.preventDefault()}>
            <span>{voiceLabel(v)}</span>
          </button>
        ))}
      </div>
      <LagNote />
      {mySoundsAvailable() && <MySoundsPanel pads={voices} mine={mine} setMine={setMine} />}
    </Win>
  )
}

/** Only when the phone's sound output is slow (usually Bluetooth headphones): says so, with the measured delay. */
function LagNote() {
  const [ms, setMs] = useState(0)
  useEffect(() => {
    const c = audio() as AudioContext & { outputLatency?: number }
    const read = () => setMs(Math.round(((c.outputLatency || 0) + (c.baseLatency || 0)) * 1000))
    read()
    const id = setInterval(read, 3000)
    return () => clearInterval(id)
  }, [])
  if (ms < 90) return null
  return <p className="small st-lag" role="note">Your sound output adds about {ms} ms, so the pads will feel late. That's usually Bluetooth headphones: the phone speaker, wired or USB-C headphones, or your amp are much quicker.</p>
}

function MySoundsPanel({ pads, mine, setMine }: { pads: Voice[]; mine: MySounds; setMine: (m: MySounds) => void }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const count = Object.keys(mine.map).length
  const choose = async () => {
    setBusy(true)
    try {
      const r = await pickSoundFolder()
      if (!r) { setBusy(false); return }
      const guess = guessPads(r.files, [...new Set([...pads, ...PADS.perc])])
      const map: MySounds['map'] = {}
      for (const [v, i] of Object.entries(guess)) map[v as Voice] = r.files[i as number]
      const next = { folder: r.folder, files: r.files, map }
      saveMySounds(next)
      setMine(next)
      setNote(r.files.length ? `Found ${r.files.length} sounds; ${Object.keys(map).length} matched to pads by their names. Change any below.` : 'No audio files (up to 2 MB each) in that folder.')
    } catch { setNote("Couldn't open that folder.") }
    setBusy(false)
  }
  const assign = (v: Voice, uri: string) => {
    const f = mine.files.find(x => x.uri === uri)
    const map = { ...mine.map }
    if (f) map[v] = f; else delete map[v]
    const next = { ...mine, map }
    saveMySounds(next)
    setMine(next)
    if (f) void loadSample(f)
  }
  return (
    <Fold id="studioMine" title="Your own sounds" summary={count ? `${count} pad${count > 1 ? 's' : ''} from ${mine.folder?.name ?? 'your folder'}` : 'use drum samples on your phone'}
      hint="Pick a folder of drum samples on your phone (WAV or MP3 one-shots). They're played from where they are: never copied into the app, a backup or the web version.">
      <div className="stack" style={{ gap: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={() => void choose()} disabled={busy}>{busy ? 'Reading…' : mine.folder ? 'Choose another folder' : 'Choose a folder of sounds'}</button>
          {count > 0 && <button className="btn ghost sm" onClick={() => { const next = { ...mine, map: {} }; saveMySounds(next); setMine(next) }}>Back to the kit's sounds</button>}
        </div>
        {note && <p className="small" style={{ margin: 0 }} role="status">{note}</p>}
        {mine.files.length > 0 && (
          <div className="st-mine">
            {pads.map(v => (
              <label key={v} className="field st-field"><span>{voiceLabel(v)}</span>
                <select className="select sm" value={mine.map[v]?.uri ?? ''} onChange={e => assign(v, e.target.value)}>
                  <option value="">Kit sound</option>
                  {mine.files.map(f => <option key={f.uri} value={f.uri}>{f.name}</option>)}
                </select>
              </label>
            ))}
          </div>
        )}
      </div>
    </Fold>
  )
}

// ───────────────────────── step grid
const PAINT = [{ v: 0.45, label: 'Soft' }, { v: 0.8, label: 'Normal' }, { v: 1, label: 'Accent' }]
function Steps({ beat, setBeat, t, compact = false }: { beat: Beat; setBeat: SetBeat; t: StudioTransport; compact?: boolean }) {
  const n = totalSteps(beat)
  const step = useStep(t)
  const [paint, setPaint] = useState(0.8)
  const [page, setPage] = useState(0)
  const [wide, setWide] = useState(false)
  const [tools, setTools] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setWide(el.clientWidth >= 720))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const perPage = wide ? Math.min(n, 32) : 16
  const pages = Math.ceil(n / perPage)
  // half-folded: the grid follows the playhead
  const shown = compact && step >= 0 ? Math.floor(step / perPage) : Math.min(page, pages - 1)
  const from = shown * perPage
  const cells = Array.from({ length: perPage }, (_, i) => from + i).filter(i => i < n)
  const toggle = (voice: Voice, i: number) => setBeat(b => ({ ...b, rows: b.rows.map(r => (r.voice === voice ? { ...r, steps: r.steps.map((v, k) => (k === i ? (Math.abs(v - paint) < 0.01 ? 0 : paint) : v)) } : r)) }))
  const fill = (voice: Voice, every: number, offset = 0) => setBeat(b => ({ ...b, rows: b.rows.map(r => (r.voice === voice ? { ...r, steps: r.steps.map((_, k) => (k % every === offset ? paint : 0)) } : r)) }))
  const addable = [...new Set([...padsFor(beat.kit), ...PADS.perc])].filter(v => !beat.rows.some(r => r.voice === v))
  const showTools = !compact && (wide || tools)
  return (
    <section className="stack" style={{ gap: 8 }} ref={box}>
      {!compact && (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <div className="seg" role="group" aria-label="Tap paints">
            {PAINT.map(p => <button key={p.v} aria-pressed={paint === p.v} onClick={() => setPaint(p.v)}>{p.label}</button>)}
          </div>
          {!wide && <button className="btn sm" aria-pressed={tools} onClick={() => setTools(!tools)}>{tools ? 'Done' : 'Row tools'}</button>}
          {pages > 1 && (
            <div className="seg" role="group" aria-label="Which bars">
              {Array.from({ length: pages }, (_, k) => <button key={k} aria-pressed={shown === k} onClick={() => setPage(k)}>{perPage === 16 ? `Bar ${k + 1}` : `Bars ${k * 2 + 1}–${k * 2 + 2}`}</button>)}
            </div>
          )}
        </div>
      )}
      {beat.rows.length === 0 && <p className="muted small" style={{ margin: 0 }}>No drums yet: add a sound below, play the pads with ● on, or start from a style.</p>}
      <div className={`st-grid${showTools ? ' tools' : ''}`} style={{ ['--cols' as string]: String(cells.length) }}>
        {beat.rows.map(r => (
          <div key={r.voice} className={`st-grow${r.mute ? ' muted' : ''}`}>
            <button className="st-rlabel" onClick={() => t.hit(r.voice, 0.85)} title="Hear it">{voiceLabel(r.voice)}</button>
            <div className="st-cells">
              {cells.map(i => (
                <button key={i} className={`st-cell${r.steps[i] > 0 ? ' on' : ''}${i === step ? ' now' : ''}${i % 4 === 0 ? ' beat' : ''}`}
                  style={r.steps[i] > 0 ? { opacity: 0.45 + r.steps[i] * 0.55 } : undefined}
                  onPointerDown={e => { e.preventDefault(); toggle(r.voice, i); if (!(r.steps[i] > 0)) t.hit(r.voice, paint) }} aria-label={`${voiceLabel(r.voice)} step ${i + 1}`} aria-pressed={r.steps[i] > 0} />
              ))}
            </div>
            {showTools && (
              <span className="st-rtools">
                <button className="btn sm ghost" aria-pressed={!!r.mute} onClick={() => setBeat(b => ({ ...b, rows: b.rows.map(x => (x.voice === r.voice ? { ...x, mute: !x.mute } : x)) }))} title="Mute">M</button>
                <select className="select sm" value="" aria-label={`Fill ${voiceLabel(r.voice)}`} onChange={e => { const [ev, off] = e.target.value.split(':').map(Number); if (ev) fill(r.voice, ev, off) }}>
                  <option value="">Fill…</option><option value="16:0">Bar starts</option><option value="4:0">Every beat</option><option value="8:4">Beats 2 and 4</option>
                  <option value="2:0">Every 8th</option><option value="4:2">Off-beats</option><option value="1:0">Every 16th</option><option value="1:99">Clear</option>
                </select>
                <button className="btn sm ghost" onClick={() => setBeat(b => ({ ...b, rows: b.rows.filter(x => x.voice !== r.voice) }))} aria-label={`Remove ${voiceLabel(r.voice)}`}>✕</button>
              </span>
            )}
          </div>
        ))}
      </div>
      {!compact && (
        <label className="field st-field" style={{ maxWidth: 260 }}><span>Add a sound</span>
          <select className="select" value="" onChange={e => { const v = e.target.value as Voice; if (v) setBeat(b => ({ ...b, rows: [...b.rows, { voice: v, steps: Array(n).fill(0) }] })) }}>
            <option value="">Choose…</option>
            {addable.map(v => <option key={v} value={v}>{voiceLabel(v)}</option>)}
          </select>
        </label>
      )}
    </section>
  )
}

// ───────────────────────── keyboard with the chord helper
const isBlack = (m: number) => [1, 3, 6, 8, 10].includes(m % 12)
function trackFor(b: Beat, inst: string): { beat: Beat; track: Track } {
  const found = b.tracks.find(x => x.inst === inst)
  if (found) return { beat: b, track: found }
  const track: Track = { id: newId(), inst, notes: [], vol: 0.8, space: instr(inst).space }
  return { beat: { ...b, tracks: [...b.tracks, track] }, track }
}
function InstrumentSelect({ value, onChange, label = 'Sound', placeholder }: { value: string; onChange: (id: string) => void; label?: string; placeholder?: string }) {
  return (
    <label className="field st-field"><span>{label}</span>
      <select className="select" value={value} onChange={e => onChange(e.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {INSTR_GROUPS.map(g => <optgroup key={g} label={g}>{INSTRS.filter(i => i.group === g).map(i => <option key={i.id} value={i.id}>{i.label}</option>)}</optgroup>)}
      </select>
    </label>
  )
}
const startOctave = (id: string) => { const d = instr(id); return Math.max(24, Math.min(72, d.lo + 12 - (d.lo % 12))) }
function Keys({ t, beat, setBeat, recStep, quant }: { t: StudioTransport; beat: Beat; setBeat: SetBeat; recStep: () => number | null; quant: number }) {
  const [inst, setInst] = usePersist('studioKeysInst', 'grand')
  const [size, setSize] = usePersist<'s' | 'm' | 'l'>('studioKeySize', 'm')
  const [mode, setMode] = usePersist<'off' | 'type' | 'key'>('studioChordMode', 'off')
  const [type, setType] = usePersist('studioChordType', 'maj')
  const [voicing, setVoicing] = usePersist<Voicing>('studioVoicing', 'close')
  const [held, setHeld] = useState<string | null>(null)
  const [lo, setLo] = useState(() => startOctave(inst))
  const [width, setWidth] = useState(360)
  const [shown, setShown] = useState('')
  const [lit, setLit] = useState<Set<number>>(new Set())
  const [last, setLast] = useState<{ pcs: number[]; root: number; label: string } | null>(null)
  const [neck, setNeck] = usePersist('studioKeysNeck', true)
  const guitar = useInstrument()
  const box = useRef<HTMLDivElement>(null)
  const notes = useRef(new Map<number, { stop: () => void; midis: number[]; start: number | null; at: number }>())
  useEffect(() => { void loadInstr(inst) }, [inst])
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const keyW = size === 's' ? 36 : size === 'm' ? 48 : 64
  const whites = Math.max(7, Math.floor(width / keyW))
  const midis: number[] = []
  for (let m = lo, w = 0; w < whites; m++) { midis.push(m); if (!isBlack(m)) w++ }
  const keyPc = pc(beat.key)
  const scale = beat.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]
  const inKey = (m: number) => scale.includes(((m - keyPc) % 12 + 12) % 12)
  const flats = keyPrefersFlats(beat.key, beat.minor)
  const curType = held ?? type
  const chordFor = (m: number): { notes: number[]; label: string } => {
    const name = noteName(m, flats).replace(/-?\d+$/, '')
    if (mode === 'type') { const c = CHORD_TYPES.find(x => x.id === curType)!; return { notes: chordNotes(m, c.ivs, voicing), label: name + (c.id === 'maj' ? '' : c.id === 'min' ? 'm' : c.label) } }
    if (mode === 'key') { const c = keyChord(m, keyPc, beat.minor); if (c) return { notes: chordNotes(m, c.ivs, voicing), label: name + c.label } }
    return { notes: [m], label: noteName(m, flats) }
  }
  const down = (e: React.PointerEvent<HTMLButtonElement>, m: number) => {
    e.preventDefault()
    const { notes: ns, label } = chordFor(m)
    const track = trackFor(beat, inst).track
    const hs = ns.map(x => t.press(track.id, inst, x, 0.75))
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
    e.currentTarget.classList.add('down')
    notes.current.set(e.pointerId, { stop: () => hs.forEach(h => h.stop()), midis: ns, start: recStep(), at: audio().currentTime })
    setShown(label)
    setLit(new Set([...notes.current.values()].flatMap(x => x.midis)))
    setLast({ pcs: [...new Set(ns.map(x => x % 12))], root: m % 12, label })
  }
  const up = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.classList.remove('down')
    const n = notes.current.get(e.pointerId)
    if (!n) return
    n.stop()
    notes.current.delete(e.pointerId)
    setLit(new Set([...notes.current.values()].flatMap(x => x.midis)))
    if (n.start === null) return
    // recorded: as long as the key was held, snapped to the grid
    const heldSteps = (audio().currentTime - n.at) / t.stepDur
    const q = quant || 1
    const l = Math.max(q, Math.round(heldSteps / q) * q)
    setBeat(b => {
      const { beat: b2, track } = trackFor(b, inst)
      const add: PNote[] = n.midis.map(m => ({ s: n.start!, l, m, v: 0.75 }))
      return { ...b2, tracks: b2.tracks.map(x => (x.id === track.id ? { ...x, notes: [...x.notes.filter(o => !(o.s === n.start && n.midis.includes(o.m))), ...add] } : x)) }
    })
  }
  const whiteKeys = midis.filter(m => !isBlack(m))
  return (
    <Win id="keys" title="Keyboard" className="panel st-keypanel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
      <div className="st-row">
        <InstrumentSelect value={inst} onChange={id => { setInst(id); setLo(startOctave(id)) }} />
        <div className="seg" role="group" aria-label="Octave">
          <button onClick={() => setLo(l => Math.max(21, l - 12))} aria-label="Octave down">◀ Oct</button>
          <button onClick={() => setLo(l => Math.min(96, l + 12))} aria-label="Octave up">Oct ▶</button>
        </div>
        <div className="seg" role="group" aria-label="Key size">
          {(['s', 'm', 'l'] as const).map(s => <button key={s} aria-pressed={size === s} onClick={() => setSize(s)}>{s.toUpperCase()}</button>)}
        </div>
      </div>
      <div className="st-row">
        <div className="seg" role="group" aria-label="Chord helper">
          <button aria-pressed={mode === 'off'} onClick={() => setMode('off')}>Notes</button>
          <button aria-pressed={mode === 'type'} onClick={() => setMode('type')}>Chords</button>
          <button aria-pressed={mode === 'key'} onClick={() => setMode('key')}>Chords in {beat.key}{beat.minor ? 'm' : ''}</button>
        </div>
        {mode !== 'off' && (
          <div className="seg" role="group" aria-label="Voicing">
            {([['close', 'Close'], ['open', 'Open'], ['bass', '+ Bass']] as const).map(([id, l]) => <button key={id} aria-pressed={voicing === id} onClick={() => setVoicing(id)}>{l}</button>)}
          </div>
        )}
      </div>
      {mode === 'type' && (
        <div className="st-types" aria-label="Chord type: tap to choose, or hold one while you play">
          {CHORD_TYPES.map(c => (
            <button key={c.id} className={`chip${curType === c.id ? ' on' : ''}`} aria-pressed={curType === c.id}
              onPointerDown={e => { e.preventDefault(); setHeld(c.id); try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ } }}
              onPointerUp={() => { setType(c.id); setHeld(null) }} onPointerCancel={() => setHeld(null)}>{c.label}</button>
          ))}
        </div>
      )}
      <div className="st-shown readout" aria-live="polite">{shown || ' '}</div>
      <div className="st-keys" ref={box} style={{ ['--kw' as string]: `${100 / whiteKeys.length}%`, height: size === 's' ? 150 : size === 'm' ? 200 : 260 }}>
        {whiteKeys.map(m => (
          <button key={m} className={`st-key white${inKey(m) ? ' inkey' : ''}${m % 12 === keyPc ? ' root' : ''}${lit.has(m) ? ' chord' : ''}`}
            onPointerDown={e => down(e, m)} onPointerUp={up} onPointerCancel={up} onContextMenu={e => e.preventDefault()} aria-label={noteName(m, flats)}>
            {lit.has(m) && <span className="st-kname">{noteName(m, flats).replace(/-?\d+$/, '')}</span>}
            <span>{m % 12 === 0 || m % 12 === keyPc ? noteName(m, flats) : ''}</span>
          </button>
        ))}
        {midis.filter(isBlack).map(m => {
          const wi = whiteKeys.filter(x => x < m).length
          return (
            <button key={m} className={`st-key black${inKey(m) ? ' inkey' : ''}${lit.has(m) ? ' chord' : ''}`} style={{ left: `calc(${wi} * var(--kw) - var(--kw) * 0.3)` }}
              onPointerDown={e => down(e, m)} onPointerUp={up} onPointerCancel={up} onContextMenu={e => e.preventDefault()} aria-label={noteName(m, flats)} />
          )
        })}
      </div>
      <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
        <span className="small muted">{last ? `${last.label} on the guitar neck: gold notes, the root in red` : 'Play a chord to see it on the guitar neck'}</span>
        <button className="btn sm ghost" aria-pressed={neck} onClick={() => setNeck(!neck)}>{neck ? 'Hide neck' : 'Show on guitar neck'}</button>
      </div>
      {neck && last && (
        <Fretboard tuning={guitar.midis} zoomId="studioKeysNeck" compact
          markFor={midi => {
            const q = midi % 12
            if (!last.pcs.includes(q)) return null
            return { label: (flats ? FLATS : SHARPS)[q], role: q === last.root ? 'root' : 'chord' }
          }}
          onTap={midi => { const h = t.press('neck', 'clean', midi, 0.8); setTimeout(() => h.stop(), 600) }} />
      )}
      <p className="small muted" style={{ margin: 0 }}>
        {mode === 'type' ? 'Pick a chord type: each key plays that chord on it. Or hold a type with one hand and play keys with the other to switch on the fly.'
          : mode === 'key' ? `One finger plays the right chord of ${beat.key}${beat.minor ? ' minor' : ' major'} on each dotted key.`
            : 'Play several keys at once for chords. Dotted keys are in the key. With ● on, what you play goes into the piano roll.'}
      </p>
    </Win>
  )
}

// ───────────────────────── piano roll
const LEN = [{ id: 1, label: '1/16' }, { id: 2, label: '1/8' }, { id: 4, label: '1/4' }, { id: 8, label: '1/2' }, { id: 16, label: '1 bar' }]
function Roll({ t, beat, setBeat }: { t: StudioTransport; beat: Beat; setBeat: SetBeat }) {
  const step = useStep(t)
  const [sel, setSel] = useState<string>(beat.tracks[0]?.id ?? '')
  const [len, setLen] = usePersist('studioNoteLen', 2)
  const [stamp, setStamp] = usePersist('studioStamp', '')
  const track = beat.tracks.find(x => x.id === sel) ?? beat.tracks[0]
  const rows = 25
  const [top, setTop] = useState(72)
  useEffect(() => {
    if (!track) return
    const d = instr(track.inst)
    const hi = track.notes.length ? Math.max(...track.notes.map(n => n.m)) + 2 : d.lo + 23
    setTop(Math.max(d.lo + rows - 1, Math.min(108, hi)))
  }, [track?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const n = totalSteps(beat)
  const cw = 20, rh = 16
  const flats = keyPrefersFlats(beat.key, beat.minor)
  const keyPc = pc(beat.key)
  const scale = beat.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]
  const inKey = (m: number) => scale.includes(((m - keyPc) % 12 + 12) % 12)
  const add = (inst: string) => {
    const tk: Track = { id: newId(), inst, notes: [], vol: 0.8, space: instr(inst).space }
    setBeat(b => ({ ...b, tracks: [...b.tracks, tk] }))
    setSel(tk.id)
  }
  const tap = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!track) return
    const r = e.currentTarget.getBoundingClientRect()
    const s = Math.floor((e.clientX - r.left) / cw)
    const m = top - Math.floor((e.clientY - r.top) / rh)
    if (s < 0 || s >= n) return
    const hit = track.notes.find(x => x.m === m && s >= x.s && s < x.s + x.l)
    if (hit) { setBeat(b => ({ ...b, tracks: b.tracks.map(x => (x.id === track.id ? { ...x, notes: x.notes.filter(o => o !== hit) } : x)) })); return }
    const c = stamp ? CHORD_TYPES.find(x => x.id === stamp) : null
    const ms = c ? chordNotes(m, c.ivs) : [m]
    const h = ms.map(x => t.press(track.id, track.inst, x, 0.7))
    setTimeout(() => h.forEach(x => x.stop()), Math.min(800, len * t.stepDur * 1000))
    setBeat(b => ({ ...b, tracks: b.tracks.map(x => (x.id === track.id ? { ...x, notes: [...x.notes, ...ms.map(mm => ({ s, l: Math.min(len, n - s), m: mm, v: 0.75 }))] } : x)) }))
  }
  return (
    <Win id="roll" title="Piano roll" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
      <div className="st-row">
        {beat.tracks.length > 0 && (
          <label className="field st-field"><span>Part</span>
            <select className="select" value={track?.id ?? ''} onChange={e => setSel(e.target.value)}>
              {beat.tracks.map((x, i) => <option key={x.id} value={x.id}>{i + 1}. {instr(x.inst).label} ({x.notes.length} notes)</option>)}
            </select>
          </label>
        )}
        <InstrumentSelect label="Add a part" value="" placeholder="Choose a sound…" onChange={id => id && add(id)} />
      </div>
      {track ? (
        <>
          <div className="st-row">
            <div className="seg" role="group" aria-label="Note length">{LEN.map(l => <button key={l.id} aria-pressed={len === l.id} onClick={() => setLen(l.id)}>{l.label}</button>)}</div>
            <label className="field st-field"><span>A tap adds</span>
              <select className="select" value={stamp} onChange={e => setStamp(e.target.value)}>
                <option value="">One note</option>
                {CHORD_TYPES.map(c => <option key={c.id} value={c.id}>A {c.label} chord</option>)}
              </select>
            </label>
            <InstrumentSelect label="Sound of this part" value={track.inst} onChange={id => setBeat(b => ({ ...b, tracks: b.tracks.map(x => (x.id === track.id ? { ...x, inst: id } : x)) }))} />
            <div className="seg" role="group" aria-label="Scroll pitch">
              <button onClick={() => setTop(x => Math.min(108, x + 6))} aria-label="Higher">▲</button>
              <button onClick={() => setTop(x => Math.max(20 + rows, x - 6))} aria-label="Lower">▼</button>
            </div>
            <button className="btn sm ghost" onClick={() => setBeat(b => ({ ...b, tracks: b.tracks.map(x => (x.id === track.id ? { ...x, notes: [] } : x)) }))}>Clear part</button>
          </div>
          <div className="st-roll">
            <div className="st-roll-names" style={{ height: rows * rh }}>
              {Array.from({ length: rows }, (_, i) => top - i).map(m => <div key={m} className={`${isBlack(m) ? 'b' : ''}${inKey(m) ? ' k' : ''}`} style={{ height: rh }}>{noteName(m, flats)}</div>)}
            </div>
            <div className="st-roll-scroll">
              <svg width={n * cw} height={rows * rh} onPointerDown={tap} className="st-roll-svg" role="img" aria-label="Piano roll: tap to add or remove notes">
                {Array.from({ length: rows }, (_, i) => top - i).map((m, i) => (
                  <rect key={m} x={0} y={i * rh} width={n * cw} height={rh} className={`rr${isBlack(m) ? ' b' : ''}${inKey(m) ? ' k' : ''}`} />
                ))}
                {Array.from({ length: n + 1 }, (_, s) => <line key={s} x1={s * cw} x2={s * cw} y1={0} y2={rows * rh} className={s % 16 === 0 ? 'bar' : s % 4 === 0 ? 'beat' : 'sub'} />)}
                {track.notes.filter(x => x.m <= top && x.m > top - rows).map((x, i) => (
                  <rect key={i} x={x.s * cw + 1} y={(top - x.m) * rh + 1} width={Math.max(4, x.l * cw - 2)} height={rh - 2} rx={3} className="note" />
                ))}
                {step >= 0 && <rect x={step * cw} y={0} width={cw} height={rows * rh} className="now" />}
              </svg>
            </div>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Tap an empty square to add a note (or a whole chord), tap a note to remove it. Shaded rows are in the key.</p>
        </>
      ) : <p className="muted" style={{ margin: 0 }}>No parts yet. Add one above (piano, strings, a synth…), or play the keys with ● on.</p>}
    </Win>
  )
}

// ───────────────────────── loops that lock to the beat (the engine; the view is below)
type Layer = LoopLayer & { bars: number }
function useLoops(t: StudioTransport, beat: Beat, setBeat: SetBeat, play: (countIn?: number) => void) {
  const [mode, setMode] = usePersist<'beat' | 'free'>('studioLoopMode', 'beat')
  const [align, setAlign] = usePersist('studioAlign', true)
  const [state, setState] = useState<'idle' | 'waiting' | 'rec' | 'working'>('idle')
  const [note, setNote] = useState('')
  const [layers, setLayersRaw] = useState<Layer[]>([])
  const rec = useRef<InputRecorder | null>(null)
  const freeStart = useRef(0)
  const cancelRef = useRef({ cancelled: false })
  const live = useRef({ state, mode, layers, beat })
  live.current = { state, mode, layers, beat }
  const setLayers = (ls: Layer[]) => { live.current.layers = ls; setLayersRaw(ls); t.layers = ls; t.refreshLayers() }
  useEffect(() => {
    let alive = true
    void loopsFor(beat.name).then(list => {
      if (!alive) return
      const ctx = audio()
      setLayers(list.map(l => { const buf = ctx.createBuffer(1, l.data.length, l.sr); buf.getChannelData(0).set(l.data); return { id: l.id, buf, vol: l.vol, mute: l.mute, bars: l.bars } }))
    })
    return () => { alive = false }
  }, [beat.name]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { cancelRef.current.cancelled = true; rec.current?.stop() }, [])

  const keep = async (raw: Float32Array, bars: number, extra = '') => {
    const ctx = audio()
    const sr = ctx.sampleRate
    const b = live.current.beat
    let x = levelLoop(raw, sr)
    let moved = 0
    if (align) { moved = gridOffset(x, sr, t.stepDur); if (moved) x = rotate(x, moved * sr) }
    // shorter than the beat: repeat it to fill; longer: the beat grows to match
    if (bars > b.bars) setBeat(bb => setBars(bb, bars as Beat['bars']))
    else if (bars < b.bars) { const rep = new Float32Array(Math.round(b.bars / bars) * x.length); for (let k = 0; k * x.length < rep.length; k++) rep.set(x, k * x.length); x = rep }
    const id = newId()
    const len = Math.max(bars, b.bars)
    await saveLoop({ id, beat: b.name, sr, data: x, vol: 1, bars: len, at: Date.now() })
    const buf = ctx.createBuffer(1, x.length, sr)
    buf.getChannelData(0).set(x)
    const count = live.current.layers.length + 1
    setLayers([...live.current.layers, { id, buf, vol: 1, bars: len }])
    setNote(`Loop ${count} added${moved ? `, moved ${Math.round(Math.abs(moved) * 1000)} ms ${moved > 0 ? 'earlier' : 'later'} onto the beat` : ''}.${extra}`)
  }
  const input = () => latencyMs(kindOf(rec.current?.input?.external)) / 1000

  /** Record: on the beat it starts at the next bar 1 and stops by itself; free, a second call stops it. */
  const record = async () => {
    const { state: st, mode: md } = live.current
    if (st === 'rec' && md === 'free') {
      setState('working')
      const ctx = audio()
      const dur = ctx.currentTime - freeStart.current
      try {
        const raw = await rec.current!.capture(freeStart.current + input(), dur)
        const fit = fitToBars(raw, ctx.sampleRate, t.barDur)
        await keep(fit.samples, fit.bars, ` Fitted to ${fit.bars} bar${fit.bars > 1 ? 's' : ''} (${fit.ratio >= 1 ? 'stretched' : 'squeezed'} ${Math.abs(Math.round((fit.ratio - 1) * 100))}%).`)
      } catch { setNote("Couldn't record. Check the input: Play → Options → Set up input.") }
      setState('idle')
      return
    }
    if (st !== 'idle') return
    cancelRef.current = { cancelled: false }
    try {
      rec.current ??= new InputRecorder()
      await rec.current.start()
    } catch { setNote("The microphone or amp input couldn't be opened. Allow microphone access and try again."); return }
    const ctx = audio()
    if (md === 'free') {
      if (!t.playing) play(0)
      freeStart.current = ctx.currentTime
      setState('rec')
      setNote('Recording. Play your loop, then stop recording when it comes round: it will be fitted to the beat.')
      return
    }
    if (!t.playing) play(4)
    const passStart = Math.max(t.t0, t.t0 + Math.ceil((ctx.currentTime + 0.05 - t.t0) / t.loopDur) * t.loopDur)
    setState('waiting')
    const bars = live.current.beat.bars
    setNote(`Get ready: recording starts on bar 1 and stops by itself after ${bars} bar${bars > 1 ? 's' : ''}.`)
    const sig = cancelRef.current
    window.setTimeout(() => { if (!sig.cancelled) setState(s => (s === 'waiting' ? 'rec' : s)) }, Math.max(0, (passStart - ctx.currentTime) * 1000))
    try {
      const raw = await rec.current.capture(passStart + input(), t.loopDur, sig)
      if (sig.cancelled) throw new Error('cancelled')
      setState('working')
      await keep(raw, bars)
    } catch { /* cancelled */ }
    setState('idle')
  }
  const cancel = () => {
    if (live.current.state === 'idle') return
    cancelRef.current.cancelled = true
    setState('idle')
    setNote('Recording cancelled.')
  }
  /** Take back the last loop (or the one being recorded). */
  const undo = () => {
    if (live.current.state !== 'idle') { cancel(); return }
    const ls = live.current.layers
    const last = ls[ls.length - 1]
    if (!last) return
    void deleteLoop(last.id)
    setLayers(ls.slice(0, -1))
    setNote(`Loop ${ls.length} removed.`)
  }
  const setLayer = (id: string, patch: Partial<LoopLayer>) => {
    setLayers(live.current.layers.map(l => (l.id === id ? { ...l, ...patch } : l)))
    void loopsFor(live.current.beat.name).then(list => { const s = list.find(x => x.id === id); if (s) void saveLoop({ ...s, vol: patch.vol ?? s.vol, mute: patch.mute ?? s.mute }) })
  }
  const remove = (id: string) => { void deleteLoop(id); setLayers(live.current.layers.filter(x => x.id !== id)) }
  return { mode, setMode, align, setAlign, state, note, layers, record: () => void record(), cancel, undo, setLayer, remove }
}
type Loops = ReturnType<typeof useLoops>

function Looper({ t, beat, loops, playing, play, pedalMode, setPedalMode }: { t: StudioTransport; beat: Beat; loops: Loops; playing: boolean; play: (c?: number) => void; pedalMode: 'loop' | 'play'; setPedalMode: (m: 'loop' | 'play') => void }) {
  const { mode, setMode, align, setAlign, state, note, layers } = loops
  const busy = state !== 'idle'
  return (
    <Win id="loops" title="Looper" className="panel" bodyClass="stack" bodyStyle={{ gap: 10 }}>
      <div className="st-loophead">
        <BeatLight t={t} playing={playing} big label={state === 'rec' ? 'REC' : undefined} />
        <div className="stack" style={{ gap: 8, flex: 1, minWidth: 0 }}>
          <div className="seg" role="group" aria-label="Loop mode">
            <button aria-pressed={mode === 'beat'} onClick={() => setMode('beat')} disabled={busy}>On the beat ({beat.bars} bar{beat.bars > 1 ? 's' : ''})</button>
            <button aria-pressed={mode === 'free'} onClick={() => setMode('free')} disabled={busy}>Free</button>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className={`btn primary big${state === 'rec' || state === 'waiting' ? ' on' : ''}`} onClick={loops.record} disabled={state === 'working' || (busy && mode === 'beat')}>
              {state === 'idle' ? '● Record a loop' : state === 'waiting' ? 'Get ready…' : state === 'rec' ? (mode === 'free' ? '■ Stop recording' : 'Recording…') : 'Fitting…'}
            </button>
            {busy && mode === 'beat' && <button className="btn" onClick={loops.cancel}>Cancel</button>}
            {!busy && layers.length > 0 && <button className="btn" onClick={loops.undo}>↶ Undo last loop</button>}
            {!playing && layers.length > 0 && <button className="btn" onClick={() => play(0)}>▶ Play with loops</button>}
          </div>
        </div>
      </div>
      {note && <p className="small" style={{ margin: 0 }} role="status">{note}</p>}
      {layers.length > 0 && (
        <ul className="st-layers">
          {layers.map((l, i) => (
            <li key={l.id}>
              <b>Loop {i + 1}</b><span className="small muted">{l.bars} bar{l.bars > 1 ? 's' : ''}</span>
              <input type="range" min={0} max={2} step={0.05} value={l.vol} onChange={e => loops.setLayer(l.id, { vol: Number(e.target.value) })} aria-label={`Loop ${i + 1} volume`} />
              <button className="btn sm ghost" aria-pressed={!!l.mute} onClick={() => loops.setLayer(l.id, { mute: !l.mute })}>M</button>
              <button className="btn sm ghost" onClick={() => loops.remove(l.id)} aria-label={`Delete loop ${i + 1}`}>✕</button>
            </li>
          ))}
        </ul>
      )}
      <label className="ex-check"><input type="checkbox" checked={align} onChange={e => setAlign(e.target.checked)} /> Auto-align: nudge what I play onto the beat</label>
      <label className="field st-field" style={{ maxWidth: 420 }}><span>Foot pedal (Bluetooth page turner or MIDI)</span>
        <select className="select" value={pedalMode} onChange={e => setPedalMode(e.target.value as 'loop' | 'play')}>
          <option value="loop">Looping: right = record next loop, left = undo, hold right = stop</option>
          <option value="play">Start and stop the beat</option>
        </select>
      </label>
      <p className="small muted" style={{ margin: 0 }}>
        <b>On the beat</b>: a bar of count-in, then it records exactly {beat.bars} bar{beat.bars > 1 ? 's' : ''} and stops itself. <b>Free</b>: start and stop whenever; it becomes 1, 2, 4 or 8 bars at this tempo without changing pitch. Loops are levelled so they're never too quiet (up to 2× louder with the slider). The input's delay is taken off (measure it in Jam → Looper → timing check).
      </p>
    </Win>
  )
}

// ───────────────────────── practise guitar over the beat
function Practice({ t, beat, flats }: { t: StudioTransport; beat: Beat; flats: boolean }) {
  const inst = useInstrument()
  const step = useStep(t)
  const chords = useMemo(() => beatChords(beat), [beat])
  const options = scalesFor(beat.minor)
  const [scalePick, setScaleId] = usePersist(beat.minor ? 'studioScaleMinor' : 'studioScaleMajor', options[0])
  const scaleId = options.includes(scalePick) ? scalePick : options[0]
  const info = scaleInfo(beat.key, scaleId)
  const bar = step >= 0 ? Math.floor(step / 16) : 0
  const now = chords[bar] ?? chords.find(Boolean) ?? null
  const chordSet = new Set(now?.pcs ?? [])
  const licks = useMemo(() => exerciseCatalog(inst).filter(e => e.lick && (e.minor === undefined || e.minor === beat.minor)).slice(0, 80), [inst, beat.minor])
  const [lickCode, setLickCode] = usePersist('studioLick', '')
  const lick = licks.find(e => e.code === lickCode) ?? null
  const song = useMemo(() => { try { return lick ? lick.make({ root: beat.key, inst, bpm: beat.bpm }) : null } catch { return null } }, [lick, beat.key, beat.bpm, inst])
  const track = song?.tracks[0]
  const states = useMemo(() => new Uint8Array(track ? track.bars.reduce((a, b) => a + b.steps.length, 0) : 0), [track])
  return (
    <Win id="practice" title="Practise over it" className="panel" bodyClass="stack" bodyStyle={{ gap: 10 }}>
      <p className="small muted" style={{ margin: 0 }}>Press ▶ and solo along. The neck shows {scaleById(scaleId).label.toLowerCase()} in {beat.key}{beat.minor ? ' minor' : ''}; the gold notes are the chord playing now, so land on them when it changes.</p>
      <div className="st-chords" aria-label="Chords in the beat">
        {chords.map((c, i) => <span key={i} className={`chip${i === bar && step >= 0 ? ' on' : ''}`}>{c?.name ?? '–'}</span>)}
      </div>
      <label className="field st-field" style={{ maxWidth: 300 }}><span>Scale</span>
        <select className="select" value={scaleId} onChange={e => setScaleId(e.target.value)}>
          {options.map(s => <option key={s} value={s}>{scaleById(s).label}</option>)}
        </select>
      </label>
      <Fretboard tuning={inst.midis} zoomId="studioNeck"
        markFor={midi => {
          const q = midi % 12
          const inScale = info.pcs.includes(q), inChord = chordSet.has(q)
          if (!inScale && !inChord) return null
          const label = info.labels.get(q) ?? ''
          if (inChord) return { label: label || '•', role: q === now?.root ? 'root' : 'chord' }
          return { label, role: 'scale' }
        }}
        onTap={midi => { const h = t.press('practice', 'clean', midi, 0.8); setTimeout(() => h.stop(), 600) }} />
      <label className="field st-field" style={{ maxWidth: 420 }}><span>A lick to try over it (in {beat.key}{beat.minor ? 'm' : ''})</span>
        <select className="select" value={lick?.code ?? ''} onChange={e => setLickCode(e.target.value)}>
          <option value="">None</option>
          {licks.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}
        </select>
      </label>
      {track && <TabView track={track} mode="fret" flats={flats} cursor={-1} playing={false} states={states} version={0} spans={[]} counts meter={song?.meter ?? 4} onTap={() => {}} />}
      {track && <HandGuide track={track} />}
      {!chords.some(Boolean) && <p className="small muted" style={{ margin: 0 }}>This beat has no chord parts yet, so the neck shows the whole key. Add chords with the keys (● on) or the piano roll.</p>}
    </Win>
  )
}

// ───────────────────────── mix
function Mix({ t, beat, setBeat }: { t: StudioTransport; beat: Beat; setBeat: SetBeat }) {
  const [loopVol, setLoopVol] = usePersist('studioLoopVol', 1)
  const [click, setClick] = usePersist('studioClick', false)
  useEffect(() => { t.loopBus.gain.value = loopVol }, [loopVol, t])
  useEffect(() => { t.click = click }, [click, t])
  const row = (key: string, label: ReactNode, vol: number, onVol: (v: number) => void, extra?: ReactNode) => (
    <li key={key}><span className="st-mlabel">{label}</span><input type="range" min={0} max={1.5} step={0.05} value={vol} onChange={e => onVol(Number(e.target.value))} aria-label="Volume" />{extra}</li>
  )
  return (
    <Win id="mix" title="Mix" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
      <ul className="st-mix">
        {row('drums', <b>Drums</b>, beat.drumVol, v => setBeat(b => ({ ...b, drumVol: v }), false))}
        {beat.tracks.map((x, i) => row(x.id, <span>{i + 1}. {instr(x.inst).label}</span>, x.vol, v => setBeat(b => ({ ...b, tracks: b.tracks.map(y => (y.id === x.id ? { ...y, vol: v } : y)) }), false),
          <>
            <label className="small st-space">Space<input type="range" min={0} max={1} step={0.05} value={x.space} onChange={e => setBeat(b => ({ ...b, tracks: b.tracks.map(y => (y.id === x.id ? { ...y, space: Number(e.target.value) } : y)) }), false)} aria-label="Reverb" /></label>
            <button className="btn sm ghost" aria-pressed={!!x.mute} onClick={() => setBeat(b => ({ ...b, tracks: b.tracks.map(y => (y.id === x.id ? { ...y, mute: !y.mute } : y)) }))}>M</button>
            <button className="btn sm ghost" onClick={() => setBeat(b => ({ ...b, tracks: b.tracks.filter(y => y.id !== x.id) }))} aria-label="Remove part">✕</button>
          </>))}
        {row('loops', <b>Loops</b>, loopVol, setLoopVol)}
      </ul>
      <label className="ex-check"><input type="checkbox" checked={click} onChange={e => setClick(e.target.checked)} /> Click on every beat</label>
      <p className="small muted" style={{ margin: 0 }}>Space is the reverb: more for pads, strings and choir, little for bass and drums.</p>
    </Win>
  )
}

// ───────────────────────── drum layers: one-tap patterns + each pass recorded on the pads
function Layers({ beat, setBeat }: { beat: Beat; setBeat: SetBeat }) {
  const layers = beat.layers ?? []
  const setLayer = (id: string, patch: Partial<DrumLayer>) => setBeat(b => ({ ...b, layers: (b.layers ?? []).map(l => (l.id === id ? { ...l, ...patch } : l)) }), false)
  const toggle = (p: Pattern) => setBeat(b => {
    const ls = b.layers ?? []
    const on = ls.find(l => l.label === p.label)
    return { ...b, layers: on ? ls.filter(l => l !== on) : [...ls, patternLayer(p, b.bars)] }
  })
  return (
    <>
      <p className="small muted" style={{ margin: 0 }}>Tap a pattern to add it as a layer (tap again to take it off). Or press ● and play the pads: each time round the loop becomes a new layer, snapped to the beat.</p>
      <div className="st-patterns">
        {PATTERNS.map(p => {
          const on = layers.some(l => l.label === p.label)
          return <button key={p.id} className={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggle(p)}>{on ? '✓ ' : '+ '}{p.label}</button>
        })}
      </div>
      {layers.length > 0 && (
        <ul className="st-layers">
          {layers.map(l => (
            <li key={l.id} className={l.mute ? 'muted' : ''}>
              <b>{l.label}</b><span className="small muted">{[...new Set(l.rows.map(r => voiceLabel(r.voice)))].join(', ')}</span>
              <input type="range" min={0} max={1.5} step={0.05} value={l.vol ?? 1} onChange={e => setLayer(l.id, { vol: Number(e.target.value) })} aria-label={`${l.label} volume`} />
              <button className="btn sm ghost" aria-pressed={!!l.mute} onClick={() => setLayer(l.id, { mute: !l.mute })} title="Mute">M</button>
              <button className="btn sm ghost" onClick={() => setBeat(b => ({ ...b, layers: (b.layers ?? []).filter(x => x.id !== l.id) }))} aria-label={`Remove ${l.label}`}>✕</button>
            </li>
          ))}
        </ul>
      )}
      {layers.length > 0 && <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setBeat(b => ({ ...b, layers: (b.layers ?? []).slice(0, -1) }))}>↶ Remove the last layer</button>}
    </>
  )
}

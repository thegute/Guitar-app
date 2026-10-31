// Jam: generate chord progressions (lots of options), see every chord shape, play them back with strumming and drums,
// record your own playing as a loop, and see which scales to solo with.
import { micWhere } from '../audio/input'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import {
  MODES, STYLES, FLAVORS, ENDINGS, SPICE, STYLE_DEFAULTS, FN_LABEL,
  randomProgression, swapChord, spell, suggestions, scalesForProgression, scaleForChord, progChordPcs, resolveFlavor, typeTones,
  type ModeId, type Style, type Flavor, type Ending, type ProgChord,
} from '../theory/progressions'
import type { Voicing } from '../theory/chords'
import { chordShapes, useInstrument, type Instrument } from '../instrument'
import { scaleById, scaleInfo } from '../theory/scales'
import { ChordDiagram } from '../components/ChordDiagram'
import { Fretboard } from '../components/Fretboard'
import { CircleOfFifths } from '../components/CircleOfFifths'
import { InputPicker } from '../components/InputPicker'
import { Chips, Field, KeyPicker, usePersist } from '../components/Controls'
import { IconDice, IconLock, IconPlay, IconStop, IconPencil } from '../components/Icons'
import { Fold, useHint } from '../components/Fold'
import { Win, WinArea } from '../components/Win'
import { strum as strumNotes, preload, SOUNDS, soundInfo, loadSound, loadBank, bankLoaded, type SoundId } from '../audio/pluck'
import { BASSLINES } from '../audio/bass'
import { audio, keepAwake } from '../audio/engine'
import { JamTransport } from '../audio/jam'
import { InputRecorder, makeLayerBuffer, measureLatency } from '../audio/looper'
import { gear, kindOf, latencyMs, setGear, useGear } from '../audio/gear'
import { bump, usePracticeTimer } from '../learn/progress'
import { usePedals } from '../controls/pedals'
import { STRUMS } from '../audio/strums'
import { GROOVES, GROOVE_GROUPS, KITS, grooveOf, kitInfo, loadKit, kitLoaded, type KitId } from '../audio/drums'
import { shapesFor as shapesForChord } from '../theory/shapes'
import { ProgressionTabs } from '../components/ProgressionTabs'
import { LickMaker } from '../components/LickMaker'
import { patternForStrum } from '../tabs/picking'
import { saveSong } from '../tabs/library'
import { openInPlay } from '../nav'
import { SongFinder } from '../components/SongFinder'
import { TabFromPicture } from '../assistant/TabFromPicture'
import { Zoomable } from '../components/Zoomable'
import { SubTabs, useSubTab } from '../components/SubTabs'
import { PsyPic } from '../components/PsyArt'
import { pc } from '../theory/notes'
import { useScreenInfo } from '../assistant/screen'

const StudioScreen = lazy(() => import('../studio/StudioScreen').then(m => ({ default: m.StudioScreen })))

const COUNTS = [2, 4, 8, 12, 16]
const RATES = [{ id: 8, label: 'Every 2 bars' }, { id: 4, label: 'Every bar' }, { id: 2, label: 'Twice a bar' }]
const SHAPES = [
  { id: 'auto', label: 'Close together' },
  { id: 'open', label: 'Open chords' },
  { id: 'barre', label: 'Barre chords' },
  { id: 'neck', label: 'Up the neck' },
]

const shapesFor = (c: ProgChord, inst: Instrument) => shapesForChord(c, inst)
const openStrings = (v: Voicing) => v.frets.filter(f => f === 0).length
function rank(list: Voicing[], pref: string, near: number): number {
  if (!list.length) return -1
  const score = (v: Voicing) => {
    if (pref === 'open') return v.baseFret + v.barres.length * 3 - openStrings(v) * 0.8
    if (pref === 'barre') return (v.barres.length ? 0 : 6) + Math.abs(v.baseFret - 3) * 0.4 + (v.frets.filter(f => f >= 0).length < 5 ? 2 : 0)
    if (pref === 'neck') return Math.abs(v.baseFret - 7)
    return Math.abs(v.baseFret - near) + v.barres.length * 0.3 - openStrings(v) * 0.15
  }
  let best = 0
  list.forEach((v, i) => { if (score(v) < score(list[best])) best = i })
  return best
}
let tuning: number[] = []
const midisOf = (v: Voicing | undefined) => (v ? v.frets.map((f, s) => (f < 0 ? -1 : tuning[s] + f)).filter(m => m > 0) : [])

export function JamScreen({ onOpenScale }: { onOpenScale?: (root: string, scale: string) => void }) {
  const inst = useInstrument()
  tuning = inst.midis
  // ---------- options ----------
  const [tonic, setTonic] = usePersist('progKey', 'G')
  const [mode, setMode] = usePersist<ModeId>('progMode', 'major')
  const [style, setStyleRaw] = usePersist<Style>('progStyle', 'any')
  const [flavor, setFlavor] = usePersist<Flavor>('jamFlavor', 'auto')
  const [count, setCount] = usePersist('jamCount', 4)
  const [rate, setRate] = usePersist('jamRate', 4)
  const [spice, setSpice] = usePersist('progSpice', 1)
  const [start, setStart] = usePersist<'home' | 'any'>('jamStart', 'home')
  const [ending, setEnding] = usePersist<Ending>('jamEnding', 'loop')
  const [shapePref, setShapePref] = usePersist('jamShapes', 'auto')
  const [bpm, setBpm] = usePersist('progBpm', 90)
  const [strumId, setStrumId] = usePersist('jamStrum', 'auto')
  const [drumId, setDrumId] = usePersist('jamDrums', 'auto')
  const [kitId, setKitId] = usePersist<'auto' | KitId>('jamKit', 'auto')
  const [chordsOn, setChordsOn] = usePersist('jamChordsOn', true)
  const [drumsOn, setDrumsOn] = usePersist('jamDrumsOn', true)
  const [clickOn, setClickOn] = usePersist('jamClick', false)
  const [toneId, setToneId] = usePersist<'auto' | SoundId>('jamTone', 'auto')
  const [bassId, setBassId] = usePersist('jamBass', 'auto')
  const [bassOn, setBassOn] = usePersist('jamBassOn', true)
  const [bandOpen, setBandOpen] = useState(false)
  const [tabPart, setTabPart] = usePersist<'pick' | 'melody' | 'licks'>('jamTabPart', 'pick')
  const [optionsOpen, setOptionsOpen] = usePersist('jamOptionsOpen', false)
  const [page, setPage] = useSubTab('jam', ['jam', 'solo', 'tab', 'find', 'beats'] as const)
  const [prog, setProg] = usePersist<ProgChord[]>('jamProg', [])
  useScreenInfo('jam', { label: `Jam: ${prog.map(c => c.symbol).join(' ') || 'no chords yet'} in ${tonic} ${mode}`, summary: `In Jam with a ${style === 'any' ? '' : style + ' '}progression in ${tonic} ${mode}: ${prog.map(c => `${c.symbol} (${c.roman})`).join(', ') || 'none yet'}, at ${bpm} BPM.` })
  const [shapeIdx, setShapeIdx] = useState<number[]>([])
  const [locks, setLocks] = useState<boolean[]>([])
  const [selected, setSelected] = useState(0)
  const [tipIdx, setTipIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState({ chord: -1, countIn: 0, beat: -1 })

  const setStyle = (s: Style) => { setStyleRaw(s); setBpm(STYLE_DEFAULTS[s].bpm) }
  const strumKind = strumId === 'auto' ? STYLE_DEFAULTS[style].strum : strumId
  const drums = drumId === 'auto' ? STYLE_DEFAULTS[style].drums : drumId
  const grooveKit: KitId = grooveOf(drums)?.kit ?? 'studio'
  const kit: KitId = kitId === 'auto' ? grooveKit : kitId
  const bassLine = bassId === 'auto' ? STYLE_DEFAULTS[style].bass : bassId
  // each style picks a guitar sound (a ukulele keeps its nylon sound for the acoustic styles)
  const styleTone = (inst.isUke && ['acoustic', 'j45'].includes(STYLE_DEFAULTS[style].tone) ? 'nylon' : STYLE_DEFAULTS[style].tone) as SoundId
  const tone: SoundId = toneId === 'auto' ? styleTone : toneId
  const strum = (midis: number[]) => strumNotes(midis, 0, { sound: tone })
  const resolvedFlavor = resolveFlavor(flavor, style)

  // ---------- looper ----------
  const transport = useRef<JamTransport | null>(null)
  const recorder = useRef<InputRecorder | null>(null)
  const recCancel = useRef<{ cancelled: boolean } | null>(null)
  const [layers, setLayers] = useState<{ id: number; muted: boolean; shift: number }[]>([])
  const [rec, setRec] = useState<{ from: number; until: number } | null>(null)
  const [recLevel, setRecLevel] = useState(0)
  const [backingWhileRec, setBackingWhileRec] = usePersist('loopBackingRec', false)
  const [calib, setCalib] = useState<{ running: boolean; click: number; result?: number | null } | null>(null)
  const [loopError, setLoopError] = useState('')
  const [inputInfo, setInputInfo] = useState<{ label: string; external: boolean } | null>(null)
  useGear()
  // the timing delay belongs to the input you record from (phone mic or USB amp)
  const latKind = kindOf(inputInfo?.external)
  const latMs = latencyMs(latKind)
  const latMeasured = gear(latKind).latencyMs >= 0
  const setLatency = (ms: number) => setGear(latKind, { latencyMs: ms })
  const hasLoop = layers.length > 0
  usePracticeTimer('jam', playing, true)

  const tr = () => (transport.current ??= new JamTransport())

  // first visit: make one
  useEffect(() => {
    if (prog.length === 0) roll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- shapes ----------
  const shapeLists = useMemo(() => prog.map(c => shapesFor(c, inst)), [prog, inst])
  const autoIdx = useMemo(() => {
    let near = shapePref === 'neck' ? 7 : 1
    return shapeLists.map(list => {
      const i = rank(list, shapePref, near)
      if (i >= 0) near = Math.min(10, near * 0.5 + list[i].baseFret * 0.5)
      return i
    })
  }, [shapeLists, shapePref])
  const chosen = shapeLists.map((list, i) => list[shapeIdx[i] ?? autoIdx[i]] ?? list[0])
  useEffect(() => { setShapeIdx([]) }, [prog, shapePref])

  const tips = useMemo(() => scalesForProgression(tonic, mode, prog, style), [tonic, mode, prog, style])
  const tip = tips[Math.min(tipIdx, tips.length - 1)]
  const active = pos.chord >= 0 ? pos.chord : selected
  const cur = prog[active]
  const chordTip = cur ? scaleForChord(tonic, mode, cur) : null
  const info = tip ? scaleInfo(tip.root, tip.scale) : null
  const chordSet = new Set(cur ? progChordPcs(tonic, cur) : [])
  const chordRoot = cur ? pc(cur.root) : -1
  const sugg = useMemo(() => suggestions(tonic, mode, style, resolvedFlavor), [tonic, mode, style, resolvedFlavor])
  const totalBars = prog.reduce((a, c) => a + (c.beats ?? 4), 0) / 4
  const minorKey = ['minor', 'dorian', 'phrygian', 'harmonic'].includes(mode)
  const circleChord = (c: ProgChord) => ({ root: c.root, minor: /^m(?!aj)/.test(c.type), dim: /dim|m7b5/.test(c.type) })

  function roll() {
    const same = prog.length === count
    const locked = same ? prog.map((c, i) => (locks[i] ? c : null)) : []
    const avoid = prog.map(c => c.semi + c.type).join(',')
    const next = randomProgression({ tonic, mode, style, flavor, count, spice, start, ending, locked, avoid }).map(c => ({ ...c, beats: rate }))
    setProg(next)
    if (!same) setLocks([])
    setSelected(0)
    setTipIdx(0)
  }
  function load(chords: ProgChord[]) {
    stopAll()
    setProg(chords.map(c => ({ ...c, beats: c.beats ?? 4 })))
    setLocks([])
    setSelected(0)
    setTipIdx(0)
  }
  function swap(i: number) {
    const next = [...prog]
    next[i] = swapChord(prog, i, { tonic, mode, style, flavor, spice, start, ending })
    setProg(next)
    setSelected(i)
    const sh = shapesFor(next[i], inst)
    strum(midisOf(sh[rank(sh, shapePref, chosen[i]?.baseFret ?? 1)]))
  }
  function hear(i: number) {
    setSelected(i)
    void audio().resume()
    strum(midisOf(chosen[i]))
  }
  function cycleShape(i: number) {
    const list = shapeLists[i]
    if (!list.length) return
    const curI = shapeIdx[i] ?? autoIdx[i]
    const n = [...shapeIdx]
    n[i] = (curI + 1) % list.length
    setShapeIdx(n)
    setSelected(i)
    void audio().resume()
    strum(midisOf(list[n[i]]))
  }
  // changing how often chords change keeps the chords, just re-times them
  useEffect(() => {
    if (!hasLoop && prog.some(c => c.beats !== rate)) setProg(p => p.map(x => ({ ...x, beats: rate })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate])

  // ---------- transport ----------
  function applySong() {
    const t = tr()
    chosen.forEach(v => preload(midisOf(v), tone))
    t.setSong(prog.map((c, i) => ({ midis: midisOf(chosen[i]), beats: c.beats ?? 4, root: pc(c.root), tones: typeTones(c.type) })), bpm, strumKind, drums, bassLine, tone, kitId === 'auto' ? null : kitId)
    t.setMix({ chords: chordsOn && (!rec || backingWhileRec), drums: drumsOn, click: clickOn, bass: bassOn })
  }
  // load the sounds this style needs ahead of time, so the first bars aren't the stand-in synth
  useEffect(() => {
    void loadSound(tone)
    if (drums !== 'off') void loadKit(kit)
    if (bassLine !== 'off') void loadBank('bass')
  }, [tone, drums, bassLine, kit])
  const [loadingSounds, setLoadingSounds] = useState(false)
  async function playWhenReady() {
    const ready = () => bankLoaded(tone) && (drums === 'off' || kitLoaded(kit)) && (bassLine === 'off' || bankLoaded('bass'))
    if (!ready()) {
      setLoadingSounds(true)
      const all = Promise.all([loadSound(tone), drums !== 'off' ? loadKit(kit) : null, bassLine !== 'off' ? loadBank('bass') : null])
      await Promise.race([all, new Promise(r => setTimeout(r, 6000))])
      setLoadingSounds(false)
    }
    startPlay(0)
  }
  function startPlay(countIn = 0) {
    applySong()
    const t0 = tr().start(countIn)
    setPlaying(true)
    void keepAwake(true)
    return t0
  }
  function stopAll() {
    recCancel.current && (recCancel.current.cancelled = true)
    transport.current?.stop()
    setPlaying(false)
    setPos({ chord: -1, countIn: 0, beat: -1 })
    void keepAwake(false)
  }
  useEffect(() => () => { transport.current?.stop(); recorder.current?.stop(); void keepAwake(false) }, [])
  // the beat maker has its own clock: the jam loop stops when you open it
  useEffect(() => { if (page === 'beats' && transport.current?.playing) stopAll() }, [page]) // eslint-disable-line react-hooks/exhaustive-deps
  // live changes: restart in time (layers keep their place)
  useEffect(() => {
    if (transport.current?.playing && !rec) startPlay(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, strumKind, drums, prog, shapeIdx, shapePref, bassLine, tone, kitId])
  useEffect(() => {
    transport.current?.setMix({ chords: chordsOn && (!rec || backingWhileRec), drums: drumsOn, click: clickOn, bass: bassOn })
  }, [chordsOn, drumsOn, clickOn, rec, backingWhileRec, bassOn])

  // follow the playhead
  useEffect(() => {
    let raf = 0
    let last = ''
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const t = transport.current
      if (!t?.playing) return
      const p = t.position()
      const key = `${p.chord}|${p.countIn}|${Math.floor(p.beat)}`
      if (key !== last) { last = key; setPos({ chord: p.chord, countIn: p.countIn, beat: p.beat }) }
      if (recorder.current?.open) setRecLevel(recorder.current.level)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  // ---------- recording ----------
  async function openRecorder() {
    recorder.current ??= new InputRecorder()
    await recorder.current.start()
    const inp = recorder.current.input
    setInputInfo(inp ? { label: inp.label, external: inp.external } : null)
  }
  async function record(add: boolean) {
    if (rec) return
    setLoopError('')
    try {
      await openRecorder()
    } catch {
      setLoopError(`KGuitar needs microphone access to record (this also covers a USB amp). Allow it ${micWhere()} and try again.`)
      return
    }
    const t = tr()
    if (!add) { t.clearLayers(); setLayers([]) }
    let from: number
    if (!t.playing) from = startPlay(4)
    else from = t.nextLoopStart(0.6)
    const until = from + t.loopDur
    const signal = { cancelled: false }
    recCancel.current = signal
    setRec({ from, until })
    try {
      const samples = await recorder.current!.capture(from + latencyMs(kindOf(recorder.current!.input?.external)) / 1000, t.loopDur, signal)
      const id = Date.now()
      t.addLayer(makeLayerBuffer(samples), id)
      bump('loopsRecorded')
      setLayers(ls => [...ls, { id, muted: false, shift: 0 }])
      // your recording takes over from the backing chords
      if (!add) setChordsOn(false)
    } catch {
      /* stopped while recording */
    } finally {
      setRec(null)
      recorder.current?.stop()
      setRecLevel(0)
    }
  }
  function clearLoop() {
    transport.current?.clearLayers()
    setLayers([])
    setChordsOn(true)
  }
  async function calibrate() {
    stopAll()
    setLoopError('')
    try {
      await openRecorder()
    } catch {
      setLoopError('KGuitar needs microphone access for the timing check.')
      return
    }
    setCalib({ running: true, click: -1 })
    const ms = await measureLatency(recorder.current!, i => setCalib(c => (c ? { ...c, click: i } : c)))
    recorder.current?.stop()
    if (ms !== null) setGear(kindOf(recorder.current?.input?.external), { latencyMs: ms })
    setCalib({ running: false, click: 8, result: ms })
  }

  usePedals({
    startStop: () => (transport.current?.playing ? stopAll() : void playWhenReady()),
    restart: () => { stopAll(); startPlay(0) },
    record: () => void record(layers.length > 0),
  })

  const recProgress = rec ? Math.max(0, Math.min(1, (audio().currentTime - rec.from) / (rec.until - rec.from))) : 0
  const recWaiting = rec && audio().currentTime < rec.from
  const locked = hasLoop || !!rec

  // ---------- pieces ----------
  const [cardsHint, cardsHintBody] = useHint('Tap a chord to hear it, tap its diagram for another shape, ↻ swaps it for a different chord that does the same job, and the lock keeps it when you roll again.', 'How the chord cards work')
  const summary = `${tonic} ${MODES.find(m => m.id === mode)!.label.toLowerCase()} · ${STYLES.find(s => s.id === style)!.label} · ${prog.length || count} chord${(prog.length || count) === 1 ? '' : 's'} · ${totalBars} bar${totalBars === 1 ? '' : 's'}`

  const options = (
    <div className="panel stack jam-options">
      <div className="split-2">
        <Field label="Key"><KeyPicker value={tonic} onChange={setTonic} /></Field>
        <Field label="Mode"><Chips label="Mode" items={MODES.map(m => ({ id: m.id, label: m.label }))} value={mode} onChange={setMode} /></Field>
      </div>
      <p className="small muted" style={{ margin: 0 }}>{MODES.find(m => m.id === mode)!.feel}</p>
      <Field label="Style"><Chips label="Style" items={STYLES.map(s => ({ id: s.id, label: s.label }))} value={style} onChange={setStyle} /></Field>
      <Field label="Chord colour"><Chips label="Chord colour" items={FLAVORS.map(f => ({ id: f.id, label: f.label }))} value={flavor} onChange={setFlavor} /></Field>
      <div className="row">
        <Field label="How many chords"><Chips label="How many chords" items={COUNTS.map(n => ({ id: n, label: String(n) }))} value={count} onChange={setCount} /></Field>
        <Field label="Chord changes"><Chips label="Chord changes" items={RATES} value={rate} onChange={setRate} /></Field>
      </div>
      <div className="row">
        <Field label="Start on"><Chips label="Start on" items={[{ id: 'home', label: 'Home chord' }, { id: 'any', label: 'Anywhere' }]} value={start} onChange={setStart} /></Field>
        <Field label="Ending"><Chips label="Ending" items={ENDINGS.map(e => ({ id: e.id, label: e.label }))} value={ending} onChange={setEnding} /></Field>
      </div>
      <Field label="Surprise level"><Chips label="Surprise level" items={SPICE} value={spice} onChange={setSpice} /></Field>
      <p className="small muted" style={{ margin: 0 }}>{SPICE[spice].hint}. {ENDINGS.find(e => e.id === ending)!.hint}.</p>
      <Field label="Chord shapes"><Chips label="Chord shapes" items={SHAPES} value={shapePref} onChange={setShapePref} /></Field>
    </div>
  )

  const cards = (
    <Zoomable id="jamCards" max={2.2}>
    <div className={`prog-cards${prog.length > 8 ? ' many' : ''}`}>
      {prog.map((c, i) => {
        const v = chosen[i]
        const list = shapeLists[i]
        const on = i === pos.chord
        return (
          <div key={i} className={`prog-card${on ? ' on' : ''}${i === active && pos.chord < 0 ? ' sel' : ''}${c.borrowed ? ' borrowed' : ''}`}
            onClick={() => hear(i)} role="button" tabIndex={0} aria-label={`Play ${c.symbol}`} onKeyDown={e => { if (e.key === 'Enter') hear(i) }}>
            <div className="pc-head">
              <div>
                <div className="readout pc-name">{c.symbol}</div>
                <div className="small pc-roman">{c.roman}{c.beats && c.beats !== 4 ? ` · ${c.beats === 2 ? '½ bar' : '2 bars'}` : ''}</div>
              </div>
              <button className="pc-lock" onClick={e => { e.stopPropagation(); const l = [...locks]; l[i] = !l[i]; setLocks(l) }} aria-pressed={!!locks[i]} aria-label={locks[i] ? `Unlock ${c.symbol}` : `Keep ${c.symbol} when rolling`}>
                <IconLock locked={!!locks[i]} />
              </button>
            </div>
            {v ? (
              <div onClick={e => { e.stopPropagation(); cycleShape(i) }}>
                <ChordDiagram voicing={v} size={prog.length > 8 ? 0.62 : 0.76} active={on} />
              </div>
            ) : <div className="small muted" style={{ padding: 12 }}>No shape found</div>}
            <div className="pc-foot">
              <span className="small muted">{list.length > 1 ? `shape ${(shapeIdx[i] ?? autoIdx[i]) + 1}/${list.length}` : ''}</span>
              <button className="pc-swap" disabled={locked} onClick={e => { e.stopPropagation(); swap(i) }} aria-label={`Swap ${c.symbol} for another chord`}>↻</button>
            </div>
          </div>
        )
      })}
    </div>
    </Zoomable>
  )

  const chordInfo = cur && (
    <p className="small chord-why">
      <b>{cur.symbol}</b> <span className="muted">({cur.roman})</span>{cur.fn ? ` · ${FN_LABEL[cur.fn]}` : ''}{cur.why ? `. ${cur.why}` : cur.borrowed ? '. From outside the key.' : ''}
    </p>
  )

  const transportRow = (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row">
        <button className={`btn big${playing ? '' : ' primary'}`} disabled={loadingSounds} onClick={() => (playing ? stopAll() : void playWhenReady())} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {playing ? <IconStop /> : <IconPlay />} {playing ? 'Stop' : loadingSounds ? 'Loading sounds…' : 'Play loop'}
        </button>
        <Field label={`Tempo ${bpm} BPM`}>
          <input type="range" min={50} max={200} value={bpm} disabled={hasLoop} onChange={e => setBpm(+e.target.value)} style={{ accentColor: 'var(--amber)', width: 170 }} aria-label="Loop tempo" />
        </Field>
        {pos.countIn > 0 && <span className="count-in readout">{pos.countIn}</span>}
      </div>
      <button className="band-line" aria-expanded={bandOpen} onClick={() => setBandOpen(!bandOpen)}>
        <span className="small muted">Band</span>
        <span className="band-parts">
          <b>{soundInfo(tone).label}</b> · {STRUMS.find(x => x.id === strumKind)?.label ?? strumKind} · {drums === 'off' ? 'no drums' : `${GROOVES.find(g => g.id === drums)?.label ?? drums} drums (${kitInfo(kit).label.toLowerCase()})`} · {bassLine === 'off' ? 'no bass' : `${BASSLINES.find(b => b.id === bassLine)?.label ?? bassLine} bass`}
        </span>
        <IconPencil />
      </button>
      {bandOpen && (
      <div className="row band-edit">
        <Field label="Guitar sound">
          <select className="select" value={toneId} onChange={e => { const v = e.target.value as 'auto' | SoundId; setToneId(v); strumNotes(midisOf(chosen[Math.max(0, selected)]), 0, { sound: v === 'auto' ? styleTone : v }) }} title={soundInfo(tone).hint}>
            <option value="auto">Match the style ({soundInfo(styleTone).label})</option>
            {SOUNDS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Strum">
          <select className="select" value={strumId} onChange={e => setStrumId(e.target.value)}>
            <option value="auto">Match the style ({STRUMS.find(s => s.id === STYLE_DEFAULTS[style].strum)?.label})</option>
            {STRUMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Drums">
          <select className="select" value={drumId} onChange={e => setDrumId(e.target.value)}>
            <option value="auto">Match the style ({GROOVES.find(g => g.id === STYLE_DEFAULTS[style].drums)?.label ?? 'none'})</option>
            <option value="off">No drums</option>
            {GROOVE_GROUPS.map(gr => (
              <optgroup key={gr} label={gr}>{GROOVES.filter(g => g.group === gr).map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</optgroup>
            ))}
          </select>
        </Field>
        {drums !== 'off' && (
          <Field label="Drum kit">
            <select className="select" value={kitId} onChange={e => setKitId(e.target.value as 'auto' | KitId)} title={kitInfo(kit).hint}>
              <option value="auto">Match the beat ({kitInfo(grooveKit).label})</option>
              {KITS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </Field>
        )}
        <Field label="Bass">
          <select className="select" value={bassId} onChange={e => setBassId(e.target.value)}>
            <option value="auto">Match the style ({BASSLINES.find(b => b.id === STYLE_DEFAULTS[style].bass)?.label ?? 'none'})</option>
            <option value="off">No bass</option>
            {BASSLINES.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </Field>
      </div>
      )}
      <div className="row hear-row">
        <span className="small muted">Hear:</span>
        <button className="chip" aria-pressed={chordsOn} onClick={() => setChordsOn(!chordsOn)} title="The app's strumming. Turn it off to play the chords yourself.">Backing guitar</button>
        <button className="chip" aria-pressed={bassOn} onClick={() => setBassOn(!bassOn)}>Bass</button>
        <button className="chip" aria-pressed={drumsOn} onClick={() => setDrumsOn(!drumsOn)}>Drums</button>
        <button className="chip" aria-pressed={clickOn} onClick={() => setClickOn(!clickOn)}>Click</button>
      </div>
    </div>
  )

  const looper = (
    <div className="stack looper">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="small muted">Records from:</span>
        <InputPicker active={inputInfo} />
      </div>
      <div className="row">
        <button className={`btn big rec${rec ? ' on' : ''}`} onClick={() => (rec ? stopAll() : void record(false))} disabled={!!calib?.running}>
          <span className="rec-dot" /> {rec ? (recWaiting ? 'Get ready…' : 'Recording…') : hasLoop ? 'Record again' : 'Record'}
        </button>
        {hasLoop && !rec && <button className="btn" onClick={() => void record(true)}>＋ Add a layer</button>}
        {hasLoop && !rec && <button className="btn" onClick={clearLoop}>Clear</button>}
      </div>
      {rec && (
        <div className="rec-meter">
          <div className="rec-progress"><div style={{ width: `${recProgress * 100}%` }} /></div>
          <div className="small muted">{recWaiting ? (pos.countIn > 0 ? `Count-in: ${pos.countIn}` : 'Starts at the top of the loop…') : 'Recording one pass of the loop'} · input level</div>
          <div className="level"><div style={{ width: `${Math.min(100, recLevel * 160)}%` }} /></div>
        </div>
      )}
      {layers.length > 0 && (
        <ul className="layers">
          {layers.map((l, i) => (
            <li key={l.id}>
              <span>Layer {i + 1}</span>
              <button className="chip" aria-pressed={!l.muted} onClick={() => { transport.current?.muteLayer(l.id, !l.muted); setLayers(ls => ls.map(x => (x.id === l.id ? { ...x, muted: !x.muted } : x))) }}>{l.muted ? 'Muted' : 'On'}</button>
              <span className="nudge" title="Fine timing: if this layer sounds late, tap Earlier">
                <button className="btn sm" onClick={() => { const v = transport.current?.nudgeLayer(l.id, -10) ?? 0; setLayers(ls => ls.map(x => (x.id === l.id ? { ...x, shift: v } : x))) }} aria-label="Play this layer later">Later</button>
                <span className="small muted">{l.shift > 0 ? `${l.shift} ms early` : l.shift < 0 ? `${-l.shift} ms late` : 'in time'}</span>
                <button className="btn sm" onClick={() => { const v = transport.current?.nudgeLayer(l.id, 10) ?? 0; setLayers(ls => ls.map(x => (x.id === l.id ? { ...x, shift: v } : x))) }} aria-label="Play this layer earlier">Earlier</button>
              </span>
              <button className="btn sm ghost" onClick={() => { transport.current?.removeLayer(l.id); setLayers(ls => ls.filter(x => x.id !== l.id)) }}>Delete</button>
            </li>
          ))}
        </ul>
      )}
      {hasLoop && <p className="small muted" style={{ margin: 0 }}>Your loop replaces the backing chords (turn <b>Chords</b> back on to hear both). Tempo and chords are locked while a loop exists.</p>}
      <details className="small">
        <summary>Recording settings and timing</summary>
        <div className="stack" style={{ gap: 8, marginTop: 8 }}>
          <label className="row"><input type="checkbox" checked={backingWhileRec} onChange={e => setBackingWhileRec(e.target.checked)} /> Play the backing chords while I record (leave off with the phone mic, or the mic records them too)</label>
          <div className="row">
            <span>Timing fix{inputInfo ? (inputInfo.external ? ' (amp)' : ' (phone mic)') : ''}: <b>{latMs} ms</b>{latMeasured ? '' : ' (estimated)'}</span>
            <button className="btn sm" onClick={() => setLatency(Math.max(0, latMs - 10))}>−10</button>
            <button className="btn sm" onClick={() => setLatency(Math.min(500, latMs + 10))}>+10</button>
            <button className="btn sm" onClick={() => void calibrate()} disabled={!!calib?.running || !!rec}>Timing check</button>
          </div>
          {calib && (
            <p className="notice" style={{ margin: 0 }}>
              {calib.running
                ? `Play a short muted strum exactly on each click (${Math.max(0, calib.click + 1)} / 8). With the phone mic and no headphones, you can just stay quiet: it hears the clicks itself.`
                : calib.result !== null && calib.result !== undefined
                  ? `Done: your setup delays sound by about ${calib.result} ms, so recordings are shifted back by that much.`
                  : "Couldn't hear clear clicks or strums. Try again a little louder, or set the timing fix by ear: if your loop sounds late, raise it."}
            </p>
          )}
          <p className="muted" style={{ margin: 0 }}>If your recorded loop sounds a little late or early against the drums, run the timing check once. Bluetooth headphones add a lot of delay; wired headphones or the amp's own headphone jack work best.</p>
        </div>
      </details>
      {loopError && <p className="notice small" role="alert">{loopError}</p>}
    </div>
  )

  const scalesPanel = (
    <div className="stack">
      <div className="stack" style={{ gap: 6 }}>
        {tips.map((t, i) => (
          <button key={i} onClick={() => setTipIdx(i)} aria-pressed={i === tipIdx} className={`tip-btn${i === tipIdx ? ' on' : ''}`}>
            <div style={{ fontWeight: 600 }}>{t.root} {scaleById(t.scale).label}</div>
            <div className="small muted">{t.why}</div>
          </button>
        ))}
      </div>
      {chordTip && (
        <div className="notice small">
          <b>Over {cur!.symbol}:</b> {chordTip.why}{' '}
          {onOpenScale && <button className="chip" style={{ minHeight: 30, marginLeft: 4 }} onClick={() => onOpenScale(chordTip.root, chordTip.scale)}>Open in Scales</button>}
        </div>
      )}
    </div>
  )

  const neck = info && tip && (
    <div>
      <h3 style={{ marginTop: 0 }}>{tip.root} {scaleById(tip.scale).label}{cur ? <span className="muted"> · {cur.symbol} notes in amber</span> : null}</h3>
      <Fretboard
        tuning={inst.midis}
        markFor={midi => {
          const q = midi % 12
          const inScale = info.pcs.includes(q)
          const inChord = chordSet.has(q)
          if (!inScale && !inChord) return null
          const label = info.labels.get(q) ?? ''
          if (inChord) return { label: label || '•', role: q === chordRoot ? 'root' : 'chord' }
          return { label, role: 'scale' }
        }}
        onTap={midi => strum([midi])}
      />
    </div>
  )

  const circle = (
    <div className="cof-panel">
      {(
        <>
          <div className="cof-wrap">
            <CircleOfFifths
              tonic={tonic}
              minor={minorKey}
              used={prog.map(circleChord)}
              active={cur ? circleChord(cur) : null}
              onPick={(root, minor) => { if (locked) return; setTonic(root); setMode(minor ? (mode === 'dorian' || mode === 'phrygian' || mode === 'harmonic' ? mode : 'minor') : (mode === 'mixolydian' || mode === 'lydian' ? mode : 'major')) }}
              size={300}
            />
          </div>
        </>
      )}
    </div>
  )

  const miniTransport = (
    <div className="row jam-mini">
      <button className={`btn${playing ? '' : ' primary'}`} disabled={loadingSounds} onClick={() => (playing ? stopAll() : void playWhenReady())} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {playing ? <IconStop /> : <IconPlay />} {playing ? 'Stop' : 'Play loop'}
      </button>
      <span className="readout jam-now">{cur ? cur.symbol : prog.map(c => c.symbol).join(' ')}</span>
      {pos.countIn > 0 && <span className="count-in readout">{pos.countIn}</span>}
    </div>
  )

  return (
    <div className={`stack jam${playing ? ' playing' : ''}`} style={{ ['--beat' as string]: `${(60 / bpm).toFixed(3)}s` }}>
      <header className="screen-head jam-head">
        <PsyPic id="stage" at="50% 22%" className="screen-art beat-art" />
        <h1>Jam{inst.isUke ? <span className="muted small"> · {inst.short}</span> : null}</h1>
        {page === 'jam' && <button className="btn sm" onClick={() => setOptionsOpen(!optionsOpen)} aria-expanded={optionsOpen}>{optionsOpen ? 'Hide options' : 'Options'}</button>}
      </header>
      <SubTabs label="Jam" value={page} onChange={setPage} tabs={[
        { id: 'jam', label: 'Jam' },
        { id: 'solo', label: 'Solo over it' },
        { id: 'tab', label: 'Make a tab' },
        { id: 'find', label: 'Find chords' },
        { id: 'beats', label: 'Beat maker' },
      ]} />

      {page === 'jam' && (
        <>
          {optionsOpen && options}
          <WinArea area="jam">
          <Win id="gen" title="Progression" className="panel" bodyClass="stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="row" style={{ gap: 6, minWidth: 0 }}><span className="small muted">{summary}</span>{cardsHint}</span>
              <button className="btn primary big" onClick={roll} disabled={locked} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <IconDice /> New progression
              </button>
            </div>
            {cardsHintBody}
            {cards}
            {chordInfo}
            {transportRow}
          </Win>
          <Win id="looper" title={`Looper${rec ? ' (recording…)' : hasLoop ? ` (${layers.length} layer${layers.length > 1 ? 's' : ''})` : ''}`} className="panel">
            <p className="small muted" style={{ marginTop: 0 }}>{`Tap Record, listen to the count-in, and play the progression once through (${totalBars} bars). Recording starts and stops on the beat by itself and is exactly one loop long.`}</p>
            {looper}
          </Win>
          <Win id="famous" title={`Famous progressions in ${tonic}`} className="panel">
            <div className="stack" style={{ gap: 8 }}>
              {sugg.map((s, i) => (
                <div key={i} className="row" style={{ justifyContent: 'space-between', borderTop: i ? '1px solid var(--hairline)' : 'none', paddingTop: i ? 8 : 0 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div className="readout" style={{ fontSize: 20, fontWeight: 600, color: 'var(--pearl-2)', overflowWrap: 'anywhere' }}>{s.chords.map(c => c.symbol).join('  ')}</div>
                    {s.note && <div className="small muted">{s.note}</div>}
                  </div>
                  <button className="btn" disabled={locked} onClick={() => load(s.chords)}>Use this</button>
                </div>
              ))}
            </div>
          </Win>
          </WinArea>
        </>
      )}

      {page === 'solo' && (
        <>
          <WinArea area="jamSolo">
          <Win id="scales" title="Loop and scales" className="panel" bodyClass="stack">
            {miniTransport}
            <p className="small muted" style={{ margin: 0 }}>Start the loop, then solo with a scale below. Land on the amber notes when each chord starts: that's how a solo follows the changes.</p>
            {scalesPanel}
          </Win>
          <Win id="neck" title="Neck" className="panel">{neck}</Win>
          <Win id="circle" title={`Circle of fifths · ${tonic} ${minorKey ? 'minor' : 'major'}`} className="panel" bodyClass="stack">
            <p className="small muted" style={{ margin: 0 }}>The shaded slice is your key: its chords sit next to each other. Teal rings are the chords in this progression; the amber one is playing. Tap a key to switch.</p>
            {circle}
          </Win>
          </WinArea>
        </>
      )}

      {page === 'tab' && (
        <section className="panel stack">
          <p className="small muted" style={{ margin: 0 }}>Turn <b>{prog.map(c => c.symbol).join(' – ')}</b> into a tab to play along with in Play: the mic follows you note by note.</p>
          <div className="seg" role="group" aria-label="What to make">
            {([['pick', 'Fingerpicking'], ['melody', 'Chord melody'], ['licks', `Licks in ${tonic}`]] as const).map(([id, label]) => (
              <button key={id} aria-pressed={tabPart === id} onClick={() => setTabPart(id)}>{label}</button>
            ))}
          </div>
          {tabPart === 'licks'
            ? <LickMaker fixedKey={tonic} onOpen={doc => void saveSong(doc).then(() => openInPlay(doc))} />
            : <ProgressionTabs part={tabPart} chords={prog} voicings={chosen} tonic={tonic} mode={mode} bpm={bpm} suggest={patternForStrum(strumKind)}
              onOpen={doc => void saveSong(doc).then(() => openInPlay(doc))} />}
        </section>
      )}

      {page === 'beats' && <Suspense fallback={<p className="muted">Loading the beat maker…</p>}><StudioScreen active={page === 'beats'} /></Suspense>}

      {page === 'find' && (<>
        <section className="panel stack">
          <h2 className="sec-title" style={{ margin: 0 }}>Tab on screen in the video?</h2>
          <TabFromPicture onOpen={doc => void saveSong(doc).then(() => openInPlay(doc))} />
        </section>
        <section className="panel stack">
          <h2 className="sec-title" style={{ margin: 0 }}>Listen for the chords</h2>
          <SongFinder
            onUseInJam={(root, minor, chords) => {
              const m: ModeId = minor ? 'minor' : 'major'
              setTonic(root)
              setMode(m)
              load(chords.map(c => spell(root, m, { semi: (pc(c.root) - pc(root) + 12) % 12, type: c.q })).map(c => ({ ...c, beats: rate })))
              setPage('jam')
            }}
            onOpen={doc => void saveSong(doc).then(() => openInPlay(doc))} />
        </section>
      </>)}
    </div>
  )
}

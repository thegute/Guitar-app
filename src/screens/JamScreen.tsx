// Jam: generate chord progressions (lots of options), see every chord shape, play them back with strumming and drums,
// loop over it in the 4-track looper, and see which scales to solo with.
import { Ico } from '../components/Icon'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import {
  MODES, STYLES, FLAVORS, ENDINGS, SPICE, STYLE_DEFAULTS, FN_LABEL,
  randomProgression, swapChord, spell, suggestions, scalesForProgression, resolveFlavor, typeTones,
  type ModeId, type Style, type Flavor, type Ending, type ProgChord,
} from '../theory/progressions'
import type { Voicing } from '../theory/chords'
import { useInstrument, type Instrument } from '../instrument'
import { scaleById, scaleInfo } from '../theory/scales'
import { ChordDiagram } from '../components/ChordDiagram'
import { CircleOfFifths } from '../components/CircleOfFifths'
import { Chips, Field, KeyPicker, usePersist } from '../components/Controls'
import { IconDice, IconLock, IconPlay, IconStop, IconPencil } from '../components/Icons'
import { useHint } from '../components/Fold'
import { Win, WinArea } from '../components/Win'
import { chordInfo as readChord } from '../tabs/harmony'
import { VoiceLeadNeck } from '../components/VoiceLeadNeck'
import { strum as strumNotes, preload, SOUNDS, soundInfo, loadSound, loadBank, bankLoaded, type SoundId } from '../audio/pluck'
import { BASSLINES } from '../audio/bass'
import { audio, keepAwake } from '../audio/engine'
import { JamTransport } from '../audio/jam'
import { useRig } from '../audio/rig'
import { usePracticeTimer } from '../learn/progress'
import { usePedals } from '../controls/pedals'
import { STRUMS } from '../audio/strums'
import { GROOVES, GROOVE_GROUPS, KITS, grooveOf, kitInfo, loadKit, kitLoaded, type KitId } from '../audio/drums'
import { shapesFor as shapesForChord } from '../theory/shapes'
import { Transcriber } from '../components/Transcriber'
import { saveSong } from '../tabs/library'
import { go, openInPlay, setSubPage } from '../nav'
import { clearFloat, publishFloat, setFloatResting } from '../float/bus'
import { SongFinder } from '../components/SongFinder'
import { RiffScanner } from '../scan/RiffScanner'
import type { Quality } from '../audio/chordFinder'
import { Zoomable } from '../components/Zoomable'
import { useSubTab } from '../components/SubTabs'
import { PsyPic } from '../components/PsyArt'
import { pc } from '../theory/notes'
import { useScreenInfo } from '../assistant/screen'

const StudioScreen = lazy(() => import('../studio/StudioScreen').then(m => ({ default: m.StudioScreen })))
const LooperPanel = lazy(() => import('../looper/LooperPanel').then(m => ({ default: m.LooperPanel })))

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

// onOpenScale: kept for App's link to Tools → Scales (the old Solo over it page used it)
export function JamScreen(_props: { onOpenScale?: (root: string, scale: string) => void }) {
  const inst = useInstrument()
  tuning = inst.midis
  // ---------- options ----------
  const [tonic, setTonic] = usePersist('progKey', 'G')
  const [mode, setMode] = usePersist<ModeId>('progMode', 'major')
  const [style, setStyleRaw] = usePersist<Style>('progStyle', 'any')
  // bossa nova was swapped for classical (owner's choice): an old saved choice moves over
  useEffect(() => { if (style === 'bossa') setStyleRaw('classical') }, []) // eslint-disable-line react-hooks/exhaustive-deps
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
  const [optionsOpen, setOptionsOpen] = usePersist('jamOptionsOpen', false)
  // Jam is three choices (Play with a band, Make a beat, Loop myself) plus the Riff Scanner behind a small link. Solo over it
  // became floating cards (chord now & next + mini neck while the band plays); Make a tab moved to Learn → Exercises.
  const [page, setPage] = useSubTab('jam', ['jam', 'beats', 'loop', 'find'] as const)
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
  useRig()
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
  const info = tip ? scaleInfo(tip.root, tip.scale) : null
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
    if (prog.some(c => c.beats !== rate)) setProg(p => p.map(x => ({ ...x, beats: rate })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate])

  // ---------- transport ----------
  function applySong() {
    const t = tr()
    chosen.forEach(v => preload(midisOf(v), tone))
    t.setSong(prog.map((c, i) => ({ midis: midisOf(chosen[i]), beats: c.beats ?? 4, root: pc(c.root), tones: typeTones(c.type) })), bpm, strumKind, drums, bassLine, tone, kitId === 'auto' ? null : kitId)
    t.setMix({ chords: chordsOn, drums: drumsOn, click: clickOn, bass: bassOn })
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
    transport.current?.stop()
    setPlaying(false)
    setPos({ chord: -1, countIn: 0, beat: -1 })
    void keepAwake(false)
  }
  useEffect(() => () => { transport.current?.stop(); void keepAwake(false) }, [])
  // the beat maker has its own clock: the jam loop stops when you open it
  useEffect(() => { if ((page === 'beats' || page === 'loop') && transport.current?.playing) stopAll() }, [page]) // eslint-disable-line react-hooks/exhaustive-deps
  // live changes: restart in time (layers keep their place)
  useEffect(() => {
    if (transport.current?.playing) startPlay(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, strumKind, drums, prog, shapeIdx, shapePref, bassLine, tone, kitId])
  useEffect(() => {
    transport.current?.setMix({ chords: chordsOn, drums: drumsOn, click: clickOn, bass: bassOn })
  }, [chordsOn, drumsOn, clickOn, bassOn])

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
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  // this progression as a beat (drums from the style's groove, keys + bass on the chords), then the looper on it
  async function loopIt() {
    stopAll()
    const [{ station }, { beatFromJam }] = await Promise.all([import('../looper/station'), import('../studio/practice')])
    const chords = prog.map(c => { const ci = readChord(c.symbol); const root = ci ? ci.root : pc(c.root); return { root: c.root, ivs: ci ? [...new Set(ci.pcs.map(p => (p - root + 12) % 12))].sort((a, b) => a - b) : [0, 4, 7], beats: c.beats ?? 4 } })
    const b = beatFromJam({ chords, bpm, key: tonic, minor: /minor|aeolian|dorian|phrygian|locrian/i.test(mode), groove: drums === 'off' ? 'rock' : drums, kit })
    station().useBeat({ ...b, name: `Jam ${prog.map(c => c.symbol).join(' ')}`.slice(0, 40) })
    setPage('loop')
  }
  usePedals({
    startStop: () => (transport.current?.playing ? stopAll() : void playWhenReady()),
    restart: () => { stopAll(); startPlay(0) },
  })


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
              <button className="pc-swap" onClick={e => { e.stopPropagation(); swap(i) }} aria-label={`Swap ${c.symbol} for another chord`}>↻</button>
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
          <input type="range" min={50} max={200} value={bpm} onChange={e => setBpm(+e.target.value)} style={{ accentColor: 'var(--amber)', width: 170 }} aria-label="Loop tempo" />
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

  // Play the changes: gold chord tones, faint scale, and the next chord's 3rd and root in cyan two beats early
  const nextIdx = prog.length ? (active + 1) % prog.length : -1
  const loopBeats = prog.reduce((t, c) => t + (c.beats ?? 4), 0)
  const startOf = (i: number) => prog.slice(0, i).reduce((t, c) => t + (c.beats ?? 4), 0)
  const beatsLeft = playing && pos.chord >= 0 && loopBeats ? ((startOf(active) + (cur?.beats ?? 4) - (pos.beat % loopBeats)) + loopBeats) % loopBeats : 99

  // Solo over it = floating cards: while the band plays, the chord now & next (with a countdown) and the mini neck with the
  // best scale to solo with over this progression (the old Solo over it page's pick), at the band's tempo
  useEffect(() => {
    const on = playing && page === 'jam'
    setFloatResting('jam', !on)
    if (!on) return
    publishFloat('jam', {
      title: 'Jam', tuning: inst.midis,
      chordNow: pos.chord >= 0 ? cur?.symbol : undefined, chordNext: pos.chord >= 0 && nextIdx >= 0 ? prog[nextIdx].symbol : undefined,
      beatsToChange: beatsLeft < 99 ? beatsLeft : undefined,
      keyPcs: info ? info.pcs : undefined, keyName: tip ? `${tip.root} ${scaleById(tip.scale).label}` : undefined,
      bpm, speed: 1,
    })
  })
  useEffect(() => () => { setFloatResting('jam', true); clearFloat('jam') }, [])
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
              onPick={(root, minor) => { setTonic(root); setMode(minor ? (mode === 'dorian' || mode === 'phrygian' || mode === 'harmonic' ? mode : 'minor') : (mode === 'mixolydian' || mode === 'lydian' ? mode : 'major')) }}
              size={300}
            />
          </div>
        </>
      )}
    </div>
  )

  // chords found by listening or scanning → this Jam progression
  const takeFound = (root: string, minor: boolean, chords: { root: string; q: Quality }[]) => {
    const m: ModeId = minor ? 'minor' : 'major'
    setTonic(root)
    setMode(m)
    load(chords.map(c => spell(root, m, { semi: (pc(c.root) - pc(root) + 12) % 12, type: c.q })).map(c => ({ ...c, beats: rate })))
    setPage('jam')
  }
  return (
    <div className={`stack jam${playing ? ' playing' : ''}`} style={{ ['--beat' as string]: `${(60 / bpm).toFixed(3)}s` }}>
      <header className="screen-head jam-head">
        <PsyPic id="stage" at="50% 22%" className="screen-art beat-art" />
        <h1>Jam{inst.isUke ? <span className="muted small"> · {inst.short}</span> : null}</h1>
        {page === 'jam' && <button className="btn sm" onClick={() => setOptionsOpen(!optionsOpen)} aria-expanded={optionsOpen}>{optionsOpen ? 'Hide options' : 'Options'}</button>}
      </header>
      <div className="subtabs jam-choices" role="tablist" aria-label="Jam">
        {([['jam', 'drum', 'Play with a band', 'Chords, strums, bass and drums to play over'], ['beats', 'zap', 'Make a beat', 'Pads, steps, keys and your own samples'], ['loop', 'loop', 'Loop myself', 'Record layers over a beat, four tracks']] as const).map(([id, icon, label, sub]) => (
          <button key={id} role="tab" aria-selected={page === id} className={`jam-choice${page === id ? ' on' : ''}`} onClick={() => setPage(id)} data-testid={`jam-${id}`}>
            <Ico n={icon} /><span className="jam-choice-text"><b>{label}</b><span className="small">{sub}</span></span>
          </button>
        ))}
      </div>
      {page === 'find'
        ? <button className="link-btn small jam-scan-link" onClick={() => setPage('jam')} data-testid="jam-scan-back">‹ Back to Jam</button>
        : <button className="link-btn small jam-scan-link" onClick={() => setPage('find')} data-testid="jam-scan-link"><Ico n="scan" /> <span className="long">Riff Scanner: get a riff or a whole song from a video, a picture or a recording</span><span className="short">Riff Scanner: a song from a video or picture</span></button>}

      {page === 'jam' && (
        <>
          {optionsOpen && options}
          <WinArea area="jam" defaultHidden={['voice', 'circle', 'maketab']}>
          <Win id="gen" title="Progression" className="panel" bodyClass="stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="row" style={{ gap: 6, minWidth: 0 }}><span className="small muted">{summary}</span>{cardsHint}</span>
              <button className="btn primary big" onClick={roll} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <IconDice /> New progression
              </button>
            </div>
            {cardsHintBody}
            {cards}
            {chordInfo}
            {transportRow}
          </Win>
          {prog.length >= 2 && (
            <Win id="voice" title="Voice leading: chord shapes that barely move" className="panel" hint="Each chord in a shape close to the last one: gold rings are notes both chords share (keep that finger down), gold arrows are the 3rds and 7ths moving a fret or two. It follows the loop while it plays. Practise the changes opens it as a tab in Play.">
              <VoiceLeadNeck chords={prog.map(c => c.symbol)} at={playing && pos.chord >= 0 ? active : undefined} tuning={inst.midis} where="jam" bpm={bpm} />
            </Win>
          )}
          <Win id="circle" title={`Circle of fifths · ${tonic} ${minorKey ? 'minor' : 'major'}`} className="panel" bodyClass="stack">
            <p className="small muted" style={{ margin: 0 }}>The shaded slice is your key: its chords sit next to each other. Teal rings are the chords in this progression; the amber one is playing. Tap a key to switch.</p>
            {circle}
          </Win>
          <Win id="maketab" title="Make a tab from these chords" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
            <p className="small muted" style={{ margin: 0 }}>Fingerpicking, licks and solos, chord melody or riffs over <b>{prog.map(c => c.symbol).join(' – ')}</b>: the tab maker is in Learn → Exercises → Make your own, and it uses this progression.</p>
            <div className="row"><button className="btn" onClick={() => { try { localStorage.setItem('kg:exSection', JSON.stringify('make')); localStorage.setItem('kg:tm:useJam', 'true') } catch { /* private */ } setSubPage('learn', 'exercises'); go('learn'); setTimeout(() => document.querySelector('[data-win="ex-licks"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400) }} data-testid="jam-make-tab"><Ico n="file" /> Open the tab maker</button></div>
          </Win>
          <Win id="looper" title="Loop over it" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
            <p className="small muted" style={{ margin: 0 }}>Turns this progression into a beat (drums, keys and bass on these chords, at {bpm} BPM) and opens the 4-track looper on it: record rhythm, embellishments, a bassline and a lead over it.</p>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn primary" onClick={() => void loopIt()} disabled={!prog.length} data-testid="jam-loop-it"><Ico n="loop" /> Loop over this progression</button>
            </div>
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
                  <button className="btn" onClick={() => load(s.chords)}>Use this</button>
                </div>
              ))}
            </div>
          </Win>
          </WinArea>
        </>
      )}

      {page === 'loop' && <Suspense fallback={<p className="muted">Loading the looper…</p>}><LooperPanel /></Suspense>}
      {page === 'beats' && <Suspense fallback={<p className="muted">Loading the beat maker…</p>}><StudioScreen active={page === 'beats'} /></Suspense>}

      {page === 'find' && (
        <RiffScanner
          onUseInJam={names => {
            // scanned chord names → this Jam progression (key from the first chord)
            const parsed = names.map(n => /^([A-G][#b]?)(.*)$/.exec(n.split('/')[0])).filter((m): m is RegExpExecArray => !!m)
            if (parsed.length < 2) return
            const q = (suf: string): Quality => /^m7/.test(suf) ? 'm7' : /^(m|min)(?!aj)/.test(suf) ? 'm' : /^7/.test(suf) ? '7' : ''
            const root = parsed[0][1], minor = q(parsed[0][2]).startsWith('m')
            takeFound(root, minor, parsed.map(m => ({ root: m[1], q: q(m[2]) })))
          }}
          listen={<WinArea area="jamFind">
            <Win id="listen" title="Listen for the chords" className="panel" bodyClass="stack">
              <SongFinder onUseInJam={takeFound} onOpen={d0 => { const doc = { ...d0, origin: 'recording' as const }; void saveSong(doc).then(() => openInPlay(doc)) }} />
            </Win>
            <Win id="notes" title="Notes from a recording (accurate)" className="panel" bodyClass="stack">
              <Transcriber onOpen={d0 => { const doc = { ...d0, origin: 'recording' as const }; void saveSong(doc).then(() => openInPlay(doc)) }} />
            </Win>
          </WinArea>} />
      )}
    </div>
  )
}

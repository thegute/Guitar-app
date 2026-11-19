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
import { ImprovCoach } from '../coach/ImprovCoach'
import { VoiceLeadNeck } from '../components/VoiceLeadNeck'
import { bassPacks, bassPackFor, BASS_LABEL, BASS_PACK, STYLE_BASS, type BassKind } from '../audio/packSounds'
import { loadPrivatePack } from '../engine/packs'
import { strum as strumNotes, preload, allSounds, soundInfo, loadSound, loadBank, bankLoaded, soundLoaded, activeSound, soundForProgram, type SoundId } from '../audio/pluck'
import { BASSLINES } from '../audio/bass'
import { audio, keepAwake } from '../audio/engine'
import { JamTransport } from '../audio/jam'
import { TabPlayer } from '../audio/tabPlayer'
import { flatten } from '../tabs/model'
import { useRig } from '../audio/rig'
import { usePracticeTimer } from '../learn/progress'
import { usePedals } from '../controls/pedals'
import { STRUMS } from '../audio/strums'
import { GROOVES, GROOVE_GROUPS, KITS, grooveOf, kitInfo, loadKit, kitLoaded, type KitId } from '../audio/drums'
import { shapesFor as shapesForChord } from '../theory/shapes'
import { Transcriber } from '../components/Transcriber'
import { saveSong, type SongDoc } from '../tabs/library'
import { go, learnGo, openExercisesFiltered, openFlowCoach, openInPlay, openSongsInKey, openStrumGrid, setSubPage } from '../nav'
import { HarmonicFlowCoach } from '../components/HarmonicFlowCoach'
import { StrumGrid } from '../components/StrumGrid'
import { setActiveFeatureIntro } from '../components/FeatureIntro'
import type { StrumChart, StrumStyleId } from '../theory/harmonicFlow'
import { clearFloat, publishFloat, setFloatResting } from '../float/bus'
import { SongFinder } from '../components/SongFinder'
import { InspireMe } from '../components/InspireMe'
import { ChordList } from '../components/ChordName'
import { RiffScanner } from '../scan/RiffScanner'
import type { Quality } from '../audio/chordFinder'
import { Zoomable } from '../components/Zoomable'
import { useSubTab } from '../components/SubTabs'
import { PsyPic } from '../components/PsyArt'
import { KEYS, pc } from '../theory/notes'
import { LICKS, type LickDef } from '../licks/library'
import { lickStyle } from '../licks/styles'
import { lickInKey } from '../licks/generator'
import { jamProfile, matchingLicksForJam, worksOverForLick, worksOverSummary } from '../licks/worksOver'
import { formatKeyBadge } from '../tabs/keyDetect'
import { detectJamKeyMismatch, keyOptionId, transposeJamProg } from '../tabs/transpose'
import { addToChain, chainable, checkChainAdd, lickMinor, loadChain, matchChainTranspose, startNewChain, type ChainAddCheck } from '../licks/chain'

const bassLineKind = (id: string): BassKind => BASSLINES.find(b => b.id === id)?.bass ?? 'session'
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
  // which recorded bass (when the owner's Studio Bass packs are on the phone): the style's, or one he picks
  const [bassKindPick, setBassKindPick] = usePersist<'auto' | BassKind>('bassSound', 'auto')
  const haveBassPacks = bassPacks().length > 0
  const [bandOpen, setBandOpen] = useState(false)
  const [optionsOpen, setOptionsOpen] = usePersist('jamOptionsOpen', false)
  // Jam is three choices (Play with a band, Make a beat, Loop myself) plus the Riff Scanner behind a small link. Solo over it
  // became floating cards (chord now & next + mini neck while the band plays); Make a tab moved to Learn → Exercises.
  const [page, setPage] = useSubTab('jam', ['jam', 'strum', 'flow', 'beats', 'loop', 'find'] as const)
  useEffect(() => {
    if (page !== 'flow') setActiveFeatureIntro(page)
  }, [page])
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
  const [mismatchDismissed, setMismatchDismissed] = useState(false)
  useEffect(() => { setMismatchDismissed(false) }, [prog, tonic, mode])
  const mismatch = useMemo(() => (mismatchDismissed ? null : detectJamKeyMismatch(prog, tonic, mode)), [prog, tonic, mode, mismatchDismissed])
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
    t.bassKind = bassKindPick === 'auto' ? STYLE_BASS[style] : bassKindPick
    t.setSong(prog.map((c, i) => ({ midis: midisOf(chosen[i]), beats: c.beats ?? 4, root: pc(c.root), tones: typeTones(c.type) })), bpm, strumKind, drums, bassLine, tone, kitId === 'auto' ? null : kitId)
    t.setMix({ chords: chordsOn, drums: drumsOn, click: clickOn, bass: bassOn })
  }
  // load the sounds this style needs ahead of time, so the first bars aren't the stand-in synth
  useEffect(() => {
    void loadSound(tone)
    if (drums !== 'off') void loadKit(kit)
    if (bassLine !== 'off') { void loadBank('bass'); const pk = bassPackFor(bassKindPick === 'auto' ? STYLE_BASS[style] ?? bassLineKind(bassLine) : bassKindPick); if (pk) void loadPrivatePack(pk) }
  }, [tone, drums, bassLine, kit, bassKindPick, style])
  const [loadingSounds, setLoadingSounds] = useState(false)
  async function playWhenReady() {
    const ready = () => soundLoaded(tone) && (drums === 'off' || kitLoaded(kit)) && (bassLine === 'off' || bankLoaded('bass'))
    if (!ready()) {
      setLoadingSounds(true)
      const all = Promise.all([loadSound(tone), drums !== 'off' ? loadKit(kit) : null, bassLine !== 'off' ? loadBank('bass') : null])
      await Promise.race([all, new Promise(r => setTimeout(r, 6000))])
      setLoadingSounds(false)
    }
    startPlay(0)
  }
  const [licksOpen, setLicksOpen] = useState(false)
  const [playingLickId, setPlayingLickId] = useState<string | null>(null)
  const [jamChainPrompt, setJamChainPrompt] = useState<{ lickId: string; check: ChainAddCheck } | null>(null)
  const [jamChainToast, setJamChainToast] = useState<{ lickId: string; text: string } | null>(null)
  const activeChain = useMemo(() => loadChain(), [jamChainToast, jamChainPrompt, licksOpen, tonic, mode]) // eslint-disable-line react-hooks/exhaustive-deps
  const chainMismatch = activeChain.links.length > 0 && (pc(activeChain.key) !== pc(tonic) || !!activeChain.minor !== minorKey)
  const lickPlayer = useRef<TabPlayer | null>(null)
  const jamProf = useMemo(() => jamProfile(prog, tonic, mode, style), [prog, tonic, mode, style])
  const matchingLicks = useMemo(() => matchingLicksForJam(LICKS, jamProf, 12), [jamProf])

  function tapJamLickChain(l: LickDef) {
    const chk = checkChainAdd(l.id)
    if (!chk) return
    if (chk.ok) {
      addToChain(l.id, l.ref, lickMinor(l))
      setJamChainPrompt(null)
      setJamChainToast({ lickId: l.id, text: '✓ In chain' })
    } else {
      setJamChainPrompt({ lickId: l.id, check: chk })
    }
  }

  function stopLickPreview() {
    lickPlayer.current?.stop()
    setPlayingLickId(null)
  }
  function hearLick(l: LickDef) {
    if (playingLickId === l.id) { stopLickPreview(); return }
    const placed = lickInKey(l, tonic, inst.midis, bpm)
    if (!placed) return
    const trk = placed.song.tracks[0]
    if (!trk) return
    const p = (lickPlayer.current ??= new TabPlayer())
    p.stop()
    p.sound = activeSound(soundForProgram(trk.program))
    p.onStep = () => {}
    p.onEnd = () => setPlayingLickId(null)
    p.play(flatten(trk), 0, bpm)
    setPlayingLickId(l.id)
  }
  async function openLickInPlay(l: LickDef) {
    stopLickPreview()
    stopAll()
    const placed = lickInKey(l, tonic, inst.midis, bpm)
    if (!placed) return
    const doc: SongDoc = {
      id: `lick:${l.id}:${tonic}:${inst.id}:${bpm}`,
      title: placed.song.title,
      source: 'lesson',
      inst: inst.id,
      key: { root: tonic, minor: l.minor ?? lickStyle(l.style).minor },
      song: placed.song,
      updated: Date.now(),
    }
    try { await saveSong(doc) } catch { /* still opens */ }
    openInPlay(doc)
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
    stopLickPreview()
    setPlaying(false)
    setPos({ chord: -1, countIn: 0, beat: -1 })
    void keepAwake(false)
  }
  useEffect(() => () => { transport.current?.stop(); lickPlayer.current?.stop(); void keepAwake(false) }, [])
  // the beat maker has its own clock: the jam loop stops when you open it
  useEffect(() => { if ((page === 'beats' || page === 'loop') && (transport.current?.playing || playingLickId)) stopAll() }, [page]) // eslint-disable-line react-hooks/exhaustive-deps
  // live changes: restart in time (layers keep their place)
  useEffect(() => {
    if (transport.current?.playing) startPlay(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, strumKind, drums, prog, shapeIdx, shapePref, bassLine, tone, kitId, bassKindPick])
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
    <Win id="options" title="Options" className="panel" bodyClass="stack jam-options">
      <div className="jam-opts-grid">
        <Field label="Key">
          <select className="select" value={tonic} onChange={e => setTonic(e.target.value)} aria-label="Key">
            {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
        <Field label="Mode">
          <select className="select" value={mode} onChange={e => setMode(e.target.value as ModeId)} aria-label="Mode">
            {MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Style">
          <select className="select" value={style} onChange={e => setStyle(e.target.value as Style)} aria-label="Style">
            {STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Chord colour">
          <select className="select" value={flavor} onChange={e => setFlavor(e.target.value as Flavor)} aria-label="Chord colour">
            {FLAVORS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </Field>
        <Field label="How many chords">
          <select className="select" value={count} onChange={e => setCount(Number(e.target.value))} aria-label="How many chords">
            {COUNTS.map(n => <option key={n} value={n}>{n} chords</option>)}
          </select>
        </Field>
        <Field label="Chord changes">
          <select className="select" value={rate} onChange={e => setRate(Number(e.target.value))} aria-label="Chord changes">
            {RATES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Start on">
          <select className="select" value={start} onChange={e => setStart(e.target.value as 'home' | 'any')} aria-label="Start on">
            <option value="home">Home chord</option>
            <option value="any">Anywhere</option>
          </select>
        </Field>
        <Field label="Ending">
          <select className="select" value={ending} onChange={e => setEnding(e.target.value as Ending)} aria-label="Ending">
            {ENDINGS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </Field>
        <Field label="Surprise level">
          <select className="select" value={spice} onChange={e => setSpice(Number(e.target.value))} aria-label="Surprise level">
            {SPICE.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Chord shapes">
          <select className="select" value={shapePref} onChange={e => setShapePref(e.target.value as 'open' | 'easy' | 'barre' | 'neck')} aria-label="Chord shapes">
            {SHAPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </Field>
      </div>
      <p className="small muted" style={{ margin: 0 }}>{MODES.find(m => m.id === mode)!.feel}. {SPICE[spice].hint}.</p>
    </Win>
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
                <div className="readout pc-name" data-chord={c.symbol}>{c.symbol}</div>
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
      <b data-chord={cur.symbol}>{cur.symbol}</b> <span className="muted">({cur.roman})</span>{cur.fn ? ` · ${FN_LABEL[cur.fn]}` : ''}{cur.why ? `. ${cur.why}` : cur.borrowed ? '. From outside the key.' : ''}
    </p>
  )

  const transportRow = (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <button className={`btn big${playing ? '' : ' primary'}`} disabled={loadingSounds} onClick={() => (playing ? stopAll() : void playWhenReady())} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {playing ? <IconStop /> : <IconPlay />} {playing ? 'Stop' : loadingSounds ? 'Loading sounds…' : 'Play loop'}
        </button>
        <Field label={`Tempo ${bpm} BPM`}>
          <input type="range" min={50} max={200} value={bpm} onChange={e => setBpm(+e.target.value)} style={{ accentColor: 'var(--amber)', width: 160 }} aria-label="Loop tempo" />
        </Field>
        <Field label="Pattern">
          <select className="select" value={strumId} onChange={e => setStrumId(e.target.value)} data-testid="jam-pattern">
            <option value="auto">Match the style ({STRUMS.find(s => s.id === STYLE_DEFAULTS[style].strum)?.label})</option>
            {STRUMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <button className="btn" onClick={() => void loopIt()} disabled={!prog.length} data-testid="jam-loop-it" title="Turn this progression into a beat and open the 4-track looper on it">
          <Ico n="loop" /> Loop over it
        </button>
        {pos.countIn > 0 && <span className="count-in readout">{pos.countIn}</span>}
      </div>
      <button className="band-line" aria-expanded={bandOpen} onClick={() => setBandOpen(!bandOpen)}>
        <span className="small muted">Band</span>
        <span className="band-parts">
          <b>{soundInfo(tone).label}</b> · {drums === 'off' ? 'no drums' : `${GROOVES.find(g => g.id === drums)?.label ?? drums} drums (${kitInfo(kit).label.toLowerCase()})`} · {bassLine === 'off' ? 'no bass' : `${BASSLINES.find(b => b.id === bassLine)?.label ?? bassLine} bass`}
        </span>
        <IconPencil />
      </button>
      {bandOpen && (
      <div className="row band-edit">
        <Field label="Guitar sound">
          <select className="select" value={toneId} onChange={e => { const v = e.target.value as 'auto' | SoundId; setToneId(v); strumNotes(midisOf(chosen[Math.max(0, selected)]), 0, { sound: v === 'auto' ? styleTone : v }) }} title={soundInfo(tone).hint}>
            <option value="auto">Match the style ({soundInfo(styleTone).label})</option>
            {allSounds().map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
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
        {haveBassPacks && bassLine !== 'off' && (
          <Field label="Bass sound">
            <select className="select" value={bassKindPick} onChange={e => setBassKindPick(e.target.value as 'auto' | BassKind)} data-testid="jam-bass-sound">
              <option value="auto">Match the style ({BASS_LABEL[STYLE_BASS[style] ?? bassLineKind(bassLine)].split(' (')[0]})</option>
              {(Object.keys(BASS_LABEL) as BassKind[]).filter(k => bassPacks().includes(BASS_PACK[k])).map(k => <option key={k} value={k}>{BASS_LABEL[k]}</option>)}
            </select>
          </Field>
        )}
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
        {([
          ['jam', 'drum', 'Play with a band', 'Chords, strums, bass and drums to play over'],
          ['strum', 'music', 'Strum Machine', 'Acoustic, reggae, metal & orchestral charts'],
          ['flow', 'sparkles', 'Flow Coach', 'Chord Path, Vibe Sets, Key Shifter & Detect'],
          ['beats', 'zap', 'Make a beat', 'Pads, steps, keys and your own samples'],
          ['loop', 'loop', 'Loop myself', 'Record layers over a beat, four tracks'],
        ] as const).map(([id, icon, label, sub]) => (
          <button key={id} role="tab" aria-selected={page === id} className={`jam-choice${page === id ? ' on' : ''}`} onClick={() => setPage(id)} data-testid={`jam-${id}`}>
            <Ico n={icon} /><span className="jam-choice-text"><b>{label}</b><span className="small">{sub}</span></span>
          </button>
        ))}
      </div>
      {page === 'find'
        ? <button className="link-btn small jam-scan-link" onClick={() => setPage('jam')} data-testid="jam-scan-back">‹ Back to Jam</button>
        : <button className="link-btn small jam-scan-link" onClick={() => setPage('find')} data-testid="jam-scan-link"><Ico n="scan" /> <span className="long">Riff Scanner: get a riff or a whole song from a video, a picture or a recording</span><span className="short">Riff Scanner: a song from a video or picture</span></button>}

      {page === 'jam' && (
        <WinArea area="jam" defaultHidden={['famous', 'improv', 'voice', 'circle', 'maketab']}>
          {optionsOpen && options}
          <Win id="gen" title="Progression" className="panel" bodyClass="stack">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="row" style={{ gap: 6, minWidth: 0 }}><span className="small muted">{summary}</span>{cardsHint}</span>
              <button className="btn primary big" onClick={roll} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <IconDice /> New progression
              </button>
            </div>
            {cardsHintBody}
            {mismatch && (
              <div className="notice key-mismatch" role="status" data-testid="jam-key-mismatch">
                <span className="small">
                  <b>Key mismatch:</b> these chords look like <b>{mismatch.progKey.label}</b>, while Jam is set to <b>{mismatch.jamLabel}</b>.
                </span>
                <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn sm primary" data-testid="jam-transpose-chords" onClick={() => load(transposeJamProg(prog, mismatch.progKey.root, tonic, mode, mismatch.progKey.minor))}>
                    Transpose chords to {mismatch.jamLabel}
                  </button>
                  <button className="btn sm" data-testid="jam-switch-key" onClick={() => { setTonic(mismatch.progKey.root); setMode(mismatch.progKey.minor ? 'minor' : 'major') }}>
                    Switch Jam to {mismatch.progKey.label}
                  </button>
                  <button className="btn sm ghost" onClick={() => setMismatchDismissed(true)} aria-label="Ignore key mismatch">✕</button>
                </span>
              </div>
            )}
            {cards}
            {chordInfo}
            {transportRow}
            {prog.length > 0 && (
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn sm"
                  onClick={() => {
                    stopAll()
                    const styleMap: Partial<Record<Style, StrumStyleId>> = {
                      bluegrass: 'bluegrass', folk: 'folk', reggae: 'reggae', reggaerock: 'reggae',
                      metal: 'metal-chug', progmetal: 'djent', blues: 'blues', funk: 'funk',
                      bossa: 'bossa', island: 'island', rock: 'rock', jazz: 'rhodes', neosoul: 'rhodes',
                    }
                    const chart: StrumChart = {
                      id: `jam-${Date.now()}`,
                      name: `Band Jam (${tonic}${minorKey ? 'm' : ''})`,
                      tonic,
                      minor: minorKey,
                      capo: 0,
                      bpm,
                      style: styleMap[style] ?? 'folk',
                      bars: prog.map((c, idx) => ({ chords: [c.symbol], section: idx === 0 ? 'Band Jam' : undefined })),
                    }
                    openStrumGrid({ chart, autoPlay: true })
                  }}
                  data-testid="jam-to-strum"
                >
                  🎸 Open in Strum Machine
                </button>
                <button
                  className="btn sm"
                  onClick={() => {
                    stopAll()
                    openFlowCoach({ tonic, minor: minorKey, startChord: cur?.symbol ?? prog[0]?.symbol })
                  }}
                  data-testid="jam-to-flow"
                >
                  🌀 Chord Path
                </button>
              </div>
            )}
            {matchingLicks.length > 0 && (
              <div className="jam-licks-strip">
                <button
                  className="band-line jam-licks-toggle"
                  aria-expanded={licksOpen}
                  data-testid="jam-licks-toggle"
                  onClick={() => { const next = !licksOpen; setLicksOpen(next); if (!next) stopLickPreview() }}>
                  <span className="small muted">Licks</span>
                  <span className="band-parts">
                    <b>{matchingLicks.length} riffs &amp; licks fit {tonic}{minorKey ? 'm' : ''}</b>
                    <span className="small muted"> · {worksOverSummary(jamProf.tags, 2)}</span>
                  </span>
                  <span className="small">{licksOpen ? 'Hide' : 'Show ▾'}</span>
                </button>
                {licksOpen && (
                  <div className="jam-licks-list" data-testid="jam-licks-list">
                    {chainMismatch && (
                      <div className="chain-prompt small" data-testid="jam-chain-mismatch">
                        <span>Active Lick Chain is locked to <b>{formatKeyBadge(activeChain.key, !!activeChain.minor)}</b> (Jam is <b>{formatKeyBadge(tonic, minorKey)}</b>).</span>
                        <button className="btn sm" onClick={() => learnGo({ tool: 'chainer' })}>Open Lick chainer →</button>
                      </div>
                    )}
                    {matchingLicks.map(l => {
                      const lst = lickStyle(l.style)
                      const lMin = lickMinor(l)
                      const isPlaying = playingLickId === l.id
                      const showPrompt = jamChainPrompt?.lickId === l.id ? jamChainPrompt.check : null
                      const toast = jamChainToast?.lickId === l.id ? jamChainToast.text : null
                      return (
                        <div key={l.id} className="jam-lick-row">
                          <div className="jam-lick-info">
                            <div className="song-title-row">
                              <b>{l.name}</b>
                              <span className="key-tag">{formatKeyBadge(l.ref, lMin)}</span>
                            </div>
                            <span className="small muted">{lst.label} · Works over: {worksOverSummary(worksOverForLick(l), 2)}</span>
                          </div>
                          <div className="jam-lick-acts">
                            <button className={`btn sm${isPlaying ? ' on' : ''}`} onClick={() => hearLick(l)}>{isPlaying ? '■ Stop' : '▶ Hear'}</button>
                            <button className="btn sm primary" onClick={() => void openLickInPlay(l)}>Play tab</button>
                            {chainable(l) && (
                              <button className="btn sm" data-testid={`jam-lick-chain-${l.id}`} onClick={() => tapJamLickChain(l)}>
                                {toast ?? '＋ Chain'}
                              </button>
                            )}
                            <button className="btn sm ghost" onClick={() => learnGo({ licks: l.id })}>Learn</button>
                          </div>
                          {showPrompt && (
                            <div className="chain-prompt small" style={{ flex: '1 0 100%' }}>
                              <span>Chain is locked to <b>{showPrompt.chainLabel}</b> ({l.name} is <b>{showPrompt.lickLabel}</b>).</span>
                              <div className="chain-prompt-acts">
                                <button className="btn sm" onClick={() => { startNewChain(l.id); setJamChainPrompt(null); setJamChainToast({ lickId: l.id, text: `✓ New ${showPrompt.lickLabel} chain` }) }}>
                                  Start new {showPrompt.lickLabel} chain
                                </button>
                                {showPrompt.canTranspose && (
                                  <button className="btn sm primary" onClick={() => { matchChainTranspose(l.id); setJamChainPrompt(null); setJamChainToast({ lickId: l.id, text: `✓ Matched to ${showPrompt.chainLabel}` }) }}>
                                    Match to {showPrompt.chainLabel}
                                  </button>
                                )}
                                <button className="btn sm ghost" onClick={() => setJamChainPrompt(null)}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span className="row" style={{ gap: 10 }}>
                        <button className="link-btn small" onClick={() => openExercisesFiltered({ worksOver: 'jam' })}>Exercises for this groove →</button>
                        <button className="link-btn small" onClick={() => openSongsInKey(keyOptionId(tonic, minorKey))}>Songs in {formatKeyBadge(tonic, minorKey)} →</button>
                      </span>
                      <button className="link-btn small" onClick={() => { try { localStorage.setItem('kg:mustWorksOver', JSON.stringify('jam')) } catch { /* noop */ } learnGo({ licks: 'all' }) }}>Browse all matching licks →</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Win>
          <Win id="inspire" title="Inspire me: chords that sound good together" className="panel" hint="A set of up to 8 chords that work together, like keys on Playbox: play them in any order. Roll by mood and colour, keep the ones you like with the lock, add them to your own order with +, then play it with the band. Each chord shows its number in the key, so you learn why it works.">
            <InspireMe tonic={tonic}
              onHear={c => { void audio().resume(); const sh = shapesFor(c, inst); strum(midisOf(sh[rank(sh, shapePref, 1)] ?? sh[0])) }}
              onUse={(cs, m) => { setMode(m); load(cs.map(({ midis: _m, ...c }) => ({ ...c, beats: rate }))); document.querySelector('[data-win="gen"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
              onArp={(cs, m) => { setMode(m); if (!/^arp-|^roll$|^arpeggio$/.test(strumId)) setStrumId('arp-zigzag'); load(cs.map(({ midis: _m, ...c }) => ({ ...c, beats: rate }))); document.querySelector('[data-win="gen"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} />
          </Win>
          {prog.length >= 2 && info && (
            <Win id="improv" title="Improv coach" className="panel" hint="Solo over the band and the coach listens: how much was in the scale, whether you landed on the chords when they changed, your range, your use of space and repeated ideas, and the one thing to work on next.">
              <ImprovCoach playing={playing} loopBeats={loopBeats} keyPcs={info.pcs} keyName={tip ? `${tip.root} ${scaleById(tip.scale).label}` : tonic}
                chords={prog.map((c, i) => ({ start: startOf(i), beats: c.beats ?? 4, symbol: c.symbol, pcs: readChord(c.symbol)?.pcs ?? [] }))}
                clock={() => { const t = transport.current; return t?.playing ? { T0: t.T0, spb: t.spb } : null }} />
            </Win>
          )}
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
            <p className="small muted" style={{ margin: 0 }}>Fingerpicking, licks and solos, chord melody or riffs over <b><ChordList names={prog.map(c => c.symbol)} /></b>: the tab maker is in Learn → Exercises → Make your own, and it uses this progression.</p>
            <div className="row"><button className="btn" onClick={() => { try { localStorage.setItem('kg:exSection', JSON.stringify('make')); localStorage.setItem('kg:tm:useJam', 'true') } catch { /* private */ } setSubPage('learn', 'exercises'); go('learn'); setTimeout(() => document.querySelector('[data-win="ex-licks"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400) }} data-testid="jam-make-tab"><Ico n="file" /> Open the tab maker</button></div>
          </Win>
          <Win id="famous" title={`Famous progressions in ${tonic}`} className="panel">
            <div className="stack" style={{ gap: 8 }}>
              {sugg.map((s, i) => (
                <div key={i} className="row" style={{ justifyContent: 'space-between', borderTop: i ? '1px solid var(--hairline)' : 'none', paddingTop: i ? 8 : 0 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div className="readout" style={{ fontSize: 20, fontWeight: 600, color: 'var(--pearl-2)', overflowWrap: 'anywhere' }}><ChordList names={s.chords.map(c => c.symbol)} sep={'\u2002'} /></div>
                    {s.note && <div className="small muted">{s.note}</div>}
                  </div>
                  <button className="btn" onClick={() => load(s.chords)}>Use this</button>
                </div>
              ))}
            </div>
          </Win>
          </WinArea>
      )}

      {page === 'strum' && <StrumGrid />}
      {page === 'flow' && <HarmonicFlowCoach />}
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

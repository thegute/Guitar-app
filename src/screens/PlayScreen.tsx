// Play along: the tab, a YouTube mini player, the mic following your playing note by note,
// and the scales / chords of the song for soloing.
import { LooperStrip } from '../looper/LazyBar'
import { holdFullScreen } from '../theme'
import { micWhere } from '../audio/input'
import { Ico } from '../components/Icon'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PsyDog } from '../components/PsyArt'
import { TabView, type LabelMode } from '../components/TabView'
import { ChordDiagram } from '../components/ChordDiagram'
import { useChordPeek } from '../components/ChordPeek'
import { YouTubePlayer } from '../components/YouTubePlayer'
import { HarmonyPanel, stringLabel } from '../components/HarmonyPanel'
import { Chips, usePersist } from '../components/Controls'
import { InputPicker } from '../components/InputPicker'
import { NoteListener, matchNote, type FollowStep } from '../tabs/follow'
import { defaultTrack, flatten, playable, trackPickup, type SongNote, type SongTrack } from '../tabs/model'
import { detectKey, improvisationScales, type KeyGuess } from '../tabs/keyDetect'
import { chordInfo, chordTimeline, guessBarChords, keyScalePcs } from '../tabs/harmony'
import { docInstrument, getSong, listSongs, saveSong, type SongDoc } from '../tabs/library'
import { go, onOpenSong, takePendingDoc, onPlayAction, takePlayAction } from '../nav'
import type { PlayAction, PlayFocus } from '../search/types'
import { useBack } from '../back'
import { useGetReady } from '../components/GetReady'
import { bump, bumpCounts, usePracticeTimer } from '../learn/progress'
import { gear, isSetUp, kindOf, setGear, useGear } from '../audio/gear'
import { GearSetup } from '../components/GearSetup'
import { latencyMs } from '../audio/gear'
import { chordMatch } from '../audio/chroma'
import { useInTime, type TrainerOpts } from '../play/useInTime'
import { usePedals } from '../controls/pedals'
import { recordRun, songStats } from '../play/songStats'
import { barMistakes, makeReport, type Report } from '../play/report'
import { chordEase, forgetTaught, meantNote, taughtAlias, taughtCount, teachChord, teachNote } from '../play/taught'
import { useFoldPosture } from '../play/fold'
import { nextSpeed, timeline as inTimeTimeline, videoTimeOf, type VideoApi } from '../play/inTime'
import { GameView } from '../components/GameView'
import { MixSlider, applyMix } from '../components/MixSlider'
import { noteStuck } from '../tips/tips'
import { setBusLevel } from '../audio/engine'
import { exampleDoc } from '../tabs/examples'
import { playNote, strum, SOUNDS, activeSound, onSoundChange, setSoundChoice, soundChoice, soundForProgram, soundInfo, loadSound, soundLoaded, type SoundId } from '../audio/pluck'
import { audio, keepAwake } from '../audio/engine'
import { songTempo } from '../play/tempoMap'
import { TempoBadge, TempoSheet, withSig, withTempo } from '../components/TempoSheet'
import { askTempo, canAskTempo } from '../assistant/tempoAsk'
import { TabPlayer } from '../audio/tabPlayer'
import { keyPrefersFlats, pcName } from '../theory/notes'
import { setTuning, useInstrument } from '../instrument'
import { Splitter } from '../components/Splitter'
import { LayoutHint } from '../components/Win'
import { onLeavePage } from '../audio/stopAll'
import { FingerBox } from '../components/FingerBox'
import { FloatPicker } from '../float/FloatLayer'
import { clearFloat, publishFloat, shownCards, toggleCard, useShownCards } from '../float/bus'
import { groupAt, handGroups } from '../play/handShape'
import { easierTrack, editKey, fixedFingers, otherSpots, withMoves } from '../hand/edits'
import { adaptTrack } from '../hand/adapt'
import { bestCapo, capoTrack } from '../hand/capo'
import { IconExpand, IconShrink, IconSliders } from '../components/Icons'
import { setPlayFocus, useMedia } from '../ui'
import { checkSong } from '../play/songCheck'
import { chordHelp } from '../play/chordHelp'
import { patternsFor, strumPattern } from '../play/strumCoach'
import { TakeRecorder, saveTake } from '../audio/takeRecorder'
import { keepRecording } from '../audio/recordings'
import { offerTake, setThenNowOn, thenNowFor, thenNowOn, type ThenNowPair } from '../audio/thenNow'
import { ThenVsNow } from '../components/ThenVsNow'
import { bandByStep, bandEvents, bandStyleLabel, chordBandSong, guessBandStyle, hasBand, CHORD_BAND_STYLES } from '../audio/band'
import type { Style } from '../theory/progressions'
import { SongCheckCard, RetuneNotice } from '../components/SongCheckCard'
import { profile } from '../learn/profile'
import { Zoomable } from '../components/Zoomable'
import { useScreenInfo } from '../assistant/screen'
import { talkingNow } from '../assistant/listen'
import { countUse } from '../usage'


type View = 'tab' | 'solo' | 'both'
/** How you've arranged Play: panel sizes (px) and which panels are showing. */
interface PlayLayout {
  /** wide screens: width of the side panel (video, readout) */
  sideW: number
  /** height of Scales & chords */
  soloH: number
  /** phones: height of the video + readout panel (0 = its natural size) */
  topH: number
  side: boolean
  solo: boolean
  /** Full tab: only the tab and a slim readout (the menu tucks away too) */
  focus: boolean
  /** phones: the panels from top to bottom (moved with ☰ Move on their bars) */
  order?: Pane[]
  /** wide screens: video & readout on the left instead of the right */
  sideLeft?: boolean
  /** wide screens: Scales & chords above the tab instead of below */
  soloTop?: boolean
}
type Pane = 'side' | 'tab' | 'solo'
const ORDER0: Pane[] = ['side', 'tab', 'solo']
/** Phones with the panels moved: the grid rows in your order (the view switch sits under the title). */
function phoneGrid(order: Pane[], view: string): { rows: string; areas: string } {
  const at = (p: Pane) => order.indexOf(p) < order.indexOf('tab')
  const cells: [string, string][] = [['head', 'auto'], ['switch', 'auto']]
  for (const p of order) {
    if (p === 'side') cells.push(...(at('side') ? [['side', 'var(--top-row)'], ['stop', 'auto']] : [['stop', 'auto'], ['side', 'var(--top-row)']]) as [string, string][])
    else if (p === 'tab') cells.push(['body', view === 'both' ? 'minmax(120px, 1fr)' : 'minmax(0, 1fr)'])
    else if (view === 'both') cells.push(...(at('solo') ? [['solo', 'var(--solo-row)'], ['ssolo', 'auto']] : [['ssolo', 'auto'], ['solo', 'var(--solo-row)']]) as [string, string][])
  }
  return { rows: cells.map(c => c[1]).join(' '), areas: cells.map(c => `'${c[0]}'`).join(' ') }
}
const LAYOUT0: PlayLayout = { sideW: 300, soloH: 220, topH: 0, side: true, solo: true, focus: false }
interface Feedback {
  ok: boolean
  heard: number
  /** strum-along: what the chord check heard (note names) */
  chordText?: string
  /** the tab note it matched (when ok) */
  note?: SongNote
  expected?: SongNote[]
  skipped?: number
  /** strum-along: which string or chord note didn't come out */
  chordHelp?: string
}

function keyFromTrack(track: SongTrack): { guesses: KeyGuess[]; weights: number[] } {
  const w = new Array(12).fill(0)
  const bass = new Array(12).fill(0)
  for (const bar of track.bars) {
    let low = Infinity
    for (const s of bar.steps) for (const n of s.notes) {
      if (n.tech === 'x') continue
      w[n.midi % 12] += Math.max(0.25, Math.min(s.dur, 2))
      low = Math.min(low, n.midi)
    }
    if (low < Infinity) bass[low % 12] += 1
    // chord names written in the tab add weight to their tones
    for (const s of bar.steps) if (s.chord) chordInfo(s.chord)?.pcs.forEach(p => { w[p] += 0.5 })
  }
  return { guesses: detectKey(w, bass), weights: w }
}

const noteName = (m: number, flats: boolean) => pcName(m % 12, flats)
const octave = (m: number) => Math.floor(m / 12) - 1

/** Game Mode used to share its saved setting with the phone's Tab / Scales & chords / Both switch, so turning Game on left
 *  that switch on a value it doesn't know (the boxes drew on top of each other). Move it to its own setting, once. */
function migrateGameView() {
  try {
    if (localStorage.getItem('kg:playView') === '"game"') {
      localStorage.setItem('kg:playGame', '"game"')
      localStorage.setItem('kg:playView', '"tab"')
    }
  } catch { /* private */ }
  return 0
}

export function PlayScreen() {
  const inst = useInstrument()
  // each instrument remembers its own last song (guitar and ukulele tabs are kept apart)
  const [songId, setSongId] = usePersist(`playSong:${inst.id}`, '')
  const [doc, setDoc] = useState<SongDoc | null>(null)
  /** the Options panel (everything that isn't Wait/In time, Loop and Hear it) */
  const [opts, setOpts] = useState(false)
  useState(migrateGameView)
  const [view, setView] = usePersist<View>('playView', 'tab')
  const [labelMode, setLabelMode] = usePersist<LabelMode>('playLabels', 'both')
  const [strict, setStrict] = usePersist('playStrict', false)
  const [showVideo, setShowVideo] = usePersist('playVideo', true)
  // with no video link yet, the add-a-link box only opens when you tap Video (saves room on the cover screen)
  const [videoAsk, setVideoAsk] = useState(false)
  const [mode, setMode] = usePersist<'wait' | 'time'>('playMode', 'wait')
  const ready = useGetReady()
  const [click, setClick] = usePersist('timeClick', true)
  const [guide, setGuide] = usePersist('timeGuide', false)
  const [trainer, setTrainer] = usePersist<TrainerOpts>('speedTrainer', { on: false, start: 0.6, step: 0.05, target: 1, pass: 90 })
  const video = useRef<VideoApi | null>(null)
  // leaving Play pauses the video too
  useEffect(() => onLeavePage(() => { try { video.current?.pause() } catch { /* no video */ } }), [])
  // half-folded Fold (tabletop): video and readout on the top half, tab on the bottom. 'auto' follows the fold.
  const [splitPref, setSplitPref] = usePersist<'auto' | 'on' | 'off'>('playSplit', 'auto')
  const posture = useFoldPosture()
  const split = splitPref === 'on' || (splitPref === 'auto' && posture.tabletop)
  const [tabZoom, setTabZoom] = usePersist('tabZoom', 1)
  const [layRaw, setLay] = usePersist<PlayLayout>('playLayout', LAYOUT0)
  const lay = { ...LAYOUT0, ...layRaw }
  const wide = useMedia('(min-width: 760px)')
  const playRef = useRef<HTMLDivElement>(null)
  const sideRef = useRef<HTMLElement>(null)
  const focus = lay.focus
  const order = lay.order?.length === 3 && ORDER0.every(p => lay.order!.includes(p)) ? lay.order : ORDER0
  const sideAbove = order.indexOf('side') < order.indexOf('tab'), soloAbove = order.indexOf('solo') < order.indexOf('tab')
  const [movingPane, setMovingPane] = useState<Pane | null>(null)
  /** ☰ Move on a panel's bar: drag it and let go where it should go. */
  const startMove = (p: Pane, e: React.PointerEvent) => {
    e.preventDefault()
    setMovingPane(p)
    const l0 = lay
    const done = (ev: PointerEvent | null) => {
      removeEventListener('pointerup', up); removeEventListener('pointercancel', cancel)
      setMovingPane(null)
      const box = playRef.current
      if (!ev || !box) return
      const r = box.getBoundingClientRect()
      if (wide) {
        if (p === 'side') { const left = ev.clientX < r.left + r.width / 2; if (left !== !!l0.sideLeft) { setLay({ ...l0, sideLeft: left }); countUse('play:move') } }
        if (p === 'solo') {
          const t = box.querySelector('.play-tab')?.getBoundingClientRect()
          const top = !!t && ev.clientY < t.top + t.height / 2
          if (top !== !!l0.soloTop) { setLay({ ...l0, soloTop: top }); countUse('play:move') }
        }
        return
      }
      const sel: Record<Pane, string> = { side: '.play-side', tab: '.play-tab', solo: '.play-solo' }
      const rest = order.filter(x => x !== p)
      const shown = rest.filter(x => { const el = box.querySelector<HTMLElement>(sel[x]); return !!el && el.getClientRects().length > 0 })
      let anchor: Pane | undefined
      for (const x of shown) { const b = box.querySelector(sel[x])!.getBoundingClientRect(); if (ev.clientY < b.top + b.height / 2) { anchor = x; break } }
      const i = anchor ? rest.indexOf(anchor) : rest.length
      const n = [...rest.slice(0, i), p, ...rest.slice(i)]
      if (n.join() !== order.join()) { setLay({ ...l0, order: n }); countUse('play:move') }
    }
    const up = (ev: PointerEvent) => done(ev)
    const cancel = () => done(null)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', cancel)
  }
  const movedLayout = order.join() !== ORDER0.join() || !!lay.sideLeft || !!lay.soloTop
  // Music stand: only the tab (much bigger) and one row of big buttons. Tidy: while you play, the other panels fold away.
  const [stand, setStand] = useState(false)
  /** Play → Game: the note highway instead of the tab */
  const [gameView, setGameView] = usePersist<'tab' | 'game'>('playGame', 'tab')
  const [gameDone, setGameDone] = useState(0)
  const [standZoom, setStandZoom] = usePersist('standZoom', 1.6)
  // the music stand's big view (remote): on narrow screens (the Fold's cover screen) unless you pick the tab
  const [standView, setStandView] = useState<'auto' | 'tab' | 'big'>('auto')
  useEffect(() => { if (!stand) setStandView('auto') }, [stand])
  const narrow = useMedia('(max-width: 480px)')
  // Game full screen = the stand layout showing the game (never the big note view)
  const bigView = stand && gameView !== 'game' && (standView === 'big' || (standView === 'auto' && narrow))
  const [tidy, setTidy] = usePersist('playTidy', true)
  const lastOnset = useRef(0)
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState('')
  /** after a clean Wait-for-me run: suggest In time */
  const [nudge, setNudge] = useState(false)
  /** the report card after a whole run-through */
  const [report, setReport] = useState<(Report & { take?: 'first' | 'now' }) | null>(null)
  // Then vs now: a quiet recording of each whole run from the top (kept only if it's your first or clearly your best)
  const auto = useRef<{ rec: TakeRecorder; docId: string; title: string } | null>(null)
  const [autoTick, setAutoTick] = useState(0)
  const [thenNow, setThenNow] = useState(thenNowOn)
  const [tvn, setTvn] = useState<ThenNowPair | null>(null)
  const autoCancel = () => { const a = auto.current; auto.current = null; void a?.rec.stop() }
  const autoFinishRef = useRef<(score: number, speed: number) => void>(() => {})
  autoFinishRef.current = (score: number, speed: number) => {
    const a = auto.current
    auto.current = null
    if (!a) return
    void a.rec.stop().then(async r => {
      if (!r || r.seconds < 5) return
      const kept = await offerTake(a.docId, a.title, r.blob, r.seconds, score, speed)
      if (kept) setReport(rep => (rep ? { ...rep, take: kept } : rep))
    })
  }
  const [live, setLive] = useState<number | null>(null)
  const [input, setInput] = useState<{ label: string; external: boolean } | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const missRun = useRef({ bar: -1, n: 0, t0: 0 })
  const lastMiss = useRef<{ heard: number; want: number[]; bar: number; chordText?: string } | null>(null)
  const [inspect, setInspect] = useState<SongNote | null>(null)
  const [inspectAt, setInspectAt] = useState(-1)
  const [pos, setPos] = useState(0)
  const [version, setVersion] = useState(0)
  const [flash, setFlash] = useState<{ flat: number; key: number } | null>(null)
  const [pulse, setPulse] = useState<{ ok: boolean; key: number } | null>(null)
  const [selecting, setSelecting] = useState<null | { first?: number }>(null)
  const [passes, setPasses] = useState<{ n: number; last: number | null; best: number | null }>({ n: 0, last: null, best: null })
  const [loopBlink, setLoopBlink] = useState<{ k: number; text: string } | null>(null)
  const states = useRef<Uint8Array>(new Uint8Array(0))
  const [gearOpen, setGearOpen] = useState(false)
  useGear()
  const gearKind = kindOf(input?.external)
  const gate = gear(gearKind).gate
  const listener = useRef<NoteListener | null>(null)
  // record yourself: what the mic or amp hears, to listen back (only while Record is on)
  const recorder = useRef<TakeRecorder | null>(null)
  const [recording, setRecording] = useState(false)
  const [recSecs, setRecSecs] = useState(0)
  const [take, setTake] = useState<{ url: string; blob: Blob; seconds: number; title: string; kept?: boolean } | null>(null)
  useEffect(() => {
    if (!recording) return
    const t = setInterval(() => setRecSecs(Math.round((Date.now() - (recorder.current?.startedAt ?? Date.now())) / 1000)), 500)
    return () => clearInterval(t)
  }, [recording])
  useEffect(() => () => { void recorder.current?.stop() }, [])
  async function toggleRec() {
    if (recording) {
      const r = await recorder.current?.stop()
      setRecording(false)
      if (r) setTake(old => { if (old) URL.revokeObjectURL(old.url); return { url: URL.createObjectURL(r.blob), blob: r.blob, seconds: r.seconds, title: docRef.current?.title ?? 'Take' } })
      return
    }
    try {
      const rec = (recorder.current ??= new TakeRecorder())
      await rec.start(listener.current?.mediaStream)
      setRecSecs(0)
      setRecording(true)
    } catch {
      setMicError(`Recording needs the microphone: allow it for KGuitar ${micWhere()}, then try again.`)
    }
  }
  const docRef = useRef<SongDoc | null>(null)

  // ---------- load the song ----------
  useEffect(() => {
    let alive = true
    ;(async () => {
      const pending = takePendingDoc()
      if (pending) await saveSong(pending)
      let d = pending ?? (songId ? await getSong(songId) : undefined)
      if (d && docInstrument(d) !== inst.id) d = undefined
      if (!d) {
        const all = await listSongs(inst.id)
        d = all[0] ?? exampleDoc(inst.id === 'guitar' ? 'ode' : inst.id === 'tenor' ? 'uke-ode' : 'bari-ode', inst.tuning.notes)
        if (!all.length) await saveSong(d)
      }
      if (alive) {
        setDoc(d)
        if (d.id !== songId) setSongId(d.id)
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId])

  // a song sent here while Play is already open (from Learn or shared from another app)
  useEffect(() => onOpenSong(d => {
    if (docInstrument(d) !== inst.id) return
    takePendingDoc()
    void saveSong(d).then(() => { setDoc(d); setSongId(d.id) })
  }), [inst.id, setSongId])

  const update = useCallback((patch: Partial<SongDoc>) => {
    setDoc(d => {
      if (!d) return d
      const n = { ...d, ...patch, updated: Date.now() }
      void saveSong(n)
      return n
    })
  }, [])

  const trackIdx = doc ? Math.min(doc.track ?? defaultTrack(doc.song, inst.strings), doc.song.tracks.length - 1) : 0
  const writtenTrack = doc?.song.tracks[trackIdx] ?? null
  // the tab as you play it: re-fingered for your hand if you asked ("Make it easier"), with your moved notes
  const [handTick, setHandTick] = useState(0)
  useEffect(() => { const f = () => setHandTick(t => t + 1); addEventListener('kg-hand', f); return () => removeEventListener('kg-hand', f) }, [])
  const track = useMemo(() => {
    if (!writtenTrack) return null
    // in your tuning / without the capo, then re-fingered if asked, then your own moved notes
    const sameLen = writtenTrack.tuning.length === inst.midis.length
    const tuned0 = (doc?.adapt && sameLen) || (doc?.noCapo && writtenTrack.capo) ? adaptTrack(writtenTrack, doc?.adapt && sameLen ? inst.midis : writtenTrack.tuning, !doc?.noCapo).track : writtenTrack
    const tuned = doc?.smartCapo ? capoTrack(tuned0, doc.smartCapo, inst) : tuned0
    const base = doc?.easier ? easierTrack(tuned, profile()?.level ?? 2, inst.id) : tuned
    return withMoves(base, trackIdx, doc?.hand)
  }, [writtenTrack, doc?.easier, doc?.hand, doc?.adapt, doc?.noCapo, doc?.smartCapo, trackIdx, inst.id, inst.midis, handTick]) // eslint-disable-line react-hooks/exhaustive-deps
  // chord sheets: a capo that turns barre chords into open shapes
  const capoIdea = useMemo(() => {
    if (!doc || doc.source !== 'chords' || !writtenTrack) return null
    const names = writtenTrack.bars.flatMap(b => b.steps.map(st => st.chord ?? '')).filter(Boolean)
    const idea = bestCapo(names, inst)
    return idea.capo > 0 && idea.effortNow - idea.effort >= 1 ? idea : null
  }, [doc?.source, writtenTrack, inst]) // eslint-disable-line react-hooks/exhaustive-deps
  const adaptNote = useMemo(() => (writtenTrack && (doc?.adapt || doc?.noCapo) ? adaptTrack(writtenTrack, doc?.adapt && writtenTrack.tuning.length === inst.midis.length ? inst.midis : writtenTrack.tuning, !doc?.noCapo).changes : []), [writtenTrack, doc?.adapt, doc?.noCapo, inst.midis])
  docRef.current = doc
  const flat = useMemo(() => (track ? flatten(track) : []), [track])
  // press a chord name (tab or chord strip) to peek at its shape without stopping anything
  const peek = useChordPeek(playRef, inst, fi => {
    const st = flat[fi]?.step
    if (!st || !track) return null
    const ns = st.notes.filter(n => n.tech !== 'x')
    return ns.length >= 3 ? track.tuning.map((_, s) => ns.find(n => n.string === s)?.fret ?? -1) : null
  }, !!doc && !!track)
  const handNames = useMemo(() => (track ? track.tuning.map((_, s) => stringLabel(track.tuning, s, false)) : []), [track])
  const hands = useMemo(() => handGroups(flat, { inst: inst.id, fixed: fixedFingers(trackIdx, doc?.hand), stringNames: handNames }), [flat, inst.id, trackIdx, doc?.hand, handNames, handTick]) // eslint-disable-line react-hooks/exhaustive-deps
  const follow = useMemo(() => {
    const idx: number[] = []
    const steps: FollowStep[] = []
    flat.forEach((f, i) => {
      const ns = playable(f.step)
      // three or more different notes = a strummed chord: checked by listening to the whole chord
      if (ns.length) { idx.push(i); steps.push({ midis: ns.map(n => n.midi), chord: new Set(ns.map(n => n.midi % 12)).size >= 3 }) }
    })
    return { idx, steps }
  }, [flat])

  // the practice loop, as positions in the follow list
  const loop = doc?.loop ?? null
  const loopRange = useMemo(() => {
    if (!loop) return null
    const a = follow.idx.findIndex(i => flat[i].bar >= loop.from)
    let b = -1
    follow.idx.forEach((fi, k) => { if (flat[fi].bar <= loop.to) b = k })
    return a >= 0 && b >= a ? { a, b } : null
  }, [loop, follow, flat])

  // reset progress when the song or track changes
  useEffect(() => {
    states.current = new Uint8Array(flat.length)
    setPos(Math.min(doc?.cursor ?? 0, Math.max(0, follow.idx.length - 1)))
    setFeedback(null)
    setReport(null)
    setInspect(null)
    setVersion(v => v + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flat])

  // remember where you left off
  useEffect(() => {
    if (!doc || doc.cursor === pos) return
    const t = setTimeout(() => update({ cursor: pos }), 1200)
    return () => clearTimeout(t)
  }, [pos, doc, update])

  // ---------- key, chords ----------
  const keyData = useMemo(() => (track ? keyFromTrack(track) : null), [track])
  const detected = keyData?.guesses[0] ?? { root: 'A', minor: true, score: 0, label: 'A minor' }
  const key: KeyGuess = useMemo(() => {
    if (!doc?.key) return detected
    const { root, minor } = doc.key
    return { root, minor, score: 0, label: `${root} ${minor ? 'minor' : 'major'}` }
  }, [doc?.key, detected])
  const flats = keyPrefersFlats(key.root, key.minor)
  const tips = useMemo(() => (keyData ? improvisationScales(key, keyData.weights) : []), [key, keyData])
  const guesses = useMemo(() => (track ? guessBarChords(track, key, flats) : []), [track, key, flats])
  const timeline = useMemo(() => (track ? chordTimeline(track, doc?.chords ?? {}, guesses) : { spans: [], at: new Int32Array(0) }), [track, doc?.chords, guesses])
  // song check: what this song asks of you (shown the first time you open a song, and from the title)
  const check = useMemo(() => (doc && track ? checkSong(doc.song, track, inst, [...new Set(timeline.spans.map(s => s.name))], profile()?.level ?? 2) : null),
    [doc?.song, track, inst, timeline.spans]) // eslint-disable-line react-hooks/exhaustive-deps
  const [checkOpen, setCheckOpen] = useState(false)
  useEffect(() => { setNudge(false) }, [doc?.id])
  const [retuneHidden, setRetuneHidden] = useState('')
  useEffect(() => {
    if (!doc || doc.source === 'lesson') { setCheckOpen(false); return }
    let seen: string[] = []
    try { seen = JSON.parse(localStorage.getItem('kg:checked') ?? '[]') as string[] } catch { /* none yet */ }
    setCheckOpen(!seen.includes(doc.id))
  }, [doc?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const closeCheck = () => {
    setCheckOpen(false)
    if (!doc) return
    try {
      const seen = JSON.parse(localStorage.getItem('kg:checked') ?? '[]') as string[]
      if (!seen.includes(doc.id)) localStorage.setItem('kg:checked', JSON.stringify([...seen, doc.id].slice(-400)))
    } catch { /* storage unavailable */ }
  }

  const done = pos >= follow.idx.length
  const cursorFlat = done ? -1 : follow.idx[pos]
  const expected = cursorFlat >= 0 ? playable(flat[cursorFlat].step) : []
  let curSpan = cursorFlat >= 0 ? timeline.at[cursorFlat] : timeline.spans.length - 1
  if (curSpan < 0) {
    // before the first chord: show the first one
    curSpan = timeline.spans.findIndex(s => s.start > cursorFlat)
  }
  const nearFrets = useMemo(() => {
    if (cursorFlat < 0) return []
    const bar = flat[cursorFlat].bar
    return flat.filter(f => Math.abs(f.bar - bar) <= 1).flatMap(f => f.step.notes.map(n => n.fret))
  }, [flat, cursorFlat])

  // ---------- following the mic ----------
  const ref = useRef({ pos, follow, strict, flat, loopRange, lesson: false, flats: false, doc: null as SongDoc | null, loop: null as { from: number; to: number } | null, kind: 'mic' as ReturnType<typeof kindOf> })
  ref.current = { pos, follow, strict, flat, loopRange, lesson: doc?.source === 'lesson', flats, doc, loop: doc?.loop ?? null, kind: gearKind }
  // keep the listener checking for the step you're on (wait-for-me mode) and the right octave setting
  useEffect(() => {
    const l = listener.current
    if (!l) return
    l.strictOctave = strict
    if (mode !== 'time') l.expect(follow.steps[pos]?.midis ?? [], follow.steps[pos + 1]?.midis ?? [])
  }, [pos, follow, strict, mode, listening])

  /** Save a run to this song's progress: score plus which bars went wrong. */
  const saveRun = useCallback((score: number, runMode: 'wait' | 'time', speedNow: number, full: boolean, bars?: [number, number]) => {
    const { flat, doc: d } = ref.current
    if (!d) return null
    const before = songStats(d.id)
    const miss: Record<number, number> = {}, hit: Record<number, number> = {}
    states.current.forEach((st, i) => {
      const b = flat[i]?.bar
      if (b === undefined || (bars && (b < bars[0] || b > bars[1]))) return
      if (st === 1) hit[b] = (hit[b] ?? 0) + 1
      else if (st === 2 || st === 3) miss[b] = (miss[b] ?? 0) + 1
    })
    recordRun(d.id, { title: d.title, inst: docInstrument(d) }, { score, mode: runMode, speed: speedNow, full, bars }, { miss, hit })
    return { runs: before?.runs ?? [], best: before?.best ?? 0 }
  }, [])
  /** Show the report card for a whole run that just finished. */
  const showReport = useCallback((score: number, runMode: 'wait' | 'time', speedNow: number, was: { runs: import('../play/songStats').SongRun[]; best: number } | null, stats?: import('../play/inTime').RunStats) => {
    const { flat } = ref.current
    const mistakes = barMistakes(states.current, i => flat[i]?.bar, runMode)
    setReport(makeReport({ score, mode: runMode, speed: speedNow, mistakes, before: was?.runs ?? [], best: was?.best ?? 0, stats }))
    setNudge(false)
    autoFinishRef.current(score, speedNow)
  }, [])

  const hitAt = useCallback((step: number, skipped: number, heard: number, chordText?: string) => {
    const { pos, follow, strict, loopRange } = ref.current
    const st = states.current
    {
      const r = { step, skipped }
      const midi = heard
      for (let k = pos; k < r.step; k++) st[follow.idx[k]] = 2
      const fi = follow.idx[r.step]
      st[fi] = st[fi] === 3 ? 2 : 1
      const ns = playable(ref.current.flat[fi].step)
      const note = chordText ? undefined : ns.find(n => (strict ? n.midi === midi : n.midi % 12 === midi % 12)) ?? ns[0]
      setFeedback({ ok: true, heard: midi, note, skipped: r.skipped, chordText })
      setFlash(f => ({ flat: fi, key: (f?.key ?? 0) + 1 }))
      setPulse(p => ({ ok: true, key: (p?.key ?? 0) + 1 }))
      bumpCounts({ notesHit: 1, [ref.current.lesson ? 'exerciseNotes' : 'songNotes']: 1 })
      let next = r.step + 1
      if (loopRange && next > loopRange.b) {
        // finished one pass of the loop: score it and go round again
        let ok = 0
        for (let k = loopRange.a; k <= loopRange.b; k++) if (st[follow.idx[k]] === 1) ok++
        const score = Math.round((ok / (loopRange.b - loopRange.a + 1)) * 100)
        setPasses(p => ({ n: p.n + 1, last: score, best: Math.max(p.best ?? 0, score) }))
        if (score >= 90) { bump('loop90'); setNudge(true) }
        const lp = ref.current.loop
        saveRun(score, 'wait', 1, false, lp ? [lp.from, lp.to] : undefined)
        setTimeout(() => {
          for (let k = loopRange.a; k <= loopRange.b; k++) st[follow.idx[k]] = 0
          setVersion(v => v + 1)
        }, 700)
        next = loopRange.a
      } else if (!loopRange && next >= follow.steps.length) {
        bump(ref.current.lesson ? 'exercisesFinished' : 'songsFinished')
        // score = notes right first time
        let ok = 0, n = 0
        for (const i of follow.idx) { const v = st[i]; if (v) { n++; if (v === 1) ok++ } }
        const sc = Math.round((ok / Math.max(1, follow.idx.length)) * 100)
        const full = follow.idx.length > 0 && n >= follow.idx.length * 0.8
        const was = n ? saveRun(sc, 'wait', 1, full) : null
        // the report card: score, trouble bars, what to do next (a clean run suggests In time)
        if (n && full) showReport(sc, 'wait', 1, was)
        else if (n && sc >= 85) setNudge(true)
      }
      setPos(next)
    }
    setVersion(v => v + 1)
  }, [])
  const missAt = useCallback((heard: number, chordText?: string, help?: string) => {
    const { pos, follow } = ref.current
    const fi = follow.idx[pos]
    if (fi !== undefined && states.current[fi] === 0) states.current[fi] = 3
    const fs = fi !== undefined ? ref.current.flat[fi] : undefined
    lastMiss.current = { heard, want: fs ? playable(fs.step).map(n => n.midi) : [], bar: fs ? fs.bar : -1, chordText }
    // the same bar going wrong again and again (4 misses within 2 minutes): tips offers help for that spot first
    if (fs) {
      const m = missRun.current, now = Date.now()
      if (m.bar !== fs.bar || now - m.t0 > 120_000) { m.bar = fs.bar; m.n = 0; m.t0 = now }
      if (++m.n === 4) noteStuck(fs.bar)
    }
    setFeedback({ ok: false, heard, chordText, chordHelp: help })
    setPulse(p => ({ ok: false, key: (p?.key ?? 0) + 1 }))
    setVersion(v => v + 1)
  }, [])

  /** Wait-for-me mode: a single note was heard. */
  const onNote = useCallback((heardMidi: number) => {
    const { pos, follow, strict, loopRange } = ref.current
    // strummed chords are checked by onChord (the whole chord), not by one note
    if (follow.steps[pos]?.chord) return
    // a mix-up you've corrected before ("I played it right") counts as the note you meant
    const midi = (follow.steps[pos] && taughtAlias(ref.current.kind, follow.steps[pos].midis, heardMidi)) ?? heardMidi
    // inside a loop, only look as far as the loop's last note
    const steps = loopRange ? follow.steps.slice(0, loopRange.b + 1) : follow.steps
    const r = matchNote(steps, pos, midi, strict)
    if (r.kind === 'hit') hitAt(r.step, r.skipped, midi)
    else if (r.kind === 'miss') missAt(midi)
  }, [hitAt, missAt])

  /** Wait-for-me mode: a strum was heard (strum-along). */
  const onChord = useCallback((chroma: number[]) => {
    const { pos, follow } = ref.current
    const want = follow.steps[pos]
    if (!want?.chord) return
    const pcs = [...new Set(want.midis.map(m => m % 12))]
    const top = chroma.map((v, i) => ({ v, i })).sort((x, y) => y.v - x.v).slice(0, 3).map(x => noteName(x.i, ref.current.flats))
    if (chordMatch(chroma, pcs, chordEase(ref.current.kind, pcs)).ok) hitAt(pos, 0, want.midis[0], top.join(' '))
    else {
      // say which string or chord note didn't come out
      const fi = follow.idx[pos]
      const notes = fi !== undefined ? ref.current.flat[fi]?.step.notes ?? [] : []
      const tuning = ref.current.doc?.song.tracks[ref.current.doc?.track ?? 0]?.tuning ?? []
      const help = notes.length ? chordHelp(chroma, notes, tuning, pcv => noteName(pcv, ref.current.flats)).text : undefined
      missAt(want.midis[0], top.join(', '), help)
    }
  }, [hitAt, missAt])

  /** "I played it right": the app misheard you. Move on as if it heard the right note, and remember the mix-up. */
  const [taughtNote, setTaughtNote] = useState('')
  const acceptMiss = useCallback(() => {
    const { pos, follow, flats } = ref.current
    const lm = lastMiss.current
    const step = follow.steps[pos]
    if (!lm || !step) return
    const fi = follow.idx[pos]
    if (step.chord) {
      teachChord(ref.current.kind, step.midis)
      setTaughtNote('Got it. That chord will be judged a little more kindly from now on.')
    } else {
      const want = meantNote(step.midis, lm.heard)
      teachNote(ref.current.kind, want, lm.heard)
      const hn = noteName(lm.heard, flats)
      setTaughtNote(`Got it. ${/^[AEF]/.test(hn) ? 'An' : 'A'} ${hn}${octave(lm.heard)} heard here will count as ${noteName(want, flats)} from now on.`)
    }
    countUse('play:taught')
    lastMiss.current = null
    if (fi !== undefined) states.current[fi] = 0
    hitAt(pos, 0, step.midis[0])
  }, [hitAt])
  useEffect(() => { if (!taughtNote) return; const t = setTimeout(() => setTaughtNote(''), 5000); return () => clearTimeout(t) }, [taughtNote])

  async function toggleListen() {
    if (listening) {
      listener.current?.stop()
      listener.current = null
      setListening(false)
      setLive(null)
      setInput(null)
      void keepAwake(false)
      return
    }
    setMicError('')
    stopPreview()
    setReport(null)
    try {
      await audio().resume()
      const l = new NoteListener()
      l.chords = true
      l.strictOctave = ref.current.strict
      // wait-for-me: the step you're on and the one after
      const { pos: p0, follow: f0 } = ref.current
      if (modeRef.current !== 'time') l.expect(f0.steps[p0]?.midis ?? [], f0.steps[p0 + 1]?.midis ?? [])
      let last: number | null = null
      l.onFrame = f => { if (f.midi !== last) { last = f.midi; setLive(f.midi) } }
      l.onOnset = t => { lastOnset.current = t }
      l.onNote = e => {
        if (talkingNow()) return // you're talking to the helper: your voice isn't a wrong note
        if (modeRef.current === 'time') { if (inTimeRef.current.running) inTimeRef.current.played(e.attack ? lastOnset.current : e.time, { midi: e.midi }) }
        else onNote(e.midi)
      }
      l.onChord = (chroma, at) => {
        if (talkingNow()) return
        if (modeRef.current === 'time') { if (inTimeRef.current.running) inTimeRef.current.played(at, { chroma }) }
        else onChord(chroma)
      }
      await l.start()
      listener.current = l
      setInput(l.input ? { label: l.input.label, external: l.input.external } : null)
      setListening(true)
      void keepAwake(true)
    } catch {
      setMicError(`KGuitar needs microphone access to hear your guitar (this also covers a USB pedal like the Pocket Master or an audio interface). Allow it ${micWhere()}, then try again.`)
    }
  }
  const toggleListenRef = useRef(toggleListen)
  toggleListenRef.current = toggleListen
  useEffect(() => () => { listener.current?.stop(); player.current?.stop(); void keepAwake(false) }, [])

  // ---------- hear how the tab sounds ----------
  const player = useRef<TabPlayer | null>(null)
  const [playAt, setPlayAt] = useState(-1)
  const [speed, setSpeed] = usePersist('playSpeed', 1)
  const songBpm = doc?.song.tempo ?? 90
  const [tempoOpen, setTempoOpen] = useState(false)
  // the tempo and time signature: set them for the song (In time, click, band, Hear it and video follow)
  const changeTempo = useCallback((c: Partial<SongDoc['song']>) => {
    setDoc(d => {
      if (!d) return d
      const fileTempo = d.song.fileTempo ?? (d.song.tempoFrom === 'file' ? d.song.tempo : undefined)
      const n = { ...d, song: { ...d.song, ...c, ...(fileTempo ? { fileTempo } : {}) }, updated: Date.now() }
      void saveSong(n)
      return n
    })
  }, [])
  // a pasted tab or a screenshot with no tempo: ask the AI once for the known recording's tempo (if a key is set up)
  useEffect(() => {
    if (!doc || doc.song.tempoAsked || (doc.song.tempoFrom && doc.song.tempoFrom !== 'guess') || !canAskTempo()) return
    const id = doc.id
    changeTempo({ tempoAsked: true })
    void askTempo(doc.song.title, doc.artist ?? doc.song.artist).then(a => {
      if (!a) return
      setDoc(d => {
        if (!d || d.id !== id || (d.song.tempoFrom && d.song.tempoFrom !== 'guess')) return d
        const n = { ...d, song: { ...d.song, ...withTempo(d.song, a.bpm, 'ai'), ...(a.timeSig ? withSig(a.timeSig) : {}) }, updated: Date.now() }
        void saveSong(n)
        return n
      })
    })
  }, [doc?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const tempoMap = useMemo(() => (doc ? songTempo(doc.song) : undefined), [doc?.song]) // eslint-disable-line react-hooks/exhaustive-deps
  // when each note sounds (seconds from bar 1 at the tab's tempo): for "Sync automatically" with the video
  const noteSecs = useMemo(() => {
    const out: number[] = []
    let b = 0
    for (const f of flat) { if (f.step.notes.length) out.push(videoTimeOf({ offset: 0, bpm: songBpm }, b, tempoMap?.changes ? tempoMap : undefined)); b += f.step.dur }
    return out
  }, [flat, songBpm, tempoMap])
  // the sound for Hear it and tapped notes: your pick, or (on Auto) the guitar the Guitar Pro file asks for
  const [soundSel, setSoundSel] = useState(soundChoice())
  useEffect(() => onSoundChange(() => setSoundSel(soundChoice())), [])
  const songSound = soundForProgram(track?.program)
  const hearSound: SoundId = soundSel === 'auto' ? activeSound(songSound) : soundSel
  useEffect(() => { void loadSound(hearSound) }, [hearSound])
  function stopPreview() {
    player.current?.stop()
    setPlayAt(-1)
  }

  // ---------- play in time ----------
  // rhythm under the tab: counts and stems for tabs, the strum coach's arrows for chord sheets
  const [counts, setCounts] = usePersist('tabCounts', (profile()?.level ?? 2) <= 2)
  const meter = doc?.song.meter ?? 4
  const isSheet = useMemo(() => !!track && track.bars.every(b => b.steps.every(s => !s.notes.length || !!s.chord)) && track.bars.some(b => b.steps.some(s => s.chord)), [track])
  const [strumBySong, setStrumBySong] = usePersist<Record<string, string>>('strumBySong', {})
  const strumId = doc ? strumBySong[doc.id] ?? doc.song.strum ?? (meter === 3 ? 'waltz' : 'folk') : 'off'
  const strumPat = isSheet && strumId !== 'off' ? strumPattern(strumId) ?? null : null
  // each step's start inside its bar (pickup bars end on the last beat)
  const stepOffs = useMemo(() => {
    const out: number[] = []
    if (!track) return out
    const pick = trackPickup(track, meter)
    track.bars.forEach((bar, bi) => {
      let o = bi === 0 ? pick : 0
      for (const st of bar.steps) { out.push(o); o += st.dur }
    })
    return out
  }, [track, meter])
  // the band: a Guitar Pro file's other parts, or drums and bass from the chords (songbook)
  const [bandOn, setBandOn] = usePersist('playBand', true)
  // Band behind me: the song's own band (other tracks, drums, songbook backing), or a chord band (drums + bass following
  // the chord names) in a style guessed from the song, which you can change on the Mixer card (kept per song)
  const [bandStylePick, setBandStylePick] = useState<Style | null>(null)
  useEffect(() => { try { const v = doc ? localStorage.getItem(`kg:bandStyle:${doc.id}`) : null; setBandStylePick(v ? (JSON.parse(v) as Style) : null) } catch { setBandStylePick(null) } }, [doc?.id])
  const bandStyleGuess = useMemo(() => (doc ? guessBandStyle(doc.song, doc.title, doc.song.artist) : 'acoustic'), [doc?.song]) // eslint-disable-line react-hooks/exhaustive-deps
  const bandStyle: Style = bandStylePick ?? bandStyleGuess
  const setBandStyle = (st: Style) => { setBandStylePick(st); try { if (doc) localStorage.setItem(`kg:bandStyle:${doc.id}`, JSON.stringify(st)) } catch { /* private */ } }
  const chordBand = useMemo(() => (doc && track ? chordBandSong(doc.song, trackIdx, bandStyle) : null), [doc?.song, trackIdx, bandStyle]) // eslint-disable-line react-hooks/exhaustive-deps
  const bandSong = chordBand ?? doc?.song
  const bandAvail = !!doc && !!track && !!bandSong && hasBand(bandSong, trackIdx)
  const bandEv = useMemo(() => (bandSong && bandAvail ? bandEvents(bandSong, trackIdx) : []), [bandSong, trackIdx, bandAvail])
  const bandSteps = useMemo(() => bandByStep(bandEv, flat), [bandEv, flat])
  const bandParts = useMemo(() => {
    const k = new Set(bandEv.map(e => e.kind))
    return (['drums', 'bass', 'other'] as const).filter(p => (p === 'drums' ? k.has('drum') : p === 'bass' ? k.has('bass') : k.has('gtr')))
  }, [bandEv])
  const withBand = bandOn && bandAvail
  const inTime = useInTime({
    band: withBand ? bandEv : undefined,
    strum: strumPat, meter, tempo: tempoMap?.changes ? tempoMap : undefined,
    flat, loop: loop, startFlat: withBand && pos === 0 ? 0 : cursorFlat >= 0 ? cursorFlat : 0, songBpm, speed, click, guide, sound: hearSound, strict, trainer, video,
    sync: showVideo ? doc?.ytSync : undefined, states,
    latencyMs: () => latencyMs(kindOf(listener.current?.external)),
    onExpect: (now, next) => listener.current?.expect(now, next),
    onChange: () => setVersion(v => v + 1),
    onHitNote: () => bumpCounts({ notesHit: 1, [doc?.source === 'lesson' ? 'exerciseNotes' : 'songNotes']: 1 }),
    onPass: (s, sp) => { if (s.score >= 90) bump('loop90'); if (loop) saveRun(s.score, 'time', sp, false, [loop.from, loop.to]) },
    onFinish: s => {
      setGameDone(n => n + 1)
      // Game Mode's Auto speed after a whole run too (loops use the speed trainer)
      if (gameView === 'game' && trainer.on && trainer.down !== undefined && !loop) setSpeed(nextSpeed(speed, s.score, trainer))
      if (s.score >= 60) bump(doc?.source === 'lesson' ? 'exercisesFinished' : 'songsFinished')
      const was = saveRun(s.score, 'time', speed, !loop && s.total > 0, loop ? [loop.from, loop.to] : undefined)
      if (!loop && s.total > 0) showReport(s.score, 'time', speed, was, s)
    },
  })
  // Game Mode: when each step sounds (beats), chord names, and the wrong/right events of Wait for me
  const gameBeats = useMemo(() => inTimeTimeline(flat, strumPat, meter).beatOf, [flat, strumPat, meter])
  // Game's clock: In time's, or Hear it's playhead (the highway scrolls and the ball bounces along while the tab plays itself)
  const gameBeatNow = useCallback((): number | null => {
    const live = inTime.beatNow()
    if (live !== null) return live
    const at = player.current?.position()
    if (!at) return null
    const b0 = gameBeats[at.i] ?? 0, b1 = gameBeats[at.i + 1] ?? b0 + (flat[at.i]?.step.dur ?? 1)
    const dur = flat[at.i]?.step.dur || 1
    return b0 + (at.into / dur) * (b1 - b0)
  }, [inTime, gameBeats, flat])
  const gameChordAt = useCallback((i: number) => timeline.spans[timeline.at[i]]?.name || undefined, [timeline])
  const fbCount = useRef(0)
  const gameWaitFb = useMemo(() => (feedback ? { ok: feedback.ok, key: ++fbCount.current, text: feedback.ok ? undefined : `THAT WAS ${noteName(feedback.heard, flats)}` } : null), [feedback]) // eslint-disable-line react-hooks/exhaustive-deps
  /** Play for me: hear a note (or the whole step) without moving the cursor */
  const playFor = useCallback((flatIdx: number, noteIdx?: number) => {
    const st = flat[flatIdx]?.step
    if (!st) return
    const ns = playable(st)
    const ctx = audio(); void ctx.resume()
    if (noteIdx !== undefined && ns[noteIdx]) playNote(ns[noteIdx].midi, ctx.currentTime + 0.02, 0.8, undefined, { sound: hearSound })
    else if (ns.length) strum(ns.map(n => n.midi), ctx.currentTime + 0.02, { spread: 0.02, sound: hearSound })
  }, [flat, hearSound])
  // a quick "again" flash on the tab each time the loop goes round (Wait for me and In time)
  useEffect(() => { if (passes.n > 0) setLoopBlink(b => ({ k: (b?.k ?? 0) + 1, text: `⟲ Again${passes.last !== null ? ` · last time ${passes.last}%` : ''}` })) }, [passes.n]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (inTime.wraps > 0 && inTime.running) setLoopBlink(b => ({ k: (b?.k ?? 0) + 1, text: `⟲ Again${inTime.pass.last ? ` · last time ${inTime.pass.last.score}%` : ''}` })) }, [inTime.wraps]) // eslint-disable-line react-hooks/exhaustive-deps
  // In time: playing = the run (the mic can stay open after Stop); Wait for me: listening
  // the play-along mix: your part (guide) vs the band, on the `me` / `band` buses (notes/AUDIO-ENGINE.md)
  useEffect(() => {
    if (!inTime.running) return
    if (guide) applyMix(withBand)
    else setBusLevel('band', 1)
  }, [inTime.running]) // eslint-disable-line react-hooks/exhaustive-deps
  const playingNow = mode === 'time' ? inTime.running || ready.counting : listening
  const tidyNow = tidy && playingNow && !stand && !focus
  const videoShown = !!(showVideo && doc?.youtube)
  // the menu tucks away in Full tab, music stand and while tidied up
  const hideMenu = focus || stand || tidyNow
  useEffect(() => { setPlayFocus(hideMenu); return () => setPlayFocus(false) }, [hideMenu])
  const inTimeRef = useRef(inTime)
  inTimeRef.current = inTime
  const modeRef = useRef(mode)
  modeRef.current = mode
  // practice time: listening with the mic counts as time with the guitar, Hear it as study time
  usePracticeTimer(doc?.source === 'lesson' ? 'warmup' : 'play', listening || inTime.running, true)
  usePracticeTimer('play', playAt >= 0 && !listening, false)
  async function toggleRun() {
    if (inTime.running) { inTime.stop(); return }
    if (ready.counting) { ready.cancel(); return }
    stopPreview()
    setReport(null)
    if (!listening) await toggleListen()
    // a few seconds to get your hands on the guitar, then the count-in bar
    ready.start(() => inTime.start())
  }
  useEffect(() => { if (mode === 'wait') inTime.stop() }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Then vs now: start recording a whole run from the top (Wait for me: listening at the first note, no loop;
  // In time: a run from the start); anything else (a loop, stopping half way) throws it away
  const fromTop = pos === 0 && !loopRange
  const runOn = mode === 'wait' ? listening : inTime.running
  useEffect(() => {
    const a = auto.current
    if (a) {
      // keep going while the same run carries on; a loop, a new song or stopping throws it away
      if (!thenNow || !runOn || !!loopRange || a.docId !== doc?.id) autoCancel()
      return
    }
    if (!thenNow || !doc || doc.source === 'lesson' || !fromTop || !runOn || done) return
    const stream = listener.current?.mediaStream
    if (!stream) return
    const rec = new TakeRecorder()
    auto.current = { rec, docId: doc.id, title: doc.title }
    rec.start(stream).catch(() => { if (auto.current?.rec === rec) auto.current = null })
  }, [thenNow, doc?.id, fromTop, runOn, loopRange, autoTick]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => autoCancel(), [])

  // ---------- footswitch / pedal ----------
  function jumpBar(delta: number) {
    const bar = Math.max(0, (cursorFlat >= 0 ? flat[cursorFlat].bar : 0) + delta)
    const fi = flat.findIndex(f => f.bar >= bar)
    if (fi < 0) return
    let k = follow.idx.findIndex(i => i >= fi)
    if (k < 0) k = follow.idx.length - 1
    for (let i = follow.idx[k]; i < states.current.length; i++) states.current[i] = 0
    setPos(k)
    setFeedback(null)
    setVersion(v => v + 1)
  }
  usePedals({
    startStop: () => (mode === 'time' ? void toggleRun() : void toggleListen()),
    restart: () => { if (inTime.running) { inTime.stop(); inTime.start() } else restart() },
    loopBar: () => { if (loop) setLoop(undefined); else if (cursorFlat >= 0) setLoop({ from: flat[cursorFlat].bar, to: flat[cursorFlat].bar }) },
    prevBar: () => jumpBar(-1),
    nextBar: () => jumpBar(1),
    hearIt: () => preview(),
    accept: () => { if (feedback && !feedback.ok && mode === 'wait') acceptMiss() },
    video: () => { const v = video.current; if (v) (v.playing() ? v.pause() : v.play()) },
  })
  const [loadingSnd, setLoadingSnd] = useState(false)
  function preview(loaded = false) {
    if (playAt >= 0) { stopPreview(); return }
    if (loadingSnd) return
    // the guitar's recorded sounds aren't in yet: say so on the button, then start
    if (!loaded && !soundLoaded(hearSound)) {
      setLoadingSnd(true)
      // (only if you're still on Play: leaving the page while it loaded must not start the sound)
      void loadSound(hearSound).catch(() => {}).finally(() => { setLoadingSnd(false); if (playRef.current) preview(true) })
      return
    }
    if (listening) void toggleListen()
    const p = (player.current ??= new TabPlayer())
    p.sound = hearSound
    p.band = withBand ? bandSteps : undefined
    p.strum = strumPat ? { hits: strumPat.hits, offs: stepOffs } : undefined
    p.meter = meter
    p.tempo = tempoMap?.changes ? tempoMap : undefined
    p.onStep = i => setPlayAt(i)
    p.onEnd = () => setPlayAt(-1)
    if (loopRange) {
      const a = follow.idx[loopRange.a]
      let b = flat.length
      for (let i = follow.idx[loopRange.b] + 1; i < flat.length; i++) if (flat[i].bar > loop!.to) { b = i; break }
      const from = cursorFlat >= a && cursorFlat < b ? cursorFlat : a
      setPlayAt(from)
      p.play(flat, from, songBpm * speed, b, a)
      return
    }
    // with the band, starting at the first note plays the intro too
    const from = withBand && pos === 0 ? 0 : cursorFlat >= 0 ? cursorFlat : 0
    setPlayAt(from)
    p.play(flat, from, songBpm * speed)
  }
  useEffect(() => { stopPreview() }, [flat]) // eslint-disable-line react-hooks/exhaustive-deps

  function restart(from = loopRange ? loopRange.a : 0) {
    setReport(null)
    autoCancel()
    setAutoTick(t => t + 1)
    states.current = new Uint8Array(flat.length)
    setPos(from)
    setFeedback(null)
    setVersion(v => v + 1)
  }

  // ---------- practice loop ----------
  function setLoop(l: { from: number; to: number } | undefined) {
    setReport(null)
    update({ loop: l })
    setPasses({ n: 0, last: null, best: null })
    stopPreview()
  }
  // jump into the loop when it is set
  useEffect(() => {
    if (!loopRange) return
    if (pos < loopRange.a || pos > loopRange.b) {
      states.current = new Uint8Array(flat.length)
      setPos(loopRange.a)
      setVersion(v => v + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopRange])
  const onBar = useCallback((bar: number) => {
    setSelecting(sel => {
      if (!sel) return sel
      if (sel.first === undefined) return { first: bar }
      const a = Math.min(sel.first, bar)
      const b = Math.max(sel.first, bar)
      setTimeout(() => setLoop({ from: a, to: b }), 0)
      return null
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onTap = useCallback((flatIdx: number, note: SongNote | null) => {
    if (player.current?.playing) { player.current.stop(); setPlayAt(-1) }
    const { follow } = ref.current
    let k = follow.idx.findIndex(i => i >= flatIdx)
    if (k < 0) k = follow.idx.length - 1
    const st = states.current
    for (let i = follow.idx[k]; i < st.length; i++) st[i] = 0
    setPos(k)
    setFeedback(null)
    setVersion(v => v + 1)
    const ctx = audio()
    void ctx.resume()
    setInspectAt(flatIdx)
    if (note) {
      setInspect(note)
      if (note.tech !== 'x') playNote(note.midi, ctx.currentTime + 0.02, 0.8, undefined, { sound: hearSound, pm: note.tech === 'PM' })
    } else {
      const ns = playable(flat[follow.idx[k]]?.step ?? { notes: [], dur: 0 })
      setInspect(ns[0] ?? null)
      if (ns.length) strum(ns.map(n => n.midi), ctx.currentTime + 0.02, { spread: 0.02, sound: hearSound })
    }
  }, [flat, hearSound])

  function hearNext() {
    if (!expected.length) return
    const ctx = audio()
    void ctx.resume()
    strum(expected.map(n => n.midi), ctx.currentTime + 0.02, { spread: 0.02, sound: hearSound })
  }

  const firstTry = useMemo(() => {
    let ok = 0, all = 0
    for (const i of follow.idx) { const s = states.current[i]; if (s === 1 || s === 2) { all++; if (s === 1) ok++ } }
    return all ? Math.round((ok / all) * 100) : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, follow])

  // what you use (counted on this phone only)
  useEffect(() => { if (opts) countUse('play:options') }, [opts])
  useEffect(() => { if (stand) countUse('play:stand') }, [stand])
  // the music stand hides the phone's bars (swipe up from the bottom to bring them back for a moment)
  useEffect(() => { if (!stand) return; holdFullScreen(true); return () => holdFullScreen(false) }, [stand])
  useEffect(() => { if (bigView) countUse('play:remote') }, [bigView])
  useEffect(() => { if (recording) countUse('play:record') }, [recording])
  useEffect(() => { if (loop) countUse('play:loop') }, [loop?.from, loop?.to]) // eslint-disable-line react-hooks/exhaustive-deps
  const hearing = playAt >= 0
  useEffect(() => { if (hearing) { countUse('play:hear'); if (withBand) countUse('play:band') } }, [hearing]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (inTime.running) { countUse('play:intime'); if (withBand) countUse('play:band') } }, [inTime.running]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (showVideo && doc?.youtube) countUse('play:video') }, [showVideo, doc?.youtube])

  // ---- Back: stop picking loop bars, close the song check, leave Full tab
  useBack(!!selecting, () => setSelecting(null))
  useBack(checkOpen, () => closeCheck())
  useBack(focus, () => setLay({ ...lay, focus: false }))
  useBack(stand, () => setStand(false))
  // ---- search: open what was asked for and point at it (it flashes)
  const [findAt, setFindAt] = useState<{ f: PlayFocus; n: number } | null>(null)
  const applyRef = useRef<(a: PlayAction) => void>(() => {})
  applyRef.current = (a: PlayAction) => {
    if (a.mode && !inTime.running && !listening) setMode(a.mode)
    if (a.loop !== undefined && track) {
      if (!a.loop) setLoop(undefined)
      else { const n = track.bars.length; const f = Math.max(0, Math.min(n - 1, a.loop.from)), t = Math.max(f, Math.min(n - 1, a.loop.to)); setLoop({ from: f, to: t }) }
    }
    if (a.speed) setSpeed(Math.max(0.25, Math.min(1.5, Math.round(a.speed * 20) / 20)))
    if (a.open === 'options') setOpts(true)
    else if (a.open === 'video') { if (doc?.youtube) setShowVideo(true); else setVideoAsk(true); setLay({ ...lay, side: true, focus: false }) }
    else if (a.open === 'check') setCheckOpen(true)
    else if (a.open === 'loop') { if (!loop) setSelecting({}) }
    else if (a.open === 'solo') { if (wide) setLay({ ...lay, solo: true, focus: false }); else setView('both') }
    else if (focus && a.focus && a.focus !== 'full') setLay({ ...lay, focus: false })
    if (a.focus) setFindAt(f => ({ f: a.focus!, n: (f?.n ?? 0) + 1 }))
  }
  useEffect(() => {
    const first = takePlayAction()
    const t = first ? setTimeout(() => applyRef.current(first), 0) : 0
    const off = onPlayAction(a => applyRef.current(a))
    return () => { clearTimeout(t); off() }
  }, [])
  useEffect(() => {
    if (!findAt) return
    const sel = findAt.f === 'input' ? '.play .input-btn' : `[data-find="${findAt.f}"]`
    let el: Element | null = null
    let tries = 0
    const find = () => {
      el = document.querySelector(sel)
      if (!el) { if (++tries < 20) t = setTimeout(find, 100); return }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el.classList.add('find-flash')
      t = setTimeout(() => el?.classList.remove('find-flash'), 2600)
    }
    let t = setTimeout(find, 80)
    return () => { clearTimeout(t); el?.classList.remove('find-flash') }
  }, [findAt])

  // what the ✨ helper can see: the song, where you are, your loop and speed, the chord, your last mistake
  const nowBar = cursorFlat >= 0 && flat[cursorFlat] ? flat[cursorFlat].bar : 0
  const spanNow = timeline.spans[curSpan], spanNext = timeline.spans[curSpan + 1]
  // beats until the chord changes, from wherever the tab is now (following you, In time or Hear it)
  const liveAt = inTime.running ? inTime.cursor : playAt >= 0 ? playAt : cursorFlat
  const liveSpan = liveAt >= 0 ? timeline.at[liveAt] : -1
  const beatsToNextChord = liveSpan >= 0 && timeline.spans[liveSpan] ? flat.slice(liveAt, timeline.spans[liveSpan].end).reduce((t, f) => t + f.step.dur, 0) : 99
  // what the floating cards show (float/FloatLayer.tsx): the chord now and next, the bar, the tempo, the key, the video
  const cardsShown = useShownCards('play')
  const fbKey = useRef(0)
  useEffect(() => {
    if (!doc || !track) { clearFloat('play'); return }
    const sNow = timeline.spans[liveSpan >= 0 ? liveSpan : curSpan], sNext = timeline.spans[(liveSpan >= 0 ? liveSpan : curSpan) + 1]
    const at = liveAt >= 0 ? liveAt : 0
    publishFloat('play', {
      title: doc.title, video: doc.youtube, tuning: track.tuning, flats,
      chordNow: sNow?.name || undefined, chordNext: sNext?.name || undefined, beatsToChange: beatsToNextChord < 99 ? beatsToNextChord : undefined,
      keyPcs: keyScalePcs(key), keyName: key.label,
      bar: flat[at] ? flat[at].bar + 1 : undefined, bars: track.bars.length,
      loop: loop ? (loop.from === loop.to ? `bar ${loop.from + 1}` : `bars ${loop.from + 1}–${loop.to + 1}`) : undefined,
      bpm: songBpm, speed, setSpeed,
      band: withBand ? {
        parts: bandParts,
        ...(chordBand ? { style: bandStyle, styles: CHORD_BAND_STYLES.map(id => ({ id, label: bandStyleLabel(id) })), setStyle: (st: string) => setBandStyle(st as Style) } : {}),
      } : undefined,
    })
  }) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!feedback) return
    publishFloat('play', { feedback: { ok: feedback.ok, heard: noteName(feedback.heard, flats), want: expected[0] ? noteName(expected[0].midi, flats) : undefined, key: ++fbKey.current } })
  }, [feedback]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearFloat('play'), [])
  const lm = lastMiss.current
  useScreenInfo('play', doc && track ? {
    label: `Play: "${doc.title}", bar ${nowBar + 1}${loop ? `, looping ${loop.from === loop.to ? `bar ${loop.from + 1}` : `bars ${loop.from + 1}–${loop.to + 1}`}` : ''} at ${Math.round(speed * 100)}%`,
    summary: [
      `In Play with the ${track.bars.every(b => b.steps.every(st => !st.notes.length || !!st.chord)) ? 'chord sheet' : 'tab'} "${doc.title}"${doc.song.artist ? ` by ${doc.song.artist}` : ''} (${track.bars.length} bars, ${track.tuning.length} strings${track.capo ? `, capo ${track.capo}` : ''}).`,
      `Mode: ${mode === 'time' ? 'In time (the tab moves at tempo)' : 'Wait for me (the tab waits for each right note)'}. They are at bar ${nowBar + 1}.`,
      loop ? `Looping bars ${loop.from + 1} to ${loop.to + 1}.` : 'No loop set.',
      `Speed ${Math.round(speed * 100)}% of ${songBpm} BPM (= ${Math.round(songBpm * speed)} BPM).`,
      `Key: ${key.label}.${spanNow ? ` Chord here: ${spanNow.name}${spanNext ? `, next: ${spanNext.name}` : ''}.` : ''}`,
      lm && lm.bar >= 0 ? `Last mistake: in bar ${lm.bar + 1} they played ${lm.chordText ? `a chord sounding like ${lm.chordText}` : noteName(lm.heard, flats)} where the tab wants ${lm.want.map(m => noteName(m, flats)).join('+') || 'a rest'}.` : '',
      (() => { const g = hands[groupAt(hands, cursorFlat)]; if (!g) return ''; const fs = [...new Set(g.notes.map(n => `${n.fret === 0 ? 'open' : `fret ${n.fret}`} ${stringLabel(track.tuning, n.string, flats)} string = finger ${n.finger || 'none (open)'}`))].slice(0, 6); return `Hand position here: ${g.open ? 'open / first position' : `1st finger on fret ${g.base}`} (one finger per fret). Notes in this hand position: ${fs.join('; ')}.` })(),
      passes.n ? `Loop passes so far: ${passes.n}, last ${passes.last}%, best ${passes.best}%.` : '',
      inTime.pass.last ? `Last In time pass: ${inTime.pass.last.score}%.` : '',
    ].filter(Boolean).join(' '),
    can: ['loop', 'speed'],
    play: { bar: nowBar, bars: track.bars.length, loop, speed, key: key.label, chord: spanNow?.name },
  } : null)

  if (!doc || !track) {
    return <div className="play"><p className="muted">Loading…</p></div>
  }

  const tuning = track.tuning.map(t => t + track.capo)
  // where the fretting hand sits for the part you're on
  const handAt = inTime.running ? inTime.cursor : playAt >= 0 ? playAt : cursorFlat
  const hg = groupAt(hands, handAt)
  const hand = hg >= 0 ? hands[hg] : null
  const handNext = hg >= 0 ? hands[hg + 1] ?? null : null
  const handLeft = hand ? flat.slice(Math.max(handAt, hand.from), hand.to).filter(f => f.step.notes.length).length : 0
  const strNames = track.tuning.map((t, s) => {
    const n = pcName(t % 12, flats)
    return s === track.tuning.length - 1 && track.tuning.filter(x => x % 12 === t % 12).length > 1 ? n.toLowerCase() : n
  })
  // the floating finger box: beats until the hand has to move
  const beatsToShift = hand && handNext ? flat.slice(Math.max(0, handAt), handNext.from).reduce((t, f) => t + f.step.dur, 0) : Infinity
  const handOn = cardsShown.includes('hand')
  const setHandOn = (on: boolean) => { if (on !== handOn) toggleCard('play', 'hand') }
  const fingerBox = handOn && hand && hand.notes.some(n => n.fret > 0) && !(stand && bigView) ? (
    <FingerBox group={hand} next={handNext} beatsToShift={beatsToShift} expected={expected} nStr={track.tuning.length} stringNames={strNames} onHide={() => setHandOn(false)}
      onLoopShift={handNext ? () => { const b = flat[handNext.from]?.bar ?? 0; setLoop({ from: Math.max(0, b - 1), to: b }); countUse('play:loopShift') } : undefined} />
  ) : null
  void handLeft
  // strum-along: the chord to play next, with its shape
  const wantChord = !done && !!follow.steps[pos]?.chord
  const chordName = cursorFlat >= 0 ? (flat[cursorFlat].step.chord ?? timeline.spans[curSpan]?.name) : undefined
  const chordVoicing = wantChord ? (() => {
    const frets = track.tuning.map((_, s) => expected.find(n => n.string === s)?.fret ?? -1)
    const played = frets.filter(f => f > 0)
    return { frets, fingers: frets.map(() => 0), barres: [], baseFret: played.length ? Math.min(...played) : 1, midi: [] }
  })() : null
  const where = (n: SongNote) => `${n.fret === 0 ? 'open' : `fret ${n.fret}`}, ${stringLabel(track.tuning, n.string, flats)} string`

  const readout = (mini: boolean) => (
    <div className={`readout-box${mini ? ' mini' : ''}`} aria-live="polite">
      {pulse && <span key={pulse.key} className={`pulse-ring ${pulse.ok ? 'ok' : 'bad'}`} aria-hidden="true" />}
      <div className="heard">
        <span className="small muted">{listening ? 'Hearing' : 'Mic off'}</span>
        <span className={`heard-note${live !== null ? ' on' : ''}`}>
          {live !== null ? <>{noteName(live, flats)}<sub>{octave(live)}</sub></> : '–'}
        </span>
        <InputPicker
          active={input}
          needsSetup={!isSetUp()}
          onChanged={() => {
            // switch inputs on the fly
            if (!listener.current) return
            listener.current.stop()
            listener.current = null
            setListening(false)
            setTimeout(() => void toggleListenRef.current(), 50)
          }}
        />
      </div>
      <div className="next">
        {mode === 'time' && (inTime.running || inTime.stats) ? (
          <>
            <span className="small muted">
              {inTime.running
                ? `${inTime.usingVideo ? 'Following the video' : `${Math.round(songBpm * (trainer.on && loop && !inTime.usingVideo ? inTime.pass.speed : speed))} BPM`}${loop ? ` · pass ${inTime.pass.n + 1}` : ''}${inTime.pass.last ? ` · last pass ${inTime.pass.last.score}%` : ''}${trainer.on && loop && !inTime.usingVideo ? ` · speed ${Math.round(inTime.pass.speed * 100)}%` : ''}`
                : 'Run finished'}
            </span>
            {inTime.running && inTime.feedback && (
              <span key={inTime.feedback.key} className={`timing-fb ${inTime.feedback.j}`}>
                {inTime.feedback.j === 'perfect' ? 'On time!' : inTime.feedback.j === 'good' ? `Good (${Math.abs(inTime.feedback.ms)} ms ${inTime.feedback.ms < 0 ? 'early' : 'late'})` : inTime.feedback.j === 'miss' ? 'Missed a note' : `${Math.abs(inTime.feedback.ms)} ms ${inTime.feedback.j}`}
              </span>
            )}
            {inTime.running && !inTime.feedback && <span className="small">Count-in: play along when the clicks lead in.</span>}
            {!inTime.running && inTime.stats && (
              <>
                <b>Score {inTime.stats.score}%</b>
                <span className="small muted">
                  {inTime.stats.onTime} on time, {inTime.stats.early} early, {inTime.stats.late} late, {inTime.stats.missed} missed.
                  {Math.abs(inTime.stats.meanErr) >= 25 ? (inTime.stats.meanErr < 0 ? ` You tend to rush (${-inTime.stats.meanErr} ms early).` : ` You tend to drag (${inTime.stats.meanErr} ms late).`) : ' Nicely centred on the beat.'}
                </span>
              </>
            )}
          </>
        ) : done ? (
          <>
            <PsyDog seed="finished" className="finish-face" />
            <b>Finished!</b>
            <span className="small muted">{firstTry !== null ? `${firstTry}% of notes right first time.` : ''}</span>
            {!report && <button className="btn sm" onClick={() => restart()}>Play again</button>}
          </>
        ) : (
          <>
            <span className="small muted">
              Next · {wantChord ? 'chord' : 'note'} {pos + 1} of {follow.idx.length} · bar {flat[cursorFlat].bar + 1}
              {loopRange && ` · loop pass ${passes.n + 1}${passes.last !== null ? ` · last pass ${passes.last}%` : ''}${passes.best !== null ? ` · best ${passes.best}%` : ''}`}
            </span>
            {wantChord ? (
              <span className="next-notes next-chord">
                {chordVoicing && <Zoomable id="readoutChord" max={3}><ChordDiagram voicing={chordVoicing} size={0.5} onClick={hearNext} /></Zoomable>}
                <span className="nn"><b className="amber chord-big">{chordName ?? 'Chord'}</b> strum it and let it ring</span>
                <button className="btn sm ghost" onClick={hearNext} aria-label="Hear the chord"><Ico n="play" fill /></button>
              </span>
            ) : (
              <span className="next-notes">
                {expected.map((n, i) => (
                  <span key={i} className="nn"><b>{n.fret}</b> on {stringLabel(track.tuning, n.string, flats)} = <b className="amber">{noteName(n.midi, flats)}</b></span>
                ))}
                <button className="btn sm ghost" onClick={hearNext} aria-label="Hear the next note"><Ico n="play" fill /></button>
              </span>
            )}
            {feedback && (
              feedback.ok ? (
                <span className="fb ok">✓ Got it: {feedback.chordText ? `the chord (${feedback.chordText})` : noteName(feedback.heard, flats)}{feedback.note ? ` · ${where(feedback.note)}` : ''}{feedback.skipped ? ` (skipped ${feedback.skipped})` : ''}</span>
              ) : feedback.chordText ? (
                <span className="fb bad">✗ {feedback.chordHelp ?? <>Heard mostly {feedback.chordText}: the chord needs {[...new Set(expected.map(n => noteName(n.midi, flats)))].join(' ')}. Strum all the strings and let them ring.</>}
                  {mode === 'wait' && <button className="btn sm fb-right" onClick={acceptMiss} data-testid="played-right">I played it right</button>}</span>
              ) : (
                <span className="fb bad">✗ You played {noteName(feedback.heard, flats)}{octave(feedback.heard)}: the tab wants {expected.map(n => noteName(n.midi, flats)).join(' or ')}
                  {mode === 'wait' && <button className="btn sm fb-right" onClick={acceptMiss} data-testid="played-right">I played it right</button>}</span>
              )
            )}
            {taughtNote && <span className="fb taught" role="status">{taughtNote}</span>}
            {!feedback && inspect && (
              <span className="fb">{inspect.tech === 'x' ? 'Muted note (x): no pitch.' : `That ${inspect.fret} is ${noteName(inspect.midi, flats)}${octave(inspect.midi)} · ${where(inspect)}`}
                {inspect.tech !== 'x' && inspectAt >= 0 && <NoteHandEdit note={inspect} finger={hands[groupAt(hands, inspectAt)]?.notes.find(n => n.string === inspect.string && n.fret === inspect.fret)?.finger ?? 0}
                  spots={otherSpots(inspect.midi, track.tuning, track.capo, track.tuning.length === 4 ? 15 : 22, inspect.fret).filter(x => x.string !== inspect.string)}
                  onFinger={f => { const k = editKey(trackIdx, inspectAt, inspect.string); update({ hand: { ...(doc.hand ?? {}), [k]: { ...(doc.hand?.[k] ?? {}), finger: f } } }); countUse('play:finger') }}
                  onMove={sp => {
                    // the key stays the original string, so moving again or back works
                    const orig = Object.entries(doc.hand ?? {}).find(([k, e]) => k.startsWith(`${trackIdx}:${inspectAt}:`) && e.string === inspect.string)?.[0] ?? editKey(trackIdx, inspectAt, inspect.string)
                    const origString = Number(orig.split(':')[2])
                    const back = sp.string === origString
                    const next = { ...(doc.hand ?? {}) }
                    if (back) delete next[orig]; else next[orig] = { string: sp.string, fret: sp.fret }
                    update({ hand: next })
                    setInspect({ ...inspect, string: sp.string, fret: sp.fret })
                    countUse('play:otherString')
                  }} />}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )

  const tabTools = (
    <div className="tab-tools" role="toolbar" aria-label="Play controls">
      <Chips label="Follow mode" find="mode" items={[{ id: 'wait', label: 'Wait for me' }, { id: 'time', label: 'In time' }]} value={mode} onChange={v => setMode(v)} />
      {loop ? (
        <span className="loop-chip" data-find="loop"><Ico n="loop" /> {loop.from === loop.to ? `Bar ${loop.from + 1}` : `Bars ${loop.from + 1}–${loop.to + 1}`}<button onClick={() => setLoop(undefined)} aria-label="Stop looping">✕</button></span>
      ) : (
        <button className="btn sm" data-find="loop" aria-pressed={!!selecting} onClick={() => setSelecting(selecting ? null : {})}><Ico n="loop" /> Loop</button>
      )}
      <button className={`btn sm hear${playAt >= 0 ? ' on' : ''}${loadingSnd ? ' loading' : ''}`} data-find="hear" onClick={() => preview()} aria-pressed={playAt >= 0} aria-busy={loadingSnd}>
        {loadingSnd ? <><span className="spin" aria-hidden />Loading sounds…</> : playAt >= 0 ? <><Ico n="stop" fill /> Stop</> : <><Ico n="play" fill /> Hear it</>}
      </button>
      {recording && (
        <button className="btn sm rec on" aria-pressed onClick={() => void toggleRec()} aria-label="Stop recording"><Ico n="stop" fill /> {Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, '0')}</button>
      )}
      <button className="btn sm opts-btn" data-find="opts" aria-expanded={opts} onClick={() => setOpts(true)} aria-label="Options: speed, sound, band, record, how the tab looks">
        <IconSliders /><span className="opts-label">Options</span>
      </button>
    </div>
  )

  const optionsPanel = opts && (
    <div className="sheet-backdrop" onClick={() => setOpts(false)}>
      <div className="sheet play-opts" role="dialog" aria-modal="true" aria-label="Play options" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Options</h2>
          <button className="btn sm" onClick={() => setOpts(false)}>Done</button>
        </div>

        <section className="opt-group" aria-label="Playback">
          <h3>Playback</h3>
          <div className="opt-row" data-find="speed"><span className="opt-name">Speed</span>
            <Chips label="Playback speed" items={[{ id: 0.5, label: '½' }, { id: 0.75, label: '¾' }, { id: 1, label: `1× · ${Math.round(songBpm)} bpm` }]} value={speed} onChange={v => { setSpeed(v); if (playAt >= 0) { stopPreview() } }} />
          </div>
          <label className="opt-row" data-find="sound" title={soundInfo(hearSound).hint}><span className="opt-name">Sound</span>
            <select className="select sm" value={soundSel} aria-label="Sound for Hear it and tapped notes" onChange={e => {
              const v = e.target.value as 'auto' | SoundId
              setSoundChoice(v)
              if (playAt >= 0) stopPreview()
            }}>
              <option value="auto">Auto ({soundInfo(activeSound(songSound)).label})</option>
              {SOUNDS.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </label>
          {bandAvail && (
            <label className="opt-row opt-check" data-find="band">
              <input type="checkbox" checked={bandOn} onChange={() => { setBandOn(!bandOn); if (playAt >= 0) stopPreview() }} />
              <span><b><Ico n="drum" /> Play with the band</b><span className="small muted">{chordBand ? `A ${bandStyleLabel(bandStyle).toLowerCase()} band (drums and bass) following the chords` : doc.song.backing ? 'Drums and bass from the chords' : 'The drums, bass and other parts of this song'}, with Hear it and In time.</span></span>
            </label>
          )}
          {bandAvail && bandOn && (
            <div className="opt-row" data-find="mixer">
              <button className="btn sm" onClick={() => { const on = shownCards('play').includes('mixer'); if (!on) toggleCard('play', 'mixer'); setOpts(false) }} data-testid="open-mixer"><Ico n="sliders" /> Mixer: each part's volume, mute and solo{chordBand ? ', band style' : ''}</button>
            </div>
          )}
          {mode === 'time' && (
            <>
              <label className="opt-row opt-check" data-find="click"><input type="checkbox" checked={click} onChange={() => setClick(!click)} /><span><b>Click</b><span className="small muted">A metronome click while you play in time.</span></span></label>
              <label className="opt-row opt-check" data-find="guide"><input type="checkbox" checked={guide} onChange={() => setGuide(!guide)} /><span><b>Hear the tab too</b><span className="small muted">Your part plays along with you{withBand ? ', with the band' : ''}.</span></span></label>
              {guide && <div className="opt-row" data-find="mix"><MixSlider band={withBand} /></div>}
              {loop && <label className="opt-row opt-check" data-find="trainer"><input type="checkbox" checked={trainer.on} onChange={() => setTrainer({ ...trainer, on: !trainer.on })} /><span><b>Speed trainer</b><span className="small muted">Starts at {Math.round(trainer.start * 100)}% and speeds up {Math.round(trainer.step * 100)}% after each pass of {trainer.pass}% or better.</span></span></label>}
            </>
          )}
          <label className="opt-row opt-check" data-find="thennow"><input type="checkbox" checked={thenNow} onChange={() => { setThenNowOn(!thenNow); setThenNow(!thenNow); if (thenNow) autoCancel() }} /><span><b>Then vs now</b><span className="small muted">Quietly keep your first whole run of each song and, later, your best one, so you can hear how far you've come (on this phone only; My recordings lists them).</span></span></label>
          <button className={`btn rec${recording ? ' on' : ''}`} data-find="record" onClick={() => { void toggleRec(); setOpts(false) }}>
            {recording ? <><Ico n="stop" fill /> Stop recording ({Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, '0')})</> : <><Ico n="record" fill className="rec-dot" /> Record yourself</>}
          </button>
        </section>

        <section className="opt-group" aria-label="How the tab looks">
          <h3>The tab</h3>
          <div className="opt-row" data-find="numbers"><span className="opt-name">Numbers</span>
            <Chips label="Tab numbers" items={[{ id: 'fret', label: 'Frets' }, { id: 'note', label: 'Notes' }, { id: 'both', label: 'Both' }]} value={labelMode} onChange={setLabelMode} />
          </div>
          {isSheet ? (
            <label className="opt-row" data-find="count" title={strumPat?.how ?? 'Show a strum pattern over the chords'}><span className="opt-name">Strum</span>
              <select className="select sm" value={strumId} aria-label="Strum pattern" onChange={e => doc && setStrumBySong({ ...strumBySong, [doc.id]: e.target.value })}>
                {patternsFor(meter).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                <option value="off">No arrows</option>
              </select>
            </label>
          ) : (
            <label className="opt-row opt-check" data-find="count"><input type="checkbox" checked={counts} onChange={() => setCounts(!counts)} /><span><b>Count it: 1 & 2 &</b><span className="small muted">Note stems and the count under the tab.</span></span></label>
          )}
          <label className="opt-row opt-check" data-find="hand"><input type="checkbox" checked={handOn} onChange={() => setHandOn(!handOn)} /><span><b><Ico n="hand" /> Where your fingers go</b><span className="small muted">A floating window with the four frets your hand covers and each finger in colour. Drag it anywhere, resize it from its corner, tuck it away with –.</span></span></label>
          <div className="opt-row stack" style={{ gap: 6 }} data-find="cards"><span><b>Floating cards</b> <span className="small muted">Pick any you like: each floats over everything, drag it anywhere, resize it from its corner, – shrinks it to a bubble, × hides it.</span></span><FloatPicker screen="play" /></div>
          {capoIdea && (
            <div className="opt-row" data-find="capo"><span><b>Smart capo</b><span className="small muted">{doc.smartCapo ? `Capo ${(writtenTrack?.capo ?? 0) + doc.smartCapo} with easier shapes (${capoIdea.shapes.join(' ')}): it sounds the same.` : `Capo ${(writtenTrack?.capo ?? 0) + capoIdea.capo} turns these chords into easier shapes: ${capoIdea.shapes.join(' ')}. It sounds the same.`}</span></span>
              <Chips label="Capo" items={[{ id: 'as', label: 'As written' }, { id: 'smart', label: `Capo ${(writtenTrack?.capo ?? 0) + capoIdea.capo}` }]} value={doc.smartCapo ? 'smart' : 'as'} onChange={v => { update({ smartCapo: v === 'smart' ? capoIdea.capo : undefined }); countUse('play:smartCapo') }} /></div>
          )}
          {!!writtenTrack?.capo && doc.source !== 'chords' && (
            <div className="opt-row" data-find="nocapo"><span><b>Capo {writtenTrack.capo}</b><span className="small muted">{doc.noCapo ? 'Playing it without the capo: every fret is higher, the notes are the same.' : 'No capo handy? Play the same notes without it.'}</span></span>
              <Chips label="Capo" items={[{ id: 'as', label: 'With capo' }, { id: 'no', label: 'Without capo' }]} value={doc.noCapo ? 'no' : 'as'} onChange={v => { update({ noCapo: v === 'no' }); countUse('play:noCapo') }} /></div>
          )}
          <div className="opt-row" data-find="fingering"><span><b>Fingering</b><span className="small muted">{doc.easier ? 'Re-fingered for your hand: the same notes on the strings and frets that move your hand least. The tab as written is kept.' : 'As written. Easier re-places the notes for your hand size and level. Tap any note to choose a finger or another string for it.'}</span></span>
            <Chips label="Fingering" items={[{ id: 'as', label: 'As written' }, { id: 'easy', label: 'Easier for my hand' }]} value={doc.easier ? 'easy' : 'as'} onChange={v => { update({ easier: v === 'easy' }); countUse('play:easier') }} /></div>
          <div className="opt-row" data-find="size"><span className="opt-name">Size</span>
            <span className="zoom-btns" role="group" aria-label="Tab size">
              <button className="btn sm" onClick={() => setTabZoom(z => Math.max(0.7, Math.round((z - 0.1) * 10) / 10))} aria-label="Smaller tab">A−</button>
              <span className="small muted zoom-val">{Math.round(tabZoom * 100)}%</span>
              <button className="btn sm" onClick={() => setTabZoom(z => Math.min(2.4, Math.round((z + 0.1) * 10) / 10))} aria-label="Bigger tab">A+</button>
            </span>
            <span className="small muted">or pinch the tab</span>
          </div>
          <label className="opt-row opt-check" data-find="tidy"><input type="checkbox" checked={tidy} onChange={() => setTidy(!tidy)} /><span><b>Tidy up while I play</b><span className="small muted">When you start (Listen or In time), the other panels and the menu fold away so the tab is bigger; they come back when you stop. A playing video stays.</span></span></label>
          <div className="opt-row" data-find="panels"><span><b>Move the panels</b><span className="small muted">Drag <b>☰ Move</b> on a panel's bar (the video and readout, Scales &amp; chords) to put it above or below the tab{wide ? ', or on the left or right' : ''}. Drag the bar itself to make it bigger or smaller.</span></span>
            {movedLayout && <button className="btn sm" onClick={() => setLay({ ...lay, order: undefined, sideLeft: undefined, soloTop: undefined })}>Put them back</button>}</div>
          <label className="opt-row opt-check" data-find="split"><input type="checkbox" checked={split} onChange={() => setSplitPref(split ? 'off' : 'on')} /><span><b>Split screen</b><span className="small muted">Video and readout on top, the tab below (automatic when the Fold is half-folded).</span></span></label>
        </section>

        <section className="opt-group" aria-label="Listening">
          <h3>Listening</h3>
          <label className="opt-row opt-check" data-find="octave"><input type="checkbox" checked={strict} onChange={() => setStrict(!strict)} /><span><b>Exact octave</b><span className="small muted">Only count the note in the octave the tab shows.</span></span></label>
          <label className="opt-row" data-find="sensitivity" title="How easily a sound counts as a note. Set it properly in Set up input."><span className="opt-name">Sensitivity</span>
            <input type="range" min={0.4} max={3} step={0.05} value={3.4 - gate} aria-label="Note sensitivity"
              onChange={e => { const g = Math.round((3.4 - Number(e.target.value)) * 100) / 100; setGear(gearKind, { gate: g }); if (listener.current) listener.current.gate = g }} />
          </label>
          {taughtCount(gearKind) > 0 && (
            <div className="opt-row" data-find="taught"><span className="opt-name">Learned</span>
              <span className="small">{taughtCount(gearKind)} mix-up{taughtCount(gearKind) === 1 ? '' : 's'} you corrected on the {gearKind === 'usb' ? 'USB amp' : 'phone mic'}</span>
              <button className="btn sm" onClick={() => { forgetTaught(gearKind); setVersion(v => v + 1) }}>Forget them</button>
            </div>
          )}
          <div className="row">
            <button className="btn sm" data-find="setup" onClick={() => { setOpts(false); setGearOpen(true) }}>{isSetUp() ? 'Set up input again' : 'Set up your input (2 min)'}</button>
            <button className="btn sm" data-find="restart" onClick={() => { restart(); setOpts(false) }}>Start over</button>
          </div>
        </section>
      </div>
    </div>
  )

  // tidy keeps a playing video in view; stand hides everything but the tab
  const sideOpen = lay.side && !focus && !stand && !(tidyNow && !videoShown)
  const soloOpen = lay.solo && !focus && !stand && !tidyNow
  const manualSplit = split && !posture.tabletop
  const playH = () => playRef.current?.clientHeight ?? 600
  const playW = () => playRef.current?.clientWidth ?? 900
  const cls = `play view-${view}${showVideo && doc.youtube ? ' has-video' : ''}${split ? ' tabletop' : ''}${manualSplit ? ' manual-split' : ''}` +
    `${sideOpen ? '' : ' side-closed'}${soloOpen ? '' : ' solo-closed'}${focus || stand || (tidyNow && !videoShown) ? ' focus' : ''}${stand ? ' stand' : ''}${bigView ? ' big' : ''}${tidyNow ? ' tidy' : ''}${lay.topH > 0 ? ' sized-top' : ''}${movingPane ? ` moving-${movingPane}` : ''}`
  // panels you moved: the grid in your order (not in the split/tabletop, stand or Full tab layouts)
  const own = !split && !stand && !focus
  const midRow = lay.sideLeft ? "'side sside body'" : "'body sside side'"
  const gridStyle: React.CSSProperties = !own ? {} : wide
    ? (lay.sideLeft || lay.soloTop ? {
      ...(lay.sideLeft ? { gridTemplateColumns: 'var(--side-col) auto minmax(0, 1fr)' } : {}),
      gridTemplateRows: lay.soloTop ? 'auto var(--solo-row) auto minmax(0, 1fr)' : 'auto minmax(0, 1fr) auto var(--solo-row)',
      gridTemplateAreas: lay.soloTop ? `'head head head' 'solo solo solo' 'ssolo ssolo ssolo' ${midRow}` : `'head head head' ${midRow} 'ssolo ssolo ssolo' 'solo solo solo'`,
    } : {})
    : order.join() !== ORDER0.join() ? (() => { const g = phoneGrid(order, view); return { gridTemplateRows: g.rows, gridTemplateAreas: g.areas } })() : {}
  return (
    <div ref={playRef} className={cls}
      style={{
        ...gridStyle,
        ['--tab-zoom' as string]: tabZoom, ['--side-w' as string]: `${lay.sideW}px`, ['--solo-h' as string]: `${lay.soloH}px`,
        ...(lay.topH > 0 ? { ['--top-h' as string]: `${lay.topH}px` } : {}),
        ...(split && posture.tabletop ? { ['--fold-top' as string]: `${posture.top}px`, ['--fold-hinge' as string]: `${posture.hinge}px` } : {}),
      }}>
      {ready.overlay}
      <header className="play-head">
        <div className="song-title">
          <button className="song-name" data-find="check" onClick={() => (checkOpen ? closeCheck() : setCheckOpen(true))} aria-expanded={checkOpen} title="Song check: chords, techniques, level and a speed to start at">
            <b>{doc.title}</b>
          </button>
          {doc.song.tracks.length > 1 ? (
            <select className="select sm" value={trackIdx} onChange={e => update({ track: Number(e.target.value), cursor: 0 })} aria-label="Track">
              {doc.song.tracks.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
            </select>
          ) : doc.artist ? <span className="small muted">{doc.artist}</span> : null}
        </div>
        <TempoBadge song={doc.song} onOpen={() => setTempoOpen(true)} />
        <button className="btn sm icon-btn" data-find="full" aria-pressed={focus} onClick={() => setLay({ ...lay, focus: !focus })}
          aria-label={focus ? 'Show all panels again' : 'Full tab: hide the other panels'} title={focus ? 'Show all panels again' : 'Full tab'}>
          {focus ? <IconShrink /> : <IconExpand />}
        </button>
        <button className="btn sm" data-find="game" aria-pressed={gameView === 'game'} onClick={() => setGameView(gameView === 'game' ? 'tab' : 'game')} title="Game: notes slide toward you on a highway, with points and stars" data-testid="game-toggle"><Ico n="game" /><span className="stand-label"> Game</span></button>
        {gameView === 'game'
          ? <button className="btn sm stand-btn" data-find="stand" onClick={() => setStand(true)} aria-label="Game full screen: only the game, with one bar of controls" title="Full screen" data-testid="game-full"><Ico n="expand" /><span className="stand-label"> Full screen</span></button>
          : <button className="btn sm stand-btn" data-find="stand" onClick={() => setStand(true)} aria-label="Music stand: just the tab, big, with big buttons" title="Music stand"><Ico n="music" /><span className="stand-label"> Stand</span></button>}
        <button className="btn sm" data-find="video" aria-pressed={doc.youtube ? showVideo : videoAsk} onClick={() => (doc.youtube ? setShowVideo(!showVideo) : setVideoAsk(!videoAsk))}>Video</button>
        {mode === 'time' ? (
          <button className={`btn listen${inTime.running ? ' on' : ''}`} data-find="listen" onClick={() => void toggleRun()} aria-pressed={inTime.running}>
            <span className="dot" /> {inTime.running ? 'Stop' : doc.ytSync && showVideo ? 'Start with video' : 'Start'}
          </button>
        ) : (
          <button className={`btn listen${listening ? ' on' : ''}`} data-find="listen" onClick={toggleListen} aria-pressed={listening}>
            <span className="dot" /> {listening ? 'Listening' : 'Listen'}
          </button>
        )}
        <LooperStrip />
      </header>

      <section className="play-side" ref={sideRef}>
        {/* stays mounted while hidden so a playing video keeps going */}
        {(doc.youtube ? showVideo : videoAsk) && <YouTubePlayer url={doc.youtube} onUrl={u => { update({ youtube: u, ytSync: u ? doc.ytSync : undefined }); if (u) setShowVideo(true); setVideoAsk(false) }} onApi={api => { video.current = api }}
          sync={doc.ytSync} onSync={sync => update({ ytSync: sync })} tabBpm={songBpm} noteSecs={noteSecs} />}
        {sideOpen && readout(false)}
        {sideOpen && micError && <p className="notice small">{micError}</p>}
      </section>

      <Splitter dir="row" className="split-top" name="the video and readout" open={sideOpen} onMoveStart={own ? e => startMove('side', e) : undefined}
        size={lay.topH || sideRef.current?.offsetHeight || 260} grow={sideAbove || !own ? 1 : -1} min={110} max={() => playH() - 220}
        target={() => playRef.current} cssVar="--top-h" onStart={() => playRef.current?.classList.add('sized-top')}
        onSize={px => setLay({ ...lay, topH: px, side: true, focus: false })}
        onOpen={o => setLay({ ...lay, side: o, focus: false })} closedLabel="Show video & readout" />

      <div className="view-switch">
        <Chips label="View" find="view" items={[{ id: 'tab', label: 'Tab' }, { id: 'solo', label: 'Scales & chords' }, { id: 'both', label: 'Both' }]} value={view} onChange={setView} />
      </div>

      <Splitter dir="col" className="split-side" name="the side panel" open={sideOpen} onMoveStart={own ? e => startMove('side', e) : undefined}
        size={lay.sideW} grow={lay.sideLeft && own ? 1 : -1} min={240} max={() => playW() - 340}
        target={() => playRef.current} cssVar="--side-w"
        onSize={px => setLay({ ...lay, sideW: px, side: true, focus: false })}
        onOpen={o => setLay({ ...lay, side: o, focus: false })} closedLabel="Video & readout" />

      <section className="play-tab">
        <LayoutHint text="Arrange this screen: drag the bars between the boxes (the video, the tab, Scales & chords) to make them bigger or smaller, drag ☰ Move on a bar to put that box somewhere else, drag one all the way closed or tap its arrow to hide it, and tap the bar again to bring it back." />
        {!sideOpen && readout(true)}
        {!sideOpen && micError && <p className="notice small">{micError}</p>}
        {tabTools}
        {nudge && mode === 'wait' && (
          <div className="notice nudge" role="status">
            <span><b>Clean run!</b> Next step: play it <b>In time</b>, with the beat. Start at ¾ speed{bandAvail ? ' with the band' : ''}.</span>
            <span className="row" style={{ flexWrap: 'nowrap', gap: 6 }}>
              <button className="btn sm primary" onClick={() => { setMode('time'); setSpeed(0.75); setNudge(false) }}>Try In time</button>
              <button className="btn sm ghost" aria-label="Not now" onClick={() => setNudge(false)}>✕</button>
            </span>
          </div>
        )}
        {report && gameView !== 'game' && (
          <ReportCard r={report} onClose={() => setReport(null)} onNext={() => {
            const r = report
            if (r.next.kind === 'loop' && r.loop) { setLoop(r.loop); if (r.next.speed) setSpeed(r.next.speed); countUse('play:report') }
            else if (r.next.kind === 'intime') { setMode('time'); setSpeed(r.next.speed ?? 0.75); restart(); countUse('play:report') }
            else if (r.next.kind === 'faster') { setSpeed(r.next.speed ?? 1); restart(); countUse('play:report') }
            else restart()
            setReport(null)
          }} onAgain={() => restart()} onThenNow={() => { if (doc) void thenNowFor(doc.id).then(p => { if (p) setTvn(p) }) }} />
        )}
        {take && !recording && (
          <div className="take-bar" role="group" aria-label="Your recording">
            <span className="small"><b>Your take</b> {Math.floor(take.seconds / 60)}:{String(Math.round(take.seconds % 60)).padStart(2, '0')}</span>
            <audio src={take.url} controls preload="metadata" />
            <button className="btn sm primary" disabled={take.kept} onClick={() => void keepRecording(take.blob, take.title, take.seconds).then(() => setTake(t => (t ? { ...t, kept: true } : t)))}>{take.kept ? '✓ In My recordings' : 'Keep it'}</button>
            <button className="btn sm" onClick={() => void saveTake(take.blob, take.title)}>Save a copy</button>
            <button className="btn sm ghost" aria-label="Delete this recording" onClick={() => { URL.revokeObjectURL(take.url); setTake(null) }}>✕</button>
          </div>
        )}
        {check?.tuning && retuneHidden !== doc.id && (
          <RetuneNotice check={check} current={inst.tuning.name.replace(/\s*\(.*\)$/, '')} onClose={() => setRetuneHidden(doc.id)}
            onTune={() => { if (check.tuning?.id) setTuning(inst.id, check.tuning.id); go('tuner') }}
            onAdapt={() => { update({ adapt: true }); countUse('play:adapt') }} />
        )}
        {(doc.adapt || doc.noCapo) && adaptNote.length > 0 && retuneHidden !== `a:${doc.id}` && (
          <div className="notice retune" role="status" data-testid="adapt-note">
            <span><b>{doc.adapt ? `Playing it in ${inst.tuning.name.replace(/\s*\(.*\)$/, '')}` : 'Playing it without the capo'}</b>: {adaptNote.join('; ')}.</span>
            <span className="row" style={{ flexWrap: 'nowrap', gap: 6 }}>
              <button className="btn sm" onClick={() => update({ adapt: false, noCapo: false })}>As written</button>
              <button className="btn sm ghost" onClick={() => setRetuneHidden(`a:${doc.id}`)} aria-label="Hide this">✕</button>
            </span>
          </div>
        )}
        {checkOpen && check && (
          <SongCheckCard check={check} speed={speed} onSpeed={v => { setSpeed(v); if (playAt >= 0) stopPreview() }}
            onLoopBar={b => { setLoop({ from: b, to: b }); closeCheck() }} onClose={closeCheck} />
        )}
        {selecting && (
          <div className="select-hint">
            <span>{selecting.first === undefined ? 'Tap the first bar of the part you want to loop.' : `Start: bar ${selecting.first + 1}. Now tap the last bar (or the same bar again).`}</span>
            <button className="btn sm" onClick={() => setSelecting(null)}>Cancel</button>
          </div>
        )}
        {gameView === 'game' ? (
          <GameView songId={doc.id} flat={flat} beatOf={gameBeats} hands={hands} stringNames={handNames} chordAt={gameChordAt}
            mode={mode} running={inTime.running} beatNow={gameBeatNow} timeFb={inTime.feedback} finished={gameDone}
            cursorFlat={cursorFlat} listening={listening} waitFb={gameWaitFb} states={states.current} version={version}
            spb={60 / (songBpm * (inTime.running ? inTime.speedNow() : speed))}
            autoSpeed={trainer.on && trainer.down !== undefined} speedPct={Math.round((inTime.running ? inTime.speedNow() : speed) * 100)}
            onAutoSpeed={on => setTrainer(on ? { on: true, start: Math.min(1, speed), step: 0.05, target: 1.25, pass: 90, down: 60, min: 0.25 } : { on: false, start: 0.6, step: 0.05, target: 1, pass: 90 })}
            onPlayFor={playFor}
            onPerfect={sec => { setLoop({ from: sec.fromBar, to: sec.toBar }); setMode('time'); setTrainer({ on: true, start: Math.min(1, Math.max(0.5, speed - 0.1)), step: 0.05, target: 1.25, pass: 90, down: 60, min: 0.25 }); setLoopBlink(b => ({ k: (b?.k ?? 0) + 1, text: `Perfect it: ${sec.name}. Press Start` })) }}
            onAgain={() => { restart(); if (mode === 'time') void toggleRun() }}
            along={mode === 'time' && (guide || withBand)} bandAvail={bandAvail}
            onAlong={on => { if (inTime.running) inTime.stop(); setGuide(on); if (bandAvail) setBandOn(on); if (on && mode !== 'time') setMode('time') }} />
        ) : <TabView track={track} mode={labelMode} flats={flats} cursor={inTime.running ? inTime.cursor : playAt >= 0 ? playAt : cursorFlat} playing={playAt >= 0 || inTime.running} states={states.current}
          flash={flash} loop={loop} selecting={!!selecting} onBar={onBar} version={version} spans={timeline.spans} onTap={onTap} zoom={stand ? standZoom : tabZoom} onZoom={stand ? setStandZoom : setTabZoom}
          meter={meter} counts={counts} strum={strumPat} marks={report?.bars} />}
        {/* the tab's zoom, right on the tab (pinch works too; Options → Size has the same) */}
        {gameView !== 'game' && !stand && (() => {
          const z = tabZoom, setZ = setTabZoom
          return (
            <div className="tab-zoom-ctl" role="group" aria-label="Tab size">
              <button className="gh-btn" onClick={() => setZ(Math.max(0.7, Math.round((z - 0.1) * 10) / 10))} aria-label="Smaller tab" data-testid="tab-zoom-out">−</button>
              <span className="gh-secs tabular">{Math.round(z * 100)}%</span>
              <button className="gh-btn" onClick={() => setZ(Math.min(2.4, Math.round((z + 0.1) * 10) / 10))} aria-label="Bigger tab" data-testid="tab-zoom-in">+</button>
            </div>
          )
        })()}
        {peek.bubble}
        {fingerBox}
        {inTime.running && inTime.countIn > 0 && <div className="count-big" key={inTime.countIn} role="status" aria-live="assertive" data-testid="count-big">{inTime.countIn}</div>}
        {loopBlink && <div className="loop-blink" key={loopBlink.k} role="status">{loopBlink.text}</div>}
        {bigView && (() => {
          const at = inTime.running ? inTime.cursor : playAt >= 0 ? playAt : cursorFlat
          const f = at >= 0 ? flat[at] : undefined
          const notes = f ? playable(f.step) : []
          const si = at >= 0 ? timeline.at[at] : -1
          const chordNow = (f?.step.chord ?? timeline.spans[si]?.name) || ''
          const chordNext = si >= 0 ? timeline.spans[si + 1]?.name ?? '' : ''
          const isChord = new Set(notes.map(n => n.midi % 12)).size >= 3
          const fbWait = mode === 'wait' && feedback ? (feedback.ok ? { ok: true, text: '✓ Got it' } : { ok: false, text: `✗ That was ${noteName(feedback.heard, flats)}` }) : null
          const fbTime = mode === 'time' && inTime.running && inTime.feedback
            ? { ok: inTime.feedback.j === 'perfect' || inTime.feedback.j === 'good', text: inTime.feedback.j === 'perfect' ? 'On time!' : inTime.feedback.j === 'good' ? 'Good' : inTime.feedback.j === 'miss' ? 'Missed one' : inTime.feedback.j === 'early' ? 'Early' : 'Late' }
            : null
          const fb = fbTime ?? fbWait
          return (
            <div className={`remote${fb ? (fb.ok ? ' fb-ok' : ' fb-bad') : ''}`} data-testid="remote" role="region" aria-label="Big view for the music stand">
              <div className="remote-top">
                <span className="remote-title">{doc.title}</span>
                <span className="remote-bar">{done && mode === 'wait' ? 'Finished!' : `Bar ${(f?.bar ?? 0) + 1} / ${track.bars.length}`}{loop ? ` · ⟲ ${loop.from === loop.to ? loop.from + 1 : `${loop.from + 1}–${loop.to + 1}`}` : ''}</span>
              </div>
              <div className="remote-main" key={fb ? `${fb.text}${feedback?.heard ?? ''}${inTime.feedback?.key ?? ''}` : 'x'}>
                {inTime.running && inTime.countIn > 0 ? <b className="remote-count">{inTime.countIn}</b>
                  : isChord || (chordNow && !notes.length) ? <>
                    <b className="remote-chord">{chordNow || 'Chord'}</b>
                    {isChord && <span className="remote-sub">strum it</span>}
                  </> : notes.length ? <>
                    <b className="remote-fret">{notes.map(n => n.fret).join(' · ')}</b>
                    <span className="remote-sub">{notes.map(n => `${stringLabel(track.tuning, n.string, flats)} string = ${noteName(n.midi, flats)}`).join(', ')}</span>
                  </> : <b className="remote-chord">{done ? '✓' : '–'}</b>}
                {fb && <span className={`remote-fb ${fb.ok ? 'ok' : 'bad'}`}>{fb.text}</span>}
              </div>
              {(chordNow || chordNext) && !isChord && <div className="remote-chords">{chordNow && <span>Chord <b>{chordNow}</b></span>}{chordNext && <span>next <b>{chordNext}</b></span>}</div>}
              {isChord && chordNext && <div className="remote-chords"><span>next <b>{chordNext}</b></span></div>}
              <div className="remote-btns">
                {mode === 'time' ? (
                  <button className={`remote-go${inTime.running || ready.counting ? ' on' : ''}`} onClick={() => void toggleRun()} aria-pressed={inTime.running}>{inTime.running || ready.counting ? <><Ico n="stop" fill /> Stop</> : <><Ico n="play" fill /> Start</>}</button>
                ) : (
                  <button className={`remote-go${listening ? ' on' : ''}`} onClick={() => void toggleListen()} aria-pressed={listening}>{listening ? <><Ico n="stop" fill /> Stop</> : <><Ico n="play" fill /> Listen</>}</button>
                )}
                <div className="remote-row">
                  <button className={`remote-b remote-loop${loop ? ' on' : ''}`} onClick={() => { if (loop) setLoop(undefined); else { const b = f?.bar ?? 0; setLoop({ from: b, to: b }) } }} aria-pressed={!!loop}
                    aria-label={loop ? 'Stop looping' : 'Loop the bar you are on'}><Ico n="loop" /> {loop ? 'Off' : 'Loop'}</button>
                  <button className="remote-b" onClick={() => { setSpeed(Math.max(0.25, Math.round((speed - 0.05) * 20) / 20)); if (playAt >= 0) stopPreview() }} aria-label="Slower">−</button>
                  <b className="remote-speed" aria-label="Speed">{Math.round(speed * 100)}%</b>
                  <button className="remote-b" onClick={() => { setSpeed(Math.min(1.5, Math.round((speed + 0.05) * 20) / 20)); if (playAt >= 0) stopPreview() }} aria-label="Faster">+</button>
                  <button className="remote-b" onClick={() => (inTime.running ? (inTime.stop(), inTime.start()) : restart())} aria-label="Back to the start"><Ico n="back" /></button>
                </div>
                <div className="remote-row remote-small">
                  <button className="remote-b" onClick={() => setStandView('tab')}>Show the tab</button>
                  <button className="remote-b" onClick={() => setStand(false)} aria-label="Leave music stand">✕ Done</button>
                </div>
              </div>
            </div>
          )
        })()}
        {stand && !bigView && (
          <div className={`stand-bar${gameView === 'game' ? ' game' : ''}`} role="toolbar" aria-label={gameView === 'game' ? 'Game controls' : 'Music stand controls'} data-testid="stand-bar">
            {mode === 'time' ? (
              <button className={`stand-go${inTime.running || ready.counting ? ' on' : ''}`} onClick={() => void toggleRun()} aria-pressed={inTime.running}>{inTime.running || ready.counting ? <><Ico n="stop" fill /> Stop</> : <><Ico n="play" fill /> Start</>}</button>
            ) : (
              <button className={`stand-go${listening ? ' on' : ''}`} onClick={() => void toggleListen()} aria-pressed={listening}>{listening ? <><Ico n="stop" fill /> Stop</> : <><Ico n="play" fill /> Listen</>}</button>
            )}
            <button className={`stand-b${loop ? ' on' : ''}`} onClick={() => { if (loop) setLoop(undefined); else { const b = cursorFlat >= 0 ? flat[cursorFlat].bar : 0; setLoop({ from: b, to: b }) } }} aria-pressed={!!loop}
              aria-label={loop ? 'Stop looping' : 'Loop the bar you are on'}><Ico n="loop" /> <span className="stand-lbl">{loop ? `${loop.from === loop.to ? `Bar ${loop.from + 1}` : `${loop.from + 1}–${loop.to + 1}`} ✕` : 'Loop bar'}</span></button>
            <span className="stand-speed" role="group" aria-label="Speed">
              <button className="stand-b" onClick={() => { setSpeed(Math.max(0.25, Math.round((speed - 0.05) * 20) / 20)); if (playAt >= 0) stopPreview() }} aria-label="Slower">−</button>
              <b>{Math.round(speed * 100)}%</b>
              <button className="stand-b" onClick={() => { setSpeed(Math.min(1.5, Math.round((speed + 0.05) * 20) / 20)); if (playAt >= 0) stopPreview() }} aria-label="Faster">+</button>
            </span>
            <button className="stand-b stand-back" onClick={() => (inTime.running ? (inTime.stop(), inTime.start()) : restart())} aria-label="Back to the start"><Ico n="back" /></button>
            {gameView === 'game' ? (
              <>
                <button className="stand-b" onClick={() => setMode(mode === 'time' ? 'wait' : 'time')} disabled={inTime.running || listening}
                  aria-label={mode === 'time' ? 'In time: switch to Wait for me' : 'Wait for me: switch to In time'} data-testid="game-full-mode">{mode === 'time' ? 'In time' : 'Wait'}</button>
                <button className="stand-b" onClick={() => setOpts(true)} aria-label="Options: speed, sound, song plays along, click" data-testid="game-full-opts"><IconSliders /></button>
              </>
            ) : <button className="stand-b" onClick={() => setStandView('big')} aria-label="Big view: the note or chord, huge">Big</button>}
            <button className="stand-b stand-x" onClick={() => setStand(false)} aria-label={gameView === 'game' ? 'Leave full screen' : 'Leave music stand'}>✕</button>
          </div>
        )}
        {track.capo > 0 && <p className="small muted cap">Capo on fret {track.capo}: frets are counted from the capo.</p>}
        {track.tuning.length !== inst.strings && (
          <p className="small muted cap">This tab is for a {track.tuning.length}-string instrument; you're in {inst.label.toLowerCase()} mode. Pick a {inst.strings}-string tab from Songs to play along on your {inst.noun}.</p>
        )}
      </section>

      <Splitter dir="row" className="split-solo" name="Scales & chords" open={wide ? soloOpen : true} onMoveStart={own ? e => startMove('solo', e) : undefined}
        size={lay.soloH} grow={own && (wide ? lay.soloTop : soloAbove) ? 1 : -1} min={110} max={() => playH() - 240}
        target={() => playRef.current} cssVar="--solo-h"
        onSize={px => setLay({ ...lay, soloH: px, solo: true, focus: false })}
        onOpen={o => { if (wide) setLay({ ...lay, solo: o, focus: false }); else if (!o) setView('tab') }} closedLabel="Scales & chords" />

      <section className="play-solo">
        <HarmonyPanel
          beatsToNext={beatsToNextChord}
          tuning={tuning}
          keyGuess={key}
          keyIsAuto={!doc.key}
          detected={detected}
          tips={tips}
          flats={flats}
          spans={timeline.spans}
          curSpan={(inTime.running || playAt >= 0) && liveSpan >= 0 ? liveSpan : curSpan}
          expected={expected.map(n => ({ ...n }))}
          nearFrets={nearFrets}
          hand={hand ? { notes: hand.notes, base: hand.base, open: hand.open } : null}
          compact
          onKey={k => update({ key: k ?? undefined })}
          onEditChord={(bar, name) => {
            const chords = { ...(doc.chords ?? {}) }
            if (name === null) delete chords[bar]
            else chords[bar] = name
            update({ chords })
          }}
        />
      </section>

      {gearOpen && <GearSetup onClose={() => setGearOpen(false)} />}
      {optionsPanel}
      {tempoOpen && doc && <TempoSheet song={doc.song} fileTempo={doc.song.fileTempo} beatsPerBar={meter} onChange={changeTempo} onClose={() => setTempoOpen(false)} />}
      {tvn && (
        <div className="sheet-backdrop" onClick={() => setTvn(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Then vs now" onClick={e => e.stopPropagation()}>
            <div className="sheet-head"><h2>Then vs now: {tvn.title}</h2><button className="btn sm" onClick={() => setTvn(null)}>Done</button></div>
            <ThenVsNow pair={tvn} />
          </div>
        </div>
      )}
    </div>
  )
}

/** After a whole run: the score, how it compares, the bars that went wrong (lit up on the tab) and one next step. */
function ReportCard({ r, onNext, onAgain, onClose, onThenNow }: { r: Report & { take?: 'first' | 'now' }; onNext: () => void; onAgain: () => void; onClose: () => void; onThenNow: () => void }) {
  const diff = r.prev !== undefined ? r.score - r.prev : null
  const t = r.timing
  const tone = r.score >= 90 ? 'great' : r.score >= 75 ? 'good' : r.score >= 50 ? 'ok' : 'low'
  return (
    <div className={`report-card ${tone}`} role="status" aria-label="How that run went" data-testid="report-card">
      <div className="report-score" style={{ ['--p' as string]: r.score }}><b>{r.score}</b><small>%</small></div>
      <div className="report-body">
        <b className="report-head">{r.headline}</b>
        <span className="small">
          {diff === null ? 'Your first full run of this one.' : diff > 0 ? `${diff} better than last time.` : diff < 0 ? `${-diff} under last time: that happens.` : 'Same as last time.'}
          {r.best > r.score ? ` Best ${r.best}%.` : diff !== null && diff > 0 ? ' Your best yet.' : ''}
          {r.mode === 'time' && r.speed !== 1 ? ` At ${Math.round(r.speed * 100)}% speed.` : ''}
        </span>
        {t && <span className="small muted">{t.onTime} on time, {t.early} early, {t.late} late, {t.missed} missed.{Math.abs(t.meanErr) >= 25 ? (t.meanErr < 0 ? ' You rush a little.' : ' You drag a little.') : ''}</span>}
        {r.bars.length > 0 && <span className="small"><span className="report-swatch" aria-hidden /> Trouble: {r.bars.length === 1 ? `bar ${r.bars[0] + 1}` : `bars ${r.bars[0] + 1} and ${r.bars[1] + 1}`} (marked on the tab).</span>}
        {r.take === 'first' && <span className="small muted">Your first try is kept on this phone for Then vs now.</span>}
        <span className="report-btns">
          <button className="btn primary" onClick={onNext}>{r.next.label}</button>
          {r.take === 'now' && <button className="btn tvn-btn" onClick={onThenNow} data-testid="tvn-open"><Ico n="headphones" /> Then vs now</button>}
          {r.next.kind !== 'again' && r.next.kind !== 'learned' && <button className="btn" onClick={onAgain}>Play again</button>}
        </span>
      </div>
      <button className="btn sm ghost report-x" onClick={onClose} aria-label="Close">✕</button>
    </div>
  )
}

/** After tapping a note: which finger plays it (tap another to choose your own), and the same note on other strings. */
function NoteHandEdit({ note, finger, spots, onFinger, onMove }: { note: SongNote; finger: number; spots: { string: number; fret: number }[]; onFinger: (f: number) => void; onMove: (s: { string: number; fret: number }) => void }) {
  if (note.fret === 0 && !spots.length) return null
  return (
    <span className="note-edit" role="group" aria-label="Your fingering for this note">
      {note.fret > 0 && <>
        <span className="small muted">Finger</span>
        {[1, 2, 3, 4].map(f => <button key={f} className={`chip sm-chip fing-${f}`} aria-pressed={finger === f} onClick={() => onFinger(f)} aria-label={`Play it with finger ${f}`}>{f}</button>)}
      </>}
      {spots.length > 0 && <button className="btn sm ghost" onClick={() => onMove(spots[0])} title="Play the same note on another string">Other string ({spots[0].fret === 0 ? 'open' : `fret ${spots[0].fret}`})</button>}
    </span>
  )
}

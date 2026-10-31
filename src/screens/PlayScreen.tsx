// Play along: the tab, a YouTube mini player, the mic following your playing note by note,
// and the scales / chords of the song for soloing.
import { micWhere } from '../audio/input'
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
import { chordInfo, chordTimeline, guessBarChords } from '../tabs/harmony'
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
import { recordRun } from '../play/songStats'
import { useFoldPosture } from '../play/fold'
import type { VideoApi } from '../play/inTime'
import { exampleDoc } from '../tabs/examples'
import { playNote, strum, SOUNDS, activeSound, onSoundChange, setSoundChoice, soundChoice, soundForProgram, soundInfo, loadSound, soundLoaded, type SoundId } from '../audio/pluck'
import { audio, keepAwake } from '../audio/engine'
import { TabPlayer } from '../audio/tabPlayer'
import { keyPrefersFlats, pcName } from '../theory/notes'
import { setTuning, useInstrument } from '../instrument'
import { Splitter } from '../components/Splitter'
import { LayoutHint } from '../components/Win'
import { onLeavePage } from '../audio/stopAll'
import { HandShape } from '../components/HandShape'
import { groupAt, handGroups } from '../play/handShape'
import { IconExpand, IconShrink, IconSliders } from '../components/Icons'
import { setPlayFocus, useMedia } from '../ui'
import { checkSong } from '../play/songCheck'
import { chordHelp } from '../play/chordHelp'
import { patternsFor, strumPattern } from '../play/strumCoach'
import { TakeRecorder, saveTake } from '../audio/takeRecorder'
import { keepRecording } from '../audio/recordings'
import { bandByStep, bandEvents, hasBand } from '../audio/band'
import { SongCheckCard, RetuneNotice } from '../components/SongCheckCard'
import { profile } from '../learn/profile'
import { Zoomable } from '../components/Zoomable'
import { useScreenInfo } from '../assistant/screen'
import { talkingNow } from '../assistant/listen'


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

export function PlayScreen() {
  const inst = useInstrument()
  // each instrument remembers its own last song (guitar and ukulele tabs are kept apart)
  const [songId, setSongId] = usePersist(`playSong:${inst.id}`, '')
  const [doc, setDoc] = useState<SongDoc | null>(null)
  /** the Options panel (everything that isn't Wait/In time, Loop and Hear it) */
  const [opts, setOpts] = useState(false)
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
  const [handOn, setHandOn] = usePersist('handGuide', true)
  const [layRaw, setLay] = usePersist<PlayLayout>('playLayout', LAYOUT0)
  const lay = { ...LAYOUT0, ...layRaw }
  const wide = useMedia('(min-width: 760px)')
  const playRef = useRef<HTMLDivElement>(null)
  const sideRef = useRef<HTMLElement>(null)
  const focus = lay.focus
  useEffect(() => { setPlayFocus(focus); return () => setPlayFocus(false) }, [focus])
  const lastOnset = useRef(0)
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState('')
  /** after a clean Wait-for-me run: suggest In time */
  const [nudge, setNudge] = useState(false)
  const [live, setLive] = useState<number | null>(null)
  const [input, setInput] = useState<{ label: string; external: boolean } | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const lastMiss = useRef<{ heard: number; want: number[]; bar: number; chordText?: string } | null>(null)
  const [inspect, setInspect] = useState<SongNote | null>(null)
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
  const track = doc?.song.tracks[trackIdx] ?? null
  docRef.current = doc
  const flat = useMemo(() => (track ? flatten(track) : []), [track])
  // press a chord name (tab or chord strip) to peek at its shape without stopping anything
  const peek = useChordPeek(playRef, inst, fi => {
    const st = flat[fi]?.step
    if (!st || !track) return null
    const ns = st.notes.filter(n => n.tech !== 'x')
    return ns.length >= 3 ? track.tuning.map((_, s) => ns.find(n => n.string === s)?.fret ?? -1) : null
  }, !!doc && !!track)
  const hands = useMemo(() => handGroups(flat), [flat])
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
  const ref = useRef({ pos, follow, strict, flat, loopRange, lesson: false, flats: false, doc: null as SongDoc | null, loop: null as { from: number; to: number } | null })
  ref.current = { pos, follow, strict, flat, loopRange, lesson: doc?.source === 'lesson', flats, doc, loop: doc?.loop ?? null }
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
    if (!d) return
    const miss: Record<number, number> = {}, hit: Record<number, number> = {}
    states.current.forEach((st, i) => {
      const b = flat[i]?.bar
      if (b === undefined || (bars && (b < bars[0] || b > bars[1]))) return
      if (st === 1) hit[b] = (hit[b] ?? 0) + 1
      else if (st === 2 || st === 3) miss[b] = (miss[b] ?? 0) + 1
    })
    recordRun(d.id, { title: d.title, inst: docInstrument(d) }, { score, mode: runMode, speed: speedNow, full, bars }, { miss, hit })
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
        if (n) saveRun(sc, 'wait', 1, follow.idx.length > 0 && n >= follow.idx.length * 0.8)
        // a clean run while waiting for you: time to try it in time
        if (n && sc >= 85) setNudge(true)
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
    setFeedback({ ok: false, heard, chordText, chordHelp: help })
    setPulse(p => ({ ok: false, key: (p?.key ?? 0) + 1 }))
    setVersion(v => v + 1)
  }, [])

  /** Wait-for-me mode: a single note was heard. */
  const onNote = useCallback((midi: number) => {
    const { pos, follow, strict, loopRange } = ref.current
    // strummed chords are checked by onChord (the whole chord), not by one note
    if (follow.steps[pos]?.chord) return
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
    if (chordMatch(chroma, pcs).ok) hitAt(pos, 0, want.midis[0], top.join(' '))
    else {
      // say which string or chord note didn't come out
      const fi = follow.idx[pos]
      const notes = fi !== undefined ? ref.current.flat[fi]?.step.notes ?? [] : []
      const tuning = ref.current.doc?.song.tracks[ref.current.doc?.track ?? 0]?.tuning ?? []
      const help = notes.length ? chordHelp(chroma, notes, tuning, pcv => noteName(pcv, ref.current.flats)).text : undefined
      missAt(want.midis[0], top.join(', '), help)
    }
  }, [hitAt, missAt])

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
      setMicError(`KGuitar needs microphone access to hear your guitar (this also covers a USB amp like the Amphonix or an audio interface). Allow it ${micWhere()}, then try again.`)
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
  const bandAvail = !!doc && !!track && hasBand(doc.song, trackIdx)
  const bandEv = useMemo(() => (doc && bandAvail ? bandEvents(doc.song, trackIdx) : []), [doc?.song, trackIdx, bandAvail]) // eslint-disable-line react-hooks/exhaustive-deps
  const bandSteps = useMemo(() => bandByStep(bandEv, flat), [bandEv, flat])
  const withBand = bandOn && bandAvail
  const inTime = useInTime({
    band: withBand ? bandEv : undefined,
    strum: strumPat, meter,
    flat, loop: loop, startFlat: withBand && pos === 0 ? 0 : cursorFlat >= 0 ? cursorFlat : 0, songBpm, speed, click, guide, sound: hearSound, strict, trainer, video,
    sync: showVideo ? doc?.ytSync : undefined, states,
    latencyMs: () => latencyMs(kindOf(listener.current?.external)),
    onExpect: (now, next) => listener.current?.expect(now, next),
    onChange: () => setVersion(v => v + 1),
    onHitNote: () => bumpCounts({ notesHit: 1, [doc?.source === 'lesson' ? 'exerciseNotes' : 'songNotes']: 1 }),
    onPass: (s, sp) => { if (s.score >= 90) bump('loop90'); if (loop) saveRun(s.score, 'time', sp, false, [loop.from, loop.to]) },
    onFinish: s => {
      if (s.score >= 60) bump(doc?.source === 'lesson' ? 'exercisesFinished' : 'songsFinished')
      saveRun(s.score, 'time', speed, !loop && s.total > 0, loop ? [loop.from, loop.to] : undefined)
    },
  })
  // a quick "again" flash on the tab each time the loop goes round (Wait for me and In time)
  useEffect(() => { if (passes.n > 0) setLoopBlink(b => ({ k: (b?.k ?? 0) + 1, text: `⟲ Again${passes.last !== null ? ` · last time ${passes.last}%` : ''}` })) }, [passes.n]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (inTime.wraps > 0 && inTime.running) setLoopBlink(b => ({ k: (b?.k ?? 0) + 1, text: `⟲ Again${inTime.pass.last ? ` · last time ${inTime.pass.last.score}%` : ''}` })) }, [inTime.wraps]) // eslint-disable-line react-hooks/exhaustive-deps
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
    if (!listening) await toggleListen()
    // a few seconds to get your hands on the guitar, then the count-in bar
    ready.start(() => inTime.start())
  }
  useEffect(() => { if (mode === 'wait') inTime.stop() }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

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
    video: () => { const v = video.current; if (v) (v.playing() ? v.pause() : v.play()) },
  })
  const [loadingSnd, setLoadingSnd] = useState(false)
  function preview(loaded = false) {
    if (playAt >= 0) { stopPreview(); return }
    if (loadingSnd) return
    // the guitar's recorded sounds aren't in yet: say so on the button, then start
    if (!loaded && !soundLoaded(hearSound)) {
      setLoadingSnd(true)
      void loadSound(hearSound).catch(() => {}).finally(() => { setLoadingSnd(false); preview(true) })
      return
    }
    if (listening) void toggleListen()
    const p = (player.current ??= new TabPlayer())
    p.sound = hearSound
    p.band = withBand ? bandSteps : undefined
    p.strum = strumPat ? { hits: strumPat.hits, offs: stepOffs } : undefined
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
    states.current = new Uint8Array(flat.length)
    setPos(from)
    setFeedback(null)
    setVersion(v => v + 1)
  }

  // ---------- practice loop ----------
  function setLoop(l: { from: number; to: number } | undefined) {
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

  // ---- Back: stop picking loop bars, close the song check, leave Full tab
  useBack(!!selecting, () => setSelecting(null))
  useBack(checkOpen, () => closeCheck())
  useBack(focus, () => setLay({ ...lay, focus: false }))
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
  const handView = (mini: boolean) => (handOn && hand && hand.notes.some(n => n.fret > 0) ? (
    <HandShape group={hand} next={handNext} moveSoon={handLeft <= 2} expected={expected} nStr={track.tuning.length} stringNames={strNames} compact={mini} />
  ) : null)
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
            <button className="btn sm" onClick={() => restart()}>Play again</button>
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
                <button className="btn sm ghost" onClick={hearNext} aria-label="Hear the chord">▶</button>
              </span>
            ) : (
              <span className="next-notes">
                {expected.map((n, i) => (
                  <span key={i} className="nn"><b>{n.fret}</b> on {stringLabel(track.tuning, n.string, flats)} = <b className="amber">{noteName(n.midi, flats)}</b></span>
                ))}
                <button className="btn sm ghost" onClick={hearNext} aria-label="Hear the next note">▶</button>
              </span>
            )}
            {feedback && (
              feedback.ok ? (
                <span className="fb ok">✓ Got it: {feedback.chordText ? `the chord (${feedback.chordText})` : noteName(feedback.heard, flats)}{feedback.note ? ` · ${where(feedback.note)}` : ''}{feedback.skipped ? ` (skipped ${feedback.skipped})` : ''}</span>
              ) : feedback.chordText ? (
                <span className="fb bad">✗ {feedback.chordHelp ?? <>Heard mostly {feedback.chordText}: the chord needs {[...new Set(expected.map(n => noteName(n.midi, flats)))].join(' ')}. Strum all the strings and let them ring.</>}</span>
              ) : (
                <span className="fb bad">✗ You played {noteName(feedback.heard, flats)}{octave(feedback.heard)}: the tab wants {expected.map(n => noteName(n.midi, flats)).join(' or ')}</span>
              )
            )}
            {!feedback && inspect && (
              <span className="fb">{inspect.tech === 'x' ? 'Muted note (x): no pitch.' : `That ${inspect.fret} is ${noteName(inspect.midi, flats)}${octave(inspect.midi)} · ${where(inspect)}`}</span>
            )}
          </>
        )}
      </div>
      {handView(mini)}
    </div>
  )

  const tabTools = (
    <div className="tab-tools" role="toolbar" aria-label="Play controls">
      <Chips label="Follow mode" find="mode" items={[{ id: 'wait', label: 'Wait for me' }, { id: 'time', label: 'In time' }]} value={mode} onChange={v => setMode(v)} />
      {loop ? (
        <span className="loop-chip" data-find="loop">⟲ {loop.from === loop.to ? `Bar ${loop.from + 1}` : `Bars ${loop.from + 1}–${loop.to + 1}`}<button onClick={() => setLoop(undefined)} aria-label="Stop looping">✕</button></span>
      ) : (
        <button className="btn sm" data-find="loop" aria-pressed={!!selecting} onClick={() => setSelecting(selecting ? null : {})}>⟲ Loop</button>
      )}
      <button className={`btn sm hear${playAt >= 0 ? ' on' : ''}${loadingSnd ? ' loading' : ''}`} data-find="hear" onClick={() => preview()} aria-pressed={playAt >= 0} aria-busy={loadingSnd}>
        {loadingSnd ? <><span className="spin" aria-hidden />Loading sounds…</> : playAt >= 0 ? '■ Stop' : '▶ Hear it'}
      </button>
      {recording && (
        <button className="btn sm rec on" aria-pressed onClick={() => void toggleRec()} aria-label="Stop recording">⏹ {Math.floor(recSecs / 60)}:{String(recSecs % 60).padStart(2, '0')}</button>
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
              <span><b>🥁 Play with the band</b><span className="small muted">{doc.song.backing ? 'Drums and bass from the chords' : 'The drums, bass and other parts of this song'}, with Hear it and In time.</span></span>
            </label>
          )}
          {mode === 'time' && (
            <>
              <label className="opt-row opt-check" data-find="click"><input type="checkbox" checked={click} onChange={() => setClick(!click)} /><span><b>Click</b><span className="small muted">A metronome click while you play in time.</span></span></label>
              <label className="opt-row opt-check" data-find="guide"><input type="checkbox" checked={guide} onChange={() => setGuide(!guide)} /><span><b>Hear the tab too</b><span className="small muted">The tab plays quietly along with you.</span></span></label>
              {loop && <label className="opt-row opt-check" data-find="trainer"><input type="checkbox" checked={trainer.on} onChange={() => setTrainer({ ...trainer, on: !trainer.on })} /><span><b>Speed trainer</b><span className="small muted">Starts at {Math.round(trainer.start * 100)}% and speeds up {Math.round(trainer.step * 100)}% after each pass of {trainer.pass}% or better.</span></span></label>}
            </>
          )}
          <button className={`btn rec${recording ? ' on' : ''}`} data-find="record" onClick={() => { void toggleRec(); setOpts(false) }}>
            {recording ? `⏹ Stop recording (${Math.floor(recSecs / 60)}:${String(recSecs % 60).padStart(2, '0')})` : '⏺ Record yourself'}
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
          <label className="opt-row opt-check" data-find="hand"><input type="checkbox" checked={handOn} onChange={() => setHandOn(!handOn)} /><span><b>✋ Where your fingers go</b><span className="small muted">A small neck with finger numbers for the part you're on.</span></span></label>
          <div className="opt-row" data-find="size"><span className="opt-name">Size</span>
            <span className="zoom-btns" role="group" aria-label="Tab size">
              <button className="btn sm" onClick={() => setTabZoom(z => Math.max(0.7, Math.round((z - 0.1) * 10) / 10))} aria-label="Smaller tab">A−</button>
              <span className="small muted zoom-val">{Math.round(tabZoom * 100)}%</span>
              <button className="btn sm" onClick={() => setTabZoom(z => Math.min(2.4, Math.round((z + 0.1) * 10) / 10))} aria-label="Bigger tab">A+</button>
            </span>
            <span className="small muted">or pinch the tab</span>
          </div>
          <label className="opt-row opt-check" data-find="split"><input type="checkbox" checked={split} onChange={() => setSplitPref(split ? 'off' : 'on')} /><span><b>Split screen</b><span className="small muted">Video and readout on top, the tab below (automatic when the Fold is half-folded).</span></span></label>
        </section>

        <section className="opt-group" aria-label="Listening">
          <h3>Listening</h3>
          <label className="opt-row opt-check" data-find="octave"><input type="checkbox" checked={strict} onChange={() => setStrict(!strict)} /><span><b>Exact octave</b><span className="small muted">Only count the note in the octave the tab shows.</span></span></label>
          <label className="opt-row" data-find="sensitivity" title="How easily a sound counts as a note. Set it properly in Set up input."><span className="opt-name">Sensitivity</span>
            <input type="range" min={0.4} max={3} step={0.05} value={3.4 - gate} aria-label="Note sensitivity"
              onChange={e => { const g = Math.round((3.4 - Number(e.target.value)) * 100) / 100; setGear(gearKind, { gate: g }); if (listener.current) listener.current.gate = g }} />
          </label>
          <div className="row">
            <button className="btn sm" data-find="setup" onClick={() => { setOpts(false); setGearOpen(true) }}>{isSetUp() ? 'Set up input again' : 'Set up your input (2 min)'}</button>
            <button className="btn sm" data-find="restart" onClick={() => { restart(); setOpts(false) }}>Start over</button>
          </div>
        </section>
      </div>
    </div>
  )

  const sideOpen = lay.side && !focus
  const soloOpen = lay.solo && !focus
  const manualSplit = split && !posture.tabletop
  const playH = () => playRef.current?.clientHeight ?? 600
  const playW = () => playRef.current?.clientWidth ?? 900
  const cls = `play view-${view}${showVideo && doc.youtube ? ' has-video' : ''}${split ? ' tabletop' : ''}${manualSplit ? ' manual-split' : ''}` +
    `${sideOpen ? '' : ' side-closed'}${soloOpen ? '' : ' solo-closed'}${focus ? ' focus' : ''}${lay.topH > 0 ? ' sized-top' : ''}`
  return (
    <div ref={playRef} className={cls}
      style={{
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
        <button className="btn sm icon-btn" data-find="full" aria-pressed={focus} onClick={() => setLay({ ...lay, focus: !focus })}
          aria-label={focus ? 'Show all panels again' : 'Full tab: hide the other panels'} title={focus ? 'Show all panels again' : 'Full tab'}>
          {focus ? <IconShrink /> : <IconExpand />}
        </button>
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
      </header>

      <section className="play-side" ref={sideRef}>
        {/* stays mounted while hidden so a playing video keeps going */}
        {(doc.youtube ? showVideo : videoAsk) && <YouTubePlayer url={doc.youtube} onUrl={u => { update({ youtube: u, ytSync: u ? doc.ytSync : undefined }); if (u) setShowVideo(true); setVideoAsk(false) }} onApi={api => { video.current = api }}
          sync={doc.ytSync} onSync={sync => update({ ytSync: sync })} tabBpm={songBpm} />}
        {sideOpen && readout(false)}
        {sideOpen && micError && <p className="notice small">{micError}</p>}
      </section>

      <Splitter dir="row" className="split-top" name="the video and readout" open={sideOpen}
        size={lay.topH || sideRef.current?.offsetHeight || 260} grow={1} min={110} max={() => playH() - 220}
        target={() => playRef.current} cssVar="--top-h" onStart={() => playRef.current?.classList.add('sized-top')}
        onSize={px => setLay({ ...lay, topH: px, side: true, focus: false })}
        onOpen={o => setLay({ ...lay, side: o, focus: false })} closedLabel="Show video & readout" />

      <div className="view-switch">
        <Chips label="View" find="view" items={[{ id: 'tab', label: 'Tab' }, { id: 'solo', label: 'Scales & chords' }, { id: 'both', label: 'Both' }]} value={view} onChange={setView} />
      </div>

      <Splitter dir="col" className="split-side" name="the side panel" open={sideOpen}
        size={lay.sideW} grow={-1} min={240} max={() => playW() - 340}
        target={() => playRef.current} cssVar="--side-w"
        onSize={px => setLay({ ...lay, sideW: px, side: true, focus: false })}
        onOpen={o => setLay({ ...lay, side: o, focus: false })} closedLabel="Video & readout" />

      <section className="play-tab">
        <LayoutHint text="Make room on this screen: drag the bars between the boxes (the video, the tab, Scales & chords) to make them bigger or smaller, drag one all the way closed or tap its arrow to hide it, and tap the bar again to bring it back." />
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
            onTune={() => { if (check.tuning?.id) setTuning(inst.id, check.tuning.id); go('tuner') }} />
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
        <TabView track={track} mode={labelMode} flats={flats} cursor={inTime.running ? inTime.cursor : playAt >= 0 ? playAt : cursorFlat} playing={playAt >= 0 || inTime.running} states={states.current}
          flash={flash} loop={loop} selecting={!!selecting} onBar={onBar} version={version} spans={timeline.spans} onTap={onTap} zoom={tabZoom} onZoom={setTabZoom}
          meter={meter} counts={counts} strum={strumPat} />
        {peek.bubble}
        {inTime.running && inTime.countIn > 0 && <div className="count-big" key={inTime.countIn} role="status" aria-live="assertive" data-testid="count-big">{inTime.countIn}</div>}
        {loopBlink && <div className="loop-blink" key={loopBlink.k} role="status">{loopBlink.text}</div>}
        {track.capo > 0 && <p className="small muted cap">Capo on fret {track.capo}: frets are counted from the capo.</p>}
        {track.tuning.length !== inst.strings && (
          <p className="small muted cap">This tab is for a {track.tuning.length}-string instrument; you're in {inst.label.toLowerCase()} mode. Pick a {inst.strings}-string tab from Songs to play along on your {inst.noun}.</p>
        )}
      </section>

      <Splitter dir="row" className="split-solo" name="Scales & chords" open={wide ? soloOpen : true}
        size={lay.soloH} grow={-1} min={110} max={() => playH() - 240}
        target={() => playRef.current} cssVar="--solo-h"
        onSize={px => setLay({ ...lay, soloH: px, solo: true, focus: false })}
        onOpen={o => { if (wide) setLay({ ...lay, solo: o, focus: false }); else if (!o) setView('tab') }} closedLabel="Scales & chords" />

      <section className="play-solo">
        <HarmonyPanel
          tuning={tuning}
          keyGuess={key}
          keyIsAuto={!doc.key}
          detected={detected}
          tips={tips}
          flats={flats}
          spans={timeline.spans}
          curSpan={curSpan}
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
    </div>
  )
}

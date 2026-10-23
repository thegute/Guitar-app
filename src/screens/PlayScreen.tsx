// Play along: the tab, a YouTube mini player, the mic following your playing note by note,
// and the scales / chords of the song for soloing.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TabView, type LabelMode } from '../components/TabView'
import { ChordDiagram } from '../components/ChordDiagram'
import { YouTubePlayer } from '../components/YouTubePlayer'
import { HarmonyPanel, stringLabel } from '../components/HarmonyPanel'
import { Chips, usePersist } from '../components/Controls'
import { SongsSheet } from './SongsSheet'
import { InputPicker } from '../components/InputPicker'
import { NoteListener, matchNote, type FollowStep } from '../tabs/follow'
import { defaultTrack, flatten, playable, type SongNote, type SongTrack } from '../tabs/model'
import { detectKey, improvisationScales, type KeyGuess } from '../tabs/keyDetect'
import { chordInfo, chordTimeline, guessBarChords } from '../tabs/harmony'
import { docInstrument, getSong, listSongs, saveSong, type SongDoc } from '../tabs/library'
import { onOpenSong, takePendingDoc } from '../nav'
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
import { playNote, strum } from '../audio/pluck'
import { audio, keepAwake } from '../audio/engine'
import { TabPlayer } from '../audio/tabPlayer'
import { keyPrefersFlats, pcName } from '../theory/notes'
import { useInstrument } from '../instrument'
import { Splitter } from '../components/Splitter'
import { IconExpand, IconShrink } from '../components/Icons'
import { setPlayFocus, useMedia } from '../ui'

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
  const [sheet, setSheet] = useState(false)
  const [view, setView] = usePersist<View>('playView', 'tab')
  const [labelMode, setLabelMode] = usePersist<LabelMode>('playLabels', 'both')
  const [strict, setStrict] = usePersist('playStrict', false)
  const [showVideo, setShowVideo] = usePersist('playVideo', true)
  const [mode, setMode] = usePersist<'wait' | 'time'>('playMode', 'wait')
  const [click, setClick] = usePersist('timeClick', true)
  const [guide, setGuide] = usePersist('timeGuide', false)
  const [trainer, setTrainer] = usePersist<TrainerOpts>('speedTrainer', { on: false, start: 0.6, step: 0.05, target: 1, pass: 90 })
  const video = useRef<VideoApi | null>(null)
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
  useEffect(() => { setPlayFocus(focus); return () => setPlayFocus(false) }, [focus])
  const lastOnset = useRef(0)
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState('')
  const [live, setLive] = useState<number | null>(null)
  const [input, setInput] = useState<{ label: string; external: boolean } | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [inspect, setInspect] = useState<SongNote | null>(null)
  const [pos, setPos] = useState(0)
  const [version, setVersion] = useState(0)
  const [flash, setFlash] = useState<{ flat: number; key: number } | null>(null)
  const [pulse, setPulse] = useState<{ ok: boolean; key: number } | null>(null)
  const [selecting, setSelecting] = useState<null | { first?: number }>(null)
  const [passes, setPasses] = useState<{ n: number; last: number | null; best: number | null }>({ n: 0, last: null, best: null })
  const states = useRef<Uint8Array>(new Uint8Array(0))
  const [gearOpen, setGearOpen] = useState(false)
  useGear()
  const gearKind = kindOf(input?.external)
  const gate = gear(gearKind).gate
  const listener = useRef<NoteListener | null>(null)

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
  const flat = useMemo(() => (track ? flatten(track) : []), [track])
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
        if (score >= 90) bump('loop90')
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
        if (n) saveRun(Math.round((ok / follow.idx.length) * 100), 'wait', 1, follow.idx.length > 0 && n >= follow.idx.length * 0.8)
      }
      setPos(next)
    }
    setVersion(v => v + 1)
  }, [])
  const missAt = useCallback((heard: number, chordText?: string) => {
    const { pos, follow } = ref.current
    const fi = follow.idx[pos]
    if (fi !== undefined && states.current[fi] === 0) states.current[fi] = 3
    setFeedback({ ok: false, heard, chordText })
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
    else missAt(want.midis[0], top.join(', '))
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
      let last: number | null = null
      l.onFrame = f => { if (f.midi !== last) { last = f.midi; setLive(f.midi) } }
      l.onOnset = t => { lastOnset.current = t }
      l.onNote = e => {
        if (modeRef.current === 'time') { if (inTimeRef.current.running) inTimeRef.current.played(e.attack ? lastOnset.current : e.time, { midi: e.midi }) }
        else onNote(e.midi)
      }
      l.onChord = (chroma, at) => {
        if (modeRef.current === 'time') { if (inTimeRef.current.running) inTimeRef.current.played(at, { chroma }) }
        else onChord(chroma)
      }
      await l.start()
      listener.current = l
      setInput(l.input ? { label: l.input.label, external: l.input.external } : null)
      setListening(true)
      void keepAwake(true)
    } catch {
      setMicError('KGuitar needs microphone access to hear your guitar (this also covers a USB amp like the Amphonix). Allow it in your phone settings (Apps → KGuitar → Permissions), then try again.')
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
  function stopPreview() {
    player.current?.stop()
    setPlayAt(-1)
  }

  // ---------- play in time ----------
  const inTime = useInTime({
    flat, loop: loop, startFlat: cursorFlat >= 0 ? cursorFlat : 0, songBpm, speed, click, guide, strict, trainer, video,
    sync: showVideo ? doc?.ytSync : undefined, states,
    latencyMs: () => latencyMs(kindOf(listener.current?.external)),
    onChange: () => setVersion(v => v + 1),
    onHitNote: () => bumpCounts({ notesHit: 1, [doc?.source === 'lesson' ? 'exerciseNotes' : 'songNotes']: 1 }),
    onPass: (s, sp) => { if (s.score >= 90) bump('loop90'); if (loop) saveRun(s.score, 'time', sp, false, [loop.from, loop.to]) },
    onFinish: s => {
      if (s.score >= 60) bump(doc?.source === 'lesson' ? 'exercisesFinished' : 'songsFinished')
      saveRun(s.score, 'time', speed, !loop && s.total > 0, loop ? [loop.from, loop.to] : undefined)
    },
  })
  const inTimeRef = useRef(inTime)
  inTimeRef.current = inTime
  const modeRef = useRef(mode)
  modeRef.current = mode
  // practice time: listening with the mic counts as time with the guitar, Hear it as study time
  usePracticeTimer(doc?.source === 'lesson' ? 'warmup' : 'play', listening || inTime.running, true)
  usePracticeTimer('play', playAt >= 0 && !listening, false)
  async function toggleRun() {
    if (inTime.running) { inTime.stop(); return }
    stopPreview()
    if (!listening) await toggleListen()
    inTime.start()
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
  function preview() {
    if (playAt >= 0) { stopPreview(); return }
    if (listening) void toggleListen()
    const p = (player.current ??= new TabPlayer())
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
    const from = cursorFlat >= 0 ? cursorFlat : 0
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
      if (note.tech !== 'x') playNote(note.midi, ctx.currentTime + 0.02)
    } else {
      const ns = playable(flat[follow.idx[k]]?.step ?? { notes: [], dur: 0 })
      setInspect(ns[0] ?? null)
      if (ns.length) strum(ns.map(n => n.midi), ctx.currentTime + 0.02, { spread: 0.02 })
    }
  }, [flat])

  function hearNext() {
    if (!expected.length) return
    const ctx = audio()
    void ctx.resume()
    strum(expected.map(n => n.midi), ctx.currentTime + 0.02, { spread: 0.02 })
  }

  const firstTry = useMemo(() => {
    let ok = 0, all = 0
    for (const i of follow.idx) { const s = states.current[i]; if (s === 1 || s === 2) { all++; if (s === 1) ok++ } }
    return all ? Math.round((ok / all) * 100) : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, follow])

  if (!doc || !track) {
    return <div className="play"><p className="muted">Loading…</p></div>
  }

  const tuning = track.tuning.map(t => t + track.capo)
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
                {chordVoicing && <ChordDiagram voicing={chordVoicing} size={0.5} onClick={hearNext} />}
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
                <span className="fb bad">✗ Heard mostly {feedback.chordText}: the chord needs {[...new Set(expected.map(n => noteName(n.midi, flats)))].join(' ')}. Strum all the strings and let them ring.</span>
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
    </div>
  )

  const tabTools = (
    <div className="tab-tools">
      <Chips label="Follow mode" items={[{ id: 'wait', label: 'Wait for me' }, { id: 'time', label: 'In time' }]} value={mode} onChange={v => setMode(v)} />
      {loop ? (
        <span className="loop-chip">⟲ Bars {loop.from + 1}–{loop.to + 1}<button onClick={() => setLoop(undefined)} aria-label="Stop looping">✕</button></span>
      ) : (
        <button className="btn sm" aria-pressed={!!selecting} onClick={() => setSelecting(selecting ? null : {})}>⟲ Loop a section</button>
      )}
      <button className={`btn sm hear${playAt >= 0 ? ' on' : ''}`} onClick={preview} aria-pressed={playAt >= 0}>
        {playAt >= 0 ? '■ Stop' : '▶ Hear it'}
      </button>
      <Chips label="Playback speed" items={[{ id: 0.5, label: '½' }, { id: 0.75, label: '¾' }, { id: 1, label: `1× · ${Math.round(songBpm)} bpm` }]} value={speed} onChange={v => { setSpeed(v); if (playAt >= 0) { stopPreview() } }} />
      <Chips label="Tab numbers" items={[{ id: 'fret', label: 'Frets' }, { id: 'note', label: 'Notes' }, { id: 'both', label: 'Both' }]} value={labelMode} onChange={setLabelMode} />
      {mode === 'time' && (
        <>
          <button className="btn sm" aria-pressed={click} onClick={() => setClick(!click)}>Click</button>
          <button className="btn sm" aria-pressed={guide} onClick={() => setGuide(!guide)} title="Play the tab quietly while you play">Hear tab too</button>
          {loop && <button className="btn sm" aria-pressed={trainer.on} onClick={() => setTrainer({ ...trainer, on: !trainer.on })} title={`Starts at ${Math.round(trainer.start * 100)}% and speeds up ${Math.round(trainer.step * 100)}% after each pass of ${trainer.pass}% or better`}>Speed trainer</button>}
        </>
      )}
      <button className="btn sm" onClick={() => restart()}>Restart</button>
      <span className="zoom-btns" role="group" aria-label="Tab size">
        <button className="btn sm" onClick={() => setTabZoom(z => Math.max(0.7, Math.round((z - 0.1) * 10) / 10))} aria-label="Smaller tab">A−</button>
        <button className="btn sm" onClick={() => setTabZoom(z => Math.min(1.8, Math.round((z + 0.1) * 10) / 10))} aria-label="Bigger tab">A+</button>
      </span>
      <button className="btn sm" aria-pressed={split} onClick={() => setSplitPref(split ? 'off' : 'on')} title="Video and readout on top, tab below (automatic when the Fold is half-folded)">Split</button>
      <button className="btn sm" aria-pressed={strict} onClick={() => setStrict(!strict)} title="Only count the note in the exact octave">Exact octave</button>
      <label className="sens" title="How easily a sound counts as a note. Set it properly in Set up input.">
        <span className="small">Sensitivity</span>
        <input type="range" min={0.4} max={3} step={0.05} value={3.4 - gate} aria-label="Note sensitivity"
          onChange={e => { const g = Math.round((3.4 - Number(e.target.value)) * 100) / 100; setGear(gearKind, { gate: g }); if (listener.current) listener.current.gate = g }} />
      </label>
      <button className="btn sm" onClick={() => setGearOpen(true)}>Set up input</button>
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
      <header className="play-head">
        <button className="btn sm" onClick={() => setSheet(true)}>Songs</button>
        <div className="song-title">
          <b>{doc.title}</b>
          {doc.song.tracks.length > 1 ? (
            <select className="select sm" value={trackIdx} onChange={e => update({ track: Number(e.target.value), cursor: 0 })} aria-label="Track">
              {doc.song.tracks.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
            </select>
          ) : doc.artist ? <span className="small muted">{doc.artist}</span> : null}
        </div>
        <button className="btn sm icon-btn" aria-pressed={focus} onClick={() => setLay({ ...lay, focus: !focus })}
          aria-label={focus ? 'Show all panels again' : 'Full tab: hide the other panels'} title={focus ? 'Show all panels again' : 'Full tab'}>
          {focus ? <IconShrink /> : <IconExpand />}
        </button>
        <button className="btn sm" aria-pressed={showVideo} onClick={() => setShowVideo(!showVideo)}>Video</button>
        {mode === 'time' ? (
          <button className={`btn listen${inTime.running ? ' on' : ''}`} onClick={() => void toggleRun()} aria-pressed={inTime.running}>
            <span className="dot" /> {inTime.running ? 'Stop' : doc.ytSync && showVideo ? 'Start with video' : 'Start'}
          </button>
        ) : (
          <button className={`btn listen${listening ? ' on' : ''}`} onClick={toggleListen} aria-pressed={listening}>
            <span className="dot" /> {listening ? 'Listening' : 'Listen'}
          </button>
        )}
      </header>

      <section className="play-side" ref={sideRef}>
        {/* stays mounted while hidden so a playing video keeps going */}
        {showVideo && <YouTubePlayer url={doc.youtube} onUrl={u => update({ youtube: u, ytSync: u ? doc.ytSync : undefined })} onApi={api => { video.current = api }}
          sync={doc.ytSync} onSync={sync => update({ ytSync: sync })} tabBpm={songBpm} />}
        {sideOpen && readout(false)}
        {sideOpen && micError && <p className="notice small">{micError}</p>}
        {sideOpen && !isSetUp() && !micError && (
          <p className="notice small gear-hint">First time? <button className="btn sm" onClick={() => setGearOpen(true)}>Set up your input</button> takes two minutes and makes note detection and timing match your mic or amp.</p>
        )}
      </section>

      <Splitter dir="row" className="split-top" name="the video and readout" open={sideOpen}
        size={lay.topH || sideRef.current?.offsetHeight || 260} grow={1} min={110} max={() => playH() - 220}
        target={() => playRef.current} cssVar="--top-h" onStart={() => playRef.current?.classList.add('sized-top')}
        onSize={px => setLay({ ...lay, topH: px, side: true, focus: false })}
        onOpen={o => setLay({ ...lay, side: o, focus: false })} closedLabel="Show video & readout" />

      <div className="view-switch">
        <Chips label="View" items={[{ id: 'tab', label: 'Tab' }, { id: 'solo', label: 'Scales & chords' }, { id: 'both', label: 'Both' }]} value={view} onChange={setView} />
      </div>

      <Splitter dir="col" className="split-side" name="the side panel" open={sideOpen}
        size={lay.sideW} grow={-1} min={240} max={() => playW() - 340}
        target={() => playRef.current} cssVar="--side-w"
        onSize={px => setLay({ ...lay, sideW: px, side: true, focus: false })}
        onOpen={o => setLay({ ...lay, side: o, focus: false })} closedLabel="Video & readout" />

      <section className="play-tab">
        {!sideOpen && readout(true)}
        {!sideOpen && micError && <p className="notice small">{micError}</p>}
        {tabTools}
        {selecting && (
          <div className="select-hint">
            <span>{selecting.first === undefined ? 'Tap the first bar of the part you want to loop.' : `Start: bar ${selecting.first + 1}. Now tap the last bar (or the same bar again).`}</span>
            <button className="btn sm" onClick={() => setSelecting(null)}>Cancel</button>
          </div>
        )}
        <TabView track={track} mode={labelMode} flats={flats} cursor={inTime.running ? inTime.cursor : playAt >= 0 ? playAt : cursorFlat} playing={playAt >= 0 || inTime.running} states={states.current}
          flash={flash} loop={loop} selecting={!!selecting} onBar={onBar} version={version} spans={timeline.spans} onTap={onTap} />
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
      {sheet && (
        <SongsSheet
          currentId={doc.id}
          onClose={() => setSheet(false)}
          onOpen={d => { setSheet(false); setDoc(d); setSongId(d.id) }}
        />
      )}
    </div>
  )
}

// The player under a scan result: the tab with a moving playhead, Play / Pause / Back to the start, a speed slider
// (shows the BPM it plays at), tap a note to start from there, the unified floating Visual Checker (Check it in the
// picture + 1-tap fixer + ◐ opacity meter, auto-opening on unsure notes with auto-advance and Undo), an optional
// floating opacity-metered Original Video card (YouTube), and the floating "Where your fingers go" box.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SongDoc } from '../tabs/library'
import { flatten, playable, type Song, type SongNote } from '../tabs/model'
import { TabPlayer } from '../audio/tabPlayer'
import { activeSound, playDeadNote, playNote, soundForProgram } from '../audio/pluck'
import { audio } from '../audio/engine'
import { onLeavePage } from '../audio/stopAll'
import { micWhere } from '../audio/input'
import { latencyMs } from '../audio/gear'
import { chordMatch } from '../audio/chroma'
import { TabView } from '../components/TabView'
import { FingerBox } from '../components/FingerBox'
import { MixSlider, applyMix } from '../components/MixSlider'
import { liveHandState, handGroups } from '../play/handShape'
import { songTempo } from '../play/tempoMap'
import { useInTime } from '../play/useInTime'
import type { VideoApi } from '../play/inTime'
import { NoteListener, matchNote, type FollowStep } from '../tabs/follow'
import { accepted, bendAlso } from '../tabs/bends'
import { useInstrument } from '../instrument'
import { midiName, pcName } from '../theory/notes'
import { Ico } from '../components/Icon'
import { chordTimeline } from '../tabs/harmony'
import { strumPattern } from '../play/strumCoach'
import { NoSourcePeek, ScanVideoPeek, SourcePeek, type PeekFixer, type ScanSource } from './SourcePeek'

const TWIN_HINTS: Record<number, number[]> = {
  0: [9, 8, 6], 1: [7, 4], 2: [3, 7], 3: [8, 5, 2], 4: [1, 9], 5: [6, 8, 3],
  6: [8, 5, 0], 7: [1, 2], 8: [6, 3, 0, 9], 9: [0, 8], 10: [12, 18], 11: [14, 17],
  12: [10, 13, 15], 13: [15, 12], 14: [11, 19], 15: [16, 13], 16: [18, 15], 17: [11, 19],
}
const TECHS = ['h', 'p', '/', '\\', 'b', '~', 'PM'] as const

export function ScanPlayer({ doc, marks, onChangeSong, sources, noPicture, barTimes, playTools }: {
  doc: SongDoc
  marks?: number[]
  onChangeSong?: (song: Song) => void
  sources?: ScanSource[]
  noPicture?: { why: string; onFrames?: () => void }
  barTimes?: Record<number, number>
  /** Enable full in-window Play controls: Wait for me mic, In time mic, Click, Bar Loop, Mix & Hand toggle */
  playTools?: boolean
}) {
  const inst = useInstrument()
  const track = doc.song.tracks[0]
  const flat = useMemo(() => flatten(track), [track])
  const statesRef = useRef(new Uint8Array(flat.length))
  const [stateVer, setStateVer] = useState(0)
  useEffect(() => {
    statesRef.current = new Uint8Array(flat.length)
    setStateVer(v => v + 1)
  }, [flat.length, doc.id])

  const [at, setAt] = useState(-1)
  const [from, setFrom] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [loop, setLoop] = useState<{ from: number; to: number } | null>(null)
  const [clickOn, setClickOn] = useState(true)
  const [guideOn, setGuideOn] = useState(true)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [handOpen, setHandOpen] = useState(!playTools)
  const [micMode, setMicMode] = useState<'off' | 'wait' | 'time'>('off')
  const [micErr, setMicErr] = useState('')
  const [heardLabel, setHeardLabel] = useState('')
  const [waitPos, setWaitPos] = useState(0)
  const [sel, setSel] = useState<{ flatIdx: number; string: number } | null>(null)
  const [undoStack, setUndoStack] = useState<Song[]>([])
  const [picOff, setPicOff] = useState(false)
  const [vidOpen, setVidOpen] = useState(false)
  const [verifiedBanner, setVerifiedBanner] = useState(false)
  const player = useRef<TabPlayer | null>(null)
  const listenerRef = useRef<NoteListener | null>(null)
  const lastHitAtRef = useRef(0)
  const nullVideoRef = useRef<VideoApi | null>(null)

  const bpm = doc.song.tempo ?? 90
  const maxBar = Math.max(0, track.bars.length - 1)
  const strNames = useMemo(() => track.tuning.map((t, s) => {
    const n = pcName(t % 12, false)
    return s === track.tuning.length - 1 && track.tuning.filter(x => x % 12 === t % 12).length > 1 ? n.toLowerCase() : n
  }), [track.tuning])
  // chord names over the tab (the scan's own: written ones or the AI's)
  const spans = useMemo(() => chordTimeline(track, {}, []).spans, [track])
  const hands = useMemo(() => handGroups(flat, { inst: inst.id, stringNames: strNames }), [flat, inst.id, strNames])
  const unsureList = useMemo(() => {
    const out: { flatIdx: number; string: number }[] = []
    flat.forEach((f, fi) => f.step.notes.forEach(n => { if (n.unsure) out.push({ flatIdx: fi, string: n.string }) }))
    return out
  }, [flat])

  // Followable steps for Wait-for-me mic mode (same matching rules as PlayScreen)
  const follow = useMemo(() => {
    const idx: number[] = []
    const steps: FollowStep[] = []
    flat.forEach((f, i) => {
      const ns = playable(f.step)
      if (!ns.length) return
      idx.push(i)
      const midis = ns.map(n => n.midi)
      const also = bendAlso(ns)
      const pcs = new Set(midis.map(m => ((m % 12) + 12) % 12))
      steps.push({ midis, ...(also.length ? { also } : {}), ...(pcs.size >= 3 ? { chord: true } : {}) })
    })
    return { idx, steps }
  }, [flat])

  const loopFollowRange = useMemo(() => {
    if (!loop) return null
    const a = follow.idx.findIndex(i => flat[i]?.bar >= loop.from)
    if (a < 0) return null
    let b = a
    follow.idx.forEach((fi, k) => { if (flat[fi]?.bar <= loop.to) b = k })
    return { a, b }
  }, [loop, follow, flat])

  const tempoMap = useMemo(() => {
    const m = songTempo(doc.song)
    return m.changes ? m : undefined
  }, [doc.song])

  const inTime = useInTime({
    flat,
    loop,
    startFlat: from,
    songBpm: bpm,
    speed,
    click: clickOn,
    guide: guideOn,
    strum: strumPattern(doc.song.strum) ?? null,
    meter: doc.song.meter ?? 4,
    tempo: tempoMap,
    sound: activeSound(soundForProgram(track.program)),
    strict: false,
    trainer: { on: false, start: 0.7, step: 0.05, target: 1, pass: 85 },
    video: nullVideoRef,
    sync: undefined,
    states: statesRef,
    latencyMs: () => latencyMs(listenerRef.current?.inputKind ?? 'mic'),
    onChange: () => setStateVer(v => v + 1),
    onExpect: (nowN, nextN) => listenerRef.current?.expect(nowN, nextN),
    onFinish: () => {
      listenerRef.current?.stop()
      listenerRef.current = null
      setMicMode('off')
    },
  })

  const waitRef = useRef({ waitPos, follow, loopFollowRange, micMode })
  waitRef.current = { waitPos, follow, loopFollowRange, micMode }

  const stopMic = useCallback(() => {
    listenerRef.current?.stop()
    listenerRef.current = null
    inTime.stop()
    setMicMode('off')
    setHeardLabel('')
  }, [inTime])

  // Update expected notes whenever Wait-for-me position changes
  useEffect(() => {
    if (micMode !== 'wait' || !listenerRef.current) return
    const curStep = follow.steps[waitPos]
    const nextStep = follow.steps[waitPos + 1]
    listenerRef.current.expect(curStep ? accepted(curStep) : [], nextStep ? accepted(nextStep) : [])
  }, [micMode, waitPos, follow])

  const startMicMode = async (mode: 'wait' | 'time') => {
    setMicErr('')
    player.current?.stop()
    setAt(-1)
    if (micMode === mode) {
      stopMic()
      return
    }
    stopMic()
    statesRef.current = new Uint8Array(flat.length)
    setStateVer(v => v + 1)
    setSel(null)
    applyMix(false)

    // Starting step for Wait-for-me
    let initWait = follow.idx.findIndex(fi => fi >= from)
    if (initWait < 0) initWait = 0
    if (loopFollowRange && (initWait < loopFollowRange.a || initWait > loopFollowRange.b)) initWait = loopFollowRange.a
    setWaitPos(initWait)
    waitRef.current = { ...waitRef.current, waitPos: initWait, micMode: mode }

    const l = new NoteListener('scan-play', { chords: true, autoGate: true })
    l.onNote = e => {
      const st = waitRef.current
      setHeardLabel(midiName(e.midi))
      if (st.micMode === 'time') {
        inTime.played(e.time, { midi: e.midi })
        return
      }
      if (st.micMode !== 'wait') return
      const curStep = st.follow.steps[st.waitPos]
      if (!curStep || curStep.chord) return
      const since = e.time - lastHitAtRef.current
      const r = matchNote(st.follow.steps, st.waitPos, e.midi, false, since, e.attack)
      if (r.kind === 'hit') {
        lastHitAtRef.current = e.time
        for (let k = st.waitPos; k < r.step; k++) statesRef.current[st.follow.idx[k]] = 2
        statesRef.current[st.follow.idx[r.step]] = 1
        setStateVer(v => v + 1)
        let next = r.step + 1
        if (st.loopFollowRange && next > st.loopFollowRange.b) {
          for (let k = st.loopFollowRange.a; k <= st.loopFollowRange.b; k++) statesRef.current[st.follow.idx[k]] = 0
          next = st.loopFollowRange.a
        } else if (!st.loopFollowRange && next >= st.follow.steps.length) {
          next = 0
        }
        setWaitPos(next)
        if (st.follow.idx[next] !== undefined) setFrom(st.follow.idx[next])
      }
    }
    l.onChord = chroma => {
      const st = waitRef.current
      if (st.micMode === 'time') {
        inTime.played(audio().currentTime, { chroma })
        return
      }
      if (st.micMode !== 'wait') return
      const curStep = st.follow.steps[st.waitPos]
      if (!curStep?.chord) return
      const pcs = [...new Set(curStep.midis.map(m => ((m % 12) + 12) % 12))]
      if (!chordMatch(chroma, pcs).ok) return
      lastHitAtRef.current = audio().currentTime
      statesRef.current[st.follow.idx[st.waitPos]] = 1
      setStateVer(v => v + 1)
      let next = st.waitPos + 1
      if (st.loopFollowRange && next > st.loopFollowRange.b) {
        for (let k = st.loopFollowRange.a; k <= st.loopFollowRange.b; k++) statesRef.current[st.follow.idx[k]] = 0
        next = st.loopFollowRange.a
      } else if (!st.loopFollowRange && next >= st.follow.steps.length) {
        next = 0
      }
      setWaitPos(next)
      if (st.follow.idx[next] !== undefined) setFrom(st.follow.idx[next])
    }

    try {
      await l.start()
      listenerRef.current = l
      setMicMode(mode)
      if (mode === 'wait') {
        const curStep = follow.steps[initWait]
        const nextStep = follow.steps[initWait + 1]
        l.expect(curStep ? accepted(curStep) : [], nextStep ? accepted(nextStep) : [])
      } else {
        inTime.start()
      }
    } catch {
      l.stop()
      setMicMode('off')
      setMicErr(`Microphone needed: allow it for KGuitar ${micWhere()}, then try again.`)
    }
  }

  // Auto-pop the Visual Checker on unsure note #1 as soon as a scan loads with unsure notes & pictures!
  // (this reset runs before the auto-open below, so the first unsure note keeps the cursor)
  useEffect(() => {
    const off = onLeavePage(() => {
      player.current?.stop()
      listenerRef.current?.stop()
      listenerRef.current = null
      inTime.stop()
    })
    return () => {
      off()
      player.current?.stop()
      listenerRef.current?.stop()
      listenerRef.current = null
      inTime.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    player.current?.stop()
    stopMic()
    setAt(-1)
    setFrom(0)
    setLoop(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id])

  const autoOpenedId = useRef('')
  useEffect(() => {
    const key = `${doc.id}:${sources?.length ?? 0}`
    if (autoOpenedId.current === key) return
    autoOpenedId.current = key
    setPicOff(false)
    setVerifiedBanner(false)
    setUndoStack([])
    if (onChangeSong && sources?.length && unsureList.length > 0) {
      const first = unsureList[0]
      setSel(first)
      setFrom(first.flatIdx)
    }
  }, [doc.id, sources?.length, unsureList.length, onChangeSong]) // eslint-disable-line react-hooks/exhaustive-deps

  const audition = (midi: number, string: number) => {
    try {
      const ctx = audio()
      void ctx.resume()
      playNote(midi, ctx.currentTime, 0.7, undefined, { sound: activeSound(soundForProgram(track.program)), string })
    } catch { /* ignore in headless */ }
  }

  const playing = at >= 0
  const start = (i: number, lp = loop) => {
    if (micMode !== 'off') stopMic()
    applyMix(false)
    const p = (player.current ??= new TabPlayer())
    p.onStep = k => setAt(k)
    p.onEnd = () => { setAt(-1); setFrom(0) }
    p.onStop = () => setAt(-1)
    p.sound = activeSound(soundForProgram(track.program))
    p.meter = doc.song.meter ?? 4
    p.click = !!(playTools && clickOn)
    p.tempo = tempoMap
    if (lp) {
      const a = flat.findIndex(f => f.bar === lp.from), b = flat.findIndex(f => f.bar > lp.to)
      p.play(flat, Math.max(a, i >= a && (b < 0 || i < b) ? i : a), bpm * speed, b < 0 ? flat.length : b, a)
    } else p.play(flat, i, bpm * speed)
    setAt(i)
  }
  const pause = () => { player.current?.stop(); setFrom(Math.max(0, at)); setAt(-1) }
  const reset = () => {
    player.current?.stop()
    if (micMode !== 'off') stopMic()
    statesRef.current = new Uint8Array(flat.length)
    setStateVer(v => v + 1)
    setAt(-1)
    setFrom(loop ? Math.max(0, flat.findIndex(f => f.bar === loop.from)) : 0)
    setWaitPos(loopFollowRange?.a ?? 0)
  }
  // a new speed or click setting takes effect from the note you're on
  useEffect(() => { if (playing) start(at) }, [speed, clickOn]) // eslint-disable-line react-hooks/exhaustive-deps

  const cur = micMode === 'time' && inTime.cursor >= 0
    ? inTime.cursor
    : micMode === 'wait'
      ? (follow.idx[waitPos] ?? from)
      : (playing ? at : from)
  const liveHand = liveHandState(flat, hands, cur, strNames)
  const expected = flat[cur]?.step.notes ?? []

  const selFlat = sel ? flat[sel.flatIdx] : null
  const selNote = selFlat?.step.notes.find(n => n.string === sel?.string) ?? null

  const updateSelectedNote = (fn: (n: SongNote) => SongNote | null, autoAdvance = false) => {
    if (!sel || !selFlat || !selNote || !onChangeSong) return
    const wasUnsure = !!selNote.unsure
    const { bar: bi, idx: si } = selFlat
    const capo = track.capo ?? 0
    // Save snapshot for Undo
    setUndoStack(st => [...st.slice(-19), JSON.parse(JSON.stringify(doc.song)) as Song])
    let nextSel: { flatIdx: number; string: number } | null = sel
    const bars = track.bars.map((b, bIdx) => {
      if (bIdx !== bi) return b
      return {
        ...b,
        steps: b.steps.map((st, sIdx) => {
          if (sIdx !== si) return st
          const outNotes: SongNote[] = []
          for (const n of st.notes) {
            if (n.string !== sel.string) { outNotes.push(n); continue }
            const updated = fn(n)
            if (updated) {
              const midi = (track.tuning[updated.string] ?? 40) + capo + updated.fret
              const clean: SongNote = { ...updated, midi, unsure: undefined }
              if (!clean.unsure) delete clean.unsure
              outNotes.push(clean)
              nextSel = { flatIdx: sel.flatIdx, string: clean.string }
              if (clean.tech === 'x') playDeadNote(0, 0.65, undefined, 1)
              else audition(midi, clean.string)
            } else {
              nextSel = null
            }
          }
          // Deduplicate if string move collided
          const byStr = new Map<number, SongNote>()
          for (const n of outNotes) byStr.set(n.string, n)
          return { ...st, notes: [...byStr.values()].sort((a, b) => a.string - b.string) }
        }),
      }
    })
    const updatedSong: Song = { ...doc.song, tracks: [{ ...track, bars }, ...doc.song.tracks.slice(1)] }
    onChangeSong(updatedSong)

    // Auto-advance to the next remaining unsure note when confirming/fixing an unsure note!
    if (autoAdvance && wasUnsure) {
      const rem = unsureList.filter(u => !(u.flatIdx === sel.flatIdx && u.string === sel.string))
      if (rem.length > 0) {
        const after = rem.find(u => u.flatIdx > sel.flatIdx || (u.flatIdx === sel.flatIdx && u.string > sel.string))
        const pick = after ?? rem[0]
        setSel(pick)
        setFrom(pick.flatIdx)
      } else {
        setSel(null)
        setVerifiedBanner(true)
      }
    } else {
      setSel(nextSel)
    }
  }

  /** Mark every note in the selected chord/strum step as a muted chuck (x). */
  const muteSelectedStep = () => {
    if (!sel || !selFlat || !onChangeSong) return
    const { bar: bi, idx: si } = selFlat
    const capo = track.capo ?? 0
    setUndoStack(st => [...st.slice(-19), JSON.parse(JSON.stringify(doc.song)) as Song])
    const bars = track.bars.map((b, bIdx) => bIdx !== bi ? b : {
      ...b,
      steps: b.steps.map((st, sIdx) => sIdx !== si ? st : {
        ...st,
        notes: st.notes.map(n => {
          const clean: SongNote = { ...n, fret: 0, midi: (track.tuning[n.string] ?? 40) + capo, tech: 'x' }
          delete clean.unsure
          return clean
        }),
      }),
    })
    playDeadNote(0, 0.75, undefined, Math.max(3, selFlat.step.notes.length))
    onChangeSong({ ...doc.song, tracks: [{ ...track, bars }, ...doc.song.tracks.slice(1)] })
    const rem = unsureList.filter(u => u.flatIdx !== sel.flatIdx)
    if (selFlat.step.notes.some(n => n.unsure)) {
      if (rem.length > 0) {
        const pick = rem.find(u => u.flatIdx > sel.flatIdx) ?? rem[0]
        setSel(pick)
        setFrom(pick.flatIdx)
      } else {
        setSel(null)
        setVerifiedBanner(true)
      }
    }
  }

  const undoLast = () => {
    if (!undoStack.length || !onChangeSong) return
    const prev = undoStack[undoStack.length - 1]
    setUndoStack(st => st.slice(0, -1))
    setVerifiedBanner(false)
    onChangeSong(prev)
  }

  const jumpUnsure = (dir: 1 | -1) => {
    if (!unsureList.length) return
    let pick = unsureList[0]
    if (sel) {
      if (dir === 1) {
        const after = unsureList.find(u => u.flatIdx > sel.flatIdx || (u.flatIdx === sel.flatIdx && u.string > sel.string))
        pick = after ?? unsureList[0]
      } else {
        const before = [...unsureList].reverse().find(u => u.flatIdx < sel.flatIdx || (u.flatIdx === sel.flatIdx && u.string < sel.string))
        pick = before ?? unsureList[unsureList.length - 1]
      }
    }
    if (playing) pause()
    setPicOff(false)
    setFrom(pick.flatIdx)
    setSel(pick)
    const n = flat[pick.flatIdx]?.step.notes.find(x => x.string === pick.string)
    if (n && n.tech !== 'x') audition(n.midi, n.string)
  }

  const altFrets = useMemo(() => {
    if (!selNote) return []
    const baseAlts = selNote.alts ?? []
    const twins = TWIN_HINTS[selNote.fret] ?? []
    return [...new Set([...baseAlts, ...twins])].filter(f => f !== selNote.fret && f >= 0 && f <= 24).slice(0, 4)
  }, [selNote])

  // the one "Check it in the picture" window: follows the note you tap or auto-opened unsure note
  const peek = useMemo(() => {
    if (!sources?.length || !onChangeSong) return null
    if (selNote?.src && selFlat) return { src: selNote.src, label: `bar ${selFlat.bar + 1}, ${strNames[selNote.string]} string`, unsure: !!selNote.unsure }
    return null
  }, [sources, onChangeSong, selNote, selFlat, strNames])

  const unsurePos = useMemo(() => {
    if (!sel || !selNote?.unsure) return undefined
    const idx = unsureList.findIndex(u => u.flatIdx === sel.flatIdx && u.string === sel.string)
    return idx >= 0 ? idx + 1 : undefined
  }, [sel, selNote, unsureList])

  const hasVideo = !!doc.youtube
  const activeBar = selFlat?.bar ?? flat[cur]?.bar ?? 0
  const activeBarTime = barTimes?.[activeBar]

  const peekFixer: PeekFixer | undefined = selNote && selFlat && onChangeSong ? {
    bar: selFlat.bar + 1,
    stringName: strNames[selNote.string],
    note: selNote,
    stepNoteCount: selFlat.step.notes.length,
    altFrets,
    hint: (selNote as SongNote & { hint?: string }).hint,
    unsurePos,
    unsureTotal: unsureList.length,
    canUndo: undoStack.length > 0,
    canStrUp: selNote.string < track.tuning.length - 1,
    canStrDn: selNote.string > 0,
    strUpLabel: strNames[selNote.string + 1],
    strDnLabel: strNames[selNote.string - 1],
    hasVideo,
    videoOpen: vidOpen,
    onConfirm: () => updateSelectedNote(n => ({ ...n, unsure: undefined }), true),
    onPickFret: f => updateSelectedNote(n => ({ ...n, fret: f, tech: n.tech === 'x' ? undefined : n.tech }), true),
    onNudgeFret: d => updateSelectedNote(n => ({ ...n, fret: n.tech === 'x' ? Math.max(0, d) : Math.max(0, Math.min(24, n.fret + d)), tech: n.tech === 'x' ? undefined : n.tech }), false),
    onMuteNote: () => updateSelectedNote(n => (n.tech === 'x' ? { ...n, tech: undefined } : { ...n, fret: 0, tech: 'x' }), true),
    onMuteAll: muteSelectedStep,
    onMoveString: d => updateSelectedNote(n => ({ ...n, string: Math.max(0, Math.min(track.tuning.length - 1, n.string + d)) }), false),
    onToggleTech: tc => updateSelectedNote(n => ({ ...n, tech: n.tech === tc ? undefined : tc }), false),
    onDelete: () => updateSelectedNote(() => null, true),
    onAudition: () => { if (selNote.tech === 'x') playDeadNote(0, 0.65, undefined, 1); else audition(selNote.midi, selNote.string) },
    onUndo: undoLast,
    onPrevUnsure: () => jumpUnsure(-1),
    onNextUnsure: () => jumpUnsure(1),
    onToggleVideo: () => setVidOpen(v => !v),
  } : undefined

  const activeLoopBar = flat[cur]?.bar ?? 0
  const toggleLoopHere = () => {
    if (loop) {
      setLoop(null)
      if (playing) start(at, null)
    } else {
      const lp = { from: activeLoopBar, to: activeLoopBar }
      setLoop(lp)
      if (playing) start(flat.findIndex(f => f.bar === lp.from), lp)
    }
  }
  const adjustLoopStart = (delta: number) => {
    if (!loop) return
    const nextFrom = Math.max(0, Math.min(loop.to, loop.from + delta))
    const lp = { from: nextFrom, to: loop.to }
    setLoop(lp)
    if (playing) start(flat.findIndex(f => f.bar === lp.from), lp)
  }
  const adjustLoopEnd = (delta: number) => {
    if (!loop) return
    const nextTo = Math.max(loop.from, Math.min(maxBar, loop.to + delta))
    const lp = { from: loop.from, to: nextTo }
    setLoop(lp)
    if (playing) start(flat.findIndex(f => f.bar === lp.from), lp)
  }
  const skipWaitNote = () => {
    if (micMode !== 'wait') return
    const fi = follow.idx[waitPos]
    if (fi !== undefined) statesRef.current[fi] = 2
    setStateVer(v => v + 1)
    let next = waitPos + 1
    if (loopFollowRange && next > loopFollowRange.b) next = loopFollowRange.a
    else if (!loopFollowRange && next >= follow.steps.length) next = 0
    setWaitPos(next)
    if (follow.idx[next] !== undefined) setFrom(follow.idx[next])
  }
  const inTimeTotal = inTime.tally.on + inTime.tally.early + inTime.tally.late + inTime.tally.miss
  const inTimePct = inTimeTotal > 0 ? Math.round(((inTime.tally.on + (inTime.tally.early + inTime.tally.late) * 0.5) / inTimeTotal) * 100) : null
  const isBusy = playing || micMode !== 'off'

  return (
    <div className="scan-player stack" style={{ gap: 5 }} data-testid="scan-player">
      {/* Ultra-slim 1-row action bar: Play · Wait · In time · Loop · ⚙ Tools */}
      <div className="row" style={{ gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className={`btn sm${playing ? ' on' : ' primary'}`} onClick={() => (playing ? pause() : start(from))} data-testid="sp-play">
          {playing ? <><Ico n="pause" fill /> Pause</> : <><Ico n="play" fill /> {playTools ? (from > 0 ? 'Go on' : 'Hear') : (from > 0 ? 'Go on' : 'Play')}</>}
        </button>
        {playTools && (
          <>
            <button
              className={`btn sm${micMode === 'wait' ? ' on' : ''}`}
              aria-pressed={micMode === 'wait'}
              onClick={() => void startMicMode('wait')}
              data-testid="sp-mic-wait"
              title="Mic waits for each note you play"
            >
              🎤 {micMode === 'wait' ? 'Stop' : 'Wait'}
            </button>
            <button
              className={`btn sm${micMode === 'time' ? ' on' : ''}`}
              aria-pressed={micMode === 'time'}
              onClick={() => void startMicMode('time')}
              data-testid="sp-mic-time"
              title="Play in time with count-in, click, and live mic timing"
            >
              ⏱ {micMode === 'time' ? 'Stop' : 'In time'}
            </button>
            <button
              className={`btn sm${loop ? ' on' : ''}`}
              aria-pressed={!!loop}
              onClick={toggleLoopHere}
              data-testid="sp-loop"
              title={loop ? 'Turn off section loop' : `Loop section starting at bar ${activeLoopBar + 1}`}
            >
              ⟲ {loop ? `${loop.from + 1}–${loop.to + 1}` : 'Loop'}
            </button>
            <button
              className={`btn sm${toolsOpen || speed !== 1 || handOpen ? ' set' : ''}`}
              aria-pressed={toolsOpen}
              onClick={() => setToolsOpen(o => !o)}
              data-testid="sp-tools-btn"
              title="Speed, Click, Mix & Hand Coach"
            >
              ⚙{speed !== 1 ? ` ${Math.round(speed * 100)}%` : ''}
            </button>
          </>
        )}
        {!playTools && (
          <>
            <button className="btn sm ghost" onClick={reset} aria-label="Back to the start" disabled={!isBusy && from === 0}><Ico n="again" /></button>
            <label className="row small" style={{ gap: 6, alignItems: 'center', flex: '1 1 160px' }}>
              <span>Speed</span>
              <input type="range" min={0.25} max={1.5} step={0.05} value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Speed" data-testid="sp-speed" style={{ flex: 1 }} />
              <b className="tabular" data-testid="sp-bpm">{Math.round(bpm * speed)} BPM</b>
            </label>
          </>
        )}
        {onChangeSong && unsureList.length > 0 && (
          <button className="btn sm primary" onClick={() => jumpUnsure(1)} data-testid="sp-next-unsure">
            Check {unsureList.length} →
          </button>
        )}
        {hasVideo && !playTools && (
          <button className={`btn sm${vidOpen ? ' on' : ''}`} onClick={() => setVidOpen(v => !v)} data-testid="sp-video-btn" title="Watch & hear original video in a floating window">
            <Ico n="film" /> {vidOpen ? 'Hide video' : 'Watch video'}
          </button>
        )}
        {undoStack.length > 0 && (
          <button className="btn sm ghost" onClick={undoLast} data-testid="sp-undo" title="Undo last note edit">↩</button>
        )}
        {!playTools && loop && <button className="btn sm on" onClick={() => { setLoop(null); if (playing) start(at, null) }}>Looping bars {loop.from + 1}–{loop.to + 1} ✕</button>}
      </div>

      {/* Compact Section Loop Picker (only shown when Loop is ON!) */}
      {playTools && loop && (
        <div className="panel row small" style={{ gap: 5, padding: '4px 8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }} data-testid="sp-loop-bar">
          <span className="row" style={{ gap: 4, alignItems: 'center' }}>
            <b>Section:</b>
            <button className="btn sm ghost" onClick={() => adjustLoopStart(-1)} disabled={loop.from <= 0} aria-label="Earlier start bar" style={{ padding: '1px 5px', minHeight: 22 }}>‹</button>
            <span className="tabular">Bar {loop.from + 1}</span>
            <button className="btn sm ghost" onClick={() => adjustLoopStart(1)} disabled={loop.from >= loop.to} aria-label="Later start bar" style={{ padding: '1px 5px', minHeight: 22 }}>›</button>
            <span className="muted">to</span>
            <button className="btn sm ghost" onClick={() => adjustLoopEnd(-1)} disabled={loop.to <= loop.from} aria-label="Earlier end bar" style={{ padding: '1px 5px', minHeight: 22 }}>‹</button>
            <span className="tabular">Bar {loop.to + 1}</span>
            <button className="btn sm ghost" onClick={() => adjustLoopEnd(1)} disabled={loop.to >= maxBar} aria-label="Later end bar" style={{ padding: '1px 5px', minHeight: 22 }}>›</button>
          </span>
          <button className="btn sm ghost" onClick={toggleLoopHere} aria-label="Clear loop" style={{ padding: '1px 6px', minHeight: 22 }}>✕</button>
        </div>
      )}

      {/* Collapsible ⚙ Practice Drawer (Speed · Click · Mix · Guide · Hand · Reset — tucked away until tapped!) */}
      {playTools && toolsOpen && (
        <div className="panel stack" style={{ gap: 6, padding: '6px 8px' }} data-testid="sp-tools-drawer">
          <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="row small" style={{ gap: 5, alignItems: 'center', flex: '1 1 130px', minWidth: 120 }}>
              <span className="muted">Speed</span>
              <input type="range" min={0.25} max={1.5} step={0.05} value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Speed" data-testid="sp-speed" style={{ flex: 1, minWidth: 60 }} />
              <b className="tabular" data-testid="sp-bpm" style={{ fontSize: 11 }}>{Math.round(bpm * speed)} BPM</b>
            </label>
            <button className={`btn sm${clickOn ? ' set' : ''}`} aria-pressed={clickOn} onClick={() => setClickOn(c => !c)} data-testid="sp-click">Click</button>
            <button className={`btn sm${handOpen ? ' set' : ''}`} aria-pressed={handOpen} onClick={() => setHandOpen(h => !h)} data-testid="sp-hand-btn">✋ Hand</button>
            <button className="btn sm ghost" onClick={reset} aria-label="Back to the start" disabled={!isBusy && from === 0}><Ico n="again" /></button>
          </div>
          <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <MixSlider band={false} compact />
            <button className={`btn sm${guideOn ? ' set' : ''}`} aria-pressed={guideOn} onClick={() => setGuideOn(g => !g)} title="Play guide notes during In time mode">
              Guide {guideOn ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {/* Live Mic feedback bar */}
      {micErr && <p className="notice small" style={{ margin: 0 }} role="alert">{micErr}</p>}
      {micMode === 'wait' && (
        <div className="panel row small" style={{ gap: 8, padding: '5px 8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }} data-testid="sp-mic-bar">
          <span>
            <b>🎤 Listening</b>
            {' · '}Play: <b>{expected.length ? expected.map(n => midiName(n.midi)).join(' + ') : '—'}</b>
            {heardLabel && <span className="muted"> · Heard: {heardLabel}</span>}
          </span>
          <span className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span className="muted tabular">{waitPos + 1}/{Math.max(1, follow.steps.length)}</span>
            <button className="btn sm ghost" onClick={skipWaitNote}>Skip →</button>
          </span>
        </div>
      )}
      {micMode === 'time' && (
        <div className="panel row small" style={{ gap: 8, padding: '5px 8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }} data-testid="sp-mic-bar">
          <span>
            {inTime.countIn > 0
              ? <><b>🥁 Count-in: {inTime.countIn}</b></>
              : <><b>⏱ In time</b>{heardLabel ? <span className="muted"> · Heard: {heardLabel}</span> : null}</>}
          </span>
          <span className="tabular muted">
            {inTimePct !== null ? <b>{inTimePct}%</b> : 'Play along…'}
            {inTimeTotal > 0 ? ` · ✓${inTime.tally.on} · ✕${inTime.tally.miss}` : ''}
          </span>
        </div>
      )}

      {verifiedBanner && unsureList.length === 0 && (
        <div className="notice small row" style={{ gap: 8, alignItems: 'center', justifyContent: 'space-between', borderLeftColor: 'var(--mint)' }} data-testid="scan-all-verified">
          <span><b>✓ All unsure notes verified!</b> Tap any note anytime to double-check it in the picture, or open in Play.</span>
          <button className="btn sm ghost" onClick={() => setVerifiedBanner(false)} aria-label="Dismiss">✕</button>
        </div>
      )}
      {peek && !picOff && sources && (
        <SourcePeek sources={sources} src={peek.src} label={peek.label} unsure={peek.unsure} onHide={() => setPicOff(true)} fixer={peekFixer} />
      )}
      {!peek && selNote && !picOff && noPicture && onChangeSong && (
        <NoSourcePeek why={noPicture.why} onFrames={noPicture.onFrames} onHide={() => setPicOff(true)} />
      )}
      {vidOpen && doc.youtube && (
        <ScanVideoPeek url={doc.youtube} bar={activeBar + 1} barTime={activeBarTime} onHide={() => setVidOpen(false)} />
      )}
      {(peek || (selNote && noPicture)) && picOff && (
        <button className="btn sm ghost" onClick={() => setPicOff(false)} data-testid="scan-source-show" style={{ alignSelf: 'flex-start' }}>
          <Ico n="image" /> Check it in the picture
        </button>
      )}
      {/* Inline note fixer when there's no floating picture window open (e.g. cloud read or picture tucked away) */}
      {onChangeSong && selNote && selFlat && (!peek || picOff) && !isBusy && (
        <div className="panel small stack" style={{ gap: 6, padding: '8px 10px' }} data-testid="scan-note-fixer">
          <div className="row" style={{ gap: 6, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span>
              <b>Bar {selFlat.bar + 1}</b> · <b>{strNames[selNote.string]}</b> string · {selNote.tech === 'x' ? <b>x (muted)</b> : <>fret <b>{selNote.fret}</b>{selNote.tech ? ` (${selNote.tech})` : ''}</>}
              {selNote.unsure ? <span className="muted"> · amber ring (unsure)</span> : null}
            </span>
            <div className="row" style={{ gap: 4 }}>
              {selNote.unsure && <button className="btn sm primary" onClick={() => updateSelectedNote(n => ({ ...n, unsure: undefined }), true)} data-testid="fix-ok">Looks right ✓</button>}
              {unsureList.length > 0 && <button className="btn sm" onClick={() => jumpUnsure(1)}>Next unsure →</button>}
              <button className="btn sm ghost" onClick={() => setSel(null)} aria-label="Close note fixer">Done</button>
            </div>
          </div>
          <div className="row" style={{ gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {altFrets.length > 0 && (
              <>
                <span className="muted">Likely:</span>
                {altFrets.map(f => (
                  <button key={f} className="btn sm primary" onClick={() => updateSelectedNote(n => ({ ...n, fret: f, tech: n.tech === 'x' ? undefined : n.tech }), true)} data-testid={`fix-alt-${f}`}>
                    Fret {f}
                  </button>
                ))}
              </>
            )}
            <span className="muted">Fret:</span>
            <button className="btn sm" disabled={selNote.tech !== 'x' && selNote.fret <= 0} onClick={() => updateSelectedNote(n => ({ ...n, fret: n.tech === 'x' ? 0 : Math.max(0, n.fret - 1), tech: n.tech === 'x' ? undefined : n.tech }))} data-testid="fix-fret-dn">−1</button>
            <button className="btn sm" disabled={selNote.tech !== 'x' && selNote.fret >= 24} onClick={() => updateSelectedNote(n => ({ ...n, fret: n.tech === 'x' ? 1 : Math.min(24, n.fret + 1), tech: n.tech === 'x' ? undefined : n.tech }))} data-testid="fix-fret-up">+1</button>
            <button className={`btn sm${selNote.tech === 'x' ? ' on' : ''}`} onClick={() => updateSelectedNote(n => (n.tech === 'x' ? { ...n, tech: undefined } : { ...n, fret: 0, tech: 'x' }), true)} data-testid="fix-tech-x" title="Set this note to x (muted / chuck)">x Mute</button>
            {selFlat.step.notes.length > 1 && (
              <button className="btn sm" onClick={muteSelectedStep} data-testid="fix-mute-all" title="Mark every string in this strum as x (muted chuck)">x Chuck chord</button>
            )}
            <span className="muted">String:</span>
            <button className="btn sm" disabled={selNote.string >= track.tuning.length - 1} onClick={() => updateSelectedNote(n => ({ ...n, string: Math.min(track.tuning.length - 1, n.string + 1) }))} data-testid="fix-str-up">↑ {strNames[selNote.string + 1] ?? ''}</button>
            <button className="btn sm" disabled={selNote.string <= 0} onClick={() => updateSelectedNote(n => ({ ...n, string: Math.max(0, n.string - 1) }))} data-testid="fix-str-dn">↓ {strNames[selNote.string - 1] ?? ''}</button>
            <span className="muted">Move:</span>
            {TECHS.map(tc => (
              <button key={tc} className={`btn sm${selNote.tech === tc ? ' on' : ' ghost'}`} onClick={() => updateSelectedNote(n => ({ ...n, tech: n.tech === tc ? undefined : tc }))} data-testid={`fix-tech-${tc}`}>
                {tc}
              </button>
            ))}
            <button className="btn sm danger" onClick={() => updateSelectedNote(() => null, true)} data-testid="fix-del">Delete note</button>
          </div>
        </div>
      )}
      <div className={selNote?.unsure && !isBusy ? 'scan-sel-unsure' : undefined}>
        <TabView track={track} mode="fret" flats={false} cursor={cur} playing={isBusy} states={statesRef.current} version={stateVer} spans={spans} marks={marks} strum={strumPattern(doc.song.strum) ?? null} meter={doc.song.meter ?? 4}
          onTap={(i, n) => {
            if (playing) start(i)
            else if (micMode === 'wait') {
              const wi = follow.idx.findIndex(fi => fi >= i)
              if (wi >= 0) { setWaitPos(wi); setFrom(follow.idx[wi]) }
            } else if (micMode === 'time') {
              setFrom(i)
            } else {
              setFrom(i)
              if (n && onChangeSong) {
                setPicOff(false)
                setSel({ flatIdx: i, string: n.string })
                if (n.tech !== 'x') audition(n.midi, n.string)
              }
            }
          }} />
      </div>
      {(!playTools || handOpen) && liveHand && liveHand.group.notes.some(n => n.fret > 0) && (
        <FingerBox
          where="scan"
          group={liveHand.group}
          next={liveHand.nextGroup}
          beatsToShift={liveHand.beatsToShift}
          expected={expected}
          nowNotes={liveHand.nowNotes}
          nextNotes={liveHand.nextNotes}
          holdNotes={liveHand.holdNotes}
          prePosition={liveHand.prePosition}
          cue={liveHand.cue}
          nStr={track.tuning.length}
          stringNames={strNames}
          onLoopShift={liveHand.nextGroup ? () => { const b = flat[liveHand.nextGroup!.from]?.bar ?? 0; const lp = { from: Math.max(0, b - 1), to: b }; setLoop(lp); start(flat.findIndex(f => f.bar === lp.from), lp) } : undefined}
        />
      )}
    </div>
  )
}

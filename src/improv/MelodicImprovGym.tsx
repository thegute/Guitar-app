// Melodic Improv Gym: KGuitar's live-listening real-time guitar improvisation studio.
// Combines Roy Ziv's Melodic Improv Trainer, Hexatonic MasterClass & Modes Navigator concepts + Paul Davids' melodic
// phrasing with KGuitar's live guitar mic/pedal listener, 53-style AI Band, Modal Root Drone, Course Backing Tracks,
// Dashcam Lick Saver, and BOTH Clean Stage View & Brandy Arcade View!
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { strumMachine, useStrumState } from '../audio/strumMachine'
import { audio, keepAwake } from '../audio/engine'
import { modalDrone } from '../audio/modalDrone'
import { playNote } from '../audio/pluck'
import { acquireListener, type ListenerSession } from '../engine/listener'
import { OnsetDetector } from '../learn/targets'
import { analyseImprov, type ImprovChord, type ImprovNote, type ImprovReport } from '../coach/improv'
import { Fretboard } from '../components/Fretboard'
import { Ico } from '../components/Icon'
import { BackingVolumeBar } from '../jam/BackingVolumeBar'
import { AIStyleDropdown } from '../jam/AIStyleDropdown'
import { composeAIStrumChart } from '../jam/aiComposer'
import { InYourCourses } from '../lessons/InYourCourses'
import {
  setCourseBackingForImprov,
  topicsForScale,
  useCourseBackingForImprov,
} from '../lessons/courseIndex'
import { mediaUrl } from '../lessons/folders'
import { useInstrument } from '../instrument'
import { usePersist } from '../components/Controls'
import { brandySprite } from '../art/samurai'
import { openImprovGym, openInPlay, onOpenImprov, takePendingImprov } from '../nav'
import { saveSong } from '../tabs/library'
import { chordInfo } from '../tabs/harmony'
import { KEYS, midiName, pc, SHARPS } from '../theory/notes'
import {
  MODE_COLOR_NOTES,
  PENTATONIC_TRICKS,
  SCALES,
  bbKingBoxInfo,
  scaleById,
  scaleInfo,
} from '../theory/scales'
import { addXp, usePracticeTimer } from '../learn/progress'
import { countUse } from '../usage'
import {
  IMPROV_GAMES,
  NECK_ZONES,
  applyGymJudgment,
  dashcamToSongDoc,
  directorCueForCycle,
  generateDuelCall,
  hexatonicArpeggios,
  initialGymScore,
  noteFitsZone,
  noteLimitPalette,
  spacePatternForBar,
  targetPcsForChord,
  trimDashcam,
  zoneForTeleporterStep,
  type DashcamNote,
  type DirectorFocus,
  type DuelNote,
  type GymScore,
  type ImprovGameId,
  type LimitRuleId,
  type TargetPreference,
} from './improvGym'

const QUICK_SCALES = [
  'minor hexatonic',
  'hexatonic blues',
  'major hexatonic',
  'minor pentatonic',
  'major pentatonic',
  'minor blues',
  'dorian',
  'lydian',
  'mixolydian',
  'aeolian',
  'phrygian',
  'major',
]

export function MelodicImprovGym({ compact = false }: { compact?: boolean }) {
  const inst = useInstrument()
  const st = useStrumState()
  const courseBacking = useCourseBackingForImprov()

  const [game, setGame] = usePersist<ImprovGameId>('improv:game', 'sniper')
  const [viewMode, setViewMode] = usePersist<'stage' | 'arcade'>('improv:view', 'arcade')
  const [scaleId, setScaleId] = usePersist<string>('improv:scale', 'minor hexatonic')
  const [styleId, setStyleId] = usePersist<string>('improv:style', 'melodic-rock-ballad')
  const [targetPref, setTargetPref] = usePersist<TargetPreference>('improv:targetPref', 'any')
  const [limitRule, setLimitRule] = usePersist<LimitRuleId>('improv:limitRule', '3notes')
  const [directorFocus, setDirectorFocus] = usePersist<DirectorFocus>('improv:dirFocus', 'all')
  const [barsPerCue, setBarsPerCue] = usePersist<number>('improv:barsPerCue', 2)
  const [showColor, setShowColor] = usePersist<boolean>('improv:showColor', true)
  const [showTrick, setShowTrick] = useState(false)
  const [showBB, setShowBB] = useState(false)
  const [twoNps, setTwoNps] = useState(false)

  // Live listening & scoring state
  const [listening, setListening] = useState(false)
  const [heardMidi, setHeardMidi] = useState<number | null>(null)
  const [score, setScore] = useState<GymScore>(initialGymScore)
  const [report, setReport] = useState<ImprovReport | null>(null)
  const [dashcam, setDashcam] = useState<DashcamNote[]>([])
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [cueSeed, setCueSeed] = useState(1)
  const [droneOn, setDroneOn] = useState(() => modalDrone.isPlaying())

  // Local Course MP3/WAV backing player state
  const courseAudioRef = useRef<HTMLAudioElement | null>(null)
  const [courseSpeed, setCourseSpeed] = useState(1)
  const [coursePlaying, setCoursePlaying] = useState(false)

  // Real-time beat/bar cycle counter (ticks smoothly whether backed by StrumMachine or metronome-free)
  const [cycleBar, setCycleBar] = useState(0)
  const prevStrumBarRef = useRef<number>(-1)
  const totalBarsPlayedRef = useRef<number>(0)
  const listenerRef = useRef<ListenerSession | null>(null)
  const onsetRef = useRef(new OnsetDetector())
  const soloNotesRef = useRef<ImprovNote[]>([])
  const dashcamRef = useRef<DashcamNote[]>([])
  const barActivityRef = useRef<{ notes: number[]; restNotes: number; barSeen: number }>({ notes: [], restNotes: 0, barSeen: -1 })
  const lastJudgedBarRef = useRef<number>(-1)
  const duelPlayedCycleRef = useRef<number>(-1)
  const startTimeRef = useRef<number>(0)

  usePracticeTimer('jam', st.playing || listening || coursePlaying, true)

  useEffect(() => modalDrone.subscribe(() => setDroneOn(modalDrone.isPlaying())), [])

  // Handle deep-links (e.g. from ScalesScreen "Melodic Improv Gym" button)
  const applyOpen = useCallback((o: ReturnType<typeof takePendingImprov>) => {
    if (!o) return
    if (o.scale) setScaleId(o.scale)
    if (o.game) setGame(o.game)
    if (o.key) {
      const minor = /minor|dorian|phrygian|aeolian|locrian|blues|hexatonic/i.test(o.scale ?? scaleId) && !/major/i.test(o.scale ?? scaleId)
      const built = composeAIStrumChart({ styleId, key: o.key, minor, songShape: 'loop', role: 'lead', seed: 1 })
      strumMachine.setChart(built.chart, { autoPlay: false })
    }
  }, [scaleId, setGame, setScaleId, styleId])

  useEffect(() => {
    applyOpen(takePendingImprov())
    return onOpenImprov(applyOpen)
  }, [applyOpen])

  const keyRoot = st.chart.tonic || 'A'
  const r = pc(keyRoot)
  const sInfo = useMemo(() => scaleInfo(keyRoot, scaleId), [keyRoot, scaleId])
  const sSet = useMemo(() => new Set(sInfo.pcs), [sInfo])
  const sDef = scaleById(scaleId)
  const colorMeta = MODE_COLOR_NOTES[scaleId]
  const colorPcs = useMemo(() => new Set((colorMeta?.semis ?? []).map(o => (r + o) % 12)), [colorMeta, r])
  const trick = PENTATONIC_TRICKS[scaleId]
  const trickPcs = useMemo(() => {
    if (!trick) return new Set<number>()
    const tr = (r + trick.shiftSemis) % 12
    return new Set([0, 3, 5, 7, 10].map(o => (tr + o) % 12))
  }, [trick, r])
  const bbBox = useMemo(() => bbKingBoxInfo(r, inst.midis), [r, inst.midis])
  const hexArps = useMemo(() => hexatonicArpeggios(keyRoot), [keyRoot])

  const gameMeta = IMPROV_GAMES.find(g => g.id === game) ?? IMPROV_GAMES[0]

  // Advance cumulative bar counter whenever StrumMachine moves to a new bar
  useEffect(() => {
    if (!st.playing) {
      prevStrumBarRef.current = -1
      return
    }
    if (st.countInLeft > 0) return
    if (st.barIdx !== prevStrumBarRef.current) {
      prevStrumBarRef.current = st.barIdx
      totalBarsPlayedRef.current += 1
      setCycleBar(totalBarsPlayedRef.current - 1)
    }
  }, [st.playing, st.barIdx, st.countInLeft])

  // Active cues & targets computed from current bar & game mode
  const cueStep = Math.floor(cycleBar / Math.max(1, barsPerCue))
  const nextCueStep = cueStep + 1
  const beatsLeftInBar = st.beatsPerBar - st.beat
  const barInCue = cycleBar % Math.max(1, barsPerCue)
  const warningSoon = st.playing && barInCue === Math.max(1, barsPerCue) - 1 && beatsLeftInBar <= 2

  const curTarget = useMemo(
    () => targetPcsForChord(st.currentChord, keyRoot, scaleId, targetPref),
    [st.currentChord, keyRoot, scaleId, targetPref],
  )
  const nextTarget = useMemo(
    () => targetPcsForChord(st.nextChord, keyRoot, scaleId, targetPref),
    [st.nextChord, keyRoot, scaleId, targetPref],
  )
  const curZone = useMemo(() => zoneForTeleporterStep(cueStep), [cueStep])
  const nextZone = useMemo(() => zoneForTeleporterStep(nextCueStep), [nextCueStep])
  const limitPalette = useMemo(
    () => (limitRule === '2notes' ? noteLimitPalette(keyRoot, scaleId, 2) : noteLimitPalette(keyRoot, scaleId, 3)),
    [keyRoot, scaleId, limitRule],
  )
  const spacePattern = useMemo(() => spacePatternForBar(cycleBar), [cycleBar])
  const curDirector = useMemo(() => directorCueForCycle(cueStep, directorFocus, cueSeed), [cueStep, directorFocus, cueSeed])
  const nextDirector = useMemo(() => directorCueForCycle(nextCueStep, directorFocus, cueSeed), [nextCueStep, directorFocus, cueSeed])
  const duelPhase: 'call' | 'response' = Math.floor(cycleBar / 2) % 2 === 0 ? 'call' : 'response'
  const duelCycle = Math.floor(cycleBar / 4)
  const duelCall: DuelNote[] = useMemo(
    () => generateDuelCall(keyRoot, scaleId, duelCycle + cueSeed),
    [keyRoot, scaleId, duelCycle, cueSeed],
  )
  const activeHexArpIdx = cycleBar % hexArps.length
  const activeHexArp = hexArps[activeHexArpIdx]

  // Play the band's 2-bar Call phrase automatically in Call & Response Duel mode!
  useEffect(() => {
    if (game !== 'duel' || !st.playing || st.countInLeft > 0) return
    if (duelPhase === 'call' && cycleBar % 4 === 0 && duelPlayedCycleRef.current !== duelCycle) {
      duelPlayedCycleRef.current = duelCycle
      const ctx = audio()
      const spb = 60 / Math.max(40, st.bpm)
      const t0 = ctx.currentTime + 0.04
      for (const n of duelCall) {
        playNote(n.midi, t0 + n.beat * spb, Math.max(0.25, n.durBeats * spb * 0.92))
      }
    }
  }, [game, st.playing, st.countInLeft, duelPhase, cycleBar, duelCycle, duelCall, st.bpm])

  // Judge completed bar/cue against live notes heard!
  const stateSnapRef = useRef({
    game, curTarget, curZone, limitRule, limitPalette, spacePattern, curDirector, duelPhase, sSet, keyRoot, st, activeHexArp,
  })
  stateSnapRef.current = {
    game, curTarget, curZone, limitRule, limitPalette, spacePattern, curDirector, duelPhase, sSet, keyRoot, st, activeHexArp,
  }

  useEffect(() => {
    if (!listening || !st.playing || st.countInLeft > 0) return
    if (cycleBar <= 0 || lastJudgedBarRef.current === cycleBar) return
    lastJudgedBarRef.current = cycleBar
    const act = barActivityRef.current
    const played = [...act.notes]
    const restBad = act.restNotes
    act.notes = []
    act.restNotes = 0

    if (!played.length && game !== 'limit') return
    const snap = stateSnapRef.current
    let ok = false
    let label = ''

    if (snap.game === 'sniper') {
      const targetSet = new Set(snap.curTarget.pcs)
      ok = played.some(m => targetSet.has(((m % 12) + 12) % 12))
      label = ok ? `Nailed ${snap.curTarget.label}!` : `Aim for ${snap.curTarget.label}`
    } else if (snap.game === 'teleporter') {
      ok = played.some(m => noteFitsZone(m, snap.curZone))
      label = ok ? `Teleported to ${snap.curZone.label}!` : `Jump into ${snap.curZone.label}`
    } else if (snap.game === 'limit') {
      if (snap.limitRule === 'space') {
        ok = played.length > 0 && restBad === 0
        label = ok ? 'Clean groove & space!' : restBad > 0 ? 'Keep Rest beats silent!' : 'Play on the green beats'
      } else {
        const pal = new Set(snap.limitPalette)
        const inPal = played.filter(m => pal.has(((m % 12) + 12) % 12)).length
        ok = played.length > 0 && inPal / played.length >= 0.7
        label = ok ? 'Sweet phrasing inside the limit!' : 'Stick to the glowing gold notes'
      }
    } else if (snap.game === 'duel') {
      if (snap.duelPhase === 'call') return // don't penalize while band is playing!
      const inScale = played.filter(m => snap.sSet.has(((m % 12) + 12) % 12)).length
      ok = played.length >= 2 && inScale / played.length >= 0.7
      label = ok ? 'Killer response!' : 'Answer the phrase in key'
    } else if (snap.game === 'director') {
      const cue = snap.curDirector
      if (cue.zone) ok = played.some(m => noteFitsZone(m, cue.zone!))
      else if (cue.requireSpace) ok = played.length > 0 && played.length <= 6
      else ok = played.some(m => snap.sSet.has(((m % 12) + 12) % 12))
      label = ok ? `${cue.badge} nailed!` : cue.title
    } else if (snap.game === 'hex-arps') {
      const arpSet = new Set(snap.activeHexArp.pcs)
      ok = played.some(m => arpSet.has(((m % 12) + 12) % 12))
      label = ok ? `${snap.activeHexArp.symbol} arpeggio hit!` : `Target ${snap.activeHexArp.symbol} notes`
    }

    setScore(prev => {
      const next = applyGymJudgment(prev, ok, label)
      if (ok && next.hits % 4 === 0) addXp(10)
      return next
    })
  }, [cycleBar, listening, st.playing, st.countInLeft, game])

  const stopListening = useCallback((buildReport = false) => {
    listenerRef.current?.stop()
    listenerRef.current = null
    setListening(false)
    setHeardMidi(null)
    void keepAwake(false)
    if (buildReport && soloNotesRef.current.length >= 4) {
      const snap = stateSnapRef.current
      const loopChords: ImprovChord[] = []
      let b = 0
      for (const bar of snap.st.chart.bars) {
        const seg = snap.st.beatsPerBar / bar.chords.length
        for (const sym of bar.chords) {
          const ci = chordInfo(sym)
          loopChords.push({ start: b, beats: seg, pcs: ci?.pcs ?? [pc(snap.keyRoot)], symbol: sym })
          b += seg
        }
      }
      const rep = analyseImprov(
        soloNotesRef.current,
        loopChords,
        Math.max(4, b),
        [...snap.sSet],
        `${snap.keyRoot} ${scaleById(scaleId).label}`,
      )
      setReport(rep)
    }
  }, [scaleId])

  useEffect(() => () => {
    listenerRef.current?.stop()
    courseAudioRef.current?.pause()
  }, [])

  async function toggleListening() {
    if (listening) {
      stopListening(true)
      return
    }
    setErr(''); setReport(null); setScore(initialGymScore())
    soloNotesRef.current = []
    barActivityRef.current = { notes: [], restNotes: 0, barSeen: -1 }
    lastJudgedBarRef.current = -1
    totalBarsPlayedRef.current = 0
    startTimeRef.current = audio().currentTime
    try {
      const pt = acquireListener('improv-coach', { autoGate: true, suppressBleed: true })
      const recordMidi = (midi: number, timeSec: number) => {
        setHeardMidi(midi)
        const snap = stateSnapRef.current
        const spb = 60 / Math.max(40, snap.st.bpm)
        const beat = Math.max(0, (timeSec - startTimeRef.current) / spb)
        const prev = soloNotesRef.current[soloNotesRef.current.length - 1]
        if (prev && Math.abs(prev.beat - beat) < 0.08 && prev.midi === midi) return
        soloNotesRef.current.push({ beat, midi })
        dashcamRef.current = trimDashcam([...dashcamRef.current, { midi, beat, atMs: Date.now() }])
        setDashcam(dashcamRef.current)
        barActivityRef.current.notes.push(midi)
        if (snap.game === 'limit' && snap.limitRule === 'space') {
          const beatInBar = snap.st.beat % 4
          if (snap.spacePattern[beatInBar] === 'rest') {
            barActivityRef.current.restNotes += 1
          }
        }
      }
      pt.onNote = e => recordMidi(e.midi, e.time - pt.latencySec())
      pt.onFrame = f => {
        const now = audio().currentTime - pt.latencySec()
        if (f.midi !== null) setHeardMidi(f.midi)
        const spb = 60 / Math.max(40, stateSnapRef.current.st.bpm)
        const o = onsetRef.current.feed(f.midi, (now - startTimeRef.current) / spb, f.level)
        if (o) recordMidi(o.midi, now)
      }
      await pt.start()
      listenerRef.current = pt
      setListening(true)
      void keepAwake(true)
      countUse('jam:improv-gym')
    } catch {
      setErr('Allow microphone / USB guitar access to grade your improv live (you can still jam visually without mic!).')
    }
  }

  function applyAIStyle(nextStyleId: string, nextKey = keyRoot) {
    setStyleId(nextStyleId)
    const built = composeAIStrumChart({ styleId: nextStyleId, key: nextKey, songShape: 'loop', role: 'lead', seed: cueSeed })
    strumMachine.setChart(built.chart, { autoPlay: st.playing })
    if (built.soloScale.scaleId === 'minor hexatonic' || QUICK_SCALES.includes(built.soloScale.scaleId)) {
      setScaleId(built.soloScale.scaleId)
    }
    setMsg(`Loaded ${built.style.label} in ${built.chart.tonic}${built.chart.minor ? 'm' : ''}`)
  }

  function replayDashcam() {
    if (!dashcam.length) { setMsg('Turn on Live Mic and play a phrase first to capture it!'); return }
    const ctx = audio()
    const spb = 60 / Math.max(40, st.bpm)
    const first = dashcam[0].beat
    const t0 = ctx.currentTime + 0.05
    dashcam.slice(-24).forEach((n, i) => {
      const dt = Math.min(8, Math.max(i * 0.25, (n.beat - first) * spb))
      playNote(n.midi, t0 + dt, 0.45)
    })
    setMsg(`Replaying your last ${Math.min(24, dashcam.length)} notes!`)
  }

  async function saveDashcamLick() {
    if (!dashcam.length) { setMsg('Turn on Live Mic and play a phrase first to save it!'); return }
    const doc = dashcamToSongDoc(dashcam, {
      key: keyRoot,
      scale: sDef.label,
      bpm: st.bpm,
      tuning: inst.midis,
      preferFret: Math.round((curZone.fromFret + curZone.toFret) / 2),
    })
    await saveSong(doc)
    setMsg(`Saved "${doc.title}" — opening in Play!`)
    openInPlay(doc)
  }

  // Sync local course MP3/WAV playback speed
  useEffect(() => {
    if (courseAudioRef.current) courseAudioRef.current.playbackRate = courseSpeed
  }, [courseSpeed])

  // Fretboard display zone & highlights
  const activeZone =
    game === 'teleporter'
      ? curZone
      : game === 'director' && curDirector.zone
        ? curDirector.zone
        : null

  const highlightPcs = useMemo(() => {
    if (game === 'sniper') return new Set(curTarget.pcs)
    if (game === 'limit' && (limitRule === '2notes' || limitRule === '3notes')) return new Set(limitPalette)
    if (game === 'hex-arps') return new Set(activeHexArp.pcs)
    if (game === 'director' && curDirector.preferTarget) {
      return new Set(targetPcsForChord(st.currentChord, keyRoot, scaleId, curDirector.preferTarget).pcs)
    }
    return new Set(chordInfo(st.currentChord)?.pcs ?? [r])
  }, [game, curTarget, limitRule, limitPalette, activeHexArp, curDirector, st.currentChord, keyRoot, scaleId, r])

  const nextLookPcs = useMemo(() => {
    if (game === 'sniper' && st.playing && beatsLeftInBar <= 2) return new Set(nextTarget.pcs)
    return null
  }, [game, st.playing, beatsLeftInBar, nextTarget])

  // Dynamic topics for "From your courses"
  const courseTopics = useMemo(
    () => [...new Set([...gameMeta.courseTopics, ...topicsForScale(scaleId)])],
    [gameMeta, scaleId],
  )

  // Live Cue Headline + Subtext for Stage & Arcade views
  const liveCue = useMemo(() => {
    if (game === 'sniper') {
      return {
        badge: `🎯 TARGET: ${curTarget.label.toUpperCase()}`,
        headline: `Land on ${curTarget.label} over ${st.currentChord}`,
        nextText: `Next: ${st.nextChord} → ${nextTarget.label}`,
      }
    }
    if (game === 'teleporter') {
      return {
        badge: warningSoon ? `⚡ GET READY → ZONE ${nextZone.boxNum}` : `🧭 ${curZone.label.toUpperCase()}`,
        headline: warningSoon ? `Slide to ${nextZone.label} on Beat 1!` : `Solo inside ${curZone.label}`,
        nextText: `Next jump: ${nextZone.label}`,
      }
    }
    if (game === 'limit') {
      if (limitRule === 'space') {
        return {
          badge: '🌬 PLAY & REST GROOVE',
          headline: 'Play on GREEN beats — freeze completely on REST beats!',
          nextText: spacePattern.map((x, i) => `${i + 1}:${x === 'play' ? 'PLAY' : 'REST'}`).join(' · '),
        }
      }
      if (limitRule === '1string') {
        return {
          badge: '🎸 SINGLE-STRING MELODY',
          headline: 'Play ONLY on the B string — use slides, bends & vibrato!',
          nextText: 'Horizontal phrasing kills robotic box patterns',
        }
      }
      const names = limitPalette.map(p => SHARPS[p]).join(' · ')
      return {
        badge: `🔥 ${limitRule === '2notes' ? '2-NOTE' : '3-NOTE'} LIMIT`,
        headline: `Only use: ${names} — make rhythm & bends do the talking!`,
        nextText: 'Every note counts when your palette is tiny',
      }
    }
    if (game === 'duel') {
      return {
        badge: duelPhase === 'call' ? '🎧 BAND CALL (LISTEN!)' : '🎸 YOUR RESPONSE (PLAY!)',
        headline: duelPhase === 'call' ? 'Listen to the 2-bar melodic phrase…' : `Answer the call in ${keyRoot} ${sDef.label} & land on ${st.currentChord}!`,
        nextText: duelPhase === 'call' ? 'Your turn comes right after this bar!' : 'Next 2-bar call coming up…',
      }
    }
    if (game === 'hex-arps') {
      return {
        badge: `✨ ARPEGGIO: ${activeHexArp.symbol} (${activeHexArp.roman})`,
        headline: `Outline ${activeHexArp.symbol} inside ${keyRoot} Minor Hexatonic`,
        nextText: `${activeHexArp.feel} · Next: ${hexArps[(activeHexArpIdx + 1) % hexArps.length].symbol}`,
      }
    }
    return {
      badge: curDirector.badge,
      headline: curDirector.title,
      nextText: `Next cue: ${nextDirector.title}`,
    }
  }, [
    game, curTarget, nextTarget, st.currentChord, st.nextChord, warningSoon, curZone, nextZone,
    limitRule, spacePattern, limitPalette, duelPhase, keyRoot, sDef.label, activeHexArp, hexArps,
    activeHexArpIdx, curDirector, nextDirector,
  ])

  const dashcamAccuracy = score.hits + score.misses > 0 ? Math.round((score.hits / (score.hits + score.misses)) * 100) : 0

  return (
    <div className={`improv-gym stack${compact ? ' compact' : ''}`} style={{ gap: compact ? 8 : 12 }} data-testid="improv-gym">
      {/* 1) Header + Stage / Arcade Toggle + Pop Out */}
      <div className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: compact ? '1rem' : '1.15rem' }}>🎯 Melodic Improv Gym</h2>
            {!compact && (
              <p className="small muted" style={{ margin: '2px 0 0' }}>
                {gameMeta.tagline}
              </p>
            )}
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <div className="improv-view-switch" role="group" aria-label="View style">
              <button
                className={`btn sm${viewMode === 'stage' ? ' primary' : ' ghost'}`}
                onClick={() => setViewMode('stage')}
                data-testid="improv-view-stage"
              >
                🎸 Clean Stage
              </button>
              <button
                className={`btn sm${viewMode === 'arcade' ? ' primary' : ' ghost'}`}
                onClick={() => setViewMode('arcade')}
                data-testid="improv-view-arcade"
              >
                🎮 Arcade / Brandy
              </button>
            </div>
            {!compact && (
              <button
                className="btn sm"
                onClick={() => openImprovGym()}
                title="Pop out as a floating opacity-adjustable window"
                data-testid="improv-popout-btn"
              >
                ⧉ Pop Out
              </button>
            )}
          </div>
        </div>

        {/* 6-Game Selector Bar */}
        <div className="row improv-game-tabs" style={{ gap: 6, flexWrap: 'wrap' }} data-testid="improv-game-tabs">
          {IMPROV_GAMES.map(g => (
            <button
              key={g.id}
              className={`btn sm${game === g.id ? ' primary' : ''}`}
              aria-pressed={game === g.id}
              onClick={() => { setGame(g.id); setScore(initialGymScore()); setReport(null) }}
              data-testid={`improv-game-${g.id}`}
            >
              {g.icon} {compact ? g.short : g.label}
            </button>
          ))}
        </div>

        {/* Transport + Live Mic + Modal Drone + Key / Scale / AI Style */}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className={`btn primary lg${st.playing ? ' on' : ''}`}
            onClick={() => {
              if (courseAudioRef.current && !courseAudioRef.current.paused) {
                courseAudioRef.current.pause(); setCoursePlaying(false)
              }
              strumMachine.toggle()
            }}
            data-testid="improv-play-btn"
          >
            <Ico n={st.playing ? 'stop' : 'play'} /> {st.playing ? (st.countInLeft > 0 ? `Count-in ${st.countInLeft}…` : 'Stop Band') : 'Play Band'}
          </button>

          <button
            className={`btn${listening ? ' primary on' : ''}`}
            aria-pressed={listening}
            onClick={() => void toggleListening()}
            data-testid="improv-listen-btn"
          >
            🎤 {listening ? 'Listening Live' : 'Listen & Grade'}
          </button>

          <button
            className={`btn sm${droneOn ? ' primary on' : ''}`}
            aria-pressed={droneOn}
            onClick={() => modalDrone.toggle(r, 'fifth')}
            title="Hold a Modal Root Drone instead of a full band"
            data-testid="improv-drone-btn"
          >
            🔊 {droneOn ? `Stop ${keyRoot} Drone` : `${keyRoot} Drone`}
          </button>

          <div className="row" style={{ gap: 4, alignItems: 'center' }}>
            <button className="btn sm" onClick={() => strumMachine.setBpm(st.bpm - 5)} aria-label="Slower">−5</button>
            <span className="badge">{st.bpm} BPM</span>
            <button className="btn sm" onClick={() => strumMachine.setBpm(st.bpm + 5)} aria-label="Faster">+5</button>
          </div>

          <label className="field" style={{ minWidth: 72 }}>
            <span>Key</span>
            <select
              className="select"
              value={keyRoot}
              onChange={e => {
                strumMachine.setKey(e.target.value)
                if (modalDrone.isPlaying()) modalDrone.setRoot(pc(e.target.value))
              }}
              data-testid="improv-key-select"
            >
              {KEYS.map(k => <option key={k} value={k}>{k}{st.chart.minor ? 'm' : ''}</option>)}
            </select>
          </label>

          <label className="field" style={{ minWidth: 175 }}>
            <span>Scale / Mode</span>
            <select
              className="select"
              value={scaleId}
              onChange={e => setScaleId(e.target.value)}
              data-testid="improv-scale-select"
            >
              {QUICK_SCALES.map(id => {
                const d = scaleById(id)
                return <option key={id} value={id}>{d.label}</option>
              })}
              <optgroup label="All Scales">
                {SCALES.filter(s => !QUICK_SCALES.includes(s.id)).map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </optgroup>
            </select>
          </label>

          <AIStyleDropdown
            styleId={styleId}
            compact
            testId="improv-ai-style"
            onChange={id => applyAIStyle(id)}
          />
        </div>

        {/* Isolated Backing Volume (never boosts your electric guitar pedal!) */}
        <BackingVolumeBar compact={compact} />

        {/* Optional Local Course Backing Track Bar (when launched via "🎵 Jam Track" from a connected course!) */}
        {courseBacking && (
          <div className="row improv-course-backing" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }} data-testid="improv-course-backing">
            <span className="small"><b>🎵 Course Backing:</b> {courseBacking.title}</span>
            <audio
              ref={courseAudioRef}
              src={mediaUrl(courseBacking.file.uri)}
              loop
              onPlay={() => setCoursePlaying(true)}
              onPause={() => setCoursePlaying(false)}
              controls
              style={{ height: 32, flex: '1 1 180px' }}
            />
            <select
              className="select sm"
              style={{ width: 'auto' }}
              value={courseSpeed}
              onChange={e => setCourseSpeed(Number(e.target.value))}
              aria-label="Backing track speed"
            >
              {[0.65, 0.75, 0.85, 0.95, 1, 1.1].map(sp => (
                <option key={sp} value={sp}>{Math.round(sp * 100)}%</option>
              ))}
            </select>
            <button className="btn sm ghost" onClick={() => setCourseBackingForImprov(null)} aria-label="Clear course backing">
              ✕
            </button>
          </div>
        )}

        {/* Per-Game Controls Row */}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {game === 'sniper' && (
            <>
              <span className="small muted">Target:</span>
              {([
                ['any', 'Any Chord Tone'],
                ['third', '3rds'],
                ['fifth', '5ths'],
                ['color', `Colour (${colorMeta?.label ?? '9th'})`],
              ] as [TargetPreference, string][]).map(([id, lbl]) => (
                <button key={id} className={`btn sm${targetPref === id ? ' primary' : ''}`} onClick={() => setTargetPref(id)}>
                  {lbl}
                </button>
              ))}
            </>
          )}
          {game === 'teleporter' && (
            <>
              <span className="small muted">Jump every:</span>
              {[1, 2, 4].map(n => (
                <button key={n} className={`btn sm${barsPerCue === n ? ' primary' : ''}`} onClick={() => setBarsPerCue(n)}>
                  {n} bar{n === 1 ? '' : 's'}
                </button>
              ))}
              <button className="btn sm" onClick={() => setCycleBar(b => b + barsPerCue)}>Skip Next Zone →</button>
            </>
          )}
          {game === 'limit' && (
            <>
              {([
                ['3notes', '3 Notes Only'],
                ['2notes', '2 Notes Only'],
                ['1string', '1 String (B)'],
                ['space', 'Play / Rest Space'],
              ] as [LimitRuleId, string][]).map(([id, lbl]) => (
                <button key={id} className={`btn sm${limitRule === id ? ' primary' : ''}`} onClick={() => setLimitRule(id)}>
                  {lbl}
                </button>
              ))}
            </>
          )}
          {game === 'director' && (
            <>
              <span className="small muted">Cue focus:</span>
              {([
                ['all', 'Mix All'],
                ['melody', 'Melody'],
                ['neck', 'Neck Freedom'],
                ['rhythm', 'Rhythm & Space'],
              ] as [DirectorFocus, string][]).map(([id, lbl]) => (
                <button key={id} className={`btn sm${directorFocus === id ? ' primary' : ''}`} onClick={() => setDirectorFocus(id)}>
                  {lbl}
                </button>
              ))}
              <button className="btn sm" onClick={() => setCueSeed(s => s + 1)}>🎲 New Cue</button>
            </>
          )}
          {game === 'hex-arps' && (
            <>
              <button className={`btn sm${twoNps ? ' primary' : ''}`} onClick={() => setTwoNps(v => !v)}>
                ⚡ 2-Notes-Per-String View
              </button>
              <button className={`btn sm${showBB ? ' primary' : ''}`} onClick={() => setShowBB(v => !v)}>
                🎸 B.B. King Box
              </button>
              <button className="btn sm" onClick={() => setCycleBar(b => b + 1)}>Next Arpeggio →</button>
            </>
          )}
          {game === 'duel' && (
            <button
              className="btn sm"
              onClick={() => {
                const ctx = audio()
                const spb = 60 / Math.max(40, st.bpm)
                duelCall.forEach(n => playNote(n.midi, ctx.currentTime + 0.04 + n.beat * spb, n.durBeats * spb * 0.9))
              }}
            >
              🔊 Preview Call Phrase
            </button>
          )}
          <button className={`btn sm${showColor ? ' primary' : ' ghost'}`} onClick={() => setShowColor(!showColor)}>
            💎 Colour Note
          </button>
          {trick && (
            <button className={`btn sm${showTrick ? ' primary' : ' ghost'}`} onClick={() => setShowTrick(v => !v)}>
              ✨ Pentatonic Trick
            </button>
          )}
        </div>
      </div>

      {/* 2) Live Stage Banner (Clean Stage OR Brandy Arcade View!) */}
      <div
        className={`panel improv-stage-card${viewMode === 'arcade' ? ' arcade' : ' clean'}${warningSoon ? ' warn' : ''}`}
        data-testid="improv-stage-card"
      >
        <div className="improv-stage-grid">
          {viewMode === 'arcade' && (
            <div className="improv-brandy-box" data-testid="improv-brandy-hud">
              <img
                src={brandySprite(score.mood)}
                alt="Brandy"
                className={`improv-brandy-img mood-${score.mood}`}
              />
              <div className="improv-arcade-stats">
                <span className="improv-score-pts">{score.points.toLocaleString()} XP</span>
                <span className={`improv-combo${score.multiplier >= 5 ? ' fever' : ''}`}>
                  {score.multiplier >= 5 ? '🔥 5× FEVER!' : `${score.multiplier}× · Streak ${score.streak}`}
                </span>
                <span className="small muted">
                  {score.hits} hits · {dashcamAccuracy}%
                </span>
              </div>
            </div>
          )}

          <div className="improv-cue-center stack" style={{ gap: 6 }}>
            <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="improv-cue-badge">{liveCue.badge}</span>
              <span className="improv-chord-now" data-testid="improv-chord-now">
                {st.currentChord}
              </span>
              <span className="small muted">→ {st.nextChord}</span>
              {heardMidi !== null && (
                <span className="badge" data-testid="improv-heard">
                  🎸 {midiName(heardMidi)}
                </span>
              )}
            </div>

            <div className="improv-cue-headline" data-testid="improv-cue-headline">
              {liveCue.headline}
            </div>
            <div className="small muted">{liveCue.nextText}</div>

            {/* Visual Beat Lights (or Play / Rest Rhythm Grid in Space Mode!) */}
            <div className="row improv-beat-lights" style={{ gap: 6, marginTop: 2 }}>
              {Array.from({ length: st.beatsPerBar }, (_, bi) => {
                const activeBeat = st.playing && st.countInLeft === 0 && st.beat === bi
                const isSpace = game === 'limit' && limitRule === 'space'
                const kind = isSpace ? spacePattern[bi % 4] : 'play'
                return (
                  <span
                    key={bi}
                    className={`improv-beat-pill${activeBeat ? ' now' : ''}${isSpace ? ` ${kind}` : ''}`}
                  >
                    {isSpace ? (kind === 'play' ? `▶ ${bi + 1}` : `🤫 REST`) : bi + 1}
                  </span>
                )
              })}
            </div>

            {score.lastBanner && viewMode === 'arcade' && (
              <div className="improv-feedback-banner" role="status">
                {score.lastBanner}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3) Live Glowing Fretboard + Dashcam Save Bar */}
      <div className="panel stack" style={{ gap: 8 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <strong className="small">
            {keyRoot} {sDef.label}
            {activeZone ? ` · Active: ${activeZone.label}` : ''}
          </strong>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button className="btn sm" onClick={replayDashcam} disabled={!dashcam.length} data-testid="improv-dashcam-replay">
              ▶ Replay Last Lick ({dashcam.length})
            </button>
            <button className="btn sm primary" onClick={() => void saveDashcamLick()} disabled={!dashcam.length} data-testid="improv-dashcam-save">
              💾 Save Lick to Play
            </button>
          </div>
        </div>

        <Fretboard
          tuning={inst.midis}
          fromFret={0}
          toFret={15}
          compact={compact}
          markFor={(midi, s, f) => {
            const q = ((midi % 12) + 12) % 12
            if (heardMidi !== null && midi === heardMidi) {
              return { label: sInfo.labels.get(q) ?? SHARPS[q], role: 'live' }
            }
            if (game === 'limit' && limitRule === '1string' && s !== Math.max(0, inst.midis.length - 2)) {
              return null
            }
            if (game === 'director' && curDirector.singleString !== undefined && s !== curDirector.singleString) {
              return null
            }
            if (showBB && bbBox.match(midi, s, f)) {
              return { label: sInfo.labels.get(q) ?? SHARPS[q], role: q === r ? 'root' : 'chord' }
            }
            if (!sSet.has(q)) return null
            if (twoNps && activeZone) {
              // 2-notes-per-string visual trim inside active zone
              if (f < activeZone.fromFret || f > activeZone.toFret + 2) return { label: '', role: 'ghost' }
            }
            const label = sInfo.labels.get(q) ?? SHARPS[q]
            const inZone = !activeZone || (f >= activeZone.fromFret && f <= activeZone.toFret)
            if (!inZone) return { label, role: 'ghost' }
            if (nextLookPcs && nextLookPcs.has(q)) return { label, role: 'next' }
            if (q === r) return { label, role: 'root' }
            if (highlightPcs.has(q)) return { label, role: game === 'hex-arps' ? 'triad' : 'chord' }
            if (showColor && colorPcs.has(q)) return { label, role: 'pass' }
            if (showTrick && trickPcs.has(q)) return { label, role: 'embel' }
            return { label, role: 'scale' }
          }}
          onTap={midi => playNote(midi)}
        />

        <p className="small muted" style={{ margin: 0 }}>
          Red = Root · Gold = Target / Chord Tone · Cyan = Colour Note · Mint = Heard / Next Chord · Tap any dot to hear it.
        </p>

        {err && <p className="small" style={{ margin: 0, color: 'var(--bad)' }}>{err}</p>}
        {msg && <p className="small muted" style={{ margin: 0 }} role="status">{msg}</p>}
      </div>

      {/* 4) End-of-Solo Report Card (after stopping Live Listen) */}
      {report && (
        <div className="panel stack" style={{ gap: 6, borderLeft: '3px solid var(--accent)' }} data-testid="improv-report">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>🏆 Solo Coach Report</strong>
            <button className="btn sm ghost" onClick={() => setReport(null)}>✕</button>
          </div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <span className="badge">In-Key: {report.inKey}%</span>
            <span className="badge">Landings: {report.landed}/{report.changes}</span>
            <span className="badge">Space: {report.space}%</span>
            <span className="badge">Range: {report.range} frets</span>
            <span className="badge">Motifs: {report.motifs}</span>
          </div>
          {report.good && <p className="small" style={{ margin: 0, color: 'var(--ok, #10b981)' }}>✓ {report.good}</p>}
          <p className="small" style={{ margin: 0 }}>→ {report.say}</p>
        </div>
      )}

      {/* 5) Automatic Matching Video Clips From Your Connected Roy Ziv / Paul Davids / Matteo Mancuso Courses! */}
      {!compact && (
        <div className="panel">
          <InYourCourses
            topics={courseTopics}
            title={`Courses for ${gameMeta.label} & ${sDef.label}`}
            max={6}
            showEmptyHint
          />
        </div>
      )}
    </div>
  )
}

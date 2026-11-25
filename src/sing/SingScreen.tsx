// KGuitar "Sing" Tab — Full Vocal Coach, 10-Module YouTube Video Course, Dual-Mode Song Studio
// (Transpose to Your Key OR Auto-Harmony in Original Key), Swiftscales Piano Workouts,
// Brandy Vocal Game Mode, Floating Singing Bubbles, and My Voice Profile!
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { ChromeBar } from '../components/ChromeBar'
import { youtubeId } from '../tabs/library'
import { isolate } from '../ml/voice'
import { ALL_SING_LESSONS, nextUnfinishedLesson } from './course'
import {
  addVocalSeconds,
  classifyVoiceType,
  formatRange,
  recordVocalStat,
  updateSingProfile,
  useSingProfile,
} from './profile'
import {
  detectSongKeyAndChords,
  extractVocalMelody,
  midiToNoteName,
  pitchErrorCents,
  recommendCapoForKey,
  recommendedKeyShift,
  shiftChords,
  type VocalFrame,
} from './vocalEngine'
import { buildHarmonyLine, HARMONY_LABELS, type HarmonyMode } from './harmony'
import {
  deleteSingSong,
  listSingSongs,
  loadSongAudio,
  makeBuiltInStarterSongs,
  newSingId,
  onSingSongsChange,
  parseLyricsText,
  patchSingSong,
  saveSongAudio,
  upsertSingSong,
  type CoachPinKind,
  type SingSongMeta,
} from './songStore'
import { SingSongPlayer, type SongMixState } from './songPlayer'
import { VocalMicSession } from './micSession'
import { PianoWorkoutRunner, WORKOUT_PATTERNS, playCoachPiano } from './pianoCoach'
import { VocalTrackerCanvas, type TrailPoint } from './VocalTrackerCanvas'
import {
  VocalGameCanvas,
  buildMiniGameNotes,
  type VocalGameStats,
  type VocalMiniGameId,
} from './VocalGameCanvas'
import { LessonView } from './LessonView'
import { SingBubbles } from './SingBubbles'

export type SingSubTab = 'home' | 'lessons' | 'songs' | 'workouts' | 'game' | 'voice'

const SUB_TABS: { id: SingSubTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'lessons', label: 'Lessons', icon: '🎓' },
  { id: 'songs', label: 'Songs', icon: '🎵' },
  { id: 'workouts', label: 'Workouts', icon: '🎹' },
  { id: 'game', label: 'Game', icon: '🎮' },
  { id: 'voice', label: 'My Voice', icon: '📈' },
]

export function SingScreen() {
  const profile = useSingProfile()
  const [sub, setSub] = useState<SingSubTab>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('kg:sub:sing') ?? '"home"') as SingSubTab
      return SUB_TABS.some(t => t.id === saved) ? saved : 'home'
    } catch {
      return 'home'
    }
  })

  const switchSub = (next: SingSubTab) => {
    setSub(next)
    try { localStorage.setItem('kg:sub:sing', JSON.stringify(next)) } catch { /* private */ }
  }

  // Listen for deep-links (e.g. ShareInbox → "🎤 Practice Singing" with YouTube URL!)
  const [ytInput, setYtInput] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState(() => nextUnfinishedLesson(profile.doneLessons).id)

  // Live Vocal Mic Session (shared across all Sing sub-tabs)
  const micRef = useRef<VocalMicSession | null>(null)
  const [micOn, setMicOn] = useState(false)
  const [micErr, setMicErr] = useState('')
  const [frame, setFrame] = useState<VocalFrame | null>(null)

  // Songs Library + Built-in Public-Domain Practice Starters (user overrides replace starter defaults cleanly)
  const [userSongs, setUserSongs] = useState<SingSongMeta[]>(() => listSingSongs())
  const starters = useMemo(() => makeBuiltInStarterSongs(), [])
  const allSongs = useMemo(() => {
    const seen = new Set(userSongs.map(s => s.id))
    return [...userSongs, ...starters.filter(s => !seen.has(s.id))]
  }, [userSongs, starters])
  const [activeSongId, setActiveSongId] = useState<string>(() => listSingSongs()[0]?.id ?? starters[0].id)
  const activeSong = useMemo(() => allSongs.find(s => s.id === activeSongId) ?? starters[0], [allSongs, activeSongId, starters])

  // Streaming Song Player + Mix state
  const playerRef = useRef<SingSongPlayer | null>(null)
  const [mix, setMix] = useState<SongMixState>({
    playing: false,
    time: 0,
    duration: activeSong.duration,
    shiftSemis: activeSong.shiftSemis,
    speed: activeSong.speed,
    backingVol: 0.85,
    singerVol: 0.55,
    harmonyGuideVol: activeSong.harmonyMode === 'off' ? 0 : 0.5,
    ghostGuide: false,
    loopA: null,
    loopB: null,
    streamingStretch: false,
  })
  const [busyMsg, setBusyMsg] = useState('')
  const [songTrail, setSongTrail] = useState<TrailPoint[]>([])
  const [lyricsOpen, setLyricsOpen] = useState(false)
  const [lyricsDraft, setLyricsDraft] = useState('')

  // Workouts tab state
  const workoutRunnerRef = useRef<PianoWorkoutRunner | null>(null)
  const [workoutId, setWorkoutId] = useState(WORKOUT_PATTERNS[0].id)
  const [workoutBpm, setWorkoutBpm] = useState(WORKOUT_PATTERNS[0].defaultBpm)
  const [workoutActive, setWorkoutActive] = useState(false)
  const [workoutTarget, setWorkoutTarget] = useState<number | null>(null)
  const [workoutLead, setWorkoutLead] = useState<number | null>(null)
  const [workoutRep, setWorkoutRep] = useState({ rep: 0, total: 0 })
  const [freeTrail, setFreeTrail] = useState<TrailPoint[]>([])

  // Brandy Vocal Game Mode state
  const [gameMode, setGameMode] = useState<VocalMiniGameId>('sniper')
  const [gameRunning, setGameRunning] = useState(false)
  const [gameTime, setGameTime] = useState(0)
  const [gameStats, setGameStats] = useState<VocalGameStats>({
    score: 0,
    streak: 0,
    bestStreak: 0,
    mult: 1,
    hits: 0,
    misses: 0,
    vibratoBonus: 0,
    callout: '',
  })
  const gameRafRef = useRef(0)
  const gameStartRef = useRef(0)
  const lastScoredNoteIdx = useRef(-1)

  // Listen to singSongs store updates + external navigation events
  useEffect(() => onSingSongsChange(() => setUserSongs(listSingSongs())), [])

  useEffect(() => {
    const onSub = (e: Event) => {
      const d = (e as CustomEvent<{ screen?: string; page?: string }>).detail
      if (d?.screen === 'sing' && d.page && SUB_TABS.some(t => t.id === d.page)) {
        setSub(d.page as SingSubTab)
      }
    }
    const onOpenYt = (e: Event) => {
      const url = (e as CustomEvent<{ url?: string; title?: string }>).detail?.url
      if (url) {
        addYoutubePracticeSong(url)
        switchSub('songs')
      }
    }
    window.addEventListener('kg-subpage', onSub)
    window.addEventListener('kg-sing-youtube', onOpenYt)
    // Also check pending shared YouTube URL in localStorage
    try {
      const pending = localStorage.getItem('kg:singPendingYt')
      if (pending) {
        localStorage.removeItem('kg:singPendingYt')
        addYoutubePracticeSong(JSON.parse(pending) as string)
        switchSub('songs')
      }
    } catch { /* ignore */ }
    return () => {
      window.removeEventListener('kg-subpage', onSub)
      window.removeEventListener('kg-sing-youtube', onOpenYt)
    }
  }, [])

  // Stop background audio cleanly when switching Sing sub-tabs
  useEffect(() => {
    if (sub !== 'game' && gameRunning) {
      setGameRunning(false)
      if (gameRafRef.current) { cancelAnimationFrame(gameRafRef.current); gameRafRef.current = 0 }
    }
    if (sub !== 'workouts' && workoutActive) {
      workoutRunnerRef.current?.stop()
      setWorkoutActive(false)
      setWorkoutTarget(null)
      setWorkoutLead(null)
    }
    if (sub !== 'songs' && sub !== 'game' && mix.playing) {
      playerRef.current?.pause()
    }
  }, [sub])

  // Cleanup audio & mic on unmount
  useEffect(() => {
    return () => {
      micRef.current?.stop()
      playerRef.current?.stop()
      workoutRunnerRef.current?.stop()
      if (gameRafRef.current) cancelAnimationFrame(gameRafRef.current)
    }
  }, [])

  // Compute active target notes & harmony notes & chords/capo for activeSong
  const isHarmonyMode = activeSong.harmonyMode !== 'off'
  const shiftedLead = useMemo(
    () => activeSong.notes.map(n => ({ ...n, midi: n.midi + (isHarmonyMode ? 0 : mix.shiftSemis) })),
    [activeSong.notes, isHarmonyMode, mix.shiftSemis],
  )
  const harmonyRes = useMemo(
    () =>
      buildHarmonyLine(activeSong.notes, {
        mode: activeSong.harmonyMode,
        keyRoot: activeSong.keyRoot,
        keyMinor: activeSong.keyMinor,
        chords: activeSong.chords,
        comfortLow: profile.comfortLow,
        comfortHigh: profile.comfortHigh,
      }),
    [activeSong, profile.comfortLow, profile.comfortHigh],
  )
  const activeTargets = isHarmonyMode ? harmonyRes.notes : shiftedLead
  const effectiveShift = isHarmonyMode ? 0 : mix.shiftSemis
  const activeChords = useMemo(() => shiftChords(activeSong.chords, effectiveShift), [activeSong.chords, effectiveShift])
  const capoAdvice = useMemo(
    () => recommendCapoForKey(activeSong.keyRoot, activeSong.keyMinor, effectiveShift),
    [activeSong.keyRoot, activeSong.keyMinor, effectiveShift],
  )
  const keyShiftRec = useMemo(
    () => recommendedKeyShift(activeSong.minMidi, activeSong.maxMidi, profile.comfortLow, profile.comfortHigh),
    [activeSong.minMidi, activeSong.maxMidi, profile.comfortLow, profile.comfortHigh],
  )

  // Current & Next chord for the Capo Floating Bubble
  const curChordIdx = activeChords.findIndex(c => mix.time >= c.t0 && mix.time <= c.t1)
  const currentChord = curChordIdx >= 0 ? activeChords[curChordIdx] : activeChords[0] ?? null
  const nextChord = curChordIdx >= 0 ? activeChords[curChordIdx + 1] ?? activeChords[0] ?? null : activeChords[1] ?? null

  // Load activeSong into SingSongPlayer whenever song changes
  useEffect(() => {
    const player = playerRef.current ?? new SingSongPlayer()
    playerRef.current = player
    const unsub = player.onChange(setMix)
    let cancelled = false

    void (async () => {
      const audioRec = await loadSongAudio(activeSong.id)
      if (cancelled) return
      const backing: [Float32Array, Float32Array] | null = audioRec
        ? [audioRec.backingL ?? audioRec.mixL, audioRec.backingR ?? audioRec.mixR]
        : null
      const vocal: [Float32Array, Float32Array] | null = audioRec?.vocalL && audioRec.vocalR
        ? [audioRec.vocalL, audioRec.vocalR]
        : null
      player.load({
        duration: activeSong.duration,
        sr: audioRec?.sr ?? 44100,
        backing,
        vocal,
        melody: activeSong.notes,
        harmony: activeSong.harmonyMode === 'off' ? [] : harmonyRes.notes,
        chords: activeSong.chords,
        shiftSemis: activeSong.harmonyMode === 'off' ? activeSong.shiftSemis : 0,
        speed: activeSong.speed,
      })
      player.setMix({
        harmonyGuideVol: activeSong.harmonyMode === 'off' ? 0 : 0.52,
      })
      setSongTrail([])
    })()

    return () => {
      cancelled = true
      unsub()
    }
  }, [activeSong.id, activeSong.stemsReady])

  // Keep player's harmony/lead guides synced when user switches Harmony mode
  useEffect(() => {
    playerRef.current?.updateGuides(activeSong.notes, isHarmonyMode ? harmonyRes.notes : [], activeSong.chords)
    if (isHarmonyMode && mix.shiftSemis !== 0) {
      playerRef.current?.setMix({ shiftSemis: 0, harmonyGuideVol: Math.max(0.45, mix.harmonyGuideVol) })
    }
  }, [activeSong.harmonyMode, harmonyRes.notes, isHarmonyMode])

  // Build active Vocal Game notes (either Song Arcade OR one of the 5 Mini-Games!)
  const gameSpec = useMemo(() => {
    if (gameMode === 'song') {
      return {
        targets: activeTargets,
        lead: isHarmonyMode ? activeSong.notes : undefined,
        duration: activeSong.duration,
      }
    }
    return buildMiniGameNotes(gameMode, profile.lowMidi, profile.highMidi, profile.passaggioMidi)
  }, [gameMode, activeTargets, isHarmonyMode, activeSong, profile.lowMidi, profile.highMidi, profile.passaggioMidi])

  // Start / stop live vocal microphone session
  const toggleMic = async () => {
    if (micOn) {
      micRef.current?.stop()
      setMicOn(false)
      setFrame(null)
      return
    }
    setMicErr('')
    const sess = micRef.current ?? new VocalMicSession()
    micRef.current = sess
    sess.onError = msg => { setMicErr(msg); setMicOn(false) }
    sess.onFrame = f => {
      setFrame(f)
    }
    const ok = await sess.start()
    setMicOn(ok)
  }

  // Feed live vocal frames into Song Tracker, Ghost Guide, Workouts Trail, and Brandy Game Scoring!
  useEffect(() => {
    if (!frame) return

    // 1. Songs Tracker + Ghost Guide
    if (sub === 'songs') {
      const t = mix.playing ? mix.time : frame.t
      const activeNote = activeTargets.find(n => t >= n.t0 - 0.06 && t <= n.t1 + 0.06) ?? null
      if (micRef.current) micRef.current.targetMidi = activeNote?.midi ?? null
      const err = activeNote ? pitchErrorCents(frame, activeNote.midi) : null
      playerRef.current?.reportLiveErrorCents(err === null ? null : Math.abs(err))
      setSongTrail(prev => {
        const next = [
          ...prev,
          {
            t,
            midi: frame.centerMidi ?? frame.midi,
            level: frame.level,
            errCents: err,
            vibrato: frame.vibrato.active && frame.vibrato.quality === 'smooth',
            scoop: frame.flags.includes('scoop'),
            sag: frame.flags.includes('sag'),
          },
        ]
        while (next.length && next.length > 260) next.shift()
        return next
      })
    }

    // 2. Workouts Free Pitch/Tone Monitor trail
    if (sub === 'workouts') {
      const err = workoutTarget !== null ? pitchErrorCents(frame, workoutTarget) : null
      setFreeTrail(prev => {
        const next = [
          ...prev,
          {
            t: frame.t,
            midi: frame.centerMidi ?? frame.midi,
            level: frame.level,
            errCents: err,
            vibrato: frame.vibrato.active && frame.vibrato.quality === 'smooth',
            scoop: frame.flags.includes('scoop'),
            sag: frame.flags.includes('sag'),
          },
        ]
        while (next.length && frame.t - next[0].t > 7.5) next.shift()
        return next
      })
    }

    // 3. Brandy Vocal Game Mode Live Scoring
    if (sub === 'game' && gameRunning) {
      const idx = gameSpec.targets.findIndex(n => gameTime >= n.t0 && gameTime <= n.t1)
      if (idx >= 0 && idx !== lastScoredNoteIdx.current) {
        const target = gameSpec.targets[idx]
        const err = pitchErrorCents(frame, target.midi)
        if (err !== null && gameTime - target.t0 > 0.14) {
          lastScoredNoteIdx.current = idx
          const abs = Math.abs(err)
          const smoothVib = frame.vibrato.active && frame.vibrato.quality === 'smooth'
          if (abs <= 38) {
            setGameStats(s => {
              const streak = s.streak + 1
              const mult = streak >= 12 ? 5 : streak >= 8 ? 4 : streak >= 4 ? 3 : streak >= 2 ? 2 : 1
              const pts = (abs <= 18 ? 200 : 120) * mult + (smoothVib ? 150 : 0)
              return {
                ...s,
                score: s.score + pts,
                streak,
                bestStreak: Math.max(s.bestStreak, streak),
                mult,
                hits: s.hits + 1,
                vibratoBonus: s.vibratoBonus + (smoothVib ? 1 : 0),
                callout: smoothVib ? `✨ VIBRATO +${pts}!` : abs <= 18 ? `🎯 PERFECT +${pts}!` : `✓ GREAT +${pts}`,
              }
            })
          } else if (abs >= 65) {
            setGameStats(s => ({
              ...s,
              streak: 0,
              mult: 1,
              misses: s.misses + 1,
              callout: err < 0 ? '💥 OUCH! FLAT!' : '💥 OUCH! SHARP!',
            }))
          }
        }
      }
    }
  }, [frame, sub, mix.playing, mix.time, activeTargets, workoutTarget, gameRunning, gameTime, gameSpec.targets])

  // Game Mode clock loop (plays piano/harmony cue tones for each target beam!)
  const startGame = async () => {
    if (!micOn) await toggleMic()
    if (gameMode === 'song') {
      void playerRef.current?.play(0)
    }
    lastScoredNoteIdx.current = -1
    setGameStats({ score: 0, streak: 0, bestStreak: 0, mult: 1, hits: 0, misses: 0, vibratoBonus: 0, callout: '🎤 SING!' })
    gameStartRef.current = performance.now() / 1000
    setGameRunning(true)
    let lastCue = -1
    const step = () => {
      const elapsed = performance.now() / 1000 - gameStartRef.current
      if (elapsed >= gameSpec.duration) {
        setGameRunning(false)
        setGameTime(0)
        playerRef.current?.stop()
        recordVocalStat(85, 0, 1)
        return
      }
      setGameTime(elapsed)
      // Sound helpful reference pitch on mini-games so the singer hears the targets!
      if (gameMode !== 'song') {
        const idx = gameSpec.targets.findIndex(n => elapsed >= n.t0 && elapsed <= n.t1)
        if (idx >= 0 && idx !== lastCue) {
          lastCue = idx
          const n = gameSpec.targets[idx]
          if (gameMode === 'harmony' && gameSpec.lead?.[idx]) {
            playCoachPiano(gameSpec.lead[idx].midi, Math.max(0.4, n.t1 - n.t0), 0.34)
          } else {
            playCoachPiano(n.midi, Math.max(0.35, (n.t1 - n.t0) * 0.5), 0.28)
          }
        }
      }
      gameRafRef.current = requestAnimationFrame(step)
    }
    gameRafRef.current = requestAnimationFrame(step)
  }

  const stopGame = () => {
    setGameRunning(false)
    if (gameRafRef.current) { cancelAnimationFrame(gameRafRef.current); gameRafRef.current = 0 }
    if (gameMode === 'song') playerRef.current?.stop()
  }

  // Upload MP3 / WAV / M4A -> decode -> extract melody + detect chords/key -> save in IndexedDB!
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusyMsg(`Decoding "${file.name}"…`)
    try {
      const ab = await file.arrayBuffer()
      const ctx = new AudioContext()
      const decoded = await ctx.decodeAudioData(ab.slice(0))
      const sr = decoded.sampleRate
      const L = decoded.getChannelData(0).slice()
      const R = decoded.numberOfChannels > 1 ? decoded.getChannelData(1).slice() : L.slice()
      await ctx.close()

      setBusyMsg('Mapping vocal melody, chords & hard spots…')
      const mono = new Float32Array(L.length)
      for (let i = 0; i < L.length; i++) mono[i] = 0.5 * (L[i] + R[i])

      const mel = extractVocalMelody(mono, sr)
      const ch = detectSongKeyAndChords(mono, sr)
      const rec = recommendedKeyShift(mel.minMidi, mel.maxMidi, profile.comfortLow, profile.comfortHigh)

      const id = newSingId()
      const meta: SingSongMeta = {
        id,
        title: file.name.replace(/\.[^.]+$/, ''),
        source: 'upload',
        createdAt: Date.now(),
        duration: decoded.duration,
        stemsReady: false,
        analyzed: true,
        minMidi: mel.minMidi,
        maxMidi: mel.maxMidi,
        tessituraLow: mel.tessituraLow,
        tessituraHigh: mel.tessituraHigh,
        keyRoot: ch.keyRoot,
        keyMinor: ch.keyMinor,
        notes: mel.notes,
        hardSpots: mel.hardSpots,
        chords: ch.chords,
        shiftSemis: rec.semis,
        harmonyMode: 'off',
        speed: 1,
        pins: [],
        lyrics: [],
      }
      await saveSongAudio({ id, sr, mixL: L, mixR: R })
      upsertSingSong(meta)
      setActiveSongId(id)
      setBusyMsg('')
    } catch (err) {
      setBusyMsg(`Could not decode audio: ${err instanceof Error ? err.message : 'unsupported file'}`)
    }
  }

  // Run on-device HT-Demucs AI Vocal Separation (caches stereo Vocals + stereo Backing Band in IDB!)
  const handleIsolateVocals = async () => {
    const audioRec = await loadSongAudio(activeSong.id)
    if (!audioRec) {
      setBusyMsg('Upload an MP3/WAV/M4A file first to split vocals & backing band on-device!')
      return
    }
    setBusyMsg('Starting on-device HT-Demucs vocal separation…')
    try {
      const res = await isolate([audioRec.mixL, audioRec.mixR], audioRec.sr, {
        onProgress: (_f, note) => setBusyMsg(note),
      })
      const [vl, vr] = res.voice
      const [bl, br] = res.rest
      await saveSongAudio({
        ...audioRec,
        sr: res.sr,
        mixL: audioRec.mixL,
        mixR: audioRec.mixR,
        vocalL: vl,
        vocalR: vr,
        backingL: bl,
        backingR: br,
      })
      // Re-extract crystal-clear melody from the ISOLATED vocal stem & chords from the BACKING band!
      setBusyMsg('Re-mapping crystal-clear vocal melody from isolated vocals…')
      const vocalMono = new Float32Array(vl.length)
      const backMono = new Float32Array(bl.length)
      for (let i = 0; i < vl.length; i++) {
        vocalMono[i] = 0.5 * (vl[i] + vr[i])
        backMono[i] = 0.5 * (bl[i] + br[i])
      }
      const mel = extractVocalMelody(vocalMono, res.sr)
      const ch = detectSongKeyAndChords(backMono, res.sr)
      patchSingSong(activeSong.id, {
        stemsReady: true,
        minMidi: mel.minMidi,
        maxMidi: mel.maxMidi,
        tessituraLow: mel.tessituraLow,
        tessituraHigh: mel.tessituraHigh,
        notes: mel.notes,
        hardSpots: mel.hardSpots,
        keyRoot: ch.keyRoot,
        keyMinor: ch.keyMinor,
        chords: ch.chords,
      })
      setBusyMsg('')
    } catch (err) {
      setBusyMsg(`Vocal split paused: ${err instanceof Error ? err.message : 'cancelled'}`)
    }
  }

  // Add a YouTube / YouTube Music link into Sing Songs!
  const addYoutubePracticeSong = (rawUrl?: string) => {
    const url = (rawUrl ?? ytInput).trim()
    const yid = youtubeId(url)
    if (!yid) {
      setBusyMsg('Paste a valid YouTube or YouTube Music link (youtube.com, music.youtube.com, or youtu.be).')
      return
    }
    const id = newSingId()
    const meta: SingSongMeta = {
      id,
      title: `YouTube Track (${yid})`,
      source: 'youtube',
      youtubeUrl: url,
      youtubeId: yid,
      createdAt: Date.now(),
      duration: 210,
      stemsReady: false,
      analyzed: false,
      minMidi: profile.comfortLow,
      maxMidi: profile.comfortHigh,
      tessituraLow: profile.comfortLow,
      tessituraHigh: profile.comfortHigh,
      keyRoot: 0,
      keyMinor: false,
      notes: [],
      hardSpots: [],
      chords: [],
      shiftSemis: 0,
      harmonyMode: 'lower3',
      speed: 1,
      pins: [],
      lyrics: [],
    }
    upsertSingSong(meta)
    setActiveSongId(id)
    setYtInput('')
    setBusyMsg('')
  }

  // Drop a Timeline Coach Pin at current song second
  const handleDropPin = (kind: CoachPinKind) => {
    const labelMap: Record<CoachPinKind, string> = {
      breath: 'Quiet low breath',
      head: 'Lighten to mix/head',
      vowel: 'Tall open vowel',
      belt: 'Firm support',
      custom: 'Cue',
    }
    const nextPins = [
      ...activeSong.pins,
      { id: `pin_${Date.now().toString(36)}`, t: Math.round(mix.time * 10) / 10, kind, text: labelMap[kind] },
    ]
    patchSingSong(activeSong.id, { pins: nextPins })
  }

  // Start a quick Swiftscales Piano Workout (or 60s Hum Cool-Down!)
  const startWorkout = (patId: string, customBpm?: number) => {
    const pat = WORKOUT_PATTERNS.find(p => p.id === patId) ?? WORKOUT_PATTERNS[0]
    setWorkoutId(pat.id)
    const bpm = customBpm ?? pat.defaultBpm
    setWorkoutBpm(bpm)
    const runner = workoutRunnerRef.current ?? new PianoWorkoutRunner()
    workoutRunnerRef.current = runner
    runner.onStep = st => {
      setWorkoutTarget(st.targetMidi)
      setWorkoutLead(st.leadMidi)
      setWorkoutRep({ rep: st.rep, total: st.totalReps })
    }
    runner.onDone = () => {
      setWorkoutActive(false)
      setWorkoutTarget(null)
      setWorkoutLead(null)
      addVocalSeconds(90)
      recordVocalStat(88, 0, 2)
    }
    setWorkoutActive(true)
    runner.start({
      pattern: pat,
      lowRoot: profile.comfortLow,
      highRoot: profile.comfortHigh,
      bpm,
      useVocalGuide: pat.category === 'harmony',
    })
  }

  const stopWorkout = () => {
    workoutRunnerRef.current?.stop()
    setWorkoutActive(false)
    setWorkoutTarget(null)
    setWorkoutLead(null)
  }

  const nextLesson = nextUnfinishedLesson(profile.doneLessons)
  const coursePct = Math.round((profile.doneLessons.length / ALL_SING_LESSONS.length) * 100)

  return (
    <div className="screen sing-screen" data-testid="sing-screen">
      {/* Hidable / Resizable / Opacity-Adjustable Sing Studio Header Banner */}
      <ChromeBar id="sing-hero" label="Sing banner" edge="top" pillAlign="right" minH={44} maxH={220}>
        <div className="hero sing-hero">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h1 style={{ margin: 0 }}>🎤 Vocal Studio</h1>
              <p className="small muted" style={{ margin: '2px 0 0' }}>
                {profile.voiceType} · {formatRange(profile.lowMidi, profile.highMidi)} · Break {midiToNoteName(profile.passaggioMidi)} · Course {coursePct}%
              </p>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn sm${micOn ? ' primary' : ''}`}
                onClick={toggleMic}
                data-testid="sing-mic-btn"
              >
                {micOn ? '🎙️ Mic Live' : '🎙️ Turn On Mic'}
              </button>
              <button
                type="button"
                className={`btn sm${profile.earFirstBlind ? ' primary' : ''}`}
                onClick={() => updateSingProfile({ earFirstBlind: !profile.earFirstBlind })}
                title="Ear-First Blind Mode hides the live pitch line while you sing and reveals it right after!"
              >
                {profile.earFirstBlind ? '🙈 Blind: ON' : '👁️ Live Line'}
              </button>
            </div>
          </div>

          {/* 6 Clean Sub-Tabs */}
          <div className="sing-subtabs" role="tablist" aria-label="Sing studio sections">
            {SUB_TABS.map(t => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={sub === t.id}
                className={`sing-subtab${sub === t.id ? ' active' : ''}`}
                onClick={() => switchSub(t.id)}
                data-testid={`sing-tab-${t.id}`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>
      </ChromeBar>

      {micErr && <div className="card sing-alert">{micErr}</div>}
      {busyMsg && <div className="card sing-busy">⏳ {busyMsg}</div>}

      {/* ===================== 1. HOME / DAILY COACH ===================== */}
      {sub === 'home' && (
        <div className="sing-home-grid">
          <div className="card col" style={{ gap: 10 }}>
            <span className="sing-pill-tag">TODAY'S VOICE LESSON</span>
            <h2 style={{ margin: 0 }}>Lesson {nextLesson.num}: {nextLesson.title}</h2>
            <p className="small muted" style={{ margin: 0 }}>{nextLesson.goal}</p>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn primary"
                onClick={() => { setSelectedLessonId(nextLesson.id); switchSub('lessons') }}
              >
                ▶ Start Lesson + Video
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => { switchSub('workouts'); startWorkout('sovt-5tone') }}
              >
                🫧 5-Min SOVT Warmup
              </button>
            </div>
          </div>

          <div className="card col" style={{ gap: 10 }}>
            <span className="sing-pill-tag">ANY SONG · YOUR KEY OR HARMONY</span>
            <h2 style={{ margin: 0 }}>Sing Along to Real Music</h2>
            <p className="small muted" style={{ margin: 0 }}>
              Upload an MP3/WAV/M4A or share from YouTube / YouTube Music. Lower the song into your sweet spot (with Auto Capo + Guitar Chords!) — OR sing a smooth Harmony line in the original key!
            </p>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn primary" onClick={() => switchSub('songs')}>
                🎵 Open Songs Studio
              </button>
              <button type="button" className="btn" onClick={() => switchSub('game')}>
                🎮 Play Brandy Vocal Game
              </button>
            </div>
          </div>

          <div className="card col" style={{ gap: 10 }}>
            <span className="sing-pill-tag">MY VOICE SNAPSHOT</span>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <div className="sing-stat-chip"><span className="small muted">Voice Type</span><strong>{profile.voiceType}</strong></div>
              <div className="sing-stat-chip"><span className="small muted">Range</span><strong>{formatRange(profile.lowMidi, profile.highMidi)}</strong></div>
              <div className="sing-stat-chip"><span className="small muted">Break Zone</span><strong>{midiToNoteName(profile.passaggioMidi)}</strong></div>
              <div className="sing-stat-chip"><span className="small muted">Today</span><strong>{Math.floor(profile.todayVocalSec / 60)} min</strong></div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn sm"
                onClick={() => { setSelectedLessonId('m1-l1'); switchSub('lessons') }}
              >
                🧭 Run Voice Range Test
              </button>
              <button
                type="button"
                className="btn sm"
                onClick={() => { switchSub('workouts'); startWorkout('cooldown-hum') }}
              >
                💧 60s Hum Cool-Down
              </button>
            </div>
          </div>

          <div className="card col" style={{ gap: 8 }}>
            <span className="sing-pill-tag">GUITARIST EXCLUSIVE</span>
            <h3 style={{ margin: 0 }}>🎸 Sing & Strum Independence</h3>
            <p className="small muted" style={{ margin: 0 }}>
              Climb our 5-stage guitar + voice coordination ladder (Beat-1 Ring → Quarter Pulse → Hum + Groove → Full Sing & Strum) with JustinGuitar & Chris Liepe's video lessons.
            </p>
            <button
              type="button"
              className="btn sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => { setSelectedLessonId('m10-l1'); switchSub('lessons') }}
            >
              🎸 Open Module 10: Sing & Play →
            </button>
          </div>
        </div>
      )}

      {/* ===================== 2. FULL 10-MODULE YOUTUBE COURSE ===================== */}
      {sub === 'lessons' && (
        <LessonView
          profile={profile}
          frame={frame}
          micOn={micOn}
          onToggleMic={toggleMic}
          selectedLessonId={selectedLessonId}
          onSelectLesson={setSelectedLessonId}
          onOpenSongsHarmony={() => {
            patchSingSong(activeSong.id, { harmonyMode: 'lower3' })
            switchSub('songs')
          }}
        />
      )}

      {/* ===================== 3. SONGS (TRANSPOSE OR HARMONIZE!) ===================== */}
      {sub === 'songs' && (
        <div className="col" style={{ gap: 12 }}>
          {/* Upload MP3 or Share/Paste YouTube Link Bar */}
          <div className="card col" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <label className="btn primary sm" style={{ cursor: 'pointer' }}>
                  📂 Upload MP3 / WAV / M4A
                  <input type="file" accept="audio/*" onChange={handleFileUpload} hidden />
                </label>
                <div className="row" style={{ gap: 4 }}>
                  <input
                    type="url"
                    className="input"
                    placeholder="Paste YouTube or YT Music link…"
                    value={ytInput}
                    onChange={e => setYtInput(e.target.value)}
                    style={{ minWidth: 200 }}
                  />
                  <button type="button" className="btn sm" onClick={() => addYoutubePracticeSong()}>+ Add YT</button>
                </div>
              </div>
              <select
                className="input"
                value={activeSong.id}
                onChange={e => setActiveSongId(e.target.value)}
                aria-label="Pick a song to practice singing"
              >
                {allSongs.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.source === 'youtube' ? '▶ ' : '🎵 '}{s.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Dual Mode Switcher: Mode A (Shift to My Key) vs Mode B (Harmony in Original Key!) */}
            <div className="sing-dual-mode-bar">
              <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <strong className="small">Sing Mode:</strong>
                <button
                  type="button"
                  className={`btn sm${!isHarmonyMode ? ' primary' : ''}`}
                  onClick={() => {
                    patchSingSong(activeSong.id, { harmonyMode: 'off' })
                    playerRef.current?.setMix({ harmonyGuideVol: 0 })
                  }}
                >
                  🎯 Mode A: Fit My Key (Lead)
                </button>
                {(['lower3', 'baritone', 'upper3', 'autoFit'] as HarmonyMode[]).map(hm => (
                  <button
                    key={hm}
                    type="button"
                    className={`btn sm${activeSong.harmonyMode === hm ? ' primary' : ''}`}
                    onClick={() => {
                      patchSingSong(activeSong.id, { harmonyMode: hm, shiftSemis: 0 })
                      playerRef.current?.setMix({ shiftSemis: 0, harmonyGuideVol: 0.55 })
                    }}
                    title={HARMONY_LABELS[hm].desc}
                  >
                    🤝 {HARMONY_LABELS[hm].short}
                  </button>
                ))}
              </div>

              <div className="small muted" style={{ marginTop: 4 }}>
                {!isHarmonyMode ? (
                  <>
                    Song Range: <b>{formatRange(activeSong.minMidi + mix.shiftSemis, activeSong.maxMidi + mix.shiftSemis)}</b>
                    {' · '}Rec shift: <b>{keyShiftRec.semis > 0 ? `+${keyShiftRec.semis}` : keyShiftRec.semis} st</b>
                    {' · '}Guitar: <b>Key {capoAdvice.keyName} ({capoAdvice.capo === 0 ? 'No Capo' : `Capo ${capoAdvice.capo}`} · {capoAdvice.shapes.join('–')})</b>
                  </>
                ) : (
                  <>
                    <b>{HARMONY_LABELS[activeSong.harmonyMode].name}</b> in Original Key · Range Fit: <b>{harmonyRes.rangeFitPct}%</b> ({formatRange(harmonyRes.minMidi, harmonyRes.maxMidi)})
                    {' · '}Use the Singer slider to test the <b>Lead-Pull Ladder (0% → 40% → 100%)</b>!
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Embedded YouTube Player (when practicing a shared YouTube / YouTube Music link) */}
          {activeSong.source === 'youtube' && activeSong.youtubeId && (
            <div className="card col" style={{ gap: 8 }}>
              <div className="sing-yt-wrap" style={{ maxHeight: 240 }}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${activeSong.youtubeId}?rel=0`}
                  title={activeSong.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="small muted" style={{ margin: 0 }}>
                Sing live along with YouTube in the original key (great for <b>Harmony Mode</b> + live Pitch/Tone Tracker below!), or upload an MP3/WAV for full <b>on-device HT-Demucs vocal removal & ±12 key shifting</b>.
              </p>
            </div>
          )}

          {/* Main Singing Practice Tracker ("Vocal Studio Mirror") */}
          <div className="card col" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => (mix.playing ? playerRef.current?.pause() : void playerRef.current?.play())}
                >
                  {mix.playing ? '⏸ Pause' : '▶ Play Song'}
                </button>
                <button type="button" className="btn sm" onClick={() => playerRef.current?.stop()}>■ Stop</button>
                {!isHarmonyMode && (
                  <>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => {
                        const s = Math.max(-12, mix.shiftSemis - 1)
                        playerRef.current?.setMix({ shiftSemis: s })
                        patchSingSong(activeSong.id, { shiftSemis: s })
                      }}
                    >
                      −1 st
                    </button>
                    <span className="sing-pill-tag">{mix.shiftSemis > 0 ? `+${mix.shiftSemis}` : mix.shiftSemis} st</span>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => {
                        const s = Math.min(12, mix.shiftSemis + 1)
                        playerRef.current?.setMix({ shiftSemis: s })
                        patchSingSong(activeSong.id, { shiftSemis: s })
                      }}
                    >
                      +1 st
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => {
                        playerRef.current?.setMix({ shiftSemis: keyShiftRec.semis })
                        patchSingSong(activeSong.id, { shiftSemis: keyShiftRec.semis })
                      }}
                    >
                      ✨ Fit My Voice
                    </button>
                  </>
                )}
              </div>

              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {activeSong.source === 'upload' && !activeSong.id.startsWith('starter-') && !activeSong.stemsReady && (
                  <button type="button" className="btn sm" onClick={handleIsolateVocals}>
                    🧠 Split Vocals & Band (AI)
                  </button>
                )}
                {activeSong.stemsReady && <span className="sing-pill-tag">✓ Dual Stereo Stems</span>}
                <button type="button" className="btn sm" onClick={() => { setLyricsDraft(activeSong.lyrics.map(l => l.text).join('\n')); setLyricsOpen(v => !v) }}>
                  📝 Lyrics & Sync
                </button>
                {!activeSong.id.startsWith('starter-') && (
                  <button type="button" className="btn sm" onClick={() => { void deleteSingSong(activeSong.id); setActiveSongId(starters[0].id) }}>
                    🗑
                  </button>
                )}
              </div>
            </div>

            {/* Song Scrubber Bar */}
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span className="small tabular">{mix.time.toFixed(1)}s</span>
              <input
                type="range"
                min={0}
                max={Math.max(1, mix.duration)}
                step={0.1}
                value={mix.time}
                onChange={e => playerRef.current?.seek(Number(e.target.value))}
                style={{ flex: 1 }}
                aria-label="Song timeline scrubber"
              />
              <span className="small tabular">{mix.duration.toFixed(1)}s</span>
            </div>

            {/* The Vocal Studio Mirror Canvas */}
            <VocalTrackerCanvas
              time={activeSong.source === 'youtube' || (!mix.playing && micOn && frame) ? (frame?.t ?? mix.time) : mix.time}
              targets={activeTargets}
              ghostLead={isHarmonyMode ? activeSong.notes : undefined}
              frame={frame}
              trail={songTrail}
              lowMidi={profile.lowMidi}
              highMidi={profile.highMidi}
              passaggioMidi={profile.passaggioMidi}
              pins={activeSong.pins}
              chords={activeChords}
              lyrics={activeSong.lyrics}
              blindMode={profile.earFirstBlind}
              loopA={mix.loopA}
              loopB={mix.loopB}
              height={295}
            />

            {/* Hard-Spot Auto-Loops + Live Smart Diagnostics */}
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="small muted">Auto Hard-Spots:</span>
                {activeSong.hardSpots.map((h, i) => (
                  <button
                    key={i}
                    type="button"
                    className="btn sm"
                    onClick={() => {
                      playerRef.current?.setMix({ loopA: h.t0, loopB: h.t1, speed: 0.85 })
                      void playerRef.current?.play(h.t0)
                    }}
                  >
                    🔁 {h.label}
                  </button>
                ))}
                {mix.loopA !== null && (
                  <button type="button" className="btn sm" onClick={() => playerRef.current?.clearLoop()}>
                    ✕ Exit Loop
                  </button>
                )}
              </div>
              {frame && frame.flags.length > 0 && (
                <div className="row" style={{ gap: 6 }}>
                  {frame.flags.includes('vibrato') && <span className="sing-diag good">✨ Smooth Vibrato ({frame.vibrato.rateHz} Hz)</span>}
                  {frame.flags.includes('scoop') && <span className="sing-diag warn">↗ Scooped flat on attack</span>}
                  {frame.flags.includes('sag') && <span className="sing-diag bad">↘ Breath sag — hold ribs buoyant!</span>}
                  {frame.flags.includes('strain') && <span className="sing-diag bad">⚠️ Sharp/Strain — soften 20%</span>}
                </div>
              )}
            </div>

            {/* Optional Personal Paste & Tap-to-Sync Lyrics Drawer */}
            {lyricsOpen && (
              <div className="sing-lyrics-box col" style={{ gap: 8 }}>
                <strong className="small">📝 Personal Lyrics & Tap-to-Sync (stored privately on your device)</strong>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Paste lyrics here (one line per phrase)…"
                  value={lyricsDraft}
                  onChange={e => setLyricsDraft(e.target.value)}
                />
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={() => {
                      patchSingSong(activeSong.id, { lyrics: parseLyricsText(lyricsDraft) })
                    }}
                  >
                    Save Lines
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => {
                      // Tap-to-Sync: stamp the next unsynced lyric line to the current song time!
                      const lines = [...activeSong.lyrics]
                      const nextIdx = lines.findIndex(l => l.t === null)
                      if (nextIdx >= 0) {
                        lines[nextIdx] = { ...lines[nextIdx], t: Math.round(mix.time * 10) / 10 }
                        patchSingSong(activeSong.id, { lyrics: lines })
                      }
                    }}
                  >
                    ⏱ Tap to Sync Next Line ({mix.time.toFixed(1)}s)
                  </button>
                  <button type="button" className="btn sm" onClick={() => setLyricsOpen(false)}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== 4. SWIFTSCALES PIANO WORKOUTS & LIVE MONITOR ===================== */}
      {sub === 'workouts' && (
        <div className="col" style={{ gap: 12 }}>
          <div className="card col" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h2 style={{ margin: 0 }}>🎹 Piano Warmups & SOVT Studio</h2>
                <p className="small muted" style={{ margin: '2px 0 0' }}>
                  Every exercise auto-fits your comfortable range ({formatRange(profile.comfortLow, profile.comfortHigh)}).
                </p>
              </div>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <label className="row small" style={{ gap: 6 }}>
                  BPM
                  <input type="range" min={60} max={140} value={workoutBpm} onChange={e => setWorkoutBpm(Number(e.target.value))} style={{ width: 95 }} />
                  <b>{workoutBpm}</b>
                </label>
                {workoutActive && (
                  <button type="button" className="btn sm" onClick={stopWorkout}>■ Stop</button>
                )}
              </div>
            </div>

            <div className="sing-workout-grid">
              {WORKOUT_PATTERNS.map(p => {
                const active = workoutActive && workoutId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`sing-workout-card${active ? ' active' : ''}`}
                    onClick={() => (active ? stopWorkout() : startWorkout(p.id, workoutBpm))}
                  >
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <strong>{p.name}</strong>
                      <span className="sing-pill-tag">{p.category.toUpperCase()}</span>
                    </div>
                    <div className="small" style={{ color: '#93c5fd' }}>{p.syllable}</div>
                    <div className="small muted">{p.cue}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="card col" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <strong>Live Pitch, Vibrato & Resonance Monitor</strong>
              <span className="small muted">
                {workoutActive && workoutRep.total > 0
                  ? `Rep ${workoutRep.rep}/${workoutRep.total} · Target ${workoutTarget ? midiToNoteName(workoutTarget) : '—'}`
                  : frame?.midi
                    ? `${midiToNoteName(frame.midi)} · ${frame.tone.label}${frame.vibrato.active ? ` · Vibrato ${frame.vibrato.rateHz}Hz` : ''}`
                    : 'Sing freely or start a piano warmup above!'}
              </span>
            </div>
            <VocalTrackerCanvas
              time={frame?.t ?? 0}
              targets={workoutTarget !== null ? [{ t0: (frame?.t ?? 0) - 0.5, t1: (frame?.t ?? 0) + 1.8, midi: workoutTarget, lyric: midiToNoteName(workoutTarget) }] : []}
              ghostLead={workoutLead !== null ? [{ t0: (frame?.t ?? 0) - 0.5, t1: (frame?.t ?? 0) + 1.8, midi: workoutLead }] : undefined}
              frame={frame}
              trail={freeTrail}
              lowMidi={profile.lowMidi}
              highMidi={profile.highMidi}
              passaggioMidi={profile.passaggioMidi}
              blindMode={profile.earFirstBlind}
              height={265}
            />
          </div>
        </div>
      )}

      {/* ===================== 5. BRANDY VOCAL GAME MODE ===================== */}
      {sub === 'game' && (
        <div className="col" style={{ gap: 12 }}>
          <div className="card col" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {(
                  [
                    ['sniper', '🎯 Pitch Sniper'],
                    ['siren', '🏄 Siren Surfer'],
                    ['jumper', '⚔️ Interval Jumper'],
                    ['harmony', '🤝 Harmony Duel'],
                    ['breath', '💨 Dragon Breath'],
                    ['song', '🎵 Song Arcade'],
                  ] as [VocalMiniGameId, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`btn sm${gameMode === id ? ' primary' : ''}`}
                    onClick={() => { stopGame(); setGameMode(id) }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="row" style={{ gap: 8 }}>
                <label className="row small" style={{ gap: 5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={profile.brandyInGame}
                    onChange={e => updateSingProfile({ brandyInGame: e.target.checked })}
                  />
                  🎸 Brandy on stage
                </label>
                <button
                  type="button"
                  className={`btn sm${gameRunning ? '' : ' primary'}`}
                  onClick={() => (gameRunning ? stopGame() : void startGame())}
                  data-testid="sing-game-play"
                >
                  {gameRunning ? '■ Stop Game' : '▶ Start Arcade!'}
                </button>
              </div>
            </div>

            {/* Arcade HUD Strip */}
            <div className="sing-game-hud">
              <span>SCORE <b>{gameStats.score.toLocaleString()}</b></span>
              <span>🔥 STREAK <b>{gameStats.streak}</b> (Best {gameStats.bestStreak})</span>
              <span>⚡ MULT <b>{gameStats.mult}×</b>{gameStats.mult >= 4 ? ' FEVER!' : ''}</span>
              <span>✨ VIBRATO <b>{gameStats.vibratoBonus}</b></span>
            </div>

            <VocalGameCanvas
              mode={gameMode}
              time={gameTime}
              targets={gameSpec.targets}
              leadLine={gameSpec.lead}
              frame={frame}
              lowMidi={profile.lowMidi}
              highMidi={profile.highMidi}
              brandyOn={profile.brandyInGame}
              stats={gameStats}
              height={320}
            />
          </div>
        </div>
      )}

      {/* ===================== 6. MY VOICE PROFILE ===================== */}
      {sub === 'voice' && (
        <div className="col" style={{ gap: 12 }}>
          <div className="card col" style={{ gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h2 style={{ margin: 0 }}>📈 My Voice Profile</h2>
                <p className="small muted" style={{ margin: '2px 0 0' }}>
                  Every song key-shift, Auto-Harmony part, lesson drill, and warmup adapts automatically to these numbers.
                </p>
              </div>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => { setSelectedLessonId('m1-l1'); switchSub('lessons') }}
              >
                🧭 Re-Run Guided Range Test
              </button>
            </div>

            <div className="sing-voice-sliders">
              <label className="small">
                Lowest Comfortable Note: <b>{midiToNoteName(profile.lowMidi)}</b>
                <input
                  type="range"
                  min={36}
                  max={64}
                  value={profile.lowMidi}
                  onChange={e => {
                    const lo = Number(e.target.value)
                    const hi = Math.max(lo + 10, profile.highMidi)
                    const { voiceType } = classifyVoiceType(lo, hi)
                    updateSingProfile({ lowMidi: lo, highMidi: hi, comfortLow: lo + 2, voiceType })
                  }}
                  style={{ width: '100%' }}
                />
              </label>
              <label className="small">
                Highest Comfortable Note: <b>{midiToNoteName(profile.highMidi)}</b>
                <input
                  type="range"
                  min={52}
                  max={84}
                  value={profile.highMidi}
                  onChange={e => {
                    const hi = Number(e.target.value)
                    const lo = Math.min(profile.lowMidi, hi - 10)
                    const { voiceType } = classifyVoiceType(lo, hi)
                    updateSingProfile({ lowMidi: lo, highMidi: hi, comfortHigh: hi - 2, voiceType })
                  }}
                  style={{ width: '100%' }}
                />
              </label>
              <label className="small">
                Passaggio ("Vocal Break") Note: <b>{midiToNoteName(profile.passaggioMidi)}</b>
                <input
                  type="range"
                  min={48}
                  max={74}
                  value={profile.passaggioMidi}
                  onChange={e => updateSingProfile({ passaggioMidi: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          </div>

          <div className="card col" style={{ gap: 8 }}>
            <strong>🎙️ Saved Vocal Mirror Takes ({profile.takes.length})</strong>
            {profile.takes.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>
                Use the floating <b>🎙️ Mirror</b> bubble at the bottom while singing to hear yourself back and save Before vs. After takes!
              </p>
            ) : (
              <div className="col" style={{ gap: 6 }}>
                {profile.takes.map(tk => (
                  <div key={tk.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                    <span className="small"><b>{tk.label}</b> · {new Date(tk.createdAt).toLocaleDateString()}</span>
                    <span className="sing-pill-tag">{tk.note ?? `${tk.accuracyPct}%`}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Draggable Floating Singing Bubbles Dock (always 1 tap away on every Sing screen!) */}
      <SingBubbles
        frame={frame}
        micOn={micOn}
        mix={sub === 'songs' ? mix : null}
        onMixChange={patch => {
          playerRef.current?.setMix(patch)
          if (patch.shiftSemis !== undefined) patchSingSong(activeSong.id, { shiftSemis: patch.shiftSemis })
          if (patch.speed !== undefined) patchSingSong(activeSong.id, { speed: patch.speed })
        }}
        onFitMyVoice={() => {
          playerRef.current?.setMix({ shiftSemis: keyShiftRec.semis })
          patchSingSong(activeSong.id, { shiftSemis: keyShiftRec.semis })
        }}
        onLoopLast4={() => playerRef.current?.loopLast4Sec()}
        onClearLoop={() => playerRef.current?.clearLoop()}
        onDropPin={handleDropPin}
        rootMidi={48 + (((activeSong.keyRoot + effectiveShift) % 12) + 12) % 12}
        keyMinor={activeSong.keyMinor}
        startNoteMidi={activeTargets[0]?.midi}
        capo={sub === 'songs' ? capoAdvice : null}
        currentChord={currentChord}
        nextChord={nextChord}
        onCaptureMirror={() => micRef.current?.captureLast(8) ?? null}
        onSaveTake={snap => {
          updateSingProfile(p => ({
            ...p,
            takes: [
              {
                id: `tk_${Date.now().toString(36)}`,
                label: sub === 'songs' ? activeSong.title : 'Practice Take',
                createdAt: Date.now(),
                accuracyPct: 90,
                note: `${snap.duration.toFixed(1)}s`,
              },
              ...p.takes,
            ].slice(0, 20),
          }))
        }}
        todayVocalSec={profile.todayVocalSec}
        onStartCooldown={() => { switchSub('workouts'); startWorkout('cooldown-hum') }}
        inSongMode={sub === 'songs'}
      />
    </div>
  )
}

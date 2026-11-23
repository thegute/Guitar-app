// Full Fretboard Mastery Game (Learn → Explore → Play better → Fretboard game):
// - Study Primer before every run: shows the exact chunk or full neck with all note names
//   available to the game (tap any fret to hear it); the instant you hit Start, all labels vanish!
// - 🚀 Note Rush (Fret Defense): 6-string neon arcade radar where glowing note orbs (letter ONLY,
//   never fret numbers!) glide toward your shield — blast them with your real guitar OR by tapping
//   the blank fretboard below, complete with lasers, sparks, FEVER ×5, and 👑 Octave Bosses!
// - Structured 6-stage Mastery Path + 60s Blitz + Circle-of-4ths Metronome Gauntlet +
//   Octave Constellation Sniper + Tom Quayle Solo Intervals + Name That Fret + Daily 3-Min Workout
// - Live Per-Fret Speed & Accuracy Heatmap + 🔥 Drill My Weak Spots + 🔊 Voice Callouts.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Win, WinArea } from '../components/Win'
import { InputPicker } from '../components/InputPicker'
import { audio } from '../audio/engine'
import { playNote, strum } from '../audio/pluck'
import { playClick } from '../audio/metronome'
import { haptic } from '../audio/tapFeel'
import { NoteListener } from '../tabs/follow'
import { micWhere } from '../audio/input'
import { FLATS, KEYS, SHARPS, midiName } from '../theory/notes'
import { STARTER_PROGS, jamProgression, starterProgression } from '../tabs/fromProgression'
import type { Instrument } from '../instrument'
import { addXp, bump, dayKey, isAway, logAnswer, logDone, usePracticeTimer } from './progress'
import { bumpCombo } from './game'
import {
  CIRCLE_FOURTHS_PCS,
  LANDMARK_FRETS,
  NATURAL_PCS,
  SOLO_LEVELS,
  STAGES,
  buildSoloGoal,
  calcHitPoints,
  displayPc,
  emptyFretGameData,
  filterSpots,
  fretHeat,
  friendlyStringLabel,
  fullPcLabel,
  loadFretGame,
  matchRushAttempt,
  octaveConstellationLinks,
  pickOctavePair,
  pickWeightedSpot,
  recordFretResult,
  rushWaveSpec,
  saveFretGame,
  sessionGrade,
  shortcutTip,
  speakPrompt,
  spokenNote,
  spotKey,
  spotsForPc,
  spotsMastery,
  stageSpots,
  tuningKey,
  weakestSpots,
  type AccidentalMode,
  type FretGameData,
  type FretSpot,
  type GameFilter,
  type GameMode,
  type HeatTier,
  type RushBoss,
  type RushOrb,
  type SoloGoal,
  type SoloLevel,
} from './fretboardGame'

interface Props {
  inst: Instrument
  onExit: () => void
}

interface Burst {
  id: number
  s: number
  f: number
  text: string
  kind: 'hit' | 'lightning' | 'miss'
}

interface RushLaser {
  id: number
  s: number
  x: number
  text: string
  kind: 'hit' | 'lightning' | 'boss'
}

interface ActivePrompt {
  spot?: FretSpot
  anchor?: FretSpot
  sniperPc?: number
  sniperSpots?: FretSpot[]
  sniperFound?: string[]
  solo?: SoloGoal
  soloIdx?: number
  soloFound?: FretSpot[]
  preferFlat?: boolean
}

interface RunSummary {
  mode: GameMode
  score: number
  hits: number
  misses: number
  bestCombo: number
  avgMs: number
  wave?: number
  bpm?: number
  clears?: number
  isNewBest: boolean
  missedSpots: FretSpot[]
}

const MODE_TABS: { id: GameMode; icon: string; label: string; tag: string }[] = [
  { id: 'survival', icon: '🚀', label: 'Note Rush', tag: 'Fret Defense' },
  { id: 'path', icon: '🧭', label: 'Mastery Path', tag: '6 Stages' },
  { id: 'blitz', icon: '⚡', label: '60s Blitz', tag: 'High Score' },
  { id: 'gauntlet', icon: '🥁', label: '4ths Gauntlet', tag: 'Metronome' },
  { id: 'sniper', icon: '🎯', label: 'Octave Sniper', tag: 'Find All 6' },
  { id: 'solo', icon: '🧠', label: 'Solo Intervals', tag: 'Chord Changes' },
  { id: 'name', icon: '❓', label: 'Name Fret', tag: 'Reverse' },
  { id: 'daily', icon: '🏆', label: 'Daily 3-Min', tag: 'Workout' },
]

const ZONE_PRESETS: { id: string; label: string; from: number; to: number }[] = [
  { id: '0-5', label: 'Frets 0–5', from: 0, to: 5 },
  { id: '5-9', label: 'Box 5–9', from: 5, to: 9 },
  { id: '7-12', label: 'Box 7–12', from: 7, to: 12 },
  { id: '0-12', label: 'Full 0–12', from: 0, to: 12 },
  { id: '0-15', label: 'Extended 0–15', from: 0, to: 15 },
  { id: '12-17', label: 'Upper 12–17', from: 12, to: 17 },
]

const HEAT_FILL: Record<HeatTier, string> = {
  unseen: 'rgba(148, 163, 184, 0.24)',
  red: '#ef4444',
  amber: '#f59e0b',
  green: '#10b981',
  gold: '#38bdf8',
}

const HEAT_STROKE: Record<HeatTier, string> = {
  unseen: 'rgba(148, 163, 184, 0.5)',
  red: '#fca5a5',
  amber: '#fde68a',
  green: '#6ee7b7',
  gold: '#bae6fd',
}

const INLAY_FRETS = new Set([3, 5, 7, 9, 15, 17, 19, 21])

export function FretboardGameView({ inst, onExit }: Props) {
  const tKey = tuningKey(inst)
  const midis = inst.midis
  const nStr = midis.length

  const [data, setData] = useState<FretGameData>(() => loadFretGame())
  const heatMap = data.heat[tKey] ?? {}

  const [mode, setMode] = useState<GameMode>('survival')
  const [stageId, setStageId] = useState<number>(1)
  const [inputMode, setInputMode] = useState<'mic' | 'tap'>(() => (isAway() ? 'tap' : 'mic'))
  const [voiceOn, setVoiceOn] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [leftHanded, setLeftHanded] = useState(() => {
    try { return localStorage.getItem('kg:fretLeft') === '1' } catch { return false }
  })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filter, setFilter] = useState<GameFilter>({
    fromFret: 0,
    toFret: 5,
    strings: [],
    accidentals: 'natural',
    weakOnly: false,
  })
  /** In Note Rush: false = Auto Escalating Waves (Wave 1→∞), true = Lock to your selected chunk/full neck! */
  const [rushLockChunk, setRushLockChunk] = useState(false)
  const [hintMode, setHintMode] = useState<'miss' | 'off' | 'always'>('miss')
  const [peekHint, setPeekHint] = useState(false)

  // Solo mode settings
  const jam = useMemo(() => jamProgression(), [])
  const [soloProgId, setSoloProgId] = useState<string>(() => (jam ? 'jam' : STARTER_PROGS[0].id))
  const [soloKey, setSoloKey] = useState<string>(() => jam?.tonic ?? 'C')
  const [soloLevel, setSoloLevel] = useState<SoloLevel>('triads')

  // Gauntlet settings
  const [gauntletBpm, setGauntletBpm] = useState<number>(() => Math.max(45, Math.min(140, data.records.gauntletBpm || 60)))
  const [gauntletDir, setGauntletDir] = useState<'up' | 'down' | 'bounce'>('bounce')

  // Live session state
  const [running, setRunning] = useState(false)
  const [prompt, setPrompt] = useState<ActivePrompt | null>(null)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestRunCombo, setBestRunCombo] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [wave, setWave] = useState(1)
  const [timeLeftMs, setTimeLeftMs] = useState(60000)
  const [dailyPhase, setDailyPhase] = useState<0 | 1 | 2>(0)
  const [sniperClears, setSniperClears] = useState(0)
  const [gauntletKeyIdx, setGauntletKeyIdx] = useState(0)
  const [gauntletStrIdx, setGauntletStrIdx] = useState(0)
  const [gauntletGoingUp, setGauntletGoingUp] = useState(true)
  const [gauntletBeatPulse, setGauntletBeatPulse] = useState(false)
  const [soloChordIdx, setSoloChordIdx] = useState(0)

  // Note Rush (Fret Defense) live state
  const [rushOrbs, setRushOrbs] = useState<RushOrb[]>([])
  const [rushBoss, setRushBoss] = useState<RushBoss | null>(null)
  const [rushLasers, setRushLasers] = useState<RushLaser[]>([])
  const [shieldFlash, setShieldFlash] = useState(false)

  // Visual feedback state
  const [bursts, setBursts] = useState<Burst[]>([])
  const [vibeStr, setVibeStr] = useState<number | null>(null)
  const [lastHitSpot, setLastHitSpot] = useState<FretSpot | null>(null)
  const [wrongSpot, setWrongSpot] = useState<{ s: number; f: number } | null>(null)
  const [revealSpot, setRevealSpot] = useState<FretSpot | null>(null)
  const [coachTip, setCoachTip] = useState<string>('')
  const [inspectSpot, setInspectSpot] = useState<FretSpot | null>(null)
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [heardLabel, setHeardLabel] = useState<string>('')
  const [micInfo, setMicInfo] = useState<string>('')
  const [micErr, setMicErr] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  // Refs to avoid stale closures in timers / animation / mic callbacks
  const shownAtRef = useRef(0)
  const lastSpotKeyRef = useRef('')
  const runTimesRef = useRef<number[]>([])
  const missedListRef = useRef<FretSpot[]>([])
  const burstIdRef = useRef(1)
  const orbIdRef = useRef(1)
  const rushOrbsRef = useRef<RushOrb[]>([])
  rushOrbsRef.current = rushOrbs
  const rushBossRef = useRef<RushBoss | null>(null)
  rushBossRef.current = rushBoss
  const dataRef = useRef(data)
  dataRef.current = data
  const promptRef = useRef(prompt)
  promptRef.current = prompt
  const runningRef = useRef(running)
  runningRef.current = running
  const stateRef = useRef({
    mode, stageId, score, combo, bestRunCombo, hits, misses, hearts, wave,
    sniperClears, gauntletKeyIdx, gauntletStrIdx, gauntletGoingUp, gauntletBpm,
    gauntletDir, soloChordIdx, dailyPhase, voiceOn, filter, rushLockChunk,
  })
  stateRef.current = {
    mode, stageId, score, combo, bestRunCombo, hits, misses, hearts, wave,
    sniperClears, gauntletKeyIdx, gauntletStrIdx, gauntletGoingUp, gauntletBpm,
    gauntletDir, soloChordIdx, dailyPhase, voiceOn, filter, rushLockChunk,
  }

  usePracticeTimer('quiz', running, inputMode === 'mic')

  const soloChords = useMemo(() => {
    if (soloProgId === 'jam' && jam?.chords.length) return jam.chords
    const id = soloProgId === 'jam' ? STARTER_PROGS[0].id : soloProgId
    return starterProgression(id, soloKey).chords
  }, [soloProgId, soloKey, jam])
  const soloChordsRef = useRef(soloChords)
  soloChordsRef.current = soloChords

  const allNeckSpots = useMemo(
    () => filterSpots(midis, { fromFret: 0, toFret: 12, strings: [], accidentals: 'both' }),
    [midis],
  )
  const overallMastery = useMemo(() => spotsMastery(allNeckSpots, heatMap), [allNeckSpots, heatMap])
  const stageStats = useMemo(() => {
    return STAGES.map(st => {
      const spots = stageSpots(midis, st.id)
      const m = spotsMastery(spots, heatMap)
      return { stage: st, ...m, total: spots.length }
    })
  }, [midis, heatMap])
  const weakCount = useMemo(
    () => allNeckSpots.filter(sp => { const h = fretHeat(heatMap[spotKey(sp.s, sp.f)]); return h === 'red' || h === 'amber' }).length,
    [allNeckSpots, heatMap],
  )

  // Compute the EXACT Study Primer pool (notes the game is about to pull from!)
  const primerInfo = useMemo(() => {
    let spots: FretSpot[] = []
    let label = ''
    if (mode === 'path') {
      spots = stageSpots(midis, stageId)
      label = `${STAGES[stageId - 1].title} (${spots.length} spots)`
    } else if (mode === 'survival') {
      if (rushLockChunk) {
        spots = filterSpots(midis, filter)
        label = `Note Rush Chunk · Frets ${filter.fromFret}–${filter.toFret} (${spots.length} notes)`
      } else {
        const w1 = rushWaveSpec(1, nStr)
        spots = filterSpots(midis, { fromFret: w1.fromFret, toFret: w1.toFret, strings: w1.strings, accidentals: w1.accidentals })
        label = `Wave 1 Starter Chunk · Low Strings Frets 0–5 (${spots.length} notes — expands as waves climb!)`
      }
    } else if (mode === 'gauntlet' || mode === 'sniper') {
      spots = filterSpots(midis, { fromFret: 0, toFret: 12, strings: [], accidentals: 'natural' })
      label = `Full Neck 0–12 · All ${nStr} strings`
    } else if (mode === 'solo') {
      const from = Math.max(0, Math.min(filter.fromFret, 8))
      const to = Math.min(15, Math.max(from + 4, Math.min(from + 5, filter.toFret || 12)))
      spots = filterSpots(midis, { fromFret: from, toFret: to, strings: [], accidentals: 'both' })
      label = `Solo Box · Frets ${from}–${to} (${soloChords.map(c => c.symbol).join(' – ')})`
    } else if (mode === 'daily') {
      spots = weakestSpots(allNeckSpots, heatMap, 20)
      label = `Daily 3-Min · Starting with your ${spots.length} weakest frets`
    } else {
      spots = filter.weakOnly ? weakestSpots(filterSpots(midis, filter), heatMap, 18) : filterSpots(midis, filter)
      label = `${filter.weakOnly ? 'Weak Spots · ' : ''}Frets ${filter.fromFret}–${filter.toFret} (${spots.length} notes)`
    }
    const keys = new Set(spots.map(sp => spotKey(sp.s, sp.f)))
    const minF = spots.length ? Math.min(...spots.map(s => s.f)) : 0
    const maxF = spots.length ? Math.max(...spots.map(s => s.f)) : 12
    return { spots, keys, label, minF, maxF }
  }, [mode, stageId, rushLockChunk, filter, midis, nStr, soloChords, allNeckSpots, heatMap])

  // Visible neck fret range
  const displayRange = useMemo(() => {
    if (mode === 'path') return { from: 0, to: stageId === 3 ? 14 : 12 }
    if (mode === 'gauntlet' || mode === 'sniper') return { from: 0, to: 12 }
    if (mode === 'survival') {
      if (rushLockChunk) return { from: Math.max(0, filter.fromFret), to: Math.max(filter.toFret, filter.fromFret + 5) }
      // Auto waves: show 0–12 cleanly (or 0–7 on Wave 1–3 so frets are big & easy to tap!)
      const maxF = !running ? 12 : wave <= 3 ? 7 : 12
      return { from: 0, to: maxF }
    }
    if (mode === 'solo' || (mode === 'daily' && dailyPhase === 2)) {
      const f0 = Math.max(0, Math.min(filter.fromFret, 10))
      const f1 = Math.max(f0 + 4, Math.min(15, filter.toFret))
      return { from: Math.max(0, f0 - 1), to: Math.min(17, f1 + 1) }
    }
    return { from: Math.max(0, filter.fromFret), to: Math.max(filter.fromFret + 5, filter.toFret) }
  }, [mode, stageId, rushLockChunk, filter.fromFret, filter.toFret, running, wave, dailyPhase])

  const addBurst = useCallback((s: number, f: number, text: string, kind: Burst['kind']) => {
    const id = burstIdRef.current++
    setBursts(b => [...b.slice(-5), { id, s, f, text, kind }])
    setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 820)
  }, [])

  const fireLaser = useCallback((s: number, x: number, text: string, kind: RushLaser['kind']) => {
    const id = burstIdRef.current++
    setRushLasers(ls => [...ls.slice(-5), { id, s, x, text, kind }])
    setTimeout(() => setRushLasers(ls => ls.filter(l => l.id !== id)), 540)
  }, [])

  const pulseString = useCallback((s: number) => {
    setVibeStr(s)
    setTimeout(() => setVibeStr(cur => (cur === s ? null : cur)), 340)
  }, [])

  const flashHitSpot = useCallback((spot: FretSpot) => {
    setLastHitSpot(spot)
    setTimeout(() => setLastHitSpot(cur => (cur && cur.s === spot.s && cur.f === spot.f ? null : cur)), 460)
  }, [])

  const persist = useCallback((next: FretGameData) => {
    dataRef.current = next
    setData(next)
    saveFretGame(next)
  }, [])

  const activeSubMode = (m: GameMode, dp: 0 | 1 | 2): GameMode => {
    if (m !== 'daily') return m
    return dp === 0 ? 'blitz' : dp === 1 ? 'gauntlet' : 'solo'
  }

  // Spawn one Note Rush orb or Octave Boss for the current wave
  const spawnRushEntity = useCallback((curWave: number, existingOrbs: RushOrb[]) => {
    const st = stateRef.current
    const spec = rushWaveSpec(curWave, nStr)
    const hm = dataRef.current.heat[tKey] ?? {}

    if (spec.isBoss) {
      const targetPc = CIRCLE_FOURTHS_PCS[Math.floor(Math.random() * CIRCLE_FOURTHS_PCS.length)]
      const preferFlat = [10, 3, 8, 1, 6].includes(targetPc)
      const label = displayPc(targetPc, 'both', preferFlat)
      const spots = spotsForPc(midis, targetPc, 0, 11, true)
      const boss: RushBoss = {
        id: orbIdRef.current++,
        pc: targetPc,
        label,
        spots,
        found: [],
        x: 96,
        speed: spec.speedPerSec,
        spawnedAt: performance.now(),
      }
      rushBossRef.current = boss
      setRushBoss(boss)
      rushOrbsRef.current = []
      setRushOrbs([])
      if (st.voiceOn) speakPrompt(`Boss wave! Find every ${spokenNote(label)} across all strings!`)
      return
    }

    const flt: GameFilter = st.rushLockChunk
      ? st.filter
      : { fromFret: spec.fromFret, toFret: spec.toFret, strings: spec.strings, accidentals: spec.accidentals }
    let pool = filterSpots(midis, flt)
    if (!pool.length) pool = allNeckSpots
    // Avoid spawning an orb on the exact same string or MIDI as an existing orb
    const busyStrs = new Set(existingOrbs.map(o => o.spot.s))
    const busyMidis = new Set(existingOrbs.map(o => o.spot.midi))
    const cleanPool = pool.filter(sp => !busyStrs.has(sp.s) && !busyMidis.has(sp.midi))
    const spot = pickWeightedSpot(cleanPool.length ? cleanPool : pool, hm, lastSpotKeyRef.current, Math.random, Boolean(st.rushLockChunk && st.filter.weakOnly))
    lastSpotKeyRef.current = spotKey(spot.s, spot.f)
    const preferFlat = flt.accidentals === 'flats' || (flt.accidentals === 'both' && Math.random() < 0.5)
    const label = displayPc(spot.pc, flt.accidentals, preferFlat)
    const orb: RushOrb = {
      id: orbIdRef.current++,
      spot,
      label,
      x: 98,
      speed: spec.speedPerSec,
      spawnedAt: performance.now(),
    }
    const next = [...existingOrbs, orb]
    rushOrbsRef.current = next
    setRushOrbs(next)
    if (st.voiceOn && existingOrbs.length === 0) {
      speakPrompt(`${spokenNote(label)} on ${friendlyStringLabel(midis, spot.s)}`)
    }
  }, [allNeckSpots, midis, nStr, tKey])

  // Deal next prompt for all Studio modes (Path, Blitz, Gauntlet, Sniper, Solo, Name, Daily)
  const dealNext = useCallback((opts?: {
    overrideMode?: GameMode
    overrideStage?: number
    overrideGauntletKey?: number
    overrideGauntletStr?: number
    overrideSoloIdx?: number
    overrideDailyPhase?: 0 | 1 | 2
    forceWeak?: boolean
  }) => {
    const st = stateRef.current
    const curMode = opts?.overrideMode ?? st.mode
    const dp = opts?.overrideDailyPhase ?? st.dailyPhase
    const sub = activeSubMode(curMode, dp)
    if (sub === 'survival') return // Note Rush manages its own orb radar!

    const curStage = opts?.overrideStage ?? st.stageId
    const hm = dataRef.current.heat[tKey] ?? {}
    const flt = opts?.forceWeak ? { ...st.filter, weakOnly: true } : st.filter

    setWrongSpot(null)
    setRevealSpot(null)
    setPeekHint(false)
    setCoachTip('')
    shownAtRef.current = performance.now()

    if (sub === 'sniper') {
      const targetPc = CIRCLE_FOURTHS_PCS[Math.floor(Math.random() * CIRCLE_FOURTHS_PCS.length)]
      const spots = spotsForPc(midis, targetPc, 0, 11, true)
      const preferFlat = [10, 3, 8, 1, 6].includes(targetPc)
      setPrompt({ sniperPc: targetPc, sniperSpots: spots, sniperFound: [], preferFlat })
      if (st.voiceOn) speakPrompt(`Find every ${spokenNote(displayPc(targetPc, 'both', preferFlat))} across all strings`)
      return
    }

    if (sub === 'solo' || (sub === 'path' && curStage === 6)) {
      const chords = soloChordsRef.current
      const cIdx = (opts?.overrideSoloIdx ?? st.soloChordIdx) % chords.length
      const chord = chords[cIdx]
      const from = Math.max(0, Math.min(flt.fromFret, 8))
      const to = Math.min(15, Math.max(from + 4, Math.min(from + 5, flt.toFret || 12)))
      const goal = buildSoloGoal(chord, soloLevel, from, to)
      setPrompt({ solo: goal, soloIdx: 0, soloFound: [] })
      try {
        const ctx = audio()
        void ctx.resume()
        strum(goal.chordMidis, ctx.currentTime + 0.04, { spread: 0.028, gain: 0.52 })
      } catch { /* ignore */ }
      if (st.voiceOn) speakPrompt(`${chord.symbol}. Play ${goal.labels[0]}`)
      return
    }

    if (sub === 'path' && curStage === 3) {
      const pair = pickOctavePair(midis, hm, lastSpotKeyRef.current)
      lastSpotKeyRef.current = spotKey(pair.target.s, pair.target.f)
      setPrompt({ spot: pair.target, anchor: pair.anchor, preferFlat: false })
      try {
        const ctx = audio()
        void ctx.resume()
        playNote(pair.anchor.midi, ctx.currentTime + 0.04, 0.55)
      } catch { /* ignore */ }
      if (st.voiceOn) speakPrompt(`Find the octave of ${spokenNote(fullPcLabel(pair.anchor.pc))} on ${friendlyStringLabel(midis, pair.target.s)}`)
      return
    }

    if (sub === 'gauntlet') {
      const kIdx = (opts?.overrideGauntletKey ?? st.gauntletKeyIdx) % CIRCLE_FOURTHS_PCS.length
      const sIdx = Math.max(0, Math.min(nStr - 1, opts?.overrideGauntletStr ?? st.gauntletStrIdx))
      const targetPc = CIRCLE_FOURTHS_PCS[kIdx]
      const preferFlat = [10, 3, 8, 1, 6].includes(targetPc)
      const f = ((targetPc - (midis[sIdx] % 12)) + 12) % 12
      const spot: FretSpot = { s: sIdx, f, midi: midis[sIdx] + f, pc: targetPc }
      setPrompt({ spot, preferFlat })
      if (st.voiceOn && sIdx === 0) speakPrompt(`Sweep ${spokenNote(displayPc(targetPc, 'both', preferFlat))} across all strings`)
      return
    }

    let pool: FretSpot[]
    if (curMode === 'daily' && dp === 0) {
      pool = weakestSpots(allNeckSpots, hm, 20)
    } else if (sub === 'path') {
      pool = stageSpots(midis, curStage)
    } else {
      pool = filterSpots(midis, flt)
    }
    if (!pool.length) pool = allNeckSpots
    const spot = pickWeightedSpot(pool, hm, lastSpotKeyRef.current, Math.random, Boolean(flt.weakOnly || (curMode === 'daily' && dp === 0)))
    lastSpotKeyRef.current = spotKey(spot.s, spot.f)
    const preferFlat = flt.accidentals === 'flats' || (flt.accidentals === 'both' && Math.random() < 0.5)
    setPrompt({ spot, preferFlat })

    if (sub === 'name') {
      try {
        const ctx = audio()
        void ctx.resume()
        playNote(spot.midi, ctx.currentTime + 0.04, 0.75)
      } catch { /* ignore */ }
      if (st.voiceOn) speakPrompt(`Name fret ${spot.f} on ${friendlyStringLabel(midis, spot.s)}`)
    } else if (st.voiceOn) {
      speakPrompt(`${spokenNote(displayPc(spot.pc, flt.accidentals, preferFlat))} on ${friendlyStringLabel(midis, spot.s)}`)
    }
  }, [allNeckSpots, midis, nStr, soloLevel, tKey])

  const endRun = useCallback(() => {
    if (!runningRef.current) return
    runningRef.current = false
    setRunning(false)
    rushOrbsRef.current = []
    rushBossRef.current = null
    setRushOrbs([])
    setRushBoss(null)
    const st = stateRef.current
    const avgMs = runTimesRef.current.length
      ? Math.round(runTimesRef.current.reduce((a, b) => a + b, 0) / runTimesRef.current.length)
      : 0
    const cur = dataRef.current
    const rec = { ...cur.records }
    let isNewBest = false

    if (st.mode === 'blitz' && st.score > rec.blitzScore) { rec.blitzScore = st.score; isNewBest = true }
    if (st.mode === 'survival') {
      if (st.wave > rec.survivalWave) { rec.survivalWave = st.wave; isNewBest = true }
      if (st.score > rec.survivalScore) { rec.survivalScore = st.score; isNewBest = true }
    }
    if (st.mode === 'gauntlet' && st.gauntletBpm > rec.gauntletBpm) { rec.gauntletBpm = st.gauntletBpm; isNewBest = true }
    if (st.mode === 'sniper' && st.sniperClears > rec.sniperClears) { rec.sniperClears = st.sniperClears; isNewBest = true }
    if (st.bestRunCombo > rec.bestCombo) rec.bestCombo = st.bestRunCombo
    if (st.mode === 'daily' && st.hits >= 6) {
      const today = dayKey()
      if (rec.lastDailyDay !== today) {
        rec.dailyStreak = (rec.dailyStreak || 0) + 1
        rec.lastDailyDay = today
        isNewBest = true
      }
      logDone('fretgame:daily')
    }

    persist({ ...cur, records: rec, totalSessions: cur.totalSessions + 1 })
    if (st.hits > 0) {
      addXp(Math.min(120, Math.max(10, Math.round(st.hits * 2 + st.bestRunCombo))))
      bump('notesHit', st.hits)
    }
    setSummary({
      mode: st.mode,
      score: st.score,
      hits: st.hits,
      misses: st.misses,
      bestCombo: st.bestRunCombo,
      avgMs,
      wave: st.mode === 'survival' ? st.wave : undefined,
      bpm: st.mode === 'gauntlet' ? st.gauntletBpm : undefined,
      clears: st.mode === 'sniper' ? st.sniperClears : undefined,
      isNewBest,
      missedSpots: missedListRef.current.slice(0, 12),
    })
  }, [persist])

  const startGame = useCallback((nextMode = mode, opts?: { stage?: number; forceWeak?: boolean }) => {
    const m = nextMode
    const stg = opts?.stage ?? stageId
    setMode(m)
    if (opts?.stage !== undefined) setStageId(stg)
    if (opts?.forceWeak) setFilter(f => ({ ...f, weakOnly: true }))
    setSummary(null)
    setScore(0)
    setCombo(0)
    setBestRunCombo(0)
    setHits(0)
    setMisses(0)
    setHearts(3)
    setWave(1)
    setSniperClears(0)
    setGauntletKeyIdx(0)
    setGauntletStrIdx(0)
    setGauntletGoingUp(true)
    setSoloChordIdx(0)
    setDailyPhase(0)
    setTimeLeftMs(m === 'daily' ? 180000 : 60000)
    setCoachTip('')
    setRevealSpot(null)
    setWrongSpot(null)
    setInspectSpot(null)
    rushOrbsRef.current = []
    rushBossRef.current = null
    setRushOrbs([])
    setRushBoss(null)
    setRushLasers([])
    runTimesRef.current = []
    missedListRef.current = []
    lastSpotKeyRef.current = ''
    runningRef.current = true
    setRunning(true)

    if (m === 'survival') {
      stateRef.current = { ...stateRef.current, mode: m, wave: 1, hearts: 3, hits: 0, combo: 0 }
      spawnRushEntity(1, [])
    } else {
      dealNext({
        overrideMode: m,
        overrideStage: stg,
        overrideGauntletKey: 0,
        overrideGauntletStr: 0,
        overrideSoloIdx: 0,
        overrideDailyPhase: 0,
        forceWeak: opts?.forceWeak,
      })
    }
  }, [dealNext, mode, spawnRushEntity, stageId])

  const registerHit = useCallback((spot: FretSpot, advanceNow = true, extraLabel?: string, customMs?: number) => {
    const ms = Math.max(180, customMs ?? (performance.now() - shownAtRef.current))
    const st = stateRef.current
    const nextCombo = st.combo + 1
    const nextBestCombo = Math.max(st.bestRunCombo, nextCombo)
    const { points, badge } = calcHitPoints(ms, nextCombo)
    const nextHits = st.hits + 1

    runTimesRef.current.push(ms)
    setCombo(nextCombo)
    setBestRunCombo(nextBestCombo)
    bumpCombo(nextCombo)
    logAnswer(true, nextCombo)
    setHits(nextHits)
    setScore(sc => sc + points)
    pulseString(spot.s)
    flashHitSpot(spot)
    addBurst(spot.s, spot.f, extraLabel ?? `+${points} ${badge}`, ms <= 900 ? 'lightning' : 'hit')
    haptic('success')

    if (inputMode === 'tap') {
      try {
        const ctx = audio()
        void ctx.resume()
        playNote(spot.midi, ctx.currentTime + 0.01, 0.55)
      } catch { /* ignore */ }
    }

    persist(recordFretResult(dataRef.current, tKey, spot.s, spot.f, true, ms))
    if (st.mode === 'survival' && nextCombo > 0 && nextCombo % 15 === 0) {
      setHearts(h => Math.min(3, h + 1))
    }

    if (advanceNow) {
      setTimeout(() => { if (runningRef.current) dealNext() }, 240)
    }
    return { points, badge, nextHits, ms }
  }, [addBurst, dealNext, flashHitSpot, inputMode, persist, pulseString, tKey])

  const registerMiss = useCallback((target: FretSpot, attempted?: { s: number; f: number }, customMsg?: string, loseHeart = true) => {
    const ms = Math.max(300, performance.now() - shownAtRef.current)
    const st = stateRef.current
    setCombo(0)
    setMisses(m => m + 1)
    logAnswer(false, 0)
    haptic('warning')
    if (attempted) {
      setWrongSpot(attempted)
      addBurst(attempted.s, attempted.f, '✕', 'miss')
      setTimeout(() => setWrongSpot(null), 500)
    }
    if (hintMode !== 'off') setRevealSpot(target)
    setCoachTip(customMsg ?? shortcutTip(midis, target))
    if (!missedListRef.current.some(x => x.s === target.s && x.f === target.f)) {
      missedListRef.current.push(target)
    }
    persist(recordFretResult(dataRef.current, tKey, target.s, target.f, false, ms))

    if (st.mode === 'survival' && loseHeart) {
      setShieldFlash(true)
      setTimeout(() => setShieldFlash(false), 380)
      const nextHearts = st.hearts - 1
      setHearts(nextHearts)
      if (nextHearts <= 0) setTimeout(() => endRun(), 380)
    }
  }, [addBurst, endRun, hintMode, midis, persist, tKey])

  // Handle ANY input (touchscreen tap OR real guitar mic pitch!)
  const handleAttempt = useCallback((attempt: { s?: number; f?: number; midi?: number; pc?: number; fromMic?: boolean }) => {
    const st = stateRef.current
    if (!runningRef.current) return
    const sub = activeSubMode(st.mode, st.dailyPhase)

    // --- 🚀 NOTE RUSH (FRET DEFENSE) ---
    if (sub === 'survival') {
      const orbs = rushOrbsRef.current
      const boss = rushBossRef.current
      const matched = matchRushAttempt(orbs, boss, attempt)
      if (matched?.kind === 'boss' && boss) {
        const sp = matched.spot
        const nextFound = [...boss.found, spotKey(sp.s, sp.f)]
        const doneBoss = nextFound.length >= boss.spots.length
        fireLaser(sp.s, boss.x, doneBoss ? '👑 BOSS SHATTERED!' : `${nextFound.length}/${boss.spots.length} ⚡`, 'boss')
        registerHit(sp, false, doneBoss ? '👑 +600 BOSS!' : `${nextFound.length}/${boss.spots.length} ✓`, performance.now() - boss.spawnedAt)
        if (doneBoss) {
          setScore(sc => sc + 500)
          rushBossRef.current = null
          setRushBoss(null)
          const nextWave = st.wave + 1
          setWave(nextWave)
          setTimeout(() => { if (runningRef.current) spawnRushEntity(nextWave, []) }, 620)
        } else {
          const updatedBoss = { ...boss, found: nextFound }
          rushBossRef.current = updatedBoss
          setRushBoss(updatedBoss)
        }
        return
      }
      if (matched?.kind === 'orb') {
        const orb = matched.orb
        const ms = performance.now() - orb.spawnedAt
        const remaining = orbs.filter(o => o.id !== orb.id)
        rushOrbsRef.current = remaining
        setRushOrbs(remaining)
        const res = registerHit(orb.spot, false, undefined, ms)
        fireLaser(orb.spot.s, orb.x, `+${res.points}`, ms <= 1500 ? 'lightning' : 'hit')
        // Advance wave every 5 orb blasts!
        if (res.nextHits > 0 && res.nextHits % 5 === 0) {
          const nextWave = st.wave + 1
          setWave(nextWave)
          if (nextWave % 5 === 0) {
            // Clear lanes for Boss Wave!
            setTimeout(() => { if (runningRef.current) spawnRushEntity(nextWave, []) }, 480)
          } else if (remaining.length === 0) {
            setTimeout(() => { if (runningRef.current) spawnRushEntity(nextWave, []) }, 260)
          }
        } else if (remaining.length === 0) {
          setTimeout(() => { if (runningRef.current) spawnRushEntity(st.wave, []) }, 220)
        }
        return
      }
      // Wrong tap on touch screen in Note Rush: give gentle visual hint without instantly killing a heart (only shield breach takes a heart!)
      if (!attempt.fromMic && attempt.s !== undefined && attempt.f !== undefined) {
        const closest = [...orbs].sort((a, b) => a.x - b.x)[0]?.spot ?? boss?.spots.find(sp => !boss.found.includes(spotKey(sp.s, sp.f)))
        if (closest) registerMiss(closest, { s: attempt.s, f: attempt.f }, undefined, false)
      }
      return
    }

    const p = promptRef.current
    if (!p) return

    // --- 🎯 OCTAVE SNIPER ---
    if (p.sniperSpots && p.sniperPc !== undefined) {
      const foundSet = new Set(p.sniperFound ?? [])
      const remaining = p.sniperSpots.filter(sp => !foundSet.has(spotKey(sp.s, sp.f)))
      let match: FretSpot | undefined
      if (attempt.s !== undefined && attempt.f !== undefined) {
        match = remaining.find(sp => sp.s === attempt.s && sp.f === attempt.f)
      } else if (attempt.midi !== undefined) {
        match = remaining.find(sp => sp.midi === attempt.midi)
          ?? remaining.find(sp => Math.abs(sp.midi - attempt.midi!) === 12)
      }
      if (match) {
        const nextFound = [...(p.sniperFound ?? []), spotKey(match.s, match.f)]
        const doneAll = nextFound.length >= p.sniperSpots.length
        setPrompt({ ...p, sniperFound: nextFound })
        if (doneAll) {
          setSniperClears(c => c + 1)
          registerHit(match, false, '🎯 ALL 6 CLEAR!')
          setTimeout(() => { if (runningRef.current) dealNext() }, 620)
        } else {
          registerHit(match, false, `${nextFound.length}/${p.sniperSpots.length} ✓`)
          shownAtRef.current = performance.now()
        }
      } else if (remaining[0] && !attempt.fromMic) {
        registerMiss(remaining[0], attempt.s !== undefined && attempt.f !== undefined ? { s: attempt.s, f: attempt.f } : undefined)
      }
      return
    }

    // --- 🧠 SOLO INTERVALS ---
    if (p.solo) {
      const idx = p.soloIdx ?? 0
      const targetPc = p.solo.targetPcs[idx]
      const targetLabel = p.solo.labels[idx]
      const inBox = (f: number) => f >= p.solo!.fromFret && f <= p.solo!.toFret
      let matchedSpot: FretSpot | undefined
      if (attempt.s !== undefined && attempt.f !== undefined) {
        const m = midis[attempt.s] + attempt.f
        const ap = ((m % 12) + 12) % 12
        if (ap === targetPc && inBox(attempt.f)) matchedSpot = { s: attempt.s, f: attempt.f, midi: m, pc: ap }
      } else if (attempt.midi !== undefined) {
        const ap = ((attempt.midi % 12) + 12) % 12
        if (ap === targetPc) {
          const cands = spotsForPc(midis, targetPc, p.solo.fromFret, p.solo.toFret)
          matchedSpot = cands.find(sp => sp.midi === attempt.midi) ?? cands[0]
        }
      }
      if (matchedSpot) {
        const nextFound = [...(p.soloFound ?? []), matchedSpot]
        const nextIdx = idx + 1
        if (nextIdx >= p.solo.targetPcs.length) {
          const nextChord = (st.soloChordIdx + 1) % soloChordsRef.current.length
          setSoloChordIdx(nextChord)
          setPrompt({ ...p, soloIdx: nextIdx, soloFound: nextFound })
          registerHit(matchedSpot, false, `${targetLabel} ✓ CHORD CLEAR!`)
          setTimeout(() => { if (runningRef.current) dealNext({ overrideSoloIdx: nextChord }) }, 550)
        } else {
          setPrompt({ ...p, soloIdx: nextIdx, soloFound: nextFound })
          registerHit(matchedSpot, false, `${targetLabel} ✓`)
          shownAtRef.current = performance.now()
          if (st.voiceOn) speakPrompt(`Next: ${p.solo.labels[nextIdx]}`)
        }
      } else if (!attempt.fromMic && attempt.s !== undefined && attempt.f !== undefined) {
        const boxTargets = spotsForPc(midis, targetPc, p.solo.fromFret, p.solo.toFret)
        const ref = boxTargets[0] ?? { s: 0, f: p.solo.fromFret, midi: midis[0] + p.solo.fromFret, pc: targetPc }
        registerMiss(ref, { s: attempt.s, f: attempt.f }, `${p.solo.chordSymbol}'s ${targetLabel} is ${fullPcLabel(targetPc)} (frets ${p.solo.fromFret}–${p.solo.toFret}).`)
      }
      return
    }

    // --- ❓ NAME THAT FRET ---
    if (sub === 'name' && p.spot) {
      if (attempt.pc !== undefined) {
        if (attempt.pc === p.spot.pc) registerHit(p.spot, true)
        else registerMiss(p.spot, undefined, `That fret is ${fullPcLabel(p.spot.pc)}. ${shortcutTip(midis, p.spot)}`)
      } else if (attempt.fromMic && attempt.midi !== undefined) {
        if (((attempt.midi % 12) + 12) % 12 === p.spot.pc) registerHit(p.spot, true)
      }
      return
    }

    // --- 🥁 CIRCLE-OF-4THS METRONOME GAUNTLET ---
    if (sub === 'gauntlet' && p.spot) {
      const target = p.spot
      const ok = attempt.s !== undefined && attempt.f !== undefined
        ? attempt.s === target.s && attempt.f === target.f
        : attempt.midi !== undefined && (attempt.midi === target.midi || ((attempt.midi % 12) + 12) % 12 === target.pc)
      if (ok) {
        let nextKey = st.gauntletKeyIdx
        let nextStr = st.gauntletStrIdx
        let nextUp = st.gauntletGoingUp
        let completedSweep = false
        if (st.gauntletDir === 'up') {
          if (nextStr < nStr - 1) nextStr++
          else { nextStr = 0; nextKey = (nextKey + 1) % CIRCLE_FOURTHS_PCS.length; completedSweep = true }
        } else if (st.gauntletDir === 'down') {
          if (nextStr > 0) nextStr--
          else { nextStr = nStr - 1; nextKey = (nextKey + 1) % CIRCLE_FOURTHS_PCS.length; completedSweep = true }
        } else {
          if (nextUp) {
            if (nextStr < nStr - 1) nextStr++
            else { nextUp = false; nextStr = Math.max(0, nStr - 2) }
          } else {
            if (nextStr > 0) nextStr--
            else { nextUp = true; nextStr = 0; nextKey = (nextKey + 1) % CIRCLE_FOURTHS_PCS.length; completedSweep = true }
          }
        }
        setGauntletKeyIdx(nextKey)
        setGauntletStrIdx(nextStr)
        setGauntletGoingUp(nextUp)
        if (completedSweep) {
          const nextBpm = Math.min(180, st.gauntletBpm + 5)
          setGauntletBpm(nextBpm)
          registerHit(target, false, `🔥 SWEEP! +5 BPM (${nextBpm})`)
        } else {
          registerHit(target, false)
        }
        setTimeout(() => {
          if (runningRef.current) dealNext({ overrideGauntletKey: nextKey, overrideGauntletStr: nextStr })
        }, 160)
      } else if (!attempt.fromMic && attempt.s !== undefined && attempt.f !== undefined) {
        registerMiss(target, { s: attempt.s, f: attempt.f })
      }
      return
    }

    // --- 🧭 PATH / ⚡ BLITZ / 🏆 DAILY ---
    if (p.spot) {
      const target = p.spot
      const ok = attempt.s !== undefined && attempt.f !== undefined
        ? attempt.s === target.s && attempt.f === target.f
        : attempt.midi !== undefined && attempt.midi === target.midi
      if (ok) registerHit(target, true)
      else if (!attempt.fromMic && attempt.s !== undefined && attempt.f !== undefined) {
        registerMiss(target, { s: attempt.s, f: attempt.f })
      }
    }
  }, [dealNext, fireLaser, midis, nStr, registerHit, registerMiss, spawnRushEntity])

  // Real-guitar microphone listener
  const listenerRef = useRef<NoteListener | null>(null)
  useEffect(() => {
    if (!running || inputMode !== 'mic') {
      setHeardLabel('')
      return
    }
    let stopped = false
    const listener = new NoteListener('fretgame')
    listenerRef.current = listener
    listener.onNote = e => {
      if (stopped || !runningRef.current) return
      setHeardLabel(midiName(e.midi))
      handleAttempt({ midi: e.midi, fromMic: true })
    }
    listener.start()
      .then(() => {
        if (stopped) return
        setMicErr('')
        setMicInfo(micWhere())
      })
      .catch(() => {
        if (!stopped) setMicErr('Microphone unavailable — switched to Tap Neck mode.')
        if (!stopped) setInputMode('tap')
      })
    return () => {
      stopped = true
      listenerRef.current = null
      listener.stop()
    }
  }, [running, inputMode, handleAttempt])

  // Feed expected MIDI pitches to NoteListener (works for Note Rush orbs, Boss, Solo, Path, Blitz, Gauntlet!)
  useEffect(() => {
    const l = listenerRef.current
    if (!l || !running) return
    const expected: number[] = []
    if (mode === 'survival') {
      if (rushBoss) {
        const found = new Set(rushBoss.found)
        for (const sp of rushBoss.spots) if (!found.has(spotKey(sp.s, sp.f))) expected.push(sp.midi)
      } else {
        for (const o of rushOrbs) expected.push(o.spot.midi)
      }
    } else if (prompt?.spot) {
      expected.push(prompt.spot.midi)
    } else if (prompt?.sniperSpots) {
      const found = new Set(prompt.sniperFound ?? [])
      for (const sp of prompt.sniperSpots) if (!found.has(spotKey(sp.s, sp.f))) expected.push(sp.midi)
    } else if (prompt?.solo) {
      const targetPc = prompt.solo.targetPcs[prompt.soloIdx ?? 0]
      if (targetPc !== undefined) {
        for (const sp of spotsForPc(midis, targetPc, prompt.solo.fromFret, prompt.solo.toFret)) expected.push(sp.midi)
      }
    }
    l.expect(expected.slice(0, 12))
  }, [running, mode, rushOrbs, rushBoss, prompt, midis])

  // 🚀 Note Rush (Fret Defense) 25 FPS smooth orb & boss loop
  useEffect(() => {
    if (!running || mode !== 'survival') return
    let lastT = performance.now()
    const timer = setInterval(() => {
      if (!runningRef.current) return
      const now = performance.now()
      const dt = Math.min(0.15, (now - lastT) / 1000)
      lastT = now
      const st = stateRef.current
      const spec = rushWaveSpec(st.wave, nStr)

      // Boss movement
      if (rushBossRef.current) {
        const b = rushBossRef.current
        const nextX = b.x - b.speed * dt
        if (nextX <= 0) {
          const missed = b.spots.find(sp => !b.found.includes(spotKey(sp.s, sp.f))) ?? b.spots[0]
          rushBossRef.current = null
          setRushBoss(null)
          registerMiss(missed, undefined, `👑 Boss breached the shield! ${shortcutTip(midis, missed)}`, true)
          if (st.hearts > 1) {
            const nextWave = st.wave + 1
            setWave(nextWave)
            setTimeout(() => { if (runningRef.current) spawnRushEntity(nextWave, []) }, 650)
          }
        } else {
          const moved = { ...b, x: nextX }
          rushBossRef.current = moved
          setRushBoss(moved)
        }
        return
      }

      // Orb movement & shield breach checks
      const cur = rushOrbsRef.current
      const survivors: RushOrb[] = []
      const breached: RushOrb[] = []
      for (const orb of cur) {
        const nextX = orb.x - orb.speed * dt
        if (nextX <= 0) breached.push(orb)
        else survivors.push({ ...orb, x: nextX })
      }
      if (breached.length > 0) {
        rushOrbsRef.current = survivors
        setRushOrbs(survivors)
        const first = breached[0]
        registerMiss(first.spot, undefined, `🛡 Shield hit by ${first.label}! ${shortcutTip(midis, first.spot)}`, true)
        if (st.hearts > 1 && survivors.length === 0) {
          setTimeout(() => { if (runningRef.current) spawnRushEntity(st.wave, []) }, 550)
        }
        return
      }
      rushOrbsRef.current = survivors
      setRushOrbs(survivors)

      // Spawn second concurrent orb on Wave 4+ once the leading orb has passed 58%
      if (survivors.length === 0) {
        spawnRushEntity(st.wave, [])
      } else if (survivors.length < spec.maxConcurrent && Math.max(...survivors.map(o => o.x)) < 58) {
        spawnRushEntity(st.wave, survivors)
      }
    }, 40)
    return () => clearInterval(timer)
  }, [running, mode, midis, nStr, registerMiss, spawnRushEntity])

  // Blitz (60s) & Daily (3x60s) countdown timers
  useEffect(() => {
    if (!running || (mode !== 'blitz' && mode !== 'daily')) return
    const tick = setInterval(() => {
      if (!runningRef.current) return
      setTimeLeftMs(prev => {
        const next = prev - 100
        if (mode === 'daily') {
          const nextPhase: 0 | 1 | 2 = next > 120000 ? 0 : next > 60000 ? 1 : 2
          if (nextPhase !== stateRef.current.dailyPhase) {
            setDailyPhase(nextPhase)
            dealNext({ overrideDailyPhase: nextPhase })
          }
        }
        if (next <= 0) {
          setTimeout(() => endRun(), 0)
          return 0
        }
        return next
      })
    }, 100)
    return () => clearInterval(tick)
  }, [running, mode, dealNext, endRun])

  // Metronome click loop for Gauntlet & Daily Phase 1
  useEffect(() => {
    const isGauntletActive = running && (mode === 'gauntlet' || (mode === 'daily' && dailyPhase === 1))
    if (!isGauntletActive) return
    let beat = 0
    const msPerBeat = Math.round(60000 / Math.max(40, gauntletBpm))
    const timer = setInterval(() => {
      try {
        const ctx = audio()
        void ctx.resume()
        playClick(ctx.currentTime + 0.02, 'wood', beat % 4 === 0 ? 'accent' : 'beat', 0.5)
      } catch { /* ignore */ }
      beat++
      setGauntletBeatPulse(true)
      setTimeout(() => setGauntletBeatPulse(false), 140)
    }, msPerBeat)
    return () => clearInterval(timer)
  }, [running, mode, dailyPhase, gauntletBpm])

  const toggleLeftHanded = () => setLeftHanded(l => {
    const next = !l
    try { localStorage.setItem('kg:fretLeft', next ? '1' : '0') } catch { /* ignore */ }
    return next
  })

  const toggleStringFilter = (s: number) => {
    setFilter(f => {
      const cur = f.strings.length ? f.strings : midis.map((_, i) => i)
      const has = cur.includes(s)
      const next = has ? cur.filter(x => x !== s) : [...cur, s].sort((a, b) => a - b)
      return { ...f, strings: next.length === 0 || next.length === nStr ? [] : next }
    })
  }

  const feverOn = combo >= 10
  const subMode = activeSubMode(mode, dailyPhase)

  const constellationLinks = useMemo(() => {
    if (!prompt) return []
    if (prompt.sniperSpots && prompt.sniperFound && prompt.sniperFound.length >= 2) {
      const foundSpots = prompt.sniperSpots.filter(sp => prompt.sniperFound!.includes(spotKey(sp.s, sp.f)))
      return octaveConstellationLinks(foundSpots)
    }
    if (prompt.anchor && prompt.spot && revealSpot) {
      return [{ s1: prompt.anchor.s, f1: prompt.anchor.f, s2: prompt.spot.s, f2: prompt.spot.f }]
    }
    return []
  }, [prompt, revealSpot])

  // Render Study Primer Banner (when paused) OR Active Studio Prompt Banner (when running non-Rush modes)
  const renderBanner = () => {
    if (!running) {
      return (
        <div className="fg-primer-banner" data-testid="fg-primer-banner">
          <div className="stack" style={{ gap: 6, flex: '1 1 280px' }}>
            <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="fg-chip" style={{ background: 'rgba(56,189,248,0.22)', color: '#bae6fd' }}>👀 STUDY PRIMER</span>
              <b style={{ fontSize: 16 }}>{primerInfo.label}</b>
            </div>
            <span className="small muted">
              Study these lit notes first (tap any fret to hear it). The instant you press Start, <b>all note names vanish</b> so you play from real memory — with your <b>🎸 guitar</b> or <b>👆 touchscreen</b>!
            </span>
            {/* 1-tap Chunk / Full Neck selector right inside the Study Primer */}
            {mode !== 'path' && mode !== 'gauntlet' && mode !== 'sniper' && mode !== 'daily' && (
              <div className="row" style={{ gap: 5, flexWrap: 'wrap', alignItems: 'center' }} data-testid="fg-chunk-pills">
                <span className="small muted">Study chunk:</span>
                {mode === 'survival' && (
                  <button
                    className={`btn sm${!rushLockChunk ? ' set' : ''}`}
                    onClick={() => setRushLockChunk(false)}
                    data-testid="fg-chunk-auto"
                  >
                    🌊 Auto Waves
                  </button>
                )}
                {ZONE_PRESETS.slice(0, 5).map(z => {
                  const active = (mode !== 'survival' || rushLockChunk) && filter.fromFret === z.from && filter.toFret === z.to
                  return (
                    <button
                      key={z.id}
                      className={`btn sm${active ? ' set' : ''}`}
                      onClick={() => {
                        if (mode === 'survival') setRushLockChunk(true)
                        setFilter(f => ({ ...f, fromFret: z.from, toFret: z.to }))
                      }}
                      data-testid={`fg-chunk-${z.id}`}
                    >
                      {z.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <button
            className="btn primary"
            style={{ fontSize: 15, padding: '12px 22px', whiteSpace: 'nowrap' }}
            onClick={() => startGame(mode)}
            data-testid="fg-start-btn"
          >
            ▶ I'm Ready — Start!
          </button>
        </div>
      )
    }

    // Note Rush has its own live 6-string Neon Radar right below HUD!
    if (mode === 'survival') return null

    if (!prompt) return null

    if (prompt.sniperSpots && prompt.sniperPc !== undefined) {
      const noteName = displayPc(prompt.sniperPc, 'both', prompt.preferFlat)
      const count = prompt.sniperFound?.length ?? 0
      const total = prompt.sniperSpots.length
      return (
        <div className="fg-prompt" data-testid="fg-prompt">
          <div className="fg-prompt-left">
            <span className="fg-chip">🎯 OCTAVE SNIPER</span>
            <span className="fg-big-note">{noteName}</span>
            <span className="fg-sub">Find all {total} across the neck ({count}/{total})</span>
          </div>
          <div className="fg-pips">
            {prompt.sniperSpots.map(sp => {
              const hit = prompt.sniperFound?.includes(spotKey(sp.s, sp.f))
              return <span key={spotKey(sp.s, sp.f)} className={`fg-pip${hit ? ' on' : ''}`}>{SHARPS[midis[sp.s] % 12]}</span>
            })}
          </div>
        </div>
      )
    }

    if (prompt.solo) {
      const idx = prompt.soloIdx ?? 0
      return (
        <div className="fg-prompt" data-testid="fg-prompt">
          <div className="fg-prompt-left">
            <span className="fg-chip">🧠 SOLO · Frets {prompt.solo.fromFret}–{prompt.solo.toFret}</span>
            <span className="fg-big-note" style={{ fontSize: 30 }}>{prompt.solo.chordSymbol}</span>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {prompt.solo.labels.map((lbl, i) => (
              <span key={`${lbl}-${i}`} className={`fg-iv-pill${i < idx ? ' done' : i === idx ? ' active' : ''}`}>
                {i < idx ? `✓ ${lbl}` : lbl}
              </span>
            ))}
            <button
              className="btn sm ghost"
              onClick={() => {
                try { const ctx = audio(); void ctx.resume(); strum(prompt.solo!.chordMidis, ctx.currentTime + 0.02, { spread: 0.028, gain: 0.55 }) } catch { /* ignore */ }
              }}
            >
              🔊 Chord
            </button>
            <button className={`btn sm${peekHint ? ' set' : ' ghost'}`} onClick={() => setPeekHint(h => !h)}>💡 Hint</button>
          </div>
        </div>
      )
    }

    if (subMode === 'name' && prompt.spot) {
      return (
        <div className="fg-prompt" data-testid="fg-prompt">
          <div className="fg-prompt-left">
            <span className="fg-chip">❓ NAME THAT FRET</span>
            <span className="fg-big-note">?</span>
            <span className="fg-sub">
              {friendlyStringLabel(midis, prompt.spot.s)} · Fret {prompt.spot.f}
              {inputMode === 'mic' ? ' (tap name or play on guitar)' : ''}
            </span>
          </div>
          <button
            className="btn sm ghost"
            onClick={() => {
              try { const ctx = audio(); void ctx.resume(); playNote(prompt.spot!.midi, ctx.currentTime + 0.02, 0.75) } catch { /* ignore */ }
            }}
          >
            🔊 Hear Again
          </button>
        </div>
      )
    }

    if (prompt.spot) {
      const noteName = displayPc(
        prompt.spot.pc,
        subMode === 'path' && stageId <= 4 ? 'natural' : filter.accidentals,
        prompt.preferFlat,
      )
      return (
        <div className="fg-prompt" data-testid="fg-prompt">
          <div className="fg-prompt-left">
            <span className="fg-chip">
              {subMode === 'gauntlet'
                ? `🥁 ${gauntletBpm} BPM · Circle of 4ths`
                : prompt.anchor
                  ? `🔗 OCTAVE from ${friendlyStringLabel(midis, prompt.anchor.s)} fret ${prompt.anchor.f}`
                  : mode === 'daily'
                    ? `🏆 DAILY · Phase ${dailyPhase + 1}/3`
                    : '🎯 PLAY THIS NOTE'}
            </span>
            <span className="fg-big-note">{noteName}</span>
            <span className="fg-sub">on <b>{friendlyStringLabel(midis, prompt.spot.s)}</b> string</span>
          </div>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            {subMode === 'gauntlet' && <span className={`fg-beat-dot${gauntletBeatPulse ? ' pulse' : ''}`} aria-hidden />}
            <button className={`btn sm${peekHint ? ' set' : ' ghost'}`} onClick={() => setPeekHint(h => !h)}>💡 Hint</button>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="stack fg-root" style={{ gap: 10 }} data-testid="fretboard-game">
      {/* Slim Always-Accessible Top Strip */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <button className="btn sm" onClick={onExit} data-testid="fg-back-btn">← Learn</button>
          <h1 style={{ margin: 0, fontSize: 19 }}>Fretboard Game</h1>
          <span className="badge tabular" title="Overall 0–12 neck mastery">{overallMastery.pct}% Mastered</span>
        </div>
        <div className="row" style={{ gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="seg" role="group" aria-label="Answer method">
            <button
              className="btn sm"
              aria-pressed={inputMode === 'mic'}
              onClick={() => setInputMode('mic')}
              data-testid="fg-input-mic"
              title="Play on your real guitar (microphone listens)"
            >
              🎸 Guitar Mic
            </button>
            <button
              className="btn sm"
              aria-pressed={inputMode === 'tap'}
              onClick={() => setInputMode('tap')}
              data-testid="fg-input-tap"
              title="Play silently by tapping blank frets on the touchscreen"
            >
              👆 Touch Screen
            </button>
          </div>
          <button
            className={`btn sm${voiceOn ? ' set' : ''}`}
            aria-pressed={voiceOn}
            onClick={() => setVoiceOn(v => !v)}
            title="Eyes-Up Voice Callouts: speaks notes aloud so you can watch your real guitar"
            data-testid="fg-voice-btn"
          >
            🔊 Voice
          </button>
          <button
            className={`btn sm${showHeatmap ? ' set' : ''}`}
            aria-pressed={showHeatmap}
            onClick={() => setShowHeatmap(h => !h)}
            title="Show live Red/Amber/Green speed & accuracy heatmap on the neck during play"
            data-testid="fg-heatmap-toggle"
          >
            🗺 Heatmap
          </button>
          <button
            className="btn sm primary"
            onClick={() => startGame('blitz', { forceWeak: true })}
            title="Launch a 60s drill targeting ONLY your weakest red & amber frets"
            data-testid="fg-weak-drill-btn"
          >
            🔥 Weak Spots{weakCount > 0 ? ` (${weakCount})` : ''}
          </button>
        </div>
      </div>

      <WinArea area="fretGame" prefer={['fg-modes', 'fg-stage', 'fg-heatmap']}>
        {/* Menu Bar Window (noZoom: pure menu bar!) */}
        <Win id="fg-modes" title="Game Modes & Setup" noZoom resizable={false} bodyClass="stack" bodyStyle={{ gap: 8 }}>
          <div className="fg-mode-strip" role="tablist" aria-label="Fretboard game modes">
            {MODE_TABS.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={mode === t.id}
                className={`fg-mode-pill${mode === t.id ? ' on' : ''}`}
                onClick={() => {
                  if (running) {
                    runningRef.current = false
                    setRunning(false)
                    rushOrbsRef.current = []
                    rushBossRef.current = null
                    setRushOrbs([])
                    setRushBoss(null)
                  }
                  setMode(t.id)
                  setSummary(null)
                }}
                data-testid={`fg-mode-${t.id}`}
              >
                <span className="fg-mode-ico">{t.icon}</span>
                <span className="fg-mode-txt">
                  <b>{t.label}</b>
                  <span>{t.tag}</span>
                </span>
              </button>
            ))}
          </div>

          {mode === 'path' && (
            <div className="fg-stage-strip" data-testid="fg-stage-strip">
              {stageStats.map(({ stage, pct }) => (
                <button
                  key={stage.id}
                  className={`fg-stage-card${stageId === stage.id ? ' on' : ''}`}
                  style={{ '--st-col': stage.accent } as React.CSSProperties}
                  onClick={() => {
                    if (running) { runningRef.current = false; setRunning(false) }
                    setStageId(stage.id)
                    setSummary(null)
                  }}
                  data-testid={`fg-stage-${stage.id}`}
                >
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <b>{stage.id}. {stage.short}</b>
                    <span className="small tabular">{pct}%</span>
                  </div>
                  <div className="fg-stage-bar"><span style={{ width: `${pct}%`, background: stage.accent }} /></div>
                </button>
              ))}
            </div>
          )}

          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {mode === 'gauntlet' && (
                <>
                  <span className="small muted">Tempo:</span>
                  <button className="btn sm" onClick={() => setGauntletBpm(b => Math.max(40, b - 5))}>−5</button>
                  <b className="tabular small">{gauntletBpm} BPM</b>
                  <button className="btn sm" onClick={() => setGauntletBpm(b => Math.min(180, b + 5))}>+5</button>
                  <div className="seg">
                    {(['bounce', 'up', 'down'] as const).map(d => (
                      <button key={d} className="btn sm" aria-pressed={gauntletDir === d} onClick={() => setGauntletDir(d)}>
                        {d === 'bounce' ? '6→1→6' : d === 'up' ? '6→1' : '1→6'}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {(mode === 'solo' || (mode === 'path' && stageId === 6)) && (
                <>
                  <select className="input sm" value={soloProgId} onChange={e => setSoloProgId(e.target.value)} aria-label="Progression">
                    {jam && <option value="jam">Jam: {jam.chords.map(c => c.symbol).join(' – ')}</option>}
                    {STARTER_PROGS.map(pr => (
                      <option key={pr.id} value={pr.id}>{pr.label}</option>
                    ))}
                  </select>
                  {soloProgId !== 'jam' && (
                    <select className="input sm" value={soloKey} onChange={e => setSoloKey(e.target.value)} aria-label="Key">
                      {KEYS.map(k => <option key={k} value={k}>Key of {k}</option>)}
                    </select>
                  )}
                  <select className="input sm" value={soloLevel} onChange={e => setSoloLevel(e.target.value as SoloLevel)} aria-label="Interval level">
                    {SOLO_LEVELS.map(lv => <option key={lv.id} value={lv.id}>{lv.label}</option>)}
                  </select>
                </>
              )}
            </div>

            <button
              className={`btn sm${filtersOpen ? ' set' : ' ghost'}`}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen(o => !o)}
              data-testid="fg-filters-btn"
            >
              ⚙ Strings, Sharps &amp; Options{filter.weakOnly ? ' · Weak' : ''}
            </button>
          </div>

          {filtersOpen && (
            <div className="fg-filters stack" style={{ gap: 8 }} data-testid="fg-filters-panel">
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="small muted">Strings:</span>
                {midis.map((m, s) => {
                  const active = filter.strings.length === 0 || filter.strings.includes(s)
                  return (
                    <button key={s} className={`btn sm${active ? ' set' : ''}`} onClick={() => toggleStringFilter(s)}>
                      {SHARPS[m % 12]}{s === 0 && nStr === 6 ? '6' : s === 5 && nStr === 6 ? '1' : ''}
                    </button>
                  )
                })}
                {filter.strings.length > 0 && (
                  <button className="btn sm ghost" onClick={() => setFilter(f => ({ ...f, strings: [] }))}>All</button>
                )}
              </div>

              <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="small muted">Notes:</span>
                <div className="seg">
                  {([
                    ['natural', 'Naturals'],
                    ['sharps', 'Sharps #'],
                    ['flats', 'Flats ♭'],
                    ['both', 'All (#/♭)'],
                  ] as [AccidentalMode, string][]).map(([id, lbl]) => (
                    <button key={id} className="btn sm" aria-pressed={filter.accidentals === id} onClick={() => setFilter(f => ({ ...f, accidentals: id }))}>
                      {lbl}
                    </button>
                  ))}
                </div>
                <span className="small muted">Chunk:</span>
                <select
                  className="input sm"
                  value={`${filter.fromFret}-${filter.toFret}`}
                  onChange={e => {
                    const [a, b] = e.target.value.split('-').map(Number)
                    if (mode === 'survival') setRushLockChunk(true)
                    setFilter(f => ({ ...f, fromFret: a, toFret: b }))
                  }}
                >
                  {ZONE_PRESETS.map(z => <option key={z.id} value={`${z.from}-${z.to}`}>{z.label}</option>)}
                </select>
              </div>

              <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <label className="ex-check small">
                  <input type="checkbox" checked={Boolean(filter.weakOnly)} onChange={e => setFilter(f => ({ ...f, weakOnly: e.target.checked }))} />
                  Drill weak spots only
                </label>
                <label className="ex-check small">
                  <input type="checkbox" checked={leftHanded} onChange={toggleLeftHanded} />
                  Left-handed neck
                </label>
                <span className="small muted">Hints:</span>
                <div className="seg">
                  {(['miss', 'always', 'off'] as const).map(h => (
                    <button key={h} className="btn sm" aria-pressed={hintMode === h} onClick={() => setHintMode(h)}>
                      {h === 'miss' ? 'On miss' : h === 'always' ? 'Show dots' : 'Off'}
                    </button>
                  ))}
                </div>
              </div>
              {inputMode === 'mic' && <InputPicker />}
            </div>
          )}
        </Win>

        {/* Main Interactive Fretboard Arena Window (Zoomable!) */}
        <Win
          id="fg-stage"
          title={running ? `Fretboard Arena · ${MODE_TABS.find(t => t.id === mode)?.label}` : 'Fretboard Arena · Study Primer'}
          className={`panel fg-arena${feverOn ? ' fever' : ''}`}
          bodyClass="stack"
          bodyStyle={{ gap: 10 }}
        >
          {running && (
            <div className="fg-hud" data-testid="fg-hud">
              <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="fg-stat">
                  <span>SCORE</span>
                  <b className="tabular">{score.toLocaleString()}</b>
                </div>
                <div className={`fg-stat${combo >= 3 ? ' hot' : ''}${feverOn ? ' fever' : ''}`}>
                  <span>{feverOn ? '🔥 FEVER' : 'COMBO'}</span>
                  <b className="tabular">
                    {combo}×{combo >= 15 ? 5 : combo >= 10 ? 4 : combo >= 6 ? 3 : combo >= 3 ? 2 : 1}
                  </b>
                </div>
                {mode === 'survival' && (
                  <>
                    <div className="fg-stat">
                      <span>WAVE</span>
                      <b className="tabular">{wave}</b>
                    </div>
                    <div className="fg-hearts" aria-label={`${hearts} shields remaining`}>
                      {[0, 1, 2].map(i => (
                        <span key={i} className={i < hearts ? 'on' : 'off'}>♥</span>
                      ))}
                    </div>
                  </>
                )}
                {(mode === 'blitz' || mode === 'daily') && (
                  <div className={`fg-stat${timeLeftMs <= 10000 ? ' warn' : ''}`}>
                    <span>{mode === 'daily' ? `PHASE ${dailyPhase + 1}/3` : 'TIME'}</span>
                    <b className="tabular">{Math.ceil(timeLeftMs / 1000)}s</b>
                  </div>
                )}
                {mode === 'sniper' && (
                  <div className="fg-stat">
                    <span>CLEARS</span>
                    <b className="tabular">{sniperClears}</b>
                  </div>
                )}
              </div>

              <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                {inputMode === 'mic' && (
                  <span className="badge small" title={micInfo || 'Microphone'}>
                    🎤 {heardLabel ? `Heard ${heardLabel}` : 'Listening…'}
                  </span>
                )}
                <button className="btn sm" onClick={endRun} data-testid="fg-stop-btn">■ Finish</button>
              </div>
            </div>
          )}

          {micErr && <p className="notice small" style={{ margin: 0 }}>{micErr}</p>}

          {/* End-of-Run Summary Card OR Study Primer / Studio Prompt Banner */}
          {summary ? (
            <div className="fg-summary" data-testid="fg-summary">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                  <div className={`fg-grade grade-${sessionGrade(Math.round((summary.hits / Math.max(1, summary.hits + summary.misses)) * 100), summary.avgMs)}`}>
                    {sessionGrade(Math.round((summary.hits / Math.max(1, summary.hits + summary.misses)) * 100), summary.avgMs)}
                  </div>
                  <div className="stack" style={{ gap: 2 }}>
                    <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                      <b style={{ fontSize: 18 }}>{summary.score.toLocaleString()} pts</b>
                      {summary.isNewBest && <span className="badge" style={{ background: '#f59e0b', color: '#111' }}>🏆 NEW BEST!</span>}
                    </div>
                    <span className="small muted tabular">
                      {summary.hits} hits · {Math.round((summary.hits / Math.max(1, summary.hits + summary.misses)) * 100)}% accuracy
                      {summary.avgMs > 0 ? ` · ${(summary.avgMs / 1000).toFixed(2)}s avg` : ''}
                      {` · Best combo ${summary.bestCombo}`}
                      {summary.wave ? ` · Wave ${summary.wave}` : ''}
                      {summary.bpm ? ` · ${summary.bpm} BPM` : ''}
                    </span>
                  </div>
                </div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn primary sm" onClick={() => startGame(summary.mode)}>↻ Play Again</button>
                  <button className="btn sm" onClick={() => setSummary(null)}>👀 Back to Primer</button>
                  {summary.missedSpots.length > 0 && (
                    <button className="btn sm" onClick={() => startGame('blitz', { forceWeak: true })}>🔥 Drill Missed</button>
                  )}
                </div>
              </div>
              {summary.missedSpots.length > 0 && (
                <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                  <span className="small muted">Missed / Slow:</span>
                  {summary.missedSpots.slice(0, 6).map(sp => (
                    <span key={spotKey(sp.s, sp.f)} className="badge small">
                      {fullPcLabel(sp.pc)} ({SHARPS[midis[sp.s] % 12]} fret {sp.f})
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            renderBanner()
          )}

          {/* 🚀 NOTE RUSH (FRET DEFENSE) 6-STRING NEON ARCADE RADAR */}
          {running && mode === 'survival' && (
            <NoteRushRadar
              midis={midis}
              waveTitle={rushLockChunk ? `Wave ${wave} · Chunk ${filter.fromFret}–${filter.toFret}` : rushWaveSpec(wave, nStr).title}
              orbs={rushOrbs}
              boss={rushBoss}
              lasers={rushLasers}
              shieldFlash={shieldFlash}
              feverOn={feverOn}
              leftHanded={leftHanded}
              inputMode={inputMode}
            />
          )}

          {coachTip && (
            <div className="fg-coach-tip" data-testid="fg-coach-tip">
              💡 {coachTip}
            </div>
          )}

          {/* Interactive Pro Studio SVG Fretboard (Study Primer before start -> Blank Recall Neck during play!) */}
          <GameNeck
            midis={midis}
            fromFret={displayRange.from}
            toFret={displayRange.to}
            leftHanded={leftHanded}
            showHeatmap={showHeatmap}
            heatMap={heatMap}
            running={running}
            primerKeys={primerInfo.keys}
            prompt={prompt}
            rushTargetStrings={running && mode === 'survival' ? new Set(rushOrbs.map(o => o.spot.s)) : undefined}
            subMode={subMode}
            lastHitSpot={lastHitSpot}
            wrongSpot={wrongSpot}
            revealSpot={revealSpot}
            peekHint={peekHint}
            hintAlways={hintMode === 'always'}
            vibeStr={vibeStr}
            bursts={bursts}
            links={constellationLinks}
            activeBox={prompt?.solo ? { from: prompt.solo.fromFret, to: prompt.solo.toFret } : undefined}
            onTapSpot={(s, f) => {
              const midi = midis[s] + f
              const spot: FretSpot = { s, f, midi, pc: ((midi % 12) + 12) % 12 }
              if (running) {
                handleAttempt({ s, f, midi, fromMic: false })
              } else {
                setInspectSpot(spot)
                pulseString(s)
                try { const ctx = audio(); void ctx.resume(); playNote(midi, ctx.currentTime + 0.01, 0.7) } catch { /* ignore */ }
              }
            }}
          />

          {!running && inspectSpot && (
            <div className="row small" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
              <span>
                <b>{fullPcLabel(inspectSpot.pc)}</b> · {friendlyStringLabel(midis, inspectSpot.s)} · Fret {inspectSpot.f}
              </span>
              {(() => {
                const st = heatMap[spotKey(inspectSpot.s, inspectSpot.f)]
                if (!st || st.seen === 0) return <span className="muted">Not drilled yet — memorize &amp; hit Start!</span>
                const acc = Math.round((st.right / Math.max(1, st.seen)) * 100)
                return <span className="tabular muted">{acc}% accuracy · {(st.avgMs / 1000).toFixed(2)}s avg · {st.seen} tries</span>
              })()}
            </div>
          )}

          {running && subMode === 'name' && (
            <div className="fg-note-pad" data-testid="fg-note-pad">
              <div className="fg-note-row">
                {[0, 2, 4, 5, 7, 9, 11].map(p => (
                  <button key={p} className="btn fg-note-btn" onClick={() => handleAttempt({ pc: p })} data-testid={`fg-ans-${SHARPS[p]}`}>
                    {SHARPS[p]}
                  </button>
                ))}
              </div>
              <div className="fg-note-row">
                {[1, 3, 6, 8, 10].map(p => (
                  <button key={p} className="btn fg-note-btn acc" onClick={() => handleAttempt({ pc: p })} data-testid={`fg-ans-${SHARPS[p]}`}>
                    {SHARPS[p]} / {FLATS[p]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Win>

        {/* Heatmap Stats & Personal Bests Window (Zoomable!) */}
        <Win id="fg-heatmap" title="Neck Heatmap & Mastery Records" bodyClass="stack" bodyStyle={{ gap: 10 }}>
          <div className="fg-stats-grid">
            <div className="fg-kpi">
              <span className="small muted">Neck Mastered (0–12)</span>
              <b className="tabular">{overallMastery.pct}%</b>
              <span className="small muted">{overallMastery.green}/{allNeckSpots.length} green · {overallMastery.gold} ⚡</span>
            </div>
            <div className="fg-kpi">
              <span className="small muted">Avg Recall Speed</span>
              <b className="tabular">{overallMastery.avgMs ? `${(overallMastery.avgMs / 1000).toFixed(2)}s` : '—'}</b>
              <span className="small muted">Goal: under 1.20s</span>
            </div>
            <div className="fg-kpi">
              <span className="small muted">Note Rush / Blitz Best</span>
              <b className="tabular">W{data.records.survivalWave} · {data.records.blitzScore.toLocaleString()}</b>
              <span className="small muted">Best combo {data.records.bestCombo}×</span>
            </div>
            <div className="fg-kpi">
              <span className="small muted">Gauntlet / Daily</span>
              <b className="tabular">{data.records.gauntletBpm} BPM · {data.records.dailyStreak}d</b>
              <span className="small muted">{data.totalHits.toLocaleString()} total hits</span>
            </div>
          </div>

          <div className="row small" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="fg-leg"><i style={{ background: HEAT_FILL.unseen }} /> Unseen ({overallMastery.unseen})</span>
              <span className="fg-leg"><i style={{ background: HEAT_FILL.red }} /> Weak ({overallMastery.red})</span>
              <span className="fg-leg"><i style={{ background: HEAT_FILL.amber }} /> Learning ({overallMastery.amber})</span>
              <span className="fg-leg"><i style={{ background: HEAT_FILL.green }} /> Solid ({overallMastery.green - overallMastery.gold})</span>
              <span className="fg-leg"><i style={{ background: HEAT_FILL.gold }} /> ⚡ Lightning ({overallMastery.gold})</span>
            </div>
            {!confirmReset ? (
              <button className="btn sm ghost" onClick={() => setConfirmReset(true)}>↺ Reset Heatmap</button>
            ) : (
              <span className="row" style={{ gap: 4 }}>
                <button className="btn sm" style={{ borderColor: '#ef4444', color: '#ef4444' }} onClick={() => { persist(emptyFretGameData()); setConfirmReset(false) }}>
                  Confirm Reset
                </button>
                <button className="btn sm ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
              </span>
            )}
          </div>
        </Win>
      </WinArea>
    </div>
  )
}

// ---------- 🚀 Note Rush (Fret Defense) 6-String Neon Arcade Radar ----------

function NoteRushRadar({
  midis,
  waveTitle,
  orbs,
  boss,
  lasers,
  shieldFlash,
  feverOn,
  leftHanded,
  inputMode,
}: {
  midis: number[]
  waveTitle: string
  orbs: RushOrb[]
  boss: RushBoss | null
  lasers: RushLaser[]
  shieldFlash: boolean
  feverOn: boolean
  leftHanded: boolean
  inputMode: 'mic' | 'tap'
}) {
  const nStr = midis.length
  const W = 680
  const laneH = 26
  const padTop = 26
  const padBot = 10
  const H = padTop + nStr * laneH + padBot
  const shieldX = leftHanded ? W - 54 : 54
  const laneStart = leftHanded ? 18 : 66
  const laneEnd = leftHanded ? W - 66 : W - 18
  const laneSpan = laneEnd - laneStart

  const mapX = (pct: number) => {
    const p = Math.max(0, Math.min(100, pct)) / 100
    return leftHanded ? laneEnd - p * laneSpan : laneStart + p * laneSpan
  }
  const laneY = (s: number) => padTop + (nStr - 1 - s) * laneH + laneH * 0.5

  return (
    <div className={`fg-radar${shieldFlash ? ' hit' : ''}${feverOn ? ' fever' : ''}`} data-testid="fg-rush-radar">
      <div className="row small" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 4px' }}>
        <b style={{ color: boss ? '#fbbf24' : '#38bdf8' }}>{waveTitle}</b>
        <span className="muted">
          {inputMode === 'mic' ? '🎸 Play incoming notes on your guitar!' : '👆 Tap the matching blank fret below to fire lasers!'}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="fg-radar-svg" role="img" aria-label="Note Rush incoming lane radar">
        <defs>
          <linearGradient id="fg-shield-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={shieldFlash ? '#ef4444' : feverOn ? '#f59e0b' : '#38bdf8'} stopOpacity="0.95" />
            <stop offset="100%" stopColor={shieldFlash ? '#f97316' : '#06b6d4'} stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {/* Subtle danger zone glow near shield */}
        <rect
          x={leftHanded ? laneEnd - laneSpan * 0.25 : laneStart}
          y={padTop}
          width={laneSpan * 0.25}
          height={nStr * laneH}
          fill={shieldFlash ? 'rgba(239,68,68,0.22)' : 'rgba(239,68,68,0.06)'}
        />

        {/* 6 String Lanes */}
        {midis.map((m, s) => {
          const y = laneY(s)
          const active = orbs.some(o => o.spot.s === s)
          return (
            <g key={`rl-${s}`}>
              <line
                x1={laneStart}
                y1={y}
                x2={laneEnd}
                y2={y}
                stroke={active ? 'rgba(56,189,248,0.42)' : 'rgba(148,163,184,0.18)'}
                strokeWidth={active ? 2 : 1}
              />
              <text
                x={leftHanded ? W - 26 : 26}
                y={y + 4}
                textAnchor="middle"
                fontSize={12}
                fontWeight={800}
                fill={active ? '#38bdf8' : '#94a3b8'}
              >
                {SHARPS[m % 12]}{s === 0 && nStr === 6 ? '6' : s === 5 && nStr === 6 ? '1' : ''}
              </text>
            </g>
          )
        })}

        {/* Glowing Energy Shield Wall */}
        <rect
          x={shieldX - 4}
          y={padTop - 2}
          width={8}
          height={nStr * laneH + 4}
          rx={4}
          fill="url(#fg-shield-grad)"
        />

        {/* Neon Laser Zap Bolts */}
        {lasers.map(lz => (
          <g key={lz.id} className="fg-laser">
            <line
              x1={shieldX}
              y1={laneY(lz.s)}
              x2={mapX(lz.x)}
              y2={laneY(lz.s)}
              stroke={lz.kind === 'boss' ? '#fbbf24' : lz.kind === 'lightning' ? '#38bdf8' : '#34d399'}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <circle
              cx={mapX(lz.x)}
              cy={laneY(lz.s)}
              r={16}
              fill="none"
              stroke={lz.kind === 'boss' ? '#fde68a' : '#6ee7b7'}
              strokeWidth={2.5}
            />
            <text
              x={mapX(lz.x)}
              y={laneY(lz.s) - 14}
              textAnchor="middle"
              fontSize={12}
              fontWeight={900}
              fill={lz.kind === 'boss' ? '#fde68a' : '#38bdf8'}
            >
              {lz.text}
            </text>
          </g>
        ))}

        {/* Incoming Note Orbs (Note Letter ONLY — never fret numbers!) */}
        {orbs.map(orb => {
          const cx = mapX(orb.x)
          const cy = laneY(orb.spot.s)
          const danger = orb.x < 26
          return (
            <g key={orb.id} data-testid={`fg-orb-${orb.spot.s}-${orb.spot.f}`}>
              <circle
                cx={cx}
                cy={cy}
                r={13.5}
                fill={danger ? '#ef4444' : '#0ea5e9'}
                stroke={danger ? '#fecaca' : '#bae6fd'}
                strokeWidth={2.2}
              />
              <text
                x={cx}
                y={cy + 4.5}
                textAnchor="middle"
                fontSize={orb.label.length > 1 ? 11 : 13}
                fontWeight={900}
                fill="#fff"
              >
                {orb.label}
              </text>
            </g>
          )
        })}

        {/* 👑 Golden Octave Boss Orb */}
        {boss && (() => {
          const cx = mapX(boss.x)
          const cy = padTop + (nStr * laneH) / 2
          const remaining = boss.spots.length - boss.found.length
          return (
            <g data-testid="fg-rush-boss">
              <circle cx={cx} cy={cy} r={34} fill="rgba(245,158,11,0.22)" stroke="#f59e0b" strokeWidth={3} strokeDasharray="7 4" />
              <circle cx={cx} cy={cy} r={24} fill="#f59e0b" stroke="#fef08a" strokeWidth={2.5} />
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize={11} fontWeight={900} fill="#1c1204">👑 ALL {boss.spots.length}</text>
              <text x={cx} y={cy + 13} textAnchor="middle" fontSize={18} fontWeight={900} fill="#1c1204">{boss.label}</text>
              <text x={cx} y={cy + 46} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fde68a">
                {remaining} string{remaining === 1 ? '' : 's'} left: {boss.spots.filter(sp => !boss.found.includes(spotKey(sp.s, sp.f))).map(sp => SHARPS[midis[sp.s] % 12]).join(' ')}
              </text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}

// ---------- Pro Studio Interactive SVG Fretboard ----------

interface NeckProps {
  midis: number[]
  fromFret: number
  toFret: number
  leftHanded: boolean
  showHeatmap: boolean
  heatMap: Record<string, { seen: number; right: number; wrong: number; avgMs: number; bestMs: number; lastAt: number; streak: number }>
  running: boolean
  primerKeys: Set<string>
  prompt: ActivePrompt | null
  rushTargetStrings?: Set<number>
  subMode: GameMode
  lastHitSpot: FretSpot | null
  wrongSpot: { s: number; f: number } | null
  revealSpot: FretSpot | null
  peekHint: boolean
  hintAlways: boolean
  vibeStr: number | null
  bursts: Burst[]
  links: { s1: number; f1: number; s2: number; f2: number }[]
  activeBox?: { from: number; to: number }
  onTapSpot: (s: number, f: number) => void
}

function GameNeck({
  midis,
  fromFret,
  toFret,
  leftHanded,
  showHeatmap,
  heatMap,
  running,
  primerKeys,
  prompt,
  rushTargetStrings,
  subMode,
  lastHitSpot,
  wrongSpot,
  revealSpot,
  peekHint,
  hintAlways,
  vibeStr,
  bursts,
  links,
  activeBox,
  onTapSpot,
}: NeckProps) {
  const nStr = midis.length
  const frets = Array.from({ length: toFret - fromFret + 1 }, (_, i) => fromFret + i)
  const openColW = 46
  const fretW = 54
  const padY = 26
  const strGap = 32
  const W = openColW + Math.max(1, frets.length - 1) * fretW + 22
  const H = padY * 2 + (nStr - 1) * strGap + 18

  const fretX = (f: number) => {
    const idx = f - fromFret
    const rawX = idx === 0 && fromFret === 0 ? openColW * 0.5 : openColW + (idx - (fromFret === 0 ? 0.5 : 0)) * fretW
    return leftHanded ? W - rawX : rawX
  }
  const fretWireX = (f: number) => {
    const idx = f - fromFret
    const rawX = openColW + (idx - (fromFret === 0 ? 0 : -0.5)) * fretW
    return leftHanded ? W - rawX : rawX
  }
  const strY = (s: number) => padY + (nStr - 1 - s) * strGap

  const targetStringHighlight = running && prompt?.spot && subMode !== 'name' ? prompt.spot.s : null

  const soloHintKeys = useMemo(() => {
    if (!peekHint || !prompt?.solo) return new Set<string>()
    const targetPc = prompt.solo.targetPcs[prompt.soloIdx ?? 0]
    if (targetPc === undefined) return new Set<string>()
    return new Set(spotsForPc(midis, targetPc, prompt.solo.fromFret, prompt.solo.toFret).map(sp => spotKey(sp.s, sp.f)))
  }, [peekHint, prompt, midis])

  return (
    <div className="fg-neck-scroll" data-testid="fg-neck">
      <svg viewBox={`0 0 ${W} ${H}`} className="fg-neck-svg" role="group" aria-label="Interactive guitar fretboard">
        <defs>
          <linearGradient id="fg-wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#201815" />
            <stop offset="50%" stopColor="#161110" />
            <stop offset="100%" stopColor="#231a16" />
          </linearGradient>
          <linearGradient id="fg-nut" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e7dfd2" />
            <stop offset="100%" stopColor="#bfb29f" />
          </linearGradient>
        </defs>

        <rect
          x={leftHanded ? 12 : openColW}
          y={padY - 12}
          width={W - openColW - 12}
          height={(nStr - 1) * strGap + 24}
          rx={6}
          fill="url(#fg-wood)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
        />

        {activeBox && (() => {
          const x1 = fretX(Math.max(fromFret, activeBox.from)) - fretW * 0.48
          const x2 = fretX(Math.min(toFret, activeBox.to)) + fretW * 0.48
          return (
            <rect
              x={Math.min(x1, x2)}
              y={padY - 14}
              width={Math.abs(x2 - x1)}
              height={(nStr - 1) * strGap + 28}
              rx={6}
              fill="rgba(56, 189, 248, 0.08)"
              stroke="rgba(56, 189, 248, 0.55)"
              strokeWidth={1.6}
              strokeDasharray="5 4"
            />
          )
        })()}

        {frets.map(f => {
          if (f === 0) {
            const nx = leftHanded ? W - openColW - 4 : openColW
            return <rect key="nut" x={nx} y={padY - 12} width={5} height={(nStr - 1) * strGap + 24} fill="url(#fg-nut)" rx={1.5} />
          }
          const wx = fretWireX(f)
          return (
            <line
              key={`w-${f}`}
              x1={wx}
              y1={padY - 12}
              x2={wx}
              y2={padY + (nStr - 1) * strGap + 12}
              stroke={f === 12 ? 'rgba(245,158,11,0.55)' : 'rgba(226,232,240,0.28)'}
              strokeWidth={f === 12 ? 2.4 : 1.5}
            />
          )
        })}

        {frets.map(f => {
          if (f === 12) {
            const cx = fretX(f)
            const mid = padY + ((nStr - 1) * strGap) / 2
            return (
              <g key="inlay-12" opacity={0.38}>
                <circle cx={cx} cy={mid - strGap} r={4.5} fill="#e2e8f0" />
                <circle cx={cx} cy={mid + strGap} r={4.5} fill="#e2e8f0" />
              </g>
            )
          }
          if (INLAY_FRETS.has(f)) {
            const cx = fretX(f)
            const mid = padY + ((nStr - 1) * strGap) / 2
            return <circle key={`inlay-${f}`} cx={cx} cy={mid} r={4.5} fill="#e2e8f0" opacity={0.3} />
          }
          return null
        })}

        {frets.map(f => (
          <text
            key={`fn-${f}`}
            x={fretX(f)}
            y={H - 4}
            textAnchor="middle"
            fontSize={11}
            fontWeight={LANDMARK_FRETS.includes(f) ? 700 : 500}
            fill={LANDMARK_FRETS.includes(f) ? '#f59e0b' : 'rgba(226,232,240,0.55)'}
          >
            {f === 0 ? 'Open' : f}
          </text>
        ))}

        {midis.map((m, s) => {
          const y = strY(s)
          const isTarget = targetStringHighlight === s || Boolean(rushTargetStrings?.has(s))
          const isVibe = vibeStr === s
          const gauge = 1.2 + ((nStr - 1 - s) / Math.max(1, nStr - 1)) * 2.1
          const baseColor = s < nStr / 2 ? '#c9a36a' : '#cbd5e1'
          return (
            <g key={`str-${s}`}>
              {isTarget && (
                <line
                  x1={leftHanded ? 12 : openColW - 14}
                  y1={y}
                  x2={leftHanded ? W - openColW + 14 : W - 12}
                  y2={y}
                  stroke="rgba(56, 189, 248, 0.28)"
                  strokeWidth={11}
                  strokeLinecap="round"
                />
              )}
              <line
                x1={leftHanded ? 12 : openColW}
                y1={y}
                x2={leftHanded ? W - openColW : W - 12}
                y2={y}
                stroke={isVibe ? '#34d399' : isTarget ? '#38bdf8' : baseColor}
                strokeWidth={isVibe ? gauge + 1.2 : gauge}
                className={isVibe ? 'fg-str-vibe' : undefined}
              />
              <text
                x={leftHanded ? W - 12 : 12}
                y={y + 4}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill={isTarget ? '#38bdf8' : '#94a3b8'}
              >
                {SHARPS[m % 12]}
              </text>
            </g>
          )
        })}

        {links.map((lk, i) => (
          <line
            key={`lk-${i}`}
            x1={fretX(lk.f1)}
            y1={strY(lk.s1)}
            x2={fretX(lk.f2)}
            y2={strY(lk.s2)}
            stroke="#f59e0b"
            strokeWidth={2.6}
            strokeDasharray="6 4"
            opacity={0.85}
          />
        ))}

        {/* Interactive Fret Spots: Study Primer before Start -> Blank Recall Neck during play! */}
        {midis.map((m, s) =>
          frets.map(f => {
            const key = spotKey(s, f)
            const cx = fretX(f)
            const cy = strY(s)
            const midi = m + f
            const notePc = ((midi % 12) + 12) % 12
            const tier = fretHeat(heatMap[key])
            const inPrimer = !running && primerKeys.has(key)

            const isAnchor = running && prompt?.anchor?.s === s && prompt?.anchor?.f === f
            const isNameTarget = running && subMode === 'name' && prompt?.spot?.s === s && prompt?.spot?.f === f
            const isSniperHit = running && Boolean(prompt?.sniperFound?.includes(key))
            const isSoloFound = running && Boolean(prompt?.soloFound?.some(sp => sp.s === s && sp.f === f))
            const isLastHit = running && lastHitSpot?.s === s && lastHitSpot?.f === f
            const isWrong = running && wrongSpot?.s === s && wrongSpot?.f === f
            const isReveal = running && revealSpot?.s === s && revealSpot?.f === f
            const isPeek = running && peekHint && (
              (prompt?.spot?.s === s && prompt?.spot?.f === f) ||
              (prompt?.sniperSpots?.some(sp => sp.s === s && sp.f === f) && !isSniperHit) ||
              soloHintKeys.has(key)
            )
            const showDotHint = running && hintAlways && NATURAL_PCS.has(notePc) && LANDMARK_FRETS.includes(f)

            let fill = 'transparent'
            let stroke = 'transparent'
            let label = ''
            let textColor = '#fff'
            let r = 11.5

            // STUDY PRIMER (only when paused! Vanishes completely the moment you hit Start!)
            if (!running) {
              if (inPrimer) {
                fill = tier === 'unseen' ? 'rgba(56, 189, 248, 0.34)' : HEAT_FILL[tier]
                stroke = tier === 'unseen' ? '#7dd3fc' : HEAT_STROKE[tier]
                label = SHARPS[notePc]
                textColor = tier === 'amber' || tier === 'gold' ? '#0b1120' : '#fff'
                r = 12.5
              } else if (showHeatmap && tier !== 'unseen') {
                fill = HEAT_FILL[tier]
                stroke = HEAT_STROKE[tier]
                r = 7
              }
            } else {
              // LIVE PLAY: Blank neck by default (optional Heatmap dots without giving away note names!)
              if (showHeatmap && !isNameTarget) {
                fill = HEAT_FILL[tier]
                stroke = HEAT_STROKE[tier]
                r = 9
              }
              if (showDotHint && !label) {
                fill = 'rgba(255,255,255,0.08)'
                stroke = 'rgba(255,255,255,0.22)'
                label = SHARPS[notePc]
                textColor = 'rgba(255,255,255,0.6)'
                r = 11.5
              }
            }

            if (isAnchor) { fill = '#f59e0b'; stroke = '#fef08a'; label = SHARPS[notePc]; textColor = '#1c1204'; r = 13 }
            if (isSniperHit || isSoloFound || isLastHit) { fill = '#10b981'; stroke = '#a7f3d0'; label = SHARPS[notePc]; textColor = '#042f2e'; r = 13 }
            if (isNameTarget) { fill = '#38bdf8'; stroke = '#e0f2fe'; label = '?'; textColor = '#082f49'; r = 14 }
            if (isPeek || isReveal) { fill = 'rgba(245, 158, 11, 0.92)'; stroke = '#fef08a'; label = SHARPS[notePc]; textColor = '#1c1204'; r = 13 }
            if (isWrong) { fill = '#ef4444'; stroke = '#fecaca'; label = SHARPS[notePc]; textColor = '#fff'; r = 13 }

            return (
              <g key={key} className="fg-spot" onClick={() => onTapSpot(s, f)} data-testid={`fg-spot-${s}-${f}`} style={{ cursor: 'pointer' }}>
                <rect x={cx - fretW * 0.48} y={cy - strGap * 0.48} width={fretW * 0.96} height={strGap * 0.96} fill="transparent" />
                {(fill !== 'transparent' || stroke !== 'transparent') && (
                  <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={inPrimer || isNameTarget || isReveal || isPeek ? 2.2 : 1.4} />
                )}
                {label && (
                  <text x={cx} y={cy + 4} textAnchor="middle" fontSize={label.length > 1 ? 9.5 : 11} fontWeight={800} fill={textColor} pointerEvents="none">
                    {label}
                  </text>
                )}
              </g>
            )
          }),
        )}

        {bursts.map(b => (
          <g key={b.id} className={`fg-burst ${b.kind}`} pointerEvents="none">
            <circle
              cx={fretX(b.f)}
              cy={strY(b.s)}
              r={18}
              fill="none"
              stroke={b.kind === 'lightning' ? '#38bdf8' : b.kind === 'hit' ? '#10b981' : '#ef4444'}
              strokeWidth={3}
            />
            <text
              x={fretX(b.f)}
              y={strY(b.s) - 18}
              textAnchor="middle"
              fontSize={12}
              fontWeight={800}
              fill={b.kind === 'lightning' ? '#38bdf8' : b.kind === 'hit' ? '#34d399' : '#f87171'}
            >
              {b.text}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

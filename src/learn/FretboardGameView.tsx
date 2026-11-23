// Full Fretboard Mastery Game (Learn → Explore → Play better → Fretboard game):
// - 5 Training Lenses: 🎵 Notes · 📐 Intervals (Fixed / Moving / 👂 By Ear) · 🎸 Chord Tones ·
//   🎼 Scale Degrees · 🔺 Triads
// - 5 Core Modes: 🚀 Endless Mode · 🧭 Guided Path · ⚡ Speed Blitz · 🥁 Metronome Run ·
//   🧩 Build the Shape (+ ❓ Identify Fret, 🏆 Daily 3-Min & 🔥 Weak Spots)
// - Study Primer (pick BOTH Fret Box + String Set) → 3…2…1… Memory Fade → 💔 Reveal hold-to-peek
//   (pauses orbs while held, costs 1 ♥, locked on your last ♥, fades away like a memory on release!)
// - Works seamlessly with 🎸 Real Guitar Mic OR 👆 Touch Screen + 🗺 Live Heatmap + 🔊 Voice.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Win, WinArea } from '../components/Win'
import { InputPicker } from '../components/InputPicker'
import { audio } from '../audio/engine'
import { playNote, strum } from '../audio/pluck'
import { playClick } from '../audio/metronome'
import { haptic } from '../audio/tapFeel'
import { NoteListener } from '../tabs/follow'
import { micWhere } from '../audio/input'
import { FLATS, KEYS, SHARPS, midiName, pc } from '../theory/notes'
import { STARTER_PROGS, jamProgression, starterProgression } from '../tabs/fromProgression'
import type { Instrument } from '../instrument'
import { addXp, bump, dayKey, isAway, logAnswer, logDone, usePracticeTimer } from './progress'
import { bumpCombo } from './game'
import {
  CIRCLE_FOURTHS_PCS,
  LANDMARK_FRETS,
  NATURAL_PCS,
  SCALE_LENSES,
  SOLO_LEVELS,
  STAGES,
  buildSoloGoal,
  buildTriadChallenge,
  calcHitPoints,
  displayPc,
  emptyFretGameData,
  filterSpots,
  fretHeat,
  friendlyStringLabel,
  fullPcLabel,
  intervalLabelFromRoot,
  intervalTip,
  loadFretGame,
  matchRushAttempt,
  octaveConstellationLinks,
  pickIntervalAnchor,
  pickIntervalTarget,
  pickOctavePair,
  pickWeightedSpot,
  recordFretResult,
  rushWaveSpec,
  saveFretGame,
  scaleDegreeInfo,
  sessionGrade,
  shortcutTip,
  speakPrompt,
  spokenNote,
  spotKey,
  spotsForPc,
  spotsMastery,
  stageSpots,
  stringSetPresets,
  tuningKey,
  weakestSpots,
  type AccidentalMode,
  type FretGameData,
  type FretSpot,
  type GameFilter,
  type GameMode,
  type HeatTier,
  type IntervalStyle,
  type RushBoss,
  type RushOrb,
  type SoloGoal,
  type SoloLevel,
  type TrainingLens,
  type TriadChallenge,
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
  /** Display label for the prompt (e.g. 'A', '♭3', '5', '👂 ?') */
  label?: string
  /** Optional subtitle (e.g. 'Minor 3rd', 'Dorian color!') */
  sub?: string
  /** Anchor spot (Octave Web or Intervals gold Root) */
  anchor?: FretSpot
  /** Multi-spot shape target (Build the Shape: octaves, intervals, triads, degrees) */
  shapeTitle?: string
  shapeBadge?: string
  shapeSpots?: FretSpot[]
  shapeFound?: string[]
  /** Chord Tones goal */
  solo?: SoloGoal
  soloIdx?: number
  soloFound?: FretSpot[]
  /** Active triad challenge */
  triad?: TriadChallenge
  /** Prefer flats in label? */
  preferFlat?: boolean
  /** Ear-interval replay midi pair */
  earPair?: [number, number]
}

interface RunSummary {
  mode: GameMode
  lens: TrainingLens
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

const LENS_TABS: { id: TrainingLens; icon: string; label: string }[] = [
  { id: 'notes', icon: '🎵', label: 'Notes' },
  { id: 'intervals', icon: '📐', label: 'Intervals' },
  { id: 'chords', icon: '🎸', label: 'Chord Tones' },
  { id: 'degrees', icon: '🎼', label: 'Scale Degrees' },
  { id: 'triads', icon: '🔺', label: 'Triads' },
]

const CORE_MODES: { id: GameMode; icon: string; label: string; tag: string }[] = [
  { id: 'survival', icon: '🚀', label: 'Endless Mode', tag: 'Orbs + Boss' },
  { id: 'path', icon: '🧭', label: 'Guided Path', tag: '6 Stages' },
  { id: 'blitz', icon: '⚡', label: 'Speed Blitz', tag: '60s Sprint' },
  { id: 'gauntlet', icon: '🥁', label: 'Metronome Run', tag: '+5 BPM Sweep' },
  { id: 'sniper', icon: '🧩', label: 'Build the Shape', tag: 'Connect Neck' },
]

const ZONE_PRESETS: { id: string; label: string; from: number; to: number }[] = [
  { id: '0-5', label: 'Frets 0–5', from: 0, to: 5 },
  { id: '5-9', label: 'Box 5–9', from: 5, to: 9 },
  { id: '7-12', label: 'Box 7–12', from: 7, to: 12 },
  { id: '0-12', label: 'Full 0–12', from: 0, to: 12 },
  { id: '0-15', label: '0–15', from: 0, to: 15 },
  { id: '12-17', label: '12–17', from: 12, to: 17 },
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
  const strPresets = useMemo(() => stringSetPresets(nStr), [nStr])

  const [data, setData] = useState<FretGameData>(() => loadFretGame())
  const heatMap = data.heat[tKey] ?? {}

  // Core picks: WHAT (lens) + HOW (mode)
  const [lens, setLens] = useState<TrainingLens>('notes')
  const [mode, setMode] = useState<GameMode>('survival')
  const [stageId, setStageId] = useState<number>(1)

  // Input & helper settings
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
  /** In Endless Mode: false = Auto Waves (1→∞), true = Locked to your selected Fret Box + String Set chunk! */
  const [rushLockChunk, setRushLockChunk] = useState(false)
  const [hintMode, setHintMode] = useState<'miss' | 'off' | 'always'>('miss')

  // Lens-specific settings
  const [intervalStyle, setIntervalStyle] = useState<IntervalStyle>('fixed')
  const [lensKey, setLensKey] = useState<string>('A')
  const [scaleId, setScaleId] = useState<string>('pent-min')
  const [triadQuality, setTriadQuality] = useState<'maj' | 'min'>('maj')

  const jam = useMemo(() => jamProgression(), [])
  const [soloProgId, setSoloProgId] = useState<string>(() => (jam ? 'jam' : STARTER_PROGS[0].id))
  const [soloLevel, setSoloLevel] = useState<SoloLevel>('triads')

  // Metronome Run settings
  const [gauntletBpm, setGauntletBpm] = useState<number>(() => Math.max(45, Math.min(140, data.records.gauntletBpm || 60)))
  const [gauntletDir, setGauntletDir] = useState<'up' | 'down' | 'bounce'>('bounce')

  // Live session & Memory Fade / 💔 Reveal state
  const [running, setRunning] = useState(false)
  /** 3 -> 2 -> 1 -> 0 memory-fade countdown on Start */
  const [countdown, setCountdown] = useState<0 | 1 | 2 | 3>(0)
  /** 💔 Reveal hold-to-peek: pauses orbs while held, fades away on release! */
  const [revealHeld, setRevealHeld] = useState(false)
  const [revealFading, setRevealFading] = useState(false)

  const [prompt, setPrompt] = useState<ActivePrompt | null>(null)
  const [intervalAnchor, setIntervalAnchor] = useState<FretSpot | null>(null)
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

  // Endless Mode live radar state
  const [rushOrbs, setRushOrbs] = useState<RushOrb[]>([])
  const [rushBoss, setRushBoss] = useState<RushBoss | null>(null)
  const [rushLasers, setRushLasers] = useState<RushLaser[]>([])
  const [shieldFlash, setShieldFlash] = useState(false)

  // Visual feedback
  const [bursts, setBursts] = useState<Burst[]>([])
  const [vibeStr, setVibeStr] = useState<number | null>(null)
  const [lastHitSpot, setLastHitSpot] = useState<FretSpot | null>(null)
  const [hitGeoLink, setHitGeoLink] = useState<{ s1: number; f1: number; s2: number; f2: number } | null>(null)
  const [wrongSpot, setWrongSpot] = useState<{ s: number; f: number } | null>(null)
  const [revealSpot, setRevealSpot] = useState<FretSpot | null>(null)
  const [coachTip, setCoachTip] = useState<string>('')
  const [inspectSpot, setInspectSpot] = useState<FretSpot | null>(null)
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [heardLabel, setHeardLabel] = useState<string>('')
  const [micInfo, setMicInfo] = useState<string>('')
  const [micErr, setMicErr] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  // Refs for timers / mic callbacks
  const shownAtRef = useRef(0)
  const lastSpotKeyRef = useRef('')
  const runTimesRef = useRef<number[]>([])
  const missedListRef = useRef<FretSpot[]>([])
  const burstIdRef = useRef(1)
  const orbIdRef = useRef(1)
  const fadeTimerRef = useRef<number | null>(null)
  const countdownTimersRef = useRef<number[]>([])
  const rushOrbsRef = useRef<RushOrb[]>([])
  rushOrbsRef.current = rushOrbs
  const rushBossRef = useRef<RushBoss | null>(null)
  rushBossRef.current = rushBoss
  const revealHeldRef = useRef(false)
  revealHeldRef.current = revealHeld
  const countdownRef = useRef(0)
  countdownRef.current = countdown
  const anchorRef = useRef<FretSpot | null>(null)
  anchorRef.current = intervalAnchor
  const dataRef = useRef(data)
  dataRef.current = data
  const promptRef = useRef(prompt)
  promptRef.current = prompt
  const runningRef = useRef(running)
  runningRef.current = running
  const stateRef = useRef({
    lens, mode, stageId, score, combo, bestRunCombo, hits, misses, hearts, wave,
    sniperClears, gauntletKeyIdx, gauntletStrIdx, gauntletGoingUp, gauntletBpm,
    gauntletDir, soloChordIdx, dailyPhase, voiceOn, filter, rushLockChunk,
    intervalStyle, lensKey, scaleId, triadQuality, soloLevel, timeLeftMs,
  })
  stateRef.current = {
    lens, mode, stageId, score, combo, bestRunCombo, hits, misses, hearts, wave,
    sniperClears, gauntletKeyIdx, gauntletStrIdx, gauntletGoingUp, gauntletBpm,
    gauntletDir, soloChordIdx, dailyPhase, voiceOn, filter, rushLockChunk,
    intervalStyle, lensKey, scaleId, triadQuality, soloLevel, timeLeftMs,
  }

  usePracticeTimer('quiz', running && countdown === 0, inputMode === 'mic')

  // Cleanup countdown & fade timers on unmount
  useEffect(() => () => {
    countdownTimersRef.current.forEach(t => clearTimeout(t))
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
  }, [])

  const soloChords = useMemo(() => {
    if (soloProgId === 'jam' && jam?.chords.length) return jam.chords
    const id = soloProgId === 'jam' ? STARTER_PROGS[0].id : soloProgId
    return starterProgression(id, lensKey).chords
  }, [soloProgId, lensKey, jam])
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

  // Deterministic Preview Anchor for Intervals Study Primer so it stays rock-steady while studying!
  const previewAnchor = useMemo(() => {
    const rootPc = pc(lensKey)
    const box = filterSpots(midis, { ...filter, accidentals: 'both' })
    const exactLow = box.find(sp => sp.pc === rootPc && sp.s <= 1) ?? box.find(sp => sp.pc === rootPc)
    return exactLow ?? box[0] ?? { s: 0, f: 5, midi: midis[0] + 5, pc: (midis[0] + 5) % 12 }
  }, [midis, filter, lensKey])

  const activeAnchor = (running || countdown > 0) ? (intervalAnchor ?? previewAnchor) : previewAnchor

  // Compute the EXACT Study Primer spots + per-spot labels for ANY Lens & Mode (also used by 💔 Reveal!)
  const primerInfo = useMemo(() => {
    const rootPc = pc(lensKey)
    let spots: FretSpot[] = []
    let title = ''

    if (mode === 'path') {
      spots = stageSpots(midis, stageId)
      title = `${STAGES[stageId - 1].title} · ${spots.length} spots`
    } else if (mode === 'survival' && !rushLockChunk && lens === 'notes') {
      const w1 = rushWaveSpec(1, nStr)
      spots = filterSpots(midis, { fromFret: w1.fromFret, toFret: w1.toFret, strings: w1.strings, accidentals: w1.accidentals })
      title = `Endless Auto Waves · Starts on Low Strings Frets 0–5 (${spots.length} notes)`
    } else if (mode === 'daily') {
      spots = weakestSpots(allNeckSpots, heatMap, 20)
      title = `Daily 3-Min · Starts with your ${spots.length} weakest frets`
    } else if (lens === 'notes') {
      const pool = filterSpots(midis, filter)
      spots = filter.weakOnly ? weakestSpots(pool, heatMap, 18) : pool
      const strTag = filter.strings.length ? `${filter.strings.map(s => SHARPS[midis[s] % 12]).join('–')} strings` : `All ${nStr} strings`
      title = `Notes · Frets ${filter.fromFret}–${filter.toFret} · ${strTag} (${spots.length} notes)`
    } else if (lens === 'intervals') {
      const box = filterSpots(midis, { ...filter, accidentals: 'both' })
      spots = box.filter(sp => {
        const diff = sp.midi - activeAnchor.midi
        return diff === 0 || diff === 12 || (diff > 0 && diff <= 14 && [3, 4, 5, 7, 9, 10, 11].includes(((diff % 12) + 12) % 12))
      })
      title = `Intervals from ${SHARPS[activeAnchor.pc]} (${friendlyStringLabel(midis, activeAnchor.s)} fret ${activeAnchor.f}) · Frets ${filter.fromFret}–${filter.toFret}`
    } else if (lens === 'chords') {
      const curChord = soloChords[soloChordIdx % soloChords.length] ?? soloChords[0]
      const cRoot = pc(curChord.root)
      const goal = buildSoloGoal(curChord, soloLevel, filter.fromFret, filter.toFret)
      const allowed = new Set(goal.targetPcs)
      spots = filterSpots(midis, { ...filter, accidentals: 'both' }).filter(sp => allowed.has(sp.pc) || sp.pc === cRoot)
      title = `Chord Tones · ${curChord.symbol} (${goal.labels.join('–')}) · Frets ${filter.fromFret}–${filter.toFret}`
    } else if (lens === 'degrees') {
      spots = filterSpots(midis, { ...filter, accidentals: 'both' }).filter(sp => scaleDegreeInfo(sp.pc, rootPc, scaleId) !== null)
      const sc = SCALE_LENSES.find(x => x.id === scaleId) ?? SCALE_LENSES[0]
      title = `${lensKey} ${sc.label} · Frets ${filter.fromFret}–${filter.toFret} (${spots.length} spots)`
    } else {
      // Triads
      const tPcs = new Set([rootPc, (rootPc + (triadQuality === 'maj' ? 4 : 3)) % 12, (rootPc + 7) % 12])
      spots = filterSpots(midis, { ...filter, accidentals: 'both' }).filter(sp => tPcs.has(sp.pc))
      title = `${lensKey}${triadQuality === 'min' ? 'm' : ''} Triad Tones (R–${triadQuality === 'maj' ? '3' : '♭3'}–5) · Frets ${filter.fromFret}–${filter.toFret}`
    }

    const labels = new Map<string, { text: string; isRoot?: boolean; isColor?: boolean }>()
    const curChord = soloChords[soloChordIdx % soloChords.length] ?? soloChords[0]
    const chordRoot = pc(curChord.root)

    for (const sp of spots) {
      const k = spotKey(sp.s, sp.f)
      if (lens === 'notes' || mode === 'path') {
        labels.set(k, { text: SHARPS[sp.pc] })
      } else if (lens === 'intervals') {
        const iv = intervalLabelFromRoot(sp.midi, activeAnchor.midi)
        labels.set(k, { text: iv.short, isRoot: iv.semi === 0, isColor: iv.semi === 3 || iv.semi === 4 || iv.semi === 10 || iv.semi === 11 })
      } else if (lens === 'chords') {
        const iv = ((sp.pc - chordRoot) % 12 + 12) % 12
        const lbl = iv === 0 ? 'R' : iv === 2 ? '9' : iv === 3 ? '♭3' : iv === 4 ? '3' : iv === 7 ? '5' : iv === 10 ? '♭7' : iv === 11 ? '7' : SHARPS[sp.pc]
        labels.set(k, { text: lbl, isRoot: iv === 0, isColor: iv === 3 || iv === 4 || iv === 10 || iv === 11 })
      } else if (lens === 'degrees') {
        const info = scaleDegreeInfo(sp.pc, rootPc, scaleId)
        if (info) labels.set(k, { text: info.label, isRoot: info.isRoot, isColor: info.isColor })
      } else {
        const iv = ((sp.pc - rootPc) % 12 + 12) % 12
        const lbl = iv === 0 ? 'R' : iv === 3 ? '♭3' : iv === 4 ? '3' : '5'
        labels.set(k, { text: lbl, isRoot: iv === 0, isColor: iv === 3 || iv === 4 })
      }
    }

    return { spots, labels, title }
  }, [mode, stageId, rushLockChunk, lens, filter, midis, nStr, allNeckSpots, heatMap, activeAnchor, soloChords, soloChordIdx, soloLevel, lensKey, scaleId, triadQuality])

  // Visible neck fret range
  const displayRange = useMemo(() => {
    if (mode === 'path') return { from: 0, to: stageId === 3 ? 14 : 12 }
    if (mode === 'gauntlet' && lens === 'notes') return { from: 0, to: 12 }
    if (mode === 'sniper' && lens === 'notes') return { from: 0, to: 12 }
    if (mode === 'survival' && !rushLockChunk && lens === 'notes') {
      const maxF = !running ? 12 : wave <= 3 ? 7 : 12
      return { from: 0, to: maxF }
    }
    return { from: Math.max(0, filter.fromFret), to: Math.max(filter.fromFret + 4, filter.toFret) }
  }, [mode, stageId, lens, rushLockChunk, filter.fromFret, filter.toFret, running, wave])

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

  const flashHitSpot = useCallback((spot: FretSpot, anchor?: FretSpot | null) => {
    setLastHitSpot(spot)
    if (anchor) {
      setHitGeoLink({ s1: anchor.s, f1: anchor.f, s2: spot.s, f2: spot.f })
      setTimeout(() => setHitGeoLink(null), 650)
    }
    setTimeout(() => setLastHitSpot(cur => (cur && cur.s === spot.s && cur.f === spot.f ? null : cur)), 480)
  }, [])

  const persist = useCallback((next: FretGameData) => {
    dataRef.current = next
    setData(next)
    saveFretGame(next)
  }, [])

  const activeSubMode = (m: GameMode, dp: 0 | 1 | 2): GameMode => {
    if (m !== 'daily') return m
    return dp === 0 ? 'blitz' : dp === 1 ? 'gauntlet' : 'sniper'
  }

  // Spawn an Endless Mode orb or Boss Orb — supports ALL 5 Training Lenses!
  const spawnRushEntity = useCallback((curWave: number, existingOrbs: RushOrb[], anchorOverride?: FretSpot) => {
    const st = stateRef.current
    const spec = rushWaveSpec(curWave, nStr)
    const hm = dataRef.current.heat[tKey] ?? {}
    const curLens = st.lens
    const rootPc = pc(st.lensKey)

    // 👑 BOSS WAVE (every 5th wave)
    if (spec.isBoss) {
      let bossTitle = '👑 BOSS'
      let bossLabel = ''
      let bossSpots: FretSpot[] = []
      if (curLens === 'triads') {
        const tri = buildTriadChallenge(midis, CIRCLE_FOURTHS_PCS[Math.floor(Math.random() * 12)], st.triadQuality, st.filter)
        bossTitle = `👑 ${tri.symbol} TRIAD (${tri.stringSetLabel})`
        bossLabel = tri.symbol
        bossSpots = tri.spots
      } else if (curLens === 'intervals') {
        const anc = anchorOverride ?? anchorRef.current ?? pickIntervalAnchor(midis, st.filter, rootPc)
        anchorRef.current = anc
        setIntervalAnchor(anc)
        // Boss: hit 3rd, 5th, 7th/Octave around the Root!
        const box = filterSpots(midis, { ...st.filter, accidentals: 'both' })
        const want = [4, 7, 12]
        for (const w of want) {
          const hit = box.find(sp => (w === 12 ? sp.midi - anc.midi === 12 : sp.midi > anc.midi && ((sp.midi - anc.midi) % 12) === w))
          if (hit) bossSpots.push(hit)
        }
        if (bossSpots.length < 2) bossSpots = spotsForPc(midis, anc.pc, 0, 11, true).slice(0, 4)
        bossTitle = `👑 ${SHARPS[anc.pc]} 3–5–Oct`
        bossLabel = '3-5-8'
      } else {
        const targetPc = CIRCLE_FOURTHS_PCS[Math.floor(Math.random() * CIRCLE_FOURTHS_PCS.length)]
        const preferFlat = [10, 3, 8, 1, 6].includes(targetPc)
        bossLabel = displayPc(targetPc, 'both', preferFlat)
        bossSpots = spotsForPc(midis, targetPc, 0, 11, true)
        bossTitle = `👑 ALL ${bossSpots.length} ${bossLabel}'s`
      }
      const boss: RushBoss = {
        id: orbIdRef.current++,
        title: bossTitle,
        label: bossLabel,
        spots: bossSpots,
        found: [],
        x: 96,
        speed: spec.speedPerSec,
        spawnedAt: performance.now(),
      }
      rushBossRef.current = boss
      setRushBoss(boss)
      rushOrbsRef.current = []
      setRushOrbs([])
      if (st.voiceOn) speakPrompt(`Boss wave! ${bossTitle}`)
      return
    }

    // Standard Orbs adapted to the active Lens!
    const busyStrs = new Set(existingOrbs.map(o => o.spot.s))
    const busyMidis = new Set(existingOrbs.map(o => o.spot.midi))
    let spot: FretSpot
    let label = ''
    let sub = ''
    let isColor = false

    if (curLens === 'intervals') {
      const anc = anchorOverride ?? anchorRef.current ?? pickIntervalAnchor(midis, st.filter, st.intervalStyle === 'fixed' ? rootPc : undefined)
      anchorRef.current = anc
      setIntervalAnchor(anc)
      const picked = pickIntervalTarget(midis, st.filter, anc, lastSpotKeyRef.current)
      spot = picked.spot
      if (st.intervalStyle === 'ear') {
        label = '👂 ?'
        sub = 'By Ear'
        try {
          const ctx = audio()
          void ctx.resume()
          playNote(anc.midi, ctx.currentTime + 0.03, 0.45)
          playNote(spot.midi, ctx.currentTime + 0.42, 0.65)
        } catch { /* ignore */ }
      } else {
        label = picked.short
        sub = picked.name
      }
      isColor = [3, 4, 10, 11].includes(picked.semi)
    } else if (curLens === 'chords') {
      const chords = soloChordsRef.current
      const chord = chords[st.soloChordIdx % chords.length] ?? chords[0]
      const goal = buildSoloGoal(chord, st.soloLevel, st.filter.fromFret, st.filter.toFret)
      const cands = filterSpots(midis, { ...st.filter, accidentals: 'both' }).filter(sp => goal.targetPcs.includes(sp.pc))
      const clean = cands.filter(sp => !busyStrs.has(sp.s) && !busyMidis.has(sp.midi))
      spot = pickWeightedSpot(clean.length ? clean : (cands.length ? cands : allNeckSpots), hm, lastSpotKeyRef.current)
      const idx = goal.targetPcs.indexOf(spot.pc)
      label = goal.labels[idx] ?? 'R'
      sub = chord.symbol
      isColor = ['3', 'b3', '7', 'b7', '9'].includes(label)
    } else if (curLens === 'degrees') {
      const cands = filterSpots(midis, { ...st.filter, accidentals: 'both' }).filter(sp => scaleDegreeInfo(sp.pc, rootPc, st.scaleId) !== null)
      const clean = cands.filter(sp => !busyStrs.has(sp.s) && !busyMidis.has(sp.midi))
      spot = pickWeightedSpot(clean.length ? clean : (cands.length ? cands : allNeckSpots), hm, lastSpotKeyRef.current)
      const info = scaleDegreeInfo(spot.pc, rootPc, st.scaleId)
      label = info?.label ?? '1'
      isColor = Boolean(info?.isColor)
      sub = `${st.lensKey} scale`
    } else if (curLens === 'triads') {
      const tPcs = [rootPc, (rootPc + (st.triadQuality === 'maj' ? 4 : 3)) % 12, (rootPc + 7) % 12]
      const cands = filterSpots(midis, { ...st.filter, accidentals: 'both' }).filter(sp => tPcs.includes(sp.pc))
      const clean = cands.filter(sp => !busyStrs.has(sp.s) && !busyMidis.has(sp.midi))
      spot = pickWeightedSpot(clean.length ? clean : (cands.length ? cands : allNeckSpots), hm, lastSpotKeyRef.current)
      const iv = ((spot.pc - rootPc) % 12 + 12) % 12
      label = iv === 0 ? 'R' : iv === 3 ? '♭3' : iv === 4 ? '3' : '5'
      sub = `${st.lensKey}${st.triadQuality === 'min' ? 'm' : ''}`
      isColor = iv === 3 || iv === 4
    } else {
      // Notes lens
      const flt: GameFilter = st.rushLockChunk
        ? st.filter
        : { fromFret: spec.fromFret, toFret: spec.toFret, strings: spec.strings, accidentals: spec.accidentals }
      let pool = filterSpots(midis, flt)
      if (!pool.length) pool = allNeckSpots
      const clean = pool.filter(sp => !busyStrs.has(sp.s) && !busyMidis.has(sp.midi))
      spot = pickWeightedSpot(clean.length ? clean : pool, hm, lastSpotKeyRef.current, Math.random, Boolean(st.rushLockChunk && st.filter.weakOnly))
      const preferFlat = flt.accidentals === 'flats' || (flt.accidentals === 'both' && Math.random() < 0.5)
      label = displayPc(spot.pc, flt.accidentals, preferFlat)
    }

    lastSpotKeyRef.current = spotKey(spot.s, spot.f)
    const orb: RushOrb = {
      id: orbIdRef.current++,
      spot,
      label,
      sub,
      isColor,
      x: 98,
      speed: spec.speedPerSec,
      spawnedAt: performance.now(),
    }
    const next = [...existingOrbs, orb]
    rushOrbsRef.current = next
    setRushOrbs(next)
    if (st.voiceOn && existingOrbs.length === 0 && label !== '👂 ?') {
      speakPrompt(`${spokenNote(label)} on ${friendlyStringLabel(midis, spot.s)}`)
    }
  }, [allNeckSpots, midis, nStr, tKey])

  // Deal next prompt for Guided Path, Speed Blitz, Metronome Run, Build the Shape, Identify Fret & Daily
  const dealNext = useCallback((opts?: {
    overrideMode?: GameMode
    overrideLens?: TrainingLens
    overrideStage?: number
    overrideGauntletKey?: number
    overrideGauntletStr?: number
    overrideSoloIdx?: number
    overrideDailyPhase?: 0 | 1 | 2
    forceWeak?: boolean
  }) => {
    const st = stateRef.current
    const curMode = opts?.overrideMode ?? st.mode
    const curLens = opts?.overrideLens ?? st.lens
    const dp = opts?.overrideDailyPhase ?? st.dailyPhase
    const sub = activeSubMode(curMode, dp)
    if (sub === 'survival') return

    const curStage = opts?.overrideStage ?? st.stageId
    const hm = dataRef.current.heat[tKey] ?? {}
    const flt = opts?.forceWeak ? { ...st.filter, weakOnly: true } : st.filter
    const rootPc = pc(st.lensKey)

    setWrongSpot(null)
    setRevealSpot(null)
    setCoachTip('')
    shownAtRef.current = performance.now()

    // --- 🧩 BUILD THE SHAPE ---
    if (sub === 'sniper') {
      if (curLens === 'triads') {
        const r = CIRCLE_FOURTHS_PCS[Math.floor(Math.random() * 12)]
        const tri = buildTriadChallenge(midis, r, st.triadQuality, flt)
        setPrompt({
          shapeTitle: `Build ${tri.symbol} Triad`,
          shapeBadge: `${tri.stringSetLabel} strings`,
          shapeSpots: tri.spots,
          shapeFound: [],
          triad: tri,
        })
        if (st.voiceOn) speakPrompt(`Build ${tri.symbol} triad on ${tri.stringSetLabel}`)
        return
      }
      if (curLens === 'intervals') {
        const anc = st.intervalStyle === 'fixed'
          ? (anchorRef.current ?? pickIntervalAnchor(midis, flt, rootPc))
          : pickIntervalAnchor(midis, flt)
        anchorRef.current = anc
        setIntervalAnchor(anc)
        const targetIv = [3, 4, 5, 7, 10, 11][Math.floor(Math.random() * 6)]
        const wantPc = (anc.pc + targetIv) % 12
        const matches = filterSpots(midis, { ...flt, accidentals: 'both' }).filter(sp => sp.pc === wantPc && spotKey(sp.s, sp.f) !== spotKey(anc.s, anc.f))
        const spots = matches.length ? matches.slice(0, 5) : spotsForPc(midis, wantPc, 0, 11, true).slice(0, 4)
        const ivMeta = intervalLabelFromRoot(anc.midi + targetIv, anc.midi)
        setPrompt({
          anchor: anc,
          shapeTitle: `Find every ${ivMeta.name} (${ivMeta.short})`,
          shapeBadge: `from ${SHARPS[anc.pc]} Root`,
          shapeSpots: spots,
          shapeFound: [],
        })
        if (st.voiceOn) speakPrompt(`Find every ${ivMeta.name} from ${SHARPS[anc.pc]}`)
        return
      }
      if (curLens === 'degrees') {
        const sc = SCALE_LENSES.find(x => x.id === st.scaleId) ?? SCALE_LENSES[0]
        const stepIdx = Math.floor(Math.random() * sc.steps.length)
        const targetPc = (rootPc + sc.steps[stepIdx]) % 12
        const degLabel = sc.labels[stepIdx]
        const spots = filterSpots(midis, { ...flt, accidentals: 'both' }).filter(sp => sp.pc === targetPc)
        const finalSpots = spots.length ? spots : spotsForPc(midis, targetPc, 0, 11, true)
        setPrompt({
          shapeTitle: `Find every ${degLabel} in ${st.lensKey} ${sc.label}`,
          shapeBadge: `Frets ${flt.fromFret}–${flt.toFret}`,
          shapeSpots: finalSpots,
          shapeFound: [],
        })
        return
      }
      // Notes or Chord Tones: Find all 6 occurrences of a note!
      const targetPc = CIRCLE_FOURTHS_PCS[Math.floor(Math.random() * CIRCLE_FOURTHS_PCS.length)]
      const preferFlat = [10, 3, 8, 1, 6].includes(targetPc)
      const noteName = displayPc(targetPc, 'both', preferFlat)
      const spots = spotsForPc(midis, targetPc, 0, 11, true)
      setPrompt({
        shapeTitle: `Find every ${noteName}`,
        shapeBadge: `All ${spots.length} strings`,
        shapeSpots: spots,
        shapeFound: [],
        preferFlat,
      })
      if (st.voiceOn) speakPrompt(`Find every ${spokenNote(noteName)} across all strings`)
      return
    }

    // --- 🎸 CHORD TONES LENS (or Guided Path Stage 6) ---
    if (curLens === 'chords' || (sub === 'path' && curStage === 6)) {
      const chords = soloChordsRef.current
      const cIdx = (opts?.overrideSoloIdx ?? st.soloChordIdx) % chords.length
      const chord = chords[cIdx]
      const from = Math.max(0, Math.min(flt.fromFret, 8))
      const to = Math.min(15, Math.max(from + 4, flt.toFret || 12))
      const goal = buildSoloGoal(chord, st.soloLevel, from, to)
      setPrompt({ solo: goal, soloIdx: 0, soloFound: [] })
      try {
        const ctx = audio()
        void ctx.resume()
        strum(goal.chordMidis, ctx.currentTime + 0.04, { spread: 0.028, gain: 0.52 })
      } catch { /* ignore */ }
      if (st.voiceOn) speakPrompt(`${chord.symbol}. Play ${goal.labels[0]}`)
      return
    }

    // --- 🧭 GUIDED PATH STAGE 3 (Octave Web) ---
    if (sub === 'path' && curStage === 3) {
      const pair = pickOctavePair(midis, hm, lastSpotKeyRef.current)
      lastSpotKeyRef.current = spotKey(pair.target.s, pair.target.f)
      setPrompt({ spot: pair.target, anchor: pair.anchor, label: fullPcLabel(pair.anchor.pc), sub: `Octave from ${friendlyStringLabel(midis, pair.anchor.s)}` })
      try { const ctx = audio(); void ctx.resume(); playNote(pair.anchor.midi, ctx.currentTime + 0.04, 0.55) } catch { /* ignore */ }
      if (st.voiceOn) speakPrompt(`Find the octave of ${spokenNote(fullPcLabel(pair.anchor.pc))} on ${friendlyStringLabel(midis, pair.target.s)}`)
      return
    }

    // --- 📐 INTERVALS LENS (Speed Blitz, Metronome Run, Guided Path) ---
    if (curLens === 'intervals' && sub !== 'name') {
      const shouldMove = st.intervalStyle === 'moving' && st.hits > 0 && st.hits % 4 === 0
      const anc = (!anchorRef.current || shouldMove)
        ? pickIntervalAnchor(midis, flt, st.intervalStyle === 'fixed' ? rootPc : undefined)
        : anchorRef.current
      anchorRef.current = anc
      setIntervalAnchor(anc)
      const picked = pickIntervalTarget(midis, flt, anc, lastSpotKeyRef.current)
      lastSpotKeyRef.current = spotKey(picked.spot.s, picked.spot.f)
      const byEar = st.intervalStyle === 'ear'
      setPrompt({
        spot: picked.spot,
        anchor: anc,
        label: byEar ? '👂 ?' : picked.short,
        sub: byEar ? `Listen & find on ${friendlyStringLabel(midis, picked.spot.s)}` : `${picked.name} from ${SHARPS[anc.pc]}`,
        earPair: [anc.midi, picked.spot.midi],
      })
      try {
        const ctx = audio()
        void ctx.resume()
        playNote(anc.midi, ctx.currentTime + 0.03, 0.45)
        if (byEar) playNote(picked.spot.midi, ctx.currentTime + 0.45, 0.7)
      } catch { /* ignore */ }
      if (st.voiceOn && !byEar) speakPrompt(`Play the ${picked.name} on ${friendlyStringLabel(midis, picked.spot.s)}`)
      return
    }

    // --- 🎼 SCALE DEGREES LENS ---
    if (curLens === 'degrees' && sub !== 'name') {
      const pool = filterSpots(midis, { ...flt, accidentals: 'both' }).filter(sp => scaleDegreeInfo(sp.pc, rootPc, st.scaleId) !== null)
      const spot = pickWeightedSpot(pool.length ? pool : allNeckSpots, hm, lastSpotKeyRef.current)
      lastSpotKeyRef.current = spotKey(spot.s, spot.f)
      const info = scaleDegreeInfo(spot.pc, rootPc, st.scaleId)
      const sc = SCALE_LENSES.find(x => x.id === st.scaleId) ?? SCALE_LENSES[0]
      setPrompt({
        spot,
        label: info?.label ?? '1',
        sub: `${st.lensKey} ${sc.label}${info?.isColor ? ' · Color tone!' : ''}`,
      })
      if (st.voiceOn) speakPrompt(`Degree ${spokenNote(info?.label ?? '1')} on ${friendlyStringLabel(midis, spot.s)}`)
      return
    }

    // --- 🔺 TRIADS LENS (single-tone speed blitz / metronome) ---
    if (curLens === 'triads' && sub !== 'name') {
      const tPcs = [rootPc, (rootPc + (st.triadQuality === 'maj' ? 4 : 3)) % 12, (rootPc + 7) % 12]
      const pool = filterSpots(midis, { ...flt, accidentals: 'both' }).filter(sp => tPcs.includes(sp.pc))
      const spot = pickWeightedSpot(pool.length ? pool : allNeckSpots, hm, lastSpotKeyRef.current)
      lastSpotKeyRef.current = spotKey(spot.s, spot.f)
      const iv = ((spot.pc - rootPc) % 12 + 12) % 12
      const lbl = iv === 0 ? 'R' : iv === 3 ? '♭3' : iv === 4 ? '3' : '5'
      setPrompt({ spot, label: lbl, sub: `${st.lensKey}${st.triadQuality === 'min' ? 'm' : ''} Triad` })
      if (st.voiceOn) speakPrompt(`${lbl} of ${st.lensKey} on ${friendlyStringLabel(midis, spot.s)}`)
      return
    }

    // --- 🥁 METRONOME RUN (Notes Lens: Circle of 4ths Sweep!) ---
    if (sub === 'gauntlet') {
      const kIdx = (opts?.overrideGauntletKey ?? st.gauntletKeyIdx) % CIRCLE_FOURTHS_PCS.length
      const sIdx = Math.max(0, Math.min(nStr - 1, opts?.overrideGauntletStr ?? st.gauntletStrIdx))
      const targetPc = CIRCLE_FOURTHS_PCS[kIdx]
      const preferFlat = [10, 3, 8, 1, 6].includes(targetPc)
      const f = ((targetPc - (midis[sIdx] % 12)) + 12) % 12
      const spot: FretSpot = { s: sIdx, f, midi: midis[sIdx] + f, pc: targetPc }
      setPrompt({ spot, label: displayPc(targetPc, 'both', preferFlat), preferFlat })
      if (st.voiceOn && sIdx === 0) speakPrompt(`Sweep ${spokenNote(displayPc(targetPc, 'both', preferFlat))} across all strings`)
      return
    }

    // --- 🎵 NOTES LENS (Guided Path / Speed Blitz / Identify Fret / Daily Phase 0) ---
    let pool: FretSpot[]
    if (curMode === 'daily' && dp === 0) pool = weakestSpots(allNeckSpots, hm, 20)
    else if (sub === 'path') pool = stageSpots(midis, curStage)
    else pool = filterSpots(midis, flt)
    if (!pool.length) pool = allNeckSpots
    const spot = pickWeightedSpot(pool, hm, lastSpotKeyRef.current, Math.random, Boolean(flt.weakOnly || (curMode === 'daily' && dp === 0)))
    lastSpotKeyRef.current = spotKey(spot.s, spot.f)
    const preferFlat = flt.accidentals === 'flats' || (flt.accidentals === 'both' && Math.random() < 0.5)
    const noteLabel = displayPc(spot.pc, sub === 'path' && curStage <= 4 ? 'natural' : flt.accidentals, preferFlat)
    setPrompt({ spot, label: noteLabel, preferFlat })

    if (sub === 'name') {
      try { const ctx = audio(); void ctx.resume(); playNote(spot.midi, ctx.currentTime + 0.04, 0.75) } catch { /* ignore */ }
      if (st.voiceOn) speakPrompt(`Name fret ${spot.f} on ${friendlyStringLabel(midis, spot.s)}`)
    } else if (st.voiceOn) {
      speakPrompt(`${spokenNote(noteLabel)} on ${friendlyStringLabel(midis, spot.s)}`)
    }
  }, [allNeckSpots, midis, nStr, tKey])

  const endRun = useCallback(() => {
    countdownTimersRef.current.forEach(t => clearTimeout(t))
    countdownTimersRef.current = []
    setCountdown(0)
    setRevealHeld(false)
    setRevealFading(false)
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
      lens: st.lens,
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

  // Start with crisp 3… 2… 1… Memory Fade!
  const startGame = useCallback((nextMode = mode, opts?: { stage?: number; forceWeak?: boolean; skipCountdown?: boolean }) => {
    countdownTimersRef.current.forEach(t => clearTimeout(t))
    countdownTimersRef.current = []
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)

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
    setRevealHeld(false)
    setRevealFading(false)
    rushOrbsRef.current = []
    rushBossRef.current = null
    setRushOrbs([])
    setRushBoss(null)
    setRushLasers([])
    runTimesRef.current = []
    missedListRef.current = []
    lastSpotKeyRef.current = ''

    // Lock in the Interval Root anchor right as the session starts
    const startAnchor = previewAnchor
    anchorRef.current = startAnchor
    setIntervalAnchor(startAnchor)

    const beginAction = () => {
      setCountdown(0)
      countdownRef.current = 0
      runningRef.current = true
      setRunning(true)
      stateRef.current = { ...stateRef.current, mode: m, wave: 1, hearts: 3, hits: 0, combo: 0 }
      if (m === 'survival') {
        spawnRushEntity(1, [], startAnchor)
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
    }

    if (opts?.skipCountdown) {
      beginAction()
      return
    }

    // 3… 2… 1… Memory Fade dissolve!
    runningRef.current = true
    setRunning(true)
    setCountdown(3)
    countdownRef.current = 3
    const click = (accent: boolean) => {
      try { const ctx = audio(); void ctx.resume(); playClick(ctx.currentTime + 0.01, 'wood', accent ? 'accent' : 'beat', 0.42) } catch { /* ignore */ }
    }
    click(false)
    const t1 = window.setTimeout(() => { setCountdown(2); countdownRef.current = 2; click(false) }, 520)
    const t2 = window.setTimeout(() => { setCountdown(1); countdownRef.current = 1; click(false) }, 1040)
    const t3 = window.setTimeout(() => { click(true); beginAction() }, 1560)
    countdownTimersRef.current = [t1, t2, t3]
  }, [dealNext, mode, previewAnchor, spawnRushEntity, stageId])

  // 💔 Reveal hold-to-peek handlers (pauses orbs while held, costs 1 ♥, locked on last ♥, fades on release!)
  const revealLocked =
    mode === 'survival'
      ? hearts <= 1
      : mode === 'blitz'
        ? timeLeftMs < 8000
        : false

  const startRevealHold = useCallback(() => {
    if (!runningRef.current || countdownRef.current > 0 || revealHeldRef.current) return
    const st = stateRef.current
    if (st.mode === 'survival') {
      if (st.hearts <= 1) return // Locked on final life!
      setHearts(h => Math.max(1, h - 1))
      setShieldFlash(true)
      setTimeout(() => setShieldFlash(false), 260)
    } else if (st.mode === 'blitz') {
      if (st.timeLeftMs < 8000) return
      setTimeLeftMs(t => Math.max(2000, t - 5000))
    } else {
      setCombo(0)
    }
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    setRevealFading(false)
    revealHeldRef.current = true
    setRevealHeld(true)
    haptic('warning')
  }, [])

  const endRevealHold = useCallback(() => {
    if (!revealHeldRef.current) return
    revealHeldRef.current = false
    setRevealHeld(false)
    // Smoothly fade away like a memory on release!
    setRevealFading(true)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    fadeTimerRef.current = window.setTimeout(() => setRevealFading(false), 1150)
  }, [])

  // Global release listener so sliding finger off 💔 Reveal ALWAYS releases cleanly!
  useEffect(() => {
    if (!revealHeld) return
    const up = () => endRevealHold()
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('blur', up)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('blur', up)
    }
  }, [revealHeld, endRevealHold])

  const registerHit = useCallback((spot: FretSpot, advanceNow = true, extraLabel?: string, customMs?: number, anchor?: FretSpot | null) => {
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
    flashHitSpot(spot, anchor)
    addBurst(spot.s, spot.f, extraLabel ?? `+${points} ${badge}`, ms <= 900 ? 'lightning' : 'hit')
    haptic('success')

    if (inputMode === 'tap') {
      try { const ctx = audio(); void ctx.resume(); playNote(spot.midi, ctx.currentTime + 0.01, 0.55) } catch { /* ignore */ }
    }

    persist(recordFretResult(dataRef.current, tKey, spot.s, spot.f, true, ms))
    if (st.mode === 'survival' && nextCombo > 0 && nextCombo % 15 === 0) {
      setHearts(h => Math.min(3, h + 1))
    }

    if (advanceNow) {
      setTimeout(() => { if (runningRef.current) dealNext() }, 250)
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
    const defaultTip = st.lens === 'intervals' && anchorRef.current
      ? intervalTip(target, anchorRef.current)
      : shortcutTip(midis, target)
    setCoachTip(customMsg ?? defaultTip)
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

  const handleAttempt = useCallback((attempt: { s?: number; f?: number; midi?: number; pc?: number; fromMic?: boolean }) => {
    const st = stateRef.current
    if (!runningRef.current || countdownRef.current > 0 || revealHeldRef.current) return
    const sub = activeSubMode(st.mode, st.dailyPhase)

    // --- 🚀 ENDLESS MODE ---
    if (sub === 'survival') {
      const orbs = rushOrbsRef.current
      const boss = rushBossRef.current
      const matched = matchRushAttempt(orbs, boss, attempt)
      const anc = st.lens === 'intervals' ? anchorRef.current : null
      if (matched?.kind === 'boss' && boss) {
        const sp = matched.spot
        const nextFound = [...boss.found, spotKey(sp.s, sp.f)]
        const doneBoss = nextFound.length >= boss.spots.length
        fireLaser(sp.s, boss.x, doneBoss ? '👑 BOSS SHATTERED!' : `${nextFound.length}/${boss.spots.length} ⚡`, 'boss')
        registerHit(sp, false, doneBoss ? '👑 +600 BOSS!' : `${nextFound.length}/${boss.spots.length} ✓`, performance.now() - boss.spawnedAt, anc)
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
        const res = registerHit(orb.spot, false, undefined, ms, anc)
        fireLaser(orb.spot.s, orb.x, `+${res.points}`, ms <= 1500 ? 'lightning' : 'hit')
        // Advance chord on Chord Tones lens every 3 hits, or shift root in Moving Intervals every 4 hits!
        if (st.lens === 'chords' && res.nextHits % 3 === 0) {
          const nextC = (st.soloChordIdx + 1) % soloChordsRef.current.length
          setSoloChordIdx(nextC)
        }
        if (st.lens === 'intervals' && st.intervalStyle === 'moving' && res.nextHits % 4 === 0) {
          const newAnc = pickIntervalAnchor(midis, st.filter)
          anchorRef.current = newAnc
          setIntervalAnchor(newAnc)
        }
        if (res.nextHits > 0 && res.nextHits % 5 === 0) {
          const nextWave = st.wave + 1
          setWave(nextWave)
          if (nextWave % 5 === 0) setTimeout(() => { if (runningRef.current) spawnRushEntity(nextWave, []) }, 480)
          else if (remaining.length === 0) setTimeout(() => { if (runningRef.current) spawnRushEntity(nextWave, []) }, 260)
        } else if (remaining.length === 0) {
          setTimeout(() => { if (runningRef.current) spawnRushEntity(st.wave, []) }, 220)
        }
        return
      }
      if (!attempt.fromMic && attempt.s !== undefined && attempt.f !== undefined) {
        const closest = [...orbs].sort((a, b) => a.x - b.x)[0]?.spot ?? boss?.spots.find(sp => !boss.found.includes(spotKey(sp.s, sp.f)))
        if (closest) registerMiss(closest, { s: attempt.s, f: attempt.f }, undefined, false)
      }
      return
    }

    const p = promptRef.current
    if (!p) return

    // --- 🧩 BUILD THE SHAPE ---
    if (p.shapeSpots) {
      const foundSet = new Set(p.shapeFound ?? [])
      const remaining = p.shapeSpots.filter(sp => !foundSet.has(spotKey(sp.s, sp.f)))
      let match: FretSpot | undefined
      if (attempt.s !== undefined && attempt.f !== undefined) {
        match = remaining.find(sp => sp.s === attempt.s && sp.f === attempt.f)
      } else if (attempt.midi !== undefined) {
        match = remaining.find(sp => sp.midi === attempt.midi)
          ?? remaining.find(sp => Math.abs(sp.midi - attempt.midi!) === 12)
      }
      if (match) {
        const nextFound = [...(p.shapeFound ?? []), spotKey(match.s, match.f)]
        const doneAll = nextFound.length >= p.shapeSpots.length
        setPrompt({ ...p, shapeFound: nextFound })
        if (doneAll) {
          setSniperClears(c => c + 1)
          registerHit(match, false, '🧩 SHAPE COMPLETE!', undefined, p.anchor)
          setTimeout(() => { if (runningRef.current) dealNext() }, 680)
        } else {
          registerHit(match, false, `${nextFound.length}/${p.shapeSpots.length} ✓`, undefined, p.anchor)
          shownAtRef.current = performance.now()
        }
      } else if (remaining[0] && !attempt.fromMic) {
        registerMiss(remaining[0], attempt.s !== undefined && attempt.f !== undefined ? { s: attempt.s, f: attempt.f } : undefined)
      }
      return
    }

    // --- 🎸 CHORD TONES ---
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

    // --- ❓ IDENTIFY THE FRET ---
    if (sub === 'name' && p.spot) {
      if (attempt.pc !== undefined) {
        if (attempt.pc === p.spot.pc) registerHit(p.spot, true)
        else registerMiss(p.spot, undefined, `That fret is ${fullPcLabel(p.spot.pc)}. ${shortcutTip(midis, p.spot)}`)
      } else if (attempt.fromMic && attempt.midi !== undefined) {
        if (((attempt.midi % 12) + 12) % 12 === p.spot.pc) registerHit(p.spot, true)
      }
      return
    }

    // --- 🥁 METRONOME RUN ---
    if (sub === 'gauntlet' && p.spot) {
      const target = p.spot
      const ok = attempt.s !== undefined && attempt.f !== undefined
        ? attempt.s === target.s && attempt.f === target.f
        : attempt.midi !== undefined && (attempt.midi === target.midi || ((attempt.midi % 12) + 12) % 12 === target.pc)
      if (ok) {
        if (st.lens !== 'notes') {
          const res = registerHit(target, false, undefined, undefined, p.anchor)
          if (res.nextHits > 0 && res.nextHits % 6 === 0) {
            const nextBpm = Math.min(180, st.gauntletBpm + 5)
            setGauntletBpm(nextBpm)
            addBurst(target.s, target.f, `🔥 +5 BPM (${nextBpm})`, 'lightning')
          }
          setTimeout(() => { if (runningRef.current) dealNext() }, 180)
          return
        }
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

    // --- 🧭 GUIDED PATH / ⚡ SPEED BLITZ / 🏆 DAILY ---
    if (p.spot) {
      const target = p.spot
      const ok = attempt.s !== undefined && attempt.f !== undefined
        ? attempt.s === target.s && attempt.f === target.f
        : attempt.midi !== undefined && attempt.midi === target.midi
      if (ok) registerHit(target, true, undefined, undefined, p.anchor)
      else if (!attempt.fromMic && attempt.s !== undefined && attempt.f !== undefined) {
        registerMiss(target, { s: attempt.s, f: attempt.f })
      }
    }
  }, [addBurst, dealNext, fireLaser, midis, nStr, registerHit, registerMiss, spawnRushEntity])

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
      if (stopped || !runningRef.current || countdownRef.current > 0 || revealHeldRef.current) return
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
        if (!stopped) setMicErr('Microphone unavailable — switched to Touch Screen mode.')
        if (!stopped) setInputMode('tap')
      })
    return () => {
      stopped = true
      listenerRef.current = null
      listener.stop()
    }
  }, [running, inputMode, handleAttempt])

  // Feed expected MIDI pitches to NoteListener
  useEffect(() => {
    const l = listenerRef.current
    if (!l || !running || countdown > 0) return
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
    } else if (prompt?.shapeSpots) {
      const found = new Set(prompt.shapeFound ?? [])
      for (const sp of prompt.shapeSpots) if (!found.has(spotKey(sp.s, sp.f))) expected.push(sp.midi)
    } else if (prompt?.solo) {
      const targetPc = prompt.solo.targetPcs[prompt.soloIdx ?? 0]
      if (targetPc !== undefined) {
        for (const sp of spotsForPc(midis, targetPc, prompt.solo.fromFret, prompt.solo.toFret)) expected.push(sp.midi)
      }
    }
    l.expect(expected.slice(0, 12))
  }, [running, countdown, mode, rushOrbs, rushBoss, prompt, midis])

  // 🚀 Endless Mode 25 FPS orb loop (PAUSES cleanly while 💔 Reveal is held or during 3-2-1 countdown!)
  useEffect(() => {
    if (!running || mode !== 'survival') return
    let lastT = performance.now()
    const timer = setInterval(() => {
      const now = performance.now()
      const dt = Math.min(0.15, (now - lastT) / 1000)
      lastT = now
      if (!runningRef.current || countdownRef.current > 0 || revealHeldRef.current) return
      const st = stateRef.current
      const spec = rushWaveSpec(st.wave, nStr)

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
        registerMiss(first.spot, undefined, `🛡 Shield hit by ${first.label}!`, true)
        if (st.hearts > 1 && survivors.length === 0) {
          setTimeout(() => { if (runningRef.current) spawnRushEntity(st.wave, []) }, 550)
        }
        return
      }
      rushOrbsRef.current = survivors
      setRushOrbs(survivors)

      if (survivors.length === 0) {
        spawnRushEntity(st.wave, [])
      } else if (survivors.length < spec.maxConcurrent && Math.max(...survivors.map(o => o.x)) < 58) {
        spawnRushEntity(st.wave, survivors)
      }
    }, 40)
    return () => clearInterval(timer)
  }, [running, mode, midis, nStr, registerMiss, spawnRushEntity])

  // Speed Blitz (60s) & Daily (3x60s) timers (pauses while countdown or 💔 Reveal is held!)
  useEffect(() => {
    if (!running || (mode !== 'blitz' && mode !== 'daily')) return
    const tick = setInterval(() => {
      if (!runningRef.current || countdownRef.current > 0 || revealHeldRef.current) return
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

  // Metronome click loop for Metronome Run & Daily Phase 1
  useEffect(() => {
    const isMetro = running && countdown === 0 && (mode === 'gauntlet' || (mode === 'daily' && dailyPhase === 1))
    if (!isMetro) return
    let beat = 0
    const msPerBeat = Math.round(60000 / Math.max(40, gauntletBpm))
    const timer = setInterval(() => {
      if (revealHeldRef.current) return
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
  }, [running, countdown, mode, dailyPhase, gauntletBpm])

  const toggleLeftHanded = () => setLeftHanded(l => {
    const next = !l
    try { localStorage.setItem('kg:fretLeft', next ? '1' : '0') } catch { /* ignore */ }
    return next
  })

  const toggleStringFilter = (s: number) => {
    if (mode === 'survival') setRushLockChunk(true)
    setFilter(f => {
      const cur = f.strings.length ? f.strings : midis.map((_, i) => i)
      const has = cur.includes(s)
      const next = has ? cur.filter(x => x !== s) : [...cur, s].sort((a, b) => a - b)
      return { ...f, strings: next.length === 0 || next.length === nStr ? [] : next }
    })
  }

  const applyStringPreset = (strs: number[]) => {
    if (mode === 'survival') setRushLockChunk(true)
    setFilter(f => ({ ...f, strings: strs }))
  }

  const isPresetActive = (strs: number[]) =>
    strs.length === filter.strings.length && strs.every((v, i) => filter.strings[i] === v)

  const stopIfRunning = () => {
    countdownTimersRef.current.forEach(t => clearTimeout(t))
    countdownTimersRef.current = []
    setCountdown(0)
    setRevealHeld(false)
    setRevealFading(false)
    if (runningRef.current) {
      runningRef.current = false
      setRunning(false)
      rushOrbsRef.current = []
      rushBossRef.current = null
      setRushOrbs([])
      setRushBoss(null)
    }
  }

  const feverOn = combo >= 10
  const subMode = activeSubMode(mode, dailyPhase)

  // Glowing geometry links (Octaves, Triads, Interval beams!)
  const constellationLinks = useMemo(() => {
    const out: { s1: number; f1: number; s2: number; f2: number }[] = []
    if (hitGeoLink) out.push(hitGeoLink)
    if (prompt?.shapeSpots && prompt.shapeFound && prompt.shapeFound.length >= 2) {
      const foundSpots = prompt.shapeSpots.filter(sp => prompt.shapeFound!.includes(spotKey(sp.s, sp.f)))
      out.push(...octaveConstellationLinks(foundSpots))
    }
    if (prompt?.anchor && prompt.shapeSpots && prompt.shapeFound) {
      for (const sp of prompt.shapeSpots) {
        if (prompt.shapeFound.includes(spotKey(sp.s, sp.f))) {
          out.push({ s1: prompt.anchor.s, f1: prompt.anchor.f, s2: sp.s, f2: sp.f })
        }
      }
    }
    if (prompt?.anchor && prompt.spot && revealSpot) {
      out.push({ s1: prompt.anchor.s, f1: prompt.anchor.f, s2: prompt.spot.s, f2: prompt.spot.f })
    }
    return out
  }, [hitGeoLink, prompt, revealSpot])

  // Compute Primer Opacity (1 when studying -> smooth 3-2-1 memory fade -> 1 while holding 💔 Reveal -> smooth memory fade on release -> 0 during live recall!)
  const primerOpacity = !running
    ? 1
    : countdown === 3
      ? 0.78
      : countdown === 2
        ? 0.44
        : countdown === 1
          ? 0.16
          : revealHeld
            ? 0.96
            : 0

  const renderBanner = () => {
    // 3… 2… 1… Memory Fade Banner
    if (running && countdown > 0) {
      return (
        <div className="fg-countdown-banner" data-testid="fg-countdown">
          <span className="fg-chip">🧠 MEMORIZE THE NECK</span>
          <b className="fg-count-num">{countdown}</b>
          <span className="small muted">Notes fading away into memory…</span>
        </div>
      )
    }

    // Study Primer Banner (Before Start!)
    if (!running) {
      return (
        <div className="fg-primer-banner" data-testid="fg-primer-banner">
          <div className="stack" style={{ gap: 7, flex: '1 1 300px' }}>
            <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="fg-chip" style={{ background: 'rgba(56,189,248,0.22)', color: '#bae6fd' }}>👀 STUDY PRIMER</span>
              <b style={{ fontSize: 15.5 }}>{primerInfo.title}</b>
            </div>
            <span className="small muted">
              Study this lit chunk (tap any fret to hear it). Hit Start and the notes <b>fade away like a memory</b> — hold <b>💔 Reveal</b> anytime if you blank out!
            </span>

            {/* BOTH Chunk Pickers right here: Fret Box + String Set! */}
            {mode !== 'path' && mode !== 'daily' && (
              <div className="stack" style={{ gap: 5 }}>
                <div className="row" style={{ gap: 4, flexWrap: 'wrap', alignItems: 'center' }} data-testid="fg-box-pills">
                  <span className="small muted" style={{ minWidth: 58 }}>Fret Box:</span>
                  {mode === 'survival' && lens === 'notes' && (
                    <button className={`btn sm${!rushLockChunk ? ' set' : ''}`} onClick={() => setRushLockChunk(false)} data-testid="fg-chunk-auto">
                      🌊 Auto Waves
                    </button>
                  )}
                  {ZONE_PRESETS.slice(0, 5).map(z => {
                    const active = (mode !== 'survival' || rushLockChunk || lens !== 'notes') && filter.fromFret === z.from && filter.toFret === z.to
                    return (
                      <button
                        key={z.id}
                        className={`btn sm${active ? ' set' : ''}`}
                        onClick={() => {
                          if (mode === 'survival') setRushLockChunk(true)
                          setFilter(f => ({ ...f, fromFret: z.from, toFret: z.to }))
                        }}
                        data-testid={`fg-box-${z.id}`}
                      >
                        {z.label}
                      </button>
                    )
                  })}
                </div>
                <div className="row" style={{ gap: 4, flexWrap: 'wrap', alignItems: 'center' }} data-testid="fg-string-pills">
                  <span className="small muted" style={{ minWidth: 58 }}>Strings:</span>
                  {strPresets.map(sp => (
                    <button
                      key={sp.id}
                      className={`btn sm${(mode !== 'survival' || rushLockChunk || lens !== 'notes') && isPresetActive(sp.strings) ? ' set' : ''}`}
                      onClick={() => applyStringPreset(sp.strings)}
                      data-testid={`fg-strset-${sp.id}`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
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

    if (mode === 'survival') return null
    if (!prompt) return null

    // 🧩 Build the Shape Banner
    if (prompt.shapeSpots) {
      const count = prompt.shapeFound?.length ?? 0
      const total = prompt.shapeSpots.length
      return (
        <div className="fg-prompt" data-testid="fg-prompt">
          <div className="fg-prompt-left">
            <span className="fg-chip">🧩 BUILD THE SHAPE · {prompt.shapeBadge}</span>
            <span className="fg-big-note" style={{ fontSize: 28 }}>{prompt.shapeTitle}</span>
            <span className="fg-sub">({count}/{total} found)</span>
          </div>
          <div className="fg-pips">
            {prompt.shapeSpots.map((sp, i) => {
              const hit = prompt.shapeFound?.includes(spotKey(sp.s, sp.f))
              return (
                <span key={`${spotKey(sp.s, sp.f)}-${i}`} className={`fg-pip${hit ? ' on' : ''}`}>
                  {prompt.triad ? prompt.triad.labels[i] : SHARPS[midis[sp.s] % 12]}
                </span>
              )
            })}
          </div>
        </div>
      )
    }

    // 🎸 Chord Tones Banner
    if (prompt.solo) {
      const idx = prompt.soloIdx ?? 0
      return (
        <div className="fg-prompt" data-testid="fg-prompt">
          <div className="fg-prompt-left">
            <span className="fg-chip">🎸 CHORD TONES · Frets {prompt.solo.fromFret}–{prompt.solo.toFret}</span>
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
          </div>
        </div>
      )
    }

    // ❓ Identify the Fret Banner
    if (subMode === 'name' && prompt.spot) {
      return (
        <div className="fg-prompt" data-testid="fg-prompt">
          <div className="fg-prompt-left">
            <span className="fg-chip">❓ IDENTIFY THE FRET</span>
            <span className="fg-big-note">?</span>
            <span className="fg-sub">
              {friendlyStringLabel(midis, prompt.spot.s)} · Fret {prompt.spot.f}
              {inputMode === 'mic' ? ' (tap name or play on guitar)' : ''}
            </span>
          </div>
          <button className="btn sm ghost" onClick={() => { try { const ctx = audio(); void ctx.resume(); playNote(prompt.spot!.midi, ctx.currentTime + 0.02, 0.75) } catch { /* ignore */ } }}>
            🔊 Hear Again
          </button>
        </div>
      )
    }

    // Standard Prompt (Notes, Intervals, Scale Degrees, Triads, Metronome Run, Guided Path)
    if (prompt.spot) {
      return (
        <div className="fg-prompt" data-testid="fg-prompt">
          <div className="fg-prompt-left">
            <span className="fg-chip">
              {subMode === 'gauntlet'
                ? `🥁 ${gauntletBpm} BPM · Metronome Run`
                : mode === 'daily'
                  ? `🏆 DAILY · Phase ${dailyPhase + 1}/3`
                  : LENS_TABS.find(l => l.id === lens)?.icon + ' ' + (LENS_TABS.find(l => l.id === lens)?.label.toUpperCase() ?? 'PLAY')}
            </span>
            <span className="fg-big-note">{prompt.label}</span>
            <span className="fg-sub">
              on <b>{friendlyStringLabel(midis, prompt.spot.s)}</b>
              {prompt.sub ? ` · ${prompt.sub}` : ''}
            </span>
          </div>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            {subMode === 'gauntlet' && <span className={`fg-beat-dot${gauntletBeatPulse ? ' pulse' : ''}`} aria-hidden />}
            {prompt.earPair && (
              <button
                className="btn sm ghost"
                onClick={() => {
                  try {
                    const ctx = audio()
                    void ctx.resume()
                    playNote(prompt.earPair![0], ctx.currentTime + 0.02, 0.45)
                    playNote(prompt.earPair![1], ctx.currentTime + 0.44, 0.7)
                  } catch { /* ignore */ }
                }}
              >
                🔊 Replay Interval
              </button>
            )}
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
            <button className="btn sm" aria-pressed={inputMode === 'mic'} onClick={() => setInputMode('mic')} data-testid="fg-input-mic">
              🎸 Guitar Mic
            </button>
            <button className="btn sm" aria-pressed={inputMode === 'tap'} onClick={() => setInputMode('tap')} data-testid="fg-input-tap">
              👆 Touch Screen
            </button>
          </div>
          <button className={`btn sm${voiceOn ? ' set' : ''}`} aria-pressed={voiceOn} onClick={() => setVoiceOn(v => !v)} data-testid="fg-voice-btn" title="Calls out notes/intervals aloud so you can watch your real guitar">
            🔊 Voice
          </button>
          <button className={`btn sm${showHeatmap ? ' set' : ''}`} aria-pressed={showHeatmap} onClick={() => setShowHeatmap(h => !h)} data-testid="fg-heatmap-toggle" title="Show live Red/Amber/Green speed & accuracy heatmap dots on the neck">
            🗺 Heatmap
          </button>
          <button className="btn sm primary" onClick={() => { setLens('notes'); startGame('blitz', { forceWeak: true }) }} data-testid="fg-weak-drill-btn" title="60s sprint targeting ONLY your weakest red & amber frets">
            🔥 Weak Spots{weakCount > 0 ? ` (${weakCount})` : ''}
          </button>
        </div>
      </div>

      <WinArea area="fretGame" prefer={['fg-modes', 'fg-stage', 'fg-heatmap']}>
        {/* Menu Bar Window: WHAT to Learn (5 Lenses) + HOW to Play (5 Modes) — auto-tucks during live play so Radar + Fretboard fit on 1 screen! */}
        {!running && (
        <Win id="fg-modes" title="What & How to Play" noZoom resizable={false} bodyClass="stack" bodyStyle={{ gap: 8 }}>
          {/* Row 1: WHAT to Learn (5 Training Lenses) */}
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="small muted" style={{ fontWeight: 700, minWidth: 44 }}>TRAIN:</span>
            <div className="seg" role="group" aria-label="What to train">
              {LENS_TABS.map(l => (
                <button
                  key={l.id}
                  aria-pressed={lens === l.id}
                  className="btn sm"
                  onClick={() => {
                    stopIfRunning()
                    setLens(l.id)
                    setSummary(null)
                    if (l.id !== 'notes' && mode === 'path') setMode('survival')
                  }}
                  data-testid={`fg-lens-${l.id}`}
                >
                  {l.icon} {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: HOW to Play (5 Core Modes + Quick Workouts) */}
          <div className="fg-mode-strip" role="tablist" aria-label="Game modes">
            {CORE_MODES.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={mode === t.id}
                className={`fg-mode-pill${mode === t.id ? ' on' : ''}`}
                onClick={() => {
                  stopIfRunning()
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
            <button
              className={`fg-mode-pill${mode === 'name' ? ' on' : ''}`}
              onClick={() => { stopIfRunning(); setMode('name'); setLens('notes'); setSummary(null) }}
              data-testid="fg-mode-name"
            >
              <span className="fg-mode-ico">❓</span>
              <span className="fg-mode-txt"><b>Identify Fret</b><span>Reverse</span></span>
            </button>
            <button
              className={`fg-mode-pill${mode === 'daily' ? ' on' : ''}`}
              onClick={() => { stopIfRunning(); setMode('daily'); setSummary(null) }}
              data-testid="fg-mode-daily"
            >
              <span className="fg-mode-ico">🏆</span>
              <span className="fg-mode-txt"><b>Daily 3-Min</b><span>Workout</span></span>
            </button>
          </div>

          {/* Stage Ladder when in Guided Path */}
          {mode === 'path' && (
            <div className="fg-stage-strip" data-testid="fg-stage-strip">
              {stageStats.map(({ stage, pct }) => (
                <button
                  key={stage.id}
                  className={`fg-stage-card${stageId === stage.id ? ' on' : ''}`}
                  style={{ '--st-col': stage.accent } as React.CSSProperties}
                  onClick={() => { stopIfRunning(); setStageId(stage.id); setSummary(null) }}
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

          {/* Contextual Lens / Mode Controls + Collapsible Options */}
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {lens === 'intervals' && (
                <>
                  <div className="seg" role="group" aria-label="Interval style">
                    <button className="btn sm" aria-pressed={intervalStyle === 'fixed'} onClick={() => setIntervalStyle('fixed')} data-testid="fg-iv-fixed">Fixed Root</button>
                    <button className="btn sm" aria-pressed={intervalStyle === 'moving'} onClick={() => setIntervalStyle('moving')} data-testid="fg-iv-moving">Moving Root</button>
                    <button className="btn sm" aria-pressed={intervalStyle === 'ear'} onClick={() => setIntervalStyle('ear')} data-testid="fg-iv-ear">👂 By Ear</button>
                  </div>
                  {intervalStyle === 'fixed' && (
                    <select className="input sm" value={lensKey} onChange={e => setLensKey(e.target.value)} aria-label="Root note">
                      {KEYS.map(k => <option key={k} value={k}>Root: {k}</option>)}
                    </select>
                  )}
                </>
              )}

              {(lens === 'chords' || (mode === 'path' && stageId === 6)) && (
                <>
                  <select className="input sm" value={soloProgId} onChange={e => setSoloProgId(e.target.value)} aria-label="Progression">
                    {jam && <option value="jam">Jam: {jam.chords.map(c => c.symbol).join(' – ')}</option>}
                    {STARTER_PROGS.map(pr => <option key={pr.id} value={pr.id}>{pr.label}</option>)}
                  </select>
                  {soloProgId !== 'jam' && (
                    <select className="input sm" value={lensKey} onChange={e => setLensKey(e.target.value)} aria-label="Key">
                      {KEYS.map(k => <option key={k} value={k}>Key of {k}</option>)}
                    </select>
                  )}
                  <select className="input sm" value={soloLevel} onChange={e => setSoloLevel(e.target.value as SoloLevel)} aria-label="Chord tone level">
                    {SOLO_LEVELS.map(lv => <option key={lv.id} value={lv.id}>{lv.label}</option>)}
                  </select>
                </>
              )}

              {lens === 'degrees' && (
                <>
                  <select className="input sm" value={lensKey} onChange={e => setLensKey(e.target.value)} aria-label="Scale root">
                    {KEYS.map(k => <option key={k} value={k}>Key of {k}</option>)}
                  </select>
                  <select className="input sm" value={scaleId} onChange={e => setScaleId(e.target.value)} aria-label="Scale or mode">
                    {SCALE_LENSES.map(sc => <option key={sc.id} value={sc.id}>{sc.label}</option>)}
                  </select>
                </>
              )}

              {lens === 'triads' && (
                <>
                  <select className="input sm" value={lensKey} onChange={e => setLensKey(e.target.value)} aria-label="Triad key">
                    {KEYS.map(k => <option key={k} value={k}>Triad: {k}</option>)}
                  </select>
                  <div className="seg">
                    <button className="btn sm" aria-pressed={triadQuality === 'maj'} onClick={() => setTriadQuality('maj')}>Major</button>
                    <button className="btn sm" aria-pressed={triadQuality === 'min'} onClick={() => setTriadQuality('min')}>Minor</button>
                  </div>
                </>
              )}

              {mode === 'gauntlet' && (
                <>
                  <span className="small muted">Tempo:</span>
                  <button className="btn sm" onClick={() => setGauntletBpm(b => Math.max(40, b - 5))}>−5</button>
                  <b className="tabular small">{gauntletBpm} BPM</b>
                  <button className="btn sm" onClick={() => setGauntletBpm(b => Math.min(180, b + 5))}>+5</button>
                  {lens === 'notes' && (
                    <div className="seg">
                      {(['bounce', 'up', 'down'] as const).map(d => (
                        <button key={d} className="btn sm" aria-pressed={gauntletDir === d} onClick={() => setGauntletDir(d)}>
                          {d === 'bounce' ? '6→1→6' : d === 'up' ? '6→1' : '1→6'}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <button className={`btn sm${filtersOpen ? ' set' : ' ghost'}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(o => !o)} data-testid="fg-filters-btn">
              ⚙ Custom Strings, #/♭ &amp; Options
            </button>
          </div>

          {filtersOpen && (
            <div className="fg-filters stack" style={{ gap: 8 }} data-testid="fg-filters-panel">
              <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="small muted">Individual strings:</span>
                {midis.map((m, s) => {
                  const active = filter.strings.length === 0 || filter.strings.includes(s)
                  return (
                    <button key={s} className={`btn sm${active ? ' set' : ''}`} onClick={() => toggleStringFilter(s)}>
                      {SHARPS[m % 12]}{s === 0 && nStr === 6 ? '6' : s === 5 && nStr === 6 ? '1' : ''}
                    </button>
                  )
                })}
                {filter.strings.length > 0 && (
                  <button className="btn sm ghost" onClick={() => applyStringPreset([])}>All</button>
                )}
              </div>

              {lens === 'notes' && (
                <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="small muted">Accidentals:</span>
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
                </div>
              )}

              <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <label className="ex-check small">
                  <input type="checkbox" checked={Boolean(filter.weakOnly)} onChange={e => setFilter(f => ({ ...f, weakOnly: e.target.checked }))} />
                  Drill weak spots only
                </label>
                <label className="ex-check small">
                  <input type="checkbox" checked={leftHanded} onChange={toggleLeftHanded} />
                  Left-handed neck
                </label>
                <span className="small muted">Miss hint:</span>
                <div className="seg">
                  {(['miss', 'always', 'off'] as const).map(h => (
                    <button key={h} className="btn sm" aria-pressed={hintMode === h} onClick={() => setHintMode(h)}>
                      {h === 'miss' ? 'On miss' : h === 'always' ? 'Dot hints' : 'Off'}
                    </button>
                  ))}
                </div>
              </div>
              {inputMode === 'mic' && <InputPicker />}
            </div>
          )}
        </Win>
        )}

        {/* Main Interactive Fretboard Arena Window (Zoomable!) */}
        <Win
          id="fg-stage"
          title={running ? (CORE_MODES.find(t => t.id === mode)?.label ?? (mode === 'name' ? 'Identify Fret' : 'Daily 3-Min')) : 'Arena'}
          className={`panel fg-arena${feverOn ? ' fever' : ''}`}
          bodyClass="stack"
          bodyStyle={{ gap: 8 }}
        >
          {/* Live Arcade HUD + 💔 Reveal Hold Button */}
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
                    <div className="fg-hearts" aria-label={`${hearts} lives remaining`} data-testid="fg-hearts">
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
                    <span>SHAPES</span>
                    <b className="tabular">{sniperClears}</b>
                  </div>
                )}
              </div>

              <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {inputMode === 'mic' && (
                  <span className="badge small" title={micInfo || 'Microphone'}>
                    🎤 {heardLabel ? `Heard ${heardLabel}` : 'Listening…'}
                  </span>
                )}

                {/* 💔 Reveal — Hold to pause & flash the fretboard (costs 1 ♥, locked on last ♥, fades on release!) */}
                {countdown === 0 && subMode !== 'name' && (
                  <button
                    type="button"
                    className={`btn sm fg-reveal-btn${revealHeld ? ' held' : ''}`}
                    disabled={revealLocked}
                    onPointerDown={e => {
                      e.preventDefault()
                      startRevealHold()
                    }}
                    onPointerUp={endRevealHold}
                    onPointerCancel={endRevealHold}
                    onContextMenu={e => e.preventDefault()}
                    data-testid="fg-reveal-btn"
                    title={
                      revealLocked
                        ? mode === 'survival'
                          ? 'Locked on your last ♥ so you cannot end your run'
                          : 'Not enough time left to spend 5s'
                        : mode === 'survival'
                          ? 'Hold to pause orbs and reveal the fretboard (costs 1 ♥; fades away on release)'
                          : mode === 'blitz'
                            ? 'Hold to reveal the fretboard (costs 5s; fades away on release)'
                            : 'Hold to reveal the fretboard (resets combo; fades away on release)'
                    }
                  >
                    {revealHeld
                      ? '💔 Holding…'
                      : revealLocked
                        ? '💔 Reveal (Last ♥)'
                        : mode === 'blitz'
                          ? '💔 Reveal (−5s)'
                          : '💔 Reveal'}
                  </button>
                )}

                <button className="btn sm" onClick={endRun} data-testid="fg-stop-btn">■ Finish</button>
              </div>
            </div>
          )}

          {micErr && <p className="notice small" style={{ margin: 0 }}>{micErr}</p>}

          {/* End Summary OR Study Primer / 3-2-1 Fade / Active Prompt */}
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
                  <button className="btn sm" onClick={() => setSummary(null)}>👀 Study Primer</button>
                  {summary.missedSpots.length > 0 && (
                    <button className="btn sm" onClick={() => { setLens('notes'); startGame('blitz', { forceWeak: true }) }}>🔥 Drill Missed</button>
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

          {/* 🚀 ENDLESS MODE 6-STRING NEON ARCADE RADAR */}
          {running && countdown === 0 && mode === 'survival' && (
            <EndlessRadar
              midis={midis}
              waveTitle={
                lens === 'chords'
                  ? `Wave ${wave} · Chord: ${soloChords[soloChordIdx % soloChords.length]?.symbol ?? ''}`
                  : lens === 'intervals'
                    ? `Wave ${wave} · Root ${SHARPS[activeAnchor.pc]} (${intervalStyle === 'ear' ? '👂 By Ear' : 'Intervals'})`
                    : rushLockChunk || lens !== 'notes'
                      ? `Wave ${wave} · ${LENS_TABS.find(l => l.id === lens)?.label} (Frets ${filter.fromFret}–${filter.toFret})`
                      : rushWaveSpec(wave, nStr).title
              }
              orbs={rushOrbs}
              boss={rushBoss}
              lasers={rushLasers}
              shieldFlash={shieldFlash}
              feverOn={feverOn}
              paused={revealHeld}
              leftHanded={leftHanded}
              inputMode={inputMode}
              onReplayEar={lens === 'intervals' && intervalStyle === 'ear' && rushOrbs[0] ? () => {
                try {
                  const ctx = audio()
                  void ctx.resume()
                  playNote(activeAnchor.midi, ctx.currentTime + 0.02, 0.45)
                  playNote(rushOrbs[0].spot.midi, ctx.currentTime + 0.44, 0.65)
                } catch { /* ignore */ }
              } : undefined}
            />
          )}

          {coachTip && (
            <div className="fg-coach-tip" data-testid="fg-coach-tip">
              💡 {coachTip}
            </div>
          )}

          {/* Interactive Pro Studio SVG Fretboard (Study Primer -> 3-2-1 Memory Fade -> Blank Recall -> 💔 Reveal Fade!) */}
          <GameNeck
            midis={midis}
            fromFret={displayRange.from}
            toFret={displayRange.to}
            leftHanded={leftHanded}
            showHeatmap={showHeatmap}
            heatMap={heatMap}
            running={running && countdown === 0}
            primerLabels={primerInfo.labels}
            primerOpacity={primerOpacity}
            primerSmoothFade={countdown > 0 || revealFading}
            persistentRoot={lens === 'intervals' ? activeAnchor : (prompt?.anchor ?? null)}
            prompt={prompt}
            rushTargetStrings={running && countdown === 0 && mode === 'survival' ? new Set(rushOrbs.map(o => o.spot.s)) : undefined}
            subMode={subMode}
            lastHitSpot={lastHitSpot}
            wrongSpot={wrongSpot}
            revealSpot={revealSpot}
            hintAlways={hintMode === 'always'}
            vibeStr={vibeStr}
            bursts={bursts}
            links={constellationLinks}
            activeBox={prompt?.solo ? { from: prompt.solo.fromFret, to: prompt.solo.toFret } : undefined}
            onTapSpot={(s, f) => {
              const midi = midis[s] + f
              const spot: FretSpot = { s, f, midi, pc: ((midi % 12) + 12) % 12 }
              if (running && countdown === 0) {
                handleAttempt({ s, f, midi, fromMic: false })
              } else {
                setInspectSpot(spot)
                pulseString(s)
                try {
                  const ctx = audio()
                  void ctx.resume()
                  if (lens === 'intervals' && spotKey(s, f) !== spotKey(activeAnchor.s, activeAnchor.f)) {
                    // Play Root -> Interval so the ear learns alongside the eye!
                    playNote(activeAnchor.midi, ctx.currentTime + 0.01, 0.42)
                    playNote(midi, ctx.currentTime + 0.36, 0.68)
                  } else {
                    playNote(midi, ctx.currentTime + 0.01, 0.7)
                  }
                } catch { /* ignore */ }
              }
            }}
          />

          {/* Free-explore note / interval inspector during Study Primer */}
          {!running && inspectSpot && (
            <div className="row small" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
              <span>
                <b>{fullPcLabel(inspectSpot.pc)}</b> · {friendlyStringLabel(midis, inspectSpot.s)} · Fret {inspectSpot.f}
                {lens === 'intervals' && ` · ${intervalLabelFromRoot(inspectSpot.midi, activeAnchor.midi).name} from ${SHARPS[activeAnchor.pc]}`}
              </span>
              {(() => {
                const st = heatMap[spotKey(inspectSpot.s, inspectSpot.f)]
                if (!st || st.seen === 0) return <span className="muted">Tap any fret to study, then hit Start!</span>
                const acc = Math.round((st.right / Math.max(1, st.seen)) * 100)
                return <span className="tabular muted">{acc}% accuracy · {(st.avgMs / 1000).toFixed(2)}s avg · {st.seen} tries</span>
              })()}
            </div>
          )}

          {running && countdown === 0 && subMode === 'name' && (
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
              <span className="small muted">Endless / Speed Blitz</span>
              <b className="tabular">W{data.records.survivalWave} · {data.records.blitzScore.toLocaleString()}</b>
              <span className="small muted">Best combo {data.records.bestCombo}×</span>
            </div>
            <div className="fg-kpi">
              <span className="small muted">Metronome / Daily</span>
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

// ---------- 🚀 Endless Mode 6-String Neon Arcade Radar ----------

function EndlessRadar({
  midis,
  waveTitle,
  orbs,
  boss,
  lasers,
  shieldFlash,
  feverOn,
  paused,
  leftHanded,
  inputMode,
  onReplayEar,
}: {
  midis: number[]
  waveTitle: string
  orbs: RushOrb[]
  boss: RushBoss | null
  lasers: RushLaser[]
  shieldFlash: boolean
  feverOn: boolean
  paused: boolean
  leftHanded: boolean
  inputMode: 'mic' | 'tap'
  onReplayEar?: () => void
}) {
  const nStr = midis.length
  const W = 680
  const laneH = 21
  const padTop = 12
  const padBot = 8
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
    <div className={`fg-radar${shieldFlash ? ' hit' : ''}${feverOn ? ' fever' : ''}${paused ? ' paused' : ''}`} data-testid="fg-rush-radar">
      <div className="row small" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 4px', gap: 6, flexWrap: 'wrap' }}>
        <b style={{ color: paused ? '#fbbf24' : boss ? '#fbbf24' : '#38bdf8' }}>
          {paused ? '⏸ PAUSED — Studying Reveal…' : waveTitle}
        </b>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          {onReplayEar && (
            <button className="btn sm ghost" style={{ padding: '1px 7px', minHeight: 24 }} onClick={onReplayEar}>
              🔊 Replay
            </button>
          )}
          <span className="muted">
            {inputMode === 'mic' ? '🎸 Play on your guitar!' : '👆 Tap matching blank fret below!'}
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="fg-radar-svg" role="img" aria-label="Endless Mode incoming lane radar">
        <defs>
          <linearGradient id="fg-shield-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={shieldFlash ? '#ef4444' : feverOn ? '#f59e0b' : '#38bdf8'} stopOpacity="0.95" />
            <stop offset="100%" stopColor={shieldFlash ? '#f97316' : '#06b6d4'} stopOpacity="0.45" />
          </linearGradient>
        </defs>

        <rect
          x={leftHanded ? laneEnd - laneSpan * 0.25 : laneStart}
          y={padTop}
          width={laneSpan * 0.25}
          height={nStr * laneH}
          fill={shieldFlash ? 'rgba(239,68,68,0.22)' : 'rgba(239,68,68,0.06)'}
        />

        {midis.map((m, s) => {
          const y = laneY(s)
          const active = orbs.some(o => o.spot.s === s)
          return (
            <g key={`rl-${s}`}>
              <line x1={laneStart} y1={y} x2={laneEnd} y2={y} stroke={active ? 'rgba(56,189,248,0.42)' : 'rgba(148,163,184,0.18)'} strokeWidth={active ? 2 : 1} />
              <text x={leftHanded ? W - 26 : 26} y={y + 4} textAnchor="middle" fontSize={12} fontWeight={800} fill={active ? '#38bdf8' : '#94a3b8'}>
                {SHARPS[m % 12]}{s === 0 && nStr === 6 ? '6' : s === 5 && nStr === 6 ? '1' : ''}
              </text>
            </g>
          )
        })}

        <rect x={shieldX - 4} y={padTop - 2} width={8} height={nStr * laneH + 4} rx={4} fill="url(#fg-shield-grad)" />

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
            <circle cx={mapX(lz.x)} cy={laneY(lz.s)} r={16} fill="none" stroke={lz.kind === 'boss' ? '#fde68a' : '#6ee7b7'} strokeWidth={2.5} />
            <text x={mapX(lz.x)} y={laneY(lz.s) - 14} textAnchor="middle" fontSize={12} fontWeight={900} fill={lz.kind === 'boss' ? '#fde68a' : '#38bdf8'}>
              {lz.text}
            </text>
          </g>
        ))}

        {orbs.map(orb => {
          const cx = mapX(orb.x)
          const cy = laneY(orb.spot.s)
          const danger = orb.x < 26
          const fill = danger ? '#ef4444' : orb.isColor ? '#06b6d4' : '#0ea5e9'
          return (
            <g key={orb.id} data-testid={`fg-orb-${orb.spot.s}-${orb.spot.f}`}>
              <circle cx={cx} cy={cy} r={13.5} fill={fill} stroke={danger ? '#fecaca' : '#bae6fd'} strokeWidth={2.2} />
              <text x={cx} y={cy + 4.5} textAnchor="middle" fontSize={orb.label.length > 2 ? 9.5 : orb.label.length > 1 ? 11 : 13} fontWeight={900} fill="#fff">
                {orb.label}
              </text>
            </g>
          )
        })}

        {boss && (() => {
          const cx = mapX(boss.x)
          const cy = padTop + (nStr * laneH) / 2
          const remaining = boss.spots.length - boss.found.length
          return (
            <g data-testid="fg-rush-boss">
              <circle cx={cx} cy={cy} r={34} fill="rgba(245,158,11,0.22)" stroke="#f59e0b" strokeWidth={3} strokeDasharray="7 4" />
              <circle cx={cx} cy={cy} r={24} fill="#f59e0b" stroke="#fef08a" strokeWidth={2.5} />
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize={10} fontWeight={900} fill="#1c1204">👑 BOSS</text>
              <text x={cx} y={cy + 13} textAnchor="middle" fontSize={16} fontWeight={900} fill="#1c1204">{boss.label}</text>
              <text x={cx} y={cy + 46} textAnchor="middle" fontSize={11} fontWeight={800} fill="#fde68a">
                {boss.title} · {remaining} left
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
  primerLabels: Map<string, { text: string; isRoot?: boolean; isColor?: boolean }>
  primerOpacity: number
  primerSmoothFade: boolean
  persistentRoot: FretSpot | null
  prompt: ActivePrompt | null
  rushTargetStrings?: Set<number>
  subMode: GameMode
  lastHitSpot: FretSpot | null
  wrongSpot: { s: number; f: number } | null
  revealSpot: FretSpot | null
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
  primerLabels,
  primerOpacity,
  primerSmoothFade,
  persistentRoot,
  prompt,
  rushTargetStrings,
  subMode,
  lastHitSpot,
  wrongSpot,
  revealSpot,
  hintAlways,
  vibeStr,
  bursts,
  links,
  activeBox,
  onTapSpot,
}: NeckProps) {
  const nStr = midis.length
  const frets = Array.from({ length: toFret - fromFret + 1 }, (_, i) => fromFret + i)
  const hasOpen = fromFret === 0
  const boardStart = hasOpen ? 46 : 28
  const fretW = 54
  const padY = 20
  const strGap = 27
  const frettedCount = hasOpen ? Math.max(1, frets.length - 1) : frets.length
  const W = boardStart + frettedCount * fretW + 16
  const H = padY * 2 + (nStr - 1) * strGap + 18

  // Center every dot cleanly between its two fret wires (both for open 0..N and upper boxes 5..9!)
  const fretX = (f: number) => {
    const idx = f - fromFret
    const rawX = hasOpen
      ? (idx === 0 ? boardStart * 0.52 : boardStart + (idx - 0.5) * fretW)
      : boardStart + (idx + 0.5) * fretW
    return leftHanded ? W - rawX : rawX
  }
  const fretWireX = (f: number) => {
    const idx = f - fromFret
    const rawX = hasOpen ? boardStart + idx * fretW : boardStart + (idx + 1) * fretW
    return leftHanded ? W - rawX : rawX
  }
  const strY = (s: number) => padY + (nStr - 1 - s) * strGap

  const targetStringHighlight = running && prompt?.spot && subMode !== 'name' ? prompt.spot.s : null

  return (
    <div className="fg-neck-scroll" data-testid="fg-neck">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="fg-neck-svg"
        style={frets.length > 8 ? { minWidth: 540 } : undefined}
        role="group"
        aria-label="Interactive guitar fretboard"
      >
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
          x={leftHanded ? 16 : boardStart}
          y={padY - 11}
          width={W - boardStart - 16}
          height={(nStr - 1) * strGap + 22}
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
              y={padY - 13}
              width={Math.abs(x2 - x1)}
              height={(nStr - 1) * strGap + 26}
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
            const nx = leftHanded ? W - boardStart - 4 : boardStart
            return <rect key="nut" x={nx} y={padY - 11} width={5} height={(nStr - 1) * strGap + 22} fill="url(#fg-nut)" rx={1.5} />
          }
          const wx = fretWireX(f)
          return (
            <line key={`w-${f}`} x1={wx} y1={padY - 11} x2={wx} y2={padY + (nStr - 1) * strGap + 11} stroke={f === 12 ? 'rgba(245,158,11,0.55)' : 'rgba(226,232,240,0.28)'} strokeWidth={f === 12 ? 2.4 : 1.5} />
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
          <text key={`fn-${f}`} x={fretX(f)} y={H - 4} textAnchor="middle" fontSize={11} fontWeight={LANDMARK_FRETS.includes(f) ? 700 : 500} fill={LANDMARK_FRETS.includes(f) ? '#f59e0b' : 'rgba(226,232,240,0.55)'}>
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
                <line x1={leftHanded ? 16 : boardStart - 10} y1={y} x2={leftHanded ? W - boardStart + 10 : W - 16} y2={y} stroke="rgba(56, 189, 248, 0.28)" strokeWidth={10} strokeLinecap="round" />
              )}
              <line x1={leftHanded ? 16 : boardStart} y1={y} x2={leftHanded ? W - boardStart : W - 16} y2={y} stroke={isVibe ? '#34d399' : isTarget ? '#38bdf8' : baseColor} strokeWidth={isVibe ? gauge + 1.2 : gauge} className={isVibe ? 'fg-str-vibe' : undefined} />
              <text x={leftHanded ? W - 11 : 11} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={isTarget ? '#38bdf8' : '#94a3b8'}>
                {SHARPS[m % 12]}
              </text>
            </g>
          )
        })}

        {/* Glowing Geometry / Octave / Triad / Interval Beams */}
        {links.map((lk, i) => (
          <line key={`lk-${i}`} x1={fretX(lk.f1)} y1={strY(lk.s1)} x2={fretX(lk.f2)} y2={strY(lk.s2)} stroke="#f59e0b" strokeWidth={2.8} strokeDasharray="6 4" opacity={0.9} />
        ))}

        {/* Study Primer & 💔 Reveal Memory-Fade Overlay Layer (smoothly dissolves like a memory!) */}
        <g
          className={primerSmoothFade ? 'fg-primer-layer fading' : 'fg-primer-layer'}
          style={{ opacity: primerOpacity }}
          pointerEvents="none"
          data-testid="fg-primer-layer"
        >
          {midis.map((_, s) =>
            frets.map(f => {
              const key = spotKey(s, f)
              const info = primerLabels.get(key)
              if (!info) return null
              const cx = fretX(f)
              const cy = strY(s)
              const tier = fretHeat(heatMap[key])
              const fill = info.isRoot
                ? '#f59e0b'
                : info.isColor
                  ? '#06b6d4'
                  : tier === 'unseen'
                    ? 'rgba(56, 189, 248, 0.36)'
                    : HEAT_FILL[tier]
              const stroke = info.isRoot ? '#fef08a' : info.isColor ? '#a5f3fc' : tier === 'unseen' ? '#7dd3fc' : HEAT_STROKE[tier]
              const textCol = info.isRoot || info.isColor || tier === 'amber' || tier === 'gold' ? '#0b1120' : '#fff'
              return (
                <g key={`pr-${key}`}>
                  <circle cx={cx} cy={cy} r={12.5} fill={fill} stroke={stroke} strokeWidth={2} />
                  <text x={cx} y={cy + 4} textAnchor="middle" fontSize={info.text.length > 2 ? 8.5 : info.text.length > 1 ? 9.5 : 11} fontWeight={800} fill={textCol}>
                    {info.text}
                  </text>
                </g>
              )
            }),
          )}
        </g>

        {/* Live Gameplay Interactive Layer (Tap Targets, Heatmap Dots, Gold Root Anchor, Hits, Misses) */}
        {midis.map((m, s) =>
          frets.map(f => {
            const key = spotKey(s, f)
            const cx = fretX(f)
            const cy = strY(s)
            const midi = m + f
            const notePc = ((midi % 12) + 12) % 12
            const tier = fretHeat(heatMap[key])

            const isRootAnchor = persistentRoot?.s === s && persistentRoot?.f === f
            const isNameTarget = running && subMode === 'name' && prompt?.spot?.s === s && prompt?.spot?.f === f
            const isShapeHit = running && Boolean(prompt?.shapeFound?.includes(key))
            const isSoloFound = running && Boolean(prompt?.soloFound?.some(sp => sp.s === s && sp.f === f))
            const isLastHit = running && lastHitSpot?.s === s && lastHitSpot?.f === f
            const isWrong = running && wrongSpot?.s === s && wrongSpot?.f === f
            const isReveal = running && revealSpot?.s === s && revealSpot?.f === f
            const showDotHint = running && hintAlways && NATURAL_PCS.has(notePc) && LANDMARK_FRETS.includes(f)

            let fill = 'transparent'
            let stroke = 'transparent'
            let label = ''
            let textColor = '#fff'
            let r = 11.5

            if (running && showHeatmap && !isNameTarget) {
              fill = HEAT_FILL[tier]
              stroke = HEAT_STROKE[tier]
              r = 8.5
            }
            if (showDotHint && !label) {
              fill = 'rgba(255,255,255,0.08)'
              stroke = 'rgba(255,255,255,0.22)'
              label = SHARPS[notePc]
              textColor = 'rgba(255,255,255,0.6)'
            }
            if (isRootAnchor) {
              fill = '#f59e0b'
              stroke = '#fef08a'
              label = 'R'
              textColor = '#1c1204'
              r = 13.5
            }
            if (isShapeHit || isSoloFound || isLastHit) {
              fill = '#10b981'
              stroke = '#a7f3d0'
              label = SHARPS[notePc]
              textColor = '#042f2e'
              r = 13
            }
            if (isNameTarget) {
              fill = '#38bdf8'
              stroke = '#e0f2fe'
              label = '?'
              textColor = '#082f49'
              r = 14
            }
            if (isReveal) {
              fill = 'rgba(245, 158, 11, 0.92)'
              stroke = '#fef08a'
              label = SHARPS[notePc]
              textColor = '#1c1204'
              r = 13
            }
            if (isWrong) {
              fill = '#ef4444'
              stroke = '#fecaca'
              label = SHARPS[notePc]
              textColor = '#fff'
              r = 13
            }

            return (
              <g key={key} className="fg-spot" onClick={() => onTapSpot(s, f)} data-testid={`fg-spot-${s}-${f}`} style={{ cursor: 'pointer' }}>
                <rect x={cx - fretW * 0.48} y={cy - strGap * 0.48} width={fretW * 0.96} height={strGap * 0.96} fill="transparent" />
                {(fill !== 'transparent' || stroke !== 'transparent') && (
                  <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={isRootAnchor || isNameTarget || isReveal ? 2.5 : 1.5} />
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
            <circle cx={fretX(b.f)} cy={strY(b.s)} r={18} fill="none" stroke={b.kind === 'lightning' ? '#38bdf8' : b.kind === 'hit' ? '#10b981' : '#ef4444'} strokeWidth={3} />
            <text x={fretX(b.f)} y={strY(b.s) - 18} textAnchor="middle" fontSize={12} fontWeight={800} fill={b.kind === 'lightning' ? '#38bdf8' : b.kind === 'hit' ? '#34d399' : '#f87171'}>
              {b.text}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

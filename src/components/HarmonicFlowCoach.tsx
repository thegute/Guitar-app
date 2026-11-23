// Interactive Harmonic Flow Coach: Dual-Labeled SVG Radial Chord Tree, Real-Time Audio Auto-Advance,
// Endless Flow Jam (live Strum Machine integration), Smart Voice-Leading Preview, Breadcrumb Ribbon,
// and Pathfinder Challenge Mode.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { audio } from '../audio/engine'
import { strum } from '../audio/pluck'
import { ChromaListener } from '../audio/chroma'
import { strumMachine, useStrumState } from '../audio/strumMachine'
import { ChordDiagram } from './ChordDiagram'
import { VoiceLeadNeck } from './VoiceLeadNeck'
import { ChordVibeSetsView, DetectScaleView, KeyShifterView } from './ScalerViews'
import { useRegisterFeatureIntro } from './FeatureIntro'
import { downloadMidiFile, exportStrumChartToMidi } from '../audio/midiChords'
import { usePersist } from './Controls'
import { Ico } from './Icon'
import { useChordGrips } from '../chordGrips'
import { useInstrument } from '../instrument'
import { openInPlay, openLicksInKey, openStrumGrid, onOpenFlow, takePendingFlow } from '../nav'
import { newId, saveSong, type SongDoc } from '../tabs/library'
import type { Song } from '../tabs/model'
import { KEYS, keyPrefersFlats } from '../theory/notes'
import type { Voicing } from '../theory/chords'
import { shapesFor } from '../theory/shapes'
import {
  FLOW_VOICING_STYLES,
  voicingForFlowChord,
  type FlowVoicingResult,
  type FlowVoicingStyle,
} from '../theory/flowVoicings'
import {
  PATHFINDER_CHALLENGES,
  STRUM_STYLES,
  detectFlowChord,
  flowNodeForChordSymbol,
  getFlowBranches,
  getFlowNodes,
  parseChordQual,
  randomPathfinderGoal,
  type EdgeFlavor,
  type FlowSpice,
  type PathfinderChallenge,
  type ResolvedFlowBranch,
  type ResolvedFlowNode,
  type StrumChart,
  type StrumStyleId,
} from '../theory/harmonicFlow'

const FING_HEX: Record<number, string> = {
  1: '#3b82f6', // Index — Blue
  2: '#22c55e', // Middle — Green
  3: '#f59e0b', // Ring — Amber
  4: '#ef4444', // Pinky — Red
}

/** Compact SVG chord grip diagram placed right next to each orbiting chord on the Chord Path wheel. */
function MiniWheelDiagram({
  x,
  y,
  res,
  accentColor,
}: {
  x: number
  y: number
  res: FlowVoicingResult
  accentColor: string
}) {
  const v: Voicing = res.voicing
  const nStr = Math.max(4, v.frets.length)
  const W = 54
  const H = res.inversion ? 64 : 56
  const gx = -W / 2 + 10
  const gy = -H / 2 + 12
  const gw = W - 16
  const gh = 34
  const strGap = gw / (nStr - 1)
  const fretGap = gh / 4
  const pos = v.frets.filter(f => f > 0)
  const base = v.baseFret > 1 ? v.baseFret : (pos.length && Math.max(...pos) > 4 ? Math.min(...pos) : 1)
  const isOpen = base === 1

  return (
    <g transform={`translate(${x}, ${y})`} style={{ pointerEvents: 'none' }} data-testid="wheel-mini-diagram">
      <rect
        x={-W / 2}
        y={-H / 2}
        width={W}
        height={H}
        rx={7}
        fill="rgba(12, 16, 26, 0.94)"
        stroke={accentColor}
        strokeOpacity={0.55}
        strokeWidth={1.1}
      />
      {/* Nut or starting fret badge */}
      {isOpen ? (
        <line x1={gx} x2={gx + gw} y1={gy} y2={gy} stroke="#e2e8f0" strokeWidth={2.2} />
      ) : (
        <text x={gx - 2.5} y={gy + fretGap * 0.72} textAnchor="end" fontSize={7.5} fontWeight={700} fill="#cbd5e1">
          {base}f
        </text>
      )}
      {/* 4 horizontal frets */}
      {[0, 1, 2, 3, 4].map(fi => (
        <line
          key={`f${fi}`}
          x1={gx}
          x2={gx + gw}
          y1={gy + fi * fretGap}
          y2={gy + fi * fretGap}
          stroke="rgba(148,163,184,0.35)"
          strokeWidth={fi === 0 && isOpen ? 0 : 0.7}
        />
      ))}
      {/* Vertical strings */}
      {Array.from({ length: nStr }, (_, s) => (
        <line
          key={`s${s}`}
          x1={gx + s * strGap}
          x2={gx + s * strGap}
          y1={gy}
          y2={gy + gh}
          stroke="rgba(148,163,184,0.45)"
          strokeWidth={0.7}
        />
      ))}
      {/* Barre bars */}
      {v.barres.map(bf => {
        const rel = bf - base + 1
        if (rel < 1 || rel > 4) return null
        const matching = v.frets.map((f, s) => (f === bf ? s : -1)).filter(s => s >= 0)
        if (matching.length < 2) return null
        const x1 = gx + Math.min(...matching) * strGap
        const x2 = gx + Math.max(...matching) * strGap
        const by = gy + (rel - 0.5) * fretGap
        return (
          <line
            key={`b${bf}`}
            x1={x1}
            x2={x2}
            y1={by}
            y2={by}
            stroke={FING_HEX[1]}
            strokeWidth={5.2}
            strokeLinecap="round"
            opacity={0.9}
          />
        )
      })}
      {/* Muted x, Open o, and colored 1-2-3-4 Finger Dots */}
      {v.frets.map((f, s) => {
        const sx = gx + s * strGap
        if (f < 0) {
          return (
            <text key={`m${s}`} x={sx} y={gy - 3} textAnchor="middle" fontSize={7} fill="#94a3b8">
              ×
            </text>
          )
        }
        if (f === 0) {
          return (
            <circle key={`o${s}`} cx={sx} cy={gy - 5} r={2.3} fill="none" stroke="#e2e8f0" strokeWidth={1} />
          )
        }
        const rel = f - base + 1
        if (rel < 1 || rel > 4) return null
        const sy = gy + (rel - 0.5) * fretGap
        const fing = v.fingers[s] ?? 0
        const dotFill = FING_HEX[fing] ?? '#38bdf8'
        return (
          <g key={`d${s}`}>
            <circle cx={sx} cy={sy} r={3.8} fill={dotFill} stroke="#0b0e17" strokeWidth={0.6} />
            {fing > 0 && (
              <text x={sx} y={sy + 2.3} textAnchor="middle" fontSize={6.2} fontWeight={800} fill="#ffffff">
                {fing}
              </text>
            )}
          </g>
        )
      })}
      {/* Optional Triad inversion badge */}
      {res.inversion && (
        <text x={0} y={H / 2 - 4} textAnchor="middle" fontSize={7.2} fontWeight={700} fill="#94a3b8">
          {res.inversion} inv
        </text>
      )}
    </g>
  )
}

const FLAVOR_META: Record<EdgeFlavor, { label: string; color: string; stroke: string }> = {
  diatonic: { label: 'In Key', color: 'var(--fb-mint, #10b981)', stroke: 'rgba(16, 185, 129, 0.72)' },
  pull: { label: 'Pull (Secondary Dom)', color: 'var(--fb-gold, #f59e0b)', stroke: 'rgba(245, 158, 11, 0.8)' },
  color: { label: 'Color (Borrowed)', color: 'var(--fb-embel, #c084fc)', stroke: 'rgba(192, 132, 252, 0.82)' },
}

const SPICE_OPTIONS: { id: FlowSpice; label: string }[] = [
  { id: 'campfire', label: 'Campfire' },
  { id: 'pop', label: 'Pop & Rock' },
  { id: 'jazz', label: 'Jazz & Color' },
]

function chordToMidis(symbol: string): number[] {
  const parsed = parseChordQual(symbol)
  const rootPc = parsed?.rootPc ?? 0
  const qual = parsed?.qual ?? ''
  const root = 48 + rootPc
  const map: Record<string, number[]> = {
    '': [0, 4, 7, 12],
    m: [0, 3, 7, 12],
    '5': [0, 7, 12],
    '7': [0, 4, 7, 10],
    m7: [0, 3, 7, 10],
    maj7: [0, 4, 7, 11],
    dim: [0, 3, 6, 9],
    sus4: [0, 5, 7, 12],
    add9: [0, 4, 7, 14],
  }
  return (map[qual] ?? [0, 4, 7, 12]).map(iv => root + iv)
}

function shapeForSymbol(symbol: string, inst: ReturnType<typeof useInstrument>) {
  const m = symbol.trim().match(/^([A-G][#b]?)(.*)$/)
  if (!m) return null
  const qual = parseChordQual(symbol)?.qual ?? ''
  const type = qual === '' ? '' : qual === 'm' ? 'm' : qual
  return shapesFor({ root: m[1], type }, inst)[0] ?? null
}

function buildSongDocFromTrail(trail: string[], tonic: string, minor: boolean, bpm: number, capo: number, tuning: number[], inst: ReturnType<typeof useInstrument>): SongDoc {
  const bars = trail.map(sym => {
    const shape = shapeForSymbol(sym, inst)
    const notes = shape
      ? shape.frets
          .map((fret, string) => (fret >= 0 ? { string, fret, midi: (tuning[string] ?? 40) + fret } : null))
          .filter((x): x is { string: number; fret: number; midi: number } => !!x)
      : chordToMidis(sym).map((midi, i) => ({ string: i, fret: 0, midi }))
    return {
      steps: [
        { dur: 2, chord: sym, notes },
        { dur: 2, notes },
      ],
    }
  })
  const song: Song = {
    title: `Flow Progression (${tonic}${minor ? 'm' : ''}): ${trail.slice(0, 6).join(' – ')}`,
    tempo: bpm,
    tracks: [{ name: 'Chords', tuning, capo, bars }],
  }
  return {
    id: newId(),
    title: song.title,
    source: 'jam',
    song,
    updated: Date.now(),
  }
}

export function HarmonicFlowCoach() {
  const inst = useInstrument()
  const strumState = useStrumState()

  const [hubView, setHubView] = usePersist<'path' | 'vibe' | 'shift' | 'detect'>('flowHubView', 'path')
  const [tonic, setTonic] = usePersist('flowTonic', 'C')
  const [minor, setMinor] = usePersist('flowMinor', false)
  const [spice, setSpice] = usePersist<FlowSpice>('flowSpice', 'pop')
  const [capo, setCapo] = usePersist('flowCapo', 0)
  const [mode, setMode] = useState<'free' | 'pathfinder'>('free')
  useRegisterFeatureIntro(
    hubView === 'path' ? 'chord-path' : hubView === 'vibe' ? 'vibe-sets' : hubView === 'shift' ? 'key-shifter' : 'detect-scale',
  )
  const [nodeId, setNodeId] = useState<string>(() => (minor ? 'i' : 'I'))
  const [hoveredBranchId, setHoveredBranchId] = useState<string | null>(null)
  const [trail, setTrail] = useState<string[]>([])
  const [showVoiceLead, setShowVoiceLead] = usePersist('flowShowVL', true)
  const { show: showWheelDiagrams, style: voicingStyle, setShow: setShowWheelDiagrams, setStyle: setVoicingStyle } = useChordGrips()
  const [jamStyle, setJamStyle] = usePersist<StrumStyleId>('flowJamStyle', 'folk')
  const [jamTiming, setJamTiming] = usePersist<'beat1' | 'instant'>('flowJamTiming', 'beat1')
  const [statusMsg, setStatusMsg] = useState('')

  // Pathfinder Challenge state
  const [challengeIdx, setChallengeIdx] = useState(0)
  const [customChallenge, setCustomChallenge] = useState<PathfinderChallenge | null>(null)
  const [pfSteps, setPfSteps] = useState(0)
  const [pfUsedFlavor, setPfUsedFlavor] = useState<Set<EdgeFlavor>>(new Set())
  const [pfStatus, setPfStatus] = useState<'active' | 'won' | 'over'>('active')

  // Real-time Mic / Interface Audio Auto-Advance state
  const [listening, setListening] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const [micErr, setMicErr] = useState('')
  const [detectHint, setDetectHint] = useState('')
  const [lockProgress, setLockProgress] = useState<{ id: string; pct: number } | null>(null)
  const listenerRef = useRef<ChromaListener | null>(null)
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cooldownUntilRef = useRef<number>(0)

  const activeChallenge: PathfinderChallenge | null = mode === 'pathfinder'
    ? (customChallenge ?? PATHFINDER_CHALLENGES[challengeIdx] ?? PATHFINDER_CHALLENGES[0])
    : null

  // Consume deep-link open requests (from Chords, Play, Learn, Quick Search)
  const applyOpenOpts = useCallback((opts: ReturnType<typeof takePendingFlow>) => {
    if (!opts) return
    const nextMinor = opts.minor ?? minor
    const nextTonic = opts.tonic ?? tonic
    if (opts.tonic !== undefined) setTonic(opts.tonic)
    if (opts.minor !== undefined) setMinor(opts.minor)
    if (opts.capo !== undefined) setCapo(opts.capo)
    if (opts.mode) setMode(opts.mode)
    if (opts.view) setHubView(opts.view)
    else if (opts.startChord || opts.mode) setHubView('path')
    if (opts.startChord) {
      const matchedId = flowNodeForChordSymbol(opts.startChord, nextTonic, nextMinor)
      setNodeId(matchedId)
      setTrail([opts.startChord])
    } else if (opts.minor !== undefined) {
      setNodeId(opts.minor ? 'i' : 'I')
    }
  }, [minor, tonic, setTonic, setMinor, setCapo])

  useEffect(() => {
    applyOpenOpts(takePendingFlow())
    return onOpenFlow(applyOpenOpts)
  }, [applyOpenOpts])

  // Ensure current nodeId is valid for major/minor mode
  const allNodes = useMemo(() => getFlowNodes(tonic, minor, capo), [tonic, minor, capo])
  const effectiveSpice: FlowSpice = activeChallenge ? activeChallenge.spice : spice
  const { center: centerNode, branches } = useMemo(
    () => getFlowBranches(nodeId, tonic, minor, effectiveSpice, capo, 5),
    [nodeId, tonic, minor, effectiveSpice, capo],
  )

  // Keep breadcrumb trail initialized with home chord on mount
  useEffect(() => {
    if (trail.length === 0 && centerNode) {
      setTrail([centerNode.symbol])
    }
  }, [centerNode, trail.length])

  const previewNode: ResolvedFlowNode = useMemo(() => {
    if (hoveredBranchId) {
      const b = branches.find(x => x.node.id === hoveredBranchId)
      if (b) return b.node
    }
    return branches[0]?.node ?? centerNode
  }, [hoveredBranchId, branches, centerNode])

  const previewBranch = useMemo(
    () => branches.find(b => b.node.id === previewNode.id) ?? branches[0] ?? null,
    [branches, previewNode.id],
  )

  const flats = keyPrefersFlats(tonic, minor)

  // Compute Open / Barre / Triad voicings for center chord + every orbiting branch!
  const centerVoicing = useMemo(
    () => voicingForFlowChord(capo > 0 ? centerNode.capoSymbol : centerNode.symbol, inst, voicingStyle, 5),
    [centerNode, capo, inst, voicingStyle],
  )
  const branchVoicings = useMemo(() => {
    const map = new Map<string, FlowVoicingResult | null>()
    const anchor = centerVoicing?.voicing.baseFret ?? 5
    for (const b of branches) {
      const sym = capo > 0 ? b.node.capoSymbol : b.node.symbol
      map.set(b.node.id, voicingForFlowChord(sym, inst, voicingStyle, anchor))
    }
    return map
  }, [branches, capo, inst, voicingStyle, centerVoicing])

  const playVoicingOrSymbol = useCallback((symbol: string, res?: FlowVoicingResult | null) => {
    const ctx = audio()
    void ctx.resume()
    const midis = res?.voicing.midi?.length ? res.voicing.midi : chordToMidis(symbol)
    strum(midis, ctx.currentTime + 0.015, { gain: 0.74, spread: 0.02 })
  }, [])

  // Start a Pathfinder challenge cleanly
  const startChallenge = useCallback((ch: PathfinderChallenge, isCustom = false) => {
    setCustomChallenge(isCustom ? ch : null)
    setMode('pathfinder')
    setMinor(ch.minor)
    setSpice(ch.spice)
    setNodeId(ch.startId)
    setPfSteps(0)
    setPfUsedFlavor(new Set())
    setPfStatus('active')
    const startRes = getFlowNodes(tonic, ch.minor, capo).find(n => n.id === ch.startId)
    setTrail(startRes ? [startRes.symbol] : [])
    setStatusMsg(`Pathfinder: ${ch.title} — ${ch.hint}`)
  }, [tonic, capo, setMinor, setSpice])

  // Advance graph to a chosen destination branch
  const advanceTo = useCallback((branch: ResolvedFlowBranch, viaMic = false) => {
    const nextSym = branch.node.symbol
    setNodeId(branch.node.id)
    setHoveredBranchId(null)
    setTrail(prev => [...prev, nextSym].slice(-12))

    // Audio feedback or Endless Flow Jam seamless transition
    const st = strumMachine.getState()
    if (st.playing && st.flowMode) {
      strumMachine.queueFlowChord(nextSym, jamTiming === 'instant')
      setStatusMsg(
        jamTiming === 'instant'
          ? `${viaMic ? '🎤 Matched' : 'Moved to'} ${nextSym} (${branch.node.roman}) — band switched immediately!`
          : `${viaMic ? '🎤 Matched' : 'Queued'} ${nextSym} (${branch.node.roman}) — band switches on Beat 1.`,
      )
    } else if (!viaMic) {
      playVoicingOrSymbol(nextSym, branchVoicings.get(branch.node.id))
      setStatusMsg(`${centerNode.symbol} → ${nextSym} (${branch.node.roman}): ${branch.whisper}`)
    } else {
      setStatusMsg(`🎤 Heard ${nextSym} (${branch.node.roman})! ${branch.whisper}`)
    }

    // Pathfinder evaluation
    if (mode === 'pathfinder' && activeChallenge && pfStatus === 'active') {
      const nextStepCount = pfSteps + 1
      const nextFlavors = new Set(pfUsedFlavor)
      nextFlavors.add(branch.flavor)
      setPfSteps(nextStepCount)
      setPfUsedFlavor(nextFlavors)

      const hitGoal = branch.node.id === activeChallenge.goalId
      const metFlavor = !activeChallenge.requireFlavor || nextFlavors.has(activeChallenge.requireFlavor)
      if (hitGoal && nextStepCount <= activeChallenge.maxSteps && metFlavor) {
        setPfStatus('won')
        setStatusMsg(`🎉 Challenge Cleared in ${nextStepCount} step${nextStepCount === 1 ? '' : 's'}!`)
      } else if (nextStepCount >= activeChallenge.maxSteps && !hitGoal) {
        setPfStatus('over')
        setStatusMsg(`Out of steps (${activeChallenge.maxSteps}) — tap Retry to try another path!`)
      }
    }
  }, [centerNode.symbol, jamTiming, mode, activeChallenge, pfStatus, pfSteps, pfUsedFlavor, branchVoicings, playVoicingOrSymbol])

  // Keep latest center + branches + advanceTo in refs for ChromaListener callback
  const centerRef = useRef(centerNode)
  centerRef.current = centerNode
  const branchesRef = useRef(branches)
  branchesRef.current = branches
  const advanceRef = useRef(advanceTo)
  advanceRef.current = advanceTo

  const stopListening = useCallback(() => {
    listenerRef.current?.stop()
    listenerRef.current = null
    setListening(false)
    setMicLevel(0)
    setLockProgress(null)
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
  }, [])

  useEffect(() => () => stopListening(), [stopListening])

  const toggleListening = async () => {
    if (listening) {
      stopListening()
      setDetectHint('')
      return
    }
    setMicErr('')
    try {
      const cl = new ChromaListener()
      cl.onLevel = lvl => setMicLevel(Math.min(1, lvl * 10))
      cl.onChord = (chroma, bass) => {
        // Post-advance cooldown so ringing decay from the chord you just moved to never double-triggers!
        if (performance.now() < cooldownUntilRef.current) return
        const cur = centerRef.current
        const cands = branchesRef.current.map(b => ({
          id: b.node.id,
          symbol: b.node.symbol,
          rootPc: b.node.rootPc,
          qual: b.node.qual,
        }))
        const res = detectFlowChord(
          chroma,
          bass,
          { id: cur.id, symbol: cur.symbol, rootPc: cur.rootPc, qual: cur.qual },
          cands,
          true,
        )
        if (res.status === 'single-note') {
          setDetectHint(`Heard single note ${res.noteName} — strum a full chord (3+ strings) clearly.`)
          return
        }
        if (res.status === 'holding') {
          setDetectHint(`Holding ${res.symbol} (${Math.round(res.score * 100)}%) — strum one of the orbiting chords to move.`)
          return
        }
        if (res.status === 'other') {
          setDetectHint(`Heard ${res.symbol} — not one of the orbiting choices (staying on ${cur.symbol}).`)
          return
        }
        if (res.status !== 'branch') {
          setDetectHint(`Unclear strum — let one of the orbiting chords ring cleanly…`)
          return
        }
        const matchedBranch = branchesRef.current.find(b => b.node.id === res.id)
        if (!matchedBranch) return
        cooldownUntilRef.current = performance.now() + 1200
        setLockProgress({ id: res.id, pct: 100 })
        setDetectHint(`Matched ${matchedBranch.node.symbol} (${matchedBranch.node.roman}) · ${Math.round(res.score * 100)}%`)
        if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
        lockTimerRef.current = setTimeout(() => {
          setLockProgress(null)
          advanceRef.current(matchedBranch, true)
        }, 240)
      }
      await cl.start()
      listenerRef.current = cl
      setListening(true)
      setDetectHint('Listening (strict full-chord mode) — strum any orbiting chord cleanly to advance!')
    } catch (err) {
      setMicErr(err instanceof Error ? err.message : 'Microphone unavailable — check browser/app permission.')
      setListening(false)
    }
  }

  const toggleFlowJam = () => {
    if (strumState.playing && strumState.flowMode) {
      strumMachine.stop()
      strumMachine.exitFlowMode()
    } else {
      strumMachine.startFlowJam(centerNode.symbol, { style: jamStyle, capo })
    }
  }

  const handleOpenTrailInStrum = () => {
    const chords = trail.length >= 2 ? trail : [centerNode.symbol, branches[0]?.node.symbol ?? centerNode.symbol]
    const chart: StrumChart = {
      id: `flow-${Date.now()}`,
      name: `Flow Jam (${tonic}${minor ? 'm' : ''})`,
      tonic,
      minor,
      capo,
      bpm: strumState.bpm,
      style: jamStyle,
      bars: chords.map((c, idx) => ({ chords: [c], section: idx === 0 ? 'Flow Path' : undefined })),
    }
    openStrumGrid({ chart, autoPlay: true })
  }

  const handleSaveToSongbook = async () => {
    const chords = trail.length >= 2 ? trail : [centerNode.symbol, branches[0]?.node.symbol ?? centerNode.symbol]
    const doc = buildSongDocFromTrail(chords, tonic, minor, strumState.bpm, capo, inst.midis, inst)
    await saveSong(doc)
    setStatusMsg(`Saved "${doc.title}" to My Songs — opening in Play!`)
    openInPlay(doc)
  }

  // Radial SVG Geometry: spacious zero-collision canvas when mini wheel diagrams are shown!
  const cx = showWheelDiagrams ? 320 : 220
  const cy = showWheelDiagrams ? 245 : 180
  const orbitR = showWheelDiagrams ? 132 : 128
  const svgViewBox = showWheelDiagrams ? '54 52 532 372' : '0 0 440 360'
  const positionedBranches = useMemo(() => {
    const count = Math.max(1, branches.length)
    return branches.map((b, idx) => {
      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / count
      const x = cx + Math.cos(angle) * orbitR
      const y = cy + Math.sin(angle) * orbitR
      const midX = (cx + x) / 2 + Math.cos(angle + Math.PI / 2) * 14
      const midY = (cy + y) / 2 + Math.sin(angle + Math.PI / 2) * 14
      // Place mini finger diagram cleanly outside left/right of its circle so all 5 never collide!
      const diagDx = Math.cos(angle) < -0.15 ? -63 : 63
      const diagDy = idx === 0 ? -4 : 0
      return { branch: b, x, y, midX, midY, diagX: x + diagDx, diagY: y + diagDy }
    })
  }, [branches, cx, cy, orbitR])

  const previewVoicing = useMemo(
    () => branchVoicings.get(previewNode.id) ?? voicingForFlowChord(capo > 0 ? previewNode.capoSymbol : previewNode.symbol, inst, voicingStyle, 5),
    [branchVoicings, previewNode, capo, inst, voicingStyle],
  )
  const previewShape = previewVoicing?.voicing ?? null
  const centerShape = centerVoicing?.voicing ?? null

  const isFlowJamOn = strumState.playing && strumState.flowMode
  const goalNode = activeChallenge ? allNodes.find(n => n.id === activeChallenge.goalId) ?? null : null

  return (
    <div className="flow-coach stack" style={{ gap: 12 }} data-testid="harmonic-flow-coach">
      {/* 4-Tool Songwriter Switcher */}
      <div className="seg flow-hub-tabs" role="tablist" aria-label="Harmony tools">
        {([
          ['path', 'Chord Path'],
          ['vibe', 'Chord Vibe Sets'],
          ['shift', 'Key Shifter'],
          ['detect', 'Detect Scale'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={hubView === id}
            onClick={() => setHubView(id)}
            data-testid={`flow-hub-${id}`}
          >
            {label}
          </button>
        ))}
      </div>

      {hubView === 'vibe' && <ChordVibeSetsView tonic={tonic} onTonic={setTonic} />}
      {hubView === 'shift' && <KeyShifterView initialTonic={tonic} initialMinor={minor} />}
      {hubView === 'detect' && <DetectScaleView onPickVibe={k => { setTonic(k); setHubView('vibe') }} />}

      {hubView === 'path' && (
      <>
      {/* Top Controls Bar */}
      <div className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Chord Path</h2>
            <p className="small muted" style={{ margin: '2px 0 0' }}>
              Tap or strum any orbiting chord to flow smoothly through the key. Roman numerals stay locked when you transpose.
            </p>
          </div>
          <div className="seg" role="group" aria-label="Flow mode">
            <button
              aria-pressed={mode === 'free'}
              onClick={() => { setMode('free'); setCustomChallenge(null); setPfStatus('active') }}
              data-testid="flow-mode-free"
            >
              Free Flow
            </button>
            <button
              aria-pressed={mode === 'pathfinder'}
              onClick={() => startChallenge(PATHFINDER_CHALLENGES[challengeIdx] ?? PATHFINDER_CHALLENGES[0])}
              data-testid="flow-mode-pathfinder"
            >
              🎯 Pathfinder
            </button>
          </div>
        </div>

        {/* Key / Quality / Capo / Spice */}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="field" style={{ minWidth: 96 }}>
            <span>Key</span>
            <select
              className="select"
              value={tonic}
              onChange={e => { setTonic(e.target.value); setTrail([]) }}
              aria-label="Key root"
              data-testid="flow-key-select"
            >
              {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <div className="seg" role="group" aria-label="Key quality">
            <button
              aria-pressed={!minor}
              onClick={() => { setMinor(false); setNodeId('I'); setTrail([]) }}
              data-testid="flow-major-btn"
            >
              Major
            </button>
            <button
              aria-pressed={minor}
              onClick={() => { setMinor(true); setNodeId('i'); setTrail([]) }}
              data-testid="flow-minor-btn"
            >
              Minor
            </button>
          </div>
          <label className="field" style={{ minWidth: 105 }}>
            <span>Capo</span>
            <select
              className="select"
              value={capo}
              onChange={e => setCapo(Number(e.target.value))}
              aria-label="Capo fret"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7].map(c => (
                <option key={c} value={c}>{c === 0 ? 'No Capo' : `Capo ${c}`}</option>
              ))}
            </select>
          </label>
          <div className="seg" role="group" aria-label="Harmonic spice">
            {SPICE_OPTIONS.map(s => (
              <button
                key={s.id}
                aria-pressed={effectiveSpice === s.id}
                disabled={mode === 'pathfinder'}
                onClick={() => setSpice(s.id)}
                data-testid={`flow-spice-${s.id}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Endless Flow Jam + Live Mic Auto-Advance Controls */}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className={`btn sm${isFlowJamOn ? ' primary' : ''}`}
            onClick={toggleFlowJam}
            data-testid="flow-jam-toggle"
          >
            <Ico n={isFlowJamOn ? 'stop' : 'play'} /> {isFlowJamOn ? 'Stop Flow Jam' : 'Endless Flow Jam'}
          </button>
          <select
            className="select"
            style={{ width: 'auto', minWidth: 150 }}
            value={jamStyle}
            onChange={e => {
              const s = e.target.value as StrumStyleId
              setJamStyle(s)
              if (isFlowJamOn) strumMachine.setStyle(s)
            }}
            aria-label="Flow Jam backing style"
          >
            {STRUM_STYLES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <div className="seg" role="group" aria-label="Chord change timing">
            <button aria-pressed={jamTiming === 'beat1'} onClick={() => setJamTiming('beat1')}>Beat 1</button>
            <button aria-pressed={jamTiming === 'instant'} onClick={() => setJamTiming('instant')}>Instant</button>
          </div>
          <button
            className={`btn sm${listening ? ' primary' : ''}`}
            onClick={() => void toggleListening()}
            data-testid="flow-mic-toggle"
            title="Strum any highlighted chord into your mic or USB interface to auto-advance the map"
          >
            🎤 {listening ? 'Listening…' : 'Listen & Auto-Advance'}
          </button>
          {listening && (
            <span className="flow-mic-meter" aria-hidden="true">
              <span style={{ width: `${Math.round(micLevel * 100)}%` }} />
            </span>
          )}
        </div>

        {micErr && <p className="small" style={{ color: 'var(--warn)', margin: 0 }}>{micErr}</p>}
        {listening && detectHint && <p className="small muted" style={{ margin: 0 }}>{detectHint}</p>}
      </div>

      {/* Pathfinder Challenge Banner */}
      {mode === 'pathfinder' && activeChallenge && (
        <div className={`panel flow-pathfinder-banner${pfStatus === 'won' ? ' won' : pfStatus === 'over' ? ' over' : ''}`} data-testid="pathfinder-banner">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <span className="badge">{activeChallenge.level}</span>
                <strong>🎯 {activeChallenge.title}</strong>
                {goalNode && (
                  <span className="small">
                    Goal: <b>{goalNode.symbol}</b> ({goalNode.roman})
                  </span>
                )}
              </div>
              <p className="small muted" style={{ margin: '4px 0 0' }}>{activeChallenge.hint}</p>
            </div>
            <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge" data-testid="pathfinder-steps">
                Steps: {pfSteps} / {activeChallenge.maxSteps}
              </span>
              <button className="btn sm" onClick={() => startChallenge(activeChallenge, !!customChallenge)}>
                Retry
              </button>
              <button
                className="btn sm"
                onClick={() => {
                  const next = (challengeIdx + 1) % PATHFINDER_CHALLENGES.length
                  setChallengeIdx(next)
                  startChallenge(PATHFINDER_CHALLENGES[next])
                }}
              >
                Next →
              </button>
              <button
                className="btn sm"
                onClick={() => startChallenge(randomPathfinderGoal(spice, minor), true)}
              >
                🎲 Random Goal
              </button>
            </div>
          </div>
          {pfStatus === 'won' && (
            <div className="small" style={{ marginTop: 6, color: '#34d399', fontWeight: 600 }}>
              ✨ Path unlocked! Try another route or send your breadcrumb trail straight to Strum Grid.
            </div>
          )}
        </div>
      )}

      {/* Main Split: Dual-Labeled SVG Radial Chord Tree + Fretboard / Voice-Leading Preview */}
      <div className="flow-main-grid">
        {/* Radial SVG Harmony Map */}
        <div className="panel flow-graph-panel">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
            <div className="row" style={{ gap: 10, fontSize: '0.78rem' }}>
              <span style={{ color: FLAVOR_META.diatonic.color }}>● Diatonic</span>
              <span style={{ color: FLAVOR_META.pull.color }}>● Pull (V/x)</span>
              <span style={{ color: FLAVOR_META.color.color }}>● Color (Borrowed)</span>
            </div>
            <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className={`btn sm${showWheelDiagrams ? ' on' : ''}`}
                aria-pressed={showWheelDiagrams}
                onClick={() => setShowWheelDiagrams(!showWheelDiagrams)}
                data-testid="flow-wheel-diagrams-toggle"
                title="Show or hide tiny finger diagrams next to every orbiting chord on the wheel"
              >
                🎸 {showWheelDiagrams ? 'Grips ON' : 'Grips OFF'}
              </button>
              {isFlowJamOn && (
                <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent)' }}>
                  {strumState.queuedFlowChord
                    ? `Next on Beat 1: ${strumState.queuedFlowChord}`
                    : `Looping ${strumState.currentChord} · Beat ${strumState.beat + 1}`}
                </span>
              )}
            </div>
          </div>

          {/* Voicing Switcher: Open / Barre / 3-String Triads (Top 3, Mid 3, Low 3) */}
          <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
            <span className="small muted">Shape:</span>
            <div className="seg" role="group" aria-label="Chord voicing style" style={{ flexWrap: 'wrap' }}>
              {FLOW_VOICING_STYLES.map(vs => (
                <button
                  key={vs.id}
                  aria-pressed={voicingStyle === vs.id}
                  onClick={() => setVoicingStyle(vs.id)}
                  title={vs.hint}
                  data-testid={`flow-voicing-${vs.id}`}
                >
                  {vs.short}
                </button>
              ))}
            </div>
          </div>

          <svg
            className="flow-svg"
            viewBox={svgViewBox}
            role="img"
            aria-label={`Harmonic flow map centered on ${centerNode.symbol} (${centerNode.roman}) in ${tonic} ${minor ? 'minor' : 'major'}`}
            data-testid="flow-svg"
          >
            {/* Subtle radial orbit guide */}
            <circle cx={cx} cy={cy} r={orbitR} fill="none" stroke="var(--line)" strokeDasharray="4 6" opacity={0.45} />

            {/* Curved color-coded edges */}
            {positionedBranches.map(({ branch, x, y, midX, midY }) => {
              const fm = FLAVOR_META[branch.flavor]
              const isHover = hoveredBranchId === branch.node.id
              return (
                <path
                  key={`edge-${branch.node.id}`}
                  d={`M ${cx} ${cy} Q ${midX} ${midY} ${x} ${y}`}
                  fill="none"
                  stroke={fm.stroke}
                  strokeWidth={isHover ? 3.4 : 2.1}
                  strokeDasharray={branch.flavor === 'color' ? '5 4' : undefined}
                  opacity={isHover ? 1 : 0.72}
                />
              )
            })}

            {/* Orbiting Destination Nodes (Dual-Labeled + Optional Tiny Finger Diagram right beside each!) */}
            {positionedBranches.map(({ branch, x, y, diagX, diagY }) => {
              const fm = FLAVOR_META[branch.flavor]
              const isHover = hoveredBranchId === branch.node.id
              const isGoal = mode === 'pathfinder' && activeChallenge?.goalId === branch.node.id
              const isQueued = isFlowJamOn && strumState.queuedFlowChord === branch.node.symbol
              const isLocking = lockProgress?.id === branch.node.id
              const displaySym = capo > 0 ? branch.node.capoSymbol : branch.node.symbol
              const bVoicing = branchVoicings.get(branch.node.id)
              return (
                <g key={branch.node.id}>
                  <g
                    className="flow-node branch"
                    transform={`translate(${x}, ${y})`}
                    onMouseEnter={() => setHoveredBranchId(branch.node.id)}
                    onMouseLeave={() => setHoveredBranchId(null)}
                    onClick={() => advanceTo(branch)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Move to ${branch.node.symbol}, Roman numeral ${branch.node.roman}, ${branch.whisper}`}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advanceTo(branch) } }}
                    data-testid={`flow-branch-${branch.node.id}`}
                    style={{ cursor: 'pointer' }}
                  >
                    {(isGoal || isQueued || isLocking) && (
                      <circle
                        r={40}
                        fill="none"
                        stroke={isLocking ? '#34d399' : isGoal ? '#f59e0b' : fm.color}
                        strokeWidth={3}
                        strokeDasharray={isGoal ? '6 3' : undefined}
                        opacity={0.9}
                      />
                    )}
                    <circle
                      r={isHover ? 34 : 31}
                      fill="var(--card-2, #1b1e28)"
                      stroke={fm.color}
                      strokeWidth={isHover ? 3 : 2}
                    />
                    {/* Prominent Chord Symbol */}
                    <text
                      y={-2}
                      textAnchor="middle"
                      fill="var(--ink, #f4f1ea)"
                      fontSize={displaySym.length > 4 ? 14 : 17}
                      fontWeight={800}
                      data-testid={`flow-node-symbol-${branch.node.id}`}
                    >
                      {displaySym}
                    </text>
                    {/* Locked Roman Numeral Pill Badge */}
                    <rect
                      x={-22}
                      y={8}
                      width={44}
                      height={16}
                      rx={8}
                      fill={fm.color}
                      fillOpacity={0.2}
                      stroke={fm.color}
                      strokeOpacity={0.55}
                      strokeWidth={0.9}
                    />
                    <text
                      y={19.5}
                      textAnchor="middle"
                      fill={fm.color}
                      fontSize={10.5}
                      fontWeight={700}
                      data-testid={`flow-node-roman-${branch.node.id}`}
                    >
                      {branch.node.roman}
                    </text>
                    {isGoal && (
                      <text y={-37} textAnchor="middle" fontSize={12} fill="#f59e0b" fontWeight={700}>
                        ★ GOAL
                      </text>
                    )}
                  </g>
                  {showWheelDiagrams && bVoicing && (
                    <MiniWheelDiagram x={diagX} y={diagY} res={bVoicing} accentColor={fm.color} />
                  )}
                </g>
              )
            })}

            {/* Center Active Node (Dual-Labeled) */}
            <g
              className="flow-node center"
              transform={`translate(${cx}, ${cy})`}
              onClick={() => playVoicingOrSymbol(centerNode.symbol, centerVoicing)}
              role="button"
              tabIndex={0}
              aria-label={`Current chord ${centerNode.symbol} (${centerNode.roman}). Tap to hear.`}
              data-testid="flow-center-node"
              style={{ cursor: 'pointer' }}
            >
              <circle
                r={isFlowJamOn && strumState.beat === 0 ? 52 : 48}
                fill="var(--accent, #e5a93c)"
                fillOpacity={0.14}
              />
              <circle
                r={43}
                fill="var(--card, #141720)"
                stroke="var(--accent, #e5a93c)"
                strokeWidth={3.2}
              />
              <text
                y={-2}
                textAnchor="middle"
                fill="var(--ink, #f4f1ea)"
                fontSize={centerNode.symbol.length > 4 ? 18 : 22}
                fontWeight={800}
                data-testid="flow-center-symbol"
              >
                {capo > 0 ? centerNode.capoSymbol : centerNode.symbol}
              </text>
              <rect
                x={-26}
                y={10}
                width={52}
                height={18}
                rx={9}
                fill="var(--accent, #e5a93c)"
              />
              <text
                y={22.5}
                textAnchor="middle"
                fill="#111"
                fontSize={11.5}
                fontWeight={800}
                data-testid="flow-center-roman"
              >
                {centerNode.roman}
              </text>
              {capo > 0 && (
                <text y={-49} textAnchor="middle" fill="var(--muted)" fontSize={10}>
                  Sounds {centerNode.symbol} (Capo {capo})
                </text>
              )}
            </g>
          </svg>

          {/* 1-Line Theory Whisper */}
          <div className="flow-whisper" role="status" data-testid="flow-whisper">
            {previewBranch ? (
              <>
                <span style={{ color: FLAVOR_META[previewBranch.flavor].color, fontWeight: 700 }}>
                  {centerNode.symbol} → {previewBranch.node.symbol} ({previewBranch.node.roman}):
                </span>{' '}
                <span>{previewBranch.whisper}</span>
              </>
            ) : (
              <span>{centerNode.note}</span>
            )}
          </div>
          {statusMsg && <p className="small muted" style={{ margin: '6px 0 0' }}>{statusMsg}</p>}
        </div>

        {/* Right Side: Live Chord Grips + Voice-Leading Neck Preview */}
        <div className="panel stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <strong style={{ fontSize: '0.95rem' }}>
              Fretboard Grip ({FLOW_VOICING_STYLES.find(v => v.id === voicingStyle)?.short}): {centerNode.symbol} → {previewNode.symbol}
            </strong>
            <button className="btn sm" onClick={() => setShowVoiceLead(!showVoiceLead)}>
              {showVoiceLead ? 'Hide Voice-Lead Neck' : 'Show Voice-Lead Neck'}
            </button>
          </div>
          <div className="row" style={{ gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {centerShape && (
              <div className="stack" style={{ alignItems: 'center', gap: 2 }}>
                <span className="small muted">
                  Now ({centerNode.roman}){centerVoicing?.inversion ? ` · ${centerVoicing.inversion} inv` : ''}
                </span>
                <ChordDiagram
                  name={capo > 0 ? centerNode.capoSymbol : centerNode.symbol}
                  voicing={centerShape}
                  active
                  size={0.85}
                  onClick={() => playVoicingOrSymbol(centerNode.symbol, centerVoicing)}
                />
              </div>
            )}
            {previewShape && previewNode.id !== centerNode.id && (
              <div className="stack" style={{ alignItems: 'center', gap: 2 }}>
                <span className="small muted">
                  Next ({previewNode.roman}){previewVoicing?.inversion ? ` · ${previewVoicing.inversion} inv` : ''}
                </span>
                <ChordDiagram
                  name={capo > 0 ? previewNode.capoSymbol : previewNode.symbol}
                  voicing={previewShape}
                  size={0.85}
                  onClick={() => playVoicingOrSymbol(previewNode.symbol, previewVoicing)}
                />
              </div>
            )}
          </div>

          {showVoiceLead && previewNode.symbol !== centerNode.symbol && (
            <VoiceLeadNeck
              chords={[centerNode.symbol, previewNode.symbol]}
              at={0}
              tuning={inst.midis}
              where="flow"
              flats={flats}
              compact
              steppable={false}
              bpm={strumState.bpm}
            />
          )}
        </div>
      </div>

      {/* Breadcrumb Ribbon & Interconnected Launchers */}
      <div className="panel stack" style={{ gap: 8 }} data-testid="flow-breadcrumb-panel">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <strong style={{ fontSize: '0.9rem' }}>Your Harmonic Trail</strong>
          <div className="row" style={{ gap: 6 }}>
            <button
              className="btn sm"
              disabled={trail.length <= 1}
              onClick={() => setTrail(t => t.slice(0, -1))}
            >
              Undo
            </button>
            <button
              className="btn sm"
              onClick={() => { setNodeId(minor ? 'i' : 'I'); setTrail([allNodes[0]?.symbol ?? tonic]) }}
            >
              Reset
            </button>
          </div>
        </div>
        <div className="flow-trail" data-testid="flow-trail">
          {trail.map((sym, idx) => (
            <span key={`${sym}-${idx}`} className="flow-trail-chip">
              {idx > 0 && <span className="muted" style={{ marginRight: 4 }}>→</span>}
              <button
                className="btn sm"
                onClick={() => {
                  const ctx = audio(); void ctx.resume()
                  strum(chordToMidis(sym), ctx.currentTime + 0.015)
                }}
              >
                {sym}
              </button>
            </span>
          ))}
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn sm primary" onClick={handleOpenTrailInStrum} data-testid="flow-open-strum">
            🎸 Open in Strum Machine
          </button>
          <button
            className="btn sm"
            onClick={() => {
              const chords = trail.length >= 2 ? trail : [centerNode.symbol, branches[0]?.node.symbol ?? centerNode.symbol]
              const chart: StrumChart = {
                id: `flow-${Date.now()}`,
                name: `Chord Path (${tonic}${minor ? 'm' : ''})`,
                tonic,
                minor,
                capo,
                bpm: strumState.bpm,
                style: jamStyle,
                bars: chords.map(c => ({ chords: [c] })),
              }
              downloadMidiFile(exportStrumChartToMidi(chart), `chord_path_${tonic}`)
            }}
            data-testid="flow-export-midi"
          >
            🎹 Export .mid
          </button>
          <button className="btn sm" onClick={() => openLicksInKey(tonic, minor)} data-testid="flow-open-licks">
            ⚡ Licks in {tonic}{minor ? 'm' : ''}
          </button>
          <button className="btn sm" onClick={() => void handleSaveToSongbook()} data-testid="flow-save-song">
            📄 Save & Open in Play
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  )
}

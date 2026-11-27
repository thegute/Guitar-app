// Strum Grid ("Strum Machine" for KGuitar): 4-bars-per-row interactive chord chart player & editor.
// Plays 18 ultra-realistic styles (Acoustic/Bluegrass, Reggae One-Drop Skank, Metal Chugs/Gallop/Djent,
// Layered VSCO 2 Orchestral Strings, Rhodes, Hammond B3, Funk, Ambient) persistently across all screens.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChromaListener } from '../audio/chroma'
import {
  STRUM_MOTIONS,
  bassVoiceOptions,
  chartSections,
  chordVoiceOptions,
  drumKitOptions,
  keysVoiceOptions,
  strumMachine,
  useStrumState,
  type BassVoiceId,
  type ChordVoiceId,
  type DrumKitOverride,
  type KeysVoiceId,
  type StrumMotionId,
} from '../audio/strumMachine'
import { downloadMidiFile, exportStrumChartToMidi, importMidiToStrumChart } from '../audio/midiChords'
import { Ico } from './Icon'
import { ChordGripsBar, MiniChordGrip } from './MiniChordGrip'
import { useChordGrips } from '../chordGrips'
import { useInstrument } from '../instrument'
import {
  openFloatTab,
  openFlowCoach,
  openImprovGym,
  openInPlay,
  openJam,
  openLicksInKey,
  openSing,
  openStrumGrid,
  onOpenStrum,
  takePendingStrum,
} from '../nav'
import { InYourCourses } from '../lessons/InYourCourses'
import { BackingVolumeBar } from '../jam/BackingVolumeBar'
import { AIPromptComposer, AIStyleDropdown, RoleShapeStrip } from '../jam/AIStyleDropdown'
import {
  buildBandFromChords,
  composeAIStrumChart,
  type ComposeRequest,
  type JamRole,
  type SongShape,
} from '../jam/aiComposer'
import { newId, saveSong, type SongDoc } from '../tabs/library'
import type { Song } from '../tabs/model'
import { KEYS, keyPrefersFlats, pc } from '../theory/notes'
import { shapesFor } from '../theory/shapes'
import {
  BUILTIN_STRUM_CHARTS,
  STRUM_STYLES,
  deleteUserStrumChart,
  flowNodeForChordSymbol,
  getFlowBranches,
  loadUserStrumCharts,
  detectFlowChord,
  parseChordQual,
  saveUserStrumChart,
  strumStyleMeta,
  transposeChordSymbol,
  transposeStrumChart,
  type ChordQual,
  type ResolvedFlowNode,
  type StrumBar,
  type StrumChart,
  type StrumStyleId,
} from '../theory/harmonicFlow'

const STYLE_GROUPS = ['Acoustic', 'Reggae & Groove', 'Rock & Metal', 'Orchestra & Keys'] as const
const QUICK_QUALS: { id: ChordQual; label: string }[] = [
  { id: '', label: 'Maj' },
  { id: 'm', label: 'm' },
  { id: '5', label: '5' },
  { id: '7', label: '7' },
  { id: 'm7', label: 'm7' },
  { id: 'maj7', label: 'maj7' },
  { id: 'sus4', label: 'sus4' },
  { id: 'add9', label: 'add9' },
  { id: 'dim', label: 'dim' },
]

function groupOptions<T extends { group: string }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>()
  for (const it of items) {
    const arr = map.get(it.group) ?? []
    arr.push(it)
    map.set(it.group, arr)
  }
  return [...map.entries()]
}

function chartToSongDoc(chart: StrumChart, bpm: number, capo: number, tuning: number[], inst: ReturnType<typeof useInstrument>): SongDoc {
  const bars = chart.bars.map(bar => {
    const segDur = bar.chords.length > 1 ? 2 : 4
    const steps = bar.chords.map(sym => {
      const m = sym.trim().match(/^([A-G][#b]?)(.*)$/)
      const parsed = parseChordQual(sym)
      const qual = parsed?.qual ?? ''
      const type = qual === '' ? '' : qual === 'm' ? 'm' : qual
      const shape = m ? shapesFor({ root: m[1], type }, inst)[0] : null
      const notes = shape
        ? shape.frets
            .map((fret, string) => (fret >= 0 ? { string, fret, midi: (tuning[string] ?? 40) + fret } : null))
            .filter((x): x is { string: number; fret: number; midi: number } => !!x)
        : [{ string: 0, fret: 0, midi: tuning[0] ?? 40 }]
      return { dur: segDur, chord: sym, notes }
    })
    return { steps }
  })
  const song: Song = {
    title: `${chart.name} (Strum Grid)`,
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

export function StrumGrid({ compact = false }: { compact?: boolean }) {
  const inst = useInstrument()
  const st = useStrumState()
  const { show: showGrips } = useChordGrips()

  const [userCharts, setUserCharts] = useState<StrumChart[]>(() => loadUserStrumCharts())
  const [editing, setEditing] = useState<{ barIdx: number; splitIdx: number } | null>(null)
  const [bandOpen, setBandOpen] = useState(!compact)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiStyleId, setAiStyleId] = useState('classic-rock')
  const [songShape, setSongShape] = useState<SongShape>('song')
  const [role, setRole] = useState<JamRole>(() => (st.mutes.chords ? (st.mutes.keys ? 'drums' : 'rhythm') : 'lead'))
  const [aiSeed, setAiSeed] = useState(1)
  const [soloHint, setSoloHint] = useState('')
  const [saveName, setSaveName] = useState('')
  const [msg, setMsg] = useState('')
  const midiInputRef = useRef<HTMLInputElement>(null)
  const mixerRef = useRef<HTMLDivElement>(null)
  const barsPanelRef = useRef<HTMLDivElement>(null)

  // Optional Listen & Grade chord accuracy per bar
  const [grading, setGrading] = useState(false)
  const [barHits, setBarHits] = useState<Record<number, 'hit' | 'miss'>>({})
  const [gradeStats, setGradeStats] = useState({ hits: 0, total: 0 })
  const listenerRef = useRef<ChromaListener | null>(null)
  const stRef = useRef(st)
  stRef.current = st

  const applyAIRequest = useCallback((req: ComposeRequest) => {
    const res = composeAIStrumChart(req)
    strumMachine.setChart(res.chart, { autoPlay: stRef.current.playing })
    // Map keysInst to StrumMachine's companion KeysVoiceId
    const kvMap: Record<string, KeysVoiceId> = {
      juno: 'juno', prophet: 'prophet', lofikeys: 'lofikeys', wurli: 'wurli', fmglass: 'fmglass',
      shimmer: 'shimmer', moogpoly: 'moogpoly', clavinet: 'clavinet', epiano: 'rhodes', organ: 'organ',
      grand: 'grand', strings: 'strings', warmpad: 'warmpad', ambient: 'ambient',
    }
    const kv = kvMap[res.keysInst]
    if (kv) strumMachine.setKeysVoice(kv)
    if (res.bassInst === 'moogbass' || res.bassInst === 'reesebass' || res.bassInst === 'synthbass' || res.bassInst === 'sub808' || res.bassInst === 'upbass') {
      strumMachine.setBassVoice(res.bassInst)
    }
    if (req.role) {
      setRole(req.role)
      strumMachine.applyRole(req.role)
    }
    setAiStyleId(res.style.id)
    if (req.songShape) setSongShape(req.songShape)
    setSoloHint(res.soloScale.label)
    setEditing(null)
    setBarHits({})
    setMsg(res.summary)
  }, [])

  // Handle incoming deep-links from Play, Scales, Flow Coach, Band Jam
  const applyOpen = useCallback((opts: ReturnType<typeof takePendingStrum>) => {
    if (!opts) return
    if (opts.chart) {
      strumMachine.setChart(opts.chart, { autoPlay: opts.autoPlay })
      setMsg(`Loaded "${opts.chart.name}"`)
    } else if (opts.autoPlay && !strumMachine.getState().playing) {
      strumMachine.start()
    }
  }, [])

  useEffect(() => {
    applyOpen(takePendingStrum())
    return onOpenStrum(applyOpen)
  }, [applyOpen])

  const stopGrading = useCallback(() => {
    listenerRef.current?.stop()
    listenerRef.current = null
    setGrading(false)
  }, [])

  useEffect(() => () => stopGrading(), [stopGrading])

  const toggleGrading = async () => {
    if (grading) {
      stopGrading()
      return
    }
    try {
      const cl = new ChromaListener()
      cl.onChord = (chroma, bass) => {
        const cur = stRef.current
        const targetSym = cur.soundingChord || cur.currentChord
        const parsed = parseChordQual(targetSym)
        if (!parsed) return
        const res = detectFlowChord(
          chroma,
          bass,
          { id: 'target', symbol: targetSym, rootPc: parsed.rootPc, qual: parsed.qual },
          [],
          true,
        )
        const ok = res.status === 'holding'
        setBarHits(prev => ({ ...prev, [cur.barIdx]: ok ? 'hit' : 'miss' }))
        setGradeStats(g => ({ hits: g.hits + (ok ? 1 : 0), total: g.total + 1 }))
      }
      await cl.start()
      listenerRef.current = cl
      setBarHits({})
      setGradeStats({ hits: 0, total: 0 })
      setGrading(true)
      setMsg('🎤 Listen & Grade active — strum along and bars light green on each chord match!')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Microphone unavailable.')
    }
  }

  const allCharts = useMemo(() => [...userCharts, ...BUILTIN_STRUM_CHARTS], [userCharts])
  const chart = st.chart
  const flats = keyPrefersFlats(chart.tonic, chart.minor)
  const styleMeta = strumStyleMeta(st.style)
  const soundingTonic = st.capo > 0 ? transposeChordSymbol(chart.tonic, st.capo, flats) : chart.tonic

  // Flow suggestions for the currently edited bar (based on previous bar's chord!)
  const flowSuggestions = useMemo(() => {
    if (!editing) return []
    const prevChord =
      editing.splitIdx === 1
        ? chart.bars[editing.barIdx]?.chords[0]
        : editing.barIdx > 0
          ? chart.bars[editing.barIdx - 1]?.chords.slice(-1)[0]
          : chart.tonic + (chart.minor ? 'm' : '')
    const fromId = prevChord ? flowNodeForChordSymbol(prevChord, chart.tonic, chart.minor) : (chart.minor ? 'i' : 'I')
    return getFlowBranches(fromId, chart.tonic, chart.minor, 'pop', 0, 5).branches
  }, [editing, chart])

  const updateBar = (barIdx: number, updater: (b: StrumBar) => StrumBar) => {
    const nextBars = chart.bars.map((b, i) => (i === barIdx ? updater(b) : b))
    strumMachine.updateChartBars(nextBars)
  }

  const setChordAt = (barIdx: number, splitIdx: number, symbol: string) => {
    updateBar(barIdx, b => {
      const next = [...b.chords]
      next[splitIdx] = symbol
      return { ...b, chords: next }
    })
  }

  const toggleSplitBar = (barIdx: number) => {
    updateBar(barIdx, b => {
      if (b.chords.length > 1) return { ...b, chords: [b.chords[0]] }
      const suggest = flowSuggestions[0]?.node.symbol ?? b.chords[0]
      return { ...b, chords: [b.chords[0], suggest] }
    })
  }

  const addBarAfter = (barIdx: number) => {
    const next = [...chart.bars]
    const copyChord = chart.bars[barIdx]?.chords.slice(-1)[0] ?? chart.tonic
    next.splice(barIdx + 1, 0, { chords: [copyChord] })
    strumMachine.updateChartBars(next)
    setEditing({ barIdx: barIdx + 1, splitIdx: 0 })
  }

  const removeBar = (barIdx: number) => {
    if (chart.bars.length <= 1) return
    const next = chart.bars.filter((_, i) => i !== barIdx)
    strumMachine.updateChartBars(next)
    setEditing(null)
  }

  const handleSaveChart = () => {
    const name = saveName.trim() || `${chart.name} (Custom)`
    const saved: StrumChart = {
      ...chart,
      id: `user-${Date.now()}`,
      name,
      bpm: st.bpm,
      capo: st.capo,
      style: st.style,
    }
    setUserCharts(saveUserStrumChart(saved))
    strumMachine.setChart(saved)
    setSaveName('')
    setMsg(`Saved "${name}" to My Charts!`)
  }

  const handleDeleteChart = (id: string) => {
    setUserCharts(deleteUserStrumChart(id))
    setMsg('Deleted saved chart.')
  }

  const handleSaveToSongbook = async () => {
    const doc = chartToSongDoc(chart, st.bpm, st.capo, inst.midis, inst)
    await saveSong(doc)
    setMsg(`Saved "${doc.title}" to My Songs — opening in Play!`)
    openInPlay(doc)
  }

  const chordOpts = groupOptions(chordVoiceOptions())
  const keysOpts = groupOptions(keysVoiceOptions())
  const bassOpts = groupOptions(bassVoiceOptions())
  const drumOpts = groupOptions(drumKitOptions())
  const sections = useMemo(() => chartSections(chart), [chart])

  // Active editor chord parts
  const editSym = editing ? (chart.bars[editing.barIdx]?.chords[editing.splitIdx] ?? chart.tonic) : ''
  const editMatch = editSym.match(/^([A-G][#b]?)(.*)$/)
  const editRoot = editMatch ? editMatch[1] : chart.tonic
  const editQual: ChordQual = parseChordQual(editSym)?.qual ?? ''

  return (
    <div className={`strum-grid-screen stack${compact ? ' compact' : ''}`} style={{ gap: compact ? 8 : 12 }} data-testid="strum-grid-screen">
      {/* 1) Guitarist Stage Header & Transport */}
      <div className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: compact ? '0.98rem' : '1.1rem' }}>AI Strum Machine</h2>
            {!compact && (
              <p className="small muted" style={{ margin: '2px 0 0' }}>
                47 AI styles · Full songs or simple loops · Plays across Tabs, Scales, Chords &amp; Licks.
              </p>
            )}
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {!compact && (
              <button
                className="btn sm"
                onClick={() => openStrumGrid()}
                title="Pop out as a floating opacity-adjustable window"
                data-testid="strum-popout-btn"
              >
                ⧉ Pop Out
              </button>
            )}
            <button
              className={`btn sm${bandOpen ? ' primary' : ''}`}
              aria-expanded={bandOpen}
              onClick={() => {
                const next = !bandOpen
                setBandOpen(next)
                if (next) {
                  requestAnimationFrame(() => mixerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
                }
              }}
              data-testid="strum-band-btn"
            >
              🎛 Band Mixer {bandOpen ? '▴' : '▾'}
            </button>
            <button
              className={`btn sm${toolsOpen || st.speedUp.on || grading ? ' primary' : ''}`}
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen(!toolsOpen)}
              data-testid="strum-tools-btn"
            >
              ⚙ Edit &amp; Tools {toolsOpen ? '▴' : '▾'}
            </button>
          </div>
        </div>

        {/* Expandable Edit & Practice Tools Drawer — opens right under the button so it's always in view! */}
        {toolsOpen && (
          <div
            className="strum-inline-mixer stack"
            style={{ gap: 8, borderLeft: '3px solid var(--accent)' }}
            data-testid="strum-tools-drawer"
          >
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <strong className="small">⚙ Edit Chart &amp; Practice Tools</strong>
              <button className="btn sm ghost" onClick={() => setToolsOpen(false)} aria-label="Close Edit and Tools">
                ✕
              </button>
            </div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className={`btn sm${editing ? ' primary' : ''}`}
                onClick={() => {
                  const targetBar = Math.min(Math.max(0, st.barIdx), Math.max(0, chart.bars.length - 1))
                  setEditing(editing ? null : { barIdx: targetBar, splitIdx: 0 })
                  requestAnimationFrame(() => barsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
                }}
                data-testid="strum-edit-bars-btn"
              >
                ✏ {editing ? 'Close Bar Editor' : `Edit Bar ${(st.barIdx % Math.max(1, chart.bars.length)) + 1}`}
              </button>
              <button
                className="btn sm"
                onClick={() => {
                  const idx = chart.bars.length
                  addBarAfter(chart.bars.length - 1)
                  setEditing({ barIdx: idx, splitIdx: 0 })
                  requestAnimationFrame(() => barsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
                }}
              >
                + Add Bar
              </button>
              <button
                className="btn sm"
                onClick={() => {
                  downloadMidiFile(exportStrumChartToMidi(chart), chart.name || 'strum_machine')
                  setMsg(`Exported "${chart.name}" as .mid!`)
                }}
              >
                🎹 Export .mid
              </button>
              <button className="btn sm" onClick={() => midiInputRef.current?.click()}>
                📂 Import .mid
              </button>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className={`btn sm${st.countIn ? ' primary' : ''}`}
                aria-pressed={st.countIn}
                onClick={() => strumMachine.setCountIn(!st.countIn)}
              >
                Count-in {st.countIn ? 'On' : 'Off'}
              </button>
              <button
                className={`btn sm${grading ? ' primary' : ''}`}
                onClick={() => void toggleGrading()}
                data-testid="strum-grade-btn"
              >
                🎤 {grading ? `Grading (${gradeStats.hits}/${gradeStats.total})` : 'Listen & Grade'}
              </button>
              <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={st.keepAcrossPages}
                  onChange={e => strumMachine.setKeepAcrossPages(e.target.checked)}
                  data-testid="strum-keep-across"
                />
                <span>Keep playing across screens</span>
              </label>
            </div>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="row small" style={{ gap: 6 }}>
                <input
                  type="checkbox"
                  checked={st.speedUp.on}
                  onChange={e => strumMachine.setSpeedUp({ on: e.target.checked })}
                />
                <span>⚡ Auto Speed-Up</span>
              </label>
              <label className="small">
                +{st.speedUp.step} BPM
                <input
                  type="range"
                  min={2}
                  max={15}
                  value={st.speedUp.step}
                  onChange={e => strumMachine.setSpeedUp({ step: Number(e.target.value) })}
                  style={{ width: 70, marginLeft: 6 }}
                />
              </label>
              <label className="small">
                every {st.speedUp.everyLoops} loop{st.speedUp.everyLoops === 1 ? '' : 's'}
                <select
                  className="select sm"
                  style={{ width: 'auto', marginLeft: 6 }}
                  value={st.speedUp.everyLoops}
                  onChange={e => strumMachine.setSpeedUp({ everyLoops: Number(e.target.value) })}
                >
                  {[1, 2, 4].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="small">
                max {st.speedUp.max} BPM
                <input
                  type="range"
                  min={80}
                  max={220}
                  step={5}
                  value={st.speedUp.max}
                  onChange={e => strumMachine.setSpeedUp({ max: Number(e.target.value) })}
                  style={{ width: 80, marginLeft: 6 }}
                />
              </label>
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              Tip: tap any chord box in the chart below to swap its chord, split the bar, or get Harmonic Flow ideas.
            </p>
          </div>
        )}

        {/* One-Hand Stage Transport Cluster: BIG Play + Count-In + Key/Capo + BPM + Speed-Up + 5-Layer Neck */}
        <div className="row strum-stage-bar" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className={`btn primary lg${st.playing ? ' on' : ''}`}
            onClick={() => {
              if (st.flowMode) strumMachine.exitFlowMode()
              strumMachine.toggle()
            }}
            data-testid="strum-play-btn"
          >
            <Ico n={st.playing ? 'stop' : 'play'} />{' '}
            {st.playing ? (st.countInLeft > 0 ? `Count-in ${st.countInLeft}…` : 'Stop') : 'Play'}
          </button>

          <button
            className={`btn sm${st.countIn ? ' on' : ' ghost'}`}
            aria-pressed={st.countIn}
            onClick={() => strumMachine.setCountIn(!st.countIn)}
            title="4-beat count-in before bar 1 so you have time to grab the neck"
            data-testid="strum-countin-quick"
          >
            4-Count {st.countIn ? 'On' : 'Off'}
          </button>

          <div className="row" style={{ gap: 4, alignItems: 'center' }}>
            <button className="btn sm" onClick={() => strumMachine.setBpm(st.bpm - 5)} aria-label="Decrease BPM">−5</button>
            <span className="badge" data-testid="strum-bpm-readout">{st.bpm} BPM</span>
            <button className="btn sm" onClick={() => strumMachine.setBpm(st.bpm + 5)} aria-label="Increase BPM">+5</button>
          </div>

          <label className="field" style={{ minWidth: 78 }}>
            <span>Key</span>
            <select
              className="select"
              value={chart.tonic}
              onChange={e => strumMachine.setKey(e.target.value)}
              data-testid="strum-key-select"
            >
              {KEYS.map(k => <option key={k} value={k}>{k}{chart.minor ? 'm' : ''}</option>)}
            </select>
          </label>

          <label className="field" style={{ minWidth: 102 }}>
            <span>Capo {st.capo > 0 ? `(→ ${soundingTonic})` : ''}</span>
            <select
              className="select"
              value={st.capo}
              onChange={e => strumMachine.setCapo(Number(e.target.value))}
              data-testid="strum-capo-select"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7].map(c => (
                <option key={c} value={c}>{c === 0 ? 'No Capo' : `Capo ${c}`}</option>
              ))}
            </select>
          </label>

          <button
            className={`btn sm${st.floatNeckOpen ? ' primary' : ''}`}
            aria-pressed={st.floatNeckOpen}
            onClick={() => strumMachine.setFloatNeckOpen(!st.floatNeckOpen)}
            data-testid="strum-float-neck-btn"
            title="Pop open the resizable 5-Layer Neck overlay to jam over this track"
          >
            <Ico n="layers" /> 5-Layer Neck
          </button>
        </div>

        {/* Isolated Backing Master Volume (completely separate from your electric guitar pedal!) */}
        <BackingVolumeBar compact={compact} />

        {/* 47-Style AI Song & Simple Loop Generator */}
        <div className="ai-gen-strip stack" style={{ gap: 8 }} data-testid="strum-ai-gen">
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <AIStyleDropdown
              styleId={aiStyleId}
              compact={compact}
              testId="strum-ai-style"
              onChange={id => {
                setAiStyleId(id)
                const nextSeed = aiSeed + 1
                setAiSeed(nextSeed)
                applyAIRequest({ styleId: id, songShape, role, seed: nextSeed })
              }}
            />
            <button
              className="btn sm primary"
              onClick={() => {
                const nextSeed = aiSeed + 1
                setAiSeed(nextSeed)
                applyAIRequest({ styleId: aiStyleId, songShape, role, seed: nextSeed })
              }}
              data-testid="strum-ai-generate"
            >
              ✨ {songShape === 'song' ? 'AI Full Song' : 'AI Simple Loop'}
            </button>
            <button
              className="btn sm"
              onClick={() => {
                const nextSeed = aiSeed + 1
                setAiSeed(nextSeed)
                applyAIRequest({ styleId: aiStyleId, key: chart.tonic, minor: chart.minor, bpm: st.bpm, songShape, role, seed: nextSeed })
              }}
              title="Keep key, style & tempo, roll fresh chords & fills"
              data-testid="strum-ai-remix"
            >
              🎲 Remix
            </button>
            <button
              className={`btn sm${aiOpen ? ' on' : ' ghost'}`}
              onClick={() => setAiOpen(v => !v)}
              data-testid="strum-ai-prompt-toggle"
            >
              💬 Prompt / My Chords
            </button>
          </div>

          <RoleShapeStrip
            compact={compact}
            songShape={songShape}
            onSongShape={nextShape => {
              setSongShape(nextShape)
              applyAIRequest({ styleId: aiStyleId, key: chart.tonic, minor: chart.minor, bpm: st.bpm, songShape: nextShape, role, seed: aiSeed })
            }}
            role={role}
            onRole={nextRole => {
              setRole(nextRole)
              strumMachine.applyRole(nextRole)
            }}
          />

          {aiOpen && (
            <AIPromptComposer
              compact={compact}
              current={{ styleId: aiStyleId, key: chart.tonic, minor: chart.minor, bpm: st.bpm, songShape, role }}
              onGenerate={req => applyAIRequest({ ...req, seed: aiSeed + 1 })}
              onBuildFromChords={chords => {
                const built = buildBandFromChords(chords, { styleId: aiStyleId, bpm: st.bpm, songShape, role })
                strumMachine.setChart(built.chart, { autoPlay: st.playing })
                strumMachine.applyRole(role)
                setMsg(built.summary)
                setEditing(null)
              }}
            />
          )}
        </div>

        {/* Classic Chart & 18-Engine Style Pickers (preserved for quick browsing!) */}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="field" style={{ flex: '1 1 180px' }}>
            <span>Chart Library</span>
            <select
              className="select"
              value={allCharts.some(c => c.id === chart.id) ? chart.id : ''}
              onChange={e => {
                const picked = allCharts.find(c => c.id === e.target.value)
                if (picked) {
                  strumMachine.setChart(picked, { autoPlay: st.playing })
                  setEditing(null)
                  setBarHits({})
                }
              }}
              data-testid="strum-chart-select"
            >
              {!allCharts.some(c => c.id === chart.id) && <option value="">{chart.name}</option>}
              {userCharts.length > 0 && (
                <optgroup label="My Saved Charts">
                  {userCharts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              )}
              <optgroup label="16 Built-In Multi-Genre Charts">
                {BUILTIN_STRUM_CHARTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            </select>
          </label>

          <label className="field" style={{ flex: '1 1 170px' }}>
            <span>Backing Engine Style</span>
            <select
              className="select"
              value={st.style}
              onChange={e => strumMachine.setStyle(e.target.value as StrumStyleId)}
              aria-label="Strum style"
              data-testid="strum-style-select"
            >
              {STYLE_GROUPS.map(g => (
                <optgroup key={g} label={g}>
                  {STRUM_STYLES.filter(s => s.group === g).map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>

        {/* Live NOW -> NEXT & Solo Scale Banner */}
        <div className="row strum-live-strip" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="small muted">
            <b>{styleMeta.label}</b>
            {soloHint ? ` · Solo: ${soloHint}` : ` · Solo: ${chart.tonic} ${chart.minor ? 'Minor' : 'Major'} Pentatonic`}
          </span>
          <span className="small" style={{ color: 'var(--accent)', fontWeight: 700 }} data-testid="strum-now-next">
            NOW: {st.currentChord} → NEXT: {st.nextChord}{st.playing ? ` · Beat ${st.beat + 1}/${st.beatsPerBar}` : ''}
          </span>
        </div>

        {/* Per-Instrument Band Mixer (Guitar/Chords, Keys/Synth with 10 new synths, Bass, Drums!) */}
        {bandOpen && (
          <div ref={mixerRef} className="strum-inline-mixer stack" style={{ gap: 8 }} data-testid="strum-inline-mixer">
            <div className="strum-band-row">
              <label className="field" style={{ flex: 1 }}>
                <span>🎸 Guitar / Chords</span>
                <select
                  className="select"
                  value={st.chordVoice}
                  onChange={e => strumMachine.setChordVoice(e.target.value as ChordVoiceId)}
                  data-testid="strum-chord-voice"
                >
                  {chordOpts.map(([grp, list]) => (
                    <optgroup key={grp} label={grp}>
                      {list.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <button className={`btn sm${st.mutes.chords ? ' on' : ''}`} aria-pressed={st.mutes.chords} onClick={() => strumMachine.setMutes({ chords: !st.mutes.chords })}>
                {st.mutes.chords ? 'Muted' : 'On'}
              </button>
              <input type="range" min={0} max={1.3} step={0.05} value={st.volumes.chords} onChange={e => strumMachine.setVolumes({ chords: Number(e.target.value) })} aria-label="Chords volume" style={{ width: 84 }} />
            </div>

            <div className="strum-band-row">
              <label className="field" style={{ flex: 1 }}>
                <span>🎹 Keys / Synth</span>
                <select
                  className="select"
                  value={st.keysVoice}
                  onChange={e => strumMachine.setKeysVoice(e.target.value as KeysVoiceId)}
                  data-testid="strum-keys-voice"
                >
                  {keysOpts.map(([grp, list]) => (
                    <optgroup key={grp} label={grp}>
                      {list.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <button className={`btn sm${st.mutes.keys || st.keysVoice === 'off' ? ' on' : ''}`} aria-pressed={st.mutes.keys} onClick={() => strumMachine.setMutes({ keys: !st.mutes.keys })} disabled={st.keysVoice === 'off'}>
                {st.keysVoice === 'off' ? 'Off' : st.mutes.keys ? 'Muted' : 'On'}
              </button>
              <input type="range" min={0} max={1.3} step={0.05} value={st.volumes.keys} onChange={e => strumMachine.setVolumes({ keys: Number(e.target.value) })} aria-label="Keys and synth volume" style={{ width: 84 }} />
            </div>

            <div className="strum-band-row">
              <label className="field" style={{ flex: 1 }}>
                <span>🎸 Bass</span>
                <select
                  className="select"
                  value={st.bassVoice}
                  onChange={e => strumMachine.setBassVoice(e.target.value as BassVoiceId)}
                  data-testid="strum-bass-voice"
                >
                  {bassOpts.map(([grp, list]) => (
                    <optgroup key={grp} label={grp}>
                      {list.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <button className={`btn sm${st.mutes.bass ? ' on' : ''}`} aria-pressed={st.mutes.bass} onClick={() => strumMachine.setMutes({ bass: !st.mutes.bass })}>
                {st.mutes.bass ? 'Muted' : 'On'}
              </button>
              <input type="range" min={0} max={1.3} step={0.05} value={st.volumes.bass} onChange={e => strumMachine.setVolumes({ bass: Number(e.target.value) })} aria-label="Bass volume" style={{ width: 84 }} />
            </div>

            <div className="strum-band-row">
              <label className="field" style={{ flex: 1 }}>
                <span>🥁 Drums</span>
                <select
                  className="select"
                  value={st.drumKit}
                  onChange={e => strumMachine.setDrumKit(e.target.value as DrumKitOverride)}
                  data-testid="strum-drum-kit"
                >
                  {drumOpts.map(([grp, list]) => (
                    <optgroup key={grp} label={grp}>
                      {list.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
              <button className={`btn sm${st.mutes.drums ? ' on' : ''}`} aria-pressed={st.mutes.drums} onClick={() => strumMachine.setMutes({ drums: !st.mutes.drums })}>
                {st.mutes.drums ? 'Muted' : 'On'}
              </button>
              <input type="range" min={0} max={1.3} step={0.05} value={st.volumes.drums} onChange={e => strumMachine.setVolumes({ drums: Number(e.target.value) })} aria-label="Drums volume" style={{ width: 84 }} />
            </div>
            <div className="strum-band-row">
              <label className="field" style={{ flex: 1 }}>
                <span>Playing Motion</span>
                <select
                  className="select"
                  value={st.motion}
                  onChange={e => strumMachine.setMotion(e.target.value as StrumMotionId)}
                  data-testid="strum-motion-select"
                >
                  {STRUM_MOTIONS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 2) Song Sections + 4-Bars-Per-Row Interactive Chord Grid */}
      <div ref={barsPanelRef} className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <strong style={{ fontSize: '0.95rem' }}>
            {chart.name} · {chart.bars.length} Bars ({st.beatsPerBar}/4)
          </strong>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <ChordGripsBar />
            <button className="btn sm" onClick={() => addBarAfter(chart.bars.length - 1)} data-testid="strum-add-bar">
              + Add Bar
            </button>
          </div>
        </div>

        {/* Tap any Section Pill (Intro / Verse / Chorus / Solo / Outro) to loop just that section! */}
        {sections.length > 1 && (
          <div className="row section-pills" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }} data-testid="strum-section-pills">
            <span className="small muted">Loop:</span>
            <button
              className={`btn sm${st.loopSection === null ? ' primary' : ''}`}
              onClick={() => strumMachine.setLoopSection(null)}
              data-testid="strum-sec-all"
            >
              All Song
            </button>
            {sections.map(sec => (
              <button
                key={sec.name}
                className={`btn sm${st.loopSection === sec.name ? ' primary' : ''}`}
                onClick={() => strumMachine.setLoopSection(st.loopSection === sec.name ? null : sec.name)}
                data-testid={`strum-sec-${sec.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {sec.name}
              </button>
            ))}
          </div>
        )}

        <div className="strum-grid" data-testid="strum-bars-grid">
          {chart.bars.map((bar, bi) => {
            const isPlayingBar = st.playing && !st.flowMode && st.barIdx === bi && st.countInLeft === 0
            const grade = barHits[bi]
            return (
              <div
                key={bi}
                className={`strum-bar${isPlayingBar ? ' playing' : ''}${editing?.barIdx === bi ? ' editing' : ''}${grade === 'hit' ? ' graded-hit' : grade === 'miss' ? ' graded-miss' : ''}`}
                data-testid={`strum-bar-${bi}`}
              >
                {bar.section && <span className="strum-bar-section">{bar.section}</span>}
                <span className="strum-bar-num">{bi + 1}</span>

                <div className={`strum-bar-cells${bar.chords.length > 1 ? ' split' : ''}`}>
                  {bar.chords.map((sym, si) => {
                    const isActiveSplit = isPlayingBar && st.splitIdx === si
                    const isEditingSplit = editing?.barIdx === bi && editing?.splitIdx === si
                    const sounding = st.capo > 0 ? transposeChordSymbol(sym, st.capo, flats) : null
                    return (
                      <button
                        key={si}
                        className={`strum-cell${isActiveSplit ? ' active' : ''}${isEditingSplit ? ' selected' : ''}`}
                        onClick={() => setEditing(isEditingSplit ? null : { barIdx: bi, splitIdx: si })}
                        data-testid={`strum-cell-${bi}-${si}`}
                      >
                        <span className="strum-cell-sym">{sym}</span>
                        {sounding && <span className="strum-cell-capo">({sounding})</span>}
                        {showGrips && (
                          <MiniChordGrip
                            symbol={sym}
                            inst={inst}
                            width={bar.chords.length > 1 ? 44 : 56}
                            compact={bar.chords.length > 1}
                            active={isActiveSplit}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>

                {isPlayingBar && (
                  <div className="strum-bar-beats" aria-hidden="true">
                    {Array.from({ length: st.beatsPerBar }, (_, b) => (
                      <span key={b} className={`strum-dot${st.beat === b ? ' on' : ''}`} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Inline Chord Bar Editor */}
        {editing && chart.bars[editing.barIdx] && (
          <div className="strum-editor stack" style={{ gap: 8 }} data-testid="strum-bar-editor">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <strong className="small">
                Editing Bar {editing.barIdx + 1}
                {chart.bars[editing.barIdx].chords.length > 1 ? ` (Half ${editing.splitIdx + 1})` : ''} · {editSym}
              </strong>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <button className="btn sm" onClick={() => toggleSplitBar(editing.barIdx)} data-testid="strum-split-bar">
                  {chart.bars[editing.barIdx].chords.length > 1 ? 'Merge to 1 Chord' : 'Split Bar (2 Chords)'}
                </button>
                <button className="btn sm" onClick={() => addBarAfter(editing.barIdx)}>+ Bar After</button>
                <button
                  className="btn sm"
                  disabled={chart.bars.length <= 1}
                  onClick={() => removeBar(editing.barIdx)}
                >
                  Delete Bar
                </button>
                <button className="btn sm" onClick={() => setEditing(null)}>Done</button>
              </div>
            </div>

            {/* Harmonic Flow Suggestions right inside the Bar Editor! */}
            {flowSuggestions.length > 0 && (
              <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="small muted">🌀 Flow ideas:</span>
                {flowSuggestions.map(b => (
                  <button
                    key={b.node.id}
                    className={`btn sm${showGrips ? ' grip-chip-btn' : ''}`}
                    onClick={() => setChordAt(editing.barIdx, editing.splitIdx, b.node.symbol)}
                    title={b.whisper}
                  >
                    <span><b>{b.node.symbol}</b> <span className="muted">({b.node.roman})</span></span>
                    {showGrips && <MiniChordGrip symbol={b.node.symbol} inst={inst} width={46} compact />}
                  </button>
                ))}
              </div>
            )}

            {/* Fast Root + Quality Picker */}
            <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
              {KEYS.map(k => (
                <button
                  key={k}
                  className={`btn sm${editRoot === k ? ' primary' : ''}`}
                  onClick={() => setChordAt(editing.barIdx, editing.splitIdx, k + editQual)}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
              {QUICK_QUALS.map(q => (
                <button
                  key={q.id || 'maj'}
                  className={`btn sm${editQual === q.id ? ' primary' : ''}`}
                  onClick={() => setChordAt(editing.barIdx, editing.splitIdx, editRoot + q.id)}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save My Chart & App-Wide Interconnections */}
      <div className="panel stack" style={{ gap: 8 }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            style={{ flex: '1 1 180px' }}
            placeholder="Name your custom chart…"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            aria-label="Chart name"
          />
          <button className="btn sm primary" onClick={handleSaveChart} data-testid="strum-save-chart">
            Save to My Charts
          </button>
          {userCharts.some(c => c.id === chart.id) && (
            <button className="btn sm" onClick={() => handleDeleteChart(chart.id)}>
              Delete Saved
            </button>
          )}
        </div>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn sm"
            onClick={() => openFlowCoach({ tonic: chart.tonic, minor: chart.minor, startChord: st.currentChord, capo: st.capo, view: 'path' })}
            data-testid="strum-to-flow"
          >
            🌀 Chord Path
          </button>
          <button
            className="btn sm"
            onClick={() => openFlowCoach({ tonic: chart.tonic, minor: chart.minor, view: 'vibe' })}
          >
            🎨 Chord Vibe Sets
          </button>
          <button
            className="btn sm"
            onClick={() => openLicksInKey(chart.tonic, chart.minor)}
            data-testid="strum-to-licks"
          >
            ⚡ Licks in {chart.tonic}{chart.minor ? 'm' : ''}
          </button>
          <button
            className="btn sm"
            onClick={() => openJam('beats')}
            data-testid="strum-to-beats"
          >
            🥁 Beat Maker
          </button>
          <button
            className="btn sm"
            onClick={() => void handleSaveToSongbook()}
            data-testid="strum-to-play"
          >
            📄 Save &amp; Open in Play
          </button>
          <button
            className="btn sm"
            onClick={() => openFloatTab(chartToSongDoc(chart, st.bpm, st.capo, inst.midis, inst))}
            title="Pop out a floating opacity-adjustable tab preview right over this screen"
            data-testid="strum-float-tab"
          >
            ⧉ Float Tab
          </button>
          <button
            className="btn sm primary"
            onClick={() => openImprovGym({ key: chart.tonic, scale: chart.minor ? 'minor hexatonic' : 'major hexatonic' })}
            title="Float Melodic Improv Gym right over this progression!"
            data-testid="strum-to-improv"
          >
            🎯 Improv Gym
          </button>
          <button
            className="btn sm"
            onClick={() => openSing('home')}
            title="Jump to Sing Mode to sing along"
          >
            🎤 Sing
          </button>
          <button
            className="btn sm"
            onClick={() => {
              downloadMidiFile(exportStrumChartToMidi(chart), chart.name || 'strum_machine')
              setMsg(`Exported "${chart.name}" as .mid!`)
            }}
            data-testid="strum-export-midi"
          >
            🎹 Export .mid
          </button>
          <button
            className="btn sm"
            onClick={() => midiInputRef.current?.click()}
            data-testid="strum-import-midi"
          >
            📂 Import .mid
          </button>
          <input
            ref={midiInputRef}
            type="file"
            accept=".mid,.midi,audio/midi"
            hidden
            onChange={async e => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              try {
                const bytes = new Uint8Array(await f.arrayBuffer())
                const imported = importMidiToStrumChart(bytes, f.name)
                strumMachine.setChart(imported, { autoPlay: st.playing })
                setMsg(`Imported "${imported.name}" (${imported.bars.length} bars, ${imported.bpm} BPM) into Strum Machine!`)
              } catch (err) {
                setMsg(err instanceof Error ? err.message : 'Could not read that MIDI file.')
              }
            }}
          />
        </div>
        {!compact && (
          <InYourCourses
            topics={/blues/i.test(aiStyleId) ? ['blues', 'bb-king', 'rhythm'] : /folk|acoustic|bluegrass|country/i.test(aiStyleId) ? ['acoustic', 'strumming', 'flatpicking', 'rhythm'] : ['rhythm', 'strumming', 'improv', 'hexatonic']}
            title="Matching course clips for this groove"
            max={4}
            compact
          />
        )}
        {msg && <p className="small muted" style={{ margin: 0 }} role="status">{msg}</p>}
      </div>
    </div>
  )
}

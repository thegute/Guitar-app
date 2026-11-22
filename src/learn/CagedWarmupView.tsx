// Guided All-Keys CAGED Warmup Studio (Major & Minor, Full Neck Up & Back Down OR Single-Shape Lockdown,
// Classic vs Snake Flow, Full-Box Resolve on Pentatonic & Scale, Step-2 Triad Subsets, Root Drone, Click,
// 5-Min Guided Timer, 1–2–3–4 Finger HandShape, 12-Key Mastery Grid, and 1-tap Open in Play).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Scale } from 'tonal'
import { Fretboard, type Mark } from '../components/Fretboard'
import { ChordDiagram } from '../components/ChordDiagram'
import { HandShape } from '../components/HandShape'
import { Chips, KeyPicker, usePersist } from '../components/Controls'
import { Zoomable } from '../components/Zoomable'
import { audio } from '../audio/engine'
import { playNote, strum } from '../audio/pluck'
import { Drone } from '../audio/drone'
import { Metronome } from '../audio/metronome'
import { openInPlay } from '../nav'
import type { Instrument } from '../instrument'
import { pc, SHARPS } from '../theory/notes'
import { cagedShapes } from './caged'
import { usePracticeTimer } from './progress'
import {
  buildCagedWarmupSong,
  buildWarmupStages,
  CIRCLE_OF_4THS,
  explainCagedShape,
  explainFlow,
  explainInversion,
  explainWarmupStep,
  formatWarmupNote,
  handGroupForStage,
  keyOfTheDay,
  loadWarmupMastery,
  markWarmupDone,
  nextCircleOf4ths,
  relativeKeyLabel,
  TRIAD_SUBSETS,
  WARMUP_STEPS,
  warmupKeyId,
  type TriadSubset,
  type WarmupFlow,
  type WarmupStepId,
} from './cagedWarmup'

interface Props {
  inst: Instrument
  root: string
  setRoot: (k: string) => void
  minor: boolean
  setMinor: (m: boolean) => void
}

export function CagedWarmup({ inst, root, setRoot, minor, setMinor }: Props) {
  const [step, setStep] = usePersist<WarmupStepId>('cagedWarmupStep', 1)
  const [scope, setScope] = usePersist<string>('cagedWarmupScope', 'all')
  const [flow, setFlow] = usePersist<WarmupFlow>('cagedWarmupFlow', 'classic')
  const [triadSubset, setTriadSubset] = usePersist<TriadSubset>('cagedWarmupTriad', 'full')
  const [bpm, setBpm] = usePersist<number>('cagedWarmupBpm', 85)
  const [guideOpen, setGuideOpen] = usePersist<boolean>('cagedWarmupGuide', true)

  const [stageIdx, setStageIdx] = useState(0)
  const [activeNoteIdx, setActiveNoteIdx] = useState<number>(-1)
  const [demoRunning, setDemoRunning] = useState(false)
  const [droneOn, setDroneOn] = useState(false)
  const [clickOn, setClickOn] = useState(false)
  const [timerSec, setTimerSec] = useState<number | null>(null)
  const [sessionDoneSteps, setSessionDoneSteps] = useState<number[]>([])
  const [mastery, setMastery] = useState<Record<string, number>>(() => loadWarmupMastery())

  usePracticeTimer('caged', demoRunning || droneOn || clickOn || timerSec !== null, false)

  const r = pc(root)
  const keyName = `${SHARPS[r]}${minor ? 'm' : ''}`
  const shapes = useMemo(() => cagedShapes(r, minor, inst), [r, minor, inst])
  const pentaPcs = useMemo(
    () => new Set(Scale.get(`${SHARPS[r]} ${minor ? 'minor pentatonic' : 'major pentatonic'}`).notes.map(pc)),
    [r, minor],
  )

  // Keep scope valid if instrument changes (e.g. guitar → uke)
  const safeScope = scope === 'all' || shapes.some(s => s.letter === scope) ? scope : 'all'

  const stages = useMemo(
    () => buildWarmupStages({ rootPc: r, minor, inst, step, scope: safeScope, flow, triadSubset }),
    [r, minor, inst, step, safeScope, flow, triadSubset],
  )

  // Reset stage pointer whenever step / key / scope changes
  useEffect(() => {
    setStageIdx(0)
    setActiveNoteIdx(-1)
    stopDemo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r, minor, step, safeScope, flow, triadSubset, inst.id])

  const stage = stages[Math.min(stageIdx, Math.max(0, stages.length - 1))]
  const stepInfo = WARMUP_STEPS.find(s => s.id === step) ?? WARMUP_STEPS[0]
  const handGroup = useMemo(() => (stage ? handGroupForStage(stage) : null), [stage])

  // Drone + Metronome lifecycle
  const droneRef = useRef<Drone | null>(null)
  const metroRef = useRef<Metronome | null>(null)
  const demoTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!droneOn) {
      droneRef.current?.stop()
      return
    }
    const d = (droneRef.current ??= new Drone())
    // Tonic in comfortable low-mid guitar register (E2..D#3)
    const tonicMidi = 40 + ((r - 4 + 12) % 12)
    const chord = [minor ? 3 : 4]
    if (d.playing) {
      d.start(tonicMidi, chord)
    } else {
      d.start(tonicMidi, chord)
    }
  }, [droneOn, r, minor])

  useEffect(() => {
    const m = (metroRef.current ??= new Metronome())
    m.bpm = bpm
    if (clickOn && !m.running) m.start()
    else if (!clickOn && m.running) m.stop()
  }, [clickOn, bpm])

  // Clean up all audio & timers on unmount
  useEffect(() => {
    return () => {
      if (demoTimerRef.current !== null) clearTimeout(demoTimerRef.current)
      droneRef.current?.stop()
      metroRef.current?.stop()
    }
  }, [])

  // Optional 5-minute guided timer (60s per step, auto-advances Step 1 → 5)
  useEffect(() => {
    if (timerSec === null) return
    if (timerSec <= 0) {
      // Gentle chime when step finishes
      const ctx = audio()
      void ctx.resume()
      playNote(60 + r + 12, ctx.currentTime + 0.01, 0.45)
      setSessionDoneSteps(prev => (prev.includes(step) ? prev : [...prev, step]))
      if (step < 5) {
        setStep((step + 1) as WarmupStepId)
        setTimerSec(60)
      } else {
        setTimerSec(null)
        setMastery(markWarmupDone(root, minor, bpm))
      }
      return
    }
    const id = window.setTimeout(() => setTimerSec(s => (s === null ? null : s - 1)), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerSec, step, r, root, minor, bpm])

  function stopDemo() {
    if (demoTimerRef.current !== null) {
      clearTimeout(demoTimerRef.current)
      demoTimerRef.current = null
    }
    setDemoRunning(false)
    setActiveNoteIdx(-1)
  }

  /** Play the current step live across all stages (highlighting each shape & note on the neck!). */
  function startDemo(fromStage = stageIdx) {
    stopDemo()
    if (!stages.length) return
    const ctx = audio()
    void ctx.resume()
    setDemoRunning(true)

    const msPerBeat = (60 / bpm) * 1000
    const msPerNote = step === 1 ? msPerBeat * 0.75 : step === 2 ? msPerBeat * 1.4 : msPerBeat * 0.5
    let sIdx = fromStage
    let nIdx = 0

    const tick = () => {
      const curStage = stages[sIdx]
      if (!curStage) {
        stopDemo()
        return
      }
      setStageIdx(sIdx)
      if (step === 2) {
        // Strum the chord or 3-string triad cleanly
        const midis = curStage.boxNotes.map(n => n.midi)
        if (midis.length) strum(midis, audio().currentTime + 0.01, { up: curStage.playDir === 'desc' })
        setActiveNoteIdx(0)
        sIdx++
        if (sIdx >= stages.length) {
          demoTimerRef.current = window.setTimeout(() => stopDemo(), msPerNote)
        } else {
          demoTimerRef.current = window.setTimeout(tick, msPerNote)
        }
        return
      }

      const note = curStage.notes[nIdx]
      if (note) {
        setActiveNoteIdx(nIdx)
        playNote(note.midi, audio().currentTime + 0.01, note.isRoot ? 0.92 : 0.75)
      }
      nIdx++
      if (nIdx >= curStage.notes.length) {
        sIdx++
        nIdx = 0
        if (sIdx >= stages.length) {
          demoTimerRef.current = window.setTimeout(() => stopDemo(), msPerNote * 1.3)
        } else {
          // Tiny breath between positions
          demoTimerRef.current = window.setTimeout(tick, msPerNote * 1.35)
        }
      } else {
        demoTimerRef.current = window.setTimeout(tick, msPerNote)
      }
    }
    tick()
  }

  function hearCurrentStage() {
    if (!stage) return
    const ctx = audio()
    void ctx.resume()
    if (step === 2) {
      const midis = stage.boxNotes.map(n => n.midi)
      if (midis.length) strum(midis, ctx.currentTime + 0.02, { up: stage.playDir === 'desc' })
      return
    }
    const gap = step === 1 ? 0.34 : 0.22
    stage.notes.forEach((n, i) => {
      playNote(n.midi, ctx.currentTime + 0.02 + i * gap, n.isRoot ? 0.9 : 0.72)
    })
  }

  function openWarmupInPlay(allFiveSteps: boolean) {
    stopDemo()
    droneRef.current?.stop()
    setDroneOn(false)
    metroRef.current?.stop()
    setClickOn(false)
    const stepsToBuild: WarmupStepId[] = allFiveSteps ? [1, 2, 3, 4, 5] : [step]
    const song = buildCagedWarmupSong({
      rootPc: r,
      minor,
      inst,
      steps: stepsToBuild,
      scope: safeScope,
      flow,
      triadSubset,
      bpm,
    })
    const id = `caged-warmup:${inst.id}:${SHARPS[r]}:${minor ? 'min' : 'maj'}:${safeScope}:${flow}:${allFiveSteps ? 'all5' : `s${step}`}:${triadSubset}`
    openInPlay({ id, title: song.title, artist: song.artist, source: 'lesson', inst: inst.id, song, updated: Date.now() })
  }

  function markKeyCompleted() {
    setMastery(markWarmupDone(root, minor, bpm))
    setSessionDoneSteps([1, 2, 3, 4, 5])
  }

  // Build fretboard marks for the active stage + ghost full CAGED shape underneath when using Triad Subsets
  const activeNote = stage && activeNoteIdx >= 0 ? stage.notes[activeNoteIdx] : null
  const boxMap = useMemo(() => {
    const m = new Map<string, { label: string; isRoot: boolean; isChord: boolean }>()
    if (!stage) return m
    for (const n of stage.boxNotes) {
      m.set(`${n.string}-${n.fret}`, { label: n.interval, isRoot: n.isRoot, isChord: n.isChord })
    }
    return m
  }, [stage])

  const markFor = (midi: number, s: number, f: number): Mark | null => {
    if (!stage) return null
    if (activeNote && activeNote.string === s && activeNote.fret === f && step !== 2) {
      return { label: activeNote.interval, role: 'live' }
    }
    const hit = boxMap.get(`${s}-${f}`)
    if (hit) {
      if (step === 2 && stage.triad) {
        return { label: hit.label, role: hit.isRoot ? 'root' : 'triad' }
      }
      if (step === 5 && !hit.isRoot && !hit.isChord) {
        return { label: hit.label, role: pentaPcs.has(midi % 12) ? 'scale' : 'pass' }
      }
      return {
        label: hit.label,
        role: hit.isRoot ? 'root' : hit.isChord ? 'chord' : 'scale',
      }
    }
    // In Step 2 Triad Subset mode, lightly ghost the rest of the parent CAGED shape so you see how the triad sits inside it!
    if (step === 2 && triadSubset !== 'full' && stage.shape.frets[s] === f) {
      const iv = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'][((midi % 12) - r + 12) % 12]
      return { label: iv, role: 'ghost' }
    }
    return null
  }

  const coachGuide = useMemo(
    () => explainWarmupStep({ step, keyName, minor, flow, triadSubset, triadInversion: stage?.triad?.inversion ?? null }),
    [step, keyName, minor, flow, triadSubset, stage?.triad?.inversion],
  )

  const voicing = stage
    ? {
        frets: stage.chordFrets,
        fingers: stage.chordFrets.map(() => 0),
        barres: [],
        baseFret: Math.max(1, Math.min(...stage.chordFrets.filter(f => f > 0), 1)),
        midi: [],
      }
    : null

  const doneCount = Object.keys(mastery).length
  const thisKeyDoneBpm = mastery[warmupKeyId(root, minor)]
  const activeTriadDef = TRIAD_SUBSETS.find(t => t.id === triadSubset) ?? TRIAD_SUBSETS[0]

  return (
    <div className="stack" style={{ gap: 12 }} data-testid="caged-warmup">
      {/* 1. Key, Quality, Scope & Flow Controls */}
      <div className="card stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <b style={{ fontSize: 16 }}>Ultimate 5-Step CAGED Warmup · {keyName}</b>
            <span className="small muted" style={{ marginLeft: 8 }} title="Relative major/minor keys use the exact same notes on the neck — only the red Root changes">
              Relative: {relativeKeyLabel(r, minor)} (same dots, different red R)
            </span>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button
              className="btn sm"
              onClick={() => setRoot(keyOfTheDay())}
              title="Today's automatic key walking the Circle of 4ths"
              data-testid="warmup-key-of-day"
            >
              📅 Today ({keyOfTheDay()})
            </button>
            <button
              className="btn sm"
              onClick={() => setRoot(nextCircleOf4ths(root))}
              title="Advance to the next key around the Circle of 4ths"
            >
              Next 4th ({nextCircleOf4ths(root)}) →
            </button>
            <button
              className="btn sm"
              onClick={() => setRoot(CIRCLE_OF_4THS[Math.floor(Math.random() * 12)])}
              title="Pick a random key to test yourself cold"
            >
              🎲 Random
            </button>
          </div>
        </div>

        <KeyPicker value={root} onChange={setRoot} label="Key" />

        <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chips
            label="Quality"
            items={[{ id: 'maj', label: 'Major' }, { id: 'min', label: 'Minor' }]}
            value={minor ? 'min' : 'maj'}
            onChange={v => setMinor(v === 'min')}
          />
          <Chips
            label="Flow"
            items={[
              { id: 'classic', label: '↕ Classic (Up & Back Down)' },
              { id: 'snake', label: '∿ Snake Flow (Alternate ↑↓)' },
            ]}
            value={flow}
            onChange={v => setFlow(v as WarmupFlow)}
          />
        </div>
        <p className="small muted" style={{ margin: 0 }}>{explainFlow(flow)}</p>

        <Chips
          label="Neck Scope"
          items={[
            { id: 'all', label: `All ${shapes.length} Shapes (Open → High → Back)` },
            ...shapes.map(s => ({ id: s.letter, label: `${s.letter} only · f.${s.lo}` })),
          ]}
          value={safeScope}
          onChange={setScope}
          wrap
        />
      </div>

      {/* 2. The 5-Step Warmup Ladder */}
      <div className="card stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="tablist" aria-label="CAGED warmup steps">
          {WARMUP_STEPS.map(st => {
            const done = sessionDoneSteps.includes(st.id)
            return (
              <button
                key={st.id}
                role="tab"
                aria-selected={step === st.id}
                className={`btn sm${step === st.id ? ' primary' : ''}`}
                onClick={() => setStep(st.id)}
                data-testid={`warmup-step-${st.id}`}
              >
                {done ? '✓ ' : ''}{st.short}
              </button>
            )
          })}
        </div>

        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
          <div className="stack" style={{ gap: 2, flex: '1 1 260px' }}>
            <b>{stepInfo.title}</b>
            <p className="small muted" style={{ margin: 0 }}>{stepInfo.subtitle}</p>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button
              className={`btn sm${guideOpen ? ' on' : ''}`}
              aria-pressed={guideOpen}
              onClick={() => setGuideOpen(g => !g)}
              data-testid="warmup-guide-toggle"
            >
              📖 {guideOpen ? 'Hide Guide' : 'Explain This Step'}
            </button>
            <button
              className="btn sm"
              disabled={step === 1}
              onClick={() => setStep((step - 1) as WarmupStepId)}
            >
              ‹ Prev Step
            </button>
            <button
              className="btn sm"
              onClick={() => {
                setSessionDoneSteps(prev => (prev.includes(step) ? prev : [...prev, step]))
                if (step < 5) setStep((step + 1) as WarmupStepId)
                else markKeyCompleted()
              }}
            >
              {step < 5 ? 'Next Step ›' : '✓ Finish Key'}
            </button>
          </div>
        </div>

        {/* Plain-English Coach Explanation for the active step */}
        {guideOpen && (
          <div className="caged-coach-box stack" style={{ gap: 6 }} data-testid="warmup-coach-guide">
            <p className="small" style={{ margin: 0 }}><b>What you&apos;re doing:</b> {coachGuide.what}</p>
            <p className="small" style={{ margin: 0 }}><b>Why it matters:</b> {coachGuide.why}</p>
            <p className="small" style={{ margin: 0 }}><b>How to play it:</b> {coachGuide.how}</p>
            <p className="small muted" style={{ margin: 0 }}><b>Watch &amp; listen for:</b> {coachGuide.watch}</p>
          </div>
        )}

        {/* Step 2 Triad Subset Selector */}
        {step === 2 && (
          <div className="caged-triad-bar stack" style={{ gap: 6 }} data-testid="warmup-triad-subsets">
            <Chips
              label="Chord / Triad Subset"
              items={TRIAD_SUBSETS.filter(t => inst.strings >= 6 || t.id === 'full' || t.id === 'top3' || t.id === 'bot3').map(t => ({
                id: t.id,
                label: t.id === 'full' ? t.label : `${t.label} (${t.stringsLabel})`,
              }))}
              value={triadSubset}
              onChange={v => setTriadSubset(v as TriadSubset)}
              wrap
            />
            <p className="small muted" style={{ margin: 0 }}>
              <b>{activeTriadDef.label}:</b> {activeTriadDef.hint}
              {triadSubset !== 'full' && ' — ghost rings show the full CAGED grip your 3-string triad comes from!'}
            </p>
          </div>
        )}

        {/* Journey Strip: Up the Neck → High Frets → Back Down */}
        <div className="stack" style={{ gap: 4 }}>
          <span className="small muted">
            Neck journey ({flow === 'snake' ? 'Snake Flow: alternate ↑ ↓ each shape' : 'Classic: ascend up neck, descend back down'}):
          </span>
          <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
            {stages.map((st, idx) => (
              <button
                key={`${st.shape.letter}-${st.journey}-${idx}`}
                className={`btn sm${idx === stageIdx ? ' primary' : ''}`}
                style={{ padding: '3px 8px', minHeight: 28, fontSize: 12 }}
                onClick={() => { stopDemo(); setStageIdx(idx) }}
                title={`${st.shape.letter} shape · frets ${st.shape.lo}–${st.shape.hi} · ${st.journey === 'up' ? 'going up neck' : 'coming back down'}`}
              >
                {st.label}
                {step === 2 && st.triad ? ` · ${st.triad.inversion}` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Live Fretboard for Current Shape & Step */}
        {stage && (
          <Fretboard
            tuning={inst.midis}
            fromFret={0}
            toFret={Math.max(15, stage.shape.hi + 1)}
            markFor={markFor}
            onTap={m => { const ctx = audio(); void ctx.resume(); playNote(m, ctx.currentTime + 0.01, 0.85) }}
          />
        )}

        {/* Active Shape Info + Chord Box / 1-2-3-4 Finger HandShape + Exact Full-Box Resolve Note Sequence */}
        {stage && (
          <div className="caged-warmup-detail">
            {step === 2 && voicing && (
              <Zoomable id="cagedWarmupChord" max={2}>
                <ChordDiagram
                  name={`${keyName} · ${stage.shape.letter}${stage.triad ? ` (${stage.triad.inversion})` : ''}`}
                  voicing={voicing}
                  onClick={hearCurrentStage}
                  size={0.88}
                />
              </Zoomable>
            )}
            {handGroup && (
              <HandShape
                group={handGroup}
                moveSoon={false}
                expected={activeNote ? [{ string: activeNote.string, fret: activeNote.fret, midi: activeNote.midi }] : []}
                nStr={inst.strings}
                stringNames={inst.tuning.notes.map(n => n.replace(/\d+$/, ''))}
                compact
              />
            )}
            <div className="stack" style={{ gap: 6, flex: '1 1 220px' }}>
              <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <b>{stage.shape.letter} Shape · frets {stage.shape.lo}–{stage.shape.hi}</b>
                <span className="badge ghost">{stage.journey === 'up' ? 'Going Up Neck' : 'Coming Back Down'}</span>
                <span className="badge ghost">{stage.playDir === 'asc' ? 'Ascend ↑' : 'Descend ↓'}</span>
                {step === 2 && stage.triad && <span className="badge">{stage.triad.inversion}</span>}
              </div>
              <p className="small muted" style={{ margin: 0 }}>
                {explainCagedShape(stage.shape.letter, minor)}
                {step === 2 && stage.triad ? ` ${explainInversion(stage.triad.inversion, minor)}` : ''}
              </p>
              <div className="caged-seq-strip" aria-label="Note sequence for this shape">
                {stage.notes.map((n, i) => (
                  <span
                    key={i}
                    className={`caged-note-pill${n.isRoot ? ' root' : ''}${i === activeNoteIdx ? ' live' : ''}`}
                  >
                    {i === 0 && (step === 4 || step === 5) ? '★' : ''}
                    {formatWarmupNote(n)}
                  </span>
                ))}
              </div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <button className="btn sm" onClick={hearCurrentStage}>▶ Hear this shape</button>
                <button
                  className="btn sm"
                  onClick={() => { stopDemo(); setStageIdx(i => (i + 1) % stages.length) }}
                >
                  Next position →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Companion Audio, 5-Min Timer & Open in Play */}
      <div className="card stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className={`btn sm${demoRunning ? ' primary' : ''}`}
            onClick={() => (demoRunning ? stopDemo() : startDemo(stageIdx))}
            data-testid="warmup-demo-btn"
          >
            {demoRunning ? '■ Stop Demo' : '▶ Play Full Step Demo'}
          </button>
          <button
            className={`btn sm${droneOn ? ' primary' : ''}`}
            aria-pressed={droneOn}
            onClick={() => setDroneOn(d => !d)}
            title="Play a soft root drone underneath so your ear locks into the root"
            data-testid="warmup-drone-btn"
          >
            🎵 {keyName} Drone {droneOn ? 'ON' : 'OFF'}
          </button>
          <button
            className={`btn sm${clickOn ? ' primary' : ''}`}
            aria-pressed={clickOn}
            onClick={() => setClickOn(c => !c)}
            data-testid="warmup-click-btn"
          >
            🥁 Click {clickOn ? 'ON' : 'OFF'}
          </button>
          <label className="row small" style={{ gap: 6, alignItems: 'center' }}>
            <span>BPM</span>
            <input
              type="range"
              min={50}
              max={150}
              step={5}
              value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
              style={{ width: 96, accentColor: 'var(--accent)' }}
              aria-label="Warmup tempo BPM"
            />
            <b className="tabular" style={{ minWidth: 28 }}>{bpm}</b>
          </label>
          <button
            className={`btn sm${timerSec !== null ? ' primary' : ''}`}
            onClick={() => {
              if (timerSec !== null) setTimerSec(null)
              else { setStep(1); setTimerSec(60) }
            }}
            title="5-minute guided routine: 1 minute per step with gentle chime & auto-advance"
            data-testid="warmup-timer-btn"
          >
            {timerSec !== null ? `⏱ Step ${step}/5 · ${timerSec}s (Stop)` : '⏱ Start 5-Min Routine'}
          </button>
        </div>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn primary sm"
            onClick={() => openWarmupInPlay(false)}
            data-testid="warmup-open-step-play"
          >
            🎸 Open Step {step} in Play (Cursor + Mic)
          </button>
          <button
            className="btn sm"
            onClick={() => openWarmupInPlay(true)}
            data-testid="warmup-open-all-play"
          >
            🎸 Open All 5 Steps in Play
          </button>
          <button
            className={`btn sm${thisKeyDoneBpm ? ' on' : ''}`}
            onClick={markKeyCompleted}
            data-testid="warmup-mark-done"
          >
            {thisKeyDoneBpm ? `✓ ${keyName} Done (${thisKeyDoneBpm} BPM)` : `✓ Mark ${keyName} Done`}
          </button>
        </div>
      </div>

      {/* 4. 12-Key Major & Minor Mastery Grid (Circle of 4ths Order, Syncs Phone ↔ Tablet) */}
      <details className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
          12-Key CAGED Mastery Grid ({doneCount} / 24 keys completed · Circle of 4ths)
        </summary>
        <div className="stack" style={{ gap: 8, marginTop: 10 }}>
          {(['maj', 'min'] as const).map(q => (
            <div key={q} className="stack" style={{ gap: 4 }}>
              <span className="small muted">{q === 'maj' ? 'Major Keys (Circle of 4ths)' : 'Minor Keys (Circle of 4ths)'}</span>
              <div className="caged-key-grid">
                {CIRCLE_OF_4THS.map(k => {
                  const isMin = q === 'min'
                  const id = warmupKeyId(k, isMin)
                  const best = mastery[id]
                  const active = pc(k) === r && isMin === minor
                  return (
                    <button
                      key={id}
                      className={`caged-key-tile${best ? ' done' : ''}${active ? ' active' : ''}`}
                      onClick={() => { setRoot(k); setMinor(isMin) }}
                    >
                      <b>{k}{isMin ? 'm' : ''}</b>
                      <span>{best ? `✓ ${best}` : '—'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

// ⚡ Speed Builder Lab (Learn → Exercises → ⚡ Speed Builder):
// Brings Roy Ziv's Guitar Speed Builder methodology to life inside KGuitar:
// 1. Burst-Speed Protocol ("Hockey Experiment": 2 bars Clean → 1 bar +15% Burst → back to Clean, or Auto-Ramp +5 BPM)
// 2. Timed Endurance Circuits (60s/90s stamina drills + rest timers for Pinky, Chromatic, Inside/Outside, Wide Stretches)
// 3. 14 Live Scale Sequences in ANY key & scale (including Minor Hexatonic 2NPS!) -> 1-tap Play / Game Mode / Float Tab
// 4. Clean BPM Progress Log + matching clips from your connected Speed Builder & Matteo Mancuso folders!
import { useEffect, useMemo, useRef, useState } from 'react'
import { audio, keepAwake } from '../audio/engine'
import { playClick } from '../audio/metronome'
import { liveSound, quietSound } from '../audio/stopAll'
import { useInstrument } from '../instrument'
import { usePersist } from '../components/Controls'
import { openFloatTab } from '../nav'
import { KEYS } from '../theory/notes'
import { SCALES } from '../theory/scales'
import type { SongDoc } from '../tabs/library'
import { InYourCourses } from '../lessons/InYourCourses'
import {
  ENDURANCE_DRILLS,
  SPEED_SEQUENCES,
  bestSpeedBpm,
  buildSpeedSequenceDoc,
  burstBarBpm,
  loadSpeedLog,
  recordSpeedBpm,
  type SpeedLogEntry,
} from './speedSequences'

export function SpeedBuilderLab({ onOpen }: { onOpen: (doc: SongDoc) => void }) {
  const inst = useInstrument()
  const [seqId, setSeqId] = usePersist('sb:seq', 'asc-3rds')
  const [keyRoot, setKeyRoot] = usePersist('sb:key', 'A')
  const [scaleId, setScaleId] = usePersist('sb:scale', 'minor hexatonic')
  const [cleanBpm, setCleanBpm] = usePersist('sb:bpm', 85)
  const [mode, setMode] = usePersist<'burst' | 'ramp'>('sb:mode', 'burst')
  const [boostPct, setBoostPct] = usePersist('sb:boost', 15)
  const [log, setLog] = useState<SpeedLogEntry[]>(loadSpeedLog)
  const [msg, setMsg] = useState('')

  // Live Burst / Ramp metronome state
  const [running, setRunning] = useState(false)
  const [curBar, setCurBar] = useState(0)
  const [curBeat, setCurBeat] = useState(0)
  const [livePhase, setLivePhase] = useState<'clean' | 'burst' | 'ramp'>('clean')
  const [liveBpm, setLiveBpm] = useState(cleanBpm)
  const timerRef = useRef<number>(0)
  const runnerRef = useRef<{ bar: number; beat: number; active: boolean }>({ bar: 0, beat: 0, active: false })
  const cfgRef = useRef({ cleanBpm, mode, boostPct })
  cfgRef.current = { cleanBpm, mode, boostPct }

  // Endurance countdown timer
  const [endureId, setEndureId] = useState(ENDURANCE_DRILLS[0].id)
  const [endureSec, setEndureSec] = useState<number>(0)
  const [endurePhase, setEndurePhase] = useState<'idle' | 'work' | 'rest'>('idle')
  const endureDrill = ENDURANCE_DRILLS.find(d => d.id === endureId) ?? ENDURANCE_DRILLS[0]

  const stopRunner = () => {
    runnerRef.current.active = false
    window.clearTimeout(timerRef.current)
    setRunning(false)
    quietSound({ stop: stopRunner })
    void keepAwake(false)
  }

  useEffect(() => () => {
    runnerRef.current.active = false
    window.clearTimeout(timerRef.current)
  }, [])

  function startRunner() {
    if (running) { stopRunner(); return }
    const ctx = audio()
    if (ctx.state === 'suspended') void ctx.resume()
    runnerRef.current = { bar: 0, beat: 0, active: true }
    setRunning(true)
    void keepAwake(true)
    liveSound({ stop: stopRunner, kind: 'metronome' }, 'Speed Burst')

    const tick = () => {
      if (!runnerRef.current.active) return
      const { bar, beat } = runnerRef.current
      const { bpm, phase } = burstBarBpm(bar, cfgRef.current.cleanBpm, cfgRef.current.mode, cfgRef.current.boostPct)
      setCurBar(bar)
      setCurBeat(beat)
      setLiveBpm(bpm)
      setLivePhase(phase)
      const now = audio().currentTime
      playClick(now + 0.01, 'wood', beat === 0 ? 'accent' : 'beat', phase === 'burst' ? 1 : 0.78)
      const nextBeat = (beat + 1) % 4
      runnerRef.current.beat = nextBeat
      if (nextBeat === 0) runnerRef.current.bar = bar + 1
      const ms = (60 / bpm) * 1000
      timerRef.current = window.setTimeout(tick, ms)
    }
    tick()
  }

  // Endurance interval
  useEffect(() => {
    if (endurePhase === 'idle') return
    const id = window.setInterval(() => {
      setEndureSec(s => {
        if (s <= 1) {
          if (endurePhase === 'work') {
            setEndurePhase('rest')
            setMsg(`Rest ${endureDrill.restSeconds}s — shake out your hands!`)
            return endureDrill.restSeconds
          }
          setEndurePhase('idle')
          setMsg(`Finished ${endureDrill.label} endurance round!`)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [endurePhase, endureDrill])

  const seqDef = SPEED_SEQUENCES.find(s => s.id === seqId) ?? SPEED_SEQUENCES[0]
  const bestForSeq = useMemo(() => bestSpeedBpm(seqId, log), [seqId, log])
  const recentForSeq = useMemo(() => log.filter(e => e.drillId === seqId).slice(-6), [seqId, log])

  function logCleanNow() {
    const next = recordSpeedBpm(seqId, cleanBpm)
    setLog(next)
    setMsg(`Logged ${cleanBpm} BPM clean on "${seqDef.label}"!`)
  }

  return (
    <div className="stack" style={{ gap: 12 }} data-testid="speed-builder-lab">
      {/* 1) Burst-Speed Protocol ("Hockey Experiment") */}
      <div className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ margin: 0 }}>⚡ Burst-Speed Trainer</h3>
            <p className="small muted" style={{ margin: '2px 0 0' }}>
              2 bars Clean → 1 bar +{boostPct}% Burst → back to Clean (breaks speed plateaus without tension).
            </p>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className={`btn sm${mode === 'burst' ? ' primary' : ''}`} onClick={() => setMode('burst')}>
              ⚡ Burst Cycles
            </button>
            <button className={`btn sm${mode === 'ramp' ? ' primary' : ''}`} onClick={() => setMode('ramp')}>
              📈 +5 Ramp / 4 Bars
            </button>
          </div>
        </div>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className={`btn primary lg${running ? ' on' : ''}`}
            onClick={startRunner}
            data-testid="sb-burst-play"
          >
            {running ? '■ Stop Burst' : '▶ Start Burst'}
          </button>

          <div className="row" style={{ gap: 4, alignItems: 'center' }}>
            <button className="btn sm" onClick={() => setCleanBpm(b => Math.max(40, b - 5))}>−5</button>
            <span className="badge" data-testid="sb-clean-bpm">Clean: {cleanBpm} BPM</span>
            <button className="btn sm" onClick={() => setCleanBpm(b => Math.min(200, b + 5))}>+5</button>
          </div>

          {mode === 'burst' && (
            <label className="row small" style={{ gap: 6, alignItems: 'center' }}>
              <span className="muted">Burst:</span>
              {[10, 15, 20].map(pct => (
                <button key={pct} className={`btn sm${boostPct === pct ? ' primary' : ''}`} onClick={() => setBoostPct(pct)}>
                  +{pct}% ({Math.round(cleanBpm * (1 + pct / 100))})
                </button>
              ))}
            </label>
          )}

          <button className="btn sm" onClick={logCleanNow} data-testid="sb-log-bpm">
            💾 Log {cleanBpm} BPM Clean
          </button>
        </div>

        <div className={`sb-phase-strip phase-${running ? livePhase : 'idle'}`} data-testid="sb-phase-strip">
          <strong style={{ fontSize: 15 }}>
            {!running
              ? `Ready · Clean ${cleanBpm} BPM ${mode === 'burst' ? `→ Burst ${Math.round(cleanBpm * (1 + boostPct / 100))} BPM` : '→ +5 every 4 bars'}`
              : livePhase === 'burst'
                ? `🔥 BURST! ${liveBpm} BPM · Bar ${curBar + 1}`
                : livePhase === 'ramp'
                  ? `📈 RAMP ${liveBpm} BPM · Bar ${curBar + 1}`
                  : `🟢 CLEAN ${liveBpm} BPM · Bar ${curBar + 1}`}
          </strong>
          <div className="row" style={{ gap: 6 }}>
            {[0, 1, 2, 3].map(b => (
              <span key={b} className={`improv-beat-pill${running && curBeat === b ? ' now' : ''}`}>
                {b + 1}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 2) 14 Live Scale Sequences & Speed Workouts */}
      <div className="panel stack" style={{ gap: 10 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <h3 style={{ margin: 0 }}>🎼 14 Live Scale Sequences &amp; Speed Drills</h3>
          {bestForSeq !== null && <span className="badge">🏆 Best Clean: {bestForSeq} BPM</span>}
        </div>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
          <label className="field" style={{ flex: '1 1 210px' }}>
            <span>Sequence / Drill</span>
            <select className="select" value={seqId} onChange={e => setSeqId(e.target.value)} data-testid="sb-seq-select">
              {(['Scale Sequences', 'Endurance & Picking'] as const).map(cat => (
                <optgroup key={cat} label={cat}>
                  {SPEED_SEQUENCES.filter(s => s.category === cat).map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="field" style={{ minWidth: 74 }}>
            <span>Key</span>
            <select className="select" value={keyRoot} onChange={e => setKeyRoot(e.target.value)}>
              {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label className="field" style={{ minWidth: 160 }}>
            <span>Scale</span>
            <select className="select" value={scaleId} onChange={e => setScaleId(e.target.value)}>
              {SCALES.slice(0, 14).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        </div>

        <p className="small muted" style={{ margin: 0 }}>{seqDef.hint}</p>

        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn primary"
            onClick={() => onOpen(buildSpeedSequenceDoc(seqId, keyRoot, scaleId, cleanBpm, inst.midis))}
            data-testid="sb-open-play"
          >
            🎸 Open in Play &amp; Game Mode
          </button>
          <button
            className="btn"
            onClick={() => openFloatTab(buildSpeedSequenceDoc(seqId, keyRoot, scaleId, cleanBpm, inst.midis))}
            data-testid="sb-float-tab"
          >
            ⧉ Float Tab
          </button>
        </div>

        {recentForSeq.length > 0 && (
          <div className="row small muted" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span>Recent clean BPM:</span>
            {recentForSeq.map((e, i) => (
              <span key={i} className="badge">{e.bpm} BPM</span>
            ))}
          </div>
        )}
      </div>

      {/* 3) Timed Endurance Circuit */}
      <div className="panel stack" style={{ gap: 8 }}>
        <h3 style={{ margin: 0 }}>⏱ Stamina &amp; Endurance Circuit</h3>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {ENDURANCE_DRILLS.map(d => (
            <button
              key={d.id}
              className={`btn sm${endureId === d.id ? ' primary' : ''}`}
              onClick={() => { setEndureId(d.id); setEndurePhase('idle'); setEndureSec(0) }}
            >
              {d.label} ({d.seconds}s)
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className={`btn${endurePhase !== 'idle' ? ' primary on' : ''}`}
            onClick={() => {
              if (endurePhase !== 'idle') { setEndurePhase('idle'); setEndureSec(0) }
              else { setEndurePhase('work'); setEndureSec(endureDrill.seconds); setMsg(`Go! ${endureDrill.focus}`) }
            }}
            data-testid="sb-endure-btn"
          >
            {endurePhase === 'idle' ? `▶ Start ${endureDrill.seconds}s Set` : `■ Stop (${endurePhase.toUpperCase()} ${endureSec}s)`}
          </button>
          <span className="small muted">{endureDrill.focus}</span>
        </div>
        {msg && <p className="small" style={{ margin: 0, color: 'var(--accent)' }} role="status">{msg}</p>}
      </div>

      {/* 4) Matching Speed Builder & Matteo Mancuso Course Clips */}
      <div className="panel">
        <InYourCourses
          topics={['speed', 'endurance', 'sequences', 'alternate-picking', 'hybrid-picking', 'hand-sync', 'warmup', 'tremolo']}
          title="Speed Builder & Technique lessons in your courses"
          max={6}
          showEmptyHint
        />
      </div>
    </div>
  )
}

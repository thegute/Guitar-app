// The bar at the top while a practice session runs: which step, time left, pause, back, next, stop.
// When a step's time is up it chimes and offers the next one (it never jumps screens by itself mid-phrase).
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Ico } from '../components/Icon'
import { addTime, clearSummary, jumpTo, next, onSession, openStep, pause, prev, running, saveSession, savedSessions, sessionSummary, stopSession, tick } from './session'
import { playClick } from '../audio/metronome'
import { audio } from '../audio/engine'

export function SessionBar() {
  const r = useSyncExternalStore(onSession, running)
  const sum = useSyncExternalStore(onSession, sessionSummary)
  const [open, setOpen] = useState(false)
  const [savedAt, setSavedAt] = useState(0)
  useEffect(() => {
    if (!r || r.paused) return
    const id = setInterval(() => {
      const before = running()?.left ?? 0
      tick()
      const after = running()?.left ?? 0
      if (before > 0 && after === 0) { try { const t = audio().currentTime; playClick(t, 'wood', 'accent', 1); playClick(t + 0.18, 'wood', 'accent', 1); playClick(t + 0.36, 'wood', 'accent', 1) } catch { /* no sound */ } }
    }, 1000)
    return () => clearInterval(id)
  }, [r?.paused, r?.index]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!r) {
    if (!sum) return null
    const alreadySaved = savedAt === sum.at || savedSessions().some(x => x.id === sum.session.id)
    return (
      <div className="session-summary" role="status" data-testid="session-summary">
        <div className="session-sum-text">
          <b>Session complete!</b>
          <span className="small muted">{sum.session.title} · {sum.completedCount}/{sum.session.steps.length} steps ({sum.minutes} min)</span>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <button className="btn sm primary" disabled={alreadySaved} onClick={() => { saveSession(sum.session); setSavedAt(sum.at) }} data-testid="session-save-routine">
            {alreadySaved ? '✓ Saved' : '★ Save routine'}
          </button>
          <button className="btn sm ghost" onClick={() => clearSummary()}>Dismiss</button>
        </div>
      </div>
    )
  }

  const step = r.session.steps[r.index]
  const s = Math.ceil(r.left / 1000)
  const done = r.left <= 0
  const last = r.index === r.session.steps.length - 1
  const completed = new Set(r.completed ?? [])
  const stepMs = Math.max(1, step.minutes * 60000)
  const pct = Math.max(0, Math.min(100, Math.round(((stepMs - r.left) / stepMs) * 100)))
  const remainingMin = Math.max(1, Math.ceil(r.left / 60000) + r.session.steps.slice(r.index + 1).reduce((a, x) => a + x.minutes, 0))

  return (
    <div className={`session-bar${done ? ' done' : ''}`} role="region" aria-label="Practice session">
      <div className="session-progress" aria-hidden>
        {r.session.steps.map((_, i) => {
          const isDone = completed.has(i) || i < r.index
          const isCur = i === r.index
          return (
            <span key={i} className={`sp-seg${isDone ? ' done' : ''}${isCur ? ' cur' : ''}`}>
              <i style={{ width: isDone ? '100%' : isCur ? `${pct}%` : '0%' }} />
            </span>
          )
        })}
      </div>
      <button className="session-main" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="small muted">{r.session.title} · step {r.index + 1} of {r.session.steps.length} · ~{remainingMin} min left</span>
        <b>{step.title}</b>
        {step.tip && <span className="session-cue small">{step.tip}</span>}
      </button>
      <span className="session-time readout">{done ? 'Time!' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}</span>
      <button className="btn sm" onClick={() => pause(!r.paused)} aria-label={r.paused ? 'Carry on' : 'Pause'}>{r.paused ? <Ico n="play" fill /> : <Ico n="pause" />}</button>
      <button className={`btn sm${done ? ' primary' : ''}`} onClick={next} data-testid="session-next">{last ? 'Finish ✓' : 'Done & Next ▸'}</button>
      {open && (
        <div className="session-more">
          <ol className="small session-checklist">
            {r.session.steps.map((x, i) => {
              const isDone = completed.has(i) || i < r.index
              return (
                <li key={i} className={i === r.index ? 'on' : isDone ? 'past' : ''}>
                  <button className="session-step-btn" onClick={() => { jumpTo(i); setOpen(false) }}>
                    <span className="ss-mark" aria-hidden>{isDone ? '✓' : i === r.index ? '▶' : `${i + 1}.`}</span>
                    <span className="ss-title">{x.title}</span>
                    <span className="ss-min muted">{x.minutes} min</span>
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button className="btn sm" onClick={() => openStep(step)}>Open this step again</button>
            <button className="btn sm" onClick={() => addTime(2)}>+2 min</button>
            <button className="btn sm" onClick={prev} disabled={r.index === 0}>◂ Back a step</button>
            <button className="btn sm ghost" onClick={() => { stopSession(); setOpen(false) }}>Stop the session</button>
          </div>
        </div>
      )}
    </div>
  )
}

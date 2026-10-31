// The bar at the top while a practice session runs: which step, time left, pause, back, next, stop.
// When a step's time is up it chimes and offers the next one (it never jumps screens by itself mid-phrase).
import { useEffect, useState, useSyncExternalStore } from 'react'
import { addTime, finish, next, onSession, openStep, pause, prev, running, tick } from './session'
import { playClick } from '../audio/metronome'
import { audio } from '../audio/engine'

export function SessionBar() {
  const r = useSyncExternalStore(onSession, running)
  const [open, setOpen] = useState(false)
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
  if (!r) return null
  const step = r.session.steps[r.index]
  const s = Math.ceil(r.left / 1000)
  const done = r.left <= 0
  const last = r.index === r.session.steps.length - 1
  return (
    <div className={`session-bar${done ? ' done' : ''}`} role="region" aria-label="Practice session">
      <button className="session-main" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="small muted">{r.session.title} · step {r.index + 1} of {r.session.steps.length}</span>
        <b>{step.title}</b>
      </button>
      <span className="session-time readout">{done ? 'Time!' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}</span>
      <button className="btn sm" onClick={() => pause(!r.paused)} aria-label={r.paused ? 'Carry on' : 'Pause'}>{r.paused ? '▶' : '⏸'}</button>
      <button className={`btn sm${done ? ' primary' : ''}`} onClick={next}>{last ? 'Finish' : 'Next ▸'}</button>
      {open && (
        <div className="session-more">
          {step.tip && <p className="small" style={{ margin: 0 }}>{step.tip}</p>}
          <ol className="small">{r.session.steps.map((x, i) => <li key={i} className={i === r.index ? 'on' : i < r.index ? 'past' : ''}>{x.title} · {x.minutes} min</li>)}</ol>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn sm" onClick={() => openStep(step)}>Open this step again</button>
            <button className="btn sm" onClick={() => addTime(2)}>+2 min</button>
            <button className="btn sm" onClick={prev} disabled={r.index === 0}>◂ Back a step</button>
            <button className="btn sm ghost" onClick={() => { finish(); setOpen(false) }}>Stop the session</button>
          </div>
        </div>
      )}
    </div>
  )
}

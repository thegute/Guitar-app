// Movable, minimizable, 1-tap closable practice session bar:
// - Visible controls right on the bar: Drag grip, ◂ Back, ⏸ Pause, Next ▸, ▾ Steps, — Minimize, ✕ End immediately.
// - Drag anywhere on screen (expanded or minimized into a tiny floating pill), safely clamped inside the viewport.
// - When a step's time is up it chimes and highlights Next (never jumps screens mid-phrase).
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Ico } from '../components/Icon'
import { addTime, clearSummary, jumpTo, next, onSession, openStep, pause, prev, running, saveSession, savedSessions, sessionSummary, stopSession, tick } from './session'
import { playClick } from '../audio/metronome'
import { audio } from '../audio/engine'

const POS_KEY = 'kg:sessionBarPos'

interface BarPos { x: number; y: number }

function loadPos(): BarPos | null {
  try {
    const raw = localStorage.getItem(POS_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<BarPos>
    if (typeof p.x === 'number' && typeof p.y === 'number') return { x: p.x, y: p.y }
  } catch { /* ignore */ }
  return null
}

function savePos(pos: BarPos | null) {
  try {
    if (pos) localStorage.setItem(POS_KEY, JSON.stringify(pos))
    else localStorage.removeItem(POS_KEY)
  } catch { /* ignore */ }
}

function clampPos(x: number, y: number, w: number, h: number): BarPos {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const pad = 6
  return {
    x: Math.max(pad, Math.min(Math.max(pad, vw - w - pad), Math.round(x))),
    y: Math.max(pad, Math.min(Math.max(pad, vh - h - pad), Math.round(y))),
  }
}

export function SessionBar() {
  const r = useSyncExternalStore(onSession, running)
  const sum = useSyncExternalStore(onSession, sessionSummary)
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [pos, setPos] = useState<BarPos | null>(() => loadPos())
  const [dragging, setDragging] = useState(false)
  const [savedAt, setSavedAt] = useState(0)

  const barRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    origX: number
    origY: number
    w: number
    h: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    if (!r || r.paused) return
    const id = setInterval(() => {
      const before = running()?.left ?? 0
      tick()
      const after = running()?.left ?? 0
      if (before > 0 && after === 0) {
        try {
          const t = audio().currentTime
          playClick(t, 'wood', 'accent', 1)
          playClick(t + 0.18, 'wood', 'accent', 1)
          playClick(t + 0.36, 'wood', 'accent', 1)
        } catch { /* no sound */ }
      }
    }, 1000)
    return () => clearInterval(id)
  }, [r?.paused, r?.index]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-clamp floating position whenever window resizes or bar switches minimized/expanded
  useEffect(() => {
    if (!pos && !minimized) return
    const reclamp = () => {
      const el = barRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setPos(cur => {
        if (!cur) return cur
        const clamped = clampPos(cur.x, cur.y, rect.width || 240, rect.height || 44)
        return clamped.x === cur.x && clamped.y === cur.y ? cur : clamped
      })
    }
    const raf = requestAnimationFrame(reclamp)
    window.addEventListener('resize', reclamp)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', reclamp)
    }
  }, [minimized, open, Boolean(pos)]) // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    const el = barRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos ? pos.x : rect.left,
      origY: pos ? pos.y : rect.top,
      w: rect.width,
      h: rect.height,
      moved: false,
    }
    setDragging(true)
  }

  const moveDrag = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.hypot(dx, dy) < 5) return
    d.moved = true
    const nextPos = clampPos(d.origX + dx, d.origY + dy, d.w, d.h)
    setPos(nextPos)
  }

  const endDrag = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d || d.pointerId !== e.pointerId) return
    dragRef.current = null
    setDragging(false)
    if (d.moved) {
      const nextPos = clampPos(d.origX + (e.clientX - d.startX), d.origY + (e.clientY - d.startY), d.w, d.h)
      setPos(nextPos)
      savePos(nextPos)
    }
  }

  const dockTop = () => {
    setPos(null)
    savePos(null)
  }

  const handleClose = () => {
    setOpen(false)
    setMinimized(false)
    stopSession()
  }

  const handleMinimize = () => {
    setOpen(false)
    if (!pos) {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
      const initPos = clampPos(vw - 260, 10, 248, 44)
      setPos(initPos)
      savePos(initPos)
    }
    setMinimized(true)
  }

  const handleExpand = () => {
    setMinimized(false)
  }

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
  const timeText = done ? 'Time!' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // Minimized compact draggable floating pill
  if (minimized) {
    const style = pos
      ? { left: pos.x, top: pos.y }
      : { right: 12, top: 10 }
    return (
      <div
        ref={barRef}
        className={`session-bar session-bar-min${done ? ' done' : ''}${dragging ? ' dragging' : ''}`}
        style={style}
        role="region"
        aria-label="Practice session (minimized)"
        data-testid="session-bar-min"
      >
        <button
          type="button"
          className="session-drag"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-label="Move practice pill"
          title="Drag anywhere on screen"
          data-testid="session-drag"
        >
          ⠿
        </button>
        <button
          type="button"
          className="session-min-info"
          onClick={handleExpand}
          title={`${step.title} — tap to expand`}
          data-testid="session-expand"
        >
          <span className="session-min-step">{r.index + 1}/{r.session.steps.length}</span>
          <b className="readout">{timeText}</b>
        </button>
        <button
          type="button"
          className="btn sm session-icon-btn"
          onClick={prev}
          disabled={r.index === 0}
          aria-label="Previous step"
          title="Previous step"
          data-testid="session-prev"
        >
          ◂
        </button>
        <button
          type="button"
          className={`btn sm session-icon-btn${done ? ' primary' : ''}`}
          onClick={next}
          aria-label={last ? 'Finish session' : 'Next step'}
          title={last ? 'Finish session' : 'Next step'}
          data-testid="session-next"
        >
          {last ? '✓' : '▸'}
        </button>
        <button
          type="button"
          className="btn sm session-icon-btn"
          onClick={handleExpand}
          aria-label="Expand practice bar"
          title="Expand practice bar"
        >
          ⤢
        </button>
        <button
          type="button"
          className="btn sm session-icon-btn session-close-btn"
          onClick={handleClose}
          aria-label="End practice session"
          title="End practice session"
          data-testid="session-close"
        >
          ✕
        </button>
      </div>
    )
  }

  const floatingStyle = pos ? { left: pos.x, top: pos.y } : undefined

  return (
    <div
      ref={barRef}
      className={`session-bar${pos ? ' floating' : ''}${done ? ' done' : ''}${dragging ? ' dragging' : ''}`}
      style={floatingStyle}
      role="region"
      aria-label="Practice session"
      data-testid="session-bar"
    >
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

      <button
        type="button"
        className="session-drag"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label="Move practice bar"
        title="Drag to move anywhere on screen"
        data-testid="session-drag"
      >
        ⠿
      </button>

      <button
        type="button"
        className="session-main"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        title="Tap to show all steps"
      >
        <span className="small muted">
          {r.session.title} · step {r.index + 1}/{r.session.steps.length} · ~{remainingMin}m left {open ? '▴' : '▾'}
        </span>
        <b>{step.title}</b>
        {step.tip && <span className="session-cue small">{step.tip}</span>}
      </button>

      <div className="session-controls">
        <span className="session-time readout">{timeText}</span>
        <button
          type="button"
          className="btn sm session-icon-btn"
          onClick={prev}
          disabled={r.index === 0}
          aria-label="Previous step"
          title="Back to previous step"
          data-testid="session-prev"
        >
          ◂
        </button>
        <button
          type="button"
          className="btn sm session-icon-btn"
          onClick={() => pause(!r.paused)}
          aria-label={r.paused ? 'Carry on' : 'Pause'}
          title={r.paused ? 'Resume timer' : 'Pause timer'}
        >
          {r.paused ? <Ico n="play" fill /> : <Ico n="pause" />}
        </button>
        <button
          type="button"
          className={`btn sm${done ? ' primary' : ''}`}
          onClick={next}
          data-testid="session-next"
        >
          {last ? 'Finish ✓' : 'Next ▸'}
        </button>
        {pos && (
          <button
            type="button"
            className="btn sm session-icon-btn"
            onClick={dockTop}
            aria-label="Dock bar to top"
            title="Snap back to top"
            data-testid="session-dock"
          >
            ⤒
          </button>
        )}
        <button
          type="button"
          className="btn sm session-icon-btn"
          onClick={handleMinimize}
          aria-label="Minimize practice bar"
          title="Minimize into compact pill"
          data-testid="session-min"
        >
          —
        </button>
        <button
          type="button"
          className="btn sm session-icon-btn session-close-btn"
          onClick={handleClose}
          aria-label="End practice session"
          title="End practice session"
          data-testid="session-close"
        >
          ✕
        </button>
      </div>

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
            <button className="btn sm ghost" onClick={handleClose}>Stop the session</button>
          </div>
        </div>
      )}
    </div>
  )
}

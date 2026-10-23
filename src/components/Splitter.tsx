// A drag handle between two panels. Drag it to resize; drag a panel past its smallest size to tuck it away;
// tap the chevron to hide or show it. While dragging, only a CSS variable changes (no re-render), then the
// new size is saved when you let go.
import { useRef, useState, type PointerEvent as RPointerEvent, type KeyboardEvent } from 'react'

export interface SplitterProps {
  /** 'col': an upright bar dragged left/right; 'row': a flat bar dragged up/down */
  dir: 'col' | 'row'
  className?: string
  /** what it resizes, for screen readers and the hide button ("the video and readout") */
  name: string
  open: boolean
  /** the panel's size now, px */
  size: number
  /** +1: dragging right/down makes the panel bigger; -1: dragging left/up does */
  grow: 1 | -1
  min: number
  /** the largest size allowed right now (the rest of the screen still has to fit) */
  max: () => number
  /** the element whose CSS variable is updated while dragging */
  target: () => HTMLElement | null
  cssVar: string
  onSize: (px: number) => void
  onOpen: (open: boolean) => void
  /** shown on the bar while the panel is hidden */
  closedLabel: string
}

export function Splitter(p: SplitterProps) {
  const drag = useRef<{ start: number; size: number; id: number; moved: boolean; last: number } | null>(null)
  const [closing, setClosing] = useState(false)
  const pos = (e: RPointerEvent) => (p.dir === 'col' ? e.clientX : e.clientY)
  const clamp = (v: number) => Math.round(Math.min(Math.max(v, p.min), Math.max(p.min, p.max())))

  function down(e: RPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return
    if (!p.open) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { start: pos(e), size: p.size, id: e.pointerId, moved: false, last: p.size }
  }
  function move(e: RPointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const delta = (pos(e) - d.start) * p.grow
    if (Math.abs(delta) > 3) d.moved = true
    const raw = d.size + delta
    d.last = raw
    setClosing(raw < p.min - 56)
    p.target()?.style.setProperty(p.cssVar, `${clamp(raw)}px`)
    document.body.classList.add(p.dir === 'col' ? 'resizing-col' : 'resizing-row')
  }
  function up(e: RPointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    setClosing(false)
    document.body.classList.remove('resizing-col', 'resizing-row')
    if (!d.moved) return
    if (d.last < p.min - 56) { p.target()?.style.setProperty(p.cssVar, `${p.size}px`); p.onOpen(false) }
    else p.onSize(clamp(d.last))
  }
  function key(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 64 : 16
    const back = p.dir === 'col' ? 'ArrowLeft' : 'ArrowUp'
    const fwd = p.dir === 'col' ? 'ArrowRight' : 'ArrowDown'
    if (e.key === back || e.key === fwd) {
      e.preventDefault()
      if (!p.open) { p.onOpen(true); return }
      const dirn = (e.key === fwd ? 1 : -1) * p.grow
      p.onSize(clamp(p.size + dirn * step))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      p.onOpen(!p.open)
    }
  }
  const showHide = p.open ? `Hide ${p.name}` : `Show ${p.name}`
  // the chevron points the way the panel goes
  const arrow = p.dir === 'col' ? (p.open === (p.grow < 0) ? '›' : '‹') : (p.open === (p.grow < 0) ? '⌄' : '⌃')
  return (
    <div
      className={`splitter ${p.dir}${p.open ? '' : ' closed'}${closing ? ' closing' : ''}${p.className ? ' ' + p.className : ''}`}
      role="separator" aria-orientation={p.dir === 'col' ? 'vertical' : 'horizontal'} aria-label={`Resize ${p.name}`}
      aria-valuenow={p.open ? p.size : 0} aria-valuemin={0} tabIndex={0}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}
    >
      <span className="grip" aria-hidden />
      <button className="split-btn" onClick={() => p.onOpen(!p.open)} aria-label={showHide} title={showHide}>
        <span aria-hidden>{arrow}</span>{!p.open && <span className="split-label">{p.closedLabel}</span>}
      </button>
    </div>
  )
}

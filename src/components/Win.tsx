// Windows you can arrange yourself: every big section of a screen gets a slim title bar with
//   ☰  drag up or down to move it,   –  tuck it away,   and a ⇕ handle at the bottom to make it taller or shorter.
// Tucked-away windows wait as buttons in a tray at the bottom of the screen: tap one to bring it back.
// "Reset layout" puts everything back. Everything is remembered per screen (kg:win:<area>).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

interface Layout { order: string[]; hidden: string[]; height: Record<string, number>; moved?: boolean }
const EMPTY: Layout = { order: [], hidden: [], height: {} }
interface Ctx {
  area: string
  layout: Layout
  register: (id: string, title: string) => void
  unregister: (id: string) => void
  set: (f: (l: Layout) => Layout) => void
  dragging: string | null
  startDrag: (id: string, e: React.PointerEvent) => void
}
const C = createContext<Ctx | null>(null)

function load(area: string): Layout {
  try { const v = JSON.parse(localStorage.getItem(`kg:win:${area}`) ?? 'null') as Layout | null; if (v && Array.isArray(v.order)) return { ...EMPTY, ...v } } catch { /* fall through */ }
  return EMPTY
}

/** A screen (or page) whose sections can be moved, resized and tucked away. */
export function WinArea({ area, children, className = '', defaultHidden = [] }: { area: string; children: ReactNode; className?: string; defaultHidden?: string[] }) {
  const first = (): Layout => { const l = load(area); return l === EMPTY ? { ...EMPTY, hidden: defaultHidden } : l }
  const [layout, setLayout] = useState<Layout>(first)
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [dragging, setDragging] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { setLayout(first()) }, [area]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = useCallback((f: (l: Layout) => Layout) => setLayout(l => {
    const n = f(l)
    try { localStorage.setItem(`kg:win:${area}`, JSON.stringify(n)) } catch { /* storage full */ }
    return n
  }), [area])
  const regOrder = useRef<string[]>([])
  const register = useCallback((id: string, title: string) => {
    if (!regOrder.current.includes(id)) regOrder.current.push(id)
    setTitles(t => (t[id] === title ? t : { ...t, [id]: title }))
    set(l => (l.order.includes(id) ? l : { ...l, order: [...l.order, id] }))
  }, [set])
  const unregister = useCallback((id: string) => setTitles(t => { const n = { ...t }; delete n[id]; return n }), [])
  // drag a window by its ☰ grip: it swaps places with the window under your finger
  const startDrag = useCallback((id: string, e: React.PointerEvent) => {
    e.preventDefault()
    setDragging(id)
    const move = (ev: PointerEvent) => {
      const el = box.current
      if (!el) return
      const wins = [...el.querySelectorAll<HTMLElement>(':scope > .win')].filter(w => w.dataset.win !== id)
      let target: string | null = null, before = true
      for (const w of wins) {
        const r = w.getBoundingClientRect()
        if (ev.clientY >= r.top && ev.clientY <= r.bottom) { target = w.dataset.win!; before = ev.clientY < r.top + r.height / 2; break }
      }
      if (!target) return
      set(l => {
        const o = l.order.filter(x => x !== id)
        const i = o.indexOf(target!)
        if (i < 0) return l
        o.splice(before ? i : i + 1, 0, id)
        return o.join() === l.order.join() ? l : { ...l, order: o, moved: true }
      })
    }
    const up = () => { setDragging(null); removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up) }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  }, [set])
  const ctx = useMemo(() => ({ area, layout, register, unregister, set, dragging, startDrag }), [area, layout, register, unregister, set, dragging, startDrag])
  const hidden = layout.hidden.filter(id => titles[id])
  const changed = layout.hidden.length > 0 || Object.keys(layout.height).length > 0 || !!layout.moved
  return (
    <C.Provider value={ctx}>
      <LayoutHint />
      <div className={`win-area ${className}`} ref={box}>{children}</div>
      {(hidden.length > 0 || changed) && (
        <div className="win-tray" role="toolbar" aria-label="Tucked-away windows">
          {hidden.map(id => (
            <button key={id} className="win-chip" onClick={() => set(l => ({ ...l, hidden: l.hidden.filter(x => x !== id) }))}>▢ {titles[id]}</button>
          ))}
          <button className="win-chip reset" onClick={() => set(l => ({ ...EMPTY, hidden: defaultHidden, order: [...l.order].sort((a, b) => regOrder.current.indexOf(a) - regOrder.current.indexOf(b)) }))}>Reset layout</button>
        </div>
      )}
    </C.Provider>
  )
}

/** One movable, resizable window. Outside a WinArea it's just its content in a panel. */
export function Win({ id, title, children, className = 'panel', bodyClass = '', bodyStyle, resizable = true, minHeight = 90 }: { id: string; title: string; children: ReactNode; className?: string; bodyClass?: string; bodyStyle?: React.CSSProperties; resizable?: boolean; minHeight?: number }) {
  const ctx = useContext(C)
  const body = useRef<HTMLDivElement>(null)
  useEffect(() => { ctx?.register(id, title); return () => ctx?.unregister(id) }, [id, title]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!ctx) return <section className={className}><div className={`win-body ${bodyClass}`} style={bodyStyle}>{children}</div></section>
  const { layout, set, dragging, startDrag } = ctx
  if (layout.hidden.includes(id)) return null
  const order = layout.order.indexOf(id)
  const h = layout.height[id]
  const resize = (e: React.PointerEvent) => {
    e.preventDefault()
    const el = body.current
    if (!el) return
    const startY = e.clientY, startH = el.getBoundingClientRect().height
    const move = (ev: PointerEvent) => {
      const nh = Math.max(minHeight, Math.round(startH + ev.clientY - startY))
      set(l => ({ ...l, height: { ...l.height, [id]: nh } }))
    }
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up) }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  }
  return (
    <section className={`win ${className}${dragging === id ? ' dragging' : ''}`} data-win={id} style={{ order: order < 0 ? 99 : order }}>
      <div className="win-bar">
        <button className="win-grip" onPointerDown={e => startDrag(id, e)} aria-label={`Move ${title}: drag up or down`} title="Drag to move">☰ <span className="win-word">Move</span></button>
        <span className="win-title">{title}</span>
        {h !== undefined && <button className="win-btn" onClick={() => set(l => { const height = { ...l.height }; delete height[id]; return { ...l, height } })} title="Full size" aria-label={`${title}: full size`}>⤢</button>}
        <button className="win-btn" onClick={() => set(l => ({ ...l, hidden: [...l.hidden, id] }))} title="Tuck away (it waits in the tray at the bottom)" aria-label={`Tuck away ${title}`}>– <span className="win-word">Hide</span></button>
      </div>
      <div className={`win-body ${bodyClass}${h !== undefined ? ' sized' : ''}`} ref={body} style={h !== undefined ? { ...bodyStyle, height: h } : bodyStyle}>{children}</div>
      {resizable && <div className="win-size" onPointerDown={resize} role="separator" aria-label={`Drag to make ${title} taller or shorter`} title="Drag to resize">⇕ drag to resize</div>}
    </section>
  )
}

/** Bring a tucked-away window back and scroll to it (e.g. a "Volumes" button opening the Mix window). */
export function useWinShow() {
  const ctx = useContext(C)
  return (id: string) => {
    ctx?.set(l => ({ ...l, hidden: l.hidden.filter(x => x !== id) }))
    setTimeout(() => document.querySelector(`[data-win="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }
}

/** Shown once (until "Got it"): how to move, resize and hide the boxes. */
export function LayoutHint({ text }: { text?: string }) {
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem('kg:layoutHint') === '1' } catch { return true } })
  if (seen) return null
  return (
    <div className="layout-hint" role="note">
      <span>{text ?? 'You can arrange this screen: drag ☰ Move to put a box higher or lower, drag ⇕ under a box to make it taller or shorter, and tap – Hide to tuck it into the tray at the bottom (tap it there to bring it back).'}</span>
      <button className="btn sm" onClick={() => { try { localStorage.setItem('kg:layoutHint', '1') } catch { /* noop */ } setSeen(true) }}>Got it</button>
    </div>
  )
}

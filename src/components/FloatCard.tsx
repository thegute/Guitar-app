// The floating card shell every card uses (the hand, chord now & next, mini neck, tuner, mini video …): drag its bar to
// move it anywhere, drag the corner to resize it, – shrinks it to a small bubble, × hides it. It's drawn on the page
// itself above everything else (a portal, z-index 65), so no window or panel can cover it, and the card touched last
// comes to the front. When it sits over the note you're on it fades a little, but it still takes taps: tapping it
// makes it solid again. Its place and size are remembered per card for narrow screens (the Fold's cover) and wide ones.
import { useEffect, useRef, useState, type PointerEvent as RPE, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { bringToFront } from '../float/bus'
import { Ico, type IconName } from './Icon'

interface Place { x: number; y: number; w: number; h?: number; min: boolean }
const sizeClass = () => (typeof innerWidth === 'number' && innerWidth < 600 ? 'narrow' : 'wide')
// the hand card keeps the finger box's old remembered places
const KEY = (id: string, where: string) => (id === 'hand' ? `kg:fingerBox:${where}:${sizeClass()}` : `kg:floatPlace:${id}:${where}:${sizeClass()}`)
function stored(id: string, where: string): Place | null {
  try { const v = JSON.parse(localStorage.getItem(KEY(id, where)) ?? 'null') as Place | null; if (v && typeof v.x === 'number') return v } catch { /* default */ }
  return null
}

/** Until you move it yourself: the corner of the tab or highway (or of the screen) that covers the fewest buttons and notes. */
export function autoPlace(w: number, h: number, skip: number, self?: Element | null): { x: number; y: number } | null {
  if (typeof document === 'undefined') return null
  const tab = document.querySelector('.play-tab, .tab-view, .game-highway')?.getBoundingClientRect()
  const W = innerWidth, H = innerHeight
  const spots: { left: number; top: number }[] = []
  if (tab && tab.width > 0) spots.push({ left: tab.right - w - 6, top: tab.top + 6 }, { left: tab.right - w - 6, top: tab.bottom - h - 6 }, { left: tab.left + 6, top: tab.bottom - h - 6 }, { left: tab.left + 6, top: tab.top + 6 })
  spots.push({ left: W - w - 4, top: H * 0.68 }, { left: W - w - 4, top: H * 0.3 }, { left: 4, top: H * 0.5 })
  // then every spot down both edges, so with several cards there's always a free one
  for (let f = 0.04; f < 0.9; f += 0.06) spots.push({ left: W - w - 4, top: H * f }, { left: 4, top: H * f })
  // and anywhere on the screen, for when the edges are full
  for (let fy = 0.04; fy < 0.9; fy += 0.1) for (let fx = 0.1; fx < 0.9; fx += 0.15) spots.push({ left: W * fx, top: H * fy })
  // what it shouldn't cover: buttons, the notes, and (much more) the other floating cards
  const things = [...document.querySelectorAll('button, [role=tab], input, select, a, .tab-note, .tab-cursor')]
    .filter(el => !el.closest('[data-self]'))
    .map(el => ({ r: el.getBoundingClientRect(), wt: 1 }))
  for (const el of document.querySelectorAll('.float-card, .float-bubble')) if (el !== self) things.push({ r: el.getBoundingClientRect(), wt: 60 })
  const cur = document.querySelector('.tab-cursor')
  if (cur) things.push({ r: cur.getBoundingClientRect(), wt: 25 })
  let best: { left: number; top: number; c: number } | null = null
  // a second card starts at a different spot from the first
  const order = spots.map((_, i) => (i + skip) % spots.length)
  for (const i of order) {
    const sp = spots[i]
    const l = Math.max(4, Math.min(W - w - 4, sp.left)), t = Math.max(4, Math.min(H - h - 4, sp.top))
    let c = 0
    for (const { r, wt } of things) {
      if (r.width <= 0 || r.height <= 0) continue
      const ix = Math.min(l + w, r.right) - Math.max(l, r.left), iy = Math.min(t + h, r.bottom) - Math.max(t, r.top)
      if (ix > 0 && iy > 0) c += (wt * ix * iy) / Math.max(1, Math.min(r.width * r.height, w * h))
    }
    if (!best || c < best.c - 0.05) best = { left: l, top: t, c }
  }
  return best ? { x: (best.left + w) / W, y: best.top / H } : null
}

interface Props {
  id: string
  /** the screen it lives on (its remembered place) */
  where: string
  title: ReactNode
  /** short words on the bubble when it's shrunk */
  bubble: ReactNode
  icon: IconName
  children: ReactNode
  /** × : hide this card (it can come back from the card picker) */
  onHide?: () => void
  /** width it starts at */
  width?: number
  minW?: number
  /** a gold edge (something is about to happen: a shift, a chord change) */
  alert?: boolean
  /** fade when it covers the note you're on */
  dodgeCursor?: boolean
  label?: string
  testId?: string
  bubbleTestId?: string
  /** the nth card shown (so they don't all start in one corner) */
  order?: number
}

export function FloatCard(p: Props) {
  return createPortal(<FloatCardIn {...p} />, document.body)
}

function FloatCardIn({ id, where, title, bubble, icon, children, onHide, width = 240, minW = 160, alert, dodgeCursor, label, testId, bubbleTestId, order = 0 }: Props) {
  const fresh = (): Place => stored(id, where) ?? { x: 0.98, y: Math.min(0.85, 0.3 + order * 0.14), w: Math.min(width, Math.round((typeof innerWidth === 'number' ? innerWidth : 400) * 0.6)), min: false }
  const [place, setPlace] = useState<Place>(fresh)
  const [z, setZ] = useState(() => bringToFront())
  const cls = useRef(sizeClass())
  useEffect(() => {
    const f = () => { if (sizeClass() !== cls.current) { cls.current = sizeClass(); setPlace(fresh()) } else setPlace(p => ({ ...p })) }
    addEventListener('resize', f)
    return () => removeEventListener('resize', f)
  }, [id, where]) // eslint-disable-line react-hooks/exhaustive-deps
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (stored(id, where)) return
    const t = setTimeout(() => {
      const el = box.current
      const sp = autoPlace(el?.offsetWidth ?? 220, el?.offsetHeight ?? 150, order, el)
      if (sp && !stored(id, where)) setPlace(p => ({ ...p, ...sp }))
    }, 350 + order * 160)
    return () => clearTimeout(t)
  }, [id, where, place.min, cls.current]) // eslint-disable-line react-hooks/exhaustive-deps
  // a card you haven't moved yourself that grows into another card (its chord shape appears, the song changes) finds a free spot again
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let t = 0
    const ro = new ResizeObserver(() => {
      clearTimeout(t)
      t = window.setTimeout(() => {
        if (stored(id, where) || !box.current) return
        const a = box.current.getBoundingClientRect()
        const hit = [...document.querySelectorAll('.float-card, .float-bubble')].some(o => {
          if (o === box.current) return false
          const b = o.getBoundingClientRect()
          return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
        })
        if (!hit) return
        const sp = autoPlace(box.current.offsetWidth, box.current.offsetHeight, order, box.current)
        if (sp) setPlace(p => ({ ...p, ...sp }))
      }, 200)
    })
    ro.observe(el)
    return () => { ro.disconnect(); clearTimeout(t) }
  }, [id, where, order, place.min])
  const save =(pl: Place) => { setPlace(pl); try { localStorage.setItem(KEY(id, where), JSON.stringify(pl)) } catch { /* full */ } }
  // fade (but keep taking taps) while it sits over the note you're on; a tap makes it solid for a while
  const [dodge, setDodge] = useState(false)
  const awake = useRef(0)
  useEffect(() => {
    if (!dodgeCursor) return
    const t = setInterval(() => {
      const el = box.current, cur = document.querySelector('.tab-cursor')
      if (!el || !cur || Date.now() < awake.current) { setDodge(false); return }
      const a = el.getBoundingClientRect(), c = cur.getBoundingClientRect()
      setDodge(c.width > 0 && a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top)
    }, 250)
    return () => clearInterval(t)
  }, [dodgeCursor])
  const touch = () => { setZ(bringToFront()); awake.current = Date.now() + 4000; setDodge(false) }

  const W = Math.max(minW, Math.min(place.w, innerWidth - 16))
  const left = (bw: number) => Math.max(4, Math.min(innerWidth - bw - 4, place.x * innerWidth - bw))
  const top = (bh: number) => Math.max(4, Math.min(innerHeight - bh - 4, place.y * innerHeight))
  const drag = (e: RPE, mode: 'move' | 'size') => {
    if ((e.target as HTMLElement).closest('button') && mode === 'move') return
    e.preventDefault()
    touch()
    const el = box.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const sx = e.clientX, sy = e.clientY
    const p0 = { ...place }
    let last = p0
    const mv = (ev: PointerEvent) => {
      if (mode === 'move') last = { ...p0, x: Math.min(1, Math.max(0, (r.right + ev.clientX - sx) / innerWidth)), y: Math.min(0.97, Math.max(0, (r.top + ev.clientY - sy) / innerHeight)) }
      else last = { ...p0, w: Math.max(minW, Math.min(innerWidth - 16, r.width + ev.clientX - sx)), x: Math.min(1, (r.right + ev.clientX - sx) / innerWidth) }
      setPlace(last)
    }
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); save(last) }
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up)
  }

  if (place.min) {
    return (
      <button className="float-bubble" data-self style={{ left: left(130), top: top(40), zIndex: 65 + z }} onClick={() => { touch(); save({ ...place, min: false }) }}
        aria-label={`Show ${typeof title === 'string' ? title : 'the card'}`} data-testid={bubbleTestId ?? `float-bubble-${id}`}>
        <Ico n={icon} /> {bubble}
      </button>
    )
  }
  return (
    <div className={`float-card${alert ? ' alert' : ''}${dodge ? ' dodge' : ''}`} data-self ref={box} style={{ width: W, left: left(W), top: top(150), zIndex: 65 + z }}
      onPointerDownCapture={touch} data-testid={testId ?? `float-${id}`} role="region" aria-label={label ?? (typeof title === 'string' ? title : undefined)}>
      <div className="fc-bar" onPointerDown={e => drag(e, 'move')} title="Drag to move">
        <span className="fc-grip" aria-hidden>⠿</span>
        <b>{title}</b>
        <button className="fc-btn" onClick={() => save({ ...place, min: true })} aria-label="Shrink to a bubble" title="Shrink">–</button>
        {onHide && <button className="fc-btn" onClick={onHide} aria-label="Hide this card" title="Hide (bring it back from Cards)">×</button>}
      </div>
      {children}
      <div className="fc-size" onPointerDown={e => drag(e, 'size')} title="Drag to resize" aria-label="Drag to resize" role="separator">◢</div>
    </div>
  )
}

// The floating looper button, on every page: tap for the looper card (loaded on first use), drag it anywhere. While
// the looper plays its edge flashes with the beat, gold on the 1. Settings → Look can hide it (`kg:looperBubble`).
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { usePersist } from '../components/Controls'
import { Ico } from '../components/Icon'

const Card = lazy(() => import('./FloatingCard'))
const Pulse = lazy(() => import('./BubblePulse'))

export function FloatingLooper() {
  const read = () => { try { return JSON.parse(localStorage.getItem('kg:looperBubble') ?? 'true') as boolean } catch { return true } }
  const [on, setOn] = useState(read)
  useEffect(() => { const f = () => setOn(read()); addEventListener('kg-bubble', f); return () => removeEventListener('kg-bubble', f) }, [])
  const [open, setOpen] = useState(false)
  const [used, setUsed] = useState(false)
  const [y, setY] = usePersist('looperBubbleY', 0.7)
  const [side, setSide] = usePersist<'left' | 'right'>('looperBubbleSide', 'left')
  const [x, setX] = useState<number | null>(null)
  const drag = useRef<{ x0: number; y0px: number; y0: number; moved: boolean } | null>(null)
  const dragged = useRef(false)
  const btn = useRef<HTMLButtonElement>(null)
  // the looper may be playing from another screen: pulse once it exists
  useEffect(() => { if (localStorage.getItem('kg:looper')) setUsed(true) }, [])
  if (!on) return null
  const top = `calc(${Math.round(y * 100)}% - 24px)`
  const place = x !== null ? { left: x - 24, right: 'auto' } : side === 'left' ? { left: 10, right: 'auto' } : { right: 10, left: 'auto' }
  return (
    <>
      <button ref={btn} className={`looper-bubble${open ? ' open' : ''}`} style={{ top, ...place }} aria-label="Looper" data-testid="looper-bubble"
        onPointerDown={e => { drag.current = { x0: e.clientX, y0px: e.clientY, y0: y, moved: false }; try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* fine */ } }}
        onPointerMove={e => {
          const d = drag.current
          if (!d) return
          if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0px) > 14) d.moved = true
          if (d.moved) { setY(Math.max(0.08, Math.min(0.88, d.y0 + (e.clientY - d.y0px) / innerHeight))); setX(e.clientX) }
        }}
        onPointerUp={e => { const d = drag.current; drag.current = null; dragged.current = !!d?.moved; if (d?.moved) { setSide(e.clientX < innerWidth / 2 ? 'left' : 'right'); setX(null) } }}
        onPointerCancel={() => { drag.current = null; setX(null) }}
        onClick={() => { if (dragged.current) { dragged.current = false; return } setUsed(true); setOpen(o => !o) }}>
        <Ico n="loop" />
      </button>
      {used && <Suspense fallback={null}><Pulse target={btn} /></Suspense>}
      {open && <Suspense fallback={null}><div className={`float-looper-wrap ${side}`}><Card onClose={() => setOpen(false)} /></div></Suspense>}
    </>
  )
}

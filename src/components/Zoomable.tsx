// Pinch to zoom: two fingers make the thing under them bigger or smaller (fretboards, chord shapes, the circle of
// fifths, the tab …). One finger still scrolls and taps as usual. Zoom is remembered per place.
import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react'
import { usePersist } from './Controls'

/**
 * Two-finger pinch (and ctrl + wheel / trackpad pinch on a computer) on `ref`'s element. Calls `set` with the new
 * scale and keeps the point between the fingers where it was. `scroller`: the element that scrolls (default: ref).
 */
export function usePinch(ref: RefObject<HTMLElement | null>, get: () => number, set: (z: number) => void, opts: { min?: number; max?: number; scroller?: RefObject<HTMLElement | null> } = {}) {
  const min = opts.min ?? 1, max = opts.max ?? 3
  const live = useRef({ get, set })
  live.current = { get, set }
  const anchor = useRef<{ cx: number; cy: number; x: number; y: number; z: number } | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let start: { d: number; z: number } | null = null
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const remember = (clientX: number, clientY: number, z: number) => {
      const sc = opts.scroller?.current ?? el
      const r = sc.getBoundingClientRect()
      // where (in unzoomed content pixels) the fingers are, so it stays under them
      anchor.current = { cx: clientX - r.left, cy: clientY - r.top, x: (sc.scrollLeft + clientX - r.left) / z, y: (sc.scrollTop + clientY - r.top) / z, z }
    }
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        start = { d: dist(e.touches), z: live.current.get() }
        remember((e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2, start.z)
      }
    }
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !start) return
      e.preventDefault()
      const z = Math.max(min, Math.min(max, start.z * (dist(e.touches) / start.d)))
      if (anchor.current) anchor.current.z = z
      live.current.set(Math.round(z * 100) / 100)
    }
    const onEnd = (e: TouchEvent) => { if (e.touches.length < 2) start = null }
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const z0 = live.current.get()
      const z = Math.max(min, Math.min(max, z0 * Math.exp(-e.deltaY / 200)))
      remember(e.clientX, e.clientY, z0)
      if (anchor.current) anchor.current.z = z
      live.current.set(Math.round(z * 100) / 100)
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
      el.removeEventListener('wheel', onWheel)
    }
  }, [ref, min, max, opts.scroller])
  /** call after the new scale has been drawn: scrolls so the pinched point stays under the fingers */
  return () => {
    const a = anchor.current
    const sc = opts.scroller?.current ?? ref.current
    if (!a || !sc) return
    sc.scrollLeft = a.x * a.z - a.cx
    sc.scrollTop = a.y * a.z - a.cy
  }
}

/** A box whose contents you can pinch to zoom and then scroll around in. A "1×" button puts it back. */
export function Zoomable({ id, children, max = 3, className = '' }: { id: string; children: ReactNode; max?: number; className?: string }) {
  const [z, setZ] = usePersist(`zoom:${id}`, 1)
  const box = useRef<HTMLDivElement>(null)
  const keep = usePinch(box, () => z, setZ, { min: 1, max })
  useLayoutEffect(() => { keep() }, [z]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`zoomable-wrap ${className}`}>
      <div className={`zoomable${z > 1.02 ? ' zoomed' : ''}`} ref={box}>
        <div className="zoom-inner" style={{ zoom: z }}>{children}</div>
      </div>
      {z > 1.02 && <ZoomReset onClick={() => setZ(1)} />}
    </div>
  )
}

export function ZoomReset({ onClick }: { onClick: () => void }) {
  return <button className="zoom-reset" onClick={onClick} aria-label="Zoom back out">1×</button>
}

/** Pinch zoom for one drawing (an SVG with a fixed size): returns the scale, the box to put it in and a reset button. */
export function useZoomBox(id: string, max = 3) {
  const [z, setZ] = usePersist(`zoom:${id}`, 1)
  const box = useRef<HTMLDivElement>(null)
  const keep = usePinch(box, () => z, setZ, { min: 1, max })
  useLayoutEffect(() => { keep() }, [z]) // eslint-disable-line react-hooks/exhaustive-deps
  return { z, box, reset: z > 1.02 ? <ZoomReset onClick={() => setZ(1)} /> : null }
}

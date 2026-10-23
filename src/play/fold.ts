// Foldable phones: notice when the Fold is half-folded like a little laptop ("tabletop" / Flex mode),
// so Play can put the video on the top half and the tab on the bottom half.
import { useEffect, useState } from 'react'

export interface Posture { tabletop: boolean; top: number; hinge: number }

interface Segments { segments?: DOMRect[] }

function read(): Posture {
  const vp = (window as Window & { viewport?: Segments }).viewport
  const segs = vp?.segments
  if (segs && segs.length === 2) {
    const [a, b] = segs[0].top <= segs[1].top ? segs : [segs[1], segs[0]]
    // stacked one above the other = folded along a horizontal line
    if (a.bottom <= b.top + 1 && Math.abs(a.left - b.left) < 4) return { tabletop: true, top: a.bottom, hinge: Math.max(0, b.top - a.bottom) }
  }
  if (typeof matchMedia !== 'undefined' && matchMedia('(vertical-viewport-segments: 2)').matches) {
    return { tabletop: true, top: Math.round(innerHeight / 2), hinge: 0 }
  }
  return { tabletop: false, top: 0, hinge: 0 }
}

export function useFoldPosture(): Posture {
  const [p, setP] = useState<Posture>(() => (typeof window === 'undefined' ? { tabletop: false, top: 0, hinge: 0 } : read()))
  useEffect(() => {
    const update = () => setP(prev => { const n = read(); return n.tabletop === prev.tabletop && n.top === prev.top && n.hinge === prev.hinge ? prev : n })
    window.addEventListener('resize', update)
    const mq = matchMedia('(vertical-viewport-segments: 2)')
    mq.addEventListener?.('change', update)
    const dp = (navigator as Navigator & { devicePosture?: EventTarget }).devicePosture
    dp?.addEventListener?.('change', update)
    return () => { window.removeEventListener('resize', update); mq.removeEventListener?.('change', update); dp?.removeEventListener?.('change', update) }
  }, [])
  return p
}

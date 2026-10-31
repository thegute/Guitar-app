// The little ✨ helper bubble on every screen: tap it to ask a question (or search) without leaving what you're doing.
// Drag it anywhere to move it out of the way (it snaps to the nearest side); hide it in Settings → You.
import { useEffect, useRef, useState } from 'react'
import { askAssistant, type AskContext } from './bus'
import { usePersist } from '../components/Controls'

export function AskBubble({ context }: { context: AskContext }) {
  const read = () => { try { return JSON.parse(localStorage.getItem('kg:askBubble') ?? 'true') as boolean } catch { return true } }
  const [show, setShow] = useState(read)
  useEffect(() => { const f = () => setShow(read()); addEventListener('kg-bubble', f); return () => removeEventListener('kg-bubble', f) }, [])
  const [y, setY] = usePersist('askBubbleY', 0.72)
  const [side, setSide] = usePersist<'left' | 'right'>('askBubbleSide', 'right')
  const [x, setX] = useState<number | null>(null)
  const drag = useRef<{ start: number; y0: number; moved: boolean } | null>(null)
  const [, force] = useState(0)
  if (!show) return null
  return (
    <button className="ask-bubble" style={{ top: `calc(${Math.round(y * 100)}% - 28px)`, ...(x !== null ? { left: x - 26, right: 'auto' } : side === 'left' ? { left: 10, right: 'auto' } : {}) }} aria-label="Ask the helper (or search)"
      onPointerDown={e => { drag.current = { start: e.clientY, y0: y, moved: false }; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={e => {
        const d = drag.current
        if (!d) return
        const dy = e.clientY - d.start
        if (Math.abs(dy) > 6) d.moved = true
        if (d.moved || Math.abs(e.clientX - (side === 'left' ? 36 : innerWidth - 36)) > 30) d.moved = true
        if (d.moved) { setY(Math.max(0.08, Math.min(0.92, d.y0 + dy / innerHeight))); setX(e.clientX); force(n => n + 1) }
      }}
      onPointerUp={e => { const d = drag.current; drag.current = null; if (d && d.moved) { setSide(e.clientX < innerWidth / 2 ? 'left' : 'right'); setX(null) } else if (d) askAssistant('', context, false) }}
      onPointerCancel={() => { drag.current = null }}>
      <span aria-hidden>✨</span>
    </button>
  )
}

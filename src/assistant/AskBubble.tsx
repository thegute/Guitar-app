// The little ✨ helper bubble on every screen: tap it to ask a question (or search) without leaving what you're doing.
// Drag it up or down to move it out of the way; hide it in Settings → You.
import { useEffect, useRef, useState } from 'react'
import { askAssistant, type AskContext } from './bus'
import { usePersist } from '../components/Controls'

export function AskBubble({ context }: { context: AskContext }) {
  const read = () => { try { return JSON.parse(localStorage.getItem('kg:askBubble') ?? 'true') as boolean } catch { return true } }
  const [show, setShow] = useState(read)
  useEffect(() => { const f = () => setShow(read()); addEventListener('kg-bubble', f); return () => removeEventListener('kg-bubble', f) }, [])
  const [y, setY] = usePersist('askBubbleY', 0.72)
  const drag = useRef<{ start: number; y0: number; moved: boolean } | null>(null)
  const [, force] = useState(0)
  if (!show) return null
  return (
    <button className="ask-bubble" style={{ top: `calc(${Math.round(y * 100)}% - 28px)` }} aria-label="Ask the helper (or search)"
      onPointerDown={e => { drag.current = { start: e.clientY, y0: y, moved: false }; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={e => {
        const d = drag.current
        if (!d) return
        const dy = e.clientY - d.start
        if (Math.abs(dy) > 6) d.moved = true
        if (d.moved) { setY(Math.max(0.12, Math.min(0.9, d.y0 + dy / innerHeight))); force(x => x + 1) }
      }}
      onPointerUp={() => { const d = drag.current; drag.current = null; if (d && !d.moved) askAssistant('', context, false) }}
      onPointerCancel={() => { drag.current = null }}>
      <span aria-hidden>✨</span>
    </button>
  )
}

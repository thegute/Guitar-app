// A turning knob (the pad pitch dial, Koala style): drag up/right to turn it up, down/left to turn it down, or move
// round it in a circle; every value in between, with a light pull to whole steps (the tick marks) so a note is easy to
// land on. Double-tap puts it back to the middle. Arrow keys: whole steps (Shift: fine). −/+ buttons for exact steps.
import { useRef, useState } from 'react'

export function Dial({ value, min, max, onChange, onCommit, label, format, snap = 1, size = 112, reset = 0 }: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  /** when a drag ends (or a key/button changes it) */
  onCommit?: (v: number) => void
  label: string
  format?: (v: number) => string
  /** whole-step size for the ticks and the pull */
  snap?: number
  size?: number
  reset?: number
}) {
  const drag = useRef<{ x: number; y: number; v: number; ang: number | null; last: number } | null>(null)
  const lastTap = useRef(0)
  const [active, setActive] = useState(false)
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  // a gentle pull to whole steps: within 6% of a step it lands on it
  const pull = (v: number) => { const r = Math.round(v / snap) * snap; return Math.abs(v - r) < snap * 0.06 ? r : Math.round(v * 100) / 100 }
  const set = (v: number) => onChange(pull(clamp(v)))
  const frac = (value - min) / (max - min)
  // the knob turns through 270°, from bottom-left to bottom-right
  const angOf = (f: number) => -135 + f * 270
  const R = size / 2, rr = R - 10
  const pt = (deg: number, r: number) => { const a = ((deg - 90) * Math.PI) / 180; return [R + r * Math.cos(a), R + r * Math.sin(a)] }
  const arc = (from: number, to: number, r: number) => {
    const [x1, y1] = pt(from, r), [x2, y2] = pt(to, r)
    return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`
  }
  const zeroF = (reset - min) / (max - min)
  const ticks: number[] = []
  for (let v = Math.ceil(min / snap) * snap; v <= max + 1e-9; v += snap) ticks.push(v)
  const angleAt = (e: React.PointerEvent, el: Element) => {
    const b = el.getBoundingClientRect()
    return (Math.atan2(e.clientX - (b.left + b.width / 2), -(e.clientY - (b.top + b.height / 2))) * 180) / Math.PI
  }
  return (
    <div className="dial" style={{ width: size }}>
      <svg
        width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={format ? format(value) : String(value)}
        className={`dial-knob${active ? ' on' : ''}`} style={{ touchAction: 'none' }}
        onPointerDown={e => {
          const now = Date.now()
          if (now - lastTap.current < 320) { onChange(reset); onCommit?.(reset); lastTap.current = 0; return }
          lastTap.current = now
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          const b = e.currentTarget.getBoundingClientRect()
          const d = Math.hypot(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2))
          // grabbed near the rim: turn it round; near the middle: drag up/down
          drag.current = { x: e.clientX, y: e.clientY, v: value, ang: d > R * 0.62 ? angleAt(e, e.currentTarget) : null, last: value }
          setActive(true)
        }}
        onPointerMove={e => {
          const g = drag.current
          if (!g) return
          let v: number
          if (g.ang !== null) {
            let da = angleAt(e, e.currentTarget) - g.ang
            if (da > 180) da -= 360
            if (da < -180) da += 360
            g.ang += da
            v = g.v + (da / 270) * (max - min)
            g.v = v
          } else {
            // 240 px of drag = the whole range
            v = g.v + ((e.clientX - g.x - (e.clientY - g.y)) / 240) * (max - min)
          }
          g.last = pull(clamp(v))
          set(v)
        }}
        onPointerUp={() => { const g = drag.current; drag.current = null; setActive(false); if (g) onCommit?.(g.last) }}
        onPointerCancel={() => { drag.current = null; setActive(false) }}
        onKeyDown={e => {
          const step = e.shiftKey ? snap / 20 : snap
          let v: number | null = null
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') v = value + step
          if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') v = value - step
          if (e.key === 'Home') v = reset
          if (v !== null) { e.preventDefault(); const w = Math.round(clamp(v) * 100) / 100; onChange(w); onCommit?.(w) }
        }}
      >
        <path d={arc(-135, 135, rr)} className="dial-track" />
        {Math.abs(frac - zeroF) > 0.002 && <path d={frac > zeroF ? arc(angOf(zeroF), angOf(frac), rr) : arc(angOf(frac), angOf(zeroF), rr)} className="dial-fill" />}
        {ticks.map(t => { const a = angOf((t - min) / (max - min)); const [x1, y1] = pt(a, rr + 5); const [x2, y2] = pt(a, rr + (t % (snap * 12) === 0 ? 9 : 7)); return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} className={t === reset ? 'dial-tick zero' : 'dial-tick'} /> })}
        <circle cx={R} cy={R} r={rr - 9} className="dial-cap" />
        {(() => { const [x1, y1] = pt(angOf(frac), rr - 26); const [x2, y2] = pt(angOf(frac), rr - 11); return <line x1={x1} y1={y1} x2={x2} y2={y2} className="dial-pointer" /> })()}
        <text x={R} y={R + 5} textAnchor="middle" className="dial-val">{format ? format(value) : value}</text>
      </svg>
      <div className="dial-steps">
        <button className="btn sm ghost" onClick={() => { const v = clamp(Math.ceil(value / snap - 1e-6) * snap - snap); onChange(v); onCommit?.(v) }} aria-label={`${label}: down a step`}>−</button>
        <span className="small muted">{label}</span>
        <button className="btn sm ghost" onClick={() => { const v = clamp(Math.floor(value / snap + 1e-6) * snap + snap); onChange(v); onCommit?.(v) }} aria-label={`${label}: up a step`}>+</button>
      </div>
    </div>
  )
}

// The effects pad: pick an effect, touch and drag (filter, echo, reverb, stutter, crush, gate) over the beat and the
// loops; Latch keeps it on. Used in the beat maker and the looper.
import { useEffect, useRef, useState } from 'react'
import { audio } from '../audio/engine'
import { haptic } from '../audio/tapFeel'
import { usePersist } from '../components/Controls'
import { Ico } from '../components/Icon'
import { FX, type FxKind } from './fx'
import type { StudioTransport } from './transport'

export function FxPad({ t, playing, play }: { t: StudioTransport; playing: boolean; play: (c?: number) => void }) {
  const [kind, setKind] = usePersist<FxKind>('studioFx', 'filter')
  const [latch, setLatch] = usePersist('studioFxLatch', false)
  const [on, setOn] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const xy = (e: React.PointerEvent) => { const r = box.current!.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)) } }
  useEffect(() => () => t.fx.release(), [t])
  const info = FX.find(f => f.id === kind)!
  return (
    <>
      <div className="st-fx-kinds" role="group" aria-label="Effect">
        {FX.map(f => <button key={f.id} className={`chip${kind === f.id ? ' on' : ''}`} aria-pressed={kind === f.id} onClick={() => { t.fx.release(); setOn(false); setPos(null); setKind(f.id) }}>{f.label}</button>)}
      </div>
      <div className={`st-xy${on ? ' on' : ''}`} ref={box} data-testid="fx-pad" role="application" aria-label={`${info.label} effect pad: drag your finger around`}
        onPointerDown={e => {
          e.preventDefault()
          try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ }
          void audio().resume()
          const p = xy(e)
          if (latch && on) { t.fx.move(p.x, p.y); setPos(p); return }
          haptic('medium')
          t.fx.engage(kind, p.x, p.y); setOn(true); setPos(p)
        }}
        onPointerMove={e => { if (!on || e.buttons === 0) return; const p = xy(e); t.fx.move(p.x, p.y); setPos(p) }}
        onPointerUp={() => { if (!latch) { t.fx.release(); setOn(false); setPos(null) } }}
        onPointerCancel={() => { if (!latch) { t.fx.release(); setOn(false); setPos(null) } }}>
        {pos && <span className="st-xy-dot" style={{ left: `${pos.x * 100}%`, top: `${(1 - pos.y) * 100}%` }} aria-hidden />}
        <span className="st-xy-x small">{info.x}</span>
        <span className="st-xy-y small">{info.y} ↑</span>
        {!on && <span className="st-xy-hint">{playing ? 'Touch and drag' : 'Press ▶, then touch and drag'}</span>}
      </div>
      <div className="row" style={{ gap: 8 }}>
        {!playing && <button className="btn sm" onClick={() => play(0)}><Ico n="play" fill /> Play the beat</button>}
        <label className="ex-check"><input type="checkbox" checked={latch} onChange={e => { setLatch(e.target.checked); if (!e.target.checked) { t.fx.release(); setOn(false); setPos(null) } }} /> Latch: keep it on when I let go</label>
        {latch && on && <button className="btn sm" onClick={() => { t.fx.release(); setOn(false); setPos(null) }}>Effect off</button>}
      </div>
      <p className="small muted" style={{ margin: 0 }}>The effect goes over the whole beat and your loops while your finger is down, then back to normal (echo and reverb ring out). Stutter repeats the bit you touched, on the beat.</p>
        </>
  )
}

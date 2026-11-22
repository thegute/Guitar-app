// "Check it in the picture": ONE floating window (move, resize, shrink to a bubble, hide; remembered) that shows the
// spot in the scanned picture where the selected note was read, with an amber ring round it. Pick another note (or
// "Next unsure") and the same window jumps there, switching picture if that note came from a different strip.
// Zoom with + / − or a pinch; drag the picture sideways to look around.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FloatCard } from '../components/FloatCard'
import { usePinch } from '../components/Zoomable'
import type { SongNote } from '../tabs/model'

export interface ScanSource { url: string; w: number; h: number }
type Src = NonNullable<SongNote['src']>

const BAND = 110 // the staff's height on screen at 1×

export function SourcePeek({ sources, src, label, unsure, onHide }: { sources: ScanSource[]; src: Src; label: string; unsure: boolean; onHide: () => void }) {
  const pic = sources[src.p]
  const view = useRef<HTMLDivElement>(null)
  const [z, setZ] = useState(() => { try { return Math.min(5, Math.max(0.5, Number(localStorage.getItem('kg:scanPicZoom')) || 1.4)) } catch { return 1.4 } })
  const setZoom = (v: number) => { const c = Math.min(5, Math.max(0.5, v)); setZ(c); try { localStorage.setItem('kg:scanPicZoom', String(c)) } catch { /* storage off */ } }
  const [tick, setTick] = useState(0) // + / − buttons re-centre on the note; a pinch keeps the spot under the fingers
  const zoomBy = (v: number) => { setZoom(v); setTick(t => t + 1) }
  const keep = usePinch(view, () => z, setZoom, { min: 0.5, max: 5 })
  useLayoutEffect(() => { keep() }, [z]) // eslint-disable-line react-hooks/exhaustive-deps

  // the picture is scaled so the staff (y0…y1) is BAND × zoom tall
  const band = Math.max(1, (src.y1 - src.y0) * (pic?.h ?? 1))
  const scale = (BAND * z) / band
  const W = (pic?.w ?? 1) * scale, H = (pic?.h ?? 1) * scale
  const ring = Math.max(18, Math.min(60, (BAND * z) / 4))

  // centre the note whenever another note is picked (or a zoom button is pressed)
  useEffect(() => {
    const v = view.current
    if (!v) return
    v.scrollLeft = Math.max(0, src.x * W - v.clientWidth / 2)
    v.scrollTop = Math.max(0, src.y * H - v.clientHeight / 2)
  }, [src.p, src.x, src.y, src.y0, src.y1, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  // drag to look around (a mouse; fingers scroll the box natively)
  const drag = useRef<{ x: number; y: number; l: number; t: number } | null>(null)
  if (!pic) return null
  return (
    <FloatCard id="scanpic" where="scan" title="Check it in the picture" icon="image" alert={unsure} onHide={onHide} width={320} minW={200} openNarrow
      testId="scan-source" bubbleTestId="scan-source-chip" label={`The scanned picture at ${label}`} bubble={<>Picture · {label}</>}>
      <div className="scan-src stack" style={{ gap: 4 }}>
        <div className="scan-src-view" ref={view} data-testid="scan-source-view"
          style={{ height: Math.min(320, BAND * z + 24) }}
          onMouseDown={e => { const v = view.current; if (v) drag.current = { x: e.clientX, y: e.clientY, l: v.scrollLeft, t: v.scrollTop } }}
          onMouseMove={e => { const d = drag.current, v = view.current; if (d && v) { v.scrollLeft = d.l - (e.clientX - d.x); v.scrollTop = d.t - (e.clientY - d.y) } }}
          onMouseUp={() => { drag.current = null }} onMouseLeave={() => { drag.current = null }}>
          <div style={{ position: 'relative', width: W, height: H }}>
            <img src={pic.url} alt={`Scanned tab picture ${src.p + 1}`} draggable={false} style={{ width: W, height: H, display: 'block' }} />
            <span className={`scan-src-ring${unsure ? ' unsure' : ''}`} data-testid="scan-source-ring"
              style={{ left: src.x * W - ring / 2, top: src.y * H - ring / 2, width: ring, height: ring }} />
          </div>
        </div>
        <div className="row small" style={{ gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="muted">{label}{sources.length > 1 ? ` · picture ${src.p + 1} of ${sources.length}` : ''}</span>
          <span className="row" style={{ gap: 4 }}>
            <button className="btn sm ghost" onClick={() => zoomBy(z / 1.25)} aria-label="Zoom out" data-testid="scan-source-out">−</button>
            <button className="btn sm ghost" onClick={() => zoomBy(1.4)} aria-label="Normal size">1×</button>
            <button className="btn sm ghost" onClick={() => zoomBy(z * 1.25)} aria-label="Zoom in" data-testid="scan-source-in">+</button>
          </span>
        </div>
      </div>
    </FloatCard>
  )
}

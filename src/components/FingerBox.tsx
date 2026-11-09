// "Where your fingers go": a small floating window you can drag anywhere, resize from its corner, and tuck into a
// chip. It shades the four frets your hand covers ("Index on fret 5"), shows every note with the finger that plays
// it in the finger colours (1 blue, 2 green, 3 orange, 4 red, open white, the same as Game Mode), and two beats
// before the hand has to move it shows where to ("Shift → fret 7") with a ghost of the next box, the reason, and a
// button to loop just that shift.
import { useEffect, useRef, useState, type PointerEvent as RPE } from 'react'
import { createPortal } from 'react-dom'
import type { HandGroup } from '../play/handShape'
import type { SongNote } from '../tabs/model'
import { Ico } from './Icon'

interface Props {
  group: HandGroup
  next: HandGroup | null
  /** beats until the next hand position starts (Infinity when it's far) */
  beatsToShift: number
  expected: SongNote[]
  nStr: number
  stringNames: string[]
  onLoopShift?: () => void
  /** screen it lives on, for its remembered place (kg:fingerBox:<where>) */
  where?: string
}

interface Place { x: number; y: number; w: number; min: boolean }
// remembered separately for narrow screens (the Fold's cover) and wide ones (inner screen, tablet): the layouts differ
const sizeClass = () => (typeof innerWidth === 'number' && innerWidth < 600 ? 'narrow' : 'wide')
const KEY = (w: string) => `kg:fingerBox:${w}:${sizeClass()}`
const stored = (w: string): Place | null => {
  try { const v = JSON.parse(localStorage.getItem(KEY(w)) ?? 'null') as Place | null; if (v && typeof v.x === 'number') return v } catch { /* default */ }
  return null
}
const load = (w: string): Place => stored(w) ?? { x: 0.98, y: 0.68, w: Math.min(260, Math.round((typeof innerWidth === 'number' ? innerWidth : 400) * 0.56)), min: false }

/** Until you move it yourself: the corner of the tab (or of the screen) that covers the fewest buttons and notes. */
function autoPlace(w: number, h: number): { x: number; y: number } | null {
  if (typeof document === 'undefined') return null
  const tab = document.querySelector('.play-tab, .tab-view, .game-highway')?.getBoundingClientRect()
  const W = innerWidth, H = innerHeight
  const spots: { left: number; top: number }[] = []
  if (tab && tab.width > 0) {
    spots.push({ left: tab.right - w - 6, top: tab.top + 6 }, { left: tab.right - w - 6, top: tab.bottom - h - 6 }, { left: tab.left + 6, top: tab.bottom - h - 6 }, { left: tab.left + 6, top: tab.top + 6 })
  }
  spots.push({ left: W - w - 4, top: H * 0.68 }, { left: W - w - 4, top: H * 0.3 })
  const things = [...document.querySelectorAll('button, [role=tab], input, select, a, .tab-note, .tab-cursor')]
    .filter(el => !el.closest('.finger-box, .finger-chip'))
    .map(el => el.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0)
  let best: { left: number; top: number; c: number } | null = null
  for (const sp of spots) {
    const l = Math.max(4, Math.min(W - w - 4, sp.left)), t = Math.max(4, Math.min(H - h - 4, sp.top))
    let c = 0
    for (const r of things) {
      const ix = Math.min(l + w, r.right) - Math.max(l, r.left), iy = Math.min(t + h, r.bottom) - Math.max(t, r.top)
      if (ix > 0 && iy > 0) c += (ix * iy) / Math.max(1, r.width * r.height)
    }
    if (!best || c < best.c - 0.05) best = { left: l, top: t, c }
  }
  return best ? { x: (best.left + w) / W, y: best.top / H } : null
}

export const FINGER_NAMES = ['open', 'index', 'middle', 'ring', 'pinky']

/** It floats over everything (a portal on the page itself), so nothing on the screen can cover it. */
export function FingerBox(p: Props) {
  return createPortal(<FingerBoxIn {...p} />, document.body)
}

function FingerBoxIn({ group, next, beatsToShift, expected, nStr, stringNames, onLoopShift, where = 'play' }: Props) {
  const [place, setPlace] = useState<Place>(() => load(where))
  // folding or unfolding the phone switches to that screen's remembered place
  const cls = useRef(sizeClass())
  useEffect(() => {
    const f = () => { if (sizeClass() !== cls.current) { cls.current = sizeClass(); setPlace(load(where)) } }
    addEventListener('resize', f)
    return () => removeEventListener('resize', f)
  }, [where])
  const box = useRef<HTMLDivElement>(null)
  // not moved yet on this screen size: find a free corner once the page has laid out (and when the Fold opens/closes)
  useEffect(() => {
    if (stored(where)) return
    const id = setTimeout(() => {
      const el = box.current
      const sp = autoPlace(el?.offsetWidth ?? 220, el?.offsetHeight ?? 150)
      if (sp && !stored(where)) setPlace(p => ({ ...p, ...sp }))
    }, 350)
    return () => clearTimeout(id)
  }, [where, place.min, cls.current]) // eslint-disable-line react-hooks/exhaustive-deps
  const save = (p: Place) => { setPlace(p); try { localStorage.setItem(KEY(where), JSON.stringify(p)) } catch { /* full */ } }
  // keep it on screen when the phone turns or the Fold opens
  const [, setVp] = useState(0)
  useEffect(() => { const f = () => setVp(v => v + 1); addEventListener('resize', f); return () => removeEventListener('resize', f) }, [])
  // when it sits over the note you're on, it fades and lets taps through to the tab
  const [dodge, setDodge] = useState(false)
  useEffect(() => {
    const id = setInterval(() => {
      const el = box.current, cur = document.querySelector('.tab-cursor')
      if (!el || !cur) { setDodge(false); return }
      const a = el.getBoundingClientRect(), c = cur.getBoundingClientRect()
      setDodge(c.width > 0 && a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top)
    }, 250)
    return () => clearInterval(id)
  }, [])
  const W = Math.max(170, Math.min(place.w, innerWidth - 16))
  const left = (bw: number) => Math.max(4, Math.min(innerWidth - bw - 4, place.x * innerWidth - bw))
  const top = (bh: number) => Math.max(4, Math.min(innerHeight - bh - 4, place.y * innerHeight))
  const drag = (e: RPE, mode: 'move' | 'size') => {
    if ((e.target as HTMLElement).closest('button') && mode === 'move') return
    e.preventDefault()
    const el = box.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const sx = e.clientX, sy = e.clientY
    const p0 = { ...place }
    let last = p0
    const mv = (ev: PointerEvent) => {
      if (mode === 'move') last = { ...p0, x: Math.min(1, Math.max(0, (r.right + ev.clientX - sx) / innerWidth)), y: Math.min(0.97, Math.max(0, (r.top + ev.clientY - sy) / innerHeight)) }
      else last = { ...p0, w: Math.max(170, Math.min(innerWidth - 16, r.width + ev.clientX - sx)), x: Math.min(1, (r.right + ev.clientX - sx) / innerWidth) }
      setPlace(last)
    }
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); save(last) }
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up)
  }
  const shiftSoon = !!next && beatsToShift <= 2 && (next.base !== group.base || next.open !== group.open)
  if (place.min) {
    return (
      <button className="finger-chip" style={{ left: left(120), top: top(40) }} onClick={() => save({ ...place, min: false })} aria-label="Show where your fingers go" data-testid="finger-chip">
        <Ico n="hand" /> {group.open ? 'Open' : `Fret ${group.base}`}{shiftSoon ? ` → ${next!.open ? 'open' : next!.base}` : ''}
      </button>
    )
  }
  // the neck: one fret before the box to two after, so the shift and its ghost box fit
  const lo = Math.max(1, Math.min(group.base, next && shiftSoon ? next.base : group.base) - (group.open ? 0 : 1))
  const hi = Math.max(group.base + 3, next && shiftSoon ? next.base + 3 : 0) + 1
  const frets = hi - lo + 1
  const L = 22, T = 16, FW = Math.max(26, (W - L - 12) / frets), SG = 13
  const SW = L + FW * frets + 6, SH = T + SG * (nStr - 1) + 10
  const y = (s: number) => T + (nStr - 1 - s) * SG
  const x = (f: number) => (f === 0 ? L - 9 : L + (f - lo) * FW + FW / 2)
  const isNext = (s: number, f: number) => expected.some(n => n.string === s && n.fret === f)
  const boxX = (b: number) => L + (b - lo) * FW
  const label = group.open ? 'First position' : `Index on fret ${group.base}`
  return (
    <div className={`finger-box${shiftSoon ? ' shift-soon' : ''}${dodge ? ' dodge' : ''}`} ref={box} style={{ width: W, left: left(W), top: top(150) }} data-testid="finger-box" role="region" aria-label={`Where your fingers go: ${label}`}>
      <div className="fbx-bar" onPointerDown={e => drag(e, 'move')} title="Drag to move">
        <span className="fbx-grip" aria-hidden>⠿</span>
        <b>{label}</b>
        <button className="fbx-btn" onClick={() => save({ ...place, min: true })} aria-label="Tuck the finger box away" title="Tuck away">–</button>
      </div>
      <svg width={SW} height={SH} viewBox={`0 0 ${SW} ${SH}`} className="fbx-neck" role="img"
        aria-label={`${label}. ${group.notes.filter(n => n.fret > 0).map(n => `${FINGER_NAMES[n.finger]} finger on ${stringNames[n.string]} string fret ${n.fret}`).join(', ')}`}>
        {/* the hand: four frets shaded */}
        <rect className="fbx-hand" x={boxX(group.base)} y={T - 9} width={FW * 4} height={SG * (nStr - 1) + 18} rx={6} />
        {shiftSoon && next && <rect className="fbx-ghost" x={boxX(next.base)} y={T - 9} width={FW * 4} height={SG * (nStr - 1) + 18} rx={6} />}
        {Array.from({ length: frets }, (_, i) => <text key={i} className="fbx-fretno" x={L + i * FW + FW / 2} y={T - 10} textAnchor="middle">{lo + i}</text>)}
        {Array.from({ length: nStr }, (_, s) => (
          <g key={s}>
            <text className="fbx-str" x={2} y={y(s) + 3.5}>{stringNames[s]}</text>
            <line className="fbx-line" x1={L} x2={L + FW * frets} y1={y(s)} y2={y(s)} />
          </g>
        ))}
        {Array.from({ length: frets + 1 }, (_, i) => <line key={i} className={i === 0 && lo === 1 ? 'fbx-nut' : 'fbx-fret'} x1={L + i * FW} x2={L + i * FW} y1={y(nStr - 1) - 2} y2={y(0) + 2} />)}
        {group.barre && <rect className={`fbx-barre fing-${group.barre.finger}`} x={x(group.barre.fret) - 5} y={y(Math.max(...group.barre.strings)) - 6} width={10} height={y(Math.min(...group.barre.strings)) - y(Math.max(...group.barre.strings)) + 12} rx={5} />}
        {group.notes.map(n => {
          if (n.fret > 0 && (n.fret < lo || n.fret > hi)) return null
          const nx = isNext(n.string, n.fret)
          return (
            <g key={`${n.string}-${n.fret}`} className={`fbx-dot fing-${n.fret === 0 ? 0 : n.finger}${nx ? ' next' : ''}`}>
              <circle cx={x(n.fret)} cy={y(n.string)} r={7} />
              <text x={x(n.fret)} y={y(n.string) + 3.5} textAnchor="middle">{n.fret === 0 ? '0' : n.finger}</text>
            </g>
          )
        })}
        {shiftSoon && next && <path className="fbx-arrow" d={`M ${boxX(group.base) + FW * 2} ${SH - 3} L ${boxX(next.base) + FW * 2} ${SH - 3}`} markerEnd="url(#fbx-head)" />}
        <defs><marker id="fbx-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" className="fbx-arrowhead" /></marker></defs>
      </svg>
      {shiftSoon && next ? (
        <div className="fbx-shift" role="status">
          <span className="fbx-badge">Upcoming shift → {next.open ? 'first position' : `fret ${next.base}`}</span>
          {next.why && <span className="small">{next.why}</span>}
          {onLoopShift && <button className="btn sm" onClick={onLoopShift} data-testid="loop-shift"><Ico n="loop" /> Loop this shift</button>}
        </div>
      ) : (
        <div className="fbx-legend small" aria-hidden>
          <i className="fing-1" />1 <i className="fing-2" />2 <i className="fing-3" />3 <i className="fing-4" />4 <i className="fing-0" />open
        </div>
      )}
      <div className="fbx-size" onPointerDown={e => drag(e, 'size')} title="Drag to resize" aria-label="Drag to make the finger box bigger or smaller" role="separator">◢</div>
    </div>
  )
}

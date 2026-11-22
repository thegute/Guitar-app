// Windows you can arrange yourself, in a tidy grid (and pop out as floating windows): every big section of a screen gets a slim title bar with
//   ☰  drag it anywhere in the grid (beside or between other windows),
//   − / + zoom its contents (70%–160%),   ❐  pop it out as a movable floating window (with ⤓ Dock back),   –  tuck it away,
//   and a ◢ corner handle: drag down for taller or shorter, drag sideways for narrower or wider. Widths snap to a third,
//   a half, two thirds or the full width, so narrow windows sit side by side and never overlap; on a narrow screen
//   (the Fold's cover, a phone) there's room for one column, so every window is full width and only the height changes.
// Phone (narrow) and tablet (wide) layouts are remembered separately (kg:win:<area>:narrow / :wide).
// Tucked-away and popped-out windows wait as buttons in a tray at the bottom of the screen: tap one to bring it back or dock it.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useHint } from './Fold'
import { FloatCard } from './FloatCard'

export type WinBucket = 'narrow' | 'wide'
export interface Layout {
  order: string[]
  hidden: string[]
  height: Record<string, number>
  moved?: boolean
  folded?: string[]
  /** share of the row (1/3, 1/2, 2/3, 1) */
  width?: Record<string, number>
  /** per-window content zoom (0.7–1.6, default 1) */
  zoom?: Record<string, number>
  /** windows currently popped out into floating cards */
  popped?: string[]
}
const EMPTY: Layout = { order: [], hidden: [], height: {} }

export const winBucket = (w?: number): WinBucket =>
  ((w ?? (typeof innerWidth === 'number' ? innerWidth : 800)) < 600 ? 'narrow' : 'wide')
export const winStorageKey = (area: string, bucket: WinBucket) => `kg:win:${area}:${bucket}`
export const clampWinZoom = (z: number) => Math.round(Math.max(0.7, Math.min(1.6, z)) * 100) / 100

export function loadWinLayout(area: string, bucket: WinBucket): Layout {
  try {
    const raw = localStorage.getItem(winStorageKey(area, bucket)) ?? localStorage.getItem(`kg:win:${area}`)
    const v = JSON.parse(raw ?? 'null') as Layout | null
    if (v && Array.isArray(v.order)) return { ...EMPTY, ...v }
  } catch { /* fall through */ }
  return EMPTY
}

interface Ctx {
  area: string
  layout: Layout
  register: (id: string, title: string) => void
  unregister: (id: string) => void
  set: (f: (l: Layout) => Layout) => void
  dragging: string | null
  startDrag: (id: string, e: React.PointerEvent) => void
  /** windows can be narrower than the row here (any screen wide enough for 2+ columns) */
  grid: boolean
  areaEl: () => HTMLDivElement | null
}
/** the widths a window snaps to */
export const WIDTHS = [1 / 3, 1 / 2, 2 / 3, 1]
const GAP = 10
/** the row is wide enough for two windows side by side */
const roomy = (w: number) => w >= 600
const C = createContext<Ctx | null>(null)

/** A screen (or page) whose sections can be moved, resized, zoomed, popped out as floating windows, and tucked away. */
/** `prefer`: the order windows go in by default (some only appear later, e.g. once songs have loaded); others follow in the order they appear */
export function WinArea({ area, children, className = '', defaultHidden = [], prefer }: { area: string; children: ReactNode; className?: string; defaultHidden?: string[]; prefer?: string[] }) {
  const [bucket, setBucket] = useState<WinBucket>(() => winBucket())
  useEffect(() => {
    const onResize = () => { const b = winBucket(); setBucket(cur => (cur === b ? cur : b)) }
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  }, [])
  const first = (a: string, b: WinBucket): Layout => {
    const l = loadWinLayout(a, b)
    return l === EMPTY ? { ...EMPTY, hidden: defaultHidden } : l
  }
  const [layout, setLayout] = useState<Layout>(() => first(area, bucket))
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [dragging, setDragging] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const [areaW, setAreaW] = useState(0)
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setAreaW(el.clientWidth))
    ro.observe(el)
    setAreaW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const grid = roomy(areaW)
  // reload layout when switching areas OR folding/unfolding between Phone (narrow) and Tablet (wide)
  const shownKey = useRef(`${area}:${bucket}`)
  useEffect(() => {
    const key = `${area}:${bucket}`
    if (shownKey.current === key) return
    shownKey.current = key
    setLayout(first(area, bucket))
  }, [area, bucket]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = useCallback((f: (l: Layout) => Layout) => setLayout(l => {
    const n = f(l)
    try { localStorage.setItem(winStorageKey(area, bucket), JSON.stringify(n)) } catch { /* storage full */ }
    return n
  }), [area, bucket])
  const regOrder = useRef<string[]>([])
  const register = useCallback((id: string, title: string) => {
    if (!regOrder.current.includes(id)) regOrder.current.push(id)
    setTitles(t => (t[id] === title ? t : { ...t, [id]: title }))
    // a new window: in its place on the page, unless you've rearranged the windows yourself (then at the end)
    set(l => {
      if (l.order.includes(id)) return l
      if (l.moved) return { ...l, order: [...l.order, id] }
      const at = (x: string) => { const p = prefer?.indexOf(x) ?? -1; if (p >= 0) return p; const i = regOrder.current.indexOf(x); return (prefer?.length ?? 0) + (i < 0 ? 999 : i) }
      return { ...l, order: [...l.order, id].sort((a, b) => at(a) - at(b)) }
    })
  }, [set]) // eslint-disable-line react-hooks/exhaustive-deps
  const unregister = useCallback((id: string) => setTitles(t => { const n = { ...t }; delete n[id]; return n }), [])
  // drag a window by its ☰ grip: it swaps places with the window under your finger
  const startDrag = useCallback((id: string, e: React.PointerEvent) => {
    e.preventDefault()
    setDragging(id)
    const move = (ev: PointerEvent) => {
      const el = box.current
      if (!el) return
      const wins = [...el.querySelectorAll<HTMLElement>('.win')].filter(w => w.dataset.win !== id && w.closest('.win-area') === el)
      let target: string | null = null, before = true
      const rowW = el.clientWidth
      for (const w of wins) {
        const r = w.getBoundingClientRect()
        // narrower than the row: beside it (left or right half); full width: above or below (top or bottom half)
        const beside = r.width < rowW * 0.9
        if (ev.clientY >= r.top && ev.clientY <= r.bottom && (!beside || (ev.clientX >= r.left && ev.clientX <= r.right))) {
          target = w.dataset.win!
          before = beside ? ev.clientX < r.left + r.width / 2 : ev.clientY < r.top + r.height / 2
          break
        }
      }
      if (!target) return
      set(l => {
        const o = l.order.filter(x => x !== id)
        const i = o.indexOf(target!)
        if (i < 0) return l
        o.splice(before ? i : i + 1, 0, id)
        return o.join() === l.order.join() ? l : { ...l, order: o, moved: true }
      })
    }
    const up = () => { setDragging(null); removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up) }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  }, [set])
  const areaEl = useCallback(() => box.current, [])
  const ctx = useMemo(() => ({ area, layout, register, unregister, set, dragging, startDrag, grid, areaEl }), [area, layout, register, unregister, set, dragging, startDrag, grid, areaEl])
  const hidden = layout.hidden.filter(id => titles[id])
  const popped = (layout.popped ?? []).filter(id => titles[id] && !layout.hidden.includes(id))
  const changed =
    layout.hidden.length > 0 ||
    popped.length > 0 ||
    Object.keys(layout.height).length > 0 ||
    Object.keys(layout.width ?? {}).length > 0 ||
    Object.keys(layout.zoom ?? {}).length > 0 ||
    !!layout.moved ||
    !!layout.folded?.length
  return (
    <C.Provider value={ctx}>
      <LayoutHint />
      <div className={`win-area ${className}${grid ? ' win-grid' : ''}`} ref={box}>{children}</div>
      {(hidden.length > 0 || popped.length > 0 || changed) && (
        <div className="win-tray" role="toolbar" aria-label="Tucked-away and floating windows">
          {hidden.map(id => (
            <button key={id} className="win-chip" onClick={() => set(l => ({ ...l, hidden: l.hidden.filter(x => x !== id) }))}>▢ {titles[id]}</button>
          ))}
          {popped.map(id => (
            <button key={`pop-${id}`} className="win-chip" onClick={() => set(l => ({ ...l, popped: (l.popped ?? []).filter(x => x !== id) }))} title="Dock back into page">⤓ Dock {titles[id]}</button>
          ))}
          <button className="win-chip reset" onClick={() => set(l => ({ ...EMPTY, hidden: defaultHidden, order: [...l.order].sort((a, b) => regOrder.current.indexOf(a) - regOrder.current.indexOf(b)) }))}>Reset layout</button>
        </div>
      )}
    </C.Provider>
  )
}

/** One movable, resizable, zoomable, pop-out window. Outside a WinArea it's just its content in a panel. */
export function Win({ id, title, children, className = 'panel', bodyClass = '', bodyStyle, resizable = true, minHeight = 90, hint, extra }: {
  id: string; title: string; children: ReactNode; className?: string; bodyClass?: string; bodyStyle?: React.CSSProperties; resizable?: boolean; minHeight?: number
  /** an ⓘ on the title bar that opens a short explanation */
  hint?: ReactNode
  /** small controls on the title bar (right side, before Hide) */
  extra?: ReactNode
}) {
  const ctx = useContext(C)
  const body = useRef<HTMLDivElement>(null)
  const [hintBtn, hintText] = useHint(hint ?? '')
  useEffect(() => { ctx?.register(id, title); return () => ctx?.unregister(id) }, [id, title]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!ctx) return <section className={className}>{hint ? <div className="hint-head"><h2 style={{ margin: 0 }}>{title}</h2>{hintBtn}</div> : null}{hintText}<div className={`win-body ${bodyClass}`} style={bodyStyle}>{children}</div></section>
  const { area, layout, set, dragging, startDrag, grid, areaEl } = ctx
  if (layout.hidden.includes(id)) return null
  const order = layout.order.indexOf(id)
  const folded = (layout.folded ?? []).includes(id)
  const popped = (layout.popped ?? []).includes(id)
  const h = layout.height[id]
  const w = grid ? layout.width?.[id] : undefined
  const z = clampWinZoom(layout.zoom?.[id] ?? 1)

  const setZoom = (next: number) => {
    const clamped = clampWinZoom(next)
    set(l => {
      const zoom = { ...(l.zoom ?? {}) }
      if (clamped === 1) delete zoom[id]
      else zoom[id] = clamped
      return { ...l, zoom }
    })
  }
  const popOut = () => set(l => ({ ...l, popped: [...new Set([...(l.popped ?? []), id])] }))
  const dockBack = () => set(l => ({ ...l, popped: (l.popped ?? []).filter(x => x !== id) }))

  if (popped) {
    return (
      <FloatCard
        id={`win-${area}-${id}`}
        where={`win-${area}`}
        title={title}
        bubble={title}
        icon="expand"
        width={460}
        minW={220}
        openNarrow
        onHide={dockBack}
        headerExtra={
          <button
            type="button"
            className="fc-btn fc-dock-btn"
            onClick={dockBack}
            title="Dock back into page"
            aria-label={`Dock ${title} back into page`}
            data-testid={`win-dock-${id}`}
          >
            ⤓ Dock
          </button>
        }
      >
        {hint ? hintText : null}
        <div className={`win-body ${bodyClass}`} style={{ ...bodyStyle, ...(z !== 1 ? { zoom: z } : {}) }}>
          {children}
        </div>
      </FloatCard>
    )
  }

  // the ◢ corner: down/up = height, sideways = width (snapped to a third, a half, two thirds or full; only where there's room)
  const resize = (e: React.PointerEvent) => {
    e.preventDefault()
    const el = body.current
    const win = (e.currentTarget as HTMLElement).closest('.win') as HTMLElement | null
    if (!el || !win) return
    const startY = e.clientY, startX = e.clientX, startH = el.getBoundingClientRect().height, startW = win.getBoundingClientRect().width
    const rowW = areaEl()?.clientWidth ?? startW
    let sideways = false
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - startY, dx = ev.clientX - startX
      if (Math.abs(dy) > 6) {
        const nh = Math.max(minHeight, Math.round(startH + dy))
        set(l => (l.height[id] === nh ? l : { ...l, height: { ...l.height, [id]: nh } }))
      }
      if (grid && (sideways || Math.abs(dx) > 24)) {
        sideways = true
        const want = (startW + dx + GAP) / (rowW + GAP)
        const snap = WIDTHS.reduce((b, f) => (Math.abs(f - want) < Math.abs(b - want) ? f : b), 1)
        set(l => ((l.width?.[id] ?? 1) === snap ? l : { ...l, width: { ...(l.width ?? {}), [id]: snap } }))
      }
    }
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up) }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  }
  const mergedBodyStyle: React.CSSProperties | undefined =
    h !== undefined || z !== 1
      ? { ...bodyStyle, ...(h !== undefined ? { height: h } : {}), ...(z !== 1 ? { zoom: z } : {}) }
      : bodyStyle
  return (
    <section className={`win ${className}${dragging === id ? ' dragging' : ''}${w !== undefined && w < 1 ? ' part' : ''}`} data-win={id}
      style={{ order: order < 0 ? 99 : order, ...(w !== undefined ? { flex: `0 0 calc(${w * 100}% - ${GAP * (1 - w)}px)`, maxWidth: `calc(${w * 100}% - ${GAP * (1 - w)}px)` } : {}) }}>
      <div className="win-bar">
        <button className="win-grip" onPointerDown={e => startDrag(id, e)} aria-label={`Move ${title}: drag up or down`} title="Drag to move">☰ <span className="win-word">Move</span></button>
        <button className="win-title" onClick={() => set(l => { const f = l.folded ?? []; return { ...l, folded: f.includes(id) ? f.filter(x => x !== id) : [...f, id] } })}
          aria-expanded={!folded} title={folded ? 'Tap to open' : 'Tap to fold it up'}>
          <span className="win-chev" aria-hidden>{folded ? '▸' : '▾'}</span> {title}{folded && <span className="small muted"> (tap to open)</span>}
        </button>
        {hint ? hintBtn : null}
        {extra && <span className="win-extra">{extra}</span>}
        {!folded && (
          <span className="win-zoom" role="group" aria-label={`Zoom ${title}`}>
            <button className="win-btn win-zbtn" onClick={() => setZoom(z - 0.1)} title="Zoom out" aria-label={`Zoom out ${title}`} data-testid={`win-zout-${id}`}>−</button>
            {z !== 1 && <button className="win-btn win-zpct tabular" onClick={() => setZoom(1)} title="Reset zoom to 100%">{Math.round(z * 100)}%</button>}
            <button className="win-btn win-zbtn" onClick={() => setZoom(z + 0.1)} title="Zoom in" aria-label={`Zoom in ${title}`} data-testid={`win-zin-${id}`}>+</button>
          </span>
        )}
        <button className="win-btn" onClick={popOut} title="Pop out as a movable floating window" aria-label={`Float ${title}`} data-testid={`win-float-${id}`}>❐</button>
        {(h !== undefined || w !== undefined || z !== 1) && (
          <button className="win-btn" onClick={() => set(l => {
            const height = { ...l.height }; delete height[id]
            const width = { ...(l.width ?? {}) }; delete width[id]
            const zoom = { ...(l.zoom ?? {}) }; delete zoom[id]
            return { ...l, height, width, zoom }
          })} title="Back to its own size & zoom" aria-label={`${title}: back to its own size`}>⤢</button>
        )}
        <button className="win-btn" onClick={() => set(l => ({ ...l, hidden: [...l.hidden, id] }))} title="Tuck away (it waits in the tray at the bottom)" aria-label={`Tuck away ${title}`}>– <span className="win-word">Hide</span></button>
      </div>
      {!folded && hint ? hintText : null}
      {!folded && <div className={`win-body ${bodyClass}${h !== undefined ? ' sized' : ''}`} ref={body} style={mergedBodyStyle}>{children}</div>}
      {resizable && !folded && (
        <div className={`win-size${grid ? ' both' : ''}`} onPointerDown={resize} role="separator"
          aria-label={grid ? `Drag to resize ${title}: down for taller, sideways for wider or narrower` : `Drag to make ${title} taller or shorter`} title="Drag to resize">
          {grid ? '◢ drag to resize' : '⇕ drag to resize'}
        </div>
      )}
    </section>
  )
}

/** Bring a tucked-away window back and scroll to it (e.g. a "Volumes" button opening the Mix window). */
export function useWinShow() {
  const ctx = useContext(C)
  return (id: string) => {
    ctx?.set(l => ({ ...l, hidden: l.hidden.filter(x => x !== id) }))
    setTimeout(() => document.querySelector(`[data-win="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }
}

/** "Arrange" mode: on by default so every box shows its ☰ Move, – Hide and ◢ resize handles (and Play's panel Move buttons).
 *  Can still be tucked off via the Arrange switch; remembered (kg:arrange). CSS keys off html[data-arrange]. */
const arrangeOn = () => { try { return localStorage.getItem('kg:arrange') !== '0' } catch { return true } }
export function setArrange(on: boolean) {
  try { localStorage.setItem('kg:arrange', on ? '1' : '0') } catch { /* noop */ }
  if (typeof document !== 'undefined') { if (on) document.documentElement.dataset.arrange = '1'; else delete document.documentElement.dataset.arrange }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('kg:arrange'))
}
if (typeof document !== 'undefined') { if (arrangeOn()) document.documentElement.dataset.arrange = '1'; else delete document.documentElement.dataset.arrange }

const HOW = 'You can arrange this screen. Tap a box\'s name to fold it up (tap again to open it). Drag ☰ Move to put a box somewhere else (on a big screen, beside another one). Drag the handle under a box down for taller, or sideways for narrower so boxes sit side by side. – Hide tucks it into the tray at the bottom (tap it there to bring it back).'

/** The Arrange switch on its own (Play keeps it in Options so its screen gets no extra row). */
export function ArrangeSwitch() {
  const [on, setOn] = useState(arrangeOn)
  useEffect(() => { const f = () => setOn(arrangeOn()); window.addEventListener('kg:arrange', f); return () => window.removeEventListener('kg:arrange', f) }, [])
  return (
    <button className="arrange-toggle" aria-pressed={on} onClick={() => setArrange(!on)} title="Show or hide the Move, Hide and resize handles on each box">
      <span aria-hidden>⠿</span> Arrange{on ? ': on' : ''}
    </button>
  )
}

/** A slim bar at the top of an arrangeable screen: the Arrange switch, and (until "Got it") a one-line tip that opens into the full how-to.
 *  `quiet`: no bar at all once the tip has been dismissed (Play: the switch lives in its Options). */
export function LayoutHint({ text, quiet }: { text?: string; quiet?: boolean }) {
  const [seen, setSeen] = useState(() => { try { return localStorage.getItem('kg:layoutHint') === '1' } catch { return true } })
  const [open, setOpen] = useState(false)
  if (seen && quiet) return null
  return (
    <div className={`layout-bar${seen ? '' : ' layout-hint'}`} role={seen ? undefined : 'note'}>
      {!seen && (
        <span className="layout-tip">
          <span aria-hidden>💡</span> You can rearrange this screen.{' '}
          <button className="linkish" onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? 'Less' : 'How?'}</button>
          {open && <span className="layout-how">{' '}{(text ?? HOW)}</span>}
        </span>
      )}
      <span className="layout-actions">
        <ArrangeSwitch />
        {!seen && <button className="btn sm" onClick={() => { try { localStorage.setItem('kg:layoutHint', '1') } catch { /* noop */ } setSeen(true) }}>Got it</button>}
      </span>
    </div>
  )
}

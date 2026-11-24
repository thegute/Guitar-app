// ChromeBar: makes any top banner, screen hero header, or bottom footer hidable (with a glowing edge restore pill),
// freely resizable in L × W (height & width), and adjustable with a ◐ opacity meter — remembered separately for
// Phone (<600px), Small Tablet / Fold (600–959px), and Full Tablet (960px+).
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { winBucket, type WinBucket } from './Win'

export interface ChromeState {
  hidden?: boolean
  opacity?: number
  /** width fraction 0.35..1.0 */
  w?: number
  /** custom height in px */
  h?: number
}

export const clampChromeOpacity = (v: number) => Math.round(Math.max(0.2, Math.min(1, v)) * 100) / 100
export const clampChromeWidth = (v: number) => Math.round(Math.max(0.35, Math.min(1, v)) * 100) / 100
export const clampChromeHeight = (v: number, minH = 34, maxH = 320) => Math.round(Math.max(minH, Math.min(maxH, v)))
export const chromeStorageKey = (id: string, bucket: WinBucket) => `kg:chrome:${id}:${bucket}`

export function loadChromeState(id: string, bucket: WinBucket): ChromeState {
  try {
    const raw = localStorage.getItem(chromeStorageKey(id, bucket))
    const v = JSON.parse(raw ?? 'null') as ChromeState | null
    if (v && typeof v === 'object') {
      return {
        hidden: !!v.hidden,
        opacity: typeof v.opacity === 'number' ? clampChromeOpacity(v.opacity) : undefined,
        w: typeof v.w === 'number' ? clampChromeWidth(v.w) : undefined,
        h: typeof v.h === 'number' ? Math.round(v.h) : undefined,
      }
    }
  } catch { /* private */ }
  return {}
}

export function saveChromeState(id: string, bucket: WinBucket, st: ChromeState) {
  try {
    if (!st.hidden && st.opacity === undefined && st.w === undefined && st.h === undefined) {
      localStorage.removeItem(chromeStorageKey(id, bucket))
    } else {
      localStorage.setItem(chromeStorageKey(id, bucket), JSON.stringify(st))
    }
  } catch { /* storage full */ }
}

interface ChromeBarProps {
  id: string
  label: string
  edge: 'top' | 'bottom'
  /** horizontal dock spot for the glowing restore pill so hidden bars never overlap the top-left 3-line menu button */
  pillAlign?: 'left' | 'center' | 'right'
  minH?: number
  maxH?: number
  className?: string
  /** optional extra portal guard (e.g. false when parent screen is inactive) */
  active?: boolean
  children: ReactNode
}

export function ChromeBar({
  id, label, edge, pillAlign = 'right', minH = 34, maxH = 260, className = '', active = true, children,
}: ChromeBarProps) {
  const [bucket, setBucket] = useState<WinBucket>(() => winBucket())
  const [st, setSt] = useState<ChromeState>(() => loadChromeState(id, winBucket()))
  const [opOpen, setOpOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onResize = () => {
      const next = winBucket()
      setBucket(cur => {
        if (cur === next) return cur
        setSt(loadChromeState(id, next))
        return next
      })
    }
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  }, [id])

  const update = useCallback((fn: (cur: ChromeState) => ChromeState) => {
    setSt(cur => {
      const next = fn(cur)
      saveChromeState(id, bucket, next)
      return next
    })
  }, [id, bucket])

  if (!active) return null

  const op = st.opacity ?? 1
  const modified = st.opacity !== undefined || st.w !== undefined || st.h !== undefined

  if (st.hidden) {
    if (typeof document === 'undefined') return null
    return createPortal(
      <button
        type="button"
        className={`chrome-glow-pill edge-${edge} align-${pillAlign}`}
        onClick={() => update(c => ({ ...c, hidden: false }))}
        aria-label={`Show ${label}`}
        title={`Tap to show ${label}`}
        data-testid={`chrome-restore-${id}`}
      >
        <span className="chrome-glow-dot" aria-hidden />
        <span>{edge === 'top' ? '▾' : '▴'} {label}</span>
      </button>,
      document.body,
    )
  }

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const parentW = el.parentElement?.getBoundingClientRect().width || innerWidth || rect.width
    const startX = e.clientX
    const startY = e.clientY
    const startW = rect.width
    const startH = rect.height
    const dirY = edge === 'bottom' ? -1 : 1

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = (ev.clientY - startY) * dirY
      const nextH = Math.abs(dy) > 4 ? clampChromeHeight(startH + dy, minH, maxH) : undefined
      const nextW = Math.abs(dx) > 8 && parentW >= 420 ? clampChromeWidth((startW + dx) / Math.max(240, parentW)) : undefined
      if (nextH !== undefined || nextW !== undefined) {
        update(c => ({
          ...c,
          ...(nextH !== undefined ? { h: nextH } : {}),
          ...(nextW !== undefined ? { w: nextW >= 0.98 ? undefined : nextW } : {}),
        }))
      }
    }
    const up = () => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  }

  const wrapStyle: React.CSSProperties = {
    ...(op < 1 ? { opacity: op } : {}),
    ...(st.w !== undefined ? { width: `${Math.round(st.w * 100)}%`, maxWidth: '100%' } : {}),
    ...(st.h !== undefined ? { minHeight: st.h, height: st.h } : {}),
  }

  return (
    <div
      ref={wrapRef}
      className={`chrome-wrap edge-${edge}${st.h !== undefined ? ' sized-h' : ''}${className ? ` ${className}` : ''}`}
      style={wrapStyle}
      data-testid={`chrome-bar-${id}`}
    >
      <div className="chrome-inner">{children}</div>
      <div className="chrome-ctrls" role="group" aria-label={`${label} controls`}>
        <button
          type="button"
          className={`chrome-btn${opOpen || op < 1 ? ' on' : ''}`}
          onClick={() => setOpOpen(v => !v)}
          aria-pressed={opOpen}
          title={`${label} opacity (${Math.round(op * 100)}%)`}
          aria-label={`${label} opacity`}
          data-testid={`chrome-op-${id}`}
        >
          ◐
        </button>
        <span
          className="chrome-btn chrome-resize"
          role="separator"
          onPointerDown={startResize}
          title={`Drag to resize ${label} (L × W)`}
          aria-label={`Drag to resize ${label} (L × W)`}
          data-testid={`chrome-resize-${id}`}
        >
          ◢
        </span>
        {modified && (
          <button
            type="button"
            className="chrome-btn"
            onClick={() => { setOpOpen(false); update(() => ({})) }}
            title={`Reset ${label} size & opacity`}
            aria-label={`Reset ${label}`}
            data-testid={`chrome-reset-${id}`}
          >
            ⤢
          </button>
        )}
        <button
          type="button"
          className="chrome-btn"
          onClick={() => { setOpOpen(false); update(c => ({ ...c, hidden: true })) }}
          title={`Hide ${label} (glowing pill brings it back)`}
          aria-label={`Hide ${label}`}
          data-testid={`chrome-hide-${id}`}
        >
          –
        </button>
      </div>
      {opOpen && (
        <div className={`chrome-op-pop edge-${edge}`} data-testid={`chrome-op-pop-${id}`}>
          <span className="small">◐ {label}</span>
          <input
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={op}
            onChange={e => {
              const v = clampChromeOpacity(Number(e.target.value))
              update(c => ({ ...c, opacity: v >= 0.99 ? undefined : v }))
            }}
            aria-label={`${label} opacity slider`}
          />
          <span className="small tabular">{Math.round(op * 100)}%</span>
          {op < 1 && <button type="button" className="chrome-btn" onClick={() => update(c => ({ ...c, opacity: undefined }))}>100%</button>}
          <button type="button" className="chrome-btn" onClick={() => setOpOpen(false)} aria-label="Close opacity">✕</button>
        </div>
      )}
    </div>
  )
}

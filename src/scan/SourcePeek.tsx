// "Check it in the picture": ONE floating window (move, resize, ◐ opacity meter, shrink to a bubble, hide; remembered)
// that shows the spot in the scanned picture where the selected note was read, with one glowing box round it:
// red when KGuitar wasn't sure of it, green when it was — plus built-in 1-tap confirm / fix / undo controls right inside
// the same card so your eyes and hand never bounce between two windows.
// Also exports ScanVideoPeek: a second draggable, opacity-metered floating YouTube box right over the scan result so you
// can watch & hear the original video (with bar-seek, 0.5×/0.75×/1× speed, and ↺ −2s replay) without ever losing your scan.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FloatCard } from '../components/FloatCard'
import { usePinch } from '../components/Zoomable'
import { Ico } from '../components/Icon'
import { YouTubePlayer } from '../components/YouTubePlayer'
import type { VideoApi } from '../play/inTime'
import type { SongNote } from '../tabs/model'

export interface ScanSource { url: string; w: number; h: number }
type Src = NonNullable<SongNote['src']>

const BAND = 110 // the staff's height on screen at 1×
const TECHS = ['h', 'p', '/', '\\', 'b', '~', 'PM'] as const

export interface PeekFixer {
  bar: number
  stringName: string
  note: SongNote
  stepNoteCount: number
  altFrets: number[]
  hint?: string
  unsurePos?: number // 1-based index among unsure notes
  unsureTotal: number
  canUndo: boolean
  canStrUp: boolean
  canStrDn: boolean
  strUpLabel?: string
  strDnLabel?: string
  hasVideo: boolean
  videoOpen: boolean
  onConfirm: () => void
  onPickFret: (f: number) => void
  onNudgeFret: (d: number) => void
  onMuteNote: () => void
  onMuteAll: () => void
  onMoveString: (d: number) => void
  onToggleTech: (t: string) => void
  onDelete: () => void
  onAudition: () => void
  onUndo: () => void
  onPrevUnsure: () => void
  onNextUnsure: () => void
  onToggleVideo: () => void
}

export function SourcePeek({ sources, src, label, unsure, onHide, fixer }: {
  sources: ScanSource[]
  src: Src
  label: string
  unsure: boolean
  onHide: () => void
  fixer?: PeekFixer
}) {
  const pic = sources[src.p]
  const view = useRef<HTMLDivElement>(null)
  const [z, setZ] = useState(() => { try { return Math.min(5, Math.max(0.5, Number(localStorage.getItem('kg:scanPicZoom')) || 1.4)) } catch { return 1.4 } })
  const [more, setMore] = useState(false)
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

  const title = fixer && fixer.unsureTotal > 0 && fixer.unsurePos
    ? `Check unsure · ${fixer.unsurePos} of ${fixer.unsureTotal}`
    : 'Check it in the picture'

  const headerNav = fixer && fixer.unsureTotal > 0 ? (
    <span className="row" style={{ gap: 2, flexWrap: 'nowrap' }} data-no-drag>
      <button className="fc-btn" onClick={fixer.onPrevUnsure} aria-label="Previous unsure note" title="Previous unsure">‹</button>
      <button className="fc-btn" onClick={fixer.onNextUnsure} aria-label="Next unsure note" title="Next unsure">›</button>
    </span>
  ) : undefined

  return (
    <FloatCard id="scanpic" where="scan" title={title} icon="image" alert={unsure} onHide={onHide} width={360} minW={240} openNarrow
      headerExtra={headerNav}
      testId="scan-source" bubbleTestId="scan-source-chip" label={`The scanned picture at ${label}`} bubble={<>Picture · {label}</>}>
      <div className="scan-src stack" style={{ gap: 6 }}>
        <div className="scan-src-view" ref={view} data-testid="scan-source-view"
          style={{ height: Math.min(260, BAND * z + 20) }}
          onMouseDown={e => { const v = view.current; if (v) drag.current = { x: e.clientX, y: e.clientY, l: v.scrollLeft, t: v.scrollTop } }}
          onMouseMove={e => { const d = drag.current, v = view.current; if (d && v) { v.scrollLeft = d.l - (e.clientX - d.x); v.scrollTop = d.t - (e.clientY - d.y) } }}
          onMouseUp={() => { drag.current = null }} onMouseLeave={() => { drag.current = null }}>
          <div style={{ position: 'relative', width: W, height: H }}>
            <img src={pic.url} alt={`Scanned tab picture ${src.p + 1}`} draggable={false} style={{ width: W, height: H, display: 'block' }} />
            <span className={`scan-src-ring ${unsure ? 'unsure' : 'sure'}`} data-testid="scan-source-ring"
              style={{ left: src.x * W - ring / 2, top: src.y * H - ring / 2, width: ring, height: ring }} />
          </div>
        </div>
        <div className="row small" style={{ gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="muted" style={{ fontSize: 12 }}>
            {fixer ? <><b>Bar {fixer.bar}</b> · <b>{fixer.stringName}</b> · {fixer.note.tech === 'x' ? <b>x (muted)</b> : <>fret <b>{fixer.note.fret}</b>{fixer.note.tech ? ` (${fixer.note.tech})` : ''}</>}</> : label}
            {sources.length > 1 ? ` · pic ${src.p + 1}/${sources.length}` : ''}
          </span>
          <span className="row" style={{ gap: 3, flexWrap: 'nowrap' }}>
            <button className="btn sm ghost" onClick={() => zoomBy(z / 1.25)} aria-label="Zoom out" data-testid="scan-source-out">−</button>
            <button className="btn sm ghost" onClick={() => zoomBy(1.4)} aria-label="Normal size">1×</button>
            <button className="btn sm ghost" onClick={() => zoomBy(z * 1.25)} aria-label="Zoom in" data-testid="scan-source-in">+</button>
          </span>
        </div>
        {fixer && (
          <div className="scan-peek-fixer stack" style={{ gap: 5 }} data-testid="scan-note-fixer">
            {fixer.hint && <span className="small amber" style={{ fontSize: 12 }}>{fixer.hint}</span>}
            <div className="row" style={{ gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              {unsure && (
                <button className="btn sm primary" onClick={fixer.onConfirm} data-testid="fix-ok">
                  ✓ Right
                </button>
              )}
              {fixer.altFrets.map(f => (
                <button key={f} className="btn sm" onClick={() => fixer.onPickFret(f)} data-testid={`fix-alt-${f}`}>
                  Fret {f}
                </button>
              ))}
              <button className="btn sm" disabled={fixer.note.tech !== 'x' && fixer.note.fret <= 0} onClick={() => fixer.onNudgeFret(-1)} data-testid="fix-fret-dn" title="Fret −1">−1</button>
              <button className="btn sm" disabled={fixer.note.tech !== 'x' && fixer.note.fret >= 24} onClick={() => fixer.onNudgeFret(1)} data-testid="fix-fret-up" title="Fret +1">+1</button>
              <button className={`btn sm${fixer.note.tech === 'x' ? ' on' : ''}`} onClick={fixer.onMuteNote} data-testid="fix-tech-x" title="Set this note to x (muted / chuck)">
                x Mute
              </button>
              <button className="btn sm ghost" onClick={fixer.onAudition} title="Hear this note" aria-label="Hear this note"><Ico n="ear" /></button>
              {fixer.hasVideo && (
                <button className={`btn sm${fixer.videoOpen ? ' on' : ' ghost'}`} onClick={fixer.onToggleVideo} data-testid="peek-video-btn" title="Watch & hear original video in a floating window">
                  <Ico n="film" /> Video
                </button>
              )}
              {fixer.canUndo && (
                <button className="btn sm ghost" onClick={fixer.onUndo} data-testid="fix-undo" title="Undo last edit">↩</button>
              )}
              <button className="btn sm ghost" onClick={() => setMore(m => !m)} aria-expanded={more} data-testid="fix-more-btn">
                {more ? 'Less ▴' : 'More ▾'}
              </button>
            </div>
            {more && (
              <div className="row" style={{ gap: 4, alignItems: 'center', flexWrap: 'wrap', paddingTop: 4, borderTop: '1px solid var(--hairline)' }}>
                <button className="btn sm" disabled={!fixer.canStrUp} onClick={() => fixer.onMoveString(1)} data-testid="fix-str-up">↑ {fixer.strUpLabel ?? ''}</button>
                <button className="btn sm" disabled={!fixer.canStrDn} onClick={() => fixer.onMoveString(-1)} data-testid="fix-str-dn">↓ {fixer.strDnLabel ?? ''}</button>
                {fixer.stepNoteCount > 1 && (
                  <button className="btn sm" onClick={fixer.onMuteAll} data-testid="fix-mute-all" title="Mark every string in this strum as x (muted chuck)">
                    x Chuck chord
                  </button>
                )}
                {TECHS.map(tc => (
                  <button key={tc} className={`btn sm${fixer.note.tech === tc ? ' on' : ' ghost'}`} onClick={() => fixer.onToggleTech(tc)} data-testid={`fix-tech-${tc}`}>
                    {tc}
                  </button>
                ))}
                <span style={{ flex: 1 }} />
                <button className="btn sm danger" onClick={fixer.onDelete} data-testid="fix-del">Delete note</button>
              </div>
            )}
          </div>
        )}
      </div>
    </FloatCard>
  )
}

/** The same window when the note has no picture behind it: says why, and (for a video Gemini read in the cloud)
 *  offers to read it here so every note gets its frame. */
export function NoSourcePeek({ why, onFrames, onHide }: { why: string; onFrames?: () => void; onHide: () => void }) {
  return (
    <FloatCard id="scanpic" where="scan" title="Check it in the picture" icon="image" onHide={onHide} width={300} minW={200} openNarrow
      testId="scan-source" bubbleTestId="scan-source-chip" label="No picture for this note" bubble={<>Picture</>}>
      <div className="stack small" style={{ gap: 8 }} data-testid="scan-source-none">
        <span>{why}</span>
        {onFrames && <button className="btn sm primary" onClick={onFrames} data-testid="scan-source-frames">Read it here with pictures</button>}
      </div>
    </FloatCard>
  )
}

/** Floating draggable YouTube box with its own ◐ opacity meter right on top of the scan result, so you can watch and
 *  hear the original Short/video (with bar-seek, speed control, and ↺ −2s replay) without leaving or losing your scan. */
export function ScanVideoPeek({ url, bar, barTime, onHide }: {
  url: string
  bar?: number
  barTime?: number
  onHide: () => void
}) {
  const api = useRef<VideoApi | null>(null)
  const [rate, setRate] = useState(1)
  const isShort = /\/shorts\//.test(url)

  const setPlayback = (r: number) => {
    setRate(r)
    api.current?.setRate?.(r)
  }
  const jumpToBar = () => {
    if (barTime === undefined) return
    const target = Math.max(0, barTime - 0.8)
    api.current?.seek(target)
    api.current?.setRate?.(rate)
    api.current?.play()
  }
  const rewind2 = () => {
    const cur = api.current?.time() ?? 0
    api.current?.seek(Math.max(0, cur - 2))
    api.current?.play()
  }

  return (
    <FloatCard id="scanvid" where="scan" title="Original video" icon="film" onHide={onHide} width={isShort ? 260 : 340} minW={200} order={2} openNarrow
      testId="scan-video-peek" bubbleTestId="scan-video-peek-chip" label="Original YouTube video" bubble={<>Video</>}>
      <div className="stack" style={{ gap: 6 }}>
        <YouTubePlayer
          url={url}
          onUrl={() => {}}
          onApi={a => { api.current = a }}
          frameClass={isShort ? 'is-short-peek' : 'is-wide-peek'}
          hideBar
          note=""
        />
        <div className="row small" style={{ gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <span className="row" style={{ gap: 3 }}>
            {barTime !== undefined && bar !== undefined && (
              <button className="btn sm primary" onClick={jumpToBar} data-testid="scan-vid-jump" title={`Jump to bar ${bar}`}>
                ▶ Bar {bar}
              </button>
            )}
            <button className="btn sm" onClick={rewind2} data-testid="scan-vid-back" title="Back 2 seconds">↺ −2s</button>
          </span>
          <span className="row" style={{ gap: 3 }}>
            {[0.5, 0.75, 1].map(r => (
              <button key={r} className={`btn sm${rate === r ? ' on' : ' ghost'}`} onClick={() => setPlayback(r)} data-testid={`scan-vid-rate-${Math.round(r * 100)}`}>
                {r}×
              </button>
            ))}
          </span>
        </div>
      </div>
    </FloatCard>
  )
}

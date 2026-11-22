// Built-in Course Book & Tab Diagram Viewer for KGuitar's Course Studio.
// - Renders PDF pages directly onto crisp HiDPI <canvas> elements via pdfjs-dist (caching loaded PDFDocumentProxy
//   instances in memory so flipping pages or advancing to the next lesson is instant).
// - Supports 1-Page and 2-Page Spread views, Zoom (− / 100% / +), quick jump to the lesson's mapped page span,
//   1-tap `📌 Pin p.X` persistent manual page override, and `🎵 Scan Page → Play` to turn a book/tab page into a playable tab.
// - Renders crisp Tab / Fretboard Diagram images (.png / .webp) with a 1-tap `🖼 Tab | 📖 Study Guide (p.X)` switcher
//   when a lesson has both!
import { useEffect, useMemo, useRef, useState } from 'react'
import { PageInput } from '../components/PageInput'
import { LessonFolders, lessonsAvailable, mediaUrl, readLessonBytes, type LFile } from './folders'
import {
  getPinnedPage,
  setPinnedPage,
  type FileRef,
  type PdfRef,
  type PinnedPage,
  type ResolvedLesson,
} from './courseMap'

// ---- Module-level LRU cache for loaded PDF documents so lesson transitions in a 93-page book don't reload ----
interface CachedPdf {
  uri: string
  bytes: Uint8Array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any
  numPages: number
}
const pdfCache: CachedPdf[] = []

async function loadPdfjs() {
  const lib = await import('pdfjs-dist/legacy/build/pdf.mjs')
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined' && !lib.GlobalWorkerOptions.workerPort) {
    try {
      lib.GlobalWorkerOptions.workerPort = new Worker(
        new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url),
        { type: 'module' },
      )
    } catch { /* fallback to main-thread fake worker in restricted test envs */ }
  }
  return lib
}

export async function getPdfDoc(file: LFile): Promise<CachedPdf> {
  const idx = pdfCache.findIndex(c => c.uri === file.uri)
  if (idx >= 0) {
    const hit = pdfCache.splice(idx, 1)[0]
    pdfCache.unshift(hit)
    return hit
  }
  const bytes = await readLessonBytes(file.uri)
  const lib = await loadPdfjs()
  const doc = await lib.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise
  const entry: CachedPdf = { uri: file.uri, bytes, doc, numPages: doc.numPages || 1 }
  pdfCache.unshift(entry)
  if (pdfCache.length > 4) {
    const old = pdfCache.pop()
    try { old?.doc?.destroy?.() } catch { /* ignore */ }
  }
  return entry
}

interface Props {
  lesson: ResolvedLesson
  /** Active stage mode: 'pdf' or 'image' */
  stageMode: 'pdf' | 'image'
  onStageModeChange: (m: 'pdf' | 'image') => void
  onScanPdfToPlay?: (pdfFile: LFile, fromPage: number, toPage: number, bytes: Uint8Array) => Promise<void>
  onScanImageToPlay?: (imgFile: LFile) => Promise<void>
}

export function CourseBookView({
  lesson,
  stageMode,
  onStageModeChange,
  onScanPdfToPlay,
  onScanImageToPlay,
}: Props) {
  const allPdfs = useMemo<PdfRef[]>(() => {
    const list: PdfRef[] = []
    if (lesson.pdf) list.push(lesson.pdf)
    for (const ep of lesson.extraPdfs) {
      if (!list.some(x => x.file.uri === ep.file.uri && x.startPage === ep.startPage)) list.push(ep)
    }
    return list
  }, [lesson])

  const [pin, setPin] = useState<PinnedPage | null>(() => getPinnedPage(lesson.video.uri))
  const [pdfIdx, setPdfIdx] = useState(0)
  const [imgIdx, setImgIdx] = useState(0)

  const activePdfRef: PdfRef | undefined = allPdfs[pdfIdx] ?? allPdfs[0]
  const effectiveStart = (pin && (!pin.pdfUri || pin.pdfUri === activePdfRef?.file.uri))
    ? pin.startPage
    : (activePdfRef?.startPage ?? 1)
  const effectiveEnd = (pin && (!pin.pdfUri || pin.pdfUri === activePdfRef?.file.uri))
    ? pin.endPage
    : (activePdfRef?.endPage ?? effectiveStart)

  const [page, setPage] = useState(effectiveStart)
  const [numPages, setNumPages] = useState(Math.max(effectiveEnd, 1))
  const [spread, setSpread] = useState<1 | 2>(() =>
    effectiveEnd > effectiveStart && typeof innerWidth === 'number' && innerWidth >= 900 ? 2 : 1,
  )
  const [zoom, setZoom] = useState(1)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [pdfErr, setPdfErr] = useState('')
  const [scanBusy, setScanBusy] = useState(false)
  const [scanMsg, setScanMsg] = useState('')

  // Reset page & indices whenever the lesson changes
  useEffect(() => {
    const p = getPinnedPage(lesson.video.uri)
    setPin(p)
    setPdfIdx(0)
    setImgIdx(0)
    const firstPdf = lesson.pdf ?? lesson.extraPdfs[0]
    const sp = (p && (!p.pdfUri || p.pdfUri === firstPdf?.file.uri)) ? p.startPage : (firstPdf?.startPage ?? 1)
    const ep = (p && (!p.pdfUri || p.pdfUri === firstPdf?.file.uri)) ? p.endPage : (firstPdf?.endPage ?? sp)
    setPage(sp)
    setSpread(ep > sp && typeof innerWidth === 'number' && innerWidth >= 900 ? 2 : 1)
    setScanMsg('')
  }, [lesson.video.uri, lesson.pdf, lesson.extraPdfs])

  // When switching between primary PDF and extra reference PDFs
  const selectPdf = (idx: number) => {
    setPdfIdx(idx)
    const target = allPdfs[idx]
    if (target) {
      const sp = (pin && pin.pdfUri === target.file.uri) ? pin.startPage : target.startPage
      setPage(sp)
    }
  }

  const canvas1Ref = useRef<HTMLCanvasElement>(null)
  const canvas2Ref = useRef<HTMLCanvasElement>(null)
  const stageBoxRef = useRef<HTMLDivElement>(null)
  const cachedPdfRef = useRef<CachedPdf | null>(null)

  // Render active PDF page(s) to canvas
  useEffect(() => {
    if (stageMode !== 'pdf' || !activePdfRef) return
    let alive = true
    setLoadingPdf(true)
    setPdfErr('')

    ;(async () => {
      try {
        const entry = await getPdfDoc(activePdfRef.file)
        if (!alive) return
        cachedPdfRef.current = entry
        setNumPages(entry.numPages)
        const p1 = Math.max(1, Math.min(entry.numPages, page))
        if (p1 !== page) setPage(p1)

        const renderOne = async (pageNum: number, canvas: HTMLCanvasElement | null) => {
          if (!canvas) return
          const pdfPage = await entry.doc.getPage(pageNum)
          if (!alive) return
          const baseVp = pdfPage.getViewport({ scale: 1 })
          const boxW = stageBoxRef.current?.clientWidth || Math.min(920, (typeof innerWidth === 'number' ? innerWidth : 800) - 32)
          const availW = spread === 2 && entry.numPages >= p1 + 1 ? Math.max(260, (boxW - 24) / 2) : Math.max(280, boxW - 16)
          const cssScale = (availW / Math.max(1, baseVp.width)) * zoom
          const dpr = Math.min(2.25, (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) * 1.35)
          const vp = pdfPage.getViewport({ scale: cssScale * dpr })

          canvas.width = Math.round(vp.width)
          canvas.height = Math.round(vp.height)
          canvas.style.width = `${Math.round(baseVp.width * cssScale)}px`
          canvas.style.height = `${Math.round(baseVp.height * cssScale)}px`
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise
        }

        await renderOne(p1, canvas1Ref.current)
        if (spread === 2 && p1 + 1 <= entry.numPages) {
          await renderOne(p1 + 1, canvas2Ref.current)
        }
        if (alive) setLoadingPdf(false)
      } catch (e) {
        if (!alive) return
        setLoadingPdf(false)
        setPdfErr((e as Error).message || 'Could not render this PDF page.')
      }
    })()

    return () => { alive = false }
  }, [stageMode, activePdfRef, page, spread, zoom])

  const clampPage = (n: number) => Math.max(1, Math.min(numPages, Math.round(n || 1)))
  const step = spread === 2 ? 2 : 1

  const handlePinCurrent = () => {
    if (!activePdfRef) return
    const endP = spread === 2 && page + 1 <= numPages ? page + 1 : page
    const nextPin = { pdfUri: activePdfRef.file.uri, startPage: page, endPage: endP }
    setPinnedPage(lesson.video.uri, nextPin)
    setPin({ ...nextPin, at: Date.now() })
  }

  const handleClearPin = () => {
    setPinnedPage(lesson.video.uri, null)
    setPin(null)
    if (activePdfRef) setPage(activePdfRef.startPage)
  }

  const handleScanPdf = async () => {
    if (!activePdfRef || !onScanPdfToPlay) return
    setScanBusy(true)
    setScanMsg('Scanning tab from page…')
    try {
      const entry = cachedPdfRef.current ?? (await getPdfDoc(activePdfRef.file))
      const toP = spread === 2 && page + 1 <= entry.numPages ? page + 1 : page
      await onScanPdfToPlay(activePdfRef.file, page, toP, entry.bytes)
      setScanMsg('')
    } catch (e) {
      setScanMsg((e as Error).message || 'Could not extract a playable tab from this page.')
    }
    setScanBusy(false)
  }

  const handleScanImage = async (im: FileRef) => {
    if (!onScanImageToPlay) return
    setScanBusy(true)
    setScanMsg('Scanning tab from diagram…')
    try {
      await onScanImageToPlay(im.file)
      setScanMsg('')
    } catch (e) {
      setScanMsg((e as Error).message || 'Could not extract a playable tab from this image.')
    }
    setScanBusy(false)
  }

  const hasBoth = lesson.images.length > 0 && allPdfs.length > 0
  const activeImg: FileRef | undefined = lesson.images[imgIdx] ?? lesson.images[0]

  return (
    <div className="course-book-view panel stack" style={{ gap: 8, padding: 10 }} ref={stageBoxRef} data-testid="course-book-view">
      {/* Top Mode & Document Switcher Bar */}
      <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {hasBoth && (
            <div className="seg" role="group" aria-label="Tab or Study Guide">
              <button
                className="btn sm"
                aria-pressed={stageMode === 'image'}
                onClick={() => onStageModeChange('image')}
                data-testid="stage-mode-image"
              >
                🖼 Tab Diagram{lesson.images.length > 1 ? ` (${lesson.images.length})` : ''}
              </button>
              <button
                className="btn sm"
                aria-pressed={stageMode === 'pdf'}
                onClick={() => onStageModeChange('pdf')}
                data-testid="stage-mode-pdf"
              >
                📖 Study Guide{activePdfRef ? ` (p.${effectiveStart}${effectiveEnd > effectiveStart ? `–${effectiveEnd}` : ''})` : ''}
              </button>
            </div>
          )}

          {stageMode === 'pdf' && allPdfs.length > 1 && (
            <div className="seg" role="group" aria-label="PDF document selector">
              {allPdfs.map((pf, i) => (
                <button
                  key={`${pf.file.uri}:${pf.startPage}`}
                  className="btn sm"
                  aria-pressed={pdfIdx === i}
                  onClick={() => selectPdf(i)}
                >
                  📖 {pf.label}
                </button>
              ))}
            </div>
          )}

          {stageMode === 'image' && lesson.images.length > 1 && (
            <div className="seg" role="group" aria-label="Image selector">
              {lesson.images.map((im, i) => (
                <button
                  key={im.file.uri}
                  className="btn sm"
                  aria-pressed={imgIdx === i}
                  onClick={() => setImgIdx(i)}
                >
                  {im.label || `Diagram ${i + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="row" style={{ gap: 4, alignItems: 'center' }}>
          <button className="btn sm" onClick={() => setZoom(z => Math.max(0.7, Math.round((z - 0.15) * 100) / 100))} title="Zoom out" aria-label="Zoom out">−</button>
          <button className="btn sm" onClick={() => setZoom(1)} title="Reset zoom">{Math.round(zoom * 100)}%</button>
          <button className="btn sm" onClick={() => setZoom(z => Math.min(2.2, Math.round((z + 0.15) * 100) / 100))} title="Zoom in" aria-label="Zoom in">+</button>
        </div>
      </div>

      {/* PDF Toolbar & Canvas Stage */}
      {stageMode === 'pdf' && activePdfRef && (
        <>
          <div className="row course-pdf-toolbar" style={{ justifyContent: 'space-between', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn sm"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - step))}
                data-testid="pdf-prev-page"
                aria-label="Previous page"
              >
                ‹ Prev Page
              </button>
              <label className="row small" style={{ gap: 4, alignItems: 'center' }}>
                Page
                <PageInput
                  min={1}
                  max={numPages}
                  value={page}
                  style={{ width: 64, padding: '2px 6px' }}
                  onChange={v => setPage(clampPage(v))}
                  data-testid="course-pdf-page-input"
                />
                <span className="muted">of {numPages}</span>
              </label>
              <button
                className="btn sm"
                disabled={page + step > numPages && page >= numPages}
                onClick={() => setPage(p => Math.min(numPages, p + step))}
                data-testid="pdf-next-page"
                aria-label="Next page"
              >
                Next Page ›
              </button>

              {/* Quick jump back to lesson's mapped/pinned start page */}
              <button
                className={`btn sm${page === effectiveStart ? ' set' : ''}`}
                onClick={() => setPage(effectiveStart)}
                title="Jump to this lesson's book page"
                data-testid="pdf-lesson-range-btn"
              >
                📖 Lesson p.{effectiveStart}{effectiveEnd > effectiveStart ? `–${effectiveEnd}` : ''}
              </button>
            </div>

            <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {numPages > 1 && (
                <div className="seg" role="group" aria-label="Page spread">
                  <button className="btn sm" aria-pressed={spread === 1} onClick={() => setSpread(1)} data-testid="pdf-spread-1">1 Page</button>
                  <button className="btn sm" aria-pressed={spread === 2} onClick={() => setSpread(2)} data-testid="pdf-spread-2">2-Page Spread</button>
                </div>
              )}

              <button
                className={`btn sm${pin ? ' set' : ''}`}
                onClick={handlePinCurrent}
                title="Save the current page as this lesson's default opening page"
                data-testid="pdf-pin-btn"
              >
                📌 {pin ? `Pinned p.${pin.startPage}${pin.endPage > pin.startPage ? `–${pin.endPage}` : ''}` : `Pin p.${page}`}
              </button>
              {pin && (
                <button className="btn sm ghost" onClick={handleClearPin} title="Revert to automatic page match" data-testid="pdf-unpin-btn">
                  Reset
                </button>
              )}

              {onScanPdfToPlay && (
                <button
                  className="btn sm"
                  onClick={() => void handleScanPdf()}
                  disabled={scanBusy}
                  title="Scan this PDF page into a playable tab in Play"
                  data-testid="pdf-scan-to-play"
                >
                  🎵 {scanBusy ? 'Scanning…' : 'Scan Page → Play'}
                </button>
              )}

              {lessonsAvailable() && (
                <button
                  className="btn sm ghost"
                  onClick={() => void LessonFolders.openExternal({ uri: activePdfRef.file.uri, mime: 'application/pdf' })}
                  title="Open in external PDF app"
                >
                  PDF App ↗
                </button>
              )}
            </div>
          </div>

          {scanMsg && <p className="small notice" style={{ margin: 0 }} role="status">{scanMsg}</p>}
          {pdfErr && <p className="small notice" style={{ margin: 0 }} role="alert">{pdfErr}</p>}

          <div
            className="course-pdf-stage"
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              alignItems: 'flex-start',
              overflowX: 'auto',
              padding: '8px 4px',
              background: 'rgba(0,0,0,0.22)',
              borderRadius: 10,
              minHeight: 320,
              position: 'relative',
            }}
            data-testid="course-pdf-canvas-wrap"
          >
            {loadingPdf && (
              <span className="small muted" style={{ position: 'absolute', top: 12, left: 14 }}>
                Loading page {page}…
              </span>
            )}
            <canvas
              ref={canvas1Ref}
              style={{ borderRadius: 6, boxShadow: '0 4px 18px rgba(0,0,0,0.35)', background: '#fff', maxWidth: '100%' }}
              data-testid="course-pdf-canvas-1"
            />
            {spread === 2 && page + 1 <= numPages && (
              <canvas
                ref={canvas2Ref}
                style={{ borderRadius: 6, boxShadow: '0 4px 18px rgba(0,0,0,0.35)', background: '#fff', maxWidth: '100%' }}
                data-testid="course-pdf-canvas-2"
              />
            )}
          </div>
        </>
      )}

      {/* Image / Tab Diagram Stage */}
      {stageMode === 'image' && activeImg && (
        <>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="small muted">
              🖼 <b>{activeImg.label}</b> ({lesson.title})
            </span>
            {onScanImageToPlay && (
              <button
                className="btn sm"
                onClick={() => void handleScanImage(activeImg)}
                disabled={scanBusy}
                data-testid="img-scan-to-play"
              >
                🎵 {scanBusy ? 'Scanning…' : 'Scan Tab → Play'}
              </button>
            )}
          </div>
          {scanMsg && <p className="small notice" style={{ margin: 0 }} role="status">{scanMsg}</p>}
          <div
            className="course-img-stage"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflowX: 'auto',
              padding: 12,
              background: 'rgba(0,0,0,0.22)',
              borderRadius: 10,
            }}
            data-testid="course-image-stage"
          >
            <img
              className="lesson-img"
              src={mediaUrl(activeImg.file.uri)}
              alt={activeImg.label}
              style={{
                width: `${Math.round(zoom * 100)}%`,
                maxWidth: zoom > 1 ? 'none' : '100%',
                borderRadius: 8,
                background: '#fff',
                boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
              }}
              data-testid="course-tab-image"
            />
          </div>
        </>
      )}
    </div>
  )
}

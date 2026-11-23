// "Lesson tab": ONE floating window (the same shell as every floater: move, resize, see-through, bubble, remembered)
// that shows a course folder's tab files inside KGuitar, next to the lesson video. Tap any tab under a lesson and it
// opens here; tap another and the same window switches; open the next lesson and it moves to that lesson's tab.
//   PDF: the page drawn in the window (‹ › to turn, pinch or + − to zoom), "Play this page" reads it into a tab.
//   Picture: zoomable, drag to look around.     Guitar Pro / text tab: the tab itself with Play, speed and loop.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { FloatCard } from '../components/FloatCard'
import { Ico } from '../components/Icon'
import { PageInput } from '../components/PageInput'
import { usePinch } from '../components/Zoomable'
import { useInstrument, type Instrument } from '../instrument'
import { openInPlay } from '../nav'
import { ScanPlayer } from '../scan/ScanPlayer'
import { toGray, type Gray } from '../scan/image'
import { getSong, newId, saveSong, type SongDoc } from '../tabs/library'
import { songFromPdf, songFromText } from '../tabs/importer'
import { ScannedPdf, pdfPictures } from '../tabs/pdfTab'
import { getPdfDoc } from './CourseBookView'
import { kindOf, localVideoLink, mediaUrl, niceName, readLessonBytes, type LFile } from './folders'

export interface LessonTabOpen {
  file: LFile
  /** the lesson's tabs, for the switcher in the window */
  list: LFile[]
  /** first page to show (a mapped course's page for this lesson) */
  page?: number
  /** the lesson video, so "Open in Play" brings it along */
  video?: LFile
}
let cur: LessonTabOpen | null = null
let scannedCur: SongDoc | null = null
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())
export function openLessonTab(o: LessonTabOpen) { cur = o; emit() }
export function closeLessonTab() { cur = null; scannedCur = null; emit() }
export function openScannedLessonTab(doc: SongDoc) { scannedCur = doc; emit() }
export function closeScannedLessonTab() { scannedCur = null; emit() }
/** while the window is open, a new lesson moves it to that lesson's tab */
export function followLesson(o: LessonTabOpen | null) { if (cur && o && o.file.uri !== cur.file.uri) { cur = o; emit() } }
export const useLessonTab = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => cur, () => cur)
export const useScannedLessonTab = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f) } }, () => scannedCur, () => scannedCur)

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) }
async function tabDoc(f: LFile, inst: Instrument): Promise<SongDoc> {
  const id = `lf:${hash(f.uri)}:${inst.id}`
  const have = await getSong(id)
  if (have) return have
  const bytes = await readLessonBytes(f.uri)
  if (kindOf(f) === 'text') {
    const d = songFromText(new TextDecoder().decode(bytes), niceName(f.name), inst)
    if (!d) throw new Error('No tab lines or chords found in that file.')
    return { ...d, id }
  }
  const { importGuitarPro } = await import('../tabs/gpImport')
  const song = importGuitarPro(bytes, f.name)
  return { id, title: song.title || niceName(f.name), artist: song.artist, source: 'gp', inst: inst.id, song, updated: Date.now() }
}
const urlToGray = (url: string): Promise<Gray> => new Promise((res, rej) => {
  const img = new Image()
  img.onload = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d')!; x.drawImage(img, 0, 0); res(toGray(x.getImageData(0, 0, c.width, c.height).data, c.width, c.height)) }
  img.onerror = () => rej(new Error('The picture could not be read.'))
  img.src = url
})

export function LessonTabHost() {
  const o = useLessonTab()
  const scanned = useScannedLessonTab()
  if (!o && !scanned) return null
  return (
    <>
      {o && <LessonTabCard key={o.file.uri} o={o} />}
      {scanned && <ScannedTabCard key={scanned.id} initialDoc={scanned} />}
    </>
  )
}

function ScannedTabCard({ initialDoc }: { initialDoc: SongDoc }) {
  const [doc, setDoc] = useState<SongDoc>(initialDoc)
  useEffect(() => { setDoc(initialDoc) }, [initialDoc])
  const handleSongChange = (song: SongDoc['song']) => {
    const next: SongDoc = { ...doc, song, updated: Date.now() }
    setDoc(next)
    scannedCur = next
    void saveSong(next)
  }
  return (
    <FloatCard
      id="scannedtab"
      where="lessons"
      title={`Scanned tab · ${doc.title}`}
      icon="guitar"
      onHide={closeScannedLessonTab}
      width={460}
      minW={260}
      order={1}
      openNarrow
      testId="scanned-lesson-tab-card"
      bubbleTestId="scanned-lesson-tab-chip"
      label={`Scanned tab: ${doc.title}`}
      bubble={<>Tab · {doc.title.slice(0, 18)}</>}
    >
      <div className="stack" style={{ gap: 6 }}>
        <div className="lesson-tab-view" data-testid="scanned-lesson-tab-body" style={{ maxHeight: 'min(58vh, 520px)' }}>
          <ScanPlayer doc={doc} onChangeSong={handleSongChange} playTools />
        </div>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span className="small muted" style={{ fontSize: 11 }}>
            Tap <b>◐</b> above to see through over the PDF · tap any fret to fix it
          </span>
          <button
            className="btn sm ghost"
            onClick={() => openInPlay(doc)}
            data-testid="scanned-lesson-open-in-play"
            title="Optionally switch to full-screen Play"
          >
            Full Play ↗
          </button>
        </div>
      </div>
    </FloatCard>
  )
}

function LessonTabCard({ o }: { o: LessonTabOpen }) {
  const k = kindOf(o.file)
  return (
    <FloatCard id="lessontab" where="lessons" title={niceName(o.file.name)} icon={k === 'pdf' ? 'file' : k === 'image' ? 'image' : 'guitar'} onHide={closeLessonTab}
      width={360} minW={220} openNarrow testId="lesson-tab-card" bubbleTestId="lesson-tab-chip" label={`Lesson tab: ${niceName(o.file.name)}`} bubble={<>Tab · {niceName(o.file.name)}</>}>
      <div className="stack" style={{ gap: 6 }}>
        {o.list.length > 1 && (
          <select className="input sm" value={o.file.uri} aria-label="Which tab" data-testid="lesson-tab-pick"
            onChange={e => { const f = o.list.find(x => x.uri === e.target.value); if (f) openLessonTab({ ...o, file: f, page: undefined }) }}>
            {o.list.map(f => <option key={f.uri} value={f.uri}>{niceName(f.name)}</option>)}
          </select>
        )}
        {k === 'pdf' ? <PdfPane o={o} /> : k === 'image' ? <PicPane o={o} /> : <TabPane o={o} />}
      </div>
    </FloatCard>
  )
}

function useZoom(key: string, start = 1) {
  const view = useRef<HTMLDivElement>(null)
  const [z, setZ] = useState(() => { try { return Number(localStorage.getItem(key)) || start } catch { return start } })
  const set = (v: number) => { const c = Math.min(4, Math.max(0.5, v)); setZ(c); try { localStorage.setItem(key, String(c)) } catch { /* storage off */ } }
  const keep = usePinch(view, () => z, set, { min: 0.5, max: 4 })
  useLayoutEffect(() => { keep() }, [z]) // eslint-disable-line react-hooks/exhaustive-deps
  return { view, z, set }
}
function ZoomButtons({ z, set }: { z: number; set: (v: number) => void }) {
  return (
    <span className="row" style={{ gap: 4 }}>
      <button className="btn sm ghost" onClick={() => set(z / 1.25)} aria-label="Zoom out">−</button>
      <button className="btn sm ghost" onClick={() => set(1)} aria-label="Fit the window">Fit</button>
      <button className="btn sm ghost" onClick={() => set(z * 1.25)} aria-label="Zoom in">+</button>
    </span>
  )
}

function PdfPane({ o }: { o: LessonTabOpen }) {
  const inst = useInstrument()
  const { view, z, set } = useZoom('kg:lessonTabZoom')
  const canvas = useRef<HTMLCanvasElement>(null)
  const [page, setPage] = useState(o.page ?? 1)
  const [pages, setPages] = useState(0)
  const [msg, setMsg] = useState('Opening…')
  const [busy, setBusy] = useState(false)
  const [w, setW] = useState(320)
  useEffect(() => { const el = view.current; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth || 320)); ro.observe(el); return () => ro.disconnect() }, [view])
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const pdf = await getPdfDoc(o.file)
        if (!alive) return
        setPages(pdf.numPages)
        const p = await pdf.doc.getPage(Math.min(Math.max(1, page), pdf.numPages))
        const base = p.getViewport({ scale: 1 })
        const dpr = Math.min(3, devicePixelRatio || 1)
        const css = (Math.max(160, w - 4) * z) / base.width
        const vp = p.getViewport({ scale: css * dpr })
        const c = canvas.current
        if (!c || !alive) return
        c.width = Math.round(vp.width); c.height = Math.round(vp.height)
        c.style.width = `${Math.round(vp.width / dpr)}px`; c.style.height = `${Math.round(vp.height / dpr)}px`
        await p.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise
        if (alive) setMsg('')
      } catch (e) { if (alive) setMsg(e instanceof Error ? e.message : 'This PDF could not be opened.') }
    })()
    return () => { alive = false }
  }, [o.file, page, z, w])
  const toPlay = async () => {
    setBusy(true); setMsg('Reading this page…')
    const vLink = o.video ? localVideoLink(o.video) : undefined
    try {
      const pdf = await getPdfDoc(o.file)
      let doc: SongDoc
      try {
        doc = await songFromPdf(o.file.name, pdf.bytes, inst, vLink, { from: page, to: page })
      } catch (err) {
        if (!(err instanceof ScannedPdf)) throw err
        // a scanned page: KGuitar's own reader reads the picture
        const pics = await pdfPictures(pdf.bytes, 1, page, 3.5)
        const grays = await Promise.all(pics.map(pc => urlToGray(pc.url)))
        const { readTabPicturesBest } = await import('../scan/tabReadSong')
        const read = await readTabPicturesBest(grays, inst.midis, `${niceName(o.file.name)} p.${page}`, { deep: true })
        if (!read || read.notes < 4) throw new Error('No tab staff found on this page to play (it may be words or notation only).')
        doc = { id: newId(), title: `${niceName(o.file.name)} p.${page}`, source: 'text', inst: inst.id, song: read.song, youtube: vLink, updated: Date.now() }
      }
      await saveSong(doc)
      openScannedLessonTab(doc)
    } catch (e) { setMsg(e instanceof Error ? e.message : 'That page could not be read.') }
    setBusy(false)
  }
  return (
    <>
      <div ref={view} className="lesson-tab-view" data-testid="lesson-tab-pdf" style={{ maxHeight: 'min(50vh, 460px)' }}>
        <canvas ref={canvas} aria-label={`Page ${page} of ${niceName(o.file.name)}`} />
      </div>
      <div className="row small" style={{ gap: 4, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <span className="row" style={{ gap: 4, alignItems: 'center' }}>
          <button className="btn sm ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)} aria-label="Page before">‹</button>
          <span className="row" style={{ gap: 4, alignItems: 'center' }} data-testid="lesson-tab-page">
            Page
            <PageInput min={1} max={pages || 999} value={page} onChange={setPage} style={{ width: 52, minHeight: 28, padding: '0 6px' }} aria-label="Lesson tab page number" />
            {pages ? ` of ${pages}` : ''}
          </span>
          <button className="btn sm ghost" disabled={!!pages && page >= pages} onClick={() => setPage(p => p + 1)} aria-label="Next page">›</button>
        </span>
        <ZoomButtons z={z} set={set} />
      </div>
      <button className="btn sm" disabled={busy} onClick={() => void toPlay()} data-testid="lesson-tab-play"><Ico n="play" /> Scan this page (floating tab)</button>
      {msg && <span className="small muted" role="status">{msg}</span>}
    </>
  )
}

function PicPane({ o }: { o: LessonTabOpen }) {
  const inst = useInstrument()
  const { view, z, set } = useZoom('kg:lessonTabPicZoom')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const toPlay = async () => {
    setBusy(true); setMsg('Reading this picture…')
    const vLink = o.video ? localVideoLink(o.video) : undefined
    try {
      const gray = await urlToGray(mediaUrl(o.file.uri))
      const { readTabPicturesBest } = await import('../scan/tabReadSong')
      const read = await readTabPicturesBest([gray], inst.midis, niceName(o.file.name), { deep: true })
      if (!read || read.notes < 4) throw new Error('No tab staff found in this picture to play (it may be a chord diagram or notes only).')
      const doc: SongDoc = { id: newId(), title: niceName(o.file.name), source: 'text', inst: inst.id, song: read.song, youtube: vLink, updated: Date.now() }
      await saveSong(doc)
      openScannedLessonTab(doc)
    } catch (e) { setMsg(e instanceof Error ? e.message : 'That picture could not be read.') }
    setBusy(false)
  }
  return (
    <>
      <div ref={view} className="lesson-tab-view" data-testid="lesson-tab-pic" style={{ maxHeight: 'min(50vh, 460px)' }}>
        <img src={mediaUrl(o.file.uri)} alt={niceName(o.file.name)} style={{ width: `${z * 100}%`, maxWidth: 'none', display: 'block' }} draggable={false} />
      </div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn sm" disabled={busy} onClick={() => void toPlay()} data-testid="lesson-tab-pic-play"><Ico n="play" /> Scan this picture (floating tab)</button>
        <ZoomButtons z={z} set={set} />
      </div>
      {msg && <span className="small muted" role="status">{msg}</span>}
    </>
  )
}

function TabPane({ o }: { o: LessonTabOpen }) {
  const inst = useInstrument()
  const [doc, setDoc] = useState<SongDoc | null>(null)
  const [msg, setMsg] = useState('Opening…')
  useEffect(() => {
    let alive = true
    tabDoc(o.file, inst).then(d => { if (alive) { setDoc(d); setMsg('') } }, e => { if (alive) setMsg(e instanceof Error ? e.message : "That file couldn't be read.") })
    return () => { alive = false }
  }, [o.file, inst])
  const open = async () => {
    if (!doc) return
    const d = o.video ? { ...doc, youtube: localVideoLink(o.video) } : doc
    await saveSong(d)
    openInPlay(d)
  }
  return (
    <>
      {doc && <div className="lesson-tab-view" data-testid="lesson-tab-tab" style={{ maxHeight: 'min(55vh, 480px)' }}><ScanPlayer doc={doc} playTools /></div>}
      {doc && <button className="btn sm ghost" onClick={() => void open()} data-testid="lesson-tab-open">Full Play ↗</button>}
      {msg && <span className="small muted" role="status">{msg}</span>}
    </>
  )
}

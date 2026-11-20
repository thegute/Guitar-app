// Your video lessons & Course Studio: pick a course folder on your Android phone/tablet or Mac/desktop browser,
// and practice chapter by chapter with:
// - Synced in-app PDF Book & Tab Diagram Stage (`CourseBookView`) that automatically flips to each lesson's exact pages
// - Draggable, resizable Floating Video Player (`⧉ Float Video` | `◫ Side-by-Side` | `🎬 Video Only`) with ¼×–1¼× speed,
//   A–B loop, ±5s, Mirror, Resume, and Done ✓
// - Built-in Practice Tools right on the lesson bar:
//   1. Quick Metronome + Speed-Ramp (+5 BPM trainer)
//   2. Floating 5-Layer Neck toggle
//   3. Quick Drop-In Tuner (with Drop D / Standard reference)
//   4. Per-Lesson Speed Log & Practice Note ("My Clean BPM & Note")
//   5. Built-in Backing Track Player (.mp3 / .wav with Loop & Speed) + Strum Machine toggle + 1-tap Open GP / Scan Page → Play
import { onLeavePage } from '../audio/stopAll'
import { Metronome } from '../audio/metronome'
import { PitchTracker } from '../audio/pitch'
import { strumMachine, useStrumState } from '../audio/strumMachine'
import { useRegisterFeatureIntro } from '../components/FeatureIntro'
import { Ico } from '../components/Icon'
import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from 'react'
import { useInstrument, type Instrument } from '../instrument'
import { usePracticeTimer } from '../learn/progress'
import { openInPlay } from '../nav'
import { getSong, newId, saveSong, type SongDoc } from '../tabs/library'
import { songFromPdf, songFromText } from '../tabs/importer'
import { ScannedPdf, pdfPictures } from '../tabs/pdfTab'
import { toGray, type Gray } from '../scan/image'
import { readTabPicturesBest } from '../scan/tabReadSong'
import { freqToMidi, midiName } from '../theory/notes'
import { SPEEDS } from '../components/LocalVideo'
import { Win, WinArea } from '../components/Win'
import { CourseBookView } from './CourseBookView'
import { CourseFingerCard } from './CourseFingerCard'
import { attachMpegTsPlayer, probeVideoUrl, type TsPlayerHandle } from './mpegtsFallback'
import {
  getCachedCourseMap,
  getLessonNote,
  getPinnedPage,
  loadCourseMapForFolder,
  resolveCourse,
  setLessonNote,
  type CourseMap,
  type ResolvedChapter,
  type ResolvedCourse,
  type ResolvedLesson,
} from './courseMap'
import {
  LessonFolders,
  kindOf,
  lessonsAvailable,
  localVideoLink,
  mediaUrl,
  niceName,
  progress,
  readLessonBytes,
  registerWebFolderFiles,
  saveFolders,
  savedFolders,
  setProgress,
  type Folder,
  type LFile,
} from './folders'

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
const speedLabel = (r: number) => (r === 1 ? '1×' : r === 0.75 ? '¾×' : r === 0.5 ? '½×' : r === 0.25 ? '¼×' : `${r}×`)
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) }

export function VideoLessons({ onExit }: { onExit: () => void }) {
  useRegisterFeatureIntro('course-studio')
  const [folders, setFolders] = useState<Folder[]>(() => savedFolders())
  const [maps, setMaps] = useState<Record<string, CourseMap | null>>(() => {
    const init: Record<string, CourseMap | null> = {}
    for (const f of savedFolders()) {
      const c = getCachedCourseMap(f.tree)
      if (c !== undefined) init[f.tree] = c
    }
    return init
  })
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<{ tree: string; uri: string } | null>(null)
  const [, setTick] = useState(0)
  const dirInputRef = useRef<HTMLInputElement>(null)
  const watched = progress()

  useEffect(() => saveFolders(folders), [folders])

  // Load `kguitar-course.json` for any folder that has one
  useEffect(() => {
    let alive = true
    for (const f of folders) {
      if (maps[f.tree] !== undefined) continue
      const hasJson = f.files.some(x => x.name.toLowerCase() === 'kguitar-course.json')
      if (!hasJson) {
        setMaps(prev => ({ ...prev, [f.tree]: null }))
        continue
      }
      void loadCourseMapForFolder(f).then(m => {
        if (alive) setMaps(prev => ({ ...prev, [f.tree]: m }))
      })
    }
    return () => { alive = false }
  }, [folders, maps])

  async function scan(tree: string, name?: string) {
    setBusy(tree); setErr('')
    try {
      const { files } = await LessonFolders.list({ tree })
      const f: Folder = { tree, name: name ?? folders.find(x => x.tree === tree)?.name ?? 'Lessons', files, scanned: Date.now() }
      const m = await loadCourseMapForFolder(f)
      setMaps(prev => ({ ...prev, [tree]: m }))
      setFolders(prev => [...prev.filter(x => x.tree !== tree), f])
      if (!files.some(x => kindOf(x) === 'video')) setErr(`No videos found in "${f.name}". Pick the folder that has the lesson videos in it (or a folder above it).`)
    } catch (e) {
      setErr((e as Error).message || "Couldn't read that folder.")
    }
    setBusy('')
  }

  async function pick() {
    setErr('')
    if (!lessonsAvailable()) {
      dirInputRef.current?.click()
      return
    }
    try {
      const r = await LessonFolders.pick()
      if (r.tree) await scan(r.tree, r.name)
    } catch (e) { setErr((e as Error).message) }
  }

  async function handleWebDirPick(fileList: FileList | null) {
    if (!fileList || !fileList.length) return
    setErr('')
    setBusy('web')
    try {
      const f = registerWebFolderFiles(fileList)
      if (!f) { setBusy(''); return }
      const m = await loadCourseMapForFolder(f)
      setMaps(prev => ({ ...prev, [f.tree]: m }))
      setFolders(prev => [...prev.filter(x => x.tree !== f.tree), f])
      if (!f.files.some(x => kindOf(x) === 'video')) {
        setErr(`No videos found in "${f.name}". Pick a course folder with .mp4 videos inside it.`)
      }
    } catch (e) {
      setErr((e as Error).message || "Couldn't read that folder.")
    }
    setBusy('')
  }

  async function remove(tree: string) {
    if (lessonsAvailable() && !tree.startsWith('webdir://')) {
      try { await LessonFolders.forget({ tree }) } catch { /* already gone */ }
    }
    setFolders(prev => prev.filter(x => x.tree !== tree))
  }

  const cur = open ? folders.find(f => f.tree === open.tree) : undefined
  if (open && cur) {
    const resolved = resolveCourse(cur, maps[cur.tree])
    const i = resolved.lessons.findIndex(x => x.video.uri === open.uri)
    if (i >= 0) {
      return (
        <LessonPlayer
          key={open.uri}
          course={resolved}
          lesson={resolved.lessons[i]}
          index={i}
          total={resolved.lessons.length}
          onBack={() => { setOpen(null); setTick(t => t + 1) }}
          onGo={d => {
            const j = i + d
            if (j >= 0 && j < resolved.lessons.length) setOpen({ tree: cur.tree, uri: resolved.lessons[j].video.uri })
          }}
        />
      )
    }
  }

  return (
    <div className="stack video-lessons">
      <button className="btn sm" style={{ justifySelf: 'start' }} onClick={onExit}>← Back</button>
      <h1 style={{ margin: 0 }}>Your video lessons</h1>
      <input
        ref={dirInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is standard across desktop browsers
        webkitdirectory=""
        directory=""
        style={{ display: 'none' }}
        onChange={e => { void handleWebDirPick(e.currentTarget.files); e.currentTarget.value = '' }}
        data-testid="course-webdir-input"
      />
      <WinArea area="videoLessons">
        {!folders.length && (
          <Win id="vl-intro" title="Getting started with Course Studio" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
            <p style={{ margin: 0 }}>
              Open your guitar courses right inside KGuitar with synced <b>PDF books</b>, <b>tab diagrams</b>, a <b>draggable/resizable floating video player</b>, <b>backing tracks</b>, and <b>speed/loop practice tools</b>.
            </p>
            <ol className="lick-steps">
              <li>Copy the whole course folder from <b>~/KGuitar-Courses/</b> onto your tablet/phone (e.g. into <b>Downloads</b> or <b>Documents</b> — via USB, LocalSend Wi-Fi, or unzipping a downloaded zip).</li>
              <li>Tap <b>Find my lessons</b>, open that course folder (such as <i>Roy Ziv - Hexatonic MasterClass</i>), then tap <b>Use this folder</b> → <b>Allow</b> at the bottom.</li>
              <li>Each lesson automatically opens its matching PDF book pages or tab diagram with the floating video player on top! <i>(Note: Android doesn&apos;t allow picking whole folders directly inside Google Drive — copy/unzip the folder to your device storage first.)</i></li>
            </ol>
          </Win>
        )}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => void pick()} disabled={!!busy}>
            {folders.length ? '+ Add another folder' : 'Find my lessons'}
          </button>
        </div>
        {err && <p className="notice small" role="alert" style={{ margin: 0 }}>{err}</p>}
        {folders.map(f => (
          <Course
            key={f.tree}
            f={f}
            map={maps[f.tree]}
            busy={busy === f.tree}
            watched={watched}
            onOpen={uri => setOpen({ tree: f.tree, uri })}
            onScan={() => (f.tree.startsWith('webdir://') ? dirInputRef.current?.click() : void scan(f.tree))}
            onRemove={() => void remove(f.tree)}
          />
        ))}
      </WinArea>
    </div>
  )
}

function Course({
  f,
  map,
  busy,
  watched,
  onOpen,
  onScan,
  onRemove,
}: {
  f: Folder
  map?: CourseMap | null
  busy: boolean
  watched: ReturnType<typeof progress>
  onOpen: (uri: string) => void
  onScan: () => void
  onRemove: () => void
}) {
  const resolved = useMemo(() => resolveCourse(f, map), [f, map])
  const lessons = resolved.lessons
  const done = lessons.filter(l => watched[l.video.uri]?.done).length
  const withBook = lessons.filter(l => l.pdf || l.images.length > 0).length
  const last = lessons
    .filter(l => watched[l.video.uri]?.at)
    .sort((a, b) => (watched[b.video.uri].at ?? 0) - (watched[a.video.uri].at ?? 0))[0]
  const next = last && !watched[last.video.uri]?.done ? last : lessons.find(l => !watched[l.video.uri]?.done)
  const [openCh, setOpenCh] = useState<string | null>(() => (next ? next.chapterId : resolved.chapters[0]?.id ?? null))
  const [confirm, setConfirm] = useState(false)

  return (
    <Win id={`vl-${hash(f.tree)}`} title={resolved.title} className="panel course" bodyClass="stack" bodyStyle={{ gap: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span className="small muted">
          {lessons.length} videos · {done} done
          {withBook > 0 ? ` · ${withBook} synced with book/tabs` : ''}
        </span>
        {resolved.hasMap && <span className="badge sm">📖 Book & Tab Sync ✓</span>}
      </div>
      {resolved.description && <p className="small muted" style={{ margin: 0 }}>{resolved.description}</p>}
      {next && (
        <button className="btn primary" onClick={() => onOpen(next.video.uri)}>
          ▶ {watched[next.video.uri]?.t ? 'Continue' : 'Start'}: {next.title}
        </button>
      )}
      <ul className="course-chapters">
        {resolved.chapters.map(c => {
          const cd = c.lessons.filter(l => watched[l.video.uri]?.done).length
          const isOpen = openCh === c.id
          return (
            <li key={c.id}>
              <button className="course-ch" aria-expanded={isOpen} onClick={() => setOpenCh(isOpen ? null : c.id)}>
                <b>{c.title}</b>
                <span className="small muted">
                  {c.lessons.length ? `${cd}/${c.lessons.length}` : ''}
                  {c.tabs.length ? ` · ${c.tabs.length} tab${c.tabs.length > 1 ? 's' : ''}` : ''}
                </span>
              </button>
              {isOpen && <ChapterList c={c} watched={watched} onOpen={onOpen} />}
            </li>
          )
        })}
      </ul>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn sm" onClick={onScan} disabled={busy}>{busy ? 'Reading…' : '↻ Look again'}</button>
        {confirm ? (
          <>
            <span className="small">Remove this folder from KGuitar? The files stay where they are.</span>
            <button className="btn sm" onClick={onRemove}>Remove</button>
            <button className="btn sm ghost" onClick={() => setConfirm(false)}>Keep</button>
          </>
        ) : <button className="btn sm ghost" onClick={() => setConfirm(true)}>Remove from KGuitar</button>}
      </div>
    </Win>
  )
}

function ChapterList({
  c,
  watched,
  onOpen,
}: {
  c: ResolvedChapter
  watched: ReturnType<typeof progress>
  onOpen: (uri: string) => void
}) {
  return (
    <div className="stack" style={{ gap: 4, padding: '4px 0 8px' }}>
      {c.lessons.map(l => {
        const v = l.video
        const w = watched[v.uri]
        const pct = w?.d ? Math.min(100, (w.t / w.d) * 100) : 0
        const pin = getPinnedPage(v.uri)
        const note = getLessonNote(v.uri)
        const sp = pin?.startPage ?? l.pdf?.startPage
        const ep = pin?.endPage ?? l.pdf?.endPage
        return (
          <button key={v.uri} className="course-video" onClick={() => onOpen(v.uri)}>
            <span className="cv-mark" aria-hidden>{w?.done ? '✓' : '▶'}</span>
            <span className="cv-name">{l.title}</span>
            <span className="row small muted" style={{ gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
              {l.tuning && <span className="badge sm">{l.tuning}</span>}
              {sp !== undefined && (
                <span className="small muted" title="Synced PDF book page">
                  📖 p.{sp}{ep && ep > sp ? `–${ep}` : ''}
                </span>
              )}
              {l.images.length > 0 && <span className="small muted" title="Tab diagram">🖼 Tab</span>}
              {l.backings.length > 0 && <span className="small muted" title="Backing track included">🎵</span>}
              {l.gpTabs.length > 0 && <span className="small muted" title="Guitar Pro tab included">🎸 GP</span>}
              {note.bpm && <span className="small muted">⏱ {note.bpm} BPM</span>}
            </span>
            {w && !w.done && pct > 1 && (
              <span className="cv-bar" aria-label={`${Math.round(pct)}% watched`}>
                <i style={{ width: `${pct}%` }} />
              </span>
            )}
          </button>
        )
      })}
      {c.tabs.length > 0 && <TabFiles tabs={c.tabs} />}
    </div>
  )
}

/** A tab file from a lesson folder as a song (Guitar Pro or text). */
async function docFromFile(f: LFile, bytes: Uint8Array, inst: Instrument): Promise<Omit<SongDoc, 'id'>> {
  if (kindOf(f) === 'text') {
    const d = songFromText(new TextDecoder().decode(bytes), niceName(f.name), inst)
    if (!d) throw new Error('No tab lines or chords found in that file.')
    return d
  }
  const { importGuitarPro } = await import('../tabs/gpImport')
  const song = importGuitarPro(bytes, f.name)
  return { title: song.title || niceName(f.name), artist: song.artist, source: 'gp', inst: inst.id, song, updated: Date.now() }
}

/** A chapter's tab files: Guitar Pro and text tabs open in Play (with a video if one is given). */
function TabFiles({ tabs, video }: { tabs: LFile[]; video?: LFile }) {
  const inst = useInstrument()
  const [msg, setMsg] = useState('')
  const [img, setImg] = useState<string | null>(null)
  async function openTab(t: LFile) {
    setMsg('')
    const k = kindOf(t)
    try {
      if (k === 'pdf') {
        if (lessonsAvailable()) { await LessonFolders.openExternal({ uri: t.uri, mime: 'application/pdf' }); return }
        window.open(mediaUrl(t.uri), '_blank')
        return
      }
      if (k === 'image') { setImg(img === t.uri ? null : t.uri); return }
      setMsg('Opening…')
      const id = `lf:${hash(t.uri)}:${inst.id}`
      let doc = await getSong(id)
      if (!doc) {
        const bytes = await readLessonBytes(t.uri)
        doc = { ...(await docFromFile(t, bytes, inst)), id }
      }
      if (video) doc = { ...doc, youtube: localVideoLink(video) }
      await saveSong(doc)
      setMsg('')
      openInPlay(doc)
    } catch (e) {
      setMsg((e as Error).message || "Couldn't open that file.")
    }
  }
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="small muted">Tabs{video ? ' (open in Play with this video beside them)' : ''}</span>
      {tabs.map(t => {
        const k = kindOf(t)
        return (
          <button key={t.uri} className="course-video tab-file" onClick={() => void openTab(t)}>
            <span className="cv-mark" aria-hidden><Ico n={k === 'pdf' ? 'file' : k === 'image' ? 'image' : 'guitar'} /></span>
            <span className="cv-name">{niceName(t.name)}</span>
            <span className="small muted">{k === 'pdf' ? 'PDF' : k === 'image' ? 'Show' : 'Play'}</span>
          </button>
        )
      })}
      {img && <img className="lesson-img" src={mediaUrl(img)} alt="Tab from the lesson folder" />}
      {msg && <p className="small notice" style={{ margin: 0 }} role="status">{msg}</p>}
    </div>
  )
}

type VideoLayout = 'float' | 'split' | 'video'

interface FloatBoxState {
  x: number // right edge normalized 0..1
  y: number // top edge normalized 0..1
  w: number // width in px
  min: boolean
  opacity?: number // 0.2 .. 1.0
}
const FLOAT_VIDEO_KEY = 'kg:courseFloatVideoPlace'
function loadFloatBox(): FloatBoxState {
  try {
    const raw = localStorage.getItem(FLOAT_VIDEO_KEY)
    if (raw) {
      const p = JSON.parse(raw) as FloatBoxState
      if (typeof p.x === 'number' && typeof p.y === 'number' && typeof p.w === 'number') {
        return { ...p, opacity: typeof p.opacity === 'number' ? Math.max(0.2, Math.min(1, p.opacity)) : 1 }
      }
    }
  } catch { /* ignore */ }
  return { x: 0.98, y: 0.14, w: 380, min: false, opacity: 1 }
}

function LessonPlayer({
  course,
  lesson,
  index,
  total,
  onBack,
  onGo,
}: {
  course: ResolvedCourse
  lesson: ResolvedLesson
  index: number
  total: number
  onBack: () => void
  onGo: (d: number) => void
}) {
  const v = lesson.video
  const inst = useInstrument()
  const strumState = useStrumState()
  const el = useRef<HTMLVideoElement>(null)
  const backingEl = useRef<HTMLAudioElement>(null)

  useEffect(() => onLeavePage(() => {
    el.current?.pause()
    backingEl.current?.pause()
  }), [])

  const hasVisualStage = !!(lesson.pdf || lesson.extraPdfs.length > 0 || lesson.images.length > 0)
  const [stageMode, setStageMode] = useState<'pdf' | 'image'>(() =>
    lesson.defaultView === 'image' && lesson.images.length > 0
      ? 'image'
      : (lesson.pdf || lesson.extraPdfs.length > 0)
        ? 'pdf'
        : 'image',
  )
  const [layout, setLayout] = useState<VideoLayout>(() => (hasVisualStage ? 'float' : 'video'))
  const [floatBox, setFloatBox] = useState<FloatBoxState>(loadFloatBox)

  // Sync stageMode & layout when moving to another lesson
  useEffect(() => {
    const nextHasStage = !!(lesson.pdf || lesson.extraPdfs.length > 0 || lesson.images.length > 0)
    setStageMode(
      lesson.defaultView === 'image' && lesson.images.length > 0
        ? 'image'
        : (lesson.pdf || lesson.extraPdfs.length > 0)
          ? 'pdf'
          : 'image',
    )
    setLayout(prev => {
      if (!nextHasStage) return 'video'
      return prev === 'video' ? 'float' : prev
    })
  }, [lesson])

  const saveFloat = (next: FloatBoxState) => {
    setFloatBox(next)
    try { localStorage.setItem(FLOAT_VIDEO_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  // Video playback state
  const [rate, setRate] = useState(1)
  const [mirror, setMirror] = useState(false)
  const [a, setA] = useState<number | null>(null)
  const [b, setB] = useState<number | null>(null)
  const [loop, setLoop] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [resumed, setResumed] = useState<number | null>(null)
  const [done, setDone] = useState(!!progress()[v.uri]?.done)
  const [error, setError] = useState('')
  const [tsMode, setTsMode] = useState(false)
  const tsPlayerRef = useRef<TsPlayerHandle | null>(null)
  const videoSrc = mediaUrl(v.uri)

  // Clean up any active mpegts.js player when switching lessons or unmounting
  useEffect(() => {
    setError('')
    setTsMode(false)
    return () => {
      tsPlayerRef.current?.destroy()
      tsPlayerRef.current = null
    }
  }, [v.uri])

  const handleVideoError = async () => {
    // If we already switched to mpegts.js, let its own error handler report
    if (tsMode) return
    const videoEl = el.current
    const probe = await probeVideoUrl(videoSrc)
    if (probe.kind === 'mpegts' && videoEl) {
      try {
        setTsMode(true)
        const handle = await attachMpegTsPlayer(videoEl, videoSrc, detail => {
          setError(`Couldn't decode this MPEG-TS video (${detail}).`)
        })
        if (handle) {
          tsPlayerRef.current = handle
          setError('')
          return
        }
      } catch { /* fall through to error banner */ }
    }
    if (probe.kind === 'http-error' && probe.status === 403) {
      setError('Android folder permission expired. Tap ← Lessons, remove & re-pick the course folder with "Find my lessons".')
    } else if (probe.kind === 'http-error' && probe.status === 404) {
      setError('File not found (moved or renamed). Tap ← Lessons, then ↻ Look again.')
    } else {
      const code = videoEl?.error?.code
      setError(`This video couldn't play inside the app${code ? ` (error ${code})` : ''}. Tap ← Lessons → ↻ Look again, or open it in your phone's video player below.`)
    }
  }

  // Practice tools state
  const [activeTool, setActiveTool] = useState<'metronome' | 'tuner' | 'note' | null>(null)
  const [fingerOpen, setFingerOpen] = useState(false)
  const [opacityOpen, setOpacityOpen] = useState(false)
  const [lessonNote, setLessonNoteState] = useState(() => getLessonNote(v.uri))
  const [backingIdx, setBackingIdx] = useState(0)
  const [backingRate, setBackingRate] = useState(1)
  const [backingLoop, setBackingLoop] = useState(true)
  const [gpBusy, setGpBusy] = useState('')

  useEffect(() => {
    setLessonNoteState(getLessonNote(v.uri))
    setBackingIdx(0)
  }, [v.uri])

  usePracticeTimer('theory', playing, true)
  const now = () => el.current?.currentTime ?? 0

  useEffect(() => {
    if (!loop || a === null || b === null || b <= a) return
    const t = setInterval(() => {
      const e = el.current
      if (e && (e.currentTime >= b || e.currentTime < a - 1)) e.currentTime = a
    }, 150)
    return () => clearInterval(t)
  }, [loop, a, b])

  useEffect(() => {
    const t = setInterval(() => {
      const e = el.current
      if (e && !e.paused) setProgress(v.uri, { t: e.currentTime, d: e.duration || undefined })
    }, 4000)
    return () => {
      clearInterval(t)
      const e = el.current
      if (e && e.currentTime > 1) setProgress(v.uri, { t: e.currentTime, d: e.duration || undefined })
    }
  }, [v.uri])

  const markDone = (d: boolean) => { setDone(d); setProgress(v.uri, { done: d }) }
  const setSpeed = (r: number) => { setRate(r); if (el.current) el.current.playbackRate = r }

  // Drag / resize handler for the floating video window
  const floatCardRef = useRef<HTMLDivElement>(null)
  const startFloatDrag = (e: RPE, mode: 'move' | 'size') => {
    if ((e.target as HTMLElement).closest('button') && mode === 'move') return
    e.preventDefault()
    const card = floatCardRef.current
    if (!card) return
    const r = card.getBoundingClientRect()
    const sx = e.clientX, sy = e.clientY
    const p0 = { ...floatBox }
    let last = p0
    const W = typeof innerWidth === 'number' ? innerWidth : 1024
    const H = typeof innerHeight === 'number' ? innerHeight : 768
    const mv = (ev: PointerEvent) => {
      if (mode === 'move') {
        last = {
          ...p0,
          x: Math.min(0.99, Math.max(0.15, (r.right + ev.clientX - sx) / W)),
          y: Math.min(0.92, Math.max(0.02, (r.top + ev.clientY - sy) / H)),
        }
      } else {
        const newW = Math.max(220, Math.min(W - 20, Math.round(r.width + ev.clientX - sx)))
        last = {
          ...p0,
          w: newW,
          x: Math.min(0.99, Math.max(0.2, (r.left + newW) / W)),
        }
      }
      setFloatBox(last)
    }
    const up = () => {
      removeEventListener('pointermove', mv)
      removeEventListener('pointerup', up)
      removeEventListener('pointercancel', up)
      saveFloat(last)
    }
    addEventListener('pointermove', mv)
    addEventListener('pointerup', up)
    addEventListener('pointercancel', up)
  }

  // Open a Guitar Pro tab directly in Play with this lesson video attached
  const openGpTabInPlay = async (gpFile: LFile) => {
    setGpBusy(gpFile.name)
    try {
      const id = `lf:${hash(gpFile.uri)}:${inst.id}`
      let doc = await getSong(id)
      if (!doc) {
        const bytes = await readLessonBytes(gpFile.uri)
        doc = { ...(await docFromFile(gpFile, bytes, inst)), id }
      }
      doc = { ...doc, youtube: localVideoLink(v) }
      await saveSong(doc)
      setGpBusy('')
      openInPlay(doc)
    } catch (e) {
      setGpBusy((e as Error).message || 'Could not open Guitar Pro file.')
    }
  }

  // Scan a PDF page into a playable tab in Play with this lesson video attached
  const urlToGray = (url: string): Promise<Gray> =>
    new Promise((resolve, reject) => {
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.onload = () => {
        const c = document.createElement('canvas')
        c.width = im.naturalWidth || im.width
        c.height = im.naturalHeight || im.height
        const ctx = c.getContext('2d')!
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, c.width, c.height)
        ctx.drawImage(im, 0, 0)
        resolve(toGray(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height))
      }
      im.onerror = () => reject(new Error('Could not decode picture.'))
      im.src = url
    })

  const handleScanPdfToPlay = async (pdfFile: LFile, fromPage: number, toPage: number, bytes: Uint8Array) => {
    const vLink = localVideoLink(v)
    const targetMidis = lesson.tuning?.toLowerCase().includes('drop d') && inst.midis.length === 6
      ? [38, ...inst.midis.slice(1)]
      : inst.midis
    try {
      const doc = await songFromPdf(pdfFile.name, bytes, inst, vLink, { from: fromPage, to: toPage })
      await saveSong(doc)
      openInPlay(doc)
    } catch (err) {
      if (err instanceof ScannedPdf) {
        // Deep high-DPI render (3.5× ≈ 252 DPI) + 99.1% neural tab_crnn + Dual-Reader Cross-Check!
        const pics = await pdfPictures(bytes, toPage - fromPage + 1, fromPage, 3.5)
        const grays = await Promise.all(pics.map(p => urlToGray(p.url)))
        const title = `${lesson.title} (p.${fromPage}${toPage > fromPage ? `–${toPage}` : ''})`
        const read = await readTabPicturesBest(grays, targetMidis, title, { deep: true })
        if (read && read.notes >= 4) {
          const doc: SongDoc = {
            id: newId(),
            title,
            source: 'text',
            inst: inst.id,
            song: read.song,
            youtube: vLink,
            updated: Date.now(),
          }
          await saveSong(doc)
          openInPlay(doc)
          return
        }
      }
      throw new Error('No playable tab staff was detected on this page — use the book view right here while watching!')
    }
  }

  // Scan a PNG/WebP tab diagram into a playable tab in Play using 99.1% neural tab_crnn + Dual-Reader Cross-Check
  const handleScanImageToPlay = async (imgFile: LFile) => {
    const vLink = localVideoLink(v)
    const targetMidis = lesson.tuning?.toLowerCase().includes('drop d') && inst.midis.length === 6
      ? [38, ...inst.midis.slice(1)]
      : inst.midis
    const gray = await urlToGray(mediaUrl(imgFile.uri))
    const read = await readTabPicturesBest([gray], targetMidis, lesson.title, { deep: true })
    if (!read || read.notes < 3) {
      throw new Error('Could not detect enough tab notes on this diagram to auto-play.')
    }
    const doc: SongDoc = {
      id: newId(),
      title: lesson.title,
      source: 'text',
      inst: inst.id,
      song: read.song,
      youtube: vLink,
      updated: Date.now(),
    }
    await saveSong(doc)
    openInPlay(doc)
  }

  const isFloating = hasVisualStage && layout === 'float'
  const isSplit = hasVisualStage && layout === 'split'
  const W = typeof innerWidth === 'number' ? innerWidth : 1024
  const H = typeof innerHeight === 'number' ? innerHeight : 768
  const cardW = Math.max(220, Math.min(floatBox.w, W - 16))
  const cardLeft = Math.max(6, Math.min(W - cardW - 6, Math.round(floatBox.x * W - cardW)))
  const cardTop = Math.max(6, Math.min(H - 140, Math.round(floatBox.y * H)))

  const activeBacking = lesson.backings[backingIdx] ?? lesson.backings[0]

  return (
    <div className="stack lesson-player" style={{ gap: 10 }} data-testid="lesson-player">
      {/* Top Navigation & Lesson Header */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <button className="btn sm" onClick={onBack}>← Lessons</button>
          <span className="small muted">{course.title}</span>
        </div>
        <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn sm" disabled={index === 0} onClick={() => onGo(-1)}>‹ Previous</button>
          <label className="ex-check"><input type="checkbox" checked={done} onChange={e => markDone(e.target.checked)} /> Done</label>
          <button className="btn sm" disabled={index >= total - 1} onClick={() => onGo(1)}>Next ›</button>
          <span className="small muted tabular">{index + 1} of {total}</span>
        </div>
      </div>

      {/* Title + Layout Switcher + Guitar Practice Tools Strip */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>{lesson.title}</h1>
            {lesson.tuning && <span className="badge">{lesson.tuning}</span>}
            {lesson.hint && <span className="badge ghost">{lesson.hint}</span>}
          </div>
          <span className="small muted">{lesson.chapterTitle}</span>
        </div>

        <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {hasVisualStage && (
            <div className="seg" role="group" aria-label="Video and book layout" data-testid="course-layout-switch">
              <button
                className="btn sm"
                aria-pressed={layout === 'float'}
                onClick={() => { setLayout('float'); if (floatBox.min) saveFloat({ ...floatBox, min: false }) }}
                data-testid="layout-float"
                title="Book/Tab fills the screen with a draggable, resizable floating video player"
              >
                ⧉ Float Video
              </button>
              <button
                className="btn sm"
                aria-pressed={layout === 'split'}
                onClick={() => setLayout('split')}
                data-testid="layout-split"
                title="Dock video and book side-by-side"
              >
                ◫ Side-by-Side
              </button>
              <button
                className="btn sm"
                aria-pressed={layout === 'video'}
                onClick={() => setLayout('video')}
                data-testid="layout-video"
                title="Show full-width video only"
              >
                🎬 Video Only
              </button>
            </div>
          )}

          {/* 5 Built-in Guitar Practice Tools */}
          <div className="row" style={{ gap: 4, flexWrap: 'wrap' }} role="group" aria-label="Lesson practice tools">
            <button
              className={`btn sm${activeTool === 'metronome' ? ' set' : ''}`}
              aria-pressed={activeTool === 'metronome'}
              onClick={() => setActiveTool(t => (t === 'metronome' ? null : 'metronome'))}
              data-testid="tool-metronome-btn"
              title="Metronome with +5 BPM Speed-Ramp Trainer"
            >
              ⏱ Metronome
            </button>
            <button
              className={`btn sm${strumState.floatNeckOpen ? ' set' : ''}`}
              aria-pressed={strumState.floatNeckOpen}
              onClick={() => strumMachine.setFloatNeckOpen(!strumState.floatNeckOpen)}
              data-testid="tool-float-neck-btn"
              title="Toggle the Floating 5-Layer Fretboard"
            >
              🎸 5-Layer Neck
            </button>
            <button
              className={`btn sm${fingerOpen ? ' set' : ''}`}
              aria-pressed={fingerOpen}
              onClick={() => setFingerOpen(o => !o)}
              data-testid="tool-finger-card-btn"
              title="Toggle the resizable, zoomable Floating Finger Diagram"
            >
              🖐 Finger Diagram
            </button>
            <button
              className={`btn sm${activeTool === 'tuner' ? ' set' : ''}`}
              aria-pressed={activeTool === 'tuner'}
              onClick={() => setActiveTool(t => (t === 'tuner' ? null : 'tuner'))}
              data-testid="tool-tuner-btn"
              title="Quick Drop-In Tuner"
            >
              🎯 Tuner{lesson.tuning ? ` (${lesson.tuning})` : ''}
            </button>
            <button
              className={`btn sm${activeTool === 'note' || lessonNote.bpm || lessonNote.note ? ' set' : ''}`}
              aria-pressed={activeTool === 'note'}
              onClick={() => setActiveTool(t => (t === 'note' ? null : 'note'))}
              data-testid="tool-note-btn"
              title="Log your current clean BPM and lesson notes"
            >
              📝 {lessonNote.bpm ? `${lessonNote.bpm} BPM` : 'My BPM / Note'}
            </button>
            <button
              className={`btn sm${strumState.playing ? ' set' : ''}`}
              aria-pressed={strumState.playing}
              onClick={() => (strumState.playing ? strumMachine.stop() : strumMachine.start())}
              data-testid="tool-strum-btn"
              title="Start or stop the Strum Machine groove"
            >
              🥁 Strum Machine
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Practice Tool Panels (Metronome + Speed-Ramp, Quick Tuner, My BPM & Note) */}
      {activeTool === 'metronome' && <InlineMetronomeTool initialBpm={lessonNote.bpm || 90} />}
      {activeTool === 'tuner' && <InlineTunerTool tuningHint={lesson.tuning} />}
      {activeTool === 'note' && (
        <div className="panel row" style={{ gap: 10, padding: '8px 12px', flexWrap: 'wrap', alignItems: 'center' }} data-testid="lesson-note-panel">
          <label className="row small" style={{ gap: 6, alignItems: 'center' }}>
            <b>My Clean BPM:</b>
            <button
              className="btn sm"
              onClick={() => {
                const next = setLessonNote(v.uri, { bpm: Math.max(30, (lessonNote.bpm || 80) - 5) })
                setLessonNoteState(next)
              }}
            >
              −5
            </button>
            <input
              className="input tabular"
              type="number"
              min={20}
              max={300}
              placeholder="e.g. 95"
              value={lessonNote.bpm ?? ''}
              style={{ width: 72, padding: '3px 6px' }}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : undefined
                setLessonNoteState(setLessonNote(v.uri, { bpm: val }))
              }}
              data-testid="lesson-bpm-input"
            />
            <button
              className="btn sm"
              onClick={() => {
                const next = setLessonNote(v.uri, { bpm: Math.min(280, (lessonNote.bpm || 75) + 5) })
                setLessonNoteState(next)
              }}
              data-testid="lesson-bpm-plus5"
            >
              +5 BPM
            </button>
          </label>
          <label className="row small" style={{ gap: 6, alignItems: 'center', flex: 1, minWidth: 220 }}>
            <b>Note:</b>
            <input
              className="input"
              type="text"
              placeholder="e.g. Clean at 95 BPM — watch ring finger on bar 4…"
              value={lessonNote.note ?? ''}
              style={{ flex: 1 }}
              onChange={e => setLessonNoteState(setLessonNote(v.uri, { note: e.target.value }))}
              data-testid="lesson-note-input"
            />
          </label>
        </div>
      )}

      {/* Companion Backing Track Strip & 1-Tap Guitar Pro Buttons */}
      {(lesson.backings.length > 0 || lesson.gpTabs.length > 0) && (
        <div className="panel row" style={{ gap: 12, padding: '8px 12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }} data-testid="lesson-companion-strip">
          {activeBacking && (
            <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              <span className="small"><b>🎵 Backing Track:</b></span>
              {lesson.backings.length > 1 ? (
                <select
                  className="input sm"
                  value={backingIdx}
                  onChange={e => setBackingIdx(Number(e.target.value))}
                  data-testid="backing-track-select"
                >
                  {lesson.backings.map((bk, i) => (
                    <option key={bk.file.uri} value={i}>{bk.label}</option>
                  ))}
                </select>
              ) : (
                <span className="small muted">{activeBacking.label}</span>
              )}
              <audio
                ref={backingEl}
                src={mediaUrl(activeBacking.file.uri)}
                controls
                loop={backingLoop}
                preload="metadata"
                style={{ height: 30, maxWidth: 260 }}
                onLoadedMetadata={e => { e.currentTarget.playbackRate = backingRate }}
                data-testid="lesson-backing-audio"
              />
              <div className="seg" role="group" aria-label="Backing track speed">
                {[0.5, 0.75, 1].map(r => (
                  <button
                    key={r}
                    className="btn sm"
                    aria-pressed={backingRate === r}
                    onClick={() => {
                      setBackingRate(r)
                      if (backingEl.current) backingEl.current.playbackRate = r
                    }}
                  >
                    {speedLabel(r)}
                  </button>
                ))}
              </div>
              <button
                className="btn sm"
                aria-pressed={backingLoop}
                onClick={() => setBackingLoop(l => !l)}
              >
                Loop
              </button>
            </div>
          )}

          {lesson.gpTabs.length > 0 && (
            <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {lesson.gpTabs.map(gp => (
                <button
                  key={gp.file.uri}
                  className="btn sm primary"
                  onClick={() => void openGpTabInPlay(gp.file)}
                  disabled={!!gpBusy}
                  data-testid="open-gp-in-play-btn"
                >
                  🎸 Open in Play: {gp.label}
                </button>
              ))}
              {gpBusy && <span className="small muted">{gpBusy}</span>}
            </div>
          )}
        </div>
      )}

      {/* MAIN STAGE: Book/Tab + Floating or Side-by-Side Video */}
      <div
        className="course-main-stage"
        style={
          isSplit
            ? { display: 'grid', gridTemplateColumns: 'minmax(300px, 44%) minmax(320px, 56%)', gap: 14, alignItems: 'start' }
            : { display: 'flex', flexDirection: 'column', gap: 10 }
        }
      >
        {/* Video Player: either Floating Card, Docked Left Column (Split), or Full Width (Video Only) */}
        {isFloating && floatBox.min && (
          <button
            className="float-bubble"
            style={{ position: 'fixed', left: Math.max(8, W - 180), top: cardTop, zIndex: 68 }}
            onClick={() => saveFloat({ ...floatBox, min: false })}
            data-testid="float-video-bubble"
          >
            <Ico n="play" /> Video · {lesson.title.slice(0, 18)}
          </button>
        )}

        <div
          ref={floatCardRef}
          className={isFloating ? 'float-card course-float-video' : 'stack'}
          style={
            isFloating
              ? {
                  position: 'fixed',
                  width: cardW,
                  left: cardLeft,
                  top: cardTop,
                  zIndex: 68,
                  display: floatBox.min ? 'none' : 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  opacity: floatBox.opacity ?? 1,
                  boxShadow: '0 10px 32px rgba(0,0,0,0.55)',
                }
              : { gap: 8 }
          }
          data-testid={isFloating ? 'course-floating-video-card' : 'course-docked-video'}
        >
          {isFloating && (
            <div
              className="fc-bar"
              onPointerDown={e => startFloatDrag(e, 'move')}
              title="Drag to move floating video player"
              style={{ cursor: 'grab' }}
              data-testid="float-video-drag-bar"
            >
              <span className="fc-grip" aria-hidden>⠿</span>
              <b style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lesson.title}
              </b>
              <button
                className="fc-btn"
                onClick={() => setOpacityOpen(o => !o)}
                title="Adjust video transparency so you can see the book underneath"
                aria-label="Video opacity"
                aria-pressed={opacityOpen}
                data-testid="float-video-opacity-btn"
                style={{ fontSize: 11, padding: '0 5px', width: 'auto' }}
              >
                ◐ {Math.round((floatBox.opacity ?? 1) * 100)}%
              </button>
              <button
                className="fc-btn"
                onClick={() => setLayout('split')}
                title="Dock side-by-side"
                aria-label="Dock side-by-side"
              >
                ◫
              </button>
              <button
                className="fc-btn"
                onClick={() => saveFloat({ ...floatBox, min: true })}
                title="Shrink to a bubble"
                aria-label="Shrink to a bubble"
                data-testid="float-video-minimize"
              >
                –
              </button>
            </div>
          )}

          {isFloating && opacityOpen && (
            <div
              className="row"
              style={{ gap: 6, padding: '4px 8px', alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
              data-testid="float-video-opacity-bar"
            >
              <span className="small muted" style={{ fontSize: 11 }}>Opacity</span>
              <input
                type="range"
                min={20}
                max={100}
                step={5}
                value={Math.round((floatBox.opacity ?? 1) * 100)}
                onChange={e => saveFloat({ ...floatBox, opacity: Number(e.target.value) / 100 })}
                style={{ flex: 1, minWidth: 80 }}
                aria-label="Floating video opacity"
                data-testid="float-video-opacity-slider"
              />
              <div className="row" style={{ gap: 3 }}>
                {[0.35, 0.6, 0.8, 1].map(val => (
                  <button
                    key={val}
                    className={`btn sm${Math.abs((floatBox.opacity ?? 1) - val) < 0.03 ? ' set' : ''}`}
                    style={{ padding: '1px 5px', minHeight: 22, fontSize: 11 }}
                    onClick={() => saveFloat({ ...floatBox, opacity: val })}
                    data-testid={`float-opacity-${Math.round(val * 100)}`}
                  >
                    {Math.round(val * 100)}%
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="lesson-video">
            <video
              ref={el}
              src={tsMode ? undefined : videoSrc}
              controls
              playsInline
              preload="metadata"
              className={mirror ? 'mirrored' : ''}
              onLoadedMetadata={e => {
                setError('')
                const w = progress()[v.uri]
                const d = e.currentTarget.duration
                if (w && w.t > 5 && (!d || w.t < d - 5)) { e.currentTarget.currentTime = w.t; setResumed(w.t) }
                e.currentTarget.playbackRate = rate
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => { setPlaying(false); markDone(true) }}
              onTimeUpdate={e => {
                const t = e.currentTarget
                if (!done && t.duration && t.currentTime / t.duration > 0.95) markDone(true)
              }}
              onError={() => { void handleVideoError() }}
            />
          </div>

          {error && (
            <div className="notice small stack" style={{ gap: 6, margin: 0 }}>
              <span>{error}</span>
              {lessonsAvailable() && (
                <button
                  className="btn sm"
                  style={{ justifySelf: 'start' }}
                  onClick={() => void LessonFolders.openExternal({ uri: v.uri, mime: 'video/mp4' })}
                >
                  Open in Phone Video Player ↗
                </button>
              )}
            </div>
          )}
          {resumed !== null && (
            <p className="small muted" style={{ margin: 0 }}>
              Picked up at {fmt(resumed)}.{' '}
              <button
                className="link-btn"
                onClick={() => { if (el.current) el.current.currentTime = 0; setResumed(null) }}
              >
                Start from the beginning
              </button>
            </p>
          )}

          {/* Video Speed / A–B Loop / Mirror Controls Bar */}
          <div className="lesson-bar" style={isFloating ? { gap: 4, flexWrap: 'wrap', padding: '0 4px 4px' } : undefined}>
            <div className="seg" role="group" aria-label="Speed">
              {SPEEDS.slice().sort((x, y) => x - y).map(r => (
                <button key={r} className="btn sm" aria-pressed={rate === r} onClick={() => setSpeed(r)}>
                  {speedLabel(r)}
                </button>
              ))}
            </div>
            <button className="btn sm" onClick={() => { if (el.current) el.current.currentTime = Math.max(0, now() - 5) }}>−5s</button>
            <button className="btn sm" onClick={() => { if (el.current) el.current.currentTime = now() + 5 }}>+5s</button>
            <button className={`btn sm${a !== null ? ' set' : ''}`} onClick={() => { setA(now()); if (b !== null && b <= now()) setB(null) }}>
              A{a !== null ? ` ${fmt(a)}` : ''}
            </button>
            <button className={`btn sm${b !== null ? ' set' : ''}`} disabled={a === null} onClick={() => { const t = now(); if (a !== null && t > a) { setB(t); setLoop(true) } }}>
              B{b !== null ? ` ${fmt(b)}` : ''}
            </button>
            <button className="btn sm" aria-pressed={loop} disabled={a === null || b === null} onClick={() => setLoop(l => !l)}>Loop</button>
            {(a !== null || b !== null) && (
              <button className="btn sm" onClick={() => { setA(null); setB(null); setLoop(false) }} aria-label="Clear loop">✕</button>
            )}
            <button className="btn sm" aria-pressed={mirror} onClick={() => setMirror(m => !m)} title="Flip the picture so the teacher's hands match yours">
              Mirror
            </button>
          </div>

          {isFloating && (
            <div
              className="fc-size"
              onPointerDown={e => startFloatDrag(e, 'size')}
              title="Drag to resize video player"
              aria-label="Drag to resize"
              role="separator"
              data-testid="float-video-resize-handle"
            >
              ◢
            </div>
          )}
        </div>

        {/* Synced PDF Book / Tab Diagram Stage */}
        {hasVisualStage && layout !== 'video' && (
          <CourseBookView
            lesson={lesson}
            stageMode={stageMode}
            onStageModeChange={setStageMode}
            onScanPdfToPlay={handleScanPdfToPlay}
            onScanImageToPlay={handleScanImageToPlay}
          />
        )}
      </div>

      {lesson.chapterTabs.length > 0 && (
        <WinArea area="lessonPlayer">
          <Win id="lp-tabs" title="Tabs for this lesson" className="panel" bodyClass="stack" bodyStyle={{ gap: 6 }}>
            <TabFiles tabs={lesson.chapterTabs} video={v} />
          </Win>
        </WinArea>
      )}
      <p className="small muted" style={{ margin: 0 }}>
        Tip: Drag ⠿ on the floating video to move it anywhere over the book, tap ◐ to make it see-through over the tabs, or drag ◢ to resize it. Tapping Next › advances both the video and the book pages together!
      </p>
      {fingerOpen && <CourseFingerCard lessonHint={lesson.hint} onHide={() => setFingerOpen(false)} />}
    </div>
  )
}

function InlineMetronomeTool({ initialBpm }: { initialBpm: number }) {
  const metroRef = useRef<Metronome | null>(null)
  const [running, setRunning] = useState(false)
  const [bpm, setBpm] = useState(initialBpm)
  const [ramp, setRamp] = useState(false)
  const [sub, setSub] = useState(1)
  const tapsRef = useRef<number[]>([])

  useEffect(() => {
    const m = new Metronome()
    m.bpm = initialBpm
    m.onBpm = nextBpm => setBpm(nextBpm)
    metroRef.current = m
    return () => m.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyBpm = (next: number) => {
    const clamped = Math.max(30, Math.min(260, Math.round(next)))
    setBpm(clamped)
    if (metroRef.current) metroRef.current.bpm = clamped
  }

  const toggleRun = () => {
    const m = metroRef.current
    if (!m) return
    if (running) {
      m.stop()
      setRunning(false)
    } else {
      m.bpm = bpm
      m.subdivision = sub
      m.trainer = { on: ramp, step: 5, everyBars: 4, max: 200 }
      m.start()
      setRunning(true)
    }
  }

  const toggleRamp = () => {
    const next = !ramp
    setRamp(next)
    if (metroRef.current) metroRef.current.trainer = { on: next, step: 5, everyBars: 4, max: 200 }
  }

  const changeSub = (s: number) => {
    setSub(s)
    if (metroRef.current) metroRef.current.subdivision = s
  }

  const handleTap = () => {
    const now = performance.now()
    const recent = tapsRef.current.filter(t => now - t < 2500)
    recent.push(now)
    tapsRef.current = recent
    if (recent.length >= 2) {
      const intervals = recent.slice(1).map((t, i) => t - recent[i])
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
      if (avg > 200) applyBpm(60000 / avg)
    }
  }

  return (
    <div className="panel row" style={{ gap: 10, padding: '8px 12px', flexWrap: 'wrap', alignItems: 'center' }} data-testid="inline-metronome-panel">
      <button className={`btn sm${running ? ' primary' : ''}`} onClick={toggleRun} data-testid="metro-start-btn">
        {running ? '⏹ Stop Click' : '▶ Start Click'}
      </button>
      <div className="row" style={{ gap: 4, alignItems: 'center' }}>
        <button className="btn sm" onClick={() => applyBpm(bpm - 5)} data-testid="metro-minus5">−5</button>
        <span className="tabular" style={{ minWidth: 68, textAlign: 'center', fontWeight: 700 }} data-testid="metro-bpm-readout">
          {bpm} BPM
        </span>
        <button className="btn sm" onClick={() => applyBpm(bpm + 5)} data-testid="metro-plus5">+5</button>
      </div>
      <button className="btn sm" onClick={handleTap} data-testid="metro-tap-btn">Tap</button>
      <div className="seg" role="group" aria-label="Subdivision">
        {[{ s: 1, l: '♩ 1/4' }, { s: 2, l: '♪ 1/8' }, { s: 3, l: '3/8' }, { s: 4, l: '1/16' }].map(x => (
          <button key={x.s} className="btn sm" aria-pressed={sub === x.s} onClick={() => changeSub(x.s)}>
            {x.l}
          </button>
        ))}
      </div>
      <button
        className={`btn sm${ramp ? ' set' : ''}`}
        aria-pressed={ramp}
        onClick={toggleRamp}
        data-testid="metro-ramp-btn"
        title="Automatically bump tempo +5 BPM every 4 bars"
      >
        🚀 Speed-Ramp (+5 BPM / 4 bars)
      </button>
    </div>
  )
}

function InlineTunerTool({ tuningHint }: { tuningHint?: string }) {
  const [on, setOn] = useState(false)
  const [reading, setReading] = useState<{ name: string; cents: number } | null>(null)
  const trRef = useRef<PitchTracker | null>(null)

  useEffect(() => () => trRef.current?.stop(), [])

  const toggle = async () => {
    if (on) {
      trRef.current?.stop()
      trRef.current = null
      setOn(false)
      setReading(null)
      return
    }
    const t = new PitchTracker({ filter: true })
    const last: number[] = []
    t.onReading = rd => {
      if (!rd || rd.freq <= 0 || rd.clarity < 0.88) return
      const m0 = freqToMidi(rd.freq)
      if (!Number.isFinite(m0)) return
      last.push(m0)
      if (last.length > 5) last.shift()
      const m = [...last].sort((a, b) => a - b)[Math.floor(last.length / 2)]
      const n = Math.round(m)
      setReading({ name: midiName(n), cents: Math.round((m - n) * 100) })
    }
    try {
      await t.start()
      trRef.current = t
      setOn(true)
    } catch {
      setOn(false)
    }
  }

  const inTune = reading && Math.abs(reading.cents) <= 5
  const refNotes = tuningHint?.toLowerCase().includes('drop d') ? 'D2 · A2 · D3 · G3 · B3 · E4 (Drop D)' : 'E2 · A2 · D3 · G3 · B3 · E4 (Standard)'

  return (
    <div className="panel row" style={{ gap: 12, padding: '8px 12px', flexWrap: 'wrap', alignItems: 'center' }} data-testid="inline-tuner-panel">
      <button className={`btn sm${on ? ' primary' : ''}`} onClick={() => void toggle()} data-testid="tuner-toggle-btn">
        <Ico n="mic" /> {on ? 'Stop Tuner' : 'Start Mic Tuner'}
      </button>
      <div className="row" style={{ gap: 8, alignItems: 'center', minWidth: 160 }}>
        <span style={{ fontSize: 20, fontWeight: 700 }} className="tabular">{reading?.name ?? '–'}</span>
        {reading && (
          <span className={`small tabular${inTune ? ' fc-ok' : ''}`}>
            {reading.cents > 0 ? '+' : ''}{reading.cents} cents{inTune ? ' · In tune ✓' : ''}
          </span>
        )}
      </div>
      <span className="small muted">Target strings: <b>{refNotes}</b></span>
    </div>
  )
}

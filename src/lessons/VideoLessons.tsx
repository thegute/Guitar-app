// Your video lessons (phone app only): pick a lesson folder on the phone once, then watch its videos chapter by
// chapter with slow-down, an A–B loop, a mirror view and resume. Its Guitar Pro or text tabs open in Play with the
// video beside them, so the app listens while you play along. Files stay where they are on the phone.
import { onLeavePage } from '../audio/stopAll'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useInstrument } from '../instrument'
import { usePracticeTimer } from '../learn/progress'
import { openInPlay } from '../nav'
import { getSong, saveSong, type SongDoc } from '../tabs/library'
import { songFromText } from '../tabs/importer'
import type { Instrument } from '../instrument'
import { SPEEDS } from '../components/LocalVideo'
import {
  LessonFolders, bytesOf, chapters, kindOf, lessonsAvailable, localVideoLink, mediaUrl, niceName, progress, saveFolders, savedFolders, setProgress,
  type Chapter, type Folder, type LFile,
} from './folders'

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
const speedLabel = (r: number) => (r === 1 ? '1×' : r === 0.75 ? '¾×' : r === 0.5 ? '½×' : r === 0.25 ? '¼×' : `${r}×`)

export function VideoLessons({ onExit }: { onExit: () => void }) {
  const [folders, setFolders] = useState<Folder[]>(() => savedFolders())
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<{ tree: string; uri: string } | null>(null)
  const [, setTick] = useState(0)
  const watched = progress()
  useEffect(() => saveFolders(folders), [folders])

  if (!lessonsAvailable()) {
    return (
      <div className="stack">
        <button className="btn sm" style={{ justifySelf: 'start' }} onClick={onExit}>← Back</button>
        <h1 style={{ margin: 0 }}>Your video lessons</h1>
        <p className="notice">This part is only in the KGuitar app on your phone.</p>
      </div>
    )
  }

  async function scan(tree: string, name?: string) {
    setBusy(tree); setErr('')
    try {
      const { files } = await LessonFolders.list({ tree })
      const f: Folder = { tree, name: name ?? folders.find(x => x.tree === tree)?.name ?? 'Lessons', files, scanned: Date.now() }
      setFolders(prev => [...prev.filter(x => x.tree !== tree), f])
      if (!files.some(x => kindOf(x) === 'video')) setErr(`No videos found in "${f.name}". Pick the folder that has the lesson videos in it (or a folder above it).`)
    } catch (e) {
      setErr((e as Error).message || "Couldn't read that folder.")
    }
    setBusy('')
  }
  async function pick() {
    setErr('')
    try {
      const r = await LessonFolders.pick()
      if (r.tree) await scan(r.tree, r.name)
    } catch (e) { setErr((e as Error).message) }
  }
  async function remove(tree: string) {
    try { await LessonFolders.forget({ tree }) } catch { /* already gone */ }
    setFolders(prev => prev.filter(x => x.tree !== tree))
  }

  const cur = open ? folders.find(f => f.tree === open.tree) : undefined
  if (open && cur) {
    const chs = chapters(cur.files)
    const all = chs.flatMap(c => c.videos.map(v => ({ v, c })))
    const i = all.findIndex(x => x.v.uri === open.uri)
    if (i >= 0) {
      return <LessonPlayer key={open.uri} item={all[i]} index={i} total={all.length}
        onBack={() => { setOpen(null); setTick(t => t + 1) }}
        onGo={d => { const j = i + d; if (j >= 0 && j < all.length) setOpen({ tree: cur.tree, uri: all[j].v.uri }) }} />
    }
  }

  return (
    <div className="stack video-lessons">
      <button className="btn sm" style={{ justifySelf: 'start' }} onClick={onExit}>← Back</button>
      <h1 style={{ margin: 0 }}>Your video lessons</h1>
      {!folders.length && (
        <section className="panel stack" style={{ gap: 8 }}>
          <p style={{ margin: 0 }}>Watch lesson videos you have on this phone right here, with slow-down, loops and their tabs in Play.</p>
          <ol className="lick-steps">
            <li>Put the course folder on the phone: copy it over with a USB cable, or download it from Google Drive into Downloads.</li>
            <li>Tap <b>Find my lessons</b> and choose that folder, then <b>Use this folder</b> and <b>Allow</b>.</li>
            <li>The lessons show up here chapter by chapter. Nothing is copied or uploaded: KGuitar reads them where they are.</li>
          </ol>
        </section>
      )}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn primary" onClick={() => void pick()} disabled={!!busy}>{folders.length ? '+ Add another folder' : 'Find my lessons'}</button>
      </div>
      {err && <p className="notice small" role="alert" style={{ margin: 0 }}>{err}</p>}
      {folders.map(f => <Course key={f.tree} f={f} busy={busy === f.tree} watched={watched} onOpen={uri => setOpen({ tree: f.tree, uri })} onScan={() => void scan(f.tree)} onRemove={() => void remove(f.tree)} />)}
    </div>
  )
}

function Course({ f, busy, watched, onOpen, onScan, onRemove }: { f: Folder; busy: boolean; watched: ReturnType<typeof progress>; onOpen: (uri: string) => void; onScan: () => void; onRemove: () => void }) {
  const chs = useMemo(() => chapters(f.files), [f.files])
  const videos = chs.flatMap(c => c.videos)
  const done = videos.filter(v => watched[v.uri]?.done).length
  // continue: the last one you watched if unfinished, else the first you haven't finished
  const last = videos.filter(v => watched[v.uri]?.at).sort((a, b) => (watched[b.uri].at ?? 0) - (watched[a.uri].at ?? 0))[0]
  const next = last && !watched[last.uri]?.done ? last : videos.find(v => !watched[v.uri]?.done)
  const [openCh, setOpenCh] = useState<string | null>(() => (next ? chs.find(c => c.videos.includes(next))?.id ?? null : chs[0]?.id ?? null))
  const [confirm, setConfirm] = useState(false)
  return (
    <section className="panel stack course" style={{ gap: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
        <h2 style={{ margin: 0 }}>{f.name}</h2>
        <span className="small muted">{videos.length} videos · {done} done</span>
      </div>
      {next && <button className="btn primary" onClick={() => onOpen(next.uri)}>▶ {watched[next.uri]?.t ? 'Continue' : 'Start'}: {niceName(next.name)}</button>}
      <ul className="course-chapters">
        {chs.map(c => {
          const cd = c.videos.filter(v => watched[v.uri]?.done).length
          const isOpen = openCh === c.id
          return (
            <li key={c.id}>
              <button className="course-ch" aria-expanded={isOpen} onClick={() => setOpenCh(isOpen ? null : c.id)}>
                <b>{c.title}</b><span className="small muted">{c.videos.length ? `${cd}/${c.videos.length}` : ''}{c.tabs.length ? ` · ${c.tabs.length} tab${c.tabs.length > 1 ? 's' : ''}` : ''}</span>
              </button>
              {isOpen && <ChapterList c={c} watched={watched} onOpen={onOpen} />}
            </li>
          )
        })}
      </ul>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn sm" onClick={onScan} disabled={busy}>{busy ? 'Reading…' : '↻ Look again'}</button>
        {confirm ? (
          <>
            <span className="small">Remove this folder from KGuitar? The files stay on your phone.</span>
            <button className="btn sm" onClick={onRemove}>Remove</button>
            <button className="btn sm ghost" onClick={() => setConfirm(false)}>Keep</button>
          </>
        ) : <button className="btn sm ghost" onClick={() => setConfirm(true)}>Remove from KGuitar</button>}
      </div>
    </section>
  )
}

function ChapterList({ c, watched, onOpen }: { c: Chapter; watched: ReturnType<typeof progress>; onOpen: (uri: string) => void }) {
  return (
    <div className="stack" style={{ gap: 4, padding: '4px 0 8px' }}>
      {c.videos.map(v => {
        const w = watched[v.uri]
        const pct = w?.d ? Math.min(100, (w.t / w.d) * 100) : 0
        return (
          <button key={v.uri} className="course-video" onClick={() => onOpen(v.uri)}>
            <span className="cv-mark" aria-hidden>{w?.done ? '✓' : '▶'}</span>
            <span className="cv-name">{niceName(v.name)}</span>
            {w && !w.done && pct > 1 && <span className="cv-bar" aria-label={`${Math.round(pct)}% watched`}><i style={{ width: `${pct}%` }} /></span>}
          </button>
        )
      })}
      {c.tabs.length > 0 && <TabFiles tabs={c.tabs} />}
    </div>
  )
}

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) }
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

/** A chapter's tab files: Guitar Pro and text tabs open in Play (with a video if one is given), PDFs open in your PDF app.
 *  Each file is one song in My songs (opening it again keeps your loop, chords and progress). */
function TabFiles({ tabs, video }: { tabs: LFile[]; video?: LFile }) {
  const inst = useInstrument()
  const [msg, setMsg] = useState('')
  const [img, setImg] = useState<string | null>(null)
  async function openTab(t: LFile) {
    setMsg('')
    const k = kindOf(t)
    try {
      if (k === 'pdf') { await LessonFolders.openExternal({ uri: t.uri, mime: 'application/pdf' }); return }
      if (k === 'image') { setImg(img === t.uri ? null : t.uri); return }
      setMsg('Opening…')
      const id = `lf:${hash(t.uri)}:${inst.id}`
      let doc = await getSong(id)
      if (!doc) {
        const { data } = await LessonFolders.read({ uri: t.uri })
        doc = { ...(await docFromFile(t, bytesOf(data), inst)), id }
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
            <span className="cv-mark" aria-hidden>{k === 'pdf' ? '📄' : k === 'image' ? '🖼' : '🎸'}</span>
            <span className="cv-name">{niceName(t.name)}</span>
            <span className="small muted">{k === 'pdf' ? 'PDF app' : k === 'image' ? 'Show' : 'Play'}</span>
          </button>
        )
      })}
      {img && <img className="lesson-img" src={mediaUrl(img)} alt="Tab from the lesson folder" />}
      {msg && <p className="small notice" style={{ margin: 0 }} role="status">{msg}</p>}
    </div>
  )
}

function LessonPlayer({ item, index, total, onBack, onGo }: { item: { v: LFile; c: Chapter }; index: number; total: number; onBack: () => void; onGo: (d: number) => void }) {
  const { v, c } = item
  const el = useRef<HTMLVideoElement>(null)
  useEffect(() => onLeavePage(() => el.current?.pause()), [])
  const [rate, setRate] = useState(1)
  const [mirror, setMirror] = useState(false)
  const [a, setA] = useState<number | null>(null)
  const [b, setB] = useState<number | null>(null)
  const [loop, setLoop] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [resumed, setResumed] = useState<number | null>(null)
  const [done, setDone] = useState(!!progress()[v.uri]?.done)
  const [error, setError] = useState(false)
  usePracticeTimer('theory', playing, true)
  const now = () => el.current?.currentTime ?? 0
  useEffect(() => {
    if (!loop || a === null || b === null || b <= a) return
    const t = setInterval(() => { const e = el.current; if (e && (e.currentTime >= b || e.currentTime < a - 1)) e.currentTime = a }, 150)
    return () => clearInterval(t)
  }, [loop, a, b])
  useEffect(() => {
    const t = setInterval(() => { const e = el.current; if (e && !e.paused) setProgress(v.uri, { t: e.currentTime, d: e.duration || undefined }) }, 4000)
    return () => { clearInterval(t); const e = el.current; if (e && e.currentTime > 1) setProgress(v.uri, { t: e.currentTime, d: e.duration || undefined }) }
  }, [v.uri])
  const markDone = (d: boolean) => { setDone(d); setProgress(v.uri, { done: d }) }
  const setSpeed = (r: number) => { setRate(r); if (el.current) el.current.playbackRate = r }
  return (
    <div className="stack lesson-player" style={{ gap: 8 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onBack}>← Lessons</button>
        <span className="small muted">{index + 1} of {total}</span>
      </div>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>{niceName(v.name)}</h1>
        <span className="small muted">{c.title}</span>
      </div>
      <div className="lesson-video">
        <video ref={el} src={mediaUrl(v.uri)} controls playsInline preload="metadata" className={mirror ? 'mirrored' : ''}
          onLoadedMetadata={e => {
            const w = progress()[v.uri]
            const d = e.currentTarget.duration
            if (w && w.t > 5 && (!d || w.t < d - 5)) { e.currentTarget.currentTime = w.t; setResumed(w.t) }
            e.currentTarget.playbackRate = rate
          }}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); markDone(true) }}
          onTimeUpdate={e => { const t = e.currentTarget; if (!done && t.duration && t.currentTime / t.duration > 0.95) markDone(true) }}
          onError={() => setError(true)} />
      </div>
      {error && <p className="notice small" style={{ margin: 0 }}>This video can't be played here. If the folder was moved, tap ← Lessons, then ↻ Look again. Some video formats (like .avi) don't play on phones.</p>}
      {resumed !== null && <p className="small muted" style={{ margin: 0 }}>Picked up at {fmt(resumed)}. <button className="link-btn" onClick={() => { if (el.current) el.current.currentTime = 0; setResumed(null) }}>Start from the beginning</button></p>}
      <div className="lesson-bar">
        <div className="seg" role="group" aria-label="Speed">
          {SPEEDS.slice().sort((x, y) => x - y).map(r => <button key={r} className="btn sm" aria-pressed={rate === r} onClick={() => setSpeed(r)}>{speedLabel(r)}</button>)}
        </div>
        <button className="btn sm" onClick={() => { if (el.current) el.current.currentTime = Math.max(0, now() - 5) }}>−5s</button>
        <button className="btn sm" onClick={() => { if (el.current) el.current.currentTime = now() + 5 }}>+5s</button>
        <button className={`btn sm${a !== null ? ' set' : ''}`} onClick={() => { setA(now()); if (b !== null && b <= now()) setB(null) }}>A{a !== null ? ` ${fmt(a)}` : ''}</button>
        <button className={`btn sm${b !== null ? ' set' : ''}`} disabled={a === null} onClick={() => { const t = now(); if (a !== null && t > a) { setB(t); setLoop(true) } }}>B{b !== null ? ` ${fmt(b)}` : ''}</button>
        <button className="btn sm" aria-pressed={loop} disabled={a === null || b === null} onClick={() => setLoop(l => !l)}>Loop</button>
        {(a !== null || b !== null) && <button className="btn sm" onClick={() => { setA(null); setB(null); setLoop(false) }} aria-label="Clear loop">✕</button>}
        <button className="btn sm" aria-pressed={mirror} onClick={() => setMirror(m => !m)} title="Flip the picture so the teacher's hands match yours">Mirror</button>
      </div>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn sm" disabled={index === 0} onClick={() => onGo(-1)}>‹ Previous</button>
        <label className="ex-check"><input type="checkbox" checked={done} onChange={e => markDone(e.target.checked)} /> Done</label>
        <button className="btn sm" disabled={index >= total - 1} onClick={() => onGo(1)}>Next ›</button>
      </div>
      {c.tabs.length > 0 && <section className="panel stack" style={{ gap: 6 }}><TabFiles tabs={c.tabs} video={v} /></section>}
      <p className="small muted" style={{ margin: 0 }}>Tip: A and B loop the bit you're learning, and ½× or ¼× slows it right down. Mirror flips the picture so the teacher's fretting hand is on the same side as yours.</p>
    </div>
  )
}

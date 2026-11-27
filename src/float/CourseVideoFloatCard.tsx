// Floating opacity-adjustable Course Video Player body (rendered inside FloatLayer's FloatCard for kind === 'course-video').
// Lets the guitarist watch a matched clip from Roy Ziv / Paul Davids / Matteo Mancuso right over any fretboard,
// scale, exercise, or Melodic Improv Gym — with 0.5x-1.25x speed, -5s/+5s, A-B loop, synced tab preview,
// 1-tap "GP -> Play", and 1-tap "Jam Over Backing in Improv Gym"!
import { useEffect, useRef, useState } from 'react'
import { useInstrument } from '../instrument'
import { learnGo, openImprovGym, openInPlay } from '../nav'
import { newId, saveSong, type SongDoc } from '../tabs/library'
import { localVideoLink, mediaUrl, niceName, readLessonBytes } from '../lessons/folders'
import {
  setCourseBackingForImprov,
  useActiveCourseVideo,
} from '../lessons/courseIndex'
import { attachMpegTsPlayer, probeVideoUrl, type TsPlayerHandle } from '../lessons/mpegtsFallback'
import { NativeVideoStage, nativeVideoAvailable, type NativeVideoHandle } from '../lessons/nativeVideo'

const SPEEDS = [0.5, 0.75, 0.9, 1, 1.15]

export function CourseVideoFloatBody() {
  const active = useActiveCourseVideo()
  const inst = useInstrument()
  const vidRef = useRef<HTMLVideoElement | null>(null)
  const nativeRef = useRef<NativeVideoHandle | null>(null)
  const tsRef = useRef<TsPlayerHandle | null>(null)
  const [speed, setSpeed] = useState(1)
  const [loopA, setLoopA] = useState<number | null>(null)
  const [loopB, setLoopB] = useState<number | null>(null)
  const [showTab, setShowTab] = useState(false)
  const [msg, setMsg] = useState('')
  const [busyGp, setBusyGp] = useState(false)

  const url = active ? mediaUrl(active.lesson.video.uri) : ''
  const useNative = active ? nativeVideoAvailable(active.lesson.video.uri) : false

  // Attach MPEG-TS fallback if needed on web/WebView, and seek to startSec if provided
  useEffect(() => {
    setLoopA(null); setLoopB(null); setMsg('')
    if (!active || useNative) return
    let dead = false
    const v = vidRef.current
    if (!v) return
    tsRef.current?.destroy()
    tsRef.current = null
    void probeVideoUrl(url).then(async probe => {
      if (dead || !vidRef.current) return
      if (probe.kind === 'mpegts' || probe.kind === 'm2ts') {
        const handle = await attachMpegTsPlayer(vidRef.current, url, () => {}, probe.kind)
        if (dead) { handle?.destroy(); return }
        tsRef.current = handle
      } else {
        vidRef.current.src = url
      }
      if (active.startSec && active.startSec > 0) {
        const onMeta = () => {
          if (vidRef.current) vidRef.current.currentTime = active.startSec!
        }
        vidRef.current.addEventListener('loadedmetadata', onMeta, { once: true })
      }
    })
    return () => {
      dead = true
      tsRef.current?.destroy()
      tsRef.current = null
    }
  }, [active?.lesson.video.uri, active?.startSec, url, useNative])

  // Apply playback speed
  useEffect(() => {
    if (useNative) {
      nativeRef.current?.setRate(speed)
    } else if (vidRef.current) {
      vidRef.current.playbackRate = speed
    }
  }, [speed, useNative])

  // Enforce A-B loop on HTML5 video
  useEffect(() => {
    const v = vidRef.current
    if (!v || useNative || loopA === null || loopB === null) return
    const onTime = () => {
      if (v.currentTime >= loopB || v.currentTime < loopA - 0.15) v.currentTime = loopA
    }
    v.addEventListener('timeupdate', onTime)
    return () => v.removeEventListener('timeupdate', onTime)
  }, [loopA, loopB, useNative])

  if (!active) {
    return (
      <div className="stack" style={{ gap: 8, padding: 6 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Tap any clip inside <b>🎬 From your courses</b> on Scales, Melodic Improv Gym, Exercises, or CAGED to float it right here!
        </p>
        <button className="btn sm primary" onClick={() => learnGo({ tool: 'videos' })}>
          📂 Open Course Studio
        </button>
      </div>
    )
  }

  const ls = active.lesson
  const firstImg = ls.images[0]?.file
  const firstGp = ls.gpTabs[0]?.file
  const firstBacking = ls.backings[0]?.file

  const seekBy = (delta: number) => {
    if (useNative) {
      const cur = nativeRef.current?.time() ?? 0
      nativeRef.current?.seek(Math.max(0, cur + delta))
    } else if (vidRef.current) {
      vidRef.current.currentTime = Math.max(0, vidRef.current.currentTime + delta)
    }
  }

  const markLoop = () => {
    const cur = useNative ? (nativeRef.current?.time() ?? 0) : (vidRef.current?.currentTime ?? 0)
    if (loopA === null) setLoopA(cur)
    else if (loopB === null) {
      if (cur > loopA + 0.5) setLoopB(cur)
      else { setLoopA(null); setLoopB(null) }
    } else {
      setLoopA(null); setLoopB(null)
    }
  }

  async function openGp() {
    if (!firstGp) return
    setBusyGp(true); setMsg('')
    try {
      const bytes = await readLessonBytes(firstGp.uri)
      const { importGuitarPro } = await import('../tabs/gpImport')
      const song = importGuitarPro(bytes, firstGp.name)
      const doc: SongDoc = {
        id: newId(),
        title: `${ls.title} (${active?.instructor || active?.courseTitle || 'Course'})`,
        artist: active?.instructor || active?.courseTitle,
        source: 'gp',
        inst: inst.id,
        youtube: localVideoLink(ls.video),
        song,
        updated: Date.now(),
      }
      await saveSong(doc)
      openInPlay(doc)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not open GP tab.')
    } finally {
      setBusyGp(false)
    }
  }

  return (
    <div className="stack" style={{ gap: 8 }} data-testid="course-video-float-body">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <strong className="small" style={{ display: 'block' }}>{ls.title}</strong>
          <span className="small muted">
            {active.courseTitle} · {ls.chapterTitle}
            {active.clipLabel ? ` · ⏱ ${active.clipLabel}` : ''}
          </span>
        </div>
        <button className="btn sm ghost" onClick={() => learnGo({ tool: 'videos' })}>
          ↗ Full Course
        </button>
      </div>

      <div style={{ borderRadius: 10, overflow: 'hidden', background: '#000', position: 'relative' }}>
        {useNative ? (
          <NativeVideoStage
            apiRef={nativeRef}
            uri={ls.video.uri}
            startSec={active.startSec ?? 0}
            rate={speed}
            mirror={false}
            floating
            onState={s => {
              if (loopA !== null && loopB !== null && s.time >= loopB) {
                nativeRef.current?.seek(loopA)
              }
            }}
          />
        ) : (
          <video
            ref={vidRef}
            controls
            playsInline
            style={{ width: '100%', maxHeight: 240, display: 'block', background: '#000' }}
          />
        )}
      </div>

      <div className="row" style={{ gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn sm" onClick={() => seekBy(-5)}>−5s</button>
        <button className="btn sm" onClick={() => seekBy(5)}>+5s</button>
        {SPEEDS.map(s => (
          <button key={s} className={`btn sm${speed === s ? ' primary' : ''}`} onClick={() => setSpeed(s)}>
            {s}×
          </button>
        ))}
        <button className={`btn sm${loopA !== null ? ' primary' : ''}`} onClick={markLoop}>
          {loopA === null ? 'A–B Loop' : loopB === null ? 'Set B' : 'Loop On ✕'}
        </button>
      </div>

      <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {firstImg && (
          <button className={`btn sm${showTab ? ' primary' : ''}`} onClick={() => setShowTab(v => !v)}>
            🖼 {showTab ? 'Hide Tab' : 'Show Tab'}
          </button>
        )}
        {firstGp && (
          <button className="btn sm" disabled={busyGp} onClick={() => void openGp()}>
            {busyGp ? 'Loading…' : `📄 ${niceName(firstGp.name)} → Play`}
          </button>
        )}
        {firstBacking && (
          <button
            className="btn sm primary"
            onClick={() => {
              setCourseBackingForImprov({
                file: firstBacking,
                title: `${ls.title} — ${active.courseTitle}`,
                courseTitle: active.courseTitle,
                hint: ls.hint,
              })
              openImprovGym({ fullPage: true })
            }}
          >
            🎵 Jam Over Track
          </button>
        )}
      </div>

      {showTab && firstImg && (
        <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--hairline)', background: '#fff' }}>
          <img src={mediaUrl(firstImg.uri)} alt={ls.title} style={{ width: '100%', display: 'block' }} />
        </div>
      )}
      {msg && <p className="small muted" style={{ margin: 0 }}>{msg}</p>}
    </div>
  )
}

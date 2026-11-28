// "Watch" inside a course lesson step: the videos the owner's favourite teachers made on exactly this step's idea
// (LoG Sounds first, then Signals Music Studio), from src/course/watch.ts. Each part is a button that plays just that
// stretch of the video (m:ss–m:ss) right here, with a line on what it shows. Parts that cover the lesson as a whole sit on
// the lesson's first Learn step. Guitar only: the teachers play guitar (ukulele and baritone keep the lesson's own videos).
import { useState } from 'react'
import { Ico } from '../components/Icon'
import { videoThumb, videoUrl } from '../learn/lessonExtras'
import type { CourseLesson, Step } from './types'
import { WATCH, type WatchPart, type WatchVideo } from './watch'

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** the videos (with only their parts for this step) to show on a step */
export function watchFor(lesson: CourseLesson, step: Step): WatchVideo[] {
  const firstLearn = lesson.steps.find(s => s.kind === 'learn')
  const here = (p: WatchPart) => p.step === step.title || (p.step === '' && step === firstLearn)
  return (WATCH[lesson.id] ?? []).map(v => ({ ...v, parts: v.parts.filter(here) })).filter(v => v.parts.length)
}

export function WatchHere({ lesson, step, guitar }: { lesson: CourseLesson; step: Step; guitar: boolean }) {
  const vids = guitar ? watchFor(lesson, step) : []
  if (!vids.length) return null
  return (
    <div className="watch-here" data-testid="watch-here">
      <h3 className="watch-head"><Ico n="film" /> Watch: {vids.length === 1 ? 'a teacher on this' : `${vids.length} teachers on this`}</h3>
      {vids.map(v => <WatchCard key={v.id} v={v} />)}
    </div>
  )
}

function WatchCard({ v }: { v: WatchVideo }) {
  const [part, setPart] = useState<WatchPart | null>(null)
  const origin = typeof location !== 'undefined' && /^https?:/.test(location.origin) ? location.origin : ''
  return (
    <div className="watch-card" data-testid="watch-card">
      <div className="watch-top">
        {part ? (
          <div className="lv-frame watch-frame">
            <iframe key={`${part.from}`} data-testid="watch-player"
              src={`https://www.youtube.com/embed/${v.id}?playsinline=1&rel=0&autoplay=1&start=${part.from}&end=${part.to}${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`}
              title={v.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          </div>
        ) : (
          <button className="watch-thumb" onClick={() => setPart(v.parts[0])} aria-label={`Play ${v.title} from ${mmss(v.parts[0].from)}`}>
            <img src={videoThumb(v.id)} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none' }} />
            <span className="lv-play" aria-hidden="true"><Ico n="play" fill /></span>
          </button>
        )}
        <div className="watch-meta">
          <b className="small">{v.title}</b>
          <span className="small muted">{v.teacher}</span>
        </div>
      </div>
      <div className="watch-parts">
        {v.parts.map(p => (
          <button key={`${p.from}-${p.step}`} className={`watch-part${part === p ? ' on' : ''}`} onClick={() => setPart(p)} data-testid="watch-part">
            <span className="watch-time"><Ico n="play" /> {mmss(p.from)}–{mmss(p.to)}</span>
            <span className="small">{p.what}</span>
          </button>
        ))}
      </div>
      <a className="small" href={`${videoUrl(v.id)}${part ? `&t=${part.from}s` : ''}`} target="_blank" rel="noreferrer">Open in YouTube ↗</a>
    </div>
  )
}

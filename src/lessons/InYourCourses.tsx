// "From your courses": automatically surfaces matching clips from the owner's connected local guitar courses
// (Roy Ziv Hexatonic, Modes Navigator, Speed Builder, Paul Davids Electric & Acoustic, Matteo Mancuso, etc.)
// on any KGuitar screen. Tapping a clip pops open a draggable, resizable, opacity-adjustable Floating Video Card
// right over your fretboard or drill — never kicking you off the page!
import { useState } from 'react'
import { Ico } from '../components/Icon'
import { useInstrument } from '../instrument'
import { openFloatingCard } from '../float/bus'
import { learnGo, openImprovGym, openInPlay } from '../nav'
import { newId, saveSong, type SongDoc } from '../tabs/library'
import { localVideoLink, niceName, readLessonBytes, type LFile } from './folders'
import {
  setActiveCourseVideo,
  setCourseBackingForImprov,
  useCourseMatches,
  type CourseMatch,
} from './courseIndex'

export function InYourCourses({
  topics,
  title = 'From your courses',
  max = 5,
  compact = false,
  showEmptyHint = false,
  preferCourse,
}: {
  topics: string[]
  title?: string
  max?: number
  compact?: boolean
  showEmptyHint?: boolean
  preferCourse?: string
}) {
  const inst = useInstrument()
  const { matches, hasFolders } = useCourseMatches(topics, { max, preferCourse })
  const [open, setOpen] = useState(!compact)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState('')

  if (!hasFolders) {
    if (!showEmptyHint) return null
    return (
      <section className="in-books in-courses" data-testid="in-courses-empty">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="small muted">
            🎬 Connect your local course folders (Roy Ziv, Paul Davids, Matteo Mancuso…) in <b>Learn → Video lessons</b> to auto-link matching clips here.
          </span>
          <button className="btn sm" onClick={() => learnGo({ tool: 'videos' })}>
            📂 Connect Courses
          </button>
        </div>
      </section>
    )
  }

  if (!matches.length) return null

  function openFloatClip(m: CourseMatch) {
    setActiveCourseVideo({
      folder: m.item.folder,
      courseTitle: m.item.courseTitle,
      instructor: m.item.instructor,
      lesson: m.item.lesson,
      startSec: m.clip?.startSec,
      clipLabel: m.clip?.label,
    })
    openFloatingCard('course-video')
  }

  async function openGpInPlay(m: CourseMatch, gpFile: LFile) {
    setBusyId(m.item.lesson.id)
    setErr('')
    try {
      const bytes = await readLessonBytes(gpFile.uri)
      const { importGuitarPro } = await import('../tabs/gpImport')
      const song = importGuitarPro(bytes, gpFile.name)
      const doc: SongDoc = {
        id: newId(),
        title: `${m.item.lesson.title} (${m.item.instructor || m.item.courseTitle})`,
        artist: m.item.instructor || m.item.courseTitle,
        source: 'gp',
        inst: inst.id,
        youtube: localVideoLink(m.item.lesson.video),
        song,
        updated: Date.now(),
      }
      await saveSong(doc)
      openInPlay(doc)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not open that Guitar Pro file.')
    } finally {
      setBusyId(null)
    }
  }

  function jamOverBacking(m: CourseMatch, audioFile: LFile) {
    setCourseBackingForImprov({
      file: audioFile,
      title: `${m.item.lesson.title} — ${m.item.courseTitle}`,
      courseTitle: m.item.courseTitle,
      hint: m.item.lesson.hint,
    })
    openImprovGym({ fullPage: true })
  }

  return (
    <section className="in-books in-courses" data-testid="in-courses">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
        <button
          className="in-courses-toggle"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          data-testid="in-courses-toggle"
        >
          <Ico n="film" /> <b>{title}</b>{' '}
          <span className="small muted">({matches.length} matching clip{matches.length === 1 ? '' : 's'})</span>{' '}
          <span className="small muted">{open ? '▴' : '▾'}</span>
        </button>
        <button className="btn sm ghost" onClick={() => learnGo({ tool: 'videos' })} title="Open full Course Studio">
          Course Studio ↗
        </button>
      </div>

      {open && (
        <ul className="in-courses-list">
          {matches.map(m => {
            const ls = m.item.lesson
            const firstGp = ls.gpTabs[0]?.file
            const firstBack = ls.backings[0]?.file
            return (
              <li key={`${m.item.folder.tree}:${ls.id}`} className="in-course-row">
                <button
                  className="in-course-main"
                  onClick={() => openFloatClip(m)}
                  title="Pop open this course video in a floating opacity-adjustable window"
                  data-testid="in-course-clip"
                >
                  <span className="in-course-badge">{m.item.instructor || m.item.courseTitle.split('—')[0].trim()}</span>
                  <span className="in-course-text">
                    <b>{ls.title}</b>
                    <span className="small muted">
                      {m.item.courseTitle} · {ls.chapterTitle}
                      {m.clip ? ` · ⏱ ${m.clip.label}` : ''}
                    </span>
                  </span>
                  <span className="in-course-play">▶ Float</span>
                </button>
                {(firstGp || firstBack) && (
                  <div className="row in-course-actions" style={{ gap: 4 }}>
                    {firstGp && (
                      <button
                        className="btn sm"
                        disabled={busyId === ls.id}
                        onClick={() => void openGpInPlay(m, firstGp)}
                        title={`Practice ${niceName(firstGp.name)} in Play & Game Mode`}
                      >
                        {busyId === ls.id ? 'Loading…' : '📄 GP → Play'}
                      </button>
                    )}
                    {firstBack && (
                      <button
                        className="btn sm"
                        onClick={() => jamOverBacking(m, firstBack)}
                        title={`Jam over ${niceName(firstBack.name)} in Melodic Improv Gym`}
                      >
                        🎵 Jam Track
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {err && <p className="small muted" style={{ margin: '4px 0 0', color: 'var(--bad)' }}>{err}</p>}
    </section>
  )
}

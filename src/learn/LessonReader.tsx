// Theory lessons: the chapter list and the lesson reader with playable examples.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Fretboard } from '../components/Fretboard'
import { CircleOfFifths } from '../components/CircleOfFifths'
import { playNote, strum } from '../audio/pluck'
import { playClick } from '../audio/metronome'
import { audio } from '../audio/engine'
import { INTERVAL_LABELS, SHARPS, FLATS, pc } from '../theory/notes'
import type { Instrument } from '../instrument'
import { CHAPTERS, LESSONS, chaptersFor, lessonById, lessonsFor, type Block, type Lesson } from './lessons'
import { Ico } from '../components/Icon'
import { COURSE } from '../course'
import { lessonProgress } from '../course/progress'
import { InYourBooks } from '../books/InYourBooks'
import { addXp, bump, logDone, usePracticeTimer } from './progress'
import type { Go } from './path'
import { LESSON_EXTRAS, lessonVideo, videoThumb, videoUrl, type LessonEx, type LessonVideo } from './lessonExtras'
import { useScreenInfo } from '../assistant/screen'

const READ = 'kg:lessonsRead'
export function lessonsRead(): string[] {
  try { return JSON.parse(localStorage.getItem(READ) ?? '[]') as string[] } catch { return [] }
}
function markRead(id: string) {
  const r = lessonsRead()
  const first = !r.includes(id)
  if (first) {
    r.push(id)
    try { localStorage.setItem(READ, JSON.stringify(r)) } catch { /* storage unavailable */ }
    addXp(20)
  }
  bump('lessonsRead')
  logDone('lesson:' + id)
  return first
}
export function nextLesson(instId?: string): Lesson {
  const r = new Set(lessonsRead())
  const list = lessonsFor(instId)
  return list.find(l => !r.has(l.id)) ?? list[0]
}

/** **bold** inside lesson text */
export function rich(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part))
}

function blockGo(b: Extract<Block, { practice: unknown }>['practice']): Go | null {
  if (b.quiz) return { quiz: b.quiz }
  if (b.tool === 'jam') return { tab: 'progressions' }
  if (b.tool === 'play') return { tab: 'play' }
  if (b.tool === 'practice') return { learn: 'exercises' }
  if (b.tool) return { tool: b.tool }
  return null
}

// ---------- sound helpers ----------
function start() {
  const ctx = audio()
  void ctx.resume()
  return ctx.currentTime + 0.06
}
function playExample(seq: number[] = [], chord: number[] = [], gap = 0.35) {
  let t = start()
  seq.forEach((m, i) => playNote(m, t + i * gap, 0.75))
  t += seq.length * gap + (seq.length ? 0.25 : 0)
  if (chord.length) strum(chord, t, { spread: 0.03 })
}
function playProg(chords: number[][], gap = 0.9) {
  const t = start()
  chords.forEach((c, i) => strum(c, t + i * gap, { spread: 0.025 }))
}

/** beats: note lengths in beats; a negative length is a rest (silent, drawn as a gap) */
function RhythmBlock({ label, beats, bpm = 80 }: { label: string; beats: number[]; bpm?: number }) {
  const [at, setAt] = useState(-1)
  const raf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  const total = beats.reduce((a, b) => a + Math.abs(b), 0)
  function play() {
    cancelAnimationFrame(raf.current)
    const spb = 60 / bpm
    const t0 = start() + 4 * spb // one bar count-in
    for (let i = 0; i < 4; i++) playClick(t0 - (4 - i) * spb, 'wood', i === 0 ? 'accent' : 'beat', 0.7)
    for (let b = 0; b < Math.ceil(total); b++) playClick(t0 + b * spb, 'wood', b % 4 === 0 ? 'accent' : 'beat', 0.45)
    const onsets: number[] = []
    let x = 0
    for (const b of beats) { onsets.push(x); if (b > 0) playNote(57, t0 + x * spb, 0.8); x += Math.abs(b) }
    const ctx = audio()
    const tick = () => {
      const beat = (ctx.currentTime - t0) / spb
      if (beat > total + 0.3) { setAt(-1); return }
      let i = -1
      onsets.forEach((o, k) => { if (beat >= o - 0.02) i = k })
      setAt(i)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }
  return (
    <div className="lesson-rhythm">
      <button className="btn sm" onClick={play}>▶ {label}</button>
      <div className="rhythm-strip" aria-hidden>
        {beats.map((b, i) => <span key={i} className={`${i === at ? 'on' : ''}${b < 0 ? ' rest' : ''}`} style={{ flexGrow: Math.abs(b) }} />)}
      </div>
    </div>
  )
}

export function BlockView({ b, inst, onGo }: { b: Block; inst: Instrument; onGo: (g: Go) => void }) {
  if ('p' in b) return <p>{rich(b.p)}</p>
  if ('list' in b) return <ul className="lesson-list">{b.list.map((x, i) => <li key={i}>{rich(x)}</li>)}</ul>
  if ('tip' in b) return <p className="notice small">{rich(b.tip)}</p>
  if ('play' in b) return <button className="btn sm lesson-play" onClick={() => playExample(b.play.seq, b.play.chord, b.play.gap)}>▶ {b.play.label}</button>
  if ('prog' in b) return <button className="btn sm lesson-play" onClick={() => playProg(b.prog.chords, b.prog.gap)}>▶ {b.prog.label}</button>
  if ('rhythm' in b) return <RhythmBlock {...b.rhythm} />
  if ('video' in b) return <div className="stack" style={{ gap: 4 }}>{b.video.note && <p className="small muted" style={{ margin: 0 }}>{rich(b.video.note)}</p>}<LessonVideoCard video={b.video} /></div>
  if ('circle' in b) {
    return (
      <div className="cof-wrap">
        <CircleOfFifths tonic={b.circle.tonic} minor={b.circle.minor} size={300} onPick={(root, minor) => {
          const r = 48 + pc(root)
          playExample([], [r, r + (minor ? 3 : 4), r + 7, r + 12])
        }} />
      </div>
    )
  }
  if ('spots' in b) {
    const marks = b.spots.marks(inst.midis)
    const at = new Map(marks.map(m => [`${m.s}:${m.f}`, m]))
    // a set end fret grows to show every mark (other tunings can put an octave further up)
    const to = Math.min(15, Math.max(b.spots.to ?? 5, ...marks.map(m => m.f + (b.spots.to ? 1 : 2))))
    return (
      <figure className="lesson-spots">
        <Fretboard tuning={inst.midis} fromFret={b.spots.from ?? 0} toFret={to} compact
          markFor={(_m, s, f) => { const x = at.get(`${s}:${f}`); return x ? { label: x.label, role: x.role } : null }}
          onTap={m => playNote(m, 0, 0.8)} />
        {b.spots.caption && <figcaption className="small muted">{b.spots.caption}</figcaption>}
      </figure>
    )
  }
  if ('neck' in b) {
    const r = pc(b.neck.root)
    const flats = /b/.test(b.neck.root) || b.neck.root === 'F'
    return (
      <Fretboard tuning={inst.midis} fromFret={0} toFret={b.neck.to ?? 12} compact
        markFor={m => {
          const iv = ((m % 12) - r + 12) % 12
          if (!b.neck.ivs.includes(iv)) return null
          const label = b.neck.labels === 'note' ? (flats ? FLATS : SHARPS)[m % 12] : INTERVAL_LABELS[iv]
          return { label, role: iv === 0 ? 'root' : [3, 4, 7].includes(iv) ? 'chord' : 'scale' }
        }}
        onTap={m => playNote(m, 0, 0.8)} />
    )
  }
  const go = blockGo(b.practice)
  return go ? <button className="btn lesson-practice" onClick={() => onGo(go)}>{b.practice.label}</button> : null
}

/** Watch: the lesson's YouTube video. The picture loads first; tapping it plays the video here. */
export function LessonVideoCard({ video, onPlay }: { video: LessonVideo; onPlay?: () => void }) {
  const [play, setPlay] = useState(false)
  useEffect(() => setPlay(false), [video.id])
  const origin = typeof location !== 'undefined' && /^https?:/.test(location.origin) ? location.origin : ''
  return (
    <div className="lesson-video">
      <div className="lv-frame">
        {play ? (
          <iframe src={`https://www.youtube.com/embed/${video.id}?playsinline=1&rel=0&autoplay=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`}
            title={video.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          <button className="lv-poster" onClick={() => { setPlay(true); onPlay?.() }} aria-label={`Play the video: ${video.title}`}>
            <img src={videoThumb(video.id)} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none' }} />
            <span className="lv-play" aria-hidden="true">▶</span>
          </button>
        )}
      </div>
      <div className="lv-meta">
        <span className="small"><b>{video.title}</b></span>
        <a className="small" href={videoUrl(video.id)} target="_blank" rel="noreferrer">Open in YouTube ↗</a>
      </div>
    </div>
  )
}

export function LessonView({ id, inst, onExit, onOpen, onGo, onExercise }: { id: string; inst: Instrument; onExit: () => void; onOpen: (id: string) => void; onGo: (g: Go) => void; onExercise?: (ex: LessonEx) => void }) {
  const onBook = (bid: string, page?: number) => onGo({ books: { id: bid, page } })
  const lesson = lessonById(id) ?? LESSONS[0]
  const [done, setDone] = useState(() => lessonsRead().includes(lesson.id))
  const [first, setFirst] = useState(false)
  usePracticeTimer('theory', true, false)
  useEffect(() => { setDone(lessonsRead().includes(lesson.id)); setFirst(false); document.getElementById('main')?.scrollTo({ top: 0 }) }, [lesson.id])
  const all = lessonsFor(inst.id)
  const i = all.indexOf(lesson)
  const next = i < 0 ? undefined : all[i + 1]
  const prev = i < 0 ? undefined : all[i - 1]
  const chapter = CHAPTERS.find(c => c.id === lesson.chapter)
  const extra = LESSON_EXTRAS[lesson.id]
  const video = lessonVideo(lesson.id, inst.id)
  const ownVideo = (inst.id === 'tenor' && extra?.uke) || (inst.id === 'baritone' && extra?.bari)
  const lessonText = lesson.blocks.map(b => ('p' in b ? b.p : 'list' in b ? b.list.map(x => `- ${x}`).join(' ') : 'tip' in b ? `Tip: ${b.tip}` : 'play' in b ? `[sound example: ${b.play.label}]` : 'prog' in b ? `[chord example: ${b.prog.label}]` : 'practice' in b ? `[practice: ${b.practice.label}]` : '')).filter(Boolean).join(' ').replace(/\s+/g, ' ')
  useScreenInfo('lesson', {
    label: `Theory lesson "${lesson.title}"`,
    summary: `Reading the theory lesson "${lesson.title}" (chapter: ${chapter?.title ?? lesson.chapter}, lesson ${i + 1} of ${all.length}${lesson.bookRef ? `, follows ${lesson.bookRef.chapter} of the owner's book "${lesson.bookRef.book}"` : ''}, about ${lesson.minutes} min${done ? ', marked as read' : ''}). What the lesson says: ${lessonText.slice(0, 1800)}${lessonText.length > 1800 ? '…' : ''}${next ? ` Next lesson: "${next.title}".` : ''}`,
  })
  return (
    <article className="lesson stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← All lessons</button>
        <span className="small muted">{lesson.minutes} min read</span>
      </div>
      <header>
        <p className="small muted" style={{ margin: 0 }}>{chapter?.title}</p>
        <h1 style={{ margin: '2px 0 0' }}>{lesson.title}</h1>
      </header>
      {extra && <h2 className="lesson-step"><span aria-hidden="true">1</span> Read</h2>}
      <div className="lesson-body">
        {lesson.blocks.map((b, k) => <BlockView key={k} b={b} inst={inst} onGo={onGo} />)}
      </div>
      {video && (
        <section className="stack" style={{ gap: 8 }}>
          <h2 className="lesson-step"><span aria-hidden="true">2</span> Watch</h2>
          <p className="small muted" style={{ margin: 0 }}>{inst.id === 'guitar' || ownVideo ? `The same idea, explained on the ${inst.id === 'guitar' ? 'guitar' : inst.id === 'tenor' ? 'ukulele' : 'baritone ukulele'} by a YouTube teacher.` : inst.id === 'baritone' ? 'Explained on the guitar: a baritone is tuned like the guitar\'s top four strings, so the shapes carry over.' : 'Explained on the guitar; the idea is the same on the ukulele.'}</p>
          <LessonVideoCard video={video} />
        </section>
      )}
      {extra && extra.exercises.length > 0 && onExercise && (
        <section className="stack" style={{ gap: 8 }}>
          <h2 className="lesson-step"><span aria-hidden="true">{video ? 3 : 2}</span> Play</h2>
          <p className="small muted" style={{ margin: 0 }}>Opens in Play: tap Listen and the notes light up as you get them. Take it slow.</p>
          <div className="lesson-exercises">
            {extra.exercises.map((ex, k) => (
              <button key={k} className="btn lesson-ex" onClick={() => onExercise(ex)}>
                <span aria-hidden="true">{'tool' in ex ? '◎' : '♪'}</span> {ex.label}
              </button>
            ))}
          </div>
        </section>
      )}
      {lesson.bookRef && (
        <p className="lesson-source small" data-testid="lesson-book">
          <Ico n="book" /> In your book: <b>{lesson.bookRef.book}</b>, {lesson.bookRef.chapter}
        </p>
      )}
      <InYourBooks topics={lesson.topics ?? []} refs={lesson.bookRef ? [{ book: lesson.bookRef.book, where: lesson.bookRef.chapter }] : []} onOpen={onBook} />
      {lesson.offtonic && (
        <a className="lesson-source" href={lesson.offtonic} target="_blank" rel="noreferrer">
          Read the full chapter on Offtonic Theory
        </a>
      )}
      <div className="lesson-end">
        {done ? (
          <p className="small" style={{ margin: 0 }}>{first ? '✓ Lesson done. +20 XP' : '✓ You have read this lesson.'}</p>
        ) : (
          <button className="btn primary big" onClick={() => { setFirst(markRead(lesson.id)); setDone(true) }}>I've read it ✓</button>
        )}
        <div className="row" style={{ justifyContent: 'space-between' }}>
          {prev ? <button className="btn sm ghost" onClick={() => onOpen(prev.id)}>← {prev.title}</button> : <span />}
          {next && <button className={`btn sm${done ? ' primary' : ''}`} onClick={() => onOpen(next.id)}>Next: {next.title}</button>}
        </div>
      </div>
    </article>
  )
}

const LEVEL_NAMES = ['Notes on the neck', 'Scales, chords and keys', 'Progressions, pentatonics and minor keys', 'Mapping the fretboard', 'Chords in depth', 'Chord tones, melody and soloing', 'Harmony in depth', 'Modes and beyond']

/** The theory course: Continue (the next lesson not finished), each level's lessons with progress, the levels still to come. */
function CourseLevels({ onOpen }: { onOpen: (id: string) => void }) {
  const [, setTick] = useState(0)
  useEffect(() => { const f = () => setTick(t => t + 1); addEventListener('kg-course', f); return () => removeEventListener('kg-course', f) }, [])
  const prog = (id: string) => lessonProgress(id)
  const next = COURSE.find(l => !prog(l.id).done) ?? COURSE[0]
  const np = prog(next.id)
  const levels = [...new Set(COURSE.map(l => l.level))]
  return (
    <section className="course-levels stack" style={{ gap: 10 }}>
      <h2 style={{ margin: 0 }}>The theory course</h2>
      <p className="small muted" style={{ margin: 0 }}>Eight levels, from the first notes to modes and beyond, taught the No Bull way with your other books for depth. Every lesson: learn it deeply, hear it, practise it for a week, use it in music, check it. {levels.length > 1 ? `Levels 1–${Math.max(...levels)} are` : 'Level 1 is'} ready; the next levels are on the way.</p>
      <button className="continue-card deep-preview" data-testid="deep-preview" onClick={() => onOpen(next.id)}>
        <span className="small muted">{np.steps.length ? 'Continue' : COURSE.some(l => prog(l.id).done) ? 'Next lesson' : 'Start the course'} · Level {next.level}, lesson {next.n}</span>
        <b>{next.title}</b>
        <span className="small muted">{next.goal}</span>
      </button>
      {levels.map(lv => {
        const ls = COURSE.filter(l => l.level === lv)
        const done = ls.filter(l => prog(l.id).done).length
        return (
          <section key={lv} className="chapter">
            <h3 style={{ margin: '4px 0' }}>Level {lv} · {LEVEL_NAMES[lv - 1]} <span className="small muted">{done}/{ls.length}</span></h3>
            <ul className="lesson-index">
              {ls.map(l => {
                const p = prog(l.id)
                const pct = Math.round((p.steps.filter(x => !x.startsWith('day:')).length / l.steps.length) * 100)
                return (
                  <li key={l.id}>
                    <button onClick={() => onOpen(l.id)} className={p.done ? 'read' : ''} data-testid={`course-lesson-${l.id}`}>
                      <span className="tick" aria-label={p.done ? 'finished' : 'not finished'}>{p.done ? '✓' : ''}</span>
                      <span>{l.n}. {l.title}</span>
                      <span className="small muted">{p.done ? 'done' : pct ? `${pct}%` : `${l.minutes} min`}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      <p className="small muted" style={{ margin: 0 }}>Coming next: {LEVEL_NAMES.slice(Math.max(...levels)).map((n, i) => `Level ${Math.max(...levels) + i + 1} · ${n}`).join(' · ')}</p>
    </section>
  )
}

export function LessonList({ onOpen, onExit, instId }: { onOpen: (id: string) => void; onExit: () => void; instId?: string }) {
  const read = useMemo(() => new Set(lessonsRead()), [])
  const all = lessonsFor(instId)
  const nxt = nextLesson(instId)
  let part = ''
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← Back</button>
        <span className="small muted">{all.filter(l => read.has(l.id)).length} of {all.length} read</span>
      </div>
      <h1 style={{ margin: 0 }}>Theory</h1>
      <p className="small muted" style={{ margin: 0 }}>
        {instId === 'guitar' || !instId
          ? 'The theory course comes first: Levels 1–3 so far, from the notes on the neck to minor keys and the blues. Below it are the earlier short lessons on topics the course hasn\'t reached yet (they follow Offtonic Theory, a free online textbook); each goes once its course level is written.'
          : 'Short lessons written for guitar and ukulele, following the chapters of Offtonic Theory, a free online textbook (each lesson links to its chapter if you want the full version). Every lesson has sounds to tap and something to try.'}
      </p>
      {COURSE.length > 0 && <CourseLevels onOpen={onOpen} />}
      <h2 className="course-earlier">Earlier lessons <span className="small muted">(topics the course hasn\'t reached yet)</span></h2>
      <button className="continue-card" onClick={() => onOpen(nxt.id)}>
        <span className="small muted">{read.size ? 'Continue with' : 'Start with'}</span>
        <b>{nxt.title}</b>
        <span className="small muted">{CHAPTERS.find(c => c.id === nxt.chapter)?.title} · {nxt.minutes} min</span>
      </button>
      {chaptersFor(instId).map(ch => {
        const list = all.filter(l => l.chapter === ch.id)
        const head = ch.part !== part
        part = ch.part
        const n = list.filter(l => read.has(l.id)).length
        return (
          <section key={ch.id} className="chapter">
            {head && <p className="small muted chapter-part">{ch.part}</p>}
            <h2>{ch.title} <span className="small muted">{n}/{list.length}</span></h2>
            <ul className="lesson-index">
              {list.map(l => (
                <li key={l.id}>
                  <button onClick={() => onOpen(l.id)} className={read.has(l.id) ? 'read' : ''}>
                    <span className="tick" aria-label={read.has(l.id) ? 'read' : 'not read'}>{read.has(l.id) ? '✓' : ''}</span>
                    <span>{l.title}</span>
                    <span className="small muted">{l.minutes} min</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

// A deep course lesson, one step at a time: a progress rail (sideways strip on the phone, a column beside the lesson on
// wide screens), the step itself, and Back / Next. Steps: why · learn · worked examples · hear it · mistakes · practice
// week · use it · check (recall, apply, hear, play + explain it back to the teacher) · go deeper. Finishing schedules
// short reviews after 1, 3, 7 and 30 days.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Instrument } from '../instrument'
import type { Go } from '../learn/path'
import type { LessonEx } from '../learn/lessonExtras'
import { BlockView, LessonVideoCard, rich } from '../learn/LessonReader'
import { stars, usePracticeTimer } from '../learn/progress'
import { Ico } from '../components/Icon'
import { askAssistant } from '../assistant/bus'
import { useScreenInfo } from '../assistant/screen'
import { STEP_LABEL, type CourseLesson, type Step, type Task, type WorkedExample } from './types'
import { REVIEW_DAYS, finishLesson, lessonProgress, nextReviewAt, reviewDone, reviewDue, setAt, stepDone, toggleDay } from './progress'
import { Fretboard } from '../components/Fretboard'
import { playNote } from '../audio/pluck'

const KIND_ICON: Record<Step['kind'], Parameters<typeof Ico>[0]['n']> = {
  why: 'target', learn: 'book', examples: 'puzzle', hear: 'ear', mistakes: 'zap', practice: 'calendar', use: 'music', check: 'check', deeper: 'gem',
}

function useCourseProgress(id: string) {
  const [p, setP] = useState(() => lessonProgress(id))
  useEffect(() => { const f = () => setP(lessonProgress(id)); addEventListener('kg-course', f); f(); return () => removeEventListener('kg-course', f) }, [id])
  return p
}

function taskGo(t: Task): Go | null {
  if ('quiz' in t) return { quiz: t.quiz }
  if ('tool' in t) return t.tool === 'jam' ? { tab: 'progressions' } : { tool: t.tool }
  return null
}

function TaskButton({ t, onGo, onExercise, done }: { t: Task; onGo: (g: Go) => void; onExercise: (ex: LessonEx) => void; done?: boolean }) {
  const icon = 'quiz' in t ? (t.how === 'play' ? 'mic' : 'puzzle') : 'tool' in t ? (t.tool === 'jam' ? 'drum' : 'sparkle') : 'play'
  return (
    <button className={`deep-task${done ? ' done' : ''}`} data-testid="deep-task"
      onClick={() => { if ('ex' in t) onExercise(t.ex); else { const g = taskGo(t); if (g) onGo(g) } }}>
      <span className="deep-task-ico" aria-hidden="true"><Ico n={done ? 'check' : icon} /></span>
      <span className="deep-task-text">
        <b>{t.label}</b>
        <span className="small muted">
          {[t.minutes ? `${t.minutes} min` : '', 'ex' in t ? 'opens in Play, the mic follows you' : 'quiz' in t ? (t.how === 'play' ? 'answer by playing' : 'quiz') : 'tool' in t && t.tool === 'jam' ? 'Jam band' : '', t.goal ? `goal: ${t.goal}` : ''].filter(Boolean).join(' · ')}
        </span>
      </span>
    </button>
  )
}

function SpotsFigure({ spots, inst }: { spots: NonNullable<WorkedExample['spots']>; inst: Instrument }) {
  const marks = spots.marks(inst.midis)
  const at = new Map(marks.map(m => [`${m.s}:${m.f}`, m]))
  return (
    <Fretboard tuning={inst.midis} fromFret={spots.from ?? 0} toFret={spots.to ?? 12} compact
      markFor={(_m, s, f) => { const x = at.get(`${s}:${f}`); return x ? { label: x.label, role: x.role } : null }}
      onTap={m => playNote(m, 0, 0.8)} />
  )
}

function Example({ ex, inst, n }: { ex: WorkedExample; inst: Instrument; n: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="deep-example">
      <p className="deep-example-q"><span className="deep-num">{n}</span>{rich(ex.q)}</p>
      {!open ? (
        <button className="btn sm" data-testid="deep-show" onClick={() => setOpen(true)}>Show me how</button>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          <ol className="deep-example-steps">{ex.steps.map((s, i) => <li key={i}>{rich(s)}</li>)}</ol>
          <p className="deep-answer"><Ico n="check" /> {rich(ex.answer)}</p>
          {ex.spots && <SpotsFigure spots={ex.spots} inst={inst} />}
        </div>
      )}
    </div>
  )
}

function StepBody({ step, inst, lesson, onGo, onExercise }: { step: Step; inst: Instrument; lesson: CourseLesson; onGo: (g: Go) => void; onExercise: (ex: LessonEx) => void }) {
  const p = useCourseProgress(lesson.id)
  const blocks = (bs: Extract<Step, { blocks: unknown }>['blocks']) => <div className="lesson-body">{bs.map((b, k) => <BlockView key={k} b={b} inst={inst} onGo={onGo} />)}</div>
  const tasks = (ts: Task[]) => <div className="deep-tasks">{ts.map((t, k) => <TaskButton key={k} t={t} onGo={onGo} onExercise={onExercise} />)}</div>
  switch (step.kind) {
    case 'why': case 'learn': return blocks(step.blocks)
    case 'examples': return (
      <div className="stack">
        {step.intro && <p className="small muted" style={{ margin: 0 }}>{step.intro}</p>}
        {step.examples.map((ex, i) => <Example key={i} ex={ex} inst={inst} n={i + 1} />)}
      </div>
    )
    case 'hear': return <div className="stack">{blocks(step.blocks)}<h3 className="deep-sub">Ear drills</h3>{tasks(step.drills)}</div>
    case 'mistakes': return (
      <ul className="deep-mistakes">
        {step.items.map((m, i) => (
          <li key={i}>
            <p className="deep-wrong"><span aria-hidden="true">✗</span> {rich(m.wrong)}</p>
            <p className="deep-right"><span aria-hidden="true">✓</span> {rich(m.right)}</p>
          </li>
        ))}
      </ul>
    )
    case 'practice': return (
      <div className="stack">
        <p style={{ margin: 0 }}>{step.intro}</p>
        {step.days.map((d, i) => {
          const done = p.steps.includes('day:' + i)
          return (
            <section key={i} className={`deep-day${done ? ' done' : ''}`}>
              <header className="deep-day-head">
                <b>{d.day}</b><span className="muted"> · {d.focus}</span>
                <label className="deep-day-tick"><input type="checkbox" checked={done} onChange={() => toggleDay(lesson.id, i)} /> Done</label>
              </header>
              {tasks(d.tasks)}
            </section>
          )
        })}
      </div>
    )
    case 'use': return <div className="stack">{blocks(step.blocks)}{tasks(step.tasks)}</div>
    case 'check': return <CheckStep step={step} onGo={onGo} onExercise={onExercise} />
    case 'deeper': return (
      <div className="stack">
        {step.video && <LessonVideoCard video={step.video} />}
        <h3 className="deep-sub">In your books</h3>
        <ul className="deep-books">
          {step.books.map((b, i) => <li key={i}><Ico n="book" /> <span><b>{b.book}</b>, {b.where}. <span className="muted">{b.why}</span></span></li>)}
        </ul>
        {blocks(step.blocks)}
      </div>
    )
  }
}

function CheckStep({ step, onGo, onExercise }: { step: Extract<Step, { kind: 'check' }>; onGo: (g: Go) => void; onExercise: (ex: LessonEx) => void }) {
  const st = stars()
  const [showPoints, setShowPoints] = useState(false)
  return (
    <div className="stack">
      <p style={{ margin: 0 }}>{step.intro}</p>
      <div className="deep-checks">
        {step.tasks.map((t, i) => {
          const passed = 'quiz' in t && (st[t.quiz] ?? 0) >= 2
          return (
            <div key={i} className={`deep-check${passed ? ' passed' : ''}`}>
              <span className="deep-skill">{t.skill}</span>
              <TaskButton t={t} onGo={onGo} onExercise={onExercise} done={passed} />
            </div>
          )
        })}
      </div>
      <section className="deep-explain">
        <h3 className="deep-sub"><Ico n="talk" /> Explain it back</h3>
        <p className="small" style={{ margin: 0 }}>The best test of understanding: explain it in your own words. The teacher asks you, one question at a time, and tells you what you missed.</p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn primary sm" data-testid="deep-explain" onClick={() => askAssistant(step.explain.prompt, 'general')}>Explain it to the teacher</button>
          <button className="btn sm ghost" onClick={() => setShowPoints(v => !v)}>{showPoints ? 'Hide' : 'What a good answer covers'}</button>
        </div>
        {showPoints && <ul className="lesson-list">{step.explain.points.map((x, i) => <li key={i}>{x}</li>)}</ul>}
      </section>
    </div>
  )
}

export function DeepLessonView({ lesson, inst, onExit, onGo, onExercise }: { lesson: CourseLesson; inst: Instrument; onExit: () => void; onGo: (g: Go) => void; onExercise: (ex: LessonEx) => void }) {
  const p = useCourseProgress(lesson.id)
  const [at, setAtState] = useState(() => Math.min(lessonProgress(lesson.id).at ?? 0, lesson.steps.length - 1))
  const [justDone, setJustDone] = useState(false)
  const top = useRef<HTMLElement>(null)
  usePracticeTimer('theory', true, false)
  const step = lesson.steps[at]
  const go = (i: number) => {
    setAtState(i); setAt(lesson.id, i)
    top.current?.scrollIntoView({ block: 'start' })
    document.querySelector(`[data-step="${i}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }
  const next = () => { stepDone(lesson.id, at); if (at < lesson.steps.length - 1) go(at + 1) }
  const due = reviewDue(p)
  const nextReview = nextReviewAt(p)
  const lessonText = useMemo(() => lesson.steps.flatMap(s => 'blocks' in s ? s.blocks.flatMap(b => 'p' in b ? [b.p] : 'tip' in b ? [b.tip] : 'list' in b ? b.list : []) : []).join(' ').replace(/\*\*/g, ''), [lesson])
  useScreenInfo('lesson', {
    label: `Theory course lesson "${lesson.title}"`,
    summary: `Level ${lesson.level}, lesson ${lesson.n}: "${lesson.title}". Goal: ${lesson.goal} On step ${at + 1} of ${lesson.steps.length} (${STEP_LABEL[step.kind]}: ${step.title}).${p.done ? ' Finished.' : ''} The lesson says: ${lessonText.slice(0, 1800)}`,
  })
  const doneCount = lesson.steps.filter((_, i) => p.steps.includes(String(i))).length
  const pct = Math.round((doneCount / lesson.steps.length) * 100)
  let card: ReactNode = null
  if (due >= 0) card = (
    <div className="deep-review" data-testid="deep-review">
      <b>Review time ({REVIEW_DAYS[due]} day{REVIEW_DAYS[due] > 1 ? 's' : ''} since you finished)</b>
      <span className="small">5 minutes: the Hear it drills and the Check. It's what makes this stick for good.</span>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn sm" onClick={() => go(lesson.steps.findIndex(s => s.kind === 'check'))}>Go to the Check</button>
        <button className="btn sm primary" onClick={() => reviewDone(lesson.id)}>I've done the review</button>
      </div>
    </div>
  )
  return (
    <article className="deep" ref={top}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← Back</button>
        <span className="small muted">Level {lesson.level} · Lesson {lesson.n}</span>
      </div>
      <header className="deep-head">
        <h1>{lesson.title}</h1>
        <div className="deep-goal">
          <Ico n="target" />
          <span>
            <b>By the end:</b> {lesson.goal}
            <span className="deep-goal-meta">About {lesson.minutes} minutes to read and listen, then a 7-day practice plan.{lesson.builds?.length ? ` Builds on: ${lesson.builds.join(', ')}.` : ''}</span>
          </span>
        </div>
        {inst.id !== 'guitar' && <p className="notice small" style={{ margin: 0 }}>The pictures, tabs and quizzes follow your {inst.label.toLowerCase()}'s tuning; the string names in the text are the guitar's.</p>}
        <div className="deep-bar" aria-label={`${pct}% done`}><span style={{ width: `${pct}%` }} /></div>
      </header>
      {card}
      {p.done && !justDone && nextReview && due < 0 && <p className="small muted" style={{ margin: 0 }}><Ico n="calendar" /> Finished. Next review: {new Date(nextReview).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}.</p>}
      <div className="deep-layout">
        <nav className="deep-rail" aria-label="Lesson steps">
          {lesson.steps.map((s, i) => (
            <button key={i} data-step={i} className={`deep-rail-step${i === at ? ' on' : ''}${p.steps.includes(String(i)) ? ' done' : ''}`} onClick={() => go(i)} aria-current={i === at ? 'step' : undefined}>
              <span className="deep-rail-ico" aria-hidden="true"><Ico n={p.steps.includes(String(i)) ? 'check' : KIND_ICON[s.kind]} /></span>
              <span className="deep-rail-text">{s.title !== STEP_LABEL[s.kind] && <span className="deep-rail-kind">{STEP_LABEL[s.kind]}</span>}<span className="deep-rail-title">{s.title}</span></span>
            </button>
          ))}
        </nav>
        <section className="deep-step" data-testid="deep-step" key={at}>
          <p className="deep-eyebrow"><Ico n={KIND_ICON[step.kind]} /> {STEP_LABEL[step.kind]} · step {at + 1} of {lesson.steps.length}</p>
          <h2>{step.title}</h2>
          <StepBody step={step} inst={inst} lesson={lesson} onGo={onGo} onExercise={onExercise} />
          <footer className="deep-nav">
            {at > 0 ? <button className="btn ghost" onClick={() => go(at - 1)}>← {lesson.steps[at - 1].title}</button> : <span />}
            {at < lesson.steps.length - 1
              ? <button className="btn primary" data-testid="deep-next" onClick={next}>Next: {lesson.steps[at + 1].title} →</button>
              : p.done
                ? <span className="small"><Ico n="check" /> Lesson finished</span>
                : <button className="btn primary" data-testid="deep-finish" onClick={() => { stepDone(lesson.id, at); setJustDone(finishLesson(lesson.id)) }}>Finish the lesson ✓</button>}
          </footer>
          {justDone && (
            <div className="deep-done" data-testid="deep-done">
              <b>Lesson finished. Nice work.</b>
              <span className="small">It comes back for short reviews in {REVIEW_DAYS.join(', ')} days so it sticks. Keep going with the practice week.</span>
            </div>
          )}
        </section>
      </div>
    </article>
  )
}

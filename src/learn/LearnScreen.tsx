// Learn: today's goal and streak, the away-from-guitar switch, today's plan, quests, the practice course,
// the path to mastery, and the tools (ear training, theory, CAGED, circle of fifths, chord changes, rhythm).
import { useState } from 'react'
import { IconGear } from '../components/Icons'
import { useInstrument } from '../instrument'
import { buildExercise, ESSENTIALS } from '../tabs/exercises'
import type { SongDoc } from '../tabs/library'
import { go as goTab, openInPlay } from '../nav'
import { allLogs, dailyGoalMin, dayCounts, dayKey, isAway, setAway, stars, streak, todayLog, useProgress, COUNTS_AFTER_SEC } from './progress'
import { freezes, levelInfo, questProgress, todaysQuests } from './game'
import { course, findQuiz } from './quiz'
import { currentStage, masteryPath, type Go } from './path'
import { todaysPlan, nextQuiz } from './plan'
import { QuizRunner } from './QuizRunner'
import { EarTrainer } from './EarTrainer'
import { CagedExplorer } from './CagedExplorer'
import { LessonList, LessonView, lessonsRead } from './LessonReader'
import { ChordChanges, CircleTool, RhythmTrainer } from './Tools'
import { ProgressView } from './ProgressView'
import { Settings } from './Settings'
import { LESSONS } from './lessons'
import { lastBackup } from '../backup'
import { ago } from '../components/BackupPanel'

type Route =
  | { k: 'home' } | { k: 'quiz'; id: string } | { k: 'lesson'; id: string } | { k: 'lessons' } | { k: 'ear' } | { k: 'caged' }
  | { k: 'changes' } | { k: 'rhythm' } | { k: 'circle' } | { k: 'progress' } | { k: 'settings' }

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** The daily goal as a guitar pick that fills up, then turns into a check. */
function PickRing({ value, goal }: { value: number; goal: number }) {
  const p = Math.min(1, value / goal)
  const done = p >= 1
  const path = 'M50 104 C38 92 6 62 6 34 C6 13 27 5 50 5 C73 5 94 13 94 34 C94 62 62 92 50 104 Z'
  return (
    <div className={`pick-ring${done ? ' done' : ''}`} role="img" aria-label={done ? `Daily goal done: ${value} minutes` : `${value} of ${goal} minutes today`}>
      <svg viewBox="0 0 100 110">
        <path d={path} className="pick-track" />
        <path d={path} className="pick-fill" pathLength={100} strokeDasharray={`${p * 100} 100`} />
        {done && <path d="M31 52 L45 66 L71 38" className="pick-check" />}
      </svg>
      {!done && (
        <span className="pick-num">
          <b>{value}</b>
          <span>of {goal} min</span>
        </span>
      )}
    </div>
  )
}

function Stars({ n }: { n: number }) {
  return <span className="stars" aria-label={`${n} of 3 stars`}>{[1, 2, 3].map(i => <i key={i} className={i <= n ? 'on' : ''}>★</i>)}</span>
}

export function LearnScreen() {
  useProgress()
  const inst = useInstrument()
  const [stack, setStack] = useState<Route[]>([{ k: 'home' }])
  const [openUnit, setOpenUnit] = useState<string | null>(null)
  const [allStages, setAllStages] = useState(false)
  const [awayNote, setAwayNote] = useState('')
  const route = stack[stack.length - 1]
  const push = (r: Route) => { setStack(s => [...s, r]); document.getElementById('main')?.scrollTo({ top: 0 }) }
  const back = () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s))
  const replace = (r: Route) => setStack(s => [...s.slice(0, -1), r])

  async function openExercise(which: 'spider' | 'penta1') {
    const spec = ESSENTIALS[which === 'spider' ? 0 : 1].spec
    const song = buildExercise(spec, inst.midis)
    const id = `lib:${inst.id}:${inst.tuning.id}:${spec.kind}:${spec.root}:${spec.type}:${spec.position}:${spec.scale ?? ''}`
    const doc: SongDoc = { id, title: song.title, source: 'lesson', inst: inst.id, song, updated: Date.now() }
    openInPlay(doc)
  }
  function launch(g: Go) {
    if ('quiz' in g) push({ k: 'quiz', id: g.quiz })
    else if ('lesson' in g) push({ k: 'lesson', id: g.lesson })
    else if ('tool' in g) push({ k: g.tool })
    else if ('tab' in g) goTab(g.tab)
    else void openExercise(g.exercise)
  }

  // ---------- sub-screens ----------
  if (route.k === 'quiz') {
    const q = findQuiz(route.id, inst)
    if (!q) return <div className="stack"><button className="btn sm" onClick={back}>← Back</button><p>That quiz isn't available for the {inst.label.toLowerCase()}.</p></div>
    return <QuizRunner key={route.id} quiz={q} inst={inst} onExit={back} />
  }
  if (route.k === 'ear') return <EarTrainer inst={inst} onExit={back} />
  if (route.k === 'caged') return <CagedExplorer inst={inst} onExit={back} onQuiz={id => push({ k: 'quiz', id })} />
  if (route.k === 'lessons') return <LessonList onOpen={id => push({ k: 'lesson', id })} onExit={back} />
  if (route.k === 'lesson') return <LessonView id={route.id} inst={inst} onExit={back} onOpen={id => replace({ k: 'lesson', id })} onGo={launch} />
  if (route.k === 'changes') return <ChordChanges inst={inst} onExit={back} />
  if (route.k === 'rhythm') return <RhythmTrainer onExit={back} />
  if (route.k === 'circle') return <CircleTool onExit={back} onQuiz={id => push({ k: 'quiz', id })} />
  if (route.k === 'progress') return <ProgressView inst={inst} onExit={back} />
  if (route.k === 'settings') return <Settings inst={inst} onExit={back} />

  // ---------- home ----------
  const d = todayLog()
  const away = isAway()
  const goal = dailyGoalMin()
  const minutes = Math.floor((d.guitar + d.study) / 60)
  const counted = dayCounts(d)
  const st = streak()
  const lv = levelInfo()
  const fz = freezes()
  const logs = allLogs()
  const mon = new Date()
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7))
  const weekDays = Array.from({ length: 7 }, (_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return dayKey(x) })
  const today = dayKey()
  const toKeep = Math.max(0, Math.ceil((COUNTS_AFTER_SEC - d.guitar - d.study) / 60))
  const headline = !counted
    ? st.current > 0 ? `${toKeep} more minute${toKeep === 1 ? '' : 's'} keeps your ${st.current}-day streak alive.` : `${toKeep} minutes today starts a new streak.`
    : minutes < goal ? `Streak safe for today. ${goal - minutes} min to your goal.` : 'Goal done for today. Nice work!'
  const plan = todaysPlan(inst, away, d)
  const planDone = plan.filter(p => p.done).length
  const quests = todaysQuests(away)
  const units = course(inst)
  const s = stars()
  const nq = nextQuiz(inst)
  const path = masteryPath(inst)
  const si = currentStage(path)
  const stage = path[si]
  const read = lessonsRead().length
  const changesBest = (() => { try { return Math.max(0, ...Object.entries(JSON.parse(localStorage.getItem('kg:changesBest') ?? '{}') as Record<string, number>).filter(([k]) => k.startsWith(inst.id + ':')).map(([, v]) => v)) } catch { return 0 } })()
  const unitOpen = openUnit ?? units.find(u => u.quizzes.some(q => q.id === nq.id))?.unit ?? units[0]?.unit

  function toggleAway(on: boolean) {
    setAway(on)
    setAwayNote(on ? 'Away mode is on: your plan and quests are guitar-free. It switches itself off after 30 hours, or tap "With my guitar" when you\'re back.' : `Welcome back! Your plan has your ${inst.noun} in it again.`)
  }

  const tools: { id: Route['k']; title: string; sub: string; needs?: boolean }[] = [
    { id: 'ear', title: 'Ear training', sub: 'Drone-based, by feel' },
    { id: 'lessons', title: 'Theory', sub: `${read} of ${LESSONS.length} lessons read` },
    { id: 'caged', title: `${inst.shapeSystem.join('')} explorer`, sub: 'Five shapes, whole neck' },
    { id: 'circle', title: 'Circle of fifths', sub: 'Keys and their chords' },
    { id: 'changes', title: 'Chord changes', sub: changesBest ? `Best: ${changesBest} a minute` : 'One-minute drill', needs: true },
    { id: 'rhythm', title: 'Rhythm trainer', sub: 'Listen, then tap it back' },
    { id: 'progress', title: 'Progress', sub: 'Calendar and badges' },
  ]

  return (
    <div className="learn">
      <div className="learn-head">
        <h1 style={{ margin: 0 }}>Learn</h1>
        <button className="btn sm inst-chip" onClick={() => push({ k: 'settings' })} aria-label={`Instrument: ${inst.label}. Change in settings`}>
          {inst.short}{inst.isUke && inst.tuning.reentrant ? ' (re-entrant)' : ''}
        </button>
        <button className="btn sm icon" onClick={() => push({ k: 'settings' })} aria-label="Settings"><IconGear /></button>
      </div>

      <section className={`today-card${counted ? ' counted' : ''}`} aria-label="Today">
        <PickRing value={minutes} goal={goal} />
        <div className="today-main">
          <div className="streak-line">
            <span className={`flame${counted ? ' lit' : ''}`} aria-hidden>🔥</span>
            <b className="readout">{st.current}</b>
            <span>day streak</span>
            {fz > 0 && <span className="freeze" title={`${fz} streak freeze${fz > 1 ? 's' : ''}: a missed day won't break your streak`}>{'🧊'.repeat(fz)}</span>}
          </div>
          <p className="today-msg">{headline}</p>
          <div className="week-strip" aria-label="This week">
            {weekDays.map((k, i) => {
              const ld = logs[k]
              const cls = dayCounts(ld) ? 'done' : ld?.frozen ? 'frozen' : k === today ? 'today' : k > today ? 'future' : 'missed'
              return <span key={k} className={`wd ${cls}`} title={k}><i>{cls === 'done' ? '✓' : cls === 'frozen' ? '🧊' : ''}</i>{DAY_LETTERS[i]}</span>
            })}
          </div>
          <div className="level-line">
            <span className="small"><b>Level {lv.level}</b> {lv.title}</span>
            <div className="xp-bar" title={`${lv.into} of ${lv.need} XP to level ${lv.level + 1}`}><div style={{ width: `${(lv.into / lv.need) * 100}%` }} /></div>
            <span className="small muted">{lv.need - lv.into} XP to go</span>
          </div>
        </div>
        <div className="away-switch" role="group" aria-label="Do you have your instrument?">
          <button aria-pressed={!away} onClick={() => away && toggleAway(false)}>With my {inst.noun}</button>
          <button aria-pressed={away} onClick={() => !away && toggleAway(true)}>I'm away from my {inst.noun}</button>
        </div>
        {awayNote && <p className="small away-note" role="status">{awayNote}</p>}
      </section>

      <div className="learn-cols">
        <div className="learn-col">

          <section className="panel plan" aria-label="Today's plan">
            <div className="sec-head">
              <h2>Today's plan</h2>
              <span className="small muted">{planDone}/{plan.length} done · about {plan.reduce((a, p) => a + p.minutes, 0)} min</span>
            </div>
            <ol className="plan-list">
              {plan.map(p => (
                <li key={p.id}>
                  <button className={p.done ? 'done' : ''} onClick={() => launch(p.go)}>
                    <span className="plan-check" aria-label={p.done ? 'done' : 'to do'}>{p.done ? '✓' : ''}</span>
                    <span className="plan-text"><b>{p.title}</b><span className="small muted">{p.detail}</span></span>
                    <span className="small muted plan-min">{p.minutes}′</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <section className="panel" aria-label="Daily quests">
            <div className="sec-head">
              <h2>Daily quests</h2>
              <span className="small muted">new ones tomorrow</span>
            </div>
            <ul className="quest-list">
              {quests.map(q => {
                const pr = questProgress(q, d)
                return (
                  <li key={q.id} className={pr.done ? 'done' : ''}>
                    <span className="quest-label">{q.label}</span>
                    <div className="bar"><div style={{ width: `${(pr.value / q.target) * 100}%` }} /></div>
                    <span className="small muted">{pr.done ? '✓' : `${pr.value}/${q.target}`} · {q.xp} XP</span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>

        <div className="learn-col">
          <section className="panel" aria-label="Practice course">
            <div className="sec-head">
              <h2>Practice course</h2>
              <span className="small muted">tap mode or play mode</span>
            </div>
            <div className="units">
              {units.map(u => {
                const earned = u.quizzes.reduce((a, q) => a + (s[q.id] ?? 0), 0)
                const open = unitOpen === u.unit
                return (
                  <div key={u.unit} className={`unit${open ? ' open' : ''}`}>
                    <button className="unit-head" aria-expanded={open} onClick={() => setOpenUnit(open ? '' : u.unit)}>
                      <b>{u.unit}</b>
                      <span className="small muted">{earned}/{u.quizzes.length * 3} ★</span>
                      <div className="bar"><div style={{ width: `${(earned / (u.quizzes.length * 3)) * 100}%` }} /></div>
                    </button>
                    {open && (
                      <ul className="quiz-list">
                        {u.quizzes.map(q => (
                          <li key={q.id}>
                            <button onClick={() => push({ k: 'quiz', id: q.id })} className={q.id === nq.id ? 'next' : ''}>
                              <span className="quiz-text"><b>{q.title}</b><span className="small muted">{q.desc}</span></span>
                              <span className="quiz-meta">
                                <Stars n={s[q.id] ?? 0} />
                                <span className="small muted">{q.ear ? 'by ear' : q.mic ? 'tap or play' : 'tap'}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="panel path" aria-label="Path to mastery">
            <div className="sec-head">
              <h2>Path to mastery</h2>
              <span className="small muted">stage {si + 1} of {path.length}</span>
            </div>
            <div className="stage-dots" aria-hidden>{path.map((p, i) => <i key={p.id} className={i < si ? 'done' : i === si ? 'on' : ''} />)}</div>
            <h3 style={{ margin: '4px 0 0' }}>{stage.title}</h3>
            <p className="small muted" style={{ margin: 0 }}>{stage.why}</p>
            <ul className="goal-list">
              {stage.goals.map(g => (
                <li key={g.label}>
                  <button className={g.done ? 'done' : ''} onClick={() => launch(g.go)} disabled={g.done}>
                    <span className="plan-check">{g.done ? '✓' : ''}</span>
                    <span>{g.label}{g.guitar && away && !g.done ? <span className="small muted"> (with your {inst.noun})</span> : null}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button className="btn sm ghost" onClick={() => setAllStages(!allStages)}>{allStages ? 'Hide stages' : 'See every stage'}</button>
            {allStages && (
              <ol className="stage-list small">
                {path.map((p, i) => (
                  <li key={p.id} className={i < si ? 'done' : i === si ? 'on' : ''}>
                    <b>{p.title}</b> <span className="muted">{p.goals.filter(g => g.done).length}/{p.goals.length}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {st.total >= 5 && (!lastBackup() || Date.now() - lastBackup()! > 14 * 864e5) && (
            <button className="backup-nudge" onClick={() => push({ k: 'settings' })}>
              <b>Back up your progress</b>
              <span className="small muted">Last backup: {ago(lastBackup())}. Save your songs and {st.total} practice days to Google Drive in Settings.</span>
            </button>
          )}
          <section aria-label="Tools">
            <div className="tool-grid">
              {tools.map(t => (
                <button key={t.id} className="tool" onClick={() => push({ k: t.id } as Route)}>
                  <b>{t.title}</b>
                  <span className="small muted">{t.needs && away ? `Needs your ${inst.noun}` : t.sub}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

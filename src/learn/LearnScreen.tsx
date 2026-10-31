// Learn: today's goal and streak, the away-from-guitar switch, today's plan, quests, the practice course,
// the path to mastery, and the tools (ear training, theory, CAGED, circle of fifths, chord changes, rhythm).
import { Win, WinArea } from '../components/Win'
import { ZeroToHero } from './ZeroToHero'
import { MySessions } from '../sessions/MySessions'
import { ArtThumb } from '../components/Art'
import { useEffect, useRef, useState } from 'react'
import { IconGear } from '../components/Icons'
import { SubTabs, useSubTab } from '../components/SubTabs'
import { PsyArt, PsyDog, PsyPic } from '../components/PsyArt'
import type { DogId } from '../art/samurai'
import { useInstrument } from '../instrument'
import { buildExercise, ESSENTIALS } from '../tabs/exercises'
import { exerciseCatalog } from '../exercises/catalog'
import { VideoLessons } from '../lessons/VideoLessons'
import { lessonsAvailable } from '../lessons/folders'
import { getSong, refreshBuiltIn, type SongDoc } from '../tabs/library'
import { loadSongbookDoc } from '../tabs/songbookDocs'
import { profile, profileSkipped, skipProfile } from './profile'
import { ProfileForm } from '../components/ProfileForm'
import { BendTrainer } from './BendTrainer'
import { TechniqueList, TechniqueView } from './TechniqueLessons'
import { TECHNIQUES, drillSong, techniquesDone, type Technique } from './techniques'
import { lessonTab, type LessonEx } from './lessonExtras'
import { exampleDoc } from '../tabs/examples'
import type { Song } from '../tabs/model'
import { useBack } from '../back'
import { go as goTab, openInPlay, openSongs, openJam, setSubPage, onLearnGo, takeLearnGo, openExercise as showExercise } from '../nav'
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
import { GuideScreen } from './GuideScreen'
import { LickLibrary } from './LickLibrary'
import { LESSONS } from './lessons'
import { lastBackup } from '../backup'
import { ago } from '../components/BackupPanel'

type Route =
  | { k: 'home' } | { k: 'quiz'; id: string } | { k: 'lesson'; id: string } | { k: 'lessons' } | { k: 'ear' } | { k: 'caged' }
  | { k: 'changes' } | { k: 'rhythm' } | { k: 'circle' } | { k: 'progress' } | { k: 'settings'; n?: number } | { k: 'guide'; sec?: string }
  | { k: 'techniques' } | { k: 'technique'; id: string } | { k: 'bends' } | { k: 'licks'; sel?: string } | { k: 'videos' }

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
  const [stack, setStack] = useState<Route[]>(() => {
    // the welcome's "Show me around" opens the guide
    let guide = false
    try { guide = sessionStorage.getItem('kg:openGuide') === '1'; sessionStorage.removeItem('kg:openGuide') } catch { /* storage unavailable */ }
    return guide ? [{ k: 'home' }, { k: 'guide' }] : [{ k: 'home' }]
  })
  const [openUnit, setOpenUnit] = useState<string | null>(null)
  const [page, setPage] = useSubTab('learn', ['today', 'course', 'explore'] as const)
  const [allStages, setAllStages] = useState(false)
  const [awayNote, setAwayNote] = useState('')
  const [, setTick] = useState(0)
  useEffect(() => {
    const f = () => setTick(t => t + 1)
    window.addEventListener('kg:profile', f)
    return () => window.removeEventListener('kg:profile', f)
  }, [])
  // the Learn button again: back to Learn's home
  useEffect(() => {
    const f = (e: Event) => { if ((e as CustomEvent).detail === 'learn') setStack([{ k: 'home' }]) }
    window.addEventListener('kg:navTop', f)
    return () => window.removeEventListener('kg:navTop', f)
  }, [])

  const route = stack[stack.length - 1]
  useBack(stack.length > 1, () => setStack(s => (s.length > 1 ? s.slice(0, -1) : s)))
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
  async function openSongbook(song: string, part: string) {
    const doc = await loadSongbookDoc(song, part, inst)
    if (doc) openInPlay(doc)
  }
  function runDrill(t: Technique) {
    const d = t.drill
    if ('tool' in d) push({ k: d.tool })
    else if ('exercise' in d) void openExercise(d.exercise)
    else if ('exName' in d) { const e = exerciseCatalog(inst).find(x => x.name === d.exName); if (e) showExercise(e.code) }
    else if ('songbook' in d) void openSongbook(d.songbook.song, d.songbook.part)
    else {
      const song = drillSong(d.tab, inst.midis)
      if (!song) return
      openInPlay({ id: `tech:${d.tab}:${inst.id}:${inst.tuning.id}`, title: song.title, source: 'lesson', inst: inst.id, song, updated: Date.now() })
    }
  }
  /** A lesson's "Play" exercise: a practice tab, a songbook part, a technique drill or a tool. */
  function runLessonEx(ex: LessonEx) {
    if ('tool' in ex) {
      if (ex.tool === 'jam') goTab('progressions')
      else push({ k: ex.tool })
      return
    }
    if ('songbook' in ex) { void openSongbook(ex.songbook.song, ex.songbook.part); return }
    if ('example' in ex) {
      void refreshBuiltIn(exampleDoc(ex.example, inst.tuning.notes)).then(openInPlay)
      return
    }
    let song: Song | null = null
    let key = ''
    if ('spec' in ex) { song = buildExercise(ex.spec, inst.midis); key = `${ex.spec.kind}:${ex.spec.root}:${ex.spec.type}:${ex.spec.position}:${ex.spec.scale ?? ''}` }
    else if ('drill' in ex) { song = drillSong(ex.drill, inst.midis); key = `drill:${ex.drill}` }
    else { song = lessonTab(ex.tab, inst.midis); key = `tab:${ex.tab}` }
    if (!song || !song.tracks[0].bars.length) return
    openInPlay({ id: `lib:${inst.id}:${inst.tuning.id}:${key}`, title: song.title, source: 'lesson', inst: inst.id, song, updated: Date.now() })
  }
  function launch(g: Go) {
    if ('quiz' in g) push({ k: 'quiz', id: g.quiz })
    else if ('lesson' in g) push({ k: 'lesson', id: g.lesson })
    else if ('tool' in g) push({ k: g.tool })
    else if ('tab' in g) goTab(g.tab)
    else if ('song' in g) void getSong(g.song).then(doc => { if (doc) openInPlay(g.loop ? { ...doc, loop: g.loop } : doc); else goTab('play') })
    else if ('songbook' in g) void openSongbook(g.songbook.song, g.songbook.part)
    else if ('songs' in g) openSongs(g.songs)
    else if ('settings' in g) { setSubPage('settings', g.settings); push({ k: 'settings', n: Date.now() }) }
    else if ('jam' in g) openJam(g.jam)
    else if ('learn' in g) { setPage(g.learn); setStack([{ k: 'home' }]); document.getElementById('main')?.scrollTo({ top: 0 }) }
    else if ('technique' in g) push({ k: 'technique', id: g.technique })
    else if ('guide' in g) push({ k: 'guide', sec: g.guide })
    else if ('licks' in g) push({ k: 'licks', sel: g.licks })
    else void openExercise(g.exercise)
  }
  // links from other screens (search): start from Learn's home so Back comes here
  const launchRef = useRef(launch)
  launchRef.current = launch
  useEffect(() => {
    const open = (g: Go) => {
      if (!('learn' in g)) setStack([{ k: 'home' }])
      launchRef.current(g)
    }
    const first = takeLearnGo()
    if (first) open(first)
    return onLearnGo(open)
  }, [])

  // ---------- sub-screens ----------
  if (route.k === 'quiz') {
    const q = findQuiz(route.id, inst)
    if (!q) return <div className="stack"><button className="btn sm" onClick={back}>← Back</button><p>That quiz isn't available for the {inst.label.toLowerCase()}.</p></div>
    return <QuizRunner key={route.id} quiz={q} inst={inst} onExit={back} />
  }
  if (route.k === 'ear') return <EarTrainer inst={inst} onExit={back} />
  if (route.k === 'caged') return <CagedExplorer inst={inst} onExit={back} onQuiz={id => push({ k: 'quiz', id })} />
  if (route.k === 'lessons') return <LessonList onOpen={id => push({ k: 'lesson', id })} onExit={back} />
  if (route.k === 'lesson') return <LessonView id={route.id} inst={inst} onExit={back} onOpen={id => replace({ k: 'lesson', id })} onGo={launch} onExercise={runLessonEx} />
  if (route.k === 'changes') return <ChordChanges inst={inst} onExit={back} />
  if (route.k === 'bends') return <BendTrainer inst={inst} onExit={back} />
  if (route.k === 'techniques') return <TechniqueList onExit={back} onOpen={id => push({ k: 'technique', id })} />
  if (route.k === 'technique') return <TechniqueView id={route.id} inst={inst} onExit={back} onDrill={t => runDrill(t)} />
  if (route.k === 'rhythm') return <RhythmTrainer onExit={back} />
  if (route.k === 'videos') return <VideoLessons onExit={back} />
  if (route.k === 'licks') return <LickLibrary key={route.sel ?? ''} initial={route.sel} onExit={back} />
  if (route.k === 'circle') return <CircleTool onExit={back} onQuiz={id => push({ k: 'quiz', id })} />
  if (route.k === 'progress') return <ProgressView inst={inst} onExit={back} />
  if (route.k === 'settings') return <Settings key={route.n ?? 0} inst={inst} onExit={back} />
  if (route.k === 'guide') return <GuideScreen key={route.sec ?? ''} initial={route.sec} onExit={back} onGo={launch} />

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
  const askAbout = !profile() && !profileSkipped()
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
  const unitOpen = openUnit ?? ''

  function toggleAway(on: boolean) {
    setAway(on)
    setAwayNote(on ? 'Away mode is on: your plan and quests are guitar-free. It switches itself off after 30 hours, or tap "With my guitar" when you\'re back.' : `Welcome back! Your plan has your ${inst.noun} in it again.`)
  }

  const groups: { title: string; tools: { id: Route['k']; title: string; sub: string; needs?: boolean }[] }[] = [
    { title: 'Play better', tools: [
      { id: 'techniques', title: 'Technique', sub: `${techniquesDone().size} of ${TECHNIQUES.length} skills practised` },
      { id: 'licks', title: 'Must-know licks', sub: '16 styles, explained step by step' },
      { id: 'bends', title: 'Bends & vibrato', sub: 'Bend to pitch with a needle', needs: true },
      { id: 'changes', title: 'Chord changes', sub: changesBest ? `Best: ${changesBest} a minute` : 'One-minute drill', needs: true },
      { id: 'rhythm', title: 'Rhythm trainer', sub: 'Listen, then tap it back' },
    ] },
    ...(lessonsAvailable() ? [{ title: 'Your lessons', tools: [{ id: 'videos' as const, title: 'Your video lessons', sub: 'Course videos and tabs from your phone' }] }] : []),
    { title: 'Ears and theory', tools: [
      { id: 'lessons', title: 'Theory lessons', sub: `${read} of ${LESSONS.length} read` },
      { id: 'ear', title: 'Ear training', sub: 'Drone-based, by feel' },
      { id: 'caged', title: `${inst.shapeSystem.join('')} explorer`, sub: 'Five shapes, whole neck' },
      { id: 'circle', title: 'Circle of fifths', sub: 'Keys and their chords' },
    ] },
    { title: 'You', tools: [
      { id: 'progress', title: 'Progress', sub: 'Calendar, trends, badges' },
      { id: 'guide', title: 'How to use KGuitar', sub: 'Every feature, explained' },
    ] },
  ]
  const questsDone = quests.filter(q => questProgress(q, d).done).length

  return (
    <div className="learn">
      <div className="learn-head screen-head">
        <PsyPic id="march" at="50% 30%" className="screen-art" />
        <ArtThumb className="learn-art" />
        <h1 style={{ margin: 0 }}>Learn</h1>
        <button className="btn sm inst-chip" onClick={() => push({ k: 'settings' })} aria-label={`Instrument: ${inst.label}. Change in settings`}>
          {inst.short}{inst.isUke && inst.tuning.reentrant ? ' (re-entrant)' : ''}
        </button>
        <button className="btn sm icon" onClick={() => push({ k: 'settings' })} aria-label="Settings"><IconGear /></button>
      </div>

      <SubTabs label="Learn" value={page} onChange={setPage} tabs={[
        { id: 'today', label: 'Today', badge: plan.length - planDone || null },
        { id: 'course', label: 'Course' },
        { id: 'explore', label: 'Explore' },
      ]} />

      {page === 'today' && <WinArea area="learnToday" className="win-cols">
      <Win id="today" title="Today" className="today-win" bodyClass={`today-card${counted ? ' counted' : ''}`} resizable={false}>
        <div className="pick-wrap">
          <PsyArt kind="mandala" className="pick-mandala" />
          <PickRing value={minutes} goal={goal} />
        </div>
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
      </Win>
            {askAbout && (
              <section className="panel about-card" aria-label="About you">
                <div className="sec-head"><h2>Make the plan yours</h2><button className="btn sm ghost" onClick={skipProfile}>Not now</button></div>
                <p className="small muted" style={{ margin: 0 }}>Three quick questions, and today's plan picks songs and practice at your level.</p>
                <ProfileForm />
              </section>
            )}
            <Win id="plan" title="Today's plan" className="panel plan">
              <div className="sec-head">
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
            </Win>
            <Win id="sessions" title="My practice sessions" className="panel"><MySessions /></Win>
            <Win id="quests" title="Daily quests" className="panel quests">
              <div className="sec-head">
                <span className="small muted">{questsDone}/{quests.length} done · new ones tomorrow</span>
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
            </Win>
            {st.total >= 5 && (!lastBackup() || Date.now() - lastBackup()! > 14 * 864e5) && (
              <button className="backup-nudge" onClick={() => push({ k: 'settings' })}>
                <b>Back up your progress</b>
                <span className="small muted">Last backup: {ago(lastBackup())}. Save your songs and {st.total} practice days to Google Drive in Settings.</span>
              </button>
            )}
      </WinArea>}

      {page === 'course' && (
        <div className="learn-cols">
          <div className="learn-col">
            <section className="panel course" aria-label="Practice course">
              <div className="sec-head"><h2>Practice course</h2><span className="small muted">tap or play the answers · 3 stars each</span></div>
              <button className="btn primary course-next" onClick={() => push({ k: 'quiz', id: nq.id })}>Continue: {nq.title}</button>
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
          </div>
          <div className="learn-col">
            {inst.id === 'guitar' ? (
            <section className="panel path" aria-label="Zero to Hero">
              <div className="sec-head"><h2>Zero to Hero</h2><span className="small muted">your guitar plan</span></div>
              <ZeroToHero />
            </section>
            ) : (
            <section className="panel path" aria-label="Path to mastery">
              <div className="sec-head"><h2>Path to mastery</h2><span className="small muted">stage {si + 1} of {path.length}</span></div>
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
            )}
          </div>
        </div>
      )}

      {page === 'explore' && (
        <div className="explore stack">
          {groups.map(g => (
            <section key={g.title} aria-label={g.title} className="tool-group">
              <h2 className="sec-title">{g.title}</h2>
              <div className="tool-grid">
                {g.tools.map(t => (
                  <button key={t.id} className="tool" onClick={() => push({ k: t.id } as Route)}>
                    <ToolBadge id={t.id} />
                    <b>{t.title}</b>
                    <span className="small muted">{t.needs && away ? `Needs your ${inst.noun}` : t.sub}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          <button className="tool songbook-link" onClick={() => openSongs('practice')}>
            <ToolBadge id="exercises" />
            <b>Exercises</b>
            <span className="small muted">{exerciseCatalog(inst).length} practice pieces, beginner to expert, every technique: in the Songs tab</span>
          </button>
          <button className="tool songbook-link" onClick={() => openSongs('songbook')}>
            <ToolBadge id="songbook" />
            <b>Songbook</b>
            <span className="small muted">Folk, bluegrass and reggae songs to learn: in the Songs tab</span>
          </button>
        </div>
      )}
    </div>
  )
}

// Psychedelic mode: a samurai dog sticker on each Learn tool.
const BADGES: Record<string, DogId> = {
  techniques: 'shepherd', licks: 'rottweiler', bends: 'doberman', changes: 'boxer', rhythm: 'shiba', lessons: 'akita', ear: 'husky',
  caged: 'frenchie', circle: 'golden', progress: 'muscle', guide: 'lab', songbook: 'princess', exercises: 'husky', videos: 'akita',
}
function ToolBadge({ id }: { id: string }) {
  const b = BADGES[id]
  return b ? <PsyDog breed={b} className="tool-badge" /> : null
}

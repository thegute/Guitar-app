// Your progress: practice calendar, this week vs last week, badges and how well you know each course unit.
import { useMemo } from 'react'
import type { Instrument } from '../instrument'
import { allLogs, dayCounts, dayKey, itemStats, mastery, stars, streak, type DayLog, type Activity } from './progress'
import { ALL_BADGES, earnedBadges, freezes, levelInfo } from './game'
import { course } from './quiz'
import { Zoomable } from '../components/Zoomable'
import { changesTrend, cleanSpeeds, rhythmTrend, timingTrend, type Point } from './trends'

const WEEKS = 16
const DAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const ACT_LABEL: Record<Activity, string> = {
  play: 'Play-along', jam: 'Jam and looper', tuner: 'Tuning', quiz: 'Quizzes', ear: 'Ear training', theory: 'Theory',
  caged: 'CAGED', changes: 'Chord changes', rhythm: 'Rhythm', warmup: 'Warm-ups', circle: 'Circle of fifths',
}
const mins = (d?: DayLog) => (d ? Math.round((d.guitar + d.study) / 60) : 0)

function monday(d: Date) {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

export function ProgressView({ inst, onExit }: { inst: Instrument; onExit: () => void }) {
  const logs = allLogs()
  const st = streak()
  const lv = levelInfo()
  const got = earnedBadges()
  const today = dayKey()

  const grid = useMemo(() => {
    const start = monday(new Date())
    start.setDate(start.getDate() - (WEEKS - 1) * 7)
    return Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => {
      const x = new Date(start)
      x.setDate(start.getDate() + w * 7 + d)
      return dayKey(x)
    }))
  }, [])

  const week = (offset: number) => {
    const m = monday(new Date())
    m.setDate(m.getDate() - offset * 7)
    return Array.from({ length: 7 }, (_, i) => { const x = new Date(m); x.setDate(m.getDate() + i); return dayKey(x) })
  }
  const thisWeek = week(0)
  const lastWeek = week(1)
  const sumMin = (ks: string[]) => ks.reduce((a, k) => a + mins(logs[k]), 0)
  const tw = sumMin(thisWeek), lw = sumMin(lastWeek)
  const maxDay = Math.max(15, ...thisWeek.map(k => mins(logs[k])))
  const weekLogs = thisWeek.map(k => logs[k]).filter(Boolean) as DayLog[]
  const answers = weekLogs.reduce((a, d) => a + d.answers, 0)
  const correct = weekLogs.reduce((a, d) => a + d.correct, 0)
  const by: Partial<Record<Activity, number>> = {}
  for (const d of weekLogs) for (const [k, v] of Object.entries(d.by)) by[k as Activity] = (by[k as Activity] ?? 0) + (v ?? 0)
  const acts = Object.entries(by).sort((a, b) => b[1] - a[1]).filter(([, v]) => v >= 60)
  const totalHours = Object.values(logs).reduce((a, d) => a + d.guitar + d.study, 0) / 3600
  const awayDays = Object.values(logs).filter(d => d.away && dayCounts(d)).length
  const srs = itemStats()
  const units = course(inst)
  const s = stars()

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← Back</button>
      </div>
      <h1 style={{ margin: 0 }}>Your progress</h1>
      <div className="stat-row">
        <div><span className="readout">{st.current}</span><span className="small muted">day streak</span></div>
        <div><span className="readout">{st.best}</span><span className="small muted">best streak</span></div>
        <div><span className="readout">{st.total}</span><span className="small muted">days practised</span></div>
        <div><span className="readout">{totalHours < 10 ? totalHours.toFixed(1) : Math.round(totalHours)}</span><span className="small muted">hours in total</span></div>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        Level {lv.level}, {lv.title}. {freezes()} streak freeze{freezes() === 1 ? '' : 's'} saved up. {awayDays > 0 && `${awayDays} of your days were away from the guitar and still counted.`}
      </p>

      <section className="panel stack" style={{ gap: 8 }}>
        <h2 style={{ margin: 0 }}>Practice calendar</h2>
        <Zoomable id="calendar" max={2.5}>
        <div className="heat" role="img" aria-label={`Practice over the last ${WEEKS} weeks`}>
          <div className="heat-days">{DAY_NAMES.map((n, i) => <span key={i}>{n}</span>)}</div>
          {grid.map((col, w) => (
            <div key={w} className="heat-col">
              {col.map(k => {
                const d = logs[k]
                const m = mins(d)
                const lvl = !d ? 0 : dayCounts(d) ? (m >= 30 ? 4 : m >= 15 ? 3 : 2) : m > 0 ? 1 : 0
                const cls = `heat-cell l${lvl}${d?.frozen ? ' frozen' : ''}${d?.away ? ' away' : ''}${k === today ? ' today' : ''}${k > today ? ' future' : ''}`
                return <span key={k} className={cls} title={`${k}: ${m} min${d?.away ? ' (away)' : ''}${d?.frozen ? ' (freeze used)' : ''}`} />
              })}
            </div>
          ))}
        </div>
        </Zoomable>
        <div className="heat-legend small muted">
          <span>Less</span><i className="heat-cell l1" /><i className="heat-cell l2" /><i className="heat-cell l3" /><i className="heat-cell l4" /><span>More</span>
          <i className="heat-cell l2 away" /><span>away day</span>
          <i className="heat-cell frozen" /><span>freeze</span>
        </div>
      </section>

      <SkillTrends instId={inst.id} />

      <section className="panel stack" style={{ gap: 8 }}>
        <h2 style={{ margin: 0 }}>This week</h2>
        <p className="small" style={{ margin: 0 }}>
          <b>{tw} minutes</b>{lw > 0 ? (tw >= lw ? `, up from ${lw} last week.` : `, ${lw - tw} behind last week (${lw}).`) : '.'}
          {answers > 0 && ` ${correct} of ${answers} quiz answers right (${Math.round((correct / answers) * 100)}%).`}
        </p>
        <div className="week-bars">
          {thisWeek.map((k, i) => {
            const d = logs[k]
            const g = d ? d.guitar / 60 : 0
            const sd = d ? d.study / 60 : 0
            return (
              <div key={k} className={`week-bar${k === today ? ' today' : ''}`}>
                <div className="wb-stack" title={`${Math.round(g)} min with the guitar, ${Math.round(sd)} min study`}>
                  <span className="wb-study" style={{ height: `${(sd / maxDay) * 100}%` }} />
                  <span className="wb-guitar" style={{ height: `${(g / maxDay) * 100}%` }} />
                </div>
                <span className="small muted">{DAY_NAMES[i]}</span>
              </div>
            )
          })}
        </div>
        <div className="heat-legend small muted"><i className="wb-key guitar" /><span>with the {inst.noun}</span><i className="wb-key study" /><span>study (no {inst.noun})</span></div>
        {acts.length > 0 && (
          <ul className="act-list small">
            {acts.map(([k, v]) => <li key={k}><span>{ACT_LABEL[k as Activity]}</span><b>{Math.round(v / 60)} min</b></li>)}
          </ul>
        )}
      </section>

      <section className="panel stack" style={{ gap: 8 }}>
        <h2 style={{ margin: 0 }}>What you know</h2>
        {units.map(u => {
          const ids = u.quizzes.flatMap(q => q.items(inst))
          const m = Math.round(mastery(ids, srs) * 100)
          const earned = u.quizzes.reduce((a, q) => a + (s[q.id] ?? 0), 0)
          return (
            <div key={u.unit} className="mastery-row">
              <span>{u.unit}</span>
              <div className="bar"><div style={{ width: `${m}%` }} /></div>
              <span className="small muted">{m}% · {earned}/{u.quizzes.length * 3} ★</span>
            </div>
          )
        })}
      </section>

      <section className="panel stack" style={{ gap: 8 }}>
        <h2 style={{ margin: 0 }}>Badges <span className="small muted">{Object.keys(got).length} of {ALL_BADGES.length}</span></h2>
        <div className="badge-grid">
          {ALL_BADGES.map(b => (
            <div key={b.id} className={`badge${got[b.id] ? ' got' : ''}`}>
              <span className="badge-icon" aria-hidden>{b.icon}</span>
              <b>{b.name}</b>
              <span className="small muted">{got[b.id] ? new Date(got[b.id]).toLocaleDateString() : b.how}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

/** A small line of points: one per practice day, with the first and latest value. */
function Spark({ points, unit, label, max }: { points: Point[]; unit: string; label: string; max?: number }) {
  const W = 220, H = 44
  if (!points.length) return null
  const vs = points.map(p => p.value)
  const hi = max ?? Math.max(...vs) * 1.1, lo = Math.min(0, ...vs)
  const x = (i: number) => (points.length === 1 ? W / 2 : 4 + (i / (points.length - 1)) * (W - 8))
  const y = (v: number) => H - 4 - ((v - lo) / Math.max(1e-6, hi - lo)) * (H - 8)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const first = vs[0], last = vs[vs.length - 1]
  return (
    <div className="trend">
      <div className="trend-head"><b>{label}</b><span className="small muted">{points.length} day{points.length === 1 ? '' : 's'}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`${label}: ${first}${unit} at first, ${last}${unit} now`}>
        <path className="trend-line" d={d} />
        {points.map((p, i) => <circle key={p.day} className="trend-dot" cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 3.5 : 2} />)}
      </svg>
      <span className="small">{points.length > 1 ? <>From <b>{first}{unit}</b> to <b>{last}{unit}</b>{last > first ? ' ↑' : last < first ? ' ↓' : ''}</> : <>So far: <b>{last}{unit}</b></>}</span>
    </div>
  )
}

function SkillTrends({ instId }: { instId: string }) {
  const changes = changesTrend(), timing = timingTrend(instId), rhythm = rhythmTrend(), speeds = cleanSpeeds(instId)
  const pct = (v: number) => (v >= 1 ? 'full speed' : v >= 0.75 ? `${Math.round(v * 100)}%` : `${Math.round(v * 100)}%`)
  if (!changes.length && !timing.length && !rhythm.length && !speeds.length) {
    return (
      <section className="panel stack" style={{ gap: 6 }}>
        <h2 style={{ margin: 0 }}>Skill trends</h2>
        <p className="small muted" style={{ margin: 0 }}>Do a round of chord changes, play a song In time or try the rhythm trainer, and your progress shows up here day by day.</p>
      </section>
    )
  }
  return (
    <section className="panel stack" style={{ gap: 10 }}>
      <h2 style={{ margin: 0 }}>Skill trends</h2>
      <div className="trends">
        <Spark points={changes} unit=" a minute" label="Chord changes" />
        <Spark points={timing} unit="%" label="On time (In time)" max={100} />
        <Spark points={rhythm} unit="%" label="Rhythm trainer" max={100} />
      </div>
      {speeds.length > 0 && (
        <div className="stack" style={{ gap: 4 }}>
          <b>Clean speed per song</b>
          <ul className="act-list small">
            {speeds.map(s => (
              <li key={s.id}><span>{s.title}</span><b>{s.best > s.first ? `${pct(s.first)} → ${pct(s.best)}` : pct(s.best)}</b></li>
            ))}
          </ul>
          <span className="small muted">The fastest speed you've played each song at 85% or better.</span>
        </div>
      )}
    </section>
  )
}

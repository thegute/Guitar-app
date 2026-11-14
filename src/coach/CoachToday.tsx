// Learn → Today: what the coach remembers. The spots it flagged lately (one tap loops them slowly), the habits that
// keep coming back, and your top clean speed for each kind of trouble.
import { launch } from '../search/launch'
import { useInstrument } from '../instrument'
import { ceilingsNow, habits, loadMemory, openSpots } from './memory'
import { activeLens } from './lens'
import { checkupDue, checkupSession, markCheckup, weekReport } from './checkup'
import { startSession } from '../sessions/session'

export function hasCoachToday(inst?: string): boolean {
  const m = loadMemory()
  return checkupDue(m) || openSpots(m, inst).length > 0 || habits(m).length > 0 || ceilingsNow(m).length > 0
}

export function CoachToday() {
  const inst = useInstrument()
  const m = loadMemory()
  const spots = openSpots(m, inst.id).slice(0, 3), hs = habits(m).slice(0, 2), cs = ceilingsNow(m).slice(0, 4), lens = activeLens()
  const due = checkupDue(m), check = due ? checkupSession(m, inst.id) : null
  const checkup = check && (
    <div className="coach-checkup" data-testid="coach-checkup">
      <b className="small">Weekly check-up (5 minutes)</b>
      <p className="small">{weekReport(m).text}</p>
      <button className="btn sm primary" data-testid="coach-checkup-go" onClick={() => { markCheckup(); startSession(check) }}>Start the check-up</button>
    </div>
  )
  if (!spots.length && !hs.length && !cs.length) return checkup ||  <p className="small muted">Nothing yet. After a run in the song player, the coach's trouble spots and your speeds show up here.</p>
  return (
    <div className="coach-today" data-testid="coach-today">
      {checkup}
      {spots.length > 0 && <>
        <b className="small">Warm up on these (slowly)</b>
        <ul className="coach-spots">
          {spots.map(s => (
            <li key={`${s.song}:${s.bar}`}>
              <button className="btn sm" data-testid="coach-spot" onClick={() => launch({ go: { song: s.song, loop: s.loop, speed: 0.7 } })}>
                Bar {s.bar + 1} of {s.title}
              </button>
              <span className="small muted">{s.n > 1 ? `flagged ${s.n} times` : 'flagged once'}{s.best ? ` · clean at ${Math.round(s.best * 100)}%` : ''}</span>
            </li>
          ))}
        </ul>
      </>}
      {hs.length > 0 && <p className="small">Keeps coming back: {hs.map(h => h.words).join(', and ')}.</p>}
      {cs.length > 0 && <p className="small muted">Top clean speed this week: {cs.map(c => `${c.words} ${Math.round(c.speed * 100)}%${c.speed > c.from ? ` (up from ${Math.round(c.from * 100)}%)` : ''}`).join(' · ')}.</p>}
      {lens && <p className="small muted">Listening for your style: {lens.title}.</p>}
    </div>
  )
}

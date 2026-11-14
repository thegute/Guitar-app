// The coach's card on Play: one kind word, ONE fix, ONE drill, and what happens next is your choice.
import { Ico } from '../components/Icon'
import { barsText } from './advice'
import type { CoachState } from './useCoach'

export function CoachCard({ c, slowPct, onLoop, onClose }: { c: CoachState; /** the speed the loop would run at (In time) */ slowPct: number | null; onLoop: () => void; onClose: () => void }) {
  const a = c.advice
  return (
    <div className="coach-card" role="status" aria-label="Coach" data-testid="coach-card" data-kind={a.kind} data-from={a.from}>
      <div className="coach-head">
        <Ico n="sparkles" /> <b>Coach</b>
        <span className="small muted">{c.why === 'stuck' ? `bar ${a.bar + 1} keeps catching you` : c.why === 'pass' ? `bar ${a.bar + 1}: ${c.trouble.pct}% right` : `bar ${a.bar + 1}`}</span>
        {c.listening && <span className="small coach-listening" data-testid="coach-listening"><span className="spin" aria-hidden /> listening to how it sounded…</span>}
      </div>
      <p className="coach-good small">{a.good}</p>
      <p className="coach-fix" data-testid="coach-fix"><span className="coach-tag">Fix</span> {a.fix}</p>
      <p className="coach-drill small" data-testid="coach-drill"><span className="coach-tag">Drill</span> {a.drill}</p>
      {a.heard && <p className="coach-heard small" data-testid="coach-heard"><span className="coach-tag">Heard</span> {a.heard} <span className="muted">(the AI's ear: an opinion)</span></p>}
      <span className="report-btns">
        <button className="btn primary" onClick={onLoop} data-testid="coach-loop"><Ico n="again" /> Loop {barsText(c.trouble.loop).replace(' to ', '–')}{slowPct ? ` at ${slowPct}%` : ''}</button>
        <button className="btn" onClick={onClose} data-testid="coach-keep">Keep playing</button>
      </span>
      <button className="btn sm ghost report-x" onClick={onClose} aria-label="Close the coach">✕</button>
    </div>
  )
}

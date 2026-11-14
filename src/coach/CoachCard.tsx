// The coach's card on Play: one kind word, ONE fix, ONE drill, and what happens next is your choice.
import { useEffect, useState } from 'react'
import { Ico } from '../components/Icon'
import type { CoachState } from './useCoach'

export interface CoachAct { id: 'drill' | 'shift' | 'easier' | 'loop' | 'compare' | 'keep'; label: string; icon?: Parameters<typeof Ico>[0]['n']; run: () => void }

/** `acts`: the buttons, the first one being what the pedal or "try it" starts in the first few seconds. */
export function CoachCard({ c, acts, handsFreeMs, onClose }: { c: CoachState; acts: CoachAct[]; /** how long the pedal / "try it" starts the first button (0 = not offered) */ handsFreeMs: number; onClose: () => void }) {
  const a = c.advice
  const [armed, setArmed] = useState(handsFreeMs > 0)
  useEffect(() => { setArmed(handsFreeMs > 0); if (handsFreeMs <= 0) return; const t = setTimeout(() => setArmed(false), handsFreeMs); return () => clearTimeout(t) }, [c.trouble, handsFreeMs])
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
      <span className="report-btns coach-acts">
        {acts.map((x, i) => (
          <button key={x.id} className={`btn${i === 0 ? ' primary' : ''}${i === 0 && armed ? ' armed' : ''}`} onClick={x.run} data-testid={`coach-act-${x.id}`}>{x.icon && <Ico n={x.icon} />} {x.label}</button>
        ))}
      </span>
      {armed && acts.length > 0 && <span className="small muted coach-armed" data-testid="coach-armed">Pedal or "try it" starts the first one.</span>}
      <button className="btn sm ghost report-x" onClick={onClose} aria-label="Close the coach">✕</button>
    </div>
  )
}

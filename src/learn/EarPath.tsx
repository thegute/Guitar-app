// Learn → Explore → Ear training: the ear path. What's next, what's due for a review, and every stage with its drills.
import { EAR_PATH, earStatus, isDone, isDue, type EarItem } from './earSteps'
import { Ico } from '../components/Icon'

export function EarPath({ onOpen, onExit }: { onOpen: (it: EarItem) => void; onExit: () => void }) {
  const s = earStatus()
  return (
    <div className="stack ear-path" style={{ gap: 12 }} data-testid="ear-path">
      <div className="row"><button className="btn sm" onClick={onExit}>← Back</button><h2 style={{ margin: 0 }}>Ear training</h2></div>
      <div className="panel stack" style={{ gap: 8 }}>
        <p className="small" style={{ margin: 0 }}>One step at a time, from hearing higher or lower to playing licks back by ear. A drill counts as learned at two stars; it comes back for a review a week later.</p>
        <p className="small muted" style={{ margin: 0 }}>{s.done} of {s.total} learned.</p>
        {s.next && <button className="btn primary" data-testid="ear-next" onClick={() => onOpen(s.next!)}><Ico n="play" /> Next: {s.next.title}</button>}
        {s.due.length > 0 && <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}><span className="small">Review:</span>{s.due.map(it => <button key={it.id} className="btn sm" onClick={() => onOpen(it)}>{it.title}</button>)}</div>}
      </div>
      {EAR_PATH.map((st, i) => (
        <div key={st.title} className="panel stack ear-stage" style={{ gap: 6 }}>
          <b>{i + 1}. {st.title}</b>
          <p className="small muted" style={{ margin: 0 }}>{st.why}</p>
          <ul className="ear-items">
            {st.items.map(it => {
              const done = isDone(it, s.st, s.items), due = done && isDue(it, Date.now(), s.st, s.items)
              return (
                <li key={it.id}>
                  <button className={`btn sm${it === s.next ? ' primary' : ''}`} onClick={() => onOpen(it)}>{done ? (due ? '↻ ' : '✓ ') : ''}{it.title}</button>
                  {(s.st[it.id] ?? 0) > 0 && <span className="small muted">{'★'.repeat(s.st[it.id])}</span>}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

// The Practice card: one big button that decides today's practice for you (warm-up → your plan → your trouble
// spot → a song, see sessions/practice.ts), with the plan shown underneath so you know what's coming, a length
// choice, and a small "Just carry on" for when you only want your last song back.
import { useEffect, useState } from 'react'
import { Ico } from './Icon'
import { useInstrument } from '../instrument'
import { getSong, type SongDoc } from '../tabs/library'
import { flatten, playable } from '../tabs/model'
import { go } from '../nav'
import { startSession } from '../sessions/session'
import { practicePlan, type PracticeLen, type PracticePlan } from '../sessions/practice'
import { usePersist } from './Controls'
import { countUse } from '../usage'

function readJSON<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d } catch { return d } }
const LENS: PracticeLen[] = [10, 20, 30]

export function JumpBackIn({ compact = false }: { compact?: boolean }) {
  const inst = useInstrument()
  const [len, setLen] = usePersist<PracticeLen>('practiceLen', 20)
  const [plan, setPlan] = useState<PracticePlan | null>(null)
  const [doc, setDoc] = useState<SongDoc | null>(null)
  useEffect(() => {
    let alive = true
    void practicePlan(inst, len).then(p => { if (alive) setPlan(p) })
    return () => { alive = false }
  }, [inst, len])
  useEffect(() => {
    const id = readJSON<string>(`kg:playSong:${inst.id}`, '')
    if (!id) { setDoc(null); return }
    let alive = true
    void getSong(id).then(d => { if (alive) setDoc(d ?? null) })
    return () => { alive = false }
  }, [inst.id])
  const speed = readJSON<number>('kg:playSpeed', 1)
  let bar = -1
  if (doc) {
    const t = doc.song.tracks[doc.track ?? 0] ?? doc.song.tracks[0]
    if (t && typeof doc.cursor === 'number') {
      const steps = flatten(t).filter(f => playable(f.step).length)
      bar = steps[Math.min(doc.cursor, steps.length - 1)]?.bar ?? -1
    }
  }
  const where = doc ? [
    bar >= 0 ? `bar ${bar + 1}` : '',
    doc.loop ? (doc.loop.from === doc.loop.to ? `looping bar ${doc.loop.from + 1}` : `looping bars ${doc.loop.from + 1}–${doc.loop.to + 1}`) : '',
    speed !== 1 ? `${Math.round(speed * 100)}%` : '',
  ].filter(Boolean).join(', ') : ''
  const start = () => { if (!plan) return; countUse('practice:start'); startSession(plan.session) }
  return (
    <div className={`practice-card${compact ? ' compact' : ''}`} data-testid="jump-in">
      <button className="btn primary practice-go" onClick={start} disabled={!plan} data-use="Practice">
        <span className="practice-go-big"><Ico n="play" fill /> Practice</span>
        <span className="practice-go-sub">{len} minutes, planned for you</span>
      </button>
      {!compact && plan && (
        <ol className="practice-steps" aria-label="Today's practice">
          {plan.parts.map((p, i) => (
            <li key={i} className={`practice-step k-${p.kind}`}>
              <span className="practice-min">{p.minutes}′</span>
              <span className="practice-what"><b>{p.title}</b><span className="small muted">{p.why}</span></span>
            </li>
          ))}
        </ol>
      )}
      <div className="practice-foot">
        <span className="seg practice-len" role="group" aria-label="How long">
          {LENS.map(m => <button key={m} aria-pressed={len === m} onClick={() => setLen(m)}>{m} min</button>)}
        </span>
        <button className="btn sm ghost jump-continue" onClick={() => go('play')} disabled={!doc} title={doc ? `${doc.title}${where ? ` · ${where}` : ''}` : undefined}>
          Just carry on{doc ? `: ${doc.title}` : ''}{where ? ` · ${where}` : ''}
        </button>
      </div>
    </div>
  )
}

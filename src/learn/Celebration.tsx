// A short celebration when you hit your goal, finish a quest, earn a badge or level up (shown over any screen).
import { useEffect, useRef, useState } from 'react'
import { onCelebrate, type Celebration as C } from './game'
import { playNote } from '../audio/pluck'
import { audio } from '../audio/engine'
import { PsyArt, PsyDog, PsyDogCard } from '../components/PsyArt'

const CHIMES: Record<C['kind'], number[]> = {
  goal: [72, 76, 79, 84],
  level: [67, 72, 76, 79, 84, 88],
  badge: [76, 79, 84],
  quest: [72, 79],
  freeze: [84, 79],
}
const CONFETTI = ['var(--accent)', 'var(--gold)', 'var(--mint)', 'var(--coral)', '#5ec8f0']

export function CelebrationLayer() {
  const [queue, setQueue] = useState<C[]>([])
  const timer = useRef(0)
  useEffect(() => onCelebrate(c => setQueue(q => [...q, c])), [])
  const cur = queue[0]
  useEffect(() => {
    if (!cur) return
    try {
      const ctx = audio()
      if (ctx.state === 'running') CHIMES[cur.kind].forEach((m, i) => playNote(m, ctx.currentTime + 0.02 + i * 0.09, 0.45))
    } catch { /* no sound */ }
    timer.current = window.setTimeout(() => setQueue(q => q.slice(1)), cur.kind === 'level' || cur.kind === 'goal' ? 3600 : 2800)
    return () => clearTimeout(timer.current)
  }, [cur])
  if (!cur) return null
  const big = cur.kind === 'level' || cur.kind === 'goal'
  return (
    <div className={`celebrate${big ? ' big' : ''}`} role="status" aria-live="polite" onClick={() => setQueue(q => q.slice(1))}>
      {big && <PsyArt kind="tunnel" className="celebrate-tunnel" />}
      {big && <PsyDogCard seed={cur.title} className="celebrate-dogcard" />}
      {big && (
        <div className="confetti" aria-hidden>
          {Array.from({ length: 28 }, (_, i) => (
            <i key={i} style={{ left: `${(i * 37) % 100}%`, background: CONFETTI[i % CONFETTI.length], animationDelay: `${(i % 7) * 0.07}s`, transform: `rotate(${i * 47}deg)` }} />
          ))}
        </div>
      )}
      <div className="celebrate-card" key={cur.title + queue.length}>
        <PsyDog seed={cur.title} className="celebrate-face" />
        <span className="celebrate-icon" aria-hidden>{cur.icon}</span>
        <div>
          <b>{cur.title}</b>
          <span className="small">{cur.detail}</span>
        </div>
      </div>
    </div>
  )
}

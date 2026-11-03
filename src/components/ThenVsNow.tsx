// Then vs now: your first try and your best run of a song, side by side. Tapping one stops the other, so you can
// flip between them.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ThenNowPair, AutoTake } from '../audio/thenNow'

const day = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
const DAY = 864e5

function Side({ t, label, on, onPlay, refEl }: { t: AutoTake; label: string; on: boolean; onPlay: () => void; refEl: (a: HTMLAudioElement | null) => void }) {
  const url = useMemo(() => URL.createObjectURL(t.blob), [t.blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <div className={`tvn-side${on ? ' on' : ''}`}>
      <div className="tvn-label"><b>{label}</b><span className="small muted">{day(t.at)}{t.speed !== 1 ? ` · ${Math.round(t.speed * 100)}% speed` : ''}</span></div>
      <div className="tvn-score">{t.score}<small>%</small></div>
      <audio ref={refEl} src={url} controls preload="metadata" onPlay={onPlay} />
    </div>
  )
}

export function ThenVsNow({ pair, compact = false }: { pair: ThenNowPair; compact?: boolean }) {
  const a = useRef<HTMLAudioElement | null>(null)
  const b = useRef<HTMLAudioElement | null>(null)
  const [on, setOn] = useState<'then' | 'now' | null>(null)
  const days = pair.now ? Math.max(0, Math.round((pair.now.at - pair.first.at) / DAY)) : 0
  return (
    <div className={`tvn${compact ? ' compact' : ''}`} data-testid="then-vs-now">
      {pair.now && (
        <p className="small tvn-sum">
          {pair.now.score - pair.first.score} points better{days >= 1 ? ` in ${days} day${days === 1 ? '' : 's'}` : ''}. Listen to both.
        </p>
      )}
      <div className="tvn-pair">
        <Side t={pair.first} label="Then" on={on === 'then'} refEl={el => { a.current = el }} onPlay={() => { b.current?.pause(); setOn('then') }} />
        {pair.now
          ? <Side t={pair.now} label="Now" on={on === 'now'} refEl={el => { b.current = el }} onPlay={() => { a.current?.pause(); setOn('now') }} />
          : <div className="tvn-side tvn-wait"><b>Now</b><span className="small muted">Comes when a whole run is {10} points better than this one.</span></div>}
      </div>
    </div>
  )
}

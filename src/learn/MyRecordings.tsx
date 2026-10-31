// My recordings: every take you kept, newest first, grouped by month. "Then and now" puts your first and latest
// recording of the same song side by side: progress you can't hear day to day is obvious month to month.
import { useEffect, useMemo, useState } from 'react'
import { deleteRecording, recordings, updateRecording, type Recording } from '../audio/recordings'
import { saveTake } from '../audio/takeRecorder'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
const month = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
const day = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

function Player({ r }: { r: Recording }) {
  const url = useMemo(() => URL.createObjectURL(r.blob), [r.blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return <audio src={url} controls preload="metadata" />
}

export function MyRecordings({ onExit, onRecord }: { onExit: () => void; onRecord: () => void }) {
  const [list, setList] = useState<Recording[] | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [compare, setCompare] = useState<string | null>(null)
  const load = () => void recordings().then(setList)
  useEffect(load, [])
  const byTitle = useMemo(() => {
    const m = new Map<string, Recording[]>()
    for (const r of list ?? []) m.set(r.title, [...(m.get(r.title) ?? []), r])
    return m
  }, [list])
  const pairs = [...byTitle.entries()].filter(([, rs]) => rs.length >= 2).map(([t, rs]) => ({ title: t, then: rs[rs.length - 1], now: rs[0] }))
  const groups = useMemo(() => {
    const g: { month: string; items: Recording[] }[] = []
    for (const r of list ?? []) { const m = month(r.at); const last = g[g.length - 1]; if (last && last.month === m) last.items.push(r); else g.push({ month: m, items: [r] }) }
    return g
  }, [list])
  const pair = pairs.find(p => p.title === compare)
  return (
    <div className="stack recordings">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← Back</button>
        <button className="btn sm primary" onClick={onRecord}>⏺ Record yourself in Play</button>
      </div>
      <h1 style={{ margin: 0 }}>My recordings</h1>
      <p className="small muted" style={{ margin: 0 }}>Record a song in Play (Options → Record yourself), then tap "Keep it". Record the same song again every month or so: "Then and now" plays your first and latest takes side by side.</p>
      {list === null ? <p className="muted">Loading…</p> : list.length === 0 ? <p className="notice">No recordings yet. Open a song in Play, tap Options → Record yourself, play it through, then "Keep it".</p> : null}
      {pairs.length > 0 && (
        <section className="panel stack" style={{ gap: 8 }}>
          <h2 style={{ margin: 0 }}>Then and now</h2>
          <div className="row" style={{ gap: 6 }}>{pairs.map(p => <button key={p.title} className={`chip${compare === p.title ? ' on' : ''}`} aria-pressed={compare === p.title} onClick={() => setCompare(compare === p.title ? null : p.title)}>{p.title}</button>)}</div>
          {pair && (
            <div className="rec-compare">
              <div><b>Then</b> <span className="small muted">{day(pair.then.at)}</span><Player r={pair.then} /></div>
              <div><b>Now</b> <span className="small muted">{day(pair.now.at)}</span><Player r={pair.now} /></div>
            </div>
          )}
        </section>
      )}
      {groups.map(g => (
        <section key={g.month} className="panel stack" style={{ gap: 8 }}>
          <h2 style={{ margin: 0 }}>{g.month}</h2>
          {g.items.map(r => (
            <div key={r.id} className="rec-row">
              <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
                <span><b>{r.title}</b> <span className="small muted">{day(r.at)} · {fmt(r.seconds)}</span></span>
                <span className="row" style={{ gap: 4 }}>
                  <button className="btn sm ghost" onClick={() => void saveTake(r.blob, r.title)}>Save a copy</button>
                  {confirm === r.id
                    ? <><button className="btn sm" onClick={() => void deleteRecording(r.id).then(() => { setConfirm(null); load() })}>Delete it</button><button className="btn sm ghost" onClick={() => setConfirm(null)}>Keep</button></>
                    : <button className="btn sm ghost" onClick={() => setConfirm(r.id)} aria-label={`Delete ${r.title}`}>✕</button>}
                </span>
              </div>
              <Player r={r} />
              <input className="input" placeholder="A note to yourself (what felt better, what to fix)" defaultValue={r.note ?? ''} onBlur={e => { if ((r.note ?? '') !== e.target.value) void updateRecording({ ...r, note: e.target.value }) }} />
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

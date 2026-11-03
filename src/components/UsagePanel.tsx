// Settings → You → What you use: the favourites, and what hasn't been opened for a month (counted on this phone only).
import { useState } from 'react'
import { Fold } from './Fold'
import { clearUsage, untouched, usageRows, usageSince } from '../usage'

export function UsagePanel() {
  const [, setN] = useState(0)
  const days = Math.floor(Date.now() / 864e5) - usageSince()
  const rows = usageRows()
  const top = rows.filter(r => !r.id.startsWith('btn:')).slice(0, 10)
  const buttons = rows.filter(r => r.id.startsWith('btn:')).slice(0, 10)
  const cold = untouched(30)
  return (
    <Fold id="usage" title="What you use" summary={days < 1 ? 'counting from today' : `${days} day${days === 1 ? '' : 's'} of counts`}
      hint="KGuitar counts which screens, pages and buttons you open, on this phone only (nothing is sent anywhere). After a few weeks this shows what you really use, so the app can be trimmed to fit.">
      {!rows.length ? <p className="small muted" style={{ margin: 0 }}>Nothing counted yet.</p> : <>
        <h3 style={{ margin: 0 }}>Most used</h3>
        <ol className="usage-list">{top.map(r => <li key={r.id}><span>{r.label}</span><b>{r.n}</b></li>)}</ol>
        {buttons.length > 0 && <>
          <h3 style={{ margin: 0 }}>Most pressed buttons</h3>
          <ol className="usage-list">{buttons.map(r => <li key={r.id}><span>{r.label}</span><b>{r.n}</b></li>)}</ol>
        </>}
        <h3 style={{ margin: 0 }}>Not opened for a month</h3>
        {days < 30
          ? <p className="small muted" style={{ margin: 0 }}>Check back after {30 - days} more day{30 - days === 1 ? '' : 's'} of practice.</p>
          : cold.length ? <p className="small" style={{ margin: 0 }}>{cold.map(r => r.label).join(', ')}</p>
            : <p className="small muted" style={{ margin: 0 }}>You've used everything.</p>}
      </>}
      <div className="row"><button className="btn sm" onClick={() => { clearUsage(); setN(n => n + 1) }}>Start counting again</button></div>
    </Fold>
  )
}

// Learn → Today: practice sessions you saved from Ask (start one again with a tap).
import { useState } from 'react'
import { deleteSession, minutesOf, savedSessions, startSession } from './session'
import { askAssistant } from '../assistant/bus'

export function MySessions() {
  const [list, setList] = useState(savedSessions)
  return (
    <div className="stack" style={{ gap: 6 }}>
      {list.length === 0 && <p className="small muted" style={{ margin: 0 }}>Tap Ask and say what you want to practise ("triads today", "blues in A for 20 minutes"). Save the session it makes and it waits here.</p>}
      {list.map(s => (
        <div key={s.id} className="row" style={{ gap: 6, justifyContent: 'space-between' }}>
          <span><b>{s.title}</b> <span className="small muted">{s.steps.length} steps · {minutesOf(s)} min</span></span>
          <span className="row" style={{ gap: 4 }}>
            <button className="btn sm primary" onClick={() => startSession(s)}>▶ Start</button>
            <button className="btn sm ghost" onClick={() => { deleteSession(s.id); setList(savedSessions()) }} aria-label={`Delete ${s.title}`}>✕</button>
          </span>
        </div>
      ))}
      <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => askAssistant('', 'learn', false)}>✨ Make a new session</button>
    </div>
  )
}

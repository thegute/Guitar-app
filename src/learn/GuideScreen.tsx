// How to use KGuitar: every feature explained in plain words, with a button to jump to it.
import { useEffect, useState } from 'react'
import { GUIDE } from './guide'
import type { Go } from './path'
import { resetWelcome } from '../components/Welcome'

export function GuideScreen({ onExit, onGo, initial }: { onExit: () => void; onGo: (g: Go) => void; initial?: string }) {
  const [open, setOpen] = useState<string>(initial && GUIDE.some(s => s.id === initial) ? initial : 'start')
  // opened at a section (from search): bring it into view
  useEffect(() => {
    if (!initial) return
    const t = setTimeout(() => document.getElementById(`guide-${initial}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60)
    return () => clearTimeout(t)
  }, [initial])
  return (
    <div className="stack guide">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← Back</button>
        <button className="btn sm ghost" onClick={() => { resetWelcome(); location.reload() }}>Replay the welcome</button>
      </div>
      <div className="guide-title">
        <img src="art.jpg" alt="" />
        <h1>How to use KGuitar</h1>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Tap a section to open it. "Show me" takes you straight to that feature.</p>
      {GUIDE.map((sec, n) => {
        const isOpen = open === sec.id
        return (
          <section key={sec.id} id={`guide-${sec.id}`} className={`guide-sec${isOpen ? ' open' : ''}`}>
            <button className="guide-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? '' : sec.id)}>
              <span className="guide-num">{n + 1}</span>
              <span><b>{sec.title}</b><span className="small muted">{sec.intro}</span></span>
            </button>
            {isOpen && (
              <ul className="guide-items">
                {sec.items.map(it => (
                  <li key={it.title}>
                    <b>{it.title}</b>
                    <p className="small">{it.text}</p>
                    {it.tip && <p className="small muted">{it.tip}</p>}
                    {it.go && <button className="btn sm" onClick={() => onGo(it.go!)}>Show me</button>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

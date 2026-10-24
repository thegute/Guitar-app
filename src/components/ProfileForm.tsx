// "About you": your level, what you want to get better at and the styles you like. Used by the welcome, the card in
// Learn and Settings. Today's plan and the songbook use the answers.
import { useState } from 'react'
import { GOALS, LEVEL_QUESTIONS, profile, setProfile, type Goal } from '../learn/profile'
import { GENRES, type Genre, type Level } from '../tabs/songbook'

export function ProfileForm({ onSaved, saveLabel = 'Save' }: { onSaved?: () => void; saveLabel?: string }) {
  const me = profile()
  const [level, setLevel] = useState<Level | 0>(me?.level ?? 0)
  const [goals, setGoals] = useState<Goal[]>(me?.goals ?? [])
  const [genres, setGenres] = useState<Genre[]>(me?.genres ?? [])
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v])
  return (
    <div className="stack profile-form" style={{ gap: 10 }}>
      <div className="stack" style={{ gap: 6 }}>
        <b>How much do you play?</b>
        <div className="pf-levels" role="radiogroup" aria-label="Your level">
          {LEVEL_QUESTIONS.map(l => (
            <button key={l.id} role="radio" aria-checked={level === l.id} className={`pf-level${level === l.id ? ' on' : ''}`} onClick={() => setLevel(l.id)}>
              <b>{l.label}</b><span className="small muted">{l.what}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <b>What do you want to get better at?</b>
        <div className="chips wrap" role="group" aria-label="Goals">
          {GOALS.map(g => <button key={g.id} className="chip" aria-pressed={goals.includes(g.id)} title={g.what} onClick={() => setGoals(toggle(goals, g.id))}>{g.label}</button>)}
        </div>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <b>Music you like</b>
        <div className="chips wrap" role="group" aria-label="Styles">
          {GENRES.map(g => <button key={g.id} className="chip" aria-pressed={genres.includes(g.id)} onClick={() => setGenres(toggle(genres, g.id))}>{g.label}</button>)}
        </div>
        <span className="small muted">Today's plan picks songbook songs in these styles at your level.</span>
      </div>
      <button className="btn primary" disabled={!level} onClick={() => { if (level) { setProfile({ level, goals, genres }); onSaved?.() } }}>{saveLabel}</button>
    </div>
  )
}

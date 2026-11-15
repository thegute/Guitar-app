// "The idea": why a fills step works, explained plainly, with links to the course lesson behind it, the drill that
// builds it, your books and a video. On the workshop's steps and in the song player while you practise one.
import { useState } from 'react'
import { courseLesson } from '../course'
import { launch } from '../search/launch'
import { InYourBooks } from '../books/InYourBooks'
import type { FillLearn } from './make'

const TOOL: Record<FillLearn['tools'][number], string> = { targets: 'Target notes', cr: 'Call and response', techniques: 'Technique (hammer-ons, slides)' }

export function FillIdea({ learn, compact }: { learn: FillLearn; compact?: boolean }) {
  const [open, setOpen] = useState(!compact)
  return (
    <div className="fill-idea" data-testid="fill-idea">
      <button className="fills-head" onClick={() => setOpen(o => !o)} aria-expanded={open}><b className="small">The idea</b><span className="small muted">{open ? 'hide' : 'why this works'}</span></button>
      {open && <>
        <p className="small" style={{ margin: 0 }}>{learn.idea}</p>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {learn.lessons.map(id => { const l = courseLesson(id); return l ? <button key={id} className="btn sm" data-testid="fill-lesson" onClick={() => launch({ go: { lesson: id } })}>Lesson: {l.title}</button> : null })}
          {learn.tools.map(t => <button key={t} className="btn sm" onClick={() => launch({ go: { tool: t } })}>{TOOL[t]}</button>)}
          {learn.video && <a className="btn sm" href={`https://www.youtube.com/watch?v=${learn.video.id}`} target="_blank" rel="noreferrer">Watch: {learn.video.title}</a>}
        </div>
        {!compact && <InYourBooks topics={learn.topics} max={3} />}
      </>}
    </div>
  )
}

// "Songs for this lesson" (in a course lesson's Use-it step): songs the owner pinned to the lesson, each with the bars that
// use what the lesson teaches ("Practise bars 9–12: hammer-ons and pull-offs" opens Play with them looped at 70%), plus
// "Add a song": search Songsterr / Ultimate Guitar right here (phone app) or pick one of his songs. See songFocus.ts.
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Ico } from '../components/Icon'
import { SiteSearch } from '../components/SiteSearch'
import type { Instrument } from '../instrument'
import type { Go } from '../learn/path'
import { getSong, listSongs, type SongDoc } from '../tabs/library'
import { canImportFromSites } from '../tabs/siteImport'
import { FOCUS_LABEL, addLessonSong, barsLabel, focusSpots, lessonFocus, lessonSongs, onLessonSongs, removeLessonSong } from './songFocus'
import type { CourseLesson } from './types'

export function LessonSongs({ lesson, inst, onGo }: { lesson: CourseLesson; inst: Instrument; onGo: (g: Go) => void }) {
  const ids = useSyncExternalStore(onLessonSongs, () => JSON.stringify(lessonSongs(lesson.id)), () => '[]')
  const [docs, setDocs] = useState<SongDoc[]>([])
  const [adding, setAdding] = useState(false)
  const focus = useMemo(() => lessonFocus(lesson), [lesson])
  useEffect(() => {
    let alive = true
    void Promise.all((JSON.parse(ids) as string[]).map(id => getSong(id))).then(ds => { if (alive) setDocs(ds.filter((d): d is SongDoc => !!d)) })
    return () => { alive = false }
  }, [ids])
  return (
    <div className="lesson-songs" data-testid="lesson-songs">
      <h3 className="watch-head"><Ico n="music" /> Songs for this lesson</h3>
      <p className="small muted" style={{ margin: 0 }}>
        Add a song you want to learn{focus.length ? <> and KGuitar finds the bars with <b>{FOCUS_LABEL[focus[0]]}</b>{focus[1] ? <> (or {FOCUS_LABEL[focus[1]]})</> : null} to practise first</> : null}.
      </p>
      {docs.map(d => {
        const spots = focusSpots(d.song, focus, lesson.topics)
        return (
          <div key={d.id} className="ls-song" data-testid="ls-song">
            <div className="ls-top">
              <b className="small">{d.title}{d.artist ? <span className="muted"> · {d.artist}</span> : null}</b>
              <span className="row" style={{ gap: 4 }}>
                <button className="btn sm" onClick={() => onGo({ song: d.id, loop: null })} data-testid="ls-open"><Ico n="play" /> Open the song</button>
                <button className="btn sm ghost" onClick={() => removeLessonSong(lesson.id, d.id)} aria-label={`Take ${d.title} off this lesson`}><Ico n="x" /></button>
              </span>
            </div>
            {spots.length ? (
              <div className="ls-spots">
                {spots.map(s => (
                  <button key={s.from} className="watch-part" onClick={() => onGo({ song: d.id, loop: { from: s.from, to: s.to }, speed: 0.7 })} data-testid="ls-spot">
                    <span className="watch-time"><Ico n="again" /> Practise {barsLabel(s)}</span>
                    <span className="small">{FOCUS_LABEL[s.focus]}, looped at 70 %</span>
                  </button>
                ))}
              </div>
            ) : <span className="small muted">No bars with {focus.length ? FOCUS_LABEL[focus[0]] : 'this lesson’s idea'} found in this tab: learn it whole.</span>}
          </div>
        )
      })}
      {adding
        ? <AddSong lesson={lesson} inst={inst} have={docs.map(d => d.id)} onDone={() => setAdding(false)} />
        : <button className="btn sm" style={{ justifySelf: 'start' }} onClick={() => setAdding(true)} data-testid="ls-add"><Ico n="plus" /> Add a song</button>}
    </div>
  )
}

function AddSong({ lesson, inst, have, onDone }: { lesson: CourseLesson; inst: Instrument; have: string[]; onDone: () => void }) {
  const [q, setQ] = useState('')
  const [mine, setMine] = useState<SongDoc[]>([])
  useEffect(() => { void listSongs(inst.id).then(l => setMine(l.filter(d => !have.includes(d.id) && !d.id.startsWith('sb:') && !d.id.startsWith('lesson')))) }, [inst.id, have])
  const add = (d: SongDoc) => { addLessonSong(lesson.id, d.id); onDone() }
  return (
    <div className="ls-add stack" style={{ gap: 8 }} data-testid="ls-add-panel">
      <label className="field"><span>Find a song (title and artist)</span>
        <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. Nine Pound Hammer" data-testid="ls-query" />
      </label>
      {canImportFromSites()
        ? <SiteSearch query={q} onOpen={add} />
        : <p className="small muted" style={{ margin: 0 }}>Searching Songsterr and Ultimate Guitar from here works in the phone app. On the web, add the song in Songs → Add a song, then pick it below.</p>}
      {mine.length > 0 && (
        <label className="field"><span>Or one of your songs</span>
          <select className="input" value="" onChange={e => { const d = mine.find(x => x.id === e.target.value); if (d) add(d) }} data-testid="ls-mine">
            <option value="">Choose…</option>
            {mine.map(d => <option key={d.id} value={d.id}>{d.title}{d.artist ? ` · ${d.artist}` : ''}</option>)}
          </select>
        </label>
      )}
      <button className="btn sm ghost" style={{ justifySelf: 'start' }} onClick={onDone}>Cancel</button>
    </div>
  )
}

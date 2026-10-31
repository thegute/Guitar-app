// Where your fretting hand goes for a whole tab: one small neck per hand position, in order ("Bar 1: open
// position", "Bar 3: 1st finger at fret 5"), with the finger for every note. The one being played is lit and
// scrolled into view, so you can see the next move coming. Used under every generated tab and lick.
import { useEffect, useMemo, useRef } from 'react'
import { flatten, type SongTrack } from '../tabs/model'
import { groupAt, handGroups } from '../play/handShape'
import { HandShape } from './HandShape'
import { usePersist } from './Controls'
import { stringName, useInstrument } from '../instrument'

const ORD = ['', '1st', '2nd', '3rd', '4th']

export function HandGuide({ track, cursor = -1 }: { track: SongTrack; cursor?: number }) {
  const [show, setShow] = usePersist('handGuide', true)
  const inst = useInstrument()
  const flat = useMemo(() => flatten(track), [track])
  const groups = useMemo(() => handGroups(flat), [flat])
  const cur = cursor >= 0 ? groupAt(groups, cursor) : -1
  const strip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>('.hg-card.on')
    if (el && strip.current) strip.current.scrollTo({ left: el.offsetLeft - 8, behavior: 'smooth' })
  }, [cur])
  if (!groups.length) return null
  const nStr = track.tuning?.length ?? inst.midis.length
  const names = Array.from({ length: nStr }, (_, s) => stringName(inst.midis, s))
  const moves = groups.length - 1
  return (
    <div className="hand-guide">
      <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
        <span className="small"><b>Left hand</b> <span className="muted">{moves === 0 ? 'stays in one place the whole time' : `moves ${moves} time${moves > 1 ? 's' : ''}`}</span></span>
        <button className="btn sm ghost" aria-pressed={show} onClick={() => setShow(!show)}>{show ? 'Hide hand' : 'Show hand position'}</button>
      </div>
      {show && (
        <>
          <div className="hg-strip" ref={strip}>
            {groups.map((g, i) => {
              const bar = flat[g.from]?.bar ?? 0
              const fing = new Set(g.notes.filter(n => n.fret > 0).map(n => n.finger))
              return (
                <div key={i} className={`hg-card${i === cur ? ' on' : ''}`}>
                  <span className="small hg-when">Bar {bar + 1}{i > 0 ? ' · move' : ''}</span>
                  <HandShape group={g} next={groups[i + 1] ?? null} moveSoon={false} expected={[]} nStr={nStr} stringNames={names} compact />
                  <span className="small muted">{g.open ? 'Open strings + frets 1–4' : `${ORD[1]} finger on fret ${g.base}`}{fing.size ? ` · fingers ${[...fing].sort().join(' ')}` : ''}</span>
                </div>
              )
            })}
          </div>
          <p className="small muted" style={{ margin: 0 }}>One finger per fret: 1 index, 2 middle, 3 ring, 4 pinky. Keep your hand there until the next card, then slide the whole hand.</p>
        </>
      )}
    </div>
  )
}

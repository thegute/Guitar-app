// "Jump back in": the two things you most likely want when you open the app with a few minutes to play.
// Continue = back to your last song in Play, same bar, loop and speed. 15-minute session = today's Zero to Hero
// routine squeezed into 15 minutes (or a short general one on ukulele / before the plan is set up).
import { useEffect, useState } from 'react'
import { useInstrument } from '../instrument'
import { getSong, type SongDoc } from '../tabs/library'
import { flatten, playable } from '../tabs/model'
import { go } from '../nav'
import { startSession, type Session } from '../sessions/session'
import { routine, z2h } from '../learn/zeroHero'

function readJSON<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d } catch { return d } }

function quickSession(guitar: boolean): Session | null {
  const v = z2h()
  if (guitar && v.placed) return routine(v, 15)
  return {
    id: `quick-${Date.now().toString(36)}`, title: '15-minute practice', steps: [
      { title: 'Warm up', minutes: 3, target: { exercise: 'type:warmup' }, tip: 'Slow and clean with the metronome.' },
      { title: 'Chord changes', minutes: 4, target: { go: { tool: 'changes' } }, tip: 'Your two hardest chords, back and forth for a minute.' },
      { title: 'Your song', minutes: 8, target: { play: {} }, tip: 'Pick up where you left off. Loop the hard bar if there is one.' },
    ],
  }
}

export function JumpBackIn({ compact = false }: { compact?: boolean }) {
  const inst = useInstrument()
  const [doc, setDoc] = useState<SongDoc | null>(null)
  useEffect(() => {
    const id = readJSON<string>(`kg:playSong:${inst.id}`, '')
    if (!id) { setDoc(null); return }
    let alive = true
    void getSong(id).then(d => { if (alive) setDoc(d ?? null) })
    return () => { alive = false }
  }, [inst.id])
  const speed = readJSON<number>('kg:playSpeed', 1)
  let bar = -1
  if (doc) {
    const t = doc.song.tracks[doc.track ?? 0] ?? doc.song.tracks[0]
    if (t && typeof doc.cursor === 'number') {
      const steps = flatten(t).filter(f => playable(f.step).length)
      bar = steps[Math.min(doc.cursor, steps.length - 1)]?.bar ?? -1
    }
  }
  const where = doc ? [
    bar >= 0 ? `bar ${bar + 1}` : '',
    doc.loop ? (doc.loop.from === doc.loop.to ? `looping bar ${doc.loop.from + 1}` : `looping bars ${doc.loop.from + 1}–${doc.loop.to + 1}`) : '',
    speed !== 1 ? `${Math.round(speed * 100)}% speed` : '',
  ].filter(Boolean).join(', ') : ''
  const sess = () => { const s = quickSession(inst.id === 'guitar'); if (s) startSession(s) }
  return (
    <div className={`jump-in${compact ? ' compact' : ''}`} data-testid="jump-in">
      {!compact && <b className="jump-in-h">Jump back in</b>}
      <div className="jump-in-btns">
        <button className="btn primary jump-continue" onClick={() => go('play')} disabled={!doc}>
          <span className="jump-big">▶ Continue</span>
          <span className="jump-sub">{doc ? `${doc.title}${where ? ` · ${where}` : ''}` : 'Open a song first'}</span>
        </button>
        <button className="btn jump-quick" onClick={sess}>
          <span className="jump-big">⏱ 15-minute session</span>
          <span className="jump-sub">{inst.id === 'guitar' && z2h().placed ? "Today's Zero to Hero routine, short" : 'Warm-up, chords, your song'}</span>
        </button>
      </div>
    </div>
  )
}

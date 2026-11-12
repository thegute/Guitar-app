// Game Mode around the highway: the score with its multiplier (3× → 5×), the streak, stars per section as you go, Play
// for me (hear the next note or chord), Auto speed, and the end screen: stars per section, your best (the best of each
// section over all runs), Play again, and "Perfect it" for the sections that lost stars.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FlatStep } from '../tabs/model'
import type { HandGroup } from '../play/handShape'
import { highway, loadBest, mergeBest, saveBest, sectionResults, sectionsOf, toPerfect, Scorer, type NoteResult, type Section, type SectionResult } from '../play/game'
import { GameHighway, type GameFeedback } from './GameHighway'
import { MixSlider } from './MixSlider'
import { shownCards, toggleCard } from '../float/bus'
import { Ico } from './Icon'

export interface GameViewProps {
  songId: string
  flat: FlatStep[]
  beatOf: number[]
  hands: HandGroup[]
  stringNames: string[]
  chordAt: (i: number) => string | undefined
  mode: 'wait' | 'time'
  /** In time */
  running: boolean
  beatNow: () => number | null
  timeFb: { j: 'perfect' | 'good' | 'early' | 'late' | 'miss'; key: number } | null
  finished: number
  /** Wait for me: the step it waits for, whether it's listening, and the last wrong-note event */
  cursorFlat: number
  listening: boolean
  waitFb: { ok: boolean; key: number; text?: string } | null
  states: Uint8Array
  version: number
  spb: number
  autoSpeed: boolean
  onAutoSpeed: (on: boolean) => void
  speedPct: number
  onPlayFor: (flat: number, note?: number) => void
  onPerfect: (sec: Section) => void
  onAgain: () => void
  /** start from a step / from the top / from the loop's start (the loop only when there is one) */
  onStartAt: (flat: number) => void
  onTop: () => void
  onLoopStart?: () => void
  /** the song plays along with you (In time): your part (the guide) and the band, mixed with one slider */
  along: boolean
  bandAvail: boolean
  onAlong: (on: boolean) => void
}

export function GameView(p: GameViewProps) {
  const sections = useMemo(() => sectionsOf(p.flat), [p.flat])
  const items = useMemo(() => highway(p.flat, p.beatOf, p.hands, sections, p.chordAt), [p.flat, p.beatOf, p.hands, sections, p.chordAt])
  const barBeats = useMemo(() => { const out: number[] = []; let last = -1; p.flat.forEach((f, i) => { if (f.bar !== last) { out.push(p.beatOf[i] ?? 0); last = f.bar } }); return out }, [p.flat, p.beatOf])
  const scorer = useRef(new Scorer())
  const results = useRef(new Map<number, NoteResult>())
  const played = useRef(new Set<number>())
  const [, bump] = useState(0)
  const [fb, setFb] = useState<GameFeedback | null>(null)
  const [end, setEnd] = useState<{ run: SectionResult[]; best: ReturnType<typeof mergeBest>; points: number; streak: number; newBest: boolean } | null>(null)
  const prevStates = useRef<Uint8Array>(new Uint8Array(0))
  const wrongAt = useRef(new Set<number>())
  const lastCursor = useRef(-1)

  const reset = () => { scorer.current = new Scorer(); results.current = new Map(); played.current = new Set(); wrongAt.current = new Set(); prevStates.current = new Uint8Array(p.states.length); setEnd(null); bump(n => n + 1) }
  const record = (flat: number, r: NoteResult) => {
    if (results.current.has(flat)) return
    results.current.set(flat, r)
    const it = items.find(x => x.flat === flat)
    if (it) played.current.add(it.section)
    scorer.current.add(r)
  }
  // a new run (In time start, or Wait for me starting to listen) starts a new score
  useEffect(() => { if (p.running) reset() }, [p.running]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (p.listening && p.mode === 'wait' && results.current.size === 0) reset() }, [p.listening]) // eslint-disable-line react-hooks/exhaustive-deps

  // In time: each judged note (the tab's colour states say which steps changed)
  useEffect(() => {
    if (p.mode !== 'time' || !p.timeFb) return
    const st = p.states, prev = prevStates.current
    for (let i = 0; i < st.length; i++) {
      if (st[i] && st[i] !== prev[i]) record(i, st[i] === 3 ? 'miss' : st[i] === 1 ? (p.timeFb.j === 'perfect' ? 'perfect' : 'good') : p.timeFb.j === 'early' ? 'early' : 'late')
    }
    prevStates.current = st.slice()
    const j = p.timeFb.j
    setFb({ key: p.timeFb.key, kind: j, text: j === 'perfect' ? 'PERFECT' : j === 'good' ? 'GOOD' : j === 'miss' ? 'MISS' : j === 'early' ? 'EARLY' : 'LATE' })
    bump(n => n + 1)
  }, [p.timeFb?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  // Wait for me: a wrong note marks the step; moving on scores it (first try = perfect, after a wrong one = late)
  useEffect(() => {
    if (p.mode !== 'wait' || !p.waitFb) return
    if (!p.waitFb.ok) { wrongAt.current.add(p.cursorFlat); setFb({ key: p.waitFb.key, kind: 'wrong', text: p.waitFb.text ?? 'NOT THAT ONE' }) }
    else setFb({ key: p.waitFb.key, kind: 'ok', text: wrongAt.current.has(lastCursor.current) ? 'GOT IT' : 'PERFECT' })
  }, [p.waitFb?.key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (p.mode !== 'wait') return
    const from = lastCursor.current
    // -1 = the song is done
    const to = p.cursorFlat < 0 && from >= 0 ? p.flat.length : p.cursorFlat
    lastCursor.current = p.cursorFlat
    if (from >= 0 && to > from && p.listening) {
      for (const it of items) if (it.flat >= from && it.flat < to) record(it.flat, wrongAt.current.has(it.flat) ? 'late' : 'perfect')
      bump(n => n + 1)
      // the last note played: the end screen
      if (items.length && to > items[items.length - 1].flat && !end) finish()
    }
  }, [p.cursorFlat]) // eslint-disable-line react-hooks/exhaustive-deps
  // In time finished (a whole run)
  useEffect(() => { if (p.finished && p.mode === 'time' && results.current.size) finish() }, [p.finished]) // eslint-disable-line react-hooks/exhaustive-deps

  function finish() {
    const run = sectionResults(sections, items, results.current)
    const playedArr = sections.map((_, i) => played.current.has(i))
    const prev = loadBest(p.songId)
    const best = mergeBest(prev, run, playedArr)
    saveBest(p.songId, best)
    setEnd({ run, best, points: scorer.current.points, streak: scorer.current.best, newBest: !prev || best.total > prev.total })
  }

  const live = sectionResults(sections, items, results.current).map((r, i) => (played.current.has(i) ? r : { ...r, stars: 0 as const }))
  const sc = scorer.current
  const nextItem = items.find(it => it.beat >= (p.beatNow() ?? (items.find(x => x.flat >= p.cursorFlat)?.beat ?? 0)) - 0.01)
  const cursorBeat = items.find(x => x.flat >= p.cursorFlat)?.beat ?? 0
  const perfectList = end ? toPerfect(end.best, end.run) : []

  return (
    <div className="game stack" style={{ gap: 6 }} data-testid="game">
      <div className="game-hud" role="status" aria-live="off">
        <span className="game-score"><b className="tabular" data-testid="game-points">{sc.points.toLocaleString()}</b><span className="small muted"> points</span></span>
        <span className={`game-mult m${sc.mult}`} data-testid="game-mult" title="Clean notes in a row raise it (8 per step), a miss drops it back to 3×">{sc.mult}×</span>
        <span className="small">Streak <b className="tabular">{sc.streak}</b></span>
        <span className="game-spacer" />
        <button className="btn sm" onClick={() => { reset(); p.onTop() }} title="Start over from the beginning of the song" data-testid="game-top"><Ico n="back" /> From the top</button>
        {p.onLoopStart && <button className="btn sm" onClick={() => { reset(); p.onLoopStart!() }} title="Start over from the beginning of your loop" data-testid="game-loopstart"><Ico n="loop" /> From my loop</button>}
        <button className="btn sm" onClick={() => nextItem && p.onPlayFor(nextItem.flat)} title="Hear the next note or chord" data-testid="game-playfor"><Ico n="ear" /> Play for me</button>
        <label className="row small" style={{ gap: 4, alignItems: 'center' }} title="Each loop: 90% or better speeds up 5%, under 60% slows down 5% (25–125%)">
          <input type="checkbox" checked={p.autoSpeed} onChange={e => p.onAutoSpeed(e.target.checked)} data-testid="game-auto" /> Auto speed {p.autoSpeed && <b className="tabular">{p.speedPct}%</b>}
        </label>
      </div>
      <div className="game-along" data-testid="game-along">
        <label className="row small" style={{ gap: 6, alignItems: 'center' }} title="The song plays while you play: your part and the other instruments, in time, scored as you go">
          <input type="checkbox" checked={p.along} onChange={e => p.onAlong(e.target.checked)} data-testid="game-along-toggle" />
          <b>Song plays along</b>{p.mode !== 'time' && !p.along && <span className="muted"> (in time)</span>}
        </label>
        {p.along && <MixSlider band={p.bandAvail} compact />}
        {p.along && p.bandAvail && <button className="btn sm" onClick={() => { if (!shownCards('play').includes('mixer')) toggleCard('play', 'mixer') }} data-testid="game-mixer" title="Each part's volume, mute and solo"><Ico n="sliders" /> Mixer</button>}
      </div>
      <GameHighway items={items} sections={sections} barBeats={barBeats} stringNames={p.stringNames} beatNow={p.beatNow} cursorBeat={cursorBeat}
        spb={p.spb} states={p.states} feedback={fb} sectionStars={live} onTap={(f, n) => p.onPlayFor(f, n)} onStartAt={f => { reset(); p.onStartAt(f) }} />
      <div className="game-legend small muted" aria-hidden>
        {['open', '1st', '2nd', '3rd', '4th'].map((n, i) => <span key={n}><i className={`fdot f${i}`} />{n === 'open' ? 'open string' : `${n} finger`}</span>)}
      </div>
      {end && (
        <div className="game-end panel stack" style={{ gap: 8 }} data-testid="game-end" role="dialog" aria-label="Your score">
          <div className="row" style={{ gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>{end.points.toLocaleString()} points</h3>
            <span className="small">best streak {end.streak}</span>
            {end.newBest && <span className="badge">New best!</span>}
          </div>
          <ul className="plain game-secs">
            {sections.map((s, i) => (
              <li key={i} className={played.current.has(i) ? '' : 'muted'}>
                <span>{s.name} <span className="small muted">(bars {s.fromBar + 1}–{s.toBar + 1})</span></span>
                <span className={`stars${end.run[i].gold ? ' gold' : ''}`} aria-label={`${end.run[i].stars} stars`}>{'★'.repeat(end.run[i].stars)}{'☆'.repeat(3 - end.run[i].stars)}</span>
                <span className="small muted">best {'★'.repeat(end.best.sections[i]?.stars ?? 0) || '–'}{end.best.sections[i]?.gold ? ' gold' : ''}</span>
              </li>
            ))}
          </ul>
          <span className="small muted">Your best score for this song: {end.best.total.toLocaleString()} (the best run of each part).</span>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={() => { setEnd(null); p.onAgain() }}>Play again</button>
            {perfectList.length > 0 && <button className="btn" onClick={() => { const s = sections[perfectList[0]]; setEnd(null); p.onPerfect(s) }} data-testid="game-perfect">Perfect it: {sections[perfectList[0]].name}</button>}
            <button className="btn ghost" onClick={() => setEnd(null)}>Close</button>
          </div>
          {perfectList.length > 0 && <span className="small muted">Perfect it loops {sections[perfectList[0]].name} in time with Auto speed, then the next part that lost stars.</span>}
        </div>
      )}
    </div>
  )
}

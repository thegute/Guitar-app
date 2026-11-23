// Pro Studio Game Mode around the highway:
//   - Dark-glass telemetry HUD (Score, Multiplier 3×–5×, Streak, Live Accuracy %, Display style & Timing Comet toggle)
//   - Slim Section Progress Bar above the highway (replaces overlapping section text)
//   - Bug fixes: full state reset on songId change, exact string indices passed to hit sparks & string vibration,
//     Wait-for-me GOT IT vs PERFECT off-by-one fix
//   - End-of-run Studio Performance Card: Accuracy Ring, Grade (S/A/B/C/D), Early/On-Time/Late/Missed Timing Bar,
//     section stars, Play again, and "Perfect it".
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FlatStep } from '../tabs/model'
import type { HandGroup } from '../play/handShape'
import {
  highway,
  loadBest,
  mergeBest,
  runSummary,
  saveBest,
  sectionResults,
  sectionsOf,
  toPerfect,
  Scorer,
  type GameColorStyle,
  type NoteResult,
  type Section,
  type SectionResult,
  type TimingSummary,
} from '../play/game'
import { GameHighway, type GameFeedback } from './GameHighway'
import { MixSlider } from './MixSlider'
import { usePersist } from './Controls'
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
  const itemByFlat = useMemo(() => new Map(items.map(it => [it.flat, it])), [items])
  const barBeats = useMemo(() => {
    const out: number[] = []
    let last = -1
    p.flat.forEach((f, i) => { if (f.bar !== last) { out.push(p.beatOf[i] ?? 0); last = f.bar } })
    return out
  }, [p.flat, p.beatOf])

  // Pro studio display preferences (persisted cleanly)
  const [colorStyle, setColorStyle] = usePersist<GameColorStyle>('gameColorStyle', 'finger')
  const [showComet, setShowComet] = usePersist<boolean>('gameComet', false)
  const [optsOpen, setOptsOpen] = useState(false)

  const scorer = useRef(new Scorer())
  const results = useRef(new Map<number, NoteResult>())
  const played = useRef(new Set<number>())
  const [, bump] = useState(0)
  const [fb, setFb] = useState<GameFeedback | null>(null)
  const [end, setEnd] = useState<{
    run: SectionResult[]
    best: ReturnType<typeof mergeBest>
    points: number
    streak: number
    newBest: boolean
    timing: TimingSummary
  } | null>(null)
  const prevStates = useRef<Uint8Array>(new Uint8Array(0))
  const wrongAt = useRef(new Set<number>())
  const lastCursor = useRef(-1)

  const reset = () => {
    scorer.current = new Scorer()
    results.current = new Map()
    played.current = new Set()
    wrongAt.current = new Set()
    prevStates.current = new Uint8Array(p.states.length)
    setFb(null)
    setEnd(null)
    bump(n => n + 1)
  }

  const record = (flat: number, r: NoteResult) => {
    if (results.current.has(flat)) return
    results.current.set(flat, r)
    const it = itemByFlat.get(flat)
    if (it) played.current.add(it.section)
    scorer.current.add(r)
  }

  // Bug fix #1: switching songs resets all stale scores, streaks & end dialog immediately
  useEffect(() => {
    lastCursor.current = -1
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.songId])

  // a new run (In time start, or Wait for me starting to listen) starts a new score
  useEffect(() => { if (p.running) reset() }, [p.running]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (p.listening && p.mode === 'wait' && results.current.size === 0) reset() }, [p.listening]) // eslint-disable-line react-hooks/exhaustive-deps

  // In time: each judged note (pass the EXACT hit strings so sparks & string vibration fire on the right string!)
  useEffect(() => {
    if (p.mode !== 'time' || !p.timeFb) return
    const st = p.states, prev = prevStates.current
    const changedStrings: number[] = []
    for (let i = 0; i < st.length; i++) {
      if (st[i] && st[i] !== prev[i]) {
        record(i, st[i] === 3 ? 'miss' : st[i] === 1 ? (p.timeFb.j === 'perfect' ? 'perfect' : 'good') : p.timeFb.j === 'early' ? 'early' : 'late')
        const it = itemByFlat.get(i)
        if (it) it.notes.forEach(n => { if (!changedStrings.includes(n.string)) changedStrings.push(n.string) })
      }
    }
    prevStates.current = st.slice()
    const j = p.timeFb.j
    setFb({
      key: p.timeFb.key,
      kind: j,
      text: j === 'perfect' ? 'PERFECT' : j === 'good' ? 'GOOD' : j === 'miss' ? 'MISS' : j === 'early' ? 'EARLY' : 'LATE',
      strings: changedStrings.length ? changedStrings : undefined,
    })
    bump(n => n + 1)
  }, [p.timeFb?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  // Wait for me: fix GOT IT vs PERFECT off-by-one & fire sparks on the real played string(s)
  useEffect(() => {
    if (p.mode !== 'wait' || !p.waitFb) return
    const curItem = itemByFlat.get(p.cursorFlat) ?? itemByFlat.get(lastCursor.current)
    const hitStrings = curItem?.notes.map(n => n.string)
    if (!p.waitFb.ok) {
      wrongAt.current.add(p.cursorFlat)
      setFb({ key: p.waitFb.key, kind: 'wrong', text: p.waitFb.text ?? 'TRY AGAIN', strings: hitStrings })
    } else {
      const targetFlat = wrongAt.current.has(p.cursorFlat) ? p.cursorFlat : lastCursor.current
      const hadWrong = wrongAt.current.has(targetFlat)
      setFb({ key: p.waitFb.key, kind: 'ok', text: hadWrong ? 'GOT IT' : 'PERFECT', strings: hitStrings })
    }
  }, [p.waitFb?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (p.mode !== 'wait') return
    const from = lastCursor.current
    const to = p.cursorFlat < 0 && from >= 0 ? p.flat.length : p.cursorFlat
    lastCursor.current = p.cursorFlat
    if (from >= 0 && to > from && p.listening) {
      for (const it of items) if (it.flat >= from && it.flat < to) record(it.flat, wrongAt.current.has(it.flat) ? 'late' : 'perfect')
      bump(n => n + 1)
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
    const timing = runSummary(results.current)
    setEnd({ run, best, points: scorer.current.points, streak: scorer.current.best, newBest: !prev || best.total > prev.total, timing })
  }

  const live = sectionResults(sections, items, results.current).map((r, i) => (played.current.has(i) ? r : { ...r, stars: 0 as const }))
  const liveTiming = runSummary(results.current)
  const sc = scorer.current
  const curBeat = p.beatNow() ?? (items.find(x => x.flat >= p.cursorFlat)?.beat ?? 0)
  const nextItem = items.find(it => it.beat >= curBeat - 0.01)
  const activeSecIdx = nextItem?.section ?? 0
  const cursorBeat = items.find(x => x.flat >= p.cursorFlat)?.beat ?? 0
  const perfectList = end ? toPerfect(end.best, end.run) : []

  return (
    <div className="game stack" style={{ gap: 6 }} data-testid="game">
      {/* 1. Sleek Dark-Studio Telemetry HUD */}
      <div className="game-hud" role="status" aria-live="off">
        <div className="game-stat-group">
          <span className="game-score">
            <b className="tabular" data-testid="game-points">{sc.points.toLocaleString()}</b>
            <span className="game-stat-lbl">PTS</span>
          </span>
          <span className={`game-mult m${sc.mult}`} data-testid="game-mult" title="Clean notes in a row raise it (8 per step), a miss drops it back to 3×">
            {sc.mult}×
          </span>
          <span className="game-pill">
            <span className="game-stat-lbl">STREAK</span>
            <b className="tabular">{sc.streak}</b>
          </span>
          {liveTiming.total > 0 && (
            <span className="game-pill acc" title="Live run accuracy">
              <span className="game-stat-lbl">ACC</span>
              <b className="tabular">{liveTiming.accuracy}%</b>
            </span>
          )}
        </div>
        <span className="game-spacer" />
        <div className="row" style={{ gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn sm" onClick={() => { reset(); p.onTop() }} title="Start over from the beginning of the song" data-testid="game-top">
            <Ico n="back" /> Top
          </button>
          {p.onLoopStart && (
            <button className="btn sm" onClick={() => { reset(); p.onLoopStart!() }} title="Start over from the beginning of your loop" data-testid="game-loopstart">
              <Ico n="loop" /> Loop
            </button>
          )}
          <button className="btn sm" onClick={() => nextItem && p.onPlayFor(nextItem.flat)} title="Hear the next note or chord" data-testid="game-playfor">
            <Ico n="ear" /> Hear
          </button>
          <button
            className={`btn sm${optsOpen ? ' on' : ''}`}
            aria-pressed={optsOpen}
            onClick={() => setOptsOpen(o => !o)}
            title="Highway style (Finger Gems / String Colors / Stealth) & Timing Comet"
            data-testid="game-display-btn"
          >
            ⚙ Style
          </button>
        </div>
      </div>

      {/* 2. Sleek Studio Playback & Auto-Speed Strip */}
      <div className="game-along" data-testid="game-along">
        <label className={`game-toggle-pill${p.along ? ' on' : ''}`} title="The song plays while you play: your part and the other instruments, in time, scored as you go">
          <input type="checkbox" checked={p.along} onChange={e => p.onAlong(e.target.checked)} data-testid="game-along-toggle" />
          <span>Song plays along</span>
        </label>
        {p.along && <MixSlider band={p.bandAvail} compact />}
        {p.along && p.bandAvail && (
          <button
            className="btn sm"
            onClick={() => { if (!shownCards('play').includes('mixer')) toggleCard('play', 'mixer') }}
            data-testid="game-mixer"
            title="Each part's volume, mute and solo"
          >
            <Ico n="sliders" /> Mixer
          </button>
        )}
        <label className={`game-toggle-pill${p.autoSpeed ? ' on' : ''}`} title="Each loop: 90% or better speeds up 5%, under 60% slows down 5% (25–125%)">
          <input type="checkbox" checked={p.autoSpeed} onChange={e => p.onAutoSpeed(e.target.checked)} data-testid="game-auto" />
          <span>Auto speed{p.autoSpeed ? ` ${p.speedPct}%` : ''}</span>
        </label>
      </div>

      {/* Collapsible Pro Highway Display Bar (Color Style + Optional Redesigned Timing Comet) */}
      {optsOpen && (
        <div className="game-display-bar" data-testid="game-display-panel">
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="small muted">Note style:</span>
            <div className="seg" role="group" aria-label="Note color style">
              {([
                ['finger', 'Finger Gems'],
                ['string', 'String Colors'],
                ['stealth', 'Stealth'],
              ] as [GameColorStyle, string][]).map(([id, label]) => (
                <button
                  key={id}
                  className="btn sm"
                  aria-pressed={colorStyle === id}
                  onClick={() => setColorStyle(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className={`game-toggle-pill${showComet ? ' on' : ''}`} title="Show the luminous Timing Comet (redesigned guide ball with fading arc trail)">
              <input type="checkbox" checked={showComet} onChange={e => setShowComet(e.target.checked)} data-testid="game-comet-toggle" />
              <span>Timing Comet (Guide ball)</span>
            </label>
          </div>
        </div>
      )}

      {/* 3. Slim Non-Overlapping Section Progress Strip */}
      {sections.length > 0 && (
        <div className="game-sec-strip" aria-label="Song sections">
          {sections.map((sec, si) => {
            const st = live[si]
            const isPlayed = played.current.has(si)
            const isActive = si === activeSecIdx
            return (
              <button
                key={`${sec.name}-${si}`}
                type="button"
                className={`game-sec-seg${isActive ? ' active' : ''}${isPlayed && st?.stars === 3 ? ' cleared' : ''}`}
                onClick={() => { reset(); p.onStartAt(sec.from) }}
                title={`Jump to ${sec.name} (bars ${sec.fromBar + 1}–${sec.toBar + 1})`}
              >
                <span className="game-sec-name">{sec.name}</span>
                {isPlayed && st && (
                  <span className={`game-sec-stars${st.gold ? ' gold' : ''}`}>
                    {'★'.repeat(st.stars)}{'☆'.repeat(3 - st.stars)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* 4. Pro Studio Note Highway Canvas */}
      <GameHighway
        items={items}
        sections={sections}
        barBeats={barBeats}
        stringNames={p.stringNames}
        beatNow={p.beatNow}
        cursorBeat={cursorBeat}
        spb={p.spb}
        states={p.states}
        feedback={fb}
        sectionStars={live}
        onTap={(f, n) => p.onPlayFor(f, n)}
        onStartAt={f => { reset(); p.onStartAt(f) }}
        colorStyle={colorStyle}
        showComet={showComet}
      />

      {/* 5. Compact Studio Color Legend (matches active Note Style) */}
      {colorStyle === 'finger' && (
        <div className="game-legend small muted" aria-hidden>
          {['Open', '1 Index', '2 Mid', '3 Ring', '4 Pinky'].map((n, i) => (
            <span key={n}><i className={`fdot f${i}`} />{n}</span>
          ))}
        </div>
      )}

      {/* 6. Pro Studio End-of-Run Performance Card */}
      {end && (
        <div className="game-end panel stack" style={{ gap: 10 }} data-testid="game-end" role="dialog" aria-label="Your score">
          <div className="game-end-hero">
            <div className="game-ring" aria-label={`Accuracy ${end.timing.accuracy}%`}>
              <svg viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="27" className="game-ring-bg" />
                <circle
                  cx="32"
                  cy="32"
                  r="27"
                  className={`game-ring-fg g-${end.timing.grade}`}
                  pathLength={100}
                  strokeDasharray={`${end.timing.accuracy} 100`}
                />
              </svg>
              <span className="game-ring-txt">
                <b>{end.timing.grade}</b>
                <small>{end.timing.accuracy}%</small>
              </span>
            </div>
            <div className="stack" style={{ gap: 3, flex: 1 }}>
              <div className="row" style={{ gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>{end.points.toLocaleString()} pts</h3>
                <span className="small muted">Best streak <b>{end.streak}</b></span>
                {end.newBest && <span className="badge">New best!</span>}
              </div>
              <p className="small muted" style={{ margin: 0 }}>{end.timing.tip}</p>
            </div>
          </div>

          {/* Timing Breakdown Bar (Perfect / Good / Early / Late / Missed) */}
          {end.timing.total > 0 && (
            <div className="stack" style={{ gap: 4 }}>
              <div className="game-tbar" role="img" aria-label={`Perfect ${end.timing.perfect}, Good ${end.timing.good}, Early ${end.timing.early}, Late ${end.timing.late}, Missed ${end.timing.miss}`}>
                {end.timing.perfect > 0 && <span className="tb-perf" style={{ flex: end.timing.perfect }} />}
                {end.timing.good > 0 && <span className="tb-good" style={{ flex: end.timing.good }} />}
                {end.timing.early > 0 && <span className="tb-early" style={{ flex: end.timing.early }} />}
                {end.timing.late > 0 && <span className="tb-late" style={{ flex: end.timing.late }} />}
                {end.timing.miss > 0 && <span className="tb-miss" style={{ flex: end.timing.miss }} />}
              </div>
              <div className="row small muted" style={{ gap: 10, flexWrap: 'wrap', fontSize: 11 }}>
                <span><b style={{ color: '#fbbf24' }}>{end.timing.perfect}</b> Perfect</span>
                <span><b style={{ color: '#4ade80' }}>{end.timing.good}</b> Good</span>
                <span><b style={{ color: '#38bdf8' }}>{end.timing.early}</b> Early</span>
                <span><b style={{ color: '#fb923c' }}>{end.timing.late}</b> Late</span>
                <span><b style={{ color: '#f87171' }}>{end.timing.miss}</b> Missed</span>
              </div>
            </div>
          )}

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
            {perfectList.length > 0 && (
              <button className="btn" onClick={() => { const s = sections[perfectList[0]]; setEnd(null); p.onPerfect(s) }} data-testid="game-perfect">
                Perfect it: {sections[perfectList[0]].name}
              </button>
            )}
            <button className="btn ghost" onClick={() => setEnd(null)}>Close</button>
          </div>
          {perfectList.length > 0 && (
            <span className="small muted">Perfect it loops {sections[perfectList[0]].name} in time with Auto speed, then the next part that lost stars.</span>
          )}
        </div>
      )}
    </div>
  )
}

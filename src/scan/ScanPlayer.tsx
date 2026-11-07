// The player under a scan result: the tab with a moving playhead, Play / Pause / Back to the start, a speed slider
// (shows the BPM it plays at), tap a note to start from there, and the floating "Where your fingers go" box following
// the playhead (with Loop this shift). The full practice tools are one tap away in Play.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SongDoc } from '../tabs/library'
import { flatten } from '../tabs/model'
import { TabPlayer } from '../audio/tabPlayer'
import { activeSound, soundForProgram } from '../audio/pluck'
import { TabView } from '../components/TabView'
import { FingerBox } from '../components/FingerBox'
import { groupAt, handGroups } from '../play/handShape'
import { songTempo } from '../play/tempoMap'
import { useInstrument } from '../instrument'
import { pcName } from '../theory/notes'
import { Ico } from '../components/Icon'

export function ScanPlayer({ doc }: { doc: SongDoc }) {
  const inst = useInstrument()
  const track = doc.song.tracks[0]
  const flat = useMemo(() => flatten(track), [track])
  const states = useMemo(() => new Uint8Array(flat.length), [flat])
  const [at, setAt] = useState(-1)
  const [from, setFrom] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [loop, setLoop] = useState<{ from: number; to: number } | null>(null)
  const player = useRef<TabPlayer | null>(null)
  const bpm = doc.song.tempo ?? 90
  const playing = at >= 0
  const strNames = useMemo(() => track.tuning.map((t, s) => {
    const n = pcName(t % 12, false)
    return s === track.tuning.length - 1 && track.tuning.filter(x => x % 12 === t % 12).length > 1 ? n.toLowerCase() : n
  }), [track.tuning])
  const hands = useMemo(() => handGroups(flat, { inst: inst.id, stringNames: strNames }), [flat, inst.id, strNames])
  useEffect(() => () => player.current?.stop(), [])
  useEffect(() => { player.current?.stop(); setAt(-1); setFrom(0); setLoop(null) }, [doc])

  const start = (i: number, lp = loop) => {
    const p = (player.current ??= new TabPlayer())
    p.onStep = k => setAt(k)
    p.onEnd = () => { setAt(-1); setFrom(0) }
    p.sound = activeSound(soundForProgram(track.program))
    p.meter = doc.song.meter ?? 4
    const map = songTempo(doc.song)
    p.tempo = map.changes ? map : undefined
    if (lp) {
      const a = flat.findIndex(f => f.bar === lp.from), b = flat.findIndex(f => f.bar > lp.to)
      p.play(flat, Math.max(a, i >= a && (b < 0 || i < b) ? i : a), bpm * speed, b < 0 ? flat.length : b, a)
    } else p.play(flat, i, bpm * speed)
    setAt(i)
  }
  const pause = () => { player.current?.stop(); setFrom(Math.max(0, at)); setAt(-1) }
  const reset = () => { player.current?.stop(); setAt(-1); setFrom(0) }
  // a new speed takes effect from the note you're on
  useEffect(() => { if (playing) start(at) }, [speed]) // eslint-disable-line react-hooks/exhaustive-deps

  const cur = playing ? at : from
  const hg = groupAt(hands, cur)
  const hand = hg >= 0 ? hands[hg] : null
  const next = hg >= 0 ? hands[hg + 1] ?? null : null
  const toShift = hand && next ? flat.slice(Math.max(0, cur), next.from).reduce((t, f) => t + f.step.dur, 0) : Infinity
  const expected = flat[cur]?.step.notes ?? []

  return (
    <div className="scan-player stack" style={{ gap: 6 }} data-testid="scan-player">
      <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className={`btn sm${playing ? ' on' : ' primary'}`} onClick={() => (playing ? pause() : start(from))} data-testid="sp-play">
          {playing ? <><Ico n="pause" fill /> Pause</> : <><Ico n="play" fill /> {from > 0 ? 'Go on' : 'Play'}</>}
        </button>
        <button className="btn sm ghost" onClick={reset} aria-label="Back to the start" disabled={!playing && from === 0}><Ico n="again" /></button>
        <label className="row small" style={{ gap: 6, alignItems: 'center', flex: '1 1 160px' }}>
          <span>Speed</span>
          <input type="range" min={0.25} max={1.5} step={0.05} value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Speed" data-testid="sp-speed" style={{ flex: 1 }} />
          <b className="tabular" data-testid="sp-bpm">{Math.round(bpm * speed)} BPM</b>
        </label>
        {loop && <button className="btn sm on" onClick={() => { setLoop(null); if (playing) start(at, null) }}>Looping bars {loop.from + 1}–{loop.to + 1} ✕</button>}
      </div>
      <TabView track={track} mode="fret" flats={false} cursor={cur} playing={playing} states={states} version={0} spans={[]}
        onTap={i => { if (playing) start(i); else setFrom(i) }} />
      {hand && hand.notes.some(n => n.fret > 0) && (
        <FingerBox where="scan" group={hand} next={next} beatsToShift={toShift} expected={expected} nStr={track.tuning.length} stringNames={strNames}
          onLoopShift={next ? () => { const b = flat[next.from]?.bar ?? 0; const lp = { from: Math.max(0, b - 1), to: b }; setLoop(lp); start(flat.findIndex(f => f.bar === lp.from), lp) } : undefined} />
      )}
    </div>
  )
}

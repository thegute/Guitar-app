// Target notes trainer: a band plays a progression; you land on the chosen chord tone (root, 3rd, 5th, 7th, the nearest
// 3rd/7th for voice leading, or any chord tone) right as each chord arrives. The mic judges each landing; the neck shows
// where the targets are in the position you chose. Slow it down, speed it up, or let the speed trainer move it.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Instrument } from '../instrument'
import { Chips, usePersist } from '../components/Controls'
import { Fretboard, type Mark } from '../components/Fretboard'
import { JamTransport } from '../audio/jam'
import { acquireListener, type ListenerSession } from '../engine/listener'
import { audio, keepAwake } from '../audio/engine'
import { playNote } from '../audio/pluck'
import { pc as pcOf, SHARPS } from '../theory/notes'
import { typeTones } from '../theory/progressions'
import { shapesFor } from '../theory/shapes'
import { STARTER_PROGS, jamProgression, starterProgression } from '../tabs/fromProgression'
import { bumpCounts, usePracticeTimer } from './progress'
import { LEVELS, TARGET_KINDS, levelAdvice, loadBest, noteLap, allowed, judge, nextBpm, OnsetDetector, pcLabel, stepWords, tchord, walk, zone, type Onset, type TargetKind, type TChord, type Window } from './targets'
import { countUse } from '../usage'

const ZONES = [{ id: 0, label: 'Open' }, { id: 3, label: '3rd fret' }, { id: 5, label: '5th fret' }, { id: 7, label: '7th fret' }, { id: 9, label: '9th fret' }, { id: 12, label: '12th fret' }]
const WINDOWS: { id: Window; label: string }[] = [{ id: 'first', label: 'First note of each chord' }, { id: 'one', label: 'Right on the 1' }]
const pcm = (m: number) => ((m % 12) + 12) % 12

export function TargetNotes({ inst, onExit }: { inst: Instrument; onExit: () => void }) {
  const jam = useMemo(() => jamProgression(), [])
  const [src, setSrc] = usePersist<string>('tn:prog', jam ? 'jam' : 'pop')
  const [key, setKey] = usePersist<string>('tn:key', 'G')
  const [kind, setKind] = usePersist<TargetKind>('tn:kind', 'any')
  const [win, setWin] = usePersist<Window>('tn:win', 'first')
  const [from, setFrom] = usePersist<number>('tn:zone', 5)
  const [bpm, setBpm] = usePersist<number>('tn:bpm', 70)
  const [trainer, setTrainer] = usePersist<boolean>('tn:trainer', true)
  const [on, setOn] = useState(false)
  const [err, setErr] = useState('')
  const [now, setNow] = useState<{ chord: number; countIn: number; lap: number } | null>(null)
  const [marks, setMarks] = useState<(boolean | null)[]>([])
  const [laps, setLaps] = useState<number[]>([])
  const [heard, setHeard] = useState<number | null>(null)
  const [hits, setHits] = useState(0)
  const [best, setBest] = useState(loadBest)
  const adv = levelAdvice(best)
  usePracticeTimer('theory', on, true)

  // the progression: Jam's, or a starter in the chosen key
  const prog = useMemo(() => {
    if (src === 'jam' && jam) return { tonic: jam.tonic, chords: jam.chords.map(c => ({ symbol: c.symbol, root: c.root, type: c.type, beats: c.beats ?? 4 })) }
    const s = starterProgression(src === 'jam' ? 'pop' : src, key)
    return { tonic: key, chords: s.chords.map(c => ({ symbol: c.symbol, root: c.root, type: c.type, beats: c.beats ?? 4 })) }
  }, [src, key, jam])
  const chords = useMemo(() => prog.chords.map(c => tchord(c.symbol, c.beats)).filter((c): c is TChord => !!c), [prog])
  const z = useMemo(() => zone(inst.midis, from), [inst.midis, from])
  const path = useMemo(() => walk(chords, kind, z.lo, z.hi), [chords, kind, z])
  const starts = useMemo(() => { let b = 0; return chords.map(c => { const s = b; b += c.beats; return s }) }, [chords])

  const T = useRef<JamTransport | null>(null)
  const tracker = useRef<ListenerSession | null>(null)
  const raf = useRef(0)
  const live = useRef({ onsets: [] as Onset[], judged: -1, lapMarks: [] as (boolean | null)[], lap: 0, good: 0, bpm, det: new OnsetDetector() })

  const stop = () => {
    cancelAnimationFrame(raf.current)
    T.current?.stop()
    tracker.current?.stop(); tracker.current = null
    setOn(false); setNow(null); setHeard(null)
    void keepAwake(false)
  }
  useEffect(() => () => stop(), []) // eslint-disable-line react-hooks/exhaustive-deps
  // a new progression, target or position while playing: start again
  useEffect(() => { if (on) stop() }, [prog, kind, from, win]) // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    setErr('')
    const t = T.current ?? (T.current = new JamTransport())
    const voiced = prog.chords.map(c => {
      const v = shapesFor({ root: c.root, type: c.type }, inst)[0]
      return { midis: v ? v.frets.map((f, s) => (f < 0 ? -1 : inst.midis[s] + f)).filter(m => m > 0) : [], beats: c.beats, root: pcOf(c.root), tones: typeTones(c.type) }
    })
    t.setSong(voiced, bpm, 'pop', 'pop', 'pop', 'acoustic')
    t.setMix({ chords: true, drums: true, click: false, bass: true })
    const expectedForChord = (idx: number) => {
      const c = chords[idx]
      if (!c) return []
      const pcs = allowed(c, kind)
      const out: number[] = []
      for (let m = z.lo; m <= z.hi; m++) if (pcs.includes(pcm(m))) out.push(m)
      return out
    }
    try {
      const pt = acquireListener('target-notes', { autoGate: true, suppressBleed: true })
      pt.expect(expectedForChord(0), expectedForChord(1 % Math.max(1, chords.length)))
      const recordOnset = (beat: number, midi: number) => {
        const last = live.current.onsets[live.current.onsets.length - 1]
        if (last && Math.abs(last.beat - beat) <= 0.08 && last.midi === midi) return
        live.current.onsets.push({ beat, midi })
        if (live.current.onsets.length > 64) live.current.onsets.shift()
      }
      pt.onNote = e => {
        const tr = T.current
        if (!tr?.playing) return
        const beat = (e.time - pt.latencySec() - tr.T0) / tr.spb
        setHeard(e.midi)
        recordOnset(beat, e.midi)
      }
      pt.onFrame = f => {
        const tr = T.current
        if (!tr?.playing) return
        // the note started a little before we heard it (calibrated input latency per gear profile)
        const beat = (audio().currentTime - pt.latencySec() - tr.T0) / tr.spb
        if (f.midi !== null) setHeard(f.midi)
        const o = live.current.det.feed(f.midi, beat, f.level)
        if (o) recordOnset(o.t, o.midi)
      }
      await pt.start()
      tracker.current = pt
    } catch {
      setErr('The trainer needs the microphone (or your USB amp): allow it for KGuitar and try again.')
      return
    }
    live.current = { onsets: [], judged: -1, lapMarks: chords.map(() => null), lap: 0, good: 0, bpm, det: new OnsetDetector() }
    setMarks(chords.map(() => null)); setLaps([])
    t.start(4)
    // browser tests play notes straight in (the fake mic can't line up with the band)
    if ((window as { __kgTest?: boolean }).__kgTest) (window as unknown as { __tnHear: (m: number) => void }).__tnHear = (m: number) => { const tr = T.current; if (tr?.playing) live.current.onsets.push({ beat: (audio().currentTime - tr.T0) / tr.spb, midi: m }) }
    setOn(true)
    void keepAwake(true)
    countUse('learn:targets-start')
    let lastExpChord = -1
    const loop = () => {
      const tr = T.current
      if (!tr?.playing) return
      const p = tr.position()
      const L = live.current
      if (p.beat >= 0) {
        if (p.chord !== lastExpChord && chords.length > 0) {
          lastExpChord = p.chord
          tracker.current?.expect(expectedForChord(p.chord), expectedForChord((p.chord + 1) % chords.length))
        }
        const lap = Math.floor(p.beat / tr.loopBeats)
        // judge each chord once its window has passed
        const total = lap * chords.length + p.chord
        for (let k = L.judged + 1; k < total + (p.loopBeat - starts[p.chord] > (win === 'one' ? 0.55 : 1.05) ? 1 : 0); k++) {
          const ci = k % chords.length, kl = Math.floor(k / chords.length)
          const at = kl * tr.loopBeats + starts[ci]
          const j = judge(L.onsets, at, allowed(chords[ci], kind), win)
          L.lapMarks[ci] = j.ok
          if (j.ok) { setHits(h => h + 1); bumpCounts({ targetNotes: 1 }) }
          L.judged = k
          setMarks([...L.lapMarks])
          // a lap is done: score it, and the speed trainer moves the tempo
          if (ci === chords.length - 1) {
            const pct = Math.round((L.lapMarks.filter(Boolean).length / chords.length) * 100)
            setLaps(ls => [...ls.slice(-7), pct])
            setBest(noteLap(kind, L.bpm, pct))
            if (trainer) {
              const n = nextBpm(L.bpm, pct, L.good)
              L.good = n.goodLaps
              if (n.bpm !== L.bpm) { L.bpm = n.bpm; tr.setTempo(n.bpm); setBpm(n.bpm) }
            }
            L.lapMarks = chords.map(() => null)
          }
        }
        setNow({ chord: p.chord, countIn: 0, lap })
      } else setNow({ chord: -1, countIn: p.countIn, lap: 0 })
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
  }

  const changeBpm = (v: number) => { const b = Math.max(40, Math.min(200, v)); setBpm(b); live.current.bpm = b; T.current?.setTempo(b) }
  /** hear the walk first: the band's chords with the target notes on top, one lap */
  const preview = () => {
    const ctx = audio(); void ctx.resume()
    const t0 = ctx.currentTime + 0.1, spb = 60 / bpm
    chords.forEach((c, i) => playNote(path[i], t0 + starts[i] * spb, 0.9))
  }

  const ci = now && now.chord >= 0 ? now.chord : 0
  const cur = chords[ci], next = chords[(ci + 1) % chords.length]
  const curPcs = cur ? allowed(cur, kind) : []
  const markFor = (midi: number, _s: number, fret: number): Mark | null => {
    if (fret < from - (from ? 0 : 0) || fret > from + 4) return null
    if (heard !== null && midi === heard) return { label: pcLabel(midi), role: 'live' }
    if (midi === path[ci]) return { label: pcLabel(midi), role: 'target' }
    if (cur && curPcs.includes(pcm(midi))) return { label: cur.label(pcm(midi)) || pcLabel(midi), role: kind === 'any' ? 'chord' : 'ghost' }
    if (next && midi === path[(ci + 1) % chords.length]) return { label: pcLabel(midi), role: 'next' }
    return null
  }
  const hint = TARGET_KINDS.find(k => k.id === kind)?.hint

  return (
    <div className="stack target-notes" style={{ gap: 12 }} data-testid="target-notes">
      <div className="row"><button className="btn sm" onClick={() => { stop(); onExit() }}>← Back</button><h2 style={{ margin: 0 }}>Target notes</h2></div>
      <div className="panel stack" style={{ gap: 10 }}>
      {!on && <>
      <div className="tn-level" data-testid="tn-level">
        <div className="tn-steps">{LEVELS.map(k => <span key={k} className={(best[k] ?? 0) >= 80 ? 'ok' : k === adv.next ? 'now' : ''} title={TARGET_KINDS.find(x => x.id === k)?.label}>{TARGET_KINDS.find(x => x.id === k)?.label}</span>)}</div>
        <p className="small" style={{ margin: 0 }}>{adv.text}</p>
        {kind !== adv.next && <button className="btn sm" data-testid="tn-next" onClick={() => setKind(adv.next)}>Practise {TARGET_KINDS.find(x => x.id === adv.next)?.label.toLowerCase()}</button>}
      </div>
      <p className="small muted" style={{ margin: 0 }}>A band plays the chords. Land on the target note as each chord arrives: that is how a solo follows the changes.</p>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <label className="field" style={{ flex: '2 1 180px' }}><span>Chords</span>
          <select className="select" value={src} onChange={e => setSrc(e.target.value)} data-testid="tn-prog">
            {jam && <option value="jam">Your Jam progression ({jam.chords.map(c => c.symbol).join(' ')})</option>}
            {STARTER_PROGS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        {src !== 'jam' && <label className="field" style={{ flex: '1 1 80px' }}><span>Key</span>
          <select className="select" value={key} onChange={e => setKey(e.target.value)}>{SHARPS.map(k => <option key={k} value={k}>{k}</option>)}</select>
        </label>}
      </div>
      <Chips label="Target" items={TARGET_KINDS.map(k => ({ id: k.id, label: k.label }))} value={kind} onChange={setKind} wrap />
      {hint && <p className="small" style={{ margin: 0 }}>{hint}</p>}
      <Chips label="Where" items={ZONES} value={from} onChange={setFrom} wrap />
      <Chips label="Count it when" items={WINDOWS} value={win} onChange={setWin} wrap />
      </>}
      <div className="row tn-tempo" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="small">Speed</span>
        <button className="btn sm" aria-label="Slower" data-testid="tn-slower" onClick={() => changeBpm(bpm - 4)}>−</button>
        <b data-testid="tn-bpm">{bpm} BPM</b>
        <button className="btn sm" aria-label="Faster" data-testid="tn-faster" onClick={() => changeBpm(bpm + 4)}>+</button>
        <label className="row small" style={{ gap: 6, flexWrap: 'nowrap' }}><input type="checkbox" checked={trainer} onChange={e => setTrainer(e.target.checked)} /> <span>Speed trainer{on ? '' : ' (up after two good laps, down after a rough one)'}</span></label>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className={`btn${on ? '' : ' primary'}`} data-testid="tn-go" onClick={() => (on ? stop() : void start())}>{on ? 'Stop' : 'Start'}</button>
        {!on && <button className="btn" onClick={preview}>▶ Hear the targets</button>}
      </div>
      {err && <p className="notice small">{err}</p>}
      </div>

      <div className="tn-now" aria-live="polite">
        {now && now.chord < 0 ? <b className="tn-count">{now.countIn}</b> : cur && (
          <>
            <div className="tn-chord"><b>{cur.symbol}</b> <span className="small muted">next {next?.symbol}</span></div>
            <p className="tn-target" data-testid="tn-target" data-midi={path[ci]} data-chord={ci}>{stepWords(cur, path[ci], ci > 0 ? path[ci - 1] : undefined)}</p>
          </>
        )}
        <div className="tn-strip">
          {chords.map((c, i) => (
            <span key={i} className={`tn-cell${on && i === ci ? ' now' : ''}${marks[i] === true ? ' ok' : marks[i] === false ? ' miss' : ''}`}>
              <b>{c.symbol}</b><span className="small">{pcLabel(path[i])}</span>
            </span>
          ))}
        </div>
        {laps.length > 0 && <p className="small muted" style={{ margin: 0 }}>Laps: {laps.map(l => `${l}%`).join(' · ')}{hits ? ` · ${hits} landed` : ''}</p>}
      </div>
      <div className="panel">
      <Fretboard tuning={inst.midis} fromFret={Math.max(0, from - (from ? 1 : 0))} toFret={from + 5} markFor={markFor} zoomId="targets" />
      <p className="small muted" style={{ margin: 0 }}>Ringed: the target now. Teal ring: the next chord's target. {kind !== 'any' && 'Faint: the other notes of this chord.'}</p>
      </div>
    </div>
  )
}

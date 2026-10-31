// Practice tools: one-minute chord changes, the rhythm trainer and the circle of fifths explorer.
import { micWhere } from '../audio/input'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChordDiagram } from '../components/ChordDiagram'
import { CircleOfFifths, CIRCLE_MAJOR, keySignature } from '../components/CircleOfFifths'
import { Chips, usePersist } from '../components/Controls'
import { InputPicker } from '../components/InputPicker'
import { playNote, strum } from '../audio/pluck'
import { playClick } from '../audio/metronome'
import { audio, keepAwake } from '../audio/engine'
import { ChromaListener, chordMatch } from '../audio/chroma'
import { NoteListener } from '../tabs/follow'
import { kindOf, latencyMs } from '../audio/gear'
import { parseSymbol } from '../theory/chords'
import { pc, SHARPS, FLATS, keyPrefersFlats } from '../theory/notes'
import { chordShapes, SUFFIX_IV, type Instrument } from '../instrument'
import { addXp, bump, isAway, usePracticeTimer } from './progress'
import { logSkill } from './trends'
import { Zoomable } from '../components/Zoomable'
import { getReadySecs, useGetReady } from '../components/GetReady'

function read<T>(k: string, d: T): T {
  try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as T) : d } catch { return d }
}
function write(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ }
}
const tonesOf = (sym: string) => {
  const { root, suffix } = parseSymbol(sym)
  return (SUFFIX_IV[suffix] ?? [0, 4, 7]).map(i => (pc(root) + i) % 12)
}

// =====================================================================================
// One-minute chord changes
// =====================================================================================
const PAIRS: Record<Instrument['id'], [string, string][]> = {
  guitar: [['A', 'D'], ['D', 'E'], ['A', 'E'], ['C', 'G'], ['G', 'D'], ['Am', 'E'], ['C', 'Am'], ['G', 'Em'], ['Em', 'C'], ['D', 'Am'], ['Dm', 'A'], ['C', 'F'], ['G', 'C'], ['E', 'Am'], ['A7', 'D7'], ['F', 'G']],
  tenor: [['C', 'Am'], ['C', 'F'], ['F', 'G'], ['G', 'C'], ['Am', 'F'], ['C', 'G7'], ['Dm', 'G'], ['A', 'D'], ['G', 'Em'], ['C', 'A7'], ['F', 'Bb'], ['D', 'E7']],
  baritone: [['G', 'C'], ['C', 'D'], ['D', 'G'], ['Em', 'Am'], ['G', 'Em'], ['Am', 'D'], ['C', 'Am'], ['E', 'A'], ['D', 'Em'], ['G7', 'C']],
}
const SECONDS = 60

export function ChordChanges({ inst, onExit }: { inst: Instrument; onExit: () => void }) {
  const pairs = PAIRS[inst.id]
  const [pi, setPi] = usePersist(`changesPair:${inst.id}`, 0)
  const pair = pairs[pi % pairs.length]
  const key = `${inst.id}:${pair.join('-')}`
  const [useMic, setUseMic] = usePersist('changesMic', false)
  const [phase, setPhase] = useState<'ready' | 'count' | 'run' | 'done'>('ready')
  const [count, setCount] = useState(0)
  const [cur, setCur] = useState(0)
  const [left, setLeft] = useState(SECONDS)
  const [pre, setPre] = useState(3)
  const [msg, setMsg] = useState('')
  const [hist, setHist] = useState(() => read<Record<string, number[]>>('kg:changesHistory', {}))
  const best = read<Record<string, number>>('kg:changesBest', {})[key] ?? 0
  const live = useRef({ count: 0, cur: 0, first: true })
  const listener = useRef<ChromaListener | null>(null)
  const timer = useRef(0)
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  usePracticeTimer('changes', phase === 'run' || phase === 'count', true)
  const shapes = pair.map(sym => { const { root, suffix } = parseSymbol(sym); return chordShapes(root, suffix, inst)[0] ?? null })

  useEffect(() => () => { clearInterval(timer.current); listener.current?.stop(); void keepAwake(false) }, [])

  function change() {
    live.current.count++
    live.current.cur ^= 1
    setCount(live.current.count)
    setCur(live.current.cur)
  }

  async function begin() {
    clearInterval(timer.current)
    live.current = { count: 0, cur: 0, first: true }
    const pre = Math.max(3, getReadySecs())
    setCount(0); setCur(0); setLeft(SECONDS); setPre(pre); setMsg('')
    if (useMic) {
      try {
        const l = new ChromaListener()
        l.onChord = chroma => {
          if (phaseRef.current !== 'run') return
          const want = live.current.first ? live.current.cur : live.current.cur ^ 1
          if (chordMatch(chroma, tonesOf(pair[want])).ok) {
            if (live.current.first) { live.current.first = false; setMsg(`Heard ${pair[0]}. Now change!`) }
            else { change(); setMsg('') }
          }
        }
        await audio().resume()
        await l.start()
        listener.current = l
      } catch {
        setMsg(`Couldn't open the microphone. Allow it ${micWhere()}, or turn off "Count for me" and tap instead.`)
        return
      }
    }
    void keepAwake(true)
    setPhase('count')
    const ctx = audio()
    void ctx.resume()
    const t0 = ctx.currentTime + 0.1
    for (let i = 0; i < pre; i++) playClick(t0 + i, 'wood', 'beat', 0.8)
    playClick(t0 + pre, 'wood', 'accent', 1)
    let p = pre
    timer.current = window.setInterval(() => {
      p--
      setPre(p)
      if (p <= 0) {
        clearInterval(timer.current)
        setPhase('run')
        phaseRef.current = 'run'
        const end = Date.now() + SECONDS * 1000
        timer.current = window.setInterval(() => {
          const s = Math.max(0, Math.ceil((end - Date.now()) / 1000))
          setLeft(s)
          if (s <= 0) finish()
        }, 200)
      }
    }, 1000)
  }
  function finish() {
    clearInterval(timer.current)
    listener.current?.stop()
    listener.current = null
    void keepAwake(false)
    const n = live.current.count
    const ctx = audio()
    playClick(ctx.currentTime + 0.02, 'beep', 'accent', 0.8)
    const b = read<Record<string, number>>('kg:changesBest', {})
    if (n > (b[key] ?? 0)) { b[key] = n; write('kg:changesBest', b) }
    const h = read<Record<string, number[]>>('kg:changesHistory', {})
    h[key] = [...(h[key] ?? []), n].slice(-12)
    write('kg:changesHistory', h)
    setHist(h)
    logSkill('changes', n, key)
    bump('changesRounds')
    addXp(15)
    setPhase('done')
    phaseRef.current = 'done'
  }

  const past = hist[key] ?? []
  const away = isAway()
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={() => { clearInterval(timer.current); listener.current?.stop(); onExit() }}>← Back</button>
        <span className="small muted">Best for {pair.join(' ↔ ')}: <b>{best}</b></span>
      </div>
      <h1 style={{ margin: 0 }}>One-minute changes</h1>
      <p className="small muted" style={{ margin: 0 }}>
        Switch between two chords as many times as you can in 60 seconds. Count only clean changes. Do it every day and watch the number climb:
        this is the fastest way to make chord changes automatic.
      </p>
      {away && <p className="notice small">You're in away mode. This one needs your {inst.noun}, so save it for when you're home.</p>}
      <Chips label="Chord pair" items={pairs.map((p, i) => ({ id: i, label: p.join(' ↔ ') }))} value={pi % pairs.length} onChange={v => { setPi(v); setPhase('ready') }} />
      <Zoomable id="changes" max={2.2}>
      <div className="changes-chords">
        {pair.map((sym, i) => shapes[i] && (
          <ChordDiagram key={sym} name={sym} voicing={shapes[i]!} active={phase === 'run' && cur === i} size={1.05}
            onClick={() => strum(shapes[i]!.frets.map((f, s) => (f < 0 ? -1 : inst.midis[s] + f)).filter(m => m > 0))} />
        ))}
      </div>
      </Zoomable>
      <div className="row">
        <label className="row small" style={{ gap: 6 }}>
          <input type="checkbox" checked={useMic} onChange={e => setUseMic(e.target.checked)} disabled={phase === 'run' || phase === 'count'} />
          Count for me (listens for each chord)
        </label>
        {useMic && <InputPicker />}
      </div>
      {phase === 'ready' || phase === 'done' ? (
        <div className="stack" style={{ gap: 8 }}>
          {phase === 'done' && (
            <div className="result-card">
              <span className="readout big-num">{count}</span>
              <span>changes in a minute{count > 0 && count >= best ? ' · new best!' : ''}</span>
            </div>
          )}
          <button className="btn primary big" onClick={() => void begin()}>{phase === 'done' ? 'Go again' : 'Start the minute'}</button>
          {!useMic && <p className="small muted" style={{ margin: 0 }}>Tap the big button (or the space bar) every time you land the other chord cleanly.</p>}
        </div>
      ) : (
        <button className="tap-pad" onPointerDown={e => { e.preventDefault(); if (phase === 'run' && !useMic) change() }}
          onKeyDown={e => { if (e.key === ' ' && phase === 'run' && !useMic) { e.preventDefault(); change() } }} autoFocus>
          {phase === 'count' ? <span className="readout big-num">{pre}</span> : (
            <>
              <span className="readout big-num">{count}</span>
              <span className="small">{left}s left · {useMic && live.current.first ? <>strum <b>{pair[0]}</b> to begin</> : <>change to <b>{pair[cur ^ 1]}</b>{useMic ? '' : ', then tap'}</>}</span>
            </>
          )}
        </button>
      )}
      {msg && <p className="small" role="status">{msg}</p>}
      {past.length > 1 && (
        <div className="stack" style={{ gap: 4 }}>
          <span className="small muted">Your last {past.length} rounds</span>
          <div className="mini-bars" aria-label={`Recent scores ${past.join(', ')}`}>
            {past.map((n, i) => <span key={i} style={{ height: `${Math.max(6, (n / Math.max(...past, 1)) * 100)}%` }} title={String(n)} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// =====================================================================================
// Rhythm trainer: listen to a bar, then tap it back (or strum it), against the click
// =====================================================================================
/** negative numbers are rests (in beats) */
const RHYTHM_LEVELS: { id: number; title: string; tip: string; patterns: number[][] }[] = [
  { id: 1, title: 'Quarter and half notes', tip: 'Count 1 2 3 4 out loud. A half note lasts two beats.', patterns: [[1, 1, 1, 1], [2, 1, 1], [1, 1, 2], [2, 2], [1, 2, 1]] },
  { id: 2, title: 'Rests', tip: 'A rest is a silent beat: keep counting through it.', patterns: [[1, -1, 1, -1], [1, 1, -1, 1], [-1, 1, 1, 1], [1, -1, -1, 1], [-1, 1, -1, 1]] },
  { id: 3, title: 'Eighth notes', tip: 'Two even taps per beat: "1 and 2 and".', patterns: [[0.5, 0.5, 1, 1, 1], [1, 0.5, 0.5, 1, 1], [0.5, 0.5, 0.5, 0.5, 1, 1], [1, 1, 0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 1, 0.5, 0.5, 1]] },
  { id: 4, title: 'Off-beats', tip: 'Tap only on the "and"s. Feel the beat in your foot, tap between.', patterns: [[-0.5, 0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5], [1, -0.5, 0.5, 1, -0.5, 0.5], [0.5, 0.5, -0.5, 0.5, 1, 1], [-0.5, 0.5, 1, -0.5, 0.5, 1]] },
  { id: 5, title: 'Dotted rhythms', tip: 'A dotted quarter is one and a half beats: long, then a quick note.', patterns: [[1.5, 0.5, 1, 1], [1.5, 0.5, 1.5, 0.5], [3, 1], [1.5, 1.5, 1], [1, 1.5, 0.5, 1]] },
  { id: 6, title: 'Syncopation', tip: 'Accents that land between the beats: the push in funk and pop.', patterns: [[1, 0.5, 1, 0.5, 1], [0.5, 1, 1, 1, 0.5], [0.5, 1, 0.5, 0.5, 1, 0.5], [1, 0.5, 0.5, -0.5, 0.5, 1]] },
  { id: 7, title: 'Sixteenth notes', tip: 'Four per beat: "1 e and a". Keep them even.', patterns: [[0.25, 0.25, 0.25, 0.25, 1, 1, 1], [1, 0.25, 0.25, 0.5, 1, 1], [0.5, 0.25, 0.25, 0.5, 0.5, 1, 1], [0.75, 0.25, 0.75, 0.25, 1, 1]] },
  { id: 8, title: 'Triplets', tip: 'Three even notes in one beat: "1-trip-let".', patterns: [[1 / 3, 1 / 3, 1 / 3, 1, 1, 1], [1, 1 / 3, 1 / 3, 1 / 3, 1, 1], [1 / 3, 1 / 3, 1 / 3, 1 / 3, 1 / 3, 1 / 3, 2], [1, 1, 1 / 3, 1 / 3, 1 / 3, 1]] },
  { id: 9, title: 'Swing', tip: 'Long-short pairs, like a shuffle: "doo-ba doo-ba".', patterns: [[2 / 3, 1 / 3, 2 / 3, 1 / 3, 1, 1], [1, 2 / 3, 1 / 3, 1, 2 / 3, 1 / 3], [2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3, 2 / 3, 1 / 3]] },
]
const ROUND = 4

interface BarResult { score: number; errs: number[]; extra: number; taps: number[]; onsets: number[] }

function onsetsOf(p: number[]) {
  const out: number[] = []
  let x = 0
  for (const d of p) { if (d > 0) out.push(x); x += Math.abs(d) }
  return out
}
function heardTime(evTs: number) {
  const ctx = audio() as AudioContext & { outputLatency?: number }
  const ts = ctx.getOutputTimestamp?.()
  if (ts?.contextTime && ts.performanceTime) return ts.contextTime + (evTs - ts.performanceTime) / 1000
  return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0)
}
/** Score one bar of taps against its onsets (times in beats). */
export function scoreBar(onsets: number[], taps: number[], spb: number, slackMs = 0): BarResult {
  const used = new Set<number>()
  const errs: number[] = []
  let pts = 0
  for (const o of onsets) {
    let bi = -1, bd = Infinity
    taps.forEach((t, i) => { if (!used.has(i) && Math.abs(t - o) < bd) { bd = Math.abs(t - o); bi = i } })
    const ms = bi >= 0 ? (taps[bi] - o) * spb * 1000 : Infinity
    if (bi >= 0 && Math.abs(ms) <= 160 + slackMs) {
      used.add(bi)
      errs.push(ms)
      const a = Math.abs(ms)
      pts += a <= 45 + slackMs ? 1 : a <= 90 + slackMs ? 0.75 : 0.4
    }
  }
  const extra = taps.length - used.size
  const score = Math.max(0, (pts - extra * 0.25) / Math.max(1, onsets.length))
  return { score, errs, extra, taps, onsets }
}

export function RhythmTrainer({ onExit }: { onExit: () => void }) {
  const [levelId, setLevelId] = usePersist('rhythmLevel', 1)
  const [best, setBest] = usePersist('rhythmBest', 0)
  const [bpm, setBpm] = usePersist('rhythmBpm', 72)
  const [useMic, setUseMic] = usePersist('rhythmMic', false)
  const [offset, setOffset] = usePersist('tapOffsetMs', 0)
  const level = RHYTHM_LEVELS.find(l => l.id === levelId) ?? RHYTHM_LEVELS[0]
  const [running, setRunning] = useState(false)
  const [patterns, setPatterns] = useState<number[][]>([])
  const [bar, setBar] = useState(-1) // -1 count-in, then per rhythm: listen, a count-in for you, your turn (3 bars)
  const [beat, setBeat] = useState(0)
  const [results, setResults] = useState<BarResult[]>([])
  const [done, setDone] = useState<null | { pct: number; mean: number }>(null)
  const st = useRef({ t0: 0, spb: 1, taps: [] as number[], results: [] as BarResult[], scored: -1 })
  const raf = useRef(0)
  const mic = useRef<NoteListener | null>(null)
  usePracticeTimer('rhythm', running, useMic)
  useEffect(() => () => { cancelAnimationFrame(raf.current); mic.current?.stop() }, [])

  const latMs = () => (useMic ? latencyMs(kindOf(mic.current?.external)) : 0) + offset

  function addTap(heard: number) {
    const s = st.current
    s.taps.push(heard - latMs() / 1000)
  }

  const ready = useGetReady()
  async function start() {
    cancelAnimationFrame(raf.current)
    const pool = [...level.patterns].sort(() => Math.random() - 0.5)
    const pats = Array.from({ length: ROUND }, (_, i) => pool[i % pool.length])
    setPatterns(pats)
    setResults([])
    setDone(null)
    if (useMic && !mic.current) {
      try {
        const l = new NoteListener()
        l.onOnset = t => addTap(t)
        await l.start()
        mic.current = l
      } catch {
        setUseMic(false)
      }
    }
    const ctx = audio()
    await ctx.resume()
    const spb = 60 / bpm
    const t0 = ctx.currentTime + 0.2
    st.current = { t0, spb, taps: [], results: [], scored: -1 }
    const bars = 1 + ROUND * 3
    for (let b = 0; b < bars; b++) {
      // every rhythm: a bar to listen, a bar counting you in (louder clicks: "1, 2, 3, 4"), then your bar
      const phase = b === 0 ? -1 : (b - 1) % 3
      for (let k = 0; k < 4; k++) playClick(t0 + (b * 4 + k) * spb, 'wood', k === 0 || phase === 1 ? 'accent' : 'beat', b === 0 || phase === 1 ? 0.85 : 0.5)
      if (phase === 0) for (const o of onsetsOf(pats[Math.floor((b - 1) / 3)])) playNote(57, t0 + (b * 4 + o) * spb, 0.85)
    }
    setRunning(true)
    void keepAwake(true)
    const tick = () => {
      const s = st.current
      const pos = (ctx.currentTime - s.t0) / s.spb // in beats
      const b = Math.floor(pos / 4)
      setBar(b - 1)
      setBeat(Math.max(0, pos % 4))
      // score each "your turn" bar a moment after it ends
      for (let r = 0; r < ROUND; r++) {
        const yourBar = 3 + r * 3
        if (s.scored < r && pos > (yourBar + 1) * 4 + 0.35) {
          const startBeat = yourBar * 4
          const taps = s.taps.map(t => (t - s.t0) / s.spb - startBeat).filter(x => x > -0.4 && x < 4.35)
          const res = scoreBar(onsetsOf(pats[r]), taps, s.spb, useMic ? 30 : 0)
          s.results.push(res)
          s.scored = r
          setResults([...s.results])
        }
      }
      if (b >= bars && s.scored >= ROUND - 1) { finish(); return }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }

  function finish() {
    setRunning(false)
    void keepAwake(false)
    const rs = st.current.results
    const pct = Math.round((rs.reduce((a, r) => a + r.score, 0) / rs.length) * 100)
    const errs = rs.flatMap(r => r.errs)
    const mean = errs.length ? Math.round(errs.reduce((a, b) => a + b, 0) / errs.length) : 0
    setDone({ pct, mean })
    logSkill('rhythm', pct)
    bump('rhythmRounds')
    if (pct >= 80) {
      bump('rhythm80')
      if (level.id > best) setBest(level.id)
    }
    addXp(10)
  }
  function stop() {
    cancelAnimationFrame(raf.current)
    setRunning(false)
    void keepAwake(false)
  }

  const phase = running && bar >= 0 ? bar % 3 : -1
  const turn = phase === 2
  const counting = phase === 1
  const pi = running && bar >= 0 ? Math.min(ROUND - 1, Math.floor(bar / 3)) : 0
  const showPat = patterns[pi] ?? level.patterns[0]
  const lastRes = results[results.length - 1]

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={() => { stop(); mic.current?.stop(); onExit() }}>← Back</button>
        <span className="small muted">Level {level.id} of {RHYTHM_LEVELS.length}</span>
      </div>
      <h1 style={{ margin: 0 }}>Rhythm trainer</h1>
      <p className="small muted" style={{ margin: 0 }}>
        Listen to one bar, then a bar counts you in (1, 2, 3, 4), then tap it back while the click keeps going. Four rhythms per round. Score 80% to unlock the next level.
      </p>
      <div className="ear-levels" role="group" aria-label="Level">
        {RHYTHM_LEVELS.map(l => (
          <button key={l.id} className={`ear-level${l.id === levelId ? ' on' : ''}`} onClick={() => setLevelId(l.id)} disabled={running || (l.id > best + 1 && l.id > 1)}>
            <span className="lvl">{l.id}</span>{l.title}{l.id <= best && <span className="small"> ✓</span>}
          </button>
        ))}
      </div>
      <p className="small" style={{ margin: 0 }}>{level.tip}</p>
      <div className="row">
        <Chips label="Tempo" items={[60, 72, 90, 110].map(b => ({ id: b, label: `${b} BPM` }))} value={bpm} onChange={v => !running && setBpm(v)} />
      </div>
      <label className="row small" style={{ gap: 6 }}>
        <input type="checkbox" checked={useMic} onChange={e => setUseMic(e.target.checked)} disabled={running} />
        Strum it instead of tapping (the mic hears each strum)
      </label>

      <div className={`rhythm-stage${turn ? ' turn' : ''}`}>
        <div className="small rhythm-status">
          {!running ? 'Ready' : bar < 0 ? `Count-in: ${Math.floor(beat) + 1}` : turn ? `Your turn (${pi + 1}/${ROUND})` : counting ? `Get ready… ${Math.floor(beat) + 1}` : `Listen (${pi + 1}/${ROUND})`}
        </div>
        <div className="rhythm-strip big" aria-hidden>
          {showPat.map((d, i) => <span key={i} className={d < 0 ? 'rest' : ''} style={{ flexGrow: Math.abs(d) }} />)}
          {running && bar >= 0 && <i className="rhythm-head" style={{ left: `${(beat / 4) * 100}%` }} />}
          {!running && lastRes && lastRes.taps.map((t, i) => <b key={i} className="rhythm-tap" style={{ left: `${Math.max(0, Math.min(100, (t / 4) * 100))}%` }} />)}
        </div>
        <div className="rhythm-beats" aria-hidden>{[1, 2, 3, 4].map(n => <span key={n}>{n}</span>)}</div>
      </div>

      {running ? (
        <div className="stack" style={{ gap: 8 }}>
          {!useMic && (
            <button className={`tap-pad${turn ? ' live' : ''}`} onPointerDown={e => { e.preventDefault(); addTap(heardTime(e.timeStamp)) }}
              onKeyDown={e => { if (e.key === ' ' && !e.repeat) { e.preventDefault(); addTap(heardTime(e.timeStamp)) } }} autoFocus>
              <span className="readout">{turn ? 'Tap!' : counting ? `${Math.floor(beat) + 1}…` : 'Listen…'}</span>
            </button>
          )}
          <button className="btn" onClick={stop}>Stop</button>
        </div>
      ) : (
        <button className="btn primary big" onClick={() => ready.start(() => void start())}>{done ? 'Go again' : 'Start'}</button>
      )}
      {ready.overlay}

      {results.length > 0 && (
        <div className="row small">
          {results.map((r, i) => <span key={i} className={`score-pill${r.score >= 0.8 ? ' ok' : r.score >= 0.5 ? '' : ' bad'}`}>{Math.round(r.score * 100)}%</span>)}
        </div>
      )}
      {done && (
        <div className="result-card">
          <span className="readout big-num">{done.pct}%</span>
          <span>
            {done.pct >= 80 ? 'Locked in! ' : done.pct >= 50 ? 'Getting there. ' : 'Slow it down and count out loud. '}
            {Math.abs(done.mean) >= 25 ? (done.mean > 0 ? `You tend to be late by about ${done.mean} ms.` : `You tend to rush, about ${-done.mean} ms early.`) : 'Your timing is centred on the beat.'}
          </span>
          {Math.abs(done.mean) >= 60 && (
            <p className="small muted" style={{ margin: 0 }}>
              Always late by the same amount? Bluetooth headphones add a delay.{' '}
              <button className="btn sm" onClick={() => setOffset(o => o + done.mean)}>Fix my timing ({done.mean > 0 ? '−' : '+'}{Math.abs(done.mean)} ms)</button>
            </p>
          )}
        </div>
      )}
      {offset !== 0 && <p className="small muted" style={{ margin: 0 }}>Timing fix: {offset} ms. <button className="btn sm ghost" onClick={() => setOffset(0)}>Reset</button></p>}
    </div>
  )
}

// =====================================================================================
// Circle of fifths explorer
// =====================================================================================
const MAJOR_DEG: [number, string, string][] = [[0, 'I', ''], [2, 'ii', 'm'], [4, 'iii', 'm'], [5, 'IV', ''], [7, 'V', ''], [9, 'vi', 'm'], [11, 'vii°', 'dim']]
const MINOR_DEG: [number, string, string][] = [[0, 'i', 'm'], [2, 'ii°', 'dim'], [3, 'III', ''], [5, 'iv', 'm'], [7, 'v', 'm'], [8, 'VI', ''], [10, 'VII', '']]

export function CircleTool({ onExit, onQuiz }: { onExit: () => void; onQuiz: (id: string) => void }) {
  const [tonic, setTonic] = usePersist('circleTonic', 'C')
  const [minor, setMinor] = usePersist('circleMinor', false)
  const [active, setActive] = useState<{ root: string; minor: boolean; dim?: boolean } | null>(null)
  usePracticeTimer('circle', true, false)
  const flats = keyPrefersFlats(tonic, minor)
  const names = flats ? FLATS : SHARPS
  const t = pc(tonic)
  const chords = useMemo(() => (minor ? MINOR_DEG : MAJOR_DEG).map(([iv, roman, q]) => ({ root: names[(t + iv) % 12], q, roman })), [t, minor, names])
  const rel = minor ? names[(t + 3) % 12] : names[(t + 9) % 12] + 'm'
  const idx = CIRCLE_MAJOR.findIndex(k => pc(k) === (minor ? (t + 3) % 12 : t))
  const nb = [CIRCLE_MAJOR[(idx + 11) % 12], CIRCLE_MAJOR[(idx + 1) % 12]]
  function sound(root: string, q: string, when = 0) {
    const r = 48 + pc(root)
    const third = q === 'm' || q === 'dim' ? 3 : 4
    const fifth = q === 'dim' ? 6 : 7
    strum([r, r + third, r + fifth, r + 12], when)
  }
  function cadence() {
    const ctx = audio()
    void ctx.resume()
    const t0 = ctx.currentTime + 0.05
    const seq = minor ? [0, 3, 4, 0] : [0, 3, 4, 0]
    seq.forEach((d, i) => {
      const c = chords[d]
      const q = minor && d === 4 ? '' : c.q // harmonic-minor V for a stronger pull home
      setTimeout(() => setActive({ root: c.root, minor: q === 'm', dim: q === 'dim' }), i * 800 + 50)
      sound(c.root, q, t0 + i * 0.8)
    })
    setTimeout(() => setActive(null), seq.length * 800 + 400)
  }
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← Back</button>
        <button className="btn sm" onClick={() => onQuiz('cof-neighbours')}>Quiz me</button>
      </div>
      <h1 style={{ margin: 0 }}>Circle of fifths</h1>
      <p className="small muted" style={{ margin: 0 }}>
        Tap any key on the circle. The highlighted slice holds its six main chords: home in the middle, IV on the left, V on the right,
        and the three minor chords just inside them. Neighbouring keys share all but one note.
      </p>
      <div className="split">
        <div className="cof-wrap">
          <CircleOfFifths tonic={tonic} minor={minor} active={active} size={340}
            onPick={(root, m) => { setTonic(root); setMinor(m); sound(root, m ? 'm' : '') }} />
        </div>
        <div className="stack" style={{ gap: 10 }}>
          <div className="panel stack" style={{ gap: 6 }}>
            <h2 style={{ margin: 0 }}>{tonic} {minor ? 'minor' : 'major'}</h2>
            <p className="small" style={{ margin: 0 }}>Key signature: <b>{keySignature(tonic, minor)}</b>. Relative {minor ? 'major' : 'minor'}: <b>{rel}</b>. Neighbour keys: <b>{nb[0]}</b> and <b>{nb[1]}</b>{minor ? ' (major)' : ''}.</p>
            <div className="circle-chords">
              {chords.map(c => (
                <button key={c.roman} className="prog-chip" onClick={() => { sound(c.root, c.q); setActive({ root: c.root, minor: c.q === 'm', dim: c.q === 'dim' }) }}>
                  <span>{c.root}{c.q === 'dim' ? '°' : c.q}</span><small>{c.roman}</small>
                </button>
              ))}
            </div>
            <div className="row">
              <button className="btn sm" onClick={cadence}>▶ Hear {minor ? 'i–iv–V–i' : 'I–IV–V–I'}</button>
              <button className="btn sm" onClick={() => setMinor(!minor)}>Switch to {minor ? `${names[(t + 3) % 12]} major` : `${names[(t + 9) % 12]} minor`}</button>
            </div>
          </div>
          <div className="panel stack" style={{ gap: 6 }}>
            <h3 style={{ margin: 0 }}>Practise it</h3>
            <div className="row">
              <button className="btn sm" onClick={() => onQuiz('cof-sig')}>Key signatures</button>
              <button className="btn sm" onClick={() => onQuiz('cof-neighbours')}>IV and V</button>
              <button className="btn sm" onClick={() => onQuiz('cof-relative')}>Relative keys</button>
              <button className="btn sm" onClick={() => onQuiz('cof-chords')}>Chords in a key</button>
            </div>
            <p className="small muted" style={{ margin: 0 }}>
              Musical use: when a song is in {tonic}{minor ? 'm' : ''}, the chords above are your safe bets, and going one step counter-clockwise
              (like {chords[4].root} to {chords[0].root}) is the strongest move home.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


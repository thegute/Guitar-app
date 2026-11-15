// Call and response: listen to a short phrase, play it back on the guitar. The mic checks each note; a wrong one says
// what you played and what it was. Hear it again (slower if you like), or Show me to see it on the neck.
import { useEffect, useRef, useState } from 'react'
import type { Instrument } from '../instrument'
import { Chips, usePersist } from '../components/Controls'
import { Fretboard, type Mark as FMark } from '../components/Fretboard'
import { acquireListener, type ListenerSession } from '../engine/listener'
import { audio, keepAwake } from '../audio/engine'
import { playNote } from '../audio/pluck'
import { CR_LEVELS, compare, makePhrase, roundStars, type Mark, type Phrase } from './callPhrases'
import { pcLabel } from './targets'
import { bumpCounts, recordItem, setStars, usePracticeTimer } from './progress'
import { countUse } from '../usage'

const KEYS = ['A', 'E', 'G', 'C', 'D']
const ROUND = 8

export function CallResponse({ inst, onExit }: { inst: Instrument; onExit: () => void }) {
  const [levelId, setLevelId] = usePersist('cr:level', 1)
  const [key, setKey] = usePersist('cr:key', 'A')
  const [bpm, setBpm] = usePersist('cr:bpm', 80)
  const [anyOct, setAnyOct] = usePersist('cr:anyOct', true)
  const level = CR_LEVELS.find(l => l.id === levelId) ?? CR_LEVELS[0]
  const tuning = inst.midis.length === 6 ? inst.midis : [40, 45, 50, 55, 59, 64]
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6))
  const [q, setQ] = useState(0)
  const [right, setRight] = useState(0)
  const [phrase, setPhrase] = useState<Phrase>(() => makePhrase(level, key, seed, tuning))
  const [got, setGot] = useState<number[]>([])
  const [marks, setMarks] = useState<Mark[] | null>(null)
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  const [listening, setListening] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const tries = useRef(0)
  const tracker = useRef<ListenerSession | null>(null)
  const gotRef = useRef<number[]>([])
  const quietT = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playingUntil = useRef(0)
  usePracticeTimer('ear', listening, true)
  // the mic callback is made once: it reads the phrase and the answer state through these
  const phraseRef = useRef(phrase); phraseRef.current = phrase
  const marksRef = useRef(marks); marksRef.current = marks
  const heardRef = useRef<(m: number) => void>(() => {})

  useEffect(() => () => { tracker.current?.stop(); void keepAwake(false); if (quietT.current) clearTimeout(quietT.current) }, [])
  // keep the isolated listener's strictOctave setting in sync with the Exact octave toggle
  useEffect(() => { if (tracker.current) tracker.current.strictOctave = !anyOct }, [anyOct])
  // a new level or key: a new round
  useEffect(() => { newRound() }, [levelId, key]) // eslint-disable-line react-hooks/exhaustive-deps

  function syncExpected(p = phraseRef.current, idx = gotRef.current.length) {
    const now = p.notes[idx] !== undefined ? [p.notes[idx]] : []
    const nxt = p.notes[idx + 1] !== undefined ? [p.notes[idx + 1]] : []
    tracker.current?.expect(now, nxt)
  }

  function newRound() {
    const s = Math.floor(Math.random() * 1e6)
    setSeed(s); setQ(0); setRight(0); setDone(false)
    next(s, 0)
  }
  function next(s = seed, qi = q) {
    const p = makePhrase(level, key, s + qi * 7919, tuning)
    setPhrase(p); setGot([]); gotRef.current = []; setMarks(null); setMsg(''); setShow(false); tries.current = 0
    syncExpected(p, 0)
  }

  /** play the phrase (home first, softly, on the first try) */
  function play(p = phrase, withHome = tries.current === 0) {
    const ctx = audio(); void ctx.resume()
    const spb = 60 / bpm
    let t = ctx.currentTime + 0.1
    if (withHome && p.root) { playNote(p.root, t, 0.45); t += spb * 1.5 }
    p.notes.forEach((m, i) => { playNote(m, t, 0.85); t += p.durs[i] * spb })
    playingUntil.current = t
    gotRef.current = []; setGot([]); setMarks(null); setMsg('')
    syncExpected(p, 0)
    void listen()
  }

  async function listen() {
    if (tracker.current) { setListening(true); syncExpected(); return }
    setErr('')
    try {
      const pt = acquireListener('call-response', { strictOctave: !anyOct, autoGate: true, suppressBleed: true })
      pt.onNote = e => {
        // ignore KGuitar's own phrase while it plays
        if (audio().currentTime < playingUntil.current + 0.15) return
        heardRef.current(e.midi)
      }
      await pt.start()
      tracker.current = pt
      syncExpected()
      setListening(true)
      void keepAwake(true)
    } catch {
      setErr('Playing it back needs the microphone (or your USB amp): allow it for KGuitar. You can still listen and use Show me.')
    }
  }
  function heard(m: number) {
    if (marksRef.current) return
    gotRef.current = [...gotRef.current, m]
    setGot(gotRef.current)
    syncExpected(phraseRef.current, gotRef.current.length)
    if (quietT.current) clearTimeout(quietT.current)
    if (gotRef.current.length >= phraseRef.current.notes.length) check()
    else quietT.current = setTimeout(check, 3000)
  }
  heardRef.current = heard
  // browser tests play notes straight in
  if ((window as { __kgTest?: boolean }).__kgTest) (window as unknown as { __crHear: (m: number) => void; __crPhrase: () => Phrase }).__crHear = heard
  if ((window as { __kgTest?: boolean }).__kgTest) (window as unknown as { __crPhrase: () => Phrase }).__crPhrase = () => phrase

  function check() {
    if (quietT.current) clearTimeout(quietT.current)
    const c = compare(phraseRef.current, gotRef.current, anyOct)
    marksRef.current = c.marks
    setMarks(c.marks)
    tries.current++
    if (c.ok) {
      setMsg(tries.current === 1 ? 'Yes! First time.' : 'Got it.')
      if (tries.current === 1) { setRight(r => r + 1); bumpCounts({ earPhrases: 1 }) }
      recordItem(`cr:${level.id}`, tries.current === 1, 0)
    } else if (c.first) {
      const w = pcLabel(c.first.want), g = c.first.got !== undefined ? pcLabel(c.first.got) : ''
      setMsg(c.first.got === undefined ? `Note ${c.first.i + 1} is missing: it was ${w}.` : g === w ? `Note ${c.first.i + 1}: right note, wrong octave (${c.first.got! > c.first.want ? 'too high' : 'too low'}).` : `Note ${c.first.i + 1}: you played ${g}, it was ${w}${c.first.got! > c.first.want ? ', lower than that' : ', higher than that'}. Hear it again and try once more.`)
      if (tries.current === 1) recordItem(`cr:${level.id}`, false, 0)
    }
  }
  function advance() {
    const qi = q + 1
    if (qi >= ROUND) {
      setDone(true)
      const st = roundStars(right, ROUND)
      if (st > 0) setStars(`cr-${level.id}`, st)
      countUse('learn:call-response-round')
      return
    }
    setQ(qi); next(seed, qi)
  }

  const markFor = (midi: number, _s: number, fret: number): FMark | null => {
    const span = phrase.lick ? 5 : 3
    if (fret < phrase.from || fret > phrase.from + span) return null
    const idx = phrase.notes.indexOf(midi)
    if (show && idx >= 0) return { label: String(idx + 1), role: idx === 0 ? 'target' : 'pass' }
    if (midi % 12 === phrase.root % 12) return { label: 'R', role: 'root' }
    return null
  }

  return (
    <div className="stack call-response" style={{ gap: 12 }} data-testid="call-response">
      <div className="row"><button className="btn sm" onClick={onExit}>← Back</button><h2 style={{ margin: 0 }}>Call and response</h2></div>
      <div className="panel stack" style={{ gap: 10 }}>
        <Chips label="Level" items={CR_LEVELS.map(l => ({ id: l.id, label: `${l.id}. ${l.title}` }))} value={levelId} onChange={setLevelId} wrap />
        <p className="small" style={{ margin: 0 }}>{level.tip}</p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {level.scale !== 'lick' && <Chips label="Key" items={KEYS.map(k => ({ id: k, label: k }))} value={key} onChange={setKey} />}
          <span className="small">Speed</span>
          <button className="btn sm" aria-label="Slower" data-testid="cr-slower" onClick={() => setBpm(b => Math.max(40, b - 10))}>−</button>
          <b data-testid="cr-bpm">{bpm} BPM</b>
          <button className="btn sm" aria-label="Faster" onClick={() => setBpm(b => Math.min(180, b + 10))}>+</button>
          <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={!anyOct} onChange={e => setAnyOct(!e.target.checked)} /> Exact octave</label>
        </div>
      </div>
      {err && <p className="notice small">{err}</p>}
      <div className="panel stack cr-now" style={{ gap: 10 }} aria-live="polite">
        {done ? (
          <>
            <b>Round done: {right} of {ROUND} first time.</b>
            <p className="small" style={{ margin: 0 }}>{right >= 6 && levelId < CR_LEVELS.length ? `Ready for level ${levelId + 1}.` : right < 4 ? 'Slow it down and try this level again: speed comes after the ear.' : 'Another round at this level, then move up.'}</p>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn primary" onClick={newRound}>Again</button>
              {right >= 6 && levelId < CR_LEVELS.length && <button className="btn" onClick={() => setLevelId(levelId + 1)}>Level {levelId + 1}</button>}
            </div>
          </>
        ) : (
          <>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="small muted">Phrase {q + 1} of {ROUND} · {right} right</span>{phrase.lick && marks && <span className="small muted">{phrase.lick}</span>}</div>
            <div className="cr-dots" data-testid="cr-dots">
              {phrase.notes.map((m, i) => <span key={i} className={`cr-dot${marks ? ' ' + marks[i] : i < got.length ? ' heard' : ''}`}>{marks || show ? pcLabel(m) : i < got.length ? pcLabel(got[i]) : '·'}</span>)}
            </div>
            {msg && <p className="cr-msg" data-testid="cr-msg">{msg}</p>}
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button className="btn primary" data-testid="cr-play" onClick={() => play()}>{tries.current || got.length ? '▶ Hear it again' : '▶ Listen'}</button>
              {listening && !marks && got.length > 0 && <button className="btn" onClick={check}>Check</button>}
              <button className="btn" onClick={() => setShow(s => !s)}>{show ? 'Hide' : 'Show me'}</button>
              {marks && <button className="btn primary" data-testid="cr-next" onClick={advance}>Next</button>}
            </div>
            {listening && !marks && <p className="small muted" style={{ margin: 0 }}>Listening: play it back.</p>}
          </>
        )}
      </div>
      <div className="panel">
        <Fretboard tuning={tuning} fromFret={Math.max(0, phrase.from - 1)} toFret={phrase.from + (phrase.lick ? 6 : 4)} markFor={markFor} zoomId="cr" />
        <p className="small muted" style={{ margin: '6px 0 0' }}>R = home. {show ? 'The numbers are the phrase, in order.' : 'Show me numbers the phrase on the neck.'}</p>
      </div>
    </div>
  )
}

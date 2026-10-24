// Runs one quiz: questions picked by what you know least, answered by tapping or by playing (mic),
// with instant feedback, a combo counter and stars at the end.
import { PsyDog } from '../components/PsyArt'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Fretboard, type Mark as FMark } from '../components/Fretboard'
import { ChordDiagram } from '../components/ChordDiagram'
import { usePersist } from '../components/Controls'
import { InputPicker } from '../components/InputPicker'
import { playNote, strum } from '../audio/pluck'
import { audio } from '../audio/engine'
import { NoteListener } from '../tabs/follow'
import { ChromaListener, chordMatch } from '../audio/chroma'
import { FLATS, SHARPS } from '../theory/notes'
import { stringName, type Instrument } from '../instrument'
import type { Answer, Question, QuizDef } from './quiz'
import { bump, itemStats, itemWeight, recordItem, setStars, todayLog, usePracticeTimer, isAway } from './progress'
import { bumpCombo } from './game'
import { Zoomable } from '../components/Zoomable'

const NAT = [0, 2, 4, 5, 7, 9, 11]
const label = (p: number) => (SHARPS[p] === FLATS[p] ? SHARPS[p] : `${SHARPS[p]}/${FLATS[p]}`)

interface Props {
  quiz: QuizDef & { title: string; desc: string }
  inst: Instrument
  onExit: () => void
}

export function QuizRunner({ quiz, inst, onExit }: Props) {
  const [mode, setMode] = usePersist<'tap' | 'play'>('quizMode', 'tap')
  const playMode = mode === 'play' && quiz.mic && !isAway()
  const items = useMemo(() => quiz.items(inst), [quiz, inst])
  const [n, setN] = useState(0)
  const [q, setQ] = useState<Question | null>(null)
  const [result, setResult] = useState<null | { ok: boolean; heard?: string }>(null)
  const [picked, setPicked] = useState<{ s: number; f: number }[]>([])
  const [spell, setSpell] = useState<number[]>([])
  const [combo, setCombo] = useState(0)
  const [right, setRight] = useState(0)
  const [times, setTimes] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const [micMsg, setMicMsg] = useState('')
  const [micInput, setMicInput] = useState<{ label: string; external: boolean } | null>(null)
  // a tap on a string the question doesn't use: say which string to use instead of doing nothing
  const [neckHint, setNeckHint] = useState('')
  const shownAt = useRef(0)
  const lastItem = useRef('')
  const xpStart = useRef(todayLog().xp ?? 0)
  const triedWrong = useRef(false)
  const qRef = useRef<Question | null>(null)
  qRef.current = q
  const live = useRef({ combo: 0, answered: false, n: 0 })
  live.current.combo = combo
  live.current.n = n
  usePracticeTimer('quiz', !done, playMode)

  function next() {
    const stats = itemStats()
    const pool = items.filter(i => i !== lastItem.current)
    const weights = pool.map(i => itemWeight(i, stats))
    let r = Math.random() * weights.reduce((a, b) => a + b, 0)
    let item = pool[0]
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) { item = pool[i]; break } }
    lastItem.current = item
    const question = quiz.make(item, inst, Math.random)
    setQ(question)
    setResult(null)
    setPicked([])
    setSpell([])
    setMicMsg('')
    setNeckHint('')
    triedWrong.current = false
    live.current.answered = false
    shownAt.current = performance.now()
    if (question.audio) setTimeout(() => playAudio(question), 250)
  }
  useEffect(() => { next() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function playAudio(question = q) {
    if (!question?.audio) return
    const ctx = audio()
    void ctx.resume()
    let t = ctx.currentTime + 0.05
    if (question.audio.seq) { question.audio.seq.forEach((m, i) => playNote(m, t + i * 0.42, 0.75)); t += question.audio.seq.length * 0.42 + 0.2 }
    if (question.audio.chord) strum(question.audio.chord, t, { spread: 0.03, gain: 0.7 })
  }

  function answer(a: Answer, heard?: string) {
    if (!q || result) return
    const ok = q.check(a)
    finish(ok, heard)
  }
  function finish(ok: boolean, heard?: string) {
    const cur = qRef.current
    if (!cur || live.current.answered) return
    live.current.answered = true
    const combo = live.current.combo
    const n = live.current.n
    const ms = performance.now() - shownAt.current
    const firstTry = ok && !triedWrong.current
    recordItem(cur.item, firstTry, ms, combo)
    const c = firstTry ? combo + 1 : 0
    setCombo(c)
    bumpCombo(c)
    if (firstTry) { setRight(r => r + 1); setTimes(t => [...t, ms]) }
    setResult({ ok, heard })
    if (ok) {
      const ctx = audio()
      playNote(84, ctx.currentTime + 0.01, 0.25)
      playNote(91, ctx.currentTime + 0.09, 0.25)
    }
    const last = n + 1 >= quiz.length
    if (ok) setTimeout(() => (last ? end() : advance()), 1100)
  }
  function advance() {
    setN(x => x + 1)
    next()
  }
  function end() {
    setDone(true)
  }

  // tell the listener which notes would be right, so it checks for them first
  const notesRef = useRef<NoteListener | null>(null)
  useEffect(() => {
    const mic = q?.mic
    if (!notesRef.current || !mic || mic.kind !== 'note') return
    const right: number[] = []
    for (let m = 36; m <= 96; m++) if (mic.ok(m)) right.push(m)
    notesRef.current.expect(right.length <= 12 ? right : [])
  })

  // mic mode
  useEffect(() => {
    if (!playMode || done) return
    let stopped = false
    const notes = new NoteListener()
    notesRef.current = notes
    const chords = new ChromaListener()
    const onWrong = (what: string) => {
      triedWrong.current = true
      setMicMsg(`Heard ${what}. Try again`)
    }
    notes.onNote = e => {
      const cur = qRef.current
      if (!cur?.mic || cur.mic.kind !== 'note' || stopped) return
      if (cur.mic.ok(e.midi)) finish(true, label(e.midi % 12))
      else onWrong(label(e.midi % 12))
    }
    chords.onChord = chroma => {
      const cur = qRef.current
      if (!cur?.mic || cur.mic.kind !== 'chord' || stopped) return
      if (chordMatch(chroma, cur.mic.tones).ok) finish(true)
      else {
        const top = chroma.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v).slice(0, 3).map(x => SHARPS[x.i])
        onWrong(`mostly ${top.join(', ')}`)
      }
    }
    const kind = q?.mic?.kind
    void (async () => {
      try {
        if (kind === 'chord') await chords.start()
        else await notes.start()
        const inp = (kind === 'chord' ? chords.input : notes.input)
        setMicInput(inp ? { label: inp.label, external: inp.external } : null)
      } catch {
        setMicMsg('Microphone access is needed for play mode. Switch to tap mode, or allow the mic in your phone settings.')
      }
    })()
    return () => { stopped = true; notes.stop(); chords.stop(); notesRef.current = null }
    // restart listeners when the kind of answer changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playMode, done, q?.mic?.kind])

  // ---------- end screen ----------
  if (done) {
    const pct = Math.round((right / quiz.length) * 100)
    const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 9999
    const stars = pct >= 90 && avg < 6000 ? 3 : pct >= 80 ? 2 : pct >= 60 ? 1 : 0
    return <QuizEnd quiz={quiz} pct={pct} stars={stars} played={playMode} xp={(todayLog().xp ?? 0) - xpStart.current} onAgain={() => { setN(0); setRight(0); setTimes([]); setCombo(0); setDone(false); xpStart.current = todayLog().xp ?? 0; next() }} onExit={onExit} />
  }
  if (!q) return null
  if ((window as unknown as { __kgTest?: boolean }).__kgTest) (window as unknown as { __kgQuestion?: Question }).__kgQuestion = q

  const reveal = result ? q.reveal ?? [] : []
  const neckInput = q.input.type === 'neck' ? q.input : null
  const markFor = (_m: number, s: number, f: number): FMark | null => {
    const pickedHere = picked.find(p => p.s === s && p.f === f)
    const shown = q.neck?.marks.find(m => m.s === s && m.f === f)
    const rev = reveal.find(m => m.s === s && m.f === f)
    if (result && rev) return { label: rev.label, role: rev.role }
    if (pickedHere) return { label: SHARPS[(inst.midis[s] + f) % 12], role: result ? (result.ok ? 'live' : 'root') : 'chord' }
    if (shown) return { label: shown.label, role: shown.role }
    return null
  }
  const onNeckTap = (_m: number, s: number, f: number) => {
    if (result || !neckInput || playMode) return
    if (neckInput.strings && !neckInput.strings.includes(s)) {
      const names = neckInput.strings.map(x => stringName(inst.midis, x))
      // the neck is drawn with the first string at the bottom and the last at the top
      const one = neckInput.strings.length === 1 ? neckInput.strings[0] : -1
      const where = one === 0 ? ': the bottom line of the neck' : one === inst.midis.length - 1 ? ': the top line of the neck' : ''
      setNeckHint(`That's the ${stringName(inst.midis, s)} string. Tap on the ${names.join(', ')} string${names.length > 1 ? 's' : ''}${where}.`)
      return
    }
    setNeckHint('')
    if (picked.some(p => p.s === s && p.f === f)) { setPicked(picked.filter(p => !(p.s === s && p.f === f))); return }
    // one note per string when finding triads
    const next = neckInput.strings && neckInput.count > 1 ? [...picked.filter(p => p.s !== s), { s, f }] : [...picked, { s, f }]
    setPicked(next)
    if (neckInput.count === 1) answer({ pos: { s, f } })
    else if (next.length === neckInput.count) answer({ positions: next })
  }

  return (
    <div className="stack quiz">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={onExit}>← Back</button>
        <div className="quiz-progress" aria-label={`Question ${n + 1} of ${quiz.length}`}>
          {Array.from({ length: quiz.length }, (_, i) => <span key={i} className={i < n ? 'done' : i === n ? 'cur' : ''} />)}
        </div>
        <span className={`combo${combo >= 3 ? ' hot' : ''}`} title="Right answers in a row">🔥 {combo}</span>
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{quiz.title}</h2>
        {quiz.mic && (
          <div className="row" style={{ gap: 6 }}>
            <div className="chips" role="group" aria-label="Answer mode">
              <button className="chip" aria-pressed={!playMode} onClick={() => setMode('tap')}>Tap</button>
              <button className="chip" aria-pressed={playMode} disabled={isAway()} onClick={() => setMode('play')} title={isAway() ? "You're away from your guitar" : ''}>🎸 Play</button>
            </div>
            {playMode && <InputPicker active={micInput} />}
          </div>
        )}
      </div>

      <div className={`panel quiz-card${result ? (result.ok ? ' ok' : ' bad') : ''}`}>
        <div className="quiz-prompt">{q.prompt}</div>
        {q.sub && <div className="small muted">{q.sub}</div>}
        {q.audio && <button className="btn sm" style={{ marginTop: 8 }} onClick={() => playAudio()}>▶ Play again</button>}
        {q.diagram && <Zoomable id="quizDiagram" max={2.2}><div className="quiz-diagram"><ChordDiagram voicing={q.diagram} size={1.3} /></div></Zoomable>}
        {(q.neck || (result && reveal.length > 0)) && (
          <Fretboard tuning={inst.midis} fromFret={q.neck?.from ?? 0} toFret={q.neck?.to ?? 13} markFor={markFor} onTap={onNeckTap} compact />
        )}
        {playMode && q.mic && !result && (
          <p className="mic-ask">🎸 Play {q.mic.want}{micMsg ? <span className="fb bad"> · {micMsg}</span> : ''}</p>
        )}
        {playMode && !q.mic && !result && <p className="small muted">This one is answered by tapping.</p>}
      </div>

      {!result && (!playMode || !q.mic) && (
        <div className="quiz-input">
          {q.input.type === 'notes' && (
            <div className="note-grid">
              {(q.input.naturalsOnly ? NAT : [...Array(12).keys()]).map(p => (
                <button key={p} className="btn note-btn" onClick={() => answer({ pc: p })}>{label(p)}</button>
              ))}
            </div>
          )}
          {q.input.type === 'choices' && (
            <div className="choice-grid">
              {q.input.options.map(o => <button key={o.id} className="btn choice-btn" onClick={() => answer({ choice: o.id })}>{o.label}</button>)}
            </div>
          )}
          {q.input.type === 'diagrams' && (
            <Zoomable id="quizChords" max={2.2}>
              <div className="row" style={{ justifyContent: 'center' }}>
                {q.input.options.map(o => <ChordDiagram key={o.id} voicing={o.voicing} onClick={() => answer({ choice: o.id })} />)}
              </div>
            </Zoomable>
          )}
          {q.input.type === 'spell' && (
            <>
              <div className="note-grid">
                {[...Array(12).keys()].map(p => (
                  <button key={p} className="btn note-btn" aria-pressed={spell.includes(p)} onClick={() => setSpell(sp => (sp.includes(p) ? sp.filter(x => x !== p) : sp.length < 3 ? [...sp, p] : sp))}>{label(p)}</button>
                ))}
              </div>
              <button className="btn primary" disabled={spell.length !== 3} onClick={() => answer({ pcs: spell })}>Check</button>
            </>
          )}
          {neckInput && neckHint && <p className="small fb bad" role="status" style={{ margin: 0 }}>{neckHint}</p>}
          {neckInput && <p className="small muted" style={{ margin: 0 }}>{neckInput.count > 1 ? `Tap ${neckInput.count} spots on the neck (${picked.length}/${neckInput.count}). Tap a dot again to remove it.` : 'Tap the spot on the neck.'}</p>}
        </div>
      )}
      {playMode && q.mic && !result && (
        <div className="row">
          <button className="btn" onClick={() => { triedWrong.current = true; finish(false) }}>Show me</button>
          <button className="btn ghost" onClick={() => setMode('tap')}>Answer by tapping instead</button>
        </div>
      )}

      {result && (
        <div className={`quiz-feedback ${result.ok ? 'ok' : 'bad'}`} role="status">
          <b>{result.ok ? (triedWrong.current ? '✓ Got it' : combo >= 5 ? `✓ ${combo} in a row!` : '✓ Right!') : '✗ Not quite'}</b>
          <span>{q.explain}</span>
          {!result.ok && <button className="btn primary" onClick={() => (n + 1 >= quiz.length ? end() : advance())}>Next</button>}
        </div>
      )}
    </div>
  )
}

function QuizEnd({ quiz, pct, stars, played, xp, onAgain, onExit }: { quiz: QuizDef; pct: number; stars: number; played: boolean; xp: number; onAgain: () => void; onExit: () => void }) {
  const saved = useRef(false)
  useEffect(() => {
    if (saved.current) return
    saved.current = true
    if (stars > 0) setStars(quiz.id, stars)
    if (stars >= 3) bump('threeStars')
    if (played) bump('micQuizzes')
  }, [quiz.id, stars, played])
  return (
    <div className="stack quiz-end">
      <div className="panel" style={{ textAlign: 'center' }}>
        <PsyDog seed={`quiz-${pct}`} className="quiz-dog" />
        <div className="stars" aria-label={`${stars} of 3 stars`}>{[1, 2, 3].map(i => <span key={i} className={i <= stars ? 'on' : ''}>★</span>)}</div>
        <div className="readout" style={{ fontSize: 56 }}>{pct}%</div>
        <p className="muted">{stars === 3 ? 'Perfect and fast. Nailed it.' : stars === 2 ? 'Great work. Go again for three stars.' : stars === 1 ? 'Good start. The ones you missed will come up more often.' : 'Keep at it: missed notes come back more often until they stick.'}</p>
        <p className="small"><b>+{Math.max(0, xp)} XP</b>{played ? ' · played on your instrument' : ''}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn primary" onClick={onAgain}>Go again</button>
          <button className="btn" onClick={onExit}>Done</button>
        </div>
      </div>
    </div>
  )
}

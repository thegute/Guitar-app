// Drone ear training (in the style of functional ear trainers like Sonofield): a soft drone holds the key,
// a note plays, and you name its scale degree by how it feels against home. Then it walks back home so you
// feel where it wanted to go. Optional guitar mode: find the note on your instrument and the mic checks it.
import { useEffect, useRef, useState } from 'react'
import { Drone } from '../audio/drone'
import { playNote } from '../audio/pluck'
import { audio } from '../audio/engine'
import { NoteListener } from '../tabs/follow'
import { Fretboard } from '../components/Fretboard'
import { Chips, usePersist } from '../components/Controls'
import { InputPicker } from '../components/InputPicker'
import { SHARPS } from '../theory/notes'
import type { Instrument } from '../instrument'
import { bump, isAway, itemStats, itemWeight, recordItem, todayLog, usePracticeTimer } from './progress'
import { bumpCombo } from './game'

export const EAR_LEVELS: { id: number; title: string; degrees: number[]; octaves: 1 | 2; minor?: boolean; tip: string }[] = [
  { id: 1, title: 'Home and the 5th', degrees: [0, 7], octaves: 1, tip: '1 feels settled, like you have arrived. 5 is strong and open, but not quite home.' },
  { id: 2, title: 'The major triad', degrees: [0, 4, 7], octaves: 1, tip: '3 is sweet and bright: the note that makes the key sound major.' },
  { id: 3, title: 'Steps from home', degrees: [0, 2, 4], octaves: 1, tip: '2 feels like it is leaning on home, waiting to step down.' },
  { id: 4, title: 'The lower half', degrees: [0, 2, 4, 5, 7], octaves: 1, tip: '4 hangs in the air and wants to fall to 3.' },
  { id: 5, title: 'The upper half', degrees: [7, 9, 11, 12], octaves: 1, tip: '7 is the most tense note in the key: it is desperate to rise to 1. 6 is warm and a little wistful.' },
  { id: 6, title: 'The whole major scale', degrees: [0, 2, 4, 5, 7, 9, 11], octaves: 1, tip: 'All seven together. Trust the feeling, not counting.' },
  { id: 7, title: 'Two octaves', degrees: [0, 2, 4, 5, 7, 9, 11], octaves: 2, tip: 'Same feelings, higher and lower. A degree feels the same in any octave.' },
  { id: 8, title: 'Minor key colours', degrees: [0, 2, 3, 5, 7, 8, 10], octaves: 1, minor: true, tip: 'b3 is dark, b6 is heavy and sad, b7 is relaxed and bluesy.' },
  { id: 9, title: 'Blues notes', degrees: [0, 3, 5, 6, 7, 10], octaves: 1, minor: true, tip: 'The b5 is the "blue note": it slides between 4 and 5.' },
  { id: 10, title: 'All twelve', degrees: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], octaves: 1, tip: 'Every note against the drone. This is real-world playing by ear.' },
]
const DEG = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7', '1']
const SOLFEGE = ['Do', 'Ra', 'Re', 'Me', 'Mi', 'Fa', 'Fi', 'Sol', 'Le', 'La', 'Te', 'Ti', 'Do']
const COLOR = ['#e5385d', '#e86a3a', '#f08a24', '#e4a91a', '#f2c230', '#5cbf4d', '#22b07a', '#0fa98a', '#1c9ec2', '#3f7fe0', '#6b5ce6', '#9b4fd8', '#e5385d']
/** The way each degree walks back home (semitones from the tonic). */
const HOME: Record<number, number[]> = {
  0: [0], 1: [1, 0], 2: [2, 0], 3: [3, 2, 0], 4: [4, 2, 0], 5: [5, 4, 2, 0], 6: [6, 7, 9, 11, 12], 7: [7, 9, 11, 12],
  8: [8, 7, 9, 11, 12], 9: [9, 11, 12], 10: [10, 11, 12], 11: [11, 12], 12: [12],
}
const GUITAR_KEYS = ['E', 'A', 'D', 'G', 'C']
const ALL_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const pcOf = (k: string) => ALL_KEYS.indexOf(k) >= 0 ? ALL_KEYS.indexOf(k) : SHARPS.indexOf(k)

type Mode = 'degrees' | 'melody' | 'handsfree'

export function EarTrainer({ inst, onExit }: { inst: Instrument; onExit: () => void }) {
  const [levelId, setLevelId] = usePersist('earLevel', 1)
  const [best, setBest] = usePersist('earBest', 0)
  const [mode, setMode] = usePersist<Mode>('earMode', 'degrees')
  const [keys, setKeys] = usePersist<'guitar' | 'all' | 'fixed'>('earKeys', 'guitar')
  const [fixedKey, setFixedKey] = usePersist('earKey', 'A')
  const [labels, setLabels] = usePersist<'num' | 'solfege'>('earLabels', 'num')
  const [vol, setVol] = usePersist('earDrone', 0.5)
  const [guitar, setGuitar] = usePersist('earGuitar', false)
  const [showNeck, setShowNeck] = usePersist('earNeck', true)
  const level = EAR_LEVELS.find(l => l.id === levelId) ?? EAR_LEVELS[0]
  const LEN = 10
  const drone = useRef(new Drone())
  const [running, setRunning] = useState(false)
  const [key, setKey] = useState(fixedKey)
  const [target, setTarget] = useState<number[]>([]) // degrees (semitones; may be ≥12 for the upper octave)
  const [octBase, setOctBase] = useState(55)
  const [given, setGiven] = useState<number[]>([])
  const [result, setResult] = useState<null | boolean>(null)
  const [q, setQ] = useState(0)
  const [right, setRight] = useState(0)
  const [combo, setCombo] = useState(0)
  const [finished, setFinished] = useState(false)
  const [heard, setHeard] = useState('')
  const [handsfreeShow, setHandsfreeShow] = useState(false)
  const t0 = useRef(0)
  const wrongOnce = useRef(false)
  const away = isAway()
  const useGuitar = guitar && !away && mode !== 'handsfree'
  usePracticeTimer('ear', running, useGuitar)

  const tonicPc = pcOf(key)
  const lab = (d: number) => (labels === 'num' ? DEG[d % 12 === 0 && d >= 12 ? 12 : d % 12] : SOLFEGE[d % 12])

  useEffect(() => () => drone.current.stop(), [])
  useEffect(() => { drone.current.setVolume(vol) }, [vol])

  function pickKey() {
    if (keys === 'fixed') return fixedKey
    const list = keys === 'guitar' ? GUITAR_KEYS : ALL_KEYS
    return list[Math.floor(Math.random() * list.length)]
  }

  function startRound() {
    const k = pickKey()
    setKey(k)
    const tonic = 40 + ((pcOf(k) - 4 + 12) % 12) // E2..D#3 drone
    drone.current.start(tonic)
    drone.current.setVolume(vol)
    setRunning(true)
    setFinished(false)
    setQ(0)
    setRight(0)
    setCombo(0)
    setTimeout(() => newQuestion(k), 1300)
  }
  function stopRound() {
    drone.current.stop()
    setRunning(false)
    setTarget([])
  }

  function chooseDegree() {
    const stats = itemStats()
    const pool = level.degrees.flatMap(d => (level.octaves === 2 ? [d, d + 12] : [d]))
    const w = pool.map(d => itemWeight(`ear:${level.id}:${d % 12}`, stats))
    let r = Math.random() * w.reduce((a, b) => a + b, 0)
    for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i] }
    return pool[0]
  }
  function newQuestion(k = key) {
    // the note sits in a comfortable guitar range above the drone
    const base = 52 + ((pcOf(k) - 4 + 12) % 12)
    setOctBase(base)
    let degs: number[]
    if (mode === 'melody') {
      degs = [chooseDegree()]
      for (let i = 0; i < 2; i++) {
        const near = level.degrees.filter(d => Math.abs(d - degs[degs.length - 1]) <= 5 && d !== degs[degs.length - 1])
        degs.push(near.length ? near[Math.floor(Math.random() * near.length)] : chooseDegree())
      }
    } else degs = [chooseDegree()]
    setTarget(degs)
    setGiven([])
    setResult(null)
    setHeard('')
    setHandsfreeShow(false)
    wrongOnce.current = false
    t0.current = performance.now()
    play(degs, base)
    if (mode === 'handsfree') {
      setTimeout(() => { setHandsfreeShow(true); resolve(degs[degs.length - 1], base) }, 3200)
      setTimeout(() => setQ(x => x + 1), 6400)
    }
  }
  // hands-free: keep going until stopped
  useEffect(() => {
    if (mode === 'handsfree' && running && q > 0) newQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function play(degs = target, base = octBase) {
    const ctx = audio()
    void ctx.resume()
    degs.forEach((d, i) => playNote(base + d, ctx.currentTime + 0.05 + i * 0.6, 0.8))
  }
  function resolve(d: number, base = octBase) {
    const ctx = audio()
    const path = HOME[d % 12 === 0 && d >= 12 ? 12 : d % 12].map(x => x + (d >= 12 ? 12 : 0))
    path.forEach((x, i) => playNote(base + x, ctx.currentTime + 0.35 + i * 0.32, 0.7))
  }

  function answer(d: number) {
    if (result !== null || !target.length) return
    const idx = given.length
    const want = target[idx] % 12
    const ok = d % 12 === want
    if (mode === 'melody') {
      const g = [...given, d]
      setGiven(g)
      if (!ok) { finishQ(false); return }
      if (g.length === target.length) finishQ(true)
      return
    }
    setGiven([d])
    finishQ(ok)
  }
  function finishQ(ok: boolean) {
    const firstTry = ok && !wrongOnce.current
    for (const d of target) recordItem(`ear:${level.id}:${d % 12}`, firstTry, performance.now() - t0.current, combo)
    const c = firstTry ? combo + 1 : 0
    setCombo(c)
    bumpCombo(c)
    if (firstTry) setRight(r => r + 1)
    setResult(ok)
    if (!ok) setTimeout(() => play(), 400)
    resolve(target[target.length - 1])
    if (ok) setTimeout(() => nextQ(), 2300)
  }
  function nextQ() {
    if (q + 1 >= LEN) {
      setFinished(true)
      drone.current.stop()
      setRunning(false)
      bump('earRounds')
      return
    }
    setQ(x => x + 1)
    newQuestion()
  }
  // level passed?
  useEffect(() => {
    if (!finished) return
    const pct = right / LEN
    if (pct >= 0.8 && level.id > best) setBest(level.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  // guitar mode: play the note you heard
  useEffect(() => {
    if (!useGuitar || !running) return
    const l = new NoteListener()
    // the right answer in any octave: checked for first
    const exp = () => { const want = targetRef.current[givenRef.current.length]; if (want === undefined) return l.expect([]); const out: number[] = []; for (let m = 40; m <= 88; m++) if ((m - tonicPc - want + 120) % 12 === 0) out.push(m); l.expect(out) }
    const expTimer = setInterval(exp, 250)
    l.onNote = e => {
      const deg = (e.midi - tonicPc + 120) % 12
      setHeard(`${SHARPS[e.midi % 12]} = ${lab(deg)}`)
      if (resultRef.current !== null) return
      const want = targetRef.current[givenRef.current.length]
      if (want === undefined) return
      if (deg === want % 12) answerRef.current(want)
      else wrongOnce.current = true
    }
    l.start().then(exp).catch(() => setHeard('Microphone access is needed for guitar mode.'))
    return () => { clearInterval(expTimer); l.stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useGuitar, running, mode, tonicPc])
  const resultRef = useRef(result); resultRef.current = result
  const targetRef = useRef(target); targetRef.current = target
  const givenRef = useRef(given); givenRef.current = given
  const answerRef = useRef(answer); answerRef.current = answer

  const shownDeg = target.length ? target[target.length - 1] : -1
  const degreesShown = mode === 'degrees' || mode === 'melody' ? level.degrees.concat(level.octaves === 2 ? [] : []) : []

  return (
    <div className="stack ear">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <button className="btn sm" onClick={() => { stopRound(); onExit() }}>← Back</button>
        <span className={`combo${combo >= 3 ? ' hot' : ''}`}>🔥 {combo}</span>
      </div>
      <h2 style={{ margin: 0 }}>Ear training</h2>
      {!running && !finished && (
        <div className="panel stack">
          <p className="muted" style={{ margin: 0 }}>
            A soft drone plays the home note of a key. Then you hear one note: name it by how it <i>feels</i> against home, not by counting.
            After each answer it walks back home so you feel where it wanted to go. Headphones help.
          </p>
          <div className="ear-levels">
            {EAR_LEVELS.map(l => (
              <button key={l.id} className={`ear-level${l.id === levelId ? ' on' : ''}`} onClick={() => setLevelId(l.id)} disabled={l.id > best + 1 && l.id > 1}>
                <span className="lvl">{l.id}</span>
                <span>{l.title}</span>
                {l.id <= best && <span className="small">✓</span>}
              </button>
            ))}
          </div>
          <p className="small muted" style={{ margin: 0 }}>{level.tip} {levelId > best + 1 ? '' : 'Pass with 8/10 to unlock the next level.'}</p>
          <Chips label="Mode" items={[{ id: 'degrees', label: 'Single notes' }, { id: 'melody', label: 'Melodies (3 notes)' }, { id: 'handsfree', label: 'Hands-free' }]} value={mode} onChange={setMode} />
          {mode === 'handsfree' && <p className="small muted" style={{ margin: 0 }}>Hands-free plays a note, waits, then shows the answer and walks it home. Just listen and say it in your head.</p>}
          <Chips label="Keys" items={[{ id: 'guitar', label: 'Guitar keys (E A D G C)' }, { id: 'all', label: 'Any key' }, { id: 'fixed', label: 'One key' }]} value={keys} onChange={setKeys} />
          {keys === 'fixed' && <Chips label="Key" items={ALL_KEYS.map(k => ({ id: k, label: k }))} value={fixedKey} onChange={setFixedKey} />}
          <div className="row">
            <Chips label="Labels" items={[{ id: 'num', label: '1 2 3' }, { id: 'solfege', label: 'Do Re Mi' }]} value={labels} onChange={setLabels} />
            <label className="row small" style={{ gap: 6 }}>Drone <input type="range" min={0} max={1} step={0.05} value={vol} onChange={e => setVol(+e.target.value)} style={{ accentColor: 'var(--accent)' }} aria-label="Drone volume" /></label>
          </div>
          <div className="row">
            <button className="chip" aria-pressed={guitar && !away} disabled={away} onClick={() => setGuitar(!guitar)}>🎸 Use my {inst.noun}</button>
            <button className="chip" aria-pressed={showNeck} onClick={() => setShowNeck(!showNeck)}>Show answers on the neck</button>
            {guitar && !away && <InputPicker active={null} />}
          </div>
          {guitar && !away && <p className="small muted" style={{ margin: 0 }}>Guitar mode: after the note plays, find it on your {inst.noun} and play it. The mic checks it. You can still tap.</p>}
          <button className="btn primary big" onClick={startRound}>Start level {level.id}</button>
        </div>
      )}

      {running && (
        <div className="panel stack ear-play">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small muted">Level {level.id} · key of {key}{level.minor ? ' minor' : ''} · {mode === 'handsfree' ? `note ${q + 1}` : `${q + 1} / ${LEN}`}</span>
            <button className="btn sm" onClick={stopRound}>Stop</button>
          </div>
          <div className={`ear-orb${result === true ? ' ok' : result === false ? ' bad' : ''}`} style={{ ['--deg' as string]: (handsfreeShow || result !== null) && shownDeg >= 0 ? COLOR[shownDeg % 12] : 'var(--accent)' }}>
            {(handsfreeShow || result !== null) && shownDeg >= 0 ? <span>{target.map(lab).join(' ')}</span> : <span>?</span>}
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => play()}>▶ Hear it again</button>
            <button className="btn ghost" onClick={() => { const ctx = audio(); playNote(octBase, ctx.currentTime + 0.02, 0.8) }}>Hear home (1)</button>
          </div>
          {mode !== 'handsfree' && (
            <div className="degree-grid">
              {[...new Set(degreesShown.map(d => d % 12))].sort((a, b) => a - b).map(d => (
                <button key={d} className={`degree-btn${given.includes(d) && result === false && target[0] % 12 !== d ? ' wrong' : ''}`} style={{ ['--deg' as string]: COLOR[d] }}
                  onClick={() => answer(d)} disabled={result !== null}>
                  {lab(d)}
                </button>
              ))}
            </div>
          )}
          {mode === 'melody' && <p className="small muted" style={{ margin: 0, textAlign: 'center' }}>Tap the three notes in order ({given.length}/3)</p>}
          {useGuitar && <p className="small" style={{ textAlign: 'center', margin: 0 }}>🎸 Play it on your {inst.noun}{heard ? <span className="muted"> · heard {heard}</span> : ''}</p>}
          {result !== null && (
            <div className={`quiz-feedback ${result ? 'ok' : 'bad'}`}>
              <b>{result ? '✓ Right' : `✗ It was ${target.map(lab).join(' ')}`}</b>
              <span>{EAR_LEVELS.find(l => l.id === levelId)?.tip.split('. ').find(s => s.startsWith(DEG[target[target.length - 1] % 12])) ?? 'Listen to it walk back home.'}</span>
              {!result && <button className="btn primary" onClick={nextQ}>Next</button>}
            </div>
          )}
          {showNeck && (result !== null || handsfreeShow) && shownDeg >= 0 && (
            <Fretboard tuning={inst.midis} fromFret={0} toFret={12} compact
              markFor={(m) => {
                const d = (m - tonicPc + 120) % 12
                if (d === shownDeg % 12) return { label: lab(d), role: 'chord' }
                if (d === 0) return { label: '1', role: 'root' }
                return null
              }} />
          )}
        </div>
      )}

      {finished && (
        <div className="panel" style={{ textAlign: 'center' }}>
          <div className="readout" style={{ fontSize: 56 }}>{right}/{LEN}</div>
          <p className="muted">{right >= 8 ? `Level ${level.id} passed!${level.id < 10 ? ' The next level is unlocked.' : ' You passed every level.'}` : 'Almost. The notes you missed will come up more often next time.'}</p>
          <p className="small"><b>{todayLog().xp ?? 0} XP earned today</b></p>
          <div className="row" style={{ justifyContent: 'center' }}>
            {right >= 8 && level.id < 10 && <button className="btn primary" onClick={() => { setLevelId(level.id + 1); setFinished(false) }}>Next level</button>}
            <button className="btn" onClick={() => { setFinished(false) }}>Back to levels</button>
            <button className="btn" onClick={startRound}>Go again</button>
          </div>
        </div>
      )}
      <p className="small muted">Ear training shaped after drone-based "functional" ear trainers such as Sonofield: hear every note against a constant home.</p>
    </div>
  )
}


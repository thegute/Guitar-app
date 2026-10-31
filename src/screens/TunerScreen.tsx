// Tuner: the mic (or USB amp) turns on by itself. A steady reading to a tenth of a cent, the exact frequency and how
// far it is from the string's target in Hz, a needle with a green zone, a strobe band that stands still when the
// string is in tune, and a trace of the last few seconds (it shows a wobbly or drifting string). Pick a string or let
// it find the nearest one; each string gets a tick once it has held in tune for a second.
import { micWhere } from '../audio/input'
import { useEffect, useRef, useState } from 'react'
import { usePracticeTimer } from '../learn/progress'
import { PitchTracker } from '../audio/pitch'
import { TunerSmoother, type Steady } from '../audio/tunerPitch'
import { keepAwake, audio, out } from '../audio/engine'
import { midiName, midiToFreq } from '../theory/notes'
import { setTuning, useInstrument } from '../instrument'
import { Field, usePersist } from '../components/Controls'
import { InputPicker } from '../components/InputPicker'
import { useScreenInfo } from '../assistant/screen'
import { pcName } from '../theory/notes'

const IN_TUNE = 2 // cents
const CLOSE = 8
const TRACE = 120 // readings kept for the trace (~3 s)

const noteOnly = (m: number) => midiName(m).replace(/-?\d+$/, '')
const octaveOf = (m: number) => Math.floor(m / 12) - 1

export function TunerScreen() {
  const [a4, setA4] = usePersist('a4', 440)
  const [pick, setPick] = usePersist<number | 'auto'>('tunerString', 'auto')
  const [running, setRunning] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)
  usePracticeTimer('tuner', running, true)
  const [err, setErr] = useState<string | null>(null)
  const [r, setR] = useState<Steady | null>(null)
  const [level, setLevel] = useState(0)
  const [done, setDone] = useState<boolean[]>([])
  const [input, setInput] = useState<{ label: string; external: boolean } | null>(null)
  const tracker = useRef<PitchTracker | null>(null)
  const smoother = useRef(new TunerSmoother())
  const latest = useRef<Steady | null>(null)
  const trace = useRef<(number | null)[]>([])
  const [, setFrame] = useState(0)
  const strobe = useRef<HTMLDivElement>(null)
  const holdSince = useRef<{ s: number; t: number } | null>(null)
  const inst = useInstrument()
  const tuning = inst.tuning
  const targets = inst.midis
  const lockedString = pick === 'auto' || pick >= targets.length ? null : pick
  const heard = r ? `${pcName(Math.round(r.note) % 12, false)}${Math.floor(Math.round(r.note) / 12) - 1}, ${Math.round(r.cents / 5) * 5 >= 0 ? '+' : ''}${Math.round(r.cents / 5) * 5} cents` : null
  useScreenInfo('tuner', {
    label: `Tools → Tuner: ${tuning.name}${heard && running ? ` · hearing ${heard}` : ''}`,
    summary: `In Tools → Tuner, tuning ${inst.label.toLowerCase()} to ${tuning.name} (strings low to high: ${targets.map(m => `${pcName(m % 12, false)}${Math.floor(m / 12) - 1}`).join(' ')}), A4 = ${a4} Hz, ${lockedString === null ? 'string picked automatically' : `string ${lockedString + 1} from the bottom picked`}. ${running ? (heard ? `It hears ${heard} (minus = flat, plus = sharp).` : 'Listening, nothing heard yet.') : 'Not listening right now.'}${done.some(Boolean) ? ` Strings already in tune: ${done.map((d, k) => (d ? k + 1 : 0)).filter(Boolean).join(', ')}.` : ''}`,
  })

  // the target string: the one picked, or the one nearest to what's heard
  const nearest = (m: number) => targets.reduce((best, t, i) => (Math.abs(t - m) < Math.abs(targets[best] - m) ? i : best), 0)

  useEffect(() => { smoother.current.a4 = a4 }, [a4])
  useEffect(() => { smoother.current.target = lockedString === null ? null : targets[lockedString]; smoother.current.reset() }, [lockedString, targets.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setDone(targets.map(() => false)), [tuning.id, targets.length]) // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    setErr(null)
    try {
      const t = new PitchTracker({ filter: true, raw: true })
      t.onRaw = (raw, time) => {
        const s = smoother.current.push(time, raw.freq, raw.clarity)
        latest.current = s
        setLevel(raw.level)
      }
      await t.start()
      tracker.current = t
      setInput(t.input ? { label: t.input.label, external: t.input.external } : null)
      setRunning(true)
      setNeedsTap(audio().state !== 'running')
      void keepAwake(true)
    } catch (e) {
      setErr(`KGuitar needs microphone access to hear your guitar (this also covers a USB amp or audio interface). Allow it ${micWhere()}, then tap Start tuner.`)
      console.warn(e)
    }
  }
  function stop() {
    tracker.current?.stop()
    tracker.current = null
    setRunning(false)
    setInput(null)
    latest.current = null
    setR(null)
    void keepAwake(false)
  }
  // the mic turns on as soon as the tuner opens, and off when you leave
  useEffect(() => {
    void start()
    return () => { tracker.current?.stop(); void keepAwake(false) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // display: numbers ~20 times a second, the strobe every frame
  useEffect(() => {
    if (!running) return
    let raf = 0, last = performance.now(), phase = 0, lastUi = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const s = latest.current
      const cents = s ? centsFor(s) : null
      // the strobe moves by how far off you are: right when sharp, left when flat, still when in tune
      if (cents !== null && strobe.current) {
        phase = (phase + Math.max(-60, Math.min(60, cents)) * 3 * dt) % 32
        strobe.current.style.transform = `translateX(${phase - 32}px)`
      }
      if (now - lastUi > 50) {
        lastUi = now
        trace.current.push(cents === null ? null : Math.max(-50, Math.min(50, cents)))
        if (trace.current.length > TRACE) trace.current.shift()
        setR(s)
        setFrame(f => f + 1)
        // a string held in tune for a second gets its tick
        if (s && cents !== null && s.stable && Math.abs(cents) <= IN_TUNE) {
          const si = lockedString ?? nearest(s.note)
          if (Math.abs(targets[si] - s.note) < 0.5) {
            const h = holdSince.current
            if (!h || h.s !== si) holdSince.current = { s: si, t: now }
            else if (now - h.t > 1000) setDone(d => (d[si] ? d : d.map((v, i) => (i === si ? true : v))))
          }
        } else holdSince.current = null
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running, lockedString, targets.join()]) // eslint-disable-line react-hooks/exhaustive-deps

  // cents from the target: the picked string, or the nearest note
  function centsFor(s: Steady) { return s.cents }

  function reference(m: number) {
    const ctx = audio()
    void ctx.resume()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'triangle'
    o.frequency.value = midiToFreq(m, a4)
    g.gain.setValueAtTime(0, ctx.currentTime)
    g.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.2)
    o.connect(g).connect(out())
    o.start()
    o.stop(ctx.currentTime + 2.3)
  }

  const cents = r ? centsFor(r) : 0
  const inTune = !!r && Math.abs(cents) <= IN_TUNE
  const close = !!r && Math.abs(cents) <= CLOSE
  const tone = !r ? 'idle' : inTune ? 'ok' : close ? 'near' : 'far'
  const stringIdx = r ? lockedString ?? nearest(r.note) : lockedString ?? -1
  const targetMidi = stringIdx >= 0 ? targets[stringIdx] : null
  const targetHz = targetMidi !== null ? midiToFreq(targetMidi, a4) : null
  const onString = r && targetMidi !== null && Math.abs(r.note - targetMidi) < 0.5
  const angle = Math.max(-50, Math.min(50, cents)) * 1.6
  const advice = !running ? 'The tuner is paused.' : !r ? 'Play one string and let it ring.'
    : inTune ? (r.stable ? 'In tune' : 'In tune, let it settle')
    : Math.abs(cents) >= 100 ? `${Math.abs(cents / 100).toFixed(1)} semitones ${cents < 0 ? 'low: tighten the string (tune up)' : 'high: loosen the string (tune down)'}`
    : cents < 0 ? `${Math.abs(cents).toFixed(1)} cents flat: tune up ↑` : `${cents.toFixed(1)} cents sharp: tune down ↓`
  const allDone = done.length > 0 && done.every(Boolean)
  const pts = trace.current.map((c, i) => (c === null ? null : `${(i / (TRACE - 1)) * 300},${30 - c * 0.56}`))
  const lines: string[] = []
  let cur: string[] = []
  for (const p of pts) { if (p) cur.push(p); else if (cur.length) { lines.push(cur.join(' ')); cur = [] } }
  if (cur.length) lines.push(cur.join(' '))

  return (
    <div className={`stack tuner tune-${tone}`} style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Tuner{inst.isUke ? <span className="muted small"> · {inst.label}</span> : null}</h1>
        <InputPicker active={input} onChanged={() => { if (tracker.current) { stop(); void start() } }} />
      </div>

      <div className="tuner-strings" role="radiogroup" aria-label="Which string">
        <button role="radio" aria-checked={lockedString === null} className={`chip${lockedString === null ? ' on' : ''}`} onClick={() => setPick('auto')}>Auto</button>
        {targets.map((m, i) => (
          <button key={i} role="radio" aria-checked={lockedString === i} className={`chip key tuner-string${stringIdx === i && r ? ' heard' : ''}${done[i] ? ' done' : ''}`}
            onClick={() => { setPick(i); reference(m) }} aria-label={`String ${targets.length - i}, ${noteOnly(m)}${done[i] ? ', in tune' : ''}`}>
            {noteOnly(m)}<sub>{octaveOf(m)}</sub>{done[i] && <span className="tick" aria-hidden>✓</span>}
          </button>
        ))}
      </div>

      <div className="panel tuner-main">
        <div className="tuner-note">
          <span className="tuner-name">{r ? noteOnly(r.note) : '–'}<sub>{r ? octaveOf(r.note) : ''}</sub></span>
          {r && <span className="tuner-cents" aria-live="off">{`${cents > 0 ? '+' : cents < 0 ? '−' : '±'}${Math.abs(cents).toFixed(1)}¢`}</span>}
        </div>
        <div className="tuner-advice" aria-live="polite">{advice}</div>
        <div className="tuner-hz small">
          {r ? <>{r.freq.toFixed(2)} Hz</> : ' '}
          {r && targetHz && onString ? <span className="muted"> · target {targetHz.toFixed(2)} Hz ({r.freq - targetHz >= 0 ? '+' : '−'}{Math.abs(r.freq - targetHz).toFixed(2)} Hz)</span> : null}
          {r && targetMidi !== null && !onString ? <span className="muted"> · string {targets.length - stringIdx} wants {noteOnly(targetMidi)}{octaveOf(targetMidi)}</span> : null}
        </div>

        <svg className="tuner-gauge" viewBox="0 0 300 160" aria-hidden="true">
          <path d={arc(-80, 80)} fill="none" className="g-arc" strokeWidth={10} />
          <path d={arc(-IN_TUNE * 1.6, IN_TUNE * 1.6)} fill="none" className="g-zone" strokeWidth={10} />
          {Array.from({ length: 21 }, (_, i) => {
            const c = (i - 10) * 5
            const a = (c * 1.6 * Math.PI) / 180
            const major = c % 25 === 0
            return <line key={i} x1={150 + Math.sin(a) * (major ? 100 : 106)} y1={150 - Math.cos(a) * (major ? 100 : 106)} x2={150 + Math.sin(a) * 114} y2={150 - Math.cos(a) * 114} className={c === 0 ? 'g-mid' : 'g-tick'} strokeWidth={c === 0 ? 3 : major ? 2 : 1.2} />
          })}
          {[-50, -25, 25, 50].map(c => { const a = (c * 1.6 * Math.PI) / 180; return <text key={c} x={150 + Math.sin(a) * 88} y={154 - Math.cos(a) * 88} className="g-label" textAnchor="middle">{c > 0 ? `+${c}` : c}</text> })}
          <g style={{ transform: `rotate(${r ? angle : 0}deg)`, transformOrigin: '150px 150px', transition: 'transform 70ms linear' }}>
            <line x1={150} y1={150} x2={150} y2={44} className="g-needle" strokeWidth={4} strokeLinecap="round" />
          </g>
          <circle cx={150} cy={150} r={8} className="g-hub" />
        </svg>

        <div className="strobe" aria-hidden="true"><div ref={strobe} className={`strobe-stripes${r ? '' : ' idle'}`} /></div>

        <svg className="tuner-trace" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">
          <rect x={0} y={30 - IN_TUNE * 0.56} width={300} height={IN_TUNE * 1.12} className="t-zone" />
          <line x1={0} x2={300} y1={30} y2={30} className="t-mid" />
          {lines.map((p, i) => <polyline key={i} points={p} className="t-line" fill="none" />)}
        </svg>
        <div className="small muted tuner-trace-label"><span>last 6 seconds</span><span>sharp above, flat below</span></div>

        <div className="level tuner-level" aria-hidden><div style={{ width: `${level * 100}%` }} /></div>
        {needsTap && running && <button className="btn primary" onClick={() => { void audio().resume().then(() => setNeedsTap(false)) }}>Tap to start listening</button>}
        {allDone && <p className="tuner-alldone" role="status">✓ Every string is in tune</p>}
        <div className="row" style={{ justifyContent: 'center' }}>
          {running ? <button className="btn" onClick={stop}>Pause tuner</button> : <button className="btn big primary" onClick={() => void start()}>Start tuner</button>}
          {done.some(Boolean) && <button className="btn ghost" onClick={() => setDone(targets.map(() => false))}>Clear ticks</button>}
        </div>
        {err && <p className="notice small" style={{ textAlign: 'left' }}>{err}</p>}
      </div>

      <div className="panel stack">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Field label="Tuning">
            <select className="select" value={tuning.id} onChange={e => setTuning(inst.id, e.target.value)}>
              {inst.tunings.map(t => <option key={t.id} value={t.id}>{t.name} ({t.notes.map(n => n.replace(/\d/, '')).join(' ')})</option>)}
            </select>
          </Field>
          <Field label={`Reference pitch A4 = ${a4} Hz`}>
            <div className="row">
              <button className="btn icon" onClick={() => setA4(Math.max(430, a4 - 1))} aria-label="Lower reference pitch">−</button>
              <button className="btn icon" onClick={() => setA4(Math.min(450, a4 + 1))} aria-label="Raise reference pitch">+</button>
            </div>
          </Field>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Tap a string above to tune that one (it plays the note so you can tune by ear too); Auto finds the string you play.
          Tune up to the note from below: if you go past it, drop under and come back up, so the string stays put.
        </p>
      </div>
    </div>
  )
}

/** An arc of the gauge between two angles (degrees). */
function arc(a0: number, a1: number) {
  const p = (a: number) => { const r = (a * Math.PI) / 180; return `${150 + Math.sin(r) * 120} ${150 - Math.cos(r) * 120}` }
  return `M ${p(a0)} A 120 120 0 0 1 ${p(a1)}`
}

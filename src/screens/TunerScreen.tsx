import { useEffect, useRef, useState } from 'react'
import { usePracticeTimer } from '../learn/progress'
import { PitchTracker, type PitchReading } from '../audio/pitch'
import { keepAwake, audio, out } from '../audio/engine'
import { freqToMidi, midiName, midiToFreq } from '../theory/notes'
import { setTuning, useInstrument } from '../instrument'
import { Field, usePersist } from '../components/Controls'
import { InputPicker } from '../components/InputPicker'

const SMOOTH = 0.25

export function TunerScreen() {
  const [a4, setA4] = usePersist('a4', 440)
  const [running, setRunning] = useState(false)
  usePracticeTimer('tuner', running, true)
  const [err, setErr] = useState<string | null>(null)
  const [reading, setReading] = useState<{ midi: number; cents: number; freq: number } | null>(null)
  const octaveRun = useRef(0)
  const [level, setLevel] = useState(0)
  const [input, setInput] = useState<{ label: string; external: boolean } | null>(null)
  const tracker = useRef<PitchTracker | null>(null)
  const smooth = useRef<number | null>(null)
  const lastSeen = useRef(0)
  const inst = useInstrument()
  const tuning = inst.tuning
  const targets = inst.midis

  useEffect(() => () => { tracker.current?.stop(); void keepAwake(false) }, [])

  async function start() {
    setErr(null)
    try {
      const t = new PitchTracker()
      t.onReading = (r: PitchReading | null) => {
        setLevel(r?.level ?? 0)
        if (!r || !r.freq) {
          if (performance.now() - lastSeen.current > 900) {
            smooth.current = null
            setReading(null)
          }
          return
        }
        lastSeen.current = performance.now()
        let m = freqToMidi(r.freq, a4)
        // low strings sometimes read an octave high for a moment (the 2nd harmonic is louder than the note):
        // an octave jump only counts once it holds for about a third of a second
        const cur = smooth.current
        if (cur !== null && Math.abs(Math.abs(m - cur) - 12) < 0.6) {
          octaveRun.current++
          if (octaveRun.current < 20) m -= Math.sign(m - cur) * 12
        } else octaveRun.current = 0
        // jump straight to a new note, smooth small wobbles
        smooth.current = cur === null || Math.abs(m - cur) > 0.6 ? m : cur + SMOOTH * (m - cur)
        const nearest = Math.round(smooth.current)
        setReading({ midi: nearest, cents: (smooth.current - nearest) * 100, freq: r.freq * Math.pow(2, (m - freqToMidi(r.freq, a4)) / 12) })
      }
      await t.start()
      tracker.current = t
      setInput(t.input ? { label: t.input.label, external: t.input.external } : null)
      setRunning(true)
      void keepAwake(true)
    } catch (e) {
      setErr('KGuitar needs microphone access to hear your guitar (this also covers a USB amp). Allow it and try again.')
      console.warn(e)
    }
  }
  function stop() {
    tracker.current?.stop()
    tracker.current = null
    setRunning(false)
    setInput(null)
    setReading(null)
    void keepAwake(false)
  }

  function reference(m: number) {
    const ctx = audio()
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

  const cents = reading?.cents ?? 0
  const inTune = reading && Math.abs(cents) < 4
  const close = reading && Math.abs(cents) < 12
  // which target string are we nearest to?
  const nearestString = reading ? targets.reduce((best, m, i) => (Math.abs(m - reading.midi) < Math.abs(targets[best] - reading.midi) ? i : best), 0) : -1
  const angle = Math.max(-50, Math.min(50, cents)) * 1.6 // degrees
  const color = inTune ? 'var(--strobe)' : close ? 'var(--amber)' : 'var(--jewel)'

  return (
    <div className="stack" style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1>Tuner{inst.isUke ? <span className="muted small"> · {inst.label}</span> : null}</h1>
      <div className="panel" style={{ textAlign: 'center', paddingTop: 22 }}>
        <svg viewBox="0 0 300 170" style={{ width: '100%', maxWidth: 420 }} aria-hidden="true">
          {Array.from({ length: 21 }, (_, i) => {
            const a = ((i - 10) * 8 * Math.PI) / 180
            const r1 = i % 5 === 0 ? 112 : 120
            return <line key={i} x1={150 + Math.sin(a) * r1} y1={150 - Math.cos(a) * r1} x2={150 + Math.sin(a) * 130} y2={150 - Math.cos(a) * 130} stroke={i === 10 ? 'var(--strobe)' : 'var(--nickel)'} strokeWidth={i === 10 ? 3 : 1.5} opacity={i % 5 === 0 ? 1 : 0.6} />
          })}
          <path d="M 61 83 A 112 112 0 0 1 239 83" fill="none" stroke="var(--hairline)" strokeWidth={1} />
          <g style={{ transform: `rotate(${reading ? angle : 0}deg)`, transformOrigin: '150px 150px', transition: 'transform 90ms linear' }}>
            <line x1={150} y1={150} x2={150} y2={30} stroke={reading ? color : 'var(--pearl-3)'} strokeWidth={4} strokeLinecap="round" />
          </g>
          <circle cx={150} cy={150} r={9} fill="var(--rosewood-3)" stroke="var(--nickel)" />
        </svg>
        <div className="readout" style={{ fontSize: 96, color: reading ? color : 'var(--pearl-3)', marginTop: -6 }}>
          {reading ? midiName(reading.midi).replace(/-?\d+$/, '') : '–'}
          <span style={{ fontSize: 34, color: 'var(--pearl-3)' }}>{reading ? Math.floor(reading.midi / 12) - 1 : ''}</span>
        </div>
        <div className="muted" style={{ minHeight: 24 }} aria-live="polite">
          {!running ? 'Tap Start and play a string.' : reading ? (inTune ? 'In tune' : cents < 0 ? `${Math.abs(cents).toFixed(0)} cents flat — tune up` : `${cents.toFixed(0)} cents sharp — tune down`) : 'Listening…'}
        </div>
        {reading && <div className="small muted">{reading.freq.toFixed(1)} Hz</div>}
        <div style={{ height: 6, background: 'var(--rosewood-3)', borderRadius: 3, margin: '14px auto 4px', maxWidth: 260 }}>
          <div style={{ height: '100%', width: `${level * 100}%`, background: 'var(--nickel)', borderRadius: 3, transition: 'width 60ms' }} />
        </div>
        <div className="row" style={{ marginTop: 16, justifyContent: 'center' }}>
          {running ? <button className="btn big" onClick={stop}>Stop</button> : <button className="btn big primary" onClick={start}>Start tuner</button>}
          <InputPicker active={input} onChanged={() => { if (tracker.current) { stop(); void start() } }} />
        </div>
        {err && <p className="notice small" style={{ textAlign: 'left', marginTop: 12 }}>{err}</p>}
      </div>

      <div className="panel stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
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
        <div>
          <span className="small muted">Tap a string to hear its target note</span>
          <div className="row" style={{ marginTop: 6 }}>
            {targets.map((m, i) => (
              <button key={i} className="chip key" aria-pressed={i === nearestString && !!reading} onClick={() => reference(m)}>
                {midiName(m).replace(/\d/, '')}
                <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 2 }}>{targets.length - i}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Gear setup: a two-minute walk-through that tunes note detection and timing to your input
// (phone mic for acoustic, or a USB amp such as the Amphonix for electric). Saved per input kind.
import { useEffect, useRef, useState } from 'react'
import { NoteListener } from '../tabs/follow'
import { InputRecorder, measureLatency } from '../audio/looper'
import { getChoice, listInputs, setChoice, type InputChoice, type InputDevice } from '../audio/input'
import { gateFrom, gear, kindOf, latencyMs, setGear, type InputKind } from '../audio/gear'
import { audio } from '../audio/engine'
import { stringName, useInstrument } from '../instrument'
import { SHARPS } from '../theory/notes'

type Step = 'input' | 'quiet' | 'low' | 'high' | 'timing' | 'done'
const ORDER: Step[] = ['input', 'quiet', 'low', 'high', 'timing', 'done']

export function GearSetup({ onClose }: { onClose: () => void }) {
  const inst = useInstrument()
  const [step, setStep] = useState<Step>('input')
  const [devs, setDevs] = useState<InputDevice[]>([])
  const [choice, setC] = useState<InputChoice>(getChoice())
  const [kind, setKind] = useState<InputKind>('mic')
  const [label, setLabel] = useState('')
  const [level, setLevel] = useState(0)
  const [msg, setMsg] = useState('')
  const [running, setRunning] = useState(false)
  const [noise, setNoise] = useState<number | null>(null)
  const [peak, setPeak] = useState<number | null>(null)
  const [gate, setGateV] = useState<number | null>(null)
  const [heardHigh, setHeardHigh] = useState<string | null>(null)
  const [lat, setLat] = useState<number | null>(null)
  const [click, setClick] = useState(-1)
  const listener = useRef<NoteListener | null>(null)
  const rec = useRef<InputRecorder | null>(null)

  const low = inst.midis.reduce((a, m, s) => (m < inst.midis[a] ? s : a), 0)
  const high = inst.midis.reduce((a, m, s) => (m > inst.midis[a] ? s : a), 0)
  const lowName = stringName(inst.midis, low)
  const highName = stringName(inst.midis, high)

  useEffect(() => { void listInputs(true).then(setDevs) }, [])
  useEffect(() => () => { listener.current?.stop(); rec.current?.stop() }, [])

  /** Listen with a very low threshold so we can see raw levels. */
  async function openListener(g = 0.3) {
    listener.current?.stop()
    const l = new NoteListener()
    l.autoGate = false
    l.gate = g
    await audio().resume()
    await l.start()
    listener.current = l
    setKind(kindOf(l.input?.external))
    setLabel(l.input?.label ?? '')
    return l
  }
  function collect(l: NoteListener, ms: number, onLevel?: (v: number) => void): Promise<number[]> {
    return new Promise(resolve => {
      const levels: number[] = []
      l.onFrame = f => { levels.push(f.level); setLevel(f.level); onLevel?.(f.level) }
      setTimeout(() => { l.onFrame = undefined; resolve(levels) }, ms)
    })
  }

  async function runQuiet() {
    setMsg(''); setRunning(true)
    try {
      const l = await openListener()
      const lv = (await collect(l, 2500)).sort((a, b) => a - b)
      setNoise(lv[Math.floor(lv.length / 2)] ?? 0.002)
      setStep('low')
    } catch {
      setMsg("Couldn't open the microphone. Allow microphone access for KGuitar in your phone settings, then try again.")
    } finally { setRunning(false) }
  }

  async function runLow() {
    setMsg(''); setRunning(true)
    try {
      const l = listener.current ?? await openListener()
      let hit: number | null = null
      l.onNote = e => { if (hit === null) hit = e.midi }
      const lv = await collect(l, 4000)
      const sorted = [...lv].sort((a, b) => a - b)
      const top = sorted[Math.floor(sorted.length * 0.97)] ?? 0
      if (top < (noise ?? 0.002) * 4) { setMsg(`That was very quiet. Pick the ${lowName} string firmly (or turn the amp's volume up) and try again.`); return }
      setPeak(top)
      const g = gateFrom(noise ?? 0.002, top)
      setGateV(g)
      setStep('high')
      if (hit !== null && (hit - inst.midis[low]) % 12 !== 0) setMsg(`Heard ${SHARPS[hit % 12]} rather than ${SHARPS[inst.midis[low] % 12]}: is your ${inst.noun} in tune? The level is saved either way.`)
    } finally { setRunning(false) }
  }

  async function runHigh() {
    setMsg(''); setRunning(true); setHeardHigh(null)
    try {
      const l = listener.current ?? await openListener()
      l.gate = gate ?? 1
      const want = inst.midis[high] % 12
      const got = await new Promise<number | null>(resolve => {
        const t = setTimeout(() => resolve(null), 6000)
        l.onNote = e => { if (e.midi % 12 === want) { clearTimeout(t); resolve(e.midi) } }
        l.onFrame = f => setLevel(f.level)
      })
      if (got === null) {
        setMsg(`Didn't catch the ${highName} string clearly. I'll make detection a bit more sensitive: try once more.`)
        setGateV(g => Math.max(0.4, Math.round(((g ?? 1) * 0.75) * 100) / 100))
        return
      }
      setHeardHigh(SHARPS[got % 12])
      setStep('timing')
    } finally { setRunning(false) }
  }

  async function runTiming() {
    setMsg(''); setRunning(true); setClick(-1)
    listener.current?.stop(); listener.current = null
    try {
      rec.current ??= new InputRecorder()
      await rec.current.start()
      const ms = await measureLatency(rec.current, i => setClick(i))
      rec.current.stop()
      if (ms === null) { setMsg("Couldn't hear clear clicks or strums. Try again a little louder, or skip this and use the estimate."); return }
      setLat(ms)
      finish(ms)
    } catch {
      setMsg("Couldn't open the input for the timing check.")
    } finally { setRunning(false) }
  }

  function finish(ms: number | null) {
    setGear(kind, { gate: gate ?? gear(kind).gate, noise: noise ?? undefined, level: peak ?? undefined, ...(ms !== null ? { latencyMs: ms } : {}), setAt: Date.now(), label })
    setStep('done')
  }

  const meter = (
    <div className="gear-meter" aria-hidden>
      <div style={{ width: `${Math.min(100, Math.sqrt(level) * 260)}%` }} />
      {gate !== null && <i style={{ left: `${Math.min(100, Math.sqrt(gate * Math.max(0.006, (noise ?? 0.002) * 3)) * 260)}%` }} />}
    </div>
  )
  const n = ORDER.indexOf(step)

  return (
    <div className="sheet-backdrop" onClick={() => !running && onClose()}>
      <div className="sheet gear" role="dialog" aria-modal="true" aria-label="Set up your input" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Set up your input</h2>
          <button className="btn sm" onClick={onClose} disabled={running}>{step === 'done' ? 'Done' : 'Close'}</button>
        </div>
        <div className="gear-steps" aria-label={`Step ${n + 1} of ${ORDER.length}`}>{ORDER.map((s, i) => <i key={s} className={i < n ? 'done' : i === n ? 'on' : ''} />)}</div>

        {step === 'input' && (
          <div className="stack" style={{ gap: 10 }}>
            <p style={{ margin: 0 }}>Which sound should KGuitar listen to? Plug in your amp first if you're playing electric. Each input gets its own settings, so run this once for the phone mic and once for the amp.</p>
            <ul className="song-list">
              <li className={choice === 'auto' ? 'on' : ''}><button className="song-open" onClick={() => { setChoice('auto'); setC('auto') }}><b>Automatic</b><span className="small muted">The amp when it's plugged in, otherwise the phone mic</span></button></li>
              <li className={choice === 'mic' ? 'on' : ''}><button className="song-open" onClick={() => { setChoice('mic'); setC('mic') }}><b>🎤 Phone microphone</b><span className="small muted">Acoustic guitar or ukulele</span></button></li>
              {devs.filter(d => d.external).map(d => (
                <li key={d.id} className={choice === d.id ? 'on' : ''}><button className="song-open" onClick={() => { setChoice(d.id); setC(d.id) }}><b>🎸 {d.label}</b><span className="small muted">USB amp or interface</span></button></li>
              ))}
            </ul>
            {!devs.some(d => d.external) && <p className="small muted" style={{ margin: 0 }}>No USB amp found. Plug in the Amphonix with its USB-C cable and it will show up here.</p>}
            <button className="btn primary big" onClick={() => setStep('quiet')}>Next</button>
          </div>
        )}

        {step === 'quiet' && (
          <div className="stack" style={{ gap: 10 }}>
            <p style={{ margin: 0 }}><b>Step 1: the room.</b> Hold the {inst.noun} the way you play, mute the strings with your hand and stay quiet for a few seconds.</p>
            {meter}
            <button className="btn primary big" onClick={() => void runQuiet()} disabled={running}>{running ? 'Listening…' : 'Start'}</button>
          </div>
        )}

        {step === 'low' && (
          <div className="stack" style={{ gap: 10 }}>
            <p style={{ margin: 0 }}><b>Step 2: a note.</b> Tap Start, then pick the open <b>{lowName}</b> string at your normal strength and let it ring.</p>
            {meter}
            <button className="btn primary big" onClick={() => void runLow()} disabled={running}>{running ? 'Listening… play now' : 'Start'}</button>
          </div>
        )}

        {step === 'high' && (
          <div className="stack" style={{ gap: 10 }}>
            <p style={{ margin: 0 }}><b>Step 3: check.</b> Now pick the open <b>{highName}</b> string. KGuitar should name it.</p>
            {meter}
            <button className="btn primary big" onClick={() => void runHigh()} disabled={running}>{running ? 'Listening… play now' : 'Start'}</button>
          </div>
        )}

        {step === 'timing' && (
          <div className="stack" style={{ gap: 10 }}>
            <p className="small" style={{ margin: 0 }}>✓ Heard {heardHigh}. Note detection is tuned for this {kind === 'usb' ? 'amp' : 'mic'}.</p>
            <p style={{ margin: 0 }}><b>Step 4: timing.</b> Put on the headphones you play with. You'll hear 8 clicks.
              {kind === 'usb' ? ' Play a short muted strum exactly on each click.' : ' With the phone speaker, just stay quiet: the mic hears the clicks. With headphones, strum muted strings on each click.'}
            </p>
            {running && <p className="readout" style={{ fontSize: 40, margin: 0 }}>{Math.max(0, click + 1)} / 8</p>}
            <div className="row">
              <button className="btn primary big" onClick={() => void runTiming()} disabled={running}>{running ? 'Clicking…' : 'Start'}</button>
              <button className="btn ghost" onClick={() => finish(null)} disabled={running}>Skip (use an estimate)</button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="stack" style={{ gap: 8 }}>
            <p style={{ margin: 0 }}><b>All set.</b> {label ? `${label}: ` : ''}detection sensitivity {gear(kind).gate}, timing delay {lat !== null ? `${lat} ms (measured)` : `${latencyMs(kind)} ms (estimated)`}.</p>
            <p className="small muted" style={{ margin: 0 }}>Play-along, quizzes, ear training, the looper and the rhythm trainer all use this now. Run it again if you change amps, rooms or headphones.</p>
          </div>
        )}
        {msg && <p className="notice small" role="status" style={{ margin: 0 }}>{msg}</p>}
      </div>
    </div>
  )
}

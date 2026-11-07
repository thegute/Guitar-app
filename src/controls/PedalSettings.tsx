// Settings for hands-free control: which pedal does what, MIDI pedals (Bluetooth or USB), and a quick "teach me your
// buttons" for 4-button switches like the M-Vave Chocolate Plus.
import { useRef, useState } from 'react'
import {
  ACTION_LABEL, BLE_ERRORS, bind, bindings, cancelLearn, connectBlePedal, describe, enableMidi, forgetBlePedal, getMidiStatus, ignoredDevices,
  learnNext, midiEnabled, nativeMidiOn, resetBindings, scanBlePedals, setDeviceIgnored, unbind, usePedalSettings, type PedalAction,
} from './pedals'

const ORDER: PedalAction[] = ['startStop', 'restart', 'loopBar', 'prevBar', 'nextBar', 'hearIt', 'video', 'record', 'accept']
/** what the 4 buttons do after "Teach KGuitar your buttons" */
const FOUR: { btn: string; action: PedalAction }[] = [
  { btn: 'A', action: 'startStop' },
  { btn: 'B', action: 'restart' },
  { btn: 'C', action: 'loopBar' },
  { btn: 'D', action: 'hearIt' },
]

export function PedalSettings() {
  usePedalSettings()
  const [learning, setLearning] = useState<PedalAction | null>(null)
  const [midiOn, setMidiOn] = useState(midiEnabled())
  const [teach, setTeach] = useState<number | null>(null)
  const teachStep = useRef(-1)
  const [scan, setScan] = useState<{ busy: boolean; found?: { address: string; name: string }[]; error?: string } | null>(null)
  const b = bindings()
  const status = getMidiStatus()
  const native = nativeMidiOn()
  const ignored = ignoredDevices()

  async function assign(a: PedalAction) {
    if (learning) { cancelLearn(); setLearning(null); return }
    setTeach(null)
    setLearning(a)
    const code = await learnNext()
    bind(code, a)
    setLearning(null)
  }

  // press A, B, C, D in turn (Skip leaves a button as it is)
  async function teachFrom(i: number) {
    cancelLearn()
    if (i >= FOUR.length) { setTeach(null); return }
    setLearning(null)
    setTeach(i)
    const want = i
    const code = await learnNext()
    // a newer step (Skip / Cancel) has taken over
    if (teachStep.current !== want) return
    bind(code, FOUR[i].action)
    teachStep.current = i + 1
    void teachFrom(i + 1)
  }
  const startTeach = () => { teachStep.current = 0; void teachFrom(0) }
  const skip = () => { const n = (teach ?? 0) + 1; teachStep.current = n; void teachFrom(n) }
  const stopTeach = () => { teachStep.current = -1; cancelLearn(); setTeach(null) }

  async function findBle() {
    setScan({ busy: true })
    const r = await scanBlePedals()
    setScan({ busy: false, found: r.found, error: r.error })
  }

  const bleState = status.ble?.state
  return (
    <section className="panel stack" style={{ gap: 10 }} data-testid="pedal-settings">
      <p className="small muted" style={{ margin: 0 }}>
        Start, stop and loop with your foot while both hands are on the guitar. A Bluetooth page-turner works straight away (it acts like a
        keyboard: right = start/stop, left = back to the start). A MIDI pedal like the Chocolate Plus gives you all its buttons, and holding one down.
      </p>

      <label className="row" style={{ gap: 8 }}>
        <input type="checkbox" checked={midiOn} onChange={e => { setMidiOn(e.target.checked); void enableMidi(e.target.checked) }} data-testid="midi-on" />
        <span>Use a MIDI pedal ({native ? 'Bluetooth or USB' : 'USB'})</span>
      </label>
      {midiOn && (
        <div className="stack" style={{ gap: 8 }}>
          {status.error && <p className="small" style={{ margin: 0 }} role="alert">{status.error}</p>}
          {native && (
            status.ble ? (
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }} data-testid="ble-pedal">
                <span className="small"><b>{status.ble.name}</b>: {bleState === 'connected' ? 'connected' : bleState === 'notfound' ? 'not found: switch it on (it reconnects by itself)' : 'connecting…'}</span>
                <button className="btn sm ghost" onClick={() => void forgetBlePedal()}>Forget</button>
              </div>
            ) : (
              <div className="stack" style={{ gap: 6 }}>
                <p className="small muted" style={{ margin: 0 }}>
                  With the Pocket Master in the phone's USB-C port, connect the pedal by Bluetooth: switch it to its Bluetooth MIDI mode, keep it close, then:
                </p>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn sm primary" disabled={scan?.busy} onClick={() => void findBle()} data-testid="ble-find">{scan?.busy ? 'Looking for pedals…' : 'Find my Bluetooth pedal'}</button>
                  {scan?.found?.map(f => (
                    <button key={f.address} className="btn sm" onClick={() => { setScan(null); void connectBlePedal(f) }}>Connect {f.name}</button>
                  ))}
                </div>
                {scan && !scan.busy && !scan.found?.length && (
                  <p className="small muted" style={{ margin: 0 }}>{scan.error ? BLE_ERRORS[scan.error] ?? 'Bluetooth search failed.' : 'No MIDI pedal found. Check it\'s in Bluetooth MIDI mode (not paired as a keyboard in the phone\'s Bluetooth settings) and try again.'}</p>
                )}
              </div>
            )
          )}
          {status.devices.length > 0 ? (
            <ul className="pedal-list" aria-label="MIDI devices">
              {status.devices.map(d => (
                <li key={d}>
                  <span className="small">{d}</span>
                  <label className="row small" style={{ gap: 6 }}>
                    <input type="checkbox" checked={!ignored.includes(d)} onChange={e => setDeviceIgnored(d, !e.target.checked)} /> Listen
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            !native && !status.error && <p className="small muted" style={{ margin: 0 }}>No MIDI pedal found yet. Plug it in with a USB-C adapter.</p>
          )}
          {status.devices.length > 1 && <p className="small muted" style={{ margin: 0 }}>If the Pocket Master shows up here too, untick Listen for it so changing its presets doesn't start or stop anything.</p>}
          {status.last && <p className="small muted" style={{ margin: 0 }} data-testid="midi-last">Last button: {status.last}</p>}
        </div>
      )}

      <div className="stack" style={{ gap: 6 }}>
        {teach === null ? (
          <button className="btn sm" onClick={startTeach} data-testid="teach-buttons">Teach KGuitar your 4 buttons (A–D)</button>
        ) : (
          <div className="teach-pedal row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }} role="status" data-testid="teach-step">
            <b>Press button {FOUR[teach].btn}</b>
            <span className="small muted">→ {ACTION_LABEL[FOUR[teach].action]}</span>
            <button className="btn sm ghost" onClick={skip}>Skip</button>
            <button className="btn sm ghost" onClick={stopTeach}>Done</button>
          </div>
        )}
        <p className="small muted" style={{ margin: 0 }}>
          Set the pedal's buttons to momentary (not toggle) in its own app. Holding a button works too: in the beat maker, hold = stop.
          In keyboard mode Android can hide the on-screen keyboard while the pedal is on; MIDI mode doesn't.
        </p>
      </div>

      <div className="pedal-profiles small" data-testid="pedal-profiles">
        <b>What A–D do on each screen</b>
        <table className="pedal-table">
          <thead><tr><th /><th>Play</th><th>Looper</th></tr></thead>
          <tbody>
            <tr><th>A</th><td>Start / stop</td><td>Record · close the loop · overdub · stop adding</td></tr>
            <tr><th>B</th><td>Back to the start</td><td>Stop at the end of the bar (twice: now) · <i>hold</i>: clear the track</td></tr>
            <tr><th>C</th><td>Loop this bar</td><td>Undo the last take · <i>hold</i>: redo</td></tr>
            <tr><th>D</th><td>Hear it</td><td>Part A ↔ B on the next bar · <i>hold</i>: stutter effect</td></tr>
          </tbody>
        </table>
        <span className="muted">The looper uses the same four buttons: teach them once above. A two-button page turner works too (A and B).</span>
      </div>

      <ul className="pedal-list">
        {ORDER.map(a => {
          const codes = Object.entries(b).filter(([, act]) => act === a).map(([c]) => c)
          return (
            <li key={a}>
              <span className="small">{ACTION_LABEL[a]}</span>
              <span className="pedal-codes">
                {codes.map(c => <button key={c} className="chip sm-chip" onClick={() => unbind(c)} aria-label={`Remove ${describe(c)}`}>{describe(c)} ✕</button>)}
                <button className={`btn sm${learning === a ? ' primary' : ''}`} onClick={() => void assign(a)}>{learning === a ? 'Press the pedal now… (tap to cancel)' : '+ Pedal'}</button>
              </span>
            </li>
          )
        })}
      </ul>
      <div className="row">
        <button className="btn sm ghost" onClick={resetBindings}>Reset to the usual pedals</button>
      </div>
    </section>
  )
}

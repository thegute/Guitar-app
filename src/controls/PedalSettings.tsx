// Settings for hands-free control: which pedal does what, and MIDI pedals.
import { useState } from 'react'
import { ACTION_LABEL, bind, bindings, cancelLearn, describe, enableMidi, getMidiStatus, learnNext, midiEnabled, resetBindings, unbind, usePedalSettings, type PedalAction } from './pedals'

const ORDER: PedalAction[] = ['startStop', 'restart', 'loopBar', 'prevBar', 'nextBar', 'hearIt', 'video', 'record']

export function PedalSettings() {
  usePedalSettings()
  const [learning, setLearning] = useState<PedalAction | null>(null)
  const [midiOn, setMidiOn] = useState(midiEnabled())
  const b = bindings()
  const status = getMidiStatus()

  async function assign(a: PedalAction) {
    if (learning) { cancelLearn(); setLearning(null); return }
    setLearning(a)
    const code = await learnNext()
    bind(code, a)
    setLearning(null)
  }

  return (
    <section className="panel stack" style={{ gap: 10 }}>
      <h2 style={{ margin: 0 }}>Hands-free (footswitch)</h2>
      <p className="small muted" style={{ margin: 0 }}>
        Pair a Bluetooth page-turner or footswitch with your phone (it works like a keyboard), then use your foot to start, stop or loop
        while both hands are on the guitar. Most two-pedal switches work straight away: right pedal = start/stop, left pedal = back to the start.
      </p>
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
      <label className="row" style={{ gap: 8 }}>
        <input type="checkbox" checked={midiOn} onChange={e => { setMidiOn(e.target.checked); void enableMidi(e.target.checked) }} />
        <span>Use a MIDI pedal (USB)</span>
      </label>
      {midiOn && (
        <p className="small muted" style={{ margin: 0 }}>
          {status.error ?? (status.devices.length ? `Connected: ${status.devices.join(', ')}` : 'No MIDI pedal found yet. Plug it in with a USB-C adapter. Bluetooth MIDI pedals: switch them to keyboard (HID) mode instead.')}
        </p>
      )}
    </section>
  )
}

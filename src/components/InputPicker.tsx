// Choose what the app listens to: the phone mic (acoustic) or a USB amp / audio interface (electric).
import { useEffect, useState } from 'react'
import { getChoice, listInputs, onInputChange, setChoice, type InputChoice, type InputDevice } from '../audio/input'
import { GearSetup } from './GearSetup'

export function InputPicker({ active, onChanged, needsSetup = false }: { active?: { label: string; external: boolean } | null; onChanged?: () => void; needsSetup?: boolean }) {
  const [open, setOpen] = useState(false)
  const [choice, setC] = useState<InputChoice>(getChoice())
  const [devs, setDevs] = useState<InputDevice[]>([])
  const [busy, setBusy] = useState(false)
  const [setup, setSetup] = useState(false)

  useEffect(() => onInputChange(() => setC(getChoice())), [])
  useEffect(() => {
    if (!open) return
    let alive = true
    const refresh = async (ask: boolean) => {
      setBusy(true)
      const d = await listInputs(ask)
      if (alive) { setDevs(d); setBusy(false) }
    }
    void refresh(true)
    const md = navigator.mediaDevices
    const onDev = () => void refresh(false)
    md?.addEventListener?.('devicechange', onDev)
    return () => { alive = false; md?.removeEventListener?.('devicechange', onDev) }
  }, [open])

  const pick = (c: InputChoice) => { setChoice(c); setC(c); onChanged?.() }
  const usb = devs.filter(d => d.external)
  const now = active ? (active.external ? 'amp' : 'mic') : choice === 'mic' ? 'mic' : choice === 'auto' ? 'auto' : 'amp'

  return (
    <>
      <button className={`btn sm input-btn${needsSetup ? ' needs-setup' : ''}`} onClick={() => setOpen(true)} aria-label={needsSetup ? 'Choose and set up the sound input (not set up yet)' : 'Choose the sound input'}>
        {now === 'amp' ? '🎸' : '🎤'} {active ? (active.external ? 'Amp' : 'Mic') : choice === 'auto' ? 'Auto' : choice === 'mic' ? 'Mic' : 'Amp'} ▾
        {needsSetup && <i className="setup-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Sound input" onClick={e => e.stopPropagation()}>
            <div className="sheet-head">
              <h2>Sound input</h2>
              <button className="btn sm" onClick={() => setOpen(false)}>Done</button>
            </div>
            {needsSetup && (
              <div className="notice small setup-first">
                <span><b>First time?</b> A two-minute setup makes note detection and timing match your mic or amp.</span>
                <button className="btn sm primary" onClick={() => { setOpen(false); setSetup(true) }}>Set it up now</button>
              </div>
            )}
            {active && <p className="small muted" style={{ margin: 0 }}>Listening to: <b style={{ color: 'var(--pearl)' }}>{active.label}</b></p>}
            <ul className="song-list">
              <li className={choice === 'auto' ? 'on' : ''}>
                <button className="song-open" onClick={() => pick('auto')}>
                  <b>Automatic</b>
                  <span className="small muted">Use the amp / interface when it's plugged in, otherwise the phone mic.</span>
                </button>
              </li>
              <li className={choice === 'mic' ? 'on' : ''}>
                <button className="song-open" onClick={() => pick('mic')}>
                  <b>🎤 Phone microphone</b>
                  <span className="small muted">For acoustic guitar. Hold the phone 30–50 cm from the soundhole.</span>
                </button>
              </li>
              {devs.map(d => (
                <li key={d.id} className={choice === d.id ? 'on' : ''}>
                  <button className="song-open" onClick={() => pick(d.id)}>
                    <b>{d.external ? '🎸 ' : ''}{d.label}</b>
                    <span className="small muted">{d.external ? 'USB amp / audio interface' : 'Built-in'}</span>
                  </button>
                </li>
              ))}
            </ul>
            {busy && <p className="small muted">Looking for inputs…</p>}
            {!busy && usb.length === 0 && (
              <p className="notice small">
                No USB amp found yet. Plug the Amphonix 2 into the phone's USB-C port (USB-C to USB-C cable), switch it on,
                then reopen this list. If it still isn't listed, keep <b>Automatic</b>: Android usually sends a plugged-in
                USB amp to apps by itself.
              </p>
            )}
            <div className="panel small" style={{ display: 'grid', gap: 6 }}>
              <b>Electric guitar through the Amphonix 2</b>
              <span className="muted">• The app hears the amp's USB signal directly, so no mic or room noise.</span>
              <span className="muted">• Use a clean or lightly driven preset with delay and reverb off while learning a tab. Heavy distortion and echoes make notes harder to tell apart.</span>
              <span className="muted">• Phone sound (YouTube, "Hear it") usually plays in the amp's headphones too. If the app reacts to notes in the video, turn the video down.</span>
              <span className="muted">• Run <b>Set up this input</b> once for the amp and once for the phone mic: it tunes note detection and timing for each.</span>
            </div>
            <button className="btn primary" onClick={() => { setOpen(false); setSetup(true) }}>Set up this input</button>
          </div>
        </div>
      )}
      {setup && <GearSetup onClose={() => { setSetup(false); onChanged?.() }} />}
    </>
  )
}

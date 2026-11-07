// Audio setups (rig.ts) on screen: what the setup does now, the one-tap stereo switch for wired headphones on the pedal,
// "this is my pedal" for an input with a generic name, playback of your guitar for interfaces, and the timing check
// per setup. Shown in the Sound input sheet, Settings → Sound, the beat maker (chip) and as a notice when the pedal is
// plugged in.
import { useEffect, useState } from 'react'
import { Ico } from './Icon'
import { GearSetup } from './GearSetup'
import { listInputs, filtersStillOn, type InputDevice } from '../audio/input'
import { isPedal, markPedal, monitorVol, pedalPlugged, rigLabel, setMonitor, setMonitorVol, setStereoWithPedal, stereoOverride, switchedAt, useRig, onRig } from '../audio/rig'
import { latencyMs, timingChecked, useGear, type InputKind } from '../audio/gear'

function useMonitor() {
  const [, bump] = useState(0)
  useEffect(() => onRig(() => bump(n => n + 1)), [])
  try { return (JSON.parse(localStorage.getItem('kg:rig') ?? '{}') as { monitor?: boolean }).monitor === true } catch { return false }
}

/** The whole setup panel. */
export function AudioSetup({ compact = false }: { compact?: boolean }) {
  const r = useRig()
  useGear()
  const monitorOn = useMonitor()
  const [devs, setDevs] = useState<InputDevice[]>([])
  const [check, setCheck] = useState(false)
  useEffect(() => {
    let alive = true
    const refresh = () => void listInputs().then(d => { if (alive) setDevs(d) }).catch(() => {})
    refresh()
    const md = navigator.mediaDevices
    md?.addEventListener?.('devicechange', refresh)
    return () => { alive = false; md?.removeEventListener?.('devicechange', refresh) }
  }, [])
  const pedal = pedalPlugged()
  const kind: InputKind = r === 'pedal' ? 'pedal' : 'usb'
  const unknown = devs.filter(d => d.external && !isPedal(d.label))
  const marked = devs.filter(d => d.external && isPedal(d.label) && !/pocket ?master|sonicake|\bqme\b/i.test(d.label))
  const filters = filtersStillOn()

  return (
    <div className="stack audio-setup" style={{ gap: 8 }} data-testid="audio-setup">
      <p className="row" style={{ gap: 8, margin: 0, alignItems: 'center' }}>
        <Ico n={r === 'pedal' ? 'guitar' : 'headphones'} />
        <b data-testid="rig-now">{rigLabel(r)}</b>
      </p>
      {pedal ? (
        <>
          <p className="small muted" style={{ margin: 0 }}>
            {r === 'pedal'
              ? <>Your Pocket Master is plugged in, so everything KGuitar plays (backing, drums, loops, Hear it) is mono, the same on both sides, and your wireless hears all of it. KGuitar never plays your guitar back: the pedal already sends it to your ears with no delay.</>
              : <>Stereo while you use wired headphones in the pedal. Switch back before you use the wireless (it only hears the left side).</>}
          </p>
          <button className={`btn sm${r === 'pedal' ? '' : ' primary'}`} onClick={() => setStereoWithPedal(!stereoOverride())} data-testid="rig-switch">
            {r === 'pedal' ? 'Using wired headphones? Switch to stereo' : 'Back to mono (wireless)'}
          </button>
        </>
      ) : (
        <p className="small muted" style={{ margin: 0 }}>Stereo. When your Pocket Master is plugged in, KGuitar switches to mono for your wireless by itself.</p>
      )}

      {unknown.map(d => (
        <div key={d.id} className="row small" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>Is <b>{d.label}</b> your Pocket Master with the wireless?</span>
          <button className="btn sm" onClick={() => markPedal(d.label, true)} data-testid="rig-mark">Yes, that's my pedal</button>
        </div>
      ))}
      {marked.map(d => (
        <div key={d.id} className="row small" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span><b>{d.label}</b> is your pedal.</span>
          <button className="btn sm ghost" onClick={() => markPedal(d.label, false)}>It isn't</button>
        </div>
      ))}

      <div className="row small" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>Timing for this setup: <b data-testid="rig-timing">{latencyMs(kind)} ms</b> {timingChecked(kind) ? '(checked)' : '(a guess)'}</span>
        <button className={`btn sm${timingChecked(kind) ? ' ghost' : ' primary'}`} onClick={() => setCheck(true)}>{timingChecked(kind) ? 'Check again' : 'Check the timing'}</button>
      </div>
      {!compact && r === 'pedal' && !timingChecked('pedal') && (
        <p className="small muted" style={{ margin: 0 }}>Put the wireless in and your headphones on, then strum muted on each of the clicks. It takes about 10 seconds and keeps your loops on the beat.</p>
      )}

      {r !== 'pedal' && !compact && (
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={monitorOn} onChange={e => setMonitor(e.target.checked)} data-testid="rig-monitor" />
          <span><b>Hear my guitar through KGuitar</b><span className="muted"> Only for a computer audio interface with no headphone mix of its own. It adds a small delay, so leave it off when your pedal or amp lets you hear yourself. Never with the phone mic (it would howl).</span></span>
        </label>
      )}
      {r === 'interface' && (
        <label className="row small" style={{ gap: 8, alignItems: 'center' }}>
          <span>Your guitar's level</span>
          <input type="range" min={0} max={1.5} step={0.05} defaultValue={monitorVol()} onChange={e => setMonitorVol(Number(e.target.value))} style={{ flex: 1 }} aria-label="Your guitar's level" />
        </label>
      )}
      {filters.length > 0 && (
        <p className="small notice" style={{ margin: 0 }}>The {filters.join(' and ')} filter{filters.length > 1 ? 's' : ''} stayed on (the phone ignored KGuitar asking to turn {filters.length > 1 ? 'them' : 'it'} off): long notes may be heard as shorter. Plugging in by USB usually avoids it.</p>
      )}
      {check && <GearSetup onClose={() => setCheck(false)} />}
    </div>
  )
}

/** A small chip with the setup's name that opens the panel (the beat maker and anywhere without the Sound input sheet). */
export function RigChip() {
  const r = useRig()
  const [open, setOpen] = useState(false)
  if (!pedalPlugged() && r === 'stereo') return null
  return (
    <>
      <button className={`btn sm${r === 'pedal' ? ' on' : ''}`} onClick={() => setOpen(true)} data-testid="rig-chip" aria-label={`Audio setup: ${rigLabel(r)}`}>
        <Ico n={r === 'pedal' ? 'guitar' : 'headphones'} /> {r === 'pedal' ? 'Mono' : r === 'interface' ? 'Hearing you' : 'Stereo'}
      </button>
      {open && (
        <div className="sheet-backdrop" onClick={() => setOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Audio setup" onClick={e => e.stopPropagation()}>
            <div className="sheet-head"><h2>Audio setup</h2><button className="btn sm" onClick={() => setOpen(false)}>Done</button></div>
            <AudioSetup />
          </div>
        </div>
      )}
    </>
  )
}

/** The notice when the pedal is plugged in (it switches to mono by itself): a few seconds, with the stereo switch. */
export function RigNotice() {
  const r = useRig()
  const [shown, setShown] = useState(0)
  const at = switchedAt()
  useEffect(() => {
    if (!at || at === shown) return
    const id = setTimeout(() => setShown(at), 9000)
    return () => clearTimeout(id)
  }, [at, shown])
  if (!at || at === shown || !pedalPlugged()) return null
  return (
    <div className="rig-notice notice small" role="status" data-testid="rig-notice">
      <Ico n="guitar" />
      <span><b>Pocket Master plugged in.</b> {r === 'pedal' ? 'Sound is mono for your wireless, and KGuitar won\'t play your guitar back.' : 'Stereo for wired headphones.'}</span>
      <button className="btn sm" onClick={() => setStereoWithPedal(!stereoOverride())}>{r === 'pedal' ? 'Wired headphones? Stereo' : 'Back to mono'}</button>
      <button className="btn sm ghost" onClick={() => setShown(at)} aria-label="Close">✕</button>
    </div>
  )
}

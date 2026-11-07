// The looper's timing: which input it records from, and the delay taken off every take (sound out → your ears and
// hands → back in). The timing check plays 8 clicks: with the phone mic it hears them itself, with an amp or pedal you
// play a muted strum on each one. ±10 ms by ear too.
import { useState } from 'react'
import { InputRecorder, measureLatency } from '../audio/looper'
import { gear, kindOf, latencyMs, setGear, useGear } from '../audio/gear'
import { InputPicker } from '../components/InputPicker'

export function TimingCheck() {
  useGear()
  const [input, setInput] = useState<{ label: string; external: boolean } | null>(null)
  const [calib, setCalib] = useState<{ running: boolean; click: number; result?: number | null } | null>(null)
  const [err, setErr] = useState('')
  const kind = kindOf(input?.external)
  const ms = latencyMs(kind)
  const measured = gear(kind).latencyMs >= 0
  const run = async () => {
    setErr('')
    const rec = new InputRecorder()
    try { await rec.start() } catch { setErr('The timing check needs the microphone (or amp input): allow it and try again.'); return }
    const inp = rec.input
    setInput(inp ? { label: inp.label, external: inp.external } : null)
    setCalib({ running: true, click: -1 })
    const r = await measureLatency(rec, i => setCalib(c => (c ? { ...c, click: i } : c)))
    rec.stop()
    if (r !== null) setGear(kindOf(inp?.external), { latencyMs: r })
    setCalib({ running: false, click: 8, result: r })
  }
  return (
    <div className="stack" style={{ gap: 6 }} data-testid="timing-check">
      <div className="row small" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>Records from:</span>
        <InputPicker active={input} />
      </div>
      <div className="row small" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>Timing fix{input ? (input.external ? ' (amp or pedal)' : ' (phone mic)') : ''}: <b>{ms} ms</b>{measured ? '' : ' (a guess)'}</span>
        <button className="btn sm" onClick={() => setGear(kind, { latencyMs: Math.max(0, ms - 10) })} aria-label="10 ms less">−10</button>
        <button className="btn sm" onClick={() => setGear(kind, { latencyMs: Math.min(500, ms + 10) })} aria-label="10 ms more">+10</button>
        <button className="btn sm" onClick={() => void run()} disabled={!!calib?.running}>Timing check</button>
      </div>
      {calib && (
        <p className="notice small" style={{ margin: 0 }}>
          {calib.running
            ? `Play a short muted strum exactly on each click (${Math.max(0, calib.click + 1)} / 8). With the phone mic and no headphones, just stay quiet: it hears the clicks itself.`
            : calib.result !== null && calib.result !== undefined
              ? `Done: your setup delays sound by about ${calib.result} ms, so every take is moved back by that much.`
              : "Couldn't hear clear clicks or strums. Try again a little louder, or set it by ear: if your loops sound late, raise it."}
        </p>
      )}
      {err && <p className="small" role="alert" style={{ margin: 0 }}>{err}</p>}
      <p className="small muted" style={{ margin: 0 }}>If a loop sounds a little late or early against the beat, run the check once for each input (phone mic, amp, the pedal with the wireless). Bluetooth headphones add a lot of delay; wired ones or the pedal's own output are best.</p>
    </div>
  )
}

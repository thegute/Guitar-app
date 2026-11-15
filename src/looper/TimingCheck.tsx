// The looper's timing: which input it records from, and the delay taken off every take (sound out → your ears and
// hands → back in). With the phone mic it runs a 6-click speaker loopback check (with 1-tap switch to the 8-click
// strum check when wearing headphones); with an amp or pedal + wireless it runs a 4-beat count-in followed by 8 muted strums.
import { useState } from 'react'
import { InputRecorder, calibrateTiming, type CalibrationMethod, type CalibrationResult } from '../audio/looper'
import { gear, kindOf, latencyMs, setGear, useGear } from '../audio/gear'
import { InputPicker } from '../components/InputPicker'

export function TimingCheck() {
  useGear()
  const [input, setInput] = useState<{ label: string; external: boolean } | null>(null)
  const [calib, setCalib] = useState<{
    running: boolean
    phase: 'count-in' | 'click'
    index: number
    total: number
    method: CalibrationMethod
    result?: CalibrationResult
  } | null>(null)
  const [err, setErr] = useState('')
  const kind = kindOf(input?.external)
  const profile = gear(kind)
  const ms = latencyMs(kind)
  const measured = profile.latencyMs >= 0

  const run = async (overrideMethod?: CalibrationMethod) => {
    setErr('')
    const rec = new InputRecorder()
    try { await rec.start() } catch { setErr('The timing check needs the microphone (or amp input): allow it and try again.'); return }
    const inp = rec.input
    setInput(inp ? { label: inp.label, external: inp.external } : null)
    const activeKind = kindOf(inp?.external)
    const method: CalibrationMethod = overrideMethod ?? (activeKind === 'mic' ? 'loopback' : 'strum')
    setCalib({ running: true, phase: method === 'strum' ? 'count-in' : 'click', index: 0, total: method === 'strum' ? 4 : 6, method })
    const res = await calibrateTiming(rec, {
      method,
      onPhase: (phase, index, total) => setCalib(c => (c ? { ...c, phase, index, total } : c)),
    })
    rec.stop()
    if (res.ok && res.latencyMs !== null) {
      setGear(activeKind, { latencyMs: res.latencyMs, spreadMs: res.spreadMs ?? undefined, method: res.method, setAt: Date.now() })
    }
    setCalib({ running: false, phase: 'click', index: res.total, total: res.total, method, result: res })
  }

  return (
    <div className="stack" style={{ gap: 6 }} data-testid="timing-check">
      <div className="row small" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>Records from:</span>
        <InputPicker active={input} />
      </div>
      <div className="row small" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>
          Timing fix{input ? (kind === 'pedal' ? ' (pedal + wireless)' : input.external ? ' (amp)' : ' (phone mic)') : ''}:{' '}
          <b>{ms} ms</b>
          {measured && profile.spreadMs !== undefined ? ` (±${profile.spreadMs} ms)` : ''}
          {measured ? '' : ' (a guess)'}
        </span>
        <button className="btn sm" onClick={() => setGear(kind, { latencyMs: Math.max(0, ms - 10) })} aria-label="10 ms less">−10</button>
        <button className="btn sm" onClick={() => setGear(kind, { latencyMs: Math.min(500, ms + 10) })} aria-label="10 ms more">+10</button>
        <button className="btn sm" onClick={() => void run()} disabled={!!calib?.running}>Timing check</button>
        {kind === 'mic' && (
          <button className="btn sm ghost" onClick={() => void run('strum')} disabled={!!calib?.running}>8-click strum check</button>
        )}
      </div>
      {calib && (
        <div className="notice small stack" style={{ margin: 0, gap: 6 }}>
          <p style={{ margin: 0 }}>
            {calib.running
              ? calib.method === 'loopback'
                ? `Listening for speaker clicks (${calib.index + 1} / ${calib.total}): keep the speaker up and strings muted.`
                : calib.phase === 'count-in'
                  ? `Get ready… count-in ${calib.index + 1} / ${calib.total}, then strum muted strings on each click.`
                  : `Play a short muted strum right on each click (${calib.index + 1} / ${calib.total}).`
              : calib.result?.ok && calib.result.latencyMs !== null
                ? `Done: your setup delays sound by about ${calib.result.latencyMs} ms${calib.result.spreadMs !== null ? ` (±${calib.result.spreadMs} ms consistency)` : ''}, so every take is moved back by that much.`
                : calib.result?.message ?? "Couldn't hear clear clicks or strums. Try again a little louder, or set it by ear."}
          </p>
          {!calib.running && calib.result && !calib.result.ok && calib.method === 'loopback' && (
            <div className="row">
              <button className="btn sm" onClick={() => void run('strum')}>Switch to 8-click strum check</button>
            </div>
          )}
        </div>
      )}
      {err && <p className="small" role="alert" style={{ margin: 0 }}>{err}</p>}
      <p className="small muted" style={{ margin: 0 }}>If a loop sounds a little late or early against the beat, run the check once for each input (phone mic, amp, the pedal with the wireless). Bluetooth headphones add a lot of delay; wired ones or the pedal's own output are best.</p>
    </div>
  )
}


// Jam → Play with a band → Improv coach: "Coach my solo" listens while you solo over the band, then says what went well
// and the one thing to work on (with a link to the drill for it). Uses the mic or your USB amp.
import { useEffect, useRef, useState } from 'react'
import { acquireListener, type ListenerSession } from '../engine/listener'
import { audio } from '../audio/engine'
import { OnsetDetector } from '../learn/targets'
import { launch } from '../search/launch'
import { speak } from '../assistant/speak'
import { coachPrefs } from './advice'
import { countUse } from '../usage'
import { analyseImprov, type ImprovChord, type ImprovNote, type ImprovReport } from './improv'

export function ImprovCoach({ clock, chords, loopBeats, keyPcs, keyName, playing }: { clock: () => { T0: number; spb: number } | null; chords: ImprovChord[]; loopBeats: number; keyPcs: number[]; keyName: string; playing: boolean }) {
  const [on, setOn] = useState(false)
  const [rep, setRep] = useState<ImprovReport | null>(null)
  const [count, setCount] = useState(0)
  const [err, setErr] = useState('')
  const notes = useRef<ImprovNote[]>([])
  const tracker = useRef<ListenerSession | null>(null)
  const args = useRef({ chords, loopBeats, keyPcs, keyName }); args.current = { chords, loopBeats, keyPcs, keyName }
  const finish = () => {
    tracker.current?.stop(); tracker.current = null
    setOn(false)
    const a = args.current
    const r = analyseImprov(notes.current, a.chords, a.loopBeats, a.keyPcs, a.keyName)
    setRep(r)
    if (coachPrefs().voice && r.notes >= 8) void speak(`${r.good} ${r.say}`, { gemini: true })
  }
  // the band stopped: the solo's over
  useEffect(() => { if (!playing && on) finish() }, [playing]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { tracker.current?.stop() }, [])
  async function start() {
    setErr(''); setRep(null); notes.current = []; setCount(0)
    try {
      const pt = acquireListener('improv-coach', { autoGate: true, suppressBleed: true })
      const det = new OnsetDetector()
      const pushNote = (beat: number, midi: number) => {
        if (beat < 0) return
        const last = notes.current[notes.current.length - 1]
        if (last && Math.abs(last.beat - beat) <= 0.08 && last.midi === midi) return
        notes.current.push({ beat, midi })
        setCount(notes.current.length)
      }
      pt.onNote = e => {
        const c = clock()
        if (!c) return
        const beat = (e.time - pt.latencySec() - c.T0) / c.spb
        pushNote(beat, e.midi)
      }
      pt.onFrame = f => {
        const c = clock()
        if (!c) return
        const beat = (audio().currentTime - pt.latencySec() - c.T0) / c.spb
        const o = det.feed(f.midi, beat, f.level)
        if (o) pushNote(o.t, o.midi)
      }
      await pt.start()
      tracker.current = pt
      setOn(true)
      countUse('jam:improv-coach')
    } catch { setErr('The improv coach needs the microphone (or your USB amp).') }
  }
  const drill: Partial<Record<ImprovReport['focus'], { label: string; go: () => void }>> = {
    land: { label: 'Target notes', go: () => launch({ go: { tool: 'targets' } }) },
    motif: { label: 'Call and response', go: () => launch({ go: { tool: 'cr' } }) },
    space: { label: 'Call and response', go: () => launch({ go: { tool: 'cr' } }) },
    scale: { label: 'Scales', go: () => launch({ tool: 'scales' }) },
  }
  return (
    <div className="stack improv-coach" style={{ gap: 8 }} data-testid="improv-coach">
      <p className="small" style={{ margin: 0 }}>Start the band, press Coach my solo and improvise over it. When you stop (or the band does) the coach tells you what went well and the one thing to work on.</p>
      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <button className={`btn${on ? '' : ' primary'}`} data-testid="improv-go" disabled={!playing && !on} onClick={() => (on ? finish() : void start())}>{on ? 'Done: how was it?' : 'Coach my solo'}</button>
        {on && <span className="small muted">Listening… {count} notes</span>}
        {!playing && !on && <span className="small muted">Start the band first.</span>}
      </div>
      {err && <p className="notice small">{err}</p>}
      {rep && (
        <div className="coach-card" role="status" data-testid="improv-report">
          {rep.good && <p className="small" style={{ margin: 0 }}>{rep.good}</p>}
          <p style={{ margin: 0 }}><b>{rep.say}</b></p>
          {rep.notes >= 8 && <p className="small muted" style={{ margin: 0 }}>{rep.notes} notes · {rep.inKey}% in the scale · chord tones at {rep.landed}/{rep.changes} changes · range {rep.range} frets · {rep.space}% of beats left open</p>}
          {drill[rep.focus] && <button className="btn sm" onClick={drill[rep.focus]!.go}>{drill[rep.focus]!.label}</button>}
        </div>
      )}
    </div>
  )
}

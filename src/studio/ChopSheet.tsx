// Chop a riff: record a few seconds of guitar (or anything), the app cuts it at every picked note and puts the
// slices on Your pads, one note per pad. Then play the riff back from the pads in any order, or play one slice up and
// down the keyboard (Keyboard → Sound → Your pads).
import { useEffect, useMemo, useRef, useState } from 'react'
import { haptic, quietForMic } from '../audio/tapFeel'
import { audio, route } from '../audio/engine'
import { InputRecorder } from '../audio/looper'
import { kindOf, latencyMs } from '../audio/gear'
import { useBack } from '../back'
import { Ico } from '../components/Icon'
import { usePedals } from '../controls/pedals'
import { newId, type Beat } from './beat'
import { USER_PADS, detectRoot, sliceAtOnsets } from './pads'
import { saveSample } from './padSamples'
import { applyMicFx } from './micFx'
import { MicFxPicker, useMicFx } from './MicFxPicker'

const MAX_SECS = 20

export function ChopSheet({ setBeat, onClose, onDone }: { setBeat: (f: (b: Beat) => Beat, remember?: boolean) => void; onClose: () => void; onDone: (n: number) => void }) {
  useBack(true, onClose)
  const [micFx] = useMicFx()
  const rec = useRef<InputRecorder | null>(null)
  const [state, setState] = useState<'idle' | 'rec' | 'cut'>('idle')
  const [level, setLevel] = useState(0)
  const [secs, setSecs] = useState(0)
  const [msg, setMsg] = useState('')
  const [take, setTake] = useState<{ data: Float32Array; sr: number } | null>(null)
  const [max, setMax] = useState(16)
  const t0 = useRef(0)
  useEffect(() => {
    let alive = true
    void (async () => {
      try { rec.current = new InputRecorder(); await rec.current.start() } catch { if (alive) setMsg("The microphone couldn't be opened. Allow microphone access for KGuitar, then try again.") }
    })()
    const id = setInterval(() => {
      setLevel(rec.current?.level ?? 0)
      if (t0.current) { const s = audio().currentTime - t0.current; setSecs(s); if (s >= MAX_SECS) void stop() }
    }, 100)
    return () => { alive = false; clearInterval(id); rec.current?.stop(); if (t0.current) { t0.current = 0; quietForMic(false) } }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => { if (state === 'rec') return; haptic('medium'); quietForMic(true); t0.current = audio().currentTime; setSecs(0); setTake(null); setState('rec'); setMsg('') }
  const stop = async () => {
    if (!t0.current) return
    const from = t0.current
    t0.current = 0
    quietForMic(false)
    haptic('medium')
    setState('cut')
    const ctx = audio()
    const lat = latencyMs(kindOf(rec.current?.input?.external)) / 1000
    try {
      const raw = await rec.current!.capture(Math.max(0, from - lat), ctx.currentTime - from)
      let peak = 0
      for (let i = 0; i < raw.length; i++) peak = Math.max(peak, Math.abs(raw[i]))
      if (peak < 0.01) { setMsg('That was too quiet. Play a little louder or closer to the mic, then try again.'); setState('idle'); return }
      const g = Math.min(8, 0.85 / peak)
      const fxd = await applyMicFx(raw.map(v => v * g), ctx.sampleRate, micFx, { keepLength: true })
      setTake({ data: fxd, sr: ctx.sampleRate })
    } catch { setMsg("Couldn't record. Check the microphone and try again."); setState('idle'); return }
    setState('idle')
  }
  // a pedal: press to start, press again to stop
  usePedals({ startStop: () => (state === 'rec' ? void stop() : start()), record: () => (state === 'rec' ? void stop() : start()) })
  const slices = useMemo(() => (take ? sliceAtOnsets(take.data, take.sr, max) : []), [take, max])
  const hear = (i: number) => {
    if (!take) return
    const ctx = audio()
    const buf = ctx.createBuffer(1, take.data.length, take.sr)
    buf.getChannelData(0).set(take.data)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(route('any', 'loops'))
    const s = i < 0 ? { start: 0, end: take.data.length / take.sr } : slices[i]
    src.start(0, s.start, s.end - s.start)
  }
  const put = async () => {
    if (!take || !slices.length) return
    const id = newId()
    await saveSample(id, take.data, take.sr)
    const defs = slices.map((s, i) => {
      const piece = take.data.subarray(Math.round(s.start * take.sr), Math.round(s.end * take.sr))
      return [USER_PADS[i], { src: 'rec' as const, sample: id, start: s.start, end: s.end, root: detectRoot(piece, take.sr) ?? undefined, name: `Riff ${i + 1}`, choke: 1 }] as const
    })
    setBeat(b => ({ ...b, pads: { ...b.pads, ...Object.fromEntries(defs) } }), true)
    onDone(slices.length)
  }
  const dur = take ? take.data.length / take.sr : 0
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet chop" role="dialog" aria-modal="true" aria-label="Chop a riff onto pads" onClick={e => e.stopPropagation()} data-testid="chop">
        <div className="sheet-head"><h2>Chop a riff</h2><button className="btn sm" onClick={onClose}>Close</button></div>
        <p className="small muted" style={{ margin: 0 }}>Record a short riff or melody (up to {MAX_SECS} s). It's cut at every note you pick and the notes go onto Your pads, one per pad, so you can play them in any order. A foot pedal starts and stops it too.</p>
        <MicFxPicker />
        <button className={`btn big chop-rec${state === 'rec' ? ' on' : ''}`} onClick={() => (state === 'rec' ? void stop() : start())} disabled={state === 'cut'} data-testid="chop-rec">
          {state === 'rec' ? <><Ico n="stop" fill /> Stop ({secs.toFixed(1)} s)</> : state === 'cut' ? 'Cutting…' : <><Ico n="record" fill className="rec-dot" /> {take ? 'Record again' : 'Record a riff'}</>}
          <span className="pad-meter" style={{ ['--lv' as string]: String(Math.min(1, level * 3)) }} aria-hidden />
        </button>
        {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
        {take && (
          <>
            <div className="chop-wave" aria-label={`${slices.length} notes found`}>
              <Peaks data={take.data} />
              {slices.map((s, i) => <button key={i} className="chop-mark" style={{ left: `${(s.start / dur) * 100}%` }} onClick={() => hear(i)} aria-label={`Hear note ${i + 1}`}>{i + 1}</button>)}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn sm" onClick={() => hear(-1)}><Ico n="play" fill /> Hear the riff</button>
              <span className="small">{slices.length ? `${slices.length} note${slices.length > 1 ? 's' : ''} found` : 'No clear notes found: pick each note a bit harder.'}</span>
              <label className="field st-field st-inline"><span>At most</span>
                <select className="select sm" value={max} onChange={e => setMax(Number(e.target.value))}>
                  {[4, 8, 12, 16].map(n => <option key={n} value={n}>{n} pads</option>)}
                </select>
              </label>
            </div>
            <button className="btn primary big" disabled={!slices.length} onClick={() => void put()} data-testid="chop-put">Put {slices.length} note{slices.length === 1 ? '' : 's'} on Your pads</button>
            <p className="small muted" style={{ margin: 0 }}>They replace Your pads 1 to {slices.length || 'N'} (↶ Undo brings the old ones back). Each slice stops the one before it, like a real string.</p>
          </>
        )}
      </div>
    </div>
  )
}

function Peaks({ data }: { data: Float32Array }) {
  const peaks = useMemo(() => {
    const n = 200, per = Math.max(1, Math.floor(data.length / n))
    return Array.from({ length: n }, (_, i) => { let m = 0; for (let k = i * per; k < Math.min(data.length, (i + 1) * per); k += 2) m = Math.max(m, Math.abs(data[k])); return m })
  }, [data])
  const top = Math.max(0.01, ...peaks)
  return (
    <svg viewBox={`0 0 ${peaks.length} 100`} preserveAspectRatio="none" aria-hidden>
      {peaks.map((p, i) => <rect key={i} x={i + 0.15} width={0.7} y={50 - (p / top) * 48} height={Math.max(1, (p / top) * 96)} />)}
    </svg>
  )
}

// Bend & vibrato trainer: a pitch needle from the fretted note to the bend's target, so you can hear and see when
// a bend is in tune, and a vibrato meter (how wide and how fast your vibrato is). Uses the tuner's pitch detection.
import { useEffect, useRef, useState } from 'react'
import { PitchTracker } from '../audio/pitch'
import { keepAwake } from '../audio/engine'
import { playNote } from '../audio/pluck'
import { bumpCounts, usePracticeTimer } from '../learn/progress'
import type { Instrument } from '../instrument'
import { freqToMidi, pcName } from '../theory/notes'
import { Chips, usePersist } from '../components/Controls'
import { stringName } from '../play/chordHelp'

const AMOUNTS = [{ id: 1, label: '½ step' }, { id: 2, label: 'Whole step' }, { id: 3, label: '1½ steps' }]

export function BendTrainer({ inst, onExit }: { inst: Instrument; onExit: () => void }) {
  const n = inst.midis.length
  const [mode, setMode] = usePersist<'bend' | 'vibrato'>('bendMode', 'bend')
  const [str, setStr] = usePersist('bendString', Math.max(0, n - 3))
  const [fret, setFret] = usePersist('bendFret', 7)
  const [amount, setAmount] = usePersist('bendAmount', 2)
  const [on, setOn] = useState(false)
  const [err, setErr] = useState('')
  const [now, setNow] = useState<number | null>(null)
  const [hits, setHits] = useState(0)
  const [vib, setVib] = useState<{ width: number; rate: number } | null>(null)
  const trace = useRef<{ t: number; m: number }[]>([])
  const holdSince = useRef(0)
  const counted = useRef(false)
  const tracker = useRef<PitchTracker | null>(null)
  const [, setTick] = useState(0)
  usePracticeTimer('warmup', on, true)
  const s = Math.min(str, n - 1)
  const start = inst.midis[s] + fret
  const target = start + amount
  const name = (m: number) => pcName(((m % 12) + 12) % 12, false)

  useEffect(() => () => { tracker.current?.stop(); void keepAwake(false) }, [])

  async function toggle() {
    if (on) { tracker.current?.stop(); tracker.current = null; setOn(false); void keepAwake(false); return }
    setErr('')
    try {
      const t = new PitchTracker()
      t.onReading = r => {
        const at = performance.now()
        if (!r || !r.freq) { if (at - (trace.current[trace.current.length - 1]?.t ?? 0) > 400) setNow(null); return }
        let m = freqToMidi(r.freq)
        // bends sit near the fretted note: fold octave mistakes back
        while (m - start > 9) m -= 12
        while (start - m > 9) m += 12
        trace.current.push({ t: at, m })
        while (trace.current.length && at - trace.current[0].t > 3000) trace.current.shift()
        setNow(m)
        setTick(x => x + 1)
      }
      await t.start()
      tracker.current = t
      setOn(true)
      void keepAwake(true)
    } catch {
      setErr('The trainer needs the microphone (or your USB amp): allow it for KGuitar and try again.')
    }
  }

  // in tune: within 15 cents of the target for a third of a second
  useEffect(() => {
    if (mode !== 'bend' || now === null) { holdSince.current = 0; return }
    const off = (now - target) * 100
    const t = performance.now()
    if (Math.abs(off) <= 15) {
      if (!holdSince.current) holdSince.current = t
      if (!counted.current && t - holdSince.current > 330) { counted.current = true; setHits(h => h + 1); bumpCounts({ bendsInTune: 1 }) }
    } else {
      holdSince.current = 0
      if ((now - start) * 100 < 30) counted.current = false // back down: the next bend can count
    }
  }, [now, mode, target, start])

  // vibrato: width and speed over the last 1.5 s
  useEffect(() => {
    if (mode !== 'vibrato') return
    const tr = trace.current.filter(p => performance.now() - p.t < 1500)
    if (tr.length < 25) { setVib(null); return }
    const ms = tr.map(p => p.m)
    const mean = ms.reduce((a, b) => a + b, 0) / ms.length
    const sorted = [...ms].sort((a, b) => a - b)
    const width = (sorted[Math.floor(sorted.length * 0.92)] - sorted[Math.floor(sorted.length * 0.08)]) * 100
    let cross = 0
    for (let i = 1; i < ms.length; i++) if ((ms[i - 1] - mean) * (ms[i] - mean) < 0) cross++
    const secs = (tr[tr.length - 1].t - tr[0].t) / 1000
    setVib({ width, rate: secs > 0 ? cross / 2 / secs : 0 })
  }, [now, mode])

  const off = now === null ? null : (now - target) * 100
  const progress = now === null ? null : (now - start) / amount
  const W = 300
  const pos = (m: number) => Math.max(6, Math.min(W - 6, 20 + ((m - start + 0.5) / (amount + 1)) * (W - 40)))
  const traceNow = trace.current
  const t0 = performance.now() - 3000
  const lo = start - 0.5, hi = target + 0.5
  const path = traceNow.map((p, i) => `${i ? 'L' : 'M'}${(((p.t - t0) / 3000) * W).toFixed(1)},${(70 - ((Math.max(lo, Math.min(hi, p.m)) - lo) / (hi - lo)) * 64).toFixed(1)}`).join(' ')
  const yOf = (m: number) => 70 - ((m - lo) / (hi - lo)) * 64

  return (
    <div className="stack bend-trainer" style={{ gap: 12 }}>
      <div className="row"><button className="btn sm" onClick={onExit}>← Back</button><h2 style={{ margin: 0 }}>Bends & vibrato</h2></div>
      <Chips label="Mode" items={[{ id: 'bend' as const, label: 'Bend to pitch' }, { id: 'vibrato' as const, label: 'Vibrato' }]} value={mode} onChange={setMode} />
      <div className="row" style={{ gap: 8 }}>
        <label className="field" style={{ flex: '1 1 140px' }}><span>String</span>
          <select className="select" value={s} onChange={e => setStr(Number(e.target.value))}>
            {inst.midis.map((_, i) => <option key={i} value={i}>{stringName(i, n, inst.midis, p => pcName(p, false))}</option>)}
          </select>
        </label>
        <label className="field" style={{ flex: '1 1 100px' }}><span>Fret</span>
          <select className="select" value={fret} onChange={e => setFret(Number(e.target.value))}>
            {Array.from({ length: 15 }, (_, i) => i + 3).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
      </div>
      {mode === 'bend' && <Chips label="Bend" items={AMOUNTS} value={amount} onChange={setAmount} />}
      <p className="small muted" style={{ margin: 0 }}>
        {mode === 'bend'
          ? <>Fret <b>{name(start)}</b> (fret {fret}) and push the string until it sounds like <b>{name(target)}</b>, the note {amount} fret{amount > 1 ? 's' : ''} higher. Use two or three fingers behind the fretting finger, and push from the wrist.</>
          : <>Hold <b>{name(start)}</b> (fret {fret}) and rock the string up and back down, evenly. Good vibrato is usually about 20–50 cents wide, 4–7 times a second.</>}
      </p>
      <div className="row" style={{ gap: 8 }}>
        <button className={`btn${on ? '' : ' primary'}`} onClick={() => void toggle()}>{on ? 'Stop listening' : 'Start listening'}</button>
        {mode === 'bend' && <button className="btn" onClick={() => { playNote(start, 0, 0.8); playNote(target, 0.9, 0.8) }}>▶ Hear the start and target</button>}
      </div>
      {err && <p className="notice small">{err}</p>}

      <div className="bend-meter" aria-live="polite">
        {mode === 'bend' ? (
          <>
            <svg viewBox={`0 0 ${W} 40`} width="100%" height="40" role="img" aria-label="Bend meter">
              <rect className="bm-track" x={pos(start)} y={16} width={pos(target) - pos(start)} height={8} rx={4} />
              <rect className="bm-zone" x={pos(target - 0.15)} y={8} width={pos(target + 0.15) - pos(target - 0.15)} height={24} rx={4} />
              <text className="bm-label" x={pos(start)} y={38} textAnchor="middle">{name(start)}</text>
              <text className="bm-label" x={pos(target)} y={38} textAnchor="middle">{name(target)}</text>
              {now !== null && <circle className={`bm-dot${off !== null && Math.abs(off) <= 15 ? ' ok' : ''}`} cx={pos(now)} cy={20} r={8} />}
            </svg>
            <p className="bend-read">
              {now === null ? (on ? 'Play the note…' : 'Tap Start listening, then bend.')
                : off !== null && Math.abs(off) <= 15 ? <b className="ok">In tune ✓</b>
                  : progress !== null && progress < 0.15 ? 'Now push the string up'
                    : off! < 0 ? <>Push a bit more: <b>{Math.round(-off!)} cents</b> under</>
                      : <>Too far: <b>{Math.round(off!)} cents</b> over</>}
            </p>
            <p className="small muted" style={{ margin: 0 }}>Bends in tune this session: <b>{hits}</b></p>
          </>
        ) : (
          <p className="bend-read">
            {!vib ? (on ? 'Hold the note and add vibrato…' : 'Tap Start listening.')
              : <>Width <b>{Math.round(vib.width)} cents</b>, speed <b>{vib.rate.toFixed(1)} a second</b>
                {' · '}{vib.width < 15 ? 'a little wider' : vib.width > 70 ? 'a little narrower' : vib.rate < 3.5 ? 'a bit faster' : vib.rate > 8 ? 'a bit slower and wider' : <b className="ok">nice and even</b>}</>}
          </p>
        )}
        <svg className="bend-trace" viewBox={`0 0 ${W} 76`} width="100%" height="76" role="img" aria-label="Your pitch over the last three seconds">
          <line className="bt-line" x1={0} x2={W} y1={yOf(start)} y2={yOf(start)} />
          {mode === 'bend' && <line className="bt-target" x1={0} x2={W} y1={yOf(target)} y2={yOf(target)} />}
          {path && <path className="bt-path" d={path} />}
        </svg>
      </div>
    </div>
  )
}

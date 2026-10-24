import { useEffect, useRef, useState } from 'react'
import { Metronome, type Accent, type ClickSound } from '../audio/metronome'
import { GROOVES, loadKit } from '../audio/drums'
import { keepAwake } from '../audio/engine'
import { Chips, Field, usePersist } from '../components/Controls'

export const metronome = new Metronome()

const SIGS = [
  { id: '2/4', beats: 2, sub: 1 }, { id: '3/4', beats: 3, sub: 1 }, { id: '4/4', beats: 4, sub: 1 },
  { id: '5/4', beats: 5, sub: 1 }, { id: '6/8', beats: 6, sub: 1 }, { id: '7/8', beats: 7, sub: 1 }, { id: '12/8', beats: 12, sub: 1 },
]
const SUBS = [
  { id: 1, label: '♩ Quarters' }, { id: 2, label: '♪♪ Eighths' }, { id: 3, label: 'Triplets' }, { id: 4, label: 'Sixteenths' },
]
const SOUNDS: { id: ClickSound; label: string }[] = [
  { id: 'click', label: 'Click' }, { id: 'wood', label: 'Woodblock' }, { id: 'beep', label: 'Beep' },
  { id: 'sticks', label: 'Cross-stick' }, { id: 'cowbell', label: 'Cowbell' }, { id: 'hihat', label: 'Hi-hat' },
]

function defaultAccents(beats: number): Accent[] {
  const a: Accent[] = Array(beats).fill(1)
  a[0] = 2
  if (beats === 6) a[3] = 2
  if (beats === 12) { a[3] = 2; a[6] = 2; a[9] = 2 }
  return a
}

export function MetronomeScreen() {
  const [bpm, setBpm] = usePersist('bpm', 100)
  const [sig, setSig] = usePersist('sig', '4/4')
  const [sub, setSub] = usePersist('sub', 1)
  const [sound, setSound] = usePersist<ClickSound>('click', 'click')
  const [accents, setAccents] = usePersist<Accent[]>('accents', defaultAccents(4))
  const [trainer, setTrainer] = usePersist('trainer', { on: false, step: 5, everyBars: 4, max: 160 })
  const [groove, setGroove] = usePersist('metroGroove', '')
  const [running, setRunning] = useState(metronome.running)
  const [beat, setBeat] = useState(-1)
  const taps = useRef<number[]>([])
  const beats = SIGS.find(s => s.id === sig)?.beats ?? 4

  // keep the engine in sync with the controls
  useEffect(() => {
    metronome.bpm = bpm
    metronome.beatsPerBar = beats
    metronome.subdivision = sub
    metronome.sound = sound
    metronome.groove = groove
    if (groove || ['sticks', 'cowbell', 'hihat'].includes(sound)) void loadKit()
    metronome.accents = accents.length === beats ? accents : defaultAccents(beats)
    metronome.trainer = { ...trainer }
    metronome.onBpm = b => setBpm(b)
  }, [bpm, beats, sub, sound, accents, trainer, setBpm, groove])

  useEffect(() => {
    if (accents.length !== beats) setAccents(defaultAccents(beats))
  }, [beats, accents.length, setAccents])

  // animate the beat lights in time with the audio clock
  useEffect(() => {
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const t = metronome.running ? metronome.current() : null
      setBeat(t ? t.beat : -1)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  function toggle() {
    if (metronome.running) {
      metronome.stop()
      setRunning(false)
      void keepAwake(false)
    } else {
      metronome.start()
      setRunning(true)
      void keepAwake(true)
    }
  }
  function tap() {
    const now = performance.now()
    taps.current = [...taps.current.filter(t => now - t < 2500), now]
    if (taps.current.length >= 2) {
      const iv = taps.current.slice(1).map((t, i) => t - taps.current[i])
      const avg = iv.reduce((a, b) => a + b, 0) / iv.length
      setBpm(Math.round(Math.min(300, Math.max(30, 60000 / avg))))
    }
  }
  const cycleAccent = (i: number) => setAccents(accents.map((a, j) => (j === i ? (((a + 2) % 3) as Accent) : a)))

  return (
    <div className="stack" style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1>Metronome</h1>
      <div className="panel" style={{ textAlign: 'center' }}>
        <div className="row" style={{ justifyContent: 'center', gap: 14 }}>
          <button className="btn icon big" onClick={() => setBpm(Math.max(30, bpm - 1))} aria-label="Slower">−</button>
          <div>
            <div className="readout" style={{ fontSize: 104 }}>{bpm}</div>
            <div className="muted small">beats per minute</div>
          </div>
          <button className="btn icon big" onClick={() => setBpm(Math.min(300, bpm + 1))} aria-label="Faster">+</button>
        </div>
        <input type="range" min={30} max={300} value={bpm} onChange={e => setBpm(+e.target.value)} aria-label="Tempo" style={{ width: '100%', maxWidth: 520, accentColor: 'var(--amber)', margin: '14px 0' }} />
        <div className="row" style={{ justifyContent: 'center', gap: 10, margin: '6px 0 16px' }} role="group" aria-label="Beats, tap to change accent">
          {Array.from({ length: beats }, (_, i) => {
            const a = accents[i] ?? 1
            const lit = beat === i
            return (
              <button key={i} onClick={() => cycleAccent(i)} aria-label={`Beat ${i + 1}: ${['muted', 'normal', 'accent'][a]}`}
                style={{
                  width: a === 2 ? 34 : 28, height: a === 2 ? 34 : 28, borderRadius: '50%', border: '2px solid ' + (a === 0 ? 'var(--hairline)' : 'var(--amber)'),
                  background: lit && a > 0 ? 'var(--amber)' : 'transparent', boxShadow: lit && a > 0 ? '0 0 16px var(--amber)' : 'none', transition: 'background 40ms',
                }} />
            )
          })}
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className={`btn big${running ? '' : ' primary'}`} onClick={toggle} style={{ minWidth: 150 }}>{running ? 'Stop' : 'Start'}</button>
          <button className="btn big" onClick={tap}>Tap tempo</button>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>Tap a beat light to switch it between accent, normal and silent.</p>
      </div>

      <div className="panel stack">
        <Field label="Time signature"><Chips label="Time signature" items={SIGS.map(s => ({ id: s.id, label: s.id }))} value={sig} onChange={setSig} /></Field>
        <Field label="Subdivision"><Chips label="Subdivision" items={SUBS} value={sub} onChange={setSub} /></Field>
        <Field label="Sound"><Chips label="Sound" items={SOUNDS} value={sound} onChange={setSound} wrap /></Field>
        <Field label="Drum beat">
          <select className="select" value={groove} onChange={e => setGroove(e.target.value)} disabled={beats !== 4}>
            <option value="">None: just the click</option>
            {GROOVES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </Field>
        <p className="small muted" style={{ margin: 0 }}>{beats === 4 ? 'A real drummer at any tempo instead of the click, with a fill every 8 bars. The speed trainer works with it too.' : 'Drum beats are in 4/4.'}</p>
      </div>

      <div className="panel stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0 }}>Speed trainer</h3>
            <div className="small muted">Raise the tempo automatically as you play.</div>
          </div>
          <button className="chip" aria-pressed={trainer.on} onClick={() => setTrainer({ ...trainer, on: !trainer.on })}>{trainer.on ? 'On' : 'Off'}</button>
        </div>
        {trainer.on && (
          <div className="row">
            <Field label="Add BPM"><select className="select" value={trainer.step} onChange={e => setTrainer({ ...trainer, step: +e.target.value })}>{[1, 2, 3, 5, 10].map(v => <option key={v}>{v}</option>)}</select></Field>
            <Field label="Every"><select className="select" value={trainer.everyBars} onChange={e => setTrainer({ ...trainer, everyBars: +e.target.value })}>{[1, 2, 4, 8, 16].map(v => <option key={v} value={v}>{v} bars</option>)}</select></Field>
            <Field label="Stop at"><select className="select" value={trainer.max} onChange={e => setTrainer({ ...trainer, max: +e.target.value })}>{[80, 100, 120, 140, 160, 180, 200, 240].map(v => <option key={v} value={v}>{v} BPM</option>)}</select></Field>
          </div>
        )}
      </div>
    </div>
  )
}

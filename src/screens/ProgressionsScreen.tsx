import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MODES, STYLES, randomProgression, suggestions, scalesForProgression, scaleForChord, chordPcs,
  type ModeId, type Style, type Flavor, type ProgChord,
} from '../theory/progressions'
import { bestVoicing, parseSymbol, type Voicing } from '../theory/chords'
import { scaleById, scaleInfo } from '../theory/scales'
import { ChordDiagram } from '../components/ChordDiagram'
import { Fretboard } from '../components/Fretboard'
import { Chips, Field, KeyPicker, usePersist } from '../components/Controls'
import { IconDice, IconLock, IconPlay, IconStop } from '../components/Icons'
import { strum, preload } from '../audio/pluck'
import { audio, keepAwake } from '../audio/engine'
import { playClick } from '../audio/metronome'
import { pc, STANDARD, stringMidis } from '../theory/notes'

const FLAVORS: { id: Flavor; label: string }[] = [
  { id: 'triads', label: 'Simple' }, { id: 'sevenths', label: '7th chords' }, { id: 'extended', label: 'Lush (9ths)' },
]
const SPICE = [{ id: 0, label: 'In key only' }, { id: 1, label: 'A little spice' }, { id: 2, label: 'Adventurous' }]
const PATTERNS = [
  { id: 'whole', label: 'Whole notes', hits: [[0, false]] },
  { id: 'quarters', label: 'Quarter strums', hits: [[0, false], [1, false], [2, false], [3, false]] },
  { id: 'pop', label: 'D-DU-UDU', hits: [[0, false], [1, false], [1.5, true], [2.5, true], [3, false], [3.5, true]] },
  { id: 'rock', label: 'Driving 8ths', hits: [[0, false], [0.5, false], [1, false], [1.5, false], [2, false], [2.5, false], [3, false], [3.5, false]] },
] as const

const tuning = stringMidis(STANDARD)

function voicingsFor(chords: ProgChord[]): (Voicing | null)[] {
  // keep shapes close together on the neck for smooth changes
  let near = 0
  return chords.map(c => {
    const { root, suffix } = parseSymbol(c.symbol)
    const v = bestVoicing(root, suffix, near) ?? bestVoicing(root, suffix.replace(/9|11|13/, '7'), near)
    if (v) near = Math.min(near * 0.5 + v.baseFret * 0.5, 7)
    return v
  })
}
const midisOf = (v: Voicing | null) => (v ? v.frets.map((f, s) => (f < 0 ? -1 : tuning[s] + f)).filter(m => m > 0) : [])

export function ProgressionsScreen({ onOpenScale }: { onOpenScale?: (root: string, scale: string) => void }) {
  const [tonic, setTonic] = usePersist('progKey', 'G')
  const [mode, setMode] = usePersist<ModeId>('progMode', 'major')
  const [style, setStyle] = usePersist<Style>('progStyle', 'any')
  const [flavor, setFlavor] = usePersist<Flavor>('progFlavor', 'triads')
  const [length, setLength] = usePersist<4 | 8>('progLen', 4)
  const [spice, setSpice] = usePersist('progSpice', 1)
  const [bpm, setBpm] = usePersist('progBpm', 90)
  const [pattern, setPattern] = usePersist('progPattern', 'pop')
  const [click, setClick] = usePersist('progClick', true)
  const [prog, setProg] = usePersist<ProgChord[]>('progChords', [])
  const [locks, setLocks] = useState<boolean[]>([])
  const [selected, setSelected] = useState(0)
  const [tipIdx, setTipIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [now, setNow] = useState(-1)
  const player = useRef<{ timer: ReturnType<typeof setInterval>; bars: { t: number; i: number }[]; stops: { stop: (at?: number) => void }[] } | null>(null)

  // first visit: make one
  useEffect(() => {
    if (prog.length === 0) roll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const voicings = useMemo(() => voicingsFor(prog), [prog])
  const tips = useMemo(() => scalesForProgression(tonic, mode, prog, style), [tonic, mode, prog, style])
  const tip = tips[Math.min(tipIdx, tips.length - 1)]
  const active = now >= 0 ? now : selected
  const chordTip = prog[active] ? scaleForChord(tonic, mode, prog[active]) : null
  const info = tip ? scaleInfo(tip.root, tip.scale) : null
  const chordSet = new Set(prog[active] ? chordPcs(prog[active].symbol) : [])
  const chordRoot = prog[active] ? pc(prog[active].root) : -1
  const sugg = useMemo(() => suggestions(tonic, mode, style, flavor), [tonic, mode, style, flavor])

  function roll() {
    const locked = prog.length === length ? prog.map((c, i) => (locks[i] ? c : null)) : []
    const avoid = prog.map(c => c.semi + c.type).join(',')
    const next = randomProgression({ tonic, mode, style, flavor, length, spice, locked, avoid })
    setProg(next)
    if (prog.length !== length) setLocks([])
    setSelected(0)
    setTipIdx(0)
  }
  function load(chords: ProgChord[]) {
    stop()
    setProg(chords)
    setLocks([])
    setSelected(0)
    setTipIdx(0)
  }
  function hear(i: number) {
    setSelected(i)
    strum(midisOf(voicings[i]))
  }

  function start() {
    const ctx = audio()
    voicings.forEach(v => preload(midisOf(v)))
    const spb = 60 / bpm
    const pat = PATTERNS.find(p => p.id === pattern) ?? PATTERNS[0]
    let next = ctx.currentTime + 0.15
    let bar = 0
    const state = { timer: 0 as unknown as ReturnType<typeof setInterval>, bars: [] as { t: number; i: number }[], stops: [] as { stop: (at?: number) => void }[] }
    const schedule = () => {
      while (next < ctx.currentTime + 0.5) {
        const i = bar % prog.length
        const m = midisOf(voicings[i])
        for (const [beat, up] of pat.hits) state.stops.push(strum(m, next + beat * spb, { up, gain: 0.55 }))
        if (click) for (let b = 0; b < 4; b++) playClick(next + b * spb, 'click', b === 0 ? 'accent' : 'beat', 0.35)
        state.bars.push({ t: next, i })
        if (state.bars.length > 8) state.bars.shift()
        if (state.stops.length > 64) state.stops.splice(0, state.stops.length - 64)
        next += 4 * spb
        bar++
      }
    }
    schedule()
    state.timer = setInterval(schedule, 50)
    player.current = state
    setPlaying(true)
    void keepAwake(true)
  }
  function stop() {
    const p = player.current
    if (p) {
      clearInterval(p.timer)
      p.stops.forEach(s => s.stop())
    }
    player.current = null
    setPlaying(false)
    setNow(-1)
    void keepAwake(false)
  }
  useEffect(() => () => stop(), [])
  // restart with new settings while playing
  useEffect(() => {
    if (player.current) { stop(); start() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, pattern, click, prog])

  // follow the playhead
  useEffect(() => {
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const p = player.current
      if (!p) return
      const t = audio().currentTime
      let cur = -1
      for (const b of p.bars) if (b.t <= t) cur = b.i
      setNow(cur)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  const controls = (
    <div className="panel stack">
      <Field label="Key"><KeyPicker value={tonic} onChange={setTonic} /></Field>
      <Field label="Mode"><Chips label="Mode" items={MODES.map(m => ({ id: m.id, label: m.label }))} value={mode} onChange={setMode} /></Field>
      <Field label="Style"><Chips label="Style" items={STYLES.map(s => ({ id: s.id, label: s.label }))} value={style} onChange={setStyle} /></Field>
      <Field label="Chord colour"><Chips label="Chord colour" items={FLAVORS} value={flavor} onChange={setFlavor} /></Field>
      <div className="row">
        <Field label="Length"><Chips label="Length" items={[{ id: 4, label: '4 bars' }, { id: 8, label: '8 bars' }]} value={length} onChange={v => setLength(v as 4 | 8)} /></Field>
        <Field label="Surprise level"><Chips label="Surprise level" items={SPICE} value={spice} onChange={setSpice} /></Field>
      </div>
    </div>
  )

  const progressionPanel = (
    <div className="panel stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{tonic} {MODES.find(m => m.id === mode)!.label.toLowerCase()}</h2>
        <button className="btn primary big" onClick={roll} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <IconDice /> New progression
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(prog.length, 4)}, minmax(0, 1fr))`, gap: 8 }}>
        {prog.map((c, i) => (
          <div key={i} onClick={() => hear(i)} role="button" tabIndex={0} aria-label={`Play ${c.symbol}`}
            onKeyDown={e => { if (e.key === 'Enter') hear(i) }}
            style={{
              position: 'relative', borderRadius: 10, padding: '10px 8px 8px', cursor: 'pointer', minHeight: 86,
              background: i === now ? 'var(--amber)' : 'var(--rosewood-3)', color: i === now ? 'var(--amber-ink)' : 'var(--pearl)',
              border: `1px solid ${i === active && now < 0 ? 'var(--amber)' : 'var(--hairline)'}`, transition: 'background 60ms',
            }}>
            <div className="readout" style={{ fontSize: c.symbol.length > 5 ? 24 : 30 }}>{c.symbol}</div>
            <div className="small" style={{ opacity: 0.75 }}>{c.roman}{c.borrowed ? ' · borrowed' : ''}</div>
            <button onClick={e => { e.stopPropagation(); const l = [...locks]; l[i] = !l[i]; setLocks(l) }} aria-pressed={!!locks[i]} aria-label={locks[i] ? `Unlock ${c.symbol}` : `Keep ${c.symbol} when rerolling`}
              style={{ position: 'absolute', bottom: 4, right: 4, background: 'none', border: 0, color: 'inherit', opacity: locks[i] ? 1 : 0.45, padding: 6 }}>
              <IconLock locked={!!locks[i]} />
            </button>
          </div>
        ))}
      </div>
      <p className="small muted" style={{ margin: 0 }}>Tap a chord to hear it. Lock the chords you like, then roll again to change the rest.</p>
      <div className="row">
        <button className={`btn big${playing ? '' : ' primary'}`} onClick={() => (playing ? stop() : start())} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {playing ? <IconStop /> : <IconPlay />} {playing ? 'Stop' : 'Play loop'}
        </button>
        <Field label={`Tempo ${bpm} BPM`}>
          <input type="range" min={50} max={180} value={bpm} onChange={e => setBpm(+e.target.value)} style={{ accentColor: 'var(--amber)', width: 160 }} aria-label="Loop tempo" />
        </Field>
        <Field label="Strum">
          <select className="select" value={pattern} onChange={e => setPattern(e.target.value)}>
            {PATTERNS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <button className="chip" aria-pressed={click} onClick={() => setClick(!click)} style={{ alignSelf: 'end' }}>Click</button>
      </div>
    </div>
  )

  const scalesPanel = (
    <div className="panel stack">
      <h3 style={{ margin: 0 }}>Scales that fit</h3>
      <div className="stack" style={{ gap: 6 }}>
        {tips.map((t, i) => (
          <button key={i} onClick={() => setTipIdx(i)} aria-pressed={i === tipIdx}
            style={{ textAlign: 'left', background: i === tipIdx ? 'var(--rosewood-3)' : 'transparent', border: `1px solid ${i === tipIdx ? 'var(--amber)' : 'var(--hairline)'}`, borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontWeight: 600 }}>{t.root} {scaleById(t.scale).label}</div>
            <div className="small muted">{t.why}</div>
          </button>
        ))}
      </div>
      {chordTip && (
        <div className="notice small">
          <b>Over {prog[active].symbol}:</b> {chordTip.why}{' '}
          {onOpenScale && <button className="chip" style={{ minHeight: 30, marginLeft: 4 }} onClick={() => onOpenScale(chordTip.root, chordTip.scale)}>Open in Scales</button>}
        </div>
      )}
    </div>
  )

  const neck = info && tip && (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>{tip.root} {scaleById(tip.scale).label}{prog[active] ? <span className="muted"> · {prog[active].symbol} notes in gold</span> : null}</h3>
      <Fretboard
        markFor={midi => {
          const q = midi % 12
          const inScale = info.pcs.includes(q)
          const inChord = chordSet.has(q)
          if (!inScale && !inChord) return null
          const label = info.labels.get(q) ?? ''
          if (inChord) return { label: label || '•', role: q === chordRoot ? 'root' : 'chord' }
          return { label, role: 'scale' }
        }}
        onTap={midi => strum([midi])}
      />
      <div className="row" style={{ flexWrap: 'nowrap', overflowX: 'auto', marginTop: 12, paddingBottom: 4 }}>
        {prog.map((c, i) => voicings[i] && <ChordDiagram key={i} name={c.symbol} voicing={voicings[i]!} active={i === active} onClick={() => hear(i)} size={0.9} />)}
      </div>
    </div>
  )

  return (
    <div className="stack">
      <h1>Progressions</h1>
      <div className="split">
        {progressionPanel}
        {scalesPanel}
      </div>
      {neck}
      {controls}
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Famous progressions in {tonic}</h2>
        <div className="stack" style={{ gap: 8 }}>
          {sugg.map((s, i) => (
            <div key={i} className="row" style={{ justifyContent: 'space-between', borderTop: i ? '1px solid var(--hairline)' : 'none', paddingTop: i ? 8 : 0 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{s.name}</div>
                <div className="readout" style={{ fontSize: 20, fontWeight: 600, color: 'var(--pearl-2)', overflowWrap: 'anywhere' }}>{s.chords.map(c => c.symbol).join('  ')}</div>
                {s.note && <div className="small muted">{s.note}</div>}
              </div>
              <button className="btn" onClick={() => load(s.chords)}>Use this</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

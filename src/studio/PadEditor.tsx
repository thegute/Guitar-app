// One pad's settings: where its sound comes from (the kit's drum, your recording, an instrument note or chord, a
// file from your phone), the trim (drag the two handles on the wave), pitch, volume, reverse, how it plays,
// fades, choke group and its name. Opened by tapping a pad in Sample mode.
import { useEffect, useMemo, useRef, useState } from 'react'
import { audio } from '../audio/engine'
import type { Handle } from '../audio/pluck'
import { useBack } from '../back'
import { Ico } from '../components/Icon'
import { FLATS, SHARPS, keyPrefersFlats, pc } from '../theory/notes'
import { padLabel, voiceLabel, type Beat } from './beat'
import { isUserPad, type PadDef, type PadMode, type PadSrc } from './pads'
import { loadSampleBuf, sampleNow } from './padSamples'
import { padBuffer, shiftId } from './padPlay'
import { CHORD_TYPES, INSTRS, INSTR_GROUPS, instr, keyChord, loadInstr } from './sounds'
import type { StudioTransport } from './transport'
import type { MySounds } from './mySounds'
import { loadSample } from './mySounds'
import { Dial } from '../components/Dial'
import { prepareShift } from './pitchShift'

const noteName = (m: number, flats: boolean) => (flats ? FLATS : SHARPS)[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1)
const MODES: { id: PadMode; label: string; hint: string }[] = [
  { id: 'oneshot', label: 'One shot', hint: 'Plays the whole sound on a tap.' },
  { id: 'hold', label: 'While held', hint: 'Stops when you let go.' },
  { id: 'loop', label: 'Loop', hint: 'Repeats while you hold the pad.' },
]

export function PadEditor({ pad, beat, setBeat, t, mine, onClose, onRecord, recording, level }: {
  pad: string
  beat: Beat
  setBeat: (f: (b: Beat) => Beat, remember?: boolean) => void
  t: StudioTransport
  mine: MySounds
  onClose: () => void
  /** hold-to-record onto this pad (from the Record button in here): down / up */
  onRecord: (down: boolean) => void
  recording: boolean
  level: number
}) {
  useBack(true, onClose)
  const user = isUserPad(pad)
  const def: PadDef = beat.pads?.[pad] ?? { src: user ? 'rec' : 'kit' }
  const [before] = useState<PadDef | undefined>(() => beat.pads?.[pad])
  const set = (patch: Partial<PadDef>, remember = false) => setBeat(b => ({ ...b, pads: { ...b.pads, [pad]: { ...(b.pads?.[pad] ?? def), ...patch } } }), remember)
  const flats = keyPrefersFlats(beat.key, beat.minor)
  const [, redraw] = useState(0)
  useEffect(() => {
    if (def.sample) void loadSampleBuf(def.sample).then(() => redraw(n => n + 1))
    if (def.src === 'file' && def.file) void loadSample(def.file).then(b => { if (b) { t.files.set(def.file!.uri, b); redraw(n => n + 1) } })
    if (def.inst) void loadInstr(def.inst)
  }, [def.sample, def.src, def.file?.uri, def.inst]) // eslint-disable-line react-hooks/exhaustive-deps
  const playing = useRef<Handle | null>(null)
  const hear = () => { void audio().resume(); playing.current?.stop(); playing.current = t.hit(pad, 0.9) }
  const stopHear = () => { if ((def.mode ?? 'oneshot') !== 'oneshot') { playing.current?.stop(); playing.current = null } }
  const pickSrc = (src: PadSrc) => {
    if (src === 'note') set({ src, inst: def.inst ?? 'sub808', midi: def.midi ?? 36, len: def.len ?? 4 }, true)
    else if (src === 'chord') set({ src, inst: def.inst && def.src === 'chord' ? def.inst : 'grand', midi: def.midi ?? 60, ivs: def.ivs ?? [0, 4, 7], len: def.len ?? 4 }, true)
    else set({ src }, true)
  }
  const buf = padBuffer(def, pad, beat.kit, t.files)
  const srcs: { id: PadSrc; label: string }[] = [
    ...(user ? [] : [{ id: 'kit' as PadSrc, label: 'Kit drum' }]),
    { id: 'rec', label: 'Your recording' },
    { id: 'note', label: 'Instrument note' },
    { id: 'chord', label: 'Instrument chord' },
    ...(mine.files.length ? [{ id: 'file' as PadSrc, label: 'Phone file' }] : []),
  ]
  const keyPc = pc(beat.key)
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet pad-editor" role="dialog" aria-modal="true" aria-label={`Pad: ${padLabel(beat, pad)}`} onClick={e => e.stopPropagation()} data-testid="pad-editor">
        <div className="sheet-head">
          <h2>{padLabel(beat, pad)}</h2>
          <button className="btn sm" onClick={onClose}>Done</button>
        </div>
        <div className="seg pad-src" role="group" aria-label="Sound comes from">
          {srcs.map(s => <button key={s.id} aria-pressed={def.src === s.id} onClick={() => pickSrc(s.id)}>{s.label}</button>)}
        </div>

        {def.src === 'rec' && (
          <div className="stack" style={{ gap: 8 }}>
            <button className={`btn big pad-rec${recording ? ' on' : ''}`} onPointerDown={e => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* noop */ } onRecord(true) }}
              onPointerUp={() => onRecord(false)} onPointerCancel={() => onRecord(false)} onContextMenu={e => e.preventDefault()} data-testid="pad-rec-hold">
              <Ico n="mic" /> {recording ? 'Recording… let go to stop' : def.sample ? 'Hold to record again' : 'Hold to record'}
              <span className="pad-meter" style={{ ['--lv' as string]: String(Math.min(1, level * 3)) }} aria-hidden />
            </button>
            {def.sample && buf && <Wave buf={buf.buf} start={def.start ?? 0} end={def.end ?? buf.buf.duration} onChange={(start, end) => set({ start, end })} onHear={hear} />}
            {!def.sample && <p className="small muted" style={{ margin: 0 }}>Hold the button and make a sound: a "boom", a "tss", a click, a word, your guitar. Let go to stop.</p>}
          </div>
        )}

        {def.src === 'file' && (
          <label className="field st-field"><span>File</span>
            <select className="select" value={def.file?.uri ?? ''} onChange={e => { const f = mine.files.find(x => x.uri === e.target.value); if (f) set({ file: f, start: undefined, end: undefined }, true) }}>
              <option value="">Choose…</option>
              {mine.files.map(f => <option key={f.uri} value={f.uri}>{f.name}</option>)}
            </select>
          </label>
        )}
        {def.src === 'file' && buf && <Wave buf={buf.buf} start={def.start ?? 0} end={def.end ?? buf.buf.duration} onChange={(start, end) => set({ start, end })} onHear={hear} />}

        {(def.src === 'note' || def.src === 'chord') && (
          <div className="stack" style={{ gap: 8 }}>
            <label className="field st-field"><span>Instrument</span>
              <select className="select" value={def.inst ?? ''} onChange={e => { void loadInstr(e.target.value); set({ inst: e.target.value }, true) }}>
                {INSTR_GROUPS.map(g => <optgroup key={g} label={g}>{INSTRS.filter(i => i.group === g).map(i => <option key={i.id} value={i.id}>{i.label}</option>)}</optgroup>)}
              </select>
            </label>
            <div className="row" style={{ gap: 6 }}>
              <span className="small">{def.src === 'chord' ? 'Root' : 'Note'}</span>
              <span className="seg" role="group" aria-label="Note">
                <button onClick={() => set({ midi: (def.midi ?? 60) - 12 })} aria-label="Octave down">−8va</button>
                <button onClick={() => set({ midi: (def.midi ?? 60) - 1 })} aria-label="Down a semitone">−</button>
                <b className="pad-note" aria-live="polite">{noteName(def.midi ?? 60, flats)}</b>
                <button onClick={() => set({ midi: (def.midi ?? 60) + 1 })} aria-label="Up a semitone">+</button>
                <button onClick={() => set({ midi: (def.midi ?? 60) + 12 })} aria-label="Octave up">+8va</button>
              </span>
              {def.inst && (def.midi ?? 60) < instr(def.inst).lo - 6 && <span className="small muted">low for this instrument</span>}
            </div>
            {def.src === 'chord' && (
              <>
                <div className="row pad-keychords" style={{ gap: 6 }} aria-label={`Chords in ${beat.key}${beat.minor ? ' minor' : ''}`}>
                  <span className="small">In {beat.key}{beat.minor ? 'm' : ''}:</span>
                  {(beat.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]).map(semi => {
                    const rootM = 48 + ((keyPc + semi) % 12) + 12
                    const c = keyChord(rootM, keyPc, beat.minor)
                    if (!c) return null
                    const name = noteName(rootM, flats).replace(/-?\d+$/, '') + c.label
                    const on = ((def.midi ?? 60) % 12) === rootM % 12 && JSON.stringify(def.ivs) === JSON.stringify(c.ivs)
                    return <button key={semi} className={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => set({ midi: rootM, ivs: c.ivs }, true)}>{name}</button>
                  })}
                </div>
                <label className="field st-field"><span>Chord type</span>
                  <select className="select" value={CHORD_TYPES.find(c => JSON.stringify(c.ivs) === JSON.stringify(def.ivs))?.id ?? 'maj'} onChange={e => set({ ivs: CHORD_TYPES.find(c => c.id === e.target.value)!.ivs }, true)}>
                    {CHORD_TYPES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </label>
              </>
            )}
            <label className="field st-field"><span>Length in the step grid: {(def.len ?? 4) / 4} beat{(def.len ?? 4) === 4 ? '' : 's'}</span>
              <input type="range" min={1} max={16} step={1} value={def.len ?? 4} onChange={e => set({ len: Number(e.target.value) })} aria-label="Length" />
            </label>
          </div>
        )}

        <div className="pad-hear-row">
          <button className="btn primary" onPointerDown={hear} onPointerUp={stopHear} onPointerCancel={stopHear} data-testid="pad-hear"><Ico n="play" fill /> Hear it</button>
          {before !== beat.pads?.[pad] && <button className="btn ghost" onClick={() => setBeat(b => { const pads = { ...b.pads }; if (before) pads[pad] = before; else delete pads[pad]; return { ...b, pads } }, true)}>Undo changes</button>}
          {beat.pads?.[pad] && <button className="btn ghost" onClick={() => setBeat(b => { const pads = { ...b.pads }; delete pads[pad]; return { ...b, pads } }, true)}>{user ? 'Clear this pad' : "Back to the kit's sound"}</button>}
        </div>

        <section className="opt-group" aria-label="Pad settings">
          <h3>Settings</h3>
          <PitchDial def={def} set={set} buf={buf} id={shiftId(def, pad, beat.kit)} />
          <div className="opt-row"><span className="opt-name">Volume</span>
            <input type="range" min={0} max={2} step={0.05} value={def.vol ?? 1} onChange={e => set({ vol: Number(e.target.value) })} aria-label="Pad volume" />
            <b className="pad-val">{Math.round((def.vol ?? 1) * 100)}%</b>
          </div>
          <div className="opt-row"><span className="opt-name">Plays</span>
            <span className="seg" role="group" aria-label="How it plays">
              {MODES.map(m => <button key={m.id} aria-pressed={(def.mode ?? 'oneshot') === m.id} title={m.hint} onClick={() => set({ mode: m.id }, true)}>{m.label}</button>)}
            </span>
          </div>
          {def.src !== 'note' && def.src !== 'chord' && (
            <label className="opt-row opt-check"><input type="checkbox" checked={!!def.reverse} onChange={() => set({ reverse: !def.reverse }, true)} /><span><b>Reverse</b><span className="small muted">Plays it backwards (a swell into the beat).</span></span></label>
          )}
          <div className="opt-row"><span className="opt-name">Fade in</span>
            <input type="range" min={0} max={0.5} step={0.01} value={def.fadeIn ?? 0} onChange={e => set({ fadeIn: Number(e.target.value) })} aria-label="Fade in" />
            <b className="pad-val">{Math.round((def.fadeIn ?? 0) * 1000)} ms</b>
          </div>
          <div className="opt-row"><span className="opt-name">Fade out</span>
            <input type="range" min={0} max={1} step={0.01} value={def.fadeOut ?? 0} onChange={e => set({ fadeOut: Number(e.target.value) })} aria-label="Fade out" />
            <b className="pad-val">{Math.round((def.fadeOut ?? 0) * 1000)} ms</b>
          </div>
          <div className="opt-row"><span className="opt-name">Choke</span>
            <span className="seg" role="group" aria-label="Choke group">
              {[0, 1, 2, 3, 4].map(g => <button key={g} aria-pressed={(def.choke ?? 0) === g} onClick={() => set({ choke: g }, true)}>{g === 0 ? 'Off' : g}</button>)}
            </span>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Pads in the same choke group cut each other off, like closing a hi-hat stops the open one.</p>
          <label className="field st-field"><span>Name</span>
            <input className="input" value={def.name ?? ''} placeholder={voiceLabel(pad)} maxLength={14} onChange={e => set({ name: e.target.value })} />
          </label>
        </section>
      </div>
    </div>
  )
}

/** The recording as a wave with two handles: drag them to set where it starts and ends. */
function Wave({ buf, start, end, onChange, onHear }: { buf: AudioBuffer; start: number; end: number; onChange: (s: number, e: number) => void; onHear: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const dur = buf.duration
  const peaks = useMemo(() => {
    const d = buf.getChannelData(0)
    const n = 160, per = Math.max(1, Math.floor(d.length / n))
    return Array.from({ length: n }, (_, i) => { let m = 0; for (let k = i * per; k < Math.min(d.length, (i + 1) * per); k++) m = Math.max(m, Math.abs(d[k])); return m })
  }, [buf])
  const top = Math.max(0.01, ...peaks)
  const drag = useRef<'s' | 'e' | null>(null)
  const at = (clientX: number) => { const r = box.current!.getBoundingClientRect(); return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * dur }
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return
    const x = at(e.clientX)
    if (drag.current === 's') onChange(Math.min(x, end - 0.02), end)
    else onChange(start, Math.max(x, start + 0.02))
  }
  return (
    <div className="pad-wave-wrap">
      <div className="pad-wave" ref={box} onPointerMove={move} onPointerUp={() => { if (drag.current) { drag.current = null; onHear() } }} onPointerCancel={() => { drag.current = null }}
        onPointerDown={e => {
          // grab the nearer handle
          const x = at(e.clientX)
          drag.current = Math.abs(x - start) < Math.abs(x - end) ? 's' : 'e'
          try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
          move(e)
        }} role="group" aria-label="Trim: drag the start and end handles" data-testid="pad-wave">
        <svg viewBox={`0 0 ${peaks.length} 100`} preserveAspectRatio="none" aria-hidden>
          {peaks.map((p, i) => <rect key={i} x={i + 0.15} width={0.7} y={50 - (p / top) * 48} height={Math.max(1, (p / top) * 96)} className={i / peaks.length * dur >= start && i / peaks.length * dur <= end ? 'in' : 'out'} />)}
        </svg>
        <span className="pad-handle s" style={{ left: `${(start / dur) * 100}%` }} aria-hidden />
        <span className="pad-handle e" style={{ left: `${(end / dur) * 100}%` }} aria-hidden />
      </div>
      <div className="row small muted" style={{ justifyContent: 'space-between' }}>
        <span>Start {start.toFixed(2)} s</span>
        <span>{(end - start).toFixed(2)} s long</span>
        <span>End {end.toFixed(2)} s</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button className="btn sm" onClick={() => onChange(Math.max(0, start - 0.01), end)}>Start ←</button>
        <button className="btn sm" onClick={() => onChange(Math.min(end - 0.02, start + 0.01), end)}>Start →</button>
        <button className="btn sm" onClick={() => onChange(start, Math.max(start + 0.02, end - 0.01))}>← End</button>
        <button className="btn sm" onClick={() => onChange(start, Math.min(dur, end + 0.01))}>End →</button>
      </div>
    </div>
  )
}
export { sampleNow }

/** The pitch dial: two octaves down to two up, anything in between; Tape (pitch and speed together) or Keep the speed. */
function PitchDial({ def, set, buf, id }: { def: PadDef; set: (p: Partial<PadDef>, remember?: boolean) => void; buf: { buf: AudioBuffer; start: number; end: number } | null; id: string }) {
  const [busy, setBusy] = useState('')
  const sampled = def.src === 'rec' || def.src === 'file' || def.src === 'kit'
  const keep = def.pitchMode === 'keep' && sampled
  const fmt = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v) % 1 ? Math.abs(v).toFixed(2) : Math.abs(v)}`
  // keep-the-speed copies are made when you let go of the dial (they take a moment)
  const ready = (v: number, mode = def.pitchMode, natural = !!def.natural) => {
    if (mode !== 'keep' || !buf || Math.abs(v) < 0.005) { setBusy(''); return }
    setBusy('Getting it ready…')
    void prepareShift(id, buf.buf, buf.start, buf.end, v, natural).then(r => setBusy(r ? '' : "Couldn't shift this sound: it plays as Tape."))
  }
  return (
    <div className="pitch-dial" data-testid="pitch-dial">
      <Dial value={def.pitch ?? 0} min={-24} max={24} snap={1} label="Pitch" format={fmt}
        onChange={v => set({ pitch: v })} onCommit={v => { set({ pitch: v }, true); ready(v) }} />
      <div className="stack" style={{ gap: 6, flex: 1, minWidth: 160 }}>
        <span className="small muted">{Math.abs(def.pitch ?? 0) < 0.005 ? 'Its own pitch.' : `${Math.abs(def.pitch ?? 0) >= 12 ? `${Math.floor(Math.abs(def.pitch ?? 0) / 12)} octave${Math.abs(def.pitch ?? 0) >= 24 ? 's' : ''} ` : ''}${(def.pitch ?? 0) > 0 ? 'higher' : 'lower'}${keep ? ', same length' : (def.pitch ?? 0) > 0 ? ' and faster' : ' and slower'}.`}</span>
        {sampled && (
          <span className="seg" role="group" aria-label="How the pitch changes">
            <button aria-pressed={!keep} onClick={() => { set({ pitchMode: 'tape' }, true); setBusy('') }} title="Higher is faster, lower is slower, like a record sped up or slowed down.">Tape</button>
            <button aria-pressed={keep} onClick={() => { set({ pitchMode: 'keep' }, true); ready(def.pitch ?? 0, 'keep') }} title="Higher or lower without changing its length, so it stays in time.">Keep the speed</button>
          </span>
        )}
        {keep && (
          <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={!!def.natural} onChange={e => { set({ natural: e.target.checked }, true); ready(def.pitch ?? 0, 'keep', e.target.checked) }} />
            <span>Keep a voice natural <span className="muted">(no cartoon voice when it's shifted)</span></span></label>
        )}
        {busy && <span className="small" role="status">{busy}</span>}
      </div>
    </div>
  )
}

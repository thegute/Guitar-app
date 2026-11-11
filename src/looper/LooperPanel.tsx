// Jam → Looper: four tracks on the beat maker's clock. One big round button per track does everything
// (record → close the loop → overdub → stop adding); every press lands on the next bar line, shown as ARMED.
// Each track has its waveform with a playhead, a ring that goes round with its loop, volume, pan, mute, solo,
// undo / redo / clear, and extras (backwards, half speed, the bass octave, the lead dipping the others, chop onto pads,
// make it a tab). Part A / B switches the beat and every loop together on the next bar. A footswitch drives it all.
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { audio } from '../audio/engine'
import { haptic } from '../audio/tapFeel'
import { usePedals, type PedalAction } from '../controls/pedals'
import { Ico } from '../components/Icon'
import { Win, WinArea } from '../components/Win'
import { Fretboard, type Mark } from '../components/Fretboard'
import { useInstrument } from '../instrument'
import { BeatLight } from '../studio/BeatLight'
import { FxPad } from '../studio/FxPad'
import { MicFxPicker } from '../studio/MicFxPicker'
import { TimingCheck } from './TimingCheck'
import { InputPicker } from '../components/InputPicker'
import { beatInPart, type PartId } from '../studio/beat'
import { beatChords } from '../studio/practice'
import { openJam } from '../nav'
import { lengths } from './logic'
import { ROLES, station, type LenChoice, type LoopPart, type LoopStation, type Role } from './station'
import { useScreenCommands, useScreenInfo } from '../assistant/screen'
import { looperCommand } from './commands'
import { chopToPads, resampleToPad, resampleToTrack, saveMix, toScanner } from './bridges'

/** The looper, re-rendering when it changes. */
export function useStation(): LoopStation {
  const st = station()
  useSyncExternalStore(f => st.on(f), () => st.version)
  return st
}

type TrackState = 'empty' | 'armed' | 'rec' | 'closing' | 'working' | 'dub' | 'dubArmed' | 'loop'
export function trackState(st: LoopStation, i: number): TrackState {
  const r = st.rec
  if (r && r.track === i && r.part === st.s.part) {
    if (r.status === 'working') return 'working'
    if (r.kind === 'dub') return r.status === 'armed' ? 'dubArmed' : 'dub'
    return r.status === 'armed' ? 'armed' : r.status === 'closing' ? 'closing' : 'rec'
  }
  return st.loopOf(i) ? 'loop' : 'empty'
}
const BUTTON: Record<TrackState, string> = {
  empty: 'Record', armed: 'Starting…', rec: 'Close loop', closing: 'Closing…', working: 'Saving…', dub: 'Stop adding', dubArmed: 'Starting…', loop: 'Overdub',
}

export function LooperPanel() {
  const st = useStation()
  const inst = useInstrument()
  const t = st.transport
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [confirmAll, setConfirmAll] = useState(false)
  // the helper sees the looper and takes commands ("record track 2", "chorus", "stop")
  const cmd = useCallback((q: string) => looperCommand(st, q), [st])
  useScreenCommands('looper', cmd)
  useScreenInfo('looper', {
    label: `Looper: ${[0, 1, 2, 3].filter(i => st.loopOf(i)).length} of 4 tracks, part ${st.s.part}`,
    summary: `In Jam → Loop myself (4-track looper on the beat "${t.beat.name}", ${Math.round(t.beat.bpm)} BPM, ${t.beat.bars} bar beat, ${st.playing ? 'playing' : 'stopped'}, part ${st.s.part}). Tracks: ${st.s.tracks.map((tr, i) => `${i + 1} ${ROLES.find(r => r.role === tr.role)?.label}: ${st.lengthOf(i) ? `${st.lengthOf(i)} bars, ${tr.parts[st.s.part]?.takes.length} take(s)${tr.mute ? ', muted' : ''}` : 'empty'}`).join('; ')}. The person can say "record track 2", "overdub", "stop", "undo", "chorus", "mute track 1".`,
  })
  // the mic stays open while the looper is on screen (if it's already allowed), so a press a hair late still starts on the beat
  useEffect(() => {
    let alive = true
    void (navigator.permissions?.query({ name: 'microphone' as PermissionName }).then(p => { if (alive && p.state === 'granted') void st.warmInput() }).catch(() => undefined))
    return () => { alive = false; st.releaseInput() }
  }, [st])

  // footswitch: A record/close/overdub · B stop (hold: clear the track) · C undo (hold: redo) · D part A/B (hold: the effect)
  const down = useRef(new Map<PedalAction, number>())
  const fxHold = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fxOn = useRef(false)
  const HOLD = 550
  usePedals({
    startStop: () => void st.press(),
    record: () => void st.press(),
    restart: () => { down.current.set('restart', performance.now()) },
    loopBar: () => { down.current.set('loopBar', performance.now()) },
    hearIt: () => {
      down.current.set('hearIt', performance.now())
      fxHold.current = setTimeout(() => { fxOn.current = true; haptic('medium'); t.fx.engage('stutter', 0.5, 0.6) }, HOLD)
    },
    up: a => {
      const t0 = down.current.get(a)
      down.current.delete(a)
      if (t0 === undefined) return
      const held = performance.now() - t0 >= HOLD
      if (a === 'restart') { if (held) st.clear(); else st.stop() }
      if (a === 'loopBar') { if (held) st.redo(); else st.undo() }
      if (a === 'hearIt') {
        if (fxHold.current) clearTimeout(fxHold.current)
        if (fxOn.current) { fxOn.current = false; t.fx.release() } else st.switchPart()
      }
    },
  })

  const run = async (label: string, f: (onWait: (s: number) => void) => Promise<string>) => {
    if (busy) return
    setBusy(label); setMsg('')
    try { setMsg(await f(s => setBusy(`${label} (${Math.ceil(s)} s)`))) } catch (e) { setMsg(e instanceof Error ? e.message : 'It stopped.') }
    setBusy(null)
  }
  const bpm = t.beat.bpm
  const setBpm = (v: number) => { const b = Math.max(40, Math.min(240, Math.round(v))); st.useBeat({ ...t.beat, bpm: b }) }
  const empty = !st.hasAudio()

  return (
    <div className="stack looper-page" style={{ gap: 10 }} data-testid="looper">
      <WinArea area="looper" defaultHidden={['lp-fx']}>
        <Win id="lp-tracks" title="4-track looper" className="panel" bodyClass="stack" bodyStyle={{ gap: 10 }}
          hint="Tap a track's round button to record. Press it again where the loop should end (or pick a length first), again to add more on top. Every press lands on the next bar line.">
          <div className="lp-top">
            <button className={`btn primary lp-play${st.playing ? ' on' : ''}`} onClick={() => (st.playing ? st.stop() : st.start(0))} aria-label={st.playing ? (st.stopAt ? 'Stop now' : 'Stop at the end of the bar') : 'Play'} data-testid="lp-play">
              {st.playing ? <Ico n="stop" fill /> : <Ico n="play" fill />}
            </button>
            <BeatLight t={t} playing={st.playing} big />
            <span className="lp-tempo" role="group" aria-label="Tempo">
              <button className="btn sm ghost" onClick={() => setBpm(bpm - 1)} aria-label="Slower"><Ico n="minus" /></button>
              <b className="tabular" data-testid="lp-bpm">{Math.round(bpm)}</b><span className="small muted">BPM</span>
              <button className="btn sm ghost" onClick={() => setBpm(bpm + 1)} aria-label="Faster"><Ico n="plus" /></button>
            </span>
            <span className="seg lp-parts" role="group" aria-label="Part">
              {(['A', 'B'] as LoopPart[]).map(p => (
                <button key={p} aria-pressed={st.s.part === p} className={st.partAt?.part === p ? 'armed' : ''} onClick={() => st.switchPart(p)} data-testid={`lp-part-${p}`}>
                  {p}<span className="small"> {p === 'A' ? 'verse' : 'chorus'}</span>
                </button>
              ))}
            </span>
            {/* what the looper records: the phone mic or the USB pedal (its sheet has the full audio setup) */}
            <InputPicker />
            <label className="lp-toggle"><input type="checkbox" checked={st.s.beatOn} onChange={e => st.set({ beatOn: e.target.checked })} /> Beat</label>
            <label className="lp-toggle"><input type="checkbox" checked={st.s.click} onChange={e => st.set({ click: e.target.checked })} /> Click</label>
          </div>
          {(st.note || st.rec) && <p className={`small lp-note${st.rec?.status === 'armed' ? ' armed' : st.rec ? ' rec' : ''}`} role="status" data-testid="lp-note">{st.note}</p>}
          {empty && !st.playing && !st.rec && (
            <div className="lp-start small">
              <span>Start with</span>
              <span className="seg" role="group" aria-label="How recording starts">
                <button aria-pressed={st.s.start === 'count'} onClick={() => st.set({ start: 'count' })}>A count-in, at {Math.round(bpm)} BPM</button>
                <button aria-pressed={st.s.start === 'free'} onClick={() => st.set({ start: 'free' })} data-testid="lp-free">Free: my first loop sets the tempo</button>
              </span>
            </div>
          )}
          <div className="lp-tracks">
            {[0, 1, 2, 3].map(i => <TrackCard key={i} st={st} i={i} onMsg={setMsg} busy={busy} setBusy={setBusy} />)}
          </div>
          {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
        </Win>
        <Win id="lp-neck" title="What to play over it" className="panel" bodyClass="stack" bodyStyle={{ gap: 6 }}
          hint="The chords of the beat, bar by bar, follow the loop: gold notes are the chord's notes (land on these), the cyan ring is the next chord's 3rd just before it changes.">
          <NowNeck st={st} tuning={inst.midis} />
        </Win>
        <Win id="lp-fx" title="Effects over everything" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
          <FxPad t={t} playing={st.playing} play={c => st.start(c ?? 0)} />
        </Win>
        <Win id="lp-mix" title="Resample and save" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
          <p className="small muted" style={{ margin: 0 }}>Records what you hear (the beat, every loop and the effects) for one time round the longest loop, starting on the next bar.</p>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" disabled={!!busy} onClick={() => void run('Resampling', resampleToPad)} data-testid="lp-resample-pad"><Ico n="disc" /> Onto a pad</button>
            <button className="btn" disabled={!!busy} onClick={() => void run('Resampling', resampleToTrack)} data-testid="lp-resample-track"><Ico n="layers" /> Onto an empty track</button>
            <button className="btn" disabled={!!busy} onClick={() => void run('Saving', saveMix)} data-testid="lp-save"><Ico n="save" /> Save to My recordings</button>
          </div>
          {busy && <p className="small" role="status" style={{ margin: 0 }}>{busy}…</p>}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {!confirmAll ? <button className="btn ghost sm" disabled={empty} onClick={() => setConfirmAll(true)}><Ico n="trash" /> Clear everything</button> : (
              <>
                <span className="small">Every track in both parts goes. Sure?</span>
                <button className="btn sm" onClick={() => { void st.clearAll(); setConfirmAll(false) }} data-testid="lp-clear-all">Yes, clear it all</button>
                <button className="btn sm ghost" onClick={() => setConfirmAll(false)}>Keep them</button>
              </>
            )}
          </div>
        </Win>
        <Win id="lp-set" title="Settings and footswitch" className="panel" bodyClass="stack" bodyStyle={{ gap: 8 }}>
          <TimingCheck />
          <MicFxPicker />
          <label className="ex-check"><input type="checkbox" checked={st.s.align} onChange={e => st.set({ align: e.target.checked })} /> Auto-align: nudge a new loop onto the beat (up to 90 ms)</label>
          <label className="ex-check"><input type="checkbox" checked={st.s.advance} onChange={e => st.set({ advance: e.target.checked })} /> After a new loop, the footswitch moves to the next empty track</label>
          <div className="lp-pedals small">
            <b>Footswitch (4 buttons, or a page turner's two):</b>
            <ul className="plain">
              <li><b>A</b> (right): record, close the loop, overdub, stop adding, on the selected track</li>
              <li><b>B</b> (left): stop at the end of the bar (press twice: now). Hold: clear the selected track</li>
              <li><b>C</b>: undo the last take. Hold: redo it</li>
              <li><b>D</b>: switch part A / B on the next bar. Hold: stutter effect while held</li>
            </ul>
            <span className="muted">Teach KGuitar your pedal's buttons in Settings → Sound → Hands-free. Wear headphones (or plug in your amp) so the mic only hears your guitar, not the loops.</span>
          </div>
        </Win>
      </WinArea>
    </div>
  )
}

function TrackCard({ st, i, onMsg, busy, setBusy }: { st: LoopStation; i: number; onMsg: (m: string) => void; busy: string | null; setBusy: (b: string | null) => void }) {
  const tr = st.s.tracks[i]
  const state = trackState(st, i)
  const role = ROLES.find(r => r.role === tr.role)!
  const [more, setMore] = useState(false)
  const len = st.lengthOf(i)
  const sel = st.s.sel === i
  const has = state === 'loop' || state === 'dub' || state === 'dubArmed'
  const ring = useRef<SVGCircleElement>(null)
  const head = useRef<HTMLDivElement>(null)
  // the ring and the playhead follow the audio clock
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const p = st.progress(i)
      if (ring.current) ring.current.style.strokeDashoffset = String(p === null ? 100 : 100 - p * 100)
      if (head.current) { head.current.style.opacity = p === null ? '0' : '1'; head.current.style.left = `${(p ?? 0) * 100}%` }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [st, i])
  const lenItems: { id: LenChoice; label: string }[] = [{ id: 'auto', label: 'Auto' }, ...lengths(st.base).map(b => ({ id: b, label: `${b} bar${b > 1 ? 's' : ''}` }))]
  const chop = async (how: 'hits' | 'beats') => { setBusy('Chopping'); onMsg(await chopToPads(i, how)); setBusy(null) }
  return (
    <section className={`lp-track r-${tr.role} s-${state}${sel ? ' sel' : ''}${tr.mute ? ' muted' : ''}`} data-testid={`lp-track-${i}`} aria-label={`Track ${i + 1}: ${role.label}`}
      onPointerDown={() => { if (!sel) st.select(i) }}>
      <header className="lp-th">
        <span className="lp-num" aria-hidden>{i + 1}</span>
        <b>{role.label}</b>
        <span className="small muted lp-len">{len ? `${len} bar${len > 1 ? 's' : ''}` : 'empty'}{tr.parts[st.s.part]?.takes.length && tr.parts[st.s.part]!.takes.length > 1 ? ` · ${tr.parts[st.s.part]!.takes.length} takes` : ''}</span>
        <button className="btn sm ghost lp-ms" aria-pressed={tr.mute} onClick={() => st.setTrack(i, { mute: !tr.mute })} aria-label={`Mute track ${i + 1}`}>M</button>
        <button className="btn sm ghost lp-ms" aria-pressed={tr.solo} onClick={() => st.setTrack(i, { solo: !tr.solo })} aria-label={`Solo track ${i + 1}`}>S</button>
      </header>
      <div className="lp-body">
        <button className="lp-rec" onClick={() => void st.press(i)} disabled={state === 'working' || (!!st.rec && st.rec.track !== i)} data-testid={`lp-rec-${i}`} aria-label={`${BUTTON[state]}, track ${i + 1}`}>
          <svg viewBox="0 0 40 40" aria-hidden>
            <circle className="lp-ring-bg" cx="20" cy="20" r="17" pathLength={100} />
            <circle className="lp-ring" ref={ring} cx="20" cy="20" r="17" pathLength={100} strokeDasharray="100" strokeDashoffset="100" />
          </svg>
          <span className="lp-dot" />
          <span className="lp-lab">{BUTTON[state]}</span>
        </button>
        <div className="lp-wave-wrap">
          <Wave peaks={st.peaksOf(i)} />
          <div className="lp-head" ref={head} aria-hidden />
          {!has && state === 'empty' && <span className="lp-hint small muted">{role.hint}</span>}
        </div>
      </div>
      {state === 'empty' && (
        <div className="seg lp-lens" role="group" aria-label="Loop length">
          {lenItems.map(it => <button key={String(it.id)} aria-pressed={tr.lenChoice === it.id} onClick={() => st.setTrack(i, { lenChoice: it.id })}>{it.label}</button>)}
        </div>
      )}
      <div className="lp-faders">
        <label className="lp-fader small"><span>Vol</span><input type="range" min={0} max={1.6} step={0.02} value={tr.vol} onChange={e => st.setTrack(i, { vol: Number(e.target.value) })} aria-label={`Track ${i + 1} volume`} /></label>
        <label className="lp-fader small"><span>L</span><input type="range" min={-1} max={1} step={0.05} value={tr.pan} onChange={e => st.setTrack(i, { pan: Number(e.target.value) })} onDoubleClick={() => st.setTrack(i, { pan: 0 })} aria-label={`Track ${i + 1} pan`} /><span>R</span></label>
      </div>
      <div className="lp-actions">
        <button className="btn sm ghost" onClick={() => st.undo(i)} disabled={!has && !(st.rec?.track === i)} aria-label={`Undo track ${i + 1}`}><Ico n="undo" /> Undo</button>
        <button className="btn sm ghost" onClick={() => st.redo(i)} disabled={!st.canRedo(i)} aria-label={`Redo track ${i + 1}`}><Ico n="redo" /></button>
        <button className="btn sm ghost" onClick={() => st.clear(i)} disabled={!has} aria-label={`Clear track ${i + 1}`}><Ico n="trash" /></button>
        <span className="lp-sp" />
        <button className="btn sm ghost" aria-expanded={more} onClick={() => setMore(!more)} data-testid={`lp-more-${i}`}>More <Ico n="more" /></button>
      </div>
      {more && (
        <div className="lp-more stack" style={{ gap: 6 }}>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button className="chip" aria-pressed={tr.rev} onClick={() => st.setTrack(i, { rev: !tr.rev })}>Backwards</button>
            <button className="chip" aria-pressed={tr.half} onClick={() => st.setTrack(i, { half: !tr.half })} title="Half the speed, same pitch: twice as long">Half speed</button>
            {tr.role === 'bass' && <button className="chip" aria-pressed={tr.octave} onClick={() => st.setTrack(i, { octave: !tr.octave })} data-testid="lp-octave">Bass octave (−12)</button>}
            {tr.role === 'lead' && <button className="chip" aria-pressed={tr.duck} onClick={() => st.setTrack(i, { duck: !tr.duck })} data-testid="lp-duck">Others dip while it plays</button>}
          </div>
          <label className="row small" style={{ gap: 6, alignItems: 'center' }}>Role
            <select className="select sm" value={tr.role} onChange={e => { const r = e.target.value as Role; st.setTrack(i, { role: r, octave: r === 'bass', duck: r === 'lead' }) }}>
              {ROLES.map(r => <option key={r.role} value={r.role}>{r.label}</option>)}
            </select>
          </label>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <button className="btn sm" disabled={!has || !!busy} onClick={() => void chop('hits')} data-testid={`lp-chop-${i}`}><Ico n="scissors" /> Chop onto pads: at each note</button>
            <button className="btn sm" disabled={!has || !!busy} onClick={() => void chop('beats')}><Ico n="scissors" /> on the beat</button>
            <button className="btn sm" disabled={!has} onClick={() => { if (!toScanner(i)) onMsg('Record something first.') }} data-testid={`lp-tab-${i}`}><Ico n="scan" /> Make it a tab</button>
          </div>
        </div>
      )}
    </section>
  )
}

function Wave({ peaks }: { peaks: Float32Array | null }) {
  if (!peaks) return <div className="lp-wave empty" />
  return (
    <svg className="lp-wave" viewBox={`0 0 ${peaks.length} 100`} preserveAspectRatio="none" aria-hidden>
      {Array.from(peaks, (p, k) => <rect key={k} x={k + 0.15} width={0.7} y={50 - p * 46} height={Math.max(1.5, p * 92)} />)}
    </svg>
  )
}

/** The chord of the bar playing now (from the beat's keys and bass), its notes in gold, the next chord's 3rd coming. */
function NowNeck({ st, tuning }: { st: LoopStation; tuning: number[] }) {
  const t = st.transport
  const part: PartId = (st.s.part as PartId)
  const chords = useMemo(() => beatChords(beatInPart(t.beat, part)), [t.beat, part])
  const [pos, setPos] = useState({ bar: 0, beat: 0 })
  const [emb, setEmb] = useState(() => st.s.tracks[st.s.sel]?.role === 'embellish')
  useEffect(() => {
    let raf = 0, last = ''
    const tick = () => {
      const now = audio().currentTime
      const b = st.playing && now >= t.t0 ? st.barNow(now) : 0
      const bar = Math.floor(b), beat = Math.floor((b - bar) * 4)
      const key = `${bar}.${beat}`
      if (key !== last) { last = key; setPos({ bar, beat }) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [st, t])
  if (!chords.some(Boolean)) return <p className="small muted" style={{ margin: 0 }}>Give the beat some chords (Beat maker → Keyboard, or a style under Start from, or Jam → Loop it) and this neck shows what to play over each bar.</p>
  const n = chords.length
  const idx = ((pos.bar % n) + n) % n
  const now = chords[idx] ?? chords.find(Boolean)!
  const next = chords[(idx + 1) % n]
  const changing = next && next.name !== now.name && pos.beat >= 2
  const third = next ? next.pcs.find(p => (p - next.root + 12) % 12 === 3 || (p - next.root + 12) % 12 === 4) : undefined
  const minor = now.pcs.includes((now.root + 3) % 12)
  // the notes a free finger adds over the chord: 9 (add9 / sus2), 4 (sus4), 6
  const EMB: [number, string][] = [[2, '9'], [5, '4'], [9, minor ? '' : '6']]
  const markFor = (midi: number): Mark | null => {
    const p = midi % 12
    if (changing && third !== undefined && p === third) return { label: '3', role: 'next' }
    if (p === now.root) return { label: 'R', role: 'root' }
    if (now.pcs.includes(p)) return { label: '', role: 'target' }
    if (emb) { const e = EMB.find(([iv, l]) => l && (now.root + iv) % 12 === p); if (e) return { label: e[1], role: 'embel' } }
    return null
  }
  return (
    <>
      <div className="row lp-chords" style={{ gap: 6, flexWrap: 'wrap' }} aria-label="The beat's chords">
        {chords.map((c, k) => <span key={k} className={`chip${k === idx ? ' on' : ''}`}>{c?.name ?? '–'}</span>)}
      </div>
      <label className="ex-check small"><input type="checkbox" checked={emb} onChange={e => setEmb(e.target.checked)} data-testid="lp-emb" /> Show the embellishments too (violet: 9, 4 and 6 a free finger can add)</label>
      <Fretboard tuning={tuning} fromFret={0} toFret={12} markFor={markFor} compact zoomId="looper-neck" />
      <span className="small muted">Now: <b>{now.name}</b>{next && next.name !== now.name ? <> → next <b>{next.name}</b></> : null}</span>
    </>
  )
}

/** A slim looper strip for Play, Scales and the beat maker: play/stop, A/B, the four tracks, open the looper. */
export function LooperBar({ always = false }: { always?: boolean }) {
  const st = useStation()
  if (!always && !st.hasAudio() && !st.rec) return null
  return (
    <div className="looper-bar" data-testid="looper-bar" role="group" aria-label="Looper">
      <button className={`btn sm${st.playing ? ' on' : ''}`} onClick={() => (st.playing ? st.stop() : st.start(0))} aria-label={st.playing ? 'Stop the looper' : 'Play the looper'}>
        {st.playing ? <Ico n="stop" fill /> : <Ico n="play" fill />}
      </button>
      <BeatLight t={st.transport} playing={st.playing} />
      <button className={`btn sm lb-part${st.partAt ? ' armed' : ''}`} onClick={() => st.switchPart()} aria-label={`Part ${st.s.part}: switch`}>{st.s.part}</button>
      {[0, 1, 2, 3].map(i => {
        const s = trackState(st, i)
        return <button key={i} className={`lb-track s-${s}${st.s.sel === i ? ' sel' : ''}`} onClick={() => void st.press(i)} aria-label={`Track ${i + 1}: ${BUTTON[s]}`} data-testid={`lb-track-${i}`}>{i + 1}</button>
      })}
      <button className="btn sm ghost" onClick={() => openJam('loop')}>Looper</button>
    </div>
  )
}

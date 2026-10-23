// Play along: the tab, a YouTube mini player, the mic following your playing note by note,
// and the scales / chords of the song for soloing.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TabView, type LabelMode } from '../components/TabView'
import { YouTubePlayer } from '../components/YouTubePlayer'
import { HarmonyPanel, stringLabel } from '../components/HarmonyPanel'
import { Chips, usePersist } from '../components/Controls'
import { SongsSheet } from './SongsSheet'
import { InputPicker } from '../components/InputPicker'
import { NoteListener, matchNote, type FollowStep } from '../tabs/follow'
import { defaultTrack, flatten, playable, type SongNote, type SongTrack } from '../tabs/model'
import { detectKey, improvisationScales, type KeyGuess } from '../tabs/keyDetect'
import { chordInfo, chordTimeline, guessBarChords } from '../tabs/harmony'
import { docInstrument, getSong, listSongs, saveSong, type SongDoc } from '../tabs/library'
import { takePendingDoc } from '../nav'
import { bump, bumpCounts, usePracticeTimer } from '../learn/progress'
import { exampleDoc } from '../tabs/examples'
import { playNote, strum } from '../audio/pluck'
import { audio, keepAwake } from '../audio/engine'
import { TabPlayer } from '../audio/tabPlayer'
import { keyPrefersFlats, pcName } from '../theory/notes'
import { useInstrument } from '../instrument'

type View = 'tab' | 'solo' | 'both'
interface Feedback {
  ok: boolean
  heard: number
  /** the tab note it matched (when ok) */
  note?: SongNote
  expected?: SongNote[]
  skipped?: number
}

function keyFromTrack(track: SongTrack): { guesses: KeyGuess[]; weights: number[] } {
  const w = new Array(12).fill(0)
  const bass = new Array(12).fill(0)
  for (const bar of track.bars) {
    let low = Infinity
    for (const s of bar.steps) for (const n of s.notes) {
      if (n.tech === 'x') continue
      w[n.midi % 12] += Math.max(0.25, Math.min(s.dur, 2))
      low = Math.min(low, n.midi)
    }
    if (low < Infinity) bass[low % 12] += 1
    // chord names written in the tab add weight to their tones
    for (const s of bar.steps) if (s.chord) chordInfo(s.chord)?.pcs.forEach(p => { w[p] += 0.5 })
  }
  return { guesses: detectKey(w, bass), weights: w }
}

const noteName = (m: number, flats: boolean) => pcName(m % 12, flats)
const octave = (m: number) => Math.floor(m / 12) - 1

export function PlayScreen() {
  const inst = useInstrument()
  // each instrument remembers its own last song (guitar and ukulele tabs are kept apart)
  const [songId, setSongId] = usePersist(`playSong:${inst.id}`, '')
  const [doc, setDoc] = useState<SongDoc | null>(null)
  const [sheet, setSheet] = useState(false)
  const [view, setView] = usePersist<View>('playView', 'tab')
  const [labelMode, setLabelMode] = usePersist<LabelMode>('playLabels', 'both')
  const [strict, setStrict] = usePersist('playStrict', false)
  const [gate, setGate] = usePersist('playGate', 1)
  const [showVideo, setShowVideo] = usePersist('playVideo', true)
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState('')
  const [live, setLive] = useState<number | null>(null)
  const [input, setInput] = useState<{ label: string; external: boolean } | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [inspect, setInspect] = useState<SongNote | null>(null)
  const [pos, setPos] = useState(0)
  const [version, setVersion] = useState(0)
  const [flash, setFlash] = useState<{ flat: number; key: number } | null>(null)
  const [pulse, setPulse] = useState<{ ok: boolean; key: number } | null>(null)
  const [selecting, setSelecting] = useState<null | { first?: number }>(null)
  const [passes, setPasses] = useState<{ n: number; last: number | null; best: number | null }>({ n: 0, last: null, best: null })
  const states = useRef<Uint8Array>(new Uint8Array(0))
  const listener = useRef<NoteListener | null>(null)

  // ---------- load the song ----------
  useEffect(() => {
    let alive = true
    ;(async () => {
      const pending = takePendingDoc()
      if (pending) await saveSong(pending)
      let d = pending ?? (songId ? await getSong(songId) : undefined)
      if (d && docInstrument(d) !== inst.id) d = undefined
      if (!d) {
        const all = await listSongs(inst.id)
        d = all[0] ?? exampleDoc(inst.id === 'guitar' ? 'ode' : inst.id === 'tenor' ? 'uke-ode' : 'bari-ode', inst.tuning.notes)
        if (!all.length) await saveSong(d)
      }
      if (alive) {
        setDoc(d)
        if (d.id !== songId) setSongId(d.id)
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId])

  const update = useCallback((patch: Partial<SongDoc>) => {
    setDoc(d => {
      if (!d) return d
      const n = { ...d, ...patch, updated: Date.now() }
      void saveSong(n)
      return n
    })
  }, [])

  const trackIdx = doc ? Math.min(doc.track ?? defaultTrack(doc.song, inst.strings), doc.song.tracks.length - 1) : 0
  const track = doc?.song.tracks[trackIdx] ?? null
  const flat = useMemo(() => (track ? flatten(track) : []), [track])
  const follow = useMemo(() => {
    const idx: number[] = []
    const steps: FollowStep[] = []
    flat.forEach((f, i) => {
      const ns = playable(f.step)
      if (ns.length) { idx.push(i); steps.push({ midis: ns.map(n => n.midi) }) }
    })
    return { idx, steps }
  }, [flat])

  // the practice loop, as positions in the follow list
  const loop = doc?.loop ?? null
  const loopRange = useMemo(() => {
    if (!loop) return null
    const a = follow.idx.findIndex(i => flat[i].bar >= loop.from)
    let b = -1
    follow.idx.forEach((fi, k) => { if (flat[fi].bar <= loop.to) b = k })
    return a >= 0 && b >= a ? { a, b } : null
  }, [loop, follow, flat])

  // reset progress when the song or track changes
  useEffect(() => {
    states.current = new Uint8Array(flat.length)
    setPos(Math.min(doc?.cursor ?? 0, Math.max(0, follow.idx.length - 1)))
    setFeedback(null)
    setInspect(null)
    setVersion(v => v + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flat])

  // remember where you left off
  useEffect(() => {
    if (!doc || doc.cursor === pos) return
    const t = setTimeout(() => update({ cursor: pos }), 1200)
    return () => clearTimeout(t)
  }, [pos, doc, update])

  // ---------- key, chords ----------
  const keyData = useMemo(() => (track ? keyFromTrack(track) : null), [track])
  const detected = keyData?.guesses[0] ?? { root: 'A', minor: true, score: 0, label: 'A minor' }
  const key: KeyGuess = useMemo(() => {
    if (!doc?.key) return detected
    const { root, minor } = doc.key
    return { root, minor, score: 0, label: `${root} ${minor ? 'minor' : 'major'}` }
  }, [doc?.key, detected])
  const flats = keyPrefersFlats(key.root, key.minor)
  const tips = useMemo(() => (keyData ? improvisationScales(key, keyData.weights) : []), [key, keyData])
  const guesses = useMemo(() => (track ? guessBarChords(track, key, flats) : []), [track, key, flats])
  const timeline = useMemo(() => (track ? chordTimeline(track, doc?.chords ?? {}, guesses) : { spans: [], at: new Int32Array(0) }), [track, doc?.chords, guesses])

  const done = pos >= follow.idx.length
  const cursorFlat = done ? -1 : follow.idx[pos]
  const expected = cursorFlat >= 0 ? playable(flat[cursorFlat].step) : []
  let curSpan = cursorFlat >= 0 ? timeline.at[cursorFlat] : timeline.spans.length - 1
  if (curSpan < 0) {
    // before the first chord: show the first one
    curSpan = timeline.spans.findIndex(s => s.start > cursorFlat)
  }
  const nearFrets = useMemo(() => {
    if (cursorFlat < 0) return []
    const bar = flat[cursorFlat].bar
    return flat.filter(f => Math.abs(f.bar - bar) <= 1).flatMap(f => f.step.notes.map(n => n.fret))
  }, [flat, cursorFlat])

  // ---------- following the mic ----------
  const ref = useRef({ pos, follow, strict, flat, loopRange, lesson: false })
  ref.current = { pos, follow, strict, flat, loopRange, lesson: doc?.source === 'lesson' }

  const onNote = useCallback((midi: number) => {
    const { pos, follow, strict, loopRange } = ref.current
    // inside a loop, only look as far as the loop's last note
    const steps = loopRange ? follow.steps.slice(0, loopRange.b + 1) : follow.steps
    const r = matchNote(steps, pos, midi, strict)
    const st = states.current
    if (r.kind === 'hit') {
      for (let k = pos; k < r.step; k++) st[follow.idx[k]] = 2
      const fi = follow.idx[r.step]
      st[fi] = st[fi] === 3 ? 2 : 1
      const ns = playable(ref.current.flat[fi].step)
      const note = ns.find(n => (strict ? n.midi === midi : n.midi % 12 === midi % 12)) ?? ns[0]
      setFeedback({ ok: true, heard: midi, note, skipped: r.skipped })
      setFlash(f => ({ flat: fi, key: (f?.key ?? 0) + 1 }))
      setPulse(p => ({ ok: true, key: (p?.key ?? 0) + 1 }))
      bumpCounts({ notesHit: 1, [ref.current.lesson ? 'exerciseNotes' : 'songNotes']: 1 })
      let next = r.step + 1
      if (loopRange && next > loopRange.b) {
        // finished one pass of the loop: score it and go round again
        let ok = 0
        for (let k = loopRange.a; k <= loopRange.b; k++) if (st[follow.idx[k]] === 1) ok++
        const score = Math.round((ok / (loopRange.b - loopRange.a + 1)) * 100)
        setPasses(p => ({ n: p.n + 1, last: score, best: Math.max(p.best ?? 0, score) }))
        if (score >= 90) bump('loop90')
        setTimeout(() => {
          for (let k = loopRange.a; k <= loopRange.b; k++) st[follow.idx[k]] = 0
          setVersion(v => v + 1)
        }, 700)
        next = loopRange.a
      } else if (!loopRange && next >= follow.steps.length) {
        bump(ref.current.lesson ? 'exercisesFinished' : 'songsFinished')
      }
      setPos(next)
    } else if (r.kind === 'miss') {
      const fi = follow.idx[pos]
      if (st[fi] === 0) st[fi] = 3
      setFeedback({ ok: false, heard: midi })
      setPulse(p => ({ ok: false, key: (p?.key ?? 0) + 1 }))
    }
    setVersion(v => v + 1)
  }, [])

  async function toggleListen() {
    if (listening) {
      listener.current?.stop()
      listener.current = null
      setListening(false)
      setLive(null)
      setInput(null)
      void keepAwake(false)
      return
    }
    setMicError('')
    stopPreview()
    try {
      await audio().resume()
      const l = new NoteListener()
      l.gate = gate
      let last: number | null = null
      l.onFrame = f => { if (f.midi !== last) { last = f.midi; setLive(f.midi) } }
      l.onNote = e => onNote(e.midi)
      await l.start()
      listener.current = l
      setInput(l.input ? { label: l.input.label, external: l.input.external } : null)
      setListening(true)
      void keepAwake(true)
    } catch {
      setMicError('KGuitar needs microphone access to hear your guitar (this also covers a USB amp like the Amphonix). Allow it in your phone settings (Apps → KGuitar → Permissions), then try again.')
    }
  }
  const toggleListenRef = useRef(toggleListen)
  toggleListenRef.current = toggleListen
  useEffect(() => { if (listener.current) listener.current.gate = gate }, [gate])
  useEffect(() => () => { listener.current?.stop(); player.current?.stop(); void keepAwake(false) }, [])

  // ---------- hear how the tab sounds ----------
  const player = useRef<TabPlayer | null>(null)
  const [playAt, setPlayAt] = useState(-1)
  const [speed, setSpeed] = usePersist('playSpeed', 1)
  const songBpm = doc?.song.tempo ?? 90
  // practice time: listening with the mic counts as time with the guitar, Hear it as study time
  usePracticeTimer(doc?.source === 'lesson' ? 'warmup' : 'play', listening, true)
  usePracticeTimer('play', playAt >= 0 && !listening, false)
  function stopPreview() {
    player.current?.stop()
    setPlayAt(-1)
  }
  function preview() {
    if (playAt >= 0) { stopPreview(); return }
    if (listening) void toggleListen()
    const p = (player.current ??= new TabPlayer())
    p.onStep = i => setPlayAt(i)
    p.onEnd = () => setPlayAt(-1)
    if (loopRange) {
      const a = follow.idx[loopRange.a]
      let b = flat.length
      for (let i = follow.idx[loopRange.b] + 1; i < flat.length; i++) if (flat[i].bar > loop!.to) { b = i; break }
      const from = cursorFlat >= a && cursorFlat < b ? cursorFlat : a
      setPlayAt(from)
      p.play(flat, from, songBpm * speed, b, a)
      return
    }
    const from = cursorFlat >= 0 ? cursorFlat : 0
    setPlayAt(from)
    p.play(flat, from, songBpm * speed)
  }
  useEffect(() => { stopPreview() }, [flat]) // eslint-disable-line react-hooks/exhaustive-deps

  function restart(from = loopRange ? loopRange.a : 0) {
    states.current = new Uint8Array(flat.length)
    setPos(from)
    setFeedback(null)
    setVersion(v => v + 1)
  }

  // ---------- practice loop ----------
  function setLoop(l: { from: number; to: number } | undefined) {
    update({ loop: l })
    setPasses({ n: 0, last: null, best: null })
    stopPreview()
  }
  // jump into the loop when it is set
  useEffect(() => {
    if (!loopRange) return
    if (pos < loopRange.a || pos > loopRange.b) {
      states.current = new Uint8Array(flat.length)
      setPos(loopRange.a)
      setVersion(v => v + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopRange])
  const onBar = useCallback((bar: number) => {
    setSelecting(sel => {
      if (!sel) return sel
      if (sel.first === undefined) return { first: bar }
      const a = Math.min(sel.first, bar)
      const b = Math.max(sel.first, bar)
      setTimeout(() => setLoop({ from: a, to: b }), 0)
      return null
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onTap = useCallback((flatIdx: number, note: SongNote | null) => {
    if (player.current?.playing) { player.current.stop(); setPlayAt(-1) }
    const { follow } = ref.current
    let k = follow.idx.findIndex(i => i >= flatIdx)
    if (k < 0) k = follow.idx.length - 1
    const st = states.current
    for (let i = follow.idx[k]; i < st.length; i++) st[i] = 0
    setPos(k)
    setFeedback(null)
    setVersion(v => v + 1)
    const ctx = audio()
    void ctx.resume()
    if (note) {
      setInspect(note)
      if (note.tech !== 'x') playNote(note.midi, ctx.currentTime + 0.02)
    } else {
      const ns = playable(flat[follow.idx[k]]?.step ?? { notes: [], dur: 0 })
      setInspect(ns[0] ?? null)
      if (ns.length) strum(ns.map(n => n.midi), ctx.currentTime + 0.02, { spread: 0.02 })
    }
  }, [flat])

  function hearNext() {
    if (!expected.length) return
    const ctx = audio()
    void ctx.resume()
    strum(expected.map(n => n.midi), ctx.currentTime + 0.02, { spread: 0.02 })
  }

  const firstTry = useMemo(() => {
    let ok = 0, all = 0
    for (const i of follow.idx) { const s = states.current[i]; if (s === 1 || s === 2) { all++; if (s === 1) ok++ } }
    return all ? Math.round((ok / all) * 100) : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, follow])

  if (!doc || !track) {
    return <div className="play"><p className="muted">Loading…</p></div>
  }

  const tuning = track.tuning.map(t => t + track.capo)
  const where = (n: SongNote) => `${n.fret === 0 ? 'open' : `fret ${n.fret}`}, ${stringLabel(track.tuning, n.string, flats)} string`

  const readout = (
    <div className="readout-box" aria-live="polite">
      {pulse && <span key={pulse.key} className={`pulse-ring ${pulse.ok ? 'ok' : 'bad'}`} aria-hidden="true" />}
      <div className="heard">
        <span className="small muted">{listening ? 'Hearing' : 'Mic off'}</span>
        <span className={`heard-note${live !== null ? ' on' : ''}`}>
          {live !== null ? <>{noteName(live, flats)}<sub>{octave(live)}</sub></> : '–'}
        </span>
        <InputPicker
          active={input}
          onChanged={() => {
            // switch inputs on the fly
            if (!listener.current) return
            listener.current.stop()
            listener.current = null
            setListening(false)
            setTimeout(() => void toggleListenRef.current(), 50)
          }}
        />
      </div>
      <div className="next">
        {done ? (
          <>
            <b>Finished!</b>
            <span className="small muted">{firstTry !== null ? `${firstTry}% of notes right first time.` : ''}</span>
            <button className="btn sm" onClick={() => restart()}>Play again</button>
          </>
        ) : (
          <>
            <span className="small muted">
              Next · note {pos + 1} of {follow.idx.length} · bar {flat[cursorFlat].bar + 1}
              {loopRange && ` · loop pass ${passes.n + 1}${passes.last !== null ? ` · last pass ${passes.last}%` : ''}${passes.best !== null ? ` · best ${passes.best}%` : ''}`}
            </span>
            <span className="next-notes">
              {expected.map((n, i) => (
                <span key={i} className="nn"><b>{n.fret}</b> on {stringLabel(track.tuning, n.string, flats)} = <b className="amber">{noteName(n.midi, flats)}</b></span>
              ))}
              <button className="btn sm ghost" onClick={hearNext} aria-label="Hear the next note">▶</button>
            </span>
            {feedback && (
              feedback.ok ? (
                <span className="fb ok">✓ Got it: {noteName(feedback.heard, flats)}{feedback.note ? ` · ${where(feedback.note)}` : ''}{feedback.skipped ? ` (skipped ${feedback.skipped})` : ''}</span>
              ) : (
                <span className="fb bad">✗ You played {noteName(feedback.heard, flats)}{octave(feedback.heard)}: the tab wants {expected.map(n => noteName(n.midi, flats)).join(' or ')}</span>
              )
            )}
            {!feedback && inspect && (
              <span className="fb">{inspect.tech === 'x' ? 'Muted note (x): no pitch.' : `That ${inspect.fret} is ${noteName(inspect.midi, flats)}${octave(inspect.midi)} · ${where(inspect)}`}</span>
            )}
          </>
        )}
      </div>
    </div>
  )

  const tabTools = (
    <div className="tab-tools">
      {loop ? (
        <span className="loop-chip">⟲ Bars {loop.from + 1}–{loop.to + 1}<button onClick={() => setLoop(undefined)} aria-label="Stop looping">✕</button></span>
      ) : (
        <button className="btn sm" aria-pressed={!!selecting} onClick={() => setSelecting(selecting ? null : {})}>⟲ Loop a section</button>
      )}
      <button className={`btn sm hear${playAt >= 0 ? ' on' : ''}`} onClick={preview} aria-pressed={playAt >= 0}>
        {playAt >= 0 ? '■ Stop' : '▶ Hear it'}
      </button>
      <Chips label="Playback speed" items={[{ id: 0.5, label: '½' }, { id: 0.75, label: '¾' }, { id: 1, label: `1× · ${Math.round(songBpm)} bpm` }]} value={speed} onChange={v => { setSpeed(v); if (playAt >= 0) { stopPreview() } }} />
      <Chips label="Tab numbers" items={[{ id: 'fret', label: 'Frets' }, { id: 'note', label: 'Notes' }, { id: 'both', label: 'Both' }]} value={labelMode} onChange={setLabelMode} />
      <button className="btn sm" onClick={() => restart()}>Restart</button>
      <button className="btn sm" aria-pressed={strict} onClick={() => setStrict(!strict)} title="Only count the note in the exact octave">Exact octave</button>
      <Chips label="Mic sensitivity" items={[{ id: 1.8, label: 'Noisy room' }, { id: 1, label: 'Normal' }, { id: 0.6, label: 'Quiet guitar' }]} value={gate} onChange={setGate} />
    </div>
  )

  return (
    <div className={`play view-${view}${showVideo && doc.youtube ? ' has-video' : ''}`}>
      <header className="play-head">
        <button className="btn sm" onClick={() => setSheet(true)}>Songs</button>
        <div className="song-title">
          <b>{doc.title}</b>
          {doc.song.tracks.length > 1 ? (
            <select className="select sm" value={trackIdx} onChange={e => update({ track: Number(e.target.value), cursor: 0 })} aria-label="Track">
              {doc.song.tracks.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
            </select>
          ) : doc.artist ? <span className="small muted">{doc.artist}</span> : null}
        </div>
        <button className="btn sm" aria-pressed={showVideo} onClick={() => setShowVideo(!showVideo)}>Video</button>
        <button className={`btn listen${listening ? ' on' : ''}`} onClick={toggleListen} aria-pressed={listening}>
          <span className="dot" /> {listening ? 'Listening' : 'Listen'}
        </button>
      </header>

      <section className="play-side">
        {showVideo && <YouTubePlayer url={doc.youtube} onUrl={u => update({ youtube: u })} />}
        {readout}
        {micError && <p className="notice small">{micError}</p>}
      </section>

      <div className="view-switch">
        <Chips label="View" items={[{ id: 'tab', label: 'Tab' }, { id: 'solo', label: 'Scales & chords' }, { id: 'both', label: 'Both' }]} value={view} onChange={setView} />
      </div>

      <section className="play-tab">
        {tabTools}
        {selecting && (
          <div className="select-hint">
            <span>{selecting.first === undefined ? 'Tap the first bar of the part you want to loop.' : `Start: bar ${selecting.first + 1}. Now tap the last bar (or the same bar again).`}</span>
            <button className="btn sm" onClick={() => setSelecting(null)}>Cancel</button>
          </div>
        )}
        <TabView track={track} mode={labelMode} flats={flats} cursor={playAt >= 0 ? playAt : cursorFlat} playing={playAt >= 0} states={states.current}
          flash={flash} loop={loop} selecting={!!selecting} onBar={onBar} version={version} spans={timeline.spans} onTap={onTap} />
        {track.capo > 0 && <p className="small muted cap">Capo on fret {track.capo}: frets are counted from the capo.</p>}
        {track.tuning.length !== inst.strings && (
          <p className="small muted cap">This tab is for a {track.tuning.length}-string instrument; you're in {inst.label.toLowerCase()} mode. Pick a {inst.strings}-string tab from Songs to play along on your {inst.noun}.</p>
        )}
      </section>

      <section className="play-solo">
        <HarmonyPanel
          tuning={tuning}
          keyGuess={key}
          keyIsAuto={!doc.key}
          detected={detected}
          tips={tips}
          flats={flats}
          spans={timeline.spans}
          curSpan={curSpan}
          expected={expected.map(n => ({ ...n }))}
          nearFrets={nearFrets}
          compact
          onKey={k => update({ key: k ?? undefined })}
          onEditChord={(bar, name) => {
            const chords = { ...(doc.chords ?? {}) }
            if (name === null) delete chords[bar]
            else chords[bar] = name
            update({ chords })
          }}
        />
      </section>

      {sheet && (
        <SongsSheet
          currentId={doc.id}
          onClose={() => setSheet(false)}
          onOpen={d => { setSheet(false); setDoc(d); setSongId(d.id) }}
        />
      )}
    </div>
  )
}

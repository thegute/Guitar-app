// The exercise library on screen: filter by difficulty, type and technique, step through with ‹ ›, star favourites,
// pick a key, sound and tempo, and hear it with a count-in, a click and a loop. The neck shows every note in the order
// you play it (roots in red), the tab follows the playhead, and "Play along" opens it in Play so the app listens.
import { HandGuide } from '../components/HandGuide'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useInstrument } from '../instrument'
import { usePersist } from '../components/Controls'
import { Fretboard, type Mark } from '../components/Fretboard'
import { TabView } from '../components/TabView'
import { TabPlayer } from '../audio/tabPlayer'
import { audio } from '../audio/engine'
import { SOUNDS, activeSound, loadSound, playNote, soundForProgram, type SoundId } from '../audio/pluck'
import { flatten, type Song, type SongNote } from '../tabs/model'
import { saveSong, type SongDoc } from '../tabs/library'
import { learnGo, onOpenExercise, openInPlay, takePendingExercise } from '../nav'
import { keyPrefersFlats, pc } from '../theory/notes'
import { lickById } from '../licks/library'
import { EX_TYPES, LEVELS, TECHS, exerciseCatalog, keyName, keysFor, type Exercise, type Level } from './catalog'
import { spell } from './build'

interface Filters { level: 'all' | Level; type: string; tech: string; fav: boolean }
const NO_FILTER: Filters = { level: 'all', type: 'all', tech: 'all', fav: false }
const r12 = (n: number) => ((n % 12) + 12) % 12

/** A chord name moved from one key to another (A7 written in A, played in C → C7). */
function moveChord(name: string, from: string, to: string) {
  const d = r12(pc(to) - pc(from))
  return name.replace(/([A-G][#b]?)/g, (m: string) => spell(pc(m) + d, to))
}

export function ExerciseBrowser() {
  const inst = useInstrument()
  const all = useMemo(() => exerciseCatalog(inst), [inst])
  const [f, setF] = usePersist<Filters>('exFilter', NO_FILTER)
  const [favs, setFavs] = usePersist<string[]>('exFav', [])
  const [code, setCode] = usePersist<string>('exCode', all.find(e => e.start)?.code ?? all[0].code)
  const [keys, setKeys] = usePersist<Record<string, string>>('exKeys', {})
  const [tempos, setTempos] = usePersist<Record<string, number>>('exBpm', {})
  const [soundPick, setSoundPick] = usePersist<'auto' | SoundId>('exSound', 'auto')
  const [countIn, setCountIn] = usePersist('exCountIn', true)
  const [metro, setMetro] = usePersist('exClick', true)
  const [loop, setLoop] = usePersist('exLoop', false)

  // a link (search, Learn) can ask for one exercise: show it even if the filters would hide it
  useEffect(() => {
    const show = (c: string) => {
      if (c.startsWith('type:')) {
        const type = c.slice(5)
        const first = all.find(e => e.type === type && e.start) ?? all.find(e => e.type === type)
        if (first) { setF({ ...NO_FILTER, type }); setCode(first.code) }
      } else if (all.some(e => e.code === c)) { setF(NO_FILTER); setCode(c) }
    }
    const c = takePendingExercise()
    if (c) show(c)
    return onOpenExercise(show)
  }, [all]) // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => all.filter(e =>
    (f.level === 'all' || e.level === f.level) &&
    (f.type === 'all' || (f.type === 'start' ? !!e.start : e.type === f.type)) &&
    (f.tech === 'all' || e.tech.includes(f.tech)) &&
    (!f.fav || favs.includes(e.code))), [all, f, favs])
  const idx = Math.max(0, list.findIndex(e => e.code === code))
  const ex: Exercise | undefined = list[idx]
  useEffect(() => { if (ex && ex.code !== code) setCode(ex.code) }, [ex, code, setCode])

  const typeCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of all) m.set(e.type, (m.get(e.type) ?? 0) + 1)
    return m
  }, [all])
  const techsHere = useMemo(() => TECHS.filter(t => all.some(e => e.tech.includes(t.id))), [all])
  const groups = useMemo(() => [...new Set(EX_TYPES.map(t => t.group))].map(g => ({ g, types: EX_TYPES.filter(t => t.group === g && typeCounts.has(t.id)) })), [typeCounts])

  if (!ex) {
    return (
      <div className="stack ex-browser">
        <section className="panel stack ex-controls">
          <FilterBar f={f} setF={setF} groups={groups} techs={techsHere} typeCounts={typeCounts} />
          <p className="notice" style={{ margin: 0 }}>No exercises match those filters{f.fav ? ' (favourites only is on)' : ''}.</p>
          <button className="btn" onClick={() => setF(NO_FILTER)}>Show all exercises</button>
        </section>
      </div>
    )
  }
  const go = (d: number) => setCode(list[(idx + d + list.length) % list.length].code)
  const random = () => { if (list.length > 1) { let j = idx; while (j === idx) j = Math.floor(Math.random() * list.length); setCode(list[j].code) } }
  const fav = favs.includes(ex.code)
  const controls = (
    <>
      <FilterBar f={f} setF={setF} groups={groups} techs={techsHere} typeCounts={typeCounts} />
      <div className="ex-count row">
        <span><b>Exercise {idx + 1}</b> of {list.length}</span>
        <button className="btn sm" onClick={random} disabled={list.length < 2}>🎲 Random</button>
        <button className="btn sm ghost" onClick={() => setF(NO_FILTER)} disabled={JSON.stringify(f) === JSON.stringify(NO_FILTER)} aria-label="Clear the filters">↺ Clear</button>
        <label className="ex-check"><input type="checkbox" checked={f.fav} onChange={e => setF({ ...f, fav: e.target.checked })} /> Favourites only</label>
      </div>
      <div className="ex-pick">
        <button className="btn" onClick={() => go(-1)} aria-label="Previous exercise">‹</button>
        <select className="select" value={ex.code} onChange={e => setCode(e.target.value)} aria-label="Exercise">
          {list.map(e => <option key={e.code} value={e.code}>{e.code} · {e.name}</option>)}
        </select>
        <button className="btn" onClick={() => go(1)} aria-label="Next exercise">›</button>
        <button className={`btn ex-star${fav ? ' on' : ''}`} aria-pressed={fav} aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
          onClick={() => setFavs(fav ? favs.filter(c => c !== ex.code) : [...favs, ex.code])}>{fav ? '★' : '☆'}</button>
      </div>
    </>
  )
  return (
    <div className="stack ex-browser" style={{ gap: 10 }}>
      <ExerciseView key={ex.code + inst.id + inst.tuning.id} ex={ex} controls={controls}
        root={keys[ex.code] ?? ex.key ?? 'C'} setRoot={k => setKeys({ ...keys, [ex.code]: k })}
        bpm={tempos[ex.code] ?? ex.bpm} setBpm={b => setTempos({ ...tempos, [ex.code]: b })}
        soundPick={soundPick} setSoundPick={setSoundPick}
        countIn={countIn} setCountIn={setCountIn} metro={metro} setMetro={setMetro} loop={loop} setLoop={setLoop} />
    </div>
  )
}

function FilterBar({ f, setF, groups, techs, typeCounts }: { f: Filters; setF: (f: Filters) => void; groups: { g: string; types: typeof EX_TYPES }[]; techs: typeof TECHS; typeCounts: Map<string, number> }) {
  return (
    <div className="ex-filters">
      <label className="field">
        <span>Difficulty</span>
        <select className="select" value={String(f.level)} onChange={e => setF({ ...f, level: e.target.value === 'all' ? 'all' : (Number(e.target.value) as Level) })}>
          <option value="all">All levels</option>
          {[1, 2, 3, 4].map(l => <option key={l} value={l}>{LEVELS[l]}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Type</span>
        <select className="select" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
          <option value="all">Everything</option>
          <option value="start">Start here (the essentials)</option>
          {groups.map(({ g, types }) => (
            <optgroup key={g} label={g}>{types.map(t => <option key={t.id} value={t.id}>{t.label} ({typeCounts.get(t.id)})</option>)}</optgroup>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Technique</span>
        <select className="select" value={f.tech} onChange={e => setF({ ...f, tech: e.target.value })}>
          <option value="all">Any technique</option>
          {techs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>
    </div>
  )
}

interface ViewProps {
  ex: Exercise; controls: ReactNode; root: string; setRoot: (k: string) => void; bpm: number; setBpm: (b: number) => void
  soundPick: 'auto' | SoundId; setSoundPick: (s: 'auto' | SoundId) => void
  countIn: boolean; setCountIn: (v: boolean) => void; metro: boolean; setMetro: (v: boolean) => void; loop: boolean; setLoop: (v: boolean) => void
}

function ExerciseView({ ex, controls, root: rootPref, setRoot, bpm, setBpm, soundPick, setSoundPick, countIn, setCountIn, metro, setMetro, loop, setLoop }: ViewProps) {
  const inst = useInstrument()
  const keyList = useMemo(() => keysFor(ex, inst), [ex, inst])
  const root = ex.key ? (keyList.includes(rootPref) ? rootPref : keyList.includes(ex.key) ? ex.key : keyList[0] ?? ex.key) : 'C'
  const song: Song | null = useMemo(() => { try { return ex.make({ root, inst, bpm }) } catch { return null } }, [ex, root, inst, bpm])
  const track = song?.tracks[0]
  const flat = useMemo(() => (track ? flatten(track) : []), [track])
  const states = useMemo(() => new Uint8Array(flat.length), [flat])
  const meter = song?.meter ?? ex.meter ?? 4
  const [at, setAt] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState('')
  const player = useRef<TabPlayer | null>(null)
  const sound: SoundId = soundPick === 'auto' ? activeSound(soundForProgram(track?.program)) : soundPick
  useEffect(() => () => player.current?.stop(), [])
  useEffect(() => { player.current?.stop(); setPlaying(false); setCount(0); setAt(0); setStatus('') }, [song])
  useEffect(() => { void loadSound(sound) }, [sound])

  const start = (from = at >= flat.length - 1 ? 0 : at) => {
    if (!flat.length) return
    const p = (player.current ??= new TabPlayer())
    p.stop()
    p.sound = sound
    p.meter = meter
    p.click = metro
    p.countIn = countIn ? meter : 0
    p.onCount = n => { setCount(n); setStatus(n ? `Count-in: ${n}` : 'Playing') }
    p.onStep = i => setAt(i)
    p.onEnd = () => { setPlaying(false); setStatus('Finished. Tap Play to hear it again, or play along so the app listens.'); setAt(0) }
    p.play(flat, from, bpm, flat.length, loop ? 0 : undefined)
    setPlaying(true)
    setStatus(countIn ? 'Count-in…' : 'Playing')
  }
  const stop = () => { player.current?.stop(); setPlaying(false); setCount(0); setStatus('Stopped') }
  const restart = () => { setAt(0); if (playing) start(0) }
  const seek = (i: number) => { setAt(i); if (playing) start(i) }
  const tapNote = (i: number, n: SongNote | null) => {
    const ns = n ? [n] : flat[i]?.step.notes ?? []
    const ctx = audio(); void ctx.resume()
    ns.forEach((x, k) => playNote(x.midi, ctx.currentTime + 0.02 + k * 0.015, 0.75, undefined, { sound }))
    seek(i)
  }

  // chord shown on the card: the last chord at or before the playhead, else the exercise's chord in this key
  const chordNow = useMemo(() => {
    for (let i = Math.min(at, flat.length - 1); i >= 0; i--) if (flat[i].step.chord) return flat[i].step.chord!
    if (ex.chord && ex.key) return moveChord(ex.chord, ex.key, root)
    return ex.key ? keyName(root, ex.minor) : ''
  }, [at, flat, ex, root])
  const bar = flat[Math.min(at, flat.length - 1)]?.bar ?? 0
  const flats = keyPrefersFlats(root, !!ex.minor)
  const lick = ex.lick ? lickById(ex.lick) : undefined

  // the neck: every note numbered in the order it's first played; for chords, the shape under the playhead
  const neck = useMemo(() => {
    const order = new Map<string, number>()
    // chords, double stops and picked chord patterns show the shape under the playhead instead of numbered notes
    const chordy = flat.some(fs => fs.step.notes.length >= 2) || ['fingerstyle', 'melodic', 'strumming', 'chords', 'barre', 'power'].includes(ex.type)
    for (const fs of flat) for (const n of fs.step.notes) { const k = `${n.string}:${n.fret}`; if (!order.has(k)) order.set(k, order.size + 1) }
    const frets = flat.flatMap(fs => fs.step.notes.map(n => n.fret))
    const hi = Math.max(4, ...frets)
    const fretted = frets.filter(x => x > 0)
    const lo = fretted.length ? Math.min(...fretted) : 0
    let from = Math.max(0, lo - 1), to = Math.min(22, hi + 1)
    if (to - from < 5) to = Math.min(22, from + 5)
    if (from <= 2) from = 0
    // where each shape starts: at each chord name, or at each bar when there are none
    const named = flat.some(fs => fs.step.chord)
    const starts = flat.map((fs, i) => (named ? !!fs.step.chord || i === 0 : i === 0 || fs.bar !== flat[i - 1].bar))
    return { order, chordy, from, to, starts }
  }, [flat, ex.type])
  const rootPc = ex.key ? pc(root) : -1
  const capo = track?.capo ?? 0
  const live = new Set((flat[at]?.step.notes ?? []).map(n => `${n.string}:${n.fret}`))
  const shapeAt = useMemo(() => {
    if (!neck.chordy || !flat.length) return null
    let i = Math.min(at, flat.length - 1)
    while (i > 0 && !neck.starts[i]) i--
    const out = new Set<string>()
    for (let j = i; j < flat.length && (j === i || !neck.starts[j]); j++) flat[j].step.notes.forEach(n => out.add(`${n.string}:${n.fret}`))
    return out
  }, [at, flat, neck])
  const markFor = (midi: number, s: number, fret: number): Mark | null => {
    const k = `${s}:${fret}`
    if (shapeAt) {
      if (!shapeAt.has(k)) return null
      return { label: '', role: live.has(k) && playing ? 'live' : r12(midi + capo) === rootPc ? 'root' : 'chord' }
    }
    const n = neck.order.get(k)
    if (!n) return null
    return { label: String(n), role: live.has(k) && playing ? 'live' : r12(midi + capo) === rootPc ? 'root' : 'scale' }
  }

  const playAlong = async () => {
    if (!song) return
    player.current?.stop()
    const doc: SongDoc = { id: `ex:${ex.code}:${root}:${inst.id}:${inst.tuning.id}`, title: `${ex.code} · ${song.title}`, source: 'lesson', inst: inst.id,
      ...(ex.key ? { key: { root, minor: !!ex.minor } } : {}), song: { ...song, tempo: bpm }, updated: Date.now() }
    try { await saveSong(doc) } catch { /* it still opens */ }
    openInPlay(doc)
  }

  return (
    <>
      <section className="panel stack ex-controls">
      {controls}
      <p className="ex-desc"><b>{LEVELS[ex.level]}</b> · {EX_TYPES.find(t => t.id === ex.type)?.label} · {ex.about}</p>
      <div className="ex-settings">
        {ex.key ? (
          <label className="field">
            <span>Key</span>
            <select className="select" value={root} onChange={e => setRoot(e.target.value)}>
              {keyList.map(k => <option key={k} value={k}>{keyName(k, ex.minor)}</option>)}
            </select>
          </label>
        ) : <div className="field"><span>Key</span><span className="ex-nokey">Any (no key)</span></div>}
        <label className="field">
          <span>Guitar sound</span>
          <select className="select" value={soundPick} onChange={e => setSoundPick(e.target.value as 'auto' | SoundId)}>
            <option value="auto">Auto</option>
            {SOUNDS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="field ex-tempo">
          <span>Tempo: <b>{bpm}</b> BPM{bpm !== ex.bpm ? <button className="link-btn" onClick={e => { e.preventDefault(); setBpm(ex.bpm) }}> (reset to {ex.bpm})</button> : null}</span>
          <input type="range" min={30} max={240} step={1} value={bpm} onChange={e => setBpm(Number(e.target.value))} aria-label="Tempo" />
        </label>
      </div>
      <div className="ex-transport">
        <button className={`btn primary${playing ? ' on' : ''}`} onClick={() => (playing ? stop() : start())} disabled={!song}>{playing ? '■ Stop' : '▶ Play'}</button>
        <button className="btn" onClick={restart} aria-label="Back to the start">⏮</button>
        <label className="ex-check"><input type="checkbox" checked={countIn} onChange={e => setCountIn(e.target.checked)} /> Count-in</label>
        <label className="ex-check"><input type="checkbox" checked={metro} onChange={e => setMetro(e.target.checked)} /> Metronome</label>
        <label className="ex-check"><input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} /> Loop</label>
      </div>
      </section>
      <section className="panel ex-card">
        <div className="ex-card-head">
          <span className={`ex-chord${!chordNow && !count ? ' ex-name' : ''}`}>{count > 0 ? <span className="ex-count-in">{count}</span> : chordNow || ex.name}</span>
          <span className="small muted">{ex.kind} <b>{ex.code}</b> · {bpm} BPM{capo ? ` · capo ${capo}` : ''}</span>
        </div>
        {song && track ? (
          <>
            <Fretboard tuning={track.tuning} fromFret={neck.from} toFret={neck.to} markFor={markFor} zoomId="exercise" compact
              onTap={m => { const ctx = audio(); void ctx.resume(); playNote(m + capo, ctx.currentTime + 0.01, 0.75, undefined, { sound }) }} />
            <TabView track={track} mode="fret" flats={flats} cursor={at} playing={playing} states={states} version={0} spans={[]}
              onTap={tapNote} counts meter={meter} />
            <HandGuide track={track} cursor={at} />
            <input className="ex-seek" type="range" min={0} max={Math.max(0, flat.length - 1)} value={Math.min(at, flat.length - 1)} onChange={e => seek(Number(e.target.value))} aria-label="Where to start" />
            <div className="row small muted" style={{ justifyContent: 'space-between' }}>
              <span>Tap to hear & seek · {meter}/4</span>
              <span>Bar {bar + 1} / {track.bars.length}</span>
            </div>
            <p className="small ex-status" role="status">{status || (capo ? `Capo on fret ${capo}: fret numbers count from the capo.` : 'Ready')}</p>
          </>
        ) : <p className="notice">This one doesn't fit your {inst.noun} in this key. Try another key, or the next exercise.</p>}
      </section>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={() => void playAlong()} disabled={!song}>Play along (it listens)</button>
        {lick?.must && <button className="btn" onClick={() => learnGo({ licks: lick.id })}>📖 How to play it, step by step</button>}
      </div>
    </>
  )
}

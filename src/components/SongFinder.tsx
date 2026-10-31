// Jam → "Find the chords": play a song (a YouTube video here, or any recording nearby) and KGuitar listens through
// the mic, writing down the chords as they change and the key, or (Notes mode) a single melody line as a tab.
import { useEffect, useRef, useState } from 'react'
import { ChordFinder, ChordSegmenter, NoteSegmenter, chordName, cleanSegments, findLoop, keyOf, sheetFromSegments, tabFromNotes, type HeardNote, type Quality, type Segment } from '../audio/chordFinder'
import { FLATS, SHARPS, keyPrefersFlats } from '../theory/notes'
import { useInstrument } from '../instrument'
import { shapeNotes } from '../tabs/chordSheet'
import type { SongBar, SongStep } from '../tabs/model'
import type { SongDoc } from '../tabs/library'
import { keepAwake } from '../audio/engine'
import { Chips, usePersist } from './Controls'
import { YouTubePlayer } from './YouTubePlayer'
import type { Heard } from '../audio/voiceGate'
import type { VideoApi } from '../play/inTime'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function SongFinder({ onUseInJam, onOpen }: {
  onUseInJam: (tonic: string, minor: boolean, chords: { root: string; q: Quality }[]) => void
  onOpen: (doc: SongDoc) => void
}) {
  const inst = useInstrument()
  const [url, setUrl] = usePersist<string | undefined>('finderVideo', undefined)
  const [mode, setMode] = usePersist<'chords' | 'notes'>('finderMode', 'chords')
  const [bpm, setBpm] = usePersist('finderBpm', 90)
  const [segs, setSegs] = usePersist<Segment[]>('finderChords', [])
  const [notes, setNotes] = usePersist<HeardNote[]>('finderNotes', [])
  const [sums, setSums] = usePersist<{ c: number[]; b: number[] }>('finderSums', { c: new Array(12).fill(0), b: new Array(12).fill(0) })
  const [on, setOn] = useState(false)
  const [err, setErr] = useState('')
  const [live, setLive] = useState<{ chord: string; level: number; note: number | null; heard: Heard; ignored: number }>({ chord: '', level: 0, note: null, heard: 'quiet', ignored: 0 })
  const [singing, setSinging] = usePersist('finderSinging', false)
  // the video in this panel: when it's paused, listening pauses too
  const video = useRef<VideoApi | null>(null)
  const played = useRef(false)
  const finder = useRef<ChordFinder | null>(null)
  const seg = useRef<ChordSegmenter | null>(null)
  const nseg = useRef<NoteSegmenter | null>(null)
  const lastT = useRef(0)
  const taps = useRef<number[]>([])

  useEffect(() => () => { finder.current?.stop(); void keepAwake(false) }, [])
  const key = keyOf(sums.c, sums.b)
  const flats = key ? keyPrefersFlats(key.root, key.minor) : false
  const shown = cleanSegments(segs)

  async function toggle() {
    if (on) {
      finder.current?.stop()
      finder.current = null
      nseg.current?.close(lastT.current)
      setOn(false)
      void keepAwake(false)
      return
    }
    setErr('')
    try {
      const f = new ChordFinder()
      const s = new ChordSegmenter()
      const n = new NoteSegmenter()
      // carry on from what's already there
      s.segments = segs.map(x => ({ ...x }))
      n.notes = notes.map(x => ({ ...x }))
      seg.current = s
      nseg.current = n
      let start = -1
      const offset = segs.length ? segs[segs.length - 1].t + segs[segs.length - 1].dur + 1 : notes.length ? notes[notes.length - 1].t + notes[notes.length - 1].dur + 1 : 0
      let acc = { c: [...sums.c], b: [...sums.b] }
      let frames = 0
      f.onFrame = fr => {
        if (start < 0) start = fr.t
        const t = fr.t - start + offset
        lastT.current = t
        frames++
        // the video here is paused: nothing to write down
        const v = video.current
        if (v?.playing()) played.current = true
        const paused = !!v && played.current && !v.playing()
        const heard: Heard = paused ? 'quiet' : fr.heard
        const level = paused ? 0 : fr.level
        if (mode === 'chords') {
          // chords under singing are real music; talking is skipped unless a chord clearly rings under it
          s.push(t, fr.chroma, fr.bass, level, heard === 'talking')
          if (level > 0.004 && heard !== 'talking') acc = { c: acc.c.map((x, i) => x + fr.chroma[i]), b: acc.b.map((x, i) => x + fr.bass[i]) }
        } else {
          const allow = heard === 'playing' ? 'pluck' : heard === 'singing' && singing ? 'any' : 'none'
          n.push(t, fr.midi, fr.onset, level, paused ? 'none' : allow)
          if (fr.midi !== null && allow !== 'none') { const p = ((Math.round(fr.midi) % 12) + 12) % 12; acc = { ...acc, c: acc.c.map((x, i) => x + (i === p ? 1 : 0)) } }
        }
        const last = s.segments[s.segments.length - 1]
        setLive({ chord: mode === 'chords' && last && level > 0.004 && heard !== 'talking' ? chordName(last, flats) : '', level, note: fr.midi, heard: paused ? 'quiet' : heard, ignored: n.ignored })
        // save every second or so
        if (frames % 25 === 0) { setSegs(s.segments.map(x => ({ ...x }))); setNotes(n.notes.map(x => ({ ...x }))); setSums(acc) }
      }
      await f.start()
      finder.current = f
      setOn(true)
      void keepAwake(true)
    } catch {
      setErr('Listening needs the microphone: allow it for KGuitar and try again.')
    }
  }
  // keep the last frames when stopping
  useEffect(() => {
    if (on) return
    if (seg.current) setSegs(seg.current.segments.map(x => ({ ...x })))
    if (nseg.current) setNotes(nseg.current.notes.map(x => ({ ...x })))
  }, [on]) // eslint-disable-line react-hooks/exhaustive-deps

  function tapTempo() {
    const t = performance.now()
    taps.current = [...taps.current.filter(x => t - x < 3000), t].slice(-8)
    const ts = taps.current
    if (ts.length >= 4) {
      const gaps = ts.slice(1).map((x, i) => x - ts[i]).sort((a, b) => a - b)
      setBpm(Math.round(60000 / gaps[Math.floor(gaps.length / 2)]))
    }
  }
  function clear() {
    setSegs([]); setNotes([]); setSums({ c: new Array(12).fill(0), b: new Array(12).fill(0) })
    seg.current = null; nseg.current = null
  }
  function rename(i: number, v: string) {
    const clean = cleanSegments(segs)
    if (v === 'x') clean.splice(i, 1)
    else { const [r, q] = v.split(':'); clean[i] = { ...clean[i], root: Number(r), q: q as Quality } }
    setSegs(clean)
  }

  function useInJam() {
    if (!key || !shown.length) return
    const loop = findLoop(shown.map(s => `${s.root}:${s.q}`))
    onUseInJam(key.root, key.minor, loop.map(x => { const [r, q] = x.split(':'); return { root: (flats ? FLATS : SHARPS)[Number(r)], q: q as Quality } }))
  }
  function openChords() {
    const list = sheetFromSegments(shown, bpm, flats)
    const bars: SongBar[] = []
    let bar: SongStep[] = [], used = 0
    for (const c of list) {
      let left = c.beats
      while (left > 0) {
        const take = Math.min(left, 4 - used)
        bar.push({ dur: take, chord: c.name, notes: shapeNotes(c.name, inst, 0) })
        left -= take; used += take
        if (used >= 4) { bars.push({ steps: bar }); bar = []; used = 0 }
      }
    }
    if (bar.length) bars.push({ steps: bar })
    const title = `Chords I heard${key ? ` (${key.label})` : ''}`
    onOpen({ id: `found:chords:${Date.now().toString(36)}`, title, source: 'chords', inst: inst.id, song: { title, tempo: bpm, strum: 'down', tracks: [{ name: 'Chords', tuning: inst.midis, capo: 0, bars }] }, ...(key ? { key: { root: key.root, minor: key.minor } } : {}), ...(url ? { youtube: url } : {}), updated: Date.now() })
  }
  function openNotes() {
    if (!notes.length) return
    const title = 'Melody I heard'
    const song = tabFromNotes(notes, bpm, inst.midis, title)
    onOpen({ id: `found:notes:${Date.now().toString(36)}`, title, source: 'text', inst: inst.id, song, ...(key ? { key: { root: key.root, minor: key.minor } } : {}), ...(url ? { youtube: url } : {}), updated: Date.now() })
  }

  const noteName = (m: number) => (flats ? FLATS : SHARPS)[((Math.round(m) % 12) + 12) % 12]
  return (
    <div className="stack song-finder" style={{ gap: 10 }}>
      <p className="small muted" style={{ margin: 0 }}>
        Play a song out loud and KGuitar listens through the mic: in <b>Chords</b> mode it writes down the chords and the key, in <b>Notes</b> mode a single melody line as a tab. Chords work well from a song. Notes work best with only one instrument playing (you playing a riff, or a solo guitar lesson): from a full band mix they're a rough guess. For an exact tab use a screenshot of the on-screen tab above, or search for the real tab.
      </p>
      <YouTubePlayer url={url} onUrl={u => { setUrl(u); played.current = false }} onApi={api => { video.current = api }} note="Play it on the phone speaker, turned up, so the mic can hear it." />
      <Chips label="Listen for" items={[{ id: 'chords' as const, label: 'Chords' }, { id: 'notes' as const, label: 'Notes (melody)' }]} value={mode} onChange={v => { if (!on) setMode(v) }} />
      {mode === 'notes' && (
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={singing} onChange={e => setSinging(e.target.checked)} />
          <span>Include singing (write down a sung melody too). Talking is always left out.</span>
        </label>
      )}
      <div className="row" style={{ gap: 8 }}>
        <button className={`btn${on ? ' on' : ' primary'} listen`} onClick={() => void toggle()} aria-pressed={on}><span className="dot" /> {on ? 'Stop listening' : 'Listen'}</button>
        <label className="row" style={{ gap: 4 }}><span className="small">Tempo</span>
          <input className="input" style={{ width: 64, flex: 'none' }} inputMode="numeric" value={bpm} onChange={e => { const v = Number(e.target.value); if (v > 0) setBpm(Math.min(260, v)) }} aria-label="Tempo in BPM" />
        </label>
        <button className="btn sm" onClick={tapTempo}>Tap tempo</button>
      </div>
      {err && <p className="notice small">{err}</p>}
      {on && (
        <div className="finder-live" aria-live="polite">
          <span className="finder-chord">{mode === 'chords' ? live.chord || '…' : live.note !== null && (live.heard === 'playing' || (live.heard === 'singing' && singing)) ? noteName(live.note) : '…'}</span>
          <span className="finder-level"><i style={{ width: `${Math.min(100, live.level * 900)}%` }} /></span>
          <span className={`finder-heard ${live.heard}`}>
            {live.heard === 'playing' ? '🎸 Hearing playing'
              : live.heard === 'talking' ? '🗣 Talking: left out'
                : live.heard === 'singing' ? (singing && mode === 'notes' ? '🎤 Singing: writing it down' : mode === 'chords' ? '🎤 Singing: listening for the chords under it' : '🎤 Singing: left out')
                  : live.level < 0.004 ? 'Too quiet: turn the music up or move the phone closer' : 'Listening…'}
          </span>
          {mode === 'notes' && live.ignored > 0 && <span className="small muted">{live.ignored} sound{live.ignored === 1 ? '' : 's'} left out (talking, singing or not a picked note)</span>}
        </div>
      )}
      {mode === 'chords' && shown.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>{shown.length} chord change{shown.length === 1 ? '' : 's'}</b>
            {key && <span className="small">Key: <b>{key.label}</b> (a guess)</span>}
          </div>
          <div className="finder-chords">
            {shown.map((s, i) => (
              <label key={i} className="finder-chip" title={`At ${fmt(s.t)}, ${s.dur.toFixed(1)} s`}>
                <span className="small muted">{fmt(s.t)}</span>
                <select className="select sm" value={`${s.root}:${s.q}`} onChange={e => rename(i, e.target.value)} aria-label={`Chord at ${fmt(s.t)}`}>
                  {[{ root: s.root, q: s.q }, ...s.alts].map(a => <option key={`${a.root}:${a.q}`} value={`${a.root}:${a.q}`}>{chordName(a, flats)}</option>)}
                  <option value="x">remove</option>
                </select>
              </label>
            ))}
          </div>
          <p className="small muted" style={{ margin: 0 }}>Wrong chord? Pick another from its list (the next best guesses). The loop that repeats most goes to Jam.</p>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn primary" disabled={!key} onClick={useInJam}>Use in Jam</button>
            <button className="btn" onClick={openChords}>Open as a chord sheet</button>
            <button className="btn ghost" onClick={clear}>Clear</button>
          </div>
        </div>
      )}
      {mode === 'notes' && notes.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <b>{notes.length} note{notes.length === 1 ? '' : 's'}</b>
          <p className="small finder-notes" style={{ margin: 0 }}>{notes.slice(-40).map(n => noteName(n.midi)).join(' ')}</p>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn primary" onClick={openNotes}>Open as a tab</button>
            <button className="btn ghost" onClick={clear}>Clear</button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>A rough guess: the notes are right only when one instrument was playing, and the frets are where they're easiest, not always where the player put them. Rhythm is rounded to eighth notes at {bpm} BPM.</p>
        </div>
      )}
    </div>
  )
}

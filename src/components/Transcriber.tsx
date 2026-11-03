// Jam → Find chords → "Notes from a recording": record yourself (or the phone speaker playing a solo lesson) or pick
// an audio file, and Basic Pitch writes down every note; then it's a tab, single notes or with the chords.
import { useEffect, useRef, useState } from 'react'
import { Ico } from './Icon'
import { useInstrument } from '../instrument'
import { InputRecorder } from '../audio/looper'
import { audio } from '../audio/engine'
import { quietForMic } from '../audio/tapFeel'
import { guessTempo, notesToTab, transcribe, type HeardNote } from '../audio/transcribe'
import type { SongDoc } from '../tabs/library'
import { Preview } from './ProgressionTabs'
import { Chips } from './Controls'

const MAX = 90

export function Transcriber({ onOpen, youtube }: { onOpen: (d: SongDoc) => void; youtube?: string }) {
  const inst = useInstrument()
  const rec = useRef<InputRecorder | null>(null)
  const t0 = useRef(0)
  const [state, setState] = useState<'idle' | 'rec' | 'work'>('idle')
  const [secs, setSecs] = useState(0)
  const [pct, setPct] = useState(0)
  const [msg, setMsg] = useState('')
  const [heard, setHeard] = useState<HeardNote[] | null>(null)
  const [bpm, setBpm] = useState(90)
  const [chords, setChords] = useState(false)
  const [name, setName] = useState('')
  useEffect(() => () => { rec.current?.stop(); if (t0.current) quietForMic(false) }, [])
  useEffect(() => {
    if (state !== 'rec') return
    const id = setInterval(() => { const s = audio().currentTime - t0.current; setSecs(s); if (s >= MAX) void stop() }, 200)
    return () => clearInterval(id)
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (x: Float32Array, sr: number, label: string) => {
    setState('work'); setPct(0); setMsg('Writing down the notes… (the first time takes a moment to load)')
    try {
      const notes = await transcribe(x, sr, p => setPct(p))
      if (!notes.length) { setMsg("I didn't hear any clear notes. Play a little louder, closer to the phone, one instrument at a time."); setState('idle'); return }
      setHeard(notes)
      setBpm(guessTempo(notes) ?? 90)
      setName(label)
      setMsg('')
    } catch (e) { setMsg(`Couldn't write the notes down: ${e instanceof Error ? e.message : 'unknown error'}`) }
    setState('idle')
  }
  const start = async () => {
    setMsg(''); setHeard(null)
    try {
      rec.current = new InputRecorder()
      await rec.current.start()
      quietForMic(true)
      t0.current = audio().currentTime
      setSecs(0)
      setState('rec')
    } catch { setMsg('Recording needs the microphone: allow it for KGuitar and try again.') }
  }
  const stop = async () => {
    if (!rec.current || !t0.current) return
    const from = t0.current
    t0.current = 0
    quietForMic(false)
    const ctx = audio()
    const x = await rec.current.capture(from, ctx.currentTime - from)
    rec.current.stop(); rec.current = null
    await run(x, ctx.sampleRate, 'What I played')
  }
  const file = async (f: File | undefined) => {
    if (!f) return
    setMsg(''); setHeard(null)
    try {
      const buf = await audio().decodeAudioData(await f.arrayBuffer())
      const n = Math.min(buf.length, buf.sampleRate * 180)
      const mono = new Float32Array(n)
      for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / buf.numberOfChannels }
      await run(mono, buf.sampleRate, f.name.replace(/\.[^.]+$/, ''))
    } catch { setMsg("Couldn't open that file: try an MP3, M4A, WAV or a phone video.") }
  }
  const song = heard ? notesToTab(heard, bpm, inst.midis, `${name || 'Notes I heard'}`, chords) : null
  const doc: SongDoc | null = song ? { id: `found:tx:${Date.now().toString(36)}`, title: song.title, source: 'text', inst: inst.id, song, ...(youtube ? { youtube } : {}), updated: Date.now() } : null
  return (
    <div className="stack transcriber" style={{ gap: 8 }} data-testid="transcriber">
      <p className="small muted" style={{ margin: 0 }}>The accurate way to get notes: record yourself playing (or a solo guitar lesson on the speaker), or pick an audio or video file. A note detector made for this (Basic Pitch, by Spotify) writes down every note, even chords, right here on the phone. Works best with one instrument; a full band mix is still a rough guess.</p>
      <div className="row" style={{ gap: 8 }}>
        <button className={`btn${state === 'rec' ? ' on' : ' primary'}`} disabled={state === 'work'} onClick={() => void (state === 'rec' ? stop() : start())} data-testid="tx-rec">
          {state === 'rec' ? <><Ico n="stop" fill /> Stop ({Math.round(secs)} s)</> : <><Ico n="record" fill /> Record</>}
        </button>
        <label className={`btn${state !== 'idle' ? ' disabled' : ''}`}><Ico n="file" /> Audio or video file<input type="file" accept="audio/*,video/*" hidden disabled={state !== 'idle'} onChange={e => { void file(e.target.files?.[0]); e.target.value = '' }} data-testid="tx-file" /></label>
      </div>
      {state === 'work' && <div className="tx-progress" role="progressbar" aria-valuenow={Math.round(pct * 100)}><i style={{ width: `${Math.round(pct * 100)}%` }} /></div>}
      {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
      {heard && (
        <>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="small"><b>{heard.length}</b> notes heard</span>
            <Chips label="Write" items={[{ id: 'single', label: 'Single notes' }, { id: 'chords', label: 'With chords' }]} value={chords ? 'chords' : 'single'} onChange={v => setChords(v === 'chords')} />
            <label className="row" style={{ gap: 4 }}><span className="small">Tempo</span>
              <input className="input" style={{ width: 64, flex: 'none' }} inputMode="numeric" value={bpm} onChange={e => { const v = Number(e.target.value); if (v >= 30) setBpm(Math.min(260, v)) }} aria-label="Tempo in BPM" />
            </label>
          </div>
          {doc && <><button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => onOpen(doc)} data-testid="tx-open">Open as a tab</button><Preview doc={doc} minor={false} /></>}
          <p className="small muted" style={{ margin: 0 }}>The tempo is a guess from the notes: fix it if the rhythm looks wrong. Frets are where the notes are easiest; move them if the player used another spot.</p>
        </>
      )}
    </div>
  )
}

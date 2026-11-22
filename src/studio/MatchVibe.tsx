// Match a song's vibe (beat maker): play a bit of a song from YouTube (or pick a file), KGuitar listens and makes a NEW beat
// with that feel: tempo, straight or swung, where the kick / snare / hi-hat sit, the key and the chord loop. Then:
//   How close?  loose (leans on the nearest known groove) ↔ close (as heard)      Reroll  a new take with the same feel
//   Use its chords  keys + bass on the song's chord loop                          Put my beat back  undo the whole thing
// The reading is in vibe.ts; the YouTube sound comes through the same recorder as Get a sound (scan/grab).
import { useEffect, useRef, useState } from 'react'
import { usePersist } from '../components/Controls'
import { ChordList } from '../components/ChordName'
import { Ico } from '../components/Icon'
import { YouTubePlayer } from '../components/YouTubePlayer'
import { addCardInstance, publishFloat, setFloatResting, shownCards } from '../float/bus'
import { pocketEngine } from '../float/PocketBandCard'
import { useInstrument } from '../instrument'
import { openLicksInKey } from '../nav'
import { startGrab, type GrabSession } from '../scan/grab'
import { SHARPS, keyPrefersFlats } from '../theory/notes'
import { scaleInfo } from '../theory/scales'
import type { Beat } from './beat'
import { decodeFile } from './GetSound'
import { describeVibe, readVibe, vibeBeat, type Vibe } from './vibe'

type SetBeat = (next: Beat | ((b: Beat) => Beat), remember?: boolean) => void
const LISTEN_SECS = 40

/** Mono at about 22 kHz (plenty for drums and chords, and half the work). */
function prepare(chans: Float32Array[], sr: number): { x: Float32Array; sr: number } {
  const n = chans[0].length
  const mono = new Float32Array(n)
  for (const c of chans) for (let i = 0; i < n; i++) mono[i] += c[i] / chans.length
  // skip a quiet start, keep up to 60 s
  let a = 0
  const peak = mono.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
  while (a < n && Math.abs(mono[a]) < peak * 0.05) a++
  const cut = mono.subarray(a, Math.min(n, a + sr * 60))
  if (sr < 40000) return { x: cut, sr }
  const out = new Float32Array(Math.floor(cut.length / 2))
  for (let i = 0; i < out.length; i++) out[i] = 0.25 * (cut[2 * i - 1] ?? cut[2 * i]) + 0.5 * cut[2 * i] + 0.25 * cut[2 * i + 1]
  return { x: out, sr: sr / 2 }
}

export function MatchVibe({
  beat, setBeat, playing, play, stop, onDone, onLeave,
}: {
  beat: Beat; setBeat: SetBeat; playing: boolean; play: () => void; stop: () => void
  onDone?: () => void; onLeave?: () => void
}) {
  const inst = useInstrument()
  const [vibe, setVibe] = usePersist<Vibe | null>('studioVibe', null)
  const [vibeName, setVibeName] = usePersist('studioVibeName', '')
  const [close, setClose] = usePersist('studioVibeClose', 0.75)
  const [chords, setChords] = usePersist('studioVibeChords', true)
  const [seed, setSeed] = useState(1)
  const [link, setLink] = usePersist<string | undefined>('studioVibeLink', undefined)
  const [from, setFrom] = useState<'youtube' | 'file'>('youtube')
  const [listen, setListen] = useState(!vibe)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [recSecs, setRecSecs] = useState<number | null>(null)
  const grab = useRef<GrabSession | null>(null)
  const before = useRef<Beat | null>(null)
  const applied = useRef(false)
  useEffect(() => () => { void grab.current?.stop().catch(() => {}) }, [])
  useEffect(() => {
    if (recSecs === null) return
    const id = setInterval(() => setRecSecs(s => (s === null ? s : s + 1)), 1000)
    return () => clearInterval(id)
  }, [recSecs === null]) // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (v: Vibe, o: { close: number; seed: number; chords: boolean }, name = vibeName) => {
    if (!before.current) before.current = beat
    // the first change goes on the undo list; slider moves and rerolls after it replace it
    setBeat(prev => ({ ...vibeBeat(v, o), name: name ? `Vibe: ${name}`.slice(0, 40) : 'Song vibe', pads: prev.pads, voiceVol: prev.voiceVol }), !applied.current)
    applied.current = true
  }
  const heard = async (chans: Float32Array[], sr: number, name: string) => {
    setBusy(true); setMsg('Listening to the groove…')
    await new Promise(r => setTimeout(r, 30))
    try {
      const { x, sr: r } = prepare(chans, sr)
      if (x.length < r * 6) throw new Error('That was too short: play at least 10 seconds of the main groove.')
      const v = readVibe(x, r)
      if (!v) throw new Error("No steady beat was heard. Try a part of the song where the drums are playing (not the intro).")
      setVibe(v); setVibeName(name); setListen(false); setMsg('')
      apply(v, { close, seed, chords }, name)
    } catch (e) { setMsg(e instanceof Error ? e.message : 'It could not be read.') }
    setBusy(false)
  }
  const startRec = async () => {
    setMsg('')
    try {
      grab.current = await startGrab({ fps: 0.5, seconds: LISTEN_SECS })
      grab.current.onStopped(() => void stopRec())
      setRecSecs(0)
    } catch (e) { setMsg(e instanceof Error ? e.message : "Listening didn't start.") }
  }
  const stopRec = async () => {
    const g = grab.current
    grab.current = null
    setRecSecs(null)
    if (!g) return
    try {
      const got = await g.stop()
      if (!got.sound || got.sound.x.length < got.sound.sr * 3) throw new Error('Nothing was heard. Play the video while KGuitar listens (on a computer, share this tab with "Share tab audio").')
      await heard([got.sound.x], got.sound.sr, 'YouTube song')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'It stopped.') }
  }
  const pickFile = async (f: File | undefined) => {
    if (!f) return
    setBusy(true); setMsg('Reading the file…')
    try { const c = await decodeFile(f); await heard(c.chans, c.sr, f.name.replace(/\.[^.]+$/, '')) } catch (e) { setMsg(e instanceof Error ? e.message : 'It could not be read.'); setBusy(false) }
  }
  const change = (o: Partial<{ close: number; seed: number; chords: boolean }>) => {
    const n = { close, seed, chords, ...o }
    if (o.close !== undefined) setClose(o.close)
    if (o.seed !== undefined) setSeed(o.seed)
    if (o.chords !== undefined) setChords(o.chords)
    if (vibe) apply(vibe, n)
  }
  const putBack = () => { if (before.current) { setBeat(before.current, true); before.current = null; applied.current = false; setMsg('Your beat is back.') } }

  /** Push the detected key, chords, and tempo into Pocket Band & the floating context. */
  const syncVibeToFloat = (v: Vibe) => {
    const root = v.key?.root ?? beat.key ?? 'A'
    const minor = v.key ? v.key.minor : beat.minor
    const chordNames = v.chords.length ? v.chords.map(c => c.name) : [root + (minor ? 'm' : '')]
    pocketEngine.set({
      bpm: v.bpm,
      root,
      quality: minor ? 'min' : 'maj',
      mode: v.chords.length > 1 ? 'prog' : 'drone',
      chords: chordNames,
      drumSource: 'beatmaker',
      grooveId: v.nearest,
    })
    setFloatResting('studio', false)
    publishFloat('studio', {
      title: vibeName || 'Song vibe',
      keyName: `${root} ${minor ? 'minor' : 'major'}`,
      keyPcs: scaleInfo(root, minor ? 'minor' : 'major').pcs,
      chordNow: chordNames[0],
      chordNext: chordNames[1] ?? chordNames[0],
      bpm: v.bpm,
      tuning: inst.midis,
      flats: keyPrefersFlats(root, minor),
    })
  }
  const openFloatJam = (mode: 'fretboard' | 'band') => {
    if (!vibe) return
    syncVibeToFloat(vibe)
    try { localStorage.setItem('kg:floatNeck5Layer', '1') } catch { /* private */ }
    const openNow = shownCards('studio')
    if (!openNow.includes('neck')) addCardInstance('studio', 'neck')
    if (mode === 'fretboard' && !openNow.includes('licks')) addCardInstance('studio', 'licks')
    if (mode === 'band' && !openNow.includes('band')) addCardInstance('studio', 'band')
    setMsg(mode === 'band' ? 'Loaded into Pocket Band & 5-Layer Fretboard!' : '5-Layer Fretboard & Licks locked to this song’s vibe!')
    onDone?.()
  }
  const sendToJam = () => {
    if (!vibe) return
    if (playing) stop()
    const root = vibe.key?.root ?? beat.key ?? 'A'
    const minor = vibe.key ? vibe.key.minor : beat.minor
    onLeave?.()
    onDone?.()
    window.dispatchEvent(new CustomEvent('kg-jam-vibe', {
      detail: {
        root,
        minor,
        bpm: vibe.bpm,
        chords: vibe.chords.map(c => ({ root: SHARPS[c.root] ?? 'C', q: c.q })),
      },
    }))
  }
  const openProLicks = () => {
    if (!vibe) return
    const root = vibe.key?.root ?? beat.key ?? 'A'
    const minor = vibe.key ? vibe.key.minor : beat.minor
    if (playing) stop()
    onLeave?.()
    onDone?.()
    openLicksInKey(root, minor)
  }

  return (
    <div className="stack vibe" style={{ gap: 10 }} data-testid="vibe">
      {listen ? (
        <>
          <p className="small muted" style={{ margin: 0 }}>Play 20–40 seconds of a song's main groove. KGuitar works out its feel and makes a new beat like it, not a copy.</p>
          <div className="seg" role="group" aria-label="Where the song comes from">
            <button aria-pressed={from === 'youtube'} onClick={() => setFrom('youtube')}><Ico n="film" /> YouTube</button>
            <button aria-pressed={from === 'file'} onClick={() => setFrom('file')} data-testid="vibe-from-file"><Ico n="upload" /> A file</button>
          </div>
          {from === 'youtube' ? (
            <div className="stack" style={{ gap: 8 }}>
              <YouTubePlayer url={link} onUrl={setLink} note="Paste a link, find the part where the drums play, then tap Listen and let it play." />
              {link && (
                <button className={`btn big${recSecs !== null ? ' on' : ' primary'}`} onClick={() => void (recSecs !== null ? stopRec() : startRec())} disabled={busy} data-testid="vibe-listen">
                  {recSecs !== null ? <><Ico n="stop" fill /> Done ({recSecs} s{recSecs < 10 ? ', keep going' : ''})</> : <><Ico n="mic" /> Listen</>}
                </button>
              )}
              <p className="small muted" style={{ margin: 0 }}>Android asks to allow recording the screen: only the sound is used, up to {LISTEN_SECS} seconds, and it isn't kept.</p>
            </div>
          ) : (
            <label className="btn" style={{ alignSelf: 'flex-start' }}>
              <Ico n="upload" /> Pick a song file (audio or video)
              <input type="file" accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.mp4,.webm,.mov" hidden onChange={e => void pickFile(e.target.files?.[0])} data-testid="vibe-file" />
            </label>
          )}
          {vibe && <button className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setListen(false)}>Back to the last song</button>}
        </>
      ) : vibe && (
        <>
          <div className="vibe-card" data-testid="vibe-card">
            <b>{vibeName || 'The song'}</b>
            <span data-testid="vibe-desc">{describeVibe(vibe)}</span>
            {vibe.key && <span className="small">Key: {vibe.key.root} {vibe.key.minor ? 'minor' : 'major'}{vibe.chords.length ? <> · Chords: <ChordList names={vibe.chords.map(c => c.name)} sep="  " /></> : null}</span>}
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className={`btn primary${playing ? ' on' : ''}`} onClick={() => (playing ? stop() : play())} data-testid="vibe-play">{playing ? <><Ico n="stop" fill /> Stop</> : <><Ico n="play" fill /> Hear the new beat</>}</button>
            <button className="btn" onClick={() => change({ seed: seed + 1 })} data-testid="vibe-reroll"><Ico n="shuffle" /> Reroll</button>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }} data-testid="vibe-jam-actions">
            <button className="btn sm" onClick={() => openFloatJam('fretboard')} data-testid="vibe-jam-float"><Ico n="layers" /> Fretboard &amp; Licks</button>
            <button className="btn sm" onClick={() => openFloatJam('band')} data-testid="vibe-to-band"><Ico n="disc" /> Pocket Band</button>
            <button className="btn sm" onClick={sendToJam} data-testid="vibe-to-jam"><Ico n="drum" /> Send to Jam</button>
            {vibe.key && <button className="btn sm ghost" onClick={openProLicks} data-testid="vibe-licks"><Ico n="sparkles" /> Pro Licks in {vibe.key.root}{vibe.key.minor ? 'm' : ''}</button>}
          </div>
          <label className="field vibe-close"><span>How close? <span className="muted small">{close < 0.35 ? 'loose: borrows from a known groove' : close > 0.8 ? 'close: as heard' : 'in between'}</span></span>
            <span className="row" style={{ gap: 6, alignItems: 'center' }}>
              <span className="small muted">Loose</span>
              <input type="range" min={0} max={1} step={0.05} value={close} onChange={e => change({ close: Number(e.target.value) })} aria-label="How close to the song" data-testid="vibe-close" style={{ flex: 1 }} />
              <span className="small muted">Close</span>
            </span>
          </label>
          <label className="row small" style={{ gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={chords} onChange={e => change({ chords: e.target.checked })} disabled={!vibe.chords.length} data-testid="vibe-chords" />
            Use its chords (keys and bass on {vibe.chords.length ? vibe.chords.map(c => c.name).join(' ') : 'no chords heard'})
          </label>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {before.current && <button className="btn sm" onClick={putBack} data-testid="vibe-back">Put my beat back</button>}
            <button className="btn sm ghost" onClick={() => { setListen(true); setMsg('') }} data-testid="vibe-again"><Ico n="mic" /> Another song</button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>It's in the beat maker now: change anything. The drum kit follows the style it sounds closest to; switch it under More settings.</p>
        </>
      )}
      {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
    </div>
  )
}

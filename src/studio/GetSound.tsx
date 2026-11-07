// Get a sound: sample anything onto Your pads, the way producers drop a film line or a record into a beat.
//   from a file      any audio or video file (mp3, wav, m4a, ogg, flac, mp4, webm, mov…): its soundtrack is read
//   from YouTube     the video plays in KGuitar's own player and KGuitar records what it plays (the sound inside the
//                    phone, with Android's permission; on a computer, the shared tab's sound). The YouTube app itself
//                    doesn't let other apps record it, so it has to play here.
// Then the clip editor: zoom into the wave, drag the two handles round the bit you want, hear it, take the voice out or
// keep only the voice (voice isolation, a one-time model download), and put it on the next free pad or chop it across pads.
import { useEffect, useMemo, useRef, useState } from 'react'
import { audio } from '../audio/engine'
import { useBack } from '../back'
import { Ico } from '../components/Icon'
import { YouTubePlayer } from '../components/YouTubePlayer'
import { startGrab, type GrabSession } from '../scan/grab'
import { downloadModels, haveModel, MODELS } from '../ml/models'
import { newId, type Beat } from './beat'
import { USER_PADS, detectRoot, padName, sliceAtOnsets, trimSilence } from './pads'
import { saveSample } from './padSamples'

const MAX_FILE_MB = 400
const MAX_PAD_SECS = 30
interface Clip { chans: Float32Array[]; sr: number; name: string }
type Part = 'all' | 'voice' | 'rest' | 'drums' | 'bass' | 'other'
const PARTS: { id: Part; label: string; hint: string }[] = [
  { id: 'all', label: 'Whole sound', hint: 'Everything in the clip.' },
  { id: 'voice', label: 'Voice only', hint: 'Just the voice (singing or talking).' },
  { id: 'rest', label: 'Without the voice', hint: 'Everything but the voice.' },
  { id: 'drums', label: 'Drums', hint: 'Just the drums and percussion.' },
  { id: 'bass', label: 'Bass', hint: 'Just the bass.' },
  { id: 'other', label: 'Instruments', hint: 'Guitars, keys and everything else that isn\'t voice, drums or bass.' },
]

/** Read a file's sound (a video's soundtrack too), all channels. */
export async function decodeFile(f: File): Promise<Clip> {
  if (f.size > MAX_FILE_MB * 1e6) throw new Error(`That file is ${Math.round(f.size / 1e6)} MB. Files up to ${MAX_FILE_MB} MB work: trim a long video first.`)
  const ctx = audio()
  let buf: AudioBuffer
  try { buf = await ctx.decodeAudioData(await f.arrayBuffer()) } catch { throw new Error("This file's sound couldn't be read. mp3, wav, m4a, ogg, flac, mp4 and webm work.") }
  const chans = Array.from({ length: Math.min(2, buf.numberOfChannels) }, (_, c) => buf.getChannelData(c).slice())
  return { chans, sr: buf.sampleRate, name: f.name.replace(/\.[a-z0-9]+$/i, '') }
}

/** Mono, for a pad. */
const mono = (chans: Float32Array[]) => { if (chans.length === 1) return chans[0]; const o = new Float32Array(chans[0].length); for (let i = 0; i < o.length; i++) o[i] = (chans[0][i] + chans[1][i]) / 2; return o }

export function GetSound({ beat, setBeat, onClose, onDone }: { beat: Beat; setBeat: (f: (b: Beat) => Beat, remember?: boolean) => void; onClose: () => void; onDone: (msg: string) => void }) {
  useBack(true, onClose)
  const [from, setFrom] = useState<'file' | 'youtube' | null>(null)
  const [clip, setClip] = useState<Clip | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  // YouTube
  const [link, setLink] = useState<string | undefined>(undefined)
  const grab = useRef<GrabSession | null>(null)
  const [recSecs, setRecSecs] = useState<number | null>(null)
  useEffect(() => () => { void grab.current?.stop().catch(() => {}) }, [])
  useEffect(() => {
    if (recSecs === null) return
    const id = setInterval(() => setRecSecs(s => (s === null ? s : s + 1)), 1000)
    return () => clearInterval(id)
  }, [recSecs === null]) // eslint-disable-line react-hooks/exhaustive-deps

  const pickFile = async (f: File | undefined) => {
    if (!f) return
    setBusy(true); setMsg('Reading the sound…')
    try { setClip(await decodeFile(f)); setMsg('') } catch (e) { setMsg(e instanceof Error ? e.message : 'It could not be read.') }
    setBusy(false)
  }
  const startRec = async () => {
    setMsg('')
    try {
      grab.current = await startGrab({ fps: 0.5, seconds: 75 })
      grab.current.onStopped(() => void stopRec())
      setRecSecs(0)
    } catch (e) { setMsg(e instanceof Error ? e.message : "Recording didn't start.") }
  }
  const stopRec = async () => {
    const g = grab.current
    grab.current = null
    setRecSecs(null)
    if (!g) return
    setBusy(true); setMsg('Getting the sound…')
    try {
      const got = await g.stop()
      if (!got.sound || got.sound.x.length < got.sound.sr * 0.3) throw new Error("Nothing was heard. Play the video while recording (and on a computer, share this tab with \"Share tab audio\").")
      setClip({ chans: [got.sound.x], sr: got.sound.sr, name: 'From YouTube' })
      setMsg('')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'It stopped.') }
    setBusy(false)
  }
  const canGrab = typeof navigator !== 'undefined'

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet get-sound" role="dialog" aria-modal="true" aria-label="Get a sound" onClick={e => e.stopPropagation()} data-testid="get-sound">
        <div className="sheet-head"><h2>Get a sound</h2><button className="btn sm" onClick={onClose}>Close</button></div>
        {!clip && (
          <>
            <p className="small muted" style={{ margin: 0 }}>Sample a line from a film, a drum break, a chord, anything: pick it out, then play it on Your pads.</p>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <label className={`btn${from === 'file' ? ' on' : ''}`} data-testid="gs-file-btn">
                <Ico n="upload" /> From a file (audio or video)
                <input type="file" accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.flac,.mp4,.webm,.mov,.mkv" hidden onChange={e => { setFrom('file'); void pickFile(e.target.files?.[0]) }} data-testid="gs-file" />
              </label>
              <button className={`btn${from === 'youtube' ? ' on' : ''}`} onClick={() => setFrom('youtube')} data-testid="gs-yt-btn"><Ico n="film" /> From a YouTube video</button>
            </div>
            {from === 'youtube' && canGrab && (
              <div className="stack" style={{ gap: 8 }}>
                <YouTubePlayer url={link} onUrl={setLink} note="Find the part you want, then tap Record and play it. KGuitar records only the sound." />
                {link && (
                  <button className={`btn big${recSecs !== null ? ' on' : ' primary'}`} onClick={() => void (recSecs !== null ? stopRec() : startRec())} disabled={busy} data-testid="gs-rec">
                    {recSecs !== null ? <><Ico n="stop" fill /> Stop ({recSecs} s)</> : <><Ico n="record" fill className="rec-dot" /> Record what plays</>}
                  </button>
                )}
                <p className="small muted" style={{ margin: 0 }}>Android asks to allow recording the screen: only the sound is kept, up to 75 seconds.</p>
              </div>
            )}
          </>
        )}
        {msg && <p className="small" role="status" style={{ margin: 0 }}>{msg}</p>}
        {clip && <ClipEditor clip={clip} beat={beat} setBeat={setBeat} onAgain={() => { setClip(null); setFrom(null) }} onDone={onDone} />}
      </div>
    </div>
  )
}

function ClipEditor({ clip, beat, setBeat, onAgain, onDone }: { clip: Clip; beat: Beat; setBeat: (f: (b: Beat) => Beat, remember?: boolean) => void; onAgain: () => void; onDone: (msg: string) => void }) {
  const dur = clip.chans[0].length / clip.sr
  const [sel, setSel] = useState<[number, number]>(() => [0, Math.min(dur, 4)])
  const [view, setView] = useState<[number, number]>(() => [0, Math.min(dur, 20)])
  const [part, setPart] = useState<Part>('all')
  const [iso, setIso] = useState<{ key: string; parts: Record<Exclude<Part, 'all'>, Float32Array[]>; sr: number } | null>(null)
  const [isoState, setIsoState] = useState<{ pct: number; note: string } | null>(null)
  const [needModel, setNeedModel] = useState<boolean | null>(null)
  const [dl, setDl] = useState<number | null>(null)
  const [name, setName] = useState(clip.name.slice(0, 14))
  const [note, setNote] = useState('')
  const playing = useRef<AudioBufferSourceNode | null>(null)
  const ctl = useRef<AbortController | null>(null)
  useEffect(() => () => { playing.current?.stop(); ctl.current?.abort() }, [])
  useEffect(() => { void haveModel('voice').then(h => setNeedModel(!h)).catch(() => setNeedModel(true)) }, [])

  // the selection as sound, in the chosen part (whole / voice / everything but the voice)
  const selKey = `${sel[0].toFixed(3)}-${sel[1].toFixed(3)}`
  const isoFits = iso && iso.key === selKey
  const piece = (): { chans: Float32Array[]; sr: number } => {
    if (part !== 'all' && isoFits) return { chans: iso.parts[part], sr: iso.sr }
    const a = Math.floor(sel[0] * clip.sr), b = Math.ceil(sel[1] * clip.sr)
    return { chans: clip.chans.map(c => c.slice(a, b)), sr: clip.sr }
  }
  const hear = () => {
    playing.current?.stop()
    const p = piece()
    const ctx = audio(); void ctx.resume()
    const buf = ctx.createBuffer(p.chans.length, p.chans[0].length, p.sr)
    p.chans.forEach((c, i) => buf.getChannelData(i).set(c))
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination); src.start()
    playing.current = src
  }
  const runIso = async (want: Part) => {
    setPart(want)
    if (want === 'all' || isoFits) return
    if (sel[1] - sel[0] > 60) { setNote('Pick 60 seconds or less to separate it.'); setPart('all'); return }
    ctl.current?.abort()
    const c = (ctl.current = new AbortController())
    setIsoState({ pct: 0, note: 'Starting…' })
    try {
      const { isolate } = await import('../ml/voice')
      const a = Math.floor(sel[0] * clip.sr), b = Math.ceil(sel[1] * clip.sr)
      const r = await isolate(clip.chans.map(ch => ch.slice(a, b)), clip.sr, { signal: c.signal, onProgress: (pct, n) => setIsoState({ pct, note: n }) })
      setIso({ key: selKey, sr: r.sr, parts: { voice: r.voice, rest: r.rest, drums: r.stems.drums, bass: r.stems.bass, other: r.stems.other } })
      setIsoState(null)
      setNote(`Separated in ${Math.round(r.secs)} s on ${r.where === 'phone' ? 'the phone' : r.where === 'webgpu' ? 'the graphics chip' : 'this computer'}.`)
    } catch (e) {
      setIsoState(null); setPart('all')
      setNote(e instanceof Error ? (/Cancelled/.test(e.message) ? 'Stopped.' : `The voice model stopped: ${e.message}`) : 'It stopped.')
    }
  }
  const getModel = async () => {
    setDl(0)
    try { await downloadModels(['voice'], p => setDl(p)); setDl(null); setNeedModel(false) } catch (e) { setDl(null); setNote(e instanceof Error ? e.message : 'The download stopped.') }
  }
  const tighten = () => {
    const a = Math.floor(sel[0] * clip.sr), b = Math.ceil(sel[1] * clip.sr)
    const t = trimSilence(mono(clip.chans.map(c => c.subarray(a, b))), clip.sr)
    if (t.end - t.start > 0.02) setSel([sel[0] + t.start, sel[0] + t.end])
  }
  const freePads = () => USER_PADS.filter(p => !beat.pads?.[p])
  const putOnPad = async () => {
    const p = piece()
    const data = mono(p.chans)
    if (data.length / p.sr > MAX_PAD_SECS) { setNote(`A pad holds up to ${MAX_PAD_SECS} s: make the selection shorter.`); return }
    const free = freePads()[0] ?? USER_PADS[USER_PADS.length - 1]
    const id = newId()
    await saveSample(id, data, p.sr)
    const label = name.trim() || 'Sample'
    setBeat(b => ({ ...b, pads: { ...b.pads, [free]: { src: 'rec', sample: id, start: 0, end: data.length / p.sr, root: detectRoot(data, p.sr) ?? undefined, name: label, mode: 'oneshot' } } }), true)
    onDone(`"${label}" is on pad ${padName(free)} of Your pads. Tap it to play; open it to turn the pitch dial.`)
  }
  const chop = async () => {
    const p = piece()
    const data = mono(p.chans)
    const free = freePads()
    const slots = free.length ? free : USER_PADS
    const slices = sliceAtOnsets(data, p.sr, Math.min(16, slots.length), 0.12)
    if (slices.length < 2) { setNote('No clear hits or words to cut at: put it on one pad instead.'); return }
    const id = newId()
    await saveSample(id, data, p.sr)
    const label = name.trim() || 'Chop'
    const defs = slices.map((s, i) => [slots[i], { src: 'rec' as const, sample: id, start: s.start, end: s.end, root: detectRoot(data.subarray(Math.round(s.start * p.sr), Math.round(s.end * p.sr)), p.sr) ?? undefined, name: `${label.slice(0, 11)} ${i + 1}`, choke: 1 }] as const)
    setBeat(b => ({ ...b, pads: { ...b.pads, ...Object.fromEntries(defs) } }), true)
    onDone(`${slices.length} pieces are on Your pads (pads ${padName(slots[0])}–${padName(slots[slices.length - 1])}).`)
  }

  return (
    <div className="stack" style={{ gap: 10 }} data-testid="clip-editor">
      <p className="small muted" style={{ margin: 0 }}>Drag the two handles round the bit you want (drag the wave to move along, ± to zoom). {dur.toFixed(1)} s in all.</p>
      <ClipWave clip={clip} sel={sel} setSel={setSel} view={view} setView={setView} />
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn sm primary" onClick={hear} data-testid="gs-hear"><Ico n="play" fill /> Hear it</button>
        <button className="btn sm" onClick={() => { const pad = (sel[1] - sel[0]) * 0.15; setView([Math.max(0, sel[0] - pad), Math.min(dur, sel[1] + pad)]) }}>Zoom to it</button>
        <button className="btn sm ghost" onClick={() => setView([0, dur])}>Whole clip</button>
        <button className="btn sm ghost" onClick={tighten} title="Cut the quiet off both ends">Trim the quiet</button>
        <span className="small tabular muted">{sel[0].toFixed(2)}–{sel[1].toFixed(2)} s ({(sel[1] - sel[0]).toFixed(2)} s)</span>
      </div>
      <div className="stack" style={{ gap: 6 }}>
        <span className="seg gs-parts" role="group" aria-label="Which part of the sound" data-testid="gs-part">
          {PARTS.map(p => <button key={p.id} aria-pressed={part === p.id} title={p.hint} disabled={p.id !== 'all' && (!!needModel || !!isoState)} onClick={() => void runIso(p.id)}>{p.label}</button>)}
        </span>
        {needModel && (
          <div className="row small" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Taking the voice, drums, bass or instruments out on their own needs a one-time download of the separation model ({Math.round(MODELS.voice.files.reduce((t, f) => t + f.bytes, 0) / 1e6)} MB). It stays on this device.</span>
            {dl === null ? <button className="btn sm" onClick={() => void getModel()} data-testid="gs-get-model">Download</button> : <b>{Math.round(dl * 100)}%</b>}
          </div>
        )}
        {isoState && (
          <div className="row small" style={{ gap: 8, alignItems: 'center' }} role="status">
            <progress max={1} value={isoState.pct} style={{ flex: 1 }} />
            <span>{isoState.note}</span>
            <button className="btn sm ghost" onClick={() => ctl.current?.abort()}>Stop</button>
          </div>
        )}
      </div>
      <label className="field"><span>Pad name</span><input className="input" value={name} maxLength={14} onChange={e => setName(e.target.value)} /></label>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn primary" onClick={() => void putOnPad()} disabled={!!isoState} data-testid="gs-put">Put it on a pad</button>
        <button className="btn" onClick={() => void chop()} disabled={!!isoState} data-testid="gs-chop">Chop it across pads</button>
        <button className="btn ghost" onClick={onAgain}>Another sound</button>
      </div>
      {note && <p className="small" role="status" style={{ margin: 0 }} data-testid="gs-note">{note}</p>}
    </div>
  )
}

/** The clip's wave with the selection: drag a handle to move it, drag the wave to slide along, tap to move the nearest handle. */
function ClipWave({ clip, sel, setSel, view, setView }: { clip: Clip; sel: [number, number]; setSel: (s: [number, number]) => void; view: [number, number]; setView: (v: [number, number]) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const [w, setW] = useState(600)
  const dur = clip.chans[0].length / clip.sr
  const H = 120
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(200, Math.round(el.clientWidth))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const data = useMemo(() => mono(clip.chans), [clip])
  useEffect(() => {
    const c = cv.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = w * dpr; c.height = H * dpr
    const g = c.getContext('2d')
    if (!g) return
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, w, H)
    const css = getComputedStyle(c)
    const ink = css.getPropertyValue('--ink').trim() || '#888'
    const accent = css.getPropertyValue('--accent').trim() || '#e80'
    const [v0, v1] = view
    const x0 = ((sel[0] - v0) / (v1 - v0)) * w, x1 = ((sel[1] - v0) / (v1 - v0)) * w
    g.fillStyle = accent; g.globalAlpha = 0.18; g.fillRect(x0, 0, x1 - x0, H); g.globalAlpha = 1
    let peak = 0.001
    for (let i = 0; i < data.length; i += 97) peak = Math.max(peak, Math.abs(data[i]))
    for (let px = 0; px < w; px++) {
      const a = Math.floor(((v0 + ((v1 - v0) * px) / w)) * clip.sr), b = Math.max(a + 1, Math.floor(((v0 + ((v1 - v0) * (px + 1)) / w)) * clip.sr))
      let lo = 0, hi = 0
      const step = Math.max(1, Math.floor((b - a) / 64))
      for (let i = a; i < b && i < data.length; i += step) { const v = data[i]; if (v < lo) lo = v; if (v > hi) hi = v }
      const t = v0 + ((v1 - v0) * (px + 0.5)) / w
      g.fillStyle = t >= sel[0] && t <= sel[1] ? accent : ink
      g.globalAlpha = t >= sel[0] && t <= sel[1] ? 1 : 0.55
      g.fillRect(px, H / 2 - (hi / peak) * (H / 2 - 4), 1, Math.max(1, ((hi - lo) / peak) * (H / 2 - 4)))
    }
    g.globalAlpha = 1
  }, [w, view, sel, data, clip.sr])
  const tOf = (clientX: number) => { const b = box.current!.getBoundingClientRect(); return view[0] + ((clientX - b.left) / b.width) * (view[1] - view[0]) }
  const drag = useRef<{ kind: 'a' | 'b' | 'pan'; x: number; v: [number, number]; moved: boolean } | null>(null)
  const pct = (t: number) => `${((t - view[0]) / (view[1] - view[0])) * 100}%`
  const zoom = (f: number) => {
    const c = (sel[0] + sel[1]) / 2, half = ((view[1] - view[0]) * f) / 2
    const span = Math.min(dur, Math.max(0.05, half * 2))
    let a = c - span / 2
    a = Math.max(0, Math.min(dur - span, a))
    setView([a, a + span])
  }
  return (
    <div className="clip-wave-wrap">
      <div ref={box} className="clip-wave" style={{ height: H, touchAction: 'none' }} data-testid="clip-wave"
        onPointerDown={e => {
          const t = tOf(e.clientX)
          const near = (h: number) => Math.abs(((h - t) / (view[1] - view[0])) * box.current!.clientWidth) < 22
          const kind = near(sel[0]) ? 'a' : near(sel[1]) ? 'b' : 'pan'
          drag.current = { kind, x: e.clientX, v: view, moved: false }
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
        }}
        onPointerMove={e => {
          const d = drag.current
          if (!d) return
          if (Math.abs(e.clientX - d.x) > 4) d.moved = true
          const t = Math.max(0, Math.min(dur, tOf(e.clientX)))
          if (d.kind === 'a') setSel([Math.min(t, sel[1] - 0.02), sel[1]])
          else if (d.kind === 'b') setSel([sel[0], Math.max(t, sel[0] + 0.02)])
          else if (d.moved) {
            const span = d.v[1] - d.v[0]
            let a = d.v[0] - ((e.clientX - d.x) / box.current!.clientWidth) * span
            a = Math.max(0, Math.min(dur - span, a))
            setView([a, a + span])
          }
        }}
        onPointerUp={e => {
          const d = drag.current
          drag.current = null
          if (d && d.kind === 'pan' && !d.moved) {
            // a tap: move the nearer handle there
            const t = Math.max(0, Math.min(dur, tOf(e.clientX)))
            if (Math.abs(t - sel[0]) < Math.abs(t - sel[1])) setSel([Math.min(t, sel[1] - 0.02), sel[1]])
            else setSel([sel[0], Math.max(t, sel[0] + 0.02)])
          }
        }}>
        <canvas ref={cv} style={{ width: '100%', height: H, display: 'block' }} />
        <span className="clip-handle" style={{ left: pct(sel[0]) }} aria-hidden />
        <span className="clip-handle" style={{ left: pct(sel[1]) }} aria-hidden />
      </div>
      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
        <button className="btn sm ghost" onClick={() => zoom(2)} aria-label="Zoom out">−</button>
        <button className="btn sm ghost" onClick={() => zoom(0.5)} aria-label="Zoom in">+</button>
      </div>
    </div>
  )
}

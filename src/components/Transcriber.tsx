// Jam → Riff Scanner → Listen → "Notes from a recording": record yourself (or the phone speaker playing a solo lesson) or pick
// an audio file: a quick draft at once, then the guitar-note model's exact version and the AI's chords (useSoundScan).
import { VoiceOutToggle } from '../scan/VoiceOut'
import { takePendingSound } from '../scan/pending'
import { useEffect, useRef, useState } from 'react'
import { Ico } from './Icon'
import { InputRecorder } from '../audio/looper'
import { audio } from '../audio/engine'
import { quietForMic } from '../audio/tapFeel'
import type { SongDoc } from '../tabs/library'
import { useSoundScan } from '../scan/useSoundScan'

const MAX = 90

export function Transcriber({ youtube }: { onOpen?: (d: SongDoc) => void; youtube?: string }) {
  const rec = useRef<InputRecorder | null>(null)
  const t0 = useRef(0)
  const [state, setState] = useState<'idle' | 'rec'>('idle')
  const [secs, setSecs] = useState(0)
  const [msg, setMsg] = useState('')
  const scan = useSoundScan(youtube)
  useEffect(() => () => { rec.current?.stop(); if (t0.current) quietForMic(false) }, [])
  // a sound sent here from another screen (a looper track)
  useEffect(() => { const p = takePendingSound(); if (p) void scan.run(p.x, p.sr, p.title, 'your looper track') }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (state !== 'rec') return
    const id = setInterval(() => { const s = audio().currentTime - t0.current; setSecs(s); if (s >= MAX) void stop() }, 200)
    return () => clearInterval(id)
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps
  const start = async () => {
    setMsg(''); scan.reset()
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
    setState('idle')
    const ctx = audio()
    const x = await rec.current.capture(from, ctx.currentTime - from)
    rec.current.stop(); rec.current = null
    await scan.run(x, ctx.sampleRate, 'What I played', 'what you recorded with the mic')
  }
  const file = async (f: File | undefined) => {
    if (!f) return
    setMsg(''); scan.reset()
    try {
      const buf = await audio().decodeAudioData(await f.arrayBuffer())
      const n = Math.min(buf.length, buf.sampleRate * 240)
      const mono = new Float32Array(n)
      for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / buf.numberOfChannels }
      await scan.run(mono, buf.sampleRate, f.name.replace(/\.[^.]+$/, ''), `the sound of "${f.name}"`)
    } catch { setMsg("Couldn't open that file: try an MP3, M4A, WAV or a phone video.") }
  }
  const result = scan.view({ onAgain: () => setMsg('') })
  return (
    <div className="stack transcriber" style={{ gap: 8 }} data-testid="transcriber">
      <p className="small muted" style={{ margin: 0 }}>Record yourself playing (or a solo guitar lesson on the speaker), or pick an audio or video file. A quick draft of the notes comes in seconds; then the guitar-note model makes a much more exact version, and Gemini (if you've set it up) adds the chord names and takes out talking. Works best with one instrument.</p>
      {!result && (
        <div className="row" style={{ gap: 8 }}>
          <button className={`btn${state === 'rec' ? ' on' : ' primary'}`} disabled={scan.busy} onClick={() => void (state === 'rec' ? stop() : start())} data-testid="tx-rec">
            {state === 'rec' ? <><Ico n="stop" fill /> Stop ({Math.round(secs)} s)</> : <><Ico n="record" fill /> Record</>}
          </button>
          <label className={`btn${state !== 'idle' || scan.busy ? ' disabled' : ''}`}><Ico n="file" /> Audio or video file<input type="file" accept="audio/*,video/*" hidden disabled={state !== 'idle' || scan.busy} onChange={e => { void file(e.target.files?.[0]); e.target.value = '' }} data-testid="tx-file" /></label>
        </div>
      )}
      {!result && <VoiceOutToggle />}
      {(msg || scan.msg) && <p className="small" role="status" style={{ margin: 0 }}>{msg || scan.msg}</p>}
      {result}
    </div>
  )
}

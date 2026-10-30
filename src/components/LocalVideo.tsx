// One of your own lesson videos in Play's video panel (phone app only): the same speed, A–B loop and sync-with-tab
// controls as a YouTube video, plus a mirror view, played from the phone's storage.
import { useEffect, useRef, useState } from 'react'
import type { VideoApi, VideoSync } from '../play/inTime'
import { lessonsAvailable, mediaUrl, niceName, setProgress } from '../lessons/folders'
import { SyncPanel } from './YouTubePlayer'

export const SPEEDS = [1, 0.75, 0.5, 0.25, 1.25]
const label = (r: number) => (r === 1 ? '1×' : r === 0.75 ? '¾×' : r === 0.5 ? '½×' : r === 0.25 ? '¼×' : `${r}×`)
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

interface Props {
  file: { uri: string; name: string }
  onUrl: (u: string | undefined) => void
  onApi?: (api: VideoApi | null) => void
  sync?: VideoSync
  onSync?: (s: VideoSync | undefined) => void
  tabBpm?: number
}

export function LocalVideo({ file, onUrl, onApi, sync, onSync, tabBpm = 90 }: Props) {
  const v = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [rate, setRate] = useState(1)
  const [mirror, setMirror] = useState(false)
  const [a, setA] = useState<number | null>(null)
  const [b, setB] = useState<number | null>(null)
  const [loop, setLoop] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const now = () => v.current?.currentTime ?? 0

  useEffect(() => {
    const el = v.current
    if (!el) return
    onApi?.({
      time: () => el.currentTime,
      playing: () => !el.paused && !el.ended,
      rate: () => el.playbackRate,
      play: () => { void el.play().catch(() => {}) },
      pause: () => el.pause(),
      seek: t => { el.currentTime = Math.max(0, t) },
    })
    return () => onApi?.(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.uri])

  // A–B loop
  useEffect(() => {
    if (!loop || a === null || b === null || b <= a) return
    const t = setInterval(() => {
      const el = v.current
      if (el && (el.currentTime >= b || el.currentTime < a - 1)) el.currentTime = a
    }, 150)
    return () => clearInterval(t)
  }, [loop, a, b])

  // remember where you got to
  useEffect(() => {
    const t = setInterval(() => { const el = v.current; if (el && !el.paused) setProgress(file.uri, { t: el.currentTime, d: el.duration || undefined }) }, 5000)
    return () => clearInterval(t)
  }, [file.uri])

  if (!lessonsAvailable()) {
    return (
      <div className="yt yt-empty">
        <p className="small" style={{ margin: 0 }}>This song uses a lesson video from your phone ({niceName(file.name)}). It plays in the KGuitar app on the phone.</p>
        <button className="btn sm ghost" onClick={() => onUrl(undefined)}>Remove the video</button>
      </div>
    )
  }
  return (
    <div className="yt local-video">
      <div className="yt-frame">
        <video ref={v} src={mediaUrl(file.uri)} playsInline controls preload="metadata" className={mirror ? 'mirrored' : ''}
          onLoadedMetadata={() => setReady(true)} onError={() => setError(true)} aria-label={niceName(file.name)} />
        {error && (
          <div className="yt-error">
            <p>The video can't be read. If you moved or renamed the lesson folder, pick it again in Learn → Your video lessons.</p>
            <div className="row" style={{ justifyContent: 'center' }}><button className="btn" onClick={() => onUrl(undefined)}>Remove the video</button></div>
          </div>
        )}
      </div>
      <div className="yt-bar">
        <button className="btn sm" disabled={!ready} onClick={() => { const r = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length]; setRate(r); if (v.current) v.current.playbackRate = r }} aria-label="Playback speed">{label(rate)}</button>
        <button className="btn sm" disabled={!ready} onClick={() => { if (v.current) v.current.currentTime = Math.max(0, now() - 5) }} aria-label="Back 5 seconds">−5s</button>
        <button className={`btn sm${a !== null ? ' set' : ''}`} disabled={!ready} onClick={() => { setA(now()); if (b !== null && b <= now()) setB(null) }}>A{a !== null ? ` ${fmt(a)}` : ''}</button>
        <button className={`btn sm${b !== null ? ' set' : ''}`} disabled={!ready || a === null} onClick={() => { const t = now(); if (a !== null && t > a) { setB(t); setLoop(true) } }}>B{b !== null ? ` ${fmt(b)}` : ''}</button>
        <button className="btn sm" aria-pressed={loop} disabled={a === null || b === null} onClick={() => setLoop(l => !l)}>Loop</button>
        {(a !== null || b !== null) && <button className="btn sm" onClick={() => { setA(null); setB(null); setLoop(false) }} aria-label="Clear loop">✕</button>}
        <button className="btn sm" aria-pressed={mirror} onClick={() => setMirror(m => !m)} title="Flip the picture, so the teacher's hands match yours">Mirror</button>
        <span style={{ flex: 1 }} />
        {onSync && <button className={`btn sm${sync ? ' set' : ''}`} disabled={!ready} aria-pressed={syncOpen} onClick={() => setSyncOpen(!syncOpen)}>{sync ? 'Synced' : 'Sync with tab'}</button>}
        <button className="btn sm ghost" onClick={() => onUrl(undefined)}>Change video</button>
      </div>
      {syncOpen && onSync && <SyncPanel ready={ready} now={now} sync={sync} onSync={onSync} tabBpm={tabBpm} />}
    </div>
  )
}

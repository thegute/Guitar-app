// One of your own lesson videos in Play's video panel (phone app only): the same speed, A–B loop and sync-with-tab
// controls as a YouTube video, plus a mirror view, played from the phone's storage.
import { onLeavePage } from '../audio/stopAll'
import { useEffect, useRef, useState } from 'react'
import type { VideoApi, VideoSync } from '../play/inTime'
import { hasWebLessonFile, lessonsAvailable, mediaUrl, niceName, setProgress } from '../lessons/folders'
import { attachMpegTsPlayer, probeVideoUrl, type TsPlayerHandle } from '../lessons/mpegtsFallback'
import { NativeVideoStage, nativeVideoAvailable, type NativeVideoHandle } from '../lessons/nativeVideo'
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
  noteSecs?: number[]
}

export function LocalVideo({ file, onUrl, onApi, sync, onSync, tabBpm = 90, noteSecs }: Props) {
  const v = useRef<HTMLVideoElement>(null)
  const useNative = nativeVideoAvailable(file.uri)
  const nativeApiRef = useRef<NativeVideoHandle | null>(null)
  useEffect(() => onLeavePage(() => {
    if (useNative) nativeApiRef.current?.pause()
    else v.current?.pause()
  }), [useNative])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const tsModeRef = useRef(false)
  const tsRef = useRef<TsPlayerHandle | null>(null)
  const videoSrc = mediaUrl(file.uri)
  const [rate, setRate] = useState(1)

  useEffect(() => {
    if (useNative) {
      setError(false)
      setReady(false)
      return
    }
    let cancelled = false
    const el = v.current
    setError(false)
    setReady(false)
    tsModeRef.current = false
    tsRef.current?.destroy()
    tsRef.current = null
    if (!el) return

    void (async () => {
      const probe = await probeVideoUrl(videoSrc)
      if (cancelled || v.current !== el) return
      if (probe.kind === 'http-error') { setError(true); return }
      if (probe.kind === 'mpegts' || probe.kind === 'm2ts') {
        tsModeRef.current = true
        try {
          const h = await attachMpegTsPlayer(el, videoSrc, () => { if (!cancelled) setError(true) }, probe.kind)
          if (cancelled) { h?.destroy(); return }
          if (h) { tsRef.current = h; setError(false); return }
        } catch { /* fall back */ }
        tsModeRef.current = false
      }
      el.src = videoSrc
      el.load()
    })()

    return () => {
      cancelled = true
      tsRef.current?.destroy()
      tsRef.current = null
      try { el.pause(); el.removeAttribute('src'); el.load() } catch { /* ignore */ }
    }
  }, [videoSrc, useNative])

  const handleErr = () => {
    if (!tsModeRef.current && !useNative) setError(true)
  }
  const [mirror, setMirror] = useState(false)
  const [a, setA] = useState<number | null>(null)
  const [b, setB] = useState<number | null>(null)
  const [loop, setLoop] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const now = () => (useNative ? (nativeApiRef.current?.time() ?? 0) : (v.current?.currentTime ?? 0))
  const seekTo = (t: number) => {
    const pos = Math.max(0, t)
    if (useNative) nativeApiRef.current?.seek(pos)
    else if (v.current) v.current.currentTime = pos
  }

  useEffect(() => {
    if (useNative) {
      onApi?.({
        time: () => nativeApiRef.current?.time() ?? 0,
        playing: () => nativeApiRef.current?.playing() ?? false,
        rate: () => nativeApiRef.current?.rate() ?? 1,
        play: () => nativeApiRef.current?.play(),
        pause: () => nativeApiRef.current?.pause(),
        seek: t => nativeApiRef.current?.seek(Math.max(0, t)),
      })
      return () => onApi?.(null)
    }
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
  }, [file.uri, useNative])

  // A–B loop
  useEffect(() => {
    if (!loop || a === null || b === null || b <= a) return
    const t = setInterval(() => {
      const cur = now()
      if (cur >= b || cur < a - 1) seekTo(a)
    }, 150)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop, a, b, useNative])

  // remember where you got to
  useEffect(() => {
    const t = setInterval(() => {
      if (useNative) {
        const api = nativeApiRef.current
        if (api && api.playing()) setProgress(file.uri, { t: api.time(), d: api.duration() || undefined })
      } else {
        const el = v.current
        if (el && !el.paused) setProgress(file.uri, { t: el.currentTime, d: el.duration || undefined })
      }
    }, 5000)
    return () => clearInterval(t)
  }, [file.uri, useNative])

  if (!lessonsAvailable() && !hasWebLessonFile(file.uri)) {
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
        {useNative ? (
          <NativeVideoStage
            uri={file.uri}
            rate={rate}
            mirror={mirror}
            syncKey={`${syncOpen}:${error}`}
            onState={s => { if (s.ready) { setError(false); setReady(true) } }}
            onError={() => setError(true)}
            apiRef={nativeApiRef}
          />
        ) : (
          <video ref={v} playsInline controls preload="metadata" className={mirror ? 'mirrored' : ''}
            onLoadedMetadata={() => { setError(false); setReady(true) }} onError={handleErr} aria-label={niceName(file.name)} />
        )}
        {error && (
          <div className="yt-error">
            <p>The video can't be read. If you moved or renamed the lesson folder, pick it again in Learn → Your video lessons.</p>
            <div className="row" style={{ justifyContent: 'center' }}><button className="btn" onClick={() => onUrl(undefined)}>Remove the video</button></div>
          </div>
        )}
      </div>
      <div className="yt-bar">
        <button className="btn sm" disabled={!ready} onClick={() => {
          const r = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length]
          setRate(r)
          if (useNative) nativeApiRef.current?.setRate(r)
          else if (v.current) v.current.playbackRate = r
        }} aria-label="Playback speed">{label(rate)}</button>
        <button className="btn sm" disabled={!ready} onClick={() => seekTo(Math.max(0, now() - 5))} aria-label="Back 5 seconds">−5s</button>
        <button className={`btn sm${a !== null ? ' set' : ''}`} disabled={!ready} onClick={() => { setA(now()); if (b !== null && b <= now()) setB(null) }}>A{a !== null ? ` ${fmt(a)}` : ''}</button>
        <button className={`btn sm${b !== null ? ' set' : ''}`} disabled={!ready || a === null} onClick={() => { const t = now(); if (a !== null && t > a) { setB(t); setLoop(true) } }}>B{b !== null ? ` ${fmt(b)}` : ''}</button>
        <button className="btn sm" aria-pressed={loop} disabled={a === null || b === null} onClick={() => setLoop(l => !l)}>Loop</button>
        {(a !== null || b !== null) && <button className="btn sm" onClick={() => { setA(null); setB(null); setLoop(false) }} aria-label="Clear loop">✕</button>}
        <button className="btn sm" aria-pressed={mirror} onClick={() => setMirror(m => !m)} title="Flip the picture, so the teacher's hands match yours">Mirror</button>
        <span style={{ flex: 1 }} />
        {onSync && <button className={`btn sm${sync ? ' set' : ''}`} disabled={!ready} aria-pressed={syncOpen} onClick={() => setSyncOpen(!syncOpen)}>{sync ? 'Synced' : 'Sync with tab'}</button>}
        <button className="btn sm ghost" onClick={() => onUrl(undefined)}>Change video</button>
      </div>
      {syncOpen && onSync && <SyncPanel ready={ready} now={now} sync={sync} onSync={onSync} tabBpm={tabBpm}
        auto={noteSecs ? { noteSecs, play: () => {
          setRate(1)
          if (useNative) { nativeApiRef.current?.setRate(1); nativeApiRef.current?.play() }
          else if (v.current) { v.current.playbackRate = 1; void v.current.play() }
        } } : undefined} />}
    </div>
  )
}

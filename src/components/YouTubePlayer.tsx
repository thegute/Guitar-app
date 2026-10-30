// A small YouTube player for playing along: speed control and an A–B loop for practising a section.
import { useEffect, useRef, useState } from 'react'
import { youtubeId, youtubeStart } from '../tabs/library'
import { fitTaps, type VideoApi, type VideoSync } from '../play/inTime'
import { parseLocalVideo } from '../lessons/folders'
import { LocalVideo } from './LocalVideo'

interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(s: number, allowAhead: boolean): void
  getCurrentTime(): number
  getPlayerState(): number
  setPlaybackRate(r: number): void
  getPlaybackRate(): number
  destroy(): void
}
interface YTNamespace {
  Player: new (el: HTMLElement | string, opts: Record<string, unknown>) => YTPlayer
}
declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YTNamespace> | null = null
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((res, rej) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { prev?.(); if (window.YT) res(window.YT) }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      s.async = true
      s.onerror = () => { apiPromise = null; rej(new Error('offline')) }
      document.head.appendChild(s)
      setTimeout(() => rej(new Error('timeout')), 15000)
    })
  }
  return apiPromise
}

const RATES = [1, 0.75, 0.5]
const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

interface Props {
  url?: string
  onUrl: (u: string | undefined) => void
  /** Play gets hold of the video (to follow it in time) */
  onApi?: (api: VideoApi | null) => void
  sync?: VideoSync
  onSync?: (s: VideoSync | undefined) => void
  /** the tab's tempo, the starting guess for syncing */
  tabBpm?: number
  /** the line under the link box (default: use headphones so the mic hears only you) */
  note?: string
}

export function YouTubePlayer({ url, onUrl, onApi, sync, onSync, tabBpm = 90, note = 'Use headphones, so the mic hears only your guitar.' }: Props) {
  const id = url ? youtubeId(url) : null
  const [draft, setDraft] = useState('')
  const [bad, setBad] = useState(false)
  const local = parseLocalVideo(url)
  if (local) return <LocalVideo key={local.uri} file={local} onUrl={onUrl} onApi={onApi} sync={sync} onSync={onSync} tabBpm={tabBpm} />

  if (!id) {
    return (
      <div className="yt yt-empty">
        <form
          className="yt-add"
          onSubmit={e => {
            e.preventDefault()
            if (youtubeId(draft)) { onUrl(draft.trim()); setDraft(''); setBad(false) } else setBad(true)
          }}
        >
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input id="yt-url" className="input" inputMode="url" placeholder="YouTube link to play along with" aria-label="YouTube link" value={draft} onChange={e => { setDraft(e.target.value); setBad(false) }} />
            <button className="btn primary" type="submit">Add</button>
          </div>
          {bad && <span className="small" style={{ color: 'var(--jewel)' }}>That doesn't look like a YouTube link.</span>}
          <span className="small muted">{note}</span>
        </form>
      </div>
    )
  }
  return <Player key={id} id={id} url={url!} onUrl={onUrl} onApi={onApi} sync={sync} onSync={onSync} tabBpm={tabBpm} />
}

function Player({ id, url, onUrl, onApi, sync, onSync, tabBpm = 90 }: Props & { id: string; url: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const player = useRef<YTPlayer | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<number | null>(null)
  const [rate, setRate] = useState(1)
  const [a, setA] = useState<number | null>(null)
  const [b, setB] = useState<number | null>(null)
  const [loop, setLoop] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const start = youtubeStart(url)
  const origin = typeof location !== 'undefined' && /^https?:/.test(location.origin) ? location.origin : ''
  const src = `https://www.youtube.com/embed/${id}?enablejsapi=1&playsinline=1&rel=0&start=${start}${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`

  useEffect(() => {
    let alive = true
    loadApi()
      .then(YT => {
        if (!alive || !frame.current) return
        player.current = new YT.Player(frame.current, {
          events: {
            onReady: () => {
              if (!alive) return
              setReady(true)
              const p = () => player.current
              onApi?.({
                time: () => p()?.getCurrentTime() ?? 0,
                playing: () => p()?.getPlayerState() === 1,
                rate: () => p()?.getPlaybackRate?.() ?? 1,
                play: () => p()?.playVideo(),
                pause: () => p()?.pauseVideo(),
                seek: t => p()?.seekTo(Math.max(0, t), true),
              })
            },
            onError: (e: { data: number }) => alive && setError(e.data),
          },
        })
      })
      .catch(() => { /* the video still plays with YouTube's own controls */ })
    return () => {
      alive = false
      player.current = null
      onApi?.(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // A–B loop
  useEffect(() => {
    if (!loop || a === null || b === null || b <= a) return
    const t = setInterval(() => {
      const p = player.current
      if (!p) return
      const now = p.getCurrentTime()
      if (now >= b || now < a - 1) p.seekTo(a, true)
    }, 200)
    return () => clearInterval(t)
  }, [loop, a, b])

  const now = () => player.current?.getCurrentTime() ?? 0
  const blocked = error === 101 || error === 150 || error === 152 || error === 153
  const watch = `https://www.youtube.com/watch?v=${id}`

  return (
    <div className="yt">
      <div className="yt-frame">
        <iframe
          ref={frame}
          src={src}
          title="YouTube video"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
        {error !== null && (
          <div className="yt-error">
            <p>{blocked ? "This video's owner doesn't allow it to play inside other apps." : error === 100 || error === 2 ? 'This video was not found.' : "YouTube couldn't play this video."}</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <a className="btn primary" href={watch} target="_blank" rel="noreferrer">Open in YouTube</a>
              <button className="btn" onClick={() => onUrl(undefined)}>Use another video</button>
            </div>
          </div>
        )}
      </div>
      <div className="yt-bar">
        <button className="btn sm" disabled={!ready} onClick={() => { const r = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; setRate(r); player.current?.setPlaybackRate(r) }} aria-label="Playback speed">
          {rate === 1 ? '1×' : rate === 0.75 ? '¾×' : '½×'}
        </button>
        <button className="btn sm" disabled={!ready} onClick={() => player.current?.seekTo(Math.max(0, now() - 5), true)} aria-label="Back 5 seconds">−5s</button>
        <button className={`btn sm${a !== null ? ' set' : ''}`} disabled={!ready} onClick={() => { setA(now()); if (b !== null && b <= now()) setB(null) }}>
          A{a !== null ? ` ${fmt(a)}` : ''}
        </button>
        <button className={`btn sm${b !== null ? ' set' : ''}`} disabled={!ready || a === null} onClick={() => { const t = now(); if (a !== null && t > a) { setB(t); setLoop(true) } }}>
          B{b !== null ? ` ${fmt(b)}` : ''}
        </button>
        <button className="btn sm" aria-pressed={loop} disabled={a === null || b === null} onClick={() => setLoop(l => !l)}>Loop</button>
        {(a !== null || b !== null) && <button className="btn sm" onClick={() => { setA(null); setB(null); setLoop(false) }} aria-label="Clear loop">✕</button>}
        <span style={{ flex: 1 }} />
        {onSync && <button className={`btn sm${sync ? ' set' : ''}`} disabled={!ready} aria-pressed={syncOpen} onClick={() => setSyncOpen(!syncOpen)}>{sync ? 'Synced' : 'Sync with tab'}</button>}
        <button className="btn sm ghost" onClick={() => onUrl(undefined)}>Change video</button>
      </div>
      {syncOpen && onSync && <SyncPanel ready={ready} now={now} sync={sync} onSync={onSync} tabBpm={tabBpm} />}
    </div>
  )
}

/** Line a video up with the tab: tap along on the beat, or set bar 1 and the tempo by hand. */
export function SyncPanel({ ready, now, sync, onSync, tabBpm = 90 }: { ready: boolean; now: () => number; sync?: VideoSync; onSync: (s: VideoSync | undefined) => void; tabBpm?: number }) {
  const [bpmDraft, setBpmDraft] = useState(String(Math.round(sync?.bpm ?? tabBpm)))
  // tap to sync: video times of the taps
  const vtaps = useRef<number[]>([])
  const [tapCount, setTapCount] = useState(0)
  const [tapNote, setTapNote] = useState('')
  return (
    <div className="yt-sync small">
      <p style={{ margin: 0 }}>Line the video up with the tab, so the tab scrolls with the recording in <b>In time</b> mode.</p>
      <p style={{ margin: 0 }}><b>Tap to sync:</b> play the video and tap <b>Tap along</b> on every beat, starting on the first beat of the tab. After 8 taps the tempo and start are set; keep tapping to make it more exact.</p>
      <div className="row">
        <button className="btn primary tap-sync" disabled={!ready} onClick={() => {
          const t = now()
          // a pause of more than 3 seconds starts a new set of taps
          const prev = vtaps.current
          // the same moment again (the video is paused) or a double tap: not a beat
          if (prev.length && Math.abs(t - prev[prev.length - 1]) < 0.12) { setTapNote('Play the video, then tap on the beat.'); return }
          setTapNote('')
          vtaps.current = prev.length && (t - prev[prev.length - 1] > 3 || t < prev[prev.length - 1]) ? [t] : [...prev, t].slice(0, 200)
          setTapCount(vtaps.current.length)
          const fit = fitTaps(vtaps.current)
          if (fit && vtaps.current.length >= 8) {
            const bpm = Math.round((60 / fit.spb) * 10) / 10
            setBpmDraft(String(Math.round(bpm)))
            onSync({ offset: fit.offset, bpm })
          }
        }}>Tap along{tapCount ? ` (${tapCount})` : ''}</button>
        {tapCount > 0 && tapCount < 8 && !tapNote && <span className="muted">{8 - tapCount} more…</span>}
        {tapNote && <span className="muted">{tapNote}</span>}
      </div>
      <details>
        <summary>Set it by hand</summary>
        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn sm" onClick={() => onSync({ offset: now(), bpm: Number(bpmDraft) || tabBpm })}>Bar 1 starts now</button>
          <label className="row" style={{ gap: 4 }}>BPM <input className="input" style={{ width: 70, flex: 'none' }} inputMode="numeric" value={bpmDraft} onChange={e => { setBpmDraft(e.target.value); const v = Number(e.target.value); if (sync && v > 20 && v < 320) onSync({ ...sync, bpm: v }) }} /></label>
        </div>
      </details>
      {sync && (
        <div className="row">
          <span>✓ Bar 1 at {fmt(sync.offset)}.{String(Math.floor((sync.offset % 1) * 10))}, {Math.round(sync.bpm)} BPM</span>
          <button className="btn sm" onClick={() => onSync({ ...sync, offset: sync.offset - 0.05 })}>Tab is late</button>
          <button className="btn sm" onClick={() => onSync({ ...sync, offset: sync.offset + 0.05 })}>Tab is early</button>
          <button className="btn sm ghost" onClick={() => onSync(undefined)}>Clear</button>
        </div>
      )}
    </div>
  )
}

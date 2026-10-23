// A small YouTube player for playing along: speed control and an A–B loop for practising a section.
import { useEffect, useRef, useState } from 'react'
import { youtubeId, youtubeStart } from '../tabs/library'
import type { VideoApi, VideoSync } from '../play/inTime'

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
}

export function YouTubePlayer({ url, onUrl, onApi, sync, onSync, tabBpm = 90 }: Props) {
  const id = url ? youtubeId(url) : null
  const [draft, setDraft] = useState('')
  const [bad, setBad] = useState(false)

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
          <span className="small muted">Use headphones, so the mic hears only your guitar.</span>
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
  const [bpmDraft, setBpmDraft] = useState(String(Math.round(sync?.bpm ?? tabBpm)))
  const taps = useRef<number[]>([])
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
      {syncOpen && onSync && (
        <div className="yt-sync small">
          <p style={{ margin: 0 }}>Line the video up with the tab, so the tab scrolls with the recording in <b>In time</b> mode.</p>
          <ol>
            <li>Play the video from the start.</li>
            <li>Tap <b>Bar 1 starts now</b> right on the first beat of the tab's first bar.</li>
            <li>Set the recording's tempo: type it, or tap <b>Tap the beat</b> along with the music 8 times.</li>
          </ol>
          <div className="row">
            <button className="btn sm primary" onClick={() => onSync({ offset: now(), bpm: Number(bpmDraft) || tabBpm })}>Bar 1 starts now</button>
            <label className="row" style={{ gap: 4 }}>BPM <input className="input" style={{ width: 70, flex: 'none' }} inputMode="numeric" value={bpmDraft} onChange={e => { setBpmDraft(e.target.value); const v = Number(e.target.value); if (sync && v > 20 && v < 320) onSync({ ...sync, bpm: v }) }} /></label>
            <button className="btn sm" onClick={() => {
              const t = performance.now()
              taps.current = [...taps.current.filter(x => t - x < 4000), t].slice(-9)
              const ts = taps.current
              if (ts.length >= 4) {
                const gap = (ts[ts.length - 1] - ts[0]) / (ts.length - 1) / 1000
                const r = player.current?.getPlaybackRate?.() ?? 1
                const bpm = Math.round(60 / (gap * r))
                setBpmDraft(String(bpm))
                if (sync) onSync({ ...sync, bpm })
              }
            }}>Tap the beat</button>
          </div>
          {sync && (
            <div className="row">
              <span>Bar 1 at {fmt(sync.offset)}.{String(Math.round((sync.offset % 1) * 10))} · {Math.round(sync.bpm)} BPM</span>
              <button className="btn sm" onClick={() => onSync({ ...sync, offset: sync.offset - 0.05 })}>Tab is late</button>
              <button className="btn sm" onClick={() => onSync({ ...sync, offset: sync.offset + 0.05 })}>Tab is early</button>
              <button className="btn sm ghost" onClick={() => onSync(undefined)}>Clear</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Native Android Jetpack Media3 ExoPlayer bridge + sleek HTML playback bar for local course videos.
// Reads SAF content:// URIs directly via Android hardware/software MediaCodec (zero WebView error 3 failures!).
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react'
import { onLeavePage } from '../audio/stopAll'

export interface NativeVideoState {
  time: number
  duration: number
  playing: boolean
  ready: boolean
  buffering: boolean
  ended: boolean
  rate: number
  muted: boolean
  videoWidth: number
  videoHeight: number
}

export interface NativeVideoBounds {
  x: number
  y: number
  w: number
  h: number
  vw: number
  vh: number
  clipTop: number
  clipBottom: number
  visible: boolean
  opacity: number
  mirror: boolean
  cleanMode: boolean
}

interface NativeVideoPluginApi {
  open(opts: { uri: string; startSec?: number; rate?: number; muted?: boolean; autoplay?: boolean }): Promise<void>
  setBounds(bounds: NativeVideoBounds): Promise<void>
  play(): Promise<void>
  pause(): Promise<void>
  seek(opts: { time: number }): Promise<void>
  setRate(opts: { rate: number }): Promise<void>
  setVolume(opts: { volume: number }): Promise<void>
  close(): Promise<void>
  addListener(event: 'state', fn: (s: NativeVideoState) => void): Promise<PluginListenerHandle>
  addListener(event: 'error', fn: (e: { code?: string; message?: string }) => void): Promise<PluginListenerHandle>
  addListener(event: 'restoreClean', fn: () => void): Promise<PluginListenerHandle>
}

export const NativeVideo = registerPlugin<NativeVideoPluginApi>('NativeVideo')

/** True on real Android devices for picked SAF content:// lesson videos (web/desktop/mocks keep HTML <video>). */
export function nativeVideoAvailable(uri: string): boolean {
  const hasMock = !!(globalThis as unknown as { __kgLessonsMock?: unknown }).__kgLessonsMock
  if (hasMock) return false
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' && uri.startsWith('content://')
}

export interface NativeVideoHandle {
  play(): void
  pause(): void
  seek(sec: number): void
  setRate(r: number): void
  time(): number
  duration(): number
  playing(): boolean
  rate(): number
}

const fmt = (t: number) => {
  const s = Math.max(0, Math.floor(t || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export interface NativeVideoStageProps {
  uri: string
  startSec?: number
  rate: number
  mirror: boolean
  opacity?: number
  visible?: boolean
  floating?: boolean
  cleanMode?: boolean
  syncKey?: string
  onRestoreClean?: () => void
  onState?: (s: NativeVideoState) => void
  onError?: (msg: string) => void
  apiRef?: MutableRefObject<NativeVideoHandle | null>
}

const INIT_STATE: NativeVideoState = {
  time: 0,
  duration: 0,
  playing: false,
  ready: false,
  buffering: true,
  ended: false,
  rate: 1,
  muted: false,
  videoWidth: 0,
  videoHeight: 0,
}

/**
 * Reserves the exact screen box for Android's native ExoPlayer TextureView, syncs its screen bounds
 * continuously during drags/resizes/scrolls, and renders a crisp HTML Play/Pause + Scrub + Mute bar beneath it.
 */
export function NativeVideoStage({
  uri,
  startSec = 0,
  rate,
  mirror,
  opacity = 1,
  visible = true,
  floating = false,
  cleanMode = false,
  syncKey = '',
  onRestoreClean,
  onState,
  onError,
  apiRef,
}: NativeVideoStageProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [st, setSt] = useState<NativeVideoState>(INIT_STATE)
  const [scrubbing, setScrubbing] = useState<number | null>(null)
  const stRef = useRef<NativeVideoState>(INIT_STATE)
  const rateRef = useRef(rate)
  rateRef.current = rate
  const cbRef = useRef({ onRestoreClean, onState, onError })
  cbRef.current = { onRestoreClean, onState, onError }

  // Expose synchronous imperative handle matching HTMLVideoElement helpers
  useEffect(() => {
    const handle: NativeVideoHandle = {
      play: () => { void NativeVideo.play().catch(() => {}) },
      pause: () => { void NativeVideo.pause().catch(() => {}) },
      seek: sec => {
        const t = Math.max(0, sec)
        stRef.current = { ...stRef.current, time: t }
        setSt(stRef.current)
        void NativeVideo.seek({ time: t }).catch(() => {})
      },
      setRate: r => {
        rateRef.current = r
        void NativeVideo.setRate({ rate: r }).catch(() => {})
      },
      time: () => stRef.current.time,
      duration: () => stRef.current.duration,
      playing: () => stRef.current.playing,
      rate: () => rateRef.current,
    }
    if (apiRef) apiRef.current = handle
    return () => { if (apiRef && apiRef.current === handle) apiRef.current = null }
  }, [apiRef])

  // Open ExoPlayer for this video URI and clean up completely on unmount / page leave
  useEffect(() => {
    let alive = true
    const handles: PluginListenerHandle[] = []
    stRef.current = INIT_STATE
    setSt(INIT_STATE)

    const offLeave = onLeavePage(() => {
      void NativeVideo.close().catch(() => {})
    })

    void (async () => {
      try {
        handles.push(await NativeVideo.addListener('state', next => {
          if (!alive) return
          stRef.current = next
          setSt(next)
          cbRef.current.onState?.(next)
        }))
        handles.push(await NativeVideo.addListener('error', e => {
          if (!alive) return
          const msg = [e.code, e.message].filter(Boolean).join(': ')
          cbRef.current.onError?.(msg || 'Playback error')
        }))
        handles.push(await NativeVideo.addListener('restoreClean', () => {
          if (!alive) return
          cbRef.current.onRestoreClean?.()
        }))
        if (!alive) return
        await NativeVideo.open({
          uri,
          startSec: startSec > 5 ? startSec : 0,
          rate: rateRef.current,
          muted: false,
          autoplay: false,
        })
      } catch (e) {
        if (alive) cbRef.current.onError?.((e as Error).message || 'Could not open native video.')
      }
    })()

    return () => {
      alive = false
      offLeave()
      for (const h of handles) { void h.remove().catch(() => {}) }
      void NativeVideo.close().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri])

  // Keep playback speed synced
  useEffect(() => {
    void NativeVideo.setRate({ rate }).catch(() => {})
  }, [rate])

  // Compute and push exact screen bounds for the native TextureView
  const pushBounds = () => {
    const box = stageRef.current
    if (!box || !visible) {
      void NativeVideo.setBounds({
        x: 0, y: 0, w: 0, h: 0,
        vw: innerWidth || 1, vh: innerHeight || 1,
        clipTop: 0, clipBottom: innerHeight || 1,
        visible: false, opacity, mirror, cleanMode,
      }).catch(() => {})
      return
    }
    const r = box.getBoundingClientRect()
    const vh = innerHeight || 1
    const vw = innerWidth || 1
    // When docked inside the scrollable page, clip below the top bar and above the bottom tab bar
    const clipTop = floating ? 0 : 48
    const clipBottom = floating ? vh : vh - 58
    void NativeVideo.setBounds({
      x: r.left,
      y: r.top,
      w: r.width,
      h: r.height,
      vw,
      vh,
      clipTop,
      clipBottom,
      visible: visible && r.width >= 10 && r.height >= 10,
      opacity,
      mirror,
      cleanMode,
    }).catch(() => {})
  }

  useLayoutEffect(() => {
    pushBounds()
    const raf = requestAnimationFrame(pushBounds)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, floating, opacity, mirror, cleanMode, syncKey, st.ready])

  useEffect(() => {
    const box = stageRef.current
    if (!box) return
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => pushBounds()) : null
    ro?.observe(box)
    const onScroll = () => pushBounds()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    const onVis = () => {
      if (document.visibilityState !== 'visible') void NativeVideo.pause().catch(() => {})
      else pushBounds()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      ro?.disconnect()
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, floating, opacity, mirror, cleanMode])

  const shownTime = scrubbing ?? st.time
  const maxDur = Math.max(0.1, st.duration || 0.1)

  return (
    <div className="native-video-wrap">
      <div
        ref={stageRef}
        className="lesson-video-stage"
        aria-label="Lesson video"
        onClick={() => {
          if (st.playing) void NativeVideo.pause().catch(() => {})
          else void NativeVideo.play().catch(() => {})
        }}
      >
        {!st.ready && (
          <span className="small muted" style={{ pointerEvents: 'none' }}>
            {st.buffering ? 'Loading video…' : 'Tap to play'}
          </span>
        )}
      </div>

      {!cleanMode && (
        <div className="native-video-bar" data-testid="native-video-bar">
          <button
            className="btn sm native-vb-btn"
            onClick={() => {
              if (st.playing) void NativeVideo.pause().catch(() => {})
              else void NativeVideo.play().catch(() => {})
            }}
            aria-label={st.playing ? 'Pause video' : 'Play video'}
            title={st.playing ? 'Pause' : 'Play'}
          >
            {st.playing ? '❚❚' : '▶'}
          </button>
          <span className="small tabular native-vb-time">{fmt(shownTime)}</span>
          <input
            type="range"
            className="native-vb-scrub"
            min={0}
            max={maxDur}
            step={0.1}
            value={Math.min(maxDur, shownTime)}
            onChange={e => setScrubbing(Number(e.target.value))}
            onPointerUp={() => {
              if (scrubbing !== null) {
                const t = scrubbing
                setScrubbing(null)
                void NativeVideo.seek({ time: t }).catch(() => {})
              }
            }}
            onTouchEnd={() => {
              if (scrubbing !== null) {
                const t = scrubbing
                setScrubbing(null)
                void NativeVideo.seek({ time: t }).catch(() => {})
              }
            }}
            onKeyUp={() => {
              if (scrubbing !== null) {
                const t = scrubbing
                setScrubbing(null)
                void NativeVideo.seek({ time: t }).catch(() => {})
              }
            }}
            aria-label="Video position"
          />
          <span className="small muted tabular native-vb-time">{fmt(st.duration)}</span>
          <button
            className="btn sm native-vb-btn"
            onClick={() => void NativeVideo.setVolume({ volume: st.muted ? 1 : 0 }).catch(() => {})}
            aria-label={st.muted ? 'Unmute video' : 'Mute video'}
            title={st.muted ? 'Unmute' : 'Mute'}
          >
            {st.muted ? '🔇' : '🔊'}
          </button>
        </div>
      )}
    </div>
  )
}

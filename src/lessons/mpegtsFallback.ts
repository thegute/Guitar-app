// Automatic seamless MPEG-TS / M2TS (.ts streams misnamed as .mp4 — like Roy Ziv's Modes Navigator videos)
// playback inside Chromium / Android WebView using mpegts.js + MediaSource Extensions (MSE),
// plus container signature detection & fast HTTP diagnostics BEFORE <video> ever tries native MP4 decode.

export type VideoContainerKind = 'mpegts' | 'm2ts' | 'mp4' | 'mkv' | 'avi' | 'ok' | 'http-error' | 'network-error'

export interface ProbeResult {
  kind: VideoContainerKind
  status?: number
  brand?: string
}

/** Pure header signature detector across the first <= 4 KB of a video file (detects 188-byte TS, 192-byte M2TS, MP4, MKV, AVI). */
export function detectVideoSignature(buf: Uint8Array): { kind: 'mpegts' | 'm2ts' | 'mp4' | 'mkv' | 'avi' | 'ok'; brand?: string } {
  const n = buf.length
  if (n >= 12 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]).trim()
    return { kind: 'mp4', brand }
  }
  // Standard 188-byte MPEG-TS: 3 sync bytes (0x47) spaced 188 bytes apart (even after leading ID3/padding)
  const limit188 = Math.min(n - 377, 1024)
  for (let i = 0; i <= limit188; i++) {
    if (buf[i] === 0x47 && buf[i + 188] === 0x47 && buf[i + 376] === 0x47) {
      return { kind: 'mpegts' }
    }
  }
  // Short buffer fallback (189..376 bytes)
  if (n >= 189 && buf[0] === 0x47 && buf[188] === 0x47) {
    return { kind: 'mpegts' }
  }
  // 192-byte Blu-ray / camcorder M2TS: 4-byte timestamp + 0x47 sync byte spaced 192 bytes apart
  const limit192 = Math.min(n - 385, 1024)
  for (let i = 0; i <= limit192; i++) {
    if (buf[i] === 0x47 && buf[i + 192] === 0x47 && buf[i + 384] === 0x47) {
      return { kind: 'm2ts' }
    }
  }
  if (n >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return { kind: 'mkv' }
  }
  if (n >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x41 && buf[9] === 0x56 && buf[10] === 0x49) {
    return { kind: 'avi' }
  }
  return { kind: 'ok' }
}

/** Peek at the first 4 KB of a local media URL to detect MPEG-TS / M2TS / MP4 / HTTP errors before <video> loads. */
export async function probeVideoUrl(url: string): Promise<ProbeResult> {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-4095' } })
    if (!res.ok && res.status !== 206) {
      return { kind: 'http-error', status: res.status }
    }
    const buf = new Uint8Array(await res.arrayBuffer())
    const sig = detectVideoSignature(buf)
    return { ...sig, status: res.status }
  } catch {
    return { kind: 'network-error' }
  }
}

export interface TsPlayerHandle {
  destroy(): void
}

/**
 * Attach an mpegts.js player cleanly to an existing <video> element for MPEG-TS / M2TS streams disguised as .mp4.
 * IMPORTANT: Callers must NOT bind a React `src={...}` prop on the <video> element, otherwise React will clobber
 * the MediaSource `blob:` URL that mpegts.js assigns to `videoEl.src`!
 */
export async function attachMpegTsPlayer(
  videoEl: HTMLVideoElement,
  url: string,
  onFatalError?: (detail: string) => void,
  streamType: 'mpegts' | 'm2ts' = 'mpegts',
): Promise<TsPlayerHandle | null> {
  const mod = await import('mpegts.js')
  const mpegts = mod.default ?? mod
  if (!mpegts?.isSupported?.()) return null

  const player = mpegts.createPlayer(
    { type: streamType, isLive: false, url },
    {
      enableWorker: false,
      enableStashBuffer: true,
      lazyLoad: false,
      seekType: 'range',
      autoCleanupSourceBuffer: true,
      autoCleanupMaxBackwardDuration: 45,
      autoCleanupMinBackwardDuration: 20,
    },
  )

  player.on(mpegts.Events.ERROR, (errType: string, errDetail: string) => {
    onFatalError?.(`${errType}: ${errDetail}`)
  })

  // Ensure clean element state before MediaSource attaches
  videoEl.removeAttribute('src')
  player.attachMediaElement(videoEl)
  player.load()

  return {
    destroy() {
      try {
        player.pause()
        player.unload()
        player.detachMediaElement()
        player.destroy()
      } catch { /* ignore */ }
    },
  }
}

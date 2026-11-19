// Automatic seamless MPEG-TS (.ts streams misnamed as .mp4 — like Roy Ziv's Modes Navigator videos)
// playback inside Chromium / Android WebView using mpegts.js + MediaSource Extensions (MSE),
// plus fast HTTP/format diagnostics when a video fails to load.

export interface ProbeResult {
  kind: 'mpegts' | 'ok' | 'http-error' | 'network-error'
  status?: number
}

/** Peek at the first 192 bytes of a local media URL to detect MPEG-TS (0x47 sync byte every 188 bytes) or HTTP errors. */
export async function probeVideoUrl(url: string): Promise<ProbeResult> {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-191' } })
    if (!res.ok && res.status !== 206) {
      return { kind: 'http-error', status: res.status }
    }
    const buf = new Uint8Array(await res.arrayBuffer())
    if (buf.length >= 189 && buf[0] === 0x47 && buf[188] === 0x47) {
      return { kind: 'mpegts', status: res.status }
    }
    return { kind: 'ok', status: res.status }
  } catch {
    return { kind: 'network-error' }
  }
}

export interface TsPlayerHandle {
  destroy(): void
}

/** Attach an mpegts.js player to an existing <video> element for MPEG-TS streams disguised as .mp4. */
export async function attachMpegTsPlayer(
  videoEl: HTMLVideoElement,
  url: string,
  onFatalError?: (detail: string) => void,
): Promise<TsPlayerHandle | null> {
  const mod = await import('mpegts.js')
  const mpegts = mod.default ?? mod
  if (!mpegts?.isSupported?.()) return null

  const player = mpegts.createPlayer(
    { type: 'mpegts', isLive: false, url },
    {
      enableWorker: false,
      lazyLoad: true,
      lazyLoadMaxDuration: 60,
      autoCleanupSourceBuffer: true,
      autoCleanupMaxBackwardDuration: 45,
      autoCleanupMinBackwardDuration: 20,
    },
  )

  player.on(mpegts.Events.ERROR, (errType: string, errDetail: string) => {
    onFatalError?.(`${errType}: ${errDetail}`)
  })

  // Clear native src before MSE attaches so browser doesn't double-fetch
  videoEl.removeAttribute('src')
  videoEl.load()
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

// Step 2 of a link scan: KGuitar plays the video itself in a full-screen theater stage and grabs ONLY the crisp video
// player rectangle (exact DOM rect crop) plus internal phone playback audio (Android 10+, ScreenGrabPlugin.java).
// On the web it's browser screen sharing (cropped to the exact video player rect).
// Frames go through the Stitcher one by one with their real capture timestamps.
import type { Gray } from './image'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { Stitcher, loadPicture, type Box, type Piece } from './pictures'
import { audio } from '../audio/engine'

interface GrabNative {
  available(): Promise<{ ok: boolean; sound: boolean }>
  start(o: { fps: number; seconds: number; sound: boolean; crop?: Box }): Promise<{ ok: boolean; error?: string; audioOk?: boolean; audioError?: string }>
  stop(): Promise<{ frames: string[]; times?: number[]; sound?: string; audioOk?: boolean; audioError?: string; width?: number; height?: number; fps?: number }>
  addListener(e: 'stopped', f: () => void): Promise<{ remove: () => void }>
}
const native = registerPlugin<GrabNative>('ScreenGrab')
const onPhone = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

export const canGrab = () => onPhone() || (typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia)

export interface Grabbed {
  pieces: Piece[]
  frames: number
  scrolled: boolean
  sound: { x: Float32Array; sr: number } | null
  audioError?: string
  strips?: Gray[]
  /** per strip: playhead x → seconds into the grab (for the audio referee) */
  timelines?: { x: number; t: number }[][]
  /** per strip: where each frame sat and when */
  views?: { x0: number; w: number; t: number }[][]
}
export interface GrabSession {
  /** whether internal audio capture started cleanly */
  audioOk: boolean
  audioError?: string
  /** stop and work through what was grabbed */
  stop(onProgress?: (f: number) => void): Promise<Grabbed>
  /** told if it stops by itself (time up, or stopped from Android's notification / the browser's bar) */
  onStopped(f: () => void): void
}

export async function startGrab(o: { fps?: number; seconds: number; crop?: Box }): Promise<GrabSession> {
  const fps = o.fps ?? 2
  return onPhone() ? startNative(fps, o.seconds, o.crop) : startWeb(fps, o.seconds, o.crop)
}

async function startNative(fps: number, seconds: number, crop?: Box): Promise<GrabSession> {
  let stoppedCb: (() => void) | null = null
  const sub = await native.addListener('stopped', () => stoppedCb?.())
  const r = await native.start({ fps, seconds, sound: true, ...(crop ? { crop } : {}) })
  if (!r.ok) {
    sub.remove()
    throw new Error(r.error === 'refused' ? 'Screen capture was not allowed.' : `Screen capture couldn't start (${r.error ?? 'unknown'}).`)
  }
  return {
    audioOk: r.audioOk !== false,
    audioError: r.audioError,
    onStopped: f => { stoppedCb = f },
    async stop(onProgress) {
      sub.remove()
      const got = await native.stop()
      const st = new Stitcher()
      for (const [i, path] of got.frames.entries()) {
        const t = got.times && typeof got.times[i] === 'number' ? got.times[i] : i / (got.fps || fps)
        try { st.add(await loadPicture(Capacitor.convertFileSrc(path)), t) } catch { /* a frame that didn't save */ }
        onProgress?.((i + 1) / Math.max(1, got.frames.length))
        if (i % 4 === 3) await new Promise(res => setTimeout(res, 0)) // let the screen update
      }
      let sound: Grabbed['sound'] = null
      if (got.sound) {
        try {
          const buf = await audio().decodeAudioData(await (await fetch(Capacitor.convertFileSrc(got.sound))).arrayBuffer())
          sound = { x: buf.getChannelData(0).slice(), sr: buf.sampleRate }
        } catch { /* no sound */ }
      }
      return {
        pieces: st.finish(),
        frames: st.frames,
        scrolled: st.scrolled,
        sound,
        audioError: got.audioError ?? r.audioError,
        strips: st.strips,
        timelines: st.timelines,
        views: st.views,
      }
    },
  }
}

async function startWeb(fps: number, seconds: number, crop?: Box): Promise<GrabSession> {
  const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia(o: unknown): Promise<MediaStream> }
  let stream: MediaStream
  try {
    stream = await md.getDisplayMedia({ video: { frameRate: fps }, audio: true, preferCurrentTab: true, selfBrowserSurface: 'include' })
  } catch { throw new Error('Screen sharing was not allowed.') }
  const v = document.createElement('video')
  v.muted = true; v.playsInline = true; v.srcObject = stream
  await v.play().catch(() => {})
  const st = new Stitcher()
  // Crop each web-shared tab frame to the exact video player rect (matching native Android ScreenGrabService!)
  const cropCanvas = crop ? document.createElement('canvas') : null
  let busy = false
  const t0 = performance.now()
  const timer = setInterval(() => {
    if (busy || !v.videoWidth) return
    busy = true
    try {
      const t = (performance.now() - t0) / 1000
      if (crop && cropCanvas) {
        const sx = Math.max(0, Math.round(crop.x * v.videoWidth))
        const sy = Math.max(0, Math.round(crop.y * v.videoHeight))
        const sw = Math.max(2, Math.min(v.videoWidth - sx, Math.round(crop.w * v.videoWidth)))
        const sh = Math.max(2, Math.min(v.videoHeight - sy, Math.round(crop.h * v.videoHeight)))
        if (cropCanvas.width !== sw || cropCanvas.height !== sh) { cropCanvas.width = sw; cropCanvas.height = sh }
        const ctx = cropCanvas.getContext('2d')!
        ctx.drawImage(v, sx, sy, sw, sh, 0, 0, sw, sh)
        st.add(cropCanvas, t)
      } else {
        st.add(v, t)
      }
    } finally { busy = false }
  }, 1000 / fps)
  // the sound (if a tab's audio was shared)
  const at = stream.getAudioTracks()
  const chunks: Blob[] = []
  const rec = at.length ? new MediaRecorder(new MediaStream(at)) : null
  if (rec) { rec.ondataavailable = e => chunks.push(e.data); rec.start(1000) }
  let stoppedCb: (() => void) | null = null
  let ended = false
  const end = () => { if (ended) return; ended = true; clearInterval(timer); stream.getTracks().forEach(t => t.stop()) }
  const limit = setTimeout(() => { end(); stoppedCb?.() }, seconds * 1000)
  stream.getVideoTracks()[0]?.addEventListener('ended', () => { end(); stoppedCb?.() })
  return {
    audioOk: at.length > 0,
    audioError: at.length > 0 ? undefined : 'tab_audio_not_shared',
    onStopped: f => { stoppedCb = f },
    async stop() {
      clearTimeout(limit)
      if (rec && rec.state !== 'inactive') { await new Promise(res => { rec.onstop = res; rec.stop() }) }
      end()
      let sound: Grabbed['sound'] = null
      if (chunks.length) {
        try { const buf = await audio().decodeAudioData(await new Blob(chunks).arrayBuffer()); sound = { x: buf.getChannelData(0).slice(), sr: buf.sampleRate } } catch { /* no sound */ }
      }
      return { pieces: st.finish(), frames: st.frames, scrolled: st.scrolled, sound, strips: st.strips, timelines: st.timelines, views: st.views }
    },
  }
}

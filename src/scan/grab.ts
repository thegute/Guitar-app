// Step 2 of a link scan: KGuitar plays the video itself and grabs its own screen (pictures a few times a second) plus
// the sound playing inside the phone (Android 10+), with Android's permission each time (ScreenGrabPlugin.java).
// On the web it's the browser's screen sharing (Chrome: pick this tab and tick "Share tab audio").
// Frames go through the Stitcher one by one, so a long grab never fills the memory.
import type { Gray } from './image'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { Stitcher, loadPicture, type Piece } from './pictures'
import { audio } from '../audio/engine'

interface GrabNative {
  available(): Promise<{ ok: boolean; sound: boolean }>
  start(o: { fps: number; seconds: number; sound: boolean }): Promise<{ ok: boolean; error?: string }>
  stop(): Promise<{ frames: string[]; sound?: string; width?: number; height?: number; fps?: number }>
  addListener(e: 'stopped', f: () => void): Promise<{ remove: () => void }>
}
const native = registerPlugin<GrabNative>('ScreenGrab')
const onPhone = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

export const canGrab = () => onPhone() || (typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia)

export interface Grabbed { pieces: Piece[]; frames: number; scrolled: boolean; sound: { x: Float32Array; sr: number } | null; strips?: Gray[] }
export interface GrabSession {
  /** stop and work through what was grabbed */
  stop(onProgress?: (f: number) => void): Promise<Grabbed>
  /** told if it stops by itself (time up, or stopped from Android's notification / the browser's bar) */
  onStopped(f: () => void): void
}

export async function startGrab(o: { fps?: number; seconds: number }): Promise<GrabSession> {
  const fps = o.fps ?? 2
  return onPhone() ? startNative(fps, o.seconds) : startWeb(fps, o.seconds)
}

async function startNative(fps: number, seconds: number): Promise<GrabSession> {
  let stoppedCb: (() => void) | null = null
  const sub = await native.addListener('stopped', () => stoppedCb?.())
  const r = await native.start({ fps, seconds, sound: true })
  if (!r.ok) { sub.remove(); throw new Error(r.error === 'refused' ? 'Screen capture was not allowed.' : `Screen capture couldn't start (${r.error ?? 'unknown'}).`) }
  return {
    onStopped: f => { stoppedCb = f },
    async stop(onProgress) {
      sub.remove()
      const got = await native.stop()
      const st = new Stitcher()
      for (const [i, path] of got.frames.entries()) {
        try { st.add(await loadPicture(Capacitor.convertFileSrc(path))) } catch { /* a frame that didn't save */ }
        onProgress?.((i + 1) / got.frames.length)
        if (i % 4 === 3) await new Promise(res => setTimeout(res, 0)) // let the screen update
      }
      let sound: Grabbed['sound'] = null
      if (got.sound) {
        try {
          const buf = await audio().decodeAudioData(await (await fetch(Capacitor.convertFileSrc(got.sound))).arrayBuffer())
          sound = { x: buf.getChannelData(0).slice(), sr: buf.sampleRate }
        } catch { /* no sound */ }
      }
      return { pieces: st.finish(), frames: st.frames, scrolled: st.scrolled, sound, strips: st.strips }
    },
  }
}

async function startWeb(fps: number, seconds: number): Promise<GrabSession> {
  const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia(o: unknown): Promise<MediaStream> }
  let stream: MediaStream
  try {
    stream = await md.getDisplayMedia({ video: { frameRate: fps }, audio: true, preferCurrentTab: true, selfBrowserSurface: 'include' })
  } catch { throw new Error('Screen sharing was not allowed.') }
  const v = document.createElement('video')
  v.muted = true; v.playsInline = true; v.srcObject = stream
  await v.play().catch(() => {})
  const st = new Stitcher()
  let busy = false
  const timer = setInterval(() => { if (busy || !v.videoWidth) return; busy = true; try { st.add(v) } finally { busy = false } }, 1000 / fps)
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
    onStopped: f => { stoppedCb = f },
    async stop() {
      clearTimeout(limit)
      if (rec && rec.state !== 'inactive') { await new Promise(res => { rec.onstop = res; rec.stop() }) }
      end()
      let sound: Grabbed['sound'] = null
      if (chunks.length) {
        try { const buf = await audio().decodeAudioData(await new Blob(chunks).arrayBuffer()); sound = { x: buf.getChannelData(0).slice(), sr: buf.sampleRate } } catch { /* no sound */ }
      }
      return { pieces: st.finish(), frames: st.frames, scrolled: st.scrolled, sound, strips: st.strips }
    },
  }
}

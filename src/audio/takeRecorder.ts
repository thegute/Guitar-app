// "Record yourself" in Play: records what the mic (or USB amp) hears while you play, so you can listen back.
// Only on a tap of Record, only on the phone; nothing is processed, monitored or sent anywhere.
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { openInput } from './input'

const TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']

export class TakeRecorder {
  private rec: MediaRecorder | null = null
  private own: MediaStream | null = null
  private chunks: Blob[] = []
  startedAt = 0

  get recording() { return !!this.rec && this.rec.state === 'recording' }

  /** Start recording; uses the stream Listen already has open, or opens the chosen input. */
  async start(shared?: MediaStream | null) {
    let stream = shared ?? null
    if (!stream) { this.own = (await openInput()).stream; stream = this.own }
    const type = typeof MediaRecorder !== 'undefined' ? TYPES.find(t => MediaRecorder.isTypeSupported?.(t)) : undefined
    this.chunks = []
    this.rec = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 128000 } : undefined)
    this.rec.ondataavailable = e => { if (e.data.size) this.chunks.push(e.data) }
    this.rec.start(500)
    this.startedAt = Date.now()
  }

  /** Stop and hand back the recording. */
  stop(): Promise<{ blob: Blob; seconds: number } | null> {
    const rec = this.rec
    if (!rec) return Promise.resolve(null)
    const seconds = (Date.now() - this.startedAt) / 1000
    return new Promise(res => {
      rec.onstop = () => {
        this.own?.getTracks().forEach(t => t.stop())
        this.own = null
        this.rec = null
        res(this.chunks.length ? { blob: new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' }), seconds } : null)
      }
      try { rec.stop() } catch { res(null) }
    })
  }
}

/** Save a take: the share sheet on Android (pick Drive, Files…), a download on the web. */
export async function saveTake(blob: Blob, title: string) {
  const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
  const d = new Date()
  const name = `${title.replace(/[^\w -]+/g, '').trim().slice(0, 40) || 'Take'} ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.${ext}`
  if (Capacitor.isNativePlatform()) {
    const data = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] ?? ''); r.onerror = rej; r.readAsDataURL(blob) })
    const w = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache })
    await Share.share({ title: name, files: [w.uri], dialogTitle: 'Save your take' })
    return name
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  return name
}

// The Riff Scanner's two big music models, downloaded once (from where their converter publishes them, pinned to one
// exact version and checked against its SHA-256) and run on the phone:
//   notes  Riley et al. guitar transcription (GAPS checkpoint, Kong et al. model), MIT; trained on recordings that are
//          for non-commercial use only, which is why KGuitar never ships or re-hosts it: the phone downloads it itself
//   beats  Beat This! (Foscarin et al., JKU), MIT
//   voice  HT-Demucs v4 (Meta, MIT), its inner network as converted by the WebNN project (MIT): voice isolation
// On the phone they run natively (ONNX Runtime for Android on several cores, MlPlugin.java); in a browser through
// onnxruntime-web (WebGPU when there is one, else WebAssembly), kept in the browser's cache.
import { Capacitor, registerPlugin } from '@capacitor/core'
import { NOTE, type NoteOut } from './post'

export interface ModelFile { name: string; url: string; bytes: number; sha256: string }
export type ModelId = 'notes' | 'beats' | 'voice'
const VOICE = 'https://huggingface.co/webnn/stem-separator/resolve/b56f9e66ceffca2401f83d2469dadaddd06e4994/onnx/'
const HF = 'https://huggingface.co/baroned/musicnote-ondevice-models/resolve/fb6a270d0492862389958c898d7def780ad6ccff/'
export const MODELS: Record<ModelId, { label: string; main: string; files: ModelFile[] }> = {
  notes: {
    label: 'Guitar notes',
    main: 'guitar_crnn.onnx',
    files: [
      { name: 'guitar_crnn.onnx', url: HF + 'guitar_crnn.onnx', bytes: 980468, sha256: '8c3d54228e834e7ee72ea04c43babb106cc0bd9f1ca7315a1e6c46b67d43ae14' },
      { name: 'guitar_crnn.onnx.data', url: HF + 'guitar_crnn.onnx.data', bytes: 98705408, sha256: 'a9eb1e2b466230102b1ada67ea7b13da5644d4aec213475899ecc9deac8ce484' },
    ],
  },
  beats: {
    label: 'Beats and tempo',
    main: 'beat_this.onnx',
    files: [{ name: 'beat_this.onnx', url: HF + 'beat_this.onnx', bytes: 83106043, sha256: '66f856129d70b3540aeef9b9cdf0fd7f96d24fd676810f110a7547ec332a511a' }],
  },
  voice: {
    label: 'Voice isolation',
    main: 'htdemucs_fwd.onnx',
    files: [
      { name: 'htdemucs_fwd.onnx', url: VOICE + 'htdemucs_fwd.onnx', bytes: 2385507, sha256: '555f511fb653348a1c9495ab6b6091767d1920798f3fba68629a1fe5b135a45f' },
      { name: 'htdemucs_fwd.onnx.data', url: VOICE + 'htdemucs_fwd.onnx.data', bytes: 168361984, sha256: '23a7c68669c041363caaef94641e961dc8c4e16b9891cb87f58f0e199a5e8820' },
    ],
  },
}
export const totalMB = (ids: ModelId[] = ['notes', 'beats']) => Math.round(ids.reduce((t, id) => t + MODELS[id].files.reduce((a, f) => a + f.bytes, 0), 0) / 1e6)

interface MlNative {
  status(o: { files: ModelFile[] }): Promise<{ have: string[] }>
  download(o: { files: ModelFile[] }): Promise<{ ok: boolean; error?: string }>
  cancelDownload(): Promise<void>
  remove(): Promise<void>
  load(o: { id: string; file: string }): Promise<{ ok: boolean; error?: string }>
  unload(o: { id: string }): Promise<void>
  runNotes(o: { id: string; data: string }): Promise<{ onset: string; offset: string; frame: string; velocity: string; ms: number }>
  runBeats(o: { id: string; data: string; frames: number }): Promise<{ beat: string; downbeat: string; ms: number }>
  runStems(o: { id: string; x: string; xt: string }): Promise<{ x: string; xt: string; ms: number }>
  addListener(e: 'progress', f: (p: { done: number; total: number }) => void): Promise<{ remove: () => void }>
}
const native = registerPlugin<MlNative>('Ml')
const onPhone = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

// ---------- base64 <-> numbers ----------
function b64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
function unb64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
const f32ToB64 = (x: Float32Array) => b64(new Uint8Array(x.buffer, x.byteOffset, x.byteLength))
const b64ToF32 = (s: string) => { const b = unb64(s); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4) }
/** IEEE half floats (little-endian) → float32 */
export function halfToF32(u: Uint16Array): Float32Array {
  const f = new Float32Array(u.length)
  for (let i = 0; i < u.length; i++) {
    const h = u[i], s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, m = h & 0x3ff
    f[i] = e === 0 ? s * m * 2 ** -24 : e === 31 ? (m ? NaN : s * Infinity) : s * (1 + m / 1024) * 2 ** (e - 15)
  }
  return f
}
const b64HalfToF32 = (s: string) => { const b = unb64(s); return halfToF32(new Uint16Array(b.buffer, b.byteOffset, b.byteLength / 2)) }
const b64U16ToF32 = (s: string) => { const b = unb64(s); const u = new Uint16Array(b.buffer, b.byteOffset, b.byteLength / 2); const f = new Float32Array(u.length); for (let i = 0; i < u.length; i++) f[i] = u[i] / 65535; return f }

// ---------- web: the browser's cache ----------
const CACHE = 'kg-models-v1'
async function webHave(f: ModelFile): Promise<boolean> {
  try { const c = await caches.open(CACHE); const r = await c.match(f.url); return !!r && Number(r.headers.get('content-length') ?? f.bytes) === f.bytes } catch { return false }
}
async function sha256(buf: ArrayBuffer) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', buf))
  return [...d].map(x => x.toString(16).padStart(2, '0')).join('')
}
async function webDownload(files: ModelFile[], onProgress: (f: number) => void, signal?: AbortSignal) {
  const c = await caches.open(CACHE)
  const total = files.reduce((a, f) => a + f.bytes, 0)
  let done = 0
  for (const f of files) {
    if (await webHave(f)) { done += f.bytes; continue }
    const r = await fetch(f.url, { signal })
    if (!r.ok || !r.body) throw new Error(`Download failed (${r.status}).`)
    const reader = r.body.getReader()
    // written straight into one buffer of the known size (a 100 MB file never sits in memory twice)
    let buf = new Uint8Array(f.bytes)
    let got = 0
    for (;;) {
      const { done: end, value } = await reader.read()
      if (end) break
      if (got + value.length > buf.length) { const b = new Uint8Array(Math.max(buf.length * 1.25, got + value.length)); b.set(buf.subarray(0, got)); buf = b }
      buf.set(value, got); got += value.length; done += value.length
      onProgress(done / total)
    }
    if (got !== buf.length) buf = buf.slice(0, got)
    if ((await sha256(buf.buffer)) !== f.sha256) throw new Error('The download was damaged: try again.')
    await c.put(f.url, new Response(buf, { headers: { 'content-length': String(got), 'content-type': 'application/octet-stream' } }))
  }
}
async function webBytes(f: ModelFile): Promise<Uint8Array> {
  const c = await caches.open(CACHE)
  const r = await c.match(f.url)
  if (!r) throw new Error('missing')
  return new Uint8Array(await r.arrayBuffer())
}

// ---------- status / download / remove ----------
export async function haveModel(id: ModelId): Promise<boolean> {
  const files = MODELS[id].files
  if (onPhone()) { try { const r = await native.status({ files }); return files.every(f => r.have.includes(f.name)) } catch { return false } }
  if (typeof caches === 'undefined') return false
  for (const f of files) if (!(await webHave(f))) return false
  return true
}

/** Download models (skipping what's here). `onProgress` 0..1. */
export async function downloadModels(ids: ModelId[], onProgress: (f: number) => void, signal?: AbortSignal): Promise<void> {
  const files = ids.flatMap(id => MODELS[id].files)
  if (onPhone()) {
    const sub = await native.addListener('progress', p => onProgress(p.done / Math.max(1, p.total)))
    const stop = () => void native.cancelDownload()
    signal?.addEventListener('abort', stop, { once: true })
    try {
      const r = await native.download({ files })
      if (!r.ok) throw new Error(r.error === 'cancelled' ? 'Cancelled.' : r.error === 'checksum' ? 'The download was damaged: try again.' : `Download failed (${r.error}). Check the internet connection.`)
    } finally { sub.remove(); signal?.removeEventListener('abort', stop) }
    return
  }
  await webDownload(files, onProgress, signal)
}

export async function removeModels(): Promise<void> {
  closeAll()
  if (onPhone()) { await native.remove(); return }
  try { await caches.delete(CACHE) } catch { /* nothing */ }
}

// ---------- running ----------
export interface NoteRunner { run(chunk: Float32Array): Promise<NoteOut>; where: 'phone' | 'webgpu' | 'wasm' }
export interface BeatRunner { run(spect: Float32Array, frames: number): Promise<{ beat: Float32Array; downbeat: Float32Array }>; where: 'phone' | 'webgpu' | 'wasm' }

type Ort = typeof import('onnxruntime-web')
let ortP: Promise<Ort> | null = null
export async function ortWeb(): Promise<Ort> {
  ortP ??= import('onnxruntime-web').then(o => {
    // the WebAssembly files come from the CDN at exactly this version (they're big, and only the web needs them)
    o.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/'
    o.env.wasm.numThreads = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1
    return o
  })
  return ortP
}
type Sess = import('onnxruntime-web').InferenceSession
const webSessions = new Map<ModelId, { s: Sess; where: 'webgpu' | 'wasm' }>()
async function webSession(id: ModelId, only?: 'wasm'): Promise<{ s: Sess; where: 'webgpu' | 'wasm' }> {
  const have = webSessions.get(id)
  if (have && (!only || have.where === only)) return have
  if (have) { void have.s.release().catch(() => {}); webSessions.delete(id) }
  const ort = await ortWeb()
  const m = MODELS[id]
  const main = await webBytes(m.files.find(f => f.name === m.main)!)
  const extra = await Promise.all(m.files.filter(f => f.name !== m.main).map(async f => ({ path: f.name, data: await webBytes(f) })))
  const gpu = !only && typeof navigator !== 'undefined' && 'gpu' in navigator
  for (const ep of gpu ? (['webgpu', 'wasm'] as const) : (['wasm'] as const)) {
    try {
      const s = await ort.InferenceSession.create(main, { executionProviders: [ep], ...(extra.length ? { externalData: extra } : {}) })
      const v = { s, where: ep }
      webSessions.set(id, v)
      return v
    } catch (e) { if (ep === 'wasm') throw e }
  }
  throw new Error('no runtime')
}
const loaded = new Set<ModelId>()
function closeAll() {
  for (const id of loaded) void native.unload({ id }).catch(() => {})
  loaded.clear()
  for (const v of webSessions.values()) void v.s.release().catch(() => {})
  webSessions.clear()
}

export async function noteRunner(): Promise<NoteRunner> {
  if (onPhone()) {
    if (!loaded.has('notes')) { const r = await native.load({ id: 'notes', file: MODELS.notes.main }); if (!r.ok) throw new Error(r.error ?? 'load'); loaded.add('notes') }
    return {
      where: 'phone',
      async run(chunk) {
        const r = await native.runNotes({ id: 'notes', data: f32ToB64(chunk) })
        return { onset: b64U16ToF32(r.onset), offset: b64U16ToF32(r.offset), frame: b64U16ToF32(r.frame), velocity: b64U16ToF32(r.velocity) }
      },
    }
  }
  const { s, where } = await webSession('notes')
  const ort = await ortWeb()
  return {
    where,
    async run(chunk) {
      const r = await s.run({ waveform: new ort.Tensor('float32', chunk, [1, NOTE.chunk]) })
      const get = (k: string) => (r[k].data as Float32Array).slice()
      return { onset: get('reg_onset_output'), offset: get('reg_offset_output'), frame: get('frame_output'), velocity: get('velocity_output') }
    },
  }
}

export async function beatRunner(): Promise<BeatRunner> {
  if (onPhone()) {
    if (!loaded.has('beats')) { const r = await native.load({ id: 'beats', file: MODELS.beats.main }); if (!r.ok) throw new Error(r.error ?? 'load'); loaded.add('beats') }
    return {
      where: 'phone',
      async run(spect, frames) {
        const r = await native.runBeats({ id: 'beats', data: f32ToB64(spect), frames })
        return { beat: b64ToF32(r.beat), downbeat: b64ToF32(r.downbeat) }
      },
    }
  }
  const { s, where } = await webSession('beats')
  const ort = await ortWeb()
  return {
    where,
    async run(spect, frames) {
      const r = await s.run({ spect: new ort.Tensor('float32', spect, [1, frames, 128]) })
      return { beat: (r.beat.data as Float32Array).slice(), downbeat: (r.downbeat.data as Float32Array).slice() }
    },
  }
}

// ---------- voice isolation / stems: one 7.8 s segment, all four sources ----------
export interface VoiceRunner { where: 'phone' | 'webgpu' | 'wasm'; run(x: Float32Array, xt: Float32Array): Promise<{ x: Float32Array; xt: Float32Array }> }
export async function voiceRunner(): Promise<VoiceRunner> {
  if (onPhone()) {
    if (!loaded.has('voice')) { const r = await native.load({ id: 'voice', file: MODELS.voice.main }); if (!r.ok) throw new Error(r.error ?? 'load'); loaded.add('voice') }
    return {
      where: 'phone',
      async run(x, xt) {
        const r = await native.runStems({ id: 'voice', x: f32ToB64(x), xt: f32ToB64(xt) })
        return { x: b64HalfToF32(r.x), xt: b64HalfToF32(r.xt) }
      },
    }
  }
  let { s, where } = await webSession('voice')
  const ort = await ortWeb()
  const once = async (x: Float32Array, xt: Float32Array) => {
    const r = await s.run({ x: new ort.Tensor('float32', x, [1, 4, 2048, 336]), xt: new ort.Tensor('float32', xt, [1, 2, 343980]) })
    return { x: (r.x_out.data as Float32Array).slice(), xt: (r.xt_out.data as Float32Array).slice() }
  }
  const out: VoiceRunner = {
    where,
    async run(x, xt) {
      const r = await once(x, xt)
      // some graphics chips give NaN for parts of this network: then it runs on the processor instead
      if (where === 'webgpu' && r.xt.some((v, i) => i % 9973 === 0 && !Number.isFinite(v))) {
        ;({ s, where } = await webSession('voice', 'wasm'))
        out.where = where
        return once(x, xt)
      }
      return r
    },
  }
  return out
}

// ---------- the quick draft: Basic Pitch (Spotify, Apache 2.0, 230 KB, shipped with the app) ----------
let bpSess: Promise<Sess> | null = null
/** Basic Pitch's network through ONNX Runtime (about 100x faster than its TensorFlow.js build on a phone's CPU). */
export async function basicPitchRunner(): Promise<(win: Float32Array) => Promise<{ frames: Float32Array; onsets: Float32Array; contours: Float32Array }>> {
  const ort = await ortWeb()
  bpSess ??= ort.InferenceSession.create(`${import.meta.env.BASE_URL}models/basic-pitch/nmp.onnx`, { executionProviders: ['wasm'] })
  const s = await bpSess.catch(e => { bpSess = null; throw e })
  return async win => {
    const r = await s.run({ [s.inputNames[0]]: new ort.Tensor('float32', win, [1, win.length, 1]) })
    // the converted graph's outputs: :0 contours (264 bins), :1 notes (88), :2 onsets (88)
    const g = (k: string) => (r[`StatefulPartitionedCall:${k}`].data as Float32Array).slice()
    return { frames: g('1'), onsets: g('2'), contours: g('0') }
  }
}

let crnnSess: Promise<Sess> | null = null
/** The trained tab picture reader (tools/scanner-train → public/models/tab-crnn/tab_crnn.onnx, ~3 MB, in the app).
 *  Rejects when the app has no such model yet (the readers before it are used then). */
export async function tabCrnnRunner(): Promise<import('../scan/crnnRead').CrnnRun> {
  const ort = await ortWeb()
  crnnSess ??= ort.InferenceSession.create(`${import.meta.env.BASE_URL}models/tab-crnn/tab_crnn.onnx`, { executionProviders: ['wasm'] })
  const s = await crnnSess.catch(e => { crnnSess = null; throw e })
  return async (strip, W) => {
    const r = await s.run({ strip: new ort.Tensor('float32', strip, [1, 1, 160, W]) })
    const f = (k: string) => r[k].data as Float32Array
    return { T: W / 4, heat: f('heat'), off: f('off'), frets: f('frets'), dur: f('dur'), dots: f('dots'), tup: f('tup'), grace: f('grace'), stroke: f('stroke') }
  }
}

/** Let go of the models (they use a lot of memory) when the scanner is closed. */
export function releaseModels() { closeAll() }

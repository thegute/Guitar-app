// Sounds you recorded onto pads (Sample mode, a chopped riff, a bounce): kept on this phone in IndexedDB, with an
// AudioBuffer made once and reused. Like the looper's takes, they're audio, so they aren't in the settings backup.
import { audio } from '../audio/engine'

export interface PadSample { id: string; sr: number; data: Float32Array; at: number }
const DB = 'kg-pad-samples', STORE = 'samples'
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => { r.result.createObjectStore(STORE, { keyPath: 'id' }) }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db()
  return new Promise((res, rej) => { const r = fn(d.transaction(STORE, mode).objectStore(STORE)); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
}
const bufs = new Map<string, AudioBuffer>()
const waiting = new Map<string, Promise<AudioBuffer | null>>()

export async function saveSample(id: string, data: Float32Array, sr: number) {
  const ctx = audio()
  const buf = ctx.createBuffer(1, data.length, sr)
  buf.getChannelData(0).set(data)
  bufs.set(id, buf)
  try { await tx('readwrite', s => s.put({ id, sr, data, at: Date.now() } as PadSample)) } catch { /* storage full: still plays this session */ }
  return buf
}
/** The buffer now if it's loaded (for the audio thread's timing), else null and it starts loading. */
export function sampleNow(id: string): AudioBuffer | null {
  const b = bufs.get(id)
  if (b) return b
  void loadSampleBuf(id)
  return null
}
export function loadSampleBuf(id: string): Promise<AudioBuffer | null> {
  const b = bufs.get(id)
  if (b) return Promise.resolve(b)
  let p = waiting.get(id)
  if (!p) {
    p = tx<PadSample | undefined>('readonly', s => s.get(id) as IDBRequest<PadSample | undefined>).then(v => {
      if (!v) return null
      const buf = audio().createBuffer(1, v.data.length, v.sr)
      buf.getChannelData(0).set(v.data)
      bufs.set(id, buf)
      return buf
    }).catch(() => null)
    waiting.set(id, p)
  }
  return p
}
export async function deleteSample(id: string) { bufs.delete(id); try { await tx('readwrite', s => s.delete(id)) } catch { /* noop */ } }

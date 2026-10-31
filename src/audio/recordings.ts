// My recordings: takes you keep from Play (⏺ Record yourself), so you can hear how you've improved month to month.
// Stored on this phone (IndexedDB). They're audio files, so they're not in the settings backup: "Save a copy" exports one.
export interface Recording { id: string; title: string; at: number; seconds: number; blob: Blob; note?: string }
const DB = 'kg-recordings', STORE = 'takes'
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
export async function keepRecording(blob: Blob, title: string, seconds: number): Promise<Recording> {
  const r: Recording = { id: Math.random().toString(36).slice(2, 10), title, at: Date.now(), seconds, blob }
  await tx('readwrite', s => s.put(r))
  try { localStorage.setItem('kg:lastRecording', String(r.at)) } catch { /* noop */ }
  return r
}
export async function recordings(): Promise<Recording[]> {
  try { return (await tx<Recording[]>('readonly', s => s.getAll() as IDBRequest<Recording[]>)).sort((a, b) => b.at - a.at) } catch { return [] }
}
export const updateRecording = (r: Recording) => tx('readwrite', s => s.put(r))
export const deleteRecording = (id: string) => tx('readwrite', s => s.delete(id))

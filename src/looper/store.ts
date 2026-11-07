// The looper's recordings live in IndexedDB (room for long loops, never in the small settings storage); the session
// (tracks, lengths, faders, which take is in which part) is a small JSON in localStorage.
const DB = 'kg-looper', STORE = 'takes'
export interface StoredTake { id: string; sr: number; data: Float32Array; at: number }

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
  return new Promise((res, rej) => {
    const r = fn(d.transaction(STORE, mode).objectStore(STORE))
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
export const putTake = (t: StoredTake) => tx('readwrite', s => s.put(t)).catch(() => undefined)
export const getTake = (id: string) => tx<StoredTake | undefined>('readonly', s => s.get(id) as IDBRequest<StoredTake | undefined>).catch(() => undefined)
export const dropTake = (id: string) => tx('readwrite', s => s.delete(id)).catch(() => undefined)
export async function allTakeIds(): Promise<string[]> {
  try { return (await tx<IDBValidKey[]>('readonly', s => s.getAllKeys())) as string[] } catch { return [] }
}

const KEY = 'kg:looper'
export function loadSession<T>(): T | null {
  try { const s = localStorage.getItem(KEY); return s ? (JSON.parse(s) as T) : null } catch { return null }
}
export function saveSession(v: unknown) { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* storage full */ } }

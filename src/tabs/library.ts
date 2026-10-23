// Your saved songs: the tab, its YouTube link and your chord edits. Stored on the device (IndexedDB).
import type { Song } from './model'

export interface SongDoc {
  id: string
  title: string
  artist?: string
  source: 'gp' | 'text' | 'example'
  song: Song
  youtube?: string
  /** your chord edits, by bar index ('' = no chord) */
  chords?: Record<number, string>
  /** key you picked instead of the detected one */
  key?: { root: string; minor: boolean }
  track?: number
  /** where you left off */
  cursor?: number
  /** bars to practise over and over (inclusive) */
  loop?: { from: number; to: number }
  updated: number
}

const DB = 'kguitar'
const STORE = 'songs'
let dbp: Promise<IDBDatabase> | null = null
const memory = new Map<string, SongDoc>() // fallback when IndexedDB is unavailable

function db(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((res, rej) => {
      try {
        const r = indexedDB.open(DB, 1)
        r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' })
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      } catch (e) {
        rej(e)
      }
    })
  }
  return dbp
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db()
  return new Promise((res, rej) => {
    const r = fn(d.transaction(STORE, mode).objectStore(STORE))
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}

export async function listSongs(): Promise<SongDoc[]> {
  try {
    const all = await tx<SongDoc[]>('readonly', s => s.getAll())
    return all.sort((a, b) => b.updated - a.updated)
  } catch {
    return [...memory.values()].sort((a, b) => b.updated - a.updated)
  }
}
export async function getSong(id: string): Promise<SongDoc | undefined> {
  try {
    return await tx<SongDoc | undefined>('readonly', s => s.get(id))
  } catch {
    return memory.get(id)
  }
}
export async function saveSong(doc: SongDoc): Promise<void> {
  memory.set(doc.id, doc)
  try {
    await tx('readwrite', s => s.put(doc))
  } catch {
    /* kept in memory for this session */
  }
}
export async function deleteSong(id: string): Promise<void> {
  memory.delete(id)
  try {
    await tx('readwrite', s => s.delete(id))
  } catch {
    /* nothing stored */
  }
}

export function newId() {
  return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/** Accepts youtube.com/watch?v=, youtu.be/, /shorts/, /embed/, /live/ links or a bare video id. */
export function youtubeId(url: string): string | null {
  const u = url.trim()
  if (/^[\w-]{11}$/.test(u)) return u
  const m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/|music\.youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/.exec(u)
  return m ? m[1] : null
}
/** Start time from ?t=1m30s or &t=90 */
export function youtubeStart(url: string): number {
  const m = /[?&#](?:t|start)=([\dhms]+)/.exec(url)
  if (!m) return 0
  const v = m[1]
  if (/^\d+$/.test(v)) return parseInt(v, 10)
  const h = /(\d+)h/.exec(v), mi = /(\d+)m/.exec(v), s = /(\d+)s/.exec(v)
  return (h ? +h[1] * 3600 : 0) + (mi ? +mi[1] * 60 : 0) + (s ? +s[1] : 0)
}

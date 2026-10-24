// Your saved songs: the tab, its YouTube link and your chord edits. Stored on the device (IndexedDB).
import type { Song } from './model'
import type { InstrumentId } from '../instrument'

export interface SongDoc {
  id: string
  title: string
  artist?: string
  source: 'gp' | 'text' | 'chords' | 'example' | 'lesson' | 'jam' | 'songbook'
  /** which bank the song lives in: the instrument mode it was added in */
  inst?: InstrumentId
  song: Song
  youtube?: string
  /** your chord edits, by bar index ('' = no chord) */
  chords?: Record<number, string>
  /** key you picked instead of the detected one */
  key?: { root: string; minor: boolean }
  track?: number
  /** where you left off */
  cursor?: number
  /** a YouTube video lined up with the tab: video time of bar 1 and the recording's tempo */
  ytSync?: { offset: number; bpm: number }
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

/**
 * The instrument a song belongs to. Songs remember the mode they were added in; older songs (from before
 * the banks were split) are sorted by their strings: six = guitar, four tuned to A on top = tenor ukulele,
 * four tuned to E on top = baritone ukulele.
 */
export function docInstrument(doc: SongDoc): InstrumentId {
  if (doc.inst) return doc.inst
  const tracks = doc.song.tracks
  const pick = tracks[doc.track ?? 0] ?? tracks[0]
  if (!pick || pick.tuning.length >= 5) return 'guitar'
  if (pick.tuning.length === 4) {
    const top = Math.max(...pick.tuning)
    if (top % 12 === 9) return 'tenor'
    if (top % 12 === 4) return 'baritone'
  }
  return 'guitar'
}

/** Saved songs, newest first. Pass an instrument to get only that instrument's bank. */
export async function listSongs(inst?: InstrumentId): Promise<SongDoc[]> {
  let all: SongDoc[]
  try {
    all = await tx<SongDoc[]>('readonly', s => s.getAll())
  } catch {
    all = [...memory.values()]
  }
  return all.filter(d => !inst || docInstrument(d) === inst).sort((a, b) => b.updated - a.updated)
}
/** A built-in tab (example, songbook part) made fresh so fixes in a new build reach it, keeping what you added to
 *  your saved copy: video link and sync, chord edits, key, loop, track and where you left off. Saves and returns it. */
export async function refreshBuiltIn(fresh: SongDoc): Promise<SongDoc> {
  const old = await getSong(fresh.id)
  const doc: SongDoc = old
    ? { ...fresh, youtube: old.youtube, ytSync: old.ytSync, chords: old.chords, key: old.key, loop: old.loop, track: old.track, cursor: old.cursor }
    : fresh
  await saveSong(doc)
  return doc
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

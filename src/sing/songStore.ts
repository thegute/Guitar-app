// Personal Sing Songs library (IndexedDB for audio + cached stereo vocal/backing stems,
// localStorage for lightweight metadata: melody notes, chords, key shift, harmony mode,
// Timeline Coach Pins, and Paste / Tap-to-Sync Lyrics). Strictly on-device & private.
import type { HardSpot, MelodyNote, SongChord } from './vocalEngine'
import type { HarmonyMode } from './harmony'

export type CoachPinKind = 'breath' | 'head' | 'vowel' | 'belt' | 'custom'

export interface CoachPin {
  id: string
  /** timestamp in song seconds */
  t: number
  kind: CoachPinKind
  text: string
}

export interface SyncedLyricLine {
  id: string
  /** start time in seconds (null = not tapped/synced yet) */
  t: number | null
  text: string
}

export interface SingSongMeta {
  id: string
  title: string
  source: 'upload' | 'youtube'
  youtubeUrl?: string
  youtubeId?: string
  createdAt: number
  duration: number
  /** true once HT-Demucs vocal + backing split has been cached in IDB */
  stemsReady: boolean
  /** true once melody + chord analysis has completed */
  analyzed: boolean
  minMidi: number
  maxMidi: number
  tessituraLow: number
  tessituraHigh: number
  keyRoot: number
  keyMinor: boolean
  notes: MelodyNote[]
  hardSpots: HardSpot[]
  chords: SongChord[]
  /** user's saved settings for this song */
  shiftSemis: number
  harmonyMode: HarmonyMode
  speed: number
  pins: CoachPin[]
  lyrics: SyncedLyricLine[]
}

export interface SingSongAudio {
  id: string
  sr: number
  /** original stereo mix [L, R] */
  mixL: Float32Array
  mixR: Float32Array
  /** separated stereo backing (everything minus vocals) */
  backingL?: Float32Array
  backingR?: Float32Array
  /** separated stereo isolated vocal stem */
  vocalL?: Float32Array
  vocalR?: Float32Array
}

const META_KEY = 'kg:singSongs'
const DB_NAME = 'kg-sing-audio-v1'
const STORE = 'audio'

let metaCache: SingSongMeta[] | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(f => f())
}

export function onSingSongsChange(f: () => void) {
  listeners.add(f)
  return () => { listeners.delete(f) }
}

export function listSingSongs(): SingSongMeta[] {
  if (metaCache) return metaCache
  try {
    const raw = localStorage.getItem(META_KEY)
    metaCache = raw ? (JSON.parse(raw) as SingSongMeta[]) : []
  } catch {
    metaCache = []
  }
  return metaCache
}

function saveMetaList(list: SingSongMeta[]) {
  metaCache = list
  try { localStorage.setItem(META_KEY, JSON.stringify(list)) } catch { /* quota */ }
  emit()
}

export function upsertSingSong(song: SingSongMeta): SingSongMeta {
  const list = [...listSingSongs()]
  const idx = list.findIndex(s => s.id === song.id)
  if (idx >= 0) list[idx] = song
  else list.unshift(song)
  saveMetaList(list)
  return song
}

export function patchSingSong(id: string, patch: Partial<SingSongMeta>): SingSongMeta | null {
  const list = [...listSingSongs()]
  const idx = list.findIndex(s => s.id === id)
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch }
    saveMetaList(list)
    return list[idx]
  }
  const starter = makeBuiltInStarterSongs().find(s => s.id === id)
  if (!starter) return null
  const updated = { ...starter, ...patch }
  list.push(updated)
  saveMetaList(list)
  return updated
}

export async function deleteSingSong(id: string) {
  saveMetaList(listSingSongs().filter(s => s.id !== id))
  await deleteSongAudio(id).catch(() => {})
}

export function newSingId(): string {
  return `sing_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

/** Parse pasted plain-text lyrics into SyncedLyricLine entries (user's personal practice notes). */
export function parseLyricsText(raw: string): SyncedLyricLine[] {
  return raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map((text, i) => ({ id: `l_${i}_${Date.now().toString(36)}`, t: null, text }))
}

/** Built-in royalty-free vocal practice songs (public domain traditional folk melodies — zero copyright!) */
export function makeBuiltInStarterSongs(): SingSongMeta[] {
  // "Amazing Grace" (1779, public domain) melody in G major (comfortable baritone/tenor starter)
  const agNotes: MelodyNote[] = [
    { t0: 0.5, t1: 1.2, midi: 55, lyric: 'A-' },
    { t0: 1.2, t1: 2.6, midi: 60, lyric: 'ma-' },
    { t0: 2.6, t1: 3.1, midi: 64, lyric: 'zing' },
    { t0: 3.1, t1: 3.6, midi: 60, lyric: 'grace' },
    { t0: 3.6, t1: 4.9, midi: 64, lyric: 'how' },
    { t0: 4.9, t1: 5.7, midi: 62, lyric: 'sweet' },
    { t0: 5.7, t1: 7.0, midi: 60, lyric: 'the' },
    { t0: 7.0, t1: 7.8, midi: 57, lyric: 'sound' },
    { t0: 7.8, t1: 9.2, midi: 55, lyric: 'that' },
    { t0: 9.4, t1: 10.1, midi: 55, lyric: 'saved' },
    { t0: 10.1, t1: 11.4, midi: 60, lyric: 'a' },
    { t0: 11.4, t1: 11.9, midi: 64, lyric: 'wretch' },
    { t0: 11.9, t1: 12.4, midi: 60, lyric: 'like' },
    { t0: 12.4, t1: 14.4, midi: 67, lyric: 'me' },
  ]
  const agChords: SongChord[] = [
    { t0: 0, t1: 5.7, root: 0, minor: false, name: 'C' },
    { t0: 5.7, t1: 7.8, root: 5, minor: false, name: 'F' },
    { t0: 7.8, t1: 12.4, root: 0, minor: false, name: 'C' },
    { t0: 12.4, t1: 15.0, root: 7, minor: false, name: 'G' },
  ]
  // "Scarborough Fair" (traditional pre-1929 public domain) in D Dorian / Dm
  const sfNotes: MelodyNote[] = [
    { t0: 0.5, t1: 1.8, midi: 57, lyric: 'Are' },
    { t0: 1.8, t1: 2.5, midi: 57, lyric: 'you' },
    { t0: 2.5, t1: 3.7, midi: 64, lyric: 'go-' },
    { t0: 3.7, t1: 4.4, midi: 64, lyric: 'ing' },
    { t0: 4.4, t1: 5.0, midi: 59, lyric: 'to' },
    { t0: 5.0, t1: 5.6, midi: 61, lyric: 'Scar-' },
    { t0: 5.6, t1: 6.2, midi: 59, lyric: 'bo-' },
    { t0: 6.2, t1: 7.8, midi: 57, lyric: 'rough Fair?' },
    { t0: 8.2, t1: 9.0, midi: 64, lyric: 'Pars-' },
    { t0: 9.0, t1: 9.8, midi: 67, lyric: 'ley,' },
    { t0: 9.8, t1: 11.2, midi: 69, lyric: 'sage,' },
    { t0: 11.2, t1: 12.0, midi: 67, lyric: 'rose-' },
    { t0: 12.0, t1: 12.8, midi: 64, lyric: 'ma-' },
    { t0: 12.8, t1: 13.6, midi: 66, lyric: 'ry' },
    { t0: 13.6, t1: 14.3, midi: 62, lyric: 'and' },
    { t0: 14.3, t1: 16.0, midi: 64, lyric: 'thyme' },
  ]
  const sfChords: SongChord[] = [
    { t0: 0, t1: 4.4, root: 9, minor: true, name: 'Am' },
    { t0: 4.4, t1: 6.2, root: 7, minor: false, name: 'G' },
    { t0: 6.2, t1: 8.2, root: 9, minor: true, name: 'Am' },
    { t0: 8.2, t1: 11.2, root: 0, minor: false, name: 'C' },
    { t0: 11.2, t1: 13.6, root: 7, minor: false, name: 'G' },
    { t0: 13.6, t1: 16.5, root: 9, minor: true, name: 'Am' },
  ]
  return [
    {
      id: 'starter-amazing-grace',
      title: 'Amazing Grace (Practice Starter)',
      source: 'upload',
      createdAt: 1,
      duration: 15.0,
      stemsReady: true,
      analyzed: true,
      minMidi: 55,
      maxMidi: 67,
      tessituraLow: 57,
      tessituraHigh: 64,
      keyRoot: 0,
      keyMinor: false,
      notes: agNotes,
      hardSpots: [{ label: 'High Peak (G4)', reason: 'high', t0: 10.5, t1: 14.6, peakMidi: 67 }],
      chords: agChords,
      shiftSemis: 0,
      harmonyMode: 'off',
      speed: 1,
      pins: [
        { id: 'p1', t: 0.2, kind: 'breath', text: 'Quiet low belly breath' },
        { id: 'p2', t: 11.8, kind: 'head', text: 'Lighten into mix on G4' },
      ],
      lyrics: [
        { id: 'ag1', t: 0.5, text: 'Amazing grace, how sweet the sound' },
        { id: 'ag2', t: 9.2, text: 'That saved a wretch like me' },
      ],
    },
    {
      id: 'starter-scarborough',
      title: 'Scarborough Fair (Harmony & Guitar Starter)',
      source: 'upload',
      createdAt: 2,
      duration: 16.5,
      stemsReady: true,
      analyzed: true,
      minMidi: 57,
      maxMidi: 69,
      tessituraLow: 57,
      tessituraHigh: 67,
      keyRoot: 9,
      keyMinor: true,
      notes: sfNotes,
      hardSpots: [
        { label: 'Big Leap (A3 → E4)', reason: 'leap', t0: 1.4, t1: 4.2, peakMidi: 64 },
        { label: 'High Peak (A4)', reason: 'high', t0: 8.2, t1: 12.2, peakMidi: 69 },
      ],
      chords: sfChords,
      shiftSemis: 0,
      harmonyMode: 'lower3',
      speed: 1,
      pins: [
        { id: 's1', t: 2.0, kind: 'vowel', text: 'Keep "go-ing" tall & open' },
        { id: 's2', t: 9.2, kind: 'head', text: 'Float light head voice on "sage"' },
      ],
      lyrics: [
        { id: 'sf1', t: 0.5, text: 'Are you going to Scarborough Fair?' },
        { id: 'sf2', t: 8.2, text: 'Parsley, sage, rosemary and thyme' },
      ],
    },
  ]
}

// ---------- IndexedDB binary audio storage ----------
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('No IndexedDB')); return }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveSongAudio(rec: SingSongAudio): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(rec)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadSongAudio(id: string): Promise<SingSongAudio | null> {
  try {
    const db = await openDb()
    return await new Promise<SingSongAudio | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(id)
      req.onsuccess = () => resolve((req.result as SingSongAudio | undefined) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function deleteSongAudio(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

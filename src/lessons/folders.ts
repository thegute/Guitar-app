// Your video lessons (phone app only): lesson folders you pick on the phone, read where they are. The native side is
// LessonFoldersPlugin.java (list and read files in a picked folder) and MediaWebViewClient.java (plays videos from
// it with seeking). Nothing is copied into the app or uploaded; this keeps a list of the files and your progress.
import { Capacitor, registerPlugin } from '@capacitor/core'

export interface LFile { path: string; name: string; mime: string; size: number; modified: number; uri: string }
interface Plugin {
  pick(): Promise<{ tree?: string; name?: string; cancelled?: boolean }>
  list(o: { tree: string }): Promise<{ files: LFile[] }>
  read(o: { uri: string }): Promise<{ data: string }>
  openExternal(o: { uri: string; mime: string }): Promise<void>
  forget(o: { tree: string }): Promise<void>
  granted(): Promise<{ trees: string[] }>
}
const native = registerPlugin<Plugin>('LessonFolders')
// browser tests stand in for the phone with window.__kgLessonsMock (the same methods, plus media(uri) → a URL)
type Mock = Plugin & { media?: (uri: string) => string }
const mock = () => (globalThis as unknown as { __kgLessonsMock?: Mock }).__kgLessonsMock
export const LessonFolders: Plugin = {
  pick: () => (mock() ?? native).pick(),
  list: o => (mock() ?? native).list(o),
  read: o => (mock() ?? native).read(o),
  openExternal: o => (mock() ?? native).openExternal(o),
  forget: o => (mock() ?? native).forget(o),
  granted: () => (mock() ?? native).granted(),
}

/** Only in the Android app: the web version never shows it. */
export const lessonsAvailable = () => !!mock() || (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android')

/** Where the app plays a lesson file from (answered on the phone by MediaWebViewClient). */
export const mediaUrl = (uri: string) => mock()?.media?.(uri) ?? `${location.origin}/_kg_media_/${encodeURIComponent(uri)}`

/** A lesson video as Play's video link (kept in the song's video field, like a YouTube link). */
export const LOCAL_PREFIX = 'kgvideo:'
export const localVideoLink = (f: { uri: string; name: string }) => `${LOCAL_PREFIX}${encodeURIComponent(f.uri)}|${encodeURIComponent(f.name)}`
export function parseLocalVideo(link?: string): { uri: string; name: string } | null {
  if (!link?.startsWith(LOCAL_PREFIX)) return null
  const [u, n] = link.slice(LOCAL_PREFIX.length).split('|')
  try { return { uri: decodeURIComponent(u), name: decodeURIComponent(n ?? '') } } catch { return null }
}

export interface Folder { tree: string; name: string; files: LFile[]; scanned: number }
const KEY = 'kg:lessonFolders'
export function savedFolders(): Folder[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Folder[] } catch { return [] }
}
export function saveFolders(f: Folder[]) {
  try { localStorage.setItem(KEY, JSON.stringify(f)) } catch { /* storage full: the list is rebuilt next time */ }
}

export type Kind = 'video' | 'gp' | 'text' | 'pdf' | 'image' | 'audio' | 'other'
export function kindOf(f: { name: string; mime: string }): Kind {
  const n = f.name.toLowerCase()
  if (/\.(mp4|m4v|mov|webm|mkv|avi)$/.test(n) || f.mime.startsWith('video/')) return 'video'
  if (/\.(gp|gp3|gp4|gp5|gpx)$/.test(n)) return 'gp'
  if (/\.(txt|tab|crd|chopro|cho)$/.test(n)) return 'text'
  if (/\.pdf$/.test(n) || f.mime === 'application/pdf') return 'pdf'
  if (/\.(png|jpe?g|webp|gif)$/.test(n) || f.mime.startsWith('image/')) return 'image'
  if (/\.(mp3|wav|m4a|ogg|flac)$/.test(n) || f.mime.startsWith('audio/')) return 'audio'
  return 'other'
}

/** "Lesson 10" after "Lesson 9": numbers inside names sort as numbers. */
export const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
/** A file name without its extension and with tidy spaces. */
const tidy = (s: string) => s.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()
export const niceName = (name: string) => tidy(name.replace(/\.[a-z0-9]{1,5}$/i, ''))

export interface Chapter { id: string; title: string; videos: LFile[]; tabs: LFile[]; other: LFile[] }
/** Group a folder's files into chapters (one per sub-folder), in natural order. */
export function chapters(files: LFile[]): Chapter[] {
  const by = new Map<string, LFile[]>()
  for (const f of files) {
    const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : ''
    by.set(dir, [...(by.get(dir) ?? []), f])
  }
  return [...by.entries()]
    .sort((a, b) => natural(a[0], b[0]))
    .map(([dir, fs]) => {
      const sorted = fs.slice().sort((a, b) => natural(a.name, b.name))
      return {
        id: dir || '.', title: dir ? dir.split('/').map(tidy).join(' › ') : 'Main folder',
        videos: sorted.filter(f => kindOf(f) === 'video'),
        tabs: sorted.filter(f => ['gp', 'text', 'pdf', 'image'].includes(kindOf(f))),
        other: sorted.filter(f => kindOf(f) === 'audio'),
      }
    })
    .filter(c => c.videos.length || c.tabs.length || c.other.length)
}

// ---- progress: where you stopped in each video, and which ones you've finished
export interface Watch { t: number; d?: number; done?: boolean; at?: number }
const PKEY = 'kg:lessonProgress'
export function progress(): Record<string, Watch> {
  try { return JSON.parse(localStorage.getItem(PKEY) ?? '{}') as Record<string, Watch> } catch { return {} }
}
export function setProgress(uri: string, w: Partial<Watch>) {
  const all = progress()
  all[uri] = { ...(all[uri] ?? { t: 0 }), ...w, at: Date.now() }
  try { localStorage.setItem(PKEY, JSON.stringify(all)) } catch { /* storage unavailable */ }
}

/** Base64 from the plugin → bytes. */
export function bytesOf(b64: string) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

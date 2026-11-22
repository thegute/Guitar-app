// "Send for review": a scan the owner flags (what went wrong, in his words) is kept on the phone with everything needed to
// see the problem later: the pictures KGuitar read, the strips, the tab as first read and as he fixed it, the link and how
// it was read. Flag now, send later: all waiting scans go out as ONE file through the share sheet (Drive, email…), which
// Claude unpacks with tools/scan-review/unpack.cjs. Kept in IndexedDB `kg-scan-reviews` (pictures are too big for
// localStorage); never in backups.
import type { Song } from '../tabs/model'

export const PROBLEMS = ['Wrong fret numbers', 'Right number, wrong string', 'Notes missing', 'Extra notes', 'Out of order / repeated', 'Rhythm or timing off', "Didn't find the tab", 'Something else'] as const
export type Problem = typeof PROBLEMS[number]

export interface ScanReview {
  id: string
  at: number
  title: string
  /** the YouTube link or file name it came from */
  source?: string
  how: string
  instrument: string
  tuning: number[]
  problems: Problem[]
  note: string
  /** the tab as the scanner first read it, and as it is now (with the owner's fixes) */
  first: Song
  now: Song
  text?: string
  heard: boolean
  /** the pictures KGuitar read (notes point at them through src.p) and the stitched strips, as data URLs */
  sources: { url: string; w: number; h: number }[]
  strips: { url: string; w: number; h: number }[]
  barTimes?: Record<number, number>
  app: string
}

const DB = 'kg-scan-reviews', STORE = 'reviews'
const open = () => new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open(DB, 1)
  r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }) }
  r.onsuccess = () => res(r.result)
  r.onerror = () => rej(r.error)
})
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise<T>((res, rej) => {
    const t = db.transaction(STORE, mode)
    const q = fn(t.objectStore(STORE))
    t.oncomplete = () => { res(q.result); db.close() }
    t.onerror = () => { rej(t.error); db.close() }
  })
}

const listeners = new Set<() => void>()
export const onReviewsChange = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
const changed = () => listeners.forEach(f => f())

/** a blob: or http(s) picture as a data URL (blob URLs die with the page, so they're copied when the scan is flagged) */
export async function asDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url
  const b = await (await fetch(url)).blob()
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b) })
}

export async function addReview(r: Omit<ScanReview, 'id' | 'at' | 'app' | 'sources' | 'strips'> & { sources?: { url: string; w: number; h: number }[]; strips?: { url: string; w: number; h: number }[] }): Promise<ScanReview> {
  const pics = async (l?: { url: string; w: number; h: number }[]) => {
    const out: { url: string; w: number; h: number }[] = []
    for (const p of l ?? []) { try { out.push({ ...p, url: await asDataUrl(p.url) }) } catch { /* a picture that's gone */ } }
    return out
  }
  const rec: ScanReview = { ...r, id: `rv-${Date.now().toString(36)}`, at: Date.now(), app: 'KGuitar', sources: await pics(r.sources), strips: await pics(r.strips) }
  await tx('readwrite', s => s.put(rec))
  changed()
  return rec
}
export const listReviews = async (): Promise<ScanReview[]> => { try { return ((await tx('readonly', s => s.getAll())) as ScanReview[]).sort((a, b) => a.at - b.at) } catch { return [] } }
export async function clearReviews(ids?: string[]) {
  const all = ids ?? (await listReviews()).map(r => r.id)
  for (const id of all) await tx('readwrite', s => s.delete(id))
  changed()
}

/** every waiting review in one file, through the share sheet (phone) or a download (web) */
export async function sendReviews(): Promise<{ name: string; count: number; ids: string[] }> {
  const list = await listReviews()
  if (!list.length) return { name: '', count: 0, ids: [] }
  const d = new Date()
  const name = `KGuitar-scan-review-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}.json`
  const json = JSON.stringify({ app: 'KGuitar', kind: 'scan-review', version: 1, createdAt: Date.now(), reviews: list })
  const { Capacitor } = await import('@capacitor/core')
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const r = await Filesystem.writeFile({ path: name, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 })
    await Share.share({ title: 'KGuitar scans for review', files: [r.uri], dialogTitle: 'Send the scans for review (Drive, email…)' })
  } else {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url; a.download = name
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
  return { name, count: list.length, ids: list.map(r => r.id) }
}

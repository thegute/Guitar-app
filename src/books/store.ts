// The owner's own books, kept on his phone only: the private book pack (tools/make_book_pack.py: each book's title, author,
// contents and the text of every page) and, if he adds them, the PDFs themselves (to see real pages and read a tab into
// Play). IndexedDB "kg-books". Nothing here is in the repo or in backups; he re-imports the pack file if he needs to.
// Topic matching ("In your books") runs here against books/topics.ts.
import { BOOK_TOPICS, topicById } from './topics'

export type BookKind = 'theory' | 'fretboard' | 'technique' | 'improvising' | 'style' | 'licks' | 'songs'
export interface TocEntry { title: string; page: number; depth?: number }
export interface BookMeta { id: string; title: string; author?: string; kind: BookKind; main?: boolean; file: string; pages: number; toc: TocEntry[]; pdf?: boolean }
export interface BookHit { book: BookMeta; page: number; snippet: string; score: number; chapter?: string }
interface PackBook extends Omit<BookMeta, 'pdf'> { text: string[] }
interface Pack { format: 'kguitar-books'; version: number; made?: string; books: PackBook[] }

export const KIND_LABEL: Record<BookKind, string> = {
  theory: 'Theory', fretboard: 'Fretboard', technique: 'Technique', improvising: 'Improvising', style: 'Styles', licks: 'Licks', songs: 'Songs and tabs',
}
const DB = 'kg-books'
let dbp: Promise<IDBDatabase> | null = null
function db(): Promise<IDBDatabase> {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => {
      r.result.createObjectStore('meta', { keyPath: 'id' })
      r.result.createObjectStore('text') // id → string[] (one per page)
      r.result.createObjectStore('pdf') // id → Blob
      r.result.createObjectStore('topics') // topic id → { b: book id, p: page, s: score }[]
    }
    r.onsuccess = () => res(r.result)
    r.onerror = () => { dbp = null; rej(r.error) }
  })
  return dbp
}
function req<T>(r: IDBRequest<T>): Promise<T> { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) }) }
async function store(name: string, mode: IDBTransactionMode = 'readonly') { return (await db()).transaction(name, mode).objectStore(name) }

// a small copy of the shelf in memory (titles + contents) for synchronous lookups (search, links)
let shelf: BookMeta[] = []
const listeners = new Set<() => void>()
export const onBooks = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
const changed = () => listeners.forEach(f => f())
export const shelfNow = () => shelf

export async function listBooks(): Promise<BookMeta[]> {
  try {
    const all = await req((await store('meta')).getAll()) as BookMeta[]
    const order: BookKind[] = ['theory', 'fretboard', 'improvising', 'technique', 'style', 'licks', 'songs']
    shelf = all.sort((a, b) => Number(!!b.main) - Number(!!a.main) || order.indexOf(a.kind) - order.indexOf(b.kind) || a.title.localeCompare(b.title))
  } catch { shelf = [] }
  return shelf
}
void (typeof indexedDB !== 'undefined' ? listBooks() : Promise.resolve())

const pageCache = new Map<string, string[]>()
export async function bookText(id: string): Promise<string[]> {
  const c = pageCache.get(id)
  if (c) return c
  const t = (await req((await store('text')).get(id)) as string[] | undefined) ?? []
  pageCache.set(id, t)
  return t
}

/** Which pages cover which topic: counted matches of the topic's words, best pages first. */
function indexTopics(books: PackBook[]): Record<string, { b: string; p: number; s: number }[]> {
  const out: Record<string, { b: string; p: number; s: number }[]> = {}
  for (const t of BOOK_TOPICS) {
    const g = new RegExp(t.words.source, 'gi')
    const hits: { b: string; p: number; s: number }[] = []
    for (const b of books) b.text.forEach((tx, i) => {
      const n = (tx.match(g) ?? []).length
      if (n >= 2) hits.push({ b: b.id, p: i + 1, s: n + (b.main ? 2 : 0) + (b.kind === 'theory' || b.kind === 'fretboard' ? 1 : 0) })
    })
    out[t.id] = hits.sort((a, c) => c.s - a.s).slice(0, 60)
  }
  return out
}

/** Import (or replace) the book pack. Returns how many books. */
export async function importPack(text: string): Promise<number> {
  const pack = JSON.parse(text) as Pack
  if (pack.format !== 'kguitar-books' || !Array.isArray(pack.books)) throw new Error('That file isn\'t a KGuitar book pack.')
  const old = new Map((await listBooks()).map(b => [b.id, b]))
  const d = await db()
  const tx = d.transaction(['meta', 'text', 'topics'], 'readwrite')
  for (const b of pack.books) {
    const { text: pages, ...meta } = b
    tx.objectStore('meta').put({ ...meta, pdf: old.get(b.id)?.pdf ?? false } satisfies BookMeta)
    tx.objectStore('text').put(pages, b.id)
  }
  const topics = indexTopics(pack.books)
  for (const [k, v] of Object.entries(topics)) tx.objectStore('topics').put(v, k)
  await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })
  pageCache.clear()
  await listBooks()
  changed()
  return pack.books.length
}

const norm = (s: string) => s.toLowerCase().replace(/\.pdf$/, '').replace(/[-_]+/g, ' ').replace(/\(?z ?library[^)]*\)?|z lib\w*|1lib\w*|\bsk\b/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
/** The book a PDF file belongs to: by its file name (the pack remembers the name it was made from), then by title words. */
export function matchPdf(fileName: string, books = shelf): BookMeta | null {
  const f = norm(fileName).replace(/^[0-9a-f]{8} /, '')
  const exact = books.find(b => norm(b.file).replace(/^[0-9a-f]{8} /, '') === f)
  if (exact) return exact
  let best: { b: BookMeta; s: number } | null = null
  const fw = new Set(f.split(' ').filter(w => w.length > 2))
  for (const b of books) {
    const tw = norm(`${b.title} ${b.file}`).split(' ').filter(w => w.length > 2)
    const s = tw.filter(w => fw.has(w)).length / Math.max(3, fw.size)
    if (!best || s > best.s) best = { b, s }
  }
  return best && best.s >= 0.5 ? best.b : null
}
export async function addPdf(id: string, file: Blob) {
  const d = await db()
  const tx = d.transaction(['pdf', 'meta'], 'readwrite')
  tx.objectStore('pdf').put(file, id)
  const m = await req(tx.objectStore('meta').get(id)) as BookMeta | undefined
  if (m) tx.objectStore('meta').put({ ...m, pdf: true })
  await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })
  await listBooks(); changed()
}
export async function bookPdf(id: string): Promise<Uint8Array | null> {
  const b = await req((await store('pdf')).get(id)) as Blob | undefined
  return b ? new Uint8Array(await b.arrayBuffer()) : null
}
export async function removeBook(id: string) {
  const d = await db()
  const tx = d.transaction(['meta', 'text', 'pdf'], 'readwrite')
  for (const s of ['meta', 'text', 'pdf']) tx.objectStore(s).delete(id)
  await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })
  pageCache.delete(id); await listBooks(); changed()
}

/** The chapter a page sits in (from the book's contents). */
export function chapterOf(b: BookMeta, page: number): string | undefined {
  let at: TocEntry | undefined
  for (const t of b.toc) if (t.page <= page && (!at || t.page >= at.page)) at = t
  return at?.title
}
function snippet(text: string, words: RegExp, len = 220): string {
  const flat = text.replace(/\s+/g, ' ')
  const m = words.exec(flat)
  const at = m ? Math.max(0, m.index - 60) : 0
  return (at > 0 ? '…' : '') + flat.slice(at, at + len).trim() + (flat.length > at + len ? '…' : '')
}

/** Pages of his books about these topics (best first, at most `max`, a few per book so one book doesn't fill it). */
export async function topicPages(topicIds: string[], max = 6, perBook = 2): Promise<BookHit[]> {
  if (!shelf.length) await listBooks()
  if (!shelf.length) return []
  const st = await store('topics')
  const all: { b: string; p: number; s: number; t: string }[] = []
  for (const t of topicIds) for (const h of (await req(st.get(t)) as { b: string; p: number; s: number }[] | undefined) ?? []) all.push({ ...h, t })
  all.sort((a, b) => b.s - a.s)
  const per = new Map<string, number>(), seen = new Set<string>(), out: BookHit[] = []
  for (const h of all) {
    const k = `${h.b}:${h.p}`
    if (seen.has(k) || (per.get(h.b) ?? 0) >= perBook) continue
    const book = shelf.find(b => b.id === h.b)
    if (!book) continue
    seen.add(k); per.set(h.b, (per.get(h.b) ?? 0) + 1)
    const text = (await bookText(book.id))[h.p - 1] ?? ''
    out.push({ book, page: h.p, score: h.s, chapter: chapterOf(book, h.p), snippet: snippet(text, new RegExp((topicById(h.t)?.words ?? /./).source, 'i')) })
    if (out.length >= max) break
  }
  return out
}

/** Search every page of every book: pages with the most of the query's words (helper answers, search). */
export async function searchBooks(query: string, max = 5): Promise<BookHit[]> {
  if (!shelf.length) await listBooks()
  const words = query.toLowerCase().split(/[^a-z0-9#♭]+/).filter(w => w.length > 2 && !STOP.has(w))
  if (!words.length || !shelf.length) return []
  const res = words.map(w => new RegExp(`\\b${w.replace(/[#]/g, '\\$&')}`, 'gi'))
  const hits: BookHit[] = []
  for (const book of shelf) {
    const pages = await bookText(book.id)
    pages.forEach((t, i) => {
      let s = 0, kinds = 0
      for (const r of res) { const n = (t.match(r) ?? []).length; if (n) { s += Math.min(n, 6); kinds++ } }
      if (kinds >= Math.min(2, res.length)) hits.push({ book, page: i + 1, score: s * kinds + (book.main ? 3 : 0), snippet: '', chapter: undefined })
    })
  }
  hits.sort((a, b) => b.score - a.score)
  const out: BookHit[] = [], per = new Map<string, number>()
  for (const h of hits) {
    if ((per.get(h.book.id) ?? 0) >= 2) continue
    per.set(h.book.id, (per.get(h.book.id) ?? 0) + 1)
    const t = (await bookText(h.book.id))[h.page - 1] ?? ''
    out.push({ ...h, chapter: chapterOf(h.book, h.page), snippet: snippet(t, res[0], 320) })
    if (out.length >= max) break
  }
  return out
}
const STOP = new Set('the and for you your with that this how what why when can are does into from then than but not have has had was were will just about also more most some any all one two use using play playing guitar'.split(' '))

/** A book by (part of) its title, and the page of a chapter / section named in `where` (from its contents). */
export function findRef(title: string, where = ''): { book: BookMeta; page?: number } | null {
  const t = title.toLowerCase()
  const book = shelf.find(b => b.title.toLowerCase() === t) ?? shelf.find(b => b.title.toLowerCase().includes(t) || t.includes(b.title.toLowerCase()))
  if (!book) return null
  const w = where.toLowerCase()
  const num = /chapter\s+(\d+)/i.exec(where)?.[1]
  const step = /step\s+(\d+)/i.exec(where)?.[1]
  const entry = book.toc.find(e => num && new RegExp(`chapter\\s*${num}\\b`, 'i').test(e.title))
    ?? book.toc.find(e => step && new RegExp(`step\\s*${step}\\b`, 'i').test(e.title))
    ?? book.toc.find(e => w && e.title.length > 4 && w.includes(e.title.toLowerCase().replace(/^chapter\s+\d+\s*[:.]?\s*/, '')))
  return { book, page: entry?.page }
}

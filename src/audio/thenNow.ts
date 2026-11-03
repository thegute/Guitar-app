// Then vs now: Play quietly keeps two recordings of each song, on this phone only. Your first whole run of it
// ("then"), and later your best run once it's clearly better ("now", at least 10 points up). Side by side they
// let you hear progress you can't notice day to day. Switch it off in Play → Options; the takes are only audio
// you played, they're never sent anywhere, and Learn → My recordings lists and deletes them.
export interface AutoTake { id: string; songId: string; title: string; kind: 'first' | 'now'; at: number; score: number; speed: number; seconds: number; blob: Blob }
export interface ThenNowPair { songId: string; title: string; first: AutoTake; now?: AutoTake }

const DB = 'kg-thennow', STORE = 'takes'
const ON = 'kg:thenNow'
/** points better than the first try before a run counts as "now" */
export const BETTER_BY = 10

export function thenNowOn() { try { return localStorage.getItem(ON) !== 'false' } catch { return true } }
export function setThenNowOn(on: boolean) { try { localStorage.setItem(ON, String(on)) } catch { /* storage blocked */ } }

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
const get = (id: string) => tx<AutoTake | undefined>('readonly', s => s.get(id) as IDBRequest<AutoTake | undefined>)

/** What to do with a finished run's recording, given what's kept already (pure, for tests). */
export function decide(first: Pick<AutoTake, 'score'> | undefined, now: Pick<AutoTake, 'score'> | undefined, score: number): 'first' | 'now' | null {
  if (!first) return 'first'
  if (score < first.score + BETTER_BY) return null
  if (now && score < now.score) return null
  return 'now'
}

/** Offer a finished whole run's recording: kept as the first try, as "now", or dropped. */
export async function offerTake(songId: string, title: string, blob: Blob, seconds: number, score: number, speed: number): Promise<'first' | 'now' | null> {
  try {
    const first = await get(`${songId}:first`)
    const now = await get(`${songId}:now`)
    const kind = decide(first, now, score)
    if (!kind) return null
    const t: AutoTake = { id: `${songId}:${kind}`, songId, title, kind, at: Date.now(), score, speed, seconds, blob }
    await tx('readwrite', s => s.put(t))
    return kind
  } catch { return null }
}

/** Every song with a kept first try (and its "now" if there is one), the ones with both first. */
export async function thenNowPairs(): Promise<ThenNowPair[]> {
  let all: AutoTake[] = []
  try { all = await tx<AutoTake[]>('readonly', s => s.getAll() as IDBRequest<AutoTake[]>) } catch { return [] }
  const m = new Map<string, ThenNowPair>()
  for (const t of all) if (t.kind === 'first') m.set(t.songId, { songId: t.songId, title: t.title, first: t })
  for (const t of all) if (t.kind === 'now') { const p = m.get(t.songId); if (p) p.now = t }
  return [...m.values()].sort((a, b) => Number(!!b.now) - Number(!!a.now) || (b.now?.at ?? b.first.at) - (a.now?.at ?? a.first.at))
}
export async function thenNowFor(songId: string): Promise<ThenNowPair | null> {
  const first = await get(`${songId}:first`).catch(() => undefined)
  if (!first) return null
  return { songId, title: first.title, first, now: await get(`${songId}:now`).catch(() => undefined) }
}
export async function deleteThenNow(songId: string) {
  await tx('readwrite', s => s.delete(`${songId}:first`))
  await tx('readwrite', s => s.delete(`${songId}:now`))
}

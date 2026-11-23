// Phone ↔ Tablet Sync: smart-merges all KGuitar progress (Theory Course Levels 1–8, Circle mastery,
// video lesson ticks/pins/notes, streaks, drills, songs, scanned riffs, saved beats, sticky notes,
// bookmarks & presets) via a PRIVATE GitHub Gist under the owner's own GitHub account.
// Device-specific layouts (Phone vs Tablet window positions/sizes), local Android folder URIs,
// audio gear calibration, and API/sync tokens NEVER overwrite another device.
import { makeBackup, type Backup } from '../backup'
import { listSongs, saveSong, type SongDoc } from '../tabs/library'
import { mergeFretGameData, type FretGameData } from '../learn/fretboardGame'

export interface SyncConfig {
  token: string
  gistId: string
  auto: boolean
  deviceName: string
  lastSync: number | null
  lastError?: string
}

export interface SyncReport {
  songsMerged: number
  songsAdded: number
  keysMerged: number
  pulled: boolean
  pushed: boolean
  gistId: string
  at: number
}

const CFG_KEY = 'kg:sync:cfg'
const GIST_FILE = 'kguitar-sync.json'
const GIST_DESC = 'KGuitar private personal sync (auto-managed)'

/** Keys that stay local to each device (never uploaded or overwritten across Phone ↔ Tablet). */
export function isDeviceLocalKey(key: string): boolean {
  if (!key.startsWith('kg:')) return true
  if (key.startsWith('kg:sync:')) return true
  if (key === 'kg:lastBackup') return true
  // Screen-size & window layout preferences stay separate per device (Fold vs Tab S10+)
  if (
    key.startsWith('kg:win:') ||
    key.startsWith('kg:floatPlace:') ||
    key.startsWith('kg:fingerBox:') ||
    key.startsWith('kg:floatCards:') ||
    key === 'kg:navHidden' ||
    key === 'kg:studioCockpit' ||
    key === 'kg:ckSplit' ||
    key === 'kg:fullScreen' ||
    key === 'kg:tabZoom' ||
    key === 'kg:lessonTabZoom' ||
    key === 'kg:lessonTabPicZoom' ||
    key === 'kg:scanPicZoom' ||
    key === 'kg:floatVideo' ||
    key === 'kg:arrange'
  ) return true
  // Device-specific Android folder URIs, audio gear/mic calibration, and private API keys
  if (
    key === 'kg:lessonFolders' ||
    key.startsWith('kg:mySounds') ||
    key.startsWith('kg:audio') ||
    key.startsWith('kg:gear') ||
    key.startsWith('kg:calib') ||
    key.startsWith('kg:mic') ||
    key.startsWith('kg:latency') ||
    key.startsWith('kg:input') ||
    key.startsWith('kg:rig') ||
    key === 'kg:geminiKey' ||
    key === 'kg:aiKey' ||
    key === 'kg:ytKey'
  ) return true
  return false
}

export function loadSyncConfig(): SyncConfig {
  const defName = typeof navigator !== 'undefined' && /Tab|SM-X|iPad/i.test(navigator.userAgent)
    ? 'Tablet'
    : typeof innerWidth === 'number' && innerWidth >= 700
      ? 'Tablet / Fold'
      : 'Phone'
  try {
    const raw = JSON.parse(localStorage.getItem(CFG_KEY) ?? 'null') as Partial<SyncConfig> | null
    if (raw && typeof raw === 'object') {
      return {
        token: typeof raw.token === 'string' ? raw.token : '',
        gistId: typeof raw.gistId === 'string' ? raw.gistId : '',
        auto: raw.auto !== false,
        deviceName: typeof raw.deviceName === 'string' && raw.deviceName ? raw.deviceName : defName,
        lastSync: typeof raw.lastSync === 'number' ? raw.lastSync : null,
        lastError: typeof raw.lastError === 'string' ? raw.lastError : undefined,
      }
    }
  } catch { /* default */ }
  return { token: '', gistId: '', auto: true, deviceName: defName, lastSync: null }
}

export function saveSyncConfig(patch: Partial<SyncConfig>): SyncConfig {
  const next = { ...loadSyncConfig(), ...patch }
  try { localStorage.setItem(CFG_KEY, JSON.stringify(next)) } catch { /* full */ }
  return next
}

function parseJson<T>(s: string | undefined, fallback: T): T {
  if (!s) return fallback
  try { return JSON.parse(s) as T } catch { return fallback }
}

const STRING_SET_KEYS = new Set([
  'kg:lessonsRead', 'kg:techDone', 'kg:circleDone', 'kg:favorites', 'kg:songFavs',
  'kg:exFavs', 'kg:lickFavs', 'kg:bookFavs',
])
const MAX_NUMBER_MAP_KEYS = new Set([
  'kg:circleMastery', 'kg:cagedWarmupDone', 'kg:changesBest', 'kg:targetBest', 'kg:fillsBest', 'kg:exBest', 'kg:stars',
])

function mergeStringSet(aRaw: string | undefined, bRaw: string | undefined): string {
  const a = parseJson<unknown[]>(aRaw, []).filter((x): x is string => typeof x === 'string')
  const b = parseJson<unknown[]>(bRaw, []).filter((x): x is string => typeof x === 'string')
  return JSON.stringify([...new Set([...a, ...b])])
}

function mergeMaxMap(aRaw: string | undefined, bRaw: string | undefined): string {
  const a = parseJson<Record<string, number>>(aRaw, {})
  const b = parseJson<Record<string, number>>(bRaw, {})
  const out: Record<string, number> = { ...a }
  for (const [k, v] of Object.entries(b)) {
    if (typeof v === 'number') out[k] = typeof out[k] === 'number' ? Math.max(out[k], v) : v
  }
  return JSON.stringify(out)
}

function mergeCourse(aRaw: string | undefined, bRaw: string | undefined): string {
  type LP = { steps?: string[]; at?: number; done?: number; reviews?: number[] }
  const a = parseJson<Record<string, LP>>(aRaw, {})
  const b = parseJson<Record<string, LP>>(bRaw, {})
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  const out: Record<string, LP> = {}
  for (const id of keys) {
    const la = a[id] ?? {}, lb = b[id] ?? {}
    const steps = [...new Set([...(la.steps ?? []), ...(lb.steps ?? [])])]
    const reviews = [...new Set([...(la.reviews ?? []), ...(lb.reviews ?? [])])].sort((x, y) => x - y)
    const done = la.done && lb.done ? Math.min(la.done, lb.done) : (la.done ?? lb.done)
    const at = typeof la.at === 'number' && typeof lb.at === 'number' ? Math.max(la.at, lb.at) : (la.at ?? lb.at)
    out[id] = { steps, reviews, ...(at !== undefined ? { at } : {}), ...(done !== undefined ? { done } : {}) }
  }
  return JSON.stringify(out)
}

function mergePracticeLog(aRaw: string | undefined, bRaw: string | undefined): string {
  type Day = {
    guitar?: number
    study?: number
    by?: Record<string, number>
    answers?: number
    correct?: number
    done?: string[]
    away?: boolean
    xp?: number
    counts?: Record<string, number>
    frozen?: boolean
    uke?: boolean
  }
  const a = parseJson<Record<string, Day>>(aRaw, {})
  const b = parseJson<Record<string, Day>>(bRaw, {})
  const days = new Set([...Object.keys(a), ...Object.keys(b)])
  const out: Record<string, Day> = {}
  for (const day of days) {
    const da = a[day] && typeof a[day] === 'object' ? a[day] : {}
    const db = b[day] && typeof b[day] === 'object' ? b[day] : {}
    const by: Record<string, number> = {}
    for (const src of [da.by, db.by]) {
      if (!src || typeof src !== 'object') continue
      for (const [k, v] of Object.entries(src)) {
        if (typeof v === 'number' && Number.isFinite(v)) by[k] = Math.max(by[k] ?? 0, v)
      }
    }
    const counts: Record<string, number> = {}
    for (const src of [da.counts, db.counts]) {
      if (!src || typeof src !== 'object') continue
      for (const [k, v] of Object.entries(src)) {
        if (typeof v === 'number' && Number.isFinite(v)) counts[k] = Math.max(counts[k] ?? 0, v)
      }
    }
    const done = [...new Set([
      ...(Array.isArray(da.done) ? da.done.filter((x): x is string => typeof x === 'string') : []),
      ...(Array.isArray(db.done) ? db.done.filter((x): x is string => typeof x === 'string') : []),
    ])]
    const xp = Math.max(
      typeof da.xp === 'number' && Number.isFinite(da.xp) ? da.xp : 0,
      typeof db.xp === 'number' && Number.isFinite(db.xp) ? db.xp : 0,
    )
    const entry: Day = {
      guitar: Math.max(typeof da.guitar === 'number' ? da.guitar : 0, typeof db.guitar === 'number' ? db.guitar : 0),
      study: Math.max(typeof da.study === 'number' ? da.study : 0, typeof db.study === 'number' ? db.study : 0),
      by,
      answers: Math.max(typeof da.answers === 'number' ? da.answers : 0, typeof db.answers === 'number' ? db.answers : 0),
      correct: Math.max(typeof da.correct === 'number' ? da.correct : 0, typeof db.correct === 'number' ? db.correct : 0),
      done,
    }
    if (da.away || db.away) entry.away = true
    if (xp > 0) entry.xp = xp
    if (Object.keys(counts).length) entry.counts = counts
    if (da.frozen || db.frozen) entry.frozen = true
    if (da.uke || db.uke) entry.uke = true
    out[day] = entry
  }
  return JSON.stringify(out)
}

function mergeZ2H(aRaw: string | undefined, bRaw: string | undefined, preferRemote: boolean): string {
  const a = parseJson<Record<string, unknown> & { ticks?: string[] }>(aRaw, {})
  const b = parseJson<Record<string, unknown> & { ticks?: string[] }>(bRaw, {})
  const base = preferRemote ? { ...a, ...b } : { ...b, ...a }
  const ticks = [...new Set([...(a.ticks ?? []), ...(b.ticks ?? [])])]
  return JSON.stringify({ ...base, ticks })
}

function mergeLessonProgress(aRaw: string | undefined, bRaw: string | undefined): string {
  type Watch = { pos?: number; dur?: number; done?: boolean; at?: number }
  const a = parseJson<Record<string, Watch>>(aRaw, {})
  const b = parseJson<Record<string, Watch>>(bRaw, {})
  const out: Record<string, Watch> = { ...a }
  for (const [k, w] of Object.entries(b)) {
    const cur = out[k]
    if (!cur) { out[k] = w; continue }
    const newer = (w.at ?? 0) > (cur.at ?? 0) ? w : cur
    out[k] = {
      ...newer,
      done: !!(cur.done || w.done),
      pos: Math.max(cur.pos ?? 0, w.pos ?? 0),
      dur: cur.dur || w.dur,
      at: Math.max(cur.at ?? 0, w.at ?? 0),
    }
  }
  return JSON.stringify(out)
}

function mergeStudioBeats(aRaw: string | undefined, bRaw: string | undefined, preferRemote: boolean): string {
  type B = { name?: string } & Record<string, unknown>
  const a = parseJson<B[]>(aRaw, [])
  const b = parseJson<B[]>(bRaw, [])
  const map = new Map<string, B>()
  const first = preferRemote ? a : b
  const second = preferRemote ? b : a
  for (const item of first) if (item?.name) map.set(item.name, item)
  for (const item of second) if (item?.name) map.set(item.name, item)
  return JSON.stringify([...map.values()].slice(-60))
}

function mergeTrends(aRaw: string | undefined, bRaw: string | undefined): string {
  type E = { t?: number; at?: number; id?: string } & Record<string, unknown>
  const a = parseJson<E[]>(aRaw, [])
  const b = parseJson<E[]>(bRaw, [])
  const seen = new Set<string>()
  const all: E[] = []
  for (const e of [...a, ...b]) {
    const sig = JSON.stringify(e)
    if (!seen.has(sig)) { seen.add(sig); all.push(e) }
  }
  all.sort((x, y) => ((x.t ?? x.at ?? 0) - (y.t ?? y.at ?? 0)))
  return JSON.stringify(all.slice(-2000))
}

function mergeObjectMap(aRaw: string | undefined, bRaw: string | undefined, preferRemote: boolean): string {
  const a = parseJson<Record<string, unknown>>(aRaw, {})
  const b = parseJson<Record<string, unknown>>(bRaw, {})
  return JSON.stringify(preferRemote ? { ...a, ...b } : { ...b, ...a })
}

function mergeByKeyList(aRaw: string | undefined, bRaw: string | undefined, keyFn: (x: Record<string, unknown>) => string): string {
  const a = parseJson<Record<string, unknown>[]>(aRaw, [])
  const b = parseJson<Record<string, unknown>[]>(bRaw, [])
  const map = new Map<string, Record<string, unknown>>()
  for (const x of [...a, ...b]) map.set(keyFn(x), x)
  return JSON.stringify([...map.values()])
}

/** Pure, idempotent smart-merge of two KGuitar snapshots (local + remote). Never wipes progress from either device. */
export function mergeBackups(local: Backup, remote: Backup): { merged: Backup; songsAdded: number; keysMerged: number } {
  const preferRemote = (remote.createdAt ?? 0) > (local.createdAt ?? 0)
  const storage: Record<string, string> = {}
  const allKeys = new Set([
    ...Object.keys(local.storage).filter(k => !isDeviceLocalKey(k)),
    ...Object.keys(remote.storage).filter(k => !isDeviceLocalKey(k)),
  ])

  for (const k of allKeys) {
    const lv = local.storage[k]
    const rv = remote.storage[k]
    if (lv === undefined) { storage[k] = rv; continue }
    if (rv === undefined) { storage[k] = lv; continue }
    if (lv === rv) { storage[k] = lv; continue }

    if (k === 'kg:course') storage[k] = mergeCourse(lv, rv)
    else if (k === 'kg:fretGame') storage[k] = JSON.stringify(mergeFretGameData(parseJson<Partial<FretGameData>>(lv, {}), parseJson<Partial<FretGameData>>(rv, {})))
    else if (STRING_SET_KEYS.has(k)) storage[k] = mergeStringSet(lv, rv)
    else if (MAX_NUMBER_MAP_KEYS.has(k)) storage[k] = mergeMaxMap(lv, rv)
    else if (k === 'kg:practiceLog') storage[k] = mergePracticeLog(lv, rv)
    else if (k === 'kg:z2h') storage[k] = mergeZ2H(lv, rv, preferRemote)
    else if (k === 'kg:lessonProgress') storage[k] = mergeLessonProgress(lv, rv)
    else if (k === 'kg:studioBeats') storage[k] = mergeStudioBeats(lv, rv, preferRemote)
    else if (k === 'kg:trends') storage[k] = mergeTrends(lv, rv)
    else if (k === 'kg:coursePins' || k === 'kg:courseNotes' || k === 'kg:exKeys' || k === 'kg:songFingers') storage[k] = mergeObjectMap(lv, rv, preferRemote)
    else if (k === 'kg:bookMarks') storage[k] = mergeByKeyList(lv, rv, x => `${String(x.bookId ?? '')}:${String(x.page ?? '')}`)
    else if (k === 'kg:floatPresets') storage[k] = mergeByKeyList(lv, rv, x => String(x.id ?? x.name ?? ''))
    else if (k.startsWith('kg:sticky:')) storage[k] = lv.length >= rv.length ? lv : rv
    else storage[k] = preferRemote ? rv : lv
  }

  // Merge songs by id (newest `updated` timestamp wins; songs unique to either device are preserved)
  const byId = new Map<string, SongDoc>()
  const localIds = new Set<string>()
  for (const s of local.songs) { byId.set(s.id, s); localIds.add(s.id) }
  let songsAdded = 0
  for (const s of remote.songs) {
    const cur = byId.get(s.id)
    if (!cur) { byId.set(s.id, s); songsAdded++ }
    else if ((s.updated ?? 0) > (cur.updated ?? 0)) byId.set(s.id, s)
  }

  const merged: Backup = {
    app: 'KGuitar',
    version: 1,
    createdAt: Math.max(Date.now(), local.createdAt ?? 0, remote.createdAt ?? 0),
    storage,
    songs: [...byId.values()],
  }
  return { merged, songsAdded, keysMerged: allKeys.size }
}

/** Build a syncable snapshot (strips device-local layout/gear/token keys so they never leave this device). */
export async function makeSyncSnapshot(): Promise<Backup> {
  const b = await makeBackup()
  const storage: Record<string, string> = {}
  for (const [k, v] of Object.entries(b.storage)) {
    if (!isDeviceLocalKey(k)) storage[k] = v
  }
  return { ...b, storage }
}

/** Apply a smart-merged snapshot onto this device (preserving device-local window layouts, gear & tokens!). */
export async function applyMergedBackup(remote: Backup): Promise<{ songsMerged: number; songsAdded: number; keysMerged: number }> {
  const local = await makeSyncSnapshot()
  const { merged, songsAdded, keysMerged } = mergeBackups(local, remote)
  for (const [k, v] of Object.entries(merged.storage)) {
    if (!isDeviceLocalKey(k)) try { localStorage.setItem(k, v) } catch { /* full */ }
  }
  const curSongs = new Map((await listSongs()).map(s => [s.id, s]))
  for (const s of merged.songs) {
    const have = curSongs.get(s.id)
    if (!have || (s.updated ?? 0) > (have.updated ?? 0)) await saveSong(s)
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('kg-course'))
    window.dispatchEvent(new Event('kg-synced'))
  }
  return { songsMerged: merged.songs.length, songsAdded, keysMerged }
}

// ───────────── Private GitHub Gist Transport ─────────────

async function ghFetch(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (res.status === 401) throw new Error('GitHub token rejected (check that it has the "gist" permission).')
  if (res.status === 403) throw new Error('GitHub denied access (make sure the token includes "gist" scope).')
  if (!res.ok) throw new Error(`GitHub sync error (${res.status}).`)
  return res.json() as Promise<Record<string, unknown>>
}

async function findExistingGist(token: string): Promise<string | null> {
  const res = await fetch('https://api.github.com/gists?per_page=50', {
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token.trim()}` },
  })
  if (!res.ok) return null
  const list = (await res.json()) as { id?: string; files?: Record<string, unknown> }[]
  const hit = list.find(g => g.files && GIST_FILE in g.files)
  return hit?.id ?? null
}

async function readGistBackup(token: string, gistId: string): Promise<Backup | null> {
  const g = await ghFetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, token)
  const files = g.files as Record<string, { content?: string; truncated?: boolean; raw_url?: string }> | undefined
  const f = files?.[GIST_FILE]
  if (!f) return null
  let text = f.content ?? ''
  if (f.truncated && f.raw_url) {
    const r = await fetch(f.raw_url)
    if (r.ok) text = await r.text()
  }
  try {
    const b = JSON.parse(text) as Backup
    return b?.app === 'KGuitar' && b.storage && Array.isArray(b.songs) ? b : null
  } catch {
    return null
  }
}

let inFlight: Promise<SyncReport> | null = null

/** Run a full two-way smart-merge sync with your private GitHub Gist. */
export function syncNow(): Promise<SyncReport> {
  if (inFlight) return inFlight
  inFlight = runSync().finally(() => { inFlight = null })
  return inFlight
}

async function runSync(): Promise<SyncReport> {
  const cfg = loadSyncConfig()
  const token = cfg.token.trim()
  if (!token) throw new Error('Add your GitHub token first.')

  const local = await makeSyncSnapshot()
  let gistId = cfg.gistId.trim()
  let remote: Backup | null = null

  if (!gistId) {
    const found = await findExistingGist(token)
    if (found) gistId = found
  }
  if (gistId) {
    try {
      remote = await readGistBackup(token, gistId)
    } catch {
      // Gist may have been deleted — search again before creating a fresh private one
      const found = await findExistingGist(token)
      if (found) { gistId = found; remote = await readGistBackup(token, gistId) }
      else gistId = ''
    }
  }

  let finalSnap = local
  let songsAdded = 0
  let keysMerged = Object.keys(local.storage).length
  const pulled = !!remote

  if (remote) {
    const res = mergeBackups(local, remote)
    finalSnap = res.merged
    songsAdded = res.songsAdded
    keysMerged = res.keysMerged
    // Persist merged state onto this device
    for (const [k, v] of Object.entries(finalSnap.storage)) {
      if (!isDeviceLocalKey(k)) try { localStorage.setItem(k, v) } catch { /* full */ }
    }
    const curSongs = new Map((await listSongs()).map(s => [s.id, s]))
    for (const s of finalSnap.songs) {
      const have = curSongs.get(s.id)
      if (!have || (s.updated ?? 0) > (have.updated ?? 0)) await saveSong(s)
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kg-course'))
      window.dispatchEvent(new Event('kg-synced'))
    }
  }

  const payload = JSON.stringify({
    description: GIST_DESC,
    public: false,
    files: { [GIST_FILE]: { content: JSON.stringify(finalSnap) } },
  })

  if (gistId) {
    await ghFetch(`https://api.github.com/gists/${encodeURIComponent(gistId)}`, token, { method: 'PATCH', body: payload })
  } else {
    const created = await ghFetch('https://api.github.com/gists', token, { method: 'POST', body: payload })
    gistId = String(created.id ?? '')
  }

  const at = Date.now()
  saveSyncConfig({ gistId, lastSync: at, lastError: undefined })
  return { songsMerged: finalSnap.songs.length, songsAdded, keysMerged, pulled, pushed: true, gistId, at }
}

/** Quiet background auto-sync on app open / resume (at most once every 3 minutes when connected). */
let lastAuto = 0
export function maybeAutoSync() {
  const cfg = loadSyncConfig()
  if (!cfg.token || !cfg.auto) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  const now = Date.now()
  if (now - lastAuto < 180_000) return
  lastAuto = now
  void syncNow().catch(e => {
    saveSyncConfig({ lastError: e instanceof Error ? e.message : 'Sync failed' })
  })
}

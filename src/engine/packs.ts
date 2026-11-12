// Sound packs at play time (Stage 3 step 2): load a pack, decode only the recordings a song needs (kept within a memory
// budget), and play notes the way a guitarist's hands would: the right string, the velocity layers crossfaded, a fresh
// round robin, the pack's own loudness evened out, and ONE note per string (a new note on a string lifts the finger off
// the old one: a 12 ms damping, like Orange Tree's monophonic strings), with the release recording when it has one.
// Built-in packs come from the app (public/packs/<id>/); private ones (rendered from the owner's plugins) from the phone,
// stored in IndexedDB 'kg-packs' (never in the repo or a backup).
import { audio, route } from '../audio/engine'
import { isPack, layersFor, normGain, RoundRobin, takeTrim, zoneFor, filesFor, stemsFor, stemPath, rateFor, type Articulation, type Pack } from './packLogic'
import { monoOut } from '../audio/rig'

// ---- where the files come from -------------------------------------------------------------------------------------
export interface PackSource { pack: Pack; read: (rel: string) => Promise<ArrayBuffer> }
const sources = new Map<string, PackSource>()

/** A pack shipped with the app (public/packs/<id>/pack.json). */
export async function loadBuiltInPack(id: string, base = `./packs/${id}/`): Promise<Pack> {
  if (sources.has(id)) return sources.get(id)!.pack
  const r = await fetch(base + 'pack.json')
  const pack = await r.json()
  if (!isPack(pack)) throw new Error(`${id}: not a KGuitar pack`)
  sources.set(pack.id, { pack, read: rel => fetch(base + rel).then(x => { if (!x.ok) throw new Error(rel); return x.arrayBuffer() }) })
  return pack
}

// private packs: IndexedDB kg-packs (files: `${packId}/${rel}` → Blob; packs: id → Pack)
function db(): Promise<IDBDatabase> {
  return new Promise((ok, no) => {
    const q = indexedDB.open('kg-packs', 1)
    q.onupgradeneeded = () => { q.result.createObjectStore('packs'); q.result.createObjectStore('files') }
    q.onsuccess = () => ok(q.result)
    q.onerror = () => no(q.error)
  })
}
async function idb<T>(store: string, mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const d = await db()
  return new Promise((ok, no) => {
    const tx = d.transaction(store, mode)
    const r = f(tx.objectStore(store))
    tx.oncomplete = () => ok(r ? (r as IDBRequest<T>).result : undefined)
    tx.onerror = () => no(tx.error)
  })
}
/** Import a pack from files the owner picked (a folder with pack.json and its audio). Returns the pack. */
export async function importPack(files: File[], onProgress?: (done: number, total: number) => void): Promise<Pack> {
  const meta = files.find(f => f.name === 'pack.json')
  if (!meta) throw new Error('No pack.json in that folder')
  const pack = JSON.parse(await meta.text())
  if (!isPack(pack)) throw new Error('That pack.json is not a KGuitar sound pack')
  const root = (meta.webkitRelativePath || meta.name).replace(/pack\.json$/, '')
  let done = 0
  for (const f of files) {
    if (f === meta) continue
    const rel = (f.webkitRelativePath || f.name).slice(root.length)
    await idb('files', 'readwrite', s => s.put(f, `${pack.id}/${rel}`))
    onProgress?.(++done, files.length - 1)
  }
  await idb('packs', 'readwrite', s => s.put(pack, pack.id))
  sources.delete(pack.id)
  return pack
}
export async function privatePacks(): Promise<Pack[]> {
  return (await idb<Pack[]>('packs', 'readonly', s => s.getAll() as IDBRequest<Pack[]>)) ?? []
}
export async function loadPrivatePack(id: string): Promise<Pack | null> {
  if (sources.has(id)) return sources.get(id)!.pack
  const pack = await idb<Pack>('packs', 'readonly', s => s.get(id) as IDBRequest<Pack>)
  if (!pack || !isPack(pack)) return null
  sources.set(id, { pack, read: async rel => { const b = await idb<Blob>('files', 'readonly', s => s.get(`${id}/${rel}`) as IDBRequest<Blob>); if (!b) throw new Error(rel); return b.arrayBuffer() } })
  return pack
}

// ---- decoded recordings, within a memory budget (least recently used go first) ------------------------------------
let budget = 384 * 1024 * 1024
let used = 0
const cache = new Map<string, { buf: AudioBuffer; bytes: number }>()
const pending = new Map<string, Promise<AudioBuffer | null>>()
export function setMemoryBudget(mb: number) { budget = mb * 1024 * 1024; evict() }
function evict() {
  for (const [k, v] of cache) { if (used <= budget) break; cache.delete(k); used -= v.bytes }
}
function touch(k: string) { const v = cache.get(k); if (v) { cache.delete(k); cache.set(k, v) } return v?.buf }
async function decode(packId: string, rel: string): Promise<AudioBuffer | null> {
  const k = `${packId}/${rel}`
  const hit = touch(k)
  if (hit) return hit
  if (pending.has(k)) return pending.get(k)!
  const p = (async () => {
    const src = sources.get(packId)
    if (!src) return null
    try {
      const buf = await audio().decodeAudioData(await src.read(rel))
      const bytes = buf.length * buf.numberOfChannels * 4
      cache.set(k, { buf, bytes }); used += bytes; evict()
      return buf
    } catch { return null } finally { pending.delete(k) }
  })()
  pending.set(k, p)
  return p
}
/** Decode what these notes need, before they're played (a song calls this as it opens). */
export async function ensure(packId: string, art: Articulation, notes: { midi: number; string?: number }[], onProgress?: (d: number, t: number) => void) {
  const src = sources.get(packId)
  if (!src) return
  const files = filesFor(src.pack, art, notes)
  let d = 0
  await Promise.all(files.map(f => decode(packId, f).then(() => onProgress?.(++d, files.length))))
}

// ---- playing -------------------------------------------------------------------------------------------------------
export interface PackHandle { stop: (at?: number) => void }
interface Voice { stop: (at: number, fast?: boolean) => void; end: number }
const rr = new RoundRobin()
/** one ringing note per string, per pack (the finger-lift rule) */
const strings = new Map<string, Voice>()

export interface PackNote {
  art?: Articulation
  midi: number
  /** 0 = lowest string (guitars); leave out for keys / drums */
  string?: number
  /** 1–127 */
  vel?: number
  when?: number
  /** seconds; leave out to let it ring until stopped or the next note on its string */
  dur?: number
  dest?: AudioNode
  pan?: number
  /** separate one-note-per-string groups (a double-tracked part's left and right takes) */
  group?: string
}
export const packLoaded = (id: string) => sources.has(id)
/** Remove a private pack and all its files from the phone. */
export async function deletePack(id: string) {
  const d = await db()
  await new Promise<void>((ok, no) => {
    const tx = d.transaction(['packs', 'files'], 'readwrite')
    tx.objectStore('packs').delete(id)
    const fs = tx.objectStore('files')
    fs.openCursor(IDBKeyRange.bound(`${id}/`, `${id}/\uffff`)).onsuccess = e => { const c = (e.target as IDBRequest<IDBCursorWithValue | null>).result; if (c) { c.delete(); c.continue() } }
    tx.oncomplete = () => ok(); tx.onerror = () => no(tx.error)
  })
  sources.delete(id)
  for (const k of [...cache.keys()]) if (k.startsWith(id + '/')) { used -= cache.get(k)!.bytes; cache.delete(k) }
}

/** Play a note from a pack. Returns null if the pack or its recording isn't ready (the caller can fall back). */
export function playPack(packId: string, n: PackNote): PackHandle | null {
  const src = sources.get(packId)
  if (!src) return null
  const art = n.art ?? 'sustain'
  const pick = zoneFor(src.pack, art, n.midi, n.string)
  if (!pick) return null
  const ctx = audio()
  const t = Math.max(n.when ?? ctx.currentTime, ctx.currentTime)
  const layers = layersFor(pick.zone, n.vel ?? 90)
  const out = n.dest ?? route('any', src.pack.kind === 'bass' ? 'bass' : src.pack.kind === 'drums' ? 'drums' : src.pack.kind === 'keys' ? 'keys' : 'guitar')
  const norm = normGain(src.pack)
  const parts: { s: AudioBufferSourceNode; g: GainNode }[] = []
  const stems = stemsFor(src.pack, monoOut())
  const vary = { cents: (Math.random() - 0.5) * 4, gain: Math.pow(10, ((Math.random() - 0.5) * 1.2) / 20) }
  for (const { layer, weight } of layers) {
    const k = rr.pick(`${packId}/${art}/${pick.zone.key}/${layer.velocity}`, layer.rr.length)
    // every mic stem of the same take starts on the same sample, so they add up like the real mics did
    for (const st of stems) {
      const file = stemPath(st, layer.rr[k])
      const buf = touch(`${packId}/${file}`)
      if (!buf) { void decode(packId, file); continue }
      const s = ctx.createBufferSource()
      s.buffer = buf
      // a layer with a single recording (Ample plays the same take every time) gets a tiny take-to-take variation, the
      // same for every mic stem of this note: ±2 cents and ±0.6 dB, so repeated notes don't sound machine-gunned
      const rate = rateFor(pick.shift, (layer.tune?.[k] ?? 0) + (layer.rr.length === 1 ? vary.cents : 0))
      if (rate !== 1) s.playbackRate.value = rate
      const g = ctx.createGain()
      g.gain.value = weight * norm * takeTrim(layer, k) * st.gain * (layer.rr.length === 1 ? vary.gain : 1)
      let node: AudioNode = s.connect(g)
      if (n.pan !== undefined && typeof ctx.createStereoPanner === 'function') { const p = ctx.createStereoPanner(); p.pan.value = n.pan; node = node.connect(p) }
      node.connect(out)
      s.start(t)
      parts.push({ s, g })
    }
  }
  if (!parts.length) return null
  if ((globalThis as { __kgTest?: boolean }).__kgTest) (globalThis as { __kgPackPlays?: number }).__kgPackPlays = ((globalThis as { __kgPackPlays?: number }).__kgPackPlays ?? 0) + 1
  const stopAt = (at: number, fast = false) => {
    // a finger lifted off the string: 12 ms; a let-go note: a natural 60 ms fade
    const tc = fast ? 0.004 : 0.02
    for (const { s, g } of parts) {
      try { g.gain.cancelScheduledValues(at); g.gain.setTargetAtTime(0, at, tc); s.stop(at + tc * 8) } catch { /* already stopped */ }
    }
  }
  const voice: Voice = { stop: stopAt, end: Infinity }
  if (n.string !== undefined) {
    const key = `${packId}:${n.group ?? ''}:${n.string}`
    const prev = strings.get(key)
    if (prev) prev.stop(t, true)
    strings.set(key, voice)
  }
  if (n.dur !== undefined) stopAt(t + n.dur)
  return { stop: (at?: number) => stopAt(Math.max(at ?? ctx.currentTime, t)) }
}

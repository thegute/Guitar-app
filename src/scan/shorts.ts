// The Shorts feed (Riff Scanner → Shorts): guitar Shorts to swipe through, scan and play along with.
//   source 1  YouTube Data API v3 with the owner's own key (kept on this phone only, "kgx:" so backups never copy it):
//             search.list (100 quota units each, so about 100 searches a day on the free 10,000) for Shorts tagged
//             #guitartabs plus one of his styles, then videos.list (1 unit) to keep only short, embeddable videos
//   source 2  no key / quota used up / an error: the channels he follows (their public upload feeds; on the phone)
// Then: guitar/tab words required, "djent"/"math rock" left out, his styles boosted, shuffled (Fisher–Yates), and no
// channel more than once in any 10 in a row.
import { Capacitor, CapacitorHttp } from '@capacitor/core'

export interface Short { id: string; title: string; channel: string; channelId: string; secs?: number; source: 'search' | 'channels'; style?: string }

const KEY = 'kgx:youtube'
export const youtubeKey = (): string => { try { return localStorage.getItem(KEY) ?? '' } catch { return '' } }
export function setYoutubeKey(k: string) { try { if (k.trim()) localStorage.setItem(KEY, k.trim()); else localStorage.removeItem(KEY) } catch { /* storage */ } }

/** His styles: what to search for, and words that mark a Short as one of them (boosted in the feed). */
export const SHORT_STYLES: { id: string; label: string; query: string; words: RegExp }[] = [
  { id: 'prog', label: 'Melodic prog', query: 'melodic prog guitar', words: /melodic (prog|metal)|prog metal|plini|intervals|tim henson|polyphia|ichika|tapping/i },
  { id: 'acoustic', label: 'Acoustic songwriter', query: 'acoustic guitar chord embellishments', words: /acoustic|embellish|singer.?songwriter|americana|fingerstyle|dylan gossett|hammer.?on/i },
  { id: 'blues', label: 'Blues and jazz', query: 'blues guitar lick', words: /blues|jazz|bb king|srv|neo.?soul/i },
  { id: 'bluegrass', label: 'Bluegrass flatpicking', query: 'bluegrass flatpicking guitar', words: /bluegrass|flatpick|billy strings|crosspick/i },
  { id: 'slack', label: 'Slack key', query: 'slack key guitar', words: /slack key|ki.?ho.?alu|taro patch|open g/i },
]
const GUITAR = /guitar|tab|riff|lick|chord|solo|fingerstyle|strum|pick|fret|lesson|cover/i
const NOT = /djent|math ?rock|reaction|unboxing|prank|giveaway/i

/** Fisher–Yates shuffle (a fresh order each time; `rnd` for tests). */
export function shuffle<T>(a: T[], rnd = Math.random): T[] {
  const x = a.slice()
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [x[i], x[j]] = [x[j], x[i]] }
  return x
}

/** No channel more than once in any `win` in a row: later ones wait their turn (or are dropped if they never fit). */
export function spreadChannels(list: Short[], win = 10): Short[] {
  const out: Short[] = []
  let wait = list.slice()
  let guard = 0
  while (wait.length && guard++ < list.length * 3) {
    const recent = new Set(out.slice(-(win - 1)).map(s => s.channelId))
    const i = wait.findIndex(s => !recent.has(s.channelId))
    if (i < 0) break
    out.push(wait[i])
    wait = wait.filter((_, k) => k !== i)
  }
  return out
}

/** Guitar Shorts only (no djent / math rock), his styles first-ish: boosted ones are spread through the start. */
export function curate(list: Short[], rnd = Math.random): Short[] {
  const seen = new Set<string>()
  const ok = list.filter(s => !seen.has(s.id) && (seen.add(s.id), true) && (s.source === 'channels' || GUITAR.test(s.title) || SHORT_STYLES.some(st => st.words.test(s.title))) && !NOT.test(s.title))
  for (const s of ok) s.style ??= SHORT_STYLES.find(st => st.words.test(s.title))?.id
  const boosted = shuffle(ok.filter(s => s.style), rnd), rest = shuffle(ok.filter(s => !s.style), rnd)
  // two boosted for every other one
  const mixed: Short[] = []
  while (boosted.length || rest.length) { if (boosted.length) mixed.push(boosted.shift()!); if (boosted.length) mixed.push(boosted.shift()!); if (rest.length) mixed.push(rest.shift()!) }
  return spreadChannels(mixed)
}

const iso = (d: string) => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d); return m ? (+(m[1] ?? 0)) * 3600 + (+(m[2] ?? 0)) * 60 + (+(m[3] ?? 0)) : 0 }
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

export class QuotaError extends Error {}

/** One search with the key: up to 50 Shorts for a style, kept to short (≤ 3 min) embeddable videos. */
export async function searchShorts(style: (typeof SHORT_STYLES)[number], key = youtubeKey(), signal?: AbortSignal, pageToken?: string): Promise<{ list: Short[]; next?: string }> {
  if (!key) throw new QuotaError('no key')
  const q = encodeURIComponent(`#guitartabs ${style.query} #shorts`)
  const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&videoEmbeddable=true&maxResults=50&q=${q}${pageToken ? `&pageToken=${pageToken}` : ''}&key=${encodeURIComponent(key)}`, { signal })
  const j = await r.json().catch(() => ({})) as { items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string; channelId: string } }[]; nextPageToken?: string; error?: { code: number; errors?: { reason: string }[]; message?: string } }
  if (!r.ok || j.error) {
    const reason = j.error?.errors?.[0]?.reason ?? ''
    if (/quota|dailyLimit|rateLimit/i.test(reason) || r.status === 403) throw new QuotaError(reason || 'quota')
    throw new Error(j.error?.message ?? `YouTube said ${r.status}`)
  }
  const items = (j.items ?? []).filter(i => i.id?.videoId)
  if (!items.length) return { list: [], next: j.nextPageToken }
  // their length and whether they can play inside KGuitar
  const v = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${items.map(i => i.id.videoId).join(',')}&key=${encodeURIComponent(key)}`, { signal })
  const vj = await v.json().catch(() => ({})) as { items?: { id: string; contentDetails: { duration: string }; status: { embeddable: boolean } }[] }
  const info = new Map((vj.items ?? []).map(i => [i.id, i]))
  const list = items
    .map(i => ({ id: i.id.videoId, title: decode(i.snippet.title), channel: decode(i.snippet.channelTitle), channelId: i.snippet.channelId, secs: info.get(i.id.videoId) ? iso(info.get(i.id.videoId)!.contentDetails.duration) : undefined, source: 'search' as const, style: style.id }))
    .filter(s => { const d = info.get(s.id); return !d || (d.status.embeddable && (s.secs ?? 0) > 0 && (s.secs ?? 0) <= 180) })
  return { list, next: j.nextPageToken }
}

// ---------- the channels he follows (no key needed; on the phone, where their feeds can be read) ----------
const CH_KEY = 'kg:shortsChannels'
export interface Channel { id: string; name: string }
export const followed = (): Channel[] => { try { return JSON.parse(localStorage.getItem(CH_KEY) ?? '[]') as Channel[] } catch { return [] } }
export function setFollowed(c: Channel[]) { try { localStorage.setItem(CH_KEY, JSON.stringify(c)) } catch { /* storage */ } }

async function getText(url: string, signal?: AbortSignal): Promise<string> {
  if (Capacitor.isNativePlatform()) { const r = await CapacitorHttp.get({ url, responseType: 'text' }); if (r.status >= 400) throw new Error(`${r.status}`); return String(r.data) }
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error(`${r.status}`)
  return r.text()
}

/** A channel's id from a link or @handle (the page names its own id). */
export async function channelFrom(text: string, signal?: AbortSignal): Promise<Channel> {
  const t = text.trim()
  const direct = /(?:channel\/)?(UC[\w-]{22})/.exec(t)
  const url = direct ? `https://www.youtube.com/channel/${direct[1]}` : /^@/.test(t) ? `https://www.youtube.com/${t}` : /youtube\.com\//.test(t) ? t : `https://www.youtube.com/@${t.replace(/^@/, '')}`
  const html = await getText(url, signal)
  const id = direct?.[1] ?? /"(?:channelId|externalId)":"(UC[\w-]{22})"/.exec(html)?.[1]
  if (!id) throw new Error("That channel couldn't be found.")
  const name = decode(/<meta property="og:title" content="([^"]+)"/.exec(html)?.[1] ?? /<title>([^<]+)<\/title>/.exec(html)?.[1]?.replace(/ - YouTube$/, '') ?? t)
  return { id, name }
}

/** The newest uploads of the channels he follows (their public feeds). */
export async function channelShorts(chs = followed(), signal?: AbortSignal): Promise<Short[]> {
  const out: Short[] = []
  await Promise.all(chs.map(async c => {
    try {
      const xml = await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${c.id}`, signal)
      for (const e of xml.split('<entry>').slice(1)) {
        const id = /<yt:videoId>([\w-]{11})<\/yt:videoId>/.exec(e)?.[1]
        const title = /<title>([^<]*)<\/title>/.exec(e)?.[1]
        if (id && title) out.push({ id, title: decode(title), channel: c.name, channelId: c.id, source: 'channels' })
      }
    } catch { /* that channel's feed didn't load */ }
  }))
  return out
}

// ---------- channels followed from the start (owner 2026-11-11), found by name ----------
// Their exact YouTube handles aren't known for sure, so each is looked up: with the key, a channel search by name (the
// best match); without it, on the phone, the likely @handles. Found ones join the follow list (he can remove any);
// one he removed is never added back. State: kg:shortsDefaults = { name: 'added' | 'removed' | number (tries) }.
export const DEFAULT_FOLLOWS: { name: string; query: string; handles: string[]; id?: string }[] = [
  { name: 'Mr. Tabs', query: 'Mr. Tabs guitar', handles: ['@MrTabs', '@mrtabsguitar'] },
  { name: 'Level Up Guitar Tabs', query: 'Level Up Guitar Tabs', handles: ['@LevelUpGuitarTabs', '@levelupguitartabs'] },
  { name: 'Kenneth Acoustic', query: 'Kenneth Acoustic guitar', handles: ['@KennethAcoustic', '@kennethacoustic'] },
  // owner 2026-11-11: tab Shorts and full song tab tutorials (handle and channel id checked on YouTube)
  { name: 'GuitarZero2Hero Express', query: 'GuitarZero2Hero Express', handles: ['@guitarzero2heroexpress'], id: 'UC57CDvpwqAxHrJvVkZbaBxA' },
]
const DEF_KEY = 'kg:shortsDefaults'
type DefState = Record<string, 'added' | 'removed' | number>
const defState = (): DefState => { try { return JSON.parse(localStorage.getItem(DEF_KEY) ?? '{}') as DefState } catch { return {} } }
const setDefState = (s: DefState) => { try { localStorage.setItem(DEF_KEY, JSON.stringify(s)) } catch { /* storage */ } }
/** Stop following a channel; a starting one he removed stays removed. */
export function unfollow(id: string) {
  const ch = followed().find(c => c.id === id)
  setFollowed(followed().filter(c => c.id !== id))
  const def = ch && DEFAULT_FOLLOWS.find(d => d.name.toLowerCase() === ch.name.toLowerCase() || ch.name.toLowerCase().includes(d.name.toLowerCase()))
  if (def) { const s = defState(); s[def.name] = 'removed'; setDefState(s) }
}
/** The starting channels still to find (not added, not removed, fewer than 4 tries). */
export const defaultsPending = () => DEFAULT_FOLLOWS.filter(d => { const v = defState()[d.name]; return v !== 'added' && v !== 'removed' && (typeof v !== 'number' || v < 4) })

/** One channel by name with the key (search.list type=channel: 100 units). */
export async function channelByName(q: string, key = youtubeKey(), signal?: AbortSignal): Promise<Channel | null> {
  if (!key) return null
  const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=3&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`, { signal })
  const j = await r.json().catch(() => ({})) as { items?: { id: { channelId: string }; snippet: { title: string } }[]; error?: { errors?: { reason: string }[] } }
  if (!r.ok || j.error) { if (r.status === 403) throw new QuotaError('quota'); return null }
  const it = j.items?.[0]
  return it ? { id: it.id.channelId, name: decode(it.snippet.title) } : null
}

/** Find and follow the starting channels not added yet. Returns the ones added this time. */
export async function ensureDefaultFollows(signal?: AbortSignal): Promise<Channel[]> {
  const added: Channel[] = []
  for (const d of defaultsPending()) {
    const s = defState()
    let ch: Channel | null = null
    try {
      if (d.id) ch = { id: d.id, name: d.name }
      if (!ch && youtubeKey()) ch = await channelByName(d.query, youtubeKey(), signal)
      if (!ch && Capacitor.isNativePlatform()) for (const h of d.handles) { try { ch = await channelFrom(h, signal); break } catch { /* next guess */ } }
    } catch { /* quota or offline: try again another time */ }
    if (ch) {
      if (!followed().some(c => c.id === ch!.id)) setFollowed([...followed(), ch])
      s[d.name] = 'added'; added.push(ch)
    } else s[d.name] = (typeof s[d.name] === 'number' ? (s[d.name] as number) : 0) + 1
    setDefState(s)
  }
  return added
}

// ---------- "Find channels for me": channels whose Shorts show a tab, in his styles ----------
export interface ChannelPick { id: string; name: string; shorts: number; styles: string[]; sample: string; checked: number; withTab: number; score: number }

/** Rank channels from a pile of Shorts (and how many of their frames showed a tab, when checked). Pure: tested. */
export function rankTabChannels(shorts: Short[], tabs: Map<string, { checked: number; withTab: number }>, skip: Set<string>): ChannelPick[] {
  const by = new Map<string, Short[]>()
  for (const s of shorts) if (!skip.has(s.channelId) && !NOT.test(s.title)) by.set(s.channelId, [...(by.get(s.channelId) ?? []), s])
  const out: ChannelPick[] = []
  for (const [id, list] of by) {
    const uniq = [...new Map(list.map(s => [s.id, s])).values()]
    const t = tabs.get(id) ?? { checked: 0, withTab: 0 }
    const tabWords = uniq.filter(s => /\btabs?\b|#guitartabs|tablature/i.test(s.title)).length / uniq.length
    // a checked channel lives or dies by its frames; otherwise its titles and how often it came up
    const tabShare = t.checked ? t.withTab / t.checked : tabWords * 0.6
    if (t.checked >= 2 && t.withTab === 0) continue
    const score = tabShare * 3 + Math.min(uniq.length, 6) * 0.35 + new Set(uniq.map(s => s.style).filter(Boolean)).size * 0.2
    out.push({ id, name: uniq[0].channel, shorts: uniq.length, styles: [...new Set(uniq.map(s => s.style).filter((x): x is string => !!x))], sample: uniq[0].title, checked: t.checked, withTab: t.withTab, score })
  }
  return out.filter(p => p.shorts >= 2 || p.withTab > 0).sort((a, b) => b.score - a.score)
}

/** A frame from the middle of a Short (YouTube's own hq2 still) as an image we can read the pixels of. */
async function frameOf(id: string): Promise<HTMLImageElement | null> {
  const url = `https://i.ytimg.com/vi/${id}/hq2.jpg`
  try {
    if (Capacitor.isNativePlatform()) {
      const r = await CapacitorHttp.get({ url, responseType: 'blob' })
      if (r.status >= 400) return null
      const img = new Image(); img.src = `data:image/jpeg;base64,${String(r.data)}`
      await img.decode(); return img
    }
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url
    await img.decode(); return img
  } catch { return null }
}

/** Search his styles, check a few frames of the likeliest channels for a tab on screen, and rank them. */
export async function findTabChannels(onStep: (msg: string) => void, signal?: AbortSignal): Promise<ChannelPick[]> {
  const key = youtubeKey()
  if (!key) throw new QuotaError('no key')
  const all: Short[] = []
  for (const st of SHORT_STYLES) {
    if (signal?.aborted) break
    onStep(`Looking through ${st.label} Shorts…`)
    try { all.push(...(await searchShorts(st, key, signal)).list) } catch (e) { if (e instanceof QuotaError) break }
  }
  const skip = new Set(followed().map(c => c.id))
  const first = rankTabChannels(all, new Map(), skip).slice(0, 14)
  const tabs = new Map<string, { checked: number; withTab: number }>()
  const { tabBoxes } = await import('./pictures')
  let readable = true
  for (const p of first) {
    if (signal?.aborted || !readable) break
    onStep(`Checking ${p.name} for tabs on screen…`)
    const ids = all.filter(s => s.channelId === p.id).slice(0, 3).map(s => s.id)
    const t = { checked: 0, withTab: 0 }
    for (const id of ids) {
      const img = await frameOf(id)
      if (!img) continue
      try { t.checked++; if (tabBoxes(img).length) t.withTab++ } catch { readable = false; t.checked--; break } // the web can't read YouTube's pictures: titles only
    }
    tabs.set(p.id, t)
  }
  return rankTabChannels(all, tabs, skip).slice(0, 10)
}

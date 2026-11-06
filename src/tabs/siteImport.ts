// Tabs from Songsterr and Ultimate Guitar, straight into KGuitar (Android app only: a web page can't read other
// sites, the phone app can). The owner searches, picks a result, and the app reads the same tab the site shows him,
// for his own practice. Nothing is stored anywhere but his phone.
//   Songsterr: its search and the note data its own player loads (every note with string, fret, rhythm, techniques)
//   Ultimate Guitar: the tab or chord sheet text on the tab's page ([ch] chord marks, [tab] blocks)
// These are the sites' own page data, not a published API: if a site changes, this says so plainly and the old
// way (open the site, copy or download) still works.
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import type { Song, SongBar, SongNote, SongStep } from './model'

export const canImportFromSites = () => Capacitor.isNativePlatform()

async function get(url: string, json: boolean): Promise<unknown> {
  const r = await CapacitorHttp.get({ url, responseType: json ? 'json' : 'text', headers: { Accept: json ? 'application/json' : 'text/html' } })
  if (r.status < 200 || r.status >= 300) throw new Error(`The site answered ${r.status}`)
  if (json && typeof r.data === 'string') return JSON.parse(r.data)
  return r.data
}

// ───────────── Songsterr ─────────────
export interface SongsterrHit { songId: number; title: string; artist: string; tracks: { index: number; name: string; instrument: string; tuning?: number[] }[] }

export async function searchSongsterr(q: string): Promise<SongsterrHit[]> {
  const data = await get(`https://www.songsterr.com/api/songs?pattern=${encodeURIComponent(q)}&size=20`, true)
  return parseSongsterrSearch(data)
}
export function parseSongsterrSearch(data: unknown): SongsterrHit[] {
  if (!Array.isArray(data)) return []
  return data.map((x: Record<string, unknown>) => ({
    songId: Number(x.songId ?? x.id),
    title: String(x.title ?? ''),
    artist: typeof x.artist === 'object' && x.artist ? String((x.artist as Record<string, unknown>).name ?? '') : String(x.artist ?? ''),
    tracks: (Array.isArray(x.tracks) ? x.tracks : []).map((t: Record<string, unknown>, i: number) => ({ index: i, name: String(t.name ?? t.title ?? `Track ${i + 1}`), instrument: String(t.instrument ?? ''), tuning: Array.isArray(t.tuning) ? (t.tuning as number[]) : undefined })),
  })).filter(h => h.songId && h.title)
}
/** the guitar track to open first: the first guitar-like track (not bass, not drums) */
export function guitarTrack(h: SongsterrHit, strings: number): number {
  const ok = h.tracks.filter(t => !/bass|drum|percussion|vocal/i.test(`${t.instrument} ${t.name}`) && (!t.tuning || t.tuning.length === strings))
  return (ok.find(t => /guitar|lead|rhythm/i.test(`${t.instrument} ${t.name}`)) ?? ok[0] ?? h.tracks[0])?.index ?? 0
}

export async function songsterrSong(h: SongsterrHit, track: number): Promise<Song> {
  const meta = await get(`https://www.songsterr.com/api/meta/${h.songId}`, true) as Record<string, unknown>
  let revision = meta.revisionId, image = meta.image
  if (!revision || !image) {
    // older form: the list of revisions, newest first
    const revs = await get(`https://www.songsterr.com/api/meta/${h.songId}/revisions`, true).catch(() => null)
    const r0 = Array.isArray(revs) ? (revs[0] as Record<string, unknown>) : null
    revision ??= r0?.revisionId; image ??= r0?.image
  }
  if (!revision || !image) throw new Error('Songsterr didn\'t give the tab\'s address')
  const part = await get(`https://dqsljvtekg760.cloudfront.net/${h.songId}/${revision}/${image}/${track}.json`, true)
  return songsterrToSong(part, `${h.title} (${h.artist})`)
}

/** Songsterr's track data → a KGuitar song. Strings there count from the highest (0) and tuning is high to low. */
export function songsterrToSong(data: unknown, title: string): Song {
  const d = data as { tuning?: number[]; capo?: number; measures?: unknown[]; automations?: { tempo?: { bpm?: number }[] }; name?: string; instrumentId?: number }
  const tuningHi = Array.isArray(d.tuning) && d.tuning.length ? d.tuning : [64, 59, 55, 50, 45, 40]
  const tuning = [...tuningHi].reverse()
  const n = tuning.length
  const capo = Number(d.capo ?? 0) || 0
  const bars: SongBar[] = []
  for (const m of (d.measures ?? []) as Record<string, unknown>[]) {
    const voice = ((m.voices as Record<string, unknown>[]) ?? [])[0] ?? {}
    const steps: SongStep[] = []
    for (const b of ((voice.beats as Record<string, unknown>[]) ?? [])) {
      const [num, den] = Array.isArray(b.duration) ? (b.duration as number[]) : [1, 4]
      let dur = (4 * num) / den
      const dots = Number(b.dots ?? 0)
      if (dots === 1) dur *= 1.5
      else if (dots === 2) dur *= 1.75
      const tup = b.tuplet as number | { enters?: number; times?: number } | undefined
      if (typeof tup === 'number' && tup > 1) dur *= (tup === 3 ? 2 : tup === 5 || tup === 6 || tup === 7 ? 4 : tup - 1) / tup
      else if (tup && typeof tup === 'object' && tup.enters && tup.times) dur *= tup.times / tup.enters
      const notes: SongNote[] = []
      if (!b.rest) {
        for (const x of ((b.notes as Record<string, unknown>[]) ?? [])) {
          if (x.rest || x.tie) continue
          const hs = Number(x.string), fret = Number(x.fret)
          if (!Number.isFinite(hs) || !Number.isFinite(fret)) continue
          const s = n - 1 - hs
          if (s < 0 || s >= n || notes.some(y => y.string === s)) continue
          const tech = x.dead ? 'x' : x.bend ? 'b' : x.slide ? '/' : x.hp ? 'h' : x.harmonic ? 'harm' : x.vibrato ? '~' : undefined
          notes.push({ string: s, fret, midi: tuning[s] + capo + fret, ...(tech ? { tech } : {}) })
        }
      }
      steps.push({ notes: notes.sort((a, c) => a.string - c.string), dur: Math.round(dur * 1e4) / 1e4 })
    }
    if (!steps.length) {
      const sig = Array.isArray(m.signature) ? (m.signature as number[]) : [4, 4]
      steps.push({ notes: [], dur: (4 * sig[0]) / sig[1] })
    }
    bars.push({ steps })
  }
  if (!bars.some(b => b.steps.some(s => s.notes.length))) throw new Error('That track has no notes to play')
  const bpm = Number(d.automations?.tempo?.[0]?.bpm) || undefined
  const firstSig = (d.measures?.[0] as Record<string, unknown> | undefined)?.signature as number[] | undefined
  const meter = firstSig ? (4 * firstSig[0]) / firstSig[1] : undefined
  return { title, tempo: bpm, ...(bpm ? { tempoFrom: 'file' as const } : {}), ...(firstSig && (firstSig[0] !== 4 || firstSig[1] !== 4) ? { timeSig: [firstSig[0], firstSig[1]] as [number, number] } : {}), ...(meter && meter !== 4 && Number.isInteger(meter) ? { meter } : {}), tracks: [{ name: d.name ?? 'Guitar', tuning, capo, bars, program: 25 }] }
}

// ───────────── Ultimate Guitar ─────────────
export interface UgHit { title: string; artist: string; type: string; url: string; rating: number; votes: number }

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
/** The page data UG puts in every page (a JSON "store"). */
export function ugStore(html: string): Record<string, unknown> | null {
  const a = /class="js-store"\s+data-content="([^"]+)"/.exec(html)
  if (a) { try { return JSON.parse(decode(a[1])) } catch { /* try the other form */ } }
  const b = /window\.UGAPP\.store\.page\s*=\s*(\{[\s\S]*?\});\s*<\/script>/.exec(html)
  if (b) { try { return { store: { page: JSON.parse(b[1]) } } } catch { return null } }
  return null
}

export async function searchUG(q: string): Promise<UgHit[]> {
  const html = await get(`https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}`, false) as string
  return parseUgSearch(html)
}
export function parseUgSearch(html: string): UgHit[] {
  const st = ugStore(html)
  const data = ((st?.store as Record<string, unknown>)?.page as Record<string, unknown>)?.data as Record<string, unknown> | undefined
  const results = (data?.results as Record<string, unknown>[]) ?? []
  return results
    .filter(x => typeof x.tab_url === 'string' && /^(Chords|Tab|Ukulele|Bass)?/i.test(String(x.type ?? '')) && !/Pro|Official|Video|Power/i.test(String(x.type ?? '')))
    .map(x => ({ title: String(x.song_name ?? ''), artist: String(x.artist_name ?? ''), type: String(x.type ?? ''), url: String(x.tab_url), rating: Number(x.rating ?? 0), votes: Number(x.votes ?? 0) }))
    .sort((a, b) => b.votes * b.rating - a.votes * a.rating)
}

/** The tab's text: [ch]G[/ch] marks become plain chord names, [tab] blocks become plain lines. */
export async function ugText(url: string): Promise<{ text: string; title: string }> {
  const html = await get(url, false) as string
  return parseUgTab(html)
}
export function parseUgTab(html: string): { text: string; title: string } {
  const st = ugStore(html)
  const data = ((st?.store as Record<string, unknown>)?.page as Record<string, unknown>)?.data as Record<string, unknown> | undefined
  const view = data?.tab_view as Record<string, unknown> | undefined
  const content = String(((view?.wiki_tab as Record<string, unknown>)?.content) ?? '')
  if (!content) throw new Error('Ultimate Guitar didn\'t give the tab text (Pro and Official tabs can\'t be read)')
  const tab = data?.tab as Record<string, unknown> | undefined
  const text = content.replace(/\r/g, '').replace(/\[\/?tab\]/g, '').replace(/\[ch\]([^[]*)\[\/ch\]/g, '$1')
  return { text, title: tab ? `${tab.song_name ?? ''} (${tab.artist_name ?? ''})` : 'Ultimate Guitar tab' }
}

/** A Songsterr page address (…-s1234 or …-s1234t2) → the song and track. */
export function songsterrIds(url: string): { songId: number; track: number } | null {
  const m = /-s(\d+)(?:t(\d+))?(?:[/?#]|$)/.exec(url)
  return m ? { songId: Number(m[1]), track: Number(m[2] ?? 0) } : null
}
/** Any shared Songsterr or Ultimate Guitar page, straight to a song (title, and a Song or tab text). */
export async function importFromUrl(url: string): Promise<{ song: Song } | { text: string; title: string } | null> {
  const ss = songsterrIds(url)
  if (/songsterr\.com/i.test(url) && ss) {
    const title = decodeURIComponent((/\/a\/wsa\/([^?#]+)-tab-s\d+/.exec(url)?.[1] ?? 'Songsterr tab').replace(/-/g, ' '))
    return { song: await songsterrSong({ songId: ss.songId, title, artist: '', tracks: [] }, ss.track) }
  }
  if (/ultimate-guitar\.com/i.test(url)) return ugText(url)
  return null
}

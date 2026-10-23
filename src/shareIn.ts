// Share → KGuitar: handles what other apps send (copied tabs, chord sheets, YouTube links, tab files).
import { Capacitor, registerPlugin } from '@capacitor/core'
import { current } from './instrument'
import { getSong, saveSong, youtubeId, type SongDoc } from './tabs/library'
import { songFromFile, songFromText } from './tabs/importer'

interface SharedFile { name: string; mime: string; data: string }
interface SharedItem { text?: string; subject?: string; files?: SharedFile[] }
interface ShareInPlugin {
  take(): Promise<{ item?: SharedItem }>
  addListener(event: 'shared', f: () => void): Promise<{ remove: () => void }>
}
const ShareIn = registerPlugin<ShareInPlugin>('ShareIn')

export type ShareResult =
  | { kind: 'songs'; docs: SongDoc[]; failed: string[] }
  | { kind: 'video'; song: string | null; url: string }
  | { kind: 'link'; url: string; site: string }
  | { kind: 'nothing'; text: string }

const listeners = new Set<(r: ShareResult) => void>()
export function onShared(f: (r: ShareResult) => void) { listeners.add(f); return () => { listeners.delete(f) } }

/** "Wonderwall Chords by Oasis @ Ultimate-Guitar.Com" → "Wonderwall (Oasis)" */
export function titleFromSubject(s?: string) {
  if (!s) return ''
  const t = s.replace(/\s*[@|–-]\s*(ultimate[- ]guitar|songsterr).*$/i, '').trim()
  const m = /^(.*?)\s+(?:chords|tab|tabs|ukulele chords|bass tab|guitar pro tab|official)\s+by\s+(.*)$/i.exec(t)
  return (m ? `${m[1]} (${m[2]})` : t).slice(0, 80)
}

function b64(s: string) {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function handleShared(item: SharedItem): Promise<ShareResult> {
  const inst = current()
  if (item.files?.length) {
    const docs: SongDoc[] = []
    const failed: string[] = []
    for (const f of item.files) {
      try { docs.push(await songFromFile(f.name, b64(f.data), inst)) } catch { failed.push(f.name) }
    }
    return { kind: 'songs', docs, failed }
  }
  const text = (item.text ?? '').trim()
  const urlOnly = /^\S+$/.test(text) && /^https?:\/\//i.test(text) ? text : (/https?:\/\/\S+/.exec(text)?.[0] ?? '')
  // a YouTube link: add it to the song you have open in Play
  if (urlOnly && youtubeId(urlOnly) && text.length < 400) {
    let songTitle: string | null = null
    try {
      const id = JSON.parse(localStorage.getItem(`kg:playSong:${inst.id}`) ?? '""') as string
      const doc = id ? await getSong(id) : undefined
      if (doc) { await saveSong({ ...doc, youtube: urlOnly, ytSync: undefined, updated: Date.now() }); songTitle = doc.title }
    } catch { /* no song open */ }
    return { kind: 'video', song: songTitle, url: urlOnly }
  }
  // a whole tab or chord sheet that was copied and shared as text
  const doc = text.length > 40 ? songFromText(text, titleFromSubject(item.subject), inst) : null
  if (doc) { await saveSong(doc); return { kind: 'songs', docs: [doc], failed: [] } }
  if (urlOnly) {
    const site = /ultimate-guitar/i.test(urlOnly) ? 'Ultimate Guitar' : /songsterr/i.test(urlOnly) ? 'Songsterr' : 'that site'
    return { kind: 'link', url: urlOnly, site }
  }
  return { kind: 'nothing', text: text.slice(0, 120) }
}

async function check() {
  try {
    const { item } = await ShareIn.take()
    if (!item) return
    const r = await handleShared(item)
    listeners.forEach(f => f(r))
  } catch { /* not running in the Android app */ }
}

export function startShareIn() {
  if (!Capacitor.isNativePlatform()) return
  void ShareIn.addListener('shared', () => void check())
  void check()
}

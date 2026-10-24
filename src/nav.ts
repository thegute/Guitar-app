// App-wide navigation: lets one screen send you to another (e.g. Learn → Play with a practice tab loaded).
import type { SongDoc } from './tabs/library'

/** The main sections in the nav bar. */
export type Tab = 'play' | 'songs' | 'learn' | 'progressions' | 'tools'
export const TAB_IDS: Tab[] = ['play', 'songs', 'learn', 'progressions', 'tools']
/** The pages inside Tools. */
export type ToolPage = 'tuner' | 'metronome' | 'chords' | 'scales'
export type Destination = Tab | ToolPage

const TOOL_PAGES: ToolPage[] = ['tuner', 'metronome', 'chords', 'scales']
export const isToolPage = (d: string): d is ToolPage => (TOOL_PAGES as string[]).includes(d)

const listeners = new Set<(t: Destination) => void>()
let pendingDoc: SongDoc | null = null

export function onGo(f: (t: Destination) => void) {
  listeners.add(f)
  return () => { listeners.delete(f) }
}
/** Go to a section, or straight to a page inside Tools (e.g. go('tuner')). */
export function go(t: Destination) {
  listeners.forEach(f => f(t))
}
const openListeners = new Set<(d: SongDoc) => void>()
/** Play listens for songs to open while it's already on screen. */
export function onOpenSong(f: (d: SongDoc) => void) {
  openListeners.add(f)
  return () => { openListeners.delete(f) }
}
/** Open a song or practice tab in Play. */
export function openInPlay(doc: SongDoc) {
  pendingDoc = doc
  openListeners.forEach(f => f(doc))
  go('play')
}
/** Play calls this when it mounts: the tab another screen asked it to open, if any. */
export function takePendingDoc(): SongDoc | null {
  const d = pendingDoc
  pendingDoc = null
  return d
}

/** Open the Songs tab at one of its pages ('mine', 'songbook', 'practice' or 'add'). */
/** Choose the page (sub-tab) a screen opens on next time it appears. */
export function setSubPage(screen: 'songs' | 'learn' | 'jam' | 'settings', page: string) {
  try { localStorage.setItem(`kg:sub:${screen}`, JSON.stringify(page)) } catch { /* storage unavailable */ }
}
export function openSongs(section: 'mine' | 'songbook' | 'practice' | 'add' = 'songbook') {
  setSubPage('songs', section)
  go('songs')
}
export function openJam(page: 'jam' | 'solo' | 'tab' | 'find' = 'jam') {
  setSubPage('jam', page)
  go('progressions')
}

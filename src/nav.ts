// App-wide navigation: lets one screen send you to another (e.g. Learn → Play with a practice tab loaded).
import type { SongDoc } from './tabs/library'
import type { Go } from './learn/path'
import type { PlayAction } from './search/types'

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
  // a screen that's already open switches too
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('kg-subpage', { detail: { screen, page } }))
}
export function openSongs(section: 'mine' | 'songbook' | 'practice' | 'add' | 'library' | 'learning' = 'songbook') {
  // the exercise library moved to Learn → Exercises (old links still say 'practice')
  if (section === 'practice') { learnGo({ learn: 'exercises' }); return }
  // My songs and the Songbook are one Library now: older links open it showing that kind
  if (section !== 'add') {
    const show = section === 'library' ? 'all' : section
    try { localStorage.setItem('kg:libShow', JSON.stringify(show)) } catch { /* private */ }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('kg-libshow', { detail: show }))
  }
  setSubPage('songs', section === 'add' ? 'add' : 'library')
  go('songs')
}
/** Open Songs → Library filtered to a specific key (`"7:1"` for Em, or `"all"`). */
export function openSongsInKey(keyId: string, show: 'all' | 'songbook' | 'mine' = 'all') {
  try { localStorage.setItem('kg:libKey', JSON.stringify(keyId)) } catch { /* private */ }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('kg-libkey', { detail: keyId }))
  openSongs(show === 'all' ? 'library' : show)
}
/** Open Learn → Exercises with optional filter overrides (`worksOver`, `tech`, `key`). */
export function openExercisesFiltered(opts: { worksOver?: string; tech?: string; keyRoot?: string }) {
  try {
    localStorage.setItem('kg:exSection', JSON.stringify('all'))
    const raw = localStorage.getItem('kg:exFilter')
    const cur = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    const next = {
      level: 'all', type: 'all', tech: opts.tech ?? 'all', worksOver: opts.worksOver ?? 'all', fav: false,
      ...cur,
      ...(opts.worksOver ? { worksOver: opts.worksOver } : {}),
      ...(opts.tech ? { tech: opts.tech } : {}),
    }
    localStorage.setItem('kg:exFilter', JSON.stringify(next))
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('kg-exfilter', { detail: next }))
  } catch { /* private */ }
  learnGo({ learn: 'exercises' })
}
// ---- one exercise from the exercise library (Learn → Exercises)
let pendingExercise: string | null = null
const exerciseListeners = new Set<(code: string) => void>()
export function onOpenExercise(f: (code: string) => void) {
  exerciseListeners.add(f)
  return () => { exerciseListeners.delete(f) }
}
/** Show one exercise (by code, e.g. "SC-12") in Learn → Exercises. */
export function openExercise(code: string) {
  pendingExercise = code
  exerciseListeners.forEach(f => f(code))
  learnGo({ learn: 'exercises' })
}
export function takePendingExercise(): string | null {
  const c = pendingExercise
  pendingExercise = null
  return c
}
/** Open a Jam page. Jam is Play with a band ('jam'), Make a beat ('beats'), Loop myself ('loop') and the Riff Scanner ('find').
 *  Older links: 'solo' (Solo over it, now floating cards over the band) opens the band; 'tab' (Make a tab) opens the tab maker
 *  in Learn → Exercises → Make your own, which uses the Jam progression. */
export function openJam(page: 'jam' | 'solo' | 'tab' | 'find' | 'beats' | 'loop' = 'jam') {
  if (page === 'tab') {
    try { localStorage.setItem('kg:exSection', JSON.stringify('make')) } catch { /* private */ }
    learnGo({ learn: 'exercises' })
    return
  }
  setSubPage('jam', page === 'solo' ? 'jam' : page)
  go('progressions')
}

// ---- links from anywhere (search) into Learn's pages, Play's controls, and tools that read their settings on open

/** A Learn page to open: anything a "Show me" link can open (a section of How to use KGuitar too). */
export type LearnGo = Go
let pendingLearn: LearnGo | null = null
const learnListeners = new Set<(g: LearnGo) => void>()
export function onLearnGo(f: (g: LearnGo) => void) {
  learnListeners.add(f)
  return () => { learnListeners.delete(f) }
}
/** Open a Learn page (a quiz, a lesson, a tool, a Settings page …) from another screen. */
export function learnGo(g: LearnGo) {
  // Settings is its own page over any screen now (the gear), not a page of Learn
  if ('settings' in g) { openGear(g.settings); return }
  if (learnListeners.size) learnListeners.forEach(f => f(g))
  else pendingLearn = g
  go('learn')
}
/** Learn calls this when it mounts. */
export function takeLearnGo(): LearnGo | null {
  const g = pendingLearn
  pendingLearn = null
  return g
}

let pendingPlay: PlayAction | null = null
const playListeners = new Set<(a: PlayAction) => void>()
export function onPlayAction(f: (a: PlayAction) => void) {
  playListeners.add(f)
  return () => { playListeners.delete(f) }
}
/** Go to Play and open something there (the Options sheet at Speed, the video, the song check …). */
export function playAction(a: PlayAction) {
  if (playListeners.size) playListeners.forEach(f => f(a))
  else pendingPlay = a
  go('play')
}
/** Play calls this when it mounts. */
export function takePlayAction(): PlayAction | null {
  const a = pendingPlay
  pendingPlay = null
  return a
}

const remountListeners = new Set<() => void>()
export function onRemount(f: () => void) {
  remountListeners.add(f)
  return () => { remountListeners.delete(f) }
}
/** Tools and Jam read their settings when they open: after changing them from outside, open them afresh. */
export function remount() {
  remountListeners.forEach(f => f())
}

// ---- the gear: Settings (and the manual, the floating cards) as one page over any screen
export type GearPage = 'you' | 'sound' | 'look' | 'cards' | 'backup' | 'manual'
const gearListeners = new Set<(page?: GearPage, sec?: string) => void>()
export function onGear(f: (page?: GearPage, sec?: string) => void) {
  gearListeners.add(f)
  return () => { gearListeners.delete(f) }
}
/** Open Settings (at a page; the manual at a section). */
export function openGear(page?: GearPage, sec?: string) {
  if (page) setSubPage('settings', page)
  gearListeners.forEach(f => f(page, sec))
}

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
}
export function openSongs(section: 'mine' | 'songbook' | 'practice' | 'add' = 'songbook') {
  setSubPage('songs', section)
  go('songs')
}
// ---- one exercise from the exercise library (Songs → Exercises)
let pendingExercise: string | null = null
const exerciseListeners = new Set<(code: string) => void>()
export function onOpenExercise(f: (code: string) => void) {
  exerciseListeners.add(f)
  return () => { exerciseListeners.delete(f) }
}
/** Show one exercise (by code, e.g. "SC-12") in Songs → Exercises. */
export function openExercise(code: string) {
  pendingExercise = code
  exerciseListeners.forEach(f => f(code))
  openSongs('practice')
}
export function takePendingExercise(): string | null {
  const c = pendingExercise
  pendingExercise = null
  return c
}
export function openJam(page: 'jam' | 'solo' | 'tab' | 'find' | 'beats' = 'jam') {
  setSubPage('jam', page)
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

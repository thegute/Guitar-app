// App-wide navigation: lets one screen send you to another (e.g. Learn → Play with a practice tab loaded).
import type { SongDoc } from './tabs/library'
import type { Go } from './learn/path'
import type { PlayAction } from './search/types'
import { LICKS } from './licks/library'
import { lickMinor } from './licks/chain'
import { keyOptionId } from './tabs/transpose'
import type { StrumChart } from './theory/harmonicFlow'
import { openFloatingCard, setFloatTabDoc, type CardId } from './float/bus'

/** The main sections in the nav bar. */
export type Tab = 'play' | 'songs' | 'learn' | 'progressions' | 'sing' | 'tools'
export const TAB_IDS: Tab[] = ['play', 'songs', 'learn', 'progressions', 'sing', 'tools']
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
export function setSubPage(screen: 'songs' | 'learn' | 'jam' | 'sing' | 'settings', page: string) {
  try { localStorage.setItem(`kg:sub:${screen}`, JSON.stringify(page)) } catch { /* storage unavailable */ }
  // a screen that's already open switches too
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('kg-subpage', { detail: { screen, page } }))
}
/** Open the Sing Vocal Studio, optionally jumping to a sub-tab or attaching a shared YouTube URL. */
export function openSing(page: 'home' | 'lessons' | 'songs' | 'workouts' | 'game' | 'voice' = 'home', ytUrl?: string) {
  if (ytUrl) {
    try { localStorage.setItem('kg:singPendingYt', JSON.stringify(ytUrl)) } catch { /* private */ }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('kg-sing-youtube', { detail: { url: ytUrl } }))
    }
  }
  setSubPage('sing', ytUrl ? 'songs' : page)
  go('sing')
}
export function openSongs(section: 'mine' | 'songbook' | 'practice' | 'add' | 'scan' | 'library' | 'learning' = 'songbook') {
  // the exercise library moved to Learn → Exercises (old links still say 'practice')
  if (section === 'practice') { learnGo({ learn: 'exercises' }); return }
  // My songs and the Songbook are one Library now: older links open it showing that kind
  if (section !== 'add' && section !== 'scan') {
    const show = section === 'library' ? 'all' : section
    try { localStorage.setItem('kg:libShow', JSON.stringify(show)) } catch { /* private */ }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') window.dispatchEvent(new CustomEvent('kg-libshow', { detail: show }))
  }
  setSubPage('songs', section === 'add' ? 'add' : section === 'scan' ? 'scan' : 'library')
  go('songs')
}

/** Open a SongDoc inside the Floating Tab Preview popup (the "⧉ Float" button beside "Open in Play"). */
export function openFloatTab(doc: SongDoc) {
  setFloatTabDoc(doc)
  openFloatingCard('playtab')
}

/** Open the Riff Scanner — defaults to a draggable, resizable, opacity-adjustable Floating Popup (pass fullPage: true to jump to Songs → Scan). */
export function openScanner(opts: { mode?: 'scan' | 'shorts' | 'listen'; link?: string; fullPage?: boolean } = {}) {
  try {
    if (opts.mode) localStorage.setItem('kg:scanMode', JSON.stringify(opts.mode))
    if (opts.link) localStorage.setItem('kg:scanLink', JSON.stringify(opts.link))
  } catch { /* private */ }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('kg-open-scanner', { detail: opts }))
  }
  if (opts.fullPage) {
    setSubPage('songs', 'scan')
    go('songs')
  } else {
    openFloatingCard('scanner')
  }
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
/** Open Must-Know Licks filtered by key — pops open Floating Licks & Fills by default (pass fullPage: true to jump to Learn → Licks). */
export function openLicksInKey(root: string, minor: boolean, opts?: { worksOver?: string; fullPage?: boolean }) {
  const keyId = root && root !== 'all' ? keyOptionId(root, minor) : 'all'
  const hasNative = keyId !== 'all' && LICKS.some(l => l.must && keyOptionId(l.ref, lickMinor(l)) === keyId)
  const mustKey = hasNative ? keyId : 'all'
  const want = !hasNative && keyId !== 'all' ? { root, minor } : null
  const worksOver = opts?.worksOver ?? 'all'
  try {
    localStorage.setItem('kg:mustStyle', JSON.stringify('all'))
    localStorage.setItem('kg:mustWorksOver', JSON.stringify(worksOver))
    localStorage.setItem('kg:mustKey', JSON.stringify(mustKey))
    localStorage.setItem('kg:lickWantKey', JSON.stringify(want))
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('kg-lickfilters', { detail: { style: 'all', worksOver, mustKey, want } }))
    }
  } catch { /* private */ }
  if (opts?.fullPage) learnGo({ licks: 'all' })
  else openFloatingCard('licks')
}
/** Open Circle of Fifths — pops open Floating Circle & Key Sheet by default (pass fullPage: true for full Learn → Circle). */
export function openCircleMastery(tab: 'explore' | 'masterclass' | 'practice' = 'masterclass', opts?: { fullPage?: boolean }) {
  try { localStorage.setItem('kg:circleTab', JSON.stringify(tab)) } catch { /* private */ }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('kg-circle-tab', { detail: tab }))
  }
  if (opts?.fullPage) learnGo({ tool: 'circle' })
  else openFloatingCard('circle')
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
const JAM_PAGE_CARD: Record<string, CardId> = {
  strum: 'strum',
  beats: 'beats',
  loop: 'looper',
  flow: 'flow',
  find: 'scanner',
  jam: 'strum',
  solo: 'strum',
}
/** Open a Jam tool: by default pops open a Floating Popup Window right over your current screen (with opacity, resize & ↗ Full Page).
 *  Pass `{ fullPage: true }` to navigate directly to the full Jam tab. */
export function openJam(
  page: 'jam' | 'strum' | 'flow' | 'solo' | 'tab' | 'find' | 'beats' | 'loop' = 'jam',
  opts: { fullPage?: boolean } = {},
) {
  if (page === 'tab') {
    try { localStorage.setItem('kg:exSection', JSON.stringify('make')) } catch { /* private */ }
    learnGo({ learn: 'exercises' })
    return
  }
  if (opts.fullPage) {
    setSubPage('jam', page === 'solo' ? 'jam' : page)
    go('progressions')
    return
  }
  openFloatingCard(JAM_PAGE_CARD[page] ?? 'strum')
}

export interface FlowOpenOpts {
  tonic?: string
  minor?: boolean
  startChord?: string
  capo?: number
  mode?: 'free' | 'pathfinder'
  view?: 'path' | 'vibe' | 'shift' | 'detect'
  targetTab?: 'jam' | 'chords'
  fullPage?: boolean
}

let pendingFlow: FlowOpenOpts | null = null
const flowListeners = new Set<(o: FlowOpenOpts) => void>()
export function onOpenFlow(f: (o: FlowOpenOpts) => void) {
  flowListeners.add(f)
  return () => { flowListeners.delete(f) }
}
export function takePendingFlow(): FlowOpenOpts | null {
  const o = pendingFlow
  pendingFlow = null
  return o
}

/** Open the Harmonic Flow Coach — floats as a popup by default (pass fullPage: true to navigate full-screen). */
export function openFlowCoach(opts: FlowOpenOpts = {}) {
  pendingFlow = opts
  flowListeners.forEach(f => f(opts))
  if (opts.fullPage) {
    if (opts.targetTab === 'chords') {
      try { localStorage.setItem('kg:chordsSubTab', JSON.stringify('flow')) } catch { /* private */ }
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('kg-chords-subtab', { detail: 'flow' }))
      }
      go('chords')
    } else {
      openJam('flow', { fullPage: true })
    }
    return
  }
  openFloatingCard('flow')
}

export interface StrumOpenOpts {
  chart?: StrumChart
  autoPlay?: boolean
  fullPage?: boolean
}
let pendingStrum: StrumOpenOpts | null = null
const strumListeners = new Set<(o: StrumOpenOpts) => void>()
export function onOpenStrum(f: (o: StrumOpenOpts) => void) {
  strumListeners.add(f)
  return () => { strumListeners.delete(f) }
}
export function takePendingStrum(): StrumOpenOpts | null {
  const o = pendingStrum
  pendingStrum = null
  return o
}

/** Open Strum Machine — pops open as a draggable, resizable, opacity-adjustable Floating Popup by default (pass fullPage: true for full tab). */
export function openStrumGrid(opts: StrumOpenOpts = {}) {
  pendingStrum = opts
  strumListeners.forEach(f => f(opts))
  if (opts.fullPage) {
    openJam('strum', { fullPage: true })
  } else {
    openFloatingCard('strum')
  }
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

// App-wide navigation: lets one screen send you to another (e.g. Learn → Play with a practice tab loaded).
import type { SongDoc } from './tabs/library'

export type Tab = 'learn' | 'play' | 'tuner' | 'metronome' | 'chords' | 'scales' | 'progressions'

const listeners = new Set<(t: Tab) => void>()
let pendingDoc: SongDoc | null = null

export function onGo(f: (t: Tab) => void) {
  listeners.add(f)
  return () => { listeners.delete(f) }
}
export function go(t: Tab) {
  listeners.forEach(f => f(t))
}
/** Open a song or practice tab in Play. */
export function openInPlay(doc: SongDoc) {
  pendingDoc = doc
  go('play')
}
/** Play calls this when it mounts: the tab another screen asked it to open, if any. */
export function takePendingDoc(): SongDoc | null {
  const d = pendingDoc
  pendingDoc = null
  return d
}

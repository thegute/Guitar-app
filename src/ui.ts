// App-wide view state that more than one screen cares about: whether the menu (side rail / bottom bar) is hidden,
// and whether Play's "Full tab" mode is on (which tucks the menu away too).
import { useSyncExternalStore } from 'react'

const NAV_KEY = 'kg:navHidden'
let navHidden = (() => { try { return localStorage.getItem(NAV_KEY) === '1' } catch { return false } })()
let playFocus = false
const ART_KEY = 'kg:showArt'
let showArt = (() => { try { return localStorage.getItem(ART_KEY) !== 'false' } catch { return true } })()
let version = 0
const listeners = new Set<() => void>()
const changed = () => { version++; listeners.forEach(f => f()) }
const subscribe = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }

export function isNavHidden() { return navHidden }
export function setNavHidden(v: boolean) {
  if (v === navHidden) return
  navHidden = v
  try { localStorage.setItem(NAV_KEY, v ? '1' : '0') } catch { /* storage unavailable */ }
  changed()
}
export function setPlayFocus(v: boolean) {
  if (v === playFocus) return
  playFocus = v
  changed()
}
export function isPlayFocus() { return playFocus }
export function setShowArt(v: boolean) {
  showArt = v
  try { localStorage.setItem(ART_KEY, v ? 'true' : 'false') } catch { /* storage unavailable */ }
  changed()
}

/** Re-render when the menu or Full tab state changes. */
export function useUi() {
  useSyncExternalStore(subscribe, () => version)
  return { navHidden, playFocus, showArt }
}

/** True while a CSS media query matches (e.g. the wide layout with the side rail). */
export function useMedia(q: string) {
  return useSyncExternalStore(
    f => { const m = matchMedia(q); m.addEventListener('change', f); return () => m.removeEventListener('change', f) },
    () => matchMedia(q).matches,
    () => false,
  )
}

// The phone's Back button (and the browser's Back on a computer): it closes whatever is on top (a sheet, the menu
// drawer, a picture, a celebration), then steps back inside a screen (a Learn page, picking loop bars, Full tab),
// then goes back to the section you came from. On Play with nothing open, a second press within two seconds
// leaves the app. Screens register what Back means for them with useBack.
import { useEffect, useRef } from 'react'

interface Handler { id: number; fn: () => void }
const handlers: Handler[] = []
let next = 0

/** While `active`, Back calls `fn` (the most recently opened thing goes first). */
export function useBack(active: boolean, fn: () => void) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!active) return
    const h = { id: ++next, fn: () => ref.current() }
    handlers.push(h)
    return () => { const i = handlers.indexOf(h); if (i >= 0) handlers.splice(i, 1) }
  }, [active])
}

/** Overlays that close when their backdrop is tapped. */
const OVERLAYS = '.sheet-backdrop, .nav-scrim, .art-viewer, .celebrate'

/** Close or step back from the top-most thing. True when something happened. */
export function backInside(): boolean {
  const overlays = document.querySelectorAll<HTMLElement>(OVERLAYS)
  const top = overlays[overlays.length - 1]
  if (top) { top.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true }
  const h = handlers[handlers.length - 1]
  if (h) { h.fn(); return true }
  return false
}

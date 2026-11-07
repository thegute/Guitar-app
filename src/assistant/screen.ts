// What you're looking at right now, in one or two plain lines, so the ✨ helper can answer "what scale works here?" or
// "why is this bar so hard?" without you explaining the page. Screens publish it; the helper reads the latest one.
// It never leaves the phone except as part of a question you send to the AI helper.
import { useEffect } from 'react'

export interface ScreenInfo {
  /** short label for the helper's "I can see" line, e.g. 'Play: "Salt and Static", bar 12' */
  label: string
  /** the details for the AI */
  summary: string
  /** what the helper is allowed to change here */
  can?: ('loop' | 'speed')[]
  /** Play only: where you are, for quick commands without an AI key ("slower", "loop this bar") */
  play?: { bar: number; bars: number; loop: { from: number; to: number } | null; speed: number; key: string; chord?: string }
}

const slots = new Map<string, { info: ScreenInfo; at: number }>()
let seq = 0

export function setScreenInfo(owner: string, info: ScreenInfo | null) {
  if (info) slots.set(owner, { info, at: ++seq })
  else slots.delete(owner)
}

/** The most recently updated screen that is still open. */
export function screenInfo(): ScreenInfo | null {
  let best: { info: ScreenInfo; at: number } | null = null
  for (const v of slots.values()) if (!best || v.at > best.at) best = v
  return best?.info ?? null
}

/** Publish while mounted; cleared when the screen closes. */
export function useScreenInfo(owner: string, info: ScreenInfo | null) {
  const key = info ? info.label + '\n' + info.summary + '\n' + JSON.stringify(info.play ?? null) : ''
  useEffect(() => {
    setScreenInfo(owner, info)
  }, [owner, key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => setScreenInfo(owner, null), [owner])
}

// ---- spoken / typed commands a screen understands without any AI ("record track 2", "switch to the chorus")
const commands = new Map<string, { run: (q: string) => string | null; at: number }>()
/** While mounted, the helper tries this screen's commands first; return a reply when it did something, else null. */
export function useScreenCommands(owner: string, run: (q: string) => string | null) {
  useEffect(() => {
    commands.set(owner, { run, at: ++seq })
    return () => { commands.delete(owner) }
  }, [owner, run])
}
/** The newest screen's answer to a command, or null. */
export function screenCommand(q: string): string | null {
  const list = [...commands.values()].sort((a, b) => b.at - a.at)
  for (const c of list) { const r = c.run(q); if (r) return r }
  return null
}

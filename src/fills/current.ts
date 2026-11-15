// The fills workshop you're on (style, progression, steps), kept so the Practice button, Learn → Today and the coach can
// point at your next step without opening the workshop.
import { songStats } from '../play/songStats'
import type { Target } from '../search/types'

export interface CurrentFills { style: string; label: string; steps: { id: string; title: string; docId: string }[]; at: number }
const KEY = 'kg:fills:current'
export function saveCurrentFills(c: Omit<CurrentFills, 'at'>) {
  try {
    const old = loadCurrentFills()
    // only rewrite when something changed (the workshop re-renders a lot)
    if (old && old.style === c.style && old.label === c.label && old.steps.length === c.steps.length && old.steps.every((s, i) => s.docId === c.steps[i].docId)) return
    localStorage.setItem(KEY, JSON.stringify({ ...c, at: Date.now() }))
  } catch { /* storage */ }
}
export function loadCurrentFills(): CurrentFills | null { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null } }

/** Your next fills step: the first one not yet at 90%, with where to open it (the step itself once you've played it,
 *  else the workshop). Null when you haven't started a workshop or have finished this one. */
export function nextFills(c = loadCurrentFills()): { title: string; why: string; target: Target; started: boolean } | null {
  if (!c) return null
  const stats = c.steps.map(s => songStats(s.docId))
  const started = stats.some(s => !!s)
  const k = c.steps.findIndex((_, i) => (stats[i]?.best ?? 0) < 90)
  if (k < 0) return null
  const st = c.steps[k], played = !!stats[k]
  return {
    title: `Fills: ${st.title.replace(/^\d+\.\s*/, '')}`,
    why: played ? `${c.label}: your best so far is ${stats[k]!.best}%; 90% moves you on` : `${c.label}: your next step`,
    target: played ? { go: { song: st.docId, loop: null } } : { go: { tool: 'fills' } },
    started,
  }
}

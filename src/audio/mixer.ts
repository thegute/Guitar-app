// The mixer card's mute and solo (Band behind me): your part and each part of the band. Levels live on the buses
// (audio/engine.ts, remembered); mute and solo are for right now (they reset when the app restarts).
import { setBusMuted, type BusName } from './engine'

export type MixPart = 'me' | 'drums' | 'bass' | 'other'
export const MIX_PARTS: { id: MixPart; label: string }[] = [
  { id: 'me', label: 'Your part' }, { id: 'drums', label: 'Drums' }, { id: 'bass', label: 'Bass' }, { id: 'other', label: 'Other parts' },
]
const muted = new Set<MixPart>()
const solo = new Set<MixPart>()
const listeners = new Set<() => void>()
export function onMixer(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } }
function apply() {
  for (const p of MIX_PARTS) setBusMuted(p.id as BusName, muted.has(p.id) || (solo.size > 0 && !solo.has(p.id)))
  listeners.forEach(f => f())
}
export const isMuted = (p: MixPart) => muted.has(p)
export const isSolo = (p: MixPart) => solo.has(p)
export function toggleMute(p: MixPart) { if (muted.has(p)) muted.delete(p); else muted.add(p); apply() }
export function toggleSolo(p: MixPart) { if (solo.has(p)) solo.delete(p); else solo.add(p); apply() }
/** What you'd hear of this part now (for the row's dimmed look). */
export const audible = (p: MixPart) => !muted.has(p) && (solo.size === 0 || solo.has(p))
export function resetMixer() { muted.clear(); solo.clear(); apply() }

// Leaving a page stops whatever it was playing (a tab preview, an exercise, a jam loop, a beat, the metronome, a
// drone, the helper's voice). Players add themselves while they play; App, Learn and Songs call stopAllSounds() when
// you move to another page. Settings → Sound can keep the metronome going while you look around.
interface Stoppable { stop(): void; kind?: string; /** true = keep playing across pages (the looper with loops in it) */ keep?: () => boolean }
const live = new Set<Stoppable>()
const labels = new Map<Stoppable, string>()
const extra = new Set<() => void>()
const watchers = new Set<() => void>()
const changed = () => watchers.forEach(f => { try { f() } catch { /* noop */ } })
/** A player started (call from its start/play). `label` names it in the "playing" pill (Metronome, Jam band …). */
export function liveSound(p: Stoppable, label?: string) { queueMicrotask(() => { live.add(p); if (label) labels.set(p, label); changed() }) }
/** A player stopped by itself. */
export function quietSound(p: Stoppable) { live.delete(p); labels.delete(p); changed() }
/** What is making sound right now, by name (the "playing" pill: never lose track of a sound you started). */
export function liveLabels(): string[] { return [...new Set([...live].map(p => labels.get(p) ?? (p.kind === 'metronome' ? 'Metronome' : 'Sound')))] }
export function onLiveChange(f: () => void) { watchers.add(f); return () => { watchers.delete(f) } }
/** The pill's Stop: everything, including what normally keeps going across pages (the metronome, the looper). */
export function stopEverything() {
  for (const p of [...live]) { try { p.stop() } catch { /* already stopped */ } live.delete(p); labels.delete(p) }
  extra.forEach(f => { try { f() } catch { /* noop */ } })
  changed()
}
/** Something else that should stop on leaving a page (a video, the helper's voice); returns an unsubscribe. */
export function onLeavePage(f: () => void) { extra.add(f); return () => { extra.delete(f) } }
const keepMetronome = () => { try { return localStorage.getItem('kg:keepMetronome') === 'true' } catch { return false } }
export function stopAllSounds() {
  const keep = keepMetronome()
  for (const p of [...live]) {
    if (keep && p.kind === 'metronome') continue
    if (p.keep?.()) continue
    try { p.stop() } catch { /* already stopped */ }
    live.delete(p); labels.delete(p)
  }
  extra.forEach(f => { try { f() } catch { /* noop */ } })
  changed()
}

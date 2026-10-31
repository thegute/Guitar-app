// Leaving a page stops whatever it was playing (a tab preview, an exercise, a jam loop, a beat, the metronome, a
// drone, the helper's voice). Players add themselves while they play; App, Learn and Songs call stopAllSounds() when
// you move to another page. Settings → Sound can keep the metronome going while you look around.
interface Stoppable { stop(): void; kind?: string }
const live = new Set<Stoppable>()
const extra = new Set<() => void>()
/** A player started (call from its start/play). */
export function liveSound(p: Stoppable) { queueMicrotask(() => live.add(p)) }
/** A player stopped by itself. */
export function quietSound(p: Stoppable) { live.delete(p) }
/** Something else that should stop on leaving a page (a video, the helper's voice); returns an unsubscribe. */
export function onLeavePage(f: () => void) { extra.add(f); return () => { extra.delete(f) } }
const keepMetronome = () => { try { return localStorage.getItem('kg:keepMetronome') === 'true' } catch { return false } }
export function stopAllSounds() {
  const keep = keepMetronome()
  for (const p of [...live]) {
    if (keep && p.kind === 'metronome') continue
    try { p.stop() } catch { /* already stopped */ }
    live.delete(p)
  }
  extra.forEach(f => { try { f() } catch { /* noop */ } })
}

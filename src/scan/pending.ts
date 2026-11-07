// A sound handed to the Riff Scanner from another screen (a looper track: "Turn it into a tab"): Notes from a
// recording picks it up when it opens and scans it straight away.
let pending: { x: Float32Array; sr: number; title: string } | null = null
export function setPendingSound(p: { x: Float32Array; sr: number; title: string }) {
  pending = p
  try { localStorage.setItem('kg:scanMode', JSON.stringify('listen')) } catch { /* noop */ }
}
export function takePendingSound() { const p = pending; pending = null; return p }

// The play-along mix: one slider between "Your part" (the guide: the tab you're playing, played for you) and "Band" (the
// song's other instruments). Middle = both at full. It sets the `me` and `band` buses (audio/engine.ts), so it works for
// every feature that plays a song along with you, now and after the Stage 3 engine (notes/AUDIO-ENGINE.md).
import { useState } from 'react'
import { setBusLevel } from '../audio/engine'

/** 0 = only your part, 100 = only the band, 50 = both full. */
export function mixLevels(v: number): { me: number; band: number } {
  const x = Math.max(0, Math.min(100, v))
  return { me: Math.min(1, (100 - x) / 50), band: Math.min(1, x / 50) }
}
function readSolo(): number {
  try { const v = Number(localStorage.getItem('kg:mixSolo')); if (localStorage.getItem('kg:mixSolo') !== null && v >= 0 && v <= 100) return v } catch { /* private */ }
  return 100
}
function readMix(): number {
  try { const v = Number(localStorage.getItem('kg:mix')); if (localStorage.getItem('kg:mix') !== null && v >= 0 && v <= 100) return v } catch { /* private */ }
  return 50
}

export function MixSlider({ band = true, compact }: { band?: boolean; compact?: boolean }) {
  const [v, setV] = useState(readMix)
  const [solo, setSolo] = useState(readSolo)
  if (!band) {
    // no other instruments in this song: just how loud your part plays
    return (
      <label className={`mix-slider${compact ? ' compact' : ''}`} data-testid="mix-slider">
        <span className="small">Your part</span>
        <input type="range" min={0} max={100} value={solo} aria-label="How loud your part plays along"
          onChange={e => { const n = Number(e.target.value); setSolo(n); try { localStorage.setItem('kg:mixSolo', String(n)) } catch { /* private */ } setBusLevel('me', n / 100) }} data-testid="mix-range" />
        <span className="small tabular mix-val">{solo}%</span>
      </label>
    )
  }
  const set = (n: number) => {
    setV(n)
    try { localStorage.setItem('kg:mix', String(n)) } catch { /* private */ }
    const l = mixLevels(n)
    setBusLevel('me', l.me); setBusLevel('band', l.band)
  }
  const say = v <= 3 ? 'Only your part' : v >= 97 ? 'Only the band' : Math.abs(v - 50) <= 3 ? 'Both' : v < 50 ? 'More of your part' : 'More band'
  return (
    <label className={`mix-slider${compact ? ' compact' : ''}`} data-testid="mix-slider" title="Slide left to hear more of your part, right for more of the band. Double tap: both.">
      <span className="small">Your part</span>
      <input type="range" min={0} max={100} value={v} aria-label="Mix between your part and the band" aria-valuetext={say}
        onChange={e => set(Number(e.target.value))} onDoubleClick={() => set(50)} data-testid="mix-range" />
      <span className="small">Band</span>
      {!compact && <span className="small muted mix-val">{say}</span>}
    </label>
  )
}

/** Put the saved mix on the buses when a play-along starts (`band`: the song has other instruments). */
export function applyMix(band: boolean) {
  if (!band) { setBusLevel('me', readSolo() / 100); return }
  const l = mixLevels(readMix())
  setBusLevel('me', l.me); setBusLevel('band', l.band)
}

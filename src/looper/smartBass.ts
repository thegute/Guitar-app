// Smart bass: the bass line you played on your guitar, heard note by note, played back by a real recorded bass
// (the Studio Bass packs, else the built-in bass). The notes are kept in beats, so a tempo change just plays them
// faster or slower with nothing stretched.

/** One note of the line: start and length in beats from the loop's start, MIDI (bass register), loudness 0…1. */
export interface BassNote { b: number; d: number; m: number; v: number }

/** A heard note (Basic Pitch): seconds and MIDI as played on the guitar. */
export interface Heard { start: number; dur: number; midi: number; amp: number }

/**
 * Heard notes → a clean one-note-at-a-time bass line:
 *  - notes starting together (a chord, or the detector hearing an overtone) → the lowest one
 *  - the guitar an octave down (a bass sounds an octave below where you played it), then folded into 28–55 (E1–G3)
 *  - each start pulled `pull` of the way onto the nearest 16th (0 = as played, 1 = exactly on the grid)
 *  - a note ends where the next begins at the latest, never shorter than a 32nd
 *  - ghost notes (much quieter than the line's typical note) dropped
 */
export function bassLine(heard: Heard[], beatSec: number, loopBeats: number, pull = 0.5): BassNote[] {
  if (!heard.length) return []
  const sorted = heard.filter(h => h.dur > 0.03).sort((a, b) => a.start - b.start || a.midi - b.midi)
  const groups: Heard[] = []
  for (const h of sorted) {
    const last = groups[groups.length - 1]
    if (last && h.start - last.start < 0.05) { if (h.midi < last.midi) groups[groups.length - 1] = { ...h, amp: Math.max(h.amp, last.amp) }; continue }
    groups.push(h)
  }
  const amps = groups.map(g => g.amp).sort((a, b) => a - b)
  const typical = amps[Math.floor(amps.length * 0.6)] ?? 1
  const out: BassNote[] = []
  for (const g of groups) {
    if (g.amp < typical * 0.25) continue
    let m = g.midi - 12
    while (m > 55) m -= 12
    while (m < 28) m += 12
    const b0 = g.start / beatSec
    const grid = Math.round(b0 * 4) / 4
    const b = b0 + (grid - b0) * pull
    if (b < -0.05 || b >= loopBeats) continue
    out.push({ b: Math.max(0, b), d: g.dur / beatSec, m, v: Math.min(1, 0.55 + 0.45 * (g.amp / (typical || 1)) * 0.7) })
  }
  for (let k = 0; k < out.length; k++) {
    const next = k + 1 < out.length ? out[k + 1].b : loopBeats
    out[k].d = Math.max(0.125, Math.min(out[k].d, next - out[k].b - 0.02))
  }
  return out
}

/** The notes that start inside [from, to) beats of the loop (for scheduling one pass). */
export const notesIn = (notes: BassNote[], from: number, to: number) => notes.filter(n => n.b >= from - 1e-6 && n.b < to - 1e-6)

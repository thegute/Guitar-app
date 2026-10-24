// Bass lines for Jam: a recorded electric bass following the chords, in a pattern that suits the style
// (driving eighths, metal sixteenths with the kick, walking jazz lines, reggae, bossa, country root-fifth ...).
import { playBass, type Handle } from './pluck'

/** A bass note: R root, 3 the chord's third, 5 fifth, 6 sixth, 7 the chord's seventh (or b7), 8 octave, W walking, A approach into the next chord */
type Deg = 'R' | '3' | '5' | '6' | '7' | '8' | 'W' | 'A'
/** [beat in the bar, note, length in beats, level] */
type BHit = [number, Deg, number, number]
export interface BassLine { id: string; label: string; hits: BHit[]; /** mix level (reggae bass sits up front) */ level?: number }

const eighths = (d: Deg, len = 0.45, acc = 1): BHit[] => [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(b => [b, d, len, b % 1 ? 0.78 * acc : acc])
const S = 2 / 3 // swung eighth

export const BASSLINES: BassLine[] = [
  { id: 'root8', label: 'Driving eighths (rock)', hits: eighths('R') },
  { id: 'pop', label: 'Pop', hits: [[0, 'R', 1.4, 1], [1.5, 'R', 0.45, 0.75], [2, '5', 0.9, 0.85], [3, '8', 0.45, 0.8], [3.5, '5', 0.45, 0.7]] },
  { id: 'metal', label: 'Metal (with the double kick)', hits: Array.from({ length: 16 }, (_, i) => [i / 4, 'R', 0.22, i % 4 === 0 ? 1 : 0.8] as BHit) },
  { id: 'gallop', label: 'Metal gallop', hits: [0, 1, 2, 3].flatMap(b => [[b, 'R', 0.45, 1], [b + 0.5, 'R', 0.22, 0.8], [b + 0.75, 'R', 0.22, 0.8]] as BHit[]) },
  { id: 'ballad', label: 'Long notes (ballad)', hits: [[0, 'R', 1.9, 1], [2, '5', 1.4, 0.8], [3.5, 'R', 0.45, 0.6]] },
  { id: 'halftime', label: 'Half-time', hits: [[0, 'R', 1.6, 1], [1.75, 'R', 0.4, 0.7], [2.5, '5', 1.2, 0.85]] },
  { id: 'country', label: 'Root–fifth (country)', hits: [[0, 'R', 0.9, 1], [2, '5', 0.9, 0.9]] },
  { id: 'boogie', label: 'Blues boogie (shuffle)', hits: [[0, 'R', S - 0.05, 1], [S, '3', 0.3, 0.7], [1, '5', S - 0.05, 0.9], [1 + S, '6', 0.3, 0.7], [2, '7', S - 0.05, 0.95], [2 + S, '6', 0.3, 0.7], [3, '5', S - 0.05, 0.9], [3 + S, '3', 0.3, 0.7]] },
  { id: 'walk', label: 'Walking (jazz)', hits: [[0, 'R', 0.9, 1], [1, 'W', 0.9, 0.85], [2, 'W', 0.9, 0.9], [3, 'A', 0.9, 0.85]] },
  { id: 'bossa', label: 'Bossa nova', hits: [[0, 'R', 1.4, 1], [1.5, '5', 0.45, 0.8], [2, '5', 1.4, 0.9], [3.5, 'R', 0.45, 0.8]] },
  { id: 'funk', label: 'Funk', hits: [[0, 'R', 0.2, 1], [0.75, 'R', 0.2, 0.75], [1, '8', 0.15, 0.9], [1.75, '7', 0.2, 0.7], [2, 'R', 0.2, 0.95], [2.5, 'R', 0.2, 0.7], [2.75, '5', 0.2, 0.8], [3.5, '8', 0.15, 0.9], [3.75, '7', 0.2, 0.7]] },
  { id: 'disco', label: 'Octaves (disco)', hits: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(b => [b, b % 1 ? '8' : 'R', 0.4, b % 1 ? 0.8 : 1] as BHit) },
  { id: 'reggae', level: 1.6, label: 'Reggae one drop', hits: [[0.5, 'R', 0.45, 0.85], [1, 'R', 0.9, 1], [2.5, '3', 0.45, 0.8], [3, '5', 0.9, 0.9]] },
  { id: 'lofi', label: 'Laid back (lo-fi)', hits: [[0, 'R', 1.4, 1], [1.75, 'R', 0.5, 0.7], [2.5, '5', 1.2, 0.85]] },
]
export const bassLine = (id: string) => BASSLINES.find(b => b.id === id)

export interface BassChord { root: number; tones: number[] }

/** The bass note for a degree of a chord, in the low register (E1 up to about D#2 for the root). */
export function bassMidi(deg: Deg, c: BassChord, next: BassChord | null, beat: number, prevMidi: number | null): number {
  const R = 28 + ((c.root - 4 + 12) % 12) // E1..D#2
  const has = (iv: number) => c.tones.includes(iv)
  const third = has(3) && !has(4) ? 3 : has(4) ? 4 : has(5) ? 5 : 4
  const fifth = has(7) ? 7 : has(6) ? 6 : has(8) ? 8 : 7
  const seventh = has(10) ? 10 : has(11) ? 11 : has(9) ? 9 : 10
  switch (deg) {
    case 'R': return R
    case '3': return R + third
    case '5': return R + fifth
    case '6': return R + 9
    case '7': return R + seventh
    case '8': return R + 12
    case 'W': {
      // a chord tone near the last note, moving on
      const pool = [R + third, R + fifth, R + 12, R + seventh, R + fifth - 12].filter(m => m >= 28 && m <= 52 && m !== prevMidi)
      const from = prevMidi ?? R
      pool.sort((a, b) => Math.abs(a - from) - Math.abs(b - from))
      return pool[beat === 1 ? 0 : Math.min(1, pool.length - 1)] ?? R + fifth
    }
    case 'A': {
      // a half step below or above the next chord's root
      const target = next ? 28 + ((next.root - 4 + 12) % 12) : R
      const from = prevMidi ?? R
      const up = target + 12 <= 52 && Math.abs(target + 12 - from) < Math.abs(target - from) ? target + 12 : target
      return from > up ? up + 1 : up - 1
    }
  }
}

/** Play the bass hits of one beat [pos, pos+1) of a bar. `chordAt(beatOffset)` gives the chord sounding then. */
export class BassPlayer {
  private last: Handle | null = null
  private lastMidi: number | null = null
  stop(at?: number) { this.last?.stop(at); this.last = null }
  beat(lineId: string, pos: number, when: number, spb: number, level: number, dest: AudioNode,
    chordAt: (beatOffset: number) => { c: BassChord; next: BassChord | null } | null) {
    const line = bassLine(lineId)
    if (!line) return
    for (const [p, deg, len, lv] of line.hits) {
      if (p < pos || p >= pos + 1) continue
      const t = when + (p - pos) * spb
      const at = chordAt(p - pos)
      if (!at) continue
      const m = bassMidi(deg, at.c, at.next, Math.floor(p), this.lastMidi)
      // one string at a time: a new note stops the last one
      this.last?.stop(t)
      const h = playBass(m, t, 0.85 * lv * level * (line.level ?? 1), dest)
      h.stop(t + len * spb)
      this.last = h
      this.lastMidi = m
    }
  }
}

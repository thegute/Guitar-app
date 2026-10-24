// Strum coach: the strum pattern drawn over chord sheets (↓ ↑ arrows with the count under them), and the strums
// laid out on the In time timeline so each one is timed. The mic can't tell a downstroke from an upstroke
// reliably, so only the timing is checked; the arrows show which way to go.

/** D down · U up · B bass note (boom-chick) · X a short muted chop (reggae) */
export type Stroke = 'D' | 'U' | 'B' | 'X'
export interface StrumPattern { id: string; label: string; meter: 3 | 4; how: string; hits: [number, Stroke][] }

export const STRUM_PATTERNS: StrumPattern[] = [
  { id: 'down', label: 'Four downstrokes', meter: 4, how: 'One down on every beat. Start here: steady beats matter more than fancy patterns.', hits: [[0, 'D'], [1, 'D'], [2, 'D'], [3, 'D']] },
  { id: 'folk', label: 'Old faithful (D DU UDU)', meter: 4, how: 'Down, down-up, up-down-up. Keep your hand moving down and up all the time, and only touch the strings where the arrows are.', hits: [[0, 'D'], [1, 'D'], [1.5, 'U'], [2.5, 'U'], [3, 'D'], [3.5, 'U']] },
  { id: 'eighths', label: 'Down-up eighths', meter: 4, how: 'Down on the beat, up on the "and", eight strums a bar.', hits: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(b => [b, b % 1 ? 'U' : 'D'] as [number, Stroke]) },
  { id: 'boomchick', label: 'Boom-chick (bass, strum)', meter: 4, how: 'Pick the bass note on 1 and 3, strum the top strings on 2 and 4.', hits: [[0, 'B'], [1, 'D'], [2, 'B'], [3, 'D']] },
  { id: 'carter', label: 'Boom-chicka (bass, down-up)', meter: 4, how: 'Bass note, then a quick down-up strum, twice a bar.', hits: [[0, 'B'], [1, 'D'], [1.5, 'U'], [2, 'B'], [3, 'D'], [3.5, 'U']] },
  { id: 'onedrop', label: 'One drop chops (2 and 4)', meter: 4, how: 'Short muted chops on 2 and 4 only. Relax the fretting hand right after each one.', hits: [[1, 'X'], [3, 'X']] },
  { id: 'rockers', label: 'Skank on every "and"', meter: 4, how: 'A short chop on every "and" (between the beats).', hits: [[0.5, 'X'], [1.5, 'X'], [2.5, 'X'], [3.5, 'X']] },
  { id: 'waltz', label: 'Waltz (D DU DU)', meter: 3, how: 'Down on 1, then down-up on 2 and on 3.', hits: [[0, 'D'], [1, 'D'], [1.5, 'U'], [2, 'D'], [2.5, 'U']] },
  { id: 'waltzbass', label: 'Waltz bass-strum', meter: 3, how: 'Bass note on 1, strums on 2 and 3.', hits: [[0, 'B'], [1, 'D'], [2, 'D']] },
  { id: 'waltzdown', label: 'Three downstrokes', meter: 3, how: 'One down on each beat: 1, 2, 3.', hits: [[0, 'D'], [1, 'D'], [2, 'D']] },
]

export const strumPattern = (id?: string) => STRUM_PATTERNS.find(p => p.id === id)
/** Patterns that fit a song in this meter (2/4 tunes count in 4). */
export const patternsFor = (meter = 4) => STRUM_PATTERNS.filter(p => p.meter === (meter === 3 ? 3 : 4))

/** The count for a position in the bar: 1 2 3 4 on beats, & between, e / a on sixteenths. */
export function countLabel(offset: number): string {
  const beat = Math.floor(offset + 1e-6)
  const frac = Math.round((offset - beat) * 12) / 12
  if (frac < 1e-6) return String(beat + 1)
  if (Math.abs(frac - 0.5) < 1e-6) return '&'
  if (Math.abs(frac - 0.25) < 1e-6) return 'e'
  if (Math.abs(frac - 0.75) < 1e-6) return 'a'
  if (Math.abs(frac - 1 / 3) < 1e-6) return 'trip'
  if (Math.abs(frac - 2 / 3) < 1e-6) return 'let'
  return ''
}

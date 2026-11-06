// The neck in real distances: frets get closer together up the neck (each one is 1/17.8 shorter than the last),
// so a four-fret stretch at fret 1 is far wider than at fret 12. Everything about reach is measured in millimetres.

/** scale length (nut to saddle) per instrument, mm */
export const SCALE_MM: Record<string, number> = { guitar: 648, tenor: 432, baritone: 483 }
export const scaleFor = (nStr: number, inst?: string) => (inst && SCALE_MM[inst]) || (nStr === 4 ? 432 : 648)

/** distance from the nut to fret wire f */
export const fretMM = (f: number, L: number) => L * (1 - Math.pow(2, -f / 12))
/** where a fingertip presses for fret f: just behind the fret wire */
export const spotMM = (f: number, L: number) => (f <= 0 ? 0 : fretMM(f, L) - 0.3 * (fretMM(f, L) - fretMM(f - 1, L)))
/** distance between the fingertips for frets a and b */
export const spanMM = (a: number, b: number, L: number) => Math.abs(spotMM(Math.max(a, 1), L) - spotMM(Math.max(b, 1), L))

export type HandSize = 'small' | 'medium' | 'large'
/** a comfortable index-to-pinky spread, mm (medium: four frets from about fret 3 up) */
export const REACH: Record<HandSize, number> = { small: 78, medium: 90, large: 104 }

const KEY = 'kg:hand'
export function handSize(): HandSize {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { size?: HandSize } | null; if (v?.size && v.size in REACH) return v.size } catch { /* default */ }
  return 'medium'
}
export function setHandSize(size: HandSize) {
  try { localStorage.setItem(KEY, JSON.stringify({ size })) } catch { /* storage full */ }
  dispatchEvent(new Event('kg-hand'))
}

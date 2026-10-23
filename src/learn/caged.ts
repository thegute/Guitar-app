// The CAGED system (CAGFD on tenor ukulele): the five open-chord shapes moved up the neck.
// For any chord they tile the whole fretboard; each shape also holds an arpeggio, a scale box and triads.
import type { Instrument } from '../instrument'

export interface CagedShape {
  letter: string
  /** absolute fret per string, -1 = not played */
  frets: number[]
  /** strings + frets that hold the root */
  roots: { s: number; f: number }[]
  lo: number
  hi: number
}

/** Guitar shapes relative to the root fret r on the root string. Major and minor. */
const GUITAR: Record<'maj' | 'min', { letter: string; rootString: number; minR: number; frets: (r: number) => number[] }[]> = {
  maj: [
    { letter: 'C', rootString: 1, minR: 3, frets: r => [-1, r, r - 1, r - 3, r - 2, r - 3] },
    { letter: 'A', rootString: 1, minR: 0, frets: r => [-1, r, r + 2, r + 2, r + 2, r] },
    { letter: 'G', rootString: 0, minR: 3, frets: r => [r, r - 1, r - 3, r - 3, r - 3, r] },
    { letter: 'E', rootString: 0, minR: 0, frets: r => [r, r + 2, r + 2, r + 1, r, r] },
    { letter: 'D', rootString: 2, minR: 0, frets: r => [-1, -1, r, r + 2, r + 3, r + 2] },
  ],
  min: [
    { letter: 'C', rootString: 1, minR: 3, frets: r => [-1, r, r - 2, r - 3, r - 2, -1] },
    { letter: 'A', rootString: 1, minR: 0, frets: r => [-1, r, r + 2, r + 2, r + 1, r] },
    { letter: 'G', rootString: 0, minR: 3, frets: r => [r, r - 2, r - 3, r - 3, r, r] },
    { letter: 'E', rootString: 0, minR: 0, frets: r => [r, r + 2, r + 2, r, r, r] },
    { letter: 'D', rootString: 2, minR: 0, frets: r => [-1, -1, r, r + 2, r + 3, r + 1] },
  ],
}
/** Tenor ukulele (GCEA): the CAGFD shapes. */
const UKE: Record<'maj' | 'min', { letter: string; rootString: number; minR: number; frets: (r: number) => number[] }[]> = {
  maj: [
    { letter: 'C', rootString: 3, minR: 3, frets: r => [r - 3, r - 3, r - 3, r] },
    { letter: 'A', rootString: 0, minR: 2, frets: r => [r, r - 1, r - 2, r - 2] },
    { letter: 'G', rootString: 2, minR: 3, frets: r => [r - 3, r - 1, r, r - 1] },
    { letter: 'F', rootString: 2, minR: 1, frets: r => [r + 1, r - 1, r, r - 1] },
    { letter: 'D', rootString: 1, minR: 2, frets: r => [r, r, r, r - 2] },
  ],
  min: [
    { letter: 'C', rootString: 3, minR: 4, frets: r => [r - 3, r - 3, r - 4, r] },
    { letter: 'A', rootString: 0, minR: 2, frets: r => [r, r - 2, r - 2, r - 2] },
    { letter: 'G', rootString: 2, minR: 3, frets: r => [r - 3, r - 1, r, r - 2] },
    { letter: 'F', rootString: 2, minR: 1, frets: r => [r, r - 1, r, r + 2] },
    { letter: 'D', rootString: 1, minR: 2, frets: r => [r, r, r - 1, r - 2] },
  ],
}

/** The five shapes of a major or minor chord, ordered up the neck from the lowest. */
export function cagedShapes(rootPc: number, minor: boolean, inst: Instrument): CagedShape[] {
  const q = minor ? 'min' : 'maj'
  const uke = inst.id === 'tenor'
  // the shapes are defined for standard tuning (baritone = a guitar's top four strings)
  const guitarMidis = [40, 45, 50, 55, 59, 64]
  const defs = uke ? UKE[q] : GUITAR[q]
  const openOf = (s: number) => (uke ? [67, 60, 64, 69][s] : guitarMidis[s])
  const std = uke ? [67, 60, 64, 69] : inst.id === 'baritone' ? guitarMidis.slice(2) : guitarMidis
  // other tunings (half step down, drop D ...): move each string's fret so it still plays the same note
  const adj = std.map((m, s) => { const d = (((m - inst.midis[s]) % 12) + 12) % 12; return d > 6 ? d - 12 : d })
  const out: CagedShape[] = []
  for (const d of defs) {
    let r = (rootPc - openOf(d.rootString) + 120) % 12
    while (r < d.minR) r += 12
    for (const rr of [r, r + 12]) {
      let frets = d.frets(rr)
      if (inst.id === 'baritone') {
        frets = frets.slice(2)
        // the guitar's minor G shape keeps its 3rd on the A string; on four strings take it on the B string instead
        if (minor && d.letter === 'G') {
          if (rr - 4 < 0) continue
          frets = [frets[0], frets[1], rr - 4, frets[3]]
        }
      }
      frets = frets.map((f, s) => (f < 0 ? f : f + adj[s]))
      if (frets.some(f => f > 18 || f < -1)) continue
      if (frets.some(f => f === -1) && frets.filter(f => f >= 0).length < (inst.id === 'guitar' ? 4 : 3)) continue
      const played = frets.filter(f => f >= 0)
      if (!played.length) continue
      const midis = inst.midis
      const roots = frets.map((f, s) => ({ s, f })).filter(x => x.f >= 0 && (midis[x.s] + x.f) % 12 === rootPc)
      out.push({ letter: d.letter, frets, roots, lo: Math.min(...played), hi: Math.max(...played) })
      if (rr + 12 > 14) break
    }
  }
  // keep one of each letter, the lowest that is at least partly in the first 15 frets
  const best = new Map<string, CagedShape>()
  for (const s of out.sort((a, b) => a.lo - b.lo)) if (!best.has(s.letter) && s.lo <= 14) best.set(s.letter, s)
  return [...best.values()].sort((a, b) => a.lo - b.lo || a.hi - b.hi)
}

/** The fret window a shape covers (for scales/arpeggios "inside" it). */
export function shapeWindow(s: CagedShape): [number, number] {
  return [Math.max(0, s.lo - 1), s.hi + 1]
}

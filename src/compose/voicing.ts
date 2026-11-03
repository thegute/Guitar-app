// Chord shapes for any tuning (open G slack key, drop D, ukulele …): the root in the bass, chord notes on the other
// strings within a four-fret hand span, open strings where they belong, near a chosen part of the neck.
import { mod } from './harmony'

export interface Shape { frets: number[] /* per string, low first; -1 = not played */; midi: number[] }

export function findShape(pcs: number[], root: number, tuning: number[], near = 0, opts: { minStrings?: number; top?: number; noOpen?: boolean } = {}): Shape | null {
  const n = tuning.length
  const minStrings = opts.minStrings ?? Math.min(4, n)
  let best: { s: Shape; cost: number } | null = null
  for (let p = Math.max(0, near - 5); p <= near + 7 && p <= 15; p++) {
    // the bass: the lowest string that can play the root in this window
    for (let bassS = 0; bassS < Math.min(3, n - 2); bassS++) {
      const bf = [...(opts.noOpen ? [] : [0]), ...range(Math.max(1, p), p + 3)].find(f => mod(tuning[bassS] + f) === root)
      if (bf === undefined) continue
      const frets = tuning.map(() => -1)
      frets[bassS] = bf
      let have = new Set<number>([root])
      for (let s = bassS + 1; s < n; s++) {
        const opts2 = [...(opts.noOpen ? [] : [0]), ...range(Math.max(1, p), p + 3)].filter(f => pcs.includes(mod(tuning[s] + f)))
        if (!opts2.length) continue
        // prefer a note not yet in the chord, then the lowest fret near the window
        opts2.sort((a, b) => (have.has(mod(tuning[s] + a)) ? 1 : 0) - (have.has(mod(tuning[s] + b)) ? 1 : 0) || Math.abs((a || p) - p) - Math.abs((b || p) - p))
        frets[s] = opts2[0]
        have = new Set([...have, mod(tuning[s] + opts2[0])])
      }
      const used = frets.filter(f => f >= 0).length
      if (used < minStrings) continue
      // no gaps above the bass (a dead string in the middle is hard to strum)
      const gaps = frets.slice(bassS).filter(f => f < 0).length
      const fretted = frets.filter(f => f > 0)
      const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0
      if (span > 3) continue
      const missing = pcs.filter(x => !have.has(x)).length
      const cost = missing * 3 + gaps * 2 + Math.abs(p - near) * .4 + bassS * .3 + (opts.top !== undefined ? Math.abs(tuning[n - 1] + Math.max(0, frets[n - 1]) - opts.top) * .1 : 0)
      if (!best || cost < best.cost) best = { s: { frets, midi: frets.map((f, s) => (f >= 0 ? tuning[s] + f : -1)) }, cost }
    }
  }
  return best?.s ?? null
}
const range = (a: number, b: number) => { const o: number[] = []; for (let i = a; i <= b; i++) o.push(i); return o }

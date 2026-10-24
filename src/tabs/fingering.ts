// Where to play a melody on the neck: each note gets a string and fret. Prefers first position with open strings
// (how fiddle tunes and folk melodies are taught), moves up the neck only when a note is out of reach, and stays in
// a position once there rather than jumping about. One finger per fret: position p covers frets p..p+3.

export interface Placed { string: number; fret: number; midi: number }

const MAX_FRET = 15

/** Fingering for a line of single notes (null = rest) on an instrument tuned to `tuning` (MIDI, lowest string first). */
export function fingerMelody(midis: (number | null)[], tuning: number[], opts: { maxFret?: number; minFret?: number } = {}): (Placed | null)[] {
  const maxFret = opts.maxFret ?? MAX_FRET
  const minFret = opts.minFret ?? 0
  const positions = Array.from({ length: 12 }, (_, i) => i + 1)
  const cands = (m: number) => tuning.map((open, s) => ({ string: s, fret: m - open, midi: m })).filter(c => c.fret >= minFret && c.fret <= maxFret)
  /** cost of playing candidate c with the hand at position p */
  const cost = (c: Placed, p: number) => {
    if (c.fret === 0) return p <= 5 ? 0 : 0.6 // open strings are free low down, awkward high up
    if (c.fret >= p && c.fret <= p + 3) return 0.02 * c.fret
    if (c.fret === p + 4 || c.fret === p - 1) return 0.8 // a stretch
    return Infinity
  }
  const notes = midis.map((m, i) => ({ m, i })).filter((x): x is { m: number; i: number } => x.m !== null)
  if (!notes.length) return midis.map(() => null)
  // Viterbi over hand positions
  type Cell = { cost: number; from: number; pick: Placed | null }
  const table: Cell[][] = []
  for (let k = 0; k < notes.length; k++) {
    const cs = cands(notes[k].m)
    const row: Cell[] = positions.map(p => {
      let best: Placed | null = null, bc = Infinity
      for (const c of cs) { const v = cost(c, p); if (v < bc || (v === bc && best && c.string > best.string)) { bc = v; best = c } }
      // prefer low positions a little
      const own = bc + 0.04 * (p - 1)
      if (k === 0) return { cost: own, from: -1, pick: best }
      let f = -1, fc = Infinity
      table[k - 1].forEach((prev, q) => {
        const move = q === positions.indexOf(p) ? 0 : 1.2 + 0.15 * Math.abs(positions[q] - p)
        if (prev.cost + move < fc) { fc = prev.cost + move; f = q }
      })
      return { cost: fc + own, from: f, pick: best }
    })
    // a note that can't be reached anywhere (outside the instrument): drop it from this position's options
    if (row.every(r => !Number.isFinite(r.cost))) row.forEach(r => { r.cost = (k ? Math.min(...table[k - 1].map(x => x.cost)) : 0) + 5; r.pick = cs[0] ?? null })
    table.push(row)
  }
  let at = table[table.length - 1].reduce((b, c, i, a) => (c.cost < a[b].cost ? i : b), 0)
  const picks: (Placed | null)[] = new Array(notes.length).fill(null)
  for (let k = notes.length - 1; k >= 0; k--) { picks[k] = table[k][at].pick; at = table[k][at].from < 0 ? at : table[k][at].from }
  const out: (Placed | null)[] = midis.map(() => null)
  notes.forEach((n, k) => { out[n.i] = picks[k] })
  return out
}

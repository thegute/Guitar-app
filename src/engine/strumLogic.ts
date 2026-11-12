// The strum engine (Stage 3): how a real hand sounds a chord. Pure logic (tested on its own); pluck.ts plays what it
// returns, so the same strum feel reaches every sound, built-in or from a pack.
//
// What a real strum does (and what Orange Tree's strum engine models: speed, velocity decay, string range, humanise):
// - the pick crosses the strings in a set time (a medium strum ~30–40 ms for six strings); harder strums are FASTER
// - it speeds up a little as it goes (the wrist accelerates), so the gaps aren't equal
// - the first strings it hits are the loudest and later ones get a bit less ("strum velocity decay"); upstrokes start
//   from the high strings (the caller plays them lighter)
// - no two strums are the same: speed, level and the exact moment vary a few percent, and now and then the string at
//   the far edge is caught lightly or missed

export interface StrumNote { midi: number; string: number; offset: number; vel: number }
export interface StrumOpts {
  up?: boolean
  /** 1–127, how hard */
  vel?: number
  /** seconds for the pick to cross all the strings (default from how hard) */
  speed?: number
  /** 0 = machine-exact, 1 = a relaxed human (default 1) */
  human?: number
  rnd?: () => number
}

/** a gaussian-ish random number around 0 (sd ≈ 1/3 of range) */
function wobble(rnd: () => number, range: number) {
  return ((rnd() + rnd() + rnd()) / 3 - 0.5) * 2 * range
}

/** Strum time across all strings from how hard the strum is: soft 46 ms, medium 34 ms, hard 22 ms. */
export function strumSpeed(vel: number, up = false) {
  const v = Math.max(1, Math.min(127, vel)) / 127
  const ms = 50 - 30 * v
  return (up ? ms * 0.85 : ms) / 1000
}

/** The notes of one strum: when each string sounds (seconds after the strum starts) and how hard. `midis` low → high. */
export function strumNotes(midis: number[], o: StrumOpts = {}): StrumNote[] {
  const rnd = o.rnd ?? Math.random
  const human = o.human ?? 1
  const vel = o.vel ?? 90
  const sorted = [...midis].sort((a, b) => a - b)
  const n = sorted.length
  if (!n) return []
  // the chord sits on the top strings: its lowest note on string 6 - n (0 = low E)
  const strings = sorted.map((_, i) => Math.max(0, 6 - n + i))
  const order = o.up ? [...sorted.keys()].reverse() : [...sorted.keys()]
  const D = (o.speed ?? strumSpeed(vel, o.up)) * (1 + wobble(rnd, 0.12 * human))
  const out: StrumNote[] = []
  order.forEach((idx, k) => {
    const pos = n > 1 ? k / (n - 1) : 0
    // the wrist accelerates: later strings come a little sooner than an even spread
    const base = D * Math.pow(pos, 0.9)
    const jitter = n > 1 ? wobble(rnd, (D / (n - 1)) * 0.18 * human) : 0
    // velocity: first strings strongest, then down to ~78% across the strum; a downstroke leans on the bass note
    let v = vel * (1 - 0.22 * pos) * (1 + wobble(rnd, 0.07 * human))
    if (!o.up && k === 0) v *= 1.06
    // the far edge string: now and then barely caught
    if (human > 0 && k === n - 1 && n >= 4 && rnd() < 0.12 * human) v *= 0.45
    out.push({ midi: sorted[idx], string: strings[idx], offset: Math.max(0, base + jitter), vel: Math.max(1, Math.min(127, Math.round(v))) })
  })
  // keep the first string exactly on time (the strum's start is the beat)
  const first = Math.min(...out.map(x => x.offset))
  for (const x of out) x.offset -= first
  return out.sort((a, b) => a.offset - b.offset)
}

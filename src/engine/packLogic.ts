// Sound packs: the format and the choices made at play time (Stage 3 step 2, notes/AUDIO-ENGINE.md). Pure logic, no
// audio, so it can be tested on its own. Which recording for this note: the zone (string + pitch), the velocity layers
// (two neighbours crossfaded, like Orange Tree's "dynamic morphing"), the round robin (never the same take twice in a
// row), and the gain that puts every pack at the same loudness.

export type Articulation =
  | 'sustain' | 'pm' | 'mute' | 'harmonic' | 'hammer' | 'pull' | 'slideUp' | 'slideDown'
  | 'strumDown' | 'strumUp' | 'chuck' | 'release' | 'fret' | 'pick'

export interface PackLayer { velocity: number; rr: string[]; /** each take's K-weighted mean square (loudness) */ ms?: number[] }
export interface PackZone {
  key: string
  /** guitars: which string (0 = lowest) and fret; other instruments leave them out */
  string?: number
  fret?: number
  root: number
  lo: number
  hi: number
  /** whole-chord recordings (strums): the chord kind ('maj', 'min', '7' …) */
  chord?: string
  layers: PackLayer[]
}
export interface Pack {
  format: 'kguitar-pack'
  version: 1
  id: string
  name: string
  kind: 'guitar' | 'bass' | 'drums' | 'keys' | 'vocal' | 'fx'
  private?: boolean
  licence?: string
  credit?: string
  sampleRate: number
  tuning?: number[]
  loudness?: { lufs: number }
  articulations: Partial<Record<Articulation, { zones: PackZone[] }>>
}

/** The loudness every pack is brought to (LUFS of a medium-loud single note, before the console). */
export const REF_LUFS = -20
/** How far a recording may be re-pitched to cover a missing note (semitones): beyond this it sounds stretched. */
export const MAX_SHIFT = 2

export function isPack(x: unknown): x is Pack {
  const p = x as Pack
  return !!p && p.format === 'kguitar-pack' && p.version === 1 && typeof p.id === 'string' && !!p.articulations
}

/** The pack's gain to reach REF_LUFS (1 when the pack doesn't say). */
export function normGain(p: Pack): number {
  const l = p.loudness?.lufs
  return typeof l === 'number' && Number.isFinite(l) ? Math.pow(10, (REF_LUFS - l) / 20) : 1
}

export interface ZonePick { zone: PackZone; /** playback-rate shift in semitones (0 when the note was recorded) */ shift: number }
/** The recording for a note: on the asked string if there is one (guitars), else the closest pitch on any string. */
export function zoneFor(p: Pack, art: Articulation, midi: number, string?: number): ZonePick | null {
  const zs = p.articulations[art]?.zones
  if (!zs?.length) return null
  const score = (z: PackZone) => {
    const inRange = midi >= z.lo && midi <= z.hi
    const d = inRange ? Math.abs(midi - z.root) * 0.01 : Math.abs(midi - z.root)
    const wrongString = string !== undefined && z.string !== undefined && z.string !== string ? 100 : 0
    return d + wrongString
  }
  let best: PackZone | null = null
  let bs = Infinity
  for (const z of zs) { const s = score(z); if (s < bs) { bs = s; best = z } }
  if (!best) return null
  let shift = midi - best.root
  // the asked string doesn't have it (or no string asked): any string within the shift limit
  if (Math.abs(shift) > MAX_SHIFT && string !== undefined) return zoneFor(p, art, midi)
  if (Math.abs(shift) > MAX_SHIFT) {
    // nothing near: still play the nearest, but never more than an octave of stretch
    if (Math.abs(shift) > 12) return null
  }
  shift = midi - best.root
  return { zone: best, shift }
}

/** The velocity layers for a velocity (1–127): one, or two neighbours with equal-power crossfade weights. */
export function layersFor(z: PackZone, vel: number): { layer: PackLayer; weight: number }[] {
  const ls = [...z.layers].filter(l => l.rr.length).sort((a, b) => a.velocity - b.velocity)
  if (!ls.length) return []
  if (vel <= ls[0].velocity) return [{ layer: ls[0], weight: Math.pow(vel / ls[0].velocity, 0.7) }]
  const top = ls[ls.length - 1]
  if (vel >= top.velocity) return [{ layer: top, weight: Math.min(1.25, Math.pow(vel / top.velocity, 0.7)) }]
  for (let i = 0; i < ls.length - 1; i++) {
    const a = ls[i], b = ls[i + 1]
    if (vel >= a.velocity && vel <= b.velocity) {
      const t = (vel - a.velocity) / (b.velocity - a.velocity)
      const wa = Math.cos((t * Math.PI) / 2), wb = Math.sin((t * Math.PI) / 2)
      return [{ layer: a, weight: wa }, { layer: b, weight: wb }].filter(x => x.weight > 0.02)
    }
  }
  return [{ layer: top, weight: 1 }]
}

/** Round robin without back-to-back repeats (and not too predictable: a random pick from the others). */
export class RoundRobin {
  private last = new Map<string, number>()
  constructor(private rnd: () => number = Math.random) {}
  pick(key: string, n: number): number {
    if (n <= 1) return 0
    const prev = this.last.get(key)
    let k = Math.floor(this.rnd() * (prev === undefined ? n : n - 1))
    if (prev !== undefined && k >= prev) k++
    this.last.set(key, k)
    return k
  }
}

/** Equalise takes inside a layer (they were played by hand: one can be 1–2 dB hotter than its neighbours). */
export function takeTrim(l: PackLayer, k: number): number {
  const ms = l.ms
  if (!ms || ms.length !== l.rr.length || !(ms[k] > 0)) return 1
  const sorted = [...ms].sort((a, b) => a - b)
  const med = sorted[Math.floor(sorted.length / 2)]
  // only half the difference: takes are allowed to differ a little (that's what makes them human)
  return Math.pow(med / ms[k], 0.25)
}

/** Every file a set of notes would need (to load before a song plays). */
export function filesFor(p: Pack, art: Articulation, notes: { midi: number; string?: number }[]): string[] {
  const out = new Set<string>()
  for (const n of notes) {
    const z = zoneFor(p, art, n.midi, n.string)
    if (z) for (const l of z.zone.layers) for (const f of l.rr) out.add(f)
  }
  return [...out]
}

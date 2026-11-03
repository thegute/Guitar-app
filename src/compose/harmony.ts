// The chords under the music, as the composer needs them: when each chord starts, its notes, the scale that fits
// it and the notes a style leans on over it.
import { Scale } from 'tonal'
import { pc } from '../theory/notes'
import { MODE_STEPS, MODES, progChordPcs, scaleForChord, spell, type ModeId, type ProgChord } from '../theory/progressions'
import type { Palette, StyleDef } from './styles'

export interface CChord {
  name: string
  /** pitch class of the root */
  root: number
  /** chord tones, pitch classes, root first */
  pcs: number[]
  /** the scale that fits it, pitch classes */
  scale: number[]
  /** where it starts and how long, in beats */
  start: number
  beats: number
  major: boolean
  minor: boolean
}
export interface KeyInfo { tonic: number; mode: ModeId; minor: boolean; scale: number[] }
/** What the lead can use over one chord: chord tones, the style's colour notes, its scale, and passing notes. */
export interface Pool { chord: number[]; color: number[]; scale: number[] }

const MINORISH: ModeId[] = ['minor', 'dorian', 'phrygian', 'harmonic']
const mod = (x: number) => ((x % 12) + 12) % 12
const scalePcs = (root: string, name: string) => Scale.get(`${root} ${name}`).notes.map(n => pc(n))

export function keyInfo(tonic: string, mode: ModeId): KeyInfo {
  const t = pc(tonic)
  return { tonic: t, mode, minor: MINORISH.includes(mode), scale: (MODE_STEPS[mode] ?? MODE_STEPS.major).map(x => mod(t + x)) }
}

/** The progression as a timeline (chords repeated until `bars` bars of `meter` beats are filled). */
export function timeline(chords: ProgChord[], tonic: string, mode: ModeId, bars: number, meter = 4): CChord[] {
  const key = keyInfo(tonic, mode)
  const keyScale = scalePcs(tonic, MODES.find(m => m.id === mode)?.scale ?? 'major')
  const one = chords.map(c => {
    const tip = scaleForChord(tonic, mode, c)
    const sc = scalePcs(tip.root, tip.scale)
    const pcs = progChordPcs(tonic, c)
    const third = pcs.map(x => mod(x - pcs[0]))
    return { name: c.symbol, root: pc(c.root), pcs, scale: sc.length >= 5 ? sc : keyScale.length ? keyScale : key.scale, beats: c.beats ?? meter, major: third.includes(4), minor: third.includes(3) && !third.includes(4) }
  })
  const out: CChord[] = []
  const total = bars * meter
  let t = 0
  while (t < total - 1e-6 && one.length) {
    for (const c of one) {
      if (t >= total - 1e-6) break
      const beats = Math.min(c.beats, total - t)
      out.push({ ...c, start: t, beats })
      t += beats
    }
  }
  return out
}

/** A style's own progression in a key (for licks made without a progression from Jam). */
export function styleProgression(st: StyleDef, tonic: string, mode: ModeId): ProgChord[] {
  const list = MINORISH.includes(mode) ? st.prog.minor : st.prog.major
  return list.map(([semi, type]) => ({ ...spell(tonic, mode, { semi, type }), beats: 4 }))
}

export function chordAt(tl: CChord[], at: number): CChord {
  return tl.find(c => at >= c.start - 1e-6 && at < c.start + c.beats - 1e-6) ?? tl[tl.length - 1]
}

/** The notes a style uses over a chord. */
export function pool(st: StyleDef, c: CChord, key: KeyInfo): Pool {
  const r = c.root
  const at = (ivs: number[], root = r) => ivs.map(i => mod(root + i))
  let scale: number[]
  const p: Palette = st.palette
  if (p === 'key') scale = key.scale
  else if (p === 'chord') scale = c.scale
  else if (p === 'lydian') scale = c.major && !c.pcs.some(x => mod(x - r) === 10) ? c.scale.map(x => (mod(x - r) === 5 ? mod(r + 6) : x)) : c.scale
  else if (p === 'blues') scale = [...at([0, 3, 5, 6, 7, 10], key.tonic), ...(c.major ? [mod(r + 4)] : [])]
  else if (p === 'mixblues') scale = c.minor ? at([0, 2, 3, 5, 7, 10]) : at([0, 2, 3, 4, 7, 9, 10])
  else if (p === 'majpent') scale = c.minor ? at([0, 2, 3, 5, 7, 10]) : at([0, 2, 4, 7, 9])
  else scale = at([0, 3, 5, 7, 10], key.tonic)
  const chord = [...new Set(c.pcs)]
  scale = [...new Set([...scale, ...chord])].sort((a, b) => a - b)
  // colours only where they don't clash with the chord (no natural 4th over a major 3rd, no 9 over a b9 chord …)
  const color = st.colors.map(i => mod(r + i)).filter(x => !chord.includes(x) && (scale.includes(x) || st.palette === 'chord'))
    .filter(x => !(c.major && mod(x - r) === 5) && !(c.minor && mod(x - r) === 4) && !chord.some(y => mod(x - y) === 1 && mod(y - r) !== 11))
  return { chord, color, scale }
}

/** MIDI notes of a pitch-class set between lo and hi. */
export function notesIn(pcs: number[], lo: number, hi: number): number[] {
  const out: number[] = []
  for (let m = lo; m <= hi; m++) if (pcs.includes(mod(m))) out.push(m)
  return out
}
export { mod }

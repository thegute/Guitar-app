// The exercise library: hundreds of short practice pieces, like a teacher's workbook. Every technique and a lot of
// theory, from a first chromatic warm-up to sweep-picked arpeggios, plus every lick in the lick library. Each one has
// a code (WU-1, SC-12, BL-4 …), a level, a type and the techniques it trains, and builds as a tab in any key it can
// go to, for the instrument you play. Codes are given in the order things are added here, so add new ones at the end
// of their section to keep everyone's favourites pointing at the right exercise.
import type { Instrument } from '../instrument'
import { stringName } from '../instrument'
import { FLATS, SHARPS, keyPrefersFlats, pc } from '../theory/notes'
import type { Voicing } from '../theory/chords'
import { LICKS, type LickDef } from '../licks/library'
import { LICK_STYLES, lickStyle } from '../licks/styles'
import { lickInKey, placeFor } from '../licks/generator'
import { parseLick, type LickEvent } from '../licks/notation'
import { EX_ARPS, EX_SCALES, EX_SEQUENCES, scalePosition } from '../tabs/exercises'
import { PICK_PATTERNS } from '../tabs/picking'
import {
  chordOf, chordPcs, chordsIn, ev, fromLine, fromPicking, fromSpec, fromStrum, fromTab, lineRange, nt, placeLine, scalePcs, shapeFor, spell, tonesIn,
  type ChordEvent, type Hit, type Make, type RelChord,
} from './build'
import { FS_COMBOS, FS_ETUDES, FS_PROGS, fromLush } from './fingerstyle'

export type Level = 1 | 2 | 3 | 4
export const LEVELS = ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert'] as const

// two letters for each lick style's codes
const LICK_PREFIX: Record<string, string> = {
  blues: 'BL', rock: 'RK', altrock: 'AL', metal: 'MT', progmetal: 'PG', mathrock: 'MR', jazz: 'JZ', mayer: 'JM', neosoul: 'NS', funk: 'FK',
  hawaiian: 'HW', jawaiian: 'JW', bluegrass: 'BG', country: 'CW', folk: 'FO', fingerstyle: 'MC',
}

export interface ExType { id: string; label: string; group: string; prefix: string }
export const EX_TYPES: ExType[] = [
  { id: 'warmup', label: 'Warm-ups', group: 'Technique', prefix: 'WU' },
  { id: 'picking', label: 'Picking', group: 'Technique', prefix: 'PK' },
  { id: 'legato', label: 'Legato and slides', group: 'Technique', prefix: 'LG' },
  { id: 'bends', label: 'Bends and vibrato', group: 'Technique', prefix: 'BV' },
  { id: 'tapping', label: 'Tapping and harmonics', group: 'Technique', prefix: 'TH' },
  { id: 'rhythm', label: 'Rhythm and timing', group: 'Technique', prefix: 'RH' },
  { id: 'scales', label: 'Scales', group: 'Theory on the neck', prefix: 'SC' },
  { id: 'sequences', label: 'Scale sequences', group: 'Theory on the neck', prefix: 'SQ' },
  { id: 'arpeggios', label: 'Arpeggios', group: 'Theory on the neck', prefix: 'AR' },
  { id: 'changes', label: 'Chord tones through the changes', group: 'Theory on the neck', prefix: 'CT' },
  { id: 'triads', label: 'Triads and inversions', group: 'Theory on the neck', prefix: 'TR' },
  { id: 'intervals', label: 'Intervals and double stops', group: 'Theory on the neck', prefix: 'IV' },
  { id: 'neck', label: 'Know the neck', group: 'Theory on the neck', prefix: 'NK' },
  { id: 'chords', label: 'Chord changes', group: 'Chords and rhythm guitar', prefix: 'CH' },
  { id: 'strumming', label: 'Strumming and comping', group: 'Chords and rhythm guitar', prefix: 'ST' },
  { id: 'barre', label: 'Barre chords', group: 'Chords and rhythm guitar', prefix: 'BR' },
  { id: 'power', label: 'Power chords and riffs', group: 'Chords and rhythm guitar', prefix: 'PW' },
  { id: 'fingerstyle', label: 'Fingerstyle', group: 'Fingerstyle', prefix: 'FS' },
  { id: 'melodic', label: 'Melodic fingerstyle (Marco Cirillo style)', group: 'Fingerstyle', prefix: 'MF' },
  ...LICK_STYLES.map(s => ({ id: `lick:${s.id}`, label: `${s.label} licks`, group: 'Licks', prefix: LICK_PREFIX[s.id] ?? s.id.slice(0, 2).toUpperCase() })),
]

export const TECHS: { id: string; label: string }[] = [
  { id: 'alt', label: 'Alternate picking' }, { id: 'economy', label: 'Economy picking' }, { id: 'sweep', label: 'Sweep picking' },
  { id: 'skip', label: 'String skipping' }, { id: 'tremolo', label: 'Tremolo picking' }, { id: 'hybrid', label: 'Hybrid picking' },
  { id: 'cross', label: 'Crosspicking' }, { id: 'hammer', label: 'Hammer-ons' }, { id: 'pull', label: 'Pull-offs' }, { id: 'slide', label: 'Slides' },
  { id: 'bend', label: 'Bends' }, { id: 'vibrato', label: 'Vibrato' }, { id: 'tap', label: 'Tapping' }, { id: 'harm', label: 'Harmonics' },
  { id: 'double', label: 'Double stops' }, { id: 'pm', label: 'Palm muting' }, { id: 'mute', label: 'Muted notes' },
  { id: 'changes', label: 'Chord changes' }, { id: 'chords', label: 'Chords' }, { id: 'barre', label: 'Barre chords' }, { id: 'power', label: 'Power chords' },
  { id: 'strum', label: 'Strumming' }, { id: 'finger', label: 'Fingerpicking' }, { id: 'timing', label: 'Timing and rhythm' },
  { id: 'stretch', label: 'Stretches' }, { id: 'shift', label: 'Position shifts' }, { id: 'indep', label: 'Finger independence' },
  { id: 'speed', label: 'Speed' }, { id: 'theory', label: 'Theory on the neck' },
]

export interface Exercise {
  code: string
  name: string
  level: Level
  type: string
  tech: string[]
  about: string
  bpm: number
  meter?: number
  /** the key it's written in; none = it has no key (open strings, chromatic drills, fixed chords) */
  key?: string
  minor?: boolean
  /** the chord it sits over, in the written key */
  chord?: string
  /** what it is, for the card: Drill, Scale, Lick … */
  kind: string
  /** one of the first ones to learn */
  start?: boolean
  /** a lick from the library (Learn has its breakdown when it's a must-know) */
  lick?: string
  /** only on a 6-string guitar */
  guitarOnly?: boolean
  make: Make
}
type Def = Omit<Exercise, 'code'>

// ───────────────────────────── generated lines

/** One finger per fret from `base`: finger 1 = base, 4 = base + 3. */
function chromaticPerm(t: number[], perm: number[], base: number): ChordEvent[] {
  const out: ChordEvent[] = []
  const n = t.length
  for (let s = 0; s < n; s++) for (const f of perm) out.push(ev(0.25, nt(s, base + f - 1)))
  for (let s = n - 1; s >= 0; s--) for (const f of [...perm].reverse()) out.push(ev(0.25, nt(s, base + f - 1)))
  return out
}
const seq = (pairs: [number, number][], dur: number, tech?: (i: number) => string | undefined) => pairs.map(([s, f], i) => ev(dur, nt(s, f, tech?.(i))))
function permutations(a: number[]): number[][] {
  if (a.length <= 1) return [a]
  return a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p]))
}

/** Hammer-on / pull-off / trill drills on every string for a pair of fingers. */
function trill(t: number[], lo: number, hi: number, kind: 'hammer' | 'pull' | 'trill'): ChordEvent[] {
  const out: ChordEvent[] = []
  const strings = [...t.keys(), ...[...t.keys()].reverse().slice(1)]
  for (const s of strings) {
    if (kind === 'hammer') out.push(ev(0.25, nt(s, lo)), ev(0.25, nt(s, hi, 'h')), ev(0.25, nt(s, lo)), ev(0.25, nt(s, hi, 'h')))
    else if (kind === 'pull') out.push(ev(0.25, nt(s, hi)), ev(0.25, nt(s, lo, 'p')), ev(0.25, nt(s, hi)), ev(0.25, nt(s, lo, 'p')))
    else out.push(ev(0.25, nt(s, hi)), ev(0.25, nt(s, lo, 'p')), ev(0.25, nt(s, hi, 'h')), ev(0.25, nt(s, lo, 'p')))
  }
  return out
}

/** A scale in one position, three notes per string, ascending with hammer-ons and back down with pull-offs. */
function legatoRun(t: number[], root: string, scale: string, position = 0): ChordEvent[] | null {
  const up = scalePosition(t, pc(root), scalePcs(root, scale), position)
  if (up.length < 6) return null
  const out: ChordEvent[] = []
  up.forEach((p, i) => out.push(ev(1 / 3, nt(p.string, p.fret, i > 0 && up[i - 1].string === p.string ? 'h' : undefined))))
  const down = up.slice(0, -1).reverse()
  down.forEach((p, i) => out.push(ev(1 / 3, nt(p.string, p.fret, i > 0 && down[i - 1].string === p.string ? 'p' : undefined))))
  out.push(ev(1, nt(up[0].string, up[0].fret)))
  return out
}

/** A scale up and down one string (horizontal playing), on the highest string where the root is low enough. */
function oneString(t: number[], root: string, scale: string): ChordEvent[] | null {
  const pcs = scalePcs(root, scale)
  const opts = [t.length - 1, t.length - 2].map(s => ({ s, r: ((pc(root) - t[s]) % 12 + 12) % 12 })).sort((a, b) => a.r - b.r)
  const { s, r } = opts[0]
  const ups = tonesIn(pcs, t[s] + r, t[s] + r + 12)
  if (ups.length < 8 || r + 12 > 20) return null
  const line = [...ups, ...ups.slice(0, -1).reverse()]
  return [...line.map((m, i) => ev(i === line.length - 1 ? 1 : 0.5, nt(s, m - t[s], i > 0 && Math.abs(m - line[i - 1]) >= 3 ? '/' : undefined)))]
}

/** All the triad shapes on three strings: every string a different chord tone, within four frets. */
function triadShapes(t: number[], set: number[], pcs: number[]) {
  const out: number[][] = []
  for (let a = 0; a <= 17; a++) for (let b = 0; b <= 17; b++) for (let c = 0; c <= 17; c++) {
    const f = [a, b, c]
    const got = f.map((x, i) => (t[set[i]] + x) % 12)
    if (new Set(got).size !== 3 || !got.every(g => pcs.includes(g))) continue
    const fretted = f.filter(x => x > 0)
    if (fretted.length && Math.max(...f) - Math.min(...fretted) > 3) continue
    if (fretted.length < 3 && Math.max(...f) > 4) continue
    out.push(f)
  }
  const pos = (f: number[]) => Math.min(...f.filter(x => x > 0).concat(99))
  return out.sort((x, y) => pos(x) - pos(y))
}
/** The three inversions of a triad up a string set (and the next root position), then back down. */
function triadClimb(t: number[], set: number[], pcs: number[], chord: string): ChordEvent[] | null {
  if (set.some(s => s >= t.length)) return null
  const shapes = triadShapes(t, set, pcs).filter(f => f.every(x => x >= 1))
  if (shapes.length < 3) return null
  const climb = shapes.slice(0, 4)
  const path = [...climb, ...climb.slice(0, -1).reverse()]
  const out: ChordEvent[] = []
  path.forEach((f, k) => {
    const ns = f.map((x, i) => nt(set[i], x))
    out.push({ ...ev(0.5, ns[0]), ...(k === 0 ? { chord } : {}) }, ev(0.5, ns[1]), ev(0.5, ns[2]), ev(0.5, ...ns))
  })
  return out
}
/** Diatonic triads up one string set: each chord of the key in turn. */
function diatonicTriads(t: number[], set: number[], root: string): ChordEvent[] | null {
  if (set.some(s => s >= t.length)) return null
  const sc = scalePcs(root, 'major')
  const out: ChordEvent[] = []
  let floor = 0
  const names: string[] = []
  const shapes: number[][] = []
  for (let d = 0; d < 8; d++) {
    const pcs = [sc[d % 7], sc[(d + 2) % 7], sc[(d + 4) % 7]]
    const all = triadShapes(t, set, pcs).filter(f => f.every(x => x >= 0) && Math.min(...f) >= floor)
    if (!all.length) return null
    const f = all[0]
    floor = Math.max(0, Math.min(...f))
    shapes.push(f)
    const q = ['', 'm', 'm', '', '', 'm', 'dim'][d % 7]
    names.push(spell(sc[d % 7], root) + q)
  }
  const path = [...shapes.keys(), ...[...shapes.keys()].reverse().slice(1)]
  for (const k of path) {
    const ns = shapes[k].map((x, i) => nt(set[i], x))
    out.push({ ...ev(0.5, ns[0]), chord: names[k] }, ev(0.5, ns[1]), ev(0.5, ns[2]), ev(0.5, ...ns))
  }
  return out
}

/** Intervals up the major scale: each note and the note `k` steps above it, melodically. */
function intervalLine(t: number[], root: string, k: number): ChordEvent[] | null {
  const { lo, hi } = lineRange(t)
  const sc = tonesIn(scalePcs(root, 'major'), lo, hi + 5)
  const start = sc.findIndex(m => m % 12 === pc(root) && m >= Math.min(...t) + 2)
  if (start < 0) return null
  const pitches: number[] = []
  for (let i = 0; i <= 7; i++) pitches.push(sc[start + i], sc[start + i + k])
  for (let i = 7; i >= 0; i--) pitches.push(sc[start + i + k], sc[start + i])
  if (pitches.some(p => p === undefined)) return null
  return placeLine(t, pitches, 0.5, 4)
}
/** Diatonic double stops on a pair of strings (3rds, 6ths or octaves), up the scale and back. */
function doubleStops(t: number[], root: string, a: number, b: number, k: number, octave = false): ChordEvent[] | null {
  if (b >= t.length || t[b] <= t[a]) return null
  const sc = tonesIn(scalePcs(root, 'major'), 30, 100)
  for (let startI = 0; startI < sc.length - 15; startI++) {
    if (sc[startI] % 12 !== pc(root) || sc[startI] < t[a]) continue
    const pairs: [number, number][] = []
    for (let i = 0; i <= 7; i++) pairs.push([sc[startI + i], octave ? sc[startI + i] + 12 : sc[startI + i + k]])
    const path = [...pairs, ...pairs.slice(0, -1).reverse()]
    const out: ChordEvent[] = []
    for (const [x, y] of path) {
      const fa = x - t[a], fb = y - t[b]
      if (fa < 0 || fb < 0 || fa > 19 || fb > 19 || Math.abs(fa - fb) > 4) break
      out.push(ev(0.5, nt(a, fa), nt(b, fb)))
    }
    if (out.length < path.length) continue
    out[out.length - 1] = { ...out[out.length - 1], dur: 1 }
    return out
  }
  return null
}

/** The natural notes on one string, up to the 12th fret and back. */
function naturals(t: number[], s: number): ChordEvent[] | null {
  if (s >= t.length) return null
  const frets: number[] = []
  for (let f = 0; f <= 12; f++) if ([0, 2, 4, 5, 7, 9, 11].includes((t[s] + f) % 12)) frets.push(f)
  const line = [...frets, ...frets.slice(0, -1).reverse()]
  return line.map(f => ev(1, nt(s, f)))
}
/** Every place one note lives, string by string. */
function everyRoot(t: number[], root: string): ChordEvent[] {
  const out: ChordEvent[] = []
  t.forEach((open, s) => { for (let f = 0; f <= 15; f++) if ((open + f) % 12 === pc(root)) out.push(ev(1, nt(s, f))) })
  return out
}
/** Octave shapes: the root on one string and its octave two strings up, moving up the neck. */
function octaves(t: number[], root: string): ChordEvent[] | null {
  const out: ChordEvent[] = []
  for (let s = 0; s + 2 < t.length; s++) {
    const f = ((pc(root) - t[s]) % 12 + 12) % 12 || 12
    const up = t[s] + f + 12 - t[s + 2]
    if (up < 0 || up > 17) continue
    out.push(ev(1, nt(s, f)), ev(1, nt(s + 2, up)))
  }
  return out.length ? out : null
}

// ───────────────────────────── chord tones through the changes

const CT_PROGS: { id: string; name: string; key: string; minor?: boolean; chords: RelChord[]; level: Level; sevenths?: boolean }[] = [
  { id: 'ii-V-I', name: 'ii – V – I', key: 'C', chords: [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']], level: 3, sevenths: true },
  { id: 'I-vi-ii-V', name: 'I – vi – ii – V', key: 'C', chords: [[0, 'maj7'], [9, 'm7'], [2, 'm7'], [7, '7']], level: 3, sevenths: true },
  { id: 'blues', name: '12-bar blues', key: 'A', chords: [[0, '7'], [5, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [0, '7'], [7, '7'], [5, '7'], [0, '7'], [7, '7']], level: 2, sevenths: true },
  { id: 'I-IV-V', name: 'I – IV – V', key: 'G', chords: [[0, 'major'], [5, 'major'], [7, 'major'], [0, 'major']], level: 2 },
  { id: 'I-V-vi-IV', name: 'I – V – vi – IV', key: 'G', chords: [[0, 'major'], [7, 'major'], [9, 'minor'], [5, 'major']], level: 2 },
  { id: 'minor-ii-V-i', name: 'Minor ii – V – i', key: 'A', minor: true, chords: [[2, 'm7b5'], [7, '7'], [0, 'm7'], [0, 'm7']], level: 4, sevenths: true },
  { id: 'andalusian', name: 'Andalusian (i – VII – VI – V)', key: 'A', minor: true, chords: [[0, 'minor'], [10, 'major'], [8, 'major'], [7, 'major']], level: 2 },
  { id: 'vi-IV-I-V', name: 'vi – IV – I – V', key: 'C', chords: [[9, 'minor'], [5, 'major'], [0, 'major'], [7, 'major']], level: 2 },
]
type CtMode = 'root' | 'near' | 'thirds' | 'guide' | 'approach'
const nearest = (cands: number[], to: number) => cands.reduce((a, b) => (Math.abs(b - to) < Math.abs(a - to) ? b : a))
function chordToneLine(t: number[], root: string, prog: (typeof CT_PROGS)[number], mode: CtMode): ChordEvent[] | null {
  const { lo, hi, center } = lineRange(t)
  const chords = chordsIn(root, !!prog.minor, prog.chords)
  const pitches: number[] = [], durs: number[] = [], names: (string | undefined)[] = []
  const add = (m: number, d: number, name?: string) => { pitches.push(m); durs.push(d); names.push(name) }
  let prev = center
  chords.forEach((c, ci) => {
    const pcs = chordPcs(c.root, c.suffix)
    const tones = tonesIn(pcs, lo, hi)
    const third = pcs[1], seventh = pcs[3]
    if (mode === 'root') {
      const roots = tonesIn([pcs[0]], lo, hi - 7)
      let m = nearest(roots, prev)
      add(m, 1, c.name)
      for (let k = 0; k < 3; k++) { m = tones.find(x => x > m) ?? m; add(m, 1) }
      prev = m
    } else if (mode === 'near') {
      let i = tones.indexOf(nearest(tones, prev))
      let dir = tones[i] > center + 4 ? -1 : 1
      for (let k = 0; k < 8; k++) {
        add(tones[i], 0.5, k === 0 ? c.name : undefined)
        if (i + dir < 0 || i + dir >= tones.length) dir = -dir
        i += dir
      }
      prev = tones[i - dir]
    } else if (mode === 'thirds') {
      const m = nearest(tonesIn([third], lo, hi), prev)
      add(m, 4, c.name)
      prev = m
    } else if (mode === 'guide') {
      const a = nearest(tonesIn([third, seventh ?? pcs[2]], lo, hi), prev)
      const other = a % 12 === third ? (seventh ?? pcs[2]) : third
      const b = nearest(tonesIn([other], lo, hi), a)
      add(a, 2, c.name); add(b, 2)
      prev = b
    } else {
      const land = ci === 0 ? nearest(tonesIn([third], lo, hi), prev) : prev
      add(land, 1, c.name)
      const up = tones.filter(x => x > land)
      add(up[0] ?? land, 1); add(up[1] ?? land, 1)
      const next = chords[ci + 1]
      if (next) {
        const nThird = chordPcs(next.root, next.suffix)[1]
        const target = nearest(tonesIn([nThird], lo + 1, hi), up[1] ?? land)
        add(target - 1, 1)
        prev = target
      } else add(nearest(tonesIn([pcs[0]], lo, hi), up[1] ?? land), 1)
    }
  })
  return placeLine(t, pitches, durs, 5, names)
}

// ───────────────────────────── chords

const STRUMS: { id: string; name: string; level: Level; hits: Hit[]; meter?: number; progs: string[] }[] = [
  { id: 'beats', name: 'Down on every beat', level: 1, hits: [[0, 'D'], [1, 'D'], [2, 'D'], [3, 'D']], progs: ['A', 'B', 'C', 'D'] },
  { id: 'halves', name: 'Two strums a bar', level: 1, hits: [[0, 'D'], [2, 'D']], progs: ['A', 'B', 'D'] },
  { id: 'eighths', name: 'Down-up eighths', level: 1, hits: [0, 1, 2, 3].flatMap(b => [[b, 'D'], [b + 0.5, 'U']] as Hit[]), progs: ['A', 'B', 'C', 'D'] },
  { id: 'campfire', name: 'Campfire strum (D, D U, U D U)', level: 2, hits: [[0, 'D'], [1, 'D'], [1.5, 'U'], [2.5, 'U'], [3, 'D'], [3.5, 'U']], progs: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] },
  { id: 'rock', name: 'Rock strum (D, D U D U D U)', level: 2, hits: [[0, 'D'], [1, 'D'], [1.5, 'U'], [2, 'D'], [2.5, 'U'], [3, 'D'], [3.5, 'U']], progs: ['A', 'B', 'D', 'E', 'F', 'J'] },
  { id: 'push', name: 'Pop push (D, D U, U, U)', level: 2, hits: [[0, 'D'], [1, 'D'], [1.5, 'U'], [2.5, 'U'], [3.5, 'U']], progs: ['B', 'C', 'E', 'F'] },
  { id: 'funk', name: 'Sixteenth-note funk', level: 3, hits: [[0, 'D'], [0.75, 'U'], [1.5, 'U'], [2, 'D'], [2.75, 'U'], [3.5, 'U']], progs: ['D', 'H', 'I'] },
  { id: 'waltz', name: 'Waltz strum (3/4)', level: 2, meter: 3, hits: [[0, 'D'], [1, 'D'], [1.5, 'U'], [2, 'D'], [2.5, 'U']], progs: ['A', 'D'] },
  { id: 'shuffle', name: 'Shuffle strum (swung eighths)', level: 2, hits: [0, 1, 2, 3].flatMap(b => [[b, 'D'], [b + 2 / 3, 'U']] as Hit[]), progs: ['D', 'H'] },
  { id: 'island', name: 'Island strum (swung D, D U, U D U)', level: 2, hits: [[0, 'D'], [1, 'D'], [1 + 2 / 3, 'U'], [2 + 2 / 3, 'U'], [3, 'D'], [3 + 2 / 3, 'U']], progs: ['A', 'B', 'D'] },
]
const SPROGS: Record<string, { name: string; key: string; minor?: boolean; chords: RelChord[]; level: Level; times?: number }> = {
  A: { name: 'I – IV – V (G C D)', key: 'G', chords: [[0, 'major'], [5, 'major'], [7, 'major'], [0, 'major']], level: 1 },
  B: { name: 'I – V – vi – IV (G D Em C)', key: 'G', chords: [[0, 'major'], [7, 'major'], [9, 'minor'], [5, 'major']], level: 1 },
  C: { name: 'i – VI – III – VII (Em C G D)', key: 'E', minor: true, chords: [[0, 'minor'], [8, 'major'], [3, 'major'], [10, 'major']], level: 1 },
  D: { name: 'I – IV – V (A D E)', key: 'A', chords: [[0, 'major'], [5, 'major'], [7, 'major'], [0, 'major']], level: 1 },
  E: { name: 'I – V – vi – IV (D A Bm G)', key: 'D', chords: [[0, 'major'], [7, 'major'], [9, 'minor'], [5, 'major']], level: 2 },
  F: { name: '50s (C Am F G)', key: 'C', chords: [[0, 'major'], [9, 'minor'], [5, 'major'], [7, 'major']], level: 2 },
  G: { name: 'Andalusian (Am G F E)', key: 'A', minor: true, chords: [[0, 'minor'], [10, 'major'], [8, 'major'], [7, 'major']], level: 2 },
  H: { name: '12-bar blues (A7 D7 E7)', key: 'A', chords: [[0, '7'], [0, '7'], [0, '7'], [0, '7'], [5, '7'], [5, '7'], [0, '7'], [0, '7'], [7, '7'], [5, '7'], [0, '7'], [7, '7']], level: 2, times: 1 },
  I: { name: 'ii – V – I (Dm7 G7 Cmaj7)', key: 'C', chords: [[2, 'm7'], [7, '7'], [0, 'maj7'], [0, 'maj7']], level: 3 },
  J: { name: 'I – V – vi – IV (E B C#m A)', key: 'E', chords: [[0, 'major'], [7, 'major'], [9, 'minor'], [5, 'major']], level: 3 },
}
const CHORD_PAIRS: [string, string, Level][] = [
  ['E', 'A', 1], ['A', 'D', 1], ['D', 'G', 1], ['G', 'C', 1], ['C', 'Am', 1], ['Em', 'G', 1], ['Am', 'E', 1], ['Am', 'Dm', 1],
  ['D', 'Em', 1], ['G', 'Em', 1], ['Em', 'C', 1], ['C', 'D', 1], ['E', 'Am', 1], ['D', 'A', 1], ['G', 'D', 1], ['Em', 'Am', 1],
  ['A7', 'D', 2], ['E7', 'A', 2], ['G7', 'C', 2], ['D7', 'G', 2], ['B7', 'Em', 2], ['C', 'A7', 2],
  ['F', 'C', 2], ['Bm', 'G', 2], ['F', 'G', 2], ['Bb', 'F', 3], ['F#m', 'D', 3], ['C#m', 'A', 3], ['Bm', 'F#m', 3],
]
const ORD = ['', '1st', '2nd', '3rd', '4th', '5th', '6th']
function commonFinger(a: Voicing | null, b: Voicing | null, strings: number) {
  if (!a || !b) return null
  for (let s = 0; s < a.frets.length; s++) if (a.frets[s] > 0 && a.frets[s] === b.frets[s]) return { n: strings - s, fret: a.frets[s] }
  return null
}


// ───────────────────────────── technique tags from the notes

export function techOfEvents(events: LickEvent[], bpm: number): string[] {
  const out = new Set<string>()
  let fastest = 9
  for (const e of events) {
    if (e.notes.length) fastest = Math.min(fastest, e.dur)
    if (e.notes.length === 2) out.add('double')
    if (e.notes.length >= 3) out.add('chords')
    for (const n of e.notes) {
      const t = (n.tech ?? '').replace('harm', '')
      if ((n.tech ?? '').includes('harm')) out.add('harm')
      if (/h/.test(t)) out.add('hammer')
      if (/p(?!b)/.test(t.replace('pb', ''))) out.add('pull')
      if (/[/\\]/.test(t)) out.add('slide')
      if (/b|r/.test(t)) out.add('bend')
      if (t.includes('~')) out.add('vibrato')
      if (t.includes('T')) out.add('tap')
      if (t.includes('PM')) out.add('pm')
      if (n.tech === 'x') out.add('mute')
    }
  }
  if ((bpm / 60) / fastest >= 7) out.add('speed')
  return [...out]
}
const tabTech = (tab: string, bpm: number) => techOfEvents(parseLick(tab).events, bpm)

// ───────────────────────────── the catalog

const cache = new Map<string, Exercise[]>()
/** Every exercise for this instrument, in book order. */
export function exerciseCatalog(inst: Instrument): Exercise[] {
  const k = inst.id + ':' + inst.tuning.id
  const hit = cache.get(k)
  if (hit) return hit
  const defs = buildDefs(inst)
  const counters = new Map<string, number>()
  const list: Exercise[] = defs.map(d => {
    const prefix = EX_TYPES.find(t => t.id === d.type)!.prefix
    const n = (counters.get(prefix) ?? 0) + 1
    counters.set(prefix, n)
    return { ...d, code: `${prefix}-${n}` }
  }).filter(e => !e.guitarOnly || inst.id === 'guitar')
  const order = new Map(EX_TYPES.map((t, i) => [t.id, i]))
  list.sort((a, b) => order.get(a.type)! - order.get(b.type)! || a.level - b.level)
  cache.set(k, list)
  return list
}

function buildDefs(inst: Instrument): Def[] {
  const D: Def[] = []
  const add = (d: Def) => { D.push(d) }
  const t0 = inst.midis
  const strings = t0.length

  // ── Warm-ups
  for (const p of permutations([1, 2, 3, 4])) {
    const id = p.join('')
    const level: Level = id === '1234' || id === '4321' ? 1 : p[0] === 1 || p[0] === 4 ? 2 : 3
    add({ type: 'warmup', kind: 'Drill', name: `Chromatic ${p.join('-')}`, level, tech: ['alt', 'indep'], bpm: level === 1 ? 70 : 60, start: id === '1234',
      about: id === '1234' ? 'One finger per fret, up every string and back: the warm-up every teacher starts with. Keep fingers close to the strings.'
        : `Fingers in the order ${p.join('-')} on every string. Odd orders train fingers that don't like to move on their own.`,
      make: fromLine(`Chromatic ${p.join('-')}`, t => chromaticPerm(t, p, 5)) })
  }
  add({ type: 'warmup', kind: 'Drill', name: 'Spider walk (two strings at a time)', level: 2, tech: ['indep', 'alt'], bpm: 60,
    about: 'Fingers 1 and 3 on one string, 2 and 4 on the next, crawling across the neck. Only one finger moves at a time.',
    make: fromLine('Spider walk', t => {
      const pairs: [number, number][] = []
      for (let s = 0; s + 1 < t.length; s++) pairs.push([s, 5], [s + 1, 6], [s, 7], [s + 1, 8])
      for (let s = t.length - 2; s >= 0; s--) pairs.push([s + 1, 8], [s, 7], [s + 1, 6], [s, 5])
      return seq(pairs, 0.25)
    }) })
  add({ type: 'warmup', kind: 'Drill', name: 'Diagonal chromatic', level: 2, tech: ['indep', 'alt'], bpm: 60,
    about: 'Finger 1 on one string, 2 on the next, 3 on the next, 4 on the next: a diagonal across the neck, then back.',
    make: fromLine('Diagonal chromatic', t => {
      const pairs: [number, number][] = []
      for (let s = 0; s + 3 < t.length; s++) for (let k = 0; k < 4; k++) pairs.push([s + k, 5 + k])
      for (let s = t.length - 4; s >= 0; s--) for (let k = 3; k >= 0; k--) pairs.push([s + k, 5 + k])
      return pairs.length ? seq(pairs, 0.25) : null
    }) })
  add({ type: 'warmup', kind: 'Drill', name: 'Chromatic with string skips', level: 3, tech: ['skip', 'alt'], bpm: 60,
    about: '1-2-3-4 on a string, then jump over the next string. Your picking hand learns to find strings without looking.',
    make: fromLine('Chromatic with string skips', t => {
      const order: number[] = []
      for (let s = 0; s + 2 < t.length; s++) order.push(s, s + 2)
      const pairs: [number, number][] = []
      for (const s of order) for (const f of [1, 2, 3, 4]) pairs.push([s, 4 + f])
      for (const s of [...order].reverse()) for (const f of [4, 3, 2, 1]) pairs.push([s, 4 + f])
      return order.length ? seq(pairs, 0.25) : null
    }) })
  add({ type: 'warmup', kind: 'Drill', name: 'Chromatic climbing the neck', level: 1, tech: ['shift', 'alt'], bpm: 70,
    about: '1-2-3-4 on each string, moving up a fret every time you change string. Slide the whole hand, thumb included.',
    make: fromLine('Chromatic climbing the neck', t => {
      const pairs: [number, number][] = []
      t.forEach((_, s) => { for (let f = 1; f <= 4; f++) pairs.push([s, s + f]) })
      for (let s = t.length - 1; s >= 0; s--) for (let f = 4; f >= 1; f--) pairs.push([s, s + f])
      return seq(pairs, 0.25)
    }) })
  add({ type: 'warmup', kind: 'Drill', name: 'Finger pairs: 1-2 then 3-4', level: 1, tech: ['indep'], bpm: 70,
    about: 'Index and middle twice, then ring and pinky twice, on every string. Builds strength in the weak fingers.',
    make: fromLine('Finger pairs', t => seq([...t.keys()].flatMap(s => [5, 6, 5, 6, 7, 8, 7, 8].map(f => [s, f] as [number, number])), 0.25)) })
  add({ type: 'warmup', kind: 'Drill', name: 'Three-finger chromatic (1-2-3, 4-3-2)', level: 1, tech: ['indep'], bpm: 70,
    about: 'Triplets: three fingers up each string, then the other three down. A gentle start before the four-finger drills.',
    make: fromLine('Three-finger chromatic', t => seq([...[...t.keys()].flatMap(s => [5, 6, 7].map(f => [s, f] as [number, number])), ...[...t.keys()].reverse().flatMap(s => [8, 7, 6].map(f => [s, f] as [number, number]))], 1 / 3)) })
  add({ type: 'warmup', kind: 'Drill', name: 'Pinky workout (1-4, 2-4, 3-4)', level: 2, tech: ['indep', 'stretch'], bpm: 60,
    about: 'Every other note is the pinky. It is the finger most players never train; this fixes that.',
    make: fromLine('Pinky workout', t => seq([...t.keys()].flatMap(s => [5, 8, 6, 8, 7, 8].map(f => [s, f] as [number, number])), 1 / 3)) })
  add({ type: 'warmup', kind: 'Drill', name: 'Whole-step stretch (frets 5-7-9)', level: 2, tech: ['stretch'], bpm: 60,
    about: 'Fingers 1, 2 and 4 two frets apart. Keep the thumb low behind the neck and the wrist straight. Stop if it hurts.',
    make: fromLine('Whole-step stretch', t => seq([...[...t.keys()].flatMap(s => [5, 7, 9].map(f => [s, f] as [number, number])), ...[...t.keys()].reverse().flatMap(s => [9, 7, 5].map(f => [s, f] as [number, number]))], 1 / 3)) })
  add({ type: 'warmup', kind: 'Drill', name: 'Four-finger stretch (frets 5-7-8-10)', level: 3, tech: ['stretch', 'alt'], bpm: 60,
    about: 'The span of a three-notes-per-string scale. Lower the thumb, keep the fingers curved and relax between strings.',
    make: fromLine('Four-finger stretch', t => seq([...[...t.keys()].flatMap(s => [5, 7, 8, 10].map(f => [s, f] as [number, number])), ...[...t.keys()].reverse().flatMap(s => [10, 8, 7, 5].map(f => [s, f] as [number, number]))], 0.25)) })

  // ── Picking
  add({ type: 'picking', kind: 'Drill', name: 'Open strings, down-up', level: 1, tech: ['alt'], bpm: 80, start: true,
    about: 'Four eighth notes on each open string, strictly down-up. Your fretting hand rests; all attention goes to the pick.',
    make: fromLine('Open strings, down-up', t => {
      const ss = [...t.keys(), ...[...t.keys()].reverse().slice(1)]
      return ss.flatMap(s => [0, 1, 2, 3].map(() => ev(0.5, nt(s, 0))))
    }) })
  add({ type: 'picking', kind: 'Drill', name: 'Speed ladder: 8ths, triplets, 16ths', level: 2, tech: ['alt', 'timing', 'speed'], bpm: 70,
    about: 'Same note, faster and faster: two, three, then four notes a beat. Each step must stay exactly with the click.',
    make: fromLine('Speed ladder', t => {
      const s = Math.min(1, t.length - 1)
      return [...Array(8).fill(0).map(() => ev(0.5, nt(s, 5))), ...Array(12).fill(0).map(() => ev(1 / 3, nt(s, 5))), ...Array(16).fill(0).map(() => ev(0.25, nt(s, 5))), ev(4, nt(s, 5))]
    }) })
  add({ type: 'picking', kind: 'Drill', name: 'Position shifts on one string', level: 1, tech: ['shift'], bpm: 70,
    about: '1-2-3-4 at frets 1-4, then 5-8, then 9-12, and back. The shift should sound as smooth as the notes in between.',
    make: fromLine('Position shifts on one string', t => {
      const out: ChordEvent[] = []
      for (const s of [t.length - 1, 0]) {
        for (let f = 1; f <= 12; f++) out.push(ev(0.5, nt(s, f)))
        for (let f = 11; f >= 1; f--) out.push(ev(0.5, nt(s, f)))
        out.push(ev(0.5))
      }
      return out
    }) })
  const pk: [string, Level, string, string[], string, string?, boolean?][] = [
    ['Tremolo picking a melody', 2, 's ' + [5, 6, 8, 10, 12, 10, 8, 6].map(f => Array(4).fill(`2:${f}`).join(' ')).join(' ') + ' w 2:5~', ['tremolo', 'alt'],
      'Four fast notes on every melody note. Small, loose movements from the wrist; the pick barely leaves the string.'],
    ['Outside picking: two-string loop', 3, 's ' + Array(8).fill('2:5 2:8 1:5 1:8').join(' ') + ' q 1:5~', ['alt'],
      'Down-up-down-up across two strings. You cross to the higher string after an upstroke, outside the strings.'],
    ['Inside picking: two-string loop', 3, 's ' + Array(8).fill('1:8 1:5 2:8 2:5').join(' ') + ' q 3:7~', ['alt'],
      'Now the string change comes between the strings: the harder kind. Keep the pick close and the motion small.'],
    ['Six-note loop across two strings', 3, 'sx ' + Array(8).fill('1:8 1:5 2:8 2:5 2:8 1:5').join(' ') + ' q 1:5~', ['alt', 'speed'],
      'Six notes a beat, going round and round. A classic rock speed pattern: start slow and keep it even.'],
    ['String skipping: octaves', 2, 'e 6:5 4:7 6:8 4:10 5:5 3:7 5:7 3:9 4:5 2:8 4:7 2:10 3:5 1:8 3:7 1:10 h 1:5~', ['skip'],
      'Each pentatonic note, then the same note an octave up, two strings away. Mute the string in between with your fretting finger.'],
    ['Three notes per string, up and down', 3, 't 6:5 6:7 6:8 5:5 5:7 5:8 4:5 4:7 4:9 3:5 3:7 3:9 2:6 2:8 2:10 1:7 1:8 1:10 1:12 1:10 1:8 1:7 2:10 2:8 2:6 3:9 3:7 3:5 4:9 4:7 4:5 5:8 5:7 5:5 6:8 6:7 h 6:5~', ['alt', 'economy'],
      'A minor, three notes on each string, in triplets. Pick every note; the string changes fall on different parts of the beat.'],
    ['Pedal-tone run', 3, 's 1:12 1:5 1:13 1:5 1:15 1:5 1:13 1:5 1:12 1:5 1:10 1:5 1:8 1:5 1:10 1:5 1:12 1:5 1:13 1:5 1:15 1:5 1:17 1:5 h 1:17~', ['alt', 'shift'],
      'Every other note is the A at the 5th fret (the pedal) while the melody climbs. Leave the first finger planted.'],
    ['Sixteenth-note bursts', 2, 's 2:5 2:8 1:5 1:8 q r s 1:8 1:5 2:8 2:5 q r s 3:5 3:7 2:5 2:8 q r s 2:8 2:5 3:7 3:5 q r', ['alt', 'speed'],
      'Four fast notes, then a rest. Short bursts build speed without tension; relax in the gaps.'],
    ['Sextuplet bursts', 4, 'sx 1:8 1:5 2:8 2:5 3:7 3:5 q r sx 3:5 3:7 2:5 2:8 1:5 1:8 q r sx 1:8 1:5 2:8 2:5 3:7 3:5 sx 4:7 4:5 3:7 3:5 2:8 2:5 h 2:5~', ['alt', 'speed'],
      'Six notes in one beat: real shred speed. Only push the tempo when the bursts are clean at the slow speed.'],
  ]
  for (const [name, level, tab, tech, about] of pk) add({ type: 'picking', kind: 'Drill', name, level, tech: [...new Set([...tech, ...tabTech(tab, 80)])], bpm: level >= 3 ? 70 : 80, key: 'A', minor: true, about, make: fromTab(tab, { name, ref: 'A', minor: true }) })
  const pkG: [string, Level, string, string[], string, number][] = [
    ['String-skipping arpeggios: Am – C – G', 3, 'e 4:7 2:5 3:5 1:5 3:5 2:5 4:7 r 5:3 3:5 4:5 2:5 4:5 3:5 5:3 r 6:3 4:5 5:5 3:7 5:5 4:5 6:3 r h 4:7+3:5+2:5', ['skip', 'alt'],
      'Chord tones with a string skipped between them: a wide, open sound. Mute the skipped strings with the side of your fingers.', 70],
    ['Three-string sweep: A major', 2, 't ' + Array(4).fill('3:14 2:14 1:12 1:17h 1:12p 2:14').join(' ') + ' h 3:14+2:14+1:12', ['sweep'],
      'Drag the pick across three strings in one motion, like a slow strum that lets only one note sound at a time. Lift each finger as the next note sounds.', 60],
    ['Three-string sweep: A minor', 2, 't ' + Array(4).fill('3:14 2:13 1:12 1:17h 1:12p 2:13').join(' ') + ' h 3:14+2:13+1:12', ['sweep'],
      'The minor triad version. Roll one finger across the 14th and 13th frets if that helps; never let two notes ring together.', 60],
    ['Three-string sweep: A diminished', 3, 't ' + Array(4).fill('3:14 2:13 1:11 1:14h 1:11p 2:13').join(' ') + ' h 3:14+2:13+1:11', ['sweep'],
      'A tense, dark triad (root, minor 3rd, flat 5th). Same motion as the major and minor sweeps.', 60],
    ['Three-string sweeps: Am – F – C – G', 3, 't ' + ['3:14 2:13 1:12 1:17h 1:12p 2:13', '3:10 2:10 1:8 1:13h 1:8p 2:10', '3:5 2:5 1:3 1:8h 1:3p 2:5', '3:12 2:12 1:10 1:15h 1:10p 2:12'].map(g => `${g} ${g}`).join(' ') + ' h 3:14+2:13+1:12', ['sweep', 'shift'],
      'The sweep shape moves through a progression. Look ahead to the next chord while you play the last notes of this one.', 60],
    ['Five-string sweep: A minor', 3, 'sx ' + Array(4).fill('5:12 4:14 3:14 2:13 1:12 1:17h 1:12p 2:13 3:14 4:14 5:12 r').join(' ') + ' h 5:12+4:14+3:14', ['sweep', 'speed'],
      'One pick stroke down through five strings, a hammer at the top, one stroke back. Mute with both hands so the notes stay separate.', 50],
    ['Five-string sweep: A major', 3, 'sx ' + Array(4).fill('5:12 4:14 3:14 2:14 1:12 1:17h 1:12p 2:14 3:14 4:14 5:12 r').join(' ') + ' h 5:12+4:14+3:14', ['sweep', 'speed'],
      'The major shape: only the B string changes. Keep the pick angled slightly so it glides.', 50],
    ['Six-string sweep: C major', 4, 'sx ' + Array(4).fill('6:8 5:10 4:10 3:9 2:8 1:8 1:12h 1:8p 2:8 3:9 4:10 5:10').join(' ') + ' h 6:8', ['sweep', 'speed'],
      'All six strings, root on the low E: the big neoclassical sweep. Each note must stop as the next one starts.', 50],
    ['Hybrid picking: bass and double stops', 2, 'e 6:3 2:3+1:3 5:2 2:3+1:3 4:0 2:3+1:3 5:2 2:3+1:3 6:3 2:3+1:3 5:2 2:3+1:3 h 6:3+2:3+1:3', ['hybrid'],
      'Pick the bass notes, snap the two top strings with your middle and ring fingers. The country "chicken" sound starts here.', 80],
    ['Hybrid banjo roll', 3, 'e 3:0 2:3 1:3 3:0 2:3 1:3 3:0 2:3 3:0 2:1 1:0 3:0 2:1 1:0 3:0 2:1 3:0 2:3 1:3 3:0 2:3 1:3 3:0 2:3 h 3:0+2:3+1:3', ['hybrid', 'cross'],
      'Pick, middle, ring in a rolling 3-3-2 pattern over G and C. Let every note ring like a banjo.', 80],
  ]
  for (const [name, level, tab, tech, about, bpm] of pkG) {
    const key = /banjo|bass and double/.test(name) ? 'G' : name.includes('C major') ? 'C' : 'A'
    const minor = /minor|Am –/.test(name)
    add({ type: 'picking', kind: 'Drill', name, level, tech: [...new Set([...tech, ...tabTech(tab, bpm)])], bpm, key, minor, guitarOnly: true, about,
      make: fromTab(tab, { name, ref: key, minor, move: key === 'G' ? 'capo' : 'shift' }) })
  }
  add({ type: 'picking', kind: 'Pattern', name: 'Crosspicking: G – C – D', level: 3, tech: ['cross', 'alt'], bpm: 80, key: 'G',
    about: 'A flatpick roll across three strings in a 3-3-2 pattern so the chords ring like a mandolin. Bluegrass rhythm players use it for slow songs.',
    make: fromPicking('Crosspicking', { rel: [[0, 'major'], [5, 'major'], [7, 'major'], [0, 'major']] }, 'cross') })

  // ── Legato
  const PAIRS: [number, number, string][] = [[1, 2, '1 and 2'], [1, 3, '1 and 3'], [1, 4, '1 and 4'], [2, 3, '2 and 3'], [2, 4, '2 and 4'], [3, 4, '3 and 4']]
  for (const kind of ['hammer', 'pull', 'trill'] as const) {
    for (const [a, b, label] of PAIRS) {
      const weak = b === 4 || a === 3
      const level: Level = kind === 'hammer' ? (weak ? 2 : 1) : kind === 'pull' ? 2 : (weak ? 3 : 2)
      const what = kind === 'hammer' ? 'Hammer-ons' : kind === 'pull' ? 'Pull-offs' : 'Trills'
      add({ type: 'legato', kind: 'Drill', name: `${what} with fingers ${label}`, level, tech: kind === 'trill' ? ['hammer', 'pull'] : [kind === 'hammer' ? 'hammer' : 'pull'], bpm: 70,
        start: kind === 'hammer' && a === 1 && b === 3,
        about: kind === 'hammer' ? `Pick the lower note, then slam finger ${b} down on the string without picking. Both notes should be equally loud.`
          : kind === 'pull' ? `Pick with finger ${b} down, then flick it off the string sideways so finger ${a}'s note sounds. Don't just lift it.`
            : `Pick once, then hammer and pull between fingers ${a} and ${b} without picking again. Keep it even and loud.`,
        make: fromLine(`${what} with fingers ${label}`, t => trill(t, 4 + a, 4 + b, kind)) })
    }
  }
  const lg: [string, Level, string, string][] = [
    ['Hammer-ons up pentatonic box 1', 1, 'e 6:5 6:8h 5:5 5:7h 4:5 4:7h 3:5 3:7h 2:5 2:8h 1:5 1:8h h 1:5~',
      'Pick the first note on each string and hammer the second. The classic way to make the pentatonic box flow.'],
    ['Pull-offs down pentatonic box 1', 1, 'e 1:8 1:5p 2:8 2:5p 3:7 3:5p 4:7 4:5p 5:7 5:5p 6:8 6:5p h 4:7~',
      'Pick the higher note, pull off to the lower one. Have the lower finger already in place before you pull.'],
    ['Hammer-pull triplets in box 1', 2, 't 1:5 1:8h 1:5p 2:5 2:8h 2:5p 3:5 3:7h 3:5p 4:5 4:7h 4:5p 3:5 3:7h 3:5p 2:5 2:8h 2:5p q 1:5 1:8~',
      'Pick, hammer, pull: one pick stroke for three notes. A rolling blues-rock sound.'],
    ['Slides between boxes 1 and 2', 2, 'e 6:5 6:8 5:5 5:7 4:5 4:7 4:10/ 3:7 3:9 2:8 2:10 1:8 1:10 1:12/ q 1:12~',
      'Slide up into the next box instead of jumping. It connects the positions and sounds vocal.'],
    ['Slides up and down one string', 2, 'e 2:5 2:6 2:8 2:10/ 2:12/ 2:13 2:15/ 2:17/ 2:17 2:15\\ 2:13\\ 2:12 2:10\\ 2:8\\ q 2:5\\~',
      'The A minor scale along the B string. Keep light pressure while sliding so the note doesn\'t die.'],
    ['Hammer-ons from nowhere', 3, 'e 3:5h 3:7h 3:9h 2:6h 2:8h 2:10h 1:7h 1:8h 1:10h 1:8p 1:7p 2:10h 2:8p 2:6p h 2:10~',
      'Fretting hand only: every note is hammered, even onto a new string. Builds strength and makes lines sound smooth.'],
    ['Blue-note trill', 3, 'sx 3:7 3:8h 3:7p 3:8h 3:7p 3:8h 3:7p 3:8h 3:7p 3:8h 3:7p 3:8h 3:7p 3:8h 3:7p 3:8h 3:7p 3:8h q 3:5 w 4:7~',
      'Trill between the 4th and the "blue" flat 5th: a fast, buzzing blues sound. Pick only the first note.'],
    ['Pull-offs to the open string', 2, 's 1:12 1:0p 1:10 1:0p 1:8 1:0p 1:7 1:0p 1:5 1:0p 1:3 1:0p 1:2 1:0p 1:3 1:0p w 1:0~',
      'Pull off from each note of E minor to the open high E. Flick the finger downward so the open string rings.'],
  ]
  for (const [name, level, tab, about] of lg) {
    const key = name.includes('open string') ? 'E' : 'A'
    add({ type: 'legato', kind: 'Drill', name, level, tech: tabTech(tab, 80), bpm: 80, key, minor: true, about, start: name.startsWith('Hammer-ons up'), make: fromTab(tab, { name, ref: key, minor: true }) })
  }
  const legatoScales: [string, string, boolean][] = [['aeolian', 'A', true], ['major', 'G', false], ['dorian', 'D', true], ['mixolydian', 'G', false], ['harmonic minor', 'A', true], ['phrygian dominant', 'E', false]]
  for (const [sc, key, minor] of legatoScales) {
    const label = EX_SCALES.find(s => s.id === sc)!.label
    add({ type: 'legato', kind: 'Run', name: `Legato run: ${label.toLowerCase()}`, level: 3, tech: ['hammer', 'pull'], bpm: 70, key, minor,
      about: `${label} with three notes on each string: pick the first note of each string only, hammer up and pull down. Aim for every note at the same volume.`,
      make: fromLine(`Legato ${label.toLowerCase()}`, (t, r) => legatoRun(t, r, sc), { keyed: true, minor }) })
  }
  add({ type: 'legato', kind: 'Run', name: 'Legato through all five pentatonic boxes', level: 3, tech: ['hammer', 'pull', 'shift'], bpm: 70, key: 'A', minor: true,
    about: 'Each box of the minor pentatonic in turn, hammering up, then back down the last box with pull-offs. Ties the whole neck together.',
    make: fromLine('Legato through the boxes', (t, r) => {
      const out: ChordEvent[] = []
      const pcs = scalePcs(r, 'minor pentatonic')
      let last: ReturnType<typeof scalePosition> = []
      for (let pos = 0; pos < 5; pos++) {
        const up = scalePosition(t, pc(r), pcs, pos)
        if (up.length < 6) return null
        up.forEach((p, i) => out.push(ev(1 / 3, nt(p.string, p.fret, i > 0 && up[i - 1].string === p.string ? 'h' : undefined))))
        last = up
      }
      const down = last.slice().reverse()
      down.forEach((p, i) => out.push(ev(1 / 3, nt(p.string, p.fret, i > 0 && down[i - 1].string === p.string ? 'p' : undefined))))
      return out
    }, { keyed: true, minor: true }) })

  // ── Bends and vibrato
  const bv: [string, Level, string, string][] = [
    ['Whole-step bend: hear the target first', 1, 'q 3:9 h 3:7b q r q 3:9 h 3:7b q r q 3:7b 3:7r 3:5 4:7~',
      'Play the target note (9th fret), then bend the 7th fret up until it sounds the same. Your ear tells you when to stop.'],
    ['Whole-step bends on the B string', 1, 'q 2:10 h 2:8b q r q 2:10 h 2:8b q r q 2:8b 2:8r 2:5 3:7~',
      'Bend with the third finger, the first and second fingers pushing behind it. Turn the wrist like opening a door.'],
    ['Whole-step bends on the high E', 2, 'q 1:10 h 1:8b q r q 1:10 h 1:8b q r q 1:8b 1:8r h 1:5~',
      'On the top string you push the string up towards the ceiling. Check it doesn\'t slip off the fretboard edge.'],
    ['Half-step bends to the blue notes', 2, 'q 2:6 h 2:5bh q r q 3:8 h 3:7bh q r q 2:5bh 2:5r 3:7 3:5~',
      'Small bends: just one fret higher. Overbending is the usual mistake here, so listen closely.'],
    ['Step-and-a-half bends', 3, 'q 2:13 h 2:10b3 q r q 2:13 h 2:10b3 q r q 2:10b3 2:10r h 2:10~',
      'Bend the root up a minor third: a huge, crying rock bend. Use three fingers and lighter strings if it won\'t go.'],
    ['Pre-bend and release', 2, 'q 3:7pbr 3:5 h 4:7~ q 2:8pbr 2:5 h 3:7~ q 1:8pbr 1:5 h 2:5~',
      'Bend the string silently first, then pick it and let it down. Hard to get in tune: check against the bent pitch.'],
    ['Bend and release in rhythm', 2, 'e 3:7b 3:7r 3:5 4:7 3:7b 3:7r 3:5 4:7 2:8b 2:8r 2:5 3:7 2:8b 2:8r 2:5 3:7 q 3:7b 3:7r h 4:7~',
      'Bend up on the beat, release on the "and". The release should land exactly in time, not drift down.'],
    ['Unison bends', 3, 'q 3:7b+2:5 3:7b+2:5 h 3:7b+2:5 q 3:14b+2:12 3:14b+2:12 h 3:14b+2:12 q 3:7b+2:5 r h 4:7~',
      'Bend the lower string up to the same note as the higher one: two strings, one pitch, a thick rock sound.'],
    ['Oblique bends (bend under a held note)', 3, 'q 2:8b+1:5 2:8r+1:5 2:5+1:5 3:7+2:5 q 2:8b+1:5 2:8r+1:5 h 4:7+3:5',
      'Hold the top note still while the string under it bends. Keep the top finger flat and firm.'],
    ['Vibrato: slow and even', 1, 'w 3:7~ 2:5~ 2:8~ 4:7~',
      'Hold each note for a whole bar and shake it gently and evenly. The pitch should wobble, not just the finger.'],
    ['Vibrato: fast and wide', 2, 'h 2:10~ 1:8~ 2:8~ 3:9~ w 2:10~',
      'Wider and faster: the rock and blues vibrato. It comes from the wrist turning, with the thumb as the pivot.'],
    ['Vibrato on a bend', 3, 'h 3:7b~ q 3:5 4:7 h 2:8b~ q 2:5 3:7 w 4:7~',
      'Bend up, then wobble the bent note: release a little and push back up, over and over, without dropping to the start.'],
    ['Bend to every note of box 1', 2, 'q 4:7b 4:7r 3:7b 3:7r 2:8b 2:8r 1:8b 1:8r h 1:5~ 4:7~',
      'Each note of the box bent up to the next note of the scale. Learn which notes like to be bent.'],
    ['Bends in a minor melody', 2, 'q 1:5 2:8 h 2:8b q 1:5 2:5 h 3:7b q 2:5 3:7 h 3:7b w 3:5~',
      'Bends as part of a tune: the bend replaces the next scale note. Each one should land in tune on its beat.'],
  ]
  bv.forEach(([name, level, tab, about], i) => add({ type: 'bends', kind: 'Drill', name, level, tech: tabTech(tab, 70), bpm: 70, key: 'A', minor: true, about, start: i === 0,
    make: fromTab(tab, { name, ref: 'A', minor: true }) }))

  // ── Tapping and harmonics
  const th: [string, Level, string, string, string?][] = [
    ['Natural harmonics at the 12th fret', 1, 'q 6:12n 5:12n 4:12n 3:12n 2:12n 1:12n h 3:12n',
      'Touch the string right above the 12th fret wire, don\'t press, and pick. Lift the finger just after the note sounds.'],
    ['Harmonics at the 7th and 5th frets', 2, 'q 6:7n 5:7n 4:7n 3:7n 6:5n 5:5n 4:5n 3:5n 3:7n 2:7n h 1:7n',
      'Over the 7th and 5th fret wires the harmonics are higher and need a more exact touch. Pick near the bridge.'],
    ['Harmonic chime melody', 2, 'q 3:12n 2:12n 1:12n 2:12n 3:7n 2:7n 1:7n 2:7n 4:5n 3:5n h 2:5n',
      'A little bell melody made only of harmonics. Let every note ring over the next.'],
    ['Tapping: triplets on one string', 3, 't ' + Array(4).fill('2:12t 2:5p 2:8h').join(' ') + ' ' + Array(4).fill('2:13t 2:5p 2:8h').join(' ') + ' ' + Array(4).fill('2:12t 2:5p 2:8h').join(' ') + ' h 2:12t 2:5p',
      'Tap the high note with a picking-hand finger, pull off to the 5th fret, hammer the 8th. Rest the pick in your palm.', 'A'],
    ['Tapped arpeggios: Am – F – C – G', 4, 't ' + ['3:14t 3:5p 3:9h', '3:17t 3:10p 3:14h', '3:12t 3:5p 3:9h', '3:16t 3:7p 3:12h'].map(g => Array(4).fill(g).join(' ')).join(' ') + ' h 3:14t 3:5p',
      'A tapped arpeggio on the G string for each chord. Mute the other strings with the side of the fretting hand.', 'A'],
  ]
  for (const [name, level, tab, about, key] of th) add({ type: 'tapping', kind: 'Drill', name, level, tech: tabTech(tab, 70), bpm: 70, key, minor: !!key, about,
    guitarOnly: name.startsWith('Tapped'), make: fromTab(tab, { name, ref: key, minor: !!key }) })

  // ── Rhythm and timing (one note, the open A; gallops palm-muted on the low E)
  const N16 = (n: number, x = 'N') => Array(n).fill(x).join(' ')
  const rh: [string, Level, string, string, number?][] = [
    ['Quarter notes', 1, `q ${N16(8)}`, 'Four even notes a bar. Tap your foot and play exactly with it.'],
    ['Eighth notes', 1, `e ${N16(16)}`, 'Two notes a beat, "1 and 2 and". Keep the picking hand moving down-up all the time.'],
    ['Half and whole notes', 1, 'h N N w N h N N w N', 'Long notes: let each ring its full length and come in exactly on the beat.'],
    ['Quarters and eighths', 1, 'q N N e N N q N e N N q N e N N q N q N N e N N q N e N N q N e N N q N', 'Mixing two note lengths. Count out loud: "1, 2, 3 and 4".'],
    ['Rests on the beat', 1, 'q N r N r r N r N N r N r r N r N', 'The silences are part of the rhythm. Stop the string with your palm on each rest.'],
    ['The "ands" only', 2, `e ${N16(16, 'r N')}`, 'Play only between the beats, on the "and": the reggae and ska feel. Strum down on the beat in the air.'],
    ['Dotted quarter and eighth', 2, 'q. N e N q. N e N q. N e N h N q. N e N q. N e N q. N e N h N', 'Long-short: the dotted note lasts one and a half beats. A pop and rock favourite.'],
    ['Eighth-note triplets', 2, `t ${N16(24)}`, 'Three even notes a beat: "trip-a-let". Accent the first of each three.'],
    ['Triplets and eighths', 2, `${'t N N N e N N '.repeat(4)}`.trim(), 'Switching between three and two notes a beat. The beat itself never moves.'],
    ['Sixteenth notes', 2, `s ${N16(32)}`, 'Four notes a beat: "1 e and a". Down-up-down-up, small and loose.'],
    ['Gallop', 2, `${'e M s M M '.repeat(8)}`.trim(), 'One long, two short: the galloping horse of heavy metal. Palm-mute and pick down-down-up.'],
    ['Reverse gallop', 3, `${'s M M e M '.repeat(8)}`.trim(), 'Two short, one long. Harder than it looks: keep the eighth note on the beat.'],
    ['Dotted eighth and sixteenth', 3, `${'e. N s N '.repeat(8)}`.trim(), 'A bouncy long-short inside each beat. Not the same as triplets: the short note is shorter.'],
    ['Syncopation: short-long-short', 2, 'e N q N e N q N q N e N q N e N q N q N', 'The long note starts on an "and", across the beat. Feel the beat you don\'t play.'],
    ['Sixteenth syncopation', 3, `${'s N e N s N '.repeat(8)}`.trim(), 'The middle note of each beat is longer: a funky push. Keep the hand moving in sixteenths.'],
    ['Shuffle feel', 2, `${'t N r N '.repeat(8)}`.trim(), 'Long-short "swing" eighths, the blues shuffle. Feel triplets and leave out the middle one.'],
    ['Waltz in 3/4', 1, 'q N N N h N q N q. N e N q N h. N', 'Three beats a bar: ONE two three. Accent the first beat.', 3],
    ['Five beats a bar (5/4)', 3, 'q N N N N N e N N q N e N N q N q N q N N N N N e N N q N e N N q N q N', 'Count 1-2-3, 1-2 for each bar. Odd meters feel natural once you hear them in groups.', 5],
    ['Push the beat (anticipation)', 2, 'q N e N N r N q N q N e N N r N q N', 'The third beat comes early, on the "and" of two. Pop and rock use this push all the time.'],
    ['Quarter-note triplets', 3, `${'t N r N r N r '.repeat(4)}`.trim(), 'Three notes over two beats: it sounds like the music is floating. Count triplets, play every other one.'],
    ['Sixteenth rests', 4, `s ${'N r N N r N r N N r N N r N r N '.repeat(2)}`.trim(), 'Sixteenths with gaps: precision funk rhythm. Keep the strumming hand moving even when it doesn\'t hit.'],
    ['Three over four', 4, `s ${'N r r N r r N r r N r r N r r N '.repeat(2)}`.trim(), 'A note every three sixteenths: a pattern of three across beats of four. Prog and math rock live here.'],
  ]
  for (const [name, level, text, about, meter] of rh) {
    const tab = text.replace(/\bN\b/g, '5:0').replace(/\bM\b/g, '6:0m')
    add({ type: 'rhythm', kind: 'Rhythm', name, level, tech: name.includes('allop') ? ['timing', 'pm'] : ['timing'], bpm: level >= 3 ? 70 : 80, meter, about, start: name === 'Quarter notes',
      make: fromTab(tab, { name, meter }) })
  }
  // strummed rhythm patterns from the picking patterns: bluegrass bass-strum and reggae chops
  for (const p of PICK_PATTERNS.filter(p => p.group === 'bluegrass' || p.group === 'reggae')) {
    const reggae = p.group === 'reggae'
    const plan = reggae ? { rel: [[0, 'major'], [5, 'major'], [7, 'major'], [5, 'major']] as RelChord[] } : p.id === 'waltz' ? { rel: [[0, 'major'], [7, 'major'], [0, 'major'], [5, 'major']] as RelChord[] } : { rel: [[0, 'major'], [5, 'major'], [7, 'major'], [0, 'major']] as RelChord[] }
    add({ type: 'strumming', kind: 'Pattern', name: p.label, level: p.id === 'boomchick' || p.id === 'onedrop' ? 1 : p.id === 'cross' ? 3 : 2, tech: reggae ? ['strum', 'timing', 'mute'] : p.id === 'cross' ? ['cross'] : ['strum'], bpm: reggae ? 75 : 90,
      key: reggae ? 'C' : 'G', about: p.how, meter: p.beats === 6 ? 3 : undefined, make: fromPicking(p.label, plan, p.id, { meter: p.beats === 6 ? 3 : undefined }) })
  }

  // ── Scales
  const SCALE_KEY: Record<string, string> = { 'minor pentatonic': 'A', 'major pentatonic': 'G', 'minor blues': 'A', major: 'G', aeolian: 'A', dorian: 'D', mixolydian: 'G', 'harmonic minor': 'A', phrygian: 'E', lydian: 'F', 'melodic minor': 'A', 'phrygian dominant': 'E' }
  const SCALE_ABOUT: Record<string, string> = {
    'minor pentatonic': 'Five notes, no wrong ones over a minor or blues backing: the scale of rock and blues solos.',
    'major pentatonic': 'The happy five-note scale of country, Southern rock and pop melodies.',
    'minor blues': 'The minor pentatonic plus the "blue" flat 5th: instant blues.',
    major: 'Do-re-mi: the scale most melodies and chords come from.',
    aeolian: 'The natural minor scale: sad, serious, the sound of most minor-key songs.',
    dorian: 'Minor with a brighter 6th: funk, soul, jazz and Santana-style rock.',
    mixolydian: 'Major with a flat 7th: blues-rock, jam bands and anything over a dominant 7th.',
    'harmonic minor': 'Minor with a raised 7th: classical, neoclassical metal and Spanish sounds.',
    phrygian: 'Minor with a flat 2nd: dark, Spanish and metal.',
    lydian: 'Major with a raised 4th: dreamy, floating, film-music magic.',
    'melodic minor': 'Minor with a major 6th and 7th: the modern jazz minor.',
    'phrygian dominant': 'The 5th mode of harmonic minor: flamenco, Middle Eastern and metal.',
  }
  for (const s of EX_SCALES) {
    const pent = /pentatonic|blues/.test(s.id)
    const exotic = ['harmonic minor', 'phrygian', 'lydian', 'melodic minor', 'phrygian dominant'].includes(s.id)
    const n = pent ? 5 : 7
    for (const pos of [...Array.from({ length: n }, (_, i) => i), -1]) {
      const level: Level = pos < 0 ? (exotic ? 4 : 3) : pent ? (pos <= 1 ? 1 : 2) : exotic ? 3 : 2
      const where = pos < 0 ? 'all positions' : `position ${pos + 1}`
      add({ type: 'scales', kind: 'Scale', name: `${s.label}, ${where}`, level, tech: pos < 0 ? ['alt', 'shift', 'theory'] : ['alt', 'theory'], bpm: pos < 0 ? 90 : 80,
        key: SCALE_KEY[s.id], minor: s.minor, start: s.id === 'minor pentatonic' && pos === 0,
        about: `${SCALE_ABOUT[s.id]} ${pos < 0 ? 'Every position in a row, so you see how they join up the neck.' : pent ? `Box ${pos + 1}: two notes on each string.` : `Three notes on each string, starting from position ${pos + 1}.`}`,
        make: fromSpec({ kind: 'scale', type: s.id, position: pos }) })
    }
  }
  const MODES: [string, string, string][] = [['major', 'C', 'Ionian (major)'], ['dorian', 'D', 'Dorian'], ['phrygian', 'E', 'Phrygian'], ['lydian', 'F', 'Lydian'], ['mixolydian', 'G', 'Mixolydian'], ['aeolian', 'A', 'Aeolian (natural minor)'], ['locrian', 'B', 'Locrian']]
  for (const [id, key, label] of MODES) {
    const minor = ['dorian', 'phrygian', 'aeolian', 'locrian'].includes(id)
    add({ type: 'scales', kind: 'Scale', name: `${label} on one string`, level: 2, tech: ['shift', 'slide', 'theory'], bpm: 80, key, minor,
      about: `The ${label.toLowerCase()} mode up one string and back: you hear its steps and see its shape along the neck instead of across it.`,
      make: fromLine(`${label} on one string`, (t, r) => oneString(t, r, id), { keyed: true, minor }) })
  }

  // ── Scale sequences
  const sqPlan: [string, number[]][] = [['minor pentatonic', [0, 1, 2, 3, 4, -1]], ['major pentatonic', [0, 1, 2, 3, 4, -1]], ['major', [0, 1, 2]], ['aeolian', [0, 1, 2]], ['dorian', [0, 1]], ['mixolydian', [0, 1]], ['harmonic minor', [0, 1]]]
  const SEQ_ABOUT: Record<string, string> = {
    threes: 'Groups of three: 1-2-3, 2-3-4, 3-4-5 … It turns the scale into a melody and trains both hands to stay together.',
    fours: 'Groups of four: 1-2-3-4, 2-3-4-5 … The most common speed-building sequence there is.',
    thirds: 'Skip a note each time: 1-3, 2-4, 3-5 … This is how melodies leap, and it trains string crossing.',
    triplets: 'Down three notes, then start one lower: rolling triplets that sound like a cascade.',
  }
  for (const sq of EX_SEQUENCES) {
    for (const [scale, poss] of sqPlan) {
      const s = EX_SCALES.find(x => x.id === scale)!
      for (const pos of poss) {
        const base: Level = sq.id === 'threes' || sq.id === 'thirds' ? 2 : 3
        const level = Math.min(4, base + (pos < 0 ? 1 : 0) + (scale === 'harmonic minor' ? 1 : 0)) as Level
        const label = sq.label.replace(/ \(.*\)/, '')
        add({ type: 'sequences', kind: 'Sequence', name: `${s.label} ${label.toLowerCase()}, ${pos < 0 ? 'all positions' : `position ${pos + 1}`}`, level, tech: ['alt', 'theory'], bpm: 80,
          key: SCALE_KEY[scale], minor: s.minor, about: SEQ_ABOUT[sq.id], make: fromSpec({ kind: 'sequence', type: sq.id, position: pos, scale }) })
      }
    }
  }

  // ── Arpeggios
  const ARP_KEY: Record<string, string> = { maj: 'C', min: 'A', maj7: 'C', m7: 'A', dom7: 'G', m7b5: 'B', dim7: 'B' }
  const ARP_ABOUT: Record<string, string> = {
    maj: 'Root, 3rd and 5th of a major chord, one note at a time. Play these over the chord and every note fits.',
    min: 'The minor triad: root, flat 3rd, 5th.',
    maj7: 'The dreamy major 7th chord as a line: jazz, soul and ballads.',
    m7: 'Minor 7th: the most-used chord in funk, soul and jazz, spelled out.',
    dom7: 'The dominant 7th: blues and the V chord that pulls back home.',
    m7b5: 'Half-diminished: the ii chord in a minor key. Dark and jazzy.',
    dim7: 'Every note a minor 3rd apart, so the shape repeats every three frets.',
  }
  for (const a of EX_ARPS) {
    for (const pos of [0, 1, 2, 3, 4, -1]) {
      const base: Level = a.id === 'maj' || a.id === 'min' ? 1 : a.id === 'm7b5' || a.id === 'dim7' ? 3 : 2
      const level = Math.min(4, base + (pos > 1 ? 1 : 0) + (pos < 0 ? 1 : 0)) as Level
      const key = ARP_KEY[a.id]
      add({ type: 'arpeggios', kind: 'Arpeggio', name: `${a.label} arpeggio, ${pos < 0 ? 'all positions' : `position ${pos + 1}`}`, level, tech: ['theory', 'alt'], bpm: 80,
        key, minor: a.suffix.startsWith('m') && !a.suffix.startsWith('maj'), chord: spell(pc(key), key) + a.suffix, start: a.id === 'maj' && pos === 0,
        about: ARP_ABOUT[a.id], make: fromSpec({ kind: 'arpeggio', type: a.id, position: pos }) })
    }
  }

  // ── Chord tones through the changes
  const CT_MODES: { mode: CtMode; name: string; level: number; about: string; progs: string[] }[] = [
    { mode: 'root', name: 'Arpeggio on every chord (1-3-5-7)', level: 0, progs: CT_PROGS.map(p => p.id),
      about: 'Root, 3rd, 5th and 7th (or the octave) of each chord as it comes. The first step to soloing that follows the chords.' },
    { mode: 'near', name: 'Nearest chord tone (no jumps)', level: 1, progs: CT_PROGS.map(p => p.id),
      about: 'When the chord changes, carry on from the closest note of the new chord instead of jumping to its root. This is how good solos connect the changes.' },
    { mode: 'thirds', name: 'Guide tones: the 3rds', level: 0, progs: ['I-IV-V', 'I-V-vi-IV', 'andalusian', 'blues', 'vi-IV-I-V'],
      about: 'Only the 3rd of each chord, the note that says major or minor, always taking the closest one. Hear how little the line has to move.' },
    { mode: 'guide', name: 'Guide tones: 3rds and 7ths', level: 1, progs: ['ii-V-I', 'I-vi-ii-V', 'blues', 'minor-ii-V-i'],
      about: 'The 3rd and 7th of each chord, moving to the nearest one each time. Jazz players build whole solos from these two notes.' },
    { mode: 'approach', name: 'Land on the 3rd (approach from below)', level: 1, progs: ['ii-V-I', 'blues', 'I-IV-V', 'I-V-vi-IV'],
      about: 'Three chord tones, then a note one fret below the next chord\'s 3rd, so you land on it right as the chord changes. That pull is what makes a line sound "inside".' },
  ]
  for (const m of CT_MODES) {
    for (const id of m.progs) {
      const p = CT_PROGS.find(x => x.id === id)!
      if (m.mode === 'guide' && !p.sevenths) continue
      const level = Math.min(4, p.level + m.level) as Level
      add({ type: 'changes', kind: 'Changes', name: `${m.name}: ${p.name}`, level, tech: ['theory', 'changes'], bpm: m.mode === 'thirds' || m.mode === 'guide' ? 70 : 80,
        key: p.key, minor: p.minor, about: m.about,
        make: fromLine(`${m.name}: ${p.name}`, (t, r) => chordToneLine(t, r, p, m.mode), { keyed: true, minor: p.minor }) })
    }
  }

  // ── Triads
  const sets: [number[], string][] = strings >= 6
    ? [[[3, 4, 5], 'top three strings'], [[2, 3, 4], 'strings 4-3-2'], [[1, 2, 3], 'strings 5-4-3'], [[0, 1, 2], 'bottom three strings']]
    : [[[1, 2, 3], 'top three strings'], [[0, 1, 2], 'bottom three strings']]
  const TRI: [string, number[], string, string][] = [['major', [0, 4, 7], '', 'C'], ['minor', [0, 3, 7], 'm', 'A']]
  for (const [q, ivs, suf, key] of TRI) {
    sets.forEach(([set, label], si) => add({ type: 'triads', kind: 'Triads', name: `${q[0].toUpperCase() + q.slice(1)} triads on the ${label}`, level: si === 0 ? 2 : 3, tech: ['theory', 'chords', 'shift'], bpm: 70,
      key, minor: q === 'minor', chord: key + suf,
      about: `The three inversions of a ${q} triad on three neighbouring strings, climbing the neck: each shape is the same chord with a different note on top. Arpeggiate it, then play it as a chord.`,
      make: fromLine(`${q} triads`, (t, r) => triadClimb(t, set, ivs.map(i => (pc(r) + i) % 12), spell(pc(r), r, q === 'minor') + suf), { keyed: true, minor: q === 'minor' }) }))
  }
  for (const [q, ivs, suf] of [['diminished', [0, 3, 6], 'dim'], ['augmented', [0, 4, 8], 'aug'], ['sus2', [0, 2, 7], 'sus2'], ['sus4', [0, 5, 7], 'sus4']] as [string, number[], string][]) {
    add({ type: 'triads', kind: 'Triads', name: `${q[0].toUpperCase() + q.slice(1)} triads on the top three strings`, level: q.startsWith('sus') ? 2 : 3, tech: ['theory', 'chords'], bpm: 70, key: 'C', chord: 'C' + suf,
      about: q === 'diminished' ? 'Root, flat 3rd, flat 5th: the tense triad. Its shapes are only three frets apart.' : q === 'augmented' ? 'Root, 3rd, sharp 5th: every inversion is the same shape, four frets apart.' : `The ${q} triad: no 3rd, so it is neither major nor minor. Open and modern.`,
      make: fromLine(`${q} triads`, (t, r) => triadClimb(t, sets[0][0], ivs.map(i => (pc(r) + i) % 12), spell(pc(r), r) + suf), { keyed: true }) })
  }
  for (const [set, label] of sets.slice(0, 2)) {
    add({ type: 'triads', kind: 'Triads', name: `Every chord of the key on the ${label}`, level: 3, tech: ['theory', 'chords', 'shift'], bpm: 70, key: 'C',
      about: 'The seven triads of the major key (I ii iii IV V vi vii°) one after another up the neck: you see where each chord of a key lives.',
      make: fromLine('Chords of the key', (t, r) => diatonicTriads(t, set, r), { keyed: true }) })
  }

  // ── Intervals and double stops
  const IVS: [number, string][] = [[2, '3rds'], [3, '4ths'], [4, '5ths'], [5, '6ths'], [7, 'octaves']]
  IVS.forEach(([k, label], i) => add({ type: 'intervals', kind: 'Intervals', name: `Intervals: ${label} up the major scale`, level: i < 2 ? 2 : 3, tech: ['theory', 'skip'], bpm: 70, key: 'C',
    about: `Each note of the scale followed by the note a ${label.slice(0, -1)} above it. Learn what a ${label.slice(0, -1)} looks like on the neck and how it sounds.`,
    make: fromLine(`Intervals: ${label}`, (t, r) => intervalLine(t, r, k), { keyed: true }) }))
  const top = strings - 1
  const ds: [string, number, number, number, boolean, string][] = [
    ['3rds on the top two strings', top - 1, top, 2, false, 'C'], ['3rds on the middle strings', top - 2, top - 1, 2, false, 'G'],
    ['6ths with a string between', top - 2, top, 5, false, 'G'], ['6ths lower down', top - 3, top - 1, 5, false, 'D'],
    ['Octaves on the low strings', 0, 2, 7, true, 'G'], ['Octaves on the middle strings', 1, 3, 7, true, 'C'],
  ]
  for (const [name, a, b, k, oct, key] of ds) add({ type: 'intervals', kind: 'Double stops', name: `Double stops: ${name}`, level: oct ? 2 : 3, tech: ['double', 'theory'], bpm: 70, key,
    about: oct ? 'The same note in two octaves at once, with the string between them muted: the thick jazz and rock melody sound.'
      : `Two notes of the scale ${k === 2 ? 'a 3rd' : 'a 6th'} apart, played together and moved up the key: the sweet country, soul and Hawaiian sound.`,
    make: fromLine(`Double stops: ${name}`, (t, r) => doubleStops(t, r, a, b, k, oct), { keyed: true }) })

  // ── Know the neck
  for (let s = strings - 1; s >= 0; s--) {
    const label = `string ${strings - s} (${stringName(t0, s)})`
    add({ type: 'neck', kind: 'Neck', name: `Natural notes on ${label}`, level: 1, tech: ['theory', 'shift'], bpm: 60, start: s === 0,
      about: 'The notes with no sharp or flat, up to the 12th fret and back. Say each name out loud as you play it: Play\'s numbers can show note names too.',
      make: fromLine(`Natural notes on ${label}`, t => naturals(t, s)) })
  }
  add({ type: 'neck', kind: 'Neck', name: 'Every place one note lives', level: 2, tech: ['theory', 'shift'], bpm: 60, key: 'A',
    about: 'One note on every string, low to high, up to the 15th fret. Pick another key to drill another note.',
    make: fromLine('Every place one note lives', (t, r) => everyRoot(t, r), { keyed: true }) })
  add({ type: 'neck', kind: 'Neck', name: 'Octave shapes across the neck', level: 2, tech: ['theory', 'skip'], bpm: 60, key: 'C',
    about: 'A note and its octave two strings higher. Once you know one note, these shapes find it everywhere else.',
    make: fromLine('Octave shapes', (t, r) => octaves(t, r), { keyed: true }) })

  // ── Chord changes
  for (const [a, b, level] of CHORD_PAIRS) {
    const ca = chordOf(a), cb = chordOf(b)
    const va = shapeFor(ca.root, ca.suffix, inst), vb = shapeFor(cb.root, cb.suffix, inst)
    const common = commonFinger(va, vb, strings)
    add({ type: 'chords', kind: 'Changes', name: `${a} to ${b}`, level, tech: ['changes', 'chords', 'strum'], bpm: 70, chord: a, start: a === 'E' && b === 'A',
      about: `Strum each chord four times and change right on the beat. ${common ? `Leave the finger on the ${ORD[common.n]} string, ${ORD[common.fret] || common.fret + 'th'} fret: both chords use it.` : 'Lift all your fingers together and land them as one shape.'}`,
      make: fromStrum(`${a} to ${b}`, { fixed: [a, b, a, b], times: 2 }, [[0, 'D'], [1, 'D'], [2, 'D'], [3, 'D']]) })
  }

  // ── Strumming patterns
  for (const sp of STRUMS) {
    for (const id of sp.progs) {
      const p = SPROGS[id]
      const level = Math.max(sp.level, p.level) as Level
      add({ type: 'strumming', kind: 'Strum', name: `${sp.name}: ${p.name}`, level, tech: ['strum', 'changes', 'timing'], bpm: sp.id === 'funk' ? 80 : 90, meter: sp.meter,
        key: p.key, minor: p.minor, start: sp.id === 'beats' && id === 'A',
        about: `${sp.id === 'beats' ? 'One down-strum per beat.' : 'Keep your hand moving down-up in eighths the whole time and only hit the strings where the pattern says.'} Change chords without stopping the hand.`,
        make: fromStrum(sp.name, { rel: p.chords, minor: p.minor, times: p.times ?? 2 }, sp.hits, { meter: sp.meter }) })
    }
  }

  // ── Barre chords
  const br: [string, Level, string[], 'E' | 'A' | 'any', string][] = [
    ['E-shape major barre up the neck: F – G – A – C', 2, ['F', 'G', 'A', 'C'], 'E', 'The open E chord moved up with your first finger as the nut. The root is on the low E string.'],
    ['E-shape minor barre: Gm – Am – Bm – Cm', 2, ['Gm', 'Am', 'Bm', 'Cm'], 'E', 'The Em shape barred: lift the second finger off the E-shape major and you have it.'],
    ['A-shape major barre: Bb – C – D – E', 2, ['Bb', 'C', 'D', 'E'], 'A', 'Root on the A string. Bar the three middle strings with the third finger, or use three fingers.'],
    ['A-shape minor barre: Bm – Cm – Dm – Em', 2, ['Bm', 'Cm', 'Dm', 'Em'], 'A', 'The Am shape barred, root on the A string. The most common way to play Bm.'],
    ['Barre changes: F – Dm – Bb – C', 3, ['F', 'Dm', 'Bb', 'C'], 'any', 'All barre chords, all in the key of F. Keep the thumb behind the neck and slide between shapes.'],
    ['E and A shapes together: G – C – D – G', 3, ['G', 'C', 'D', 'G'], 'any', 'G as an E-shape at the 3rd fret, C and D as A-shapes: the whole progression without leaving the 3rd–7th frets.'],
    ['Minor barres: Am – Dm – Em', 3, ['Am', 'Dm', 'Em', 'Am'], 'any', 'Minor chords with no open strings, so you can mute between strums for a tight sound.'],
    ['Barre chords in B: B – E – F#', 3, ['B', 'E', 'F#', 'B'], 'any', 'The key with no easy open chords. After this, any key is fine.'],
  ]
  for (const [name, level, chords, barre, about] of br) {
    add({ type: 'barre', kind: 'Changes', name, level, tech: ['barre', 'changes', 'strum'], bpm: 70, guitarOnly: true, chord: chords[0], about,
      make: fromStrum(name, { fixed: chords, times: 2 }, [[0, 'D'], [1, 'D'], [1.5, 'U'], [2.5, 'U'], [3, 'D'], [3.5, 'U']], { barre }) })
  }

  // ── Power chords and riffs
  const pw: [string, Level, string, string][] = [
    ['Power chords on the low E: E5 – G5 – A5', 1, 'q 6:0+5:2 6:0+5:2 6:3+5:5 6:3+5:5 6:5+5:7 6:5+5:7 h 6:0+5:2', 'Two notes, root and 5th. The first finger on the root, the third finger two frets up on the next string.'],
    ['Root on the A string: A5 – C5 – D5', 1, 'q 5:0+4:2 5:0+4:2 5:3+4:5 5:3+4:5 5:5+4:7 5:5+4:7 h 5:0+4:2', 'The same shape one string over. Rest your first finger lightly on the low E to mute it.'],
    ['Palm-muted eighths', 1, 'e 6:0m+5:2m 6:0m+5:2m 6:0m+5:2m 6:0m+5:2m 6:0m+5:2m 6:0m+5:2m 6:0m+5:2m 6:0m+5:2m 6:0m+5:2m 6:0m+5:2m 6:0m+5:2m 6:0m+5:2m q 6:3+5:5 6:5+5:7', 'Rest the side of your picking hand on the strings right by the bridge: a tight chug. Lift it for the open chords at the end.'],
    ['Punk eighths: E5 – C5 – G5 – D5', 2, 'e ' + ['6:0+5:2', '5:3+4:5', '6:3+5:5', '5:5+4:7'].map(c => Array(8).fill(c).join(' ')).join(' '), 'All downstrokes, eight per bar. Stamina and a steady wrist.'],
    ['Gallop riff', 3, 'e 6:0m s 6:0m 6:0m e 6:0m s 6:0m 6:0m e 6:0m s 6:0m 6:0m q 6:3+5:5 e 6:0m s 6:0m 6:0m e 6:0m s 6:0m 6:0m e 6:0m s 6:0m 6:0m q 6:5+5:7', 'Down-down-up gallops on the muted low E, then an open power chord. Classic metal.'],
    ['Power-chord slides', 2, 'q 6:5+5:7 6:7/+5:9/ 6:8+5:10 6:7\\+5:9\\ q 6:5+5:7 6:3+5:5 h 6:5+5:7', 'Keep the shape locked and slide the whole hand. Ease the pressure off a little while it moves.'],
    ['Chug and accent (metal)', 3, 's 6:0m 6:0m 6:0m 6:0m e 6:3+5:5 6:0m s 6:0m 6:0m 6:0m 6:0m e 6:6+5:8 6:5+5:7 s 6:0m 6:0m 6:0m 6:0m e 6:3+5:5 6:0m s 6:0m 6:0m 6:0m 6:0m h 6:6+5:8', 'Tight sixteenth chugs on the open E between accented power chords. The tritone (flat 5th) is the metal sound.'],
    ['Octave power chords (root-5-8)', 2, 'q 6:3+5:5+4:5 r 6:5+5:7+4:7 r 6:8+5:10+4:10 6:7+5:9+4:9 h 6:5+5:7+4:7', 'Three-note power chords with the octave on top: bigger and fuller. Bar the 5th and octave with the third finger.'],
    ['Riff: single notes and power chords', 2, 'e 6:0 6:3 6:5 6:0 6:3 6:6 6:5 r 6:0 6:3 6:5 6:3 q 6:0+5:2 r', 'A minor-pentatonic riff on the low E with the blue note, ending on a power chord.'],
    ['Pedal-point riff', 3, 's ' + Array(2).fill('6:0m 6:0m 4:2 6:0m 6:0m 4:4 6:0m 6:0m 4:5 6:0m 6:0m 4:4 6:0m 6:0m 4:2 6:0m').join(' ') + ' w 6:0+5:2', 'A melody on the D string over a chugging open E: the notes fall in groups of three across the beat.'],
  ]
  for (const [name, level, tab, about] of pw) add({ type: 'power', kind: 'Riff', name, level, tech: [...new Set(['power', ...tabTech(tab, 100)])], bpm: level >= 3 ? 100 : 90, key: 'E', minor: true, guitarOnly: true, about,
    make: fromTab(tab, { name, ref: name.startsWith('Root on the A') ? 'A' : 'E', minor: true, program: 30 }) })

  // ── Fingerstyle (patterns from the picking library over common progressions)
  const FS_PROGS2: [string, string, RelChord[]][] = [['C – Am – Dm – G', 'C', [[0, 'major'], [9, 'minor'], [2, 'minor'], [7, 'major']]], ['G – Em – C – D', 'G', [[0, 'major'], [9, 'minor'], [5, 'major'], [7, 'major']]]]
  const FS_LEVEL: Record<string, Level> = { thumb: 1, travis: 2, pinch: 2, pinch2: 2, three: 3, synco: 3, roll: 3, 'arp-up': 1, 'arp-updown': 1, 'arp-broken': 2, 'arp-16': 3, 'arp-pinch': 2, falling: 2 }
  for (const p of PICK_PATTERNS.filter(p => p.group === 'travis' || p.group === 'arpeggio')) {
    for (const [pname, key, rel] of FS_PROGS2) {
      add({ type: 'fingerstyle', kind: 'Pattern', name: `${p.label}: ${pname}`, level: FS_LEVEL[p.id] ?? 2, tech: ['finger'], bpm: 75, key, start: p.id === 'thumb' && key === 'C',
        about: p.how, make: fromPicking(p.label, { rel }, p.id) })
    }
  }

  // ── Melodic fingerstyle (Marco Cirillo style)
  for (const e of FS_ETUDES) {
    add({ type: 'melodic', kind: 'Study', name: e.name, level: e.level, tech: [...new Set([...e.tech, ...tabTech(e.tab, e.bpm)])], bpm: e.bpm, key: e.key, minor: e.minor, guitarOnly: true,
      start: e.id === 'pima-open', about: e.about, make: fromTab(e.tab, { name: e.name, ref: e.key, minor: e.minor, move: 'capo', program: 25 }) })
  }
  for (const [progId, patId, level] of FS_COMBOS) {
    const p = FS_PROGS.find(x => x.id === progId)!
    const pat = PICK_PATTERNS.find(x => x.id === patId)!
    const label = pat.label.replace(/ \(.*\)$/, '')
    add({ type: 'melodic', kind: 'Study', name: `${p.name.replace(/ \(.*\)$/, '')}: ${label.toLowerCase()}`, level, tech: ['finger', 'chords'], bpm: level === 3 ? 66 : 72, key: p.key, minor: p.minor,
      chord: p.chords[0], guitarOnly: true, about: `${p.about} ${pat.how}`, make: fromLush(progId, patId, `${p.name.replace(/ \(.*\)$/, '')}: ${label.toLowerCase()}`) })
  }

  // ── Licks (every lick in the lick library)
  for (const l of LICKS) {
    const st = lickStyle(l.style)
    const bpm = l.bpm ?? st.bpm
    const fast = l.level === 3 && (/\b(x|sx)\b/.test(l.tab) || bpm >= 150)
    add({ type: `lick:${l.style}`, kind: KIND[l.kind] ?? 'Lick', name: l.name, level: (fast ? 4 : l.level) as Level, tech: tabTech(l.tab, bpm), bpm, meter: l.meter,
      key: l.ref, minor: l.minor ?? st.minor, chord: l.chord?.split(' ')[0], lick: l.id, about: lickAbout(l),
      make: ({ root, inst: i, bpm: b }) => lickInKey(l, root, i.midis, b)?.song ?? null })
  }
  return D
}

const KIND: Record<string, string> = { lick: 'Lick', arpeggio: 'Arpeggio', run: 'Run', riff: 'Riff', ending: 'Ending', 'double-stop': 'Double stops', turnaround: 'Turnaround' }
function lickAbout(l: LickDef) {
  if (l.must) return l.must.about.split(/(?<=\.)\s/)[0]
  const tech = tabTech(l.tab, l.bpm ?? lickStyle(l.style).bpm).filter(t => t !== 'speed').map(t => TECHS.find(x => x.id === t)?.label.toLowerCase()).filter(Boolean)
  return `${KIND[l.kind] ?? 'Lick'}${l.chord ? ` over ${l.chord.split(' ')[0]}` : ''}${tech.length ? ` with ${tech.slice(0, 3).join(', ')}` : ''}.`
}

/** Keys an exercise can be played in (the written key first). */
export function keysFor(e: Exercise, inst: Instrument): string[] {
  if (!e.key) return []
  const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
  if (e.lick) {
    const l = LICKS.find(x => x.id === e.lick)!
    return KEYS.filter(k => !!placeFor(l, k))
  }
  return KEYS.filter(k => { try { return !!e.make({ root: k, inst, bpm: e.bpm }) } catch { return false } })
}
export const keyName = (root: string, minor = false) => (keyPrefersFlats(root, minor) ? FLATS : SHARPS)[pc(root)] + (minor ? 'm' : '')
export const levelName = (l: Level) => LEVELS[l]
export const typeOf = (id: string) => EX_TYPES.find(t => t.id === id)

// Interactive drill generators for Learn → Exercises → Drill lab:
//   1. Scale builder: any key, scale, position/3NPS/1-string layout, sequence pattern, and subdivision.
//   2. Stretch rack: progressive finger stretches, pinky reaches, diagonal climbs, and anchored spiders.
//   3. Rhythm lab: 4/4, 3/4, 5/4, 7/4 with straight, gallop, reverse gallop, syncopated, odd-group, chug, and tap feels.
//   4. Burst mode planner: step-by-step BPM ramp with optional rest bars between steps.
import { Scale } from 'tonal'
import { EX_SCALES, scalePosition, type Placed } from '../tabs/exercises'
import type { Song } from '../tabs/model'
import { FLATS, SHARPS, keyPrefersFlats, pc } from '../theory/notes'
import { ev, eventSong, nt, scalePcs, tonesIn, type ChordEvent } from './build'

export type SubId = '8' | 't' | '16' | 'sx'
export const SUBS: { id: SubId; label: string; dur: number }[] = [
  { id: '8', label: '8ths', dur: 0.5 },
  { id: 't', label: 'Triplets', dur: 1 / 3 },
  { id: '16', label: '16ths', dur: 0.25 },
  { id: 'sx', label: 'Sextuplets', dur: 1 / 6 },
]

export type ScaleLayout = 'position' | '3nps' | 'oneString'
export type ScalePattern = 'updown' | 'threes' | 'fours' | 'thirds' | 'sextuplets' | 'legato' | 'pedal' | 'skip'
export const SCALE_PATTERNS: { id: ScalePattern; label: string }[] = [
  { id: 'updown', label: 'Up & down' },
  { id: 'threes', label: 'In 3s' },
  { id: 'fours', label: 'In 4s' },
  { id: 'thirds', label: 'Broken 3rds' },
  { id: 'sextuplets', label: '6-note rolls' },
  { id: 'legato', label: 'Legato (h / p)' },
  { id: 'pedal', label: 'Pedal tone' },
  { id: 'skip', label: 'String skips' },
]

export interface ScaleBuildOpts {
  root: string
  scale: string
  /** 0-based position, or -1 for all positions (capped cleanly for sequence modes) */
  position: number
  layout: ScaleLayout
  pattern: ScalePattern
  sub: SubId
  bpm: number
}

const r12 = (n: number) => ((n % 12) + 12) % 12
const linear = (t: number[]) => t.every((m, i) => i === 0 || m > t[i - 1])
const keyWord = (root: string, minor: boolean) => (keyPrefersFlats(root, minor) ? FLATS : SHARPS)[pc(root)] + (minor ? 'm' : '')

function threeNps(tuning: number[], rootPc: number, pcs: number[], pos: number): Placed[] {
  if (!linear(tuning)) return scalePosition(tuning, rootPc, pcs, pos)
  const starts: number[] = []
  for (let f = 0; f <= 16; f++) if (pcs.includes((tuning[0] + f) % 12)) starts.push(f)
  const rootFret = starts.find(f => (tuning[0] + f) % 12 === rootPc && f >= 1) ?? starts[0] ?? 0
  let rootIdx = starts.indexOf(rootFret)
  if (rootIdx < 0) rootIdx = 0
  let start = starts[(rootIdx + pos) % starts.length]
  if (start > 12) start -= 12
  const pitches: number[] = []
  for (let m = tuning[0] + start; m <= tuning[tuning.length - 1] + 24; m++) if (pcs.includes(m % 12)) pitches.push(m)
  const out: Placed[] = []
  let k = 0
  tuning.forEach((open, s) => {
    for (let n = 0; n < 3 && k < pitches.length; n++, k++) {
      const fret = pitches[k] - open
      if (fret < 0) { n--; continue }
      if (fret <= 22) out.push({ string: s, fret, midi: pitches[k] })
    }
  })
  return out
}

function oneStringScale(tuning: number[], root: string, scale: string): Placed[] {
  const pcs = scalePcs(root, scale)
  const opts = [tuning.length - 1, Math.max(0, tuning.length - 2)]
    .map(s => ({ s, r: r12(pc(root) - tuning[s]) }))
    .sort((a, b) => a.r - b.r)
  const { s, r } = opts[0]
  const up = tonesIn(pcs, tuning[s] + r, tuning[s] + r + 12)
  return up
    .map(m => ({ string: s, fret: m - tuning[s], midi: m }))
    .filter(p => p.fret >= 0 && p.fret <= 22)
}

function applyScalePattern(up: Placed[], pattern: ScalePattern, dur: number, chord?: string): ChordEvent[] {
  if (up.length < 2) return []
  const toEv = (arr: Placed[], legato?: 'asc' | 'desc'): ChordEvent[] => arr.map((p, i) => {
    let tech: string | undefined
    if (legato === 'asc' && i > 0 && arr[i - 1].string === p.string && p.fret > arr[i - 1].fret) tech = 'h'
    else if (legato === 'desc' && i > 0 && arr[i - 1].string === p.string && p.fret < arr[i - 1].fret) tech = 'p'
    return { dur, notes: [nt(p.string, p.fret, tech)], ...(i === 0 && chord ? { chord } : {}) }
  })
  if (pattern === 'updown') return toEv([...up, ...up.slice(0, -1).reverse()])
  if (pattern === 'legato') {
    const down = up.slice(0, -1).reverse()
    return [...toEv(up, 'asc'), ...toEv(down, 'desc'), ev(1, nt(up[0].string, up[0].fret))]
  }
  if (pattern === 'threes' && up.length >= 3) {
    return toEv(up.slice(0, -2).flatMap((_, i) => up.slice(i, i + 3)))
  }
  if (pattern === 'fours' && up.length >= 4) {
    return toEv(up.slice(0, -3).flatMap((_, i) => up.slice(i, i + 4)))
  }
  if (pattern === 'thirds' && up.length >= 3) {
    return toEv(up.slice(0, -2).flatMap((_, i) => [up[i], up[i + 2]]))
  }
  if (pattern === 'sextuplets' && up.length >= 4) {
    return toEv(up.slice(0, -3).flatMap((_, i) => [up[i], up[i + 1], up[i + 2], up[i + 3], up[i + 2], up[i + 1]]))
  }
  if (pattern === 'pedal') {
    const ped = up[0]
    const mel = [...up.slice(1), ...up.slice(1, -1).reverse()]
    const seq: Placed[] = []
    for (const p of mel) seq.push(p, ped)
    return toEv(seq)
  }
  if (pattern === 'skip') {
    const byStr = new Map<number, Placed[]>()
    for (const p of up) { const a = byStr.get(p.string) ?? []; a.push(p); byStr.set(p.string, a) }
    const strs = [...byStr.keys()].sort((a, b) => a - b)
    if (strs.length >= 3) {
      const seq: Placed[] = []
      for (let i = 0; i + 2 < strs.length; i++) {
        const a = byStr.get(strs[i])!, b = byStr.get(strs[i + 2])!
        for (let k = 0; k < Math.min(a.length, b.length); k++) seq.push(a[k], b[k])
      }
      if (seq.length >= 4) return toEv([...seq, ...seq.slice(0, -1).reverse()])
    }
    return toEv(up.slice(0, -3).flatMap((_, i) => [up[i], up[i + 3]]))
  }
  return toEv([...up, ...up.slice(0, -1).reverse()])
}

export function scaleBuilderSong(o: ScaleBuildOpts, tuning: number[]): { song: Song; title: string; minor: boolean } | null {
  const def = EX_SCALES.find(s => s.id === o.scale) ?? EX_SCALES[0]
  const pcs = Scale.get(`${SHARPS[pc(o.root)]} ${def.id}`).notes.map(pc)
  if (!pcs.length) return null
  const dur = SUBS.find(s => s.id === o.sub)?.dur ?? 0.5
  const chord = keyWord(o.root, def.minor)
  const nPos = pcs.length <= 6 ? 5 : 7
  const poss = o.layout === 'oneString' ? [0] : o.position < 0 ? Array.from({ length: Math.min(5, nPos) }, (_, i) => i) : [o.position]
  const events: ChordEvent[] = []
  for (const pos of poss) {
    const up = o.layout === 'oneString'
      ? oneStringScale(tuning, o.root, def.id)
      : o.layout === '3nps'
        ? threeNps(tuning, pc(o.root), pcs, pos)
        : scalePosition(tuning, pc(o.root), pcs, pos)
    if (up.length < 3) continue
    events.push(...applyScalePattern(up, o.pattern, dur, events.length === 0 ? chord : undefined))
    if (poss.length > 1) events.push(ev(1))
  }
  if (!events.length) return null
  const patLabel = SCALE_PATTERNS.find(p => p.id === o.pattern)?.label ?? 'Up & down'
  const title = `${chord} ${def.label.toLowerCase()} · ${patLabel}`
  return { song: eventSong(events, { tuning, title, tempo: o.bpm }), title, minor: def.minor }
}

// ───────────────────────────── Stretch Rack

export type StretchShape = '124' | '134' | '1234w' | '135' | '1245' | 'diag'
export type StretchMode = 'across' | 'descend' | 'anchor'
export const STRETCH_SHAPES: { id: StretchShape; label: string; offsets: number[] }[] = [
  { id: '124', label: '1-2-4 whole step (e.g. 5-7-9)', offsets: [0, 2, 4] },
  { id: '134', label: '1-3-4 wide top (e.g. 5-8-9)', offsets: [0, 3, 4] },
  { id: '1234w', label: '1-2-3-4 five-fret span (5-7-8-10)', offsets: [0, 2, 3, 5] },
  { id: '135', label: '1-3-5 giant stretch (5-7-9-11)', offsets: [0, 2, 4, 6] },
  { id: '1245', label: '1-2-4-5 pinky reach (5-6-8-10)', offsets: [0, 1, 3, 5] },
  { id: 'diag', label: 'Diagonal 4-string span', offsets: [0, 2, 4, 6] },
]

export interface StretchOpts {
  startFret: number
  shape: StretchShape
  mode: StretchMode
  legato: boolean
  bpm: number
}

export function stretchRackSong(o: StretchOpts, tuning: number[]): { song: Song; title: string } | null {
  const def = STRETCH_SHAPES.find(s => s.id === o.shape) ?? STRETCH_SHAPES[0]
  const maxOff = Math.max(...def.offsets)
  const base0 = Math.max(1, Math.min(22 - maxOff, o.startFret))
  const events: ChordEvent[] = []
  const dur = def.offsets.length === 3 ? 1 / 3 : 0.25

  if (o.shape === 'diag') {
    const bases = o.mode === 'descend' ? [base0, Math.max(1, base0 - 2), Math.max(1, base0 - 4)] : [base0]
    for (const b of bases) {
      for (let s = 0; s + 3 < tuning.length; s++) {
        for (let k = 0; k < 4; k++) events.push(ev(0.25, nt(s + k, Math.min(22, b + k * 2))))
        for (let k = 3; k >= 0; k--) events.push(ev(0.25, nt(s + k, Math.min(22, b + k * 2))))
      }
      if (!events.length) {
        // 3/4-string fallback if < 4 strings
        for (let s = 0; s < tuning.length; s++) events.push(ev(0.25, nt(s, Math.min(22, b + s * 2))))
      }
    }
  } else if (o.mode === 'anchor') {
    for (let s = 0; s + 1 < tuning.length; s++) {
      const [a, b, c] = def.offsets
      const d = def.offsets[3] ?? def.offsets[2]
      events.push(
        ev(0.25, nt(s, base0 + a)),
        ev(0.25, nt(s + 1, base0 + b)),
        ev(0.25, nt(s, base0 + c, o.legato ? 'h' : undefined)),
        ev(0.25, nt(s + 1, base0 + d, o.legato ? 'h' : undefined)),
      )
    }
    for (let s = tuning.length - 2; s >= 0; s--) {
      const [a, b, c] = def.offsets
      const d = def.offsets[3] ?? def.offsets[2]
      events.push(
        ev(0.25, nt(s + 1, base0 + d)),
        ev(0.25, nt(s, base0 + c, o.legato ? 'p' : undefined)),
        ev(0.25, nt(s + 1, base0 + b, o.legato ? 'p' : undefined)),
        ev(0.25, nt(s, base0 + a)),
      )
    }
  } else {
    const bases = o.mode === 'descend'
      ? [...new Set([base0, Math.max(1, base0 - 2), Math.max(1, base0 - 4), 1].filter(b => b <= base0))]
      : [base0]
    for (const b of bases) {
      for (let s = 0; s < tuning.length; s++) {
        def.offsets.forEach((off, i) => events.push(ev(dur, nt(s, b + off, o.legato && i > 0 ? 'h' : undefined))))
      }
      for (let s = tuning.length - 1; s >= 0; s--) {
        const rev = [...def.offsets].reverse()
        rev.forEach((off, i) => events.push(ev(dur, nt(s, b + off, o.legato && i > 0 ? 'p' : undefined))))
      }
    }
  }
  if (!events.length) return null
  const title = `Stretch rack · ${def.label.split(' (')[0]} (fret ${base0})`
  return { song: eventSong(events, { tuning, title, tempo: o.bpm }), title }
}

// ───────────────────────────── Rhythm Lab

export type RhythmFeel = 'straight' | 'gallop' | 'reverse' | 'sync' | 'odd' | 'chug' | 'tap'
export const RHYTHM_FEELS: { id: RhythmFeel; label: string }[] = [
  { id: 'straight', label: 'Straight grid' },
  { id: 'gallop', label: 'Gallop (8th + two 16ths)' },
  { id: 'reverse', label: 'Reverse gallop' },
  { id: 'sync', label: 'Syncopated accents' },
  { id: 'odd', label: 'Odd-meter accents (3+2 / 2+2+3)' },
  { id: 'chug', label: 'Palm-mute chugs + accents' },
  { id: 'tap', label: 'Two-hand rhythm tap' },
]

export interface RhythmOpts {
  meter: 3 | 4 | 5 | 7
  sub: SubId
  feel: RhythmFeel
  root: string
  bars: 2 | 4
  bpm: number
}

export function rhythmLabSong(o: RhythmOpts, tuning: number[]): { song: Song; title: string } | null {
  const targetPc = pc(o.root)
  // pick lowest string + fret in 0..7 matching root, fallback to lowest string fret 0
  let sRoot = 0, fRoot = 0
  for (let s = 0; s < tuning.length; s++) {
    const f = r12(targetPc - tuning[s])
    if (f <= 7) { sRoot = s; fRoot = f; break }
  }
  const sNext = Math.min(tuning.length - 1, sRoot + 1)
  const fFifth = sNext !== sRoot ? Math.max(0, Math.min(20, (tuning[sRoot] + fRoot + 7) - tuning[sNext])) : fRoot + 2
  const sTop = tuning.length - 1
  const fTop = Math.min(17, r12(targetPc - tuning[sTop]) + 12)
  const chug = (pm = true) => nt(sRoot, fRoot, pm ? 'PM' : undefined)
  const accent = () => (sNext !== sRoot ? [nt(sRoot, fRoot), nt(sNext, fFifth)] : [nt(sRoot, fRoot + 2)])

  const events: ChordEvent[] = []
  for (let b = 0; b < o.bars; b++) {
    if (o.feel === 'gallop') {
      for (let beat = 0; beat < o.meter; beat++) {
        events.push(ev(0.5, chug(true)), ev(0.25, chug(true)), ev(0.25, chug(true)))
      }
    } else if (o.feel === 'reverse') {
      for (let beat = 0; beat < o.meter; beat++) {
        events.push(ev(0.25, chug(true)), ev(0.25, chug(true)), ev(0.5, chug(true)))
      }
    } else if (o.feel === 'tap') {
      for (let beat = 0; beat < o.meter; beat++) {
        if (o.sub === '16' || o.sub === 'sx') {
          const d = o.sub === '16' ? 0.25 : 1 / 6
          const reps = o.sub === '16' ? 1 : 1
          for (let r = 0; r < reps; r++) {
            events.push(ev(d, nt(sTop, Math.min(20, fTop), 'T')), ev(d, nt(sTop, Math.max(0, fTop - 7), 'p')), ev(d, nt(sTop, Math.max(0, fTop - 4), 'h')))
            if (o.sub === '16') events.push(ev(d, nt(sTop, Math.min(20, fTop - 2), 'T')))
            else events.push(ev(d, nt(sTop, Math.min(20, fTop), 'T')), ev(d, nt(sTop, Math.max(0, fTop - 7), 'p')), ev(d, nt(sTop, Math.max(0, fTop - 4), 'h')))
          }
        } else {
          events.push(ev(1 / 3, nt(sTop, Math.min(20, fTop), 'T')), ev(1 / 3, nt(sTop, Math.max(0, fTop - 7), 'p')), ev(1 / 3, nt(sTop, Math.max(0, fTop - 4), 'h')))
        }
      }
    } else if (o.feel === 'odd') {
      const groups = o.meter === 7 ? [2, 2, 3] : o.meter === 5 ? [3, 2] : o.meter === 3 ? [2, 1] : [3, 3, 2]
      const grid = o.meter === 4 ? 0.5 : 1
      let pos = 0
      for (const g of groups) {
        events.push(ev(grid, ...accent()))
        for (let i = 1; i < g; i++) events.push(ev(grid, chug(true)))
        pos += g * grid
      }
      if (pos < o.meter - 1e-6) events.push(ev(o.meter - pos))
    } else if (o.feel === 'sync') {
      for (let beat = 0; beat < o.meter; beat++) {
        if (beat % 2 === 0) events.push(ev(0.5, ...accent()), ev(0.25, chug(true)), ev(0.25, chug(true)))
        else events.push(ev(0.25, chug(true)), ev(0.5, ...accent()), ev(0.25, chug(true)))
      }
    } else if (o.feel === 'chug') {
      for (let beat = 0; beat < o.meter; beat++) {
        const ac = beat === 0 || (o.meter === 7 && (beat === 2 || beat === 4)) || (o.meter === 5 && beat === 3)
        events.push(ev(0.25, ...(ac ? accent() : [chug(true)])), ev(0.25, chug(true)), ev(0.25, chug(true)), ev(0.25, chug(true)))
      }
    } else {
      const dur = SUBS.find(s => s.id === o.sub)?.dur ?? 0.5
      const perBeat = Math.round(1 / dur)
      for (let beat = 0; beat < o.meter; beat++) {
        for (let k = 0; k < perBeat; k++) {
          events.push(ev(dur, ...(k === 0 && beat === 0 ? accent() : [nt(sRoot, fRoot)])))
        }
      }
    }
  }
  const feelLabel = RHYTHM_FEELS.find(f => f.id === o.feel)?.label.split(' (')[0] ?? o.feel
  const title = `Rhythm lab · ${o.meter}/4 ${feelLabel} (${o.root})`
  return { song: eventSong(events, { tuning, title, tempo: o.bpm, meter: o.meter }), title }
}

// ───────────────────────────── Burst mode step planner

export interface BurstConfig {
  on: boolean
  stepBpm: number
  steps: number
  reps: number
  restBars: number
}

export interface BurstStep {
  index: number
  rep: number
  bpm: number
  restBeforeBars: number
}

/** Expand a Burst Mode setup into an ordered list of playback steps. */
export function planBurstSteps(baseBpm: number, cfg: BurstConfig): BurstStep[] {
  const steps = Math.max(1, Math.min(8, Math.round(cfg.steps)))
  const reps = Math.max(1, Math.min(4, Math.round(cfg.reps)))
  const inc = Math.max(1, Math.round(cfg.stepBpm))
  const rest = Math.max(0, Math.min(2, Math.round(cfg.restBars)))
  const out: BurstStep[] = []
  for (let s = 0; s < steps; s++) {
    const bpm = Math.min(240, baseBpm + s * inc)
    for (let r = 0; r < reps; r++) {
      out.push({
        index: s,
        rep: r,
        bpm,
        restBeforeBars: s > 0 && r === 0 ? rest : 0,
      })
    }
  }
  return out
}

// ───────────────────────────── Speed log & saved Drill Lab presets

export interface DrillBest { bpm: number; input: string; at: number }
export interface SavedLabDrill {
  id: string
  title: string
  mode: 'scale' | 'stretch' | 'rhythm'
  docId: string
  bpm: number
  at: number
  params: Record<string, string | number | boolean>
}

const BEST_KEY = 'kg:exBest'
const LAB_SAVED_KEY = 'kg:labSaved'

function lsRead<T>(k: string, d: T): T {
  try {
    if (typeof localStorage === 'undefined') return d
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : d
  } catch { return d }
}
function lsWrite(k: string, v: unknown) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, JSON.stringify(v)) } catch { /* private */ }
}

/** Highest clean BPM logged for an exercise/drill on a given input ('mic' | 'usb' | 'pedal'). */
export function loadDrillBests(): Record<string, DrillBest> {
  return lsRead<Record<string, DrillBest>>(BEST_KEY, {})
}

export function bestBpmFor(code: string, input = 'mic'): number | null {
  const map = loadDrillBests()
  return map[`${code}|${input}`]?.bpm ?? null
}

/** Save a clean BPM milestone. Returns true if it beat the previous best for this code + input. */
export function recordBestBpm(code: string, bpm: number, input = 'mic', now = Date.now()): boolean {
  const clean = Math.max(30, Math.min(240, Math.round(bpm)))
  const map = loadDrillBests()
  const key = `${code}|${input}`
  const prev = map[key]?.bpm ?? 0
  if (clean <= prev) return false
  map[key] = { bpm: clean, input, at: now }
  lsWrite(BEST_KEY, map)
  return true
}

export function savedLabDrills(): SavedLabDrill[] {
  return lsRead<SavedLabDrill[]>(LAB_SAVED_KEY, [])
}

export function saveLabDrill(entry: Omit<SavedLabDrill, 'at'>, now = Date.now()): SavedLabDrill[] {
  const next: SavedLabDrill[] = [{ ...entry, at: now }, ...savedLabDrills().filter(x => x.id !== entry.id)].slice(0, 10)
  lsWrite(LAB_SAVED_KEY, next)
  return next
}

export function removeLabDrill(id: string): SavedLabDrill[] {
  const next = savedLabDrills().filter(x => x.id !== id)
  lsWrite(LAB_SAVED_KEY, next)
  return next
}


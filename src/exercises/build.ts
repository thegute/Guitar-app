// Building blocks for the exercise library: every exercise is a recipe that turns (key, instrument, tempo) into a
// one-track song. Recipes come in a few kinds: tab written for standard guitar (moved to the key, re-fingered for
// other tunings), lines generated for whatever strings you have, chords strummed or picked with the instrument's own
// shapes, and the scale / arpeggio builder the practice tabs already used.
import { Scale } from 'tonal'
import { chordShapes, SUFFIX_IV, type Instrument } from '../instrument'
import { FLATS, SHARPS, keyPrefersFlats, pc } from '../theory/notes'
import { chordSymbol, type Voicing } from '../theory/chords'
import type { Song, SongBar, SongNote, SongStep } from '../tabs/model'
import { fretSpan, lickSong, parseLick, type LickEvent, type LickNote } from '../licks/notation'
import { isStandard, keyLabel, retune } from '../licks/generator'
import { buildExercise, placePitches, type ExerciseSpec } from '../tabs/exercises'
import { pickingSong } from '../tabs/picking'

export interface Ctx { root: string; inst: Instrument; bpm: number }
export type Make = (c: Ctx) => Song | null
export type Move = 'shift' | 'capo' | 'fixed'

/** A note for generated lines (string 0 = lowest). */
export const nt = (string: number, fret: number, tech?: string): LickNote => ({ string, fret, ...(tech ? { tech } : {}) })
export const ev = (dur: number, ...notes: LickNote[]): LickEvent => ({ dur, notes })
export interface ChordEvent extends LickEvent { chord?: string }

const r12 = (n: number) => ((n % 12) + 12) % 12
/** A note name in a key's spelling. */
export function spell(p: number, key: string, minor = false) {
  return (keyPrefersFlats(key, minor) ? FLATS : SHARPS)[r12(p)]
}

/** Events (with chord names) → a song, splitting notes that cross a bar line the way lickSong does. */
export function eventSong(events: ChordEvent[], o: { tuning: number[]; title: string; tempo: number; meter?: number; program?: number }): Song {
  const meter = o.meter ?? 4
  const bars: SongBar[] = []
  let bar: SongStep[] = [], used = 0
  const push = (st: SongStep) => {
    bar.push(st)
    used += st.dur
    if (used >= meter - 1e-6) { bars.push({ steps: bar }); bar = []; used = 0 }
  }
  for (const e of events) {
    let left = e.dur, first = true
    while (left > 1e-6) {
      const take = Math.min(left, meter - used)
      const notes: SongNote[] = first ? e.notes.map(n => ({ string: n.string, fret: n.fret, midi: o.tuning[n.string] + n.fret, ...(n.tech ? { tech: n.tech } : {}) })) : []
      push({ notes, dur: Math.round(take * 10000) / 10000, ...(first && e.chord ? { chord: e.chord } : {}) })
      left -= take
      first = false
    }
  }
  if (bar.length) { bar.push({ notes: [], dur: Math.round((meter - used) * 10000) / 10000 }); bars.push({ steps: bar }) }
  return { title: o.title, tempo: o.tempo, ...(meter !== 4 ? { meter } : {}), tracks: [{ name: o.title, tuning: o.tuning, capo: 0, bars, program: o.program }] }
}

const playableOn = (events: LickEvent[]) => events.some(e => e.notes.length) && events.every(e => e.notes.every(n => n.fret >= 0 && n.fret <= 22))

/** Tab written for standard guitar in a reference key (see licks/notation.ts for the notation). */
export function fromTab(text: string, o: { name: string; ref?: string; minor?: boolean; move?: Move; meter?: number; program?: number }): Make {
  const parsed = parseLick(text).events
  return ({ root, inst, bpm }) => {
    let events = parsed
    let capo = 0
    if (o.ref) {
      const d = r12(pc(root) - pc(o.ref))
      const move = o.move ?? 'shift'
      if (move === 'fixed') { if (d) return null }
      else if (move === 'capo') { if (d > 7) return null; capo = d }
      else if (d) {
        const span = fretSpan(parsed)
        const opts = [d, d - 12].filter(s => s >= (span.open ? 0 : 1 - span.lo) && span.hi + s <= 19)
        if (!opts.length) return null
        const s = opts.sort((a, b) => Math.abs(a) + (span.hi + a > 15 ? 6 : 0) - Math.abs(b) - (span.hi + b > 15 ? 6 : 0))[0]
        events = parsed.map(e => ({ dur: e.dur, notes: e.notes.map(n => (n.tech === 'x' ? n : { ...n, fret: n.fret + s })) }))
      }
    }
    if (!isStandard(inst.midis)) { events = retune(events, capo, inst.midis); capo = 0 }
    if (!playableOn(events)) return null
    const title = o.ref ? `${o.name} (${keyLabel(root, !!o.minor)})` : o.name
    return lickSong(events, { tuning: inst.midis, capo, title, tempo: bpm, meter: o.meter, program: o.program })
  }
}

/** A line generated for the instrument's own strings. */
export function fromLine(name: string, f: (tuning: number[], root: string) => ChordEvent[] | null, o: { keyed?: boolean; minor?: boolean; meter?: number; program?: number } = {}): Make {
  return ({ root, inst, bpm }) => {
    const events = f(inst.midis, root)
    if (!events || !playableOn(events)) return null
    return eventSong(events, { tuning: inst.midis, title: o.keyed ? `${name} (${keyLabel(root, !!o.minor)})` : name, tempo: bpm, meter: o.meter, program: o.program })
  }
}

/** The scale / sequence / arpeggio / warm-up builder from the practice tabs. */
export function fromSpec(spec: Omit<ExerciseSpec, 'root'>): Make {
  return ({ root, inst, bpm }) => {
    const s = buildExercise({ ...spec, root }, inst.midis)
    if (!s.tracks[0].bars.some(b => b.steps.some(st => st.notes.length))) return null
    // re-bar it so notes that cross a bar line are split (the builder just groups steps)
    const events: ChordEvent[] = s.tracks[0].bars.flatMap(b => b.steps).map(st => ({ dur: st.dur, notes: st.notes.map(n => nt(n.string, n.fret, n.tech)), ...(st.chord ? { chord: st.chord } : {}) }))
    return eventSong(events, { tuning: inst.midis, title: s.title, tempo: bpm })
  }
}

// ---------- chords

/** A chord given relative to the key: [semitones above the key's root, chord suffix]. */
export type RelChord = [number, string]
export function chordsIn(key: string, minor: boolean, rel: RelChord[]) {
  return rel.map(([semi, suffix]) => {
    const root = spell(pc(key) + semi, key, minor)
    return { root, suffix, name: chordSymbol(root, suffix) }
  })
}
/** Parse "Am", "G7", "F#m", "Bb" into root + library suffix. */
export function chordOf(name: string) {
  const m = /^([A-G][#b]?)(.*)$/.exec(name)!
  const map: Record<string, string> = { '': 'major', m: 'minor', '7': '7', m7: 'm7', maj7: 'maj7', '5': '5', sus2: 'sus2', sus4: 'sus4', dim: 'dim', m7b5: 'm7b5' }
  return { root: m[1], suffix: map[m[2]] ?? 'major', name }
}

/** The shape to use: the instrument's first (most common) one, or the first that passes `want`. */
export function shapeFor(root: string, suffix: string, inst: Instrument, want?: (v: Voicing) => boolean): Voicing | null {
  const all = chordShapes(root, suffix, inst)
  return (want ? all.find(want) : all[0]) ?? null
}
const notesOf = (v: Voicing): LickNote[] => v.frets.flatMap((f, s) => (f >= 0 ? [nt(s, f)] : []))

/** A strum: when in the bar (beats) and which way. */
export type Hit = [number, 'D' | 'U']
/** Strum chords with a pattern: each chord lasts `beats` (default a bar); up-strums catch the top four strings. */
export function strumLine(chords: { name: string; v: Voicing; beats: number }[], hits: Hit[], span: number): ChordEvent[] {
  const out: ChordEvent[] = []
  for (const c of chords) {
    const all = notesOf(c.v)
    const up = all.length > 4 ? all.slice(-4) : all
    const times: Hit[] = []
    for (let off = 0; off < c.beats - 1e-6; off += span) for (const [at, d] of hits) if (off + at < c.beats - 1e-6) times.push([off + at, d])
    if (!times.length || times[0][0] > 1e-6) out.push({ dur: times.length ? times[0][0] : c.beats, notes: [], chord: c.name })
    times.forEach(([at, d], i) => {
      const next = i + 1 < times.length ? times[i + 1][0] : c.beats
      out.push({ dur: next - at, notes: d === 'U' ? up : all, ...(i === 0 && at < 1e-6 ? { chord: c.name } : {}) })
    })
  }
  return out
}

export interface ChordPlan { rel?: RelChord[]; fixed?: string[]; key?: string; minor?: boolean; beats?: number; times?: number }
/** Barre shapes worked out on standard tuning: the E shape (root on the low E) and the A shape (root on the A string). */
export function barreShape(root: string, suffix: string, inst: Instrument, kind: 'E' | 'A' | 'any'): Voicing | null {
  if (!isStandard(inst.midis) || (suffix !== 'major' && suffix !== 'minor')) return null
  const minor = suffix === 'minor'
  const mk = (frets: number[]): Voicing => ({ frets, fingers: frets.map(() => 0), barres: [Math.min(...frets.filter(f => f > 0))], baseFret: Math.min(...frets.filter(f => f > 0)), midi: frets.flatMap((f, s) => (f >= 0 ? [inst.midis[s] + f] : [])) })
  const e = r12(pc(root) - 4) || 12, a = r12(pc(root) - 9) || 12
  const E = mk(minor ? [e, e + 2, e + 2, e, e, e] : [e, e + 2, e + 2, e + 1, e, e])
  const A = mk(minor ? [-1, a, a + 2, a + 2, a + 1, a] : [-1, a, a + 2, a + 2, a + 2, a])
  if (kind === 'E') return E
  if (kind === 'A') return A
  return Math.abs(e - 5) <= Math.abs(a - 5) ? E : A
}

function planChords(p: ChordPlan, root: string, inst: Instrument, want?: (v: Voicing) => boolean, voice?: (root: string, suffix: string) => Voicing | null) {
  const list = p.fixed ? p.fixed.map(chordOf) : chordsIn(root, !!p.minor, p.rel ?? [])
  const out: { name: string; root: string; v: Voicing; beats: number }[] = []
  for (let t = 0; t < (p.times ?? 2); t++) {
    for (const c of list) {
      const v = voice ? voice(c.root, c.suffix) : shapeFor(c.root, c.suffix, inst, want)
      if (!v) return null
      out.push({ name: c.name, root: c.root, v, beats: p.beats ?? 4 })
    }
  }
  return out
}

/** Chords strummed with a pattern. Keyed plans move with the key; fixed ones only play as written. */
export function fromStrum(name: string, plan: ChordPlan, hits: Hit[], o: { span?: number; meter?: number; want?: (v: Voicing) => boolean; barre?: 'E' | 'A' | 'any' } = {}): Make {
  return ({ root, inst, bpm }) => {
    if (plan.fixed && plan.key && root !== plan.key) return null
    const chords = planChords(plan, plan.fixed ? plan.key ?? root : root, inst, o.want, o.barre ? (r, sfx) => barreShape(r, sfx, inst, o.barre!) : undefined)
    if (!chords) return null
    const meter = o.meter ?? 4
    const events = strumLine(chords.map(c => ({ ...c, beats: plan.beats ?? meter })), hits, o.span ?? meter)
    const title = plan.fixed ? name : `${name} (${keyLabel(root, !!plan.minor)})`
    return eventSong(events, { tuning: inst.midis, title, tempo: bpm, meter })
  }
}

/** Chords picked with one of the fingerpicking / bluegrass / reggae patterns (tabs/picking.ts). */
export function fromPicking(name: string, plan: ChordPlan, patternId: string, o: { meter?: number } = {}): Make {
  return ({ root, inst, bpm }) => {
    const chords = planChords({ ...plan, times: 1 }, root, inst)
    if (!chords) return null
    const s = pickingSong(chords.map(c => ({ name: c.name, root: c.root, voicing: c.v, beats: plan.beats ?? 4 })), patternId, inst.midis,
      { title: `${name} (${keyLabel(root, !!plan.minor)})`, bpm, times: plan.times ?? 2, meter: o.meter })
    return s.tracks[0].bars.length ? s : null
  }
}

// ---------- generated lines

/** Every pitch with one of these pitch classes between lo and hi, low to high. */
export function tonesIn(pcs: number[], lo: number, hi: number) {
  const out: number[] = []
  for (let m = lo; m <= hi; m++) if (pcs.includes(r12(m))) out.push(m)
  return out
}
/** The range a melodic line can use on this instrument (low enough to stay out of the stratosphere). */
export function lineRange(tuning: number[]) {
  const lo = Math.min(...tuning), hi = Math.max(...tuning)
  return tuning.length >= 6 ? { lo: lo + 3, hi: hi + 10, center: lo + 19 } : { lo, hi: hi + 9, center: Math.round((lo + hi) / 2 + 3) }
}
/** Place pitches on the neck (hand moving as little as possible); null if any can't be played. */
export function placeLine(tuning: number[], pitches: number[], durs: number[] | number, near = 5, chords?: (string | undefined)[], tech?: (string | undefined)[]): ChordEvent[] | null {
  const placed = placePitches(tuning, pitches, near)
  if (placed.length !== pitches.length) return null
  return placed.map((p, i) => ({ dur: typeof durs === 'number' ? durs : durs[i], notes: [nt(p.string, p.fret, tech?.[i])], ...(chords?.[i] ? { chord: chords[i] } : {}) }))
}

export const scalePcs = (root: string, scale: string) => Scale.get(`${SHARPS[pc(root)]} ${scale}`).notes.map(n => pc(n))
export const chordPcs = (root: string, suffix: string) => (SUFFIX_IV[suffix] ?? [0, 4, 7]).map(i => r12(pc(root) + i))

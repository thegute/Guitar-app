// Making licks from the library: place a lick in any key (capo or shift, see styles.ts), or build a longer phrase
// from several licks of one style: a motif, its answer and an ending that lands home, chained so each lick starts
// near where the last one stopped and the hand stays in one area of the neck.
import { FLATS, SHARPS, keyPrefersFlats, pc } from '../theory/notes'
import type { Song } from '../tabs/model'
import { LICKS, type LickDef, type LickKind } from './library'
import { lickStyle, type LickStyleId } from './styles'
import { fretSpan, lickSong, parseLick, type LickEvent } from './notation'

const STANDARD = [40, 45, 50, 55, 59, 64]
export const isStandard = (tuning: number[]) => tuning.length === 6 && tuning.every((m, i) => m === STANDARD[i])

export interface Placement { capo: number; shift: number }

/** Where a lick goes for a key, or null when it can't go there comfortably. `from` is the note that should land on
 *  `root` (the lick's key, or the root of the chord it sits over). */
export function placeFor(l: LickDef, root: string, from = l.ref): Placement | null {
  const st = lickStyle(l.style)
  const d = ((pc(root) - pc(from)) % 12 + 12) % 12
  const ev = parseLick(l.tab).events
  const span = fretSpan(ev)
  if (st.move === 'capo') return d <= 7 ? { capo: d, shift: 0 } : null
  const mid = (st.zone[0] + st.zone[1]) / 2
  const opts = [d, d - 12, d + 12].filter(s => {
    if (span.open && s < 0) return false
    if (span.hi + s > 21) return false
    if (!span.open && span.lo + s < 1 && span.hi > 0) return false
    return true
  })
  if (!opts.length) return null
  const cost = (s: number) => Math.abs((span.lo + span.hi) / 2 + s - mid) + Math.abs(s) * 0.15 + (span.hi + s > st.zone[1] + 5 ? 6 : 0)
  return { capo: 0, shift: opts.sort((a, b) => cost(a) - cost(b))[0] }
}

/** Events of a lick moved to a key (frets shifted; with a capo the frets stay). */
export function placedEvents(l: LickDef, p: Placement): LickEvent[] {
  return parseLick(l.tab).events.map(e => ({ dur: e.dur, notes: e.notes.map(n => (n.tech === 'x' ? n : { ...n, fret: n.fret + p.shift })) }))
}

/** For a tuning that isn't standard guitar (drop D, ukulele …): keep the pitches, find them on this instrument
 *  near the same part of the neck. */
function retune(events: LickEvent[], capo: number, tuning: number[]): LickEvent[] {
  const lo = Math.min(...tuning), hi = Math.max(...tuning) + 15
  let prev: number | null = null
  return events.map(e => ({
    dur: e.dur,
    notes: e.notes.flatMap(n => {
      let midi = STANDARD[n.string] + capo + n.fret
      while (midi < lo + capo) midi += 12
      while (midi > hi + capo) midi -= 12
      const opts = tuning.map((open, s) => ({ string: s, fret: midi - capo - open })).filter(o => o.fret >= 0 && o.fret <= 17)
      if (!opts.length) return []
      const near = prev ?? n.fret
      const best = opts.sort((a, b) => Math.abs(a.fret - near) - Math.abs(b.fret - near))[0]
      prev = best.fret
      return [{ string: best.string, fret: best.fret, ...(n.tech ? { tech: n.tech } : {}) }]
    }),
  }))
}

export const keyLabel = (root: string, minor: boolean) => (keyPrefersFlats(root, minor) ? FLATS : SHARPS)[pc(root)] + (minor ? 'm' : '')
const chordIn = (chord: string | undefined, from: string, to: string) => {
  if (!chord) return undefined
  const d = ((pc(to) - pc(from)) % 12 + 12) % 12
  const flats = keyPrefersFlats(to, false)
  return chord.replace(/\b([A-G])([#b]?)/g, (_, a: string, acc: string) => (flats ? FLATS : SHARPS)[(pc(a + acc) + d) % 12])
}

/** One lick from the library as a song in any key. */
export function lickInKey(l: LickDef, root: string, tuning: number[], tempo?: number, from = l.ref): { song: Song; capo: number; chord?: string } | null {
  const p = placeFor(l, root, from)
  if (!p) return null
  const st = lickStyle(l.style)
  const minor = l.minor ?? st.minor
  let events = placedEvents(l, p)
  if (!isStandard(tuning)) events = retune(events, p.capo, tuning)
  const keyRoot = FLATS[(pc(l.ref) + pc(root) - pc(from) + 12) % 12]
  const song = lickSong(events, { tuning, capo: isStandard(tuning) ? p.capo : 0, title: `${l.name} (${keyLabel(keyRoot, minor)})`, tempo: tempo ?? l.bpm ?? st.bpm, program: st.program, meter: l.meter })
  return { song, capo: isStandard(tuning) ? p.capo : 0, chord: chordIn(l.chord, from, root) }
}

function rng(seed: number) {
  let a = seed >>> 0 || 1
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

export type LickFilter = 'any' | 'licks' | 'arpeggios' | 'runs'
const KINDS: Record<LickFilter, LickKind[] | null> = {
  any: null, licks: ['lick', 'double-stop', 'riff'], arpeggios: ['arpeggio'], runs: ['run', 'riff'],
}
export interface MakeOptions { style: LickStyleId; root: string; bars: 1 | 2 | 4; level: 1 | 2 | 3; seed: number; kind?: LickFilter }
export interface MadeLick { song: Song; parts: LickDef[]; capo: number; key: string }

const barsOf = (l: LickDef) => Math.round(parseLick(l.tab).bars.length)
const firstMidi = (ev: LickEvent[]) => { const n = ev.find(e => e.notes.length)?.notes[0]; return n ? STANDARD[n.string] + n.fret : null }
const lastMidi = (ev: LickEvent[]) => { const n = [...ev].reverse().find(e => e.notes.length)?.notes[0]; return n ? STANDARD[n.string] + n.fret : null }
const center = (ev: LickEvent[]) => { const s = fretSpan(ev); return (s.lo + s.hi) / 2 }

/** A new phrase in a style and key. */
export function makePhrase(o: MakeOptions, tuning: number[]): MadeLick {
  const st = lickStyle(o.style)
  const r = rng(o.seed)
  const kinds = KINDS[o.kind ?? 'any']
  // licks over the key's home chord (not the ones written over IV or V), in 4/4
  const homeChord = (l: LickDef) => { const m = /^([A-G][#b]?)/.exec(l.chord ?? ''); return !m || pc(m[1]) === pc(l.ref) }
  const inStyle = LICKS.filter(l => l.style === o.style && (l.meter ?? 4) === 4 && homeChord(l))
  const fits = (l: LickDef) => l.level <= o.level && (!kinds || kinds.includes(l.kind) || (l.kind === 'ending' && !kinds.includes('arpeggio')))
  let pool = inStyle.filter(fits)
  if (!pool.length) pool = inStyle.filter(l => l.level <= o.level)
  if (!pool.length) pool = inStyle
  // capo styles: one reference key (one capo) for the whole phrase, the lowest capo available
  const placed = pool.map(l => ({ l, p: placeFor(l, o.root) })).filter((x): x is { l: LickDef; p: Placement } => !!x.p)
  let usable = placed
  if (st.move === 'capo' && placed.length) {
    const capos = [...new Set(placed.map(x => x.p.capo))].sort((a, b) => a - b)
    const choose = capos.find(c => placed.filter(x => x.p.capo === c).length >= 3) ?? capos[0]
    usable = placed.filter(x => x.p.capo === choose)
  }
  if (!usable.length) usable = placed
  const pick = (cands: typeof usable, prevEnd: number | null, prevCenter: number | null, prefer: (l: LickDef) => number) => {
    const scored = cands.map(x => {
      const ev = placedEvents(x.l, x.p)
      const f = firstMidi(ev)
      const step = prevEnd !== null && f !== null ? Math.abs(f - prevEnd) : 0
      const move = prevCenter !== null ? Math.abs(center(ev) - prevCenter) : 0
      return { x, ev, score: Math.min(step, 7) * 0.6 + Math.max(0, move - 3) * 2.2 + prefer(x.l) + r() * 2.5 }
    }).sort((a, b) => a.score - b.score)
    return scored[0]
  }
  const hardness = (l: LickDef) => (o.level - l.level) * 0.8
  const endings = usable.filter(x => x.l.kind === 'ending' || x.l.kind === 'turnaround')
  const bodies = usable.filter(x => x.l.kind !== 'ending' && x.l.kind !== 'turnaround')
  const parts: { l: LickDef; ev: LickEvent[] }[] = []
  let total = 0
  let prevEnd: number | null = null, prevCenter: number | null = null
  const used = new Set<string>()
  // the body: licks until there's room left for an ending (or the length is filled)
  while (total < o.bars) {
    const left = o.bars - total
    const twoBarEnd = endings.some(x => barsOf(x.l) === 2 && !used.has(x.l.id))
    const wantEnd = left <= 1 || (left === 2 && twoBarEnd && r() < 0.6)
    const fit = (list: typeof usable, fresh: boolean) => list.filter(x => barsOf(x.l) <= left && (!fresh || !used.has(x.l.id)))
    // an ending only at the end; otherwise new licks first, then a repeat of one already played (a motif coming back)
    const order = wantEnd ? [fit(endings, true), fit(endings, false), fit(bodies, true), fit(bodies, false)]
      : [fit(bodies, true), fit(bodies, false), fit(endings, true), fit(usable, false)]
    const cands = order.find(c => c.length) ?? []
    if (!cands.length) break
    const got = pick(cands, prevEnd, prevCenter, hardness)
    parts.push({ l: got.x.l, ev: got.ev })
    used.add(got.x.l.id)
    total += barsOf(got.x.l)
    prevEnd = lastMidi(got.ev)
    prevCenter = center(got.ev)
  }
  const capo = usable[0]?.p.capo ?? 0
  let events = parts.flatMap(p => p.ev)
  if (!isStandard(tuning)) events = retune(events, capo, tuning)
  const minor = parts[0] ? (parts[0].l.minor ?? st.minor) : st.minor
  const key = keyLabel(o.root, minor)
  const tempo = Math.round(st.bpm * (o.level === 1 ? 0.8 : o.level === 3 ? 1.1 : 1))
  const title = `${st.label.replace(/ \(.*\)$/, '')} lick in ${key}`
  const song = lickSong(events, { tuning, capo: isStandard(tuning) ? capo : 0, title, tempo, program: st.program })
  return { song, parts: parts.map(p => p.l), capo: isStandard(tuning) ? capo : 0, key }
}

/** Licks that fit a chord (by its quality), from every style, placed so the chord they were written over lands on
 *  this chord's root. */
export function licksForChord(root: string, suffix: string): { l: LickDef; from: string; chord: string }[] {
  const want = COMPAT[qualityOf(suffix)] ?? ['major']
  const out: { l: LickDef; from: string; chord: string }[] = []
  for (const l of LICKS) {
    const c = (l.chord ?? '').split(/[\s|]+/)[0]
    const m = /^([A-G][#b]?)(.*)$/.exec(c)
    if (!m || (l.meter ?? 4) !== 4) continue
    if (!want.includes(qualityOf(m[2]))) continue
    if (!placeFor(l, root, m[1])) continue
    out.push({ l, from: m[1], chord: chordIn(c, m[1], root) ?? root })
  }
  return out
}
/** which lick chords sound right over a chord of each quality */
const COMPAT: Record<string, string[]> = {
  major: ['major', 'maj7'], minor: ['minor', 'm7', 'power'], dom: ['dom', 'major', 'power'], maj7: ['maj7', 'major'],
  m7: ['m7', 'minor'], power: ['power', 'minor'], dim: ['dim'],
}
/** major, minor, dominant, maj7, m7, power, dim … from a chord suffix ("7", "m7", "maj7", "5" …) */
export function qualityOf(suffix: string): string {
  const s = suffix.replace(/\(.*\)/, '').trim()
  if (s === '5') return 'power'
  if (/^(dim|°|m7b5|ø)/.test(s)) return 'dim'
  if (/^(maj|Δ|M7)/.test(s) && s !== 'major') return 'maj7'
  if (/^(m|min|minor)(?!aj)/.test(s)) return /7|9|11/.test(s) ? 'm7' : 'minor'
  if (/^(7|9|11|13|alt)/.test(s)) return 'dom'
  return 'major'
}

// Writing the line: licks, solos and melodies the way players build them.
//  • a short idea (a motif: a rhythm and a shape) is stated, then repeated over the next chord, moved to fit it
//  • the third bar develops it (busier, higher, a fragment or a run), the last bar answers and lands home
//  • chord notes (and the style's favourite colour notes) fall on the strong beats, scale notes and chromatic
//    approach notes in between; leaps turn back; each phrase rises to one high point and comes down
//  • space is part of it: some styles leave half a bar empty after a phrase (call and response)
//  • every style ends its own way (a bend to the root, the G run, the Hawaiian vamp, harmonics, a cadence …)
// Many versions are written and the most musical one is kept (scoreLine).
import type { StyleDef } from './styles'
import { chordAt, mod, notesIn, pool, type CChord, type KeyInfo } from './harmony'

export interface LNote {
  at: number
  dur: number
  midi: number
  /** a second note played with it (double stop: a 3rd, 6th, 4th or octave below) */
  under?: number
  /** a technique the line asks for: harmonic, tap, muted (ghost) note, palm mute, bend target */
  want?: 'harm' | 'tap' | 'x' | 'pm' | 'bend' | 'curl' | 'vib'
  strong: boolean
  /** notes with the same group are played on one string (tapping figures) */
  group?: number
  /** chord: a chord tone on a strong beat; col: a colour note; sc: scale note; ap: chromatic approach */
  role: 'chord' | 'col' | 'sc' | 'ap'
}
export type Rng = () => number
export function rng(seed: number): Rng {
  let a = seed >>> 0 || 1
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const pick = <T,>(r: Rng, a: T[]): T => a[Math.floor(r() * a.length)]
function weighted<T>(r: Rng, items: T[], w: number[]): T {
  const sum = w.reduce((a, b) => a + Math.max(0, b), 0)
  if (sum <= 0) return items[0]
  let x = r() * sum
  for (let i = 0; i < items.length; i++) { x -= Math.max(0, w[i]); if (x <= 0) return items[i] }
  return items[items.length - 1]
}

type Cell = [number, number][]
type Section = 'A' | 'A2' | 'B' | 'C' | 'end'
/** The shape of the whole thing, bar by bar: a statement, its repeat, a development, a climax, an ending. */
export function formFor(bars: number): Section[] {
  if (bars <= 1) return ['end']
  if (bars === 2) return ['A', 'end']
  if (bars === 3) return ['A', 'A2', 'end']
  const out: Section[] = []
  for (let b = 0; b < bars; b++) {
    const last = b === bars - 1
    const inBlock = b % 4
    out.push(last ? 'end' : inBlock === 0 ? 'A' : inBlock === 1 ? 'A2' : inBlock === 2 ? 'B' : b + 1 >= bars - 1 ? 'end' : 'C')
  }
  return out
}

export interface LineOptions {
  st: StyleDef
  key: KeyInfo
  tl: CChord[]
  bars: number
  level: 1 | 2 | 3
  meter: number
  /** lowest and highest notes the instrument can play in the style's area of the neck */
  lo: number
  hi: number
  /** where melodies sit (MIDI), and the singable mode for chord melodies (narrower, more stepwise, longer notes) */
  center: number
  singable?: boolean
}

interface Slot { at: number; dur: number; strong: boolean }

function cellSlots(cell: Cell, bar0: number, meter: number): Slot[] {
  return cell.filter(([a]) => a < meter - 1e-6).map(([a, d]) => ({ at: bar0 + a, dur: Math.min(d, meter - a), strong: Math.abs(a - Math.round(a)) < 1e-6 && (Math.round(a) % 2 === 0 || d >= 1) }))
}

/** Pitch candidates for one slot, weighted by how well they fit and how they move from the last note. */
function choose(r: Rng, o: LineOptions, s: Slot, prev: number, lastMove: number, goal: number, next: Slot | null): { midi: number; role: LNote['role'] } {
  const c = chordAt(o.tl, s.at)
  const pl = pool(o.st, c, o.key)
  const lo = Math.max(o.lo, o.center - (o.singable ? 9 : 14)), hi = Math.min(o.hi, o.center + (o.singable ? 9 : 14))
  // a chromatic approach into the next strong chord note
  if (!s.strong && next?.strong && s.dur <= .5 && r() < o.st.chromatic) {
    const nc = chordAt(o.tl, next.at)
    const targets = notesIn(pool(o.st, nc, o.key).chord, lo, hi).filter(m => Math.abs(m - prev) <= 5)
    if (targets.length) { const t = pick(r, targets); return { midi: t + (r() < .6 ? -1 : 1), role: 'ap' } }
  }
  const chordNotes = notesIn(pl.chord, lo, hi)
  const colorNotes = notesIn(pl.color, lo, hi)
  const scaleNotes = notesIn(pl.scale, lo, hi)
  const cands: { midi: number; role: LNote['role']; w: number }[] = []
  const arp = o.st.arpeggio * (o.singable ? .4 : 1)
  if (s.strong) {
    for (const m of chordNotes) cands.push({ midi: m, role: 'chord', w: 1 })
    for (const m of colorNotes) cands.push({ midi: m, role: 'col', w: .55 })
  } else {
    for (const m of scaleNotes) {
      const isChord = pl.chord.includes(mod(m))
      cands.push({ midi: m, role: isChord ? 'chord' : pl.color.includes(mod(m)) ? 'col' : 'sc', w: isChord ? 1 + arp : 1 - arp * .5 })
    }
  }
  if (!cands.length) for (const m of scaleNotes.length ? scaleNotes : chordNotes) cands.push({ midi: m, role: 'sc', w: 1 })
  if (!cands.length) return { midi: prev, role: 'sc' }
  const stepScale = o.singable ? 1.7 : 2.2 + arp * 3
  const w = cands.map(cd => {
    const step = Math.abs(cd.midi - prev)
    let x = cd.w * Math.exp(-step / stepScale)
    if (step === 0) x *= o.st.id === 'funk' || o.st.id === 'reggaerock' ? .7 : .25
    if (step > (o.singable ? 7 : 9 + arp * 5)) x *= .05
    if (Math.abs(lastMove) > 4 && Math.sign(cd.midi - prev) === Math.sign(lastMove)) x *= .25 // after a leap, turn back
    x *= Math.exp(-Math.abs(cd.midi - goal) / (o.singable ? 5 : 7))
    return x
  })
  const got = weighted(r, cands, w)
  return { midi: got.midi, role: got.role }
}

/** A run: a scale sequence (groups of 3 or 4 stepping along) or an arpeggio sweep over the chord, filling slots. */
function figure(r: Rng, o: LineOptions, slots: Slot[], prev: number, up: boolean): number[] | null {
  if (slots.length < 4) return null
  const c = chordAt(o.tl, slots[0].at)
  const pl = pool(o.st, c, o.key)
  const lo = Math.max(o.lo, o.center - 14), hi = Math.min(o.hi, o.center + 16)
  const useArp = r() < o.st.arpeggio / (o.st.arpeggio + o.st.sequence + 1e-6)
  const set = useArp ? notesIn([...pl.chord, ...pl.color.slice(0, 1)], lo, hi) : notesIn(pl.scale, lo, hi)
  if (set.length < 5) return null
  let i = set.reduce((bi, m, k) => (Math.abs(m - prev) < Math.abs(set[bi] - prev) ? k : bi), 0)
  const out: number[] = []
  if (useArp) {
    // sweep up then turn round (or down then up)
    let dir = up ? 1 : -1
    for (let k = 0; k < slots.length; k++) {
      out.push(set[i])
      if (i + dir < 0 || i + dir >= set.length) dir = -dir
      i += dir
    }
  } else {
    const g = r() < .5 ? 4 : 3
    const dir = up ? 1 : -1
    let start = i
    for (let k = 0; k < slots.length; k++) {
      const inG = k % g
      if (k && inG === 0) start += dir
      const j = start + inG * dir
      if (j < 0 || j >= set.length) return out.length >= 4 ? [...out, ...Array(slots.length - out.length).fill(out[out.length - 1])] : null
      out.push(set[j])
    }
  }
  return out
}

/** A tapping figure on one string: tap a high chord note, pull off to a lower one, pull off (or hammer) to the
 *  lowest, round and round (Plini, Polyphia, Van Halen): [tap, p, p] or [low, h, tap]. */
function tapFigure(r: Rng, o: LineOptions, slots: Slot[], prev: number): { midi: number; want?: 'tap' }[] | null {
  const c = chordAt(o.tl, slots[0].at)
  const pl = pool(o.st, c, o.key)
  const ch = notesIn([...pl.chord, ...pl.color.slice(0, 1)], Math.max(o.lo + 5, prev - 7), Math.min(o.hi, prev + 9))
  if (ch.length < 3) return null
  const low = ch[Math.floor(r() * Math.max(1, ch.length - 2))]
  const mid = notesIn([...pl.chord, ...pl.color], low + 3, low + 5)[0] ?? low + 4
  const high = notesIn(pl.chord, low + 9, low + 12)[0] ?? low + 12
  const down = r() < .6
  const fig = down ? [{ midi: high, want: 'tap' as const }, { midi: mid }, { midi: low }] : [{ midi: low }, { midi: mid }, { midi: high, want: 'tap' as const }]
  return slots.map((_, i) => fig[i % 3])
}

interface Motif { slots: Slot[]; steps: number[]; firstDeg: number }
/** The motif as steps along the scale (so it can be moved to fit another chord). */
function motifOf(notes: LNote[], bar0: number, o: LineOptions): Motif | null {
  if (notes.length < 2) return null
  const c = chordAt(o.tl, notes[0].at)
  const sc = notesIn(pool(o.st, c, o.key).scale, o.lo - 12, o.hi + 12)
  const deg = (m: number) => { let k = sc.findIndex(x => x >= m); if (k < 0) k = sc.length - 1; return k }
  const ds = notes.map(n => deg(n.midi))
  return { slots: notes.map(n => ({ at: n.at - bar0, dur: n.dur, strong: n.strong })), steps: ds.slice(1).map((d, i) => d - ds[i]), firstDeg: ds[0] }
}

/** The motif again over this bar's chord: same rhythm and shape, starting on the nearest chord note. */
function replay(r: Rng, m: Motif, bar0: number, o: LineOptions, prev: number, exact: boolean, varyEnd: boolean): LNote[] {
  const c = chordAt(o.tl, bar0)
  const pl = pool(o.st, c, o.key)
  const sc = notesIn(pl.scale, o.lo - 12, o.hi + 12)
  const chordNotes = notesIn(pl.chord, o.lo, o.hi)
  if (!sc.length || !chordNotes.length) return []
  const start = exact ? sc[Math.min(sc.length - 1, m.firstDeg)] : chordNotes.reduce((b, x) => (Math.abs(x - prev) < Math.abs(b - prev) ? x : b), chordNotes[0])
  let k = sc.findIndex(x => x >= start)
  if (k < 0) k = 0
  const out: LNote[] = []
  m.slots.forEach((s, i) => {
    if (i > 0) k += m.steps[i - 1]
    k = Math.max(0, Math.min(sc.length - 1, k))
    let midi = sc[k]
    const at = bar0 + s.at
    const here = pool(o.st, chordAt(o.tl, at), o.key)
    // strong beats must still be chord (or colour) notes over the new chord: nudge to the nearest one
    if (s.strong && !here.chord.includes(mod(midi)) && !here.color.includes(mod(midi))) {
      const near = notesIn([...here.chord, ...here.color], midi - 3, midi + 3)
      if (near.length) midi = near.reduce((b, x) => (Math.abs(x - midi) < Math.abs(b - midi) ? x : b), near[0])
    }
    out.push({ at, dur: s.dur, midi, strong: s.strong, role: here.chord.includes(mod(midi)) ? 'chord' : 'sc' })
  })
  if (varyEnd && out.length >= 3) {
    // change the last note or two: the answer to the statement
    const last = out[out.length - 1]
    const here = pool(o.st, chordAt(o.tl, last.at), o.key)
    const alts = notesIn(here.chord, last.midi - 7, last.midi + 7).filter(x => x !== last.midi)
    if (alts.length) last.midi = pick(r, alts)
  }
  return out.filter(n => n.midi >= o.lo && n.midi <= o.hi)
}

/** The style's ending, in the last bar's last beats. Returns the notes and where the ending starts. */
function ending(r: Rng, o: LineOptions, bar0: number, prev: number): { notes: LNote[]; from: number } {
  const meter = o.meter
  const c = chordAt(o.tl, bar0 + meter - .01)
  const home = c.root
  const pl = pool(o.st, c, o.key)
  const lo = Math.max(o.lo, o.center - 12), hi = Math.min(o.hi, o.center + 12)
  const near = (pcs: number[], target: number, a = lo, b = hi) => { const ns = notesIn(pcs, a, b); return ns.length ? ns.reduce((x, y) => (Math.abs(y - target) < Math.abs(x - target) ? y : x), ns[0]) : target }
  const n = (at: number, dur: number, midi: number, extra: Partial<LNote> = {}): LNote => ({ at: bar0 + at, dur, midi, strong: Math.abs(at % 1) < 1e-6, role: 'chord', ...extra })
  const m3 = meter - 1 // last beat
  switch (o.st.ending) {
    case 'grun': {
      // the G run: root, 2, b3-3 (hammer), 5, 6, root (an octave up), in eighths, from beat 1
      const r0 = near([home], prev - 7, lo - 5, hi)
      const iv = [0, 2, 3, 4, 7, 9, 12]
      const notes = iv.map((x, i) => n(i * .5, i === iv.length - 1 ? meter - 3 : .5, r0 + x))
      return { notes, from: 0 }
    }
    case 'chicken': {
      // 6, 5, 3, (b3-) 2, 1 with a muted snap before: the country ending
      const r0 = near([home], prev)
      const pts = [[0, .5, 9], [.5, .5, 7], [1, .5, 4], [1.5, .25, 3], [1.75, .25, 2], [2, meter - 2, 0]] as const
      return { notes: [n(0, .25, r0 + 9, { want: 'x' }), ...pts.map(([a, d, x], i) => n(a + (i === 0 ? .25 : 0), i === 0 ? .25 : d, r0 + x))], from: 0 }
    }
    case 'vamp': {
      // the Hawaiian vamp feel: sweet 6ths stepping down to the home chord, last one with a harmonic-like ring
      const top = near(pl.chord, prev + 2)
      const sc = notesIn(pl.scale, top - 7, top)
      const a = sc.length >= 3 ? sc.slice(-3).reverse() : [top]
      const notes = a.map((m, i) => n(i * .5 + (meter - 2.5), .5, m, { under: m - 9 >= o.lo ? m - (pl.scale.includes(mod(m - 9)) ? 9 : 8) : undefined }))
      notes.push(n(meter - 1, 1, near([home, mod(home + 4), mod(home + 7)], a[a.length - 1] - 2), { want: 'vib' }))
      return { notes, from: meter - 2.5 }
    }
    case 'harmonics': {
      // chime: chord notes as natural harmonics (the fret placer finds them on the 12th or 7th fret)
      const ch = notesIn(pl.chord, o.center - 2, o.hi)
      const pickN = ch.slice(0, 3)
      return { notes: pickN.map((m, i) => n(meter - 2 + i * .5, i === pickN.length - 1 ? 1 : .5, m, { want: 'harm' })), from: meter - 2 }
    }
    case 'octave': {
      const r0 = near([home], prev)
      return { notes: [n(m3 - 1, .5, r0 - 2 >= lo ? r0 - 2 : r0 + 10, { under: undefined }), n(m3 - .5, .5, r0), n(m3, 1, r0, { under: r0 - 12 >= o.lo ? r0 - 12 : undefined, want: 'vib' })], from: m3 - 1 }
    }
    case 'legato': {
      // a quick legato climb into a long colour or root note
      const top = near([home, ...pl.color.slice(0, 1)], prev + 7, lo, Math.min(o.hi, hi + 5))
      const sc = notesIn(pl.scale, top - 9, top - 1).slice(-5)
      const run = sc.map((m, i) => n(meter - 2 + i * (1 / sc.length), 1 / sc.length, m))
      return { notes: [...run, n(meter - 1, 1, top, { want: 'vib' })], from: meter - 2 }
    }
    case 'pedal': {
      // pedal point to the low root, palm muted, then the root rings
      const low = near([home], o.lo + 5, o.lo, o.lo + 14)
      const sc = notesIn(pl.scale, low + 1, low + 8).slice(0, 3)
      const notes: LNote[] = []
      let t = meter - 2
      for (const m of sc) { notes.push(n(t, .25, low, { want: 'pm' })); notes.push(n(t + .25, .25, m)); t += .5 }
      notes.push(n(t, meter - t, low, { want: 'vib' }))
      return { notes: notes.filter(x => x.at < bar0 + meter), from: meter - 2 }
    }
    case 'enclosure': {
      // circle the target from above and below, then land (jazz, neo-soul)
      const target = near(o.st.id === 'neosoul' && pl.color.length ? [pl.color[0]] : [home], prev)
      const sc = notesIn(pl.scale, target + 1, target + 3)
      const above = sc[0] ?? target + 2
      return { notes: [n(m3 - 1, .5, above), n(m3 - .5, .5, target - 1), n(m3, 1, target)], from: m3 - 1 }
    }
    case 'cadence': {
      // step down to the home note (or up from the leading note): 3-2-1 or 7-1
      const target = near([home], prev)
      const sc = notesIn(pl.scale.concat(o.key.scale), target - 2, target + 4).filter(m => m !== target)
      const above = sc.filter(m => m > target).slice(0, 2).reverse()
      const notes = above.map((m, i) => n(m3 - 1 + i * .5, .5, m))
      notes.push(n(m3, 1, target, { want: 'vib' }))
      return { notes, from: m3 - 1 }
    }
    default: {
      // 'bend': bend up into the root (or the chord's 3rd/5th) and hold it with vibrato
      const target = near([home, ...pl.chord.slice(1, 3)], prev + 2, o.center - 5, Math.min(o.hi, o.center + 12))
      const from = meter - 2
      const sc = notesIn(pl.scale, target - 7, target - 3)
      const lead = sc.length ? sc[sc.length - 1] : target - 3
      return { notes: [n(from, .5, lead), n(from + .5, .5, lead + (pl.scale.includes(mod(lead + 2)) ? 2 : 1)), n(from + 1, meter - from - 1, target, { want: 'bend' })], from }
    }
  }
}

/** Write the line (one try). */
export function writeLine(r: Rng, o: LineOptions): LNote[] {
  const form = formFor(o.bars)
  const out: LNote[] = []
  let prev = o.center + Math.round((r() - .5) * 6)
  let lastMove = 0
  let motif: Motif | null = null
  const levelCells = (lv: number) => o.st.cells[Math.max(0, Math.min(2, lv - 1))]
  const peakBar = Math.max(0, Math.floor(o.bars * .6) - (o.bars > 2 ? 1 : 0))
  const exactRepeat = ['pop', 'reggaerock', 'funk', 'hawaiian'].includes(o.st.id)
  for (let b = 0; b < o.bars; b++) {
    const sec = form[b]
    const bar0 = b * o.meter
    // goal: rise to the peak bar, then come down; the climax bar goes highest
    const goal = o.center + (b < peakBar ? (b / Math.max(1, peakBar)) * 5 : b === peakBar || sec === 'C' ? 7 : 5 - (b - peakBar) * 2) + (sec === 'B' ? 2 : 0)
    let notes: LNote[] = []
    if ((sec === 'A2' || (sec === 'A' && b > 0)) && motif) {
      notes = replay(r, motif, bar0, o, prev, exactRepeat && r() < .6, sec === 'A2' && r() < .6)
    }
    if (!notes.length) {
      const busy = sec === 'B' || sec === 'C' ? Math.min(3, o.level + 1) : o.level
      const cell = pick(r, levelCells(o.singable ? Math.min(busy, 2) : busy))
      let slots = cellSlots(cell, bar0, o.meter)
      const endPart = sec === 'end' ? ending(r, o, bar0, prev) : null
      if (endPart) slots = slots.filter(s => s.at < bar0 + endPart.from - 1e-6)
      // call and response: leave the second half of a bar empty now and then
      if (sec !== 'end' && b % 2 === 1 && r() < o.st.space) slots = slots.filter(s => s.at < bar0 + 2 - 1e-6)
      // busy bars can be a run (sequence or arpeggio sweep)
      const fast = slots.filter(s => s.dur <= .34)
      let run: number[] | null = null
      let taps: { midi: number; want?: 'tap' }[] | null = null
      if (fast.length >= 6 && !o.singable && r() < (o.st.tech.tap ?? 0) * 1.5) taps = tapFigure(r, o, fast, prev)
      if (!taps && fast.length >= 6 && !o.singable && r() < o.st.sequence + o.st.arpeggio * .6) run = figure(r, o, fast, prev, goal >= prev)
      let ri = 0
      const group = b * 100 + 1
      slots.forEach((s, i) => {
        if (taps && s.dur <= .34 && ri < taps.length) {
          const t = taps[ri++]
          const here = pool(o.st, chordAt(o.tl, s.at), o.key)
          notes.push({ at: s.at, dur: s.dur, midi: t.midi, strong: s.strong, role: here.chord.includes(mod(t.midi)) ? 'chord' : 'col', group, ...(t.want ? { want: t.want } : {}) })
          lastMove = t.midi - prev; prev = t.midi
          return
        }
        if (run && s.dur <= .34 && ri < run.length) {
          const m = run[ri++]
          const here = pool(o.st, chordAt(o.tl, s.at), o.key)
          notes.push({ at: s.at, dur: s.dur, midi: m, strong: s.strong, role: here.chord.includes(mod(m)) ? 'chord' : 'sc' })
          lastMove = m - prev; prev = m
          return
        }
        const got = choose(r, o, s, prev, lastMove, goal, slots[i + 1] ?? null)
        notes.push({ at: s.at, dur: s.dur, midi: got.midi, strong: s.strong, role: got.role })
        lastMove = got.midi - prev; prev = got.midi
      })
      if (endPart) notes.push(...endPart.notes)
      if ((sec === 'A' || (b === 0 && sec !== 'end')) && !motif) motif = motifOf(notes, bar0, o)
    }
    if (notes.length) { const l = notes[notes.length - 1]; lastMove = l.midi - prev; prev = l.midi }
    out.push(...notes)
  }
  return decorate(r, o, out)
}

/** Double stops, ghost notes, harmonics and palm mutes, as the style uses them. */
function decorate(r: Rng, o: LineOptions, notes: LNote[]): LNote[] {
  const st = o.st
  const out: LNote[] = []
  for (let i = 0; i < notes.length; i++) {
    const n = { ...notes[i] }
    const pl = pool(st, chordAt(o.tl, n.at), o.key)
    if (n.under === undefined && !n.want && n.dur >= .5 && (n.role === 'chord' || n.role === 'col')) {
      const d = st.doubles
      const below = (steps: number) => { const sc = notesIn(pl.scale, n.midi - 13, n.midi - 1); return sc[sc.length - steps] }
      const roll = r()
      let acc = 0
      if (d.third && roll < (acc += d.third)) n.under = below(2)
      else if (d.sixth && roll < (acc += d.sixth)) n.under = below(5)
      else if (d.fourth && roll < (acc += d.fourth)) { if (pl.scale.includes(mod(n.midi - 5))) n.under = n.midi - 5 }
      else if (d.octave && roll < (acc += d.octave)) n.under = n.midi - 12
      if (n.under !== undefined && n.under < o.lo) n.under = undefined
    }
    // random harmonics only in the Polyphia style (elsewhere they're saved for the ending)
    if (!n.want && st.id === 'polyphia' && n.dur >= .5 && r() < (st.tech.harm ?? 0) * .5) n.want = 'harm'
    if (!n.want && st.tech.pm && n.midi < o.lo + 12 && n.dur <= .5 && r() < st.tech.pm) n.want = 'pm'
    if (!n.want && st.tech.vibrato && n.dur >= 1.5 && r() < st.tech.vibrato) n.want = 'vib'
    if (!n.want && st.tech.bend && n.strong && n.dur >= .75 && n.role === 'chord' && r() < st.tech.bend) n.want = (st.id === 'mayer' || st.id === 'blues' || st.id === 'country') && r() < .3 ? 'curl' : 'bend'
    if (!n.want && st.tech.tap && n.dur <= .34 && r() < st.tech.tap * .6) n.want = 'tap'
    // a ghost note (muted) on the 16th before a strong note
    const prevEnd = out.length ? out[out.length - 1].at + out[out.length - 1].dur : -1
    if (st.tech.mute && n.strong && n.at >= .25 && n.at - prevEnd >= .25 - 1e-6 && r() < st.tech.mute) out.push({ at: n.at - .25, dur: .25, midi: n.midi, want: 'x', strong: false, role: 'sc' })
    out.push(n)
  }
  return swingIt(o, out)
}

/** Shuffle and swing styles: straight eighth pairs become long-short (2/3 + 1/3 of the beat). */
function swingIt(o: LineOptions, notes: LNote[]): LNote[] {
  if (o.st.swing < .5) return notes
  const by = new Map<number, LNote[]>()
  for (const n of notes) { const b = Math.floor(n.at + 1e-6); (by.get(b) ?? by.set(b, []).get(b)!).push(n) }
  for (const [b, ns] of by) {
    if (ns.length !== 2) continue
    const [a, c] = ns.sort((x, y) => x.at - y.at)
    if (Math.abs(a.at - b) < 1e-6 && Math.abs(a.dur - .5) < 1e-6 && Math.abs(c.at - b - .5) < 1e-6 && Math.abs(c.dur - .5) < 1e-6) {
      a.dur = 2 / 3; c.at = b + 2 / 3; c.dur = 1 / 3
    }
  }
  return notes
}

/** How musical a line is (higher is better). */
export function scoreLine(notes: LNote[], o: LineOptions): number {
  const ms = notes.filter(n => n.want !== 'x').map(n => n.midi)
  if (ms.length < 3) return -99
  let steps = 0, leaps = 0, unresolved = 0, repeats = 0, strongOk = 0, strong = 0
  for (let i = 1; i < ms.length; i++) {
    const d = ms[i] - ms[i - 1]
    if (Math.abs(d) <= 2 && d !== 0) steps++
    if (Math.abs(d) > 7) { leaps++; if (i + 1 < ms.length && Math.sign(ms[i + 1] - ms[i]) === Math.sign(d) && Math.abs(ms[i + 1] - ms[i]) > 2) unresolved++ }
    if (d === 0 && i > 1 && ms[i - 2] === ms[i]) repeats++
  }
  for (const n of notes) if (n.strong && n.want !== 'x') { strong++; if (n.role === 'chord' || n.role === 'col') strongOk++ }
  const arp = o.st.arpeggio
  const stepRatio = steps / (ms.length - 1)
  const wantSteps = o.singable ? .7 : .55 - arp * .3
  const span = Math.max(...ms) - Math.min(...ms)
  const distinct = new Set(ms).size
  const last = notes[notes.length - 1]
  const lastChord = chordAt(o.tl, last.at)
  const endsHome = mod(last.midi) === lastChord.root ? 1.2 : lastChord.pcs.includes(mod(last.midi)) ? .5 : -1
  const allowRepeats = o.st.id === 'funk' || o.st.id === 'reggaerock' || o.st.id === 'metal' || o.st.id === 'progmetal'
  return -Math.abs(stepRatio - wantSteps) * 4 - leaps * (.3 - arp * .2) - unresolved * 1 - repeats * (allowRepeats ? .1 : .7)
    + (strong ? (strongOk / strong) * 3 : 0) + (span >= 5 && span <= (o.singable ? 14 : 22) ? 1 : -1) + Math.min(distinct, 8) * .2 + endsHome
}

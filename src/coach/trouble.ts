// The coach's first sense: what KGuitar itself measured in a pass (which notes were right, early, late or missed, and
// where the hand had to move), boiled down to the ONE bar that went worst and the reason it most likely did.
import { playable, type FlatStep } from '../tabs/model'
import { groupAt, type HandGroup } from '../play/handShape'
import { bendOf } from '../licks/notation'

/** one bar of a pass. Wait for me: right / missed (skipped or corrected) / wrong. In time: right / early / late / missed. */
export interface BarFacts { bar: number; notes: number; right: number; early: number; late: number; missed: number; wrong: number; /** mean timing error of the bar's played notes, ms (+ = late); null in Wait for me */ meanErr: number | null; pct: number }
export type TroubleKind = 'shift' | 'jump' | 'rush' | 'drag' | 'stretch' | 'legato' | 'bend' | 'chord' | 'notes'
/** one note on the neck: string 0 = lowest, finger 1 index … 4 pinky (0 = open / unknown) */
export interface Spot { flat: number; bar: number; string: number; fret: number; finger: number; midi: number; tech?: string }
export interface Trouble {
  bar: number
  /** how much of the bar came out right, 0–100 */
  pct: number
  kind: TroubleKind
  facts: BarFacts
  /** the note that went wrong (the first one in the bar that fits the reason) */
  spot: Spot
  /** the note played just before it */
  before?: Spot
  /** shift: where the index finger sat and where it has to get to */
  shift?: { from: number; to: number }
  /** what to loop: the bar, with the one before it when the trouble starts with getting there */
  loop: { from: number; to: number }
  /** a run of bars that came out clean (for the kind word first), if any */
  good?: { from: number; to: number }
  /** every bar's numbers, for the AI */
  bars: BarFacts[]
}

export interface PassData {
  /** per flat step: 0 not played, 1 right, 2 and 3 as PlayScreen keeps them (wait: 2 missed first time, 3 wrong; in time: 2 early/late, 3 missed) */
  states: ArrayLike<number>
  flat: FlatStep[]
  groups: HandGroup[]
  mode: 'wait' | 'time'
  /** In time: each played step's timing error in ms (flat index → ms, + = late) */
  errOf?: Map<number, number>
  /** only these bars (a loop) */
  range?: { from: number; to: number }
}

/** Each bar's numbers for a pass (bars with no notes played or due are left out). */
export function barFacts(p: PassData): BarFacts[] {
  const by = new Map<number, BarFacts & { errs: number[] }>()
  p.flat.forEach((f, i) => {
    if (p.range && (f.bar < p.range.from || f.bar > p.range.to)) return
    if (!playable(f.step).length) return
    const st = p.states[i] ?? 0
    if (!st) return
    const b = by.get(f.bar) ?? { bar: f.bar, notes: 0, right: 0, early: 0, late: 0, missed: 0, wrong: 0, meanErr: null, pct: 0, errs: [] }
    by.set(f.bar, b)
    b.notes++
    const e = p.errOf?.get(i)
    if (e !== undefined) b.errs.push(e)
    if (st === 1) b.right++
    else if (p.mode === 'time') { if (st === 3) b.missed++; else if ((e ?? 0) < 0) b.early++; else b.late++ }
    else if (st === 3) b.wrong++
    else b.missed++
  })
  return [...by.values()].sort((a, b) => a.bar - b.bar).map(({ errs, ...b }) => ({
    ...b,
    meanErr: errs.length ? Math.round(errs.reduce((x, y) => x + y, 0) / errs.length) : null,
    // early / late notes count half, like the run's score
    pct: Math.round(((b.right + 0.5 * (b.early + b.late)) / Math.max(1, b.notes)) * 100),
  }))
}

function spotOf(p: PassData, i: number): Spot | undefined {
  const f = p.flat[i]
  const ns = f ? playable(f.step) : []
  if (!ns.length) return undefined
  // a chord is named by its lowest note (the finger that has to land first)
  const n = ns.reduce((a, b) => (b.string < a.string ? b : a))
  const g = p.groups[groupAt(p.groups, i)]
  const finger = g?.notes.find(x => x.string === n.string && x.fret === n.fret)?.finger ?? 0
  return { flat: i, bar: f.bar, string: n.string, fret: n.fret, finger, midi: n.midi, tech: n.tech }
}

/** The bar that went worst in a pass (under `under` % right), and the most likely reason. Null when nothing did. */
export function findTrouble(p: PassData, under = 80): Trouble | null {
  const bars = barFacts(p)
  // at least two notes in the bar played or due: one stray note isn't a trouble bar
  const worst = bars.filter(b => b.notes >= 2 && b.pct < under).sort((a, b) => a.pct - b.pct || a.bar - b.bar)[0]
  if (!worst) return null
  return explain(p, worst, bars)
}

/** The reason a given bar went wrong (also used for "why is this bar hard?" on a bar you choose). */
export function explain(p: PassData, facts: BarFacts, bars = barFacts(p)): Trouble | null {
  const idx: number[] = []
  p.flat.forEach((f, i) => { if (f.bar === facts.bar && playable(f.step).length) idx.push(i) })
  if (!idx.length) return null
  const failed = idx.filter(i => { const s = p.states[i]; return s === 2 || s === 3 })
  const look = failed.length ? failed : idx
  const prevOf = (i: number) => { for (let k = i - 1; k >= 0; k--) if (playable(p.flat[k].step).length) return k; return -1 }
  const pick = (test: (i: number, prev: number) => boolean) => look.find(i => test(i, prevOf(i)))
  let kind: TroubleKind = 'notes'
  let at: number | undefined
  let shift: Trouble['shift']
  // 1. the hand had to move to a new position for this note
  at = pick((i, k) => k >= 0 && groupAt(p.groups, i) !== groupAt(p.groups, k) && !!p.groups[groupAt(p.groups, i)] && !!p.groups[groupAt(p.groups, k)])
  if (at !== undefined) {
    kind = 'shift'
    shift = { from: p.groups[groupAt(p.groups, prevOf(at))].base, to: p.groups[groupAt(p.groups, at)].base }
  }
  // 2. a jump over a string or more
  if (at === undefined) {
    at = pick((i, k) => { const a = spotOf(p, i), b = k >= 0 ? spotOf(p, k) : undefined; return !!a && !!b && Math.abs(a.string - b.string) >= 2 && playable(p.flat[i].step).length < 3 })
    if (at !== undefined) kind = 'jump'
  }
  // 3. timing: the notes were there, but early or late together
  if (at === undefined && p.mode === 'time' && facts.meanErr !== null && facts.early + facts.late >= Math.max(2, facts.missed) && Math.abs(facts.meanErr) >= 40) {
    kind = facts.meanErr < 0 ? 'rush' : 'drag'
    at = look[0]
  }
  // 4. a long reach, a hammer-on / pull-off, a bend, a chord
  if (at === undefined) {
    at = pick(i => { const s = spotOf(p, i), g = p.groups[groupAt(p.groups, i)]; return !!s && !!g && s.fret > 0 && s.fret - g.base >= 3 && s.finger === 4 })
    if (at !== undefined) kind = 'stretch'
  }
  if (at === undefined) {
    at = pick(i => playable(p.flat[i].step).some(n => !!n.tech && /[hp]/.test(n.tech.replace('harm', ''))))
    if (at !== undefined) kind = 'legato'
  }
  if (at === undefined) {
    at = pick(i => playable(p.flat[i].step).some(n => bendOf(n.tech) > 0))
    if (at !== undefined) kind = 'bend'
  }
  if (at === undefined) {
    at = pick(i => new Set(playable(p.flat[i].step).map(n => n.midi % 12)).size >= 3)
    if (at !== undefined) kind = 'chord'
  }
  if (at === undefined) at = look[0]
  const spot = spotOf(p, at)
  if (!spot) return null
  const k = prevOf(at)
  const before = k >= 0 ? spotOf(p, k) : undefined
  // getting there is the trouble: the loop takes in the bar before too
  const lead = (kind === 'shift' || kind === 'jump') && before && before.bar < facts.bar
  const loop = { from: lead ? before!.bar : facts.bar, to: facts.bar }
  // the longest run of clean bars (two or more), for the kind word
  let good: Trouble['good'], run: { from: number; to: number } | null = null
  for (const b of bars) {
    if (b.pct === 100 && b.notes >= 2 && run && b.bar === run.to + 1) run.to = b.bar
    else run = b.pct === 100 && b.notes >= 2 ? { from: b.bar, to: b.bar } : null
    if (run && (!good || run.to - run.from > good.to - good.from)) good = { ...run }
  }
  return { bar: facts.bar, pct: facts.pct, kind, facts, spot, before, shift, loop, good, bars }
}

/** Wait for me: the same bar going wrong again and again. Feed it every miss; it says when a bar has gone wrong `n`
 *  times in a row (other bars' misses start the count again, a clean pass through the bar clears it). */
export class MissStreak {
  private bar = -1
  private count = 0
  constructor(private n = 3) {}
  miss(bar: number): boolean {
    if (bar !== this.bar) { this.bar = bar; this.count = 0 }
    return ++this.count === this.n
  }
  /** the bar was passed (its last note hit) or the song changed */
  clear(bar?: number) { if (bar === undefined || bar === this.bar) { this.bar = -1; this.count = 0 } }
  get stuck() { return this.count >= this.n ? this.bar : -1 }
}

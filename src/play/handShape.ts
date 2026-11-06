// Where the fretting hand sits: the hand brain (hand/engine.ts) plans the whole tab, then it is split into stretches
// played without moving the hand. Each stretch says where the index finger goes, which finger plays every note, and
// why the hand moves where it does ("in the rest in bar 3", "on the open B", "slide with finger 3").
import type { FlatStep } from '../tabs/model'
import { planFingers, type HandPlan, type StepHand } from '../hand/engine'
import { handSize, scaleFor } from '../hand/neck'

export interface HandNote { string: number; fret: number; finger: number }
export interface HandGroup {
  /** flat step range [from, to) */
  from: number
  to: number
  /** fret under the index finger (1 in open / first position) */
  base: number
  open: boolean
  notes: HandNote[]
  /** how the hand gets here from the last position (empty for the first) */
  why?: string
  /** a finger laid across strings in this position */
  barre?: StepHand['barre']
}
export interface HandOptions {
  /** instrument id, for the scale length */
  inst?: string
  /** your own fingers: flat step → string → finger */
  fixed?: Map<number, Map<number, number>>
  stringNames?: string[]
}

const ORD = ['', '1st', '2nd', '3rd', '4th']

/** The engine's plan for a tab (frets kept as written). */
export function planFlat(flat: FlatStep[], o: HandOptions = {}): HandPlan {
  const nStr = Math.max(1, ...flat.flatMap(f => f.step.notes.map(n => n.string + 1)), 4)
  return planFingers(flat.map(f => ({ notes: f.step.notes, dur: f.step.dur })), { scale: scaleFor(nStr > 4 ? 6 : 4, o.inst), size: handSize(), fixed: o.fixed })
}

/** Split the tab into hand positions. */
export function handGroups(flat: FlatStep[], o: HandOptions = {}): HandGroup[] {
  const plan = planFlat(flat, o)
  return groupsFromPlan(flat, plan, o)
}

export function groupsFromPlan(flat: FlatStep[], plan: HandPlan, o: HandOptions = {}): HandGroup[] {
  const groups: HandGroup[] = []
  let cur: HandGroup | null = null
  flat.forEach((f, i) => {
    const h = plan.steps[i]
    if (!h) {
      if (cur) f.step.notes.forEach(n => { if (n.fret === 0 && !cur!.notes.some(x => x.string === n.string && x.fret === 0)) cur!.notes.push({ string: n.string, fret: 0, finger: 0 }) })
      return
    }
    if (!cur || cur.base !== h.anchor) {
      const g: HandGroup = { from: i, to: i + 1, base: h.anchor, open: false, notes: [] }
      if (cur) g.why = whyMove(flat, plan, cur, i, h, o)
      groups.push(g)
      cur = g
    }
    f.step.notes.forEach((n, k) => {
      const fin = h.fingers[k] ?? 0
      if (fin < 0) return
      if (!cur!.notes.some(x => x.string === n.string && x.fret === n.fret)) cur!.notes.push({ string: n.string, fret: n.fret, finger: fin })
    })
    if (h.barre && !cur.barre) cur.barre = h.barre
  })
  for (const g of groups) {
    const fr = g.notes.filter(n => n.fret > 0).map(n => n.fret)
    g.open = g.base <= 1 || (g.notes.some(n => n.fret === 0) && fr.every(f => f <= 4))
    if (g.open && fr.every(f => f <= 4)) g.base = 1
  }
  if (groups.length) groups[0].from = 0
  for (let k = 0; k + 1 < groups.length; k++) groups[k].to = groups[k + 1].from
  if (groups.length) groups[groups.length - 1].to = flat.length
  return groups
}

/** Why the hand moves into step i (the cue a teacher would give). */
function whyMove(flat: FlatStep[], plan: HandPlan, prev: HandGroup, i: number, h: StepHand, o: HandOptions): string {
  const to = h.anchor <= 1 ? 'first position' : `${ORD[1]} finger on fret ${h.anchor}`
  const bar = flat[i].bar + 1
  const step = flat[i].step
  const before = flat[i - 1]?.step
  const single = step.notes.length === 1 ? step.notes[0] : undefined
  const pSingle = before?.notes.length === 1 ? before.notes[0] : undefined
  if (single && pSingle && single.string === pSingle.string && (single.tech === '/' || single.tech === '\\')) {
    return `Slide up to ${to} with finger ${h.fingers[0]} (bar ${bar}).`
  }
  // a gap of rests or open strings before this step
  let j = i - 1, rested = false, openStr = -1
  while (j >= 0 && !plan.steps[j]) {
    const ns = flat[j].step.notes
    if (!ns.length) rested = true
    else { const op = ns.find(n => n.fret === 0); if (op) openStr = op.string }
    j--
  }
  const name = (s: number) => o.stringNames?.[s] ?? `string ${s + 1}`
  if (rested) return `Move to ${to} in the rest before bar ${bar}.`
  if (openStr >= 0) return `Move to ${to} while the open ${name(openStr)} rings (bar ${bar}).`
  if (before && before.dur >= 1) return `Move to ${to} during the long note before bar ${bar}.`
  void prev
  return `Quick shift to ${to} in bar ${bar}.`
}

export function groupAt(groups: HandGroup[], flatIdx: number) {
  if (flatIdx < 0) return groups.length ? 0 : -1
  for (let k = 0; k < groups.length; k++) if (flatIdx >= groups[k].from && flatIdx < groups[k].to) return k
  return groups.length - 1
}

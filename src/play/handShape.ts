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

export interface LiveHandNote extends HandNote {
  tech?: string
}

export interface LiveHandSnapshot {
  group: HandGroup
  nextGroup: HandGroup | null
  beatsToShift: number
  /** Notes sounding right now at `atIdx` with their planned 0-4 finger numbers */
  nowNotes: LiveHandNote[]
  /** Notes at the next playable step after `atIdx` */
  nextNotes: LiveHandNote[]
  /** Fingers that stay planted (anchor/hold) across now -> upcoming steps in this same hand box */
  holdNotes: LiveHandNote[]
  /** True when currently on open strings/rests before the first fretted note in this hand box */
  prePosition: boolean
  /** Crisp 1-line plain-English coaching cue */
  cue: string
}

const FING_SHORT = ['open', '1 (Index)', '2 (Middle)', '3 (Ring)', '4 (Pinky)']

function resolveStepFingers(step: FlatStep | undefined, group: HandGroup): LiveHandNote[] {
  if (!step) return []
  const out: LiveHandNote[] = []
  for (const n of step.step.notes) {
    if (n.tech === 'x') continue
    if (n.fret === 0) {
      out.push({ string: n.string, fret: 0, finger: 0, tech: n.tech })
      continue
    }
    const found = group.notes.find(g => g.string === n.string && g.fret === n.fret)
    const fallback = Math.max(1, Math.min(4, n.fret - group.base + 1))
    out.push({ string: n.string, fret: n.fret, finger: found?.finger || fallback, tech: n.tech })
  }
  return out
}

/**
 * Live left-hand snapshot for step `atIdx` (works in Hear it, In time, Wait for me, and ScanPlayer):
 * pre-positions your hand during open-string intros, identifies PRESS NOW vs HOLD (anchor) vs NEXT UP
 * fingers, and writes one streamlined plain-English cue.
 */
export function liveHandState(
  flat: FlatStep[],
  groups: HandGroup[],
  atIdx: number,
  stringNames: string[] = ['E', 'A', 'D', 'G', 'B', 'e'],
): LiveHandSnapshot | null {
  if (!groups.length) return null
  const idx = atIdx >= 0 && atIdx < flat.length ? atIdx : 0
  const hg = groupAt(groups, idx)
  const group = hg >= 0 ? groups[hg] : groups[0]
  if (!group) return null
  const nextGroup = hg >= 0 && hg + 1 < groups.length ? groups[hg + 1] : null
  const beatsToShift = nextGroup
    ? flat.slice(Math.max(0, idx), nextGroup.from).reduce((t, f) => t + f.step.dur, 0)
    : Infinity

  const nowNotes = resolveStepFingers(flat[idx], group)
  const hasFrettedNow = nowNotes.some(n => n.fret > 0)
  const prePosition = !hasFrettedNow && group.notes.some(n => n.fret > 0)

  // Find the very next playable step
  let nextIdx = -1
  for (let i = idx + 1; i < flat.length; i++) {
    if (flat[i].step.notes.some(n => n.tech !== 'x')) { nextIdx = i; break }
  }
  const nextGrp = nextIdx >= 0 ? (groups[groupAt(groups, nextIdx)] ?? group) : group
  const nextNotes = nextIdx >= 0 ? resolveStepFingers(flat[nextIdx], nextGrp) : []

  // Anchor / HOLD detection: any fretted finger in `nowNotes` (or the previous step inside this same box)
  // that is reused on the same string & fret within the next 3 playable steps of this same hand box.
  const lookAheadKeys = new Set<string>()
  let seen = 0
  for (let i = idx + 1; i < group.to && seen < 3; i++) {
    const ns = flat[i]?.step.notes.filter(n => n.tech !== 'x' && n.fret > 0) ?? []
    if (!ns.length) continue
    seen++
    for (const n of ns) lookAheadKeys.add(`${n.string}:${n.fret}`)
  }
  const holdNotes: LiveHandNote[] = []
  const holdSet = new Set<string>()
  const addHold = (n: LiveHandNote) => {
    if (n.fret <= 0) return
    const k = `${n.string}:${n.fret}`
    if (lookAheadKeys.has(k) && !holdSet.has(k)) {
      holdSet.add(k)
      holdNotes.push(n)
    }
  }
  nowNotes.forEach(addHold)
  // Also keep showing a finger planted from 1 step earlier if it's coming right back inside this same box (arpeggio anchor!)
  if (idx > group.from) {
    const prevNotes = resolveStepFingers(flat[idx - 1], group)
    prevNotes.forEach(p => {
      const sameStringNow = nowNotes.some(n => n.string === p.string && n.fret !== p.fret)
      if (!sameStringNow) addHold(p)
    })
  }

  const sName = (s: number) => stringNames[s] ?? `S${s + 1}`
  const frameText = group.open ? 'Frets 1–4' : `Frets ${group.base}–${group.base + 3}`
  const shiftSoon = !!nextGroup && beatsToShift <= 2 && (nextGroup.base !== group.base || nextGroup.open !== group.open)

  let cue = ''
  if (shiftSoon && nextGroup) {
    cue = nextGroup.why || `Shift → ${nextGroup.open ? 'Frets 1–4' : `Frets ${nextGroup.base}–${nextGroup.base + 3}`}`
  } else if (prePosition) {
    const firstNext = nextNotes.find(n => n.fret > 0)
    cue = firstNext
      ? `Open · Park hand on ${frameText} (ready for ${FING_SHORT[firstNext.finger]} on ${sName(firstNext.string)}-${firstNext.fret})`
      : `Open strings · Hover hand at ${frameText}`
  } else if (group.barre && nowNotes.filter(n => n.fret === group.barre!.fret).length >= 2) {
    cue = `Barre fret ${group.barre.fret} with ${FING_SHORT[group.barre.finger]} · ${frameText}`
  } else {
    const frettedNow = nowNotes.filter(n => n.fret > 0)
    if (frettedNow.length >= 2) {
      const fList = [...new Set(frettedNow.map(n => n.finger))].sort((a, b) => a - b).join('+')
      cue = `Press fingers ${fList} together · ${frameText}`
    } else if (frettedNow.length === 1) {
      const n = frettedNow[0]
      const nxt = nextNotes.find(x => x.fret > 0 && (x.string !== n.string || x.fret !== n.fret))
      const anchor = holdNotes.find(h => h.string !== n.string || h.fret !== n.fret)
      if (anchor) {
        cue = `Press ${FING_SHORT[n.finger]} on ${sName(n.string)}-${n.fret} · keep ${anchor.finger} planted`
      } else if (nxt) {
        cue = `Press ${FING_SHORT[n.finger]} on ${sName(n.string)}-${n.fret} → next ${nxt.finger} on ${sName(nxt.string)}-${nxt.fret}`
      } else {
        cue = `Press ${FING_SHORT[n.finger]} on ${sName(n.string)}-${n.fret} · ${frameText}`
      }
    } else {
      cue = `Hand ready on ${frameText}`
    }
  }

  return {
    group,
    nextGroup,
    beatsToShift,
    nowNotes,
    nextNotes,
    holdNotes,
    prePosition,
    cue,
  }
}

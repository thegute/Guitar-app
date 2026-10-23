// Where the fretting hand sits: the tab is split into stretches you can play without moving your hand
// (one finger per fret over four frets, or first position with open strings), and each note gets a finger.
import type { FlatStep } from '../tabs/model'

export interface HandNote { string: number; fret: number; finger: number }
export interface HandGroup {
  /** flat step range [from, to) */
  from: number
  to: number
  /** fret under the index finger (1 in open / first position) */
  base: number
  open: boolean
  notes: HandNote[]
}

function fingers(notes: { string: number; fret: number }[], base: number, open: boolean): HandNote[] {
  const uniq = new Map<string, { string: number; fret: number }>()
  for (const n of notes) uniq.set(`${n.string}-${n.fret}`, n)
  const list = [...uniq.values()].sort((a, b) => a.fret - b.fret || a.string - b.string)
  const out: HandNote[] = []
  // which finger holds each fret: first position = finger number equals fret number, otherwise one finger per fret
  const fretFinger = new Map<number, number>()
  for (const n of list) {
    if (n.fret === 0) { out.push({ ...n, finger: 0 }); continue }
    const f = Math.max(1, Math.min(4, open ? n.fret : n.fret - base + 1))
    const sameFret = list.filter(x => x.fret === n.fret && x.fret > 0)
    if (sameFret.length > 1 && f > 1 && sameFret[0] !== n) {
      // two notes at one fret on different strings: the next finger takes the higher string if it's free
      const taken = new Set([...fretFinger.values()])
      const spare = [f + 1, f + 2, f + 3].find(x => x <= 4 && !taken.has(x) && ![...list].some(y => y.fret > n.fret && (open ? y.fret : y.fret - base + 1) === x))
      if (spare) { out.push({ ...n, finger: spare }); continue }
    }
    fretFinger.set(n.fret, f)
    out.push({ ...n, finger: f })
  }
  return out
}

/** Split the tab into hand positions. */
export function handGroups(flat: FlatStep[]): HandGroup[] {
  const groups: HandGroup[] = []
  let from = 0, lo = Infinity, hi = -Infinity, hasOpen = false
  let notes: { string: number; fret: number }[] = []
  const close = (to: number) => {
    if (to <= from) return
    const open = hi === -Infinity || lo <= 1 || (hasOpen && hi <= 4)
    const base = open ? 1 : lo
    groups.push({ from, to, base, open, notes: fingers(notes, base, open) })
  }
  flat.forEach((f, i) => {
    const ns = f.step.notes.filter(n => n.tech !== 'x')
    if (!ns.length) return
    const fretted = ns.filter(n => n.fret > 0).map(n => n.fret)
    const nlo = Math.min(lo, ...fretted), nhi = Math.max(hi, ...fretted)
    const nOpen = hasOpen || ns.some(n => n.fret === 0)
    const fits = !fretted.length || nhi - nlo <= 3 || (nOpen && nhi <= 4 && nlo >= 1)
    if (!fits && notes.length) {
      close(i)
      from = i; lo = Infinity; hi = -Infinity; hasOpen = false; notes = []
    }
    if (fretted.length) { lo = Math.min(lo, ...fretted); hi = Math.max(hi, ...fretted) }
    hasOpen = hasOpen || ns.some(n => n.fret === 0)
    notes.push(...ns.map(n => ({ string: n.string, fret: n.fret })))
  })
  close(flat.length)
  if (groups.length) groups[0].from = 0
  // groups cover every step: stretch each to the next one's start
  for (let k = 0; k + 1 < groups.length; k++) groups[k].to = groups[k + 1].from
  return groups
}

export function groupAt(groups: HandGroup[], flatIdx: number) {
  if (flatIdx < 0) return groups.length ? 0 : -1
  for (let k = 0; k < groups.length; k++) if (flatIdx >= groups[k].from && flatIdx < groups[k].to) return k
  return groups.length - 1
}

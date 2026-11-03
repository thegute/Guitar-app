// "I played it right": when the app mishears a note (or a strum), one tap tells it so. It moves on as if you'd
// played it, and remembers the mix-up for that input (phone mic or USB amp): the next time it hears that same
// sound where the tab wants that note, it counts it. Chords it misjudged get a little more lenient.
import type { InputKind } from '../audio/gear'

const KEY = 'kg:taught'
interface Store { notes: Record<string, Record<string, number>>; chords: Record<string, number> }
type All = Partial<Record<InputKind, Store>>

function load(): All { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as All } catch { return {} } }
function save(a: All) { try { localStorage.setItem(KEY, JSON.stringify(a)) } catch { /* storage full */ } }
const of = (a: All, k: InputKind): Store => (a[k] ??= { notes: {}, chords: {} })
export const chordKey = (pcs: number[]) => [...new Set(pcs.map(p => ((p % 12) + 12) % 12))].sort((x, y) => x - y).join('-')

/** The tab note you meant: the expected note closest to what was heard. */
export function meantNote(want: number[], heard: number): number {
  return [...want].sort((a, b) => Math.abs(a - heard) - Math.abs(b - heard))[0] ?? heard
}
/** Remember that `heard` was really `want` on this input. */
export function teachNote(kind: InputKind, want: number, heard: number) {
  const a = load(), s = of(a, kind)
  const w = (s.notes[want] ??= {})
  w[heard] = (w[heard] ?? 0) + 1
  save(a)
}
export function teachChord(kind: InputKind, pcs: number[]) {
  const a = load(), s = of(a, kind)
  const k = chordKey(pcs)
  s.chords[k] = (s.chords[k] ?? 0) + 1
  save(a)
}
/** If `heard` is a mix-up you've taught for one of the expected notes, the note it stands for. */
export function taughtAlias(kind: InputKind, want: number[], heard: number): number | null {
  const s = load()[kind]
  if (!s) return null
  for (const m of want) if ((s.notes[m]?.[heard] ?? 0) >= 1) return m
  return null
}
/** 0 = as strict as normal, up to 1 = most lenient (after three corrections) for this chord. */
export function chordEase(kind: InputKind, pcs: number[]): number {
  return Math.min(1, (load()[kind]?.chords[chordKey(pcs)] ?? 0) / 3)
}
export function taughtCount(kind: InputKind): number {
  const s = load()[kind]
  if (!s) return 0
  return Object.values(s.notes).reduce((a, w) => a + Object.keys(w).length, 0) + Object.keys(s.chords).length
}
export function forgetTaught(kind: InputKind) { const a = load(); delete a[kind]; save(a) }

// Target notes: land on a chord tone (the root, 3rd, 5th, 7th, or the nearest 3rd/7th = voice leading) right as each
// chord arrives, over a band playing the progression. Pure logic here (targets, the walk, judging a landing, the speed
// trainer); TargetNotes.tsx is the screen.
import { chordInfo } from '../tabs/harmony'

export type TargetKind = 'root' | 'third' | 'fifth' | 'seventh' | 'guide' | 'any'
export const TARGET_KINDS: { id: TargetKind; label: string; hint: string }[] = [
  { id: 'root', label: 'Roots', hint: 'Land on each chord\'s root. The easy one: it always sounds right.' },
  { id: 'third', label: '3rds', hint: 'The 3rd says major or minor: landing on it makes your solo follow the chords.' },
  { id: 'fifth', label: '5ths', hint: 'Strong and neutral: the 5th sits inside every major and minor chord.' },
  { id: 'seventh', label: '7ths', hint: 'The 7th is the colour (bluesy, jazzy). A chord with no 7th takes its 3rd.' },
  { id: 'guide', label: 'Voice leading', hint: 'The 3rd or 7th (the root on a chord with no 7th) closest to the note you just played: usually one or two frets away. This is how good solos connect the chords.' },
  { id: 'any', label: 'Any chord tone', hint: 'Any note of the chord, on the 1. Start here if you are new to it.' },
]

export interface TChord { symbol: string; beats: number; root: number; pcs: number[]; third: number | null; fifth: number | null; seventh: number | null; label: (pc: number) => string }

export function tchord(symbol: string, beats = 4): TChord | null {
  const c = chordInfo(symbol)
  if (!c) return null
  const fifth = c.pcs.find(p => (p - c.root + 12) % 12 === 7 || (p - c.root + 12) % 12 === 6 || (p - c.root + 12) % 12 === 8) ?? null
  return { symbol, beats, root: c.root, pcs: c.pcs, third: c.third, fifth, seventh: c.seventh, label: pc => c.labels.get(pc) ?? '' }
}

/** The pitch classes that count for this chord. */
export function allowed(c: TChord, kind: TargetKind): number[] {
  switch (kind) {
    case 'root': return [c.root]
    case 'third': return c.third !== null ? [c.third] : [c.root]
    case 'fifth': return c.fifth !== null ? [c.fifth] : [c.root]
    case 'seventh': return c.seventh !== null ? [c.seventh] : c.third !== null ? [c.third] : [c.root]
    // a chord with no 7th: its root takes the 7th's place (G7's B goes up to C's root, its F down to C's E)
    case 'guide': return [c.third, c.seventh ?? c.root].filter((p): p is number => p !== null)
    case 'any': return c.pcs
  }
}

/** The note (midi, inside lo..hi) with one of these pitch classes nearest to `prev`; ties go down. */
export function nearest(pcs: number[], prev: number, lo: number, hi: number): number {
  let best = -1, d = Infinity
  for (let m = lo; m <= hi; m++) {
    if (!pcs.includes(((m % 12) + 12) % 12)) continue
    const dd = Math.abs(m - prev)
    if (dd < d) { d = dd; best = m }
  }
  return best < 0 ? prev : best
}

/** The suggested walk: one target note per chord, each as close as it can be to the last (voice leading). */
export function walk(chords: TChord[], kind: TargetKind, lo: number, hi: number, start = Math.round((lo + hi) / 2)): number[] {
  const out: number[] = []
  let prev = start
  for (const c of chords) { prev = nearest(allowed(c, kind), prev, lo, hi); out.push(prev) }
  return out
}

/** Words for one step of the walk: "E, the 3rd of C — 1 fret down from the last one". */
export function stepWords(c: TChord, midi: number, prev?: number): string {
  const pc = ((midi % 12) + 12) % 12
  const lbl = c.label(pc)
  const role = lbl === 'R' || lbl === '1' ? 'the root' : lbl ? `the ${ordinal(lbl)}` : 'a chord tone'
  const move = prev === undefined ? '' : midi === prev ? ' (stay on the same note)' : ` (${Math.abs(midi - prev)} fret${Math.abs(midi - prev) > 1 ? 's' : ''} ${midi > prev ? 'up' : 'down'})`
  return `${NAMES[pc]}, ${role} of ${c.symbol}${move}`
}
/** chord-tone label → words: "b3" → "♭3rd", "5" → "5th" */
export function ordinal(lbl: string): string {
  const m = /^([b#]?)(\d+)$/.exec(lbl)
  if (!m) return lbl
  const n = Number(m[2]), suf = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'
  return `${m[1] === 'b' ? '♭' : m[1] === '#' ? '♯' : ''}${n}${suf}`
}
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
export const pcLabel = (pc: number) => NAMES[((pc % 12) + 12) % 12]

/** Where on the neck to play: frets [from, from+4] (an open position takes in the open strings). */
export function zone(tuning: number[], from: number): { lo: number; hi: number } {
  return { lo: Math.min(...tuning) + from, hi: Math.max(...tuning) + from + 4 }
}

export type Window = 'one' | 'first'
/** One note you played: when (in beats from the loop's start) and what. */
export interface Onset { beat: number; midi: number }
/** Did you land it? 'one' = a target note within a quarter beat before to half a beat after the chord's first beat;
 *  'first' = the first note you play for the chord (from just before it to the end of its first beat) is a target. */
export function judge(onsets: Onset[], start: number, pcs: number[], w: Window): { ok: boolean; heard?: number; off?: number } {
  const inWin = onsets.filter(o => o.beat >= start - 0.3 && o.beat <= start + (w === 'one' ? 0.5 : 1))
  if (!inWin.length) return { ok: false }
  const pcOf = (m: number) => ((m % 12) + 12) % 12
  const hit = w === 'one' ? inWin.find(o => pcs.includes(pcOf(o.midi))) : pcs.includes(pcOf(inWin[0].midi)) ? inWin[0] : undefined
  const o = hit ?? inWin[0]
  return { ok: !!hit, heard: o.midi, off: Math.round((o.beat - start) * 100) / 100 }
}

/** Speed trainer: up 4 BPM after two laps in a row at 80%+, down 4 after a lap under 50%. */
export function nextBpm(bpm: number, lapPct: number, goodLaps: number, max = 200): { bpm: number; goodLaps: number } {
  if (lapPct >= 80) {
    const g = goodLaps + 1
    return g >= 2 ? { bpm: Math.min(max, bpm + 4), goodLaps: 0 } : { bpm, goodLaps: g }
  }
  if (lapPct < 50) return { bpm: Math.max(40, bpm - 4), goodLaps: 0 }
  return { bpm, goodLaps: 0 }
}

/** A note-start detector over pitch readings: a new note when the pitch changes by a semitone or more and holds for
 *  two readings, or when a note comes back after silence (re-picking the same note after a gap counts too). */
export class OnsetDetector {
  private last = -1
  private cand = -1
  private candN = 0
  private candAt = 0
  private quiet = 0
  private level = 0
  /** feed one reading (midi rounded, or null for silence) at time t with its input level; returns the note and when
   *  it started. The same note picked again shows up as a jump in level. */
  feed(midi: number | null, t: number, level = 0): { midi: number; t: number } | null {
    const jump = level > 0.04 && level > this.level * 1.8
    this.level = level
    if (midi === null) { this.quiet++; if (this.quiet >= 3) { this.last = -1; this.cand = -1; this.candN = 0 } return null }
    this.quiet = 0
    if (midi === this.last) { this.cand = -1; this.candN = 0; return jump ? { midi, t } : null }
    if (midi === this.cand) this.candN++
    else { this.cand = midi; this.candN = 1; this.candAt = t }
    if (this.candN >= 2) { this.last = midi; this.cand = -1; this.candN = 0; return { midi, t: this.candAt } }
    return null
  }
}

// ---------- your level: the chord-tone path, one target kind at a time ----------
/** the order to learn them in: roots, any chord tone, 3rds, 5ths, 7ths, then voice leading */
export const LEVELS: TargetKind[] = ['root', 'any', 'third', 'fifth', 'seventh', 'guide']
/** a kind counts as learned at this tempo or faster with a lap of 80% or more */
export const PASS_BPM = 80
const BEST = 'kg:tnBest'
export function loadBest(): Partial<Record<TargetKind, number>> { try { return JSON.parse(localStorage.getItem(BEST) ?? '{}') } catch { return {} } }
/** a lap at 80%+ at this tempo: remember the fastest */
export function noteLap(kind: TargetKind, bpm: number, pct: number): Partial<Record<TargetKind, number>> {
  const b = loadBest()
  if (pct >= 80 && bpm > (b[kind] ?? 0)) { b[kind] = bpm; try { localStorage.setItem(BEST, JSON.stringify(b)) } catch { /* storage full */ } }
  return b
}
/** The coach's word on where you are and what to work on next. */
export function levelAdvice(best: Partial<Record<TargetKind, number>>): { next: TargetKind; text: string; done: number } {
  const done = LEVELS.filter(k => (best[k] ?? 0) >= PASS_BPM).length
  const next = LEVELS.find(k => (best[k] ?? 0) < PASS_BPM) ?? 'guide'
  const lbl = (k: TargetKind) => TARGET_KINDS.find(x => x.id === k)!.label.toLowerCase()
  const cur = best[next]
  const text = done === LEVELS.length
    ? `You've got all six at ${PASS_BPM} BPM or faster. Keep voice leading going in new keys and positions, and push the speed.`
    : cur ? `Next: ${lbl(next)}. Your best clean lap is at ${cur} BPM; get one at ${PASS_BPM} to move on.`
      : done ? `Next: ${lbl(next)}. ${LEVELS.slice(0, done).map(lbl).join(', ')} done.` : `Start with ${lbl(next)}: slow, and only the first note of each chord counts.`
  return { next, text, done }
}

// Game Mode (Play → Game): the note highway's model and the score.
//   items      every step of the tab as blocks on the highway: beat, length, string, fret, the finger that plays it
//              (Step 1's hand plan: 1 blue, 2 green, 3 orange, 4 red, open white), technique, chord name for strums
//   sections   the song's own parts (chord sheets name them) or every 4 bars; stars per section
//   score      points per note (perfect 100, good 60, early/late 25) × the multiplier: 3× to start, +1 for every 8 clean
//              notes in a row up to 5×, back to 3× on a miss or a sloppy note
//   stars      per section: ★ 50 %, ★★ 75 %, ★★★ 90 %, gold = every note on time
//   best       per song: the best result of each section over all runs (a section played well once stays well played)
import type { FlatStep } from '../tabs/model'
import type { HandGroup } from './handShape'
import { groupAt } from './handShape'

export interface HighwayNote { string: number; fret: number; finger: number; tech?: string }
export interface HighwayItem { flat: number; beat: number; dur: number; notes: HighwayNote[]; chord?: string; section: number }
export interface Section { name: string; fromBar: number; toBar: number; from: number; to: number }

export const FINGER_COLORS = ['#ffffff', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'] as const

/** The song's parts: its named sections, or every 4 bars. `from`/`to` = flat step range [from, to). */
export function sectionsOf(flat: FlatStep[], barsPer = 4): Section[] {
  if (!flat.length) return []
  const lastBar = flat[flat.length - 1].bar
  const named = flat.filter(f => f.step.section).map(f => ({ bar: f.bar, name: f.step.section! }))
  const starts: { bar: number; name: string }[] = named.length >= 2 ? named : []
  if (!starts.length) for (let b = 0, k = 1; b <= lastBar; b += barsPer, k++) starts.push({ bar: b, name: `Part ${k}` })
  if (starts[0].bar > 0) starts.unshift({ bar: 0, name: 'Intro' })
  return starts.map((s, i) => {
    const toBar = (starts[i + 1]?.bar ?? lastBar + 1) - 1
    const from = flat.findIndex(f => f.bar >= s.bar)
    const end = flat.findIndex(f => f.bar > toBar)
    return { name: s.name, fromBar: s.bar, toBar, from, to: end < 0 ? flat.length : end }
  }).filter(s => s.from >= 0 && s.to > s.from)
}

/** The blocks on the highway. */
export function highway(flat: FlatStep[], beatOf: number[], hands: HandGroup[], sections: Section[], chordAt?: (i: number) => string | undefined): HighwayItem[] {
  const out: HighwayItem[] = []
  let sec = 0
  for (let i = 0; i < flat.length; i++) {
    const st = flat[i].step
    const played = st.notes.filter(n => n.tech !== 'tie')
    if (!played.length) continue
    while (sec + 1 < sections.length && i >= sections[sec + 1].from) sec++
    const g = hands[groupAt(hands, i)]
    const notes = played.map(n => ({ string: n.string, fret: n.fret, tech: n.tech, finger: n.fret === 0 ? 0 : g?.notes.find(h => h.string === n.string && h.fret === n.fret)?.finger ?? 0 }))
    const pcs = new Set(played.map(n => n.midi % 12)).size
    out.push({ flat: i, beat: beatOf[i] ?? 0, dur: st.dur, notes, chord: pcs >= 3 ? st.chord ?? chordAt?.(i) : undefined, section: sec })
  }
  return out
}

export type NoteResult = 'perfect' | 'good' | 'early' | 'late' | 'miss'
export const POINTS: Record<NoteResult, number> = { perfect: 100, good: 60, early: 25, late: 25, miss: 0 }

/** The running score with its multiplier. */
export class Scorer {
  points = 0
  streak = 0
  best = 0
  mult = 3
  add(r: NoteResult): number {
    const clean = r === 'perfect' || r === 'good'
    if (clean) { this.streak++; this.best = Math.max(this.best, this.streak); this.mult = Math.min(5, 3 + Math.floor(this.streak / 8)) }
    else { this.streak = 0; this.mult = 3 }
    const got = POINTS[r] * this.mult
    this.points += got
    return got
  }
}

export interface SectionResult { stars: 0 | 1 | 2 | 3; gold: boolean; pct: number; points: number }
/** A section's stars from its notes' results (undefined = not reached: counts as missed). */
export function sectionResult(results: (NoteResult | undefined)[]): SectionResult {
  if (!results.length) return { stars: 0, gold: false, pct: 0, points: 0 }
  let w = 0, onTime = 0, points = 0
  for (const r of results) {
    const x = r ?? 'miss'
    w += x === 'perfect' || x === 'good' ? 1 : x === 'early' || x === 'late' ? 0.5 : 0
    if (x === 'perfect' || x === 'good') onTime++
    points += POINTS[x]
  }
  const pct = Math.round((w / results.length) * 100)
  const stars = pct >= 90 ? 3 : pct >= 75 ? 2 : pct >= 50 ? 1 : 0
  return { stars, gold: onTime === results.length, pct, points }
}

/** Results per section from per-step results. */
export function sectionResults(sections: Section[], items: HighwayItem[], results: Map<number, NoteResult>): SectionResult[] {
  return sections.map((_, s) => sectionResult(items.filter(it => it.section === s).map(it => results.get(it.flat))))
}

// ---------- the best of each section, kept per song ----------
const BEST = 'kg:gameBest'
export interface SongBest { sections: SectionResult[]; total: number; at: number }
export function loadBest(songId: string): SongBest | null {
  try { return (JSON.parse(localStorage.getItem(BEST) ?? '{}') as Record<string, SongBest>)[songId] ?? null } catch { return null }
}
/** Merge a run into the song's best (section by section); returns the new best. Only sections that were played count. */
export function mergeBest(prev: SongBest | null, run: SectionResult[], played: boolean[]): SongBest {
  const sections = run.map((r, i): SectionResult => {
    const p = prev?.sections[i]
    if (!played[i]) return p ?? { stars: 0, gold: false, pct: 0, points: 0 }
    if (!p) return r
    return r.pct > p.pct || (r.pct === p.pct && r.points > p.points) ? r : p
  })
  return { sections, total: sections.reduce((t, s) => t + s.points, 0), at: Date.now() }
}
export function saveBest(songId: string, b: SongBest) {
  try { const all = JSON.parse(localStorage.getItem(BEST) ?? '{}') as Record<string, SongBest>; all[songId] = b; localStorage.setItem(BEST, JSON.stringify(all)) } catch { /* storage */ }
}

/** "Perfect it": the sections to drill, weakest first (under 3 stars, or not gold when asked). */
export function toPerfect(best: SongBest | null, run: SectionResult[]): number[] {
  const src = run.map((r, i) => best?.sections[i] && best.sections[i].pct > r.pct ? best.sections[i] : r)
  return src.map((r, i) => ({ r, i })).filter(x => x.r.stars < 3).sort((a, b) => a.r.pct - b.r.pct).map(x => x.i)
}

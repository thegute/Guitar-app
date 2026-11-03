// The report card after a run-through: your score, how it compares, the bars that went wrong (lit up on the tab)
// and the one thing to do next, as a button.
import type { SongRun } from './songStats'
import type { RunStats } from './inTime'

export type NextKind = 'loop' | 'intime' | 'faster' | 'again' | 'learned'
export interface Report {
  score: number
  mode: 'wait' | 'time'
  speed: number
  /** your last full run in the same mode, before this one */
  prev?: number
  best: number
  headline: string
  /** the worst bars (0-based), at most two */
  bars: number[]
  /** what the loop button would loop */
  loop?: { from: number; to: number }
  next: { kind: NextKind; label: string; speed?: number }
  timing?: Pick<RunStats, 'onTime' | 'early' | 'late' | 'missed' | 'meanErr'>
}

const barsText = (l: { from: number; to: number }) => (l.from === l.to ? `bar ${l.from + 1}` : `bars ${l.from + 1}–${l.to + 1}`)

/** Mistakes per bar from the tab's note states (wait: 2 = missed first time, 3 = wrong; in time: 2 early/late, 3 missed). */
export function barMistakes(states: ArrayLike<number>, barOf: (i: number) => number | undefined, mode: 'wait' | 'time'): Map<number, number> {
  const m = new Map<number, number>()
  for (let i = 0; i < states.length; i++) {
    const st = states[i]
    if (st !== 2 && st !== 3) continue
    const b = barOf(i)
    if (b === undefined) continue
    const w = mode === 'time' && st === 2 ? 0.5 : 1
    m.set(b, (m.get(b) ?? 0) + w)
  }
  return m
}

export function makeReport(o: {
  score: number; mode: 'wait' | 'time'; speed: number; mistakes: Map<number, number>; before: SongRun[]; best: number; stats?: RunStats
}): Report {
  const { score, mode, speed, mistakes } = o
  const prev = [...o.before].reverse().find(r => r.full && r.mode === mode)?.score
  const ranked = [...mistakes.entries()].filter(([, n]) => n >= 1).sort((a, b) => b[1] - a[1] || a[0] - b[0])
  const bars = ranked.slice(0, 2).map(([b]) => b).sort((a, b) => a - b)
  let loop: Report['loop']
  if (ranked.length) {
    const w = ranked[0][0]
    const nb = [w - 1, w + 1].filter(b => (mistakes.get(b) ?? 0) >= 1).sort((a, b) => (mistakes.get(b)! - mistakes.get(a)!))[0]
    loop = nb === undefined ? { from: w, to: w } : { from: Math.min(w, nb), to: Math.max(w, nb) }
  }
  let next: Report['next']
  if (loop && score < 90) next = mode === 'time' ? { kind: 'loop', label: `Loop ${barsText(loop)} at 70%`, speed: 0.7 } : { kind: 'loop', label: `Loop ${barsText(loop)}` }
  else if (mode === 'wait' && score >= 85) next = { kind: 'intime', label: 'Now try it In time, at ¾ speed', speed: 0.75 }
  else if (mode === 'time' && score >= 90 && speed < 1) { const s = Math.min(1, Math.round((speed + 0.1) * 20) / 20); next = { kind: 'faster', label: `Speed up to ${Math.round(s * 100)}%`, speed: s } }
  else if (mode === 'time' && score >= 90) next = { kind: 'learned', label: 'Play it again' }
  else if (loop) next = mode === 'time' ? { kind: 'loop', label: `Loop ${barsText(loop)} at 70%`, speed: 0.7 } : { kind: 'loop', label: `Loop ${barsText(loop)}` }
  else next = { kind: 'again', label: 'Play it again' }
  const headline = next.kind === 'learned' ? 'Learned it! It comes back now and then for a review'
    : score >= 90 ? 'Great run' : score >= 75 ? 'Nice, nearly there' : score >= 50 ? 'Getting there' : 'Good start: slow it down and loop the hard part'
  const s = o.stats
  return {
    score, mode, speed, prev, best: Math.max(o.best, score), headline, bars, loop, next,
    timing: s ? { onTime: s.onTime, early: s.early, late: s.late, missed: s.missed, meanErr: s.meanErr } : undefined,
  }
}

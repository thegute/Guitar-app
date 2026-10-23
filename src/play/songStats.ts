// Progress per song: every run's score, which bars go wrong, when you learned it and when it's due for review
// (songs you've learned come back on a growing schedule so they don't fade: 3, 7, 14, 30, 60 days).
import type { InstrumentId } from '../instrument'

export interface SongRun { at: number; score: number; mode: 'wait' | 'time'; speed: number; full: boolean; bars?: [number, number] }
export interface SongStats {
  title: string
  inst: InstrumentId
  runs: SongRun[]
  best: number
  lastAt: number
  /** wrong / late notes per bar, and clean notes per bar (recent runs weigh more) */
  barMiss: Record<number, number>
  barHit: Record<number, number>
  learnedAt?: number
  review?: { box: number; due: number }
}
const KEY = 'kg:songStats'
const DAY = 864e5
const INTERVALS = [3, 7, 14, 30, 60]

function all(): Record<string, SongStats> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, SongStats> } catch { return {} }
}
function save(a: Record<string, SongStats>) {
  try { localStorage.setItem(KEY, JSON.stringify(a)) } catch { /* storage unavailable */ }
}
export function songStats(id: string): SongStats | null {
  return all()[id] ?? null
}
export function allSongStats() { return all() }

/** Record a run (a whole play-through, or one pass of a looped section). */
export function recordRun(id: string, meta: { title: string; inst: InstrumentId }, run: Omit<SongRun, 'at'>, bars: { miss: Record<number, number>; hit: Record<number, number> }, now = Date.now()) {
  const a = all()
  const s: SongStats = a[id] ?? { title: meta.title, inst: meta.inst, runs: [], best: 0, lastAt: 0, barMiss: {}, barHit: {} }
  s.title = meta.title
  s.inst = meta.inst
  s.runs = [...s.runs, { ...run, at: now }].slice(-40)
  if (run.full) s.best = Math.max(s.best, run.score)
  s.lastAt = now
  // older bar results fade so the trouble spots reflect how you play now
  for (const k of Object.keys(s.barMiss)) s.barMiss[+k] *= 0.8
  for (const k of Object.keys(s.barHit)) s.barHit[+k] *= 0.8
  for (const [b, n] of Object.entries(bars.miss)) s.barMiss[+b] = (s.barMiss[+b] ?? 0) + n
  for (const [b, n] of Object.entries(bars.hit)) s.barHit[+b] = (s.barHit[+b] ?? 0) + n
  // learned: a full run at 90% or better (at three-quarter speed or more)
  if (run.full && run.score >= 90 && run.speed >= 0.75) {
    if (!s.learnedAt) { s.learnedAt = now; s.review = { box: 0, due: now + INTERVALS[0] * DAY } }
    else if (s.review && now >= s.review.due - DAY / 2) {
      const box = Math.min(INTERVALS.length - 1, s.review.box + 1)
      s.review = { box, due: now + INTERVALS[box] * DAY }
    }
  } else if (run.full && s.review && now >= s.review.due && run.score < 75) {
    // a review that went badly comes back sooner
    const box = Math.max(0, s.review.box - 1)
    s.review = { box, due: now + 2 * DAY }
  }
  a[id] = s
  save(a)
  return s
}

/** The two-bar stretch that goes wrong most (for "fix these bars"), or null if nothing stands out. */
export function troubleBars(s: SongStats | null): { from: number; to: number; misses: number } | null {
  if (!s) return null
  let best: { from: number; to: number; misses: number } | null = null
  const bars = Object.keys(s.barMiss).map(Number)
  for (const b of bars) {
    const m = (s.barMiss[b] ?? 0) + (s.barMiss[b + 1] ?? 0)
    const h = (s.barHit[b] ?? 0) + (s.barHit[b + 1] ?? 0)
    const ratio = m / Math.max(1, m + h)
    if (m >= 2 && ratio >= 0.25 && (!best || m > best.misses)) best = { from: b, to: s.barMiss[b + 1] ? b + 1 : b, misses: m }
  }
  return best
}

/** Learned songs on this instrument that are due for a review, most overdue first. */
export function dueReviews(inst: InstrumentId, now = Date.now()) {
  return Object.entries(all())
    .filter(([, s]) => s.inst === inst && s.review && s.review.due <= now)
    .sort((x, y) => x[1].review!.due - y[1].review!.due)
    .map(([id, s]) => ({ id, ...s }))
}

export function ago(t: number, now = Date.now()) {
  const d = Math.floor((now - t) / DAY)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`
}

// Course progress: which steps of a lesson you've done, when you finished it, and its spaced reviews (1, 3, 7 and 30
// days after finishing: a short check that brings it back before it fades). Kept in kg:course (part of backups).
import { bump, logDone } from '../learn/progress'

export interface LessonProgress { steps: string[]; at?: number; done?: number; reviews: number[] }
type Store = Record<string, Partial<LessonProgress>>
const KEY = 'kg:course'
export const REVIEW_DAYS = [1, 3, 7, 30]
const DAY = 86400000

function load(): Store { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store } catch { return {} } }
function save(s: Store) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* full or blocked */ } dispatchEvent(new Event('kg-course')) }

export const lessonProgress = (id: string): LessonProgress => ({ steps: [], reviews: [], ...load()[id] })

/** Mark a step done (by its index), and remember where you were. */
export function stepDone(id: string, step: number) {
  const s = load()
  const p: LessonProgress = { steps: [], reviews: [], ...s[id] }
  if (!p.steps.includes(String(step))) p.steps.push(String(step))
  p.at = step
  s[id] = p
  save(s)
}
export function setAt(id: string, step: number) {
  const s = load()
  s[id] = { steps: [], reviews: [], ...s[id], at: step }
  save(s)
}

/** Finish the lesson (after the check). Returns true the first time. */
export function finishLesson(id: string, now = Date.now()): boolean {
  const s = load()
  const p: LessonProgress = { steps: [], reviews: [], ...s[id] }
  const first = !p.done
  if (first) { p.done = now; bump('lessonsRead'); logDone('course:' + id) }
  s[id] = p
  save(s)
  return first
}

/** The next review that's due (index into REVIEW_DAYS), or -1. */
export function reviewDue(p: LessonProgress, now = Date.now()): number {
  if (!p.done) return -1
  const k = p.reviews.length
  if (k >= REVIEW_DAYS.length) return -1
  return now >= p.done + REVIEW_DAYS[k] * DAY ? k : -1
}
/** When the next review comes up (ms), or null when all are done. */
export function nextReviewAt(p: LessonProgress): number | null {
  if (!p.done || p.reviews.length >= REVIEW_DAYS.length) return null
  return p.done + REVIEW_DAYS[p.reviews.length] * DAY
}
export function reviewDone(id: string, now = Date.now()) {
  const s = load()
  const p: LessonProgress = { steps: [], reviews: [], ...s[id] }
  if (reviewDue(p, now) >= 0) { p.reviews.push(now); bump('lessonsRead'); logDone('review:' + id) }
  s[id] = p
  save(s)
}
/** Lessons with a review due now. */
export const dueReviews = (ids: string[], now = Date.now()) => ids.filter(id => reviewDue(lessonProgress(id), now) >= 0)

/** Practice-week days ticked off (kept with the steps as 'day:N'). */
export function toggleDay(id: string, day: number) {
  const s = load()
  const p: LessonProgress = { steps: [], reviews: [], ...s[id] }
  const k = 'day:' + day
  p.steps = p.steps.includes(k) ? p.steps.filter(x => x !== k) : [...p.steps, k]
  s[id] = p
  save(s)
}

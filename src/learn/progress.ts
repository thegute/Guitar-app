// Practice tracking: minutes per day (with or without the guitar), streaks, away mode,
// and per-item memory for quizzes (spaced repetition).
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { instrumentId } from '../instrument'

export type Activity =
  | 'play' | 'jam' | 'tuner' | 'quiz' | 'ear' | 'theory' | 'caged' | 'changes' | 'rhythm' | 'warmup' | 'circle'

export interface DayLog {
  /** seconds practised with the guitar */
  guitar: number
  /** seconds of study without it */
  study: number
  by: Partial<Record<Activity, number>>
  answers: number
  correct: number
  /** quiz/lesson ids finished today */
  done: string[]
  away?: boolean
  /** XP earned today */
  xp?: number
  /** counters for quests and badges (notes hit, loops recorded ...) */
  counts?: Record<string, number>
  /** a streak freeze covered this day */
  frozen?: boolean
  /** practised in ukulele mode */
  uke?: boolean
}

const LOG = 'kg:practiceLog'
const AWAY = 'kg:away'
const GOAL = 'kg:dailyGoalMin'
const SRS = 'kg:srs'
const STARS = 'kg:stars'

const listeners = new Set<() => void>()
let version = 0
function changed() {
  version++
  listeners.forEach(f => f())
}
function read<T>(k: string, d: T): T {
  try {
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : d
  } catch {
    return d
  }
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}

export function dayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function allLogs(): Record<string, DayLog> {
  return read<Record<string, DayLog>>(LOG, {})
}
export function todayLog(): DayLog {
  return allLogs()[dayKey()] ?? { guitar: 0, study: 0, by: {}, answers: 0, correct: 0, done: [] }
}

function update(fn: (d: DayLog) => void) {
  const logs = allLogs()
  const k = dayKey()
  const d = logs[k] ?? { guitar: 0, study: 0, by: {}, answers: 0, correct: 0, done: [] }
  const before = d.guitar + d.study
  fn(d)
  if (isAway()) d.away = true
  if (instrumentId() !== 'guitar') d.uke = true
  logs[k] = d
  write(LOG, logs)
  changed()
  afterUpdate.forEach(f => f(before, d))
}
/** the game layer (XP, quests, badges) and reminders listen for every logged change */
const afterUpdate = new Set<(before: number, d: DayLog) => void>()
export function onLogUpdate(f: (before: number, d: DayLog) => void) {
  afterUpdate.add(f)
  return () => { afterUpdate.delete(f) }
}
export function saveDay(k: string, d: DayLog) {
  const logs = allLogs()
  logs[k] = d
  write(LOG, logs)
  changed()
}
/** add to a counter today (notes hit, quiz answers, loops recorded ...) */
export function bump(key: string, n = 1) {
  update(d => {
    d.counts = d.counts ?? {}
    d.counts[key] = (d.counts[key] ?? 0) + n
  })
}
/** add to several counters at once (one write) */
export function bumpCounts(c: Record<string, number>) {
  update(d => {
    d.counts = d.counts ?? {}
    for (const [k, n] of Object.entries(c)) d.counts[k] = (d.counts[k] ?? 0) + n
  })
}
export function addXp(n: number) {
  if (n) update(d => { d.xp = (d.xp ?? 0) + n })
}

export function logTime(kind: Activity, seconds: number, withGuitar: boolean) {
  if (seconds <= 0) return
  update(d => {
    if (withGuitar) d.guitar += seconds
    else d.study += seconds
    d.by[kind] = (d.by[kind] ?? 0) + seconds
    // 15 XP a minute with the guitar, 10 without
    d.xp = (d.xp ?? 0) + Math.round((seconds / 60) * (withGuitar ? 15 : 10))
  })
}
export function logAnswer(correct: boolean, combo = 0) {
  update(d => {
    d.answers++
    if (correct) {
      d.correct++
      d.xp = (d.xp ?? 0) + 2 + Math.min(3, Math.floor(combo / 5))
    }
  })
}
export function logDone(id: string) {
  update(d => {
    if (!d.done.includes(id)) d.done.push(id)
  })
}

// ---------- goal and streak ----------
export function dailyGoalMin() {
  return read<number>(GOAL, 15)
}
export function setDailyGoalMin(m: number) {
  write(GOAL, m)
  changed()
}
/** A day counts when you practise at least 5 minutes, with the guitar or without it. */
export const COUNTS_AFTER_SEC = 5 * 60
export function dayCounts(d?: DayLog) {
  return !!d && d.guitar + d.study >= COUNTS_AFTER_SEC
}
/** Practised days in a row. Days covered by a streak freeze keep the streak alive but don't add to it. */
export function streak(): { current: number; best: number; total: number } {
  const logs = allLogs()
  const keep = (k: string) => dayCounts(logs[k]) || !!logs[k]?.frozen
  const days = Object.keys(logs).filter(keep).sort()
  let best = 0, run = 0, prev: Date | null = null
  for (const k of days) {
    const d = new Date(k + 'T12:00:00')
    const add = dayCounts(logs[k]) ? 1 : 0
    run = prev && Math.round((d.getTime() - prev.getTime()) / 864e5) === 1 ? run + add : add
    best = Math.max(best, run)
    prev = d
  }
  // the current streak is still alive if you practised today or yesterday
  let current = 0
  const cur = new Date()
  if (!keep(dayKey(cur))) cur.setDate(cur.getDate() - 1)
  while (keep(dayKey(cur))) { if (dayCounts(logs[dayKey(cur)])) current++; cur.setDate(cur.getDate() - 1) }
  return { current, best: Math.max(best, current), total: Object.keys(logs).filter(k => dayCounts(logs[k])).length }
}

// ---------- away from the guitar ----------
/** Away mode switches itself off after 30 hours (a 24-hour shift plus some). */
const AWAY_HOURS = 30
export function isAway(): boolean {
  const a = read<{ since: number } | null>(AWAY, null)
  if (!a) return false
  if (Date.now() - a.since > AWAY_HOURS * 3600e3) return false
  return true
}
export function awaySince(): number | null {
  const a = read<{ since: number } | null>(AWAY, null)
  return a && isAway() ? a.since : null
}
export function setAway(on: boolean) {
  write(AWAY, on ? { since: Date.now() } : null)
  changed()
}

// ---------- quiz memory (Leitner boxes) ----------
export interface ItemStat { box: number; due: number; seen: number; right: number; ms: number }
const BOX_DAYS = [0, 1, 2, 4, 8, 16]
export function itemStats(): Record<string, ItemStat> {
  return read<Record<string, ItemStat>>(SRS, {})
}
export function recordItem(id: string, correct: boolean, ms: number, combo = 0) {
  const all = itemStats()
  const s = all[id] ?? { box: 0, due: 0, seen: 0, right: 0, ms: 0 }
  s.seen++
  if (correct) s.right++
  s.ms = s.ms ? s.ms * 0.7 + ms * 0.3 : ms
  s.box = correct ? Math.min(5, s.box + (ms < 4000 ? 1 : 0.5)) : 0
  s.due = Date.now() + BOX_DAYS[Math.floor(s.box)] * 864e5
  all[id] = s
  write(SRS, all)
  logAnswer(correct, combo)
}
/** Weight for choosing an item: new, due or often-missed items come up more. */
export function itemWeight(id: string, stats = itemStats()) {
  const s = stats[id]
  if (!s) return 3
  const due = s.due <= Date.now() ? 2 : 0.4
  const miss = 1 + (s.seen - s.right) / Math.max(1, s.seen) * 3
  return due * miss * (s.box < 2 ? 1.5 : 1)
}
/** 0..1 how well a set of items is known. */
export function mastery(ids: string[], stats = itemStats()) {
  if (!ids.length) return 0
  return ids.reduce((a, id) => a + Math.min(1, (stats[id]?.box ?? 0) / 4), 0) / ids.length
}

// ---------- stars for finished lessons/quizzes ----------
export function stars(): Record<string, number> {
  return read<Record<string, number>>(STARS, {})
}
export function setStars(id: string, n: number) {
  const s = stars()
  if ((s[id] ?? 0) < n) {
    s[id] = n
    write(STARS, s)
  }
  logDone(id)
}

// ---------- React hooks ----------
export function useProgress() {
  return useSyncExternalStore(
    f => { listeners.add(f); return () => { listeners.delete(f) } },
    () => version,
  )
}

/**
 * Counts practice time while `active` is true and the app is on screen.
 * `withGuitar` says whether it counts as guitar time or study time.
 */
export function usePracticeTimer(kind: Activity, active: boolean, withGuitar: boolean) {
  const last = useRef<number | null>(null)
  const opts = useRef({ kind, withGuitar })
  opts.current = { kind, withGuitar }
  useEffect(() => {
    if (!active) return
    last.current = Date.now()
    const flush = () => {
      if (last.current === null) return
      const now = Date.now()
      const s = Math.round((now - last.current) / 1000)
      if (s >= 1) {
        // ignore gaps (phone asleep, app in background)
        if (s < 120 && document.visibilityState === 'visible') logTime(opts.current.kind, s, opts.current.withGuitar)
        last.current = now
      }
    }
    const t = setInterval(flush, 15000)
    const vis = () => { if (document.visibilityState !== 'visible') flush(); else last.current = Date.now() }
    document.addEventListener('visibilitychange', vis)
    return () => {
      flush()
      clearInterval(t)
      document.removeEventListener('visibilitychange', vis)
      last.current = null
    }
  }, [active])
}

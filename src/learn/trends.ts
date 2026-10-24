// Skill trends for Progress: chord changes a minute, timing accuracy (In time), rhythm trainer scores, and the
// speed you can play each song cleanly, day by day.
import { allSongStats } from '../play/songStats'

export type SkillKind = 'changes' | 'rhythm'
interface Entry { at: number; kind: SkillKind; value: number; key?: string }
const KEY = 'kg:skillLog'

function read(): Entry[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Entry[] } catch { return [] } }
export function logSkill(kind: SkillKind, value: number, key?: string) {
  const all = read()
  all.push({ at: Date.now(), kind, value, ...(key ? { key } : {}) })
  try { localStorage.setItem(KEY, JSON.stringify(all.slice(-2000))) } catch { /* storage unavailable */ }
}

const dayOf = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }

/** One point per day with practice: the day's best (changes, rhythm) or average (timing). */
export interface Point { day: number; value: number }
function byDay(items: { at: number; value: number }[], how: 'max' | 'avg', days: number): Point[] {
  const since = dayOf(Date.now()) - (days - 1) * 864e5
  const m = new Map<number, number[]>()
  for (const it of items) if (it.at >= since) { const d = dayOf(it.at); m.set(d, [...(m.get(d) ?? []), it.value]) }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([day, vs]) => ({ day, value: how === 'max' ? Math.max(...vs) : Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) }))
}

export function changesTrend(days = 60) { return byDay(read().filter(e => e.kind === 'changes'), 'max', days) }
export function rhythmTrend(days = 60) { return byDay(read().filter(e => e.kind === 'rhythm'), 'max', days) }
/** In time runs: how many notes were on time (%), averaged per day. */
export function timingTrend(instId: string, days = 60) {
  const runs = Object.values(allSongStats()).filter(s => s.inst === instId).flatMap(s => s.runs.filter(r => r.mode === 'time').map(r => ({ at: r.at, value: r.score })))
  return byDay(runs, 'avg', days)
}

/** Per song: the fastest speed played cleanly (85%+), first and now. */
export function cleanSpeeds(instId: string, limit = 6) {
  return Object.entries(allSongStats())
    .filter(([, s]) => s.inst === instId)
    .map(([id, s]) => {
      const clean = s.runs.filter(r => r.score >= 85).sort((a, b) => a.at - b.at)
      if (!clean.length) return null
      const best = Math.max(...clean.map(r => r.speed))
      return { id, title: s.title, first: clean[0].speed, best, lastAt: s.lastAt, runs: clean.length }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.lastAt - a.lastAt)
    .slice(0, limit)
}

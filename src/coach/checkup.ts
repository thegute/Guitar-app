// The weekly 5-minute check-up: once a week the coach puts together a short session from what it remembers (a spot
// you fixed: does it still hold at full speed? the hardest open spot at your best speed; the oldest one a bit faster)
// and a plain report of the week next to the week before.
import type { Session, Step } from '../sessions/session'
import { type CoachMemory, type MemSpot, kindWords, habits, ceilingsNow } from './memory'

const KEY = 'kg:coachCheckup'
const DAY = 864e5
export function lastCheckup(): number { try { return Number(localStorage.getItem(KEY) ?? 0) || 0 } catch { return 0 } }
export function markCheckup(now = Date.now()) { try { localStorage.setItem(KEY, String(now)) } catch { /* storage full */ } }

export interface WeekReport {
  /** spots flagged in the last 7 days, and the 7 before */
  flagged: number
  flaggedBefore: number
  /** spots that came clean at 90%+ in the last 7 days */
  fixed: number
  /** kinds whose top clean speed went up this week */
  faster: { words: string; from: number; to: number }[]
  /** the habit to keep an eye on, if any */
  habit?: string
  /** a line or two to say */
  text: string
}

export function weekReport(m: CoachMemory, now = Date.now()): WeekReport {
  const inLast = (t: number, from: number, to: number) => now - t >= from * DAY && now - t < to * DAY
  const flagged = m.log.filter(([t]) => inLast(t, 0, 7)).length
  const flaggedBefore = m.log.filter(([t]) => inLast(t, 7, 14)).length
  const fixed = m.spots.filter(s => s.fixedAt && inLast(s.fixedAt, 0, 7)).length
  const faster = ceilingsNow(m).filter(c => c.speed > c.from).map(c => ({ words: c.words, from: c.from, to: c.speed }))
  const habit = habits(m, now)[0]?.words
  const parts: string[] = []
  if (fixed) parts.push(`You fixed ${fixed} trouble spot${fixed > 1 ? 's' : ''} this week.`)
  if (flagged || flaggedBefore) parts.push(flagged < flaggedBefore ? `Fewer slips than the week before (${flagged} against ${flaggedBefore}).` : flagged > flaggedBefore ? `More flagged spots than the week before (${flagged} against ${flaggedBefore}), which often just means harder music.` : `About as many flagged spots as the week before (${flagged}).`)
  if (faster.length) parts.push(`Faster clean: ${faster.map(f => `${f.words} ${Math.round(f.from * 100)}% → ${Math.round(f.to * 100)}%`).join(', ')}.`)
  if (habit) parts.push(`Keep an eye on ${habit}.`)
  if (!parts.length) parts.push('Not much to go on yet. Play a few songs with the coach on and next week there will be more to say.')
  return { flagged, flaggedBefore, fixed, faster, habit, text: parts.join(' ') }
}

/** Due once a week, and only when there's something to check. */
export function checkupDue(m: CoachMemory, now = Date.now(), last = lastCheckup()): boolean {
  return now - last >= 7 * DAY && m.spots.length > 0
}

const go = (s: MemSpot, speed: number): Step['target'] => ({ go: { song: s.song, loop: s.loop, speed } })

/** The check-up session (about 5 minutes), or null with nothing to check. */
export function checkupSession(m: CoachMemory, inst?: string, now = Date.now()): Session | null {
  const mine = m.spots.filter(s => !inst || !s.inst || s.inst === inst)
  const open = mine.filter(s => !s.fixedAt)
  const held = mine.filter(s => s.fixedAt && now - s.fixedAt < 21 * DAY).sort((a, b) => b.fixedAt! - a.fixedAt!)[0]
  const hardest = [...open].sort((a, b) => b.n - a.n || b.at - a.at)[0]
  const oldest = [...open].sort((a, b) => a.at - b.at).find(s => s !== hardest)
  const steps: Step[] = []
  if (held) steps.push({ title: `Does it hold? Bar ${held.bar + 1} of ${held.title}`, minutes: 1, target: go(held, 1), tip: `You got this clean before. Play it at full speed, cold, a few times.` })
  if (hardest) steps.push({ title: `Bar ${hardest.bar + 1} of ${hardest.title}`, minutes: 2, target: go(hardest, Math.max(0.6, hardest.best ?? 0.7)), tip: `Your hardest spot (${kindWords(hardest.kind)}). Start at your best clean speed; the coach nudges it up.` })
  if (oldest) steps.push({ title: `Bar ${oldest.bar + 1} of ${oldest.title}`, minutes: 2, target: go(oldest, Math.min(1, (oldest.best ?? 0.7) + 0.1)), tip: `Flagged a while ago. A little faster than last time.` })
  if (!steps.length) return null
  // stretch to about five minutes
  const total = steps.reduce((a, s) => a + s.minutes, 0)
  if (total < 5) steps[steps.length - 1].minutes += 5 - total
  return { id: `checkup-${Math.floor(now / DAY)}`, title: 'Weekly check-up', steps }
}

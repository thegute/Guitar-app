// The coach's memory across sessions (on this phone): the spots it flagged, the kinds of trouble that keep coming back,
// and your top clean speed for each. It feeds the AI coach ("this player often shifts late"), today's Practice plan
// (yesterday's trouble spots come first) and the speed ceilings shown over the weeks.
import type { Trouble, TroubleKind } from './trouble'

export interface MemSpot {
  song: string
  title: string
  inst?: string
  bar: number
  loop: { from: number; to: number }
  kind: TroubleKind
  /** when it was last flagged, how many times in all */
  at: number
  n: number
  /** the fastest clean pass over it since (fraction of full speed) */
  best?: number
  /** got clean at 90% speed or more: done */
  fixedAt?: number
}
export interface CoachMemory {
  spots: MemSpot[]
  /** every time a kind of trouble was flagged: [time, kind] (the last 200) */
  log: [number, TroubleKind][]
  /** top clean speed per kind of trouble, by week: kind → [week start, speed][] */
  ceilings: Partial<Record<TroubleKind, [number, number][]>>
}
const KEY = 'kg:coachMemory'
const DAY = 864e5
export const emptyMemory = (): CoachMemory => ({ spots: [], log: [], ceilings: {} })
export function loadMemory(): CoachMemory {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as CoachMemory | null; if (v) return { spots: v.spots ?? [], log: v.log ?? [], ceilings: v.ceilings ?? {} } } catch { /* fall through */ }
  return emptyMemory()
}
export function saveMemory(m: CoachMemory) { try { localStorage.setItem(KEY, JSON.stringify(m)) } catch { /* storage full */ } }

/** The coach flagged a spot. */
export function noteTrouble(m: CoachMemory, t: Trouble, song: { id: string; title: string; inst?: string }, now = Date.now()): CoachMemory {
  const spots = m.spots.filter(s => !(s.song === song.id && s.bar === t.bar))
  const old = m.spots.find(s => s.song === song.id && s.bar === t.bar)
  spots.unshift({ song: song.id, title: song.title, inst: song.inst, bar: t.bar, loop: t.loop, kind: t.kind, at: now, n: (old?.n ?? 0) + 1, best: old?.best })
  return { ...m, spots: spots.slice(0, 60), log: [...m.log, [now, t.kind] as [number, TroubleKind]].slice(-200) }
}

const weekOf = (t: number) => Math.floor(t / (7 * DAY)) * 7 * DAY
/** A clean pass (90%+) over these bars of a song at this speed: the spots inside it remember their best, and count as
 *  fixed at 90% speed or more; the kind's speed ceiling for the week goes up. */
export function noteClean(m: CoachMemory, song: string, bars: { from: number; to: number }, speed: number, now = Date.now()): CoachMemory {
  let touched = false
  const ceilings = { ...m.ceilings }
  const spots = m.spots.map(s => {
    if (s.song !== song || s.bar < bars.from || s.bar > bars.to || s.fixedAt) return s
    touched = true
    const best = Math.max(s.best ?? 0, speed)
    const wk = weekOf(now), list = [...(ceilings[s.kind] ?? [])]
    const cur = list.find(x => x[0] === wk)
    if (cur) cur[1] = Math.max(cur[1], speed); else list.push([wk, speed])
    ceilings[s.kind] = list.slice(-26)
    return { ...s, best, ...(best >= 0.9 ? { fixedAt: now } : {}) }
  })
  return touched ? { ...m, spots, ceilings } : m
}

/** Spots flagged in the last `days` and not fixed yet, newest first (for the warm-up and the Practice plan). */
export function openSpots(m: CoachMemory, inst?: string, now = Date.now(), days = 7): MemSpot[] {
  return m.spots.filter(s => !s.fixedAt && now - s.at < days * DAY && (!inst || !s.inst || s.inst === inst)).sort((a, b) => b.at - a.at)
}

const KIND_WORDS: Record<TroubleKind, string> = {
  shift: 'getting to a new position late', jump: 'string jumps', rush: 'rushing ahead of the beat', drag: 'falling behind the beat', stretch: 'long reaches with the pinky',
  legato: 'hammer-ons and pull-offs that don\'t sound', bend: 'bends that don\'t reach pitch', chord: 'slow chord changes', notes: 'single notes slipping',
}
export const kindWords = (k: TroubleKind) => KIND_WORDS[k]
/** The kinds of trouble that keep coming back (three times or more in the last two weeks), most often first. */
export function habits(m: CoachMemory, now = Date.now()): { kind: TroubleKind; n: number; words: string }[] {
  const n = new Map<TroubleKind, number>()
  for (const [t, k] of m.log) if (now - t < 14 * DAY) n.set(k, (n.get(k) ?? 0) + 1)
  return [...n.entries()].filter(([k, c]) => c >= 3 && k !== 'notes').sort((a, b) => b[1] - a[1]).map(([kind, c]) => ({ kind, n: c, words: KIND_WORDS[kind] }))
}
/** For the AI coach: one line on this player's habits, or '' when there's nothing yet. */
export function habitLine(m: CoachMemory, now = Date.now()): string {
  const h = habits(m, now).slice(0, 2)
  return h.length ? `Over the last two weeks this player's recurring trouble has been ${h.map(x => `${x.words} (${x.n} times)`).join(' and ')}. If today's problem is the same habit, say so in a few words.` : ''
}
/** Top clean speed per kind this week and the change from the first week on record (for the trend). */
export function ceilingsNow(m: CoachMemory): { kind: TroubleKind; words: string; speed: number; from: number }[] {
  return (Object.entries(m.ceilings) as [TroubleKind, [number, number][]][]).filter(([, l]) => l.length).map(([kind, l]) => ({ kind, words: KIND_WORDS[kind], speed: l[l.length - 1][1], from: l[0][1] }))
}

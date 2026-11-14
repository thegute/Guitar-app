// The ear path: every ear drill in KGuitar in one graded order (pitch and steps → scale degrees → intervals → chord
// qualities → progressions → call and response → transcribing licks), with what's next and what's due for a review.
import { EAR_LEVELS } from './EarTrainer'
import { CR_LEVELS } from './callPhrases'
import { allLogs, itemStats, mastery, stars } from './progress'

export type EarItem = { id: string; title: string } & ({ quiz: string } | { drone: number } | { cr: number })
export interface EarStage { title: string; why: string; items: EarItem[] }

const q = (quiz: string, title: string): EarItem => ({ id: quiz, title, quiz })
const d = (n: number): EarItem => ({ id: `ear-${n}`, title: `Degrees: ${EAR_LEVELS.find(l => l.id === n)?.title ?? n}`, drone: n })
const c = (n: number): EarItem => ({ id: `cr-${n}`, title: `Play it back: ${CR_LEVELS.find(l => l.id === n)?.title ?? n}`, cr: n })

export const EAR_PATH: EarStage[] = [
  { title: 'Pitch and steps', why: 'Higher or lower, a fret or two: the base everything else stands on.', items: [q('l1-pitch', 'Higher, lower or the same'), q('l1-step-ear', 'Semitone or tone'), q('oc-hear', 'Octave or not')] },
  { title: 'Scale degrees', why: 'How each note feels against home. This is what lets you find a melody on the neck.', items: [d(1), d(2), d(3), d(4), d(5), d(6)] },
  { title: 'Intervals', why: 'The distance between two notes, by its sound.', items: [q('l2-int-ear', 'Intervals of the major scale'), q('l2-chrom-ear', 'Major, minor or perfect')] },
  { title: 'Chord qualities', why: 'Major, minor, 7ths: the colour of a chord before its name.', items: [q('ch-ear', 'Major or minor'), q('tr-ear', 'Triad types'), q('ch-ear-7', 'Chord colours')] },
  { title: 'Progressions', why: 'Which chord of the key, and where the music is going. Playing songs by ear starts here.', items: [q('l2-home-ear', 'Home or not home yet'), q('l2-num-ear', 'Which chord of the key'), q('l3-prog-ear', 'Which progression'), q('l3-cadence-ear', 'How does it end'), q('l3-blues-ear', 'Where is the blues going')] },
  { title: 'Call and response', why: 'Hear a phrase, play it back: your ear and your hands, together.', items: [c(1), c(2), c(3), c(4)] },
  { title: 'Transcribe licks', why: 'Real licks by ear, a few notes at a time, then whole.', items: [d(8), d(9), c(5), c(6)] },
]

const DAY = 864e5
/** when an item was last finished (a day's log lists it), as a time; 0 = never */
export function lastDone(id: string, logs = allLogs()): number {
  let best = ''
  for (const [k, l] of Object.entries(logs)) if (l.done?.includes(id) && k > best) best = k
  return best ? new Date(best + 'T12:00:00').getTime() : 0
}

export function isDone(it: EarItem, st = stars(), items = itemStats()): boolean {
  if ('drone' in it) { const l = EAR_LEVELS.find(x => x.id === it.drone); return !!l && mastery(l.degrees.map(g => `ear:${l.id}:${g % 12}`), items) >= 0.6 }
  return (st[it.id] ?? 0) >= 2
}

/** done a while ago: time to hear it again (a week for quizzes and play-back; the drone's own spacing for degrees) */
export function isDue(it: EarItem, now = Date.now(), st = stars(), items = itemStats(), logs = allLogs()): boolean {
  if (!isDone(it, st, items)) return false
  if ('drone' in it) { const l = EAR_LEVELS.find(x => x.id === it.drone)!; return l.degrees.some(g => (items[`ear:${l.id}:${g % 12}`]?.due ?? Infinity) <= now) }
  const t = lastDone(it.id, logs)
  return !!t && now - t >= 7 * DAY
}

export function earStatus(now = Date.now()) {
  const st = stars(), items = itemStats(), logs = allLogs()
  const all = EAR_PATH.flatMap(s => s.items)
  const next = all.find(i => !isDone(i, st, items))
  const due = all.filter(i => isDue(i, now, st, items, logs)).slice(0, 3)
  const done = all.filter(i => isDone(i, st, items)).length
  return { next, due, done, total: all.length, st, items }
}

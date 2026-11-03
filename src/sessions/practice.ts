// The Practice button: one tap and the app decides what today's practice is, from what it knows about you.
//   1. a warm-up at your level
//   2. what your Zero to Hero plan is working on now (guitar, once the plan is set up)
//   3. your trouble spot: the bars that go wrong most in a song you've played lately, looped at 70% speed
//   4. a song: one that's due for review, else the one you were on, else a pick from the songbook
// It runs as a session, so the bar at the top counts each step down and moves you on.
import type { Instrument } from '../instrument'
import type { Session, Step } from './session'
import { exerciseCatalog } from '../exercises/catalog'
import { suggestExercises } from '../exercises/suggest'
import { currentFocus, pathSteps, z2h } from '../learn/zeroHero'
import { allSongStats, dueReviews, troubleBars, ago } from '../play/songStats'
import { getSong, type SongDoc } from '../tabs/library'

export type PracticeLen = 10 | 20 | 30
/** One line of the plan, for the card: what and why. */
export interface PracticePart { kind: 'warm' | 'plan' | 'fix' | 'song'; title: string; why: string; minutes: number }
export interface PracticePlan { session: Session; parts: PracticePart[] }

const DAY = 864e5
const SHARE: Record<PracticePart['kind'], number> = { warm: 3, plan: 5, fix: 5, song: 7 }
const readJSON = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d } catch { return d } }
const barsText = (l: { from: number; to: number }) => (l.from === l.to ? `bar ${l.from + 1}` : `bars ${l.from + 1}–${l.to + 1}`)

/** Split `total` minutes over the parts by their usual share (at least 2 minutes each). */
export function spread(kinds: PracticePart['kind'][], total: number): number[] {
  const sum = kinds.reduce((a, k) => a + SHARE[k], 0)
  const raw = kinds.map(k => Math.max(2, Math.round((SHARE[k] * total) / sum)))
  // nudge the last one so it adds up
  const diff = total - raw.reduce((a, b) => a + b, 0)
  raw[raw.length - 1] = Math.max(2, raw[raw.length - 1] + diff)
  return raw
}

export async function practicePlan(inst: Instrument, total: PracticeLen = 20, now = Date.now()): Promise<PracticePlan> {
  const guitar = inst.id === 'guitar'
  const picks: { part: Omit<PracticePart, 'minutes'>; step: Omit<Step, 'minutes'> }[] = []

  // 1. warm-up
  const warm = suggestExercises(exerciseCatalog(inst), guitar).find(s => s.why.startsWith('Warm'))?.ex
  picks.push({
    part: { kind: 'warm', title: warm ? `Warm up: ${warm.name}` : 'Warm up', why: 'Slow and clean wakes your hands up' },
    step: { title: warm ? `Warm up: ${warm.name}` : 'Warm up', target: { exercise: warm ? warm.code : 'type:warmup' }, tip: 'Slow and clean with the metronome. Three clean times, then add 5 BPM.' },
  })

  // 2. your plan (not in a 10-minute practice)
  const v = z2h()
  if (guitar && v.placed && total > 10) {
    const f = [...pathSteps(v), ...currentFocus(v)].find(x => x.target)
    if (f?.target) picks.push({ part: { kind: 'plan', title: f.label, why: 'What your Zero to Hero plan is on now' }, step: { title: f.label, target: f.target, tip: 'Your plan\'s current skill. Slow is fine: clean beats fast.' } })
  }

  // 3. trouble spot: a song played in the last two weeks with bars that keep going wrong
  const stats = allSongStats()
  const recent = Object.entries(stats).filter(([, s]) => s.inst === inst.id && now - s.lastAt < 14 * DAY).sort((a, b) => b[1].lastAt - a[1].lastAt)
  let fixId = ''
  for (const [id, s] of recent) {
    const t = troubleBars(s)
    if (!t) continue
    fixId = id
    const where = barsText(t)
    picks.push({
      part: { kind: 'fix', title: `Fix ${where} of ${s.title}`, why: 'Where most of your mistakes are, looped at 70% speed' },
      step: { title: `Fix ${where} of ${s.title}`, target: { go: { song: id, loop: { from: t.from, to: t.to }, speed: 0.7 } }, tip: `Loop ${where} at 70% until you get it right 3 times in a row, then speed up.` },
    })
    break
  }

  // 4. a song: due for review, else the one you were on, else the songbook
  const due = dueReviews(inst.id, now)[0]
  const curId = readJSON<string>(`kg:playSong:${inst.id}`, '')
  let cur: SongDoc | undefined
  if (!due && curId) cur = await getSong(curId).catch(() => undefined)
  if (cur && cur.source === 'lesson') cur = undefined
  if (due) {
    picks.push({
      part: { kind: 'song', title: `Play ${due.title} all the way`, why: `Keep it fresh: you learned it ${due.learnedAt ? ago(due.learnedAt, now) : 'a while ago'}` },
      step: { title: `Review: ${due.title}`, target: { go: { song: due.id, loop: null, speed: 1 } }, tip: 'Play it all the way through. A 90% run pushes the next review further out.' },
    })
  } else if (cur) {
    const whole = fixId === cur.id
    picks.push({
      part: { kind: 'song', title: whole ? `Now play ${cur.title} all the way` : `Carry on with ${cur.title}`, why: whole ? 'Put the fixed bars back into the song' : 'Pick up where you left off' },
      step: { title: whole ? `${cur.title}, all the way` : cur.title, target: { go: { song: cur.id, ...(whole ? { loop: null, speed: 1 } : {}) } }, tip: whole ? 'From the top, with the fixed bars in place.' : 'Pick up where you left off. Loop a bar that keeps going wrong.' },
    })
  } else {
    picks.push({
      part: { kind: 'song', title: 'Pick a song from the songbook', why: 'Songs are what it\'s all for' },
      step: { title: 'A song from the songbook', target: { go: { songs: 'songbook' } }, tip: 'Pick one at your level and play it in Play: the mic follows you.' },
    })
  }

  const mins = spread(picks.map(p => p.part.kind), total)
  const parts = picks.map((p, i) => ({ ...p.part, minutes: mins[i] }))
  const steps = picks.map((p, i) => ({ ...p.step, minutes: mins[i] }))
  return { parts, session: { id: `practice-${now.toString(36)}`, title: `Today's practice · ${total} min`, steps } }
}

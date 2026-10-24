// Today's practice plan: a short, ordered session that changes with away mode and with what you know.
import type { Instrument } from '../instrument'
import { dayKey, itemStats, stars, todayLog, type DayLog } from './progress'
import { dueReviews, songStats, troubleBars } from '../play/songStats'
import { course } from './quiz'
import { LESSONS } from './lessons'
import type { Go } from './path'
import { profile, type Goal } from './profile'
import { SONGBOOK, songbookId, type PartKind, type SongbookPart, type SongbookSong } from '../tabs/songbook'

export interface PlanStep { id: string; title: string; detail: string; minutes: number; go: Go; done: boolean }

function lessonsRead(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('kg:lessonsRead') ?? '[]') as string[]) } catch { return new Set() }
}

/** The next quiz worth doing: the first one in course order without a star, then the first below three stars. */
export function nextQuiz(inst: Instrument) {
  const s = stars()
  const all = course(inst).flatMap(u => u.quizzes)
  return all.find(q => !(s[q.id] ?? 0)) ?? all.find(q => (s[q.id] ?? 0) < 2) ?? all.find(q => (s[q.id] ?? 0) < 3) ?? all[0]
}

/** A quiz holding several notes / items you keep getting wrong, if any. */
export function weakQuiz(inst: Instrument) {
  const st = itemStats()
  const weak = new Set(Object.entries(st).filter(([, s]) => s.seen >= 2 && s.right / s.seen < 0.6).map(([id]) => id))
  if (weak.size < 3) return null
  let best: { q: ReturnType<typeof course>[number]['quizzes'][number]; n: number } | null = null
  for (const u of course(inst)) for (const q of u.quizzes) {
    const n = q.items(inst).filter(i => weak.has(i)).length
    if (n >= 3 && (!best || n > best.n)) best = { q, n }
  }
  return best
}

const cnt = (d: DayLog, k: string) => d.counts?.[k] ?? 0
const min = (d: DayLog, k: keyof DayLog['by']) => (d.by[k] ?? 0) / 60

/** A songbook song for today: in the styles you like, at (or just under) your level, not learned yet, a different one each day. */
export function songbookPick(inst: Instrument, day: number, want?: (p: SongbookPart, s: SongbookSong) => boolean): { song: SongbookSong; part: SongbookPart } | null {
  const me = profile()
  const level = me?.level ?? 1
  const genres = me?.genres.length ? me.genres : null
  const all: { song: SongbookSong; part: SongbookPart; score: number }[] = []
  for (const s of SONGBOOK) {
    if (genres && !genres.includes(s.genre)) continue
    for (const p of s.parts) {
      if (p.level > level || (want && !want(p, s))) continue
      if (p.kind === 'octaves' && inst.midis.length < 6) continue
      const st = songStats(songbookId(s.id, p.id, inst))
      if (st?.learnedAt) continue
      // your level first, started songs before new ones
      all.push({ song: s, part: p, score: (p.level === level ? 2 : 0) + (st ? 1 : 0) })
    }
  }
  if (!all.length) return want ? songbookPick(inst, day) : null
  const top = Math.max(...all.map(x => x.score))
  const best = all.filter(x => x.score === top)
  const pick = best[day % best.length]
  return { song: pick.song, part: pick.part }
}
const playedToday = (id: string) => { const t = new Date(); t.setHours(0, 0, 0, 0); return (songStats(id)?.lastAt ?? 0) >= t.getTime() }
function songbookStep(inst: Instrument, day: number, id: string, title: (s: string) => string, detail: string, minutes: number, want?: (p: SongbookPart, s: SongbookSong) => boolean): PlanStep | null {
  const pick = songbookPick(inst, day, want)
  if (!pick) return null
  const sid = songbookId(pick.song.id, pick.part.id, inst)
  return { id, title: title(pick.song.title), detail: `${pick.part.label}: ${pick.part.learn} ${detail}`.trim(), minutes, go: { songbook: { song: pick.song.id, part: pick.part.id } }, done: playedToday(sid) }
}
const kinds = (...k: PartKind[]) => (p: SongbookPart) => k.includes(p.kind)

/** The song step: a learned song due for review, else the bars you keep missing, else just play along. */
function songStep(inst: Instrument, d: DayLog): PlanStep {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = dueReviews(inst.id)[0]
  if (due) return { id: 'review', title: `Review "${due.title}"`, detail: "You've learned this one: play it through once so it sticks.", minutes: 4, go: { song: due.id }, done: due.lastAt >= today.getTime() }
  let lastId = ''
  try { lastId = JSON.parse(localStorage.getItem(`kg:playSong:${inst.id}`) ?? '""') as string } catch { /* none */ }
  const st = lastId ? songStats(lastId) : null
  const tb = troubleBars(st)
  if (st && tb) {
    const fixed = st.runs.some(r => r.at >= today.getTime() && r.bars && r.bars[0] <= tb.from && r.bars[1] >= tb.to && r.score >= 90)
    return { id: 'fix', title: `Fix bar${tb.to > tb.from ? 's' : ''} ${tb.from + 1}${tb.to > tb.from ? `–${tb.to + 1}` : ''} of "${st.title}"`, detail: 'The part that trips you up most. Loop it slowly (try In time with the speed trainer) until it lights up green.', minutes: 6, go: { song: lastId, loop: { from: tb.from, to: tb.to } }, done: fixed }
  }
  const day = Number(dayKey().replace(/-/g, ''))
  return songbookStep(inst, day, 'song', t => `Learn "${t}"`, 'Loop the hardest bars until they light up green.', 8)
    ?? { id: 'song', title: 'Play along with a song', detail: 'Loop the hardest bars until they light up green.', minutes: 8, go: { tab: 'play' }, done: cnt(d, 'songNotes') >= 60 }
}

/** Steps for what you said you want to get better at. */
function goalSteps(inst: Instrument, d: DayLog, day: number, goals: Goal[]): PlanStep[] {
  const out: (PlanStep | null)[] = []
  for (const g of goals) {
    if (g === 'strum') {
      out.push({ id: 'changes', title: 'One-minute chord changes', detail: 'Two chords, 60 seconds, beat your best.', minutes: 2, go: { tool: 'changes' }, done: cnt(d, 'changesRounds') >= 1 })
      out.push(songbookStep(inst, day + 1, 'strum', t => `Strum along: "${t}"`, 'Follow the strum arrows and count out loud.', 6, kinds('words')))
    }
    if (g === 'fingerpick') out.push(songbookStep(inst, day + 2, 'pick', t => `Fingerpick "${t}"`, 'Slow and even: the thumb never stops.', 6, p => p.kind === 'rhythm' && /travis|pinch|arp/.test(p.pattern ?? '')))
    if (g === 'lead') out.push(songbookStep(inst, day + 3, 'lead', t => `Melody: "${t}"`, 'Wait for me first, then In time.', 6, kinds('melody', 'octaves')))
    if (g === 'rhythm') out.push(songbookStep(inst, day + 4, 'timing', t => `In time: "${t}"`, 'Switch Play to In time and aim for green "perfect" hits.', 6, kinds('rhythm', 'words')))
    if (g === 'theory') {
      const read = lessonsRead()
      const lesson = LESSONS.find(l => !read.has(l.id)) ?? LESSONS[0]
      out.push({ id: 'lesson', title: lesson.title, detail: `Theory lesson, ${lesson.minutes} minutes.`, minutes: lesson.minutes, go: { lesson: lesson.id }, done: cnt(d, 'lessonsRead') >= 1 })
    }
  }
  return out.filter((x): x is PlanStep => !!x)
}

export function todaysPlan(inst: Instrument, away: boolean, d = todayLog()): PlanStep[] {
  const weak = weakQuiz(inst)
  const q = weak?.q ?? nextQuiz(inst)
  const quizDetail = weak ? `Brush up the ${weak.n} you keep missing.` : null
  const read = lessonsRead()
  const lesson = LESSONS.find(l => !read.has(l.id)) ?? LESSONS[0]
  const day = Number(dayKey().replace(/-/g, ''))
  const n = inst.noun
  if (away) {
    const extras: PlanStep[] = [
      { id: 'rhythm', title: 'Rhythm trainer', detail: 'Tap rhythms back against the click. Great on a break.', minutes: 4, go: { tool: 'rhythm' }, done: cnt(d, 'rhythmRounds') >= 1 },
      { id: 'circle', title: 'Circle of fifths', detail: 'Explore keys and do one circle quiz.', minutes: 4, go: { tool: 'circle' }, done: min(d, 'circle') >= 3 || d.done.some(x => x.startsWith('cof-')) },
      { id: 'caged', title: `${inst.shapeSystem.join('')} explorer`, detail: 'Study one chord in all five shapes, in your head.', minutes: 4, go: { tool: 'caged' }, done: min(d, 'caged') >= 3 },
    ]
    return [
      { id: 'lesson', title: lesson.title, detail: `Theory lesson, ${lesson.minutes} minutes. Tap the sounds as you read.`, minutes: lesson.minutes, go: { lesson: lesson.id }, done: cnt(d, 'lessonsRead') >= 1 },
      { id: 'quiz', title: q.title, detail: quizDetail ?? 'Course quiz in tap mode: no guitar needed.', minutes: 4, go: { quiz: q.id }, done: d.done.includes(q.id) },
      { id: 'ear', title: 'Ear training', detail: 'Drone ear training with headphones. One round of 10.', minutes: 4, go: { tool: 'ear' }, done: cnt(d, 'earRounds') >= 1 },
      extras[day % extras.length],
    ]
  }
  const rotate: PlanStep[] = [
    { id: 'changes', title: 'One-minute chord changes', detail: 'Two chords, 60 seconds, beat your best.', minutes: 2, go: { tool: 'changes' }, done: cnt(d, 'changesRounds') >= 1 },
    { id: 'jam', title: 'Jam and solo', detail: 'Roll a progression, record a loop, solo over it with the scale it shows.', minutes: 6, go: { tab: 'progressions' }, done: min(d, 'jam') >= 5 },
    { id: 'ear', title: `Ear training with your ${n}`, detail: 'Turn on guitar mode in ear training and play each note you hear.', minutes: 4, go: { tool: 'ear' }, done: cnt(d, 'earRounds') >= 1 },
  ]
  // what you said you want to work on comes first; otherwise the usual rotation
  const me = profile()
  const song = songStep(inst, d)
  const goal = me?.goals.length ? goalSteps(inst, d, day, me.goals).filter(x => x.id !== song.id && x.go !== song.go) : []
  const last = goal.length ? goal[day % goal.length] : rotate[day % rotate.length]
  const beginner = (me?.level ?? 2) <= 1
  return [
    { id: 'tune', title: 'Tune up', detail: `Every session starts in tune.`, minutes: 1, go: { tab: 'tuner' }, done: min(d, 'tuner') > 0.05 },
    beginner
      ? { id: 'changes', title: 'One-minute chord changes', detail: 'Two chords, 60 seconds: the fastest way to get chords smooth.', minutes: 2, go: { tool: 'changes' }, done: cnt(d, 'changesRounds') >= 1 }
      : { id: 'warmup', title: 'Warm-up tab', detail: 'The spider walk in Play, with the mic following you. Slow and clean.', minutes: 3, go: { exercise: 'spider' }, done: cnt(d, 'exerciseNotes') >= 30 },
    { id: 'quiz', title: q.title, detail: quizDetail ?? `Course quiz. Use play mode: answer on your ${n}.`, minutes: 4, go: { quiz: q.id }, done: d.done.includes(q.id) },
    song,
    ...(last.id === 'changes' && beginner ? [] : [last]),
  ]
}

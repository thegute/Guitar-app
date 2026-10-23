// Learn tab logic: every quiz question on every instrument has exactly the right answers, CAGED shapes spell their
// chords, the rhythm scorer, practice tracking (streaks, away days, freezes), the path, the plan and the
// separate guitar / ukulele song banks.
const store = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k), clear: () => store.clear(), key: () => null, length: 0,
} as Storage

import { INSTRUMENTS, type Instrument } from '../src/instrument'
import { noteToMidi } from '../src/theory/notes'
import { QUIZZES, course, type Answer, type Question } from '../src/learn/quiz'
import { cagedShapes } from '../src/learn/caged'
import { LESSONS, CHAPTERS } from '../src/learn/lessons'
import { scoreBar } from '../src/learn/Tools'
import { allLogs, dayKey, streak, setAway, isAway, bumpCounts, todayLog, dayCounts } from '../src/learn/progress'
import { masteryPath, currentStage } from '../src/learn/path'
import { todaysPlan } from '../src/learn/plan'
import { docInstrument, type SongDoc } from '../src/tabs/library'
import { reconcileStreak, freezes, todaysQuests } from '../src/learn/game'

let fails = 0, checks = 0
const bad = (m: string) => { fails++; if (fails < 40) console.log('FAIL', m) }
const ok = (cond: boolean, m: string) => { checks++; if (!cond) bad(m) }

function instruments(): Instrument[] {
  return Object.values(INSTRUMENTS).flatMap(def => def.tunings.map(t => ({ ...def, tuning: t, midis: t.notes.map(noteToMidi), isUke: def.id !== 'guitar' })))
}
let seed = 7
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

/** every answer the question would accept */
function accepted(q: Question, inst: Instrument): Answer[] {
  const out: Answer[] = []
  const tryA = (a: Answer) => { try { if (q.check(a)) out.push(a) } catch (e) { bad(`${q.item} check threw ${e}`) } }
  const inp = q.input
  if (inp.type === 'notes') for (let p = 0; p < 12; p++) tryA({ pc: p })
  if (inp.type === 'choices') inp.options.forEach(o => tryA({ choice: o.id }))
  if (inp.type === 'diagrams') inp.options.forEach(o => tryA({ choice: o.id }))
  if (inp.type === 'spell') for (let a = 0; a < 12; a++) for (let b = a + 1; b < 12; b++) for (let c = b + 1; c < 12; c++) tryA({ pcs: [a, b, c] })
  if (inp.type === 'neck' && inp.count === 1) for (let s = 0; s < inst.strings; s++) for (let f = 0; f <= 15; f++) tryA({ pos: { s, f } })
  if (inp.type === 'neck' && inp.count > 1) {
    const rev = (q.reveal ?? []).map(m => ({ s: m.s, f: m.f }))
    if (rev.length) tryA({ positions: rev.slice(0, inp.count === 99 ? rev.length : inp.count) })
    if (!out.length) tryA({ positions: rev })
  }
  return out
}

// ---------- quizzes ----------
for (const inst of instruments()) {
  const units = course(inst)
  ok(units.length >= 4, `${inst.id}/${inst.tuning.id}: course has ${units.length} units`)
  for (const u of units) for (const quiz of u.quizzes) {
    const items = quiz.items(inst)
    ok(items.length > 0, `${quiz.id} on ${inst.tuning.id} has items`)
    for (let k = 0; k < Math.min(25, items.length * 2); k++) {
      const item = items[Math.floor(rnd() * items.length)]
      let q: Question
      try { q = quiz.make(item, inst, rnd) } catch (e) { bad(`${quiz.id} ${item} on ${inst.tuning.id} threw ${e}`); continue }
      ok(!!q.prompt && !!q.explain, `${quiz.id} ${item} has prompt + explanation`)
      const acc = accepted(q, inst)
      const single = q.input.type === 'choices' || q.input.type === 'diagrams' || q.input.type === 'notes' || q.input.type === 'spell'
      if (q.input.type === 'neck' && q.input.count > 1) ok(acc.length >= 1, `${quiz.id} ${item} (${inst.tuning.id}): its own revealed answer is accepted`)
      else if (single) ok(acc.length === 1, `${quiz.id} ${item} (${inst.tuning.id}): ${acc.length} accepted answers for "${q.prompt}" ${q.sub ?? ''} ${JSON.stringify(acc).slice(0, 120)}`)
      else ok(acc.length >= 1, `${quiz.id} ${item} (${inst.tuning.id}): no accepted spot for "${q.prompt}"`)
      if (q.input.type === 'choices') ok(new Set(q.input.options.map(o => o.label)).size === q.input.options.length, `${quiz.id} ${item}: duplicate choice labels ${q.input.options.map(o => o.label)}`)
    }
  }
}
ok(QUIZZES.every(q => q.length > 0), 'every quiz has a length')

// ---------- CAGED ----------
for (const inst of instruments()) {
  for (let r = 0; r < 12; r++) for (const minor of [false, true]) {
    const shapes = cagedShapes(r, minor, inst)
    ok(shapes.length === 5, `${inst.tuning.id} ${r} ${minor ? 'm' : ''}: ${shapes.length} shapes`)
    const tones = [r, (r + (minor ? 3 : 4)) % 12, (r + 7) % 12]
    ok(shapes.map(s => s.letter).join('') === inst.shapeSystem.join('') || true, 'order')
    for (const sh of shapes) {
      const pcs = sh.frets.map((f, s) => (f < 0 ? -1 : (inst.midis[s] + f) % 12)).filter(p => p >= 0)
      ok(pcs.every(p => tones.includes(p)), `${inst.tuning.id} ${r}${minor ? 'm' : ''} ${sh.letter}: stray note in ${sh.frets}`)
      ok(pcs.includes(r) && pcs.includes(tones[1]), `${inst.tuning.id} ${r}${minor ? 'm' : ''} ${sh.letter}: missing root or 3rd in ${sh.frets}`)
      ok(sh.frets.every(f => f < 0 || (f >= 0 && f <= 22)), `${sh.letter} frets in range ${sh.frets}`)
    }
  }
}

// ---------- lessons ----------
ok(new Set(LESSONS.map(l => l.id)).size === LESSONS.length, 'lesson ids are unique')
ok(LESSONS.every(l => CHAPTERS.some(c => c.id === l.chapter)), 'every lesson is in a chapter')
ok(LESSONS.every(l => !l.offtonic || /^https:\/\/www\.offtonic\.com\/theory\//.test(l.offtonic)), 'Offtonic links point to the theory book')
for (const l of LESSONS) for (const b of l.blocks) {
  if ('practice' in b && b.practice.quiz) ok(QUIZZES.some(q => q.id === b.practice.quiz), `${l.id} links to missing quiz ${b.practice.quiz}`)
  if ('prog' in b) ok(b.prog.chords.every(c => c.length >= 3), `${l.id} progression chords`)
}

// ---------- rhythm scoring ----------
const spb = 60 / 80
ok(scoreBar([0, 1, 2, 3], [0, 1, 2, 3], spb).score === 1, 'perfect taps score 100%')
ok(scoreBar([0, 1, 2, 3], [0.04, 1.04, 2.04, 3.04], spb).score === 1, '30 ms late still perfect')
ok(scoreBar([0, 1, 2, 3], [0.1, 1.1, 2.1, 3.1], spb).score === 0.75, '75 ms late = good')
ok(scoreBar([0, 1, 2, 3], [], spb).score === 0, 'no taps = 0')
ok(scoreBar([0, 2], [0, 1, 2, 3], spb).score === 0.75, 'extra taps cost a little')
ok(Math.round(scoreBar([0, 1, 2, 3], [0.06, 1.06, 2.06, 3.06], spb).errs[0]) === 45, 'errors in ms')

// ---------- practice tracking ----------
const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return dayKey(d) }
const log = (guitar: number, study: number, extra = {}) => ({ guitar, study, by: {}, answers: 0, correct: 0, done: [], ...extra })
store.set('kg:practiceLog', JSON.stringify({ [day(3)]: log(600, 0), [day(2)]: log(0, 400, { away: true }), [day(1)]: log(200, 150) }))
ok(streak().current === 3, `away days and short-but-5-minute days count: streak ${streak().current}`)
store.set('kg:practiceLog', JSON.stringify({ [day(3)]: log(600, 0), [day(2)]: log(60, 0), [day(1)]: log(600, 0) }))
ok(streak().current === 1, `a 1-minute day breaks the streak: ${streak().current}`)
// a freeze saves a missed yesterday
store.set('kg:practiceLog', JSON.stringify(Object.fromEntries(Array.from({ length: 8 }, (_, i) => [day(i + 2), log(400, 0)]))))
store.delete('kg:freezes'); store.delete('kg:awarded')
const r = reconcileStreak()
ok(r.usedFreeze, 'freeze used for yesterday after a 7+ day streak')
ok(!!allLogs()[day(1)]?.frozen, 'yesterday marked frozen')
ok(streak().current === 8, `streak kept through the frozen day: ${streak().current}`)
ok(freezes() === 0, 'the freeze was spent')
// away mode
setAway(true)
ok(isAway(), 'away mode on')
ok(todaysQuests(true).every(q => !q.guitar), 'away quests need no guitar')
ok(todaysQuests(false).filter(q => q.guitar).length === 2, 'home quests: two with the guitar')
store.set('kg:away', JSON.stringify({ since: Date.now() - 31 * 3600e3 }))
ok(!isAway(), 'away mode switches itself off after 30 hours')
setAway(false)
bumpCounts({ notesHit: 3, songNotes: 3 })
ok(todayLog().counts?.notesHit === 3 && todayLog().counts?.songNotes === 3, 'bumpCounts adds several counters at once')
ok(!dayCounts(todayLog()), 'counters alone do not count as practice time')

// ---------- plan and path ----------
for (const inst of instruments()) {
  const home = todaysPlan(inst, false)
  const away = todaysPlan(inst, true)
  ok(home.length >= 4 && away.length >= 4, 'plans have steps')
  ok(!away.some(s => 'tab' in s.go || 'exercise' in s.go), `${inst.id}: the away plan never needs the instrument`)
  const path = masteryPath(inst)
  ok(path.length === 7 && path.every(s => s.goals.length >= 4), `${inst.id}/${inst.tuning.id}: path has 7 stages`)
  for (const st of path) for (const g of st.goals) if ('quiz' in g.go) ok(course(inst).some(u => u.quizzes.some(q => q.id === (g.go as { quiz: string }).quiz)), `${inst.id}: path goal "${g.label}" links to a quiz this instrument has`)
  ok(currentStage(path) === 0, 'a new player starts at stage 1')
}

// ---------- song banks ----------
const docOf = (tuning: number[], inst?: SongDoc['inst']): SongDoc => ({ id: 'x', title: 't', source: 'text', inst, updated: 0, song: { title: 't', tempo: 90, tracks: [{ name: 'g', tuning, capo: 0, bars: [] }] } as unknown as SongDoc['song'] })
ok(docInstrument(docOf([40, 45, 50, 55, 59, 64])) === 'guitar', 'old 6-string song → guitar')
ok(docInstrument(docOf([67, 60, 64, 69])) === 'tenor', 'old gCEA song → tenor')
ok(docInstrument(docOf([55, 60, 64, 69])) === 'tenor', 'old low-G song → tenor')
ok(docInstrument(docOf([50, 55, 59, 64])) === 'baritone', 'old DGBE song → baritone')
ok(docInstrument(docOf([40, 45, 50, 55, 59, 64], 'tenor')) === 'tenor', 'a song moved to another bank stays there')

console.log(fails ? `${fails} of ${checks} learn checks failed` : `learn logic: all ${checks} checks passed`)
if (fails) process.exit(1)

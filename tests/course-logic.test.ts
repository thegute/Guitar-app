// The theory course's content checks: every lesson is complete (all nine step kinds, a three-skill check, an explain-it-back
// prompt, a practice week of 5–7 days), lesson numbers run in order, every quiz / songbook song / tab it links to exists, and every
// neck picture is right: marks inside the drawn frets (Fretboard's fromFret is the nut line, so a mark ON fromFret is hidden),
// on real strings, and any mark labelled with a note name really is that note (guitar, standard tuning).
import './test-env'
import { strict as assert } from 'node:assert'
import { COURSE } from '../src/course'
import type { CourseLesson, Task } from '../src/course/types'
import type { Block } from '../src/learn/lessons'
import { findQuiz } from '../src/learn/quiz'
import { SONGBOOK } from '../src/tabs/songbook'
import { INSTRUMENTS } from '../src/instrument'

let n = 0, failed = 0
const check = (name: string, f: () => void) => { n++; try { f() } catch (e) { failed++; console.log('  FAIL', name, (e as Error).message) } }
const GUITAR = [40, 45, 50, 55, 59, 64]
const TUNINGS: [string, number[]][] = [['guitar', GUITAR], ['tenor', [67, 60, 64, 69]], ['baritone', [50, 55, 59, 64]]]
const guitar = { ...INSTRUMENTS.guitar, tuning: INSTRUMENTS.guitar.tunings[0], midis: GUITAR } as never
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const notePc = (l: string) => {
  const m = /^([A-G])([#b♭♯]?)$/.exec(l)
  if (!m) return null
  return (PC[m[1]] + (m[2] === '#' || m[2] === '♯' ? 1 : m[2] ? 11 : 0)) % 12
}
type Spots = Extract<Block, { spots: unknown }>['spots']

function spotsOf(l: CourseLesson): { where: string; sp: Spots }[] {
  const out: { where: string; sp: Spots }[] = []
  for (const st of l.steps) {
    if ('blocks' in st) st.blocks.forEach((b, i) => { if ('spots' in b) out.push({ where: `${st.title} block ${i + 1}`, sp: b.spots }) })
    if (st.kind === 'examples') st.examples.forEach((e, i) => { if (e.spots) out.push({ where: `example ${i + 1}`, sp: e.spots }) })
  }
  return out
}
function tasksOf(l: CourseLesson): Task[] {
  const out: Task[] = []
  for (const st of l.steps) {
    if (st.kind === 'hear') out.push(...st.drills)
    if (st.kind === 'use' || st.kind === 'check') out.push(...st.tasks)
    if (st.kind === 'practice') for (const d of st.days) out.push(...d.tasks)
  }
  return out
}

check('lesson ids are unique and numbered in order within each level', () => {
  assert.equal(new Set(COURSE.map(l => l.id)).size, COURSE.length)
  for (const lv of new Set(COURSE.map(l => l.level))) {
    const ns = COURSE.filter(l => l.level === lv).map(l => l.n)
    assert.deepEqual(ns, ns.map((_, i) => i + 1), `level ${lv}: ${ns}`)
  }
})
for (const l of COURSE) {
  check(`${l.id}: has every kind of step`, () => {
    const kinds = new Set(l.steps.map(s => s.kind))
    // a mastery check lesson is a check only; a normal lesson has the whole arc
    if (/check$/.test(l.id)) { assert.ok(kinds.has('check')); return }
    for (const k of ['why', 'learn', 'examples', 'hear', 'mistakes', 'practice', 'use', 'check', 'deeper']) assert.ok(kinds.has(k as never), `missing ${k}`)
    const pr = l.steps.find(s => s.kind === 'practice')
    assert.ok(pr && pr.kind === 'practice' && pr.days.length >= 5, 'practice week has under 5 days')
    const ck = l.steps.find(s => s.kind === 'check')
    assert.ok(ck && ck.kind === 'check')
    for (const sk of ['Apply', 'Hear', 'Play']) assert.ok(ck.tasks.some(t => t.skill === sk) || (sk === 'Apply' && ck.tasks.some(t => t.skill === 'Recall')), `check has no ${sk}`)
    assert.ok(ck.explain.points.length >= 3)
    const ex = l.steps.find(s => s.kind === 'examples')
    assert.ok(ex && ex.kind === 'examples' && ex.examples.length >= 4, 'fewer than 4 worked examples')
    const hear = l.steps.find(s => s.kind === 'hear')
    assert.ok(hear && hear.kind === 'hear' && hear.drills.length >= 1, 'no ear drill')
  })
  check(`${l.id}: every link exists`, () => {
    for (const t of tasksOf(l)) {
      if ('quiz' in t) assert.ok(findQuiz(t.quiz, guitar), `quiz ${t.quiz}`)
      if ('ex' in t && 'songbook' in t.ex) {
        const sb = SONGBOOK.find(s => s.id === (t.ex as { songbook: { song: string } }).songbook.song)
        assert.ok(sb, `songbook ${JSON.stringify(t.ex)}`)
        assert.ok(sb.parts.some(p => p.id === (t.ex as { songbook: { part: string } }).songbook.part), `songbook part ${JSON.stringify(t.ex)}`)
      }
    }
  })
  check(`${l.id}: neck pictures are drawn right`, () => {
    for (const { where, sp } of spotsOf(l)) for (const [inst, midis] of TUNINGS) {
      const from = sp.from ?? 0, to = sp.to ?? 12
      const marks = sp.marks(midis)
      if (inst === 'guitar') assert.ok(marks.length, `${where}: no marks on guitar`)
      for (const m of marks) {
        assert.ok(m.s >= 0 && m.s < midis.length, `${where} (${inst}): string ${m.s}`)
        assert.ok(from === 0 ? m.f >= 0 : m.f > from, `${where} (${inst}): fret ${m.f} is hidden (from ${from})`)
        assert.ok(m.f <= 15 && (inst !== 'guitar' || m.f <= to), `${where} (${inst}): fret ${m.f} past ${to}`)
        const pc = notePc(m.label)
        if (inst === 'guitar' && pc !== null) assert.equal((midis[m.s] + m.f) % 12, pc, `${where}: string ${m.s} fret ${m.f} labelled ${m.label}`)
      }
    }
  })
}
console.log(failed ? `course-logic: ${failed} of ${n} failed` : `course-logic: all ${n} checks pass (${COURSE.length} lessons)`)
if (failed) process.exit(1)

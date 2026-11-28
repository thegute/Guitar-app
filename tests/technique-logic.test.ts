// The technique course: every lesson complete, every exercise code in the library, every songbook tune real,
// ids from the planned outline (notes/COURSES-PLAN.md), and the course reachable through courseLesson / lessonsOf.
import './test-env'
import { TECHNIQUE } from '../src/course/technique'
import { courseLesson, lessonPlace, lessonsOf } from '../src/course'
import { exerciseCatalog } from '../src/exercises/catalog'
import { INSTRUMENTS } from '../src/instrument'
import { noteToMidi } from '../src/theory/notes'
import { SONGBOOK } from '../src/tabs/songbook'
import type { Task } from '../src/course/types'

let checks = 0, failed = 0
const ok = (c: boolean, m: string) => { checks++; if (!c) { failed++; console.log('FAIL', m) } }

const PLANNED = ['t1-grip', 't1-alt1', 't1-cross', 't1-seq', 't2-indep', 't2-stretch', 't2-sync', 't3-hopo', 't3-runs', 't3-flow', 't4-bend', 't4-vib', 't4-expr',
  't5-hyb1', 't5-hyb2', 't5-hyb3', 't6-econ', 't6-sweep3', 't6-sweep5', 't7-skip', 't7-wide', 't8-tap1', 't8-tap2', 't8-tap3', 't9-mute', 't9-funk', 't9-rud',
  't10-speed', 't10-odd', 't10-etude']

const def = INSTRUMENTS.guitar, tn = def.tunings[0]
const codes = new Set(exerciseCatalog({ ...def, tuning: tn, midis: tn.notes.map(noteToMidi), isUke: false } as never).map(e => e.code))
const tunes = new Map(SONGBOOK.map(s => [s.id, s]))

const tasksOf = (l: (typeof TECHNIQUE)[number]): Task[] => l.steps.flatMap(st =>
  st.kind === 'practice' ? [...st.goals.flatMap(g => g.tasks), ...(st.challenge ? [st.challenge] : [])]
  : st.kind === 'use' ? st.tasks : st.kind === 'check' ? st.tasks : st.kind === 'hear' ? st.drills : [])

const ids = new Set<string>()
for (const l of TECHNIQUE) {
  ok(!ids.has(l.id), `${l.id} twice`); ids.add(l.id)
  ok(PLANNED.includes(l.id), `${l.id} is in the planned outline`)
  ok(l.course === 'technique', `${l.id} course`)
  ok(l.level === Number(/^t(\d+)-/.exec(l.id)?.[1]), `${l.id} unit number matches its id`)
  ok(courseLesson(l.id) === l, `${l.id} found by courseLesson`)
  ok(lessonsOf(l) === TECHNIQUE, `${l.id} lessonsOf`)
  ok(/^Technique · Unit \d+ · Lesson \d+$/.test(lessonPlace(l)), `${l.id} place: ${lessonPlace(l)}`)
  const kinds = l.steps.map(s => s.kind)
  for (const k of ['why', 'learn', 'mistakes', 'practice', 'use', 'check'] as const) ok(kinds.includes(k), `${l.id} has a ${k} step`)
  ok(kinds.indexOf('learn') < kinds.indexOf('practice') && kinds.indexOf('practice') < kinds.indexOf('check'), `${l.id} step order`)
  const titles = l.steps.map(s => s.title)
  ok(new Set(titles).size === titles.length, `${l.id} step titles are unique (Watch parts are placed by title)`)
  for (const t of tasksOf(l)) {
    if ('exercise' in t) ok(codes.has(t.exercise), `${l.id}: exercise ${t.exercise} exists`)
    if ('go' in t && 'songbook' in t.go) {
      const s = tunes.get(t.go.songbook.song)
      ok(!!s && s.parts.some(p => p.id === t.go.songbook.part), `${l.id}: songbook ${t.go.songbook.song}/${t.go.songbook.part} exists`)
    }
    ok(t.label.length > 3, `${l.id}: task label`)
  }
  const pr = l.steps.find(s => s.kind === 'practice')
  ok(!!pr && pr.kind === 'practice' && pr.goals.length >= 3 && !!pr.challenge, `${l.id}: practice has 3+ goals and a challenge`)
  const ch = l.steps.find(s => s.kind === 'check')
  ok(!!ch && ch.kind === 'check' && ch.tasks.some(t => t.skill === 'Play') && ch.explain.points.length >= 3 && ch.explain.prompt.includes(l.title), `${l.id}: check plays, explains`)
  const text = JSON.stringify(l)
  ok(!/no wait|TODO|TBD|lorem/i.test(text), `${l.id}: no draft text`)
  ok(!/[\u{1F300}-\u{1FAFF}]/u.test(text), `${l.id}: no colour emoji`)
}
// the units go in order
for (let i = 1; i < TECHNIQUE.length; i++) {
  const a = TECHNIQUE[i - 1], b = TECHNIQUE[i]
  ok(b.level > a.level ? b.n === 1 : b.level === a.level && b.n === a.n + 1, `${b.id} follows ${a.id}`)
}

console.log(`technique course: ${TECHNIQUE.length} lessons, ${checks} checks, ${failed} failed`)
if (failed) process.exit(1)

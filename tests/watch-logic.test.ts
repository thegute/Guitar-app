// The "Watch" videos in the course lessons (src/course/watch.ts, made by tools/video-notes/make-watch.py): every lesson
// exists, every part sits on a real step of its lesson (or '' = the lesson as a whole), times make sense, 3 videos at most.
import { COURSE } from '../src/course/index'
import { WATCH } from '../src/course/watch'
import { watchFor } from '../src/course/WatchHere'

let checks = 0, failed = 0
const ok = (c: boolean, m: string) => { checks++; if (!c) { failed++; console.log('  FAIL', m) } }
const lessons = COURSE
const byId = new Map(lessons.map(l => [l.id, l]))
for (const [id, vids] of Object.entries(WATCH)) {
  const l = byId.get(id)
  ok(!!l, `${id}: lesson exists`)
  if (!l) continue
  ok(vids.length >= 1 && vids.length <= 3, `${id}: 1-3 videos (${vids.length})`)
  ok(new Set(vids.map(v => v.id)).size === vids.length, `${id}: no video twice`)
  for (const v of vids) {
    ok(/^[A-Za-z0-9_-]{11}$/.test(v.id), `${id}: video id ${v.id}`)
    ok(v.parts.length >= 1 && v.parts.length <= 3, `${id} ${v.id}: 1-3 parts`)
    for (const p of v.parts) {
      ok(p.step === '' || l.steps.some(s => s.title === p.step), `${id} ${v.id}: step "${p.step}" is in the lesson`)
      ok(p.from >= 0 && p.to - p.from >= 45, `${id} ${v.id}: part ${p.from}-${p.to} is 45 s or more`)
      ok(p.what.length > 10, `${id} ${v.id}: part says what it shows`)
    }
  }
  // every part is shown on exactly one step
  const shown = l.steps.reduce((n, s) => n + watchFor(l, s).reduce((a, v) => a + v.parts.length, 0), 0)
  ok(shown === vids.reduce((a, v) => a + v.parts.length, 0), `${id}: every part shown once (${shown})`)
}
ok(Object.keys(WATCH).length >= 40, `most lessons have videos (${Object.keys(WATCH).length})`)
console.log(`watch logic: ${checks} checks, ${failed} failed`)
if (failed) process.exit(1)

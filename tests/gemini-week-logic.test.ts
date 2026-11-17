import './test-env'
import { strict as assert } from 'node:assert'
import { LICKS } from '../src/licks/library'
import { CLASSIC_LICKS } from '../src/licks/classicLicks'
import { parseLick } from '../src/licks/notation'
import {
  WORKS_OVER_TAGS,
  worksOverForLick,
  worksOverForExercise,
  worksOverSummary,
  jamProfile,
  lickMatchScore,
  matchingLicksForJam,
  exerciseMatchesWorksOver,
} from '../src/licks/worksOver'
import { exerciseCatalog } from '../src/exercises/catalog'
import { current } from '../src/instrument'
import {
  startSession,
  next,
  jumpTo,
  stopSession,
  running,
  sessionSummary,
  clearSummary,
  type Session,
} from '../src/sessions/session'
import { playAction, takePlayAction } from '../src/nav'
import type { ProgChord } from '../src/theory/progressions'

const inst = current()
const validTagIds = new Set(WORKS_OVER_TAGS.map(t => t.id))

// 1. Classic guitarist Must-Know Licks
{
  assert.ok(CLASSIC_LICKS.length >= 90, `Expected >= 90 classic licks, got ${CLASSIC_LICKS.length}`)
  const baseIds = new Set(LICKS.filter(l => !l.id.startsWith('cl-')).map(l => l.id))
  const clIds = new Set(CLASSIC_LICKS.map(l => l.id))
  assert.equal(clIds.size, CLASSIC_LICKS.length, 'Every classic lick cl-* ID must be unique')
  for (const id of clIds) assert.ok(!baseIds.has(id), `Classic lick ID ${id} must not collide with base library`)
  for (const cl of CLASSIC_LICKS) {
    assert.ok(cl.id.startsWith('cl-'), `${cl.id} starts with cl-`)
    assert.ok(cl.must.about.length > 20, `${cl.id} has rich must.about`)
    assert.ok(cl.must.steps.length >= 2, `${cl.id} has >= 2 steps`)
    assert.ok(cl.must.tip.length > 5, `${cl.id} has tip`)
    assert.ok(cl.must.use.length > 5, `${cl.id} has use`)
    assert.ok(cl.must.goal >= 40, `${cl.id} has goal BPM`)
    const parsed = parseLick(cl.tab)
    assert.ok(parsed.bars.length >= 1 && parsed.events.length >= 2, `${cl.id} tab parses cleanly`)
  }
  const bluegrassCount = LICKS.filter(l => l.style === 'bluegrass').length
  assert.ok(bluegrassCount < 40, `bluegrass lick count (${bluegrassCount}) stays < 40 for catalog test`)
  const ex = exerciseCatalog(inst)
  const bb = ex.find(e => e.lick === 'cl-bl-bb-sting')
  assert.ok(bb, 'B.B. King lick present in exercise catalog')
  assert.ok(bb!.about.includes('B.B. King') && bb!.about.length > 20, `B.B. King about does not truncate at "B.": ${bb!.about}`)
  console.log(`classic licks: ${CLASSIC_LICKS.length} checked, total licks ${LICKS.length}`)
}

// 2. 100% "Works over…" coverage across ALL licks & ALL exercises + Jam matching
{
  for (const l of LICKS) {
    const tags = worksOverForLick(l)
    assert.ok(tags.length >= 1 && tags.length <= 4, `${l.id} has ${tags.length} works-over tags`)
    for (const t of tags) assert.ok(validTagIds.has(t), `${l.id} invalid tag ${t}`)
    assert.ok(worksOverSummary(tags).length > 0, `${l.id} has non-empty worksOver summary`)
  }
  const exercises = exerciseCatalog(inst)
  assert.ok(exercises.length >= 1000, `Expected >= 1000 exercises, got ${exercises.length}`)
  for (const ex of exercises) {
    const tags = worksOverForExercise(ex)
    assert.ok(tags.length >= 1, `${ex.code} has works-over tags`)
    for (const t of tags) assert.ok(validTagIds.has(t), `${ex.code} invalid tag ${t}`)
    assert.ok(exerciseMatchesWorksOver(ex, 'all', null))
    assert.ok(exerciseMatchesWorksOver(ex, tags[0], null))
  }

  const mkProg = (syms: string[]): ProgChord[] =>
    syms.map(s => ({ degree: 1, roman: s, root: s[0], symbol: s, label: s }))

  const bluesJam = jamProfile(mkProg(['A7', 'D7', 'E7', 'A7']), 'A', 'major', 'blues')
  assert.ok(bluesJam.tags.includes('blues12') && bluesJam.tags.includes('dominant'))
  const bluesMatches = matchingLicksForJam(LICKS, bluesJam, 12)
  assert.equal(bluesMatches.length, 12)
  assert.ok(bluesMatches.some(l => l.style === 'blues'), 'blues Jam matches blues licks')

  const jazzJam = jamProfile(mkProg(['Dm7', 'G7', 'Cmaj7']), 'C', 'major', 'jazz')
  assert.ok(jazzJam.tags.includes('iiVI'))
  const jazzMatches = matchingLicksForJam(LICKS, jazzJam, 12)
  assert.ok(jazzMatches.some(l => l.style === 'jazz'), 'jazz Jam matches jazz licks')

  const metalJam = jamProfile(mkProg(['E5', 'G5', 'A5']), 'E', 'minor', 'metal')
  assert.ok(metalJam.tags.includes('heavy') && metalJam.tags.includes('minor'))
  const metalMatches = matchingLicksForJam(LICKS, metalJam, 12)
  assert.ok(metalMatches.some(l => l.style === 'metal' || l.style === 'progmetal'), 'metal Jam matches metal licks')

  const reggaeJam = jamProfile(mkProg(['Am', 'G', 'F']), 'A', 'minor', 'reggaerock')
  assert.ok(reggaeJam.tags.includes('island') && reggaeJam.tags.includes('minor'))
  const islandMatches = matchingLicksForJam(LICKS, reggaeJam, 12)
  assert.ok(islandMatches.length >= 4 && islandMatches.every(l => lickMatchScore(l, reggaeJam) > 0))
  console.log(`works over: ${LICKS.length} licks + ${exercises.length} exercises tagged & Jam-matched`)
}

// 3. Guided Practice Session bar state & completion summary
{
  clearSummary()
  const ses: Session = {
    id: 'test-guided',
    title: 'Guided test',
    steps: [
      { title: 'Warm up', minutes: 5, target: { exercise: 'type:warmup' }, tip: 'Keep fingers close to the frets.' },
      { title: 'Blues licks', minutes: 10, target: { go: { licks: 'blues' } }, tip: 'Target the 3rd on beat 1.' },
    ],
  }
  startSession(ses)
  assert.equal(running()?.index, 0)
  assert.deepEqual(running()?.completed, [])
  assert.equal(sessionSummary(), null)

  next()
  assert.equal(running()?.index, 1)
  assert.deepEqual(running()?.completed, [0])

  jumpTo(0)
  assert.equal(running()?.index, 0)
  assert.deepEqual(running()?.completed, [0])

  jumpTo(1)
  next()
  assert.equal(running(), null)
  const sum = sessionSummary()
  assert.ok(sum !== null, 'Finishing last step populates sessionSummary')
  assert.equal(sum!.completedCount, 2)
  assert.equal(sum!.minutes, 15)

  clearSummary()
  assert.equal(sessionSummary(), null)

  startSession(ses)
  stopSession()
  assert.equal(running(), null)
  assert.equal(sessionSummary(), null, 'Stop the session does not set completion summary')
  console.log('guided session bar: ok')
}

// 4. Drill Lab / Exercise -> Play Loop + Speed ramp action
{
  takePlayAction()
  playAction({
    mode: 'time',
    loop: { from: 0, to: 1 },
    speed: 0.7,
    trainer: { on: true, start: 0.7, step: 0.05, target: 1, pass: 90, ramp: true },
  })
  const got = takePlayAction()
  assert.ok(got, 'playAction enqueued action')
  assert.equal(got!.mode, 'time')
  assert.deepEqual(got!.loop, { from: 0, to: 1 })
  assert.equal(got!.speed, 0.7)
  assert.equal(got!.trainer?.on, true)
  assert.equal(got!.trainer?.ramp, true)
  assert.equal(got!.trainer?.start, 0.7)
  assert.equal(got!.trainer?.step, 0.05)
  assert.equal(got!.trainer?.pass, 90)
  console.log('loop + speed ramp bridge: ok')
}

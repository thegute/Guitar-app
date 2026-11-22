// Unit tests for Phone ↔ Tablet Sync smart-merge engine (src/sync/cloudSync.ts).
import assert from 'node:assert/strict'
import { isDeviceLocalKey, mergeBackups } from '../src/sync/cloudSync'
import type { Backup } from '../src/backup'
import type { SongDoc } from '../src/tabs/library'

let pass = 0
function test(name: string, fn: () => void) {
  fn()
  pass++
  console.log(`  ok  ${name}`)
}

function song(id: string, title: string, updated: number): SongDoc {
  return {
    id,
    title,
    artist: 'Test',
    raw: 'e|--0--|',
    updated,
    tuning: [40, 45, 50, 55, 59, 64],
  } as SongDoc
}

console.log('sync-logic tests')

test('isDeviceLocalKey keeps screen layouts, folders, gear & tokens local per device', () => {
  const localKeys = [
    'kg:win:learnCourse:narrow',
    'kg:win:learnCourse:wide',
    'kg:floatPlace:narrow:neck',
    'kg:floatCards:wide',
    'kg:fingerBox:neck',
    'kg:ckSplit',
    'kg:lessonFolders',
    'kg:sync:cfg',
    'kg:geminiKey',
    'kg:calib:mic',
    'kg:gear:pocket',
    'kg:lastBackup',
    'other:unrelated',
  ]
  for (const k of localKeys) assert.equal(isDeviceLocalKey(k), true, `expected local: ${k}`)

  const syncedKeys = [
    'kg:course',
    'kg:lessonsRead',
    'kg:techDone',
    'kg:circleDone',
    'kg:circleMastery',
    'kg:practiceLog',
    'kg:z2h',
    'kg:lessonProgress',
    'kg:studioBeats',
    'kg:coursePins',
    'kg:courseNotes',
    'kg:bookMarks',
    'kg:floatPresets',
    'kg:sticky:main',
  ]
  for (const k of syncedKeys) assert.equal(isDeviceLocalKey(k), false, `expected synced: ${k}`)
})

test('mergeBackups smart-merges Theory Course, Circle mastery, video progress, streaks, beats & songs without loss', () => {
  const local: Backup = {
    app: 'KGuitar',
    version: 1,
    createdAt: 1000,
    storage: {
      'kg:win:jam:narrow': '{"order":["a"]}',
      'kg:course': JSON.stringify({
        l1: { steps: ['a', 'b'], at: 100, done: 500, reviews: [600] },
        l2: { steps: ['x'], at: 200 },
      }),
      'kg:circleDone': JSON.stringify(['c1', 'c2']),
      'kg:circleMastery': JSON.stringify({ C: 80, G: 40 }),
      'kg:practiceLog': JSON.stringify({ '2026-11-20': { guitar: 900, study: 300 } }),
      'kg:lessonProgress': JSON.stringify({ v1: { pos: 45, dur: 120, done: false, at: 100 } }),
      'kg:studioBeats': JSON.stringify([{ name: 'Funk A', bpm: 100 }, { name: 'Shared', bpm: 90 }]),
      'kg:z2h': JSON.stringify({ level: 2, ticks: ['t1', 't2'] }),
      'kg:sticky:main': 'Short note',
    },
    songs: [song('s1', 'Fold Song', 100), song('s2', 'Shared Old', 100)],
  }

  const remote: Backup = {
    app: 'KGuitar',
    version: 1,
    createdAt: 2000,
    storage: {
      'kg:win:jam:wide': '{"order":["b"]}',
      'kg:course': JSON.stringify({
        l1: { steps: ['b', 'c'], at: 300, done: 400, reviews: [600, 900] },
        l3: { steps: ['k'], at: 400 },
      }),
      'kg:circleDone': JSON.stringify(['c2', 'c3']),
      'kg:circleMastery': JSON.stringify({ C: 60, G: 95, D: 50 }),
      'kg:practiceLog': JSON.stringify({
        '2026-11-20': { guitar: 600, study: 700 },
        '2026-11-21': { guitar: 1200, study: 0 },
      }),
      'kg:lessonProgress': JSON.stringify({
        v1: { pos: 30, dur: 120, done: true, at: 200 },
        v2: { pos: 90, dur: 180, done: false, at: 250 },
      }),
      'kg:studioBeats': JSON.stringify([{ name: 'Tablet Beat', bpm: 120 }, { name: 'Shared', bpm: 95 }]),
      'kg:z2h': JSON.stringify({ level: 3, ticks: ['t2', 't3'] }),
      'kg:sticky:main': 'Longer sticky note from tablet with chord reminders',
    },
    songs: [song('s2', 'Shared Newer', 300), song('s3', 'Tablet Song', 250)],
  }

  const { merged, songsAdded } = mergeBackups(local, remote)

  // Device-local layout keys stripped
  assert.equal('kg:win:jam:narrow' in merged.storage, false)
  assert.equal('kg:win:jam:wide' in merged.storage, false)

  // Theory Course merged cleanly
  const course = JSON.parse(merged.storage['kg:course'])
  assert.deepEqual(course.l1.steps.sort(), ['a', 'b', 'c'])
  assert.equal(course.l1.done, 400) // earliest completion preserved
  assert.equal(course.l1.at, 300) // latest touch preserved
  assert.deepEqual(course.l1.reviews, [600, 900])
  assert.deepEqual(course.l2.steps, ['x'])
  assert.deepEqual(course.l3.steps, ['k'])

  // Circle & mastery
  assert.deepEqual(JSON.parse(merged.storage['kg:circleDone']).sort(), ['c1', 'c2', 'c3'])
  assert.deepEqual(JSON.parse(merged.storage['kg:circleMastery']), { C: 80, G: 95, D: 50 })

  // Practice log takes max per day
  const log = JSON.parse(merged.storage['kg:practiceLog'])
  assert.deepEqual(log['2026-11-20'], { guitar: 900, study: 700 })
  assert.deepEqual(log['2026-11-21'], { guitar: 1200, study: 0 })

  // Video lesson watch progress: done OR + max pos
  const lp = JSON.parse(merged.storage['kg:lessonProgress'])
  assert.equal(lp.v1.done, true)
  assert.equal(lp.v1.pos, 45)
  assert.equal(lp.v2.pos, 90)

  // Beats union by name, newer remote wins collision
  const beats = JSON.parse(merged.storage['kg:studioBeats']) as { name: string; bpm: number }[]
  assert.equal(beats.length, 3)
  assert.equal(beats.find(b => b.name === 'Shared')?.bpm, 95)

  // Zero to Hero ticks union
  const z2h = JSON.parse(merged.storage['kg:z2h'])
  assert.deepEqual(z2h.ticks.sort(), ['t1', 't2', 't3'])

  // Sticky note keeps longer
  assert.equal(merged.storage['kg:sticky:main'], 'Longer sticky note from tablet with chord reminders')

  // Songs: all 3 kept, s2 takes newer updated
  assert.equal(songsAdded, 1)
  assert.equal(merged.songs.length, 3)
  assert.equal(merged.songs.find(s => s.id === 's2')?.title, 'Shared Newer')
})

test('mergeBackups is idempotent when merged with itself', () => {
  const snap: Backup = {
    app: 'KGuitar',
    version: 1,
    createdAt: 5000,
    storage: {
      'kg:course': JSON.stringify({ l1: { steps: ['a'], reviews: [10] } }),
      'kg:circleDone': JSON.stringify(['c1']),
      'kg:practiceLog': JSON.stringify({ '2026-11-22': { guitar: 300, study: 100 } }),
    },
    songs: [song('s1', 'Only', 10)],
  }
  const r1 = mergeBackups(snap, snap)
  const r2 = mergeBackups(r1.merged, snap)
  assert.deepEqual(r2.merged.storage, r1.merged.storage)
  assert.equal(r2.merged.songs.length, 1)
  assert.equal(r2.songsAdded, 0)
})

console.log(`sync-logic: ${pass} passed`)

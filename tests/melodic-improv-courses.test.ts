// Unit tests for Melodic Improv Gym, Hexatonic Scales + Mode Colors + Pentatonic Tricks + B.B. King Box,
// Speed Builder Burst/Sequences/BPM Log, Course Indexer & Topic Matcher, and new Course Workout Recipes.
import assert from 'node:assert/strict'
import {
  MODE_COLOR_NOTES,
  PENTATONIC_TRICKS,
  SCALES,
  bbKingBoxInfo,
  hexatonicArpeggios,
  scaleInfo,
} from '../src/theory/scales'
import { AI_STYLES, composeAIStrumChart } from '../src/jam/aiComposer'
import {
  IMPROV_GAMES,
  applyGymJudgment,
  dashcamToSongDoc,
  directorCueForCycle,
  generateDuelCall,
  initialGymScore,
  noteFitsZone,
  noteLimitPalette,
  spacePatternForBar,
  targetPcsForChord,
  trimDashcam,
  zoneForTeleporterStep,
} from '../src/improv/improvGym'
import {
  inferTopicsForLesson,
  rankCourseMatches,
  topicsForScale,
  type IndexedLesson,
} from '../src/lessons/courseIndex'
import {
  SPEED_SEQUENCES,
  buildSpeedSequenceDoc,
  burstBarBpm,
} from '../src/exercises/speedSequences'
import { builtInPlan } from '../src/sessions/recipes'
import {
  chooseBestCourseMap,
  parseImportedCourseMaps,
  scoreMapMatchForFolder,
  type CourseMap,
} from '../src/lessons/courseMap'
import { isDeviceLocalKey, mergeBackups } from '../src/sync/cloudSync'

const STD_TUNING = [40, 45, 50, 55, 59, 64]

let passed = 0
function test(name: string, fn: () => void) {
  fn()
  passed++
}

test('Native Hexatonic scales (Minor, Blues, Major) compute exact pitch classes & labels', () => {
  const mHex = scaleInfo('A', 'minor hexatonic')
  assert.deepEqual(mHex.pcs, [9, 11, 0, 2, 4, 7]) // A B C D E G
  assert.equal(mHex.labels.get(11), '2')
  const hBlues = scaleInfo('E', 'hexatonic blues')
  assert.equal(hBlues.pcs.length, 7)
  assert.ok(hBlues.pcs.includes(10)) // Bb = b5 of E
  const majHex = scaleInfo('C', 'major hexatonic')
  assert.deepEqual(majHex.pcs, [0, 2, 4, 5, 7, 9]) // C D E F G A
  assert.ok(SCALES.some(s => s.id === 'minor hexatonic'))
})

test('Mode color notes, Roy Pentatonic Tricks, Hexatonic Arpeggios & B.B. King Box', () => {
  assert.deepEqual(MODE_COLOR_NOTES['minor hexatonic'].semis, [2])
  assert.deepEqual(MODE_COLOR_NOTES['lydian'].semis, [6])
  assert.deepEqual(MODE_COLOR_NOTES['dorian'].semis, [9])
  assert.equal(PENTATONIC_TRICKS['dorian'].shiftSemis, 2)
  assert.equal(PENTATONIC_TRICKS['lydian'].shiftSemis, 11)
  const arps = hexatonicArpeggios('E')
  assert.equal(arps.length, 4)
  assert.equal(arps[0].symbol, 'Em7')
  const bb = bbKingBoxInfo(9, STD_TUNING) // A root on B string = fret 10
  assert.equal(bb.centerFret, 10)
  assert.equal(bb.match(59 + 10, 4, 10), true) // root A on B string fret 10
  assert.equal(bb.match(40 + 5, 0, 5), false) // low E string is outside B.B. King box
})

test('53 AI styles include Melodic Rock Ballad, Fusion, Dorian, Lydian & Mixolydian presets', () => {
  assert.ok(AI_STYLES.length >= 53, `expected >= 53 styles, got ${AI_STYLES.length}`)
  const ballad = composeAIStrumChart({ styleId: 'melodic-rock-ballad', key: 'E', songShape: 'song', seed: 1 })
  assert.equal(ballad.soloScale.scaleId, 'minor hexatonic')
  assert.ok(ballad.chart.bars.length >= 12)
  const lydian = composeAIStrumChart({ styleId: 'lydian-dream-vamp', key: 'C', songShape: 'loop', seed: 1 })
  assert.equal(lydian.soloScale.scaleId, 'lydian')
})

test('Melodic Improv Gym: all 6 games, skipping-shapes teleporter, note-limits, duel & director', () => {
  assert.equal(IMPROV_GAMES.length, 6)
  // Teleporter skips shapes (never adjacent 0->1 immediately)
  const z0 = zoneForTeleporterStep(0)
  const z1 = zoneForTeleporterStep(1)
  assert.notEqual(z0.boxNum, z1.boxNum)
  assert.ok(Math.abs(z1.boxNum - z0.boxNum) >= 2)
  assert.equal(noteFitsZone(52, z0), true)

  // Chord-Tone Sniper targets 3rd accurately
  const t3 = targetPcsForChord('Am7', 'A', 'minor hexatonic', 'third')
  assert.deepEqual(t3.pcs, [0]) // C is b3 of Am7
  const tColor = targetPcsForChord('Am7', 'A', 'minor hexatonic', 'color')
  assert.deepEqual(tColor.pcs, [11]) // B is 9th/2nd of A

  // Note limits & space pattern
  assert.equal(noteLimitPalette('A', 'minor hexatonic', 3).length, 3)
  assert.equal(noteLimitPalette('A', 'minor hexatonic', 2).length, 2)
  assert.equal(spacePatternForBar(0).includes('rest'), true)

  // Duel call generates playable scale notes
  const call = generateDuelCall('A', 'minor hexatonic', 2)
  assert.ok(call.length >= 4)
  const hexSet = new Set(scaleInfo('A', 'minor hexatonic').pcs)
  assert.ok(call.every(n => hexSet.has(((n.midi % 12) + 12) % 12)))

  // Director respects focus filter
  const neckCue = directorCueForCycle(0, 'neck', 1)
  assert.equal(neckCue.focus, 'neck')
})

test('Arcade Brandy scoring (1x -> 5x FEVER) & Dashcam Lick Saver', () => {
  let sc = initialGymScore()
  for (let i = 0; i < 12; i++) sc = applyGymJudgment(sc, true, 'Hit')
  assert.equal(sc.multiplier, 5)
  assert.equal(sc.mood, 'shred')
  assert.equal(sc.streak, 12)
  const missed = applyGymJudgment(sc, false, 'Miss')
  assert.equal(missed.streak, 0)
  assert.equal(missed.multiplier, 1)
  assert.equal(missed.mood, 'hurt')

  const raw = Array.from({ length: 20 }, (_, i) => ({ midi: 57 + (i % 5), beat: i * 1.5, atMs: i * 500 }))
  const trimmed = trimDashcam(raw, 16)
  assert.ok(trimmed.length < raw.length && trimmed.length >= 10)
  const doc = dashcamToSongDoc(trimmed, { key: 'A', scale: 'Minor hexatonic', bpm: 84, tuning: STD_TUNING })
  assert.ok(doc.song.tracks[0].bars.length >= 1)
  assert.ok(doc.title.includes('Improv Lick'))
})

test('Course Indexer infers topics across Roy Ziv, Paul Davids & Matteo Mancuso and diversifies matches', () => {
  const hexTopics = inferTopicsForLesson('Roy Ziv — Hexatonic MasterClass', 'Intermediate · Exercises (35)', 'Exercise 7', 'A Hexatonic')
  assert.ok(hexTopics.includes('hexatonic'))
  assert.ok(hexTopics.includes('skipping-shapes'))

  const bbTopics = inferTopicsForLesson('Paul Davids — Electric Elevation', 'Module 4 · Blues', '4.6 · The Real Magic of the B.B. King Box')
  assert.ok(bbTopics.includes('bb-king'))
  assert.ok(bbTopics.includes('blues'))

  const dorTopics = inferTopicsForLesson('Roy Ziv — Guitar Modes Navigator', '6 · Dorian', '3. *TIP* Pentatonic Trick For Dorian Solos')
  assert.ok(dorTopics.includes('dorian'))
  assert.ok(dorTopics.includes('pentatonic'))

  const fakeFolder = { tree: 't1', name: 'f', files: [], scanned: 1 }
  const mkItem = (courseTitle: string, instructor: string, chapterTitle: string, title: string): IndexedLesson => {
    const topics = inferTopicsForLesson(courseTitle, chapterTitle, title)
    return {
      folder: fakeFolder,
      courseTitle,
      instructor,
      topics,
      searchText: `${courseTitle} ${chapterTitle} ${title}`.toLowerCase(),
      lesson: {
        id: title,
        title,
        chapterId: chapterTitle,
        chapterTitle,
        video: { path: `${title}.mp4`, name: `${title}.mp4`, mime: 'video/mp4', size: 1, modified: 1, uri: `u://${title}` },
        extraPdfs: [],
        images: [],
        backings: [],
        gpTabs: [],
        chapterTabs: [],
        defaultView: 'video',
      },
    }
  }
  const pool = [
    mkItem('Roy Ziv — Guitar Modes Navigator', 'Roy Ziv', '15 · Advanced', '1. Triads Within The Modes'),
    mkItem('Paul Davids — Electric Elevation', 'Paul Davids', 'Module 2 · E Minor', '2.3 · Terrific Triads'),
    mkItem('Paul Davids — Acoustic Adventure', 'Paul Davids', '03 · The Stage', '1. Melancholic Triads'),
    mkItem('Matteo Mancuso — The Masterclass', 'Matteo Mancuso', '04-Arpeggios', 'Arpeggios Lesson 1'),
  ]
  const hits = rankCourseMatches(pool, ['triads', 'arpeggios'], { max: 4 })
  assert.equal(hits.length, 4)
  assert.ok(hits.some(h => h.item.instructor === 'Paul Davids'))
  assert.ok(hits.some(h => h.item.instructor === 'Roy Ziv'))
  assert.ok(topicsForScale('minor hexatonic').includes('hexatonic'))
})

test('Speed Builder: Burst-Speed tempo math, 14 live sequences & course workout recipes', () => {
  assert.equal(SPEED_SEQUENCES.length, 14)
  assert.deepEqual(burstBarBpm(0, 100, 'burst', 15), { bpm: 100, phase: 'clean' })
  assert.deepEqual(burstBarBpm(1, 100, 'burst', 15), { bpm: 100, phase: 'clean' })
  assert.deepEqual(burstBarBpm(2, 100, 'burst', 15), { bpm: 115, phase: 'burst' })
  assert.deepEqual(burstBarBpm(4, 100, 'ramp', 15), { bpm: 105, phase: 'ramp' })

  for (const seq of SPEED_SEQUENCES) {
    const doc = buildSpeedSequenceDoc(seq.id, 'A', 'minor hexatonic', 90, STD_TUNING)
    assert.ok(doc.song.tracks[0].bars.length >= 1, `sequence ${seq.id} produced empty bars`)
  }

  const p1 = builtInPlan('I want a Roy Ziv hexatonic workout in E')
  assert.ok(p1?.session?.steps.length && p1.session.steps.length >= 3)
  const p2 = builtInPlan('Speed builder burst session')
  assert.ok(p2?.session?.title.includes('Speed Builder'))
  const p3 = builtInPlan('Dorian modal drone practice')
  assert.ok(p3?.session?.title.includes('Modal'))
})

test('1-tap Drive course map bundle parser, folder matcher, priority merge & Cloud Sync', () => {
  const mapA: CourseMap = {
    version: 1,
    title: 'Roy Ziv — Hexatonic MasterClass',
    chapters: [{ id: 'c1', title: 'Ch1', lessons: [{ id: 'l1', title: 'Ex 1', video: 'Beginner/Ex1.mp4', topics: ['hexatonic', 'improv'] }] }],
  }
  const mapOld: CourseMap = {
    version: 1,
    title: 'Roy Ziv — Hexatonic MasterClass',
    chapters: [{ id: 'c1', title: 'Ch1', lessons: [{ id: 'l1', title: 'Ex 1', video: 'Beginner/Ex1.mp4' }] }],
  }
  const mapB: CourseMap = {
    version: 1,
    title: 'Matteo Mancuso — The Masterclass',
    chapters: [{ id: 'c1', title: 'Ch1', lessons: [{ id: 'm1', title: 'Intro', video: '01-Introduction/Introduction.mp4', topics: ['fingerstyle'] }] }],
  }
  const bundleJson = JSON.stringify({ version: 1, kind: 'kguitar-course-bundle', updatedAt: 2000, maps: [mapA, mapB] })
  assert.equal(parseImportedCourseMaps(bundleJson).length, 2)
  assert.equal(parseImportedCourseMaps(JSON.stringify(mapA)).length, 1)

  const folder = {
    tree: 'content://mock/hex',
    name: 'Roy Ziv - Hexatonic MasterClass',
    scanned: 1,
    files: [{ path: 'Beginner/Ex1.mp4', name: 'Ex1.mp4', mime: 'video/mp4', size: 1, modified: 1, uri: 'u://1' }],
  }
  assert.ok(scoreMapMatchForFolder(mapA, folder) > scoreMapMatchForFolder(mapB, folder))
  assert.equal(chooseBestCourseMap(mapOld, mapA), mapA)
  assert.equal(isDeviceLocalKey('kg:courseMap:content://mock/hex'), true)
  assert.equal(isDeviceLocalKey('kg:courseMapStore'), false)

  const merged = mergeBackups(
    { app: 'KGuitar', version: 1, createdAt: 1000, storage: { 'kg:courseMapStore': JSON.stringify({ a: { key: 'a', updatedAt: 100, map: mapOld } }) }, songs: [] },
    { app: 'KGuitar', version: 1, createdAt: 2000, storage: { 'kg:courseMapStore': JSON.stringify({ a: { key: 'a', updatedAt: 200, map: mapA }, b: { key: 'b', updatedAt: 200, map: mapB } }) }, songs: [] },
  )
  const store = JSON.parse(merged.merged.storage['kg:courseMapStore']) as Record<string, { updatedAt: number }>
  assert.equal(store.a.updatedAt, 200)
  assert.equal(store.b.updatedAt, 200)
})

console.log(`melodic-improv-courses: ${passed}/${passed} passed`)

// Unit tests for the Fretboard Mastery Game engine (heatmap, spaced repetition,
// 6-stage curriculum, Circle-of-4ths Gauntlet, Octave Sniper, Solo Intervals, and sync merge).
import assert from 'node:assert/strict'
import {
  CIRCLE_FOURTHS_PCS,
  STAGES,
  buildSoloGoal,
  calcHitPoints,
  emptyFretGameData,
  filterSpots,
  fretHeat,
  matchRushAttempt,
  mergeFretGameData,
  octaveConstellationLinks,
  pickOctavePair,
  pickWeightedSpot,
  recordFretResult,
  rushWaveSpec,
  sessionGrade,
  shortcutTip,
  spotKey,
  spotsForPc,
  spotsMastery,
  stageSpots,
  weakestSpots,
} from '../src/learn/fretboardGame'

const STD_GUITAR = [40, 45, 50, 55, 59, 64] // E2 A2 D3 G3 B3 E4
const DROP_D = [38, 45, 50, 55, 59, 64]

// 1. Heatmap tier transitions (unseen -> red -> amber -> green -> gold lightning)
let data = emptyFretGameData()
assert.equal(fretHeat(data.heat['guitar:std']?.['0:3']), 'unseen')

// Slow miss -> red
data = recordFretResult(data, 'guitar:std', 0, 3, false, 3500)
assert.equal(fretHeat(data.heat['guitar:std']['0:3']), 'red')

// Fast repeated hits -> climbs to green then gold lightning!
let fast = emptyFretGameData()
for (let i = 0; i < 4; i++) fast = recordFretResult(fast, 'guitar:std', 2, 5, true, 720)
assert.equal(fretHeat(fast.heat['guitar:std']['2:5']), 'gold')

// Medium speed accurate hits -> amber
let med = emptyFretGameData()
med = recordFretResult(med, 'guitar:std', 1, 7, true, 1900)
assert.equal(fretHeat(med.heat['guitar:std']['1:7']), 'amber')

// 2. Weak-spot prioritization & spaced repetition picker
const allSpots = filterSpots(STD_GUITAR, { fromFret: 0, toFret: 12, strings: [], accidentals: 'natural' })
let hmData = emptyFretGameData()
hmData = recordFretResult(hmData, 'g', 3, 5, false, 4100) // C on G string = weak red
for (const sp of allSpots) {
  if (sp.s === 3 && sp.f === 5) continue
  for (let i = 0; i < 4; i++) hmData = recordFretResult(hmData, 'g', sp.s, sp.f, true, 750)
}
const weak = weakestSpots(allSpots, hmData.heat['g'], 5)
assert.equal(spotKey(weak[0].s, weak[0].f), '3:5', 'weakest spot must sort first')

// Weighted picker with weakOnly picks from weakest subset and never repeats avoidKey
const picked = pickWeightedSpot(allSpots, hmData.heat['g'], '3:5', () => 0.1, true)
assert.notEqual(spotKey(picked.s, picked.f), '3:5')

// 3. 6-stage curriculum coverage & mastery calculation
assert.equal(STAGES.length, 6)
assert.equal(stageSpots(STD_GUITAR, 1).length, 6 * 6, 'Stage 1 = 6 landmark frets x 6 strings')
assert.equal(stageSpots(STD_GUITAR, 2).length, 2 * 13, 'Stage 2 = Low E & A, frets 0..12')
const mFull = spotsMastery(allSpots, hmData.heat['g'])
assert.ok(mFull.pct >= 90 && mFull.red === 1, `expected >=90% mastery with 1 red fret, got ${mFull.pct}%`)

// 4. Octave Jump pair & Octave Sniper (Find All 6) + Constellation links
const pair = pickOctavePair(STD_GUITAR, undefined, '', () => 0.3)
assert.equal(pair.target.midi - pair.anchor.midi, 12, 'Octave pair must be exactly 12 semitones apart')
const allGs = spotsForPc(STD_GUITAR, 7, 0, 11, true)
assert.equal(allGs.length, 6, 'Every note appears once per string in frets 0..11')
assert.ok(octaveConstellationLinks(allGs).length >= 3, 'Constellation connects adjacent string octaves')

// Drop D tuning adapts automatically!
const dropDGs = spotsForPc(DROP_D, 7, 0, 11, true)
assert.equal(dropDGs[0].f, 5, 'In Drop D, G on low string moves from fret 3 to fret 5')

// 5. Circle of 4ths completeness
assert.equal(new Set(CIRCLE_FOURTHS_PCS).size, 12)

// 6. Tom Quayle Solo-style Interval & Chord Changes goal builder
const cmaj7 = buildSoloGoal({ root: 'C', type: 'maj7', symbol: 'Cmaj7' }, 'sevenths', 5, 9)
assert.deepEqual(cmaj7.labels, ['R', '3', '5', '7'])
assert.deepEqual(cmaj7.targetPcs, [0, 4, 7, 11])
const amColor = buildSoloGoal({ root: 'A', type: 'm7', symbol: 'Am7' }, 'color', 5, 9)
assert.deepEqual(amColor.labels, ['b3', '5', 'b7', '9'])
assert.deepEqual(amColor.targetPcs, [0, 4, 7, 11])

// 7. Scoring, FEVER multipliers, grades & coaching shortcuts
const hit1 = calcHitPoints(700, 1)
const hitFever = calcHitPoints(700, 15)
assert.equal(hit1.points, 100)
assert.equal(hitFever.points, 500)
assert.equal(hitFever.mult, 5)
assert.equal(sessionGrade(96, 1100), 'S')
assert.equal(sessionGrade(90, 1800), 'A')
assert.ok(shortcutTip(STD_GUITAR, { s: 2, f: 5, midi: 55, pc: 7 }).includes('fret-5 dot'))
assert.ok(shortcutTip(STD_GUITAR, { s: 2, f: 4, midi: 54, pc: 6 }).includes('Octave trick'))

// 8. Note Rush (Fret Defense) waves, orb targeting (touch + guitar mic), and Octave Boss armor
const w1 = rushWaveSpec(1, 6)
assert.equal(w1.isBoss, false)
assert.deepEqual(w1.strings, [0, 1])
const w5 = rushWaveSpec(5, 6)
assert.equal(w5.isBoss, true)

const orbA = { id: 1, spot: { s: 0, f: 5, midi: 45, pc: 9 }, label: 'A', x: 40, speed: 12, spawnedAt: 0 }
const orbC = { id: 2, spot: { s: 1, f: 3, midi: 48, pc: 0 }, label: 'C', x: 75, speed: 12, spawnedAt: 0 }
// Touch tap matches exact (s, f)
assert.equal(matchRushAttempt([orbA, orbC], null, { s: 0, f: 5 })?.kind, 'orb')
assert.equal(matchRushAttempt([orbA, orbC], null, { s: 0, f: 4 }), null)
// Guitar mic MIDI pitch matches exact MIDI
assert.equal(matchRushAttempt([orbA, orbC], null, { midi: 48 })?.kind, 'orb')

const bossG = { id: 3, pc: 7, label: 'G', spots: spotsForPc(STD_GUITAR, 7, 0, 11, true), found: [], x: 60, speed: 3.5, spawnedAt: 0 }
const bHit = matchRushAttempt([], bossG, { midi: 43 }) // Low E fret 3 = G2 (MIDI 43)
assert.equal(bHit?.kind, 'boss')

// 9. Phone <-> Tablet cloudSync merge preserves max high scores & merges per-fret heatmaps
const phone = recordFretResult({ ...emptyFretGameData(), records: { ...emptyFretGameData().records, blitzScore: 2400, gauntletBpm: 95 } }, 'guitar:std', 0, 3, true, 850)
const tablet = recordFretResult({ ...emptyFretGameData(), records: { ...emptyFretGameData().records, blitzScore: 1800, survivalWave: 14 } }, 'guitar:std', 4, 8, true, 920)
const merged = mergeFretGameData(phone, tablet)
assert.equal(merged.records.blitzScore, 2400)
assert.equal(merged.records.gauntletBpm, 95)
assert.equal(merged.records.survivalWave, 14)
assert.ok(merged.heat['guitar:std']['0:3'] && merged.heat['guitar:std']['4:8'], 'both device frets preserved')

console.log('fretboard-game: all checks passed!')

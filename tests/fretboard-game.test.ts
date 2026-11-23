// Unit tests for the Fretboard Mastery Game engine:
// Heatmap, spaced repetition, 6-stage Guided Path, Endless Mode orbs & Bosses,
// Intervals (Fixed/Moving/By-Ear), Scale Degrees & mode color tones, 3-string Triads,
// String Set presets, Chord Tones, and Phone <-> Tablet cloudSync merge.
import assert from 'node:assert/strict'
import {
  CIRCLE_FOURTHS_PCS,
  STAGES,
  buildSoloGoal,
  buildTriadChallenge,
  calcHitPoints,
  emptyFretGameData,
  filterSpots,
  fretHeat,
  intervalLabelFromRoot,
  intervalTip,
  matchRushAttempt,
  mergeFretGameData,
  octaveConstellationLinks,
  pickIntervalAnchor,
  pickIntervalTarget,
  pickOctavePair,
  pickWeightedSpot,
  recordFretResult,
  rushWaveSpec,
  scaleDegreeInfo,
  sessionGrade,
  shortcutTip,
  spotKey,
  spotsForPc,
  spotsMastery,
  stageSpots,
  stringSetPresets,
  weakestSpots,
} from '../src/learn/fretboardGame'

const STD_GUITAR = [40, 45, 50, 55, 59, 64] // E2 A2 D3 G3 B3 E4
const DROP_D = [38, 45, 50, 55, 59, 64]

// 1. Heatmap tier transitions (unseen -> red -> amber -> green -> gold lightning)
let data = emptyFretGameData()
assert.equal(fretHeat(data.heat['guitar:std']?.['0:3']), 'unseen')
data = recordFretResult(data, 'guitar:std', 0, 3, false, 3500)
assert.equal(fretHeat(data.heat['guitar:std']['0:3']), 'red')

let fast = emptyFretGameData()
for (let i = 0; i < 4; i++) fast = recordFretResult(fast, 'guitar:std', 2, 5, true, 720)
assert.equal(fretHeat(fast.heat['guitar:std']['2:5']), 'gold')

let med = emptyFretGameData()
med = recordFretResult(med, 'guitar:std', 1, 7, true, 1900)
assert.equal(fretHeat(med.heat['guitar:std']['1:7']), 'amber')

// 2. Weak-spot prioritization & spaced repetition picker
const allSpots = filterSpots(STD_GUITAR, { fromFret: 0, toFret: 12, strings: [], accidentals: 'natural' })
let hmData = emptyFretGameData()
hmData = recordFretResult(hmData, 'g', 3, 5, false, 4100)
for (const sp of allSpots) {
  if (sp.s === 3 && sp.f === 5) continue
  for (let i = 0; i < 4; i++) hmData = recordFretResult(hmData, 'g', sp.s, sp.f, true, 750)
}
const weak = weakestSpots(allSpots, hmData.heat['g'], 5)
assert.equal(spotKey(weak[0].s, weak[0].f), '3:5', 'weakest spot must sort first')
const picked = pickWeightedSpot(allSpots, hmData.heat['g'], '3:5', () => 0.1, true)
assert.notEqual(spotKey(picked.s, picked.f), '3:5')

// 3. 6-stage Guided Path & String Set presets
assert.equal(STAGES.length, 6)
assert.equal(stageSpots(STD_GUITAR, 1).length, 36)
assert.equal(stageSpots(STD_GUITAR, 2).length, 26)
const mFull = spotsMastery(allSpots, hmData.heat['g'])
assert.ok(mFull.pct >= 90 && mFull.red === 1)
assert.equal(stringSetPresets(6).length, 6)
assert.equal(stringSetPresets(4).length, 3)

// 4. Octave Web & Build the Shape (all 6 + Drop D support)
const pair = pickOctavePair(STD_GUITAR, undefined, '', () => 0.3)
assert.equal(pair.target.midi - pair.anchor.midi, 12)
const allGs = spotsForPc(STD_GUITAR, 7, 0, 11, true)
assert.equal(allGs.length, 6)
assert.ok(octaveConstellationLinks(allGs).length >= 3)
assert.equal(spotsForPc(DROP_D, 7, 0, 11, true)[0].f, 5)
assert.equal(new Set(CIRCLE_FOURTHS_PCS).size, 12)

// 5. Intervals Lens (Anchor, Target, Label, Geometry Tip)
const box59 = { fromFret: 5, toFret: 9, strings: [], accidentals: 'both' as const }
const ancA = pickIntervalAnchor(STD_GUITAR, box59, 9, () => 0) // A on Low E fret 5
assert.equal(ancA.pc, 9)
const ivTarget = pickIntervalTarget(STD_GUITAR, box59, ancA, '', () => 0.4)
assert.notEqual(spotKey(ivTarget.spot.s, ivTarget.spot.f), spotKey(ancA.s, ancA.f))
assert.equal(intervalLabelFromRoot(ancA.midi + 7, ancA.midi).short, '5')
assert.equal(intervalLabelFromRoot(ancA.midi + 12, ancA.midi).short, 'Oct')
assert.ok(intervalTip(ivTarget.spot, ancA).includes('from Root'))

// 6. Scale Degrees & Mode Color Notes
const dorian6 = scaleDegreeInfo(11, 2, 'dorian') // B in D Dorian = major 6th (color tone!)
assert.equal(dorian6?.label, '6')
assert.equal(dorian6?.isColor, true)
assert.equal(scaleDegreeInfo(3, 2, 'dorian'), null) // Eb is outside D Dorian

// 7. Triads Lens (3-note playable closed triad inside chunk)
const gTriad = buildTriadChallenge(STD_GUITAR, 7, 'maj', { fromFret: 0, toFret: 7, strings: [3, 4, 5], accidentals: 'both' }, () => 0)
assert.equal(gTriad.symbol, 'G')
assert.equal(gTriad.spots.length, 3)
assert.equal(new Set(gTriad.spots.map(sp => sp.pc)).size, 3, 'Triad must contain R, 3, and 5')
const fretsSpan = Math.max(...gTriad.spots.map(sp => sp.f)) - Math.min(...gTriad.spots.map(sp => sp.f))
assert.ok(fretsSpan <= 4, `Triad grip should be comfortable (span <= 4, got ${fretsSpan})`)

// 8. Chord Tones Goal Builder
const cmaj7 = buildSoloGoal({ root: 'C', type: 'maj7', symbol: 'Cmaj7' }, 'sevenths', 5, 9)
assert.deepEqual(cmaj7.labels, ['R', '3', '5', '7'])
assert.deepEqual(cmaj7.targetPcs, [0, 4, 7, 11])
const amColor = buildSoloGoal({ root: 'A', type: 'm7', symbol: 'Am7' }, 'color', 5, 9)
assert.deepEqual(amColor.labels, ['b3', '5', 'b7', '9'])

// 9. Scoring, FEVER multipliers, grades & shortcuts
const hit1 = calcHitPoints(700, 1)
const hitFever = calcHitPoints(700, 15)
assert.equal(hit1.points, 100)
assert.equal(hitFever.points, 500)
assert.equal(sessionGrade(96, 1100), 'S')
assert.ok(shortcutTip(STD_GUITAR, { s: 2, f: 5, midi: 55, pc: 7 }).includes('fret-5 dot'))
assert.ok(shortcutTip(STD_GUITAR, { s: 2, f: 4, midi: 54, pc: 6 }).includes('Octave trick'))

// 10. Endless Mode waves, orb targeting (touch + guitar mic), and Boss armor
assert.equal(rushWaveSpec(1, 6).isBoss, false)
assert.equal(rushWaveSpec(5, 6).isBoss, true)
const orbA = { id: 1, spot: { s: 0, f: 5, midi: 45, pc: 9 }, label: 'A', x: 40, speed: 12, spawnedAt: 0 }
const orbC = { id: 2, spot: { s: 1, f: 3, midi: 48, pc: 0 }, label: 'C', x: 75, speed: 12, spawnedAt: 0 }
assert.equal(matchRushAttempt([orbA, orbC], null, { s: 0, f: 5 })?.kind, 'orb')
assert.equal(matchRushAttempt([orbA, orbC], null, { s: 0, f: 4 }), null)
assert.equal(matchRushAttempt([orbA, orbC], null, { midi: 48 })?.kind, 'orb')
// Phone-mic low-string octave tolerance (A2=45 often reads as A3=57 on phone mic)
assert.equal(matchRushAttempt([orbA], null, { midi: 57 })?.kind, 'orb')
// Single Track (Style 1): any matching pitch class in the active fret box hits the orb!
const singleHit = matchRushAttempt([orbA], null, { s: 1, f: 0 }, { singleTrack: true, midis: STD_GUITAR, fromFret: 0, toFret: 5 })
assert.equal(singleHit?.kind, 'orb')
assert.equal(singleHit && 'hitSpot' in singleHit ? singleHit.hitSpot?.s : -1, 1)
// Single Track rejects same note outside the active fret box
assert.equal(matchRushAttempt([orbA], null, { s: 0, f: 5 }, { singleTrack: true, midis: STD_GUITAR, fromFret: 7, toFret: 12 }), null)
const bossG = { id: 3, title: '👑 ALL 6 G', label: 'G', spots: spotsForPc(STD_GUITAR, 7, 0, 11, true), found: [], x: 60, speed: 3.5, spawnedAt: 0 }
assert.equal(matchRushAttempt([], bossG, { midi: 43 })?.kind, 'boss')

// 11. Phone <-> Tablet cloudSync merge
const phone = recordFretResult({ ...emptyFretGameData(), records: { ...emptyFretGameData().records, blitzScore: 2400, gauntletBpm: 95 } }, 'guitar:std', 0, 3, true, 850)
const tablet = recordFretResult({ ...emptyFretGameData(), records: { ...emptyFretGameData().records, blitzScore: 1800, survivalWave: 14 } }, 'guitar:std', 4, 8, true, 920)
const merged = mergeFretGameData(phone, tablet)
assert.equal(merged.records.blitzScore, 2400)
assert.equal(merged.records.gauntletBpm, 95)
assert.equal(merged.records.survivalWave, 14)
assert.ok(merged.heat['guitar:std']['0:3'] && merged.heat['guitar:std']['4:8'])

console.log('fretboard-game: all checks passed!')

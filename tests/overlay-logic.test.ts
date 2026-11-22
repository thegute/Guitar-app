// Unit tests for Android Floating Overlay Bubble helpers (src/overlay/bridge.ts & src/overlay/handGuideHelper.ts)
import assert from 'node:assert/strict'
import { appendChordTrail, formatTrailForJam, guessBestScale, type TrailChord } from '../src/overlay/bridge'
import { scaleBoxesToHandGroups, voicingToHandGroup } from '../src/overlay/handGuideHelper'

let pass = 0
function test(name: string, fn: () => void) {
  fn()
  pass++
  console.log(`  ok  ${name}`)
}

console.log('overlay-logic tests')

test('appendChordTrail deduplicates back-to-back chords and caps history at maxLen', () => {
  let trail: TrailChord[] = []
  trail = appendChordTrail(trail, 'Em', 'E', true, 4, 1)
  trail = appendChordTrail(trail, 'Em', 'E', true, 4, 2) // consecutive duplicate ignored
  assert.equal(trail.length, 1)
  trail = appendChordTrail(trail, 'C', 'C', false, 4, 3)
  trail = appendChordTrail(trail, 'G', 'G', false, 4, 4)
  trail = appendChordTrail(trail, 'D', 'D', false, 4, 5)
  trail = appendChordTrail(trail, 'Em', 'E', true, 4, 6) // repeat later IS allowed and trims oldest
  assert.deepEqual(formatTrailForJam(trail), ['C', 'G', 'D', 'Em'])
})

test('guessBestScale picks musical pentatonic / mode suggestions for major, minor, and dominant 7', () => {
  const gMaj = guessBestScale('G', false, 'G')
  assert.match(gMaj, /G major pentatonic/)
  assert.match(gMaj, /E minor pentatonic/)

  const eMin = guessBestScale('E', true, 'Em')
  assert.match(eMin, /E minor pentatonic/)
  assert.match(eMin, /G maj/)

  const a7 = guessBestScale('A', false, 'A7')
  assert.match(a7, /Mixolydian/)
})

test('voicingToHandGroup converts open & barre chords into numbered 1-2-3-4 HandGroups', () => {
  const openEm = voicingToHandGroup({ frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] })
  assert.equal(openEm.open, true)
  assert.equal(openEm.base, 1)
  assert.equal(openEm.notes.length, 6)
  assert.equal(openEm.notes.find(n => n.string === 1)?.finger, 2)
  assert.equal(openEm.notes.find(n => n.string === 2)?.finger, 3)

  const barreAm = voicingToHandGroup({ frets: [5, 7, 7, 5, 5, 5], fingers: [1, 3, 4, 1, 1, 1], barres: [5] })
  assert.equal(barreAm.open, false)
  assert.equal(barreAm.base, 5)
  assert.deepEqual(barreAm.barre, { finger: 1, fret: 5, strings: [0, 3, 4, 5] })
})

test('scaleBoxesToHandGroups builds 5 pentatonic hand boxes with valid 0..4 finger assignments', () => {
  const stdGuitar = [40, 45, 50, 55, 59, 64]
  const boxes = scaleBoxesToHandGroups(9, true, stdGuitar) // A minor pentatonic
  assert.equal(boxes.length, 5)
  assert.equal(boxes[0].group.base, 5) // Box 1 starts at fret 5 (A on low E)
  for (const b of boxes) {
    assert.ok(b.group.notes.length >= 10, `box ${b.label} should have notes across strings`)
    for (const n of b.group.notes) {
      assert.ok(n.finger >= 0 && n.finger <= 4, `finger ${n.finger} out of 0..4 range`)
    }
  }
})

console.log(`overlay-logic: ${pass} passed`)

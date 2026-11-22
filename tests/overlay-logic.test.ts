// Unit tests for Android Floating Overlay Bubble helpers (src/overlay/bridge.ts)
import assert from 'node:assert/strict'
import { appendChordTrail, formatTrailForJam, guessBestScale, type TrailChord } from '../src/overlay/bridge'

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

console.log(`overlay-logic: ${pass} passed`)

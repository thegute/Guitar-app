// Unit tests for Universal Resizable / Movable / Minimizable / Zoomable Windows (Win.tsx & FloatCard.tsx)
import assert from 'node:assert/strict'
import { clampWinZoom, loadWinLayout, winBucket, winStorageKey } from '../src/components/Win'
import { clampCardZoom } from '../src/components/FloatCard'

// Minimal localStorage stub for Node
const store = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size },
}

let pass = 0
function test(name: string, fn: () => void) {
  store.clear()
  fn()
  pass++
  console.log(`  ok  ${name}`)
}

console.log('win-logic tests')

test('winBucket separates narrow Phone (<600) and wide Tablet (>=600) layouts', () => {
  assert.equal(winBucket(390), 'narrow')
  assert.equal(winBucket(599), 'narrow')
  assert.equal(winBucket(600), 'wide')
  assert.equal(winBucket(1120), 'wide')
  assert.equal(winStorageKey('learnCourse', 'narrow'), 'kg:win:learnCourse:narrow')
  assert.equal(winStorageKey('learnCourse', 'wide'), 'kg:win:learnCourse:wide')
})

test('loadWinLayout keeps narrow & wide separate and migrates legacy key cleanly', () => {
  store.set('kg:win:jam', JSON.stringify({ order: ['a', 'b'], hidden: [], height: { a: 240 } }))
  const migrated = loadWinLayout('jam', 'wide')
  assert.deepEqual(migrated.order, ['a', 'b'])
  assert.equal(migrated.height.a, 240)

  // Saving narrow separately does not overwrite wide
  store.set('kg:win:jam:narrow', JSON.stringify({ order: ['b', 'a'], hidden: ['a'], height: {}, zoom: { b: 1.2 } }))
  store.set('kg:win:jam:wide', JSON.stringify({ order: ['a', 'b'], hidden: [], height: {}, width: { a: 0.5 }, popped: ['b'] }))

  const narrow = loadWinLayout('jam', 'narrow')
  const wide = loadWinLayout('jam', 'wide')
  assert.deepEqual(narrow.order, ['b', 'a'])
  assert.equal(narrow.zoom?.b, 1.2)
  assert.equal(wide.width?.a, 0.5)
  assert.deepEqual(wide.popped, ['b'])
})

test('clampWinZoom & clampCardZoom stay within readable safe bounds', () => {
  assert.equal(clampWinZoom(0.2), 0.7)
  assert.equal(clampWinZoom(1.0), 1)
  assert.equal(clampWinZoom(1.25), 1.25)
  assert.equal(clampWinZoom(3.0), 1.6)

  assert.equal(clampCardZoom(0.1), 0.75)
  assert.equal(clampCardZoom(1.1), 1.1)
  assert.equal(clampCardZoom(2.5), 1.5)
})

console.log(`win-logic: ${pass} passed`)

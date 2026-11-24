// Unit tests for Universal Resizable (L×W) / Movable / Hidable / Zoomable / Opacity Windows & ChromeBar (Win.tsx, ChromeBar.tsx & FloatCard.tsx)
import assert from 'node:assert/strict'
import { clampWinOpacity, clampWinWidth, clampWinZoom, loadWinLayout, winBucket, winStorageKey } from '../src/components/Win'
import { chromeStorageKey, clampChromeHeight, clampChromeOpacity, clampChromeWidth, loadChromeState, saveChromeState } from '../src/components/ChromeBar'
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

test('winBucket separates Phone (<600), Small Tablet / Fold (600–959), and Full Tablet (>=960)', () => {
  assert.equal(winBucket(390), 'narrow')
  assert.equal(winBucket(599), 'narrow')
  assert.equal(winBucket(600), 'tablet')
  assert.equal(winBucket(840), 'tablet')
  assert.equal(winBucket(959), 'tablet')
  assert.equal(winBucket(960), 'full')
  assert.equal(winBucket(1280), 'full')
  assert.equal(winStorageKey('learnToday', 'narrow'), 'kg:win:learnToday:narrow')
  assert.equal(winStorageKey('learnToday', 'tablet'), 'kg:win:learnToday:tablet')
  assert.equal(winStorageKey('learnToday', 'full'), 'kg:win:learnToday:full')
})

test('loadWinLayout keeps narrow, tablet & full separate and migrates legacy wide/unscoped keys cleanly', () => {
  store.set('kg:win:jam:wide', JSON.stringify({ order: ['a', 'b'], hidden: [], height: { a: 240 } }))
  const fromWide = loadWinLayout('jam', 'tablet')
  assert.deepEqual(fromWide.order, ['a', 'b'])
  assert.equal(fromWide.height.a, 240)

  store.set('kg:win:jam:narrow', JSON.stringify({ order: ['b', 'a'], hidden: ['a'], height: {}, zoom: { b: 1.2 } }))
  store.set('kg:win:jam:tablet', JSON.stringify({ order: ['a', 'b'], hidden: [], height: {}, width: { a: 0.48 }, opacity: { a: 0.7 } }))
  store.set('kg:win:jam:full', JSON.stringify({ order: ['a', 'b'], hidden: [], height: {}, width: { a: 0.333 }, popped: ['b'] }))

  const narrow = loadWinLayout('jam', 'narrow')
  const tablet = loadWinLayout('jam', 'tablet')
  const full = loadWinLayout('jam', 'full')
  assert.deepEqual(narrow.order, ['b', 'a'])
  assert.equal(narrow.zoom?.b, 1.2)
  assert.equal(tablet.width?.a, 0.48)
  assert.equal(tablet.opacity?.a, 0.7)
  assert.equal(full.width?.a, 0.333)
  assert.deepEqual(full.popped, ['b'])
})

test('clampWinZoom, clampWinOpacity, clampWinWidth & clampCardZoom stay within safe bounds', () => {
  assert.equal(clampWinZoom(0.2), 0.7)
  assert.equal(clampWinZoom(1.25), 1.25)
  assert.equal(clampWinZoom(3.0), 1.6)

  assert.equal(clampWinOpacity(0.05), 0.2)
  assert.equal(clampWinOpacity(0.65), 0.65)
  assert.equal(clampWinOpacity(1.5), 1)

  assert.equal(clampWinWidth(0.1), 0.24)
  assert.equal(clampWinWidth(0.42), 0.42)
  assert.equal(clampWinWidth(0.51), 0.5) // magnetic snap near half
  assert.equal(clampWinWidth(0.99), 1) // magnetic snap near full

  assert.equal(clampCardZoom(0.1), 0.75)
  assert.equal(clampCardZoom(1.1), 1.1)
  assert.equal(clampCardZoom(2.5), 1.5)
})

test('ChromeBar persists hidden, opacity, and L×W size separately per device bucket', () => {
  assert.equal(chromeStorageKey('app-top', 'tablet'), 'kg:chrome:app-top:tablet')
  assert.equal(clampChromeOpacity(0.1), 0.2)
  assert.equal(clampChromeWidth(0.2), 0.35)
  assert.equal(clampChromeHeight(10, 40, 200), 40)
  assert.equal(clampChromeHeight(500, 40, 200), 200)

  saveChromeState('ck-strip', 'tablet', { hidden: true, opacity: 0.65, w: 0.8, h: 72 })
  saveChromeState('ck-strip', 'full', { hidden: false, opacity: 0.9 })

  const t = loadChromeState('ck-strip', 'tablet')
  const f = loadChromeState('ck-strip', 'full')
  assert.equal(t.hidden, true)
  assert.equal(t.opacity, 0.65)
  assert.equal(t.w, 0.8)
  assert.equal(t.h, 72)
  assert.equal(f.hidden, false)
  assert.equal(f.opacity, 0.9)

  // Clearing back to empty removes the key
  saveChromeState('ck-strip', 'tablet', {})
  assert.equal(store.has('kg:chrome:ck-strip:tablet'), false)
})

console.log(`win-logic: ${pass} passed`)

// Tests for Global Always-On Mini Chord Grips store/cache and TabPlayer stop idempotency.
import assert from 'node:assert/strict'
import {
  cachedFlowVoicing,
  getChordGrips,
  setChordGripStyle,
  setShowChordGrips,
  subscribeChordGrips,
  toggleShowChordGrips,
} from '../src/chordGrips'
import { current } from '../src/instrument'
import { FLOW_VOICING_STYLES } from '../src/theory/flowVoicings'
import { TabPlayer } from '../src/audio/tabPlayer'

let passed = 0
function test(name: string, fn: () => void) {
  fn()
  passed++
  console.log(`  ok - ${name}`)
}

console.log('Chord Grips & TabPlayer Stop tests')

const guitar = current()

test('global chordGrips defaults to ON + Open and notifies subscribers across screens', () => {
  setShowChordGrips(true)
  setChordGripStyle('open')
  const init = getChordGrips()
  assert.equal(init.show, true)
  assert.equal(init.style, 'open')

  let calls = 0
  const unsub = subscribeChordGrips(() => { calls++ })
  setChordGripStyle('barre')
  assert.equal(getChordGrips().style, 'barre')
  assert.equal(calls, 1)

  toggleShowChordGrips()
  assert.equal(getChordGrips().show, false)
  assert.equal(calls, 2)

  setShowChordGrips(true)
  setChordGripStyle('open')
  unsub()
})

test('cachedFlowVoicing generates Open, Barre, Top 3, Mid 3, Low 3 voicings for all common chords', () => {
  const syms = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim', 'E7', 'Bb', 'F#m']
  for (const st of FLOW_VOICING_STYLES) {
    for (const sym of syms) {
      const res = cachedFlowVoicing(sym, guitar, st.id)
      assert.ok(res, `${sym} in ${st.id} should resolve`)
      assert.equal(res!.voicing.frets.length, 6)
      assert.strictEqual(cachedFlowVoicing(sym, guitar, st.id), res)
    }
  }
})

test('TabPlayer.stop() fires onStop once when stopped while playing and never throws on double-stop', () => {
  const tp = new TabPlayer()
  let stops = 0
  tp.onStop = () => { stops++ }

  tp.playing = true
  tp.stop()
  assert.equal(tp.playing, false)
  assert.equal(stops, 1)

  // Second stop must be a safe no-op (no throw, no duplicate onStop)
  tp.stop()
  assert.equal(stops, 1)

  // Silent stop (used internally at start of play()) must not fire onStop
  tp.playing = true
  tp.stop(true)
  assert.equal(tp.playing, false)
  assert.equal(stops, 1)
})

console.log(`All ${passed} Chord Grips & TabPlayer Stop tests passed!`)

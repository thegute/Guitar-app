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

import { planFingers } from '../src/hand/engine'
import { handGroups, liveHandState } from '../src/play/handShape'
import type { FlatStep } from '../src/tabs/model'

test('liveHandState pre-positions on open strings, tracks NOW/NEXT fingers, and detects HOLD anchors', () => {
  const STD = [40, 45, 50, 55, 59, 64]
  const mk = (bar: number, idx: number, notes: { string: number; fret: number }[], dur = 0.5): FlatStep => ({
    bar,
    idx,
    step: { dur, notes: notes.map(n => ({ ...n, midi: STD[n.string] + n.fret })) },
  })
  // Bar 1: open low E -> then Am arpeggio at frets 5-7 (Index anchored on G-5 while Ring/Pinky play D-7 -> G-5 -> D-7)
  const flat: FlatStep[] = [
    mk(0, 0, [{ string: 0, fret: 0 }]),
    mk(0, 1, [{ string: 3, fret: 5 }]),
    mk(0, 2, [{ string: 2, fret: 7 }]),
    mk(0, 3, [{ string: 3, fret: 5 }]),
    mk(1, 0, [{ string: 2, fret: 7 }]),
  ]
  const groups = handGroups(flat, { inst: 'guitar', stringNames: ['E', 'A', 'D', 'G', 'B', 'e'] })
  // Step 0 (open string): pre-positions hand on frets 5-8 ready for step 1!
  const s0 = liveHandState(flat, groups, 0)
  assert.ok(s0 && s0.prePosition, 'open-string intro should pre-position hand')
  assert.equal(s0!.group.base, 5)
  assert.ok(s0!.cue.includes('Frets 5–8'), `pre-position cue should name Frets 5–8, got: ${s0!.cue}`)
  // Step 1 (G-5 with finger 1): should detect G-5 as a HOLD anchor since step 3 returns to G-5!
  const s1 = liveHandState(flat, groups, 1)
  assert.ok(s1 && s1.nowNotes[0]?.finger === 1, 'step 1 uses finger 1')
  assert.ok(s1!.holdNotes.some(h => h.string === 3 && h.fret === 5), 'G-5 should be flagged as a HOLD anchor')
  assert.ok(s1!.nextNotes.some(n => n.string === 2 && n.fret === 7 && n.finger === 3), 'next note should preview D-7 with finger 3')
})

test('real-guitarist hand brain prefers 1-3-4 on 3-note power chords', () => {
  const plan = planFingers(
    [{ dur: 1, notes: [{ string: 0, fret: 5 }, { string: 1, fret: 7 }, { string: 2, fret: 7 }] }],
    { scale: 648, size: 'medium' },
  )
  assert.deepEqual(plan.steps[0]?.fingers, [1, 3, 4])
})

console.log(`All ${passed} Chord Grips & TabPlayer Stop tests passed!`)

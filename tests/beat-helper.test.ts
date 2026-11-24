// Unit tests for the Smart Beat Helper & 5-Step Guided Beat Coach engine (src/studio/beatHelper.ts)
import assert from 'node:assert/strict'
import { STARTERS, totalSteps, type Beat } from '../src/studio/beat'
import {
  GUIDE_STEPS, QUICK_VIBES,
  applyAutoBassline, applyAutoChords, applyAutoDrumFill, applyAutoFullSong,
  applyBounceAndGhosts, applyGuideStep, applyProHatRolls, applyRemixVariation,
  clearAllDrums, clearDrumRow, copyBar1ToRest, fillDrumRow, loadQuickVibe, stepRulerLabel,
} from '../src/studio/beatHelper'

let passed = 0
function test(name: string, fn: () => void) {
  fn()
  passed++
}

const emptyBeat = (): Beat => STARTERS.find(s => s.id === 'empty')!.make()
const rockBeat = (): Beat => STARTERS.find(s => s.id === 'rock')!.make()
const trapBeat = (): Beat => STARTERS.find(s => s.id === 'trap')!.make()

test('stepRulerLabel maps 16th steps to 1 e & a 2 e & a 3 e & a 4 e & a', () => {
  const bar = Array.from({ length: 16 }, (_, i) => stepRulerLabel(i)).join(' ')
  assert.equal(bar, '1 e & a 2 e & a 3 e & a 4 e & a')
  assert.equal(stepRulerLabel(16), '1')
  assert.equal(stepRulerLabel(31), 'a')
})

test('QUICK_VIBES all resolve to valid Starter beats', () => {
  assert.ok(QUICK_VIBES.length >= 8)
  for (const v of QUICK_VIBES) {
    const res = loadQuickVibe(v.id)
    assert.ok(res, `Expected starter for ${v.id}`)
    assert.ok(res!.beat.bpm >= 40 && res!.beat.bpm <= 220)
    assert.ok(res!.tip.length > 10)
  }
  assert.equal(loadQuickVibe('nonexistent-vibe'), null)
})

test('applyBounceAndGhosts adds ghost snares, natural accents, and subtle swing', () => {
  const b0 = rockBeat()
  const res = applyBounceAndGhosts(b0)
  const snare = res.beat.rows.find(r => r.voice === 'snare')
  assert.ok(snare, 'snare row exists')
  const ghosts = snare!.steps.filter(v => v > 0 && v < 0.45)
  assert.ok(ghosts.length >= 4, `expected ghost snare hits, got ${ghosts.length}`)
  assert.ok(res.beat.swing >= 0.08, `expected pocket swing, got ${res.beat.swing}`)
  assert.ok(/ghost/i.test(res.tip))
  // Does not mutate input beat
  assert.equal(b0.swing, 0)
})

test('applyProHatRolls creates hat row if empty, adds ×2/×3 ratchets and open-hat lift', () => {
  const b0 = emptyBeat()
  const res = applyProHatRolls(b0)
  const hat = res.beat.rows.find(r => r.voice === 'hat')
  const open = res.beat.rows.find(r => r.voice === 'open')
  assert.ok(hat, 'hat row created')
  assert.ok(hat!.steps.some(v => v > 0), 'hat has hits')
  assert.ok(hat!.rat?.some(r => r >= 2), 'hat has ×2/×3 ratchets')
  assert.ok(open?.steps.some(v => v > 0), 'open hat lift added')
})

test('applyAutoDrumFill writes tom walk-down on acoustic kit and snare roll on 808 kit + crash on step 0', () => {
  const rockRes = applyAutoDrumFill(rockBeat())
  assert.ok(rockRes.beat.rows.some(r => r.voice === 'tom1' && r.steps.some(v => v > 0)), 'acoustic fill uses tom1')
  assert.ok(rockRes.beat.rows.some(r => r.voice === 'tom3' && r.steps.some(v => v > 0)), 'acoustic fill uses tom3')
  const crash = rockRes.beat.rows.find(r => r.voice === 'crash')
  assert.ok(crash && crash.steps[0] > 0, 'beat-1 crash added')

  const trapRes = applyAutoDrumFill(trapBeat())
  const snare = trapRes.beat.rows.find(r => r.voice === 'snare')
  const lastStep = totalSteps(trapRes.beat) - 1
  assert.ok(snare && snare.steps[lastStep] > 0.8 && (snare.rat?.[lastStep] ?? 1) >= 2, 'electronic fill builds snare ratchet on last step')
})

test('applyAutoBassline locks to kick drum and replaces existing bass cleanly', () => {
  let b = emptyBeat()
  b = { ...b, key: 'G', minor: false, bars: 2, kit: 'studio' }
  b = { ...b, rows: [{ voice: 'kick', steps: Array.from({ length: 32 }, (_, i) => (i % 16 === 0 || i % 16 === 6 || i % 16 === 10 ? 0.95 : 0)) }] }
  const r1 = applyAutoBassline(b)
  const bass1 = r1.beat.tracks.find(t => t.inst === 'bass')
  assert.ok(bass1, 'electric bass track added')
  assert.equal(bass1!.notes.filter(n => n.s < 16).map(n => n.s).join(','), '0,6,10', 'bar 1 bass locks to kick steps')
  // Calling again replaces instead of duplicating bass tracks
  const r2 = applyAutoBassline(r1.beat)
  assert.equal(r2.beat.tracks.filter(t => t.inst === 'bass').length, 1)
})

test('applyAutoChords adds harmonic chord track matching key & kit without wiping bass', () => {
  const b0 = applyAutoBassline({ ...emptyBeat(), key: 'A', minor: true, kit: 'lofi', bars: 4 }).beat
  const res = applyAutoChords(b0)
  assert.equal(res.beat.tracks.length, 2, 'keeps bass + adds chords')
  const ep = res.beat.tracks.find(t => t.inst === 'epiano')
  assert.ok(ep && ep.notes.length >= 12, 'epiano chord notes created across 4 bars')
  // Re-running replaces chord track cleanly
  const res2 = applyAutoChords(res.beat)
  assert.equal(res2.beat.tracks.length, 2)
})

test('applyRemixVariation preserves kick/snare backbone across all 3 variants', () => {
  const b0 = rockBeat()
  for (let v = 0; v < 3; v++) {
    const res = applyRemixVariation(b0, v)
    assert.ok(res.beat.rows.find(r => r.voice === 'kick')?.steps.some(x => x > 0))
    assert.ok(res.beat.rows.find(r => r.voice === 'snare')?.steps.some(x => x > 0))
    assert.ok(res.tip.startsWith('Remix:'))
  }
})

test('applyAutoFullSong creates A/B/C/D parts and turns on Song Mode', () => {
  const res = applyAutoFullSong(rockBeat())
  assert.equal(res.beat.chainOn, true)
  assert.equal((res.beat.chain ?? []).join(''), 'AABABCBD')
  assert.ok(res.beat.parts?.B && res.beat.parts?.C && res.beat.parts?.D)
})

test('5-step Guided Beat Coach builds a complete beat from scratch', () => {
  assert.equal(GUIDE_STEPS.length, 5)
  let b = emptyBeat()
  for (let s = 0; s < 5; s++) {
    const res = applyGuideStep(b, s as 0 | 1 | 2 | 3 | 4)
    b = res.beat
    assert.ok(res.tip.includes(`Step ${s + 1}`))
  }
  assert.ok(b.rows.some(r => r.voice === 'kick' && r.steps.some(x => x > 0)), 'has kick')
  assert.ok(b.rows.some(r => r.voice === 'snare' && r.steps.some(x => x > 0)), 'has snare')
  assert.ok(b.rows.some(r => r.voice === 'hat' && r.steps.some(x => x > 0)), 'has hat')
  assert.ok(b.tracks.length >= 2, 'has bass + chords')
  assert.ok(b.rows.some(r => r.voice === 'crash' && r.steps[0] > 0), 'has turnaround crash')
})

test('copyBar1ToRest, fillDrumRow, clearDrumRow, clearAllDrums work cleanly', () => {
  let b = emptyBeat()
  b = { ...b, bars: 1 }
  b = fillDrumRow(b, 'kick', 4, 0, 0.9)
  assert.equal(b.rows[0].steps.filter(x => x > 0).length, 4)

  const copied = copyBar1ToRest(b)
  assert.equal(copied.beat.bars, 2, 'expands 1-bar beat to 2 bars when copying')
  assert.equal(copied.beat.rows[0].steps.filter(x => x > 0).length, 8)

  const clearedRow = clearDrumRow(copied.beat, 'kick')
  assert.equal(clearedRow.rows[0].steps.filter(x => x > 0).length, 0)

  const clearedAll = clearAllDrums(rockBeat())
  assert.ok(clearedAll.beat.rows.every(r => r.steps.every(x => x === 0)))
})

console.log(`beat-helper: ${passed} / ${passed} passed`)

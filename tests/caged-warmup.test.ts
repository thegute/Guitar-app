import assert from 'node:assert/strict'
import { current, setInstrument } from '../src/instrument'
import { pc } from '../src/theory/notes'
import {
  buildCagedWarmupSong,
  buildWarmupStages,
  CIRCLE_OF_4THS,
  explainCagedShape,
  explainFlow,
  explainInversion,
  explainWarmupStep,
  fullBoxResolve,
  handGroupForStage,
  keyOfTheDay,
  loadWarmupMastery,
  markWarmupDone,
  nextCircleOf4ths,
  TRIAD_SUBSETS,
  type TriadSubset,
  type WarmupStepId,
} from '../src/learn/cagedWarmup'

// Mock localStorage in Node test env
const store = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() { return store.size },
}

setInstrument('guitar')
const guitar = current()
setInstrument('tenor')
const uke = current()
setInstrument('guitar')

// 1. All 12 keys × Major & Minor × All 5 steps build clean stages going UP & BACK DOWN
for (const key of CIRCLE_OF_4THS) {
  const rootPc = pc(key)
  for (const minor of [false, true]) {
    for (const step of [1, 2, 3, 4, 5] as WarmupStepId[]) {
      const stages = buildWarmupStages({ rootPc, minor, inst: guitar, step, scope: 'all', flow: 'classic' })
      assert.ok(stages.length >= 9, `Expected >= 9 up+down stages for ${key}${minor ? 'm' : ''} step ${step}, got ${stages.length}`)
      assert.equal(stages[0].journey, 'up')
      assert.equal(stages[stages.length - 1].journey, 'down')
      for (const st of stages) {
        assert.ok(st.notes.length > 0, `Empty notes for ${key} step ${step} shape ${st.shape.letter}`)
        // Classic mode: up journey ascends, down journey descends
        assert.equal(st.playDir, st.journey === 'up' ? 'asc' : 'desc')
        // Full-Box Resolve invariant for Steps 3, 4, 5: starts & ends on Root AND visits every note in the box!
        if (step >= 3) {
          assert.equal(st.notes[0].isRoot, true, `Step ${step} ${key} ${st.label} must start on Root`)
          assert.equal(st.notes[st.notes.length - 1].isRoot, true, `Step ${step} ${key} ${st.label} must end on Root`)
          const visited = new Set(st.notes.map(n => n.midi))
          for (const bn of st.boxNotes) {
            assert.ok(visited.has(bn.midi), `Full-Box Resolve missed midi ${bn.midi} in ${key} step ${step} ${st.label}`)
          }
        }
      }
    }
  }
}

// 2. Snake Flow alternates playDir strictly (asc, desc, asc, desc...)
{
  const snakeStages = buildWarmupStages({ rootPc: pc('A'), minor: true, inst: guitar, step: 4, scope: 'all', flow: 'snake' })
  for (let i = 0; i < snakeStages.length; i++) {
    assert.equal(snakeStages[i].playDir, i % 2 === 0 ? 'asc' : 'desc')
    assert.equal(snakeStages[i].notes[0].isRoot, true)
    assert.equal(snakeStages[i].notes[snakeStages[i].notes.length - 1].isRoot, true)
  }
}

// 3. Single-shape lockdown produces 2 passes (up + down) of ONLY that chosen shape
{
  const gOnly = buildWarmupStages({ rootPc: pc('D'), minor: true, inst: guitar, step: 5, scope: 'G', flow: 'classic' })
  assert.equal(gOnly.length, 2)
  assert.equal(gOnly[0].shape.letter, 'G')
  assert.equal(gOnly[1].shape.letter, 'G')
  assert.equal(gOnly[0].playDir, 'asc')
  assert.equal(gOnly[1].playDir, 'desc')
}

// 4. Step 2 Triad Subsets produce valid 3-unique-chord-tone triads with inversion labels across all 4 string sets
for (const subset of ['top3', 'mid3', 'lowmid3', 'bot3'] as TriadSubset[]) {
  for (const minor of [false, true]) {
    const stages = buildWarmupStages({ rootPc: pc('C'), minor, inst: guitar, step: 2, scope: 'all', flow: 'classic', triadSubset: subset })
    for (const st of stages) {
      assert.ok(st.triad, `Expected triad for ${subset} ${minor ? 'Cm' : 'C'} ${st.label}`)
      assert.equal(st.triad!.strings.length, 3)
      const pcs = new Set(st.boxNotes.map(n => n.pc))
      assert.equal(pcs.size, 3, `Triad subset ${subset} in ${st.label} must have all 3 unique chord tones (R, 3rd, 5th)`)
      assert.ok(['Root pos', '1st inv', '2nd inv'].includes(st.triad!.inversion))
    }
  }
}

// 5. Full-Box Resolve edge cases (Root at bottom, Root in middle, Root at top)
{
  const mk = (midi: number, isRoot: boolean) => ({ string: 0, fret: midi - 40, midi, pc: midi % 12, interval: isRoot ? 'R' : '2', isRoot, isChord: isRoot })
  const midRootBox = [mk(40, false), mk(43, false), mk(45, true), mk(47, false), mk(50, false)]
  const asc = fullBoxResolve(midRootBox, 'asc')
  assert.deepEqual(asc.map(n => n.midi), [45, 47, 50, 47, 45, 43, 40, 43, 45])
  const desc = fullBoxResolve(midRootBox, 'desc')
  assert.deepEqual(desc.map(n => n.midi), [45, 43, 40, 43, 45, 47, 50, 47, 45])
}

// 6. Playable Song export (single step & complete 5-step mega-routine) + HandGroup + Uke compatibility
{
  const mega = buildCagedWarmupSong({ rootPc: pc('G'), minor: false, inst: guitar, steps: [1, 2, 3, 4, 5], scope: 'all', flow: 'classic', triadSubset: 'top3', bpm: 90 })
  assert.equal(mega.tracks.length, 1)
  assert.ok(mega.tracks[0].bars.length >= 20, `Expected full 5-step routine to have >= 20 bars, got ${mega.tracks[0].bars.length}`)
  for (const bar of mega.tracks[0].bars) {
    assert.ok(bar.steps.length > 0)
    for (const s of bar.steps) {
      assert.ok(s.dur > 0)
      for (const n of s.notes) {
        assert.ok(n.string >= 0 && n.string < 6)
        assert.ok(n.fret >= 0 && n.fret <= 20)
      }
    }
  }
  const ukeStages = buildWarmupStages({ rootPc: pc('C'), minor: false, inst: uke, step: 4, scope: 'all', flow: 'classic' })
  assert.ok(ukeStages.length >= 5)
  const hg = handGroupForStage(ukeStages[0])
  assert.ok(hg.notes.length > 0)
}

// 7. Circle of 4ths rotation, mastery persistence & plain-English coach explanations
{
  assert.equal(nextCircleOf4ths('C'), 'F')
  assert.equal(nextCircleOf4ths('G'), 'C')
  assert.ok((CIRCLE_OF_4THS as readonly string[]).includes(keyOfTheDay(new Date('2026-11-22T12:00:00Z'))))
  assert.deepEqual(loadWarmupMastery(), {})
  markWarmupDone('C', false, 85)
  markWarmupDone('C', false, 70) // keeps highest BPM
  markWarmupDone('A', true, 95)
  const m = loadWarmupMastery()
  assert.equal(m['C-maj'], 85)
  assert.equal(m['A-min'], 95)

  for (const step of [1, 2, 3, 4, 5] as WarmupStepId[]) {
    const exp = explainWarmupStep({ step, keyName: 'Am', minor: true, flow: 'snake', triadSubset: 'top3', triadInversion: '1st inv' })
    assert.ok(exp.what.length > 20 && exp.why.length > 20 && exp.how.length > 20 && exp.watch.length > 20)
  }
  assert.ok(explainInversion('1st inv', true).includes('♭3rd'))
  assert.ok(explainCagedShape('G', true).includes('Triad Subsets'))
  assert.ok(explainFlow('snake').includes('Snake Flow'))
  assert.equal(TRIAD_SUBSETS.length, 5)
}

console.log('caged 5-step warmup engine, triad subsets, full-box resolve & coach guides: ok')

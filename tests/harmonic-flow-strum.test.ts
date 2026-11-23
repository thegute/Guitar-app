import './test-env'
import assert from 'node:assert/strict'
import {
  BUILTIN_STRUM_CHARTS,
  MAJOR_NODES,
  MINOR_NODES,
  PATHFINDER_CHALLENGES,
  STRUM_STYLES,
  chartForScale,
  deleteUserStrumChart,
  detectFlowChord,
  flowNodeForChordSymbol,
  getFlowBranches,
  getFlowNodes,
  loadUserStrumCharts,
  matchCandidateChord,
  parseChordQual,
  randomPathfinderGoal,
  saveUserStrumChart,
  transposeChordSymbol,
  transposeStrumChart,
} from '../src/theory/harmonicFlow'
import { addGuitarChordChroma } from '../src/audio/chroma'
import { FLOW_VOICING_STYLES, voicingForFlowChord } from '../src/theory/flowVoicings'
import { setBassPacks, setPackSounds } from '../src/audio/packSounds'
import { allInstrs, instr } from '../src/studio/sounds'
import { layerSpots } from '../src/theory/layers'
import { current } from '../src/instrument'
import { filterTierDuplicates, groupUnpackedFolders } from '../src/components/SoundPacks'
import { CHORD_VIBE_SETS, buildKeyShiftBridges, detectScalesFromPcs, resolveVibeSet } from '../src/theory/scalerSuite'
import { exportStrumChartToMidi, importMidiToStrumChart } from '../src/audio/midiChords'
import { FEATURE_INTROS, dismissFeatureIntro, isFeatureIntroDismissed, resetAllFeatureIntros } from '../src/components/FeatureIntro'

let passed = 0
function test(name: string, fn: () => void) {
  fn()
  passed++
  console.log(`  ok - ${name}`)
}

console.log('Harmonic Flow Coach & Strum Grid tests')

test('dual-labeled nodes transpose chord names while locking Roman numerals', () => {
  const cNodes = getFlowNodes('C', false, 0)
  const gNodes = getFlowNodes('G', false, 0)
  const cVi = cNodes.find(n => n.id === 'vi')!
  const gVi = gNodes.find(n => n.id === 'vi')!
  assert.equal(cVi.symbol, 'Am')
  assert.equal(cVi.roman, 'vi')
  assert.equal(gVi.symbol, 'Em')
  assert.equal(gVi.roman, 'vi')

  const cIv = cNodes.find(n => n.id === 'iv')!
  const gIv = gNodes.find(n => n.id === 'iv')!
  assert.equal(cIv.symbol, 'Fm')
  assert.equal(gIv.symbol, 'Cm')
  assert.equal(cIv.roman, 'iv')
  assert.equal(gIv.roman, 'iv')
})

test('capo recalculates guitar display shapes while preserving concert pitch', () => {
  const aCapo2 = getFlowNodes('A', false, 2)
  const home = aCapo2.find(n => n.id === 'I')!
  assert.equal(home.symbol, 'A')
  assert.equal(home.capoSymbol, 'G')
  assert.equal(home.roman, 'I')
})

test('spice dial filters branches cleanly from campfire to pop to jazz', () => {
  const camp = getFlowBranches('I', 'C', false, 'campfire', 0, 10)
  const pop = getFlowBranches('I', 'C', false, 'pop', 0, 10)
  const jazz = getFlowBranches('I', 'C', false, 'jazz', 0, 10)
  assert.ok(camp.branches.every(b => b.flavor === 'diatonic'))
  assert.ok(pop.branches.some(b => b.flavor === 'pull' || b.flavor === 'color'))
  assert.ok(jazz.branches.length >= pop.branches.length)
})

test('minor key harmonic tree resolves i, bVI, bVII, V7 and Phrygian bII', () => {
  const am = getFlowNodes('A', true, 0)
  assert.equal(am.find(n => n.id === 'i')?.symbol, 'Am')
  assert.equal(am.find(n => n.id === 'bVI')?.symbol, 'F')
  assert.equal(am.find(n => n.id === 'bVII')?.symbol, 'G')
  assert.equal(am.find(n => n.id === 'V7')?.symbol, 'E7')
  assert.equal(am.find(n => n.id === 'bII')?.symbol, 'Bb')
  assert.equal(flowNodeForChordSymbol('E7', 'A', true), 'V7')
})

test('candidate-constrained chord matcher distinguishes orbiting chords accurately', () => {
  const { branches } = getFlowBranches('I', 'C', false, 'pop', 0, 5)
  const cands = branches.map(b => ({ id: b.node.id, symbol: b.node.symbol, rootPc: b.node.rootPc, qual: b.node.qual }))
  // Synthetic chroma for Am (A=9, C=0, E=4)
  const amChroma = new Array(12).fill(0.01)
  amChroma[9] = 0.45
  amChroma[0] = 0.28
  amChroma[4] = 0.25
  const hit = matchCandidateChord(amChroma, undefined, cands)
  assert.ok(hit)
  assert.equal(hit.symbol, 'Am')
  assert.ok(hit.score > 0.8)
  assert.ok(hit.margin > 0.1)
})

test('all 12 Pathfinder challenges reference valid start and goal nodes & random goal works', () => {
  assert.equal(PATHFINDER_CHALLENGES.length, 12)
  const majIds = new Set(MAJOR_NODES.map(n => n.id))
  const minIds = new Set(MINOR_NODES.map(n => n.id))
  for (const ch of PATHFINDER_CHALLENGES) {
    const ids = ch.minor ? minIds : majIds
    assert.ok(ids.has(ch.startId), `${ch.id} invalid start ${ch.startId}`)
    assert.ok(ids.has(ch.goalId), `${ch.id} invalid goal ${ch.goalId}`)
    assert.ok(ch.maxSteps >= 2)
  }
  const rndMaj = randomPathfinderGoal('pop', false)
  const rndMin = randomPathfinderGoal('jazz', true)
  assert.ok(majIds.has(rndMaj.goalId))
  assert.ok(minIds.has(rndMin.goalId))
})

test('18 multi-genre Strum Grid styles and 16 built-in charts include bluegrass, reggae, metal, djent & orchestra', () => {
  assert.equal(STRUM_STYLES.length, 18)
  assert.equal(BUILTIN_STRUM_CHARTS.length, 16)
  const ids = new Set(STRUM_STYLES.map(s => s.id))
  for (const req of ['bluegrass', 'reggae', 'metal-chug', 'metal-gallop', 'djent', 'orchestra', 'cinematic', 'rhodes', 'organ', 'funk', 'ambient'] as const) {
    assert.ok(ids.has(req), `missing style ${req}`)
  }
})

test('StrumChart transposition, persistence, and scale-to-chart builder work cleanly', () => {
  assert.equal(transposeChordSymbol('Am7', 2, false), 'Bm7')
  const bg = BUILTIN_STRUM_CHARTS[0]
  const inA = transposeStrumChart(bg, 'A')
  assert.equal(inA.tonic, 'A')
  assert.equal(inA.bars[0].chords[0], 'A')

  const custom = { ...bg, id: 'test-custom-1', name: 'My Custom Groove' }
  saveUserStrumChart(custom)
  assert.ok(loadUserStrumCharts().some(c => c.id === 'test-custom-1'))
  deleteUserStrumChart('test-custom-1')
  assert.ok(!loadUserStrumCharts().some(c => c.id === 'test-custom-1'))

  const metalChart = chartForScale('E', 'phrygian', 'metal-chug')
  assert.equal(metalChart.bars[0].chords[0], 'E5')
  assert.equal(metalChart.bars[2].chords[0], 'F5')
  const parsed = parseChordQual('F#m7')
  assert.deepEqual(parsed, { rootPc: 6, qual: 'm7' })
})

test('Beat Maker allInstrs exposes imported .kgpack guitars and harvested Studio Bass / JamBass packs', () => {
  setPackSounds([
    { id: 'dracus', name: 'Evolution Dracus Metal', kind: 'guitar' },
    { id: 'picked-acoustic', name: 'Picked Acoustic', kind: 'guitar' },
  ])
  setBassPacks(['jambass', 'studiobass-modern'])
  const list = allInstrs()
  assert.ok(list.some(i => i.id === 'pack:dracus'))
  assert.ok(list.some(i => i.id === 'pack:picked-acoustic'))
  assert.ok(list.some(i => i.id === 'bass:sixties'))
  assert.ok(list.some(i => i.id === 'bass:modern'))
  assert.equal(instr('pack:dracus').guitar, 'pack:dracus')
})

test('5-Layer Neck whole-neck window covers frets 0..15 across all layers', () => {
  const res = layerSpots({
    rootPc: 9,
    minor: true,
    inst: current(),
    layers: new Set(['caged', 'triads', 'penta', 'bridge', 'free']),
    mode: 'aeolian',
    window: [0, 15],
  })
  const frets = [...res.spots.values()].map(s => s.f)
  assert.ok(Math.min(...frets) <= 1, 'includes open/low frets')
  assert.ok(Math.max(...frets) >= 14, 'reaches high frets up to 15')
})

test('SoundPacks folder importer filters Studio/Pocket duplicates and groups multi-pack subfolders', () => {
  const mixed = [
    { name: 'dracus.kgpack' },
    { name: 'dracus-pocket.kgpack' },
    { name: 'jambass.kgpack' },
    { name: 'jambass-pocket.kgpack' },
    { name: 'studiobass-modern.kgpack' },
  ]
  const studio = filterTierDuplicates(mixed, 'studio').map(x => x.name).sort()
  const pocket = filterTierDuplicates(mixed, 'pocket').map(x => x.name).sort()
  assert.deepEqual(studio, ['dracus.kgpack', 'jambass.kgpack', 'studiobass-modern.kgpack'])
  assert.deepEqual(pocket, ['dracus-pocket.kgpack', 'jambass-pocket.kgpack', 'studiobass-modern.kgpack'])

  const unpacked = groupUnpackedFolders([
    { name: 'pack.json', path: 'packs/dracus/pack.json' },
    { name: 'n40.ogg', path: 'packs/dracus/sustain/n40.ogg' },
    { name: 'pack.json', path: 'packs/agsj/pack.json' },
    { name: 'n45.ogg', path: 'packs/agsj/sustain/n45.ogg' },
  ])
  assert.equal(unpacked.length, 2)
  assert.equal(unpacked[0].length, 2)
  assert.equal(unpacked[1].length, 2)
})

test('Chord Vibe Sets resolve all 8 genres cleanly in any key', () => {
  assert.equal(CHORD_VIBE_SETS.length, 8)
  const neoG = resolveVibeSet('neosoul', 'G')
  assert.equal(neoG[0].symbol, 'Gmaj7')
  const metalE = resolveVibeSet('metal', 'E')
  assert.equal(metalE[0].symbol, 'E5')
  assert.ok(metalE.some(c => c.symbol === 'F5')) // Phrygian bII5 in E
})

test('Key Shifter builds 3 smooth bridges from Key A to Key B', () => {
  const bridges = buildKeyShiftBridges('C', false, 'Eb', false)
  assert.equal(bridges.length, 3)
  for (const b of bridges) {
    assert.equal(b.steps[0].symbol, 'C')
    assert.equal(b.steps[b.steps.length - 1].symbol, 'Eb')
    assert.ok(b.steps.length >= 3)
  }
})

test('Detect Scale ranks matching scales and modes accurately', () => {
  // D Dorian: D(2), E(4), F(5), G(7), A(9), B(11), C(0)
  const dorian = detectScalesFromPcs([2, 4, 5, 7, 9, 11, 0], 6)
  assert.ok(dorian.some(m => m.root === 'D' && m.scaleId === 'dorian'))
  // A Minor Pentatonic: A(9), C(0), D(2), E(4), G(7)
  const amp = detectScalesFromPcs([9, 0, 2, 4, 7], 6)
  assert.equal(amp[0].root, 'A')
  assert.ok(amp.some(m => m.root === 'A' && m.scaleId === 'minor pentatonic'))
})

test('MIDI chord export and import round-trip Strum Machine charts cleanly', () => {
  const src = BUILTIN_STRUM_CHARTS[0] // Bluegrass G-C-D
  const midi = exportStrumChartToMidi(src)
  assert.equal(String.fromCharCode(...midi.slice(0, 4)), 'MThd')
  const round = importMidiToStrumChart(midi, 'bluegrass.mid')
  assert.equal(round.bpm, src.bpm)
  assert.equal(round.bars.length, src.bars.length)
  assert.equal(round.bars[0].chords[0], 'G')
})

test('FeatureIntro registry covers all core features and dismiss/reset persists cleanly', () => {
  for (const id of ['play', 'songs', 'learn', 'jam', 'strum', 'chord-path', 'vibe-sets', 'key-shifter', 'detect-scale', 'beats', 'loop', 'find', 'tuner', 'metronome', 'chords', 'scales']) {
    assert.ok(FEATURE_INTROS[id], `missing FeatureIntro for ${id}`)
  }
  resetAllFeatureIntros()
  assert.equal(isFeatureIntroDismissed('key-shifter'), false)
  dismissFeatureIntro('key-shifter')
  assert.equal(isFeatureIntroDismissed('key-shifter'), true)
  resetAllFeatureIntros()
  assert.equal(isFeatureIntroDismissed('key-shifter'), false)
})

test('detectFlowChord rejects single E string plucks and NEVER falsely jumps to E7 or Am', () => {
  const { center, branches } = getFlowBranches('I', 'C', false, 'pop', 0, 5)
  const cands = branches.map(b => ({ id: b.node.id, symbol: b.node.symbol, rootPc: b.node.rootPc, qual: b.node.qual }))
  // Single high/low E string (E=4 fundamental + B=11 natural 3rd harmonic)
  const singleE = new Array(12).fill(0.004)
  singleE[4] = 0.72
  singleE[11] = 0.24
  const bassE = new Array(12).fill(0)
  bassE[4] = 1
  const res = detectFlowChord(singleE, bassE, { id: center.id, symbol: center.symbol, rootPc: center.rootPc, qual: center.qual }, cands)
  assert.equal(res.status, 'single-note')
  if (res.status === 'single-note') assert.equal(res.noteName, 'E')
})

test('detectFlowChord holds 5th-fret Am barre chord on Am (never falsely jumps to C) and holds 8th-fret C barre chord on C (never jumps to G/Am/F/Fm)', () => {
  // Helper: build a realistic synthetic guitar FFT spectrum (dB) with fundamentals + 2nd + 3rd harmonics!
  const synthGuitarSpec = (midis: number[]) => {
    const binHz = 48000 / 16384
    const spec = new Float32Array(8192).fill(-90)
    const addPeak = (hz: number, db: number) => {
      const b = Math.round(hz / binHz)
      if (b > 2 && b < spec.length - 3) {
        spec[b] = Math.max(spec[b], db)
        spec[b - 1] = Math.max(spec[b - 1], db - 8)
        spec[b + 1] = Math.max(spec[b + 1], db - 8)
      }
    }
    for (const m of midis) {
      const f0 = 440 * Math.pow(2, (m - 69) / 12)
      addPeak(f0, -24)       // fundamental
      addPeak(f0 * 2, -29)   // 2nd harmonic (octave)
      addPeak(f0 * 3, -32)   // 3rd harmonic (octave + 5th — the exact overtone that used to fake G on a C barre!)
    }
    const acc = new Array(12).fill(0)
    const bass = new Array(12).fill(0)
    addGuitarChordChroma(spec, binHz, acc, bass)
    return { acc, bass }
  }

  // Case A: 5th-fret Am barre chord [A2=45, E3=52, A3=57, C4=60, E4=64, A4=69] while center is Am
  const { center: amCenter, branches: amBranches } = getFlowBranches('vi', 'C', false, 'pop', 0, 5)
  const amCands = amBranches.map(b => ({ id: b.node.id, symbol: b.node.symbol, rootPc: b.node.rootPc, qual: b.node.qual }))
  const amSpec = synthGuitarSpec([45, 52, 57, 60, 64, 69])
  const amRes = detectFlowChord(amSpec.acc, amSpec.bass, { id: amCenter.id, symbol: amCenter.symbol, rootPc: amCenter.rootPc, qual: amCenter.qual }, amCands)
  assert.equal(amRes.status, 'holding', `5th-fret Am barre must HOLD Am, got ${JSON.stringify(amRes)}`)

  // Case B: 8th-fret C barre chord [C3=48, G3=55, C4=60, E4=64, G4=67, C5=72] while center is C
  const { center: cCenter, branches: cBranches } = getFlowBranches('I', 'C', false, 'pop', 0, 5)
  const cCands = cBranches.map(b => ({ id: b.node.id, symbol: b.node.symbol, rootPc: b.node.rootPc, qual: b.node.qual }))
  const cSpec = synthGuitarSpec([48, 55, 60, 64, 67, 72])
  const cRes = detectFlowChord(cSpec.acc, cSpec.bass, { id: cCenter.id, symbol: cCenter.symbol, rootPc: cCenter.rootPc, qual: cCenter.qual }, cCands)
  assert.equal(cRes.status, 'holding', `8th-fret C barre must HOLD C (never G/Am/F/Fm!), got ${JSON.stringify(cRes)}`)

  // Case C: Playing 5th-fret Am barre while center is C cleanly advances to Am!
  const cToAm = detectFlowChord(amSpec.acc, amSpec.bass, { id: cCenter.id, symbol: cCenter.symbol, rootPc: cCenter.rootPc, qual: cCenter.qual }, cCands)
  assert.equal(cToAm.status, 'branch', `Playing Am from C should advance to Am, got ${JSON.stringify(cToAm)}`)
  if (cToAm.status === 'branch') assert.equal(cToAm.symbol, 'Am')
})

test('flowVoicings generates Open, Barre, and 3-string Triad voicings with 1-2-3-4 fingers for Chord Path wheel', () => {
  const inst = current()
  for (const sym of ['C', 'G', 'Am', 'F', 'Dm', 'E7', 'Fm']) {
    for (const st of FLOW_VOICING_STYLES) {
      const res = voicingForFlowChord(sym, inst, st.id, 5)
      assert.ok(res && res.voicing.frets.length === inst.strings, `Missing ${st.id} voicing for ${sym}`)
      const played = res!.voicing.frets.filter(f => f >= 0)
      assert.ok(played.length >= 3, `Expected >= 3 notes for ${sym} ${st.id}`)
      if (st.id.startsWith('triad-')) {
        assert.equal(played.length, 3, `Triad ${st.id} for ${sym} must have exactly 3 strings`)
        assert.ok(res!.inversion, `Expected inversion label for ${sym} ${st.id}`)
      }
      if (st.id === 'barre') {
        assert.ok(res!.voicing.frets.every(f => f !== 0), `Barre chord for ${sym} should not rely on open strings`)
      }
    }
  }
})

console.log(`All ${passed} Harmonic Flow & Strum Grid tests passed!`)

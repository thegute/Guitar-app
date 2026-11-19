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
import { setBassPacks, setPackSounds } from '../src/audio/packSounds'
import { allInstrs, instr } from '../src/studio/sounds'
import { layerSpots } from '../src/theory/layers'
import { current } from '../src/instrument'
import { filterTierDuplicates, groupUnpackedFolders } from '../src/components/SoundPacks'

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

console.log(`All ${passed} Harmonic Flow & Strum Grid tests passed!`)

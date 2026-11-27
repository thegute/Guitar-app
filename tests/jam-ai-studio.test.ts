import test from 'node:test'
import assert from 'node:assert/strict'

// Minimal localStorage shim for Node tests
const store = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => { store.clear() },
  },
  configurable: true,
})

import { backingMaster, setBackingMaster } from '../src/audio/engine'
import { monitorVol, setMonitorVol } from '../src/audio/rig'
import { GROOVES } from '../src/audio/drums'
import { INSTRS } from '../src/studio/sounds'
import {
  bassVoiceOptions,
  chartSections,
  chordVoiceOptions,
  keysVoiceOptions,
  strumMachine,
} from '../src/audio/strumMachine'
import {
  AI_STYLE_GROUPS,
  AI_STYLES,
  buildBandFromChords,
  composeAIBeat,
  composeAIStrumChart,
  parsePromptToRequest,
  toggleFavoriteStyle,
  favoriteStyleIds,
} from '../src/jam/aiComposer'
import { CARDS, getFloatTabDoc, openFloatingCard, setFloatTabDoc, shownInstances } from '../src/float/bus'

test('isolated backingMaster volume persists per rig and clamps cleanly', () => {
  store.clear()
  // Default pedal rig is lower (0.55) so electric guitar cuts through; stereo is 1.0
  assert.equal(backingMaster('pedal'), 0.55)
  assert.equal(backingMaster('stereo'), 1)
  setBackingMaster(0.35, 'pedal')
  setBackingMaster(0.85, 'stereo')
  assert.equal(backingMaster('pedal'), 0.35)
  assert.equal(backingMaster('stereo'), 0.85)
  // Clamping
  setBackingMaster(9, 'pedal')
  assert.equal(backingMaster('pedal'), 1)
  setBackingMaster(-2, 'pedal')
  assert.equal(backingMaster('pedal'), 0)
  // Independent guitar boost allows up to 2.5x
  setMonitorVol(2.2)
  assert.equal(monitorVol(), 2.2)
  setMonitorVol(9)
  assert.equal(monitorVol(), 2.5)
})

test('all 10 new studio synth voices exist in INSTRS and StrumMachine options', () => {
  const newChordSynths = ['juno', 'prophet', 'lofikeys', 'wurli', 'fmglass', 'shimmer', 'moogpoly', 'clavinet']
  const newBassSynths = ['moogbass', 'reesebass']
  const instrIds = new Set(INSTRS.map(i => i.id))
  for (const id of [...newChordSynths, ...newBassSynths]) {
    assert.ok(instrIds.has(id), `INSTRS missing new synth: ${id}`)
  }
  const chordIds = new Set(chordVoiceOptions().map(o => o.id))
  const keysIds = new Set(keysVoiceOptions().map(o => o.id))
  const bassIds = new Set(bassVoiceOptions().map(o => o.id))
  for (const id of newChordSynths) {
    assert.ok(chordIds.has(id), `chordVoiceOptions missing ${id}`)
    assert.ok(keysIds.has(id), `keysVoiceOptions missing ${id}`)
  }
  for (const id of newBassSynths) {
    assert.ok(bassIds.has(id), `bassVoiceOptions missing ${id}`)
  }
})

test('all 53 AI styles span 7 groups, map to valid grooves, and compose Full Songs & Simple Loops', () => {
  assert.equal(AI_STYLE_GROUPS.length, 7)
  assert.ok(AI_STYLES.length >= 53, `expected >= 53 styles, got ${AI_STYLES.length}`)
  const validGrooves = new Set(GROOVES.map(g => g.id))

  for (const style of AI_STYLES) {
    assert.ok(validGrooves.has(style.groove), `Style ${style.id} references unknown groove ${style.groove}`)

    const fullBeat = composeAIBeat({ styleId: style.id, songShape: 'song', seed: 3 })
    assert.equal(fullBeat.beat.chainOn, true)
    assert.ok(fullBeat.beat.parts?.A && fullBeat.beat.parts?.B && fullBeat.beat.parts?.C && fullBeat.beat.parts?.D)
    assert.ok(fullBeat.beat.rows.length > 0, `Style ${style.id} produced empty drum rows`)
    assert.ok(fullBeat.beat.tracks.length >= 2, `Style ${style.id} missing bass/keys tracks`)

    const loopBeat = composeAIBeat({ styleId: style.id, songShape: 'loop', seed: 3 })
    assert.equal(loopBeat.beat.chainOn, false)
    assert.equal(loopBeat.beat.bars, 4)

    const fullStrum = composeAIStrumChart({ styleId: style.id, songShape: 'song', seed: 3 })
    const secs = chartSections(fullStrum.chart).map(s => s.name)
    assert.deepEqual(secs, ['Intro', 'Verse', 'Chorus', 'Solo', 'Outro'])

    const loopStrum = composeAIStrumChart({ styleId: style.id, songShape: 'loop', seed: 3 })
    assert.equal(loopStrum.chart.bars.length, 8)
  }
})

test('Role mixing (lead / rhythm / drums) mutes app guitar cleanly in Beat Maker & Strum Machine', () => {
  const rhythmBeat = composeAIBeat({ styleId: 'classic-rock', role: 'rhythm', songShape: 'loop', seed: 1 })
  const gtrTrack = rhythmBeat.beat.tracks.find(t => t.inst === 'crunch')
  assert.ok(gtrTrack, 'classic-rock should include companion crunch guitar track')
  assert.equal(gtrTrack?.mute, true, 'rhythm role should mute band guitar so user plays chords cleanly')

  const drumsBeat = composeAIBeat({ styleId: 'classic-rock', role: 'drums', songShape: 'loop', seed: 1 })
  const keysTrack = drumsBeat.beat.tracks.find(t => t.inst === 'organ')
  assert.equal(keysTrack?.mute, true, 'drums role should mute keys')

  strumMachine.applyRole('rhythm')
  assert.equal(strumMachine.getState().mutes.chords, true)
  assert.equal(strumMachine.getState().mutes.drums, false)
  assert.equal(strumMachine.getState().mutes.bass, false)
  assert.notEqual(strumMachine.getState().keysVoice, 'off')
})

test('natural-language prompt parser extracts style, key, BPM, shape, role, energy, and synth', () => {
  const r1 = parsePromptToRequest('Slow moody minor blues in A minor at 72 BPM with organ')
  assert.equal(r1.styleId, 'minor-blues')
  assert.equal(r1.key, 'A')
  assert.equal(r1.minor, true)
  assert.equal(r1.bpm, 72)
  assert.equal(r1.keysInst, 'organ')
  assert.equal(r1.energy, 'chill')

  const r2 = parsePromptToRequest('Funky E minor simple loop at 105 BPM drums and bass only with clavinet')
  assert.equal(r2.key, 'E')
  assert.equal(r2.minor, true)
  assert.equal(r2.bpm, 105)
  assert.equal(r2.songShape, 'loop')
  assert.equal(r2.role, 'rhythm')
  assert.equal(r2.keysInst, 'clavinet')

  const r3 = parsePromptToRequest('80s synthwave full song in D minor with Juno pad')
  assert.equal(r3.styleId, 'synthwave')
  assert.equal(r3.key, 'D')
  assert.equal(r3.minor, true)
  assert.equal(r3.songShape, 'song')
  assert.equal(r3.keysInst, 'juno')
})

test('buildBandFromChords builds synced Beat & sectioned StrumChart from custom user chords', () => {
  const built = buildBandFromChords(['Em', 'G', 'D', 'A'], { styleId: 'campfire-acoustic', bpm: 102, songShape: 'song' })
  assert.equal(built.key, 'E')
  assert.equal(built.minor, true)
  assert.equal(built.beat.bpm, 102)
  assert.equal(built.beat.chainOn, true)
  const secs = chartSections(built.chart).map(s => s.name)
  assert.deepEqual(secs, ['Intro', 'Verse', 'Chorus', 'Solo'])

  // Favorite style toggling persists cleanly
  store.clear()
  toggleFavoriteStyle('neo-soul')
  assert.ok(favoriteStyleIds().includes('neo-soul'))
  toggleFavoriteStyle('neo-soul')
  assert.ok(!favoriteStyleIds().includes('neo-soul'))
})

test('Universal Floating Popup bus registers strum, beats, looper, flow, scanner, playtab cards', () => {
  store.clear()
  const ids = new Set(CARDS.map(c => c.id))
  for (const kind of ['strum', 'beats', 'looper', 'flow', 'scanner', 'playtab'] as const) {
    assert.ok(ids.has(kind), `CARDS missing ${kind}`)
  }
  openFloatingCard('strum', 'scales')
  assert.ok(shownInstances('scales').some(i => i.kind === 'strum'))
  setFloatTabDoc({ id: 'test-doc', title: 'Test Riff' })
  assert.equal((getFloatTabDoc<{ id: string }>())?.id, 'test-doc')
})

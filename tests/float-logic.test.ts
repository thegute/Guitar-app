// Unit tests for multi-card floating workspace engine (float/bus.ts) and Smart/AI Drum & Bass Fills (float/fillsAi.ts).
import { generateDrumFill, generateBassFill, type DrumFillStyle } from '../src/float/fillsAi'
import {
  CARDS, BUILTIN_PRESETS,
  shownInstances, setShownInstances, addCardInstance, removeCardInstance, swapCardInstance,
  savedPresets, savePreset, deletePreset, applyPreset,
} from '../src/float/bus'

// Minimal localStorage shim for Node execution
const store = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, String(v)) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size },
}

let passed = 0
let failed = 0
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++ } else { failed++; console.error(`FAIL: ${name}${detail ? ` (${detail})` : ''}`) }
}

// 1. Offline Drum Fill Generator across all 4 styles and seeds
const VALID_VOICES = new Set(['kick', 'snare', 'hat', 'open', 'rim', 'ride', 'ghost', 'clap', 'pedal', 'bell', 'crash'])
const STYLES: DrumFillStyle[] = ['simple', 'syncopated', 'linear', 'double']
for (const style of STYLES) {
  for (let seed = 0; seed < 4; seed++) {
    const hits = generateDrumFill(style, seed)
    check(`drum fill ${style} seed ${seed} has >= 4 hits`, hits.length >= 4, `got ${hits.length}`)
    check(
      `drum fill ${style} seed ${seed} steps & voices valid`,
      hits.every(h => h.step >= 4 && h.step <= 15 && VALID_VOICES.has(h.voice) && h.vel > 0 && h.vel <= 1),
    )
  }
}

// 2. Offline Bass Fill Generator across all 4 variations & all 12 root transitions
for (let seed = 0; seed < 4; seed++) {
  for (let cur = 0; cur < 12; cur++) {
    const nxt = (cur + 5) % 12
    const hits = generateBassFill(cur, nxt, seed % 2 === 1, seed)
    check(`bass fill seed=${seed} pc=${cur}->${nxt} count`, hits.length >= 3 && hits.length <= 6)
    check(
      `bass fill seed=${seed} pc=${cur}->${nxt} range & steps`,
      hits.every(h => h.step >= 8 && h.step <= 15 && h.midi >= 28 && h.midi <= 58 && h.vel > 0 && h.vel <= 1 && h.lenSteps >= 1),
    )
  }
}

// 3. Multi-instance floating card bus
const SCREEN = 'test-screen'
setShownInstances(SCREEN, [])
check('starts empty', shownInstances(SCREEN).length === 0)

const u1 = addCardInstance(SCREEN, 'neck')
const u2 = addCardInstance(SCREEN, 'neck')
const u3 = addCardInstance(SCREEN, 'drummer')
check('first neck uid is neck', u1 === 'neck')
check('second neck uid is neck-2', u2 === 'neck-2')
check('drummer uid is drummer', u3 === 'drummer')
check('3 instances open', shownInstances(SCREEN).length === 3)

swapCardInstance(SCREEN, u2, 'book')
check('swapped neck-2 kind to book', shownInstances(SCREEN).find(x => x.uid === 'neck-2')?.kind === 'book')

removeCardInstance(SCREEN, u1)
check('removed first neck, 2 remain', shownInstances(SCREEN).length === 2)

// 4. All 6 new cards exist in CARDS catalog
for (const id of ['drummer', 'band', 'licks', 'circle', 'note', 'book']) {
  check(`catalog has ${id}`, CARDS.some(c => c.id === id))
}

// 5. Workspace presets (built-in + custom save/apply/delete)
check('4 built-in presets defined', BUILTIN_PRESETS.length >= 4)
savePreset('My Jam Layout', SCREEN)
const saved = savedPresets()
check('custom preset saved', saved.length === 1 && saved[0].name === 'My Jam Layout')
check('custom preset has 2 cards', saved[0].cards.length === 2)

const dualPreset = BUILTIN_PRESETS.find(p => p.id === 'dual-neck')!
applyPreset(SCREEN, dualPreset)
const afterApply = shownInstances(SCREEN)
check('dual-neck preset opens two neck cards', afterApply.filter(c => c.kind === 'neck').length === 2)

deletePreset(saved[0].id)
check('custom preset deleted', savedPresets().length === 0)

console.log(`float-logic: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)

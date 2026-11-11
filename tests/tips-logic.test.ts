// Tips: which tip shows when (modes, "used it already", the breather, stuck first, advice switch, muting).
import './test-env'
import { strict as assert } from 'node:assert'
import { TIPS, adviceOn, currentTip, muteTips, noteStuck, setAdviceOn, setTipsMode, tipDone, unmuteAllTips } from '../src/tips/tips'

let n = 0, failed = 0
const check = (name: string, f: () => void) => { n++; try { f() } catch (e) { failed++; console.log('  FAIL', name, (e as Error).message) } }
const ctx = (screen: string, sub = '') => ({ screen, sub, inst: 'guitar' })
localStorage.clear()

check('every tip has text, a place and a unique id', () => {
  const ids = new Set<string>()
  for (const t of TIPS) {
    assert.ok(t.text.length > 20, t.id); assert.ok(t.where.length, t.id); assert.ok(!ids.has(t.id), `dup ${t.id}`); ids.add(t.id)
    assert.ok(!/[“”]/.test(t.id))
  }
})
check('dot mode (default) offers a tip on Play', () => { assert.ok(currentTip(ctx('play'))) })
check('off mode: none', () => { setTipsMode('off'); assert.equal(currentTip(ctx('play')), null); setTipsMode('dot') })
check('ask mode still has one to give when asked', () => { setTipsMode('ask'); assert.ok(currentTip(ctx('play'))); setTipsMode('dot') })
check('Got it: a breather, then a different tip', () => {
  const t1 = currentTip(ctx('play'))!
  tipDone(t1, 'play')
  assert.equal(currentTip(ctx('play')), null, 'breather right after Got it')
  const later = currentTip(ctx('play'), Date.now() + 120_000)!
  assert.ok(later && later.id !== t1.id)
})
check('a used feature’s tip is skipped', () => {
  unmuteAllTips()
  localStorage.setItem('kg:usage', JSON.stringify({ since: 0, c: { 'btn:play:Game': [3, 1, 1] } }))
  const seenIds = new Set<string>()
  for (let i = 0; i < 60; i++) { const t = currentTip(ctx('play'), Date.now() + i * 200_000); if (!t) break; seenIds.add(t.id); tipDone(t, 'play') }
  assert.ok(!seenIds.has('p-game'), 'p-game should not show after using Game')
  assert.ok(seenIds.size > 5, `${seenIds.size} tips offered on Play`)
  localStorage.removeItem('kg:usage')
})
check('advice off: no advice tips', () => {
  unmuteAllTips(); setAdviceOn(false)
  assert.equal(adviceOn(), false)
  for (let i = 0; i < 80; i++) { const t = currentTip(ctx('play'), Date.now() + i * 200_000); if (!t) break; assert.notEqual(t.kind, 'advice', t.id); tipDone(t, 'play') }
  setAdviceOn(true)
})
check('advice mixes in early (more often)', () => {
  unmuteAllTips()
  const kinds: string[] = []
  for (let i = 0; i < 6; i++) { const t = currentTip(ctx('jam', 'jam'), Date.now() + i * 200_000); if (!t) break; kinds.push(t.kind); tipDone(t, 'jam') }
  assert.ok(kinds.slice(0, 3).includes('advice'), kinds.join(','))
})
check('Jam sub-page tips only on that page', () => {
  unmuteAllTips()
  for (let i = 0; i < 80; i++) { const t = currentTip(ctx('jam', 'beats'), Date.now() + i * 200_000); if (!t) break; assert.ok(!t.sub || t.sub === 'beats', t.id); tipDone(t, 'jam') }
})
check('stuck in a bar: the stuck tip comes first, even in the breather', () => {
  unmuteAllTips()
  const t1 = currentTip(ctx('play'))!; tipDone(t1, 'play')
  noteStuck(5)
  const t = currentTip(ctx('play'))!
  assert.equal(t.kind, 'stuck')
})
check('No more tips here', () => { unmuteAllTips(); muteTips('learn'); assert.equal(currentTip(ctx('learn')), null); assert.ok(currentTip(ctx('songs'))); unmuteAllTips() })
check('a dismissed advice tip comes back after 3 weeks', () => {
  unmuteAllTips()
  const adv = TIPS.find(t => t.kind === 'advice' && t.where.includes('learn'))!
  // mark every other learn tip done so only this one could show
  const now = Date.now()
  localStorage.setItem('kg:tipsSeen', JSON.stringify(Object.fromEntries(TIPS.map(t => [t.id, t.id === adv.id ? now - 22 * 864e5 : now]))))
  localStorage.setItem('kg:tipsLast', '{}')
  assert.equal(currentTip(ctx('learn'))?.id, adv.id)
})
console.log(`tips: ${n} checks, ${failed} failed`)
if (failed) process.exit(1)

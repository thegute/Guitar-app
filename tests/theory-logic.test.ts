// The theory essentials: the speller (one letter per note, keys and intervals) and every theory quiz question
// (four different options, exactly one right, the right one in the explanation, playable notes check by pitch).
import './test-env'
import { strict as assert } from 'node:assert'
import { THEORY_QUIZZES } from '../src/learn/theoryQuizzes'
import { INSTRUMENTS } from '../src/instrument'
import { MAJOR_KEYS, MINOR_KEYS, NAT_MINOR_SEMIS, interval, keyChords, pcOf, relativeMinor, spellScale } from '../src/theory/spell'

let n = 0, failed = 0
const check = (name: string, f: () => void) => { n++; try { f() } catch (e) { failed++; console.log('  FAIL', name, (e as Error).message) } }
const guitar = { ...INSTRUMENTS.guitar, tuning: INSTRUMENTS.guitar.tunings[0], midis: [40, 45, 50, 55, 59, 64] } as never

check('every major and minor key uses each letter once', () => {
  for (const k of MAJOR_KEYS) { const s = spellScale(k); assert.equal(new Set(s.map(x => x[0])).size, 7, k); assert.deepEqual(s.map(pcOf), [0, 2, 4, 5, 7, 9, 11].map(x => (pcOf(k) + x) % 12), k) }
  for (const k of MINOR_KEYS) assert.equal(new Set(spellScale(k, NAT_MINOR_SEMIS).map(x => x[0])).size, 7, k)
})
check('known spellings', () => {
  assert.equal(spellScale('F').join(' '), 'F G A Bb C D E')
  assert.equal(spellScale('Db').join(' '), 'Db Eb F Gb Ab Bb C')
  assert.equal(interval('D', 'b3'), 'F'); assert.equal(interval('D', '#4'), 'G#'); assert.equal(interval('D', 'b5'), 'Ab'); assert.equal(interval('C', 'b7'), 'Bb')
  assert.equal(keyChords('G').map(c => c.chord).join(' '), 'G Am Bm C D Em F#dim')
  assert.equal(keyChords('A', true).map(c => c.chord).join(' '), 'Am Bdim C Dm Em F G')
  assert.equal(relativeMinor('Bb'), 'G')
})
for (const q of THEORY_QUIZZES) check(`quiz ${q.id}: every question`, () => {
  const items = q.items(guitar)
  assert.ok(items.length >= 8, `${q.id} has ${items.length} items`)
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
  for (const it of items) for (let rep = 0; rep < 3; rep++) {
    const qq = q.make(it, guitar, rnd)
    assert.equal(qq.input.type, 'choices', it)
    const opts = (qq.input as { options: { id: string }[] }).options.map(o => o.id)
    assert.equal(new Set(opts).size, opts.length, `${it}: duplicate options ${opts}`)
    assert.ok(opts.length >= 2, `${it}: ${opts.length} options`)
    const right = opts.filter(o => qq.check({ choice: o }))
    assert.equal(right.length, 1, `${it}: ${right.length} right answers among ${opts}`)
    if (!/^(Yes|No):/.test(right[0])) assert.ok(qq.explain.includes(right[0].split(' – ')[0].split(' and ')[0].replace(/:.*/, '')), `${it}: explanation doesn't show the answer "${right[0]}": ${qq.explain}`)
    if (qq.mic && qq.mic.kind === 'note' && it.startsWith('oc-move:')) {
      // the exact octave: that pitch on any string, not the note an octave lower
      const [, ss, , ] = it.split(':')
      const hits = [...Array(90).keys()].filter(m => qq.mic!.kind === 'note' && qq.mic!.ok(m))
      assert.equal(hits.length, 1, `${it}: mic accepts ${hits}`)
      assert.ok(hits[0] >= guitar.midis[+ss] + 12, `${it}: mic wants ${hits[0]}, below an octave up`)
    } else if (qq.mic && qq.mic.kind === 'note') {
      const want = pcOf(qq.mic.want)
      assert.ok(qq.mic.ok(48 + want) && qq.mic.ok(60 + want) && !qq.mic.ok(49 + want), `${it}: mic check`)
    }
  }
})
console.log(`theory: ${n} checks, ${failed} failed`)
if (failed) process.exit(1)

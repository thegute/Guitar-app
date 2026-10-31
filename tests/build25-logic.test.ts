// Build 25: lick chains (every style, several keys: whole bars, frets in range, one note per string, near each other),
// "add one that flows", chord names for the peek, the 15-minute routine and the exercise suggestions.
import './test-env'
import { LICKS } from '../src/licks/library'
import { LICK_STYLES } from '../src/licks/styles'
import { chainSong, chainable, flowNext, placeChain, type Chain } from '../src/licks/chain'
import { readChordName, peekVoicing } from '../src/components/ChordPeek'
import { INSTRUMENTS, type Instrument } from '../src/instrument'
import { noteToMidi } from '../src/theory/notes'
import { routine, type Z2H } from '../src/learn/zeroHero'
import { exerciseCatalog } from '../src/exercises/catalog'
import { suggestExercises } from '../src/exercises/suggest'
import { plan, spokenNumbers, systemPrompt } from '../src/assistant/plan'
import { setScreenInfo } from '../src/assistant/screen'
let checks = 0, failed = 0
const ok = (c: boolean, m: string) => { checks++; if (!c) { failed++; console.log('  FAIL', m) } }
const mk = (id: 'guitar' | 'tenor' | 'baritone') => { const d = INSTRUMENTS[id]; return { ...d, tuning: d.tunings[0], midis: d.tunings[0].notes.map(noteToMidi) } as unknown as Instrument }
const guitar = mk('guitar')
let uid = 0
for (const st of LICK_STYLES) {
  const pool = LICKS.filter(l => l.style === st.id && chainable(l))
  ok(pool.length >= 3, `${st.id} has licks to chain`)
  for (const key of ['A', 'E', 'G', 'C']) {
    const chain: Chain = { key, tempo: 0, gap: 0, links: pool.slice(0, 5).map(l => ({ lick: l.id, uid: String(uid++) })) }
    for (const inst of [guitar, mk('tenor')]) {
      const made = chainSong(chain, inst.midis)
      const placed = placeChain(chain)
      if (!placed.some(p => p.fits)) { ok(made === null, `${st.id} ${key}: nothing fits → no song`); continue }
      ok(!!made, `${st.id} in ${key} on ${inst.id} makes a song`)
      if (!made) continue
      const bars = made.song.tracks[0].bars
      bars.forEach((b, i) => {
        const len = b.steps.reduce((a, x) => a + x.dur, 0)
        ok(Math.abs(len - 4) < 0.01, `${st.id} ${key} ${inst.id} bar ${i + 1} is ${len} beats`)
        for (const s of b.steps) {
          const strs = s.notes.map(n => n.string)
          ok(new Set(strs).size === strs.length, `${st.id} ${key} ${inst.id} bar ${i + 1}: one note per string`)
          ok(s.notes.every(n => n.fret >= 0 && n.fret <= 24 && n.string < inst.midis.length), `${st.id} ${key} ${inst.id} bar ${i + 1}: frets in range`)
        }
      })
      // shift styles: each lick starts near the last on the neck
      if (inst === guitar && st.move === 'shift') {
        const centers = placed.filter(p => p.fits).map(p => { const f = p.events.flatMap(e => e.notes.filter(n => n.tech !== 'x').map(n => n.fret)).filter(x => x > 0); return f.length ? (Math.min(...f) + Math.max(...f)) / 2 : null }).filter((x): x is number => x !== null)
        for (let i = 1; i < centers.length; i++) ok(Math.abs(centers[i] - centers[i - 1]) <= 12, `${st.id} ${key}: lick ${i + 1} sits near lick ${i} (${centers[i - 1]} → ${centers[i]})`)
      }
    }
    const next = flowNext(chain)
    ok(!!next && LICKS.some(l => l.id === next.id), `${st.id} ${key}: add one that flows finds a lick`)
  }
}
// gaps add rests
const two: Chain = { key: 'A', tempo: 100, gap: 1, links: LICKS.filter(l => l.style === 'blues' && chainable(l)).slice(0, 2).map(l => ({ lick: l.id, uid: l.id })) }
const g0 = chainSong({ ...two, gap: 0 }, guitar.midis)!, g1 = chainSong(two, guitar.midis)!
ok(g1.song.tracks[0].bars.length === g0.song.tracks[0].bars.length + 1, 'a bar of space adds one bar')
ok(g1.song.tempo === 100, 'chain tempo is used')
// mixed capo + shift styles still make one song without a capo clash
const mixed: Chain = { key: 'D', tempo: 0, gap: 0, links: [LICKS.find(l => l.style === 'bluegrass')!, LICKS.find(l => l.style === 'blues')!].map(l => ({ lick: l.id, uid: l.id + 'm' })) }
const mm = chainSong(mixed, guitar.midis)
ok(!!mm, 'bluegrass + blues chain builds')
// chord names for the peek
for (const [n, r, t] of [['Am7', 'A', 'm7'], ['F#m', 'F#', 'm'], ['Bbmaj7', 'Bb', 'maj7'], ['C/G', 'C', ''], ['G', 'G', ''], ['Dsus4', 'D', 'sus4'], ['E7', 'E', '7'], ['Bdim', 'B', 'dim'], ['Cm7b5', 'C', 'm7b5']] as const) {
  const c = readChordName(n)
  ok(!!c && c.root === r && c.type === t, `${n} reads as ${r} ${t} (got ${c?.root} ${c?.type})`)
}
for (const n of ['C', 'Am', 'G7', 'F', 'Dm7', 'Bb', 'E', 'Cmaj7', 'F#m']) ok(!!peekVoicing(n, guitar, null), `peek shape for ${n} on guitar`)
for (const n of ['C', 'Am', 'G7', 'F']) ok(!!peekVoicing(n, mk('tenor'), null), `peek shape for ${n} on ukulele`)
const tabShape = peekVoicing('G', guitar, [3, 2, 0, 0, 0, 3])
ok(!!tabShape && tabShape.fromTab, 'the tab\'s own shape is used when it has 3+ notes')
// 15-minute routine
const v: Z2H = { phase: 1, since: Date.now() - 10 * 864e5, placed: true, ticks: [] }
const r15 = routine(v, 15)!
const total = r15.steps.reduce((a, s) => a + s.minutes, 0)
ok(total >= 13 && total <= 17, `15-minute routine is about 15 minutes (${total})`)
ok(r15.steps.every(s => s.minutes > 0), 'no empty steps')
// suggestions
const ex = exerciseCatalog(guitar)
const sug = suggestExercises(ex, true)
ok(sug.length === 3, `three suggestions (${sug.length})`)
ok(new Set(sug.map(s => s.ex.code)).size === sug.length, 'suggestions are different')
ok(sug[0].ex.type === 'warmup', 'the first is a warm-up')
const ukeSug = suggestExercises(exerciseCatalog(mk('tenor')), false)
ok(ukeSug.length >= 2, `ukulele suggestions (${ukeSug.length})`)
// spoken commands in Play
ok(spokenNumbers('loop section five to eight') === 'loop section 5 to 8', spokenNumbers('loop section five to eight'))
ok(spokenNumbers('seventy five percent') === '75 percent', spokenNumbers('seventy five percent'))
setScreenInfo('play', { label: 'Play', summary: 'In Play', can: ['loop', 'speed'], play: { bar: 3, bars: 32, loop: null, speed: 0.8, key: 'G major', chord: 'C' } })
const cmd = async (q: string) => (await plan(q, [], 'play')).play
await (async () => {
  const a = await cmd('loop section five to eight and slow the tempo')
  ok(!!a && a.loop?.from === 4 && a.loop?.to === 7 && a.speed === 0.7, `loop 5-8 slower → ${JSON.stringify(a)}`)
  const b = await cmd('lower the tempo')
  ok(!!b && b.speed === 0.7 && b.loop === undefined, `lower the tempo → ${JSON.stringify(b)}`)
  const c = await cmd('loop this bar at sixty percent')
  ok(!!c && c.loop?.from === 3 && c.speed === 0.6, `loop this bar at 60% → ${JSON.stringify(c)}`)
  const d = await cmd('stop looping')
  ok(!!d && d.loop === null, `stop looping → ${JSON.stringify(d)}`)
  const e = await cmd('loop measures 30 through 40')
  ok(!!e && e.loop?.from === 29 && e.loop?.to === 31, `loop past the end is clamped → ${JSON.stringify(e)}`)
  const f = await cmd('what does an augmented chord do')
  ok(!f, 'a question is not a command')
  const g = await cmd('how do I play faster licks')
  ok(!g, '"how do I play faster" is a question, not a speed change')
  const h = await cmd('full speed')
  ok(!!h && h.speed === 1, `full speed → ${JSON.stringify(h)}`)
})()
// the helper's prompt: the manual first (the same every time), the screen last
{
  const scr = { label: 'Tools → Chords: Am7', summary: 'In Tools → Chords looking at Am7 SCREEN-MARK' }
  const a = systemPrompt('general', '', [], scr), b = systemPrompt('play', '', [], null)
  const head = a.slice(0, a.indexOf('--- NOW ---'))
  ok(head === b.slice(0, b.indexOf('--- NOW ---')), 'the manual part of the prompt never changes')
  ok(a.trim().endsWith('SCREEN-MARK'), 'the screen goes at the very end')
  for (const w of ['Hear it', 'Loop', 'Speed', 'Lick chainer', 'Tuner', 'Theory lessons', 'beginner']) ok(head.includes(w), `manual mentions ${w}`)
  ok(head.length < 20000, `manual is compact (${head.length} characters)`)
}
console.log(`build25-logic: ${checks - failed}/${checks} checks passed`)
if (failed) process.exit(1)

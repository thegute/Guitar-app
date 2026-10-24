// Sounds (build 10): every style points at real sounds, grooves and bass lines; bass notes land in the bass register;
// power chords are recognised; Guitar Pro programs map to sounds; every sample bank file exists.
import './test-env'
import { readFileSync, existsSync } from 'node:fs'
import { STYLE_DEFAULTS, STYLES, typeTones } from '../src/theory/progressions'
import { SOUNDS, isPowerChord, soundForProgram } from '../src/audio/pluck'
import { GROOVES } from '../src/audio/drums'
import { BASSLINES, bassMidi } from '../src/audio/bass'
import { STRUMS } from '../src/audio/strums'

let fails = 0, checks = 0
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; if (fails < 40) console.log('FAIL', m) } }

// styles → real ids
for (const s of STYLES) {
  const d = STYLE_DEFAULTS[s.id]
  ok(SOUNDS.some(x => x.id === d.tone), `${s.id}: tone ${d.tone}`)
  ok(d.bass === 'off' || BASSLINES.some(b => b.id === d.bass), `${s.id}: bass ${d.bass}`)
  ok(d.drums === 'off' || GROOVES.some(g => g.id === d.drums), `${s.id}: drums ${d.drums}`)
  ok(STRUMS.some(x => x.id === d.strum), `${s.id}: strum ${d.strum}`)
}

// power chords
ok(isPowerChord([40, 47, 52]), 'E5 3 strings')
ok(isPowerChord([45, 52]), 'A5 2 strings')
ok(isPowerChord([52, 40, 47]), 'unsorted')
ok(!isPowerChord([40, 47, 52, 56]), 'E major barre is not a power chord')
ok(!isPowerChord([48, 52, 55]), 'C triad')
ok(!isPowerChord([40]), 'single note')

// Guitar Pro programs
ok(soundForProgram(25) === 'acoustic' && soundForProgram(24) === 'nylon' && soundForProgram(30) === 'metal' && soundForProgram(29) === 'crunch' && soundForProgram(27) === 'clean', 'GM guitar programs')
ok(soundForProgram(0) === null && soundForProgram(undefined) === null && soundForProgram(33) === null, 'non-guitar programs')

// bass notes
for (let root = 0; root < 12; root++) {
  for (const type of ['', 'm', '7', 'm7', 'maj7', '5', 'dim', 'sus4', 'm7b5']) {
    const c = { root, tones: typeTones(type) }
    const next = { root: (root + 5) % 12, tones: typeTones('') }
    const R = bassMidi('R', c, next, 0, null)
    ok(R >= 28 && R <= 39 && R % 12 === root, `root ${root}${type} → ${R}`)
    const third = bassMidi('3', c, next, 0, null) - R
    if (type === 'm' || type === 'm7' || type === 'dim' || type === 'm7b5') ok(third === 3, `${root}${type} minor third, got ${third}`)
    if (type === '' || type === '7' || type === 'maj7') ok(third === 4, `${root}${type} major third, got ${third}`)
    const fifth = bassMidi('5', c, next, 0, null) - R
    ok(fifth === (type === 'dim' || type === 'm7b5' ? 6 : 7), `${root}${type} fifth ${fifth}`)
    let prev: number | null = R
    for (let b = 1; b < 3; b++) {
      const w = bassMidi('W', c, next, b, prev)
      ok(w >= 28 && w <= 52 && w !== prev, `walk ${root}${type} beat ${b}: ${w} after ${prev}`)
      prev = w
    }
    const a = bassMidi('A', c, next, 3, prev)
    const dist = Math.min(((a - next.root) % 12 + 12) % 12, ((next.root - a) % 12 + 12) % 12)
    ok(dist === 1 && a >= 27 && a <= 53, `approach ${a} into ${next.root}`)
  }
}

// grooves and bass lines stay inside one bar
for (const g of GROOVES) for (const [b, , l] of g.hits) ok(b >= 0 && b < 4 && l > 0 && l <= 1.2, `${g.id} hit at ${b} level ${l}`)
for (const bl of BASSLINES) for (const [b, , len, l] of bl.hits) ok(b >= 0 && b < 4 && len > 0 && len <= 2 && l > 0 && l <= 1, `${bl.id} ${b}`)
ok(['metal', 'gallop', 'thrash', 'breakdown', 'reggae', 'rockers', 'steppers'].every(id => GROOVES.some(g => g.id === id)), 'metal and reggae grooves present')
const metal = GROOVES.find(g => g.id === 'metal')!
ok(metal.hits.filter(h => h[1] === 'kick').length === 16, 'metal: double kick sixteenths')
const oneDrop = GROOVES.find(g => g.id === 'reggae')!
ok(oneDrop.hits.some(h => h[0] === 2 && h[1] === 'rim') && oneDrop.hits.some(h => h[0] === 2 && h[1] === 'kick') && !oneDrop.hits.some(h => h[0] === 0 && h[1] === 'kick'), 'one drop: kick + cross-stick on 3, nothing on 1')

// sample banks on disk
const pieces = new Set(['kick', 'kickbig', 'kickmetal', 'snare', 'snaretight', 'ride', 'ridejazz'])
const drums = JSON.parse(readFileSync('public/samples/drums/index.json', 'utf8')) as Record<string, string[]>
for (const g of GROOVES) for (const [, v] of g.hits) if (!['kick', 'snare', 'ghost', 'ride'].includes(v)) pieces.add(v)
for (const v of ['tom1', 'tom2', 'tom3', 'roto1', 'roto2', 'roto3', 'crash', 'open']) pieces.add(v)
for (const p of pieces) ok(!!drums[p]?.length, `drum piece ${p}`)
for (const files of Object.values(drums)) for (const f of files) ok(existsSync(`public/samples/drums/${f}`), `drum file ${f}`)
for (const id of [...SOUNDS.map(s => s.id).filter(x => x !== 'synth'), 'bass']) {
  const idx = JSON.parse(readFileSync(`public/samples/${id}/index.json`, 'utf8')) as Record<string, unknown>
  const groups = (typeof Object.values(idx)[0] === 'string' ? { notes: idx } : idx) as Record<string, Record<string, string | string[]>>
  ok(Object.keys(groups.notes ?? {}).length >= 10, `${id}: has notes`)
  for (const files of Object.values(groups)) for (const f of Object.values(files)) for (const x of [f].flat()) ok(existsSync(`public/samples/${id}/${x}`), `${id}/${x}`)
  const amp = SOUNDS.find(s => s.id === id)?.amp
  if (amp) for (const g of ['pm', 'power', 'powerpm']) {
    const keys = Object.keys(groups[g] ?? {}).map(Number)
    ok(keys.length >= 5 && Math.min(...keys) <= 38 && Math.max(...keys) >= 60, `${id}: ${g} covers the neck (${keys.join(',')})`)
    // rhythm parts have several takes (played in turn and left/right)
    ok(Object.values(groups[g] ?? {}).every(v => Array.isArray(v) && v.length >= 2), `${id}: ${g} has takes`)
  }
}

console.log(`sound logic: ${checks} checks, ${fails} failed`)
process.exit(fails ? 1 : 0)

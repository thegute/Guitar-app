// Chord sets ("Inspire me"): naming chords from keyboard voicings, moving a set to a key, colours, rolls, shuffles,
// reading a chordsets.json (a made-up file here: the owner's Playbox data is private and never in the repo).
import { strict as assert } from 'node:assert'
import './test-env'
import { nameChord, setChords, colourOf, parseChordSets, builtInSets, rollSet, shuffleChords, type ChordSet } from '../src/theory/chordSets'
let n = 0
const ok = (c: unknown, m: string) => { n++; assert.ok(c, m) }
const name = (m: number[]) => { const x = nameChord(m)!; return `${x.root}:${x.type}:${x.bass}` }

ok(name([48, 52, 55]) === '0::0', 'C E G = C major')
ok(name([57, 60, 64, 69]) === '9:m:9', 'A C E A = A minor')
ok(name([52, 60, 67]) === '0::4', 'E C G = C over E (a first inversion keeps C as the root)')
ok(name([50, 57, 60, 66]) === '2:7:2', 'D A C F# = D7')
ok(name([48, 55, 59, 64]) === '0:maj7:0', 'C G B E = Cmaj7')
ok(name([45, 52, 55, 60, 64]) === '9:m7:9', 'A E G C E = Am7')
ok(name([50, 55, 57, 62]) === '2:sus4:2', 'D G A D = Dsus4')
ok(name([48, 55, 62, 64]) === '0:add9:0', 'C G D E = Cadd9')
ok(name([47, 50, 53, 57]) === '11:m7b5:11', 'B D F A = Bm7b5')
ok(name([43, 50, 55]) === '7:5:7', 'G D G = G5 (a power chord)')
ok(nameChord([]) === null, 'no notes: no name')

// a made-up minor set in E (key 4)
const set: ChordSet = { id: 't', name: 'Test', key: 4, mode: 'minor', source: 'kguitar', chords: [
  [52, 59, 64, 67], [48, 55, 60, 64], [50, 57, 62, 66], [47, 54, 59, 63], [45, 52, 55, 60, 64], [54, 57, 62, 66],
] }
const inE = setChords(set, 'E')
ok(inE.map(c => c.symbol).join(' ') === 'Em C D B Am7 D/F#', `named in E: ${inE.map(c => c.symbol).join(' ')}`)
ok(inE.map(c => c.roman).join(' ') === 'i bVI bVII V iv7 bVII', `numerals in E minor: ${inE.map(c => c.roman).join(' ')}`)
const inA = setChords(set, 'A')
ok(inA.map(c => c.symbol).join(' ') === 'Am F G E Dm7 G/B', `moved to A: ${inA.map(c => c.symbol).join(' ')}`)
ok(inA.map(c => c.roman).join() === inE.map(c => c.roman).join(), 'numerals stay the same in any key')
ok(inA.every(c => c.midis[0] <= 57 && c.midis[0] >= 40), 'voicings stay around middle C after the move')
ok(inA.every(c => c.beats === 4), 'one bar each by default')
ok(colourOf(set) === 'simple', 'mostly triads = simple')
ok(colourOf({ ...set, chords: [[48, 55, 59, 62, 64], [50, 57, 60, 64, 65], [43, 53, 57, 59, 64]] }) === 'lush', '9ths and 13ths = lush')

// parsing
const file = { kind: 'chordsets', version: 1, source: 'playbox', sets: [
  { name: 'One', key: 7, mode: 'major', cat: 3, chords: [[55, 59, 62], [48, 52, 55], [50, 54, 57], [52, 55, 59]] },
  { name: 'Unison', key: 0, mode: 'major', cat: 5, chords: [[60], [62], [64], [65]] },
] }
const parsed = parseChordSets(file)
ok(parsed.length === 1 && parsed[0].source === 'playbox' && parsed[0].key === 7, 'reads sets, leaves out single-note sets')
assert.throws(() => parseChordSets({ kind: 'nope' }), /not a KGuitar chord set/)
n++

// built-in sets and rolls
const built = builtInSets()
ok(built.length >= 20 && built.every(s => s.chords.length >= 4 && s.chords.length <= 8), `KGuitar's own sets (${built.length}), 4–8 chords each`)
ok(built.every(s => setChords(s, 'C').length === s.chords.length), 'every built-in chord gets a name')
const pop = built.find(s => /I–V–vi–IV/.test(s.name))!
ok(setChords(pop, 'G').slice(0, 4).map(c => c.symbol).join(' ') === 'G D Em C', 'the four-chord pop set starts G D Em C in G')
let seed = 3
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
const r1 = rollSet({ mood: 'minor' }, rnd, built)!
ok(r1.mode === 'minor', 'a minor roll gives a minor set')
ok(Array.from({ length: 30 }, () => rollSet({ avoid: r1.id }, rnd, built)!.id).every(id => id !== r1.id), 'never the same set twice in a row')
ok(rollSet({ colour: 'lush' }, rnd, [set]) === null, 'nothing fits: null')
const sh = shuffleChords(['a', 'b', 'c', 'd', 'e'], [true, false, false, false, true], rnd)
ok(sh[0] === 'a' && sh[4] === 'e' && [...sh].sort().join('') === 'abcde', 'shuffle keeps locked chords in place')
console.log(`chord sets logic: ${n} checks, 0 failed`)

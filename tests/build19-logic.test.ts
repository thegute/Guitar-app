// Build 19 logic: the exercise library (every exercise builds, bars are full, frets are playable, keys move),
// and the melodic fingerstyle material.
import './test-env'
import { exerciseCatalog, keysFor, EX_TYPES, TECHS } from '../src/exercises/catalog'
import { LUSH, FS_ETUDES } from '../src/exercises/fingerstyle'
import { INSTRUMENTS, type Instrument } from '../src/instrument'
import { noteToMidi } from '../src/theory/notes'
import { parseLick } from '../src/licks/notation'
import type { Song } from '../src/tabs/model'

let checks = 0, failed = 0
const ok = (c: boolean, m: string) => { checks++; if (!c) { failed++; console.log('  FAIL', m) } }

function inst(id: 'guitar' | 'tenor' | 'baritone', tuning = 0): Instrument {
  const def = INSTRUMENTS[id]
  const t = def.tunings[tuning]
  return { ...def, tuning: t, midis: t.notes.map(noteToMidi), isUke: id !== 'guitar' }
}
function checkSong(s: Song, tag: string, meter: number) {
  const tr = s.tracks[0]
  ok(tr.bars.length > 0, `${tag}: has bars`)
  let notes = 0
  tr.bars.forEach((b, i) => {
    const len = b.steps.reduce((a, st) => a + st.dur, 0)
    ok(Math.abs(len - meter) < 0.01, `${tag}: bar ${i + 1} lasts ${len.toFixed(3)} beats, not ${meter}`)
    for (const st of b.steps) for (const n of st.notes) {
      notes++
      ok(n.fret >= 0 && n.fret <= 22, `${tag}: fret ${n.fret} out of range`)
      ok(n.string >= 0 && n.string < tr.tuning.length, `${tag}: string ${n.string}`)
      ok(n.midi === tr.tuning[n.string] + (tr.capo ?? 0) + n.fret, `${tag}: midi ${n.midi} ≠ string + capo + fret`)
    }
    // no two notes on one string at once
    for (const st of b.steps) ok(new Set(st.notes.map(n => n.string)).size === st.notes.length, `${tag}: two notes on one string`)
  })
  ok(notes > 0, `${tag}: has notes`)
}

// ---------------- guitar, standard tuning: every exercise builds in its written key
{
  const g = inst('guitar')
  const list = exerciseCatalog(g)
  console.log(`  exercises for guitar: ${list.length}`)
  ok(list.length >= 700, `700+ exercises (got ${list.length})`)
  ok(new Set(list.map(e => e.code)).size === list.length, 'codes are unique')
  const types = new Set(list.map(e => e.type))
  for (const t of EX_TYPES) ok(types.has(t.id), `type ${t.id} has exercises`)
  const techIds = new Set(TECHS.map(t => t.id))
  for (const e of list) {
    for (const t of e.tech) ok(techIds.has(t), `${e.code}: unknown technique ${t}`)
    ok(e.level >= 1 && e.level <= 4, `${e.code}: level`)
    ok(e.about.length > 10, `${e.code}: has a description`)
    let s: Song | null = null
    try { s = e.make({ root: e.key ?? 'C', inst: g, bpm: e.bpm }) } catch (err) { ok(false, `${e.code} ${e.name}: threw ${(err as Error).message}`) }
    ok(!!s, `${e.code} ${e.name}: builds in ${e.key ?? 'its own key'}`)
    if (s) checkSong(s, `${e.code} ${e.name}`, e.meter ?? s.meter ?? 4)
  }
  // starting points exist in the main types
  ok(list.filter(e => e.start).length >= 10, 'at least ten "start here" exercises')
  // keys: movable things go to many keys; open-string studies to the capo keys only
  const scale = list.find(e => e.name === 'Minor pentatonic, position 1')!
  ok(keysFor(scale, g).length === 12, 'a pentatonic box plays in all 12 keys')
  const cascade = list.find(e => e.name.startsWith('Cascading G major scale (two'))!
  const ck = keysFor(cascade, g)
  ok(ck.includes('G') && ck.includes('A') && !ck.includes('F'), `cascade keys come from a capo (got ${ck.join(' ')})`)
  const capoSong = cascade.make({ root: 'A', inst: g, bpm: 70 })!
  ok(capoSong.tracks[0].capo === 2, 'cascade in A uses a capo on 2')
  // chord pairs say which finger can stay
  const ec = list.find(e => e.name === 'C to Am')!
  ok(/Leave the finger/.test(ec.about), 'C to Am mentions the finger that stays')
  // in-key exercises move: G major position 1 in A starts two frets higher
  const gm = list.find(e => e.name === 'Major scale, position 1')!
  const inG = gm.make({ root: 'G', inst: g, bpm: 80 })!, inA = gm.make({ root: 'A', inst: g, bpm: 80 })!
  const first = (s: Song) => s.tracks[0].bars.flatMap(b => b.steps).find(st => st.notes.length)!.notes[0]
  ok(first(inA).midi - first(inG).midi === 2, 'a scale moved from G to A sounds two semitones higher')
  // chord tones through the changes: the guide-tone line moves by small steps
  const guide = list.find(e => e.name.startsWith('Guide tones: 3rds and 7ths: ii – V – I'))!
  const gs = guide.make({ root: 'C', inst: g, bpm: 70 })!
  const mids = gs.tracks[0].bars.flatMap(b => b.steps).flatMap(st => st.notes.map(n => n.midi))
  ok(mids.every((m, i) => i === 0 || Math.abs(m - mids[i - 1]) <= 6), `guide tones move by small steps (${mids.join(' ')})`)
  const named = gs.tracks[0].bars.flatMap(b => b.steps).filter(st => st.chord).map(st => st.chord)
  ok(named.join(' ') === 'Dm7 G7 Cmaj7 Cmaj7', `changes are labelled (${named.join(' ')})`)
  // strumming patterns put chord names on the strums
  const strum = list.find(e => e.name.startsWith('Campfire strum') && e.key === 'G')!
  const ss = strum.make({ root: 'G', inst: g, bpm: 90 })!
  ok(ss.tracks[0].bars[0].steps[0].chord === 'G' && ss.tracks[0].bars[1].steps[0].chord === 'C', 'strum bars carry chord names')
  // licks: every library lick is in
  ok(list.filter(e => e.lick).length >= 199, 'every library lick is an exercise')
}

// ---------------- other instruments: most exercises still build; guitar-only ones are left out
for (const [id, t] of [['tenor', 0], ['tenor', 1], ['baritone', 0]] as const) {
  const u = inst(id, t)
  const list = exerciseCatalog(u)
  ok(!list.some(e => e.guitarOnly), `${id}: no guitar-only exercises`)
  let built = 0
  for (const e of list) {
    let s: Song | null = null
    try { s = e.make({ root: e.key ?? 'C', inst: u, bpm: e.bpm }) } catch (err) { ok(false, `${id} ${e.code} ${e.name}: threw ${(err as Error).message}`) }
    if (s) { built++; checkSong(s, `${id} ${e.code} ${e.name}`, e.meter ?? s.meter ?? 4) }
  }
  console.log(`  ${id}${t ? ' (2nd tuning)' : ''}: ${built} of ${list.length} build`)
  ok(built >= list.length * 0.8, `${id}: at least 80% build (${built}/${list.length})`)
}

// ---------------- drop D guitar: retuned tab keeps its pitches
{
  const def = INSTRUMENTS.guitar
  const dd = def.tunings.find(x => /drop/i.test(x.name))
  if (dd) {
    const d = { ...def, tuning: dd, midis: dd.notes.map(noteToMidi), isUke: false }
    const std = inst('guitar')
    const e = exerciseCatalog(std).find(x => x.name === 'Hammer-ons up pentatonic box 1')!
    const a = e.make({ root: 'A', inst: std, bpm: 80 })!, b = exerciseCatalog(d).find(x => x.name === e.name)!.make({ root: 'A', inst: d, bpm: 80 })!
    const pitches = (s: Song) => s.tracks[0].bars.flatMap(bb => bb.steps).flatMap(st => st.notes.map(n => n.midi)).join(' ')
    ok(pitches(a) === pitches(b), 'drop D plays the same pitches')
  }
}

// ---------------- melodic fingerstyle: the shapes spell what their names say
{
  const STD = [40, 45, 50, 55, 59, 64]
  const want: Record<string, string> = {
    G: 'G B D', Gmaj7: 'G B D F#', 'G/B': 'B D G', Cadd9: 'C E G D', C: 'C E G', Cmaj7: 'C E G B', 'C/E': 'E C G', D: 'D A F#', Dsus4: 'D A G', Dsus2: 'D A E',
    Dmaj7: 'D A C# F#', 'D/F#': 'F# D A', Dm7: 'D A C F', Em: 'E B G', Em7: 'E B G D', 'Em(add9)': 'E B F# G', Em9: 'E B D G F#', E: 'E B G#', Fmaj7: 'F A C E',
    Fadd9: 'F A C G', A: 'A E C#', Asus2: 'A E B', 'A/C#': 'C# E A', Am: 'A E C', Am7: 'A E G C', 'Am(add9)': 'A E B C', 'Am/G': 'G A E C', Bm: 'B F# D', Bm11: 'B D A E', 'F#m': 'F# C# A',
  }
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const norm = (n: string) => n.replace('Db', 'C#').replace('Eb', 'D#').replace('Gb', 'F#').replace('Ab', 'G#').replace('Bb', 'A#')
  for (const [name, v] of Object.entries(LUSH)) {
    const pcs = new Set(v.frets.flatMap((f, s) => (f >= 0 ? [NAMES[(STD[s] + f) % 12]] : [])))
    const exp = new Set(want[name].split(' ').map(norm))
    ok(pcs.size === exp.size && [...exp].every(p => pcs.has(p)), `${name} spells ${[...exp].join(' ')} (got ${[...pcs].join(' ')})`)
    const bass = v.frets.findIndex(f => f >= 0)
    ok(NAMES[(STD[bass] + v.frets[bass]) % 12] === norm(v.bass), `${name}: the bass is ${v.bass}`)
  }
  for (const e of FS_ETUDES) {
    const { bars } = parseLick(e.tab)
    ok(bars.length > 0, `${e.id}: parses`)
  }
}

// ---------------- the lick library: every lick's bars are full, melodic fingerstyle licks stay in open position
{
  const { LICKS } = await import('../src/licks/library')
  const { lickStyle } = await import('../src/licks/styles')
  const { lickInKey } = await import('../src/licks/generator')
  const STD = [40, 45, 50, 55, 59, 64]
  for (const l of LICKS) {
    const { bars } = parseLick(l.tab)
    const meter = l.meter ?? 4
    bars.forEach((b, i) => ok(Math.abs(b - meter) < 1e-6 || (i === bars.length - 1 && b < meter), `lick ${l.id}: bar ${i + 1} has ${b} beats`))
    const s = lickInKey(l, l.ref, STD)
    ok(!!s, `lick ${l.id}: builds in ${l.ref}`)
  }
  const mc = LICKS.filter(l => l.style === 'fingerstyle')
  ok(mc.length >= 10 && mc.filter(l => l.must).length >= 5, `melodic fingerstyle: ${mc.length} licks, ${mc.filter(l => l.must).length} explained`)
  ok(lickStyle('fingerstyle').move === 'capo', 'melodic fingerstyle uses a capo for other keys')
  for (const l of mc) {
    const s = lickInKey(l, 'C', STD)
    if (!s) continue
    const frets = s.song.tracks[0].bars.flatMap(b => b.steps).flatMap(st => st.notes.map(n => n.fret))
    ok(Math.max(...frets) <= 12, `${l.id}: stays near the headstock`)
  }
}
console.log(`build19-logic: ${checks - failed}/${checks} checks passed`)
if (failed) process.exit(1)

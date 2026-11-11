// Band behind me: the chord band (style guess, drums + bass that follow the chords), and that a song with its own band
// keeps it. Also the your-part ↔ band slider's maths both ways.
import './test-env'
import { strict as assert } from 'node:assert'
import { bandEvents, chordBandSong, guessBandStyle, hasBand } from '../src/audio/band'
import { mixFromLevels, mixLevels } from '../src/components/MixSlider'
import type { Song, SongTrack } from '../src/tabs/model'

let n = 0, failed = 0
const check = (name: string, f: () => void) => { n++; try { f() } catch (e) { failed++; console.log('  FAIL', name, (e as Error).message) } }

const bar = (chord: string, dur = 4) => ({ steps: [{ dur, notes: [], chord }] })
const sheet = (chords: string[], extra: Partial<Song> = {}): Song => ({
  title: 'Test', tempo: 100, meter: 4,
  tracks: [{ name: 'Guitar', tuning: [40, 45, 50, 55, 59, 64], capo: 0, bars: chords.map(c => bar(c, extra.meter ?? 4)) } as unknown as SongTrack],
  ...extra,
} as Song)

check('style guess from words', () => {
  assert.equal(guessBandStyle(sheet(['G', 'C']), 'Three Little Birds', 'Bob Marley'), 'reggae')
  assert.equal(guessBandStyle(sheet(['G', 'C']), 'Foggy Mountain Breakdown'), 'bluegrass')
  assert.equal(guessBandStyle(sheet(['G', 'C']), 'Amazing Grace'), 'gospel')
  assert.equal(guessBandStyle(sheet(['G', 'C']), 'Some song', 'Johnny Cash'), 'country')
})
check('style guess from tempo', () => {
  assert.equal(guessBandStyle(sheet(['G', 'C'], { tempo: 140 })), 'bluegrass')
  assert.equal(guessBandStyle(sheet(['G', 'C'], { tempo: 66 })), 'popballad')
  assert.equal(guessBandStyle(sheet(['G', 'C'], { tempo: 100 })), 'acoustic')
})
check('a chord sheet gets a band that follows its chords', () => {
  const s = sheet(['G', 'C', 'D', 'G'])
  assert.equal(hasBand(s, 0), false)
  const b = chordBandSong(s, 0, 'country')!
  assert.ok(b && b.backing, 'backing added')
  const ev = bandEvents(b, 0)
  assert.ok(ev.some(e => e.kind === 'drum') && ev.some(e => e.kind === 'bass'), 'drums and bass')
  // the bass plays the root on the first beat of each chord
  const firstBass = (beat: number) => ev.filter(e => e.kind === 'bass' && Math.abs(e.beat - beat) < 1e-6)[0]?.midis?.[0]
  assert.equal(firstBass(0)! % 12, 7, 'G root on beat 0')
  assert.equal(firstBass(4)! % 12, 0, 'C root on bar 2')
  assert.equal(firstBass(8)! % 12, 2, 'D root on bar 3')
})
check('every chord band style plays', () => {
  for (const st of ['acoustic', 'bluegrass', 'country', 'pop', 'rock', 'reggae', 'blues', 'popballad', 'gospel', 'island'] as const) {
    const ev = bandEvents(chordBandSong(sheet(['Am', 'F', 'C', 'G']), 0, st)!, 0)
    assert.ok(ev.filter(e => e.kind === 'drum').length > 4 && ev.some(e => e.kind === 'bass'), st)
  }
})
check('a waltz keeps 3 beats', () => {
  const ev = bandEvents(chordBandSong(sheet(['G', 'D'], { meter: 3 }), 0, 'acoustic')!, 0)
  assert.ok(ev.every(e => e.beat < 6 + 1e-6))
})
check('too few chords: no chord band', () => { assert.equal(chordBandSong(sheet(['G', 'G']), 0, 'pop'), null) })
check('a song with its own band keeps it', () => {
  const s = sheet(['G', 'C'], { drums: [{ beat: 0, voice: 'kick', vel: 1 }] } as Partial<Song>)
  assert.equal(chordBandSong(s, 0, 'pop'), null)
})
check('mix slider maths both ways', () => {
  for (const v of [0, 10, 20, 50, 80, 100]) { const l = mixLevels(v); assert.equal(mixFromLevels(l.me, l.band), v, `v=${v}`) }
})
console.log(`band: ${n} checks, ${failed} failed`)
if (failed) process.exit(1)

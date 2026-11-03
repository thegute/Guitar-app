// Build 33: the composer (licks, solos, riffs, chord melodies in the owner's styles), PDF tabs are in pdf-tab.test.ts
import './test-env'
import { strict as assert } from 'node:assert'
import { compose, capoFor } from '../src/compose'
import { STYLES, style } from '../src/compose/styles'
import { PICK_PATTERNS, pickingSong } from '../src/tabs/picking'
import { pickChords } from '../src/tabs/fromProgression'
import { INSTRUMENTS } from '../src/instrument'
import { spell } from '../src/theory/progressions'

const STD = [40, 45, 50, 55, 59, 64]
const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const steps = (s: ReturnType<typeof compose>['song']) => s.tracks[0].bars.flatMap(b => b.steps)
{
  // every style, every key, every part: a real tab, the right length, playable stretches
  for (const st of STYLES) {
    const frets: number[] = []
    for (const k of KEYS) for (const part of ['lead', 'riff', 'melody'] as const) for (const bars of [1, 4]) {
      const c = compose({ style: st.id, part, tonic: k, bars, level: 2, seed: 99 + bars, tuning: STD })
      const ss = steps(c.song)
      const ns = ss.filter(x => x.notes.length)
      assert.ok(ns.length >= 2, `${st.id} ${part} in ${k}: ${ns.length} notes`)
      const total = ss.reduce((a, x) => a + x.dur, 0)
      assert.ok(Math.abs(total - bars * (c.song.meter ?? 4)) < 1e-3, `${st.id} ${part} ${k}: ${total} beats for ${bars} bars`)
      for (const x of ns) {
        const fr = x.notes.filter(n => n.fret > 0 && n.tech !== 'x' && n.tech !== 'harm').map(n => n.fret)
        if (fr.length > 1) assert.ok(Math.max(...fr) - Math.min(...fr) <= 4, `${st.id} ${part} ${k}: stretch ${fr}`)
        assert.equal(new Set(x.notes.map(n => n.string)).size, x.notes.length, 'one note per string')
        for (const n of x.notes) { assert.ok(n.fret >= 0 && n.fret <= 24, `fret ${n.fret}`); if (part === 'lead' && n.tech !== 'x') frets.push(n.fret + c.capo) }
      }
    }
    frets.sort((a, b) => a - b)
    const med = frets[Math.floor(frets.length / 2)]
    // bluegrass stays near the headstock; the others use the neck the way those players do
    if (st.id === 'bluegrass') assert.ok(med <= 5, `bluegrass median fret ${med}`)
    else if (st.moves !== 'open' && st.id !== 'classical') assert.ok(med >= 5, `${st.id} median fret ${med}: stuck by the headstock`)
  }
  console.log('composer: every style, key and part makes a playable tab of the right length: ok')
}
{
  // a new one each time, not the same lick again
  const a = compose({ style: 'fingerstyle', part: 'lead', tonic: 'E', bars: 4, level: 2, seed: 1, tuning: STD })
  const b = compose({ style: 'fingerstyle', part: 'lead', tonic: 'E', bars: 4, level: 2, seed: 2, tuning: STD })
  const sig = (c: typeof a) => steps(c.song).map(s => s.notes.map(n => n.string + ':' + n.fret).join('+')).join(' ')
  assert.notEqual(sig(a), sig(b))
  // fingerstyle licks have the thumb's bass under them
  assert.ok(steps(a.song).some(s => s.notes.length >= 2), 'bass under the melody')
  console.log('composer: fresh lines, fingerstyle has a bass: ok')
}
{
  // slack key retunes a guitar to open G (D G D G B D), and capos for other keys; Jam's chords are followed
  const c = compose({ style: 'slackkey', part: 'lead', tonic: 'G', bars: 4, level: 2, seed: 5, tuning: STD })
  assert.deepEqual(c.tuning, [38, 43, 50, 55, 59, 62])
  assert.equal(capoFor(style('slackkey'), [38, 43, 50, 55, 59, 62], 9, false), 2, 'A: capo 2 in open G')
  assert.equal(capoFor(style('bluegrass'), STD, 9, false), 2, 'bluegrass in A: capo 2 (G shapes)')
  const chords = [spell('D', 'major', { semi: 0, type: '' }), spell('D', 'major', { semi: 7, type: '' })].map(x => ({ ...x, beats: 4 }))
  const j = compose({ style: 'mayer', part: 'lead', tonic: 'D', chords, bars: 4, level: 2, seed: 3, tuning: STD })
  assert.deepEqual(steps(j.song).map(s => s.chord).filter(Boolean), ['D', 'A', 'D', 'A'])
  // on a ukulele too
  const u = compose({ style: 'reggaerock', part: 'lead', tonic: 'C', bars: 2, level: 1, seed: 3, tuning: INSTRUMENTS.tenor.tunings[0].notes.map(n => ({ G4: 67, C4: 60, E4: 64, A4: 69 } as Record<string, number>)[n]) })
  assert.ok(steps(u.song).every(s => s.notes.every(n => n.string < 4)))
  console.log('composer: open G slack key, capos, Jam chords, ukulele: ok')
}
{
  // the new fingerpicking patterns make tabs (classical triplets in 3/4, percussive slaps)
  const inst = { ...INSTRUMENTS.guitar, tuning: INSTRUMENTS.guitar.tunings[0], midis: STD } as never
  const chords = [spell('C', 'major', { semi: 0, type: '' }), spell('C', 'major', { semi: 9, type: 'm' })].map(x => ({ ...x, beats: 4 }))
  const pcs = pickChords(chords, inst)
  for (const id of ['slack', 'cirillo', 'percussive', 'pima', 'giuliani', 'arp-maj7']) {
    assert.ok(PICK_PATTERNS.some(p => p.id === id), id)
    const s = pickingSong(pcs, id, STD)
    const n = s.tracks[0].bars.flatMap(b => b.steps).filter(x => x.notes.length).length
    assert.ok(n >= 8, `${id}: ${n} notes`)
    if (id === 'pima') assert.equal(s.meter, 3)
    if (id === 'percussive') assert.ok(s.tracks[0].bars.flatMap(b => b.steps).some(x => x.notes.some(nn => nn.tech === 'x')))
  }
  console.log('fingerpicking: slack key, Cirillo roll, percussive, classical triplets, Giuliani, hybrid: ok')
}

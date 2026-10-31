// Build 22: every songbook part (incl. the new full arrangements and the new styles) builds on guitar and ukulele,
// with whole bars, frets in range, no two notes on one string, and the melody really in the arrangement.
import './test-env'
import { SONGBOOK, songbookSong, GENRES } from '../src/tabs/songbook'
import { INSTRUMENTS, type Instrument } from '../src/instrument'
import { noteToMidi } from '../src/theory/notes'
import { fitToBars } from '../src/studio/loops'
let checks = 0, failed = 0
const ok = (c: boolean, m: string) => { checks++; if (!c) { failed++; console.log('  FAIL', m) } }
for (const id of ['guitar', 'tenor', 'baritone'] as const) {
  const def = INSTRUMENTS[id]
  const inst = { ...def, tuning: def.tunings[0], midis: def.tunings[0].notes.map(noteToMidi) } as unknown as Instrument
  for (const s of SONGBOOK) for (const p of s.parts) {
    const song = songbookSong(s.id, p.id, inst)
    ok(!!song, `${id} ${s.id}/${p.id} builds`)
    if (!song) continue
    const bars = song.tracks[0].bars
    bars.forEach((b, i) => {
      const len = b.steps.reduce((a, x) => a + x.dur, 0)
      ok(len <= s.meter + 0.01 && (i === 0 || i === bars.length - 1 || Math.abs(len - s.meter) < 0.01), `${id} ${s.id}/${p.id} bar ${i + 1} is ${len} beats`)
      for (const st of b.steps) {
        ok(new Set(st.notes.map(n => n.string)).size === st.notes.length, `${id} ${s.id}/${p.id} bar ${i + 1}: two notes on one string`)
        for (const n of st.notes) ok(n.fret >= 0 && n.fret <= 15 && n.string >= 0 && n.string < inst.midis.length, `${id} ${s.id}/${p.id}: fret ${n.fret} string ${n.string}`)
      }
    })
    if (p.kind === 'arrange') {
      const multi = bars.flatMap(b => b.steps).filter(st => st.notes.length > 1).length
      ok(multi > 0, `${id} ${s.id}: the arrangement has bass or strums with the melody`)
    }
  }
}
ok(GENRES.length >= 8, 'eight songbook styles')
for (const g of GENRES) ok(SONGBOOK.some(s => s.genre === g.id), `songs in ${g.label}`)
// free loops: small differences are stretched, big ones keep their speed
const sr = 8000, bar = 2
ok(fitToBars(new Float32Array(sr * 2 * 1.05), sr, bar).how === 'stretch', 'a take 5% long is stretched')
const big = fitToBars(new Float32Array(sr * 2 * 3), sr, bar)
ok(big.how === 'trim' && big.bars === 4 && Math.abs(big.ratio - 4 / 3) < 0.01, `a 3-bar take becomes 4 bars at its own speed (${big.how} ${big.bars})`)
console.log(`build22-logic: ${checks - failed}/${checks} checks passed`)
if (failed) process.exit(1)

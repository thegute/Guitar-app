import assert from 'node:assert/strict'
import { current, setInstrument } from '../src/instrument'
import { pc } from '../src/theory/notes'
import { CIRCLE_OF_4THS } from '../src/learn/cagedWarmup'
import { STARTER_PROGS, starterProgression } from '../src/tabs/fromProgression'
import {
  buildChordToChordConnection,
  buildConnectSong,
  buildDiagonalArpeggioSlides,
  buildDiagonalSong,
  CONNECT_ZONES,
  explainArpeggioConnect,
  handGroupForConnectBar,
  type ConnectLevel,
  type DiagonalQuality,
} from '../src/learn/arpeggioConnect'

setInstrument('guitar')
const guitar = current()
setInstrument('tenor')
const uke = current()
setInstrument('guitar')

// 1. Mode 1 (Chord-to-Chord): All 12 keys × All starter progressions × All 3 neck zones × All 3 levels
for (const key of CIRCLE_OF_4THS) {
  for (const sp of STARTER_PROGS) {
    const prog = starterProgression(sp.id, key)
    const chords = prog.chords.slice(0, 4).map(c => c.symbol)
    for (const z of CONNECT_ZONES) {
      for (const level of [1, 2, 3] as ConnectLevel[]) {
        const res = buildChordToChordConnection({
          chords,
          keyRootPc: pc(key),
          keyMinor: sp.mode === 'minor',
          inst: guitar,
          zoneId: z.id,
          level,
          chordSize: sp.id === 'jazz' ? '7th' : 'triad',
        })
        assert.equal(res.bars.length, chords.length, `Expected ${chords.length} bars for ${key} ${sp.id} ${z.id}`)
        for (const bar of res.bars) {
          assert.ok(bar.notes.length >= 3, `Expected >= 3 notes in bar ${bar.chordName}`)
          // Every bar must sum cleanly to exact 4.0 beats!
          const sumDur = bar.notes.reduce((a, n) => a + n.dur, 0)
          assert.ok(Math.abs(sumDur - 4) < 0.01, `Bar ${bar.chordName} Lv ${level} summed to ${sumDur} beats instead of 4`)
          // Every note must stay ergonomically inside the chosen neck zone!
          for (const n of bar.notes) {
            assert.ok(n.fret >= z.frets[0] && n.fret <= z.frets[1], `Note fret ${n.fret} out of zone ${z.frets} in ${key} ${sp.id}`)
          }
          // Bar handoff must exist & explain clearly
          assert.ok(bar.handoffToNext && bar.handoffToNext.coachText.length > 20)
        }
        // Zero bar-line stutter check when adjacent chords are distinct:
        for (let i = 0; i < res.bars.length - 1; i++) {
          const cur = res.bars[i]
          const nxt = res.bars[i + 1]
          if (cur.chordName !== nxt.chordName) {
            const lastChordTone = cur.notes.filter(n => !n.isBridge).slice(-1)[0]
            assert.notEqual(
              lastChordTone.midi,
              nxt.notes[0].midi,
              `Unexpected bar-line stutter between ${cur.chordName} and ${nxt.chordName} in ${key} ${z.id}`,
            )
          }
        }
      }
    }
  }
}

// 2. Mode 2 (Diagonal CAGED Slides): All 12 keys × Major / Minor / Dom7 — strictly <= fret 17 with real same-string slides!
for (const key of CIRCLE_OF_4THS) {
  for (const quality of ['maj', 'min', 'dom7'] as DiagonalQuality[]) {
    const diag = buildDiagonalArpeggioSlides({ rootPc: pc(key), quality, inst: guitar })
    assert.ok(diag.steps.length >= 8, `Expected >= 8 diagonal steps for ${key} ${quality}, got ${diag.steps.length}`)
    assert.ok(diag.slideArrows.length >= 1, `Expected at least 1 diagonal slide arrow for ${key} ${quality}`)
    for (const st of diag.steps) {
      assert.ok(st.note.fret >= 0 && st.note.fret <= 17, `Diagonal fret ${st.note.fret} exceeded 17 in ${key} ${quality}`)
      if (st.slideFrom) {
        assert.equal(st.note.string, st.slideFrom.string, `Diagonal slide must stay on same string in ${key} ${quality}`)
      }
    }
  }
}

// 3. Playable Song export (with backing band!), HandGroup, Uke support & Coach Guides
{
  const conn = buildChordToChordConnection({
    chords: ['C', 'G', 'Am', 'F'],
    keyRootPc: pc('C'),
    keyMinor: false,
    inst: guitar,
    zoneId: 'mid',
    level: 2,
    chordSize: 'triad',
  })
  const song = buildConnectSong(conn, guitar, 80, 2, 2)
  assert.equal(song.tracks[0].bars.length, 8) // 4 chords × 2 laps
  assert.ok(song.backing?.groove, 'Expected backing band groove on exported Connect song')
  assert.ok(handGroupForConnectBar(conn.bars[0]).notes.length > 0)

  const diag = buildDiagonalArpeggioSlides({ rootPc: pc('G'), quality: 'maj', inst: guitar })
  const diagSong = buildDiagonalSong(diag, guitar, 85)
  assert.ok(diagSong.tracks[0].bars.length >= 2)
  assert.ok(diagSong.tracks[0].bars.some(b => b.steps.some(s => s.notes.some(n => n.tech === '/'))))

  // Tenor Uke compatibility
  const ukeConn = buildChordToChordConnection({
    chords: ['C', 'F', 'G', 'C'],
    keyRootPc: pc('C'),
    keyMinor: false,
    inst: uke,
    zoneId: 'low',
    level: 1,
    chordSize: 'triad',
  })
  assert.equal(ukeConn.bars.length, 4)

  for (const mode of ['changes', 'diagonal'] as const) {
    for (const lv of [1, 2, 3] as ConnectLevel[]) {
      const g = explainArpeggioConnect(mode, lv, 'triad')
      assert.ok(g.what.length > 20 && g.why.length > 20 && g.how.length > 20 && g.avoid.length > 20)
    }
  }
}

console.log('arpeggio connector (chord-to-chord 3 levels, zero stutter, zone bounce & diagonal CAGED slides): ok')

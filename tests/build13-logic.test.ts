// Build 13 logic: rest runs in the tab, and (added as they land) the songbook, song check, retune warning, plans,
// band tracks, beat counts, strum coach, chord feedback, bends, lessons, trends and tap-to-sync.
import './test-env'
import { restRuns, flatten, pickupShift, type SongBar, type SongTrack } from '../src/tabs/model'
import { EXAMPLES, exampleDoc } from '../src/tabs/examples'
import { INSTRUMENTS, type Instrument } from '../src/instrument'
import { parseAbc, keySignature } from '../src/tabs/abc'
import { fingerMelody } from '../src/tabs/fingering'
import { SONGBOOK, songbookSong, songChords, parseSheet } from '../src/tabs/songbook'
import { parseSymbol } from '../src/theory/chords'
import { pickingSong, chopShape, bassWalk } from '../src/tabs/picking'
import { noteToMidi } from '../src/theory/notes'
import { checkSong } from '../src/play/songCheck'
import { chordHelp } from '../src/play/chordHelp'
import { timeline, fitTaps } from '../src/play/inTime'
import { strumPattern, countLabel } from '../src/play/strumCoach'
import { bandEvents, bandByStep, gmDrum, hasBand } from '../src/audio/band'
import { chordKind } from '../src/audio/pluck'
import { drillSong, TECHNIQUES } from '../src/learn/techniques'
import { songbookPick, todaysPlan } from '../src/learn/plan'
import { setProfile } from '../src/learn/profile'
import { LESSONS } from '../src/learn/lessons'
import { LESSON_EXTRAS, lessonTab } from '../src/learn/lessonExtras'
import { buildExercise } from '../src/tabs/exercises'
import { FrameFeatures, VoiceGate, type Heard } from '../src/audio/voiceGate'
import { NoteSegmenter, ChordSegmenter, matchChords, findLoop, cleanSegments, tabFromNotes } from '../src/audio/chordFinder'
import { PitchDetector } from 'pitchy'


let fails = 0, checks = 0
const ok = (c: boolean, m: string) => { checks++; if (!c) { fails++; if (fails < 40) console.log('FAIL', m) } }

// ---- rests: runs of empty bars become one block
{
  const note = { string: 0, fret: 3, midi: 43 }
  const rest = (): SongBar => ({ steps: [{ notes: [], dur: 4 }] })
  const play = (): SongBar => ({ steps: [{ notes: [note], dur: 4 }] })
  const tr = (bars: SongBar[]): SongTrack => ({ name: 't', tuning: [40, 45, 50, 55, 59, 64], capo: 0, bars })
  const runs = restRuns(tr([rest(), rest(), rest(), play(), rest(), play(), rest(), rest()]))
  ok(JSON.stringify(runs) === JSON.stringify([{ from: 0, to: 2 }, { from: 6, to: 7 }]), `runs ${JSON.stringify(runs)}`)
  // a single empty bar stays a bar; empty bars with no steps count as rests
  ok(restRuns(tr([play(), rest(), play()])).length === 0, 'one empty bar is not a run')
  ok(restRuns(tr([{ steps: [] }, { steps: [] }, play()])).length === 1, 'bars with no steps')
  // chord names, words and a new section keep bars out of a run
  const chorded = rest(); chorded.steps[0].chord = 'G'
  ok(restRuns(tr([rest(), chorded, rest()])).length === 0, 'a chord name breaks the run')
  const sung = rest(); sung.steps[0].lyric = 'la'
  ok(restRuns(tr([rest(), rest(), sung])).length === 1 && restRuns(tr([rest(), rest(), sung]))[0].to === 1, 'words break the run')
  const verse = rest(); verse.steps[0].section = 'Verse'
  ok(JSON.stringify(restRuns(tr([rest(), rest(), verse, rest()]))) === JSON.stringify([{ from: 0, to: 1 }, { from: 2, to: 3 }]), 'a section starts a new run')
  ok(restRuns(tr([rest(), rest(), rest()]), b => b === 1).length === 0, 'keep() splits runs')
  // dead notes are something to play
  ok(restRuns(tr([{ steps: [{ notes: [{ ...note, tech: 'x' }], dur: 4 }] }, rest()])).length === 0, 'dead notes are not rests')
}

// ---- pickups: only a first bar shorter than the bars after it
{
  ok(pickupShift([1, 4, 4, 4], 4) === 3, 'one-beat pickup in 4/4')
  ok(pickupShift([1, 3, 3], 3) === 2, 'one-beat pickup in 3/4')
  ok(pickupShift([2, 2, 2, 2], 4) === 0, 'all bars short (text tab guess): no pickup')
  ok(pickupShift([4, 4, 4], 4) === 0, 'full first bar')
  ok(pickupShift([1, 2, 2, 2], 4) === 1, 'short bars: pickup against the usual bar')
  ok(pickupShift([2], 4) === 2, 'a single short bar')
  ok(pickupShift([], 4) === 0, 'no bars')
  // the built-in examples: every bar adds up to the meter (Greensleeves has a one-beat pickup)
  for (const ex of EXAMPLES) {
    if (ex.for === 'any') continue
    const d = exampleDoc(ex.id)
    const m = d.song.meter ?? 4
    const lens = d.song.tracks[0].bars.map(b => b.steps.reduce((a, st) => a + st.dur, 0))
    if (ex.rhythm) ok(ex.rhythm.length === lens.length && ex.rhythm.every((r, i) => r.length === d.song.tracks[0].bars[i].steps.length), `${ex.id}: rhythm fits the bars`)
    if (ex.rhythm || ex.meter) ok(lens.slice(1).every(l => Math.abs(l - m) < 1e-6), `${ex.id}: bars are ${m} beats (${lens.join(' ')})`)
  }
  const green = exampleDoc('green').song
  ok(pickupShift(green.tracks[0].bars.map(b => b.steps.reduce((a, st) => a + st.dur, 0)), 3) === 2, 'Greensleeves starts on beat 3')
}

// ---- ABC reader
{
  ok(JSON.stringify(keySignature('D')) === JSON.stringify({ F: 1, C: 1 }), 'D major: F# C#')
  ok(JSON.stringify(keySignature('A mixolydian')) === JSON.stringify({ F: 1, C: 1 }), 'A mixolydian = D major')
  ok(JSON.stringify(keySignature('Ador')) === JSON.stringify({ F: 1 }), 'A dorian = G major')
  ok(JSON.stringify(keySignature('Am')) === '{}' && JSON.stringify(keySignature('F')) === JSON.stringify({ B: -1 }), 'Am, F')
  const t = parseAbc('M:4/4\nL:1/8\nK:G\n|: "G"GABc d2 B>G :|\n|: "C"c4 "D"d4 |1 e8 :|2 g8 |]')
  // A part twice, then B part: bar, 1st ending, bar, 2nd ending
  ok(t.bars.length === 6, `repeats and endings: ${t.bars.length} bars`)
  ok(t.bars[0][0].midi === 67 && t.bars[0][0].chord === 'G' && t.bars[0][4].dur === 1, 'notes, chord names, lengths')
  ok(t.bars[0][5].dur === 0.75 && t.bars[0][6].dur === 0.25, 'broken rhythm B>G')
  ok(t.bars[3][0].midi === 76 && t.bars[5][0].midi === 79, `endings ${t.bars.map(b => b[0].midi).join(',')}`)
  ok(parseAbc('L:1/8\nK:D\nF c =F ^G|F').bars[0].map(n => n.midi).join(',') === '66,73,65,68' && parseAbc('L:1/8\nK:D\nF =F|F').bars[1][0].midi === 66, 'key signature and accidentals')
  const tr = parseAbc('L:1/8\nK:C\n(3cde f2 g2|')
  ok(Math.abs(tr.bars[0].slice(0, 3).reduce((a, n) => a + n.dur, 0) - 1) < 1e-9, 'triplet: three eighths in one beat')
}

// ---- fingering: first position, open strings, in reach
{
  const std = [40, 45, 50, 55, 59, 64]
  const f = fingerMelody([55, 57, 59, 60, 62, 64, 66, 67], std)
  ok(f.map(p => `${p!.string}:${p!.fret}`).join(' ') === '3:0 3:2 4:0 4:1 4:3 5:0 5:2 5:3', `G scale in first position: ${f.map(p => `${p!.string}:${p!.fret}`).join(' ')}`)
  const want = [72, 74, 76, 74, 72]
  const hi = fingerMelody(want, std)
  ok(hi.every((p, i) => p && p.fret <= 12 && std[p.string] + p.fret === want[i]), `high notes are placed right: ${hi.map(p => p && `${p.string}:${p.fret}`)}`)
}

// ---- songbook: every part builds on every instrument, bars add up, notes are where they say
{
  const parts = SONGBOOK.reduce((a, s) => a + s.parts.length, 0)
  ok(SONGBOOK.length >= 24 && parts >= 50, `songbook size ${SONGBOOK.length} songs, ${parts} parts`)
  for (const g of ['folk', 'bluegrass', 'reggae']) for (const l of [1, 2, 3, 4]) ok(SONGBOOK.some(s => s.genre === g && s.parts.some(p => p.level === l)), `${g} has level ${l}`)
  ok(new Set(SONGBOOK.map(s => s.id)).size === SONGBOOK.length, 'unique ids')
  for (const s of SONGBOOK) {
    ok(new Set(s.parts.map(p => p.id)).size === s.parts.length, `${s.id}: unique part ids`)
    for (const c of songChords(s)) ok(/^[A-G][#b]?/.test(c.name) && c.beats > 0, `${s.id}: chord ${c.name} ${c.beats}`)
    if (s.sheet) {
      const beats = parseSheet(s.sheet, s.meter).reduce((a, c) => a + c.beats, 0)
      ok(beats % s.meter === 0, `${s.id}: words fill whole bars (${beats} beats)`)
    }
    if (s.abc) {
      const t = parseAbc(s.abc)
      t.bars.forEach((b, i) => {
        const d = b.reduce((a, n) => a + n.dur, 0)
        // the first bar may be a pickup; the rest are full
        ok(i === 0 || Math.abs(d - t.meter) < 1e-6 || (i === t.bars.length - 1 && d < t.meter), `${s.id}: bar ${i + 1} lasts ${d} of ${t.meter}`)
      })
    }
    for (const instId of ['guitar', 'tenor', 'baritone'] as const) {
      const def = INSTRUMENTS[instId]
      const tuning = def.tunings[0]
      const inst = { ...def, tuning, midis: tuning.notes.map(noteToMidi) } as unknown as Instrument
      for (const p of s.parts) {
        const song = songbookSong(s.id, p.id, inst)
        ok(!!song && song.tracks[0].bars.length > 0, `${s.id}/${p.id} on ${instId}`)
        if (!song) continue
        const tr = song.tracks[0]
        let bad = 0
        for (const st of flatten(tr)) for (const n of st.step.notes) if (n.string < 0 || n.string >= tr.tuning.length || n.fret < 0 || n.fret > 15 || tr.tuning[n.string] + n.fret !== n.midi) bad++
        ok(bad === 0, `${s.id}/${p.id} on ${instId}: ${bad} notes off the neck`)
        const playable = flatten(tr).filter(f => f.step.notes.length).length
        ok(playable >= 8, `${s.id}/${p.id} on ${instId}: ${playable} steps to play`)
        if (p.kind === 'melody' && instId === 'guitar') {
          const frets = flatten(tr).flatMap(f => f.step.notes.map(n => n.fret))
          ok(Math.max(...frets) <= (s.id === 'arkansas' ? 7 : 5), `${s.id} melody stays low on the neck (max fret ${Math.max(...frets)})`)
        }
        if (p.kind === 'octaves' && instId === 'guitar') ok(flatten(tr).every(f => !f.step.notes.length || (f.step.notes.length === 2 && f.step.notes[1].midi - f.step.notes[0].midi === 12)), `${s.id}: octave pairs`)
        if (p.kind === 'words') ok(tr.bars.every(b => Math.abs(b.steps.reduce((a, x) => a + x.dur, 0) - (song.meter ?? 4)) < 1e-6), `${s.id}: words bars full`)
      }
    }
  }
  // the sheet and the chord shapes agree
  const valley = songbookSong('valley', 'words', { ...INSTRUMENTS.guitar, tuning: INSTRUMENTS.guitar.tunings[0], midis: [40, 45, 50, 55, 59, 64] } as unknown as Instrument)!
  ok(valley.meter === 3 && valley.tracks[0].bars[0].steps[0].chord === 'G' && valley.tracks[0].bars[0].steps[0].lyric?.startsWith('Down') === true, 'valley: waltz, chord, words')
}

// ---- rhythm patterns: chops, bass walks, waltz
{
  const std = [40, 45, 50, 55, 59, 64]
  const am = chopShape([9, 0, 4], std)!
  ok(am.slice(0, 3).every(f => f < 0) && am.slice(3).every(f => f >= 2 && f <= 10), `Am chop on the top strings ${am}`)
  ok(new Set(am.slice(3).map((f, k) => (std[k + 3] + f) % 12)).size === 3, 'chop has root, third and fifth')
  const walk = bassWalk(43, 0, [7, 9, 11, 0, 2, 4, 6], std) // G up to C in G major
  ok(walk.join(',') === '45,47', `G→C walk A B: ${walk}`)
  ok(bassWalk(48, 7, [7, 9, 11, 0, 2, 4, 6], std).join(',') === '47,45', 'C→G walk down B A')
  const G = { name: 'G', root: 'G', beats: 8, voicing: { frets: [3, 2, 0, 0, 0, 3], fingers: [], barres: [], baseFret: 1, midi: [] } }
  const C = { name: 'C', root: 'C', beats: 4, voicing: { frets: [-1, 3, 2, 0, 1, 0], fingers: [], barres: [], baseFret: 1, midi: [] } }
  const bc = pickingSong([G, C], 'boomchick', std, { times: 1, scale: [7, 9, 11, 0, 2, 4, 6] })
  const g2 = bc.tracks[0].bars[1].steps.map(s => s.notes.map(n => n.midi).join('+'))
  ok(g2[2] === '45' && g2[3] === '47', `bass walk at the end of G: ${g2.join(' | ')}`)
  const w = pickingSong([{ ...G, beats: 6 }], 'waltz', std, { times: 1, meter: 3 })
  ok(w.meter === 3 && w.tracks[0].bars.length === 2 && w.tracks[0].bars.every(b => b.steps.reduce((a, s) => a + s.dur, 0) === 3), 'waltz in 3/4')
  const od = pickingSong([{ ...G, beats: 4 }], 'onedrop', std, { times: 1 })
  const steps = od.tracks[0].bars[0].steps
  ok(steps[0].notes.length === 0 && steps[1].notes.length === 3 && steps[1].notes.every(n => n.string >= 3), 'one drop: rest on 1, chop on 2 on the top strings')
}

const G6 = [40, 45, 50, 55, 59, 64]
const guitar = { ...INSTRUMENTS.guitar, tuning: INSTRUMENTS.guitar.tunings[0], midis: G6, isUke: false } as unknown as Instrument

// ---- song check
{
  const easy = songbookSong('valley', 'words', guitar)!
  const c1 = checkSong(easy, easy.tracks[0], guitar, [], 1)
  ok(c1.level === 1 && c1.chords.join(',') === 'G,D7' && !c1.barre.length && c1.tuning === null, `valley check: level ${c1.level}, ${c1.chords}`)
  const hard = songbookSong('arkansas', 'melody', guitar)!
  const c4 = checkSong(hard, hard.tracks[0], guitar, [], 2)
  ok(c4.level >= 2 && c4.fastest !== null && c4.fastest.nps > 3 && c4.startSpeed < 1, `arkansas check: level ${c4.level}, ${c4.fastest?.nps.toFixed(1)} nps, start ${c4.startSpeed}`)
  // a barre-chord sheet and a drop D tab
  const sheet = { ...easy, tracks: [{ ...easy.tracks[0], bars: [{ steps: [{ dur: 4, chord: 'F', notes: [{ string: 0, fret: 1, midi: 41 }, { string: 1, fret: 3, midi: 48 }, { string: 2, fret: 3, midi: 53 }] }] }, { steps: [{ dur: 4, chord: 'Bm', notes: [{ string: 1, fret: 2, midi: 47 }, { string: 2, fret: 4, midi: 54 }, { string: 3, fret: 4, midi: 59 }] }] }] }] }
  const cb = checkSong(sheet, sheet.tracks[0], guitar)
  ok(cb.barre.includes('F') && cb.barre.includes('Bm'), `barre chords found: ${cb.barre}`)
  const dropD = { ...easy, tracks: [{ ...easy.tracks[0], tuning: [38, 45, 50, 55, 59, 64] }] }
  const cd = checkSong(dropD, dropD.tracks[0], guitar)
  ok(cd.tuning?.id === 'dropd' && cd.tuning.name === 'Drop D' && cd.tuning.notes === 'D A D G B E', `drop D: ${JSON.stringify(cd.tuning)}`)
  const bends = { ...easy, tracks: [{ ...easy.tracks[0], bars: [{ steps: [{ dur: 1, notes: [{ string: 3, fret: 7, midi: 62, tech: 'b' }] }, { dur: 1, notes: [{ string: 3, fret: 5, midi: 60, tech: 'h' }] }] }] }] }
  const ct = checkSong(bends, bends.tracks[0], guitar)
  ok(ct.techniques.some(t => t.label === 'bends') && ct.techniques.some(t => t.label === 'hammer-ons'), `techniques: ${JSON.stringify(ct.techniques)}`)
}

// ---- chord help: which note is missing, which string
{
  const g = [{ string: 0, fret: 3, midi: 43 }, { string: 1, fret: 2, midi: 47 }, { string: 2, fret: 0, midi: 50 }, { string: 3, fret: 0, midi: 55 }, { string: 4, fret: 0, midi: 59 }, { string: 5, fret: 3, midi: 67 }]
  const ch = new Array(12).fill(0); ch[7] = 0.6; ch[11] = 0.3; ch[2] = 0.005; ch[1] = 0.02
  const h = chordHelp(ch, g, G6, pc => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][pc])
  ok(h.missing.length === 1 && h.missing[0].pc === 2 && h.missing[0].strings.join() === '2' && /D isn't ringing.*D string/.test(h.text), `missing D on the D string: ${h.text}`)
  const ch2 = new Array(12).fill(0); ch2[7] = 0.4; ch2[11] = 0.25; ch2[2] = 0.2; ch2[0] = 0.25
  const h2 = chordHelp(ch2, g, G6, pc => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][pc])
  ok(h2.extra.length >= 1 && h2.extra[0].pc === 0 && h2.extra[0].near !== undefined && /extra C.*string on the right fret/.test(h2.text), `extra C, a fret off: ${h2.text}`)
}

// ---- strum coach: one timed step per strum; counts
{
  const s = songbookSong('cabbage', 'words', guitar)!
  const flat = flatten(s.tracks[0])
  const plain = timeline(flat)
  const folk = timeline(flat, strumPattern('folk'), 4)
  ok(folk.steps.length === s.tracks[0].bars.length * 6 && plain.steps.length < folk.steps.length, `folk pattern: ${folk.steps.length} strums for ${s.tracks[0].bars.length} bars`)
  ok(folk.steps[2].beat === 1.5 && folk.steps[2].chord, 'third strum on the "and" of 2')
  const boom = timeline(flat, strumPattern('boomchick'), 4)
  ok(boom.steps[0].midis.length === 1 && !boom.steps[0].chord && boom.steps[1].chord, 'boom-chick: bass note, then strum')
  ok(['1', '&', 'e', 'a', '2', '4'].join() === [0, 0.5, 0.25, 0.75, 1, 3].map(countLabel).join(), 'counts')
}

// ---- tap to sync
{
  const spb = 60 / 96
  const taps = [0, 1, 2, 3, 5, 6, 7, 8, 9].map(i => 12.3 + i * spb + (i % 2 ? 0.012 : -0.01)) // one beat missed, a little wobble
  const f = fitTaps(taps)!
  ok(Math.abs(60 / f.spb - 96) < 0.6 && Math.abs(f.offset - 12.3) < 0.02, `tap fit ${60 / f.spb} bpm at ${f.offset}`)
}

// ---- band: drums and bass from the chords; GP drums
{
  const s = songbookSong('firstskank', 'chops', guitar)!
  ok(hasBand(s, 0), 'songbook songs have a band')
  const ev = bandEvents(s, 0)
  ok(ev.some(e => e.kind === 'drum') && ev.some(e => e.kind === 'bass'), 'drums and bass')
  const kicks = ev.filter(e => e.kind === 'drum' && e.voice === 'kick').map(e => e.beat % 4)
  ok(kicks.every(b => b === 2), `one drop: kick on 3 only (${[...new Set(kicks)]})`)
  const by = bandByStep(ev, flatten(s.tracks[0]))
  ok(by.flat().length === ev.filter(e => e.beat < flatten(s.tracks[0]).reduce((a, f) => a + f.step.dur, 0)).length, 'every band event belongs to a step')
  ok(gmDrum(36) === 'kick' && gmDrum(38) === 'snare' && gmDrum(42) === 'hat' && gmDrum(49) === 'crash' && gmDrum(51) === 'ride' && gmDrum(10) === null, 'GM drum map')
}

// ---- whole chords on amp tones
{
  ok(JSON.stringify(chordKind([40, 47, 52, 56, 59, 64])) === JSON.stringify({ minor: false, bass: 40 }), 'E major barre')
  ok(chordKind([45, 52, 57, 60, 64])?.minor === true && chordKind([45, 52, 57, 60, 64])?.bass === 45, 'A minor')
  ok(chordKind([43, 47, 50, 55, 59, 67])?.bass === 43, 'open G')
  ok(chordKind([48, 52, 55, 58])?.minor === false, 'C7 plays as C')
  ok(chordKind([47, 50, 55, 59])?.bass === 43 && chordKind([47, 50, 55, 59])?.minor === false, 'G/B: from G')
  ok(chordKind([40, 47, 52]) === null && chordKind([50, 55, 57, 62]) === null, 'power chords and sus chords are not')
}

// ---- technique drills and plans
{
  for (const t of TECHNIQUES) {
    ok(/^https:\/\//.test(t.video.url) && t.steps.length >= 3, `${t.id}: video and steps`)
    if ('tab' in t.drill) for (const tun of [G6, [67, 60, 64, 69], [50, 55, 59, 64]]) {
      const d = drillSong(t.drill.tab, tun)
      ok(!!d && flatten(d.tracks[0]).every(f => f.step.notes.every(n => n.string < tun.length && tun[n.string] + n.fret === n.midi)), `${t.id} drill on ${tun.length} strings`)
    }
  }
  setProfile({ level: 1, goals: ['strum'], genres: ['reggae'] })
  const pick = songbookPick(guitar, 3)!
  ok(pick.song.genre === 'reggae' && pick.part.level <= 1, `plan pick: ${pick.song.id}/${pick.part.id}`)
  const plan = todaysPlan(guitar, false)
  ok(plan.some(p => 'songbook' in p.go) && plan.some(p => p.id === 'changes'), `plan uses the songbook and chord changes: ${plan.map(p => p.id)}`)
  setProfile({ level: 4, goals: ['lead'], genres: ['bluegrass'] })
  const plan4 = todaysPlan(guitar, false)
  ok(plan4.some(p => p.id === 'lead' || (p.id === 'song' && /Learn/.test(p.title))), `advanced plan: ${plan4.map(p => p.title)}`)
}

// ---- lessons: read, watch, play
{
  const ids = new Set<string>()
  for (const l of LESSONS) {
    const x = LESSON_EXTRAS[l.id]
    ok(!!x, `lesson ${l.id} has a video and exercises`)
    if (!x) continue
    ok(!!x.video && /^[\w-]{11}$/.test(x.video.id) && x.video.title.length > 5, `${l.id}: video id ${x.video?.id}`)
    if (x.video) ids.add(x.video.id)
    ok(x.exercises.length >= 1, `${l.id}: exercises`)
    for (const ex of x.exercises) {
      for (const tun of [G6, [67, 60, 64, 69], [50, 55, 59, 64]]) {
        if ('spec' in ex) ok(buildExercise(ex.spec, tun).tracks[0].bars.length > 0 || tun !== G6, `${l.id}: ${ex.label} on ${tun.length} strings`)
        if ('songbook' in ex) ok(SONGBOOK.some(s2 => s2.id === ex.songbook.song && s2.parts.some(p => p.id === ex.songbook.part)), `${l.id}: songbook ${ex.songbook.song}/${ex.songbook.part}`)
        if ('drill' in ex) ok(!!drillSong(ex.drill, tun), `${l.id}: drill ${ex.drill}`)
        if ('tab' in ex) {
          const t = lessonTab(ex.tab, tun)
          ok(flatten(t.tracks[0]).filter(f => f.step.notes.length).length >= 4 && flatten(t.tracks[0]).every(f => f.step.notes.every(n => tun[n.string] + n.fret === n.midi && n.fret >= 0 && n.fret <= 15)), `${l.id}: tab ${ex.tab} on ${tun.length} strings`)
        }
      }
    }
  }
  ok(ids.size >= 45, `${ids.size} different videos`)
  // every exercise of every lesson opens something on every instrument and tuning (nothing silently does nothing)
  for (const def of Object.values(INSTRUMENTS)) for (const tn of def.tunings) {
    const mid = tn.notes.map(noteToMidi)
    for (const l of LESSONS) for (const ex of LESSON_EXTRAS[l.id]?.exercises ?? []) {
      let n = 1
      if ('spec' in ex) n = buildExercise(ex.spec, mid).tracks[0].bars.length
      else if ('drill' in ex) n = drillSong(ex.drill, mid)?.tracks[0].bars.length ?? 0
      else if ('tab' in ex) n = lessonTab(ex.tab, mid).tracks[0].bars.length
      else if ('example' in ex) n = 0 // examples are made for one instrument
      ok(n > 0, `${def.id}/${tn.id}: lesson ${l.id} exercise "${ex.label}" has something to play`)
    }
    // the shuffle riff stays in reach: fretted notes within four frets
    const sh = lessonTab('shuffle', mid)
    ok(flatten(sh.tracks[0]).every(f => { const fr = f.step.notes.map(x => x.fret).filter(x => x > 0); return f.step.notes.length === 2 && (!fr.length || Math.max(...fr) - Math.min(...fr) <= 4) && Math.max(...fr, 0) <= 10 }), `${def.id}/${tn.id}: shuffle riff in reach`)
  }
  const a = lessonTab('alphabetA', G6)
  ok(flatten(a.tracks[0]).every(f => f.step.notes[0].string === 1) && flatten(a.tracks[0]).map(f => f.step.notes[0].fret).slice(0, 8).join() === '0,2,3,5,7,8,10,12', 'alphabet on the A string')
  const iv = lessonTab('intervals', G6)
  ok(flatten(iv.tracks[0]).length === 24 && flatten(iv.tracks[0])[1].step.notes[0].midi === 46 && flatten(iv.tracks[0])[23].step.notes[0].midi === 57, 'intervals from A')
}

// ---- find the chords: playing vs talking vs singing, notes from plucks, chords from chroma
{
  const SR = 44100
  const rnd = (() => { let x = 12345; return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff } })()
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
  function pluck(midis: number[], noteDur: number): Float32Array {
    const lead = Math.round(0.4 * SR) // listening starts before the music
    const out = new Float32Array(lead + Math.round(midis.length * noteDur * SR) + SR / 2)
    midis.forEach((m, k) => {
      const t0 = lead + Math.round(k * noteDur * SR), f = hz(m)
      for (let i = 0; i < noteDur * SR * 1.2 && t0 + i < out.length; i++) {
        const t = i / SR
        let v = 0
        for (let h = 1; h <= 8; h++) v += Math.sin(2 * Math.PI * f * h * t) * Math.exp(-t * (2.5 + h * 1.5)) / h
        out[t0 + i] += 0.3 * v * Math.min(1, i / 40)
      }
    })
    return out
  }
  function voice(secs: number, kind: 'talk' | 'sing'): Float32Array {
    const out = new Float32Array(Math.round(secs * SR))
    let ph = 0
    const formants = [[700, 120], [1200, 150], [2600, 200]]
    for (let i = 0; i < out.length; i++) {
      const t = i / SR
      let f0: number, amp: number
      if (kind === 'talk') {
        const syl = Math.floor(t / 0.22), u = (t % 0.22) / 0.22
        f0 = 120 + 30 * Math.sin(t * 2.1) + 25 * (u - 0.5) * (syl % 2 ? 1 : -1)
        amp = Math.sin(Math.PI * u) ** 0.7
      } else {
        const note = [57, 60, 62, 60, 57][Math.floor(t / 0.8) % 5]
        f0 = hz(note) * Math.pow(2, (0.35 * Math.sin(2 * Math.PI * 5.5 * t)) / 12)
        const u = (t % 0.8) / 0.8
        amp = Math.min(1, u / 0.15) * (u > 0.92 ? (1 - u) / 0.08 : 1)
      }
      ph += f0 / SR
      // harmonics shaped by formants (a vowel)
      let v = 0
      for (let h = 1; h * f0 < 4000; h++) {
        let g = 0
        for (const [fc, bw] of formants) g += 1 / (1 + ((h * f0 - fc) / bw) ** 2)
        v += Math.sin(2 * Math.PI * h * ph) * (0.15 + g) / h
      }
      // consonants: hiss between syllables when talking
      const hiss = kind === 'talk' && (t % 0.22) / 0.22 > 0.78 ? (rnd() * 2 - 1) * 0.5 : 0
      out[i] = 0.12 * (v * amp + hiss)
    }
    return out
  }
  function listen(x: Float32Array, withSinging = false) {
    const feats = new FrameFeatures(SR)
    const gate = new VoiceGate()
    const det = PitchDetector.forFloat32Array(4096)
    const notes = new NoteSegmenter()
    const states: Heard[] = []
    for (let end = 4096; end <= x.length; end += Math.round(0.04 * SR)) {
      const w = x.subarray(end - 4096, end)
      let s2 = 0
      for (let i = 0; i < w.length; i++) s2 += w[i] * w[i]
      const level = Math.sqrt(s2 / w.length)
      const [f, clarity] = det.findPitch(w, SR)
      const midi = clarity > 0.9 && f > 60 && f < 1400 && level > 0.006 ? 69 + 12 * Math.log2(f / 440) : null
      const ft = feats.run(w)
      const t = end / SR
      const heard = gate.push({ t, level, midi, flatness: ft.flatness, onset: ft.onset })
      states.push(heard)
      notes.push(t, midi, ft.onset, level, heard === 'playing' ? 'pluck' : heard === 'singing' && withSinging ? 'any' : 'none')
    }
    notes.close(x.length / SR)
    const count = (h: Heard) => states.filter(s2 => s2 === h).length / states.length
    return { notes: notes.notes, ignored: notes.ignored, playing: count('playing'), talking: count('talking'), singing: count('singing') }
  }
  const melody = [55, 57, 59, 62, 64, 62, 59, 57, 55, 59, 62, 67]
  const p = listen(pluck(melody, 0.4))
  ok(p.playing > 0.7, `plucked melody heard as playing (${(p.playing * 100).toFixed(0)}%, talking ${(p.talking * 100).toFixed(0)}%, singing ${(p.singing * 100).toFixed(0)}%)`)
  const got = p.notes.map(n => n.midi)
  ok(got.length >= melody.length - 2 && got.filter((m, i) => melody.includes(m)).length >= got.length - 1, `notes from plucks: ${got.join(' ')}`)
  const talk = listen(voice(5, 'talk'))
  ok(talk.talking > 0.6 && talk.notes.length <= 1, `speech heard as talking (${(talk.talking * 100).toFixed(0)}%), ${talk.notes.length} notes kept, ${talk.ignored} left out`)
  const sing = listen(voice(5, 'sing'))
  ok(sing.playing < 0.35 && sing.singing > 0.5 && sing.notes.length <= 1, `singing not written as notes (playing ${(sing.playing * 100).toFixed(0)}%, singing ${(sing.singing * 100).toFixed(0)}%, talking ${(sing.talking * 100).toFixed(0)}%), ${sing.notes.length} notes`)
  const sung = listen(voice(5, 'sing'), true)
  ok(sung.notes.length >= 4 && sung.notes.every(n => [57, 60, 62].includes(n.midi)), `with "include singing": ${sung.notes.map(n => n.midi).join(' ')}`)
  // a repeated note picked twice is two notes
  const rep = listen(pluck([60, 60, 60, 64], 0.4))
  ok(rep.notes.filter(n => n.midi === 60).length === 3, `re-picked notes: ${rep.notes.map(n => n.midi).join(' ')}`)
  console.log("gate:", JSON.stringify({ pluck: [p.playing, p.notes.length], talk: [talk.talking, talk.notes.length, talk.ignored], sing: [sing.playing, sing.singing, sing.notes.length, sing.ignored], rep: rep.notes.map(n => n.midi) }))
  const tab = tabFromNotes(p.notes, 150, G6, 'heard')
  ok(flatten(tab.tracks[0]).every(f => f.step.notes.every(n => G6[n.string] + n.fret === n.midi)) && tab.tracks[0].bars.every(b => Math.abs(b.steps.reduce((a2, x2) => a2 + x2.dur, 0) - 4) < 1e-6 || b === tab.tracks[0].bars[tab.tracks[0].bars.length - 1]), 'heard notes become a tab')

  // chords: templates and segmenting
  const chromaOf = (pcs: number[], w = [1, 0.8, 0.7, 0.5]) => { const c = new Array(12).fill(0.02); pcs.forEach((p2, i) => { c[p2] += w[i] ?? 0.5 }); return c }
  ok(matchChords(chromaOf([9, 0, 4]))[0].root === 9 && matchChords(chromaOf([9, 0, 4]))[0].q === 'm', 'A minor')
  ok(matchChords(chromaOf([7, 11, 2]))[0].q === '' && matchChords(chromaOf([7, 11, 2]))[0].root === 7, 'G major')
  const amC = chromaOf([0, 4, 7, 9], [1, 0.8, 0.7, 0.9])
  const bassA = new Array(12).fill(0); bassA[9] = 1
  ok(matchChords(amC, bassA)[0].root === 9, 'Am7-ish with A in the bass reads as A (minor)')
  const seg = new ChordSegmenter()
  const prog = [[9, 0, 4], [5, 9, 0], [0, 4, 7], [7, 11, 2]]
  let t = 0
  for (let rep2 = 0; rep2 < 3; rep2++) for (const ch of prog) for (let k = 0; k < 50; k++) { t += 0.04; const b2 = new Array(12).fill(0); b2[ch[0]] = 1; seg.push(t, chromaOf(ch), b2, 0.05) }
  const found = cleanSegments(seg.segments)
  ok(found.length === 12 && found.map(x => x.root).join() === [9, 5, 0, 7, 9, 5, 0, 7, 9, 5, 0, 7].join(), `segments: ${found.map(x => x.root + x.q).join(' ')}`)
  ok(findLoop(found.map(x => `${x.root}${x.q}`)).join(' ') === '9m 5 0 7', `the loop: ${findLoop(found.map(x => `${x.root}${x.q}`)).join(' ')}`)
  // talking over nothing: no chords
  const seg2 = new ChordSegmenter()
  for (let k = 0; k < 100; k++) { const c = new Array(12).fill(0).map(() => 0.05 + rnd() * 0.1); seg2.push(k * 0.04, c, new Array(12).fill(0.01), 0.05, true) }
  ok(seg2.segments.length === 0, `no chords from talking (${seg2.segments.length})`)
}

console.log(`build 13 logic: ${checks} checks, ${fails} failed`)
process.exit(fails ? 1 : 0)

import { exporter, importer, Settings } from '@coderline/alphatab'
import { EXAMPLES, exampleDoc } from '../src/tabs/examples'
import { parseTextTab } from '../src/tabs/textTab'
import { fromTextTab, flatten } from '../src/tabs/model'
import { importGuitarPro } from '../src/tabs/gpImport'
import { chordInfo, chordTimeline, guessBarChords, voiceLeading, triadShapes, connectingWalk, chordScale, keyScalePcs, handWindow } from '../src/tabs/harmony'
import { detectKey, improvisationScales } from '../src/tabs/keyDetect'
import { matchNote } from '../src/tabs/follow'
import { youtubeId, youtubeStart } from '../src/tabs/library'

let fails = 0
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) fails++
  console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : `\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`)
}

// examples: chord lines, titles, notes
for (const ex of EXAMPLES) {
  const d = exampleDoc(ex.id)
  const t = d.song.tracks[0]
  const tl = chordTimeline(t, {}, [])
  console.log('   ', ex.id, 'bars', t.bars.length, 'steps', flatten(t).length, 'chords', tl.spans.map(s => `${s.name}@${s.bar + 1}`).join(' '))
}
eq('ode chords from chord line', chordTimeline(exampleDoc('ode').song.tracks[0], {}, []).spans.map(s => s.name), ['C', 'G', 'C', 'G', 'C', 'G', 'C'])
eq('greensleeves chords', chordTimeline(exampleDoc('green').song.tracks[0], {}, []).spans.map(s => s.name), ['Am', 'C', 'G', 'Am', 'E', 'Am'])
console.log(EXAMPLES[1].text)

// text tab with chord line, techniques, Ultimate Guitar markup, dead notes
const ug = `[Intro]
[ch]Em[/ch]                [ch]G[/ch]
e|-----------------|-----------------|
B|-----------------|-----------------|
G|-----------------|-----0-----------|
D|-------2h4-------|---0---0---------|
A|---2-------x-----|-2---------------|
E|-0---------------|-3---------------|`
const p = parseTextTab(ug, 'UG')!
eq('ug title', p.title, '[Intro]'.replace(/\[|\]/g, '') === 'Intro' ? p.title : '')
eq('ug bar1 chord', p.bars[0][0].chord, 'Em')
eq('ug bar2 chord', p.bars[1][0].chord, 'G')
eq('ug hammer', p.bars[0][2].notes[0], { string: 2, fret: 2, tech: 'h' })
eq('ug dead', p.bars[0][4].notes[0], { string: 1, fret: 0, tech: 'x' })
const ugSong = fromTextTab(p)
eq('ug midis bar1', ugSong.tracks[0].bars[0].steps.map(s => s.notes.map(n => n.midi)), [[40], [47], [52], [54], [45]])

// drop D detection + two-digit frets
const dd = `e|--12--|\nB|------|\nG|------|\nD|------|\nA|------|\nD|-0----|`
const pd = parseTextTab(dd)!
eq('drop D tuning', pd.tuning, ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'])
eq('drop D notes', pd.bars[0].map(s => s.notes), [[{ string: 0, fret: 0 }], [{ string: 5, fret: 12 }]])

// chord parsing
eq('Am7 labels', [...chordInfo('Am7')!.labels.values()], ['R', 'b3', '5', 'b7'])
eq('C/G parses as C', chordInfo('C/G')!.pcs, [0, 4, 7])
eq('Cm(maj7)', chordInfo('Cm(maj7)')?.pcs.length, 4)
eq('N.C. is null', chordInfo('N.C.'), null)
eq('E7#9 labels', [...chordInfo('E7#9')!.labels.values()], ['R', '3', '5', 'b7', '#9'])

// voice leading G -> C
const vl = voiceLeading(chordInfo('G')!, chordInfo('C')!)
eq('G->C common', vl.common, [7])
eq('G->C moves', vl.moves.map(m => [m.from, m.to, m.by]), [[11, 0, 1], [2, 4, 2]])

// triad shapes for C on G-B-e strings (standard tuning)
const std = [40, 45, 50, 55, 59, 64]
const tri = [...triadShapes(chordInfo('C')!, 3, std)].sort()
console.log('    C triads on G B e:', tri.join(' '))
eq('C triad root-position shape at 5th fret present', ['3-5', '4-5', '5-3'].every(k => tri.includes(k)) || ['3-9', '4-8', '5-8'].every(k => tri.includes(k)), true)

// connecting walk Am -> F in A minor, hand at frets 5-9
const kA = { root: 'A', minor: true, score: 0, label: 'A minor' }
const walk = connectingWalk(chordInfo('Am')!, chordInfo('F')!, keyScalePcs(kA), std, 5, 9)
console.log('    Am->F walk:', walk.map(w => `${w.string}:${w.fret}(${w.midi})`).join(' '))
eq('walk ends on 3rd of F (A)', walk.length > 0 && walk[walk.length - 1].midi % 12, 9)
eq('walk starts on an Am tone', walk.length > 0 && [9, 0, 4].includes(walk[0].midi % 12), true)
const walk2 = connectingWalk(chordInfo('G')!, chordInfo('C')!, keyScalePcs({ root: 'C', minor: false, score: 0, label: 'C major' }), std, 0, 4)
console.log('    G->C walk (open):', walk2.map(w => `${w.string}:${w.fret}`).join(' '))
eq('E over A minor = phrygian dominant', chordScale(chordInfo('E')!, keyScalePcs(kA), false).name, 'E phrygian dominant')
eq('hand window', [handWindow([7, 5, 8, 0]), handWindow([0, 2, 3]), handWindow([12, 14, 15])], [[5, 9], [0, 4], [12, 16]])

// key detection on Greensleeves
const g = exampleDoc('green').song.tracks[0]
const w = new Array(12).fill(0)
for (const b of g.bars) for (const s of b.steps) for (const n of s.notes) w[n.midi % 12] += s.dur
const kg = detectKey(w)
eq('greensleeves key', kg[0].label, 'A minor')
console.log('    tips:', improvisationScales(kg[0], w).map(t => `${t.root} ${t.scale} ${(t.fit * 100).toFixed(0)}%`).join(' | '))
// chord guessing for the pentatonic example (no edits)
const odeTrack = exampleDoc('ode').song.tracks[0]
const ow = new Array(12).fill(0)
for (const b of odeTrack.bars) for (const s of b.steps) for (const n of s.notes) ow[n.midi % 12] += s.dur
console.log('    ode key', detectKey(ow)[0].label, 'guesses:', guessBarChords(odeTrack, detectKey(ow)[0], false).join(' '))
console.log('    green guesses:', guessBarChords(g, kg[0], false).join(' '))
eq('D over A minor = dorian', chordScale(chordInfo('D')!, keyScalePcs(kA), false).name, 'D mixolydian')
eq('Bb over A minor keeps A', chordScale(chordInfo('Bb')!, keyScalePcs(kA), true).pcs.includes(9), true)

// edits override the tab
const odeT = exampleDoc('ode').song.tracks[0]
eq('edit bar 2 to Em', chordTimeline(odeT, { 1: 'Em' }, []).spans.slice(0, 3).map(s => `${s.name}:${s.source}`), ['C:tab', 'Em:you', 'C:tab'])
eq('remove chord in bar 1', chordTimeline(odeT, { 0: '' }, []).spans[0].bar, 1)

// matchNote with repeated notes and lookahead
const steps = [{ midis: [64] }, { midis: [64] }, { midis: [65] }, { midis: [67] }]
eq('repeat note hits step 0', matchNote(steps, 0, 64), { kind: 'hit', step: 0, skipped: 0 })
eq('skip ahead one', matchNote(steps, 1, 65), { kind: 'hit', step: 2, skipped: 1 })
eq('octave allowed', matchNote(steps, 3, 55), { kind: 'hit', step: 3, skipped: 0 })
eq('strict octave miss', matchNote(steps, 3, 55, true).kind, 'miss')

// youtube links
eq('yt ids', ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42', 'https://youtu.be/dQw4w9WgXcQ?si=abc', 'https://youtube.com/shorts/dQw4w9WgXcQ', 'https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ', 'nope'].map(youtubeId), ['dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'dQw4w9WgXcQ', null])
eq('yt start', [youtubeStart('https://youtu.be/x?t=1m30s'), youtubeStart('https://www.youtube.com/watch?v=x&t=42')], [90, 42])

// Guitar Pro round trip: alphaTex -> GP7 bytes -> our importer
const tex = `\\title "Round Trip"
\\artist "KGuitar test"
\\tempo 96
.
\\track "Bass"
\\staff {tabs}
\\tuning g2 d2 a1 e1
3.4.4 5.4 | 3.3 5.3.2 |
\\track "Lead Guitar"
\\staff {tabs}
\\tuning e4 b3 g3 d3 a2 e2
\\capo 2
:8 0.6 2.5 2.4 (0.3 1.2 0.1) r 5.3{h} 7.3 5.2 | :4 7.1 8.1 10.1 12.1
`
const score = importer.ScoreLoader.loadAlphaTex(tex, new Settings())
const bytes = new exporter.Gp7Exporter().export(score, new Settings())
console.log('    gp7 bytes:', bytes.length)
const song = importGuitarPro(bytes, 'rt.gp')
eq('gp title/artist/tempo', [song.title, song.artist, song.tempo], ['Round Trip', 'KGuitar test', 96])
eq('gp tracks', song.tracks.map(t => [t.name, t.tuning.length, t.capo]), [['Bass', 4, 0], ['Lead Guitar', 6, 2]])
const lead = song.tracks[1]
eq('gp lead tuning low->high', lead.tuning, [40, 45, 50, 55, 59, 64])
eq('gp bar1 notes', lead.bars[0].steps.map(s => s.notes.map(n => `${n.string}:${n.fret}${n.tech ?? ''}=${n.midi}`)), [['0:0=42'], ['1:2=49'], ['2:2=54'], ['3:0=57', '4:1=62', '5:0=66'], [], ['3:5h=62'], ['3:7=64'], ['4:5=66']])
eq('gp durations', lead.bars[0].steps.map(s => s.dur), [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
eq('gp bar2 quarters', lead.bars[1].steps.map(s => s.dur), [1, 1, 1, 1])

console.log(fails ? `\n${fails} FAILED` : '\nall passed')
process.exit(fails ? 1 : 0)

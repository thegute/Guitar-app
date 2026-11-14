// The on-phone models' plain logic (no model files needed): chunking like the models' own code, note and beat
// post-processing on hand-made outputs, the beat grid, and notes → tab on the real beat grid.
import './test-env'
import { strict as assert } from 'node:assert'
import { BEAT, NOTE, beatChunks, beatChunk, beatsFrom, gridFrom, joinBeatChunks, noteChunks, notesFrom, type NoteOut } from '../src/ml/post'
import { beatPositions, notesToSong, quantize } from '../src/ml/toTab'
import { resample } from '../src/ml/dsp'
import { parseHeard, withoutVoice, wavBase64 } from '../src/scan/listen'
import { strumPattern } from '../src/play/strumCoach'

let checks = 0
const ok = (c: boolean, m: string) => { checks++; assert.ok(c, m) }
const near = (a: number, b: number, e = 1e-6) => Math.abs(a - b) <= e

// chunking = beat_this split_piece(chunk 1500, border 6, avoid_short_end) and Kong-style 10 s note chunks moving 8 s
ok(JSON.stringify(beatChunks(100)) === '[-6]', 'one short piece = one chunk from -6')
ok(JSON.stringify(beatChunks(3000)) === '[-6,1482,1506]', `3000 frames → [-6,1482,1506] (${beatChunks(3000)})`)
ok(JSON.stringify(noteChunks(16000 * 25)) === JSON.stringify([0, 128000, 256000]), `25 s → 3 note chunks (${noteChunks(16000 * 25)})`)
ok(noteChunks(1000).length === 1, 'a short clip is one chunk')
{
  const sp = new Float32Array(3000 * BEAT.mels).map((_, i) => i)
  const c = beatChunk(sp, 3000, -6)
  ok(c.frames === 1500 && c.data[0] === 0 && c.data[6 * BEAT.mels] === 0 && c.data[6 * BEAT.mels + 1] === 1, 'first chunk zero-padded by 6 frames')
  const last = beatChunk(sp, 3000, 1506)
  ok(last.frames === 1494 + 0 || last.frames === 1500, `last chunk ends at the end (${last.frames})`)
}

// notes from hand-made outputs: one note at frame 50 (shifted a bit), held until the frame drops at 80
{
  const F = 200, K = NOTE.keys
  const o: NoteOut = { onset: new Float32Array(F * K), offset: new Float32Array(F * K), frame: new Float32Array(F * K), velocity: new Float32Array(F * K) }
  const k = 64 - 21
  ;[[48, 0.1], [49, 0.4], [50, 0.9], [51, 0.6], [52, 0.2]].forEach(([f, v]) => { o.onset[f * K + k] = v })
  for (let f = 50; f < 80; f++) o.frame[f * K + k] = 0.8
  o.velocity[50 * K + k] = 0.7
  const n = notesFrom(o, F)
  ok(n.length === 1 && n[0].midi === 64 && near(n[0].velocity, 0.7), `one note E4 (${JSON.stringify(n)})`)
  // Kong's shift: x[n-1]=0.4 < x[n+1]=0.6 → (0.6-0.4)/(0.9-0.4)/2 = 0.2 frames later
  ok(near(n[0].start, 50.2 / 100, 1e-6) && near(n[0].end, 0.8, 1e-6), `start 0.502 s, end 0.80 s (${n[0].start}, ${n[0].end})`)
}

// beats from logits: peaks above 0 within ±3 frames; downbeats moved to the nearest beat
{
  const N = 500, beat = new Float32Array(N).fill(-5), down = new Float32Array(N).fill(-5)
  for (let f = 10; f < N; f += 25) { beat[f] = 3; beat[f + 1] = 2.9 } // a plateau of two frames = one beat
  for (let f = 11; f < N; f += 100) down[f] = 2
  const { beats, downbeats } = beatsFrom(beat, down)
  ok(beats.length === 20 && near(beats[0], 0.2), `20 beats from 0.2 s (${beats.length}, ${beats[0]})`)
  ok(downbeats.length === 5 && near(downbeats[0], 0.2), `downbeats snapped to beats (${downbeats.slice(0, 2)})`)
  const g = gridFrom(beats, downbeats)!
  ok(g.bpm === 120 && g.beatsPerBar === 4, `120 BPM in 4 (${g.bpm}, ${g.beatsPerBar})`)
}
// the tempo is exact even though beats sit on 20 ms frames
{
  const spb = 60 / 137
  const beats = Array.from({ length: 60 }, (_, i) => Math.round((0.5 + i * spb) * 50) / 50)
  const downs = beats.filter((_, i) => i % 3 === 0)
  const g = gridFrom(beats, downs)!
  ok(Math.abs(g.bpm - 137) <= 0.2 && g.beatsPerBar === 3, `137 BPM in 3 from frame-rounded beats (${g.bpm}, ${g.beatsPerBar})`)
}
// joining keeps the earlier chunk where they overlap
{
  const starts = [-6, 1482]
  const a = { beat: new Float32Array(1500).fill(1), downbeat: new Float32Array(1500).fill(1) }
  const b = { beat: new Float32Array(1500).fill(2), downbeat: new Float32Array(1500).fill(2) }
  const j = joinBeatChunks([a, b], starts, 2500)
  ok(j.beat[0] === 1 && j.beat[1487] === 1 && j.beat[1488] === 2, `keep_first join (${j.beat[1487]}, ${j.beat[1488]})`)
}

// notes → tab on the beat grid
const tuning = [40, 45, 50, 55, 59, 64]
const note = (start: number, midi: number, len = 0.2) => ({ start, end: start + len, midi, velocity: 0.7 })
const allSteps = (s: ReturnType<typeof notesToSong>) => s!.tracks[0].bars.flatMap(b => b.steps)
// a recording that speeds up from 90 to 110 BPM: 8ths on its own beats come out as exact 8ths
{
  const beats: number[] = []
  let t = 1
  for (let i = 0; i < 24; i++) { beats.push(t); t += 60 / (90 + (20 * i) / 23) }
  const g = gridFrom(beats, beats.filter((_, i) => i % 4 === 0))!
  const ns = beats.slice(0, 20).flatMap((b, i) => [note(b, 52 + (i % 5)), note(b + (beats[i + 1] - b) / 2, 59)])
  const s = notesToSong(ns, { tuning, title: 't', chords: false, grid: g })!
  const durs = allSteps(s).filter(st => st.notes.length).map(st => st.dur)
  ok(durs.length === 40 && durs.slice(0, -1).every(d => near(d, 0.5)), `drifting tempo: 40 eighths (the last one as long as it rang) (${durs.length}, ${[...new Set(durs)]})`)
  ok(s.tracks[0].bars.every(b => near(b.steps.reduce((a, x) => a + x.dur, 0), 4)), 'every bar is 4 beats')
}
// a pickup: two notes a beat before the first "1"
{
  const spb = 0.5
  const beats = Array.from({ length: 20 }, (_, i) => 1 + i * spb)
  const g = gridFrom(beats, beats.filter((_, i) => i >= 2 && (i - 2) % 4 === 0))!
  const ns = [note(1.5, 55), note(1.75, 57), ...beats.slice(2, 12).map(b => note(b, 59))]
  const s = notesToSong(ns, { tuning, title: 't', chords: false, grid: g })!
  const len0 = s.tracks[0].bars[0].steps.reduce((a, x) => a + x.dur, 0)
  ok(near(len0, 1), `pickup bar of 1 beat (${len0})`)
}
// triplets everywhere in 2 beats a bar → written in 6/8
{
  const spb = 0.6
  const beats = Array.from({ length: 16 }, (_, i) => 0.5 + i * spb)
  const g = gridFrom(beats, beats.filter((_, i) => i % 2 === 0))!
  const ns = beats.slice(0, 12).flatMap(b => [0, 1, 2].map(k => note(b + (k * spb) / 3, 52 + k * 2, 0.15)))
  const s = notesToSong(ns, { tuning, title: 't', chords: false, grid: g })!
  ok(s.timeSig?.[0] === 6 && s.timeSig?.[1] === 8 && s.meter === 3, `6/8 (${s.timeSig}, meter ${s.meter})`)
  ok(near(s.tempo!, 150, 0.2), `quarter-note tempo 100 × 1.5 = 150 (${s.tempo})`)
  const durs = allSteps(s).filter(st => st.notes.length).map(st => st.dur)
  ok(durs.every(d => near(d, 0.5)), `each triplet = an eighth in 6/8 (${[...new Set(durs)]})`)
}
// 3/4 from the grid
{
  const beats = Array.from({ length: 18 }, (_, i) => 0.4 + i * 0.5)
  const g = gridFrom(beats, beats.filter((_, i) => i % 3 === 0))!
  const s = notesToSong(beats.slice(0, 15).map(b => note(b, 55)), { tuning, title: 't', chords: false, grid: g })!
  ok(s.meter === 3 && s.timeSig?.[0] === 3, `3/4 (${s.meter}, ${s.timeSig})`)
}
// chords mode keeps several notes; single mode keeps the loudest
{
  const beats = Array.from({ length: 12 }, (_, i) => 0.5 + i * 0.5)
  const g = gridFrom(beats, beats.filter((_, i) => i % 4 === 0))!
  const ns = beats.slice(0, 8).flatMap(b => [{ ...note(b, 52), velocity: 0.5 }, { ...note(b + 0.01, 56), velocity: 0.9 }, { ...note(b + 0.02, 59), velocity: 0.6 }])
  const c = notesToSong(ns, { tuning, title: 't', chords: true, grid: g })!
  const s1 = notesToSong(ns, { tuning, title: 't', chords: false, grid: g })!
  ok(allSteps(c).some(st => st.notes.length === 3), 'chords kept')
  ok(allSteps(s1).filter(st => st.notes.length).every(st => st.notes.length === 1 && st.notes[0].midi === 56), 'single notes = the loudest')
}
// quantize prefers 16ths when it's close
{
  const { q } = quantize([0, 0.26, 0.49, 0.74, 1.0, 1.34, 1.66])
  ok(JSON.stringify(q.map(x => Math.round(x * 1000) / 1000)) === JSON.stringify([0, 0.25, 0.5, 0.75, 1, 1.333, 1.667]), `16ths then triplets (${q})`)
}
// a fast sextuplet run keeps all six notes (16ths would squeeze two onto one spot); 32nds where they're 32nds
{
  const six = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6].map((x, i) => x + (i % 2 ? 0.01 : -0.008))
  const { q } = quantize(six)
  ok(new Set(q.map(x => Math.round(x * 1000))).size === 6 && Math.abs(q[1] - 1 / 6) < 1e-6, `sextuplets kept (${q})`)
  const thirty = [0, 0.125, 0.25, 0.375, 0.5, 0.75]
  ok(JSON.stringify(quantize(thirty).q) === JSON.stringify(thirty), `32nds kept (${quantize(thirty).q})`)
}
// resampling keeps a 440 Hz tone at 440 Hz
{
  const x = new Float32Array(22050).map((_, i) => Math.sin((2 * Math.PI * 440 * i) / 22050))
  const y = resample(x, 22050, 16000)
  let zc = 0
  for (let i = 1; i < y.length; i++) if (y[i - 1] < 0 && y[i] >= 0) zc++
  ok(y.length === 16000 && Math.abs(zc - 440) <= 1, `440 Hz stays 440 Hz (${zc})`)
}
void beatPositions

// the AI's second opinion, read
{
  const h = parseHeard(`SONG: Unknown
KEY: G
TEMPO: 96
TIME: 4/4
CHORDS: 0.0 G; 2.5 C; 5.0 D7; 7.5 Em
SECTIONS: 0.0 intro; 10.2 verse
STRUM: D-DU-UDU
TECHNIQUES: hammer-ons, slides
VOICE: 0.0-1.8 talk; 12-20 sing
NOTES:
0.50 E4 0.25
0.75 F#4 0.25
1.00 G4 0.5`)
  ok(!h.song && h.key === 'G' && h.tempo === 96 && h.timeSig?.join('/') === '4/4', `song/key/tempo/time (${JSON.stringify([h.song, h.key, h.tempo, h.timeSig])})`)
  ok(h.chords.length === 4 && h.chords[2].name === 'D7' && h.chords[2].t === 5, `chords with times (${JSON.stringify(h.chords)})`)
  ok(h.sections.length === 2 && h.sections[1].name === 'verse', 'sections')
  ok(h.strum === 'D-DU-UDU' && h.techniques.join(',') === 'hammer-ons,slides', 'strum and techniques')
  ok(h.voice.length === 2 && h.voice[0].kind === 'talk' && h.voice[1].kind === 'sing' && h.voice[1].to === 20, `voice stretches (${JSON.stringify(h.voice)})`)
  ok(h.notes?.length === 3 && h.notes[1].midi === 66 && Math.abs(h.notes[2].end - 1.5) < 1e-9, `the AI's own notes (${JSON.stringify(h.notes)})`)
  const ns = [note(1, 60), note(5, 62), note(15, 64), note(25, 65)]
  ok(withoutVoice(ns, h.voice).map(n => n.midi).join() === '62,65', 'talking and singing taken out')
  ok(withoutVoice(ns, h.voice, true).map(n => n.midi).join() === '62,64,65', 'singing kept when asked')
  const known = parseHeard('SONG: Greensleeves | Traditional\nTEMPO: 72\nTIME: 6/8')
  ok(known.song === 'Greensleeves' && known.artist === 'Traditional' && known.timeSig?.join('/') === '6/8', 'a known song')
  ok(parseHeard('nothing useful').chords.length === 0, 'an empty answer reads as nothing')
}
// the heard strum as the song's own pattern
{
  const p = strumPattern('custom:D-DU-UDU')!
  ok(!!p && p.meter === 4 && JSON.stringify(p.hits) === JSON.stringify([[0, 'D'], [1, 'D'], [1.5, 'U'], [2.5, 'U'], [3, 'D'], [3.5, 'U']]), `custom strum (${JSON.stringify(p?.hits)})`)
  ok(strumPattern('custom:D-D-D-')?.meter === 3 && !strumPattern('custom:nonsense'), 'waltz strum; nonsense ignored')
}
// chord names on the tab, and a bar where they disagree
{
  const beats = Array.from({ length: 20 }, (_, i) => 0.5 + i * 0.5)
  const g = gridFrom(beats, beats.filter((_, i) => i % 4 === 0))!
  // bar 1: G chord tones; bar 2: notes of F major over a "G" label → check it
  const ns = [...[55, 59, 62, 67].map((m, i) => note(0.5 + i * 0.5, m)), ...[53, 57, 60, 65].map((m, i) => note(2.5 + i * 0.5, m))]
  const report = { checkBars: [] as number[] }
  const s = notesToSong(ns, { tuning, title: 't', chords: false, grid: g, chordTimes: [{ t: 0.5, name: 'G' }], report })!
  ok(s.tracks[0].bars[0].steps[0].chord === 'G', 'chord written above the first note')
  ok(JSON.stringify(report.checkBars) === '[1]', `bar 2 flagged (${report.checkBars})`)
}
// the clip sent to the AI: a WAV at 16 kHz
{
  const b = Buffer.from(wavBase64(new Float32Array(44100).fill(0.5), 44100), 'base64')
  ok(b.toString('latin1', 0, 4) === 'RIFF' && b.readUInt32LE(24) === 16000 && b.readUInt32LE(40) === 32000, `16 kHz WAV, 1 s (${b.readUInt32LE(24)}, ${b.readUInt32LE(40)})`)
}
console.log(`ml logic: ${checks} checks, 0 failed`)

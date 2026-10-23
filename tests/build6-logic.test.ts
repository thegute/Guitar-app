// Build 6 logic: chord sheets (strum-along) on every instrument, the importer, play-in-time timing and scoring,
// the speed trainer, per-song progress (learned / review / trouble bars), share titles, gear sensitivity and pedals.
import './test-env'
import { INSTRUMENTS, type Instrument } from '../src/instrument'
import { noteToMidi, pc } from '../src/theory/notes'
import { SUFFIX_IV } from '../src/instrument'
import { parseSymbol } from '../src/theory/chords'
import { parseChordSheet } from '../src/tabs/chordSheet'
import { songFromText } from '../src/tabs/importer'
import { EXAMPLES } from '../src/tabs/examples'
import { flatten, type FlatStep, type SongStep } from '../src/tabs/model'
import { timeline, judge, scoreRun, nextSpeed, matchTimed, type TimedStep } from '../src/play/inTime'
import { recordRun, songStats, troubleBars, dueReviews } from '../src/play/songStats'
import { titleFromSubject } from '../src/shareIn'
import { gateFrom, setGear, gear, isSetUp } from '../src/audio/gear'
import { bindings, bind, unbind, resetBindings, describe } from '../src/controls/pedals'
import { readBackup, backupSummary } from '../src/backup'

let fails = 0, checks = 0
const bad = (m: string) => { fails++; if (fails < 40) console.log('FAIL', m) }
const ok = (cond: boolean, m: string) => { checks++; if (!cond) bad(m) }

function instruments(): Instrument[] {
  return Object.values(INSTRUMENTS).flatMap(def => def.tunings.map(t => ({ ...def, tuning: t, midis: t.notes.map(noteToMidi), isUke: def.id !== 'guitar' })))
}

// ---------- chord sheets ----------
const grace = EXAMPLES.find(e => e.id === 'grace')!.text
for (const inst of instruments()) {
  const where = `${inst.id}/${inst.tuning.id}`
  const song = parseChordSheet(grace, 'Pasted tab', inst)
  ok(!!song, `${where}: Amazing Grace parses`)
  if (!song) continue
  ok(song.title === 'Amazing Grace (traditional)', `${where}: title from first line, got ${song.title}`)
  const steps = song.tracks[0].bars.flatMap(b => b.steps)
  ok(steps.length === 13, `${where}: 13 chords, got ${steps.length}`)
  ok(steps[0].section === 'Verse', `${where}: section label on the first chord`)
  ok(/^Amazing grace/.test(steps[0].lyric ?? ''), `${where}: lyric under the first chord: ${steps[0].lyric}`)
  ok(steps.map(s => s.lyric ?? '').join(' ').replace(/\s+/g, ' ').includes('how sweet the sound'), `${where}: words kept`)
  for (const s of steps) {
    const { root, suffix } = parseSymbol(s.chord!)
    const want = new Set((SUFFIX_IV[suffix] ?? SUFFIX_IV.major).map(iv => (pc(root) + iv) % 12))
    const got = s.notes.map(n => n.midi % 12)
    ok(s.notes.length >= 3, `${where}: ${s.chord} has a shape (${s.notes.length} notes)`)
    ok(got.every(p => want.has(p)), `${where}: ${s.chord} shape only uses chord tones`)
    ok(got.includes(pc(root) % 12), `${where}: ${s.chord} shape includes the root`)
    ok(s.notes.every(n => n.midi === inst.midis[n.string] + n.fret), `${where}: ${s.chord} midi = string + fret`)
  }
  // capo moves every note up
  const capoSong = parseChordSheet('Capo 2\n' + grace, 'x', inst)!
  ok(capoSong.tracks[0].capo === 2, `${where}: capo read`)
  const a = steps[0].notes[0], b = capoSong.tracks[0].bars[0].steps[0].notes[0]
  ok(b.midi - a.midi === 2 && a.fret === b.fret, `${where}: capo adds 2 semitones to the sounding notes`)
}
const g = instruments()[0]
ok(parseChordSheet('just some words\nand a G chord', 'x', g) === null, 'prose with one chord is not a chord sheet')
ok(parseChordSheet('[ch]Am[/ch]  [ch]F[/ch]  [ch]C[/ch]  [ch]G[/ch]\nla la la la', 'x', g)?.tracks[0].bars.length === 4, 'Ultimate Guitar [ch] tags')
ok(parseChordSheet('| Am | F | C | G |  x2', 'x', g)?.tracks[0].bars.length === 4, 'bar lines and x2 ignored')
ok(parseChordSheet('Cmaj7 Dm7 G7sus4 C/E Bb F#m7b5 Eadd9', 'x', g)?.tracks[0].bars.length === 7, 'extended chord names recognised')

// importer: a tab stays a tab, a chord sheet becomes a strum-along
const tabText = `e|-----0---|\nB|---1---1-|\nG|-0-------|\nD|---------|\nA|-3-------|\nE|---------|`
ok(songFromText(tabText, 'Tab', g)?.source === 'text', 'text tab imports as a tab')
ok(songFromText(grace, '', g)?.source === 'chords', 'chord sheet imports as chords')
ok(songFromText('hello there', '', g) === null, 'plain text is rejected')
ok(songFromText(grace, '', instruments().find(i => i.id === 'tenor')!)?.inst === 'tenor', 'imported song remembers its instrument')

// ---------- play in time ----------
const step = (dur: number, midis: number[]): SongStep => ({ dur, notes: midis.map((m, s) => ({ string: s, fret: 0, midi: m })) })
const flat: FlatStep[] = flatten({ name: 't', tuning: [40, 45, 50, 55, 59, 64], capo: 0, bars: [
  { steps: [step(1, [64]), step(1, [67]), step(0.5, []), step(0.5, [69]), step(1, [48, 52, 55])] },
  { steps: [step(2, [60]), step(2, [62])] },
] })
const tl = timeline(flat)
ok(tl.total === 8, 'timeline total beats')
ok(tl.steps.length === 6, 'rests are not steps')
ok(tl.steps.map(s => s.beat).join() === '0,1,2.5,3,4,6', `beats ${tl.steps.map(s => s.beat)}`)
ok(tl.steps[3].chord && !tl.steps[0].chord, 'three different notes = strum')

ok(judge(0) === 'perfect' && judge(45) === 'perfect' && judge(-46) === 'good' && judge(90) === 'good', 'judge windows')
ok(judge(-91) === 'early' && judge(120) === 'late', 'early / late')
ok(judge(70, 30) === 'perfect', 'slack widens the window')

const run = scoreRun(['perfect', 'good', 'early', 'late', 'miss', undefined], [5, -40, -120, 130])
ok(run.total === 6 && run.hit === 4 && run.onTime === 2 && run.missed === 2, 'run counts')
ok(run.score === 50, `score: on time 1, early/late half (got ${run.score})`)
ok(run.meanErr === -6, `mean error ${run.meanErr}`)
ok(scoreRun([], []).score === 0, 'empty run scores 0')

const trainer = { step: 0.05, target: 1, pass: 90 }
ok(nextSpeed(0.6, 92, trainer) === 0.65, 'pass speeds up')
ok(nextSpeed(0.6, 80, trainer) === 0.6, 'fail stays')
ok(nextSpeed(0.98, 100, trainer) === 1, 'never above target')
let sp = 0.6, passes = 0
while (sp < 1 && passes < 50) { sp = nextSpeed(sp, 95, trainer); passes++ }
ok(passes === 8 && sp === 1, `0.6 → 1.0 in 8 good passes (got ${passes}, ${sp})`)

const spb = 0.5 // 120 bpm
const steps: TimedStep[] = tl.steps
const taken = new Set<number>()
let m = matchTimed(steps, 1.04, spb, { midi: 67 }, taken)
ok(m?.step === 1 && Math.round(m.errMs) === 20, `late by 20 ms: ${JSON.stringify(m)}`)
ok(matchTimed(steps, 1.04, spb, { midi: 55 }, taken)?.step === 1, 'any octave matches by default')
ok(matchTimed(steps, 1.04, spb, { midi: 55 }, taken, true) === null, 'strict octave')
ok(matchTimed(steps, 1.04, spb, { midi: 61 }, taken) === null, 'wrong note is not matched')
taken.add(1)
ok(matchTimed(steps, 1.04, spb, { midi: 67 }, taken) === null, 'a judged note is not judged twice')
ok(matchTimed(steps, 1.9, spb, { midi: 67 }, new Set()) === null, 'too far from the beat')
m = matchTimed(steps, 2.9, spb, { chordOk: ms => ms.length === 3 }, new Set())
ok(m?.step === 3 && Math.round(m.errMs) === -50, `strum judged by chord: ${JSON.stringify(m)}`)
ok(matchTimed(steps, 2.95, spb, { midi: 48 }, new Set()) === null, 'a single note does not count for a strum')
ok(matchTimed(steps, 2.95, spb, { chordOk: () => false }, new Set()) === null, 'wrong chord does not count')

// ---------- per-song progress ----------
const DAY = 864e5
let t = Date.UTC(2026, 0, 10, 12)
recordRun('s1', { title: 'Song', inst: 'guitar' }, { score: 70, mode: 'wait', speed: 1, full: true }, { miss: { 3: 4, 4: 2 }, hit: { 1: 10, 3: 2 } }, t)
let st = songStats('s1')!
ok(st.best === 70 && !st.learnedAt, 'not learned at 70%')
ok(JSON.stringify(troubleBars(st)) === JSON.stringify({ from: 3, to: 4, misses: 6 }), `trouble bars ${JSON.stringify(troubleBars(st))}`)
recordRun('s1', { title: 'Song', inst: 'guitar' }, { score: 95, mode: 'time', speed: 0.6, full: true }, { miss: {}, hit: {} }, t += DAY)
ok(!songStats('s1')!.learnedAt, 'not learned at 60% speed')
recordRun('s1', { title: 'Song', inst: 'guitar' }, { score: 100, mode: 'wait', speed: 1, full: false, bars: [3, 4] }, { miss: {}, hit: { 3: 8, 4: 8 } }, t += DAY)
st = songStats('s1')!
ok(!st.learnedAt && st.best === 95, 'a looped section does not count as a full run')
ok(troubleBars(st) === null, 'clean loops clear the trouble bars')
recordRun('s1', { title: 'Song', inst: 'guitar' }, { score: 92, mode: 'wait', speed: 0.8, full: true }, { miss: {}, hit: {} }, t += DAY)
st = songStats('s1')!
ok(st.learnedAt === t && st.review?.box === 0 && st.review.due === t + 3 * DAY, 'learned: first review in 3 days')
ok(dueReviews('guitar', t + 2 * DAY).length === 0 && dueReviews('guitar', t + 3 * DAY)[0]?.id === 's1', 'due after 3 days')
ok(dueReviews('tenor', t + 30 * DAY).length === 0, 'reviews stay with their instrument')
recordRun('s1', { title: 'Song', inst: 'guitar' }, { score: 96, mode: 'wait', speed: 1, full: true }, { miss: {}, hit: {} }, t += 3 * DAY)
ok(songStats('s1')!.review?.box === 1 && songStats('s1')!.review!.due === t + 7 * DAY, 'good review: next in 7 days')
recordRun('s1', { title: 'Song', inst: 'guitar' }, { score: 50, mode: 'wait', speed: 1, full: true }, { miss: { 2: 5 }, hit: {} }, t += 8 * DAY)
ok(songStats('s1')!.review?.box === 0 && songStats('s1')!.review!.due === t + 2 * DAY, 'bad review comes back in 2 days')
for (let i = 0; i < 50; i++) recordRun('s2', { title: 'x', inst: 'tenor' }, { score: 10, mode: 'wait', speed: 1, full: true }, { miss: {}, hit: {} }, t + i)
ok(songStats('s2')!.runs.length === 40, 'keeps the last 40 runs')

// ---------- sharing in ----------
ok(titleFromSubject('Wonderwall Chords by Oasis @ Ultimate-Guitar.Com') === 'Wonderwall (Oasis)', 'UG subject')
ok(titleFromSubject('Santeria Tab by Sublime | Songsterr Tabs with Rhythm') === 'Santeria (Sublime)', `Songsterr subject: ${titleFromSubject('Santeria Tab by Sublime | Songsterr Tabs with Rhythm')}`)
ok(titleFromSubject('My riff') === 'My riff' && titleFromSubject(undefined) === '', 'plain subjects')

// ---------- gear ----------
ok(gateFrom(0.001, 0.2) === 3, 'quiet room, loud note: capped at 3')
ok(gateFrom(0.05, 0.1) === 0.4, 'noisy room: floor 0.4')
ok(gateFrom(0.004, 0.1) === 1.33, `typical ${gateFrom(0.004, 0.1)}`)
ok(!isSetUp('usb'), 'not set up yet')
setGear('usb', { gate: 1.5, latencyMs: 72, setAt: 1 })
ok(isSetUp('usb') && !isSetUp('mic') && gear('usb').latencyMs === 72 && gear('mic').gate === 1, 'profiles are per input')

// ---------- pedals ----------
ok(bindings()['key:ArrowRight'] === 'startStop' && bindings()['key:ArrowLeft'] === 'restart', 'default pedal keys')
bind('midi:cc:80', 'loopBar')
ok(bindings()['midi:cc:80'] === 'loopBar', 'bind')
unbind('key:ArrowRight')
ok(!bindings()['key:ArrowRight'], 'unbind')
resetBindings()
ok(bindings()['key:ArrowRight'] === 'startStop' && !bindings()['midi:cc:80'], 'reset')
ok(describe('key:PageDown') === 'Page Down' && describe('midi:cc:64') === 'MIDI CC 64' && describe('key:KeyB') === 'KeyB key', 'pedal names')

// ---------- backup ----------
ok(readBackup('not json') === null && readBackup('{"app":"Other"}') === null, 'rejects other files')
const bk = readBackup(JSON.stringify({ app: 'KGuitar', version: 1, createdAt: t, storage: { 'kg:practiceLog': JSON.stringify({ a: { guitar: 400, study: 0 }, b: { guitar: 100, study: 100 }, c: { guitar: 0, study: 300 } }) }, songs: [{ id: '1', source: 'text' }, { id: '2', source: 'example' }] }))
ok(!!bk && backupSummary(bk).songs === 1 && backupSummary(bk).days === 2, `backup summary ${bk && JSON.stringify(backupSummary(bk))}`)

console.log(`build 6 logic: ${checks} checks, ${fails} failed`)
if (fails) process.exit(1)

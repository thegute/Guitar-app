// Tempo, beat and time-signature detection on synthesized guitar parts at known tempos (picked 8ths, strummed
// chords, 3/4, 6/8, swing, with room noise), tab-to-recording alignment for video sync, loop tempo, tab guesses,
// and the tempo map (Guitar Pro tempo changes).
import './test-env'
import { strict as assert } from 'node:assert'
import { autoSync } from '../src/play/autoSync'
import { onsets, hopSec, tempoFromOnsets, trackBeats, guessMeter, analyse, alignTab, alignAnywhere, loopTempo, guessTabTempo, tapBpm } from '../src/audio/tempo'
import { TempoMap } from '../src/play/tempoMap'
import { guessTabTempo as _g } from '../src/audio/tempo'
import { songFromText } from '../src/tabs/importer'
import { current } from '../src/instrument'

let checks = 0, failed = 0
const ok = (c: boolean, m: string) => { checks++; if (!c) { failed++; console.log('  FAIL ' + m) } }
const SR = 22050

let seed = 7
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

/** a plucked note: harmonics decaying, a short noisy pick at the start */
function pluck(buf: Float32Array, t: number, midi: number, vel: number, dur = 1.2) {
  const f0 = 440 * Math.pow(2, (midi - 69) / 12)
  const i0 = Math.round(t * SR), len = Math.min(buf.length - i0, Math.round(dur * SR))
  for (let i = 0; i < len; i++) {
    const tt = i / SR
    let v = 0
    for (let h = 1; h <= 6; h++) v += Math.sin(2 * Math.PI * f0 * h * tt) * Math.exp(-tt * (2 + h * 1.5)) / h
    if (i < 0.004 * SR) v += (rnd() * 2 - 1) * 0.6 * (1 - i / (0.004 * SR))
    buf[i0 + i] += v * vel * 0.25
  }
}
function render(secs: number, events: { t: number; midis: number[]; vel: number }[], noise = 0.01) {
  const buf = new Float32Array(Math.round(secs * SR))
  for (const e of events) e.midis.forEach((m, k) => { if (e.t >= 0) pluck(buf, e.t + k * 0.012, m, e.vel) })
  for (let i = 0; i < buf.length; i++) buf[i] += (rnd() * 2 - 1) * noise
  return buf
}
const near = (a: number, b: number, tol = 0.015) => Math.abs(a / b - 1) <= tol

// ---------- picked 8ths, 4/4, accents on 1 ----------
const tempos = [60, 72, 84, 92, 100, 108, 120, 132, 145, 160, 176]
let right = 0, octaves = 0
for (const bpm of tempos) {
  const spb = 60 / bpm
  const ev: { t: number; midis: number[]; vel: number }[] = []
  const line = [52, 55, 57, 59, 62, 59, 57, 55]
  for (let i = 0; i < Math.round(20 / (spb / 2)); i++) ev.push({ t: 0.5 + i * spb / 2, midis: [line[i % 8] + (i % 16 < 8 ? 0 : 2)], vel: i % 8 === 0 ? 1 : i % 2 === 0 ? 0.75 : 0.5 })
  const a = analyse(render(21, ev, 0.02), SR)!
  const good = !!a && near(a.bpm, bpm)
  // steady 8ths with light accents can honestly be heard at half or double: then the right one must be a one-tap alternative
  const octave = !!a && (near(a.bpm, bpm * 2) || near(a.bpm, bpm / 2)) && a.alts.some(x => near(x, bpm))
  if (good) right++
  else if (octave) octaves++
  ok(good || octave, `picked 8ths at ${bpm}: got ${a?.bpm} (alts ${a?.alts.join('/')})`)
}
ok(right >= tempos.length * 0.7, `picked 8ths: ${right}/${tempos.length} exact`)
console.log(`picked 8ths: ${right}/${tempos.length} tempos exact (±1.5%), ${octaves} at half/double with the right one offered`)

// ---------- strummed chords, quarter notes ----------
for (const bpm of [70, 96, 128]) {
  const spb = 60 / bpm
  const ev = []
  for (let i = 0; i < Math.round(18 / spb); i++) ev.push({ t: 0.3 + i * spb + (rnd() - 0.5) * 0.012, midis: [40, 47, 52, 56, 59, 64], vel: i % 4 === 0 ? 1 : 0.6 })
  const a = analyse(render(19, ev, 0.015), SR)
  ok(!!a && near(a.bpm, bpm), `strummed quarters at ${bpm}: got ${a?.bpm}`)
  ok(!!a && a.meter.num === 4 && a.meter.den === 4, `strummed quarters at ${bpm} in 4/4: got ${a?.meter.num}/${a?.meter.den}`)
}

// ---------- 3/4 waltz: bass on 1, chord on 2 and 3 ----------
for (const bpm of [90, 132]) {
  const spb = 60 / bpm
  const ev = []
  for (let i = 0; i < Math.round(24 / spb); i++) ev.push(i % 3 === 0 ? { t: 0.4 + i * spb, midis: [43], vel: 1 } : { t: 0.4 + i * spb, midis: [59, 62, 67], vel: 0.45 })
  const a = analyse(render(25, ev, 0.01), SR)
  ok(!!a && near(a.bpm, bpm), `waltz at ${bpm}: got ${a?.bpm}`)
  ok(!!a && a.meter.num === 3, `waltz at ${bpm} in 3: got ${a?.meter.num}/${a?.meter.den}`)
}

// ---------- 6/8: dotted-quarter beat, three 8ths each, accent on 1 and 4 ----------
{
  const beat = 60 / 66 // ♩. = 66 → quarter = 99
  const ev = []
  for (let i = 0; i < Math.round(22 / (beat / 3)); i++) ev.push({ t: 0.4 + i * beat / 3, midis: [i % 3 === 0 ? 45 : 57 + (i % 3)], vel: i % 6 === 0 ? 1 : i % 3 === 0 ? 0.8 : 0.4 })
  const env = onsets(render(23, ev, 0.01), SR)
  const g = tempoFromOnsets(env)!
  const beatBpm = [g.bpm, ...g.alts].find(b => near(b, 66, 0.03) || near(b, 132, 0.03) || near(b, 198, 0.03))
  ok(!!beatBpm, `6/8 tempo is a multiple of 66: got ${g.bpm} (alts ${g.alts.join('/')})`)
  const m = guessMeter(env, trackBeats(env, 66))
  ok(m.den === 8, `6/8 heard as compound: got ${m.num}/${m.den}`)
}

// ---------- swing 8ths ----------
{
  const bpm = 116, spb = 60 / bpm
  const ev = []
  for (let i = 0; i < Math.round(18 / spb); i++) { ev.push({ t: 0.3 + i * spb, midis: [55], vel: 0.9 }); ev.push({ t: 0.3 + i * spb + spb * 2 / 3, midis: [58], vel: 0.5 }) }
  const a = analyse(render(19, ev, 0.02), SR)
  ok(!!a && near(a.bpm, bpm), `swing 8ths at ${bpm}: got ${a?.bpm}`)
}

// ---------- beat tracker: beats fall on the notes ----------
{
  const bpm = 104, spb = 60 / bpm
  const ev = []
  for (let i = 0; i < Math.round(15 / spb); i++) ev.push({ t: 1 + i * spb, midis: [48, 55, 60], vel: 0.8 })
  const env = onsets(render(16.5, ev, 0.01), SR)
  const beats = trackBeats(env, bpm)
  const errs = beats.filter(b => b > 1.2 && b < 15).map(b => Math.abs(((b - 1 + spb / 2) % spb) - spb / 2))
  const mean = errs.reduce((a, b) => a + b, 0) / Math.max(1, errs.length)
  ok(errs.length > 15 && mean < 0.03, `beats land on the strums (mean ${(mean * 1000).toFixed(0)} ms over ${errs.length})`)
}

// ---------- align a tab with a recording (video sync without tapping) ----------
{
  // the tab's rhythm (beats), file tempo 100; the video plays it at 97 BPM starting 3.27 s in
  const rhythm = [0, 1, 1.5, 2, 3, 3.75, 4, 5, 5.5, 6, 6.5, 7, 8, 9, 9.25, 9.5, 10, 11, 12, 12.5, 13, 14, 15]
  const real = 97, off = 3.27
  const ev = rhythm.map((b, i) => ({ t: off + b * 60 / real, midis: [50 + (i * 5) % 12], vel: 0.8 }))
  // some talking-like noise before the playing starts
  const buf = render(off + 16 * 60 / real + 2, ev, 0.02)
  for (let i = 0; i < Math.round(2.5 * SR); i++) buf[i] += Math.sin(i * 0.05) * 0.05 * (rnd() > 0.5 ? 1 : 0)
  const env = onsets(buf, SR)
  const al = alignTab(env, rhythm.map(b => b * 60 / 100), 100)!
  ok(!!al && Math.abs(al.offset - off) < 0.03, `video offset found: ${al?.offset} (real ${off})`)
  ok(!!al && Math.abs(al.bpm - real) < 1.2, `video tempo found: ${al?.bpm} (real ${real})`)
}

// ---------- auto video sync: a 14 s clip from the middle of a song (bar 1 is long before the clip) ----------
{
  // a 32-bar riff with a varied rhythm, file tempo 100; the video plays at 98.5 and the clip starts 41.3 s into the song
  const cell = [[0, 1, 1.5, 2, 3, 3.5], [0, 0.5, 1, 2, 2.75, 3], [0, 1, 2, 2.5, 3, 3.25, 3.5], [0, 1.5, 2, 3]]
  const beatsAt: number[] = []
  // a riff that never repeats exactly (a real song's repeats are a different, honest ambiguity)
  let seed = 7
  for (let bar = 0; bar < 32; bar++) { seed = (seed * 1103515245 + 12345) % 2147483648; for (const b of cell[(seed >> 8) % 4]) beatsAt.push(bar * 4 + b) }
  const real = 98.5, songStart = 0.8, clipFrom = 41.3, clipLen = 14
  const ev = beatsAt.map((b, i) => ({ t: songStart + b * 60 / real - clipFrom, midis: [52 + (i * 5) % 12], vel: 0.6 + 0.3 * ((i * 13) % 5) / 4 })).filter(e => e.t >= 0 && e.t < clipLen)
  const env = onsets(render(clipLen, ev, 0.02), SR)
  const t0 = Date.now()
  const al = alignAnywhere(env, beatsAt.map(b => b * 60 / 100), 100, { hop: hopSec(SR) })
  const want = songStart - clipFrom
  ok(!!al && Math.abs(al.start - want) < 0.04, `clip from the middle: bar 1 at ${al?.start} s of the clip (real ${want.toFixed(2)}), ${Date.now() - t0} ms`)
  ok(!!al && Math.abs(al.bpm - real) < 1, `its tempo: ${al?.bpm} (real ${real})`)
  ok(!!al && al.score > 0.4 && al.sure > 1.02, `a clear match (score ${al?.score.toFixed(2)}, ${al?.sure.toFixed(2)}× the next place)`)
  // the same clip against a different song's rhythm: not sure
  const other: number[] = []
  for (let bar = 0; bar < 32; bar++) for (const b of [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]) other.push(bar * 4 + b)
  const o2 = alignAnywhere(env, other.map(b => b * 60 / 100), 100)
  ok(!o2 || o2.score < 0.32, `a different song's rhythm doesn't match (score ${o2?.score.toFixed(2)})`)
}

// ---------- Sync automatically: the whole flow with a pretend video (it plays from 61.0 s; the tab starts at 18.4 s) ----------
await (async () => {
  let seed = 11
  const beatsAt: number[] = []
  const cell = [[0, 1, 1.5, 2, 3, 3.5], [0, 0.5, 1, 2, 2.75, 3], [0, 1, 2, 2.5, 3, 3.25, 3.5], [0, 1.5, 2, 3]]
  void seed
  const pickCell = (bar: number) => Math.floor(((Math.abs(Math.sin(bar * 12.9898 + 4.1) * 43758.5453)) % 1) * 4)
  for (let bar = 0; bar < 40; bar++) for (const b of cell[pickCell(bar)]) beatsAt.push(bar * 4 + b)
  const fileBpm = 92, realBpm = 90.5, bar1 = 18.4, from = 61.0, listen = 15
  let clock = 0 // seconds since the grab started
  const video = () => from + clock
  const ev = beatsAt.map((b, i) => ({ t: bar1 + b * 60 / realBpm - from, midis: [50 + (i * 7) % 12], vel: 0.8 })).filter(e => e.t >= 0 && e.t < listen + 0.3)
  const x = render(listen + 0.3, ev, 0.02)
  const r = await autoSync({
    noteSecs: beatsAt.map(b => b * 60 / fileBpm), tabBpm: fileBpm, now: video, wall: () => clock * 1000,
    wait: async ms => { clock += ms / 1000 },
    // the recording runs a little past the last tick (it stops after KGuitar reads the video's time)
    grab: async () => ({ onStopped() {}, async stop() { return { pieces: [], frames: 0, scrolled: false, sound: { x: x.slice(0, Math.round((clock) * SR)), sr: SR } } } }),
  })
  ok(r.sure === 'yes', `sure of it (${r.sure})`)
  ok(Math.abs(r.sync.offset - bar1) < 0.05, `Sync automatically: bar 1 at ${r.sync.offset} s of the video (real ${bar1})`)
  ok(Math.abs(r.sync.bpm - realBpm) < 1, `and the video's tempo ${r.sync.bpm} (real ${realBpm})`)
  // paused while listening
  clock = 0
  let paused = false
  const r2 = await autoSync({ noteSecs: beatsAt.map(b => b * 60 / fileBpm), tabBpm: fileBpm, now: () => (paused ? from + 3 : video()), wall: () => clock * 1000, wait: async ms => { clock += ms / 1000; if (clock > 3) paused = true },
    grab: async () => ({ onStopped() {}, async stop() { return { pieces: [], frames: 0, scrolled: false, sound: { x: x.slice(0, Math.round(clock * SR)), sr: SR } } } }) }).catch(e => String(e.message))
  ok(typeof r2 === 'string' && /paused/.test(r2), `a paused video is noticed: ${typeof r2 === 'string' ? r2.slice(0, 40) : 'no'}`)
})()

// ---------- loop tempo: a 2-bar loop at 93 ----------
{
  const bpm = 93, spb = 60 / bpm
  const ev = []
  for (let i = 0; i < 16; i++) ev.push({ t: i * spb / 2, midis: [45 + (i % 4) * 3], vel: i % 4 === 0 ? 1 : 0.6 })
  const buf = render(8 * spb, ev, 0.005)
  const l = loopTempo(buf, SR)
  ok(!!l && Math.abs(l.bpm - bpm) < 0.6 && l.beats === 8, `2-bar loop: ${l?.bpm} BPM, ${l?.beats} beats`)
}

// ---------- tab guesses and tap tempo ----------
ok(guessTabTempo([0.25, 0.25, 0.25, 0.25, 0.5]) === 90, '16th-note tab guessed at 90')
ok(guessTabTempo([4, 4, 2, 2]) === 80, 'chord chart guessed at 80')
ok(tapBpm([0, 500, 1000, 1500, 2000]) === 120, 'tap tempo 120')
ok(tapBpm([0, 500, 1000]) === null, 'tap tempo needs 4 taps')

// ---------- tempo map ----------
{
  const m = new TempoMap(120, [{ beat: 8, bpm: 60 }])
  ok(m.changes && Math.abs(m.sec(8) - 4) < 1e-9 && Math.abs(m.sec(10) - 6) < 1e-9, 'tempo map: 8 beats at 120 then 60')
  ok(Math.abs(m.beat(5) - 9) < 1e-9 && Math.abs(m.beat(2) - 4) < 1e-9, 'tempo map: seconds back to beats')
  ok(Math.abs(m.spbAt(9, 60) - 2) < 1e-9, 'half speed doubles seconds per beat')
  const flat = new TempoMap(90)
  ok(!flat.changes && Math.abs(flat.sec(3) - 2) < 1e-9, 'one tempo')
}

// a pasted text tab gets a guessed tempo
{
  const doc = songFromText(`e|-0-1-3-1-0-1-3-0-|\nB|-----------------|\nG|-----------------|\nD|-----------------|\nA|-----------------|\nE|-----------------|`, 'Guess me', current())!
  ok(!!doc && doc.song.tempoFrom === 'guess' && (doc.song.tempo ?? 0) >= 60, `pasted tab tempo guessed (${doc?.song.tempo}, ${doc?.song.tempoFrom})`)
  void _g
}
console.log(`tempo: ${checks} checks, ${failed} failed`)
if (failed) process.exit(1)

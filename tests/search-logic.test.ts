// Search (build 18): real questions → the right answer near the top; values (chords, scales, tunings, tempos, jams)
// read correctly; every "How to use KGuitar" item can be found; typos and half-typed words still work.
import './test-env'
import { SearchIndex, searchAll } from '../src/search/engine'
import { FEATURES } from '../src/search/catalog'
import { libraryEntries } from '../src/search/sources'
import { intents } from '../src/search/intents'
import { terms, stem } from '../src/search/text'
import { GUIDE } from '../src/learn/guide'
import { current } from '../src/instrument'

let checks = 0, failed = 0
const ok = (c: boolean, m: string) => { checks++; if (!c) { failed++; console.log('  FAIL', m) } }
const inst = current()
const idx = new SearchIndex([...FEATURES, ...libraryEntries(inst, [])])

/** question → a title that must be in the first `top` results */
const CASES: [string, RegExp, number?][] = [
  ['how do i slow down the song', /Slow the tab down/, 2], ['slow down youtube', /YouTube video/], ['loop a part', /Loop a hard part/],
  ['repeat the hard bit', /Loop a hard part/], ['tune my guitar', /^Tuner$/, 1], ['tuner', /^Tuner$/, 1], ['tunner', /^Tuner$/, 1],
  ['metronme', /^Metronome$/, 1], ['metro', /^Metronome$/, 1], ['record myself', /Record yourself/, 1], ['find chords of a song', /Find the chords/, 1],
  ['what chords are in this song', /Find the chords/, 1], ['add a song', /Add a song/, 1], ['import guitar pro', /Add a song/, 1],
  ['it doesnt hear me', /doesn't hear my notes/, 1], ["it doesn't hear my guitar", /doesn't hear my notes|Set up your input/, 2],
  ['mic not working', /doesn't hear my notes|Set up your input/, 2], ['usb amp', /USB amp/, 2], ['dark mode', /Day, Night or Psychedelic/, 1],
  ['change dog', /Your samurai/, 1], ['brandy', /Your samurai|The art/, 2], ['streak', /streak/i, 2], ['backup', /Back up/, 1], ['new phone', /Back up/, 1],
  ['reminder', /Reminders/, 1], ['turn off notifications', /Reminders/, 1], ['ukulele', /Guitar or ukulele/, 2], ['bigger tab', /Make the tab bigger/, 1],
  ['note names', /Note names on the tab/, 1], ['which finger', /Where your fingers go/, 1], ['ear training', /^Ear training$/, 1],
  ['caged', /CAGED/, 1], ['circle of fifths', /Circle of fifths/i, 1], ['hammer ons', /Hammer-ons/, 1], ['bends', /Bends/, 2],
  ['travis picking', /Travis/, 1], ['licks', /Lick generator/, 1], ['amazing grace', /Amazing Grace/, 1], ['footswitch', /footswitch/, 1],
  ['what key is this song in', /Scales & chords for soloing/, 1], ['sync video', /Sync the video/, 1], ['capo', /Song check/, 1],
  ['how am i doing', /Progress/, 1], ['help', /Help: how to use KGuitar/, 1], ['palm mute', /Palm mut/, 1], ['strumming pattern', /Count it/, 2],
  ['chord changes faster', /chord changes/i, 1], ['in time', /In time/, 1], ['theory', /Theory lessons/, 1], ['full screen', /Full tab/, 1],
  ['split screen', /Split screen/, 1], ['start over', /Start over/, 1], ['what is a triad', /Triad/, 1], ['down in the valley', /Down in the Valley/, 1],
  ['quiz', /Practice course/, 1], ['speed trainer', /Speed trainer/, 1], ['drum beat for practice', /Metronome|drum/i, 3], ['play along with drums', /band|drums/i, 3],
  ['learn the fretboard', /fretboard|Practice course/i, 3], ['hear how the tab sounds', /Hear it/, 1], ['which tuning is this song in', /Song check|tuning/i, 2],
  ['footpedal', /footswitch/, 1], ['make a backing track', /backing track|progression/i, 2], ['improvise', /Solo over it|soloing/, 2],
  ['how to use the app', /Help: how to use KGuitar/, 1], ['where do i start', /Help|five sections/, 2], ['delete a song', /My songs/, 2],
  ['youtube', /YouTube video/, 1], ['count in', /Click|In time/, 3], ['fingerpicking pattern', /Make it a tab|Travis/, 2],
  ['songs for beginners', /Songbook/, 2], ['light mode', /Day, Night or Psychedelic/, 1], ['animations', /Moving colours/, 1],
]
for (const [q, want, top = 3] of CASES) {
  const r = searchAll(idx, q, inst, 6)
  const i = r.findIndex(x => want.test(x.title))
  ok(i >= 0 && i < top, `"${q}" → ${want} in the first ${top} (got ${r.slice(0, 4).map(x => x.title).join(' | ') || 'nothing'})`)
}

// values in a question
const first = (q: string) => searchAll(idx, q, inst, 3)[0]
const T = (q: string) => first(q)?.target as Record<string, any> | undefined
ok(JSON.stringify(T('g7')?.chord) === '{"root":"G","suffix":"7"}', 'g7 → G7 chord')
ok(JSON.stringify(T('how do i play an e chord')?.chord) === '{"root":"E","suffix":"major"}', 'an e chord → E')
ok(JSON.stringify(T('c sharp minor seven chord')?.chord) === '{"root":"C#","suffix":"m7"}', 'c sharp minor seven → C#m7')
ok(JSON.stringify(T('bbmaj7')?.chord) === '{"root":"Bb","suffix":"maj7"}', 'bbmaj7')
ok(JSON.stringify(T('f#m7b5')?.chord) === '{"root":"F#","suffix":"m7b5"}', 'f#m7b5')
ok(JSON.stringify(T('d sus 4')?.chord) === '{"root":"D","suffix":"sus4"}', 'd sus 4')
ok(JSON.stringify(T('e power chord')?.chord) === '{"root":"E","suffix":"5"}', 'e power chord')
ok(!intents('how do i slow down the song', inst).some(r => r.kind === 'chord'), 'no chord in "how do i slow down the song" ("do" is not Ddim)')
ok(!intents('i am stuck on this song', inst).some(r => r.kind === 'chord'), '"am" in a sentence is not A minor')
ok(!intents('how do i play a chord', inst).some(r => r.kind === 'chord'), '"a chord" is not an A chord')
ok(JSON.stringify(T('a minor pentatonic')?.scale) === '{"root":"A","scale":"minor pentatonic"}', 'a minor pentatonic')
ok(JSON.stringify(T('dorian in d')?.scale) === '{"root":"D","scale":"dorian"}', 'dorian in d')
ok(JSON.stringify(T('e blues scale')?.scale) === '{"root":"E","scale":"minor blues"}', 'e blues scale')
ok(JSON.stringify(T('pentatonic in g major')?.scale) === '{"root":"G","scale":"major pentatonic"}', 'pentatonic in g major')
const am = searchAll(idx, 'a minor', inst, 4)
ok(am[0]?.kind === 'chord' && am.some(r => r.kind === 'scale'), '"a minor": the chord first, the scale too')
ok(T('drop d')?.tuning === 'dropd', 'drop d → tuning')
ok(T('open g tuning')?.tuning === 'openg', 'open g tuning')
ok(T('half step down')?.tuning === 'halfdown', 'half step down')
ok(!intents('open g chord', inst).some(r => r.kind === 'tuning'), 'open g chord is not a tuning')
ok(T('metronome 90')?.metronome?.bpm === 90, 'metronome 90')
ok(T('120 bpm')?.metronome?.bpm === 120, '120 bpm')
ok(T('click in 6/8')?.metronome?.sig === '6/8', 'click in 6/8')
const blues = T('blues jam in a')?.jam
ok(blues?.key === 'A' && blues?.style === 'blues', 'blues jam in a')
const reg = T('reggae backing track in e minor')?.jam
ok(reg?.key === 'E' && reg?.mode === 'minor' && reg?.style === 'reggae', 'reggae backing track in e minor')
ok(T('dorian jam in d')?.jam?.mode === 'dorian', 'dorian jam in d → Jam in D dorian')
ok(!intents('solo', inst).some(r => r.kind === 'jam'), 'a bare "solo" is not a new jam')
ok(first('reggae songs')?.kind !== 'jam', '"reggae songs" means the songbook, not a jam')

// words
ok(stem('tuning') === stem('tuner') && stem('tuner') === stem('tune'), 'tuning / tuner / tune share a stem')
ok(terms('palm muting').join() === '_palmmute' && terms('palm mutes').join() === '_palmmute', 'palm mute phrase')
ok(terms('how do I do it').length === 0, 'filler words drop out')

// every guide item can be found
const linked = new Set(FEATURES.flatMap(f => (Array.isArray(f.guide) ? f.guide : f.guide ? [f.guide] : [])))
for (const sec of GUIDE) {
  if (sec.id === 'tips') continue
  for (const it of sec.items) ok(linked.has(it.title), `guide item "${it.title}" is linked from search`)
}
// every guide item's own title finds itself (or its search entry) first
for (const f of FEATURES) {
  const r = searchAll(idx, f.title, inst, 3)
  ok(r.some(x => x.id === f.id), `"${f.title}" finds itself`)
}
// speed: a question takes well under a frame
const t0 = performance.now()
for (let i = 0; i < 50; i++) searchAll(idx, 'how do i slow down the song ' + i, inst, 12)
const per = (performance.now() - t0) / 50
ok(per < 15, `search takes ${per.toFixed(1)} ms`)

console.log(`search logic: ${checks} checks, ${failed} failed`)
if (failed) process.exit(1)

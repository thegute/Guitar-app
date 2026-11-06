// Zero to Hero: the owner's guitar plan (his "Guitar: Zero to Hero Plan" doc) as the spine of Learn → Course.
// Five phases, each ending in a gate you pass before moving on; JustinGuitar's free course is the video spine.
// Gate items the app can measure tick themselves; the rest you tick when you can do them.
import type { Target } from '../search/types'
import type { Session, Step } from '../sessions/session'
import { allLogs, stars } from './progress'

/** a YouTube video that teaches this spot (the best teacher for it; style paths use players of that style) */
export interface Watch { id: string; title: string; who?: string }
export interface Focus { label: string; target?: Target; link?: string; watch?: Watch }
export interface GateItem { id: string; label: string; auto?: (s: Z2HStats) => boolean; target?: Target }
export interface Phase { n: number; title: string; when: string; why: string; course: { label: string; url: string }[]; weeks?: { weeks: string; focus: Focus[] }[]; focus: Focus[]; gate: GateItem[] }

const JG = {
  g2: 'https://www.youtube.com/playlist?list=PLlwfspJqZ127Mf3ilux771YB9BYgEu917',
  g3: 'https://www.youtube.com/playlist?list=PLlwfspJqZ1276gxdqEuNrEPTj80rMY9ls',
  blues: 'https://www.youtube.com/playlist?list=PLlwfspJqZ126wRII7Xk73WPx_rKKNn-E2',
  g4: 'https://www.youtube.com/playlist?list=PLlwfspJqZ127S23d-gTEKCxHQ1l6x6rVE',
  lead: 'https://www.youtube.com/playlist?list=PLlwfspJqZ1240HZ6ikwsb93z0B36wjtWD',
  g5: 'https://www.youtube.com/playlist?list=PLlwfspJqZ125N-Yv8HS3krL69lcm0Ar1b',
  g6: 'https://www.justinguitar.com/classes/intermediate-guitar-course-grade-six',
  caged: 'https://www.justinguitar.com/modules/caged-system',
  all: 'https://www.justinguitar.com/guitar-lessons',
  grade1: 'https://www.justinguitar.com/guitar-lessons/how-to-pass-grade-1-b1-710',
  signals: 'https://www.youtube.com/c/SignalsMusicStudio',
  paul: 'https://www.youtube.com/@PaulDavids',
}

export interface Z2HStats { songs: number; openChanges: number; barreChanges: number; stars: Record<string, number> }
export function z2hStats(): Z2HStats {
  const logs = allLogs()
  const songs = Object.values(logs).reduce((a, d) => a + (d.counts?.songsFinished ?? 0), 0)
  let best: Record<string, number> = {}
  try { best = JSON.parse(localStorage.getItem('kg:changesBest') ?? '{}') as Record<string, number> } catch { /* none */ }
  let openChanges = 0, barreChanges = 0
  for (const [k, v] of Object.entries(best)) {
    if (!k.startsWith('guitar:')) continue
    // a pair with an F, B or any sharp/flat chord is a barre pair
    if (/(^|[-:,|/ ])(F|B|[A-G][#b])/.test(k.slice(7))) barreChanges = Math.max(barreChanges, v)
    else openChanges = Math.max(openChanges, v)
  }
  return { songs, openChanges, barreChanges, stars: stars() }
}

export const PHASES: Phase[] = [
  {
    n: 1, title: 'Lock in the foundation', when: 'weeks 1–8', why: 'Turn the chords you know into music you can play in time.',
    course: [{ label: 'JustinGuitar Grade 2', url: JG.g2 }, { label: 'Grade 3', url: JG.g3 }],
    weeks: [
      { weeks: '1–2', focus: [{ label: 'Strumming to a metronome', watch: { id: 'qpR6mzN45kk', title: 'How To Practice Guitar Strumming With A Metronome' }, target: { exercise: 'type:strumming' } }, { label: 'Barre chord changes (F–B♭, G–C)', watch: { id: 'TK9rxmjfW-k', title: 'Faster Barre Chord Changes' }, target: { go: { tool: 'changes' } } }] },
      { weeks: '3–4', focus: [{ label: 'Note names on the 6th and 5th strings', watch: { id: 'LfRo8-7LaMA', title: 'Learn the Notes on the E and A Strings' }, target: { go: { quiz: 'fb-low-all' } } }, { label: 'Power chords and palm muting', watch: { id: 'QJO5vYO4_8I', title: 'Power Chord Shifts and Palm Mutes' }, target: { exercise: 'type:power' } }] },
      { weeks: '5–6', focus: [{ label: '12-bar blues shuffle in A and E', watch: { id: 'zEpDaO0lZIU', title: '12 Bar Blues Shuffle in the Key of A' }, target: { jam: { page: 'jam', style: 'blues', key: 'A' } }, link: JG.blues }, { label: 'A minor pentatonic box shape', target: { scale: { root: 'A', scale: 'minor pentatonic' } } }] },
      { weeks: '7–8', focus: [{ label: 'Hammer-ons and pull-offs', watch: { id: 'To7vDfgzSJE', title: 'Hammer-Ons and Pull-Offs' }, target: { exercise: 'type:legato' } }, { label: 'A first fingerpicking pattern', watch: { id: 'rcBTxDUvtDs', title: 'Guitar Fingerpicking for Beginners: First Lesson' }, target: { exercise: 'type:fingerstyle' } }] },
    ],
    focus: [],
    gate: [
      { id: 'g1-songs', label: '5 whole songs along with the recording, no stopping', auto: s => s.songs >= 5, target: { go: { songs: 'mine' } } },
      { id: 'g1-changes', label: 'Open-chord changes at 60 a minute, barre changes at 30', auto: s => s.openChanges >= 60 && s.barreChanges >= 30, target: { go: { tool: 'changes' } } },
      { id: 'g1-blues', label: '12-bar blues shuffle in A and in E', target: { jam: { page: 'jam', style: 'blues', key: 'A' } } },
      { id: 'g1-notes', label: 'Name any note on the 6th and 5th strings within 3 seconds', auto: s => (s.stars['fb-low-all'] ?? 0) >= 2, target: { go: { quiz: 'fb-low-all' } } },
    ],
  },
  {
    n: 2, title: 'Rhythm, first solos, keys', when: 'months 3–5', why: 'Groove like a rhythm player and start soloing. This is where most self-taught players stall, so go slow.',
    course: [{ label: 'JustinGuitar Grade 4', url: JG.g4 }, { label: 'Blues Lead Essentials', url: JG.lead }],
    focus: [
      { label: 'Rhythm: reading rhythm, then 16th-note strumming', watch: { id: 'yUVyS6HwQ_I', title: 'Rhythm Workout #3: Sixteenth Note Strumming Basics' }, target: { go: { tool: 'rhythm' } } },
      { label: 'E-shape barre chords all over the neck', watch: { id: 'luPAWqI_Q_M', title: 'Learn the 6th String Barre Chords' }, target: { exercise: 'type:barre' } },
      { label: 'Muting: palm and fretting hand', watch: { id: 'hHjaB9-yf3o', title: 'The One Technique Every Guitarist Needs: String Muting' }, target: { go: { technique: 'mute' } } },
      { label: 'The major scale and the chords in each key', watch: { id: 'm1wiXZ7Zn28', title: 'The Diatonic Chords of a Key (Easy Theory)' }, target: { go: { quiz: 'cof-chords' } } },
      { label: 'Lead basics: pentatonic licks, bends in tune, vibrato', watch: { id: 'Gu2esZ-PzFM', title: '5 Blues Licks from the Minor Pentatonic' }, target: { exercise: 'type:lick:blues' } },
      { label: 'Improvise 5 minutes a day over a backing', watch: { id: '7FilvCPSYXc', title: 'How Do I Improvise? Start Simple and Expand' }, target: { jam: { page: 'solo', style: 'blues', key: 'A', mode: 'minor' } } },
      { label: 'Learn one short solo note for note', watch: { id: 'xt4H2zQjNBM', title: 'Beginners Transcribing Tips' }, target: { go: { songs: 'add' } } },
    ],
    gate: [
      { id: 'g2-improv', label: 'Improvise for 2 minutes over an A minor blues, with bends in tune', target: { jam: { page: 'solo', style: 'blues', key: 'A', mode: 'minor' } } },
      { id: 'g2-keys', label: 'Name the chords in the keys of C, G, D, A and E', auto: s => (s.stars['cof-chords'] ?? 0) >= 2, target: { go: { quiz: 'cof-chords' } } },
      { id: 'g2-16th', label: 'Play a 16th-note strumming pattern at 80 BPM', target: { exercise: 'type:strumming' } },
      { id: 'g2-solo', label: 'Play one full solo from a recording', target: { go: { songs: 'mine' } } },
    ],
  },
  {
    n: 3, title: 'Fretboard freedom', when: 'months 6–10', why: 'Stop living in one box and see the whole neck.',
    course: [{ label: 'JustinGuitar Grade 5', url: JG.g5 }, { label: 'Grade 6', url: JG.g6 }, { label: 'CAGED module', url: JG.caged }],
    focus: [
      { label: 'A-shape barre chords and their variations', watch: { id: 'b2y2BaY6N88', title: '5th String Barre Chords' }, target: { exercise: 'type:barre' } },
      { label: 'Every note on the neck (octave shapes)', watch: { id: 'lJYF_Bm7g_w', title: 'Memorize Guitar Notes: Octave Shapes' }, target: { go: { quiz: 'fb-all' } } },
      { label: 'Bending and vibrato', watch: { id: 'F6sB_-NV8kM', title: 'The Ultimate Guide to Bending and Vibrato' }, target: { go: { tool: 'bends' } } },
      { label: 'Working out licks by ear', watch: { id: '2Jq4vEAqZq8', title: 'How To Figure Songs Out By Ear (Chords and Riffs)' }, target: { go: { tool: 'ear' } } },
      { label: 'Folk fingerstyle (and melodic fingerstyle)', watch: { id: 'fNjcSiM4Ckk', title: 'A Beginner\'s Lesson in Travis Fingerpicking', who: 'Happy Traum' }, target: { exercise: 'type:melodic' } },
      { label: 'The CAGED system', watch: { id: 'JR1TgDAiCFU', title: 'How to Actually Use the CAGED System' }, target: { go: { tool: 'caged' } }, link: JG.caged },
      { label: 'Triads up the neck', watch: { id: 'tHCzeZo0Ib4', title: 'Learn the Neck With Triads (Part One)' }, target: { exercise: 'type:triads' } },
      { label: 'All 5 minor pentatonic positions, then connecting them', watch: { id: 'T8yodJjWT5c', title: 'The Pentatonic Cheat Code: All 5 Patterns' }, target: { exercise: 'type:scales' } },
    ],
    gate: [
      { id: 'g3-c5', label: 'Play a C major chord in 5 places on the neck', auto: s => (s.stars['caged-name'] ?? 0) >= 2, target: { go: { tool: 'caged' } } },
      { id: 'g3-penta', label: 'Minor pentatonic across the whole neck in A, G and E', target: { exercise: 'type:scales' } },
      { id: 'g3-ear', label: 'Work out a short solo or riff by ear', target: { go: { tool: 'ear' } } },
      { id: 'g3-finger', label: 'Play one fingerstyle piece, or a song with a fingerpicking pattern', target: { exercise: 'type:melodic' } },
    ],
  },
  {
    n: 4, title: 'Musicianship and style', when: 'months 10–18', why: 'Make your playing sound like music you chose, not exercises.',
    course: [{ label: 'JustinGuitar Grade 7 (All Lessons)', url: JG.all }, { label: 'Signals Music Studio', url: JG.signals }, { label: 'Paul Davids', url: JG.paul }],
    focus: [
      { label: 'Modes: Dorian and Mixolydian first', watch: { id: '6fBSiTdQB80', title: 'This Is How You Finally Understand the Modes' }, target: { jam: { page: 'solo', mode: 'dorian' } } },
      { label: '7th chords and extensions', watch: { id: 'YCdV-VXh8Ns', title: 'Major, Minor and Dominant 7th Chords' }, target: { go: { quiz: 'ch-ear-7' } } },
      { label: 'Soloing over changes: land on chord tones', watch: { id: 'BXrByHNokiE', title: 'Chord Tone Soloing' }, target: { exercise: 'type:changes' } },
      { label: 'Rock techniques and alternate picking', watch: { id: 'N_MHpdP5X58', title: 'Alternate Picking Exercises That Fix Your Technique' }, target: { exercise: 'type:alt' } },
      { label: 'Transcribe 3 solos you love (by ear, then check a tab)', watch: { id: 'xNlyoGud2A0', title: 'The Transcribing Process' }, },
      { label: 'Write and record one song', watch: { id: 'XSxRutxNoRs', title: 'Start Writing Songs and Progressions (the Number System)' }, target: { jam: { page: 'beats' } } },
      { label: 'Play with other people', watch: { id: 'u0Mx7GAi6x4', title: 'How to Jam: Tips on Playing Music With Others' }, },
    ],
    gate: [
      { id: 'g4-tones', label: 'Improvise over a non-blues progression, landing on chord tones', target: { jam: { page: 'solo' } } },
      { id: 'g4-solos', label: 'Play 3 full solos learned from recordings' },
      { id: 'g4-song', label: 'Write and record one original song', target: { jam: { page: 'beats' } } },
      { id: 'g4-band', label: 'Play a song with at least one other musician' },
    ],
  },
  {
    n: 5, title: 'Pick your path', when: 'year 2 and on', why: "By now you'll know what you love: go deep on one style for 6–12 months at a time. A few lessons with a teacher pay off most here.",
    course: [{ label: 'JustinGuitar All Lessons', url: JG.all }],
    focus: [
      { label: 'Blues: phrasing, bends, call and response', watch: { id: 'Rekcoshs4qI', title: 'Call and Response Blues You Can Play by Yourself' }, target: { exercise: 'type:lick:blues' } },
      { label: 'Rock and metal: alternate picking, riffs, tight muting', watch: { id: 'PvTku5sp_KY', title: 'Thrash Metal Riffs with Down-Picking' }, target: { exercise: 'type:lick:metal' } },
      { label: 'Fingerstyle: independent thumb, arranging songs', watch: { id: 'WZtC7xWnF5U', title: 'Developing Thumb Independence' }, target: { exercise: 'type:melodic' } },
      { label: 'Jazz: extensions, walking lines, standards', watch: { id: 'yPy9UjTS49w', title: 'The Easiest Way to Walking Bass With Chords' }, target: { exercise: 'type:lick:jazz' } },
      { label: 'Songwriting: progressions, melody, arrangement', watch: { id: 'rJSA0T848ns', title: 'How to Write Songs: Picking the Perfect Chords' }, target: { jam: { page: 'jam' } } },
    ],
    gate: [],
  },
]

export const START_CHECK = [
  'Say any of the 8 essential chords (A, D, E, Am, Dm, Em, C, G) and play it instantly',
  '60 changes a minute between any two open chords',
  '30 changes a minute between an E-shape and an A-shape barre (F to B♭)',
  'Strum D, DU, UDU along with a metronome at 80 BPM without stopping',
  'Play 3 songs start to finish along with the recording',
  'Name the note at any fret on the 6th and 5th strings',
  'Play the A minor pentatonic box shape up and down cleanly',
  'Play a 12-bar blues shuffle in A',
]
export const RULES = [
  ['One spine', "JustinGuitar decides what's next. Every other channel is a side dish."],
  ['Three at most', 'Never more than 3 things in your current skill block.'],
  ['Gates, not calendars', 'Taking twice as long as the timeframes is completely fine.'],
  ['Half your time is music', 'Play whole songs every day, even on a 20-minute day.'],
  ['Slow and clean beats fast and messy', 'Speed comes from clean repetitions, not from forcing it.'],
  ['Record monthly', 'Progress is invisible day to day and obvious month to month.'],
  ['Plateaus are normal', 'When stuck, drop the tempo 20% or go back to a song you love.'],
  ['Choose before you pick up the guitar', "Decide the lesson first, so practice time doesn't become YouTube browsing."],
] as const
export const TEMPO_RULE = 'When something is shaky, drop the metronome 20%. When you play it clean 3 times in a row, raise it 5 BPM.'

// ── where you are
export interface Z2H { phase: number; since: number; placed: boolean; ticks: string[]; lastGate?: number; paths?: string[] }
const KEY = 'kg:z2h'
export function z2h(): Z2H {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Z2H | null; if (v) return { ...v, ticks: v.ticks ?? [] } } catch { /* fall through */ }
  return { phase: 1, since: Date.now(), placed: false, ticks: [] }
}
export function saveZ2H(v: Z2H) { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* storage full */ } }
/** Week of phase 1 you're on (1–8+), counted from when the phase started. */
export const weekOf = (v: Z2H) => Math.floor((Date.now() - v.since) / (7 * 864e5)) + 1
export function gateDone(p: Phase, v: Z2H, s: Z2HStats) {
  return p.gate.map(g => ({ ...g, done: v.ticks.includes(g.id) || !!g.auto?.(s), auto: !!g.auto?.(s) }))
}
/** What to work on now: this week's focus in phase 1, otherwise the phase's first few items (three at most). */
export function currentFocus(v: Z2H): Focus[] {
  const p = PHASES[v.phase - 1]
  if (p.weeks) {
    const w = Math.min(8, weekOf(v))
    return (p.weeks.find(x => { const [a, b] = x.weeks.split('–').map(Number); return w >= a && w <= b }) ?? p.weeks[p.weeks.length - 1]).focus
  }
  const ticked = new Set(v.ticks)
  return p.focus.filter(f => !ticked.has('f:' + f.label)).slice(0, 3)
}

/** Today's routine as a session: the same five blocks every day, only "current skill" changes (Saturday: a song day). */
export function routine(v: Z2H, minutes: 15 | 20 | 45 | 60): Session | null {
  const day = new Date().getDay()
  const id = `z2h-${minutes}-${Date.now().toString(36)}`
  const short = minutes === 15
  if (day === 6) return {
    id, title: 'Saturday: song day', steps: [
      { title: 'Warm up', minutes: short ? 2 : 4, target: { exercise: 'type:warmup' } },
      { title: 'Learn or polish one song', minutes: short ? 9 : Math.max(10, minutes - 10), target: { go: { songs: 'mine' } }, tip: 'Pick one song you love and play it all the way through with the recording.' },
      { title: 'Record yourself playing it', minutes: short ? 4 : 6, target: { play: { open: 'options', focus: 'record' } }, tip: 'Record a full take. Listen back once: what would make it better next week?' },
    ],
  }
  const m = short ? [2, 3, 5, 0, 5] : minutes === 20 ? [3, 5, 5, 2, 5] : minutes === 45 ? [5, 10, 12, 5, 13] : [8, 12, 15, 8, 17]
  const focus = [...pathSteps(v), ...currentFocus(v)].filter(f => f.target).slice(0, 3)
  const skill: Step[] = focus.length
    ? focus.slice(0, 3).map((f, i, a) => ({ title: f.label, minutes: Math.max(2, Math.round(m[2] / a.length)), target: f.target!, tip: i === 0 ? TEMPO_RULE : undefined }))
    : [{ title: 'Current phase skill', minutes: m[2], target: { go: { learn: 'course' } } }]
  const ear: Target = v.phase <= 1 ? { go: { quiz: 'fb-low-all' } } : v.phase === 2 ? { go: { tool: 'ear' } } : { go: { quiz: 'fb-all' } }
  // every other day: one lesson video for what you're working on (the next one not yet watched)
  const toWatch = [...pathSteps(v), ...currentFocus(v)].find(f => f.watch && !v.ticks.includes('w:' + f.watch.id))
  if (toWatch?.watch && !short && day % 2 === 1) skill.push({ title: `Watch: ${toWatch.watch.title}`, minutes: minutes === 20 ? 4 : 6, target: { go: { learn: 'course' } }, tip: `The lesson video for "${toWatch.label}": in Zero to Hero, tap ▶ Watch under it.` })
  return {
    id, title: `Zero to Hero · ${minutes} minutes`, steps: ([
      { title: 'Warm-up and technique', minutes: m[0], target: { exercise: 'type:warmup' }, tip: 'Chromatic 1-2-3-4 with the metronome, slow and clean.' },
      { title: 'Chords and rhythm', minutes: m[1], target: { go: { tool: 'changes' } }, tip: 'One-minute changes on your 2 worst chord pairs, then a strum pattern to the metronome.' },
      ...skill,
      { title: 'Fretboard, theory, ear', minutes: m[3], target: ear },
      { title: 'Songs', minutes: m[4], target: { go: { songs: 'mine' } }, tip: 'Whole songs along with the recording. Never skip this block.' },
    ] as Step[]).filter(st => st.minutes > 0),
  }
}

// ── Style paths: go deep on a style, alongside the phases (or as Phase 5). Everything in them is also open on its own.
export interface StylePath { id: string; title: string; who: string; steps: Focus[]; gate: GateItem[] }
export const PATHS: StylePath[] = [
  { id: 'flatpick', title: 'Bluegrass flatpicking', who: 'Billy Strings, Tony Rice, Doc Watson', steps: [
    { label: 'The G run and the blue-note hammer-on', watch: { id: 'Hp93-26o1Tg', title: 'Must-Know Bluegrass Guitar Lick' }, target: { go: { licks: 'bs-grun' } } },
    { label: 'Crosspicking rolls', watch: { id: '6S66aINeabs', title: 'How to Crosspick', who: 'Molly Tuttle' }, target: { go: { licks: 'bs-cross-g' } } },
    { label: 'Alternate picking for speed', watch: { id: '7SRVZwjPCqY', title: 'Up to Speed with Bluegrass Flatpicking', who: 'Tyler Grant' }, target: { exercise: 'type:alt' } },
    { label: 'Fiddle tunes from the Songbook (Full arrangement too)', watch: { id: 'n1LHgp2XVZ4', title: 'Flatpicking Tunes: Jesse James', who: 'Tyler Grant' }, target: { go: { songs: 'songbook' } } },
    { label: 'All the flatpicking licks', watch: { id: 'c-eDrJRYg4E', title: '3 Billy Strings Licks' }, target: { exercise: 'type:lick:billy' } },
    { label: 'Take breaks over a bluegrass jam', watch: { id: 'K8DdO4Y3BLg', title: 'How to Play Like Billy Strings: Flatpicking' }, target: { jam: { page: 'solo', style: 'bluegrass', key: 'G' } } },
  ], gate: [
    { id: 'p-fp-grun', label: 'Play the G run cleanly at 140 BPM' },
    { id: 'p-fp-tune', label: 'Play a whole fiddle tune at 100 BPM' },
    { id: 'p-fp-break', label: 'Take a 16-bar break over a bluegrass jam' },
  ] },
  { id: 'songwriter', title: 'Acoustic singer-songwriter', who: 'Dylan Gossett, Zach Bryan, Noah Kahan', steps: [
    { label: 'Strumming patterns that groove', watch: { id: 'ipAEa0RcKCg', title: '"American Trail" Strumming (Dylan Gossett) Tutorial' }, target: { exercise: 'type:strumming' } },
    { label: 'Hammer-on fills inside the chords', watch: { id: 'CCy7o76cv60', title: '"Coal" (Dylan Gossett): Hammer-ons and Pull-offs' }, target: { go: { licks: 'ac-g-hammer' } } },
    { label: 'Walking bass between chords', watch: { id: 'O9_HLJ7NYBI', title: 'Bass Walks Connecting Chords in G' }, target: { go: { licks: 'ac-walk-g-em' } } },
    { label: 'Travis picking', watch: { id: 'fNjcSiM4Ckk', title: 'A Beginner\'s Lesson in Travis Fingerpicking', who: 'Happy Traum' }, target: { exercise: 'type:fingerstyle' } },
    { label: 'Songs from the Songbook: Country & acoustic', target: { go: { songs: 'songbook' } } },
    { label: 'Write your own: make a progression in Jam (acoustic style), record it', watch: { id: 'XSxRutxNoRs', title: 'Start Writing Songs and Progressions (the Number System)' }, target: { jam: { page: 'jam', style: 'acoustic' } } },
  ], gate: [
    { id: 'p-sw-strum', label: 'Strum and sing a whole song without stopping' },
    { id: 'p-sw-travis', label: 'Travis-pick a song all the way through' },
    { id: 'p-sw-write', label: 'Write and record one song of your own' },
  ] },
  { id: 'reggae', title: 'Reggae rock', who: 'Sublime, Stick Figure, The Movement, Kolohe Kai', steps: [
    { label: 'The off-beat skank', watch: { id: 'PraSzoOi0dg', title: 'Skanking Tutorial: Proper Reggae Rhythm Guitar' }, target: { go: { licks: 'rr-skank' } } },
    { label: 'Reggae rock licks: thirds, octaves, dub lines', watch: { id: '4-qPV_83iSI', title: 'Stick Figure Style: "Hawaii Song" Guitar Lesson' }, target: { exercise: 'type:lick:reggaerock' } },
    { label: 'Songs from the Songbook: Reggae and Reggae rock', target: { go: { songs: 'songbook' } } },
    { label: 'Jam over a reggae rock loop', watch: { id: '2Z24LS6tPag', title: '3 Essential Reggae Guitar Rhythms' }, target: { jam: { page: 'solo', style: 'reggaerock', key: 'G' } } },
  ], gate: [
    { id: 'p-rg-skank', label: 'Skank a whole song tight on the off-beat' },
    { id: 'p-rg-solo', label: 'Play a melodic solo over a reggae rock jam' },
  ] },
  { id: 'bluesrock', title: 'Blues-rock and neo-soul', who: 'John Mayer, Stevie Ray Vaughan, Isaiah Sharkey', steps: [
    { label: 'Blues licks with bends in tune', watch: { id: 'ck2uxWh4qvo', title: 'Adding Vibrato to String Bends' }, target: { exercise: 'type:lick:blues' } },
    { label: 'Blues-pop licks', watch: { id: '4Hf66fxDLiA', title: 'Hendrix / Mayer Double-Stop Riff in 5 Levels' }, target: { exercise: 'type:lick:mayer' } },
    { label: 'Neo-soul chord flourishes', watch: { id: 'vIMlQQSYLBY', title: 'Simple Tricks to Play Like Mateus Asato' }, target: { exercise: 'type:lick:neosoul' } },
    { label: 'Thumb and fingers: chords and melody together', watch: { id: 'rFDuj8GXMk0', title: 'John Mayer Style Guitar Lesson' }, target: { exercise: 'type:fingerstyle' } },
    { label: 'Jam over blues-rock changes', target: { jam: { page: 'solo', style: 'bluesrock', key: 'E' } } },
  ], gate: [
    { id: 'p-br-bends', label: 'Play a slow blues solo with every bend in tune' },
    { id: 'p-br-chords', label: 'Play chords with hammer-on flourishes over a groove' },
  ] },
  { id: 'popsoul', title: 'Pop and soul', who: 'Bruno Mars, James Arthur, John Legend', steps: [
    { label: 'Funk-pop chops and hooks', watch: { id: 'OAZm0FjYyPc', title: 'Cory Wong Funk Guitar Lesson' }, target: { exercise: 'type:lick:popsoul' } },
    { label: 'Funk rhythm', watch: { id: '2iMaBoeWhv4', title: 'Picking-Hand Rhythm', who: 'Cory Wong' }, target: { exercise: 'type:lick:funk' } },
    { label: 'Ballad arpeggios and bass walks', watch: { id: 'j4i3Znlx3oU', title: 'Best Fingerpicking Patterns for Beginners' }, target: { go: { licks: 'ps-ballad-arp' } } },
    { label: 'Jam over funk-pop and ballads', target: { jam: { page: 'jam', style: 'funkpop' } } },
  ], gate: [
    { id: 'p-ps-funk', label: 'Play a tight funk-pop rhythm part for a whole song' },
    { id: 'p-ps-ballad', label: 'Play a pop ballad with arpeggios and a bass walk' },
  ] },
  { id: 'prog', title: 'Prog, math rock and prog metal', who: 'Plini, Intervals, Periphery', steps: [
    { label: 'Melodic prog licks: legato, tapping, harmonics', watch: { id: '1mKGX-XiEjA', title: 'Melodic Tapping Lick (Plini Style)' }, target: { exercise: 'type:lick:progclean' } },
    { label: 'Math rock patterns', watch: { id: '2kWY1goh63E', title: 'Teach a Technique', who: 'Tim Henson (Polyphia)' }, target: { exercise: 'type:lick:mathrock' } },
    { label: 'Prog metal riffs', watch: { id: 'iKa4DVYXcls', title: 'Progressive Metal: Petrucci, Vai and Opeth Style' }, target: { exercise: 'type:lick:progmetal' } },
    { label: 'Sweep picking', watch: { id: '87-ExnPUhaM', title: 'Easy 3-String Sweep Picking' }, target: { exercise: 'type:sweep' } },
    { label: 'Jam over melodic prog', watch: { id: 'FvKiOyY-zOA', title: 'Plini\'s Pentatonic Hacks' }, target: { jam: { page: 'solo', style: 'progclean', key: 'E' } } },
  ], gate: [
    { id: 'p-pg-legato', label: 'Play a legato run cleanly at 100 BPM' },
    { id: 'p-pg-tap', label: 'Play a tapped arpeggio in time' },
  ] },
  { id: 'slackkey', title: 'Hawaiian slack key (kī hōʻalu)', who: 'Gabby Pahinui, Ledward Kaʻapana, Keola Beamer, Kaʻau Crater Boys', steps: [
    { label: 'Open G (taro patch) and how slack key works', target: { go: { technique: 'slack-tuning' } } },
    { label: 'The thumb and the melody', target: { go: { technique: 'slack-thumb' } } },
    { label: 'Hammer-ons, pull-offs and sweet 6ths', target: { go: { technique: 'slack-hammer' } } },
    { label: 'Harmonics and the Hawaiian vamp', target: { go: { technique: 'slack-vamp' } } },
    { label: 'Songs from the Songbook: Hawaiian & slack key', watch: { id: 'R4xJiPvX1Ko', title: 'The Tradition of Kī Hōʻalu', who: 'Jeff Peterson' }, target: { go: { songs: 'songbook' } } },
    { label: 'New slack key phrases: Jam → Make a tab (Hawaiian slack key)', target: { jam: { page: 'tab', style: 'slackkey', key: 'G' } } },
    { label: 'Fingerpick a slack key progression (Slack key pattern)', target: { jam: { page: 'jam', style: 'slackkey', key: 'G' } } },
  ], gate: [
    { id: 'p-sk-thumb', label: 'Keep the alternating thumb steady through a whole piece in open G' },
    { id: 'p-sk-piece', label: 'Play Kona Morning or Trade Wind Vamp all the way through' },
    { id: 'p-sk-vamp', label: 'End a tune with the Hawaiian vamp and harmonics' },
  ] },
  { id: 'classical', title: 'Classical guitar', who: 'Tárrega, Sor, Carcassi, Bach', steps: [
    { label: 'p-i-m-a arpeggios (Giuliani pattern)', watch: { id: '99yx4Mn1NN0', title: 'P-I-M-A-M-I: Right-Hand Arpeggios' }, target: { jam: { page: 'tab', style: 'classical' } } },
    { label: 'Romanza: triplets with the melody on top', watch: { id: 'nB2WUfrzi5Y', title: 'Learn to Play Romanza (Part 1)', who: 'EliteGuitarist' }, target: { go: { songs: 'songbook' } } },
    { label: 'Greensleeves, Minuet in G, Für Elise, Canon in D', target: { go: { songs: 'songbook' } } },
    { label: 'New classical studies: Jam → Make a tab (Classical guitar)', target: { jam: { page: 'tab', style: 'classical', key: 'E', mode: 'harmonic' } } },
  ], gate: [
    { id: 'p-cl-romanza', label: 'Play the first section of Romanza in time' },
    { id: 'p-cl-piece', label: 'Play two classical pieces from the Songbook' },
  ] },
  { id: 'fingerstyle', title: 'Melodic fingerstyle', who: 'Marco Cirillo', steps: [
    { label: 'How the style works', watch: { id: 'qzreNu9FWec', title: 'Fingerstyle Technique for Beginners', who: 'Marco Cirillo' }, target: { go: { technique: 'melodic' } } },
    { label: 'Melodic fingerstyle exercises', watch: { id: '9JJwbdAT5vU', title: 'Simple Fingerpicking Pattern, Amazing Chords', who: 'Marco Cirillo' }, target: { exercise: 'type:melodic' } },
    { label: 'Fingerstyle licks', watch: { id: '4SeYqzRaFQE', title: 'A Beautiful Melodic Fingerstyle Progression', who: 'Marco Cirillo' }, target: { exercise: 'type:lick:fingerstyle' } },
  ], gate: [
    { id: 'p-mf-piece', label: 'Play one fingerstyle piece with the melody ringing over the bass' },
  ] },
]
/** The next step of each path you follow (for today's routine). */
export function pathSteps(v: Z2H): Focus[] {
  const ticked = new Set(v.ticks)
  return (v.paths ?? []).map(id => PATHS.find(p => p.id === id)).filter((p): p is StylePath => !!p)
    .map(p => p.steps.find(s => !ticked.has(`ps:${p.id}:${s.label}`)) ?? p.steps[p.steps.length - 1])
}

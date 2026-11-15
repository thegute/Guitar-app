// Fills between chords, part 2: turning a progression into the workshop's step-by-step tabs. Each step is a short
// looping tab over the progression (strummed shells plus the fills that step teaches) with the band behind it, so it
// opens in Play with the mic, speed control, the speed trainer and the coach like any song.
import type { Song, SongBar, SongNote, SongStep } from '../tabs/model'
import { STD, TOP, freeNotes, shellPath, shellsFor, type Free, type Shell, type ShellNote } from './shells'

export interface FillStep {
  id: string
  title: string
  /** why this step matters, in a sentence or two */
  why: string
  /** how to play it */
  how: string[]
  /** what to listen for (the coach's tip) */
  listen: string
  /** the tab: a few bars over the progression */
  song: Song
  /** play it In time (the band and the gaps matter) rather than Wait for me */
  inTime?: boolean
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11]
const PENT = [0, 2, 4, 7, 9]
const pcOf = (m: number) => ((m % 12) + 12) % 12
interface Ev { at: number; dur: number; notes: SongNote[]; chord?: string; stroke?: 'down' | 'up' }

const nt = (s: number, f: number, tech?: string, tuning = STD): SongNote => ({ string: s, fret: f, midi: tuning[s] + f, ...(tech ? { tech } : {}) })
const strum = (sh: Shell, at: number, dur: number, chord?: string, tuning = STD): Ev => ({ at, dur, notes: sh.notes.map(n => nt(n.string, n.fret, undefined, tuning)), ...(chord ? { chord } : {}), stroke: 'down' })

/** events → one bar of steps (gaps become rests) */
function bar(evs: Ev[], beats = 4): SongBar {
  const steps: SongStep[] = []
  let t = 0
  for (const e of [...evs].sort((a, b) => a.at - b.at)) {
    if (e.at > t + 1e-6) steps.push({ notes: [], dur: round(e.at - t) })
    const dur = Math.min(e.dur, beats - e.at)
    steps.push({ notes: e.notes, dur: round(dur), ...(e.chord ? { chord: e.chord } : {}), ...(e.stroke ? { stroke: e.stroke } : {}) })
    t = e.at + dur
  }
  if (t < beats - 1e-6) steps.push({ notes: [], dur: round(beats - t) })
  return { steps }
}
const round = (x: number) => Math.round(x * 10000) / 10000

/** the key's notes (major scale, or its major pentatonic) on one string between two frets */
function scaleOn(string: number, lo: number, hi: number, tonic: number, pent: boolean, tuning = STD): number[] {
  const deg = pent ? PENT : MAJOR
  const out: number[] = []
  for (let f = Math.max(0, lo); f <= hi; f++) if (deg.includes(pcOf(tuning[string] + f - tonic))) out.push(f)
  return out
}

/** The best free-finger move for this shell (the sus moves first), skipping roles already used `skip` times. */
function pickFree(sh: Shell, k = 0, kinds: Free['move'][] = ['hammer', 'pull']): Free | undefined {
  const fr = freeNotes(sh).filter(f => kinds.includes(f.move))
  // one of each role, in rank order
  const seen = new Set<string>(), uniq: Free[] = []
  for (const f of fr) { const key = `${f.role}:${f.move}`; if (!seen.has(key)) { seen.add(key); uniq.push(f) } }
  return uniq.length ? uniq[k % uniq.length] : undefined
}

/** A short walk on the top strings from `from` (a shell note) to just before `to` (the next shell's top note), through
 *  the key's notes: `n` notes, the last one a scale step from the landing note. Returns string/fret pairs. */
export function walkTo(from: ShellNote, to: ShellNote, n: number, tonic: number, pent: boolean, tuning = STD): { string: number; fret: number }[] {
  // every key note on the top three strings in a window around both shapes
  const lo = Math.max(0, Math.min(from.fret, to.fret) - 2), hi = Math.max(from.fret, to.fret) + 2
  const spots: { string: number; fret: number; midi: number }[] = []
  for (const s of TOP) for (const f of scaleOn(s, lo, hi, tonic, pent, tuning)) spots.push({ string: s, fret: f, midi: tuning[s] + f })
  const byPitch = new Map<number, { string: number; fret: number; midi: number }>()
  // one place per pitch: the one nearest the hand (closest fret to the middle of the two shapes)
  const mid = (from.fret + to.fret) / 2
  for (const sp of spots) { const o = byPitch.get(sp.midi); if (!o || Math.abs(sp.fret - mid) < Math.abs(o.fret - mid)) byPitch.set(sp.midi, sp) }
  const pitches = [...byPitch.keys()].sort((a, b) => a - b)
  if (!pitches.length) return []
  // the approach note: the key note next to the landing note on the side the line comes from (below when it climbs,
  // above when it falls), so the line never passes through the landing note
  const below = pitches.filter(p => p < to.midi), above = pitches.filter(p => p > to.midi)
  const fits = (side: 'above' | 'below') => side === 'above' ? above.length >= n : below.length >= n
  let side: 'above' | 'below' = from.midi > to.midi ? 'above' : 'below'
  if (!fits(side) && fits(side === 'above' ? 'below' : 'above')) side = side === 'above' ? 'below' : 'above'
  const last = side === 'above' ? (above[0] ?? below[below.length - 1]) : (below[below.length - 1] ?? above[0])
  const li = pitches.indexOf(last)
  const dir = last > to.midi ? 1 : -1
  const line: number[] = []
  for (let k = n - 1; k >= 0; k--) line.push(pitches[Math.max(0, Math.min(pitches.length - 1, li + dir * k))])
  return line.map(p => byPitch.get(p)!).map(({ string, fret }) => ({ string, fret }))
}

/** the shell with one string's note swapped for a free note (the chord "breathing": strum it, then hammer back) */
function swapped(sh: Shell, f: Free, tuning = STD): SongNote[] {
  return sh.notes.map(n => (n.string === f.string ? nt(n.string, f.fret, undefined, tuning) : nt(n.string, n.fret, undefined, tuning)))
}

/** diatonic step down (or up) for a note on its own string */
function stepOnString(s: number, fret: number, tonic: number, dir: -1 | 1, tuning = STD): number {
  for (let f = fret + dir; f >= 0 && f <= 20; f += dir) if (MAJOR.includes(pcOf(tuning[s] + f - tonic))) return f
  return fret
}

export interface WorkshopIn { chords: string[]; key: string; bpm: number; style: 'mayer'; tuning?: number[]; title?: string }
const PCS: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }

/** The workshop: nine steps over one progression. */
export function workshop(w: WorkshopIn): { shells: Shell[]; steps: FillStep[] } {
  const tuning = w.tuning ?? STD
  const shells = shellPath(w.chords, tuning)
  if (!shells.length) return { shells, steps: [] }
  const tonic = PCS[w.key.replace(/m$/, '')] ?? 7
  const n = shells.length
  const next = (i: number) => shells[(i + 1) % n]
  const song = (id: string, title: string, bars: SongBar[]): Song => ({
    title: `${w.title ?? 'Fills'}: ${title}`, tempo: w.bpm, backing: { groove: 'halftime', bass: 'ballad' },
    tracks: [{ name: 'Guitar', tuning, capo: 0, bars, program: 27 }],
  })
  // every step goes round the progression twice (the second time with the next choice of fill where there is one)
  const twice = (make: (sh: Shell, i: number, pass: number) => Ev[]) => [0, 1].flatMap(pass => shells.map((sh, i) => bar(make(sh, i, pass))))

  const steps: FillStep[] = []
  // 1. the shells
  steps.push({
    id: 'shells', title: '1. The chord shells',
    why: 'Fills live around small chord shapes on the top three strings. Big open chords tie up every finger; these leave fingers free and move easily.',
    how: ['Each chord is three notes on the G, B and high e strings.', `They sit close together: ${shells.map(s => `${s.chord} at fret ${Math.max(1, s.lo)}`).join(', ')}.`, 'Strum them on beats 1 and 3. Change shapes with as little movement as you can: some notes stay put.'],
    listen: 'All three strings ring clearly, and the change happens right on the beat.',
    song: song('shells', 'the shells', twice((sh, i) => [strum(sh, 0, 2, sh.chord, tuning), strum(sh, 2, 2, undefined, tuning)])),
  })
  // 2. the shape map: hear each chord tone
  steps.push({
    id: 'map', title: '2. Know the notes in each shape',
    why: 'To land a fill on the chord you need to know which note is the root, the 3rd and the 5th. Then any of them can be where a fill starts or ends.',
    how: ['Strum the shape, then pick its notes one at a time: G string, B, e, back to B.', 'Say the role of each as you play it (root, 3rd, 5th). The neck above shows them.', 'The root is home; the 3rd makes it major or minor; the 5th is strong and neutral.'],
    listen: 'Each note on its own is clean, with the chord still held down.',
    song: song('map', 'the notes in each shape', twice((sh, i) => [strum(sh, 0, 1, sh.chord, tuning), ...[3, 4, 5, 4].map((s, k) => ({ at: 1 + k * 0.5, dur: 0.5, notes: [nt(s, sh.notes.find(x => x.string === s)!.fret, undefined, tuning)] })), strum(sh, 3, 1, undefined, tuning)])),
  })
  // 3. one free-finger move: the chord breathes
  steps.push({
    id: 'free', title: '3. One free finger: let the chord breathe',
    why: 'This is the sound of John Mayer\'s rhythm playing: you hold the shape, and a spare finger adds a note next to a chord tone and moves into it. The chord seems to sigh.',
    how: ['Strum the shape with one note changed (the free finger is down), then hammer on (h) or pull off (p) into the real chord note.', 'Keep the other two fingers still: only the free finger moves.', 'The second time round you get a different free note for each chord.'],
    listen: 'The hammer-on or pull-off is as loud as the strum, and the chord keeps ringing under it.',
    song: song('free', 'one free finger', twice((sh, i, pass) => {
      const f = pickFree(sh, pass)
      if (!f) return [strum(sh, 0, 2, sh.chord, tuning), strum(sh, 2, 2, undefined, tuning)]
      return [{ at: 0, dur: 0.5, notes: swapped(sh, f, tuning), chord: sh.chord, stroke: 'down' }, { at: 0.5, dur: 1.5, notes: [nt(f.string, f.to.fret, f.move === 'hammer' ? 'h' : 'p', tuning)] }, strum(sh, 2, 1, undefined, tuning), strum(sh, 3, 1, undefined, tuning)]
    })),
  })
  // 4. two notes into the next chord
  steps.push({
    id: 'two', title: '4. Two notes into the next chord',
    why: 'Now the fill goes somewhere: two notes at the end of the bar that lead into the next chord. The last one is a step away from the next chord\'s top note, so the change sounds pulled in.',
    how: ['Strum the shape on 1 and let it ring.', 'On beat 4 and the "and" after it, pick the two notes.', 'Land on the next shape right on beat 1.'],
    listen: 'The fill is on time (not rushed) and the next chord lands exactly on 1.',
    song: song('two', 'two notes into the next chord', twice((sh, i) => {
      const nx = next(i)
      const line = walkTo(sh.notes[2], nx.notes[2], 2, tonic, false, tuning)
      return [strum(sh, 0, 3, sh.chord, tuning), ...line.map((p, k) => ({ at: 3 + k * 0.5, dur: 0.5, notes: [nt(p.string, p.fret, undefined, tuning)] }))]
    })),
  })
  // 5. three-note fills on the upbeats
  steps.push({
    id: 'three', title: '5. Three-note fills on the upbeats',
    why: 'Three notes from the major pentatonic, starting on the "and" of beat 3, walking into the next chord. This is the classic fill: the chord on 1, a little melody, the next chord on 1.',
    how: ['Strum on 1 and on 2.', 'Start the fill on the "and" of 3: and-4-and.', 'First time round the notes come from the major pentatonic of the key (always sweet over these chords); the second time from the whole major scale, with stepwise passing notes.'],
    listen: 'The three notes are even and the fill ends on the beat, not early.',
    song: song('three', 'three-note fills', twice((sh, i, pass) => {
      const nx = next(i)
      // first time round from the major pentatonic; second time from the whole major scale (one more passing note)
      const line = walkTo(pass ? sh.notes[1] : sh.notes[2], nx.notes[2], 3, tonic, !pass, tuning)
      return [strum(sh, 0, 1, sh.chord, tuning), strum(sh, 1, 1.5, undefined, tuning), ...line.map((p, k) => ({ at: 2.5 + k * 0.5, dur: k === line.length - 1 ? 1 : 0.5, notes: [nt(p.string, p.fret, undefined, tuning)] }))]
    })),
  })
  // 6. double-stops: sixths sliding into the shape
  steps.push({
    id: 'sixths', title: '6. Double-stops: slide into the shape in 6ths',
    why: 'Two strings at once (the G and the high e, skipping the B) make 6ths: the warm, singing sound of soul guitar (Curtis Mayfield, Jimi Hendrix, John Mayer). It sounds like part of the chord, not a scale.',
    how: ['Mute the B string with the underside of the finger on the G string.', 'Slide both notes up into the shape\'s outer two notes from two frets below.', 'Then step both notes down one scale note on the "and" of 4, leading out.'],
    listen: 'Both notes sound together and the B string stays quiet.',
    song: song('sixths', 'sixths', twice((sh, i) => {
      const g = sh.notes[0], e = sh.notes[2]
      const can = g.fret >= 3 && e.fret >= 3
      const pair = (gf: number, ef: number, tech?: string) => [nt(3, gf, tech, tuning), nt(5, ef, tech, tuning)]
      const evs: Ev[] = [strum(sh, 0, 2, sh.chord, tuning)]
      if (can) evs.push({ at: 2, dur: 0.5, notes: pair(g.fret - 2, e.fret - 2) }, { at: 2.5, dur: 1, notes: pair(g.fret, e.fret, '/') })
      else evs.push({ at: 2, dur: 1.5, notes: pair(g.fret, e.fret) })
      evs.push({ at: 3.5, dur: 0.5, notes: pair(stepOnString(3, g.fret, tonic, -1, tuning), stepOnString(5, e.fret, tonic, -1, tuning)) })
      return evs
    })),
  })
  // 7. up the neck: the same chord in its next shape, joined by a short walk
  steps.push({
    id: 'neck', title: '7. Move up the neck through the shapes',
    why: 'Every chord has three shapes on these strings, one above the other. Moving between them with a fill in the gap is how players travel the neck without losing the chord.',
    how: ['Strum the first shape on 1.', 'On 3 and the "and", walk up two notes of the major pentatonic.', 'Land on the next shape of the same chord on beat 4.'],
    listen: 'The shift is smooth: the walk carries your hand up so the new shape is ready on 4.',
    song: song('neck', 'up the neck', twice((sh, i) => {
      const all = shellsFor(sh.chord, tuning)
      const up = all.find(s => s.lo > sh.lo && s.lo >= 1) ?? sh
      const line = walkTo(sh.notes[2], up.notes[2], 2, tonic, true, tuning)
      return [strum(sh, 0, 2, sh.chord, tuning), ...line.map((p, k) => ({ at: 2 + k * 0.5, dur: 0.5, notes: [nt(p.string, p.fret, undefined, tuning)] })), strum(up, 3, 1, undefined, tuning)]
    })),
  })
  // 8. a fill in every bar, mixed
  steps.push({
    id: 'mix', title: '8. A fill in every bar',
    why: 'Now mix them: a free-finger move, a two-note lead-in, a pentatonic fill and 6ths, one after another. This is what a real part sounds like.',
    how: ['Each bar has a different kind of fill (from steps 3 to 6).', 'Keep strumming steady under them: the rhythm matters more than the notes.', 'Once it\'s clean, slow it down and change one fill each time round.'],
    listen: 'The rhythm never stops for a fill: chord, fill, chord, fill.',
    song: song('mix', 'a fill in every bar', [0, 1].flatMap(pass => shells.map((sh, i) => {
      const k = (i + pass * 2) % 4
      const src = [steps[2], steps[3], steps[4], steps[5]][k].song.tracks[0].bars
      return src[(i + pass * n) % src.length]
    }))),
  })
  // 9. your own: the band plays, you answer in the gaps
  steps.push({
    id: 'yours', title: '9. Your own fills',
    why: 'The real goal: making up fills as you play. The tab gives you the chords and leaves the end of every bar empty for you.',
    how: ['Strum on 1 and 2 as written.', 'Beats 3 and 4 are yours: a free-finger move, two notes, three notes or 6ths, whatever comes.', 'Land on the next chord on 1. Play it In time so the band keeps going.'],
    listen: 'You land on the next chord on 1 every time, whatever you played in the gap.',
    inTime: true,
    song: song('yours', 'your own fills', twice(sh => [strum(sh, 0, 1, sh.chord, tuning), strum(sh, 1, 1, undefined, tuning)])),
  })
  return { shells, steps }
}

// ---------- the ideas behind each step, and where to learn more (shown on the step, in the song player, and to the helper) ----------
export interface FillLearn {
  /** the idea, explained plainly (3–5 sentences) */
  idea: string
  /** course lessons that teach the theory under it */
  lessons: string[]
  /** KGuitar drills that build the skill */
  tools: ('targets' | 'cr' | 'techniques')[]
  /** words to look up in your books */
  topics: string[]
  /** a video (checked) */
  video?: { id: string; title: string }
}
const SERIFF = { id: 'NqSf3iV9qpg', title: 'THIS Triad System Will 13X Your RHYTHM Guitar Playing (Daniel Seriff)' }
export const FILL_LEARN: Record<string, FillLearn> = {
  shells: { idea: 'A triad is a chord\'s three notes: root, 3rd and 5th. On the top three strings each triad has three shapes (inversions), depending on which note is on top. Players like Mayer and Hendrix play these small shapes instead of full chords because they leave fingers free and move with tiny changes: often one or two fingers move and the rest stay. Learn the shapes as "where the chord is" in one small window of the neck.', lessons: ['c2-triads', 'c2-keychords'], tools: [], topics: ['triad', 'inversion'], video: SERIFF },
  map: { idea: 'Knowing which note of the shape is the root, the 3rd and the 5th is what lets you aim a fill. The root sounds like home, the 3rd says major or minor, the 5th is strong and neutral. A fill that ends on one of them sounds "right" because it lands inside the next chord. Target notes drills exactly this.', lessons: ['c2-intervals', 'c2-triads'], tools: ['targets'], topics: ['chord tones', 'intervals'] },
  free: { idea: 'A free finger adds a neighbour note (a 2nd, 4th, 6th or 9th) right next to a chord tone, then moves into it with a hammer-on or pull-off. For a moment the chord is a sus2, sus4 or 6 chord, then it resolves: the chord seems to breathe. It\'s the most common move in soul and Mayer-style rhythm playing because the chord never stops ringing.', lessons: ['c2-major', 'c2-intervals'], tools: ['techniques'], topics: ['sus2', 'sus4', 'hammer-on', 'embellishment'], video: SERIFF },
  two: { idea: 'A fill is a little melody that leads somewhere: into the next chord. The strongest way in is from one scale step away (below or above) from a note of the next chord. Your ear hears that step pull into place, the same "pull" as V to I. Two notes at the end of the bar are enough to make the change sound connected.', lessons: ['c3-pull', 'c3-progressions'], tools: ['targets'], topics: ['passing tone', 'approach note', 'voice leading'] },
  three: { idea: 'The major pentatonic of the key (the major scale without its 4th and 7th) has no notes that clash with any chord in the key, so any three of them in a row sound sweet. Starting the fill on an upbeat (the "and") leaves the chord the downbeat, which is why it sounds like rhythm guitar and not a solo. The second pass uses the whole major scale: passing notes between the pentatonic ones.', lessons: ['c3-majorpent', 'c2-rhythm'], tools: ['targets', 'cr'], topics: ['major pentatonic', 'upbeat', 'syncopation'] },
  sixths: { idea: 'Two notes a 6th apart (here on the G and high e strings) are the sound of soul guitar. They are really the outer notes of the triad shape, so they sound like the chord, and moving them together along the scale makes a two-voice melody. Sliding into them from two frets below adds the vocal "scoop". Mute the B string between them.', lessons: ['c2-intervals', 'c2-keychords'], tools: ['techniques'], topics: ['sixths', 'double stops', 'diatonic intervals'] },
  neck: { idea: 'The same chord sits in three shapes up the top strings, each one starting where the last one\'s top note was. Moving between them gives you somewhere to go while a chord lasts, and the walk in between is the fill. Mayer often climbs through the shapes over one chord, then comes back down for the next.', lessons: ['c2-triads'], tools: ['targets'], topics: ['inversion', 'triad', 'CAGED'], video: SERIFF },
  mix: { idea: 'A real part mixes the moves: a breathing chord, a lead-in, a pentatonic fill, 6ths. Keep the rhythm going under everything: the strums are the backbone and the fills hang off them. If a fill makes you late for the next chord, it is too long or too fast: play fewer notes.', lessons: ['c2-rhythm'], tools: ['cr'], topics: ['rhythm guitar', 'fills'] },
  melody: { idea: 'A longer melody is fills joined up into sentences. Bar 1 states a short idea (the motif). Bar 2 plays the same shape over the next chord, starting from a different chord tone, so it fits the new chord (a sequence). Bar 3 answers with something longer, and bar 4 walks down (or up) the scale onto the next chord\'s top note to resolve. Six and eight bars repeat the idea and end on the home chord. Question, answer, home: that is how melodies, and good solos, are built.', lessons: ['c3-majorpent', 'c3-progressions'], tools: ['cr', 'targets'], topics: ['phrasing', 'motif', 'melody'] },
  yours: { idea: 'Improvising fills is choosing, in the moment, one move you know (free finger, two-note lead-in, three notes, 6ths) and landing on the next chord on time. Start with the same move every bar, then vary one thing: where it starts, which note it lands on, or its rhythm. Landing on time matters more than what you play.', lessons: ['c3-majorpent'], tools: ['targets', 'cr'], topics: ['improvisation', 'fills'] },
}
/** the step behind a fills doc id ("fills:<style>:<key>:<chords>:<step>"), for the song player and the helper */
export function fillStepOf(docId: string | undefined): { id: string; learn: FillLearn } | null {
  if (!docId?.startsWith('fills:')) return null
  const id = docId.split(':').pop()!.split('-')[0]
  return FILL_LEARN[id] ? { id, learn: FILL_LEARN[id] } : null
}

// ---------- longer melodies: 4, 6 or 8 bars built from fills ----------
/** A small seeded random. */
function rnd(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
/** fill rhythms: where the notes start in the bar (after the chord on 1) */
const CELLS = [[2.5, 3, 3.5], [2, 2.5, 3.5], [1.5, 2, 3, 3.5], [2.5, 3.5], [2, 3, 3.5], [1.5, 2.5, 3, 3.5]]
/** contours, in scale steps from the first note (the motif's shape) */
const SHAPES = [[0, 1, 2], [0, -1, -2], [0, 2, 1], [0, 1, -1], [0, -1, 1], [0, 2, 4], [0, -2, -1]]

/** A melodic part over the progression: a motif in bar 1, the same shape over the next chord (a sequence), a longer
 *  answer in bar 3, a resolution in bar 4; six bars add the motif again and a longer ending; eight repeat the
 *  answer. The chord is strummed on 1 of every bar, so it stays rhythm guitar with a melody threaded through. */
export function melodicPart(w: WorkshopIn, bars: 4 | 6 | 8, seed: number): Song | null {
  const tuning = w.tuning ?? STD
  const shells = shellPath(w.chords, tuning)
  if (!shells.length) return null
  const tonic = PCS[w.key.replace(/m$/, '')] ?? 7
  const r = rnd(seed)
  const cell = CELLS[Math.floor(r() * CELLS.length)]
  const shape = SHAPES[Math.floor(r() * SHAPES.length)]
  // every key note on the top strings around the shapes, one place per pitch (nearest the shapes' middle)
  const lo = Math.max(0, Math.min(...shells.map(s => s.lo)) - 1), hi = Math.max(...shells.map(s => s.hi)) + 3
  const mid = (lo + hi) / 2
  void mid
  const spots = new Map<number, { string: number; fret: number }[]>()
  for (const s of TOP) for (const f of scaleOn(s, lo, hi, tonic, false, tuning)) { const m = tuning[s] + f; spots.set(m, [...(spots.get(m) ?? []), { string: s, fret: f }]) }
  const pitches = [...spots.keys()].sort((a, b) => a - b)
  // where to play a pitch: the place nearest the chord shape the hand is holding
  let hand = 0
  const byPitch = { get: (m: number) => spots.get(m)!.reduce((a, b) => (Math.abs(b.fret - hand) < Math.abs(a.fret - hand) ? b : a)) }
  const at = (i: number) => pitches[Math.max(0, Math.min(pitches.length - 1, i))]
  const near = (m: number) => pitches.reduce((b, p, i) => (Math.abs(p - m) < Math.abs(pitches[b] - m) ? i : b), 0)
  const out: SongBar[] = []
  for (let b = 0; b < bars; b++) {
    const sh = shells[b % shells.length], nx = shells[(b + 1) % shells.length]
    hand = (sh.lo + sh.hi) / 2 + 0.5
    const last = b === bars - 1
    // the phrase's role: motif, sequence, answer (longer), resolution
    const role = last ? 'end' : b % 4 === 2 ? 'answer' : b % 4 === 3 ? 'resolve' : 'motif'
    const evs: Ev[] = []
    if (role === 'end') {
      // land home: the key's own chord (or the progression's first) held
      const home = shells.find(x => x.root === tonic && !x.minor) ?? shells[0]
      evs.push(strum(home, 0, 2, home.chord, tuning), strum(home, 2, 2, undefined, tuning))
      out.push(bar(evs)); continue
    }
    const startsAt = role === 'answer' ? [1.5, 2, 2.5, 3, 3.5] : role === 'resolve' ? [2.5, 3, 3.5] : cell
    const contour = role === 'answer' ? [...shape, shape[shape.length - 1] + (shape[shape.length - 1] >= 0 ? 1 : -1), shape[shape.length - 1]].slice(0, startsAt.length)
      : role === 'resolve' ? [0, -1, -2].slice(0, startsAt.length) : shape.slice(0, startsAt.length)
    while (contour.length < startsAt.length) contour.push(contour[contour.length - 1] + 1)
    // start on a chord tone of this chord: the top note for the motif, the middle note for the sequence (it moves with the chords)
    const from = near(sh.notes[role === 'motif' && b % 4 === 1 ? 1 : 2].midi)
    let line = contour.map(c => at(from + c))
    // the last note leads into the next chord (home, before the last bar): a step away from its nearest tone
    const nxt = b === bars - 2 ? (shells.find(x => x.root === tonic && !x.minor) ?? shells[0]) : nx
    const target = nxt.notes.map(n => n.midi).reduce((a, m) => (Math.abs(m - line[line.length - 1]) < Math.abs(a - line[line.length - 1]) ? m : a))
    const ti = near(target)
    line[line.length - 1] = at(line[line.length - 1] >= target ? ti + 1 : ti - 1)
    if (line[line.length - 1] === target) line[line.length - 1] = at(ti + 1)
    // no repeated neighbours (a held note instead would read better): nudge
    // the resolution walks down the scale onto the next chord's top note (the melody "sings" its way home)
    if (role === 'resolve') {
      const ti2 = near(nxt.notes[2].midi), k = startsAt.length
      const down = startsAt.map((_, i) => at(ti2 + k - i)), up = startsAt.map((_, i) => at(ti2 - k + i))
      // whichever stays nearer the hand (coming down from above, or climbing up from below)
      const reach = (l: number[]) => Math.max(...l.map(m => Math.abs(byPitch.get(m).fret - hand)))
      line = reach(down) <= reach(up) ? down : up
    }
    // a different neighbouring key note (tries one way, then the other: the window has edges)
    const other = (m: number, dir: number) => { const i = near(m); const a = at(i + dir); return a !== m ? a : at(i - dir) }
    for (let pass = 0; pass < 4; pass++) for (let i = 1; i < line.length; i++) if (line[i] === line[i - 1]) {
      if (i === line.length - 1) line[i - 1] = other(line[i - 1], line[i - 1] > target ? 1 : -1)
      else line[i] = other(line[i], line[i] >= (line[i + 1] ?? line[i]) ? -1 : 1)
    }
    // still a repeat (the window's edge): try notes two and three steps away for the earlier one
    for (let i = 1; i < line.length; i++) if (line[i] === line[i - 1]) {
      const j = near(line[i])
      const c = [2, -2, 3, -3, 1, -1].map(d => at(j + d)).find(m => m !== line[i] && m !== line[i - 2])
      if (c !== undefined) line[i - 1] = c
    }
    const first = startsAt[0]
    evs.push(strum(sh, 0, first, sh.chord, tuning))
    startsAt.forEach((t, i) => {
      const p = byPitch.get(line[i])!
      const dur = (startsAt[i + 1] ?? 4) - t
      // a step up from the note before, on the same string, becomes a hammer-on (the legato sound of these fills)
      const prev = i ? byPitch.get(line[i - 1]) : undefined
      const tech = prev && prev.string === p.string && p.fret - prev.fret > 0 && p.fret - prev.fret <= 2 && t - startsAt[i - 1] <= 0.5 ? 'h' : prev && prev.string === p.string && prev.fret - p.fret > 0 && prev.fret - p.fret <= 2 && t - startsAt[i - 1] <= 0.5 ? 'p' : undefined
      evs.push({ at: t, dur, notes: [nt(p.string, p.fret, tech, tuning)] })
    })
    out.push(bar(evs))
  }
  // end on the key's home chord when the progression starts there: the last bar takes the first shell
  return {
    title: `${w.title ?? 'Fills'}: a ${bars}-bar melody`, tempo: w.bpm, backing: { groove: 'halftime', bass: 'ballad' },
    tracks: [{ name: 'Guitar', tuning, capo: 0, bars: out, program: 27 }],
  }
}

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

export type FillStyle = 'mayer' | 'asato'
export interface WorkshopIn { chords: string[]; key: string; bpm: number; style: FillStyle; tuning?: number[]; title?: string }
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
  if (w.style === 'asato') { asato(); return { shells, steps } }
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

  // ---------- Mateus Asato: more ornaments, slides into shapes, 3rds on the top strings, 16th-note flourishes ----------
  function asato() {
    const mut = (at: number, dur: number, stroke: 'down' | 'up' = 'down'): Ev => ({ at, dur, notes: TOP.map(st => ({ string: st, fret: 0, midi: tuning[st], tech: 'x' })), stroke })
    const legato = (pts: { string: number; fret: number }[]) => pts.map((p, k) => {
      const q = pts[k - 1]
      const tech = q && q.string === p.string && Math.abs(p.fret - q.fret) <= 2 && p.fret !== q.fret ? (p.fret > q.fret ? 'h' : 'p') : undefined
      return nt(p.string, p.fret, tech, tuning)
    })
    // 1. slide into every chord
    steps.push({
      id: 'slidein', title: '1. Slide into every chord',
      why: 'Mateus Asato rarely just plays a chord: he slides into it from a fret below. That little scoop makes the shape sound sung rather than struck.',
      how: ['Hold the shape one fret lower, pick it, and slide straight up into the real shape on the beat.', 'Keep the pressure on while you slide so the notes keep sounding.', 'Then strum the shape on 3 and 4.'],
      listen: 'The slide is quick (a grace note), so the real chord still lands on 1.',
      song: song('slidein', 'slide into every chord', twice(sh => {
        if (sh.lo < 2) return [strum(sh, 0, 2, sh.chord, tuning), strum(sh, 2, 1, undefined, tuning), strum(sh, 3, 1, undefined, tuning)]
        return [{ at: 0, dur: 0.25, notes: sh.notes.map(n => nt(n.string, n.fret - 1, undefined, tuning)), chord: sh.chord, stroke: 'down' }, { at: 0.25, dur: 1.75, notes: sh.notes.map(n => nt(n.string, n.fret, '/', tuning)) }, strum(sh, 2, 1, undefined, tuning), strum(sh, 3, 1, undefined, tuning)]
      })),
    })
    // 2. the flick: hammer, pull, hammer on one chord note
    steps.push({
      id: 'flick', title: '2. The flick: hammer, pull, hammer',
      why: 'A free finger flicks a chord note: hammer on, pull off, hammer on again, fast. It is a tiny trill that makes a held chord shimmer, and it is all over his playing.',
      how: ['Strum on 1.', 'On the "and" of 2, flick the note: hammer on from the free note, pull off back to it, hammer on again (16ths).', 'Strum again on 4. Keep the other fingers still.'],
      listen: 'All three flick notes are even and clear, not just the first.',
      song: song('flick', 'the flick', twice((sh, i, pass) => {
        const f = pickFree(sh, pass, ['hammer'])
        if (!f) return [strum(sh, 0, 2, sh.chord, tuning), strum(sh, 2, 2, undefined, tuning)]
        return [strum(sh, 0, 1.5, sh.chord, tuning), { at: 1.5, dur: 0.25, notes: [nt(f.string, f.fret, undefined, tuning)] }, { at: 1.75, dur: 0.25, notes: [nt(f.string, f.to.fret, 'h', tuning)] }, { at: 2, dur: 0.25, notes: [nt(f.string, f.fret, 'p', tuning)] }, { at: 2.25, dur: 0.75, notes: [nt(f.string, f.to.fret, 'h', tuning)] }, strum(sh, 3, 1, undefined, tuning)]
      })),
    })
    // 3. 3rds on the B and e strings, walking into the next chord
    const thirdBelow = (eFret: number): number | null => {
      // the key note two scale steps below the e-string note, played on the B string
      const m = tuning[5] + eFret
      const scale: number[] = []
      for (let x = m - 1; x >= m - 5; x--) if (MAJOR.includes(pcOf(x - tonic))) scale.push(x)
      const t = scale[1]
      if (t === undefined) return null
      const f = t - tuning[4]
      return f >= 0 ? f : null
    }
    steps.push({
      id: 'thirds', title: '3. 3rds on the top two strings',
      why: 'Two notes a 3rd apart on the B and e strings, moving together along the scale: the sweetest double-stop there is. Asato uses them to walk from one chord into the next.',
      how: ['Strum on 1 and hold it.', 'From the "and" of 2, play three pairs of notes on the B and e strings, each a 3rd apart, stepping toward the next chord.', 'Use two fingers (or one rolled across both strings where the frets match).'],
      listen: 'Both notes of each pair sound together, with no other strings ringing.',
      song: song('thirds', '3rds on the top two strings', twice((sh, i) => {
        const nx = next(i)
        const a = sh.notes[2].fret, b = nx.notes[2].fret
        const dir = b >= a ? 1 : -1
        const lo = Math.min(a, b) - 6, hi = Math.max(a, b) + 6
        const frets = scaleOn(5, lo, hi, tonic, false, tuning).filter(f => f !== b)
        // the three e-string notes just before the landing note, coming from the current side
        // stay within reach of the hand: up to three pairs from the side the line comes from
        const near4 = (f: number) => Math.abs(f - a) <= 4 && Math.abs(f - b) <= 5
        const below = frets.filter(f => f < b && near4(f)).sort((x, y) => x - y), above = frets.filter(f => f > b && near4(f)).sort((x, y) => y - x)
        const pick = (dir > 0 ? below : above).length >= (dir > 0 ? above : below).length ? (dir > 0 ? below : above) : (dir > 0 ? above : below)
        const line: (number | 'shell')[] = pick.slice(-3)
        // too few: start from the shape's own top two notes
        while (line.length < 3) line.unshift('shell')
        const evs: Ev[] = [strum(sh, 0, 1.5, sh.chord, tuning)]
        line.forEach((f, k) => {
          const at = 1.5 + k * 0.5 + (k === 2 ? 0.5 : 0), dur = k === 2 ? 1.5 : k === 1 ? 1 : 0.5
          if (f === 'shell') { evs.push({ at, dur, notes: [nt(4, sh.notes[1].fret, undefined, tuning), nt(5, sh.notes[2].fret, undefined, tuning)] }); return }
          const bf = thirdBelow(f)
          evs.push({ at, dur, notes: bf === null ? [nt(5, f, undefined, tuning)] : [nt(4, bf, undefined, tuning), nt(5, f, undefined, tuning)] })
        })
        return evs
      })),
    })
    // 4. 16th-note fills
    steps.push({
      id: 'sixteenths', title: '4. 16th-note fills into the next chord',
      why: 'Four quick notes on the last beat, hammered and pulled where they sit on one string: the fast flourish that ends so many of his phrases. Short, fast, and landing exactly on 1.',
      how: ['Strum on 1, 2 and 3.', 'On beat 4, play four 16th notes ("4 e and a") from the major pentatonic.', 'Hammer on or pull off wherever two notes are on the same string, so only the first is picked.'],
      listen: 'The four notes are even, and the next chord is right on 1, not late.',
      song: song('sixteenths', '16th-note fills', twice((sh, i, pass) => {
        // first time round the major pentatonic, the second the whole major scale
        const line = walkTo(pass ? sh.notes[1] : sh.notes[2], next(i).notes[2], 4, tonic, !pass, tuning)
        const notes = legato(line)
        return [strum(sh, 0, 1, sh.chord, tuning), strum(sh, 1, 1, undefined, tuning), strum(sh, 2, 1, undefined, tuning), ...notes.map((n, k) => ({ at: 3 + k * 0.25, dur: 0.25, notes: [n] }))]
      })),
    })
    // 5. the turn around the 3rd: 4 → 3 → 2 → 3
    steps.push({
      id: 'turn', title: '5. The turn: sus4, 3rd, sus2, 3rd',
      why: 'Circling the chord\'s 3rd from above and below (the 4th, the 3rd, the 2nd, back to the 3rd) is a little melody that never leaves the chord. Pull off, pull off, hammer on: one pick, four notes.',
      how: ['Strum on 1.', 'On beat 2: pick the 4th, pull off to the 3rd, pull off to the 2nd (or open string), hammer back to the 3rd.', 'Strum on 3 and 4.'],
      listen: 'The last note (the 3rd) rings, so the chord is whole again.',
      song: song('turn', 'the turn', twice(sh => {
        const t = sh.notes.find(n => n.role === '3' || n.role === 'b3')
        const up = t ? (t.role === '3' ? 1 : 2) : 0, dn = t ? (t.role === '3' ? 2 : 1) : 0
        if (!t || t.fret - dn < 0) return [strum(sh, 0, 2, sh.chord, tuning), strum(sh, 2, 2, undefined, tuning)]
        return [strum(sh, 0, 1, sh.chord, tuning), { at: 1, dur: 0.25, notes: [nt(t.string, t.fret + up, undefined, tuning)] }, { at: 1.25, dur: 0.25, notes: [nt(t.string, t.fret, 'p', tuning)] }, { at: 1.5, dur: 0.25, notes: [nt(t.string, t.fret - dn, 'p', tuning)] }, { at: 1.75, dur: 0.25, notes: [nt(t.string, t.fret, 'h', tuning)] }, strum(sh, 2, 1, undefined, tuning), strum(sh, 3, 1, undefined, tuning)]
      })),
    })
    // 6. ghost strums and a fill
    steps.push({
      id: 'ghost', title: '6. Ghost strums and a fill',
      why: 'Between the chords he keeps the right hand moving with muted "ghost" strums (x): the strings are touched, not fretted, so they click. That keeps the groove going, and the fill drops out of it.',
      how: ['Strum on 1, a muted strum (lift the fretting fingers slightly) on 2, an up-strum of the chord on the "and".', 'Another muted strum on 3, then a three-note fill from the "and" of 3.', 'The strumming hand never stops: down on the beats, up on the "and"s.'],
      listen: 'The muted strums are dead clicks, not notes, and the fill still lands on 1.',
      inTime: true,
      song: song('ghost', 'ghost strums', twice((sh, i) => {
        const line = walkTo(sh.notes[2], next(i).notes[2], 3, tonic, true, tuning)
        return [strum(sh, 0, 1, sh.chord, tuning), mut(1, 0.5), { ...strum(sh, 1.5, 0.5, undefined, tuning), stroke: 'up' as const }, mut(2, 0.5), ...legato(line).map((n2, k) => ({ at: 2.5 + k * 0.5, dur: 0.5, notes: [n2] }))]
      })),
    })
    // 7. one connected part, no full chords
    const cp = connectedPart(w, shells.length * 2, 1, false)
    if (cp) steps.push({
      id: 'connected', title: '7. One connected part, no full chords',
      why: 'This is his signature: he hardly ever strums a whole chord. Two notes of each shape hint the chord on beat 1, and then the line keeps moving (a chord note, a flick, a 3rds double-stop, a walk) straight into the next chord\'s two notes. The melody carries the chords.',
      how: ['Beat 1: two notes of the shape (the B and e strings, or a 6th on the G and e). Slide into them when the hand moves.', 'Then keep going: the missing chord note, a hammer-on flick, a 3rds pair on beat 3, and a walk into the next chord.', 'Keep the shape\'s fingers hovering over it: everything is one or two frets from where the chord is.'],
      listen: 'It never stops: no gaps between the chord hints and the fills, and each new chord lands on 1.',
      song: { ...cp, title: `${w.title ?? 'Fills'}: one connected part` },
    })
    steps.push({
      id: 'mix', title: '8. Mix them up',
      why: 'His parts move between all of these: a slide in, a flick, 3rds, a 16th-note flourish. Mixed, they sound like one person talking, not a list of tricks.',
      how: ['Each bar uses a different move from steps 1 to 6.', 'Keep the time first: if a move makes you late, play it slower or leave it out.', 'Once it\'s clean, swap the order of the moves.'],
      listen: 'Every bar lands on 1, whatever the move.',
      song: song('mix', 'mixed', [0, 1].flatMap(pass => shells.map((sh, i) => {
        const k = (i + pass * 3) % 6
        const src = steps[k].song.tracks[0].bars
        return src[(i + pass * n) % src.length]
      }))),
    })
    steps.push({
      id: 'yours', title: '9. Your own fills',
      why: 'Now you choose. The chord is on 1 and 2; the rest of the bar is yours for any of his moves.',
      how: ['Strum (or slide into) the shape on 1 and 2.', 'Beats 3 and 4 are yours: a flick, the turn, 3rds, or a 16th-note run.', 'Land on the next chord on 1. Play it In time so the band keeps going.'],
      listen: 'You land on the next chord on 1 every time.',
      inTime: true,
      song: song('yours', 'your own fills', twice(sh => [strum(sh, 0, 1, sh.chord, tuning), strum(sh, 1, 1, undefined, tuning)])),
    })
  }
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
  slidein: { idea: 'Sliding into a shape from one fret below is a chromatic "scoop": for a split second every note is a half step flat, then it lands. Your ear hears that as a voice bending into a note, which is why it sounds vocal. Because the shape just moves up one fret, any shell can be slid into, and it works on every chord.', lessons: ['c1-steps', 'c2-triads'], tools: ['techniques'], topics: ['slide', 'grace note', 'chromatic'] },
  flick: { idea: 'A flick is a quick trill: the free finger hammers on and pulls off a neighbour note of a chord tone, then lands on it. It decorates a held chord without changing what the chord is, the same way a singer adds a little turn on a held word. Legato (one pick, many notes) keeps it smooth and fast.', lessons: ['c2-intervals'], tools: ['techniques'], topics: ['trill', 'hammer-on', 'pull-off', 'ornament'] },
  thirds: { idea: 'Diatonic 3rds are pairs of scale notes two steps apart. Played on the B and e strings and moved together along the scale, they sound like two voices singing in harmony, and because both notes are from the key they sound right over every chord in it. Walking them step by step into the next chord\'s top note connects the chords.', lessons: ['c2-intervals', 'c2-keychords'], tools: ['targets'], topics: ['thirds', 'double stops', 'harmony'] },
  sixteenths: { idea: 'Sixteenth notes are four to a beat. Putting four of them on the last beat of a bar gives a burst of motion right before the next chord, so the change sounds pushed forward. Picking only the first note and hammering or pulling the rest keeps them even and light.', lessons: ['c1-rhythm', 'c2-rhythm', 'c3-majorpent'], tools: ['cr'], topics: ['sixteenth notes', 'legato'] },
  turn: { idea: 'A turn circles a note from above and below before landing on it. Here the note is the chord\'s 3rd: the 4th above it (the sus4 sound) and the 2nd below it (the sus2 sound) are both one or two frets away, so the turn never leaves the chord shape. It is a melody made of the chord itself.', lessons: ['c2-intervals', 'c2-triads'], tools: ['targets'], topics: ['turn', 'sus4', 'sus2', 'ornament'] },
  ghost: { idea: 'Ghost strums are strums on strings that are touched but not pressed down, so they click instead of ringing. They keep the strumming hand moving down and up in time even when no chord sounds, which is what makes a part groove. The fill then comes out of a hand that is already moving in time.', lessons: ['c2-rhythm', 'c3-rhythm'], tools: ['techniques'], topics: ['muting', 'percussive strumming', 'groove'] },
  connected: { idea: 'A chord does not need all its notes to be heard: two notes of it on the beat, plus a bass player playing the root, are enough for your ear to fill in the rest. That frees the guitar to play a continuous line that moves through the chord\'s notes and the scale notes next to them. Because every bar starts on notes of the chord and every walk ends a step from the next chord\'s notes, the line outlines the progression by itself. That is how Asato, and chord-melody players in general, make one guitar sound like rhythm and lead at once.', lessons: ['c2-triads', 'c2-intervals', 'c3-majorpent'], tools: ['targets', 'cr'], topics: ['chord melody', 'double stops', 'voice leading', 'implied harmony'] },
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
const CELLS_ASATO = [[2.5, 2.75, 3, 3.5], [3, 3.25, 3.5, 3.75], [2, 2.5, 2.75, 3, 3.5], [1.5, 2, 2.25, 2.5, 3.5]]
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
  const cells = w.style === 'asato' ? CELLS_ASATO : CELLS
  const cell = cells[Math.floor(r() * cells.length)]
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

// ---------- Mateus Asato: one connected part, no full chords ----------
/** the key note two scale steps below a pitch, played on the string below (B under e, G under B); null if out of reach */
function thirdUnder(string: number, fret: number, tonic: number, tuning = STD): { string: number; fret: number } | null {
  const m = tuning[string] + fret
  const scale: number[] = []
  for (let x = m - 1; x >= m - 5; x--) if (MAJOR.includes(pcOf(x - tonic))) scale.push(x)
  const t = scale[1]
  if (t === undefined || string < 1) return null
  const f = t - tuning[string - 1]
  return f >= 0 && f <= 19 ? { string: string - 1, fret: f } : null
}

/** A flowing part in his style: each chord only hinted (two notes of its shape on beat 1, sometimes slid into), then a
 *  line that keeps moving (a chord note, a hammer-on flick, a 3rds double-stop, a walk) and lands on the next chord's
 *  two-note shape. No strummed chords: the melody carries the harmony. */
export function connectedPart(w: WorkshopIn, bars: number, seed: number, end = true): Song | null {
  const tuning = w.tuning ?? STD
  const shells = shellPath(w.chords, tuning)
  if (!shells.length) return null
  const tonic = PCS[w.key.replace(/m$/, '')] ?? 7
  const r = rnd(seed * 7 + 3)
  const out: SongBar[] = []
  const home = shells.find(x => x.root === tonic && !x.minor) ?? shells[0]
  let prevTopFret = shells[0].notes[2].fret
  for (let b = 0; b < bars; b++) {
    const last = end && b === bars - 1
    const sh = last ? home : shells[b % shells.length]
    const nx = end && b === bars - 2 ? home : shells[(b + 1) % shells.length]
    const evs: Ev[] = []
    const [g, bb, e] = sh.notes
    // beat 1: the chord hinted by two of its notes (B + e, or a 6th on G + e every other bar); slid into from a fret
    // below when the hand comes from further away
    const sixth = b % 2 === 1
    const dyad = sixth ? [g, e] : [bb, e]
    const slide = Math.abs(e.fret - prevTopFret) >= 2 && Math.min(...dyad.map(n => n.fret)) >= 2 && r() < 0.6
    if (last) {
      evs.push({ at: 0, dur: 2, notes: sh.notes.map(n => nt(n.string, n.fret, undefined, tuning)), chord: sh.chord }, { at: 2, dur: 2, notes: [nt(bb.string, bb.fret, undefined, tuning), nt(e.string, e.fret, undefined, tuning)] })
      out.push(bar(evs)); break
    }
    if (slide) {
      evs.push({ at: 0, dur: 0.25, notes: dyad.map(n => nt(n.string, n.fret - 1, undefined, tuning)), chord: sh.chord })
      evs.push({ at: 0.25, dur: 0.25, notes: dyad.map(n => nt(n.string, n.fret, '/', tuning)) })
    } else evs.push({ at: 0, dur: 0.5, notes: dyad.map(n => nt(n.string, n.fret, undefined, tuning)), chord: sh.chord })
    // the and of 1: the chord note left out of the dyad
    const other = sixth ? bb : g
    evs.push({ at: 0.5, dur: 0.5, notes: [nt(other.string, other.fret, undefined, tuning)] })
    // beat 2: a flick into a chord tone (hammer from the free note), or the turn on the 3rd
    const f = pickFree(sh, b, ['hammer'])
    if (f) evs.push({ at: 1, dur: 0.25, notes: [nt(f.string, f.fret, undefined, tuning)] }, { at: 1.25, dur: 0.75, notes: [nt(f.string, f.to.fret, 'h', tuning)] })
    else evs.push({ at: 1, dur: 1, notes: [nt(e.string, e.fret, undefined, tuning)] })
    // beat 3: a 3rd under the top note (or the next scale note), as a double-stop
    const top = { string: 5, fret: e.fret }
    const under = thirdUnder(5, top.fret, tonic, tuning)
    evs.push({ at: 2, dur: 0.5, notes: under ? [nt(under.string, under.fret, undefined, tuning), nt(5, top.fret, undefined, tuning)] : [nt(5, top.fret, undefined, tuning)] })
    // the and of 3 to the end: a walk into the next chord's top note (16ths on the last beat every other bar)
    const run16 = r() < 0.5
    const k = run16 ? 4 : 3
    const line = walkTo(e, nx.notes[2], k, tonic, b % 2 === 0, tuning)
    const times = run16 ? [2.5, 3, 3.25, 3.5, 3.75].slice(5 - k - 0) : [2.5, 3, 3.5]
    const ts = run16 ? [3, 3.25, 3.5, 3.75] : times
    if (run16) evs.push({ at: 2.5, dur: 0.5, notes: [nt(e.string, e.fret, undefined, tuning)] })
    line.forEach((p, i) => {
      const q = line[i - 1]
      const tech = q && q.string === p.string && Math.abs(p.fret - q.fret) <= 2 && p.fret !== q.fret ? (p.fret > q.fret ? 'h' : 'p') : undefined
      evs.push({ at: ts[i], dur: (ts[i + 1] ?? 4) - ts[i], notes: [nt(p.string, p.fret, tech, tuning)] })
    })
    prevTopFret = line.length ? line[line.length - 1].fret : e.fret
    out.push(bar(evs))
  }
  return {
    title: `${w.title ?? 'Fills'}: a connected ${bars}-bar part`, tempo: w.bpm, backing: { groove: 'halftime', bass: 'ballad' },
    tracks: [{ name: 'Guitar', tuning, capo: 0, bars: out, program: 27 }],
  }
}

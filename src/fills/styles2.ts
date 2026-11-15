// Fills between chords: the other four styles the owner asked for, each over a progression in its own world.
//   bluegrass (Tony Rice, Billy Strings): open chords, boom-chuck, bass walk-ups, hammer-ons from open strings,
//     crosspicking rolls, open-string double-stops and the blue-3rd ending run
//   atkins (Chet Atkins): Travis picking (a steady alternating thumb bass) with melody, fills and harmonics on top
//   plini: big ringing add9 shapes with open strings, legato fills, harmonics
//   mancuso (Matteo Mancuso): fingerstyle fusion: bass and chord together, chromatic approach notes, enclosures,
//     legato runs
// All original material in these styles. Standard tuning.
import type { Song, SongBar, SongNote } from '../tabs/model'
import { current } from '../instrument'
import { shapesFor } from '../theory/shapes'
import { bar, nt, rnd, walkTo, type Ev, type FillStep } from './make'
import { shellPath, STD, type Shell } from './shells'

export type Style2 = 'bluegrass' | 'atkins' | 'plini' | 'mancuso' | 'spread'
const MAJOR = [0, 2, 4, 5, 7, 9, 11]
const PCS: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 }
const pcOf = (m: number) => ((m % 12) + 12) % 12
const tuning = STD

/** the style's progressions (semitones above the key, minor or not) and keys */
export const STYLE2: Record<Style2, { label: string; keys: string[]; progs: { id: string; label: string; chords: [number, boolean][] }[]; bpm: number; groove: string; bass: string; program: number; intro: string }> = {
  bluegrass: {
    label: 'Tony Rice / Billy Strings', keys: ['G', 'C', 'D', 'A'], bpm: 100, groove: 'train', bass: 'country', program: 25,
    intro: 'Bluegrass rhythm and fills the way Tony Rice and Billy Strings play them: open chords, boom-chuck, bass walk-ups, hammer-ons from open strings, crosspicking rolls and the blue-3rd ending run.',
    progs: [
      { id: 'i-iv-i-v', label: 'I – IV – I – V', chords: [[0, false], [5, false], [0, false], [7, false]] },
      { id: 'i-v-iv-i', label: 'I – V – IV – I', chords: [[0, false], [7, false], [5, false], [0, false]] },
      { id: 'i-vi-iv-v', label: 'I – vi – IV – V', chords: [[0, false], [9, true], [5, false], [7, false]] },
    ],
  },
  atkins: {
    label: 'Chet Atkins', keys: ['C', 'G', 'D', 'A', 'E'], bpm: 84, groove: 'brushfolk', bass: 'country', program: 25,
    intro: 'Travis picking the way Chet Atkins played it: your thumb keeps a steady alternating bass while the fingers play melody, fills and harmonics on top. Pick with your fingers (thumb on the low strings).',
    progs: [
      { id: 'i-vi-iv-v', label: 'I – vi – IV – V', chords: [[0, false], [9, true], [5, false], [7, false]] },
      { id: 'i-iv-v-i', label: 'I – IV – V – I', chords: [[0, false], [5, false], [7, false], [0, false]] },
      { id: 'ragtime', label: 'I – VI7 – II7 – V7 (ragtime)', chords: [[0, false], [9, false], [2, false], [7, false]] },
    ],
  },
  plini: {
    label: 'Plini', keys: ['E', 'A', 'B', 'D'], bpm: 90, groove: 'halftime', bass: 'ballad', program: 27,
    intro: 'Plini\'s clean sound: big add9 shapes with open strings ringing over them, smooth legato fills between them, and harmonics. Let everything ring as long as it can.',
    progs: [
      { id: 'i-vi-iv-v', label: 'I – vi – IV – V', chords: [[0, false], [9, true], [5, false], [7, false]] },
      { id: 'iv-i-v-vi', label: 'IV – I – V – vi', chords: [[5, false], [0, false], [7, false], [9, true]] },
      { id: 'vi-iv-i-v', label: 'vi – IV – I – V', chords: [[9, true], [5, false], [0, false], [7, false]] },
    ],
  },
  spread: {
    label: 'String-skipping triads & 10ths', keys: ['C', 'G', 'D', 'A', 'E', 'F'], bpm: 72, groove: 'halftime', bass: 'ballad', program: 25,
    intro: 'Triads with a string skipped: spread (open) triad shapes for a big, piano-like sound; 10ths (a bass note with its 3rd an octave up) moving together like two singers; and string-skipping arpeggios that jump across the neck. Used by John Mayer, Tommy Emmanuel, neo-soul and worship players, Paul Gilbert and Plini.',
    progs: [
      { id: 'i-vi-iv-v', label: 'I – vi – IV – V', chords: [[0, false], [9, true], [5, false], [7, false]] },
      { id: 'i-iv-v-i', label: 'I – IV – V – I', chords: [[0, false], [5, false], [7, false], [0, false]] },
      { id: 'ii-v-i-i', label: 'ii – V – I', chords: [[2, true], [7, false], [0, false], [0, false]] },
    ],
  },
  mancuso: {
    label: 'Matteo Mancuso', keys: ['A', 'D', 'G', 'C', 'E'], bpm: 80, groove: 'purdie', bass: 'walk', program: 27,
    intro: 'Fingerstyle fusion in Matteo Mancuso\'s direction: thumb on the bass, fingers on the chord, and melody lines full of chromatic approach notes and enclosures. The most advanced of the styles: take it slowly.',
    progs: [
      { id: 'ii-v-i-vi', label: 'ii – V – I – vi', chords: [[2, true], [7, false], [0, false], [9, true]] },
      { id: 'i-vi-ii-v', label: 'I – vi – ii – V', chords: [[0, false], [9, true], [2, true], [7, false]] },
      { id: 'i-iv', label: 'I – IV (vamp)', chords: [[0, false], [5, false], [0, false], [5, false]] },
    ],
  },
}
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
export const chordsOf = (key: string, prog: [number, boolean][]) => prog.map(([s, m]) => NAMES[((PCS[key] ?? 7) + s) % 12] + (m ? 'm' : ''))

// ---------- open chord voicings (bluegrass, Atkins) ----------
interface Open { sym: string; frets: number[]; rootS: number; altS: number; root: number }
function openOf(sym: string): Open {
  const m = /^([A-G][#b]?)(.*)$/.exec(sym)!
  const vs = shapesFor({ root: m[1], type: m[2] }, current())
  const v = vs.find(x => x.frets.some(f => f === 0)) ?? vs[0]
  const frets = v ? v.frets.slice(0, 6) : [-1, 0, 2, 2, 2, 0]
  const root = PCS[m[1]] ?? 0
  const rootS = Math.max(0, frets.findIndex((f, s) => f >= 0 && pcOf(tuning[s] + f) === root))
  // the thumb's other string: two strings up from the low E, one string up otherwise
  let altS = rootS === 0 ? 2 : rootS + 1
  if (frets[altS] < 0) altS = frets.findIndex((f, s) => s > rootS && f >= 0)
  return { sym, frets, rootS, altS, root }
}
const onS = (o: Open, s: number, tech?: string): SongNote => nt(s, Math.max(0, o.frets[s]), tech, tuning)
const strumTop = (o: Open, from = 2): SongNote[] => o.frets.map((f, s) => (s >= Math.max(from, o.rootS + 1) && f >= 0 ? nt(s, f, undefined, tuning) : null)).filter((x): x is SongNote => !!x)
/** where to play a pitch on the low three strings (frets 0–4) */
function lowSpot(m: number): { string: number; fret: number } | null {
  for (const s of [0, 1, 2]) { const f = m - tuning[s]; if (f >= 0 && f <= 4) return { string: s, fret: f } }
  return null
}

function song(title: string, bars: SongBar[], st: Style2, bpm: number, label: string): Song {
  const S = STYLE2[st]
  return { title: `${label}: ${title}`, tempo: bpm, backing: { groove: S.groove, bass: S.bass }, tracks: [{ name: 'Guitar', tuning, capo: 0, bars, program: S.program }] }
}


// ---------- spread triads (open voicings) and 10ths ----------
export interface Spread { strings: number[]; frets: number[]; midis: number[]; roles: string[] }
const ROLE: Record<number, string> = { 0: 'R', 3: 'b3', 4: '3', 7: '5', 6: 'b5', 8: '#5' }
/** Every spread triad for a chord: three strings out of four neighbouring ones (one string skipped), notes going up,
 *  covering more than an octave (that's what makes it "spread"), within a 4-fret span, frets 0–14. Lowest first. */
export function spreadTriads(root: number, minor: boolean): Spread[] {
  const pcs = [root, (root + (minor ? 3 : 4)) % 12, (root + 7) % 12]
  const sets = [[0, 2, 3], [0, 1, 3], [1, 3, 4], [1, 2, 4], [2, 4, 5], [2, 3, 5]]
  const out: Spread[] = []
  for (const set of sets) for (let a = 0; a <= 14; a++) for (let b = 0; b <= 14; b++) for (let c = 0; c <= 14; c++) {
    const fr = [a, b, c], m = set.map((st, i) => tuning[st] + fr[i])
    if (!(m[0] < m[1] && m[1] < m[2]) || m[2] - m[0] <= 12) continue
    const p = m.map(pcOf)
    if (new Set(p).size !== 3 || !pcs.every(x => p.includes(x))) continue
    const played = fr.filter(f => f > 0)
    if (played.length && Math.max(...played) - Math.min(...played) > 3) continue
    if (fr.some(f => f === 0) && Math.max(...fr) > 4) continue
    out.push({ strings: set, frets: fr, midis: m, roles: m.map(x => ROLE[pcOf(x - root)] ?? '') })
  }
  return out.sort((x, y) => Math.min(...x.frets) - Math.min(...y.frets))
}
/** a 10th: the root on a low string and its 3rd an octave up, three strings higher (two skipped: E with G, A with B) */
export function tenthOf(rootMidi: number, minor: boolean, near: number): { lo: { string: number; fret: number }; hi: { string: number; fret: number } } | null {
  let best: { lo: { string: number; fret: number }; hi: { string: number; fret: number } } | null = null, cost = 99
  for (const s of [0, 1]) for (const oct of [0, 12, 24]) {
    const lf = rootMidi + oct - tuning[s]
    if (lf < 0 || lf > 14) continue
    const hm = rootMidi + oct + 12 + (minor ? 3 : 4), hs = s + 3, hf = hm - tuning[hs]
    if (hf < 0 || hf > 15 || Math.abs(hf - lf) > 4) continue
    const c = Math.abs(lf - near) + s * 0.3
    if (c < cost) { cost = c; best = { lo: { string: s, fret: lf }, hi: { string: hs, fret: hf } } }
  }
  return best
}

export interface Style2In { style: Style2; key: string; prog: [number, boolean][]; bpm: number; title?: string }

export function style2Workshop(w: Style2In): { chords: string[]; steps: FillStep[] } {
  const chords = chordsOf(w.key, w.prog)
  const tonic = PCS[w.key] ?? 7
  const label = w.title ?? `${STYLE2[w.style].label} fills`
  const mk = (title: string, bars: SongBar[]) => song(title, bars, w.style, w.bpm, label)
  const twice = (make: (i: number, pass: number) => Ev[]) => [0, 1].flatMap(pass => chords.map((_, i) => bar(make(i, pass))))
  const n = chords.length
  const steps: FillStep[] = []
  const add = (id: string, title: string, why: string, how: string[], listen: string, bars: SongBar[], inTime?: boolean) => steps.push({ id, title, why, how, listen, song: mk(title.replace(/^\d+\.\s*/, '').toLowerCase(), bars), ...(inTime ? { inTime } : {}) })
  const mix = (id: string, from: number, to: number, skip?: string) => {
    const pool = steps.slice(from, to).filter(x => x.id !== skip)
    add(id, `${steps.length + 1}. Mix them up`, 'A real part moves between all of these: one move per bar, the rhythm never stopping.', ['Each bar uses a different move from the steps before.', 'Keep the time first: if a move makes you late, play it slower or leave it out.', 'Once it\'s clean, swap the order of the moves.'], 'Every bar lands on the 1, whatever the move.',
      [0, 1].flatMap(pass => chords.map((_, i) => { const p = pool[(i + pass * 2) % pool.length].song.tracks[0].bars; return p[(i + pass * n) % p.length] })))
  }

  if (w.style === 'bluegrass' || w.style === 'atkins') {
    const opens = chords.map(openOf)
    const boom = (o: Open, chord: string): Ev[] => [
      { at: 0, dur: 1, notes: [onS(o, o.rootS)], chord }, { at: 1, dur: 1, notes: strumTop(o), stroke: 'down' },
      { at: 2, dur: 1, notes: [onS(o, o.altS)] }, { at: 3, dur: 1, notes: strumTop(o), stroke: 'down' },
    ]
    if (w.style === 'bluegrass') {
      add('bg-boom', '1. Boom-chuck', 'The bluegrass rhythm: a bass note on the beat ("boom"), a strum of the top strings in between ("chuck"), and the bass moving between the root and another chord note. Everything else hangs off it.', ['Pick the root on beat 1.', 'Strum the top strings short and crisp on 2.', 'Pick the other bass note on 3, strum on 4.'], 'The bass notes ring and the strums are short and percussive.', twice(i => boom(opens[i], chords[i])))
      add('bg-walk', '2. Bass walk-ups into the next chord', 'Instead of the second boom-chuck, walk the bass up (or down) the scale into the next chord\'s root. It\'s the most common bluegrass fill: it tells the band where the music is going.', ['Boom-chuck on beats 1 and 2.', 'On 3, "and", 4: three bass notes walking to the next chord\'s root.', 'Land on that root on the next 1.'], 'The walk is even and the next root lands right on 1.', twice(i => {
        const o = opens[i], nx = opens[(i + 1) % n]
        const target = tuning[nx.rootS] + nx.frets[nx.rootS]
        const from = tuning[o.rootS] + o.frets[o.rootS]
        const up = target >= from
        // three key notes walking toward the target (on the low strings)
        const line: number[] = []
        for (let m = target + (up ? -1 : 1); line.length < 3 && Math.abs(m - target) < 8; m += up ? -1 : 1) if (MAJOR.includes(pcOf(m - tonic)) && lowSpot(m)) line.unshift(m)
        const evs: Ev[] = boom(o, chords[i]).slice(0, 2)
        line.forEach((m, k) => { const p = lowSpot(m)!; evs.push({ at: 2 + k * 0.5, dur: k === 2 ? 1 : 0.5, notes: [nt(p.string, p.fret, undefined, tuning)] }) })
        return evs
      }))
      add('bg-hammer', '3. Hammer-ons from open strings', 'Pick an open string and hammer onto the chord\'s fretted note on the same string: the bluegrass "lick" sound in the middle of a strum. It keeps the chord shape and adds a little melody.', ['Bass note on 1.', 'On the "and" of 1, pick an open string and hammer on (h) to the chord\'s note two frets up.', 'Strum on 2, bass on 3, strum on 4.'], 'The hammered note is as loud as the picked one.', twice(i => {
        const o = opens[i]
        const s = [2, 1, 3].find(x => x > o.rootS && o.frets[x] === 2) ?? [1, 2, 3, 4].find(x => x > o.rootS && o.frets[x] > 0 && o.frets[x] <= 3)
        const evs = boom(o, chords[i])
        if (s === undefined) return evs
        return [evs[0], { at: 1, dur: 0.5, notes: [nt(s, 0, undefined, tuning)] }, { at: 1.5, dur: 0.5, notes: [nt(s, o.frets[s], 'h', tuning)] }, evs[2], evs[3]]
      }))
      add('bg-cross', '4. Crosspicking rolls', 'Crosspicking (Tony Rice\'s trademark) rolls across three strings in a 3-3-2 pattern while you hold the chord: it sounds like a banjo roll with a pick. The accents fall in odd places, which is what makes it lift.', ['Hold the chord. Pick the three strings in order (low, middle, high) three times, but the third group has only two notes: 3 + 3 + 2 = 8 eighths.', 'Use down-up-down picking across the strings, or down-down-up: whichever stays even.', 'Let every note ring into the next.'], 'Eight even notes per bar, every one ringing.', twice(i => {
        const o = opens[i]
        const ss = [2, 3, 4].map(s => (o.frets[s] >= 0 ? s : s + 1))
        const order = [0, 1, 2, 0, 1, 2, 0, 1]
        return order.map((k, j) => ({ at: j * 0.5, dur: 0.5, notes: [onS(o, ss[k])], ...(j === 0 ? { chord: chords[i] } : {}) }))
      }))
      add('bg-dstop', '5. Double-stops with open strings', 'Two notes together: a fretted note against the open string next to it, slid or hammered into. It\'s Billy Strings\' fiddle-like sound between chords.', ['Bass on 1, strum on 2.', 'On 3: two notes on the G and B strings (the chord\'s notes there), slid into from two frets below where you can.', 'Hold them through 4.'], 'Both notes ring together, clean.', twice(i => {
        const o = opens[i]
        const evs = boom(o, chords[i]).slice(0, 2)
        const g = o.frets[3], b = o.frets[4]
        if (g >= 2 && b >= 0) evs.push({ at: 2, dur: 0.5, notes: [nt(3, g - 2, undefined, tuning), nt(4, b, undefined, tuning)] }, { at: 2.5, dur: 1.5, notes: [nt(3, g, '/', tuning), nt(4, b, undefined, tuning)] })
        else evs.push({ at: 2, dur: 2, notes: [onS(o, 3), onS(o, 4)] })
        return evs
      }))
      add('bg-run', '6. The blue-3rd run', 'The bluegrass ending run: the minor 3rd hammered up to the major 3rd, then down through the 2nd to the root, on the bass strings. Flatt and Rice end almost every phrase with a run like this.', ['Bass on 1, strum on 2.', 'From the "and" of 2: the minor 3rd, hammer on to the major 3rd, then the 2nd, then the root on 4.', 'All on the low strings, near the chord shape.'], 'The hammer-on sounds, and the root lands on 4.', twice(i => {
        const o = opens[i]
        const R = tuning[o.rootS] + o.frets[o.rootS]
        const pts = [R + 3, R + 4, R + 2, R].map(lowSpot)
        const evs = boom(o, chords[i]).slice(0, 2)
        if (pts.some(p => !p)) return boom(o, chords[i])
        const [a, b, c, d] = pts as { string: number; fret: number }[]
        evs.push({ at: 2.5, dur: 0.25, notes: [nt(a.string, a.fret, undefined, tuning)] }, { at: 2.75, dur: 0.25, notes: [nt(b.string, b.fret, a.string === b.string ? 'h' : undefined, tuning)] }, { at: 3, dur: 0.5, notes: [nt(c.string, c.fret, undefined, tuning)] }, { at: 3.5, dur: 0.5, notes: [nt(d.string, d.fret, undefined, tuning)] })
        return evs
      }))
      mix('bg-mix', 1, 6)
      add('bg-yours', `${steps.length + 1}. Your own fills`, 'Boom-chuck on 1 and 2; the rest of the bar is yours: a walk-up, a hammer-on, a run.', ['Boom-chuck as written.', 'Beats 3 and 4: any fill you like.', 'Land on the next chord\'s bass note on 1. Play it In time.'], 'You land on the next bass note on 1 every time.', twice(i => boom(opens[i], chords[i]).slice(0, 2)), true)
    } else {
      // Chet Atkins: Travis picking
      const thumb = (o: Open, chord: string): Ev[] => [0, 1, 2, 3].map(b => ({ at: b, dur: 1, notes: [onS(o, b % 2 ? o.altS : o.rootS)], ...(b === 0 ? { chord } : {}) }))
      const top = (o: Open) => [5, 4, 3].find(s => o.frets[s] >= 0 && s > o.altS) ?? 5
      add('ca-thumb', '1. The thumb', 'Everything in Travis picking rests on the thumb: root on 1 and 3, the other bass string on 2 and 4, never stopping. Get this automatic first; the fingers come next.', ['Hold the chord. Thumb only: root, other string, root, other string.', 'Rest the side of your picking hand lightly on the low strings so the bass is a little muted and punchy.', 'Change chords without the thumb stopping.'], 'Four even bass notes per bar, never a gap at the chord change.', twice(i => thumb(opens[i], chords[i])))
      add('ca-pinch', '2. The pinch', 'Add the top note with your middle finger at the same time as the thumb on beat 1: a "pinch". Now there\'s a melody note on every bar.', ['Thumb as before.', 'On beat 1, pinch: the thumb\'s note and the top string together.', 'Everything else stays thumb-only.'], 'Both notes of the pinch sound together.', twice(i => { const o = opens[i]; const e = thumb(o, chords[i]); e[0] = { ...e[0], notes: [onS(o, o.rootS), onS(o, top(o))] }; return e }))
      add('ca-travis', '3. The Travis pattern', 'The full pattern: the thumb on every beat, and the fingers filling the "and"s with the chord\'s notes on the top strings. Two parts at once, like two guitarists.', ['Pinch on 1.', 'On each "and": the index on the G string, then the middle on the B (or top) string, alternating.', 'The thumb never changes: root, other, root, other.'], 'An even run of eight notes per bar, the bass steady under it.', twice(i => {
        const o = opens[i], t = top(o), mid = [3, 4].find(s => s !== t && o.frets[s] >= 0 && s > o.altS) ?? 3
        const e = thumb(o, chords[i])
        e[0] = { ...e[0], notes: [onS(o, o.rootS), onS(o, t)] }
        return [...e.map(x => ({ ...x, dur: 0.5 })), ...[0.5, 1.5, 2.5, 3.5].map((a, k) => ({ at: a, dur: 0.5, notes: [onS(o, k % 2 ? t : mid)] }))]
      }))
      add('ca-melody', '4. A melody over the thumb', 'Chet\'s trick: the top notes stop being the chord and start being a tune, stepping along the scale toward the next chord, while the thumb keeps going underneath.', ['Thumb on every beat, as always.', 'The fingers play the melody on the "and"s: it walks toward the next chord\'s top note.', 'If a melody note isn\'t in the chord shape, fret it with a free finger and keep the bass fingers down.'], 'The melody sounds like a tune, not a pattern.', twice(i => {
        const o = opens[i], nx = opens[(i + 1) % n]
        const tS = top(o), from = { string: tS, fret: o.frets[tS], midi: tuning[tS] + o.frets[tS], role: '', finger: 0 }
        const nS = top(nx), to = { string: nS, fret: nx.frets[nS], midi: tuning[nS] + nx.frets[nS], role: '', finger: 0 }
        const line = walkTo(from, to, 3, tonic, false, tuning).filter(p => p.string >= 3)
        const e = thumb(o, chords[i]).map(x => ({ ...x, dur: 0.5 }))
        e[0] = { ...e[0], notes: [onS(o, o.rootS), onS(o, tS)] }
        const mid = [3, 4].find(x => x !== tS && o.frets[x] >= 0 && x > o.altS) ?? 3
        return [...e, { at: 0.5, dur: 0.5, notes: [onS(o, mid)] }, ...[1.5, 2.5, 3.5].map((a, k) => ({ at: a, dur: 0.5, notes: [line[k] ? nt(line[k].string, line[k].fret, undefined, tuning) : onS(o, tS)] }))]
      }))
      add('ca-harm', '5. Harmonics', 'Chet loved bell-like harmonics: touch the string right over the 12th fret (don\'t press) and pick: the note rings an octave up, like a bell. Here they end each bar over the thumb.', ['Thumb and pinch on 1 and 2.', 'On 3 and 4: harmonics at the 12th fret on the G, B and e strings (touch, pick, lift).', 'Back to the chord on the next 1.'], 'The harmonics ring clearly, like bells.', twice(i => {
        const o = opens[i]
        const e = thumb(o, chords[i]).slice(0, 3)
        e[0] = { ...e[0], notes: [onS(o, o.rootS), onS(o, top(o))] }
        return [...e.slice(0, 2), { at: 2, dur: 0.5, notes: [onS(o, o.rootS), nt(3, 12, 'harm', tuning)] }, { at: 2.5, dur: 0.5, notes: [nt(4, 12, 'harm', tuning)] }, { at: 3, dur: 1, notes: [onS(o, o.altS), nt(5, 12, 'harm', tuning)] }]
      }))
      mix('ca-mix', 2, 5)
      add('ca-yours', `${steps.length + 1}. Your own melody over the thumb`, 'The thumb is written out; the top is yours. Make up a melody from the chord\'s notes and the scale, and keep the thumb going no matter what.', ['Thumb: root, other, root, other.', 'Fingers: anything on top, on the beats or the "and"s.', 'If the thumb stops, simplify the top.'], 'The thumb never stops.', twice(i => thumb(opens[i], chords[i])), true)
    }
    return { chords, steps }
  }

  if (w.style === 'spread') {
    const k = PCS[w.key] ?? 0
    // one spread voicing per chord, close to the last one (the 1–4 / 2–5 / 3–6 string sets)
    const sp: Spread[] = []
    chords.forEach((_, i) => {
      const root = pcOf(k + w.prog[i][0]), minor = w.prog[i][1]
      const all = spreadTriads(root, minor).filter(v => Math.min(...v.frets) >= 0 && Math.max(...v.frets) <= 12)
      const prev = sp[i - 1]
      const pick = prev ? all.reduce((a, b) => (dist(b, prev) < dist(a, prev) ? b : a)) : (all.find(v => v.strings[0] === 1 && Math.min(...v.frets) >= 1) ?? all[0])
      sp.push(pick)
    })
    function dist(a: Spread, b: Spread) { return a.frets.reduce((x, f, j) => x + Math.abs(f - b.frets[j]), 0) + (a.strings[0] === b.strings[0] ? 0 : 3) }
    const vn = (v: Spread, j: number, tech?: string) => nt(v.strings[j], v.frets[j], tech, tuning)
    const all3 = (v: Spread) => v.strings.map((_, j) => vn(v, j))
    const tenths = chords.map((_, i) => { const r = pcOf(k + w.prog[i][0]); return tenthOf(tuning[0] + pcOf(r - tuning[0]), w.prog[i][1], Math.min(...sp[i].frets))! })
    const pair = (t: NonNullable<ReturnType<typeof tenthOf>>, tech?: string) => [nt(t.lo.string, t.lo.fret, tech, tuning), nt(t.hi.string, t.hi.fret, tech, tuning)]
    add('sp-shape', '1. Spread triads', 'A spread (or "open") triad is the same three notes as a chord shape, but with the middle note moved up an octave, so a string is skipped and the chord spans more than an octave. It sounds big and open, like a piano chord, and leaves room around each note.', ['Play the three notes together: root on the lowest string, then a string skipped, then the 5th, then the 3rd on top (the order can vary by chord).', 'Mute the skipped string with the underside of the finger below it.', 'Pluck with pick and fingers, or thumb and two fingers: all three at once.'], 'All three notes ring, and the skipped string is silent.', twice(i => [{ at: 0, dur: 2, notes: all3(sp[i]), chord: chords[i] }, { at: 2, dur: 2, notes: all3(sp[i]) }]))
    add('sp-arp', '2. String-skipping arpeggios', 'Now pick the spread shape one note at a time: low, high, middle, high. Each jump crosses a string you don\'t play, which is what gives these arpeggios their wide, sparkling sound (Paul Gilbert, Plini, Mateus Asato) and what makes them a great picking workout.', ['Hold the shape. Pick in 8ths: low string, top string, middle string, top string, twice per bar.', 'Alternate picking (down-up) across the skipped string: keep the pick\'s movement small.', 'Let every note ring.'], 'Eight even notes per bar and no stray notes from the skipped strings.', twice(i => [0, 2, 1, 2, 0, 2, 1, 2].map((j, q) => ({ at: q * 0.5, dur: 0.5, notes: [vn(sp[i], j)], ...(q === 0 ? { chord: chords[i] } : {}) }))))
    add('sp-inv', '3. Spread shapes up the neck', 'Each chord has three spread shapes on the same strings, one above the other, as the notes take turns being on top. Climbing through them over one chord is a fill in itself: the chord stays, the melody on top moves.', ['Play the first shape on 1.', 'On 3, the next shape up the neck (same chord, a different note on top).', 'Then back down for the next chord.'], 'The top note moves while the chord stays the same.', twice(i => {
      const root = pcOf(k + w.prog[i][0])
      const same = spreadTriads(root, w.prog[i][1]).filter(v => v.strings.join() === sp[i].strings.join() && Math.min(...v.frets) > Math.min(...sp[i].frets))[0] ?? sp[i]
      return [{ at: 0, dur: 2, notes: all3(sp[i]), chord: chords[i] }, { at: 2, dur: 2, notes: all3(same) }]
    }))
    // diatonic 10ths up the key's scale: bass on the A string, the 3rd an octave up on the B string
    const scale10 = (): Ev[][] => {
      const bars: Ev[][] = []
      // the bass on the A string, or the low E when the key's root sits high on the A
      const bs = pcOf(k - tuning[1]) <= 5 ? 1 : 0, ts = bs + 3
      const startF = pcOf(k - tuning[bs])
      const degs = MAJOR.map(d => tuning[bs] + startF + d)
      const evs: Ev[] = []
      degs.concat([tuning[bs] + startF + 12]).forEach((m, q) => {
        // the diatonic 3rd above (two scale steps), an octave up
        const idx = MAJOR.indexOf(pcOf(m - k))
        const third = m + ((MAJOR[(idx + 2) % 7] - MAJOR[idx] + 12) % 12) + 12
        evs.push({ at: (q % 4), dur: 1, notes: [nt(bs, m - tuning[bs], undefined, tuning), nt(ts, third - tuning[ts], undefined, tuning)] })
        if (q % 4 === 3) { bars.push(evs.splice(0)) }
      })
      return bars
    }
    const tb = scale10()
    const degChord = (m: number) => { const d = pcOf(m - k); return NAMES[pcOf(m)] + ([2, 4, 9].includes(d) ? 'm' : d === 11 ? 'dim' : '') }
    add('sp-10scale', '4. 10ths up the scale', 'A 10th is a bass note and the note a 3rd above it, an octave higher (a 3rd plus an octave = a 10th), with two strings skipped between them. Moving them together along the scale (major and minor 10ths taking turns, the way the key decides) is the sound of a bass player and a singer moving in harmony: Tommy Emmanuel, soul ballads, "Blackbird".', ['Bass note on the A string (or the low E) with your thumb or middle finger, the 10th three strings up (the B, or the G); the strings in between stay silent (touch them with the fretting fingers).', 'Walk them up the key\'s scale together, one per beat.', 'Pluck both at once: thumb and a finger.'], 'Both notes together, the strings between them silent.', [0, 1].flatMap(() => tb.map(evs => bar(evs.map((e, j) => (j === 0 ? { ...e, chord: degChord(e.notes[0].midi) } : e))))))
    add('sp-10chords', '5. The progression in 10ths', 'Every chord can be played as just a 10th: its root low and its 3rd high. That\'s enough for your ear to hear the whole chord, and the two voices can glide from chord to chord. Here the 10ths walk into each change.', ['Play each chord\'s 10th on 1 and let it ring.', 'On 4, slide both notes into the next chord\'s 10th from a fret below (or step into it).', 'Keep the strings between them muted.'], 'Both voices land together on 1.', twice(i => {
      const t = tenths[i], nx = tenths[(i + 1) % n]
      const evs: Ev[] = [{ at: 0, dur: 3, notes: pair(t), chord: chords[i] }]
      if (nx.lo.fret >= 1 && nx.hi.fret >= 1) evs.push({ at: 3, dur: 1, notes: [nt(nx.lo.string, nx.lo.fret - 1, undefined, tuning), nt(nx.hi.string, nx.hi.fret - 1, undefined, tuning)] })
      return evs
    }))
    add('sp-fill', '6. Spread chord, 10ths fill', 'Put it together: the spread triad on the beat, then a two-voice fill in 10ths walking into the next chord. It sounds like a piano player\'s left and right hands.', ['Spread triad on 1, again on 2.', 'On 3 and 4: two 10ths walking toward the next chord.', 'Land on the next spread shape on 1.'], 'The 10ths are clean pairs and the next chord lands on 1.', twice(i => {
      const t = tenths[i]
      const step = (d: number) => { const lo = { string: t.lo.string, fret: t.lo.fret + d }; const m = tuning[lo.string] + lo.fret; const idx = MAJOR.indexOf(pcOf(m - k)); if (idx < 0 || lo.fret < 0) return null; const third = m + ((MAJOR[(idx + 2) % 7] - MAJOR[idx] + 12) % 12) + 12; return [nt(lo.string, lo.fret, undefined, tuning), nt(t.hi.string, third - tuning[t.hi.string], undefined, tuning)] }
      const nx = tenths[(i + 1) % n]
      const up = nx.lo.fret >= t.lo.fret
      const ds = [1, 2, 3, 4, 5].filter(d => step(up ? d : -d)).slice(0, 2)
      const evs: Ev[] = [{ at: 0, dur: 1, notes: all3(sp[i]), chord: chords[i] }, { at: 1, dur: 1, notes: all3(sp[i]) }]
      ds.forEach((d, q) => { const p = step(up ? d : -d); if (p && p.every(x => x.fret >= 0 && x.fret <= 17)) evs.push({ at: 2 + q, dur: 1, notes: p }) })
      return evs
    }))
    mix('sp-mix', 0, 6, 'sp-10scale')
    add('sp-yours', `${steps.length + 1}. Your own`, 'The spread shape on 1 and 2 is written; beats 3 and 4 are yours: a string-skipping arpeggio, a 10ths walk, or the next shape up the neck.', ['Spread triad on 1 and 2.', 'Anything on 3 and 4.', 'Land on the next chord on 1. Play it In time.'], 'You land on the next chord on 1.', twice(i => [{ at: 0, dur: 1, notes: all3(sp[i]), chord: chords[i] }, { at: 1, dur: 1, notes: all3(sp[i]) }]), true)
    return { chords, steps }
  }

  if (w.style === 'plini') {
    // add9 shapes: the root on the low E (or A) string, its 5th and 9th on the next strings, the open B and e ringing when they're in the key
    const shapes = chords.map((sym, i) => {
      const root = pcOf((PCS[w.key] ?? 4) + w.prog[i][0])
      const fE = pcOf(root - tuning[0]), fA = pcOf(root - tuning[1])
      const s = fE <= 7 ? 0 : 1, f = s === 0 ? fE : fA
      const notes = [nt(s, f, undefined, tuning), nt(s + 1, f + 2, undefined, tuning), nt(s + 2, f + 4, undefined, tuning)]
      // minor: root, 5th, 9th still (the 9th suits minor too); the open B and e when they're in the key
      for (const os of [4, 5]) if (MAJOR.includes(pcOf(tuning[os] - (PCS[w.key] ?? 4)))) notes.push(nt(os, 0, undefined, tuning))
      return { sym, notes }
    })
    const ring = (i: number, order: number[], at0 = 0, step = 0.5): Ev[] => order.map((k, j) => ({ at: at0 + j * step, dur: step, notes: [shapes[i].notes[Math.min(k, shapes[i].notes.length - 1)]], ...(j === 0 && at0 === 0 ? { chord: chords[i] } : {}) }))
    add('pl-ring', '1. Ringing add9 shapes', 'Plini\'s chords are wide shapes: the root low, its 5th and the 9th above it, and open strings ringing on top. Picked one note at a time and left to ring, they sound like a shimmering pad.', ['Fret the three low notes (root, 5th, 9th), and leave the B and high e strings open.', 'Pick them one at a time, low to high and back, in 8ths.', 'Let everything ring: no muting.'], 'Every note keeps ringing under the next one.', twice(i => ring(i, [0, 1, 2, 3, 4, 3, 2, 1])))
    add('pl-strum', '2. The shape on the beat, then a shimmer', 'Strum the whole shape on 1, then pick the top open strings in a quick shimmer. The open strings stay the same over every chord, so they tie the progression together.', ['Strum all the notes on 1.', 'On 2-and-3-and pick the open B and e strings, alternating.', 'Strum again on 4.'], 'The open strings ring over the chord change.', twice(i => { const sh = shapes[i]; const tops = sh.notes.slice(3); return [{ at: 0, dur: 1.5, notes: sh.notes, chord: chords[i] }, ...[1.5, 2, 2.5, 3].map((a, k) => ({ at: a, dur: 0.5, notes: [tops[k % Math.max(1, tops.length)] ?? sh.notes[2]] })), { at: 3.5, dur: 0.5, notes: sh.notes }] }))
    add('pl-legato', '3. Legato fills', 'Three notes on one string with one pick (pick, hammer, hammer, or pull, pull): smooth and singing, the way Plini\'s fills flow between his chords.', ['Pick the shape on 1 and 2.', 'On 3: a three-note legato fill on the G or D string: pick the first, hammer or pull the rest.', 'Land on the next shape on 1.'], 'All three legato notes are the same volume.', twice(i => {
      const sh = shapes[i], nx = shapes[(i + 1) % n]
      const s = Math.min(3, sh.notes[2].string + 1)
      const base = sh.notes[2].fret
      const frets = [] as number[]
      for (let f = base - 3; f <= base + 5 && frets.length < 3; f++) if (f >= 0 && MAJOR.includes(pcOf(tuning[s] + f - (PCS[w.key] ?? 4)))) frets.push(f)
      const dirDown = nx.notes[0].fret < sh.notes[0].fret
      const fs = dirDown ? [...frets].reverse() : frets
      return [...ring(i, [0, 1, 2, 3], 0, 0.5), ...fs.map((f, k) => ({ at: 2.5 + k * 0.5, dur: 0.5, notes: [nt(s, f, k ? (dirDown ? 'p' : 'h') : undefined, tuning)] }))]
    }))
    add('pl-harm', '4. Harmonics over the shape', 'Natural harmonics at the 12th and 7th frets on the open strings: glassy notes that float over the chord. Plini sprinkles them at the ends of phrases.', ['Pick the shape on 1 and 2.', 'On 3 and 4: harmonics at the 12th fret on the G and B strings, then the 7th fret on the e.', 'Touch, pick, lift.'], 'The harmonics ring clearly over the chord.', twice(i => [...ring(i, [0, 1, 2, 3], 0, 0.5), { at: 2, dur: 0.5, notes: [nt(3, 12, 'harm', tuning)] }, { at: 2.5, dur: 0.5, notes: [nt(4, 12, 'harm', tuning)] }, { at: 3, dur: 1, notes: [nt(5, 7, 'harm', tuning)] }]))
    mix('pl-mix', 0, 4)
    add('pl-yours', `${steps.length + 1}. Your own fills`, 'The shape rings on 1 and 2; beats 3 and 4 are yours for a legato fill, harmonics or a melody on the open strings.', ['Ring the shape on 1 and 2.', 'Beats 3 and 4: anything.', 'Land on the next shape on 1. Play it In time.'], 'You land on the next shape on 1.', twice(i => ring(i, [0, 1, 2, 3], 0, 0.5)), true)
    return { chords, steps }
  }

  // Matteo Mancuso: fingerstyle fusion over shells, with the root in the bass
  const shells = shellPath(chords, tuning)
  const bassOf = (sh: Shell) => {
    const r = sh.root
    for (const s of [0, 1]) { for (let f = 0; f <= 9; f++) if (pcOf(tuning[s] + f) === r && Math.abs(f - sh.lo) <= 5) return nt(s, f, undefined, tuning) }
    return nt(1, pcOf(r - tuning[1]), undefined, tuning)
  }
  const pinch = (i: number, at0: number, dur: number, chord = true): Ev => ({ at: at0, dur, notes: [bassOf(shells[i]), ...shells[i].notes.map(x => nt(x.string, x.fret, undefined, tuning))], ...(chord && at0 === 0 ? { chord: chords[i] } : {}) })
  const topOf = (i: number) => shells[i % n].notes[2]
  /** a note half a step below a target on the same string (or the one below) */
  const below = (t: { string: number; fret: number }) => (t.fret >= 1 ? { string: t.string, fret: t.fret - 1 } : { string: t.string - 1, fret: tuning[t.string] - 1 - tuning[t.string - 1] })
  const above = (t: { string: number; fret: number; midi: number }) => {
    // the key note above the target
    for (let m = t.midi + 1; m <= t.midi + 2; m++) if (MAJOR.includes(pcOf(m - tonic))) return { string: t.string, fret: t.fret + (m - t.midi) }
    return { string: t.string, fret: t.fret + 2 }
  }
  add('mc-pinch', '1. Bass and chord together', 'The foundation of his fingerstyle: the thumb plays the root low while the fingers play the chord shape on top, together, like a pianist\'s two hands. Then the thumb walks on alone.', ['Thumb on the root, fingers on the three top strings, all at once on 1.', 'Thumb alone on 3.', 'Pluck with the fingers (no pick).'], 'All four notes sound together on 1.', twice(i => [pinch(i, 0, 2), { at: 2, dur: 1, notes: [bassOf(shells[i])] }, { at: 3, dur: 1, notes: shells[i].notes.map(x => nt(x.string, x.fret, undefined, tuning)) }]))
  add('mc-chrom', '2. Chromatic approach notes', 'Fusion players reach a target from a half step below: a note outside the key that slides the ear into the right one. Here the next chord\'s top note gets approached that way on the last 16th.', ['Bass and chord on 1.', 'On 4: a key note, then the note one fret below the next chord\'s top note.', 'Land on the next chord (and its top note) on 1.'], 'The approach note is quick and leads straight into the next chord.', twice(i => {
    const t = topOf(i + 1), b = below(t)
    // a note of this chord first (not the approach note itself)
    const own = shells[i].notes.slice().reverse().find(x => !(x.string === b.string && x.fret === b.fret)) ?? shells[i].notes[1]
    return [pinch(i, 0, 2), { at: 2, dur: 1, notes: [bassOf(shells[i])] }, { at: 3, dur: 0.5, notes: [nt(own.string, own.fret, undefined, tuning)] }, { at: 3.5, dur: 0.5, notes: [nt(b.string, Math.max(0, b.fret), undefined, tuning)] }]
  }))
  add('mc-encl', '3. Enclosures', 'An enclosure surrounds the target: the scale note above it, the chromatic note below it, then the target. It\'s the sound of jazz and fusion lines, and it makes any landing note sound deliberate.', ['Bass and chord on 1.', 'On 3-and-4: the note above the next chord\'s top note, the note a fret below it, then a beat\'s rest.', 'The target arrives on 1 with the next chord.'], 'Above, below, then right on the target on 1.', twice(i => {
    const t = topOf(i + 1), a = above(t), b = below(t)
    return [pinch(i, 0, 2), { at: 2, dur: 1, notes: [bassOf(shells[i])] }, { at: 3, dur: 0.5, notes: [nt(a.string, a.fret, undefined, tuning)] }, { at: 3.5, dur: 0.5, notes: [nt(b.string, Math.max(0, b.fret), undefined, tuning)] }]
  }))
  add('mc-legato', '4. Legato runs', 'Fast, smooth lines, hammered and pulled so only the first note of each string is plucked: his lines sound like a horn. Four 16ths into the next chord.', ['Bass and chord on 1, bass on 3.', 'On 4: four 16th notes from the major scale, hammering and pulling on each string.', 'Land on the next chord on 1.'], 'Even 16ths, as loud hammered as picked.', twice((i, pass) => {
    const line = walkTo(shells[i].notes[pass ? 1 : 2], topOf(i + 1), 4, tonic, false, tuning)
    const notes = line.map((p, k) => { const q = line[k - 1]; return nt(p.string, p.fret, q && q.string === p.string && q.fret !== p.fret && Math.abs(q.fret - p.fret) <= 3 ? (p.fret > q.fret ? 'h' : 'p') : undefined, tuning) })
    return [pinch(i, 0, 2), { at: 2, dur: 1, notes: [bassOf(shells[i])] }, ...notes.map((nn, k) => ({ at: 3 + k * 0.25, dur: 0.25, notes: [nn] }))]
  }))
  add('mc-indep', '5. Bass and melody apart', 'The thumb keeps the bass on the beats while the fingers play the melody between them, on the "and"s: two independent parts, the core of his style.', ['Thumb: root on 1, 2, 3 and 4.', 'Fingers: the chord\'s top notes on every "and", walking toward the next chord.', 'Keep the thumb steady whatever the fingers do.'], 'The bass stays on the beat under the melody.', twice(i => {
    const line = walkTo(shells[i].notes[2], topOf(i + 1), 4, tonic, true, tuning)
    const bs = bassOf(shells[i])
    return [{ ...pinch(i, 0, 0.5) }, ...[1, 2, 3].map(b => ({ at: b, dur: 0.5, notes: [bs] })), ...line.map((p, k) => ({ at: 0.5 + k, dur: 0.5, notes: [nt(p.string, p.fret, undefined, tuning)] }))]
  }))
  mix('mc-mix', 1, 5)
  add('mc-yours', `${steps.length + 1}. Your own lines`, 'Bass and chord on 1 and the bass on 3 are written; the rest is yours: approach notes, enclosures, legato runs.', ['Bass and chord on 1, bass on 3.', 'Anything in between, landing on the next chord\'s top note on 1.', 'Play it In time.'], 'You land on the next chord on 1.', twice(i => [pinch(i, 0, 2), { at: 2, dur: 2, notes: [bassOf(shells[i])] }]), true)
  return { chords, steps }
}

/** A longer part in the style: a bar from each kind of move, picked fresh from a seed and ending at home. */
export function style2Part(w: Style2In, bars: number, seed: number): Song {
  const ws = style2Workshop(w)
  const r = rnd(seed * 31 + 7)
  const moves = ws.steps.filter(s => !/mix|yours/.test(s.id))
  const n = ws.chords.length
  const out: SongBar[] = []
  for (let b = 0; b < bars; b++) {
    const i = b % n
    const last = b === bars - 1
    const st = last ? moves[0] : moves[Math.floor(r() * moves.length)]
    const bs = st.song.tracks[0].bars
    // the same chord's bar from that move (first or second time round)
    out.push(bs[(last ? 0 : i) + (r() < 0.5 ? 0 : n)] ?? bs[i])
  }
  const S = STYLE2[w.style]
  return { title: `${w.title ?? `${S.label} fills`}: a ${bars}-bar part`, tempo: w.bpm, backing: { groove: S.groove, bass: S.bass }, tracks: [{ name: 'Guitar', tuning, capo: 0, bars: out, program: S.program }] }
}

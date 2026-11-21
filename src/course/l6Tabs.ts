// Level 6 (chord tones, melody and soloing): tabs for every lesson, worked out for any tuning. Lines are written as
// pitches (in C, or A for the blues ones) and placed on the neck by the hand brain (fingerMelody) inside a position
// window, so they read like a guitarist would play them. The lesson's Key menu moves them with transposeSong.
import type { Song, SongBar, SongStep } from '../tabs/model'
import { fingerMelody } from '../tabs/fingering'
import { shapesOf } from './cagedTabs'
import { pairOf } from './l4bTabs'

type N = { string: number; fret: number; midi: number }
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
const mod = (n: number) => ((n % 12) + 12) % 12
const st = (notes: N[], dur: number, chord?: string, tech?: string): SongStep => ({ notes: notes.map(n => ({ ...n, ...(tech ? { tech } : {}) })), dur, ...(chord ? { chord } : {}) })
const song = (title: string, tuning: number[], bars: SongBar[], tempo: number): Song => ({ title, tempo, tracks: [{ name: 'Lesson', tuning, capo: 0, bars, program: 27 }] })
function bars(steps: SongStep[]): SongBar[] {
  const out: SongBar[] = []
  let cur: SongStep[] = [], len = 0
  for (const s of steps) {
    if (len + s.dur > 4 + 1e-6) { if (len < 4) cur.push({ notes: [], dur: 4 - len }); out.push({ steps: cur }); cur = []; len = 0 }
    cur.push(s); len += s.dur
    if (Math.abs(len - 4) < 1e-6) { out.push({ steps: cur }); cur = []; len = 0 }
  }
  if (cur.length) { if (len < 4) cur.push({ notes: [], dur: 4 - len }); out.push({ steps: cur }) }
  return out
}

/** Every note whose pitch class is in `pcs` inside frets lo–hi, each pitch once (on the lowest string that has it,
 *  max three per string), low to high: an arpeggio or scale "in position". */
export function inWindow(tuning: number[], pcs: number[], lo: number, hi: number): N[] {
  const by = new Map<number, N>()
  tuning.forEach((open, s) => {
    for (let f = Math.max(0, lo); f <= Math.min(15, hi); f++) {
      const m = open + f
      if (!pcs.includes(mod(m))) continue
      const have = by.get(m)
      if (!have || have.string > s) by.set(m, { string: s, fret: f, midi: m })
    }
  })
  return [...by.values()].sort((a, b) => a.midi - b.midi)
}

/** A written line moved by octaves until the instrument can play all of it. */
function fit(midis: (number | null)[], tuning: number[]): (number | null)[] {
  const ns = midis.filter((m): m is number => m !== null)
  if (!ns.length) return midis
  const low = Math.min(...tuning), high = Math.max(...tuning) + 15
  let k = 0
  while (Math.min(...ns) + k < low) k += 12
  while (Math.max(...ns) + k > high && Math.min(...ns) + k - 12 >= low) k -= 12
  return midis.map(m => (m === null ? null : m + k))
}
/** Place a line, preferring frets lo–hi (guitar) and the hand brain's choice elsewhere. */
function place(tuning: number[], midis: (number | null)[], lo?: number, hi?: number): (N | null)[] {
  const line = fit(midis, tuning)
  const guitar = tuning.length === 6 && tuning[0] === 40
  if (guitar && lo !== undefined && hi !== undefined) {
    const inPos = fingerMelody(line, tuning, { minFret: lo, maxFret: hi })
    if (inPos.every((p, i) => p || line[i] === null)) return inPos
  }
  return fingerMelody(line, tuning)
}
type Ev = [number | null, number, string?, string?]   // pitch (null = rest), beats, chord name, technique
function lineSong(tuning: number[], title: string, evs: Ev[], tempo: number, lo?: number, hi?: number): Song {
  const placed = place(tuning, evs.map(e => e[0]), lo, hi)
  const steps = evs.map(([m, d, ch, tech], i) => st(m === null || !placed[i] ? [] : [placed[i]!], d, ch, tech))
  return song(title, tuning, bars(steps), tempo)
}

// ---- 1 · Arpeggios in the five CAGED shapes ----
/** The triad's notes inside each CAGED shape of the chord (its frets and one below), up and back, shape by shape. */
export function cagedArpTab(tuning: number[], root = 0, minor = false): Song {
  const pcs = [0, minor ? 3 : 4, 7].map(i => mod(root + i))
  const name = NAMES[mod(root)] + (minor ? 'm' : '')
  const steps: SongStep[] = []
  const shapes = shapesOf(root, minor, tuning).sort((a, b) => a.lo - b.lo)
  for (const sh of shapes) {
    const ns = inWindow(tuning, pcs, Math.max(0, sh.lo - 1), sh.hi)
    if (ns.length < 3) continue
    const up = [...ns, ...ns.slice(0, -1).reverse()]
    up.forEach((n, i) => steps.push(st([n], 0.5, i === 0 ? `${name} (${sh.letter} shape)` : undefined)))
    if (up.length % 8) steps.push(st([], (8 - (up.length % 8)) * 0.5))
  }
  return song(`${name} arpeggio in all five CAGED shapes, up and back`, tuning, bars(steps), 80)
}

// ---- 2 · Seventh arpeggios in one position ----
const Q7: Record<string, number[]> = { maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], m7b5: [0, 3, 6, 10] }
const KEY7: [number, string][] = [[0, 'maj7'], [2, 'm7'], [4, 'm7'], [5, 'maj7'], [7, '7'], [9, 'm7'], [11, 'm7b5']]
const nm7 = (r: number, q: string) => NAMES[mod(r)] + (q === 'm7b5' ? 'm7♭5' : q)
/** The position for the key of C on guitar: the E-shape C chord at the 8th fret, frets 7–10 (others: the hand brain). */
function homeWindow(tuning: number[], key: number): [number, number] {
  const e = shapesOf(key, false, tuning).find(s => s.letter === 'E') ?? shapesOf(key, false, tuning)[0]
  return e ? [Math.max(0, e.lo - 1), Math.min(15, e.hi + 1)] : [5, 9]
}
/** The seven 7th arpeggios of the key, all in one position: the hand stays, the chord changes. */
export function arp7PositionTab(tuning: number[], key = 0): Song {
  const [lo, hi] = homeWindow(tuning, key)
  const steps: SongStep[] = []
  for (const [d, q] of KEY7) {
    const r = mod(key + d)
    const ns = inWindow(tuning, Q7[q].map(i => mod(r + i)), lo, hi)
    const seq = [...ns, ...ns.slice(0, -1).reverse()]
    seq.forEach((n, i) => steps.push(st([n], 0.5, i === 0 ? nm7(r, q) : undefined)))
    if (seq.length % 8) steps.push(st([], (8 - (seq.length % 8)) * 0.5))
  }
  return song(`The seven 7th arpeggios of ${NAMES[mod(key)]} major in one position`, tuning, bars(steps), 76)
}
/** ii – V – I – vi as a continuous line of 7th-chord tones: each bar starts on the chord tone nearest the last note. */
export function arp7ChangesTab(tuning: number[], key = 0): Song {
  const [lo, hi] = homeWindow(tuning, key)
  const prog: [number, string][] = [[2, 'm7'], [7, '7'], [0, 'maj7'], [9, 'm7']]
  const steps: SongStep[] = []
  let last: number | null = null
  for (let pass = 0; pass < 2; pass++) for (const [d, q] of prog) {
    const r = mod(key + d)
    const ns = inWindow(tuning, Q7[q].map(i => mod(r + i)), lo, hi)
    if (!ns.length) continue
    let i = last === null ? 0 : ns.reduce((b, n, k) => (Math.abs(n.midi - last!) < Math.abs(ns[b].midi - last!) ? k : b), 0)
    let dir = i > ns.length / 2 ? -1 : 1
    for (let k = 0; k < 8; k++) {
      steps.push(st([ns[i]], 0.5, k === 0 ? nm7(r, q) : undefined))
      if (i + dir < 0 || i + dir >= ns.length) dir = -dir
      i += dir
    }
    last = steps[steps.length - 1].notes[0]?.midi ?? last
  }
  return song(`ii – V – I – vi in ${NAMES[mod(key)]}: 7th arpeggios as one line`, tuning, bars(steps), 80)
}

// ---- 3 · Targeting chord tones on the changes ----
/** Dm7 – G7 – Cmaj7: land on the 3rd of each chord on beat 1. First in quarters, then in eighths with the 3rds
 *  approached by step. Written in C, frets 5–10 on guitar. */
export const targetsTab = (t: number[]) => lineSong(t, 'Target the 3rds: Dm7 – G7 – Cmaj7, landing on F, B and E', [
  [65, 1, 'Dm7'], [69, 1], [74, 1], [72, 1],
  [71, 1, 'G7'], [74, 1], [67, 1], [65, 1],
  [64, 1, 'Cmaj7'], [67, 1], [71, 1], [72, 1],
  [76, 4],
  [65, 0.5, 'Dm7'], [67, 0.5], [69, 0.5], [72, 0.5], [74, 0.5], [76, 0.5], [74, 0.5], [72, 0.5],
  [71, 0.5, 'G7'], [69, 0.5], [67, 0.5], [71, 0.5], [74, 0.5], [72, 0.5], [69, 0.5], [65, 0.5],
  [64, 0.5, 'Cmaj7'], [67, 0.5], [71, 0.5], [72, 0.5], [76, 0.5], [74, 0.5], [72, 0.5], [71, 0.5],
  [72, 4],
], 72, 7, 12)

/** The minor-key version: Bm7♭5 – E7 – Am7, landing on D, G♯ and C. */
export const targetsMinorTab = (t: number[]) => lineSong(t, 'Target the 3rds in A minor: Bm7♭5 – E7 – Am7, landing on D, G♯ and C', [
  [74, 1, 'Bm7♭5'], [71, 1], [69, 1], [65, 1],
  [68, 1, 'E7'], [71, 1], [74, 1], [73, 1],
  [72, 1, 'Am7'], [76, 1], [74, 1], [71, 1],
  [72, 4],
], 72, 7, 12)

// ---- 4 · Mixing major and minor pentatonic (A7) ----
export const mixPentTab = (t: number[]) => lineSong(t, 'Major and minor pentatonic over A7, then mixed (the C slides up to C♯)', [
  [57, 0.5, 'A7 (major pent)'], [59, 0.5], [61, 0.5], [64, 0.5], [66, 0.5], [64, 0.5], [61, 0.5], [59, 0.5],
  [57, 0.5, 'A7 (minor pent)'], [60, 0.5], [62, 0.5], [64, 0.5], [67, 0.5], [64, 0.5], [62, 0.5], [60, 0.5],
  [62, 0.5, 'D7'], [66, 0.5], [69, 0.5], [72, 0.5], [69, 0.5], [66, 0.5], [62, 0.5], [60, 0.5],
  [60, 0.5, 'A7 (mixed)'], [61, 0.5, undefined, '/'], [64, 0.5], [67, 0.5], [66, 0.5], [64, 0.5], [61, 0.5], [57, 0.5],
  [69, 0.5, 'E7'], [68, 0.5], [64, 0.5], [62, 0.5], [59, 0.5], [62, 0.5], [64, 0.5], [68, 0.5],
  [67, 0.5, 'D7'], [66, 0.5], [62, 0.5], [60, 0.5], [57, 0.5], [60, 0.5], [60, 0.5], [61, 0.5, undefined, 'h'],
  [57, 4, 'A7'],
], 84, 4, 9)

// ---- 5 · Passing, approach and chromatic notes ----
/** C – Am – Dm – G7 – C: chromatic passing notes and approaches into the chord tone on each beat 1
 *  (B→C from below, F♯→F from above, C–B♭ enclosing B, D♯→E). Frets 8–13 on guitar. */
export const approachTab = (t: number[]) => lineSong(t, 'Approach notes: every chord tone on beat 1 reached from a half step away', [
  [64, 0.5, 'C'], [67, 0.5], [72, 0.5], [76, 0.5], [74, 0.5], [73, 0.5], [72, 0.5], [71, 0.5],
  [72, 0.5, 'Am'], [76, 0.5], [74, 0.5], [72, 0.5], [71, 0.5], [69, 0.5], [67, 0.5], [66, 0.5],
  [65, 0.5, 'Dm'], [69, 0.5], [72, 0.5], [74, 0.5], [77, 0.5], [74, 0.5], [72, 0.5], [70, 0.5],
  [71, 0.5, 'G7'], [74, 0.5], [77, 0.5], [74, 0.5], [72, 0.5], [71, 0.5], [72, 0.5], [75, 0.5],
  [76, 4, 'C'],
], 76, 8, 13)

// ---- 6 · Phrasing: motif, space, call and response, tension and release ----
export const phrasingTab = (t: number[]) => lineSong(t, 'A motif and its answers over Am7 – D7: say it, leave space, answer it, build, release', [
  [69, 1, 'Am7 (call)'], [72, 0.5], [74, 0.5], [76, 2],
  [null, 4, 'D7 (space)'],
  [69, 1, 'Am7 (call again, new ending)'], [72, 0.5], [74, 0.5], [79, 2],
  [76, 0.5, 'D7 (answer)'], [74, 0.5], [72, 1], [69, 2],
  [72, 1, 'Am7 (up a step: tension)'], [74, 0.5], [76, 0.5], [79, 2],
  [76, 1, 'D7 (higher)'], [79, 0.5], [81, 0.5], [84, 2],
  [83, 2, 'Am7 (hold the 9th)'], [81, 1], [79, 1],
  [76, 0.5, 'D7 (release)'], [74, 0.5], [72, 1], [69, 2],
], 80, 4, 10)

// ---- 7 · Double stops and 6ths as lead (soul) ----
/** Soul double stops over C – F: 6ths on the G and high E strings slid into from a fret below, then 3rds on G and B
 *  with the hammer-on from the 2 (or 4) to the 3: the vocabulary of soul and blues-rock rhythm-lead playing. */
export function soulStopsTab(tuning: number[]): Song {
  const [g, e] = pairOf(tuning, 'GE')
  const [g2, b] = pairOf(tuning, 'GB')
  const at = (s: number, m: number): N | null => { let x = m; while (x - tuning[s] > 15) x -= 12; while (x - tuning[s] < 0) x += 12; return { string: s, fret: x - tuning[s], midi: x } }
  const dy = (s1: number, m1: number, s2: number, m2: number) => [at(s1, m1), at(s2, m2)].filter((n): n is N => !!n)
  const steps: SongStep[] = []
  // 6ths: (lower on G, upper on E). Over C: G/E (the chord's 5th and 3rd) slid into from a fret below, A/F, back,
  // then down the scale to E/C and D/B and back to E/C. Over F: A/F slid into, F/D, E/C as a passing step.
  const six = (pairs: [number, number][], chord: string, slideAt: number[]) => pairs.forEach(([l, u], i) =>
    steps.push(st(dy(g, l, e, u), slideAt.includes(i) ? 1 : 0.5, i === 0 ? chord : undefined, slideAt.includes(i) ? '/' : undefined)))
  six([[66, 75], [67, 76], [69, 77], [67, 76], [64, 72], [62, 71], [64, 72]], 'C', [1])
  steps.push(st([], 0.5))
  six([[68, 76], [69, 77], [65, 74], [69, 77], [65, 74], [64, 72], [65, 74]], 'F', [1])
  steps.push(st([], 0.5))
  // 3rds on G and B: the 2 hammered to the 3 (C: C over D → E · F: F over G → A · G: G over A → B), then back
  for (const [ch, low, two, three] of [['C', 60, 62, 64], ['F', 65, 67, 69], ['C', 60, 62, 64], ['G', 67, 69, 71]] as [string, number, number, number][]) {
    steps.push(st(dy(g2, low, b, two), 0.5, ch))
    steps.push(st(dy(g2, low, b, three), 1.5, undefined, 'h'))
    steps.push(st(dy(g2, low, b, two), 0.5, undefined, 'p'))
    steps.push(st(dy(g2, low, b, three), 1.5, undefined, 'h'))
  }
  return song('Soul double stops: sliding 6ths over C – F, then 3rds with a hammer-on', tuning, bars(steps), 72)
}

// ---- 8 · Playing what you hear ----
/** Short phrases in C, each followed by an empty bar: play it, then sing it back in the gap, then play your own answer. */
export const hearPlayTab = (t: number[]) => lineSong(t, 'Hear it, sing it, play it: four short phrases with a bar of space after each', [
  [60, 1, 'C'], [62, 1], [64, 2], [null, 4],
  [64, 1, 'Am'], [67, 1], [69, 1], [67, 1], [null, 4],
  [69, 0.5, 'F'], [67, 0.5], [65, 1], [64, 1], [62, 1], [null, 4],
  [67, 1, 'G'], [71, 0.5], [74, 0.5], [72, 2], [null, 4],
], 72, 0, 5)

export const L6_TABS = { cagedArpTab, arp7PositionTab, arp7ChangesTab, targetsTab, targetsMinorTab, mixPentTab, approachTab, phrasingTab, soulStopsTab, hearPlayTab }

// ---- neck pictures ----
type Mark = { s: number; f: number; label: string; role: 'root' | 'chord' | 'scale' | 'target' | 'next' }
const IV_LABEL: Record<number, string> = { 0: 'R', 1: '♭9', 2: '9', 3: '♭3', 4: '3', 5: '4', 6: '♭5', 7: '5', 8: '♯5', 9: '6', 10: '♭7', 11: '7' }
/** A chord's tones (intervals from the root) in the key's home position (the E-shape window on guitar), labelled by
 *  degree; `targets` (intervals) are shown as targets (the 3rd and 7th, say). */
export function positionMarks(tuning: number[], key: number, root: number, ivs: number[], targets: number[] = []): Mark[] {
  const [lo, hi] = homeWindow(tuning, key)
  return inWindow(tuning, ivs.map(i => mod(root + i)), lo, hi).map(n => {
    const iv = mod(n.midi - root)
    return { s: n.string, f: n.fret, label: IV_LABEL[iv], role: iv === 0 ? 'root' : targets.includes(iv) ? 'target' : 'chord' }
  })
}
/** A pentatonic (or any scale) in one window, labelled by degree from `root`, with `targets` highlighted. */
export function scaleMarks(tuning: number[], root: number, ivs: number[], lo: number, hi: number, targets: number[] = []): Mark[] {
  const guitar = tuning.length === 6 && tuning[0] === 40
  const [a, b] = guitar ? [lo, hi] : homeWindow(tuning, root)
  return inWindow(tuning, ivs.map(i => mod(root + i)), a, b).map(n => {
    const iv = mod(n.midi - root)
    return { s: n.string, f: n.fret, label: IV_LABEL[iv], role: iv === 0 ? 'root' : targets.includes(iv) ? 'target' : 'scale' }
  })
}

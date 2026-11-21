// Level 4 lessons 4–8: tabs and neck pictures for the major scale on the CAGED map, triads on every string set
// (close and spread), 3rds / 6ths / double stops, and sixteenth-note rhythm. Worked out for any tuning (guitar, tenor
// ukulele, baritone); a string set the instrument doesn't have falls back to the nearest one it does.
import type { Song, SongBar, SongStep } from '../tabs/model'
import { shapesOf, shapeNotes } from './cagedTabs'
import type { CagedShape } from '../learn/caged'

const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
export const MAJOR = [0, 2, 4, 5, 7, 9, 11]
type N = { string: number; fret: number; midi: number }
const st = (notes: N[], dur: number, chord?: string, tech?: string, stroke?: 'down' | 'up'): SongStep => ({ notes: notes.map(n => ({ ...n, ...(tech ? { tech } : {}) })), dur, ...(chord ? { chord } : {}), ...(stroke ? { stroke } : {}) })
const song = (title: string, tuning: number[], bars: SongBar[], tempo: number): Song => ({ title, tempo, tracks: [{ name: 'Lesson', tuning, capo: 0, bars, program: 25 }] })
/** cut a stream of steps into 4/4 bars (steps here never cross a bar line) */
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
const DEG = ['1', '2', '3', '4', '5', '6', '7']

// ---- 1 · The major scale in the five CAGED positions -----------------------------------------------------------------
/** The major scale inside one CAGED shape: every pitch once, on the lowest string that has it in the shape's window
 *  (the chord shape's frets and one below: C 0–3, A 2–5, G 4–8, E 7–10, D 9–13 for C), so each string holds two or
 *  three notes. Low to high. */
export function majorPosition(tuning: number[], key: number, sh: CagedShape): N[] {
  const lo = Math.max(0, sh.lo - 1), hi = Math.min(15, sh.hi)
  const pcs = MAJOR.map(s => (key + s) % 12)
  const byPitch = new Map<number, N>()
  tuning.forEach((open, s) => {
    for (let f = lo; f <= hi; f++) {
      const m = open + f
      if (!pcs.includes(m % 12)) continue
      const have = byPitch.get(m)
      // the lowest string (in string order) keeps it, unless that string already has three notes
      if (!have || (have.string > s)) byPitch.set(m, { string: s, fret: f, midi: m })
    }
  })
  const out = [...byPitch.values()].sort((a, b) => a.midi - b.midi)
  // no string with more than 3 notes: move the extras up a string where the same pitch fits in the window
  for (let pass = 0; pass < 3; pass++) {
    for (let s = 0; s < tuning.length; s++) {
      const on = out.filter(n => n.string === s)
      if (on.length <= 3) continue
      const top = on[on.length - 1]
      const s2 = s + 1
      if (s2 >= tuning.length) continue
      const f2 = top.midi - tuning[s2]
      if (f2 >= lo && f2 <= hi && f2 >= 0) { top.string = s2; top.fret = f2 }
    }
  }
  return out.sort((a, b) => a.midi - b.midi || a.string - b.string)
}
/** The CAGED shapes of a major key that fit frets 0–15, low to high up the neck. */
export const majorShapes = (tuning: number[], key: number) => shapesOf(key, false, tuning).sort((a, b) => a.lo - b.lo)

/** Neck marks: the major scale in some shapes, every note labelled with its degree, chord tones as chord tones. */
export function majorPosMarks(tuning: number[], key: number, letters: string[] | 'all', from = 0) {
  const out: { s: number; f: number; label: string; role: 'root' | 'chord' | 'scale' }[] = []
  const seen = new Set<string>()
  for (const sh of majorShapes(tuning, key)) {
    if (letters !== 'all' && !letters.includes(sh.letter)) continue
    for (const n of majorPosition(tuning, key, sh)) {
      const k = `${n.string}:${n.fret}`
      if (seen.has(k) || (from > 0 && n.fret <= from)) continue
      seen.add(k)
      const d = MAJOR.indexOf((((n.midi - key) % 12) + 12) % 12)
      out.push({ s: n.string, f: n.fret, label: DEG[d], role: d === 0 ? 'root' : d === 2 || d === 4 ? 'chord' : 'scale' })
    }
  }
  return out
}

/** Each shape of the key: its chord, then the scale up and down inside it (eighth notes), up the neck. */
export function majorPositionsTab(tuning: number[], key = 0): Song {
  const steps: SongStep[] = []
  const name = NAMES[key]
  for (const sh of majorShapes(tuning, key)) {
    const sc = majorPosition(tuning, key, sh)
    if (sc.length < 4) continue
    steps.push(st(shapeNotes(sh, tuning), 2, `${name} (${sh.letter} shape)`), { notes: [], dur: 2 })
    for (const n of [...sc, ...sc.slice(0, -1).reverse()]) steps.push(st([n], 0.5))
  }
  return song(`${name} major in every CAGED position, up the neck`, tuning, bars(steps), 72)
}

/** Inside each shape: the chord's arpeggio (1 3 5 8) first, then the scale from the lowest root up an octave and back,
 *  so you hear the chord tones as the frame the other four notes sit between. */
export function majorArpScaleTab(tuning: number[], key = 0): Song {
  const steps: SongStep[] = []
  const name = NAMES[key]
  for (const sh of majorShapes(tuning, key)) {
    const sc = majorPosition(tuning, key, sh)
    const r0 = sc.findIndex(n => (n.midi - key) % 12 === 0)
    if (r0 < 0) continue
    const oct = sc.slice(r0).filter(n => n.midi <= sc[r0].midi + 12)
    if (oct.length < 8) continue
    const arp = oct.filter(n => [0, 4, 7].includes((n.midi - key) % 12))
    steps.push(st([arp[0]], 1, `${name} (${sh.letter} shape)`), ...arp.slice(1).map(n => st([n], 1)))
    for (const n of [...oct, ...oct.slice(0, -1).reverse()]) steps.push(st([n], 0.5))
    steps.push({ notes: [], dur: 0.5 })
  }
  return song(`${name} major: the chord tones, then the scale, in each position`, tuning, bars(steps), 72)
}

/** Connecting the positions: up one octave in a shape, slide into the next shape up the neck, on through all five
 *  (ascending runs that travel along the neck, the way you move in a solo). */
export function majorLinkTab(tuning: number[], key = 0): Song {
  const steps: SongStep[] = []
  const sh = majorShapes(tuning, key)
  for (let k = 0; k + 1 < sh.length; k++) {
    const a = majorPosition(tuning, key, sh[k]), b = majorPosition(tuning, key, sh[k + 1])
    if (a.length < 6 || b.length < 6) continue
    // a's lowest four notes, then into b from the first of b's notes higher than that
    const firstA = a.slice(0, 4)
    const top = firstA[firstA.length - 1].midi
    const nextB = b.filter(n => n.midi > top).slice(0, 4)
    if (nextB.length < 4) continue
    const run = [...firstA, ...nextB]
    run.forEach((n, i) => steps.push(st([n], 0.5, i === 0 ? `${sh[k].letter} → ${sh[k + 1].letter}` : undefined, i === 4 && nextB[0].string === firstA[3].string ? '/' : undefined)))
  }
  return song(`${NAMES[key]} major: walking from one position into the next`, tuning, bars(steps), 76)
}

// ---- 2 · Triads on every string set, close and spread -----------------------------------------------------------------
/** A set of three neighbouring strings counted down from the top (0 = the highest three), or the nearest that exists. */
export function stringSet(tuning: number[], k: number): number[] {
  const n = tuning.length
  const kk = Math.max(0, Math.min(k, n - 3))
  return [n - 3 - kk, n - 2 - kk, n - 1 - kk]
}
export interface SetTriad { notes: N[]; low: 'R' | '3' | '5'; top: 'R' | '3' | '5'; lo: number; hi: number }
const ROLE = ['R', '3', '5'] as const
/** Every voicing of a triad on three given strings, close (inside an octave) or spread (one voice up an octave:
 *  R-5-3, 3-R-5, 5-3-R), frets 0–15 inside a 5-fret span, low to high up the neck. Works on re-entrant tunings too
 *  (pitch order then decides which note is "low"). */
export function setTriads(tuning: number[], root: number, minor: boolean, set: number[], spread = false): SetTriad[] {
  const pcs = [root, (root + (minor ? 3 : 4)) % 12, (root + 7) % 12]
  const out: SetTriad[] = []
  for (let a = 0; a <= 15; a++) for (let b = 0; b <= 15; b++) for (let c = 0; c <= 15; c++) {
    const fs = [a, b, c]
    if (Math.max(...fs) - Math.min(...fs) > 4) continue
    const m = set.map((s, i) => tuning[s] + fs[i])
    const ord = [...m].sort((x, y) => x - y)
    const p = new Set(m.map(x => x % 12))
    if (p.size !== 3 || !pcs.every(x => p.has(x))) continue
    const span = ord[2] - ord[0]
    if (spread ? span < 12 || span > 21 : span >= 12) continue
    if (ord[0] === ord[1] || ord[1] === ord[2]) continue
    const role = (x: number) => ROLE[pcs.indexOf(x % 12)]
    out.push({ notes: set.map((s, i) => ({ string: s, fret: fs[i], midi: m[i] })), low: role(ord[0]), top: role(ord[2]), lo: Math.min(...fs), hi: Math.max(...fs) })
  }
  return out.sort((x, y) => x.lo - y.lo || x.hi - y.hi)
}
/** The spread sets: three strings with one skipped between the lowest two (E-D-G, A-G-B, D-B-e on guitar). */
export function spreadSet(tuning: number[], k: number): number[] {
  const n = tuning.length
  if (n < 5) return stringSet(tuning, k)
  const top = n - 1 - Math.max(0, Math.min(k, n - 4))
  return [top - 3, top - 1, top]
}
const INV = { R: 'root position', '3': '1st inversion', '5': '2nd inversion' } as const

/** One chord's inversions up the neck on one string set (close voicings), strummed then arpeggiated. */
export function setInversionsTab(tuning: number[], k: number, root = 0, minor = false): Song {
  let set = stringSet(tuning, k)
  let all = setTriads(tuning, root, minor, set)
  for (let kk = k - 1; all.length < 2 && kk >= 0; kk--) { set = stringSet(tuning, kk); all = setTriads(tuning, root, minor, set) }
  const steps: SongStep[] = []
  const name = NAMES[root] + (minor ? 'm' : '')
  for (const t of [...all, ...all.slice(0, -1).reverse()]) {
    steps.push(st(t.notes, 2, `${name} · ${INV[t.low]} (${t.top === 'R' ? 'root' : t.top === '3' ? '3rd' : '5th'} on top)`))
    const sorted = [...t.notes].sort((x, y) => x.midi - y.midi)
    steps.push(...[sorted[0], sorted[1], sorted[2], sorted[1]].map(n => st([n], 0.5)))
  }
  return song(`${name} on strings ${set.map(s => s + 1).join('-')} (counting from the lowest): every inversion`, tuning, bars(steps), 70)
}

/** The same chord in one area of the neck on every string set, low set to high: the triad "climbing across" the neck. */
export function setsWalkTab(tuning: number[], root = 0, minor = false, near = 5): Song {
  const steps: SongStep[] = []
  const name = NAMES[root] + (minor ? 'm' : '')
  const n = tuning.length
  for (let k = n - 3; k >= 0; k--) {
    const set = stringSet(tuning, k)
    const all = setTriads(tuning, root, minor, set)
    if (!all.length) continue
    const t = all.slice().sort((a, b) => Math.abs((a.lo + a.hi) / 2 - near) - Math.abs((b.lo + b.hi) / 2 - near))[0]
    steps.push(st(t.notes, 2, `${name} · ${INV[t.low]}`), ...[...t.notes].sort((a, b) => a.midi - b.midi).map(x => st([x], 2 / 3)))
  }
  return song(`${name} on every string set around fret ${near}`, tuning, bars(steps.length ? steps : [st(shapeNotes(shapesOf(root, minor, tuning)[0], tuning), 4, name)]), 70)
}

/** I – vi – IV – V – I in a key, voice-led on one string set (each chord the voicing nearest the last). */
export function setLeadTab(tuning: number[], k: number, key = 0): Song {
  let set = stringSet(tuning, k)
  const prog: [number, boolean, string][] = [[0, false, 'I'], [9, true, 'vi'], [5, false, 'IV'], [7, false, 'V'], [0, false, 'I']]
  if (!setTriads(tuning, key, false, set).length) set = stringSet(tuning, 0)
  const steps: SongStep[] = []
  let prev: SetTriad | null = null
  for (const [semi, minor, num] of prog) {
    const r = (key + semi) % 12
    const all = setTriads(tuning, r, minor, set)
    if (!all.length) continue
    const mid = (t: SetTriad) => t.notes.reduce((a, n) => a + n.midi, 0) / 3
    const t: SetTriad = prev ? all.slice().sort((a, b) => Math.abs(mid(a) - mid(prev!)) - Math.abs(mid(b) - mid(prev!)))[0] : all.find(x => x.lo >= 3) ?? all[0]
    steps.push(st(t.notes, 2, `${NAMES[r]}${minor ? 'm' : ''} (${num})`), st(t.notes, 1), st(t.notes, 1))
    prev = t
  }
  return song(`I – vi – IV – V – I in ${NAMES[key]}, voice-led on strings ${set.map(s => s + 1).join('-')}`, tuning, bars(steps), 76)
}

/** Spread (open) triads: C, Am, F, G with one voice an octave up, on the lowest spread set, nearest each other. */
export function spreadTab(tuning: number[], key = 0): Song {
  const prog: [number, boolean][] = [[0, false], [9, true], [5, false], [7, false], [0, false]]
  const steps: SongStep[] = []
  let prev: SetTriad | null = null
  for (const k of [0, 1, 2]) {
    const set = spreadSet(tuning, tuning.length >= 6 ? 2 - k : k)
    for (const [semi, minor] of prog) {
      const r = (key + semi) % 12
      const all = setTriads(tuning, r, minor, set, tuning.length >= 5)
      if (!all.length) continue
      const mid = (t: SetTriad) => t.notes.reduce((a, n) => a + n.midi, 0) / 3
      const t: SetTriad = prev ? all.slice().sort((a, b) => Math.abs(mid(a) - mid(prev!)) - Math.abs(mid(b) - mid(prev!)))[0] : all.find(x => x.lo >= 2) ?? all[0]
      const sorted = [...t.notes].sort((a, b) => a.midi - b.midi)
      steps.push(st(t.notes, 1, `${NAMES[r]}${minor ? 'm' : ''} (spread)`), ...[sorted[0], sorted[1], sorted[2]].map(x => st([x], 1)))
      prev = t
    }
    prev = null
  }
  return song(`Spread triads: I – vi – IV – V – I on each set of strings with one skipped`, tuning, bars(steps), 68)
}

/** Neck marks: a chord's voicings on one string set (close or spread), R / 3 / 5. */
export function setMarks(tuning: number[], root: number, minor: boolean, set: number[], spread = false, keep?: (t: SetTriad) => boolean, from = 0) {
  const out: { s: number; f: number; label: string; role: 'root' | 'chord' }[] = []
  const seen = new Set<string>()
  for (const t of setTriads(tuning, root, minor, set, spread)) {
    if (keep && !keep(t)) continue
    for (const n of t.notes) {
      const k = `${n.string}:${n.fret}`
      if (seen.has(k) || (from > 0 && n.fret <= from)) continue
      seen.add(k)
      const iv = (((n.midi - root) % 12) + 12) % 12
      out.push({ s: n.string, f: n.fret, label: iv === 0 ? 'R' : iv === 7 ? '5' : minor ? '♭3' : '3', role: iv === 0 ? 'root' : 'chord' })
    }
  }
  return out
}

// ---- 3 · 3rds, 6ths and double stops ---------------------------------------------------------------------------------
/** Two strings counted down from the top: 'GB' (3rd and 2nd from top), 'BE' (top two), 'GE' (3rd and 1st: 6ths),
 *  'DB' (4th and 2nd: 6ths). On a 4-string instrument the same names count from its top strings. */
export function pairOf(tuning: number[], p: 'GB' | 'BE' | 'GE' | 'DB'): [number, number] {
  const n = tuning.length
  const fromTop = { GB: [3, 2], BE: [2, 1], GE: [3, 1], DB: [4, 2] }[p]
  return [Math.max(0, n - fromTop[0]), n - fromTop[1]]
}
/** A key's scale harmonised in diatonic 3rds (up = 2 scale steps) or 6ths (up = 5) on two strings, the lower voice
 *  climbing the lower string from the key's root (nearest fret ≥ `from`), one octave up and back. */
export function harmonized(tuning: number[], key: number, pair: [number, number], up: 2 | 5, from = 1): [N, N][] {
  const [lo, hi] = pair
  const out: [N, N][] = []
  // the root on the low string at or above `from`
  let f0 = ((key - tuning[lo]) % 12 + 12) % 12
  while (f0 < from) f0 += 12
  if (f0 > 12) f0 -= 12
  const base = tuning[lo] + f0
  for (let d = 0; d <= 7; d++) {
    const oct = Math.floor(d / 7)
    const m1 = base + MAJOR[d % 7] + 12 * oct
    const d2 = d + up
    let m2 = base + MAJOR[d2 % 7] + 12 * Math.floor(d2 / 7)
    // re-entrant tunings: the higher voice may need to drop an octave to sit on the string
    while (m2 - tuning[hi] > 15) m2 -= 12
    while (m2 - tuning[hi] < 0) m2 += 12
    const a = { string: lo, fret: m1 - tuning[lo], midi: m1 }, b = { string: hi, fret: m2 - tuning[hi], midi: m2 }
    if (a.fret < 0 || a.fret > 15 || b.fret < 0 || b.fret > 15) continue
    out.push([a, b])
  }
  return out
}
/** The harmonised scale as a tab: each pair picked low-high, then together; up the octave and back. */
export function pairsTab(tuning: number[], key: number, p: 'GB' | 'BE' | 'GE' | 'DB', up: 2 | 5): Song {
  const pr = pairOf(tuning, p)
  let pairs = harmonized(tuning, key, pr, up)
  if (pairs.length < 4) pairs = harmonized(tuning, key, pr, up, 0)
  const steps: SongStep[] = []
  for (const [a, b] of [...pairs, ...pairs.slice(0, -1).reverse()]) steps.push(st([a], 0.5), st([b], 0.5), st([a, b], 1))
  const iv = up === 2 ? '3rds' : '6ths'
  return song(`${NAMES[key]} major in ${iv} on strings ${pr.map(s => s + 1).join(' and ')}`, tuning, bars(steps), 72)
}
/** Double stops over chords, the soul / country way: for each chord (I, IV, V), the 3rds (or 6ths) of the scale
 *  that hold its chord tones, slid into from a fret below and resolved. */
export function dsOverChordsTab(tuning: number[], key: number, up: 2 | 5): Song {
  const pr = pairOf(tuning, up === 2 ? 'BE' : 'GE')
  const pairs = harmonized(tuning, key, pr, up, 1)
  const steps: SongStep[] = []
  for (const [semi, num] of [[0, 'I'], [5, 'IV'], [7, 'V'], [0, 'I']] as [number, string][]) {
    const r = (key + semi) % 12
    const tones = [r, (r + 4) % 12, (r + 7) % 12]
    // the pairs where both notes are chord tones of this chord
    const fit = pairs.filter(([a, b]) => tones.includes(a.midi % 12) && tones.includes(b.midi % 12))
    const use = fit.length ? fit.slice(0, 2) : pairs.slice(0, 2)
    const name = `${NAMES[r]} (${num})`
    use.forEach(([a, b], i) => {
      const below = a.fret > 0 && b.fret > 0 ? [{ ...a, fret: a.fret - 1, midi: a.midi - 1 }, { ...b, fret: b.fret - 1, midi: b.midi - 1 }] : null
      if (below) steps.push(st(below, 0.5, i === 0 ? name : undefined), st([a, b], 1.5, undefined, '/'))
      else steps.push(st([a, b], 2, i === 0 ? name : undefined))
    })
  }
  return song(`${NAMES[key]}: ${up === 2 ? '3rds' : '6ths'} over I – IV – V – I, slid into`, tuning, bars(steps), 76)
}
/** Neck marks: the harmonised pairs (lower and upper voice), degrees as labels. */
export function pairMarks(tuning: number[], key: number, p: 'GB' | 'BE' | 'GE' | 'DB', up: 2 | 5, from = 0) {
  const out: { s: number; f: number; label: string; role: 'root' | 'chord' | 'scale' }[] = []
  const seen = new Set<string>()
  for (const pair of harmonized(tuning, key, pairOf(tuning, p), up)) for (const n of pair) {
    const k = `${n.string}:${n.fret}`
    if (seen.has(k) || (from > 0 && n.fret <= from)) continue
    seen.add(k)
    const d = MAJOR.indexOf((((n.midi - key) % 12) + 12) % 12)
    out.push({ s: n.string, f: n.fret, label: DEG[d], role: d === 0 ? 'root' : d === 2 || d === 4 ? 'chord' : 'scale' })
  }
  return out
}

// ---- 4 · Sixteenths and syncopation -----------------------------------------------------------------------------------
/** A chord shape that suits strumming on this instrument: the key's chord in the lowest CAGED shape from fret 1. */
function strumShape(tuning: number[], key: number, minor = false): N[] {
  const sh = shapesOf(key, minor, tuning).filter(s => s.lo >= 1).sort((a, b) => a.lo - b.lo)[0] ?? shapesOf(key, minor, tuning)[0]
  return shapeNotes(sh, tuning)
}
const muted = (ns: N[]) => ns.map(n => ({ ...n }))
/** 16th-note strumming on one chord: the hand moves down-up every sixteenth, the pattern decides which strokes hit.
 *  `hits` = 16 per bar, 'X' = a chord (accent), 'x' = a chord, '-' = a muted ghost scratch, '.' = the hand misses. */
function sixteenthBar(chord: N[], hits: string, name?: string): SongStep[] {
  const out: SongStep[] = []
  for (let i = 0; i < 16; i++) {
    const h = hits[i] ?? '.'
    const stroke = i % 2 === 0 ? 'down' : 'up'
    const nm = i === 0 ? name : undefined
    if (h === 'X' || h === 'x') out.push(st(chord, 0.25, nm, undefined, stroke))
    else if (h === '-') out.push(st(muted(chord), 0.25, nm, 'x', stroke))
    else out.push({ notes: [], dur: 0.25, ...(nm ? { chord: nm } : {}) })
  }
  return out
}
/** Four bars that build up 16ths: all sixteenths, then the funk ghost-note groove, then accents on 2 and 4. */
export function sixteenthsTab(tuning: number[], key = 4): Song {
  const c = strumShape(tuning, key, true)
  const name = `${NAMES[key]}m`
  const steps = [
    ...sixteenthBar(c, 'xxxxxxxxxxxxxxxx', `${name}: every 16th`),
    ...sixteenthBar(c, 'x---x---x---x---', `${name}: chord on the beat, ghosts between`),
    ...sixteenthBar(c, 'x-x-X-x-x-x-X-x-', `${name}: eighths, accent 2 and 4`),
    ...sixteenthBar(c, 'x--x--x-X--x-x--', `${name}: a funk groove`),
  ]
  return song(`Sixteenths on ${name}: 1 e & a`, tuning, bars(steps), 76)
}
/** Syncopation: the same chords with hits on the "e" and "a", then the chord change pushed a sixteenth early (anticipated). */
export function syncopationTab(tuning: number[], key = 7): Song {
  const I = strumShape(tuning, key), IV = strumShape(tuning, (key + 5) % 12)
  const nI = NAMES[key], nIV = NAMES[(key + 5) % 12]
  const steps = [
    ...sixteenthBar(I, 'x-.x-.x.x-.x-.x.', `${nI}: hits on the e and a`),
    ...sixteenthBar(IV, 'x-.x-.x.x-.x-.x.', nIV),
    // the change to IV comes on the last 16th of the bar (the "a" of 4) and rings over the bar line
    ...sixteenthBar(I, 'x...x...x...x..', `${nI}: change early →`), st(IV, 0.25, nIV, undefined, 'up'),
    ...sixteenthBar(IV, '....x...x...X...', `${nIV} (already sounding)`),
  ]
  return song(`Syncopation in ${nI}: off-beat hits and the anticipated change`, tuning, bars(steps), 80)
}

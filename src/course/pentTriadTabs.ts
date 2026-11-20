// Level 4 lessons 2 and 3: the five pentatonic boxes on the CAGED map, and triads on the top three strings.
// Tabs and neck pictures worked out for any tuning (guitar, tenor ukulele, baritone).
import { scalePosition } from '../tabs/exercises'
import type { Song, SongBar, SongStep } from '../tabs/model'
import { shapesOf, shapeNotes } from './cagedTabs'

const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
export const MINOR_PENT = [0, 3, 5, 7, 10]
export const MINOR_PENT_L = ['R', '♭3', '4', '5', '♭7']
export const MAJOR_PENT = [0, 2, 4, 7, 9]
export const MAJOR_PENT_L = ['R', '2', '3', '5', '6']
const pcsOf = (root: number, semis: number[]) => semis.map(s => (root + s) % 12)
type N = { string: number; fret: number; midi: number }
const st = (notes: N[], dur: number, chord?: string, tech?: string): SongStep => ({ notes: notes.map(n => ({ ...n, tech })), dur, chord })
const song = (title: string, tuning: number[], bars: SongBar[], tempo: number): Song => ({ title, tempo, tracks: [{ name: 'Lesson', tuning, capo: 0, bars, program: 25 }] })
/** cut a stream of steps into 4/4 bars (a step never crosses a bar line here: all durations divide 4) */
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

/** Box k (0–4) of a pentatonic, as the exercises place it. */
export function pentBox(tuning: number[], root: number, semis: number[], k: number): N[] {
  return scalePosition(tuning, root, pcsOf(root, semis), k).filter(n => n.fret <= 15)
}
/** The fret window of box k. */
export function boxWindow(tuning: number[], root: number, semis: number[], k: number) {
  const fr = pentBox(tuning, root, semis, k).map(n => n.fret)
  return { lo: Math.min(...fr), hi: Math.max(...fr) }
}
/** Neck-picture marks for box k: degrees, roots as roots, chord tones (1 ♭3 5 or 1 3 5) as chord. */
export function boxMarks(tuning: number[], root: number, minor: boolean, k: number | 'all', from = 0) {
  const semis = minor ? MINOR_PENT : MAJOR_PENT, labels = minor ? MINOR_PENT_L : MAJOR_PENT_L
  const tones = minor ? [0, 3, 7] : [0, 4, 7]
  const ks = k === 'all' ? [0, 1, 2, 3, 4] : [k]
  const seen = new Set<string>()
  const out: { s: number; f: number; label: string; role: 'root' | 'chord' | 'scale' }[] = []
  for (const kk of ks) for (const n of pentBox(tuning, root, semis, kk)) {
    const key = `${n.string}:${n.fret}`
    if (seen.has(key) || (from > 0 && n.fret <= from)) continue
    seen.add(key)
    const iv = (((n.midi - root) % 12) + 12) % 12
    out.push({ s: n.string, f: n.fret, label: labels[semis.indexOf(iv)], role: iv === 0 ? 'root' : tones.includes(iv) ? 'chord' : 'scale' })
  }
  return out
}

/** The minor chord shape that sits on box k (by overlap of fret windows). */
export function chordForBox(tuning: number[], root: number, minor: boolean, k: number) {
  const w = boxWindow(tuning, root, minor ? MINOR_PENT : MAJOR_PENT, k)
  const ov = (s: { lo: number; hi: number }) => Math.min(w.hi, s.hi) - Math.max(w.lo, s.lo)
  // a shape may also sit an octave up (box 4 = the A shape at the 12th fret)
  const cands = shapesOf(root, minor, tuning).flatMap(s => {
    const up = { ...s, frets: s.frets.map(f => (f < 0 ? f : f + 12)), lo: s.lo + 12, hi: s.hi + 12 }
    return up.hi <= 15 ? [s, up] : [s]
  })
  return cands.sort((a, b) => ov(b) - ov(a))[0]
}

/** Each box: its chord strummed, then the box up and down, then the chord again: the box seen around its chord. */
export function boxWithChordTab(tuning: number[], root: number, minor: boolean): Song {
  const semis = minor ? MINOR_PENT : MAJOR_PENT
  const name = NAMES[root] + (minor ? 'm' : '')
  const steps: SongStep[] = []
  for (let k = 0; k < 5; k++) {
    const box = pentBox(tuning, root, semis, k)
    if (box.length < 4) continue
    const ch = chordForBox(tuning, root, minor, k)
    const cn = shapeNotes(ch, tuning)
    steps.push(st(cn, 2, `${name} (${ch.letter} shape) · box ${k + 1}`), st(cn, 2))
    for (const n of [...box, ...box.slice(0, -1).reverse()]) steps.push(st([n], 0.5))
    while (steps.reduce((a, s) => a + s.dur, 0) % 4) steps.push(st([], 0.5))
  }
  return song(`${name} pentatonic: each box around its chord shape`, tuning, bars(steps), 72)
}

/** Two boxes in one run: the low strings in box k, the high strings in box k+1 (the hand shifts on the way up). */
export function boxLinkTab(tuning: number[], root: number, minor: boolean): Song {
  const semis = minor ? MINOR_PENT : MAJOR_PENT
  const n = tuning.length, half = Math.ceil(n / 2)
  const steps: SongStep[] = []
  for (let k = 0; k < 4; k++) {
    const a = pentBox(tuning, root, semis, k).filter(x => x.string < half)
    const lastA = a.length ? a[a.length - 1].midi : 0
    const b = pentBox(tuning, root, semis, k + 1).filter(x => x.string >= half && x.midi > lastA)
    if (a.length < 2 || b.length < 2) continue
    const run = [...a, ...b]
    run.forEach((x, i) => steps.push(st([x], 0.5, i === 0 ? `box ${k + 1} → box ${k + 2}` : undefined)))
    run.slice(0, -1).reverse().forEach(x => steps.push(st([x], 0.5)))
    while (steps.reduce((acc, s) => acc + s.dur, 0) % 4) steps.push(st([], 0.5))
  }
  if (!steps.length) {
    // re-entrant tunings (tenor ukulele): play each box, then straight into the next one
    for (let k = 0; k < 4; k++) {
      const run = [...pentBox(tuning, root, semis, k), ...pentBox(tuning, root, semis, k + 1).reverse()]
      run.forEach((x, i) => steps.push(st([x], 0.5, i === 0 ? `box ${k + 1} → box ${k + 2}` : undefined)))
      while (steps.reduce((acc, s) => acc + s.dur, 0) % 4) steps.push(st([], 0.5))
    }
  }
  return song(`${NAMES[root]}${minor ? 'm' : ''} pentatonic: joining the boxes (low strings in one box, high strings in the next)`, tuning, bars(steps), 72)
}

/** The diagonal: three notes on each string, climbing through the boxes (the Gilmour / Hendrix "extended" shape). */
export function pentDiagonalTab(tuning: number[], root: number, minor: boolean): Song {
  const semis = minor ? MINOR_PENT : MAJOR_PENT
  const pcs = pcsOf(root, semis)
  const start = [...Array(13).keys()].find(f => f >= 1 && (tuning[0] + f) % 12 === root) ?? 0
  const pitches: number[] = []
  for (let m = tuning[0] + start; m <= tuning[tuning.length - 1] + 15; m++) if (pcs.includes(m % 12)) pitches.push(m)
  const out: N[] = []
  let s = 0, onString = 0
  for (const m of pitches) {
    while (s < tuning.length && (onString >= 3 || m - tuning[s] < 0)) { s++; onString = 0 }
    if (s >= tuning.length) break
    const fret = m - tuning[s]
    if (fret > 15) break
    out.push({ string: s, fret, midi: m }); onString++
  }
  const steps = [...out, ...out.slice(0, -1).reverse()].map((x, i) => st([x], 1 / 3, i === 0 ? `${NAMES[root]}${minor ? 'm' : ''} pentatonic, three notes a string` : undefined))
  const total = steps.reduce((a, x) => a + x.dur, 0)
  const pad = Math.ceil(total / 4) * 4 - total
  if (pad > 1e-6) steps.push(st([], pad))
  // triplets: group into bars by beats
  const barsOut: SongBar[] = []
  let cur: SongStep[] = [], len = 0
  for (const x of steps) { cur.push(x); len += x.dur; if (len >= 4 - 1e-6) { barsOut.push({ steps: cur }); cur = []; len = 0 } }
  if (cur.length) barsOut.push({ steps: cur })
  return song(`${NAMES[root]}${minor ? 'm' : ''} pentatonic: the diagonal across the boxes`, tuning, barsOut, 60)
}

/** Over vi – IV – I – V (Am F C G) in one box: each bar a short phrase that lands on a note of that bar's chord. */
export function pentTargetsTab(tuning: number[], k = 0): Song {
  const root = 9
  const box = pentBox(tuning, root, MINOR_PENT, k).sort((a, b) => a.midi - b.midi)
  const chords: [string, number[]][] = [['Am', [9, 0, 4]], ['F', [5, 9, 0]], ['C', [0, 4, 7]], ['G', [7, 11, 2]]]
  const steps: SongStep[] = []
  let prev = box[Math.floor(box.length / 2)]
  for (const [name, tones] of [...chords, ...chords]) {
    // land on the chord's 3rd if the box has it, else its root, else its 5th: the nearest one to the last note,
    // and not the same note as last time if the chord offers another
    const near = (pcv: number) => box.filter(n => n.midi % 12 === pcv && n !== prev).sort((a, b) => Math.abs(a.midi - prev.midi) - Math.abs(b.midi - prev.midi))[0]
    const target = [tones[1], tones[0], tones[2]].map(near).find(Boolean) ?? prev
    const ti = box.indexOf(target)
    const from = prev.midi < target.midi ? -1 : 1
    const lead = [box[ti + 2 * from], box[ti + from]].filter(Boolean)
    steps.push(st([], 1, name))
    for (const x of lead) steps.push(st([x], 0.5))
    steps.push(st([target], 4 - 1 - lead.length * 0.5))
    prev = target
  }
  return song('Am F C G: land on a note of each chord without leaving the box', tuning, bars(steps), 76)
}

// ---- triads on the top three strings ----------------------------------------------------------------------------

/** The three highest strings of an instrument (guitar G B e; tenor uke C E A; baritone G B E). */
export function topSet(tuning: number[]): number[] {
  const n = tuning.length
  return [n - 3, n - 2, n - 1]
}
export interface TopTriad { frets: number[]; notes: N[]; low: 'R' | '3' | '5'; top: 'R' | '3' | '5'; lo: number }
/** Every close voicing of a triad on the top three strings, frets 0–15, low to high up the neck. */
export function topTriads(tuning: number[], root: number, minor: boolean, set = topSet(tuning)): TopTriad[] {
  const pcs = [root, (root + (minor ? 3 : 4)) % 12, (root + 7) % 12]
  const role = (m: number) => (['R', '3', '5'] as const)[pcs.indexOf(m % 12)]
  const out: TopTriad[] = []
  for (let a = 0; a <= 15; a++) for (let b = 0; b <= 15; b++) for (let c = 0; c <= 15; c++) {
    const fs = [a, b, c]
    if (Math.max(...fs) - Math.min(...fs) > 4) continue
    const m = set.map((s, i) => tuning[s] + fs[i])
    if (!(m[0] < m[1] && m[1] < m[2]) || m[2] - m[0] >= 12) continue
    const p = new Set(m.map(x => x % 12))
    if (p.size !== 3 || !pcs.every(x => p.has(x))) continue
    out.push({ frets: fs, notes: set.map((s, i) => ({ string: s, fret: fs[i], midi: m[i] })), low: role(m[0]), top: role(m[2]), lo: Math.min(...fs) })
  }
  return out.sort((x, y) => x.lo - y.lo)
}
const INV = { R: 'root position', '3': '1st inversion', '5': '2nd inversion' } as const
export const invName = (t: TopTriad) => INV[t.low]

/** One chord's three inversions up the neck and back: strum, then pick low-middle-top-middle. */
export function triadInversionsTab(tuning: number[], root: number, minor: boolean): Song {
  const all = topTriads(tuning, root, minor)
  const name = NAMES[root] + (minor ? 'm' : '')
  const steps: SongStep[] = []
  for (const t of [...all, ...all.slice(0, -1).reverse()]) {
    steps.push(st(t.notes, 2, `${name} · ${invName(t)} (${t.top === 'R' ? 'root' : t.top === '3' ? '3rd' : '5th'} on top)`))
    for (const x of [t.notes[0], t.notes[1], t.notes[2], t.notes[1]]) steps.push(st([x], 0.5))
  }
  return song(`${name} on the top three strings: every inversion up the neck`, tuning, bars(steps), 70)
}

/** The voicing of a chord nearest another (smallest total movement of the three fingers). */
export function nearestTriad(tuning: number[], from: TopTriad, root: number, minor: boolean): TopTriad {
  const c = topTriads(tuning, root, minor)
  const cost = (t: TopTriad) => t.frets.reduce((a, f, i) => a + Math.abs(f - from.frets[i]), 0)
  return c.sort((a, b) => cost(a) - cost(b))[0]
}

/** I – IV – V – I with the smallest moves, three times: starting from each inversion of the I chord. */
export function triadLeadTab(tuning: number[], key = 0, prog: [number, boolean][] = [[0, false], [5, false], [7, false], [0, false]], title?: string): Song {
  const steps: SongStep[] = []
  const starts = topTriads(tuning, (key + prog[0][0]) % 12, prog[0][1]).filter(t => t.lo >= 1 || tuning.length < 6).slice(0, 3)
  for (const s0 of starts) {
    let cur = s0
    prog.forEach(([semi, minor], i) => {
      const r = (key + semi) % 12
      if (i > 0) cur = nearestTriad(tuning, cur, r, minor)
      steps.push(st(cur.notes, 2, `${NAMES[r]}${minor ? 'm' : ''} (${invName(cur)})`), st(cur.notes, 1), st([cur.notes[2]], 1))
    })
  }
  return song(title ?? `${NAMES[key]}: I – IV – V – I on the top strings, moving as little as possible`, tuning, bars(steps), 76)
}

/** The seven chords of a major key on the top strings, in one inversion family, climbing the neck (the harmonised scale). */
export function triadKeyTab(tuning: number[], key = 0): Song {
  const MAJ = [0, 2, 4, 5, 7, 9, 11]
  const Q = ['', 'm', 'm', '', '', 'm', 'dim']
  const steps: SongStep[] = []
  for (const want of ['R', '3', '5'] as const) {
    let lastLo = 0
    MAJ.forEach((semi, i) => {
      const r = (key + semi) % 12
      if (Q[i] === 'dim') {
        // the diminished triad: build it by hand (R ♭3 ♭5) with the same top-string order as the others
        const pcs = [r, (r + 3) % 12, (r + 6) % 12]
        const cands: N[][] = []
        const set = topSet(tuning)
        for (let a = 0; a <= 15; a++) for (let b = 0; b <= 15; b++) for (let c = 0; c <= 15; c++) {
          const fs = [a, b, c]; if (Math.max(...fs) - Math.min(...fs) > 4) continue
          const m = set.map((s, j) => tuning[s] + fs[j]); if (!(m[0] < m[1] && m[1] < m[2]) || m[2] - m[0] >= 12) continue
          const p = new Set(m.map(x => x % 12)); if (p.size !== 3 || !pcs.every(x => p.has(x))) continue
          const lowRole = pcs.indexOf(m[0] % 12)
          if ((want === 'R' && lowRole !== 0) || (want === '3' && lowRole !== 1) || (want === '5' && lowRole !== 2)) continue
          cands.push(set.map((s, j) => ({ string: s, fret: fs[j], midi: m[j] })))
        }
        const pickD = cands.sort((x, y) => Math.abs(Math.min(...x.map(n => n.fret)) - lastLo) - Math.abs(Math.min(...y.map(n => n.fret)) - lastLo))[0]
        if (pickD) { steps.push(st(pickD, 2, `${NAMES[r]}dim`), st(pickD, 2)); lastLo = Math.min(...pickD.map(n => n.fret)) }
        return
      }
      const c = topTriads(tuning, r, Q[i] === 'm').filter(t => t.low === want)
      const t = c.sort((x, y) => Math.abs(x.lo - lastLo) - Math.abs(y.lo - lastLo) + (x.lo < lastLo ? 1 : 0) - (y.lo < lastLo ? 1 : 0))[0]
      if (!t) return
      steps.push(st(t.notes, 2, `${NAMES[r]}${Q[i]} (${invName(t)})`), st(t.notes, 2))
      lastLo = t.lo
    })
  }
  return song(`The chords of ${NAMES[key]} major on the top strings, one inversion at a time`, tuning, bars(steps), 72)
}

/** Each inversion of C with the free finger: hammer the scale note above the middle string's note, then the top. */
export function triadEmbTab(tuning: number[], root = 0): Song {
  const MAJ = [0, 2, 4, 5, 7, 9, 11]
  const steps: SongStep[] = []
  for (const t of topTriads(tuning, root, false)) {
    steps.push(st(t.notes, 1, `${NAMES[root]} · ${invName(t)}`))
    for (const n of [t.notes[1], t.notes[2]]) {
      let up = 1
      while (!MAJ.includes((((n.midi + up - root) % 12) + 12) % 12)) up++
      if (n.fret + up > 15) { steps.push(st([n], 1)); continue }
      const d = { ...n, fret: n.fret + up, midi: n.midi + up }
      steps.push(st([n], 0.5), st([d], 0.5, undefined, 'h'))
    }
    steps.push(st(t.notes, 1))
  }
  return song(`${NAMES[root]}: every top-string triad with a hammer-on from the free finger`, tuning, bars(steps), 70)
}

/** The same short phrase in all five boxes: up two scale steps from the root, round and back home. Same notes (or an
 *  octave apart), five fingerings: the lick moves with the box. */
export function pentLickBoxesTab(tuning: number[], root = 9): Song {
  const steps: SongStep[] = []
  // scale steps from the root: 1 ♭3 4 ♭3 4 5 4 ♭3 1 (in A minor: A C D C D E D C A)
  const shape = [0, 1, 2, 1, 2, 3, 2, 1, 0]
  const durs = [0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 0.5, 3]
  for (let k = 0; k < 5; k++) {
    const box = pentBox(tuning, root, MINOR_PENT, k).sort((a, b) => a.midi - b.midi)
    const roots = box.map((n, i) => ({ n, i })).filter(x => x.n.midi % 12 === root)
    if (!roots.length) continue
    // the root nearest the middle of the box, so the phrase fits above it
    const mid = box.length / 2
    const r = roots.sort((a, b) => Math.abs(a.i + 1.5 - mid) - Math.abs(b.i + 1.5 - mid))[0]
    if (r.i + 3 >= box.length) continue
    shape.forEach((d, j) => steps.push(st([box[r.i + d]], durs[j], j === 0 ? `box ${k + 1}` : undefined)))
  }
  return song('One phrase, five boxes: the same idea in every position', tuning, bars(steps), 76)
}
